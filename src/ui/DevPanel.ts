import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { RollModule } from "../engine/RollModule.js";
import { ColliderModule } from "../engine/ColliderModule.js";
import { FrictionModule } from "../engine/FrictionModule.js";
import { BounceModule } from "../engine/BounceModule.js";
import { GravityModule } from "../engine/GravityModule.js";
import { VerticalPositionModule } from "../engine/VerticalPositionModule.js";
import { RigidbodyModule } from "../engine/RigidbodyModule.js";
import { PropertyControl } from "./PropertyControl.js";
import { FloatScrubber } from "./FloatScrubber.js";
import { consumableTagRegistry } from "../engine/properties/ConsumableTagRegistry.js";
import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import { Prefab } from "../engine/prefab/Prefab.js";
import { prefabManager } from "../engine/prefab/PrefabManager.js";
import { sceneSpawnerManager } from "../engine/spawner/SceneSpawnerManager.js";
import { PlayerDeltaBuilder } from "./devpanel/PlayerDeltaBuilder.js";
import { PrefabsPanelSection } from "./devpanel/PrefabsPanelSection.js";
import { SpawnersPanelSection } from "./devpanel/SpawnersPanelSection.js";
import { DevConfigPersistence } from "./devpanel/DevConfigPersistence.js";
import { EntityModuleCardsHtml } from "./devpanel/EntityModuleCardsHtml.js";
import { EntityModuleLifecycle } from "./devpanel/EntityModuleLifecycle.js";
import { EntityModuleControlsBinder } from "./devpanel/EntityModuleControlsBinder.js";

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

  // Project persistence & dirty state tracking
  public isOnlineLocked: boolean = false;
  public currentConfigVersion: number = 1;
  public dirtyState = {
    arena: false,
    globalPhysics: false,
    player: false,
    spawners: false,
    modifiedObjects: new Map<string, GameObject>(),
    deletedObjectIds: new Set<string>(),
  };


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
  private expandedSections: Set<string> = new Set();
  private collapsedBusSubSections: Set<string> = new Set();

  public isSectionCollapsed(id: string): boolean {
    return !this.expandedSections.has(id);
  }

  public toggleSectionCollapse(id: string): void {
    if (this.expandedSections.has(id)) {
      this.expandedSections.delete(id);
    } else {
      this.expandedSections.add(id);
    }
  }

  public isBusSubCollapsed(busId: string): boolean {
    return this.collapsedBusSubSections.has(busId);
  }

  public toggleBusSubCollapse(busId: string): void {
    if (this.collapsedBusSubSections.has(busId)) {
      this.collapsedBusSubSections.delete(busId);
    } else {
      this.collapsedBusSubSections.add(busId);
    }
  }

  public renderModuleHeader(modId: string, titleHtml: string, actionButtonsHtml = ""): string {
    const isCollapsed = this.isSectionCollapsed("mod-" + modId);
    const arrow = isCollapsed ? "▶" : "▼";
    return `
      <div class="toggle-row" style="margin-bottom: 2px;">
        <div class="collapsible-section-header" data-collapse-id="mod-${modId}" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
          <span class="collapse-icon" style="font-size: 0.72rem; color: #94a3b8; transition: transform 0.15s ease;">${arrow}</span>
          <label style="cursor: pointer; margin: 0;">${titleHtml}</label>
        </div>
        ${actionButtonsHtml}
      </div>
    `;
  }

  public renderCollapsibleHeader(sectionId: string, titleHtml: string, badgeHtml = ""): string {
    const isCollapsed = this.isSectionCollapsed(sectionId);
    const arrow = isCollapsed ? "▶" : "▼";
    return `
      <div class="collapsible-section-header" data-collapse-id="${sectionId}" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; padding: 4px 0;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="collapse-icon" style="font-size: 0.72rem; color: #94a3b8; transition: transform 0.15s ease;">${arrow}</span>
          <h3 style="margin: 0; display: inline-block;">${titleHtml}</h3>
        </div>
        ${badgeHtml}
      </div>
    `;
  }

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

    // Reactively update when consumable tags are renamed or deleted
    consumableTagRegistry.onRename((oldTag, newTag) => {
      for (const obj of this.objects) {
        if (obj.consumableModule && obj.consumableModule.tag.toLowerCase() === oldTag.toLowerCase()) {
          obj.consumableModule.tag = newTag;
        }
      }
      const chars = this.getAllCharacters ? this.getAllCharacters() : [this.character];
      for (const c of chars) {
        if (c.consumeModule) {
          c.consumeModule.onTagRenamed(oldTag, newTag);
        }
      }
      this.renderEntityModules();
      this.updateInspector();
    });

    consumableTagRegistry.onDelete((deletedTag) => {
      for (const obj of this.objects) {
        if (obj.consumableModule && obj.consumableModule.tag.toLowerCase() === deletedTag.toLowerCase()) {
          obj.consumableModule.tag = "";
        }
      }
      const chars = this.getAllCharacters ? this.getAllCharacters() : [this.character];
      for (const c of chars) {
        if (c.consumeModule) {
          c.consumeModule.onTagDeleted(deletedTag);
        }
      }
      this.renderEntityModules();
      this.updateInspector();
    });

    prefabManager.onPrefabsChanged(() => {
      this.renderScenePrefabs();
      this.updatePrefabInfoBadge();
    });

    sceneSpawnerManager.onSpawnersChanged(() => {
      this.renderSceneSpawners();
    });

    PropertyControl.defaultSaveHandler = (owner, prop, val, label) => this.saveIndividualProperty(owner, prop, val, label);

    this.renderPanel();
  }

  public setSelectedEntity(entity: GameObject): void {
    this.selectedEntity = entity;
    this.updateSelectorOptions();
    this.renderEntityModules();
    this.syncEntitySliders();
    this.onSelectionChange?.(entity);
  }

  public setOnlineMode(isOnline: boolean): void {
    this.isOnlineLocked = isOnline;
    if (isOnline) {
      this.setMode(false);
    }
  }

  public setMode(editMode: boolean): void {
    if (this.isOnlineLocked && editMode) return;
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
    this.updatePrefabInfoBadge();
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
        <div class="mode-switcher" style="display: flex; gap: 4px; align-items: center;">
          <button id="mode-play" class="mode-btn ${!this.isEditMode ? 'active-play' : ''}">🎮 Play Mode</button>
          <button id="mode-edit" class="mode-btn ${this.isEditMode ? 'active-edit' : ''}">✏️ Edit Mode</button>
          <button id="btn-top-sim-pause" class="mode-btn" style="flex: 0 0 auto; padding: 4px 8px; font-weight: 600; font-size: 0.74rem;" title="Freeze or resume physics simulation">⏸️ Pause</button>
        </div>
        <div id="edit-submode-container" class="edit-submode-switcher" style="display: ${this.isEditMode ? 'flex' : 'none'};">
          <button id="submode-entities" class="submode-btn ${this.editTool === 'entities' ? 'active' : ''}">📦 Move Entities</button>
          <button id="submode-walls" class="submode-btn ${this.editTool === 'walls' ? 'active' : ''}">🧱 Edit Walls</button>
        </div>

        <!-- Project Save & Version Control Persistence Bar (Arena & Physics only) -->
        <div class="project-save-bar" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 8px; margin-top: 6px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span id="dev-save-badge" class="badge-status-clean" style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3);">
              ✓ In Sync (v1)
            </span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button id="btn-revert-from-project" class="btn-secondary-action" style="padding: 3px 6px; font-size: 0.70rem; color: #f87171; border-color: rgba(248, 113, 113, 0.3);" title="Reload arena and physics from project config">↺ Reload</button>
            <button id="btn-save-project-config" class="btn-primary-action" style="padding: 3px 8px; font-size: 0.72rem; display: flex; align-items: center; gap: 4px; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;" title="Save Arena walls, global physics, and spawner settings to src/config/worldConfig.json">
              💾 Save Physics, Arena & Spawners
            </button>
          </div>
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
          
          <!-- Entity Actions (Duplicate / Make Prefab / Delete) - Only for Objects -->
          <div id="object-actions-row" class="entity-actions-row" style="display: none; margin-top: 8px;">
            <button id="btn-duplicate-entity" class="btn-secondary-action">📋 Duplicate</button>
            <button id="btn-make-prefab" class="btn-secondary-action" style="color: #c084fc; border-color: rgba(168, 85, 247, 0.4);">📦 Make Prefab</button>
            <button id="btn-delete-entity" class="btn-secondary-action" style="color: #f87171; border-color: rgba(248, 113, 113, 0.3);">🗑️ Delete</button>
          </div>
          <!-- Prefab status badge for selected entity -->
          <div id="selected-entity-prefab-info" style="display: none; margin-top: 6px; padding: 4px 8px; background: rgba(168, 85, 247, 0.10); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 4px; font-size: 0.72rem; justify-content: space-between; align-items: center;"></div>
        </div>

        <!-- Live Diagnostics Inspector -->
        <div class="dev-section">
          ${this.renderCollapsibleHeader("diagnostics", "📊 Live Diagnostics")}
          <div id="collapse-body-diagnostics" style="display: ${this.isSectionCollapsed('diagnostics') ? 'none' : 'block'}; margin-top: 8px;">
            <div id="dev-inspector" class="inspector-grid"></div>
          </div>
        </div>

        <!-- ⚡ Physics & Collision Simulation (Phase A) -->
        <div class="dev-section" style="border: 1px solid rgba(6, 182, 212, 0.3); background: rgba(6, 182, 212, 0.04);">
          ${this.renderCollapsibleHeader(
            "physics",
            "<span style='color: #38bdf8;'>⚡ Physics & Collisions</span>",
            `<span id="badge-sim-tick" class="badge" style="background: rgba(6, 182, 212, 0.2); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.4);">Tick 0 (60Hz)</span>`
          )}
          <div id="collapse-body-physics" style="display: ${this.isSectionCollapsed('physics') ? 'none' : 'block'}; margin-top: 8px;">
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
        </div>

        <!-- ⏪ Phase 2: State History & Deterministic Rollback -->
        <div class="dev-section" id="section-history-rollback">
          ${this.renderCollapsibleHeader("history", "⏪ History Buffer & Rollback Replay")}
          <div id="collapse-body-history" style="display: ${this.isSectionCollapsed('history') ? 'none' : 'block'}; margin-top: 8px;">
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
        </div>

        <!-- 🧩 Modular Capabilities & Physical Behaviors -->

        <div class="dev-section">
          ${this.renderCollapsibleHeader("behaviors", "🧩 Physical Behaviors")}
          <div id="collapse-body-behaviors" style="display: ${this.isSectionCollapsed('behaviors') ? 'none' : 'block'}; margin-top: 8px;">
          <p class="section-desc">Attach or detach isolated physics behaviors for the selected entity.</p>

          <!-- Object Name & Color Controls (Non-character objects) -->
          <div id="row-entity-name" style="${this.selectedEntity instanceof Character ? 'display:none;' : 'margin-bottom: 8px;'}">
            <label style="font-size: 0.74rem; color: #94a3b8; display: block; margin-bottom: 4px;">Object Name</label>
            <input type="text" id="input-entity-name" class="dev-input" value="${this.selectedEntity ? this.selectedEntity.name : ''}" style="width: 100%;" />
          </div>

          <div id="row-entity-color" class="color-row" style="${this.selectedEntity instanceof Character ? 'display:none;' : 'margin-bottom: 8px;'}">
            <label>Color</label>
            <div class="color-input-wrapper">
              <input type="color" id="input-entity-color" value="${this.selectedEntity ? this.selectedEntity.color : '#94a3b8'}">
              <span id="val-entity-color" style="font-size: 0.76rem; font-family: monospace; color: #cbd5e1;">${this.selectedEntity ? this.selectedEntity.color : '#94a3b8'}</span>
            </div>
          </div>

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
        </div>

        <!-- ✨ Add New Object (Creator & Presets) -->
        <div class="dev-section">
          ${this.renderCollapsibleHeader(
            "new-object",
            "✨ Add New Object",
            `<span class="not-live-badge">⚠️ NOT LIVE OBJECT</span>`
          )}
          <div id="collapse-body-new-object" style="display: ${this.isSectionCollapsed('new-object') ? 'none' : 'block'}; margin-top: 8px;">
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

            <!-- Creator Behavior: Rigidbody -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-rb" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-rb') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">⚙️ Rigidbody</label>
                </div>
                <button id="creator-toggle-rigidbody" class="btn-toggle ${this.creatorState.hasRigidbody ? 'active' : ''}">
                  ${this.creatorState.hasRigidbody ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="collapse-body-creator-rb" style="display: ${this.isSectionCollapsed('creator-rb') ? 'none' : 'block'}; margin-top: 6px;">
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
              </div>
            </div>

            <!-- Creator Behavior: Collider -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-col" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-col') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">🛡️ Collider</label>
                </div>
                <button id="creator-toggle-collider" class="btn-toggle ${this.creatorState.hasCollider ? 'active' : ''}">
                  ${this.creatorState.hasCollider ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="collapse-body-creator-col" style="display: ${this.isSectionCollapsed('creator-col') ? 'none' : 'block'}; margin-top: 6px;">
                <div id="grp-creator-radius" style="display: ${this.creatorState.hasCollider ? 'block' : 'none'};">
                  <div id="scrub-container-creator-radius"></div>
                </div>
              </div>
            </div>

            <!-- Creator Behavior: Mass -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-mass" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-mass') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">⚖️ Mass</label>
                </div>
                <button id="creator-toggle-mass" class="btn-toggle ${this.creatorState.hasMass ? 'active' : ''}">
                  ${this.creatorState.hasMass ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="collapse-body-creator-mass" style="display: ${this.isSectionCollapsed('creator-mass') ? 'none' : 'block'}; margin-top: 6px;">
                <div id="grp-creator-mass" style="display: ${this.creatorState.hasMass ? 'block' : 'none'};">
                  <div id="scrub-container-creator-mass"></div>
                </div>
              </div>
            </div>

            <!-- Creator Behavior: Friction -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-fric" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-fric') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">🛑 Friction</label>
                </div>
                <button id="creator-toggle-friction" class="btn-toggle ${this.creatorState.hasFriction ? 'active' : ''}">
                  ${this.creatorState.hasFriction ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="collapse-body-creator-fric" style="display: ${this.isSectionCollapsed('creator-fric') ? 'none' : 'block'}; margin-top: 6px;">
                <div id="grp-creator-fric" style="display: ${this.creatorState.hasFriction ? 'block' : 'none'};">
                  <div id="scrub-container-creator-fric"></div>
                </div>
              </div>
            </div>

            <!-- Creator Behavior: Bounciness -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-bounce" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-bounce') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">🎾 Bounciness</label>
                </div>
                <button id="creator-toggle-bounce" class="btn-toggle ${this.creatorState.hasBounce ? 'active' : ''}">
                  ${this.creatorState.hasBounce ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="collapse-body-creator-bounce" style="display: ${this.isSectionCollapsed('creator-bounce') ? 'none' : 'block'}; margin-top: 6px;">
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
              </div>
            </div>

            <!-- Creator Behavior: Vertical Position -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-vert-pos" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-vert-pos') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">↕️ Vertical Position</label>
                </div>
                <button id="creator-toggle-vert-pos" class="btn-toggle ${this.creatorState.hasVerticalPosition ? 'active' : ''}">
                  ${this.creatorState.hasVerticalPosition ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="collapse-body-creator-vert-pos" style="display: ${this.isSectionCollapsed('creator-vert-pos') ? 'none' : 'block'}; margin-top: 6px;">
                <div id="grp-creator-vert-pos" style="display: ${this.creatorState.hasVerticalPosition ? 'block' : 'none'};">
                  <div id="scrub-container-creator-elevation"></div>
                </div>
              </div>
            </div>

            <!-- Creator Behavior: Gravity -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-gravity" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-gravity') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">⬇️ Gravity</label>
                </div>
                <button id="creator-toggle-gravity" class="btn-toggle ${this.creatorState.hasGravity ? 'active' : ''}">
                  ${this.creatorState.hasGravity ? 'Attached' : 'Detached'}
                </button>
              </div>
              <div id="collapse-body-creator-gravity" style="display: ${this.isSectionCollapsed('creator-gravity') ? 'none' : 'block'}; margin-top: 6px;">
                <span style="font-size: 0.72rem; color: #94a3b8;">Applies arena gravity acceleration downwards.</span>
              </div>
            </div>

            <!-- Creator Behavior: Roll -->
            <div class="creator-behavior-card" style="border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px; margin-bottom: 6px; background: rgba(15, 23, 42, 0.4);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="collapsible-section-header" data-collapse-id="creator-roll" style="display: flex; align-items: center; gap: 6px; cursor: pointer; flex: 1;">
                  <span class="collapse-icon" style="font-size: 0.7rem; color: #94a3b8;">${this.isSectionCollapsed('creator-roll') ? '▶' : '▼'}</span>
                  <label style="margin: 0; cursor: pointer; font-size: 0.8rem; font-weight: 600;">🔄 Roll</label>
                </div>
                <button id="creator-toggle-roll" class="btn-toggle ${this.creatorState.hasRollModule ? 'active' : ''}">
                  ${this.creatorState.hasRollModule ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div id="collapse-body-creator-roll" style="display: ${this.isSectionCollapsed('creator-roll') ? 'none' : 'block'}; margin-top: 6px;">
                <div id="group-creator-roll-resist" style="display: ${this.creatorState.hasRollModule ? 'block' : 'none'};">
                  <div id="scrub-container-creator-roll-resist"></div>
                </div>
              </div>
            </div>

            <button id="btn-spawn-configured" class="btn-spawn-primary">✨ Spawn Object</button>
          </div>

          <div style="margin-top: 10px;">
            <button id="btn-clear-entities" class="btn-danger" style="width: 100%;">Clear All Objects</button>
          </div>
          </div>
        </div>

        <!-- 📦 Scene Prefabs Section -->
        <div class="dev-section" style="border: 1px solid rgba(168, 85, 247, 0.25); background: rgba(168, 85, 247, 0.03);">
          ${this.renderCollapsibleHeader("scene-prefabs", "📦 Scene Prefabs", `<span id="badge-prefabs-count" class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4);">${prefabManager.getAll().length}</span>`)}
          <div id="collapse-body-scene-prefabs" style="display: ${this.isSectionCollapsed('scene-prefabs') ? 'none' : 'block'}; margin-top: 8px;">
            <p class="section-desc">Scene prefab archetypes. Editing a prefab propagates changes to all live instances in the scene that do not override that property.</p>
            
            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
              <button id="btn-add-prefab-from-scene" class="btn-secondary-action" style="flex: 1; padding: 6px 10px; font-weight: 600; color: #c084fc; border-color: rgba(168, 85, 247, 0.4);">
                + Add Prefab from Scene Object
              </button>
            </div>
            
            <!-- Quick picker dialog when adding prefab -->
            <div id="container-add-prefab-picker" style="display: none; padding: 8px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; margin-bottom: 10px;">
              <label style="display: block; font-size: 0.76rem; color: #cbd5e1; margin-bottom: 4px;">Select Scene Object to convert:</label>
              <div style="display: flex; gap: 6px;">
                <select id="select-add-prefab-source" class="dev-select" style="flex: 1;"></select>
                <button id="btn-confirm-add-prefab" class="btn-spawn-primary" style="padding: 4px 10px; font-size: 0.74rem;">Convert</button>
                <button id="btn-cancel-add-prefab" class="btn-secondary-action" style="padding: 4px 8px; font-size: 0.74rem;">Cancel</button>
              </div>
            </div>

            <!-- List of Prefab Cards -->
            <div id="scene-prefabs-list"></div>
          </div>
        </div>

        <!-- 🌱 Scene Spawners Section -->
        <div class="dev-section" style="border: 1px solid rgba(34, 197, 94, 0.25); background: rgba(34, 197, 94, 0.03);">
          ${this.renderCollapsibleHeader("scene-spawners", "🌱 Scene Spawners", `<span id="badge-spawners-count" class="badge" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4);">${sceneSpawnerManager.getAll().length}</span>`)}
          <div id="collapse-body-scene-spawners" style="display: ${this.isSectionCollapsed('scene-spawners') ? 'none' : 'block'}; margin-top: 8px;">
            <p class="section-desc">Background arena item spawners. Periodically dispenses prefab instances at random open ground coordinates in the map up to a maximum scene count.</p>
            
            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
              <button id="btn-add-scene-spawner" class="btn-secondary-action" style="flex: 1; padding: 6px 10px; font-weight: 600; color: #4ade80; border-color: rgba(34, 197, 94, 0.4);">
                + Add Scene Spawner
              </button>
            </div>

            <!-- List of Spawner Cards -->
            <div id="scene-spawners-list"></div>
          </div>
        </div>

        <!-- 🌍 World & Arena Physics -->
        <div class="dev-section">
          ${this.renderCollapsibleHeader("world-physics", "🌍 World Physics & Environment")}
          <div id="collapse-body-world-physics" style="display: ${this.isSectionCollapsed('world-physics') ? 'none' : 'block'}; margin-top: 8px;">
            <div id="scrub-container-gravity" style="margin-bottom: 8px;"></div>
            <div id="scrub-container-wall-height" style="margin-bottom: 8px;"></div>
            <div id="scrub-container-friction" style="margin-bottom: 8px;"></div>
            <div id="scrub-container-static-thresh" style="margin-bottom: 8px;"></div>
            <div id="scrub-container-collision-damage-scale" style="margin-bottom: 8px;"></div>
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
    this.renderScenePrefabs();
    this.renderSceneSpawners();
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

    // Object Name and Color controls sync
    const entityNameInput = this.container.querySelector("#input-entity-name") as HTMLInputElement | null;
    if (entityNameInput && document.activeElement !== entityNameInput) {
      entityNameInput.value = e.name;
    }
    const entityColorInput = this.container.querySelector("#input-entity-color") as HTMLInputElement | null;
    const entityColorVal = this.container.querySelector("#val-entity-color") as HTMLElement | null;
    if (entityColorInput) {
      entityColorInput.value = e.color;
      if (entityColorVal) entityColorVal.textContent = e.color;
    }
    const rowName = this.container.querySelector("#row-entity-name") as HTMLElement | null;
    if (rowName) rowName.style.display = isChar ? "none" : "block";
    const rowColor = this.container.querySelector("#row-entity-color") as HTMLElement | null;
    if (rowColor) rowColor.style.display = isChar ? "none" : "flex";

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
    this.setScrubberVal("scrub-container-mod-gravity", this.arena.gravity);
    this.setScrubberVal("scrub-container-mod-collision-damage-scale", GameObject.globalWorldCollisionDamageScale);

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
    EntityModuleCardsHtml.renderCardsAndCatalog(this, e, container, addBtn, dropdown);

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

  public toggleModuleEnabled(moduleType: string): void {
    EntityModuleLifecycle.toggleModuleEnabled(this, moduleType);
  }

  public removeModuleFromSelectedEntity(moduleType: string): void {
    EntityModuleLifecycle.removeModuleFromSelectedEntity(this, moduleType);
  }

  public addModuleToSelectedEntity(moduleType: string): void {
    EntityModuleLifecycle.addModuleToSelectedEntity(this, moduleType);
  }

  private bindDynamicModuleControls(): void {
    EntityModuleControlsBinder.bindDynamicModuleControls(this);
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
    // 0. Collapsible Sections and Modules Accordion Delegation
    this.container.addEventListener("click", (evt) => {
      const header = (evt.target as HTMLElement).closest(".collapsible-section-header") as HTMLElement;
      if (!header) return;
      const collapseId = header.dataset.collapseId;
      if (!collapseId) return;

      this.toggleSectionCollapse(collapseId);
      const isCollapsed = this.isSectionCollapsed(collapseId);
      const icon = header.querySelector(".collapse-icon") as HTMLElement;
      if (icon) {
        icon.textContent = isCollapsed ? "▶" : "▼";
      }

      // Check for matching collapse-body container
      const body = this.container.querySelector(`#collapse-body-${collapseId}`) as HTMLElement;
      if (body) {
        body.style.display = isCollapsed ? "none" : (body.dataset.displayType || "block");
      }
    });

    // 1. Mode Switcher
    this.modePlayBtn.addEventListener("click", () => {
      this.setMode(false);
    });

    this.modeEditBtn.addEventListener("click", () => {
      this.setMode(true);
    });

    const btnTopPause = this.container.querySelector("#btn-top-sim-pause") as HTMLButtonElement | null;
    const updatePauseUI = (paused: boolean) => {
      if (btnTopPause) {
        btnTopPause.textContent = paused ? "▶️ Resume" : "⏸️ Pause";
        btnTopPause.style.background = paused ? "#059669" : "";
        btnTopPause.style.borderColor = paused ? "#34d399" : "";
        btnTopPause.style.color = paused ? "#ffffff" : "";
        btnTopPause.style.boxShadow = paused ? "0 0 10px rgba(16, 185, 129, 0.5)" : "";
      }
      const btnSimPause = this.container.querySelector("#btn-sim-pause") as HTMLButtonElement | null;
      if (btnSimPause) {
        btnSimPause.textContent = paused ? "▶️ Resume Sim" : "⏸️ Pause Sim";
        btnSimPause.style.color = paused ? "#10b981" : "#f1f5f9";
      }
    };

    // Synchronize initial state
    setTimeout(() => {
      const loop = this.getGameLoop?.();
      if (loop) updatePauseUI(loop.isPhysicsPaused);
    }, 100);

    btnTopPause?.addEventListener("click", () => {
      const loop = this.getGameLoop?.();
      if (!loop) return;
      loop.isPhysicsPaused = !loop.isPhysicsPaused;
      updatePauseUI(loop.isPhysicsPaused);
      this.showSaveToast(loop.isPhysicsPaused ? "⏸️ Simulation Frozen (safe to inspect and save)" : "▶️ Simulation Resumed");
    });

    this.container.querySelector("#submode-entities")?.addEventListener("click", () => {
      this.setEditTool("entities");
    });

    this.container.querySelector("#submode-walls")?.addEventListener("click", () => {
      this.setEditTool("walls");
    });

    // 1b. Project Config Save (Arena & Physics only)
    this.container.querySelector("#btn-save-project-config")?.addEventListener("click", () => {
      this.saveProjectConfig();
    });

    this.container.querySelector("#btn-revert-from-project")?.addEventListener("click", () => {
      this.reloadFromDisk();
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

    // 3b. Make Prefab & Add Prefab Actions
    this.container.querySelector("#btn-make-prefab")?.addEventListener("click", () => {
      if (this.selectedEntity && !(this.selectedEntity instanceof Character)) {
        prefabManager.createFromEntity(this.selectedEntity);
        this.renderScenePrefabs();
        this.updatePrefabInfoBadge();
        this.updateSelectorOptions();
      }
    });

    const btnAddPrefabFromScene = this.container.querySelector("#btn-add-prefab-from-scene");
    const containerAddPrefabPicker = this.container.querySelector("#container-add-prefab-picker") as HTMLElement | null;
    const selectAddPrefabSource = this.container.querySelector("#select-add-prefab-source") as HTMLSelectElement | null;
    const btnConfirmAddPrefab = this.container.querySelector("#btn-confirm-add-prefab");
    const btnCancelAddPrefab = this.container.querySelector("#btn-cancel-add-prefab");

    btnAddPrefabFromScene?.addEventListener("click", () => {
      if (!containerAddPrefabPicker || !selectAddPrefabSource) return;
      const isVisible = containerAddPrefabPicker.style.display !== "none";
      if (isVisible) {
        containerAddPrefabPicker.style.display = "none";
      } else {
        let html = "";
        for (const obj of this.objects) {
          const icon = obj.consumableModule ? "🍎" : (obj.visualShape === "box" ? "📦" : "⚪");
          html += `<option value="${obj.id}">${icon} ${obj.name} (${obj.visualShape})</option>`;
        }
        if (this.objects.length === 0) {
          html = `<option value="">(No scene objects in arena)</option>`;
        }
        selectAddPrefabSource.innerHTML = html;
        containerAddPrefabPicker.style.display = "block";
      }
    });

    btnCancelAddPrefab?.addEventListener("click", () => {
      if (containerAddPrefabPicker) containerAddPrefabPicker.style.display = "none";
    });

    btnConfirmAddPrefab?.addEventListener("click", () => {
      if (!selectAddPrefabSource || !containerAddPrefabPicker) return;
      const objId = selectAddPrefabSource.value;
      const foundObj = this.objects.find((o) => o.id === objId);
      if (foundObj) {
        prefabManager.createFromEntity(foundObj);
        this.renderScenePrefabs();
        this.updatePrefabInfoBadge();
        this.updateSelectorOptions();
      }
      containerAddPrefabPicker.style.display = "none";
    });

    // 3c. Add Scene Spawner Action
    this.container.querySelector("#btn-add-scene-spawner")?.addEventListener("click", () => {
      const allPrefabs = prefabManager.getAll();
      const defaultPrefabId = allPrefabs[0]?.id || "prefab_apple";
      sceneSpawnerManager.create({
        id: `spawner_${Date.now()}`,
        name: `Spawner ${sceneSpawnerManager.getAll().length + 1}`,
        enabled: true,
        prefabId: defaultPrefabId,
        intervalMinutes: 0.25,
        maxCount: 5,
      });
      this.dirtyState.spawners = true;
      this.updateDirtyBadge();
      this.renderSceneSpawners();
    });

    // 3d. Object Name & Color Listeners
    const entityNameInput = this.container.querySelector("#input-entity-name") as HTMLInputElement | null;
    entityNameInput?.addEventListener("input", () => {
      if (this.selectedEntity && !(this.selectedEntity instanceof Character)) {
        this.selectedEntity.name = entityNameInput.value.trim() || "Object";
        this.updateSelectorOptions();
        this.markDirty("objects", this.selectedEntity);
      }
    });

    const entityColorInput = this.container.querySelector("#input-entity-color") as HTMLInputElement | null;
    const entityColorVal = this.container.querySelector("#val-entity-color") as HTMLElement | null;
    entityColorInput?.addEventListener("input", () => {
      if (this.selectedEntity && !(this.selectedEntity instanceof Character)) {
        this.selectedEntity.color = entityColorInput.value;
        if (entityColorVal) entityColorVal.textContent = entityColorInput.value;
        this.markDirty("objects", this.selectedEntity);
      }
    });

    // 4. Shape Toggle
    const btnShapeToggle = this.container.querySelector("#toggle-entity-shape") as HTMLButtonElement;
    btnShapeToggle?.addEventListener("click", () => {
      this.selectedEntity.visualShape = this.selectedEntity.visualShape === "box" ? "circle" : "box";
      btnShapeToggle.textContent = this.selectedEntity.visualShape === "box" ? "Box 📦" : "Circle ⚪";
      btnShapeToggle.classList.toggle("active", this.selectedEntity.visualShape === "box");
      if (this.selectedEntity.prefabId) {
        this.selectedEntity.overriddenProperties.add("visualShape");
        this.updatePrefabInfoBadge();
      }
      if (!(this.selectedEntity instanceof Character)) {
        this.markDirty("objects", this.selectedEntity);
      }
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
      updatePauseUI(loop.isPhysicsPaused);
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
        this.setScrubberVal("scrub-container-mod-gravity", val);
        this.markDirty("globalPhysics");
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
        this.markDirty("arena");
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
        this.markDirty("arena");
      },
    });

    const selectWallPreset = this.container.querySelector("#select-wall-preset") as HTMLSelectElement | null;
    selectWallPreset?.addEventListener("change", () => {
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.loadWallPreset(selectWallPreset.value, [...allChars, ...this.objects]);
      this.updateWallPresetUI();
      this.markDirty("arena");
    });

    this.container.querySelector("#btn-prev-wall-map")?.addEventListener("click", () => {
      const presets = Arena.WALL_PRESETS;
      const idx = presets.findIndex((p) => p.id === this.arena.currentPresetId);
      const prevIdx = (idx - 1 + presets.length) % presets.length;
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.loadWallPreset(presets[prevIdx].id, [...allChars, ...this.objects]);
      this.updateWallPresetUI();
      this.markDirty("arena");
    });

    this.container.querySelector("#btn-next-wall-map")?.addEventListener("click", () => {
      const presets = Arena.WALL_PRESETS;
      const idx = presets.findIndex((p) => p.id === this.arena.currentPresetId);
      const nextIdx = (idx + 1) % presets.length;
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.loadWallPreset(presets[nextIdx].id, [...allChars, ...this.objects]);
      this.updateWallPresetUI();
      this.markDirty("arena");
    });

    this.container.querySelector("#btn-reset-walls")?.addEventListener("click", () => {
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.resetDefaultWalls([...allChars, ...this.objects]);
      this.updateWallPresetUI();
      this.markDirty("arena");
    });

    this.container.querySelector("#btn-clear-walls")?.addEventListener("click", () => {
      const allChars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
      this.arena.clearAllWalls([...allChars, ...this.objects]);
      this.updateWallPresetUI();
      this.markDirty("arena");
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
        this.setScrubberVal("scrub-container-mod-collision-damage-scale", val);
        this.markDirty("globalPhysics");
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
      for (const obj of this.objects) {
        this.dirtyState.deletedObjectIds.add(obj.id);
      }
      this.dirtyState.modifiedObjects.clear();
      this.onClearObjects();
      this.markDirty("objects");
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

    if (!this.objects.includes(newObj)) {
      this.objects.push(newObj);
    }
    this.onSpawnObject(newObj);
    this.setSelectedEntity(newObj);
    this.markDirty("objects", newObj);
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
      rollModule: orig.rollModule ? new RollModule({ rollResistance: orig.rollModule.rollResistance, enabled: orig.rollModule.enabled, bumpyRollEnabled: orig.rollModule.bumpyRollEnabled, bumpiness: orig.rollModule.bumpiness, seed: orig.rollModule.seed }) : null,
    });

    if (!this.objects.includes(clone)) {
      this.objects.push(clone);
    }
    this.onSpawnObject(clone);
    this.setSelectedEntity(clone);
    this.markDirty("objects", clone);
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
    const idx = this.objects.indexOf(target);
    if (idx !== -1) {
      this.objects.splice(idx, 1);
    }

    this.dirtyState.deletedObjectIds.add(target.id);
    this.dirtyState.modifiedObjects.delete(target.id);
    this.markDirty("objects");

    this.setSelectedEntity(allChars[0] || this.objects[0] || (null as any));
  }

  public setupScrubber(
    containerId: string,
    options: {
      label: string;
      value: number;
      isGlobal?: boolean;
      min?: number;
      max?: number;
      step?: number;
      decimals?: number;
      suffix?: string;
      onChange: (val: number) => void;
      onSave?: (val: number) => Promise<void> | void;
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

  public setScrubberVal(containerId: string, val: number): void {
    const scrubber = this.scrubbers.get(containerId);
    if (scrubber) {
      scrubber.setValue(val, false);
    }
  }

  public setupSlider(sliderId: string, labelId: string, onChange: (val: number) => void, decimals: number = 0): void {
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

    // Real-time update of live Energy Pool & Stamina status bars
    if (isChar && char) {
      if (char.energyPool) {
        const ep = char.energyPool;
        const curE = ep.getCurrentEnergy(char.properties);
        const maxE = ep.getMaxEnergy(char.properties);
        const pctE = maxE > 0 ? Math.min(100, Math.max(0, (curE / maxE) * 100)) : 0;

        const labelPool = this.container.querySelector("#label-energy-pool-status");
        if (labelPool) {
          labelPool.textContent = `${curE.toFixed(0)} / ${maxE.toFixed(0)} J (${pctE.toFixed(0)}%)`;
        }
        const barPool = this.container.querySelector("#bar-energy-pool-fill") as HTMLElement | null;
        if (barPool) {
          barPool.style.width = `${pctE}%`;
        }

        const curS = ep.getCurrentStamina(char.properties);
        const maxS = ep.getMaxStamina(char.properties);
        const pctS = maxS > 0 ? Math.min(100, Math.max(0, (curS / maxS) * 100)) : 0;
        const curWatts = ep.getCurrentWattage(char.properties);

        const labelStamina = this.container.querySelector("#label-energy-stamina-status");
        if (labelStamina) {
          labelStamina.textContent = `${curS.toFixed(0)} J / ${maxS.toFixed(0)} J (${pctS.toFixed(0)}%)`;
        }
        const barStamina = this.container.querySelector("#bar-energy-stamina-fill") as HTMLElement | null;
        if (barStamina) {
          barStamina.style.width = `${pctS}%`;
        }

        const labelWattage = this.container.querySelector("#label-energy-wattage") as HTMLElement | null;
        if (labelWattage) {
          labelWattage.textContent = `${curWatts.toFixed(0)} Watts`;
          labelWattage.style.color = curWatts > 0 ? "#38bdf8" : "#64748b";
        }

        const warnExhausted = this.container.querySelector("#warn-energy-exhausted") as HTMLElement | null;
        if (warnExhausted) {
          warnExhausted.style.display = ep.isExhausted ? "block" : "none";
        }

        const curStaminaInput = this.container.querySelector("#prop-socket-energy-stamina-cur .prop-number-input") as HTMLInputElement | null;
        if (curStaminaInput && document.activeElement !== curStaminaInput) {
          curStaminaInput.value = curS.toFixed(2);
        }
      }

      if (char.laserModule) {
        const lm = char.laserModule;
        const labelState = this.container.querySelector("#label-laser-state") as HTMLElement | null;
        if (labelState) {
          const isFiring = lm.isFiring;
          const isAiming = lm.isAiming;
          labelState.textContent = isFiring ? "🔥 FIRING" : (isAiming ? "🎯 AIMING" : "💤 IDLE");
          labelState.style.color = isFiring ? "#f43f5e" : (isAiming ? "#06b6d4" : "#94a3b8");
        }
        const labelPower = this.container.querySelector("#label-laser-power") as HTMLElement | null;
        if (labelPower) {
          labelPower.textContent = `${lm.actualPowerWatts.toFixed(0)} W`;
        }
      }
    }

    if (e.consumableModule) {
      const cm = e.consumableModule;
      const curE = cm.getRemainingEnergy(e.properties);
      const maxE = cm.getTotalEnergy(e.properties);
      const pct = maxE > 0 ? Math.min(100, Math.max(0, (curE / maxE) * 100)) : 0;
      const barFill = this.container.querySelector("#bar-consumable-fill") as HTMLElement | null;
      if (barFill) barFill.style.width = `${pct}%`;
      const labelStatus = this.container.querySelector("#label-consumable-status") as HTMLElement | null;
      if (labelStatus) labelStatus.textContent = `${curE.toFixed(0)} / ${maxE.toFixed(0)} J (${pct.toFixed(0)}%)`;
    }

    this.updateSceneSpawnersTelemetry();
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

  public updatePrefabInfoBadge(): void {
    PrefabsPanelSection.updatePrefabInfoBadge(this);
  }

  public renderScenePrefabs(): void {
    PrefabsPanelSection.renderScenePrefabs(this);
  }

  public renderSceneSpawners(): void {
    SpawnersPanelSection.renderSceneSpawners(this);
  }

  public updateSceneSpawnersTelemetry(): void {
    SpawnersPanelSection.updateSceneSpawnersTelemetry(this);
  }

  public markDirty(category: "arena" | "globalPhysics" | "player" | "objects", targetEntity?: GameObject): void {
    if (this.isOnlineLocked) return;

    if (category === "arena") {
      this.dirtyState.arena = true;
    } else if (category === "globalPhysics") {
      this.dirtyState.globalPhysics = true;
    } else if (category === "player") {
      this.dirtyState.player = true;
    } else if (category === "objects") {
      if (targetEntity) {
        if (targetEntity instanceof Character || (targetEntity as any).isCharacter) {
          this.dirtyState.player = true;
        } else {
          this.dirtyState.modifiedObjects.set(targetEntity.id, targetEntity);
        }
      }
    }
    this.updateDirtyBadge();
  }

  public updateDirtyBadge(): void {
    let count = 0;
    if (this.dirtyState.arena) count++;
    if (this.dirtyState.globalPhysics) count++;
    if (this.dirtyState.spawners) count++;

    const badge = this.container.querySelector("#dev-save-badge") as HTMLElement | null;
    if (badge) {
      if (count > 0) {
        badge.textContent = `● Unsaved (${count} change${count === 1 ? "" : "s"})`;
        badge.style.background = "rgba(245, 158, 11, 0.15)";
        badge.style.color = "#f59e0b";
        badge.style.borderColor = "rgba(245, 158, 11, 0.3)";
      } else {
        badge.textContent = `✓ In Sync (v${this.currentConfigVersion})`;
        badge.style.background = "rgba(34, 197, 94, 0.15)";
        badge.style.color = "#22c55e";
        badge.style.borderColor = "rgba(34, 197, 94, 0.3)";
      }
    }
  }

  public showSaveToast(message: string, isError: boolean = false): void {
    let toast = document.getElementById("dev-save-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "dev-save-toast";
      toast.style.position = "fixed";
      toast.style.bottom = "24px";
      toast.style.right = "24px";
      toast.style.zIndex = "99999";
      toast.style.padding = "8px 14px";
      toast.style.borderRadius = "8px";
      toast.style.fontSize = "0.80rem";
      toast.style.fontWeight = "600";
      toast.style.fontFamily = "system-ui, -apple-system, sans-serif";
      toast.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.4)";
      toast.style.display = "flex";
      toast.style.alignItems = "center";
      toast.style.gap = "8px";
      toast.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      toast.style.pointerEvents = "none";
      document.body.appendChild(toast);
    }
    toast.style.background = isError ? "rgba(185, 28, 28, 0.95)" : "rgba(15, 23, 42, 0.95)";
    toast.style.color = isError ? "#fecaca" : "#38bdf8";
    toast.style.border = isError ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(56, 189, 248, 0.4)";
    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    if ((this as any)._toastTimeout) {
      clearTimeout((this as any)._toastTimeout);
    }
    (this as any)._toastTimeout = setTimeout(() => {
      if (toast) {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
      }
    }, 2400);
  }

  public setNestedProperty(obj: any, path: string, value: any): void {
    PlayerDeltaBuilder.setNestedProperty(obj, path, value);
  }

  public resolvePropertyPath(owner: GameObject, prop: DynamicProperty, label?: string): string {
    return PlayerDeltaBuilder.resolvePropertyPath(owner, prop, label);
  }

  public buildSinglePropertyPlayerDelta(id: string, val: number): Record<string, any> | null {
    return PlayerDeltaBuilder.buildSinglePropertyPlayerDelta(id, val);
  }

  public async saveIndividualProperty(owner: GameObject, prop: DynamicProperty, value: number, label?: string): Promise<void> {
    return DevConfigPersistence.saveIndividualProperty(this, owner, prop, value, label);
  }

  public async saveIndividualToggle(owner: GameObject, keyPath: string, val: boolean, label: string, btnEl?: HTMLButtonElement | null): Promise<void> {
    return DevConfigPersistence.saveIndividualToggle(this, owner, keyPath, val, label, btnEl);
  }

  public async savePrefabProperty(prefab: Prefab, keyPath: string, val: any, label?: string): Promise<void> {
    return DevConfigPersistence.savePrefabProperty(this, prefab, keyPath, val, label);
  }

  public async savePrefab(prefab: Prefab): Promise<void> {
    return DevConfigPersistence.savePrefab(this, prefab);
  }

  public async saveProjectConfig(): Promise<void> {
    return DevConfigPersistence.saveProjectConfig(this);
  }

  public async pushDataToGit(): Promise<void> {
    return DevConfigPersistence.pushDataToGit(this);
  }

  public async reloadFromDisk(): Promise<void> {
    return DevConfigPersistence.reloadFromDisk(this);
  }
}
