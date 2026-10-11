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

  // Live telemetry for DevPanel & ability inspection
  public livePowerDraw: number = 0;
  public currentWattageProp: DynamicProperty;

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
    this.currentWattageProp = new DynamicProperty(0.0);

    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public getCurrentWattage(registry?: ObjectPropertiesRegistry): number {
    return this.currentWattageProp.get(registry);
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

    // 1. Initial power capped by bus maximum
    let targetWatts = Math.min(requestedPowerWatts, maxP);
    if (targetWatts <= 0) {
      this.livePowerDraw = 0;
      return 0;
    }

    // 2. If high effort, cap targetWatts so that stamina drain does not exceed remaining stamina
    // Formula for stamina drain: drainRatio = (W - 0.4*maxP) / (0.6*maxP)
    // drain = drainRatio * 20.0 * dt
    // If curS is small, maximum allowed drain is curS:
    if (targetWatts > maxP * 0.4) {
      const maxDrain = curS;
      if (maxDrain <= 0.0001) {
        // No stamina available for high-power exertion!
        // Cap targetWatts to threshold power (40% of maxP)
        targetWatts = maxP * 0.4;
      } else {
        const maxDrainRatio = maxDrain / (20.0 * dt);
        const maxWattsFromStamina = maxP * 0.4 + maxDrainRatio * (maxP * 0.6);
        targetWatts = Math.min(targetWatts, maxWattsFromStamina);
      }
    }

    // 3. Pool energy availability check (partial consumption allowed)
    let grantedWatts = targetWatts;
    const energyNeededJoules = targetWatts * dt;
    if (pool) {
      const grantedJoules = pool.consumePartial(energyNeededJoules, registry);
      if (grantedJoules <= 0.0001) {
        // Completely out of energy
        this.isExhausted = true;
        this.currentStaminaProp.set(0, registry);
        this.livePowerDraw = 0;
        return 0;
      }
      grantedWatts = grantedJoules / dt;
      if (pool.getCurrentEnergy(registry) <= 0.0001) {
        this.isExhausted = true;
      }
    }

    // 4. Drain stamina based on actual granted power
    if (grantedWatts > maxP * 0.4) {
      const drainRatio = (grantedWatts - maxP * 0.4) / (maxP * 0.6);
      const staminaDrain = drainRatio * 20.0 * dt;
      const nextS = Math.max(0, curS - staminaDrain);
      this.currentStaminaProp.set(nextS, registry);

      if (nextS <= 0.0001) {
        this.isExhausted = true;
      }
    }

    this.livePowerDraw = grantedWatts;
    this.currentWattageProp.set(grantedWatts, registry);
    return grantedWatts;
  }

  /**
   * Charges a discrete burst of metabolic energy (Joules) for an instantaneous action
   * (jump, throw, grab). The action is spread over max(minDt, joules / maxPower) so the
   * bus power cap is respected while the FULL Joule cost is still charged.
   * Returns the fraction (0..1) of the requested energy that could be supplied.
   */
  public requestEnergy(
    joules: number,
    minDt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry
  ): number {
    if (joules <= 0) return 1;
    if (!this.enabled) return 0;
    const maxP = Math.max(1, this.getMaxPower(registry));
    const dt = Math.max(minDt, joules / maxP);
    const watts = joules / dt;
    const granted = this.requestPower(watts, dt, pool, registry);
    return watts > 0 ? Math.min(1, granted / watts) : 0;
  }

  /**
   * Advances passive stamina regeneration when draw is below threshold.
   */
  public update(dt: number, pool?: EnergyPool | null, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || dt <= 0) return;

    // Decay live power draw reading if no power was requested this tick
    this.currentWattageProp.set(this.livePowerDraw, registry);
    this.livePowerDraw = 0;

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
