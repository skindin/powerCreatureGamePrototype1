export class MassModule {
  public mass: number;
  public enabled: boolean;

  constructor(options: { mass?: number; enabled?: boolean } = {}) {
    this.mass = options.mass ?? 1.0;
    this.enabled = options.enabled ?? true;
  }
}
