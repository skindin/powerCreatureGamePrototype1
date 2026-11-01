import type { Character, AnticipatedModifier } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";
import type { GameObject, Vector2D } from "../../engine/GameObject.js";
import type { TrajectoryCalculation } from "../ThrowModule.js";

/**
 * Isolated 1-to-1 capability slice for Object Holding & Ballistic Throwing.
 * Encapsulates throw energy preview, trajectory calculation orchestration,
 * and held-object wall clearance math without modifying Tier 2 ThrowModule.ts.
 */
export class ThrowCapability {
  public static getAnticipatedModifier(char: Character): AnticipatedModifier | null {
    if (
      char.activeTrajectory &&
      char.heldObject &&
      char.throwModule &&
      char.throwModule.enabled &&
      char.throwModule.consumesEnergy
    ) {
      const launchVel = char.activeTrajectory.launchVel;
      if (launchVel) {
        const heldMass = char.heldObject.hasMass ? Math.max(0.1, char.heldObject.mass) : 1.0;
        const actualLaunchSpeed = Math.hypot(launchVel.vx, launchVel.vy, launchVel.vz);
        const mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
        const pool = char.energyPool;
        const poolEfficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(char.properties) : 0.25);
        let metabolicJoules = Math.max(5, mechWorkJoules / poolEfficiency);

        if (pool && pool.enabled) {
          const throwCap = char.throwModule.maxPowerProp.get(char.properties);
          const currentStamina = pool.currentStaminaProp.get(char.properties);
          const poolEnergy = pool.infiniteEnergy ? Infinity : pool.getCurrentEnergy(char.properties);
          const maxDeliverable = Math.min(
            throwCap * char.strength,
            currentStamina,
            poolEnergy
          );

          metabolicJoules = Math.min(maxDeliverable, metabolicJoules);

          if (pool.isExhausted || !pool.canSatisfyFullEnergy(metabolicJoules, 0.08, char.properties)) {
            return null;
          }
        }

        return {
          id: "anticipated_throw",
          abilityId: "throw",
          name: "Throw",
          color: "#f43f5e",
          amount: Math.round(metabolicJoules),
          isBurst: true,
          isPositive: false,
          order: 950,
        };
      }
    }
    return null;
  }

  public static syncHeldObjectTransform(char: Character, arena: Arena): void {
    if (char.heldObject) {
      const heldPos = ThrowCapability.calculateHeldObjectPosition(char, arena);
      char.heldObject.position.x = heldPos.x;
      char.heldObject.position.y = heldPos.y;
      char.heldObject.position.z = heldPos.z;
      char.heldObject.velocity.x = char.velocity.x;
      char.heldObject.velocity.y = char.velocity.y;
      char.heldObject.verticalVelocity = 0;
    }
  }

  public static updateTrajectoryPreview(
    char: Character,
    isAimingInput: boolean,
    aimTargetPos: Vector2D | null,
    canAimThrow: boolean,
    isLaserModeActive: boolean,
    arena: Arena,
    entities?: GameObject[],
    autoLock = false,
    lockedAimPos: Vector2D | null = null,
    aimLockDelta = 0
  ): void {
    char.isAiming = isAimingInput;
    char.aimTarget = isAimingInput ? aimTargetPos : null;

    if (
      !isLaserModeActive &&
      char.heldObject &&
      canAimThrow &&
      char.throwModule &&
      char.throwModule.enabled &&
      char.hasStrength &&
      isAimingInput &&
      aimTargetPos
    ) {
      if (char.isChargingThrow) {
        const aimDx = aimTargetPos.x - char.position.x;
        const aimDy = aimTargetPos.y - char.position.y;
        const distToAim = Math.hypot(aimDx, aimDy);
        const cancelDistance = Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

        if (distToAim < cancelDistance) {
          char.activeTrajectory = null;
          char.isThrowCancelZone = true;
          return;
        }
        char.isThrowCancelZone = false;

        // Step 1: Baseline lowest energy wall-clearing trajectory calculation
        const clearTraj = ThrowCapability.findLowestEnergyWallClearTrajectory(
          char,
          arena,
          aimTargetPos.x,
          aimTargetPos.y,
          entities,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );

        const startRatio = char.savedArcRatio ?? char.throwModule.savedArcRatio ?? 0.5;
        const flattestBlocked = Boolean(clearTraj?.flattestPoints?.some((pt) => pt.collidesWall));

        // Step 2: Compute charge progress (700ms charge window)
        const now = performance.now();
        const start = char.throwChargeStartTime ?? now;
        const holdMs = Math.max(0, now - start);
        const chargeDurationMs = 700;
        const chargeProgress = Math.min(1.0, holdMs / chargeDurationMs);
        char.throwChargeProgress = chargeProgress;

        // Step 3: Interpolate arc:
        // - If flattest trajectory has no wall collisions -> charge towards 0.0 (flattest / highest speed)
        // - If flattest trajectory is blocked by a wall -> charge towards 1.0 (increase height to loft over wall)
        const targetRatio = flattestBlocked ? 1.0 : 0.0;
        const chargedRatio = startRatio + (targetRatio - startRatio) * chargeProgress;

        char.throwChargingTowards = flattestBlocked ? "steepest" : "flattest";

        char.throwModule.hasUserSetArcRatio = true;
        char.throwModule.savedArcRatio = chargedRatio;
        char.hasUserSetArcRatio = true;
        char.savedArcRatio = chargedRatio;

        // Step 4: Final trajectory calculation with the charged arc ratio
        char.activeTrajectory = (chargeProgress > 0.001)
          ? char.throwModule.calculateTrajectory(
              char,
              aimTargetPos.x,
              aimTargetPos.y,
              arena,
              entities ?? arena.entities,
              arena.visualAltitudeScale,
              autoLock,
              lockedAimPos,
              aimLockDelta
            )
          : clearTraj;

        if (char.activeTrajectory) {
          (char.activeTrajectory as any).chargingTowards = char.throwChargingTowards;
        }
      } else if (char.isAimingWallClear) {
        const aimDx = aimTargetPos.x - char.position.x;
        const aimDy = aimTargetPos.y - char.position.y;
        const distToAim = Math.hypot(aimDx, aimDy);
        const cancelDistance = Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

        if (distToAim < cancelDistance) {
          char.activeTrajectory = null;
          char.isThrowCancelZone = true;
          return;
        }
        char.isThrowCancelZone = false;

        ThrowCapability.findLowestEnergyWallClearTrajectory(
          char,
          arena,
          aimTargetPos.x,
          aimTargetPos.y,
          entities,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
      } else {
        char.isThrowCancelZone = false;
        char.throwChargingTowards = undefined;
        if (char.hasUserSetArcRatio && char.savedArcRatio !== undefined) {
          char.throwModule.hasUserSetArcRatio = true;
          char.throwModule.savedArcRatio = char.savedArcRatio;
        } else if (char.throwModule.hasUserSetArcRatio) {
          char.hasUserSetArcRatio = true;
          char.savedArcRatio = char.throwModule.savedArcRatio;
        }
        char.activeTrajectory = char.throwModule.calculateTrajectory(
          char,
          aimTargetPos.x,
          aimTargetPos.y,
          arena,
          entities ?? arena.entities,
          arena.visualAltitudeScale,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );
      }

      if (canAimThrow && lockedAimPos && char.heldObject) {
        const lockDx = lockedAimPos.x - char.position.x;
        const lockDy = lockedAimPos.y - char.position.y;
        if (Math.hypot(lockDx, lockDy) > 0.05) {
          char.facingAngle = Math.atan2(lockDy, lockDx);
          const heldPos = ThrowCapability.calculateHeldObjectPosition(char, arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
      }
    } else {
      char.activeTrajectory = null;
      char.isThrowCancelZone = false;
      char.throwChargingTowards = undefined;
    }
  }

  public static calculateHeldObjectPosition(char: Character, arena?: Arena): { x: number; y: number; z: number } {
    if (!char.heldObject) {
      return { x: char.position.x, y: char.position.y, z: char.position.z };
    }

    const defaultHandDist = char.colliderRadius + char.heldObject.colliderRadius * 0.5 + 0.08;
    const dirX = Math.cos(char.facingAngle);
    const dirY = Math.sin(char.facingAngle);
    const heldZ = char.heldObject.hasVerticalPosition ? (char.position.z + 0.45) : 0;

    if (!arena || char.position.z >= arena.wallHeight) {
      return {
        x: char.position.x + dirX * defaultHandDist,
        y: char.position.y + dirY * defaultHandDist,
        z: heldZ,
      };
    }

    const objRadius = char.heldObject.colliderRadius > 0 ? char.heldObject.colliderRadius : 0.26;
    const safetyMargin = 0.12;
    const requiredClearance = objRadius + safetyMargin;
    const extraThrowClearback = 0.08;

    let minHitDistance = Infinity;

    for (const wall of arena.walls) {
      const x1 = wall.x;
      const x2 = wall.x + wall.width;
      const y1 = wall.y;
      const y2 = wall.y + wall.height;
      const R = requiredClearance;

      if (dirX > 0.0001 && char.position.x < x1 - R) {
        const t = (x1 - R - char.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = char.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      if (dirX < -0.0001 && char.position.x > x2 + R) {
        const t = (x2 + R - char.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = char.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      if (dirY > 0.0001 && char.position.y < y1 - R) {
        const t = (y1 - R - char.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = char.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }
      if (dirY < -0.0001 && char.position.y > y2 + R) {
        const t = (y2 + R - char.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = char.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }

      const corners: Array<{ kx: number; ky: number; isExterior: (px: number, py: number) => boolean }> = [
        { kx: x1, ky: y1, isExterior: (px, py) => px <= x1 && py <= y1 },
        { kx: x2, ky: y1, isExterior: (px, py) => px >= x2 && py <= y1 },
        { kx: x1, ky: y2, isExterior: (px, py) => px <= x1 && py >= y2 },
        { kx: x2, ky: y2, isExterior: (px, py) => px >= x2 && py >= y2 },
      ];

      for (const corner of corners) {
        const wx = char.position.x - corner.kx;
        const wy = char.position.y - corner.ky;
        const B = 2 * (dirX * wx + dirY * wy);
        const C_quad = wx * wx + wy * wy - R * R;
        const disc = B * B - 4 * C_quad;

        if (disc >= 0) {
          const sqrtDisc = Math.sqrt(disc);
          const t1 = (-B - sqrtDisc) * 0.5;
          if (t1 > 0 && t1 < minHitDistance) {
            const px = char.position.x + t1 * dirX;
            const py = char.position.y + t1 * dirY;
            if (corner.isExterior(px, py)) {
              minHitDistance = t1;
            }
          }
        }
      }
    }

    let safeDistance = defaultHandDist;
    if (minHitDistance < Infinity) {
      safeDistance = Math.max(0, Math.min(defaultHandDist, minHitDistance - extraThrowClearback));
    }

    let targetX = char.position.x + dirX * safeDistance;
    let targetY = char.position.y + dirY * safeDistance;

    for (let iter = 0; iter < 3; iter++) {
      let adjusted = false;
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(targetX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(targetY, wall.y + wall.height));
        const dx = targetX - closestX;
        const dy = targetY - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq < objRadius * objRadius) {
          adjusted = true;
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            targetX += (dx / dist) * (objRadius + 0.02 - dist);
            targetY += (dy / dist) * (objRadius + 0.02 - dist);
          } else {
            targetX = char.position.x;
            targetY = char.position.y;
          }
        }
      }
      if (!adjusted) break;
    }

    return { x: targetX, y: targetY, z: heldZ };
  }

  /**
   * Calculates the lowest energy trajectory that does not collide with any wall, if one exists.
   * If the base optimal trajectory is already collision-free, it is returned directly.
   * Otherwise, samples candidate arc ratios to find the trajectory that reaches the target
   * without colliding with a wall while minimizing launch kinetic energy.
   * If no wall-clearing trajectory exists, falls back to the baseline optimal trajectory.
   */
  public static findLowestEnergyWallClearTrajectory(
    char: Character,
    arena: Arena,
    aimTargetX: number,
    aimTargetY: number,
    entities?: GameObject[],
    autoLock = false,
    lockedAimPos: Vector2D | null = null,
    aimLockDelta = 0
  ): TrajectoryCalculation | null {
    if (!char.throwModule || !char.throwModule.enabled) {
      return null;
    }

    // Step 1: Calculate baseline optimal (minimum energy) trajectory
    char.throwModule.hasUserSetArcRatio = false;
    const baseTraj = char.throwModule.calculateTrajectory(
      char,
      aimTargetX,
      aimTargetY,
      arena,
      entities ?? arena.entities,
      arena.visualAltitudeScale,
      autoLock,
      lockedAimPos,
      aimLockDelta
    );

    if (!baseTraj) {
      char.activeTrajectory = null;
      return null;
    }

    const isBaseClear = !baseTraj.isBlockedByWall && !baseTraj.points.some((p) => p.collidesWall);
    if (isBaseClear) {
      const optRatio = char.throwModule.savedArcRatio ?? 0.5;
      char.throwModule.hasUserSetArcRatio = true;
      char.throwModule.savedArcRatio = optRatio;
      char.hasUserSetArcRatio = true;
      char.savedArcRatio = optRatio;
      char.activeTrajectory = baseTraj;
      return baseTraj;
    }

    // Step 2: Optimal trajectory hits a wall. Search candidate arc ratios to find a wall-clearing arc with minimum kinetic energy
    let bestRatio: number | null = null;
    let bestEnergy = Infinity;
    let bestTraj: TrajectoryCalculation | null = null;

    // Coarse sampling across [0.0, 1.0] in 25 intervals (step 0.04)
    const samples = 25;
    for (let i = 0; i <= samples; i++) {
      const r = i / samples;
      char.throwModule.hasUserSetArcRatio = true;
      char.throwModule.savedArcRatio = r;
      const candTraj = char.throwModule.calculateTrajectory(
        char,
        aimTargetX,
        aimTargetY,
        arena,
        entities ?? arena.entities,
        arena.visualAltitudeScale,
        autoLock,
        lockedAimPos,
        aimLockDelta
      );

      if (candTraj && !candTraj.isBlockedByWall && !candTraj.points.some((p) => p.collidesWall)) {
        const vx = candTraj.launchVel?.vx ?? 0;
        const vy = candTraj.launchVel?.vy ?? 0;
        const vz = candTraj.launchVel?.vz ?? 0;
        const energy = vx * vx + vy * vy + vz * vz;
        if (energy < bestEnergy) {
          bestEnergy = energy;
          bestRatio = r;
          bestTraj = candTraj;
        }
      }
    }

    // Fine refinement step around best ratio if found
    if (bestRatio !== null) {
      const rCenter = bestRatio;
      for (let offset = -0.03; offset <= 0.03; offset += 0.01) {
        const r = Math.max(0.0, Math.min(1.0, rCenter + offset));
        char.throwModule.hasUserSetArcRatio = true;
        char.throwModule.savedArcRatio = r;
        const fineTraj = char.throwModule.calculateTrajectory(
          char,
          aimTargetX,
          aimTargetY,
          arena,
          entities ?? arena.entities,
          arena.visualAltitudeScale,
          autoLock,
          lockedAimPos,
          aimLockDelta
        );

        if (fineTraj && !fineTraj.isBlockedByWall && !fineTraj.points.some((p) => p.collidesWall)) {
          const vx = fineTraj.launchVel?.vx ?? 0;
          const vy = fineTraj.launchVel?.vy ?? 0;
          const vz = fineTraj.launchVel?.vz ?? 0;
          const energy = vx * vx + vy * vy + vz * vz;
          if (energy < bestEnergy) {
            bestEnergy = energy;
            bestRatio = r;
            bestTraj = fineTraj;
          }
        }
      }

      char.throwModule.hasUserSetArcRatio = true;
      char.throwModule.savedArcRatio = bestRatio;
      char.hasUserSetArcRatio = true;
      char.savedArcRatio = bestRatio;
      char.activeTrajectory = bestTraj;
      return bestTraj;
    }

    // Fallback if no wall-clearing arc exists (e.g., target enclosed or wall unreachable)
    char.throwModule.hasUserSetArcRatio = false;
    char.hasUserSetArcRatio = false;
    char.activeTrajectory = baseTraj;
    return baseTraj;
  }
}
