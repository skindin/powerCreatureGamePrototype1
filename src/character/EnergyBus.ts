import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { EnergyPool } from "./EnergyPool.js";

export interface DemandRecord {
  demandedWatts: number;
  allowPartialPower: boolean;
  order: number;
  lastRequestedTick: number;
}

/**
 * EnergyBus: Models muscle output throughput in Watts and burst stamina.
 * Stamina units represent sustained seconds of effort at maxPower.
 * Drawing energy at any level depletes stamina proportionally.
 *
 * Priority Model:
 * - Tier 1: Full-Power demands (!allowPartialPower) in FIFO order.
 * - Tier 2: Partial-Power demands (allowPartialPower) share remaining headroom proportionally.
 */
export class EnergyBus {
  public readonly id: string;
  public name: string;
  public enabled: boolean = true;

  // Sockets for live dynamic bus properties
  public baseMaxPowerProp: DynamicProperty;
  public maxPowerProp: DynamicProperty;

  public baseMaxStaminaProp: DynamicProperty;
  public maxStaminaProp: DynamicProperty;
  public currentStaminaProp: DynamicProperty;

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

  // Registered ability power demands
  private _demands: Map<string, DemandRecord> = new Map();
  private _totalDemand: number = 0;
  private _currentTick: number = 0;
  private _nextOrderId: number = 0;

  /**
   * Resets active demands and live power draw at the start of a tick.
   */
  public beginTick(): void {
    this.livePowerDraw = 0;
    this.hadPhysicalExertion = false;
  }

  /**
   * Registers or updates an ability's power demand.
   */
  public registerDemand(
    abilityId: string,
    demandedWatts: number,
    allowPartialPower: boolean = true
  ): void {
    if (demandedWatts > 0.001) {
      const existing = this._demands.get(abilityId);
      if (existing) {
        existing.demandedWatts = demandedWatts;
        existing.allowPartialPower = allowPartialPower;
        existing.lastRequestedTick = this._currentTick;
      } else {
        this._nextOrderId++;
        this._demands.set(abilityId, {
          demandedWatts,
          allowPartialPower,
          order: this._nextOrderId,
          lastRequestedTick: this._currentTick,
        });
      }
    } else {
      this._demands.delete(abilityId);
    }
    let sum = 0;
    for (const d of this._demands.values()) {
      sum += d.demandedWatts;
    }
    this._totalDemand = sum;
  }

  public getDemand(abilityId: string): number {
    return this._demands.get(abilityId)?.demandedWatts ?? 0;
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
   * Checks if the bus can satisfy 100% full power for the requested watts and dt
   * taking into account priority allocation, stamina, and energy pool.
   */
  public canSatisfyFullPower(
    demandedWatts: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    abilityId?: string
  ): boolean {
    if (!this.enabled || dt <= 0 || demandedWatts <= 0) return false;
    const maxP = this.getMaxPower(registry);
    const curS = this.getCurrentStamina(registry);
    if (this.isExhausted || maxP <= 0 || curS <= 0.0001) return false;

    // Check if bus capacity can accommodate this full-power demand alongside existing full-power demands
    let allocatedFull = 0;
    for (const [id, rec] of this._demands.entries()) {
      if (id !== abilityId && !rec.allowPartialPower) {
        if (allocatedFull + rec.demandedWatts <= maxP + 0.0001) {
          allocatedFull += rec.demandedWatts;
        }
      }
    }
    if (allocatedFull + demandedWatts > maxP + 0.0001) return false;

    // Check stamina
    const maxWattsFromStamina = maxP * (curS / dt);
    if (demandedWatts > maxWattsFromStamina + 0.001) return false;

    // Check pool energy
    if (pool && !pool.infiniteEnergy) {
      const curPoolE = pool.getCurrentEnergy(registry);
      if (curPoolE < demandedWatts * dt - 0.001) return false;
    }

    return true;
  }

  /**
   * Checks if the bus can satisfy 100% full energy for an instantaneous impulse action.
   */
  public canSatisfyFullEnergy(
    joules: number,
    minDt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry
  ): boolean {
    if (joules <= 0) return true;
    if (!this.enabled) return false;
    const maxP = Math.max(1, this.getMaxPower(registry));
    const dt = Math.max(minDt, joules / maxP);
    const watts = joules / dt;
    return this.canSatisfyFullPower(watts, dt, pool, registry, "burst_action");
  }

  /**
   * Peeks how much power (in Watts) would be granted without consuming pool energy or draining stamina.
   */
  public peekPower(
    requestedPowerWatts: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false,
    allowPartialPower: boolean = true,
    abilityId?: string
  ): number {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }
    const maxP = this.getMaxPower(registry);
    const curS = this.getCurrentStamina(registry);
    if ((this.isExhausted && !allowWhenExhausted) || maxP <= 0 || curS <= 0.0001) {
      return 0;
    }

    // Build temporary demand representation
    const fullDemands: { id: string; rec: DemandRecord }[] = [];
    const partialDemands: { id: string; rec: DemandRecord }[] = [];
    let includedCurrent = false;

    for (const [id, rec] of this._demands.entries()) {
      if (id === abilityId) {
        includedCurrent = true;
        const updatedRec = { ...rec, demandedWatts: requestedPowerWatts, allowPartialPower };
        if (!allowPartialPower) fullDemands.push({ id, rec: updatedRec });
        else partialDemands.push({ id, rec: updatedRec });
      } else {
        if (!rec.allowPartialPower) fullDemands.push({ id, rec });
        else partialDemands.push({ id, rec });
      }
    }

    if (!includedCurrent) {
      const dummyRec: DemandRecord = {
        demandedWatts: requestedPowerWatts,
        allowPartialPower,
        order: this._nextOrderId + 1,
        lastRequestedTick: this._currentTick,
      };
      if (!allowPartialPower) fullDemands.push({ id: abilityId ?? "__peek", rec: dummyRec });
      else partialDemands.push({ id: abilityId ?? "__peek", rec: dummyRec });
    }

    fullDemands.sort((a, b) => a.rec.order - b.rec.order);

    let allocatedFullWatts = 0;
    let thisFullAllocated = 0;
    for (const item of fullDemands) {
      if (allocatedFullWatts + item.rec.demandedWatts <= maxP + 0.0001) {
        allocatedFullWatts += item.rec.demandedWatts;
        if (item.id === (abilityId ?? "__peek")) {
          thisFullAllocated = item.rec.demandedWatts;
        }
      } else {
        if (item.id === (abilityId ?? "__peek")) {
          thisFullAllocated = 0;
        }
      }
    }

    let targetWatts = 0;
    if (!allowPartialPower) {
      targetWatts = thisFullAllocated;
      if (targetWatts < requestedPowerWatts - 0.001) return 0;
    } else {
      const remainingHeadroom = Math.max(0, maxP - allocatedFullWatts);
      let totalPartialDemanded = 0;
      for (const item of partialDemands) {
        totalPartialDemanded += item.rec.demandedWatts;
      }
      if (totalPartialDemanded <= remainingHeadroom + 0.0001) {
        targetWatts = requestedPowerWatts;
      } else if (totalPartialDemanded > 0.0001) {
        targetWatts = (requestedPowerWatts / totalPartialDemanded) * remainingHeadroom;
      } else {
        targetWatts = 0;
      }
    }

    if (targetWatts <= 0.0001) return 0;

    const maxWattsFromStamina = maxP * (curS / dt);
    if (!allowPartialPower && targetWatts > maxWattsFromStamina + 0.001) return 0;
    targetWatts = Math.min(targetWatts, Math.max(0, maxWattsFromStamina));
    if (targetWatts <= 0.0001) return 0;

    if (pool) {
      if (pool.infiniteEnergy) return targetWatts;
      const curPoolE = pool.getCurrentEnergy(registry);
      if (curPoolE <= 0.0001) return 0;
      const energyNeededJoules = targetWatts * dt;
      if (!allowPartialPower && curPoolE < energyNeededJoules - 0.001) return 0;
      const grantedJoules = Math.min(curPoolE, energyNeededJoules);
      return grantedJoules / dt;
    }

    return targetWatts;
  }

  /**
   * Requests power draw (in Watts) over dt seconds.
   * Priority Model:
   * - Tier 1: Full-power demands (!allowPartialPower) evaluated in FIFO order.
   * - Tier 2: Partial-power demands (allowPartialPower) share remaining headroom.
   */
  public requestPower(
    requestedPowerWatts: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false,
    abilityId?: string,
    allowPartialPower: boolean = true
  ): number {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }

    const maxP = this.getMaxPower(registry);
    const curS = this.getCurrentStamina(registry);

    if ((this.isExhausted && !allowWhenExhausted) || maxP <= 0 || curS <= 0.0001) {
      return 0;
    }

    if (abilityId) {
      this.registerDemand(abilityId, requestedPowerWatts, allowPartialPower);
    }

    // Two-tier priority allocation:
    const fullDemands: { id: string; rec: DemandRecord }[] = [];
    const partialDemands: { id: string; rec: DemandRecord }[] = [];

    for (const [id, rec] of this._demands.entries()) {
      if (!rec.allowPartialPower) {
        fullDemands.push({ id, rec });
      } else {
        partialDemands.push({ id, rec });
      }
    }
    fullDemands.sort((a, b) => a.rec.order - b.rec.order);

    let allocatedFullWatts = 0;
    let thisFullAllocated = 0;
    for (const item of fullDemands) {
      if (allocatedFullWatts + item.rec.demandedWatts <= maxP + 0.0001) {
        allocatedFullWatts += item.rec.demandedWatts;
        if (item.id === abilityId) {
          thisFullAllocated = item.rec.demandedWatts;
        }
      } else {
        if (item.id === abilityId) {
          thisFullAllocated = 0;
        }
      }
    }

    let targetWatts = 0;
    if (!allowPartialPower) {
      targetWatts = thisFullAllocated;
      if (targetWatts < requestedPowerWatts - 0.001) {
        // Full power demand could not be 100% satisfied
        return 0;
      }
    } else {
      const remainingHeadroom = Math.max(0, maxP - allocatedFullWatts);
      let totalPartialDemanded = 0;
      for (const item of partialDemands) {
        totalPartialDemanded += item.rec.demandedWatts;
      }
      if (totalPartialDemanded <= remainingHeadroom + 0.0001) {
        targetWatts = requestedPowerWatts;
      } else if (totalPartialDemanded > 0.0001) {
        targetWatts = (requestedPowerWatts / totalPartialDemanded) * remainingHeadroom;
      } else {
        targetWatts = 0;
      }
    }

    if (targetWatts <= 0.0001) {
      return 0;
    }

    // Stamina check
    const maxWattsFromStamina = maxP * (curS / dt);
    if (!allowPartialPower && targetWatts > maxWattsFromStamina + 0.001) {
      return 0;
    }
    targetWatts = Math.min(targetWatts, Math.max(0, maxWattsFromStamina));
    if (targetWatts <= 0.0001) {
      this.isExhausted = true;
      return 0;
    }

    // Pool energy check
    let grantedWatts = targetWatts;
    const energyNeededJoules = targetWatts * dt;
    if (pool) {
      if (!pool.infiniteEnergy) {
        const curPoolE = pool.getCurrentEnergy(registry);
        if (!allowPartialPower && curPoolE < energyNeededJoules - 0.001) {
          return 0;
        }
      }
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

    if (!allowPartialPower && grantedWatts < requestedPowerWatts - 0.001) {
      return 0;
    }

    // Drain stamina proportionally to actual granted power
    if (grantedWatts > 0 && maxP > 0) {
      this.hadPhysicalExertion = true;
      const staminaDrain = (grantedWatts / maxP) * dt;
      const nextS = Math.max(0, curS - staminaDrain);
      this.currentStaminaProp.set(nextS, registry);

      if (nextS <= 0.0001) {
        this.isExhausted = true;
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
    registry?: ObjectPropertiesRegistry,
    allowPartialPower: boolean = true
  ): number {
    if (joules <= 0) return 1;
    if (!this.enabled) return 0;
    const maxP = Math.max(1, this.getMaxPower(registry));
    const dt = Math.max(minDt, joules / maxP);
    const watts = joules / dt;
    if (!allowPartialPower && !this.canSatisfyFullEnergy(joules, minDt, pool, registry)) {
      return 0;
    }
    const granted = this.requestPower(watts, dt, pool, registry, false, "burst_action", allowPartialPower);
    return watts > 0 ? Math.min(1, granted / watts) : 0;
  }

  /**
   * Advances passive stamina regeneration only when the bus is resting (0 power drawn).
   * Also cleans up demands that were not requested in the tick.
   */
  public update(dt: number, pool?: EnergyPool | null, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || dt <= 0) return;

    this._currentTick++;
    // Prune demands that were not refreshed in the last tick
    for (const [id, rec] of this._demands.entries()) {
      if (rec.lastRequestedTick < this._currentTick - 1) {
        this._demands.delete(id);
      }
    }
    let sum = 0;
    for (const d of this._demands.values()) {
      sum += d.demandedWatts;
    }
    this._totalDemand = sum;

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