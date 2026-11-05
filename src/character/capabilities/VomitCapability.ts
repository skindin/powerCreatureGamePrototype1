import { GameObject } from "../../engine/GameObject.js";
import { ConsumableModule } from "../../engine/ConsumableModule.js";
import { RollModule } from "../../engine/RollModule.js";
import type { Character } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated capability slice for Projectile Vomit.
 * Deducts stored food energy from the character's EnergyPool, shrinks the character
 * immediately, spawns a physical consumable freebody glob on a ballistic arc,
 * and applies conservation-of-momentum recoil.
 */
export class VomitCapability {
  private static _globCounter = 1;

  public static canVomit(char: Character): boolean {
    const mod = char.vomitModule;
    return Boolean(mod && mod.enabled && char.energyPool && char.energyPool.enabled && !char.isDying);
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

    const expelledEnergy = Math.min(requestedEnergy, availableEnergy);
    mod.lastVomitTimestamp = now;

    // 1. Deduct stored food energy directly from EnergyPool
    const newEnergy = Math.max(0, curEnergy - expelledEnergy);
    pool.currentEnergyProp.set(newEnergy, char.properties);

    // Register visual burst modifier on EnergyPool HUD
    if (typeof (pool as any).recordInstantConsumption === "function") {
      (pool as any).recordInstantConsumption("vomit", "Vomit", expelledEnergy, "#84cc16");
    }

    // 2. Compute physical glob radius & mass from the character's lost volume/mass (or fallback formula)
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

    // 4. Determine launch direction
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
    const spawnX = char.position.x + dirX * spawnDist;
    const spawnY = char.position.y + dirY * spawnDist;
    const spawnZ = Math.max(0, (char.position.z || 0) + char.colliderRadius * 0.45);

    const launchSpeed = mod.getLaunchSpeed(char.properties);
    const launchVz = mod.getLaunchVerticalSpeed(char.properties);

    // 5. Create physical freebody glob with ConsumableModule so it can be re-eaten
    const globId = `vomit_glob_${Date.now()}_${VomitCapability._globCounter++}`;
    const glob = new GameObject({
      id: globId,
      name: `Vomit Glob (${Math.round(expelledEnergy)}J)`,
      position: { x: spawnX, y: spawnY, z: spawnZ },
      velocity: {
        x: dirX * launchSpeed + char.velocity.x * 0.35,
        y: dirY * launchSpeed + char.velocity.y * 0.35,
      },
      verticalVelocity: launchVz,
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

    // Prevent self-collision on the initial launch frames
    (glob as any).thrownByCharacter = char;
    (glob as any).throwGraceTimer = 0.18;

    // 6. Add glob to scene object arrays
    const targetList =
      objects ??
      ((arena as any)?.entities as GameObject[] | undefined) ??
      ((typeof window !== "undefined" ? (window as any).gameObjects : undefined) as GameObject[] | undefined);

    if (Array.isArray(targetList) && !targetList.includes(glob)) {
      targetList.push(glob);
    }
    char.onSpawnWorldObject?.(glob);

    // 7. Apply physical recoil impulse to the character
    const recoilMult = mod.getRecoilMultiplier(char.properties);
    if (recoilMult > 0) {
      const charMass = Math.max(0.25, char.mass);
      const recoilDeltaV = (globMass * launchSpeed * recoilMult) / charMass;
      char.velocity.x -= dirX * recoilDeltaV;
      char.velocity.y -= dirY * recoilDeltaV;
    }

    return glob;
  }
}
