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
  public jump(character: Character, _arena?: Arena, movementInput?: Vector2D): boolean {
    if (!this.enabled || !character.hasVerticalPosition) return false;

    // Must be resting on a surface (ground or wall top) or close enough with near-zero vertical velocity
    const surfaceZ = character.supportingSurfaceHeight ?? 0;
    const isGrounded = character.isRestingOnSurface ||
      (Math.abs(character.position.z - surfaceZ) <= 0.08 && Math.abs(character.verticalVelocity) <= 0.8);

    if (!isGrounded) {
      return false;
    }

    // Effective mass scales takeoff velocity: heavier load = lower jump
    const totalMass = Math.max(0.2, character.mass + character.carriedMass);
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

    // Directional impulse: if walking holding a direction key (e.g. against a wall or wall assist),
    // give the character one physics step of velocity in that direction so they go from no motion to some motion to get over the obstacle
    const move = movementInput ?? character.movementInput;
    const moveX = move?.x ?? 0;
    const moveY = move?.y ?? 0;
    const inputMag = Math.hypot(moveX, moveY);

    if (inputMag > 0.05) {
      const dirX = moveX / inputMag;
      const dirY = moveY / inputMag;

      const effectiveWalkForce = character.isSprinting
        ? (character.walkingModule?.maxWalkForce ?? 35.0) * 1.5
        : (character.walkingModule?.maxWalkForce ?? 35.0);
      const strength = character.strengthModule?.strength ?? character.strength ?? 1.0;
      const grip = 1.0;
      const maxAccel = ((effectiveWalkForce * strength) / totalMass) * grip;
      const dt = 1 / 60;
      const oneStepVelocity = maxAccel * dt;

      const currentSpeedInDir = character.velocity.x * dirX + character.velocity.y * dirY;
      if (currentSpeedInDir < oneStepVelocity) {
        const boost = oneStepVelocity - Math.max(0, currentSpeedInDir);
        character.velocity.x += dirX * boost;
        character.velocity.y += dirY * boost;
      }
    }

    return true;
  }
}
