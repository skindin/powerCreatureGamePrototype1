import type { Character } from "./Character.js";
import { GameObject } from "../engine/GameObject.js";

export class PickupModule {
  public id = "pickup";
  public name = "Pickup Ability";
  public enabled = true;
  public pickupReach = 1.3; // 3D radius in units to reach and pick up freebodies (~1.3 wall tiles)
  public crossLayerReachRatio = 1.0; // Deprecated: single 3D pickup range now governs reach across all layers

  /**
   * Returns true if the object is within the character's physical grab reach using true 3D math.
   * Gets the delta magnitude of the 3D positions (dx, dy, dz) and forces the character
   * to be within a single pickup range.
   */
  public isObjectInReach(
    character: Character,
    obj: GameObject,
    wallHeight: number = 1.0
  ): boolean {
    if (!this.enabled || obj === character || obj.isHeld || obj.isCharacter) return false;
    // Cannot grab an object you just threw while it is departing your reach
    if (obj.lastThrower === character) return false;

    // Real 3D z-positions (accounting for elevation on wall tops)
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

    // Delta magnitude of 3D positions: ||P_obj - P_char||
    const dx = obj.position.x - character.position.x;
    const dy = obj.position.y - character.position.y;
    const dz = objZ - charZ;
    const deltaMagnitude = Math.hypot(dx, dy, dz);

    // Force the character to have to be within a single pickup range
    return deltaMagnitude <= this.pickupReach;
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
    if (target.rollModule) {
      target.rollModule.angularVelocity.x = 0;
      target.rollModule.angularVelocity.y = 0;
      target.rollModule.angularVelocity.z = 0;
    }
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

  /**
   * Pickup and swap:
   * - If aimX/aimY provided, targets reachable object closest to the cursor.
   * - If holding an object and another reachable object is nearby, drops the held object and grabs the new one.
   * - If holding an object and no other object is nearby, drops the held object.
   * - If not holding an object, picks up the closest reachable object.
   */
  public pickupAndSwap(
    character: Character,
    objects: GameObject[],
    wallHeight: number,
    aimX?: number,
    aimY?: number
  ): boolean {
    if (!this.enabled) return false;

    // Find reachable object closest to cursor (if aimX/aimY provided) or closest to character
    let bestTarget: GameObject | null = null;
    if (aimX !== undefined && aimY !== undefined) {
      bestTarget = this.findTargetObject(character, aimX, aimY, objects, wallHeight);
    } else {
      let bestDist = Infinity;
      const charZ = Math.max(
        character.position.z,
        character.supportingSurfaceHeight ?? 0,
        character.standingWall ? wallHeight : 0
      );
      for (const obj of objects) {
        if (obj === character.heldObject || obj.isHeld) continue;
        if (this.isObjectInReach(character, obj, wallHeight)) {
          const objZ = Math.max(
            obj.position.z,
            obj.supportingSurfaceHeight ?? 0,
            obj.standingWall ? wallHeight : 0
          );
          const d = Math.hypot(
            obj.position.x - character.position.x,
            obj.position.y - character.position.y,
            objZ - charZ
          );
          if (d < bestDist) {
            bestDist = d;
            bestTarget = obj;
          }
        }
      }
    }

    if (character.heldObject) {
      if (bestTarget) {
        // Swap: drop old, pick up new!
        this.drop(character);
        return this.pickup(character, bestTarget);
      } else {
        // No other object nearby: drop
        this.drop(character);
        return true;
      }
    } else {
      if (bestTarget) {
        return this.pickup(character, bestTarget);
      }
    }

    return false;
  }
}
