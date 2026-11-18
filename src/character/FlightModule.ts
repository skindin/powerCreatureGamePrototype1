import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

export interface FlightModuleOptions {
  maxPower?: number;
  maxHorizontalSpeed?: number;
  maxAscentSpeed?: number;
  maxSinkSpeed?: number;
  maxFlightAltitude?: number;
  groundAnchorRange?: number;
  stability?: number;
  consumesEnergy?: boolean;
  allowPartialPower?: boolean;
  enabled?: boolean;
}

/**
 * FlightModule ("Telekinetic & Aerodynamic Flight")
 *
 * Allows a character to levitate, hover against gravity in uncurved space, ascend/descend,
 * and fly horizontally by combining:
 * 1. Energy-Free Relative Momentum Transfer / Redirection (ΔK <= 0):
 *    Requires actual non-zero velocity; brakes excess speed into the ground anchor or
 *    elastically redirects existing downward fall velocity into horizontal glide velocity for 0 W.
 * 2. Active Momentum Creation (ΔK > 0):
 *    Spends metabolic power from EnergyPool (capped by maxPowerProp) to create new momentum
 *    toward the desired 3D velocity and counter gravity via the Equivalence Principle (0.5 * m * g^2).
 */
export class FlightModule {
  public id = "flight";
  public name = "Flight & Hover";
  public enabled = true;

  /** Maximum metabolic power capacity (Watts) for active flight thrust and hovering */
  public maxPowerProp: DynamicProperty;

  /** Maximum horizontal flight speed (u/s) */
  public maxHorizontalSpeedProp: DynamicProperty;

  /** Maximum upward ascent speed (u/s) */
  public maxAscentSpeedProp: DynamicProperty;

  /** Maximum downward controlled sink speed (u/s) */
  public maxSinkSpeedProp: DynamicProperty;

  /** Maximum target flight altitude (u) */
  public maxFlightAltitudeProp: DynamicProperty;

  /** Maximum height above a supporting surface within which ground-anchored momentum transfer is active (u) */
  public groundAnchorRangeProp: DynamicProperty;

  /**
   * Telekinetic flight stability [0.0, 1.0]:
   * 1.0 = rock-solid hover and trajectory lock.
   * < 1.0 = introduces smooth multi-frequency harmonic oscillation proportional to (1 - stability).
   */
  public stabilityProp: DynamicProperty;

  /** Whether active momentum creation and hovering consume energy from EnergyPool */
  public consumesEnergy: boolean = true;

  /**
   * When true, the character will still attempt to fly using whatever partial power is available
   * (scaling created acceleration by sqrt(P_granted / P_demanded)) even if they cannot afford the full desired velocity.
   */
  public allowPartialPower: boolean = true;

  /** Internal harmonic phase accumulator for stability wobble */
  public oscillationPhase: number = 0;

  constructor(options?: FlightModuleOptions) {
    this.maxPowerProp = new DynamicProperty(options?.maxPower ?? 3000.0);
    this.maxHorizontalSpeedProp = new DynamicProperty(options?.maxHorizontalSpeed ?? 7.5);
    this.maxAscentSpeedProp = new DynamicProperty(options?.maxAscentSpeed ?? 5.0);
    this.maxSinkSpeedProp = new DynamicProperty(options?.maxSinkSpeed ?? 2.0);
    this.maxFlightAltitudeProp = new DynamicProperty(options?.maxFlightAltitude ?? 4.5);
    this.groundAnchorRangeProp = new DynamicProperty(options?.groundAnchorRange ?? 5.0);
    this.stabilityProp = new DynamicProperty(options?.stability ?? 0.85);

    this.consumesEnergy = options?.consumesEnergy ?? true;
    this.allowPartialPower = options?.allowPartialPower ?? true;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public registerProperties(registry: ObjectPropertiesRegistry): void {
    registry.add("flightMaxPower", this.maxPowerProp.literalValue);
    registry.add("flightMaxHorizontalSpeed", this.maxHorizontalSpeedProp.literalValue);
    registry.add("flightMaxAscentSpeed", this.maxAscentSpeedProp.literalValue);
    registry.add("flightMaxSinkSpeed", this.maxSinkSpeedProp.literalValue);
    registry.add("flightMaxAltitude", this.maxFlightAltitudeProp.literalValue);
    registry.add("flightGroundAnchorRange", this.groundAnchorRangeProp.literalValue);
    registry.add("flightStability", this.stabilityProp.literalValue);
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

  public get maxHorizontalSpeed(): number {
    return this.maxHorizontalSpeedProp.literalValue;
  }
  public set maxHorizontalSpeed(val: number) {
    this.maxHorizontalSpeedProp.literalValue = val;
  }
  public getMaxHorizontalSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxHorizontalSpeedProp.get(registry);
  }

  public get maxAscentSpeed(): number {
    return this.maxAscentSpeedProp.literalValue;
  }
  public set maxAscentSpeed(val: number) {
    this.maxAscentSpeedProp.literalValue = val;
  }
  public getMaxAscentSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxAscentSpeedProp.get(registry);
  }

  public get maxSinkSpeed(): number {
    return this.maxSinkSpeedProp.literalValue;
  }
  public set maxSinkSpeed(val: number) {
    this.maxSinkSpeedProp.literalValue = val;
  }
  public getMaxSinkSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxSinkSpeedProp.get(registry);
  }

  public get maxFlightAltitude(): number {
    return this.maxFlightAltitudeProp.literalValue;
  }
  public set maxFlightAltitude(val: number) {
    this.maxFlightAltitudeProp.literalValue = val;
  }
  public getMaxFlightAltitude(registry?: ObjectPropertiesRegistry): number {
    return this.maxFlightAltitudeProp.get(registry);
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
}
