import { Arena } from "./Arena.js";
import { GameObject } from "./GameObject.js";
import { BounceModule } from "./BounceModule.js";
import { RollModule } from "./RollModule.js";

export interface TrajectorySample {
  t: number; // World time in milliseconds
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export class Trajectory {
  public readonly points: TrajectorySample[];
  public readonly startTime: number;
  public readonly endTime: number;

  constructor(points: TrajectorySample[]) {
    this.points = points;
    this.startTime = points.length > 0 ? points[0].t : 0;
    this.endTime = points.length > 0 ? points[points.length - 1].t : 0;
  }

  /**
   * Pre-calculates an object's deterministic path through the arena
   * (including gravity arc, wall impacts/bounces, floor rolling, and friction to a complete stop)
   * in a fraction of a millisecond.
   */
  public static build(
    templateObj: GameObject,
    x0: number,
    y0: number,
    z0: number,
    vx0: number,
    vy0: number,
    vz0: number,
    t0: number,
    arena: Arena,
    maxDurationSeconds = 6.0
  ): Trajectory {
    // Clone simulation dummy with matching physical properties
    const dummy = new GameObject({
      colliderRadius: templateObj.hasCollider ? templateObj.colliderRadius : 0,
      mass: templateObj.mass,
      hasGravity: templateObj.hasGravity,
      hasVerticalPosition: templateObj.hasVerticalPosition,
      hasVerticalVelocity: templateObj.hasVerticalVelocity,
      staticGroundFrictionMod: templateObj.staticGroundFrictionMod,
      dynamicGroundFrictionMod: templateObj.dynamicGroundFrictionMod,
      bounceMod: templateObj.hasBounce ? templateObj.bounceMod : null,
    });

    if (!templateObj.hasCollider) {
      dummy.colliderModule = null;
    }
    if (!templateObj.hasFriction) {
      dummy.frictionModule = null;
    }
    if (!templateObj.hasBounce) {
      dummy.bounceModule = null;
    } else if (templateObj.bounceModule) {
      dummy.bounceModule = new BounceModule({
        bounceMod: templateObj.bounceModule.bounceMod,
        verticalBounce: templateObj.bounceModule.verticalBounce,
      });
    }

    dummy.position.x = x0;
    dummy.position.y = y0;
    dummy.position.z = z0;
    dummy.velocity.x = vx0;
    dummy.velocity.y = vy0;
    dummy.verticalVelocity = vz0;
    dummy.supportingSurfaceHeight = arena.getSupportingSurfaceHeight(x0, y0, dummy.colliderRadius);

    if (templateObj.rollModule && templateObj.rollModule.enabled) {
      dummy.rollModule = new RollModule({
        enabled: true,
        rollResistance: templateObj.rollModule.rollResistance,
      });
      dummy.rollModule.angularVelocity.x = templateObj.rollModule.angularVelocity.x;
      dummy.rollModule.angularVelocity.y = templateObj.rollModule.angularVelocity.y;
      dummy.rollModule.angularVelocity.z = templateObj.rollModule.angularVelocity.z;
    }

    const dt = 1 / 60; // 60Hz fixed simulation step
    const dtMs = dt * 1000;
    const maxSteps = Math.round(maxDurationSeconds / dt);
    const points: TrajectorySample[] = [];

    // Record initial point
    points.push({
      t: t0,
      x: dummy.position.x,
      y: dummy.position.y,
      z: dummy.position.z,
      vx: dummy.velocity.x,
      vy: dummy.velocity.y,
      vz: dummy.verticalVelocity,
      rotX: dummy.rollModule?.angularVelocity.x ?? 0,
      rotY: dummy.rollModule?.angularVelocity.y ?? 0,
      rotZ: dummy.rollModule?.angularVelocity.z ?? 0,
    });

    let restingStreak = 0;

    for (let step = 1; step <= maxSteps; step++) {
      dummy.updatePosition(dt, arena);

      const t = t0 + step * dtMs;
      const vx = dummy.velocity.x;
      const vy = dummy.velocity.y;
      const vz = dummy.verticalVelocity;
      const rotX = dummy.rollModule?.angularVelocity.x ?? 0;
      const rotY = dummy.rollModule?.angularVelocity.y ?? 0;
      const rotZ = dummy.rollModule?.angularVelocity.z ?? 0;

      points.push({
        t,
        x: dummy.position.x,
        y: dummy.position.y,
        z: dummy.position.z,
        vx,
        vy,
        vz,
        rotX,
        rotY,
        rotZ,
      });

      // Check if object has completely come to rest
      const speed2D = Math.hypot(vx, vy);
      const isVerticalRest = Math.abs(vz) < 0.005;
      const isAngularRest = Math.hypot(rotX, rotY) < 0.01;

      if (speed2D < 0.005 && isVerticalRest && isAngularRest) {
        restingStreak++;
        if (restingStreak >= 4) {
          // Object has settled firmly; terminate early
          break;
        }
      } else {
        restingStreak = 0;
      }
    }

    return new Trajectory(points);
  }

  /**
   * Sample the trajectory at any universal world time `t` (in ms).
   * Interpolates smoothly between the two surrounding samples.
   */
  public sample(worldTimeMs: number): TrajectorySample {
    if (this.points.length === 0) {
      return { t: worldTimeMs, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0 };
    }

    if (worldTimeMs <= this.startTime) {
      return this.points[0];
    }

    if (worldTimeMs >= this.endTime) {
      const last = this.points[this.points.length - 1];
      return {
        ...last,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
      };
    }

    // Direct index lookup based on fixed 16.666ms step size
    const dtMs = (this.points[1].t - this.points[0].t) || (1000 / 60);
    const approxIdx = Math.floor((worldTimeMs - this.startTime) / dtMs);
    const i = Math.max(0, Math.min(this.points.length - 2, approxIdx));

    const p0 = this.points[i];
    const p1 = this.points[i + 1];
    const duration = p1.t - p0.t;
    const alpha = duration > 0 ? Math.max(0, Math.min(1, (worldTimeMs - p0.t) / duration)) : 0;

    return {
      t: worldTimeMs,
      x: p0.x + (p1.x - p0.x) * alpha,
      y: p0.y + (p1.y - p0.y) * alpha,
      z: p0.z + (p1.z - p0.z) * alpha,
      vx: p0.vx + (p1.vx - p0.vx) * alpha,
      vy: p0.vy + (p1.vy - p0.vy) * alpha,
      vz: p0.vz + (p1.vz - p0.vz) * alpha,
      rotX: p0.rotX + (p1.rotX - p0.rotX) * alpha,
      rotY: p0.rotY + (p1.rotY - p0.rotY) * alpha,
      rotZ: p0.rotZ + (p1.rotZ - p0.rotZ) * alpha,
    };
  }

  /**
   * Returns true if the trajectory animation has completed and the object has settled to rest.
   */
  public isComplete(worldTimeMs: number): boolean {
    return worldTimeMs >= this.endTime;
  }
}
