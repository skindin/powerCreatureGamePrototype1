import { Arena, Wall } from "./Arena.js";
import { GameObject } from "./GameObject.js";

export interface SurfaceEvaluationResult {
  surfaceHeight: number;
  standingWall: Wall | null;
}

/**
 * Handles physical surface support queries, wall top layer detection,
 * contiguous platform traversal, and edge dismount freefall transitions.
 */
export class SurfaceSupportModule {
  /**
   * Determines the supporting surface elevation (floor z=0 or wall top z=wallHeight)
   * and current standing wall for an entity.
   */
  public static evaluateSupportingSurface(entity: GameObject, arena: Arena): SurfaceEvaluationResult {
    if (!entity.hasCollider || !entity.hasVerticalPosition || !arena.walls || arena.walls.length === 0) {
      return { surfaceHeight: 0, standingWall: null };
    }

    // Layer 2 threshold: entity is elevated to or resting on layer 2 (wall height)
    const isAtWallLayer =
      entity.position.z >= arena.wallHeight - 0.05 ||
      ((entity.supportingSurfaceHeight ?? 0) >= arena.wallHeight - 0.05 && entity.position.z >= arena.wallHeight - 0.2) ||
      entity.standingWall !== null;

    if (!isAtWallLayer) {
      return { surfaceHeight: 0, standingWall: null };
    }

    const char = entity.isCharacter ? (entity as any) : null;
    const isDismountFalling = Boolean(
      entity.isDismountFreefall ||
      char?.climbingModule?.isDismountFreefall ||
      char?.climbingModule?.climbSuppressedUntilRePress
    );

    if (isDismountFalling) {
      // While in dismount freefall into gap or off wall: entity falls down to ground!
      return { surfaceHeight: 0, standingWall: null };
    }

    const edgeMod = char?.wallEdgeAssistModule ?? char?.climbingModule;
    // Top surface support radius: creatures and rolling bodies are supported while their center
    // is on the wall or within hangDistance / 0.12u of the edge. Moving beyond this dismounts into freefall.
    const supportRadius = Math.max(0.05, Math.min(entity.colliderRadius, edgeMod ? edgeMod.hangDistance : 0.12));

    if (!entity.isCharacter) {
      // Freebody object: supported if and only if its center is within supportRadius of an active wall in arena
      let supportingWall: Wall | null = null;
      for (const wall of arena.walls) {
        if (arena.testWallOverlap(entity.position.x, entity.position.y, supportRadius, wall)) {
          supportingWall = wall;
          break;
        }
      }
      if (supportingWall) {
        return { surfaceHeight: supportingWall.wallHeight, standingWall: supportingWall };
      }
      return { surfaceHeight: 0, standingWall: null };
    }

    if (entity.standingWall) {
      // Character standing on wall top:
      // Check if entity.standingWall still exists in arena (was not deleted)
      const wallStillExists = arena.walls.find((w) => w.id === entity.standingWall!.id);
      const touchesCurrent = wallStillExists
        ? arena.testWallOverlap(entity.position.x, entity.position.y, supportRadius, wallStillExists)
        : false;

      if (touchesCurrent && wallStillExists) {
        return { surfaceHeight: wallStillExists.wallHeight, standingWall: wallStillExists };
      }

      if (wallStillExists && char?.climbingModule?.dismountSuppressedUntilRelease) {
        return { surfaceHeight: wallStillExists.wallHeight, standingWall: wallStillExists };
      }

      // Check for contiguous wall platform transition
      let nextSupport: Wall | null = null;
      if (wallStillExists) {
        for (const wall of arena.walls) {
          if (
            arena.areWallsContiguous(wallStillExists, wall) &&
            arena.testWallOverlap(entity.position.x, entity.position.y, supportRadius, wall)
          ) {
            nextSupport = wall;
            break;
          }
        }
      } else {
        // The wall the character was on was deleted: find any other active wall overlapping support zone
        for (const wall of arena.walls) {
          if (arena.testWallOverlap(entity.position.x, entity.position.y, supportRadius, wall)) {
            nextSupport = wall;
            break;
          }
        }
      }

      if (nextSupport) {
        return { surfaceHeight: nextSupport.wallHeight, standingWall: nextSupport };
      }

      // Left the contiguous platform or all supporting walls were deleted: fall into gap!
      entity.isDismountFreefall = true;
      if (char?.climbingModule) {
        char.climbingModule.isDismountFreefall = true;
      }
      return { surfaceHeight: 0, standingWall: null };
    }

    // standingWall not set yet: acquire if resting/falling at wall height and not climbing
    if (
      !isDismountFalling &&
      !entity.isClimbing &&
      entity.verticalVelocity <= 0.5 &&
      (entity.position.z >= arena.wallHeight - 0.05 || (entity.supportingSurfaceHeight ?? 0) >= arena.wallHeight - 0.05)
    ) {
      let wall: Wall | null = null;
      for (const w of arena.walls) {
        if (arena.testWallOverlap(entity.position.x, entity.position.y, supportRadius, w)) {
          wall = w;
          break;
        }
      }
      if (wall) {
        return { surfaceHeight: wall.wallHeight, standingWall: wall };
      }
    }

    return { surfaceHeight: 0, standingWall: null };
  }
}
