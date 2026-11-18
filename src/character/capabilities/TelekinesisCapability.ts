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

    const mod = char.telekinesisModule;
    if (mod.consumesEnergy && char.energyPool && char.energyPool.enabled && !char.energyPool.infiniteEnergy) {
      const reg = char.properties;
      if (
        char.energyPool.isExhausted ||
        char.energyPool.getCurrentEnergy(reg) <= 0.0001 ||
        char.energyPool.getCurrentStamina(reg) <= 0.0001
      ) {
        char.energyPool.notifyInsufficientEnergy({
          abilityId: "telekinesis",
          demandedAmount: Math.max(50, mod.getMaxPower(reg)),
          isBurst: false,
          unit: "W/s",
          registry: reg,
        });
        return false;
      }
    }

    if (char.telekineticTarget && char.telekineticTarget !== target) {
      TelekinesisCapability.releaseTarget(char);
    }

    target.wakeUp();
    target.isInFlight = false;
    target.knockbackUntilTime = 0;
    target.lastThrower = null;
    target.originalThrower = null;

    mod.appliedWaveOffsetX = 0;
    mod.appliedWaveOffsetY = 0;
    mod.appliedWaveOffsetZ = 0;
    mod.appliedWaveVx = 0;
    mod.appliedWaveVy = 0;
    mod.appliedWaveVz = 0;

    char.telekineticTarget = target;
    (target as any).telekinesedBy = char;
    return true;
  }

  public static releaseTarget(char: Character): GameObject | null {
    const target = char.telekineticTarget;
    if (!target) return null;

    if (char.telekinesisModule) {
      const mod = char.telekinesisModule;
      mod.appliedWaveOffsetX = 0;
      mod.appliedWaveOffsetY = 0;
      mod.appliedWaveOffsetZ = 0;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
    }

    char.telekineticTarget = null;
    char.isTelekineticObjectControl = false;
    char.telekineticFrozenPos = null;
    char.activeTrajectory = null;
    char.isThrowCancelZone = false;
    if ((target as any).telekinesedBy === char) {
      (target as any).telekinesedBy = null;
    }
    if (!target.isCharacter && (target as any).facingAngle !== undefined) {
      delete (target as any).facingAngle;
    }
    return target;
  }

  /**
   * Applies Newton's 3rd law equal-and-opposite reaction impulse `recoil = -appliedObjImpulse`
   * directly to the caster's velocity (`Δv_char = -Δp_obj / m_char`).
   * Surface friction (when grounded) or active FlightModule thrust naturally resists or counters it.
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
    if (Math.hypot(availX, availY, availZ) <= 1e-6) return;

    char.velocity.x += availX / charMass;
    char.velocity.y += availY / charMass;

    if (char.hasVerticalVelocity) {
      const surfaceHeight = arena
        ? Math.max(
            0,
            char.supportingSurfaceHeight ?? 0,
            char.standingWall ? arena.wallHeight : 0
          )
        : (char.supportingSurfaceHeight ?? 0);
      const heightAboveSurface = Math.max(0, char.position.z - surfaceHeight);
      // When resting on a surface, downward reaction is borne by ground normal force; upward or airborne reaction moves character vertically.
      if (heightAboveSurface > 0.02 || availZ > 0) {
        char.verticalVelocity += availZ / charMass;
      }
    }
  }

  /**
   * Executes a telekinetic fling/throw impulse on the telekinetically held object toward aimTargetPos,
   * respecting power cap and equal-and-opposite reaction.
   */
  public static flingTarget(
    char: Character,
    aimTargetPos: Vector2D,
    arena: Arena,
    powerScale: number = 1.0,
    explicitLaunchVel?: { vx: number; vy: number; vz: number }
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
    const heightAboveSurface = Math.max(0, char.position.z - surfaceHeight);
    const isAnchored = heightAboveSurface <= 0.04 || (char.hasFlight && heightAboveSurface <= mod.getGroundAnchorRange(reg));
    const effMass = isAnchored ? mObj : (mObj * mChar) / (mObj + mChar);

    const dx = aimTargetPos.x - target.position.x;
    const dy = aimTargetPos.y - target.position.y;
    const dist = Math.hypot(dx, dy);
    const dirX = dist > 0.05 ? dx / dist : Math.cos(char.facingAngle);
    const dirY = dist > 0.05 ? dy / dist : Math.sin(char.facingAngle);

    // Compute desired launch speed scaled against Telekinesis maxPower capacity
    const capWatts = mod.getMaxPower(reg);
    const desiredSpeed = explicitLaunchVel
      ? Math.hypot(explicitLaunchVel.vx, explicitLaunchVel.vy)
      : Math.max(6.0, mod.getMaxMoveSpeed(reg) * 1.45) * Math.max(0.35, Math.min(1.0, powerScale));
    const vzBoost = explicitLaunchVel ? explicitLaunchVel.vz : 4.2;

    const mechWork = 0.5 * effMass * (desiredSpeed * desiredSpeed + vzBoost * vzBoost);
    const efficiency = Math.max(0.01, char.energyPool ? char.energyPool.getMuscleEfficiency(reg) : 0.25);
    const demandedJoules = mechWork / efficiency;

    // Max burst energy allowed scales comparably with ThrowModule burst capacity
    const maxBurstJoules = Math.max(400, capWatts * 0.75);
    const requestedJoules = Math.min(demandedJoules, maxBurstJoules);

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
        allowPartialPower: true,
        registry: reg,
      });
      if (!res.granted || res.grantedJoules <= 0.001) {
        return null;
      }
      speedScale = Math.sqrt(Math.max(0, res.grantedJoules / Math.max(1, demandedJoules)));
    }

    const vxOut = explicitLaunchVel ? explicitLaunchVel.vx * speedScale : dirX * desiredSpeed * speedScale;
    const vyOut = explicitLaunchVel ? explicitLaunchVel.vy * speedScale : dirY * desiredSpeed * speedScale;
    const vzOut = vzBoost * speedScale;

    const impX = mObj * (vxOut - target.velocity.x);
    const impY = mObj * (vyOut - target.velocity.y);
    const impZ = mObj * (vzOut - target.verticalVelocity);

    char.isTelekineticObjectControl = false;
    char.telekineticFrozenPos = null;
    TelekinesisCapability.releaseTarget(char);

    target.velocity.x = vxOut;
    target.velocity.y = vyOut;
    if (target.hasVerticalVelocity) {
      target.verticalVelocity = vzOut;
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

    // Break telekinetic connection immediately when character runs out of energy/stamina or enters exhaustion
    const reg = char.properties;
    const checksEnergy = mod.consumesEnergy && char.energyPool && char.energyPool.enabled && !char.energyPool.infiniteEnergy;
    if (
      checksEnergy &&
      char.energyPool &&
      (char.energyPool.isExhausted ||
        char.energyPool.getCurrentEnergy(reg) <= 0.0001 ||
        char.energyPool.getCurrentStamina(reg) <= 0.0001)
    ) {
      char.energyPool.notifyInsufficientEnergy({
        abilityId: "telekinesis",
        demandedAmount: Math.max(50, mod.getMaxPower(reg)),
        isBurst: false,
        unit: "W/s",
        registry: reg,
      });
      TelekinesisCapability.releaseTarget(char);
      return;
    }

    target.wakeUp();
    target.isInFlight = false;
    target.knockbackUntilTime = 0;

    const safeDt = Math.max(dt, 1 / 120);
    const plan = TelekinesisCapability.computePlan(char, target, aimTargetPos, safeDt, arena);
    if (!plan) return;

    // Resolve energy budget BEFORE applying Stage 1 braking so running out of energy never slows a falling object
    // Prioritize vertical lift (vertWatts) first so heavy targets (like characters/dummies) always lift off the ground
    // instead of scraping against ground friction, and allocate remaining power to horizontal movement (horizWatts).
    let vertScale = 1.0;
    let horizScale = 1.0;
    if (plan.rawDemandedWatts > 0.01) {
      if (mod.consumesEnergy && char.energyPool && char.energyPool.enabled) {
        if (plan.requestedWatts <= 0) {
          TelekinesisCapability.releaseTarget(char);
          return;
        } else {
          const grantedWatts = char.energyPool.requestPower(
            plan.requestedWatts,
            safeDt,
            reg,
            false,
            "telekinesis",
            mod.allowPartialPower
          );
          if (
            !char.energyPool.infiniteEnergy &&
            (grantedWatts <= 0.0001 ||
              char.energyPool.isExhausted ||
              char.energyPool.getCurrentEnergy(reg) <= 0.0001 ||
              char.energyPool.getCurrentStamina(reg) <= 0.0001)
          ) {
            TelekinesisCapability.releaseTarget(char);
            return;
          }
          const vertGranted = Math.min(grantedWatts, plan.vertWatts);
          vertScale = plan.vertWatts > 0.0001
            ? Math.sqrt(Math.max(0, Math.min(1.0, vertGranted / plan.vertWatts)))
            : 1.0;
          const remWatts = Math.max(0, grantedWatts - vertGranted);
          horizScale = plan.horizWatts > 0.0001
            ? Math.sqrt(Math.max(0, Math.min(1.0, remWatts / plan.horizWatts)))
            : 1.0;
        }
      }
    } else {
      vertScale = 0;
      horizScale = 0;
    }

    const mObj = Math.max(0.2, target.hasMass ? target.mass : 1.0);

    // Strip previous tick's zero-cost stability wave velocity before applying Stage 1 & Stage 2
    target.velocity.x -= mod.appliedWaveVx;
    target.velocity.y -= mod.appliedWaveVy;
    if (target.hasVerticalVelocity) {
      target.verticalVelocity -= mod.appliedWaveVz;
    }
    mod.appliedWaveVx = 0;
    mod.appliedWaveVy = 0;
    mod.appliedWaveVz = 0;

    const vxBefore = target.velocity.x;
    const vyBefore = target.velocity.y;
    const vzBefore = target.verticalVelocity;

    // 1. Apply Stage 1 (0-Energy Momentum Transfer / Braking) to target
    target.velocity.x = plan.vxFree;
    target.velocity.y = plan.vyFree;
    if (target.hasVerticalVelocity) {
      target.verticalVelocity = plan.vzFree;
    }

    // Apply equal-and-opposite reaction from braking
    const freeImpX = mObj * (target.velocity.x - vxBefore);
    const freeImpY = mObj * (target.velocity.y - vyBefore);
    const freeImpZ = mObj * (target.verticalVelocity - vzBefore);
    if (Math.hypot(freeImpX, freeImpY, freeImpZ) > 0.0001) {
      TelekinesisCapability.applyReactionImpulse(char, freeImpX, freeImpY, freeImpZ, arena);
    }

    // 2. Apply Stage 2 (Active Momentum Creation, scaled by granted power)

    if (vertScale > 0.0001 || horizScale > 0.0001) {
      const dvx = plan.axCreate * horizScale * safeDt;
      const dvy = plan.ayCreate * horizScale * safeDt;
      const dvz = plan.azCreate * vertScale * safeDt;

      target.velocity.x += dvx;
      target.velocity.y += dvy;
      if (target.hasVerticalVelocity) {
        target.verticalVelocity += dvz;
      }

      // When within groundAnchorRange, static gravity counter-force (g) is braced against the ground anchor;
      // only active vertical acceleration (climbAccel = azCreate - g) and active horizontal movement apply recoil to the caster.
      const g = arena.gravity || 30.0;
      const wallAtTarget = arena.getWallAt(target.position.x, target.position.y);
      const targetSurfZ = Math.max(
        0,
        target.supportingSurfaceHeight ?? 0,
        wallAtTarget ? wallAtTarget.wallHeight : 0
      );
      // Clear ground surface contact as soon as upward lift is applied so character ground friction (2.0x) does not drag the target
      if (dvz > 0.05 && target.position.z - targetSurfZ <= 0.03) {
        target.position.z = targetSurfZ + 0.035;
      }
      const isTargetAnchored = Math.max(0, target.position.z - targetSurfZ) <= mod.getGroundAnchorRange(reg);
      const azReaction = isTargetAnchored && target.hasGravity
        ? (plan.azCreate - g)
        : plan.azCreate;
      const dvzReaction = azReaction * vertScale * safeDt;

      TelekinesisCapability.applyReactionImpulse(
        char,
        mObj * dvx,
        mObj * dvy,
        mObj * dvzReaction,
        arena
      );
    }

    // 3. Apply Long-Period, High-Amplitude 3D Stability Wave at 0 Energy Cost (cost stays constant while oscillating)
    // While in Object Control Mode, freeze wave velocity while keeping appliedWaveOffset intact so returning to
    // movement mode resumes smoothly around the exact same oscillation center with zero snap or velocity jolt.
    const stability = mod.getStability(reg);
    const instability = Math.max(0, Math.min(1, 1.0 - stability));
    if (instability > 0.001) {
      if (!char.isTelekineticObjectControl) {
        mod.oscillationPhase += safeDt * (1.25 + instability * 1.15);
        const p = mod.oscillationPhase;
        const waveX = (Math.sin(p * 0.71) * 0.68 + Math.cos(p * 1.33) * 0.32) * instability * 2.5;
        const waveY = (Math.cos(p * 0.57 + 0.9) * 0.68 + Math.sin(p * 1.21) * 0.32) * instability * 2.5;
        const waveZ = (Math.sin(p * 0.81 + 0.4) * 0.70 + Math.cos(p * 1.49) * 0.30) * instability * 1.5;

        const waveVx = (waveX - mod.appliedWaveOffsetX) / safeDt;
        const waveVy = (waveY - mod.appliedWaveOffsetY) / safeDt;
        const waveVz = target.hasVerticalVelocity ? (waveZ - mod.appliedWaveOffsetZ) / safeDt : 0;

        target.velocity.x += waveVx;
        target.velocity.y += waveVy;
        if (target.hasVerticalVelocity) {
          target.verticalVelocity += waveVz;
        }

        mod.appliedWaveVx = waveVx;
        mod.appliedWaveVy = waveVy;
        mod.appliedWaveVz = waveVz;
        mod.appliedWaveOffsetX = waveX;
        mod.appliedWaveOffsetY = waveY;
        mod.appliedWaveOffsetZ = waveZ;
      } else {
        mod.appliedWaveVx = 0;
        mod.appliedWaveVy = 0;
        mod.appliedWaveVz = 0;
      }
    } else {
      mod.appliedWaveOffsetX = 0;
      mod.appliedWaveOffsetY = 0;
      mod.appliedWaveOffsetZ = 0;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
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
    horizWatts: number;
    vertWatts: number;
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

    // Desired 2D cursor goal clamped within telekinesisReach around the character (without stability wave so power cost stays constant)
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

    const meanPosX = target.position.x - mod.appliedWaveOffsetX;
    const meanPosY = target.position.y - mod.appliedWaveOffsetY;
    const meanPosZ = Math.max(0, target.position.z - mod.appliedWaveOffsetZ);

    const wallAtTarget = arena.getWallAt(meanPosX, meanPosY);
    const wallAtGoal = arena.getWallAt(goalX, goalY);
    const surfaceZ = Math.max(
      target.supportingSurfaceHeight ?? 0,
      wallAtTarget ? wallAtTarget.wallHeight : 0,
      wallAtGoal ? wallAtGoal.wallHeight : 0
    );
    const goalZ = Math.max(surfaceZ + 0.15, surfaceZ + hoverOffset);

    // Desired velocity toward goal in the wave-stripped mean frame (proportional spring clamped to maxMoveSpeed)
    const errX = goalX - meanPosX;
    const errY = goalY - meanPosY;
    const errZ = goalZ - meanPosZ;

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

    let vxFree = target.velocity.x - mod.appliedWaveVx;
    let vyFree = target.velocity.y - mod.appliedWaveVy;
    let vzFree = target.verticalVelocity - mod.appliedWaveVz;

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
    const maxHorizCreateAccel = 36.0;
    const maxVertCreateAccel = 18.0;
    const rawAx = (vxWant - vxFree) / safeDt;
    const rawAy = (vyWant - vyFree) / safeDt;
    const rawAHMag = Math.hypot(rawAx, rawAy);
    const clampedAHMag = Math.min(maxHorizCreateAccel, rawAHMag);
    const axCreate = rawAHMag > 0.0001 ? (rawAx / rawAHMag) * clampedAHMag : 0;
    const ayCreate = rawAHMag > 0.0001 ? (rawAy / rawAHMag) * clampedAHMag : 0;

    // Must counter gravity g in uncurved space + accelerate vzFree toward vzWant
    const climbAccel = Math.max(-g, Math.min(maxVertCreateAccel, (vzWant - vzFree) / safeDt));
    const azCreate = target.hasGravity ? Math.max(0, g + climbAccel) : Math.max(0, climbAccel);
    const isTargetAnchored = Math.max(0, target.position.z - surfaceZ) <= mod.getGroundAnchorRange(reg);
    // When braced against the ground anchor, static hover counter-gravity has a 0.55x bracing efficiency
    const effHoverG = isTargetAnchored ? g * 0.55 : g;
    const azDemand = target.hasGravity ? Math.max(0, effHoverG + climbAccel) : Math.max(0, climbAccel);

    const mObj = Math.max(0.2, target.hasMass ? target.mass : 1.0);
    const mChar = Math.max(0.2, char.hasMass ? char.mass : 1.2);
    const charSurfZ = Math.max(
      0,
      char.supportingSurfaceHeight ?? 0,
      char.standingWall ? arena.wallHeight : 0
    );
    const heightAboveSurface = Math.max(0, char.position.z - charSurfZ);
    const isAnchored = heightAboveSurface <= 0.04 || (char.hasFlight && heightAboveSurface <= mod.getGroundAnchorRange(reg));
    // When ground-anchored, m_ground = ∞ so kinetic work is 0.5 * mObj * a^2.
    // When unanchored in mid-air, two-body acceleration requires 0.5 * mObj * a^2 * (1 + mObj / mChar).
    const recoilWorkMult = isAnchored ? 1.0 : (1.0 + mObj / mChar);

    const efficiency = Math.max(0.01, char.energyPool ? char.energyPool.getMuscleEfficiency(reg) : 0.25);
    const horizWatts = (0.5 * mObj * recoilWorkMult * (axCreate * axCreate + ayCreate * ayCreate)) / efficiency;
    const vertWatts = (0.5 * mObj * recoilWorkMult * (azDemand * azDemand)) / efficiency;
    const rawDemandedWatts = horizWatts + vertWatts;

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
      horizWatts,
      vertWatts,
      rawDemandedWatts,
      requestedWatts,
    };
  }
}
