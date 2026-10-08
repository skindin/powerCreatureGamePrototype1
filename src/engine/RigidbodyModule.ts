import { DynamicProperty } from "./properties/DynamicProperty.js";

export interface RigidbodyModuleOptions {
  mass?: number | DynamicProperty;
  velocity?: { x: number; y: number };
  hasVerticalVelocity?: boolean;
  verticalVelocity?: number;
  collisionMode?: "discrete" | "continuous" | "dynamic";
  isKinematic?: boolean;
  enabled?: boolean;
}

export class RigidbodyModule {
  public massProp: DynamicProperty;
  public velocity: { x: number; y: number };
  public hasVerticalVelocity: boolean;
  public verticalVelocity: number;
  public collisionMode: "discrete" | "continuous" | "dynamic";
  public isKinematic: boolean;
  public enabled: boolean;

  constructor(options: RigidbodyModuleOptions = {}) {
    if (options.mass instanceof DynamicProperty) {
      this.massProp = options.mass;
    } else {
      this.massProp = new DynamicProperty(options.mass ?? 1.0);
    }
    this.velocity = {
      x: options.velocity?.x ?? 0,
      y: options.velocity?.y ?? 0,
    };
    this.hasVerticalVelocity = options.hasVerticalVelocity !== undefined ? options.hasVerticalVelocity : true;
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.collisionMode = options.collisionMode ?? "dynamic";
    this.isKinematic = options.isKinematic ?? false;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
  }

  public get mass(): number {
    return this.massProp.literalValue;
  }

  public set mass(val: number) {
    this.massProp.literalValue = val;
    this.massProp.notify();
  }
}
