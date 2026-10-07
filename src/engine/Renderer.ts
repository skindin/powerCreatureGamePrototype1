import { Arena } from "./Arena.js";
import { GameObject, Vector2D } from "./GameObject.js";
import { Character } from "../character/Character.js";
import { GhostSnapshot } from "../network/RelayClient.js";
import { TrajectoryRenderer } from "./rendering/TrajectoryRenderer.js";
import { ShadowPass } from "./rendering/ShadowPass.js";
import { WallRoofPass } from "./rendering/WallRoofPass.js";
import { EntityPass } from "./rendering/EntityPass.js";
import { HudOverlayPass } from "./rendering/HudOverlayPass.js";
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
    isPaused = false,
    localHeroCharacter?: Character | null,
    remoteOverrides?: Map<string, { x: number; y: number; z: number; facingAngle?: number; isClimbing?: boolean }>
  ): void {
    const ctx = this.ctx;
    const ppu = ctx.canvas.width / arena.width; // Pixels per unit (e.g. 1000 / 20 = 50 px/u)

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const characters: Character[] = Array.isArray(characterInput)
      ? characterInput
      : (characterInput ? [characterInput] : []);

    const hero = localHeroCharacter !== undefined ? localHeroCharacter : (characters[0] || null);

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
      isPaused,
      hero,
      remoteOverrides,
      false
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
        remoteOverrides,
        true
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
   * Helper to resolve the effective 3D position (x, y, z) of any GameObject or Character,
   * taking into account whether it is currently held by another character.
   */
  public getEffectiveObjectPosition(
    obj: GameObject,
    arena: Arena,
    characters?: Character[]
  ): { x: number; y: number; z: number } {
    let holder: Character | null = null;
    if (obj.heldBy instanceof Character) {
      holder = obj.heldBy;
    } else if ((obj as any).holder instanceof Character) {
      holder = (obj as any).holder;
    } else if (characters) {
      holder = characters.find((c) => c.heldObject === obj) || null;
    }

    if (holder) {
      return holder.calculateHeldObjectPosition(arena);
    }
    return { x: obj.position.x, y: obj.position.y, z: obj.position.z };
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
    remoteOverrides?: Map<string, { x: number; y: number; z: number; facingAngle?: number; isClimbing?: boolean }>,
    isSplitScreenViewport = false
  ): void {
    const ctx = this.ctx;
    const character = localHeroCharacter || characters[0] || null;

    // Helper to evaluate if a character is remote from the perspective of THIS view:
    // In split-screen mode: isolated to localHeroCharacter (other players hidden from this viewport's local HUD)
    // In shared single-screen mode: only network clients in remoteOverrides are remote (all local players render HUD)
    const isRemoteForThisView = (char: Character): boolean => {
      if (isSplitScreenViewport) {
        return localHeroCharacter ? char !== localHeroCharacter : false;
      }
      return Boolean(remoteOverrides && remoteOverrides.has(char.playerId));
    };

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
      WallRoofPass.drawFloorGrid(ctx, arena, ppu);

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
        const effPos = this.getEffectiveObjectPosition(entity, arena, characters);
        ShadowPass.drawObjectGroundShadowFill(ctx, entity, arena, ppu, effPos, this.viewSettings);
      }

      // 3. Wall Bases (squares representing the sides / front faces at ground level)
      WallRoofPass.drawWallBases(ctx, arena, ppu, this.viewSettings);

      // 3b. Wall Tile Preview (When in Wall Editor sub-mode)
      if (isWallEditor && hoverWallTile) {
        WallRoofPass.drawWallEditorHover(ctx, arena, hoverWallTile, ppu);
      }

      // Split entities into ground layer (< wallHeight) and elevated layer (>= wallHeight).
      const groundRenderables = allRenderables.filter(e => {
        const eff = this.getEffectiveObjectPosition(e, arena, characters);
        return eff.z < arena.wallHeight - 0.05;
      });
      const elevatedRenderables = allRenderables.filter(e => {
        const eff = this.getEffectiveObjectPosition(e, arena, characters);
        return eff.z >= arena.wallHeight - 0.05;
      });

      // 4. Ground Entities (z < wallHeight)
      // Rendered before wall tops so top of wall renders OVER ground objects!
      for (const entity of groundRenderables) {
        const effPos = this.getEffectiveObjectPosition(entity, arena, characters);
        if (entity instanceof Character) {
          EntityPass.drawCharacter(
            ctx, entity, characters, ppu, arena, this.viewSettings, effPos,
            Renderer.getAltitudeScale, Renderer.isEntityOnLayer2,
            targetGrabEntities, localHeroCharacter, isSplitScreenViewport, remoteOverrides
          );
        } else {
          EntityPass.drawFreebodyObject(
            ctx, entity, characters, ppu, targetGrabEntities, arena, this.viewSettings, effPos,
            Renderer.getAltitudeScale, Renderer.isEntityOnLayer2,
            localHeroCharacter, isSplitScreenViewport, remoteOverrides
          );
        }
      }

      // 5. Top of Walls (squares representing the tops - renders OVER ground objects and ground shadows!)
      WallRoofPass.drawWallTops(ctx, arena, ppu, allRenderables, this.viewSettings, (obj) =>
        this.getEffectiveObjectPosition(obj, arena, characters)
      );

      // 6. Wall-Top Shadows (for entities hovering above walls - rendered on wall tops BEFORE elevated entities)
      for (const entity of allRenderables) {
        const effPos = this.getEffectiveObjectPosition(entity, arena, characters);
        ShadowPass.drawObjectWallTopShadowFill(ctx, entity, arena, ppu, effPos, this.viewSettings);
      }

      // 7. Elevated Entities (z >= wallHeight)
      // Standing on the wall roof or flying in the air above walls (renders ON TOP of wall shadows)
      for (const entity of elevatedRenderables) {
        const effPos = this.getEffectiveObjectPosition(entity, arena, characters);
        if (entity instanceof Character) {
          EntityPass.drawCharacter(
            ctx, entity, characters, ppu, arena, this.viewSettings, effPos,
            Renderer.getAltitudeScale, Renderer.isEntityOnLayer2,
            targetGrabEntities, localHeroCharacter, isSplitScreenViewport, remoteOverrides
          );
        } else {
          EntityPass.drawFreebodyObject(
            ctx, entity, characters, ppu, targetGrabEntities, arena, this.viewSettings, effPos,
            Renderer.getAltitudeScale, Renderer.isEntityOnLayer2,
            localHeroCharacter, isSplitScreenViewport, remoteOverrides
          );
        }
      }

      // 8. Collider Position Outlines (Renders ON TOP OF EVERYTHING - only the shadow fill is covered!)
      for (const entity of allRenderables) {
        const effPos = this.getEffectiveObjectPosition(entity, arena, characters);
        ShadowPass.drawObjectColliderPositionOutline(
          ctx, entity, arena, ppu, effPos, this.viewSettings, Renderer.getAltitudeScale
        );
      }

      // 9. Vertical connector lines for elevated entities (renders OVER objects and character!)
      if (useHover) {
        for (const entity of allRenderables) {
          const effPos = this.getEffectiveObjectPosition(entity, arena, characters);
          ShadowPass.drawVerticalConnectorLine(ctx, entity, arena, ppu, effPos, this.viewSettings);
        }
      }

      // 10. Trajectory Lines and Aim Cursors
      // First: render active trajectories for any character holding an object
      for (const char of characters) {
        // Do NOT show throw trajectory and destination marker to a remote client / other screen
        if (isRemoteForThisView(char)) continue;

        if (char.activeTrajectory) {
          // Is this character's cursor currently unhidden and visible?
          const cursor = Array.isArray(activeAimCursorsOrIsGamepad)
            ? activeAimCursorsOrIsGamepad.find((c) => c.character === char)
            : null;
          const cursorTarget = cursor ? { x: cursor.x, y: cursor.y } : null;
          this.trajectoryRenderer.drawTrajectory(char.activeTrajectory, ppu, arena, this.viewSettings, cursorTarget, char);
        }
      }

      // Second: render aim cursors (only for unhidden cursors belonging to the local client)
      if (Array.isArray(activeAimCursorsOrIsGamepad)) {
        for (const cursor of activeAimCursorsOrIsGamepad) {
          const cChar = cursor.character;
          if (isRemoteForThisView(cChar)) continue;

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
        if (character && !isRemoteForThisView(character)) {
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
          HudOverlayPass.drawHoverGizmo(ctx, hoverEntity, ppu, this.viewSettings, Renderer.getAltitudeScale);
        }
        if (selectedEntity) {
          HudOverlayPass.drawSelectionGizmo(ctx, selectedEntity, isEditMode, ppu, this.viewSettings, Renderer.getAltitudeScale);
        }
      }

      // Ghost Clones (Echoed states from 3rd-party relay server)
      if (this.showGhostClones && ghostSnapshot) {
        this.drawGhostClones(ghostSnapshot, ppu, arena);
      }

      // 12. Player Name Tags — drawn LAST so they are always above walls, entities, and everything else
      for (const char of characters) {
        const isRemote = isRemoteForThisView(char);
        HudOverlayPass.drawCharacterNameTag(ctx, char, arena, ppu, this.viewSettings, Renderer.getAltitudeScale, isRemote);
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
   * Draws a precision aim reticle / crosshair at the cursor position (delegates to TrajectoryRenderer)
   */
  public drawAimReticle(screenX: number, screenY: number, color = "#ffffff", isLocked = false): void {
    this.trajectoryRenderer.drawAimReticle(screenX, screenY, color, isLocked);
  }
}
