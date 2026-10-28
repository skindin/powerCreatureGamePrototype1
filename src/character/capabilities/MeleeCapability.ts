import type { Character } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { MeleeHitResult } from "../MeleeModule.js";

/**
 * Isolated 1-to-1 capability slice for Burst Melee Attacks.
 * Encapsulates directional punch normalization, candidate selection, and callback notification.
 */
export class MeleeCapability {
  public static executeMelee(
    char: Character,
    arena: Arena,
    potentialTargets: GameObject[],
    dirX?: number,
    dirY?: number
  ): MeleeHitResult | null {
    if (!char.meleeModule || !char.meleeModule.enabled) return null;
    const dx = dirX !== undefined ? dirX : Math.cos(char.facingAngle ?? 0);
    const dy = dirY !== undefined ? dirY : Math.sin(char.facingAngle ?? 0);
    return char.meleeModule.executePunch(char, dx, dy, potentialTargets, arena);
  }

  public static actuate(char: Character, arena: Arena): void {
    if (char.meleeModule && char.meleeModule.enabled && char.isMeleeRequested) {
      const candidates = char.meleeCandidateEntities ?? arena.entities;
      const dirX = char.meleeAimDir ? char.meleeAimDir.x : Math.cos(char.facingAngle ?? 0);
      const dirY = char.meleeAimDir ? char.meleeAimDir.y : Math.sin(char.facingAngle ?? 0);
      const mag = Math.hypot(dirX, dirY);
      const normDirX = mag > 0.001 ? dirX / mag : Math.cos(char.facingAngle ?? 0);
      const normDirY = mag > 0.001 ? dirY / mag : Math.sin(char.facingAngle ?? 0);
      const hitResult = char.meleeModule.executePunch(char, normDirX, normDirY, candidates, arena);
      if (hitResult && char.onPunchExecuted) {
        char.onPunchExecuted(hitResult, normDirX, normDirY);
      }
    }
  }
}

