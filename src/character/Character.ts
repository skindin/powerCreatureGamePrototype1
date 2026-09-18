import { GameObject, Vector2D } from "../engine/GameObject.js";
import { WalkingModule } from "./WalkingModule.js";
import { PickupModule } from "./PickupModule.js";
import { ThrowModule, TrajectoryCalculation } from "./ThrowModule.js";
import { ClimbingModule } from "./ClimbingModule.js";
import { StrengthModule } from "./StrengthModule.js";
import { JumpModule } from "./JumpModule.js";
import { WallEdgeAssistModule } from "./WallEdgeAssistModule.js";
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
    return this.wallEdgeAssistModule ? this.wallEdgeAssistModule.hangDistance : 0.10;
  }

  public set hangDistance(val: number) {
    if (this.wallEdgeAssistModule) {
      this.wallEdgeAssistModule.hangDistance = Math.max(0, val);
    }
  }

  // Removable Modules
  public walkingModule: WalkingModule | null;
  public pickupModule: PickupModule | null;
  public throwModule: ThrowModule | null;
  public jumpModule: JumpModule | null;
  public wallEdgeAssistModule: WallEdgeAssistModule | null;
  public climbingModule: ClimbingModule | null;

  // Player identity & multiplayer slot
  public playerId: string = "keyboard";
  public playerNumber: number = 1;
  public playerColor: string = "#f59e0b";

  // Aiming state
  public isAiming: boolean;
  public aimTarget: Vector2D | null;
  public activeTrajectory: TrajectoryCalculation | null;

  // Action callbacks (used by multiplayer synchronization)
  public onThrow?: (thrownObject: GameObject, vx: number, vy: number, vz: number, targetX?: number, targetY?: number) => void;
  public onDrop?: (droppedObject: GameObject) => void;

  constructor(options: {
    x?: number;
    y?: number;
    color?: string;
    mass?: number;
    colliderRadius?: number;
    strength?: number;
    playerId?: string;
    playerNumber?: number;
    name?: string;
  } = {}) {
    const initialColor = options.color ?? "#f59e0b";
    super({
      name: options.name ?? `Player ${options.playerNumber ?? 1}`,
      position: { x: options.x ?? 5.0, y: options.y ?? 7.0, z: 0 },
      mass: options.mass ?? 1.2,
      colliderRadius: options.colliderRadius ?? 0.44,
      color: initialColor,
      bounceMod: 0.1,
    });

    this.playerId = options.playerId ?? "keyboard";
    this.playerNumber = options.playerNumber ?? 1;
    this.playerColor = initialColor;

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
    this.jumpModule = new JumpModule();
    this.wallEdgeAssistModule = new WallEdgeAssistModule();
    this.climbingModule = null; // Climbing module removed from default character (addable via DevPanel)
  }

  /**
   * Attempts to jump using the attached JumpModule.
   */
  public jump(arena?: Arena, movementInput?: Vector2D): boolean {
    if (this.jumpModule) {
      return this.jumpModule.jump(this, arena, movementInput);
    }
    return false;
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
    isClimbInput = false,
    entities?: GameObject[],
    autoLock = false
  ): void {
    this.movementInput.x = movementInput.x;
    this.movementInput.y = movementInput.y;
    this.isClimbInputHeld = isClimbInput;

    // 0. Process modular climbing if pressing into wall and holding climb input
    if (this.climbingModule) {
      this.climbingModule.update(this, movementInput, isClimbInput, dt, arena);
    }

    // Process modular jumping if holding jump input (Space / A) and not climbing
    if (isClimbInput && !this.isClimbing && this.jumpModule && this.jumpModule.enabled) {
      this.jump(arena, movementInput);
    }

    // 1. Process modular walking
    if (this.walkingModule) {
      this.walkingModule.update(this, movementInput, dt, arena);
    }

    // 2. Update base physics & collisions
    this.updatePosition(dt, arena);

    // Hold-to-jump buffer: If holding jump input and character touched down / landed this tick, jump immediately!
    if (isClimbInput && !this.isClimbing && this.jumpModule && this.jumpModule.enabled) {
      this.jump(arena, movementInput);
    }

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
        arena,
        entities ?? arena.entities,
        arena.visualAltitudeScale,
        autoLock
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
}

