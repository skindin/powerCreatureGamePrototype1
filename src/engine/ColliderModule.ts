import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";

export class ColliderModule {
  public radiusProp: DynamicProperty;
  public ccdThresholdRatioProp: DynamicProperty;
  public enabled: boolean;
  public canSweep: boolean;

  constructor(options: {
    radius?: number;
    enabled?: boolean;
    canSweep?: boolean;
    ccdThresholdRatio?: number;
  } = {}) {
    this.radiusProp = new DynamicProperty(options.radius ?? 0.32);
    this.ccdThresholdRatioProp = new DynamicProperty(options.ccdThresholdRatio ?? 0.5);
    this.enabled = options.enabled ?? true;
    this.canSweep = options.canSweep ?? true;
  }

  public get radius(): number {
    return this.radiusProp.literalValue;
  }

  public set radius(val: number) {
    this.radiusProp.literalValue = val;
  }

  public get ccdThresholdRatio(): number {
    return this.ccdThresholdRatioProp.literalValue;
  }

  public set ccdThresholdRatio(val: number) {
    this.ccdThresholdRatioProp.literalValue = val;
  }

  public getRadius(registry?: ObjectPropertiesRegistry): number {
    return this.radiusProp.get(registry);
  }

  public getCcdThresholdRatio(registry?: ObjectPropertiesRegistry): number {
    return this.ccdThresholdRatioProp.get(registry);
  }
}

