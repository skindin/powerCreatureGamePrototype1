import { Vector2D } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

export class WalkingModule {
  public id = "walking";
  public name = "Walking Module";
  public enabled = true;

  // Maximum propulsion force exerted by the character's legs (in Newtons / Force units)
  public maxWalkForce = 50.0;

  // Ground drag damping rate (s^-1) which, combined with total mass and walk force, determines natural terminal speed:
  // v_terminal = (maxWalkForce * strength) / (totalMass * dragDamping)
  public dragDamping = 8.0;

  /**
   * Pure force-based locomotion:
   * - Character applies walking force F_walk up to maxWalkForce in the movement direction.
   * - Total effective mass includes any carried object (totalMass = character.mass).
   * - Acceleration is a = F_net / totalMass. Carrying heavy objects naturally reduces acceleration.
   * - Terminal walking speed emerges naturally as v_terminal = (maxWalkForce * strength) / (totalMass * dragDamping).
   * - Pushing heavy objects in the arena exerts reactive contact forces, naturally slowing movement.
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

    // Active ground friction: if 0 (frictionless ice), feet slip and no propulsion is possible
    const activeFrictionMod = character.dynamicGroundFrictionMod;
    if (activeFrictionMod <= 0.001) {
      return;
    }

    const surfaceFactor = arena.frictionCoeff / 10.0;
    const grip = activeFrictionMod * surfaceFactor;

    // 1. Driving force from character's legs
    let forceX = 0;
    let forceY = 0;
    if (isMoving) {
      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;
      const totalForce = this.maxWalkForce * character.strength * grip;
      forceX = dirX * totalForce;
      forceY = dirY * totalForce;
    }

    // 2. Ground drag opposing motion
    const gamma = this.dragDamping * grip;
    const dragForceX = -totalMass * gamma * character.velocity.x;
    const dragForceY = -totalMass * gamma * character.velocity.y;

    // 3. Newton's second law: a = F_net / totalMass
    const accelX = (forceX + dragForceX) / totalMass;
    const accelY = (forceY + dragForceY) / totalMass;

    character.velocity.x += accelX * dt;
    character.velocity.y += accelY * dt;

    // 4. Static friction snap to complete stop when keys are released and speed is low
    const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
    const staticThreshold = Math.max(0.04, arena.staticFrictionThreshold * character.staticGroundFrictionMod);
    if (!isMoving && currentSpeed < staticThreshold) {
      character.velocity.x = 0;
      character.velocity.y = 0;
    }
  }
}
