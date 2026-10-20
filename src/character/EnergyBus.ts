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
   */
  public getActiveAllocations(_registry?: ObjectPropertiesRegistry): ActivePowerAllocation[] {
    return Array.from(this._activeAllocations.values()).sort((a, b) => a.order - b.order);
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
    baseMaxStamina?: number;
    maxStamina?: number;
    currentStamina?: number;
    staminaRegenRate?: number;
    muscleEfficiency?: number;
    enabled?: boolean;
  }) {
    this.id = options?.id ?? "bus_main";
    this.name = options?.name ?? "Main";

    // Stamina capacity in Joules (defaults to 5000 J, auto-converting legacy seconds if < 100)
    const rawStamina = options?.baseMaxStamina ?? 5000.0;
    const baseStamina = rawStamina <= 60 ? rawStamina * 500.0 : rawStamina;
    const maxStamina = options?.maxStamina ? (options.maxStamina <= 60 ? options.maxStamina * 500.0 : options.maxStamina) : baseStamina;
    const curStamina = options?.currentStamina !== undefined ? (options.currentStamina <= 60 ? options.currentStamina * 500.0 : options.currentStamina) : maxStamina;

    this.baseMaxStaminaProp = new DynamicProperty(baseStamina);
    this.maxStaminaProp = new DynamicProperty(maxStamina);
    this.currentStaminaProp = new DynamicProperty(curStamina);

    // Stamina recovery rate in Watts (Joules / second, default 500 W recovers 5000 J in 10s)
    const rawRegen = options?.staminaRegenRate ?? 500.0;
    const regenWatts = rawRegen <= 10.0 ? rawRegen * 500.0 : rawRegen;
    this.staminaRegenRateProp = new DynamicProperty(regenWatts);
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

  /**
   * Resets energy bus to full stamina capacity, clears exhaustion, active allocations, and demands.
   */
  public reset(registry?: ObjectPropertiesRegistry): void {
    const maxS = this.getMaxStamina(registry);
    this.currentStaminaProp.set(maxS, registry);
    this.isExhausted = false;
    this.livePowerDraw = 0;
    this.currentWattageProp.set(0.0, registry);
    this.recentPeakWattage = 0;
    this.recentPeakHoldTimer = 0;
    this.hadPhysicalExertion = false;
    this.clearDemands();
    this._activeAllocations.clear();
  }

  public getStaminaRegenRate(registry?: ObjectPropertiesRegistry): number {
    return this.staminaRegenRateProp.get(registry);
  }

  /**
   * Unified gatekeeper checking whether the bus and pool can satisfy an energy or power demand.
   * Centralizes all validation: enabled state, exhaustion, stamina reserves, and energy pool limits.
   */
  public canAfford(options: {
    joules?: number;
    watts?: number;
    dt?: number;
    allowPartialPower?: boolean;
    allowWhenExhausted?: boolean;
    pool?: EnergyPool | null;
    registry?: ObjectPropertiesRegistry;
    abilityId?: string;
  }): boolean {
    if (!this.enabled) return false;
    if (this.isExhausted && !options.allowWhenExhausted) return false;

    const curStamina = this.getCurrentStamina(options.registry);
    if (curStamina <= 0.0001) return false;

    const dt = options.dt ?? 0.05;
    const demandedJoules = options.joules ?? (options.watts ? options.watts * dt : 0);
    if (demandedJoules <= 0) return true;

    // Stamina capacity check in Joules
    if (!options.allowPartialPower && demandedJoules > curStamina + 0.001) {
      return false;
    }

    // Pool energy check
    if (options.pool && !options.pool.infiniteEnergy) {
      const poolEnergy = options.pool.getCurrentEnergy(options.registry);
      if (!options.allowPartialPower && poolEnergy < demandedJoules - 0.001) {
        return false;
      }
    }

    return true;
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
    _abilityId?: string
  ): boolean {
    if (!this.enabled || dt <= 0 || demandedWatts <= 0) return false;
    const curS = this.getCurrentStamina(registry);
    if (this.isExhausted || curS <= 0.0001) return false;

    const demandedJoules = demandedWatts * dt;
    if (curS < demandedJoules - 0.001) return false;

    // Check pool energy
    if (pool && !pool.infiniteEnergy) {
      const curPoolE = pool.getCurrentEnergy(registry);
      if (curPoolE < demandedJoules - 0.001) return false;
    }

    return true;
  }

  /**
   * Checks if the bus can satisfy 100% full energy for an instantaneous impulse action.
   */
  public canSatisfyFullEnergy(
    joules: number,
    _minDt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry
  ): boolean {
    if (joules <= 0) return true;
    if (!this.enabled || this.isExhausted) return false;
    const curStamina = this.getCurrentStamina(registry);
    if (joules > curStamina) return false;
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

    const maxWattsFromStamina = curStamina / dt;
    if (maxWattsFromStamina < minWattsThreshold - 0.001) return false;

    if (pool && !pool.infiniteEnergy) {
      const curEnergy = pool.getCurrentEnergy(registry);
      if (curEnergy < minWattsThreshold * dt - 0.001) return false;
    }

    return true;
  }

  /**
   * Peeks how much power (in Watts) would be granted without consuming pool energy or draining stamina.
   * Under behavior-driven power, the bus checks available stamina rate (curStamina / dt) and pool energy.
   */
  public peekPower(
    requestedPowerWatts: number,
    dt: number,
    pool?: EnergyPool | null,
    registry?: ObjectPropertiesRegistry,
    allowWhenExhausted: boolean = false,
    allowPartialPower: boolean = true,
    _abilityId?: string
  ): number {
    if (!this.enabled || dt <= 0 || requestedPowerWatts <= 0) {
      return 0;
    }
    const curS = this.getCurrentStamina(registry);
    if ((this.isExhausted && !allowWhenExhausted) || curS <= 0.0001) {
      return 0;
    }

    // Stamina rate ceiling in Watts for this dt window (Joules / dt)
    const maxWattsFromStamina = curS / dt;
    let targetWatts = requestedPowerWatts;

    if (targetWatts > maxWattsFromStamina) {
      if (!allowPartialPower) return 0;
      targetWatts = maxWattsFromStamina;
    }

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
   * Behaviors dictate their own power capacity. The bus limits power strictly by:
   * 1. Available stamina in Joules (curStamina / dt Watts rate)
   * 2. Available pool calories in Joules
   * 3. Exhaustion state
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

    // Pool energy check
    let grantedWatts = targetWatts;
    const energyNeededJoules = targetWatts * dt;
    if (pool) {
      if (!pool.infiniteEnergy) {
        const curPoolE = pool.getCurrentEnergy(registry);
        if (!allowPartialPower && curPoolE < energyNeededJoules - 0.001) {
          if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
          return 0;
        }
      }
      const grantedJoules = pool.consumePartial(energyNeededJoules, registry);
      if (grantedJoules <= 0.0001) {
        if (effectiveAbilityId) this._activeAllocations.delete(effectiveAbilityId);
        return 0;
      }
      grantedWatts = grantedJoules / dt;
    }

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
   * Deduces Joules directly from both currentStamina and EnergyPool.
   * Emits a visual equivalent power surge so the power bar peaks at:
   *   current continuous power + burst power consumption.
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
    if (!this.enabled || this.isExhausted) {
      return { granted: false, grantedJoules: 0, fraction: 0, peakWatts: 0 };
    }

    const curStamina = this.getCurrentStamina(registry);
    const poolEnergy = pool ? (pool.infiniteEnergy ? Infinity : pool.getCurrentEnergy(registry)) : Infinity;
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

    // Deduct from pool
    if (pool && !pool.infiniteEnergy) {
      pool.consumePartial(grantedJoules, registry);
    }

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
      const meta = ABILITY_METADATA[options.abilityId] || {
        name: options.abilityId ? options.abilityId.charAt(0).toUpperCase() + options.abilityId.slice(1) : "Burst",
        color: "#ec4899",
      };
      this._activeAllocations.set(options.abilityId, {
        id: options.abilityId,
        name: meta.name,
        color: meta.color,
        demandedWatts: grantedJoules,
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
  public update(dt: number, _pool?: EnergyPool | null, registry?: ObjectPropertiesRegistry): void {
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