import { GameObject, type Vector2D } from "../../engine/GameObject.js";
import { ConsumableModule } from "../../engine/ConsumableModule.js";
import { RollModule } from "../../engine/RollModule.js";
import { ThrowModule } from "../ThrowModule.js";
import { BallisticTrajectorySolver } from "../BallisticTrajectorySolver.js";
import type { Character, AnticipatedModifier } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";
import type { VomitControlBlock } from "../../input/schema/ControlSchemaTypes.js";

/**
 * Isolated capability slice for Projectile Vomit ("Throw Up").
 * Supports staging & trajectory preview via BallisticTrajectorySolver,
 * deducts stored food energy from the character's EnergyPool, shrinks the character
 * immediately, spawns a physical consumable freebody glob on the ballistic arc,
 * and applies conservation-of-momentum recoil.
 */
export class VomitCapability {
  private static _globCounter = 1;

  public static canVomit(char: Character): boolean {
    const mod = char.vomitModule;
    return Boolean(mod && mod.enabled && char.energyPool && char.energyPool.enabled && !char.isDying);
  }

  public static computeProspectiveGlobStats(char: Character): {
    availableEnergy: number;
    requestedEnergy: number;
    expelledEnergy: number;
    globRadius: number;
    globMass: number;
    launchSpeed: number;
  } | null {
    const mod = char.vomitModule;
    const pool = char.energyPool;
    if (!mod || !mod.enabled || !pool || !pool.enabled) return null;

    const curEnergy = pool.getCurrentEnergy(char.properties);
    const minFloor = mod.getMinRemainingEnergyFloor(char.properties);
    const availableEnergy = Math.max(0, curEnergy - minFloor);
    const requestedEnergy = mod.getEnergyPerGlob(char.properties);
    const expelledEnergy = Math.max(50, Math.min(requestedEnergy, availableEnergy > 0 ? availableEnergy : requestedEnergy));

    const growthMod = char.energyGrowthModule;
    let globRadius = 0.22;
    let globMass = Math.max(0.15, Math.min(2.5, expelledEnergy / 2500));

    if (growthMod && growthMod.enabled) {
      const maxEnergy = Math.max(100, pool.getMaxEnergy(char.properties));
      const baseR = growthMod.baseValues["colliderRadius"] ?? 0.40;
      const baseM = growthMod.baseValues["mass"] ?? char.baseMass;
      const spanM = Math.max(0.1, growthMod.maxScaleMultiplier - growthMod.minScaleMultiplier);
      const deltaVolumeMult = (expelledEnergy / maxEnergy) * spanM;
      if (growthMod.scaleMass) {
        globMass = Math.max(0.1, baseM * deltaVolumeMult);
      }
      const rawR = baseR * Math.cbrt(Math.max(0.02, deltaVolumeMult));
      globRadius = Math.max(0.14, Math.min(0.45, rawR));
    } else {
      globRadius = Math.max(0.14, Math.min(0.42, 0.20 * Math.cbrt(expelledEnergy / 1000)));
    }

    const baseLaunchSpeed = mod.getLaunchSpeed(char.properties);
    const throwMaxSpeed =
      char.throwModule && char.throwModule.enabled
        ? char.throwModule.calculateMaxLaunchSpeed(char, { hasMass: true, mass: globMass } as any)
        : 0;
    const launchSpeed = Math.max(baseLaunchSpeed * 2.6, throwMaxSpeed, 28.0);
    return {
      availableEnergy,
      requestedEnergy,
      expelledEnergy,
      globRadius,
      globMass,
      launchSpeed,
    };
  }

  public static getAnticipatedModifier(char: Character): AnticipatedModifier | null {
    if (!char.isVomitAiming || !this.canVomit(char) || !char.activeTrajectory) {
      return null;
    }
    const stats = this.computeProspectiveGlobStats(char);
    if (!stats || stats.availableEnergy < 50) return null;

    return {
      id: "anticipated_vomit",
      abilityId: "vomit",
      name: "Throw Up",
      color: "#84cc16",
      amount: Math.round(stats.expelledEnergy),
      isBurst: true,
      isPositive: false,
      order: 950,
    };
  }

  public static updateTrajectoryPreview(
    char: Character,
    arena: Arena,
    aimTargetPos: Vector2D | null
  ): void {
    if (!char.isVomitAiming || !this.canVomit(char) || !aimTargetPos) {
      return;
    }

    const stats = this.computeProspectiveGlobStats(char);
    if (!stats) {
      char.activeTrajectory = null;
      return;
    }

    const preservedFacing = char.facingAngle;
    const aimDx = aimTargetPos.x - char.position.x;
    const aimDy = aimTargetPos.y - char.position.y;
    const distToAim = Math.hypot(aimDx, aimDy);

    const kbmVomitBlock = char.controlSchema?.keyboardMouse?.blocks?.find(
      (b) => b.type === "vomit" && b.enabled
    ) as VomitControlBlock | undefined;
    const gpVomitBlock = char.controlSchema?.gamepad?.blocks?.find(
      (b) => b.type === "vomit" && b.enabled
    ) as VomitControlBlock | undefined;
    const vomitBlock = kbmVomitBlock || gpVomitBlock;

    if (vomitBlock?.enableProximityCancel) {
      const cancelRadius = vomitBlock.cancelRadius ?? Math.max(1.0, (char.colliderRadius ?? 0.35) + stats.globRadius + 0.3);
      if (distToAim < cancelRadius) {
        char.activeTrajectory = null;
        (char as any).isVomitCancelZone = true;
        if (char.isSteeringCursor) char.facingAngle = preservedFacing;
        return;
      }
    }
    (char as any).isVomitCancelZone = false;

    if (distToAim > 0.05) {
      char.facingAngle = Math.atan2(aimDy, aimDx);
    }

    const dirX = Math.cos(char.facingAngle);
    const dirY = Math.sin(char.facingAngle);
    const spawnDist = char.colliderRadius + stats.globRadius + 0.06;
    let startX = char.position.x + dirX * spawnDist;
    let startY = char.position.y + dirY * spawnDist;
    const startZ = Math.max(0, (char.position.z || 0) + char.colliderRadius * 0.45);

    if (char.position.z < arena.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        stats.globRadius,
        arena,
        char.position.z,
        char.position.x,
        char.position.y
      );
      startX = clamped.x;
      startY = clamped.y;
    }

    const baseParams = {
      startX,
      startY,
      startZ,
      colliderRadius: stats.globRadius,
      maxSpeed: stats.launchSpeed,
      hasGravity: true,
      hasVerticalVelocity: true,
      visualShape: "circle" as const,
      hasUserSetArcRatio: char.hasUserSetArcRatio,
      savedArcRatio: char.savedArcRatio,
    };

    if ((char as any).isChargingVomit) {
      const clearRes = BallisticTrajectorySolver.findLowestEnergyWallClearForParams(
        { ...baseParams, hasUserSetArcRatio: false },
        aimTargetPos.x,
        aimTargetPos.y,
        arena,
        arena.visualAltitudeScale
      );
      const startRatio = clearRes.bestRatio ?? clearRes.savedArcRatio ?? 0.5;
      const flattestBlocked = Boolean(clearRes.trajectory?.flattestPoints?.some((pt) => pt.collidesWall));

      const now = performance.now();
      if (!(char as any).vomitChargeStartTime) {
        (char as any).vomitChargeStartTime = now;
      }
      const start = (char as any).vomitChargeStartTime as number;
      const holdMs = Math.max(0, now - start);
      const chargeProgress = Math.min(1.0, holdMs / 700);
      (char as any).vomitChargeProgress = chargeProgress;

      const targetRatio = flattestBlocked ? 1.0 : 0.0;
      const chargedRatio = startRatio + (targetRatio - startRatio) * chargeProgress;
      char.throwChargingTowards = flattestBlocked ? "steepest" : "flattest";
      char.hasUserSetArcRatio = true;
      char.savedArcRatio = chargedRatio;

      char.activeTrajectory = chargeProgress > 0.001
        ? BallisticTrajectorySolver.calculateTrajectoryFromParams(
            { ...baseParams, hasUserSetArcRatio: true, savedArcRatio: chargedRatio },
            aimTargetPos.x,
            aimTargetPos.y,
            arena,
            arena.visualAltitudeScale
          )
        : clearRes.trajectory;

      if (char.activeTrajectory) {
        (char.activeTrajectory as any).chargingTowards = char.throwChargingTowards;
        if (clearRes.trajectory) {
          (char.activeTrajectory as any).optimalTrajectoryPoints = clearRes.trajectory.points;
          (char.activeTrajectory as any).flattestBlocked = flattestBlocked;
        }
      }
    } else if ((char as any).isTriggerPullVomiting) {
      const clearRes = BallisticTrajectorySolver.findLowestEnergyWallClearForParams(
        { ...baseParams, hasUserSetArcRatio: false },
        aimTargetPos.x,
        aimTargetPos.y,
        arena,
        arena.visualAltitudeScale
      );
      const startRatio = clearRes.bestRatio ?? clearRes.savedArcRatio ?? 0.5;
      const flattestBlocked = Boolean(clearRes.trajectory?.flattestPoints?.some((pt) => pt.collidesWall));
      const targetRatio = flattestBlocked ? 1.0 : 0.0;
      const f = (char as any).triggerVomitPower ?? 0;
      const pulledRatio = startRatio + (targetRatio - startRatio) * f;

      char.throwChargingTowards = flattestBlocked ? "steepest" : "flattest";
      char.hasUserSetArcRatio = true;
      char.savedArcRatio = pulledRatio;

      char.activeTrajectory = f > 0.001
        ? BallisticTrajectorySolver.calculateTrajectoryFromParams(
            { ...baseParams, hasUserSetArcRatio: true, savedArcRatio: pulledRatio },
            aimTargetPos.x,
            aimTargetPos.y,
            arena,
            arena.visualAltitudeScale
          )
        : clearRes.trajectory;

      if (char.activeTrajectory) {
        (char.activeTrajectory as any).chargingTowards = char.throwChargingTowards;
        (char.activeTrajectory as any).isTriggerPull = true;
        if (clearRes.trajectory) {
          (char.activeTrajectory as any).optimalTrajectoryPoints = clearRes.trajectory.points;
          (char.activeTrajectory as any).flattestBlocked = flattestBlocked;
        }
      }
    } else if ((char as any).isHoldingVomitRelease || (char as any).isAimingVomitWallClear) {
      char.hasUserSetArcRatio = false;
      char.throwChargingTowards = undefined;
      const res = BallisticTrajectorySolver.findLowestEnergyWallClearForParams(
        { ...baseParams, hasUserSetArcRatio: false },
        aimTargetPos.x,
        aimTargetPos.y,
        arena,
        arena.visualAltitudeScale
      );
      char.activeTrajectory = res.trajectory;
      char.savedArcRatio = res.bestRatio ?? res.savedArcRatio;
    } else {
      char.throwChargingTowards = undefined;
      if (char.hasUserSetArcRatio) {
        char.activeTrajectory = BallisticTrajectorySolver.calculateTrajectoryFromParams(
          baseParams,
          aimTargetPos.x,
          aimTargetPos.y,
          arena,
          arena.visualAltitudeScale
        );
      } else {
        const res = BallisticTrajectorySolver.findLowestEnergyWallClearForParams(
          { ...baseParams, hasUserSetArcRatio: false },
          aimTargetPos.x,
          aimTargetPos.y,
          arena,
          arena.visualAltitudeScale
        );
        char.activeTrajectory = res.trajectory;
      }
    }

    if (char.activeTrajectory) {
      (char as any).lastVomitTrajectory = char.activeTrajectory;
    }

    if (char.isSteeringCursor) {
      char.facingAngle = preservedFacing;
    }
  }

  public static executeVomit(
    char: Character,
    objects?: GameObject[],
    arena?: Arena,
    aimAngleOverride?: number
  ): GameObject | null {
    const mod = char.vomitModule;
    if (!mod || !mod.enabled || !char.energyPool || !char.energyPool.enabled) {
      return null;
    }

    const now = performance.now();
    const cooldownMs = mod.getCooldownSeconds(char.properties) * 1000;
    if (now - mod.lastVomitTimestamp < cooldownMs) {
      return null;
    }

    const pool = char.energyPool;
    const curEnergy = pool.getCurrentEnergy(char.properties);
    const minFloor = mod.getMinRemainingEnergyFloor(char.properties);
    const availableEnergy = curEnergy - minFloor;
    const requestedEnergy = mod.getEnergyPerGlob(char.properties);

    if (availableEnergy < 50) {
      pool.notifyInsufficientEnergy({
        abilityId: "vomit",
        demandedAmount: requestedEnergy,
        isBurst: true,
        unit: "J",
        registry: char.properties,
      });
      return null;
    }

    const stats = this.computeProspectiveGlobStats(char);
    const expelledEnergy = Math.min(requestedEnergy, availableEnergy);
    mod.lastVomitTimestamp = now;

    // 1. Deduct stored food energy directly from EnergyPool
    const newEnergy = Math.max(0, curEnergy - expelledEnergy);
    pool.currentEnergyProp.set(newEnergy, char.properties);

    // Register visual burst modifier on EnergyPool HUD
    pool.recordInstantConsumption("vomit", expelledEnergy);

    const globRadius = stats?.globRadius ?? 0.22;
    const globMass = stats?.globMass ?? Math.max(0.15, Math.min(2.5, expelledEnergy / 2500));

    // 2. Determine launch direction and ballistic trajectory velocity
    let angle = aimAngleOverride ?? char.facingAngle ?? 0;
    if (aimAngleOverride === undefined && char.aimTarget) {
      const dx = char.aimTarget.x - char.position.x;
      const dy = char.aimTarget.y - char.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        angle = Math.atan2(dy, dx);
      }
    }
    char.facingAngle = angle;

    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const spawnDist = char.colliderRadius + globRadius + 0.06;
    let spawnX = char.position.x + dirX * spawnDist;
    let spawnY = char.position.y + dirY * spawnDist;
    let spawnZ = Math.max(0, (char.position.z || 0) + char.colliderRadius * 0.45);

    const launchSpeed = mod.getLaunchSpeed(char.properties);
    const defaultVz = mod.getLaunchVerticalSpeed(char.properties);

    let vx = dirX * launchSpeed + char.velocity.x * 0.35;
    let vy = dirY * launchSpeed + char.velocity.y * 0.35;
    let vz = defaultVz;

    // If staged with trajectory preview, use the exact solved ballistic launch velocity and origin!
    const stagedTraj = char.activeTrajectory || (char as any).lastVomitTrajectory;
    if (stagedTraj && stagedTraj.launchVel && stagedTraj.launchPos) {
      spawnX = stagedTraj.launchPos.x;
      spawnY = stagedTraj.launchPos.y;
      spawnZ = stagedTraj.launchPos.z;
      vx = stagedTraj.launchVel.vx;
      vy = stagedTraj.launchVel.vy;
      vz = stagedTraj.launchVel.vz;
    } else if (arena && char.aimTarget) {
      if (char.position.z < arena.wallHeight) {
        const clamped = ThrowModule.clampStartOutsideWalls(
          spawnX,
          spawnY,
          globRadius,
          arena,
          char.position.z,
          char.position.x,
          char.position.y
        );
        spawnX = clamped.x;
        spawnY = clamped.y;
      }
      const solved = BallisticTrajectorySolver.findLowestEnergyWallClearForParams(
        {
          startX: spawnX,
          startY: spawnY,
          startZ: spawnZ,
          colliderRadius: globRadius,
          maxSpeed: stats?.launchSpeed ?? launchSpeed,
          hasGravity: true,
          hasVerticalVelocity: true,
          visualShape: "circle",
          hasUserSetArcRatio: char.hasUserSetArcRatio,
          savedArcRatio: char.savedArcRatio,
        },
        char.aimTarget.x,
        char.aimTarget.y,
        arena,
        arena.visualAltitudeScale
      );
      if (solved.trajectory?.launchVel) {
        vx = solved.trajectory.launchVel.vx;
        vy = solved.trajectory.launchVel.vy;
        vz = solved.trajectory.launchVel.vz;
      }
    }

    // Clean up staged trajectory state after launch
    (char as any).lastVomitTrajectory = null;
    char.activeTrajectory = null;

    // 3. Create physical freebody glob with ConsumableModule so it can be re-eaten
    const globId = `vomit_glob_${Date.now()}_${VomitCapability._globCounter++}`;
    const glob = new GameObject({
      id: globId,
      name: `Vomit Glob (${Math.round(expelledEnergy)}J)`,
      position: { x: spawnX, y: spawnY, z: spawnZ },
      velocity: { x: vx, y: vy },
      verticalVelocity: vz,
      hasVerticalVelocity: true,
      mass: globMass,
      staticGroundFrictionMod: 0.42,
      dynamicGroundFrictionMod: 0.42,
      bounceMod: 0.25,
      rollModule: new RollModule({ rollResistance: 0.25, enabled: true }),
      hasGravity: true,
      hasVerticalPosition: true,
      colliderRadius: globRadius,
      color: mod.globColor || "#84cc16",
    });
    if (glob.bounceModule) {
      glob.bounceModule.verticalBounce = true;
    }

    glob.consumableModule = new ConsumableModule({
      tag: mod.consumableTag || "food",
      totalEnergyJoules: expelledEnergy,
      remainingEnergyJoules: expelledEnergy,
      consumeRateWatts: mod.consumeRateWatts || 1000,
      minScaleFloor: 0.4,
      minRadiusFloor: 0.12,
      enabled: true,
    });
    glob.consumableModule.initialColliderRadius = globRadius;

    // Prevent self-collision on the initial launch frames (matches ThrowModule flight handoff)
    glob.lastThrower = char;
    glob.originalThrower = char;
    glob.isInFlight = true;
    glob.wakeUp();
    (glob as any).thrownByCharacter = char;
    (glob as any).throwGraceTimer = 0.18;

    // Impart rolling angular velocity along the launch direction
    if (glob.hasFriction && glob.rollModule && glob.rollModule.enabled) {
      const R = globRadius > 0 ? globRadius : 0.22;
      glob.rollModule.angularVelocity.y = vx / R;
      glob.rollModule.angularVelocity.x = -vy / R;
    }

    // 4. Add glob to scene object arrays (ensure mutable worldObjects array receives the glob)
    const worldObjects = (arena as any)?.worldObjects as GameObject[] | undefined;
    if (Array.isArray(worldObjects) && !worldObjects.includes(glob)) {
      worldObjects.push(glob);
    }
    if (Array.isArray(objects) && !objects.includes(glob)) {
      objects.push(glob);
    }
    const arenaEntities = (arena as any)?.entities as GameObject[] | undefined;
    if (Array.isArray(arenaEntities) && !arenaEntities.includes(glob)) {
      arenaEntities.push(glob);
    }
    const winObjects = (typeof window !== "undefined" ? (window as any).gameObjects : undefined) as GameObject[] | undefined;
    if (Array.isArray(winObjects) && !winObjects.includes(glob)) {
      winObjects.push(glob);
    }
    char.onSpawnWorldObject?.(glob);

    // 5. Apply physical recoil (kickback) impulse to the character
    const recoilMult = mod.getRecoilMultiplier(char.properties);
    if (recoilMult > 0) {
      const charMass = Math.max(0.25, char.mass);
      const effectiveGlobMass = Math.max(globMass, (expelledEnergy / 1000) * 0.45);
      const actual3DSpeed = Math.hypot(vx, vy, vz);
      const effectiveJetSpeed = Math.max(actual3DSpeed, launchSpeed * 0.8);
      const recoilDeltaV = (effectiveGlobMass * effectiveJetSpeed * recoilMult) / charMass;

      // Dampen any forward velocity component opposing the kickback so recoil is always crisp
      const fwdDot = char.velocity.x * dirX + char.velocity.y * dirY;
      if (fwdDot > 0) {
        char.velocity.x -= dirX * fwdDot * 0.75;
        char.velocity.y -= dirY * fwdDot * 0.75;
      }

      char.velocity.x -= dirX * recoilDeltaV;
      char.velocity.y -= dirY * recoilDeltaV;

      if (char.isAboveGround) {
        const recoilRatio = (effectiveGlobMass * recoilMult) / charMass;
        const deltaVz = vz - char.verticalVelocity;
        char.verticalVelocity -= deltaVz * recoilRatio * 0.5;
      }

      if (char.walkingModule) {
        char.walkingModule.isBrakingPlanned = false;
        char.walkingModule.wasMovingLastTick = false;
      }
      (char as any)._lastThrowRecoilTime = performance.now();
    }

    return glob;
  }
}
