import { Vector2D } from "../GameObject";

export interface SweptCircleHit {
  tHit: number;
  contactDx: number;
  contactDy: number;
  contactDist: number;
  normX: number;
  normY: number;
  velAlongNormal: number;
}

export interface SweptWallHit {
  tHitFraction: number; // alpha fraction in [0, 1]
  cx: number;
  cy: number;
  normX: number;
  normY: number;
  overlap: number;
}

/**
 * Pure geometric and kinematic mathematical calculations for continuous swept
 * circle-vs-circle and circle-vs-wall collisions.
 */
export class SweptMath {
  /**
   * Solves quadratic earliest Time-of-Impact for two moving spheres over interval dt.
   * Tests: || (pB0 + vB * t) - (pA0 + vA * t) ||^2 = (rA + rB)^2 for t in [0, dt].
   * Returns hit details if an impact occurs, or null if trajectories miss or separate.
   */
  public static sweepCircleVsCircle(
    pA0: Vector2D,
    vA: Vector2D,
    rA: number,
    pB0: Vector2D,
    vB: Vector2D,
    rB: number,
    dt: number
  ): SweptCircleHit | null {
    const minDist = rA + rB;

    // Relative start vector (B relative to A) and relative velocity
    const r0x = pB0.x - pA0.x;
    const r0y = pB0.y - pA0.y;
    const vRelX = vB.x - vA.x;
    const vRelY = vB.y - vA.y;

    // Quadratic equation: || r0 + vRel * t ||^2 = minDist^2
    // -> (vRel · vRel) * t^2 + 2 * (r0 · vRel) * t + (r0 · r0 - minDist^2) = 0
    const aQuad = vRelX * vRelX + vRelY * vRelY;
    const bQuad = 2 * (r0x * vRelX + r0y * vRelY);
    const cQuad = r0x * r0x + r0y * r0y - minDist * minDist;

    // Deep penetration at start of interval: defer to discrete penetration separation
    if (cQuad < -0.0001) {
      return null;
    }

    // Relative velocity is essentially zero: no collision during frame
    if (aQuad < 0.0000001) {
      return null;
    }

    const disc = bQuad * bQuad - 4 * aQuad * cQuad;
    if (disc < 0) {
      return null; // Trajectories miss each other
    }

    // Earliest impact time
    const tHit = Math.max(0, (-bQuad - Math.sqrt(Math.max(0, disc))) / (2 * aQuad));
    if (tHit > dt) {
      return null; // Impact occurs beyond this time step
    }

    // Positions at instant of impact
    const pAtX = pA0.x + vA.x * tHit;
    const pAtY = pA0.y + vA.y * tHit;
    const pBtX = pB0.x + vB.x * tHit;
    const pBtY = pB0.y + vB.y * tHit;

    // Contact normal pointing from A to B
    const contactDx = pBtX - pAtX;
    const contactDy = pBtY - pAtY;
    const contactDist = Math.hypot(contactDx, contactDy);
    const normX = contactDist > 0.0001 ? contactDx / contactDist : 1;
    const normY = contactDist > 0.0001 ? contactDy / contactDist : 0;

    const velAlongNormal = vRelX * normX + vRelY * normY;

    // Bodies must be closing along the contact normal to produce an impact
    if (velAlongNormal >= -0.0001) {
      return null;
    }

    return {
      tHit,
      contactDx,
      contactDy,
      contactDist,
      normX,
      normY,
      velAlongNormal,
    };
  }

  /**
   * Tests contact between a moving circle and an axis-aligned bounding box wall.
   */
  public static testCircleVsWall(
    posX: number,
    posY: number,
    radius: number,
    velX: number,
    velY: number,
    wallX: number,
    wallY: number,
    wallWidth: number,
    wallHeight: number,
    dt: number
  ): SweptWallHit | null {
    // Closest point on wall AABB to circle center
    const cx = Math.max(wallX, Math.min(posX, wallX + wallWidth));
    const cy = Math.max(wallY, Math.min(posY, wallY + wallHeight));
    const dx = posX - cx;
    const dy = posY - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq >= radius * radius) {
      return null;
    }

    const dist = Math.sqrt(distSq);
    const normX = dist > 0.0001 ? dx / dist : (velX < 0 ? 1 : -1);
    const normY = dist > 0.0001 ? dy / dist : (velY < 0 ? 1 : -1);

    const overlap = radius - dist;
    const speed = Math.hypot(velX, velY);
    let alpha = 0;
    if (speed > 0.0001) {
      alpha = Math.min(1.0, Math.max(0.0, overlap / (speed * dt)));
    }

    return {
      tHitFraction: alpha,
      cx,
      cy,
      normX,
      normY,
      overlap,
    };
  }
}
