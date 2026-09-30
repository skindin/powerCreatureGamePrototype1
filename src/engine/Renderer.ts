import { Arena } from "./Arena.js";
import { GameObject, Vector2D } from "./GameObject.js";
import { Character } from "../character/Character.js";
import { GhostSnapshot } from "../network/RelayClient.js";
import { TrajectoryRenderer } from "./rendering/TrajectoryRenderer.js";
import type { CanvasViewport } from "../ui/InputManager.js";

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

export interface SplitScreenPlayerView {
  playerNumber: number;
  playerName: string;
  playerColor: string;
  isKeyboard: boolean;
  character: Character;
  activeAimCursor?: ActiveAimCursor | null;
}

export interface RollbackPathPoint {
  x: number;
  y: number;
  z: number;
  tick: number;
}

export interface RollbackVisualData {
  type: "desync_tackle" | "pure_replay";
  targetName: string;
  startTick: number;
  endTick: number;
  timestamp: number;
  durationMs: number;
  radius: number;
  originalPath: RollbackPathPoint[];
  reconciledPath: RollbackPathPoint[];
  impactPos?: { x: number; y: number; z: number };
  deltaPos: number;
}

export interface LiveBufferTrailData {
  enabled: boolean;
  points: RollbackPathPoint[];
  targetDepthTick: number;
  radius: number;
  entityName: string;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private trajectoryRenderer: TrajectoryRenderer;

  public viewSettings: ViewSettings = {
    verticalVisuals: "hover",
    visualAltitudeScale: 0.5,
  };
  public showCollisionDebug = false;
  public showGhostClones = true;
  public globalCollisionMode: "dynamic" | "discrete" | "continuous" | "naive" = "dynamic";
  public historyBufferStatus?: { count: number; capacity: number };
  public islandStats?: { totalIslands: number; activeIslands: number; sleepingCount: number; totalEntities: number };
  public rollbackDiagnostics: RollbackVisualData | null = null;
  public showBufferTrail = false;
  public liveBufferTrail: LiveBufferTrailData | null = null;
  public timeDilation: number = 1.0;
  public clockSyncStatus?: import("../server/ServerJitterBuffer.js").ClockSyncPacket | null;
  public reconciliationStatus?: {
    totalReconciliations: number;
    totalSuccesses: number;
    lastResult?: import("./physics/PredictionReconciliation.js").ReconciliationResult | null;
  } | null;


  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.trajectoryRenderer = new TrajectoryRenderer(ctx);
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
    const vx = entity.visualOffset ? entity.visualOffset.x : 0;
    const vy = entity.visualOffset ? entity.visualOffset.y : 0;
    return {
      x: entity.position.x - vx,
      y: entity.position.y - vy - entity.position.z * hoverScale,
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

    this.renderArenaScene(
      arena,
      characters,
      objects,
      ppu,
      selectedEntity,
      isEditMode,
      hoverEntity,
      targetGrabEntities,
      isWallEditor,
      hoverWallTile,
      ghostSnapshot,
      activeAimCursorsOrIsGamepad,
      legacyGamepadAimPos,
      isPaused
    );
  }

  /**
   * Phase 9: Side-by-Side Split Screen Renderer for Multi-Client Simulation Test
   * Renders an isolated client view for each local player simultaneously side-by-side on the canvas.
   * Both viewports render the Server Ghost Clones for real-time comparison.
   * Returns CanvasViewport[] for precise mouse coordinate transformation across any split screen index.
   */
  public renderSplitScreen(
    arena: Arena,
    playerViews: SplitScreenPlayerView[],
    objects: GameObject[],
    ghostSnapshot?: GhostSnapshot | null,
    remoteOverrides?: Map<string, { x: number; y: number; z: number; facingAngle?: number; isClimbing?: boolean }>,
    targetGrabEntities?: GameObject | null | Map<Character, GameObject | null> | Set<GameObject>,
    isEditMode = false,
    hoverEntity?: GameObject | null,
    selectedEntity?: GameObject | null
  ): CanvasViewport[] {
    const ctx = this.ctx;
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Deep slate background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const count = Math.max(2, playerViews.length);
    const vpW = canvasW / count;
    const vpH = canvasH;

    // Determine scale to fit arena in each viewport with comfortable padding
    const horizPadding = 24;
    const topMargin = 44; // Space for the client header badge
    const bottomMargin = 16;
    const availW = vpW - horizPadding;
    const availH = vpH - topMargin - bottomMargin;
    const scale = Math.min(availW / arena.width, availH / arena.height);

    const viewports: CanvasViewport[] = [];
    const allCharacters = playerViews.map((pv) => pv.character);

    for (let i = 0; i < playerViews.length; i++) {
      const pv = playerViews[i];
      const vpX = i * vpW;
      const vpY = 0;

      const arenaPxW = arena.width * scale;
      const arenaPxH = arena.height * scale;
      const offsetX = vpX + (vpW - arenaPxW) / 2;
      const offsetY = topMargin + (availH - arenaPxH) / 2;

      viewports.push({
        x: vpX,
        y: vpY,
        width: vpW,
        height: vpH,
        scale,
        offsetX,
        offsetY,
      });

      // 1. Clip and Render Arena
      ctx.save();
      ctx.beginPath();
      ctx.rect(vpX, vpY, vpW, vpH);
      ctx.clip();

      // Subtle viewport background scrim
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
      ctx.fillRect(vpX, vpY, vpW, vpH);

      // Translate context to center the arena within this split view
      ctx.translate(offsetX, offsetY);

      // Only pass aim cursor relevant for this client view
      const activeAimCursors: ActiveAimCursor[] = pv.activeAimCursor ? [pv.activeAimCursor] : [];

      this.renderArenaScene(
        arena,
        allCharacters,
        objects,
        scale,
        selectedEntity,
        isEditMode,
        hoverEntity,
        targetGrabEntities,
        false,
        null,
        ghostSnapshot,
        activeAimCursors,
        null,
        false,
        pv.character,
        remoteOverrides
      );

      ctx.restore();

      // 2. Viewport Header Overlay
      ctx.save();
      const badgeW = vpW - 24;
      const badgeH = 28;
      const badgeX = vpX + 12;
      const badgeY = 8;

      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      ctx.strokeStyle = `${pv.playerColor}88`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Left Title: Icon + CLIENT 1 / 2 + Name
      const icon = pv.isKeyboard ? "⌨️" : "🎮";
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = pv.playerColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${icon} CLIENT ${pv.playerNumber}: ${pv.playerName} View`, badgeX + 10, badgeY + badgeH / 2);

      // Right Pill: Telemetry Status
      ctx.font = "9px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "right";
      const latencyStr = ghostSnapshot ? `${Math.round(ghostSnapshot.rttMs)}ms` : "--ms";
      ctx.fillText(`0ms Prediction • Server RTT: ${latencyStr}`, badgeX + badgeW - 10, badgeY + badgeH / 2);

      ctx.restore();
    }

    // 3. Central Vertical Divider Line between viewports
    ctx.save();
    for (let i = 1; i < count; i++) {
      const divX = i * vpW;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(divX, 0);
      ctx.lineTo(divX, canvasH);
      ctx.stroke();

      // Small central badge at bottom
      const cBadgeW = 140;
      const cBadgeH = 20;
      const cBadgeX = divX - cBadgeW / 2;
      const cBadgeY = canvasH - 26;

      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.beginPath();
      ctx.roundRect(cBadgeX, cBadgeY, cBadgeW, cBadgeH, 999);
      ctx.fill();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚡ DUAL CLIENT SIMS", divX, cBadgeY + cBadgeH / 2);
    }
    ctx.restore();

    return viewports;
  }

  /**
   * Internal common scene renderer. Renders the arena, entities, shadows, walls, aim trajectories, and ghosts.
   */
  public renderArenaScene(
    arena: Arena,
    characters: Character[],
    objects: GameObject[],
    ppu: number,
    selectedEntity?: GameObject | null,
    isEditMode = false,
    hoverEntity?: GameObject | null,
    targetGrabEntities?: GameObject | null | Map<Character, GameObject | null> | Set<GameObject>,
    isWallEditor = false,
    hoverWallTile?: { col: number; row: number } | null,
    ghostSnapshot?: GhostSnapshot | null,
    activeAimCursorsOrIsGamepad: boolean | ActiveAimCursor[] = false,
    legacyGamepadAimPos?: Vector2D | null,
    isPaused = false,
    localHeroCharacter?: Character | null,
    remoteOverrides?: Map<string, { x: number; y: number; z: number; facingAngle?: number; isClimbing?: boolean }>
  ): void {
    const ctx = this.ctx;
    const character = localHeroCharacter || characters[0] || null;

    // Apply remote player state overrides if present, saving original transforms
    const savedTransforms: { char: Character; x: number; y: number; z: number; angle: number; climb: boolean }[] = [];
    if (remoteOverrides) {
      for (const char of characters) {
        if (localHeroCharacter && char === localHeroCharacter) continue;
        const ovr = remoteOverrides.get(char.playerId);
        if (ovr) {
          savedTransforms.push({
            char,
            x: char.position.x,
            y: char.position.y,
            z: char.position.z,
            angle: char.facingAngle,
            climb: char.isClimbing,
          });
          char.position.x = ovr.x;
          char.position.y = ovr.y;
          char.position.z = ovr.z;
          if (ovr.facingAngle !== undefined) char.facingAngle = ovr.facingAngle;
          if (ovr.isClimbing !== undefined) char.isClimbing = ovr.isClimbing;
        }
      }
    }

    try {
      // 1. Floor Grid / Surface in Units
      this.drawFloorGrid(arena, ppu);

      // 2. Entities sorting
      const allRenderables = [...characters, ...objects];

      // Phase 8: Decay visual smoothing offset dampeners smoothly toward zero (0.70x / frame)
      for (const entity of allRenderables) {
        entity.decayVisualOffset(0.70);
      }

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
          this.drawCharacter(entity, characters, ppu, arena, targetGrabEntities, localHeroCharacter);
        } else {
          this.drawFreebodyObject(entity, characters, ppu, targetGrabEntities, arena, localHeroCharacter);
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
          this.drawCharacter(entity, characters, ppu, arena, targetGrabEntities, localHeroCharacter);
        } else {
          this.drawFreebodyObject(entity, characters, ppu, targetGrabEntities, arena, localHeroCharacter);
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

      // 10. Trajectory Lines and Aim Cursors
      // First: render active trajectories for any character holding an object
      for (const char of characters) {
        if (char.activeTrajectory) {
          // Is this character's cursor currently unhidden and visible?
          const cursor = Array.isArray(activeAimCursorsOrIsGamepad)
            ? activeAimCursorsOrIsGamepad.find((c) => c.character === char)
            : null;
          const cursorTarget = cursor ? { x: cursor.x, y: cursor.y } : null;
          this.trajectoryRenderer.drawTrajectory(char.activeTrajectory, ppu, arena, this.viewSettings, cursorTarget, char);
        }
      }

      // Second: render aim cursors (only for unhidden cursors)
      if (Array.isArray(activeAimCursorsOrIsGamepad)) {
        for (const cursor of activeAimCursorsOrIsGamepad) {
          const cChar = cursor.character;
          const cursorX = cursor.x * ppu;
          const cursorY = cursor.y * ppu;

          // Draw precision aim reticle if character is not holding an object (when holding, drawTrajectory already drew it with cursorTarget)
          if (!cChar.activeTrajectory) {
            this.trajectoryRenderer.drawAimReticle(cursorX, cursorY, cursor.color);
          }
        }
      } else {
        // Legacy singleplayer fallback
        const isUsingGamepad = activeAimCursorsOrIsGamepad;
        if (character) {
          const activeAimCursor = character.aimTarget || (isUsingGamepad ? legacyGamepadAimPos : null);
          if (character.activeTrajectory) {
            this.trajectoryRenderer.drawTrajectory(character.activeTrajectory, ppu, arena, this.viewSettings, activeAimCursor, character);
          } else if (isUsingGamepad && activeAimCursor) {
            this.trajectoryRenderer.drawAimReticle(activeAimCursor.x * ppu, activeAimCursor.y * ppu, character.playerColor);
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
      if (this.showGhostClones && ghostSnapshot) {
        this.drawGhostClones(ghostSnapshot, ppu, arena);
      }

      // 12. Player Name Tags — drawn LAST so they are always above walls, entities, and everything else
      for (const char of characters) {
        const isRemote = Boolean(char !== localHeroCharacter && remoteOverrides?.has(char.playerId));
        this.drawCharacterNameTag(char, arena, ppu, isRemote);
      }

      // 12b. Collision Mode & Contact Diagnostics Overlay
      if (this.showCollisionDebug) {
        this.drawCollisionDebug(allRenderables, ppu);
      }

      // 12c. Rollback & Reconciliation Ghost Trails
      this.drawRollbackDiagnostics(ppu);

      // 12d. Live State History Buffer Continuous Trail & Target Marker
      this.drawLiveBufferTrail(ppu);

      // 13. Simulation Paused Overlay (when all players are removed)
      if (isPaused) {
        this.drawPausedOverlay(ctx);
      }
    } finally {
      // Deterministically restore original character transforms
      for (const st of savedTransforms) {
        st.char.position.x = st.x;
        st.char.position.y = st.y;
        st.char.position.z = st.z;
        st.char.facingAngle = st.angle;
        st.char.isClimbing = st.climb;
      }
    }
  }

  /**
   * Renders visual indicators for continuous swept trajectories, contact points, normal arrows, and solver diagnostics.
   */
  private drawCollisionDebug(entities: GameObject[], ppu: number): void {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.save();

    let ccdActiveCount = 0;
    let mostRecentContact: {
      type: "continuous_swept" | "discrete_toi" | "naive";
      elapsed: number;
      name: string;
    } | null = null;

    for (const entity of entities) {
      if (!entity.hasCollider) continue;
      if (entity.isSweptActive) ccdActiveCount++;

      const r = entity.colliderRadius * ppu;
      const sx = entity.position.x * ppu;
      const sy = (entity.position.y - entity.position.z * this.getHoverScale()) * ppu;
      const speed = Math.hypot(entity.velocity.x, entity.velocity.y);

      // Track most recent contact for the corner HUD
      if (entity.lastCollisionTime > 0 && now - entity.lastCollisionTime < 1200 && entity.lastCollisionType !== "none") {
        const elapsed = now - entity.lastCollisionTime;
        if (!mostRecentContact || elapsed < mostRecentContact.elapsed) {
          mostRecentContact = {
            type: entity.lastCollisionType,
            elapsed,
            name: entity.name || "Entity",
          };
        }
      }

      // 1. Continuous Swept CCD Visuals
      if (entity.isSweptActive) {
        // Glowing cyan aura ring around collider
        ctx.strokeStyle = "rgba(6, 182, 212, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Mini [CCD] floating badge above entity
        const badgeY = sy - r - 10;
        ctx.font = "bold 9px Inter, system-ui, sans-serif";
        const badgeW = 26;
        const badgeH = 13;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(sx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#06b6d4";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("CCD", sx, badgeY + 0.5);

        // Forward Swept Volume (Capsule) when moving
        if (speed > 0.05) {
          // Lookahead ticks: minimum 3 ticks (50ms) to extend clearly past the collider circle
          const lookaheadTicks = Math.max(3.0, Math.min(8.0, 36 / Math.max(1, (speed * ppu) / 60)));
          const forwardDx = entity.velocity.x * (lookaheadTicks / 60) * ppu;
          const forwardDy = entity.velocity.y * (lookaheadTicks / 60) * ppu;
          const forwardDist = Math.hypot(forwardDx, forwardDy);

          if (forwardDist > 1) {
            const ux = forwardDx / forwardDist;
            const uy = forwardDy / forwardDist;
            const nx = -uy;
            const ny = ux;

            // Semi-transparent swept volume fill
            ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
            ctx.beginPath();
            ctx.arc(sx, sy, r, Math.atan2(ny, nx) + Math.PI / 2, Math.atan2(ny, nx) + (3 * Math.PI) / 2, false);
            ctx.lineTo(sx + forwardDx + nx * r, sy + forwardDy + ny * r);
            ctx.arc(sx + forwardDx, sy + forwardDy, r, Math.atan2(ny, nx) - Math.PI / 2, Math.atan2(ny, nx) + Math.PI / 2, false);
            ctx.lineTo(sx - nx * r, sy - ny * r);
            ctx.closePath();
            ctx.fill();

            // Side rails
            ctx.strokeStyle = "rgba(6, 182, 212, 0.65)";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(sx + nx * r, sy + ny * r);
            ctx.lineTo(sx + forwardDx + nx * r, sy + forwardDy + ny * r);
            ctx.moveTo(sx - nx * r, sy - ny * r);
            ctx.lineTo(sx + forwardDx - nx * r, sy + forwardDy - ny * r);
            ctx.stroke();
            ctx.setLineDash([]);

            // Leading cap outline
            ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx + forwardDx, sy + forwardDy, r, 0, Math.PI * 2);
            ctx.stroke();

            // Center trajectory ray
            ctx.strokeStyle = "rgba(6, 182, 212, 0.9)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + forwardDx, sy + forwardDy);
            ctx.stroke();

            // Trajectory arrowhead
            const headLen = 6;
            ctx.fillStyle = "#06b6d4";
            ctx.beginPath();
            ctx.moveTo(sx + forwardDx, sy + forwardDy);
            ctx.lineTo(
              sx + forwardDx - headLen * ux + headLen * 0.45 * nx,
              sy + forwardDy - headLen * uy + headLen * 0.45 * ny
            );
            ctx.lineTo(
              sx + forwardDx - headLen * ux - headLen * 0.45 * nx,
              sy + forwardDy - headLen * uy - headLen * 0.45 * ny
            );
            ctx.closePath();
            ctx.fill();
          }
        }
      } else {
        // 2. Discrete TOI Visuals
        // Subtle emerald aura ring
        ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 2.5, 0, Math.PI * 2);
        ctx.stroke();

        // Mini [TOI] floating badge above entity
        const badgeY = sy - r - 10;
        ctx.font = "bold 9px Inter, system-ui, sans-serif";
        const badgeW = 24;
        const badgeH = 13;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(sx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#10b981";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TOI", sx, badgeY + 0.5);

        // Discrete step velocity trail
        if (speed > 0.1) {
          const stepDx = entity.velocity.x * (1 / 60) * ppu;
          const stepDy = entity.velocity.y * (1 / 60) * ppu;
          ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + stepDx * 3, sy + stepDy * 3);
          ctx.stroke();
        }
      }

      // 3. Contact Point & Normal Visuals with Smooth 1.2s Decay
      if (entity.lastContactPoint && entity.lastCollisionType !== "none" && now - entity.lastCollisionTime < 1200) {
        const elapsed = now - entity.lastCollisionTime;
        const decay = Math.max(0, 1 - elapsed / 1200);
        const isCCD = entity.lastCollisionType === "continuous_swept";
        const isNaive = entity.lastCollisionType === "naive";
        const mainColor = isCCD ? "#06b6d4" : (isNaive ? "#f59e0b" : "#10b981");
        const mainColorRgba = isCCD ? "6, 182, 212" : (isNaive ? "245, 158, 11" : "16, 185, 129");

        const px = entity.lastContactPoint.x * ppu;
        const py = entity.lastContactPoint.y * ppu;

        // Expanding shockwave ripple ring
        const rippleRadius = 4 + 20 * (1 - decay);
        ctx.strokeStyle = `rgba(${mainColorRgba}, ${decay * 0.8})`;
        ctx.lineWidth = Math.max(1, 2.5 * decay);
        ctx.beginPath();
        ctx.arc(px, py, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing contact pip
        const pipRadius = 3 + 2.5 * decay;
        ctx.shadowColor = mainColor;
        ctx.shadowBlur = 8 * decay;
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(px, py, pipRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Contact normal arrow with sharp arrowhead
        if (entity.lastContactNormal) {
          const arrowLen = 30 * Math.min(1, decay * 1.5);
          const nx = entity.lastContactNormal.x;
          const ny = entity.lastContactNormal.y;
          const tipX = px + nx * arrowLen;
          const tipY = py + ny * arrowLen;

          ctx.strokeStyle = `rgba(${mainColorRgba}, ${Math.min(1, decay * 1.3)})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          // Triangular arrowhead
          const hLen = 7;
          const perpX = -ny;
          const perpY = nx;
          ctx.fillStyle = mainColor;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(
            tipX - hLen * nx + hLen * 0.45 * perpX,
            tipY - hLen * ny + hLen * 0.45 * perpY
          );
          ctx.lineTo(
            tipX - hLen * nx - hLen * 0.45 * perpX,
            tipY - hLen * ny - hLen * 0.45 * perpY
          );
          ctx.closePath();
          ctx.fill();
        }

        // Floating impact banner
        const bannerText = isCCD ? "⚡ CCD IMPACT" : (isNaive ? "⚡ NAIVE PUSH" : "⚡ TOI CONTACT");
        ctx.font = "bold 9.5px Inter, system-ui, sans-serif";
        const textWidth = ctx.measureText(bannerText).width;
        const bannerW = textWidth + 12;
        const bannerH = 16;
        const bannerX = px;
        const bannerY = py - 18 - 8 * (1 - decay);

        ctx.fillStyle = `rgba(15, 23, 42, ${0.9 * decay})`;
        ctx.beginPath();
        ctx.roundRect(bannerX - bannerW / 2, bannerY - bannerH / 2, bannerW, bannerH, 4);
        ctx.fill();
        ctx.strokeStyle = `rgba(${mainColorRgba}, ${decay})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = `rgba(${mainColorRgba}, ${decay})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bannerText, bannerX, bannerY);

        // Body impact flash ring
        ctx.strokeStyle = `rgba(${mainColorRgba}, ${decay * 0.65})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 2 + 5 * (1 - decay), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Canvas Bottom-Right Collision Diagnostics HUD
    const hasBuffer = !!this.historyBufferStatus;
    const hasIslands = !!this.islandStats;
    const hasClockSync = !!this.clockSyncStatus;
    const cardW = 208;
    const cardH = (hasBuffer ? 82 : 68) + (hasIslands ? 14 : 0) + (hasClockSync ? 14 : 0);
    const cardX = ctx.canvas.width - cardW - 16;
    const cardY = ctx.canvas.height - cardH - 16;

    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // HUD Header with status pip
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(cardX + 12, cardY + 14, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 9.5px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("COLLISION DIAGNOSTICS", cardX + 22, cardY + 14);

    // Global Mode line
    const modeUpper = String(this.globalCollisionMode).toUpperCase();
    ctx.font = "9px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Solver Mode:", cardX + 12, cardY + 31);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 9px Inter, system-ui, sans-serif";
    ctx.fillText(modeUpper === "DYNAMIC" ? "DYNAMIC ADAPTIVE" : modeUpper, cardX + 78, cardY + 31);

    // Sweeping CCD & Recent Impact
    ctx.font = "9px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("CCD Active:", cardX + 12, cardY + 45);
    ctx.fillStyle = ccdActiveCount > 0 ? "#06b6d4" : "#94a3b8";
    ctx.font = "bold 9px Inter, system-ui, sans-serif";
    ctx.fillText(`${ccdActiveCount} sweeping`, cardX + 78, cardY + 45);

    // Phase 3: Active Islands & Sleeping Freebodies
    if (this.islandStats) {
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("Islands/Sleep:", cardX + 12, cardY + 58);
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillText(`${this.islandStats.activeIslands} active, ${this.islandStats.sleepingCount} asleep`, cardX + 78, cardY + 58);
    }

    const impactLineY = hasIslands ? cardY + 71 : cardY + 58;
    ctx.font = "9px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Last Impact:", cardX + 12, impactLineY);
    if (mostRecentContact) {
      const typeLabel = mostRecentContact.type === "continuous_swept" ? "CCD" : (mostRecentContact.type === "naive" ? "NAIVE" : "TOI");
      const typeColor = mostRecentContact.type === "continuous_swept" ? "#06b6d4" : (mostRecentContact.type === "naive" ? "#f59e0b" : "#10b981");
      ctx.fillStyle = typeColor;
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillText(`${typeLabel} (${(mostRecentContact.elapsed / 1000).toFixed(1)}s ago)`, cardX + 78, impactLineY);
    } else {
      ctx.fillStyle = "#64748b";
      ctx.fillText("None (ready)", cardX + 78, impactLineY);
    }

    // State History Buffer status
    if (this.historyBufferStatus) {
      const bufferLineY = hasIslands ? cardY + 84 : cardY + 71;
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("State Buffer:", cardX + 12, bufferLineY);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      const secs = (this.historyBufferStatus.count / 60).toFixed(1);
      ctx.fillText(`${this.historyBufferStatus.count}/${this.historyBufferStatus.capacity} (${secs}s)`, cardX + 78, bufferLineY);
    }

    // Phase 6 Cruise Control Time Dilation status
    if (this.clockSyncStatus) {
      let clockLineY = cardY + 71;
      if (hasIslands) clockLineY += 13;
      if (hasBuffer) clockLineY += 13;
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("Cruise Control:", cardX + 12, clockLineY);
      const factor = this.clockSyncStatus.dilationFactor;
      const factorColor = factor > 1.001 ? "#38bdf8" : (factor < 0.999 ? "#f59e0b" : "#10b981");
      ctx.fillStyle = factorColor;
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillText(`${factor.toFixed(3)}x (${this.clockSyncStatus.currentQueueDepth}f)`, cardX + 78, clockLineY);
    }

    ctx.restore();
  }

  /**
   * Renders the ghost trajectories showing the past prediction vs. the reconciled simulation timeline.
   */
  private drawRollbackDiagnostics(ppu: number): void {
    const diag = this.rollbackDiagnostics;
    if (!diag) return;

    const now = performance.now();
    const elapsed = now - diag.timestamp;
    if (elapsed > diag.durationMs) {
      this.rollbackDiagnostics = null;
      return;
    }

    const decay = 1.0 - (elapsed / diag.durationMs);
    const alpha = Math.max(0, Math.min(1, decay * 1.25));
    const ctx = this.ctx;
    const hoverScale = this.getHoverScale();

    ctx.save();

    const toScreen = (pt: { x: number; y: number; z: number }) => ({
      x: pt.x * ppu,
      y: (pt.y - pt.z * hoverScale) * ppu,
    });

    // 1. Draw Original Prediction Path (Faded Red/Amber)
    if (diag.type === "desync_tackle" && diag.originalPath.length > 1) {
      ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.75})`;
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < diag.originalPath.length; i++) {
        const pt = toScreen(diag.originalPath[i]);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Waypoint pips along the old path
      ctx.fillStyle = `rgba(244, 63, 94, ${alpha * 0.6})`;
      for (let i = 0; i < diag.originalPath.length; i += 4) {
        const pt = toScreen(diag.originalPath[i]);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Old present ghost ring
      const oldEnd = toScreen(diag.originalPath[diag.originalPath.length - 1]);
      ctx.strokeStyle = `rgba(244, 63, 94, ${alpha * 0.85})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(oldEnd.x, oldEnd.y, Math.max(8, diag.radius * ppu), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pill badge above old end
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillStyle = `rgba(244, 63, 94, ${alpha * 0.9})`;
      ctx.textAlign = "center";
      ctx.fillText("Old Predicted Path", oldEnd.x, oldEnd.y - Math.max(8, diag.radius * ppu) - 8);
    }

    // 2. If Past Tackle: Draw Impact marker at startTick
    if (diag.impactPos) {
      const imp = toScreen(diag.impactPos);

      // Expanding yellow pulse ring
      const pulseSize = 6 + 14 * (1 - decay);
      ctx.strokeStyle = `rgba(251, 191, 36, ${alpha * 0.85})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, pulseSize, 0, Math.PI * 2);
      ctx.stroke();

      // Impact center star / pip
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Floating impact badge
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
      ctx.textAlign = "center";
      ctx.fillText(`⚡ PAST TACKLE (Tick #${diag.startTick})`, imp.x, imp.y - 12);
    }

    // 3. Draw New Reconciled Path (Vibrant Emerald / Cyan)
    if (diag.reconciledPath.length > 1) {
      const mainRgb = diag.type === "pure_replay" ? "6, 182, 212" : "16, 185, 129";
      ctx.strokeStyle = `rgba(${mainRgb}, ${alpha * 0.95})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < diag.reconciledPath.length; i++) {
        const pt = toScreen(diag.reconciledPath[i]);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Waypoint pips along the re-simulated path
      ctx.fillStyle = `rgba(${mainRgb}, ${alpha * 0.9})`;
      for (let i = 0; i < diag.reconciledPath.length; i += 4) {
        const pt = toScreen(diag.reconciledPath[i]);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reconciled present ring
      const newEnd = toScreen(diag.reconciledPath[diag.reconciledPath.length - 1]);
      ctx.strokeStyle = `rgba(${mainRgb}, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(newEnd.x, newEnd.y, Math.max(8, diag.radius * ppu), 0, Math.PI * 2);
      ctx.stroke();

      // Present badge
      const badgeText = diag.type === "pure_replay"
        ? `✅ DETERMINISTIC REPLAY (${diag.endTick - diag.startTick} ticks, 0.0000u drift)`
        : `✅ Reconciled Position (Δ ${diag.deltaPos.toFixed(2)}u)`;
      ctx.font = "bold 9.5px Inter, system-ui, sans-serif";
      ctx.fillStyle = `rgba(${mainRgb}, ${alpha})`;
      ctx.textAlign = "center";
      ctx.fillText(badgeText, newEnd.x, newEnd.y + Math.max(8, diag.radius * ppu) + 14);
    }

    ctx.restore();
  }

  /**
   * Renders the connected historical trajectory of the entity sitting in the live buffer.
   * Shows all buffered points connected together, with a prominent target pin at (T - depth).
   */
  private drawLiveBufferTrail(ppu: number): void {
    if (!this.showBufferTrail || !this.liveBufferTrail) return;
    const { points, targetDepthTick, radius } = this.liveBufferTrail;
    if (points.length < 2) return;

    const ctx = this.ctx;
    const hoverScale = this.getHoverScale();
    const toScreen = (pt: { x: number; y: number; z: number }) => ({
      x: pt.x * ppu,
      y: (pt.y - pt.z * hoverScale) * ppu,
    });

    ctx.save();

    // 1. Draw glowing connected ribbon through all buffered frames
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fading gradient: oldest frames are more translucent, newest are brighter
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = toScreen(points[i]);
      const p1 = toScreen(points[i + 1]);
      const progress = i / (points.length - 1); // 0 (oldest) -> 1 (newest)
      const alpha = 0.22 + 0.65 * progress;

      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    // 2. Waypoint pips every 5 frames along the buffer ribbon
    for (let i = 0; i < points.length; i += 5) {
      const pt = toScreen(points[i]);
      const progress = i / (points.length - 1);
      ctx.fillStyle = `rgba(56, 189, 248, ${0.35 + 0.55 * progress})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Highlight the exact Rollback / Desync Target Frame (Tick T - depth)
    let targetPt = points.find((p) => p.tick === targetDepthTick);
    if (!targetPt && points.length > 0) {
      let minDiff = Infinity;
      for (const p of points) {
        const diff = Math.abs(p.tick - targetDepthTick);
        if (diff < minDiff) {
          minDiff = diff;
          targetPt = p;
        }
      }
    }

    if (targetPt) {
      const tp = toScreen(targetPt);

      // Clean, static target indicator ring (no pulsing shrink/grow, no crosshairs)
      const targetRadius = Math.max(8, radius * ppu);

      // Soft amber ground glow
      ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, targetRadius, 0, Math.PI * 2);
      ctx.fill();

      // Clean solid amber ring
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, targetRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Floating Pin Badge: "📍 PAST TARGET (Tick #T-N)"
      const badgeY = tp.y - targetRadius - 13;
      const badgeText = `📍 PAST TARGET (Tick #${targetPt.tick})`;
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(badgeText).width;

      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.beginPath();
      ctx.roundRect(tp.x - tw / 2 - 6, badgeY - 7, tw + 12, 16, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, tp.x, badgeY + 1);
    }

    // 4. Oldest Point in Buffer Marker
    if (points.length > 5) {
      const op = toScreen(points[0]);
      ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
      ctx.beginPath();
      ctx.arc(op.x, op.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "8px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(`Buffer Oldest (T#${points[0].tick})`, op.x, op.y + 11);
    }

    ctx.restore();
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

    // 1. Draw Ghost Characters (supports multiple server avatars simultaneously)
    const ghostChars = (ghostSnapshot.characters && ghostSnapshot.characters.length > 0)
      ? ghostSnapshot.characters
      : (ghostSnapshot.character ? [ghostSnapshot.character] : []);

    for (const gChar of ghostChars) {
      const charScale = useBigger ? Renderer.getAltitudeScale(gChar.z, arena.wallHeight) : 1.0;
      const px = gChar.x * ppu;
      const py = (gChar.y - gChar.z * hoverScale) * ppu;
      const r = gChar.radius * ppu * charScale;
      const ghostColor = gChar.color || "#38bdf8";

      // Ghost ground shadow (drawn when elevated above ground level)
      if (gChar.z > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(gChar.x * ppu, gChar.y * ppu, gChar.radius * ppu, 0, Math.PI * 2);
        if (useHover && hoverScale > 0) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
          ctx.fill();
        }
        ctx.strokeStyle = `${ghostColor}88`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();

        // Second dotted outline at wall elevation (when bigger sprites is active and z > wallHeight)
        if (useBigger && gChar.z > arena.wallHeight + 0.01) {
          const wallAltScale = Renderer.getAltitudeScale(arena.wallHeight, arena.wallHeight);
          ctx.beginPath();
          ctx.arc(gChar.x * ppu, gChar.y * ppu, gChar.radius * ppu * wallAltScale, 0, Math.PI * 2);
          ctx.strokeStyle = `${ghostColor}55`;
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
      ctx.fillStyle = ghostColor;
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
      const nameTag = gChar.name ? `${gChar.name} ` : "";
      const badgePrefix = ghostSnapshot.source === "physics_sim" ? "🤖 SERVER" : "👻 ECHO";
      ctx.fillText(`${badgePrefix} ${nameTag}(${Math.round(ghostSnapshot.rttMs)}ms)`, px, py - r - 6);
      ctx.restore();
    }

    // 2. Draw Ghost Objects
    if (ghostSnapshot.objects) {
      for (const obj of ghostSnapshot.objects) {
        let objX = obj.x;
        let objY = obj.y;
        let objZ = obj.z;
        if (obj.isHeld && obj.heldBy) {
          const gHolder = ghostSnapshot.characters?.find((c) => c.id === obj.heldBy) || (ghostSnapshot.character?.id === obj.heldBy ? ghostSnapshot.character : null);
          if (gHolder) {
            const handDist = (gHolder.radius || 0.44) + (obj.radius || 0.3) * 0.5 + 0.08;
            const fAngle = gHolder.facingAngle ?? 0;
            objX = gHolder.x + Math.cos(fAngle) * handDist;
            objY = gHolder.y + Math.sin(fAngle) * handDist;
            objZ = gHolder.z + 0.45;
          }
        }
        const altScale = useBigger ? Renderer.getAltitudeScale(objZ, arena.wallHeight) : 1.0;
        const px = objX * ppu;
        const py = (objY - objZ * hoverScale) * ppu;
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
    const holder = (obj.heldBy instanceof Character ? obj.heldBy : null) || (obj as any).holder;
    let posX = obj.position.x;
    let posY = obj.position.y;
    let posZ = obj.position.z;
    if (obj.isHeld && holder) {
      const relPos = holder.calculateHeldObjectPosition(_arena);
      posX = relPos.x;
      posY = relPos.y;
      posZ = relPos.z;
    }
    const z = posZ;
    if (z <= 0.01) return;

    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    if (!useHover || hoverScale <= 0) return;

    const ctx = this.ctx;
    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;
    const groundX = (posX - vx) * ppu;
    const groundY = (posY - vy) * ppu;
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
    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;
    const groundX = (obj.position.x - vx) * ppu;
    const wallTopScreenY = (obj.position.y - vy - arena.wallHeight * hoverScale) * ppu;
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
    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;
    const groundX = (obj.position.x - vx) * ppu;
    const outlineY = isAboveWall
      ? (obj.position.y - vy - arena.wallHeight * hoverScale) * ppu
      : (obj.position.y - vy) * ppu;
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
  private drawCharacterNameTag(char: Character, arena: Arena, ppu: number, isRemote: boolean = false): void {
    const ctx = this.ctx;
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const altitudeScale = useBigger ? Renderer.getAltitudeScale(char.position.z, arena.wallHeight) : 1.0;

    const vx = char.visualOffset ? char.visualOffset.x : 0;
    const vy = char.visualOffset ? char.visualOffset.y : 0;
    const x = (char.position.x - vx) * ppu;
    const y = (char.position.y - vy - char.position.z * hoverScale) * ppu;
    const r = char.colliderRadius * ppu * altitudeScale;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (char.playerId) {
      const badgeText = isRemote ? `P${char.playerNumber} [REMOTE]` : `P${char.playerNumber}`;
      ctx.font = isRemote ? "bold 9px monospace" : "bold 11px monospace";
      const textWidth = ctx.measureText(badgeText).width;
      const pillW = textWidth + 8;
      const pillH = isRemote ? 13 : 14;
      const pillX = x - pillW / 2;
      const pillY = y - r - 15;

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
   * Freebody Object: Pure top-down at (x, y) with fixed physical radius (no scale expansion).
   * Supports both box and circle visual shapes (both using circle colliders).
   * Highlights objects within any player character's pickup reach.
   */
  private drawFreebodyObject(
    obj: GameObject,
    allCharacters: Character[],
    ppu: number,
    targetGrabEntities: GameObject | null | Map<Character, GameObject | null> | Set<GameObject> | undefined,
    arena: Arena,
    localHeroCharacter?: Character | null
  ): void {
    const ctx = this.ctx;
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    const vx = obj.visualOffset ? obj.visualOffset.x : 0;
    const vy = obj.visualOffset ? obj.visualOffset.y : 0;

    // If held by a character, render relative to holder's hands
    const holder = (obj.heldBy instanceof Character ? obj.heldBy : null) || allCharacters.find((c) => c.heldObject === obj);
    let posX = obj.position.x;
    let posY = obj.position.y;
    let posZ = obj.position.z;
    if ((obj.isHeld || holder) && holder) {
      const relPos = holder.calculateHeldObjectPosition(arena);
      posX = relPos.x;
      posY = relPos.y;
      posZ = relPos.z;
    }

    const x = (posX - vx) * ppu;
    const y = (posY - vy - posZ * hoverScale) * ppu;
    const altitudeScale = useBigger ? Renderer.getAltitudeScale(posZ, arena.wallHeight) : 1.0;
    const visualRadius = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
    const realRadius = visualRadius * ppu;
    const renderRadius = realRadius * altitudeScale;

    // In split-screen / isolated client views, only evaluate pickup reach for the local client player
    const eligibleCharacters = localHeroCharacter
      ? allCharacters.filter((c) => c === localHeroCharacter)
      : allCharacters;

    // Check if close enough for eligible player character to pick up, strictly respecting layer-dependent reach.
    const charactersInReach = eligibleCharacters.filter(
      (c) =>
        !c.isHeld &&
        c.heldObject !== obj &&
        c.pickupModule !== null &&
        c.pickupModule.enabled &&
        !obj.isHeld &&
        (c.pickupModule?.isObjectInReach(c, obj, arena.wallHeight) ?? false)
    );

    // Determine which players are currently targeting this object
    const targetingChars: Character[] = [];
    if (targetGrabEntities instanceof Map) {
      for (const [char, target] of targetGrabEntities.entries()) {
        if (localHeroCharacter && char !== localHeroCharacter) continue;
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
    const isWithinPickupRange = charactersInReach.length > 0 || isTargetGrab;

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
        const reachColor = (charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)
          ? `${(charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)}99`
          : "rgba(56, 189, 248, 0.45)";
        ctx.strokeStyle = reachColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Phase 3: Visual indicator for sleeping freebodies
    if (obj.isSleeping && !isWithinPickupRange && !obj.isHeld) {
      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("zzz", x + renderRadius * 0.7, y - renderRadius * 0.7);
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
    targetGrabEntities?: GameObject | null | Map<Character, GameObject | null> | Set<GameObject>,
    localHeroCharacter?: Character | null
  ): void {
    const ctx = this.ctx;
    const useBigger = this.viewSettings.verticalVisuals === "bigger" || this.viewSettings.verticalVisuals === "both";
    const useHover = this.viewSettings.verticalVisuals === "hover" || this.viewSettings.verticalVisuals === "both";
    const hoverScale = useHover ? this.viewSettings.visualAltitudeScale : 0;

    const vx = char.visualOffset ? char.visualOffset.x : 0;
    const vy = char.visualOffset ? char.visualOffset.y : 0;
    const x = (char.position.x - vx) * ppu;
    const y = (char.position.y - vy - char.position.z * hoverScale) * ppu;
    const altitudeScale = useBigger ? Renderer.getAltitudeScale(char.position.z, arena.wallHeight) : 1.0;
    const r = char.colliderRadius * ppu * altitudeScale;

    // Check if eligible character can grab this character
    const eligibleCharacters = localHeroCharacter
      ? allCharacters.filter((c) => c === localHeroCharacter)
      : allCharacters;

    const charactersInReach = eligibleCharacters.filter(
      (c) =>
        c !== char &&
        !c.isHeld &&
        c.heldObject !== char &&
        c.pickupModule !== null &&
        c.pickupModule.enabled &&
        !char.isHeld &&
        (c.pickupModule?.isObjectInReach(c, char, arena.wallHeight) ?? false)
    );

    const targetingChars: Character[] = [];
    if (targetGrabEntities instanceof Map) {
      for (const [c, target] of targetGrabEntities.entries()) {
        if (localHeroCharacter && c !== localHeroCharacter) continue;
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
    const isWithinPickupRange = charactersInReach.length > 0 || isTargetGrab;

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
        const reachColor = (charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)
          ? `${(charactersInReach[0]?.playerColor || targetingChars[0]?.playerColor)}99`
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

      // Surface velocity in screen space: (vx_surf = wy, vy_surf = -wx)
      const vSurfX = wy;
      const vSurfY = -wx;

      const cosR = Math.cos(rollDirAngle);
      const sinR = Math.sin(rollDirAngle);

      // Half 1: 0 to Math.PI (local midpoint at ly = +b) -> screen deltaY = +b * cosR
      // Half 2: Math.PI to 2*Math.PI (local midpoint at ly = -b) -> screen deltaY = -b * cosR
      // In screen space (y down), the top half has smaller y (negative deltaY).
      const isHalf1Top = cosR < 0;

      // The top half in screen space is ALWAYS OPAQUE (visible hemisphere facing viewer)
      // The bottom half in screen space is ALWAYS SEMI-TRANSPARENT (underside)
      const topStart = isHalf1Top ? 0 : Math.PI;
      const topEnd = isHalf1Top ? Math.PI : Math.PI * 2;
      const bottomStart = isHalf1Top ? Math.PI : 0;
      const bottomEnd = isHalf1Top ? Math.PI * 2 : Math.PI;

      // Tangent vector on the top hemisphere in screen space as theta increases:
      // At midpoint of top hemisphere, dx_local/dtheta has sign:
      // When isHalf1Top (theta = PI/2): dx_local/dtheta = -a, dy_local/dtheta = 0
      // -> screen tangent: (-a*cosR, -a*sinR)
      // When !isHalf1Top (theta = 3*PI/2): dx_local/dtheta = +a, dy_local/dtheta = 0
      // -> screen tangent: (+a*cosR, +a*sinR)
      const tanX = isHalf1Top ? -a * cosR : a * cosR;
      const tanY = isHalf1Top ? -a * sinR : a * sinR;
      const dotTan = tanX * vSurfX + tanY * vSurfY;

      // If dotTan >= 0, increasing theta moves forward with roll velocity.
      // Negative dashOffset advances dashes in direction of increasing theta.
      const spinSign = dotTan >= 0 ? 1 : -1;
      const dashOffset = -spinSign * roll.visualPhase * a;

      // 1. Upward facing rounded, skewed triangles from player's perspective (hidden if held or zero angular velocity)
      if (showArrows) {
        this.drawFixedSpeedTriangles(ctx, x, y, a, b, rollDirAngle, spinSign, renderRadius, false);
      }

      // 2. Classic animated dotted roll oval (rotating at physical roll speed)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rollDirAngle);

      // The top hemisphere in screen space is OPAQUE (visible stripe)
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, topStart, topEnd);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = dashOffset;
      ctx.stroke();

      // The underside in screen space is SEMI-TRANSPARENT
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, bottomStart, bottomEnd);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([dashLen, dashGap]);
      ctx.lineDashOffset = dashOffset;
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

      // On 3D oval: upper hemisphere (screen top, sy <= centerY) is opaque, underside is semi-transparent
      const isTopHalf = sy <= centerY;
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
   * Draws a precision aim reticle / crosshair at the cursor position (delegates to TrajectoryRenderer)
   */
  public drawAimReticle(screenX: number, screenY: number, color = "#ffffff", isLocked = false): void {
    this.trajectoryRenderer.drawAimReticle(screenX, screenY, color, isLocked);
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
