import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

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
  sprint: { name: "Sprint", color: "#6366f1" },
  walk: { name: "Walk", color: "#38bdf8" },
  jump: { name: "Jump", color: "#ec4899" },
  climb: { name: "Climb", color: "#a855f7" },
  health_regen: { name: "Heal", color: "#22c55e" },
  pickup: { name: "Pickup", color: "#14b8a6" },
  throw: { name: "Throw", color: "#f43f5e" },
  instant_burst: { name: "Burst", color: "#ec4899" },
  laser_blast: { name: "Laser", color: "#06b6d4" },
  melee: { name: "Melee", color: "#f97316" },
};

/**
 * EnergyPool: Unified manager for biological energy (calories) and burst stamina (effort).
 *
 * Energy Reservoir: Finite chemical fuel (Joules), does not passively regenerate.
 * Stamina Reservoir: Live effort capacity (Joules), recovers passively when resting.
 *
 * Behaviors independently govern their own maximum power capacity (in Watts).
 * EnergyPool validates whether sufficient stamina rate (curStamina / dt) and pool energy
 * exist, tracking exhaustion and visual power draw allocations.
 */
export class EnergyPool {
  public id = "energy_pool";
  public name = "Energy Pool";
  public enabled = true;

  // --- Food / Caloric Energy Sockets (Joules) ---
  public baseMaxEnergyProp: DynamicProperty;
  public maxEnergyProp: DynamicProperty;
  public currentEnergyProp: DynamicProperty;

  // --- Stamina Sockets (Joules) ---
  public baseMaxStaminaProp: DynamicProperty;
  public maxStaminaProp: DynamicProperty;
  public currentStaminaProp: DynamicProperty;

  // --- Stamina Recovery Rate (Watts = Joules / sec) ---
  public staminaRegenRateProp: DynamicProperty;

  /**
   * Exhaustion threshold ratio: how much of maxStamina must be recovered
   * after hitting 0 before the creature can use energy again (default 0.20 = 20%).
   */
  public recoveryThresholdRatio: number = 0.20;
  public isExhausted: boolean = false;

  // Muscle mechanical-to-metabolic efficiency ratio (default 0.25 = 25% efficiency)
  public muscleEfficiencyProp: DynamicProperty;

  // Live power telemetry
  public livePowerDraw: number = 0;
  public currentWattageProp: DynamicProperty;
  public hadPhysicalExertion: boolean = false;

  // Retains peak power spike between render frames to prevent multi-tick fixed timesteps from dropping spikes
  public recentPeakWattage: number = 0;
  public recentPeakHoldTimer: number = 0;

  // Dynamically tracks whether continuous locomotion is currently sprinting or walking
  public activeLocomotionId: string = "sprint";

  /**
   * When enabled, energy & stamina consumption is bypassed (godmode / testing).
   */
  public infiniteEnergy: boolean = false;

  /**
   * When enabled, automatically refills currentEnergy back to maxEnergy immediately upon hitting 0.
   */
  public debugAutoRefillOnEmpty: boolean = false;

  // Registered ability power demands
  private _demands: Map<string, DemandRecord> = new Map();
  private _totalDemand: number = 0;
  private _currentTick: number = 0;
  private _nextOrderId: number = 0;

  // Active color-coded power allocations for visualization and telemetry
  private _activeAllocations: Map<string, ActivePowerAllocation> = new Map();

  constructor(options?: {
    baseMaxEnergy?: number;
    maxEnergy?: number;
    currentEnergy?: number;
    baseMaxStamina?: number;
    maxStamina?: number;
    currentStamina?: number;
    staminaRegenRate?: number;
    recoveryThresholdRatio?: number;
    muscleEfficiency?: number;
    infiniteEnergy?: boolean;
    debugAutoRefillOnEmpty?: boolean;
    enabled?: boolean;
  }) {
    // Caloric energy initialization (Joules)
    const baseEnergy = options?.baseMaxEnergy ?? 10000.0;
    const maxEnergy = options?.maxEnergy ?? baseEnergy;
    const curEnergy = options?.currentEnergy ?? maxEnergy;

    this.baseMaxEnergyProp = new DynamicProperty(baseEnergy);
    this.maxEnergyProp = new DynamicProperty(maxEnergy);
    this.currentEnergyProp = new DynamicProperty(curEnergy);

    // Stamina initialization (Joules, default 5000 J)
    const rawStamina = options?.baseMaxStamina ?? 5000.0;
    const baseStamina = rawStamina <= 60 ? rawStamina * 500.0 : rawStamina;
    const maxStamina = options?.maxStamina
      ? (options.maxStamina <= 60 ? options.maxStamina * 500.0 : options.maxStamina)
      : baseStamina;
    const curStamina = options?.currentStamina !== undefined
      ? (options.currentStamina <= 60 ? options.currentStamina * 500.0 : options.currentStamina)
      : maxStamina;

    this.baseMaxStaminaProp = new DynamicProperty(baseStamina);
    this.maxStaminaProp = new DynamicProperty(maxStamina);
    this.currentStaminaProp = new DynamicProperty(curStamina);

    // Stamina recovery rate (Watts = J/s, default 500 W recovers 5000 J in 10s)
    const rawRegen = options?.staminaRegenRate ?? 500.0;
    const regenWatts = rawRegen <= 10.0 ? rawRegen * 500.0 : rawRegen;
    this.staminaRegenRateProp = new DynamicProperty(regenWatts);

    if (options?.recoveryThresholdRatio !== undefined) {
      this.recoveryThresholdRatio = options.recoveryThresholdRatio;
    }

    this.muscleEfficiencyProp = new DynamicProperty(options?.muscleEfficiency ?? 0.25);
    this.currentWattageProp = new DynamicProperty(0.0);

    if (options?.infiniteEnergy !== undefined) this.infiniteEnergy = options.infiniteEnergy;
    if (options?.debugAutoRefillOnEmpty !== undefined) this.debugAutoRefillOnEmpty = options.debugAutoRefillOnEmpty;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  // --- Caloric Energy Getters & Setters ---

  public getBaseMaxEnergy(registry?: ObjectPropertiesRegistry): number {
    return this.baseMaxEnergyProp.get(registry);
  }

  public getMaxEnergy(registry?: ObjectPropertiesRegistry): number {
    return this.maxEnergyProp.get(registry);
  }

  public getCurrentEnergy(registry?: ObjectPropertiesRegistry): number {
    return this.currentEnergyProp.get(registry);
  }

  public setCurrentEnergy(val: number, registry?: ObjectPropertiesRegistry): void {
    const max = this.getMaxEnergy(registry);
    const clamped = Math.max(0, Math.min(max, val));
    this.currentEnergyProp.set(clamped, registry);
  }

  // --- Stamina Getters & Setters ---

  public getBaseMaxStamina(registry?: ObjectPropertiesRegistry): number {
    return this.baseMaxStaminaProp.get(registry);
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

  public setCurrentStamina(val: number, registry?: ObjectPropertiesRegistry): void {
    const max = this.getMaxStamina(registry);
    const clamped = Math.max(0, Math.min(max, val));
    this.currentStaminaProp.set(clamped, registry);
    if (clamped <= 0.0001) {
      this.isExhausted = true;
    } else if (this.isExhausted && clamped >= max * this.recoveryThresholdRatio) {
      this.isExhausted = false;
    }
  }

  public getStaminaRegenRate(registry?: ObjectPropertiesRegistry): number {
    return this.staminaRegenRateProp.get(registry);
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

  // --- Demand and Allocation Telemetry ---

  public getActiveAllocations(_registry?: ObjectPropertiesRegistry): ActivePowerAllocation[] {
    return Array.from(this._activeAllocations.values()).sort((a, b) => a.order - b.order);
  }

  public beginTick(): void {
    this.livePowerDraw = 0;
    this.hadPhysicalExertion = false;
  }

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

  // --- Affordability Gatekeeping ---

  /**
   * Unified gatekeeper checking whether stamina and energy pool can satisfy an energy or power demand.
   * Centralizes all validation: enabled state, exhaustion, stamina reserves, and energy pool limits.
   */
  public canAfford(options: {
    joules?: number;
    watts?: number;
    dt?: number;
    allowPartialPower?: boolean;
    allowWhenExhausted?: boolean;
    registry?: ObjectPropertiesRegistry;
    abilityId?: string;
  }): boolean {
    if (!this.enabled) return false;
    if (this.isExhausted && !options.allowWhenExhausted) return false;

    const curStamina = this.getCurrentStamina(options.registry);
    if (curStamina <= 0.0001 && !this.infiniteEnergy) return false;

    const dt = options.dt ?? 0.05;
    const demandedJoules = options.joules ?? (options.watts ? options.watts * dt : 0);
    if (demandedJoules <= 0) return true;

    if (!this.infiniteEnergy) {
      if (!options.allowPartialPower && demandedJoules > curStamina + 0.001) {
        return false;
      }
      const poolEnergy = this.getCurrentEnergy(options.registry);
      if (!options.allowPartialPower && poolEnergy < demandedJoules - 0.001) {
        return false;
      }
    }

    return true;
  }

  public canSatisfyFullPower(
    demandedWatts: number,
    dt: number,
    registry?: ObjectPropertiesRegistry,
    _abilityId?: string
  ): boolean {
    if (!this.enabled || dt <= 0 || demandedWatts <= 0) return false;
    if (this.infiniteEnergy) return true;

    const curS = this.getCurrentStamina(registry);
    if (this.isExhausted || curS <= 0.0001) return false;

    const demandedJoules = demandedWatts * dt;
    if (curS < demandedJoules - 0.001) return false;

    const curPoolE = this.getCurrentEnergy(registry);
    if (curPoolE < demandedJoules - 0.001) return false;

    return true;
  }

  public canSatisfyFullEnergy(
    joules: number,
    _minDt: number,
    registry?: ObjectPropertiesRegistry
  ): boolean {
    if (joules <= 0) return true;
    if (!this.enabled) return false;
    if (this.infiniteEnergy) return true;
    if (this.isExhausted) return false;

    const curStamina = this.getCurrentStamina(registry);
    if (joules > curStamina) return false;
    if (this.getCurrentEnergy(registry) < joules) return false;

    return true;
  }

  public canSupportPowerInIsolation(
    _demandedWatts: number,
    minWattsThreshold: number,
    dt: number,
    registry?: ObjectPropertiesRegistry
  ): boolean {
    if (!this.enabled || dt <= 0) return false;
    if (this.infiniteEnergy) return true;
    if (this.isExhausted) return false;

    const curStamina = this.getCurrentStamina(registry);
    if (curStamina <= 0.001) return false;

    const maxWattsFromStamina = curStamina / dt;
    if (maxWattsFromStamina < minWattsThreshold - 0.001) return false;

    const curEnergy = this.getCurrentEnergy(registry);
    if (curEnergy < minWattsThreshold * dt - 0.001) return false;

    return true;
  }

  // --- Power Consumption APIs ---

  /**
   * Peeks how much power (in Watts) would be granted without consuming pool energy or draining stamina.
   */
  public peekPower(
    requestedPowerWatts: number,
    dt: number,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false,
    allowPartialPower: boolean = true,
    _abilityId?: string
  ): number {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }
    if (this.infiniteEnergy) return requestedPowerWatts;

    const curS = this.getCurrentStamina(registry);
    if ((this.isExhausted && !allowWhenExhausted) || curS <= 0.0001) {
      return 0;
    }

    const maxWattsFromStamina = curS / dt;
    let targetWatts = requestedPowerWatts;

    if (targetWatts > maxWattsFromStamina) {
      if (!allowPartialPower) return 0;
      targetWatts = maxWattsFromStamina;
    }

    if (targetWatts <= 0.0001) return 0;

    const curPoolE = this.getCurrentEnergy(registry);
    if (curPoolE <= 0.0001) return 0;
    const energyNeededJoules = targetWatts * dt;
    if (!allowPartialPower && curPoolE < energyNeededJoules - 0.001) return 0;
    const grantedJoules = Math.min(curPoolE, energyNeededJoules);
    return grantedJoules / dt;
  }

  /**
   * Requests continuous power draw (in Watts) over dt seconds.
   * Drains both stamina and caloric energy pool simultaneously by (grantedWatts * dt) Joules.
   */
  public requestPower(
    requestedPowerWatts: number,
    dt: number,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false,
    abilityId?: string,
    allowPartialPower: boolean = true
  ): number {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }

    const effectiveAbilityId = abilityId === "locomotion" ? this.activeLocomotionId : abilityId;

    if (this.infiniteEnergy) {
      if (effectiveAbilityId) {
        this.registerDemand(effectiveAbilityId, requestedPowerWatts, allowPartialPower);
      }
      this.livePowerDraw += requestedPowerWatts;
      this.recentPeakWattage = Math.max(this.recentPeakWattage, this.livePowerDraw);
      this.currentWattageProp.set(this.livePowerDraw, registry);
      return requestedPowerWatts;
    }

    const curS = this.getCurrentStamina(registry);
    if ((this.isExhausted && !allowWhenExhausted) || curS <= 0.0001) {
      return 0;
    }

    if (effectiveAbilityId) {
      this.registerDemand(effectiveAbilityId, requestedPowerWatts, allowPartialPower);
    }

    // Remaining stamina available this tick in Joules
    const remainingStaminaJoules = Math.max(0, curS - (this.livePowerDraw * dt));
    const maxWattsFromStamina = remainingStaminaJoules / dt;

    let targetWatts = requestedPowerWatts;
    if (targetWatts > maxWattsFromStamina + 0.001) {
      if (!allowPartialPower) {
        if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
        return 0;
      }
      targetWatts = maxWattsFromStamina;
    }

    if (targetWatts <= 0.0001) {
      this.isExhausted = true;
      if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
      return 0;
    }

    // Caloric energy pool check & deduction
    const energyNeededJoules = targetWatts * dt;
    const curPoolE = this.getCurrentEnergy(registry);
    if (!allowPartialPower && curPoolE < energyNeededJoules - 0.001) {
      if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
      return 0;
    }

    const grantedJoules = this.consumePartial(energyNeededJoules, registry);
    if (grantedJoules <= 0.0001) {
      if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
      return 0;
    }

    const grantedWatts = grantedJoules / dt;
    if (!allowPartialPower && grantedWatts < requestedPowerWatts - 0.001) {
      if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
      return 0;
    }

    // Drain stamina directly in Joules (grantedWatts * dt)
    if (grantedWatts > 0) {
      this.hadPhysicalExertion = true;
      const staminaDrainJoules = grantedWatts * dt;
      const nextS = Math.max(0, curS - staminaDrainJoules);
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
   * Deducts Joules directly from both currentStamina and caloric energy.
   * Emits a visual equivalent power surge so the power bar peaks at:
   *   current continuous power + burst power consumption.
   */
  public requestInstantBurst(options: {
    abilityId: string;
    demandedJoules: number;
    allowPartialPower?: boolean;
    registry?: ObjectPropertiesRegistry;
  }): { granted: boolean; grantedJoules: number; fraction: number; peakWatts: number } {
    const {
      abilityId,
      demandedJoules,
      allowPartialPower = false,
      registry
    } = options;

    if (demandedJoules <= 0) {
      return { granted: true, grantedJoules: 0, fraction: 1, peakWatts: 0 };
    }
    if (!this.enabled || (this.isExhausted && !this.infiniteEnergy)) {
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }

    if (this.infiniteEnergy) {
      const continuousBaseline = this.livePowerDraw;
      const burstWatts = demandedJoules;
      const peakWatts = continuousBaseline + burstWatts;
      this.recentPeakWattage = Math.max(this.recentPeakWattage, peakWatts);
      this.recentPeakHoldTimer = 0.08;
      return { granted: true, grantedJoules: demandedJoules, fraction: 1.0, peakWatts };
    }

    const curStamina = this.getCurrentStamina(registry);
    const poolEnergy = this.getCurrentEnergy(registry);
    const availableJoules = Math.min(poolEnergy, curStamina);

    if (curStamina <= 0.0001) {
      this.isExhausted = true;
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }
    if (availableJoules <= 0.001) {
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }

    let grantedJoules = 0;
    let fraction = 0;

    if (demandedJoules <= availableJoules + 0.001) {
      grantedJoules = demandedJoules;
      fraction = 1.0;
    } else if (allowPartialPower) {
      grantedJoules = availableJoules;
      fraction = availableJoules / demandedJoules;
    } else {
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }

    // Deduct from caloric energy pool
    this.consumePartial(grantedJoules, registry);

    // Deduct stamina directly in Joules
    const nextStamina = Math.max(0, curStamina - grantedJoules);
    this.currentStaminaProp.set(nextStamina, registry);
    if (nextStamina <= 0.0001) {
      this.isExhausted = true;
    }

    this.hadPhysicalExertion = true;

    // Visual power peak: baseline continuous power + burst equivalent wattage
    const continuousBaseline = this.livePowerDraw;
    const burstWatts = grantedJoules;
    const peakWatts = continuousBaseline + burstWatts;

    this.recentPeakWattage = Math.max(this.recentPeakWattage, peakWatts);
    this.recentPeakHoldTimer = 0.08;

    if (grantedJoules > 0.001) {
      this._nextOrderId++;
      const meta = ABILITY_METADATA[abilityId] || {
        name: abilityId ? abilityId.charAt(0).toUpperCase() + abilityId.slice(1) : "Burst",
        color: "#ec4899",
      };
      this._activeAllocations.set(abilityId, {
        id: abilityId,
        name: meta.name,
        color: meta.color,
        demandedWatts: grantedJoules,
        grantedWatts: grantedJoules,
        fraction,
        allowPartialPower,
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
      registry
    });
    return res.fraction;
  }

  // --- Caloric Energy Direct Operations ---

  public consume(amount: number, registry?: ObjectPropertiesRegistry): boolean {
    if (!this.enabled || amount <= 0) return true;
    if (this.infiniteEnergy) return true;

    const cur = this.getCurrentEnergy(registry);
    if (cur >= amount) {
      const next = cur - amount;
      this.currentEnergyProp.set(next, registry);
      if (next <= 0.0001 && this.debugAutoRefillOnEmpty) {
        this.refill(registry);
      }
      return true;
    }

    this.currentEnergyProp.set(0, registry);
    if (this.debugAutoRefillOnEmpty) {
      this.refill(registry);
    }
    return false;
  }

  public consumePartial(amount: number, registry?: ObjectPropertiesRegistry): number {
    if (!this.enabled || amount <= 0) return 0;
    if (this.infiniteEnergy) return amount;

    const cur = this.getCurrentEnergy(registry);
    if (cur <= 0.0001) {
      this.currentEnergyProp.set(0, registry);
      if (this.debugAutoRefillOnEmpty) {
        this.refill(registry);
      }
      return 0;
    }

    const granted = Math.min(cur, amount);
    const next = cur - granted;
    this.currentEnergyProp.set(next, registry);
    if (next <= 0.0001 && this.debugAutoRefillOnEmpty) {
      this.refill(registry);
    }
    return granted;
  }

  public addEnergy(amount: number, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentEnergy(registry);
    const max = this.getMaxEnergy(registry);
    this.currentEnergyProp.set(Math.min(max, cur + amount), registry);
  }

  public addStamina(amount: number, registry?: ObjectPropertiesRegistry): void {
    if (!this.enabled || amount <= 0) return;
    const cur = this.getCurrentStamina(registry);
    const max = this.getMaxStamina(registry);
    const next = Math.min(max, cur + amount);
    this.currentStaminaProp.set(next, registry);
    if (this.isExhausted && next >= max * this.recoveryThresholdRatio) {
      this.isExhausted = false;
    }
  }

  public refill(registry?: ObjectPropertiesRegistry): void {
    const maxE = this.getMaxEnergy(registry);
    this.currentEnergyProp.set(maxE, registry);
    const maxS = this.getMaxStamina(registry);
    this.currentStaminaProp.set(maxS, registry);
    this.isExhausted = false;
  }

  public reset(registry?: ObjectPropertiesRegistry): void {
    this.refill(registry);
    this.livePowerDraw = 0;
    this.currentWattageProp.set(0.0, registry);
    this.recentPeakWattage = 0;
    this.recentPeakHoldTimer = 0;
    this.hadPhysicalExertion = false;
    this.clearDemands();
    this._activeAllocations.clear();
  }

  // --- Per-Tick Update ---

  public update(dt: number, registry?: ObjectPropertiesRegistry): void {
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

    this.hadPhysicalExertion = false;
  }
}
