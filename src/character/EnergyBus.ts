import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { EnergyPool } from "./EnergyPool.js";

export interface DemandRecord {
  demandedWatts: number;
  allowPartialPower: boolean;
  order: number;
  lastRequestedTick: number;
}

export interface ActivePowerAllocation {
  id: string;
  name: string;
  color: string;
  demandedWatts: number;
  grantedWatts: number;
  fraction: number;
  allowPartialPower: boolean;
  order: number;
  isBurst?: boolean;
  burstTimer?: number;
  lastTick?: number;
}

export const ABILITY_METADATA: Record<string, { name: string; color: string }> = {
  sprint: { name: "Sprint", color: "#f59e0b" },
  walk: { name: "Walk", color: "#38bdf8" },
  jump: { name: "Jump", color: "#ec4899" },
  climb: { name: "Climb", color: "#a855f7" },
  health_regen: { name: "Heal", color: "#22c55e" },
  pickup: { name: "Pickup", color: "#eab308" },
  throw: { name: "Throw", color: "#f43f5e" },
  instant_burst: { name: "Burst", color: "#ec4899" },
};

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

  // Dynamically tracks whether continuous locomotion is currently sprinting or walking
  public activeLocomotionId: string = "sprint";

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

  // Active color-coded power allocations for visualization and telemetry
  private _activeAllocations: Map<string, ActivePowerAllocation> = new Map();

  // Retains peak power spike between render frames to prevent multi-tick fixed timesteps from dropping spikes
  public recentPeakWattage: number = 0;
  public recentPeakHoldTimer: number = 0;

  /**
   * Returns active power allocations sorted chronologically by activation order (stacking left to right).
   * Automatically readjusts prior partial-power allocations when full-power abilities (continuous or burst)
   * consume bus headroom, ensuring full-power abilities get their exact demanded bar share without being clipped.
   */
  public getActiveAllocations(registry?: ObjectPropertiesRegistry): ActivePowerAllocation[] {
    const list = Array.from(this._activeAllocations.values());
    if (list.length === 0) return [];

    const maxP = Math.max(1, this.getMaxPower(registry));

    // Separate into full-power and partial-power demands
    const fullAllocs: ActivePowerAllocation[] = [];
    const partialAllocs: ActivePowerAllocation[] = [];

    for (const alloc of list) {
      if (!alloc.allowPartialPower) {
        fullAllocs.push(alloc);
      } else {
        partialAllocs.push(alloc);
      }
    }

    fullAllocs.sort((a, b) => a.order - b.order);

    let allocatedFullWatts = 0;
    for (const alloc of fullAllocs) {
      if (allocatedFullWatts + alloc.demandedWatts <= maxP + 0.0001) {
        alloc.grantedWatts = alloc.demandedWatts;
        alloc.fraction = 1.0;
        allocatedFullWatts += alloc.demandedWatts;
      } else {
        alloc.grantedWatts = 0;
        alloc.fraction = 0;
      }
    }

    const remainingHeadroom = Math.max(0, maxP - allocatedFullWatts);
    let totalPartialDemanded = 0;
    for (const alloc of partialAllocs) {
      totalPartialDemanded += alloc.demandedWatts;
    }

    for (const alloc of partialAllocs) {
      if (totalPartialDemanded <= remainingHeadroom + 0.0001) {
        alloc.grantedWatts = alloc.demandedWatts;
        alloc.fraction = 1.0;
      } else if (totalPartialDemanded > 0.0001) {
        alloc.grantedWatts = (alloc.demandedWatts / totalPartialDemanded) * remainingHeadroom;
        alloc.fraction = alloc.grantedWatts / alloc.demandedWatts;
      } else {
        alloc.grantedWatts = 0;
        alloc.fraction = 0;
      }
    }

    return list.sort((a, b) => a.order - b.order);
  }

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
    const effectiveAbilityId = abilityId === "locomotion" ? this.activeLocomotionId : abilityId;
    if (demandedWatts > 0.001) {
      const existing = this._demands.get(effectiveAbilityId);
      if (existing) {
        existing.demandedWatts = demandedWatts;
        existing.allowPartialPower = allowPartialPower;
        existing.lastRequestedTick = this._currentTick;
      } else {
        this._nextOrderId++;
        this._demands.set(effectiveAbilityId, {
          demandedWatts,
          allowPartialPower,
          order: this._nextOrderId,
          lastRequestedTick: this._currentTick,
        });
      }
    } else {
      this._demands.delete(effectiveAbilityId);
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
    const val = this.currentWattageProp.get(registry);
    return Math.max(val, this.recentPeakWattage);
  }

  public getMaxPower(registry?: ObjectPropertiesRegistry): number {
    return this.maxPowerProp.get(registry);
  }

  public getMaxStamina(registry?: ObjectPropertiesRegistry): number {
    return this.maxStaminaProp.get(registry);
  }

  public get currentStamina(): number {
    return this.currentStaminaProp.literalValue;
  }

  public set currentStamina(val: number) {
    this.currentStaminaProp.literalValue = Math.max(0, val);
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
   * Instant burst actions are limited by available burst capacity: currentStamina * maxPower.
   */
  public canSatisfyFullEnergy(
    joules: number,
    _minDt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry
  ): boolean {
    if (joules <= 0) return true;
    if (!this.enabled) return false;
    if (this.isExhausted) return false;
    const maxP = Math.max(1, this.getMaxPower(registry));
    const curStamina = this.getCurrentStamina(registry);
    const maxBurstCapacity = curStamina * maxP;
    if (joules > maxBurstCapacity) return false;
    if (pool && !pool.infiniteEnergy && pool.getCurrentEnergy(registry) < joules) return false;
    return true;
  }

  /**
   * Evaluates whether the bus has sufficient burst stamina, energy pool reserves,
   * and power rating to support the requested power in isolation (assuming zero
   * other abilities are drawing power).
   * Used to distinguish between true exhaustion (which untoggles abilities like sprint)
   * versus temporary contention starvation from competing abilities.
   */
  public canSupportPowerInIsolation(
    _demandedWatts: number,
    minWattsThreshold: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry
  ): boolean {
    if (!this.enabled || dt <= 0) return false;
    if (this.isExhausted) return false;
    const curStamina = this.getCurrentStamina(registry);
    if (curStamina <= 0.001) return false;

    const maxP = this.getMaxPower(registry);
    if (maxP < minWattsThreshold - 0.001) return false;

    if (pool && !pool.infiniteEnergy) {
      const curEnergy = pool.getCurrentEnergy(registry);
      if (curEnergy < minWattsThreshold * dt - 0.001) return false;
    }

    return true;
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
    const effectiveAbilityId = abilityId === "locomotion" ? this.activeLocomotionId : abilityId;
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
      if (id === effectiveAbilityId) {
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
      if (!allowPartialPower) fullDemands.push({ id: effectiveAbilityId ?? "__peek", rec: dummyRec });
      else partialDemands.push({ id: effectiveAbilityId ?? "__peek", rec: dummyRec });
    }

    fullDemands.sort((a, b) => a.rec.order - b.rec.order);

    let allocatedFullWatts = 0;
    let thisFullAllocated = 0;
    for (const item of fullDemands) {
      if (allocatedFullWatts + item.rec.demandedWatts <= maxP + 0.0001) {
        allocatedFullWatts += item.rec.demandedWatts;
        if (item.id === (effectiveAbilityId ?? "__peek")) {
          thisFullAllocated = item.rec.demandedWatts;
        }
      } else {
        if (item.id === (effectiveAbilityId ?? "__peek")) {
          thisFullAllocated = 0;
        }
      }
    }

    // Include active full-power bursts (e.g. Jump) in full power allocation
    for (const alloc of this._activeAllocations.values()) {
      if (alloc.isBurst && !alloc.allowPartialPower && alloc.burstTimer && alloc.burstTimer > 0) {
        if (alloc.id !== effectiveAbilityId) {
          allocatedFullWatts += alloc.grantedWatts;
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

    const effectiveAbilityId = abilityId === "locomotion" ? this.activeLocomotionId : abilityId;
    const maxP = this.getMaxPower(registry);
    const curS = this.getCurrentStamina(registry);

    if ((this.isExhausted && !allowWhenExhausted) || maxP <= 0 || curS <= 0.0001) {
      return 0;
    }

    if (effectiveAbilityId) {
      this.registerDemand(effectiveAbilityId, requestedPowerWatts, allowPartialPower);
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
        if (item.id === effectiveAbilityId) {
          thisFullAllocated = item.rec.demandedWatts;
        }
      } else {
        if (item.id === effectiveAbilityId) {
          thisFullAllocated = 0;
        }
      }
    }

    // Include active full-power bursts (e.g. Jump) in full power allocation
    for (const alloc of this._activeAllocations.values()) {
      if (alloc.isBurst && !alloc.allowPartialPower && alloc.burstTimer && alloc.burstTimer > 0) {
        if (alloc.id !== effectiveAbilityId) {
          allocatedFullWatts += alloc.grantedWatts;
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
      if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
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

    if (effectiveAbilityId) {
      if (grantedWatts > 0.001) {
        const meta = ABILITY_METADATA[effectiveAbilityId] || {
          name: effectiveAbilityId.charAt(0).toUpperCase() + effectiveAbilityId.slice(1),
          color: "#06b6d4",
        };
        this._activeAllocations.set(effectiveAbilityId, {
          id: effectiveAbilityId,
          name: meta.name,
          color: meta.color,
          demandedWatts: requestedPowerWatts,
          grantedWatts,
          fraction: requestedPowerWatts > 0 ? grantedWatts / requestedPowerWatts : 1,
          allowPartialPower,
          order: this._demands.get(effectiveAbilityId)?.order ?? this._nextOrderId,
          isBurst: false,
          lastTick: this._currentTick,
        });
      } else {
        this._activeAllocations.delete(effectiveAbilityId);
      }
    }

    this.livePowerDraw += grantedWatts;
    this.recentPeakWattage = Math.max(this.recentPeakWattage, this.livePowerDraw);
    this.currentWattageProp.set(this.livePowerDraw, registry);
    return grantedWatts;
  }

  /**
   * Dedicated API for instantaneous work actions (jump, throw, pickup).
   * Limits consumption to available burst capacity: currentStamina * maxPower.
   * Deduces Joules from EnergyPool and drains burst stamina by (grantedJoules / maxPower) seconds.
   * Emits a visual equivalent power surge so the power bar peaks at:
   *   current continuous power + burst power consumption (where 1 Joule = 1 Watt equivalent).
   */
  public requestInstantBurst(options: {
    abilityId: string;
    demandedJoules: number;
    allowPartialPower?: boolean;
    pool?: EnergyPool | null;
    registry?: ObjectPropertiesRegistry;
  }): { granted: boolean; grantedJoules: number; fraction: number; peakWatts: number } {
    const {
      abilityId: _abilityId,
      demandedJoules,
      allowPartialPower = false,
      pool,
      registry
    } = options;

    if (demandedJoules <= 0) {
      return { granted: true, grantedJoules: 0, fraction: 1, peakWatts: 0 };
    }
    if (!this.enabled) {
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }

    const maxPower = Math.max(1, this.getMaxPower(registry));
    const curStamina = this.getCurrentStamina(registry);
    const maxBurstCapacity = Math.max(0, curStamina * maxPower);
    const poolEnergy = pool ? (pool.infiniteEnergy ? Infinity : pool.getCurrentEnergy(registry)) : Infinity;
    const availableJoules = Math.min(poolEnergy, maxBurstCapacity);

    if (availableJoules <= 0.001) {
      this.isExhausted = true;
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }

    let grantedJoules = 0;
    let fraction = 0;

    if (demandedJoules <= availableJoules) {
      grantedJoules = demandedJoules;
      fraction = 1.0;
    } else if (allowPartialPower) {
      grantedJoules = availableJoules;
      fraction = availableJoules / demandedJoules;
    } else {
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }

    // Deduct from pool
    if (pool && !pool.infiniteEnergy) {
      pool.consumePartial(grantedJoules, registry);
    }

    // Deduct burst stamina: dt equivalent in seconds = grantedJoules / maxPower
    const staminaDrain = grantedJoules / maxPower;
    const nextStamina = Math.max(0, curStamina - staminaDrain);
    this.currentStaminaProp.set(nextStamina, registry);
    if (nextStamina <= 0.0001) {
      this.isExhausted = true;
    }

    this.hadPhysicalExertion = true;

    // Visual power peak: baseline continuous power + burst equivalent wattage
    const continuousBaseline = this.livePowerDraw;
    const burstWatts = grantedJoules;
    const peakWatts = Math.min(maxPower, continuousBaseline + burstWatts);

    this.recentPeakWattage = Math.max(this.recentPeakWattage, peakWatts);
    this.recentPeakHoldTimer = 0.08; // Hold peak for 0.08s (~5 frames) so all consumers sample it

    if (grantedJoules > 0.001) {
      this._nextOrderId++;
      const meta = ABILITY_METADATA[options.abilityId] || {
        name: options.abilityId ? options.abilityId.charAt(0).toUpperCase() + options.abilityId.slice(1) : "Burst",
        color: "#ec4899",
      };
      this._activeAllocations.set(options.abilityId, {
        id: options.abilityId,
        name: meta.name,
        color: meta.color,
        demandedWatts: options.demandedJoules,
        grantedWatts: grantedJoules,
        fraction,
        allowPartialPower: options.allowPartialPower ?? false,
        order: this._nextOrderId,
        isBurst: true,
        burstTimer: 0.55,
        lastTick: this._currentTick,
      });
    }

    return {
      granted: true,
      grantedJoules,
      fraction,
      peakWatts
    };
  }

  /**
   * Charges a discrete burst of metabolic energy (Joules) for an instantaneous action.
   * Delegates to requestInstantBurst so burst limits and visual peaks are unified.
   */
  public requestEnergy(
    joules: number,
    minDt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    allowPartialPower: boolean = true,
    abilityId: string = "instant_burst"
  ): number {
    const inferredId = abilityId !== "instant_burst"
      ? abilityId
      : (Math.abs(minDt - 0.15) < 0.01 ? "pickup" : (Math.abs(minDt - 0.08) < 0.01 ? "throw" : "instant_burst"));

    const res = this.requestInstantBurst({
      abilityId: inferredId,
      demandedJoules: joules,
      allowPartialPower,
      pool,
      registry
    });
    return res.fraction;
  }

  /**
   * Advances passive stamina regeneration only when the bus is resting (0 power drawn).
   * Also cleans up demands and active allocations that were not requested in the tick.
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

    // Prune stale continuous allocations and decay burst allocations
    for (const [id, alloc] of this._activeAllocations.entries()) {
      if (alloc.isBurst) {
        if (alloc.burstTimer !== undefined) {
          alloc.burstTimer -= dt;
          if (alloc.burstTimer <= 0) {
            this._activeAllocations.delete(id);
          }
        }
      } else {
        if (alloc.lastTick !== undefined && alloc.lastTick < this._currentTick - 1) {
          this._activeAllocations.delete(id);
        }
      }
    }

    // Publish final live power draw reading to currentWattageProp
    this.currentWattageProp.set(this.livePowerDraw, registry);
    if (this.recentPeakHoldTimer > 0) {
      this.recentPeakHoldTimer -= dt;
      if (this.recentPeakHoldTimer <= 0) {
        this.recentPeakWattage = this.livePowerDraw;
      }
    } else {
      this.recentPeakWattage = this.livePowerDraw;
    }
    this.livePowerDraw = 0;

    const maxS = this.getMaxStamina(registry);
    let curS = this.getCurrentStamina(registry);
    const regen = this.getStaminaRegenRate(registry);

    // Recover stamina when physically resting (no physical exertion this tick)
    const isResting = !this.hadPhysicalExertion;
    if (isResting && curS < maxS) {
      curS = Math.min(maxS, curS + regen * dt);
      this.currentStaminaProp.set(curS, registry);
    }

    // If exhausted, check if stamina recovered past the threshold
    if (this.isExhausted) {
      const recoveryThreshold = maxS * this.recoveryThresholdRatio;
      if (curS >= recoveryThreshold) {
        this.isExhausted = false;
      }
    }

    // If pool has 0 energy, stay exhausted
    if (pool && !pool.infiniteEnergy && pool.getCurrentEnergy(registry) <= 0.0001) {
      this.isExhausted = true;
    }

    this.hadPhysicalExertion = false;
  }
}