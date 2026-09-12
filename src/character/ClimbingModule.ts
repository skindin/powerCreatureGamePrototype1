import type { Character } from "./Character.js";
import { Vector2D } from "../engine/GameObject.js";
import type { Arena, Wall } from "../engine/Arena.js";

export class ClimbingModule {
  public id = "climbing";
  public name = "Climbing Module";
  public enabled = true;

  // Maximum adhesive grip force before character slips and cannot climb/cling (in Newtons)
  public maxAdhesion = 35.0;

  // Maximum vertical speed cap when climbing walls (in units per second)
  public maxClimbSpeed = 3.0;

  // Whether to prevent walking off elevated walls unless holding climb key (Space bar)
  public preventWalkOff = true;

  // Whether to allow climbing sideways along wall faces while maintaining mid-layer altitude
  public horizontalClimb = false;

  // Maximum distance character is allowed to hang off of elevated walls before ledge guard clamps movement (in units)
  public hangDistance = 0.10;

  // When climbing up onto a wall top, dismount is suppressed until climb control is released
  public dismountSuppressedUntilRelease = false;

  // When stepping/jumping off a wall with climb key held, suppress re-grabbing until released or grounded
  public climbSuppressedUntilRelease = false;

  // Set when dismounting or stepping into an open gap until hitting ground or fresh press
  public isDismountFreefall = false;

  // Whether the assist clamp (ledge guard) is currently active/armed
  public isAssistClampArmed = false;

  // Tracks if character has moved outside the clamp zone (> 0.1u) after dismounting
  public hasLeftClampZoneSinceDismount = true;

  public get climbSuppressedUntilRePress(): boolean {
    return this.isDismountFreefall || this.climbSuppressedUntilRelease;
  }
  public set climbSuppressedUntilRePress(val: boolean) {
    this.isDismountFreefall = val;
    this.climbSuppressedUntilRelease = val;
  }

  // Previous frame climb key state to detect fresh presses
  private wasClimbHeldLastTick = false;

  constructor(options?: {
    maxAdhesion?: number;
    maxClimbSpeed?: number;
    preventWalkOff?: boolean;
    horizontalClimb?: boolean;
    hangDistance?: number;
  }) {
    if (options?.maxAdhesion !== undefined) this.maxAdhesion = options.maxAdhesion;
    if (options?.maxClimbSpeed !== undefined) this.maxClimbSpeed = options.maxClimbSpeed;
    if (options?.preventWalkOff !== undefined) this.preventWalkOff = options.preventWalkOff;
    if (options?.horizontalClimb !== undefined) this.horizontalClimb = options.horizontalClimb;
    if (options?.hangDistance !== undefined) this.hangDistance = options.hangDistance;
  }

  /**
   * Checks if the character is intending to move towards an adjacent wall that is higher than current elevation.
   * If so, and if isClimbHeld is true, increases character's elevation until they reach the top of the wall.
   * While elevated on a wall, releasing Space bar does NOT cause falling — character maintains cling grip.
   * Falling only occurs when the player actively moves in the opposite direction (away from the wall).
   * Returns true if character is actively climbing or clinging to the wall.
   */
  public update(
    character: Character,
    movementInput: Vector2D,
    isClimbHeld: boolean,
    dt: number,
    arena: Arena
  ): boolean {
    const isFreshClimbPress = isClimbHeld && !this.wasClimbHeldLastTick;
    this.wasClimbHeldLastTick = isClimbHeld;

    // Reset suppression strictly when climb key is released
    if (!isClimbHeld) {
      this.dismountSuppressedUntilRelease = false;
      this.climbSuppressedUntilRelease = false;
    }

    // Ground contact or fresh press clears dismount freefall
    if (character.position.z <= 0.01 || isFreshClimbPress) {
      this.isDismountFreefall = false;
      if (character.position.z <= 0.01) {
        this.isAssistClampArmed = false;
        this.hasLeftClampZoneSinceDismount = true;
      }
    }

    if (this.climbSuppressedUntilRelease) {
      character.isClimbing = false;
      return false;
    }

    if (!this.enabled || !character.hasVerticalPosition || !character.hasStrength || character.strength <= 0) {
      character.isClimbing = false;
      return false;
    }

    const r = character.hasCollider ? character.colliderRadius : 0.44;
    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    const hasMoveInput = inputMag >= 0.05;
    const moveDirX = hasMoveInput ? movementInput.x / inputMag : 0;
    const moveDirY = hasMoveInput ? movementInput.y / inputMag : 0;

    // When standing on top of a wall (layer 2), climbing is inactive.
    // Pressing or holding the climb button (Space) simply temporarily disables preventWalkOff in GameObject.ts,
    // allowing the player to walk off an edge if they choose, without causing them to climb.
    if (!character.isClimbing && (character.standingWall !== null || character.position.z >= arena.wallHeight)) {
      character.isClimbing = false;
      return false;
    }

    // Find closest adjacent wall
    let targetWall: Wall | null = null;
    let shortestDist = Infinity;
    let targetDot = 0;
    let targetDx = 0;
    let targetDy = 0;

    for (const wall of arena.walls) {
      // Find closest point on wall AABB
      const closestX = Math.max(wall.x, Math.min(character.position.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(character.position.y, wall.y + wall.height));

      const dx = closestX - character.position.x;
      const dy = closestY - character.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= r + 0.15 && dist < shortestDist) {
        shortestDist = dist;
        targetWall = wall;
        targetDot = hasMoveInput ? (moveDirX * dx + moveDirY * dy) : 0;
        targetDx = dx;
        targetDy = dy;
      }
    }

    if (!targetWall) {
      character.isClimbing = false;
      return false;
    }

    // Physical adhesion limit check:
    // If the downward gravitational force of total mass exceeds maxAdhesion, grip fails and character slips
    const totalMass = character.mass;
    const requiredForce = totalMass * arena.gravity;
    if (requiredForce > this.maxAdhesion) {
      character.isClimbing = false;
      return false;
    }

    // Check if climbing has already been established
    const isEstablishedClimb = character.isClimbing;

    // Once climbing is established on a wall:
    // - Releasing Space bar maintains wall cling grip at current height.
    // - Continuing to hold Space continues climbing UP the wall, even without holding directional movement keys.
    // - Falling ONLY occurs when actively walking in the opposite direction (away from wall: targetDot < -0.1).
    if (isEstablishedClimb && character.position.z < targetWall.wallHeight) {
      const wallNormalX = shortestDist > 0.001 ? targetDx / shortestDist : 0;
      const wallNormalY = shortestDist > 0.001 ? targetDy / shortestDist : 0;
      const tangentX = -wallNormalY;
      const tangentY = wallNormalX;

      const inputDotNormal = hasMoveInput ? (moveDirX * wallNormalX + moveDirY * wallNormalY) : 0;
      const inputDotTangent = hasMoveInput ? (moveDirX * tangentX + moveDirY * tangentY) : 0;

      if (hasMoveInput && (inputDotNormal < -0.3 || (!this.horizontalClimb && targetDot < -0.1))) {
        // Player is intending to walk away from the wall: release grip and fall down
        character.isClimbing = false;
        character.velocity.x = moveDirX * 3.0;
        character.velocity.y = moveDirY * 3.0;
        if (isClimbHeld) {
          this.climbSuppressedUntilRelease = true;
        }
        return false;
      }

      // Clinging to the wall: stay supported at current elevation, neutralize gravity
      character.isClimbing = true;
      character.verticalVelocity = 0;
      (character as any).standingWall = null;

      // Handle horizontal traverse along the wall face if horizontalClimb is enabled
      if (this.horizontalClimb && hasMoveInput && Math.abs(inputDotTangent) >= 0.1) {
        const baseMass = character.baseMass;
        const traverseSpeed = Math.max(
          0.5,
          Math.min(this.maxClimbSpeed, (this.maxClimbSpeed * baseMass * character.strength) / Math.max(0.1, totalMass))
        );
        character.velocity.x = tangentX * inputDotTangent * traverseSpeed;
        character.velocity.y = tangentY * inputDotTangent * traverseSpeed;
      } else {
        character.velocity.x = 0;
        character.velocity.y = 0;
      }

      // Ascend towards wall top if holding climb key (Space) and not walking away from the wall
      // Does not require continuous directional input once climb is established
      if (isClimbHeld) {
        const baseMass = character.baseMass;
        const effectiveClimbSpeed = Math.max(
          0.2,
          Math.min(this.maxClimbSpeed, (this.maxClimbSpeed * baseMass * character.strength) / Math.max(0.1, totalMass))
        );
        character.position.z += effectiveClimbSpeed * dt;

        // When reaching or exceeding wall top, mount onto wall smoothly without teleporting / jolting
        if (character.position.z >= targetWall.wallHeight) {
          character.position.z = targetWall.wallHeight;
          character.supportingSurfaceHeight = targetWall.wallHeight;
          (character as any).standingWall = targetWall;
          character.verticalVelocity = 0;
          character.isClimbing = false;
          // Crucial: After climbing onto a wall top, dismount is suppressed until climb control is released!
          this.dismountSuppressedUntilRelease = true;
          // Assist clamp starts disarmed; it arms once character intentionally moves within 0.1 units of the wall
          this.isAssistClampArmed = false;
          this.hasLeftClampZoneSinceDismount = true;

          // No artificial velocity or position snaps! WalkingModule handles locomotion naturally.
        }
      }

      return true;
    }

    // Mid-air re-grab (e.g. falling after dismounting a wall):
    // Requires releasing and repressing the climb control (isFreshClimbPress)
    if (!isEstablishedClimb && character.position.z > 0.05 && character.position.z < targetWall.wallHeight) {
      if (isFreshClimbPress) {
        character.isClimbing = true;
        character.verticalVelocity = 0;
        character.velocity.x = 0;
        character.velocity.y = 0;
        return true;
      }
      // Otherwise, the character is in freefall and must NOT stick mid-layer 1!
      character.isClimbing = false;
      return false;
    }

    // On ground (z <= 0.05, not established): Initiate climb only if contacting wall, pressing towards wall and holding Space
    const contactTolerance = 0.03;
    if (isClimbHeld && hasMoveInput && targetDot > 0.01 && shortestDist <= r + contactTolerance && character.position.z < targetWall.wallHeight) {
      // Ensure any micro-gap to the wall is completely closed before climbing begins
      if (shortestDist > 0.001) {
        const wallNormalX = targetDx / shortestDist;
        const wallNormalY = targetDy / shortestDist;
        character.position.x = (character.position.x + targetDx) - wallNormalX * r;
        character.position.y = (character.position.y + targetDy) - wallNormalY * r;
      }

      character.isClimbing = true;
      character.verticalVelocity = 0;
      character.velocity.x = 0;
      character.velocity.y = 0;

      const baseMass = character.baseMass;
      const effectiveClimbSpeed = Math.max(
        0.2,
        Math.min(this.maxClimbSpeed, (this.maxClimbSpeed * baseMass * character.strength) / Math.max(0.1, totalMass))
      );
      character.position.z += effectiveClimbSpeed * dt;
      return true;
    }

    character.isClimbing = false;
    return false;
  }
}
