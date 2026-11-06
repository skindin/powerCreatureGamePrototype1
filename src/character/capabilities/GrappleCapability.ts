import type { Character, AnticipatedModifier } from "../Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";
import type { TrajectoryCalculation, TrajectoryPoint } from "../ThrowModule.js";
import type { ThrowControlBlock } from "../../input/schema/ControlSchemaTypes.js";

export interface ShoveKinematics {
  shoveSpeed: number;
  recoilSpeed: number;
  demandedMetabolicJoules: number;
  mechanicalJoules: number;
}

/**
 * Isolated capability slice for Grapple & Drag physics, two-way leash distance constraint,
 * tug-of-war mass distribution, breakout detection, and grounded shove impulse.
 */
export class GrappleCapability {
  /**
   * Deterministic physical evaluation of whether a carrier can hoist target overhead into a Full Lift.
   * Target must be <= 50% of (carrierMass * carrierStrength) to be lifted (ratio 2.0).
   * Also requires an active PickupModule.
   */
  public static canLift(character: Character, target: GameObject): boolean {
    if (!character.pickupModule || !character.pickupModule.enabled) return false;
    const targetMass = Math.max(0.1, target.hasMass ? target.mass : 0.5);
    const carrierMass = Math.max(0.1, character.hasMass ? (character.baseMass ?? character.mass) : 1.2);
    const carrierStrength = character.hasStrength ? character.strength : 1.0;
    const liftRatio = 2.0;

    return (carrierMass * carrierStrength) >= targetMass * liftRatio;
  }

  /**
   * Deterministic physical evaluation with slight hysteresis (ratio 1.8)
   * to prevent rapid 60Hz toggling/chatter at the threshold boundary.
   */
  public static canHold(character: Character, target: GameObject): boolean {
    if (!character.pickupModule || !character.pickupModule.enabled) return false;
    const targetMass = Math.max(0.1, target.hasMass ? target.mass : 0.5);
    const carrierMass = Math.max(0.1, character.hasMass ? (character.baseMass ?? character.mass) : 1.2);
    const carrierStrength = character.hasStrength ? character.strength : 1.0;
    const holdRatio = 1.8;

    return (carrierMass * carrierStrength) >= targetMass * holdRatio;
  }

  /**
   * Releases any active grapple on the character and notifies target
   */
  public static releaseGrapple(character: Character): GameObject | null {
    character.isChargingShove = false;
    character.shoveChargeStartTime = null;
    character.shoveChargeProgress = 0;
    character.shoveAimAngle = undefined;

    const target = character.grappledTarget;
    if (!target) return null;

    character.grappledTarget = null;
    if ((target as any).grappledBy === character) {
      (target as any).grappledBy = null;
    }
    return target;
  }

  /**
   * Computes shove kinematics and metabolic energy cost scaled by chargeProgress (0.0 to 1.0)
   * and aligned with ThrowModule power capacity so shoving while dragging scales comparably to throwing.
   */
  public static calculateShoveKinematics(
    character: Character,
    target: GameObject,
    chargeProgress: number = 1.0
  ): ShoveKinematics {
    const strength = character.hasStrength ? character.strength : 1.0;
    const grappleCap = character.grappleModule
      ? character.grappleModule.maxPowerProp.get(character.properties)
      : 1000.0;
    const throwCap = character.throwModule
      ? character.throwModule.maxPowerProp.get(character.properties)
      : 1000.0;
    const baseCap = Math.max(grappleCap, throwCap);
    const maxPowerCap = Math.max(25, baseCap * strength);

    const shoveImpulse = character.grappleModule
      ? character.grappleModule.shoveImpulseProp.get(character.properties)
      : 16.0;
    const impulseScale = Math.max(0.25, shoveImpulse / 16.0);

    const clampedCharge = Math.max(0, Math.min(1, chargeProgress));
    // Speed scales from 35% on an instant tap (0 charge) up to 100% at full charge
    const speedFraction = 0.35 + 0.65 * clampedCharge;
    const energyFractionOfCap = Math.min(1.5, (speedFraction * speedFraction) * (impulseScale * impulseScale));

    const demandedMetabolicJoules = Math.max(25, maxPowerCap * energyFractionOfCap);

    const pool = character.energyPool;
    const efficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(character.properties) : 0.25);
    const mechanicalJoules = demandedMetabolicJoules * efficiency;

    const targetMass = Math.max(0.2, target.hasMass ? target.mass : 1.0);
    const charMass = Math.max(0.2, character.hasMass ? character.mass : 1.2);

    // Conservation of momentum & energy partitioning between target and character recoil:
    // v_recoil = 0.45 * (m_target / m_char) * v_shove
    // W_mech = 0.5 * m_target * v_shove^2 + 0.5 * m_char * v_recoil^2
    //        = 0.5 * m_target * v_shove^2 * (1 + 0.45^2 * (m_target / m_char))
    const recoilMomentumFactor = 0.45;
    const recoilWorkFactor = 1.0 + (recoilMomentumFactor * recoilMomentumFactor) * (targetMass / charMass);
    const shoveSpeed = Math.sqrt((2.0 * mechanicalJoules) / (targetMass * recoilWorkFactor));
    const recoilSpeed = shoveSpeed * recoilMomentumFactor * (targetMass / charMass);

    return {
      shoveSpeed,
      recoilSpeed,
      demandedMetabolicJoules,
      mechanicalJoules,
    };
  }

  /**
   * Computes any live anticipated energy modifier for the HUD while charging a shove.
   */
  public static getAnticipatedModifier(character: Character): AnticipatedModifier | null {
    if (
      !character.isChargingShove ||
      !character.grappledTarget ||
      character.isThrowCancelZone ||
      !character.energyPool ||
      !character.energyPool.enabled
    ) {
      return null;
    }

    const kinematics = GrappleCapability.calculateShoveKinematics(
      character,
      character.grappledTarget,
      character.shoveChargeProgress ?? 0
    );
    const allowPartial = character.grappleModule ? character.grappleModule.allowPartialPower : false;
    const pool = character.energyPool;
    if (pool.isExhausted || (!allowPartial && !pool.canSatisfyFullEnergy(kinematics.demandedMetabolicJoules, 0.05, character.properties))) {
      return null;
    }

    return {
      id: "anticipated_shove",
      abilityId: "grapple",
      name: "Shove",
      color: "#f43f5e",
      amount: Math.round(kinematics.demandedMetabolicJoules),
      isBurst: true,
      isPositive: false,
      order: 950,
    };
  }

  /**
   * Updates `character.activeTrajectory` while charging a shove so `TrajectoryRenderer`
   * renders the exact same dotted trajectory line, ghost full-charge dots, green/red landing
   * collider footprint, sightline, and cancel reticle as throwing.
   */
  public static updateShoveTrajectoryPreview(
    character: Character,
    arena: Arena,
    aimTargetPos: { x: number; y: number } | null
  ): void {
    const target = character.grappledTarget;
    if (!character.isChargingShove || !target || !aimTargetPos) {
      character.activeTrajectory = null;
      return;
    }

    const throwBlock = (character.controlSchema?.gamepad?.blocks || character.controlSchema?.keyboardMouse?.blocks)?.find(
      (b) => b.type === "throw"
    ) as ThrowControlBlock | undefined;

    const enableProximityCancel = throwBlock ? Boolean(throwBlock.enableProximityCancel) : true;
    const cancelRadius = throwBlock?.cancelRadius ?? Math.max(1.0, (character.colliderRadius ?? 0.35) + 0.65);

    const charAimDx = aimTargetPos.x - character.position.x;
    const charAimDy = aimTargetPos.y - character.position.y;
    const distToCharAim = Math.hypot(charAimDx, charAimDy);

    if (distToCharAim > 0.05) {
      character.facingAngle = Math.atan2(charAimDy, charAimDx);
    }

    if (enableProximityCancel && distToCharAim < cancelRadius) {
      character.activeTrajectory = null;
      character.isThrowCancelZone = true;
      return;
    }
    character.isThrowCancelZone = false;

    // Direction of shove: directly from the grappled target toward the mouse cursor
    const targetAimDx = aimTargetPos.x - target.position.x;
    const targetAimDy = aimTargetPos.y - target.position.y;
    const distToTargetAim = Math.hypot(targetAimDx, targetAimDy);
    const shoveAngle = distToTargetAim > 0.05
      ? Math.atan2(targetAimDy, targetAimDx)
      : (distToCharAim > 0.05 ? Math.atan2(charAimDy, charAimDx) : (character.shoveAimAngle ?? character.facingAngle ?? 0));
    character.shoveAimAngle = shoveAngle;

    const now = performance.now();
    const start = character.shoveChargeStartTime ?? now;
    const chargeProgress = Math.min(1.0, Math.max(0.0, (now - start) / 700));
    character.shoveChargeProgress = chargeProgress;

    const curKin = GrappleCapability.calculateShoveKinematics(character, target, chargeProgress);
    const maxKin = GrappleCapability.calculateShoveKinematics(character, target, 1.0);

    const fric = (arena.frictionCoeff || 10.4) * Math.max(0.25, target.dynamicGroundFrictionMod || 1.0);
    const isRoller = Boolean(target.rollModule && target.rollModule.enabled && !target.isCharacter);
    const decel = isRoller ? Math.max(3.5, fric * 0.38) : Math.max(6.0, fric);

    const maxRollDist = Math.min(14.0, Math.max(0.8, (maxKin.shoveSpeed * maxKin.shoveSpeed) / (2.0 * decel)));
    const curRollDist = Math.min(maxRollDist, Math.max(0.35, (curKin.shoveSpeed * curKin.shoveSpeed) / (2.0 * decel)));

    const startX = target.position.x;
    const startY = target.position.y;
    const startZ = Math.max(
      target.position.z,
      target.supportingSurfaceHeight ?? 0,
      target.standingWall ? arena.wallHeight : 0
    );
    const dirX = Math.cos(shoveAngle);
    const dirY = Math.sin(shoveAngle);
    const targetRadius = target.colliderRadius ?? 0.35;

    const traceGroundRay = (distLimit: number): {
      points: TrajectoryPoint[];
      landPoint: { x: number; y: number; z: number };
      isBlockedByWall: boolean;
    } => {
      const pts: TrajectoryPoint[] = [
        { x: startX, y: startY, z: startZ, t: 0, couldClearWall: false, isOverWall: false, collidesWall: false },
      ];
      const steps = Math.max(4, Math.ceil(distLimit / 0.08));
      let lastX = startX;
      let lastY = startY;

      for (let i = 1; i <= steps; i++) {
        const frac = i / steps;
        const d = frac * distLimit;
        const px = startX + dirX * d;
        const py = startY + dirY * d;

        // Check arena boundary or wall collision at target's altitude
        let hitsWall = false;
        if (
          px - targetRadius < 0 ||
          px + targetRadius > arena.width ||
          py - targetRadius < 0 ||
          py + targetRadius > arena.height
        ) {
          hitsWall = true;
        } else {
          for (const w of arena.walls) {
            if (w.wallHeight <= startZ + 0.05) continue;
            const closestX = Math.max(w.x, Math.min(px, w.x + w.width));
            const closestY = Math.max(w.y, Math.min(py, w.y + w.height));
            if (Math.hypot(px - closestX, py - closestY) < targetRadius * 0.92) {
              hitsWall = true;
              break;
            }
          }
        }

        if (hitsWall) {
          pts.push({
            x: lastX,
            y: lastY,
            z: startZ,
            t: frac,
            couldClearWall: false,
            isOverWall: false,
            collidesWall: true,
          });
          return {
            points: pts,
            landPoint: { x: lastX, y: lastY, z: startZ },
            isBlockedByWall: true,
          };
        }

        lastX = px;
        lastY = py;
        pts.push({
          x: px,
          y: py,
          z: startZ,
          t: frac,
          couldClearWall: false,
          isOverWall: false,
          collidesWall: false,
        });
      }

      return {
        points: pts,
        landPoint: { x: lastX, y: lastY, z: startZ },
        isBlockedByWall: false,
      };
    };

    const curTrace = traceGroundRay(curRollDist);
    const maxTrace = traceGroundRay(maxRollDist);

    const traj: TrajectoryCalculation = {
      points: curTrace.points,
      flattestPoints: maxTrace.points,
      landPoint: curTrace.landPoint,
      isBlockedByWall: curTrace.isBlockedByWall,
      isLandingOnWallTop: startZ >= arena.wallHeight - 0.05,
      targetSurfaceHeight: startZ,
      launchPos: { x: startX, y: startY, z: startZ },
      launchVel: {
        vx: dirX * curKin.shoveSpeed,
        vy: dirY * curKin.shoveSpeed,
        vz: 0,
      },
      flightTime: curRollDist / Math.max(0.1, curKin.shoveSpeed * 0.5),
      colliderRadius: targetRadius,
      visualShape: target.visualShape,
    };
    (traj as any).chargingTowards = "flattest";
    (traj as any).isGroundShove = true;

    character.activeTrajectory = traj;
  }

  /**
   * Executes a grounded shove / push on the grappled target along the aim angle or character facing angle
   */
  public static executeShove(
    character: Character,
    aimAngle?: number,
    chargeProgress: number = 1.0
  ): boolean {
    const target = character.grappledTarget;
    if (!target) return false;

    const angle = aimAngle !== undefined ? aimAngle : (character.shoveAimAngle ?? character.facingAngle ?? 0);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    const { shoveSpeed, recoilSpeed, demandedMetabolicJoules } =
      GrappleCapability.calculateShoveKinematics(character, target, chargeProgress);

    const pool = character.energyPool;
    const consumesEnergy = true; // Shove impulse always consumes explosive burst energy from EnergyPool
    const allowPartial = character.grappleModule ? character.grappleModule.allowPartialPower : false;

    let energyFraction = 1.0;
    if (consumesEnergy && pool && pool.enabled) {
      if (pool.isExhausted) {
        pool.notifyInsufficientEnergy({
          abilityId: "grapple",
          demandedAmount: demandedMetabolicJoules,
          isBurst: true,
          registry: character.properties,
        });
        character.isChargingShove = false;
        character.shoveChargeStartTime = null;
        character.shoveChargeProgress = 0;
        character.activeTrajectory = null;
        return false;
      }
      if (!allowPartial && !pool.canSatisfyFullEnergy(demandedMetabolicJoules, 0.05, character.properties)) {
        pool.notifyInsufficientEnergy({
          abilityId: "grapple",
          demandedAmount: demandedMetabolicJoules,
          isBurst: true,
          registry: character.properties,
        });
        character.isChargingShove = false;
        character.shoveChargeStartTime = null;
        character.shoveChargeProgress = 0;
        character.activeTrajectory = null;
        return false;
      }
      const burstRes = pool.requestInstantBurst({
        abilityId: "grapple",
        demandedJoules: demandedMetabolicJoules,
        allowPartialPower: allowPartial,
        registry: character.properties,
      });
      if (!burstRes.granted || burstRes.grantedJoules <= 0.001 || (!allowPartial && burstRes.fraction < 1.0)) {
        character.isChargingShove = false;
        character.shoveChargeStartTime = null;
        character.shoveChargeProgress = 0;
        character.activeTrajectory = null;
        return false;
      }
      energyFraction = burstRes.fraction;
    }

    // Kinetic energy scales with v^2, so speed scales with sqrt(energyFraction)
    const speedScale = Math.sqrt(Math.max(0, energyFraction));
    const effShoveSpeed = shoveSpeed * speedScale;
    const effRecoilSpeed = recoilSpeed * speedScale;

    // Accelerate target forward
    target.velocity.x += dirX * effShoveSpeed;
    target.velocity.y += dirY * effShoveSpeed;
    target.wakeUp();
    target.applyKnockbackWindow(800);

    // Symmetrical recoil on character
    character.velocity.x -= dirX * effRecoilSpeed;
    character.velocity.y -= dirY * effRecoilSpeed;

    // Release the grapple
    character.activeTrajectory = null;
    GrappleCapability.releaseGrapple(character);
    return true;
  }

  /**
   * Updates active grapple leash constraints, tug-of-war position relaxation, and breakout snapping
   */
  public static updateGrapple(character: Character, _dt: number, _arena?: Arena): void {
    const target = character.grappledTarget;
    if (!target) return;

    // Target cleanup check
    if (target.isHeld && target.heldBy !== character) {
      GrappleCapability.releaseGrapple(character);
      return;
    }
    if ((target as any).isDying) {
      GrappleCapability.releaseGrapple(character);
      return;
    }

    const reach = character.grappleModule
      ? character.grappleModule.grappleReachProp.get(character.properties)
      : 1.3;
    const breakoutRatio = character.grappleModule
      ? character.grappleModule.breakoutDistanceRatioProp.get(character.properties)
      : 1.4;
    const maxBreakoutDist = reach * breakoutRatio;

    const dx = target.position.x - character.position.x;
    const dy = target.position.y - character.position.y;
    const dz = target.position.z - character.position.z;
    const dist = Math.hypot(dx, dy, dz);

    // Option A Breakout: Distance exceeds breakout threshold -> grip snaps!
    if (dist > maxBreakoutDist) {
      GrappleCapability.releaseGrapple(character);
      return;
    }

    // Leash constraint: If dist > reach, enforce two-way tug-of-war along the leash normal
    if (dist > reach && dist > 0.001) {
      const overExtension = dist - reach;
      const nx = dx / dist;
      const ny = dy / dist;

      // Inverse masses dictate how much each body moves to satisfy the constraint
      const charMass = Math.max(0.2, character.hasMass ? character.mass : 1.2);
      const targetMass = Math.max(0.2, target.hasMass ? target.mass : 1.0);
      const wChar = 1.0 / charMass;
      const wTarget = 1.0 / targetMass;
      const invSum = wChar + wTarget;

      const fractionChar = wChar / invSum;
      const fractionTarget = wTarget / invSum;

      // Position correction
      character.position.x += nx * overExtension * fractionChar;
      character.position.y += ny * overExtension * fractionChar;
      target.position.x -= nx * overExtension * fractionTarget;
      target.position.y -= ny * overExtension * fractionTarget;

      // Dampen separating relative velocity along the leash
      const relVx = target.velocity.x - character.velocity.x;
      const relVy = target.velocity.y - character.velocity.y;
      const separatingSpeed = relVx * nx + relVy * ny;

      if (separatingSpeed > 0) {
        const restitution = 0.0; // Inelastic leash
        const impulse = ((1.0 + restitution) * separatingSpeed) / invSum;

        character.velocity.x += nx * impulse * fractionChar;
        character.velocity.y += ny * impulse * fractionChar;
        target.velocity.x -= nx * impulse * fractionTarget;
        target.velocity.y -= ny * impulse * fractionTarget;
      }
    }
  }
}
