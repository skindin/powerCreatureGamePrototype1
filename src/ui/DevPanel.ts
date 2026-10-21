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
import { CharacterModule, type CharacterRole } from "../character/CharacterModule.js";
import { EnergyPool } from "../character/EnergyPool.js";
import { ConsumableModule } from "../engine/ConsumableModule.js";
import { ConsumeModule } from "../character/ConsumeModule.js";
import { LaserModule } from "../character/LaserModule.js";
import { MeleeModule } from "../character/MeleeModule.js";
import { SpawnerModule } from "../engine/SpawnerModule.js";
import { PropertyControl } from "./PropertyControl.js";
import { TagSelectorControl } from "./TagSelectorControl.js";
import { FloatScrubber } from "./FloatScrubber.js";
import { consumableTagRegistry } from "../engine/properties/ConsumableTagRegistry.js";
import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import { Prefab } from "../engine/prefab/Prefab.js";
import { prefabManager } from "../engine/prefab/PrefabManager.js";
import { sceneSpawnerManager } from "../engine/spawner/SceneSpawnerManager.js";
import { WorldConfig, WorldConfigDelta, serializeGameObject, deserializeGameObject, serializePrefab, SerializedPrefabConfig, SerializedCharacterConfig } from "../config/WorldConfig.js";

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
            <button id="btn-save-project-config" class="btn-primary-action" style="padding: 3px 8px; font-size: 0.72rem; display: flex; align-items: center; gap: 4px; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;" title="Save Arena walls and global physics to src/config/worldConfig.json">
              💾 Save Arena & Physics
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

    const hasCharModule = Boolean(e.characterModule) || isChar;
    const charModuleEnabled = Boolean(e.characterModule?.enabled ?? true);

    const hasEnergyPool = isChar && Boolean(char?.energyPool);
    const energyPoolEnabled = isChar && Boolean(char?.energyPool?.enabled);

    const hasConsumableModule = Boolean(e.consumableModule);
    const consumableEnabled = Boolean(e.consumableModule?.enabled);

    const hasConsumeModule = isChar && Boolean(char?.consumeModule);
    const consumeEnabled = isChar && Boolean(char?.consumeModule?.enabled);

    const hasLaserModule = isChar && Boolean(char?.laserModule);
    const laserEnabled = isChar && Boolean(char?.laserModule?.enabled);

    const hasMeleeModule = isChar && Boolean(char?.meleeModule);
    const meleeEnabled = isChar && Boolean(char?.meleeModule?.enabled);

    const hasSpawnerModule = Boolean(e.spawnerModule);
    const spawnerEnabled = Boolean(e.spawnerModule?.enabled);

    let html = "";
    let attachedCount = 0;

    const renderToggleBtn = (modId: string, isEnabled: boolean) => `
      <div style="display: flex; align-items: center; gap: 6px;">
        <button class="btn-toggle-module ${isEnabled ? 'active' : 'disabled'}" data-module-id="${modId}" title="${isEnabled ? 'Disable' : 'Enable'} this behavior">
          ${isEnabled ? '✓ Enabled' : '✕ Disabled'}
        </button>
        <button class="btn-remove-module" data-module-id="${modId}" title="Remove behavior from object">✕ Remove</button>
      </div>
    `;

    const renderToggleRow = (checkboxId: string, label: string, isChecked: boolean, title: string = "Save setting to project") => {
      const saveBtnId = `btn-save-${checkboxId.replace(/^check-/, '')}`;
      return `
        <div class="toggle-row" style="margin-top: 5px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.8rem; color: #cbd5e1;">${label}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="${checkboxId}" ${isChecked ? 'checked' : ''}>
            <button type="button" class="prop-save-btn" id="${saveBtnId}" title="${title}">💾</button>
          </div>
        </div>
      `;
    };

    // 0. Character Module (Role: local_player, local_ai, remote_player, remote_ai, dummy)
    if (hasCharModule) {
      attachedCount++;
      const currentRole: CharacterRole = e.characterModule?.role ?? (char ? char.role : "local_player");
      html += `
        <div class="module-card ${!charModuleEnabled ? 'module-disabled' : ''}" data-module-id="character">
          ${this.renderModuleHeader("character", "👤 Character Module", renderToggleBtn("character", charModuleEnabled))}
          <div id="collapse-body-mod-character" style="display: ${this.isSectionCollapsed('mod-character') ? 'none' : 'block'};">
          ${!charModuleEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Character Module is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Classifies entity role: Local/Remote Player, Local/Remote AI, or Inert Dummy.
          </div>
          <div class="slider-group" style="margin-top: 6px;">
            <div class="slider-label">
              <span>Entity Role</span>
              <span id="badge-char-role" class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.68rem;">${currentRole.toUpperCase()}</span>
            </div>
            <select id="select-char-role" class="dev-select" style="width: 100%;">
              <option value="local_player" ${currentRole === 'local_player' ? 'selected' : ''}>Local Player (Human Keyboard/Gamepad)</option>
              <option value="local_ai" ${currentRole === 'local_ai' ? 'selected' : ''}>Local AI (Autonomous Bot)</option>
              <option value="remote_player" ${currentRole === 'remote_player' ? 'selected' : ''}>Remote Player (Network Client)</option>
              <option value="remote_ai" ${currentRole === 'remote_ai' ? 'selected' : ''}>Remote AI (Server Bot)</option>
              <option value="dummy" ${currentRole === 'dummy' ? 'selected' : ''}>Dummy (Inert Physical Target)</option>
            </select>
          </div>
          </div>
        </div>
      `;
    }

    // 1. Rigidbody Module
    if (hasRigidbodyModule) {
      attachedCount++;
      const vertPosWarning = !hasVertPosModule
        ? `<div class="module-dep-warning" style="margin-top: 4px;">⚠️ Requires Vertical Position behavior</div>`
        : (!vertPosEnabled ? `<div class="module-dep-warning" style="margin-top: 4px;">⚠️ Inactive: Vertical Position behavior is disabled</div>` : '');

      html += `
        <div class="module-card ${!rbEnabled ? 'module-disabled' : ''}" data-module-id="rigidbody">
          ${this.renderModuleHeader("rigidbody", "⚙️ Rigidbody", renderToggleBtn("rigidbody", rbEnabled))}
          <div id="collapse-body-mod-rigidbody" style="display: ${this.isSectionCollapsed('mod-rigidbody') ? 'none' : 'block'};">
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
        </div>
      `;
    }

    // 2. Collider Module
    if (hasColliderModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!colEnabled ? 'module-disabled' : ''}" data-module-id="collider">
          ${this.renderModuleHeader("collider", "🛡️ Collider", renderToggleBtn("collider", colEnabled))}
          <div id="collapse-body-mod-collider" style="display: ${this.isSectionCollapsed('mod-collider') ? 'none' : 'block'};">
          ${!colEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Collider behavior is disabled (passes through objects)</div>` : ''}
          <div id="prop-socket-collider-radius"></div>
          </div>
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
          ${this.renderModuleHeader("friction", "🛝 Friction", renderToggleBtn("friction", fricEnabled))}
          <div id="collapse-body-mod-friction" style="display: ${this.isSectionCollapsed('mod-friction') ? 'none' : 'block'};">
          ${!fricEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Friction behavior is disabled</div>` : ''}
          ${fricMassWarning}
          <div id="prop-socket-static-fric"></div>
          <div id="prop-socket-dynamic-fric"></div>
          </div>
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
          ${this.renderModuleHeader("bounce", "🏀 Bounciness", renderToggleBtn("bounce", bounceEnabled))}
          <div id="collapse-body-mod-bounce" style="display: ${this.isSectionCollapsed('mod-bounce') ? 'none' : 'block'};">
          ${!bounceEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Bounciness behavior is disabled</div>` : ''}
          ${bounceMassWarning}
          <div id="prop-socket-bounce"></div>
          <div style="margin-top: 6px;">
            ${renderToggleRow("check-mod-vert-bounce", "Vertical Bounce", Boolean(e.bounceModule?.verticalBounce), "Save Vertical Bounce to project")}
          </div>
          ${bounceVertWarning}
          </div>
        </div>
      `;
    }

    // 6. Vertical Position Module
    if (hasVertPosModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!vertPosEnabled ? 'module-disabled' : ''}" data-module-id="verticalPosition">
          ${this.renderModuleHeader("verticalPosition", "↕️ Vertical Position", renderToggleBtn("verticalPosition", vertPosEnabled))}
          <div id="collapse-body-mod-verticalPosition" style="display: ${this.isSectionCollapsed('mod-verticalPosition') ? 'none' : 'block'};">
          ${!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : ''}
          <div class="slider-group">
            <div class="slider-label">
              <span>Elevation (z)</span>
              <span id="val-entity-elevation">${e.position.z.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-elevation" min="0.0" max="4.0" step="0.05" value="${e.position.z}">
          </div>
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
          ${this.renderModuleHeader("gravity", "🪐 Gravity", renderToggleBtn("gravity", gravEnabled))}
          <div id="collapse-body-mod-gravity" style="display: ${this.isSectionCollapsed('mod-gravity') ? 'none' : 'block'};">
          ${!gravEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Gravity behavior is disabled</div>` : ''}
          ${gravVertWarning}
          <div style="margin-top: 6px;">
            <div id="scrub-container-mod-gravity"></div>
            <div class="module-global-warning">
              <span>🌐</span>
              <span><strong>Global Variable:</strong> Changing gravity modifies world gravitational acceleration across the entire arena and all entities.</span>
            </div>
          </div>
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
          ${this.renderModuleHeader("roll", "🔄 Roll", renderToggleBtn("roll", rollEnabled))}
          <div id="collapse-body-mod-roll" style="display: ${this.isSectionCollapsed('mod-roll') ? 'none' : 'block'};">
          ${!rollEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Roll behavior is disabled</div>` : ''}
          ${rollFricWarning}
          <div id="prop-socket-roll-resist"></div>
          ${renderToggleRow("check-roll-bumpy-enabled", "Bumpy Roll (Hop on Bumps)", Boolean(e.rollModule?.bumpyRollEnabled), "Save Bumpy Roll to project")}
          <div id="prop-socket-roll-bumpiness" style="display: ${e.rollModule?.bumpyRollEnabled ? 'block' : 'none'};"></div>
          </div>
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
            ${this.renderModuleHeader("walking", "🚶 Walking Ability", renderToggleBtn("walking", walkEnabled))}
            <div id="collapse-body-mod-walking" style="display: ${this.isSectionCollapsed('mod-walking') ? 'none' : 'block'};">
            ${!walkEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Walking Ability is disabled</div>` : ''}
            ${walkFricWarning}
            ${walkStrWarning}
            ${renderToggleRow("check-walk-in-air", "Air Control (Walk in Air)", Boolean(char.walkingModule?.walkInAir), "Save Air Control to project")}
            ${renderToggleRow("check-can-sprint", "Can Sprint (Shift / Gamepad)", Boolean(char.walkingModule?.canSprint), "Save Can Sprint to project")}
            <div id="prop-socket-walk-force"></div>
            <div id="prop-socket-walk-speed"></div>
            <div id="prop-socket-walk-power-cap"></div>
            <div id="prop-socket-sprint-speed"></div>
            <div id="prop-socket-sprint-power-cap"></div>
            <div id="prop-socket-air-fric"></div>
            <div style="margin-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); padding-top: 6px;">
              <div id="prop-socket-strength"></div>
            </div>
            ${renderToggleRow("check-walk-energy", "Walk Consumes Energy", Boolean(char.walkingModule?.walkConsumesEnergy), "Save Walk Consumes Energy to project")}
            <div id="field-walk-partial-power" style="display: ${char.walkingModule?.walkConsumesEnergy ? 'block' : 'none'}; padding-left: 8px;">
              ${renderToggleRow("check-walk-partial-power", "Allow Partial Power", Boolean(char.walkingModule?.walkAllowPartialPower), "Save Walk Partial Power to project")}
            </div>
            ${renderToggleRow("check-sprint-energy", "Sprint Consumes Energy", Boolean(char.walkingModule?.sprintConsumesEnergy), "Save Sprint Consumes Energy to project")}
            <div id="field-sprint-partial-power" style="display: ${char.walkingModule?.sprintConsumesEnergy ? 'block' : 'none'}; padding-left: 8px;">
              ${renderToggleRow("check-sprint-partial-power", "Allow Partial Power", Boolean(char.walkingModule?.sprintAllowPartialPower), "Save Sprint Partial Power to project")}
            </div>
            </div>
          </div>
        `;
      }

      if (hasPickupModule) {
        attachedCount++;
        html += `
          <div class="module-card ${!pickupEnabled ? 'module-disabled' : ''}" data-module-id="pickup">
            ${this.renderModuleHeader("pickup", "✋ Pickup Ability", renderToggleBtn("pickup", pickupEnabled))}
            <div id="collapse-body-mod-pickup" style="display: ${this.isSectionCollapsed('mod-pickup') ? 'none' : 'block'};">
            ${!pickupEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Pickup Ability is disabled</div>` : ''}
            <div id="prop-socket-pickup-reach"></div>
            <div id="prop-socket-pickup-power-cap"></div>
            ${renderToggleRow("check-pickup-energy", "Consumes Energy", Boolean(char.pickupModule?.consumesEnergy), "Save Pickup Consumes Energy to project")}
            <div id="field-pickup-partial-power" style="display: ${char.pickupModule?.consumesEnergy ? 'block' : 'none'}; padding-left: 8px;">
              ${renderToggleRow("check-pickup-partial-power", "Allow Partial Power", Boolean(char.pickupModule?.allowPartialPower), "Save Pickup Partial Power to project")}
            </div>
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
            ${this.renderModuleHeader("throw", "🎯 Throw Ability", renderToggleBtn("throw", throwEnabled))}
            <div id="collapse-body-mod-throw" style="display: ${this.isSectionCollapsed('mod-throw') ? 'none' : 'block'};">
            ${!throwEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Throw Ability is disabled</div>` : ''}
            ${throwStrWarning}
            <div id="prop-socket-throw-force"></div>
            <div id="prop-socket-throw-max-height"></div>
            <div id="prop-socket-throw-power-cap"></div>
            ${renderToggleRow("check-throw-energy", "Consumes Energy", Boolean(char.throwModule?.consumesEnergy), "Save Throw Consumes Energy to project")}
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
            ${this.renderModuleHeader("jump", "🦘 Jump Ability", renderToggleBtn("jump", jumpEnabled))}
            <div id="collapse-body-mod-jump" style="display: ${this.isSectionCollapsed('mod-jump') ? 'none' : 'block'};">
            ${!jumpEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Jump Ability is disabled</div>` : ''}
            ${jumpVertWarning}
            <div id="prop-socket-jump-strength"></div>
            <div id="prop-socket-jump-max-speed"></div>
            <div id="prop-socket-jump-power-cap"></div>
            ${renderToggleRow("check-jump-energy", "Consumes Energy", Boolean(char.jumpConsumesEnergy), "Save Jump Consumes Energy to project")}
            <div id="field-jump-partial-power" style="display: ${char.jumpConsumesEnergy ? 'block' : 'none'}; padding-left: 8px;">
              ${renderToggleRow("check-jump-partial-power", "Allow Partial Power", Boolean(char.jumpAllowPartialPower), "Save Jump Partial Power to project")}
            </div>
            </div>
          </div>
        `;
      }

      if (hasEdgeAssistModule) {
        attachedCount++;
        html += `
          <div class="module-card ${!edgeAssistEnabled ? 'module-disabled' : ''}" data-module-id="wallEdgeAssist">
            ${this.renderModuleHeader("wallEdgeAssist", "🛡️ Wall Edge Assist", renderToggleBtn("wallEdgeAssist", edgeAssistEnabled))}
            <div id="collapse-body-mod-wallEdgeAssist" style="display: ${this.isSectionCollapsed('mod-wallEdgeAssist') ? 'none' : 'block'};">
            ${!edgeAssistEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Wall Edge Assist is disabled</div>` : ''}
            <div class="toggle-row" style="margin-bottom: 8px;">
              <label style="font-size: 0.8rem;">Prevent Walk-Off</label>
              <button id="toggle-edge-walkoff" class="btn-toggle ${char.wallEdgeAssistModule?.preventWalkOff ? 'active' : ''}">
                ${char.wallEdgeAssistModule?.preventWalkOff ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div id="prop-socket-edge-hang"></div>
            </div>
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
            ${this.renderModuleHeader("climbing", "🧗 Climbing Ability", renderToggleBtn("climbing", climbEnabled))}
            <div id="collapse-body-mod-climbing" style="display: ${this.isSectionCollapsed('mod-climbing') ? 'none' : 'block'};">
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
            <div id="prop-socket-climb-power-cap"></div>
            ${renderToggleRow("check-climb-energy", "Consumes Energy", Boolean(char.climbingModule?.consumesEnergy), "Save Climb Consumes Energy to project")}
            <div id="field-climb-partial-power" style="display: ${char.climbingModule?.consumesEnergy ? 'block' : 'none'}; padding-left: 8px;">
              ${renderToggleRow("check-climb-partial-power", "Allow Partial Power", Boolean(char.climbingModule?.allowPartialPower), "Save Climb Partial Power to project")}
            </div>
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
          ${this.renderModuleHeader("health", "❤️ Health & Vitality", renderToggleBtn("health", healthEnabled))}
          <div id="collapse-body-mod-health" style="display: ${this.isSectionCollapsed('mod-health') ? 'none' : 'block'};">
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
          <div id="prop-socket-health-hpperjoule"></div>
          <div id="prop-socket-health-power-cap"></div>

          ${renderToggleRow("check-health-energy", "Healing Consumes Energy", Boolean(hm.consumesEnergy), "Save Healing Consumes Energy to project")}
          <div id="field-health-partial-power" style="display: ${hm.consumesEnergy ? 'block' : 'none'}; padding-left: 8px;">
            ${renderToggleRow("check-health-partial-power", "Allow Partial Power", Boolean(hm.allowPartialPower), "Save Health Partial Power to project")}
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
        </div>
      `;
    }

    // Damage Aura Module (Any entity can radiate damage)
    if (hasDamageAuraModule && e.damageAuraModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!damageAuraEnabled ? 'module-disabled' : ''}" data-module-id="damageAura">
          ${this.renderModuleHeader("damageAura", "☣️ Damage Aura", renderToggleBtn("damageAura", damageAuraEnabled))}
          <div id="collapse-body-mod-damageAura" style="display: ${this.isSectionCollapsed('mod-damageAura') ? 'none' : 'block'};">
          ${!damageAuraEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Damage Aura is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Radiates continuous damage in a 3D spherical radius to all entities with a Health behavior.
          </div>
          <div id="prop-socket-aura-radius"></div>
          <div id="prop-socket-aura-rate"></div>
          </div>
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
          ${this.renderModuleHeader("damageSolver", "🛡️ Damage Solver & Armor", renderToggleBtn("damageSolver", damageSolverEnabled))}
          <div id="collapse-body-mod-damageSolver" style="display: ${this.isSectionCollapsed('mod-damageSolver') ? 'none' : 'block'};">
          ${!damageSolverEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Damage Solver is disabled</div>` : ''}
          ${healthWarning}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Converts physical impacts, wall collisions, and collisions with freebodies into shock damage.
          </div>
          <div id="prop-socket-impact-susceptibility"></div>
          <div id="prop-socket-min-shock-thresh"></div>
          <div id="prop-socket-self-impact-weight"></div>
          <div style="margin-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); padding-top: 6px;">
            <div id="scrub-container-mod-collision-damage-scale"></div>
            <div class="module-global-warning">
              <span>🌐</span>
              <span><strong>Global Variable:</strong> Changing collision damage scale alters HP shock damage for collisions across all entities in the arena.</span>
            </div>
          </div>
          </div>
        </div>
      `;
    }

    // Consume Module (Character only)
    if (hasConsumeModule && char && char.consumeModule) {
      attachedCount++;

      html += `
        <div class="module-card ${!consumeEnabled ? 'module-disabled' : ''}" data-module-id="consume">
          ${this.renderModuleHeader("consume", "🍴 Consume Ability", renderToggleBtn("consume", consumeEnabled))}
          <div id="collapse-body-mod-consume" style="display: ${this.isSectionCollapsed('mod-consume') ? 'none' : 'block'};">
          ${!consumeEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Item consumption is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Governs this character's ability to consume physical items. The character will only consume held items whose tags match their accepted list.
          </div>

          <div id="prop-socket-consume-tags" style="margin-top: 6px;"></div>
          </div>
        </div>
      `;
    }

    // Laser Blast Module (Character only)
    if (hasLaserModule && char && char.laserModule) {
      attachedCount++;
      const lm = char.laserModule;
      const curPower = lm.actualPowerWatts;
      const isFiring = lm.isFiring;
      const isAiming = lm.isAiming;
      const stateStr = isFiring ? "🔥 FIRING" : (isAiming ? "🎯 AIMING" : "💤 IDLE");
      const stateColor = isFiring ? "#f43f5e" : (isAiming ? "#06b6d4" : "#94a3b8");

      html += `
        <div class="module-card ${!laserEnabled ? 'module-disabled' : ''}" data-module-id="laser">
          ${this.renderModuleHeader("laser", "🔫 Laser Blast", renderToggleBtn("laser", laserEnabled))}
          <div id="collapse-body-mod-laser" style="display: ${this.isSectionCollapsed('mod-laser') ? 'none' : 'block'};">
          ${!laserEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Laser ability is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Continuous straight-line laser blast. Hold <strong>Left Ctrl</strong> (or Gamepad <strong>LB</strong>) to aim; hold <strong>Left Click</strong> (or pull Gamepad <strong>Right Trigger</strong>) to fire. Trigger pull depth scales power continuously (0&ndash;100%). Scroll wheel tunes damage rate on keyboard.
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.6); padding: 5px 8px; border-radius: 4px; margin-bottom: 6px; border: 1px solid rgba(6, 182, 212, 0.2);">
            <span style="font-size: 0.76rem; font-weight: 600; color: #e2e8f0;">State: <span id="label-laser-state" style="color: ${stateColor}; font-weight: 700;">${stateStr}</span></span>
            <span style="font-size: 0.76rem; font-weight: 600; color: #06b6d4;">Power: <span id="label-laser-power">${curPower.toFixed(0)} W</span></span>
          </div>

          <div id="prop-socket-laser-damage-rate"></div>
          <div id="prop-socket-laser-max-damage-rate"></div>
          <div id="prop-socket-laser-thickness"></div>
          <div id="prop-socket-laser-max-power"></div>



          ${renderToggleRow("check-laser-partial-power", "Allow Partial Power", Boolean(lm.allowPartialPower), "Save Laser Partial Power to project")}
          </div>
        </div>
      `;
    }

    // Melee Module (Character only)
    if (hasMeleeModule && char && char.meleeModule) {
      attachedCount++;
      const mm = char.meleeModule;
      html += `
        <div class="module-card ${!meleeEnabled ? 'module-disabled' : ''}" data-module-id="melee">
          ${this.renderModuleHeader("melee", "🥊 Melee Attack", renderToggleBtn("melee", meleeEnabled))}
          <div id="collapse-body-mod-melee" style="display: ${this.isSectionCollapsed('mod-melee') ? 'none' : 'block'};">
          ${!meleeEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Melee attack is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Rapid burst melee punch with physical impact knockback, recoil momentum exchange, and force-based damage shock. Trigger: <b>Ctrl + Right Click</b> (Keyboard) or <b>X button</b> (Gamepad) in facing direction.
          </div>

          <div id="prop-socket-melee-max-force"></div>
          <div id="prop-socket-melee-frequency"></div>
          <div id="prop-socket-melee-reach"></div>
          <div id="prop-socket-melee-width"></div>
          <div id="prop-socket-melee-max-power"></div>

          ${renderToggleRow("check-melee-partial-power", "Allow Partial Power", Boolean(mm.allowPartialPower), "Save Melee Partial Power to project")}
          </div>
        </div>
      `;
    }

    // Consumable Module (Items/Freebodies)
    if (hasConsumableModule && e.consumableModule) {
      attachedCount++;
      const cm = e.consumableModule;
      const curEnergy = cm.getRemainingEnergy(e.properties);
      const maxEnergy = cm.getTotalEnergy(e.properties);
      const consumablePct = maxEnergy > 0 ? Math.min(100, Math.max(0, (curEnergy / maxEnergy) * 100)) : 0;

      html += `
        <div class="module-card ${!consumableEnabled ? 'module-disabled' : ''}" data-module-id="consumable">
          ${this.renderModuleHeader("consumable", "🍎 Consumable", renderToggleBtn("consumable", consumableEnabled))}
          <div id="collapse-body-mod-consumable" style="display: ${this.isSectionCollapsed('mod-consumable') ? 'none' : 'block'};">
          ${!consumableEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Consumable ingestion is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Consumable physical item. Characters with matching accepted tags can hold and consume this item to transfer energy and nutrients, shrinking until 100% consumed.
          </div>

          <div id="prop-socket-consumable-tag" style="margin-bottom: 6px;"></div>

          <div style="margin: 6px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; color: #e2e8f0; margin-bottom: 2px;">
              <span>Remaining Energy</span>
              <span id="label-consumable-status">${curEnergy.toFixed(0)} / ${maxEnergy.toFixed(0)} J (${consumablePct.toFixed(0)}%)</span>
            </div>
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 4px; height: 10px; overflow: hidden;">
              <div id="bar-consumable-fill" style="background: linear-gradient(90deg, #16a34a, #22c55e); height: 100%; width: ${consumablePct}%; transition: width 0.1s ease;"></div>
            </div>
          </div>

          <div id="prop-socket-consumable-total-energy"></div>
          <div id="prop-socket-consumable-remaining-energy"></div>
          <div id="prop-socket-consumable-consume-rate"></div>
          <div id="prop-socket-consumable-heal-rate"></div>
          </div>
        </div>
      `;
    }

    // Spawner Module (Clone On Pickup)
    if (hasSpawnerModule && e.spawnerModule) {
      attachedCount++;
      const sm = e.spawnerModule;

      html += `
        <div class="module-card ${!spawnerEnabled ? 'module-disabled' : ''}" data-module-id="spawner">
          ${this.renderModuleHeader("spawner", "📦 Spawner (Clone On Pickup)", renderToggleBtn("spawner", spawnerEnabled))}
          <div id="collapse-body-mod-spawner" style="display: ${this.isSectionCollapsed('mod-spawner') ? 'none' : 'block'};">
          ${!spawnerEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Spawner replication is disabled</div>` : ''}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Dispenses an identical clone directly into the character's hands upon pickup, while this spawner stays put at its location with its spawner behavior intact.
          </div>
          <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 4px;">
            <div><strong>Spawn Anchor:</strong> (${sm.spawnPosition.x.toFixed(2)}, ${sm.spawnPosition.y.toFixed(2)}, ${sm.spawnPosition.z.toFixed(2)})</div>
            <div><strong>Total Clones Spawned:</strong> <span style="color: #22c55e; font-weight: 600;">${sm.spawnCount}</span></div>
          </div>
          </div>
        </div>
      `;
    }

    // Energy Pool Module (Character only - consolidated Energy & Stamina)
    if (hasEnergyPool && char?.energyPool) {
      attachedCount++;
      const ep = char.energyPool;
      const curEnergy = ep.getCurrentEnergy(char.properties);
      const maxEnergy = ep.getMaxEnergy(char.properties);
      const energyPct = maxEnergy > 0 ? Math.min(100, Math.max(0, (curEnergy / maxEnergy) * 100)) : 0;
      const curStamina = ep.getCurrentStamina(char.properties);
      const maxStamina = ep.getMaxStamina(char.properties);
      const staminaPct = maxStamina > 0 ? Math.min(100, Math.max(0, (curStamina / maxStamina) * 100)) : 0;
      const curWatts = ep.getCurrentWattage(char.properties);

      html += `
        <div class="module-card ${!energyPoolEnabled ? 'module-disabled' : ''}" data-module-id="energyPool">
          ${this.renderModuleHeader("energyPool", "⚡ Energy Pool & Stamina", renderToggleBtn("energyPool", energyPoolEnabled))}
          <div id="collapse-body-mod-energyPool" style="display: ${this.isSectionCollapsed('mod-energyPool') ? 'none' : 'block'};">
          ${!energyPoolEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Energy Pool is disabled</div>` : ''}
          <div id="warn-energy-exhausted" class="module-dep-warning" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); display: ${ep.isExhausted ? 'block' : 'none'};">⚠️ Exhausted! Stamina depleted below recovery threshold (${(ep.recoveryThresholdRatio * 100).toFixed(0)}%)</div>
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Consolidated biochemical energy store (Joules) and burst stamina. Food calories do not regenerate; burst stamina replenishes when resting.
          </div>

          <!-- Caloric Energy Bar -->
          <div style="margin: 6px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; color: #e2e8f0; margin-bottom: 2px;">
              <span>Caloric Energy Reservoir</span>
              <span id="label-energy-pool-status">${curEnergy.toFixed(0)} / ${maxEnergy.toFixed(0)} J (${energyPct.toFixed(0)}%)</span>
            </div>
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 4px; height: 10px; overflow: hidden;">
              <div id="bar-energy-pool-fill" style="background: linear-gradient(90deg, #ca8a04, #eab308); height: 100%; width: ${energyPct}%; transition: width 0.1s ease;"></div>
            </div>
          </div>

          <!-- Stamina Bar -->
          <div style="margin: 6px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; color: #e2e8f0; margin-bottom: 2px;">
              <span>Stamina Reservoir</span>
              <span id="label-energy-stamina-status">${curStamina.toFixed(0)} / ${maxStamina.toFixed(0)} J (${staminaPct.toFixed(0)}%)</span>
            </div>
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; height: 10px; overflow: hidden;">
              <div id="bar-energy-stamina-fill" style="background: linear-gradient(90deg, #0284c7, #38bdf8); height: 100%; width: ${staminaPct}%; transition: width 0.1s ease;"></div>
            </div>
          </div>

          <!-- Live Power Draw -->
          <div style="margin: 6px 0; padding: 4px 8px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; color: #94a3b8;">Current Power Draw:</span>
            <span id="label-energy-wattage" style="font-size: 0.82rem; font-weight: 700; color: ${curWatts > 0 ? '#38bdf8' : '#64748b'};">${curWatts.toFixed(0)} Watts</span>
          </div>

          <div id="prop-socket-energy-cur"></div>
          <div id="prop-socket-energy-max"></div>
          <div id="prop-socket-energy-stamina-cur"></div>
          <div id="prop-socket-energy-stamina-max"></div>
          <div id="prop-socket-energy-stamina-regen"></div>
          <div id="prop-socket-energy-efficiency"></div>

          <div style="margin-top: 6px; padding: 4px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #cbd5e1; margin-bottom: 4px;">
              <span>Exhaustion Recovery Threshold</span>
              <span id="label-energy-recovery-thresh" style="font-family: monospace; font-weight: 600; color: #38bdf8;">${(ep.recoveryThresholdRatio * 100).toFixed(0)}%</span>
            </div>
            <input type="range" id="slider-energy-recovery-thresh" min="0.05" max="0.80" step="0.05" value="${ep.recoveryThresholdRatio}" style="width: 100%;">
          </div>

          <div class="toggle-row" style="margin-top: 6px; margin-bottom: 2px;">
            <span style="font-size: 0.8rem; color: #cbd5e1;">Infinite Energy (Godmode)</span>
            <input type="checkbox" id="check-energy-infinite" ${ep.infiniteEnergy ? 'checked' : ''}>
          </div>
          <div class="toggle-row" style="margin-top: 4px; margin-bottom: 4px;">
            <span style="font-size: 0.8rem; color: #cbd5e1;">Debug Auto-Refill on Empty</span>
            <input type="checkbox" id="check-energy-autorefill" ${ep.debugAutoRefillOnEmpty ? 'checked' : ''}>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 8px;">
            <button id="btn-energy-sub100" class="btn-secondary-action" style="padding: 4px; font-size: 0.75rem; color: #eab308; border-color: rgba(234, 179, 8, 0.4);">
              -100 J
            </button>
            <button id="btn-energy-refill" class="btn-secondary-action" style="padding: 4px; font-size: 0.75rem; color: #22c55e; border-color: rgba(34, 197, 94, 0.4);">
              ⚡ Refill (100%)
            </button>
          </div>
          </div>
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
      { id: "consumable", name: "Consumable", icon: "🍎", description: "Consumable physical item with customizable tag and energy/healing payload", isAttached: hasConsumableModule },
      { id: "spawner", name: "Spawner (Clone On Pickup)", icon: "📦", description: "Clones the item at its initial spawn position upon pickup for infinite supplies", isAttached: hasSpawnerModule },
      { id: "character", name: "Character Module", icon: "👤", description: "Classifies entity role: Local/Remote Player, Local/Remote AI, or Inert Dummy", isAttached: hasCharModule },
    ];

    if (isChar) {
      allModules.push(
        { id: "walking", name: "Walking Ability", icon: "🚶", description: "Propulsion acceleration, muscle strength, and maximum ground speed", isAttached: hasWalkingModule },
        { id: "pickup", name: "Pickup Ability", icon: "✋", description: "3D sphere reach to pick up and swap freebodies", isAttached: hasPickupModule },
        { id: "throw", name: "Throw Ability", icon: "🎯", description: "Ballistic parabolic trajectory projection & launch", isAttached: hasThrowModule },
        { id: "jump", name: "Jump Ability", icon: "🦘", description: "Vertical leap triggered with Space / Gamepad (A)", isAttached: hasJumpModule },
        { id: "wallEdgeAssist", name: "Wall Edge Assist", icon: "🛡️", description: "Ledge guardrail preventing accidental walk-off on wall tops", isAttached: hasEdgeAssistModule },
        { id: "climbing", name: "Climbing Ability", icon: "🧗", description: "Wall mounting, adhesive grip, and vertical climb traversal", isAttached: hasClimbingModule },
        { id: "consume", name: "Consume Ability", icon: "🍴", description: "Consumes physical items matching accepted tags", isAttached: hasConsumeModule },
        { id: "laser", name: "Laser Blast", icon: "🔫", description: "Continuous straight-line laser blast ability consuming energy", isAttached: hasLaserModule },
        { id: "melee", name: "Melee Attack", icon: "🥊", description: "Physical punch with knockback, recoil, and force-based shock damage", isAttached: hasMeleeModule },
        { id: "energyPool", name: "Energy Pool & Stamina", icon: "⚡", description: "Consolidated biochemical energy reservoir (Joules) and burst stamina", isAttached: hasEnergyPool }
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
      case "consume":
        if (char?.consumeModule) char.consumeModule.enabled = !char.consumeModule.enabled;
        break;
      case "consumable":
      case "food":
        if (e.consumableModule) e.consumableModule.enabled = !e.consumableModule.enabled;
        break;
      case "spawner":
        if (e.spawnerModule) e.spawnerModule.enabled = !e.spawnerModule.enabled;
        break;
      case "character":
        if (e.characterModule) e.characterModule.enabled = !e.characterModule.enabled;
        break;
      case "energyPool":
        if (char?.energyPool) char.energyPool.enabled = !char.energyPool.enabled;
        break;
      case "laser":
        if (char?.laserModule) char.laserModule.enabled = !char.laserModule.enabled;
        break;
      case "melee":
        if (char?.meleeModule) char.meleeModule.enabled = !char.meleeModule.enabled;
        break;
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
    if (!(e instanceof Character)) {
      this.markDirty("objects", e);
    } else {
      this.markDirty("player", e);
    }
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
      case "consume":
        if (e instanceof Character) {
          (e as Character).consumeModule = null;
        }
        break;
      case "consumable":
      case "food":
        e.consumableModule = null;
        break;
      case "spawner":
        e.spawnerModule = null;
        break;
      case "character":
        e.characterModule = null;
        break;
      case "energyPool":
        if (e instanceof Character) {
          (e as Character).energyPool = null;
        }
        break;
      case "laser":
        if (e instanceof Character) {
          (e as Character).laserModule = null;
        }
        break;
      case "melee":
        if (e instanceof Character) {
          (e as Character).meleeModule = null;
        }
        break;
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
    if (!(e instanceof Character)) {
      this.markDirty("objects", e);
    } else {
      this.markDirty("player", e);
    }
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
          (e as Character).walkingModule = new WalkingModule({
            walkConsumesEnergy: false,
            walkAllowPartialPower: false,
            sprintConsumesEnergy: true,
            sprintAllowPartialPower: true,
          });
        }
        break;
      case "pickup":
        if (e instanceof Character) {
          (e as Character).pickupModule = new PickupModule({ consumesEnergy: false, allowPartialPower: false });
        }
        break;
      case "throw":
        if (e instanceof Character) {
          (e as Character).throwModule = new ThrowModule({ consumesEnergy: true });
        }
        break;
      case "jump":
        if (e instanceof Character) {
          (e as Character).jumpModule = new JumpModule();
          (e as Character).jumpConsumesEnergy = true;
          (e as Character).jumpAllowPartialPower = false;
        }
        break;
      case "wallEdgeAssist":
        if (e instanceof Character) {
          (e as Character).wallEdgeAssistModule = new WallEdgeAssistModule();
        }
        break;
      case "climbing":
        if (e instanceof Character) {
          (e as Character).climbingModule = new ClimbingModule({ consumesEnergy: true, allowPartialPower: false });
        }
        break;
      case "health":
        e.healthModule = new HealthModule({
          baseMaxHp: 100,
          maxHp: 100,
          currentHp: 100,
          baseMaxHealRate: 5,
          maxHealRate: 5,
          consumesEnergy: true,
          allowPartialPower: true,
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
      case "consume":
        if (e instanceof Character) {
          (e as Character).consumeModule = new ConsumeModule({
            acceptedTags: ["food"],
          });
        }
        break;
      case "consumable":
      case "food":
        e.consumableModule = new ConsumableModule({
          tag: "food",
          totalEnergyJoules: 4000,
          consumeRateWatts: 800,
        });
        e.consumableModule.initialColliderRadius = e.colliderRadius;
        break;
      case "spawner":
        e.spawnerModule = new SpawnerModule({
          spawnPosition: { ...e.position },
          respawnDelay: 0,
        });
        break;
      case "character":
        e.characterModule = new CharacterModule({
          role: e instanceof Character ? (e as Character).role : "dummy",
        });
        break;
      case "energyPool":
        if (e instanceof Character) {
          (e as Character).energyPool = new EnergyPool();
        }
        break;
      case "laser":
        if (e instanceof Character) {
          (e as Character).laserModule = new LaserModule();
        }
        break;
      case "melee":
        if (e instanceof Character) {
          (e as Character).meleeModule = new MeleeModule();
        }
        break;
    }

    this.renderEntityModules();
    this.updateSelectorOptions();
    this.updateInspector();
    if (!(e instanceof Character)) {
      this.markDirty("objects", e);
    } else {
      this.markDirty("player", e);
    }
  }

  private bindDynamicModuleControls(): void {
    const e = this.selectedEntity;
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    const bindToggleSave = (checkboxId: string, owner: GameObject, keyPath: string, label: string, onApply?: (val: boolean) => void) => {
      const chk = this.container.querySelector(`#${checkboxId}`) as HTMLInputElement | null;
      const saveBtnId = `btn-save-${checkboxId.replace(/^check-/, '')}`;
      const btn = this.container.querySelector(`#${saveBtnId}`) as HTMLButtonElement | null;
      if (!chk || !btn) return;
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const val = chk.checked;
        if (onApply) onApply(val);
        this.saveIndividualToggle(owner, keyPath, val, label, btn);
      });
    };

    // Character Module Role Selector
    const selectCharRole = this.container.querySelector("#select-char-role") as HTMLSelectElement | null;
    selectCharRole?.addEventListener("change", () => {
      const newRole = selectCharRole.value as CharacterRole;
      if (char) {
        char.role = newRole;
      } else if (e.characterModule) {
        e.characterModule.role = newRole;
      } else {
        e.characterModule = new CharacterModule({ role: newRole });
      }
      const badge = this.container.querySelector("#badge-char-role");
      if (badge) badge.textContent = newRole.toUpperCase();
      this.updateInspector();
    });

    // Rigidbody
    const selectRbCollision = this.container.querySelector("#select-rb-collision-mode") as HTMLSelectElement | null;
    selectRbCollision?.addEventListener("change", () => {
      e.collisionMode = selectRbCollision.value as "discrete" | "continuous" | "dynamic";
      const selectEntityCollision = this.container.querySelector("#select-entity-collision-mode") as HTMLSelectElement | null;
      if (selectEntityCollision) selectEntityCollision.value = e.collisionMode;
      const badge = this.container.querySelector("#badge-rb-collision-mode");
      if (badge) badge.textContent = e.collisionMode.toUpperCase();
      this.updateInspector();
      if (!(e instanceof Character)) {
        this.markDirty("objects", e);
      }
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
      if (!(e instanceof Character)) {
        this.markDirty("objects", e);
      }
    });

    this.setupSlider("slide-entity-vert-vel", "val-entity-vert-vel", (val) => {
      e.verticalVelocity = val;
      if (!(e instanceof Character)) {
        this.markDirty("objects", e);
      }
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
        onUserChange: () => {
          if (e.prefabId) {
            e.overriddenProperties.add("colliderRadius");
            this.updatePrefabInfoBadge();
          }
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        },
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
        onUserChange: () => {
          if (e.prefabId) {
            e.overriddenProperties.add("mass");
            this.updatePrefabInfoBadge();
          }
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        },
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
        onUserChange: () => {
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        },
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
        onUserChange: () => {
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        },
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
        onUserChange: () => {
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        },
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
      if (!(e instanceof Character)) {
        this.markDirty("objects", e);
      }
    });
    bindToggleSave("check-mod-vert-bounce", e, "verticalBounce", "Vertical Bounce", (v) => {
      if (e.bounceModule) e.bounceModule.verticalBounce = v;
    });

    // Vertical Position
    this.setupSlider("slide-entity-elevation", "val-entity-elevation", (val) => {
      if (e.verticalPositionModule) {
        e.verticalPositionModule.z = val;
      }
      e.position.z = val;
      this.syncEntitySliders();
      this.updateInspector();
      if (!(e instanceof Character)) {
        this.markDirty("objects", e);
      }
    }, 2);

    // Roll Resistance (Dynamic Property Socket)
    const rollResistSocketEl = this.container.querySelector("#prop-socket-roll-resist");
    if (rollResistSocketEl && e.rollModule) {
      const rollCtrl = new PropertyControl({
        property: e.rollModule.rollResistanceProp,
        owner: e,
        label: "Roll Resistance (u/s²)",
        step: 0.05,
        onUserChange: () => {
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        },
      });
      rollResistSocketEl.appendChild(rollCtrl.element);
    }

    // Bumpy Roll Feature (Toggle & Property Sockets)
    const checkBumpyRoll = this.container.querySelector("#check-roll-bumpy-enabled") as HTMLInputElement | null;
    if (checkBumpyRoll && e.rollModule) {
      checkBumpyRoll.addEventListener("change", () => {
        if (e.rollModule) {
          e.rollModule.bumpyRollEnabled = checkBumpyRoll.checked;
          const bumpinessEl = this.container.querySelector("#prop-socket-roll-bumpiness") as HTMLElement | null;
          const hopEffEl = this.container.querySelector("#prop-socket-roll-hop-efficiency") as HTMLElement | null;
          if (bumpinessEl) bumpinessEl.style.display = checkBumpyRoll.checked ? "block" : "none";
          if (hopEffEl) hopEffEl.style.display = checkBumpyRoll.checked ? "block" : "none";
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        }
      });
      bindToggleSave("check-roll-bumpy-enabled", e, "bumpyRollEnabled", "Bumpy Roll", (v) => {
        if (e.rollModule) e.rollModule.bumpyRollEnabled = v;
      });
    }

    const rollBumpSocketEl = this.container.querySelector("#prop-socket-roll-bumpiness");
    if (rollBumpSocketEl && e.rollModule) {
      const bumpCtrl = new PropertyControl({
        property: e.rollModule.bumpinessProp,
        owner: e,
        label: "Bumpiness (0=Smooth, 1=Rocky)",
        step: 0.01,
        min: 0.0,
        max: 1.0,
        onUserChange: () => {
          if (!(e instanceof Character)) {
            this.markDirty("objects", e);
          }
        },
      });
      rollBumpSocketEl.appendChild(bumpCtrl.element);
    }

    // Gravity Module (Global Arena Gravity Control)
    if (e.gravityModule) {
      this.setupScrubber("scrub-container-mod-gravity", {
        label: "Gravity Force",
        isGlobal: true,
        value: this.arena.gravity,
        min: 1.0,
        max: 100.0,
        step: 0.5,
        decimals: 1,
        suffix: " u/s²",
        onChange: (val) => {
          this.arena.gravity = val;
          this.setScrubberVal("scrub-container-gravity", val);
          this.updateInspector();
        },
      });
    }

    // Character Abilities
    if (isChar && char) {
      const checkWalkInAir = this.container.querySelector("#check-walk-in-air") as HTMLInputElement;
      checkWalkInAir?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.walkInAir = checkWalkInAir.checked;
        }
      });
      bindToggleSave("check-walk-in-air", char, "walkInAir", "Air Control (Walk in Air)", (v) => {
        if (char.walkingModule) char.walkingModule.walkInAir = v;
      });

      const canSprintCheck = this.container.querySelector("#check-can-sprint") as HTMLInputElement;
      canSprintCheck?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.canSprint = canSprintCheck.checked;
        }
      });
      bindToggleSave("check-can-sprint", char, "canSprint", "Can Sprint", (v) => {
        if (char.walkingModule) char.walkingModule.canSprint = v;
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
      const walkPowerCapSocketEl = this.container.querySelector("#prop-socket-walk-power-cap");
      if (walkPowerCapSocketEl && char.walkingModule) {
        const wpCtrl = new PropertyControl({
          property: char.walkingModule.maxWalkPowerProp,
          owner: char,
          label: "Max Walk Power (Watts)",
          step: 25.0,
        });
        walkPowerCapSocketEl.appendChild(wpCtrl.element);
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
      const sprintPowerCapSocketEl = this.container.querySelector("#prop-socket-sprint-power-cap");
      if (sprintPowerCapSocketEl && char.walkingModule) {
        const spCtrl = new PropertyControl({
          property: char.walkingModule.maxSprintPowerProp,
          owner: char,
          label: "Max Sprint Power (Watts)",
          step: 25.0,
        });
        sprintPowerCapSocketEl.appendChild(spCtrl.element);
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
      const fieldWalkPartialPower = this.container.querySelector("#field-walk-partial-power") as HTMLElement;
      const checkWalkPartialPower = this.container.querySelector("#check-walk-partial-power") as HTMLInputElement;
      checkWalkEnergy?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.walkConsumesEnergy = checkWalkEnergy.checked;
          if (fieldWalkPartialPower) fieldWalkPartialPower.style.display = checkWalkEnergy.checked ? "flex" : "none";
        }
      });
      bindToggleSave("check-walk-energy", char, "walkConsumesEnergy", "Walk Consumes Energy", (v) => {
        if (char.walkingModule) char.walkingModule.walkConsumesEnergy = v;
      });
      bindToggleSave("check-walk-partial-power", char, "walkingModule.walkAllowPartialPower", "Walk Partial Power", (v) => {
        if (char.walkingModule) char.walkingModule.walkAllowPartialPower = v;
      });
      checkWalkPartialPower?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.walkAllowPartialPower = checkWalkPartialPower.checked;
        }
      });

      const checkSprintEnergy = this.container.querySelector("#check-sprint-energy") as HTMLInputElement;
      const fieldSprintPartialPower = this.container.querySelector("#field-sprint-partial-power") as HTMLElement;
      const checkSprintPartialPower = this.container.querySelector("#check-sprint-partial-power") as HTMLInputElement;
      checkSprintEnergy?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.sprintConsumesEnergy = checkSprintEnergy.checked;
          if (fieldSprintPartialPower) fieldSprintPartialPower.style.display = checkSprintEnergy.checked ? "block" : "none";
        }
      });
      bindToggleSave("check-sprint-energy", char, "sprintConsumesEnergy", "Sprint Consumes Energy", (v) => {
        if (char.walkingModule) char.walkingModule.sprintConsumesEnergy = v;
      });
      bindToggleSave("check-sprint-partial-power", char, "walkingModule.sprintAllowPartialPower", "Sprint Partial Power", (v) => {
        if (char.walkingModule) char.walkingModule.sprintAllowPartialPower = v;
      });
      checkSprintPartialPower?.addEventListener("change", () => {
        if (char.walkingModule) {
          char.walkingModule.sprintAllowPartialPower = checkSprintPartialPower.checked;
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

      // Pickup sockets
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
      const pickupPowerCapSocketEl = this.container.querySelector("#prop-socket-pickup-power-cap");
      if (pickupPowerCapSocketEl && char.pickupModule) {
        const ppCtrl = new PropertyControl({
          property: char.pickupModule.maxPowerProp,
          owner: char,
          label: "Max Pickup Power (Watts)",
          step: 25.0,
        });
        pickupPowerCapSocketEl.appendChild(ppCtrl.element);
      }
      const checkPickupEnergy = this.container.querySelector("#check-pickup-energy") as HTMLInputElement;
      const fieldPickupPartialPower = this.container.querySelector("#field-pickup-partial-power") as HTMLElement;
      const checkPickupPartialPower = this.container.querySelector("#check-pickup-partial-power") as HTMLInputElement;
      checkPickupEnergy?.addEventListener("change", () => {
        if (char.pickupModule) {
          char.pickupModule.consumesEnergy = checkPickupEnergy.checked;
          if (fieldPickupPartialPower) fieldPickupPartialPower.style.display = checkPickupEnergy.checked ? "block" : "none";
        }
      });
      bindToggleSave("check-pickup-energy", char, "pickupConsumesEnergy", "Consumes Energy", (v) => {
        if (char.pickupModule) char.pickupModule.consumesEnergy = v;
      });
      bindToggleSave("check-pickup-partial-power", char, "pickupModule.allowPartialPower", "Pickup Partial Power", (v) => {
        if (char.pickupModule) char.pickupModule.allowPartialPower = v;
      });
      checkPickupPartialPower?.addEventListener("change", () => {
        if (char.pickupModule) {
          char.pickupModule.allowPartialPower = checkPickupPartialPower.checked;
        }
      });

      // Throw sockets
      const throwForceSocketEl = this.container.querySelector("#prop-socket-throw-force");
      if (throwForceSocketEl && char.throwModule) {
        const tfCtrl = new PropertyControl({
          property: char.throwModule.maxThrowSpeedProp,
          owner: char,
          label: "Max Throw Speed (u/s)",
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
      const throwPowerCapSocketEl = this.container.querySelector("#prop-socket-throw-power-cap");
      if (throwPowerCapSocketEl && char.throwModule) {
        const tpCtrl = new PropertyControl({
          property: char.throwModule.maxPowerProp,
          owner: char,
          label: "Max Throw Power (Watts)",
          step: 50.0,
        });
        throwPowerCapSocketEl.appendChild(tpCtrl.element);
      }
      const checkThrowEnergy = this.container.querySelector("#check-throw-energy") as HTMLInputElement;
      checkThrowEnergy?.addEventListener("change", () => {
        if (char.throwModule) {
          char.throwModule.consumesEnergy = checkThrowEnergy.checked;
        }
      });
      bindToggleSave("check-throw-energy", char, "throwConsumesEnergy", "Consumes Energy", (v) => {
        if (char.throwModule) char.throwModule.consumesEnergy = v;
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
      const jumpPowerCapSocketEl = this.container.querySelector("#prop-socket-jump-power-cap");
      if (jumpPowerCapSocketEl && char.jumpMaxPowerProp) {
        const jpCtrl = new PropertyControl({
          property: char.jumpMaxPowerProp,
          owner: char,
          label: "Max Jump Power (Watts)",
          step: 50.0,
        });
        jumpPowerCapSocketEl.appendChild(jpCtrl.element);
      }
      const checkJumpEnergy = this.container.querySelector("#check-jump-energy") as HTMLInputElement;
      const fieldJumpPartialPower = this.container.querySelector("#field-jump-partial-power") as HTMLElement;
      const checkJumpPartialPower = this.container.querySelector("#check-jump-partial-power") as HTMLInputElement;
      checkJumpEnergy?.addEventListener("change", () => {
        char.jumpConsumesEnergy = checkJumpEnergy.checked;
        if (fieldJumpPartialPower) fieldJumpPartialPower.style.display = checkJumpEnergy.checked ? "flex" : "none";
      });
      bindToggleSave("check-jump-energy", char, "jumpConsumesEnergy", "Consumes Energy", (v) => {
        char.jumpConsumesEnergy = v;
      });
      bindToggleSave("check-jump-partial-power", char, "jumpModule.jumpAllowPartialPower", "Jump Partial Power", (v) => {
        char.jumpAllowPartialPower = v;
      });
      checkJumpPartialPower?.addEventListener("change", () => {
        char.jumpAllowPartialPower = checkJumpPartialPower.checked;
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
      const climbPowerCapSocketEl = this.container.querySelector("#prop-socket-climb-power-cap");
      if (climbPowerCapSocketEl && char.climbingModule) {
        const cpCtrl = new PropertyControl({
          property: char.climbingModule.maxPowerProp,
          owner: char,
          label: "Max Climb Power (Watts)",
          step: 25.0,
        });
        climbPowerCapSocketEl.appendChild(cpCtrl.element);
      }
      const checkClimbEnergy = this.container.querySelector("#check-climb-energy") as HTMLInputElement;
      const fieldClimbPartialPower = this.container.querySelector("#field-climb-partial-power") as HTMLElement;
      const checkClimbPartialPower = this.container.querySelector("#check-climb-partial-power") as HTMLInputElement;
      checkClimbEnergy?.addEventListener("change", () => {
        if (char.climbingModule) {
          char.climbingModule.consumesEnergy = checkClimbEnergy.checked;
          if (fieldClimbPartialPower) fieldClimbPartialPower.style.display = checkClimbEnergy.checked ? "block" : "none";
        }
      });
      bindToggleSave("check-climb-energy", char, "climbConsumesEnergy", "Consumes Energy", (v) => {
        if (char.climbingModule) char.climbingModule.consumesEnergy = v;
      });
      bindToggleSave("check-climb-partial-power", char, "climbingModule.allowPartialPower", "Climb Partial Power", (v) => {
        if (char.climbingModule) char.climbingModule.allowPartialPower = v;
      });
      checkClimbPartialPower?.addEventListener("change", () => {
        if (char.climbingModule) {
          char.climbingModule.allowPartialPower = checkClimbPartialPower.checked;
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
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
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
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
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
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        hpHealSocketEl.appendChild(hrCtrl.element);
      }

      const hpPerJouleSocketEl = this.container.querySelector("#prop-socket-health-hpperjoule");
      if (hpPerJouleSocketEl) {
        const jCtrl = new PropertyControl({
          property: hm.hpPerJouleProp,
          owner: e,
          label: "Healing Efficiency (HP/Joule)",
          step: 0.005,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        hpPerJouleSocketEl.appendChild(jCtrl.element);
      }
      const hpPowerCapSocketEl = this.container.querySelector("#prop-socket-health-power-cap");
      if (hpPowerCapSocketEl) {
        const pCtrl = new PropertyControl({
          property: hm.maxPowerProp,
          owner: e,
          label: "Max Healing Power (Watts)",
          step: 25.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        hpPowerCapSocketEl.appendChild(pCtrl.element);
      }

      const checkHealthEnergy = this.container.querySelector("#check-health-energy") as HTMLInputElement;
      const fieldHealthPartialPower = this.container.querySelector("#field-health-partial-power") as HTMLElement;
      const checkHealthPartialPower = this.container.querySelector("#check-health-partial-power") as HTMLInputElement;
      checkHealthEnergy?.addEventListener("change", () => {
        hm.consumesEnergy = checkHealthEnergy.checked;
        if (fieldHealthPartialPower) fieldHealthPartialPower.style.display = checkHealthEnergy.checked ? "block" : "none";
        if (!(e instanceof Character)) {
          this.markDirty("objects", e);
        }
      });
      bindToggleSave("check-health-energy", e, "healthConsumesEnergy", "Healing Consumes Energy", (v) => {
        hm.consumesEnergy = v;
      });
      bindToggleSave("check-health-partial-power", e, "healthModule.allowPartialPower", "Health Partial Power", (v) => {
        hm.allowPartialPower = v;
      });
      checkHealthPartialPower?.addEventListener("change", () => {
        hm.allowPartialPower = checkHealthPartialPower.checked;
        if (!(e instanceof Character)) {
          this.markDirty("objects", e);
        }
      });

      // Quick test buttons
      this.container.querySelector("#btn-health-sub10")?.addEventListener("click", () => {
        hm.takeDamage(10, e.properties, {
          id: "damage",
          name: "Damage",
          type: "instant",
          amount: 10,
          color: "#ef4444",
          isHeal: false,
        });
        this.updateInspector();
      });
      this.container.querySelector("#btn-health-add10")?.addEventListener("click", () => {
        hm.heal(10, e.properties, {
          id: "heal",
          name: "Heal",
          type: "instant",
          amount: 10,
          color: "#22c55e",
          isHeal: true,
        });
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
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
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
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
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
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        suscSocketEl.appendChild(suscCtrl.element);
      }

      const threshSocketEl = this.container.querySelector("#prop-socket-min-shock-thresh");
      if (threshSocketEl) {
        const threshCtrl = new PropertyControl({
          property: ds.damageThresholdHpProp,
          owner: e,
          label: "Collision Damage Threshold (HP)",
          step: 1.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        threshSocketEl.appendChild(threshCtrl.element);
      }

      const selfWeightSocketEl = this.container.querySelector("#prop-socket-self-impact-weight");
      if (selfWeightSocketEl) {
        const selfWeightCtrl = new PropertyControl({
          property: ds.selfImpactWeightProp,
          owner: e,
          label: "Self-Speed Damage Weight (0 = Arcade, 1 = Realism)",
          step: 0.05,
          min: 0.0,
          max: 1.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        selfWeightSocketEl.appendChild(selfWeightCtrl.element);
      }

      this.setupScrubber("scrub-container-mod-collision-damage-scale", {
        label: "Collision Damage Scale",
        isGlobal: true,
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
          this.setScrubberVal("scrub-container-collision-damage-scale", val);
        },
      });
    }

    // Consume Module controls (Character only)
    if (char && char.consumeModule) {
      const consumeSocketEl = this.container.querySelector("#prop-socket-consume-tags");
      if (consumeSocketEl) {
        const tagCtrl = new TagSelectorControl({
          mode: "multi",
          label: "Accepted Consumable Tags",
          acceptedTags: char.consumeModule.acceptedTags,
          onTagsChanged: (tags) => {
            char.consumeModule!.acceptedTags = tags;
          },
        });
        consumeSocketEl.appendChild(tagCtrl.element);
      }
    }

    // Consumable Module controls (applicable to any entity with ConsumableModule)
    if (e.consumableModule) {
      const cm = e.consumableModule;

      const tagSocketEl = this.container.querySelector("#prop-socket-consumable-tag");
      if (tagSocketEl) {
        const tagCtrl = new TagSelectorControl({
          mode: "single",
          label: "Consumable Tag",
          currentTag: cm.tag,
          onTagSelected: (tag) => {
            cm.tag = tag;
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_tag");
              this.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        tagSocketEl.appendChild(tagCtrl.element);
      }

      const totalEnergySocketEl = this.container.querySelector("#prop-socket-consumable-total-energy");
      if (totalEnergySocketEl) {
        const totalCtrl = new PropertyControl({
          property: cm.totalEnergyJoulesProp,
          owner: e,
          label: "Total Energy (J)",
          step: 100.0,
          onUserChange: () => {
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_totalEnergy");
              this.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        totalEnergySocketEl.appendChild(totalCtrl.element);
      }

      const remEnergySocketEl = this.container.querySelector("#prop-socket-consumable-remaining-energy");
      if (remEnergySocketEl) {
        const remCtrl = new PropertyControl({
          property: cm.remainingEnergyJoulesProp,
          owner: e,
          label: "Remaining Energy (J)",
          step: 50.0,
          onUserChange: () => {
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        remEnergySocketEl.appendChild(remCtrl.element);
      }

      const consumeRateSocketEl = this.container.querySelector("#prop-socket-consumable-consume-rate");
      if (consumeRateSocketEl) {
        const rateCtrl = new PropertyControl({
          property: cm.consumeRateWattsProp,
          owner: e,
          label: "Consume Rate (Watts = J/s)",
          step: 25.0,
          onUserChange: () => {
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_consumeRate");
              this.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        consumeRateSocketEl.appendChild(rateCtrl.element);
      }

      const healRateSocketEl = this.container.querySelector("#prop-socket-consumable-heal-rate");
      if (healRateSocketEl) {
        const healCtrl = new PropertyControl({
          property: cm.healRateProp,
          owner: e,
          label: "Nutritional Healing Rate (HP/s)",
          step: 1.0,
          onUserChange: () => {
            if (e.prefabId) {
              e.overriddenProperties.add("consumable_healRate");
              this.updatePrefabInfoBadge();
            }
            if (!(e instanceof Character)) {
              this.markDirty("objects", e);
            }
          },
        });
        healRateSocketEl.appendChild(healCtrl.element);
      }
    }

    // Laser Blast controls (Character only)
    if (char && char.laserModule) {
      const lm = char.laserModule;
      const dmgRateEl = this.container.querySelector("#prop-socket-laser-damage-rate");
      if (dmgRateEl) {
        const ctrl = new PropertyControl({
          property: lm.damageRateProp,
          owner: char,
          label: "Active Damage Rate (HP/s)",
          step: 5.0,
        });
        dmgRateEl.appendChild(ctrl.element);
      }
      const maxDmgEl = this.container.querySelector("#prop-socket-laser-max-damage-rate");
      if (maxDmgEl) {
        const ctrl = new PropertyControl({
          property: lm.maxDamageRateProp,
          owner: char,
          label: "Max Damage Rate (HP/s)",
          step: 10.0,
        });
        maxDmgEl.appendChild(ctrl.element);
      }
      const thickEl = this.container.querySelector("#prop-socket-laser-thickness");
      if (thickEl) {
        const ctrl = new PropertyControl({
          property: lm.thicknessProp,
          owner: char,
          label: "Beam Thickness (World Units)",
          step: 0.05,
        });
        thickEl.appendChild(ctrl.element);
      }
      const pwrEl = this.container.querySelector("#prop-socket-laser-max-power");
      if (pwrEl) {
        const ctrl = new PropertyControl({
          property: lm.maxPowerProp,
          owner: char,
          label: "Max Power Rating (Watts)",
          step: 25.0,
        });
        pwrEl.appendChild(ctrl.element);
      }

      const checkPartial = this.container.querySelector("#check-laser-partial-power") as HTMLInputElement | null;
      checkPartial?.addEventListener("change", () => {
        lm.allowPartialPower = checkPartial.checked;
        this.updateInspector();
      });
      bindToggleSave("check-laser-partial-power", char, "laserModule.allowPartialPower", "Laser Partial Power", (v) => {
        lm.allowPartialPower = v;
      });
    }

    // Melee Module controls (Character only)
    if (char && char.meleeModule) {
      const mm = char.meleeModule;

      const forceEl = this.container.querySelector("#prop-socket-melee-max-force");
      if (forceEl) {
        const ctrl = new PropertyControl({
          property: mm.maxForceProp,
          owner: char,
          label: "Max Punch Force (Newtons)",
          step: 25.0,
        });
        forceEl.appendChild(ctrl.element);
      }

      const freqEl = this.container.querySelector("#prop-socket-melee-frequency");
      if (freqEl) {
        const ctrl = new PropertyControl({
          property: mm.punchFrequencyProp,
          owner: char,
          label: "Punch Frequency (Hz)",
          step: 0.5,
        });
        freqEl.appendChild(ctrl.element);
      }

      const reachEl = this.container.querySelector("#prop-socket-melee-reach");
      if (reachEl) {
        const ctrl = new PropertyControl({
          property: mm.reachProp,
          owner: char,
          label: "Attack Reach (Meters)",
          step: 0.1,
        });
        reachEl.appendChild(ctrl.element);
      }

      const widthEl = this.container.querySelector("#prop-socket-melee-width");
      if (widthEl) {
        const ctrl = new PropertyControl({
          property: mm.widthProp,
          owner: char,
          label: "Attack Width (Meters)",
          step: 0.1,
        });
        widthEl.appendChild(ctrl.element);
      }

      const meleePowerCapEl = this.container.querySelector("#prop-socket-melee-max-power");
      if (meleePowerCapEl) {
        const mpCtrl = new PropertyControl({
          property: mm.maxPowerProp,
          owner: char,
          label: "Max Attack Power (Watts)",
          step: 25.0,
        });
        meleePowerCapEl.appendChild(mpCtrl.element);
      }

      const checkPartial = this.container.querySelector("#check-melee-partial-power") as HTMLInputElement | null;
      checkPartial?.addEventListener("change", () => {
        mm.allowPartialPower = checkPartial.checked;
        this.updateInspector();
      });
      bindToggleSave("check-melee-partial-power", char, "meleeModule.allowPartialPower", "Melee Partial Power", (v) => {
        mm.allowPartialPower = v;
      });
    }

    // Energy Pool controls (Character only - consolidated Energy & Stamina)
    if (char && char.energyPool) {
      const ep = char.energyPool;

      const curEnergyEl = this.container.querySelector("#prop-socket-energy-cur");
      if (curEnergyEl) {
        const curCtrl = new PropertyControl({
          property: ep.currentEnergyProp,
          owner: char,
          label: "Current Energy (J)",
          step: 50.0,
        });
        curEnergyEl.appendChild(curCtrl.element);
      }

      const maxEnergyEl = this.container.querySelector("#prop-socket-energy-max");
      if (maxEnergyEl) {
        const maxCtrl = new PropertyControl({
          property: ep.maxEnergyProp,
          owner: char,
          label: "Max Energy Capacity (J)",
          step: 100.0,
        });
        maxEnergyEl.appendChild(maxCtrl.element);
      }

      const curStaminaEl = this.container.querySelector("#prop-socket-energy-stamina-cur");
      if (curStaminaEl) {
        const csCtrl = new PropertyControl({
          property: ep.currentStaminaProp,
          owner: char,
          label: "Current Stamina (Joules)",
          step: 50.0,
          min: 0.0,
        });
        curStaminaEl.appendChild(csCtrl.element);
      }

      const maxStaminaEl = this.container.querySelector("#prop-socket-energy-stamina-max");
      if (maxStaminaEl) {
        const msCtrl = new PropertyControl({
          property: ep.maxStaminaProp,
          owner: char,
          label: "Stamina Reservoir Capacity (Joules)",
          step: 100.0,
          min: 50.0,
          max: 50000.0,
        });
        maxStaminaEl.appendChild(msCtrl.element);
      }

      const regenEl = this.container.querySelector("#prop-socket-energy-stamina-regen");
      if (regenEl) {
        const rCtrl = new PropertyControl({
          property: ep.staminaRegenRateProp,
          owner: char,
          label: "Stamina Regen Rate (Watts = J/s)",
          step: 25.0,
          min: 0.0,
          max: 5000.0,
        });
        regenEl.appendChild(rCtrl.element);
      }

      const effEl = this.container.querySelector("#prop-socket-energy-efficiency");
      if (effEl) {
        const eCtrl = new PropertyControl({
          property: ep.muscleEfficiencyProp,
          owner: char,
          label: "Muscle Metabolic Efficiency (Ratio)",
          step: 0.05,
          min: 0.01,
          max: 1.0,
        });
        effEl.appendChild(eCtrl.element);
      }

      const sliderRecoveryThresh = this.container.querySelector("#slider-energy-recovery-thresh") as HTMLInputElement | null;
      const labelRecoveryThresh = this.container.querySelector("#label-energy-recovery-thresh") as HTMLElement | null;
      sliderRecoveryThresh?.addEventListener("input", (ev) => {
        const val = parseFloat((ev.target as HTMLInputElement).value);
        ep.recoveryThresholdRatio = val;
        if (labelRecoveryThresh) {
          labelRecoveryThresh.textContent = `${(val * 100).toFixed(0)}%`;
        }
      });

      const checkInfinite = this.container.querySelector("#check-energy-infinite") as HTMLInputElement;
      checkInfinite?.addEventListener("change", () => {
        ep.infiniteEnergy = checkInfinite.checked;
      });

      const checkAutoRefill = this.container.querySelector("#check-energy-autorefill") as HTMLInputElement;
      checkAutoRefill?.addEventListener("change", () => {
        ep.debugAutoRefillOnEmpty = checkAutoRefill.checked;
      });

      this.container.querySelector("#btn-energy-sub100")?.addEventListener("click", () => {
        ep.consume(100, char.properties);
        this.updateInspector();
      });

      this.container.querySelector("#btn-energy-refill")?.addEventListener("click", () => {
        ep.refill(char.properties);
        this.updateInspector();
      });
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

  private setupScrubber(
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
    const badgeEl = this.container.querySelector("#selected-entity-prefab-info") as HTMLElement | null;
    if (!badgeEl) return;

    const e = this.selectedEntity;
    if (!e || e instanceof Character || !e.prefabId) {
      badgeEl.style.display = "none";
      badgeEl.innerHTML = "";
      return;
    }

    const prefab = prefabManager.get(e.prefabId);
    const prefabName = prefab ? `${prefab.icon} ${prefab.name}` : e.prefabId;
    const overridesCount = e.overriddenProperties.size;
    const overridesBadge = overridesCount > 0
      ? `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); margin-left: 6px;">${overridesCount} override${overridesCount > 1 ? "s" : ""}</span>`
      : `<span style="color: #94a3b8; font-size: 0.70rem; margin-left: 6px;">(Synced)</span>`;

    const revertBtn = overridesCount > 0
      ? `<button id="btn-revert-prefab-overrides" class="btn-secondary-action" style="padding: 2px 6px; font-size: 0.68rem; margin-left: auto; color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);" title="Revert overridden properties back to prefab archetype values">↺ Revert</button>`
      : "";

    badgeEl.style.display = "flex";
    badgeEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <span style="color: #c084fc; font-weight: 600;">Prefab:</span>
        <span style="color: #e2e8f0; font-weight: 500;">${prefabName}</span>
        ${overridesBadge}
      </div>
      ${revertBtn}
    `;

    if (overridesCount > 0) {
      badgeEl.querySelector("#btn-revert-prefab-overrides")?.addEventListener("click", () => {
        if (!prefab) return;
        for (const propKey of e.overriddenProperties) {
          switch (propKey) {
            case "name": e.name = prefab.archetype.name; break;
            case "color": e.color = prefab.archetype.color; break;
            case "visualShape": e.visualShape = prefab.archetype.visualShape; break;
            case "mass":
              e.mass = prefab.archetype.mass;
              if (e.rigidbodyModule) e.rigidbodyModule.massProp.literalValue = prefab.archetype.mass;
              break;
            case "colliderRadius":
              e.colliderRadius = prefab.archetype.colliderRadius;
              if (e.colliderModule) e.colliderModule.radius = prefab.archetype.colliderRadius;
              break;
            case "consumable_totalEnergy":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.totalEnergyJoulesProp.literalValue = prefab.archetype.consumableModule.totalEnergyJoulesProp.literalValue;
              }
              break;
            case "consumable_consumeRate":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.consumeRateWattsProp.literalValue = prefab.archetype.consumableModule.consumeRateWattsProp.literalValue;
              }
              break;
            case "consumable_healRate":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.healRateProp.literalValue = prefab.archetype.consumableModule.healRateProp.literalValue;
              }
              break;
            case "consumable_tag":
              if (e.consumableModule && prefab.archetype.consumableModule) {
                e.consumableModule.tag = prefab.archetype.consumableModule.tag;
              }
              break;
          }
        }
        e.overriddenProperties.clear();
        this.renderEntityModules();
        this.syncEntitySliders();
        this.updatePrefabInfoBadge();
      });
    }
  }

  public renderScenePrefabs(): void {
    const listEl = this.container.querySelector("#scene-prefabs-list") as HTMLElement | null;
    const badgeEl = this.container.querySelector("#badge-prefabs-count") as HTMLElement | null;
    const allPrefabs = prefabManager.getAll();

    if (badgeEl) badgeEl.textContent = allPrefabs.length.toString();
    if (!listEl) return;

    if (allPrefabs.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.74rem; padding: 12px 0;">
          No scene prefabs created yet. Select any scene object and click "📦 Make Prefab".
        </div>
      `;
      return;
    }

    let html = "";
    const allTags = consumableTagRegistry.getAll();

    for (const prefab of allPrefabs) {
      const liveCount = this.objects.filter((o) => o.prefabId === prefab.id).length;
      const arc = prefab.archetype;
      const isConsumable = Boolean(arc.consumableModule);

      let tagOptionsHtml = "";
      for (const tagName of allTags) {
        const isSel = arc.consumableModule && arc.consumableModule.tag.toLowerCase() === tagName.toLowerCase() ? "selected" : "";
        tagOptionsHtml += `<option value="${tagName}" ${isSel}>${tagName}</option>`;
      }

      html += `
        <div class="behavior-card" data-prefab-card-id="${prefab.id}" style="border: 1px solid rgba(168, 85, 247, 0.35); background: rgba(30, 27, 75, 0.25); margin-bottom: 10px; border-radius: 6px; padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
              <span style="font-size: 1.0rem;">${prefab.icon}</span>
              <input class="dev-input input-prefab-name" data-prefab-id="${prefab.id}" value="${prefab.name}" style="flex: 1; padding: 3px 6px; font-weight: 600; font-size: 0.8rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 4px; color: #f1f5f9;" />
              <button class="prop-save-btn btn-save-prefab-name" data-prefab-id="${prefab.id}" title="Save Prefab Name directly to project" style="padding: 2px 6px;">💾</button>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;">
              <span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; font-size: 0.70rem;">${liveCount} live</span>
              <button class="btn-secondary-action btn-save-whole-prefab" data-prefab-id="${prefab.id}" style="padding: 3px 8px; font-size: 0.72rem; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" title="Save entire prefab archetype and live instances to project">💾 Save All</button>
              <button class="btn-secondary-action btn-spawn-prefab" data-prefab-id="${prefab.id}" style="padding: 3px 8px; font-size: 0.72rem; color: #c084fc; border-color: rgba(168, 85, 247, 0.4);" title="Spawn one instance on the arena floor">➕ Spawn</button>
              <button class="btn-icon-subtle btn-delete-prefab" data-prefab-id="${prefab.id}" style="color: #f87171; padding: 3px 6px; font-size: 0.8rem;" title="Delete Prefab (unlinks live instances)">🗑️</button>
            </div>
          </div>

          <!-- Prefab Archetype Settings -->
          <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(168, 85, 247, 0.15);">
            <div style="display: flex; gap: 6px; align-items: center;">
              <label style="font-size: 0.74rem; color: #94a3b8; flex: 0 0 45px;">Visual:</label>
              <input type="color" class="prefab-color-picker" data-prefab-id="${prefab.id}" value="${arc.color}" style="width: 28px; height: 22px; padding: 0; border: none; cursor: pointer; background: transparent; border-radius: 3px;" title="Archetype Color" />
              <button class="btn-secondary-action prefab-shape-toggle" data-prefab-id="${prefab.id}" style="padding: 2px 8px; font-size: 0.72rem; flex: 1;">
                ${arc.visualShape === "box" ? "Box 📦" : "Circle ⚪"}
              </button>
              <button class="prop-save-btn btn-save-prefab-visuals" data-prefab-id="${prefab.id}" title="Save Visual Appearance to project" style="padding: 2px 6px;">💾</button>
            </div>

            <div id="scrub-container-prefab-mass-${prefab.id}"></div>
            <div id="scrub-container-prefab-radius-${prefab.id}"></div>

            ${isConsumable ? `
              <div style="margin-top: 4px; padding-top: 6px; border-top: 1px dashed rgba(168, 85, 247, 0.2);">
                <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
                  <label style="font-size: 0.74rem; color: #f472b6; flex: 0 0 45px;">Tag:</label>
                  <select class="dev-select prefab-tag-select" data-prefab-id="${prefab.id}" style="flex: 1; padding: 2px 6px; font-size: 0.74rem;">
                    ${tagOptionsHtml}
                  </select>
                  <button class="prop-save-btn btn-save-prefab-tag" data-prefab-id="${prefab.id}" title="Save Tag to project" style="padding: 2px 6px;">💾</button>
                </div>
                <div id="scrub-container-prefab-energy-${prefab.id}"></div>
                <div id="scrub-container-prefab-rate-${prefab.id}"></div>
                <div id="scrub-container-prefab-heal-${prefab.id}"></div>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }

    listEl.innerHTML = html;

    // Mount scrubbers and wire events for each prefab card
    for (const prefab of allPrefabs) {
      const arc = prefab.archetype;

      // Mass Scrubber
      this.setupScrubber(`scrub-container-prefab-mass-${prefab.id}`, {
        label: "Mass (kg)",
        value: arc.mass,
        min: 0.1,
        max: 50.0,
        step: 0.1,
        decimals: 1,
        onChange: (val: number) => {
          prefab.setProperty("mass", val, this.objects);
          if (this.selectedEntity && this.selectedEntity.prefabId === prefab.id && !this.selectedEntity.overriddenProperties.has("mass")) {
            this.syncEntitySliders();
          }
        },
        onSave: (val: number) => this.savePrefabProperty(prefab, "mass", val, "Mass"),
      });

      // Radius Scrubber
      this.setupScrubber(`scrub-container-prefab-radius-${prefab.id}`, {
        label: "Collider Radius (u)",
        value: arc.colliderRadius,
        min: 0.05,
        max: 3.0,
        step: 0.02,
        decimals: 2,
        onChange: (val: number) => {
          prefab.setProperty("colliderRadius", val, this.objects);
          if (this.selectedEntity && this.selectedEntity.prefabId === prefab.id && !this.selectedEntity.overriddenProperties.has("colliderRadius")) {
            this.syncEntitySliders();
          }
        },
        onSave: (val: number) => this.savePrefabProperty(prefab, "colliderRadius", val, "Collider Radius"),
      });

      if (arc.consumableModule) {
        const cm = arc.consumableModule;
        // Energy Scrubber
        this.setupScrubber(`scrub-container-prefab-energy-${prefab.id}`, {
          label: "Energy Capacity (J)",
          value: cm.totalEnergyJoulesProp.literalValue,
          min: 10,
          max: 100000,
          step: 50,
          decimals: 0,
          onChange: (val: number) => {
            prefab.setProperty("consumable_totalEnergy", val, this.objects);
            if (this.selectedEntity && this.selectedEntity.prefabId === prefab.id && !this.selectedEntity.overriddenProperties.has("consumable_totalEnergy")) {
              this.renderEntityModules();
            }
          },
          onSave: (val: number) => this.savePrefabProperty(prefab, "consumable_totalEnergy", val, "Energy Capacity"),
        });

        // Rate Scrubber
        this.setupScrubber(`scrub-container-prefab-rate-${prefab.id}`, {
          label: "Consume Rate (W)",
          value: cm.consumeRateWattsProp.literalValue,
          min: 10,
          max: 2000,
          step: 10,
          decimals: 0,
          onChange: (val: number) => {
            prefab.setProperty("consumable_consumeRate", val, this.objects);
            if (this.selectedEntity && this.selectedEntity.prefabId === prefab.id && !this.selectedEntity.overriddenProperties.has("consumable_consumeRate")) {
              this.renderEntityModules();
            }
          },
          onSave: (val: number) => this.savePrefabProperty(prefab, "consumable_consumeRate", val, "Consume Rate"),
        });

        // Heal Rate Scrubber
        this.setupScrubber(`scrub-container-prefab-heal-${prefab.id}`, {
          label: "Heal Rate (HP/s)",
          value: cm.healRateProp.literalValue,
          min: 0,
          max: 100,
          step: 1,
          decimals: 1,
          onChange: (val: number) => {
            prefab.setProperty("consumable_healRate", val, this.objects);
            if (this.selectedEntity && this.selectedEntity.prefabId === prefab.id && !this.selectedEntity.overriddenProperties.has("consumable_healRate")) {
              this.renderEntityModules();
            }
          },
          onSave: (val: number) => this.savePrefabProperty(prefab, "consumable_healRate", val, "Heal Rate"),
        });
      }
    }

    // Wire Card Click Actions
    listEl.querySelectorAll(".input-prefab-name").forEach((input) => {
      input.addEventListener("change", (e) => {
        const pid = (input as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          p.name = (e.target as HTMLInputElement).value;
          p.archetype.name = p.name;
        }
      });
    });

    listEl.querySelectorAll(".btn-save-prefab-name").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const input = listEl.querySelector(`.input-prefab-name[data-prefab-id="${pid}"]`) as HTMLInputElement | null;
          if (input) {
            p.name = input.value;
            p.archetype.name = p.name;
          }
          await this.savePrefabProperty(p, "name", p.name, "Prefab Name");
        }
      });
    });

    listEl.querySelectorAll(".prefab-color-picker").forEach((picker) => {
      picker.addEventListener("input", (e) => {
        const pid = (picker as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const col = (e.target as HTMLInputElement).value;
          p.setProperty("color", col, this.objects);
          if (this.selectedEntity && this.selectedEntity.prefabId === pid && !this.selectedEntity.overriddenProperties.has("color")) {
            this.syncEntitySliders();
          }
        }
      });
    });

    listEl.querySelectorAll(".prefab-shape-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const newShape = p.archetype.visualShape === "box" ? "circle" : "box";
          p.setProperty("visualShape", newShape, this.objects);
          btn.textContent = newShape === "box" ? "Box 📦" : "Circle ⚪";
          if (this.selectedEntity && this.selectedEntity.prefabId === pid && !this.selectedEntity.overriddenProperties.has("visualShape")) {
            this.updateSelectorOptions();
          }
        }
      });
    });

    listEl.querySelectorAll(".btn-save-prefab-visuals").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          await this.savePrefab(p);
        }
      });
    });

    listEl.querySelectorAll(".prefab-tag-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const pid = (select as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          const newTag = (e.target as HTMLSelectElement).value;
          p.setProperty("consumable_tag", newTag, this.objects);
          if (this.selectedEntity && this.selectedEntity.prefabId === pid && !this.selectedEntity.overriddenProperties.has("consumable_tag")) {
            this.renderEntityModules();
          }
        }
      });
    });

    listEl.querySelectorAll(".btn-save-prefab-tag").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p && p.archetype.consumableModule) {
          await this.savePrefabProperty(p, "consumable_tag", p.archetype.consumableModule.tag, "Consumable Tag");
        }
      });
    });

    listEl.querySelectorAll(".btn-save-whole-prefab").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const p = prefabManager.get(pid);
        if (p) {
          await this.savePrefab(p);
        }
      });
    });

    listEl.querySelectorAll(".btn-spawn-prefab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        const pos = { x: this.arena.width / 2, y: this.arena.height / 2, z: 0 };
        const spawned = prefabManager.spawn(pid, pos, this.arena, this.objects);
        if (spawned) {
          if (!this.objects.includes(spawned)) {
            this.objects.push(spawned);
          }
          this.onSpawnObject(spawned);
          this.markDirty("objects", spawned);
          this.updateSelectorOptions();
          this.renderScenePrefabs();
        }
      });
    });

    listEl.querySelectorAll(".btn-delete-prefab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = (btn as HTMLElement).dataset.prefabId!;
        prefabManager.delete(pid, this.objects);
        this.renderScenePrefabs();
        this.updatePrefabInfoBadge();
      });
    });
  }

  public renderSceneSpawners(): void {
    const listEl = this.container.querySelector("#scene-spawners-list") as HTMLElement | null;
    const badgeEl = this.container.querySelector("#badge-spawners-count") as HTMLElement | null;
    const allSpawners = sceneSpawnerManager.getAll();
    const allPrefabs = prefabManager.getAll();

    if (badgeEl) badgeEl.textContent = allSpawners.length.toString();
    if (!listEl) return;

    if (allSpawners.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.74rem; padding: 12px 0;">
          No scene spawners. Click "+ Add Scene Spawner" above to create an automated background spawner.
        </div>
      `;
      return;
    }

    let html = "";
    for (const spawner of allSpawners) {
      let prefabOptsHtml = "";
      for (const p of allPrefabs) {
        const isSel = p.id === spawner.prefabId ? "selected" : "";
        prefabOptsHtml += `<option value="${p.id}" ${isSel}>${p.icon} ${p.name}</option>`;
      }
      if (allPrefabs.length === 0) {
        prefabOptsHtml = `<option value="">(No Prefabs Available)</option>`;
      }

      const activeCount = spawner.getActiveCount(this.objects);

      html += `
        <div class="behavior-card" data-spawner-card-id="${spawner.id}" style="border: 1px solid rgba(34, 197, 94, 0.35); background: rgba(20, 83, 45, 0.2); margin-bottom: 10px; border-radius: 6px; padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
              <input type="checkbox" class="spawner-enabled-toggle" data-spawner-id="${spawner.id}" ${spawner.enabled ? "checked" : ""} style="cursor: pointer;" title="Enable / Disable Spawner" />
              <input class="dev-input input-spawner-name" data-spawner-id="${spawner.id}" value="${spawner.name}" style="flex: 1; padding: 3px 6px; font-weight: 600; font-size: 0.8rem; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 4px; color: #f1f5f9;" />
            </div>
            <div style="display: flex; align-items: center; gap: 4px; margin-left: 8px;">
              <button class="btn-secondary-action btn-spawner-spawn-now" data-spawner-id="${spawner.id}" style="padding: 3px 8px; font-size: 0.72rem; color: #4ade80; border-color: rgba(34, 197, 94, 0.4);" title="Spawn an item at a random open floor location immediately">⚡ Spawn Now</button>
              <button class="btn-icon-subtle btn-delete-spawner" data-spawner-id="${spawner.id}" style="color: #f87171; padding: 3px 6px; font-size: 0.8rem;" title="Delete Spawner">🗑️</button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(34, 197, 94, 0.15);">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="font-size: 0.74rem; color: #94a3b8; flex: 0 0 55px;">Prefab:</label>
              <select class="dev-select spawner-prefab-select" data-spawner-id="${spawner.id}" style="flex: 1; padding: 2px 6px; font-size: 0.74rem;">
                ${prefabOptsHtml}
              </select>
            </div>

            <div id="scrub-container-spawner-interval-${spawner.id}"></div>
            <div id="scrub-container-spawner-max-${spawner.id}"></div>

            <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(34, 197, 94, 0.2); display: flex; justify-content: space-between; align-items: center;">
              <span>Scene Count: <strong id="spawner-active-count-${spawner.id}" style="color: #4ade80;">${activeCount} / ${spawner.maxCount}</strong></span>
              <span id="spawner-timer-${spawner.id}" style="color: #cbd5e1;"></span>
            </div>
          </div>
        </div>
      `;
    }

    listEl.innerHTML = html;

    for (const spawner of allSpawners) {
      // Interval Scrubber (Minutes per item)
      this.setupScrubber(`scrub-container-spawner-interval-${spawner.id}`, {
        label: `Interval (Minutes/item - ${Math.round(spawner.intervalMinutes * 60)}s)`,
        value: spawner.intervalMinutes,
        min: 0.02,
        max: 60.0,
        step: 0.05,
        decimals: 2,
        suffix: " min",
        onChange: (val: number) => {
          spawner.intervalMinutes = Math.max(0.01, val);
        },
      });

      // Max Count Scrubber
      this.setupScrubber(`scrub-container-spawner-max-${spawner.id}`, {
        label: "Max Items in Scene",
        value: spawner.maxCount,
        min: 1,
        max: 100,
        step: 1,
        decimals: 0,
        suffix: " items",
        onChange: (val: number) => {
          spawner.maxCount = Math.max(1, Math.round(val));
        },
      });
    }

    // Wire events
    listEl.querySelectorAll(".input-spawner-name").forEach((input) => {
      input.addEventListener("change", (e) => {
        const sid = (input as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) s.name = (e.target as HTMLInputElement).value;
      });
    });

    listEl.querySelectorAll(".spawner-enabled-toggle").forEach((toggle) => {
      toggle.addEventListener("change", (e) => {
        const sid = (toggle as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) s.enabled = (e.target as HTMLInputElement).checked;
      });
    });

    listEl.querySelectorAll(".spawner-prefab-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const sid = (select as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) s.prefabId = (e.target as HTMLSelectElement).value;
      });
    });

    listEl.querySelectorAll(".btn-spawner-spawn-now").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sid = (btn as HTMLElement).dataset.spawnerId!;
        const s = sceneSpawnerManager.get(sid);
        if (s) {
          const spawned = s.spawnNow(this.arena, this.objects, prefabManager);
          if (spawned) {
            this.onSpawnObject(spawned);
            this.updateSelectorOptions();
            this.renderScenePrefabs();
          }
        }
      });
    });

    listEl.querySelectorAll(".btn-delete-spawner").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sid = (btn as HTMLElement).dataset.spawnerId!;
        sceneSpawnerManager.delete(sid);
        this.renderSceneSpawners();
      });
    });
  }

  public updateSceneSpawnersTelemetry(): void {
    for (const spawner of sceneSpawnerManager.getAll()) {
      const activeEl = this.container.querySelector(`#spawner-active-count-${spawner.id}`);
      if (activeEl) {
        const count = spawner.getActiveCount(this.objects);
        activeEl.textContent = `${count} / ${spawner.maxCount}`;
      }

      const timerEl = this.container.querySelector(`#spawner-timer-${spawner.id}`) as HTMLElement | null;
      if (timerEl) {
        if (!spawner.enabled) {
          timerEl.textContent = "Disabled";
          timerEl.style.color = "#64748b";
        } else if (spawner.getActiveCount(this.objects) >= spawner.maxCount) {
          timerEl.textContent = "Max reached (paused)";
          timerEl.style.color = "#fbbf24";
        } else {
          const targetSec = spawner.intervalMinutes * 60;
          const leftSec = Math.max(0, targetSec - spawner.timerSeconds);
          timerEl.textContent = `Next in: ${leftSec.toFixed(1)}s`;
          timerEl.style.color = "#4ade80";
        }
      }
    }
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

  private setNestedProperty(target: any, path: string, value: any): void {
    const parts = path.split(".");
    let curr = target;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]] || typeof curr[parts[i]] !== "object") {
        curr[parts[i]] = {};
      }
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
  }

  public resolvePropertyPath(owner: GameObject, prop: DynamicProperty, label?: string): string {
    const isChar = owner instanceof Character || (owner as any).isCharacter;
    if (isChar) {
      const char = owner as Character;
      // Walking Module
      if (char.walkingModule) {
        if (prop === char.walkingModule.maxWalkForceProp) return "walkingModule.maxWalkForce";
        if (prop === char.walkingModule.maxWalkSpeedProp) return "walkingModule.maxWalkSpeed";
        if (prop === char.walkingModule.maxSprintSpeedProp) return "walkingModule.sprintSpeed";
        if (prop === char.walkingModule.maxWalkPowerProp || prop === char.walkingModule.walkPowerCapacityProp) return "walkingModule.maxWalkPower";
        if (prop === char.walkingModule.maxSprintPowerProp || prop === char.walkingModule.sprintPowerCapacityProp) return "walkingModule.maxSprintPower";
        if (prop === char.walkingModule.airFrictionProp) return "walkingModule.airFriction";
      }
      // Jump Module
      if (char.jumpModule) {
        if (prop === char.jumpModule.jumpStrengthProp) return "jumpModule.jumpImpulse";
        if (prop === char.jumpModule.maxInitialSpeedProp) return "jumpModule.maxInitialSpeed";
      }
      if (char.jumpPowerCapacityProp && prop === char.jumpPowerCapacityProp) {
        return "jumpModule.jumpPowerCapacity";
      }
      // Throw Module
      if (char.throwModule) {
        if (prop === char.throwModule.maxPowerProp) return "throwModule.throwPowerCapacity";
        if (prop === char.throwModule.maxThrowSpeedProp) return "throwModule.maxThrowSpeed";
        if (prop === char.throwModule.maxThrowHeightProp) return "throwModule.maxThrowHeight";
      }
      // Pickup Module
      if (char.pickupModule) {
        if (prop === char.pickupModule.pickupReachProp) return "pickupModule.pickupReach";
        if (prop === char.pickupModule.maxPowerProp) return "pickupModule.maxPower";
      }
      // Climbing Module
      if (char.climbingModule) {
        if (prop === char.climbingModule.maxClimbSpeedProp) return "climbingModule.climbSpeed";
        if (prop === char.climbingModule.maxPowerProp) return "climbingModule.maxPower";
        if (prop === char.climbingModule.maxAdhesionProp) return "climbingModule.maxAdhesion";
      }
      // Laser Module
      if (char.laserModule) {
        if (prop === char.laserModule.damageRateProp) return "laserModule.damageRate";
        if (prop === char.laserModule.thicknessProp) return "laserModule.thickness";
        if (prop === char.laserModule.maxPowerProp) return "laserModule.maxPower";
      }
      // Melee Module
      if (char.meleeModule) {
        if (prop === char.meleeModule.maxForceProp) return "meleeModule.impactForce";
        if (prop === char.meleeModule.maxPowerProp) return "meleeModule.maxPower";
        if (prop === char.meleeModule.punchFrequencyProp) return "meleeModule.punchFrequency";
        if (prop === char.meleeModule.reachProp) return "meleeModule.reach";
        if (prop === char.meleeModule.widthProp) return "meleeModule.width";
      }
      // Health Module
      if (char.healthModule) {
        if (prop === char.healthModule.maxHpProp) return "healthModule.maxHp";
        if (prop === char.healthModule.maxHealRateProp) return "healthModule.naturalHealRate";
        if (prop === char.healthModule.maxPowerProp) return "healthModule.maxPower";
      }
      // Energy Pool
      if (char.energyPool) {
        if (prop === char.energyPool.maxStaminaProp) return "energyPool.staminaCapacity";
        if (prop === char.energyPool.staminaRegenRateProp) return "energyPool.staminaRegenRate";
        if (prop === char.energyPool.maxEnergyProp) return "energyPool.energyPoolCapacity";
      }
      // Wall Edge Assist
      if (char.wallEdgeAssistModule) {
        if (prop === char.wallEdgeAssistModule.hangDistanceProp) return "wallEdgeAssistModule.hangDistance";
      }
      // Root Character properties
      if (char.strengthProp && prop === char.strengthProp) return "strength";
      if (char.colliderModule && prop === char.colliderModule.radiusProp) return "colliderRadius";
      if (char.rigidbodyModule && prop === char.rigidbodyModule.massProp) return "mass";
    }

    // Common GameObject properties
    if (owner.rigidbodyModule && prop === owner.rigidbodyModule.massProp) return "mass";
    if (owner.colliderModule && prop === owner.colliderModule.radiusProp) return "colliderRadius";
    if (owner.frictionModule) {
      if (prop === owner.frictionModule.staticFrictionProp) return "friction";
      if (prop === owner.frictionModule.dynamicFrictionProp) return "dynamicFriction";
    }
    if (owner.bounceModule && prop === owner.bounceModule.bounceModProp) return "restitution";
    if (owner.rollModule) {
      if (prop === owner.rollModule.rollResistanceProp) return "rollResistance";
      if (prop === owner.rollModule.bumpinessProp) return "bumpiness";
    }
    if (owner.consumableModule) {
      if (prop === owner.consumableModule.totalEnergyJoulesProp) return "consumableModule.totalEnergyJoules";
      if (prop === owner.consumableModule.remainingEnergyJoulesProp) return "consumableModule.remainingEnergyJoules";
      if (prop === owner.consumableModule.consumeRateWattsProp) return "consumableModule.consumeRateWatts";
      if (prop === owner.consumableModule.healRateProp) return "consumableModule.healRate";
    }
    if (owner.damageAuraModule) {
      if (prop === owner.damageAuraModule.damageRadiusProp) return "damageAuraModule.damageRadius";
      if (prop === owner.damageAuraModule.damageRateProp) return "damageAuraModule.damageRate";
    }
    if (owner.damageSolverModule) {
      if (prop === owner.damageSolverModule.impactSusceptibilityProp) return "damageSolverModule.impactSusceptibility";
      if (prop === owner.damageSolverModule.damageThresholdHpProp) return "damageSolverModule.minShockThreshold";
      if (prop === owner.damageSolverModule.selfImpactWeightProp) return "damageSolverModule.selfImpactWeight";
    }

    // If it has a referenceKey, use that
    if (prop.referenceKey && prop.referenceKey.trim().length > 0) {
      return prop.referenceKey.trim();
    }

    // Fallback: match by label
    if (label) {
      const l = label.trim().toLowerCase();
      if (l.includes("walk force")) return "walkingModule.maxWalkForce";
      if (l.includes("walk speed")) return "walkingModule.maxWalkSpeed";
      if (l.includes("sprint speed")) return "walkingModule.sprintSpeed";
      if (l.includes("walk power")) return "walkingModule.maxWalkPower";
      if (l.includes("sprint power")) return "walkingModule.maxSprintPower";
      if (l.includes("air control") || l.includes("walk in air")) return "walkingModule.walkInAir";
      if (l.includes("air fric")) return "walkingModule.airFriction";
      if (l.includes("can sprint")) return "walkingModule.canSprint";
      if (l.includes("jump impulse") || l.includes("jump strength")) return "jumpModule.jumpImpulse";
      if (l.includes("takeoff speed")) return "jumpModule.maxInitialSpeed";
      if (l.includes("jump power")) return "jumpModule.jumpPowerCapacity";
      if (l.includes("throw speed") || l.includes("throw force")) return "throwModule.maxThrowSpeed";
      if (l.includes("throw height")) return "throwModule.maxThrowHeight";
      if (l.includes("throw power") || l.includes("throw wattage")) return "throwModule.throwPowerCapacity";
      if (l.includes("pickup reach")) return "pickupModule.pickupReach";
      if (l.includes("pickup power")) return "pickupModule.maxPower";
      if (l.includes("climb speed")) return "climbingModule.climbSpeed";
      if (l.includes("climb power")) return "climbingModule.maxPower";
      if (l.includes("sideways climb") || l.includes("horizontal climb")) return "climbingModule.horizontalClimbMultiplier";
      if (l.includes("adhesion")) return "climbingModule.wallAdhesionRange";
      if (l.includes("laser max power") || l.includes("power rating")) return "laserModule.maxPower";
      if (l.includes("beam range") || l.includes("laser range")) return "laserModule.maxRange";
      if (l.includes("beam damage") || l.includes("laser damage")) return "laserModule.damageRate";
      if (l.includes("beam width") || l.includes("beam thickness") || l.includes("laser thickness")) return "laserModule.thickness";
      if (l.includes("punch force") || l.includes("attack force")) return "meleeModule.impactForce";
      if (l.includes("attack power") || l.includes("punch power") || l.includes("melee max power")) return "meleeModule.maxPower";
      if (l.includes("punch freq") || l.includes("attack freq")) return "meleeModule.punchFrequency";
      if (l.includes("punch reach") || l.includes("attack reach")) return "meleeModule.reach";
      if (l.includes("attack width") || l.includes("punch width")) return "meleeModule.width";
      if (l.includes("max hp") || l.includes("max health")) return "healthModule.maxHp";
      if (l.includes("heal rate") || l.includes("natural heal")) return "healthModule.naturalHealRate";
      if (l.includes("health power") || l.includes("heal power")) return "healthModule.maxPower";
      if (l.includes("stamina cap")) return "energyPool.staminaCapacity";
      if (l.includes("stamina regen")) return "energyPool.staminaRegenRate";
      if (l.includes("energy capacity") || l.includes("calorie")) return "energyPool.energyPoolCapacity";
      if (l.includes("max power out")) return "energyPool.maxPowerOutput";
      if (l.includes("edge assist") || l.includes("hang radius")) return "wallEdgeAssistModule.assistRadius";
      if (l.includes("mass")) return "mass";
      if (l.includes("strength")) return "strength";
      if (l.includes("collider radius")) return "colliderRadius";
      if (l.includes("friction")) return "friction";
      if (l.includes("bounciness") || l.includes("restitution")) return "restitution";
      if (l.includes("roll resist")) return "rollResistance";
    }

    return label || "prop";
  }

  private buildSinglePropertyPlayerDelta(propKey: string, value: any): SerializedCharacterConfig {
    const norm = (propKey || "").trim();
    let canonical = norm;
    // Map known non-dotted aliases to canonical dotted paths
    const aliasMap: Record<string, string> = {
      walkInAir: "walkingModule.walkInAir",
      "Air Control (Walk in Air)": "walkingModule.walkInAir",
      canSprint: "walkingModule.canSprint",
      "Can Sprint": "walkingModule.canSprint",
      "Can Sprint (Shift / Gamepad)": "walkingModule.canSprint",
      walkConsumesEnergy: "walkingModule.walkConsumesEnergy",
      "Walk Consumes Energy": "walkingModule.walkConsumesEnergy",
      walkAllowPartialPower: "walkingModule.walkAllowPartialPower",
      sprintConsumesEnergy: "walkingModule.sprintConsumesEnergy",
      "Sprint Consumes Energy": "walkingModule.sprintConsumesEnergy",
      sprintAllowPartialPower: "walkingModule.sprintAllowPartialPower",
      maxWalkForce: "walkingModule.maxWalkForce",
      walkForce: "walkingModule.maxWalkForce",
      "Max Walk Force (N)": "walkingModule.maxWalkForce",
      maxWalkSpeed: "walkingModule.maxWalkSpeed",
      walkSpeed: "walkingModule.maxWalkSpeed",
      "Max Walk Speed (u/s)": "walkingModule.maxWalkSpeed",
      sprintSpeed: "walkingModule.sprintSpeed",
      maxSprintSpeed: "walkingModule.sprintSpeed",
      "Max Sprint Speed (u/s)": "walkingModule.sprintSpeed",
      walkPowerCapacity: "walkingModule.maxWalkPower",
      maxWalkPower: "walkingModule.maxWalkPower",
      "Max Walk Power (Watts)": "walkingModule.maxWalkPower",
      sprintPowerCapacity: "walkingModule.maxSprintPower",
      maxSprintPower: "walkingModule.maxSprintPower",
      "Max Sprint Power (Watts)": "walkingModule.maxSprintPower",
      airFriction: "walkingModule.airFriction",
      jumpImpulse: "jumpModule.jumpImpulse",
      jumpStrength: "jumpModule.jumpImpulse",
      "Jump Impulse (N·s)": "jumpModule.jumpImpulse",
      "Jump Strength (N·s)": "jumpModule.jumpImpulse",
      maxInitialSpeed: "jumpModule.maxInitialSpeed",
      "Max Takeoff Speed (u/s)": "jumpModule.maxInitialSpeed",
      jumpPowerCapacity: "jumpModule.jumpPowerCapacity",
      maxJumpPower: "jumpModule.jumpPowerCapacity",
      "Max Jump Power (Watts)": "jumpModule.jumpPowerCapacity",
      jumpConsumesEnergy: "jumpModule.jumpConsumesEnergy",
      jumpAllowPartialPower: "jumpModule.jumpAllowPartialPower",
      throwForce: "throwModule.maxThrowSpeed",
      maxThrowSpeed: "throwModule.maxThrowSpeed",
      "Max Throw Speed (u/s)": "throwModule.maxThrowSpeed",
      maxThrowHeight: "throwModule.maxThrowHeight",
      "Max Throw Height (u)": "throwModule.maxThrowHeight",
      throwPowerCapacity: "throwModule.throwPowerCapacity",
      maxPower: "throwModule.throwPowerCapacity",
      maxThrowPower: "throwModule.throwPowerCapacity",
      throwWattage: "throwModule.throwPowerCapacity",
      "Max Throw Power (Watts)": "throwModule.throwPowerCapacity",
      throwConsumesEnergy: "throwModule.consumesEnergy",
      pickupReach: "pickupModule.pickupReach",
      "Pickup Reach (3D) (u)": "pickupModule.pickupReach",
      maxPickupPower: "pickupModule.maxPower",
      pickupPowerCapacity: "pickupModule.maxPower",
      "Max Pickup Power (Watts)": "pickupModule.maxPower",
      pickupConsumesEnergy: "pickupModule.consumesEnergy",
      pickupAllowPartialPower: "pickupModule.allowPartialPower",
      climbSpeed: "climbingModule.climbSpeed",
      "Max Climb Speed (u/s)": "climbingModule.climbSpeed",
      climbPowerCapacity: "climbingModule.maxPower",
      maxClimbPower: "climbingModule.maxPower",
      "Max Climb Power (Watts)": "climbingModule.maxPower",
      climbConsumesEnergy: "climbingModule.consumesEnergy",
      climbAllowPartialPower: "climbingModule.allowPartialPower",
      horizontalClimbMultiplier: "climbingModule.horizontalClimbMultiplier",
      wallAdhesionRange: "climbingModule.wallAdhesionRange",
      maxHp: "healthModule.maxHp",
      "Max Health (HP)": "healthModule.maxHp",
      naturalHealRate: "healthModule.naturalHealRate",
      "Natural Heal Rate (HP/s)": "healthModule.naturalHealRate",
      healthMaxPower: "healthModule.maxPower",
      healthConsumesEnergy: "healthModule.consumesEnergy",
      healthAllowPartialPower: "healthModule.allowPartialPower",
      laserMaxPower: "laserModule.maxPower",
      laserPowerCapacity: "laserModule.maxPower",
      laserMaxRange: "laserModule.maxRange",
      laserDamageRate: "laserModule.damageRate",
      laserThickness: "laserModule.thickness",
      laserAllowPartialPower: "laserModule.allowPartialPower",
      meleeImpactForce: "meleeModule.impactForce",
      meleeMaxPower: "meleeModule.maxPower",
      meleePunchFrequency: "meleeModule.punchFrequency",
      meleeReach: "meleeModule.reach",
      meleeWidth: "meleeModule.width",
      meleeAllowPartialPower: "meleeModule.allowPartialPower",
      staminaCapacity: "energyPool.staminaCapacity",
      "Stamina Capacity (J)": "energyPool.staminaCapacity",
      staminaRegenRate: "energyPool.staminaRegenRate",
      "Stamina Regen Rate (W)": "energyPool.staminaRegenRate",
      energyPoolCapacity: "energyPool.energyPoolCapacity",
      "Energy Pool (Calorie) Capacity (J)": "energyPool.energyPoolCapacity",
      maxPowerOutput: "energyPool.maxPowerOutput",
      assistRadius: "wallEdgeAssistModule.assistRadius",
    };

    if (aliasMap[norm]) {
      canonical = aliasMap[norm];
    }

    const res: any = {};
    if (canonical.includes(".")) {
      this.setNestedProperty(res, canonical, value);
    } else {
      res[canonical] = value;
    }
    return res;
  }

  public async saveIndividualProperty(owner: GameObject, prop: DynamicProperty, value: number, label?: string): Promise<void> {
    if (this.isOnlineLocked) {
      this.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const canonicalPath = this.resolvePropertyPath(owner, prop, label);
    const isChar = owner instanceof Character || (owner as any).isCharacter;
    if (isChar) {
      const char = owner as Character;
      // 1. Update player prefab archetype if prefab exists
      const playerPrefab = prefabManager.get("prefab_player");
      if (playerPrefab) {
        playerPrefab.setProperty(canonicalPath, value, this.getAllCharacters ? this.getAllCharacters() : [char]);
      }

      // 2. Persist ONLY targeted single property delta to worldConfig.json
      const playerDelta = this.buildSinglePropertyPlayerDelta(canonicalPath, value);
      const delta: WorldConfigDelta = {
        clientVersion: this.currentConfigVersion,
        sections: ["player"],
        player: playerDelta,
      };

      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta),
      });

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }
      const res = await resp.json();
      this.currentConfigVersion = res.version ?? (this.currentConfigVersion + 1);
      this.dirtyState.player = false;
      this.updateDirtyBadge();
      this.showSaveToast(`💾 Saved ${label || canonicalPath}: ${Number(value.toFixed(2))} to Player Prefab & Config`);
    } else {
      // Regular GameObject
      let affectedObjects: GameObject[] = [owner];
      let prefabsUpsert: SerializedPrefabConfig[] | undefined = undefined;
      const sections: ("objects" | "prefabs")[] = ["objects"];

      if (owner.prefabId) {
        const prefab = prefabManager.get(owner.prefabId);
        if (prefab) {
          prefab.setProperty(canonicalPath, value, this.objects);
          prefabsUpsert = [serializePrefab(prefab)];
          sections.push("prefabs");
          affectedObjects = this.objects.filter((o) => o.prefabId === owner.prefabId && !o.overriddenProperties.has(canonicalPath));
          if (!affectedObjects.includes(owner)) affectedObjects.push(owner);
        }
      }

      const delta: WorldConfigDelta = {
        clientVersion: this.currentConfigVersion,
        sections,
        objectsDelta: {
          upsert: affectedObjects.map(serializeGameObject),
        },
        prefabsDelta: prefabsUpsert ? { upsert: prefabsUpsert } : undefined,
      };

      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta),
      });

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`);
      }
      const res = await resp.json();
      this.currentConfigVersion = res.version ?? (this.currentConfigVersion + 1);
      for (const obj of affectedObjects) {
        this.dirtyState.modifiedObjects.delete(obj.id);
      }
      this.updateDirtyBadge();
      const instanceText = affectedObjects.length > 1 ? ` (${affectedObjects.length} instances)` : "";
      this.showSaveToast(`💾 Saved ${label || canonicalPath}: ${Number(value.toFixed(2))} to ${owner.name}${owner.prefabId ? " Prefab & Scene" : ""}${instanceText}`);
    }
  }

  public async saveIndividualToggle(
    owner: GameObject,
    keyPath: string,
    value: boolean,
    label: string,
    saveBtn?: HTMLButtonElement | null
  ): Promise<void> {
    if (this.isOnlineLocked) {
      this.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.5";
    }

    try {
      const isChar = owner instanceof Character || (owner as any).isCharacter;
      if (isChar) {
        const char = owner as Character;
        const playerPrefab = prefabManager.get("prefab_player");
        if (playerPrefab) {
          playerPrefab.setProperty(keyPath, value, this.getAllCharacters ? this.getAllCharacters() : [char]);
        }

        const playerDelta = this.buildSinglePropertyPlayerDelta(keyPath, value);
        const delta: WorldConfigDelta = {
          clientVersion: this.currentConfigVersion,
          sections: ["player"],
          player: playerDelta,
        };

        const resp = await fetch("/api/dev/save-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delta),
        });

        if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
        const res = await resp.json();
        this.currentConfigVersion = res.version ?? (this.currentConfigVersion + 1);
        this.dirtyState.player = false;
        this.updateDirtyBadge();
        this.showSaveToast(`💾 Saved ${label}: ${value ? "ON" : "OFF"} to Player Prefab & Config`);
      } else {
        let affectedObjects: GameObject[] = [owner];
        let prefabsUpsert: SerializedPrefabConfig[] | undefined = undefined;
        const sections: ("objects" | "prefabs")[] = ["objects"];

        if (owner.prefabId) {
          const prefab = prefabManager.get(owner.prefabId);
          if (prefab) {
            prefab.setProperty(keyPath, value, this.objects);
            prefabsUpsert = [serializePrefab(prefab)];
            sections.push("prefabs");
            affectedObjects = this.objects.filter((o) => o.prefabId === owner.prefabId && !o.overriddenProperties.has(keyPath));
            if (!affectedObjects.includes(owner)) affectedObjects.push(owner);
          }
        }
        const delta: WorldConfigDelta = {
          clientVersion: this.currentConfigVersion,
          sections,
          objectsDelta: {
            upsert: affectedObjects.map(serializeGameObject),
          },
          prefabsDelta: prefabsUpsert ? { upsert: prefabsUpsert } : undefined,
        };
        const resp = await fetch("/api/dev/save-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delta),
        });
        if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
        const res = await resp.json();
        this.currentConfigVersion = res.version ?? (this.currentConfigVersion + 1);
        for (const obj of affectedObjects) {
          this.dirtyState.modifiedObjects.delete(obj.id);
        }
        this.updateDirtyBadge();
        const instanceText = affectedObjects.length > 1 ? ` (${affectedObjects.length} instances)` : "";
        this.showSaveToast(`💾 Saved ${label}: ${value ? "ON" : "OFF"} to ${owner.name}${owner.prefabId ? " Prefab & Scene" : ""}${instanceText}`);
      }
    } catch (err: any) {
      console.error(`Failed to save toggle ${label}:`, err);
      this.showSaveToast(`❌ Failed to save ${label}: ${err.message || err}`, true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = "1";
      }
    }
  }

  public async savePrefabProperty(prefab: Prefab, propKey: string, value: any, label?: string): Promise<void> {
    if (this.isOnlineLocked) {
      this.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    prefab.setProperty(propKey, value, this.objects);
    const affectedObjects = this.objects.filter((o) => o.prefabId === prefab.id && !o.overriddenProperties.has(propKey));

    const delta: WorldConfigDelta = {
      clientVersion: this.currentConfigVersion,
      sections: ["prefabs", "objects"],
      prefabsDelta: {
        upsert: [serializePrefab(prefab)],
      },
      objectsDelta: {
        upsert: affectedObjects.map(serializeGameObject),
      },
    };

    const resp = await fetch("/api/dev/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta),
    });

    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }
    const res = await resp.json();
    this.currentConfigVersion = res.version ?? (this.currentConfigVersion + 1);
    for (const obj of affectedObjects) {
      this.dirtyState.modifiedObjects.delete(obj.id);
    }
    this.updateDirtyBadge();
    const valDisplay = typeof value === "number" ? Number(value.toFixed(2)) : value;
    this.showSaveToast(`💾 Saved ${label || propKey}: ${valDisplay} to ${prefab.name} Prefab & ${affectedObjects.length} live instance${affectedObjects.length === 1 ? "" : "s"}`);
  }

  public async savePrefab(prefab: Prefab): Promise<void> {
    if (this.isOnlineLocked) {
      this.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const affectedObjects = this.objects.filter((o) => o.prefabId === prefab.id);
    const delta: WorldConfigDelta = {
      clientVersion: this.currentConfigVersion,
      sections: ["prefabs", "objects"],
      prefabsDelta: {
        upsert: [serializePrefab(prefab)],
      },
      objectsDelta: {
        upsert: affectedObjects.map(serializeGameObject),
      },
    };

    const resp = await fetch("/api/dev/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delta),
    });

    if (!resp.ok) {
      throw new Error(`Server returned ${resp.status}`);
    }
    const res = await resp.json();
    this.currentConfigVersion = res.version ?? (this.currentConfigVersion + 1);
    for (const obj of affectedObjects) {
      this.dirtyState.modifiedObjects.delete(obj.id);
    }
    this.updateDirtyBadge();
    this.showSaveToast(`💾 Saved ${prefab.name} Prefab to Project & ${affectedObjects.length} live instances`);
  }

  public async saveProjectConfig(): Promise<void> {
    if (this.isOnlineLocked) {
      this.showSaveToast("🔒 DevTools save disabled in online mode", true);
      return;
    }

    const sections: ("arena" | "globalPhysics")[] = [];
    if (this.dirtyState.globalPhysics) sections.push("globalPhysics");
    if (this.dirtyState.arena) sections.push("arena");

    // If neither was marked dirty, save both explicitly
    if (sections.length === 0) {
      sections.push("arena", "globalPhysics");
    }

    const delta: WorldConfigDelta = {
      clientVersion: this.currentConfigVersion,
      sections,
    };

    if (sections.includes("globalPhysics")) {
      delta.globalPhysics = {
        gravity: this.arena.gravity,
        collisionDamageScale: GameObject.globalWorldCollisionDamageScale ?? 1.0,
      };
    }

    if (sections.includes("arena")) {
      const tileGrid: number[][] = [];
      for (let r = 0; r < this.arena.rows; r++) {
        tileGrid.push([...this.arena.tileGrid[r]]);
      }
      delta.arena = {
        width: this.arena.width,
        height: this.arena.height,
        wallHeight: this.arena.wallHeight,
        presetId: this.arena.currentPresetId,
        tileGrid,
      };
    }

    const btn = this.container.querySelector("#btn-save-project-config") as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "💾 Saving...";
    }

    try {
      const resp = await fetch("/api/dev/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(delta),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Server responded with status ${resp.status}`);
      }

      const res = await resp.json();
      this.currentConfigVersion = res.version ?? (this.currentConfigVersion + 1);

      this.dirtyState.globalPhysics = false;
      this.dirtyState.arena = false;
      this.updateDirtyBadge();

      if (btn) {
        btn.textContent = "✓ Saved Arena & Physics!";
        setTimeout(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "💾 Save Arena & Physics";
          }
        }, 1500);
      }

      this.showSaveToast(`💾 Saved Arena & Physics to project! (v${this.currentConfigVersion})`);
    } catch (err: any) {
      console.error("Failed to save project config:", err);
      this.showSaveToast(`❌ Failed to save: ${err.message || String(err)}`, true);
      alert("Failed to save project configuration:\n" + (err.message || String(err)));
      if (btn) {
        btn.disabled = false;
        btn.textContent = "💾 Save Arena & Physics";
      }
    }
  }

  public async reloadFromDisk(): Promise<void> {
    try {
      const resp = await fetch("/api/dev/world-config");
      if (!resp.ok) {
        throw new Error(`Failed to fetch world-config: ${resp.status}`);
      }
      const config: WorldConfig = await resp.json();

      if (config.arena) {
        this.arena.setStandardWallHeight(config.arena.wallHeight);
        if (config.arena.presetId && config.arena.presetId !== "custom") {
          const chars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
          this.arena.loadWallPreset(config.arena.presetId, [...chars, ...this.objects]);
        } else if (config.arena.tileGrid) {
          this.arena.tileGrid = config.arena.tileGrid.map((row) => [...row]);
          this.arena.rebuildWalls();
        }
        const chars = this.getAllCharacters ? this.getAllCharacters() : (this.character ? [this.character] : []);
        this.arena.syncEntitiesWithWalls([...chars, ...this.objects]);
        this.updateWallPresetUI();
      }

      if (config.globalPhysics) {
        this.arena.gravity = config.globalPhysics.gravity;
        GameObject.globalWorldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
        const loop = this.getGameLoop ? this.getGameLoop() : null;
        if (loop) {
          loop.worldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
        }
      }

      if (config.objects) {
        this.onClearObjects();
        for (const ser of config.objects) {
          const obj = deserializeGameObject(ser);
          this.onSpawnObject(obj);
        }
      }

      if (config.prefabs && Array.isArray(config.prefabs)) {
        prefabManager.loadFromConfig(config.prefabs);
        this.renderScenePrefabs();
      }

      this.currentConfigVersion = config.version;
      this.dirtyState.arena = false;
      this.dirtyState.globalPhysics = false;
      this.dirtyState.modifiedObjects.clear();
      this.dirtyState.deletedObjectIds.clear();

      this.updateDirtyBadge();
      this.updateSelectorOptions();
      this.renderEntityModules();
      this.syncEntitySliders();
      this.updateInspector();

      const popover = this.container.querySelector("#save-options-popover") as HTMLElement | null;
      if (popover) popover.style.display = "none";
    } catch (err: any) {
      console.error("Failed to reload config from disk:", err);
      alert("Failed to reload from disk:\n" + (err.message || String(err)));
    }
  }
}
