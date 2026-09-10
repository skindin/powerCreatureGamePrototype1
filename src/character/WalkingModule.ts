import { Vector2D } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export class WalkingModule {
  public id = "walking";
  public name = "Walking Module";
  public enabled = true;

  // Base walking limits (measured in wall-based units)
  public maxWalkSpeed = 5.2; // Maximum walking velocity cap (u/s)
  public walkAcceleration = 80.0; // Responsive acceleration capability in units (u/s²)

  /**
   * Character uses their own ground friction to push on the ground in the opposite direction of movement.
   * If character's static ground friction is 0 (frictionless ice), feet slip and the character cannot propel forward.
   * Higher ground friction = firmer grip and faster acceleration.
   */
  public update(character: Character, inputVector: Vector2D, dt: number, arena: Arena): void {
    if (!this.enabled || character.isAboveGround) {
      character.isActivelyWalking = false;
      return;
    }

    const inputMag = Math.hypot(inputVector.x, inputVector.y);
    const isMoving = inputMag > 0.05;
    character.isActivelyWalking = isMoving;

    // Target velocity:
    // When moving: target is maxWalkSpeed in the input direction
    // When stopping (keys released): target is exactly (0, 0)
    let targetVx = 0;
    let targetVy = 0;
    if (isMoving) {
      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;
      targetVx = dirX * this.maxWalkSpeed;
      targetVy = dirY * this.maxWalkSpeed;
    }

    // Velocity difference to reach target (whether reaching full speed or stopping):
    const diffX = targetVx - character.velocity.x;
    const diffY = targetVy - character.velocity.y;
    const diffSpeed = Math.hypot(diffX, diffY);

    if (diffSpeed < 0.001) {
      character.velocity.x = targetVx;
      character.velocity.y = targetVy;
      return;
    }

    // Current speed relative to the ground:
    const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
    const staticThreshold = Math.max(0.02, arena.staticFrictionThreshold * character.staticGroundFrictionMod);

    // Friction law:
    // Both accelerating and stopping go from a velocity difference to terminal target velocity.
    // Use consistent friction mod so acceleration and deceleration happen at the exact same rate.
    const activeFrictionMod = isMoving
      ? character.dynamicGroundFrictionMod
      : character.dynamicGroundFrictionMod;

    if (activeFrictionMod <= 0.001) {
      // Zero friction: feet slip completely! Cannot push on the ground to accelerate or stop.
      return;
    }

    // Symmetrical Acceleration & Deceleration Rate:
    // Both accelerating and stopping use walkAcceleration scaled by active friction and ground surface
    const surfaceFactor = arena.frictionCoeff / 10.0;
    const maxAccel = this.walkAcceleration * activeFrictionMod * surfaceFactor;
    const maxStep = maxAccel * dt;

    if (diffSpeed <= maxStep || (!isMoving && currentSpeed < staticThreshold)) {
      // Reached terminal target velocity (full speed or crisp complete stop)
      character.velocity.x = targetVx;
      character.velocity.y = targetVy;
    } else {
      // Step toward target velocity symmetrically at rate maxAccel
      const stepRatio = maxStep / diffSpeed;
      character.velocity.x += diffX * stepRatio;
      character.velocity.y += diffY * stepRatio;
    }
  }
}
