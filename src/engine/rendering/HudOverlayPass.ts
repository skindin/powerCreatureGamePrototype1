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
