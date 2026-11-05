import type { Character } from "../Character.js";
import type { GameObject } from "../../engine/GameObject.js";

/**
 * Coordinates player grab intention between PickupModule (overhead lift)
 * and GrappleModule (grounded tether / drag).
 */
export class GrabIntentArbiter {
  /**
   * Calculates whether a carrier is strong and heavy enough to lift target overhead.
   * Target must be <= 50% of (carrierMass * carrierStrength) to be lifted.
   */
  public static canLift(carrier: Character, target: GameObject): boolean {
    const carrierMass = Math.max(0.1, carrier.hasMass ? carrier.mass : 1.2);
    const targetMass = Math.max(0.1, target.hasMass ? target.mass : 1.0);
    const carrierStrength = carrier.hasStrength ? carrier.strength : 1.0;
    const liftRatio = 2.0;
    return (carrierMass * carrierStrength) >= targetMass * liftRatio;
  }

  /**
   * Finds the best reachable object or character based on active pickup/grapple capabilities
   */
  public static findTarget(
    character: Character,
    targetX: number,
    targetY: number,
    candidates: GameObject[],
    wallHeight: number = 1.0,
    maxSelectDistance: number = Infinity
  ): GameObject | null {
    if (!character.pickupModule?.enabled && !character.grappleModule?.enabled) {
      return null;
    }

    let bestCandidate: GameObject | null = null;
    let shortestDist = Infinity;

    const charZ = Math.max(
      character.position.z,
      character.supportingSurfaceHeight ?? 0,
      character.standingWall ? wallHeight : 0
    );

    const pickupReach = character.pickupModule?.enabled
      ? character.pickupModule.pickupReachProp.get(character.properties)
      : 0;
    const grappleReach = character.grappleModule?.enabled
      ? character.grappleModule.grappleReachProp.get(character.properties)
      : 0;
    const maxReach = Math.max(pickupReach, grappleReach);

    for (const obj of candidates) {
      if (obj === character || obj === character.heldObject || obj === character.grappledTarget || obj.isHeld) {
        continue;
      }
      if (obj.lastThrower === character) continue;

      const objZ = Math.max(
        obj.position.z,
        obj.supportingSurfaceHeight ?? 0,
        obj.standingWall ? wallHeight : 0
      );

      const dx = obj.position.x - character.position.x;
      const dy = obj.position.y - character.position.y;
      const dz = objZ - charZ;
      const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const reachWithBody = maxReach + (character.colliderRadius ?? 0.35) + (obj.colliderRadius ?? 0.3);
      if (dist3D > reachWithBody) {
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
   * Executes grab on target: arbitrates whether to lift overhead into heldObject
   * or tether with grappledTarget.
   */
  public static executeGrab(
    character: Character,
    target: GameObject
  ): { success: boolean; mode: "pickup" | "grapple" | "none" } {
    if (character.heldObject || character.grappledTarget) {
      return { success: false, mode: "none" };
    }

    const isLiftable = GrabIntentArbiter.canLift(character, target);

    // 1. If liftable and character has PickupModule -> Lift overhead
    if (isLiftable && character.pickupModule && character.pickupModule.enabled) {
      const pickedUp = character.pickupModule.pickup(character, target);
      if (pickedUp) {
        return { success: true, mode: "pickup" };
      }
    }

    // 2. If heavy or equal-mass (or character lacks PickupModule) and character has GrappleModule -> Grapple
    if (character.grappleModule && character.grappleModule.enabled) {
      const grappled = character.grappleModule.grapple(character, target);
      if (grappled) {
        return { success: true, mode: "grapple" };
      }
    }

    return { success: false, mode: "none" };
  }
}
