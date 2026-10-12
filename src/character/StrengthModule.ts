export class StrengthModule {
  public id = "strength";
  public name = "Strength Module";
  public enabled = true;

  // Strength multiplier: governs physical exertion for walking under load, throwing power, and vertical climbing
  public strength = 1.0;

  constructor(options: { strength?: number; enabled?: boolean } = {}) {
    this.strength = options.strength ?? 1.0;
    this.enabled = options.enabled ?? true;
  }
}
