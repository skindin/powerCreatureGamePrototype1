import type { Character } from "../Character.js";
import type { GameObject, Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated 1-to-1 capability slice for Telekinetic Manipulation (`TelekinesisModule`).
 *
 * Implements:
 * - Remote grab / release / fling within `telekinesisReach`
 * - Stability harmonic wobble on held object target point
 * - Energy-Free relative momentum transfer / braking (`ΔK <= 0`) when slowing targets or
 *   routing unwanted reaction impulse into the ground anchor (`<= groundAnchorRange`)
 * - Equivalence-Principle active momentum creation (`ΔK > 0`, power-capped at `maxPowerProp`)
 *   with automatic recoil splitting toward character's intended velocity
 */
export class TelekinesisCapability {
  public static canUseTelekinesis(char: Character): boolean {
    return Boolean(char.telekinesisModule && char.telekinesisModule.enabled);
  }

  public static isTargetInReach(
    char: Character,
    obj: GameObject,
    wallHeight: number = 1.0
  ): boolean {
    if (!TelekinesisCapability.canUseTelekinesis(char) || !char.telekinesisModule) return false;
    if (
      obj === char ||
      obj === char.heldObject ||
      obj === char.grappledTarget ||
      obj === char.telekineticTarget ||
      obj.isHeld
    ) {
      return false;
    }
    if (obj.lastThrower === char) return false;
    if (obj.isImmovable) return false;

    const reach = char.telekinesisModule.getTelekinesisReach(char.properties);
    if (reach <= 0) return false;

    const charZ = Math.max(
      char.position.z,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall ? wallHeight : 0
    );
    const objZ = Math.max(
      obj.position.z,
      obj.supportingSurfaceHeight ?? 0,
      obj.standingWall ? wallHeight : 0
    );

    const dist3D = Math.hypot(
      obj.position.x - char.position.x,
      obj.position.y - char.position.y,
      objZ - charZ
    );
    return dist3D <= reach;
  }

  public static grabTarget(char: Character, target: GameObject): boolean {
    if (!TelekinesisCapability.canUseTelekinesis(char) || !char.telekinesisModule) return false;
    if (!target || target === char || target.isHeld || target.isImmovable) return false;

    if (char.telekineticTarget && char.telekineticTarget !== target) {
      TelekinesisCapability.releaseTarget(char);
    }

    target.wakeUp();
    target.isInFlight = false;
    target.knockbackUntilTime = 0;
    target.lastThrower = null;
    target.originalThrower = null;

    char.telekineticTarget = target;
    (target as any).telekinesedBy = char;
    return true;
  }

  public static releaseTarget(char: Character): GameObject | null {
    const target = char.telekineticTarget;
    if (!target) return null;

    char.telekineticTarget = null;
    if ((target as any).telekinesedBy === char) {
      (target as any).telekinesedBy = null;
    }
    return target;
  }

  /**
   * Computes the character's ground-anchored state and desired self-momentum direction,
   * then distributes the equal-and-opposite reaction impulse `recoil = -appliedObjImpulse`:
   * - If ground-anchored: keeps only the component of `recoil` aligned with `movementInput`
   *   (helpful recoil toward where the character already wants to move), and routes the rest
   *   into the infinite-mass ground at 0 extra energy cost.
   * - If unanchored (high above groundAnchorRange): applies full equal-and-opposite reaction
   *   to `char.velocity`.
   */
  public static applyReactionImpulse(
    char: Character,
    appliedObjImpulseX: number,
    appliedObjImpulseY: number,
    appliedObjImpulseZ: number,
    arena?: Arena
  ): void {
    const mod = char.telekinesisModule;
    if (!mod || !char.hasMass) return;

    const charMass = Math.max(0.2, char.mass);
    const availX = -appliedObjImpulseX;
    const availY = -appliedObjImpulseY;
    const availZ = -appliedObjImpulseZ;
    const availMag = Math.hypot(availX, availY, availZ);
    if (availMag <= 1e-6) return;

    const surfaceHeight = Math.max(
      0,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall && arena ? arena.wallHeight : 0
    );
    const heightAboveSurface = Math.max(0, char.position.z - surfaceHeight);
    const isAnchored = heightAboveSurface <= mod.getGroundAnchorRange(char.properties);

    if (!isAnchored) {
      // Mid-air unanchored: conservation of momentum applies 100% of opposite reaction to character
      char.velocity.x += availX / charMass;
      char.velocity.y += availY / charMass;
      if (char.hasVerticalVelocity) {
        char.verticalVelocity += availZ / charMass;
      }
      return;
    }

    // Anchored to ground: build character's desired self-momentum vector from current movement intent
    const inX = char.movementInput?.x ?? 0;
    const inY = char.movementInput?.y ?? 0;
    const inMag = Math.hypot(inX, inY);
    if (inMag <= 0.05) {
      // Character wants to stay still: dump 100% of unwanted reaction into ground anchor at 0 cost
      return;
    }

    const ux = inX / inMag;
    const uy = inY / inMag;
    const wantSpeed = char.hasFlight && char.flightModule
      ? char.flightModule.getMaxHorizontalSpeed(char.properties)
      : (char.walkingModule ? char.walkingModule.maxWalkSpeedProp.get(char.properties) : 5.0);
    const curParSpeed = char.velocity.x * ux + char.velocity.y * uy;
    const deficitSpeed = Math.max(0, wantSpeed * Math.min(1, inMag) - curParSpeed);
    if (deficitSpeed <= 0.001) {
      // Already at or above desired speed: brace all recoil into ground for 0 cost
      return;
    }

    // Project desired impulse onto available horizontal reaction impulse direction
    const availHorizMag = Math.hypot(availX, availY);
    if (availHorizMag <= 1e-6) return;
    const uAvailX = availX / availHorizMag;
    const uAvailY = availY / availHorizMag;

    const pWantParallel = deficitSpeed * charMass * (ux * uAvailX + uy * uAvailY);
    const pKeepMag = Math.max(0, Math.min(availHorizMag, pWantParallel));
    if (pKeepMag > 0.0001) {
      char.velocity.x += (uAvailX * pKeepMag) / charMass;
      char.velocity.y += (uAvailY * pKeepMag) / charMass;
    }
    // Excess (avail - pKeep) is braced against the infinite-mass ground at 0 energy cost
  }

  /**
   * Executes a telekinetic fling/throw impulse on the telekinetically held object toward aimTargetPos,
   * respecting power cap and equal-and-opposite reaction.
   */
  public static flingTarget(
    char: Character,
    aimTargetPos: Vector2D,
    arena: Arena,
    powerScale: number = 1.0
  ): GameObject | null {
    const target = char.telekineticTarget;
    const mod = char.telekinesisModule;
    if (!target || !mod || !mod.enabled) return null;

    const reg = char.properties;
    const mObj = Math.max(0.2, target.hasMass ? target.mass : 1.0);
    const mChar = Math.max(0.2, char.hasMass ? char.mass : 1.2);
    const surfaceHeight = Math.max(
      0,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall ? arena.wallHeight : 0
    );
    const isAnchored = Math.max(0, char.position.z - surfaceHeight) <= mod.getGroundAnchorRange(reg);
    const effMass = isAnchored ? mObj : (mObj * mChar) / (mObj + mChar);

    const dx = aimTargetPos.x - target.position.x;
    const dy = aimTargetPos.y - target.position.y;
    const dist = Math.hypot(dx, dy);
    const dirX = dist > 0.05 ? dx / dist : Math.cos(char.facingAngle);
    const dirY = dist > 0.05 ? dy / dist : Math.sin(char.facingAngle);

    // Compute desired launch speed scaled against Telekinesis maxPower capacity
    const capWatts = mod.getMaxPower(reg);
    const desiredSpeed = Math.max(6.0, mod.getMaxMoveSpeed(reg) * 1.45) * Math.max(0.35, Math.min(1.0, powerScale));
    const vzBoost = 4.2;

    const mechWork = 0.5 * effMass * (desiredSpeed * desiredSpeed + vzBoost * vzBoost);
    const efficiency = Math.max(0.01, char.energyPool ? char.energyPool.getMuscleEfficiency(reg) : 0.25);
    const demandedJoules = mechWork / efficiency;

    // Max burst energy allowed scales comparably with ThrowModule burst capacity
    const maxBurstJoules = Math.max(400, capWatts * 0.75);
    let requestedJoules = demandedJoules;
    if (requestedJoules > maxBurstJoules) {
      requestedJoules = mod.allowPartialPower ? maxBurstJoules : 0;
    }

    let speedScale = 1.0;
    if (mod.consumesEnergy && char.energyPool && char.energyPool.enabled) {
      if (char.energyPool.isExhausted || requestedJoules <= 0) {
        char.energyPool.notifyInsufficientEnergy({
          abilityId: "telekinesis",
          demandedAmount: demandedJoules,
          isBurst: true,
          unit: "J",
          registry: reg,
        });
        return null;
      }
      const res = char.energyPool.requestInstantBurst({
        abilityId: "telekinesis",
        demandedJoules: requestedJoules,
        allowPartialPower: mod.allowPartialPower,
        registry: reg,
      });
      if (!res.granted || res.grantedJoules <= 0.001 || (!mod.allowPartialPower && res.fraction < 1.0)) {
        return null;
      }
      speedScale = Math.sqrt(Math.max(0, res.grantedJoules / demandedJoules));
    }

    const effHoriz = desiredSpeed * speedScale;
    const effVz = vzBoost * speedScale;
    const impX = mObj * (dirX * effHoriz - target.velocity.x * 0.5);
    const impY = mObj * (dirY * effHoriz - target.velocity.y * 0.5);
    const impZ = mObj * effVz;

    TelekinesisCapability.releaseTarget(char);

    target.velocity.x += impX / mObj;
    target.velocity.y += impY / mObj;
    if (target.hasVerticalVelocity) {
      target.verticalVelocity = Math.max(target.verticalVelocity, effVz);
    }
    target.isInFlight = true;
    target.lastThrower = char;
    target.originalThrower = char;
    target.wakeUp();
    target.applyKnockbackWindow(1500);

    TelekinesisCapability.applyReactionImpulse(char, impX, impY, impZ, arena);
    return target;
  }

  /**
   * Registers continuous levitation/tracking power demand on EnergyPool.
   */
  public static registerDemand(
    char: Character,
    aimTargetPos: Vector2D | null,
    dt: number,
    arena: Arena
  ): boolean {
    const target = char.telekineticTarget;
    const mod = char.telekinesisModule;
    if (!target || !mod || !mod.enabled || !mod.consumesEnergy || !char.energyPool || !char.energyPool.enabled) {
      return Boolean(target && mod && mod.enabled);
    }

    const plan = TelekinesisCapability.computePlan(char, target, aimTargetPos, dt, arena);
    if (!plan) return false;

    if (plan.rawDemandedWatts > 0.01) {
      if (char.energyPool.isExhausted || (!mod.allowPartialPower && plan.requestedWatts <= 0)) {
        char.energyPool.notifyInsufficientEnergy({
          abilityId: "telekinesis",
          demandedAmount: plan.rawDemandedWatts,
          isBurst: false,
          unit: "W/s",
          registry: char.properties,
        });
      } else {
        char.energyPool.registerDemand("telekinesis", plan.requestedWatts, mod.allowPartialPower);
      }
    }
    return true;
  }

  /**
   * Actuates the telekinetic hold & tracking step for this tick:
   * - Validates range & target liveness
   * - Applies 0-energy momentum transfer/braking first
   * - Applies power-capped active levitation & acceleration second
   * - Routes equal-and-opposite reaction through anchor / desired movement split
   * - Applies stability oscillation wobble
   */
  public static actuate(
    char: Character,
    aimTargetPos: Vector2D | null,
    dt: number,
    arena: Arena
  ): void {
    const target = char.telekineticTarget;
    const mod = char.telekinesisModule;
    if (!target || !mod || !mod.enabled) {
      if (target) TelekinesisCapability.releaseTarget(char);
      return;
    }

    // Cleanup checks
    if (
      target.isHeld ||
      (target as any).isDying ||
      (arena.entities && !arena.entities.includes(target))
    ) {
      TelekinesisCapability.releaseTarget(char);
      return;
    }

    const reach = mod.getTelekinesisReach(char.properties);
    const distToChar = Math.hypot(
      target.position.x - char.position.x,
      target.position.y - char.position.y,
      target.position.z - char.position.z
    );
    if (distToChar > reach * 1.35) {
      TelekinesisCapability.releaseTarget(char);
      return;
    }

    target.wakeUp();
    target.isInFlight = false;
    target.knockbackUntilTime = 0;

    const reg = char.properties;
    const safeDt = Math.max(dt, 1 / 120);
    const plan = TelekinesisCapability.computePlan(char, target, aimTargetPos, safeDt, arena);
    if (!plan) return;

    const mObj = Math.max(0.2, target.hasMass ? target.mass : 1.0);
    const vxBefore = target.velocity.x;
    const vyBefore = target.velocity.y;
    const vzBefore = target.verticalVelocity;

    // 1. Apply Stage 1 (0-Energy Momentum Transfer / Braking) to target
    target.velocity.x = plan.vxFree;
    target.velocity.y = plan.vyFree;
    if (target.hasVerticalVelocity) {
      target.verticalVelocity = plan.vzFree;
    }

    // Reaction from braking transfers into ground anchor (or character if unanchored in mid-air)
    const freeImpX = mObj * (target.velocity.x - vxBefore);
    const freeImpY = mObj * (target.velocity.y - vyBefore);
    const freeImpZ = mObj * (target.verticalVelocity - vzBefore);
    if (Math.hypot(freeImpX, freeImpY, freeImpZ) > 0.0001) {
      TelekinesisCapability.applyReactionImpulse(char, freeImpX, freeImpY, freeImpZ, arena);
    }

    // 2. Apply Stage 2 (Active Momentum Creation, scaled by granted power)
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
            "telekinesis",
            mod.allowPartialPower
          );
          const powerRatio = Math.max(0, Math.min(1.0, grantedWatts / plan.rawDemandedWatts));
          accelScale = Math.sqrt(powerRatio);
        }
      }
    } else {
      accelScale = 0;
    }

    if (accelScale > 0.0001) {
      const dvx = plan.axCreate * accelScale * safeDt;
      const dvy = plan.ayCreate * accelScale * safeDt;
      const dvz = plan.azCreate * accelScale * safeDt;

      target.velocity.x += dvx;
      target.velocity.y += dvy;
      if (target.hasVerticalVelocity) {
        target.verticalVelocity += dvz;
      }

      TelekinesisCapability.applyReactionImpulse(
        char,
        mObj * dvx,
        mObj * dvy,
        mObj * dvz,
        arena
      );
    }

    // 3. Apply Telekinetic Stability Harmonic Wobble
    const stability = mod.getStability(reg);
    const instability = Math.max(0, Math.min(1, 1.0 - stability));
    if (instability > 0.001) {
      mod.oscillationPhase += safeDt * (5.0 + instability * 7.0);
      const p = mod.oscillationPhase;
      const wobbleAx = (Math.sin(p * 1.9) * 0.6 + Math.cos(p * 3.4) * 0.4) * instability * 16.0;
      const wobbleAy = (Math.cos(p * 2.5) * 0.6 + Math.sin(p * 4.1) * 0.4) * instability * 16.0;
      const wobbleAz = (Math.sin(p * 3.1) * 0.65 + Math.cos(p * 4.7) * 0.35) * instability * 18.0;

      target.velocity.x += wobbleAx * safeDt;
      target.velocity.y += wobbleAy * safeDt;
      if (target.hasVerticalVelocity) {
        target.verticalVelocity += wobbleAz * safeDt;
      }
    }

    // Clamp target within telekinesis reach
    if (target.position.z < 0) target.position.z = 0;
  }

  private static computePlan(
    char: Character,
    target: GameObject,
    aimTargetPos: Vector2D | null,
    dt: number,
    arena: Arena
  ): {
    vxFree: number;
    vyFree: number;
    vzFree: number;
    axCreate: number;
    ayCreate: number;
    azCreate: number;
    rawDemandedWatts: number;
    requestedWatts: number;
  } | null {
    const mod = char.telekinesisModule;
    if (!mod) return null;

    const reg = char.properties;
    const safeDt = Math.max(dt, 1 / 120);
    const g = arena.gravity || 30.0;
    const reach = mod.getTelekinesisReach(reg);
    const maxMoveSpeed = mod.getMaxMoveSpeed(reg);
    const hoverOffset = mod.getHoldHoverHeight(reg);

    // Desired 2D cursor goal clamped within telekinesisReach around the character
    let goalX = aimTargetPos ? aimTargetPos.x : char.position.x + Math.cos(char.facingAngle) * Math.min(2.2, reach * 0.6);
    let goalY = aimTargetPos ? aimTargetPos.y : char.position.y + Math.sin(char.facingAngle) * Math.min(2.2, reach * 0.6);
    const gDx = goalX - char.position.x;
    const gDy = goalY - char.position.y;
    const gDist = Math.hypot(gDx, gDy);
    const maxHorizHold = Math.max(0.5, reach * 0.92);
    if (gDist > maxHorizHold) {
      goalX = char.position.x + (gDx / gDist) * maxHorizHold;
      goalY = char.position.y + (gDy / gDist) * maxHorizHold;
    }

    // Clamp inside arena walls bounds
    const tr = Math.max(0.15, target.colliderRadius || 0.25);
    goalX = Math.max(tr, Math.min(arena.width - tr, goalX));
    goalY = Math.max(tr, Math.min(arena.height - tr, goalY));

    const wallAtTarget = arena.getWallAt(target.position.x, target.position.y);
    const wallAtGoal = arena.getWallAt(goalX, goalY);
    const surfaceZ = Math.max(
      target.supportingSurfaceHeight ?? 0,
      wallAtTarget ? wallAtTarget.wallHeight : 0,
      wallAtGoal ? wallAtGoal.wallHeight : 0
    );
    const goalZ = surfaceZ + hoverOffset;

    // Desired velocity toward goal (proportional spring clamped to maxMoveSpeed)
    const errX = goalX - target.position.x;
    const errY = goalY - target.position.y;
    const errZ = goalZ - target.position.z;

    const kpHoriz = 11.0;
    const kpVert = 10.0;
    let vxWant = errX * kpHoriz;
    let vyWant = errY * kpHoriz;
    const wantHorizMag = Math.hypot(vxWant, vyWant);
    if (wantHorizMag > maxMoveSpeed) {
      vxWant = (vxWant / wantHorizMag) * maxMoveSpeed;
      vyWant = (vyWant / wantHorizMag) * maxMoveSpeed;
    }
    const vzWant = Math.max(-maxMoveSpeed, Math.min(maxMoveSpeed, errZ * kpVert));

    let vxFree = target.velocity.x;
    let vyFree = target.velocity.y;
    let vzFree = target.verticalVelocity;

    // Stage 1: Energy-Free Braking / Transfer (strictly reduces speed or matches direction without creating from 0)
    const maxBrakeDeltaV = 42.0 * safeDt;
    const wantMag = Math.hypot(vxWant, vyWant);
    if (wantMag < 0.05) {
      const curMag = Math.hypot(vxFree, vyFree);
      if (curMag > 0.0001) {
        const newMag = Math.max(0, curMag - maxBrakeDeltaV);
        const s = newMag / curMag;
        vxFree *= s;
        vyFree *= s;
      }
    } else {
      const ux = vxWant / wantMag;
      const uy = vyWant / wantMag;
      const vPar0 = vxFree * ux + vyFree * uy;
      const vPerpX = vxFree - vPar0 * ux;
      const vPerpY = vyFree - vPar0 * uy;
      const vPerpMag = Math.hypot(vPerpX, vPerpY);

      const newPerpMag = vPerpMag > 0.0001 ? Math.max(0, vPerpMag - maxBrakeDeltaV) : 0;
      const perpScale = vPerpMag > 0.0001 ? newPerpMag / vPerpMag : 0;

      let vParNew = vPar0;
      if (vPar0 < 0) {
        vParNew = Math.min(0, vPar0 + maxBrakeDeltaV);
      } else if (vPar0 > wantMag) {
        vParNew = Math.max(wantMag, vPar0 - maxBrakeDeltaV);
      }

      vxFree = vParNew * ux + vPerpX * perpScale;
      vyFree = vParNew * uy + vPerpY * perpScale;
    }

    // Vertical energy-free braking: only reduces |vz| when moving faster than vzWant in the same sign or opposing vzWant
    if (vzFree < -0.001 && vzWant >= vzFree) {
      vzFree = Math.min(vzWant <= 0 ? vzWant : 0, vzFree + maxBrakeDeltaV);
    } else if (vzFree > 0.001 && vzWant <= vzFree) {
      vzFree = Math.max(vzWant >= 0 ? vzWant : 0, vzFree - maxBrakeDeltaV);
    }

    // Stage 2: Active Momentum Creation (Equivalence-Principle counter-gravity + acceleration toward goal)
    const maxCreateAccel = 45.0;
    const rawAx = (vxWant - vxFree) / safeDt;
    const rawAy = (vyWant - vyFree) / safeDt;
    const rawAHMag = Math.hypot(rawAx, rawAy);
    const clampedAHMag = Math.min(maxCreateAccel, rawAHMag);
    const axCreate = rawAHMag > 0.0001 ? (rawAx / rawAHMag) * clampedAHMag : 0;
    const ayCreate = rawAHMag > 0.0001 ? (rawAy / rawAHMag) * clampedAHMag : 0;

    // Must counter gravity g in uncurved space + accelerate vzFree toward vzWant
    const climbAccel = Math.max(-g, Math.min(maxCreateAccel, (vzWant - vzFree) / safeDt));
    const azCreate = target.hasGravity ? Math.max(0, g + climbAccel) : Math.max(0, climbAccel);

    const mObj = Math.max(0.2, target.hasMass ? target.mass : 1.0);
    const mChar = Math.max(0.2, char.hasMass ? char.mass : 1.2);
    const charSurfZ = Math.max(
      0,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall ? arena.wallHeight : 0
    );
    const isAnchored = Math.max(0, char.position.z - charSurfZ) <= mod.getGroundAnchorRange(reg);
    // When ground-anchored, m_ground = ∞ so kinetic work is 0.5 * mObj * a^2.
    // When unanchored in mid-air, two-body acceleration requires 0.5 * mObj * a^2 * (1 + mObj / mChar).
    const recoilWorkMult = isAnchored ? 1.0 : (1.0 + mObj / mChar);

    const aSq = axCreate * axCreate + ayCreate * ayCreate + azCreate * azCreate;
    const mechWatts = 0.5 * mObj * recoilWorkMult * aSq;
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
    };
  }
}
