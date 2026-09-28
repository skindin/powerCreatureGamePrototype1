export interface RigidbodyModuleOptions {
  velocity?: { x: number; y: number };
  hasVerticalVelocity?: boolean;
  verticalVelocity?: number;
  collisionMode?: "discrete" | "continuous" | "dynamic";
  isKinematic?: boolean;
  enabled?: boolean;
}

export class RigidbodyModule {
  public velocity: { x: number; y: number };
  public hasVerticalVelocity: boolean;
  public verticalVelocity: number;
  public collisionMode: "discrete" | "continuous" | "dynamic";
  public isKinematic: boolean;
  public enabled: boolean;

  constructor(options: RigidbodyModuleOptions = {}) {
    this.velocity = {
      x: options.velocity?.x ?? 0,
      y: options.velocity?.y ?? 0,
    };
    this.hasVerticalVelocity = options.hasVerticalVelocity !== undefined ? options.hasVerticalVelocity : true;
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.collisionMode = options.collisionMode ?? "dynamic";
    this.isKinematic = options.isKinematic ?? false;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
  }
}
