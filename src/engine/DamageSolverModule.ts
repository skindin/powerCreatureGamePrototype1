import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";
import type { GameObject } from "./GameObject.js";
import type { HealthModule } from "../character/HealthModule.js";

export interface ImpactEvent {
  /**
   * Absorbed deceleration shock (u/s²).
   * Already factors in bounciness cushioning: shockAcceleration * (1 - bounce).
   */
  absorbedShock: number;
  /** Normal velocity or relative speed (u/s) */
  impactSpeed: number;
  /** The entity or obstacle collided with, or null for walls/boundaries */
  otherEntity: GameObject | null;
  /** Contact normal x */
  normalX: number;
  /** Contact normal y */
  normalY: number;
}

export interface DamageSolverModuleOptions {
  impactSusceptibility?: number;
  /** Flat HP threshold absorbed/subtracted before health damage occurs */
  damageThresholdHp?: number;
  /** Backwards compatibility alias for damageThresholdHp */
  minShockThreshold?: number;
  enabled?: boolean;
}

/**
 * DamageSolverModule
 *
 * Serves as the defensive articulation / armor layer for any entity with a HealthModule.
 * Receives physical impact shock events, converts absorbed shock to base HP damage via the
 * world collision damage scale and entity impact susceptibility %, and subtracts the
 * flat damageThresholdHp (armor/tolerance buffer) before taking damage, clamped at 0.
 */
export class DamageSolverModule {
  public id = "damageSolver";
  public name = "Damage Solver & Armor";
  public enabled = true;

  /**
   * Multiplier / susceptibility percentage for blunt physical impacts.
   * 1.0 = 100% normal damage, 0.0 = completely immune, 0.5 = 50% armored resistance.
   */
  public impactSusceptibilityProp: DynamicProperty;

  /**
   * Flat amount of HP subtracted from the incoming scaled impact damage before health is lost.
   * Clamps the final HP deduction at 0 (e.g., a threshold of 5.0 HP absorbs the first 5 HP of any impact).
   */
  public damageThresholdHpProp: DynamicProperty;

  /** Cooldown timer to prevent multi-substep collision spam in a single frame */
  private lastImpactTime: number = 0;
  private readonly impactCooldownMs: number = 60; // 60ms ~ 3-4 frames

  constructor(options?: DamageSolverModuleOptions) {
    this.impactSusceptibilityProp = new DynamicProperty(options?.impactSusceptibility ?? 1.0);
    const initialThresh = options?.damageThresholdHp ?? options?.minShockThreshold ?? 5.0;
    this.damageThresholdHpProp = new DynamicProperty(initialThresh);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get minShockThresholdProp(): DynamicProperty {
    return this.damageThresholdHpProp;
  }

  public getImpactSusceptibility(registry?: ObjectPropertiesRegistry): number {
    return this.impactSusceptibilityProp.get(registry);
  }

  public getDamageThresholdHp(registry?: ObjectPropertiesRegistry): number {
    return this.damageThresholdHpProp.get(registry);
  }

  /** Backwards compatibility alias for getDamageThresholdHp */
  public getMinShockThreshold(registry?: ObjectPropertiesRegistry): number {
    return this.getDamageThresholdHp(registry);
  }

  /**
   * Evaluates an incoming physical impact shock event against thresholds
   * and deducts damage from the entity's HealthModule.
   *
   * Formula:
   *   baseDamage = absorbedShock * worldCollisionDamageScale * susceptibility
   *   finalDamage = max(0, baseDamage - damageThresholdHp)
   */
  public handleImpact(
    event: ImpactEvent,
    entity: GameObject,
    healthModule: HealthModule,
    worldCollisionDamageScale: number
  ): number {
    if (!this.enabled || !healthModule || !healthModule.enabled) return 0;

    const now = performance.now();
    if (now - this.lastImpactTime < this.impactCooldownMs) {
      return 0;
    }

    const registry = entity.properties;
    const susceptibility = this.getImpactSusceptibility(registry);
    if (susceptibility <= 0) return 0;

    // 1. Convert physical shock directly into base raw HP damage
    const baseDamage = event.absorbedShock * worldCollisionDamageScale * susceptibility;
    if (baseDamage <= 0.0001) return 0;

    // 2. Subtract flat HP threshold buffer (clamped at 0)
    const thresholdHp = this.getDamageThresholdHp(registry);
    const finalDamage = Math.max(0, baseDamage - thresholdHp);

    if (finalDamage > 0.001) {
      this.lastImpactTime = now;
      healthModule.takeDamage(finalDamage, registry);
      return finalDamage;
    }

    return 0;
  }
}
