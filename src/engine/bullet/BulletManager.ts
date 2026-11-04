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

export interface LingeringTrail {
  color: string;
  points: BulletTrailPoint[];
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
 * Incorporates projectile thickness (Minkowski sum: targetRadius + bulletRadius).
 * Correctly accounts for physical layer heights (ground layer vs elevated wall top layer).
 * Returns the earliest time of impact (t in [0, 1]), or null if no intersection.
 */
function sweptCircleHit(
  x0: number, y0: number, z0: number,
  dx: number, dy: number, dz: number,
  cx: number, cy: number, cz: number,
  targetRadius: number,
  bulletRadius: number = 0.14,
  targetHeight: number = 0.8,
  wallHeight: number = 1.0
): number | null {
  const R = targetRadius + bulletRadius;
  const fx = x0 - cx;
  const fy = y0 - cy;

  const a = dx * dx + dy * dy;
  if (a < 1e-9) {
    // Static point
    const dSq = fx * fx + fy * fy;
    if (dSq <= R * R) {
      const zMin = cz;
      const zMax = cz + targetHeight;
      if (z0 >= zMin - 0.25 && z0 <= zMax + 0.35) return 0;
    }
    return null;
  }

  // Check closest point on segment to circle center
  const c1 = -fx * dx - fy * dy;
  const tClosest = Math.max(0, Math.min(1, c1 / a));
  const closeX = x0 + tClosest * dx;
  const closeY = y0 + tClosest * dy;
  const distSq = (closeX - cx) ** 2 + (closeY - cy) ** 2;

  if (distSq > R * R) {
    return null; // Ray segment never comes within R of target
  }

  // Calculate earliest entry time
  let tEnter = 0;
  const cCoeff = fx * fx + fy * fy - R * R;
  if (cCoeff > 0) {
    // Start point is outside circle
    const bCoeff = 2 * (fx * dx + fy * dy);
    const disc = bCoeff * bCoeff - 4 * a * cCoeff;
    if (disc < 0) return null;
    tEnter = (-bCoeff - Math.sqrt(disc)) / (2 * a);
    if (tEnter < 0 || tEnter > 1) {
      tEnter = tClosest;
    }
  }

  // Check vertical overlap at tEnter
  const hitZ = z0 + tEnter * dz;
  const isTargetElevated = cz >= wallHeight - 0.05;
  const isBulletElevated = hitZ >= wallHeight - 0.05;

  // If one is on the high wall roof and the other is down on the ground, ensure they don't phantom-collide
  if (isTargetElevated !== isBulletElevated && Math.abs(hitZ - cz) > targetHeight + 0.3) {
    return null;
  }

  const zMin = Math.max(0, cz);
  const zMax = zMin + targetHeight;
  if (hitZ >= zMin - 0.25 && hitZ <= zMax + 0.35) {
    return Math.max(0, Math.min(1, tEnter));
  }

  return null;
}

/**
 * BulletManager
 * 
 * Manages active ballistic bullets, trajectory calculation, continuous overheat cooling,
 * bullet-to-character / bullet-to-object ray-swept collision, damage deduction,
 * shooter recoil kickback, target knockback momentum, and lingering vapor trails.
 */
function parseBulletRgb(colorStr: string): { r: number; g: number; b: number } {
  if (colorStr.startsWith("#")) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    const val = parseInt(hex, 16);
    if (!isNaN(val)) {
      return { r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255 };
    }
  } else if (colorStr.startsWith("rgb")) {
    const match = colorStr.match(/\d+/g);
    if (match && match.length >= 3) {
      return { r: parseInt(match[0], 10), g: parseInt(match[1], 10), b: parseInt(match[2], 10) };
    }
  }
  return { r: 251, g: 191, b: 36 };
}

export class BulletManager {
  private static instance: BulletManager | null = null;

  public static getInstance(): BulletManager {
    if (!BulletManager.instance) {
      BulletManager.instance = new BulletManager();
    }
    return BulletManager.instance;
  }

  public bullets: Bullet[] = [];
  public lingeringTrails: LingeringTrail[] = [];
  private nextBulletId: number = 1;

  public clear(): void {
    this.bullets = [];
    this.lingeringTrails = [];
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

    // Incorporate character's rigidbody velocity into bullet launch momentum
    const charVx = char.velocity ? char.velocity.x : 0;
    const charVy = char.velocity ? char.velocity.y : 0;
    const charVz = char.verticalVelocity || 0;

    const vx = dirX * speed + charVx;
    const vy = dirY * speed + charVy;
    // Ballistic arc loft: slight upward velocity so the projectile travels along a shallow arc
    const vz = Math.max(2.5, speed * 0.12) + charVz;

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
      bulletSpeed: Math.hypot(vx, vy) || speed,
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

    // Incorporate character's rigidbody velocity into preview trajectory
    const charVx = char.velocity ? char.velocity.x : 0;
    const charVy = char.velocity ? char.velocity.y : 0;
    const charVz = char.verticalVelocity || 0;

    const vx = dirX * speed + charVx;
    const vy = dirY * speed + charVy;
    const vz = Math.max(2.5, speed * 0.12) + charVz;

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

      // Continuous swept check against entities (characters & objects)
      const testEntities = arena.entities || [];
      let hitEntity = false;
      for (const ent of testEntities) {
        if (ent === char || ent.isHeld) continue;
        const entR = ent.colliderRadius > 0 ? ent.colliderRadius : (ent.isCharacter ? 0.44 : 0.26);
        const tEnt = sweptCircleHit(
          prevX, prevY, prevZ,
          stepDx, stepDy, stepDz,
          ent.position.x, ent.position.y, ent.position.z,
          entR,
          0.14,
          ent.isCharacter ? 1.0 : 0.7,
          arena.wallHeight
        );
        if (tEnt !== null) {
          const hitX = prevX + tEnt * stepDx;
          const hitY = prevY + tEnt * stepDy;
          const hitZ = prevZ + tEnt * stepDz;
          points.push({
            x: hitX,
            y: hitY,
            z: hitZ,
            t: t + tEnt * dt,
            couldClearWall: hitZ >= arena.wallHeight,
            isOverWall: false,
            collidesWall: false,
          });
          landPoint = { x: hitX, y: hitY, z: hitZ };
          hitEntity = true;
          break;
        }
      }
      if (hitEntity) break;

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

    // 2. Advance lingering trails from previous bullet impacts/deletions
    const remainingLingering: LingeringTrail[] = [];
    for (const lt of this.lingeringTrails) {
      let anyVisible = false;
      for (const p of lt.points) {
        p.alpha = Math.max(0, p.alpha - dt * 3.0);
        if (p.alpha > 0.02) {
          anyVisible = true;
        }
      }
      if (anyVisible && lt.points.length >= 2) {
        remainingLingering.push(lt);
      }
    }
    this.lingeringTrails = remainingLingering;

    // 3. Advance active bullets
    const g = arena.gravity || 30;
    const remainingBullets: Bullet[] = [];

    for (const b of this.bullets) {
      b.lifeTime += dt;
      if (b.lifeTime >= b.maxLifeTime) {
        // Bullet expired from lifetime: keep its trail lingering all the way to its final point
        this.lingeringTrails.push({
          color: b.color || "#f59e0b",
          points: [...b.trail, { x: b.x, y: b.y, z: b.z, alpha: 1.0 }],
        });
        continue;
      }

      // Record trail point at current position before integrating next step
      b.trail.push({ x: b.x, y: b.y, z: b.z, alpha: 1.0 });
      if (b.trail.length > 20) {
        b.trail.shift();
      }
      for (const p of b.trail) {
        p.alpha = Math.max(0, p.alpha - dt * 3.0);
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

        const charR = char.colliderRadius > 0 ? char.colliderRadius : 0.44;
        const tChar = sweptCircleHit(
          b.x, b.y, b.z,
          dx, dy, dz,
          char.position.x, char.position.y, char.position.z,
          charR,
          0.14,
          1.0,
          arena.wallHeight
        );

        if (tChar !== null && tChar < earliestHitToi) {
          earliestHitToi = tChar;
          hitType = "character";
          hitTarget = char;
        }
      }

      // 4. Continuous collision with dynamic freebody objects
      for (const obj of objects) {
        if (obj.isHeld) continue;
        if (characters.some((c) => c.heldObject === obj)) continue;

        const objR = obj.colliderRadius > 0 ? obj.colliderRadius : 0.26;
        const tObj = sweptCircleHit(
          b.x, b.y, b.z,
          dx, dy, dz,
          obj.position.x, obj.position.y, obj.position.z,
          objR,
          0.14,
          0.7,
          arena.wallHeight
        );

        if (tObj !== null && tObj < earliestHitToi) {
          earliestHitToi = tObj;
          hitType = "object";
          hitTarget = obj;
        }
      }

      // 5. Resolve earliest collision
      if (hitType !== null) {
        // Record final impact point on trail so the visual streak connects all the way to the deletion point
        const hitX = b.x + earliestHitToi * dx;
        const hitY = b.y + earliestHitToi * dy;
        const hitZ = Math.max(0, b.z + earliestHitToi * dz);
        
        // Preserve lingering trail connecting all the way to impact point so it lingers and smoothly fades
        const finalTrailPoints: BulletTrailPoint[] = [
          ...b.trail,
          { x: hitX, y: hitY, z: hitZ, alpha: 1.0 },
        ];
        this.lingeringTrails.push({
          color: b.color || "#f59e0b",
          points: finalTrailPoints,
        });

        if (hitType === "character" && hitTarget) {
          const char = hitTarget as Character;
          if (char.damageSolverModule && char.damageSolverModule.enabled && char.healthModule && char.healthModule.enabled) {
            char.damageSolverModule.handlePiercingDamage(b.damage, char, char.healthModule);
          } else if (char.healthModule && char.healthModule.enabled) {
            char.healthModule.takeDamage(b.damage, char.properties, {
              id: "piercing_damage",
              name: "Piercing",
              type: "instant",
              amount: b.damage,
              color: "#f59e0b",
              isHeal: false,
            });
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

          if (obj.hasRigidbody && obj.velocity) {
            obj.velocity.x += (dirX * knockbackImpulse) / objMass;
            obj.velocity.y += (dirY * knockbackImpulse) / objMass;
            obj.wakeUp();
          }

          if (obj.damageSolverModule && obj.damageSolverModule.enabled && obj.healthModule && obj.healthModule.enabled) {
            obj.damageSolverModule.handlePiercingDamage(b.damage, obj, obj.healthModule);
          } else if (obj.healthModule && obj.healthModule.enabled) {
            obj.healthModule.takeDamage(b.damage, obj.properties, {
              id: "piercing_damage",
              name: "Piercing",
              type: "instant",
              amount: b.damage,
              color: "#f59e0b",
              isHeal: false,
            });
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
   * Renders flying bullet streaks and fading vapor trails all the way to impact/deletion point.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    ppu: number,
    _arena: Arena,
    viewSettings: ViewSettings
  ): void {
    if (this.bullets.length === 0 && this.lingeringTrails.length === 0) return;

    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;

    const toScreen = (bx: number, by: number, bz: number) => ({
      x: bx * ppu,
      y: (by - bz * hoverScale) * ppu,
    });

    ctx.save();

    const drawStreak = (points: BulletTrailPoint[], colorStr: string) => {
      if (points.length < 2) return;
      const { r, g, b: colB } = parseBulletRgb(colorStr || "#fbbf24");
      ctx.shadowColor = `rgba(${r}, ${g}, ${colB}, 0.6)`;
      ctx.shadowBlur = 4;
      ctx.lineCap = "round";

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const s1 = toScreen(p1.x, p1.y, p1.z);
        const s2 = toScreen(p2.x, p2.y, p2.z);

        const trailAlpha = Math.max(0.01, Math.min(1.0, (p1.alpha + p2.alpha) * 0.5));
        ctx.strokeStyle = `rgba(${r}, ${g}, ${colB}, ${trailAlpha.toFixed(2)})`;
        ctx.lineWidth = Math.max(1.2, 2.5 * trailAlpha);

        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
      }
    };

    // 1. Draw lingering trails from collided/deleted bullets all the way to impact point
    for (const lt of this.lingeringTrails) {
      drawStreak(lt.points, lt.color);
    }

    // 2. Draw active flying bullet trails all the way to current bullet position
    for (const b of this.bullets) {
      const points = [...b.trail, { x: b.x, y: b.y, z: b.z, alpha: 1.0 }];
      drawStreak(points, b.color);
    }

    ctx.restore();
  }
}
