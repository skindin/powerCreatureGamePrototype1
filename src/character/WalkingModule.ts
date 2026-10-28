import { Vector2D } from "../engine/GameObject.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";
import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

export interface WalkingModuleOptions {
  maxWalkForce?: number;
  maxWalkSpeed?: number;
  canSprint?: boolean;
  maxSprintSpeed?: number;
  sprintPowerCapacity?: number;
  walkPowerCapacity?: number;
  sprintConsumesEnergy?: boolean;
  sprintAllowPartialPower?: boolean;
  walkConsumesEnergy?: boolean;
  walkAllowPartialPower?: boolean;
  consumesEnergy?: boolean;
  dragDamping?: number;
  walkInAir?: boolean;
  airFriction?: number;
  enabled?: boolean;
}

export class WalkingModule {
  public id = "walking";
  public name = "Walking Module";
  public enabled = true;

  // Maximum propulsion / braking force exerted by the character's legs (in Newtons / Force units)
  public maxWalkForceProp: DynamicProperty;

  // Maximum physical leg stride / cadence speed cap (u/s)
  public maxWalkSpeedProp: DynamicProperty;

  // Whether sprinting is allowed
  public canSprint: boolean = true;

  // Explicit maximum speed cap when sprinting (u/s)
  public maxSprintSpeedProp: DynamicProperty;

  // Behavior-driven maximum power capacities (Watts)
  public maxSprintPowerProp!: DynamicProperty;
  public maxWalkPowerProp!: DynamicProperty;

  // Aliases for backwards compatibility
  public get sprintPowerCapacityProp(): DynamicProperty { return this.maxSprintPowerProp; }
  public set sprintPowerCapacityProp(prop: DynamicProperty) { this.maxSprintPowerProp = prop; }
  public get walkPowerCapacityProp(): DynamicProperty { return this.maxWalkPowerProp; }
  public set walkPowerCapacityProp(prop: DynamicProperty) { this.maxWalkPowerProp = prop; }

  // Legacy bus identifiers for backwards compatibility
  public sprintEnergyBusId: string = "bus_main";
  public walkEnergyBusId: string = "bus_main";

  // Energy consumption toggles
  public sprintConsumesEnergy: boolean = false;
  /** Whether sprinting is allowed to run at partial power between walk speed and sprint speed */
  public sprintAllowPartialPower: boolean = true;
  public walkConsumesEnergy: boolean = false;
  /** Whether walking is allowed to run at reduced speed/force when power cannot provide 100% */
  public walkAllowPartialPower: boolean = false;
  public consumesEnergy: boolean = false;

  // Drag damping factor for backwards compatibility / reference
  public dragDamping = 8.01;

  // When enabled, walking force applies in the air, granting air control / steering
  public walkInAir = true;

  // Air friction multiplier applied when airborne (floating friction to stay still)
  public airFrictionProp: DynamicProperty;

  // Planned momentum braking state:
  // When movement input drops to zero, computes the exact force and duration required
  // to brake the character's release velocity to zero. The module continues executing
  // this pre-planned deceleration until the timer expires, without fighting external pushes!
  public isBrakingPlanned: boolean = false;
  public plannedBrakeRemainingTime: number = 0;
  public plannedBrakeDirX: number = 0;
  public plannedBrakeDirY: number = 0;
  public plannedBrakeAccel: number = 0;
  public wasMovingLastTick: boolean = false;

  constructor(options?: WalkingModuleOptions) {
    this.maxWalkForceProp = new DynamicProperty(options?.maxWalkForce ?? 35.0);
    this.maxWalkSpeedProp = new DynamicProperty(options?.maxWalkSpeed ?? 5.2);
    if (options?.canSprint !== undefined) this.canSprint = options.canSprint;
    this.maxSprintSpeedProp = new DynamicProperty(options?.maxSprintSpeed ?? 8.06);
    this.maxSprintPowerProp = new DynamicProperty(options?.sprintPowerCapacity ?? (options as any)?.maxSprintPower ?? 500.0);
    this.maxWalkPowerProp = new DynamicProperty(options?.walkPowerCapacity ?? (options as any)?.maxWalkPower ?? 300.0);
    if (options?.sprintConsumesEnergy !== undefined) this.sprintConsumesEnergy = options.sprintConsumesEnergy;
    if ((options as any)?.sprintAllowPartialPower !== undefined) this.sprintAllowPartialPower = (options as any).sprintAllowPartialPower;
    if (options?.walkConsumesEnergy !== undefined) this.walkConsumesEnergy = options.walkConsumesEnergy;
    if ((options as any)?.walkAllowPartialPower !== undefined) this.walkAllowPartialPower = (options as any).walkAllowPartialPower;
    if (options?.consumesEnergy !== undefined) this.consumesEnergy = options.consumesEnergy;
    if (options?.dragDamping !== undefined) this.dragDamping = options.dragDamping;
    if (options?.walkInAir !== undefined) this.walkInAir = options.walkInAir;
    this.airFrictionProp = new DynamicProperty(options?.airFriction ?? 1.0);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get maxWalkForce(): number {
    return this.maxWalkForceProp.literalValue;
  }

  public set maxWalkForce(val: number) {
    this.maxWalkForceProp.literalValue = val;
  }

  public get maxWalkSpeed(): number {
    return this.maxWalkSpeedProp.literalValue;
  }

  public set maxWalkSpeed(val: number) {
    this.maxWalkSpeedProp.literalValue = val;
  }

  public get maxSprintSpeed(): number {
    return this.maxSprintSpeedProp.literalValue;
  }

  public set maxSprintSpeed(val: number) {
    this.maxSprintSpeedProp.literalValue = val;
  }

  public getMaxSprintSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxSprintSpeedProp.get(registry);
  }

  public get maxSprintPower(): number {
    return this.maxSprintPowerProp.literalValue;
  }

  public set maxSprintPower(val: number) {
    this.maxSprintPowerProp.literalValue = val;
  }

  public getMaxSprintPower(registry?: ObjectPropertiesRegistry): number {
    return this.maxSprintPowerProp.get(registry);
  }

  public get sprintPowerCapacity(): number {
    return this.maxSprintPowerProp.literalValue;
  }

  public set sprintPowerCapacity(val: number) {
    this.maxSprintPowerProp.literalValue = val;
  }

  public getSprintPowerCapacity(registry?: ObjectPropertiesRegistry): number {
    return this.maxSprintPowerProp.get(registry);
  }

  public get maxWalkPower(): number {
    return this.maxWalkPowerProp.literalValue;
  }

  public set maxWalkPower(val: number) {
    this.maxWalkPowerProp.literalValue = val;
  }

  public getMaxWalkPower(registry?: ObjectPropertiesRegistry): number {
    return this.maxWalkPowerProp.get(registry);
  }

  public get walkPowerCapacity(): number {
    return this.maxWalkPowerProp.literalValue;
  }

  public set walkPowerCapacity(val: number) {
    this.maxWalkPowerProp.literalValue = val;
  }

  public getWalkPowerCapacity(registry?: ObjectPropertiesRegistry): number {
    return this.maxWalkPowerProp.get(registry);
  }

  public get airFriction(): number {
    return this.airFrictionProp.literalValue;
  }

  public set airFriction(val: number) {
    this.airFrictionProp.literalValue = val;
  }

  public getMaxWalkForce(registry?: ObjectPropertiesRegistry): number {
    return this.maxWalkForceProp.get(registry);
  }

  public getMaxWalkSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxWalkSpeedProp.get(registry);
  }

  public getAirFriction(registry?: ObjectPropertiesRegistry): number {
    return this.airFrictionProp.get(registry);
  }

  /**
   * Symmetrical Force-Based Locomotion & Air Friction:
   * - Accelerating and stopping step toward target velocity at symmetrical rate:
   *   maxAccel = (maxWalkForce * strength / totalMass) * grip.
   * - On ground, grip scales by ground friction. In air, airFriction applies floating friction to stay still.
   * - Carrying heavy objects increases totalMass, reducing acceleration and smoothly lowering top speed.
   * - When not standing on something (airborne), max speed is not clamped to effective walking speed,
   *   preserving high velocity capacity from launches and jumps while allowing steering and floating friction braking.
   */
  public calculateAchievableInputVelocity(
    character: Character,
    desiredVx: number,
    desiredVy: number,
    arena: Arena
  ): { vx: number; vy: number; speed: number } {
    let vx = desiredVx;
    let vy = desiredVy;
    const r = character.colliderRadius;
    const skin = 0.06;
    const contactDist = r + skin;
    const charZ = character.position.z ?? 0;
    const charX = character.position.x;
    const charY = character.position.y;

    // 1. Arena perimeter boundaries
    if (charX <= contactDist && vx < 0) {
      vx = 0;
    } else if (charX >= arena.width - contactDist && vx > 0) {
      vx = 0;
    }
    if (charY <= contactDist && vy < 0) {
      vy = 0;
    } else if (charY >= arena.height - contactDist && vy > 0) {
      vy = 0;
    }

    // 2. Arena interior physical walls
    if (arena.walls && arena.walls.length > 0) {
      for (const wall of arena.walls) {
        // Walls only block if character is at or below physical wall height
        if (charZ > wall.wallHeight) continue;

        // Closest point on wall AABB
        const cx = Math.max(wall.x, Math.min(charX, wall.x + wall.width));
        const cy = Math.max(wall.y, Math.min(charY, wall.y + wall.height));
        const dx = charX - cx;
        const dy = charY - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq < contactDist * contactDist) {
          const dist = Math.sqrt(distSq);
          let nx = 0;
          let ny = 0;
          if (dist > 0.0001) {
            nx = dx / dist;
            ny = dy / dist;
          } else {
            const vMag = Math.hypot(vx, vy);
            if (vMag > 0.0001) {
              nx = -vx / vMag;
              ny = -vy / vMag;
            }
          }

          const dot = vx * nx + vy * ny;
          if (dot < 0) {
            vx -= dot * nx;
            vy -= dot * ny;
          }
        }
      }
    }

    const speed = Math.hypot(vx, vy);
    return { vx, vy, speed };
  }

  public update(character: Character, inputVector: Vector2D, dt: number, arena: Arena): void {
    const isAirborne = !character.isRestingOnSurface;
    if (!this.enabled || (isAirborne && !this.walkInAir) || character.isClimbing) {
      character.isActivelyWalking = false;
      this.isBrakingPlanned = false;
      return;
    }

    // Walking strictly requires mass and muscle strength to propel the body
    if (!character.hasMass || !character.hasStrength || character.strength <= 0) {
      character.isActivelyWalking = false;
      this.isBrakingPlanned = false;
      return;
    }

    // On ground, feet require friction to push against the floor
    if (!isAirborne && (!character.hasFriction || !character.frictionModule?.enabled || character.dynamicGroundFrictionMod <= 0.001)) {
      character.isActivelyWalking = false;
      this.isBrakingPlanned = false;
      return;
    }

    const inputMag = Math.hypot(inputVector.x, inputVector.y);
    const isMoving = inputMag > 0.05;
    character.isActivelyWalking = isMoving;

    // Total effective mass (base character + any carried object) — used for Newton's 2nd law: a = F/m
    const totalMass = character.hasMass ? Math.max(0.2, character.mass) : 1.0;
    if (totalMass <= 0.01) return;

    // Active grip: on ground, scales by surface friction. In air, airFriction applies floating friction.
    const airFriction = this.airFrictionProp.get(character.properties);
    const grip = isAirborne
      ? airFriction
      : character.dynamicGroundFrictionMod * (arena.frictionCoeff / 10.0);
    if (grip <= 0.001) {
      return;
    }

    // Target velocity:
    // Carrying a load reduces top walking speed smoothly based on carried mass and strength.
    // Sprinting multiplies top speed and propulsion force (if allowed by canSprint).
    const carriedMass = character.carriedMass;
    const loadFactor = carriedMass / (Math.max(0.1, character.strength) * 8.0);
    const isActivelySprinting = this.canSprint && character.isSprinting;

    // Sprint falls back to a walk while energyPool is exhausted or has zero stamina
    let sprintingNow = isActivelySprinting;
    if (sprintingNow && this.sprintConsumesEnergy) {
      const ep = character.energyPool;
      if (ep && (ep.isExhausted || ep.getCurrentStamina(character.properties) <= 0.0001)) {
        sprintingNow = false;
        character.setSprinting(false);
      }
    }

    const maxWalkForce = this.maxWalkForceProp.get(character.properties);
    const maxWalkSpeed = this.maxWalkSpeedProp.get(character.properties);
    const maxSprintSpeed = this.maxSprintSpeedProp.get(character.properties);

    let effectiveWalkForce = sprintingNow ? maxWalkForce * 1.5 : maxWalkForce;
    let effectiveTargetSpeed = sprintingNow ? maxSprintSpeed : maxWalkSpeed;

    const baseWalkTargetSpeed = maxWalkSpeed / (1.0 + loadFactor);
    const sprintTargetSpeed = maxSprintSpeed / (1.0 + loadFactor);
    const g = 9.81;

    // Biomechanical Physics: Continuous locomotion metabolic power maintains velocity against
    // ground contact resistance and mechanical work.
    // Mechanical power: P_mech = F_res * v = (totalMass * g * Cr) * v
    // Metabolic power: P_metabolic = P_mech / 0.25 (muscle efficiency = 25%)
    // Cr is the gait resistance coefficient: Cr ~ 0.40 for sprinting, Cr ~ 0.28 for walking.
    if (isMoving) {
      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;

      if (sprintingNow && this.sprintConsumesEnergy) {
        const pool = character.energyPool;
        if (pool) {
          const CrSprint = 0.40;
          const resForceSprint = totalMass * g * CrSprint;
          const fullSprintWatts = (resForceSprint * sprintTargetSpeed) / 0.25;
          const sprintCap = this.maxSprintPowerProp.get(character.properties);

          // Project desired sprint velocity against contacted walls/boundaries
          const { speed: achievableInputSpeed } = this.calculateAchievableInputVelocity(
            character,
            dirX * sprintTargetSpeed,
            dirY * sprintTargetSpeed,
            arena
          );

          let requestedWatts = 0;
          if (achievableInputSpeed <= 0.001) {
            // Completely blocked flush into a wall or corner: NO energy consumed
            requestedWatts = 0;
          } else if (achievableInputSpeed <= baseWalkTargetSpeed) {
            // When moving at or below walking speed, only charge energy if walking itself consumes energy
            if (this.walkConsumesEnergy) {
              const CrWalk = 0.28;
              const resForceWalk = totalMass * g * CrWalk;
              const maxWalkWatts = (resForceWalk * baseWalkTargetSpeed) / 0.25;
              const walkRatio = baseWalkTargetSpeed > 0.001 ? achievableInputSpeed / baseWalkTargetSpeed : 0;
              requestedWatts = maxWalkWatts * walkRatio;
            } else {
              requestedWatts = 0;
            }
          } else {
            // Moving faster than walk speed: scale additional sprint power above walking baseline
            const excessSpeed = achievableInputSpeed - baseWalkTargetSpeed;
            const maxExcessSpeed = Math.max(0.001, sprintTargetSpeed - baseWalkTargetSpeed);
            const excessRatio = Math.min(1.0, Math.max(0, excessSpeed / maxExcessSpeed));

            if (this.walkConsumesEnergy) {
              const CrWalk = 0.28;
              const resForceWalk = totalMass * g * CrWalk;
              const maxWalkWatts = (resForceWalk * baseWalkTargetSpeed) / 0.25;
              requestedWatts = maxWalkWatts + (fullSprintWatts - maxWalkWatts) * excessRatio;
            } else {
              requestedWatts = fullSprintWatts * excessRatio;
            }
          }

          if (requestedWatts > sprintCap) {
            requestedWatts = this.sprintAllowPartialPower ? sprintCap : 0;
          }

          // If requestedWatts is 0 (blocked by wall), consume 0 watts
          if (requestedWatts <= 0.0001) {
            pool.registerDemand("locomotion", 0, this.sprintAllowPartialPower);
            effectiveTargetSpeed = sprintTargetSpeed * (1.0 + loadFactor);
            effectiveWalkForce = maxWalkForce;
          } else {
            const minSprintWatts = this.sprintAllowPartialPower ? 1.0 : (requestedWatts - 0.001);

            // Check if pool can support sprinting in isolation:
            const canSprintEitherWay = pool.canSupportPowerInIsolation(
              requestedWatts,
              minSprintWatts,
              dt,
              character.properties
            );

            if (!canSprintEitherWay) {
              // True exhaustion or exceeding capacity: step down to walk
              character.setSprinting(false);
              sprintingNow = false;
              effectiveWalkForce = maxWalkForce;
              effectiveTargetSpeed = maxWalkSpeed;
              pool.registerDemand("locomotion", 0, this.sprintAllowPartialPower);
            } else {
              const peekedWatts = pool.peekPower(requestedWatts, dt, character.properties, false, this.sprintAllowPartialPower, "locomotion");

              if (peekedWatts < minSprintWatts) {
                // Contention starvation: competing abilities are consuming capacity.
                // Step down to base walk for this frame
                sprintingNow = false;
                effectiveWalkForce = maxWalkForce;
                effectiveTargetSpeed = maxWalkSpeed;
                pool.registerDemand("locomotion", 0, this.sprintAllowPartialPower);

                // If walking also consumes energy, request walking power instead
                if (this.walkConsumesEnergy) {
                  const CrWalk = 0.28;
                  const resForceWalk = totalMass * g * CrWalk;
                  const rawWalkWatts = (resForceWalk * baseWalkTargetSpeed) / 0.25;
                  const walkCap = this.maxWalkPowerProp.get(character.properties);
                  let walkRequested = rawWalkWatts;
                  if (walkRequested > walkCap) {
                    walkRequested = this.walkAllowPartialPower ? walkCap : 0;
                  }
                  const walkGranted = pool.requestPower(walkRequested, dt, character.properties, false, "locomotion", this.walkAllowPartialPower);
                  const fraction = walkRequested > 0 ? Math.min(1, walkGranted / walkRequested) : 0;
                  if (fraction <= 0 || (!this.walkAllowPartialPower && fraction < 1.0)) {
                    effectiveWalkForce = 0;
                    effectiveTargetSpeed = 0;
                    character.isActivelyWalking = false;
                  } else {
                    effectiveWalkForce *= fraction;
                    effectiveTargetSpeed *= fraction;
                  }
                }
              } else {
                // Pool can grant sprint power! Request sprint power:
                const grantedWatts = pool.requestPower(requestedWatts, dt, character.properties, false, "locomotion", this.sprintAllowPartialPower);
                if (grantedWatts < minSprintWatts) {
                  sprintingNow = false;
                  effectiveWalkForce = maxWalkForce;
                  effectiveTargetSpeed = maxWalkSpeed;
                } else {
                  effectiveTargetSpeed = sprintTargetSpeed * (1.0 + loadFactor);
                  effectiveWalkForce = maxWalkForce * 1.5;
                }
              }
            }
          }
        }
      } else if (!sprintingNow && this.walkConsumesEnergy) {
        const pool = character.energyPool;
        if (pool) {
          const { speed: achievableWalkSpeed } = this.calculateAchievableInputVelocity(
            character,
            dirX * baseWalkTargetSpeed,
            dirY * baseWalkTargetSpeed,
            arena
          );
          if (achievableWalkSpeed <= 0.001) {
            pool.registerDemand("locomotion", 0, this.walkAllowPartialPower);
            effectiveWalkForce = 0;
            effectiveTargetSpeed = 0;
            character.isActivelyWalking = false;
          } else {
            const Cr = 0.28;
            const resForce = totalMass * g * Cr;
            const rawWatts = (resForce * achievableWalkSpeed) / 0.25;
            const walkCap = this.maxWalkPowerProp.get(character.properties);
            let requestedWatts = rawWatts;
            if (requestedWatts > walkCap) {
              requestedWatts = this.walkAllowPartialPower ? walkCap : 0;
            }
            const grantedWatts = pool.requestPower(requestedWatts, dt, character.properties, false, "locomotion", this.walkAllowPartialPower);
            const fraction = requestedWatts > 0 ? Math.min(1, grantedWatts / requestedWatts) : 0;
            if (fraction <= 0 || (!this.walkAllowPartialPower && fraction < 1.0)) {
              effectiveWalkForce = 0;
              effectiveTargetSpeed = 0;
              character.isActivelyWalking = false;
            } else {
              effectiveWalkForce *= fraction;
              effectiveTargetSpeed *= fraction;
            }
          }
        }
      }
    }

    const effectiveSpeed = effectiveTargetSpeed / (1.0 + loadFactor);
    const maxAccel = ((effectiveWalkForce * character.strength) / totalMass) * grip;

    if (isMoving) {
      // 1. ACTIVE INPUT: Steer and accelerate toward target velocity
      this.isBrakingPlanned = false;
      this.wasMovingLastTick = true;

      const dirX = inputVector.x / inputMag;
      const dirY = inputVector.y / inputMag;

      let targetVx = 0;
      let targetVy = 0;
      if (isAirborne) {
        // When not standing on something, do not clamp max speed to effective walking speed!
        // Preserve any higher velocity capacity (e.g. launches, high-speed jumps).
        const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
        const airTargetSpeed = Math.max(effectiveSpeed, currentSpeed);
        targetVx = dirX * airTargetSpeed;
        targetVy = dirY * airTargetSpeed;
      } else {
        targetVx = dirX * effectiveSpeed;
        targetVy = dirY * effectiveSpeed;
      }

      // Velocity difference to reach target
      const diffX = targetVx - character.velocity.x;
      const diffY = targetVy - character.velocity.y;
      const diffSpeed = Math.hypot(diffX, diffY);

      if (diffSpeed < 0.001) {
        character.velocity.x = targetVx;
        character.velocity.y = targetVy;
        return;
      }

      const maxStep = maxAccel * dt;
      if (diffSpeed <= maxStep) {
        character.velocity.x = targetVx;
        character.velocity.y = targetVy;
      } else {
        const stepRatio = maxStep / diffSpeed;
        character.velocity.x += diffX * stepRatio;
        character.velocity.y += diffY * stepRatio;
      }
    } else {
      // 2. NO INPUT: Pre-planned momentum braking
      const currentSpeed = Math.hypot(character.velocity.x, character.velocity.y);
      const staticThreshold = Math.max(0.02, arena.staticFrictionThreshold * character.staticGroundFrictionMod);

      // Arm pre-planned braking ONLY if we just transitioned from active movement!
      if (!this.isBrakingPlanned && this.wasMovingLastTick) {
        this.wasMovingLastTick = false;
        if (currentSpeed > staticThreshold && maxAccel > 0.001) {
          this.isBrakingPlanned = true;
          this.plannedBrakeRemainingTime = currentSpeed / maxAccel;
          this.plannedBrakeDirX = character.velocity.x / currentSpeed;
          this.plannedBrakeDirY = character.velocity.y / currentSpeed;
          this.plannedBrakeAccel = maxAccel;
        } else {
          // Already essentially still: zero out immediately to prevent microscopic drift
          if (!isAirborne && currentSpeed < staticThreshold) {
            character.velocity.x = 0;
            character.velocity.y = 0;
          }
          return;
        }
      } else if (!this.isBrakingPlanned) {
        // Idle state: not executing a planned brake, do not fight external forces!
        this.wasMovingLastTick = false;
        return;
      }

      // Execute planned braking for this frame
      if (this.isBrakingPlanned) {
        const stepDt = Math.min(dt, this.plannedBrakeRemainingTime);
        const decelStep = this.plannedBrakeAccel * stepDt;

        // Apply pre-planned opposing deceleration
        character.velocity.x -= this.plannedBrakeDirX * decelStep;
        character.velocity.y -= this.plannedBrakeDirY * decelStep;

        this.plannedBrakeRemainingTime -= dt;

        // Check if pre-planned braking window has completed
        if (this.plannedBrakeRemainingTime <= 0.0001) {
          this.isBrakingPlanned = false;
          // If deceleration brought the character to rest (no new external push during braking),
          // ensure clean zero velocity
          const dot = character.velocity.x * this.plannedBrakeDirX + character.velocity.y * this.plannedBrakeDirY;
          if (dot <= staticThreshold) {
            // Velocity along the original braking axis was brought to 0
            character.velocity.x -= dot * this.plannedBrakeDirX;
            character.velocity.y -= dot * this.plannedBrakeDirY;
          }
          const postSpeed = Math.hypot(character.velocity.x, character.velocity.y);
          if (!isAirborne && postSpeed < staticThreshold) {
            character.velocity.x = 0;
            character.velocity.y = 0;
          }
        }
      }
    }
  }
}
