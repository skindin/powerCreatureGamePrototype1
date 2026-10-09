import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export interface HealthModuleOptions {
  baseMaxHp?: number;
  maxHp?: number;
  currentHp?: number;
  baseMaxHealRate?: number;
  maxHealRate?: number;
  consumesEnergy?: boolean;
  enabled?: boolean;
}

export class HealthModule {
  public id = "health";
  public name = "Health & Vitality";
  public enabled = true;

  /** Baseline max health value */
  public baseMaxHp: number;
  /** Effective maximum health (can be modified by buffs/debuffs) */
  public maxHpProp: DynamicProperty;
  /** Current live HP */
  public currentHpProp: DynamicProperty;

  /** Baseline max heal rate (HP / second) */
  public baseMaxHealRate: number;
  /** Effective max heal rate (HP / second) */
  public maxHealRateProp: DynamicProperty;

  /** Toggle indicating whether healing draws energy from an Energy Bus */
  public consumesEnergy: boolean = false;

  constructor(options?: HealthModuleOptions) {
    this.baseMaxHp = options?.baseMaxHp ?? 100.0;
    const initialMaxHp = options?.maxHp ?? this.baseMaxHp;
    this.maxHpProp = new DynamicProperty(initialMaxHp);
    this.currentHpProp = new DynamicProperty(options?.currentHp ?? initialMaxHp);

    this.baseMaxHealRate = options?.baseMaxHealRate ?? 10.0;
    this.maxHealRateProp = new DynamicProperty(options?.maxHealRate ?? this.baseMaxHealRate);

    if (options?.consumesEnergy !== undefined) this.consumesEnergy = options.consumesEnergy;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get maxHp(): number {
    return this.maxHpProp.literalValue;
  }

  public set maxHp(val: number) {
    this.maxHpProp.literalValue = Math.max(1, val);
  }

  public get currentHp(): number {
    return this.currentHpProp.literalValue;
  }

  public set currentHp(val: number) {
    this.currentHpProp.literalValue = Math.max(0, Math.min(this.maxHp, val));
  }

  public get maxHealRate(): number {
    return this.maxHealRateProp.literalValue;
  }

  public set maxHealRate(val: number) {
    this.maxHealRateProp.literalValue = Math.max(0, val);
  }

  public getMaxHp(registry?: ObjectPropertiesRegistry): number {
    return this.maxHpProp.get(registry);
  }

  public getCurrentHp(registry?: ObjectPropertiesRegistry): number {
    return this.currentHpProp.get(registry);
  }

  public getMaxHealRate(registry?: ObjectPropertiesRegistry): number {
    return this.maxHealRateProp.get(registry);
  }

  public takeDamage(amount: number, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentHp(registry);
    const updated = Math.max(0, cur - amount);
    this.currentHpProp.set(updated, registry);
  }

  public heal(amount: number, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentHp(registry);
    const max = this.getMaxHp(registry);
    const updated = Math.min(max, cur + amount);
    this.currentHpProp.set(updated, registry);
  }

  /**
   * Continuous per-frame health tick:
   * Heals current HP up to maxHp at maxHealRate * dt.
   * If HP drops to 0 or below, triggers character death and respawn.
   */
  public update(dt: number, character: Character, arena?: Arena): void {
    if (!this.enabled) return;

    const registry = character.properties;
    const current = this.getCurrentHp(registry);
    const max = this.getMaxHp(registry);

    // Passive regeneration if wounded and alive
    if (current > 0 && current < max) {
      const healRate = this.getMaxHealRate(registry);
      if (healRate > 0) {
        const nextHp = Math.min(max, current + healRate * dt);
        this.currentHpProp.set(nextHp, registry);
      }
    }

    // Check death condition
    if (this.getCurrentHp(registry) <= 0.0001) {
      this.dieAndRespawn(character, arena);
    }
  }

  /**
   * Resets character state on death:
   * Drops any carried object, clears wall mounts, resets velocities,
   * snaps to a spawn position, and restores full health.
   */
  public dieAndRespawn(character: Character, arena?: Arena): void {
    // 1. Drop carried objects
    if (character.heldObject) {
      character.heldObject.isHeld = false;
      character.heldObject.heldBy = null;
      character.heldObject = null;
    }

    // 2. Clear climbing and wall mounts
    character.isClimbing = false;
    character.standingWall = null;
    if (character.wallEdgeAssistModule) {
      character.wallEdgeAssistModule.isAssistClampArmed = false;
      character.wallEdgeAssistModule.hasMovedOntoWall = false;
    }

    // 3. Reset physics velocity
    character.velocity = { x: 0, y: 0 };
    character.verticalVelocity = 0;

    // 4. Place at spawn location
    let spawnX = 4.8;
    let spawnY = 7.0;
    if (character.spawnPos) {
      spawnX = character.spawnPos.x;
      spawnY = character.spawnPos.y;
    } else if (arena) {
      spawnX = arena.width / 2;
      spawnY = arena.height / 2;
    }
    character.position.x = spawnX;
    character.position.y = spawnY;
    character.position.z = 0;
    character.supportingSurfaceHeight = 0;

    // 5. Restore full HP
    const max = this.getMaxHp(character.properties);
    this.currentHpProp.set(max, character.properties);
  }
}
