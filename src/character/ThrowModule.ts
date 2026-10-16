import type { Character } from "./Character.js";
import type { Arena, Wall } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
  couldClearWall: boolean; // True if z > standard wall height
  isOverWall: boolean;     // True if intersecting a wall tile
  collidesWall: boolean;   // True if impacts wall
}

export interface TrajectoryCalculation {
  points: TrajectoryPoint[];
  landPoint: { x: number; y: number; z?: number };
  isBlockedByWall: boolean;
  blockedAtWallId?: string;
  isLandingOnWallTop?: boolean;
  targetObject?: GameObject | null;
  targetSurfaceHeight?: number;
  isAutoLocked?: boolean;
  peakHeight?: number;
  flightTime?: number;
  colliderRadius?: number;
  visualShape?: "circle" | "box";
  launchVel?: { vx: number; vy: number; vz: number };
  launchPos?: { x: number; y: number; z: number };
}

import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";

export class ThrowModule {
  public id = "throw";
  public name = "Throw Ability";
  public enabled = true;

  // Tunable throw physics in wall-based units
  public maxThrowSpeedProp: DynamicProperty;
  public maxThrowAimDistanceProp: DynamicProperty;
  public maxThrowHeightProp: DynamicProperty;

  /**
   * Alias for backward compatibility with baseThrowForceProp.
   */
  public get baseThrowForceProp(): DynamicProperty {
    return this.maxThrowSpeedProp;
  }
  public set baseThrowForceProp(prop: DynamicProperty) {
    this.maxThrowSpeedProp = prop;
  }

  /**
   * Whether throwing consumes energy from an Energy Bus.
   */
  public consumesEnergy: boolean = true;
  public energyBusId: string = "bus_main";

  constructor(options?: {
    maxThrowSpeed?: number;
    baseThrowForce?: number;
    maxThrowAimDistance?: number;
    maxThrowHeight?: number;
    consumesEnergy?: boolean;
    energyBusId?: string;
    enabled?: boolean;
  }) {
    const initialSpeed = options?.maxThrowSpeed ?? options?.baseThrowForce ?? 14.0;
    this.maxThrowSpeedProp = new DynamicProperty(initialSpeed);
    this.maxThrowAimDistanceProp = new DynamicProperty(options?.maxThrowAimDistance ?? 13.0);
    this.maxThrowHeightProp = new DynamicProperty(options?.maxThrowHeight ?? 5.0);
    if (options?.consumesEnergy !== undefined) this.consumesEnergy = options.consumesEnergy;
    if (options?.energyBusId !== undefined) this.energyBusId = options.energyBusId;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  public get maxThrowSpeed(): number {
    return this.maxThrowSpeedProp.literalValue;
  }

  public set maxThrowSpeed(val: number) {
    this.maxThrowSpeedProp.literalValue = val;
  }

  public get baseThrowForce(): number {
    return this.maxThrowSpeed;
  }

  public set baseThrowForce(val: number) {
    this.maxThrowSpeed = val;
  }

  public get maxThrowAimDistance(): number {
    return this.maxThrowAimDistanceProp.literalValue;
  }

  public set maxThrowAimDistance(val: number) {
    this.maxThrowAimDistanceProp.literalValue = val;
  }

  public get maxThrowHeight(): number {
    return this.maxThrowHeightProp.literalValue;
  }

  public set maxThrowHeight(val: number) {
    this.maxThrowHeightProp.literalValue = val;
  }

  public getMaxThrowSpeed(registry?: ObjectPropertiesRegistry): number {
    return this.maxThrowSpeedProp.get(registry);
  }

  public getBaseThrowForce(registry?: ObjectPropertiesRegistry): number {
    return this.getMaxThrowSpeed(registry);
  }

  public getMaxThrowAimDistance(registry?: ObjectPropertiesRegistry): number {
    return this.maxThrowAimDistanceProp.get(registry);
  }

  public getMaxThrowHeight(registry?: ObjectPropertiesRegistry): number {
    return this.maxThrowHeightProp.get(registry);
  }

  /**
   * Helper: tests circle-AABB intersection with a wall tile (matching GameObject collision)
   */
  private testWallIntersection(x: number, y: number, radius: number, wall: Wall): boolean {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
  }

  /**
   * Clamps an object's start position so that it does not overlap any wall if starting on the ground.
   * If overlapping, pushes it out to the closest valid position outside the wall.
   * Also exposes a near-wall check: if the clamped position is within `safeDistance` of any wall
   * face, the caller should pull the start back to the character's own position.
   */
  public static clampStartOutsideWalls(
    x: number,
    y: number,
    radius: number,
    arena: Arena,
    charZ: number,
    charX: number,
    charY: number
  ): { x: number; y: number; nearWall: boolean } {
    if (charZ >= arena.wallHeight) {
      return { x, y, nearWall: false }; // On or above walls
    }

    let clampedX = x;
    let clampedY = y;
    const r = radius > 0 ? radius : 0.3;
    const requiredClearance = r + 0.04;
    // "near wall" threshold: within 1 physics step of clearance (vMax * fixedDt ≈ 16 * 1/60 ≈ 0.27u)
    const nearWallThreshold = r + 0.30;

    // Up to 3 iterations to resolve adjacent corners/walls
    for (let iter = 0; iter < 3; iter++) {
      let collided = false;
      for (const wall of arena.walls) {
        const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
        const dx = clampedX - closestX;
        const dy = clampedY - closestY;
        const distSq = dx * dx + dy * dy;

        if (distSq < requiredClearance * requiredClearance) {
          collided = true;
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const pushDist = (requiredClearance + 0.01) - dist;
            clampedX += (dx / dist) * pushDist;
            clampedY += (dy / dist) * pushDist;
          } else {
            const cdx = charX - closestX;
            const cdy = charY - closestY;
            const cdist = Math.hypot(cdx, cdy);
            if (cdist > 0.0001) {
              clampedX = closestX + (cdx / cdist) * (requiredClearance + 0.01);
              clampedY = closestY + (cdy / cdist) * (requiredClearance + 0.01);
            } else {
              const dL = clampedX - wall.x;
              const dR = wall.x + wall.width - clampedX;
              const dT = clampedY - wall.y;
              const dB = wall.y + wall.height - clampedY;
              const minD = Math.min(dL, dR, dT, dB);
              if (minD === dL) clampedX = wall.x - requiredClearance - 0.01;
              else if (minD === dR) clampedX = wall.x + wall.width + requiredClearance + 0.01;
              else if (minD === dT) clampedY = wall.y - requiredClearance - 0.01;
              else clampedY = wall.y + wall.height + requiredClearance + 0.01;
            }
          }
        }
      }
      if (!collided) break;
    }

    // Check if the clamped position is still dangerously close to any wall face
    let nearWall = false;
    for (const wall of arena.walls) {
      const closestX = Math.max(wall.x, Math.min(clampedX, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(clampedY, wall.y + wall.height));
      const dx = clampedX - closestX;
      const dy = clampedY - closestY;
      if (dx * dx + dy * dy < nearWallThreshold * nearWallThreshold) {
        nearWall = true;
        break;
      }
    }

    return { x: clampedX, y: clampedY, nearWall };
  }

  /**
   * Finds the entity directly under the aim target cursor (x, y), if any.
   * Excludes the thrower and the thrower's held object.
   * Checks both physical 2D ground footprint and pseudo-3D isometric visual position.
   */
  public findHoveredEntity(
    aimX: number,
    aimY: number,
    arena: Arena,
    exclude?: GameObject | null,
    heldObject?: GameObject | null,
    entities?: GameObject[],
    hoverScale?: number,
    tolerance = 0.35
  ): GameObject | null {
    const list = entities ?? arena.entities ?? [];
    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    let bestEntity: GameObject | null = null;
    let bestDist = Infinity;

    for (let i = list.length - 1; i >= 0; i--) {
      const ent = list[i];
      if (ent === exclude || ent === heldObject || ent.isHeld) continue;

      const r = ent.hasCollider ? ent.colliderRadius : (ent.colliderModule?.radius ?? 0.35);
      const effectiveR = r > 0 ? r : 0.35;

      // Check ground footprint distance
      const distGround = Math.hypot(ent.position.x - aimX, ent.position.y - aimY);

      // Check pseudo-3D visual position distance
      const z = ent.position.z ?? 0;
      const visualY = ent.position.y - z * scale;
      const distVisual = Math.hypot(ent.position.x - aimX, visualY - aimY);

      // Also check 1:1 isometric distance in case scale is 1.0 or user clicks near top
      const dist1to1 = Math.hypot(ent.position.x - aimX, (ent.position.y - z) - aimY);

      const minDist = Math.min(distGround, distVisual, dist1to1);
      if (minDist <= effectiveR + tolerance) {
        if (minDist < bestDist) {
          bestDist = minDist;
          bestEntity = ent;
        }
      }
    }

    return bestEntity;
  }

  /**
   * Helper: tests if (aimX, aimY) in screen space is over a wall's pseudo-3D roof or front face.
   * If found, maps the screen aim point back to physical 3D world coordinates (physX, physY)
   * on top of the wall so that rendering at (physX, physY - wallHeight * hoverScale) aligns
   * EXACTLY with (aimX, aimY) on screen!
   */
  public static getWallUnderCursor(
    aimX: number,
    aimY: number,
    arena: Arena,
    hoverScale = 0
  ): { wall: Wall; physX: number; physY: number } | null {
    const hScale = hoverScale > 0 ? hoverScale : 0;
    // Check foreground walls first (descending Y in arena)
    const sortedWalls = [...arena.walls].sort((a, b) => b.y - a.y);
    for (const wall of sortedWalls) {
      const roofTopY = wall.y - wall.wallHeight * hScale;
      const roofBottomY = wall.y + wall.height - wall.wallHeight * hScale;
      const baseBottomY = wall.y + wall.height;

      // Check horizontal bounds with a small margin
      if (aimX >= wall.x - 0.05 && aimX <= wall.x + wall.width + 0.05) {
        // 1. Mouse is over the visual roof of the wall:
        if (aimY >= roofTopY && aimY <= roofBottomY) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, aimY + wall.wallHeight * hScale));
          return { wall, physX, physY };
        }
        // 2. Mouse is over the front face / base:
        if (aimY > roofBottomY && aimY <= baseBottomY + 0.05) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, wall.y + wall.height - 0.15));
          return { wall, physX, physY };
        }
        // 3. Fallback when hScale is 0 (pure 2D flat mode):
        if (hScale === 0 && aimY >= wall.y && aimY <= wall.y + wall.height) {
          const physX = Math.max(wall.x + 0.05, Math.min(wall.x + wall.width - 0.05, aimX));
          const physY = Math.max(wall.y + 0.05, Math.min(wall.y + wall.height - 0.05, aimY));
          return { wall, physX, physY };
        }
      }
    }
    return null;
  }

  /**
   * Calculates the maximum launch speed for an object given:
   * 1. Character's maxThrowSpeed (governs light objects) scaled by character strength.
   * 2. Object mass and character energy bus power/energy limit (governs heavier objects).
   */
  public calculateMaxLaunchSpeed(
    thrower?: Character,
    heldObject?: GameObject | null
  ): number {
    const rawMaxSpeed = this.maxThrowSpeedProp.get(thrower?.properties);
    const strength = thrower?.strength ?? 1.0;
    const speedCap = Math.max(1.0, rawMaxSpeed * strength);

    // If no held object or mass is negligible, speedCap applies
    if (!heldObject || !heldObject.hasMass) {
      return speedCap;
    }

    const mass = Math.max(0.1, heldObject.mass);

    // Check Energy Bus power limits if consumesEnergy is enabled
    if (this.consumesEnergy && thrower) {
      const bus = thrower.getEnergyBus(this.energyBusId);
      if (bus && bus.enabled) {
        // Burst power available: bus.maxPower (in Watts). Over a typical burst throw impulse (~0.08s):
        // E_burst = maxPower * dt_impulse (Joules of muscle power).
        // With muscle efficiency (~25%), mechWork Joules = E_burst * 0.25.
        // E_mech = 0.5 * m * v^2  =>  v = sqrt(2 * E_mech / m).
        const maxPower = bus.getMaxPower(thrower.properties);
        const impulseDt = 0.08;
        const availableMechJoules = maxPower * impulseDt * 0.25 * strength;
        const massLimitedSpeed = Math.sqrt((2 * Math.max(1.0, availableMechJoules)) / mass);
        return Math.min(speedCap, massLimitedSpeed);
      }
    }

    // Baseline fallback if energy bus not attached: F = m * a scaling
    // Standard baseline mass is 1.0u. Heavier objects scale with 1 / sqrt(mass)
    const massLimitedSpeed = speedCap / Math.sqrt(Math.max(1.0, mass));
    return Math.min(speedCap, massLimitedSpeed);
  }

  /**
   * Computes launch velocities vx, vy, vz given start position, target position, arena parameters, and strength.
   * Adjusts total flight time and launch angles so the object lands EXACTLY at the targeted position,
   * whether on the ground, on top of an elevated wall, or on the layer of a targeted object.
   * If autoLock is true (e.g. holding right click), locks 2D coordinates to the overlapped object center.
   */
  private computeLaunchVelocity(
    startX: number,
    startY: number,
    startZ: number,
    targetX: number,
    targetY: number,
    arena: Arena,
    throwPower: number,
    hasGravity = true,
    hasVerticalVelocity = true,
    colliderRadius = 0.35,
    _charVel?: { x: number; y: number; z?: number },
    candidateEntities?: GameObject[],
    hoverScale?: number,
    thrower?: Character,
    heldObject?: GameObject | null,
    autoLock = false
  ): {
    vx: number;
    vy: number;
    vz: number;
    totalTime: number;
    finalTargetX: number;
    finalTargetY: number;
    targetSurfaceHeight: number;
    targetObject?: GameObject | null;
    isAutoLocked?: boolean;
  } | null {
    // STRICT RULE: IT SHOULD NOT LOCK THE TRAJECTORY ONTO ANYTHING UNLESS autoLock IS TRUE (holding Left Trigger / Right Click)!
    let hoveredEntity: GameObject | null = null;
    let effectiveTargetX = targetX;
    let effectiveTargetY = targetY;
    let isLocked = false;
    let targetSurfaceHeight = 0;

    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    // Only search for lock target if autoLock is explicitly active
    if (autoLock) {
      hoveredEntity = this.findHoveredEntity(
        targetX,
        targetY,
        arena,
        thrower,
        heldObject,
        candidateEntities,
        hoverScale,
        Infinity
      );

      if (hoveredEntity) {
        effectiveTargetX = hoveredEntity.position.x;
        effectiveTargetY = hoveredEntity.position.y;
        isLocked = true;
        // Consider the actual physical altitude of the target object (e.g. airborne, climbing, or elevated)
        const entZ = Math.max(
          0,
          hoveredEntity.position.z ?? 0,
          hoveredEntity.supportingSurfaceHeight ?? 0,
          hoveredEntity.standingWall ? (hoveredEntity.standingWall.wallHeight ?? arena.wallHeight) : 0
        );
        targetSurfaceHeight = entZ;
      }
    }

    if (!isLocked) {
      // 2. If mouse is over a wall (including 2.5D visual roof and front face):
      const wallUnderCursor = ThrowModule.getWallUnderCursor(targetX, targetY, arena, scale);
      if (wallUnderCursor) {
        effectiveTargetX = wallUnderCursor.physX;
        effectiveTargetY = wallUnderCursor.physY;
        targetSurfaceHeight = wallUnderCursor.wall.wallHeight;
      } else {
        // 3. Fallback to open ground:
        targetSurfaceHeight = arena.getSupportingSurfaceHeight(targetX, targetY);
      }
    }

    // Limit how high the player can throw objects (effective max vertical target height above release)
    const maxThrowHeight = this.maxThrowHeightProp.get(thrower?.properties);
    const effectiveMaxHeight = maxThrowHeight * (thrower?.strength ?? 1.0);
    const maxAllowedTargetZ = startZ + effectiveMaxHeight;
    if (targetSurfaceHeight > maxAllowedTargetZ) {
      targetSurfaceHeight = maxAllowedTargetZ;
    }

    const dx = effectiveTargetX - startX;
    const dy = effectiveTargetY - startY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) return null;

    // Clamp aim distance to character reach
    const maxThrowAimDistance = this.maxThrowAimDistanceProp.get(thrower?.properties);
    const actualDist = Math.min(dist, maxThrowAimDistance);
    const dirX = dx / dist;
    const dirY = dy / dist;
    const finalTargetX = startX + dirX * actualDist;
    const finalTargetY = startY + dirY * actualDist;

    // If aim distance was clamped, verify what surface is beneath finalTarget
    if (actualDist < dist) {
      if (isLocked) {
        // Proportionally scale target height along the clamped ray toward the locked target
        targetSurfaceHeight = startZ + (targetSurfaceHeight - startZ) * (actualDist / dist);
      } else {
        const clampedWall = arena.getSupportingWall(finalTargetX, finalTargetY, colliderRadius > 0 ? colliderRadius : 0.35);
        if (clampedWall) {
          targetSurfaceHeight = clampedWall.wallHeight;
        } else {
          targetSurfaceHeight = arena.getSupportingSurfaceHeight(finalTargetX, finalTargetY);
        }
      }
    }

    const launchSpeed = Math.max(1.0, throwPower);

    // Straight-line horizontal flight if zero-G or no vertical velocity module
    if (!hasGravity || !hasVerticalVelocity) {
      const totalTime = Math.max(0.14, actualDist / launchSpeed);
      const vx = dirX * (actualDist / totalTime);
      const vy = dirY * (actualDist / totalTime);
      const vz = 0;
      return { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight: startZ, targetObject: hoveredEntity };
    }

    const deltaZ = targetSurfaceHeight - startZ;

    // 1. Scan for intermediate obstacles along the 2D path
    const colliderRadiusCheck = colliderRadius > 0 ? colliderRadius : 0.35;
    // Clearance margin ensures the projectile and its collider cleanly fly over the wall top
    const clearanceMargin = 0.35;
    let minTimeForWallClearance = 0;

    // Sample finely (120 samples) so narrow walls and edges are never missed
    const scanSteps = 120;
    for (let i = 1; i < scanSteps; i++) {
      const s = i / scanSteps;
      const sampleX = startX + (finalTargetX - startX) * s;
      const sampleY = startY + (finalTargetY - startY) * s;

      for (const wall of arena.walls) {
        if (this.testWallIntersection(sampleX, sampleY, colliderRadiusCheck, wall)) {
          const isTargetOnThisWall = (targetSurfaceHeight > 0 || (hoveredEntity && hoveredEntity.standingWall === wall)) &&
            finalTargetX >= wall.x - 0.2 && finalTargetX <= wall.x + wall.width + 0.2 &&
            finalTargetY >= wall.y - 0.2 && finalTargetY <= wall.y + wall.height + 0.2;
          if (isTargetOnThisWall && s > 0.65) {
            continue;
          }

          const chordZ = (1 - s) * startZ + s * targetSurfaceHeight;
          const reqClearanceZ = wall.wallHeight + clearanceMargin;
          const reqLift = reqClearanceZ - chordZ;
          if (reqLift > 0) {
            const denom = 0.5 * arena.gravity * s * (1 - s);
            if (denom > 0.0001) {
              const neededT = Math.sqrt(reqLift / denom);
              if (neededT > minTimeForWallClearance) {
                minTimeForWallClearance = neededT;
              }
            }
          }
        }
      }
    }

    // 2. Ballistics solver at maximum speed:
    // Solve for flight time T such that total launch speed = vMax (flattest trajectory possible)
    //   v_h = D / T,  v_z = deltaZ / T + 0.5 * g * T
    //   v_h^2 + v_z^2 = vMax^2
    // Quadratic in u = T^2:
    //   0.25 * g^2 * u^2 - (vMax^2 - g * deltaZ) * u + (D^2 + deltaZ^2) = 0.
    const g = arena.gravity;
    const D = actualDist;
    const vMax = launchSpeed;
    const aCoeff = 0.25 * g * g;
    const bCoeff = -(vMax * vMax - g * deltaZ);
    const cCoeff = D * D + deltaZ * deltaZ;

    const disc = bCoeff * bCoeff - 4 * aCoeff * cCoeff;
    let chosenT = 0;

    if (disc >= 0) {
      const uLow = (-bCoeff - Math.sqrt(disc)) / (2 * aCoeff);
      const uHigh = (-bCoeff + Math.sqrt(disc)) / (2 * aCoeff);

      const tLow = uLow > 0 ? Math.sqrt(uLow) : 0;
      const tHigh = uHigh > 0 ? Math.sqrt(uHigh) : 0;

      if (minTimeForWallClearance > 0) {
        // Must clear intermediate wall:
        // Pick the shortest valid trajectory that clears the wall top
        if (tLow >= minTimeForWallClearance) {
          chosenT = tLow;
        } else if (minTimeForWallClearance <= tHigh) {
          // minTimeForWallClearance provides the shortest arc that cleanly clears the obstacle
          chosenT = minTimeForWallClearance;
        } else {
          chosenT = Math.max(tHigh, minTimeForWallClearance);
        }
      } else {
        // No obstacle: use the flattest/fastest trajectory (tLow)
        chosenT = tLow > 0 ? tLow : (tHigh > 0 ? tHigh : D / vMax);
      }
    } else {
      // Out of range for direct reach at vMax; use peak distance angle (45 deg)
      const uPeak = -bCoeff / (2 * aCoeff);
      const tPeak = uPeak > 0 ? Math.sqrt(uPeak) : Math.max(0.02, D / vMax);
      chosenT = Math.max(tPeak, minTimeForWallClearance);
    }

    if (chosenT <= 0) {
      chosenT = Math.max(0.02, D / vMax);
    }
    if (deltaZ > 0) {
      chosenT = Math.max(chosenT, Math.sqrt((2 * deltaZ) / g));
    }
    // Floor flight time at 0.02s (1 physics frame at 50Hz) so short-range throws launch at full vMax speed
    const totalTime = Math.max(0.02, chosenT);

    const vz = (deltaZ + 0.5 * g * totalTime * totalTime) / totalTime;
    const horizontalSpeed = actualDist / totalTime;
    const vx = dirX * horizontalSpeed;
    const vy = dirY * horizontalSpeed;

    return { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, targetObject: hoveredEntity, isAutoLocked: isLocked };
  }

  /**
   * Pre-calculates trajectory points for real-time visualization overlay
   */
  public calculateTrajectory(
    character: Character,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena,
    entities?: GameObject[],
    hoverScale?: number,
    autoLock = false
  ): TrajectoryCalculation | null {
    if (!this.enabled || !character.heldObject) return null;

    const held = character.heldObject;

    // Orient character towards aim target so throw trajectory and held release point align
    const aimDx = aimTargetX - character.position.x;
    const aimDy = aimTargetY - character.position.y;
    if (Math.hypot(aimDx, aimDy) > 0.05) {
      character.facingAngle = Math.atan2(aimDy, aimDx);
      const alignedHeldPos = character.calculateHeldObjectPosition(arena);
      held.position.x = alignedHeldPos.x;
      held.position.y = alignedHeldPos.y;
      held.position.z = alignedHeldPos.z;
    }

    let startX = held.position.x;
    let startY = held.position.y;
    let startZ = held.position.z;

    // If starting on the ground, clamp horizontal start position outside walls
    if (character.position.z < arena.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena,
        character.position.z,
        character.position.x,
        character.position.y
      );
      startX = clamped.x;
      startY = clamped.y;
    }

    const maxSpeed = this.calculateMaxLaunchSpeed(character, held);
    const canFlyVertically = held.hasGravity && held.hasVerticalVelocity;

    const charVel = {
      x: character.velocity.x,
      y: character.velocity.y,
      z: character.isAboveGround ? character.verticalVelocity : 0,
    };

    const candidateEntities = entities ?? arena.entities;
    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    const launch = this.computeLaunchVelocity(
      startX, startY, startZ, aimTargetX, aimTargetY, arena, maxSpeed, held.hasGravity, held.hasVerticalVelocity, held.colliderRadius, charVel,
      candidateEntities, scale, character, held, autoLock
    );
    if (!launch) return null;

    const { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, targetObject, isAutoLocked } = launch;

    // Fine simulation steps matching 120Hz physics precision
    const steps = 90;
    const dtStep = totalTime / steps;
    const points: TrajectoryPoint[] = [];

    let isBlocked = false;
    let isLandingOnWallTop = targetSurfaceHeight > 0;
    let blockedWallId: string | undefined;
    let peakHeight = startZ;

    for (let step = 0; step <= steps; step++) {
      const t = step * dtStep;
      // At the final step, enforce exact final target coordinates
      const currentX = step === steps ? finalTargetX : startX + vx * t;
      const currentY = step === steps ? finalTargetY : startY + vy * t;
      const calculatedZ = canFlyVertically ? (startZ + vz * t - 0.5 * arena.gravity * t * t) : startZ;
      const currentZ = canFlyVertically ? (step === steps ? targetSurfaceHeight : (step > steps - 3 ? Math.max(targetSurfaceHeight, calculatedZ) : Math.max(0, calculatedZ))) : startZ;
      const currentVz = canFlyVertically ? (vz - arena.gravity * t) : 0;

      if (currentZ > peakHeight) {
        peakHeight = currentZ;
      }

      // Blue section: height > standard wall height
      const couldClearWall = currentZ > arena.wallHeight;
      let isOverWall = false;
      let collidesWall = false;

      // Check wall collisions along the path
      for (const wall of arena.walls) {
        if (this.testWallIntersection(currentX, currentY, held.colliderRadius, wall)) {
          isOverWall = true;
          // Only check collision if height is at or below the wall and not yet at the intentional landing step
          if (currentZ <= wall.wallHeight + 0.001) {
            const wasAbove = points.length > 0 && points[points.length - 1].z >= wall.wallHeight - 0.05;
            if (wasAbove && currentVz <= 0) {
              // Descending onto top of wall
              const isTargetedWall = targetSurfaceHeight > 0 &&
                finalTargetX >= wall.x - 0.2 && finalTargetX <= wall.x + wall.width + 0.2 &&
                finalTargetY >= wall.y - 0.2 && finalTargetY <= wall.y + wall.height + 0.2;

              if (isTargetedWall || (targetSurfaceHeight > 0 && step >= steps - 3)) {
                // This is the intended landing on top of the targeted wall!
                isLandingOnWallTop = true;
                break;
              } else if (targetSurfaceHeight === 0) {
                // Intermediate wall hit from above
                isLandingOnWallTop = true;
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            } else if (currentZ < wall.wallHeight - 0.05) {
              // Side wall collision (ignore departure at step <= 1 if starting in contact)
              if (step > 1) {
                collidesWall = true;
                isBlocked = true;
                blockedWallId = wall.id;
                break;
              }
            }
          }
        }
      }

      points.push({
        x: currentX,
        y: currentY,
        z: currentZ,
        t,
        couldClearWall,
        isOverWall,
        collidesWall,
      });

      if (collidesWall) {
        break; // Trajectory truncated on collision
      }
    }

    const lastPoint = points[points.length - 1];
    return {
      points,
      landPoint: {
        x: isBlocked ? lastPoint.x : finalTargetX,
        y: isBlocked ? lastPoint.y : finalTargetY,
        z: isBlocked ? lastPoint.z : targetSurfaceHeight,
      },
      isBlockedByWall: isBlocked,
      isLandingOnWallTop: isBlocked ? isLandingOnWallTop : (targetSurfaceHeight > 0),
      blockedAtWallId: blockedWallId,
      targetObject,
      targetSurfaceHeight,
      isAutoLocked,
      peakHeight,
      flightTime: totalTime,
      colliderRadius: held.colliderRadius,
      visualShape: held.visualShape,
      launchVel: { vx, vy, vz },
      launchPos: { x: startX, y: startY, z: startZ },
    };
  }

  /**
   * Executes the throw of the held object using the exact same launch parameters
   */
  public throwHeldObject(
    character: Character,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena,
    entities?: GameObject[],
    hoverScale?: number,
    autoLock = false,
    launchVel?: { vx: number; vy: number; vz: number },
    launchPos?: { x: number; y: number; z: number }
  ): GameObject | null {
    if (!this.enabled || !character.heldObject) return null;

    const held = character.heldObject;

    if (!launchPos) {
      const aimDx = aimTargetX - character.position.x;
      const aimDy = aimTargetY - character.position.y;
      if (Math.hypot(aimDx, aimDy) > 0.05) {
        character.facingAngle = Math.atan2(aimDy, aimDx);
        const alignedHeldPos = character.calculateHeldObjectPosition(arena);
        held.position.x = alignedHeldPos.x;
        held.position.y = alignedHeldPos.y;
        held.position.z = alignedHeldPos.z;
      }
    }

    let startX = launchPos ? launchPos.x : held.position.x;
    let startY = launchPos ? launchPos.y : held.position.y;
    let startZ = launchPos ? launchPos.z : held.position.z;

    if (!launchPos && character.position.z < arena.wallHeight) {
      const clamped = ThrowModule.clampStartOutsideWalls(
        startX,
        startY,
        held.colliderRadius,
        arena,
        character.position.z,
        character.position.x,
        character.position.y
      );
      startX = clamped.x;
      startY = clamped.y;
    }

    const candidateEntities = entities ?? arena.entities;
    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    const charVel = {
      x: character.velocity.x,
      y: character.velocity.y,
      z: character.isAboveGround ? character.verticalVelocity : 0,
    };

    const maxSpeed = this.calculateMaxLaunchSpeed(character, held);

    const launch = launchVel
      ? { vx: launchVel.vx, vy: launchVel.vy, vz: launchVel.vz, totalTime: 1.0, finalTargetX: aimTargetX, finalTargetY: aimTargetY, targetSurfaceHeight: 0 }
      : this.computeLaunchVelocity(
          startX, startY, startZ, aimTargetX, aimTargetY, arena, maxSpeed, held.hasGravity, held.hasVerticalVelocity, held.colliderRadius, charVel,
          candidateEntities, scale, character, held, autoLock
        );
    if (!launch) return null;

    // Energy consumption check based on actual kinetic work of the launch:
    // Work done on object: W = 0.5 * m * v_launch^2
    // Muscular metabolic cost is ~3.5x mechanical work due to muscular efficiency.
    if (this.consumesEnergy) {
      const bus = character.getEnergyBus(this.energyBusId);
      if (bus && bus.enabled) {
        const heldMass = held.hasMass ? Math.max(0.1, held.mass) : 1.0;
        const actualLaunchSpeed = Math.hypot(launch.vx, launch.vy, launch.vz);
        const mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
        const metabolicJoules = Math.max(5, mechWorkJoules * 3.5);
        const fraction = bus.requestEnergy(metabolicJoules, 0.08, character.energyPool, character.properties);
        if (fraction <= 0) {
          return null;
        }
      }
    }

    if (launch.isAutoLocked && launch.targetObject) {
      const dx = launch.targetObject.position.x - character.position.x;
      const dy = launch.targetObject.position.y - character.position.y;
      if (Math.hypot(dx, dy) > 0.05) {
        character.facingAngle = Math.atan2(dy, dx);
      }
    } else if (Math.hypot(launch.vx, launch.vy) > 0.05) {
      character.facingAngle = Math.atan2(launch.vy, launch.vx);
    }

    // Refresh held object position along updated facing angle if not passed explicitly
    if (!launchPos) {
      const heldPos = character.calculateHeldObjectPosition(arena);
      startX = heldPos.x;
      startY = heldPos.y;
      startZ = heldPos.z;
    }

    held.isHeld = false;
    held.heldBy = null;
    held.lastThrower = character;
    held.originalThrower = character;
    held.isInFlight = true;
    held.wakeUp();
    held.position.x = startX;
    held.position.y = startY;
    held.velocity.x = launch.vx;
    held.velocity.y = launch.vy;
    held.verticalVelocity = launch.vz;
    held.position.z = held.hasVerticalPosition ? Math.max(startZ, held.position.z) : 0;

    // If held object is rollable and has friction, impart rolling motion along throw direction
    if (held.hasFriction && held.rollModule && held.rollModule.enabled) {
      const R = held.colliderRadius > 0 ? held.colliderRadius : 0.3;
      held.rollModule.angularVelocity.y = launch.vx / R;
      held.rollModule.angularVelocity.x = -launch.vy / R;
    }

    // Apply opposite recoil velocity to character based on linear momentum conservation
    // Released object velocity change: deltaV = v_launch - v_initial (where v_initial = character.velocity)
    // Impulse on object: J_obj = m_held * deltaV
    // Recoil on character: J_char = -J_obj -> v_recoil = -(m_held / m_char) * (v_launch - character.velocity)
    // When throwing perpendicular to movement, countering the object's current velocity in hand
    // applies an additional forward reaction boost in the movement direction!
    const carriedMass = (held.hasMass) ? held.mass : 0;
    const charBaseMass = (character.hasMass) ? Math.max(0.2, character.baseMass) : 0;
    const recoilRatio = (carriedMass > 0 && charBaseMass > 0) ? (carriedMass / charBaseMass) : 0;

    // Detach from hands
    character.heldObject = null;

    const deltaVx = launch.vx - character.velocity.x;
    const deltaVy = launch.vy - character.velocity.y;

    character.velocity.x -= deltaVx * recoilRatio;
    character.velocity.y -= deltaVy * recoilRatio;

    if (character.isAboveGround && held.hasVerticalVelocity) {
      const deltaVz = launch.vz - character.verticalVelocity;
      character.verticalVelocity -= deltaVz * recoilRatio;
    }

    return held;
  }
}
