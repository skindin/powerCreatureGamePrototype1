import type { Character } from "./Character.js";
import { GameObject } from "../engine/GameObject.js";
import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

export interface GrappleModuleOptions {
  grappleReach?: number;
  shoveImpulse?: number;
  breakoutDistanceRatio?: number;
  consumesEnergy?: boolean;
  allowPartialPower?: boolean;
  maxPower?: number;
  enabled?: boolean;
}

/**
 * GrappleModule ("Grapple & Drag Ability")
 * Handles tethering, leashing, and grounded dragging of heavy objects and equal-mass characters
 * without suspending their physical simulation or ground locomotion.
 */
export class GrappleModule {
  public id = "grapple";
  public name = "Grapple & Drag Ability";
  public enabled = true;

  /** Maximum 3D distance at which a grapple can be initiated */
  public grappleReachProp: DynamicProperty;

  /** Physical impulse imparted along the ground when shoving/pushing a grappled entity */
  public shoveImpulseProp: DynamicProperty;

  /** Multiplier on grappleReach before the physical leash snaps from over-extension (default 1.4x) */
  public breakoutDistanceRatioProp: DynamicProperty;

  /** Whether maintaining or initiating a grapple consumes energy from EnergyPool */
  public consumesEnergy: boolean = false;

  /** Whether grapple actions are permitted at partial wattage when energy is low */
  public allowPartialPower: boolean = false;

  /** Maximum wattage capacity for grapple operations */
  public maxPowerProp: DynamicProperty;

  constructor(options?: GrappleModuleOptions) {
    this.grappleReachProp = new DynamicProperty(options?.grappleReach ?? 1.3);
    this.shoveImpulseProp = new DynamicProperty(options?.shoveImpulse ?? 16.0);
    this.breakoutDistanceRatioProp = new DynamicProperty(options?.breakoutDistanceRatio ?? 1.4);
    this.maxPowerProp = new DynamicProperty(options?.maxPower ?? 250.0);

    if (options?.consumesEnergy !== undefined) this.consumesEnergy = options.consumesEnergy;
    if (options?.allowPartialPower !== undefined) this.allowPartialPower = options.allowPartialPower;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get grappleReach(): number {
    return this.grappleReachProp.literalValue;
  }
  public set grappleReach(val: number) {
    this.grappleReachProp.literalValue = val;
  }
  public getGrappleReach(registry?: ObjectPropertiesRegistry): number {
    return this.grappleReachProp.get(registry);
  }

  public get shoveImpulse(): number {
    return this.shoveImpulseProp.literalValue;
  }
  public set shoveImpulse(val: number) {
    this.shoveImpulseProp.literalValue = val;
  }
  public getShoveImpulse(registry?: ObjectPropertiesRegistry): number {
    return this.shoveImpulseProp.get(registry);
  }

  public get breakoutDistanceRatio(): number {
    return this.breakoutDistanceRatioProp.literalValue;
  }
  public set breakoutDistanceRatio(val: number) {
    this.breakoutDistanceRatioProp.literalValue = val;
  }
  public getBreakoutDistanceRatio(registry?: ObjectPropertiesRegistry): number {
    return this.breakoutDistanceRatioProp.get(registry);
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

  /**
   * Tests if the candidate object or character is physically within 3D reach of the character
   */
  public isTargetInReach(
    character: Character,
    target: GameObject,
    wallHeight: number = 1.0
  ): boolean {
    if (!this.enabled || target === character || target.isHeld) return false;
    if (target.lastThrower === character) return false;

    const charZ = Math.max(
      character.position.z,
      character.supportingSurfaceHeight ?? 0,
      character.standingWall ? wallHeight : 0
    );
    const targetZ = Math.max(
      target.position.z,
      target.supportingSurfaceHeight ?? 0,
      target.standingWall ? wallHeight : 0
    );

    const dx = target.position.x - character.position.x;
    const dy = target.position.y - character.position.y;
    const dz = targetZ - charZ;
    const dist3D = Math.hypot(dx, dy, dz);

    const reach = this.grappleReachProp.get(character.properties);
    return dist3D <= reach;
  }

  /**
   * Finds the best candidate in reach closest to the aim location
   */
  public findTargetObject(
    character: Character,
    targetX: number,
    targetY: number,
    objects: GameObject[],
    wallHeight: number = 1.0,
    maxSelectDistance: number = Infinity
  ): GameObject | null {
    if (!this.enabled) return null;

    let bestCandidate: GameObject | null = null;
    let shortestDist = Infinity;

    for (const obj of objects) {
      if (obj === character || obj === character.heldObject || obj.isHeld) continue;
      if (!this.isTargetInReach(character, obj, wallHeight)) continue;

      const distToAim = Math.hypot(obj.position.x - targetX, obj.position.y - targetY);
      if (distToAim <= maxSelectDistance && distToAim < shortestDist) {
        shortestDist = distToAim;
        bestCandidate = obj;
      }
    }

    return bestCandidate;
  }

  /**
   * Establishes a grounded tether/grapple with target
   */
  public grapple(character: Character, target: GameObject): boolean {
    if (!this.enabled) return false;
    if (character.heldObject || (character as any).grappledTarget) return false;

    // Wake target up
    target.wakeUp();

    (character as any).grappledTarget = target;
    (target as any).grappledBy = character;

    // Zero out flight states
    target.isInFlight = false;
    target.lastThrower = null;
    return true;
  }

  /**
   * Releases current tether/grapple
   */
  public release(character: Character): GameObject | null {
    const target = (character as any).grappledTarget as GameObject | null;
    if (!target) return null;

    (character as any).grappledTarget = null;
    if ((target as any).grappledBy === character) {
      (target as any).grappledBy = null;
    }
    return target;
  }
}
