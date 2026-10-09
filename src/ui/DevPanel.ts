import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { WalkingModule } from "../character/WalkingModule.js";
import { PickupModule } from "../character/PickupModule.js";
import { ThrowModule } from "../character/ThrowModule.js";
import { ClimbingModule } from "../character/ClimbingModule.js";
import { JumpModule } from "../character/JumpModule.js";
import { WallEdgeAssistModule } from "../character/WallEdgeAssistModule.js";
import { RollModule } from "../engine/RollModule.js";
import { ColliderModule } from "../engine/ColliderModule.js";
import { FrictionModule } from "../engine/FrictionModule.js";
import { BounceModule } from "../engine/BounceModule.js";
import { GravityModule } from "../engine/GravityModule.js";
import { VerticalPositionModule } from "../engine/VerticalPositionModule.js";
import { RigidbodyModule } from "../engine/RigidbodyModule.js";
import { HealthModule } from "../character/HealthModule.js";
import { DamageAuraModule } from "../engine/DamageAuraModule.js";
import { DamageSolverModule } from "../engine/DamageSolverModule.js";
import { PropertyControl } from "./PropertyControl.js";
import { FloatScrubber } from "./FloatScrubber.js";

export interface CreatorPreset {
  name: string;
  visualShape: "box" | "circle";
  color: string;
  hasRigidbody: boolean;
  hasCollider: boolean;
  colliderRadius: number;
  hasMass: boolean;
  mass: number;
  hasFriction: boolean;
  staticFrictionMod: number;
  dynamicFrictionMod: number;
  hasBounce: boolean;
  bounceMod: number;
  verticalBounce: boolean;
  hasVerticalPosition: boolean;
  elevation: number;
  hasVerticalVelocity: boolean;
  hasGravity: boolean;
  hasRollModule: boolean;
  rollResistance: number;
}

export class DevPanel {
  private container: HTMLElement;
  private character: Character;
  private arena: Arena;
  private objects: GameObject[];
  private onSpawnObject: (obj: GameObject) => void;
  private onDeleteObject?: (obj: GameObject) => void;
  private onClearObjects: () => void;
  private getAllCharacters?: () => Character[];

  public selectedEntity: GameObject;
  public isEditMode: boolean = false;
  public editTool: "entities" | "walls" = "entities";
  public onSelectionChange?: (entity: GameObject | null) => void;
  public getGameLoop?: () => any;
  public getRenderer?: () => any;
  public rollbackDepthTicks: number = 30;


  // Preserved Creator State
  public creatorState: CreatorPreset = {
    name: "Custom Box",
    visualShape: "box",
    color: "#38bdf8",
    hasRigidbody: true,
    hasCollider: true,
    colliderRadius: 0.30,
    hasMass: true,
    mass: 1.0,
    hasFriction: true,
    staticFrictionMod: 1.0,
    dynamicFrictionMod: 1.0,
    hasBounce: true,
    bounceMod: 0.20,
    verticalBounce: true,
    hasVerticalPosition: true,
    elevation: 0.1,
    hasVerticalVelocity: true,
    hasGravity: true,
    hasRollModule: false,
    rollResistance: 0.40,
  };

  // Preset definitions
  private readonly presets: Record<string, CreatorPreset> = {
    "Light Blue Box": {
      name: "Light Blue Box",
      visualShape: "box",
      color: "#38bdf8",
      hasRigidbody: true,
      hasCollider: true,
      colliderRadius: 0.26,
      hasMass: true,
      mass: 0.7,
      hasFriction: true,
      staticFrictionMod: 1.0,
      dynamicFrictionMod: 1.0,
      hasBounce: true,
      bounceMod: 0.25,
      verticalBounce: true,
      hasVerticalPosition: true,
      elevation: 0.1,
      hasVerticalVelocity: true,
      hasGravity: true,
      hasRollModule: false,
      rollResistance: 0.4,
    },
    "Heavy Red Box": {
      name: "Heavy Red Box",
      visualShape: "box",
      color: "#f87171",
      hasRigidbody: true,
      hasCollider: true,
      colliderRadius: 0.40,
      hasMass: true,
      mass: 2.6,
      hasFriction: true,
      staticFrictionMod: 1.2,
      dynamicFrictionMod: 1.2,
      hasBounce: false,
      bounceMod: 0.05,
      verticalBounce: false,
      hasVerticalPosition: true,
      elevation: 0.1,
      hasVerticalVelocity: true,
      hasGravity: true,
      hasRollModule: false,
      rollResistance: 0.4,
    },
    "Bouncy Ball": {
      name: "Super Bouncy Ball",
      visualShape: "circle",
      color: "#4ade80",
      hasRigidbody: true,
      hasCollider: true,
      colliderRadius: 0.24,
      hasMass: true,
      mass: 0.5,
      hasFriction: true,
      staticFrictionMod: 0.8,
      dynamicFrictionMod: 0.8,
      hasBounce: true,
      bounceMod: 0.88,
      verticalBounce: true,
      hasVerticalPosition: true,
      elevation: 0.6,
      hasVerticalVelocity: true,
      hasGravity: true,
      hasRollModule: false,
      rollResistance: 0.4,
    },
    "Rolling Ball": {
      name: "Rolling Ball",
      visualShape: "circle",
      color: "#a855f7",
      hasRigidbody: true,
      hasCollider: true,
      colliderRadius: 0.28,
      hasMass: true,
      mass: 0.6,
      hasFriction: true,
      staticFrictionMod: 0.5,
      dynamicFrictionMod: 0.5,
      hasBounce: true,
      bounceMod: 0.95,
      verticalBounce: true,
      hasVerticalPosition: true,
      elevation: 0.1,
      hasVerticalVelocity: true,
      hasGravity: true,
      hasRollModule: true,
      rollResistance: 0.0,
    },
    "Ghost Box": {
      name: "Ghost Box (No Collider)",
      visualShape: "box",
      color: "#94a3b8",
      hasRigidbody: false,
      hasCollider: false,
      colliderRadius: 0.30,
      hasMass: false,
      mass: 0.0,
      hasFriction: false,
      staticFrictionMod: 0.0,
      dynamicFrictionMod: 0.0,
      hasBounce: false,
      bounceMod: 0.0,
      verticalBounce: false,
      hasVerticalPosition: false,
      elevation: 0.0,
      hasVerticalVelocity: false,
      hasGravity: false,
      hasRollModule: false,
      rollResistance: 0.0,
    },
  };

  // Cached DOM elements
  private inspectorEl!: HTMLElement;
  private entitySelectorEl!: HTMLSelectElement;
  private characterSpecificControlsEl: HTMLElement | null = null;
  private objectSpecificControlsEl!: HTMLElement;
  private modePlayBtn!: HTMLButtonElement;
  private modeEditBtn!: HTMLButtonElement;
  private scrubbers: Map<string, FloatScrubber> = new Map();

  constructor(options: {
    container: HTMLElement;
    character: Character;
    arena: Arena;
    objects: GameObject[];
    onSpawnObject: (obj: GameObject) => void;
    onDeleteObject?: (obj: GameObject) => void;
    onClearObjects: () => void;
    getAllCharacters?: () => Character[];
  }) {
    this.container = options.container;
    this.character = options.character;
    this.arena = options.arena;
    this.objects = options.objects;
    this.onSpawnObject = options.onSpawnObject;
    this.onDeleteObject = options.onDeleteObject;
    this.onClearObjects = options.onClearObjects;
    this.getAllCharacters = options.getAllCharacters;

    this.selectedEntity = this.character;

    this.renderPanel();
  }

  public setSelectedEntity(entity: GameObject): void {
    this.selectedEntity = entity;
    this.updateSelectorOptions();
    this.renderEntityModules();
    this.syncEntitySliders();
    this.onSelectionChange?.(entity);
  }

  public setMode(editMode: boolean): void {
    this.isEditMode = editMode;
    if (this.isEditMode && typeof document !== "undefined" && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }
    if (this.modePlayBtn && this.modeEditBtn) {
      if (this.isEditMode) {
        this.modePlayBtn.classList.remove("active-play");
        this.modeEditBtn.classList.add("active-edit");
      } else {
        this.modePlayBtn.classList.add("active-play");
        this.modeEditBtn.classList.remove("active-edit");
      }
    }
    const submodeContainer = this.container.querySelector("#edit-submode-container") as HTMLElement;
    if (submodeContainer) {
      submodeContainer.style.display = this.isEditMode ? "flex" : "none";
    }
    this.updateToolVisibility();
  }

  public setEditTool(tool: "entities" | "walls"): void {
    this.editTool = tool;
    const btnEntities = this.container.querySelector("#submode-entities") as HTMLButtonElement;
    const btnWalls = this.container.querySelector("#submode-walls") as HTMLButtonElement;
    if (btnEntities && btnWalls) {
      btnEntities.classList.toggle("active", tool === "entities");
      btnWalls.classList.toggle("active", tool === "walls");
    }
    this.updateToolVisibility();
  }

  private updateToolVisibility(): void {
    const wallEditorSection = this.container.querySelector("#wall-editor-section") as HTMLElement;
    if (wallEditorSection) {
      wallEditorSection.style.display = (this.isEditMode && this.editTool === "walls") ? "block" : "none";
    }
    const hint = this.container.querySelector("#edit-hint-label");
    if (hint) {
      if (!this.isEditMode) {
        hint.textContent = "Right-click in arena to select";
      } else if (this.editTool === "walls") {
        hint.textContent = "Left-drag: Draw | Right-drag: Erase";
      } else {
        hint.textContent = "Click & drag object in arena";
      }
    }
  }

  public updateSelectorOptions(): void {
    if (!this.entitySelectorEl) return;

    const chars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);

    // If current selected entity was a character that is no longer active in the arena, switch cleanly
    if (this.selectedEntity instanceof Character && !chars.includes(this.selectedEntity)) {
      this.selectedEntity = chars[0] || this.objects[0] || (null as any);
      this.onSelectionChange?.(this.selectedEntity);
    } else if (!this.selectedEntity) {
      this.selectedEntity = chars[0] || this.objects[0] || (null as any);
      this.onSelectionChange?.(this.selectedEntity);
    }

    const currentId = this.selectedEntity ? this.selectedEntity.id : "";

    let html = "";
    for (const char of chars) {
      const isSel = char.id === currentId ? "selected" : "";
      const massDesc = char.hasMass ? `${char.mass.toFixed(1)}kg` : "Massless";
      html += `<option value="${char.id}" ${isSel}>⭐ ${char.name} (${massDesc})</option>`;
    }
    for (const obj of this.objects) {
      const isSel = obj.id === currentId ? "selected" : "";
      const icon = obj.visualShape === "box" ? "📦" : "⚪";
      const massDesc = obj.hasMass ? `${obj.mass.toFixed(1)}kg` : "Massless";
      html += `<option value="${obj.id}" ${isSel}>${icon} ${obj.name} (${massDesc})</option>`;
    }
    if (chars.length === 0 && this.objects.length === 0) {
      html = `<option value="">(No entities in arena)</option>`;
    }
    this.entitySelectorEl.innerHTML = html;

    const isChar = Boolean(this.selectedEntity && this.selectedEntity instanceof Character);
    if (this.characterSpecificControlsEl) {
      this.characterSpecificControlsEl.style.display = isChar ? "flex" : "none";
    }
    if (this.objectSpecificControlsEl) {
      this.objectSpecificControlsEl.style.display = (!isChar && this.selectedEntity) ? "flex" : "none";
    }

    this.renderEntityModules();
    this.syncEntitySliders();
  }

  private renderPanel(): void {
    this.container.innerHTML = `
      <div class="dev-panel-header">
        <div class="header-top-row">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2>🛠️ Sandbox & Engine</h2>
            <span class="badge">1 Wall = 1 Unit</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <button id="btn-dev-view-settings" class="btn-secondary-action" style="flex: 0 0 auto; padding: 3px 8px; font-size: 0.74rem; border-color: rgba(56, 189, 248, 0.35); color: #38bdf8;" title="Open 3D View Settings (V)">👁️ View</button>
            <button id="btn-close-dev-panel" class="btn-close-panel" title="Collapse Inspector Sidebar (I or \`)">✕</button>
          </div>
        </div>
        <div class="mode-switcher">
          <button id="mode-play" class="mode-btn ${!this.isEditMode ? 'active-play' : ''}">🎮 Play Mode</button>
          <button id="mode-edit" class="mode-btn ${this.isEditMode ? 'active-edit' : ''}">✏️ Edit Mode</button>
        </div>
        <div id="edit-submode-container" class="edit-submode-switcher" style="display: ${this.isEditMode ? 'flex' : 'none'};">
          <button id="submode-entities" class="submode-btn ${this.editTool === 'entities' ? 'active' : ''}">📦 Move Entities</button>
          <button id="submode-walls" class="submode-btn ${this.editTool === 'walls' ? 'active' : ''}">🧱 Edit Walls</button>
        </div>
      </div>

      <div class="dev-scrollable">
        <!-- Wall Tile Editor Section (Active when Edit Mode & Edit Walls selected) -->
        <div id="wall-editor-section" class="dev-section wall-tool-panel" style="display: ${this.isEditMode && this.editTool === 'walls' ? 'block' : 'none'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h3 style="margin: 0;">🧱 Wall Tile Editor</h3>
            <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4);">Grid: 20 × 14</span>
          </div>
          <p class="section-desc">Click and drag directly in the arena to paint or erase 1.0 × 1.0 unit wall blocks in real-time.</p>

          <div class="wall-hint-box">
            <div>🖱️ <strong>Left-Click & Drag:</strong> Draw / place wall tiles</div>
            <div style="margin-top: 4px;">🖱️ <strong class="danger">Right-Click & Drag:</strong> Erase / remove wall tiles</div>
            <div style="margin-top: 6px; font-size: 0.72rem; color: #94a3b8;">
              💡 Drawing a wall under an object on the ground elevates it to wall height. Erasing a wall under an object causes it to fall naturally with gravity.
            </div>
          </div>

          <!-- Wall Map Presets Switcher -->
          <div class="wall-presets-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 4px;">🗺️ Default Wall Maps</span>
              <span id="label-wall-map-badge" class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.68rem;">
                ${this.getCurrentWallPresetBadge()}
              </span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button id="btn-prev-wall-map" class="btn-secondary-action btn-wall-nav" title="Previous Wall Map">◀</button>
              <select id="select-wall-preset" class="dev-select wall-preset-select">
                ${this.renderWallPresetOptions()}
              </select>
              <button id="btn-next-wall-map" class="btn-secondary-action btn-wall-nav" title="Next Wall Map">▶</button>
            </div>
            <p id="desc-wall-map" class="wall-preset-desc">
              ${this.getCurrentWallPresetDesc()}
            </p>
          </div>

          <div id="scrub-container-editor-wall-height" style="margin-top: 12px;"></div>

          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button id="btn-reset-walls" class="btn-secondary-action" style="flex: 1;">↺ Reset Layout</button>
            <button id="btn-clear-walls" class="btn-secondary-action" style="flex: 1; color: #f87171; border-color: rgba(248, 113, 113, 0.3);">🗑️ Clear Walls</button>
          </div>
        </div>

        <!-- Target Selection -->
        <div class="dev-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h3>🎯 Target Entity</h3>
            <span style="font-size: 0.72rem; color: var(--accent-amber);" id="edit-hint-label">
              ${this.isEditMode ? "Click & drag object in arena" : "Right-click in arena to select"}
            </span>
          </div>
          <select id="entity-selector" class="dev-select"></select>
          
          <!-- Entity Actions (Duplicate / Delete) - Only for Objects -->
          <div id="object-actions-row" class="entity-actions-row" style="display: none; margin-top: 8px;">
            <button id="btn-duplicate-entity" class="btn-secondary-action">📋 Duplicate</button>
            <button id="btn-delete-entity" class="btn-secondary-action" style="color: #f87171; border-color: rgba(248, 113, 113, 0.3);">🗑️ Delete</button>
          </div>
        </div>

        <!-- Live Diagnostics Inspector -->
        <div class="dev-section">
          <h3>📊 Live Diagnostics</h3>
          <div id="dev-inspector" class="inspector-grid"></div>
        </div>

        <!-- ⚡ Physics & Collision Simulation (Phase A) -->
        <div class="dev-section" style="border: 1px solid rgba(6, 182, 212, 0.3); background: rgba(6, 182, 212, 0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h3 style="margin: 0; color: #38bdf8;">⚡ Physics & Collisions</h3>
            <span id="badge-sim-tick" class="badge" style="background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.4);">
              Tick 0 (60Hz)
            </span>
          </div>
          <p class="section-desc">Test Discrete TOI Rollback vs. Continuous Swept CCD vs. Legacy Naive Overlap.</p>

          <!-- Simulation Play / Pause / Step -->
          <div style="display: flex; gap: 6px; margin-bottom: 10px;">
            <button id="btn-sim-pause" class="btn-secondary-action" style="flex: 1; padding: 6px 10px; font-weight: 600;">
              ⏸️ Pause Sim
            </button>
            <button id="btn-sim-step" class="btn-secondary-action" style="flex: 1; padding: 6px 10px; font-weight: 600; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">
              ⏭️ Step 1 Tick
            </button>
          </div>

          <!-- Global Collision Mode -->
          <div style="margin-bottom: 10px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #e2e8f0; margin-bottom: 4px;">Global Collision Solver</label>
            <select id="select-global-collision-mode" class="dev-select">
              <option value="dynamic" selected>⚡ Dynamic Adaptive (CCD on Fast, TOI on Slow)</option>
              <option value="discrete">⏪ Discrete TOI Rollback (Sub-Tick Rewind)</option>
              <option value="continuous">🔍 Continuous Swept (Always CCD)</option>
              <option value="naive">⚠️ Naive Push-Out (Legacy Baseline)</option>
            </select>
          </div>

          <!-- Dynamic CCD Threshold Ratio Scrubber -->
          <div id="group-ccd-threshold" style="margin-bottom: 10px;">
            <div id="scrub-container-ccd-threshold"></div>
            <span style="font-size: 0.70rem; color: #94a3b8; display: block; margin-top: 2px;">
              Triggers Continuous Swept when displacement per tick exceeds (Ratio × Radius).
            </span>
          </div>

          <!-- Selected Entity Collision Policy -->
          <div style="margin-bottom: 10px; padding: 8px; background: rgba(15, 23, 42, 0.6); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.76rem; font-weight: 600; color: #e2e8f0;">Target Entity Mode</span>
              <span id="badge-entity-effective-mode" class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-size: 0.68rem;">
                Discrete
              </span>
            </div>
            <select id="select-entity-collision-mode" class="dev-select">
              <option value="dynamic" selected>Dynamic (Follows Velocity)</option>
              <option value="discrete">Force Discrete</option>
              <option value="continuous">Force Continuous Swept</option>
            </select>
          </div>

          <!-- Test Cannon / Projectile Launcher -->
          <div style="margin-bottom: 10px;">
            <button id="btn-launch-fast-ball" class="btn-secondary-action" style="width: 100%; padding: 8px; color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); font-weight: 600; background: rgba(245, 158, 11, 0.08);">
              🚀 Launch High-Speed Ball (40 u/s)
            </button>
            <span style="font-size: 0.70rem; color: #94a3b8; display: block; margin-top: 4px;">
              Fires a small ball at 40 u/s toward walls to test tunneling vs. clean bouncing in real-time.
            </span>
          </div>

          <!-- Collision Visuals Toggle -->
          <div class="toggle-row" style="margin-top: 6px;">
            <label style="font-size: 0.78rem;">Show CCD / TOI Visuals</label>
            <button id="toggle-collision-visuals" class="btn-toggle">
              OFF
            </button>
          </div>
        </div>

        <!-- ⏪ Phase 2: State History & Deterministic Rollback -->
        <div class="dev-section" id="section-history-rollback">
          <h3>⏪ History Buffer & Rollback Replay</h3>
          <p class="section-desc">Test local deterministic rewind, input replay, and desync reconciliation (Phase 2).</p>

          <!-- Live Buffer Telemetry Badge -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 10px; background: rgba(15, 23, 42, 0.65); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <span style="font-size: 0.74rem; color: #94a3b8;">Buffered Memory:</span>
            <span id="badge-buffer-status" class="badge" style="background: rgba(56, 189, 248, 0.18); color: #38bdf8; font-weight: 600; font-size: 0.74rem;">
              60/60 ticks (1.00s)
            </span>
          </div>

          <!-- Buffer Capacity Scrubber (Dynamic live resizing) -->
          <div id="group-buffer-capacity" style="margin-bottom: 8px;">
            <div id="scrub-container-buffer-capacity"></div>
            <span style="font-size: 0.68rem; color: #64748b; display: block; margin-top: 2px;">
              Dynamic ring buffer size (15 to 120 ticks, 0.25s to 2.0s).
            </span>
          </div>

          <!-- Rollback Replay Depth Scrubber -->
          <div id="group-rollback-depth" style="margin-bottom: 8px;">
            <div id="scrub-container-rollback-depth"></div>
          </div>

          <!-- Live Buffer Trail Toggle -->
          <div class="toggle-row" style="margin-top: 6px; margin-bottom: 8px;">
            <label style="font-size: 0.78rem;">Show Live Buffer Trail</label>
            <button id="toggle-buffer-trail" class="btn-toggle">
              OFF
            </button>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
            <div>
              <button id="btn-test-rollback" class="btn-secondary-action" style="width: 100%; padding: 8px; color: #10b981; border-color: rgba(16, 185, 129, 0.4); font-weight: 600; background: rgba(16, 185, 129, 0.08);">
                ⏪ Rollback & Verify Replay
              </button>
              <span style="font-size: 0.68rem; color: #64748b; display: block; margin-top: 3px; line-height: 1.3;">
                Rewinds world state N ticks, replays recorded inputs forward, and verifies 0.0000u bit-level precision. (Tip: Run, jump, or throw an item, click ⏸️ Pause Sim, then test rollback).
              </span>
            </div>

            <div>
              <button id="btn-test-desync" class="btn-secondary-action" style="width: 100%; padding: 8px; color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); font-weight: 600; background: rgba(245, 158, 11, 0.08);">
                💥 Simulate Past Tackle & Reconcile
              </button>
              <span style="font-size: 0.68rem; color: #64748b; display: block; margin-top: 3px; line-height: 1.3;">
                Simulates an external tackle hitting the selected entity N ticks in the past. Renders the old predicted path (red) vs. re-simulated reconciled path (green) on canvas!
              </span>
            </div>

            <div>
              <button id="btn-test-phase8-reconcile" class="btn-secondary-action" style="width: 100%; padding: 8px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); font-weight: 600; background: rgba(56, 189, 248, 0.08);">
                🔄 Test Prediction Reconciliation (Phase 8)
              </button>
              <span style="font-size: 0.68rem; color: #64748b; display: block; margin-top: 3px; line-height: 1.3;">
                Simulates receiving an authoritative server snapshot with a past perturbation. Rewinds local player, fast-forwards with recorded inputs, and sets visual dampeners (0.000u pop).
              </span>
            </div>
          </div>

          <!-- Rollback Result Banner -->
          <div id="banner-rollback-result" style="display: none; padding: 8px 10px; border-radius: 6px; font-size: 0.72rem; line-height: 1.4; margin-top: 4px; border: 1px solid transparent;">
          </div>
        </div>

        <!-- 🧩 Modular Capabilities & Physical Behaviors -->

        <div class="dev-section">
          <h3>🧩 Physical Behaviors</h3>
          <p class="section-desc">Attach or detach isolated physics behaviors for the selected entity.</p>

          <!-- Visual Shape -->
          <div class="toggle-row" id="row-visual-shape" style="${this.selectedEntity instanceof Character ? 'display:none;' : ''}">
            <label>Visual Shape</label>
            <button id="toggle-entity-shape" class="btn-toggle ${this.selectedEntity.visualShape === 'box' ? 'active' : ''}">
              ${this.selectedEntity.visualShape === 'box' ? 'Box 📦' : 'Circle ⚪'}
            </button>
          </div>

          <!-- Dynamic Module Cards Container -->
          <div id="entity-modules-container" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          </div>

          <!-- Add Behavior Button & Dropdown Menu -->
          <div class="add-behavior-container" id="add-behavior-section" style="margin-top: 12px; position: relative;">
            <button id="btn-add-behavior" class="btn-add-behavior" type="button">
              <span>➕</span> Add Behavior
            </button>
            <div id="dropdown-add-behavior" class="dropdown-add-behavior" style="display: none;">
            </div>
          </div>
        </div>

        <!-- ✨ Add New Object (Creator & Presets) -->
        <div class="dev-section">
          <div class="creator-sticky-header">
            <h3 style="margin: 0;">✨ Add New Object</h3>
            <span class="not-live-badge">⚠️ NOT LIVE OBJECT</span>
          </div>
          <p class="section-desc">Configure template properties or choose a preset to spawn into the arena.</p>
          
          <div class="presets-container" style="margin-bottom: 10px;">
            <button class="preset-chip" data-preset="Light Blue Box">📦 Light Box</button>
            <button class="preset-chip" data-preset="Heavy Red Box">📦 Heavy Box</button>
            <button class="preset-chip" data-preset="Bouncy Ball">⚪ Bouncy Ball</button>
            <button class="preset-chip" data-preset="Rolling Ball">🟣 Rolling Ball</button>
            <button class="preset-chip" data-preset="Ghost Box">👻 Ghost Box</button>
          </div>

          <div class="creator-form">
            <div>
              <label style="font-size: 0.76rem; color: #94a3b8; display: block; margin-bottom: 4px;">Object Name</label>
              <input type="text" id="creator-name" class="dev-input" value="${this.creatorState.name}">
            </div>

            <div class="toggle-row">
              <label>Visual Shape</label>
              <button id="creator-toggle-shape" class="btn-toggle ${this.creatorState.visualShape === 'box' ? 'active' : ''}">
                ${this.creatorState.visualShape === 'box' ? 'Box 📦' : 'Circle ⚪'}
              </button>
            </div>

            <div class="color-row">
              <label>Color</label>
              <div class="color-input-wrapper">
                <input type="color" id="creator-color" value="${this.creatorState.color}">
                <span id="val-creator-color" style="font-size: 0.76rem; font-family: monospace; color: #cbd5e1;">${this.creatorState.color}</span>
              </div>
            </div>

            <div class="toggle-row">
              <label>Rigidbody</label>
              <button id="creator-toggle-rigidbody" class="btn-toggle ${this.creatorState.hasRigidbody ? 'active' : ''}">
                ${this.creatorState.hasRigidbody ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-rigidbody" style="display: ${this.creatorState.hasRigidbody ? 'block' : 'none'};">
              <div class="toggle-subrow" style="display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #cbd5e1;">Vertical Velocity</label>
                <button id="creator-toggle-vert-vel" class="btn-toggle ${this.creatorState.hasVerticalVelocity && this.creatorState.hasVerticalPosition ? 'active' : ''}" ${!this.creatorState.hasVerticalPosition ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                  ${this.creatorState.hasVerticalVelocity && this.creatorState.hasVerticalPosition ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div id="creator-warn-rb-vert-pos" class="module-dep-warning" style="display: ${!this.creatorState.hasVerticalPosition ? 'block' : 'none'}; margin-top: 4px;">
                ⚠️ Requires Vertical Position behavior
              </div>
            </div>

            <div class="toggle-row">
              <label>Collider</label>
              <button id="creator-toggle-collider" class="btn-toggle ${this.creatorState.hasCollider ? 'active' : ''}">
                ${this.creatorState.hasCollider ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div id="grp-creator-radius" style="display: ${this.creatorState.hasCollider ? 'block' : 'none'};">
              <div id="scrub-container-creator-radius"></div>
            </div>

            <div class="toggle-row">
              <label>Mass</label>
              <button id="creator-toggle-mass" class="btn-toggle ${this.creatorState.hasMass ? 'active' : ''}">
                ${this.creatorState.hasMass ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div id="grp-creator-mass" style="display: ${this.creatorState.hasMass ? 'block' : 'none'};">
              <div id="scrub-container-creator-mass"></div>
            </div>

            <div class="toggle-row">
              <label>Friction</label>
              <button id="creator-toggle-friction" class="btn-toggle ${this.creatorState.hasFriction ? 'active' : ''}">
                ${this.creatorState.hasFriction ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div id="grp-creator-fric" style="display: ${this.creatorState.hasFriction ? 'block' : 'none'};">
              <div id="scrub-container-creator-fric"></div>
            </div>

            <div class="toggle-row">
              <label>Bounciness</label>
              <button id="creator-toggle-bounce" class="btn-toggle ${this.creatorState.hasBounce ? 'active' : ''}">
                ${this.creatorState.hasBounce ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div id="grp-creator-bounce" style="display: ${this.creatorState.hasBounce ? 'block' : 'none'};">
              <div id="scrub-container-creator-bounce"></div>
              <div style="margin-top: 6px;">
                <label style="font-size: 0.78rem; color: #cbd5e1; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="creator-check-vert-bounce" ${this.creatorState.verticalBounce ? 'checked' : ''}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="creator-warn-bounce-vert" class="module-dep-warning" style="display: ${this.creatorState.hasBounce && this.creatorState.verticalBounce && (!this.creatorState.hasVerticalPosition || !this.creatorState.hasVerticalVelocity) ? 'block' : 'none'};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>

            <div class="toggle-row">
              <label>Vertical Position</label>
              <button id="creator-toggle-vert-pos" class="btn-toggle ${this.creatorState.hasVerticalPosition ? 'active' : ''}">
                ${this.creatorState.hasVerticalPosition ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div id="grp-creator-vert-pos" style="display: ${this.creatorState.hasVerticalPosition ? 'block' : 'none'};">
              <div id="scrub-container-creator-elevation"></div>
            </div>

            <div class="toggle-row">
              <label>Gravity</label>
              <button id="creator-toggle-gravity" class="btn-toggle ${this.creatorState.hasGravity ? 'active' : ''}">
                ${this.creatorState.hasGravity ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div class="toggle-row">
              <label>Roll</label>
              <button id="creator-toggle-roll" class="btn-toggle ${this.creatorState.hasRollModule ? 'active' : ''}">
                ${this.creatorState.hasRollModule ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div id="group-creator-roll-resist" style="display: ${this.creatorState.hasRollModule ? 'block' : 'none'};">
              <div id="scrub-container-creator-roll-resist"></div>
            </div>

            <button id="btn-spawn-configured" class="btn-spawn-primary">✨ Spawn Object</button>
          </div>

          <div style="margin-top: 10px;">
            <button id="btn-clear-entities" class="btn-danger" style="width: 100%;">Clear All Objects</button>
          </div>
        </div>

        <!-- 🌍 World & Arena Physics -->
        <div class="dev-section">
          <h3>🌍 World Physics & Environment</h3>

          <div id="scrub-container-gravity" style="margin-bottom: 8px;"></div>
          <div id="scrub-container-wall-height" style="margin-bottom: 8px;"></div>
          <div id="scrub-container-friction" style="margin-bottom: 8px;"></div>
          <div id="scrub-container-static-thresh" style="margin-bottom: 8px;"></div>
          <div id="scrub-container-collision-damage-scale" style="margin-bottom: 8px;"></div>
        </div>
      </div>
    `;

    this.inspectorEl = this.container.querySelector("#dev-inspector")!;
    this.entitySelectorEl = this.container.querySelector("#entity-selector")!;
    this.characterSpecificControlsEl = this.container.querySelector("#character-specific-controls");
    this.objectSpecificControlsEl = this.container.querySelector("#object-actions-row")!;
    this.modePlayBtn = this.container.querySelector("#mode-play")!;
    this.modeEditBtn = this.container.querySelector("#mode-edit")!;

    this.updateSelectorOptions();
    this.bindEvents();
    this.renderEntityModules();
  }

  public syncEntitySliders(): void {
    const e = this.selectedEntity;
    if (!e) return;
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    // Visual shape row visibility
    const shapeRow = this.container.querySelector("#row-visual-shape") as HTMLElement;
    if (shapeRow) shapeRow.style.display = isChar ? "none" : "flex";

    const btnShape = this.container.querySelector("#toggle-entity-shape") as HTMLButtonElement;
    if (btnShape) {
      if (e.visualShape === "box") {
        btnShape.textContent = "Box 📦";
        btnShape.classList.add("active");
      } else {
        btnShape.textContent = "Circle ⚪";
        btnShape.classList.remove("active");
      }
    }

    // Physical behaviors sliders (only affects elements currently rendered)
    this.setSliderVal("slide-entity-radius", "val-entity-radius", e.colliderModule?.radius ?? 0.32, 2);
    this.setSliderVal("slide-entity-mass", "val-entity-mass", e.mass, 1);
    this.setSliderVal("slide-entity-static-fric", "val-entity-static-fric", e.frictionModule?.staticFrictionMod ?? 1.0, 2);
    this.setSliderVal("slide-entity-dynamic-fric", "val-entity-dynamic-fric", e.frictionModule?.dynamicFrictionMod ?? 1.0, 2);
    this.setSliderVal("slide-entity-bounce", "val-entity-bounce", e.bounceModule?.bounceMod ?? 0.4, 2);
    this.setSliderVal("slide-entity-elevation", "val-entity-elevation", e.position.z, 2);
    this.setSliderVal("slide-entity-vert-vel", "val-entity-vert-vel", e.verticalVelocity, 2);
    if (e.rollModule) {
      this.setSliderVal("slide-entity-roll-resist", "val-entity-roll-resist", e.rollModule.rollResistance, 2);
    }

    // Sync Collision Mode & CCD Threshold
    const selectEntityCollision = this.container.querySelector("#select-entity-collision-mode") as HTMLSelectElement | null;
    if (selectEntityCollision) {
      selectEntityCollision.value = e.collisionMode ?? "dynamic";
    }
    const selectRbCollision = this.container.querySelector("#select-rb-collision-mode") as HTMLSelectElement | null;
    if (selectRbCollision) {
      selectRbCollision.value = e.collisionMode ?? "dynamic";
    }
    const badgeRb = this.container.querySelector("#badge-rb-collision-mode");
    if (badgeRb) badgeRb.textContent = (e.collisionMode ?? "dynamic").toUpperCase();
    const velLabel = this.container.querySelector("#val-entity-linear-vel");
    if (velLabel) velLabel.textContent = `(${e.velocity.x.toFixed(2)}, ${e.velocity.y.toFixed(2)}) u/s`;

    const ccdThreshold = e.colliderModule?.ccdThresholdRatio ?? 0.5;
    this.setSliderVal("slide-ccd-threshold", "val-ccd-threshold", ccdThreshold, 2);


    // Character abilities sliders
    if (isChar && char) {
      if (char.walkingModule) {
        this.setSliderVal("slide-walk-force", "val-walk-force", char.walkingModule.maxWalkForce, 0);
        this.setSliderVal("slide-walk-speed", "val-walk-speed", char.walkingModule.maxWalkSpeed, 1);
        this.setSliderVal("slide-air-fric", "val-air-fric", char.walkingModule.airFriction, 2);
        const checkAir = this.container.querySelector("#check-walk-in-air") as HTMLInputElement;
        if (checkAir) checkAir.checked = Boolean(char.walkingModule.walkInAir);
      }
      this.setSliderVal("slide-strength", "val-strength", char.strength, 1);
      if (char.pickupModule) {
        this.setSliderVal("slide-pickup-reach", "val-pickup-reach", char.pickupModule.pickupReach, 1);
      }
      if (char.throwModule) {
        this.setSliderVal("slide-throw-force", "val-throw-force", char.throwModule.baseThrowForce, 1);
        this.setSliderVal("slide-throw-max-height", "val-throw-max-height", char.throwModule.maxThrowHeight, 1);
      }
      if (char.jumpModule) {
        this.setSliderVal("slide-jump-strength", "val-jump-strength", char.jumpModule.jumpStrength, 1);
        this.setSliderVal("slide-jump-max-speed", "val-jump-max-speed", char.jumpModule.maxInitialSpeed, 1);
      }
      if (char.wallEdgeAssistModule) {
        this.setSliderVal("slide-edge-hang", "val-edge-hang", char.wallEdgeAssistModule.hangDistance, 2);
      }
      if (char.climbingModule) {
        this.setSliderVal("slide-climb-adhesion", "val-climb-adhesion", char.climbingModule.maxAdhesion, 0);
        this.setSliderVal("slide-climb-speed", "val-climb-speed", char.climbingModule.maxClimbSpeed, 1);
      }
    }
  }

  /**
   * Dynamically renders module cards only for modules that exist on the selected entity.
   * Also populates the Add Behavior dropdown with all behaviors not yet attached.
   */
  public renderEntityModules(): void {
    const container = this.container.querySelector("#entity-modules-container") as HTMLElement;
    const addBtn = this.container.querySelector("#btn-add-behavior") as HTMLButtonElement;
    const dropdown = this.container.querySelector("#dropdown-add-behavior") as HTMLElement;
    if (!container || !addBtn || !dropdown) return;

    const e = this.selectedEntity;
    if (!e) {
      container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">No entity currently selected.<br><span style="font-size: 0.75rem; color: #64748b;">Press Spacebar or Controller (A) to spawn a player.</span></div>`;
      addBtn.style.display = "none";
      return;
    }
    addBtn.style.display = "flex";

    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    // Check which modules are attached and their enabled states
    const hasRigidbodyModule = Boolean(e.rigidbodyModule);
    const rbEnabled = Boolean(e.rigidbodyModule?.enabled);

    const hasColliderModule = Boolean(e.colliderModule);
    const colEnabled = Boolean(e.colliderModule?.enabled);

    const hasMass = e.hasMass;
    const massEnabled = Boolean(e.hasRigidbody && e.rigidbodyModule?.enabled && e.mass > 0);

    const hasFrictionModule = Boolean(e.frictionModule);
    const fricEnabled = Boolean(e.frictionModule?.enabled);

    const hasBounceModule = Boolean(e.bounceModule);
    const bounceEnabled = Boolean(e.bounceModule?.enabled);

    const hasVertPosModule = Boolean(e.verticalPositionModule);
    const vertPosEnabled = Boolean(e.verticalPositionModule?.enabled);

    const hasGravityModule = Boolean(e.gravityModule);
    const gravEnabled = Boolean(e.gravityModule?.enabled);

    const hasRollModule = Boolean(e.rollModule);
    const rollEnabled = Boolean(e.rollModule?.enabled);

    const hasWalkingModule = isChar && Boolean(char?.walkingModule);
    const walkEnabled = isChar && Boolean(char?.walkingModule?.enabled);

    const hasPickupModule = isChar && Boolean(char?.pickupModule);
    const pickupEnabled = isChar && Boolean(char?.pickupModule?.enabled);

    const hasThrowModule = isChar && Boolean(char?.throwModule);
    const throwEnabled = isChar && Boolean(char?.throwModule?.enabled);

    const hasJumpModule = isChar && Boolean(char?.jumpModule);
    const jumpEnabled = isChar && Boolean(char?.jumpModule?.enabled);

    const hasEdgeAssistModule = isChar && Boolean(char?.wallEdgeAssistModule);
    const edgeAssistEnabled = isChar && Boolean(char?.wallEdgeAssistModule?.enabled);

    const hasClimbingModule = isChar && Boolean(char?.climbingModule);
    const climbEnabled = isChar && Boolean(char?.climbingModule?.enabled);

    const hasHealthModule = Boolean(e.healthModule);
    const healthEnabled = Boolean(e.healthModule?.enabled);

    const hasDamageAuraModule = Boolean(e.damageAuraModule);
    const damageAuraEnabled = Boolean(e.damageAuraModule?.enabled);

    const hasDamageSolverModule = Boolean(e.damageSolverModule);
    const damageSolverEnabled = Boolean(e.damageSolverModule?.enabled);

    let html = "";
    let attachedCount = 0;

    // Helper to generate toggle button HTML
    const renderToggleBtn = (modId: string, isEnabled: boolean) => `
      <div style="display: flex; align-items: center; gap: 6px;">
        <button class="btn-toggle-module ${isEnabled ? 'active' : 'disabled'}" data-module-id="${modId}" title="${isEnabled ? 'Disable' : 'Enable'} this behavior">
          ${isEnabled ? '✓ Enabled' : '✕ Disabled'}
        </button>
        <button class="btn-remove-module" data-module-id="${modId}" title="Remove behavior from object">✕ Remove</button>
      </div>
    `;

    // 1. Rigidbody Module
    if (hasRigidbodyModule) {
      attachedCount++;
      const vertPosWarning = !hasVertPosModule
        ? `<div class="module-dep-warning" style="margin-top: 4px;">⚠️ Requires Vertical Position behavior</div>`
        : (!vertPosEnabled ? `<div class="module-dep-warning" style="margin-top: 4px;">⚠️ Inactive: Vertical Position behavior is disabled</div>` : '');

      html += `
        <div class="module-card ${!rbEnabled ? 'module-disabled' : ''}" data-module-id="rigidbody">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>⚙️ Rigidbody</label>
            ${renderToggleBtn("rigidbody", rbEnabled)}
          </div>
          ${!rbEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Rigidbody behavior is disabled</div>` : ''}
          <div style="font-size: 0.78rem; color: #94a3b8; margin: 4px 0 8px 0; display: flex; justify-content: space-between;">
            <span>Linear Velocity (vx, vy):</span>
            <span id="val-entity-linear-vel" style="font-family: monospace; color: #cbd5e1;">(${e.velocity.x.toFixed(2)}, ${e.velocity.y.toFixed(2)}) u/s</span>
          </div>
          <div class="slider-group" style="margin-bottom: 8px;">
            <div class="slider-label">
              <span>Collision Mode</span>
              <span id="badge-rb-collision-mode" class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.68rem;">${e.collisionMode.toUpperCase()}</span>
            </div>
            <select id="select-rb-collision-mode" class="dev-select" style="width: 100%;">
              <option value="dynamic" ${e.collisionMode === 'dynamic' ? 'selected' : ''}>Dynamic (Follows Velocity)</option>
              <option value="discrete" ${e.collisionMode === 'discrete' ? 'selected' : ''}>Force Discrete</option>
              <option value="continuous" ${e.collisionMode === 'continuous' ? 'selected' : ''}>Force Continuous Swept</option>
            </select>
          </div>
          <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.8rem; color: #e2e8f0;">Vertical Velocity</label>
            <button id="toggle-mod-vert-vel" class="btn-toggle ${e.hasVerticalVelocity && vertPosEnabled ? 'active' : ''}" ${!vertPosEnabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
              ${e.hasVerticalVelocity && vertPosEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          ${vertPosWarning}
          <div id="group-mod-vert-vel" style="display: ${e.hasVerticalVelocity && vertPosEnabled ? 'block' : 'none'}; margin-top: 6px;">
            <div class="slider-group">
              <div class="slider-label">
                <span>Vertical Velocity (u/s)</span>
                <span id="val-entity-vert-vel">${e.verticalVelocity.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-entity-vert-vel" min="-12" max="12" step="0.2" value="${e.verticalVelocity}">
            </div>
          </div>
          <div style="margin-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); padding-top: 6px;">
            <div id="prop-socket-mass"></div>
          </div>
        </div>
      `;
    }

    // 2. Collider Module
    if (hasColliderModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!colEnabled ? 'module-disabled' : ''}" data-module-id="collider">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🛡️ Collider</label>
            ${renderToggleBtn("collider", colEnabled)}
          </div>
          ${!colEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Collider behavior is disabled (passes through objects)</div>` : ''}
          <div id="prop-socket-collider-radius"></div>
        </div>
      `;
    }

    // 4. Friction Module
    if (hasFrictionModule) {
      attachedCount++;
      const fricMassWarning = !hasMass
        ? `<div class="module-dep-warning">⚠️ Requires Rigidbody Mass (no normal force calculation)</div>`
        : (!massEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Mass is zero or disabled</div>` : '');

      html += `
        <div class="module-card ${!fricEnabled ? 'module-disabled' : ''}" data-module-id="friction">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🛝 Friction</label>
            ${renderToggleBtn("friction", fricEnabled)}
          </div>
          ${!fricEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Friction behavior is disabled</div>` : ''}
          ${fricMassWarning}
          <div id="prop-socket-static-fric"></div>
          <div id="prop-socket-dynamic-fric"></div>
        </div>
      `;
    }

    // 5. Bounciness Module
    if (hasBounceModule) {
      attachedCount++;
      const bounceMassWarning = !hasMass
        ? `<div class="module-dep-warning">⚠️ Requires Rigidbody Mass (no restitution calculation)</div>`
        : (!massEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Mass is zero or disabled</div>` : '');

      const bounceVertWarning = e.bounceModule?.verticalBounce && (!e.hasVerticalVelocity || !vertPosEnabled)
        ? `<div class="module-dep-warning">⚠️ Vertical bounce inactive without Vertical Velocity / Vertical Position</div>`
        : '';

      html += `
        <div class="module-card ${!bounceEnabled ? 'module-disabled' : ''}" data-module-id="bounce">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🏀 Bounciness</label>
            ${renderToggleBtn("bounce", bounceEnabled)}
          </div>
          ${!bounceEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Bounciness behavior is disabled</div>` : ''}
          ${bounceMassWarning}
          <div id="prop-socket-bounce"></div>
          <div class="toggle-subrow" style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="check-mod-vert-bounce" ${e.bounceModule?.verticalBounce ? 'checked' : ''}>
              <span>Vertical Bounce</span>
            </label>
          </div>
          ${bounceVertWarning}
        </div>
      `;
    }

    // 6. Vertical Position Module
    if (hasVertPosModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!vertPosEnabled ? 'module-disabled' : ''}" data-module-id="verticalPosition">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>↕️ Vertical Position</label>
            ${renderToggleBtn("verticalPosition", vertPosEnabled)}
          </div>
          ${!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : ''}
          <div class="slider-group">
            <div class="slider-label">
              <span>Elevation (z)</span>
              <span id="val-entity-elevation">${e.position.z.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-elevation" min="0.0" max="4.0" step="0.05" value="${e.position.z}">
          </div>
        </div>
      `;
    }

    // 7. Gravity Module
    if (hasGravityModule) {
      attachedCount++;
      const gravVertWarning = !hasVertPosModule
        ? `<div class="module-dep-warning">⚠️ Requires Vertical Position behavior</div>`
        : (!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : '');

      html += `
        <div class="module-card ${!gravEnabled ? 'module-disabled' : ''}" data-module-id="gravity">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🪐 Gravity</label>
            ${renderToggleBtn("gravity", gravEnabled)}
          </div>
          ${!gravEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Gravity behavior is disabled</div>` : ''}
          ${gravVertWarning}
          <div class="module-detached-note" style="color: #94a3b8; font-style: normal;">
            Subject to downward gravitational acceleration (${this.arena.gravity.toFixed(1)} u/s²)
          </div>
        </div>
      `;
    }

    // 8. Roll Module
    if (hasRollModule) {
      attachedCount++;
      const rollFricWarning = !hasFrictionModule
        ? `<div class="module-dep-warning">ℹ️ Spin not resisted without Friction behavior</div>`
        : (!fricEnabled ? `<div class="module-dep-warning">ℹ️ Spin not resisted: Friction behavior is disabled</div>` : '');

      html += `
        <div class="module-card ${!rollEnabled ? 'module-disabled' : ''}" data-module-id="roll">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🔄 Roll</label>
            ${renderToggleBtn("roll", rollEnabled)}
          </div>
          ${!rollEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Roll behavior is disabled</div>` : ''}
          ${rollFricWarning}
          <div id="prop-socket-roll-resist"></div>
        </div>
      `;
    }

    // Character Abilities (when character is selected)
    if (isChar && char) {
      if (hasWalkingModule) {
        attachedCount++;
        const walkFricWarning = !hasFrictionModule
          ? `<div class="module-dep-warning">⚠️ Requires Friction behavior (feet slip without ground traction)</div>`
          : (!fricEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Friction behavior is disabled</div>` : '');

        const walkStrWarning = !char.hasStrength
          ? `<div class="module-dep-warning">⚠️ Requires Muscle Strength (cannot propel body)</div>`
          : '';

        html += `
          <div class="module-card ${!walkEnabled ? 'module-disabled' : ''}" data-module-id="walking">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🚶 Walking Ability</label>
              ${renderToggleBtn("walking", walkEnabled)}
            </div>
            ${!walkEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Walking Ability is disabled</div>` : ''}
            ${walkFricWarning}
            ${walkStrWarning}
            <div class="toggle-row" style="margin-top: 6px; margin-bottom: 4px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Air Control (Walk in Air)</span>
              <input type="checkbox" id="check-walk-in-air" ${char.walkingModule?.walkInAir ? 'checked' : ''}>
            </div>
            <div class="toggle-row" style="margin-top: 4px; margin-bottom: 4px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Can Sprint (Shift / Gamepad)</span>
              <input type="checkbox" id="check-can-sprint" ${char.walkingModule?.canSprint ? 'checked' : ''}>
            </div>
            <div id="prop-socket-walk-force"></div>
            <div id="prop-socket-walk-speed"></div>
            <div id="prop-socket-sprint-speed"></div>
            <div id="prop-socket-air-fric"></div>
            <div style="margin-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); padding-top: 6px;">
              <div id="prop-socket-strength"></div>
            </div>
            <div class="toggle-row" style="margin-top: 6px; margin-bottom: 2px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Walk Consumes Energy</span>
              <input type="checkbox" id="check-walk-energy" ${char.walkingModule?.walkConsumesEnergy ? 'checked' : ''}>
            </div>
            <div id="warn-walk-energy" class="module-dep-warning" style="display: ${char.walkingModule?.walkConsumesEnergy ? 'block' : 'none'}; margin-top: 2px;">
              ⚠️ Energy Busses not implemented yet (no energy will be deducted).
            </div>
            <div class="toggle-row" style="margin-top: 4px; margin-bottom: 2px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Sprint Consumes Energy</span>
              <input type="checkbox" id="check-sprint-energy" ${char.walkingModule?.sprintConsumesEnergy ? 'checked' : ''}>
            </div>
            <div id="warn-sprint-energy" class="module-dep-warning" style="display: ${char.walkingModule?.sprintConsumesEnergy ? 'block' : 'none'}; margin-top: 2px;">
              ⚠️ Energy Busses not implemented yet (no energy will be deducted).
            </div>
          </div>
        `;
      }

      if (hasPickupModule) {
        attachedCount++;
        html += `
          <div class="module-card ${!pickupEnabled ? 'module-disabled' : ''}" data-module-id="pickup">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>✋ Pickup Ability</label>
              ${renderToggleBtn("pickup", pickupEnabled)}
            </div>
            ${!pickupEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Pickup Ability is disabled</div>` : ''}
            <div id="prop-socket-pickup-reach"></div>
            <div class="toggle-row" style="margin-top: 6px; margin-bottom: 2px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Consumes Energy</span>
              <input type="checkbox" id="check-pickup-energy" ${char.pickupModule?.consumesEnergy ? 'checked' : ''}>
            </div>
            <div id="warn-pickup-energy" class="module-dep-warning" style="display: ${char.pickupModule?.consumesEnergy ? 'block' : 'none'}; margin-top: 2px;">
              ⚠️ Energy Busses not implemented yet (no energy will be deducted).
            </div>
          </div>
        `;
      }

      if (hasThrowModule) {
        attachedCount++;
        const throwStrWarning = !char.hasStrength
          ? `<div class="module-dep-warning">⚠️ Requires Muscle Strength (cannot launch objects)</div>`
          : '';

        html += `
          <div class="module-card ${!throwEnabled ? 'module-disabled' : ''}" data-module-id="throw">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🎯 Throw Ability</label>
              ${renderToggleBtn("throw", throwEnabled)}
            </div>
            ${!throwEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Throw Ability is disabled</div>` : ''}
            ${throwStrWarning}
            <div id="prop-socket-throw-force"></div>
            <div id="prop-socket-throw-max-height"></div>
            <div class="toggle-row" style="margin-top: 6px; margin-bottom: 2px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Consumes Energy</span>
              <input type="checkbox" id="check-throw-energy" ${char.throwModule?.consumesEnergy ? 'checked' : ''}>
            </div>
            <div id="warn-throw-energy" class="module-dep-warning" style="display: ${char.throwModule?.consumesEnergy ? 'block' : 'none'}; margin-top: 2px;">
              ⚠️ Energy Busses not implemented yet (no energy will be deducted).
            </div>
          </div>
        `;
      }

      if (hasJumpModule) {
        attachedCount++;
        const jumpVertWarning = !hasVertPosModule
          ? `<div class="module-dep-warning">⚠️ Requires Vertical Position (3D Z-axis)</div>`
          : (!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : '');

        html += `
          <div class="module-card ${!jumpEnabled ? 'module-disabled' : ''}" data-module-id="jump">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🦘 Jump Ability</label>
              ${renderToggleBtn("jump", jumpEnabled)}
            </div>
            ${!jumpEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Jump Ability is disabled</div>` : ''}
            ${jumpVertWarning}
            <div id="prop-socket-jump-strength"></div>
            <div id="prop-socket-jump-max-speed"></div>
            <div class="toggle-row" style="margin-top: 6px; margin-bottom: 2px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Consumes Energy</span>
              <input type="checkbox" id="check-jump-energy" ${char.jumpConsumesEnergy ? 'checked' : ''}>
            </div>
            <div id="warn-jump-energy" class="module-dep-warning" style="display: ${char.jumpConsumesEnergy ? 'block' : 'none'}; margin-top: 2px;">
              ⚠️ Energy Busses not implemented yet (no energy will be deducted).
            </div>
          </div>
        `;
      }

      if (hasEdgeAssistModule) {
        attachedCount++;
        html += `
          <div class="module-card ${!edgeAssistEnabled ? 'module-disabled' : ''}" data-module-id="wallEdgeAssist">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🛡️ Wall Edge Assist</label>
              ${renderToggleBtn("wallEdgeAssist", edgeAssistEnabled)}
            </div>
            ${!edgeAssistEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Wall Edge Assist is disabled</div>` : ''}
            <div class="toggle-row" style="margin-bottom: 8px;">
              <label style="font-size: 0.8rem;">Prevent Walk-Off</label>
              <button id="toggle-edge-walkoff" class="btn-toggle ${char.wallEdgeAssistModule?.preventWalkOff ? 'active' : ''}">
                ${char.wallEdgeAssistModule?.preventWalkOff ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div id="prop-socket-edge-hang"></div>
          </div>
        `;
      }

      if (hasClimbingModule) {
        attachedCount++;
        const climbVertWarning = !hasVertPosModule
          ? `<div class="module-dep-warning">⚠️ Requires Vertical Position (3D Z-axis)</div>`
          : (!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : '');

        const climbStrWarning = !char.hasStrength
          ? `<div class="module-dep-warning">⚠️ Requires Muscle Strength to climb</div>`
          : '';

        html += `
          <div class="module-card ${!climbEnabled ? 'module-disabled' : ''}" data-module-id="climbing">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🧗 Climbing Ability</label>
              ${renderToggleBtn("climbing", climbEnabled)}
            </div>
            ${!climbEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Climbing Ability is disabled</div>` : ''}
            ${climbVertWarning}
            ${climbStrWarning}
            <div class="toggle-row" style="margin-bottom: 8px;">
              <label style="font-size: 0.8rem;">Sideways Climb</label>
              <button id="toggle-climb-sideways" class="btn-toggle ${char.climbingModule?.horizontalClimb ? 'active' : ''}">
                ${char.climbingModule?.horizontalClimb ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div id="prop-socket-climb-adhesion"></div>
            <div id="prop-socket-climb-speed"></div>
            <div class="toggle-row" style="margin-top: 6px; margin-bottom: 2px;">
              <span style="font-size: 0.8rem; color: #cbd5e1;">Consumes Energy</span>
              <input type="checkbox" id="check-climb-energy" ${char.climbingModule?.consumesEnergy ? 'checked' : ''}>
            </div>
            <div id="warn-climb-energy" class="module-dep-warning" style="display: ${char.climbingModule?.consumesEnergy ? 'block' : 'none'}; margin-top: 2px;">
              ⚠️ Energy Busses not implemented yet (no energy will be deducted).
            </div>
          </div>
        `;
      }
    }

    // Health & Vitality Module (Any entity can have Health)
    if (hasHealthModule && e.healthModule) {
      attachedCount++;
      const hm = e.healthModule;
      html += `
        <div class="module-card ${!healthEnabled ? 'module-disabled' : ''}" data-module-id="health">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>❤️ Health & Vitality</label>
            ${renderToggleBtn("health", healthEnabled)}
          </div>
          ${!healthEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Health & Vitality is disabled</div>` : ''}
          <div style="font-size: 0.78rem; color: #94a3b8; margin: 4px 0 6px 0; display: flex; justify-content: space-between;">
            <span>Current Status:</span>
            <span id="val-entity-health-status" style="font-family: monospace; font-weight: 600; color: ${hm.currentHp < hm.maxHp * 0.3 ? '#ef4444' : (hm.currentHp < hm.maxHp * 0.6 ? '#f59e0b' : '#22c55e')};">
              ${hm.currentHp.toFixed(1)} / ${hm.maxHp.toFixed(1)} HP (${((hm.currentHp / Math.max(0.1, hm.maxHp)) * 100).toFixed(0)}%)
            </span>
          </div>

          <div id="prop-socket-health-cur"></div>
          <div id="prop-socket-health-max"></div>
          <div id="prop-socket-health-healrate"></div>

          <div class="toggle-row" style="margin-top: 6px; margin-bottom: 2px;">
            <span style="font-size: 0.8rem; color: #cbd5e1;">Healing Consumes Energy</span>
            <input type="checkbox" id="check-health-energy" ${hm.consumesEnergy ? 'checked' : ''}>
          </div>
          <div id="warn-health-energy" class="module-dep-warning" style="display: ${hm.consumesEnergy ? 'block' : 'none'}; margin-top: 2px;">
            ⚠️ Energy Busses not implemented yet (healing functions without drawing energy).
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 8px;">
            <button id="btn-health-sub10" class="btn-secondary-action" style="padding: 4px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">
              -10 Dmg
            </button>
            <button id="btn-health-add10" class="btn-secondary-action" style="padding: 4px; font-size: 0.75rem; color: #22c55e; border-color: rgba(34, 197, 94, 0.4);">
              +10 Heal
            </button>
            <button id="btn-health-kill" class="btn-secondary-action" style="padding: 4px; font-size: 0.75rem; color: #dc2626; border-color: rgba(220, 38, 38, 0.4);">
              💀 Kill (0 HP)
            </button>
            <button id="btn-health-full" class="btn-secondary-action" style="padding: 4px; font-size: 0.75rem; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">
              ✨ Full HP
            </button>
          </div>
        </div>
      `;
    }

    // Damage Aura Module (Any entity can radiate damage)
    if (hasDamageAuraModule && e.damageAuraModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!damageAuraEnabled ? 'module-disabled' : ''}" data-module-id="damageAura">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>☣️ Damage Aura</label>
            ${renderToggleBtn("damageAura", damageAuraEnabled)}
          </div>
          ${!damageAuraEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Damage Aura is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Radiates continuous damage in a 3D spherical radius to all entities with a Health behavior.
          </div>
          <div id="prop-socket-aura-radius"></div>
          <div id="prop-socket-aura-rate"></div>
        </div>
      `;
    }

    // Damage Solver & Armor Module
    if (hasDamageSolverModule && e.damageSolverModule) {
      attachedCount++;
      const healthWarning = !hasHealthModule
        ? `<div class="module-dep-warning">⚠️ Inactive: Requires Health & Vitality behavior</div>`
        : '';
      html += `
        <div class="module-card ${!damageSolverEnabled ? 'module-disabled' : ''}" data-module-id="damageSolver">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🛡️ Damage Solver & Armor</label>
            ${renderToggleBtn("damageSolver", damageSolverEnabled)}
          </div>
          ${!damageSolverEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Damage Solver is disabled</div>` : ''}
          ${healthWarning}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Converts physical impacts, wall collisions, and collisions with freebodies into shock damage.
          </div>
          <div id="prop-socket-impact-susceptibility"></div>
          <div id="prop-socket-min-shock-thresh"></div>
        </div>
      `;
    }

    if (attachedCount === 0) {
      html = `
        <div class="empty-behaviors-msg">
          No physical behaviors attached to this object.<br>
          Click <strong>Add Behavior</strong> below to add one.
        </div>
      `;
    }

    container.innerHTML = html;

    // Available behaviors list (only behaviors NOT yet added)
    interface ModuleInfo {
      id: string;
      name: string;
      icon: string;
      description: string;
      isAttached: boolean;
    }

    const allModules: ModuleInfo[] = [
      { id: "rigidbody", name: "Rigidbody", icon: "⚙️", description: "Linear velocity, mass, vertical velocity, motion integration & collision mode", isAttached: hasRigidbodyModule },
      { id: "collider", name: "Collider", icon: "🛡️", description: "Solid physical bounds & collision with walls and entities", isAttached: hasColliderModule },
      { id: "friction", name: "Friction", icon: "🛝", description: "Ground friction, stopping resistance, and deceleration", isAttached: hasFrictionModule },
      { id: "bounce", name: "Bounciness", icon: "🏀", description: "Elastic restitution on collisions and impacts", isAttached: hasBounceModule },
      { id: "verticalPosition", name: "Vertical Position", icon: "↕️", description: "3D elevation (z-axis) and spatial altitude coordinates", isAttached: hasVertPosModule },
      { id: "gravity", name: "Gravity", icon: "🪐", description: "Downward gravitational acceleration toward ground", isAttached: hasGravityModule },
      { id: "roll", name: "Roll", icon: "🔄", description: "3D angular rotation and rolling resistance", isAttached: hasRollModule },
      { id: "health", name: "Health & Vitality", icon: "❤️", description: "Hit points, passive health regeneration, and death / respawn loop", isAttached: hasHealthModule },
      { id: "damageAura", name: "Damage Aura", icon: "☣️", description: "Radiates continuous damage in a 3D spherical radius to living entities", isAttached: hasDamageAuraModule },
      { id: "damageSolver", name: "Damage Solver & Armor", icon: "🛡️", description: "Converts blunt physical impacts and wall collisions into HP damage", isAttached: hasDamageSolverModule },
    ];

    if (isChar) {
      allModules.push(
        { id: "walking", name: "Walking Ability", icon: "🚶", description: "Propulsion acceleration, muscle strength, and maximum ground speed", isAttached: hasWalkingModule },
        { id: "pickup", name: "Pickup Ability", icon: "✋", description: "3D sphere reach to pick up and swap freebodies", isAttached: hasPickupModule },
        { id: "throw", name: "Throw Ability", icon: "🎯", description: "Ballistic parabolic trajectory projection & launch", isAttached: hasThrowModule },
        { id: "jump", name: "Jump Ability", icon: "🦘", description: "Vertical leap triggered with Space / Gamepad (A)", isAttached: hasJumpModule },
        { id: "wallEdgeAssist", name: "Wall Edge Assist", icon: "🛡️", description: "Ledge guardrail preventing accidental walk-off on wall tops", isAttached: hasEdgeAssistModule },
        { id: "climbing", name: "Climbing Ability", icon: "🧗", description: "Wall mounting, adhesive grip, and vertical climb traversal", isAttached: hasClimbingModule }
      );
    }

    const unattached = allModules.filter(m => !m.isAttached);

    if (unattached.length === 0) {
      addBtn.innerHTML = `<span>✓</span> All Behaviors Added`;
      addBtn.disabled = true;
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
    } else {
      addBtn.innerHTML = `<span>➕</span> Add Behavior (${unattached.length} available)`;
      addBtn.disabled = false;
      dropdown.innerHTML = unattached.map(m => `
        <button class="add-behavior-item" data-module-id="${m.id}" type="button">
          <span class="add-behavior-item-icon">${m.icon}</span>
          <div style="display: flex; flex-direction: column; text-align: left;">
            <span style="font-weight: 600; font-size: 0.82rem; color: #e2e8f0;">${m.name}</span>
            <span class="add-behavior-item-desc">${m.description}</span>
          </div>
        </button>
      `).join("");
    }

    // Wire up Remove buttons
    container.querySelectorAll(".btn-remove-module").forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const modId = (btn as HTMLElement).dataset.moduleId;
        if (!modId) return;
        this.removeModuleFromSelectedEntity(modId);
      });
    });

    // Wire up Enable/Disable toggle buttons
    container.querySelectorAll(".btn-toggle-module").forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const modId = (btn as HTMLElement).dataset.moduleId;
        if (!modId) return;
        this.toggleModuleEnabled(modId);
      });
    });

    // Wire up Add items
    dropdown.querySelectorAll(".add-behavior-item").forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const modId = (btn as HTMLElement).dataset.moduleId;
        if (!modId) return;
        dropdown.style.display = "none";
        this.addModuleToSelectedEntity(modId);
      });
    });

    // Bind controls on newly rendered cards
    this.bindDynamicModuleControls();
  }

  private toggleModuleEnabled(modId: string): void {
    const e = this.selectedEntity;
    if (!e) return;
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    switch (modId) {
      case "rigidbody":
        if (e.rigidbodyModule) e.rigidbodyModule.enabled = !e.rigidbodyModule.enabled;
        break;
      case "collider":
        if (e.colliderModule) e.colliderModule.enabled = !e.colliderModule.enabled;
        break;
      case "friction":
        if (e.frictionModule) e.frictionModule.enabled = !e.frictionModule.enabled;
        break;
      case "bounce":
        if (e.bounceModule) e.bounceModule.enabled = !e.bounceModule.enabled;
        break;
      case "verticalPosition":
        if (e.verticalPositionModule) e.verticalPositionModule.enabled = !e.verticalPositionModule.enabled;
        break;
      case "gravity":
        if (e.gravityModule) e.gravityModule.enabled = !e.gravityModule.enabled;
        break;
      case "roll":
        if (e.rollModule) e.rollModule.enabled = !e.rollModule.enabled;
        break;
      case "walking":
        if (char?.walkingModule) char.walkingModule.enabled = !char.walkingModule.enabled;
        break;
      case "pickup":
        if (char?.pickupModule) char.pickupModule.enabled = !char.pickupModule.enabled;
        break;
      case "throw":
        if (char?.throwModule) char.throwModule.enabled = !char.throwModule.enabled;
        break;
      case "jump":
        if (char?.jumpModule) char.jumpModule.enabled = !char.jumpModule.enabled;
        break;
      case "wallEdgeAssist":
        if (char?.wallEdgeAssistModule) char.wallEdgeAssistModule.enabled = !char.wallEdgeAssistModule.enabled;
        break;
      case "climbing":
        if (char?.climbingModule) char.climbingModule.enabled = !char.climbingModule.enabled;
        break;
      case "health":
        if (e.healthModule) e.healthModule.enabled = !e.healthModule.enabled;
        break;
      case "damageAura":
        if (e.damageAuraModule) e.damageAuraModule.enabled = !e.damageAuraModule.enabled;
        break;
      case "damageSolver":
        if (e.damageSolverModule) e.damageSolverModule.enabled = !e.damageSolverModule.enabled;
        break;
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
  }

  private removeModuleFromSelectedEntity(modId: string): void {
    const e = this.selectedEntity;
    switch (modId) {
      case "rigidbody":
        e.rigidbodyModule = null;
        break;
      case "collider":
        e.colliderModule = null;
        break;
      case "friction":
        e.frictionModule = null;
        break;
      case "bounce":
        e.bounceModule = null;
        break;
      case "verticalPosition":
        e.verticalPositionModule = null;
        e.position.z = 0;
        e.verticalVelocity = 0;
        e.supportingSurfaceHeight = 0;
        break;
      case "gravity":
        e.gravityModule = null;
        break;
      case "roll":
        e.rollModule = null;
        break;
      case "walking":
        if (e instanceof Character) {
          const char = e as Character;
          char.walkingModule = null;
          char.isActivelyWalking = false;
          char.isSprinting = false;
        }
        break;
      case "pickup":
        if (e instanceof Character) {
          const char = e as Character;
          if (char.heldObject) {
            char.pickupModule?.drop(char);
          }
          char.pickupModule = null;
        }
        break;
      case "throw":
        if (e instanceof Character) {
          (e as Character).throwModule = null;
        }
        break;
      case "jump":
        if (e instanceof Character) {
          (e as Character).jumpModule = null;
        }
        break;
      case "wallEdgeAssist":
        if (e instanceof Character) {
          (e as Character).wallEdgeAssistModule = null;
        }
        break;
      case "climbing":
        if (e instanceof Character) {
          const char = e as Character;
          char.climbingModule = null;
          char.isClimbing = false;
        }
        break;
      case "health":
        e.healthModule = null;
        break;
      case "damageAura":
        e.damageAuraModule = null;
        break;
      case "damageSolver":
        e.damageSolverModule = null;
        break;
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
  }

  private addModuleToSelectedEntity(modId: string): void {
    const e = this.selectedEntity;
    switch (modId) {
      case "rigidbody":
        e.rigidbodyModule = new RigidbodyModule({
          velocity: { x: 0, y: 0 },
          hasVerticalVelocity: true,
          verticalVelocity: 0,
          collisionMode: "dynamic",
          enabled: true,
        });
        break;
      case "collider":
        e.colliderModule = new ColliderModule({ radius: 0.32 });
        break;
      case "friction":
        e.frictionModule = new FrictionModule();
        break;
      case "bounce":
        e.bounceModule = new BounceModule({ bounceMod: 0.4 });
        break;
      case "verticalPosition":
        e.verticalPositionModule = new VerticalPositionModule({
          z: e.position.z,
          hasVerticalVelocity: true,
          verticalVelocity: 0,
          enabled: true,
        });
        break;
      case "gravity":
        e.gravityModule = new GravityModule();
        break;
      case "roll":
        e.rollModule = new RollModule({ rollResistance: 0.4 });
        break;
      case "walking":
        if (e instanceof Character) {
          (e as Character).walkingModule = new WalkingModule();
        }
        break;
      case "pickup":
        if (e instanceof Character) {
          (e as Character).pickupModule = new PickupModule();
        }
        break;
      case "throw":
        if (e instanceof Character) {
          (e as Character).throwModule = new ThrowModule();
        }
        break;
      case "jump":
        if (e instanceof Character) {
          (e as Character).jumpModule = new JumpModule();
        }
        break;
      case "wallEdgeAssist":
        if (e instanceof Character) {
          (e as Character).wallEdgeAssistModule = new WallEdgeAssistModule();
        }
        break;
      case "climbing":
        if (e instanceof Character) {
          (e as Character).climbingModule = new ClimbingModule();
        }
        break;
      case "health":
        e.healthModule = new HealthModule({
          baseMaxHp: 100,
          maxHp: 100,
          currentHp: 100,
          baseMaxHealRate: 10,
          maxHealRate: 10,
        });
        break;
      case "damageAura":
        e.damageAuraModule = new DamageAuraModule({
          damageRadius: 2.0,
          damageRate: 20.0,
        });
        break;
      case "damageSolver":
        e.damageSolverModule = new DamageSolverModule({
          impactSusceptibility: 1.0,
          damageThresholdHp: 5.0,
        });
        break;
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
  }

  private bindDynamicModuleControls(): void {
    const e = this.selectedEntity;
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    // Rigidbody
    const selectRbCollision = this.container.querySelector("#select-rb-collision-mode") as HTMLSelectElement | null;
    selectRbCollision?.addEventListener("change", () => {
      e.collisionMode = selectRbCollision.value as "discrete" | "continuous" | "dynamic";
      const selectEntityCollision = this.container.querySelector("#select-entity-collision-mode") as HTMLSelectElement | null;
      if (selectEntityCollision) selectEntityCollision.value = e.collisionMode;
      const badge = this.container.querySelector("#badge-rb-collision-mode");
      if (badge) badge.textContent = e.collisionMode.toUpperCase();
      this.updateInspector();
    });

    const btnVertVel = this.container.querySelector("#toggle-mod-vert-vel") as HTMLButtonElement;
    btnVertVel?.addEventListener("click", () => {
      if (!e.hasVerticalPosition) return;
      if (e.rigidbodyModule) {
        e.rigidbodyModule.hasVerticalVelocity = !e.rigidbodyModule.hasVerticalVelocity;
        if (!e.rigidbodyModule.hasVerticalVelocity) {
          e.verticalVelocity = 0;
        }
      }
      if (e.verticalPositionModule) {
        e.verticalPositionModule.hasVerticalVelocity = Boolean(e.rigidbodyModule?.hasVerticalVelocity);
      }
      this.renderEntityModules();
      this.updateInspector();
    });

    this.setupSlider("slide-entity-vert-vel", "val-entity-vert-vel", (val) => {
      e.verticalVelocity = val;
    }, 2);

    // Collider
    // Collider Radius (Dynamic Property Socket)
    const colRadSocketEl = this.container.querySelector("#prop-socket-collider-radius");
    if (colRadSocketEl && e.colliderModule) {
      const colCtrl = new PropertyControl({
        property: e.colliderModule.radiusProp,
        owner: e,
        label: "Collider Radius (u)",
        step: 0.02,
      });
      colRadSocketEl.appendChild(colCtrl.element);
    }

    // Mass (Dynamic Property Socket inside Rigidbody)
    const massSocketEl = this.container.querySelector("#prop-socket-mass");
    if (massSocketEl && e.rigidbodyModule) {
      const massCtrl = new PropertyControl({
        property: e.rigidbodyModule.massProp,
        owner: e,
        label: "Mass (kg)",
        step: 0.1,
      });
      massSocketEl.appendChild(massCtrl.element);
    }

    // Friction (Dynamic Property Sockets)
    const staticFricSocketEl = this.container.querySelector("#prop-socket-static-fric");
    if (staticFricSocketEl && e.frictionModule) {
      const sfCtrl = new PropertyControl({
        property: e.frictionModule.staticFrictionProp,
        owner: e,
        label: "Static Friction Mod",
        step: 0.05,
      });
      staticFricSocketEl.appendChild(sfCtrl.element);
    }
    const dynFricSocketEl = this.container.querySelector("#prop-socket-dynamic-fric");
    if (dynFricSocketEl && e.frictionModule) {
      const dfCtrl = new PropertyControl({
        property: e.frictionModule.dynamicFrictionProp,
        owner: e,
        label: "Dynamic Friction Mod",
        step: 0.05,
      });
      dynFricSocketEl.appendChild(dfCtrl.element);
    }

    // Bounce (Dynamic Property Socket)
    const bounceSocketEl = this.container.querySelector("#prop-socket-bounce");
    if (bounceSocketEl && e.bounceModule) {
      const bCtrl = new PropertyControl({
        property: e.bounceModule.bounceModProp,
        owner: e,
        label: "Bounciness (Restitution)",
        step: 0.05,
      });
      bounceSocketEl.appendChild(bCtrl.element);
    }
    const checkVertBounce = this.container.querySelector("#check-mod-vert-bounce") as HTMLInputElement;
    checkVertBounce?.addEventListener("change", () => {
      if (e.bounceModule) {
        e.bounceModule.verticalBounce = checkVertBounce.checked;
      }
      this.syncEntitySliders();
      this.updateInspector();
    });

    // Vertical Position
    this.setupSlider("slide-entity-elevation", "val-entity-elevation", (val) => {
      if (e.verticalPositionModule) {
        e.verticalPositionModule.z = val;
      }
      e.position.z = val;
      this.syncEntitySliders();
      this.updateInspector();
    }, 2);

    // Roll Resistance (Dynamic Property Socket)
    const rollResistSocketEl = this.container.querySelector("#prop-socket-roll-resist");
    if (rollResistSocketEl && e.rollModule) {
      const rollCtrl = new PropertyControl({
        property: e.rollModule.rollResistanceProp,
        owner: e,
        label: "Roll Resistance (u/s²)",
        step: 0.05,
      });
      rollResistSocketEl.appendChild(rollCtrl.element);
    }

    // Character Abilities
    if (isChar && char) {
      const checkWalkInAir = this.container.querySelector("#check-walk-in-air") as HTMLInputElement;
      checkWalkInAir?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.walkInAir = checkWalkInAir.checked;
        }
      });

      const canSprintCheck = this.container.querySelector("#check-can-sprint") as HTMLInputElement;
      canSprintCheck?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.canSprint = canSprintCheck.checked;
        }
      });

      // Walking sockets
      const walkForceSocketEl = this.container.querySelector("#prop-socket-walk-force");
      if (walkForceSocketEl && char.walkingModule) {
        const wfCtrl = new PropertyControl({
          property: char.walkingModule.maxWalkForceProp,
          owner: char,
          label: "Max Walk Force (N)",
          step: 1.0,
        });
        walkForceSocketEl.appendChild(wfCtrl.element);
      }
      const walkSpeedSocketEl = this.container.querySelector("#prop-socket-walk-speed");
      if (walkSpeedSocketEl && char.walkingModule) {
        const wsCtrl = new PropertyControl({
          property: char.walkingModule.maxWalkSpeedProp,
          owner: char,
          label: "Max Walk Speed (u/s)",
          step: 0.2,
        });
        walkSpeedSocketEl.appendChild(wsCtrl.element);
      }
      const sprintSpeedSocketEl = this.container.querySelector("#prop-socket-sprint-speed");
      if (sprintSpeedSocketEl && char.walkingModule) {
        const ssCtrl = new PropertyControl({
          property: char.walkingModule.maxSprintSpeedProp,
          owner: char,
          label: "Max Sprint Speed (u/s)",
          step: 0.2,
        });
        sprintSpeedSocketEl.appendChild(ssCtrl.element);
      }
      const airFricSocketEl = this.container.querySelector("#prop-socket-air-fric");
      if (airFricSocketEl && char.walkingModule) {
        const afCtrl = new PropertyControl({
          property: char.walkingModule.airFrictionProp,
          owner: char,
          label: "Air / Floating Friction",
          step: 0.05,
        });
        airFricSocketEl.appendChild(afCtrl.element);
      }

      // Energy consumption checkboxes
      const checkWalkEnergy = this.container.querySelector("#check-walk-energy") as HTMLInputElement;
      checkWalkEnergy?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.walkConsumesEnergy = checkWalkEnergy.checked;
          const warn = this.container.querySelector("#warn-walk-energy") as HTMLElement;
          if (warn) warn.style.display = checkWalkEnergy.checked ? "block" : "none";
        }
      });
      const checkSprintEnergy = this.container.querySelector("#check-sprint-energy") as HTMLInputElement;
      checkSprintEnergy?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.sprintConsumesEnergy = checkSprintEnergy.checked;
          const warn = this.container.querySelector("#warn-sprint-energy") as HTMLElement;
          if (warn) warn.style.display = checkSprintEnergy.checked ? "block" : "none";
        }
      });

      // Strength (Dynamic Property Socket)
      const strSocketEl = this.container.querySelector("#prop-socket-strength");
      if (strSocketEl) {
        const strCtrl = new PropertyControl({
          property: char.strengthProp,
          owner: char,
          label: "Muscle Strength Ratio (×)",
          step: 0.1,
        });
        strSocketEl.appendChild(strCtrl.element);
      }

      // Pickup socket
      const pickupReachSocketEl = this.container.querySelector("#prop-socket-pickup-reach");
      if (pickupReachSocketEl && char.pickupModule) {
        const prCtrl = new PropertyControl({
          property: char.pickupModule.pickupReachProp,
          owner: char,
          label: "Pickup Reach (3D) (u)",
          step: 0.1,
        });
        pickupReachSocketEl.appendChild(prCtrl.element);
      }
      const checkPickupEnergy = this.container.querySelector("#check-pickup-energy") as HTMLInputElement;
      checkPickupEnergy?.addEventListener("change", () => {
        if (char.pickupModule) {
          char.pickupModule.consumesEnergy = checkPickupEnergy.checked;
          const warn = this.container.querySelector("#warn-pickup-energy") as HTMLElement;
          if (warn) warn.style.display = checkPickupEnergy.checked ? "block" : "none";
        }
      });

      // Throw sockets
      const throwForceSocketEl = this.container.querySelector("#prop-socket-throw-force");
      if (throwForceSocketEl && char.throwModule) {
        const tfCtrl = new PropertyControl({
          property: char.throwModule.baseThrowForceProp,
          owner: char,
          label: "Base Throw Power (u/s)",
          step: 0.5,
        });
        throwForceSocketEl.appendChild(tfCtrl.element);
      }
      const throwHeightSocketEl = this.container.querySelector("#prop-socket-throw-max-height");
      if (throwHeightSocketEl && char.throwModule) {
        const thCtrl = new PropertyControl({
          property: char.throwModule.maxThrowHeightProp,
          owner: char,
          label: "Max Throw Height (u)",
          step: 0.5,
        });
        throwHeightSocketEl.appendChild(thCtrl.element);
      }
      const checkThrowEnergy = this.container.querySelector("#check-throw-energy") as HTMLInputElement;
      checkThrowEnergy?.addEventListener("change", () => {
        if (char.throwModule) {
          char.throwModule.consumesEnergy = checkThrowEnergy.checked;
          const warn = this.container.querySelector("#warn-throw-energy") as HTMLElement;
          if (warn) warn.style.display = checkThrowEnergy.checked ? "block" : "none";
        }
      });

      // Jump sockets
      const jumpStrSocketEl = this.container.querySelector("#prop-socket-jump-strength");
      if (jumpStrSocketEl && char.jumpModule) {
        const jsCtrl = new PropertyControl({
          property: char.jumpModule.jumpStrengthProp,
          owner: char,
          label: "Jump Strength (N·s)",
          step: 0.5,
        });
        jumpStrSocketEl.appendChild(jsCtrl.element);
      }
      const jumpSpeedSocketEl = this.container.querySelector("#prop-socket-jump-max-speed");
      if (jumpSpeedSocketEl && char.jumpModule) {
        const jspCtrl = new PropertyControl({
          property: char.jumpModule.maxInitialSpeedProp,
          owner: char,
          label: "Max Takeoff Speed (u/s)",
          step: 0.1,
        });
        jumpSpeedSocketEl.appendChild(jspCtrl.element);
      }
      const checkJumpEnergy = this.container.querySelector("#check-jump-energy") as HTMLInputElement;
      checkJumpEnergy?.addEventListener("change", () => {
        char.jumpConsumesEnergy = checkJumpEnergy.checked;
        const warn = this.container.querySelector("#warn-jump-energy") as HTMLElement;
        if (warn) warn.style.display = checkJumpEnergy.checked ? "block" : "none";
      });

      // Wall Edge Assist
      const btnEdgeWalkOff = this.container.querySelector("#toggle-edge-walkoff") as HTMLButtonElement;
      btnEdgeWalkOff?.addEventListener("click", () => {
        if (char.wallEdgeAssistModule) {
          char.wallEdgeAssistModule.preventWalkOff = !char.wallEdgeAssistModule.preventWalkOff;
          btnEdgeWalkOff.classList.toggle("active", char.wallEdgeAssistModule.preventWalkOff);
          btnEdgeWalkOff.textContent = char.wallEdgeAssistModule.preventWalkOff ? "Active" : "Inactive";
        }
      });
      const edgeHangSocketEl = this.container.querySelector("#prop-socket-edge-hang");
      if (edgeHangSocketEl && char.wallEdgeAssistModule) {
        const ehCtrl = new PropertyControl({
          property: char.wallEdgeAssistModule.hangDistanceProp,
          owner: char,
          label: "Ledge Hang Distance (u)",
          step: 0.01,
        });
        edgeHangSocketEl.appendChild(ehCtrl.element);
      }

      // Climbing
      const btnClimbSideways = this.container.querySelector("#toggle-climb-sideways") as HTMLButtonElement;
      btnClimbSideways?.addEventListener("click", () => {
        if (char.climbingModule) {
          char.climbingModule.horizontalClimb = !char.climbingModule.horizontalClimb;
          btnClimbSideways.classList.toggle("active", char.climbingModule.horizontalClimb);
          btnClimbSideways.textContent = char.climbingModule.horizontalClimb ? "Active" : "Inactive";
        }
      });
      const climbAdhesionSocketEl = this.container.querySelector("#prop-socket-climb-adhesion");
      if (climbAdhesionSocketEl && char.climbingModule) {
        const caCtrl = new PropertyControl({
          property: char.climbingModule.maxAdhesionProp,
          owner: char,
          label: "Max Adhesion (N)",
          step: 5.0,
        });
        climbAdhesionSocketEl.appendChild(caCtrl.element);
      }
      const climbSpeedSocketEl = this.container.querySelector("#prop-socket-climb-speed");
      if (climbSpeedSocketEl && char.climbingModule) {
        const csCtrl = new PropertyControl({
          property: char.climbingModule.maxClimbSpeedProp,
          owner: char,
          label: "Max Climb Speed (u/s)",
          step: 0.1,
        });
        climbSpeedSocketEl.appendChild(csCtrl.element);
      }
      const checkClimbEnergy = this.container.querySelector("#check-climb-energy") as HTMLInputElement;
      checkClimbEnergy?.addEventListener("change", () => {
        if (char.climbingModule) {
          char.climbingModule.consumesEnergy = checkClimbEnergy.checked;
          const warn = this.container.querySelector("#warn-climb-energy") as HTMLElement;
          if (warn) warn.style.display = checkClimbEnergy.checked ? "block" : "none";
        }
      });
    }

    // Health & Vitality Module controls (applicable to any entity)
    if (e.healthModule) {
      const hm = e.healthModule;

      const hpCurSocketEl = this.container.querySelector("#prop-socket-health-cur");
      if (hpCurSocketEl) {
        const curCtrl = new PropertyControl({
          property: hm.currentHpProp,
          owner: e,
          label: "Current Health (HP)",
          step: 1.0,
        });
        hpCurSocketEl.appendChild(curCtrl.element);
      }

      const hpMaxSocketEl = this.container.querySelector("#prop-socket-health-max");
      if (hpMaxSocketEl) {
        const maxCtrl = new PropertyControl({
          property: hm.maxHpProp,
          owner: e,
          label: "Max Health (HP)",
          step: 5.0,
        });
        hpMaxSocketEl.appendChild(maxCtrl.element);
      }

      const hpHealSocketEl = this.container.querySelector("#prop-socket-health-healrate");
      if (hpHealSocketEl) {
        const hrCtrl = new PropertyControl({
          property: hm.maxHealRateProp,
          owner: e,
          label: "Passive Heal Rate (HP/s)",
          step: 0.5,
        });
        hpHealSocketEl.appendChild(hrCtrl.element);
      }

      const checkHealthEnergy = this.container.querySelector("#check-health-energy") as HTMLInputElement;
      checkHealthEnergy?.addEventListener("change", () => {
        hm.consumesEnergy = checkHealthEnergy.checked;
        const warn = this.container.querySelector("#warn-health-energy") as HTMLElement;
        if (warn) warn.style.display = checkHealthEnergy.checked ? "block" : "none";
      });

      // Quick test buttons
      this.container.querySelector("#btn-health-sub10")?.addEventListener("click", () => {
        hm.takeDamage(10, e.properties);
        this.updateInspector();
      });
      this.container.querySelector("#btn-health-add10")?.addEventListener("click", () => {
        hm.heal(10, e.properties);
        this.updateInspector();
      });
      this.container.querySelector("#btn-health-kill")?.addEventListener("click", () => {
        hm.currentHpProp.set(0, e.properties);
        if (isChar && char) {
          hm.dieAndRespawn(char, this.arena);
        }
        this.updateInspector();
      });
      this.container.querySelector("#btn-health-full")?.addEventListener("click", () => {
        hm.currentHpProp.set(hm.getMaxHp(e.properties), e.properties);
        this.updateInspector();
      });
    }

    // Damage Aura Module controls (applicable to any entity)
    if (e.damageAuraModule) {
      const da = e.damageAuraModule;

      const auraRadiusSocketEl = this.container.querySelector("#prop-socket-aura-radius");
      if (auraRadiusSocketEl) {
        const arCtrl = new PropertyControl({
          property: da.damageRadiusProp,
          owner: e,
          label: "Aura Radius (3D) (u)",
          step: 0.2,
        });
        auraRadiusSocketEl.appendChild(arCtrl.element);
      }

      const auraRateSocketEl = this.container.querySelector("#prop-socket-aura-rate");
      if (auraRateSocketEl) {
        const rateCtrl = new PropertyControl({
          property: da.damageRateProp,
          owner: e,
          label: "Damage Rate (HP/s)",
          step: 2.0,
        });
        auraRateSocketEl.appendChild(rateCtrl.element);
      }
    }

    // Damage Solver & Armor Module controls (applicable to any entity)
    if (e.damageSolverModule) {
      const ds = e.damageSolverModule;

      const suscSocketEl = this.container.querySelector("#prop-socket-impact-susceptibility");
      if (suscSocketEl) {
        const suscCtrl = new PropertyControl({
          property: ds.impactSusceptibilityProp,
          owner: e,
          label: "Impact Susceptibility (Multiplier)",
          step: 0.1,
        });
        suscSocketEl.appendChild(suscCtrl.element);
      }

      const threshSocketEl = this.container.querySelector("#prop-socket-min-shock-thresh");
      if (threshSocketEl) {
        const threshCtrl = new PropertyControl({
          property: ds.damageThresholdHpProp,
          owner: e,
          label: "Damage Threshold (HP)",
          step: 1.0,
        });
        threshSocketEl.appendChild(threshCtrl.element);
      }
    }
  }

  private setSliderVal(sliderId: string, labelId: string, val: number, decimals: number): void {
    const slider = this.container.querySelector(`#${sliderId}`) as HTMLInputElement;
    const label = this.container.querySelector(`#${labelId}`) as HTMLElement;
    if (slider) slider.value = val.toString();
    if (label) label.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  }

  private syncCreatorInputs(): void {
    const s = this.creatorState;

    const nameInput = this.container.querySelector("#creator-name") as HTMLInputElement;
    if (nameInput) nameInput.value = s.name;

    const shapeBtn = this.container.querySelector("#creator-toggle-shape") as HTMLButtonElement;
    if (shapeBtn) {
      shapeBtn.textContent = s.visualShape === "box" ? "Box 📦" : "Circle ⚪";
      shapeBtn.classList.toggle("active", s.visualShape === "box");
    }

    const colorInput = this.container.querySelector("#creator-color") as HTMLInputElement;
    const colorLabel = this.container.querySelector("#val-creator-color") as HTMLElement;
    if (colorInput) colorInput.value = s.color;
    if (colorLabel) colorLabel.textContent = s.color;

    // Rigidbody
    const rbBtn = this.container.querySelector("#creator-toggle-rigidbody") as HTMLButtonElement;
    const rbGrp = this.container.querySelector("#grp-creator-rigidbody") as HTMLElement;
    if (rbBtn) {
      rbBtn.textContent = s.hasRigidbody ? "Attached" : "Detached";
      rbBtn.classList.toggle("active", s.hasRigidbody);
    }
    if (rbGrp) rbGrp.style.display = s.hasRigidbody ? "block" : "none";

    // Vertical Velocity toggle (depends on Vertical Position)
    const vertVelBtn = this.container.querySelector("#creator-toggle-vert-vel") as HTMLButtonElement;
    const warnRbVertPos = this.container.querySelector("#creator-warn-rb-vert-pos") as HTMLElement;
    if (vertVelBtn) {
      const isEnabled = s.hasVerticalVelocity && s.hasVerticalPosition;
      vertVelBtn.textContent = isEnabled ? "Enabled" : "Disabled";
      vertVelBtn.classList.toggle("active", isEnabled);
      vertVelBtn.disabled = !s.hasVerticalPosition;
      vertVelBtn.style.opacity = !s.hasVerticalPosition ? "0.5" : "1";
      vertVelBtn.style.cursor = !s.hasVerticalPosition ? "not-allowed" : "pointer";
    }
    if (warnRbVertPos) {
      warnRbVertPos.style.display = !s.hasVerticalPosition ? "block" : "none";
    }

    // Collider
    const colBtn = this.container.querySelector("#creator-toggle-collider") as HTMLButtonElement;
    const colGrp = this.container.querySelector("#grp-creator-radius") as HTMLElement;
    if (colBtn) { colBtn.textContent = s.hasCollider ? "Attached" : "Detached"; colBtn.classList.toggle("active", s.hasCollider); }
    if (colGrp) colGrp.style.display = s.hasCollider ? "block" : "none";
    this.setScrubberVal("scrub-container-creator-radius", s.colliderRadius);

    // Mass
    const massBtn = this.container.querySelector("#creator-toggle-mass") as HTMLButtonElement;
    const massGrp = this.container.querySelector("#grp-creator-mass") as HTMLElement;
    if (massBtn) { massBtn.textContent = s.hasMass ? "Attached" : "Detached"; massBtn.classList.toggle("active", s.hasMass); }
    if (massGrp) massGrp.style.display = s.hasMass ? "block" : "none";
    this.setScrubberVal("scrub-container-creator-mass", s.mass);

    // Friction
    const fricBtn = this.container.querySelector("#creator-toggle-friction") as HTMLButtonElement;
    const fricGrp = this.container.querySelector("#grp-creator-fric") as HTMLElement;
    if (fricBtn) { fricBtn.textContent = s.hasFriction ? "Attached" : "Detached"; fricBtn.classList.toggle("active", s.hasFriction); }
    if (fricGrp) fricGrp.style.display = s.hasFriction ? "block" : "none";
    this.setScrubberVal("scrub-container-creator-fric", s.dynamicFrictionMod);

    // Bounce
    const bounceBtn = this.container.querySelector("#creator-toggle-bounce") as HTMLButtonElement;
    const bounceGrp = this.container.querySelector("#grp-creator-bounce") as HTMLElement;
    const creatorVertBounceCheck = this.container.querySelector("#creator-check-vert-bounce") as HTMLInputElement;
    const creatorWarnBounceVert = this.container.querySelector("#creator-warn-bounce-vert") as HTMLElement;
    if (bounceBtn) { bounceBtn.textContent = s.hasBounce ? "Attached" : "Detached"; bounceBtn.classList.toggle("active", s.hasBounce); }
    if (bounceGrp) bounceGrp.style.display = s.hasBounce ? "block" : "none";
    if (creatorVertBounceCheck) {
      creatorVertBounceCheck.checked = s.verticalBounce;
    }
    if (creatorWarnBounceVert) {
      creatorWarnBounceVert.style.display = (s.hasBounce && s.verticalBounce && (!s.hasVerticalPosition || !s.hasVerticalVelocity)) ? "block" : "none";
    }
    this.setScrubberVal("scrub-container-creator-bounce", s.bounceMod);

    // Vertical Position
    const vertPosBtn = this.container.querySelector("#creator-toggle-vert-pos") as HTMLButtonElement;
    const vertPosGrp = this.container.querySelector("#grp-creator-vert-pos") as HTMLElement;
    if (vertPosBtn) {
      vertPosBtn.textContent = s.hasVerticalPosition ? "Attached" : "Detached";
      vertPosBtn.classList.toggle("active", s.hasVerticalPosition);
    }
    if (vertPosGrp) vertPosGrp.style.display = s.hasVerticalPosition ? "block" : "none";
    this.setScrubberVal("scrub-container-creator-elevation", s.elevation);

    // Gravity
    const gravBtn = this.container.querySelector("#creator-toggle-gravity") as HTMLButtonElement;
    if (gravBtn) { gravBtn.textContent = s.hasGravity ? "Attached" : "Detached"; gravBtn.classList.toggle("active", s.hasGravity); }

    // Roll
    const rollBtn = this.container.querySelector("#creator-toggle-roll") as HTMLButtonElement;
    const rollGrp = this.container.querySelector("#group-creator-roll-resist") as HTMLElement;
    if (rollBtn) { rollBtn.textContent = s.hasRollModule ? "Enabled" : "Disabled"; rollBtn.classList.toggle("active", s.hasRollModule); }
    if (rollGrp) rollGrp.style.display = s.hasRollModule ? "block" : "none";
    this.setScrubberVal("scrub-container-creator-roll-resist", s.rollResistance);
  }

  private bindEvents(): void {
    // 1. Mode Switcher
    this.modePlayBtn.addEventListener("click", () => {
      this.setMode(false);
    });

    this.modeEditBtn.addEventListener("click", () => {
      this.setMode(true);
    });

    this.container.querySelector("#submode-entities")?.addEventListener("click", () => {
      this.setEditTool("entities");
    });

    this.container.querySelector("#submode-walls")?.addEventListener("click", () => {
      this.setEditTool("walls");
    });

    // 2. Selector Change
    this.entitySelectorEl.addEventListener("change", () => {
      const selectedId = this.entitySelectorEl.value;
      const chars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      const foundChar = chars.find((c) => c.id === selectedId);
      if (foundChar) {
        this.selectedEntity = foundChar;
      } else {
        const foundObj = this.objects.find((o) => o.id === selectedId);
        if (foundObj) {
          this.selectedEntity = foundObj;
        }
      }
      this.updateSelectorOptions();
      this.renderEntityModules();
      this.syncEntitySliders();
      this.onSelectionChange?.(this.selectedEntity);
    });

    // 3. Duplicate & Delete Actions
    this.container.querySelector("#btn-duplicate-entity")?.addEventListener("click", () => {
      this.duplicateSelectedEntity();
    });

    this.container.querySelector("#btn-delete-entity")?.addEventListener("click", () => {
      this.deleteSelectedEntity();
    });

    // 4. Shape Toggle
    const btnShapeToggle = this.container.querySelector("#toggle-entity-shape") as HTMLButtonElement;
    btnShapeToggle?.addEventListener("click", () => {
      this.selectedEntity.visualShape = this.selectedEntity.visualShape === "box" ? "circle" : "box";
      btnShapeToggle.textContent = this.selectedEntity.visualShape === "box" ? "Box 📦" : "Circle ⚪";
      btnShapeToggle.classList.toggle("active", this.selectedEntity.visualShape === "box");
      this.updateSelectorOptions();
    });

    // 5. Add Behavior Dropdown Toggle & Click Outside
    const btnAddBehavior = this.container.querySelector("#btn-add-behavior") as HTMLButtonElement;
    const dropdownAddBehavior = this.container.querySelector("#dropdown-add-behavior") as HTMLElement;
    btnAddBehavior?.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (dropdownAddBehavior) {
        dropdownAddBehavior.style.display = dropdownAddBehavior.style.display === "none" ? "flex" : "none";
      }
    });

    document.addEventListener("click", (evt) => {
      const target = evt.target as HTMLElement;
      if (!target.closest("#add-behavior-section") && dropdownAddBehavior) {
        dropdownAddBehavior.style.display = "none";
      }
    });

    // 6b. Simulation & Collision Solver Controls (Phase A)
    const btnSimPause = this.container.querySelector("#btn-sim-pause") as HTMLButtonElement | null;
    const btnSimStep = this.container.querySelector("#btn-sim-step") as HTMLButtonElement | null;
    const selectGlobalCollision = this.container.querySelector("#select-global-collision-mode") as HTMLSelectElement | null;
    const selectEntityCollision = this.container.querySelector("#select-entity-collision-mode") as HTMLSelectElement | null;
    const btnLaunchFastBall = this.container.querySelector("#btn-launch-fast-ball") as HTMLButtonElement | null;
    const toggleCollisionVisuals = this.container.querySelector("#toggle-collision-visuals") as HTMLButtonElement | null;

    btnSimPause?.addEventListener("click", () => {
      const loop = this.getGameLoop?.();
      if (!loop) return;
      loop.isPhysicsPaused = !loop.isPhysicsPaused;
      if (btnSimPause) {
        btnSimPause.textContent = loop.isPhysicsPaused ? "▶️ Resume Sim" : "⏸️ Pause Sim";
        btnSimPause.style.color = loop.isPhysicsPaused ? "#10b981" : "#f1f5f9";
      }
    });

    btnSimStep?.addEventListener("click", () => {
      const loop = this.getGameLoop?.();
      if (!loop) return;
      loop.stepSingleTick();
    });

    selectGlobalCollision?.addEventListener("change", () => {
      const loop = this.getGameLoop?.();
      if (!loop) return;
      loop.globalCollisionMode = selectGlobalCollision.value as any;
      this.updateInspector();
    });

    this.setupScrubber("scrub-container-ccd-threshold", {
      label: "Dynamic CCD Threshold Ratio",
      value: this.selectedEntity?.colliderModule?.ccdThresholdRatio ?? 0.5,
      min: 0.1,
      max: 2.0,
      step: 0.05,
      decimals: 2,
      suffix: "×",
      onChange: (val) => {
        if (this.selectedEntity?.colliderModule) {
          this.selectedEntity.colliderModule.ccdThresholdRatio = val;
        }
      },
    });

    selectEntityCollision?.addEventListener("change", () => {
      if (this.selectedEntity) {
        this.selectedEntity.collisionMode = selectEntityCollision.value as any;
        this.updateInspector();
      }
    });

    btnLaunchFastBall?.addEventListener("click", () => {
      // Spawn a small projectile moving fast (40 u/s) to test tunneling vs clean collision
      const cannonBall = new GameObject({
        name: "Test Cannonball",
        position: { x: 2.0, y: 7.0, z: 0.1 },
        velocity: { x: 40.0, y: 0.0 },
        visualShape: "circle",
        color: "#f59e0b",
        colliderRadius: 0.14,
        mass: 0.5,
        bounceMod: 0.85,
        collisionMode: "dynamic",
        hasGravity: false,
        hasVerticalPosition: true,
      });
      this.onSpawnObject(cannonBall);
    });

    if (toggleCollisionVisuals) {
      const rend = this.getRenderer?.();
      const isShow = rend ? rend.showCollisionDebug : false;
      toggleCollisionVisuals.textContent = isShow ? "ON" : "OFF";
      toggleCollisionVisuals.classList.toggle("active", isShow);

      toggleCollisionVisuals.addEventListener("click", () => {
        const r = this.getRenderer?.();
        if (!r) return;
        r.showCollisionDebug = !r.showCollisionDebug;
        toggleCollisionVisuals.textContent = r.showCollisionDebug ? "ON" : "OFF";
        toggleCollisionVisuals.classList.toggle("active", r.showCollisionDebug);
      });
    }

    // 6c. History Buffer & Rollback Replay Controls (Phase 2)
    const btnTestRollback = this.container.querySelector("#btn-test-rollback") as HTMLButtonElement | null;
    const btnTestDesync = this.container.querySelector("#btn-test-desync") as HTMLButtonElement | null;
    const bannerRollbackResult = this.container.querySelector("#banner-rollback-result") as HTMLElement | null;

    this.setupScrubber("scrub-container-buffer-capacity", {
      label: "Buffer Capacity",
      value: this.getGameLoop?.()?.historyBuffer?.capacity ?? 60,
      min: 15,
      max: 120,
      step: 5,
      decimals: 0,
      suffix: " ticks",
      onChange: (val) => {
        const loop = this.getGameLoop?.();
        if (loop) {
          loop.historyBuffer.setCapacity(val);
          this.updateInspector();
        }
      },
    });

    this.setupScrubber("scrub-container-rollback-depth", {
      label: "Test Rollback Depth",
      value: this.rollbackDepthTicks,
      min: 5,
      max: 60,
      step: 5,
      decimals: 0,
      suffix: " ticks",
      onChange: (val) => {
        this.rollbackDepthTicks = Math.round(val);
      },
    });

    const toggleBufferTrail = this.container.querySelector("#toggle-buffer-trail") as HTMLButtonElement | null;
    if (toggleBufferTrail) {
      const rend = this.getRenderer?.();
      const isShow = rend ? rend.showBufferTrail : false;
      toggleBufferTrail.textContent = isShow ? "ON" : "OFF";
      toggleBufferTrail.classList.toggle("active", isShow);

      toggleBufferTrail.addEventListener("click", () => {
        const r = this.getRenderer?.();
        if (!r) return;
        r.showBufferTrail = !r.showBufferTrail;
        toggleBufferTrail.textContent = r.showBufferTrail ? "ON" : "OFF";
        toggleBufferTrail.classList.toggle("active", r.showBufferTrail);
      });
    }

    btnTestRollback?.addEventListener("click", () => {
      const loop = this.getGameLoop?.();
      if (!loop) return;
      const res = loop.simulateRollbackTest(this.rollbackDepthTicks);
      if (bannerRollbackResult) {
        bannerRollbackResult.style.display = "block";
        if (res.diverged) {
          bannerRollbackResult.style.background = "rgba(239, 68, 68, 0.2)";
          bannerRollbackResult.style.borderColor = "rgba(239, 68, 68, 0.5)";
          bannerRollbackResult.style.color = "#f87171";
          bannerRollbackResult.innerHTML = `<strong>❌ REPLAY DIVERGED:</strong> ${res.message}`;
        } else {
          bannerRollbackResult.style.background = "rgba(16, 185, 129, 0.2)";
          bannerRollbackResult.style.borderColor = "rgba(16, 185, 129, 0.5)";
          bannerRollbackResult.style.color = "#34d399";
          bannerRollbackResult.innerHTML = `<strong>✅ PERFECT REPLAY:</strong> ${res.ticksReplayed} ticks replayed in ${res.durationMs.toFixed(2)}ms (0.0000u divergence)`;
        }
      }
      this.updateInspector();
    });

    btnTestDesync?.addEventListener("click", () => {
      const loop = this.getGameLoop?.();
      if (!loop) return;
      const res = loop.injectPerturbationTest(this.rollbackDepthTicks, this.selectedEntity);
      if (bannerRollbackResult) {
        bannerRollbackResult.style.display = "block";
        bannerRollbackResult.style.background = "rgba(245, 158, 11, 0.2)";
        bannerRollbackResult.style.borderColor = "rgba(245, 158, 11, 0.5)";
        bannerRollbackResult.style.color = "#fbbf24";
        bannerRollbackResult.innerHTML = `<strong>💥 PAST TACKLE RECONCILED:</strong> Simulated tackle at tick #${res.startTick} on <em>${this.selectedEntity?.name || 'entity'}</em>. Re-simulated ${res.ticksReplayed} ticks forward with ${res.maxDeltaPos.toFixed(2)}u trajectory adjustment in ${res.durationMs.toFixed(2)}ms.<br><span style="color: #cbd5e1; font-size: 0.66rem;">Canvas shows: Red dashed path = Old prediction | Green solid path = Reconciled timeline.</span>`;
      }
      this.updateInspector();
    });

    const btnTestPhase8 = this.container.querySelector("#btn-test-phase8-reconcile") as HTMLButtonElement | null;
    btnTestPhase8?.addEventListener("click", () => {
      const loop = this.getGameLoop?.();
      if (!loop) return;
      const char = loop.primaryCharacter;
      if (!char) return;

      const currentTick = loop.currentTick;
      const depth = Math.min(this.rollbackDepthTicks, loop.historyBuffer.getCount() - 1);
      const targetTick = Math.max(loop.historyBuffer.getOldestTick(), currentTick - depth);
      const targetFrame = loop.historyBuffer.get(targetTick);
      if (!targetFrame) return;

      const cEnt = targetFrame.snapshot.entities.find((e: any) => e.id === char.id);
      if (!cEnt) return;

      // Construct a simulated authoritative server snapshot at targetTick with a 0.75u perturbation
      const fakeServerSnapshot = {
        tick: targetTick,
        timestamp: performance.now(),
        lastProcessedInputTick: { [char.playerId || "keyboard"]: targetTick },
        entities: [
          {
            id: char.id,
            name: char.name,
            x: cEnt.x + 0.75, // Server authoritatively nudged player by +0.75u in x
            y: cEnt.y + 0.40,
            z: cEnt.z,
            vx: cEnt.vx + 2.0,
            vy: cEnt.vy,
            vz: cEnt.vz,
            isHeld: false,
            heldBy: null,
            isClimbing: false,
            isSleeping: false,
          },
        ],
      };

      const res = loop.reconcileWorldSnapshot(fakeServerSnapshot as any);

      if (bannerRollbackResult) {
        bannerRollbackResult.style.display = "block";
        bannerRollbackResult.style.background = "rgba(56, 189, 248, 0.2)";
        bannerRollbackResult.style.borderColor = "rgba(56, 189, 248, 0.5)";
        bannerRollbackResult.style.color = "#38bdf8";
        bannerRollbackResult.innerHTML = `<strong>🔄 PREDICTION RECONCILED:</strong> Corrected divergence at tick #${res.tick} (${res.maxDeltaPos.toFixed(2)}u offset). Replayed ${res.ticksReplayed} ticks forward in ${res.durationMs.toFixed(2)}ms.<br><span style="color: #cbd5e1; font-size: 0.66rem;">Visual smoothing offset applied (${char.visualOffset.x.toFixed(2)}u, ${char.visualOffset.y.toFixed(2)}u) — 0.000u pop on screen gliding smoothly to zero!</span>`;
      }
      this.updateInspector();
    });

    // 7. World Physics Scrubbers

    this.setupScrubber("scrub-container-gravity", {
      label: "Gravity Force",
      value: this.arena.gravity,
      min: 1.0,
      max: 100.0,
      step: 0.5,
      decimals: 1,
      suffix: " u/s²",
      onChange: (val) => {
        this.arena.gravity = val;
      },
    });

    this.setupScrubber("scrub-container-wall-height", {
      label: "Standard Wall Height",
      value: this.arena.wallHeight,
      min: 0.2,
      max: 3.0,
      step: 0.1,
      decimals: 1,
      suffix: " u",
      onChange: (val) => {
        this.arena.setStandardWallHeight(val);
        this.setScrubberVal("scrub-container-editor-wall-height", val);
      },
    });

    this.setupScrubber("scrub-container-editor-wall-height", {
      label: "Standard Wall Height",
      value: this.arena.wallHeight,
      min: 0.2,
      max: 3.0,
      step: 0.1,
      decimals: 1,
      suffix: " u",
      onChange: (val) => {
        this.arena.setStandardWallHeight(val);
        this.setScrubberVal("scrub-container-wall-height", val);
      },
    });

    const selectWallPreset = this.container.querySelector("#select-wall-preset") as HTMLSelectElement | null;
    selectWallPreset?.addEventListener("change", () => {
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.loadWallPreset(selectWallPreset.value, [...allChars, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-prev-wall-map")?.addEventListener("click", () => {
      const presets = Arena.WALL_PRESETS;
      const idx = presets.findIndex((p) => p.id === this.arena.currentPresetId);
      const prevIdx = (idx - 1 + presets.length) % presets.length;
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.loadWallPreset(presets[prevIdx].id, [...allChars, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-next-wall-map")?.addEventListener("click", () => {
      const presets = Arena.WALL_PRESETS;
      const idx = presets.findIndex((p) => p.id === this.arena.currentPresetId);
      const nextIdx = (idx + 1) % presets.length;
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.loadWallPreset(presets[nextIdx].id, [...allChars, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-reset-walls")?.addEventListener("click", () => {
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.resetDefaultWalls([...allChars, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-clear-walls")?.addEventListener("click", () => {
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.clearAllWalls([...allChars, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.setupScrubber("scrub-container-friction", {
      label: "Base Ground Friction Coeff",
      value: this.arena.frictionCoeff,
      min: 1.0,
      max: 30.0,
      step: 0.5,
      decimals: 1,
      suffix: " u/s²",
      onChange: (val) => {
        this.arena.frictionCoeff = val;
      },
    });

    this.setupScrubber("scrub-container-static-thresh", {
      label: "Static Friction Threshold",
      value: this.arena.staticFrictionThreshold,
      min: 0.02,
      max: 1.0,
      step: 0.02,
      decimals: 2,
      suffix: " u/s",
      onChange: (val) => {
        this.arena.staticFrictionThreshold = val;
      },
    });

    this.setupScrubber("scrub-container-collision-damage-scale", {
      label: "Collision Damage Scale",
      value: GameObject.globalWorldCollisionDamageScale,
      min: 0.0,
      max: 5.0,
      step: 0.005,
      decimals: 3,
      suffix: " HP/Shock",
      onChange: (val) => {
        GameObject.globalWorldCollisionDamageScale = val;
        const loop = this.getGameLoop ? this.getGameLoop() : null;
        if (loop) {
          loop.worldCollisionDamageScale = val;
        }
      },
    });

    // 8. Presets
    const presetButtons = this.container.querySelectorAll(".preset-chip");
    presetButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const pKey = btn.getAttribute("data-preset");
        if (pKey && this.presets[pKey]) {
          this.creatorState = { ...this.presets[pKey] };
          this.syncCreatorInputs();
        }
      });
    });

    // 9. Creator Controls
    const nameInput = this.container.querySelector("#creator-name") as HTMLInputElement;
    nameInput?.addEventListener("input", () => { this.creatorState.name = nameInput.value; });

    const creatorShapeBtn = this.container.querySelector("#creator-toggle-shape") as HTMLButtonElement;
    creatorShapeBtn?.addEventListener("click", () => {
      this.creatorState.visualShape = this.creatorState.visualShape === "box" ? "circle" : "box";
      creatorShapeBtn.textContent = this.creatorState.visualShape === "box" ? "Box 📦" : "Circle ⚪";
      creatorShapeBtn.classList.toggle("active", this.creatorState.visualShape === "box");
    });

    const colorInput = this.container.querySelector("#creator-color") as HTMLInputElement;
    const colorLabel = this.container.querySelector("#val-creator-color") as HTMLElement;
    colorInput?.addEventListener("input", () => {
      this.creatorState.color = colorInput.value;
      if (colorLabel) colorLabel.textContent = colorInput.value;
    });

    const creatorRbBtn = this.container.querySelector("#creator-toggle-rigidbody") as HTMLButtonElement;
    creatorRbBtn?.addEventListener("click", () => {
      this.creatorState.hasRigidbody = !this.creatorState.hasRigidbody;
      this.syncCreatorInputs();
    });

    const creatorColBtn = this.container.querySelector("#creator-toggle-collider") as HTMLButtonElement;
    creatorColBtn?.addEventListener("click", () => {
      this.creatorState.hasCollider = !this.creatorState.hasCollider;
      creatorColBtn.textContent = this.creatorState.hasCollider ? "Attached" : "Detached";
      creatorColBtn.classList.toggle("active", this.creatorState.hasCollider);
      const grp = this.container.querySelector("#grp-creator-radius") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasCollider ? "block" : "none";
    });
    this.setupScrubber("scrub-container-creator-radius", {
      label: "Collider Radius",
      value: this.creatorState.colliderRadius,
      min: 0.1,
      max: 1.5,
      step: 0.02,
      decimals: 2,
      suffix: " u",
      onChange: (v) => { this.creatorState.colliderRadius = v; },
    });

    const creatorMassBtn = this.container.querySelector("#creator-toggle-mass") as HTMLButtonElement;
    creatorMassBtn?.addEventListener("click", () => {
      this.creatorState.hasMass = !this.creatorState.hasMass;
      creatorMassBtn.textContent = this.creatorState.hasMass ? "Attached" : "Detached";
      creatorMassBtn.classList.toggle("active", this.creatorState.hasMass);
      const grp = this.container.querySelector("#grp-creator-mass") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasMass ? "block" : "none";
    });
    this.setupScrubber("scrub-container-creator-mass", {
      label: "Mass",
      value: this.creatorState.mass,
      min: 0.1,
      max: 8.0,
      step: 0.1,
      decimals: 1,
      suffix: " kg",
      onChange: (v) => { this.creatorState.mass = v; },
    });

    const creatorFricBtn = this.container.querySelector("#creator-toggle-friction") as HTMLButtonElement;
    creatorFricBtn?.addEventListener("click", () => {
      this.creatorState.hasFriction = !this.creatorState.hasFriction;
      creatorFricBtn.textContent = this.creatorState.hasFriction ? "Attached" : "Detached";
      creatorFricBtn.classList.toggle("active", this.creatorState.hasFriction);
      const grp = this.container.querySelector("#grp-creator-fric") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasFriction ? "block" : "none";
    });
    this.setupScrubber("scrub-container-creator-fric", {
      label: "Dynamic Friction Mod",
      value: this.creatorState.dynamicFrictionMod,
      min: 0.0,
      max: 3.0,
      step: 0.05,
      decimals: 2,
      onChange: (v) => { this.creatorState.dynamicFrictionMod = v; },
    });

    const creatorBounceBtn = this.container.querySelector("#creator-toggle-bounce") as HTMLButtonElement;
    creatorBounceBtn?.addEventListener("click", () => {
      this.creatorState.hasBounce = !this.creatorState.hasBounce;
      creatorBounceBtn.textContent = this.creatorState.hasBounce ? "Attached" : "Detached";
      creatorBounceBtn.classList.toggle("active", this.creatorState.hasBounce);
      const grp = this.container.querySelector("#grp-creator-bounce") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasBounce ? "block" : "none";
    });
    this.setupScrubber("scrub-container-creator-bounce", {
      label: "Bounciness (Restitution)",
      value: this.creatorState.bounceMod,
      min: 0.05,
      max: 1.0,
      step: 0.05,
      decimals: 2,
      onChange: (v) => { this.creatorState.bounceMod = v; },
    });

    const creatorVertBounceCheck = this.container.querySelector("#creator-check-vert-bounce") as HTMLInputElement;
    creatorVertBounceCheck?.addEventListener("change", () => {
      this.creatorState.verticalBounce = creatorVertBounceCheck.checked;
      this.syncCreatorInputs();
    });

    const creatorVertPosBtn = this.container.querySelector("#creator-toggle-vert-pos") as HTMLButtonElement;
    creatorVertPosBtn?.addEventListener("click", () => {
      this.creatorState.hasVerticalPosition = !this.creatorState.hasVerticalPosition;
      this.syncCreatorInputs();
    });
    this.setupScrubber("scrub-container-creator-elevation", {
      label: "Elevation (z)",
      value: this.creatorState.elevation,
      min: 0.0,
      max: 4.0,
      step: 0.05,
      decimals: 2,
      suffix: " u",
      onChange: (v) => { this.creatorState.elevation = v; },
    });

    const creatorVertVelBtn = this.container.querySelector("#creator-toggle-vert-vel") as HTMLButtonElement;
    creatorVertVelBtn?.addEventListener("click", () => {
      if (!this.creatorState.hasVerticalPosition) return;
      this.creatorState.hasVerticalVelocity = !this.creatorState.hasVerticalVelocity;
      this.syncCreatorInputs();
    });

    const creatorGravBtn = this.container.querySelector("#creator-toggle-gravity") as HTMLButtonElement;
    creatorGravBtn?.addEventListener("click", () => {
      this.creatorState.hasGravity = !this.creatorState.hasGravity;
      creatorGravBtn.textContent = this.creatorState.hasGravity ? "Attached" : "Detached";
      creatorGravBtn.classList.toggle("active", this.creatorState.hasGravity);
    });

    const creatorRollBtn = this.container.querySelector("#creator-toggle-roll") as HTMLButtonElement;
    creatorRollBtn?.addEventListener("click", () => {
      this.creatorState.hasRollModule = !this.creatorState.hasRollModule;
      creatorRollBtn.textContent = this.creatorState.hasRollModule ? "Enabled" : "Disabled";
      creatorRollBtn.classList.toggle("active", this.creatorState.hasRollModule);
      const grp = this.container.querySelector("#group-creator-roll-resist") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasRollModule ? "block" : "none";
    });
    this.setupScrubber("scrub-container-creator-roll-resist", {
      label: "Roll Resistance",
      value: this.creatorState.rollResistance,
      min: 0.0,
      max: 4.0,
      step: 0.05,
      decimals: 2,
      suffix: " u/s²",
      onChange: (v) => { this.creatorState.rollResistance = v; },
    });

    // 10. Spawn Configured Object
    this.container.querySelector("#btn-spawn-configured")?.addEventListener("click", () => {
      this.spawnFromCreator();
    });

    // 11. Clear All Objects
    this.container.querySelector("#btn-clear-entities")?.addEventListener("click", () => {
      this.onClearObjects();
      const chars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.setSelectedEntity(chars[0] || (null as any));
    });
  }

  private spawnFromCreator(): void {
    const s = this.creatorState;
    const chars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
    const refChar = chars[0];
    const centerX = refChar ? refChar.position.x : this.arena.width / 2;
    const centerY = refChar ? refChar.position.y : this.arena.height / 2;
    const spawnX = Math.min(Math.max(centerX + (Math.random() * 2.0 - 1.0), 1.0), this.arena.width - 1.0);
    const spawnY = Math.min(Math.max(centerY + (Math.random() * 2.0 - 1.0), 1.0), this.arena.height - 1.0);

    const newObj = new GameObject({
      name: s.name || "Custom Object",
      position: { x: spawnX, y: spawnY, z: s.hasVerticalPosition ? s.elevation : 0 },
      visualShape: s.visualShape,
      color: s.color,
      hasRigidbody: s.hasRigidbody,
      rigidbodyModule: s.hasRigidbody ? new RigidbodyModule({
        mass: s.mass,
        velocity: { x: 0, y: 0 },
        hasVerticalVelocity: s.hasVerticalVelocity,
        verticalVelocity: 0,
        collisionMode: "dynamic",
      }) : null,
      colliderModule: s.hasCollider ? new ColliderModule({ radius: s.colliderRadius }) : null,
      frictionModule: s.hasFriction ? new FrictionModule({ staticFrictionMod: s.staticFrictionMod, dynamicFrictionMod: s.dynamicFrictionMod }) : null,
      bounceModule: s.hasBounce ? new BounceModule({ bounceMod: s.bounceMod, verticalBounce: s.verticalBounce }) : null,
      verticalPositionModule: s.hasVerticalPosition ? new VerticalPositionModule({
        z: s.elevation,
        hasVerticalVelocity: s.hasVerticalVelocity,
        verticalVelocity: 0,
      }) : null,
      gravityModule: s.hasGravity ? new GravityModule() : null,
      rollModule: s.hasRollModule ? new RollModule({ rollResistance: s.rollResistance }) : null,
    });

    this.onSpawnObject(newObj);
    this.setSelectedEntity(newObj);
  }

  public duplicateSelectedEntity(): void {
    if (!this.selectedEntity || this.selectedEntity instanceof Character) return;
    const orig = this.selectedEntity;

    const spawnX = Math.min(Math.max(orig.position.x + 0.6, 1.0), this.arena.width - 1.0);
    const spawnY = Math.min(Math.max(orig.position.y + 0.6, 1.0), this.arena.height - 1.0);

    const clone = new GameObject({
      name: `${orig.name} (Copy)`,
      position: { x: spawnX, y: spawnY, z: orig.position.z },
      visualShape: orig.visualShape,
      color: orig.color,
      hasRigidbody: orig.hasRigidbody,
      rigidbodyModule: orig.rigidbodyModule ? new RigidbodyModule({
        mass: orig.mass,
        velocity: { x: orig.velocity.x, y: orig.velocity.y },
        hasVerticalVelocity: orig.rigidbodyModule.hasVerticalVelocity,
        verticalVelocity: orig.verticalVelocity,
        collisionMode: orig.collisionMode,
        enabled: orig.rigidbodyModule.enabled,
      }) : null,
      colliderModule: orig.colliderModule ? new ColliderModule({ radius: orig.colliderModule.radius, enabled: orig.colliderModule.enabled }) : null,
      frictionModule: orig.frictionModule ? new FrictionModule({ staticFrictionMod: orig.frictionModule.staticFrictionMod, dynamicFrictionMod: orig.frictionModule.dynamicFrictionMod, enabled: orig.frictionModule.enabled }) : null,
      bounceModule: orig.bounceModule ? new BounceModule({ bounceMod: orig.bounceModule.bounceMod, verticalBounce: orig.bounceModule.verticalBounce, enabled: orig.bounceModule.enabled }) : null,
      verticalPositionModule: orig.verticalPositionModule ? new VerticalPositionModule({
        z: orig.verticalPositionModule.z,
        hasVerticalVelocity: orig.verticalPositionModule.hasVerticalVelocity,
        verticalVelocity: orig.verticalPositionModule.verticalVelocity,
        enabled: orig.verticalPositionModule.enabled,
      }) : null,
      gravityModule: orig.gravityModule ? new GravityModule({ enabled: orig.gravityModule.enabled }) : null,
      rollModule: orig.rollModule ? new RollModule({ rollResistance: orig.rollModule.rollResistance, enabled: orig.rollModule.enabled }) : null,
    });

    this.onSpawnObject(clone);
    this.setSelectedEntity(clone);
  }

  public deleteSelectedEntity(): void {
    if (!this.selectedEntity || this.selectedEntity instanceof Character) return;
    const target = this.selectedEntity;

    const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
    for (const c of allChars) {
      if (c.heldObject === target) {
        target.isHeld = false;
        target.heldBy = null;
        c.heldObject = null;
      }
    }

    if (this.onDeleteObject) {
      this.onDeleteObject(target);
    }

    this.setSelectedEntity(allChars[0] || this.objects[0] || (null as any));
  }

  private setupScrubber(
    containerId: string,
    options: {
      label: string;
      value: number;
      min?: number;
      max?: number;
      step?: number;
      decimals?: number;
      suffix?: string;
      onChange: (val: number) => void;
    }
  ): FloatScrubber | null {
    const cont = this.container.querySelector(`#${containerId}`) as HTMLElement;
    if (!cont) return null;
    cont.innerHTML = "";
    const scrubber = new FloatScrubber(options);
    cont.appendChild(scrubber.element);
    this.scrubbers.set(containerId, scrubber);
    return scrubber;
  }

  private setScrubberVal(containerId: string, val: number): void {
    const scrubber = this.scrubbers.get(containerId);
    if (scrubber) {
      scrubber.setValue(val, false);
    }
  }

  private setupSlider(sliderId: string, labelId: string, onChange: (val: number) => void, decimals: number = 0): void {
    const slider = this.container.querySelector(`#${sliderId}`) as HTMLInputElement;
    const label = this.container.querySelector(`#${labelId}`) as HTMLElement;
    if (!slider || !label) return;

    slider.addEventListener("input", () => {
      const val = parseFloat(slider.value);
      label.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
      onChange(val);
    });
  }

  public updateInspector(): void {
    const e = this.selectedEntity;
    if (!e) {
      this.inspectorEl.innerHTML = `
        <div class="inspect-item" style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 12px 0;">
          <span>⏸️ Simulation Paused — No entity selected</span>
        </div>
      `;
      return;
    }
    const speed = Math.hypot(e.velocity.x, e.velocity.y).toFixed(2);
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    // Update Simulation Tick & Active Mode Badges
    const loop = this.getGameLoop?.();
    const simTickBadge = this.container.querySelector("#badge-sim-tick");
    if (simTickBadge) {
      const modeLabel = loop ? String(loop.globalCollisionMode).toUpperCase() : "DYNAMIC";
      const tickNum = loop ? loop.currentTick : 0;
      const isPaused = loop ? loop.isPhysicsPaused : false;
      simTickBadge.textContent = isPaused ? `⏸️ PAUSED (Tick ${tickNum})` : `Tick ${tickNum} (${modeLabel})`;
    }
    const entityModeBadge = this.container.querySelector("#badge-entity-effective-mode") as HTMLElement | null;
    if (entityModeBadge && e) {
      const eff = e.getEffectiveCollisionMode(1 / 60);
      entityModeBadge.textContent = eff === "continuous" ? "Continuous Swept" : "Discrete TOI";
      entityModeBadge.style.color = eff === "continuous" ? "#06b6d4" : "#10b981";
      entityModeBadge.style.background = eff === "continuous" ? "rgba(6, 182, 212, 0.2)" : "rgba(16, 185, 129, 0.2)";
    }
    const bufferBadge = this.container.querySelector("#badge-buffer-status") as HTMLElement | null;
    if (bufferBadge && loop) {
      const count = loop.historyBuffer.getCount();
      const cap = loop.historyBuffer.getCapacity();
      const secs = (count / 60).toFixed(2);
      bufferBadge.textContent = `${count}/${cap} ticks (${secs}s)`;
    }

    this.inspectorEl.innerHTML = `
      <div class="inspect-item">
        <span class="inspect-k">Selected</span>
        <span class="inspect-v highlight-held">${e.name}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Collision Mode</span>
        <span class="inspect-v ${e.getEffectiveCollisionMode(1/60) === 'continuous' ? 'highlight-z' : ''}">${e.collisionMode.toUpperCase()} (${e.getEffectiveCollisionMode(1/60) === 'continuous' ? 'CCD' : 'TOI'})</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Last Collision</span>
        <span class="inspect-v ${e.lastCollisionType !== 'none' ? 'highlight-held' : ''}">${e.lastCollisionType === 'continuous_swept' ? 'Swept CCD' : (e.lastCollisionType === 'discrete_toi' ? 'Discrete TOI' : (e.lastCollisionType === 'naive' ? 'Naive Push' : 'None'))}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Position (X, Y)</span>
        <span class="inspect-v">${e.position.x.toFixed(2)}, ${e.position.y.toFixed(2)} u</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Height (Z)</span>
        <span class="inspect-v ${e.isAboveGround ? 'highlight-z' : ''}">${e.position.z.toFixed(2)} u</span>
      </div>

      <div class="inspect-item">
        <span class="inspect-k">Surface</span>
        <span class="inspect-v ${e.supportingSurfaceHeight > 0.05 && e.isRestingOnSurface ? 'highlight-held' : ''}">${e.isRestingOnSurface ? (e.supportingSurfaceHeight > 0.05 ? `Wall Top (${e.supportingSurfaceHeight.toFixed(1)}u)` : "Ground (0.0u)") : `Airborne (${e.verticalVelocity.toFixed(1)}u/s)`}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Linear Speed</span>
        <span class="inspect-v">${speed} u/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Rigidbody</span>
        <span class="inspect-v ${e.hasRigidbody ? '' : 'highlight-held'}">${e.hasRigidbody ? `Dynamic (${e.collisionMode})` : 'Static Body'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Collider</span>
        <span class="inspect-v ${e.hasCollider ? '' : 'highlight-held'}">${e.hasCollider ? `Radius ${e.colliderRadius.toFixed(2)}u` : 'Detached (Passes through)'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Mass</span>
        <span class="inspect-v ${e.hasMass ? '' : 'highlight-held'}">${e.hasMass ? `${e.mass.toFixed(1)} kg` : 'Massless (0kg)'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Friction</span>
        <span class="inspect-v ${e.hasFriction ? '' : 'highlight-held'}">${e.hasFriction ? `${e.dynamicGroundFrictionMod.toFixed(2)}` : 'Zero Friction'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Bounciness</span>
        <span class="inspect-v ${e.hasBounce ? '' : 'highlight-held'}">${e.hasBounce && e.bounceMod !== null ? `${e.bounceMod.toFixed(2)} (Vert: ${e.hasVerticalBounce ? 'On' : 'Off'})` : 'Zero Bounce'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Vertical Position</span>
        <span class="inspect-v ${e.hasVerticalPosition ? '' : 'highlight-held'}">${e.hasVerticalPosition ? `${e.position.z.toFixed(2)} u` : 'Detached (2D Flat)'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Vertical Velocity</span>
        <span class="inspect-v ${e.hasVerticalVelocity ? '' : 'highlight-held'}">${e.hasVerticalVelocity ? `${e.verticalVelocity.toFixed(2)} u/s` : (!e.hasVerticalPosition ? 'Requires Vert Pos' : 'Disabled (0 u/s)')}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Gravity</span>
        <span class="inspect-v ${e.hasGravity ? '' : 'highlight-held'}">${e.hasGravity ? 'Standard Gravity' : 'Zero-G (Constant Z)'}</span>
      </div>
      ${e.rollModule && e.rollModule.enabled ? `
      <div class="inspect-item">
        <span class="inspect-k">3D Angular Vel</span>
        <span class="inspect-v highlight-z">(${e.rollModule.angularVelocity.x.toFixed(1)}, ${e.rollModule.angularVelocity.y.toFixed(1)}, ${e.rollModule.angularVelocity.z.toFixed(1)}) rad/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Roll Resistance</span>
        <span class="inspect-v ${e.rollModule.rollResistance === 0 ? 'highlight-held' : ''}">${e.rollModule.rollResistance.toFixed(2)} u/s²</span>
      </div>
      ` : ''}
      ${e.healthModule && e.healthModule.enabled ? `
      <div class="inspect-item">
        <span class="inspect-k">Health (HP)</span>
        <span class="inspect-v ${e.healthModule.currentHp < e.healthModule.maxHp * 0.4 ? 'highlight-held' : ''}">${e.healthModule.currentHp.toFixed(1)} / ${e.healthModule.maxHp.toFixed(1)}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Passive Heal Rate</span>
        <span class="inspect-v">${e.healthModule.maxHealRate.toFixed(1)} HP/s</span>
      </div>
      ` : ''}
      ${e.damageAuraModule && e.damageAuraModule.enabled ? `
      <div class="inspect-item">
        <span class="inspect-k">Damage Aura</span>
        <span class="inspect-v highlight-held">${e.damageAuraModule.damageRate.toFixed(1)} HP/s (r=${e.damageAuraModule.damageRadius.toFixed(1)}u)</span>
      </div>
      ` : ''}
      ${isChar && char ? `
      <div class="inspect-item">
        <span class="inspect-k">Base / Total Mass</span>
        <span class="inspect-v ${char.heldObject ? 'highlight-held' : ''}">${char.baseMass.toFixed(1)}kg ${char.heldObject ? `(+${char.carriedMass.toFixed(1)}kg = ${char.mass.toFixed(1)}kg)` : ''}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Walk Traction</span>
        <span class="inspect-v ${char.hasFriction ? '' : 'highlight-held'}">${char.hasFriction ? 'Grip OK' : 'Slipping (No Friction)'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Held Freebody</span>
        <span class="inspect-v ${char.heldObject ? 'highlight-held' : ''}">${char.heldObject ? `${char.heldObject.name} (${char.heldObject.hasMass ? `${char.heldObject.mass}kg` : 'Massless'})` : 'None'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Ledge Hang Limit</span>
        <span class="inspect-v">${(char.wallEdgeAssistModule?.hangDistance ?? 0.10).toFixed(2)} u</span>
      </div>
      ` : ''}
    `;
  }

  private renderWallPresetOptions(): string {
    return Arena.WALL_PRESETS.map((p) =>
      `<option value="${p.id}" ${this.arena.currentPresetId === p.id ? "selected" : ""}>${p.name}</option>`
    ).join("");
  }

  private getCurrentWallPresetBadge(): string {
    const preset = Arena.WALL_PRESETS.find((p) => p.id === this.arena.currentPresetId);
    return preset ? preset.badge : "Custom";
  }

  private getCurrentWallPresetDesc(): string {
    const preset = Arena.WALL_PRESETS.find((p) => p.id === this.arena.currentPresetId);
    return preset ? preset.description : "Custom wall layout painted in the arena.";
  }

  public updateWallPresetUI(): void {
    const select = this.container.querySelector("#select-wall-preset") as HTMLSelectElement | null;
    if (select) select.value = this.arena.currentPresetId;
    const badge = this.container.querySelector("#label-wall-map-badge");
    if (badge) badge.textContent = this.getCurrentWallPresetBadge();
    const desc = this.container.querySelector("#desc-wall-map");
    if (desc) desc.textContent = this.getCurrentWallPresetDesc();
  }
}
