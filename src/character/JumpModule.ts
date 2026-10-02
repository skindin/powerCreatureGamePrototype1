import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";
import type { Vector2D } from "../engine/GameObject.js";

export interface JumpModuleOptions {
  jumpStrength?: number;
  maxInitialSpeed?: number;
  enabled?: boolean;
}

export class JumpModule {
  public id = "jump";
  public name = "Jump Ability";
  public enabled = true;

  /**
   * Jump strength (impulse in N·s).
   * Default 18.5 N·s provides enough propulsion to achieve the max takeoff speed (~9.67 u/s, 1.5 units height)
   * both unencumbered (1.2kg) and when holding the Light Blue Box (0.7kg, total 1.9kg).
   * When carrying the Heavy Red Box (2.6kg, total 3.8kg), takeoff speed drops to ~4.87 u/s (~0.39 units height).
   */
  public jumpStrength = 18.5;

  /**
   * Maximum initial takeoff speed cap (in units per second).
   * 9.67 u/s achieves a peak ballistic jump height of ~1.5 units under gravity 30.0 u/s^2.
   */
  public maxInitialSpeed = 9.67;

  constructor(options?: JumpModuleOptions) {
    if (options?.jumpStrength !== undefined) this.jumpStrength = options.jumpStrength;
    if (options?.maxInitialSpeed !== undefined) this.maxInitialSpeed = options.maxInitialSpeed;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  /**
   * Attempts to jump from the current supporting surface (ground or wall top).
   * Returns true if jump was initiated, false otherwise.
   */
  public jump(character: Character, _arena?: Arena, _movementInput?: Vector2D): boolean {
    if (!this.enabled || !character.hasVerticalPosition) return false;
    if (character.isHeld) return false;

    // Must be resting on a surface (ground or wall top) or close enough with near-zero vertical velocity
    const surfaceZ = character.supportingSurfaceHeight ?? 0;
    const isGrounded = character.isRestingOnSurface ||
      (Math.abs(character.position.z - surfaceZ) <= 0.08 && Math.abs(character.verticalVelocity) <= 0.8);

    if (!isGrounded) {
      return false;
    }

    // Effective mass scales takeoff velocity: heavier load = lower jump (character.mass includes carriedMass)
    const totalMass = Math.max(0.2, character.mass);
    const takeoffSpeed = Math.min(this.maxInitialSpeed, this.jumpStrength / totalMass);

    if (takeoffSpeed <= 0.01) return false;

    character.verticalVelocity = takeoffSpeed;
    character.position.z = Math.max(character.position.z, surfaceZ + 0.02);

    // If standing on a wall, clear standingWall so airborne physics takes over naturally
    if (character.standingWall) {
      character.standingWall = null;
    }

    // Disarm wall edge assist clamp so character can jump off ledges without being clamped in mid-air
    if (character.wallEdgeAssistModule) {
      character.wallEdgeAssistModule.isAssistClampArmed = false;
      character.wallEdgeAssistModule.hasLeftClampZoneSinceDismount = true;
    }

    return true;
  }
}
