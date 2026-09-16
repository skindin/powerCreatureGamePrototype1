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

  /** The specific wall the entity is currently standing on (if supported on layer 2) */
  public standingWall: Wall | null = null;

  /** True if entity is actively resting on a supporting surface (ground or wall top) */
  public get isRestingOnSurface(): boolean {
    return Math.abs(this.position.z - this.supportingSurfaceHeight) <= 0.02 && Math.abs(this.verticalVelocity) <= 0.1;
  }

  /** Readonly getter: true if elevated above ground level (z > 0) */
  public get isAboveGround(): boolean {
    return this.hasVerticalPosition && this.position.z > 0.001;
  }

  /** Readonly getter: true if elevated at or above standard arena wall height (1.0 unit) or resting on a wall */
  public get isAboveWalls(): boolean {
    return this.hasVerticalPosition && (
      this.position.z >= 0.85 ||
      this.supportingSurfaceHeight >= 0.85 ||
      this.standingWall !== null
    );
  }

  /**
   * Virtual Infinite Layer System:
   * Objects only collide if they are on the exact same layer.
   * Virtually infinite layers where layer = Math.floor(objectHeight / wallHeight) + 1.
   * - Layer 1 (0 <= z < wallHeight): Ground layer (only layer with walls).
   * - Layer 2 (wallHeight <= z < 2 * wallHeight): Wall elevation / first elevated layer.
   * - Layer 3, 4, ...: Infinite higher altitude layers.
   */
  public static getEntityLayer(entity: GameObject, wallHeight: number = 1.0): number {
    const effectiveH = Math.max(
      0,
      entity.position.z,
      entity.supportingSurfaceHeight ?? 0,
      entity.standingWall ? wallHeight : 0
    );
    const safeWallH = Math.max(0.01, wallHeight);
    return Math.floor(effectiveH / safeWallH) + 1;
  }

  /** Update physics, gravity, friction, and ground/wall collision */
  public updatePosition(dt: number, arena: Arena): void {
    if (this.isHeld) {
      // Position is governed by holder
      return;
    }

    // If thrown, track when it has exited thrower's reach or settled on a surface
    if (this.lastThrower) {
      const reach = ((this.lastThrower as any).pickupModule?.pickupReach ?? 1.3);
      const throwerZ = Math.max(
        this.lastThrower.position.z,
        this.lastThrower.supportingSurfaceHeight ?? 0,
        this.lastThrower.standingWall ? arena.wallHeight : 0
      );
      const myZ = Math.max(
        this.position.z,
        this.supportingSurfaceHeight ?? 0,
        this.standingWall ? arena.wallHeight : 0
      );
      const dist3D = Math.hypot(
        this.position.x - this.lastThrower.position.x,
        this.position.y - this.lastThrower.position.y,
        myZ - throwerZ
      );
      if (dist3D > reach || this.isRestingOnSurface) {
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

    if (this.hasCollider && this.hasVerticalPosition && arena.walls.length > 0) {
      // Layer 2 threshold: entity is elevated to or resting on layer 2 (wall height)
      const isAtWallLayer = this.position.z >= arena.wallHeight - 0.05 ||
        (this.supportingSurfaceHeight >= arena.wallHeight - 0.05 && this.position.z >= arena.wallHeight - 0.2) ||
        this.standingWall !== null;

      if (isAtWallLayer) {
        const char = this.isCharacter ? (this as any) : null;
        const isDismountFalling = Boolean(char?.climbingModule?.isDismountFreefall || char?.climbingModule?.climbSuppressedUntilRePress);

        if (isDismountFalling) {
          // While in dismount freefall into gap or off wall: entity must fall down to ground!
          this.standingWall = null;
          surfaceHeight = 0;
        } else if (!this.isCharacter) {
          // Freebody object: supported if and only if its collider overlaps an active wall in arena
          const supportingWall = arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius);
          if (supportingWall) {
            this.standingWall = supportingWall;
            surfaceHeight = supportingWall.wallHeight;
          } else {
            this.standingWall = null;
            surfaceHeight = 0;
          }
        } else if (this.standingWall) {
          // Character standing on wall top:
          // Check if this.standingWall still exists in arena (was not deleted)
          const wallStillExists = arena.walls.find(w => w.id === this.standingWall!.id);
          const supportRadius = this.colliderRadius;
          const touchesCurrent = wallStillExists ? arena.testWallOverlap(this.position.x, this.position.y, supportRadius, wallStillExists) : false;

          if (touchesCurrent && wallStillExists) {
            this.standingWall = wallStillExists;
            surfaceHeight = wallStillExists.wallHeight;
          } else if (wallStillExists && char?.climbingModule?.dismountSuppressedUntilRelease) {
            this.standingWall = wallStillExists;
            surfaceHeight = wallStillExists.wallHeight;
          } else {
            let nextSupport: Wall | null = null;
            if (wallStillExists) {
              for (const wall of arena.walls) {
                if (arena.areWallsContiguous(wallStillExists, wall) && arena.testWallOverlap(this.position.x, this.position.y, supportRadius, wall)) {
                  nextSupport = wall;
                  break;
                }
              }
            } else {
              // The wall the character was on was deleted! Find any other active wall overlapping the collider
              nextSupport = arena.getSupportingWall(this.position.x, this.position.y, supportRadius);
            }

            if (nextSupport) {
              this.standingWall = nextSupport;
              surfaceHeight = nextSupport.wallHeight;
            } else {
              // Left the contiguous platform or all supporting walls were deleted! Fall into gap
              this.standingWall = null;
              surfaceHeight = 0;
              if (char?.climbingModule) {
                char.climbingModule.isDismountFreefall = true;
              }
            }
          }
        } else {
          // standingWall not set yet: acquire if resting at wall height and not climbing
          if (!this.isClimbing && (this.position.z >= arena.wallHeight - 0.05 || this.supportingSurfaceHeight >= arena.wallHeight - 0.05)) {
            const wall = arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius);
            if (wall) {
              this.standingWall = wall;
              surfaceHeight = wall.wallHeight;
            }
          }
        }
      } else {
        this.standingWall = null;
      }
    } else {
      this.standingWall = null;
      surfaceHeight = 0;
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
          // Bounce vertically only if impact speed exceeds the single-step gravity increment (prevents infinite micro-bouncing)
          const bounceThreshold = Math.max(0.25, 1.25 * arena.gravity * dt);
          if (!this.isCharacter && this.hasVerticalBounce && this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > bounceThreshold) {
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
          const bounceThreshold = Math.max(0.25, 1.25 * arena.gravity * dt);
          if (this.hasVerticalBounce && this.bounceMod !== null && this.bounceMod > 0 && Math.abs(this.verticalVelocity) > bounceThreshold) {
            this.verticalVelocity = -this.verticalVelocity * this.bounceMod;
          } else {
            this.verticalVelocity = 0;
          }
        }
      }
    }

    // 2. Surface Friction & Rolling Behavior (applies only if resting on surface and has friction)
    const restVzThreshold = Math.max(0.05, 1.1 * arena.gravity * dt);
    const isResting = Math.abs(this.position.z - surfaceHeight) <= 0.02 && Math.abs(this.verticalVelocity) <= restVzThreshold;
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
    // Assist Clamp (Ledge Guard) Lifecycle:
    // - Purely an assist feature; does NOT dictate whether the character is allowed on the wall.
    // - Arming: Enabled once character moves within 0.1 units of the wall.
    // - Disabling: Pressing Space disables the assist clamp, allowing character to walk off without pressing Space again.
    // - Re-arming: Remains disabled until character moves outside the clamp area (> 0.1u) and then back into it (<= 0.1u).
    const char = this.isCharacter ? (this as any) : null;
    const climbMod = char?.climbingModule;
    const wasStandingOnWallTop = !this.isClimbing && this.supportingSurfaceHeight >= arena.wallHeight - 0.05 && this.standingWall !== null;
    const hangDistance = Math.max(0.01, climbMod?.hangDistance ?? 0.10);

    if (climbMod) {
      if (this.position.z <= 0.01) {
        // Grounded: clamp is disarmed, ready to arm when player climbs & enters clamp zone
        climbMod.isAssistClampArmed = false;
        climbMod.hasLeftClampZoneSinceDismount = true;
      } else if (wasStandingOnWallTop && this.standingWall) {
        // Compute distance to current wall platform
        const standing = this.standingWall;
        const platformWalls: Wall[] = [standing];
        for (const w of arena.walls) {
          if (w.id !== standing.id && arena.areWallsContiguous(standing, w)) {
            platformWalls.push(w);
          }
        }
        let distToPlatform = Infinity;
        for (const w of platformWalls) {
          const cx = Math.max(w.x, Math.min(this.position.x, w.x + w.width));
          const cy = Math.max(w.y, Math.min(this.position.y, w.y + w.height));
          const d = Math.hypot(this.position.x - cx, this.position.y - cy);
          if (d < distToPlatform) distToPlatform = d;
        }

        const isInsideClampZone = distToPlatform <= hangDistance + 0.001;

        if (isInsideClampZone) {
          // Inside the clamp zone (within 0.1 units of the wall)
          if (climbMod.hasLeftClampZoneSinceDismount) {
            // Once character moves within 0.1 units of the wall after being outside: clamp is enabled!
            climbMod.isAssistClampArmed = true;
          }
        } else {
          // Outside the clamp zone (> 0.1 units from the wall)
          climbMod.hasLeftClampZoneSinceDismount = true;
          climbMod.isAssistClampArmed = false;
        }

        // Check if character has moved onto the wall platform after climbing
        if (!climbMod.hasMovedOntoWall) {
          const distMoved = Math.hypot(this.position.x - climbMod.mountStartX, this.position.y - climbMod.mountStartY);
          let centerInsideWall = false;
          for (const w of platformWalls) {
            if (this.position.x >= w.x && this.position.x <= w.x + w.width &&
                this.position.y >= w.y && this.position.y <= w.y + w.height) {
              centerInsideWall = true;
              break;
            }
          }
          if (distMoved >= 0.20 || centerInsideWall) {
            climbMod.hasMovedOntoWall = true;
          }
        }
      } else {
        climbMod.isAssistClampArmed = false;
      }
    }

    const isPreventWalkOffActive = Boolean(
      char &&
      wasStandingOnWallTop &&
      climbMod?.enabled &&
      climbMod?.preventWalkOff &&
      climbMod?.isAssistClampArmed
    );

    const deltaX = this.velocity.x * dt;
    const deltaY = this.velocity.y * dt;
    const moveDist = Math.hypot(deltaX, deltaY);

    if (moveDist > 0.0001) {
      if (isPreventWalkOffActive) {
        const hangDistance = Math.max(0.01, char?.climbingModule?.hangDistance ?? 0.10);
        let currentWall = this.standingWall ?? arena.getSupportingWall(this.position.x, this.position.y, hangDistance);
        this.standingWall = currentWall;

        const candidateX = this.position.x + deltaX;
        const candidateY = this.position.y + deltaY;

        // The ledge guard only considers the current platform (current wall and walls contiguous to it)
        const platformWalls: Wall[] = [];
        if (currentWall) {
          platformWalls.push(currentWall);
          for (const w of arena.walls) {
            if (w.id !== currentWall.id && arena.areWallsContiguous(currentWall, w)) {
              platformWalls.push(w);
            }
          }
        }

        let supportedWall: Wall | null = null;
        for (const w of platformWalls) {
          if (arena.testWallOverlap(candidateX, candidateY, hangDistance, w)) {
            supportedWall = w;
            break;
          }
        }

        if (supportedWall) {
          this.position.x = candidateX;
          this.position.y = candidateY;
          this.standingWall = supportedWall;
        } else if (platformWalls.length > 0) {
          // Ledge guard: dual of walking into a wall on the ground.
          // Instead of not being able to enter the wall at all, character cannot move further than hangDistance off the wall.
          // Find closest point on current platform walls ONLY (never jump/clamp to walls across gaps)
          let bestDistSq = Infinity;
          let closest: { wall: Wall; closestX: number; closestY: number; dist: number; dx: number; dy: number } | null = null;

          for (const wall of platformWalls) {
            const cx = Math.max(wall.x, Math.min(candidateX, wall.x + wall.width));
            const cy = Math.max(wall.y, Math.min(candidateY, wall.y + wall.height));
            const dx = candidateX - cx;
            const dy = candidateY - cy;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              closest = { wall, closestX: cx, closestY: cy, dist: Math.sqrt(distSq), dx, dy };
            }
          }

          if (closest && closest.dist > 0) {
            const normalX = closest.dx / closest.dist;
            const normalY = closest.dy / closest.dist;

            // Outward velocity attempting to step into the void beyond hangDistance
            const outwardVel = this.velocity.x * normalX + this.velocity.y * normalY;
            const moveInput = char?.movementInput ?? { x: 0, y: 0 };
            const outwardInput = moveInput.x * normalX + moveInput.y * normalY;

            // Actively pushing against the guardrail: outward velocity or directional input towards the void
            const isPushingAgainstGuardrail = outwardVel > 0.001 || outwardInput > 0.05;

            // Dismounting / disabling wall assist ONLY occurs if actively pushing against the guardrail,
            // and the character has moved onto the wall platform first!
            const canDismount = !climbMod || climbMod.hasMovedOntoWall;
            if (isPushingAgainstGuardrail && char?.isClimbInputHeld && canDismount) {
              if (climbMod) {
                climbMod.isAssistClampArmed = false;
                climbMod.hasLeftClampZoneSinceDismount = false;
              }
              // Allow character to step forward naturally without the guardrail holding them back.
              // Character remains supported on the wall until they naturally walk off the edge!
              this.position.x = candidateX;
              this.position.y = candidateY;
            } else {
              if (outwardVel > 0) {
                // Eliminate the outward velocity, leaving tangential velocity (curves smoothly around corners)
                this.velocity.x -= outwardVel * normalX;
                this.velocity.y -= outwardVel * normalY;
              }

              // Clamp position along the normal to valid hang distance (hangDistance - 0.002) so character is prevented from moving more than hangDistance off walls
              const maxAllowedDist = hangDistance - 0.002;
              if (closest.dist > maxAllowedDist) {
                this.position.x = closest.closestX + normalX * maxAllowedDist;
                this.position.y = closest.closestY + normalY * maxAllowedDist;
              } else {
                this.position.x = candidateX;
                this.position.y = candidateY;
              }

              const newSupport = arena.testWallOverlap(this.position.x, this.position.y, hangDistance, closest.wall)
                ? closest.wall
                : platformWalls.find(w => arena.testWallOverlap(this.position.x, this.position.y, hangDistance, w));
              if (newSupport) {
                this.standingWall = newSupport;
              }
            }
          } else {
            this.velocity.x = 0;
            this.velocity.y = 0;
          }
        }
      } else {
        // Sub-step interpolation approach (continuous collision detection):
        // Step by at most 1 cm per sub-step to catch any gaps or wall transitions between current point and next point
        const stepSize = 0.01;
        const numSteps = Math.max(1, Math.ceil(moveDist / stepSize));
        const stepDx = deltaX / numSteps;
        const stepDy = deltaY / numSteps;
        // Standard movement / dismount / airborne:
        // Interpolate continuously. If at any point between current point and next point the collider
        // wouldn't be touching a wall and they have just dismounted a wall, they should collide with
        // the wall they're heading towards and fall.
        let currentWall = this.standingWall ?? (wasStandingOnWallTop ? arena.getSupportingWall(this.position.x, this.position.y, this.colliderRadius) : null);
        let hasDismountedIntoGap = false;
        const canDismount = !climbMod || climbMod.hasMovedOntoWall;

        for (let s = 1; s <= numSteps; s++) {
          let candX = this.position.x + stepDx;
          let candY = this.position.y + stepDy;

          if (currentWall) {
            let nextSupport: Wall | null = null;
            if (arena.testWallOverlap(candX, candY, this.colliderRadius, currentWall)) {
              nextSupport = currentWall;
            } else {
              for (const w of arena.walls) {
                if (arena.areWallsContiguous(currentWall, w) && arena.testWallOverlap(candX, candY, this.colliderRadius, w)) {
                  nextSupport = w;
                  break;
                }
              }
            }

            if (nextSupport) {
              currentWall = nextSupport;
              this.standingWall = nextSupport;
            } else if (canDismount) {
              // Collider does not touch current wall or any contiguous wall: dismount into gap!
              hasDismountedIntoGap = true;
              currentWall = null;
              this.standingWall = null;
              this.supportingSurfaceHeight = 0;
              if (char?.climbingModule) {
                char.climbingModule.isDismountFreefall = true;
              }
            } else {
              // Has not moved onto the wall yet: keep position supported on current wall
              candX = this.position.x;
              candY = this.position.y;
            }
          }

          this.position.x = candX;
          this.position.y = candY;

          // If dismounted into a gap, airborne, or in dismount falling:
          // Immediately resolve collision with any wall ahead so collider cannot enter another wall across the gap!
          const isFallingInGap = !this.isClimbing && (hasDismountedIntoGap ||
            (!this.standingWall && Boolean(char?.climbingModule?.isDismountFreefall || char?.climbingModule?.climbSuppressedUntilRePress)));

          if (isFallingInGap && this.hasCollider) {
            for (const wall of arena.walls) {
              if (this.position.z <= wall.wallHeight) {
                this.resolveWallCollision(wall);
              }
            }
          }
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
      // A wall only exists physically from z=0 up to wall.wallHeight.
      // If an entity or thrown object is elevated above the wall (z > wall.wallHeight), it flies cleanly over the wall!
      const isDismountFallingNow = Boolean(char?.climbingModule?.isDismountFreefall || char?.climbingModule?.climbSuppressedUntilRePress);
      for (const wall of arena.walls) {
        if (this.position.z <= wall.wallHeight) {
          const isAtWallTop = this.position.z >= wall.wallHeight - 0.05 && !isDismountFallingNow;
          if (isAtWallTop && (this.standingWall?.id === wall.id || arena.testWallOverlap(this.position.x, this.position.y, this.colliderRadius, wall))) {
            continue;
          }
          if (this.position.z < wall.wallHeight - 0.05 || isDismountFallingNow || this.standingWall === null) {
            // If standing on a wall, that wall and its contiguous walls don't collide
            if (this.standingWall && (this.standingWall.id === wall.id || arena.areWallsContiguous(this.standingWall, wall))) {
              continue;
            }
            this.resolveWallCollision(wall);
          }
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
