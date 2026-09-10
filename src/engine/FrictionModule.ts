export class FrictionModule {
  public staticFrictionMod: number;
  public dynamicFrictionMod: number;
  public enabled: boolean;

  constructor(options: {
    staticFrictionMod?: number;
    dynamicFrictionMod?: number;
    enabled?: boolean;
  } = {}) {
    this.staticFrictionMod = options.staticFrictionMod ?? 1.0;
    this.dynamicFrictionMod = options.dynamicFrictionMod ?? 1.0;
    this.enabled = options.enabled ?? true;
  }
}
