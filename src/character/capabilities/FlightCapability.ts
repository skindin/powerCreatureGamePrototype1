import type { Character } from "../Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

export interface FlightKinematicsPlan {
  /** Post-transfer (0-energy) horizontal and vertical velocity */
  vxFree: number;
  vyFree: number;
  vzFree: number;
  /** Desired active acceleration vector to be created via energy (u/s^2) */
  axCreate: number;
  ayCreate: number;
  azCreate: number;
  /** Uncapped metabolic watts required for full desired active acceleration */
  rawDemandedWatts: number;
  /** Capped metabolic watts to request from EnergyPool */
  requestedWatts: number;
  /** Whether the character is currently airborne or actively lifting off */
  isFlyingActive: boolean;
}

/**
 * Isolated 1-to-1 capability slice for Telekinetic & Aerodynamic Flight (`FlightModule`).
 *
 * Implements the two-stage minimum-energy flight solver:
 * 1. Energy-Free Relative Momentum Transfer / Redirection (ΔK <= 0, 0 W):
 *    Strictly requires actual non-zero velocity. Brakes excess horizontal/vertical speed into
 *    the ground anchor (never reversing velocity sign or creating velocity from rest) and can
 *    elastically redirect actual downward fall speed (vz < 0) into horizontal glide speed.
 * 2. Active Momentum Creation (ΔK > 0, Costs Energy):
 *    Calculates the remaining 3D acceleration deficit (including Equivalence-Principle hover
 *    power 0.5 * m * g^2 in uncurved space), caps against maxPower, and when allowPartialPower
 *    is enabled, scales created acceleration by sqrt(P_granted / P_rawDemanded) so the character
 *    always attempts to fly even when underpowered.
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
   * Computes the two-stage flight kinematics plan (0-energy transfer + active creation demand)
   * without mutating velocity yet, so `registerDemand` and `actuate` share identical math.
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
    const heightAboveSurface = Math.max(0, char.position.z - surfaceHeight);
    const isAirborne = heightAboveSurface > 0.02;
    const isAnchored = heightAboveSurface <= mod.getGroundAnchorRange(reg);

    const rawInputMag = Math.hypot(movementInput.x, movementInput.y);
    const inputMag = Math.min(1.0, rawInputMag);
    const hasHorizInput = inputMag > 0.05;
    const ux = hasHorizInput ? movementInput.x / rawInputMag : 0;
    const uy = hasHorizInput ? movementInput.y / rawInputMag : 0;

    const maxHorizSpeed = mod.getMaxHorizontalSpeed(reg);
    const maxAscentSpeed = mod.getMaxAscentSpeed(reg);
    const maxSinkSpeed = Math.max(0.1, mod.getMaxSinkSpeed(reg));
    const maxAlt = mod.getMaxFlightAltitude(reg);

    const vWantMag = hasHorizInput ? inputMag * maxHorizSpeed : 0;

    // Determine desired vertical velocity vzWant
    let vzWant = 0;
    if (verticalIntent > 0.05) {
      vzWant = verticalIntent * maxAscentSpeed;
      if (char.position.z >= maxAlt) {
        vzWant = 0;
      } else if (char.position.z + vzWant * 0.25 > maxAlt) {
        vzWant = Math.max(0, (maxAlt - char.position.z) / 0.25);
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

    // Current actual velocities before flight actuation (strip previous tick's Z-wave bias so Stage 1/2 don't fight it)
    const vx0 = char.velocity.x;
    const vy0 = char.velocity.y;
    const vz0 = char.verticalVelocity - mod.appliedWaveVz;

    let vxFree = vx0;
    let vyFree = vy0;
    let vzFree = vz0;

    // =========================================================================
    // STAGE 1: Energy-Free Momentum Transfer & Redirection (ΔK <= 0, 0 W Cost)
    // Strictly requires actual non-zero velocity; never creates speed from 0
    // and never reverses the sign of a velocity component.
    // =========================================================================
    const maxBrakeAccel = 38.0; // Passive ground-anchor braking rate (u/s^2)
    const maxBrakeDeltaV = maxBrakeAccel * safeDt;

    if (isAnchored) {
      if (!hasHorizInput) {
        // Player wants 0 horizontal speed: brake existing horizontal speed toward 0
        const curHorizSpeed = Math.hypot(vxFree, vyFree);
        if (curHorizSpeed > 0.0001) {
          const newSpeed = Math.max(0, curHorizSpeed - maxBrakeDeltaV);
          const scale = newSpeed / curHorizSpeed;
          vxFree *= scale;
          vyFree *= scale;
        }
      } else {
        // Decompose existing horizontal velocity into parallel and perpendicular to (ux, uy)
        const vPar0 = vxFree * ux + vyFree * uy;
        const vPerpX = vxFree - vPar0 * ux;
        const vPerpY = vyFree - vPar0 * uy;
        const vPerpMag = Math.hypot(vPerpX, vPerpY);

        // 1a. Brake perpendicular drift toward 0 (strictly reduces speed: |vPerpNew| <= |vPerp0|)
        let vPerpScale = 0;
        if (vPerpMag > 0.0001) {
          const newPerpMag = Math.max(0, vPerpMag - maxBrakeDeltaV);
          vPerpScale = newPerpMag / vPerpMag;
        }

        // 1b. Brake parallel velocity ONLY if moving opposite to desired direction (vPar0 < 0 -> up to 0)
        //     OR if moving faster than vWantMag (vPar0 > vWantMag -> down to vWantMag).
        //     Never accelerates past 0 or increases |vPar|!
        let vParNew = vPar0;
        if (vPar0 < 0) {
          vParNew = Math.min(0, vPar0 + maxBrakeDeltaV);
        } else if (vPar0 > vWantMag) {
          vParNew = Math.max(vWantMag, vPar0 - maxBrakeDeltaV);
        }

        vxFree = vParNew * ux + vPerpX * vPerpScale;
        vyFree = vParNew * uy + vPerpY * vPerpScale;
      }

      // 1c. Elastic Glide Redirection (Downward Fall -> Horizontal Glide, ΔK <= 0):
      // If the character is ACTUALLY falling downward (vzFree < -0.05) and wants more horizontal speed
      // along (ux, uy), they can redirect a portion of their actual downward kinetic energy into
      // horizontal velocity while preserving or reducing total 3D speed (v_after^2 <= v_before^2).
      const curPar = hasHorizInput ? (vxFree * ux + vyFree * uy) : 0;
      if (isAirborne && vzFree < -0.05 && hasHorizInput && curPar >= 0 && curPar < vWantMag) {
        const availFallSpeed = Math.abs(vzFree);
        // Energy conservation bound: (curPar + dVh)^2 + vzNew^2 <= curPar^2 + availFallSpeed^2
        // Maximum horizontal speed reachable if 100% of fall kinetic energy were redirected:
        const maxRedirectedPar = Math.hypot(curPar, availFallSpeed * 0.85);
        const targetPar = Math.min(vWantMag, maxRedirectedPar, curPar + maxBrakeDeltaV * 0.8);
        if (targetPar > curPar) {
          const keUsed = targetPar * targetPar - curPar * curPar;
          const newFallSq = Math.max(0, availFallSpeed * availFallSpeed - keUsed);
          // Notice vzFree becomes less negative (slowing the fall while speeding up horizontally, ΔK <= 0)
          vzFree = -Math.sqrt(newFallSq);
          const vPerpX = vxFree - curPar * ux;
          const vPerpY = vyFree - curPar * uy;
          vxFree = targetPar * ux + vPerpX;
          vyFree = targetPar * uy + vPerpY;
        }
      }

      // 1d. Vertical Parachute / Sink Braking:
      // Requires ACTUAL downward velocity faster than the allowed sink speed (vzFree < -maxSinkSpeed).
      // Brakes downward speed toward -maxSinkSpeed (strictly reducing |vz|, never crossing 0!).
      const targetSinkFloor = verticalIntent < -0.05 ? vzWant : -maxSinkSpeed;
      if (isAirborne && vzFree < targetSinkFloor && targetSinkFloor < 0) {
        vzFree = Math.min(targetSinkFloor, vzFree + maxBrakeDeltaV);
      }
    }

    // =========================================================================
    // STAGE 2: Active Momentum Creation (ΔK > 0, Costs Energy)
    // Computes the remaining acceleration deficit that cannot be achieved by
    // 0-energy momentum transfer, plus Equivalence-Principle hover acceleration.
    // =========================================================================
    let axCreate = 0;
    let ayCreate = 0;
    let azCreate = 0;

    const maxHorizCreateAccel = 26.0;
    if (hasHorizInput) {
      const vParFree = vxFree * ux + vyFree * uy;
      if (vParFree < vWantMag) {
        const dvH = vWantMag - vParFree;
        const aH = Math.min(maxHorizCreateAccel, dvH / safeDt);
        axCreate = ux * aH;
        ayCreate = uy * aH;
      }
    }

    const isActivelyDescending = verticalIntent < -0.05;
    const isFlyingActive = isAirborne || vzWant > 0.01 || Math.hypot(axCreate, ayCreate) > 0.01;

    if (isAirborne || vzWant > 0.01) {
      if (isActivelyDescending && vzFree <= vzWant + 0.05) {
        // Player is intentionally descending at sink speed: let gravity pull down and Stage 1 brake excess
        azCreate = 0;
      } else if (isActivelyDescending) {
        // Player wants to descend, and is currently above sink speed: let gravity accelerate them down for 0 W
        azCreate = 0;
      } else {
        // Hovering (vzWant == 0) or Ascending (vzWant > 0):
        // Must counter gravity g in uncurved space PLUS accelerate vzFree toward vzWant
        const maxVertCreateAccel = 24.0;
        const dvZ = vzWant - vzFree;
        const climbAccel = Math.max(-g, Math.min(maxVertCreateAccel, dvZ / safeDt));
        azCreate = Math.max(0, g + climbAccel);
      }
    }

    // Equivalence-Principle Power in uncurved space:
    // Accelerating mass m at 3D rate ||aCreate|| requires mechanical power P_mech = 0.5 * m * ||aCreate||^2
    const totalMass = Math.max(0.2, char.hasMass ? char.mass : 1.2) + (char.carriedMass || 0);
    const aSq = axCreate * axCreate + ayCreate * ayCreate + azCreate * azCreate;
    const mechWatts = 0.5 * totalMass * aSq;
    const efficiency = Math.max(0.01, char.energyPool ? char.energyPool.getMuscleEfficiency(reg) : 0.25);
    const rawDemandedWatts = mechWatts / efficiency;

    const cap = mod.getMaxPower(reg);
    let requestedWatts = rawDemandedWatts;
    if (requestedWatts > cap) {
      requestedWatts = mod.allowPartialPower ? cap : 0;
    }

    return {
      vxFree,
      vyFree,
      vzFree,
      axCreate,
      ayCreate,
      azCreate,
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
   * Phase 2 of Character tick: Applies 0-energy momentum transfer, requests power from EnergyPool,
   * scales created 3D acceleration by sqrt(P_granted / P_rawDemanded), and applies stability oscillation.
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

    // 1. Apply Stage 1 (0-Energy Momentum Transfer / Braking / Glide Redirection) immediately
    char.velocity.x = plan.vxFree;
    char.velocity.y = plan.vyFree;
    char.verticalVelocity = plan.vzFree;

    // 2. Apply Stage 2 (Active Momentum Creation, scaled by available power)
    let accelScale = 1.0;
    if (plan.rawDemandedWatts > 0.01) {
      if (mod.consumesEnergy && char.energyPool && char.energyPool.enabled) {
        if (plan.requestedWatts <= 0) {
          accelScale = 0;
        } else {
          const grantedWatts = char.energyPool.requestPower(
            plan.requestedWatts,
            safeDt,
            reg,
            false,
            "flight",
            mod.allowPartialPower
          );
          // Because P = 0.5 * m * a^2 / efficiency, achievable acceleration scales with sqrt(P_granted / P_rawDemanded)
          const powerRatio = Math.max(0, Math.min(1.0, grantedWatts / plan.rawDemandedWatts));
          accelScale = Math.sqrt(powerRatio);
        }
      }
    } else {
      accelScale = 0;
    }

    if (accelScale > 0.0001) {
      char.velocity.x += plan.axCreate * accelScale * safeDt;
      char.velocity.y += plan.ayCreate * accelScale * safeDt;
      char.verticalVelocity += plan.azCreate * accelScale * safeDt;
    }

    // 3. Apply Long-Period, High-Amplitude Telekinetic Stability Wave on elevation (Z) strictly while airborne
    const stability = mod.getStability(reg);
    const instability = Math.max(0, Math.min(1, 1.0 - stability));
    const surfaceHeight = Math.max(
      0,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall ? arena.wallHeight : 0
    );
    const heightAboveSurface = Math.max(0, char.position.z - surfaceHeight);
    const isAirborne = heightAboveSurface > 0.02;

    // Auto-disable FlightModule when the player intentionally descends all the way down to the ground
    if (verticalIntent < -0.05 && heightAboveSurface <= 0.04 && char.verticalVelocity <= 0.05) {
      mod.enabled = false;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
      char.position.z = surfaceHeight;
      char.verticalVelocity = 0;
      return;
    }

    if (instability > 0.001 && isAirborne) {
      mod.oscillationPhase += safeDt * (1.25 + instability * 1.15);
      const p = mod.oscillationPhase;
      const waveVz = (Math.sin(p * 0.79 + 0.45) * 0.70 + Math.cos(p * 1.47) * 0.30) * instability * 3.0;

      char.verticalVelocity += waveVz;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = waveVz;
    } else {
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
    }
  }
}
