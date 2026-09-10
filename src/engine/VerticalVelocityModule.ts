export interface VerticalVelocityModuleOptions {
  enabled?: boolean;
  verticalVelocity?: number;
}

export class VerticalVelocityModule {
  public id = "vertical_velocity";
  public name = "Vertical Velocity";
  public enabled: boolean;
  public velocity: number;

  constructor(options: VerticalVelocityModuleOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.velocity = options.verticalVelocity ?? 0;
  }
}
