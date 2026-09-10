export class ColliderModule {
  public radius: number;
  public enabled: boolean;

  constructor(options: { radius?: number; enabled?: boolean } = {}) {
    this.radius = options.radius ?? 0.32;
    this.enabled = options.enabled ?? true;
  }
}
