import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";

export interface GunModuleOptions {
  enabled?: boolean;
  fireRate?: number;         // Rounds per second (Hz)
  damagePerBullet?: number;  // Damage per bullet
  bulletSpeed?: number;      // Projectile velocity (units / sec)
  firingSeconds?: number;    // Continuous fire duration before overheat (seconds)
  cooldownTime?: number;     // Time to fully cool down from overheat (seconds)
  bulletMass?: number;       // Mass per bullet (kg) determining recoil & knockback
  gunLength?: number;        // Visual barrel length (units)
  gunWidth?: number;         // Visual barrel width (units)
  bulletColor?: string;      // Visual streak color (e.g. #f59e0b)
}

/**
 * GunModule
 * 
 * Equips freebody items with kinetic ballistic projectile firing capabilities.
 * Supports fire rate, bullet damage, projectile velocity, recoil/knockback physics,
 * continuous fire duration, and overheat cooldown.
 */
export class GunModule {
  public id = "gun";
  public name = "Gun";
  public enabled = true;
  public readonly primaryAbilityType: string = "gun";

  /** Fire rate in rounds per second (Hz) */
  public fireRateProp: DynamicProperty;

  /** Physical damage inflicted per bullet */
  public damagePerBulletProp: DynamicProperty;

  /** Speed of bullet in world units per second */
  public bulletSpeedProp: DynamicProperty;

  /** Continuous firing duration in seconds before reaching 100% heat and overheating */
  public firingSecondsProp: DynamicProperty;

  /** Cooldown time in seconds to dissipate 100% heat back to 0% */
  public cooldownTimeProp: DynamicProperty;

  /** Mass per bullet in kg (scales shooter kickback and target knockback momentum) */
  public bulletMassProp: DynamicProperty;

  /** Visual dimensions when held */
  public gunLength: number = 0.55;
  public gunWidth: number = 0.22;
  public bulletColor: string = "#f59e0b";

  /** Live heat state: 0.0 (cold) to 1.0 (overheated) */
  public heat: number = 0.0;
  public isOverheated: boolean = false;

  /** Time since last fired shot in seconds */
  public timeSinceLastShot: number = 999.0;

  constructor(options: GunModuleOptions = {}) {
    if (options.enabled !== undefined) this.enabled = options.enabled;

    this.fireRateProp = new DynamicProperty(options.fireRate ?? 6.0);
    this.damagePerBulletProp = new DynamicProperty(options.damagePerBullet ?? 15.0);
    this.bulletSpeedProp = new DynamicProperty(options.bulletSpeed ?? 28.0);
    this.firingSecondsProp = new DynamicProperty(options.firingSeconds ?? 2.5);
    this.cooldownTimeProp = new DynamicProperty(options.cooldownTime ?? 1.5);
    this.bulletMassProp = new DynamicProperty(options.bulletMass ?? 0.06);

    if (options.gunLength !== undefined) this.gunLength = options.gunLength;
    if (options.gunWidth !== undefined) this.gunWidth = options.gunWidth;
    if (options.bulletColor !== undefined) this.bulletColor = options.bulletColor;
  }

  // --- Getters & Dynamic Property Accessors ---
  public get fireRate(): number { return this.fireRateProp.literalValue; }
  public set fireRate(val: number) { this.fireRateProp.literalValue = Math.max(0.1, val); }

  public get damagePerBullet(): number { return this.damagePerBulletProp.literalValue; }
  public set damagePerBullet(val: number) { this.damagePerBulletProp.literalValue = Math.max(1.0, val); }

  public get bulletSpeed(): number { return this.bulletSpeedProp.literalValue; }
  public set bulletSpeed(val: number) { this.bulletSpeedProp.literalValue = Math.max(1.0, val); }

  public get firingSeconds(): number { return Math.max(0.1, this.firingSecondsProp.literalValue); }
  public set firingSeconds(val: number) { this.firingSecondsProp.literalValue = Math.max(0.1, val); }

  public get cooldownTime(): number { return Math.max(0.1, this.cooldownTimeProp.literalValue); }
  public set cooldownTime(val: number) { this.cooldownTimeProp.literalValue = Math.max(0.1, val); }

  public get bulletMass(): number { return this.bulletMassProp.literalValue; }
  public set bulletMass(val: number) { this.bulletMassProp.literalValue = Math.max(0.001, val); }

  public getFireRate(registry?: ObjectPropertiesRegistry): number { return this.fireRateProp.get(registry); }
  public getDamagePerBullet(registry?: ObjectPropertiesRegistry): number { return this.damagePerBulletProp.get(registry); }
  public getBulletSpeed(registry?: ObjectPropertiesRegistry): number { return this.bulletSpeedProp.get(registry); }
  public getFiringSeconds(registry?: ObjectPropertiesRegistry): number { return Math.max(0.1, this.firingSecondsProp.get(registry)); }
  public getCooldownTime(registry?: ObjectPropertiesRegistry): number { return Math.max(0.1, this.cooldownTimeProp.get(registry)); }
  public getBulletMass(registry?: ObjectPropertiesRegistry): number { return this.bulletMassProp.get(registry); }

  /** Calculated Damage Per Second (DPS) */
  public get dps(): number {
    return this.damagePerBullet * this.fireRate;
  }

  /**
   * Updates heat and cooling timers per simulation tick.
   */
  public update(dt: number, isFiringNow: boolean): void {
    this.timeSinceLastShot += dt;

    if (!isFiringNow) {
      // Dissipate heat towards 0
      const coolRate = 1.0 / this.cooldownTime;
      this.heat = Math.max(0.0, this.heat - coolRate * dt);

      // Once fully cooled down, reset overheat lockout
      if (this.isOverheated && this.heat <= 0.01) {
        this.heat = 0.0;
        this.isOverheated = false;
      }
    }
  }

  /**
   * Checks whether the gun can fire a bullet this frame.
   */
  public canFire(): boolean {
    if (!this.enabled || this.isOverheated) return false;
    const shotInterval = 1.0 / Math.max(0.1, this.fireRate);
    return this.timeSinceLastShot >= shotInterval;
  }

  /**
   * Records a fired shot: advances heat and resets shot interval.
   */
  public recordShot(): void {
    this.timeSinceLastShot = 0.0;
    const heatPerShot = (1.0 / Math.max(0.1, this.fireRate)) / this.firingSeconds;
    this.heat = Math.min(1.0, this.heat + heatPerShot);

    if (this.heat >= 0.999) {
      this.heat = 1.0;
      this.isOverheated = true;
    }
  }

  public registerProperties(_registry: ObjectPropertiesRegistry): void {
    // Sockets evaluate against object-scoped registry dynamically
  }

  public toJSON(): Record<string, any> {
    return {
      enabled: this.enabled,
      fireRate: this.fireRate,
      damagePerBullet: this.damagePerBullet,
      bulletSpeed: this.bulletSpeed,
      firingSeconds: this.firingSeconds,
      cooldownTime: this.cooldownTime,
      bulletMass: this.bulletMass,
      gunLength: this.gunLength,
      gunWidth: this.gunWidth,
      bulletColor: this.bulletColor,
    };
  }

  public fromJSON(data: Record<string, any>): void {
    if (data.enabled !== undefined) this.enabled = data.enabled;
    if (data.fireRate !== undefined) this.fireRateProp.literalValue = data.fireRate;
    if (data.damagePerBullet !== undefined) this.damagePerBulletProp.literalValue = data.damagePerBullet;
    if (data.bulletSpeed !== undefined) this.bulletSpeedProp.literalValue = data.bulletSpeed;
    if (data.firingSeconds !== undefined) this.firingSecondsProp.literalValue = data.firingSeconds;
    if (data.cooldownTime !== undefined) this.cooldownTimeProp.literalValue = data.cooldownTime;
    if (data.bulletMass !== undefined) this.bulletMassProp.literalValue = data.bulletMass;
    if (data.gunLength !== undefined) this.gunLength = data.gunLength;
    if (data.gunWidth !== undefined) this.gunWidth = data.gunWidth;
    if (data.bulletColor !== undefined) this.bulletColor = data.bulletColor;
  }
}
