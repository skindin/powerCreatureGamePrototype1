import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export interface HealthModifierSource {
  id: string;
  name: string;
  color?: string;
  type?: "continuous" | "instant";
  rate?: number;
  amount?: number;
  isHeal?: boolean;
}

export interface ActiveHealthModifier {
  id: string;
  name: string;
  color: string;
  type: "continuous" | "instant";
  isHeal: boolean;
  order: number;
  rateOrAmount: number;
  duration?: number;
  lastReportedTick: number;
}

export interface HealthModuleOptions {
  baseMaxHp?: number;
  maxHp?: number;
  currentHp?: number;
  baseMaxHealRate?: number;
  maxHealRate?: number;
  hpPerJoule?: number;
  consumesEnergy?: boolean;
  enabled?: boolean;
}

export class HealthModule {
  public id = "health";
  public name = "Health & Vitality";
  public enabled = true;

  /** Active health modifiers (continuous DOT/HOT and instant bursts) */
  private _activeModifiers: Map<string, ActiveHealthModifier> = new Map();
  private _nextModifierOrder: number = 1;
  private _currentTick: number = 0;

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

  /** Biological healing conversion efficiency: how much HP is restored per Joule of metabolic energy */
  public hpPerJouleProp: DynamicProperty;

  /** Toggle indicating whether healing draws energy from an Energy Bus */
  public consumesEnergy: boolean = false;
  /** Whether healing is allowed to run when bus power cannot provide 100% full wattage */
  public allowPartialPower: boolean = true;
  /** ID of the Energy Bus to draw power from */
  public energyBusId: string = "bus_main";

  /** Optional callback invoked when entity dies and respawns */
  public onDeathRespawn?: (entity: Character, respawnPos: { x: number; y: number; z: number }) => void;

  constructor(options?: HealthModuleOptions & { allowPartialPower?: boolean }) {
    this.baseMaxHp = options?.baseMaxHp ?? 100.0;
    const initialMaxHp = options?.maxHp ?? this.baseMaxHp;
    this.maxHpProp = new DynamicProperty(initialMaxHp);
    this.currentHpProp = new DynamicProperty(options?.currentHp ?? initialMaxHp);

    this.baseMaxHealRate = options?.baseMaxHealRate ?? 10.0;
    this.maxHealRateProp = new DynamicProperty(options?.maxHealRate ?? this.baseMaxHealRate);

    // Default 0.04 HP/Joule (equals 25 Joules per 1 HP, 250W at 10 HP/s)
    this.hpPerJouleProp = new DynamicProperty(options?.hpPerJoule ?? 0.04);

    if (options?.consumesEnergy !== undefined) this.consumesEnergy = options.consumesEnergy;
    if (options?.allowPartialPower !== undefined) this.allowPartialPower = options.allowPartialPower;
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

  public get hpPerJoule(): number {
    return this.hpPerJouleProp.literalValue;
  }

  public set hpPerJoule(val: number) {
    this.hpPerJouleProp.literalValue = Math.max(0.0001, val);
  }

  public getHpPerJoule(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0.0001, this.hpPerJouleProp.get(registry));
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

  public getActiveModifiers(_registry?: ObjectPropertiesRegistry): ActiveHealthModifier[] {
    return Array.from(this._activeModifiers.values());
  }

  public registerContinuousModifier(source: HealthModifierSource): void {
    const existing = this._activeModifiers.get(source.id);
    if (!existing) {
      this._activeModifiers.set(source.id, {
        id: source.id,
        name: source.name,
        color: source.color ?? (source.isHeal ? "#22c55e" : "#ef4444"),
        type: "continuous",
        isHeal: source.isHeal ?? false,
        order: this._nextModifierOrder++,
        rateOrAmount: source.rate ?? 0,
        lastReportedTick: this._currentTick,
      });
    } else {
      existing.rateOrAmount = source.rate ?? existing.rateOrAmount;
      existing.lastReportedTick = this._currentTick;
      if (source.name) existing.name = source.name;
      if (source.color) existing.color = source.color;
    }
  }

  public registerInstantModifier(source: HealthModifierSource, amount: number): void {
    const existing = this._activeModifiers.get(source.id);
    if (!existing) {
      this._activeModifiers.set(source.id, {
        id: source.id,
        name: source.name,
        color: source.color ?? (source.isHeal ? "#22c55e" : "#f87171"),
        type: "instant",
        isHeal: source.isHeal ?? false,
        order: this._nextModifierOrder++,
        rateOrAmount: amount,
        duration: 0.55,
        lastReportedTick: this._currentTick,
      });
    } else {
      existing.rateOrAmount = amount;
      existing.duration = 0.55;
      existing.lastReportedTick = this._currentTick;
    }
  }

  public takeDamage(amount: number, registry?: ObjectPropertiesRegistry, source?: HealthModifierSource): void {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentHp(registry);
    const updated = Math.max(0, cur - amount);
    this.currentHpProp.set(updated, registry);

    // Register modifier for live HUD feedback
    if (source && source.type === "continuous") {
      this.registerContinuousModifier({
        id: source.id,
        name: source.name,
        color: source.color ?? "#ef4444",
        type: "continuous",
        isHeal: false,
        rate: source.rate ?? amount * 60,
      });
    } else {
      this.registerInstantModifier({
        id: source?.id ?? "damage",
        name: source?.name ?? "Damage",
        color: source?.color ?? "#ef4444",
        type: "instant",
        isHeal: false,
      }, source?.amount ?? amount);
    }
  }

  public heal(amount: number, registry?: ObjectPropertiesRegistry, source?: HealthModifierSource): void {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentHp(registry);
    const max = this.getMaxHp(registry);
    const updated = Math.min(max, cur + amount);
    this.currentHpProp.set(updated, registry);

    // Register modifier for live HUD feedback
    if (source && source.type === "continuous") {
      this.registerContinuousModifier({
        id: source.id,
        name: source.name,
        color: source.color ?? "#22c55e",
        type: "continuous",
        isHeal: true,
        rate: source.rate ?? amount * 60,
      });
    } else {
      this.registerInstantModifier({
        id: source?.id ?? "heal",
        name: source?.name ?? "Heal",
        color: source?.color ?? "#22c55e",
        type: "instant",
        isHeal: true,
      }, source?.amount ?? amount);
    }
  }

  /**
   * Resets health state back to full health and clears active modifiers.
   */
  public reset(registry?: ObjectPropertiesRegistry): void {
    const max = this.getMaxHp(registry);
    this.currentHpProp.set(max, registry);
    this._activeModifiers.clear();
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
    let activeHealRate = 0;
    if (current > 0 && current < max - 0.001) {
      const healRate = this.getMaxHealRate(registry);
      if (healRate > 0) {
        let effectiveHealRate = healRate;
        if (this.consumesEnergy) {
          const bus = character.getEnergyBus(this.energyBusId);
          if (bus) {
            // Bio-regeneration power: Power = healRate / (HP/Joule)
            const hpPerJoule = this.getHpPerJoule(registry);
            const powerWatts = healRate / Math.max(0.0001, hpPerJoule);
            const granted = bus.requestPower(powerWatts, dt, character.energyPool, registry, false, "health_regen", this.allowPartialPower);
            if (granted <= 0) {
              effectiveHealRate = 0;
            } else {
              effectiveHealRate = healRate * Math.min(1.0, granted / powerWatts);
            }
          }
        }
        if (effectiveHealRate > 0) {
          activeHealRate = effectiveHealRate;
          const nextHp = Math.min(max, current + effectiveHealRate * dt);
          if (nextHp >= max - 0.001) {
            this.currentHpProp.set(max, registry);
          } else {
            this.currentHpProp.set(nextHp, registry);
          }
        }
      }
    } else if (current >= max - 0.001 && current !== max) {
      this.currentHpProp.set(max, registry);
    }

    // Register or clear passive heal modifier
    if (activeHealRate > 0.001) {
      this.registerContinuousModifier({
        id: "passive_heal",
        name: "Heal",
        color: "#22c55e",
        type: "continuous",
        isHeal: true,
        rate: activeHealRate,
      });
    } else {
      this._activeModifiers.delete("passive_heal");
    }

    // Clean up expired continuous and instant modifiers
    for (const [id, mod] of this._activeModifiers.entries()) {
      if (mod.type === "continuous") {
        if (mod.lastReportedTick !== this._currentTick) {
          this._activeModifiers.delete(id);
        }
      } else if (mod.type === "instant") {
        if (mod.duration !== undefined) {
          mod.duration -= dt;
          if (mod.duration <= 0) {
            this._activeModifiers.delete(id);
          }
        }
      }
    }

    this._currentTick++;

    // Check death condition
    if (this.getCurrentHp(registry) <= 0.0001) {
      // In online multiplayer mode, death/respawn is authoritative: the server picks the respawn location
      // and broadcasts DeathRespawnEvent so the character does not glitch between different positions.
      const isOnline = (character as any)._isInOnlineMode === true;
      if (isOnline) {
        (character as any).isAwaitingRespawn = true;
      } else {
        this.dieAndRespawn(character, arena);
      }
    }
  }

  /**
   * Authoritative clearing spawn points (West, East, Southwest, Southeast).
   * Open clearings safely away from arena cover walls.
   */
  public static readonly RESPAWN_SPAWNS: ReadonlyArray<{ x: number; y: number; z: number }> = [
    { x: 3.5, y: 7.0, z: 0 },   // Slot 1 (West open midfield)
    { x: 17.0, y: 3.5, z: 0 },  // Slot 2 (East open clearing)
    { x: 3.5, y: 11.0, z: 0 },  // Slot 3 (Southwest open clearing)
    { x: 17.0, y: 11.0, z: 0 }, // Slot 4 (Southeast open clearing)
  ];

  /**
   * Resets character state on death:
   * Delegates directly to character.dieAndRespawn to restore HP, energy pool, and energy buses.
   */
  public dieAndRespawn(character: Character, arena?: Arena, explicitPos?: { x: number; y: number; z?: number }): void {
    character.dieAndRespawn(arena, explicitPos);
  }
}
