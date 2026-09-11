import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { WalkingModule } from "../character/WalkingModule.js";
import { PickupModule } from "../character/PickupModule.js";
import { ThrowModule } from "../character/ThrowModule.js";
import { ClimbingModule } from "../character/ClimbingModule.js";
import { StrengthModule } from "../character/StrengthModule.js";
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
  private characterSpecificControlsEl!: HTMLElement;
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
  }) {
    this.container = options.container;
    this.character = options.character;
    this.arena = options.arena;
    this.objects = options.objects;
    this.onSpawnObject = options.onSpawnObject;
    this.onDeleteObject = options.onDeleteObject;
    this.onClearObjects = options.onClearObjects;

    this.selectedEntity = this.character;

    this.renderPanel();
  }

  public setSelectedEntity(entity: GameObject): void {
    this.selectedEntity = entity;
    this.updateSelectorOptions();
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
    const currentId = this.selectedEntity.id;

    let html = `<option value="${this.character.id}" ${currentId === this.character.id ? "selected" : ""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;
    for (const obj of this.objects) {
      const isSel = obj.id === currentId ? "selected" : "";
      const icon = obj.visualShape === "box" ? "📦" : "⚪";
      const massDesc = obj.hasMass ? `${obj.mass.toFixed(1)}kg` : "Massless";
      html += `<option value="${obj.id}" ${isSel}>${icon} ${obj.name} (${massDesc})</option>`;
    }
    this.entitySelectorEl.innerHTML = html;

    const isChar = this.selectedEntity === this.character;
    if (this.characterSpecificControlsEl) {
      this.characterSpecificControlsEl.style.display = isChar ? "flex" : "none";
    }
    if (this.objectSpecificControlsEl) {
      this.objectSpecificControlsEl.style.display = isChar ? "none" : "flex";
    }
  }

  private renderPanel(): void {
    this.container.innerHTML = `
      <div class="dev-panel-header">
        <div class="header-top-row">
          <h2>🛠️ Sandbox & Engine</h2>
          <span class="badge">1 Wall = 1 Unit</span>
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
          <div class="toggle-row" id="row-visual-shape" style="${this.selectedEntity === this.character ? 'display:none;' : ''}">
            <label>Visual Shape</label>
            <button id="toggle-entity-shape" class="btn-toggle ${this.selectedEntity.visualShape === 'box' ? 'active' : ''}">
              ${this.selectedEntity.visualShape === 'box' ? 'Box 📦' : 'Circle ⚪'}
            </button>
          </div>

          <!-- 1. Collider -->
          <div class="module-card">
            <div class="toggle-row">
              <label>🛡️ Collider</label>
              <button id="toggle-mod-collider" class="btn-toggle ${this.selectedEntity.hasCollider ? 'active' : ''}">
                ${this.selectedEntity.hasCollider ? 'Attached' : 'Detached'}
              </button>
            </div>
            <div id="group-mod-collider" style="display: ${this.selectedEntity.hasCollider ? 'block' : 'none'};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Collider Radius (u)</span>
                  <span id="val-entity-radius">${(this.selectedEntity.colliderModule?.radius ?? 0.32).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-radius" min="0.1" max="1.5" step="0.02" value="${this.selectedEntity.colliderModule?.radius ?? 0.32}">
              </div>
            </div>
            <div id="note-mod-collider" class="module-detached-note" style="display: ${!this.selectedEntity.hasCollider ? 'block' : 'none'};">
              Passes freely through all walls and objects
            </div>
          </div>

          <!-- 2. Mass -->
          <div class="module-card">
            <div class="toggle-row">
              <label>⚖️ Mass</label>
              <button id="toggle-mod-mass" class="btn-toggle ${this.selectedEntity.hasMass ? 'active' : ''}">
                ${this.selectedEntity.hasMass ? 'Attached' : 'Detached'}
              </button>
            </div>
            <div id="group-mod-mass" style="display: ${this.selectedEntity.hasMass ? 'block' : 'none'};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Mass (kg)</span>
                  <span id="val-entity-mass">${(this.selectedEntity.massModule?.mass ?? 1.0).toFixed(1)}</span>
                </div>
                <input type="range" id="slide-entity-mass" min="0.1" max="8.0" step="0.1" value="${this.selectedEntity.massModule?.mass ?? 1.0}">
              </div>
            </div>
            <div id="note-mod-mass" class="module-detached-note" style="display: ${!this.selectedEntity.hasMass ? 'block' : 'none'};">
              Massless: imparts 0 resistance on massive bodies, only inherits velocity
            </div>
          </div>

          <!-- 3. Friction (Requires Mass) -->
          <div class="module-card" id="card-mod-friction">
            <div class="toggle-row">
              <label>🛝 Friction</label>
              <button id="toggle-mod-friction" class="btn-toggle ${this.selectedEntity.frictionModule?.enabled ? 'active' : ''}">
                ${this.selectedEntity.frictionModule?.enabled ? 'Attached' : 'Detached'}
              </button>
            </div>
            <div id="warn-friction-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass && this.selectedEntity.frictionModule?.enabled ? 'block' : 'none'};">
              ⚠️ Inactive without Mass (no normal force)
            </div>
            <div id="group-mod-friction" style="display: ${this.selectedEntity.frictionModule?.enabled ? 'flex' : 'none'}; flex-direction: column; gap: 8px;">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Static Friction Mod</span>
                  <span id="val-entity-static-fric">${(this.selectedEntity.frictionModule?.staticFrictionMod ?? 1.0).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${this.selectedEntity.frictionModule?.staticFrictionMod ?? 1.0}">
              </div>
              <div class="slider-group">
                <div class="slider-label">
                  <span>Dynamic Friction Mod</span>
                  <span id="val-entity-dynamic-fric">${(this.selectedEntity.frictionModule?.dynamicFrictionMod ?? 1.0).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${this.selectedEntity.frictionModule?.dynamicFrictionMod ?? 1.0}">
              </div>
            </div>
            <div id="note-mod-friction" class="module-detached-note" style="display: ${!this.selectedEntity.frictionModule?.enabled ? 'block' : 'none'};">
              Frictionless: glides indefinitely without ground resistance
            </div>
          </div>

          <!-- 4. Bounciness (Requires Mass) -->
          <div class="module-card" id="card-mod-bounce">
            <div class="toggle-row">
              <label>🏀 Bounciness</label>
              <button id="toggle-mod-bounce" class="btn-toggle ${this.selectedEntity.bounceModule?.enabled ? 'active' : ''}">
                ${this.selectedEntity.bounceModule?.enabled ? 'Attached' : 'Detached'}
              </button>
            </div>
            <div id="warn-bounce-mass" class="module-dep-warning" style="display: ${!this.selectedEntity.hasMass && this.selectedEntity.bounceModule?.enabled ? 'block' : 'none'};">
              ⚠️ Inactive without Mass (no restitution calculation)
            </div>
            <div id="group-mod-bounce" style="display: ${this.selectedEntity.bounceModule?.enabled ? 'block' : 'none'};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Bounciness (Restitution)</span>
                  <span id="val-entity-bounce">${(this.selectedEntity.bounceModule?.bounceMod ?? 0.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-bounce" min="0.05" max="1.0" step="0.05" value="${this.selectedEntity.bounceModule?.bounceMod ?? 0.4}">
              </div>
              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" id="check-mod-vert-bounce" ${this.selectedEntity.bounceModule?.verticalBounce ? 'checked' : ''}>
                  <span>Vertical Bounce</span>
                </label>
              </div>
              <div id="warn-bounce-vert-vel" class="module-dep-warning" style="display: ${this.selectedEntity.bounceModule?.enabled && this.selectedEntity.bounceModule?.verticalBounce && !this.selectedEntity.hasVerticalVelocity ? 'block' : 'none'};">
                ⚠️ Inactive without Vertical Velocity
              </div>
            </div>
            <div id="note-mod-bounce" class="module-detached-note" style="display: ${!this.selectedEntity.bounceModule?.enabled ? 'block' : 'none'};">
              Zero bounce: impact velocity immediately absorbed
            </div>
          </div>

          <!-- 5. Vertical Position & Velocity -->
          <div class="module-card" id="card-mod-vert-pos">
            <div class="toggle-row">
              <label>↕️ Vertical Position</label>
              <button id="toggle-mod-vert-pos" class="btn-toggle ${this.selectedEntity.hasVerticalPosition ? 'active' : ''}">
                ${this.selectedEntity.hasVerticalPosition ? 'Attached' : 'Detached'}
              </button>
            </div>
            <div id="group-mod-vert-pos" style="display: ${this.selectedEntity.hasVerticalPosition ? 'block' : 'none'};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Elevation (z)</span>
                  <span id="val-entity-elevation">${this.selectedEntity.position.z.toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-elevation" min="0.0" max="4.0" step="0.05" value="${this.selectedEntity.position.z}">
              </div>

              <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                <label style="font-size: 0.8rem; color: #e2e8f0;">Vertical Velocity</label>
                <button id="toggle-mod-vert-vel" class="btn-toggle ${this.selectedEntity.hasVerticalVelocity ? 'active' : ''}">
                  ${this.selectedEntity.hasVerticalVelocity ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div id="group-mod-vert-vel" style="display: ${this.selectedEntity.hasVerticalVelocity ? 'block' : 'none'}; margin-top: 6px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Vertical Velocity (u/s)</span>
                    <span id="val-entity-vert-vel">${this.selectedEntity.verticalVelocity.toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-entity-vert-vel" min="-12" max="12" step="0.2" value="${this.selectedEntity.verticalVelocity}">
                </div>
              </div>
            </div>
            <div id="note-mod-vert-pos" class="module-detached-note" style="display: ${!this.selectedEntity.hasVerticalPosition ? 'block' : 'none'};">
              Flat on ground: entity has no vertical position (z = 0)
            </div>
          </div>

          <!-- 6. Gravity -->
          <div class="module-card">
            <div class="toggle-row">
              <label>🪐 Gravity</label>
              <button id="toggle-mod-gravity" class="btn-toggle ${this.selectedEntity.hasGravity ? 'active' : ''}">
                ${this.selectedEntity.hasGravity ? 'Attached' : 'Detached'}
              </button>
            </div>
            <div id="note-mod-gravity" class="module-detached-note">
              ${this.selectedEntity.hasGravity ? "Subject to static world gravity acceleration" : "Zero-G: never falls, flies horizontally in a straight line"}
            </div>
          </div>

          <!-- 7. Roll -->
          <div class="module-card">
            <div class="toggle-row">
              <label>🔄 Roll</label>
              <button id="toggle-mod-roll" class="btn-toggle ${this.selectedEntity.rollModule?.enabled ? 'active' : ''}">
                ${this.selectedEntity.rollModule?.enabled ? 'Attached' : 'Detached'}
              </button>
            </div>
            <div id="note-roll-friction" class="module-detached-note" style="display: ${this.selectedEntity.rollModule?.enabled && !this.selectedEntity.hasFriction ? 'block' : 'none'}; color: #cbd5e1;">
              ℹ️ Spin not resisted without Friction
            </div>
            <div id="group-mod-roll" style="display: ${this.selectedEntity.rollModule?.enabled ? 'block' : 'none'};">
              <div class="slider-group">
                <div class="slider-label">
                  <span>Roll Resistance (u/s²)</span>
                  <span id="val-entity-roll-resist">${(this.selectedEntity.rollModule?.rollResistance ?? 0.4).toFixed(2)}</span>
                </div>
                <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${this.selectedEntity.rollModule?.rollResistance ?? 0.4}">
              </div>
            </div>
          </div>

          <!-- 7. Character Specific Capabilities (Walking, Pickup, Throw) -->
          <div id="character-specific-controls" style="display: ${this.selectedEntity === this.character ? 'flex' : 'none'}; flex-direction: column; gap: 10px;">
            <h4 style="margin-top: 6px; font-size: 0.78rem; color: #94a3b8; text-transform: uppercase;">Character Abilities</h4>

            <!-- Walking Ability -->
            <div class="module-card" id="card-mod-walking">
              <div class="toggle-row">
                <label>🚶 Walking Ability</label>
                <button id="toggle-walk" class="btn-toggle ${this.character.walkingModule?.enabled ? 'active' : ''}">
                  ${this.character.walkingModule?.enabled ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="warn-walk-friction" class="module-dep-warning" style="display: ${!this.character.hasFriction && this.character.walkingModule?.enabled ? 'block' : 'none'};">
                ⚠️ Feet slip without Friction (cannot push ground)
              </div>
              <div id="warn-walk-strength" class="module-dep-warning" style="display: ${!this.character.hasStrength && this.character.walkingModule?.enabled ? 'block' : 'none'};">
                ⚠️ Requires Strength Ability (cannot propel body without muscle strength)
              </div>
              <div id="group-mod-walking" style="display: ${this.character.walkingModule?.enabled ? 'flex' : 'none'}; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Force (N)</span>
                    <span id="val-walk-force">${(this.character.walkingModule?.maxWalkForce ?? 35.0).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${this.character.walkingModule?.maxWalkForce ?? 35.0}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Walk Speed Cap (u/s)</span>
                    <span id="val-walk-speed">${(this.character.walkingModule?.maxWalkSpeed ?? 5.2).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${this.character.walkingModule?.maxWalkSpeed ?? 5.2}">
                </div>
              </div>
            </div>

            <!-- Strength Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>💪 Strength Ability</label>
                <button id="toggle-strength" class="btn-toggle ${this.character.strengthModule?.enabled ? 'active' : ''}">
                  ${this.character.strengthModule?.enabled ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="group-mod-strength" style="display: ${this.character.strengthModule?.enabled ? 'block' : 'none'};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Muscle Strength</span>
                    <span id="val-strength">${(this.character.strength ?? 1.0).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-strength" min="0.1" max="5.0" step="0.1" value="${this.character.strength ?? 1.0}">
                </div>
              </div>
            </div>

            <!-- Pickup Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>✋ Pickup Ability</label>
                <button id="toggle-pickup" class="btn-toggle ${this.character.pickupModule?.enabled ? 'active' : ''}">
                  ${this.character.pickupModule?.enabled ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="group-mod-pickup" style="display: ${this.character.pickupModule?.enabled ? 'block' : 'none'};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Pickup Reach (u)</span>
                    <span id="val-pickup-reach">${(this.character.pickupModule?.pickupReach ?? 1.3).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${this.character.pickupModule?.pickupReach ?? 1.3}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Cross-Layer Reach Ratio</span>
                    <span id="val-pickup-cross-layer">${(this.character.pickupModule?.crossLayerReachRatio ?? 0.55).toFixed(2)}</span>
                  </div>
                  <input type="range" id="slide-pickup-cross-layer" min="0.10" max="1.00" step="0.05" value="${this.character.pickupModule?.crossLayerReachRatio ?? 0.55}">
                </div>
              </div>
            </div>

            <!-- Throw Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🎯 Throw Ability</label>
                <button id="toggle-throw" class="btn-toggle ${this.character.throwModule?.enabled ? 'active' : ''}">
                  ${this.character.throwModule?.enabled ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="group-mod-throw" style="display: ${this.character.throwModule?.enabled ? 'block' : 'none'};">
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Base Throw Power (u/s)</span>
                    <span id="val-throw-force">${(this.character.throwModule?.baseThrowForce ?? 7.6).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${this.character.throwModule?.baseThrowForce ?? 7.6}">
                </div>
              </div>
            </div>

            <!-- Climbing Ability -->
            <div class="module-card">
              <div class="toggle-row">
                <label>🧗 Climbing Ability</label>
                <button id="toggle-climb" class="btn-toggle ${this.character.climbingModule?.enabled ? 'active' : ''}">
                  ${this.character.climbingModule?.enabled ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="warn-climb-deps" class="module-dep-warning" style="display: ${(!this.character.hasVerticalPosition || !this.character.hasStrength) && this.character.climbingModule?.enabled ? 'block' : 'none'};">
                ${!this.character.hasVerticalPosition ? '⚠️ Requires Vertical Position (3D Z-axis)' : (!this.character.hasStrength ? '⚠️ Requires Strength Ability to climb' : '')}
              </div>
              <div id="group-mod-climb" style="display: ${this.character.climbingModule?.enabled ? 'block' : 'none'};">
                <div class="toggle-row" style="margin-bottom: 8px;">
                  <label style="font-size: 0.8rem;">Prevent Walk-Off (Require Space)</label>
                  <button id="toggle-climb-walkoff" class="btn-toggle ${this.character.climbingModule?.preventWalkOff ? 'active' : ''}">
                    ${this.character.climbingModule?.preventWalkOff ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Adhesion (N)</span>
                    <span id="val-climb-adhesion">${(this.character.climbingModule?.maxAdhesion ?? 35.0).toFixed(0)}</span>
                  </div>
                  <input type="range" id="slide-climb-adhesion" min="5.0" max="80.0" step="1.0" value="${this.character.climbingModule?.maxAdhesion ?? 35.0}">
                </div>
                <div class="slider-group">
                  <div class="slider-label">
                    <span>Max Climb Speed (u/s)</span>
                    <span id="val-climb-speed">${(this.character.climbingModule?.maxClimbSpeed ?? 3.0).toFixed(1)}</span>
                  </div>
                  <input type="range" id="slide-climb-speed" min="0.5" max="8.0" step="0.1" value="${this.character.climbingModule?.maxClimbSpeed ?? 3.0}">
                </div>
              </div>
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
            <input type="range" id="slide-gravity" min="1.0" max="30.0" step="0.5" value="${this.arena.gravity}">
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
    this.characterSpecificControlsEl = this.container.querySelector("#character-specific-controls")!;
    this.objectSpecificControlsEl = this.container.querySelector("#object-actions-row")!;
    this.modePlayBtn = this.container.querySelector("#mode-play")!;
    this.modeEditBtn = this.container.querySelector("#mode-edit")!;

    this.updateSelectorOptions();
    this.bindEvents();
  }

  public syncEntitySliders(): void {
    const e = this.selectedEntity;
    const isChar = e === this.character;

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

    // 1. Collider Module
    const btnCollider = this.container.querySelector("#toggle-mod-collider") as HTMLButtonElement;
    const grpCollider = this.container.querySelector("#group-mod-collider") as HTMLElement;
    const noteCollider = this.container.querySelector("#note-mod-collider") as HTMLElement;
    if (btnCollider) {
      btnCollider.textContent = e.hasCollider ? "Attached" : "Detached";
      btnCollider.classList.toggle("active", e.hasCollider);
    }
    if (grpCollider) grpCollider.style.display = e.hasCollider ? "block" : "none";
    if (noteCollider) noteCollider.style.display = !e.hasCollider ? "block" : "none";
    this.setSliderVal("slide-entity-radius", "val-entity-radius", e.colliderModule?.radius ?? 0.32, 2);

    // 2. Mass Module
    const btnMass = this.container.querySelector("#toggle-mod-mass") as HTMLButtonElement;
    const grpMass = this.container.querySelector("#group-mod-mass") as HTMLElement;
    const noteMass = this.container.querySelector("#note-mod-mass") as HTMLElement;
    if (btnMass) {
      btnMass.textContent = e.hasMass ? "Attached" : "Detached";
      btnMass.classList.toggle("active", e.hasMass);
    }
    if (grpMass) grpMass.style.display = e.hasMass ? "block" : "none";
    if (noteMass) noteMass.style.display = !e.hasMass ? "block" : "none";
    this.setSliderVal("slide-entity-mass", "val-entity-mass", e.massModule?.mass ?? 1.0, 1);

    // 3. Friction Module
    const btnFriction = this.container.querySelector("#toggle-mod-friction") as HTMLButtonElement;
    const grpFriction = this.container.querySelector("#group-mod-friction") as HTMLElement;
    const noteFriction = this.container.querySelector("#note-mod-friction") as HTMLElement;
    const warnFricMass = this.container.querySelector("#warn-friction-mass") as HTMLElement;
    const hasFricMod = Boolean(e.frictionModule && e.frictionModule.enabled);
    if (btnFriction) {
      btnFriction.textContent = hasFricMod ? "Attached" : "Detached";
      btnFriction.classList.toggle("active", hasFricMod);
    }
    if (grpFriction) grpFriction.style.display = hasFricMod ? "flex" : "none";
    if (noteFriction) noteFriction.style.display = !hasFricMod ? "block" : "none";
    if (warnFricMass) warnFricMass.style.display = (!e.hasMass && hasFricMod) ? "block" : "none";
    this.setSliderVal("slide-entity-static-fric", "val-entity-static-fric", e.frictionModule?.staticFrictionMod ?? 1.0, 2);
    this.setSliderVal("slide-entity-dynamic-fric", "val-entity-dynamic-fric", e.frictionModule?.dynamicFrictionMod ?? 1.0, 2);

    // 4. Bounciness
    const btnBounce = this.container.querySelector("#toggle-mod-bounce") as HTMLButtonElement;
    const grpBounce = this.container.querySelector("#group-mod-bounce") as HTMLElement;
    const noteBounce = this.container.querySelector("#note-mod-bounce") as HTMLElement;
    const warnBounceMass = this.container.querySelector("#warn-bounce-mass") as HTMLElement;
    const hasBounceMod = Boolean(e.bounceModule && e.bounceModule.enabled);
    if (btnBounce) {
      btnBounce.textContent = hasBounceMod ? "Attached" : "Detached";
      btnBounce.classList.toggle("active", hasBounceMod);
    }
    if (grpBounce) grpBounce.style.display = hasBounceMod ? "block" : "none";
    if (noteBounce) noteBounce.style.display = !hasBounceMod ? "block" : "none";
    if (warnBounceMass) warnBounceMass.style.display = (!e.hasMass && hasBounceMod) ? "block" : "none";
    this.setSliderVal("slide-entity-bounce", "val-entity-bounce", e.bounceModule?.bounceMod ?? 0.4, 2);

    const checkVertBounce = this.container.querySelector("#check-mod-vert-bounce") as HTMLInputElement;
    const warnBounceVert = this.container.querySelector("#warn-bounce-vert-vel") as HTMLElement;
    if (checkVertBounce) {
      checkVertBounce.checked = Boolean(e.bounceModule?.verticalBounce);
    }
    if (warnBounceVert) {
      const showWarn = Boolean(hasBounceMod && e.bounceModule?.verticalBounce && !e.hasVerticalVelocity);
      warnBounceVert.style.display = showWarn ? "block" : "none";
    }

    // 5. Vertical Position & Velocity
    const btnVertPos = this.container.querySelector("#toggle-mod-vert-pos") as HTMLButtonElement;
    const grpVertPos = this.container.querySelector("#group-mod-vert-pos") as HTMLElement;
    const noteVertPos = this.container.querySelector("#note-mod-vert-pos") as HTMLElement;
    const hasVertPos = e.hasVerticalPosition;
    if (btnVertPos) {
      btnVertPos.textContent = hasVertPos ? "Attached" : "Detached";
      btnVertPos.classList.toggle("active", hasVertPos);
    }
    if (grpVertPos) grpVertPos.style.display = hasVertPos ? "block" : "none";
    if (noteVertPos) noteVertPos.style.display = !hasVertPos ? "block" : "none";
    this.setSliderVal("slide-entity-elevation", "val-entity-elevation", e.position.z, 2);

    const btnVertVel = this.container.querySelector("#toggle-mod-vert-vel") as HTMLButtonElement;
    const grpVertVel = this.container.querySelector("#group-mod-vert-vel") as HTMLElement;
    const hasVertVel = e.hasVerticalVelocity;
    if (btnVertVel) {
      btnVertVel.textContent = hasVertVel ? "Enabled" : "Disabled";
      btnVertVel.classList.toggle("active", hasVertVel);
    }
    if (grpVertVel) grpVertVel.style.display = hasVertVel ? "block" : "none";
    this.setSliderVal("slide-entity-vert-vel", "val-entity-vert-vel", e.verticalVelocity, 2);

    // 6. Gravity
    const btnGravity = this.container.querySelector("#toggle-mod-gravity") as HTMLButtonElement;
    const noteGravity = this.container.querySelector("#note-mod-gravity") as HTMLElement;
    if (btnGravity) {
      btnGravity.textContent = e.hasGravity ? "Attached" : "Detached";
      btnGravity.classList.toggle("active", e.hasGravity);
    }
    if (noteGravity) {
      noteGravity.textContent = e.hasGravity
        ? "Subject to static world gravity acceleration"
        : "Zero-G: never falls, flies horizontally in a straight line";
    }

    // 7. Roll
    const btnRoll = this.container.querySelector("#toggle-mod-roll") as HTMLButtonElement;
    const grpRoll = this.container.querySelector("#group-mod-roll") as HTMLElement;
    const noteRollFric = this.container.querySelector("#note-roll-friction") as HTMLElement;
    const hasRollMod = Boolean(e.rollModule && e.rollModule.enabled);
    if (btnRoll) {
      btnRoll.textContent = hasRollMod ? "Attached" : "Detached";
      btnRoll.classList.toggle("active", hasRollMod);
    }
    if (grpRoll) grpRoll.style.display = hasRollMod ? "block" : "none";
    if (noteRollFric) noteRollFric.style.display = (hasRollMod && !e.hasFriction) ? "block" : "none";
    if (e.rollModule) {
      this.setSliderVal("slide-entity-roll-resist", "val-entity-roll-resist", e.rollModule.rollResistance, 2);
    }

    // 7. Character Abilities
    if (isChar) {
      const btnWalk = this.container.querySelector("#toggle-walk") as HTMLButtonElement;
      const grpWalk = this.container.querySelector("#group-mod-walking") as HTMLElement;
      const warnWalkFric = this.container.querySelector("#warn-walk-friction") as HTMLElement;
      const warnWalkStrength = this.container.querySelector("#warn-walk-strength") as HTMLElement;
      const hasWalkMod = Boolean(this.character.walkingModule && this.character.walkingModule.enabled);
      if (btnWalk) {
        btnWalk.textContent = hasWalkMod ? "Attached" : "Detached";
        btnWalk.classList.toggle("active", hasWalkMod);
      }
      if (grpWalk) grpWalk.style.display = hasWalkMod ? "flex" : "none";
      if (warnWalkFric) warnWalkFric.style.display = (hasWalkMod && !this.character.hasFriction) ? "block" : "none";
      if (warnWalkStrength) warnWalkStrength.style.display = (hasWalkMod && !this.character.hasStrength) ? "block" : "none";

      if (this.character.walkingModule) {
        this.setSliderVal("slide-walk-force", "val-walk-force", this.character.walkingModule.maxWalkForce, 0);
        this.setSliderVal("slide-walk-speed", "val-walk-speed", this.character.walkingModule.maxWalkSpeed, 1);
      }

      const btnStrength = this.container.querySelector("#toggle-strength") as HTMLButtonElement;
      const grpStrength = this.container.querySelector("#group-mod-strength") as HTMLElement;
      const hasStrengthMod = Boolean(this.character.strengthModule && this.character.strengthModule.enabled);
      if (btnStrength) {
        btnStrength.textContent = hasStrengthMod ? "Attached" : "Detached";
        btnStrength.classList.toggle("active", hasStrengthMod);
      }
      if (grpStrength) grpStrength.style.display = hasStrengthMod ? "block" : "none";
      if (this.character.strengthModule) {
        this.setSliderVal("slide-strength", "val-strength", this.character.strength, 1);
      }

      const btnPickup = this.container.querySelector("#toggle-pickup") as HTMLButtonElement;
      const grpPickup = this.container.querySelector("#group-mod-pickup") as HTMLElement;
      const hasPickupMod = Boolean(this.character.pickupModule && this.character.pickupModule.enabled);
      if (btnPickup) {
        btnPickup.textContent = hasPickupMod ? "Attached" : "Detached";
        btnPickup.classList.toggle("active", hasPickupMod);
      }
      if (grpPickup) grpPickup.style.display = hasPickupMod ? "block" : "none";
      if (this.character.pickupModule) {
        this.setSliderVal("slide-pickup-reach", "val-pickup-reach", this.character.pickupModule.pickupReach, 1);
        this.setSliderVal("slide-pickup-cross-layer", "val-pickup-cross-layer", this.character.pickupModule.crossLayerReachRatio, 2);
      }

      const btnThrow = this.container.querySelector("#toggle-throw") as HTMLButtonElement;
      const grpThrow = this.container.querySelector("#group-mod-throw") as HTMLElement;
      const hasThrowMod = Boolean(this.character.throwModule && this.character.throwModule.enabled);
      if (btnThrow) {
        btnThrow.textContent = hasThrowMod ? "Attached" : "Detached";
        btnThrow.classList.toggle("active", hasThrowMod);
      }
      if (grpThrow) grpThrow.style.display = hasThrowMod ? "block" : "none";
      if (this.character.throwModule) {
        this.setSliderVal("slide-throw-force", "val-throw-force", this.character.throwModule.baseThrowForce, 1);
      }

      const btnClimb = this.container.querySelector("#toggle-climb") as HTMLButtonElement;
      const grpClimb = this.container.querySelector("#group-mod-climb") as HTMLElement;
      const warnClimb = this.container.querySelector("#warn-climb-deps") as HTMLElement;
      const hasClimbMod = Boolean(this.character.climbingModule && this.character.climbingModule.enabled);
      if (btnClimb) {
        btnClimb.textContent = hasClimbMod ? "Attached" : "Detached";
        btnClimb.classList.toggle("active", hasClimbMod);
      }
      if (grpClimb) grpClimb.style.display = hasClimbMod ? "block" : "none";
      if (warnClimb) {
        const missingVert = !this.character.hasVerticalPosition;
        const missingStr = !this.character.hasStrength;
        warnClimb.style.display = (hasClimbMod && (missingVert || missingStr)) ? "block" : "none";
        warnClimb.textContent = missingVert
          ? "⚠️ Requires Vertical Position (3D Z-axis)"
          : (missingStr ? "⚠️ Requires Strength Ability to climb" : "");
      }
      if (this.character.climbingModule) {
        const btnClimbWalkOff = this.container.querySelector("#toggle-climb-walkoff") as HTMLButtonElement;
        if (btnClimbWalkOff) {
          const isWalkOffPrevented = Boolean(this.character.climbingModule.preventWalkOff);
          btnClimbWalkOff.textContent = isWalkOffPrevented ? "Active" : "Inactive";
          btnClimbWalkOff.classList.toggle("active", isWalkOffPrevented);
        }
        this.setSliderVal("slide-climb-adhesion", "val-climb-adhesion", this.character.climbingModule.maxAdhesion, 0);
        this.setSliderVal("slide-climb-speed", "val-climb-speed", this.character.climbingModule.maxClimbSpeed, 1);
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
      if (selectedId === this.character.id) {
        this.selectedEntity = this.character;
      } else {
        const found = this.objects.find((o) => o.id === selectedId);
        if (found) {
          this.selectedEntity = found;
        }
      }
      this.updateSelectorOptions();
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

    // 5. Module Toggles & Sliders
    // Collider
    const btnCollider = this.container.querySelector("#toggle-mod-collider") as HTMLButtonElement;
    btnCollider?.addEventListener("click", () => {
      if (this.selectedEntity.colliderModule) {
        this.selectedEntity.colliderModule.enabled = !this.selectedEntity.colliderModule.enabled;
      } else {
        this.selectedEntity.colliderModule = new ColliderModule({ radius: 0.32 });
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-entity-radius", "val-entity-radius", (val) => {
      this.selectedEntity.colliderRadius = val;
    }, 2);

    // Mass
    const btnMass = this.container.querySelector("#toggle-mod-mass") as HTMLButtonElement;
    btnMass?.addEventListener("click", () => {
      if (this.selectedEntity.massModule) {
        this.selectedEntity.massModule.enabled = !this.selectedEntity.massModule.enabled;
      } else {
        this.selectedEntity.massModule = new MassModule({ mass: 1.0 });
      }
      this.syncEntitySliders();
      this.updateSelectorOptions();
    });

    this.setupSlider("slide-entity-mass", "val-entity-mass", (val) => {
      this.selectedEntity.mass = val;
      this.updateSelectorOptions();
    }, 1);

    // Friction
    const btnFriction = this.container.querySelector("#toggle-mod-friction") as HTMLButtonElement;
    btnFriction?.addEventListener("click", () => {
      if (this.selectedEntity.frictionModule) {
        this.selectedEntity.frictionModule.enabled = !this.selectedEntity.frictionModule.enabled;
      } else {
        this.selectedEntity.frictionModule = new FrictionModule();
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-entity-static-fric", "val-entity-static-fric", (val) => {
      this.selectedEntity.staticGroundFrictionMod = val;
    }, 2);

    this.setupSlider("slide-entity-dynamic-fric", "val-entity-dynamic-fric", (val) => {
      this.selectedEntity.dynamicGroundFrictionMod = val;
    }, 2);

    // Bounce
    const btnBounce = this.container.querySelector("#toggle-mod-bounce") as HTMLButtonElement;
    btnBounce?.addEventListener("click", () => {
      if (this.selectedEntity.bounceModule) {
        this.selectedEntity.bounceModule.enabled = !this.selectedEntity.bounceModule.enabled;
      } else {
        this.selectedEntity.bounceModule = new BounceModule({ bounceMod: 0.4 });
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-entity-bounce", "val-entity-bounce", (val) => {
      this.selectedEntity.bounceMod = val;
    }, 2);

    const checkVertBounce = this.container.querySelector("#check-mod-vert-bounce") as HTMLInputElement;
    checkVertBounce?.addEventListener("change", () => {
      if (this.selectedEntity.bounceModule) {
        this.selectedEntity.bounceModule.verticalBounce = checkVertBounce.checked;
      }
      this.syncEntitySliders();
      this.updateInspector();
    });

    // Vertical Position
    const btnVertPos = this.container.querySelector("#toggle-mod-vert-pos") as HTMLButtonElement;
    btnVertPos?.addEventListener("click", () => {
      if (this.selectedEntity.verticalPositionModule) {
        this.selectedEntity.verticalPositionModule.enabled = !this.selectedEntity.verticalPositionModule.enabled;
        if (!this.selectedEntity.verticalPositionModule.enabled) {
          this.selectedEntity.position.z = 0;
          this.selectedEntity.verticalVelocity = 0;
        }
      } else {
        this.selectedEntity.verticalPositionModule = new VerticalPositionModule({
          z: this.selectedEntity.position.z,
          hasVerticalVelocity: true,
          verticalVelocity: 0,
          enabled: true,
        });
      }
      this.syncEntitySliders();
      this.updateInspector();
    });

    this.setupSlider("slide-entity-elevation", "val-entity-elevation", (val) => {
      if (this.selectedEntity.verticalPositionModule) {
        this.selectedEntity.verticalPositionModule.z = val;
      }
      this.selectedEntity.position.z = val;
      this.syncEntitySliders();
      this.updateInspector();
    }, 2);

    // Vertical Velocity toggle
    const btnVertVel = this.container.querySelector("#toggle-mod-vert-vel") as HTMLButtonElement;
    btnVertVel?.addEventListener("click", () => {
      if (this.selectedEntity.verticalPositionModule) {
        this.selectedEntity.verticalPositionModule.hasVerticalVelocity = !this.selectedEntity.verticalPositionModule.hasVerticalVelocity;
        if (!this.selectedEntity.verticalPositionModule.hasVerticalVelocity) {
          this.selectedEntity.verticalVelocity = 0;
        }
      }
      this.syncEntitySliders();
      this.updateInspector();
    });

    this.setupSlider("slide-entity-vert-vel", "val-entity-vert-vel", (val) => {
      this.selectedEntity.verticalVelocity = val;
    }, 2);

    // Gravity
    const btnGravity = this.container.querySelector("#toggle-mod-gravity") as HTMLButtonElement;
    btnGravity?.addEventListener("click", () => {
      if (this.selectedEntity.gravityModule) {
        this.selectedEntity.gravityModule.enabled = !this.selectedEntity.gravityModule.enabled;
      } else {
        this.selectedEntity.gravityModule = new GravityModule();
      }
      this.syncEntitySliders();
    });

    // Roll
    const btnRoll = this.container.querySelector("#toggle-mod-roll") as HTMLButtonElement;
    btnRoll?.addEventListener("click", () => {
      if (this.selectedEntity.rollModule) {
        this.selectedEntity.rollModule.enabled = !this.selectedEntity.rollModule.enabled;
      } else {
        this.selectedEntity.rollModule = new RollModule({ rollResistance: 0.4 });
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-entity-roll-resist", "val-entity-roll-resist", (val) => {
      if (this.selectedEntity.rollModule) {
        this.selectedEntity.rollModule.rollResistance = val;
      }
    }, 2);

    // 6. Character Ability Sliders & Toggles
    const btnWalk = this.container.querySelector("#toggle-walk") as HTMLButtonElement;
    btnWalk?.addEventListener("click", () => {
      if (this.character.walkingModule) {
        this.character.walkingModule.enabled = !this.character.walkingModule.enabled;
      } else {
        this.character.walkingModule = new WalkingModule();
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-walk-force", "val-walk-force", (val) => {
      if (this.character.walkingModule) this.character.walkingModule.maxWalkForce = val;
    }, 0);

    this.setupSlider("slide-walk-speed", "val-walk-speed", (val) => {
      if (this.character.walkingModule) this.character.walkingModule.maxWalkSpeed = val;
    }, 1);

    const btnStrength = this.container.querySelector("#toggle-strength") as HTMLButtonElement;
    btnStrength?.addEventListener("click", () => {
      if (this.character.strengthModule) {
        this.character.strengthModule.enabled = !this.character.strengthModule.enabled;
      } else {
        this.character.strengthModule = new StrengthModule({ strength: 1.0 });
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-strength", "val-strength", (val) => {
      this.character.strength = val;
    }, 1);

    const btnPickup = this.container.querySelector("#toggle-pickup") as HTMLButtonElement;
    btnPickup?.addEventListener("click", () => {
      if (this.character.pickupModule) {
        this.character.pickupModule.enabled = !this.character.pickupModule.enabled;
      } else {
        this.character.pickupModule = new PickupModule();
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-pickup-reach", "val-pickup-reach", (val) => {
      if (this.character.pickupModule) this.character.pickupModule.pickupReach = val;
    }, 1);

    this.setupSlider("slide-pickup-cross-layer", "val-pickup-cross-layer", (val) => {
      if (this.character.pickupModule) this.character.pickupModule.crossLayerReachRatio = val;
    }, 2);

    const btnThrow = this.container.querySelector("#toggle-throw") as HTMLButtonElement;
    btnThrow?.addEventListener("click", () => {
      if (this.character.throwModule) {
        this.character.throwModule.enabled = !this.character.throwModule.enabled;
      } else {
        this.character.throwModule = new ThrowModule();
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-throw-force", "val-throw-force", (val) => {
      if (this.character.throwModule) this.character.throwModule.baseThrowForce = val;
    }, 1);

    const btnClimb = this.container.querySelector("#toggle-climb") as HTMLButtonElement;
    btnClimb?.addEventListener("click", () => {
      if (this.character.climbingModule) {
        this.character.climbingModule.enabled = !this.character.climbingModule.enabled;
      } else {
        this.character.climbingModule = new ClimbingModule();
      }
      this.syncEntitySliders();
    });

    const btnClimbWalkOff = this.container.querySelector("#toggle-climb-walkoff") as HTMLButtonElement;
    btnClimbWalkOff?.addEventListener("click", () => {
      if (this.character.climbingModule) {
        this.character.climbingModule.preventWalkOff = !this.character.climbingModule.preventWalkOff;
      }
      this.syncEntitySliders();
    });

    this.setupSlider("slide-climb-adhesion", "val-climb-adhesion", (val) => {
      if (this.character.climbingModule) this.character.climbingModule.maxAdhesion = val;
    }, 0);

    this.setupSlider("slide-climb-speed", "val-climb-speed", (val) => {
      if (this.character.climbingModule) this.character.climbingModule.maxClimbSpeed = val;
    }, 1);

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
      this.arena.loadWallPreset(selectWallPreset.value, [this.character, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-prev-wall-map")?.addEventListener("click", () => {
      const presets = Arena.WALL_PRESETS;
      const idx = presets.findIndex((p) => p.id === this.arena.currentPresetId);
      const prevIdx = (idx - 1 + presets.length) % presets.length;
      this.arena.loadWallPreset(presets[prevIdx].id, [this.character, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-next-wall-map")?.addEventListener("click", () => {
      const presets = Arena.WALL_PRESETS;
      const idx = presets.findIndex((p) => p.id === this.arena.currentPresetId);
      const nextIdx = (idx + 1) % presets.length;
      this.arena.loadWallPreset(presets[nextIdx].id, [this.character, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-reset-walls")?.addEventListener("click", () => {
      this.arena.resetDefaultWalls([this.character, ...this.objects]);
      this.updateWallPresetUI();
    });

    this.container.querySelector("#btn-clear-walls")?.addEventListener("click", () => {
      this.arena.clearAllWalls([this.character, ...this.objects]);
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
      this.setSelectedEntity(this.character);
    });
  }

  private spawnFromCreator(): void {
    const s = this.creatorState;
    const spawnX = Math.min(Math.max(this.character.position.x + (Math.random() * 2.0 - 1.0), 1.0), this.arena.width - 1.0);
    const spawnY = Math.min(Math.max(this.character.position.y + (Math.random() * 2.0 - 1.0), 1.0), this.arena.height - 1.0);

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
    if (this.selectedEntity === this.character) return;
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
    if (this.selectedEntity === this.character) return;
    const target = this.selectedEntity;

    if (this.character.heldObject === target) {
      target.isHeld = false;
      target.heldBy = null;
      this.character.heldObject = null;
    }

    if (this.onDeleteObject) {
      this.onDeleteObject(target);
    }

    this.setSelectedEntity(this.character);
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
    const speed = Math.hypot(e.velocity.x, e.velocity.y).toFixed(2);
    const isChar = e === this.character;

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
      ${isChar ? `
      <div class="inspect-item">
        <span class="inspect-k">Base / Total Mass</span>
        <span class="inspect-v ${this.character.heldObject ? 'highlight-held' : ''}">${this.character.baseMass.toFixed(1)}kg ${this.character.heldObject ? `(+${this.character.carriedMass.toFixed(1)}kg = ${this.character.mass.toFixed(1)}kg)` : ''}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Walk Traction</span>
        <span class="inspect-v ${this.character.hasFriction ? '' : 'highlight-held'}">${this.character.hasFriction ? 'Grip OK' : 'Slipping (No Friction)'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Held Freebody</span>
        <span class="inspect-v ${this.character.heldObject ? 'highlight-held' : ''}">${this.character.heldObject ? `${this.character.heldObject.name} (${this.character.heldObject.hasMass ? `${this.character.heldObject.mass}kg` : 'Massless'})` : 'None'}</span>
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
