import { GameObject, type Vector2D } from "../../engine/GameObject.js";
import { ConsumableModule } from "../../engine/ConsumableModule.js";
import { RollModule } from "../../engine/RollModule.js";
import { ThrowModule } from "../ThrowModule.js";
import { BallisticTrajectorySolver } from "../BallisticTrajectorySolver.js";
import type { Character, AnticipatedModifier } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";

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

    const launchSpeed = mod.getLaunchSpeed(char.properties);
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
    if (!char.isVomitAiming || !this.canVomit(char)) {
      return null;
    }
    const stats = this.computeProspectiveGlobStats(char);
    if (!stats) return null;

    const isInsufficient = stats.availableEnergy < 50;
    return {
      id: "vomit",
      name: isInsufficient ? "Throw Up (Low Energy)" : "Throw Up",
      amount: stats.requestedEnergy,
      isBurst: true,
      unit: "J",
      color: isInsufficient ? "#ef4444" : "#84cc16",
      insufficient: isInsufficient,
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

    const res = BallisticTrajectorySolver.findLowestEnergyWallClearForParams(
      {
        startX,
        startY,
        startZ,
        colliderRadius: stats.globRadius,
        maxSpeed: stats.launchSpeed,
        hasGravity: true,
        hasVerticalVelocity: true,
        visualShape: "circle",
        hasUserSetArcRatio: char.hasUserSetArcRatio,
        savedArcRatio: char.savedArcRatio,
      },
      aimTargetPos.x,
      aimTargetPos.y,
      arena,
      arena.visualAltitudeScale
    );

    char.activeTrajectory = res.trajectory;

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
    if (typeof (pool as any).recordInstantConsumption === "function") {
      (pool as any).recordInstantConsumption("vomit", "Throw Up", expelledEnergy, "#84cc16");
    }

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
    const stagedTraj = char.activeTrajectory;
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
          maxSpeed: launchSpeed,
          hasGravity: true,
          hasVerticalVelocity: true,
          visualShape: "circle",
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
