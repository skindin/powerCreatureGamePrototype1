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
      const heldPos = this.calculateHeldObjectPosition(arena);
      this.heldObject.position.x = heldPos.x;
      this.heldObject.position.y = heldPos.y;
      this.heldObject.position.z = heldPos.z;
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

  /**
   * Calculates the physical position of an object held in the character's hands.
   * Naturally holds the object at defaultHandDist in front along facing angle.
   * If a wall is in front or adjacent, dynamically clamps the hold distance within
   * [0, defaultHandDist] (and pushes clear of walls) so the object never clips or hits
   * walls when held or thrown.
   */
  public calculateHeldObjectPosition(arena: Arena): { x: number; y: number; z: number } {
    if (!this.heldObject) {
      return { x: this.position.x, y: this.position.y, z: this.position.z };
    }

    const defaultHandDist = this.colliderRadius + this.heldObject.colliderRadius * 0.5 + 0.08;
    const dirX = Math.cos(this.facingAngle);
    const dirY = Math.sin(this.facingAngle);
    const heldZ = this.heldObject.hasVerticalPosition ? (this.position.z + 0.45) : 0;

    // If standing on or above walls (Layer 2+), ground walls are below and do not collide
    if (this.position.z >= arena.wallHeight) {
      return {
        x: this.position.x + dirX * defaultHandDist,
        y: this.position.y + dirY * defaultHandDist,
        z: heldZ,
      };
    }

    const objRadius = this.heldObject.colliderRadius > 0 ? this.heldObject.colliderRadius : 0.26;
    // Generous safety margin — prevents binary search result landing right at the wall edge
    const safetyMargin = 0.12;
    const requiredClearance = objRadius + safetyMargin;
    // Extra pull-back applied after binary search so result is never at the knife-edge boundary
    const extraClearback = 0.06;

    const isPointSafe = (px: number, py: number): boolean => {
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(px, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(py, wall.y + wall.height));
        const dx = px - closestX;
        const dy = py - closestY;
        if (dx * dx + dy * dy < requiredClearance * requiredClearance) {
          return false;
        }
      }
      return true;
    };

    let targetX = this.position.x + dirX * defaultHandDist;
    let targetY = this.position.y + dirY * defaultHandDist;

    // If default position is completely safe from all walls, use it directly
    if (isPointSafe(targetX, targetY)) {
      return { x: targetX, y: targetY, z: heldZ };
    }

    // Default distance hits/overlaps a wall:
    // Binary search for max safe distance within [0, defaultHandDist] along facing direction
    if (isPointSafe(this.position.x, this.position.y)) {
      let low = 0;
      let high = defaultHandDist;
      for (let i = 0; i < 20; i++) { // More iterations → tighter convergence
        const mid = (low + high) * 0.5;
        if (isPointSafe(this.position.x + dirX * mid, this.position.y + dirY * mid)) {
          low = mid;
        } else {
          high = mid;
        }
      }
      // Pull back by extraClearback so we're safely inside the safe zone, never at its edge
      const safeD = Math.max(0, low - extraClearback);
      targetX = this.position.x + dirX * safeD;
      targetY = this.position.y + dirY * safeD;
    } else {
      // Even at d=0 (e.g. held object is larger than character and character is touching wall),
      // try pulling slightly back towards the character's rear up to -colliderRadius
      const maxBack = Math.max(0.05, this.colliderRadius - 0.05);
      let foundSafe = false;
      let safeBackD = 0;
      for (let d = -0.02; d >= -maxBack; d -= 0.02) {
        if (isPointSafe(this.position.x + dirX * d, this.position.y + dirY * d)) {
          safeBackD = d - extraClearback; // Extra pull-back here too
          foundSafe = true;
          break;
        }
      }

      if (foundSafe) {
        targetX = this.position.x + dirX * safeBackD;
        targetY = this.position.y + dirY * safeBackD;
      } else {
        // Fallback: push-out from character position to clear all walls
        targetX = this.position.x;
        targetY = this.position.y;
        for (let iter = 0; iter < 4; iter++) {
          let adjusted = false;
          for (const wall of arena.walls) {
            const closestX = Math.max(wall.x, Math.min(targetX, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(targetY, wall.y + wall.height));
            const dx = targetX - closestX;
            const dy = targetY - closestY;
            const distSq = dx * dx + dy * dy;
            if (distSq < requiredClearance * requiredClearance) {
              adjusted = true;
              const dist = Math.sqrt(distSq);
              if (dist > 0.0001) {
                const push = (requiredClearance + 0.02) - dist;
                targetX += (dx / dist) * push;
                targetY += (dy / dist) * push;
              } else {
                const cdx = this.position.x - closestX;
                const cdy = this.position.y - closestY;
                const cdist = Math.hypot(cdx, cdy);
                if (cdist > 0.0001) {
                  targetX = closestX + (cdx / cdist) * (requiredClearance + 0.02);
                  targetY = closestY + (cdy / cdist) * (requiredClearance + 0.02);
                } else {
                  targetX = wall.x - requiredClearance - 0.02;
                }
              }
            }
          }
          if (!adjusted) break;
        }
      }
    }

    // Clamp within default distance so the object is never pushed further than defaultHandDist
    const offsetDx = targetX - this.position.x;
    const offsetDy = targetY - this.position.y;
    const offsetDist = Math.hypot(offsetDx, offsetDy);
    if (offsetDist > defaultHandDist && offsetDist > 0.0001) {
      targetX = this.position.x + (offsetDx / offsetDist) * defaultHandDist;
      targetY = this.position.y + (offsetDy / offsetDist) * defaultHandDist;
    }

    // Final guaranteed pass: if somehow still overlapping a wall (corner/FP edge case),
    // resolve clearance directly on the final result
    for (let iter = 0; iter < 3; iter++) {
      let adjusted = false;
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(targetX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(targetY, wall.y + wall.height));
        const dx = targetX - closestX;
        const dy = targetY - closestY;
        const distSq = dx * dx + dy * dy;
        // Use just objRadius for the final check — actual physics boundary
        if (distSq < objRadius * objRadius) {
          adjusted = true;
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            targetX += (dx / dist) * (objRadius + 0.03 - dist);
            targetY += (dy / dist) * (objRadius + 0.03 - dist);
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
}

