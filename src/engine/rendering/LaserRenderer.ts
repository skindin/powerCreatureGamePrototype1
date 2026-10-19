import type { Arena } from "../Arena.js";
import type { Character } from "../../character/Character.js";
import type { ViewSettings } from "../Renderer.js";

/**
 * LaserRenderer
 * 
 * High-performance, rich visual renderer for the LaserBlastModule:
 * - Crisp instant targeting guide line with elevation-adapted endpoint and vertical altitude drop.
 * - Multi-layer animated energy blast beam with bloom, high-energy sheath, white-hot core, and wall impact sparks.
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

    ctx.save();

    if (laser.isFiring) {
      // ==========================================
      // ACTIVE FIRING BEAM
      // ==========================================
      const thickness = Math.max(0.08, laser.getThickness(character.properties));
      const beamPx = Math.max(3, thickness * ppu);
      const intensity = Math.min(1.0, Math.max(0.3, laser.actualDamageRate / Math.max(1, laser.getMaxDamageRate(character.properties))));

      // 1. Vertical footprint connector if endpoint is elevated on a wall
      if (isElevated && useHover) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(endX, groundEndY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Ground contact ring
        ctx.beginPath();
        ctx.ellipse(endX, groundEndY, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.5)";
        ctx.stroke();
        ctx.restore();
      }

      // 2. Wide Outer Bloom
      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 16 * intensity;
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 * intensity})`;
      ctx.lineWidth = beamPx * 1.9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 3. Mid Sheath (Vibrant Cyan)
      ctx.save();
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 8 * intensity;
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.85 * intensity})`;
      ctx.lineWidth = beamPx * 1.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 4. White-Hot Energy Core
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.5, beamPx * 0.38);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 5. Animated Plasma Waves / Particles
      const beamLen = Math.hypot(endX - startX, endY - startY);
      const angle = Math.atan2(endY - startY, endX - startX);
      if (beamLen > 10) {
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        const waveCount = Math.floor(beamLen / 25);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
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

      // 6. Muzzle Origin Flare
      const muzzleRadius = Math.max(6, beamPx * 1.4);
      const muzzleGrad = ctx.createRadialGradient(startX, startY, 0, startX, startY, muzzleRadius);
      muzzleGrad.addColorStop(0, "#ffffff");
      muzzleGrad.addColorStop(0.4, "#22d3ee");
      muzzleGrad.addColorStop(1, "rgba(6, 182, 212, 0)");
      ctx.fillStyle = muzzleGrad;
      ctx.beginPath();
      ctx.arc(startX, startY, muzzleRadius, 0, Math.PI * 2);
      ctx.fill();

      // 7. Impact Effect at Endpoint
      const impactRadius = Math.max(8, beamPx * 1.6);
      const impactGrad = ctx.createRadialGradient(endX, endY, 0, endX, endY, impactRadius);
      impactGrad.addColorStop(0, "#ffffff");
      impactGrad.addColorStop(0.3, "#06b6d4");
      impactGrad.addColorStop(0.7, "#3b82f6");
      impactGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
      ctx.fillStyle = impactGrad;
      ctx.beginPath();
      ctx.arc(endX, endY, impactRadius, 0, Math.PI * 2);
      ctx.fill();

      // Expanding energy pulse ring at endpoint
      const pulsePhase = (now % 400) / 400;
      const pulseR = impactRadius * (0.8 + pulsePhase * 1.2);
      ctx.strokeStyle = `rgba(34, 211, 238, ${Math.max(0, 1 - pulsePhase)})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(endX, endY, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // 8. Hit Indicators on Pierced Entities
      if (laser.hitEntities && laser.hitEntities.length > 0) {
        for (const ent of laser.hitEntities) {
          const entScreenX = ent.position.x * ppu;
          const entScreenY = (ent.position.y - ent.position.z * scale) * ppu;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(entScreenX, entScreenY, 6 + Math.sin(now * 0.03) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

    } else {
      // ==========================================
      // INSTANT TARGETING GUIDE LINE (AIMING MODE)
      // ==========================================
      // 1. Vertical connector line for elevated endpoint
      if (isElevated && useHover) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(endX, groundEndY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Ground footprint ring
        ctx.beginPath();
        ctx.ellipse(endX, groundEndY, 6, 3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
        ctx.stroke();
        ctx.restore();
      }

      // 2. Soft Outer Aim Glow
      ctx.save();
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 3. Sharp Crisp Aim Guide Line
      ctx.save();
      ctx.strokeStyle = "rgba(165, 243, 252, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();

      // 4. Muzzle Dot
      ctx.beginPath();
      ctx.arc(startX, startY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#06b6d4";
      ctx.fill();

      // 5. Endpoint Aim Reticle
      ctx.save();
      // Outer reticle ring
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(endX, endY, 6.5, 0, Math.PI * 2);
      ctx.stroke();

      // Center pinpoint
      ctx.beginPath();
      ctx.arc(endX, endY, 2.0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // If blocked by wall: draw small cross-bar stop marker
      if (laser.hitWall) {
        const wallAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
        const barLen = 7;
        ctx.strokeStyle = "#f43f5e";
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
