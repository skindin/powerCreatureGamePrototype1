/**
 * LocomotionStanceModule — Entity Locomotion Mode & Stance State Manager
 * 
 * Supports dynamic switching between locomotion modes (e.g. "walk", "roll", "fly")
 * for versatile entities (such as a ball switching to walking, or humanoid morphing).
 */

export type LocomotionMode = "walk" | "roll" | "fly";

export interface LocomotionStanceModuleOptions {
  activeMode?: LocomotionMode;
  supportedModes?: LocomotionMode[];
  enabled?: boolean;
  canWalkWhileRolling?: boolean;
}

export class LocomotionStanceModule {
  public enabled: boolean = true;
  public activeMode: LocomotionMode = "walk";
  public supportedModes: LocomotionMode[] = ["walk", "roll"];
  /**
   * Whether the character is permitted to walk while actively rolling.
   * Off by default: when off, walking cannot engage while the creature is rolling/gliding with momentum.
   */
  public canWalkWhileRolling: boolean = false;

  constructor(options?: LocomotionStanceModuleOptions) {
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.activeMode) this.activeMode = options.activeMode;
    if (options?.supportedModes) this.supportedModes = [...options.supportedModes];
    if (options?.canWalkWhileRolling !== undefined) this.canWalkWhileRolling = options.canWalkWhileRolling;
  }

  /**
   * Sets the active locomotion mode.
   */
  public setMode(mode: LocomotionMode): boolean {
    if (!this.supportedModes.includes(mode)) {
      this.supportedModes.push(mode);
    }
    this.activeMode = mode;
    return true;
  }

  /**
   * Cycles to the next available supported mode.
   */
  public cycleMode(): LocomotionMode {
    if (this.supportedModes.length <= 1) return this.activeMode;
    const curIdx = this.supportedModes.indexOf(this.activeMode);
    const nextIdx = (curIdx + 1) % this.supportedModes.length;
    this.activeMode = this.supportedModes[nextIdx];
    return this.activeMode;
  }
}

