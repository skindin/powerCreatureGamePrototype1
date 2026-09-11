import type { Character } from "./Character.js";
import { Vector2D } from "../engine/GameObject.js";
import type { Arena, Wall } from "../engine/Arena.js";

export class ClimbingModule {
  public id = "climbing";
  public name = "Climbing Module";
  public enabled = true;

  // Rate of vertical ascent when climbing walls (in units per second)
  public climbSpeed = 2.5;

  /**
   * Checks if the character is intending to move towards an adjacent wall that is higher than current elevation.
   * If so, and if isClimbHeld is true, increases character's elevation until they reach the top of the wall.
   * Returns true if character is actively climbing.
   */
  public update(
    character: Character,
    movementInput: Vector2D,
    isClimbHeld: boolean,
    dt: number,
    arena: Arena
  ): boolean {
    if (!this.enabled || !character.hasVerticalPosition) {
      character.isClimbing = false;
      return false;
    }

    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    // Must have movement intention to climb towards a wall
    if (inputMag < 0.05) {
      character.isClimbing = false;
      return false;
    }

    const moveDirX = movementInput.x / inputMag;
    const moveDirY = movementInput.y / inputMag;

    // Check adjacent walls that the character is pressing towards
    const r = character.hasCollider ? character.colliderRadius : 0.44;
    let targetWall: Wall | null = null;
    let shortestDist = Infinity;

    for (const wall of arena.walls) {
      // Wall must be higher than current elevation to climb up
      if (character.position.z >= wall.wallHeight - 0.001) continue;

      // Find closest point on wall AABB
      const closestX = Math.max(wall.x, Math.min(character.position.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(character.position.y, wall.y + wall.height));

      const dx = closestX - character.position.x;
      const dy = closestY - character.position.y;
      const dist = Math.hypot(dx, dy);

      // Character must be touching or directly adjacent to the wall (within radius + 0.15 units)
      if (dist <= r + 0.15) {
        // Player's movement input must be directed TOWARDS the wall
        const dot = moveDirX * dx + moveDirY * dy;
        if (dot > 0.01 && dist < shortestDist) {
          shortestDist = dist;
          targetWall = wall;
        }
      }
    }

    // If pressing into a wall and holding climb key (Space)
    if (targetWall && isClimbHeld) {
      character.isClimbing = true;
      character.verticalVelocity = 0; // Neutralize gravity while clinging/climbing

      // Ascend towards the top of the wall
      character.position.z += this.climbSpeed * dt;

      // When reaching or exceeding wall top, mount the wall
      if (character.position.z >= targetWall.wallHeight) {
        character.position.z = targetWall.wallHeight;
        character.supportingSurfaceHeight = targetWall.wallHeight;
        character.verticalVelocity = 0;
        character.isClimbing = false;

        // Step slightly onto the wall footprint along movement direction
        character.position.x += moveDirX * 0.06;
        character.position.y += moveDirY * 0.06;
      }
      return true;
    }

    character.isClimbing = false;
    return false;
  }
}
