import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { Character } from "./Character.js";
import type { GameObject } from "../engine/GameObject.js";

export interface TelekinesisModuleOptions {
  maxPower?: number;
  telekinesisReach?: number;
  maxMoveSpeed?: number;
  holdHoverHeight?: number;
  groundAnchorRange?: number;
  stability?: number;
  consumesEnergy?: boolean;
  allowPartialPower?: boolean;
  enabled?: boolean;
}

/**
 * TelekinesisModule ("Psychokinetic Manipulation")
 *
 * Allows a character to remotely grab, levitate, move, and throw objects/entities at range,
 * as well as fire held guns remotely from their floating 3D positions.
 *
 * Uses the same minimum-energy physics law as FlightModule:
 * 1. Energy-Free Relative Momentum Transfer / Braking (ΔK_rel <= 0, 0 W):
 *    Brakes moving objects or transfers unwanted equal-and-opposite reaction into the ground
 *    anchor (when within groundAnchorRange) for 0 extra energy.
 * 2. Active Momentum Creation (ΔK_rel > 0, Costs Energy, Capped by maxPowerProp):
 *    Levitates and accelerates the target using Equivalence-Principle work, applying aligned
 *    recoil to the character (or full two-body recoil when unanchored in mid-air).
 */
export class TelekinesisModule {
  public id = "telekinesis";
  public name = "Telekinesis & Remote Grab";
  public enabled = true;

  /** Maximum metabolic power capacity (Watts) for telekinetic levitation, acceleration, and throws */
  public maxPowerProp: DynamicProperty;

  /** Maximum 3D range (u) to initiate and maintain a telekinetic grab */
  public telekinesisReachProp: DynamicProperty;

  /** Maximum speed (u/s) at which a telekinetically held object is tracked toward the cursor */
  public maxMoveSpeedProp: DynamicProperty;

  /** Default hover elevation offset (u) above supporting surface when levitating targets */
  public holdHoverHeightProp: DynamicProperty;

  /** Maximum height above a supporting surface where unwanted reaction impulse can brace into the ground (u) */
  public groundAnchorRangeProp: DynamicProperty;

  /**
   * Telekinetic hold stability [0.0, 1.0]:
   * 1.0 = steady cursor lock with zero tremor.
   * < 1.0 = introduces smooth multi-frequency harmonic oscillation to the target hold point.
   */
  public stabilityProp: DynamicProperty;

  /** Whether telekinetic levitation and acceleration consume energy from EnergyPool */
  public consumesEnergy: boolean = true;

  /** Whether telekinesis still operates at scaled force when power-capped or energy is low */
  public allowPartialPower: boolean = true;

  /** Internal harmonic phase accumulator for stability wobble */
  public oscillationPhase: number = 0;

  /** Target mean hover elevation (world Z) maintained during movement unless adjusted via Elevation Control Mode */
  public targetHoldZ: number | null = null;

  /** When true, vertical levitation is intentionally switched off (0 W) so gravity rests the object on the surface while horizontal TK control stays active */
  public isGroundedHold: boolean = false;

  /** Current zero-cost stability wave position & velocity offsets (excluded from power demand calculation) */
  public appliedWaveOffsetX: number = 0;
  public appliedWaveOffsetY: number = 0;
  public appliedWaveOffsetZ: number = 0;
  public appliedWaveVx: number = 0;
  public appliedWaveVy: number = 0;
  public appliedWaveVz: number = 0;

  constructor(options?: TelekinesisModuleOptions) {
    this.maxPowerProp = new DynamicProperty(options?.maxPower ?? 2400.0);
    this.telekinesisReachProp = new DynamicProperty(options?.telekinesisReach ?? 6.5);
    this.maxMoveSpeedProp = new DynamicProperty(options?.maxMoveSpeed ?? 12.0);
    this.holdHoverHeightProp = new DynamicProperty(options?.holdHoverHeight ?? 0.65);
    this.groundAnchorRangeProp = new DynamicProperty(options?.groundAnchorRange ?? 5.0);
    this.stabilityProp = new DynamicProperty(options?.stability ?? 0.85);

    this.consumesEnergy = options?.consumesEnergy ?? true;
    this.allowPartialPower = options?.allowPartialPower ?? true;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public registerProperties(registry: ObjectPropertiesRegistry): void {
    registry.add("telekinesisMaxPower", this.maxPowerProp.literalValue);
    registry.add("telekinesisReach", this.telekinesisReachProp.literalValue);
    registry.add("telekinesisMaxMoveSpeed", this.maxMoveSpeedProp.literalValue);
    registry.add("telekinesisHoverHeight", this.holdHoverHeightProp.literalValue);
    registry.add("telekinesisGroundAnchorRange", this.groundAnchorRangeProp.literalValue);
    registry.add("telekinesisStability", this.stabilityProp.literalValue);
  }

  public get maxPower(): number {
    return this.maxPowerProp.literalValue;
  }
  public set maxPower(val: number) {
    this.maxPowerProp.literalValue = val;
  }
  public getMaxPower(registry?: ObjectPropertiesRegistry): number {
    return this.maxPowerProp.get(registry);
  }

  public get telekinesisReach(): number {
    return this.telekinesisReachProp.literalValue;
  }
  public set telekinesisReach(val: number) {
    this.telekinesisReachProp.literalValue = val;
  }
  public getTelekinesisReach(registry?: ObjectPropertiesRegistry): number {
    return this.telekinesisReachProp.get(registry);
  }

  public get maxMoveSpeed(): number {
    return this.maxMoveSpeedProp.literalValue;
  }
  public set maxMoveSpeed(val: number) {
    this.maxMoveSpeedProp.literalValue = val;
  }
  public getMaxMoveSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxMoveSpeedProp.get(registry);
  }

  public get holdHoverHeight(): number {
    return this.holdHoverHeightProp.literalValue;
  }
  public set holdHoverHeight(val: number) {
    this.holdHoverHeightProp.literalValue = val;
  }
  public getHoldHoverHeight(registry?: ObjectPropertiesRegistry): number {
    return this.holdHoverHeightProp.get(registry);
  }

  public get groundAnchorRange(): number {
    return this.groundAnchorRangeProp.literalValue;
  }
  public set groundAnchorRange(val: number) {
    this.groundAnchorRangeProp.literalValue = val;
  }
  public getGroundAnchorRange(registry?: ObjectPropertiesRegistry): number {
    return this.groundAnchorRangeProp.get(registry);
  }

  public get stability(): number {
    return this.stabilityProp.literalValue;
  }
  public set stability(val: number) {
    this.stabilityProp.literalValue = Math.max(0, Math.min(1, val));
  }
  public getStability(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0, Math.min(1, this.stabilityProp.get(registry)));
  }

  public grab(character: Character, target: GameObject): boolean {
    if (!this.enabled || !target || target === character || target.isHeld || target.isImmovable) {
      return false;
    }
    if (this.consumesEnergy && character.energyPool && character.energyPool.enabled && !character.energyPool.infiniteEnergy) {
      const reg = character.properties;
      if (
        character.energyPool.isExhausted ||
        character.energyPool.getCurrentEnergy(reg) <= 0.0001 ||
        character.energyPool.getCurrentStamina(reg) <= 0.0001
      ) {
        character.energyPool.notifyInsufficientEnergy({
          abilityId: "telekinesis",
          demandedAmount: Math.max(50, this.getMaxPower(reg)),
          isBurst: false,
          unit: "W/s",
          registry: reg,
        });
        return false;
      }
    }
    if (character.telekineticTarget && character.telekineticTarget !== target) {
      this.release(character);
    }
    target.wakeUp();
    target.isInFlight = false;
    target.knockbackUntilTime = 0;
    target.lastThrower = null;
    target.originalThrower = null;
    character.telekineticTarget = target;
    character.telekinesisModule = this;
    (target as any).telekinesedBy = character;
    return true;
  }

  public release(character: Character): GameObject | null {
    const target = character.telekineticTarget;
    if (!target) return null;
    this.targetHoldZ = null;
    this.isGroundedHold = false;
    character.telekineticTarget = null;
    character.isTelekineticObjectControl = false;
    character.telekineticFrozenPos = null;
    character.activeTrajectory = null;
    character.isThrowCancelZone = false;
    if ((target as any).telekinesedBy === character) {
      (target as any).telekinesedBy = null;
    }
    if ((target as any).facingAngle !== undefined) {
      delete (target as any).facingAngle;
    }
    return target;
  }
}
