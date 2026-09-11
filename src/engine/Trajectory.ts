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

export interface PredictedCollision {
  targetId: string;
  timeMs: number;
  contactX: number;
  contactY: number;
  contactZ: number;
  impulseVx: number;
  impulseVy: number;
  impulseVz: number;
  triggered?: boolean;
}

export class Trajectory {
  public readonly points: TrajectorySample[];
  public readonly predictedCollisions: PredictedCollision[];
  public readonly startTime: number;
  public readonly endTime: number;

  constructor(points: TrajectorySample[], predictedCollisions: PredictedCollision[] = []) {
    this.points = points;
    this.predictedCollisions = predictedCollisions;
    this.startTime = points.length > 0 ? points[0].t : 0;
    this.endTime = points.length > 0 ? points[points.length - 1].t : 0;
  }

  public hasPredictedCollisionWith(targetId: string): boolean {
    return this.predictedCollisions.some((c) => c.targetId === targetId);
  }

  /**
   * Pre-calculates an object's deterministic path through the arena
   * (including gravity arc, wall impacts/bounces, floor rolling, friction, and object-object collisions)
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
    arena: Arena,
    potentialColliders: GameObject[] = [],
    maxObjectCollisions = 1,
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
    const predictedCollisions: PredictedCollision[] = [];
    let collisionCount = 0;

    // Record initial point at t=0
    points.push({
      t: 0,
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

      // Check object-object collisions against other colliders in the arena
      if (collisionCount < maxObjectCollisions) {
        for (const other of potentialColliders) {
          if (other.id === templateObj.id || other.isHeld || !other.hasCollider) continue;

          const dummyRadius = dummy.hasCollider ? dummy.colliderRadius : 0.25;
          const otherRadius = other.hasCollider ? other.colliderRadius : 0.25;

          // 3D vertical span overlap check
          const dummyMinZ = dummy.hasVerticalPosition ? dummy.position.z - dummyRadius * 0.5 : 0;
          const dummyMaxZ = dummy.hasVerticalPosition ? dummy.position.z + dummyRadius * 0.5 : 0.2;
          const otherMinZ = other.hasVerticalPosition ? other.position.z - otherRadius * 0.5 : 0;
          const otherMaxZ = other.hasVerticalPosition ? other.position.z + otherRadius * 0.5 : 0.2;

          if (dummyMinZ > otherMaxZ || otherMinZ > dummyMaxZ) continue;

          // 2D planar distance considering the specific radii of both colliders
          const dx = other.position.x - dummy.position.x;
          const dy = other.position.y - dummy.position.y;
          const dist2DSq = dx * dx + dy * dy;
          const minDist = dummyRadius + otherRadius;

          if (dist2DSq < minDist * minDist && dist2DSq > 0.000001) {
            const dist = Math.sqrt(dist2DSq);
            const overlap = minDist - dist;
            const normX = dx / dist; // Vector pointing from dummy to other
            const normY = dy / dist;

            // Relative velocity of other relative to dummy along collision normal
            const relVx = (other.velocity?.x ?? 0) - dummy.velocity.x;
            const relVy = (other.velocity?.y ?? 0) - dummy.velocity.y;
            const velAlongNormal = relVx * normX + relVy * normY;

            // Only collide if closing in
            if (velAlongNormal < 0) {
              collisionCount++;

              const isMasslessDummy = !dummy.hasMass;
              const isMasslessOther = !other.hasMass;

              let otherImpulseX = 0;
              let otherImpulseY = 0;

              if (isMasslessDummy && isMasslessOther) {
                dummy.position.x -= normX * overlap * 0.5;
                dummy.position.y -= normY * overlap * 0.5;
                const impulse = -velAlongNormal * 0.5;
                dummy.velocity.x -= impulse * normX;
                dummy.velocity.y -= impulse * normY;
                otherImpulseX = impulse * normX;
                otherImpulseY = impulse * normY;
              } else if (!isMasslessDummy && isMasslessOther) {
                // Massive dummy pushes massless other
                otherImpulseX = (dummy.velocity.x - (other.velocity?.x ?? 0)) * Math.abs(normX);
                otherImpulseY = (dummy.velocity.y - (other.velocity?.y ?? 0)) * Math.abs(normY);
              } else if (isMasslessDummy && !isMasslessOther) {
                // Massless dummy deflected by massive other
                dummy.position.x -= normX * overlap;
                dummy.position.y -= normY * overlap;
                dummy.velocity.x += ((other.velocity?.x ?? 0) - dummy.velocity.x) * Math.abs(normX);
                dummy.velocity.y += ((other.velocity?.y ?? 0) - dummy.velocity.y) * Math.abs(normY);
              } else {
                // Both massive
                const invMassDummy = 1 / dummy.mass;
                const invMassOther = 1 / other.mass;
                const invMassSum = invMassDummy + invMassOther;
                const ratioDummy = invMassDummy / invMassSum;

                dummy.position.x -= normX * overlap * ratioDummy;
                dummy.position.y -= normY * overlap * ratioDummy;

                const canBounce = dummy.hasBounce && other.hasBounce;
                const eDummy = dummy.hasBounce ? (dummy.bounceMod ?? 0) : 0;
                const eOther = other.hasBounce ? (other.bounceMod ?? 0) : 0;
                const restitution = canBounce ? Math.max(0, Math.min(0.98, Math.max(eDummy, eOther))) : 0;

                const normalImpulse = -(1 + restitution) * velAlongNormal / invMassSum;

                dummy.velocity.x -= normalImpulse * invMassDummy * normX;
                dummy.velocity.y -= normalImpulse * invMassDummy * normY;

                otherImpulseX = normalImpulse * invMassOther * normX;
                otherImpulseY = normalImpulse * invMassOther * normY;
              }

              predictedCollisions.push({
                targetId: other.id,
                timeMs: step * dtMs,
                contactX: dummy.position.x,
                contactY: dummy.position.y,
                contactZ: dummy.position.z,
                impulseVx: otherImpulseX,
                impulseVy: otherImpulseY,
                impulseVz: 0,
              });

              break; // One collision per step
            }
          }
        }
      }

      const t = step * dtMs;
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

    return new Trajectory(points, predictedCollisions);
  }

  /**
   * Sample the trajectory at elapsed time `elapsedMs` from launch.
   * Interpolates smoothly between the two surrounding samples.
   */
  public sample(elapsedMs: number): TrajectorySample {
    if (this.points.length === 0) {
      return { t: elapsedMs, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0 };
    }

    if (elapsedMs <= 0) {
      return this.points[0];
    }

    if (elapsedMs >= this.endTime) {
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
    const approxIdx = Math.floor(elapsedMs / dtMs);
    const i = Math.max(0, Math.min(this.points.length - 2, approxIdx));

    const p0 = this.points[i];
    const p1 = this.points[i + 1];
    const duration = p1.t - p0.t;
    const alpha = duration > 0 ? Math.max(0, Math.min(1, (elapsedMs - p0.t) / duration)) : 0;

    return {
      t: elapsedMs,
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
  public isComplete(elapsedMs: number): boolean {
    return elapsedMs >= this.endTime;
  }
}
