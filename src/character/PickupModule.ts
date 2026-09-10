import type { Character } from "./Character.js";
import { GameObject } from "../engine/GameObject.js";

export class PickupModule {
  public id = "pickup";
  public name = "Pickup Ability";
  public enabled = true;
  public pickupReach = 1.3; // Radius in units to reach and pick up freebodies (~1.3 wall tiles)

  /**
   * Finds the nearest pickable freebody object to the contact/aim location within reach
   */
  public findTargetObject(character: Character, targetX: number, targetY: number, objects: GameObject[]): GameObject | null {
    if (!this.enabled) return null;

    let bestCandidate: GameObject | null = null;
    let shortestDist = Infinity;

    for (const obj of objects) {
      if (obj === character || obj.isHeld) continue;

      // Distance from character to object (must be within physical reach)
      const distFromChar = Math.hypot(obj.position.x - character.position.x, obj.position.y - character.position.y);
      if (distFromChar > this.pickupReach + obj.colliderRadius) continue;

      // Check distance to click contact location (within cursor vicinity)
      const distToClick = Math.hypot(obj.position.x - targetX, obj.position.y - targetY);
      if (distToClick < shortestDist && distToClick <= obj.colliderRadius + 0.65) {
        shortestDist = distToClick;
        bestCandidate = obj;
      }
    }

    return bestCandidate;
  }

  /**
   * Picks up the specified object and transfers its incoming momentum/force to the character
   */
  public pickup(character: Character, target: GameObject): boolean {
    if (!this.enabled) return false;
    if (character.heldObject) return false;

    // Apply incoming object force/momentum to the character (symmetric with throw recoil)
    const objVx = target.velocity.x;
    const objVy = target.velocity.y;
    const momentumRatio = target.mass / Math.max(0.2, character.mass);

    character.velocity.x += objVx * momentumRatio;
    character.velocity.y += objVy * momentumRatio;

    // If character is airborne, also transfer vertical momentum
    if (character.isAboveGround && Math.abs(target.verticalVelocity) > 0.1) {
      character.verticalVelocity += target.verticalVelocity * momentumRatio;
    }

    character.heldObject = target;
    target.isHeld = true;
    target.heldBy = character;
    target.velocity.x = 0;
    target.velocity.y = 0;
    target.verticalVelocity = 0;
    target.position.z = 0.45; // Lifted off the ground (0.45 units)
    return true;
  }

  /**
   * Drops the currently held object onto the ground at character feet
   */
  public drop(character: Character): GameObject | null {
    if (!character.heldObject) return null;

    const dropped = character.heldObject;
    character.heldObject = null;
    dropped.isHeld = false;
    dropped.heldBy = null;
    dropped.velocity.x = character.velocity.x * 0.4;
    dropped.velocity.y = character.velocity.y * 0.4;
    dropped.verticalVelocity = 0;
    return dropped;
  }
}
