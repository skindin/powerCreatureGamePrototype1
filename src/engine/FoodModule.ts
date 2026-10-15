import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";
import type { GameObject } from "./GameObject.js";
import type { Character } from "../character/Character.js";
import type { Arena } from "./Arena.js";

export interface FoodModuleOptions {
  totalEnergyJoules?: number;
  remainingEnergyJoules?: number;
  eatRateWatts?: number;
  healRate?: number;
  minScaleFloor?: number;
  minRadiusFloor?: number;
  enabled?: boolean;
}

/**
 * FoodModule grants edible nutritional properties to any physical freebody object.
 * While held by a character, the primary action (Left Click / Gamepad RT) continuously
 * consumes the food, transferring Joules into the character's EnergyPool and shrinking
 * the food's physical radius until completely eaten.
 */
export class FoodModule {
  public id = "food";
  public name = "Food & Edible";
  public enabled = true;

  /** Total initial energy capacity stored within this food item (Joules) */
  public totalEnergyJoulesProp: DynamicProperty;

  /** Current remaining energy available to be consumed (Joules) */
  public remainingEnergyJoulesProp: DynamicProperty;

  /** Rate at which nutrition is absorbed while being eaten (Watts = Joules / sec) */
  public eatRateWattsProp: DynamicProperty;

  /** Optional bonus healing rate while eating (HP / sec) */
  public healRateProp: DynamicProperty;

  /** Minimum visual scale floor (e.g. 0.40 = 40% of original size) to keep partially eaten items visible */
  public minScaleFloor: number = 0.40;

  /** Minimum absolute physical collider radius (units) */
  public minRadiusFloor: number = 0.15;

  /** Track initial unscaled radius of the parent object */
  public initialColliderRadius: number = 0.26;

  /** Flag indicating whether the item has been completely consumed */
  public isConsumed: boolean = false;

  constructor(options?: FoodModuleOptions) {
    const total = options?.totalEnergyJoules ?? 2000.0;
    this.totalEnergyJoulesProp = new DynamicProperty(total);
    this.remainingEnergyJoulesProp = new DynamicProperty(options?.remainingEnergyJoules ?? total);
    this.eatRateWattsProp = new DynamicProperty(options?.eatRateWatts ?? 400.0);
    this.healRateProp = new DynamicProperty(options?.healRate ?? 0.0);

    if (options?.minScaleFloor !== undefined) this.minScaleFloor = Math.max(0.2, options.minScaleFloor);
    if (options?.minRadiusFloor !== undefined) this.minRadiusFloor = Math.max(0.08, options.minRadiusFloor);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get totalEnergyJoules(): number {
    return this.totalEnergyJoulesProp.literalValue;
  }

  public set totalEnergyJoules(val: number) {
    this.totalEnergyJoulesProp.literalValue = Math.max(10.0, val);
  }

  public get remainingEnergyJoules(): number {
    return this.remainingEnergyJoulesProp.literalValue;
  }

  public set remainingEnergyJoules(val: number) {
    this.remainingEnergyJoulesProp.literalValue = Math.max(0, Math.min(this.totalEnergyJoules, val));
  }

  public get eatRateWatts(): number {
    return this.eatRateWattsProp.literalValue;
  }

  public set eatRateWatts(val: number) {
    this.eatRateWattsProp.literalValue = Math.max(10.0, val);
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

  public getEatRate(registry?: ObjectPropertiesRegistry): number {
    return Math.max(1.0, this.eatRateWattsProp.get(registry));
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
    const total = this.getTotalEnergy(registry);
    const remaining = this.getRemainingEnergy(registry);
    if (remaining <= 0.001) return 0;
    const ratio = Math.max(0, Math.min(1.0, remaining / total));
    const volumetricScale = Math.cbrt(ratio);
    return Math.max(this.minScaleFloor, volumetricScale);
  }

  /**
   * Continuous eat action executed when a character actively consumes held food.
   * Transfers energy into the eater's EnergyPool, optionally restores HP, updates
   * physical size, and disposes of the object when 100% depleted.
   */
  public eat(
    dt: number,
    eater: Character,
    foodObj: GameObject,
    arena: Arena
  ): { watts: number; joules: number; isDepleted: boolean } {
    if (!this.enabled || dt <= 0 || this.isConsumed) {
      return { watts: 0, joules: 0, isDepleted: this.isConsumed };
    }

    const registry = foodObj.properties;
    const remaining = this.getRemainingEnergy(registry);
    if (remaining <= 0.001) {
      this.finishConsumption(eater, foodObj, arena);
      return { watts: 0, joules: 0, isDepleted: true };
    }

    const rateWatts = this.getEatRate(registry);
    const demandJoules = rateWatts * dt;
    const transferJoules = Math.min(remaining, demandJoules);

    // 1. Deduct from food energy
    const newRemaining = Math.max(0, remaining - transferJoules);
    this.remainingEnergyJoulesProp.literalValue = newRemaining;

    // 2. Add to eater's EnergyPool
    if (eater.energyPool && eater.energyPool.enabled) {
      const curEnergy = eater.energyPool.getCurrentEnergy(eater.properties);
      const maxEnergy = eater.energyPool.getMaxEnergy(eater.properties);
      const updatedEnergy = Math.min(maxEnergy, curEnergy + transferJoules);
      eater.energyPool.currentEnergyProp.literalValue = updatedEnergy;
    }

    // 3. Optional bonus health healing while eating
    const healHpPerSec = this.getHealRate(registry);
    if (healHpPerSec > 0 && eater.healthModule && eater.healthModule.enabled) {
      const healAmt = healHpPerSec * dt;
      eater.healthModule.heal(healAmt, eater.properties, {
        id: "food_nutrition",
        name: "Food",
        type: "continuous",
        rate: healHpPerSec,
        color: "#22c55e",
        isHeal: true,
      });
    }

    // 4. Dynamically shrink physical collider radius (with scale floor)
    if (!this.initialColliderRadius || this.initialColliderRadius <= 0) {
      this.initialColliderRadius = foodObj.colliderRadius > 0 ? foodObj.colliderRadius : 0.26;
    }
    const currentScale = this.getScale(registry);
    const targetRadius = Math.max(this.minRadiusFloor, this.initialColliderRadius * currentScale);
    foodObj.colliderRadius = targetRadius;
    if (foodObj.colliderModule) {
      foodObj.colliderModule.radius = targetRadius;
    }

    // 5. Check for complete consumption
    const isDepleted = newRemaining <= 0.001;
    if (isDepleted) {
      this.finishConsumption(eater, foodObj, arena);
    }

    return {
      watts: rateWatts,
      joules: transferJoules,
      isDepleted,
    };
  }

  /**
   * Finalizes the consumption of food when all Joules are drained.
   * Drops the object from the character's hands and removes it from the world.
   */
  public finishConsumption(eater: Character, foodObj: GameObject, arena: Arena): void {
    this.isConsumed = true;
    this.remainingEnergyJoulesProp.literalValue = 0;

    // Detach from character's hands
    if (eater.heldObject === foodObj) {
      eater.heldObject = null;
    }
    foodObj.isHeld = false;
    foodObj.heldBy = null;

    // Remove from arena entities
    if (arena && Array.isArray(arena.entities)) {
      const idx = arena.entities.indexOf(foodObj);
      if (idx !== -1) {
        arena.entities.splice(idx, 1);
      }
    }
  }
}
