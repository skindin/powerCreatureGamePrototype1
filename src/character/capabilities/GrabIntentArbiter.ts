import type { Character } from "../Character.js";
import type { GameObject } from "../../engine/GameObject.js";

/**
 * Coordinates player grab intention between PickupModule (overhead lift),
 * GrappleModule (grounded tether / drag), and TelekinesisModule (remote levitation).
 */
export class GrabIntentArbiter {
  /**
   * Calculates whether a carrier is strong and heavy enough to lift target overhead.
   * Target must be <= 50% of (carrierMass * carrierStrength) to be lifted (ratio 2.0).
   * Also requires an active PickupModule.
   */
  public static canLift(carrier: Character, target: GameObject): boolean {
    if (!carrier.pickupModule || !carrier.pickupModule.enabled) return false;
    const targetMass = Math.max(0.1, target.hasMass ? target.mass : 0.5);
    const carrierMass = Math.max(0.1, carrier.hasMass ? (carrier.baseMass ?? carrier.mass) : 1.2);
    const carrierStrength = carrier.hasStrength ? carrier.strength : 1.0;
    const liftRatio = 2.0;

    return (carrierMass * carrierStrength) >= targetMass * liftRatio;
  }

  /**
   * Returns true if target is within the character's applicable 3D reach:
   * - Liftable targets can be reached via PickupModule (`pickupReach`) or GrappleModule (`grappleReach`).
   * - Non-liftable targets (only strong enough to drag) can ONLY be reached via GrappleModule (`grappleReach`).
   */
  public static isTargetInReach(
    character: Character,
    obj: GameObject,
    wallHeight: number = 1.0
  ): boolean {
    if (!character.pickupModule?.enabled && !character.grappleModule?.enabled && !character.telekinesisModule?.enabled) {
      return false;
    }
    if (
      obj === character ||
      obj === character.heldObject ||
      obj === character.grappledTarget ||
      obj === character.telekineticTarget ||
      obj.isHeld
    ) {
      return false;
    }
    if (obj.lastThrower === character) {
      return false;
    }

    const isLiftable = GrabIntentArbiter.canLift(character, obj);
    const pickupReach = isLiftable && character.pickupModule?.enabled
      ? character.pickupModule.pickupReachProp.get(character.properties)
      : 0;
    const grappleReach = character.grappleModule?.enabled
      ? character.grappleModule.grappleReachProp.get(character.properties)
      : 0;
    const tkReach = character.telekinesisModule?.enabled && !obj.isImmovable
      ? character.telekinesisModule.getTelekinesisReach(character.properties)
      : 0;

    const allowedReach = Math.max(pickupReach, grappleReach, tkReach);
    if (allowedReach <= 0) {
      return false;
    }

    const charZ = Math.max(
      character.position.z,
      character.supportingSurfaceHeight ?? 0,
      character.standingWall ? wallHeight : 0
    );
    const objZ = Math.max(
      obj.position.z,
      obj.supportingSurfaceHeight ?? 0,
      obj.standingWall ? wallHeight : 0
    );

    const dx = obj.position.x - character.position.x;
    const dy = obj.position.y - character.position.y;
    const dz = objZ - charZ;
    const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return dist3D <= allowedReach;
  }

  /**
   * Finds the best reachable object or character based on active pickup/grapple/telekinesis capabilities
   */
  public static findTarget(
    character: Character,
    targetX: number,
    targetY: number,
    candidates: GameObject[],
    wallHeight: number = 1.0,
    maxSelectDistance: number = Infinity
  ): GameObject | null {
    if (!character.pickupModule?.enabled && !character.grappleModule?.enabled && !character.telekinesisModule?.enabled) {
      return null;
    }

    let bestCandidate: GameObject | null = null;
    let shortestDist = Infinity;

    for (const obj of candidates) {
      if (!GrabIntentArbiter.isTargetInReach(character, obj, wallHeight)) {
        continue;
      }

      const aimDx = obj.position.x - targetX;
      const aimDy = obj.position.y - targetY;
      const distToAim = Math.sqrt(aimDx * aimDx + aimDy * aimDy);

      if (distToAim <= maxSelectDistance && distToAim < shortestDist) {
        shortestDist = distToAim;
        bestCandidate = obj;
      }
    }

    return bestCandidate;
  }

  /**
   * Executes grab on target: arbitrates whether to lift overhead into heldObject,
   * tether with grappledTarget, or levitate remotely with telekineticTarget.
   */
  public static executeGrab(
    character: Character,
    target: GameObject,
    wallHeight: number = 1.0
  ): { success: boolean; mode: "pickup" | "grapple" | "telekinesis" | "none" } {
    if (character.heldObject || character.grappledTarget || character.telekineticTarget) {
      return { success: false, mode: "none" };
    }

    const charZ = Math.max(
      character.position.z,
      character.supportingSurfaceHeight ?? 0,
      character.standingWall ? wallHeight : 0
    );
    const objZ = Math.max(
      target.position.z,
      target.supportingSurfaceHeight ?? 0,
      target.standingWall ? wallHeight : 0
    );
    const dist3D = Math.hypot(
      target.position.x - character.position.x,
      target.position.y - character.position.y,
      objZ - charZ
    );

    const isLiftable = GrabIntentArbiter.canLift(character, target);
    const pickupReach = character.pickupModule?.enabled
      ? character.pickupModule.pickupReachProp.get(character.properties)
      : 0;
    const grappleReach = character.grappleModule?.enabled
      ? character.grappleModule.grappleReachProp.get(character.properties)
      : 0;

    // 1. If liftable and within physical pickup reach -> Lift overhead
    if (isLiftable && character.pickupModule && character.pickupModule.enabled && dist3D <= pickupReach + 0.05) {
      const pickedUp = character.pickupModule.pickup(character, target);
      if (pickedUp) {
        return { success: true, mode: "pickup" };
      }
    }

    // 2. If within physical grapple reach and GrappleModule enabled -> Grapple
    if (character.grappleModule && character.grappleModule.enabled && dist3D <= grappleReach + 0.05) {
      const grappled = character.grappleModule.grapple(character, target);
      if (grappled) {
        return { success: true, mode: "grapple" };
      }
    }

    // 3. Remote / Telekinetic Grab via TelekinesisModule
    if (character.telekinesisModule && character.telekinesisModule.enabled) {
      const grabbed = character.telekinesisModule.grab(character, target);
      if (grabbed) {
        return { success: true, mode: "telekinesis" };
      }
    }

    return { success: false, mode: "none" };
  }
}
