import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";
import type { GameObject } from "./GameObject.js";
import type { Arena } from "./Arena.js";

export interface DamageAuraModuleOptions {
  damageRadius?: number;
  damageRate?: number;
  enabled?: boolean;
}

export class DamageAuraModule {
  public id = "damageAura";
  public name = "Damage Aura";
  public enabled = true;

  /** Radius in world units within which objects take damage */
  public damageRadiusProp: DynamicProperty;

  /** Health points drained per second (HP / s) */
  public damageRateProp: DynamicProperty;

  constructor(options?: DamageAuraModuleOptions) {
    this.damageRadiusProp = new DynamicProperty(options?.damageRadius ?? 2.5);
    this.damageRateProp = new DynamicProperty(options?.damageRate ?? 25.0);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get damageRadius(): number {
    return this.damageRadiusProp.literalValue;
  }

  public set damageRadius(val: number) {
    this.damageRadiusProp.literalValue = Math.max(0.1, val);
  }

  public get damageRate(): number {
    return this.damageRateProp.literalValue;
  }

  public set damageRate(val: number) {
    this.damageRateProp.literalValue = Math.max(0, val);
  }

  public getDamageRadius(registry?: ObjectPropertiesRegistry): number {
    return this.damageRadiusProp.get(registry);
  }

  public getDamageRate(registry?: ObjectPropertiesRegistry): number {
    return this.damageRateProp.get(registry);
  }

  /**
   * Continuous update tick:
   * Applies damage to any entity in the arena that has a HealthModule and is within 3D spherical radius.
   */
  public update(dt: number, sourceEntity: GameObject, arenaOrTargets: Arena | GameObject[]): void {
    if (!this.enabled || dt <= 0) return;

    const registry = sourceEntity.properties;
    const radius = this.getDamageRadius(registry);
    const rate = this.getDamageRate(registry);
    if (radius <= 0.01 || rate <= 0) return;

    const damageThisFrame = rate * dt;
    const srcX = sourceEntity.position.x;
    const srcY = sourceEntity.position.y;
    const srcZ = sourceEntity.position.z ?? 0;
    const radiusSq = radius * radius;

    // Check all entities in target list or arena
    const entities = Array.isArray(arenaOrTargets)
      ? arenaOrTargets
      : (arenaOrTargets.entities ?? []);
    for (const target of entities) {
      if (target === sourceEntity) continue;

      // Only affect objects that have a HealthModule
      const healthMod = (target as any).healthModule;
      if (!healthMod || !healthMod.enabled) continue;

      const targetX = target.position.x;
      const targetY = target.position.y;
      const targetZ = target.position.z ?? 0;

      const dx = targetX - srcX;
      const dy = targetY - srcY;
      const dz = targetZ - srcZ;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= radiusSq) {
        healthMod.takeDamage(damageThisFrame, target.properties);
      }
    }
  }
}
