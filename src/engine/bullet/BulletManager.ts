import type { Arena } from "../Arena.js";
import type { GameObject } from "../GameObject.js";
import type { Character } from "../../character/Character.js";
import type { GunModule } from "../GunModule.js";
import type { TrajectoryCalculation, TrajectoryPoint } from "../../character/ThrowModule.js";
import type { ViewSettings } from "../Renderer.js";

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
      const t = i * dt;
      curX += vx * dt;
      curY += vy * dt;
      curVz -= g * dt;
      curZ += curVz * dt;

      const wall = arena.getWallAt(curX, curY);

      if (wall && curZ < wall.wallHeight) {
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
      const nextX = b.x + b.vx * dt;
      const nextY = b.y + b.vy * dt;
      const nextZ = b.z + b.vz * dt;

      // Ground plane collision (z <= 0)
      if (nextZ <= 0) {
        // Disappear upon hitting the ground
        continue;
      }

      // Wall collision
      const wall = arena.getWallAt(nextX, nextY);
      if (wall && nextZ < wall.wallHeight) {
        // Disappear upon hitting a physical wall
        continue;
      }

      // Character hit detection
      let hitEntity = false;
      for (const char of characters) {
        if (char.id === b.shooterId) continue;
        if (char.isHeld) continue;

        const charR = char.colliderRadius > 0 ? char.colliderRadius : 0.35;
        const charZ = char.position.z;
        // Check 3D altitude proximity
        if (Math.abs(nextZ - charZ) > 0.9) continue;

        // Check horizontal line-circle distance
        const dist = Math.hypot(nextX - char.position.x, nextY - char.position.y);
        if (dist <= charR) {
          // Hit character! Apply damage
          if (char.healthModule && char.healthModule.enabled) {
            char.healthModule.takeDamage(b.damage);
          }

          // Apply target knockback momentum: I = m_bullet * v
          const knockbackImpulse = b.bulletMass * b.bulletSpeed;
          const targetMass = char.mass > 0 ? char.mass : 1.2;
          const dirX = b.vx / b.bulletSpeed;
          const dirY = b.vy / b.bulletSpeed;

          char.velocity.x += (dirX * knockbackImpulse) / targetMass;
          char.velocity.y += (dirY * knockbackImpulse) / targetMass;
          char.applyKnockbackWindow(350);

          hitEntity = true;
          break;
        }
      }

      if (hitEntity) continue;

      // Freebody object hit detection
      for (const obj of objects) {
        if (obj.isHeld || !obj.hasRigidbody) continue;
        const holder = characters.find((c) => c.heldObject === obj);
        if (holder) continue;

        const objR = obj.colliderRadius > 0 ? obj.colliderRadius : 0.28;
        const objZ = obj.position.z;
        if (Math.abs(nextZ - objZ) > 0.8) continue;

        const dist = Math.hypot(nextX - obj.position.x, nextY - obj.position.y);
        if (dist <= objR) {
          // Hit dynamic object!
          const knockbackImpulse = b.bulletMass * b.bulletSpeed;
          const objMass = obj.mass > 0 ? obj.mass : 1.0;
          const dirX = b.vx / b.bulletSpeed;
          const dirY = b.vy / b.bulletSpeed;

          obj.velocity.x += (dirX * knockbackImpulse) / objMass;
          obj.velocity.y += (dirY * knockbackImpulse) / objMass;
          obj.wakeUp();

          if (obj.healthModule && obj.healthModule.enabled) {
            obj.healthModule.takeDamage(b.damage);
          }

          hitEntity = true;
          break;
        }
      }

      if (hitEntity) continue;

      // Bullet continues flight
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
