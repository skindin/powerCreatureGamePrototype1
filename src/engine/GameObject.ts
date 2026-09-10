import { Arena, Wall } from "./Arena.js";

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export class GameObject {
  public id: string;
  public name: string;
  public position: Vector3D;
  public mass: number;
  public velocity: Vector2D;
  public verticalVelocity: number;
  public colliderRadius: number;
  public staticGroundFrictionMod: number;
  public dynamicGroundFrictionMod: number;
  public bounceMod: number | null; // Removable / optional
  public color: string;
  public isHeld: boolean;
  public heldBy: GameObject | null;
  public isCharacter = false;

  constructor(options: {
    id?: string;
    name?: string;
    position?: Partial<Vector3D>;
    mass?: number;
    velocity?: Partial<Vector2D>;
    verticalVelocity?: number;
    colliderRadius?: number;
    staticGroundFrictionMod?: number;
    dynamicGroundFrictionMod?: number;
    bounceMod?: number | null;
    color?: string;
  } = {}) {
    this.id = options.id ?? `obj-${Math.random().toString(36).substring(2, 9)}`;
    this.name = options.name ?? "Object";
    this.position = {
      x: options.position?.x ?? 0,
      y: options.position?.y ?? 0,
      z: options.position?.z ?? 0,
    };
    this.mass = options.mass ?? 1.0;
    this.velocity = {
      x: options.velocity?.x ?? 0,
      y: options.velocity?.y ?? 0,
    };
    this.verticalVelocity = options.verticalVelocity ?? 0;
    this.colliderRadius = options.colliderRadius ?? 0.32;
    this.staticGroundFrictionMod = options.staticGroundFrictionMod ?? 1.0;
    this.dynamicGroundFrictionMod = options.dynamicGroundFrictionMod ?? 1.0;
    this.bounceMod = options.bounceMod !== undefined ? options.bounceMod : 0.4;
    this.color = options.color ?? "#38bdf8";
    this.isHeld = false;
    this.heldBy = null;
  }

  /** Elevation of the physical supporting surface directly beneath (ground or wall top) */
  public supportingSurfaceHeight = 0;

  /** True if entity is actively resting on a supporting surface (ground or wall top) */
  public get isRestingOnSurface(): boolean {
    return Math.abs(this.position.z - this.supportingSurfaceHeight) <= 0.01 && Math.abs(this.verticalVelocity) <= 0.05;
  }

  /** Readonly getter: true if elevated above ground level (z > 0) */
  public get isAboveGround(): boolean {
    return this.position.z > 0.001;
  }

  /** Readonly getter: true if elevated above standard arena wall height (1.0 unit) */
  public get isAboveWalls(): boolean {
    return this.position.z > 1.0;
  }

  /** Update physics, gravity, friction, and ground/wall collision */
  public updatePosition(dt: number, arena: Arena): void {
    if (this.isHeld) {
      // Position is governed by holder
      return;
    }

    // 0. Supporting surface: if collider overlaps a wall, it is on the wall!
    const isFreebodyOrAirborne = !this.isCharacter || this.position.z > 0.01 || this.verticalVelocity !== 0;
    const supportingWall = isFreebodyOrAirborne
      ? arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius)
      : arena.getWallAt(this.position.x, this.position.y);

    const surfaceHeight = supportingWall ? supportingWall.wallHeight : 0;
    this.supportingSurfaceHeight = surfaceHeight;

    // 1. Vertical & Surface Physics
    // If collider overlaps a wall, it is on the wall! Nothing is ever considered 'inside' of a wall.
    if (supportingWall) {
      if (this.position.z <= surfaceHeight) {
        this.position.z = surfaceHeight;
        if (this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > 0.4) {
          // Bounce off top of wall
          this.verticalVelocity = -this.verticalVelocity * this.bounceMod;
        } else {
          // Rest on top of wall
          this.verticalVelocity = 0;
        }
      } else {
        // Airborne above the wall
        this.verticalVelocity -= arena.gravity * dt;
        this.position.z += this.verticalVelocity * dt;
        if (this.position.z <= surfaceHeight) {
          this.position.z = surfaceHeight;
          if (this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > 0.4) {
            this.verticalVelocity = -this.verticalVelocity * this.bounceMod;
          } else {
            this.verticalVelocity = 0;
          }
        }
      }
    } else {
      // Over open ground: standard ground physics
      if (this.position.z > 0 || this.verticalVelocity !== 0) {
        this.verticalVelocity -= arena.gravity * dt;
        this.position.z += this.verticalVelocity * dt;

        if (this.position.z <= 0) {
          this.position.z = 0;
          if (this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > 0.4) {
            this.verticalVelocity = -this.verticalVelocity * this.bounceMod;
          } else {
            this.verticalVelocity = 0;
          }
        }
      }
    }

    // 2. Surface Friction (applies to passive freebodies when resting on a surface: floor or wall top)
    const isResting = Math.abs(this.position.z - surfaceHeight) <= 0.01 && Math.abs(this.verticalVelocity) <= 0.05;
    if (isResting) {
      // If entity is a character with an active walking module, locomotion & stopping is handled by WalkingModule
      const hasActiveWalkingModule = this.isCharacter && (this as any).walkingModule?.enabled;
      if (!hasActiveWalkingModule) {
        const speed = Math.hypot(this.velocity.x, this.velocity.y);
        if (speed > 0) {
          const staticThreshold = arena.staticFrictionThreshold * this.staticGroundFrictionMod;
          if (speed < staticThreshold) {
            this.velocity.x = 0;
            this.velocity.y = 0;
          } else {
            const frictionForce = arena.frictionCoeff * this.dynamicGroundFrictionMod * dt;
            const newSpeed = Math.max(0, speed - frictionForce);
            const ratio = newSpeed / speed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
          }
        }
      }
    }

    // 3. Horizontal Position Integration
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // 4. Boundary Collision (Arena Outer Walls)
    const minX = this.colliderRadius;
    const maxX = arena.width - this.colliderRadius;
    const minY = this.colliderRadius;
    const maxY = arena.height - this.colliderRadius;

    if (this.position.x < minX) {
      this.position.x = minX;
      this.velocity.x = Math.abs(this.velocity.x) * (this.bounceMod ?? 0.2);
    } else if (this.position.x > maxX) {
      this.position.x = maxX;
      this.velocity.x = -Math.abs(this.velocity.x) * (this.bounceMod ?? 0.2);
    }

    if (this.position.y < minY) {
      this.position.y = minY;
      this.velocity.y = Math.abs(this.velocity.y) * (this.bounceMod ?? 0.2);
    } else if (this.position.y > maxY) {
      this.position.y = maxY;
      this.velocity.y = -Math.abs(this.velocity.y) * (this.bounceMod ?? 0.2);
    }

    // 5. Arena Internal Walls Collision
    // If the entity is on a wall (supportingWall), it is ON the wall, NOT inside of it!
    // Side wall collision ONLY applies to entities that are completely on the ground and outside all walls.
    if (!supportingWall) {
      for (const wall of arena.walls) {
        if (this.position.z < wall.wallHeight - 0.05) {
          this.resolveWallCollision(wall);
        }
      }
    }
  }

  /** Resolves 2D circle-AABB wall collision on the ground plane */
  protected resolveWallCollision(wall: Wall): void {
    const closestX = Math.max(wall.x, Math.min(this.position.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(this.position.y, wall.y + wall.height));

    const dx = this.position.x - closestX;
    const dy = this.position.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < this.colliderRadius * this.colliderRadius) {
      const dist = Math.sqrt(distSq);
      let normalX = 0;
      let normalY = 0;
      let overlap = 0;

      if (dist === 0) {
        // Find shallowest exit normal from wall box
        const leftDist = Math.abs(this.position.x - wall.x);
        const rightDist = Math.abs((wall.x + wall.width) - this.position.x);
        const topDist = Math.abs(this.position.y - wall.y);
        const bottomDist = Math.abs((wall.y + wall.height) - this.position.y);
        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

        if (minDist === leftDist) { normalX = -1; overlap = leftDist + this.colliderRadius; }
        else if (minDist === rightDist) { normalX = 1; overlap = rightDist + this.colliderRadius; }
        else if (minDist === topDist) { normalY = -1; overlap = topDist + this.colliderRadius; }
        else { normalY = 1; overlap = bottomDist + this.colliderRadius; }
      } else {
        overlap = this.colliderRadius - dist;
        normalX = dx / dist;
        normalY = dy / dist;
      }

      this.position.x += normalX * overlap;
      this.position.y += normalY * overlap;

      // Reflect or dampen velocity along collision normal
      const dot = this.velocity.x * normalX + this.velocity.y * normalY;
      if (dot < 0) {
        const restitution = this.bounceMod ?? 0.1;
        this.velocity.x -= (1 + restitution) * dot * normalX;
        this.velocity.y -= (1 + restitution) * dot * normalY;
      }
    }
  }
}
