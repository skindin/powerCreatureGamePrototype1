export class BounceModule {
  public bounceMod: number;
  public verticalBounce: boolean;
  public enabled: boolean;

  constructor(options: { bounceMod?: number; verticalBounce?: boolean; enabled?: boolean } = {}) {
    this.bounceMod = options.bounceMod ?? 0.4;
    this.verticalBounce = options.verticalBounce ?? true;
    this.enabled = options.enabled ?? true;
  }
}
