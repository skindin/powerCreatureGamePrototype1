import type { Arena } from "../Arena.js";
import type { GameObject } from "../GameObject.js";
import type { Character } from "../../character/Character.js";
import type { GunModule } from "../GunModule.js";
import type { TrajectoryCalculation, TrajectoryPoint } from "../../character/ThrowModule.js";
import type { ViewSettings } from "../Renderer.js";
import { ElevationRaycaster } from "../physics/ElevationRaycaster.js";

export interface BulletTrailPoint {
  x: number;
  y: number;
  z: number;
  alpha: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  bulletMass: number;
  bulletSpeed: number;
  color: string;
  shooterId: string;
  lifeTime: number;
  maxLifeTime: number;
  trail: BulletTrailPoint[];
}

/**
 * Swept continuous collision detection between a 3D line segment P0 -> P1 and a vertical cylinder.
 * Cylinder is centered at (cx, cy) with radius R, and spans altitude [cz - zTolerance, cz + zTolerance].
 * Returns the earliest time of impact (t in [0, 1]), or null if no intersection.
 */
function getSweptCylinderHit(
  x0: number, y0: number, z0: number,
  dx: number, dy: number, dz: number,
  cx: number, cy: number, cz: number,
  radius: number,
  zTolerance: number
): number | null {
  const zMin = cz - zTolerance;
  const zMax = cz + zTolerance;

  const fx0 = x0 - cx;
  const fy0 = y0 - cy;

  // 1. Check if start point is already inside the 3D cylinder
  if (fx0 * fx0 + fy0 * fy0 <= radius * radius && z0 >= zMin && z0 <= zMax) {
    return 0;
  }

  let earliestT = Infinity;

  // 2. Check 2D circular boundary extrusion along the segment
  const a = dx * dx + dy * dy;
  if (a > 1e-9) {
    const bCoeff = 2 * (fx0 * dx + fy0 * dy);
    const cCoeff = fx0 * fx0 + fy0 * fy0 - radius * radius;
    const disc = bCoeff * bCoeff - 4 * a * cCoeff;
    if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc);
      const t0 = (-bCoeff - sqrtDisc) / (2 * a);
      const t1 = (-bCoeff + sqrtDisc) / (2 * a);

      for (const t of [t0, t1]) {
        if (t >= 0 && t <= 1 && t < earliestT) {
          const zAtT = z0 + t * dz;
          if (zAtT >= zMin && zAtT <= zMax) {
            earliestT = t;
          }
        }
      }
    }
  }

  // 3. Check top cap (z = zMax) and bottom cap (z = zMin)
  if (Math.abs(dz) > 1e-9) {
    const tTop = (zMax - z0) / dz;
    if (tTop >= 0 && tTop <= 1 && tTop < earliestT) {
      const xAtT = x0 + tTop * dx;
      const yAtT = y0 + tTop * dy;
      if ((xAtT - cx) ** 2 + (yAtT - cy) ** 2 <= radius * radius) {
        earliestT = tTop;
      }
    }

    const tBottom = (zMin - z0) / dz;
    if (tBottom >= 0 && tBottom <= 1 && tBottom < earliestT) {
      const xAtT = x0 + tBottom * dx;
      const yAtT = y0 + tBottom * dy;
      if ((xAtT - cx) ** 2 + (yAtT - cy) ** 2 <= radius * radius) {
        earliestT = tBottom;
      }
    }
  }

  // 4. Closest point on segment safety check for grazing contact
  if (a > 1e-9) {
    const bCoeff = 2 * (fx0 * dx + fy0 * dy);
    const tClosest = Math.max(0, Math.min(1, -bCoeff / (2 * a)));
    if (tClosest < earliestT) {
      const xClosest = x0 + tClosest * dx;
      const yClosest = y0 + tClosest * dy;
      if ((xClosest - cx) ** 2 + (yClosest - cy) ** 2 <= radius * radius) {
        const zAtT = z0 + tClosest * dz;
        if (zAtT >= zMin && zAtT <= zMax) {
          earliestT = tClosest;
        }
      }
    }
  }

  return earliestT <= 1 ? earliestT : null;
}

/**
 * BulletManager
 * 
 * Manages active ballistic bullets, trajectory calculation, continuous overheat cooling,
 * bullet-to-character / bullet-to-object ray-swept collision, damage deduction,
 * shooter recoil kickback, and target knockback momentum.
 */
export class BulletManager {
  private static instance: BulletManager | null = null;

  public static getInstance(): BulletManager {
    if (!BulletManager.instance) {
      BulletManager.instance = new BulletManager();
    }
    return BulletManager.instance;
  }

  public bullets: Bullet[] = [];
  private nextBulletId: number = 1;

  public clear(): void {
    this.bullets = [];
  }

  /**
   * Fires a bullet from a character wielding a gun towards aimPos.
   * Inflicts recoil impulse on shooter and records heat in GunModule.
   */
  public fireBullet(
    char: Character,
    gun: GunModule,
    aimPos: { x: number; y: number },
    arena: Arena
  ): Bullet | null {
    if (!gun.canFire()) return null;

    gun.recordShot();

    const launchPos = char.calculateHeldObjectPosition(arena);
    launchPos.z = Math.max(char.position.z + 0.45, launchPos.z);
    const speed = gun.bulletSpeed;

    const dx = aimPos.x - launchPos.x;
    const dy = aimPos.y - launchPos.y;
    const dist = Math.hypot(dx, dy);

    const dirX = dist > 0.001 ? dx / dist : Math.cos(char.facingAngle);
    const dirY = dist > 0.001 ? dy / dist : Math.sin(char.facingAngle);

    const vx = dirX * speed;
    const vy = dirY * speed;
    // Ballistic arc loft: slight upward velocity so the projectile travels along a shallow arc
    const vz = Math.max(2.5, speed * 0.12);

    // Apply recoil kickback impulse on shooter: I = m_bullet * v
    const bulletMass = gun.bulletMass;
    const recoilImpulse = bulletMass * speed;
    const shooterMass = char.mass > 0 ? char.mass : 1.2;

    char.velocity.x -= (dirX * recoilImpulse) / shooterMass;
    char.velocity.y -= (dirY * recoilImpulse) / shooterMass;
    if (recoilImpulse / shooterMass > 0.8) {
      char.applyKnockbackWindow(180);
    }

    const bullet: Bullet = {
      id: `bullet-${this.nextBulletId++}-${performance.now().toFixed(0)}`,
      x: launchPos.x,
      y: launchPos.y,
      z: launchPos.z,
      vx,
      vy,
      vz,
      damage: gun.damagePerBullet,
      bulletMass,
      bulletSpeed: speed,
      color: gun.bulletColor || "#f59e0b",
      shooterId: char.id,
      lifeTime: 0,
      maxLifeTime: 4.0,
      trail: [
        { x: launchPos.x, y: launchPos.y, z: launchPos.z, alpha: 1.0 },
      ],
    };

    this.bullets.push(bullet);
    return bullet;
  }

  /**
   * Calculates the ballistic trajectory preview arc for an aiming character wielding a gun.
   * Matches the high-speed physics arc followed by actual fired bullets.
   */
  public calculateBulletTrajectory(
    char: Character,
    gun: GunModule,
    aimPos: { x: number; y: number },
    arena: Arena
  ): TrajectoryCalculation {
    const launchPos = char.calculateHeldObjectPosition(arena);
    launchPos.z = Math.max(char.position.z + 0.45, launchPos.z);
    const speed = gun.bulletSpeed;

    const dx = aimPos.x - launchPos.x;
    const dy = aimPos.y - launchPos.y;
    const dist = Math.hypot(dx, dy);

    const dirX = dist > 0.001 ? dx / dist : Math.cos(char.facingAngle);
    const dirY = dist > 0.001 ? dy / dist : Math.sin(char.facingAngle);

    const vx = dirX * speed;
    const vy = dirY * speed;
    const vz = Math.max(2.5, speed * 0.12);

    const g = arena.gravity || 30;
    const dt = 0.016;
    const maxSteps = 240;

    const points: TrajectoryPoint[] = [];
    let curX = launchPos.x;
    let curY = launchPos.y;
    let curZ = launchPos.z;
    let curVz = vz;
    let isBlocked = false;
    let landPoint = { x: curX, y: curY, z: curZ };

    points.push({
      x: curX,
      y: curY,
      z: curZ,
      t: 0,
      couldClearWall: curZ >= arena.wallHeight,
      isOverWall: arena.hasWall(Math.floor(curX), Math.floor(curY)),
      collidesWall: false,
    });

    for (let i = 1; i <= maxSteps; i++) {
      const prevX = curX;
      const prevY = curY;
      const prevZ = curZ;
      const t = i * dt;
      curX += vx * dt;
      curY += vy * dt;
      curVz -= g * dt;
      curZ += curVz * dt;

      const stepDx = curX - prevX;
      const stepDy = curY - prevY;
      const stepDz = curZ - prevZ;

      // Continuous swept check against walls
      let hitWall = false;
      for (const wall of arena.walls) {
        const wallHit = ElevationRaycaster.getRayWallEnterDistance(prevX, prevY, stepDx, stepDy, wall);
        if (wallHit && wallHit.enterDist <= 1) {
          const zAtEnter = prevZ + Math.max(0, wallHit.enterDist) * stepDz;
          if (zAtEnter < wall.wallHeight) {
            hitWall = true;
            break;
          }
        }
      }

      const wall = arena.getWallAt(curX, curY);

      if (hitWall || (wall && curZ < wall.wallHeight)) {
        // Intersects wall
        points.push({
          x: curX,
          y: curY,
          z: curZ,
          t,
          couldClearWall: false,
          isOverWall: true,
          collidesWall: true,
        });
        isBlocked = true;
        landPoint = { x: curX, y: curY, z: curZ };
        break;
      }

      if (curZ <= 0) {
        // Hits ground plane
        curZ = 0;
        points.push({
          x: curX,
          y: curY,
          z: 0,
          t,
          couldClearWall: false,
          isOverWall: false,
          collidesWall: false,
        });
        landPoint = { x: curX, y: curY, z: 0 };
        break;
      }

      points.push({
        x: curX,
        y: curY,
        z: curZ,
        t,
        couldClearWall: curZ >= arena.wallHeight,
        isOverWall: Boolean(wall),
        collidesWall: false,
      });
      landPoint = { x: curX, y: curY, z: curZ };
    }

    return {
      points,
      landPoint,
      isBlockedByWall: isBlocked,
      peakHeight: launchPos.z + (vz > 0 ? (vz * vz) / (2 * g) : 0),
      launchVel: { vx, vy, vz },
      launchPos,
    };
  }

  /**
   * Advances bullet physics, trails, and collision detection.
   * Also updates cooling for all gun modules in the world.
   */
  public update(
    dt: number,
    arena: Arena,
    characters: Character[],
    objects: GameObject[]
  ): void {
    // 1. Update guns overheat cooling
    for (const obj of objects) {
      if (obj.gunModule && obj.gunModule.enabled) {
        const isFiringNow = characters.some(
          (c) => c.heldObject === obj && Boolean((c as any).isFiringWeapon)
        );
        obj.gunModule.update(dt, isFiringNow);
      }
    }

    // 2. Advance active bullets
    const g = arena.gravity || 30;
    const remainingBullets: Bullet[] = [];

    for (const b of this.bullets) {
      b.lifeTime += dt;
      if (b.lifeTime >= b.maxLifeTime) {
        continue; // Expired
      }

      // Record trail point
      b.trail.push({ x: b.x, y: b.y, z: b.z, alpha: 1.0 });
      if (b.trail.length > 14) {
        b.trail.shift();
      }
      for (const p of b.trail) {
        p.alpha = Math.max(0, p.alpha - dt * 4.5);
      }

      // Ballistic integration
      b.vz -= g * dt;
      const dx = b.vx * dt;
      const dy = b.vy * dt;
      const dz = b.vz * dt;
      const nextX = b.x + dx;
      const nextY = b.y + dy;
      const nextZ = b.z + dz;

      let earliestHitToi = Infinity;
      let hitType: "ground" | "wall" | "character" | "object" | null = null;
      let hitTarget: Character | GameObject | null = null;

      // 1. Continuous collision with ground plane (z = 0)
      if (b.z <= 0) {
        earliestHitToi = 0;
        hitType = "ground";
      } else if (nextZ <= 0 && Math.abs(dz) > 1e-9) {
        const tGround = Math.max(0, Math.min(1, b.z / (b.z - nextZ)));
        if (tGround < earliestHitToi) {
          earliestHitToi = tGround;
          hitType = "ground";
        }
      }

      // 2. Continuous collision with arena walls
      for (const wall of arena.walls) {
        if (
          b.x >= wall.x &&
          b.x <= wall.x + wall.width &&
          b.y >= wall.y &&
          b.y <= wall.y + wall.height &&
          b.z < wall.wallHeight
        ) {
          if (0 < earliestHitToi) {
            earliestHitToi = 0;
            hitType = "wall";
            hitTarget = null;
          }
          continue;
        }

        const wallHit = ElevationRaycaster.getRayWallEnterDistance(b.x, b.y, dx, dy, wall);
        if (wallHit && wallHit.enterDist <= 1) {
          const tEnter = Math.max(0, wallHit.enterDist);
          const zAtEnter = b.z + tEnter * dz;
          if (zAtEnter < wall.wallHeight) {
            if (tEnter < earliestHitToi) {
              earliestHitToi = tEnter;
              hitType = "wall";
              hitTarget = null;
            }
          } else if (dz < -1e-9) {
            const tWallTop = (wall.wallHeight - b.z) / dz;
            if (tWallTop >= wallHit.enterDist && tWallTop <= wallHit.exitDist && tWallTop >= 0 && tWallTop <= 1) {
              if (tWallTop < earliestHitToi) {
                earliestHitToi = tWallTop;
                hitType = "wall";
                hitTarget = null;
              }
            }
          }
        }
      }

      // 3. Continuous collision with characters
      for (const char of characters) {
        if (char.id === b.shooterId) continue;
        if (char.isHeld) continue;

        const charR = char.colliderRadius > 0 ? char.colliderRadius : 0.35;
        const tChar = getSweptCylinderHit(
          b.x, b.y, b.z,
          dx, dy, dz,
          char.position.x, char.position.y, char.position.z,
          charR,
          0.9
        );

        if (tChar !== null && tChar < earliestHitToi) {
          earliestHitToi = tChar;
          hitType = "character";
          hitTarget = char;
        }
      }

      // 4. Continuous collision with dynamic freebody objects
      for (const obj of objects) {
        if (obj.isHeld || !obj.hasRigidbody) continue;
        if (characters.some((c) => c.heldObject === obj)) continue;

        const objR = obj.colliderRadius > 0 ? obj.colliderRadius : 0.28;
        const tObj = getSweptCylinderHit(
          b.x, b.y, b.z,
          dx, dy, dz,
          obj.position.x, obj.position.y, obj.position.z,
          objR,
          0.8
        );

        if (tObj !== null && tObj < earliestHitToi) {
          earliestHitToi = tObj;
          hitType = "object";
          hitTarget = obj;
        }
      }

      // 5. Resolve earliest collision
      if (hitType !== null) {
        // Record final impact point on trail so the visual streak connects cleanly to the hit surface
        const hitX = b.x + earliestHitToi * dx;
        const hitY = b.y + earliestHitToi * dy;
        const hitZ = Math.max(0, b.z + earliestHitToi * dz);
        b.trail.push({ x: hitX, y: hitY, z: hitZ, alpha: 1.0 });

        if (hitType === "character" && hitTarget) {
          const char = hitTarget as Character;
          if (char.healthModule && char.healthModule.enabled) {
            char.healthModule.takeDamage(b.damage);
          }

          const speed = Math.hypot(b.vx, b.vy) || b.bulletSpeed || 1;
          const knockbackImpulse = b.bulletMass * speed;
          const targetMass = char.mass > 0 ? char.mass : 1.2;
          const dirX = b.vx / speed;
          const dirY = b.vy / speed;

          char.velocity.x += (dirX * knockbackImpulse) / targetMass;
          char.velocity.y += (dirY * knockbackImpulse) / targetMass;
          char.applyKnockbackWindow(350);
        } else if (hitType === "object" && hitTarget) {
          const obj = hitTarget as GameObject;
          const speed = Math.hypot(b.vx, b.vy) || b.bulletSpeed || 1;
          const knockbackImpulse = b.bulletMass * speed;
          const objMass = obj.mass > 0 ? obj.mass : 1.0;
          const dirX = b.vx / speed;
          const dirY = b.vy / speed;

          obj.velocity.x += (dirX * knockbackImpulse) / objMass;
          obj.velocity.y += (dirY * knockbackImpulse) / objMass;
          obj.wakeUp();

          if (obj.healthModule && obj.healthModule.enabled) {
            obj.healthModule.takeDamage(b.damage);
          }
        }

        // Bullet consumed on impact
        continue;
      }

      // No collision along the entire swept path: bullet advances freely
      b.x = nextX;
      b.y = nextY;
      b.z = nextZ;
      remainingBullets.push(b);
    }

    this.bullets = remainingBullets;
  }

  /**
   * Renders flying bullet streaks and fading vapor trails.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    ppu: number,
    _arena: Arena,
    viewSettings: ViewSettings
  ): void {
    if (this.bullets.length === 0) return;

    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;

    const toScreen = (bx: number, by: number, bz: number) => ({
      x: bx * ppu,
      y: (by - bz * hoverScale) * ppu,
    });

    ctx.save();

    for (const b of this.bullets) {
      const head = toScreen(b.x, b.y, b.z);

      // 1. Draw bullet purely as a fading streak / trail (no head circle)
      if (b.trail.length >= 1) {
        for (let i = 0; i < b.trail.length - 1; i++) {
          const p1 = b.trail[i];
          const p2 = b.trail[i + 1];
          const s1 = toScreen(p1.x, p1.y, p1.z);
          const s2 = toScreen(p2.x, p2.y, p2.z);

          const trailAlpha = Math.max(0.05, Math.min(1.0, (p1.alpha + p2.alpha) * 0.5));
          ctx.strokeStyle = `rgba(251, 191, 36, ${trailAlpha * 0.75})`;
          ctx.lineWidth = Math.max(1.2, 2.5 * trailAlpha);
          ctx.lineCap = "round";

          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
        }

        // Leading bright streak connecting to current bullet position
        const lastP = b.trail[b.trail.length - 1];
        const lastS = toScreen(lastP.x, lastP.y, lastP.z);
        ctx.strokeStyle = b.color || "#ffffff";
        ctx.shadowColor = b.color || "#fbbf24";
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lastS.x, lastS.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
