import type { Character } from "../Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

export interface FlightKinematicsPlan {
  /** Desired active 3D acceleration vector created by pushing against the ground anchor (u/s^2) */
  axCreate: number;
  ayCreate: number;
  /** Tier 1 anti-gravity / anti-fall / sink-cap vertical acceleration (u/s^2) */
  hoverAz: number;
  /** Tier 2 voluntary extra upward climb acceleration (u/s^2) */
  extraAz: number;
  /** Uncapped horizontal, Tier 1 hover, and Tier 2 extra vertical metabolic power demand (Watts) */
  horizWatts: number;
  hoverWatts: number;
  extraVertWatts: number;
  /** Uncapped total metabolic watts required for full 3D thrust vector */
  rawDemandedWatts: number;
  /** Capped metabolic watts to request from EnergyPool */
  requestedWatts: number;
  /** Whether the character is currently airborne or actively lifting off */
  isFlyingActive: boolean;
}

/**
 * Isolated 1-to-1 capability slice for Telekinetic & Aerodynamic Flight (`FlightModule`).
 *
 * Implements the unified paid Newton's 3rd Law momentum-exchange model:
 * - Pushing off the ground (within `groundAnchorRange`) generates equal-and-opposite thrust on the
 *   character to sustain hover, climb, brake incoming recoil/knockback, and accelerate horizontally.
 * - Requires continuous metabolic power `P = (0.5 * g * ||F||) / efficiency`, strictly bounded by
 *   `maxPower`, stamina, and caloric energy reserve (vertical lift prioritized over horizontal thrust).
 */
export class FlightCapability {
  public static canFly(char: Character): boolean {
    return Boolean(char.flightModule && char.flightModule.enabled && char.hasVerticalPosition);
  }

  /**
   * Computes the vertical intent [-1, +1] for flight:
   * +1 = ascend (holding jump/climb input)
   * -1 = descend (holding crouch/descend input or braking in air)
   *  0 = hold altitude (hover)
   */
  public static getVerticalIntent(_char: Character, isAscendInput: boolean, isDescendInput: boolean = false): number {
    if (isAscendInput && !isDescendInput) return 1.0;
    if (isDescendInput && !isAscendInput) return -1.0;
    return 0.0;
  }

  /**
   * Computes the paid flight thrust plan without mutating velocity yet,
   * so `registerDemand` and `actuate` share identical math.
   */
  public static computePlan(
    char: Character,
    movementInput: Vector2D,
    verticalIntent: number,
    dt: number,
    arena: Arena
  ): FlightKinematicsPlan | null {
    if (!FlightCapability.canFly(char) || !char.flightModule) return null;

    const mod = char.flightModule;
    const reg = char.properties;
    const safeDt = Math.max(dt, 1 / 120);
    const g = arena.gravity || 30.0;

    const surfaceHeight = Math.max(
      0,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall ? arena.wallHeight : 0
    );
    const meanZ = Math.max(surfaceHeight, char.position.z - mod.appliedWaveOffsetZ);
    const heightAboveSurface = Math.max(0, meanZ - surfaceHeight);
    const isAirborne = heightAboveSurface > 0.02 || Math.max(0, char.position.z - surfaceHeight) > 0.02;
    const anchorRange = mod.getGroundAnchorRange(reg);
    const isAnchored = heightAboveSurface <= anchorRange + 0.05;

    const rawInputMag = Math.hypot(movementInput.x, movementInput.y);
    const inputMag = Math.min(1.0, rawInputMag);
    const hasHorizInput = inputMag > 0.05;
    const ux = hasHorizInput ? movementInput.x / rawInputMag : 0;
    const uy = hasHorizInput ? movementInput.y / rawInputMag : 0;

    const maxHorizSpeed = mod.getMaxHorizontalSpeed(reg);
    const maxAscentSpeed = mod.getMaxAscentSpeed(reg);
    const maxSinkSpeed = Math.max(0.1, mod.getMaxSinkSpeed(reg));
    const maxAlt = mod.getMaxFlightAltitude(reg);
    const effectiveMaxAlt = Math.min(maxAlt, surfaceHeight + anchorRange);

    const vWantMag = hasHorizInput ? inputMag * maxHorizSpeed : 0;

    // Determine desired vertical velocity vzWant using wave-stripped meanZ so oscillation never changes power cost
    let vzWant = 0;
    if (verticalIntent > 0.05) {
      vzWant = verticalIntent * maxAscentSpeed;
      if (meanZ >= effectiveMaxAlt) {
        vzWant = 0;
      } else if (meanZ + vzWant * 0.25 > effectiveMaxAlt) {
        vzWant = Math.max(0, (effectiveMaxAlt - meanZ) / 0.25);
      }
    } else if (verticalIntent < -0.05) {
      vzWant = verticalIntent * maxSinkSpeed; // Negative (controlled descent)
    } else {
      // Hold altitude (hover at vz = 0), or gently lift into a 0.2u hover skim when moving horizontally on ground
      if (!isAirborne && hasHorizInput && heightAboveSurface < 0.2) {
        vzWant = Math.min(maxAscentSpeed, 1.5);
      } else {
        vzWant = 0;
      }
    }

    // Current actual velocities before flight actuation (strip previous tick's Z-wave bias so demand stays steady)
    const vx0 = char.velocity.x;
    const vy0 = char.velocity.y;
    const vz0 = char.verticalVelocity - mod.appliedWaveVz;

    let axCreate = 0;
    let ayCreate = 0;
    let hoverAz = 0;
    let extraAz = 0;

    const totalMass = Math.max(0.2, char.hasMass ? char.mass : 1.2) + (char.carriedMass || 0);
    const efficiency = Math.max(0.01, char.energyPool ? char.energyPool.getMuscleEfficiency(reg) : 0.25);
    const cap = mod.getMaxPower(reg);
    const forcePowerFactor = 0.5 * g;
    const aMaxAtCap = cap > 0 ? (cap * efficiency) / (forcePowerFactor * totalMass) : 60.0;

    const isActivelyDescending = verticalIntent < -0.05;
    const isFlyingActive = isAnchored && (isAirborne || vzWant > 0.01 || hasHorizInput);

    // Ground-anchored thrust (horizontal & vertical lift) only works while within groundAnchorRange of a surface.
    if (isAnchored) {
      const vxWant = hasHorizInput ? ux * vWantMag : 0;
      const vyWant = hasHorizInput ? uy * vWantMag : 0;
      if (isAirborne || hasHorizInput || vzWant > 0.01) {
        const dvx = vxWant - vx0;
        const dvy = vyWant - vy0;
        const dvMag = Math.hypot(dvx, dvy);
        if (dvMag > 0.001) {
          const maxHorizA = Math.max(36.0, aMaxAtCap);
          const rawAH = dvMag / safeDt;
          const clampedAH = Math.min(maxHorizA, rawAH);
          axCreate = (dvx / dvMag) * clampedAH;
          ayCreate = (dvy / dvMag) * clampedAH;
        }
      }

      if (isAirborne || vzWant > 0.01) {
        if (isActivelyDescending) {
          if (vz0 > vzWant) {
            // Player wants to descend and hasn't exceeded maxSinkSpeed yet: gravity accelerates downward for 0 W
            hoverAz = 0;
            extraAz = 0;
          } else {
            // Sink speed exceeded: paid upward thrust to cap descent at maxSinkSpeed stays Tier 1
            hoverAz = g + Math.max(0, (vzWant - vz0) / safeDt);
            extraAz = 0;
          }
        } else if (verticalIntent > 0.05) {
          // Voluntary Space ascent: holding against gravity + any downward fall/recoil is Tier 1;
          // voluntary upward climb acceleration is Tier 2 so holding Space + WASD shares remaining power.
          const antiFallAz = g + Math.max(0, -vz0 / safeDt);
          const desiredTotalAz = Math.max(0, g + Math.max(-g, (vzWant - vz0) / safeDt));
          hoverAz = Math.min(desiredTotalAz, antiFallAz);
          extraAz = Math.min(Math.max(24.0, aMaxAtCap * 0.6), Math.max(0, desiredTotalAz - hoverAz));
        } else {
          // Hovering (verticalIntent <= 0.05): keep altitude stability as Tier 1
          const climbAccel = Math.max(-g, (vzWant - vz0) / safeDt);
          hoverAz = Math.max(0, g + climbAccel);
          extraAz = 0;
        }
      }
    }

    // Unified Force-Proportional Power Law:
    // Metabolic power scales directly with total 3D thrust force magnitude: P = (0.5 * g * ||F||) / efficiency
    const horizForce = totalMass * Math.hypot(axCreate, ayCreate);
    const hoverWatts = (forcePowerFactor * totalMass * hoverAz) / efficiency;
    const extraVertWatts = (forcePowerFactor * totalMass * Math.abs(extraAz)) / efficiency;
    const horizWatts = (forcePowerFactor * horizForce) / efficiency;
    const vertForce = totalMass * Math.abs(hoverAz + extraAz);
    const rawDemandedWatts = (forcePowerFactor * Math.hypot(horizForce, vertForce)) / efficiency;

    let requestedWatts = rawDemandedWatts;
    if (requestedWatts > cap) {
      requestedWatts = mod.allowPartialPower ? cap : 0;
    }

    return {
      axCreate,
      ayCreate,
      hoverAz,
      extraAz,
      horizWatts,
      hoverWatts,
      extraVertWatts,
      rawDemandedWatts,
      requestedWatts,
      isFlyingActive,
    };
  }

  /**
   * Phase 1 of Character tick: Registers flight power demand on EnergyPool.
   */
  public static registerDemand(
    char: Character,
    movementInput: Vector2D,
    verticalIntent: number,
    dt: number,
    arena: Arena
  ): boolean {
    const plan = FlightCapability.computePlan(char, movementInput, verticalIntent, dt, arena);
    if (!plan || !char.flightModule) return false;

    if (
      plan.isFlyingActive &&
      char.flightModule.consumesEnergy &&
      char.energyPool &&
      char.energyPool.enabled &&
      plan.rawDemandedWatts > 0.01
    ) {
      if (char.energyPool.isExhausted || (!char.flightModule.allowPartialPower && plan.requestedWatts <= 0)) {
        char.energyPool.notifyInsufficientEnergy({
          abilityId: "flight",
          demandedAmount: plan.rawDemandedWatts,
          isBurst: false,
          unit: "W/s",
          registry: char.properties,
        });
      } else {
        char.energyPool.activeLocomotionId = "flight";
        char.energyPool.registerDemand("flight", plan.requestedWatts, char.flightModule.allowPartialPower);
      }
    }

    return true;
  }

  /**
   * Phase 2 of Character tick: Requests power from EnergyPool, resolves Euclidean 3D force budget
   * (prioritizing vertical lift over horizontal thrust), applies paid acceleration, and applies stability oscillation.
   */
  public static actuate(
    char: Character,
    movementInput: Vector2D,
    verticalIntent: number,
    dt: number,
    arena: Arena
  ): void {
    const plan = FlightCapability.computePlan(char, movementInput, verticalIntent, dt, arena);
    if (!plan || !char.flightModule) return;

    const mod = char.flightModule;
    const reg = char.properties;
    const safeDt = Math.max(dt, 1 / 120);
    const checksEnergy = mod.consumesEnergy && Boolean(char.energyPool) && char.energyPool!.enabled && !char.energyPool!.infiniteEnergy;

    // Strip previous tick's vertical stability wave offset before resolving this tick
    if (mod.appliedWaveVz !== 0) {
      char.verticalVelocity -= mod.appliedWaveVz;
      mod.appliedWaveVz = 0;
    }
    mod.appliedWaveVx = 0;
    mod.appliedWaveVy = 0;

    // When out of energy, out of stamina, or exhausted: no flight lift and no stability wave —
    // character must fall naturally under gravity.
    if (
      checksEnergy &&
      char.energyPool &&
      (char.energyPool.isExhausted ||
        char.energyPool.getCurrentEnergy(reg) <= 0.0001 ||
        char.energyPool.getCurrentStamina(reg) <= 0.0001)
    ) {
      if (plan.isFlyingActive && plan.rawDemandedWatts > 0.01) {
        char.energyPool.notifyInsufficientEnergy({
          abilityId: "flight",
          demandedAmount: plan.rawDemandedWatts,
          isBurst: false,
          unit: "W/s",
          registry: reg,
        });
      }
      return;
    }

    // Resolve 2-tier Euclidean 3D power budget:
    // Tier 1: Anti-gravity / anti-fall / sink-cap hold (hoverWatts).
    // Tier 2: Orthogonal share of horizontal movement/recoil resistance + voluntary extra ascent.
    const cap = mod.getMaxPower(reg);
    let hoverScale = 0;
    let extraScale = 0;
    if (plan.rawDemandedWatts > 0.01) {
      let budgetWatts = 0;
      if (checksEnergy && char.energyPool) {
        if (plan.requestedWatts > 0) {
          const grantedWatts = char.energyPool.requestPower(
            plan.requestedWatts,
            safeDt,
            reg,
            false,
            "flight",
            mod.allowPartialPower
          );
          if (
            grantedWatts <= 0.0001 ||
            char.energyPool.isExhausted ||
            char.energyPool.getCurrentEnergy(reg) <= 0.0001 ||
            char.energyPool.getCurrentStamina(reg) <= 0.0001
          ) {
            return;
          }
          budgetWatts = grantedWatts;
        }
      } else {
        budgetWatts = cap > 0 ? Math.min(plan.rawDemandedWatts, cap) : plan.rawDemandedWatts;
      }

      if (budgetWatts > 0.0001) {
        if (budgetWatts <= plan.hoverWatts + 1e-6) {
          hoverScale = plan.hoverWatts > 0.0001 ? Math.min(1.0, budgetWatts / plan.hoverWatts) : 0;
          extraScale = 0;
        } else {
          hoverScale = 1.0;
          const A = plan.horizWatts * plan.horizWatts + plan.extraVertWatts * plan.extraVertWatts;
          const B = 2.0 * plan.hoverWatts * (plan.extraAz >= 0 ? plan.extraVertWatts : -plan.extraVertWatts);
          const C = plan.hoverWatts * plan.hoverWatts - budgetWatts * budgetWatts;
          extraScale = A > 1e-6
            ? Math.max(0, Math.min(1.0, (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A)))
            : 1.0;
        }
      }
    }

    // Apply paid 3D acceleration (pushing against ground anchor within energy/power limits)
    const actualAz = plan.hoverAz * hoverScale + plan.extraAz * extraScale;
    if (extraScale > 0.0001) {
      char.velocity.x += plan.axCreate * extraScale * safeDt;
      char.velocity.y += plan.ayCreate * extraScale * safeDt;
    }
    if (Math.abs(actualAz) > 0.0001) {
      char.verticalVelocity += actualAz * safeDt;
    }

    // Apply Long-Period, High-Amplitude Telekinetic Stability Wave on elevation (Z) strictly while powered & airborne
    const stability = mod.getStability(reg);
    const instability = Math.max(0, Math.min(1, 1.0 - stability));
    const surfaceHeight = Math.max(
      0,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall ? arena.wallHeight : 0
    );
    const meanZNow = Math.max(surfaceHeight, char.position.z - mod.appliedWaveOffsetZ);
    const heightAboveSurface = Math.max(0, meanZNow - surfaceHeight);
    const isAirborne = heightAboveSurface > 0.02 || Math.max(0, char.position.z - surfaceHeight) > 0.02;

    // Auto-disable FlightModule when the player intentionally descends all the way down to the ground
    if (verticalIntent < -0.05 && heightAboveSurface <= 0.04 && char.verticalVelocity <= 0.05) {
      mod.enabled = false;
      (char as any)._flightAutoGroundedOff = true;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
      mod.appliedWaveOffsetZ = 0;
      char.position.z = surfaceHeight;
      char.verticalVelocity = 0;
      return;
    }

    const isAnchoredNow = heightAboveSurface <= mod.getGroundAnchorRange(reg) + 0.05;
    const canSustainHover = isAnchoredNow && actualAz > 0.01 && (!checksEnergy || hoverScale > 0.0001 || extraScale > 0.0001);
    if (instability > 0.001 && isAirborne && canSustainHover) {
      mod.oscillationPhase += safeDt * (1.25 + instability * 1.15);
      const p = mod.oscillationPhase;
      const waveZ = (Math.sin(p * 0.79 + 0.45) * 0.70 + Math.cos(p * 1.47) * 0.30) * instability * 1.5;
      const waveVz = (waveZ - mod.appliedWaveOffsetZ) / safeDt;

      char.verticalVelocity += waveVz;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = waveVz;
      mod.appliedWaveOffsetZ = waveZ;
    } else {
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
      mod.appliedWaveOffsetZ = 0;
    }
  }
}
