import type { Arena } from "../Arena.js";
import type { Character } from "../../character/Character.js";
import type { ViewSettings } from "../Renderer.js";

/**
 * LaserRenderer
 * 
 * High-performance visual renderer for the LaserBlastModule:
 * - Crisp targeting guide line adapting to ground/wall elevation with transparency scaled by power.
 * - Multi-layer animated energy blast beam with dynamic transparency tied directly to current power.
 * - Clean beam termination without distracting endpoint/muzzle orbs.
 */
export class LaserRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Main render entry point for a character's laser blast state.
   */
  public drawLaser(
    character: Character,
    ppu: number,
    arena: Arena,
    viewSettings: ViewSettings
  ): void {
    const laser = character.laserModule;
    if (!laser || !laser.enabled) return;
    if (!laser.isAiming && !laser.isFiring) return;
    if (!laser.currentEndpoint || !laser.startPoint) return;

    const ctx = this.ctx;
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const scale = useHover ? (arena.visualAltitudeScale ?? 0.5) : 0;
    const now = performance.now();

    // Start position in screen space (character weapon/chest origin)
    const startX = laser.startPoint.x * ppu;
    const startY = (laser.startPoint.y - laser.startPoint.z * scale) * ppu;

    // End position in screen space (adapting to target elevation)
    const endX = laser.currentEndpoint.x * ppu;
    const endY = (laser.currentEndpoint.y - laser.currentEndpoint.z * scale) * ppu;

    // Ground footprint position for altitude connector
    const groundEndY = laser.currentEndpoint.y * ppu;
    const isElevated = laser.currentEndpoint.z > 0.08;

    const maxDamage = Math.max(1, laser.getMaxDamageRate(character.properties));

    ctx.save();

    if (laser.isFiring) {
      // ==========================================
      // ACTIVE FIRING BEAM
      // ==========================================
      const thickness = Math.max(0.08, laser.getThickness(character.properties));
      const beamPx = Math.max(3, thickness * ppu);

      // Power transparency ratio: scales alpha directly from faint (low power) to solid/vibrant (max power)
      const currentDmg = laser.actualDamageRate > 0 ? laser.actualDamageRate : laser.getDamageRate(character.properties);
      const powerAlpha = Math.max(0.06, Math.min(1.0, currentDmg / maxDamage));

      // 1. Vertical footprint connector if endpoint is elevated on a wall
      if (isElevated && useHover) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.45 * powerAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(endX, groundEndY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Ground contact ring
        ctx.beginPath();
        ctx.ellipse(endX, groundEndY, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.55 * powerAlpha})`;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Wide Outer Bloom (Scales with powerAlpha)
      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 18 * powerAlpha;
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.45 * powerAlpha})`;
      ctx.lineWidth = beamPx * 1.85;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 3. Mid Sheath (Vibrant Cyan, scales with powerAlpha)
      ctx.save();
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 10 * powerAlpha;
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.9 * powerAlpha})`;
      ctx.lineWidth = beamPx * 1.05;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 4. White-Hot Energy Core (Scales with powerAlpha)
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * powerAlpha})`;
      ctx.lineWidth = Math.max(1.5, beamPx * 0.36);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 5. Animated Plasma Waves along the beam
      const beamLen = Math.hypot(endX - startX, endY - startY);
      const angle = Math.atan2(endY - startY, endX - startX);
      if (beamLen > 10) {
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        const waveCount = Math.floor(beamLen / 25);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * powerAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i <= waveCount; i++) {
          const t = (i / Math.max(1, waveCount)) * beamLen;
          const phase = (now * 0.02) + (i * 0.8);
          const waveOffset = Math.sin(phase) * (beamPx * 0.35);
          if (i === 0) ctx.moveTo(t, waveOffset);
          else ctx.lineTo(t, waveOffset);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 6. Wall Impact Line (Clean perpendicular spark line if stopped by wall, no circular orb)
      if (laser.hitWall) {
        ctx.save();
        const wallAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
        const splashLen = Math.max(6, beamPx * 1.2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * powerAlpha})`;
        ctx.lineWidth = Math.max(2, beamPx * 0.4);
        ctx.beginPath();
        ctx.moveTo(endX - Math.cos(wallAngle) * splashLen, endY - Math.sin(wallAngle) * splashLen);
        ctx.lineTo(endX + Math.cos(wallAngle) * splashLen, endY + Math.sin(wallAngle) * splashLen);
        ctx.stroke();

        ctx.strokeStyle = `rgba(34, 211, 238, ${0.7 * powerAlpha})`;
        ctx.lineWidth = Math.max(3, beamPx * 0.7);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Hit Indicators on Pierced Entities (Clean rings without orbs)
      if (laser.hitEntities && laser.hitEntities.length > 0) {
        for (const ent of laser.hitEntities) {
          const entScreenX = ent.position.x * ppu;
          const entScreenY = (ent.position.y - ent.position.z * scale) * ppu;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * powerAlpha})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(entScreenX, entScreenY, 6 + Math.sin(now * 0.03) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

    } else {
      // ==========================================
      // INSTANT TARGETING GUIDE LINE (AIMING MODE)
      // ==========================================
      // Transparency scales dynamically with current tuned damage rate
      const aimAlpha = Math.max(0.12, Math.min(1.0, laser.getDamageRate(character.properties) / maxDamage));

      // 1. Vertical connector line for elevated endpoint
      if (isElevated && useHover) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.55 * aimAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(endX, groundEndY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Ground footprint ring
        ctx.beginPath();
        ctx.ellipse(endX, groundEndY, 6, 3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.7 * aimAlpha})`;
        ctx.stroke();
        ctx.restore();
      }

      // 2. Soft Outer Aim Glow (Scales with aimAlpha)
      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 6 * aimAlpha;
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.45 * aimAlpha})`;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 3. Sharp Crisp Aim Guide Line (Scales with aimAlpha)
      ctx.save();
      ctx.strokeStyle = `rgba(165, 243, 252, ${0.9 * aimAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 4. Endpoint Aim Reticle (Scales with aimAlpha, no muzzle dot)
      ctx.save();
      // Outer reticle ring
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.85 * aimAlpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(endX, endY, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      // Center pinpoint
      ctx.beginPath();
      ctx.arc(endX, endY, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * aimAlpha})`;
      ctx.fill();

      // If blocked by wall: draw small cross-bar stop marker
      if (laser.hitWall) {
        const wallAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
        const barLen = 7;
        ctx.strokeStyle = `rgba(244, 63, 94, ${0.9 * aimAlpha})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(endX - Math.cos(wallAngle) * barLen, endY - Math.sin(wallAngle) * barLen);
        ctx.lineTo(endX + Math.cos(wallAngle) * barLen, endY + Math.sin(wallAngle) * barLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}
