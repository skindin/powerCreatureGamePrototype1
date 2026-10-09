import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";
import type { Vector2D } from "../engine/GameObject.js";
import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

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
   */
  public jumpStrengthProp: DynamicProperty;

  /**
   * Maximum initial takeoff speed cap (in units per second).
   */
  public maxInitialSpeedProp: DynamicProperty;

  constructor(options?: JumpModuleOptions) {
    this.jumpStrengthProp = new DynamicProperty(options?.jumpStrength ?? 18.5);
    this.maxInitialSpeedProp = new DynamicProperty(options?.maxInitialSpeed ?? 9.67);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get jumpStrength(): number {
    return this.jumpStrengthProp.literalValue;
  }

  public set jumpStrength(val: number) {
    this.jumpStrengthProp.literalValue = val;
  }

  public get maxInitialSpeed(): number {
    return this.maxInitialSpeedProp.literalValue;
  }

  public set maxInitialSpeed(val: number) {
    this.maxInitialSpeedProp.literalValue = val;
  }

  public getJumpStrength(registry?: ObjectPropertiesRegistry): number {
    return this.jumpStrengthProp.get(registry);
  }

  public getMaxInitialSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxInitialSpeedProp.get(registry);
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
    const jumpStrength = this.jumpStrengthProp.get(character.properties);
    const maxInitialSpeed = this.maxInitialSpeedProp.get(character.properties);
    const takeoffSpeed = Math.min(maxInitialSpeed, jumpStrength / totalMass);

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
