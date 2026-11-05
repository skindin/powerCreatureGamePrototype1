import type { Character } from "../Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

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
    const target = character.grappledTarget;
    if (!target) return null;

    character.grappledTarget = null;
    if ((target as any).grappledBy === character) {
      (target as any).grappledBy = null;
    }
    return target;
  }

  /**
   * Executes a grounded shove / push on the grappled target along the aim angle or character facing angle
   */
  public static executeShove(character: Character, aimAngle?: number): boolean {
    const target = character.grappledTarget;
    if (!target) return false;

    const angle = aimAngle !== undefined ? aimAngle : (character.facingAngle ?? 0);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    const shoveImpulse = character.grappleModule
      ? character.grappleModule.shoveImpulseProp.get(character.properties)
      : 16.0;

    const targetMass = Math.max(0.2, target.hasMass ? target.mass : 1.0);
    const charMass = Math.max(0.2, character.hasMass ? character.mass : 1.2);

    // Calculate unencumbered mechanical work needed for shove + recoil:
    // W_mech = 0.5 * m_target * v_target^2 + 0.5 * m_char * v_recoil^2
    const shoveSpeed = shoveImpulse / targetMass;
    const recoilSpeed = (shoveImpulse * 0.45) / charMass;
    const mechanicalJoules = 0.5 * targetMass * (shoveSpeed * shoveSpeed) + 0.5 * charMass * (recoilSpeed * recoilSpeed);

    const pool = character.energyPool;
    const efficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(character.properties) : 0.25);
    const rawMetabolicJoules = Math.max(10, mechanicalJoules / efficiency);
    const maxPower = character.grappleModule ? character.grappleModule.maxPowerProp.get(character.properties) : 350;
    const metabolicJoules = Math.min(rawMetabolicJoules, Math.max(10, maxPower));

    const consumesEnergy = true; // Shove impulse always consumes explosive burst energy from EnergyPool
    const allowPartial = character.grappleModule ? character.grappleModule.allowPartialPower : false;

    let energyFraction = 1.0;
    if (consumesEnergy && pool && pool.enabled) {
      if (pool.isExhausted) {
        pool.notifyInsufficientEnergy({
          abilityId: "grapple",
          demandedAmount: metabolicJoules,
          isBurst: true,
          registry: character.properties,
        });
        return false;
      }
      if (!allowPartial && !pool.canSatisfyFullEnergy(metabolicJoules, 0.05, character.properties)) {
        pool.notifyInsufficientEnergy({
          abilityId: "grapple",
          demandedAmount: metabolicJoules,
          isBurst: true,
          registry: character.properties,
        });
        return false;
      }
      const burstRes = pool.requestInstantBurst({
        abilityId: "grapple",
        demandedJoules: metabolicJoules,
        allowPartialPower: allowPartial,
        registry: character.properties,
      });
      if (!burstRes.granted || burstRes.grantedJoules <= 0.001 || (!allowPartial && burstRes.fraction < 1.0)) {
        return false;
      }
      energyFraction = burstRes.fraction;
    }

    const effShoveSpeed = shoveSpeed * energyFraction;
    const effRecoilSpeed = recoilSpeed * energyFraction;

    // Accelerate target forward
    target.velocity.x += dirX * effShoveSpeed;
    target.velocity.y += dirY * effShoveSpeed;
    target.wakeUp();
    target.applyKnockbackWindow(800);

    // Symmetrical recoil on character
    character.velocity.x -= dirX * effRecoilSpeed;
    character.velocity.y -= dirY * effRecoilSpeed;

    // Release the grapple
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
