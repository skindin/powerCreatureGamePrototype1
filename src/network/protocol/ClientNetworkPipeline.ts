import { Character } from "../../character/Character.js";
import { GameObject } from "../../engine/GameObject.js";
import { RemoteEntitySample } from "../../engine/physics/RemoteEntityInterpolator.js";
import {
  PlayerInputPacket,
  ReliableActionCommand,
  ClockSyncPacket,
  AuthoritativeWorldSnapshot,
  GhostSnapshot,
  ClientInputPacket,
} from "./NetworkPackets.js";

export interface ClientPipelineStats {
  packetsSent: number;
  packetsReceived: number;
  lastRttMs: number;
  minRttMs: number;
  maxRttMs: number;
  avgRttMs: number;
  unackedActionsCount: number;
  latestServerTick: number;
}

/**
 * ClientNetworkPipeline
 *
 * Core client-side network logic:
 * 1. Packages player inputs and maintains the reliable action retransmission outbox (pickup, drop, throw).
 * 2. Ingests incoming server snapshots, clears acknowledged actions, tracks RTT latency,
 *    and extracts remote entity samples for interpolation and prediction reconciliation.
 *
 * Transport-agnostic: used identically by real Online Multiplayer and Boomerang Relay Sim.
 */
export class ClientNetworkPipeline {
  public clientId: string = "keyboard";
  public playerName: string = "Player 1";

  private seq: number = 0;
  private pendingInputsToSend: PlayerInputPacket[] = [];
  private unacknowledgedActions: Map<string, ReliableActionCommand> = new Map();

  public latestGhostSnapshot: GhostSnapshot | null = null;
  public latestWorldSnapshot: AuthoritativeWorldSnapshot | null = null;
  public latestReceivedServerTick: number = 0;

  // Latency & packet telemetry
  public packetsSent: number = 0;
  public packetsReceived: number = 0;
  public lastRttMs: number = 0;
  private minRttMs: number = Infinity;
  private maxRttMs: number = 0;
  private totalRttMs: number = 0;

  // Callbacks
  public onClockSync?: (sync: ClockSyncPacket) => void;
  public onWorldSnapshot?: (snapshot: AuthoritativeWorldSnapshot) => void;
  public onSnapshot?: (snapshot: GhostSnapshot, worldSnapshot?: AuthoritativeWorldSnapshot) => void;
  public onRemoteEntitySamples?: (seq: number, samples: RemoteEntitySample[], nowMs: number) => void;
  public onStatsChange?: (stats: ClientPipelineStats) => void;

  constructor(initialName?: string) {
    if (initialName) {
      this.playerName = initialName;
    }
  }

  public get unackedActionsCount(): number {
    return this.unacknowledgedActions.size;
  }

  public queueReliableAction(action: ReliableActionCommand): void {
    if (this.clientId) {
      action.playerId = this.clientId;
    }
    this.unacknowledgedActions.set(action.actionId, action);
  }

  public acknowledgeActions(ackIds?: string[]): void {
    if (!ackIds || !Array.isArray(ackIds)) return;
    for (const id of ackIds) {
      this.unacknowledgedActions.delete(id);
    }
  }

  public getStats(): ClientPipelineStats {
    const avgRtt = this.packetsReceived > 0 ? this.totalRttMs / this.packetsReceived : 0;
    return {
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      lastRttMs: this.lastRttMs,
      minRttMs: this.minRttMs === Infinity ? 0 : this.minRttMs,
      maxRttMs: this.maxRttMs,
      avgRttMs: Math.round(avgRtt),
      unackedActionsCount: this.unacknowledgedActions.size,
      latestServerTick: this.latestReceivedServerTick,
    };
  }

  private notifyStats(): void {
    this.onStatsChange?.(this.getStats());
  }

  /**
   * Packages client input packets and pending reliable actions into a transmission packet.
   */
  public createInputPacket(
    inputs: Map<string, PlayerInputPacket>,
    tick: number,
    charactersOrCharacter?: Character[] | Character,
    objects?: GameObject[],
    nowMs: number = performance.now()
  ): ClientInputPacket {
    this.packetsSent++;

    const characters = charactersOrCharacter
      ? (Array.isArray(charactersOrCharacter) ? charactersOrCharacter : [charactersOrCharacter])
      : [];
    const primaryChar = characters[0];

    // Record inputs
    for (const inp of inputs.values()) {
      this.pendingInputsToSend.push({
        ...inp,
        playerId: this.clientId || inp.playerId,
        playerName: this.playerName,
        tick,
        lastReceivedServerTick: this.latestReceivedServerTick,
      });
    }

    const inputList: PlayerInputPacket[] = this.pendingInputsToSend.length > 0
      ? [...this.pendingInputsToSend]
      : Array.from(inputs.values()).map((inp) => ({
          ...inp,
          playerId: this.clientId || inp.playerId,
          playerName: this.playerName,
          tick,
          lastReceivedServerTick: this.latestReceivedServerTick,
        }));
    this.pendingInputsToSend = [];

    const packet: ClientInputPacket = {
      type: "pc_player_input",
      seq: ++this.seq,
      sentAt: nowMs,
      tick,
      lastReceivedServerTick: this.latestReceivedServerTick,
      inputs: inputList,
      reliableActions: Array.from(this.unacknowledgedActions.values()),
    };

    // Telemetry state mirrors for echo testing or dual validation
    if (primaryChar) {
      packet.character = {
        id: this.clientId || primaryChar.playerId || "player",
        name: this.playerName || primaryChar.name,
        x: Number(primaryChar.position.x.toFixed(3)),
        y: Number(primaryChar.position.y.toFixed(3)),
        z: Number(primaryChar.position.z.toFixed(3)),
        vx: Number(primaryChar.velocity.x.toFixed(3)),
        vy: Number(primaryChar.velocity.y.toFixed(3)),
        vz: Number((primaryChar.hasVerticalVelocity ? primaryChar.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((primaryChar.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: primaryChar.isRestingOnSurface || primaryChar.position.z <= 0.005,
        radius: primaryChar.colliderRadius,
        color: primaryChar.color,
        isClimbing: primaryChar.isClimbing,
        isAboveWalls: primaryChar.isAboveWalls,
        facingAngle: Number(primaryChar.facingAngle.toFixed(4)),
      };
    }

    if (characters.length > 0) {
      packet.characters = characters.map((c) => ({
        id: c.playerId || "player",
        name: c.name,
        x: Number(c.position.x.toFixed(3)),
        y: Number(c.position.y.toFixed(3)),
        z: Number(c.position.z.toFixed(3)),
        vx: Number(c.velocity.x.toFixed(3)),
        vy: Number(c.velocity.y.toFixed(3)),
        vz: Number((c.hasVerticalVelocity ? c.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((c.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: c.isRestingOnSurface || c.position.z <= 0.005,
        radius: c.colliderRadius,
        color: c.color,
        isClimbing: c.isClimbing,
        isAboveWalls: c.isAboveWalls,
        facingAngle: Number(c.facingAngle.toFixed(4)),
      }));
    }

    if (objects && objects.length > 0) {
      packet.objects = objects.map((obj) => ({
        id: obj.id,
        name: obj.name,
        x: Number(obj.position.x.toFixed(3)),
        y: Number(obj.position.y.toFixed(3)),
        z: Number(obj.position.z.toFixed(3)),
        vx: Number(obj.velocity.x.toFixed(3)),
        vy: Number(obj.velocity.y.toFixed(3)),
        vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: obj.isRestingOnSurface || obj.position.z <= 0.005,
        radius: obj.colliderRadius,
        color: obj.color,
        shape: obj.visualShape,
        isHeld: obj.isHeld,
        heldBy: obj.heldBy ? ((obj.heldBy as Character).playerId || obj.heldBy.id) : null,
        isAboveWalls: obj.isAboveWalls,
        angX: obj.rollModule ? Number(obj.rollModule.angularVelocity.x.toFixed(3)) : undefined,
        angY: obj.rollModule ? Number(obj.rollModule.angularVelocity.y.toFixed(3)) : undefined,
        angZ: obj.rollModule ? Number(obj.rollModule.angularVelocity.z.toFixed(3)) : undefined,
        isSleeping: obj.isSleeping,
      }));
    }

    return packet;
  }

  /**
   * Processes an incoming server snapshot packet (from real server or echo relay loopback).
   */
  public processServerSnapshot(
    snapshot: GhostSnapshot,
    worldSnapshot?: AuthoritativeWorldSnapshot,
    nowMs: number = performance.now()
  ): void {
    this.packetsReceived++;
    this.latestGhostSnapshot = snapshot;
    this.latestReceivedServerTick = snapshot.seq;

    if (typeof snapshot.sentAt === "number") {
      const rtt = Math.max(0, nowMs - snapshot.sentAt);
      this.lastRttMs = snapshot.rttMs || rtt;
      if (this.lastRttMs < this.minRttMs) this.minRttMs = this.lastRttMs;
      if (this.lastRttMs > this.maxRttMs) this.maxRttMs = this.lastRttMs;
      this.totalRttMs += this.lastRttMs;
    }

    // 1. Process server ACKs to clear completed reliable actions from outbox
    if (Array.isArray(snapshot.ackActionIds) && snapshot.ackActionIds.length > 0) {
      this.acknowledgeActions(snapshot.ackActionIds);
    }

    // 2. Clock synchronization
    if (snapshot.clockSync) {
      this.onClockSync?.(snapshot.clockSync);
    }

    // 3. Prediction reconciliation
    if (worldSnapshot) {
      this.latestWorldSnapshot = worldSnapshot;
      this.onWorldSnapshot?.(worldSnapshot);
    }

    // 4. Remote entity samples extraction for Hermite interpolation
    const samples: RemoteEntitySample[] = [];
    const characters = snapshot.characters || (snapshot.character ? [snapshot.character] : []);

    for (const sc of characters) {
      // Exclude local player from remote samples
      if (sc.id === this.clientId || sc.id === "keyboard") continue;

      samples.push({
        id: sc.id,
        x: sc.x,
        y: sc.y,
        z: sc.z,
        vx: sc.vx,
        vy: sc.vy,
        vz: sc.vz || 0,
        facingAngle: sc.facingAngle ?? 0,
        isClimbing: sc.isClimbing,
        isAboveWalls: sc.isAboveWalls,
        isGrounded: sc.isGrounded,
        surfaceZ: sc.surfaceZ,
        heldObjectId: sc.heldObjectId || (sc.isHolding ? "held" : null),
        heldBy: sc.heldBy,
        color: sc.color,
        radius: sc.radius,
      });
    }

    if (samples.length > 0) {
      this.onRemoteEntitySamples?.(snapshot.seq, samples, nowMs);
    }

    // 5. Emit generic snapshot listener
    this.onSnapshot?.(snapshot, worldSnapshot);
    this.notifyStats();
  }

  public reset(): void {
    this.seq = 0;
    this.pendingInputsToSend = [];
    this.unacknowledgedActions.clear();
    this.latestGhostSnapshot = null;
    this.latestWorldSnapshot = null;
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.lastRttMs = 0;
    this.minRttMs = Infinity;
    this.maxRttMs = 0;
    this.totalRttMs = 0;
  }
}
