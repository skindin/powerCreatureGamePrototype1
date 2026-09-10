import type { Character } from "./Character.js";
import type { Arena, Wall } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
  couldClearWall: boolean; // True if z > standard wall height
  isOverWall: boolean;     // True if intersecting a wall tile
  collidesWall: boolean;   // True if impacts wall
}

export interface TrajectoryCalculation {
  points: TrajectoryPoint[];
  landPoint: { x: number; y: number };
  isBlockedByWall: boolean;
  blockedAtWallId?: string;
  isLandingOnWallTop?: boolean;
}

export class ThrowModule {
  public id = "throw";
  public name = "Throw Ability";
  public enabled = true;

  // Tunable throw physics in wall-based units
  public baseThrowForce = 7.6; // Base throw power in u/s
  public maxThrowAimDistance = 13.0; // Max throw aim distance in units (~13 wall tiles)

  /**
   * Helper: tests circle-AABB intersection with a wall tile (matching GameObject collision)
   */
  private testWallIntersection(x: number, y: number, radius: number, wall: Wall): boolean {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
  }

  /**
   * Computes launch velocities vx, vy, vz given start position, target position, arena parameters, and strength.
   * Adjusts total flight time and launch angles so the object lands EXACTLY at the targeted position,
   * whether on the ground or on top of an elevated wall.
   */
  private computeLaunchVelocity(
    startX: number,
    startY: number,
    startZ: number,
    targetX: number,
    targetY: number,
    arena: Arena,
    strengthRatio: number
  ): { vx: number; vy: number; vz: number; totalTime: number; finalTargetX: number; finalTargetY: number; targetSurfaceHeight: number } | null {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) return null;

    // Clamp aim distance to character reach
    const actualDist = Math.min(dist, this.maxThrowAimDistance);
    const dirX = dx / dist;
    const dirY = dy / dist;
    const finalTargetX = startX + dirX * actualDist;
    const finalTargetY = startY + dirY * actualDist;

    // Find highest obstacle along trajectory path to ensure clearance over any intermediate walls
    let maxWallHeight = 0;
    for (const wall of arena.walls) {
      for (let s = 0.2; s <= 0.8; s += 0.2) {
        const sampleX = startX + (finalTargetX - startX) * s;
        const sampleY = startY + (finalTargetY - startY) * s;
        if (this.testWallIntersection(sampleX, sampleY, 0.4, wall)) {
          maxWallHeight = Math.max(maxWallHeight, wall.wallHeight);
          break;
        }
      }
    }

    // Target surface elevation (wall top height if target aim position is on a wall, otherwise 0)
    const targetSurfaceHeight = arena.getSupportingSurfaceHeight(finalTargetX, finalTargetY);

    // Apex height: provides natural parabolic arc with clearance over standard wall height and landing surface
    const minApexZ = Math.max(startZ, targetSurfaceHeight, maxWallHeight) + 0.6;
    const apexHeight = Math.max(minApexZ, Math.max(startZ, targetSurfaceHeight) + 0.35 + (actualDist / 13.0) * 1.5 * strengthRatio);

    // Vertical launch velocity to reach apex
    const vz = Math.sqrt(2 * arena.gravity * Math.max(0.1, apexHeight - startZ));
    const timeToApex = vz / arena.gravity;
    // Time to fall from apex down to the target elevation (wall top or ground)
    const timeFromApexToSurface = Math.sqrt(Math.max(0.001, 2 * (apexHeight - targetSurfaceHeight)) / arena.gravity);
    const totalTime = timeToApex + timeFromApexToSurface;

    if (totalTime <= 0.05) return null;

    // Horizontal speed required to land EXACTLY at (finalTargetX, finalTargetY) at totalTime
    const horizontalSpeed = actualDist / totalTime;
    const vx = dirX * horizontalSpeed;
    const vy = dirY * horizontalSpeed;

    return { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight };
  }

  /**
   * Pre-calculates trajectory points for real-time visualization overlay
   */
  public calculateTrajectory(
    character: Character,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena
  ): TrajectoryCalculation | null {
    if (!this.enabled || !character.heldObject) return null;

    const held = character.heldObject;
    const startX = held.position.x;
    const startY = held.position.y;
    const startZ = held.position.z;

    const strengthRatio = Math.max(0.3, Math.min(2.5, character.strength / held.mass));
    const launch = this.computeLaunchVelocity(startX, startY, startZ, aimTargetX, aimTargetY, arena, strengthRatio);
    if (!launch) return null;

    const { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight } = launch;

    // Fine simulation steps matching 120Hz physics precision
    const steps = 90;
    const dtStep = totalTime / steps;
    const points: TrajectoryPoint[] = [];

    let isBlocked = false;
    let isLandingOnWallTop = targetSurfaceHeight > 0;
    let blockedWallId: string | undefined;

    for (let step = 0; step <= steps; step++) {
      const t = step * dtStep;
      // At the final step, enforce exact final target coordinates
      const currentX = step === steps ? finalTargetX : startX + vx * t;
      const currentY = step === steps ? finalTargetY : startY + vy * t;
      const calculatedZ = startZ + vz * t - 0.5 * arena.gravity * t * t;
      const currentZ = step === steps ? targetSurfaceHeight : Math.max(targetSurfaceHeight, calculatedZ);
      const currentVz = vz - arena.gravity * t;

      // Blue section: height > standard wall height
      const couldClearWall = currentZ > arena.wallHeight;
      let isOverWall = false;
      let collidesWall = false;

      // Check wall collisions along the path
      for (const wall of arena.walls) {
        if (this.testWallIntersection(currentX, currentY, held.colliderRadius, wall)) {
          isOverWall = true;
          // Only check collision if height is at or below the wall and not yet at the intentional landing step
          if (currentZ <= wall.wallHeight + 0.001) {
            const wasAbove = points.length > 0 && points[points.length - 1].z >= wall.wallHeight - 0.05;
            if (wasAbove && currentVz <= 0) {
              // Descending onto top of wall
              if (targetSurfaceHeight > 0 && (step >= steps - 2 || Math.hypot(currentX - finalTargetX, currentY - finalTargetY) < 0.2)) {
                // This is the intended landing on top of the targeted wall!
                isLandingOnWallTop = true;
                break;
              } else if (targetSurfaceHeight === 0) {
                // Intermediate wall hit from above
                isLandingOnWallTop = true;
                collidesWall = true;
                blockedWallId = wall.id;
                break;
              }
            } else if (currentZ < wall.wallHeight - 0.05) {
              // Side wall collision
              collidesWall = true;
              isBlocked = true;
              blockedWallId = wall.id;
              break;
            }
          }
        }
      }

      points.push({
        x: currentX,
        y: currentY,
        z: currentZ,
        t,
        couldClearWall,
        isOverWall,
        collidesWall,
      });

      if (collidesWall) {
        break; // Trajectory truncated on collision
      }
    }

    const lastPoint = points[points.length - 1];
    return {
      points,
      landPoint: {
        x: isBlocked ? lastPoint.x : finalTargetX,
        y: isBlocked ? lastPoint.y : finalTargetY,
      },
      isBlockedByWall: isBlocked,
      isLandingOnWallTop,
      blockedAtWallId: blockedWallId,
    };
  }

  /**
   * Executes the throw of the held object using the exact same launch parameters
   */
  public throwHeldObject(
    character: Character,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena
  ): GameObject | null {
    if (!this.enabled || !character.heldObject) return null;

    const held = character.heldObject;
    const startX = held.position.x;
    const startY = held.position.y;
    const startZ = held.position.z;

    const strengthRatio = Math.max(0.3, Math.min(2.5, character.strength / held.mass));
    const launch = this.computeLaunchVelocity(startX, startY, startZ, aimTargetX, aimTargetY, arena, strengthRatio);
    if (!launch) return null;

    held.isHeld = false;
    held.heldBy = null;
    held.velocity.x = launch.vx;
    held.velocity.y = launch.vy;
    held.verticalVelocity = launch.vz;
    held.position.z = Math.max(0.3, held.position.z);

    // Apply opposite recoil force to the character based on momentum conservation
    const recoilRatio = held.mass / Math.max(0.2, character.mass);
    character.velocity.x -= launch.vx * recoilRatio;
    character.velocity.y -= launch.vy * recoilRatio;

    character.heldObject = null;
    return held;
  }
}
