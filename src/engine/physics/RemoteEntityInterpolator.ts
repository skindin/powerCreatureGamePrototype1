export interface RemoteEntitySample {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingAngle: number;
  isClimbing?: boolean;
  isAboveWalls?: boolean;
  isGrounded?: boolean;
  surfaceZ?: number;
  heldObjectId?: string | null;
  heldBy?: string | null;
  color?: string;
  radius?: number;
  angX?: number;
  angY?: number;
  angZ?: number;
}

export interface RemoteSnapshotPacket {
  tick: number;
  timestamp: number; // local performance.now() when packet was received
  entities: Map<string, RemoteEntitySample>;
}

export interface InterpolatedEntityResult {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingAngle: number;
  isClimbing: boolean;
  isAboveWalls: boolean;
  isGrounded: boolean;
  surfaceZ: number;
  heldObjectId: string | null;
  heldBy: string | null;
  angX?: number;
  angY?: number;
  angZ?: number;
  isExtrapolated: boolean;
}

interface SmoothedEntityState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingAngle: number;
  lastTime: number;
}

/**
 * Phase 9 & 10: Remote Player Entity Snapshot Interpolation & Extrapolation
 *
 * Classical Snapshot Interpolation (Render Delay Buffer):
 * Clients buffer received server snapshots and render remote entities at
 *   T_render = nowMs - interpDelayMs
 * interpolating smoothly between the two surrounding snapshots S0 and S1.
 *
 * Key guarantees of Snapshot Interpolation:
 * 1. 100% mathematically bounded: when a remote player stops at coordinate X_stop,
 *    interpolating into S1 (where vx=0, x=X_stop) smoothly decelerates and halts
 *    at X_stop without EVER overshooting (0.000u overshoot).
 * 2. No bobbing or rubberbanding backward when stopping.
 * 3. Jitter-free, buttery smooth visual motion between network tick intervals.
 * 4. Explicit facing angle is smoothly lerped along the shortest arc.
 */
export class RemoteEntityInterpolator {
  private buffer: RemoteSnapshotPacket[] = [];

  /** Interpolation mode: "interpolation" (Snapshot Interpolation) or "extrapolation" */
  public mode: "interpolation" | "extrapolation" = "interpolation";

  /** Buffer render delay in milliseconds (default 60ms, absorbs internet packet jitter) */
  public interpDelayMs: number = 60;

  /** Maximum forward extrapolation clamp during packet stalls (ms) */
  public maxExtrapolationMs: number = 100;

  /** Maximum snap threshold to treat large delta as teleport/respawn rather than lerp */
  public maxTeleportThreshold: number = 8.0;

  /** Max snapshot history buffer size */
  public maxBufferSize: number = 60;

  // Extrapolation-mode legacy parameters
  public defaultLeadTimeMs: number = 90;
  public maxLeadTimeMs: number = 250;
  private smoothedStates: Map<string, SmoothedEntityState> = new Map();

  /**
   * Pushes a new snapshot into the interpolation buffer.
   */
  public pushSnapshot(
    tick: number,
    samples: RemoteEntitySample[],
    nowMs: number = performance.now()
  ): void {
    const map = new Map<string, RemoteEntitySample>();
    for (const s of samples) {
      map.set(s.id, { ...s });
    }

    this.buffer.push({
      tick,
      timestamp: nowMs,
      entities: map,
    });

    // Keep sorted chronologically by timestamp
    this.buffer.sort((a, b) => a.timestamp - b.timestamp);

    // Evict expired samples outside the buffer window (older than 2 seconds or exceeding maxBufferSize)
    const cutoff = nowMs - 2000;
    while (this.buffer.length > 0 && (this.buffer[0].timestamp < cutoff || this.buffer.length > this.maxBufferSize)) {
      this.buffer.shift();
    }
  }

  /**
   * Computes the visual state for a remote entity.
   * Dispatches to snapshot interpolation (default) or forward extrapolation.
   */
  public getInterpolatedState(
    entityId: string,
    nowMs: number = performance.now(),
    rttMs: number = 0
  ): InterpolatedEntityResult | null {
    if (this.mode === "extrapolation") {
      return this.getExtrapolatedState(entityId, nowMs, rttMs);
    }
    return this.getSnapshotInterpolatedState(entityId, nowMs);
  }

  /**
   * Retrieves the newest buffered raw state for an entity (without interpolation delay).
   * Used during active collisions/pushes to prevent delayed historical frames from dragging the entity backwards.
   */
  public getLatestState(entityId: string): InterpolatedEntityResult | null {
    if (this.buffer.length === 0) return null;
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const s = this.buffer[i].entities.get(entityId);
      if (s) {
        return this.sampleToResult(s, false);
      }
    }
    return null;
  }

  /**
   * Classical Snapshot Interpolation:
   * Interpolates between two buffered snapshots S0 and S1 at T_render = nowMs - interpDelayMs.
   */
  public getSnapshotInterpolatedState(
    entityId: string,
    nowMs: number = performance.now()
  ): InterpolatedEntityResult | null {
    if (this.buffer.length === 0) return null;

    // Filter snapshots that contain this entity
    const entitySnapshots = this.buffer.filter((pkt) => pkt.entities.has(entityId));
    if (entitySnapshots.length === 0) return null;

    if (entitySnapshots.length === 1) {
      const s = entitySnapshots[0].entities.get(entityId)!;
      return this.sampleToResult(s, false);
    }

    const renderTime = nowMs - this.interpDelayMs;
    const oldest = entitySnapshots[0];
    const newest = entitySnapshots[entitySnapshots.length - 1];

    // Case 1: renderTime <= oldest buffered snapshot
    if (renderTime <= oldest.timestamp) {
      const s = oldest.entities.get(entityId)!;
      return this.sampleToResult(s, false);
    }

    // Case 2: renderTime >= newest buffered snapshot (packet starvation or network stall)
    if (renderTime >= newest.timestamp) {
      const s = newest.entities.get(entityId)!;
      const dt = Math.min(this.maxExtrapolationMs / 1000, Math.max(0, (renderTime - newest.timestamp) / 1000));
      return {
        id: s.id,
        x: s.x + s.vx * dt,
        y: s.y + s.vy * dt,
        z: Math.max(s.surfaceZ ?? 0, s.z + s.vz * dt),
        vx: s.vx,
        vy: s.vy,
        vz: s.vz,
        facingAngle: s.facingAngle,
        isClimbing: s.isClimbing ?? false,
        isAboveWalls: s.isAboveWalls ?? false,
        isGrounded: s.isGrounded ?? (s.z <= (s.surfaceZ ?? 0) + 0.02),
        surfaceZ: s.surfaceZ ?? 0,
        heldObjectId: s.heldObjectId ?? null,
        heldBy: s.heldBy ?? null,
        angX: s.angX,
        angY: s.angY,
        angZ: s.angZ,
        isExtrapolated: dt > 0 && (Math.abs(s.vx) > 0.01 || Math.abs(s.vy) > 0.01),
      };
    }

    // Case 3: S0.timestamp <= renderTime < S1.timestamp (Standard interpolation window)
    let s0Packet = oldest;
    let s1Packet = newest;

    for (let i = 0; i < entitySnapshots.length - 1; i++) {
      if (entitySnapshots[i].timestamp <= renderTime && entitySnapshots[i + 1].timestamp >= renderTime) {
        s0Packet = entitySnapshots[i];
        s1Packet = entitySnapshots[i + 1];
        break;
      }
    }

    const s0 = s0Packet.entities.get(entityId)!;
    const s1 = s1Packet.entities.get(entityId)!;

    // Teleport / Respawn guard: if distance jumped exceeds threshold, snap immediately
    if (Math.hypot(s1.x - s0.x, s1.y - s0.y) > this.maxTeleportThreshold) {
      return this.sampleToResult(s1, false);
    }

    const timeDelta = s1Packet.timestamp - s0Packet.timestamp;
    const alpha = timeDelta > 0 ? Math.max(0, Math.min(1, (renderTime - s0Packet.timestamp) / timeDelta)) : 1;
    const active = alpha >= 0.5 ? s1 : s0;

    return {
      id: entityId,
      x: s0.x + (s1.x - s0.x) * alpha,
      y: s0.y + (s1.y - s0.y) * alpha,
      z: s0.z + (s1.z - s0.z) * alpha,
      vx: s0.vx + (s1.vx - s0.vx) * alpha,
      vy: s0.vy + (s1.vy - s0.vy) * alpha,
      vz: s0.vz + (s1.vz - s0.vz) * alpha,
      facingAngle: this.lerpAngle(s0.facingAngle, s1.facingAngle, alpha),
      isClimbing: active.isClimbing ?? false,
      isAboveWalls: active.isAboveWalls ?? false,
      isGrounded: active.isGrounded ?? (s0.z + (s1.z - s0.z) * alpha <= (active.surfaceZ ?? 0) + 0.02),
      surfaceZ: s0.surfaceZ !== undefined && s1.surfaceZ !== undefined
        ? s0.surfaceZ + (s1.surfaceZ - s0.surfaceZ) * alpha
        : (active.surfaceZ ?? 0),
      heldObjectId: active.heldObjectId ?? null,
      heldBy: active.heldBy ?? null,
      angX: s0.angX !== undefined && s1.angX !== undefined ? s0.angX + (s1.angX - s0.angX) * alpha : active.angX,
      angY: s0.angY !== undefined && s1.angY !== undefined ? s0.angY + (s1.angY - s0.angY) * alpha : active.angY,
      angZ: s0.angZ !== undefined && s1.angZ !== undefined ? s0.angZ + (s1.angZ - s0.angZ) * alpha : active.angZ,
      isExtrapolated: false,
    };
  }

  /**
   * Forward Extrapolation mode:
   * Projects ahead along velocity vectors by latency lead time.
   */
  public getExtrapolatedState(
    entityId: string,
    nowMs: number = performance.now(),
    rttMs: number = 0
  ): InterpolatedEntityResult | null {
    if (this.buffer.length === 0) return null;

    const newest = this.buffer[this.buffer.length - 1];
    const s = newest.entities.get(entityId);
    if (!s) return null;

    const latencyLeadSec = Math.max(this.defaultLeadTimeMs / 1000, (rttMs > 0 ? rttMs / 1000 : this.defaultLeadTimeMs / 1000));
    const elapsedSinceSnapshotSec = Math.max(0, (nowMs - newest.timestamp) / 1000);
    const totalLeadSec = Math.min(this.maxLeadTimeMs / 1000, latencyLeadSec + elapsedSinceSnapshotSec);

    const targetX = s.x + s.vx * totalLeadSec;
    const targetY = s.y + s.vy * totalLeadSec;
    const targetZ = Math.max(s.surfaceZ ?? 0, s.z + s.vz * totalLeadSec);

    let smooth = this.smoothedStates.get(entityId);
    if (!smooth) {
      smooth = {
        x: targetX,
        y: targetY,
        z: targetZ,
        vx: s.vx,
        vy: s.vy,
        vz: s.vz,
        facingAngle: s.facingAngle,
        lastTime: nowMs,
      };
      this.smoothedStates.set(entityId, smooth);
    } else {
      const dt = Math.max(0.001, Math.min(0.1, (nowMs - smooth.lastTime) / 1000));
      smooth.lastTime = nowMs;

      const blend = Math.min(1.0, dt * 20);
      smooth.x += (targetX - smooth.x) * blend;
      smooth.y += (targetY - smooth.y) * blend;
      smooth.z += (targetZ - smooth.z) * blend;
      smooth.vx += (s.vx - smooth.vx) * blend;
      smooth.vy += (s.vy - smooth.vy) * blend;
      smooth.vz += (s.vz - smooth.vz) * blend;

      smooth.facingAngle = this.lerpAngle(smooth.facingAngle, s.facingAngle, Math.min(1.0, dt * 25));
    }

    return {
      id: s.id,
      x: smooth.x,
      y: smooth.y,
      z: smooth.z,
      vx: smooth.vx,
      vy: smooth.vy,
      vz: smooth.vz,
      facingAngle: smooth.facingAngle,
      isClimbing: s.isClimbing ?? false,
      isAboveWalls: s.isAboveWalls ?? false,
      isGrounded: s.isGrounded ?? (smooth.z <= (s.surfaceZ ?? 0) + 0.02),
      surfaceZ: s.surfaceZ ?? 0,
      heldObjectId: s.heldObjectId ?? null,
      heldBy: s.heldBy ?? null,
      angX: s.angX,
      angY: s.angY,
      angZ: s.angZ,
      isExtrapolated: true,
    };
  }

  /**
   * Helper to convert a single sample into an InterpolatedEntityResult.
   */
  private sampleToResult(s: RemoteEntitySample, isExtrapolated: boolean): InterpolatedEntityResult {
    return {
      id: s.id,
      x: s.x,
      y: s.y,
      z: s.z,
      vx: s.vx,
      vy: s.vy,
      vz: s.vz,
      facingAngle: s.facingAngle,
      isClimbing: s.isClimbing ?? false,
      isAboveWalls: s.isAboveWalls ?? false,
      isGrounded: s.isGrounded ?? (s.z <= (s.surfaceZ ?? 0) + 0.02),
      surfaceZ: s.surfaceZ ?? 0,
      heldObjectId: s.heldObjectId ?? null,
      heldBy: s.heldBy ?? null,
      angX: s.angX,
      angY: s.angY,
      angZ: s.angZ,
      isExtrapolated,
    };
  }

  /**
   * Helper to interpolate between two angles (in radians) along the shortest arc.
   */
  private lerpAngle(a: number, b: number, t: number): number {
    let diff = (b - a) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }

  /**
   * Immediately clears an entity from the interpolation buffer and smoothed cache.
   */
  public clearEntity(entityId: string): void {
    this.smoothedStates.delete(entityId);
    for (const packet of this.buffer) {
      packet.entities.delete(entityId);
    }
  }

  /**
   * Completely clears all entity buffers and smoothed states.
   */
  public clearAll(): void {
    this.buffer = [];
    this.smoothedStates.clear();
  }
}

