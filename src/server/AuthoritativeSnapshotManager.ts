import { Character } from "../character/Character.js";
import { GameObject } from "../engine/GameObject.js";
import { ClockSyncPacket } from "./ServerJitterBuffer.js";

/**
 * Quantized, bandwidth-efficient entity state for network broadcasting (Phase 7).
 * Positions are quantized to 3 decimal places (1mm precision) and velocities to 2 decimal places.
 */
export interface CompressedEntityState {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  angX?: number;
  angY?: number;
  angZ?: number;
  heldBy: string | null;
  isClimbing: boolean;
  isSleeping?: boolean;
}

/**
 * Authoritative World Snapshot Packet Schema (Phase 7.1).
 */
export interface AuthoritativeWorldSnapshot {
  type: "world_snapshot";
  tick: number;
  serverTime: number;
  lastProcessedInputTick: { [playerId: string]: number };
  entities: CompressedEntityState[];
  ackActionIds?: string[];
  clockSync?: ClockSyncPacket;
  isDelta?: boolean;
}

/**
 * Configuration for authoritative snapshot broadcasting.
 */
export interface SnapshotBroadcastConfig {
  /** Broadcast frequency: 30Hz or 60Hz (default: 60) */
  broadcastRateHz?: 30 | 60;
  /** Full baseline keyframe interval in ticks (default: 60 ticks = 1.0s) */
  keyframeIntervalTicks?: number;
  /** Enable delta compression to omit sleeping/unchanged entities (default: true) */
  deltaCompression?: boolean;
}

/**
 * Manages quantization, delta compression, and rate-regulated broadcast of
 * authoritative world state snapshots (Phase 7).
 */
export class AuthoritativeSnapshotManager {
  public broadcastRateHz: 30 | 60;
  public keyframeIntervalTicks: number;
  public deltaCompression: boolean;

  private lastSentEntityStates: Map<string, CompressedEntityState> = new Map();
  public lastBroadcastTick: number = 0;

  // Diagnostics metrics
  public totalSnapshotsSent: number = 0;
  public deltaSnapshotsSent: number = 0;
  public keyframeSnapshotsSent: number = 0;
  public totalEntitiesOmittedByDelta: number = 0;

  constructor(config?: SnapshotBroadcastConfig) {
    this.broadcastRateHz = config?.broadcastRateHz ?? 60;
    this.keyframeIntervalTicks = config?.keyframeIntervalTicks ?? 60;
    this.deltaCompression = config?.deltaCompression ?? true;
  }

  /**
   * Evaluates if a snapshot broadcast is due on the given server simulation tick.
   * - 60Hz: broadcast on every tick.
   * - 30Hz: broadcast on every second tick (tick % 2 === 0).
   */
  public isBroadcastDue(serverTick: number): boolean {
    if (this.broadcastRateHz === 60) {
      return true;
    }
    const intervalTicks = Math.round(60 / this.broadcastRateHz); // 2 for 30Hz
    return serverTick % intervalTicks === 0;
  }

  /**
   * Compresses and quantizes an active entity state (3 decimal places for position, 2 for velocity).
   */
  public static compressEntity(entity: Character | GameObject): CompressedEntityState {
    const isChar = entity instanceof Character;
    const isSleeping = !isChar && (entity as GameObject).isSleeping;
    const hasVz = entity.hasVerticalVelocity;
    const roll = (!isChar && (entity as GameObject).rollModule) ? (entity as GameObject).rollModule : null;

    let heldByStr: string | null = null;
    if (isChar && (entity as Character).heldObject) {
      heldByStr = (entity as Character).heldObject!.id;
    } else if (!isChar && (entity as GameObject).heldBy) {
      heldByStr = ((entity as GameObject).heldBy as Character).playerId || ((entity as GameObject).heldBy as any).id || "player";
    }

    return {
      id: isChar ? ((entity as Character).playerId || entity.id) : entity.id,
      x: Number(entity.position.x.toFixed(3)),
      y: Number(entity.position.y.toFixed(3)),
      z: Number(entity.position.z.toFixed(3)),
      vx: Number(entity.velocity.x.toFixed(2)),
      vy: Number(entity.velocity.y.toFixed(2)),
      vz: Number((hasVz ? entity.verticalVelocity : 0).toFixed(2)),
      angX: roll ? Number(roll.angularVelocity.x.toFixed(2)) : undefined,
      angY: roll ? Number(roll.angularVelocity.y.toFixed(2)) : undefined,
      angZ: roll ? Number(roll.angularVelocity.z.toFixed(2)) : undefined,
      heldBy: heldByStr,
      isClimbing: isChar ? (entity as Character).isClimbing : false,
      isSleeping,
    };
  }

  /**
   * Generates an AuthoritativeWorldSnapshot from the server world entities.
   * Omits sleeping and stationary entities when delta compression is active.
   */
  public createSnapshot(
    serverTick: number,
    characters: Character[],
    objects: GameObject[],
    lastProcessedInputTick: { [playerId: string]: number },
    ackActionIds?: string[],
    clockSync?: ClockSyncPacket,
    forceKeyframe: boolean = false
  ): AuthoritativeWorldSnapshot {
    const isKeyframe = forceKeyframe || !this.deltaCompression || (serverTick % this.keyframeIntervalTicks === 0);
    const allCompressed: CompressedEntityState[] = [];

    for (const char of characters) {
      allCompressed.push(AuthoritativeSnapshotManager.compressEntity(char));
    }
    for (const obj of objects) {
      allCompressed.push(AuthoritativeSnapshotManager.compressEntity(obj));
    }

    let entitiesToBroadcast: CompressedEntityState[] = [];

    if (isKeyframe) {
      // Full baseline keyframe: broadcast all entities and refresh reference state
      entitiesToBroadcast = allCompressed;
      for (const ent of allCompressed) {
        this.lastSentEntityStates.set(ent.id, ent);
      }
      this.keyframeSnapshotsSent++;
    } else {
      // Delta snapshot: omit sleeping or unchanged entities
      for (const ent of allCompressed) {
        const prev = this.lastSentEntityStates.get(ent.id);

        if (prev) {
          // If entity was sleeping and is still sleeping, omit from delta payload!
          if (ent.isSleeping && prev.isSleeping) {
            this.totalEntitiesOmittedByDelta++;
            continue;
          }

          // If entity transform and velocities are unchanged within quantization tolerance, omit!
          const isPosSame = Math.abs(ent.x - prev.x) < 0.001 && Math.abs(ent.y - prev.y) < 0.001 && Math.abs(ent.z - prev.z) < 0.001;
          const isVelSame = Math.abs(ent.vx - prev.vx) < 0.01 && Math.abs(ent.vy - prev.vy) < 0.01 && Math.abs(ent.vz - prev.vz) < 0.01;
          const isHeldSame = ent.heldBy === prev.heldBy;
          const isClimbSame = ent.isClimbing === prev.isClimbing;
          const isSleepingSame = ent.isSleeping === prev.isSleeping;

          if (isPosSame && isVelSame && isHeldSame && isClimbSame && isSleepingSame) {
            this.totalEntitiesOmittedByDelta++;
            continue;
          }
        }

        // Entity changed: include in delta and update reference
        entitiesToBroadcast.push(ent);
        this.lastSentEntityStates.set(ent.id, ent);
      }
      this.deltaSnapshotsSent++;
    }

    this.totalSnapshotsSent++;
    this.lastBroadcastTick = serverTick;

    return {
      type: "world_snapshot",
      tick: serverTick,
      serverTime: performance.now(),
      lastProcessedInputTick,
      entities: entitiesToBroadcast,
      ackActionIds: ackActionIds && ackActionIds.length > 0 ? ackActionIds : undefined,
      clockSync,
      isDelta: !isKeyframe,
    };
  }

  /**
   * Client-side helper: Merges a received delta snapshot into an accumulated entity state map.
   */
  public static mergeSnapshot(
    currentState: Map<string, CompressedEntityState>,
    snapshot: AuthoritativeWorldSnapshot
  ): Map<string, CompressedEntityState> {
    if (!snapshot.isDelta) {
      currentState.clear();
    }
    for (const ent of snapshot.entities) {
      currentState.set(ent.id, ent);
    }
    return currentState;
  }

  /**
   * Resets internal snapshot reference state.
   */
  public reset(): void {
    this.lastSentEntityStates.clear();
    this.lastBroadcastTick = 0;
  }
}
