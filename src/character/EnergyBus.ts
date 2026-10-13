import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { EnergyPool } from "./EnergyPool.js";

/**
 * EnergyBus: Models muscle output throughput in Watts and burst stamina.
 * Stamina units represent sustained seconds of effort at maxPower.
 * Drawing energy at any level depletes stamina proportionally.
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

  // Stamina regeneration rate (stamina seconds recovered per second of rest)
  public staminaRegenRateProp: DynamicProperty;

  /**
   * Exhaustion threshold: when stamina hits 0, bus becomes exhausted.
   * Remains exhausted until stamina recovers back to recoveryThresholdRatio (default 20%).
   */
  public isExhausted: boolean = false;
  public recoveryThresholdRatio: number = 0.20;

  // Muscle mechanical-to-metabolic efficiency ratio (default 0.25 = 25% efficiency)
  public muscleEfficiencyProp: DynamicProperty;

  // Live telemetry for DevPanel & ability inspection
  public livePowerDraw: number = 0;
  public currentWattageProp: DynamicProperty;
  public hadPhysicalExertion: boolean = false;

  // Registered ability power demands for the current tick
  private _demands: Map<string, number> = new Map();
  private _totalDemand: number = 0;

  /**
   * Resets active demands and live power draw at the start of a tick.
   */
  public beginTick(): void {
    this._demands.clear();
    this._totalDemand = 0;
    this.livePowerDraw = 0;
    this.hadPhysicalExertion = false;
  }

  /**
   * Registers or updates an ability's power demand for the current tick.
   */
  public registerDemand(abilityId: string, demandedWatts: number): void {
    if (demandedWatts > 0.001) {
      this._demands.set(abilityId, demandedWatts);
    } else {
      this._demands.delete(abilityId);
    }
    let sum = 0;
    for (const d of this._demands.values()) {
      sum += d;
    }
    this._totalDemand = sum;
  }

  public getDemand(abilityId: string): number {
    return this._demands.get(abilityId) ?? 0;
  }

  public getTotalDemand(): number {
    return this._totalDemand;
  }

  public clearDemands(): void {
    this._demands.clear();
    this._totalDemand = 0;
  }

  constructor(options?: {
    id?: string;
    name?: string;
    baseMaxPower?: number;
    maxPower?: number;
    baseMaxStamina?: number;
    maxStamina?: number;
    currentStamina?: number;
    staminaRegenRate?: number;
    muscleEfficiency?: number;
    enabled?: boolean;
  }) {
    this.id = options?.id ?? "bus_main";
    this.name = options?.name ?? "Main";

    const basePower = options?.baseMaxPower ?? 500.0;
    const maxPower = options?.maxPower ?? basePower;

    const baseStamina = options?.baseMaxStamina ?? 10.0; // Default 10 seconds of max effort
    const maxStamina = options?.maxStamina ?? baseStamina;
    const curStamina = options?.currentStamina ?? maxStamina;

    this.baseMaxPowerProp = new DynamicProperty(basePower);
    this.maxPowerProp = new DynamicProperty(maxPower);

    this.baseMaxStaminaProp = new DynamicProperty(baseStamina);
    this.maxStaminaProp = new DynamicProperty(maxStamina);
    this.currentStaminaProp = new DynamicProperty(curStamina);

    this.staminaRegenRateProp = new DynamicProperty(options?.staminaRegenRate ?? 1.0);
    this.muscleEfficiencyProp = new DynamicProperty(options?.muscleEfficiency ?? 0.25);
    this.currentWattageProp = new DynamicProperty(0.0);

    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get muscleEfficiency(): number {
    return this.muscleEfficiencyProp.literalValue;
  }

  public set muscleEfficiency(val: number) {
    this.muscleEfficiencyProp.literalValue = Math.max(0.01, Math.min(1.0, val));
  }

  public getMuscleEfficiency(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0.01, Math.min(1.0, this.muscleEfficiencyProp.get(registry)));
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
   * Peeks how much power (in Watts) would be granted without consuming pool energy or draining stamina.
   */
  public peekPower(
    requestedPowerWatts: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false
  ): number {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }
    const maxP = this.getMaxPower(registry);
    const curS = this.getCurrentStamina(registry);
    if ((this.isExhausted && !allowWhenExhausted) || maxP <= 0 || curS <= 0.0001) {
      return 0;
    }

    let targetWatts = Math.min(requestedPowerWatts, maxP);
    if (this._totalDemand > maxP) {
      targetWatts = (requestedPowerWatts / this._totalDemand) * maxP;
    }
    if (targetWatts <= 0.0001) {
      return 0;
    }

    const maxWattsFromStamina = maxP * (curS / dt);
    targetWatts = Math.min(targetWatts, Math.max(0, maxWattsFromStamina));
    if (targetWatts <= 0.0001) {
      return 0;
    }

    if (pool) {
      if (pool.infiniteEnergy) return targetWatts;
      const curPoolE = pool.getCurrentEnergy(registry);
      if (curPoolE <= 0.0001) return 0;
      const energyNeededJoules = targetWatts * dt;
      const grantedJoules = Math.min(curPoolE, energyNeededJoules);
      return grantedJoules / dt;
    }

    return targetWatts;
  }

  /**
   * Requests power draw (in Watts) over dt seconds.
   * Depletes stamina whenever power > 0.
   */
  public requestPower(
    requestedPowerWatts: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false,
    abilityId?: string
  ): number {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }

    const maxP = this.getMaxPower(registry);
    const curS = this.getCurrentStamina(registry);

    // If exhausted and ability does not allow exertion during exhaustion, reject request
    if (this.isExhausted && !allowWhenExhausted) {
      return 0;
    }

    if (maxP <= 0) {
      return 0;
    }

    // If abilityId provided, update/register demand
    if (abilityId) {
      this.registerDemand(abilityId, requestedPowerWatts);
    }

    // 1. Multi-ability proportional rationing:
    // When multiple abilities combine to surpass max power capacity, each ability
    // is proportionally nerfed: (demanded / totalDemanded) * maxPower.
    let targetWatts = Math.min(requestedPowerWatts, maxP);
    if (this._totalDemand > maxP) {
      targetWatts = (requestedPowerWatts / this._totalDemand) * maxP;
    }

    if (targetWatts <= 0.0001) {
      return 0;
    }

    // 2. Cap targetWatts so stamina depletion does not exceed remaining stamina this frame
    // Equation: staminaDrain = (targetWatts / maxP) * dt <= curS  =>  targetWatts <= maxP * (curS / dt)
    const maxWattsFromStamina = maxP * (curS / dt);
    targetWatts = Math.min(targetWatts, Math.max(0, maxWattsFromStamina));

    if (targetWatts <= 0.0001) {
      this.isExhausted = true;
      return 0;
    }

    // 3. Pool energy availability check (partial consumption allowed)
    let grantedWatts = targetWatts;
    const energyNeededJoules = targetWatts * dt;
    if (pool) {
      const grantedJoules = pool.consumePartial(energyNeededJoules, registry);
      if (grantedJoules <= 0.0001) {
        this.isExhausted = true;
        return 0;
      }
      grantedWatts = grantedJoules / dt;
      if (pool.getCurrentEnergy(registry) <= 0.0001) {
        this.isExhausted = true;
      }
    }

    // 4. Drain stamina proportionally to actual granted power
    // Equation: current wattage / max wattage per second => staminaDrain = (grantedWatts / maxP) * dt
    if (grantedWatts > 0 && maxP > 0) {
      if (abilityId !== "health_regen") {
        this.hadPhysicalExertion = true;
        const staminaDrain = (grantedWatts / maxP) * dt;
        const nextS = Math.max(0, curS - staminaDrain);
        this.currentStaminaProp.set(nextS, registry);

        if (nextS <= 0.0001) {
          this.isExhausted = true;
        }
      }
    }

    this.livePowerDraw += grantedWatts;
    this.currentWattageProp.set(this.livePowerDraw, registry);
    return grantedWatts;
  }

  /**
   * Charges a discrete burst of metabolic energy (Joules) for an instantaneous action.
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
    const granted = this.requestPower(watts, dt, pool, registry, false, "burst_action");
    return watts > 0 ? Math.min(1, granted / watts) : 0;
  }

  /**
   * Advances passive stamina regeneration only when the bus is resting (0 power drawn).
   */
  public update(dt: number, pool?: EnergyPool | null, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || dt <= 0) return;

    // Publish final live power draw reading to currentWattageProp
    this.currentWattageProp.set(this.livePowerDraw, registry);
    this.livePowerDraw = 0;

    const maxS = this.getMaxStamina(registry);
    let curS = this.getCurrentStamina(registry);
    const regen = this.getStaminaRegenRate(registry);

    // If exhausted, check if stamina recovered past the threshold
    if (this.isExhausted) {
      const recoveryThreshold = maxS * this.recoveryThresholdRatio;
      if (curS >= recoveryThreshold) {
        this.isExhausted = false;
      }
    }

    // Recover stamina when physically resting (no physical exertion this tick)
    const isResting = !this.hadPhysicalExertion;
    if (isResting && curS < maxS) {
      curS = Math.min(maxS, curS + regen * dt);
      this.currentStaminaProp.set(curS, registry);
    }

    // If pool has 0 energy, stay exhausted
    if (pool && !pool.infiniteEnergy && pool.getCurrentEnergy(registry) <= 0.0001) {
      this.isExhausted = true;
    }

    this.hadPhysicalExertion = false;
  }
}