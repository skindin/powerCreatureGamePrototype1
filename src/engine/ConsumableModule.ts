import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";
import type { GameObject } from "./GameObject.js";
import type { Character } from "../character/Character.js";
import type { Arena } from "./Arena.js";

export interface ConsumableModuleOptions {
  tag?: string;
  totalEnergyJoules?: number;
  remainingEnergyJoules?: number;
  consumeRateWatts?: number;
  eatRateWatts?: number; // legacy alias
  healRate?: number;
  minScaleFloor?: number;
  minRadiusFloor?: number;
  enabled?: boolean;
  unlimited?: boolean;
}

/**
 * ConsumableModule grants consumable properties to any physical freebody object.
 * Objects carry a tag (e.g. "food", "potion", "battery").
 * Characters with a matching tag in their ConsumeModule can consume the object,
 * transferring Joules into the character's EnergyPool and shrinking the object
 * until completely consumed, at which point it is removed from the world.
 */
export class ConsumableModule {
  public id = "consumable";
  public name = "Consumable";
  public enabled = true;

  /** Category/type tag of this consumable (e.g. "food", "potion", "battery") */
  public tag: string = "food";

  /** Total initial energy capacity stored within this consumable (Joules) */
  public totalEnergyJoulesProp: DynamicProperty;

  /** Current remaining energy available to be consumed (Joules) */
  public remainingEnergyJoulesProp: DynamicProperty;

  /** Rate at which nutrition is absorbed while being consumed (Watts = Joules / sec) */
  public consumeRateWattsProp: DynamicProperty;

  /** Optional bonus healing rate while consuming (HP / sec) */
  public healRateProp: DynamicProperty;

  /** Minimum visual scale floor (e.g. 0.40 = 40% of original size) to keep partially eaten items visible */
  public minScaleFloor: number = 0.40;

  /** Minimum absolute physical collider radius (units) */
  public minRadiusFloor: number = 0.15;

  /** Track initial unscaled radius of the parent object */
  public initialColliderRadius: number = 0.26;

  /** Flag indicating whether the item has been completely consumed */
  public isConsumed: boolean = false;

  /** If true, this consumable has infinite energy, never depletes, never shrinks, and cannot be destroyed */
  public unlimited: boolean = false;

  constructor(options?: ConsumableModuleOptions) {
    this.tag = (options?.tag ?? "food").trim().toLowerCase() || "food";
    const total = options?.totalEnergyJoules ?? 4000.0;
    this.totalEnergyJoulesProp = new DynamicProperty(total);
    this.remainingEnergyJoulesProp = new DynamicProperty(options?.remainingEnergyJoules ?? total);
    this.consumeRateWattsProp = new DynamicProperty(options?.consumeRateWatts ?? options?.eatRateWatts ?? 800.0);
    this.healRateProp = new DynamicProperty(options?.healRate ?? 0.0);

    if (options?.minScaleFloor !== undefined) this.minScaleFloor = Math.max(0.2, options.minScaleFloor);
    if (options?.minRadiusFloor !== undefined) this.minRadiusFloor = Math.max(0.08, options.minRadiusFloor);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.unlimited !== undefined) this.unlimited = options.unlimited;
  }

  public get totalEnergyJoules(): number {
    return this.totalEnergyJoulesProp.literalValue;
  }

  public set totalEnergyJoules(val: number) {
    this.totalEnergyJoulesProp.set(Math.max(10.0, val));
  }

  public get remainingEnergyJoules(): number {
    return this.remainingEnergyJoulesProp.literalValue;
  }

  public set remainingEnergyJoules(val: number) {
    this.remainingEnergyJoulesProp.set(Math.max(0, Math.min(this.totalEnergyJoules, val)));
  }

  public get consumeRateWatts(): number {
    return this.consumeRateWattsProp.literalValue;
  }

  public set consumeRateWatts(val: number) {
    this.consumeRateWattsProp.set(Math.max(10.0, val));
  }

  // Legacy alias for eatRateWatts
  public get eatRateWatts(): number {
    return this.consumeRateWatts;
  }

  public set eatRateWatts(val: number) {
    this.consumeRateWatts = val;
  }

  public get healRate(): number {
    return this.healRateProp.literalValue;
  }

  public set healRate(val: number) {
    this.healRateProp.literalValue = Math.max(0, val);
  }

  public getTotalEnergy(registry?: ObjectPropertiesRegistry): number {
    return Math.max(1.0, this.totalEnergyJoulesProp.get(registry));
  }

  public getRemainingEnergy(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0, this.remainingEnergyJoulesProp.get(registry));
  }

  public getConsumeRate(registry?: ObjectPropertiesRegistry): number {
    return Math.max(1.0, this.consumeRateWattsProp.get(registry));
  }

  public getEatRate(registry?: ObjectPropertiesRegistry): number {
    return this.getConsumeRate(registry);
  }

  public getHealRate(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0, this.healRateProp.get(registry));
  }

  /**
   * Calculates the current volumetric scale factor based on remaining energy.
   * Uses cube-root volumetric scaling with a configurable minimum scale floor,
   * ensuring that even low-energy crumbs remain easily visible and grabbable.
   */
  public getScale(registry?: ObjectPropertiesRegistry): number {
    if (this.unlimited) return 1.0;
    const total = this.getTotalEnergy(registry);
    const remaining = this.getRemainingEnergy(registry);
    if (remaining <= 0.001) return 0;
    const ratio = Math.max(0, Math.min(1.0, remaining / total));
    const volumetricScale = Math.cbrt(ratio);
    return Math.max(this.minScaleFloor, volumetricScale);
  }

  /**
   * Continuous consume action executed when a character consumes this held object.
   * Transfers energy into the consumer's EnergyPool, optionally restores HP,
   * updates physical size, and disposes of the object when 100% depleted.
   */
  public consume(
    dt: number,
    consumer: Character,
    consumableObj: GameObject,
    objects?: GameObject[],
    arena?: Arena
  ): { watts: number; joules: number; isDepleted: boolean } {
    if (!this.enabled || dt <= 0 || this.isConsumed) {
      return { watts: 0, joules: 0, isDepleted: this.isConsumed };
    }

    const registry = consumableObj.properties;

    if (this.unlimited) {
      const rateWatts = this.getConsumeRate(registry);
      const demandJoules = rateWatts * dt;

      // 1. Add directly to consumer's EnergyPool
      if (consumer.energyPool && consumer.energyPool.enabled) {
        const curEnergy = consumer.energyPool.getCurrentEnergy(consumer.properties);
        const maxEnergy = consumer.energyPool.getMaxEnergy(consumer.properties);
        const updatedEnergy = Math.min(maxEnergy, curEnergy + demandJoules);
        consumer.energyPool.currentEnergyProp.set(updatedEnergy, consumer.properties);
      }

      // 2. Optional bonus health healing while consuming
      const healHpPerSec = this.getHealRate(registry);
      if (healHpPerSec > 0 && consumer.healthModule && consumer.healthModule.enabled) {
        const healAmt = healHpPerSec * dt;
        consumer.healthModule.heal(healAmt, consumer.properties, {
          id: "consumable_nutrition",
          name: this.tag ? `Consumable (${this.tag})` : "Consumable",
          type: "continuous",
          rate: healHpPerSec,
          color: "#ec4899",
          isHeal: true,
        });
      }

      return {
        watts: rateWatts,
        joules: demandJoules,
        isDepleted: false,
      };
    }

    const remaining = this.getRemainingEnergy(registry);
    if (remaining <= 0.001) {
      this.finishConsumption(consumer, consumableObj, objects, arena);
      return { watts: 0, joules: 0, isDepleted: true };
    }

    const rateWatts = this.getConsumeRate(registry);
    const demandJoules = rateWatts * dt;
    const transferJoules = Math.min(remaining, demandJoules);

    // 1. Deduct from consumable energy
    const newRemaining = Math.max(0, remaining - transferJoules);
    this.remainingEnergyJoulesProp.set(newRemaining, registry);

    // 2. Add to consumer's EnergyPool
    if (consumer.energyPool && consumer.energyPool.enabled) {
      const curEnergy = consumer.energyPool.getCurrentEnergy(consumer.properties);
      const maxEnergy = consumer.energyPool.getMaxEnergy(consumer.properties);
      const updatedEnergy = Math.min(maxEnergy, curEnergy + transferJoules);
      consumer.energyPool.currentEnergyProp.set(updatedEnergy, consumer.properties);
    }

    // 3. Optional bonus health healing while consuming
    const healHpPerSec = this.getHealRate(registry);
    if (healHpPerSec > 0 && consumer.healthModule && consumer.healthModule.enabled) {
      const healAmt = healHpPerSec * dt;
      consumer.healthModule.heal(healAmt, consumer.properties, {
        id: "consumable_nutrition",
        name: this.tag ? `Consumable (${this.tag})` : "Consumable",
        type: "continuous",
        rate: healHpPerSec,
        color: "#22c55e",
        isHeal: true,
      });
    }

    // 4. Dynamically shrink physical collider radius (with scale floor)
    if (!this.initialColliderRadius || this.initialColliderRadius <= 0) {
      this.initialColliderRadius = consumableObj.colliderRadius > 0 ? consumableObj.colliderRadius : 0.26;
    }
    const currentScale = this.getScale(registry);
    const targetRadius = Math.max(this.minRadiusFloor, this.initialColliderRadius * currentScale);
    consumableObj.colliderRadius = targetRadius;
    if (consumableObj.colliderModule) {
      consumableObj.colliderModule.radius = targetRadius;
    }

    // 5. Check for complete consumption
    const isDepleted = newRemaining <= 0.001;
    if (isDepleted) {
      this.finishConsumption(consumer, consumableObj, objects, arena);
    }

    return {
      watts: rateWatts,
      joules: transferJoules,
      isDepleted,
    };
  }

  // Legacy eat alias
  public eat(
    dt: number,
    consumer: Character,
    consumableObj: GameObject,
    arena?: Arena,
    objects?: GameObject[]
  ): { watts: number; joules: number; isDepleted: boolean } {
    return this.consume(dt, consumer, consumableObj, objects, arena);
  }

  /**
   * Finalizes the consumption of food when all Joules are drained.
   * Drops the object from the character's hands and removes it from the world.
   */
  public finishConsumption(
    consumer: Character,
    consumableObj: GameObject,
    objects?: GameObject[],
    _arena?: Arena
  ): void {
    console.log(`🍎 [Consumable] finishConsumption called for ${consumableObj.id} heldBy=${consumableObj.heldBy?.name || consumer.name}`);
    this.isConsumed = true;
    this.remainingEnergyJoulesProp.set(0, consumableObj.properties);

    // Notify online session or consumer that this consumable was depleted and should be deleted across network
    if (typeof (consumer as any)._onConsumableConsumed === "function") {
      try { (consumer as any)._onConsumableConsumed(consumableObj.id); } catch (_) {}
    }
    if (typeof (consumableObj as any)._onConsumed === "function") {
      try { (consumableObj as any)._onConsumed(consumableObj.id); } catch (_) {}
    }

    // Detach from character's hands
    if (consumer.heldObject === consumableObj) {
      consumer.heldObject = null;
    }
    consumableObj.isHeld = false;
    consumableObj.heldBy = null;

    // Immediately remove from objects array and arena entities so it is cleanly destroyed!
    if (objects && Array.isArray(objects)) {
      const idx = objects.indexOf(consumableObj);
      if (idx !== -1) {
        objects.splice(idx, 1);
      }
    }
    if (_arena && Array.isArray((_arena as any).entities)) {
      const aIdx = (_arena as any).entities.indexOf(consumableObj);
      if (aIdx !== -1) {
        (_arena as any).entities.splice(aIdx, 1);
      }
    }
  }
}

// Aliases for backwards compatibility with any existing imports
export const FoodModule = ConsumableModule;
export type FoodModuleOptions = ConsumableModuleOptions;
