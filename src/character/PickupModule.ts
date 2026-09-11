import type { Character } from "./Character.js";
import { GameObject } from "../engine/GameObject.js";

export class PickupModule {
  public id = "pickup";
  public name = "Pickup Ability";
  public enabled = true;
  public pickupReach = 1.3; // Radius in units to reach and pick up freebodies (~1.3 wall tiles)
  public crossLayerReachRatio = 0.55; // Multiplier on reach when target is on a different height layer

  /**
   * Finds the nearest grabbable object to the mouse/aim location within character reach
   */
  public findTargetObject(
    character: Character,
    targetX: number,
    targetY: number,
    objects: GameObject[],
    wallHeight: number = 1.0
  ): GameObject | null {
    if (!this.enabled) return null;

    let bestCandidate: GameObject | null = null;
    let shortestDist = Infinity;

    // Determine character height layer (0: Ground layer < wallHeight - 0.05, 1: Wall layer >= wallHeight - 0.05)
    const charLayer = character.position.z >= wallHeight - 0.05 ? 1 : 0;

    for (const obj of objects) {
      if (obj === character || obj.isHeld || obj.isCharacter) continue;
      // Cannot grab an object you just threw while it is departing your reach
      if (obj.lastThrower === character) continue;

      // Determine object's height layer
      const objLayer = obj.position.z >= wallHeight - 0.05 ? 1 : 0;
      const isCrossLayer = charLayer !== objLayer;

      // Effective physical reach is reduced when attempting to grab across different height layers
      const effectiveReach = isCrossLayer
        ? this.pickupReach * this.crossLayerReachRatio
        : this.pickupReach;

      // Distance from character to object (must be within physical reach)
      const objRadius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
      const distFromChar = Math.hypot(obj.position.x - character.position.x, obj.position.y - character.position.y);
      if (distFromChar > effectiveReach + objRadius) continue;

      // Distance from object to mouse aim position: pick the one closest to the mouse cursor
      const distToMouse = Math.hypot(obj.position.x - targetX, obj.position.y - targetY);
      if (distToMouse < shortestDist) {
        shortestDist = distToMouse;
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
    target.position.z = target.hasVerticalPosition ? 0.45 : 0; // Lifted off ground only if vertical position enabled
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
