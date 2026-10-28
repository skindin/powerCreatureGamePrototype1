import type { Character } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated 1-to-1 capability slice for Health Regeneration & Vitality ticks.
 * Encapsulates metabolic regeneration wattage demand and HealthModule update delegation.
 */
export class HealthRegenCapability {
  public static registerDemand(char: Character): void {
    if (char.healthModule && char.healthModule.enabled && char.healthModule.consumesEnergy && char.energyPool) {
      const curHp = char.healthModule.getCurrentHp(char.properties);
      const maxHp = char.healthModule.getMaxHp(char.properties);
      if (curHp > 0 && curHp < maxHp - 0.001) {
        const healRate = char.healthModule.getMaxHealRate(char.properties);
        if (healRate > 0) {
          const joulesPerHp = char.healthModule.getJoulesPerHp(char.properties);
          const rawHealthWatts = healRate * Math.max(0.0001, joulesPerHp);
          const maxPower = char.healthModule.maxPowerProp.get(char.properties);
          let healthWatts = rawHealthWatts;
          if (healthWatts > maxPower) {
            healthWatts = char.healthModule.allowPartialPower ? maxPower : 0;
          }
          char.energyPool.registerDemand("health_regen", healthWatts, char.healthModule.allowPartialPower);
        }
      }
    }
  }

  public static actuate(char: Character, dt: number, arena: Arena): void {
    if (char.healthModule && char.healthModule.enabled) {
      char.healthModule.update(dt, char, arena);
    }
  }
}

