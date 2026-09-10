export interface VerticalPositionModuleOptions {
  z?: number;
  hasVerticalVelocity?: boolean;
  verticalVelocity?: number;
  enabled?: boolean;
}

export class VerticalPositionModule {
  public z: number;
  public hasVerticalVelocity: boolean;
  public verticalVelocity: number;
  public enabled: boolean;

  constructor(options: VerticalPositionModuleOptions = {}) {
    this.z = options.z ?? 0;
    this.hasVerticalVelocity = options.hasVerticalVelocity !== undefined ? options.hasVerticalVelocity : true;
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
  }
}
