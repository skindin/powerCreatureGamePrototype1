import { DynamicProperty } from "../engine/properties/DynamicProperty.js";

export class StrengthModule {
  public id = "strength";
  public name = "Strength Module";
  public enabled = true;

  // Dynamic property socket for strength
  public strengthProp: DynamicProperty;

  constructor(options: { strength?: number | DynamicProperty; enabled?: boolean } = {}) {
    if (options.strength instanceof DynamicProperty) {
      this.strengthProp = options.strength;
    } else {
      this.strengthProp = new DynamicProperty(options.strength ?? 1.0);
    }
    this.enabled = options.enabled ?? true;
  }

  public get strength(): number {
    return this.strengthProp.literalValue;
  }

  public set strength(val: number) {
    this.strengthProp.literalValue = val;
    this.strengthProp.notify();
  }
}

