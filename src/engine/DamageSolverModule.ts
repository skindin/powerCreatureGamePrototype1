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
  minShockThreshold?: number;
  enabled?: boolean;
}

/**
 * DamageSolverModule
 *
 * Serves as the defensive articulation / armor layer for any entity with a HealthModule.
 * Receives physical impact shock events, converts absorbed shock above threshold
 * to raw damage scaled by the world collision damage scale, applies impact susceptibility %,
 * and passes the net damage directly to the entity's HealthModule.
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
   * Minimum absorbed shock acceleration (u/s²) required before trauma occurs.
   * Prevents gentle walking into walls or light nudges from dealing damage.
   */
  public minShockThresholdProp: DynamicProperty;

  /** Cooldown timer to prevent multi-substep collision spam in a single frame */
  private lastImpactTime: number = 0;
  private readonly impactCooldownMs: number = 60; // 60ms ~ 3-4 frames

  constructor(options?: DamageSolverModuleOptions) {
    this.impactSusceptibilityProp = new DynamicProperty(options?.impactSusceptibility ?? 1.0);
    this.minShockThresholdProp = new DynamicProperty(options?.minShockThreshold ?? 4.0);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public getImpactSusceptibility(registry?: ObjectPropertiesRegistry): number {
    return this.impactSusceptibilityProp.get(registry);
  }

  public getMinShockThreshold(registry?: ObjectPropertiesRegistry): number {
    return this.minShockThresholdProp.get(registry);
  }

  /**
   * Evaluates an incoming physical impact shock event against thresholds
   * and deducts damage from the entity's HealthModule.
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

    const threshold = this.getMinShockThreshold(registry);
    const netShock = Math.max(0, event.absorbedShock - threshold);
    if (netShock <= 0) return 0;

    // Linear un-clamped scaling: netShock * worldScale * susceptibility
    const finalDamage = netShock * worldCollisionDamageScale * susceptibility;
    if (finalDamage > 0.001) {
      this.lastImpactTime = now;
      healthModule.takeDamage(finalDamage, registry);
      return finalDamage;
    }

    return 0;
  }
}
