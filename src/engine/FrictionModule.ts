import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";

export class FrictionModule {
  public staticFrictionProp: DynamicProperty;
  public dynamicFrictionProp: DynamicProperty;
  public enabled: boolean;

  constructor(options: {
    staticFrictionMod?: number;
    dynamicFrictionMod?: number;
    enabled?: boolean;
  } = {}) {
    this.staticFrictionProp = new DynamicProperty(options.staticFrictionMod ?? 1.0);
    this.dynamicFrictionProp = new DynamicProperty(options.dynamicFrictionMod ?? 1.0);
    this.enabled = options.enabled ?? true;
  }

  public get staticFrictionMod(): number {
    return this.staticFrictionProp.literalValue;
  }

  public set staticFrictionMod(val: number) {
    this.staticFrictionProp.literalValue = val;
  }

  public get dynamicFrictionMod(): number {
    return this.dynamicFrictionProp.literalValue;
  }

  public set dynamicFrictionMod(val: number) {
    this.dynamicFrictionProp.literalValue = val;
  }

  public getStaticFrictionMod(registry?: ObjectPropertiesRegistry): number {
    return this.staticFrictionProp.get(registry);
  }

  public getDynamicFrictionMod(registry?: ObjectPropertiesRegistry): number {
    return this.dynamicFrictionProp.get(registry);
  }
}
