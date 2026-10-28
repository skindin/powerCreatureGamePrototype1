import type { Character } from "../Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated 1-to-1 capability slice for Vertical Wall Climbing.
 * Encapsulates isometric holding power, ascent wattage demand, and delegation
 * to ClimbingModule without touching Tier 2 ClimbingModule.ts.
 */
export class ClimbingCapability {
  public static canClimb(char: Character): boolean {
    return Boolean(
      char.climbingModule &&
      char.climbingModule.enabled &&
      char.hasVerticalPosition &&
      char.hasStrength
    );
  }

  public static registerDemand(char: Character, isClimbInput: boolean, arena: Arena): boolean {
    const canClimb = ClimbingCapability.canClimb(char);
    if (canClimb && char.isClimbing && char.climbingModule?.consumesEnergy && char.energyPool) {
      const totalMass = char.mass;
      const g = arena.gravity || 9.81;
      const isometricHoldingWatts = (totalMass * g * 0.35) / 0.25;
      const maxAscentSpeed = char.climbingModule.maxClimbSpeedProp.get(char.properties);
      const ascentWatts = isClimbInput ? (totalMass * g * maxAscentSpeed) / 0.25 : 0;
      const rawClimbWatts = isometricHoldingWatts + ascentWatts;
      const climbCap = char.climbingModule.maxPowerProp.get(char.properties);
      let climbWatts = rawClimbWatts;
      if (climbWatts > climbCap) {
        climbWatts = char.climbingModule.allowPartialPower ? climbCap : 0;
      }
      char.energyPool.registerDemand("climb", climbWatts, char.climbingModule.allowPartialPower);
    }
    return canClimb;
  }

  public static actuate(
    char: Character,
    canClimb: boolean,
    movementInput: Vector2D,
    isClimbInput: boolean,
    dt: number,
    arena: Arena
  ): void {
    if (canClimb && char.climbingModule) {
      char.climbingModule.update(char, movementInput, isClimbInput, dt, arena);
    } else if (char.isClimbing) {
      char.isClimbing = false;
    }
  }
}
