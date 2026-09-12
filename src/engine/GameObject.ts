import { Arena, Wall } from "./Arena.js";
import { RollModule } from "./RollModule.js";
import { ColliderModule } from "./ColliderModule.js";
import { MassModule } from "./MassModule.js";
import { FrictionModule } from "./FrictionModule.js";
import { BounceModule } from "./BounceModule.js";
import { GravityModule } from "./GravityModule.js";
import { VerticalPositionModule } from "./VerticalPositionModule.js";

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
  public velocity: Vector2D;
  public color: string;
  public isHeld: boolean;
  public heldBy: GameObject | null;
  public lastThrower: GameObject | null = null;
  public isCharacter = false;
  public isClimbing = false;
  public visualShape: "circle" | "box" = "circle";

  // Modular behavior components
  public colliderModule: ColliderModule | null = null;
  public massModule: MassModule | null = null;
  public frictionModule: FrictionModule | null = null;
  public bounceModule: BounceModule | null = null;
  public verticalPositionModule: VerticalPositionModule | null = null;
  public gravityModule: GravityModule | null = null;
  public rollModule: RollModule | null = null;

  constructor(options: {
    id?: string;
    name?: string;
    position?: Partial<Vector3D>;
    velocity?: Partial<Vector2D>;
    verticalVelocity?: number;
    color?: string;
    visualShape?: "circle" | "box";
    colliderModule?: ColliderModule | null;
    massModule?: MassModule | null;
    frictionModule?: FrictionModule | null;
    bounceModule?: BounceModule | null;
    verticalPositionModule?: VerticalPositionModule | null;
    gravityModule?: GravityModule | null;
    rollModule?: RollModule | null;
    // Convenience option shorthands
    mass?: number;
    colliderRadius?: number;
    staticGroundFrictionMod?: number;
    dynamicGroundFrictionMod?: number;
    bounceMod?: number | null;
    hasGravity?: boolean;
    hasVerticalPosition?: boolean;
    hasVerticalVelocity?: boolean;
  } = {}) {
    this.id = options.id ?? `obj-${Math.random().toString(36).substring(2, 9)}`;
    this.name = options.name ?? "Entity";
    this.position = {
      x: options.position?.x ?? 0,
      y: options.position?.y ?? 0,
      z: options.position?.z ?? 0,
    };
    this.velocity = {
      x: options.velocity?.x ?? 0,
      y: options.velocity?.y ?? 0,
    };
    this.color = options.color ?? "#94a3b8";
    this.isHeld = false;
    this.heldBy = null;
    this.visualShape = options.visualShape ?? "circle";

    // Initialize modules
    this.colliderModule = options.colliderModule !== undefined
      ? options.colliderModule
      : (options.colliderRadius !== undefined
          ? new ColliderModule({ radius: options.colliderRadius })
          : new ColliderModule({ radius: 0.35 }));

    this.massModule = options.massModule !== undefined
      ? options.massModule
      : (options.mass !== undefined
          ? new MassModule({ mass: options.mass })
          : new MassModule({ mass: 1.0 }));

    this.frictionModule = options.frictionModule !== undefined
      ? options.frictionModule
      : new FrictionModule({
          staticFrictionMod: options.staticGroundFrictionMod ?? 1.0,
          dynamicFrictionMod: options.dynamicGroundFrictionMod ?? 1.0,
        });

    this.bounceModule = options.bounceModule !== undefined
      ? options.bounceModule
      : (options.bounceMod !== undefined && options.bounceMod !== null
          ? new BounceModule({ bounceMod: options.bounceMod })
          : new BounceModule({ bounceMod: 0.4 }));

    this.verticalPositionModule = options.verticalPositionModule !== undefined
      ? options.verticalPositionModule
      : (options.hasVerticalPosition === false
          ? null
          : new VerticalPositionModule({
              z: this.position.z,
              hasVerticalVelocity: options.hasVerticalVelocity !== false,
              verticalVelocity: options.verticalVelocity ?? 0,
            }));

    if (!this.hasVerticalPosition) {
      this.position.z = 0;
    }

    this.gravityModule = options.gravityModule !== undefined
      ? options.gravityModule
      : (options.hasGravity === false ? null : new GravityModule());

    this.rollModule = options.rollModule ?? null;
  }

  // --- Convenience Getters & Setters ---

  public get hasCollider(): boolean {
    return Boolean(this.colliderModule && this.colliderModule.enabled);
  }

  public get colliderRadius(): number {
    return this.colliderModule && this.colliderModule.enabled ? this.colliderModule.radius : 0;
  }

  public set colliderRadius(val: number) {
    if (this.colliderModule) {
      this.colliderModule.radius = val;
    } else {
      this.colliderModule = new ColliderModule({ radius: val });
    }
  }

  public get hasMass(): boolean {
    return Boolean(this.massModule && this.massModule.enabled && this.massModule.mass > 0);
  }

  public get mass(): number {
    return this.massModule && this.massModule.enabled ? this.massModule.mass : 0;
  }

  public set mass(val: number) {
    if (this.massModule) {
      this.massModule.mass = val;
    } else {
      this.massModule = new MassModule({ mass: val });
    }
  }

  /**
   * Friction requires both MassModule and FrictionModule. Without mass, normal force is 0.
   */
  public get hasFriction(): boolean {
    return Boolean(this.hasMass && this.frictionModule && this.frictionModule.enabled);
  }

  public get staticGroundFrictionMod(): number {
    return this.hasFriction && this.frictionModule ? this.frictionModule.staticFrictionMod : 0;
  }

  public set staticGroundFrictionMod(val: number) {
    if (this.frictionModule) {
      this.frictionModule.staticFrictionMod = val;
    } else {
      this.frictionModule = new FrictionModule({ staticFrictionMod: val });
    }
  }

  public get dynamicGroundFrictionMod(): number {
    return this.hasFriction && this.frictionModule ? this.frictionModule.dynamicFrictionMod : 0;
  }

  public set dynamicGroundFrictionMod(val: number) {
    if (this.frictionModule) {
      this.frictionModule.dynamicFrictionMod = val;
    } else {
      this.frictionModule = new FrictionModule({ dynamicFrictionMod: val });
    }
  }

  /**
   * Bounciness requires both MassModule and BounceModule. Without mass, restitution is ignored.
   */
  public get hasBounce(): boolean {
    return Boolean(this.hasMass && this.bounceModule && this.bounceModule.enabled);
  }

  public get bounceMod(): number | null {
    return this.hasBounce && this.bounceModule ? this.bounceModule.bounceMod : null;
  }

  public set bounceMod(val: number | null) {
    if (val === null || val <= 0.01) {
      this.bounceModule = null;
    } else if (this.bounceModule) {
      this.bounceModule.bounceMod = val;
    } else {
      this.bounceModule = new BounceModule({ bounceMod: val });
    }
  }

  public get hasVerticalPosition(): boolean {
    return Boolean(this.verticalPositionModule && this.verticalPositionModule.enabled);
  }

  public get hasVerticalVelocity(): boolean {
    return Boolean(this.hasVerticalPosition && this.verticalPositionModule?.hasVerticalVelocity);
  }

  public get verticalVelocity(): number {
    return this.hasVerticalVelocity && this.verticalPositionModule ? this.verticalPositionModule.verticalVelocity : 0;
  }

  public set verticalVelocity(val: number) {
    if (this.hasVerticalVelocity && this.verticalPositionModule) {
      this.verticalPositionModule.verticalVelocity = val;
    }
  }

  /**
   * Vertical bounce requires MassModule, BounceModule (with verticalBounce=true), and Vertical Velocity.
   */
  public get hasVerticalBounce(): boolean {
    return Boolean(
      this.hasBounce &&
      this.bounceModule?.verticalBounce &&
      this.hasVerticalVelocity
    );
  }

  public get hasGravity(): boolean {
    return Boolean(this.gravityModule && this.gravityModule.enabled);
  }

  /** Elevation of the physical supporting surface directly beneath (ground or wall top) */
  public supportingSurfaceHeight = 0;

  /** True if entity is actively resting on a supporting surface (ground or wall top) */
  public get isRestingOnSurface(): boolean {
    return Math.abs(this.position.z - this.supportingSurfaceHeight) <= 0.01 && Math.abs(this.verticalVelocity) <= 0.05;
  }

  /** Readonly getter: true if elevated above ground level (z > 0) */
  public get isAboveGround(): boolean {
    return this.hasVerticalPosition && this.position.z > 0.001;
  }

  /** Readonly getter: true if elevated at or above standard arena wall height (1.0 unit) or resting on a wall */
  public get isAboveWalls(): boolean {
    return this.hasVerticalPosition && (this.position.z >= 0.95 || this.supportingSurfaceHeight >= 0.95);
  }

  /** Update physics, gravity, friction, and ground/wall collision */
  public updatePosition(dt: number, arena: Arena): void {
    if (this.isHeld) {
      // Position is governed by holder
      return;
    }

    // If thrown, track when it has exited thrower's reach or settled on a surface
    if (this.lastThrower) {
      const throwerRadius = this.lastThrower.hasCollider ? this.lastThrower.colliderRadius : 0.44;
      const reach = ((this.lastThrower as any).pickupModule?.pickupReach ?? 1.3) + this.colliderRadius + throwerRadius;
      const dist = Math.hypot(this.position.x - this.lastThrower.position.x, this.position.y - this.lastThrower.position.y);
      if (dist > reach || this.isRestingOnSurface) {
        this.lastThrower = null;
      }
    }

    if (!this.hasVerticalPosition) {
      this.position.z = 0;
      this.verticalVelocity = 0;
      this.supportingSurfaceHeight = 0;
    }

    // 0. Supporting surface:
    // Only check wall support if entity has a collider and vertical position
    let surfaceHeight = 0;
    let supportingWall: Wall | null = null;

    if (this.hasCollider && this.hasVerticalPosition && arena.walls.length > 0) {
      // Layer 2 threshold: entity is elevated to or resting on layer 2 (wall height)
      const isAtWallLayer = this.position.z >= arena.wallHeight - 0.05 ||
        (this.supportingSurfaceHeight >= arena.wallHeight - 0.05 && this.position.z >= arena.wallHeight - 0.2);

      if (isAtWallLayer) {
        const char = this.isCharacter ? (this as any) : null;
        const isDismountFalling = Boolean(char?.climbingModule?.climbSuppressedUntilRePress);

        if (isDismountFalling) {
          // While in dismount freefall, entity must ALWAYS fall down to ground!
          // No wall provides layer 2 support.
          surfaceHeight = 0;
          supportingWall = null;
        } else {
          // Standard layer 2 support: entity is supported as long as collider circle overlaps ANY wall tile
          supportingWall = arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius);
          if (supportingWall) {
            surfaceHeight = supportingWall.wallHeight;
          }
        }
      }
    }
    if (this.isClimbing) {
      surfaceHeight = Math.max(surfaceHeight, this.position.z);
      this.verticalVelocity = 0;
    }
    this.supportingSurfaceHeight = surfaceHeight;

    // 1. Vertical & Surface Physics
    if (this.hasGravity && this.hasVerticalVelocity) {
      // Gravity acceleration active
      if (this.position.z > surfaceHeight || this.verticalVelocity !== 0) {
        this.verticalVelocity -= arena.gravity * dt;
        this.position.z += this.verticalVelocity * dt;

        // Surface impact (hitting floor or top of wall from above)
        if (this.position.z <= surfaceHeight) {
          this.position.z = surfaceHeight;
          // Bounce vertically only if vertical bounce is enabled (requires Mass, Bounce with verticalBounce=true, and Vertical Velocity)
          if (!this.isCharacter && this.hasVerticalBounce && this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > 0.25) {
            const impactVz = Math.abs(this.verticalVelocity);
            this.verticalVelocity = -this.verticalVelocity * this.bounceMod;

            // Vertical bounce couples into rolling dynamics only if surface friction is present
            if (this.hasFriction && this.rollModule && this.rollModule.enabled) {
              const roll = this.rollModule;
              const R = this.colliderRadius > 0 ? this.colliderRadius : 0.3;
              const beta = 0.4;
              const e = this.bounceMod;
              const normalImpulse = (1 + e) * this.mass * impactVz;

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

                this.velocity.x -= impX / this.mass;
                this.velocity.y -= impY / this.mass;

                roll.angularVelocity.y += impX / (beta * this.mass * R);
                roll.angularVelocity.x -= impY / (beta * this.mass * R);
              }

              const spinDamp = Math.max(0.65, 1.0 - (1 - e) * 0.35);
              roll.angularVelocity.x *= spinDamp;
              roll.angularVelocity.y *= spinDamp;
              roll.angularVelocity.z *= spinDamp;
            }
          } else {
            // No bounce: dead stick impact
            this.verticalVelocity = 0;
          }
        }
      }
    } else {
      // Zero Gravity: maintains elevation unless vertical velocity is present
      if (this.hasVerticalVelocity && this.verticalVelocity !== 0) {
        this.position.z += this.verticalVelocity * dt;
        if (this.position.z <= surfaceHeight) {
          this.position.z = surfaceHeight;
          if (this.hasVerticalBounce && this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > 0.25) {
            this.verticalVelocity = -this.verticalVelocity * this.bounceMod;
          } else {
            this.verticalVelocity = 0;
          }
        }
      }
    }

    // 2. Surface Friction & Rolling Behavior (applies only if resting on surface and has friction)
    const isResting = Math.abs(this.position.z - surfaceHeight) <= 0.01 && Math.abs(this.verticalVelocity) <= 0.05;
    if (isResting && this.hasFriction) {
      const hasActiveWalkingModule = this.isCharacter && (this as any).walkingModule?.enabled;
      if (!hasActiveWalkingModule) {
        if (this.rollModule && this.rollModule.enabled) {
          const roll = this.rollModule;
          const R = this.colliderRadius > 0 ? this.colliderRadius : 0.3;
          const muG = arena.frictionCoeff * this.dynamicGroundFrictionMod;
          const beta = 0.4;

          const vSlipX = this.velocity.x - roll.angularVelocity.y * R;
          const vSlipY = this.velocity.y + roll.angularVelocity.x * R;
          const slipSpeed = Math.hypot(vSlipX, vSlipY);

          if (muG > 0 && slipSpeed > 0.001) {
            const maxSlipDelta = muG * (1 + 1 / beta) * dt;
            if (slipSpeed <= maxSlipDelta) {
              const totalMomX = this.velocity.x + beta * roll.angularVelocity.y * R;
              const totalMomY = this.velocity.y - beta * roll.angularVelocity.x * R;
              const rollVx = totalMomX / (1 + beta);
              const rollVy = totalMomY / (1 + beta);
              this.velocity.x = rollVx;
              this.velocity.y = rollVy;
              roll.angularVelocity.y = rollVx / R;
              roll.angularVelocity.x = -rollVy / R;
            } else {
              const fx = (vSlipX / slipSpeed) * muG * dt;
              const fy = (vSlipY / slipSpeed) * muG * dt;
              this.velocity.x -= fx;
              this.velocity.y -= fy;
              roll.angularVelocity.y += fx / (beta * R);
              roll.angularVelocity.x -= fy / (beta * R);
            }
          }

          // Roll Resistance
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
          } else {
            const spinSpeed = Math.hypot(roll.angularVelocity.x, roll.angularVelocity.y);
            if (spinSpeed > 0 && muG > 0) {
              const spinDecel = (muG / (beta * R)) * dt;
              const newSpin = Math.max(0, spinSpeed - spinDecel);
              const ratio = spinSpeed > 0 ? newSpin / spinSpeed : 0;
              roll.angularVelocity.x *= ratio;
              roll.angularVelocity.y *= ratio;
            }
          }

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
          // Standard sliding ground friction
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
      // Frictionless or airborne or no mass: spin is NOT affected by ground!
      if (this.rollModule && this.rollModule.enabled) {
        this.rollModule.updateVisualPhase(dt);
      }
    }

    // 3. Horizontal Position Integration
    // Check climb ability ledge guard / walk-off prevention:
    // When on top of a wall, prevent walking off unless actively holding the climb control (Space bar).
    const char = this.isCharacter ? (this as any) : null;
    const wasStandingOnWallTop = !this.isClimbing && this.supportingSurfaceHeight >= arena.wallHeight - 0.05;
    const dismountAllowed = Boolean(wasStandingOnWallTop && char?.isClimbInputHeld && !char?.climbingModule?.dismountSuppressedUntilRelease);
    const isPreventWalkOffActive = Boolean(
      char &&
      wasStandingOnWallTop &&
      char.climbingModule?.enabled &&
      char.climbingModule?.preventWalkOff &&
      !dismountAllowed
    );

    if (isPreventWalkOffActive) {
      const currentSupport = arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius);
      if (currentSupport) {
        const candidateX = this.position.x + this.velocity.x * dt;
        const candidateY = this.position.y + this.velocity.y * dt;
        const fullSupport = arena.getSupportingWall(candidateX, candidateY, this.colliderRadius);

        if (fullSupport) {
          this.position.x = candidateX;
          this.position.y = candidateY;
        } else {
          // Ledge guard with corner sliding deflection:
          // Find the closest point on any wall footprint to the candidate position
          const closest = GameObject.getClosestWallPoint(candidateX, candidateY, arena);
          if (closest && closest.dist > 0) {
            const r = this.colliderRadius;
            const normalX = closest.dx / closest.dist;
            const normalY = closest.dy / closest.dist;

            // Outward velocity attempting to step into the void
            const outwardVel = this.velocity.x * normalX + this.velocity.y * normalY;
            if (outwardVel > 0) {
              // Eliminate the outward velocity, leaving tangential velocity (curves smoothly around corners)
              this.velocity.x -= outwardVel * normalX;
              this.velocity.y -= outwardVel * normalY;
            }

            // Clamp position along the normal to valid contact distance (r - 0.002) so collider circle remains overlapping wall
            const maxAllowedDist = r - 0.002;
            if (closest.dist > maxAllowedDist) {
              this.position.x = closest.closestX + normalX * maxAllowedDist;
              this.position.y = closest.closestY + normalY * maxAllowedDist;
            } else {
              this.position.x = candidateX;
              this.position.y = candidateY;
            }
          } else {
            this.velocity.x = 0;
            this.velocity.y = 0;
          }
        }
      } else {
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
      }
    } else {
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;

      // Detect stepping/jumping off wall with climb button held
      if (char && wasStandingOnWallTop) {
        const col = Math.floor(this.position.x / arena.tileSize);
        const row = Math.floor(this.position.y / arena.tileSize);
        const centerTileHasWall = arena.hasWall(col, row);
        const newSupport = arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius);
        if ((!newSupport || !centerTileHasWall) && char.climbingModule && char.isClimbInputHeld) {
          char.climbingModule.climbSuppressedUntilRelease = true;
        }
      }
    }

    // 4 & 5. Boundary & Wall Collisions (Only if ColliderModule is active!)
    if (this.hasCollider) {
      const r = this.colliderRadius;
      const minX = r;
      const maxX = arena.width - r;
      const minY = r;
      const maxY = arena.height - r;

      const bRestitution = this.isCharacter ? 0 : (this.hasBounce && this.bounceMod !== null ? this.bounceMod : 0);

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

      // Internal arena walls collision:
      // Strictly enforced for any entity below wall height,
      // AND also strictly enforced during dismount freefall against all walls (collider cannot enter any other wall!)
      const isDismountFallingNow = Boolean(char?.climbingModule?.climbSuppressedUntilRePress);
      for (const wall of arena.walls) {
        if (this.position.z < wall.wallHeight - 0.05 || isDismountFallingNow) {
          this.resolveWallCollision(wall);
        }
      }
    }

    // 6. Absolute physical speed bounds
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

    if (this.verticalPositionModule) {
      this.verticalPositionModule.z = this.position.z;
    }
  }

  /**
   * Finds the closest point on any wall footprint in the arena to (x, y),
   * along with distance and normal vector components.
   */
  public static getClosestWallPoint(x: number, y: number, arena: Arena): {
    wall: Wall;
    closestX: number;
    closestY: number;
    dist: number;
    dx: number;
    dy: number;
  } | null {
    if (!arena.walls || arena.walls.length === 0) return null;

    let bestDistSq = Infinity;
    let bestResult: {
      wall: Wall;
      closestX: number;
      closestY: number;
      dist: number;
      dx: number;
      dy: number;
    } | null = null;

    for (const wall of arena.walls) {
      const cx = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const cy = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestResult = {
          wall,
          closestX: cx,
          closestY: cy,
          dist: Math.sqrt(distSq),
          dx,
          dy,
        };
      }
    }

    return bestResult;
  }

  /**
   * Applies realistic wall/boundary impact dynamics
   */
  protected resolveWallImpact(normalX: number, normalY: number, restitution: number): void {
    this.lastThrower = null;
    const dot = this.velocity.x * normalX + this.velocity.y * normalY;
    if (dot >= 0) return; // Moving away from wall

    const normalVel = dot;

    if (restitution > 0 && this.hasMass) {
      // Elastic / partially elastic bounce
      this.velocity.x -= (1 + restitution) * normalVel * normalX;
      this.velocity.y -= (1 + restitution) * normalVel * normalY;
    } else {
      // Inelastic wall impact (restitution = 0 or no bounce module / no mass)
      this.velocity.x -= normalVel * normalX;
      this.velocity.y -= normalVel * normalY;
    }

    // Tangential friction and 3D angular velocity coupling on wall
    if (this.hasFriction && this.rollModule && this.rollModule.enabled) {
      const roll = this.rollModule;
      const R = this.colliderRadius > 0 ? this.colliderRadius : 0.3;
      const beta = 0.4;
      const muWall = 0.35;

      const tangentX = -normalY;
      const tangentY = normalX;
      const tangentVel = this.velocity.x * tangentX + this.velocity.y * tangentY;
      const normalImpulse = -(1 + restitution) * this.mass * normalVel;

      const vContactT = tangentVel - roll.angularVelocity.z * R;
      const stickImpulse = (Math.abs(vContactT) * this.mass) / (1 + 1 / beta);
      const maxFricImpulse = muWall * normalImpulse;
      const fricImpulseMag = Math.min(stickImpulse, maxFricImpulse);
      const fricImpulse = -Math.sign(vContactT) * fricImpulseMag;

      const oldTangentVel = tangentVel;
      const proposedTangentVel = oldTangentVel + (fricImpulse / this.mass);
      const actualDeltaVt = (Math.abs(proposedTangentVel) <= Math.abs(oldTangentVel) + 0.01)
        ? (proposedTangentVel - oldTangentVel)
        : -oldTangentVel * 0.1;

      this.velocity.x += actualDeltaVt * tangentX;
      this.velocity.y += actualDeltaVt * tangentY;

      const actualFricImpulse = actualDeltaVt * this.mass;
      const deltaWz = -actualFricImpulse / (beta * this.mass * R);
      roll.angularVelocity.z += deltaWz;
      roll.angularVelocity.z = Math.max(-30, Math.min(30, roll.angularVelocity.z));

      roll.angularVelocity.y = this.velocity.x / R;
      roll.angularVelocity.x = -this.velocity.y / R;
    }
  }

  /** Resolves 2D circle-AABB wall collision on the ground plane */
  protected resolveWallCollision(wall: Wall): void {
    if (!this.hasCollider) return;

    const r = this.colliderRadius;
    const closestX = Math.max(wall.x, Math.min(this.position.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(this.position.y, wall.y + wall.height));

    const dx = this.position.x - closestX;
    const dy = this.position.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < r * r) {
      this.lastThrower = null;
      const dist = Math.sqrt(distSq);
      let normalX = 0;
      let normalY = 0;
      let overlap = 0;

      if (dist === 0) {
        const leftDist = Math.abs(this.position.x - wall.x);
        const rightDist = Math.abs((wall.x + wall.width) - this.position.x);
        const topDist = Math.abs(this.position.y - wall.y);
        const bottomDist = Math.abs((wall.y + wall.height) - this.position.y);
        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);

        if (minDist === leftDist) { normalX = -1; overlap = leftDist + r; }
        else if (minDist === rightDist) { normalX = 1; overlap = rightDist + r; }
        else if (minDist === topDist) { normalY = -1; overlap = topDist + r; }
        else { normalY = 1; overlap = bottomDist + r; }
      } else {
        overlap = r - dist;
        normalX = dx / dist;
        normalY = dy / dist;
      }

      this.position.x += normalX * overlap;
      this.position.y += normalY * overlap;

      const restitution = this.isCharacter ? 0 : (this.hasBounce && this.bounceMod !== null ? this.bounceMod : 0);
      this.resolveWallImpact(normalX, normalY, restitution);
    }
  }
}
