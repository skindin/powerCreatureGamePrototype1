import type { Arena } from "../Arena.js";
import type { GameObject } from "../GameObject.js";
import type { ViewSettings } from "../Renderer.js";

export class WallRoofPass {
  /**
   * Draws the arena floor background and 1-unit grid tiles.
   */
  public static drawFloorGrid(ctx: CanvasRenderingContext2D, arena: Arena, ppu: number): void {
    ctx.fillStyle = "#0f172a"; // Deep solid floor
    ctx.fillRect(0, 0, arena.width * ppu, arena.height * ppu);

    // Subtle 1-unit grid lines (1 unit = 1 wall block)
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 1; x < arena.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ppu, 0);
      ctx.lineTo(x * ppu, arena.height * ppu);
      ctx.stroke();
    }
    for (let y = 1; y < arena.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ppu);
      ctx.lineTo(arena.width * ppu, y * ppu);
      ctx.stroke();
    }

    // Arena border
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, arena.width * ppu - 3, arena.height * ppu - 3);
  }

  /**
   * Wall Bases: In Hover / Both mode with visualAltitudeScale > 0:
   * Bottom square (front face) is rendered in an intermediate shade at ground level.
   */
  public static drawWallBases(
    ctx: CanvasRenderingContext2D,
    arena: Arena,
    ppu: number,
    viewSettings: ViewSettings
  ): void {
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;
    if (hoverScale <= 0) return; // In flat mode, walls are drawn in drawWallTops

    const sortedWalls = [...arena.walls].sort((a, b) => a.y - b.y);

    for (const wall of sortedWalls) {
      const wallW = wall.width * ppu;
      const wallH = wall.height * ppu;
      const baseX = wall.x * ppu;
      const baseY = wall.y * ppu;

      ctx.save();
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(baseX, baseY, wallW, wallH);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(baseX, baseY, wallW, wallH);
      ctx.restore();
    }
  }

  /**
   * Top of Wall Squares: Renders OVER ground entities.
   * Features dynamic transparency when any entity is occluded beneath the roof.
   */
  public static drawWallTops(
    ctx: CanvasRenderingContext2D,
    arena: Arena,
    ppu: number,
    entities: GameObject[],
    viewSettings: ViewSettings,
    getEffectiveObjectPosition: (obj: GameObject) => { x: number; y: number; z: number }
  ): void {
    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;

    if (hoverScale <= 0) {
      for (const wall of arena.walls) {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(wall.x * ppu, wall.y * ppu, wall.width * ppu, wall.height * ppu);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x * ppu, wall.y * ppu, wall.width * ppu, wall.height * ppu);
      }
      return;
    }

    const sortedWalls = [...arena.walls].sort((a, b) => a.y - b.y);

    for (const wall of sortedWalls) {
      const wallW = wall.width * ppu;
      const wallH = wall.height * ppu;
      const baseX = wall.x * ppu;
      const topY = (wall.y - arena.wallHeight * hoverScale) * ppu;
      const topSquareY = wall.y - arena.wallHeight * hoverScale;

      let isAnyCovered = false;
      for (const obj of entities) {
        const objR = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.35);
        const eff = getEffectiveObjectPosition(obj);
        const objX = eff.x;
        const objY = eff.y;
        const isObjOnGround = eff.z < arena.wallHeight - 0.05;
        if (!isObjOnGround) continue;

        const overlapX = (objX + objR > wall.x) && (objX - objR < wall.x + wall.width);
        if (!overlapX) continue;

        const isCompletelyAboveWallCollider = (objY + objR <= wall.y + 0.05);
        if (!isCompletelyAboveWallCollider) continue;

        const overlapsTopSquare = (objY + objR >= topSquareY - 0.05);
        if (overlapsTopSquare) {
          isAnyCovered = true;
          break;
        }
      }

      ctx.save();
      if (isAnyCovered) {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 1.0;
      }

      ctx.fillStyle = "#334155";
      ctx.fillRect(baseX, topY, wallW, wallH);
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.8;
      ctx.strokeRect(baseX, topY, wallW, wallH);
      ctx.restore();
    }
  }

  /**
   * Wall Editor Grid Cell Hover Indicator.
   */
  public static drawWallEditorHover(
    ctx: CanvasRenderingContext2D,
    arena: Arena,
    tile: { col: number; row: number },
    ppu: number
  ): void {
    if (tile.col < 0 || tile.col >= arena.cols || tile.row < 0 || tile.row >= arena.rows) return;
    const x = tile.col * arena.tileSize * ppu;
    const y = tile.row * arena.tileSize * ppu;
    const size = arena.tileSize * ppu;
    const hasWall = arena.hasWall(tile.col, tile.row);

    ctx.save();
    if (hasWall) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);

      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#fca5a5";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✕ Erase", x + size / 2, y + size / 2);
    } else {
      ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);

      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#7dd3fc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+ Draw", x + size / 2, y + size / 2);
    }
    ctx.restore();
  }
}
