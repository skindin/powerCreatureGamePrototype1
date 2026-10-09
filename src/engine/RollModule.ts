import { Vector3D } from "./GameObject.js";
import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";

export class RollModule {
  public enabled: boolean = true;

  /** Dynamic angular velocity in 3 dimensions (rad/s around X, Y, Z axes) */
  public angularVelocity: Vector3D = { x: 0, y: 0, z: 0 };

  /**
   * Roll resistance property: deceleration force (in u/s²) that opposes rolling.
   * If rollResistance === 0, the object has zero rolling resistance and will roll until it hits a wall!
   */
  public rollResistanceProp: DynamicProperty;

  /** Animated phase accumulator (radians) used for rendering the rotating dotted oval */
  public visualPhase: number = 0;

  constructor(options: {
    enabled?: boolean;
    angularVelocity?: Partial<Vector3D>;
    rollResistance?: number;
  } = {}) {
    this.enabled = options.enabled ?? true;
    this.angularVelocity = {
      x: options.angularVelocity?.x ?? 0,
      y: options.angularVelocity?.y ?? 0,
      z: options.angularVelocity?.z ?? 0,
    };
    this.rollResistanceProp = new DynamicProperty(options.rollResistance ?? 0.4);
  }

  public get rollResistance(): number {
    return this.rollResistanceProp.literalValue;
  }

  public set rollResistance(val: number) {
    this.rollResistanceProp.literalValue = val;
  }

  public getRollResistance(registry?: ObjectPropertiesRegistry): number {
    return this.rollResistanceProp.get(registry);
  }

  /**
   * Total magnitude of 3D angular velocity (|ω| in rad/s)
   */
  public get angularSpeed(): number {
    return Math.hypot(this.angularVelocity.x, this.angularVelocity.y, this.angularVelocity.z);
  }

  /**
   * Advance the visual rotation phase based on current angular velocity
   */
  public updateVisualPhase(dt: number): void {
    const speed = this.angularSpeed;
    if (speed > 0.001) {
      this.visualPhase = (this.visualPhase + speed * dt) % (Math.PI * 2);
    }
  }
}
