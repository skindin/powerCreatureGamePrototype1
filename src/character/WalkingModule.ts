import { Vector2D } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export class WalkingModule {
  public id = "walking";
  public name = "Walking Module";
  public enabled = true;

  // Maximum propulsion / braking force exerted by the character's legs (in Newtons / Force units)
  public maxWalkForce = 35.0;

  // Maximum physical leg stride / cadence speed cap (u/s)
  public maxWalkSpeed = 5.2;

  // Drag damping factor for backwards compatibility / reference
  public dragDamping = 8.01;

  /**
   * Symmetrical Force-Based Locomotion:
   * - Both accelerating and stopping step toward target velocity at the EXACT same rate:
   *   maxAccel = (maxWalkForce * strength / totalMass) * grip.
   * - Acceleration and deceleration rates are 100% symmetrical.
   * - Carrying heavy objects increases totalMass, reducing acceleration and smoothly lowering top speed.
   * - Pushing heavy objects in the arena resists movement through contact forces, naturally slowing movement.
   */
  public update(character: Character, inputVector: Vector2D, dt: number, arena: Arena): void {
    if (!this.enabled || !character.isRestingOnSurface) {
      character.isActivelyWalking = false;
      return;
    }

    // Walking strictly requires friction, mass, and muscle strength to propel the body
    if (!character.hasFriction || !character.frictionModule?.enabled || !character.hasMass || !character.hasStrength || character.strength <= 0) {
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
    // Carrying a load reduces top walking speed smoothly based on carried mass and strength.
    // Heavy Red Box (2.6kg) slows speed down to ~75% ("a little bit slower"), not a crawl.
    const carriedMass = character.carriedMass;
    const loadFactor = carriedMass / (Math.max(0.1, character.strength) * 8.0);
    const effectiveSpeed = this.maxWalkSpeed / (1.0 + loadFactor);

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
    // Base character mass drives leg acceleration/braking (a = F_walk / accelMass * grip)
    // while carriedMass smoothly reduces top speed via loadFactor, avoiding double mass penalty
    const accelMass = character.hasMass ? Math.max(0.2, character.baseMass) : 1.0;
    const maxAccel = ((this.maxWalkForce * character.strength) / accelMass) * grip;
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
