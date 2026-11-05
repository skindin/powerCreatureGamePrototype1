import type { Character } from "../Character.js";
import { EnergyGrowthModule } from "../EnergyGrowthModule.js";

/**
 * Isolated capability slice for EnergyGrowthModule (Scale With Energy).
 * Evaluates current stored energy in EnergyPool each tick to determine the
 * current volume/mass scale multiplier M in [minScaleMultiplier .. maxScaleMultiplier],
 * where M = 1.0 corresponds to the 1.0x base values configured on each module card.
 */
export class EnergyGrowthCapability {
  public static tick(char: Character): void {
    const mod = char.energyGrowthModule;
    if (!mod || !mod.enabled) {
      if (char.visualSpriteRadius !== undefined) {
        delete char.visualSpriteRadius;
      }
      return;
    }

    if (!mod.hasInitializedStartingEnergy && char.energyPool && char.energyPool.enabled) {
      mod.applyStartingScaleToEnergyPool(char);
    }

    const pool = char.energyPool;
    const curEnergy = pool && pool.enabled ? Math.max(0, pool.getCurrentEnergy(char.properties)) : 0;
    const maxEnergy = pool && pool.enabled ? Math.max(1, pool.getMaxEnergy(char.properties)) : 10000;
    const tEnergy = Math.max(0, Math.min(1, curEnergy / maxEnergy));

    mod.currentEnergyFraction = tEnergy;

    // 1. Master Volume/Mass Scale Multiplier M (linearly interpolated between min and max)
    const minM = Math.max(0.05, mod.minScaleMultiplier);
    const maxM = Math.max(minM + 0.01, mod.maxScaleMultiplier);
    const volumeMult = minM + tEnergy * (maxM - minM);
    const radiusMult = Math.cbrt(volumeMult);
    const crossSectionMult = Math.pow(volumeMult, 2 / 3);

    mod.currentVolumeMultiplier = volumeMult;
    mod.currentRadiusMultiplier = radiusMult;
    mod.currentCrossSectionMultiplier = crossSectionMult;

    // Helper to resolve 1.0x base value without corrupting unscaled properties when newly connected
    const resolveBaseValue = (
      key: string,
      currentLiveVal: number,
      minFallback = 0.05
    ): number => {
      if (mod.baseValues[key] === undefined || !Number.isFinite(mod.baseValues[key])) {
        // Property was not yet scaled: capture its current unscaled 1.0x value directly
        mod.baseValues[key] = Math.max(minFallback, currentLiveVal);
      } else if (
        mod.lastAppliedValues[key] !== undefined &&
        Math.abs(currentLiveVal - mod.lastAppliedValues[key]) > 0.01
      ) {
        // User edited this property directly in the inspector: treat the user's entered number as the new 1.0x base value
        mod.baseValues[key] = Math.max(minFallback, currentLiveVal);
      }
      return mod.baseValues[key];
    };

    // 2. Apply Mass Scaling (linear with volume multiplier M)
    const baseMass = resolveBaseValue("mass", char.baseMass, 0.1);
    if (mod.scaleMass) {
      const targetMass = Math.max(0.1, baseMass * volumeMult);
      if (Math.abs(char.baseMass - targetMass) > 0.002) {
        char.mass = targetMass;
      }
      mod.lastAppliedValues["mass"] = targetMass;
    }

    // 3. Apply Collider & Sprite Scaling (cube-root of volume multiplier M)
    const baseRadius = resolveBaseValue("colliderRadius", char.colliderRadius, 0.08);
    const scaledRadius = Math.max(0.08, baseRadius * radiusMult);
    mod.currentComputedSpriteRadius = scaledRadius;

    if (mod.scaleCollider) {
      if (Math.abs(char.colliderRadius - scaledRadius) > 0.001) {
        char.colliderRadius = scaledRadius;
        if (char.colliderModule) {
          char.colliderModule.radius = scaledRadius;
        }
      }
      mod.lastAppliedValues["colliderRadius"] = scaledRadius;

      // Automatic Reach Margin Compensation (unless pickup.pickupReach is manually in scaledProperties)
      if (mod.autoScaleReachWithCollider && char.pickupModule) {
        const hasManualReachRule = mod.scaledProperties.some(
          (r) => r.enabled && (r.propertyKey === "pickup.pickupReach" || r.key === "pickup.pickupReach")
        );
        if (!hasManualReachRule) {
          const curReach = char.pickupModule.pickupReachProp.get(char.properties);
          const radiusDelta = scaledRadius - baseRadius;
          if (mod.baseValues["pickupReach"] === undefined) {
            mod.baseValues["pickupReach"] = Math.max(0.15, curReach);
          } else if (
            mod.lastAppliedValues["pickupReach"] !== undefined &&
            Math.abs(curReach - mod.lastAppliedValues["pickupReach"]) > 0.01
          ) {
            mod.baseValues["pickupReach"] = Math.max(0.15, curReach);
          }
          const targetReach = Math.max(0.15, mod.baseValues["pickupReach"] + radiusDelta);
          if (Math.abs(curReach - targetReach) > 0.002) {
            char.pickupModule.pickupReachProp.set(targetReach, char.properties);
          }
          mod.lastAppliedValues["pickupReach"] = targetReach;
        }
      }
    }

    if (mod.scaleSprite) {
      char.visualSpriteRadius = scaledRadius;
    } else {
      delete char.visualSpriteRadius;
    }

    // 4. Apply User-Configured Connected Module Properties
    if (mod.scaledProperties.length > 0) {
      const available = EnergyGrowthModule.getAvailableProperties(char);
      const map = new Map(available.map((item) => [item.key, item]));

      for (const rule of mod.scaledProperties) {
        if (!rule.enabled) continue;
        const propKey = rule.propertyKey || rule.key || "";
        const target = map.get(propKey);
        if (!target) continue;

        const propMult = mod.evaluatePropertyMultiplier(
          volumeMult,
          rule.curveMode || rule.curve || "cross_section",
          rule.rateMultiplier ?? 1.0,
          rule.customExponent ?? 1.0
        );
        const curLiveVal = target.getCurrentValue(char);
        const baseVal = resolveBaseValue(propKey, curLiveVal, 0.01);
        const targetVal = Math.max(0.01, baseVal * propMult);

        if (Math.abs(curLiveVal - targetVal) > 0.002) {
          target.applyValue(char, targetVal);
        }
        mod.lastAppliedValues[propKey] = targetVal;
      }
    }
  }
}
