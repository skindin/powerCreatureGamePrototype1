import { Vector2D } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export interface WalkingModuleOptions {
  maxWalkForce?: number;
  maxWalkSpeed?: number;
  dragDamping?: number;
  walkInAir?: boolean;
  enabled?: boolean;
}

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

  // When enabled, walking force applies in the air, granting air control / steering
  public walkInAir = true;

  constructor(options?: WalkingModuleOptions) {
    if (options?.maxWalkForce !== undefined) this.maxWalkForce = options.maxWalkForce;
    if (options?.maxWalkSpeed !== undefined) this.maxWalkSpeed = options.maxWalkSpeed;
    if (options?.dragDamping !== undefined) this.dragDamping = options.dragDamping;
    if (options?.walkInAir !== undefined) this.walkInAir = options.walkInAir;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  /**
   * Symmetrical Force-Based Locomotion:
   * - Both accelerating and stopping step toward target velocity at the EXACT same rate:
   *   maxAccel = (maxWalkForce * strength / totalMass) * grip.
   * - Acceleration and deceleration rates are 100% symmetrical.
   * - Carrying heavy objects increases totalMass, reducing acceleration and smoothly lowering top speed.
   * - Pushing heavy objects in the arena resists movement through contact forces, naturally slowing movement.
   * - When walkInAir is enabled, walking force applies in mid-air for responsive air control.
   */
  public update(character: Character, inputVector: Vector2D, dt: number, arena: Arena): void {
    const isAirborne = !character.isRestingOnSurface;
    if (!this.enabled || (isAirborne && !this.walkInAir) || character.isClimbing) {
      character.isActivelyWalking = false;
      return;
    }

    // Walking strictly requires mass and muscle strength to propel the body
    if (!character.hasMass || !character.hasStrength || character.strength <= 0) {
      character.isActivelyWalking = false;
      return;
    }

    // On ground, feet require friction to push against the floor
    if (!isAirborne && (!character.hasFriction || !character.frictionModule?.enabled || character.dynamicGroundFrictionMod <= 0.001)) {
      character.isActivelyWalking = false;
      return;
    }

    const inputMag = Math.hypot(inputVector.x, inputVector.y);
    const isMoving = inputMag > 0.05;
    character.isActivelyWalking = isMoving;

    // Letting go of movement control automatically toggles sprint off
    if (!isMoving && character.isSprinting) {
      character.setSprinting(false);
    }

    // In mid-air, if the player is not holding any movement input, do not apply air braking — coast along current ballistic trajectory!
    if (isAirborne && !isMoving) {
      return;
    }

    // Total effective mass (base character + any carried object) — used for Newton's 2nd law: a = F/m
    const totalMass = character.hasMass ? Math.max(0.2, character.mass) : 1.0;
    if (totalMass <= 0.01) return;

    // Active grip: on ground, scales by surface friction. In air, air control force applies.
    const grip = isAirborne
      ? 1.0
      : character.dynamicGroundFrictionMod * (arena.frictionCoeff / 10.0);
    if (grip <= 0.001) {
      return;
    }

    // Target velocity:
    // Carrying a load reduces top walking speed smoothly based on carried mass and strength.
    // Sprinting multiplies top speed and propulsion force.
    const carriedMass = character.carriedMass;
    const loadFactor = carriedMass / (Math.max(0.1, character.strength) * 8.0);
    const sprintFactor = character.isSprinting ? 1.55 : 1.0;
    const effectiveSpeed = (this.maxWalkSpeed * sprintFactor) / (1.0 + loadFactor);

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

    // Symmetrical acceleration and deceleration: a = F_walk / totalMass * grip
    // totalMass includes carried object — heavy loads genuinely reduce how fast you can start and stop.
    // Sprint force bonus is applied to the force (numerator), but total mass in the denominator
    // means sprinting with a boulder is still slower to spin up than sprinting empty-handed.
    const effectiveWalkForce = character.isSprinting ? this.maxWalkForce * 1.5 : this.maxWalkForce;
    const maxAccel = ((effectiveWalkForce * character.strength) / totalMass) * grip;
    const maxStep = maxAccel * dt;

    if (diffSpeed <= maxStep || (!isAirborne && !isMoving && currentSpeed < staticThreshold)) {
      // Reached terminal target velocity (full speed or crisp complete stop on ground)
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
