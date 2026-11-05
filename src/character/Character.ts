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
import { RollMovementModule } from "./RollMovementModule.js";
import { RollMovementCapability } from "./capabilities/RollMovementCapability.js";
import { LocomotionStanceModule, type LocomotionMode } from "./LocomotionStanceModule.js";
import { EnergyGrowthModule } from "./EnergyGrowthModule.js";
import { EnergyGrowthCapability } from "./capabilities/EnergyGrowthCapability.js";
import { VomitModule } from "./VomitModule.js";
import { VomitCapability } from "./capabilities/VomitCapability.js";
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
  public isChargingThrow: boolean = false;
  public throwChargeStartTime: number | null = null;
  public throwChargeProgress: number = 0;
  public throwChargingTowards?: "flattest" | "steepest";
  public isThrowCancelZone: boolean = false;
  public isAimingWallClear: boolean = false;
  public isHoldingThrowRelease: boolean = false;
  public isTriggerPullThrowing: boolean = false;
  public triggerThrowPower: number = 0;
  public hasDiedAwaitingNewPickup: boolean = false;
  private _heldObject: GameObject | null = null;
  public get heldObject(): GameObject | null {
    return this._heldObject;
  }
  public set heldObject(obj: GameObject | null) {
    if (this._heldObject && this._heldObject !== obj) {
      this._heldObject.isHeld = false;
      if (this._heldObject.heldBy === this) {
        this._heldObject.heldBy = null;
      }
    }
    this._heldObject = obj;
    if (obj) {
      obj.isHeld = true;
      obj.heldBy = this;
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
  public locomotionStanceModule: LocomotionStanceModule | null = null;
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
  public isAimingTrajectory: boolean = false;

  // Laser aiming/firing inputs processed per tick
  public isLaserAiming: boolean = false;
  public isLaserFiring: boolean = false;
  public laserAimTarget: { x: number; y: number } | null = null;
  public laserCandidateEntities?: GameObject[];
  public laserPowerFraction: number = 1.0;

  // Gamepad cursor mode state
  public isCursorModeActive: boolean = false;
  public isSteeringCursor: boolean = false;

  // Melee attack inputs processed per tick
  public meleeModule: MeleeModule | null = null;
  public isMeleeRequested: boolean = false;
  public meleeAimDir: { x: number; y: number } | null = null;
  public meleeCandidateEntities?: GameObject[];
  public onPunchExecuted?: (hitResult: MeleeHitResult, dirX: number, dirY: number) => void;

  // Rolling creature drive capability & braking state
  public rollMovementModule: RollMovementModule | null = null;
  public isBraking: boolean = false;
  public isDying: boolean = false;

  // Scale With Energy & Projectile Vomit modules
  public energyGrowthModule: EnergyGrowthModule | null = null;
  public vomitModule: VomitModule | null = null;
  public isVomitAiming: boolean = false;
  public isVomitRequested: boolean = false;
  public visualSpriteRadius?: number = 0.4;
  public onSpawnWorldObject?: (obj: GameObject) => void;

  /**
   * Currently active modal or stage state set by custom control schemes (defaults to immutable "none").
   */
  public stagedAction: string = "none";

  /**
   * Named stage set dictionary supporting multiple concurrent stage groups.
   */
  public stagedActions: Record<string, string> = { default: "none" };

  public getStage(group = "default"): string {
    return this.stagedActions[group] ?? (group === "default" ? this.stagedAction : "none") ?? "none";
  }

  public setStage(group = "default", stage = "none"): void {
    if (!this.stagedActions) this.stagedActions = {};
    this.stagedActions[group] = stage;
    if (group === "default" || group === "main") {
      this.stagedAction = stage;
    }
  }

  private _internalLocomotionMode: LocomotionMode = "walk";

  /**
   * Active locomotion mode ("walk" | "roll" | "fly").
   * Governed by LocomotionStanceModule if installed, or internal state.
   */
  public get locomotionMode(): LocomotionMode {
    if (this.locomotionStanceModule && this.locomotionStanceModule.enabled) {
      return this.locomotionStanceModule.activeMode;
    }
    if (this._internalLocomotionMode) {
      return this._internalLocomotionMode;
    }
    if (this.rollMovementModule && !this.walkingModule) {
      return "roll";
    }
    return "walk";
  }

  public set locomotionMode(val: LocomotionMode) {
    this._internalLocomotionMode = val;
    if (this.locomotionStanceModule) {
      this.locomotionStanceModule.setMode(val);
    }
    if (val !== "walk") {
      this.isActivelyWalking = false;
      if (this.locomotionStanceModule) {
        this.locomotionStanceModule.isRollDisabledByWalkStance = false;
      }
      if (this.rollModule) {
        this.rollModule.enabled = true;
      }
    }
  }

  /**
   * Cycles to the next available supported locomotion mode (e.g. Walk -> Roll -> Walk).
   */
  public cycleLocomotionMode(): LocomotionMode {
    if (this.locomotionStanceModule && this.locomotionStanceModule.enabled) {
      const mode = this.locomotionStanceModule.cycleMode();
      this._internalLocomotionMode = mode;
      if (mode !== "walk") {
        this.isActivelyWalking = false;
        this.locomotionStanceModule.isRollDisabledByWalkStance = false;
        if (this.rollModule) {
          this.rollModule.enabled = true;
        }
      }
      return mode;
    }
    const current = this.locomotionMode;
    const next: LocomotionMode = current === "walk" ? "roll" : "walk";
    this.locomotionMode = next;
    return next;
  }

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

    const vomitMod = VomitCapability.getAnticipatedModifier(this);
    if (vomitMod) list.push(vomitMod);

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
    if (this.heldObject.hasPrimaryItemAbility?.()) {
      const type = this.heldObject.getPrimaryItemAbilityType?.();
      if (type === "consume") {
        return this.canConsumeHeldObject();
      }
      return true;
    }
    return this.canConsumeHeldObject();
  }

  /**
   * Returns true if the held object's primary ability does not require directional aiming (e.g. eating food).
   */
  public isPrimaryAbilityNonDirectional(): boolean {
    if (!this.heldObject) return false;
    if (this.heldObject.hasPrimaryItemAbility?.()) {
      const type = this.heldObject.getPrimaryItemAbilityType?.();
      if (type === "consume") {
        return this.consumeModule ? !this.consumeModule.involvesDirection : true;
      }
    }
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
   * Actuates the primary item ability of the currently held object.
   * For any consumable object, its primary ability is to be consumed.
   */
  public useHeldItemPrimaryAbility(dt: number, objects?: GameObject[], arena?: Arena): boolean {
    if (!this.heldObject) return false;
    if (this.heldObject.hasPrimaryItemAbility?.()) {
      const res = this.heldObject.usePrimaryItemAbility(dt, this, objects, arena);
      if (res.success && res.watts !== undefined) {
        this.eatRateWatts = res.watts;
      }
      return res.success;
    }
    if (this.consumeModule && this.canConsumeHeldObject()) {
      const res = this.consumeModule.consume(dt, this, this.heldObject, objects, arena);
      this.eatRateWatts = res.watts;
      return true;
    }
    return false;
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
      ? (!/^Player(\s+\d+)?$/i.test(options.name.trim()) &&
         !/^Controller\s+#\d+$/i.test(options.name.trim()) &&
         !/Xbox|XInput|DualShock|DualSense|PlayStation|Wireless Controller|Gamepad|Joystick|STANDARD GAMEPAD|Vendor:|Product:/i.test(options.name))
      : false;
    this.hasCustomName = options.hasCustomName ?? isExplicitCustom;

    this.baseMass = options.mass ?? 1.2;
    this.facingAngle = 0;
    this.heldObject = null;
    this.isAiming = false;
    this.aimTarget = null;
    this.activeTrajectory = null;

    // Legacy compatibility socket (not registered in custom properties UI)
    this.strengthProp = new DynamicProperty(1.0);

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
    if (this.consumeModule) {
      this.properties.add("consumptionSpeedMultiplier", this.consumeModule.consumptionSpeedMultiplier);
    }
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

  public get consumptionSpeedMultiplier(): number {
    return this.consumeModule ? this.consumeModule.consumptionSpeedMultiplier : 1.0;
  }
  public set consumptionSpeedMultiplier(val: number) {
    if (this.consumeModule) {
      this.consumeModule.consumptionSpeedMultiplier = val;
    }
  }

  /**
   * Attempts to jump using JumpCapability.
   */
  public jump(arena?: Arena, movementInput?: Vector2D): boolean {
    return JumpCapability.executeJump(this, arena, movementInput);
  }

  /**
   * Attempts to execute a projectile vomit burst in the specified or current facing direction.
   */
  public vomit(objects?: GameObject[], arena?: Arena, aimAngleOverride?: number): GameObject | null {
    const glob = VomitCapability.executeVomit(this, objects, arena, aimAngleOverride);
    if (glob) {
      EnergyGrowthCapability.tick(this);
    }
    return glob;
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
    if (hasAuthoredFacingAngle || this.isSteeringCursor) return;
    if ((this.isLaserAiming || this.isLaserFiring) && this.laserAimTarget) {
      const dx = this.laserAimTarget.x - this.position.x;
      const dy = this.laserAimTarget.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }

    const shouldFaceCursor = Boolean(this.heldObject && aimTargetPos && (isAimingInput || this.isAimingTrajectory));

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
    if (this.isDying) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.verticalVelocity = 0;
      return;
    }

    this.movementInput.x = movementInput.x;
    this.movementInput.y = movementInput.y;
    this.isClimbInputHeld = isClimbInput;

    // Start of tick: Reset demand registrations and live power draw on EnergyPool
    if (this.energyPool && this.energyPool.enabled) {
      this.energyPool.beginTick();
    }

    // Phase 1: Pre-register active ability demands for proportional power rationing
    const mode = this.locomotionMode;
    let canWalk = false;
    if (mode === "walk") {
      canWalk = LocomotionCapability.registerDemand(this, movementInput);
    } else if (mode === "roll") {
      this.isActivelyWalking = false;
      if (this.locomotionStanceModule) {
        this.locomotionStanceModule.isRollDisabledByWalkStance = false;
      }
      if (this.rollModule && !this.rollModule.enabled) {
        this.rollModule.enabled = true;
      }
      if (this.rollMovementModule) {
        RollMovementCapability.registerDemand(this, movementInput, this.isBraking, this.isSprinting);
      }
    } else {
      this.isActivelyWalking = false;
    }
    HealthRegenCapability.registerDemand(this);
    const canClimb = ClimbingCapability.registerDemand(this, isClimbInput, arena);

    // Phase 2: Actuate movement & vertical capabilities
    ClimbingCapability.actuate(this, canClimb, movementInput, isClimbInput, dt, arena);

    const canJump = JumpCapability.canJump(this);
    if (isClimbInput && !this.isClimbing && canJump) {
      this.jump(arena, movementInput);
    }

    if (mode === "walk") {
      LocomotionCapability.actuate(this, canWalk, movementInput, dt, arena);
      if (!canWalk && this.locomotionStanceModule && !this.locomotionStanceModule.isRollDisabledByWalkStance && this.rollMovementModule) {
        RollMovementCapability.actuate(this, { x: 0, y: 0 }, this.isBraking, false, dt, arena);
      }
    } else if (mode === "roll") {
      this.isActivelyWalking = false;
      if (this.rollMovementModule) {
        RollMovementCapability.actuate(this, movementInput, this.isBraking, this.isSprinting, dt, arena);
      }
    }

    // Staged Throw Up trajectory & execution BEFORE position integration so recoil kickback integrates immediately
    const isVomitPreviewActive = Boolean(
      this.isVomitAiming &&
      this.vomitModule &&
      this.vomitModule.enabled &&
      (this.isAimingTrajectory || (this as any).isChargingVomit || (this as any).isHoldingVomitRelease || (this as any).isTriggerPullVomiting || (this as any).isAimingVomitWallClear)
    );
    if (isVomitPreviewActive) {
      this.isAiming = true;
      this.aimTarget = aimTargetPos;
      VomitCapability.updateTrajectoryPreview(this, arena, aimTargetPos);
    } else if (this.isVomitAiming) {
      this.activeTrajectory = null;
    }
    if (this.isVomitRequested && this.vomitModule && this.vomitModule.enabled) {
      this.vomit(entities, arena);
      this.isVomitRequested = false;
      if (!this.isVomitAiming) {
        this.activeTrajectory = null;
      }
    }

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

    // Scale With Energy (updates mass, collider, sprite, and connected module properties from current energy)
    EnergyGrowthCapability.tick(this);

    // Facing orientation & held object synchronization
    const canAimThrow = Boolean(isAimingInput || this.isAimingTrajectory);
    const targetFacePos = (canAimThrow && lockedAimPos) ? lockedAimPos : aimTargetPos;

    this.updateFacingDirection(isAimingInput || this.isVomitAiming, targetFacePos, movementInput, hasAuthoredFacingAngle);
    ThrowCapability.syncHeldObjectTransform(this, arena);

    // Trajectory preview update
    const isLaserModeActive = LaserCapability.isLaserModeActive(this);
    if (isVomitPreviewActive) {
      this.isAiming = true;
      this.aimTarget = aimTargetPos;
      VomitCapability.updateTrajectoryPreview(this, arena, aimTargetPos);
    } else {
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

    if (this.energyGrowthModule && this.energyGrowthModule.enabled) {
      this.energyGrowthModule.applyStartingScaleToEnergyPool(this);
      EnergyGrowthCapability.tick(this);
    }
  }

  /**
   * Primary entry point for dying and respawning.
   */
  public dieAndRespawn(_arena?: Arena, explicitPos?: { x: number; y: number; z?: number }): void {
    if (this.isDying) return;

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
    this.velocity = { x: 0, y: 0 };
    this.verticalVelocity = 0;

    // For active local players, delay 1.2s and open the Character Selection Window
    if (!this.isDummy && this.controllerType !== "none" && typeof window !== "undefined") {
      this.isDying = true;
      setTimeout(async () => {
        try {
          const { CharacterSelectModal } = await import("../ui/CharacterSelectModal.js");
          const { prefabManager } = await import("../engine/prefab/PrefabManager.js");
          const { applyCharacterConfig, serializeCharacter } = await import("../config/WorldConfig.js");

          CharacterSelectModal.getInstance().open({
            playerNumber: this.playerNumber,
            playerId: this.playerId,
            onSelect: (chosenPrefabId: string) => {
              const prefab = prefabManager.get(chosenPrefabId);
              if (prefab && prefab.archetype instanceof Character) {
                const config = serializeCharacter(prefab.archetype);
                applyCharacterConfig(this, config);
                this.prefabId = chosenPrefabId;
                if (prefab.controlSchema) {
                  this.controlSchema = JSON.parse(JSON.stringify(prefab.controlSchema));
                }
              }
              this.isDying = false;
              this.performRespawn(_arena, explicitPos);
            },
          });
        } catch {
          this.isDying = false;
          this.performRespawn(_arena, explicitPos);
        }
      }, 1200);
      return;
    }

    this.performRespawn(_arena, explicitPos);
  }

  private performRespawn(_arena?: Arena, explicitPos?: { x: number; y: number; z?: number }): void {
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
