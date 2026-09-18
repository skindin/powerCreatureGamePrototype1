import { Arena } from "./Arena.js";
import { GameObject, Vector2D } from "./GameObject.js";
import { Character } from "../character/Character.js";

export interface SweepHit {
  alpha: number; // Fraction of timestep [0, 1] when contact occurred
  normal: Vector2D; // Contact normal pointing from entity A to entity B (or wall to entity)
}

/**
 * Swept Time-of-Impact (TOI) and Continuous Contact Rollback Resolver.
 * Adapts Rocket League's contact rollback principle to Power Creature:
 * When two moving bodies collide during a frame, rewind them to the exact
 * tangent point of impact, calculate normal & tangential impulses at the tangent,
 * and step the remainder of the frame cleanly.
 */
export class ContinuousPhysics {
  /**
   * Solves swept circle-to-circle collision between entity A and entity B over timestep dt.
   * Given initial positions pA0, pB0 and end positions pA1, pB1:
   * Returns earliest alpha in [0, 1] where distance between centers == rA + rB.
   */
  public static sweepCircleCircle(
    pA0: Vector2D,
    pA1: Vector2D,
    rA: number,
    pB0: Vector2D,
    pB1: Vector2D,
    rB: number
  ): SweepHit | null {
    const targetDist = rA + rB;
    const targetDistSq = targetDist * targetDist;

    // Displacement vectors
    const dAx = pA1.x - pA0.x;
    const dAy = pA1.y - pA0.y;
    const dBx = pB1.x - pB0.x;
    const dBy = pB1.y - pB0.y;

    // Relative initial position P = pB0 - pA0
    const Px = pB0.x - pA0.x;
    const Py = pB0.y - pA0.y;

    // Relative displacement D = dB - dA
    const Dx = dBx - dAx;
    const Dy = dBy - dAy;

    const initialDistSq = Px * Px + Py * Py;

    // Already overlapping or touching at start of tick
    if (initialDistSq <= targetDistSq) {
      const dist = Math.sqrt(Math.max(0.000001, initialDistSq));
      return {
        alpha: 0,
        normal: { x: Px / dist, y: Py / dist },
      };
    }

    // Solve quadratic equation for alpha in [0, 1]:
    // ||P + alpha * D||^2 = targetDistSq
    // (Dx^2 + Dy^2) * alpha^2 + 2*(Px*Dx + Py*Dy) * alpha + (Px^2 + Py^2 - targetDistSq) = 0
    const a = Dx * Dx + Dy * Dy;
    if (a < 1e-8) {
      // Both entities moving identically or stationary; no relative motion
      return null;
    }

    const b = 2 * (Px * Dx + Py * Dy);
    const c = initialDistSq - targetDistSq;

    // Discriminant
    const disc = b * b - 4 * a * c;
    if (disc < 0) {
      // Paths do not intersect within circle radius
      return null;
    }

    const sqrtDisc = Math.sqrt(disc);
    const alpha1 = (-b - sqrtDisc) / (2 * a);

    if (alpha1 >= 0 && alpha1 <= 1) {
      // Position at contact
      const contactPx = Px + alpha1 * Dx;
      const contactPy = Py + alpha1 * Dy;
      const contactDist = Math.sqrt(Math.max(0.000001, contactPx * contactPx + contactPy * contactPy));
      return {
        alpha: alpha1,
        normal: { x: contactPx / contactDist, y: contactPy / contactDist },
      };
    }

    return null;
  }

  /**
   * Solves swept circle collision against axis-aligned wall boundary.
   */
  public static sweepCircleWall(
    p0: Vector2D,
    p1: Vector2D,
    radius: number,
    wall: { x: number; y: number; width: number; height: number }
  ): SweepHit | null {
    const minX = wall.x - radius;
    const maxX = wall.x + wall.width + radius;
    const minY = wall.y - radius;
    const maxY = wall.y + wall.height + radius;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;

    let tNearX = -Infinity;
    let tFarX = Infinity;
    let normX = 0;

    if (Math.abs(dx) > 1e-6) {
      const t1 = (minX - p0.x) / dx;
      const t2 = (maxX - p0.x) / dx;
      if (t1 < t2) {
        tNearX = t1;
        tFarX = t2;
        normX = -1;
      } else {
        tNearX = t2;
        tFarX = t1;
        normX = 1;
      }
    } else {
      if (p0.x < minX || p0.x > maxX) return null;
    }

    let tNearY = -Infinity;
    let tFarY = Infinity;
    let normY = 0;

    if (Math.abs(dy) > 1e-6) {
      const t1 = (minY - p0.y) / dy;
      const t2 = (maxY - p0.y) / dy;
      if (t1 < t2) {
        tNearY = t1;
        tFarY = t2;
        normY = -1;
      } else {
        tNearY = t2;
        tFarY = t1;
        normY = 1;
      }
    } else {
      if (p0.y < minY || p0.y > maxY) return null;
    }

    const tEnter = Math.max(tNearX, tNearY);
    const tExit = Math.min(tFarX, tFarY);

    if (tEnter > tExit || tExit < 0) return null;

    if (tEnter >= 0 && tEnter <= 1) {
      return {
        alpha: tEnter,
        normal: tNearX > tNearY ? { x: normX, y: 0 } : { x: 0, y: normY },
      };
    }

    return null;
  }

  /**
   * Applies the physical collision impulse and friction at the exact tangent contact point.
   */
  public static applyCollisionImpulse(
    a: GameObject,
    b: GameObject,
    normal: Vector2D,
    remainingDtFraction: number
  ): void {
    const isMasslessA = !a.hasMass;
    const isMasslessB = !b.hasMass;
    const normX = normal.x;
    const normY = normal.y;

    const relVx = b.velocity.x - a.velocity.x;
    const relVy = b.velocity.y - a.velocity.y;
    const velAlongNormal = relVx * normX + relVy * normY;

    if (velAlongNormal >= 0) {
      // Objects are separating or moving away from each other
      return;
    }

    // Case 1: Both massless
    if (isMasslessA && isMasslessB) {
      const impulse = -velAlongNormal * 0.5;
      a.velocity.x -= impulse * normX;
      a.velocity.y -= impulse * normY;
      b.velocity.x += impulse * normX;
      b.velocity.y += impulse * normY;
      return;
    }

    // Case 2: A is Massive, B is Massless
    if (!isMasslessA && isMasslessB) {
      b.velocity.x += (a.velocity.x - b.velocity.x) * Math.abs(normX);
      b.velocity.y += (a.velocity.y - b.velocity.y) * Math.abs(normY);
      return;
    }

    // Case 3: A is Massless, B is Massive
    if (isMasslessA && !isMasslessB) {
      a.velocity.x += (b.velocity.x - a.velocity.x) * Math.abs(normX);
      a.velocity.y += (b.velocity.y - a.velocity.y) * Math.abs(normY);
      return;
    }

    // Case 4: Both objects are massive
    const invMassA = 1 / Math.max(0.01, a.mass);
    const invMassB = 1 / Math.max(0.01, b.mass);
    const invMassSum = invMassA + invMassB;

    const isActivelyPushing =
      (a instanceof Character && a.isActivelyWalking) ||
      (b instanceof Character && b.isActivelyWalking);
    const canBounce = a.hasBounce && b.hasBounce;
    const eA = a.isCharacter || !a.hasBounce ? 0.0 : a.bounceMod ?? 0.0;
    const eB = b.isCharacter || !b.hasBounce ? 0.0 : b.bounceMod ?? 0.0;
    const restitution = isActivelyPushing || !canBounce ? 0.0 : Math.max(0.0, Math.min(0.98, Math.max(eA, eB)));

    const normalImpulse = (-(1 + restitution) * velAlongNormal) / invMassSum;

    a.velocity.x -= normalImpulse * invMassA * normX;
    a.velocity.y -= normalImpulse * invMassA * normY;
    b.velocity.x += normalImpulse * invMassB * normX;
    b.velocity.y += normalImpulse * invMassB * normY;

    // Surface friction impulse
    const tangX = -normY;
    const tangY = normX;
    const relVt = relVx * tangX + relVy * tangY;

    if (Math.abs(relVt) > 0.001) {
      const muObj = 0.35 * Math.sqrt(a.dynamicGroundFrictionMod * b.dynamicGroundFrictionMod);
      const beta = 0.4;
      const stickImpulse = Math.abs(relVt) / (invMassSum * (1 + 1 / beta));
      const maxFricImpulse = muObj * Math.abs(normalImpulse);
      const fricImpulse = Math.min(stickImpulse, maxFricImpulse) * Math.sign(relVt);

      a.velocity.x += fricImpulse * invMassA * tangX;
      a.velocity.y += fricImpulse * invMassA * tangY;
      b.velocity.x -= fricImpulse * invMassB * tangX;
      b.velocity.y -= fricImpulse * invMassB * tangY;

      // Angular momentum transfer
      if (a.rollModule && a.rollModule.enabled) {
        const spinImpulse = fricImpulse / (beta * a.mass * a.colliderRadius);
        a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z + spinImpulse));
      }
      if (b.rollModule && b.rollModule.enabled) {
        const spinImpulseB = fricImpulse / (beta * b.mass * b.colliderRadius);
        b.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, b.rollModule.angularVelocity.z - spinImpulseB));
      }
    }

    // Step remaining fraction of the frame with updated velocities
    if (remainingDtFraction > 0.001) {
      a.position.x += a.velocity.x * remainingDtFraction * (1 / 60);
      a.position.y += a.velocity.y * remainingDtFraction * (1 / 60);
      b.position.x += b.velocity.x * remainingDtFraction * (1 / 60);
      b.position.y += b.velocity.y * remainingDtFraction * (1 / 60);
    }
  }

  /**
   * Continuous swept collision resolution pass for all entities.
   * Rewinds colliding bodies to exact contact instant before applying impulses.
   */
  public static resolveContinuousCollisions(
    entities: GameObject[],
    prevPositions: Map<GameObject, Vector2D>,
    arena: Arena,
    _dt: number
  ): void {
    const count = entities.length;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = entities[i];
        const b = entities[j];

        if (a.isHeld || b.isHeld) continue;
        if (!a.hasCollider || !b.hasCollider) continue;

        // Altitude gating: contact sweeps only occur if both are on the same vertical tier
        const layerA = GameObject.getEntityLayer(a, arena.wallHeight);
        const layerB = GameObject.getEntityLayer(b, arena.wallHeight);
        if (layerA !== layerB) continue;

        const pA0 = prevPositions.get(a) ?? { x: a.position.x, y: a.position.y };
        const pA1 = { x: a.position.x, y: a.position.y };
        const pB0 = prevPositions.get(b) ?? { x: b.position.x, y: b.position.y };
        const pB1 = { x: b.position.x, y: b.position.y };

        const hit = this.sweepCircleCircle(
          pA0,
          pA1,
          a.colliderRadius,
          pB0,
          pB1,
          b.colliderRadius
        );

        if (hit) {
          // 1. Rewind to contact instant (Rocket League TOI rollback)
          a.position.x = pA0.x + hit.alpha * (pA1.x - pA0.x);
          a.position.y = pA0.y + hit.alpha * (pA1.y - pA0.y);
          b.position.x = pB0.x + hit.alpha * (pB1.x - pB0.x);
          b.position.y = pB0.y + hit.alpha * (pB1.y - pB0.y);

          // 2. Apply impulse at tangent contact line and step remainder of frame
          const remainingFraction = Math.max(0, 1.0 - hit.alpha);
          this.applyCollisionImpulse(a, b, hit.normal, remainingFraction);
        }
      }
    }
  }
}
