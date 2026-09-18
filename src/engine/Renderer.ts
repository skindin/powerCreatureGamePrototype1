import { Arena } from "./Arena.js";
import { GameObject, Vector2D } from "./GameObject.js";
import { Character } from "../character/Character.js";
import { TrajectoryCalculation } from "../character/ThrowModule.js";
import { GhostSnapshot } from "../network/RelayClient.js";

export type VerticalVisualMode = "bigger" | "hover" | "both";

export interface ViewSettings {
  verticalVisuals: VerticalVisualMode;
  visualAltitudeScale: number;
}

export interface ActiveAimCursor {
  x: number;
  y: number;
  color: string;
  playerNumber: number;
  character: Character;
  isGamepad: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  public viewSettings: ViewSettings = {
    verticalVisuals: "bigger",
    visualAltitudeScale: 0.5,
  };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setVerticalVisualMode(mode: VerticalVisualMode): void {
    this.viewSettings.verticalVisuals = mode;
  }

  public setVisualAltitudeScale(scale: number): void {
    this.viewSettings.visualAltitudeScale = Math.max(0, Math.min(1, scale));
  }

  public getHoverScale(): number {
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    return useHover ? this.viewSettings.visualAltitudeScale : 0;
  }

  public getVisualPosition(entity: GameObject): { x: number; y: number } {
    const hoverScale = this.getHoverScale();
    return {
      x: entity.position.x,
      y: entity.position.y - entity.position.z * hoverScale,
    };
  }

  public render(
    arena: Arena,
    characterInput: Character | Character[],
    objects: GameObject[],
    selectedEntity?: GameObject | null,
    isEditMode = false,
    hoverEntity?: GameObject | null,
    targetGrabEntities?: GameObject | null | Map<Character, GameObject | null> | Set<GameObject>,
    isWallEditor = false,
    hoverWallTile?: { col: number; row: number } | null,
    ghostSnapshot?: GhostSnapshot | null,
    activeAimCursorsOrIsGamepad: boolean | ActiveAimCursor[] = false,
    legacyGamepadAimPos?: Vector2D | null,
    isPaused = false
  ): void {
    const ctx = this.ctx;
    const ppu = ctx.canvas.width / arena.width; // Pixels per unit (e.g. 1000 / 20 = 50 px/u)

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const characters: Character[] = Array.isArray(characterInput)
      ? characterInput
      : (characterInput ? [characterInput] : []);
    const character = characters[0] || null;

    // 1. Floor Grid / Surface in Units
    this.drawFloorGrid(arena, ppu);

    // 2. Entities sorting
    const allRenderables = [...characters, ...objects];
    allRenderables.sort((a, b) => {
      // Objects held by a character render ON TOP of that character at all times!
      if (a.isHeld && a.heldBy === b) return 1;
      if (b.isHeld && b.heldBy === a) return -1;
      for (const char of characters) {
        if (char.heldObject === a && b === char) return 1;
        if (char.heldObject === b && a === char) return -1;
      }

      // Primary: Objects at higher virtual position (height z) ALWAYS render on top
      if (Math.abs(a.position.z - b.position.z) > 0.001) {
        return a.position.z - b.position.z;
      }
      // Secondary: Objects with higher virtual y velocity render on top if at same elevation
      if (Math.abs(a.verticalVelocity - b.verticalVelocity) > 0.001) {
        return a.verticalVelocity - b.verticalVelocity;
      }
      // Tertiary: Higher y (closer to foreground) renders on top
      return a.position.y - b.position.y;
    });

    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";

    // 2. Ground Shadows (Rendered BELOW all wall squares including sides and tops)
    // Only the shadow fill is covered!
    for (const entity of allRenderables) {
      this.drawObjectGroundShadowFill(entity, arena, ppu);
    }

    // 3. Wall Bases (squares representing the sides / front faces at ground level)
    this.drawWallBases(arena, ppu);

    // 3b. Wall Tile Preview (When in Wall Editor sub-mode)
    if (isWallEditor && hoverWallTile) {
      this.drawWallEditorHover(arena, hoverWallTile, ppu);
    }

    // Split entities into ground layer (< wallHeight) and elevated layer (>= wallHeight).
    const groundRenderables = allRenderables.filter(e => {
      if (e.isHeld && e.heldBy && e.heldBy.position.z >= arena.wallHeight - 0.05) return false;
      return e.position.z < arena.wallHeight - 0.05;
    });
    const elevatedRenderables = allRenderables.filter(e => {
      if (e.isHeld && e.heldBy && e.heldBy.position.z >= arena.wallHeight - 0.05) return true;
      return e.position.z >= arena.wallHeight - 0.05;
    });

    // 4. Ground Entities (z < wallHeight)
    // Rendered before wall tops so top of wall renders OVER ground objects!
    for (const entity of groundRenderables) {
      if (entity instanceof Character) {
        this.drawCharacter(entity, characters, ppu, arena, targetGrabEntities);
      } else {
        this.drawFreebodyObject(entity, characters, ppu, targetGrabEntities, arena);
      }
    }

    // 5. Top of Walls (squares representing the tops - renders OVER ground objects and ground shadows!)
    this.drawWallTops(arena, ppu, allRenderables);

    // 6. Wall-Top Shadows (for entities hovering above walls - rendered on wall tops BEFORE elevated entities)
    for (const entity of allRenderables) {
      this.drawObjectWallTopShadowFill(entity, arena, ppu);
    }

    // 7. Elevated Entities (z >= wallHeight)
    // Standing on the wall roof or flying in the air above walls (renders ON TOP of wall shadows)
    for (const entity of elevatedRenderables) {
      if (entity instanceof Character) {
        this.drawCharacter(entity, characters, ppu, arena, targetGrabEntities);
      } else {
        this.drawFreebodyObject(entity, characters, ppu, targetGrabEntities, arena);
      }
    }

    // 8. Collider Position Outlines (Renders ON TOP OF EVERYTHING - only the shadow fill is covered!)
    for (const entity of allRenderables) {
      this.drawObjectColliderPositionOutline(entity, arena, ppu);
    }

    // 9. Vertical connector lines for elevated entities (renders OVER objects and character!)
    if (useHover) {
      for (const entity of allRenderables) {
        this.drawVerticalConnectorLine(entity, arena, ppu);
      }
    }

    // 10. Trajectory Lines, Aim Cursors, and Colored Dotted Sightlines to Cursors
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    if (Array.isArray(activeAimCursorsOrIsGamepad)) {
      for (const cursor of activeAimCursorsOrIsGamepad) {
        const cChar = cursor.character;
        const charX = cChar.position.x * ppu;
        const charY = (cChar.position.y - cChar.position.z * hoverScale) * ppu;
        const cursorX = cursor.x * ppu;
        const cursorY = cursor.y * ppu;

        // Draw colored dotted line from character to their cursor so players instantly know which reticle is theirs
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = cursor.color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 3;
        ctx.moveTo(charX, charY);
        ctx.lineTo(cursorX, cursorY);
        ctx.stroke();
        ctx.restore();

        // If holding an object, draw projectile trajectory arc; otherwise draw precision aim reticle
        if (cChar.activeTrajectory) {
          this.drawTrajectory(cChar.activeTrajectory, ppu, arena, { x: cursor.x, y: cursor.y }, cChar);
        } else {
          this.drawAimReticle(cursorX, cursorY, cursor.color, `P${cursor.playerNumber}`);
        }
      }
    } else {
      // Legacy singleplayer fallback
      const isUsingGamepad = activeAimCursorsOrIsGamepad;
      if (character) {
        const activeAimCursor = character.aimTarget || (isUsingGamepad ? legacyGamepadAimPos : null);
        if (character.activeTrajectory) {
          this.drawTrajectory(character.activeTrajectory, ppu, arena, activeAimCursor, character);
        } else if (isUsingGamepad && activeAimCursor) {
          this.drawAimReticle(activeAimCursor.x * ppu, activeAimCursor.y * ppu, character.playerColor, `P${character.playerNumber}`);
        }
      }
    }

    // Selection & Hover Gizmos (Only active and visible during Edit Mode)
    if (isEditMode) {
      if (hoverEntity && hoverEntity !== selectedEntity) {
        this.drawHoverGizmo(hoverEntity, ppu);
      }
      if (selectedEntity) {
        this.drawSelectionGizmo(selectedEntity, isEditMode, ppu);
      }
    }

    // Ghost Clones (Echoed states from 3rd-party relay server)
    if (ghostSnapshot) {
      this.drawGhostClones(ghostSnapshot, ppu, arena);
    }

    // 12. Player Name Tags — drawn LAST so they are always above walls, entities, and everything else
    for (const char of characters) {
      this.drawCharacterNameTag(char, arena, ppu);
    }

    // 13. Simulation Paused Overlay (when all players are removed)
    if (isPaused) {
      this.drawPausedOverlay(ctx);
    }
  }

  /**
   * Draws a clean glassmorphic banner when all players have departed and simulation is paused.
   */
  private drawPausedOverlay(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    ctx.save();

    // Subtle dark scrim over arena
    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.fillRect(0, 0, w, h);

    // Glassmorphic Center Card
    const cardW = Math.min(w - 48, 480);
    const cardH = 114;
    const cardX = centerX - cardW / 2;
    const cardY = centerY - cardH / 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cardX, cardY, cardW, cardH, 14);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();

    // Amber glowing border
    ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Header: ⏸️ SIMULATION PAUSED
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 16px 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("⏸️ SIMULATION PAUSED", centerX, cardY + 30);

    // Subtitle: No active characters in arena
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("All players have departed the arena.", centerX, cardY + 56);

    // Join prompts badge
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("Press [SPACEBAR] or Controller (A) to Jump In", centerX, cardY + 84);

    ctx.restore();
  }

  /**
   * Draws echoed ghost clones returned from the 3rd party relay server.
   * Renders with semi-transparency and dashed spectral outlines to show network echo delay.
   */
  public drawGhostClones(ghostSnapshot: GhostSnapshot, ppu: number, arena: Arena): void {
    const ctx = this.ctx;
    ctx.save();

    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    // 1. Draw Ghost Character
    const gChar = ghostSnapshot.character;
    if (gChar) {
      const charScale = useBigger ? Renderer.getAltitudeScale(gChar.z, arena.wallHeight) : 1.0;
      const px = gChar.x * ppu;
      const py = (gChar.y - gChar.z * hoverScale) * ppu;
      const r = gChar.radius * ppu * charScale;

      // Ghost ground shadow (drawn when elevated above ground level)
      if (gChar.z > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(gChar.x * ppu, gChar.y * ppu, gChar.radius * ppu, 0, Math.PI * 2);
        if (useHover && hoverScale > 0) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();

        // Second dotted outline at wall elevation (when bigger sprites is active and z > wallHeight)
        if (useBigger && gChar.z > arena.wallHeight + 0.01) {
          const wallAltScale = Renderer.getAltitudeScale(arena.wallHeight, arena.wallHeight);
          ctx.beginPath();
          ctx.arc(gChar.x * ppu, gChar.y * ppu, gChar.radius * ppu * wallAltScale, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 4]);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Ghost body
      ctx.save();
      const isOnLayer2 = gChar.z >= arena.wallHeight;
      ctx.globalAlpha = isOnLayer2 ? 0.35 : 0.55;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8"; // Spectral Cyan
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      // Ghost badge / ping label
      ctx.setLineDash([]);
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#e0f2fe";
      ctx.textAlign = "center";
      ctx.fillText(`👻 ECHO (${Math.round(ghostSnapshot.rttMs)}ms)`, px, py - r - 6);
      ctx.restore();
    }

    // 2. Draw Ghost Objects
    if (ghostSnapshot.objects) {
      for (const obj of ghostSnapshot.objects) {
        const altScale = useBigger ? Renderer.getAltitudeScale(obj.z, arena.wallHeight) : 1.0;
        const px = obj.x * ppu;
        const py = (obj.y - obj.z * hoverScale) * ppu;
        const r = obj.radius * ppu * altScale;

        // Ghost ground shadow
        if (obj.z > 0.01) {
          ctx.save();
          ctx.beginPath();
          if (obj.shape === "box") {
            ctx.rect((obj.x - obj.radius) * ppu, (obj.y - obj.radius) * ppu, obj.radius * 2 * ppu, obj.radius * 2 * ppu);
          } else {
            ctx.arc(obj.x * ppu, obj.y * ppu, obj.radius * ppu, 0, Math.PI * 2);
          }
          if (useHover) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.fill();
          }
          ctx.strokeStyle = "rgba(168, 85, 247, 0.55)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.stroke();

          // Second dotted outline at wall elevation (when bigger sprites is active and z > wallHeight)
          if (useBigger && obj.z > arena.wallHeight + 0.01) {
            const wallAltScale = Renderer.getAltitudeScale(arena.wallHeight, arena.wallHeight);
            const wallR = obj.radius * ppu * wallAltScale;
            ctx.beginPath();
            if (obj.shape === "box") {
              ctx.rect(obj.x * ppu - wallR, obj.y * ppu - wallR, wallR * 2, wallR * 2);
            } else {
              ctx.arc(obj.x * ppu, obj.y * ppu, wallR, 0, Math.PI * 2);
            }
            ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
            ctx.lineWidth = 1.2;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.save();
        const isOnLayer2 = obj.z >= arena.wallHeight;
        ctx.globalAlpha = isOnLayer2 ? 0.35 : 0.5;
        ctx.beginPath();
        if (obj.shape === "box") {
          const sz = r * 2;
          ctx.rect(px - r, py - r, sz, sz);
        } else {
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
        ctx.fillStyle = obj.color || "#a855f7";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.stroke();

        // Small ghost label
        ctx.setLineDash([]);
        ctx.font = "8px monospace";
        ctx.fillStyle = "#f3e8ff";
        ctx.textAlign = "center";
        ctx.fillText("👻", px, py + 3);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private drawFloorGrid(arena: Arena, ppu: number): void {
    const ctx = this.ctx;
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
   * Walls: Pure 2D or 2.5D Isometric based on View Settings.
  /**
   * Wall Bases: In Hover / Both mode with visualAltitudeScale > 0:
   * - Bottom square (front face) is rendered in an intermediate shade at ground level.
   */
  private drawWallBases(arena: Arena, ppu: number): void {
    const ctx = this.ctx;
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
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
   * Top of Wall Squares: Renders OVER ground entities!
   * - Top square is placed at (y - wallHeight * visualAltitudeScale).
   *   Values < 1 squish the visible bottom square down to that height.
   * - Transparency: Only when an entity's collider on screen is completely above the wall's collider,
   *   and the entity and wall collider overlap on screen X.
   *   Being beside a wall (left or right) does NOT cause transparency.
   *   "if any objects are coverd by the top of a wall, make it transparent. not just if covering the player character"
   */
  private drawWallTops(arena: Arena, ppu: number, entities: GameObject[]): void {
    const ctx = this.ctx;
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    if (hoverScale <= 0) {
      // Standard flat 2D top-down walls (rendered over ground objects)
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

      // Check if ANY ground entity is covered by the visual top square of this wall:
      let isAnyCovered = false;
      for (const obj of entities) {
        const objR = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.35);
        const objX = obj.position.x;
        const objY = obj.position.y;
        const isObjOnGround = obj.position.z < arena.wallHeight - 0.05;
        if (!isObjOnGround) continue;

        // 1. Overlap on screen X:
        const overlapX = (objX + objR > wall.x) && (objX - objR < wall.x + wall.width);
        if (!overlapX) continue;

        // 2. Collider on screen is completely above the wall's collider:
        const isCompletelyAboveWallCollider = (objY + objR <= wall.y + 0.05);
        if (!isCompletelyAboveWallCollider) continue;

        // 3. Within the visual region covered by the top square:
        const overlapsTopSquare = (objY + objR >= topSquareY - 0.05);
        if (overlapsTopSquare) {
          isAnyCovered = true;
          break;
        }
      }

      ctx.save();
      if (isAnyCovered) {
        ctx.globalAlpha = 0.35; // See-through X-ray transparency when any object is behind/under the top square
      } else {
        ctx.globalAlpha = 1.0;  // Fully opaque
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
   * Wall Editor Grid Cell Hover Indicator:
   * Displays a cyan "+ Draw" preview on empty floor tiles or a red "✕ Erase" preview on existing wall tiles.
   */
  private drawWallEditorHover(arena: Arena, tile: { col: number; row: number }, ppu: number): void {
    if (tile.col < 0 || tile.col >= arena.cols || tile.row < 0 || tile.row >= arena.rows) return;
    const ctx = this.ctx;
    const x = tile.col * arena.tileSize * ppu;
    const y = tile.row * arena.tileSize * ppu;
    const size = arena.tileSize * ppu;
    const hasWall = arena.hasWall(tile.col, tile.row);

    ctx.save();
    if (hasWall) {
      // Erase Preview (Red)
      ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);

      // Icon / Label
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#fca5a5";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✕ Erase", x + size / 2, y + size / 2);
    } else {
      // Draw Preview (Cyan)
      ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);

      // Icon / Label
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#7dd3fc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+ Draw", x + size / 2, y + size / 2);
    }
    ctx.restore();
  }

  /**
   * Altitude visual scaling:
   * As height z increases, the object sprite scales up (getting bigger with altitude),
   * while the physical outline stays fixed at the collider size (showing exact collider footprint).
   */
  public static getAltitudeScale(z: number, wallHeight: number): number {
    return 1.0 + (Math.max(0, z) / Math.max(0.1, wallHeight)) * 0.5;
  }

  /**
   * Checks if an entity is on Layer 2 (elevated at or above wall height, standing on a wall, or above walls).
   */
  public static isEntityOnLayer2(entity: GameObject, wallHeight: number): boolean {
    const threshold = wallHeight - 0.05;
    return (
      entity.position.z >= threshold ||
      entity.supportingSurfaceHeight >= threshold ||
      entity.standingWall !== null ||
      entity.isAboveWalls
    );
  }

  /**
   * Draws a vertical dotted line from the center of the airborne/elevated object (renderY)
   * down to the object's real 2D position (groundY).
   * "the dotted virtical line that points to the objects real 2d position should still be visible when they're on a wall.
   * maybe it's covered, maybe it's logically hidden, but it should be visible for every object that has higher elevation than 0"
   */
  private drawVerticalConnectorLine(obj: GameObject, arena: Arena, ppu: number): void {
    // Check effective elevation across physical position, supporting surface, or standing wall
    const z = Math.max(
      obj.position.z,
      obj.supportingSurfaceHeight ?? 0,
      (obj.standingWall ? arena.wallHeight : 0)
    );
    if (z <= 0.001) return;

    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    if (hoverScale <= 0) return;

    const ctx = this.ctx;
    const groundX = obj.position.x * ppu;
    const groundY = obj.position.y * ppu;
    const renderY = (obj.position.y - z * hoverScale) * ppu;
    const wallH = arena.wallHeight;
    const layer2BaseY = (obj.position.y - wallH * hoverScale) * ppu;
    const layer2CeilingY = (obj.position.y - 2 * wallH * hoverScale) * ppu;

    // Determine whether the object is physically supported by or directly above a wall.
    // Draw the vertical line down to the first surface it would hit if falling straight down:
    // - If directly above or on a wall (at wall elevation or higher): bottom surface is the wall top (layer2BaseY).
    // - If above open ground (no wall beneath): bottom surface is the ground (groundY), even if high in the air!
    const radius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    const wallBeneath = (obj.standingWall && arena.walls.some(w => w.id === obj.standingWall!.id))
      ? obj.standingWall
      : arena.getSupportingWall(obj.position.x, obj.position.y, radius);
    const isClimbing = Boolean(obj.isCharacter && (obj as any).isClimbing);
    const isOnOrAboveWall = wallBeneath !== null && z >= wallH - 0.05 && !isClimbing;
    const lineBottomY = isOnOrAboveWall ? layer2BaseY : groundY;

    // If line has zero or negligible length (e.g. standing exactly on wall top or surface), skip
    if (Math.abs(lineBottomY - renderY) < 0.5) return;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 3;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 4]);

    if (z <= wallH) {
      // Layer 1: white dashed line from lineBottomY (ground or wall-top) to renderY
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath();
      ctx.moveTo(groundX, lineBottomY);
      ctx.lineTo(groundX, renderY);
      ctx.stroke();
    } else if (z < 2 * wallH) {
      // Object is in Layer 2 (wallHeight <= z < 2 * wallHeight)
      if (!isOnOrAboveWall) {
        // 1. Ground to wall-top (only when NOT standing on a wall)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.moveTo(groundX, groundY);
        ctx.lineTo(groundX, layer2BaseY);
        ctx.stroke();
      }

      // 2. Wall-top to object — cyan indicates Layer 2 elevation
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.beginPath();
      ctx.moveTo(groundX, layer2BaseY);
      ctx.lineTo(groundX, renderY);
      ctx.stroke();

      // Wall-top threshold notch — only show when line crosses from ground through it
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
      // Object is in Layer 3+ (z >= 2 * wallHeight)
      if (!isOnOrAboveWall) {
        // 1. Ground to wall-top (only when NOT standing on a wall)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.moveTo(groundX, groundY);
        ctx.lineTo(groundX, layer2BaseY);
        ctx.stroke();
      }

      // 2. Layer 2 zone — cyan
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.beginPath();
      ctx.moveTo(groundX, layer2BaseY);
      ctx.lineTo(groundX, layer2CeilingY);
      ctx.stroke();

      // 3. Layer 3+ — faint white
      ctx.strokeStyle = "rgba(255, 255, 255, 0.50)";
      ctx.beginPath();
      ctx.moveTo(groundX, layer2CeilingY);
      ctx.lineTo(groundX, renderY);
      ctx.stroke();

      // Wall-top threshold notch — only when crossing from ground through it
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

      // Layer 2 ceiling notch (z = 2 * wallHeight)
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


  /**
   * Checks whether an entity's collider footprint overlaps any wall in 2D.
   */
  private isEntityOverWall(obj: GameObject, arena: Arena): boolean {
    for (const wall of arena.walls) {
      const closestX = Math.max(wall.x, Math.min(obj.position.x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(obj.position.y, wall.y + wall.height));
      const dx = obj.position.x - closestX;
      const dy = obj.position.y - closestY;
      if (dx * dx + dy * dy < obj.colliderRadius * obj.colliderRadius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Draws the shadow fill for the ground floor (rendered below all wall squares).
   */
  private drawObjectGroundShadowFill(obj: GameObject, _arena: Arena, ppu: number): void {
    const z = obj.position.z;
    if (z <= 0.01) return;

    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    if (!useHover || hoverScale <= 0) return;

    const ctx = this.ctx;
    const groundX = obj.position.x * ppu;
    const groundY = obj.position.y * ppu;
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
   * "mask top of wall shadows to the top of wall squares"
   */
  private drawObjectWallTopShadowFill(obj: GameObject, arena: Arena, ppu: number): void {
    const z = obj.position.z;
    if (z <= 0.01) return;

    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    if (!useHover || hoverScale <= 0) return;

    const isAboveWall = z >= arena.wallHeight - 0.05 && this.isEntityOverWall(obj, arena);
    if (!isAboveWall) return;

    const ctx = this.ctx;
    const groundX = obj.position.x * ppu;
    const wallTopScreenY = (obj.position.y - arena.wallHeight * hoverScale) * ppu;
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
    ctx.restore(); // restores clipping region
  }

  /**
   * Draws the outline of the actual collider position on top of everything.
   * "the outline of the actual collider position should render on top of everything. only the shadow should be covered"
   * "outlines are only drawn for the top most relevant shadow. if its above a wall, only draw the outline around the shadow for the top of the wall"
   */
  private drawObjectColliderPositionOutline(obj: GameObject, arena: Arena, ppu: number): void {
    const z = obj.position.z;
    if (z <= 0.01) return;

    // No outline if the object is resting exactly at the floor of its layer:
    // - On ground → z ≤ 0.01 (caught above)
    // - Resting on wall top → standingWall is set AND z is at wall height
    //   (NOT just supportingSurfaceHeight, which is set during climbing approach but z is still mid-climb)
    if (obj.standingWall !== null && z <= arena.wallHeight + 0.02) return;

    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    // Check if the entity is above a wall
    const isAboveWall = useHover && hoverScale > 0 && z >= arena.wallHeight - 0.05 && this.isEntityOverWall(obj, arena);

    const ctx = this.ctx;
    const groundX = obj.position.x * ppu;
    const outlineY = isAboveWall
      ? (obj.position.y - arena.wallHeight * hoverScale) * ppu
      : obj.position.y * ppu;
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

    // If higher than wall height in Bigger Sprites mode on open ground, draw reference ring
    if (!isAboveWall && useBigger && z > arena.wallHeight + 0.01) {
      const wallAltScale = Renderer.getAltitudeScale(arena.wallHeight, arena.wallHeight);
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

      // (Blue outline for above Layer 2 threshold disabled for now per user request)
      /*
      if (z >= 2 * arena.wallHeight + 0.01) {
        const layer2CeilAltScale = Renderer.getAltitudeScale(2 * arena.wallHeight, arena.wallHeight);
        const layer2CeilRadius = obj.colliderRadius * ppu * layer2CeilAltScale;
        ctx.beginPath();
        if (obj.visualShape === "box") {
          const sz = layer2CeilRadius * 2;
          const cr = Math.max(3, layer2CeilRadius * 0.16);
          if (ctx.roundRect) ctx.roundRect(groundX - layer2CeilRadius, outlineY - layer2CeilRadius, sz, sz, cr);
          else ctx.rect(groundX - layer2CeilRadius, outlineY - layer2CeilRadius, sz, sz);
        } else {
          ctx.arc(groundX, outlineY, layer2CeilRadius, 0, Math.PI * 2);
        }
        ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
      }
      */
    }

    // (Blue outline for above Layer 2 ceiling in hover mode disabled for now per user request)
    /*
    if (useHover && hoverScale > 0 && z >= 2 * arena.wallHeight - 0.05) {
      const ceilingY = (obj.position.y - 2 * arena.wallHeight * hoverScale) * ppu;
      ctx.beginPath();
      if (obj.visualShape === "box") {
        const sz = shadowRadius * 2;
        const cr = Math.max(3, shadowRadius * 0.16);
        if (ctx.roundRect) ctx.roundRect(groundX - shadowRadius, ceilingY - shadowRadius, sz, sz, cr);
        else ctx.rect(groundX - shadowRadius, ceilingY - shadowRadius, sz, sz);
      } else {
        ctx.arc(groundX, ceilingY, shadowRadius, 0, Math.PI * 2);
      }
      ctx.strokeStyle = "rgba(56, 189, 248, 0.70)"; // Distinct cyan dashed ring for Layer 2 ceiling
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
    }
    */
    ctx.restore();
  }

  /**
   * Draws the floating player name tag (P1, P2 … or "Press Space / A") for a character.
   * Called in a dedicated final render pass so tags always appear above walls and all entities.
   */
  private drawCharacterNameTag(char: Character, arena: Arena, ppu: number): void {
    const ctx = this.ctx;
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const altitudeScale = useBigger ? Renderer.getAltitudeScale(char.position.z, arena.wallHeight) : 1.0;

    const x = char.position.x * ppu;
    const y = (char.position.y - char.position.z * hoverScale) * ppu;
    const r = char.colliderRadius * ppu * altitudeScale;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (char.playerId) {
      const badgeText = `P${char.playerNumber}`;
      ctx.font = "bold 11px monospace";
      const textWidth = ctx.measureText(badgeText).width;
      const pillW = textWidth + 8;
      const pillH = 14;
      const pillX = x - pillW / 2;
      const pillY = y - r - 15;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();

      ctx.strokeStyle = char.playerColor || char.color;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = char.playerColor || char.color;
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
   * Freebody Object: Pure top-down at (x, y) with fixed physical radius (no scale expansion).
   * Supports both box and circle visual shapes (both using circle colliders).
   * Highlights objects within any player character's pickup reach.
   */
  private drawFreebodyObject(
    obj: GameObject,
    allCharacters: Character[],
    ppu: number,
    targetGrabEntities: GameObject | null | Map<Character, GameObject | null> | Set<GameObject> | undefined,
    arena: Arena
  ): void {
    const ctx = this.ctx;
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    const x = obj.position.x * ppu;
    const y = (obj.position.y - obj.position.z * hoverScale) * ppu;
    const altitudeScale = useBigger ? Renderer.getAltitudeScale(obj.position.z, arena.wallHeight) : 1.0;
    const visualRadius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    const realRadius = visualRadius * ppu;
    const renderRadius = realRadius * altitudeScale;

    // Check if close enough for any player character to pick up, strictly respecting layer-dependent reach
    const charactersInReach = allCharacters.filter(
      (c) =>
        !c.isHeld &&
        !c.heldObject &&
        c.pickupModule !== null &&
        c.pickupModule.enabled &&
        !obj.isHeld &&
        (c.pickupModule?.isObjectInReach(c, obj, arena.wallHeight) ?? false)
    );
    const isWithinPickupRange = charactersInReach.length > 0;

    // Determine which players are currently targeting this object
    const targetingChars: Character[] = [];
    if (targetGrabEntities instanceof Map) {
      for (const [char, target] of targetGrabEntities.entries()) {
        if (target === obj) targetingChars.push(char);
      }
    } else if (targetGrabEntities) {
      if (targetGrabEntities instanceof Set && targetGrabEntities.has(obj)) {
        targetingChars.push(...charactersInReach);
      } else if (targetGrabEntities === obj) {
        targetingChars.push(...charactersInReach);
      }
    }
    const isTargetGrab = targetingChars.length > 0;

    // Objects on walls must be transparent when they get bigger and aren't hovering over a shadow,
    // so players can see what is underneath them; held objects are also transparent.
    const isOnLayer2 = Renderer.isEntityOnLayer2(obj, arena.wallHeight);
    const isHeld = obj.isHeld || allCharacters.some((c) => c.heldObject === obj);
    const isBiggerWithoutHover = useBigger && (!useHover || hoverScale <= 0);
    const shouldBeTransparent = isHeld || (isBiggerWithoutHover && isOnLayer2);

    ctx.save();
    ctx.globalAlpha = shouldBeTransparent ? 0.55 : 1.0;

    if (obj.visualShape === "box") {
      // 2D Box / Crate visualization (with circular collider of radius renderRadius)
      const size = renderRadius * 2;
      const cornerR = Math.max(3, renderRadius * 0.16);
      const left = x - renderRadius;
      const top = y - renderRadius;

      // Base colored box
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(left, top, size, size, cornerR);
      } else {
        ctx.rect(left, top, size, size);
      }
      ctx.fillStyle = obj.color;
      ctx.fill();

      // Outer border
      const primaryTargetChar = targetingChars[0];
      const targetColor = primaryTargetChar ? (primaryTargetChar.playerColor || "#ffffff") : "#ffffff";
      ctx.strokeStyle = isWithinPickupRange ? (isTargetGrab ? targetColor : "#ffffff") : "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = isWithinPickupRange ? 2.5 : 2;
      ctx.stroke();

      // Inner crate inset details (slats / beveled border)
      const inset = Math.max(3, renderRadius * 0.22);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(left + inset, top + inset, size - inset * 2, size - inset * 2, cornerR * 0.7);
      } else {
        ctx.rect(left + inset, top + inset, size - inset * 2, size - inset * 2);
      }
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Subtle crate cross
      ctx.beginPath();
      ctx.moveTo(left + inset, top + inset);
      ctx.lineTo(left + size - inset, top + size - inset);
      ctx.moveTo(left + size - inset, top + inset);
      ctx.lineTo(left + inset, top + size - inset);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else {
      // Colored circle body
      ctx.beginPath();
      ctx.arc(x, y, renderRadius, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.fill();
      const primaryTargetChar = targetingChars[0];
      const targetColor = primaryTargetChar ? (primaryTargetChar.playerColor || "#ffffff") : "#ffffff";
      ctx.strokeStyle = isWithinPickupRange ? (isTargetGrab ? targetColor : "#ffffff") : "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = isWithinPickupRange ? 2.5 : 2;
      ctx.stroke();
    }

    // 3D Roll Illustration: Dotted oval / circle rotating in direction of roll if roll module attached
    this.drawRollIndicator(obj, x, y, renderRadius);

    ctx.restore();

    // Highlight ring around objects in pickup reach (matches real physical size of the object, not inflated elevation size)
    if (isWithinPickupRange) {
      const grabRadius = realRadius + 2;
      ctx.save();
      ctx.beginPath();
      if (obj.visualShape === "box") {
        const sz = grabRadius * 2;
        const cr = Math.max(3, grabRadius * 0.16);
        if (ctx.roundRect) {
          ctx.roundRect(x - grabRadius, y - grabRadius, sz, sz, cr);
        } else {
          ctx.rect(x - grabRadius, y - grabRadius, sz, sz);
        }
      } else {
        ctx.arc(x, y, grabRadius, 0, Math.PI * 2);
      }
      if (isTargetGrab) {
        // Active target: solid vibrant glowing ring in targeting player's theme color & prominent badge
        const primaryTargetChar = targetingChars[0];
        const themeColor = primaryTargetChar.playerColor || "#38bdf8";
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2.8;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        const badgeText =
          allCharacters.length > 1 && primaryTargetChar.playerNumber
            ? `P${primaryTargetChar.playerNumber} GRAB`
            : "GRAB";
        ctx.fillText(badgeText, x, y - grabRadius - 6);
      } else {
        // In physical reach of a player, but not actively targeted: subtle dashed ring
        const reachColor = charactersInReach[0]?.playerColor
          ? `${charactersInReach[0].playerColor}99`
          : "rgba(56, 189, 248, 0.45)";
        ctx.strokeStyle = reachColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Character: Pure top-down circle with two black circles on facing side.
   * Can also be highlighted and grabbed by other characters.
   */
  private drawCharacter(
    char: Character,
    allCharacters: Character[],
    ppu: number,
    arena: Arena,
    targetGrabEntities?: GameObject | null | Map<Character, GameObject | null> | Set<GameObject>
  ): void {
    const ctx = this.ctx;
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    const x = char.position.x * ppu;
    const y = (char.position.y - char.position.z * hoverScale) * ppu;
    const altitudeScale = useBigger ? Renderer.getAltitudeScale(char.position.z, arena.wallHeight) : 1.0;
    const r = char.colliderRadius * ppu * altitudeScale;

    // Check if another character can grab this character
    const charactersInReach = allCharacters.filter(
      (c) =>
        c !== char &&
        !c.isHeld &&
        !c.heldObject &&
        c.pickupModule !== null &&
        c.pickupModule.enabled &&
        !char.isHeld &&
        (c.pickupModule?.isObjectInReach(c, char, arena.wallHeight) ?? false)
    );
    const isWithinPickupRange = charactersInReach.length > 0;

    const targetingChars: Character[] = [];
    if (targetGrabEntities instanceof Map) {
      for (const [c, target] of targetGrabEntities.entries()) {
        if (c !== char && target === char) targetingChars.push(c);
      }
    } else if (targetGrabEntities) {
      if (targetGrabEntities instanceof Set && targetGrabEntities.has(char)) {
        targetingChars.push(...charactersInReach);
      } else if (targetGrabEntities === char) {
        targetingChars.push(...charactersInReach);
      }
    }
    const isTargetGrab = targetingChars.length > 0;

    // Characters on walls must be transparent when they get bigger and aren't hovering over a shadow,
    // so players can see what is underneath them; held characters are also transparent.
    const isOnLayer2 = Renderer.isEntityOnLayer2(char, arena.wallHeight);
    const isHeld = char.isHeld || char.heldBy !== null;
    const isBiggerWithoutHover = useBigger && (!useHover || hoverScale <= 0);
    const shouldBeTransparent = isHeld || (isBiggerWithoutHover && isOnLayer2);

    ctx.save();
    ctx.globalAlpha = shouldBeTransparent ? 0.55 : 1.0;

    // Base colored circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = char.color;
    ctx.fill();
    ctx.strokeStyle = isWithinPickupRange && isTargetGrab
      ? (targetingChars[0].playerColor || "#ffffff")
      : "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3D Roll Illustration if roll module is attached to character
    this.drawRollIndicator(char, x, y, r);

    // Two black colored circles on the side it's facing
    const eyeSpreadAngle = 0.52; // ~30 degrees spread
    const eyeDist = r * 0.72;
    const eyeRadius = Math.max(3.5, r * 0.18);

    const eye1Angle = char.facingAngle - eyeSpreadAngle;
    const eye2Angle = char.facingAngle + eyeSpreadAngle;

    const eye1X = x + Math.cos(eye1Angle) * eyeDist;
    const eye1Y = y + Math.sin(eye1Angle) * eyeDist;
    const eye2X = x + Math.cos(eye2Angle) * eyeDist;
    const eye2Y = y + Math.sin(eye2Angle) * eyeDist;

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // NOTE: Player name tags are drawn in a final top-level pass via drawCharacterNameTag()
    // to ensure they always render above walls, wall tops, and all other entities.

    ctx.restore();

    // Highlight ring around grabbable character
    if (isWithinPickupRange) {
      const grabRadius = r + 3;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, grabRadius, 0, Math.PI * 2);
      if (isTargetGrab) {
        const primaryTargetChar = targetingChars[0];
        const themeColor = primaryTargetChar.playerColor || "#38bdf8";
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 2.8;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.fillStyle = themeColor;
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        const badgeText =
          allCharacters.length > 1 && primaryTargetChar.playerNumber
            ? `P${primaryTargetChar.playerNumber} GRAB`
            : "GRAB";
        ctx.fillText(badgeText, x, y + grabRadius + 14);
      } else {
        const reachColor = charactersInReach[0]?.playerColor
          ? `${charactersInReach[0].playerColor}99`
          : "rgba(56, 189, 248, 0.45)";
        ctx.strokeStyle = reachColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Illustrates the 3D rolling behavior:
   * - Draws a dotted oval shape animated to rotate in the direction the object is rotating.
   * - Warps depending on angular velocity (elongated ellipse when rolling horizontally, opening into a circle when vertical).
   * - The half of the oval that is virtually higher up is opaque, while the other half is transparent.
   * - If the angular velocity is perfectly vertical, renders as a circle with a circular dotted outline rotating around it.
   */
  private drawRollIndicator(obj: GameObject, x: number, y: number, renderRadius: number): void {
    if (!obj.rollModule || !obj.rollModule.enabled) return;
    const roll = obj.rollModule;
    const wx = roll.angularVelocity.x;
    const wy = roll.angularVelocity.y;
    const wz = roll.angularVelocity.z;
    const wTotal = Math.hypot(wx, wy, wz);
    if (wTotal < 0.02) return; // Stationary

    const ctx = this.ctx;
    const wh = Math.hypot(wx, wy); // Horizontal angular speed
    const isPerfectVertical = wh < 0.05 * wTotal;

    // Hide fixed-speed arrows when it has zero angular velocity or is being held
    const showArrows = !obj.isHeld && wTotal > 0.02;

    // Stroke thickness remains fixed and does not get thicker as altitude increases
    const strokeWidth = 2.5;
    const dashLen = 5;
    const dashGap = 4;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 3;

    if (isPerfectVertical) {
      // Perfectly vertical spin (ωz): circle with a circular outline rotating around it
      const innerRadius = renderRadius * 0.50;
      const outerRadius = renderRadius * 0.88;
      const spinSign = wz !== 0 ? Math.sign(wz) : 1;

      // Central reference circle
      ctx.beginPath();
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      // 1. Upward facing rounded, skewed triangles from player's perspective (hidden if held or zero angular velocity)
      if (showArrows) {
        this.drawFixedSpeedTriangles(ctx, x, y, outerRadius, outerRadius, 0, spinSign, renderRadius, true);
      }

      // 2. Circular dotted outline rotating around it at physical speed
      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = -roll.visualPhase * outerRadius * spinSign;
      ctx.stroke();
    } else {
      // General 3D rolling / tilted rotation:
      const rollDirAngle = Math.atan2(-wx, wy);

      // Semi-major axis a (across roll axis) and semi-minor axis b (along roll axis)
      // Generously scaled up across the sphere (90% of radius)
      const a = renderRadius * 0.90;
      const fz = Math.abs(wz) / wTotal; // Fraction vertical
      // Generous 3D oval opening (at least 35% opening even when rolling horizontally, opening to full circle)
      const b = a * Math.max(0.35, Math.pow(fz, 0.65));
      const spinSign = wz !== 0 ? Math.sign(wz) : 1;

      // 1. Upward facing rounded, skewed triangles from player's perspective (hidden if held or zero angular velocity)
      if (showArrows) {
        this.drawFixedSpeedTriangles(ctx, x, y, a, b, rollDirAngle, spinSign, renderRadius, false);
      }

      // 2. Classic animated dotted roll oval (rotating at physical roll speed)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rollDirAngle);

      // The LONG side of the oval across the top of the ball is OPAQUE (visible stripe)
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = -roll.visualPhase * a * spinSign;
      ctx.stroke();

      // The other LONG side (the underside of the ball) is SEMI-TRANSPARENT
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = -roll.visualPhase * a * spinSign;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draws a filled triangle with rounded corners.
   */
  private drawRoundedTriangle(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number, // Apex
    x2: number, y2: number, // Base Left
    x3: number, y3: number, // Base Right
    radius: number
  ): void {
    ctx.beginPath();
    const midX = (x2 + x1) * 0.5;
    const midY = (y2 + y1) * 0.5;
    ctx.moveTo(midX, midY);
    ctx.arcTo(x1, y1, x3, y3, radius);
    ctx.arcTo(x3, y3, x2, y2, radius);
    ctx.arcTo(x2, y2, x1, y1, radius);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draws stretched, rounded triangles pointing in the direction of travel,
   * symmetrical across the travel vector, rotating at a fixed speed underneath the animated dotted line.
   */
  private drawFixedSpeedTriangles(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    a: number,
    b: number,
    rollDirAngle: number,
    spinSign: number,
    renderRadius: number,
    isUniformAlpha: boolean = false
  ): void {
    // Fixed comfortable rotation speed: ~2.5 rad/s (~0.4 rev/sec)
    const fixedRate = 2.5;
    const fixedPhase = (performance.now() * 0.001 * fixedRate) % (Math.PI * 2);

    const numTriangles = renderRadius > 24 ? 3 : 2;
    const sliceAngle = (Math.PI * 2) / numTriangles;

    // Stretched triangle: longer in pointing/travel direction (L) than width across (W)
    const L = Math.max(14, Math.min(22, renderRadius * 0.58));
    const W = Math.max(7, Math.min(12, renderRadius * 0.32));
    const cornerRadius = 1.2;

    const cosR = Math.cos(rollDirAngle);
    const sinR = Math.sin(rollDirAngle);
    const sSign = spinSign || 1;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 3;

    for (let k = 0; k < numTriangles; k++) {
      const t = (k * sliceAngle + sSign * fixedPhase) % (Math.PI * 2);

      // Current position on the ellipse in screen space
      const lx = a * Math.cos(t);
      const ly = b * Math.sin(t);
      const sx = centerX + lx * cosR - ly * sinR;
      const sy = centerY + lx * sinR + ly * cosR;

      // Exact tangent vector in direction of travel: d(position)/dt * sSign
      // dx_local/dt = -a * sin(t), dy_local/dt = b * cos(t)
      const dlx = -a * Math.sin(t) * sSign;
      const dly = b * Math.cos(t) * sSign;
      const dsx = dlx * cosR - dly * sinR;
      const dsy = dlx * sinR + dly * cosR;
      const speed = Math.hypot(dsx, dsy);
      if (speed < 0.0001) continue;

      // Unit tangent vector (travel direction)
      const tx = dsx / speed;
      const ty = dsy / speed;

      // Unit normal vector (perpendicular to travel direction)
      const nx = -ty;
      const ny = tx;

      // On 3D oval: upper hemisphere is opaque, underside is semi-transparent
      const isTopHalf = Math.sin(t) >= 0;
      const alpha = isUniformAlpha ? 0.90 : (isTopHalf ? 0.90 : 0.32);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

      // Symmetrical triangle stretched along travel direction:
      // Apex points forward along the travel direction
      const apexX = sx + tx * (L * 0.55);
      const apexY = sy + ty * (L * 0.55);

      // Base corners symmetrical on either side of the travel axis
      const blX = sx - tx * (L * 0.45) + nx * (W * 0.50);
      const blY = sy - ty * (L * 0.45) + ny * (W * 0.50);
      const brX = sx - tx * (L * 0.45) - nx * (W * 0.50);
      const brY = sy - ty * (L * 0.45) - ny * (W * 0.50);

      this.drawRoundedTriangle(ctx, apexX, apexY, blX, blY, brX, brY, cornerRadius);
    }

    ctx.restore();
  }

  /**
   * Trajectory Line:
   * Rendered as a dotted white line where every fixed 3D distance interval (including vertical distance)
   * renders a white dot. Dots get bigger as altitude increases, and become transparent once within Layer 2.
   */
  private drawTrajectory(
    traj: TrajectoryCalculation,
    ppu: number,
    arena: Arena,
    aimTarget?: Vector2D | null,
    character?: Character | null
  ): void {
    const ctx = this.ctx;
    const points = traj.points;
    if (points.length < 2) return;

    ctx.save();

    // Subtle drop shadow so white dots stand out clearly on all backgrounds
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 3;

    // Fixed 3D distance interval between dots in world units (~19px at 50ppu)
    const base3DSpacing = 0.38;
    const baseRadius = Math.max(2.2, 0.048 * ppu);
    const layer2Threshold = arena.wallHeight - 0.05;

    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    // 1. Straight Shadow Trajectory Line (Hover & Both modes):
    // Straight dotted line broken into sections:
    // - Below wall height: rendered along ground track (opaque)
    // - At or above wall height: section is moved upwards to wall height (transparent)
    if (useHover && hoverScale > 0) {
      const startGroundX = points[0].x * ppu;
      const startGroundY = points[0].y * ppu;

      let endGroundX = traj.landPoint.x * ppu;
      let endGroundY = traj.landPoint.y * ppu;

      const finalPt = points[points.length - 1];
      if (traj.isBlockedByWall) {
        endGroundX = finalPt.x * ppu;
        endGroundY = finalPt.y * ppu;
      }

      const totalDx = endGroundX - startGroundX;
      const totalDy = endGroundY - startGroundY;
      const totalDistPx = Math.hypot(totalDx, totalDy);

      if (totalDistPx > 5) {
        const baseGroundSpacingPx = base3DSpacing * ppu;
        const numDots = Math.max(1, Math.floor(totalDistPx / baseGroundSpacingPx));
        const landRadiusPx = (traj.colliderRadius ?? 0.35) * ppu;

        const landZ = traj.isLandingOnWallTop
          ? (traj.landPoint.z ?? arena.wallHeight)
          : (traj.isBlockedByWall && finalPt.z >= layer2Threshold ? arena.wallHeight : 0);
        const landScreenY = endGroundY - landZ * hoverScale * ppu;

        for (let k = 1; k <= numDots; k++) {
          const t = k / (numDots + 1);
          const groundDotX = startGroundX + totalDx * t;
          const groundDotY = startGroundY + totalDy * t;

          // Sample altitude along trajectory points at fraction t
          const sampleIdx = Math.min(points.length - 1, Math.floor(t * (points.length - 1)));
          const curZ = points[sampleIdx].z;
          const isLayer2 = curZ >= layer2Threshold;

          // If at or above wall height, move the section upwards to wall height; otherwise keep on ground
          const dotX = groundDotX;
          const dotY = isLayer2 ? (groundDotY - arena.wallHeight * hoverScale * ppu) : groundDotY;

          // Don't draw dots inside the character's body
          if (character) {
            const charOnWall = character.position.z >= layer2Threshold;
            const charScreenY = (character.position.y - (charOnWall ? arena.wallHeight * hoverScale : 0)) * ppu;
            const distToChar = Math.hypot(dotX - character.position.x * ppu, dotY - charScreenY);
            if (distToChar < (character.colliderRadius + 0.05) * ppu) continue;
          }

          // Don't draw dot on top of the landing footprint
          const distToEnd = Math.hypot(dotX - endGroundX, dotY - landScreenY);
          if (distToEnd < landRadiusPx * 0.75) continue;

          // Transparent when at or above wall height, opaque when below wall height
          ctx.fillStyle = isLayer2 ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.95)";
          ctx.beginPath();
          ctx.arc(dotX, dotY, baseRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    let lastX = points[0].x;
    let lastY = points[0].y;
    let lastRadius = baseRadius;
    let dist3DSinceLast = 0;
    let isFirstDot = true;

    // Step through piecewise 3D linear segments and sample dots with 2D overlap prevention
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      const segLen = Math.hypot(dx, dy, dz);
      if (segLen <= 0.0001) continue;

      // Sub-sample each segment finely so we can accurately position dots
      const subSteps = Math.max(1, Math.ceil(segLen / 0.02));
      const subDx = dx / subSteps;
      const subDy = dy / subSteps;
      const subDz = dz / subSteps;
      const subLen = segLen / subSteps;

      for (let s = 1; s <= subSteps; s++) {
        const curX = p1.x + subDx * s;
        const curY = p1.y + subDy * s;
        const curZ = p1.z + subDz * s;

        dist3DSinceLast += subLen;

        const altRatio = Math.max(0, curZ) / Math.max(0.1, arena.wallHeight);
        const radius = useBigger ? (baseRadius * (1.0 + altRatio * 0.75)) : baseRadius;
        const screenX = curX * ppu;
        const screenY = (curY - curZ * hoverScale) * ppu;

        if (isFirstDot) {
          if (dist3DSinceLast >= base3DSpacing * 0.5) {
            const isLayer2 = curZ >= layer2Threshold;
            ctx.fillStyle = isLayer2 ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.95)";
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.fill();

            lastX = screenX;
            lastY = screenY;
            lastRadius = radius;
            dist3DSinceLast = 0;
            isFirstDot = false;
          }
          continue;
        }

        // 2D distance on screen in pixels from the previous placed dot
        const dist2DPx = Math.hypot(screenX - lastX, screenY - lastY);

        // When dots get close to each other in 2D (due to steep vertical arc),
        // decrease how often dots are placed so dots never bunch up or overlap!
        const min2DSpacingPx = Math.max(18, lastRadius + radius + 7);

        if (dist3DSinceLast >= base3DSpacing && dist2DPx >= min2DSpacingPx) {
          // Don't draw dot on top of the landing target
          const landZ = traj.isLandingOnWallTop ? arena.wallHeight : 0;
          const targetScreenY = (traj.landPoint.y - landZ * hoverScale) * ppu;
          const distToLandPx = Math.hypot(screenX - traj.landPoint.x * ppu, screenY - targetScreenY);
          const landRadiusPx = (traj.colliderRadius ?? 0.35) * ppu;
          if (distToLandPx > landRadiusPx * 0.8) {
            const isLayer2 = curZ >= layer2Threshold;
            ctx.fillStyle = isLayer2 ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.95)";
            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.fill();

            lastX = screenX;
            lastY = screenY;
            lastRadius = radius;
            dist3DSinceLast = 0;
          }
        }
      }
    }

    ctx.shadowBlur = 0;

    // Impact or Landing Marker:
    // Matches the exact collider footprint size of the held object so the player can visualize if it will fit!
    const finalPt = points[points.length - 1];
    const targetRadius = (traj.colliderRadius ?? 0.35) * ppu;

    const drawColliderFootprint = (x: number, y: number) => {
      ctx.beginPath();
      if (traj.visualShape === "box") {
        const sz = targetRadius * 2;
        const cr = Math.max(3, targetRadius * 0.16);
        if (ctx.roundRect) {
          ctx.roundRect(x - targetRadius, y - targetRadius, sz, sz, cr);
        } else {
          ctx.rect(x - targetRadius, y - targetRadius, sz, sz);
        }
      } else {
        ctx.arc(x, y, targetRadius, 0, Math.PI * 2);
      }
    };

    let finalHitX = traj.landPoint.x * ppu;
    let finalGroundY = traj.landPoint.y * ppu;

    if (traj.isBlockedByWall) {
      // Wall Collision: Show exact collider footprint at collision point in dashed red, with a central red X
      const impX = finalPt.x * ppu;
      const impY = (finalPt.y - finalPt.z * hoverScale) * ppu;
      const groundImpY = finalPt.y * ppu;
      finalHitX = impX;
      finalGroundY = groundImpY;

      // If elevated hit above ground, draw vertical altitude connector line from ground up to hit
      if (hoverScale > 0 && finalPt.z > 0.05) {
        ctx.save();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(impX, groundImpY);
        ctx.lineTo(impX, impY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = "#ef4444";
      ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 3]);
      drawColliderFootprint(impX, impY);
      ctx.fill();
      ctx.stroke();

      // Red Impact X at center
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      const sz = Math.min(8, targetRadius * 0.55);
      ctx.beginPath();
      ctx.moveTo(impX - sz, impY - sz);
      ctx.lineTo(impX + sz, impY + sz);
      ctx.moveTo(impX + sz, impY - sz);
      ctx.lineTo(impX - sz, impY + sz);
      ctx.stroke();
      ctx.restore();
    } else if (traj.isLandingOnWallTop) {
      // Landing Target on Wall Top (Layer 2: semi-transparent, exact collider footprint size)
      const landX = traj.landPoint.x * ppu;
      const landZ = traj.landPoint.z ?? arena.wallHeight;
      const landY = (traj.landPoint.y - landZ * hoverScale) * ppu;
      const groundLandY = traj.landPoint.y * ppu;
      finalHitX = landX;
      finalGroundY = groundLandY;

      // Vertical altitude connector from ground up to elevated wall top
      if (hoverScale > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(landX, groundLandY);
        ctx.lineTo(landX, landY);
        ctx.stroke();
        ctx.restore();
      }

      // 1. Mask footprint fill to top of wall squares
      ctx.save();
      ctx.beginPath();
      for (const wall of arena.walls) {
        const baseX = wall.x * ppu;
        const topY = (wall.y - arena.wallHeight * hoverScale) * ppu;
        ctx.rect(baseX, topY, wall.width * ppu, wall.height * ppu);
      }
      ctx.clip();

      ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
      ctx.beginPath();
      drawColliderFootprint(landX, landY);
      ctx.fill();
      ctx.restore(); // restores clip

      // 2. Unmasked outline and central pinpoint
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      drawColliderFootprint(landX, landY);
      ctx.stroke();

      // Central pinpoint dot
      ctx.beginPath();
      ctx.arc(landX, landY, Math.min(4, targetRadius * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
      ctx.fill();
      ctx.restore();
    } else {
      // Landing Target on Ground (Layer 1: exact collider footprint size)
      const landX = traj.landPoint.x * ppu;
      const landY = traj.landPoint.y * ppu;
      finalHitX = landX;
      finalGroundY = landY;

      ctx.save();
      ctx.strokeStyle = "#22c55e";
      ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);
      drawColliderFootprint(landX, landY);
      ctx.fill();
      ctx.stroke();

      // Central pinpoint dot
      ctx.beginPath();
      ctx.arc(landX, landY, Math.min(4, targetRadius * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
      ctx.restore();
    }

    // 6. Aim Cursor & Sightline:
    // ALWAYS render a target reticle exactly where the cursor is on the screen!
    if (aimTarget) {
      const cursorX = aimTarget.x * ppu;
      const cursorY = aimTarget.y * ppu;
      const distToCursor = Math.hypot(aimTarget.x - traj.landPoint.x, aimTarget.y - traj.landPoint.y);

      // If cursor is beyond the clamped throw distance, draw a subtle dashed sightline from landing target to cursor
      if (distToCursor > 0.25) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(finalHitX, finalGroundY);
        ctx.lineTo(cursorX, cursorY);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.restore();
      }

      this.drawAimReticle(cursorX, cursorY, character?.playerColor, character ? `P${character.playerNumber}` : undefined);
    }

    ctx.restore();
  }

  /**
   * Draws a precision aim reticle / crosshair at the cursor position
   */
  public drawAimReticle(screenX: number, screenY: number, color = "#ffffff", label?: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 4;

    // Reticle circle
    const reticleRadius = 8;
    ctx.beginPath();
    ctx.arc(screenX, screenY, reticleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 4 Crosshair ticks extending outward
    const tickInner = reticleRadius + 2;
    const tickOuter = tickInner + 5;
    ctx.beginPath();
    // Top
    ctx.moveTo(screenX, screenY - tickInner);
    ctx.lineTo(screenX, screenY - tickOuter);
    // Bottom
    ctx.moveTo(screenX, screenY + tickInner);
    ctx.lineTo(screenX, screenY + tickOuter);
    // Left
    ctx.moveTo(screenX - tickInner, screenY);
    ctx.lineTo(screenX - tickOuter, screenY);
    // Right
    ctx.moveTo(screenX + tickInner, screenY);
    ctx.lineTo(screenX + tickOuter, screenY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Center pinpoint dot
    ctx.beginPath();
    ctx.arc(screenX, screenY, 2.0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Player label tag if provided (e.g. "P1", "P2")
    if (label) {
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
      ctx.shadowBlur = 3;
      ctx.fillText(label, screenX + 11, screenY - 5);
    }

    ctx.restore();
  }

  private drawHoverGizmo(entity: GameObject, ppu: number): void {
    const ctx = this.ctx;
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    const px = entity.position.x * ppu;
    const py = (entity.position.y - entity.position.z * hoverScale) * ppu;
    const visualRadius = entity.hasCollider ? entity.colliderRadius : (entity.colliderModule?.radius ?? 0.32);
    const scale = useBigger ? Renderer.getAltitudeScale(entity.position.z, 1.0) : 1.0;
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

  private drawSelectionGizmo(entity: GameObject, isEditMode: boolean, ppu: number): void {
    const ctx = this.ctx;
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    const px = entity.position.x * ppu;
    const py = (entity.position.y - entity.position.z * hoverScale) * ppu;
    const visualRadius = entity.hasCollider ? entity.colliderRadius : (entity.colliderModule?.radius ?? 0.32);
    const scale = useBigger ? Renderer.getAltitudeScale(entity.position.z, 1.0) : 1.0;
    const r = visualRadius * ppu * scale;
    const pad = r + 6;
    const bracketLen = Math.max(6, pad * 0.4);

    const color = isEditMode ? "#fbbf24" : "#38bdf8";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Corner brackets around entity
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(px - pad, py - pad + bracketLen);
    ctx.lineTo(px - pad, py - pad);
    ctx.lineTo(px - pad + bracketLen, py - pad);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(px + pad - bracketLen, py - pad);
    ctx.lineTo(px + pad, py - pad);
    ctx.lineTo(px + pad, py - pad + bracketLen);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(px + pad, py + pad - bracketLen);
    ctx.lineTo(px + pad, py + pad);
    ctx.lineTo(px + pad - bracketLen, py + pad);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(px - pad + bracketLen, py + pad);
    ctx.lineTo(px - pad, py + pad);
    ctx.lineTo(px - pad, py + pad - bracketLen);
    ctx.stroke();

    // Subtle tag above entity when in Edit Mode
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
