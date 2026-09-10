import { GameObject, Vector2D } from "../engine/GameObject.js";
import { WalkingModule } from "./WalkingModule.js";
import { PickupModule } from "./PickupModule.js";
import { ThrowModule, TrajectoryCalculation } from "./ThrowModule.js";
import type { Arena } from "../engine/Arena.js";

export class Character extends GameObject {
  public strength: number;
  public facingAngle: number; // Angle in radians
  public heldObject: GameObject | null;

  public override isCharacter = true;
  public isActivelyWalking = false;

  // Removable Modules
  public walkingModule: WalkingModule | null;
  public pickupModule: PickupModule | null;
  public throwModule: ThrowModule | null;

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

    this.strength = options.strength ?? 1.0;
    this.facingAngle = 0;
    this.heldObject = null;
    this.isAiming = false;
    this.aimTarget = null;
    this.activeTrajectory = null;

    // Initialize default modular capabilities
    this.walkingModule = new WalkingModule();
    this.pickupModule = new PickupModule();
    this.throwModule = new ThrowModule();
  }

  /**
   * Updates character facing direction:
   * Faces in the direction the player is aiming. If not aiming (or no aim function),
   * faces in the direction the player INTENDS to move (movement input), not post-collision velocity.
   */
  public updateFacingDirection(
    isAimingInput: boolean,
    aimTargetPos: Vector2D | null,
    movementInput?: Vector2D
  ): void {
    // When holding an object OR when actively aiming, face the cursor
    if ((this.heldObject !== null || isAimingInput) && aimTargetPos && (this.throwModule !== null || this.pickupModule !== null)) {
      const dx = aimTargetPos.x - this.position.x;
      const dy = aimTargetPos.y - this.position.y;
      if (Math.hypot(dx, dy) > 0.1) {
        this.facingAngle = Math.atan2(dy, dx);
        return;
      }
    }

    // Default to the direction the player INTENDS to move
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
    arena: Arena
  ): void {
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
      this.heldObject.position.x = this.position.x + Math.cos(this.facingAngle) * handDist;
      this.heldObject.position.y = this.position.y + Math.sin(this.facingAngle) * handDist;
      this.heldObject.position.z = 0.45; // Elevated height in hands
      this.heldObject.velocity.x = this.velocity.x;
      this.heldObject.velocity.y = this.velocity.y;
      this.heldObject.verticalVelocity = 0;
    }

    // 5. Update trajectory preview: active whenever holding an object, aimed at cursor!
    this.isAiming = (this.heldObject !== null) || isAimingInput;
    this.aimTarget = aimTargetPos;

    if (this.heldObject && this.throwModule && aimTargetPos) {
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
