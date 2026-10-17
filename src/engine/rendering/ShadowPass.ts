import type { Arena } from "../Arena.js";
import type { GameObject } from "../GameObject.js";
import type { ViewSettings } from "../Renderer.js";

export class ShadowPass {
  /**
   * Helper to check whether an entity's 2D collider overlaps any wall in the arena.
   */
  public static isEntityOverWall(
    obj: GameObject,
    arena: Arena,
    effectivePos: { x: number; y: number; z: number }
  ): boolean {
    const radius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    for (const wall of arena.walls) {
      const closestX = Math.max(wall.x, Math.min(effectivePos.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(effectivePos.y, wall.y + wall.height));
      const dx = effectivePos.x - closestX;
      const dy = effectivePos.y - closestY;
      if (dx * dx + dy * dy < radius * radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Draws the shadow fill for the ground floor (rendered below all wall squares).
   */
  public static drawObjectGroundShadowFill(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    _arena: Arena,
    ppu: number,
    effectivePos: { x: number; y: number; z: number },
    viewSettings: ViewSettings
  ): void {
    const z = effectivePos.z;
    if (z <= 0.01) return;

    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;
    if (!useHover || hoverScale <= 0) return;

    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;
    const groundX = (effectivePos.x - vx) * ppu;
    const groundY = (effectivePos.y - vy) * ppu;
    const shadowRadius = obj.colliderRadius * ppu;

    ctx.save();
    ctx.beginPath();
    if (obj.visualShape === "box") {
      const sz = shadowRadius * 2;
      const cr = Math.max(3, shadowRadius * 0.16);
      if (ctx.roundRect) ctx.roundRect(groundX - shadowRadius, groundY - shadowRadius, sz, sz, cr);
      else ctx.rect(groundX - shadowRadius, groundY - shadowRadius, sz, sz);
    } else {
      ctx.arc(groundX, groundY, shadowRadius, 0, Math.PI * 2);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draws the shadow fill on top of the wall surface for entities hovering above a wall (rendered below elevated entities).
   */
  public static drawObjectWallTopShadowFill(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    arena: Arena,
    ppu: number,
    effectivePos: { x: number; y: number; z: number },
    viewSettings: ViewSettings
  ): void {
    const z = effectivePos.z;
    if (z <= 0.01) return;

    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;
    if (!useHover || hoverScale <= 0) return;

    const isAboveWall = z >= arena.wallHeight - 0.05 && this.isEntityOverWall(obj, arena, effectivePos);
    if (!isAboveWall) return;

    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;
    const groundX = (effectivePos.x - vx) * ppu;
    const wallTopScreenY = (effectivePos.y - vy - arena.wallHeight * hoverScale) * ppu;
    const shadowRadius = obj.colliderRadius * ppu;

    const constructShadowPath = () => {
      ctx.beginPath();
      if (obj.visualShape === "box") {
        const sz = shadowRadius * 2;
        const cr = Math.max(3, shadowRadius * 0.16);
        if (ctx.roundRect) ctx.roundRect(groundX - shadowRadius, wallTopScreenY - shadowRadius, sz, sz, cr);
        else ctx.rect(groundX - shadowRadius, wallTopScreenY - shadowRadius, sz, sz);
      } else {
        ctx.arc(groundX, wallTopScreenY, shadowRadius, 0, Math.PI * 2);
      }
    };

    // Wall top shadow fill (masked to the top of wall squares)
    ctx.save();
    ctx.beginPath();
    for (const wall of arena.walls) {
      const baseX = wall.x * ppu;
      const topY = (wall.y - arena.wallHeight * hoverScale) * ppu;
      const wallW = wall.width * ppu;
      const wallH = wall.height * ppu;
      ctx.rect(baseX, topY, wallW, wallH);
    }
    ctx.clip();

    constructShadowPath();
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draws the outline of the actual collider position on top of everything.
   */
  public static drawObjectColliderPositionOutline(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    arena: Arena,
    ppu: number,
    effectivePos: { x: number; y: number; z: number },
    viewSettings: ViewSettings,
    getAltitudeScale: (z: number, wallHeight: number) => number
  ): void {
    const { x: posX, y: posY, z: posZ } = effectivePos;
    const z = posZ;
    if (z <= 0.01) return;

    if (obj.standingWall !== null && z <= arena.wallHeight + 0.02) return;

    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const useBigger = viewSettings.verticalVisuals === "bigger" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;

    const isAboveWall = useHover && hoverScale > 0 && z >= arena.wallHeight - 0.05 && this.isEntityOverWall(obj, arena, effectivePos);

    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;
    const groundX = (posX - vx) * ppu;
    const outlineY = isAboveWall
      ? (posY - vy - arena.wallHeight * hoverScale) * ppu
      : (posY - vy) * ppu;
    const shadowRadius = obj.colliderRadius * ppu;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 3;
    ctx.beginPath();
    if (obj.visualShape === "box") {
      const sz = shadowRadius * 2;
      const cr = Math.max(3, shadowRadius * 0.16);
      if (ctx.roundRect) ctx.roundRect(groundX - shadowRadius, outlineY - shadowRadius, sz, sz, cr);
      else ctx.rect(groundX - shadowRadius, outlineY - shadowRadius, sz, sz);
    } else {
      ctx.arc(groundX, outlineY, shadowRadius, 0, Math.PI * 2);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    if (!isAboveWall && useBigger && z > arena.wallHeight + 0.01) {
      const wallAltScale = getAltitudeScale(arena.wallHeight, arena.wallHeight);
      const wallRadius = obj.colliderRadius * ppu * wallAltScale;

      ctx.beginPath();
      if (obj.visualShape === "box") {
        const sz = wallRadius * 2;
        const cr = Math.max(3, wallRadius * 0.16);
        if (ctx.roundRect) ctx.roundRect(groundX - wallRadius, outlineY - wallRadius, sz, sz, cr);
        else ctx.rect(groundX - wallRadius, outlineY - wallRadius, sz, sz);
      } else {
        ctx.arc(groundX, outlineY, wallRadius, 0, Math.PI * 2);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws a vertical dotted line from the center of the airborne/elevated object down to its supporting surface.
   */
  public static drawVerticalConnectorLine(
    ctx: CanvasRenderingContext2D,
    obj: GameObject,
    arena: Arena,
    ppu: number,
    effectivePos: { x: number; y: number; z: number },
    viewSettings: ViewSettings
  ): void {
    const z = Math.max(
      effectivePos.z,
      obj.supportingSurfaceHeight ?? 0,
      (obj.standingWall ? arena.wallHeight : 0)
    );
    if (z <= 0.001) return;

    const useHover = viewSettings.verticalVisuals === "hover" || viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? viewSettings.visualAltitudeScale : 0;
    if (hoverScale <= 0) return;

    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;
    const groundX = (effectivePos.x - vx) * ppu;
    const groundY = (effectivePos.y - vy) * ppu;
    const renderY = (effectivePos.y - vy - z * hoverScale) * ppu;
    const wallH = arena.wallHeight;
    const layer2BaseY = (effectivePos.y - vy - wallH * hoverScale) * ppu;
    const layer2CeilingY = (effectivePos.y - vy - 2 * wallH * hoverScale) * ppu;

    const radius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    const wallBeneath = (obj.standingWall && arena.walls.some(w => w.id === obj.standingWall!.id))
      ? obj.standingWall
      : arena.getSupportingWall(effectivePos.x, effectivePos.y, radius);
    const isClimbing = Boolean(obj.isCharacter && (obj as any).isClimbing);
    const isOnOrAboveWall = wallBeneath !== null && z >= wallH - 0.05 && !isClimbing;
    const lineBottomY = isOnOrAboveWall ? layer2BaseY : groundY;

    if (Math.abs(lineBottomY - renderY) < 0.5) return;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 3;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 4]);

    if (z <= wallH) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath();
      ctx.moveTo(groundX, lineBottomY);
      ctx.lineTo(groundX, renderY);
      ctx.stroke();
    } else if (z < 2 * wallH) {
      if (!isOnOrAboveWall) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.moveTo(groundX, groundY);
        ctx.lineTo(groundX, layer2BaseY);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.beginPath();
      ctx.moveTo(groundX, layer2BaseY);
      ctx.lineTo(groundX, renderY);
      ctx.stroke();

      if (!isOnOrAboveWall) {
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.90)";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(groundX - 6, layer2BaseY);
        ctx.lineTo(groundX + 6, layer2BaseY);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.arc(groundX, layer2BaseY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      if (!isOnOrAboveWall) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.moveTo(groundX, groundY);
        ctx.lineTo(groundX, layer2BaseY);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.beginPath();
      ctx.moveTo(groundX, layer2BaseY);
      ctx.lineTo(groundX, layer2CeilingY);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.50)";
      ctx.beginPath();
      ctx.moveTo(groundX, layer2CeilingY);
      ctx.lineTo(groundX, renderY);
      ctx.stroke();

      if (!isOnOrAboveWall) {
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.90)";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(groundX - 6, layer2BaseY);
        ctx.lineTo(groundX + 6, layer2BaseY);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.arc(groundX, layer2BaseY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(groundX - 8, layer2CeilingY);
      ctx.lineTo(groundX + 8, layer2CeilingY);
      ctx.stroke();
      ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
      ctx.beginPath();
      ctx.arc(groundX, layer2CeilingY, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
