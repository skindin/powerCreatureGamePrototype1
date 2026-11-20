import type { Character } from "../Character.js";
import type { GameObject, Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated 1-to-1 capability slice for Telekinetic Manipulation (`TelekinesisModule`).
 *
 * Implements a unified paid Newton's 3rd Law momentum-exchange model:
 * - Remote grab / release / fling within `telekinesisReach`
 * - Stability harmonic wobble on held object target point
 * - Every force vector `||F||` applied to the target consumes metabolic power
 *   `P = (0.5 * g * ||F||) / efficiency` (capped at `maxPowerProp`, gated by stamina/energy)
 *   and imparts the equal-and-opposite reaction impulse `-Δp` directly onto the caster.
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
    mod.isGroundedHold = false;
    mod.groundedLiftAccum = 0;
    mod.targetHoldZ = Math.max(
      (target.supportingSurfaceHeight ?? 0) + mod.getHoldHoverHeight(char.properties),
      target.position.z
    );

    char.telekineticTarget = target;
    (target as any).telekinesedBy = char;
    return true;
  }

  public static releaseTarget(char: Character): GameObject | null {
    const target = char.telekineticTarget;
    if (!target) return null;

    if (char.telekinesisModule) {
      const mod = char.telekinesisModule;
      mod.targetHoldZ = null;
      mod.isGroundedHold = false;
      mod.groundedLiftAccum = 0;
      mod.appliedWaveOffsetX = 0;
      mod.appliedWaveOffsetY = 0;
      mod.appliedWaveOffsetZ = 0;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
    }

    char.telekineticTarget = null;
    char.isTelekineticObjectControl = false;
    char.isTelekineticElevationControl = false;
    (char as any).isHoldingTkGunFire = false;
    (char as any)._tkObjectControlScreenAnchor = null;
    (char as any)._tkObjectControlCharOffset = null;
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
   * Ground surface friction/normal force (when standing on ground) or Flight thrust (when flying)
   * resists the recoil within its energy and power limits.
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

    const surfaceHeight = arena
      ? Math.max(
        0,
        char.supportingSurfaceHeight ?? 0,
        char.standingWall ? arena.wallHeight : 0
      )
      : (char.supportingSurfaceHeight ?? 0);
    const heightAboveSurface = Math.max(0, char.position.z - surfaceHeight);

    const charMass = Math.max(0.2, char.mass);
    const availX = -appliedObjImpulseX;
    const availY = -appliedObjImpulseY;
    const availZ = -appliedObjImpulseZ;
    if (Math.hypot(availX, availY, availZ) <= 1e-6) return;

    char.velocity.x += availX / charMass;
    char.velocity.y += availY / charMass;

    if (char.hasVerticalVelocity) {
      // When resting directly on a surface, downward reaction is borne by floor normal force;
      // when airborne/flying, full downward reaction hits verticalVelocity for Flight to resist.
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
    const effMass = mObj;

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
   * - Validates range, energy/stamina reserves, & target liveness
   * - Resolves Euclidean 3D force budget (prioritizing vertical lift over horizontal movement)
   * - Applies paid acceleration to target and full equal-and-opposite reaction impulse to caster
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

    // Resolve 2-tier Euclidean 3D power budget:
    // Tier 1: Anti-gravity hold (hoverWatts). Tier 2: Orthogonal share of horizontal movement + extra vertical climb.
    const cap = mod.getMaxPower(reg);
    let hoverScale = 0;
    let extraScale = 0;
    if (plan.rawDemandedWatts > 0.01) {
      let budgetWatts = cap > 0 ? Math.min(plan.rawDemandedWatts, cap) : plan.rawDemandedWatts;
      if (mod.consumesEnergy && char.energyPool && char.energyPool.enabled) {
        if (plan.requestedWatts <= 0) {
          TelekinesisCapability.releaseTarget(char);
          return;
        }
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
        budgetWatts = char.energyPool.infiniteEnergy
          ? (cap > 0 ? Math.min(plan.rawDemandedWatts, cap) : plan.rawDemandedWatts)
          : grantedWatts;
      }

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

    const mObj = Math.max(0.2, target.hasMass ? target.mass : 1.0);

    // Strip previous tick's zero-cost stability wave velocity before applying paid acceleration
    target.velocity.x -= mod.appliedWaveVx;
    target.velocity.y -= mod.appliedWaveVy;
    if (target.hasVerticalVelocity) {
      target.verticalVelocity -= mod.appliedWaveVz;
    }
    mod.appliedWaveVx = 0;
    mod.appliedWaveVy = 0;
    mod.appliedWaveVz = 0;

    // Apply paid acceleration to target and full equal-and-opposite reaction impulse to caster
    if (hoverScale > 0.0001 || extraScale > 0.0001) {
      const dvx = plan.axCreate * extraScale * safeDt;
      const dvy = plan.ayCreate * extraScale * safeDt;
      const actualAz = mod.isGroundedHold ? 0 : (plan.hoverAz * hoverScale + plan.extraAz * extraScale);
      const dvz = actualAz * safeDt;

      target.velocity.x += dvx;
      target.velocity.y += dvy;
      if (!mod.isGroundedHold && target.hasVerticalVelocity) {
        target.verticalVelocity += dvz;
      }

      const wallAtTarget = arena.getWallAt(target.position.x, target.position.y);
      const targetSurfZ = Math.max(
        0,
        target.supportingSurfaceHeight ?? 0,
        wallAtTarget ? wallAtTarget.wallHeight : 0
      );
      // Clear ground surface contact only when applied lift actually overcomes gravity (or zero-g push > 0.05)
      const canLiftOffSurface = !mod.isGroundedHold && (
        target.hasGravity ? actualAz > (arena.gravity || 30.0) + 0.05 : dvz > 0.05
      );
      if (canLiftOffSurface && target.position.z - targetSurfZ <= 0.03) {
        target.position.z = targetSurfZ + 0.035;
      }

      TelekinesisCapability.applyReactionImpulse(
        char,
        mObj * dvx,
        mObj * dvy,
        mObj * dvz,
        arena
      );
    }

    // Apply Long-Period, High-Amplitude 3D Stability Wave at 0 Energy Cost (cost stays constant while oscillating)
    // Runs continuously in both movement mode and Object Control Mode unless intentionally grounded via isGroundedHold.
    const stability = mod.getStability(reg);
    const instability = Math.max(0, Math.min(1, 1.0 - stability));
    if (!mod.isGroundedHold && instability > 0.001) {
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
      mod.appliedWaveOffsetX = 0;
      mod.appliedWaveOffsetY = 0;
      mod.appliedWaveOffsetZ = 0;
      mod.appliedWaveVx = 0;
      mod.appliedWaveVy = 0;
      mod.appliedWaveVz = 0;
    }

    // Clamp target floor height
    if (target.position.z < 0) target.position.z = 0;
  }

  private static computePlan(
    char: Character,
    target: GameObject,
    aimTargetPos: Vector2D | null,
    dt: number,
    arena: Arena
  ): {
    axCreate: number;
    ayCreate: number;
    hoverAz: number;
    extraAz: number;
    horizWatts: number;
    hoverWatts: number;
    extraVertWatts: number;
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

    const maxHorizCreateAccel = 36.0;
    const maxVertCreateAccel = 36.0;
    const mObj = Math.max(0.2, target.hasMass ? target.mass : 1.0);
    const efficiency = Math.max(0.01, char.energyPool ? char.energyPool.getMuscleEfficiency(reg) : 0.25);
    const cap = mod.getMaxPower(reg);
    const forcePowerFactor = 0.5 * g;
    const hoverWattsCapEst = (!mod.isGroundedHold && target.hasGravity) ? (forcePowerFactor * mObj * g) / efficiency : 0;
    const horizBudgetAtHover = cap > hoverWattsCapEst ? Math.sqrt(Math.max(0, cap * cap - hoverWattsCapEst * hoverWattsCapEst)) : 0;
    const aHorizAvail = (horizBudgetAtHover * efficiency) / (forcePowerFactor * mObj);
    const aVertAvail = (!mod.isGroundedHold && cap > hoverWattsCapEst) ? ((cap - hoverWattsCapEst) * efficiency) / (forcePowerFactor * mObj) : 0;

    const meanPosX = target.position.x - mod.appliedWaveOffsetX;
    const meanPosY = target.position.y - mod.appliedWaveOffsetY;
    const meanPosZ = Math.max(0, target.position.z - mod.appliedWaveOffsetZ);

    // Desired 2D cursor goal clamped within telekinesisReach around the character (without stability wave so power cost stays constant)
    let goalX = aimTargetPos ? aimTargetPos.x : char.position.x + Math.cos(char.facingAngle) * Math.min(2.2, reach * 0.6);
    let goalY = aimTargetPos ? aimTargetPos.y : char.position.y + Math.sin(char.facingAngle) * Math.min(2.2, reach * 0.6);

    const gDx = goalX - char.position.x;
    const gDy = goalY - char.position.y;
    const gDist = Math.hypot(gDx, gDy);
    const maxHorizHold = Math.max(0.5, reach * 0.92);
    if (gDist > maxHorizHold) {
      const ox = meanPosX - char.position.x;
      const oy = meanPosY - char.position.y;
      const oDistSq = ox * ox + oy * oy;
      const rSq = maxHorizHold * maxHorizHold;
      if (oDistSq < rSq) {
        // Intersect ray from meanPos toward desired cursor with the reach circle to preserve exact push angle
        const dx = goalX - meanPosX;
        const dy = goalY - meanPosY;
        const a = dx * dx + dy * dy;
        if (a > 1e-8) {
          const b = 2 * (ox * dx + oy * dy);
          const c = oDistSq - rSq;
          const disc = Math.max(0, b * b - 4 * a * c);
          const t = Math.min(1, (-b + Math.sqrt(disc)) / (2 * a));
          goalX = meanPosX + t * dx;
          goalY = meanPosY + t * dy;
        }
      } else {
        goalX = char.position.x + (gDx / gDist) * maxHorizHold;
        goalY = char.position.y + (gDy / gDist) * maxHorizHold;
      }
    }

    // Clamp to arena outer bounds (allow pushing up against outer walls just like interior walls)
    goalX = Math.max(0, Math.min(arena.width, goalX));
    goalY = Math.max(0, Math.min(arena.height, goalY));

    const wallAtTarget = arena.getWallAt(meanPosX, meanPosY);
    const wallTopDirectlyUnderTarget = (wallAtTarget && meanPosZ >= wallAtTarget.wallHeight - 0.05)
      ? wallAtTarget.wallHeight
      : 0;
    const currentFloorZ = Math.max(0, target.supportingSurfaceHeight ?? 0, wallTopDirectlyUnderTarget);

    if (mod.targetHoldZ === null || mod.targetHoldZ === undefined) {
      mod.targetHoldZ = mod.isGroundedHold
        ? currentFloorZ
        : Math.max((target.supportingSurfaceHeight ?? 0) + hoverOffset, meanPosZ);
    }

    const vx0 = target.velocity.x - mod.appliedWaveVx;
    const vy0 = target.velocity.y - mod.appliedWaveVy;
    const vz0 = target.verticalVelocity - mod.appliedWaveVz;

    let vzWant = 0;
    if (mod.isGroundedHold) {
      mod.targetHoldZ = currentFloorZ;
    } else {
      const minHoldZ = Math.max(0.05, currentFloorZ + 0.05);
      const maxHoldZ = char.position.z + Math.max(1.5, reach * 0.92);
      const goalZ = Math.max(minHoldZ, Math.min(maxHoldZ, mod.targetHoldZ));
      const errZ = goalZ - meanPosZ;
      const kpVert = 10.0;
      if (errZ > 0) {
        const vStopSafeZ = aVertAvail > 0.05 ? Math.sqrt(2.0 * (0.75 * Math.min(maxVertCreateAccel, aVertAvail)) * errZ) : maxMoveSpeed;
        vzWant = Math.min(maxMoveSpeed, errZ * kpVert, vStopSafeZ);
      } else {
        vzWant = Math.max(-maxMoveSpeed, errZ * kpVert);
      }
    }

    // Desired 2D velocity toward goal in the wave-stripped mean frame with critically-damped arrival braking curve
    const errX = goalX - meanPosX;
    const errY = goalY - meanPosY;
    const errDist = Math.hypot(errX, errY);

    const kpHoriz = 11.0;
    const staticSpeed = (target.hasFriction && !(target.rollModule && target.rollModule.enabled))
      ? (arena.staticFrictionThreshold ?? 0.16) * (target.staticGroundFrictionMod ?? 1.0)
      : 0;
    const groundedDeadzone = Math.max(0.04, (staticSpeed / kpHoriz) * 1.25);
    const inGroundedDeadzone = mod.isGroundedHold && errDist <= groundedDeadzone;

    const vStopSafe = aHorizAvail > 0.05 ? Math.sqrt(2.0 * (0.72 * Math.min(maxHorizCreateAccel, aHorizAvail)) * errDist) : maxMoveSpeed;
    const wantHorizSpeed = (inGroundedDeadzone || errDist <= 0.004) ? 0 : Math.min(maxMoveSpeed, errDist * kpHoriz, vStopSafe);
    const vxWant = (errDist > 1e-6 && wantHorizSpeed > 0) ? (errX / errDist) * wantHorizSpeed : 0;
    const vyWant = (errDist > 1e-6 && wantHorizSpeed > 0) ? (errY / errDist) * wantHorizSpeed : 0;

    // Paid 3D acceleration directly toward (vxWant, vyWant, vzWant)
    const rawAx = inGroundedDeadzone ? 0 : (vxWant - vx0) / safeDt;
    const rawAy = inGroundedDeadzone ? 0 : (vyWant - vy0) / safeDt;
    const rawAHMag = Math.hypot(rawAx, rawAy);
    const clampedAHMag = Math.min(maxHorizCreateAccel, rawAHMag);
    const axCreate = (!inGroundedDeadzone && rawAHMag > 0.0001) ? (rawAx / rawAHMag) * clampedAHMag : 0;
    const ayCreate = (!inGroundedDeadzone && rawAHMag > 0.0001) ? (rawAy / rawAHMag) * clampedAHMag : 0;

    let hoverAz = 0;
    let extraAz = 0;
    if (!mod.isGroundedHold) {
      if (target.hasGravity) {
        const rawClimb = (vzWant - vz0) / safeDt;
        const horizActive = Math.hypot(axCreate, ayCreate) > 0.5;
        const climbCap = (horizActive && rawClimb > 0 && aVertAvail > 0.05)
          ? Math.min(maxVertCreateAccel, Math.max(0.5, aVertAvail * 0.5))
          : maxVertCreateAccel;
        const climbAccel = Math.max(-g, Math.min(climbCap, rawClimb));
        const totalAz = Math.max(0, g + climbAccel);
        hoverAz = Math.min(totalAz, g);
        extraAz = Math.max(0, totalAz - g);
      } else {
        hoverAz = 0;
        extraAz = Math.max(-maxVertCreateAccel, Math.min(maxVertCreateAccel, (vzWant - vz0) / safeDt));
      }
    }

    // Unified Force-Proportional Power Law: P = (0.5 * g * ||F||) / efficiency
    const hoverWatts = (forcePowerFactor * mObj * hoverAz) / efficiency;
    const extraVertWatts = (forcePowerFactor * mObj * Math.abs(extraAz)) / efficiency;
    const horizWatts = (forcePowerFactor * mObj * Math.hypot(axCreate, ayCreate)) / efficiency;
    const totalVertForce = mod.isGroundedHold ? 0 : mObj * Math.abs(hoverAz + extraAz);
    const rawDemandedWatts = (forcePowerFactor * Math.hypot(mObj * Math.hypot(axCreate, ayCreate), totalVertForce)) / efficiency;

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
    };
  }
}
