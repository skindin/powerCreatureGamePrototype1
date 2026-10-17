import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";

export class BounceModule {
  public bounceModProp: DynamicProperty;
  public verticalBounce: boolean;
  public enabled: boolean;

  constructor(options: { bounceMod?: number; verticalBounce?: boolean; enabled?: boolean } = {}) {
    this.bounceModProp = new DynamicProperty(options.bounceMod ?? 0.4);
    this.verticalBounce = options.verticalBounce ?? true;
    this.enabled = options.enabled ?? true;
  }

  public get bounceMod(): number {
    return this.bounceModProp.literalValue;
  }

  public set bounceMod(val: number) {
    this.bounceModProp.literalValue = val;
  }

  public getBounceMod(registry?: ObjectPropertiesRegistry): number {
    return this.bounceModProp.get(registry);
  }
}
