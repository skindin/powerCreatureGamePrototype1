import type { Arena } from "../Arena.js";
import type { GameObject } from "../GameObject.js";
import type { Character } from "../../character/Character.js";
import type { ViewSettings } from "../Renderer.js";

export class HudOverlayPass {
  /**
   * Draws the floating player name tag (P1, P2 … or "Press Space / A") for a character.
   */
  public static drawCharacterNameTag(
    ctx: CanvasRenderingContext2D,
    char: Character,
    arena: Arena,
    ppu: number,
    viewSettings: ViewSettings,
    getAltitudeScale: (z: number, wallHeight: number) => number,
    isRemote: boolean = false
  ): void {
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;
    const useBigger = viewSettings.verticalVisuals === "bigger" || viewSettings.verticalVisuals === "both";
    const altitudeScale = useBigger ? getAltitudeScale(char.position.z, arena.wallHeight) : 1.0;

    const vx = char.visualOffset ? char.visualOffset.x : 0;
    const vy = char.visualOffset ? char.visualOffset.y : 0;
    const x = (char.position.x - vx) * ppu;
    const y = (char.position.y - vy - char.position.z * hoverScale) * ppu;
    const r = char.colliderRadius * ppu * altitudeScale;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (char.playerId) {
      let chosenName: string;
      if (char.hasCustomName && char.name && char.name.trim().length > 0) {
        chosenName = char.name.trim();
      } else if (char.name && char.name.trim().length > 0 && !/^Player(\s+\d+)?$/i.test(char.name.trim()) && !/^Controller\s+#\d+$/i.test(char.name.trim())) {
        chosenName = char.name.trim();
      } else {
        chosenName = `Player ${char.playerNumber || 1}`;
      }
      const badgeText = isRemote ? `${chosenName} [REMOTE]` : chosenName;
      ctx.font = isRemote ? "bold 9px monospace" : "bold 11px monospace";
      const textWidth = ctx.measureText(badgeText).width;
      const pillW = textWidth + 10;
      const pillH = isRemote ? 14 : 16;
      const pillX = x - pillW / 2;
      const pillY = y - r - 16;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();

      const tagColor = char.playerColor || char.color;
      ctx.strokeStyle = tagColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = tagColor;
      ctx.fillText(badgeText, x, pillY + pillH / 2);
    } else {
      const badgeText = "Press Space / A";
      ctx.font = "bold 10px monospace";
      const textWidth = ctx.measureText(badgeText).width;
      const pillW = textWidth + 12;
      const pillH = 16;
      const pillX = x - pillW / 2;
      const pillY = y - r - 17;

      ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 8);
      ctx.fill();

      ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.fillText(badgeText, x, pillY + pillH / 2);
    }

    // Overhead Health Bar: Rendered above character/entity ONLY if wounded (currentHp < maxHp)
    HudOverlayPass.drawHealthBar(ctx, char, arena, ppu, hoverScale, altitudeScale, r, x, y);

    ctx.restore();
  }

  /**
   * Draws an overhead health bar for any entity with a HealthModule,
   * rendered only when currentHp < maxHp (avoiding HUD clutter at full health).
   */
  public static drawHealthBar(
    ctx: CanvasRenderingContext2D,
    entity: GameObject,
    _arena: Arena,
    _ppu: number,
    _hoverScale: number,
    _altitudeScale: number,
    r: number,
    x: number,
    y: number
  ): void {
    const hm = entity.healthModule;
    if (!hm || !hm.enabled) return;

    const currentHp = hm.getCurrentHp(entity.properties);
    const maxHp = hm.getMaxHp(entity.properties);

    // Only render health bar if wounded (strictly currentHp < maxHp)
    if (currentHp >= maxHp - 0.001) return;

    const hpRatio = Math.max(0, Math.min(1, currentHp / Math.max(0.001, maxHp)));

    // Health bar dimensions
    const barWidth = Math.max(34, r * 1.8);
    const barHeight = 5;
    const barX = x - barWidth / 2;
    // Position bar directly above head (or above name pill if character has one)
    const isChar = entity.isCharacter;
    const barY = isChar ? y - r - 24 : y - r - 10;

    ctx.save();

    // Dark background box
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2, 3);
    ctx.fill();
    ctx.stroke();

    // Red damage background behind fill
    ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 2);
    ctx.fill();

    // Health fill gradient (green > amber > red based on ratio)
    let fillGradientColor = "#22c55e"; // Healthy green
    if (hpRatio < 0.25) {
      fillGradientColor = "#ef4444"; // Critical red
    } else if (hpRatio < 0.55) {
      fillGradientColor = "#f59e0b"; // Warning amber
    }

    const fillW = Math.max(0, barWidth * hpRatio);
    if (fillW > 0) {
      ctx.fillStyle = fillGradientColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barHeight, 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draws a pulsing ground aura circle for any entity equipped with a DamageAuraModule.
   */
  public static drawDamageAura(
    ctx: CanvasRenderingContext2D,
    entity: GameObject,
    ppu: number
  ): void {
    const aura = entity.damageAuraModule;
    if (!aura || !aura.enabled) return;

    const radius = aura.getDamageRadius(entity.properties);
    if (radius <= 0) return;

    const px = entity.position.x * ppu;
    const py = entity.position.y * ppu;
    const rPixels = radius * ppu;

    ctx.save();
    // Translucent soft hazard zone on ground
    const gradient = ctx.createRadialGradient(px, py, rPixels * 0.2, px, py, rPixels);
    gradient.addColorStop(0, "rgba(239, 68, 68, 0.18)");
    gradient.addColorStop(0.7, "rgba(239, 68, 68, 0.10)");
    gradient.addColorStop(1, "rgba(239, 68, 68, 0.0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, rPixels, 0, Math.PI * 2);
    ctx.fill();

    // Dashed outer boundary ring
    ctx.strokeStyle = "rgba(239, 68, 68, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(px, py, rPixels, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws hover gizmo outline during Edit Mode.
   */
  public static drawHoverGizmo(
    ctx: CanvasRenderingContext2D,
    entity: GameObject,
    ppu: number,
    viewSettings: ViewSettings,
    getAltitudeScale: (z: number, wallHeight: number) => number
  ): void {
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const useBigger = viewSettings.verticalVisuals === "bigger" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;
    const px = entity.position.x * ppu;
    const py = (entity.position.y - entity.position.z * hoverScale) * ppu;
    const visualRadius = entity.hasCollider ? entity.colliderRadius : (entity.colliderModule?.radius ?? 0.32);
    const scale = useBigger ? getAltitudeScale(entity.position.z, 1.0) : 1.0;
    const pad = (visualRadius * scale + 0.08) * ppu;

    ctx.save();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.6)"; // Soft amber
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.arc(px, py, pad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws selection gizmo brackets and entity tag during Edit Mode.
   */
  public static drawSelectionGizmo(
    ctx: CanvasRenderingContext2D,
    entity: GameObject,
    isEditMode: boolean,
    ppu: number,
    viewSettings: ViewSettings,
    getAltitudeScale: (z: number, wallHeight: number) => number
  ): void {
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const useBigger = viewSettings.verticalVisuals === "bigger" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;
    const px = entity.position.x * ppu;
    const py = (entity.position.y - entity.position.z * hoverScale) * ppu;
    const visualRadius = entity.hasCollider ? entity.colliderRadius : (entity.colliderModule?.radius ?? 0.32);
    const scale = useBigger ? getAltitudeScale(entity.position.z, 1.0) : 1.0;
    const r = visualRadius * ppu * scale;
    const pad = r + 6;
    const bracketLen = Math.max(6, pad * 0.4);

    const color = isEditMode ? "#fbbf24" : "#38bdf8";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Corner brackets around entity
    ctx.beginPath();
    ctx.moveTo(px - pad, py - pad + bracketLen);
    ctx.lineTo(px - pad, py - pad);
    ctx.lineTo(px - pad + bracketLen, py - pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px + pad - bracketLen, py - pad);
    ctx.lineTo(px + pad, py - pad);
    ctx.lineTo(px + pad, py - pad + bracketLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px + pad, py + pad - bracketLen);
    ctx.lineTo(px + pad, py + pad);
    ctx.lineTo(px + pad - bracketLen, py + pad);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px - pad + bracketLen, py + pad);
    ctx.lineTo(px - pad, py + pad);
    ctx.lineTo(px - pad, py + pad - bracketLen);
    ctx.stroke();

    if (isEditMode) {
      const text = `${entity.name} (${entity.mass.toFixed(1)}kg)`;
      ctx.font = "bold 10px 'Segoe UI', system-ui, sans-serif";
      const tm = ctx.measureText(text);
      const bgW = tm.width + 12;
      const bgH = 16;
      const bgX = px - bgW / 2;
      const bgY = py - pad - bgH - 4;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgW, bgH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, px, bgY + bgH / 2);
    }

    ctx.restore();
  }
}
