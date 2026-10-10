import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

/**
 * EnergyPool: Represents a finite biochemical energy reservoir (in Joules).
 * Conforms to Blender-style DynamicProperty sockets.
 */
export class EnergyPool {
  public id = "energy_pool";
  public name = "Energy Pool";
  public enabled = true;

  public baseMaxEnergyProp: DynamicProperty;
  public maxEnergyProp: DynamicProperty;
  public currentEnergyProp: DynamicProperty;

  /**
   * When enabled, energy consumption is bypassed (godmode / testing).
   */
  public infiniteEnergy: boolean = false;

  /**
   * When enabled, automatically refills currentEnergy back to maxEnergy immediately upon hitting 0.
   */
  public debugAutoRefillOnEmpty: boolean = true;

  constructor(options?: {
    baseMaxEnergy?: number;
    maxEnergy?: number;
    currentEnergy?: number;
    infiniteEnergy?: boolean;
    debugAutoRefillOnEmpty?: boolean;
    enabled?: boolean;
  }) {
    const base = options?.baseMaxEnergy ?? 1000.0;
    const max = options?.maxEnergy ?? base;
    const cur = options?.currentEnergy ?? max;

    this.baseMaxEnergyProp = new DynamicProperty(base);
    this.maxEnergyProp = new DynamicProperty(max);
    this.currentEnergyProp = new DynamicProperty(cur);

    if (options?.infiniteEnergy !== undefined) this.infiniteEnergy = options.infiniteEnergy;
    if (options?.debugAutoRefillOnEmpty !== undefined) this.debugAutoRefillOnEmpty = options.debugAutoRefillOnEmpty;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public getBaseMaxEnergy(registry?: ObjectPropertiesRegistry): number {
    return this.baseMaxEnergyProp.get(registry);
  }

  public getMaxEnergy(registry?: ObjectPropertiesRegistry): number {
    return this.maxEnergyProp.get(registry);
  }

  public getCurrentEnergy(registry?: ObjectPropertiesRegistry): number {
    return this.currentEnergyProp.get(registry);
  }

  public setCurrentEnergy(val: number, registry?: ObjectPropertiesRegistry): void {
    const max = this.getMaxEnergy(registry);
    const clamped = Math.max(0, Math.min(max, val));
    this.currentEnergyProp.set(clamped, registry);
  }

  /**
   * Attempts to consume energy from the pool.
   * Returns true if enough energy was available (or if infiniteEnergy is enabled).
   */
  public consume(amount: number, registry?: ObjectPropertiesRegistry): boolean {
    if (!this.enabled || amount <= 0) return true;
    if (this.infiniteEnergy) return true;

    const cur = this.getCurrentEnergy(registry);
    if (cur >= amount) {
      const next = cur - amount;
      this.currentEnergyProp.set(next, registry);
      if (next <= 0.0001 && this.debugAutoRefillOnEmpty) {
        this.refill(registry);
      }
      return true;
    }

    // Depleted / insufficient
    this.currentEnergyProp.set(0, registry);
    if (this.debugAutoRefillOnEmpty) {
      this.refill(registry);
    }
    return false;
  }

  /**
   * Adds energy to the pool (e.g. from eating food or healing items).
   */
  public addEnergy(amount: number, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentEnergy(registry);
    const max = this.getMaxEnergy(registry);
    this.currentEnergyProp.set(Math.min(max, cur + amount), registry);
  }

  /**
   * Refills current energy back to 100% capacity.
   */
  public refill(registry?: ObjectPropertiesRegistry): void {
    const max = this.getMaxEnergy(registry);
    this.currentEnergyProp.set(max, registry);
  }
}
