import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { WalkingModule } from "../character/WalkingModule.js";
import { PickupModule } from "../character/PickupModule.js";
import { ThrowModule } from "../character/ThrowModule.js";
import { ClimbingModule } from "../character/ClimbingModule.js";
import { StrengthModule } from "../character/StrengthModule.js";
import { JumpModule } from "../character/JumpModule.js";
import { WallEdgeAssistModule } from "../character/WallEdgeAssistModule.js";
import { RollModule } from "../engine/RollModule.js";
import { ColliderModule } from "../engine/ColliderModule.js";
import { MassModule } from "../engine/MassModule.js";
import { FrictionModule } from "../engine/FrictionModule.js";
import { BounceModule } from "../engine/BounceModule.js";
import { GravityModule } from "../engine/GravityModule.js";
import { VerticalPositionModule } from "../engine/VerticalPositionModule.js";

export interface CreatorPreset {
  name: string;
  visualShape: "box" | "circle";
  color: string;
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

  // Preserved Creator State
  public creatorState: CreatorPreset = {
    name: "Custom Box",
    visualShape: "box",
    color: "#38bdf8",
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

          <div class="slider-group" style="margin-top: 12px;">
            <div class="slider-label">
              <span>Standard Wall Height (u)</span>
              <span id="val-editor-wall-height">${this.arena.wallHeight.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-editor-wall-height" min="0.2" max="3.0" step="0.1" value="${this.arena.wallHeight}">
          </div>

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
              <label>Collider</label>
              <button id="creator-toggle-collider" class="btn-toggle ${this.creatorState.hasCollider ? 'active' : ''}">
                ${this.creatorState.hasCollider ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-radius" style="display: ${this.creatorState.hasCollider ? 'block' : 'none'};">
              <div class="slider-label">
                <span>Collider Radius (u)</span>
                <span id="val-creator-radius">${this.creatorState.colliderRadius.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-radius" min="0.1" max="1.5" step="0.02" value="${this.creatorState.colliderRadius}">
            </div>

            <div class="toggle-row">
              <label>Mass</label>
              <button id="creator-toggle-mass" class="btn-toggle ${this.creatorState.hasMass ? 'active' : ''}">
                ${this.creatorState.hasMass ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-mass" style="display: ${this.creatorState.hasMass ? 'block' : 'none'};">
              <div class="slider-label">
                <span>Mass (kg)</span>
                <span id="val-creator-mass">${this.creatorState.mass.toFixed(1)}</span>
              </div>
              <input type="range" id="slide-creator-mass" min="0.1" max="8.0" step="0.1" value="${this.creatorState.mass}">
            </div>

            <div class="toggle-row">
              <label>Friction</label>
              <button id="creator-toggle-friction" class="btn-toggle ${this.creatorState.hasFriction ? 'active' : ''}">
                ${this.creatorState.hasFriction ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-fric" style="display: ${this.creatorState.hasFriction ? 'block' : 'none'};">
              <div class="slider-label">
                <span>Dynamic Friction Mod</span>
                <span id="val-creator-fric">${this.creatorState.dynamicFrictionMod.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-fric" min="0" max="3.0" step="0.05" value="${this.creatorState.dynamicFrictionMod}">
            </div>

            <div class="toggle-row">
              <label>Bounciness</label>
              <button id="creator-toggle-bounce" class="btn-toggle ${this.creatorState.hasBounce ? 'active' : ''}">
                ${this.creatorState.hasBounce ? 'Attached' : 'Detached'}
              </button>
            </div>

            <div class="slider-group" id="grp-creator-bounce" style="display: ${this.creatorState.hasBounce ? 'block' : 'none'};">
              <div class="slider-label">
                <span>Bounciness (Restitution)</span>
                <span id="val-creator-bounce">${this.creatorState.bounceMod.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-bounce" min="0.05" max="1.0" step="0.05" value="${this.creatorState.bounceMod}">
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

            <div class="slider-group" id="grp-creator-vert-pos" style="display: ${this.creatorState.hasVerticalPosition ? 'block' : 'none'};">
              <div class="slider-label">
                <span>Elevation (z)</span>
                <span id="val-creator-elevation">${this.creatorState.elevation.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-elevation" min="0.0" max="4.0" step="0.05" value="${this.creatorState.elevation}">

              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #cbd5e1;">Vertical Velocity</label>
                <button id="creator-toggle-vert-vel" class="btn-toggle ${this.creatorState.hasVerticalVelocity ? 'active' : ''}">
                  ${this.creatorState.hasVerticalVelocity ? 'Enabled' : 'Disabled'}
                </button>
              </div>
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

            <div class="slider-group" id="group-creator-roll-resist" style="display: ${this.creatorState.hasRollModule ? 'block' : 'none'};">
              <div class="slider-label">
                <span>Roll Resistance (u/s²)</span>
                <span id="val-creator-roll-resist">${this.creatorState.rollResistance.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-creator-roll-resist" min="0.0" max="4.0" step="0.05" value="${this.creatorState.rollResistance}">
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

          <div class="slider-group">
            <div class="slider-label">
              <span>Gravity Force (u/s²)</span>
              <span id="val-gravity">${this.arena.gravity.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-gravity" min="1.0" max="100.0" step="0.5" value="${this.arena.gravity}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Standard Wall Height (u)</span>
              <span id="val-wall-height">${this.arena.wallHeight.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-wall-height" min="0.2" max="3.0" step="0.1" value="${this.arena.wallHeight}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Base Ground Friction Coeff (u/s²)</span>
              <span id="val-friction">${this.arena.frictionCoeff.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-friction" min="1.0" max="30.0" step="0.5" value="${this.arena.frictionCoeff}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Static Friction Threshold (u/s)</span>
              <span id="val-static-thresh">${this.arena.staticFrictionThreshold.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-static-thresh" min="0.02" max="1.0" step="0.02" value="${this.arena.staticFrictionThreshold}">
          </div>
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
    this.setSliderVal("slide-entity-mass", "val-entity-mass", e.massModule?.mass ?? 1.0, 1);
    this.setSliderVal("slide-entity-static-fric", "val-entity-static-fric", e.frictionModule?.staticFrictionMod ?? 1.0, 2);
    this.setSliderVal("slide-entity-dynamic-fric", "val-entity-dynamic-fric", e.frictionModule?.dynamicFrictionMod ?? 1.0, 2);
    this.setSliderVal("slide-entity-bounce", "val-entity-bounce", e.bounceModule?.bounceMod ?? 0.4, 2);
    this.setSliderVal("slide-entity-elevation", "val-entity-elevation", e.position.z, 2);
    this.setSliderVal("slide-entity-vert-vel", "val-entity-vert-vel", e.verticalVelocity, 2);
    if (e.rollModule) {
      this.setSliderVal("slide-entity-roll-resist", "val-entity-roll-resist", e.rollModule.rollResistance, 2);
    }

    // Character abilities sliders
    if (isChar && char) {
      if (char.walkingModule) {
        this.setSliderVal("slide-walk-force", "val-walk-force", char.walkingModule.maxWalkForce, 0);
        this.setSliderVal("slide-walk-speed", "val-walk-speed", char.walkingModule.maxWalkSpeed, 1);
      }
      if (char.strengthModule) {
        this.setSliderVal("slide-strength", "val-strength", char.strength, 1);
      }
      if (char.pickupModule) {
        this.setSliderVal("slide-pickup-reach", "val-pickup-reach", char.pickupModule.pickupReach, 1);
      }
      if (char.throwModule) {
        this.setSliderVal("slide-throw-force", "val-throw-force", char.throwModule.baseThrowForce, 1);
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

    // Check which modules are currently attached
    const hasCollider = Boolean(e.colliderModule && e.colliderModule.enabled);
    const hasMass = Boolean(e.massModule && e.massModule.enabled);
    const hasFriction = Boolean(e.frictionModule && e.frictionModule.enabled);
    const hasBounce = Boolean(e.bounceModule && e.bounceModule.enabled);
    const hasVertPos = Boolean(e.verticalPositionModule && e.verticalPositionModule.enabled);
    const hasGravity = Boolean(e.gravityModule && e.gravityModule.enabled);
    const hasRoll = Boolean(e.rollModule && e.rollModule.enabled);

    const hasWalking = isChar && Boolean(char?.walkingModule && char.walkingModule.enabled);
    const hasStrength = isChar && Boolean(char?.strengthModule && char.strengthModule.enabled);
    const hasPickup = isChar && Boolean(char?.pickupModule && char.pickupModule.enabled);
    const hasThrow = isChar && Boolean(char?.throwModule && char.throwModule.enabled);
    const hasJump = isChar && Boolean(char?.jumpModule && char.jumpModule.enabled);
    const hasEdgeAssist = isChar && Boolean(char?.wallEdgeAssistModule && char.wallEdgeAssistModule.enabled);
    const hasClimbing = isChar && Boolean(char?.climbingModule && char.climbingModule.enabled);

    let html = "";
    let attachedCount = 0;

    // 1. Collider Module
    if (hasCollider) {
      attachedCount++;
      html += `
        <div class="module-card" data-module-id="collider">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🛡️ Collider</label>
            <button class="btn-remove-module" data-module-id="collider" title="Remove Collider behavior">✕ Remove</button>
          </div>
          <div class="slider-group">
            <div class="slider-label">
              <span>Collider Radius (u)</span>
              <span id="val-entity-radius">${(e.colliderModule?.radius ?? 0.32).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-radius" min="0.1" max="1.5" step="0.02" value="${e.colliderModule?.radius ?? 0.32}">
          </div>
        </div>
      `;
    }

    // 2. Mass Module
    if (hasMass) {
      attachedCount++;
      html += `
        <div class="module-card" data-module-id="mass">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>⚖️ Mass</label>
            <button class="btn-remove-module" data-module-id="mass" title="Remove Mass behavior">✕ Remove</button>
          </div>
          <div class="slider-group">
            <div class="slider-label">
              <span>Mass (kg)</span>
              <span id="val-entity-mass">${(e.massModule?.mass ?? 1.0).toFixed(1)}</span>
            </div>
            <input type="range" id="slide-entity-mass" min="0.1" max="8.0" step="0.1" value="${e.massModule?.mass ?? 1.0}">
          </div>
        </div>
      `;
    }

    // 3. Friction Module
    if (hasFriction) {
      attachedCount++;
      html += `
        <div class="module-card" data-module-id="friction">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🛝 Friction</label>
            <button class="btn-remove-module" data-module-id="friction" title="Remove Friction behavior">✕ Remove</button>
          </div>
          ${!hasMass ? `<div class="module-dep-warning">⚠️ Inactive without Mass (no normal force)</div>` : ''}
          <div class="slider-group">
            <div class="slider-label">
              <span>Static Friction Mod</span>
              <span id="val-entity-static-fric">${(e.frictionModule?.staticFrictionMod ?? 1.0).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${e.frictionModule?.staticFrictionMod ?? 1.0}">
          </div>
          <div class="slider-group">
            <div class="slider-label">
              <span>Dynamic Friction Mod</span>
              <span id="val-entity-dynamic-fric">${(e.frictionModule?.dynamicFrictionMod ?? 1.0).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${e.frictionModule?.dynamicFrictionMod ?? 1.0}">
          </div>
        </div>
      `;
    }

    // 4. Bounciness Module
    if (hasBounce) {
      attachedCount++;
      html += `
        <div class="module-card" data-module-id="bounce">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🏀 Bounciness</label>
            <button class="btn-remove-module" data-module-id="bounce" title="Remove Bounciness behavior">✕ Remove</button>
          </div>
          ${!hasMass ? `<div class="module-dep-warning">⚠️ Inactive without Mass (no restitution calculation)</div>` : ''}
          <div class="slider-group">
            <div class="slider-label">
              <span>Bounciness (Restitution)</span>
              <span id="val-entity-bounce">${(e.bounceModule?.bounceMod ?? 0.4).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${e.bounceModule?.bounceMod ?? 0.4}">
          </div>
          <div class="toggle-subrow" style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="check-mod-vert-bounce" ${e.bounceModule?.verticalBounce ? 'checked' : ''}>
              <span>Vertical Bounce</span>
            </label>
          </div>
          ${e.bounceModule?.verticalBounce && !e.hasVerticalVelocity ? `<div class="module-dep-warning">⚠️ Inactive without Vertical Velocity</div>` : ''}
        </div>
      `;
    }

    // 5. Vertical Position Module
    if (hasVertPos) {
      attachedCount++;
      html += `
        <div class="module-card" data-module-id="verticalPosition">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>↕️ Vertical Position</label>
            <button class="btn-remove-module" data-module-id="verticalPosition" title="Remove Vertical Position behavior">✕ Remove</button>
          </div>
          <div class="slider-group">
            <div class="slider-label">
              <span>Elevation (z)</span>
              <span id="val-entity-elevation">${e.position.z.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-elevation" min="0.0" max="4.0" step="0.05" value="${e.position.z}">
          </div>
          <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.8rem; color: #e2e8f0;">Vertical Velocity</label>
            <button id="toggle-mod-vert-vel" class="btn-toggle ${e.hasVerticalVelocity ? 'active' : ''}">
              ${e.hasVerticalVelocity ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div id="group-mod-vert-vel" style="display: ${e.hasVerticalVelocity ? 'block' : 'none'}; margin-top: 6px;">
            <div class="slider-group">
              <div class="slider-label">
                <span>Vertical Velocity (u/s)</span>
                <span id="val-entity-vert-vel">${e.verticalVelocity.toFixed(2)}</span>
              </div>
              <input type="range" id="slide-entity-vert-vel" min="-12" max="12" step="0.2" value="${e.verticalVelocity}">
            </div>
          </div>
        </div>
      `;
    }

    // 6. Gravity Module
    if (hasGravity) {
      attachedCount++;
      html += `
        <div class="module-card" data-module-id="gravity">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🪐 Gravity</label>
            <button class="btn-remove-module" data-module-id="gravity" title="Remove Gravity behavior">✕ Remove</button>
          </div>
          <div class="module-detached-note" style="color: #94a3b8; font-style: normal;">
            Subject to downward gravitational acceleration (${this.arena.gravity.toFixed(1)} u/s²)
          </div>
        </div>
      `;
    }

    // 7. Roll Module
    if (hasRoll) {
      attachedCount++;
      html += `
        <div class="module-card" data-module-id="roll">
          <div class="toggle-row" style="margin-bottom: 2px;">
            <label>🔄 Roll</label>
            <button class="btn-remove-module" data-module-id="roll" title="Remove Roll behavior">✕ Remove</button>
          </div>
          ${!hasFriction ? `<div class="module-dep-warning">ℹ️ Spin not resisted without Friction</div>` : ''}
          <div class="slider-group">
            <div class="slider-label">
              <span>Roll Resistance (u/s²)</span>
              <span id="val-entity-roll-resist">${(e.rollModule?.rollResistance ?? 0.4).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${e.rollModule?.rollResistance ?? 0.4}">
          </div>
        </div>
      `;
    }

    // Character Abilities (when character is selected)
    if (isChar && char) {
      if (hasWalking) {
        attachedCount++;
        html += `
          <div class="module-card" data-module-id="walking">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🚶 Walking Ability</label>
              <button class="btn-remove-module" data-module-id="walking" title="Remove Walking Ability">✕ Remove</button>
            </div>
            ${!hasFriction ? `<div class="module-dep-warning">⚠️ Feet slip without Friction (cannot push ground)</div>` : ''}
            ${!hasStrength ? `<div class="module-dep-warning">⚠️ Requires Strength Ability (cannot propel body)</div>` : ''}
            <div class="slider-group">
              <div class="slider-label">
                <span>Max Walk Force (N)</span>
                <span id="val-walk-force">${(char.walkingModule?.maxWalkForce ?? 45.0).toFixed(0)}</span>
              </div>
              <input type="range" id="slide-walk-force" min="5.0" max="100.0" step="1.0" value="${char.walkingModule?.maxWalkForce ?? 45.0}">
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Max Walk Speed (u/s)</span>
                <span id="val-walk-speed">${(char.walkingModule?.maxWalkSpeed ?? 6.0).toFixed(1)}</span>
              </div>
              <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${char.walkingModule?.maxWalkSpeed ?? 6.0}">
            </div>
          </div>
        `;
      }

      if (hasStrength) {
        attachedCount++;
        html += `
          <div class="module-card" data-module-id="strength">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>💪 Strength Ability</label>
              <button class="btn-remove-module" data-module-id="strength" title="Remove Strength Ability">✕ Remove</button>
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Muscle Strength Ratio</span>
                <span id="val-strength">${(char.strengthModule?.strength ?? 1.0).toFixed(1)}×</span>
              </div>
              <input type="range" id="slide-strength" min="0.2" max="4.0" step="0.1" value="${char.strengthModule?.strength ?? 1.0}">
            </div>
          </div>
        `;
      }

      if (hasPickup) {
        attachedCount++;
        html += `
          <div class="module-card" data-module-id="pickup">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>✋ Pickup Ability</label>
              <button class="btn-remove-module" data-module-id="pickup" title="Remove Pickup Ability">✕ Remove</button>
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Pickup Reach (3D)</span>
                <span id="val-pickup-reach">${(char.pickupModule?.pickupReach ?? 1.3).toFixed(1)} u</span>
              </div>
              <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${char.pickupModule?.pickupReach ?? 1.3}">
            </div>
          </div>
        `;
      }

      if (hasThrow) {
        attachedCount++;
        html += `
          <div class="module-card" data-module-id="throw">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🎯 Throw Ability</label>
              <button class="btn-remove-module" data-module-id="throw" title="Remove Throw Ability">✕ Remove</button>
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Base Throw Power (u/s)</span>
                <span id="val-throw-force">${(char.throwModule?.baseThrowForce ?? 7.6).toFixed(1)}</span>
              </div>
              <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${char.throwModule?.baseThrowForce ?? 7.6}">
            </div>
          </div>
        `;
      }

      if (hasJump) {
        attachedCount++;
        html += `
          <div class="module-card" data-module-id="jump">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🦘 Jump Ability</label>
              <button class="btn-remove-module" data-module-id="jump" title="Remove Jump Ability">✕ Remove</button>
            </div>
            ${!hasVertPos ? `<div class="module-dep-warning">⚠️ Requires Vertical Position (3D Z-axis)</div>` : ''}
            <div class="slider-group">
              <div class="slider-label">
                <span>Jump Strength (N·s)</span>
                <span id="val-jump-strength">${(char.jumpModule?.jumpStrength ?? 11.6).toFixed(1)}</span>
              </div>
              <input type="range" id="slide-jump-strength" min="2.0" max="40.0" step="0.5" value="${char.jumpModule?.jumpStrength ?? 11.6}">
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Max Takeoff Speed (u/s)</span>
                <span id="val-jump-max-speed">${(char.jumpModule?.maxInitialSpeed ?? 15.0).toFixed(1)}</span>
              </div>
              <input type="range" id="slide-jump-max-speed" min="2.0" max="30.0" step="0.5" value="${char.jumpModule?.maxInitialSpeed ?? 15.0}">
            </div>
          </div>
        `;
      }

      if (hasEdgeAssist) {
        attachedCount++;
        html += `
          <div class="module-card" data-module-id="wallEdgeAssist">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🛡️ Wall Edge Assist</label>
              <button class="btn-remove-module" data-module-id="wallEdgeAssist" title="Remove Wall Edge Assist">✕ Remove</button>
            </div>
            <div class="toggle-row" style="margin-bottom: 8px;">
              <label style="font-size: 0.8rem;">Prevent Walk-Off</label>
              <button id="toggle-edge-walkoff" class="btn-toggle ${char.wallEdgeAssistModule?.preventWalkOff ? 'active' : ''}">
                ${char.wallEdgeAssistModule?.preventWalkOff ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Ledge Hang Distance (u)</span>
                <span id="val-edge-hang">${(char.wallEdgeAssistModule?.hangDistance ?? 0.10).toFixed(2)}</span>
              </div>
              <input type="range" id="slide-edge-hang" min="0.02" max="0.5" step="0.01" value="${char.wallEdgeAssistModule?.hangDistance ?? 0.10}">
            </div>
          </div>
        `;
      }

      if (hasClimbing) {
        attachedCount++;
        html += `
          <div class="module-card" data-module-id="climbing">
            <div class="toggle-row" style="margin-bottom: 2px;">
              <label>🧗 Climbing Ability</label>
              <button class="btn-remove-module" data-module-id="climbing" title="Remove Climbing Ability">✕ Remove</button>
            </div>
            ${(!hasVertPos || !hasStrength) ? `<div class="module-dep-warning">${!hasVertPos ? '⚠️ Requires Vertical Position (3D Z-axis)' : '⚠️ Requires Strength Ability to climb'}</div>` : ''}
            <div class="toggle-row" style="margin-bottom: 8px;">
              <label style="font-size: 0.8rem;">Sideways Climb</label>
              <button id="toggle-climb-sideways" class="btn-toggle ${char.climbingModule?.horizontalClimb ? 'active' : ''}">
                ${char.climbingModule?.horizontalClimb ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Max Adhesion (N)</span>
                <span id="val-climb-adhesion">${(char.climbingModule?.maxAdhesion ?? 105.0).toFixed(0)}</span>
              </div>
              <input type="range" id="slide-climb-adhesion" min="15.0" max="240.0" step="5.0" value="${char.climbingModule?.maxAdhesion ?? 105.0}">
            </div>
            <div class="slider-group">
              <div class="slider-label">
                <span>Max Climb Speed (u/s)</span>
                <span id="val-climb-speed">${(char.climbingModule?.maxClimbSpeed ?? 3.0).toFixed(1)}</span>
              </div>
              <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${char.climbingModule?.maxClimbSpeed ?? 3.0}">
            </div>
          </div>
        `;
      }
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
      { id: "collider", name: "Collider", icon: "🛡️", description: "Solid physical bounds & collision with walls and entities", isAttached: hasCollider },
      { id: "mass", name: "Mass", icon: "⚖️", description: "Physical mass, weight, inertia, and momentum transfer", isAttached: hasMass },
      { id: "friction", name: "Friction", icon: "🛝", description: "Ground friction, stopping resistance, and deceleration", isAttached: hasFriction },
      { id: "bounce", name: "Bounciness", icon: "🏀", description: "Elastic restitution on collisions and impacts", isAttached: hasBounce },
      { id: "verticalPosition", name: "Vertical Position", icon: "↕️", description: "3D elevation (z-axis) and vertical velocity", isAttached: hasVertPos },
      { id: "gravity", name: "Gravity", icon: "🪐", description: "Downward gravitational acceleration toward ground", isAttached: hasGravity },
      { id: "roll", name: "Roll", icon: "🔄", description: "3D angular rotation and rolling resistance", isAttached: hasRoll },
    ];

    if (isChar) {
      allModules.push(
        { id: "walking", name: "Walking Ability", icon: "🚶", description: "Propulsion acceleration and maximum ground speed", isAttached: hasWalking },
        { id: "strength", name: "Strength Ability", icon: "💪", description: "Muscle power for throw speed and climbing", isAttached: hasStrength },
        { id: "pickup", name: "Pickup Ability", icon: "✋", description: "3D sphere reach to pick up and swap freebodies", isAttached: hasPickup },
        { id: "throw", name: "Throw Ability", icon: "🎯", description: "Ballistic parabolic trajectory projection & launch", isAttached: hasThrow },
        { id: "jump", name: "Jump Ability", icon: "🦘", description: "Vertical leap triggered with Space / Gamepad (A)", isAttached: hasJump },
        { id: "wallEdgeAssist", name: "Wall Edge Assist", icon: "🛡️", description: "Ledge guardrail preventing accidental walk-off on wall tops", isAttached: hasEdgeAssist },
        { id: "climbing", name: "Climbing Ability", icon: "🧗", description: "Wall mounting, adhesive grip, and vertical climb traversal", isAttached: hasClimbing }
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

  private removeModuleFromSelectedEntity(modId: string): void {
    const e = this.selectedEntity;
    switch (modId) {
      case "collider":
        e.colliderModule = null;
        break;
      case "mass":
        e.massModule = null;
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
      case "strength":
        if (e instanceof Character) {
          (e as Character).strengthModule = null;
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
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
  }

  private addModuleToSelectedEntity(modId: string): void {
    const e = this.selectedEntity;
    switch (modId) {
      case "collider":
        e.colliderModule = new ColliderModule({ radius: 0.32 });
        break;
      case "mass":
        e.massModule = new MassModule({ mass: 1.0 });
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
      case "strength":
        if (e instanceof Character) {
          (e as Character).strengthModule = new StrengthModule({ strength: 1.0 });
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
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
  }

  private bindDynamicModuleControls(): void {
    const e = this.selectedEntity;
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    // Collider
    this.setupSlider("slide-entity-radius", "val-entity-radius", (val) => {
      e.colliderRadius = val;
    }, 2);

    // Mass
    this.setupSlider("slide-entity-mass", "val-entity-mass", (val) => {
      e.mass = val;
      this.updateSelectorOptions();
    }, 1);

    // Friction
    this.setupSlider("slide-entity-static-fric", "val-entity-static-fric", (val) => {
      e.staticGroundFrictionMod = val;
    }, 2);
    this.setupSlider("slide-entity-dynamic-fric", "val-entity-dynamic-fric", (val) => {
      e.dynamicGroundFrictionMod = val;
    }, 2);

    // Bounce
    this.setupSlider("slide-entity-bounce", "val-entity-bounce", (val) => {
      e.bounceMod = val;
    }, 2);
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

    const btnVertVel = this.container.querySelector("#toggle-mod-vert-vel") as HTMLButtonElement;
    btnVertVel?.addEventListener("click", () => {
      if (e.verticalPositionModule) {
        e.verticalPositionModule.hasVerticalVelocity = !e.verticalPositionModule.hasVerticalVelocity;
        if (!e.verticalPositionModule.hasVerticalVelocity) {
          e.verticalVelocity = 0;
        }
      }
      this.renderEntityModules();
      this.updateInspector();
    });

    this.setupSlider("slide-entity-vert-vel", "val-entity-vert-vel", (val) => {
      e.verticalVelocity = val;
    }, 2);

    // Roll
    this.setupSlider("slide-entity-roll-resist", "val-entity-roll-resist", (val) => {
      if (e.rollModule) {
        e.rollModule.rollResistance = val;
      }
    }, 2);

    // Character Abilities
    if (isChar && char) {
      this.setupSlider("slide-walk-force", "val-walk-force", (val) => {
        if (char.walkingModule) char.walkingModule.maxWalkForce = val;
      }, 0);
      this.setupSlider("slide-walk-speed", "val-walk-speed", (val) => {
        if (char.walkingModule) char.walkingModule.maxWalkSpeed = val;
      }, 1);

      this.setupSlider("slide-strength", "val-strength", (val) => {
        char.strength = val;
      }, 1);

      this.setupSlider("slide-pickup-reach", "val-pickup-reach", (val) => {
        if (char.pickupModule) char.pickupModule.pickupReach = val;
      }, 1);

      this.setupSlider("slide-throw-force", "val-throw-force", (val) => {
        if (char.throwModule) char.throwModule.baseThrowForce = val;
      }, 1);

      // Jump Ability
      this.setupSlider("slide-jump-strength", "val-jump-strength", (val) => {
        if (char.jumpModule) char.jumpModule.jumpStrength = val;
      }, 1);
      this.setupSlider("slide-jump-max-speed", "val-jump-max-speed", (val) => {
        if (char.jumpModule) char.jumpModule.maxInitialSpeed = val;
      }, 1);

      // Wall Edge Assist
      const btnEdgeWalkOff = this.container.querySelector("#toggle-edge-walkoff") as HTMLButtonElement;
      btnEdgeWalkOff?.addEventListener("click", () => {
        if (char.wallEdgeAssistModule) {
          char.wallEdgeAssistModule.preventWalkOff = !char.wallEdgeAssistModule.preventWalkOff;
          btnEdgeWalkOff.classList.toggle("active", char.wallEdgeAssistModule.preventWalkOff);
          btnEdgeWalkOff.textContent = char.wallEdgeAssistModule.preventWalkOff ? "Active" : "Inactive";
        }
      });
      this.setupSlider("slide-edge-hang", "val-edge-hang", (val) => {
        if (char.wallEdgeAssistModule) char.wallEdgeAssistModule.hangDistance = val;
      }, 2);

      const btnClimbSideways = this.container.querySelector("#toggle-climb-sideways") as HTMLButtonElement;
      btnClimbSideways?.addEventListener("click", () => {
        if (char.climbingModule) {
          char.climbingModule.horizontalClimb = !char.climbingModule.horizontalClimb;
          btnClimbSideways.classList.toggle("active", char.climbingModule.horizontalClimb);
          btnClimbSideways.textContent = char.climbingModule.horizontalClimb ? "Active" : "Inactive";
        }
      });

      this.setupSlider("slide-climb-adhesion", "val-climb-adhesion", (val) => {
        if (char.climbingModule) char.climbingModule.maxAdhesion = val;
      }, 0);
      this.setupSlider("slide-climb-speed", "val-climb-speed", (val) => {
        if (char.climbingModule) char.climbingModule.maxClimbSpeed = val;
      }, 1);
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

    // Collider
    const colBtn = this.container.querySelector("#creator-toggle-collider") as HTMLButtonElement;
    const colGrp = this.container.querySelector("#grp-creator-radius") as HTMLElement;
    if (colBtn) { colBtn.textContent = s.hasCollider ? "Attached" : "Detached"; colBtn.classList.toggle("active", s.hasCollider); }
    if (colGrp) colGrp.style.display = s.hasCollider ? "block" : "none";
    this.setSliderVal("slide-creator-radius", "val-creator-radius", s.colliderRadius, 2);

    // Mass
    const massBtn = this.container.querySelector("#creator-toggle-mass") as HTMLButtonElement;
    const massGrp = this.container.querySelector("#grp-creator-mass") as HTMLElement;
    if (massBtn) { massBtn.textContent = s.hasMass ? "Attached" : "Detached"; massBtn.classList.toggle("active", s.hasMass); }
    if (massGrp) massGrp.style.display = s.hasMass ? "block" : "none";
    this.setSliderVal("slide-creator-mass", "val-creator-mass", s.mass, 1);

    // Friction
    const fricBtn = this.container.querySelector("#creator-toggle-friction") as HTMLButtonElement;
    const fricGrp = this.container.querySelector("#grp-creator-fric") as HTMLElement;
    if (fricBtn) { fricBtn.textContent = s.hasFriction ? "Attached" : "Detached"; fricBtn.classList.toggle("active", s.hasFriction); }
    if (fricGrp) fricGrp.style.display = s.hasFriction ? "block" : "none";
    this.setSliderVal("slide-creator-fric", "val-creator-fric", s.dynamicFrictionMod, 2);

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
    this.setSliderVal("slide-creator-bounce", "val-creator-bounce", s.bounceMod, 2);

    // Vertical Position
    const vertPosBtn = this.container.querySelector("#creator-toggle-vert-pos") as HTMLButtonElement;
    const vertPosGrp = this.container.querySelector("#grp-creator-vert-pos") as HTMLElement;
    if (vertPosBtn) {
      vertPosBtn.textContent = s.hasVerticalPosition ? "Attached" : "Detached";
      vertPosBtn.classList.toggle("active", s.hasVerticalPosition);
    }
    if (vertPosGrp) vertPosGrp.style.display = s.hasVerticalPosition ? "block" : "none";
    this.setSliderVal("slide-creator-elevation", "val-creator-elevation", s.elevation, 2);

    // Vertical Velocity toggle
    const vertVelBtn = this.container.querySelector("#creator-toggle-vert-vel") as HTMLButtonElement;
    if (vertVelBtn) {
      vertVelBtn.textContent = s.hasVerticalVelocity ? "Enabled" : "Disabled";
      vertVelBtn.classList.toggle("active", s.hasVerticalVelocity);
    }

    // Gravity
    const gravBtn = this.container.querySelector("#creator-toggle-gravity") as HTMLButtonElement;
    if (gravBtn) { gravBtn.textContent = s.hasGravity ? "Attached" : "Detached"; gravBtn.classList.toggle("active", s.hasGravity); }

    // Roll
    const rollBtn = this.container.querySelector("#creator-toggle-roll") as HTMLButtonElement;
    const rollGrp = this.container.querySelector("#group-creator-roll-resist") as HTMLElement;
    if (rollBtn) { rollBtn.textContent = s.hasRollModule ? "Enabled" : "Disabled"; rollBtn.classList.toggle("active", s.hasRollModule); }
    if (rollGrp) rollGrp.style.display = s.hasRollModule ? "block" : "none";
    this.setSliderVal("slide-creator-roll-resist", "val-creator-roll-resist", s.rollResistance, 2);
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

    // 7. World Physics Sliders
    this.setupSlider("slide-gravity", "val-gravity", (val) => {
      this.arena.gravity = val;
    }, 1);

    this.setupSlider("slide-wall-height", "val-wall-height", (val) => {
      this.arena.setStandardWallHeight(val);
      this.setSliderVal("slide-editor-wall-height", "val-editor-wall-height", val, 1);
    }, 1);

    this.setupSlider("slide-editor-wall-height", "val-editor-wall-height", (val) => {
      this.arena.setStandardWallHeight(val);
      this.setSliderVal("slide-wall-height", "val-wall-height", val, 1);
    }, 1);

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

    this.setupSlider("slide-friction", "val-friction", (val) => {
      this.arena.frictionCoeff = val;
    }, 1);

    this.setupSlider("slide-static-thresh", "val-static-thresh", (val) => {
      this.arena.staticFrictionThreshold = val;
    }, 2);

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

    const creatorColBtn = this.container.querySelector("#creator-toggle-collider") as HTMLButtonElement;
    creatorColBtn?.addEventListener("click", () => {
      this.creatorState.hasCollider = !this.creatorState.hasCollider;
      creatorColBtn.textContent = this.creatorState.hasCollider ? "Attached" : "Detached";
      creatorColBtn.classList.toggle("active", this.creatorState.hasCollider);
      const grp = this.container.querySelector("#grp-creator-radius") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasCollider ? "block" : "none";
    });
    this.setupSlider("slide-creator-radius", "val-creator-radius", (v) => { this.creatorState.colliderRadius = v; }, 2);

    const creatorMassBtn = this.container.querySelector("#creator-toggle-mass") as HTMLButtonElement;
    creatorMassBtn?.addEventListener("click", () => {
      this.creatorState.hasMass = !this.creatorState.hasMass;
      creatorMassBtn.textContent = this.creatorState.hasMass ? "Attached" : "Detached";
      creatorMassBtn.classList.toggle("active", this.creatorState.hasMass);
      const grp = this.container.querySelector("#grp-creator-mass") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasMass ? "block" : "none";
    });
    this.setupSlider("slide-creator-mass", "val-creator-mass", (v) => { this.creatorState.mass = v; }, 1);

    const creatorFricBtn = this.container.querySelector("#creator-toggle-friction") as HTMLButtonElement;
    creatorFricBtn?.addEventListener("click", () => {
      this.creatorState.hasFriction = !this.creatorState.hasFriction;
      creatorFricBtn.textContent = this.creatorState.hasFriction ? "Attached" : "Detached";
      creatorFricBtn.classList.toggle("active", this.creatorState.hasFriction);
      const grp = this.container.querySelector("#grp-creator-fric") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasFriction ? "block" : "none";
    });
    this.setupSlider("slide-creator-fric", "val-creator-fric", (v) => { this.creatorState.dynamicFrictionMod = v; }, 2);

    const creatorBounceBtn = this.container.querySelector("#creator-toggle-bounce") as HTMLButtonElement;
    creatorBounceBtn?.addEventListener("click", () => {
      this.creatorState.hasBounce = !this.creatorState.hasBounce;
      creatorBounceBtn.textContent = this.creatorState.hasBounce ? "Attached" : "Detached";
      creatorBounceBtn.classList.toggle("active", this.creatorState.hasBounce);
      const grp = this.container.querySelector("#grp-creator-bounce") as HTMLElement;
      if (grp) grp.style.display = this.creatorState.hasBounce ? "block" : "none";
    });
    this.setupSlider("slide-creator-bounce", "val-creator-bounce", (v) => { this.creatorState.bounceMod = v; }, 2);

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
    this.setupSlider("slide-creator-elevation", "val-creator-elevation", (v) => { this.creatorState.elevation = v; }, 2);

    const creatorVertVelBtn = this.container.querySelector("#creator-toggle-vert-vel") as HTMLButtonElement;
    creatorVertVelBtn?.addEventListener("click", () => {
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
    this.setupSlider("slide-creator-roll-resist", "val-creator-roll-resist", (v) => { this.creatorState.rollResistance = v; }, 2);

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
      colliderModule: s.hasCollider ? new ColliderModule({ radius: s.colliderRadius }) : null,
      massModule: s.hasMass ? new MassModule({ mass: s.mass }) : null,
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
      colliderModule: orig.colliderModule ? new ColliderModule({ radius: orig.colliderModule.radius, enabled: orig.colliderModule.enabled }) : null,
      massModule: orig.massModule ? new MassModule({ mass: orig.massModule.mass, enabled: orig.massModule.enabled }) : null,
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

    this.inspectorEl.innerHTML = `
      <div class="inspect-item">
        <span class="inspect-k">Selected</span>
        <span class="inspect-v highlight-held">${e.name}</span>
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
        <span class="inspect-v ${e.hasVerticalVelocity ? '' : 'highlight-held'}">${e.hasVerticalVelocity ? `${e.verticalVelocity.toFixed(2)} u/s` : 'Disabled (0 u/s)'}</span>
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
