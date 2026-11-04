import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

export interface RollMovementModuleOptions {
  baseAcceleration?: number;
  sprintAcceleration?: number;
  maxRollSpeed?: number;
  maxSprintSpeed?: number;
  brakeDeceleration?: number;
  maxRollPower?: number;
  maxSprintPower?: number;
  maxBrakePower?: number;
  rollConsumesEnergy?: boolean;
  rollAllowPartialPower?: boolean;
  sprintConsumesEnergy?: boolean;
  sprintAllowPartialPower?: boolean;
  brakeConsumesEnergy?: boolean;
  brakeAllowPartialPower?: boolean;
  enabled?: boolean;
}

/**
 * RollMovementModule: Movement drive capability for rolling creatures (like Speed Ball).
 * Rather than walking with foot friction, the creature exerts rotational torque
 * in the intended movement direction. When input ceases, it continues rolling freely
 * until active braking is applied.
 */
export class RollMovementModule {
  public enabled: boolean = true;

  // Linear acceleration from movement input (u/s²)
  public baseAccelerationProp: DynamicProperty;
  public sprintAccelerationProp: DynamicProperty;

  // Maximum linear rolling speed bounds (u/s)
  public maxRollSpeedProp: DynamicProperty;
  public maxSprintSpeedProp: DynamicProperty;

  // Active braking deceleration rate (u/s²) opposing current velocity
  public brakeDecelerationProp: DynamicProperty;

  // Maximum continuous power capacity sockets (Watts)
  public maxRollPowerProp: DynamicProperty;
  public maxSprintPowerProp: DynamicProperty;
  public maxBrakePowerProp: DynamicProperty;

  // Energy rationing flags
  public rollConsumesEnergy: boolean = true;
  public rollAllowPartialPower: boolean = true;
  public sprintConsumesEnergy: boolean = true;
  public sprintAllowPartialPower: boolean = true;
  public brakeConsumesEnergy: boolean = false;
  public brakeAllowPartialPower: boolean = true;

  // Live state flags
  public isRolling: boolean = false;
  public isSprinting: boolean = false;
  public isBraking: boolean = false;

  constructor(options?: RollMovementModuleOptions) {
    this.enabled = options?.enabled ?? true;

    this.baseAccelerationProp = new DynamicProperty(options?.baseAcceleration ?? 22.0);
    this.sprintAccelerationProp = new DynamicProperty(options?.sprintAcceleration ?? 45.0);

    this.maxRollSpeedProp = new DynamicProperty(options?.maxRollSpeed ?? 18.0);
    this.maxSprintSpeedProp = new DynamicProperty(options?.maxSprintSpeed ?? 32.0);

    this.brakeDecelerationProp = new DynamicProperty(options?.brakeDeceleration ?? 55.0);

    this.maxRollPowerProp = new DynamicProperty(options?.maxRollPower ?? 800.0);
    this.maxSprintPowerProp = new DynamicProperty(options?.maxSprintPower ?? 1800.0);
    this.maxBrakePowerProp = new DynamicProperty(options?.maxBrakePower ?? 400.0);

    this.rollConsumesEnergy = options?.rollConsumesEnergy ?? true;
    this.rollAllowPartialPower = options?.rollAllowPartialPower ?? true;
    this.sprintConsumesEnergy = options?.sprintConsumesEnergy ?? true;
    this.sprintAllowPartialPower = options?.sprintAllowPartialPower ?? true;
    this.brakeConsumesEnergy = options?.brakeConsumesEnergy ?? false;
    this.brakeAllowPartialPower = options?.brakeAllowPartialPower ?? true;
  }

  public registerProperties(registry: ObjectPropertiesRegistry): void {
    registry.add("rollBaseAcceleration", this.baseAccelerationProp.literalValue);
    registry.add("rollSprintAcceleration", this.sprintAccelerationProp.literalValue);
    registry.add("maxRollSpeed", this.maxRollSpeedProp.literalValue);
    registry.add("maxSprintRollSpeed", this.maxSprintSpeedProp.literalValue);
    registry.add("rollBrakeDeceleration", this.brakeDecelerationProp.literalValue);
    registry.add("maxRollPower", this.maxRollPowerProp.literalValue);
    registry.add("maxSprintRollPower", this.maxSprintPowerProp.literalValue);
    registry.add("maxBrakePower", this.maxBrakePowerProp.literalValue);
  }

  // Getters and Setters
  public get baseAcceleration(): number {
    return this.baseAccelerationProp.literalValue;
  }
  public set baseAcceleration(val: number) {
    this.baseAccelerationProp.literalValue = val;
  }

  public get sprintAcceleration(): number {
    return this.sprintAccelerationProp.literalValue;
  }
  public set sprintAcceleration(val: number) {
    this.sprintAccelerationProp.literalValue = val;
  }

  public get maxRollSpeed(): number {
    return this.maxRollSpeedProp.literalValue;
  }
  public set maxRollSpeed(val: number) {
    this.maxRollSpeedProp.literalValue = val;
  }

  public get maxSprintSpeed(): number {
    return this.maxSprintSpeedProp.literalValue;
  }
  public set maxSprintSpeed(val: number) {
    this.maxSprintSpeedProp.literalValue = val;
  }

  public get brakeDeceleration(): number {
    return this.brakeDecelerationProp.literalValue;
  }
  public set brakeDeceleration(val: number) {
    this.brakeDecelerationProp.literalValue = val;
  }

  public get maxRollPower(): number {
    return this.maxRollPowerProp.literalValue;
  }
  public set maxRollPower(val: number) {
    this.maxRollPowerProp.literalValue = val;
  }

  public get maxSprintPower(): number {
    return this.maxSprintPowerProp.literalValue;
  }
  public set maxSprintPower(val: number) {
    this.maxSprintPowerProp.literalValue = val;
  }

  public get maxBrakePower(): number {
    return this.maxBrakePowerProp.literalValue;
  }
  public set maxBrakePower(val: number) {
    this.maxBrakePowerProp.literalValue = val;
  }
}
