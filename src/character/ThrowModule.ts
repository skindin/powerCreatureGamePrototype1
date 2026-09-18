import type { Character } from "./Character.js";
import type { Arena, Wall } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
  couldClearWall: boolean; // True if z > standard wall height
  isOverWall: boolean;     // True if intersecting a wall tile
  collidesWall: boolean;   // True if impacts wall
}

export interface TrajectoryCalculation {
  points: TrajectoryPoint[];
  landPoint: { x: number; y: number; z?: number };
  isBlockedByWall: boolean;
  blockedAtWallId?: string;
  isLandingOnWallTop?: boolean;
  targetObject?: GameObject | null;
  targetSurfaceHeight?: number;
  isAutoLocked?: boolean;
  peakHeight?: number;
  flightTime?: number;
  colliderRadius?: number;
  visualShape?: "circle" | "box";
}

export class ThrowModule {
  public id = "throw";
  public name = "Throw Ability";
  public enabled = true;

  // Tunable throw physics in wall-based units
  public baseThrowForce = 7.6; // Base throw power in u/s
  public maxThrowAimDistance = 13.0; // Max throw aim distance in units (~13 wall tiles)

  /**
   * Helper: tests circle-AABB intersection with a wall tile (matching GameObject collision)
   */
  private testWallIntersection(x: number, y: number, radius: number, wall: Wall): boolean {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
  }

  /**
   * Clamps an object's start position so that it does not overlap any wall if starting on the ground.
   * If overlapping, pushes it out to the closest valid position outside the wall.
   * Also exposes a near-wall check: if the clamped position is within `safeDistance` of any wall
   * face, the caller should pull the start back to the character's own position.
   */
  public static clampStartOutsideWalls(
    x: number,
    y: number,
    radius: number,
    arena: Arena,
    charZ: number,
    charX: number,
    charY: number
  ): { x: number; y: number; nearWall: boolean } {
    if (charZ >= arena.wallHeight) {
      return { x, y, nearWall: false }; // On or above walls
    }

    let clampedX = x;
    let clampedY = y;
    const r = radius > 0 ? radius : 0.3;
    const requiredClearance = r + 0.04;
    // "near wall" threshold: within 1 physics step of clearance (vMax * fixedDt ≈ 16 * 1/60 ≈ 0.27u)
    const nearWallThreshold = r + 0.30;

    // Up to 3 iterations to resolve adjacent corners/walls
    for (let iter = 0; iter < 3; iter++) {
      let collided = false;
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
        const dx = clampedX - closestX;
        const dy = clampedY - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq < requiredClearance * requiredClearance) {
          collided = true;
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const pushDist = (requiredClearance + 0.01) - dist;
            clampedX += (dx / dist) * pushDist;
            clampedY += (dy / dist) * pushDist;
          } else {
            const cdx = charX - closestX;
            const cdy = charY - closestY;
            const cdist = Math.hypot(cdx, cdy);
            if (cdist > 0.0001) {
              clampedX = closestX + (cdx / cdist) * (requiredClearance + 0.01);
              clampedY = closestY + (cdy / cdist) * (requiredClearance + 0.01);
            } else {
              const dL = clampedX - wall.x;
              const dR = wall.x + wall.width - clampedX;
              const dT = clampedY - wall.y;
              const dB = wall.y + wall.height - clampedY;
              const minD = Math.min(dL, dR, dT, dB);
              if (minD === dL) clampedX = wall.x - requiredClearance - 0.01;
              else if (minD === dR) clampedX = wall.x + wall.width + requiredClearance + 0.01;
              else if (minD === dT) clampedY = wall.y - requiredClearance - 0.01;
              else clampedY = wall.y + wall.height + requiredClearance + 0.01;
            }
          }
        }
      }
      if (!collided) break;
    }

    // Check if the clamped position is still dangerously close to any wall face
    let nearWall = false;
    for (const wall of arena.walls) {
      const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
      const dx = clampedX - closestX;
      const dy = clampedY - closestY;
      if (dx * dx + dy * dy < nearWallThreshold * nearWallThreshold) {
        nearWall = true;
        break;
      }
    }

    return { x: clampedX, y: clampedY, nearWall };
  }

  /**
   * Finds the entity directly under the aim target cursor (x, y), if any.
   * Excludes the thrower and the thrower's held object.
   * Checks both physical 2D ground footprint and pseudo-3D isometric visual position.
   */
  public findHoveredEntity(
    aimX: number,
    aimY: number,
    arena: Arena,
    exclude?: GameObject | null,
    heldObject?: GameObject | null,
    entities?: GameObject[],
    hoverScale?: number,
    tolerance = 0.35
  ): GameObject | null {
    const list = entities ?? arena.entities ?? [];
    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    let bestEntity: GameObject | null = null;
    let bestDist = Infinity;

    for (let i = list.length - 1; i >= 0; i--) {
      const ent = list[i];
      if (ent === exclude || ent === heldObject || ent.isHeld) continue;

      const r = ent.hasCollider ? ent.colliderRadius : (ent.colliderModule?.radius ?? 0.35);
      const effectiveR = r > 0 ? r : 0.35;

      // Check ground footprint distance
      const distGround = Math.hypot(ent.position.x - aimX, ent.position.y - aimY);

      // Check pseudo-3D visual position distance
      const z = ent.position.z ?? 0;
      const visualY = ent.position.y - z * scale;
      const distVisual = Math.hypot(ent.position.x - aimX, visualY - aimY);

      // Also check 1:1 isometric distance in case scale is 1.0 or user clicks near top
      const dist1to1 = Math.hypot(ent.position.x - aimX, (ent.position.y - z) - aimY);

      const minDist = Math.min(distGround, distVisual, dist1to1);
      if (minDist <= effectiveR + tolerance) {
        if (minDist < bestDist) {
          bestDist = minDist;
          bestEntity = ent;
        }
      }
    }

    return bestEntity;
  }

  /**
   * Computes launch velocities vx, vy, vz given start position, target position, arena parameters, and strength.
   * Adjusts total flight time and launch angles so the object lands EXACTLY at the targeted position,
   * whether on the ground, on top of an elevated wall, or on the layer of a targeted object.
   * If autoLock is true (e.g. holding right click), locks 2D coordinates to the overlapped object center.
   */
  private computeLaunchVelocity(
    startX: number,
    startY: number,
    startZ: number,
    targetX: number,
    targetY: number,
    arena: Arena,
    throwPower: number,
    hasGravity = true,
    hasVerticalVelocity = true,
    colliderRadius = 0.35,
    charVel?: { x: number; y: number; z?: number },
    candidateEntities?: GameObject[],
    hoverScale?: number,
    thrower?: Character,
    heldObject?: GameObject | null,
    autoLock = false
  ): {
    vx: number;
    vy: number;
    vz: number;
    totalTime: number;
    finalTargetX: number;
    finalTargetY: number;
    targetSurfaceHeight: number;
    targetObject?: GameObject | null;
    isAutoLocked?: boolean;
  } | null {
    // If autoLock is true (holding Right Click / LT), lock onto the closest object to the cursor, NO MATTER HOW FAR!
    // If autoLock is false, only detect if the cursor directly overlaps/touches an object (tolerance = 0.35)
    const lockTolerance = autoLock ? Infinity : 0.35;
    const hoveredEntity = this.findHoveredEntity(
      targetX,
      targetY,
      arena,
      thrower,
      heldObject,
      candidateEntities,
      hoverScale,
      lockTolerance
    );

    let effectiveTargetX = targetX;
    let effectiveTargetY = targetY;
    let isLocked = false;

    // If holding right click (autoLock = true) and cursor overlaps an object, snap 2D coordinates to object center
    if (autoLock && hoveredEntity) {
      effectiveTargetX = hoveredEntity.position.x;
      effectiveTargetY = hoveredEntity.position.y;
      isLocked = true;
    }

    let dx = effectiveTargetX - startX;
    let dy = effectiveTargetY - startY;
    let dist = Math.hypot(dx, dy);
    if (dist < 0.1) {
      const angle = thrower ? thrower.facingAngle : 0;
      effectiveTargetX = startX + Math.cos(angle) * 2.0;
      effectiveTargetY = startY + Math.sin(angle) * 2.0;
      dx = effectiveTargetX - startX;
      dy = effectiveTargetY - startY;
      dist = Math.hypot(dx, dy);
    }

    // Clamp aim distance to character reach
    const actualDist = Math.min(dist, this.maxThrowAimDistance);
    const dirX = dx / dist;
    const dirY = dy / dist;
    const finalTargetX = startX + dirX * actualDist;
    const finalTargetY = startY + dirY * actualDist;

    // Inertial velocity integration:
    // When moving, the character's velocity vector influences the throw.
    // To land on target, the arm cancels sideways drift while contributing forward throw power,
    // altering the flight time, vertical arc, and launch velocity.
    const vxChar = charVel?.x ?? 0;
    const vyChar = charVel?.y ?? 0;
    const vAlong = vxChar * dirX + vyChar * dirY;
    const vPerp = vxChar * (-dirY) + vyChar * dirX;

    // Arm velocity available in target direction after countering perpendicular momentum
    const armAlongMax = Math.sqrt(Math.max(0.25, throwPower * throwPower - vPerp * vPerp));
    const maxForwardSpeed = Math.max(1.5, vAlong + armAlongMax);

    // Target surface elevation:
    // If cursor is over an object, calculate the trajectory to hit the top of the layer the object is on.
    // Otherwise fallback to checking walls at the aim position.
    let targetSurfaceHeight: number;
    if (hoveredEntity) {
      const layer = GameObject.getEntityLayer(hoveredEntity, arena.wallHeight);
      if (layer <= 1) {
        // Layer 1 is the Ground Layer. Top of the ground layer surface is 0.0.
        targetSurfaceHeight = 0.0;
      } else {
        // Layer 2+ is Wall / Platform elevation. Top of Layer 2 is wallHeight (1.0u).
        const wallH = hoveredEntity.standingWall?.wallHeight ?? arena.wallHeight;
        targetSurfaceHeight = (layer - 1) * wallH;
        if (hoveredEntity.supportingSurfaceHeight > 0.05) {
          targetSurfaceHeight = hoveredEntity.supportingSurfaceHeight;
        }
      }
    } else {
      targetSurfaceHeight = arena.getSupportingSurfaceHeight(finalTargetX, finalTargetY);
    }

    // Straight-line horizontal flight if zero-G or no vertical velocity module
    if (!hasGravity || !hasVerticalVelocity) {
      const totalTime = Math.max(0.14, actualDist / maxForwardSpeed);
      const vx = dirX * maxForwardSpeed;
      const vy = dirY * maxForwardSpeed;
      const vz = 0;
      return { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight: startZ, targetObject: hoveredEntity };
    }

    const deltaZ = targetSurfaceHeight - startZ;

    // Minimum angle trajectory calculation:
    // Moving towards the target enables faster, flatter throws; backpedaling results in a higher lob.
    const minFlightTime = Math.max(0.14, actualDist / maxForwardSpeed);
    let totalTime = minFlightTime;

    // If target is elevated onto a wall (deltaZ > 0), ensure flight time allows ascending to wall height
    if (deltaZ > 0) {
      totalTime = Math.max(totalTime, Math.sqrt((2 * deltaZ) / arena.gravity));
    }

    // Scan dense samples along trajectory to ensure clearance over any intermediate walls.
    // If the flat trajectory would collide with an intermediate wall, increase totalTime to the minimum
    // required to clear the wall top with a tight, minimal clearance arc.
    const colliderRadiusCheck = colliderRadius > 0 ? colliderRadius : 0.35;
    const clearance = 0.25; // Clean clearance over intermediate walls

    // Dense sampling near the start (s < 0.1) ensures walls directly in front of the thrower are detected immediately
    const sampleRatios: number[] = [];
    for (let s = 0.005; s < 0.1; s += 0.005) {
      sampleRatios.push(s);
    }
    for (let i = 4; i <= 40; i++) {
      sampleRatios.push(i / 40);
    }

    for (const s of sampleRatios) {
      const sampleX = startX + (finalTargetX - startX) * s;
      const sampleY = startY + (finalTargetY - startY) * s;

      // Check if sample intersects any wall
      for (const wall of arena.walls) {
        if (this.testWallIntersection(sampleX, sampleY, colliderRadiusCheck, wall)) {
          // If the target itself is on top of this wall (or destination is on this wall) and we are near the end of the trajectory, skip (it's landing)
          const isTargetOnThisWall = (targetSurfaceHeight > 0 || (hoveredEntity && hoveredEntity.standingWall === wall)) &&
            finalTargetX >= wall.x - 0.2 && finalTargetX <= wall.x + wall.width + 0.2 &&
            finalTargetY >= wall.y - 0.2 && finalTargetY <= wall.y + wall.height + 0.2;
          if (isTargetOnThisWall && s > 0.65) {
            continue;
          }

          // Intermediate wall that must be cleared!
          // Direct chord height: baselineZ = (1 - s) * startZ + s * targetSurfaceHeight
          // Trajectory arc height: z(s) = baselineZ + 0.5 * g * totalTime^2 * s * (1 - s)
          // We require z(s) >= wall.wallHeight + clearance
          const baselineZ = (1 - s) * startZ + s * targetSurfaceHeight;
          const requiredHeight = wall.wallHeight + clearance;
          const requiredDeltaZ = requiredHeight - baselineZ;
          if (requiredDeltaZ > 0) {
            const denom = arena.gravity * s * (1 - s);
            if (denom > 0.0001) {
              const reqTimeSq = (2 * requiredDeltaZ) / denom;
              if (reqTimeSq > 0) {
                const reqTime = Math.sqrt(reqTimeSq);
                if (reqTime > totalTime) {
                  totalTime = reqTime;
                }
              }
            }
          }
        }
      }
    }

    if (totalTime <= 0.05) return null;

    // From totalTime and deltaZ, compute the exact vz to hit targetSurfaceHeight at totalTime:
    // targetSurfaceHeight = startZ + vz * totalTime - 0.5 * g * totalTime^2
    // vz = (deltaZ + 0.5 * g * totalTime^2) / totalTime
    const vz = (deltaZ + 0.5 * arena.gravity * totalTime * totalTime) / totalTime;

    // Horizontal speed required to land EXACTLY at (finalTargetX, finalTargetY) at totalTime
    const horizontalSpeed = actualDist / totalTime;
    const vx = dirX * horizontalSpeed;
    const vy = dirY * horizontalSpeed;

    return { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, targetObject: hoveredEntity, isAutoLocked: isLocked };
  }

  /**
   * Pre-calculates trajectory points for real-time visualization overlay
   */
  public calculateTrajectory(
    character: Character,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena,
    entities?: GameObject[],
    hoverScale?: number,
    autoLock = false
  ): TrajectoryCalculation | null {
    if (!this.enabled || !character.heldObject) return null;

    const held = character.heldObject;
    let startX = held.position.x;
    let startY = held.position.y;
    const startZ = held.position.z;

    // If starting on the ground, clamp start position outside walls.
    // If the clamped start is still within ~0.3u of a wall face, pull back to the
    // character's own position so the arc has room to gain altitude before the wall.
    if (character.position.z < arena.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena,
        character.position.z,
        character.position.x,
        character.position.y
      );
      if (clamped.nearWall) {
        // Start from the character's own safe position instead
        startX = character.position.x;
        startY = character.position.y;
      } else {
        startX = clamped.x;
        startY = clamped.y;
      }
    }

    const throwPower = this.baseThrowForce * character.strength;
    const canFlyVertically = held.hasGravity && held.hasVerticalVelocity;

    const charVel = {
      x: character.velocity.x,
      y: character.velocity.y,
      z: character.isAboveGround ? character.verticalVelocity : 0,
    };

    const candidateEntities = entities ?? arena.entities;
    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    const launch = this.computeLaunchVelocity(
      startX, startY, startZ, aimTargetX, aimTargetY, arena, throwPower, held.hasGravity, held.hasVerticalVelocity, held.colliderRadius, charVel,
      candidateEntities, scale, character, held, autoLock
    );
    if (!launch) return null;

    const { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, targetObject, isAutoLocked } = launch;

    // Fine simulation steps matching 120Hz physics precision
    const steps = 90;
    const dtStep = totalTime / steps;
    const points: TrajectoryPoint[] = [];

    let isBlocked = false;
    let isLandingOnWallTop = targetSurfaceHeight > 0;
    let blockedWallId: string | undefined;
    let peakHeight = startZ;

    for (let step = 0; step <= steps; step++) {
      const t = step * dtStep;
      // At the final step, enforce exact final target coordinates
      const currentX = step === steps ? finalTargetX : startX + vx * t;
      const currentY = step === steps ? finalTargetY : startY + vy * t;
      const calculatedZ = canFlyVertically ? (startZ + vz * t - 0.5 * arena.gravity * t * t) : startZ;
      const currentZ = canFlyVertically ? (step === steps ? targetSurfaceHeight : (step > steps - 3 ? Math.max(targetSurfaceHeight, calculatedZ) : Math.max(0, calculatedZ))) : startZ;
      const currentVz = canFlyVertically ? (vz - arena.gravity * t) : 0;

      if (currentZ > peakHeight) {
        peakHeight = currentZ;
      }

      // Blue section: height > standard wall height
      const couldClearWall = currentZ > arena.wallHeight;
      let isOverWall = false;
      let collidesWall = false;

      // Check wall collisions along the path
      for (const wall of arena.walls) {
        if (this.testWallIntersection(currentX, currentY, held.colliderRadius, wall)) {
          isOverWall = true;
          // Only check collision if height is at or below the wall and not yet at the intentional landing step
          if (currentZ <= wall.wallHeight + 0.001) {
            const wasAbove = points.length > 0 && points[points.length - 1].z >= wall.wallHeight - 0.05;
            if (wasAbove && currentVz <= 0) {
              // Descending onto top of wall
              const isTargetedWall = targetSurfaceHeight > 0 &&
                finalTargetX >= wall.x - 0.2 && finalTargetX <= wall.x + wall.width + 0.2 &&
                finalTargetY >= wall.y - 0.2 && finalTargetY <= wall.y + wall.height + 0.2;

              if (isTargetedWall || (targetSurfaceHeight > 0 && step >= steps - 3)) {
                // This is the intended landing on top of the targeted wall!
                isLandingOnWallTop = true;
                break;
              } else if (targetSurfaceHeight === 0) {
                // Intermediate wall hit from above
                isLandingOnWallTop = true;
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            } else if (currentZ < wall.wallHeight - 0.05) {
              // Side wall collision (ignore departure at step <= 1 if starting in contact)
              if (step > 1) {
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            }
          }
        }
      }

      points.push({
        x: currentX,
        y: currentY,
        z: currentZ,
        t,
        couldClearWall,
        isOverWall,
        collidesWall,
      });

      if (collidesWall) {
        break; // Trajectory truncated on collision
      }
    }

    const lastPoint = points[points.length - 1];
    return {
      points,
      landPoint: {
        x: isBlocked ? lastPoint.x : finalTargetX,
        y: isBlocked ? lastPoint.y : finalTargetY,
        z: isBlocked ? lastPoint.z : targetSurfaceHeight,
      },
      isBlockedByWall: isBlocked,
      isLandingOnWallTop: isBlocked ? isLandingOnWallTop : (targetSurfaceHeight > 0),
      blockedAtWallId: blockedWallId,
      targetObject,
      targetSurfaceHeight,
      isAutoLocked,
      peakHeight,
      flightTime: totalTime,
      colliderRadius: held.colliderRadius,
      visualShape: held.visualShape,
    };
  }

  /**
   * Executes the throw of the held object using the exact same launch parameters
   */
  public throwHeldObject(
    character: Character,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena,
    entities?: GameObject[],
    hoverScale?: number,
    autoLock = false
  ): GameObject | null {
    if (!this.enabled || !character.heldObject) return null;

    const held = character.heldObject;
    let startX = held.position.x;
    let startY = held.position.y;
    const startZ = held.position.z;

    // If starting on the ground, clamp start position outside walls.
    // If the clamped start is still within ~0.3u of a wall face, pull back to the
    // character's own position so the arc has room to gain altitude before the wall.
    if (character.position.z < arena.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena,
        character.position.z,
        character.position.x,
        character.position.y
      );
      if (clamped.nearWall) {
        // Start from the character's own safe position instead
        startX = character.position.x;
        startY = character.position.y;
      } else {
        startX = clamped.x;
        startY = clamped.y;
      }
    }

    const throwPower = this.baseThrowForce * character.strength;
    const charVel = {
      x: character.velocity.x,
      y: character.velocity.y,
      z: character.isAboveGround ? character.verticalVelocity : 0,
    };
    const candidateEntities = entities ?? arena.entities;
    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    const launch = this.computeLaunchVelocity(
      startX, startY, startZ, aimTargetX, aimTargetY, arena, throwPower, held.hasGravity, held.hasVerticalVelocity, held.colliderRadius, charVel,
      candidateEntities, scale, character, held, autoLock
    );
    if (!launch) return null;

    held.isHeld = false;
    held.heldBy = null;
    held.lastThrower = character;
    held.position.x = startX;
    held.position.y = startY;
    held.velocity.x = launch.vx;
    held.velocity.y = launch.vy;
    held.verticalVelocity = launch.vz;
    held.position.z = held.hasVerticalPosition ? Math.max(0.3, held.position.z) : 0;

    // If held object is rollable and has friction, impart rolling motion along throw direction
    if (held.hasFriction && held.rollModule && held.rollModule.enabled) {
      const R = held.colliderRadius > 0 ? held.colliderRadius : 0.3;
      held.rollModule.angularVelocity.y = launch.vx / R;
      held.rollModule.angularVelocity.x = -launch.vy / R;
    }

    // Apply opposite recoil velocity to character based on linear momentum conservation
    // Released object velocity change: deltaV = v_launch - v_initial (where v_initial = character.velocity)
    // Impulse on object: J_obj = m_held * deltaV
    // Recoil on character: J_char = -J_obj -> v_recoil = -(m_held / m_char) * (v_launch - character.velocity)
    // When throwing perpendicular to movement, countering the object's current velocity in hand
    // applies an additional forward reaction boost in the movement direction!
    const carriedMass = (held.hasMass) ? held.mass : 0;
    const charBaseMass = (character.hasMass) ? Math.max(0.2, character.baseMass) : 0;
    const recoilRatio = (carriedMass > 0 && charBaseMass > 0) ? (carriedMass / charBaseMass) : 0;

    // Detach from hands
    character.heldObject = null;

    const deltaVx = launch.vx - character.velocity.x;
    const deltaVy = launch.vy - character.velocity.y;

    character.velocity.x -= deltaVx * recoilRatio;
    character.velocity.y -= deltaVy * recoilRatio;

    if (character.isAboveGround && held.hasVerticalVelocity) {
      const deltaVz = launch.vz - character.verticalVelocity;
      character.verticalVelocity -= deltaVz * recoilRatio;
    }

    if (character.onThrow) {
      character.onThrow(held, launch.vx, launch.vy, launch.vz, aimTargetX, aimTargetY);
    }

    return held;
  }

}
