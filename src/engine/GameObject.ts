import { Arena, Wall } from "./Arena.js";
import { RollModule } from "./RollModule.js";

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
  public rollModule: RollModule | null = null;

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
    rollModule?: RollModule | null;
  } = {}) {
    this.id = options.id ?? `obj-${Math.random().toString(36).substring(2, 9)}`;
    this.name = options.name ?? "Object";
    this.rollModule = options.rollModule ?? null;
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

    // 0. Supporting surface:
    // A wall top supports an entity if the entity is at or above wall height (or was already resting on the wall).
    // Entities below wall height are on the ground and collide with wall sides.
    const canBeOnWall = this.position.z >= arena.wallHeight - 0.15 ||
      (this.supportingSurfaceHeight > 0.01 && this.position.z >= arena.wallHeight - 0.35);
    const supportingWall = canBeOnWall
      ? arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius)
      : null;

    const surfaceHeight = supportingWall ? supportingWall.wallHeight : 0;
    this.supportingSurfaceHeight = surfaceHeight;

    // 1. Vertical & Surface Physics (unified for floor z=0 and wall tops z=wallHeight)
    if (this.position.z > surfaceHeight || this.verticalVelocity !== 0) {
      this.verticalVelocity -= arena.gravity * dt;
      this.position.z += this.verticalVelocity * dt;

      // Surface impact (hitting floor or top of wall from above)
      if (this.position.z <= surfaceHeight) {
        this.position.z = surfaceHeight;
        // Bounce vertically if moving downward with sufficient speed
        if (this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > 0.25) {
          const impactVz = Math.abs(this.verticalVelocity);
          this.verticalVelocity = -this.verticalVelocity * this.bounceMod;

          // Vertical bounce impacts and couples into rolling dynamics
          if (this.rollModule && this.rollModule.enabled) {
            const roll = this.rollModule;
            const R = this.colliderRadius;
            const beta = 0.4;
            const e = this.bounceMod;
            const normalImpulse = (1 + e) * this.mass * impactVz;

            // Surface friction during bounce grips the ball
            const muBounce = arena.frictionCoeff * this.dynamicGroundFrictionMod * 0.05;
            const vSlipX = this.velocity.x - roll.angularVelocity.y * R;
            const vSlipY = this.velocity.y + roll.angularVelocity.x * R;
            const slipSpeed = Math.hypot(vSlipX, vSlipY);

            if (slipSpeed > 0.001 && muBounce > 0) {
              const maxFricImpulse = muBounce * normalImpulse;
              const stickImpulse = (slipSpeed * this.mass) / (1 + 1 / beta);
              const actualImpulse = Math.min(stickImpulse, maxFricImpulse);

              const impX = (vSlipX / slipSpeed) * actualImpulse;
              const impY = (vSlipY / slipSpeed) * actualImpulse;

              // Friction opposes slip: reduces linear velocity
              this.velocity.x -= impX / this.mass;
              this.velocity.y -= impY / this.mass;

              // Friction torque accelerates spin to match linear roll
              roll.angularVelocity.y += impX / (beta * this.mass * R);
              roll.angularVelocity.x -= impY / (beta * this.mass * R);
            }

            // Bounce energy dissipation on angular velocity
            const spinDamp = Math.max(0.65, 1.0 - (1 - e) * 0.35);
            roll.angularVelocity.x *= spinDamp;
            roll.angularVelocity.y *= spinDamp;
            roll.angularVelocity.z *= spinDamp;
          }
        } else {
          this.verticalVelocity = 0;
        }
      }
    }

    // 2. Surface Friction & Rolling Behavior (applies to passive freebodies when resting on a surface: floor or wall top)
    const isResting = Math.abs(this.position.z - surfaceHeight) <= 0.01 && Math.abs(this.verticalVelocity) <= 0.05;
    if (isResting) {
      // If entity is a character with an active walking module, locomotion & stopping is handled by WalkingModule
      const hasActiveWalkingModule = this.isCharacter && (this as any).walkingModule?.enabled;
      if (!hasActiveWalkingModule) {
        if (this.rollModule && this.rollModule.enabled) {
          const roll = this.rollModule;
          const R = this.colliderRadius;
          const muG = arena.frictionCoeff * this.dynamicGroundFrictionMod;
          const beta = 0.4; // Moment of inertia factor (2/5 for sphere)

          // 1. Slip velocity at surface contact:
          // v_contact = v + ω × r_bottom = (vx - ωy * R, vy + ωx * R)
          const vSlipX = this.velocity.x - roll.angularVelocity.y * R;
          const vSlipY = this.velocity.y + roll.angularVelocity.x * R;
          const slipSpeed = Math.hypot(vSlipX, vSlipY);

          if (muG > 0 && slipSpeed > 0.001) {
            // Surface friction imparts torque to couple translation into rolling
            const maxSlipDelta = muG * (1 + 1 / beta) * dt;
            if (slipSpeed <= maxSlipDelta) {
              // Pure rolling condition achieved
              const totalMomX = this.velocity.x + beta * roll.angularVelocity.y * R;
              const totalMomY = this.velocity.y - beta * roll.angularVelocity.x * R;
              const rollVx = totalMomX / (1 + beta);
              const rollVy = totalMomY / (1 + beta);
              this.velocity.x = rollVx;
              this.velocity.y = rollVy;
              roll.angularVelocity.y = rollVx / R;
              roll.angularVelocity.x = -rollVy / R;
            } else {
              // Kinetic friction reducing slip
              const fx = (vSlipX / slipSpeed) * muG * dt;
              const fy = (vSlipY / slipSpeed) * muG * dt;
              this.velocity.x -= fx;
              this.velocity.y -= fy;
              roll.angularVelocity.y += fx / (beta * R);
              roll.angularVelocity.x -= fy / (beta * R);
            }
          }
          // Note: If muG == 0 (no surface friction), the object cannot roll; it slides without rolling torque!

          // 2. Roll Resistance: opposes pure rolling motion
          const speed = Math.hypot(this.velocity.x, this.velocity.y);
          if (speed > 0) {
            if (roll.rollResistance > 0) {
              const decel = roll.rollResistance * dt;
              const newSpeed = Math.max(0, speed - decel);
              if (newSpeed < 0.005) {
                this.velocity.x = 0;
                this.velocity.y = 0;
                roll.angularVelocity.x = 0;
                roll.angularVelocity.y = 0;
              } else {
                const ratio = newSpeed / speed;
                this.velocity.x *= ratio;
                this.velocity.y *= ratio;
                roll.angularVelocity.x *= ratio;
                roll.angularVelocity.y *= ratio;
              }
            }
            // If rollResistance === 0: no rolling deceleration! Rolls indefinitely until hitting a wall!
          } else {
            // If linear movement stopped (e.g. against a wall) but object is still spinning,
            // surface friction stops the residual spin
            const spinSpeed = Math.hypot(roll.angularVelocity.x, roll.angularVelocity.y);
            if (spinSpeed > 0 && muG > 0) {
              const spinDecel = (muG / (beta * R)) * dt;
              const newSpin = Math.max(0, spinSpeed - spinDecel);
              const ratio = spinSpeed > 0 ? newSpin / spinSpeed : 0;
              roll.angularVelocity.x *= ratio;
              roll.angularVelocity.y *= ratio;
            }
          }

          // Surface friction dampening on vertical spin (ωz)
          // Governed by rollResistance (if rollResistance === 0, vertical spin does NOT decay from resistance!)
          if (Math.abs(roll.angularVelocity.z) > 0.001) {
            if (roll.rollResistance > 0) {
              const zDecel = (roll.rollResistance / (beta * R)) * dt;
              const signZ = Math.sign(roll.angularVelocity.z);
              const magZ = Math.abs(roll.angularVelocity.z);
              roll.angularVelocity.z = magZ <= zDecel ? 0 : signZ * (magZ - zDecel);
            }
          }

          roll.updateVisualPhase(dt);
        } else {
          // Standard non-rolling sliding ground friction
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
    } else {
      // Airborne free flight: angular velocity persists, visual phase advances
      if (this.rollModule && this.rollModule.enabled) {
        this.rollModule.updateVisualPhase(dt);
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

    const bRestitution = this.isCharacter ? 0 : (this.bounceMod ?? 0.3);

    if (this.position.x < minX) {
      this.position.x = minX;
      this.resolveWallImpact(1, 0, bRestitution);
    } else if (this.position.x > maxX) {
      this.position.x = maxX;
      this.resolveWallImpact(-1, 0, bRestitution);
    }

    if (this.position.y < minY) {
      this.position.y = minY;
      this.resolveWallImpact(0, 1, bRestitution);
    } else if (this.position.y > maxY) {
      this.position.y = maxY;
      this.resolveWallImpact(0, -1, bRestitution);
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

    // 6. Absolute physical speed and spin bounds to guarantee stability
    const maxLinearSpeed = 16.0;
    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
    if (currentSpeed > maxLinearSpeed) {
      const scale = maxLinearSpeed / currentSpeed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }
    if (this.rollModule && this.rollModule.enabled) {
      const maxAngSpeed = 35.0;
      const currentAngSpeed = this.rollModule.angularSpeed;
      if (currentAngSpeed > maxAngSpeed) {
        const scale = maxAngSpeed / currentAngSpeed;
        this.rollModule.angularVelocity.x *= scale;
        this.rollModule.angularVelocity.y *= scale;
        this.rollModule.angularVelocity.z *= scale;
      }
    }
  }

  /**
   * Applies realistic wall/boundary impact dynamics:
   * - Normal elastic rebound.
   * - Tangential surface friction coupling.
   * - Imparts vertical angular velocity (ωz) (upward/downward spin) based on tangential impact angle.
   * - Couples horizontal roll angular velocity (ωx, ωy) to post-bounce motion.
   */
  protected resolveWallImpact(normalX: number, normalY: number, restitution: number): void {
    const dot = this.velocity.x * normalX + this.velocity.y * normalY;
    if (dot >= 0) return; // Moving away from wall

    const normalVel = dot;
    // Unit tangent vector along the wall face such that (n × t) = +z
    const tangentX = -normalY;
    const tangentY = normalX;
    const tangentVel = this.velocity.x * tangentX + this.velocity.y * tangentY;

    // Normal bounce impulse
    const normalImpulse = -(1 + restitution) * this.mass * normalVel;
    this.velocity.x += (normalImpulse / this.mass) * normalX;
    this.velocity.y += (normalImpulse / this.mass) * normalY;

    // Tangential friction and 3D angular velocity coupling
    if (this.rollModule && this.rollModule.enabled) {
      const roll = this.rollModule;
      const R = this.colliderRadius;
      const beta = 0.4;
      const muWall = 0.35; // Wall friction coefficient

      // Tangential velocity of the contact point on the wall face (includes vertical spin ωz):
      // r = -R n => ωz z_hat × (-R n) = -R ωz t_hat, so vContactT = v_t - ωz * R
      const vContactT = tangentVel - roll.angularVelocity.z * R;
      const stickImpulse = (Math.abs(vContactT) * this.mass) / (1 + 1 / beta);
      const maxFricImpulse = muWall * normalImpulse;
      const fricImpulseMag = Math.min(stickImpulse, maxFricImpulse);
      const fricImpulse = -Math.sign(vContactT) * fricImpulseMag;

      // Wall friction alters tangential linear velocity (cannot increase tangential speed)
      const oldTangentVel = tangentVel;
      const proposedTangentVel = oldTangentVel + (fricImpulse / this.mass);
      // Friction can only damp tangential velocity towards zero slip, never accelerate it
      const actualDeltaVt = (Math.abs(proposedTangentVel) <= Math.abs(oldTangentVel) + 0.01)
        ? (proposedTangentVel - oldTangentVel)
        : -oldTangentVel * 0.1;

      this.velocity.x += actualDeltaVt * tangentX;
      this.velocity.y += actualDeltaVt * tangentY;

      // Friction torque on the wall face imparts UPWARD / DOWNWARD angular velocity (ωz)!
      const actualFricImpulse = actualDeltaVt * this.mass;
      const deltaWz = -actualFricImpulse / (beta * this.mass * R);
      roll.angularVelocity.z += deltaWz;

      // Bound vertical spin to prevent runaway accumulation
      roll.angularVelocity.z = Math.max(-30, Math.min(30, roll.angularVelocity.z));

      // Rebound / couple horizontal roll angular velocity to the new velocity
      roll.angularVelocity.y = this.velocity.x / R;
      roll.angularVelocity.x = -this.velocity.y / R;
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

      const restitution = this.isCharacter ? 0 : (this.bounceMod ?? 0.3);
      this.resolveWallImpact(normalX, normalY, restitution);
    }
  }
}
