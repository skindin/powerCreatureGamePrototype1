import { GameObject, Vector2D } from "../engine/GameObject.js";
import { WalkingModule } from "./WalkingModule.js";
import { PickupModule } from "./PickupModule.js";
import { ThrowModule, TrajectoryCalculation } from "./ThrowModule.js";
import { ClimbingModule } from "./ClimbingModule.js";
import { StrengthModule } from "./StrengthModule.js";
import type { Arena } from "../engine/Arena.js";

export class Character extends GameObject {
  public strengthModule: StrengthModule | null;

  public get hasStrength(): boolean {
    return Boolean(this.strengthModule && this.strengthModule.enabled && this.strengthModule.strength > 0);
  }

  public get strength(): number {
    return this.hasStrength ? this.strengthModule!.strength : 0;
  }

  public set strength(val: number) {
    if (this.strengthModule) {
      this.strengthModule.strength = Math.max(0.1, val);
    } else {
      this.strengthModule = new StrengthModule({ strength: val });
    }
  }

  public facingAngle: number; // Angle in radians
  public heldObject: GameObject | null;

  public override isCharacter = true;
  public isActivelyWalking = false;
  public isClimbInputHeld = false;
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

  /**
   * Effective mass: base character mass plus the mass of any currently carried object.
   */
  public override get mass(): number {
    const base = this.hasMass ? this.baseMass : 0;
    const carried = (this.heldObject && this.heldObject.hasMass) ? this.heldObject.mass : 0;
    return base + carried;
  }

  public override set mass(val: number) {
    this.baseMass = Math.max(0.1, val);
    if (this.massModule) {
      this.massModule.mass = this.baseMass;
    }
  }

  public get carriedMass(): number {
    return (this.heldObject && this.heldObject.hasMass) ? this.heldObject.mass : 0;
  }

  public get hangDistance(): number {
    return this.climbingModule ? this.climbingModule.hangDistance : 0.10;
  }

  public set hangDistance(val: number) {
    if (this.climbingModule) {
      this.climbingModule.hangDistance = Math.max(0, val);
    }
  }

  // Removable Modules
  public walkingModule: WalkingModule | null;
  public pickupModule: PickupModule | null;
  public throwModule: ThrowModule | null;
  public climbingModule: ClimbingModule | null;

  // Aiming state
  public isAiming: boolean;
  public aimTarget: Vector2D | null;
  public activeTrajectory: TrajectoryCalculation | null;

  constructor(options: {
    x?: number;
    y?: number;
    color?: string;
    mass?: number;
    colliderRadius?: number;
    strength?: number;
  } = {}) {
    super({
      name: "Player Character",
      position: { x: options.x ?? 5.0, y: options.y ?? 7.0, z: 0 },
      mass: options.mass ?? 1.2,
      colliderRadius: options.colliderRadius ?? 0.44,
      color: options.color ?? "#f59e0b", // Amber body
      bounceMod: 0.1,
    });

    this.baseMass = options.mass ?? 1.2;
    this.strength = options.strength ?? 1.0;
    this.facingAngle = 0;
    this.heldObject = null;
    this.isAiming = false;
    this.aimTarget = null;
    this.activeTrajectory = null;

    // Initialize default modular capabilities
    this.strengthModule = new StrengthModule({ strength: options.strength ?? 1.0 });
    this.walkingModule = new WalkingModule();
    this.pickupModule = new PickupModule();
    this.throwModule = new ThrowModule();
    this.climbingModule = new ClimbingModule();
  }

  /**
   * Updates character facing direction:
   * Faces in the direction the player is aiming. If not aiming (or no aim function),
   * faces in the direction the player INTENDS to move (movement input), not post-collision velocity.
   */
  public updateFacingDirection(
    _isAimingInput: boolean,
    aimTargetPos: Vector2D | null,
    movementInput?: Vector2D
  ): void {
    // The character ONLY faces the aim cursor when holding an object!
    if (this.heldObject && aimTargetPos) {
      const dx = aimTargetPos.x - this.position.x;
      const dy = aimTargetPos.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }

    // When empty-handed, character faces the direction they are moving:
    if (movementInput) {
      const inputMag = Math.hypot(movementInput.x, movementInput.y);
      if (inputMag > 0.05) {
        this.facingAngle = Math.atan2(movementInput.y, movementInput.x);
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
    isClimbInput = false
  ): void {
    this.isClimbInputHeld = isClimbInput;

    // 0. Process modular climbing if pressing into wall and holding climb input
    if (this.climbingModule) {
      this.climbingModule.update(this, movementInput, isClimbInput, dt, arena);
    }

    // 1. Process modular walking
    if (this.walkingModule) {
      this.walkingModule.update(this, movementInput, dt, arena);
    }

    // 2. Update base physics & collisions
    this.updatePosition(dt, arena);

    // 3. Update facing orientation using intended movement input or aim
    this.updateFacingDirection(isAimingInput, aimTargetPos, movementInput);

    // 4. Update held object position if carrying one
    if (this.heldObject) {
      // Position held object slightly in front of character along facing direction
      const handDist = this.colliderRadius + this.heldObject.colliderRadius * 0.5 + 0.08;
      let targetX = this.position.x + Math.cos(this.facingAngle) * handDist;
      let targetY = this.position.y + Math.sin(this.facingAngle) * handDist;

      // If character is on the ground, clamp so held object does not overlap walls
      if (this.position.z < arena.wallHeight) {
        const clamped = ThrowModule.clampStartOutsideWalls(
          targetX,
          targetY,
          this.heldObject.colliderRadius,
          arena,
          this.position.z,
          this.position.x,
          this.position.y
        );
        targetX = clamped.x;
        targetY = clamped.y;
      }

      this.heldObject.position.x = targetX;
      this.heldObject.position.y = targetY;
      // Object elevation dynamically matches character elevation + 0.45 in hands
      this.heldObject.position.z = this.heldObject.hasVerticalPosition ? (this.position.z + 0.45) : 0;
      this.heldObject.velocity.x = this.velocity.x;
      this.heldObject.velocity.y = this.velocity.y;
      this.heldObject.verticalVelocity = 0;
    }

    // 5. Update trajectory preview: ONLY active when actively aiming (Right Stick or Mouse aim)
    this.isAiming = isAimingInput;
    this.aimTarget = isAimingInput ? aimTargetPos : null;

    if (this.heldObject && this.throwModule && isAimingInput && aimTargetPos) {
      this.activeTrajectory = this.throwModule.calculateTrajectory(
        this,
        aimTargetPos.x,
        aimTargetPos.y,
        arena
      );
    } else {
      this.activeTrajectory = null;
    }
  }
}
