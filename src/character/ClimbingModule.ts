import type { Character } from "./Character.js";
import { Vector2D } from "../engine/GameObject.js";
import type { Arena, Wall } from "../engine/Arena.js";

export class ClimbingModule {
  public id = "climbing";
  public name = "Climbing Module";
  public enabled = true;

  // Maximum adhesive grip force before character slips and cannot climb/cling (in Newtons)
  public maxAdhesion = 35.0;

  // Maximum vertical speed cap when climbing walls (in units per second)
  public maxClimbSpeed = 3.0;

  /**
   * Checks if the character is intending to move towards an adjacent wall that is higher than current elevation.
   * If so, and if isClimbHeld is true, increases character's elevation until they reach the top of the wall.
   * While elevated on a wall, releasing Space bar does NOT cause falling — character maintains cling grip.
   * Falling only occurs when the player actively moves in the opposite direction (away from the wall).
   * Returns true if character is actively climbing or clinging to the wall.
   */
  public update(
    character: Character,
    movementInput: Vector2D,
    isClimbHeld: boolean,
    dt: number,
    arena: Arena
  ): boolean {
    if (!this.enabled || !character.hasVerticalPosition || !character.hasStrength || character.strength <= 0) {
      character.isClimbing = false;
      return false;
    }

    const r = character.hasCollider ? character.colliderRadius : 0.44;
    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    const hasMoveInput = inputMag >= 0.05;
    const moveDirX = hasMoveInput ? movementInput.x / inputMag : 0;
    const moveDirY = hasMoveInput ? movementInput.y / inputMag : 0;

    // Find closest adjacent wall
    let targetWall: Wall | null = null;
    let shortestDist = Infinity;
    let targetDot = 0;
    let targetDx = 0;
    let targetDy = 0;

    for (const wall of arena.walls) {
      // Find closest point on wall AABB
      const closestX = Math.max(wall.x, Math.min(character.position.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(character.position.y, wall.y + wall.height));

      const dx = closestX - character.position.x;
      const dy = closestY - character.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= r + 0.15 && dist < shortestDist) {
        shortestDist = dist;
        targetWall = wall;
        targetDot = hasMoveInput ? (moveDirX * dx + moveDirY * dy) : 0;
        targetDx = dx;
        targetDy = dy;
      }
    }

    if (!targetWall) {
      character.isClimbing = false;
      return false;
    }

    // Physical adhesion limit check:
    // If the downward gravitational force of total mass exceeds maxAdhesion, grip fails and character slips
    const totalMass = character.mass;
    const requiredForce = totalMass * arena.gravity;
    if (requiredForce > this.maxAdhesion) {
      character.isClimbing = false;
      return false;
    }

    // Check if climbing has already been established
    const isEstablishedClimb = character.isClimbing || character.position.z > 0.05;

    // Once climbing is established on a wall:
    // - Releasing Space bar maintains wall cling grip at current height.
    // - Continuing to hold Space continues climbing UP the wall, even without holding directional movement keys.
    // - Falling ONLY occurs when actively walking in the opposite direction (away from wall: targetDot < -0.1).
    if (isEstablishedClimb && character.position.z < targetWall.wallHeight) {
      if (hasMoveInput && targetDot < -0.1) {
        // Player is intending to walk away from the wall: release grip and fall down
        character.isClimbing = false;
        character.velocity.x = moveDirX * 3.0;
        character.velocity.y = moveDirY * 3.0;
        return false;
      }

      // Clinging to the wall: stay supported at current elevation, neutralize gravity
      character.isClimbing = true;
      character.verticalVelocity = 0;
      character.velocity.x = 0;
      character.velocity.y = 0;

      // Ascend towards wall top if holding climb key (Space) and not walking away from the wall
      // Does not require continuous directional input once climb is established
      if (isClimbHeld) {
        const baseMass = character.baseMass;
        const effectiveClimbSpeed = Math.max(
          0.2,
          Math.min(this.maxClimbSpeed, (this.maxClimbSpeed * baseMass * character.strength) / Math.max(0.1, totalMass))
        );
        character.position.z += effectiveClimbSpeed * dt;

        // When reaching or exceeding wall top, mount onto wall smoothly without teleporting / jolting
        if (character.position.z >= targetWall.wallHeight) {
          character.position.z = targetWall.wallHeight;
          character.supportingSurfaceHeight = targetWall.wallHeight;
          character.verticalVelocity = 0;
          character.isClimbing = false;

          // Transition smoothly onto the top of the wall
          if (hasMoveInput) {
            character.velocity.x = moveDirX * 3.5;
            character.velocity.y = moveDirY * 3.5;
          } else {
            // Impart gentle velocity towards wall interior so character safely mounts onto the wall top
            const toWallDirX = shortestDist > 0.001 ? targetDx / shortestDist : 0;
            const toWallDirY = shortestDist > 0.001 ? targetDy / shortestDist : 0;
            character.velocity.x = toWallDirX * 1.5;
            character.velocity.y = toWallDirY * 1.5;
          }
        }
      }

      return true;
    }

    // On ground (z <= 0.05, not established): Initiate climb only if pressing towards wall and holding Space
    if (isClimbHeld && hasMoveInput && targetDot > 0.01 && character.position.z < targetWall.wallHeight) {
      character.isClimbing = true;
      character.verticalVelocity = 0;
      character.velocity.x = 0;
      character.velocity.y = 0;

      const baseMass = character.baseMass;
      const effectiveClimbSpeed = Math.max(
        0.2,
        Math.min(this.maxClimbSpeed, (this.maxClimbSpeed * baseMass * character.strength) / Math.max(0.1, totalMass))
      );
      character.position.z += effectiveClimbSpeed * dt;
      return true;
    }

    character.isClimbing = false;
    return false;
  }
}
