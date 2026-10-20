import { Vector3D } from "./GameObject.js";
import { DynamicProperty } from "./properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "./properties/DynamicProperty.js";

export interface Quaternion4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

function lcgRandom(seed: number): () => number {
  let s = (seed >>> 0) || 12345;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class RollModule {
  public enabled: boolean = true;

  /** Dynamic angular velocity in 3 dimensions (rad/s around X, Y, Z axes) */
  public angularVelocity: Vector3D = { x: 0, y: 0, z: 0 };

  /** 3D rotation quaternion tracking orientation in world space */
  public orientation: Quaternion4D = { x: 0, y: 0, z: 0, w: 1 };

  /**
   * Roll resistance property: deceleration force (in u/s²) that opposes rolling.
   * If rollResistance === 0, the object has zero rolling resistance and will roll until it hits a wall!
   */
  public rollResistanceProp: DynamicProperty;

  /**
   * Toggleable bumpy rolling feature: simulates irregular rock roughness and airborne hops.
   * Independent from baseline roll resistance.
   */
  public bumpyRollEnabled: boolean = true;

  /**
   * Bumpiness magnitude property (0.0 = perfectly smooth circle, 0.3 = natural rock, 1.0 = heavy rugged stone).
   * Dictates how deeply flatter facets are carved inward below the collider envelope.
   */
  public bumpinessProp: DynamicProperty;

  /** Seed used to deterministically generate this object's static 3D surface roughness */
  public seed: number;

  /** Last measured ground contact radius (used to calculate vertical rate of change dr/dt) */
  public lastContactRadius: number = 0;

  /** Animated phase accumulator (radians) used for rendering the rotating dotted oval */
  public visualPhase: number = 0;

  private _coeff: {
    a1: number; a2: number; a3: number;
    b1: number; b2: number; b3: number;
    c1: number; c2: number; c3: number;
  };

  constructor(options: {
    enabled?: boolean;
    angularVelocity?: Partial<Vector3D>;
    rollResistance?: number;
    bumpyRollEnabled?: boolean;
    bumpiness?: number;
    seed?: number;
  } = {}) {
    this.enabled = options.enabled ?? true;
    this.angularVelocity = {
      x: options.angularVelocity?.x ?? 0,
      y: options.angularVelocity?.y ?? 0,
      z: options.angularVelocity?.z ?? 0,
    };
    this.rollResistanceProp = new DynamicProperty(options.rollResistance ?? 0.4);
    this.bumpyRollEnabled = options.bumpyRollEnabled ?? true;
    this.bumpinessProp = new DynamicProperty(options.bumpiness ?? 0.22);

    this.seed = options.seed ?? Math.floor(Math.random() * 100000);
    const rng = lcgRandom(this.seed);
    this._coeff = {
      a1: rng() * 2 - 1,
      a2: rng() * 2 - 1,
      a3: rng() * 2 - 1,
      b1: rng() * 2 - 1,
      b2: rng() * 2 - 1,
      b3: rng() * 2 - 1,
      c1: rng() * 2 - 1,
      c2: rng() * 2 - 1,
      c3: rng() * 2 - 1,
    };
  }

  public get rollResistance(): number {
    return this.rollResistanceProp.literalValue;
  }

  public set rollResistance(val: number) {
    this.rollResistanceProp.literalValue = val;
  }

  public getRollResistance(registry?: ObjectPropertiesRegistry): number {
    return this.rollResistanceProp.get(registry);
  }

  public get bumpiness(): number {
    return this.bumpinessProp.literalValue;
  }

  public set bumpiness(val: number) {
    this.bumpinessProp.literalValue = Math.max(0, Math.min(1, val));
  }

  public getBumpiness(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0, Math.min(1, this.bumpinessProp.get(registry)));
  }

  /**
   * Total magnitude of 3D angular velocity (|ω| in rad/s)
   */
  public get angularSpeed(): number {
    return Math.hypot(this.angularVelocity.x, this.angularVelocity.y, this.angularVelocity.z);
  }

  /**
   * Evaluates the 3D spherical harmonic roughness in local body space.
   * Returns a normalized value in [0, 1] where 1.0 = peak bump (nominal radius), 0.0 = deepest flat.
   */
  public getRoughnessOffset(x: number, y: number, z: number): number {
    const c = this._coeff;
    // Oblong/ellipsoid mode
    const h1 = c.a1 * x * x + c.a2 * y * y + c.a3 * z * z;
    // Triangular facets mode
    const h2 = c.b1 * x * y + c.b2 * y * z + c.b3 * z * x;
    // Higher-frequency bumps
    const h3 = c.c1 * (x * x * x - 3 * x * y * y) + c.c2 * (y * y * y - 3 * y * z * z) + c.c3 * (z * z * z - 3 * z * x * x);

    const raw = 0.5 + 0.25 * h1 + 0.15 * h2 + 0.10 * h3;
    return Math.max(0, Math.min(1, raw));
  }

  /**
   * Calculates the ground contact radius at the bottom touchpoint.
   * Guarantees the radius is ALWAYS <= nominalRadius so the rock never extends above/beyond
   * the circular collider and never visually floats above the floor.
   */
  public getContactRadius(nominalRadius: number, registry?: ObjectPropertiesRegistry): number {
    if (!this.bumpyRollEnabled) return nominalRadius;
    const bumpiness = this.getBumpiness(registry);
    if (bumpiness <= 0.001) return nominalRadius;

    // Contact unit vector in body frame: rotate world down (0, 0, -1) by conjugate of orientation quaternion
    const q = this.orientation;
    const qx = -q.x, qy = -q.y, qz = -q.z, qw = q.w;
    const vx = 0, vy = 0, vz = -1;
    const ix = qw * vx + qy * vz - qz * vy;
    const iy = qw * vy + qz * vx - qx * vz;
    const iz = qw * vz + qx * vy - qy * vx;
    const iw = -qx * vx - qy * vy - qz * vz;
    const ux = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    const uy = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    const uz = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    const rough = this.getRoughnessOffset(ux, uy, uz);
    // Flat facets carve inward by up to (bumpiness * nominalRadius)
    return nominalRadius * (1 - bumpiness * (1 - rough));
  }

  /**
   * Evaluates the radius at an arbitrary direction in world space, rotated by current orientation.
   * Useful for visual rendering passes.
   */
  public getRadiusAtWorldDirection(
    worldDir: { x: number; y: number; z: number },
    nominalRadius: number,
    registry?: ObjectPropertiesRegistry
  ): number {
    if (!this.bumpyRollEnabled) return nominalRadius;
    const bumpiness = this.getBumpiness(registry);
    if (bumpiness <= 0.001) return nominalRadius;

    const q = this.orientation;
    const qx = -q.x, qy = -q.y, qz = -q.z, qw = q.w;
    const vx = worldDir.x, vy = worldDir.y, vz = worldDir.z;
    const ix = qw * vx + qy * vz - qz * vy;
    const iy = qw * vy + qz * vx - qx * vz;
    const iz = qw * vz + qx * vy - qy * vx;
    const iw = -qx * vx - qy * vy - qz * vz;
    const ux = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    const uy = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    const uz = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    const rough = this.getRoughnessOffset(ux, uy, uz);
    return nominalRadius * (1 - bumpiness * (1 - rough));
  }

  /**
   * Advance 3D orientation quaternion based on angular velocity.
   */
  public updateOrientation(dt: number): void {
    const wx = this.angularVelocity.x;
    const wy = this.angularVelocity.y;
    const wz = this.angularVelocity.z;
    const speed = Math.hypot(wx, wy, wz);
    if (speed > 0.0001 && dt > 0) {
      const halfAngle = speed * dt * 0.5;
      const sinHalf = Math.sin(halfAngle);
      const dqx = (wx / speed) * sinHalf;
      const dqy = (wy / speed) * sinHalf;
      const dqz = (wz / speed) * sinHalf;
      const dqw = Math.cos(halfAngle);

      const q = this.orientation;
      const nx = dqw * q.x + dqx * q.w + dqy * q.z - dqz * q.y;
      const ny = dqw * q.y - dqx * q.z + dqy * q.w + dqz * q.x;
      const nz = dqw * q.z + dqx * q.y - dqy * q.x + dqz * q.w;
      const nw = dqw * q.w - dqx * q.x - dqy * q.y - dqz * q.z;

      const mag = Math.hypot(nx, ny, nz, nw);
      if (mag > 0.00001) {
        this.orientation.x = nx / mag;
        this.orientation.y = ny / mag;
        this.orientation.z = nz / mag;
        this.orientation.w = nw / mag;
      }
    }
  }

  /**
   * Advance the visual rotation phase based on current angular velocity
   */
  public updateVisualPhase(dt: number): void {
    const speed = this.angularSpeed;
    if (speed > 0.001) {
      this.visualPhase = (this.visualPhase + speed * dt) % (Math.PI * 2);
    }
    this.updateOrientation(dt);
  }
}
