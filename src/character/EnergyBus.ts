import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { EnergyPool } from "./EnergyPool.js";

/**
 * EnergyBus: Models muscle output throughput in Watts and burst stamina.
 * Throttles or feeds connected abilities (sprinting, jumping, throwing, climbing, healing).
 */
export class EnergyBus {
  public id: string;
  public name: string;
  public enabled = true;

  // Maximum continuous/burst power output in Watts
  public baseMaxPowerProp: DynamicProperty;
  public maxPowerProp: DynamicProperty;

  // Burst stamina reservoir (in seconds of sustained maximum effort)
  public baseMaxStaminaProp: DynamicProperty;
  public maxStaminaProp: DynamicProperty;
  public currentStaminaProp: DynamicProperty;

  // Stamina regeneration rate (stamina units per second when not exhausted or under light draw)
  public staminaRegenRateProp: DynamicProperty;

  /**
   * Exhaustion threshold: when stamina hits 0, bus becomes exhausted.
   * Remains exhausted until stamina recovers back to recoveryThresholdRatio (default 20%).
   */
  public isExhausted: boolean = false;
  public recoveryThresholdRatio: number = 0.20;

  // Live telemetry for DevPanel
  public livePowerDraw: number = 0;

  constructor(options?: {
    id?: string;
    name?: string;
    baseMaxPower?: number;
    maxPower?: number;
    baseMaxStamina?: number;
    maxStamina?: number;
    currentStamina?: number;
    staminaRegenRate?: number;
    enabled?: boolean;
  }) {
    this.id = options?.id ?? "bus_main";
    this.name = options?.name ?? "Main";

    const basePower = options?.baseMaxPower ?? 250.0;
    const maxPower = options?.maxPower ?? basePower;

    const baseStamina = options?.baseMaxStamina ?? 100.0;
    const maxStamina = options?.maxStamina ?? baseStamina;
    const curStamina = options?.currentStamina ?? maxStamina;

    this.baseMaxPowerProp = new DynamicProperty(basePower);
    this.maxPowerProp = new DynamicProperty(maxPower);

    this.baseMaxStaminaProp = new DynamicProperty(baseStamina);
    this.maxStaminaProp = new DynamicProperty(maxStamina);
    this.currentStaminaProp = new DynamicProperty(curStamina);

    this.staminaRegenRateProp = new DynamicProperty(options?.staminaRegenRate ?? 15.0);

    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public getMaxPower(registry?: ObjectPropertiesRegistry): number {
    return this.maxPowerProp.get(registry);
  }

  public getMaxStamina(registry?: ObjectPropertiesRegistry): number {
    return this.maxStaminaProp.get(registry);
  }

  public getCurrentStamina(registry?: ObjectPropertiesRegistry): number {
    return this.currentStaminaProp.get(registry);
  }

  public getStaminaRegenRate(registry?: ObjectPropertiesRegistry): number {
    return this.staminaRegenRateProp.get(registry);
  }

  /**
   * Requests power draw (in Watts) over dt seconds.
   * Consumes Joules (power * dt) from the supplied pool, drains stamina if drawing heavy power,
   * or recovers stamina if draw is low/zero.
   * Returns the actual power granted (in Watts).
   */
  public requestPower(
    requestedPowerWatts: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false
  ): number {
    if (!this.enabled || dt <= 0) {
      this.livePowerDraw = 0;
      return 0;
    }

    const maxP = this.getMaxPower(registry);
    const curS = this.getCurrentStamina(registry);

    // If currently exhausted and ability does not allow execution during exhaustion, reject request
    if (this.isExhausted && !allowWhenExhausted) {
      this.livePowerDraw = 0;
      return 0;
    }

    // Cap requested power to bus maximum
    const targetWatts = Math.min(requestedPowerWatts, maxP);
    const energyNeededJoules = targetWatts * dt;

    // Check pool availability
    if (pool && !pool.consume(energyNeededJoules, registry)) {
      // Energy pool empty! Exhaust immediately
      this.isExhausted = true;
      this.currentStaminaProp.set(0, registry);
      this.livePowerDraw = 0;
      return 0;
    }

    // High effort drains stamina proportionally
    if (targetWatts > maxP * 0.4) {
      const drainRatio = (targetWatts - maxP * 0.4) / (maxP * 0.6);
      const staminaDrain = drainRatio * 20.0 * dt;
      const nextS = Math.max(0, curS - staminaDrain);
      this.currentStaminaProp.set(nextS, registry);

      if (nextS <= 0.0001) {
        this.isExhausted = true;
      }
    }

    this.livePowerDraw = targetWatts;
    return targetWatts;
  }

  /**
   * Advances passive stamina regeneration when draw is below threshold.
   */
  public update(dt: number, pool?: EnergyPool | null, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || dt <= 0) return;

    const maxS = this.getMaxStamina(registry);
    let curS = this.getCurrentStamina(registry);
    const regen = this.getStaminaRegenRate(registry);

    // If exhausted, check if we recovered past the recovery threshold
    if (this.isExhausted) {
      const recoveryThreshold = maxS * this.recoveryThresholdRatio;
      if (curS >= recoveryThreshold) {
        this.isExhausted = false;
      }
    }

    // Recover stamina if below max
    if (curS < maxS) {
      curS = Math.min(maxS, curS + regen * dt);
      this.currentStaminaProp.set(curS, registry);
    }

    // If pool has 0 energy, stay exhausted
    if (pool && !pool.infiniteEnergy && pool.getCurrentEnergy(registry) <= 0.0001) {
      this.isExhausted = true;
    }
  }
}
