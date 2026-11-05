import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { ThrowModule, type TrajectoryCalculation, type TrajectoryPoint } from "./ThrowModule.js";

export interface BallisticProjectileParams {
  startX: number;
  startY: number;
  startZ: number;
  colliderRadius: number;
  maxSpeed: number;
  hasGravity?: boolean;
  hasVerticalVelocity?: boolean;
  visualShape?: "circle" | "box";
  hasUserSetArcRatio?: boolean;
  savedArcRatio?: number;
}

/**
 * Shared Ballistic Trajectory Solver separated from ThrowModule so both ThrowCapability
 * (throwing held objects) and VomitCapability (staging & firing Throw Up globs) can compute
 * identical parabolic trajectories, wall clearance checks, and lowest-energy arcs.
 */
export class BallisticTrajectorySolver {
  /**
   * Computes launch velocity (vx, vy, vz) and flight time to hit (targetX, targetY)
   * given projectile parameters and arena geometry.
   */
  public static computeLaunchVelocity(
    params: BallisticProjectileParams,
    targetX: number,
    targetY: number,
    arena: Arena,
    hoverScale?: number,
    lockedTargetPos?: { x: number; y: number } | null
  ): {
    vx: number;
    vy: number;
    vz: number;
    totalTime: number;
    finalTargetX: number;
    finalTargetY: number;
    targetSurfaceHeight: number;
    tMin: number;
    tMax: number;
    tOpt: number;
    resolvedArcRatio: number;
  } | null {
    const {
      startX,
      startY,
      startZ,
      colliderRadius,
      maxSpeed,
      hasGravity = true,
      hasVerticalVelocity = true,
      hasUserSetArcRatio = false,
      savedArcRatio = 0.0,
    } = params;

    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);
    const effectiveTargetX = lockedTargetPos ? lockedTargetPos.x : targetX;
    const effectiveTargetY = lockedTargetPos ? lockedTargetPos.y : targetY;
    const radius = colliderRadius > 0 ? colliderRadius : 0.25;

    let finalTargetX = effectiveTargetX;
    let finalTargetY = effectiveTargetY;
    let targetSurfaceHeight = 0;

    const wallOverlapping = ThrowModule.findWallOverlappingCollider(
      effectiveTargetX,
      effectiveTargetY,
      radius,
      arena,
      scale
    );

    if (wallOverlapping) {
      targetSurfaceHeight = wallOverlapping.targetSurfaceHeight;
      const desiredPhysX = wallOverlapping.physX;
      const desiredPhysY = wallOverlapping.physY;
      const wall = wallOverlapping.wall;

      const supWall = arena.getSupportingWall(desiredPhysX, desiredPhysY, radius) || wall;
      if (ThrowModule.testWallIntersection(desiredPhysX, desiredPhysY, radius, supWall)) {
        finalTargetX = desiredPhysX;
        finalTargetY = desiredPhysY;
      } else {
        const closestX = Math.max(supWall.x, Math.min(supWall.x + supWall.width, desiredPhysX));
        const closestY = Math.max(supWall.y, Math.min(supWall.y + supWall.height, desiredPhysY));
        const dx = desiredPhysX - closestX;
        const dy = desiredPhysY - closestY;
        const d = Math.hypot(dx, dy);
        if (d > 0.0001) {
          finalTargetX = closestX + (dx / d) * (radius - 0.02);
          finalTargetY = closestY + (dy / d) * (radius - 0.02);
        } else {
          finalTargetX = desiredPhysX;
          finalTargetY = desiredPhysY;
        }
      }
    }

    let dx = finalTargetX - startX;
    let dy = finalTargetY - startY;
    let dist = Math.hypot(dx, dy);
    if (dist < 0.1) return null;

    const launchSpeed = Math.max(1.0, maxSpeed);
    const g = arena.gravity;

    if (!hasGravity || !hasVerticalVelocity) {
      const totalTime = Math.max(0.14, dist / launchSpeed);
      const vx = (dx / dist) * (dist / totalTime);
      const vy = (dy / dist) * (dist / totalTime);
      return {
        vx,
        vy,
        vz: 0,
        totalTime,
        finalTargetX,
        finalTargetY,
        targetSurfaceHeight: startZ,
        tMin: totalTime,
        tMax: totalTime,
        tOpt: totalTime,
        resolvedArcRatio: savedArcRatio,
      };
    }

    const dirX = dist > 0.0001 ? dx / dist : 0;
    const dirY = dist > 0.0001 ? dy / dist : 0;

    // Intermediate wall check for ground targets
    if (targetSurfaceHeight === 0) {
      let nearestBlockingWallDist = Infinity;
      for (const wall of arena.walls) {
        const rayHit = ThrowModule.getRayWallEnterDistance(startX, startY, dirX, dirY, wall);
        if (rayHit && rayHit.enterDist < dist && rayHit.enterDist > 0.1) {
          const maxApexHeight = (launchSpeed * launchSpeed) / (2 * g);
          if (startZ + maxApexHeight < wall.wallHeight + 0.15) {
            if (rayHit.enterDist < nearestBlockingWallDist) {
              nearestBlockingWallDist = rayHit.enterDist;
            }
          }
        }
      }

      if (nearestBlockingWallDist < Infinity) {
        const safeDist = Math.max(0.2, nearestBlockingWallDist - radius - 0.05);
        if (dist > safeDist) {
          dist = safeDist;
          finalTargetX = startX + dirX * dist;
          finalTargetY = startY + dirY * dist;
        }
      }
    }

    // Reachable distance clamping
    let deltaZ = targetSurfaceHeight - startZ;
    const apexMax = (launchSpeed * launchSpeed) / (2 * g) - 0.02;

    if (targetSurfaceHeight > 0) {
      const canReachHeight = deltaZ <= apexMax;
      const reachRadicand = canReachHeight ? Math.max(0, launchSpeed * launchSpeed - 2 * g * deltaZ) : 0;
      const maxReachWall = canReachHeight ? (launchSpeed / g) * Math.sqrt(reachRadicand) : 0;

      if (!canReachHeight || dist > maxReachWall) {
        if (canReachHeight && maxReachWall > 0.2) {
          dist = maxReachWall;
          finalTargetX = startX + dirX * dist;
          finalTargetY = startY + dirY * dist;
        } else {
          targetSurfaceHeight = 0;
          deltaZ = targetSurfaceHeight - startZ;
          const groundRadicand = Math.max(0, launchSpeed * launchSpeed - 2 * g * deltaZ);
          const maxReachGround = (launchSpeed / g) * Math.sqrt(groundRadicand);
          dist = Math.min(dist, maxReachGround);
          finalTargetX = startX + dirX * dist;
          finalTargetY = startY + dirY * dist;
        }
      }
    } else {
      const reachRadicand = Math.max(0, launchSpeed * launchSpeed - 2 * g * deltaZ);
      const maxReach = (launchSpeed / g) * Math.sqrt(reachRadicand);
      if (dist > maxReach) {
        dist = maxReach;
        finalTargetX = startX + dirX * dist;
        finalTargetY = startY + dirY * dist;
      }
    }

    dx = finalTargetX - startX;
    dy = finalTargetY - startY;
    dist = Math.hypot(dx, dy);
    deltaZ = targetSurfaceHeight - startZ;

    const dist3D = Math.sqrt(dist * dist + deltaZ * deltaZ);
    const tOpt = Math.sqrt((2 * dist3D) / g);

    const aCoeff = 0.25 * g * g;
    const bCoeffMax = -(launchSpeed * launchSpeed - g * deltaZ);
    const cCoeff = dist * dist + deltaZ * deltaZ;

    const discMax = Math.max(0, bCoeffMax * bCoeffMax - 4 * aCoeff * cCoeff);
    const uLow = (-bCoeffMax - Math.sqrt(discMax)) / (2 * aCoeff);
    const tFlat = uLow > 0 ? Math.sqrt(uLow) : dist / launchSpeed;

    const uHigh = (-bCoeffMax + Math.sqrt(discMax)) / (2 * aCoeff);
    const tHigh = uHigh > 0 ? Math.sqrt(uHigh) : tFlat;

    const tMin = Math.max(0.02, tFlat);
    const tMax = Math.max(tMin, tHigh);

    let resolvedArcRatio = savedArcRatio;
    let totalTime = 1.0;
    if (!hasUserSetArcRatio) {
      resolvedArcRatio =
        tMax - tMin > 0.001 ? Math.max(0.0, Math.min(1.0, (tOpt - tMin) / (tMax - tMin))) : 0.0;
      totalTime = Math.max(tMin, Math.min(tMax, tOpt));
    } else {
      totalTime = tMin + savedArcRatio * (tMax - tMin);
    }

    if (totalTime <= 0) {
      totalTime = Math.max(0.02, dist / launchSpeed);
    }
    if (deltaZ > 0) {
      totalTime = Math.max(totalTime, Math.sqrt((2 * deltaZ) / g));
    }
    totalTime = Math.max(0.02, totalTime);

    const dtFixed = 1 / 60;
    let vz = (deltaZ + 0.5 * g * totalTime * (totalTime + dtFixed)) / totalTime;
    const horizontalSpeed = dist / totalTime;
    let vx = dirX * horizontalSpeed;
    let vy = dirY * horizontalSpeed;

    const eulerMargin = 0.5 * g * dtFixed + 0.05;
    const computedSpeed = Math.hypot(vx, vy, vz);
    if (computedSpeed > launchSpeed + eulerMargin && computedSpeed > 0.001) {
      const scaleFactor = (launchSpeed + eulerMargin) / computedSpeed;
      vx *= scaleFactor;
      vy *= scaleFactor;
      vz *= scaleFactor;
    }

    return {
      vx,
      vy,
      vz,
      totalTime,
      finalTargetX,
      finalTargetY,
      targetSurfaceHeight,
      tMin,
      tMax,
      tOpt,
      resolvedArcRatio,
    };
  }

  /**
   * Simulates the full 3D trajectory points and wall intersections for a projectile.
   */
  public static calculateTrajectoryFromParams(
    params: BallisticProjectileParams,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena,
    hoverScale?: number,
    lockedTargetPos?: { x: number; y: number } | null
  ): TrajectoryCalculation | null {
    const launch = this.computeLaunchVelocity(
      params,
      aimTargetX,
      aimTargetY,
      arena,
      hoverScale,
      lockedTargetPos
    );
    if (!launch) return null;

    const { startX, startY, startZ, colliderRadius, visualShape = "circle" } = params;
    const canFlyVertically = (params.hasGravity ?? true) && (params.hasVerticalVelocity ?? true);
    const { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, tMin, tMax } = launch;

    const resolvedSurfaceHeight = targetSurfaceHeight;
    const deltaZ = targetSurfaceHeight - startZ;
    const g = arena.gravity;
    const dx = finalTargetX - startX;
    const dy = finalTargetY - startY;
    const dist = Math.hypot(dx, dy);
    const dirX = dist > 0.0001 ? dx / dist : 0;
    const dirY = dist > 0.0001 ? dy / dist : 0;

    const steps = 90;
    const dtStep = totalTime / steps;
    const points: TrajectoryPoint[] = [];

    let isBlocked = false;
    let isLandingOnWallTop = resolvedSurfaceHeight > 0;
    let blockedWallId: string | undefined;
    let peakHeight = startZ;

    for (let step = 0; step <= steps; step++) {
      const t = step * dtStep;
      const currentX = step === steps ? finalTargetX : startX + vx * t;
      const currentY = step === steps ? finalTargetY : startY + vy * t;
      const dtFixed = 1 / 60;
      const calculatedZ = canFlyVertically
        ? startZ + (vz - 0.5 * arena.gravity * dtFixed) * t - 0.5 * arena.gravity * t * t
        : startZ;
      const currentZ = canFlyVertically
        ? step === steps
          ? resolvedSurfaceHeight
          : step > steps - 3
          ? Math.max(resolvedSurfaceHeight, calculatedZ)
          : Math.max(0, calculatedZ)
        : startZ;
      const currentVz = canFlyVertically
        ? vz - 0.5 * arena.gravity * dtFixed - arena.gravity * t
        : 0;

      if (currentZ > peakHeight) {
        peakHeight = currentZ;
      }

      const couldClearWall = currentZ > arena.wallHeight;
      let isOverWall = false;
      let collidesWall = false;

      for (const wall of arena.walls) {
        if (ThrowModule.testWallIntersection(currentX, currentY, colliderRadius, wall)) {
          isOverWall = true;
          if (currentZ <= wall.wallHeight + 0.001) {
            const wasAbove = points.length > 0 && points[points.length - 1].z >= wall.wallHeight - 0.05;
            if (wasAbove && currentVz <= 0) {
              const isTargetedWall =
                targetSurfaceHeight > 0 &&
                ThrowModule.testWallIntersection(finalTargetX, finalTargetY, colliderRadius + 0.05, wall);

              if (isTargetedWall || (targetSurfaceHeight > 0 && step >= steps - 3)) {
                isLandingOnWallTop = true;
                break;
              } else if (targetSurfaceHeight === 0) {
                isLandingOnWallTop = true;
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            } else if (currentZ < wall.wallHeight - 0.05) {
              const isGroundTouchdown =
                targetSurfaceHeight === 0 && step >= steps - 2 && currentZ <= 0.08;
              if (step > 1 && !isGroundTouchdown) {
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
        break;
      }
    }

    const simulateGhostArc = (simFlightTime: number): TrajectoryPoint[] => {
      const gTime = Math.max(0.02, simFlightTime);
      const dtFixed = 1 / 60;
      const gVz = (deltaZ + 0.5 * g * gTime * (gTime + dtFixed)) / gTime;
      const gHSpd = dist / gTime;
      const gVx = dirX * gHSpd;
      const gVy = dirY * gHSpd;

      const gSteps = 60;
      const gDt = gTime / gSteps;
      const gPts: TrajectoryPoint[] = [];

      for (let s = 0; s <= gSteps; s++) {
        const t = s * gDt;
        const curX = s === gSteps ? finalTargetX : startX + gVx * t;
        const curY = s === gSteps ? finalTargetY : startY + gVy * t;
        const calcZ = canFlyVertically
          ? startZ + (gVz - 0.5 * arena.gravity * dtFixed) * t - 0.5 * arena.gravity * t * t
          : startZ;
        const curZ = canFlyVertically
          ? s === gSteps
            ? resolvedSurfaceHeight
            : s > gSteps - 3
            ? Math.max(resolvedSurfaceHeight, calcZ)
            : Math.max(0, calcZ)
          : startZ;

        let isOver = false;
        let collides = false;

        for (const wall of arena.walls) {
          if (ThrowModule.testWallIntersection(curX, curY, colliderRadius, wall)) {
            isOver = true;
            if (curZ <= wall.wallHeight + 0.001 && s > 1) {
              collides = true;
              break;
            }
          }
        }

        gPts.push({
          x: curX,
          y: curY,
          z: curZ,
          t,
          couldClearWall: curZ > arena.wallHeight,
          isOverWall: isOver,
          collidesWall: collides,
        });

        if (collides) break;
      }
      return gPts;
    };

    const hasArcRange = tMax !== undefined && tMin !== undefined && tMax - tMin > 0.05;
    const flattestPoints = hasArcRange && tMin !== undefined ? simulateGhostArc(tMin) : undefined;
    const steepestPoints = hasArcRange && tMax !== undefined ? simulateGhostArc(tMax) : undefined;

    const lastPoint = points[points.length - 1];
    return {
      points,
      flattestPoints,
      steepestPoints,
      landPoint: {
        x: isBlocked ? lastPoint.x : finalTargetX,
        y: isBlocked ? lastPoint.y : finalTargetY,
        z: isBlocked ? lastPoint.z : targetSurfaceHeight,
      },
      isBlockedByWall: isBlocked,
      isLandingOnWallTop: isBlocked ? isLandingOnWallTop : targetSurfaceHeight > 0,
      blockedAtWallId: blockedWallId,
      targetObject: null,
      targetSurfaceHeight,
      isAutoLocked: false,
      peakHeight,
      flightTime: totalTime,
      colliderRadius,
      visualShape,
      launchVel: { vx, vy, vz },
      launchPos: { x: startX, y: startY, z: startZ },
      lockedTargetPos: lockedTargetPos ? { ...lockedTargetPos } : null,
      maxSpeed: params.maxSpeed,
      tMin: launch.tMin,
      tMax: launch.tMax,
      tOpt: launch.tOpt,
      optimalRatio: launch.tMax - launch.tMin > 0.001 ? Math.max(0.0, Math.min(1.0, (launch.tOpt - launch.tMin) / (launch.tMax - launch.tMin))) : 0.0,
      savedArcRatio: params.savedArcRatio,
      hasUserSetArcRatio: params.hasUserSetArcRatio,
    } as any;
  }

  /**
   * Finds the lowest-energy trajectory that clears any intermediate walls for arbitrary projectile parameters.
   */
  public static findLowestEnergyWallClearForParams(
    baseParams: BallisticProjectileParams,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena,
    hoverScale?: number,
    lockedTargetPos?: { x: number; y: number } | null
  ): { trajectory: TrajectoryCalculation | null; bestRatio: number; savedArcRatio: number } {
    const initialParams: BallisticProjectileParams = {
      ...baseParams,
      hasUserSetArcRatio: false,
    };
    const baseLaunch = this.computeLaunchVelocity(
      initialParams,
      aimTargetX,
      aimTargetY,
      arena,
      hoverScale,
      lockedTargetPos
    );
    const baseTraj = this.calculateTrajectoryFromParams(
      initialParams,
      aimTargetX,
      aimTargetY,
      arena,
      hoverScale,
      lockedTargetPos
    );

    if (!baseTraj) {
      return { trajectory: null, bestRatio: 0.5, savedArcRatio: 0.5 };
    }

    const optimalRatio = baseLaunch ? baseLaunch.resolvedArcRatio : 0.5;
    const isBaseClear = !baseTraj.isBlockedByWall && !baseTraj.points.some((p) => p.collidesWall);
    if (isBaseClear) {
      return { trajectory: baseTraj, bestRatio: optimalRatio, savedArcRatio: optimalRatio };
    }

    let bestRatio: number | null = null;
    let bestEnergy = Infinity;
    let bestTraj: TrajectoryCalculation | null = null;

    const samples = 25;
    for (let i = 0; i <= samples; i++) {
      const r = i / samples;
      const candTraj = this.calculateTrajectoryFromParams(
        { ...baseParams, hasUserSetArcRatio: true, savedArcRatio: r },
        aimTargetX,
        aimTargetY,
        arena,
        hoverScale,
        lockedTargetPos
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

    if (bestRatio !== null) {
      const rCenter = bestRatio;
      for (let offset = -0.03; offset <= 0.03; offset += 0.01) {
        const r = Math.max(0.0, Math.min(1.0, rCenter + offset));
        const fineTraj = this.calculateTrajectoryFromParams(
          { ...baseParams, hasUserSetArcRatio: true, savedArcRatio: r },
          aimTargetX,
          aimTargetY,
          arena,
          hoverScale,
          lockedTargetPos
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
      return { trajectory: bestTraj, bestRatio, savedArcRatio: bestRatio };
    }

    return { trajectory: baseTraj, bestRatio: optimalRatio, savedArcRatio: optimalRatio };
  }

  /**
   * Finds the lowest-energy wall-clearing trajectory for a character's ThrowModule (held object).
   */
  public static findLowestEnergyWallClearForCharacterThrow(
    char: Character,
    arena: Arena,
    aimTargetX: number,
    aimTargetY: number,
    entities?: GameObject[],
    autoLock = false,
    lockedAimPos: { x: number; y: number } | null = null,
    aimLockDelta = 0
  ): TrajectoryCalculation | null {
    if (!char.throwModule || !char.throwModule.enabled) {
      return null;
    }
    const preservedFacing = char.facingAngle;

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
      if (char.isSteeringCursor) char.facingAngle = preservedFacing;
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
      if (char.isSteeringCursor) char.facingAngle = preservedFacing;
      return baseTraj;
    }

    let bestRatio: number | null = null;
    let bestEnergy = Infinity;
    let bestTraj: TrajectoryCalculation | null = null;

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
      if (char.isSteeringCursor) char.facingAngle = preservedFacing;
      return bestTraj;
    }

    char.throwModule.hasUserSetArcRatio = false;
    char.hasUserSetArcRatio = false;
    char.activeTrajectory = baseTraj;
    if (char.isSteeringCursor) char.facingAngle = preservedFacing;
    return baseTraj;
  }
}
