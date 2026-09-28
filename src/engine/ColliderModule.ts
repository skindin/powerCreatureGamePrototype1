export class ColliderModule {
  public radius: number;
  public enabled: boolean;
  public canSweep: boolean;
  public ccdThresholdRatio: number;

  constructor(options: {
    radius?: number;
    enabled?: boolean;
    canSweep?: boolean;
    ccdThresholdRatio?: number;
  } = {}) {
    this.radius = options.radius ?? 0.32;
    this.enabled = options.enabled ?? true;
    this.canSweep = options.canSweep ?? true;
    this.ccdThresholdRatio = options.ccdThresholdRatio ?? 0.5;
  }
}

