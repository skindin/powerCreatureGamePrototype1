import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { Character } from "./Character.js";
import type { Arena, Wall } from "../engine/Arena.js";
import type { GameObject } from "../engine/GameObject.js";
import { ThrowModule } from "./ThrowModule.js";

export interface LaserModuleOptions {
  damageRate?: number;
  maxDamageRate?: number;
  thickness?: number;
  maxPower?: number;
  energyBusId?: string;
  allowPartialPower?: boolean;
  enabled?: boolean;
}

export interface LaserHitResult {
  endpoint: { x: number; y: number; z: number };
  hitWall: Wall | null;
  hitEntities: GameObject[];
  isBlockedByWall: boolean;
}

/**
 * LaserModule
 * 
 * Continuous straight-line laser blast ability.
 * - Aimed when holding Left Control (instant targeting line adapting to ground/wall elevation).
 * - Fired when holding Left Control + Left Click (active damaging beam).
 * - Damage rate is scroll-adjustable while holding Control and persists when turned off.
 * - Energy draw: Power = (damageRate / maxDamageRate) * maxPower.
 * - Pierces through entities up to the first blocking wall.
 */
export class LaserModule {
  public id = "laser_blast";
  public name = "Laser Blast";
  public enabled = true;

  /** Current active damage rate (HP / second). Persists when laser turns off! */
  public damageRateProp: DynamicProperty;
  /** Maximum damage rate (HP / second) */
  public maxDamageRateProp: DynamicProperty;
  /** Width/thickness of the laser beam in world units (dev tool property, effects hit detection) */
  public thicknessProp: DynamicProperty;
  /** Maximum power rating (Watts) demanded when operating at max damage rate */
  public maxPowerProp: DynamicProperty;

  /** Energy Bus to draw continuous power from */
  public energyBusId: string = "bus_main";
  /** Whether to allow partial power firing when bus cannot satisfy 100% wattage */
  public allowPartialPower: boolean = true;

  /** Live state */
  public isAiming: boolean = false;
  public isFiring: boolean = false;
  public actualPowerWatts: number = 0;
  public actualDamageRate: number = 0;
  public currentEndpoint: { x: number; y: number; z: number } | null = null;
  public startPoint: { x: number; y: number; z: number } | null = null;
  public hitWall: Wall | null = null;
  public hitEntities: GameObject[] = [];

  constructor(options?: LaserModuleOptions) {
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.energyBusId) this.energyBusId = options.energyBusId;
    if (options?.allowPartialPower !== undefined) this.allowPartialPower = options.allowPartialPower;

    const baseDamage = options?.damageRate ?? 50.0;
    const baseMaxDamage = options?.maxDamageRate ?? 200.0;
    const baseThickness = options?.thickness ?? 0.35;
    const baseMaxPower = options?.maxPower ?? 500.0;

    this.damageRateProp = new DynamicProperty(baseDamage);
    this.maxDamageRateProp = new DynamicProperty(baseMaxDamage);
    this.thicknessProp = new DynamicProperty(baseThickness);
    this.maxPowerProp = new DynamicProperty(baseMaxPower);
  }

  public get damageRate(): number {
    return this.damageRateProp.literalValue;
  }

  public get maxDamageRate(): number {
    return this.maxDamageRateProp.literalValue;
  }

  public get thickness(): number {
    return this.thicknessProp.literalValue;
  }

  public get maxPower(): number {
    return this.maxPowerProp.literalValue;
  }

  public getDamageRate(registry?: ObjectPropertiesRegistry): number {
    return this.damageRateProp.get(registry);
  }

  public setDamageRate(val: number, registry?: ObjectPropertiesRegistry): void {
    const max = this.getMaxDamageRate(registry);
    const clamped = Math.max(0, Math.min(max, val));
    this.damageRateProp.set(clamped, registry);
  }

  public adjustDamageRate(delta: number, registry?: ObjectPropertiesRegistry): void {
    const cur = this.getDamageRate(registry);
    this.setDamageRate(cur + delta, registry);
  }

  public getMaxDamageRate(registry?: ObjectPropertiesRegistry): number {
    return this.maxDamageRateProp.get(registry);
  }

  public setMaxDamageRate(val: number, registry?: ObjectPropertiesRegistry): void {
    this.maxDamageRateProp.set(Math.max(1, val), registry);
  }

  public getThickness(registry?: ObjectPropertiesRegistry): number {
    return this.thicknessProp.get(registry);
  }

  public setThickness(val: number, registry?: ObjectPropertiesRegistry): void {
    this.thicknessProp.set(Math.max(0.05, Math.min(3.0, val)), registry);
  }

  public getMaxPower(registry?: ObjectPropertiesRegistry): number {
    return this.maxPowerProp.get(registry);
  }

  public setMaxPower(val: number, registry?: ObjectPropertiesRegistry): void {
    this.maxPowerProp.set(Math.max(1, val), registry);
  }

  /**
   * Calculates the demanded power in Watts based on current damage rate and max power property:
   * Power = (damageRate / maxDamageRate) * maxPower
   */
  public calculateDemandedPower(registry?: ObjectPropertiesRegistry): number {
    const maxDamage = Math.max(1, this.getMaxDamageRate(registry));
    const curDamage = Math.max(0, this.getDamageRate(registry));
    const maxPower = Math.max(0, this.getMaxPower(registry));
    return (curDamage / maxDamage) * maxPower;
  }

  /**
   * Computes the 3D laser ray from the character to the aim target, testing for wall obstructions.
   */
  public calculateLaserRay(
    character: Character,
    targetScreenX: number,
    targetScreenY: number,
    arena: Arena,
    hoverScale = 0
  ): LaserHitResult {
    const startZ = character.position.z;
    const startX = character.position.x;
    const startY = character.position.y;

    // Adapt endpoint elevation to whatever surface is under the mouse cursor:
    const scale = hoverScale > 0 ? hoverScale : (arena.visualAltitudeScale ?? 0.5);
    const wallOver = ThrowModule.findWallOverlappingCollider(targetScreenX, targetScreenY, 0.2, arena, scale);
    const targetSurfaceHeight = wallOver
      ? wallOver.targetSurfaceHeight
      : arena.getSupportingSurfaceHeight(targetScreenX, targetScreenY, 0);

    const targetX = targetScreenX;
    const targetY = targetScreenY;
    const targetZ = targetSurfaceHeight;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dz = targetZ - startZ;
    const dist2D = Math.hypot(dx, dy);

    if (dist2D < 0.05) {
      return {
        endpoint: { x: targetX, y: targetY, z: targetZ },
        hitWall: null,
        hitEntities: [],
        isBlockedByWall: false,
      };
    }

    const dirX = dx / dist2D;
    const dirY = dy / dist2D;

    // Raycast against arena walls: find the earliest wall intersection along the ray path
    let closestWallDist = dist2D;
    let hitWall: Wall | null = null;
    let isBlocked = false;

    for (const wall of arena.walls) {
      const enterInfo = ThrowModule.getRayWallEnterDistance(startX, startY, dirX, dirY, wall);
      if (enterInfo && enterInfo.enterDist > 0.05 && enterInfo.enterDist < closestWallDist) {
        // Check if beam height at this wall enter distance is blocked by wall height
        const tFrac = enterInfo.enterDist / dist2D;
        const beamZ = startZ + dz * tFrac;
        if (beamZ <= wall.wallHeight + 0.01) {
          closestWallDist = enterInfo.enterDist;
          hitWall = wall;
          isBlocked = true;
        }
      }
    }

    const endX = startX + dirX * closestWallDist;
    const endY = startY + dirY * closestWallDist;
    const endZ = startZ + dz * (closestWallDist / dist2D);

    return {
      endpoint: { x: endX, y: endY, z: endZ },
      hitWall,
      hitEntities: [],
      isBlockedByWall: isBlocked,
    };
  }

  /**
   * Finds all entities intersecting the 3D laser capsule segment.
   */
  public findIntersectingEntities(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    thickness: number,
    candidates: GameObject[],
    exclude?: GameObject
  ): GameObject[] {
    const hits: GameObject[] = [];
    const segDx = end.x - start.x;
    const segDy = end.y - start.y;
    const segDz = end.z - start.z;
    const segLenSq = segDx * segDx + segDy * segDy + segDz * segDz;

    if (segLenSq < 0.0001) return hits;

    for (const ent of candidates) {
      if (ent === exclude || ent.isHeld) continue;

      const entRadius = ent.hasCollider ? ent.colliderRadius : (ent.colliderModule?.radius ?? 0.35);
      const hitRadius = entRadius + thickness * 0.5;

      const pDx = ent.position.x - start.x;
      const pDy = ent.position.y - start.y;
      const pDz = (ent.position.z ?? 0) - start.z;

      // Project onto segment: t = dot(P - A, B - A) / |B - A|^2
      const t = Math.max(0, Math.min(1, (pDx * segDx + pDy * segDy + pDz * segDz) / segLenSq));

      const projX = start.x + segDx * t;
      const projY = start.y + segDy * t;
      const projZ = start.z + segDz * t;

      const distSq = (ent.position.x - projX) ** 2 +
                     (ent.position.y - projY) ** 2 +
                     ((ent.position.z ?? 0) - projZ) ** 2;

      if (distSq <= hitRadius * hitRadius) {
        hits.push(ent);
      }
    }

    return hits;
  }

  /**
   * Per-frame update for LaserModule.
   */
  public update(
    dt: number,
    character: Character,
    arena: Arena,
    targetPos: { x: number; y: number } | null,
    isAimingInput: boolean,
    isFiringInput: boolean,
    candidateEntities?: GameObject[],
    hoverScale = 0
  ): void {
    if (!this.enabled || dt <= 0) {
      this.isAiming = false;
      this.isFiring = false;
      this.actualPowerWatts = 0;
      this.actualDamageRate = 0;
      this.currentEndpoint = null;
      this.startPoint = null;
      this.hitWall = null;
      this.hitEntities = [];
      return;
    }

    const targetScreenX = targetPos ? targetPos.x : character.position.x + Math.cos(character.facingAngle) * 5;
    const targetScreenY = targetPos ? targetPos.y : character.position.y + Math.sin(character.facingAngle) * 5;

    this.isAiming = isAimingInput;
    this.isFiring = isAimingInput && isFiringInput;

    if (!this.isAiming && !this.isFiring) {
      this.actualPowerWatts = 0;
      this.actualDamageRate = 0;
      this.currentEndpoint = null;
      this.startPoint = null;
      this.hitWall = null;
      this.hitEntities = [];
      return;
    }

    // Orient character towards laser target
    const aimDx = targetScreenX - character.position.x;
    const aimDy = targetScreenY - character.position.y;
    if (Math.hypot(aimDx, aimDy) > 0.05) {
      character.facingAngle = Math.atan2(aimDy, aimDx);
    }

    // Calculate laser ray endpoint & wall obstruction
    const rayResult = this.calculateLaserRay(character, targetScreenX, targetScreenY, arena, hoverScale);
    this.currentEndpoint = rayResult.endpoint;
    this.startPoint = {
      x: character.position.x,
      y: character.position.y,
      z: character.position.z,
    };
    this.hitWall = rayResult.hitWall;

    const registry = character.properties;
    const thickness = this.getThickness(registry);

    if (this.isFiring) {
      // 1. Demand power from Energy Bus
      const demandedWatts = this.calculateDemandedPower(registry);
      let grantedWatts = 0;

      if (demandedWatts > 0) {
        const bus = character.getEnergyBus(this.energyBusId);
        if (bus && bus.enabled && !bus.isExhausted) {
          grantedWatts = bus.requestPower(
            demandedWatts,
            dt,
            character.energyPool,
            registry,
            false,
            "laser_blast",
            this.allowPartialPower
          );
        }
      }

      this.actualPowerWatts = grantedWatts;

      // If no power granted (or bus exhausted), laser cuts off and deals 0 damage
      if (demandedWatts > 0 && grantedWatts <= 0.001) {
        this.actualDamageRate = 0;
        this.isFiring = false;
        this.hitEntities = [];
        return;
      }

      const powerRatio = demandedWatts > 0 ? Math.min(1.0, grantedWatts / demandedWatts) : 1.0;
      const effectiveDamageRate = this.getDamageRate(registry) * powerRatio;
      this.actualDamageRate = effectiveDamageRate;

      // 2. Query intersecting entities along the beam up to the endpoint
      const list = candidateEntities ?? arena.entities ?? [];
      this.hitEntities = this.findIntersectingEntities(this.startPoint, this.currentEndpoint, thickness, list, character);

      // 3. Apply continuous damage to pierced entities
      const damageTick = effectiveDamageRate * dt;
      for (const ent of this.hitEntities) {
        if (ent.isCharacter) {
          const targetChar = ent as Character;
          if (targetChar.healthModule && targetChar.healthModule.enabled) {
            targetChar.healthModule.takeDamage(damageTick, targetChar.properties, {
              id: "laser_blast",
              name: "Laser Blast",
              type: "continuous",
              rate: effectiveDamageRate,
              color: "#06b6d4",
            });
          }
        }
      }
    } else {
      // Aiming only: previewing line, not firing
      this.actualPowerWatts = 0;
      this.actualDamageRate = 0;
      this.hitEntities = [];
    }
  }
}
