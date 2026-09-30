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
 * Phase 9: Remote Player Entity Forward Prediction & Interpolation
 *
 * Each client sim predicts where remote players actually are on their machines,
 * projecting forward from the latest authoritative server snapshot along their
 * velocity vectors by the round-trip latency + jitter lead time.
 *
 * This guarantees:
 * 1. A remote player always LEADS their server ghost clone while in motion,
 *    just like a local player leads their own server ghost.
 * 2. Visual motion is smoothly blended frame-to-frame without stutter or snapping.
 * 3. At rest (vx=0, vy=0), the predicted remote avatar smoothly settles onto the server ghost.
 */
export class RemoteEntityInterpolator {
  private buffer: RemoteSnapshotPacket[] = [];
  public defaultLeadTimeMs: number = 90;     // Base forward prediction lead time (~90ms)
  public maxLeadTimeMs: number = 250;        // Max prediction clamp during network latency spikes
  public maxBufferSize: number = 30;         // Keep last 30 snapshots (~500ms at 60Hz)
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

    // Sort chronologically by timestamp
    this.buffer.sort((a, b) => a.timestamp - b.timestamp);

    // Evict expired samples outside the buffer window
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.splice(0, this.buffer.length - this.maxBufferSize);
    }
  }

  /**
   * Computes the forward-predicted state for a remote entity.
   * Predicts where the remote client thinks their player is right now,
   * projecting forward from the server snapshot so the entity LEADS the server ghost.
   */
  public getInterpolatedState(
    entityId: string,
    nowMs: number = performance.now(),
    rttMs: number = 0
  ): InterpolatedEntityResult | null {
    if (this.buffer.length === 0) return null;

    // Get the newest authoritative snapshot from the server
    const newest = this.buffer[this.buffer.length - 1];
    const s = newest.entities.get(entityId);
    if (!s) return null;

    // Calculate lead time: how far ahead the remote client is relative to the server snapshot.
    // The remote client's input traveled to server (RTT/2) + server processing + snapshot to client (RTT/2)
    // + time elapsed since snapshot arrived locally.
    const latencyLeadSec = Math.max(this.defaultLeadTimeMs / 1000, (rttMs > 0 ? rttMs / 1000 : this.defaultLeadTimeMs / 1000));
    const elapsedSinceSnapshotSec = Math.max(0, (nowMs - newest.timestamp) / 1000);
    const totalLeadSec = Math.min(this.maxLeadTimeMs / 1000, latencyLeadSec + elapsedSinceSnapshotSec);

    // Target forward-predicted physical coordinates
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

      // Exponential smoothing filter to prevent high-frequency visual jitter (glides at ~20x / s)
      const blend = Math.min(1.0, dt * 20);
      smooth.x += (targetX - smooth.x) * blend;
      smooth.y += (targetY - smooth.y) * blend;
      smooth.z += (targetZ - smooth.z) * blend;
      smooth.vx += (s.vx - smooth.vx) * blend;
      smooth.vy += (s.vy - smooth.vy) * blend;
      smooth.vz += (s.vz - smooth.vz) * blend;

      // Explicit facing angle sent by remote player and server: NEVER infer from velocity
      const targetAngle = s.facingAngle;
      smooth.facingAngle = this.lerpAngle(smooth.facingAngle, targetAngle, Math.min(1.0, dt * 25));
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
   * Helper to interpolate between two angles (in radians) along the shortest arc.
   */
  private lerpAngle(a: number, b: number, t: number): number {
    let diff = (b - a) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }
}
