import type { Character } from "./Character.js";
import type { DynamicProperty } from "../engine/properties/DynamicProperty.js";

export type GrowthCurveMode = "cbrt" | "cross_section" | "linear" | "custom";

export interface ScaledPropertyRule {
  /** Unique property key, e.g. "walk.maxWalkPower", "jump.jumpStrength", "health.maxHealth" */
  propertyKey: string;
  key?: string;
  /** Whether this property scaling rule is active */
  enabled: boolean;
  /** Preset curve rate: cbrt (M^(1/3) radius/stride), cross_section (M^(2/3) muscle area), linear (M^1 volume), or custom */
  curveMode: GrowthCurveMode;
  curve?: GrowthCurveMode;
  /** Multiplier on how strongly the scale delta from 1.0x applies (default 1.0) */
  rateMultiplier: number;
  /** Used when curveMode === "custom" */
  customExponent?: number;
}

export interface DiscoverableScalableProperty {
  key: string;
  label: string;
  category: string;
  moduleLabel?: string;
  unit: string;
  defaultCurve: GrowthCurveMode;
  getCurrentValue: (char: Character) => number;
  applyValue: (char: Character, val: number) => void;
}

export interface EnergyGrowthModuleOptions {
  enabled?: boolean;
  minScaleMultiplier?: number;
  maxScaleMultiplier?: number;
  startingScaleMultiplier?: number;
  scaleMass?: boolean;
  scaleCollider?: boolean;
  scaleSprite?: boolean;
  autoScaleReachWithCollider?: boolean;
  baseValues?: Record<string, number>;
  scaledProperties?: Array<Partial<ScaledPropertyRule> & { propertyKey?: string; key?: string }>;
}

export type EnergyGrowthConfig = EnergyGrowthModuleOptions;

/**
 * EnergyGrowthModule (Scale With Energy)
 * Scales character Mass (linear with volume multiplier M), Collider Radius (cbrt(M)),
 * and Sprite Radius (cbrt(M)) between minScaleMultiplier (at 0 energy) and
 * maxScaleMultiplier (at max energy), starting at startingScaleMultiplier (where M = 1.0
 * equals the 1.0x base stats configured on each module card).
 * Also connects to any property on any attached module and scales its 1.0x base value.
 */
export class EnergyGrowthModule {
  public id = "energyGrowth";
  public name = "Scale With Energy";
  public enabled: boolean = true;

  /** Volume/Mass multiplier when the character has 0 energy (e.g. 0.5x) */
  public minScaleMultiplier: number = 0.5;
  /** Volume/Mass multiplier when the character is at 100% Max Energy (e.g. 2.0x) */
  public maxScaleMultiplier: number = 2.0;
  /** Starting Volume/Mass multiplier on spawn/reset (e.g. 1.0x) */
  public startingScaleMultiplier: number = 1.0;

  // Built-in automatic body scaling toggles
  public scaleMass: boolean = true;
  public scaleCollider: boolean = true;
  public scaleSprite: boolean = true;
  public autoScaleReachWithCollider: boolean = true;

  // Stored 1.0x baseline values for mass, colliderRadius, pickupReach, and connected module properties
  public baseValues: Record<string, number> = {};
  // Tracks the last value written by EnergyGrowthCapability so manual DevPanel edits update baseValues cleanly
  public lastAppliedValues: Record<string, number> = {};
  public hasInitializedStartingEnergy: boolean = false;

  // Live computed telemetry for UI and rendering
  public currentEnergyFraction: number = 0.333;
  public currentVolumeMultiplier: number = 1.0;
  public currentRadiusMultiplier: number = 1.0;
  public currentCrossSectionMultiplier: number = 1.0;
  public currentComputedSpriteRadius: number = 0.44;

  public get currentMassScale(): number {
    return this.currentVolumeMultiplier;
  }

  public get currentRadiusScale(): number {
    return this.currentRadiusMultiplier;
  }

  // User-configured list of module properties to scale with energy
  public scaledProperties: ScaledPropertyRule[] = [];

  constructor(options?: EnergyGrowthModuleOptions) {
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.minScaleMultiplier !== undefined) {
      this.minScaleMultiplier = Math.max(0.05, options.minScaleMultiplier);
    }
    if (options?.maxScaleMultiplier !== undefined) {
      this.maxScaleMultiplier = Math.max(this.minScaleMultiplier + 0.05, options.maxScaleMultiplier);
    }
    if (options?.startingScaleMultiplier !== undefined) {
      this.startingScaleMultiplier = Math.max(
        this.minScaleMultiplier,
        Math.min(this.maxScaleMultiplier, options.startingScaleMultiplier)
      );
    }
    if (options?.scaleMass !== undefined) this.scaleMass = options.scaleMass;
    if (options?.scaleCollider !== undefined) this.scaleCollider = options.scaleCollider;
    if (options?.scaleSprite !== undefined) this.scaleSprite = options.scaleSprite;
    if (options?.autoScaleReachWithCollider !== undefined) {
      this.autoScaleReachWithCollider = options.autoScaleReachWithCollider;
    }
    if (options?.baseValues && typeof options.baseValues === "object") {
      this.baseValues = { ...options.baseValues };
    }

    if (Array.isArray(options?.scaledProperties)) {
      this.scaledProperties = options.scaledProperties
        .filter((r) => r && (r.propertyKey || r.key) && (r.propertyKey || r.key) !== "strength")
        .map((r) => {
          const k = (r.propertyKey || r.key)!;
          const cm = r.curveMode ?? r.curve ?? "cross_section";
          return {
            propertyKey: k,
            key: k,
            enabled: r.enabled !== false,
            curveMode: cm,
            curve: cm,
            rateMultiplier: Number.isFinite(r.rateMultiplier) ? Number(r.rateMultiplier) : 1.0,
            customExponent: r.customExponent ?? 0.67,
          };
        });
    } else {
      this.scaledProperties = [
        {
          propertyKey: "walk.maxWalkPower",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
        {
          propertyKey: "walk.maxSprintPower",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
        {
          propertyKey: "jump.jumpStrength",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
        {
          propertyKey: "jump.maxPower",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
        {
          propertyKey: "throw.maxPower",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
        {
          propertyKey: "health.maxHealth",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
        {
          propertyKey: "stamina.maxStamina",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
        {
          propertyKey: "stamina.regenRate",
          enabled: true,
          curveMode: "cross_section",
          rateMultiplier: 1.0,
        },
      ];
    }
  }

  /**
   * Returns the normalized energy fraction [0..1] that corresponds to startingScaleMultiplier.
   */
  public getStartingEnergyFraction(): number {
    const span = this.maxScaleMultiplier - this.minScaleMultiplier;
    if (span <= 0.0001) return 1.0;
    const clampedStart = Math.max(
      this.minScaleMultiplier,
      Math.min(this.maxScaleMultiplier, this.startingScaleMultiplier)
    );
    return Math.max(0, Math.min(1, (clampedStart - this.minScaleMultiplier) / span));
  }

  /**
   * Syncs the character's EnergyPool currentEnergy to match startingScaleMultiplier.
   */
  public applyStartingScaleToEnergyPool(char: Character): void {
    if (!char.energyPool) return;
    const maxEnergy = Math.max(1, char.energyPool.getMaxEnergy(char.properties));
    const targetEnergy = maxEnergy * this.getStartingEnergyFraction();
    char.energyPool.currentEnergyProp.set(targetEnergy, char.properties);
    this.hasInitializedStartingEnergy = true;
  }

  /**
   * Computes the property multiplier for a given volume/mass scale M (e.g. 0.5 .. 1.0 .. 2.0).
   * At M = 1.0, this always returns 1.0!
   */
  public evaluatePropertyMultiplier(
    volumeMultiplier: number,
    mode: GrowthCurveMode,
    rateMultiplier = 1.0,
    customExp?: number
  ): number {
    const m = Math.max(0.01, volumeMultiplier);
    let rawFactor = 1.0;
    switch (mode) {
      case "linear":
        rawFactor = m;
        break;
      case "cbrt":
        rawFactor = Math.cbrt(m);
        break;
      case "cross_section":
        rawFactor = Math.pow(m, 2 / 3);
        break;
      case "custom": {
        const exp = Math.max(0.05, customExp ?? 0.67);
        rawFactor = Math.pow(m, exp);
        break;
      }
    }
    const rate = Number.isFinite(rateMultiplier) ? rateMultiplier : 1.0;
    return Math.max(0.05, 1.0 + (rawFactor - 1.0) * rate);
  }

  public toConfig(): EnergyGrowthModuleOptions {
    return this.toJSON();
  }

  public toJSON(): EnergyGrowthModuleOptions {
    return {
      enabled: this.enabled,
      minScaleMultiplier: this.minScaleMultiplier,
      maxScaleMultiplier: this.maxScaleMultiplier,
      startingScaleMultiplier: this.startingScaleMultiplier,
      scaleMass: this.scaleMass,
      scaleCollider: this.scaleCollider,
      scaleSprite: this.scaleSprite,
      autoScaleReachWithCollider: this.autoScaleReachWithCollider,
      baseValues: { ...this.baseValues },
      scaledProperties: this.scaledProperties.map((r) => ({ ...r })),
    };
  }

  /**
   * Returns all discoverable scalable properties from modules currently attached to the character.
   */
  public static getAvailableProperties(char: Character): DiscoverableScalableProperty[] {
    const list: DiscoverableScalableProperty[] = [];

    const bindProp = (
      key: string,
      label: string,
      category: string,
      unit: string,
      defaultCurve: GrowthCurveMode,
      getProp: (c: Character) => DynamicProperty | null | undefined,
      minClamp = 0.01
    ): DiscoverableScalableProperty => ({
      key,
      label,
      category,
      moduleLabel: category,
      unit,
      defaultCurve,
      getCurrentValue: (c) => {
        const p = getProp(c);
        return p ? p.get(c.properties) : 0;
      },
      applyValue: (c, val) => {
        const p = getProp(c);
        if (p) {
          p.set(Math.max(minClamp, val), c.properties);
        }
      },
    });

    // Energy Pool & Stamina
    if (char.energyPool) {
      list.push(
        bindProp(
          "stamina.maxStamina",
          "Max Stamina",
          "Stamina",
          "J",
          "cross_section",
          (c) => c.energyPool?.maxStaminaProp,
          50
        ),
        bindProp(
          "stamina.regenRate",
          "Stamina Regen Rate",
          "Stamina",
          "W",
          "cross_section",
          (c) => c.energyPool?.staminaRegenRateProp,
          10
        )
      );
    }

    // Health Module (scales both Max Health and Current Health proportionally!)
    if (char.healthModule) {
      list.push(
        {
          key: "health.maxHealth",
          label: "Health (Max & Current HP)",
          category: "Health",
          moduleLabel: "Health",
          unit: "HP",
          defaultCurve: "cross_section",
          getCurrentValue: (c) => (c.healthModule ? c.healthModule.getMaxHp(c.properties) : 100),
          applyValue: (c, val) => {
            if (!c.healthModule) return;
            const oldMax = Math.max(1, c.healthModule.getMaxHp(c.properties));
            const oldCur = c.healthModule.getCurrentHp(c.properties);
            const ratio = Math.max(0, Math.min(1, oldCur / oldMax));
            const newMax = Math.max(1, val);
            if (Math.abs(newMax - oldMax) > 0.05) {
              c.healthModule.maxHpProp.set(newMax, c.properties);
              c.healthModule.currentHpProp.set(newMax * ratio, c.properties);
            }
          },
        },
        bindProp(
          "health.regenRate",
          "Passive Health Regen Rate",
          "Health",
          "HP/s",
          "cross_section",
          (c) => c.healthModule?.maxHealRateProp,
          0
        ),
        bindProp(
          "health.maxPower",
          "Health Regen Max Power",
          "Health",
          "W",
          "cross_section",
          (c) => c.healthModule?.maxPowerProp,
          10
        )
      );
    }

    // Walking & Sprinting
    if (char.walkingModule) {
      list.push(
        bindProp(
          "walk.maxWalkSpeed",
          "Max Walk Speed",
          "Locomotion",
          "m/s",
          "cbrt",
          (c) => c.walkingModule?.maxWalkSpeedProp,
          0.2
        ),
        bindProp(
          "walk.maxWalkForce",
          "Max Walk Force (Accel)",
          "Locomotion",
          "N",
          "cross_section",
          (c) => c.walkingModule?.maxWalkForceProp,
          0.5
        ),
        bindProp(
          "walk.maxWalkPower",
          "Max Walk Power",
          "Locomotion",
          "W",
          "cross_section",
          (c) => c.walkingModule?.maxWalkPowerProp,
          10
        ),
        bindProp(
          "walk.maxSprintSpeed",
          "Max Sprint Speed",
          "Locomotion",
          "m/s",
          "cbrt",
          (c) => c.walkingModule?.maxSprintSpeedProp,
          0.5
        ),
        bindProp(
          "walk.maxSprintPower",
          "Max Sprint Power",
          "Locomotion",
          "W",
          "cross_section",
          (c) => c.walkingModule?.maxSprintPowerProp,
          10
        )
      );
    }

    // Jumping
    if (char.jumpModule) {
      list.push(
        bindProp(
          "jump.jumpStrength",
          "Jump Impulse Strength",
          "Jump",
          "N·s",
          "cross_section",
          (c) => c.jumpModule?.jumpStrengthProp,
          0.5
        ),
        bindProp(
          "jump.maxInitialSpeed",
          "Max Jump Takeoff Speed",
          "Jump",
          "m/s",
          "cbrt",
          (c) => c.jumpModule?.maxInitialSpeedProp,
          0.5
        ),
        bindProp(
          "jump.maxPower",
          "Jump Max Power",
          "Jump",
          "J",
          "cross_section",
          (c) => c.jumpMaxPowerProp,
          10
        )
      );
    }

    // Climbing
    if (char.climbingModule) {
      list.push(
        bindProp(
          "climb.maxClimbSpeed",
          "Max Climb Speed",
          "Climbing",
          "m/s",
          "cbrt",
          (c) => c.climbingModule?.maxClimbSpeedProp,
          0.2
        ),
        bindProp(
          "climb.maxAdhesion",
          "Max Climb Adhesion Force",
          "Climbing",
          "N",
          "cross_section",
          (c) => c.climbingModule?.maxAdhesionProp,
          5
        ),
        bindProp(
          "climb.maxPower",
          "Climb Max Power",
          "Climbing",
          "W",
          "cross_section",
          (c) => c.climbingModule?.maxPowerProp,
          10
        )
      );
    }

    // Roll Movement
    if (char.rollMovementModule) {
      list.push(
        bindProp(
          "roll.baseAcceleration",
          "Roll Base Acceleration",
          "Roll",
          "u/s²",
          "cross_section",
          (c) => c.rollMovementModule?.baseAccelerationProp,
          1
        ),
        bindProp(
          "roll.sprintAcceleration",
          "Roll Sprint Acceleration",
          "Roll",
          "u/s²",
          "cross_section",
          (c) => c.rollMovementModule?.sprintAccelerationProp,
          1
        ),
        bindProp(
          "roll.maxPower",
          "Roll Max Power",
          "Roll",
          "W",
          "cross_section",
          (c) => c.rollMovementModule?.maxRollPowerProp,
          10
        ),
        bindProp(
          "roll.maxSprintPower",
          "Roll Sprint Max Power",
          "Roll",
          "W",
          "cross_section",
          (c) => c.rollMovementModule?.maxSprintPowerProp,
          10
        )
      );
    }

    // Pickup
    if (char.pickupModule) {
      list.push(
        bindProp(
          "pickup.pickupReach",
          "Pickup Grab Reach",
          "Interaction",
          "m",
          "cbrt",
          (c) => c.pickupModule?.pickupReachProp,
          0.15
        ),
        bindProp(
          "pickup.maxPower",
          "Pickup Max Power",
          "Interaction",
          "W",
          "cross_section",
          (c) => c.pickupModule?.maxPowerProp,
          5
        )
      );
    }

    // Grapple
    if (char.grappleModule) {
      list.push(
        bindProp(
          "grapple.grappleReach",
          "Grapple Reach",
          "Interaction",
          "m",
          "cbrt",
          (c) => c.grappleModule?.grappleReachProp,
          0.15
        ),
        bindProp(
          "grapple.shoveImpulse",
          "Shove Impulse",
          "Interaction",
          "N·s",
          "cross_section",
          (c) => c.grappleModule?.shoveImpulseProp,
          1
        ),
        bindProp(
          "grapple.maxPower",
          "Grapple Max Power",
          "Interaction",
          "W",
          "cross_section",
          (c) => c.grappleModule?.maxPowerProp,
          5
        )
      );
    }

    // Throw
    if (char.throwModule) {
      list.push(
        bindProp(
          "throw.maxThrowSpeed",
          "Max Throw Speed",
          "Interaction",
          "m/s",
          "cbrt",
          (c) => c.throwModule?.maxThrowSpeedProp,
          1
        ),
        bindProp(
          "throw.maxPower",
          "Throw Max Power",
          "Interaction",
          "J",
          "cross_section",
          (c) => c.throwModule?.maxPowerProp,
          10
        )
      );
    }

    // Consume (Eating Speed)
    if (char.consumeModule) {
      list.push(
        bindProp(
          "consume.speedMult",
          "Eat Speed Multiplier",
          "Interaction",
          "x",
          "cross_section",
          (c) => c.consumeModule?.consumptionSpeedMultiplierProp,
          0.1
        )
      );
    }

    // Laser
    if (char.laserModule) {
      list.push(
        bindProp(
          "laser.maxPower",
          "Laser Max Power",
          "Combat",
          "W",
          "cross_section",
          (c) => c.laserModule?.maxPowerProp,
          10
        ),
        bindProp(
          "laser.damageRate",
          "Laser Damage Rate",
          "Combat",
          "HP/s",
          "cross_section",
          (c) => c.laserModule?.damageRateProp,
          1
        ),
        bindProp(
          "laser.maxDamageRate",
          "Laser Max Damage Rate",
          "Combat",
          "HP/s",
          "cross_section",
          (c) => c.laserModule?.maxDamageRateProp,
          1
        ),
        bindProp(
          "laser.thickness",
          "Laser Beam Thickness",
          "Combat",
          "m",
          "cbrt",
          (c) => c.laserModule?.thicknessProp,
          0.02
        )
      );
    }

    // Melee
    if (char.meleeModule) {
      list.push(
        bindProp(
          "melee.maxForce",
          "Melee Max Force",
          "Combat",
          "N",
          "cross_section",
          (c) => c.meleeModule?.maxForceProp,
          10
        ),
        bindProp(
          "melee.maxPower",
          "Melee Max Power",
          "Combat",
          "J",
          "cross_section",
          (c) => c.meleeModule?.maxPowerProp,
          10
        ),
        bindProp(
          "melee.reach",
          "Melee Reach",
          "Combat",
          "m",
          "cbrt",
          (c) => c.meleeModule?.reachProp,
          0.2
        ),
        bindProp(
          "melee.width",
          "Melee Width",
          "Combat",
          "m",
          "cbrt",
          (c) => c.meleeModule?.widthProp,
          0.2
        )
      );
    }

    // Vomit Module
    if (char.vomitModule) {
      list.push(
        bindProp(
          "vomit.energyPerGlob",
          "Vomit Glob Energy",
          "Combat",
          "J",
          "cross_section",
          (c) => c.vomitModule?.energyPerGlobProp,
          50
        ),
        bindProp(
          "vomit.launchSpeed",
          "Vomit Launch Speed",
          "Combat",
          "m/s",
          "cbrt",
          (c) => c.vomitModule?.launchSpeedProp,
          1.0
        )
      );
    }

    return list;
  }
}
