import { Vector2D } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export class WalkingModule {
  public id = "walking";
  public name = "Walking Module";
  public enabled = true;

  // Maximum propulsion / braking force exerted by the character's legs (in Newtons / Force units)
  public maxWalkForce = 50.0;

  // Maximum physical leg stride / cadence speed cap (u/s)
  public maxWalkSpeed = 5.2;

  // Drag damping factor which converts walk force and mass into natural load speed:
  // naturalSpeed = (maxWalkForce * strength) / (totalMass * dragDamping)
  public dragDamping = 8.01;

  /**
   * Symmetrical Force-Based Locomotion:
   * - Both accelerating and stopping step toward target velocity at the EXACT same rate:
   *   maxAccel = (maxWalkForce * strength / totalMass) * grip.
   * - Acceleration and deceleration rates are 100% symmetrical.
   * - Carrying heavy objects increases totalMass, reducing both acceleration and top speed.
   * - Pushing heavy objects in the arena resists movement through contact forces, naturally slowing movement.
   */
  public update(character: Character, inputVector: Vector2D, dt: number, arena: Arena): void {
    if (!this.enabled || character.isAboveGround) {
      character.isActivelyWalking = false;
      return;
    }

    const inputMag = Math.hypot(inputVector.x, inputVector.y);
    const isMoving = inputMag > 0.05;
    character.isActivelyWalking = isMoving;

    // Total effective mass (base character + any carried object)
    const totalMass = character.mass;
    if (totalMass <= 0.01) return;

    // Active ground friction: if 0 (frictionless ice), feet slip and cannot push or stop
    const activeFrictionMod = character.dynamicGroundFrictionMod;
    if (activeFrictionMod <= 0.001) {
      return;
    }

    const surfaceFactor = arena.frictionCoeff / 10.0;
    const grip = activeFrictionMod * surfaceFactor;

    // Target velocity:
    // Natural top speed emerges from walk force divided by mass, capped at physical leg maxWalkSpeed
    const naturalSpeed = (this.maxWalkForce * character.strength) / (totalMass * this.dragDamping);
    const effectiveSpeed = Math.min(this.maxWalkSpeed, naturalSpeed);

    let targetVx = 0;
    let targetVy = 0;
    if (isMoving) {
      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;
      targetVx = dirX * effectiveSpeed;
      targetVy = dirY * effectiveSpeed;
    }

    // Velocity difference to reach target (whether accelerating to speed or braking to stop)
    const diffX = targetVx - character.velocity.x;
    const diffY = targetVy - character.velocity.y;
    const diffSpeed = Math.hypot(diffX, diffY);

    if (diffSpeed < 0.001) {
      character.velocity.x = targetVx;
      character.velocity.y = targetVy;
      return;
    }

    const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
    const staticThreshold = Math.max(0.02, arena.staticFrictionThreshold * character.staticGroundFrictionMod);

    // Symmetrical acceleration and deceleration:
    // Leg force drives both acceleration and braking symmetrically (a = F_walk / totalMass * grip)
    const maxAccel = ((this.maxWalkForce * character.strength) / totalMass) * grip;
    const maxStep = maxAccel * dt;

    if (diffSpeed <= maxStep || (!isMoving && currentSpeed < staticThreshold)) {
      // Reached terminal target velocity (full speed or crisp complete stop)
      character.velocity.x = targetVx;
      character.velocity.y = targetVy;
    } else {
      // Step toward target velocity at the exact same symmetrical rate maxAccel
      const stepRatio = maxStep / diffSpeed;
      character.velocity.x += diffX * stepRatio;
      character.velocity.y += diffY * stepRatio;
    }
  }
}
