import { DynamicProperty } from "./properties/DynamicProperty.js";

export class MassModule {
  public massProp: DynamicProperty;
  public enabled: boolean;

  constructor(options: { mass?: number | DynamicProperty; enabled?: boolean } = {}) {
    if (options.mass instanceof DynamicProperty) {
      this.massProp = options.mass;
    } else {
      this.massProp = new DynamicProperty(options.mass ?? 1.0);
    }
    this.enabled = options.enabled ?? true;
  }

  public get mass(): number {
    return this.massProp.literalValue;
  }

  public set mass(val: number) {
    this.massProp.literalValue = val;
    this.massProp.notify();
  }
}

