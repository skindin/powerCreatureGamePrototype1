import { Arena, Wall } from "../Arena.js";
import { GameObject } from "../GameObject.js";

export type CollisionMode = "dynamic" | "discrete" | "continuous" | "naive";

export interface ContactInfo {
  point: { x: number; y: number };
  normal: { x: number; y: number };
  depth: number;
  timeOfImpact: number; // in seconds (0 to dt)
  type: "discrete_toi" | "continuous_swept" | "naive";
}

export class CollisionResolver {
  /**
   * Resolves all pairwise freebody-to-freebody collisions across characters and dynamic objects.
   */
  public static resolveEntityCollisions(
    entities: GameObject[],
    arena: Arena,
    dt: number,
    draggedEntity: GameObject | null = null,
    globalMode: CollisionMode = "dynamic"
  ): void {
    const count = entities.length;

    // Update continuous swept status and expire diagnostics older than 1.2s
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const e = entities[i];
      e.isSweptActive = globalMode === "continuous" || (globalMode !== "naive" && globalMode !== "discrete" && e.getEffectiveCollisionMode(dt) === "continuous");
      if (e.lastCollisionTime > 0 && now - e.lastCollisionTime > 1200) {
        e.lastCollisionType = "none";
      }
    }

    if (globalMode === "naive") {
      this.resolveNaiveIterative(entities, arena, draggedEntity);
      return;
    }

    // Pairwise collision checks
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = entities[i];
        const b = entities[j];

        // Skip if held or actively dragged in edit mode
        if (a.isHeld || b.isHeld || a === draggedEntity || b === draggedEntity) continue;
        if (!a.hasCollider || !b.hasCollider) continue;

        // Phase 3 Optimization: If both bodies are asleep, they cannot collide with each other
        if (a.isSleeping && b.isSleeping) continue;

        // Thrower immunity: a thrown projectile does not collide with its thrower until it exits reach
        if (a.lastThrower === b || b.lastThrower === a) continue;

        // 3D Altitude Gating & Two-Tier Layer Separation:
        // 1. If BOTH objects are resting on static surfaces (ground vs wall top), they only collide if on the same layer:
        const layerA = GameObject.getEntityLayer(a, arena.wallHeight);
        const layerB = GameObject.getEntityLayer(b, arena.wallHeight);
        if (a.isRestingOnSurface && b.isRestingOnSurface && layerA !== layerB) {
          continue;
        }

        // 2. 3D vertical volume overlap check:
        // A character has physical height spanning from its supporting base up by creature height (~0.9u).
        // A dynamic freebody object (rock, crate) spans [z - r, z + r] or [z, z + 2r].
        const charHeight = 0.9;
        const zMinA = a.isCharacter ? Math.max(0, a.position.z, a.supportingSurfaceHeight ?? 0) : Math.max(0, a.position.z - a.colliderRadius);
        const zMaxA = a.isCharacter ? zMinA + charHeight : Math.max(zMinA + 0.1, a.position.z + a.colliderRadius);

        const zMinB = b.isCharacter ? Math.max(0, b.position.z, b.supportingSurfaceHeight ?? 0) : Math.max(0, b.position.z - b.colliderRadius);
        const zMaxB = b.isCharacter ? zMinB + charHeight : Math.max(zMinB + 0.1, b.position.z + b.colliderRadius);

        // If no vertical overlap in 3D space, entities pass over/under each other cleanly:
        if (zMaxA < zMinB || zMaxB < zMinA) {
          continue;
        }

        // Determine effective collision mode for this pair
        let useContinuous = false;
        if (globalMode === "continuous") {
          useContinuous = true;
        } else if (globalMode === "discrete") {
          useContinuous = false;
        } else {
          // Dynamic mode: continuous supersedes discrete
          const modeA = a.getEffectiveCollisionMode(dt);
          const modeB = b.getEffectiveCollisionMode(dt);
          useContinuous = modeA === "continuous" || modeB === "continuous";
        }

        if (useContinuous) {
          this.resolvePairContinuousSwept(a, b, arena, dt);
        } else {
          this.resolvePairDiscreteTOI(a, b, arena, dt);
        }
      }
    }
  }

  /**
   * Discrete Time-of-Impact (TOI) Rollback:
   * Objects have stepped forward. If overlapping, rolls both bodies back along their travel paths
   * to the exact tangent contact point, applies mass/restitution impulses, then finishes the step.
   */
  public static resolvePairDiscreteTOI(
    a: GameObject,
    b: GameObject,
    _arena: Arena,
    dt: number
  ): boolean {
    const minDist = a.colliderRadius + b.colliderRadius;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const distSq = dx * dx + dy * dy;

    if (distSq >= minDist * minDist || distSq <= 0.00000001) {
      return false;
    }

    if (a.isImmovable && b.isImmovable) {
      return false;
    }

    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;

    // Normal pointing from A to B
    const normX = dx / dist;
    const normY = dy / dist;

    // Relative velocity (B relative to A)
    const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
    const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
    const velAlongNormal = relVx * normX + relVy * normY;

    // CRITICAL: If bodies are already separating or stationary relative to each other along contact normal,
    // do NOT rewind or apply collision impulse! Just depenetrate cleanly so they don't overlap.
    if (velAlongNormal >= -0.0001) {
      if (overlap > 0.00001) {
        if (b.isImmovable) {
          a.position.x -= normX * overlap;
          a.position.y -= normY * overlap;
        } else if (a.isImmovable) {
          b.position.x += normX * overlap;
          b.position.y += normY * overlap;
        } else {
          const fix = overlap * 0.5;
          a.position.x -= normX * fix;
          a.position.y -= normY * fix;
          b.position.x += normX * fix;
          b.position.y += normY * fix;
        }
      }
      return true;
    }

    // Find contact fraction alpha in [0, 1] using relative motion
    const relSpeed = Math.hypot(relVx, relVy);
    let alpha = 0; // fraction of frame to rewind
    if (relSpeed > 0.0001) {
      alpha = Math.min(1.0, Math.max(0.0, overlap / (relSpeed * dt)));
    }

    // Sub-tick rollback to exact tangent contact
    const rewindDt = alpha * dt;
    if (!a.isImmovable) {
      a.position.x -= a.velocity.x * rewindDt;
      a.position.y -= a.velocity.y * rewindDt;
    }
    if (!b.isImmovable) {
      b.position.x -= b.velocity.x * rewindDt;
      b.position.y -= b.velocity.y * rewindDt;
    }

    // Ensure no residual penetration at contact
    const contactDx = b.position.x - a.position.x;
    const contactDy = b.position.y - a.position.y;
    const contactDist = Math.hypot(contactDx, contactDy);
    if (contactDist < minDist && contactDist > 0.00001) {
      const penetration = minDist - contactDist;
      const cNormX = contactDx / contactDist;
      const cNormY = contactDy / contactDist;
      if (b.isImmovable) {
        a.position.x -= cNormX * penetration;
        a.position.y -= cNormY * penetration;
      } else if (a.isImmovable) {
        b.position.x += cNormX * penetration;
        b.position.y += cNormY * penetration;
      } else {
        const fix = penetration * 0.5;
        a.position.x -= cNormX * fix;
        a.position.y -= cNormY * fix;
        b.position.x += cNormX * fix;
        b.position.y += cNormY * fix;
      }
    }

    // Combined restitution
    const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
    const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
    const restitution = Math.max(bounceA, bounceB);

    // Apply physical impulses respecting Massless vs Massive rule
    this.applyImpulseAtContact(a, b, normX, normY, velAlongNormal, restitution, "discrete_toi");

    // Advance remainder of frame with new velocities
    const remDt = (1.0 - alpha) * dt;
    if (!a.isImmovable) {
      a.position.x += a.velocity.x * remDt;
      a.position.y += a.velocity.y * remDt;
    }
    if (!b.isImmovable) {
      b.position.x += b.velocity.x * remDt;
      b.position.y += b.velocity.y * remDt;
    }

    return true;
  }

  /**
   * Continuous Swept Circle Collision (CCD):
   * Tests swept trajectories of both bodies over dt. If they collide during the tick,
   * advances to exact time of impact, reflects velocities, and steps remainder.
   */
  public static resolvePairContinuousSwept(
    a: GameObject,
    b: GameObject,
    _arena: Arena,
    dt: number
  ): boolean {
    const minDist = a.colliderRadius + b.colliderRadius;

    if (a.isImmovable && b.isImmovable) {
      return false;
    }

    // Start positions (at beginning of tick dt)
    const pA0x = a.isImmovable ? a.position.x : (a.position.x - a.velocity.x * dt);
    const pA0y = a.isImmovable ? a.position.y : (a.position.y - a.velocity.y * dt);
    const pB0x = b.isImmovable ? b.position.x : (b.position.x - b.velocity.x * dt);
    const pB0y = b.isImmovable ? b.position.y : (b.position.y - b.velocity.y * dt);

    const vAx = a.isImmovable ? 0 : a.velocity.x;
    const vAy = a.isImmovable ? 0 : a.velocity.y;
    const vBx = b.isImmovable ? 0 : b.velocity.x;
    const vBy = b.isImmovable ? 0 : b.velocity.y;

    // Relative start position and relative velocity
    const r0x = pB0x - pA0x;
    const r0y = pB0y - pA0y;
    const vRelX = vBx - vAx;
    const vRelY = vBy - vAy;

    // Quadratic equation: |r0 + vRel * t|^2 = minDist^2
    const aQuad = vRelX * vRelX + vRelY * vRelY;
    const bQuad = 2 * (r0x * vRelX + r0y * vRelY);
    const cQuad = r0x * r0x + r0y * r0y - minDist * minDist;

    // If deeply penetrating at start of frame, fallback to tangent separation
    if (cQuad < -0.0001) {
      return this.resolvePairDiscreteTOI(a, b, _arena, dt);
    }

    if (aQuad < 0.0000001) {
      // Relative velocity is zero: no collision can occur during frame
      return false;
    }

    const disc = bQuad * bQuad - 4 * aQuad * cQuad;
    if (disc < 0) {
      return false; // Trajectories miss each other
    }

    // Earliest impact time
    const tHit = Math.max(0, (-bQuad - Math.sqrt(Math.max(0, disc))) / (2 * aQuad));
    if (tHit > dt) {
      return false; // Impact is outside this time step
    }

    // Advance bodies to the exact instant of impact tHit
    if (!a.isImmovable) {
      a.position.x = pA0x + a.velocity.x * tHit;
      a.position.y = pA0y + a.velocity.y * tHit;
    }
    if (!b.isImmovable) {
      b.position.x = pB0x + b.velocity.x * tHit;
      b.position.y = pB0y + b.velocity.y * tHit;
    }

    // Contact normal
    const contactDx = b.position.x - a.position.x;
    const contactDy = b.position.y - a.position.y;
    const contactDist = Math.hypot(contactDx, contactDy);
    const normX = contactDist > 0.0001 ? contactDx / contactDist : 1;
    const normY = contactDist > 0.0001 ? contactDy / contactDist : 0;

    const velAlongNormal = vRelX * normX + vRelY * normY;
    if (velAlongNormal >= -0.0001) {
      return false;
    }

    // Combined restitution
    const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
    const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
    const restitution = Math.max(bounceA, bounceB);

    // Apply impulse
    this.applyImpulseAtContact(a, b, normX, normY, velAlongNormal, restitution, "continuous_swept");

    // Advance remainder of frame
    const remDt = dt - tHit;
    if (!a.isImmovable) {
      a.position.x += a.velocity.x * remDt;
      a.position.y += a.velocity.y * remDt;
    }
    if (!b.isImmovable) {
      b.position.x += b.velocity.x * remDt;
      b.position.y += b.velocity.y * remDt;
    }

    return true;
  }

  /**
   * Resolves entity collision with an arena wall using discrete rollback or continuous sweep.
   */
  public static resolveEntityWallCollision(
    entity: GameObject,
    wall: Wall,
    _arena: Arena,
    dt: number,
    globalMode: CollisionMode = "dynamic"
  ): boolean {
    if (!entity.hasCollider) return false;

    // Altitude check: if entity altitude is above wall height, pass cleanly over
    if (entity.position.z > wall.wallHeight) return false;

    const r = entity.colliderRadius;
    const mode = globalMode === "naive"
      ? "naive"
      : (globalMode === "continuous"
          ? "continuous"
          : (globalMode === "discrete" ? "discrete" : entity.getEffectiveCollisionMode(dt)));

    // Closest point on wall AABB
    const cx = Math.max(wall.x, Math.min(entity.position.x, wall.x + wall.width));
    const cy = Math.max(wall.y, Math.min(entity.position.y, wall.y + wall.height));
    const dx = entity.position.x - cx;
    const dy = entity.position.y - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq >= r * r) {
      return false;
    }

    const dist = Math.sqrt(distSq);
    const normX = dist > 0.0001 ? dx / dist : (entity.velocity.x < 0 ? 1 : -1);
    const normY = dist > 0.0001 ? dy / dist : (entity.velocity.y < 0 ? 1 : -1);

    const bRestitution = entity.isCharacter ? 0 : (entity.hasBounce && entity.bounceMod !== null ? entity.bounceMod : 0);

    if (mode === "naive") {
      // Legacy push-out
      entity.position.x = cx + normX * r;
      entity.position.y = cy + normY * r;
      const vn = entity.velocity.x * normX + entity.velocity.y * normY;
      if (vn < 0) {
        entity.velocity.x -= (1 + bRestitution) * vn * normX;
        entity.velocity.y -= (1 + bRestitution) * vn * normY;
      }
      entity.lastCollisionType = "naive";
      return true;
    }

    // Rollback / Swept contact rewind:
    const overlap = r - dist;
    const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
    let alpha = 0;
    if (speed > 0.0001) {
      alpha = Math.min(1.0, Math.max(0.0, overlap / (speed * dt)));
    }

    // Place at tangent touch
    entity.position.x = cx + normX * (r + 0.001);
    entity.position.y = cy + normY * (r + 0.001);

    const vn = entity.velocity.x * normX + entity.velocity.y * normY;
    if (vn < 0) {
      entity.velocity.x -= (1 + bRestitution) * vn * normX;
      entity.velocity.y -= (1 + bRestitution) * vn * normY;
    }

    // Advance remainder
    const remDt = (1.0 - alpha) * dt;
    entity.position.x += entity.velocity.x * remDt;
    entity.position.y += entity.velocity.y * remDt;

    const nowWall = performance.now();
    entity.lastCollisionType = mode === "continuous" ? "continuous_swept" : "discrete_toi";
    entity.lastContactPoint = { x: cx, y: cy };
    entity.lastContactNormal = { x: normX, y: normY };
    entity.lastCollisionTime = nowWall;

    return true;
  }

  /**
   * Applies impulse at contact point respecting the Massless vs Massive rule.
   */
  private static applyImpulseAtContact(
    a: GameObject,
    b: GameObject,
    normX: number,
    normY: number,
    velAlongNormal: number,
    restitution: number,
    collisionType: "discrete_toi" | "continuous_swept"
  ): void {
    // Only apply impulse if closing towards each other
    if (velAlongNormal >= -0.0001) return;

    // Wake up any sleeping bodies involved in contact
    a.wakeUp();
    b.wakeUp();

    const isMasslessA = !a.hasMass;
    const isMasslessB = !b.hasMass;

    // Contact metadata
    const now = performance.now();
    const midX = (a.position.x + b.position.x) * 0.5;
    const midY = (a.position.y + b.position.y) * 0.5;
    a.lastContactPoint = { x: midX, y: midY };
    b.lastContactPoint = { x: midX, y: midY };
    a.lastContactNormal = { x: -normX, y: -normY };
    b.lastContactNormal = { x: normX, y: normY };
    a.lastCollisionType = collisionType;
    b.lastCollisionType = collisionType;
    a.lastCollisionTime = now;
    b.lastCollisionTime = now;

    // Case 0: Immovable entity collisions (e.g. Remote character proxy on client)
    if (a.isImmovable && b.isImmovable) return;

    if (b.isImmovable) {
      if (isMasslessA) {
        const closingSpeed = Math.abs(velAlongNormal);
        a.velocity.x -= normX * closingSpeed * (1 + restitution);
        a.velocity.y -= normY * closingSpeed * (1 + restitution);
      } else {
        const mA = a.mass;
        const invMassA = 1 / mA;
        const normalImpulse = -(1 + restitution) * velAlongNormal / invMassA;
        a.velocity.x -= normalImpulse * invMassA * normX;
        a.velocity.y -= normalImpulse * invMassA * normY;
      }
      return;
    }

    if (a.isImmovable) {
      if (isMasslessB) {
        const closingSpeed = Math.abs(velAlongNormal);
        b.velocity.x += normX * closingSpeed * (1 + restitution);
        b.velocity.y += normY * closingSpeed * (1 + restitution);
      } else {
        const mB = b.mass;
        const invMassB = 1 / mB;
        const normalImpulse = -(1 + restitution) * velAlongNormal / invMassB;
        b.velocity.x += normalImpulse * invMassB * normX;
        b.velocity.y += normalImpulse * invMassB * normY;
      }
      return;
    }

    // Case 1: Both objects are massless (50/50 impulse)
    if (isMasslessA && isMasslessB) {
      const impulse = -velAlongNormal * 0.5 * (1 + restitution);
      a.velocity.x -= impulse * normX;
      a.velocity.y -= impulse * normY;
      b.velocity.x += impulse * normX;
      b.velocity.y += impulse * normY;
      return;
    }

    // Case 2: A is Massive, B is Massless
    // B absorbs separation and inherits closing velocity without dampening A
    if (!isMasslessA && isMasslessB) {
      const closingSpeed = Math.abs(velAlongNormal);
      b.velocity.x += normX * closingSpeed * (1 + restitution);
      b.velocity.y += normY * closingSpeed * (1 + restitution);
      return;
    }

    // Case 3: A is Massless, B is Massive
    if (isMasslessA && !isMasslessB) {
      const closingSpeed = Math.abs(velAlongNormal);
      a.velocity.x -= normX * closingSpeed * (1 + restitution);
      a.velocity.y -= normY * closingSpeed * (1 + restitution);
      return;
    }

    // Case 4: Both objects are Massive (Standard conservation of momentum impulse)
    const mA = a.mass;
    const mB = b.mass;
    const invMassA = 1 / mA;
    const invMassB = 1 / mB;
    const invMassSum = invMassA + invMassB;
    const normalImpulse = -(1 + restitution) * velAlongNormal / invMassSum;

    a.velocity.x -= normalImpulse * invMassA * normX;
    a.velocity.y -= normalImpulse * invMassA * normY;
    b.velocity.x += normalImpulse * invMassB * normX;
    b.velocity.y += normalImpulse * invMassB * normY;

    // Tangential relative velocity (perpendicular to normal)
    const tangX = -normY;
    const tangY = normX;
    const relVx = b.velocity.x - a.velocity.x;
    const relVy = b.velocity.y - a.velocity.y;
    const relVt = relVx * tangX + relVy * tangY;

    if (Math.abs(relVt) > 0.001) {
      const muObj = 0.35 * Math.sqrt(a.dynamicGroundFrictionMod * b.dynamicGroundFrictionMod);
      const beta = 0.4; // Sphere rotational inertia factor
      const stickImpulse = Math.abs(relVt) / (invMassSum * (1 + 1 / beta));
      const maxFricImpulse = muObj * Math.abs(normalImpulse);
      const fricImpulse = Math.min(stickImpulse, maxFricImpulse) * Math.sign(relVt);

      a.velocity.x += fricImpulse * invMassA * tangX;
      a.velocity.y += fricImpulse * invMassA * tangY;
      b.velocity.x -= fricImpulse * invMassB * tangX;
      b.velocity.y -= fricImpulse * invMassB * tangY;

      // Rotational coupling if roll module is present
      if (a.rollModule && a.rollModule.enabled && a.colliderRadius > 0) {
        const spinImpulse = fricImpulse / (beta * a.mass * a.colliderRadius);
        a.rollModule.angularVelocity.z += spinImpulse;
        a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z));
      }

      if (b.rollModule && b.rollModule.enabled && b.colliderRadius > 0) {
        const spinImpulseB = fricImpulse / (beta * b.mass * b.colliderRadius);
        b.rollModule.angularVelocity.z -= spinImpulseB;
        b.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, b.rollModule.angularVelocity.z));
      }
    }
  }

  /**
   * Fallback naive iterative separation solver (Legacy baseline comparison).
   */
  private static resolveNaiveIterative(
    entities: GameObject[],
    arena: Arena,
    draggedEntity: GameObject | null
  ): void {
    const iterations = 3;
    const count = entities.length;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = entities[i];
          const b = entities[j];
          if (a.isHeld || b.isHeld || a === draggedEntity || b === draggedEntity) continue;
          if (!a.hasCollider || !b.hasCollider) continue;
          if (a.lastThrower === b || b.lastThrower === a) continue;

          const layerA = GameObject.getEntityLayer(a, arena.wallHeight);
          const layerB = GameObject.getEntityLayer(b, arena.wallHeight);
          if (layerA !== layerB) continue;

          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dist2DSq = dx * dx + dy * dy;
          const minDist = a.colliderRadius + b.colliderRadius;

          if (dist2DSq < minDist * minDist && dist2DSq > 0.000001) {
            const dist = Math.sqrt(dist2DSq);
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normY = dy / dist;

            const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
            const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
            const velAlongNormal = relVx * normX + relVy * normY;

            const nowNaive = performance.now();
            a.lastCollisionType = "naive";
            b.lastCollisionType = "naive";
            a.lastCollisionTime = nowNaive;
            b.lastCollisionTime = nowNaive;
            const midX = (a.position.x + b.position.x) * 0.5;
            const midY = (a.position.y + b.position.y) * 0.5;
            a.lastContactPoint = { x: midX, y: midY };
            b.lastContactPoint = { x: midX, y: midY };
            a.lastContactNormal = { x: -normX, y: -normY };
            b.lastContactNormal = { x: normX, y: normY };

            if (a.isImmovable && b.isImmovable) continue;

            if (b.isImmovable) {
              a.position.x -= normX * overlap;
              a.position.y -= normY * overlap;
              if (velAlongNormal < 0) {
                const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
                const restitution = bounceA;
                const closingSpeed = Math.abs(velAlongNormal);
                a.velocity.x -= normX * closingSpeed * (1 + restitution);
                a.velocity.y -= normY * closingSpeed * (1 + restitution);
              }
              continue;
            }

            if (a.isImmovable) {
              b.position.x += normX * overlap;
              b.position.y += normY * overlap;
              if (velAlongNormal < 0) {
                const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
                const restitution = bounceB;
                const closingSpeed = Math.abs(velAlongNormal);
                b.velocity.x += normX * closingSpeed * (1 + restitution);
                b.velocity.y += normY * closingSpeed * (1 + restitution);
              }
              continue;
            }

            const isMasslessA = !a.hasMass;
            const isMasslessB = !b.hasMass;

            if (isMasslessA && isMasslessB) {
              a.position.x -= normX * overlap * 0.5;
              a.position.y -= normY * overlap * 0.5;
              b.position.x += normX * overlap * 0.5;
              b.position.y += normY * overlap * 0.5;
              if (velAlongNormal < 0) {
                const impulse = -velAlongNormal * 0.5;
                a.velocity.x -= impulse * normX;
                a.velocity.y -= impulse * normY;
                b.velocity.x += impulse * normX;
                b.velocity.y += impulse * normY;
              }
              continue;
            }

            if (!isMasslessA && isMasslessB) {
              b.position.x += normX * overlap;
              b.position.y += normY * overlap;
              if (velAlongNormal < 0) {
                const closingSpeed = Math.abs(velAlongNormal);
                b.velocity.x += normX * closingSpeed;
                b.velocity.y += normY * closingSpeed;
              }
              continue;
            }

            if (isMasslessA && !isMasslessB) {
              a.position.x -= normX * overlap;
              a.position.y -= normY * overlap;
              if (velAlongNormal < 0) {
                const closingSpeed = Math.abs(velAlongNormal);
                a.velocity.x -= normX * closingSpeed;
                a.velocity.y -= normY * closingSpeed;
              }
              continue;
            }

            // Both massive
            const mA = a.mass;
            const mB = b.mass;
            const totalM = mA + mB;
            const ratioA = mB / totalM;
            const ratioB = mA / totalM;

            a.position.x -= normX * overlap * ratioA;
            a.position.y -= normY * overlap * ratioA;
            b.position.x += normX * overlap * ratioB;
            b.position.y += normY * overlap * ratioB;

            if (velAlongNormal < 0) {
              const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
              const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
              const restitution = Math.max(bounceA, bounceB);
              const impulse = -(1 + restitution) * velAlongNormal / (1 / mA + 1 / mB);
              a.velocity.x -= (impulse / mA) * normX;
              a.velocity.y -= (impulse / mA) * normY;
              b.velocity.x += (impulse / mB) * normX;
              b.velocity.y += (impulse / mB) * normY;
            }
          }
        }
      }
    }
  }
}
