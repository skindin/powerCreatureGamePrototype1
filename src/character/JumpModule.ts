import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";

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
   * Default 11.4 N·s gives initial takeoff velocity v_z = 11.4 / 1.2 = 9.5 u/s for a standard 1.2kg character,
   * reaching a peak ballistic height of ~1.5 units under gravity 30.0 u/s^2.
   */
  public jumpStrength = 11.6;

  /**
   * Maximum initial takeoff speed cap (in units per second).
   */
  public maxInitialSpeed = 15.0;

  constructor(options?: JumpModuleOptions) {
    if (options?.jumpStrength !== undefined) this.jumpStrength = options.jumpStrength;
    if (options?.maxInitialSpeed !== undefined) this.maxInitialSpeed = options.maxInitialSpeed;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  /**
   * Attempts to jump from the current supporting surface (ground or wall top).
   * Returns true if jump was initiated, false otherwise.
   */
  public jump(character: Character, _arena?: Arena): boolean {
    if (!this.enabled || !character.hasVerticalPosition) return false;

    // Must be resting on a surface (ground or wall top) or close enough with near-zero vertical velocity
    const surfaceZ = character.supportingSurfaceHeight ?? 0;
    const isGrounded = character.isRestingOnSurface ||
      (Math.abs(character.position.z - surfaceZ) <= 0.08 && Math.abs(character.verticalVelocity) <= 0.8);

    if (!isGrounded) {
      return false;
    }

    // Effective mass scales takeoff velocity: heavier load = lower jump
    const effectiveMass = Math.max(0.2, character.mass);
    const takeoffSpeed = Math.min(this.maxInitialSpeed, this.jumpStrength / effectiveMass);

    if (takeoffSpeed <= 0.01) return false;

    character.verticalVelocity = takeoffSpeed;
    character.position.z = Math.max(character.position.z, surfaceZ + 0.02);

    // If standing on a wall, clear standingWall so airborne physics takes over naturally
    if (character.standingWall) {
      character.standingWall = null;
    }

    return true;
  }
}
