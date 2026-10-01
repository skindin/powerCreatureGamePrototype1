import { Character } from "../../character/Character.js";
import { GameObject } from "../../engine/GameObject.js";
import { Arena } from "../../engine/Arena.js";
import { ClientNetworkPipeline } from "../protocol/ClientNetworkPipeline.js";
import { ServerNetworkPipeline } from "../protocol/ServerNetworkPipeline.js";
import {
  PlayerInputPacket,
  ReliableActionCommand,
  GhostSnapshot,
  ClockSyncPacket,
  AuthoritativeWorldSnapshot,
  ClientInputPacket,
} from "../protocol/NetworkPackets.js";

export type RelayStatus = "disconnected" | "connecting" | "connected" | "error";

export interface RelayStats {
  status: RelayStatus;
  url: string;
  packetsSent: number;
  packetsReceived: number;
  lastRttMs: number;
  minRttMs: number;
  maxRttMs: number;
  avgRttMs: number;
  sendRateHz: number;
  serverMode: "physics_sim" | "echo_snapshot";
  serverTick: number;
  unackedActionsCount: number;
  serverJitterDepth?: number;
  serverJitterStarvations?: number;
  serverClockSync?: ClockSyncPacket;
  timeDilation?: number;
}

/**
 * BoomerangRelayTransport
 *
 * Implements the Boomerang Echo Relay Simulator.
 * Demonstrates how ClientNetworkPipeline and ServerNetworkPipeline interoperate:
 * 1. Client pipeline packages input + reliable actions.
 * 2. Transmits packet across WAN relay to an echo server.
 * 3. Upon receiving the echoed packet back, feeds it into ServerNetworkPipeline running
 *    an in-tab Authoritative Server Simulation.
 * 4. Generates ghost clones from the server snapshot and returns them to ClientNetworkPipeline.
 */
export class BoomerangRelayTransport {
  public url: string;
  public status: RelayStatus = "disconnected";
  public sendRateHz: number = 30;
  public showGhostClones: boolean = true;
  public lerpGhosts: boolean = true;
  public ghostLerpRatePercent: number = 35.0;
  public serverMode: "physics_sim" | "echo_snapshot" = "physics_sim";

  public clientPipeline: ClientNetworkPipeline;
  public serverPipeline: ServerNetworkPipeline;

  private socket: WebSocket | null = null;
  private lastSendTime: number = 0;
  private currentGhostSnapshot: GhostSnapshot | null = null;

  public onStatsChange?: (stats: RelayStats) => void;
  public onSnapshotReceived?: (snapshot: GhostSnapshot) => void;
  public onClockSync?: (sync: ClockSyncPacket) => void;
  public onWorldSnapshotReceived?: (snapshot: AuthoritativeWorldSnapshot) => void;

  constructor(url: string = "wss://ws.postman-echo.com/raw") {
    this.url = url;
    this.clientPipeline = new ClientNetworkPipeline("Player 1");
    this.serverPipeline = new ServerNetworkPipeline();

    // Wire internal pipeline callbacks to external transport listeners
    this.clientPipeline.onClockSync = (sync) => {
      this.onClockSync?.(sync);
    };
    this.clientPipeline.onWorldSnapshot = (snap) => {
      this.onWorldSnapshotReceived?.(snap);
    };
  }

  public get serverSimulation() {
    return this.serverPipeline.simulation;
  }

  public get unackedActionsCount(): number {
    return this.clientPipeline.unackedActionsCount;
  }

  public queueReliableAction(action: ReliableActionCommand): void {
    this.clientPipeline.queueReliableAction(action);
  }

  public acknowledgeActions(ackIds: string[]): void {
    this.clientPipeline.acknowledgeActions(ackIds);
  }

  public getLatestGhost(): GhostSnapshot | null {
    return this.currentGhostSnapshot || this.clientPipeline.latestGhostSnapshot;
  }

  public getStats(): RelayStats {
    const cp = this.clientPipeline.getStats();
    return {
      status: this.status,
      url: this.url,
      packetsSent: cp.packetsSent,
      packetsReceived: cp.packetsReceived,
      lastRttMs: cp.lastRttMs,
      minRttMs: cp.minRttMs,
      maxRttMs: cp.maxRttMs,
      avgRttMs: cp.avgRttMs,
      sendRateHz: this.sendRateHz,
      serverMode: this.serverMode,
      serverTick: this.serverPipeline.simulation.currentTick,
      unackedActionsCount: cp.unackedActionsCount,
      serverJitterDepth: this.serverPipeline.simulation.jitterBuffer.getQueue("keyboard").length,
      serverJitterStarvations: this.serverPipeline.simulation.jitterBuffer.getQueue("keyboard").getStats().starvations,
      serverClockSync: this.serverPipeline.simulation.getLatestClockSync("keyboard") ?? undefined,
      timeDilation: 1.0,
    };
  }

  public notifyStats(): void {
    this.onStatsChange?.(this.getStats());
  }

  /**
   * Advances the independent server simulation on the 60Hz physics clock.
   */
  public stepServerPhysics(dt: number = 1 / 60): void {
    if (this.serverMode !== "physics_sim") return;

    this.serverPipeline.step(dt);

    const simSnap = this.serverPipeline.getGhostSnapshot(this.clientPipeline.lastRttMs);
    simSnap.source = "physics_sim";

    if (simSnap.ackActionIds && simSnap.ackActionIds.length > 0) {
      this.clientPipeline.acknowledgeActions(simSnap.ackActionIds);
    }

    this.clientPipeline.latestGhostSnapshot = simSnap;
    this.currentGhostSnapshot = {
      ...simSnap,
      character: { ...simSnap.character },
      characters: simSnap.characters ? simSnap.characters.map((c) => ({ ...c })) : [simSnap.character],
      objects: simSnap.objects ? simSnap.objects.map((o) => ({ ...o })) : [],
    };
  }

  public connect(newUrl?: string): void {
    if (newUrl) this.url = newUrl;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status = "connecting";
    this.notifyStats();

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.status = "connected";
        this.notifyStats();
      };

      this.socket.onclose = () => {
        this.status = "disconnected";
        this.notifyStats();
      };

      this.socket.onerror = () => {
        this.status = "error";
        this.notifyStats();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };
    } catch (_) {
      this.status = "error";
      this.notifyStats();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
    this.status = "disconnected";
    this.notifyStats();
  }

  public updateGhostLerp(dt: number): void {
    if (this.serverMode === "physics_sim") return;

    const latest = this.clientPipeline.latestGhostSnapshot;
    if (!latest) {
      this.currentGhostSnapshot = null;
      return;
    }

    if (!this.lerpGhosts || this.ghostLerpRatePercent <= 0) {
      this.currentGhostSnapshot = latest;
      return;
    }

    const dt60 = Math.min(3.0, Math.max(0.05, dt * 60));
    const rateFrac = Math.min(1.0, Math.max(0.0, this.ghostLerpRatePercent / 100));
    const moveFrac = rateFrac >= 1.0 ? 1.0 : (1.0 - Math.pow(1.0 - rateFrac, dt60));

    if (!this.currentGhostSnapshot) {
      this.currentGhostSnapshot = {
        ...latest,
        character: { ...latest.character },
        characters: latest.characters ? latest.characters.map((c) => ({ ...c })) : [latest.character],
        objects: latest.objects ? latest.objects.map((o) => ({ ...o })) : [],
      };
      return;
    }

    const cur = this.currentGhostSnapshot;
    cur.rttMs = latest.rttMs;
    cur.seq = latest.seq;
    cur.sentAt = latest.sentAt;

    // Lerp character
    cur.character.x += (latest.character.x - cur.character.x) * moveFrac;
    cur.character.y += (latest.character.y - cur.character.y) * moveFrac;
    cur.character.z += (latest.character.z - cur.character.z) * moveFrac;
    cur.character.vx = latest.character.vx;
    cur.character.vy = latest.character.vy;
    cur.character.facingAngle = latest.character.facingAngle;
    cur.character.isClimbing = latest.character.isClimbing;
  }

  public syncServerWorld(arena: Arena, characters: Character[], objects: GameObject[]): void {
    this.serverPipeline.simulation.initializeFromWorld(arena, characters, objects);
  }

  public sendInput(
    inputs: Map<string, PlayerInputPacket>,
    tick: number,
    charactersOrCharacter: Character[] | Character,
    objects: GameObject[],
    nowMs: number
  ): void {
    const intervalMs = 1000 / this.sendRateHz;
    if (nowMs - this.lastSendTime < intervalMs) return;
    this.lastSendTime = nowMs;

    const packet = this.clientPipeline.createInputPacket(inputs, tick, charactersOrCharacter, objects, nowMs);

    if (this.status !== "connected" || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.socket.send(JSON.stringify(packet));
    } catch (_) {}
  }

  private handleMessage(raw: any): void {
    const text = typeof raw === "string" ? raw : raw.toString();
    if (!text.startsWith("{")) return;

    try {
      const parsed = JSON.parse(text);

      if (parsed.type === "pc_player_input") {
        const receivedAt = performance.now();
        const rttMs = Math.max(0, receivedAt - (parsed.sentAt || receivedAt));

        if (this.serverMode === "physics_sim") {
          // Feed returned loopback packet into server pipeline
          this.serverPipeline.processClientPacket("keyboard", parsed as ClientInputPacket);

          // Get clock sync & world snapshot
          const clockSync = this.serverPipeline.simulation.getLatestClockSync("keyboard");
          const worldSnap = this.serverPipeline.getAuthoritativeWorldSnapshot();

          const ghostSnap: GhostSnapshot = {
            seq: parsed.seq,
            sentAt: parsed.sentAt,
            receivedAt,
            rttMs,
            character: parsed.character || { id: "player", x: 0, y: 0, z: 0, vx: 0, vy: 0, radius: 0.44 },
            characters: parsed.characters,
            objects: parsed.objects || [],
            source: "physics_sim",
            ackActionIds: this.serverPipeline.simulation.getRecentAckedActionIds(),
            clockSync: clockSync || undefined,
            worldSnapshot: worldSnap,
          };

          this.clientPipeline.processServerSnapshot(ghostSnap, worldSnap, receivedAt);
          this.currentGhostSnapshot = ghostSnap;
        } else {
          // Raw positional echo mode
          const ghostSnap: GhostSnapshot = {
            seq: parsed.seq,
            sentAt: parsed.sentAt,
            receivedAt,
            rttMs,
            character: parsed.character,
            characters: parsed.characters || (parsed.character ? [parsed.character] : []),
            objects: parsed.objects || [],
            source: "echo",
          };
          this.clientPipeline.processServerSnapshot(ghostSnap, undefined, receivedAt);
        }

        this.notifyStats();
        if (this.onSnapshotReceived && this.currentGhostSnapshot) {
          this.onSnapshotReceived(this.currentGhostSnapshot);
        }
      }
    } catch (_) {}
  }
}
