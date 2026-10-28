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
import { LocomotionCapability } from "./capabilities/LocomotionCapability.js";
import { ClimbingCapability } from "./capabilities/ClimbingCapability.js";
import { JumpCapability } from "./capabilities/JumpCapability.js";
import { HealthRegenCapability } from "./capabilities/HealthRegenCapability.js";
import { ThrowCapability } from "./capabilities/ThrowCapability.js";
import { LaserCapability } from "./capabilities/LaserCapability.js";
import { MeleeCapability } from "./capabilities/MeleeCapability.js";
import type { ControlSchema } from "../input/schema/ControlSchemaTypes.js";

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
  public hasDiedAwaitingNewPickup: boolean = false;
  private _heldObject: GameObject | null = null;
  public get heldObject(): GameObject | null {
    return this._heldObject;
  }
  public set heldObject(obj: GameObject | null) {
    this._heldObject = obj;
    if (obj) {
      this.hasDiedAwaitingNewPickup = false;
    }
  }

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
  public onPunchExecuted?: (hitResult: MeleeHitResult, dirX: number, dirY: number) => void;

  /**
   * Currently active modal or staged action mode set by custom control schemes (e.g. "laser", "throw", "melee").
   */
  public stagedAction: string | null = null;

  /**
   * Character-specific control schema loaded from its archetype or Prefab.
   */
  public controlSchema?: ControlSchema;

  /**
   * Retrieves any currently anticipated energy modifiers (e.g. previewing throw trajectory cost, charging laser, etc.).
   * Delegated to 1-to-1 capability slices in src/character/capabilities/.
   */
  public getAnticipatedModifiers(): AnticipatedModifier[] {
    const list: AnticipatedModifier[] = [];

    const throwMod = ThrowCapability.getAnticipatedModifier(this);
    if (throwMod) list.push(throwMod);

    const laserMod = LaserCapability.getAnticipatedModifier(this);
    if (laserMod) list.push(laserMod);

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
    damageSolverModule?: DamageSolverModule | null;
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

    const initX = options.position ? options.position.x : (options.x ?? 5.0);
    const initY = options.position ? options.position.y : (options.y ?? 7.0);
    const initZ = options.position?.z ?? 0;

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
    this.climbingModule = null;
    this.healthModule = new HealthModule({ consumesEnergy: true, allowPartialPower: true });
    this.energyPool = new EnergyPool();
    this.properties.add("joulesPerHp", this.healthModule.joulesPerHp);
    this.properties.add("hpPerJoule", this.healthModule.joulesPerHp);
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
   * Attempts to jump using JumpCapability.
   */
  public jump(arena?: Arena, movementInput?: Vector2D): boolean {
    return JumpCapability.executeJump(this, arena, movementInput);
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
    return MeleeCapability.executeMelee(this, arena, potentialTargets, dirX, dirY);
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
    if ((this.isLaserAiming || this.isLaserFiring) && this.laserAimTarget) {
      const dx = this.laserAimTarget.x - this.position.x;
      const dy = this.laserAimTarget.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }

    const shouldFaceCursor = this.heldObject && aimTargetPos && (!this.isPrimaryAbilityNonDirectional() || isAimingInput);

    if (shouldFaceCursor && aimTargetPos) {
      const dx = aimTargetPos.x - this.position.x;
      const dy = aimTargetPos.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }

    if (movementInput) {
      const inputMag = Math.hypot(movementInput.x, movementInput.y);
      if (inputMag > 0.05) {
        this.lastMovementInputAngle = Math.atan2(movementInput.y, movementInput.x);
        this.facingAngle = this.lastMovementInputAngle;
      }
    }
  }

  /**
   * Main character update tick.
   * Orchestrates 1-to-1 capability slices in a fixed deterministic order.
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

    // Phase 1: Pre-register active ability demands for proportional power rationing
    const canWalk = LocomotionCapability.registerDemand(this, movementInput);
    HealthRegenCapability.registerDemand(this);
    const canClimb = ClimbingCapability.registerDemand(this, isClimbInput, arena);

    // Phase 2: Actuate movement & vertical capabilities
    ClimbingCapability.actuate(this, canClimb, movementInput, isClimbInput, dt, arena);

    const canJump = JumpCapability.canJump(this);
    if (isClimbInput && !this.isClimbing && canJump) {
      this.jump(arena, movementInput);
    }

    LocomotionCapability.actuate(this, canWalk, movementInput, dt, arena);

    // Base physics & collisions
    this.updatePosition(dt, arena);

    // Health regeneration & death check
    HealthRegenCapability.actuate(this, dt, arena);

    // Hold-to-jump landing buffer
    if (isClimbInput && !this.isClimbing && canJump) {
      this.jump(arena, movementInput);
    }

    // Combat abilities (Laser & Melee)
    LaserCapability.actuate(this, dt, arena);
    MeleeCapability.actuate(this, arena);

    // Energy pool stamina recovery (runs after all physical abilities and buffers in the tick)
    if (this.energyPool && this.energyPool.enabled) {
      this.energyPool.update(dt, this.properties);
    }

    // Facing orientation & held object synchronization
    const canAimThrow = !this.heldObject || !this.isPrimaryAbilityNonDirectional() || isAimingInput;
    const targetFacePos = (canAimThrow && lockedAimPos) ? lockedAimPos : aimTargetPos;

    this.updateFacingDirection(isAimingInput, targetFacePos, movementInput, hasAuthoredFacingAngle);
    ThrowCapability.syncHeldObjectTransform(this, arena);

    // Trajectory preview update
    const isLaserModeActive = LaserCapability.isLaserModeActive(this);
    ThrowCapability.updateTrajectoryPreview(
      this,
      isAimingInput,
      aimTargetPos,
      canAimThrow,
      isLaserModeActive,
      arena,
      entities,
      autoLock,
      lockedAimPos,
      aimLockDelta
    );
  }

  /**
   * Calculates the physical position of an object held in the character's hands.
   * Delegated to ThrowCapability.
   */
  public calculateHeldObjectPosition(arena?: Arena): { x: number; y: number; z: number } {
    return ThrowCapability.calculateHeldObjectPosition(this, arena);
  }

  /**
   * Resets all dynamic properties and module states of the character
   * back to their original/maximum values (such as HP, energy pool, and stamina).
   */
  public resetDynamicValues(): void {
    if (this.healthModule) {
      this.healthModule.reset(this.properties);
    }

    if (this.energyPool) {
      this.energyPool.reset(this.properties);
    }

    const origStrength = this.properties.get("strength");
    if (origStrength !== undefined) {
      this.strengthProp.set(origStrength, this.properties);
    }
  }

  /**
   * Primary entry point for dying and respawning.
   */
  public dieAndRespawn(_arena?: Arena, explicitPos?: { x: number; y: number; z?: number }): void {
    if (this.heldObject) {
      if (_arena) {
        const dropPos = this.calculateHeldObjectPosition(_arena);
        this.heldObject.position.x = dropPos.x;
        this.heldObject.position.y = dropPos.y;
        this.heldObject.position.z = dropPos.z;
      } else {
        this.heldObject.position.x = this.position.x;
        this.heldObject.position.y = this.position.y;
        this.heldObject.position.z = this.position.z;
      }
      this.heldObject.velocity.x = 0;
      this.heldObject.velocity.y = 0;
      this.heldObject.verticalVelocity = 0;
      this.heldObject.isHeld = false;
      this.heldObject.heldBy = null;
      this.heldObject = null;
    }
    this.hasDiedAwaitingNewPickup = true;

    this.isClimbing = false;
    this.standingWall = null;
    if (this.wallEdgeAssistModule) {
      this.wallEdgeAssistModule.isAssistClampArmed = false;
      this.wallEdgeAssistModule.hasMovedOntoWall = false;
    }

    this.velocity = { x: 0, y: 0 };
    this.verticalVelocity = 0;

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

    this.resetDynamicValues();

    if (this.healthModule?.onDeathRespawn) {
      this.healthModule.onDeathRespawn(this, chosenSpawn);
    }
  }
}
