import { Vector2D } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export interface WalkingModuleOptions {
  maxWalkForce?: number;
  maxWalkSpeed?: number;
  dragDamping?: number;
  walkInAir?: boolean;
  airFriction?: number;
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

  // Air friction multiplier applied when airborne (floating friction to stay still)
  public airFriction = 1.0;

  constructor(options?: WalkingModuleOptions) {
    if (options?.maxWalkForce !== undefined) this.maxWalkForce = options.maxWalkForce;
    if (options?.maxWalkSpeed !== undefined) this.maxWalkSpeed = options.maxWalkSpeed;
    if (options?.dragDamping !== undefined) this.dragDamping = options.dragDamping;
    if (options?.walkInAir !== undefined) this.walkInAir = options.walkInAir;
    if (options?.airFriction !== undefined) this.airFriction = options.airFriction;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  /**
   * Symmetrical Force-Based Locomotion & Air Friction:
   * - Accelerating and stopping step toward target velocity at symmetrical rate:
   *   maxAccel = (maxWalkForce * strength / totalMass) * grip.
   * - On ground, grip scales by ground friction. In air, airFriction applies floating friction to stay still.
   * - Carrying heavy objects increases totalMass, reducing acceleration and smoothly lowering top speed.
   * - When not standing on something (airborne), max speed is not clamped to effective walking speed,
   *   preserving high velocity capacity from launches and jumps while allowing steering and floating friction braking.
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

    // Total effective mass (base character + any carried object) — used for Newton's 2nd law: a = F/m
    const totalMass = character.hasMass ? Math.max(0.2, character.mass) : 1.0;
    if (totalMass <= 0.01) return;

    // Active grip: on ground, scales by surface friction. In air, airFriction applies floating friction.
    const grip = isAirborne
      ? this.airFriction
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

      if (isAirborne) {
        // When not standing on something, do not clamp max speed to effective walking speed!
        // Preserve any higher velocity capacity (e.g. launches, high-speed jumps).
        const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
        const airTargetSpeed = Math.max(effectiveSpeed, currentSpeed);
        targetVx = dirX * airTargetSpeed;
        targetVy = dirY * airTargetSpeed;
      } else {
        targetVx = dirX * effectiveSpeed;
        targetVy = dirY * effectiveSpeed;
      }
    }

    // Velocity difference to reach target (whether accelerating to speed or braking to stay still)
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
    const effectiveWalkForce = character.isSprinting ? this.maxWalkForce * 1.5 : this.maxWalkForce;
    const maxAccel = ((effectiveWalkForce * character.strength) / totalMass) * grip;
    const maxStep = maxAccel * dt;

    if (diffSpeed <= maxStep || (!isAirborne && !isMoving && currentSpeed < staticThreshold)) {
      // Reached terminal target velocity (full speed or crisp complete stop)
      character.velocity.x = targetVx;
      character.velocity.y = targetVy;
    } else {
      // Step toward target velocity at symmetrical rate maxAccel
      const stepRatio = maxStep / diffSpeed;
      character.velocity.x += diffX * stepRatio;
      character.velocity.y += diffY * stepRatio;
    }
  }
}
