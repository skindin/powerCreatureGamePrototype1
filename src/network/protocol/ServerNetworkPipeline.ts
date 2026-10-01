import { ServerGameSimulation } from "../../server/ServerGameSimulation.js";
import { Character } from "../../character/Character.js";
import { PLAYER_COLORS } from "../../engine/PlayerManager.js";
import {
  ReliableActionCommand,
  ClientInputPacket,
  ServerSnapshotPacket,
  GhostSnapshot,
  AuthoritativeWorldSnapshot,
} from "./NetworkPackets.js";

export interface ConnectedClientInfo {
  id: string;
  playerNumber: number;
  name: string;
  color: string;
  lastPingMs: number;
}

/**
 * ServerNetworkPipeline
 *
 * Core server-side network and simulation logic:
 * 1. Ingests client input packets into jitter buffers.
 * 2. Authoritatively executes reliable actions (contested grabs, drops, throws).
 * 3. Steps the 60Hz deterministic physics world.
 * 4. Serializes authoritative state snapshots, action ACKs, and per-client clock sync.
 *
 * Transport-agnostic: used identically by UniversalRoomManager (real backend) and BoomerangRelayTransport (in-tab sim).
 */
export class ServerNetworkPipeline {
  public simulation: ServerGameSimulation;
  public clients: Map<string, ConnectedClientInfo> = new Map();
  public readonly fixedDt: number = 1 / 60;

  constructor(simulation?: ServerGameSimulation) {
    this.simulation = simulation || new ServerGameSimulation({
      arenaWidth: 20,
      arenaHeight: 14,
      wallHeight: 1.0,
      fixedDt: 1 / 60,
      jitterTargetDepth: 2,
      broadcastRateHz: 60,
    });
    this.simulation.initializeDefaultScenario();
  }

  public allocatePlayerNumber(): number {
    const used = new Set<number>();
    for (const c of this.clients.values()) {
      used.add(c.playerNumber);
    }
    for (let i = 1; i <= 16; i++) {
      if (!used.has(i)) return i;
    }
    return this.clients.size + 1;
  }

  public registerClient(clientId: string, preferredName?: string): ConnectedClientInfo {
    // If first real client joins, remove dummy initial scenario character
    if (this.simulation.characters.has("player-1")) {
      this.simulation.characters.delete("player-1");
    }

    const playerNumber = this.allocatePlayerNumber();
    const color = PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length];
    const name = (preferredName && preferredName.trim()) ? preferredName.trim() : `Player ${playerNumber}`;

    const info: ConnectedClientInfo = {
      id: clientId,
      playerNumber,
      name,
      color,
      lastPingMs: 0,
    };
    this.clients.set(clientId, info);

    // Spawn character in physics simulation
    const spawnX = 4.8 + ((playerNumber - 1) % 4) * 1.6;
    const spawnY = 7.0 + Math.floor((playerNumber - 1) / 4) * 1.5;

    const character = new Character({
      x: spawnX,
      y: spawnY,
      color,
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      playerId: clientId,
      playerNumber,
      name,
    });
    this.simulation.characters.set(clientId, character);
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];

    return info;
  }

  public unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
    const char = this.simulation.characters.get(clientId);
    if (char) {
      char.cleanupBeforeRemoval();
      this.simulation.characters.delete(clientId);
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
  }

  public renameClient(clientId: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const info = this.clients.get(clientId);
    if (info) {
      info.name = trimmed;
    }
    const char = this.simulation.characters.get(clientId);
    if (char) {
      char.name = trimmed;
    }
  }

  /**
   * Ingests a client packet (inputs, reliable actions, telemetry).
   */
  public processClientPacket(clientId: string, packet: ClientInputPacket): void {
    const char = this.simulation.characters.get(clientId);

    // 1. Process inputs
    if (Array.isArray(packet.inputs)) {
      for (const inp of packet.inputs) {
        inp.playerId = clientId;
        if (inp.playerName && char && char.name !== inp.playerName) {
          this.renameClient(clientId, inp.playerName);
        }
        this.simulation.queueInput(inp);
      }
    }

    // 2. Process and acknowledge reliable actions (pickup, drop, throw)
    if (Array.isArray(packet.reliableActions) && packet.reliableActions.length > 0) {
      for (const act of packet.reliableActions) {
        act.playerId = clientId;
      }
      this.simulation.processReliableActions(packet.reliableActions);
    }
  }

  public executeReliableAction(clientId: string, action: ReliableActionCommand): void {
    action.playerId = clientId;
    this.simulation.processReliableActions([action]);
  }

  /**
   * Advances the authoritative physics world by 1 fixed tick (1/60s).
   */
  public step(dt: number = this.fixedDt): void {
    this.simulation.step(dt);
  }

  /**
   * Creates a snapshot packet customized for a specific client (with their RTT and clock sync).
   */
  public createSnapshotPacketForClient(
    clientId: string,
    worldSnapshot?: AuthoritativeWorldSnapshot
  ): ServerSnapshotPacket {
    const client = this.clients.get(clientId);
    const rttMs = client ? client.lastPingMs : 0;

    const snapshot = this.simulation.getGhostSnapshot(rttMs);
    const clockSync = this.simulation.getLatestClockSync(clientId);
    if (clockSync) {
      snapshot.clockSync = clockSync;
    }

    const world = worldSnapshot || this.simulation.getAuthoritativeWorldSnapshot();

    return {
      type: "pc_server_snapshot",
      snapshot,
      worldSnapshot: world,
      playerCount: this.clients.size,
    };
  }

  public getAuthoritativeWorldSnapshot(): AuthoritativeWorldSnapshot {
    return this.simulation.getAuthoritativeWorldSnapshot();
  }

  public getGhostSnapshot(rttMs: number = 0): GhostSnapshot {
    return this.simulation.getGhostSnapshot(rttMs);
  }
}
