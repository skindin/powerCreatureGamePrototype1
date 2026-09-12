import type { Character } from "./Character.js";
import { GameObject } from "../engine/GameObject.js";

export class PickupModule {
  public id = "pickup";
  public name = "Pickup Ability";
  public enabled = true;
  public pickupReach = 1.3; // Radius in units to reach and pick up freebodies (~1.3 wall tiles)
  public crossLayerReachRatio = 0.55; // Multiplier on reach when target is on a different height layer

  /**
   * Returns true if the object is within the character's physical grab reach,
   * accounting for cross-layer reach reductions if character and object are on different layers.
   */
  public isObjectInReach(
    character: Character,
    obj: GameObject,
    wallHeight: number = 1.0
  ): boolean {
    if (!this.enabled || obj === character || obj.isHeld || obj.isCharacter) return false;
    // Cannot grab an object you just threw while it is departing your reach
    if (obj.lastThrower === character) return false;

    // Determine character layer (1: Ground layer, 2: Wall / elevated layer) - vertical position z is NOT considered
    const charLayer = (character.standingWall !== null || character.supportingSurfaceHeight >= wallHeight - 0.05) ? 2 : 1;

    // Determine object layer (1: Ground layer, 2: Wall / elevated layer) - vertical position z is NOT considered
    const objLayer = (obj.standingWall !== null || obj.supportingSurfaceHeight >= wallHeight - 0.05) ? 2 : 1;
    const isSameLayer = charLayer === objLayer;

    // If on the same layer: same layer reach. If on a different layer: different layer reach.
    const effectiveReach = isSameLayer
      ? this.pickupReach
      : this.pickupReach * this.crossLayerReachRatio;

    // Distance from character to object (must be within physical reach)
    const objRadius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    const distFromChar = Math.hypot(obj.position.x - character.position.x, obj.position.y - character.position.y);
    return distFromChar <= effectiveReach + objRadius;
  }

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

    for (const obj of objects) {
      if (!this.isObjectInReach(character, obj, wallHeight)) continue;

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
   * Drops the currently held object onto the ground, inheriting character velocity
   */
  public drop(character: Character): GameObject | null {
    if (!character.heldObject) return null;

    const dropped = character.heldObject;
    character.heldObject = null;
    dropped.isHeld = false;
    dropped.heldBy = null;
    dropped.lastThrower = null; // Instantly available to pick back up
    dropped.velocity.x = character.velocity.x;
    dropped.velocity.y = character.velocity.y;
    dropped.verticalVelocity = character.isAboveGround ? character.verticalVelocity : 0;

    if (dropped.hasFriction && dropped.rollModule && dropped.rollModule.enabled) {
      const R = dropped.colliderRadius > 0 ? dropped.colliderRadius : 0.3;
      dropped.rollModule.angularVelocity.y = dropped.velocity.x / R;
      dropped.rollModule.angularVelocity.x = -dropped.velocity.y / R;
    }

    return dropped;
  }
}
