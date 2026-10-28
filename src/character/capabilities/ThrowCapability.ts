import type { Character, AnticipatedModifier } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";
import type { GameObject, Vector2D } from "../../engine/GameObject.js";

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
}
