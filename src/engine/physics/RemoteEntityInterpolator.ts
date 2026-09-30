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

/**
 * Phase 9: Remote Player Entity Interpolation (Snapshot Interpolation)
 *
 * Buffers incoming authoritative server snapshots over a ~100ms render window
 * and interpolates remote player avatars smoothly between snapshots N and N+1.
 * If a network packet is momentarily delayed, dead-reckons (extrapolates)
 * up to 50ms using physical velocity to prevent visual stuttering.
 */
export class RemoteEntityInterpolator {
  private buffer: RemoteSnapshotPacket[] = [];
  public interpolationDelayMs: number = 100; // 100ms standard render buffer delay
  public maxExtrapolationMs: number = 50;     // Up to 50ms dead reckoning
  public maxBufferSize: number = 30;         // Keep last 30 snapshots (~500ms at 60Hz)

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

    // Sort chronologically by timestamp
    this.buffer.sort((a, b) => a.timestamp - b.timestamp);

    // Evict expired samples outside the buffer window
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.splice(0, this.buffer.length - this.maxBufferSize);
    }
  }

  /**
   * Computes the smoothly interpolated state for a given entity at current time.
   */
  public getInterpolatedState(
    entityId: string,
    nowMs: number = performance.now()
  ): InterpolatedEntityResult | null {
    if (this.buffer.length === 0) return null;

    const renderTime = nowMs - this.interpolationDelayMs;

    // 1. Only one snapshot available
    if (this.buffer.length === 1) {
      const snap = this.buffer[0];
      const e = snap.entities.get(entityId);
      if (!e) return null;
      return this.sampleToResult(e, false);
    }

    // 2. Target renderTime is older than our oldest buffered snapshot
    const oldest = this.buffer[0];
    if (renderTime <= oldest.timestamp) {
      const e = oldest.entities.get(entityId);
      if (!e) return null;
      return this.sampleToResult(e, false);
    }

    // 3. Target renderTime is ahead of our newest snapshot (network jitter / latency spike)
    const newest = this.buffer[this.buffer.length - 1];
    if (renderTime >= newest.timestamp) {
      const e = newest.entities.get(entityId);
      if (!e) return null;

      // Dead-reckon extrapolation up to maxExtrapolationMs
      const extraMs = Math.min(this.maxExtrapolationMs, renderTime - newest.timestamp);
      const dtSec = extraMs / 1000;

      return {
        id: e.id,
        x: e.x + e.vx * dtSec,
        y: e.y + e.vy * dtSec,
        z: Math.max(0, e.z + e.vz * dtSec),
        vx: e.vx,
        vy: e.vy,
        vz: e.vz,
        facingAngle: e.facingAngle,
        isClimbing: e.isClimbing ?? false,
        isAboveWalls: e.isAboveWalls ?? false,
        isGrounded: e.isGrounded ?? (e.z <= 0.01),
        surfaceZ: e.surfaceZ ?? 0,
        heldObjectId: e.heldObjectId ?? null,
        heldBy: e.heldBy ?? null,
        angX: e.angX,
        angY: e.angY,
        angZ: e.angZ,
        isExtrapolated: true,
      };
    }

    // 4. Interpolate between two surrounding snapshots: A (prior) and B (posterior)
    let snapA: RemoteSnapshotPacket = this.buffer[0];
    let snapB: RemoteSnapshotPacket = this.buffer[this.buffer.length - 1];

    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].timestamp <= renderTime && this.buffer[i + 1].timestamp >= renderTime) {
        snapA = this.buffer[i];
        snapB = this.buffer[i + 1];
        break;
      }
    }

    const eA = snapA.entities.get(entityId);
    const eB = snapB.entities.get(entityId);

    if (!eA && !eB) return null;
    if (!eA && eB) return this.sampleToResult(eB, false);
    if (eA && !eB) return this.sampleToResult(eA, false);

    // Both samples present: calculate interpolation factor alpha [0, 1]
    const timeSpan = Math.max(0.0001, snapB.timestamp - snapA.timestamp);
    const alpha = Math.max(0, Math.min(1, (renderTime - snapA.timestamp) / timeSpan));

    return {
      id: entityId,
      x: eA!.x + (eB!.x - eA!.x) * alpha,
      y: eA!.y + (eB!.y - eA!.y) * alpha,
      z: Math.max(0, eA!.z + (eB!.z - eA!.z) * alpha),
      vx: eA!.vx + (eB!.vx - eA!.vx) * alpha,
      vy: eA!.vy + (eB!.vy - eA!.vy) * alpha,
      vz: eA!.vz + (eB!.vz - eA!.vz) * alpha,
      facingAngle: this.lerpAngle(eA!.facingAngle, eB!.facingAngle, alpha),
      isClimbing: alpha >= 0.5 ? (eB!.isClimbing ?? false) : (eA!.isClimbing ?? false),
      isAboveWalls: alpha >= 0.5 ? (eB!.isAboveWalls ?? false) : (eA!.isAboveWalls ?? false),
      isGrounded: alpha >= 0.5 ? (eB!.isGrounded ?? false) : (eA!.isGrounded ?? false),
      surfaceZ: (eA!.surfaceZ ?? 0) + ((eB!.surfaceZ ?? 0) - (eA!.surfaceZ ?? 0)) * alpha,
      heldObjectId: alpha >= 0.5 ? (eB!.heldObjectId ?? null) : (eA!.heldObjectId ?? null),
      heldBy: alpha >= 0.5 ? (eB!.heldBy ?? null) : (eA!.heldBy ?? null),
      angX: eA!.angX !== undefined && eB!.angX !== undefined ? eA!.angX + (eB!.angX - eA!.angX) * alpha : undefined,
      angY: eA!.angY !== undefined && eB!.angY !== undefined ? eA!.angY + (eB!.angY - eA!.angY) * alpha : undefined,
      angZ: eA!.angZ !== undefined && eB!.angZ !== undefined ? eA!.angZ + (eB!.angZ - eA!.angZ) * alpha : undefined,
      isExtrapolated: false,
    };
  }

  /**
   * Helper to interpolate between two angles (in radians) along the shortest arc.
   */
  private lerpAngle(a: number, b: number, t: number): number {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
  }

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
      isGrounded: s.isGrounded ?? (s.z <= 0.01),
      surfaceZ: s.surfaceZ ?? 0,
      heldObjectId: s.heldObjectId ?? null,
      heldBy: s.heldBy ?? null,
      angX: s.angX,
      angY: s.angY,
      angZ: s.angZ,
      isExtrapolated,
    };
  }

  public clear(): void {
    this.buffer = [];
  }
}
