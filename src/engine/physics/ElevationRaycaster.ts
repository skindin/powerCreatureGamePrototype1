import type { Arena, Wall } from "../Arena.js";

/**
 * Pure geometric raycasting and wall-elevation query utilities shared across
 * combat and trajectory subsystems so capability modules never cross-import each other.
 */
export class ElevationRaycaster {
  /**
   * Tests if an aim point (aimX, aimY) is directly over a wall tile footprint.
   * Only considers whether the cursor is over the physical 2D wall tile,
   * ignoring upward-projected roof depth so space behind walls can be targeted.
   */
  public static findWallOverlappingCollider(
    aimX: number,
    aimY: number,
    _radius = 0,
    arena: Arena,
    _hoverScale = 0
  ): { wall: Wall; targetSurfaceHeight: number; physX: number; physY: number } | null {
    let bestWall: Wall | null = null;
    let bestDist = Infinity;

    for (const wall of arena.walls) {
      const isOverWallTile =
        aimX >= wall.x &&
        aimX <= wall.x + wall.width &&
        aimY >= wall.y &&
        aimY <= wall.y + wall.height;

      if (isOverWallTile) {
        const midX = wall.x + wall.width * 0.5;
        const midY = wall.y + wall.height * 0.5;
        const d = Math.hypot(midX - aimX, midY - aimY);
        if (d < bestDist) {
          bestDist = d;
          bestWall = wall;
        }
      }
    }

    if (bestWall) {
      return {
        wall: bestWall,
        targetSurfaceHeight: bestWall.wallHeight,
        physX: aimX,
        physY: aimY,
      };
    }

    return null;
  }

  /**
   * Calculates the distance along ray (startX, startY) + s * (dirX, dirY)
   * where the ray enters and exits a wall's 2D bounding box.
   */
  public static getRayWallEnterDistance(
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    wall: Wall
  ): { enterDist: number; exitDist: number } | null {
    let tNear = -Infinity;
    let tFar = Infinity;

    if (Math.abs(dirX) > 1e-6) {
      let t1 = (wall.x - startX) / dirX;
      let t2 = (wall.x + wall.width - startX) / dirX;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tNear = Math.max(tNear, t1);
      tFar = Math.min(tFar, t2);
    } else {
      if (startX <= wall.x || startX >= wall.x + wall.width) return null;
    }

    if (Math.abs(dirY) > 1e-6) {
      let t1 = (wall.y - startY) / dirY;
      let t2 = (wall.y + wall.height - startY) / dirY;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tNear = Math.max(tNear, t1);
      tFar = Math.min(tFar, t2);
    } else {
      if (startY <= wall.y || startY >= wall.y + wall.height) return null;
    }

    if (tNear <= tFar && tFar >= 0) {
      return { enterDist: Math.max(0, tNear), exitDist: tFar };
    }
    return null;
  }
}
