import { DynamicProperty, type ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

type PropertyMap = ObjectPropertiesRegistry;

export interface VomitModuleConfig {
  enabled?: boolean;
  energyPerGlob?: number;
  minRemainingEnergyFloor?: number;
  launchSpeed?: number;
  launchVerticalSpeed?: number;
  cooldownSeconds?: number;
  recoilMultiplier?: number;
  globColor?: string;
  consumableTag?: string;
  consumeRateWatts?: number;
}

/**
 * VomitModule configures Projectile Vomit: expelling a chunk of stored caloric energy
 * from the character's EnergyPool as a physical ballistic consumable glob.
 * Because stored energy drops immediately, any attached EnergyGrowthModule shrinks
 * the character and reduces its mass by the exact mass transferred into the glob.
 */
export class VomitModule {
  public enabled: boolean;

  /** Caloric energy (Joules) expelled per vomit glob (default: 1200 J). */
  public energyPerGlobProp: DynamicProperty;

  /** Minimum remaining energy floor (Joules) below which the character cannot vomit (default: 500 J). */
  public minRemainingEnergyFloorProp: DynamicProperty;

  /** Horizontal launch speed (u/s) of the expelled glob (default: 11.0 u/s). */
  public launchSpeedProp: DynamicProperty;

  /** Vertical takeoff speed (u/s) of the expelled glob (default: 4.5 u/s). */
  public launchVerticalSpeedProp: DynamicProperty;

  /** Minimum cooldown time (seconds) between vomit globs (default: 0.35 s). */
  public cooldownSecondsProp: DynamicProperty;

  /** Multiplier on physical conservation-of-momentum recoil applied to the character (default: 1.0). */
  public recoilMultiplierProp: DynamicProperty;

  /** Visual color of the spawned vomit glob. */
  public globColor: string;

  /** Consumable tag assigned to the spawned glob so creatures can eat it back up. */
  public consumableTag: string;

  /** Rate (Watts) at which the spawned glob can be re-consumed. */
  public consumeRateWatts: number;

  /** Runtime cooldown timer (seconds remaining). */
  public cooldownTimer: number = 0;

  /** Timestamp (performance.now) of the last vomit execution. */
  public lastVomitTimestamp: number = 0;

  constructor(config?: VomitModuleConfig) {
    this.enabled = config?.enabled ?? true;
    this.energyPerGlobProp = new DynamicProperty(config?.energyPerGlob ?? 1200);
    this.minRemainingEnergyFloorProp = new DynamicProperty(config?.minRemainingEnergyFloor ?? 500);
    this.launchSpeedProp = new DynamicProperty(config?.launchSpeed ?? 11.0);
    this.launchVerticalSpeedProp = new DynamicProperty(config?.launchVerticalSpeed ?? 4.5);
    this.cooldownSecondsProp = new DynamicProperty(config?.cooldownSeconds ?? 0.35);
    this.recoilMultiplierProp = new DynamicProperty(config?.recoilMultiplier ?? 1.0);
    this.globColor = config?.globColor ?? "#84cc16";
    this.consumableTag = config?.consumableTag ?? "food";
    this.consumeRateWatts = config?.consumeRateWatts ?? 900;
  }

  public getEnergyPerGlob(props?: PropertyMap): number {
    return Math.max(50, this.energyPerGlobProp.get(props));
  }

  public getMinRemainingEnergyFloor(props?: PropertyMap): number {
    return Math.max(0, this.minRemainingEnergyFloorProp.get(props));
  }

  public getLaunchSpeed(props?: PropertyMap): number {
    return Math.max(0.5, this.launchSpeedProp.get(props));
  }

  public getLaunchVerticalSpeed(props?: PropertyMap): number {
    return Math.max(0, this.launchVerticalSpeedProp.get(props));
  }

  public getCooldownSeconds(props?: PropertyMap): number {
    return Math.max(0.05, this.cooldownSecondsProp.get(props));
  }

  public getRecoilMultiplier(props?: PropertyMap): number {
    return Math.max(0, this.recoilMultiplierProp.get(props));
  }

  public toConfig(props?: PropertyMap): VomitModuleConfig {
    return {
      enabled: this.enabled,
      energyPerGlob: this.getEnergyPerGlob(props),
      minRemainingEnergyFloor: this.getMinRemainingEnergyFloor(props),
      launchSpeed: this.getLaunchSpeed(props),
      launchVerticalSpeed: this.getLaunchVerticalSpeed(props),
      cooldownSeconds: this.getCooldownSeconds(props),
      recoilMultiplier: this.getRecoilMultiplier(props),
      globColor: this.globColor,
      consumableTag: this.consumableTag,
      consumeRateWatts: this.consumeRateWatts,
    };
  }
}
