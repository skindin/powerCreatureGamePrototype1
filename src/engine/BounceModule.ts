export class BounceModule {
  public bounceMod: number;
  public enabled: boolean;

  constructor(options: { bounceMod?: number; enabled?: boolean } = {}) {
    this.bounceMod = options.bounceMod ?? 0.4;
    this.enabled = options.enabled ?? true;
  }
}
