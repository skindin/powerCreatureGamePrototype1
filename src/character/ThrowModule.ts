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
  flattestPoints?: TrajectoryPoint[];
  steepestPoints?: TrajectoryPoint[];
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
  lockedTargetPos?: { x: number; y: number } | null;
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

  /**
   * Remembered arc ratio: 0.0 (shortest / flattest possible arc) to 1.0 (tallest / steepest possible arc).
   * Trajectory manipulation is based on this ratio between the shortest and tallest arc available.
   * If the target moves farther so the maximum arc height flattens, ratio 1.0 continues to track the highest possible arc.
   */
  public savedArcRatio: number = 0.0;
  public hasUserSetArcRatio: boolean = false;

  public get savedArcSteepness(): number {
    return this.savedArcRatio * 2.0 - 1.0;
  }
  public set savedArcSteepness(val: number) {
    this.savedArcRatio = Math.max(0.0, Math.min(1.0, (val + 1.0) / 2.0));
    this.hasUserSetArcRatio = true;
  }

  constructor(options?: {
    maxThrowSpeed?: number;
    baseThrowForce?: number;
    maxThrowAimDistance?: number;
    maxThrowHeight?: number;
    consumesEnergy?: boolean;
    energyBusId?: string;
    enabled?: boolean;
  }) {
    const initialSpeed = options?.maxThrowSpeed ?? options?.baseThrowForce ?? 100.0;
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

    const mass = Math.max(0.05, heldObject.mass);

    // If consumesEnergy, max throw speed is governed by maxThrowSpeed * strength (speedCap),
    // bounded by available burst power/energy (up to full burst capacity):
    // E_metabolic <= maxPower (1.0s full burst exertion = 500 Joules of muscle energy)
    // W_mech = E_metabolic * efficiency * strength
    // v_max = sqrt(2 * W_mech / m)
    if (this.consumesEnergy && thrower) {
      const bus = thrower.getEnergyBus(this.energyBusId);
      if (bus && bus.enabled) {
        const maxPower = bus.getMaxPower(thrower.properties);
        const efficiency = Math.max(0.01, bus.getMuscleEfficiency(thrower.properties));
        const maxBurstMetabolicJoules = maxPower * strength; // 500 Joules for max effort burst
        const availableMechJoules = maxBurstMetabolicJoules * efficiency;
        const massLimitedSpeed = Math.sqrt((2 * Math.max(1.0, availableMechJoules)) / mass);
        return Math.min(speedCap, massLimitedSpeed);
      }
    }

    // Baseline fallback: F = m * a scaling against 1.0u reference mass
    const massLimitedSpeed = (speedCap * Math.sqrt(strength)) / Math.sqrt(Math.max(0.1, mass));
    return Math.min(speedCap, massLimitedSpeed);
  }

  /**
   * Calculates the maximum launch speed considering character strength, held object mass,
   * speed cap, and available metabolic energy/stamina from the connected EnergyBus.
   */
  public calculateEffectiveMaxLaunchSpeed(character: Character, held: GameObject): number {
    let maxSpeed = this.calculateMaxLaunchSpeed(character, held);
    if (this.consumesEnergy) {
      const bus = character.getEnergyBus(this.energyBusId);
      if (bus && bus.enabled) {
        if (bus.isExhausted) return 0;

        const poolJoules = character.energyPool ? character.energyPool.getCurrentEnergy(character.properties) : Infinity;
        const currentStamina = bus.currentStaminaProp.get(character.properties);
        const maxPower = bus.maxPowerProp.get(character.properties);
        if (currentStamina <= 0.001 || poolJoules <= 0.001) return 0;

        const maxAffordableMetabolicJoules = Math.min(poolJoules, currentStamina * maxPower);
        const busEfficiency = Math.max(0.01, bus.getMuscleEfficiency(character.properties));
        const maxAffordableMechWork = maxAffordableMetabolicJoules * busEfficiency;
        const heldMass = held.hasMass ? Math.max(0.1, held.mass) : 1.0;
        const maxSpeedFromEnergy = Math.sqrt((2 * maxAffordableMechWork) / heldMass);

        if (maxSpeedFromEnergy < 0.5) return 0;
        maxSpeed = Math.min(maxSpeed, maxSpeedFromEnergy);
      }
    }
    return maxSpeed;
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
    autoLock = false,
    lockedTargetPos?: { x: number; y: number } | null
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
    tMin: number;
    tMax: number;
  } | null {
    let hoveredEntity: GameObject | null = null;
    let effectiveTargetX = lockedTargetPos ? lockedTargetPos.x : targetX;
    let effectiveTargetY = lockedTargetPos ? lockedTargetPos.y : targetY;
    let isLocked = Boolean(lockedTargetPos);
    let targetSurfaceHeight = 0;

    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    // Only search for lock target if autoLock is explicitly active and not manually position-locked
    if (autoLock && !lockedTargetPos) {
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
      // If mouse is over a wall (including 2.5D visual roof and front face):
      const wallUnderCursor = ThrowModule.getWallUnderCursor(effectiveTargetX, effectiveTargetY, arena, scale);
      if (wallUnderCursor) {
        effectiveTargetX = wallUnderCursor.physX;
        effectiveTargetY = wallUnderCursor.physY;
        targetSurfaceHeight = wallUnderCursor.wall.wallHeight;
      } else {
        // Fallback to open ground:
        targetSurfaceHeight = arena.getSupportingSurfaceHeight(effectiveTargetX, effectiveTargetY);
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

    const launchSpeed = Math.max(1.0, throwPower);
    const g = arena.gravity;

    // Clamp aim distance to character reach and ballistic range
    const maxThrowAimDistance = this.maxThrowAimDistanceProp.get(thrower?.properties);
    let actualDist = Math.min(dist, maxThrowAimDistance);

    const deltaZ = targetSurfaceHeight - startZ;
    if (hasGravity && hasVerticalVelocity) {
      const maxReach = (launchSpeed / g) * Math.sqrt(Math.max(0.001, launchSpeed * launchSpeed + 2 * g * Math.max(0, -deltaZ)));
      if (actualDist > maxReach) {
        actualDist = Math.max(0.1, maxReach);
      }
    }

    const dirX = dx / dist;
    const dirY = dy / dist;
    const finalTargetX = startX + dirX * actualDist;
    const finalTargetY = startY + dirY * actualDist;

    // If aim distance was clamped, verify what surface is beneath finalTarget
    if (actualDist < dist) {
      if (isLocked) {
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

    // Straight-line horizontal flight if zero-G or no vertical velocity module
    if (!hasGravity || !hasVerticalVelocity) {
      const totalTime = Math.max(0.14, actualDist / launchSpeed);
      const vx = dirX * (actualDist / totalTime);
      const vy = dirY * (actualDist / totalTime);
      const vz = 0;
      return {
        vx, vy, vz, totalTime, finalTargetX, finalTargetY,
        targetSurfaceHeight: startZ, targetObject: hoveredEntity,
        isAutoLocked: isLocked, tMin: totalTime, tMax: totalTime
      };
    }

    const aCoeff = 0.25 * g * g;
    const cCoeff = actualDist * actualDist + deltaZ * deltaZ;

    // 1. Compute baseline optimal (minimum energy) flight time T_opt:
    const dist3D = Math.sqrt(actualDist * actualDist + deltaZ * deltaZ);
    const tOpt = Math.sqrt((2 * dist3D) / g);

    // 2. Compute flattest flight time T_flat at launchSpeed:
    const bCoeffMax = -(launchSpeed * launchSpeed - g * deltaZ);
    const discMax = Math.max(0, bCoeffMax * bCoeffMax - 4 * aCoeff * cCoeff);
    const uLow = discMax >= 0 ? (-bCoeffMax - Math.sqrt(discMax)) / (2 * aCoeff) : tOpt * tOpt;
    const tFlat = uLow > 0 ? Math.sqrt(uLow) : actualDist / launchSpeed;

    // 3. Compute steepest flight time T_high at launchSpeed:
    const uHigh = discMax >= 0 ? (-bCoeffMax + Math.sqrt(discMax)) / (2 * aCoeff) : tOpt * 2.2 * (tOpt * 2.2);
    const tHigh = uHigh > 0 ? Math.sqrt(uHigh) : tOpt * 2.2;

    // Scan dense samples along trajectory to ensure clearance over any intermediate walls.
    // If the flat trajectory would collide with an intermediate wall, increase minWallTime to the minimum
    // required to clear the wall top with a tight, minimal clearance arc (from commit 824d5a7).
    const colliderRadiusCheck = colliderRadius > 0 ? colliderRadius : 0.35;
    const clearance = 0.25;

    const sampleRatios: number[] = [];
    for (let s = 0.005; s < 0.1; s += 0.005) {
      sampleRatios.push(s);
    }
    for (let i = 4; i <= 40; i++) {
      sampleRatios.push(i / 40);
    }

    let minWallTime = tFlat;

    for (const s of sampleRatios) {
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

          const baselineZ = (1 - s) * startZ + s * targetSurfaceHeight;
          const requiredHeight = wall.wallHeight + clearance;
          const requiredDeltaZ = requiredHeight - baselineZ;
          if (requiredDeltaZ > 0) {
            const denom = arena.gravity * s * (1 - s);
            if (denom > 0.0001) {
              const reqTimeSq = (2 * requiredDeltaZ) / denom;
              if (reqTimeSq > 0) {
                const reqTime = Math.sqrt(reqTimeSq);
                if (reqTime > minWallTime) {
                  minWallTime = reqTime;
                }
              }
            }
          }
        }
      }
    }

    const tMin = Math.max(0.02, tFlat, minWallTime);
    const tMax = Math.max(tMin, tHigh);

    let chosenT = 0;
    if (!this.hasUserSetArcRatio) {
      // In commit 824d5a7, standard throws used the flat, fast trajectory (actualDist / maxForwardSpeed):
      this.savedArcRatio = 0.0;
      chosenT = tMin;
    } else {
      chosenT = tMin + this.savedArcRatio * (tMax - tMin);
    }
    const totalTime = Math.max(0.02, chosenT);

    const vz = (deltaZ + 0.5 * g * totalTime * totalTime) / totalTime;
    const horizontalSpeed = actualDist / totalTime;
    const vx = dirX * horizontalSpeed;
    const vy = dirY * horizontalSpeed;

    return {
      vx,
      vy,
      vz,
      totalTime,
      finalTargetX,
      finalTargetY,
      targetSurfaceHeight,
      targetObject: hoveredEntity,
      isAutoLocked: isLocked,
      tMin,
      tMax
    };
  }

  /**
   * Pre-calculates trajectory points for real-time visualization overlay
   */
  public calculateTrajectory(
    character: Character,
    aimTargetX: number,
    aimTargetY: number,
    arena: Arena,
    _entities?: GameObject[],
    hoverScale?: number,
    _autoLock = false,
    lockedTargetPos?: { x: number; y: number } | null,
    aimLockDelta = 0
  ): TrajectoryCalculation | null {
    if (!this.enabled || !character.heldObject) return null;

    const held = character.heldObject;
    const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);

    // If right-click locked, adjust savedArcRatio using vertical mouse delta
    // Dragging UP (rawDy < 0) -> positive deltaRatio -> heightens arc (increases ratio toward 1.0)
    // Dragging DOWN (rawDy > 0) -> negative deltaRatio -> lowers arc (decreases ratio toward 0.0)
    if (lockedTargetPos && aimLockDelta !== 0) {
      // 300px raw mouse movement sweeps full 0.0 to 1.0 range
      const deltaRatio = -aimLockDelta / 300;
      this.savedArcRatio = Math.max(0.0, Math.min(1.0, this.savedArcRatio + deltaRatio));
      this.hasUserSetArcRatio = true;
    }

    // Orient character towards the locked landing position if active, or aimTarget
    const targetAimX = lockedTargetPos ? lockedTargetPos.x : aimTargetX;
    const targetAimY = lockedTargetPos ? lockedTargetPos.y : aimTargetY;
    const charAimDx = targetAimX - character.position.x;
    const charAimDy = targetAimY - character.position.y;
    if (Math.hypot(charAimDx, charAimDy) > 0.05) {
      character.facingAngle = Math.atan2(charAimDy, charAimDx);
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

    const maxSpeed = this.calculateEffectiveMaxLaunchSpeed(character, held);
    if (maxSpeed <= 0.1) return null;

    const canFlyVertically = held.hasGravity && held.hasVerticalVelocity;

    const launch = this.computeLaunchVelocity(
      startX,
      startY,
      startZ,
      targetAimX,
      targetAimY,
      arena,
      maxSpeed,
      held.hasGravity,
      held.hasVerticalVelocity,
      held.colliderRadius,
      undefined,
      _entities,
      scale,
      character,
      held,
      _autoLock,
      lockedTargetPos
    );
    if (!launch) return null;

    const { vx, vy, vz, totalTime, finalTargetX, finalTargetY, targetSurfaceHeight, tMin, tMax, targetObject, isAutoLocked } = launch;
    const resolvedSurfaceHeight = targetSurfaceHeight;
    const dist = Math.hypot(finalTargetX - startX, finalTargetY - startY);
    const dirX = dist > 0.001 ? (finalTargetX - startX) / dist : Math.cos(character.facingAngle);
    const dirY = dist > 0.001 ? (finalTargetY - startY) / dist : Math.sin(character.facingAngle);
    const deltaZ = resolvedSurfaceHeight - startZ;
    const g = arena.gravity;

    // Fine simulation steps matching 120Hz physics precision
    const steps = 90;
    const dtStep = totalTime / steps;
    const points: TrajectoryPoint[] = [];

    let isBlocked = false;
    let isLandingOnWallTop = resolvedSurfaceHeight > 0;
    let blockedWallId: string | undefined;
    let peakHeight = startZ;

    for (let step = 0; step <= steps; step++) {
      const t = step * dtStep;
      // At the final step, enforce exact final target coordinates
      const currentX = step === steps ? finalTargetX : startX + vx * t;
      const currentY = step === steps ? finalTargetY : startY + vy * t;
      const calculatedZ = canFlyVertically ? (startZ + vz * t - 0.5 * arena.gravity * t * t) : startZ;
      const currentZ = canFlyVertically ? (step === steps ? resolvedSurfaceHeight : (step > steps - 3 ? Math.max(resolvedSurfaceHeight, calculatedZ) : Math.max(0, calculatedZ))) : startZ;
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

    // Helper to simulate boundary arc points for ghost previews
    const simulateGhostArc = (simFlightTime: number): TrajectoryPoint[] => {
      const gTime = Math.max(0.02, simFlightTime);
      const gVz = (deltaZ + 0.5 * g * gTime * gTime) / gTime;
      const gHSpd = dist / gTime;
      const gVx = dirX * gHSpd;
      const gVy = dirY * gHSpd;

      const gSteps = 60;
      const gDt = gTime / gSteps;
      const gPts: TrajectoryPoint[] = [];

      for (let s = 0; s <= gSteps; s++) {
        const t = s * gDt;
        const curX = s === gSteps ? finalTargetX : startX + gVx * t;
        const curY = s === gSteps ? finalTargetY : startY + gVy * t;
        const calcZ = canFlyVertically ? (startZ + gVz * t - 0.5 * arena.gravity * t * t) : startZ;
        const curZ = canFlyVertically
          ? (s === gSteps ? resolvedSurfaceHeight : (s > gSteps - 3 ? Math.max(resolvedSurfaceHeight, calcZ) : Math.max(0, calcZ)))
          : startZ;

        let isOver = false;
        let collides = false;

        for (const wall of arena.walls) {
          if (this.testWallIntersection(curX, curY, held.colliderRadius, wall)) {
            isOver = true;
            if (curZ <= wall.wallHeight + 0.001 && s > 1) {
              collides = true;
              break;
            }
          }
        }

        gPts.push({
          x: curX,
          y: curY,
          z: curZ,
          t,
          couldClearWall: curZ > arena.wallHeight,
          isOverWall: isOver,
          collidesWall: collides,
        });

        if (collides) break;
      }
      return gPts;
    };

    // If there is a valid range of arcs to slide between, calculate flattest and steepest ghost trajectories
    const hasArcRange = (tMax - tMin > 0.05);
    const flattestPoints = hasArcRange ? simulateGhostArc(tMin) : undefined;
    const steepestPoints = hasArcRange ? simulateGhostArc(tMax) : undefined;

    const lastPoint = points[points.length - 1];
    return {
      points,
      flattestPoints,
      steepestPoints,
      landPoint: {
        x: isBlocked ? lastPoint.x : finalTargetX,
        y: isBlocked ? lastPoint.y : finalTargetY,
        z: isBlocked ? lastPoint.z : targetSurfaceHeight,
      },
      isBlockedByWall: isBlocked,
      isLandingOnWallTop: isBlocked ? isLandingOnWallTop : (targetSurfaceHeight > 0),
      blockedAtWallId: blockedWallId,
      targetObject: targetObject ?? null,
      targetSurfaceHeight,
      isAutoLocked: isAutoLocked ?? Boolean(lockedTargetPos),
      peakHeight,
      flightTime: totalTime,
      colliderRadius: held.colliderRadius,
      visualShape: held.visualShape,
      launchVel: { vx, vy, vz },
      launchPos: { x: startX, y: startY, z: startZ },
      lockedTargetPos: lockedTargetPos ? { ...lockedTargetPos } : null,
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
    let targetAimX = aimTargetX;
    let targetAimY = aimTargetY;

    if (!launchPos) {
      if (autoLock) {
        const candidateEntities = entities ?? arena.entities;
        const scale = hoverScale !== undefined ? hoverScale : (arena.visualAltitudeScale ?? 0.5);
        const lockedTarget = this.findHoveredEntity(
          aimTargetX,
          aimTargetY,
          arena,
          character,
          held,
          candidateEntities,
          scale,
          Infinity
        );
        if (lockedTarget) {
          targetAimX = lockedTarget.position.x;
          targetAimY = lockedTarget.position.y;
        }
      }

      const aimDx = targetAimX - character.position.x;
      const aimDy = targetAimY - character.position.y;
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

    const maxSpeed = this.calculateEffectiveMaxLaunchSpeed(character, held);
    if (!launchVel && maxSpeed <= 0.1) return null;

    let launch = launchVel
      ? { vx: launchVel.vx, vy: launchVel.vy, vz: launchVel.vz, totalTime: 1.0, finalTargetX: aimTargetX, finalTargetY: aimTargetY, targetSurfaceHeight: 0 }
      : this.computeLaunchVelocity(
          startX, startY, startZ, targetAimX, targetAimY, arena, maxSpeed, held.hasGravity, held.hasVerticalVelocity, held.colliderRadius, charVel,
          candidateEntities, scale, character, held, autoLock
        );

    if (!launch) return null;

    // Energy consumption check based on actual kinetic work of the launch:
    // Work done on object: W = 0.5 * m * v_launch^2
    // Muscle metabolic cost uses muscleEfficiency from the connected EnergyBus.
    if (this.consumesEnergy) {
      const bus = character.getEnergyBus(this.energyBusId);
      if (bus && bus.enabled) {
        if (bus.isExhausted) {
          return null;
        }
        const heldMass = held.hasMass ? Math.max(0.1, held.mass) : 1.0;
        const actualLaunchSpeed = Math.hypot(launch.vx, launch.vy, launch.vz);
        const mechWorkJoules = 0.5 * heldMass * (actualLaunchSpeed * actualLaunchSpeed);
        const busEfficiency = Math.max(0.01, bus.getMuscleEfficiency(character.properties));
        const metabolicJoules = Math.max(5, mechWorkJoules / busEfficiency);

        if (!bus.canSatisfyFullEnergy(metabolicJoules, 0.08, character.energyPool, character.properties)) {
          return null;
        }

        const burstRes = bus.requestInstantBurst({
          abilityId: "throw",
          demandedJoules: metabolicJoules,
          allowPartialPower: false,
          pool: character.energyPool,
          registry: character.properties
        });

        if (!burstRes.granted || burstRes.fraction < 1.0) {
          return null;
        }
      }
    }

    if ((launch as any).isAutoLocked && (launch as any).targetObject) {
      const targetObj = (launch as any).targetObject;
      const dx = targetObj.position.x - character.position.x;
      const dy = targetObj.position.y - character.position.y;
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
