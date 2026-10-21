import { GameObject, Vector2D } from "../engine/GameObject.js";
import { WalkingModule } from "./WalkingModule.js";
import { PickupModule } from "./PickupModule.js";
import { ThrowModule, TrajectoryCalculation } from "./ThrowModule.js";
import { ClimbingModule } from "./ClimbingModule.js";
import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import { JumpModule } from "./JumpModule.js";
import { WallEdgeAssistModule } from "./WallEdgeAssistModule.js";
import { HealthModule } from "./HealthModule.js";
import { DamageSolverModule } from "../engine/DamageSolverModule.js";
import type { Arena } from "../engine/Arena.js";
import { CharacterModule, type CharacterRole } from "./CharacterModule.js";
import { EnergyPool } from "./EnergyPool.js";
import { ConsumeModule } from "./ConsumeModule.js";
import { LaserModule } from "./LaserModule.js";
import { MeleeModule, type MeleeHitResult } from "./MeleeModule.js";

export type CharacterControllerType = "local" | "ai" | "remote" | "none";
export type { CharacterRole };

export interface AnticipatedModifier {
  id: string;
  abilityId: string;
  name: string;
  color: string;
  amount: number;
  isBurst: boolean;
  isPositive?: boolean;
  order?: number;
}

export class Character extends GameObject {
  public strengthProp: DynamicProperty;

  public get hasStrength(): boolean {
    return this.strength > 0;
  }

  public get strength(): number {
    return this.strengthProp.get(this.properties);
  }

  public set strength(val: number) {
    this.strengthProp.set(Math.max(0.1, val), this.properties);
  }

  public facingAngle: number; // Angle in radians
  public lastMovementInputAngle = 0; // Most recent movement input angle in radians
  public lastThrowAimAngle?: number; // Preserved direction angle from character to cursor when throw mode was active
  public savedArcRatio?: number; // Preserved trajectory ratio between min and max arcs (never reset per character)
  public hasUserSetArcRatio: boolean = false;
  public heldObject: GameObject | null;

  public override isCharacter = true;
  public isActivelyWalking = false;
  public isClimbInputHeld = false;
  public movementInput: Vector2D = { x: 0, y: 0 };
  public isSprinting = false;
  public onSprintChange?: (isSprinting: boolean) => void;

  public setSprinting(sprint: boolean): void {
    if (this.isSprinting !== sprint) {
      this.isSprinting = sprint;
      this.onSprintChange?.(this.isSprinting);
    }
  }

  // Base mass when not carrying anything
  public baseMass = 1.2;

  /** Spawn location used when respawning or resetting */
  public spawnPos?: { x: number; y: number; z?: number };

  /**
   * Effective mass: base character mass plus the mass of any currently carried object.
   */
  public override get mass(): number {
    const base = this.hasMass && this.rigidbodyModule ? this.rigidbodyModule.massProp.get(this.properties) : 0;
    const carried = (this.heldObject && this.heldObject.hasMass) ? this.heldObject.mass : 0;
    return base + carried;
  }

  public override set mass(val: number) {
    this.baseMass = Math.max(0.1, val);
    if (this.rigidbodyModule) {
      this.rigidbodyModule.massProp.set(this.baseMass, this.properties);
    }
  }

  public get carriedMass(): number {
    return (this.heldObject && this.heldObject.hasMass) ? this.heldObject.mass : 0;
  }

  public get hangDistance(): number {
    return this.wallEdgeAssistModule ? this.wallEdgeAssistModule.hangDistanceProp.get(this.properties) : 0.10;
  }

  public set hangDistance(val: number) {
    if (this.wallEdgeAssistModule) {
      this.wallEdgeAssistModule.hangDistanceProp.set(Math.max(0, val), this.properties);
    }
  }

  // Removable Modules
  public walkingModule: WalkingModule | null;
  public pickupModule: PickupModule | null;
  public throwModule: ThrowModule | null;
  public jumpModule: JumpModule | null;
  public wallEdgeAssistModule: WallEdgeAssistModule | null;
  public climbingModule: ClimbingModule | null;
  public healthModule: HealthModule | null;
  public consumeModule: ConsumeModule | null = new ConsumeModule();
  public laserModule: LaserModule | null = null;
  public energyPool: EnergyPool | null;

  /** Backwards compatibility getter for energy bus references */
  public get energyBus(): EnergyPool | null {
    return this.energyPool;
  }
  public get energyBusses(): Map<string, EnergyPool> {
    const map = new Map<string, EnergyPool>();
    if (this.energyPool) map.set(this.energyPool.id, this.energyPool);
    return map;
  }
  public getEnergyBus(_busId?: string): EnergyPool | null {
    return this.energyPool;
  }

  /** Toggle indicating if jumping consumes energy from EnergyPool */
  public jumpConsumesEnergy: boolean = true;
  /** Whether jumping is allowed to run at partial impulse when pool power cannot provide 100% */
  public jumpAllowPartialPower: boolean = false;
  public jumpMaxPowerProp: DynamicProperty;

  // Backwards-compatible aliases
  public get jumpPowerCapacityProp(): DynamicProperty { return this.jumpMaxPowerProp; }
  public set jumpPowerCapacityProp(prop: DynamicProperty) { this.jumpMaxPowerProp = prop; }

  // Player identity & multiplayer slot
  public controllerType: CharacterControllerType = "local";
  public playerId: string = "keyboard";
  public playerNumber: number = 1;
  public playerColor: string = "#f59e0b";
  public hasCustomName: boolean = false;

  public get role(): CharacterRole {
    return this.characterModule ? this.characterModule.role : "local_player";
  }

  public set role(val: CharacterRole) {
    if (this.characterModule) {
      this.characterModule.role = val;
    } else {
      this.characterModule = new CharacterModule({ role: val });
    }
  }

  public get isDummy(): boolean {
    return this.role === "dummy";
  }

  // Aiming state
  public isAiming: boolean;
  public aimTarget: Vector2D | null;
  public activeTrajectory: TrajectoryCalculation | null;

  // Laser aiming/firing inputs processed per tick
  public isLaserAiming: boolean = false;
  public isLaserFiring: boolean = false;
  public laserAimTarget: { x: number; y: number } | null = null;
  public laserCandidateEntities?: GameObject[];
  public laserPowerFraction: number = 1.0;

  // Melee attack inputs processed per tick
  public meleeModule: MeleeModule | null = null;
  public isMeleeRequested: boolean = false;
  public meleeAimDir: { x: number; y: number } | null = null;
  public meleeCandidateEntities?: GameObject[];

  /**
   * Retrieves any currently anticipated energy modifiers (e.g. previewing throw trajectory cost, charging jump, etc.).
   * These provide a ghostly preview of the energy cost before committing to the action.
   */
  public getAnticipatedModifiers(): AnticipatedModifier[] {
    const list: AnticipatedModifier[] = [];

    // 1. Throw Trajectory Preview Anticipated Modifier
    if (
      this.activeTrajectory &&
      this.heldObject &&
      this.throwModule &&
      this.throwModule.enabled &&
      this.throwModule.consumesEnergy
    ) {
      const launchVel = this.activeTrajectory.launchVel;
      if (launchVel) {
        const heldMass = this.heldObject.hasMass ? Math.max(0.1, this.heldObject.mass) : 1.0;
        const actualLaunchSpeed = Math.hypot(launchVel.vx, launchVel.vy, launchVel.vz);
        const mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
        const pool = this.energyPool;
        const poolEfficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(this.properties) : 0.25);
        let metabolicJoules = Math.max(5, mechWorkJoules / poolEfficiency);

        // A single burst action cannot exceed the throw ability's power rating * strength,
        // available stamina Joules, or pool reserves:
        if (pool && pool.enabled) {
          const throwCap = this.throwModule.maxPowerProp.get(this.properties);
          const currentStamina = pool.currentStaminaProp.get(this.properties);
          const poolEnergy = pool.infiniteEnergy ? Infinity : pool.getCurrentEnergy(this.properties);
          const maxDeliverable = Math.min(
            throwCap * this.strength,
            currentStamina,
            poolEnergy
          );
          metabolicJoules = Math.min(metabolicJoules, maxDeliverable);
        }

        list.push({
          id: "anticipated_throw",
          abilityId: "throw",
          name: "Throw",
          color: "#f43f5e",
          amount: Math.round(metabolicJoules),
          isBurst: true,
          isPositive: false,
          order: 950,
        });
      }
    }

    // Laser Blast Anticipated Modifier
    if (this.laserModule && this.laserModule.enabled && this.laserModule.isAiming && !this.laserModule.isFiring) {
      const demandedPower = this.laserModule.calculateDemandedPower(
        this.properties,
        this.laserPowerFraction > 0 ? this.laserPowerFraction : 1.0
      );
      if (demandedPower > 0) {
        list.push({
          id: "anticipated_laser",
          abilityId: "laser_blast",
          name: "Laser",
          color: "#06b6d4",
          amount: Math.round(demandedPower),
          isBurst: false,
          isPositive: false,
          order: 940,
        });
      }
    }

    return list;
  }

  public isUsingItem: boolean = false;
  public eatRateWatts: number = 0;

  public canConsumeHeldObject(): boolean {
    return this.consumeModule ? this.consumeModule.canConsume(this.heldObject) : false;
  }

  /**
   * Returns true if the currently held object has an inherent primary ability other than throw.
   */
  public hasPrimaryItemAbility(): boolean {
    if (!this.heldObject) return false;
    return this.canConsumeHeldObject();
  }

  /**
   * Returns true if the held object's primary ability does not require directional aiming (e.g. eating food).
   */
  public isPrimaryAbilityNonDirectional(): boolean {
    if (!this.heldObject) return false;
    if (this.canConsumeHeldObject()) {
      return this.consumeModule ? !this.consumeModule.involvesDirection : true;
    }
    return false;
  }

  public get isEatingFood(): boolean {
    return Boolean(this.canConsumeHeldObject() && this.isUsingItem);
  }

  public get isConsumingItem(): boolean {
    return Boolean(this.canConsumeHeldObject() && this.isUsingItem);
  }

  /**
   * Drops or unholds the currently held object safely.
   */
  public unhold(): GameObject | null {
    if (!this.heldObject) return null;
    const obj = this.heldObject;
    this.heldObject = null;
    obj.isHeld = false;
    obj.heldBy = null;
    return obj;
  }

  constructor(options: {
    id?: string;
    position?: { x: number; y: number; z?: number };
    x?: number;
    y?: number;
    color?: string;
    mass?: number;
    colliderRadius?: number;
    strength?: number;
    playerId?: string;
    playerNumber?: number;
    name?: string;
    hasCustomName?: boolean;
    controllerType?: CharacterControllerType;
    role?: CharacterRole;
    characterModule?: CharacterModule | null;
    randomSpawn?: boolean;
    dynamicGroundFrictionMod?: number;
    staticGroundFrictionMod?: number;
  } = {}) {
    const initialColor = options.color ?? "#f59e0b";
    const determinedRole: CharacterRole = options.role ?? (
      options.controllerType === "none"
        ? "dummy"
        : options.controllerType === "remote"
        ? "remote_player"
        : options.controllerType === "ai"
        ? "local_ai"
        : "local_player"
    );
    const initialCharacterModule = options.characterModule !== undefined
      ? options.characterModule
      : new CharacterModule({ role: determinedRole });

    const defaultSpawn = determinedRole !== "dummy"
      ? HealthModule.getRandomSpawnPosition()
      : { x: 5.0, y: 7.0, z: 0 };

    const useRandom = options.randomSpawn ?? (options.position === undefined && options.x === undefined && determinedRole !== "dummy");
    const initX = useRandom ? defaultSpawn.x : (options.position ? options.position.x : (options.x ?? defaultSpawn.x));
    const initY = useRandom ? defaultSpawn.y : (options.position ? options.position.y : (options.y ?? defaultSpawn.y));
    const initZ = useRandom ? defaultSpawn.z : (options.position?.z ?? (options.x !== undefined ? 0 : defaultSpawn.z));

    super({
      id: options.id,
      name: options.name ?? (determinedRole === "dummy" ? "Sparring Dummy" : `Player ${options.playerNumber ?? 1}`),
      position: { x: initX, y: initY, z: initZ },
      mass: options.mass ?? 1.2,
      colliderRadius: options.colliderRadius ?? 0.44,
      color: initialColor,
      bounceMod: 0.1,
      dynamicGroundFrictionMod: options.dynamicGroundFrictionMod ?? 2.0,
      staticGroundFrictionMod: options.staticGroundFrictionMod ?? 2.0,
      damageSolverModule: options.damageSolverModule !== undefined ? options.damageSolverModule : new DamageSolverModule(),
      characterModule: initialCharacterModule,
    });

    this.controllerType = options.controllerType ?? (determinedRole === "dummy" ? "none" : "local");
    this.playerId = options.playerId ?? (determinedRole === "dummy" ? "dummy-1" : "keyboard");
    this.playerNumber = options.playerNumber !== undefined ? options.playerNumber : (determinedRole === "dummy" ? 0 : 1);
    this.playerColor = initialColor;
    const isExplicitCustom = options.name
      ? (!/^Player(\s+\d+)?$/i.test(options.name.trim()) && !/^Controller\s+#\d+$/i.test(options.name.trim()))
      : false;
    this.hasCustomName = options.hasCustomName ?? isExplicitCustom;

    this.baseMass = options.mass ?? 1.2;
    this.facingAngle = 0;
    this.heldObject = null;
    this.isAiming = false;
    this.aimTarget = null;
    this.activeTrajectory = null;

    // Native dynamic strength property
    this.strengthProp = new DynamicProperty(options.strength ?? (determinedRole === "dummy" ? 0 : 1.0));
    this.properties.add("strength", this.strengthProp.literalValue);

    // Initialize default modular capabilities
    // Dummies are inert physical targets with health and damage solver; they do not have active player abilities
    if (determinedRole === "dummy") {
      this.walkingModule = null;
      this.pickupModule = null;
      this.throwModule = null;
      this.jumpModule = null;
      this.wallEdgeAssistModule = null;
    } else {
      this.walkingModule = new WalkingModule({
        walkConsumesEnergy: false,
        walkAllowPartialPower: false,
        sprintConsumesEnergy: true,
        sprintAllowPartialPower: true,
      });

      this.pickupModule = new PickupModule({ consumesEnergy: false, allowPartialPower: false });
      this.throwModule = new ThrowModule({ consumesEnergy: true });

      this.jumpModule = new JumpModule();
      this.jumpConsumesEnergy = true;
      this.jumpAllowPartialPower = true;

      this.wallEdgeAssistModule = new WallEdgeAssistModule();
    }
    this.jumpMaxPowerProp = new DynamicProperty(1200.0);
    this.climbingModule = null; // Climbing module removed from default character (addable via DevPanel)
    this.healthModule = new HealthModule({ consumesEnergy: true, allowPartialPower: true });
    this.energyPool = new EnergyPool();
    this.properties.add("hpPerJoule", this.healthModule.hpPerJoule);
    this.properties.add("muscleEfficiency", this.energyPool.muscleEfficiency);
    if (!this.damageSolverModule) {
      this.damageSolverModule = new DamageSolverModule();
    }
    this.meleeModule = new MeleeModule({
      maxForce: 350.0,
      punchFrequency: 4.0,
      reach: 1.2,
      width: 0.8,
      maxPower: 2000.0,
    });
    this.properties.add("meleeMaxForce", this.meleeModule.maxForce);
    this.properties.add("meleeFrequency", this.meleeModule.punchFrequency);
    this.properties.add("meleeReach", this.meleeModule.reach);
    this.properties.add("meleeWidth", this.meleeModule.width);
    this.properties.add("meleeMaxPower", this.meleeModule.maxPower);

    if (determinedRole !== "dummy") {
      this.laserModule = new LaserModule({
        maxPower: 2000.0,
      });
      this.properties.add("laserDamageRate", this.laserModule.damageRate);
      this.properties.add("laserMaxDamageRate", this.laserModule.maxDamageRate);
      this.properties.add("laserThickness", this.laserModule.thickness);
      this.properties.add("laserMaxPower", this.laserModule.maxPower);
    }
  }

  public get jumpMaxPower(): number {
    return this.jumpMaxPowerProp.literalValue;
  }
  public set jumpMaxPower(val: number) {
    this.jumpMaxPowerProp.literalValue = val;
  }
  public getJumpMaxPower(registry?: ObjectPropertiesRegistry): number {
    return this.jumpMaxPowerProp.get(registry);
  }

  public get jumpPowerCapacity(): number {
    return this.jumpMaxPowerProp.literalValue;
  }
  public set jumpPowerCapacity(val: number) {
    this.jumpMaxPowerProp.literalValue = val;
  }
  public getJumpPowerCapacity(registry?: ObjectPropertiesRegistry): number {
    return this.jumpMaxPowerProp.get(registry);
  }

  /**
   * Attempts to jump using the attached JumpModule.
   */
  public jump(arena?: Arena, movementInput?: Vector2D): boolean {
    if (!this.jumpModule || !this.jumpModule.enabled || !this.hasVerticalPosition) {
      return false;
    }

    // A jump can ONLY occur from a supporting surface (ground or wall top).
    // If airborne, do NOT consume energy!
    const surfaceZ = this.supportingSurfaceHeight ?? 0;
    const isGrounded = this.isRestingOnSurface ||
      (Math.abs(this.position.z - surfaceZ) <= 0.08 && Math.abs(this.verticalVelocity) <= 0.8);

    if (!isGrounded || this.isHeld) {
      return false;
    }

    // Base unencumbered target takeoff speed (aiming for standard jump height)
    const baseMass = Math.max(0.2, this.baseMass ?? 1.2);
    const totalMass = Math.max(0.2, this.mass);
    const jumpStrength = this.jumpModule.jumpStrengthProp.get(this.properties);
    const maxInitialSpeed = this.jumpModule.maxInitialSpeedProp.get(this.properties);
    const targetTakeoffSpeed = Math.min(maxInitialSpeed, jumpStrength / baseMass);

    if (targetTakeoffSpeed <= 0.01) return false;

    // Target mechanical work needed to propel the full total mass (creature + held item) to normal jump height:
    // W_mech = 0.5 * totalMass * targetTakeoffSpeed^2
    const mechanicalJoules = 0.5 * totalMass * (targetTakeoffSpeed * targetTakeoffSpeed);
    const pool = this.energyPool;
    const efficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(this.properties) : 0.25);
    const rawMetabolicJoules = Math.max(15, mechanicalJoules / efficiency);
    const jumpCap = this.jumpMaxPowerProp ? this.jumpMaxPowerProp.get(this.properties) : 1200;
    let metabolicJoules = rawMetabolicJoules;
    if (metabolicJoules > jumpCap) {
      if (!this.jumpAllowPartialPower) {
        return false;
      }
      metabolicJoules = jumpCap;
    }

    let energyFraction = 1.0;
    if (this.jumpConsumesEnergy) {
      if (pool) {
        if (pool.isExhausted) {
          return false;
        }
        if (!this.jumpAllowPartialPower && !pool.canSatisfyFullEnergy(metabolicJoules, 0.05, this.properties)) {
          return false;
        }
        const burstRes = pool.requestInstantBurst({
          abilityId: "jump",
          demandedJoules: metabolicJoules,
          allowPartialPower: this.jumpAllowPartialPower,
          registry: this.properties
        });
        if (!burstRes.granted || burstRes.grantedJoules <= 0.001 || (!this.jumpAllowPartialPower && burstRes.fraction < 1.0)) {
          return false;
        }
        energyFraction = burstRes.fraction * (metabolicJoules / rawMetabolicJoules);
      }
    }

    const jumped = this.jumpModule.jump(this, arena, movementInput);
    if (jumped) {
      // Set takeoff velocity to the target speed scaled by available energy fraction:
      // If full energy is granted, creature reaches full standard jump height even with heavy load!
      // If energy is rationed or partial, velocity scales by sqrt(energyFraction) (E ∝ v²).
      const achievableSpeed = targetTakeoffSpeed * Math.sqrt(energyFraction);
      this.verticalVelocity = achievableSpeed;
    }
    return jumped;
  }

  /**
   * Attempts to execute a burst melee punch attack in the specified or current facing direction.
   */
  public melee(
    arena: Arena,
    potentialTargets: GameObject[],
    dirX?: number,
    dirY?: number
  ): MeleeHitResult | null {
    if (!this.meleeModule || !this.meleeModule.enabled) return null;
    const dx = dirX !== undefined ? dirX : Math.cos(this.facingAngle ?? 0);
    const dy = dirY !== undefined ? dirY : Math.sin(this.facingAngle ?? 0);
    return this.meleeModule.executePunch(this, dx, dy, potentialTargets, arena);
  }

  /**
   * Safely releases any held objects, clears references, and dismounts
   * when this character is removed from the arena.
   */
  public cleanupBeforeRemoval(): void {
    if (this.heldObject) {
      this.heldObject.isHeld = false;
      this.heldObject.heldBy = null;
      this.heldObject = null;
    }
    if (this.isHeld && this.heldBy) {
      if (this.heldBy instanceof Character && this.heldBy.heldObject === this) {
        this.heldBy.heldObject = null;
      }
      this.isHeld = false;
      this.heldBy = null;
    }
    this.activeTrajectory = null;
    this.isActivelyWalking = false;
    this.isSprinting = false;
  }

  /**
   * Updates character facing direction:
   * Faces in the direction the player is aiming. If not aiming (or no aim function),
   * faces in the direction the player INTENDS to move (movement input), not post-collision velocity.
   */
  public updateFacingDirection(
    isAimingInput: boolean,
    aimTargetPos: Vector2D | null,
    movementInput?: Vector2D,
    hasAuthoredFacingAngle = false
  ): void {
    if (hasAuthoredFacingAngle) return;
    // While aiming or firing laser, keep character strictly facing the laser aim target
    if ((this.isLaserAiming || this.isLaserFiring) && this.laserAimTarget) {
      const dx = this.laserAimTarget.x - this.position.x;
      const dy = this.laserAimTarget.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }

    // When holding an object:
    // If the object's primary ability does not involve direction and we are not aiming throw (isAimingInput is false),
    // the character should NOT face the mouse cursor and should face movement direction instead!
    const shouldFaceCursor = this.heldObject && aimTargetPos && (!this.isPrimaryAbilityNonDirectional() || isAimingInput);

    if (shouldFaceCursor && aimTargetPos) {
      const dx = aimTargetPos.x - this.position.x;
      const dy = aimTargetPos.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }

    // When empty-handed or when held object has non-directional ability without aim, face movement direction:
    if (movementInput) {
      const inputMag = Math.hypot(movementInput.x, movementInput.y);
      if (inputMag > 0.05) {
        this.lastMovementInputAngle = Math.atan2(movementInput.y, movementInput.x);
        this.facingAngle = this.lastMovementInputAngle;
      }
    }
  }

  /**
   * Main character update tick
   */
  public updateCharacter(
    dt: number,
    movementInput: Vector2D,
    isAimingInput: boolean,
    aimTargetPos: Vector2D | null,
    arena: Arena,
    isClimbInput = false,
    entities?: GameObject[],
    autoLock = false,
    lockedAimPos: Vector2D | null = null,
    aimLockDelta = 0,
    hasAuthoredFacingAngle = false
  ): void {
    this.movementInput.x = movementInput.x;
    this.movementInput.y = movementInput.y;
    this.isClimbInputHeld = isClimbInput;

    // Start of tick: Reset demand registrations and live power draw on EnergyPool
    if (this.energyPool && this.energyPool.enabled) {
      this.energyPool.beginTick();
    }

    // Pre-register active ability demands for proportional power rationing across abilities:
    // 1. Locomotion demand (Walking / Sprinting)
    const canWalk = Boolean(
      this.walkingModule &&
      this.walkingModule.enabled &&
      (this.isRestingOnSurface ? this.hasFriction : this.walkingModule.walkInAir)
    );
    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    const isMoving = inputMag > 0.05;
    const isActivelySprinting = Boolean(this.walkingModule?.canSprint && this.isSprinting);
    let sprintingNow = isActivelySprinting;
    if (sprintingNow && this.walkingModule?.sprintConsumesEnergy) {
      if (this.energyPool && (this.energyPool.isExhausted || this.energyPool.getCurrentStamina(this.properties) <= 0.0001)) {
        sprintingNow = false;
        this.setSprinting(false);
      }
    }
    const locomotionConsumesEnergy = sprintingNow
      ? this.walkingModule?.sprintConsumesEnergy
      : this.walkingModule?.walkConsumesEnergy;
    if (canWalk && isMoving && locomotionConsumesEnergy && this.walkingModule && this.energyPool) {
      const carriedMass = this.carriedMass;
      const loadFactor = carriedMass / (Math.max(0.1, this.strength) * 8.0);
      const targetSpeed = sprintingNow
        ? this.walkingModule.maxSprintSpeedProp.get(this.properties)
        : this.walkingModule.maxWalkSpeedProp.get(this.properties);
      const v = targetSpeed / (1.0 + loadFactor);
      const g = 9.81;
      const Cr = sprintingNow ? 0.40 : 0.28;
      const totalMass = this.hasMass ? Math.max(0.2, this.mass) : 1.0;
      const resForce = totalMass * g * Cr;
      const rawLocomotionWatts = (resForce * v) / 0.25;
      const cap = sprintingNow
        ? this.walkingModule.maxSprintPowerProp.get(this.properties)
        : this.walkingModule.maxWalkPowerProp.get(this.properties);
      const allowPartial = sprintingNow ? this.walkingModule.sprintAllowPartialPower : this.walkingModule.walkAllowPartialPower;
      let locomotionWatts = rawLocomotionWatts;
      if (locomotionWatts > cap) {
        locomotionWatts = allowPartial ? cap : 0;
      }
      const locomotionId = sprintingNow ? "sprint" : "walk";
      this.energyPool.activeLocomotionId = locomotionId;
      this.energyPool.registerDemand(locomotionId, locomotionWatts, allowPartial);
    }

    // 2. Health regeneration demand
    if (this.healthModule && this.healthModule.enabled && this.healthModule.consumesEnergy && this.energyPool) {
      const curHp = this.healthModule.getCurrentHp(this.properties);
      const maxHp = this.healthModule.getMaxHp(this.properties);
      if (curHp > 0 && curHp < maxHp - 0.001) {
        const healRate = this.healthModule.getMaxHealRate(this.properties);
        if (healRate > 0) {
          const hpPerJoule = this.healthModule.getHpPerJoule(this.properties);
          const rawHealthWatts = healRate / Math.max(0.0001, hpPerJoule);
          const maxPower = this.healthModule.maxPowerProp.get(this.properties);
          let healthWatts = rawHealthWatts;
          if (healthWatts > maxPower) {
            healthWatts = this.healthModule.allowPartialPower ? maxPower : 0;
          }
          this.energyPool.registerDemand("health_regen", healthWatts, this.healthModule.allowPartialPower);
        }
      }
    }

    // 3. Climbing demand
    const canClimb = Boolean(
      this.climbingModule &&
      this.climbingModule.enabled &&
      this.hasVerticalPosition &&
      this.hasStrength
    );
    if (canClimb && this.isClimbing && this.climbingModule?.consumesEnergy && this.energyPool) {
      const totalMass = this.mass;
      const g = arena.gravity || 9.81;
      const isometricHoldingWatts = (totalMass * g * 0.35) / 0.25;
      const maxAscentSpeed = this.climbingModule.maxClimbSpeedProp.get(this.properties);
      const ascentWatts = isClimbInput ? (totalMass * g * maxAscentSpeed) / 0.25 : 0;
      const rawClimbWatts = isometricHoldingWatts + ascentWatts;
      const climbCap = this.climbingModule.maxPowerProp.get(this.properties);
      let climbWatts = rawClimbWatts;
      if (climbWatts > climbCap) {
        climbWatts = this.climbingModule.allowPartialPower ? climbCap : 0;
      }
      this.energyPool.registerDemand("climb", climbWatts, this.climbingModule.allowPartialPower);
    }

    // 0. Process modular climbing if pressing into wall and holding climb input
    // Requires: climbingModule enabled, Vertical Position enabled, and Strength enabled
    if (canClimb) {
      this.climbingModule!.update(this, movementInput, isClimbInput, dt, arena);
    } else if (this.isClimbing) {
      this.isClimbing = false;
    }

    // Process modular jumping if holding jump input (Space / A) and not climbing
    // Requires: jumpModule enabled and Vertical Position enabled
    const canJump = Boolean(this.jumpModule && this.jumpModule.enabled && this.hasVerticalPosition);
    if (isClimbInput && !this.isClimbing && canJump) {
      this.jump(arena, movementInput);
    }

    // 1. Process modular walking
    // Requires: walkingModule enabled and Friction enabled
    if (canWalk) {
      this.walkingModule!.update(this, movementInput, dt, arena);
    } else {
      this.isActivelyWalking = false;
    }

    // 2. Update base physics & collisions
    this.updatePosition(dt, arena);

    // 2b. Process health regeneration & death check
    if (this.healthModule && this.healthModule.enabled) {
      this.healthModule.update(dt, this, arena);
    }

    // Hold-to-jump buffer: If holding jump input and character touched down / landed this tick, jump immediately!
    if (isClimbInput && !this.isClimbing && canJump) {
      this.jump(arena, movementInput);
    }

    // 2b2. Update Laser Blast ability (runs BEFORE bus.update so laser power demand drains stamina)
    if (this.laserModule && this.laserModule.enabled) {
      this.laserModule.update(
        dt,
        this,
        arena,
        this.laserAimTarget,
        this.isLaserAiming,
        this.isLaserFiring,
        this.laserCandidateEntities,
        0,
        this.laserPowerFraction
      );
    }

    // 2b3. Process Melee Attack ability in character facing direction
    if (this.meleeModule && this.meleeModule.enabled && this.isMeleeRequested) {
      const candidates = this.meleeCandidateEntities ?? arena.entities;
      const dirX = Math.cos(this.facingAngle ?? 0);
      const dirY = Math.sin(this.facingAngle ?? 0);
      this.meleeModule.executePunch(this, dirX, dirY, candidates, arena);
    }

    // 2c. Update energy pool stamina recovery (runs after all physical abilities and buffers in the tick)
    if (this.energyPool && this.energyPool.enabled) {
      this.energyPool.update(dt, this.properties);
    }

    // 3. Update facing orientation using intended movement input or aim.
    // When lockedAimPos is active and can aim throw, face towards the locked landing point!
    const canAimThrow = !this.heldObject || !this.isPrimaryAbilityNonDirectional() || isAimingInput;
    const targetFacePos = (canAimThrow && lockedAimPos) ? lockedAimPos : aimTargetPos;

    this.updateFacingDirection(isAimingInput, targetFacePos, movementInput, hasAuthoredFacingAngle);

    // 4. Update held object position if carrying one
    if (this.heldObject) {
      const heldPos = this.calculateHeldObjectPosition(arena);
      this.heldObject.position.x = heldPos.x;
      this.heldObject.position.y = heldPos.y;
      this.heldObject.position.z = heldPos.z;
      this.heldObject.velocity.x = this.velocity.x;
      this.heldObject.velocity.y = this.velocity.y;
      this.heldObject.verticalVelocity = 0;
    }

    // 5. Update trajectory preview: ONLY active when actively aiming throw
    this.isAiming = isAimingInput;
    this.aimTarget = isAimingInput ? aimTargetPos : null;

    const isLaserModeActive = Boolean(
      this.isLaserAiming ||
      this.isLaserFiring ||
      (this.laserModule && (this.laserModule.isAiming || this.laserModule.isFiring))
    );

    if (!isLaserModeActive && this.heldObject && canAimThrow && this.throwModule && this.throwModule.enabled && this.hasStrength && isAimingInput && aimTargetPos) {
      if (this.hasUserSetArcRatio && this.savedArcRatio !== undefined) {
        this.throwModule.hasUserSetArcRatio = true;
        this.throwModule.savedArcRatio = this.savedArcRatio;
      } else if (this.throwModule.hasUserSetArcRatio) {
        this.hasUserSetArcRatio = true;
        this.savedArcRatio = this.throwModule.savedArcRatio;
      }
      this.activeTrajectory = this.throwModule.calculateTrajectory(
        this,
        aimTargetPos.x,
        aimTargetPos.y,
        arena,
        entities ?? arena.entities,
        arena.visualAltitudeScale,
        autoLock,
        lockedAimPos,
        aimLockDelta
      );

      // When cursor is locked and aiming throw, ensure character and held item remain strictly pointed at lockedAimPos
      if (canAimThrow && lockedAimPos) {
        const lockDx = lockedAimPos.x - this.position.x;
        const lockDy = lockedAimPos.y - this.position.y;
        if (Math.hypot(lockDx, lockDy) > 0.05) {
          this.facingAngle = Math.atan2(lockDy, lockDx);
          const heldPos = this.calculateHeldObjectPosition(arena);
          this.heldObject.position.x = heldPos.x;
          this.heldObject.position.y = heldPos.y;
          this.heldObject.position.z = heldPos.z;
        }
      }
    } else {
      this.activeTrajectory = null;
    }
  }

  /**
   * Calculates the physical position of an object held in the character's hands.
   * Naturally holds the object at defaultHandDist in front along facing angle.
   * If a wall is in front or adjacent, dynamically clamps the hold distance within
   * [0, defaultHandDist] (and pushes clear of walls) so the object never clips or hits
   * walls when held or thrown.
   */
  public calculateHeldObjectPosition(arena?: Arena): { x: number; y: number; z: number } {
    if (!this.heldObject) {
      return { x: this.position.x, y: this.position.y, z: this.position.z };
    }

    const defaultHandDist = this.colliderRadius + this.heldObject.colliderRadius * 0.5 + 0.08;
    const dirX = Math.cos(this.facingAngle);
    const dirY = Math.sin(this.facingAngle);
    const heldZ = this.heldObject.hasVerticalPosition ? (this.position.z + 0.45) : 0;

    // If standing on or above walls (Layer 2+) or arena not provided, ground walls do not collide
    if (!arena || this.position.z >= arena.wallHeight) {
      return {
        x: this.position.x + dirX * defaultHandDist,
        y: this.position.y + dirY * defaultHandDist,
        z: heldZ,
      };
    }

    const objRadius = this.heldObject.colliderRadius > 0 ? this.heldObject.colliderRadius : 0.26;
    const safetyMargin = 0.12;
    const requiredClearance = objRadius + safetyMargin;
    const extraThrowClearback = 0.08;

    // Exact quadratic ray-AABB & ray-corner distance solver:
    // Finds the smallest positive distance t along ray (C + t * dir) before the circle of radius
    // requiredClearance contacts any wall boundary (flat edge or rounded corner).
    let minHitDistance = Infinity;

    for (const wall of arena.walls) {
      const x1 = wall.x;
      const x2 = wall.x + wall.width;
      const y1 = wall.y;
      const y2 = wall.y + wall.height;
      const R = requiredClearance;

      // 1. Flat boundary planes
      // Left boundary plane: x = x1 - R
      if (dirX > 0.0001 && this.position.x < x1 - R) {
        const t = (x1 - R - this.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = this.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      // Right boundary plane: x = x2 + R
      if (dirX < -0.0001 && this.position.x > x2 + R) {
        const t = (x2 + R - this.position.x) / dirX;
        if (t > 0 && t < minHitDistance) {
          const hitY = this.position.y + t * dirY;
          if (hitY >= y1 && hitY <= y2) minHitDistance = t;
        }
      }
      // Top boundary plane: y = y1 - R
      if (dirY > 0.0001 && this.position.y < y1 - R) {
        const t = (y1 - R - this.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = this.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }
      // Bottom boundary plane: y = y2 + R
      if (dirY < -0.0001 && this.position.y > y2 + R) {
        const t = (y2 + R - this.position.y) / dirY;
        if (t > 0 && t < minHitDistance) {
          const hitX = this.position.x + t * dirX;
          if (hitX >= x1 && hitX <= x2) minHitDistance = t;
        }
      }

      // 2. Four rounded corner circles: || (C + t * dir) - K ||^2 = R^2
      // Quadratic equation: t^2 + 2(dir · w)t + (||w||^2 - R^2) = 0, where w = C - K
      const corners: Array<{ kx: number; ky: number; isExterior: (px: number, py: number) => boolean }> = [
        { kx: x1, ky: y1, isExterior: (px, py) => px <= x1 && py <= y1 },
        { kx: x2, ky: y1, isExterior: (px, py) => px >= x2 && py <= y1 },
        { kx: x1, ky: y2, isExterior: (px, py) => px <= x1 && py >= y2 },
        { kx: x2, ky: y2, isExterior: (px, py) => px >= x2 && py >= y2 },
      ];

      for (const corner of corners) {
        const wx = this.position.x - corner.kx;
        const wy = this.position.y - corner.ky;
        const B = 2 * (dirX * wx + dirY * wy);
        const C_quad = wx * wx + wy * wy - R * R;
        const disc = B * B - 4 * C_quad;

        if (disc >= 0) {
          const sqrtDisc = Math.sqrt(disc);
          const t1 = (-B - sqrtDisc) * 0.5;
          if (t1 > 0 && t1 < minHitDistance) {
            const px = this.position.x + t1 * dirX;
            const py = this.position.y + t1 * dirY;
            if (corner.isExterior(px, py)) {
              minHitDistance = t1;
            }
          }
        }
      }
    }

    // Distance is strictly forward (d >= 0) — never pulls the held object behind the character
    let safeDistance = defaultHandDist;
    if (minHitDistance < Infinity) {
      // Pull back from the wall boundary so the object doesn't sit right on the boundary edge
      // and has extra runway to gain altitude when thrown
      safeDistance = Math.max(0, Math.min(defaultHandDist, minHitDistance - extraThrowClearback));
    }

    let targetX = this.position.x + dirX * safeDistance;
    let targetY = this.position.y + dirY * safeDistance;

    // Safety resolution: if character is very close to a wall and object radius exceeds spacing,
    // push out slightly away from overlapping wall faces to prevent any penetration
    for (let iter = 0; iter < 3; iter++) {
      let adjusted = false;
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(targetX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(targetY, wall.y + wall.height));
        const dx = targetX - closestX;
        const dy = targetY - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq < objRadius * objRadius) {
          adjusted = true;
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            targetX += (dx / dist) * (objRadius + 0.02 - dist);
            targetY += (dy / dist) * (objRadius + 0.02 - dist);
          } else {
            targetX = this.position.x;
            targetY = this.position.y;
          }
        }
      }
      if (!adjusted) break;
    }

    return { x: targetX, y: targetY, z: heldZ };
  }

  /**
   * Resets all dynamic properties and module states of the character
   * back to their original/maximum values (such as HP, energy pool, and stamina).
   */
  public resetDynamicValues(): void {
    // 1. Reset health and vitality
    if (this.healthModule) {
      this.healthModule.reset(this.properties);
    }

    // 2. Reset energy pool (restores caloric energy and stamina)
    if (this.energyPool) {
      this.energyPool.reset(this.properties);
    }

    // 4. Reset strength if tied to properties
    const origStrength = this.properties.get("strength");
    if (origStrength !== undefined) {
      this.strengthProp.set(origStrength, this.properties);
    }
  }

  /**
   * Primary entry point for dying and respawning.
   * Clears held objects, climbing state, velocities, places character at spawn,
   * and delegates each module with dynamic properties to reset to initial values.
   */
  public dieAndRespawn(_arena?: Arena, explicitPos?: { x: number; y: number; z?: number }): void {
    // 1. Drop carried objects
    if (this.heldObject) {
      this.heldObject.isHeld = false;
      this.heldObject.heldBy = null;
      this.heldObject = null;
    }

    // 2. Clear climbing and wall mounts
    this.isClimbing = false;
    this.standingWall = null;
    if (this.wallEdgeAssistModule) {
      this.wallEdgeAssistModule.isAssistClampArmed = false;
      this.wallEdgeAssistModule.hasMovedOntoWall = false;
    }

    // 3. Reset physics velocity
    this.velocity = { x: 0, y: 0 };
    this.verticalVelocity = 0;

    // 4. Pick spawn position (explicit, assigned spawnPos, or clearing)
    const spawns = HealthModule.RESPAWN_SPAWNS;
    const picked = explicitPos ?? this.spawnPos ?? spawns[Math.floor(Math.random() * spawns.length)];
    const chosenSpawn = { x: picked.x, y: picked.y, z: picked.z ?? 0 };

    this.position.x = chosenSpawn.x;
    this.position.y = chosenSpawn.y;
    this.position.z = chosenSpawn.z;
    this.supportingSurfaceHeight = 0;
    (this as any).isRespawnLocked = true;
    (this as any).authoritativeRespawnPos = { ...chosenSpawn };
    (this as any).isAwaitingRespawn = false;

    // 5. Delegate all dynamic properties and modules (HP, Energy Pool, Energy Busses) to reset
    this.resetDynamicValues();

    if (this.healthModule?.onDeathRespawn) {
      this.healthModule.onDeathRespawn(this, chosenSpawn);
    }
  }
}

