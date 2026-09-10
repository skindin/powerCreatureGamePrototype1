import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { WalkingModule } from "../character/WalkingModule.js";
import { PickupModule } from "../character/PickupModule.js";
import { ThrowModule } from "../character/ThrowModule.js";
import { RollModule } from "../engine/RollModule.js";

export class DevPanel {
  private container: HTMLElement;
  private character: Character;
  private arena: Arena;
  private objects: GameObject[];
  private onSpawnObject: (obj: GameObject) => void;
  private onClearObjects: () => void;

  public selectedEntity: GameObject;

  // Cached DOM elements
  private inspectorEl!: HTMLElement;
  private entitySelectorEl!: HTMLSelectElement;
  private characterSpecificControlsEl!: HTMLElement;

  constructor(options: {
    container: HTMLElement;
    character: Character;
    arena: Arena;
    objects: GameObject[];
    onSpawnObject: (obj: GameObject) => void;
    onClearObjects: () => void;
  }) {
    this.container = options.container;
    this.character = options.character;
    this.arena = options.arena;
    this.objects = options.objects;
    this.onSpawnObject = options.onSpawnObject;
    this.onClearObjects = options.onClearObjects;

    this.selectedEntity = this.character;

    this.renderPanel();
  }

  public setSelectedEntity(entity: GameObject): void {
    this.selectedEntity = entity;
    this.updateSelectorOptions();
    this.syncEntitySliders();
  }

  public updateSelectorOptions(): void {
    if (!this.entitySelectorEl) return;
    const currentId = this.selectedEntity.id;

    let html = `<option value="${this.character.id}" ${currentId === this.character.id ? "selected" : ""}>⭐ Player Character (${this.character.mass.toFixed(1)}kg)</option>`;
    for (const obj of this.objects) {
      const isSel = obj.id === currentId ? "selected" : "";
      const icon = obj.visualShape === "box" ? "📦" : "⚪";
      html += `<option value="${obj.id}" ${isSel}>${icon} ${obj.name} (${obj.mass}kg)</option>`;
    }
    this.entitySelectorEl.innerHTML = html;

    // Show/hide character-specific sliders if player is selected
    if (this.characterSpecificControlsEl) {
      this.characterSpecificControlsEl.style.display =
        this.selectedEntity === this.character ? "flex" : "none";
    }
  }

  private renderPanel(): void {
    this.container.innerHTML = `
      <div class="dev-panel-header">
        <h2>🛠️ Property & Physics Engine</h2>
        <span class="badge">1 Wall = 1 Unit</span>
      </div>

      <div class="dev-scrollable">
        <!-- Target Selection -->
        <div class="dev-section">
          <h3>🎯 Target Entity</h3>
          <select id="entity-selector" class="dev-select"></select>
          <p class="section-desc">Select an entity or right-click it in the arena to modify its live properties.</p>
        </div>

        <!-- Live Diagnostics Inspector -->
        <div class="dev-section">
          <h3>📊 Live Diagnostics (Units)</h3>
          <div id="dev-inspector" class="inspector-grid"></div>
        </div>

        <!-- Selected Entity Physical Properties -->
        <div class="dev-section">
          <h3>⚖️ Entity Physical Properties</h3>

          <div class="toggle-row">
            <label>Visual Shape</label>
            <button id="toggle-entity-shape" class="btn-toggle ${this.selectedEntity.visualShape === 'box' ? 'active' : ''}">${this.selectedEntity.visualShape === 'box' ? 'Box 📦' : 'Circle ⚪'}</button>
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Mass (kg)</span>
              <span id="val-entity-mass">${this.selectedEntity.mass.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-entity-mass" min="0.1" max="8.0" step="0.1" value="${this.selectedEntity.mass}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Collider Radius (u)</span>
              <span id="val-entity-radius">${this.selectedEntity.colliderRadius.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-radius" min="0.1" max="1.5" step="0.02" value="${this.selectedEntity.colliderRadius}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Bounciness (Bounce Mod)</span>
              <span id="val-entity-bounce">${(this.selectedEntity.bounceMod ?? 0).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-bounce" min="0" max="1.0" step="0.05" value="${this.selectedEntity.bounceMod ?? 0}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Static Friction Mod</span>
              <span id="val-entity-static-fric">${this.selectedEntity.staticGroundFrictionMod.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-static-fric" min="0" max="3.0" step="0.05" value="${this.selectedEntity.staticGroundFrictionMod}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Dynamic Friction Mod</span>
              <span id="val-entity-dynamic-fric">${this.selectedEntity.dynamicGroundFrictionMod.toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-dynamic-fric" min="0" max="3.0" step="0.05" value="${this.selectedEntity.dynamicGroundFrictionMod}">
          </div>

          <div class="slider-group" id="group-roll-resistance" style="display: ${this.selectedEntity.rollModule ? 'block' : 'none'};">
            <div class="slider-label">
              <span>Roll Resistance (u/s²)</span>
              <span id="val-entity-roll-resist">${(this.selectedEntity.rollModule?.rollResistance ?? 0.4).toFixed(2)}</span>
            </div>
            <input type="range" id="slide-entity-roll-resist" min="0.0" max="4.0" step="0.05" value="${this.selectedEntity.rollModule?.rollResistance ?? 0.4}">
          </div>
        </div>

        <!-- Character Specific Properties -->
        <div id="character-specific-controls" class="dev-section" style="display: flex; flex-direction: column; gap: 10px;">
          <h3>🏃 Character Abilities & Movement</h3>

          <div class="slider-group">
            <div class="slider-label">
              <span>Character Strength</span>
              <span id="val-strength">${this.character.strength.toFixed(1)}</span>
            </div>
            <input type="range" id="slide-strength" min="0.3" max="4.0" step="0.1" value="${this.character.strength}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Max Walk Force (N)</span>
              <span id="val-walk-force">${(this.character.walkingModule?.maxWalkForce ?? 50.0).toFixed(0)}</span>
            </div>
            <input type="range" id="slide-walk-force" min="10" max="200" step="5" value="${this.character.walkingModule?.maxWalkForce ?? 50.0}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Max Walk Speed Cap (u/s)</span>
              <span id="val-walk-speed">${(this.character.walkingModule?.maxWalkSpeed ?? 5.2).toFixed(1)}</span>
            </div>
            <input type="range" id="slide-walk-speed" min="1.0" max="15.0" step="0.2" value="${this.character.walkingModule?.maxWalkSpeed ?? 5.2}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Pickup Reach (u)</span>
              <span id="val-pickup-reach">${(this.character.pickupModule?.pickupReach ?? 1.3).toFixed(1)}</span>
            </div>
            <input type="range" id="slide-pickup-reach" min="0.4" max="3.5" step="0.1" value="${this.character.pickupModule?.pickupReach ?? 1.3}">
          </div>

          <div class="slider-group">
            <div class="slider-label">
              <span>Base Throw Power (u/s)</span>
              <span id="val-throw-force">${(this.character.throwModule?.baseThrowForce ?? 7.6).toFixed(1)}</span>
            </div>
            <input type="range" id="slide-throw-force" min="2.0" max="25.0" step="0.5" value="${this.character.throwModule?.baseThrowForce ?? 7.6}">
          </div>
        </div>

        <!-- World & Arena Physics -->
        <div class="dev-section">
          <h3>🌍 World & Arena Properties (Units)</h3>

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

        <!-- Modular Capabilities Toggles -->
        <div class="dev-section">
          <h3>🧩 Modular Capabilities</h3>
          <p class="section-desc">Attach or detach modules to verify isolated mechanics.</p>
          
          <div class="toggle-row">
            <label>Walking Function</label>
            <button id="toggle-walk" class="btn-toggle active">Attached</button>
          </div>

          <div class="toggle-row">
            <label>Pickup Ability</label>
            <button id="toggle-pickup" class="btn-toggle active">Attached</button>
          </div>

          <div class="toggle-row">
            <label>Throw Ability</label>
            <button id="toggle-throw" class="btn-toggle active">Attached</button>
          </div>

          <div class="toggle-row">
            <label>Roll Behavior</label>
            <button id="toggle-roll" class="btn-toggle ${this.selectedEntity.rollModule?.enabled ? 'active' : ''}">${this.selectedEntity.rollModule?.enabled ? 'Attached' : 'Detached'}</button>
          </div>
        </div>

        <!-- Spawner -->
        <div class="dev-section">
          <h3>📦 Spawn Objects</h3>
          <div class="spawner-buttons">
            <button id="btn-spawn-light" class="btn-action">Spawn Light Box (0.7kg, Blue Box)</button>
            <button id="btn-spawn-heavy" class="btn-action">Spawn Heavy Box (2.6kg, Red Box)</button>
            <button id="btn-spawn-bouncy" class="btn-action">Spawn Bouncy Ball (0.5kg, Bounce 0.88)</button>
            <button id="btn-spawn-rolling" class="btn-action">Spawn Rolling Ball (0 Resistance)</button>
            <button id="btn-clear-entities" class="btn-danger">Clear All Objects</button>
          </div>
        </div>
      </div>
    `;

    this.inspectorEl = this.container.querySelector("#dev-inspector")!;
    this.entitySelectorEl = this.container.querySelector("#entity-selector")!;
    this.characterSpecificControlsEl = this.container.querySelector("#character-specific-controls")!;

    this.updateSelectorOptions();
    this.bindEvents();
  }

  public syncEntitySliders(): void {
    const e = this.selectedEntity;

    this.setSliderVal("slide-entity-mass", "val-entity-mass", e.mass, 1);
    this.setSliderVal("slide-entity-radius", "val-entity-radius", e.colliderRadius, 2);
    this.setSliderVal("slide-entity-bounce", "val-entity-bounce", e.bounceMod ?? 0, 2);
    this.setSliderVal("slide-entity-static-fric", "val-entity-static-fric", e.staticGroundFrictionMod, 2);
    this.setSliderVal("slide-entity-dynamic-fric", "val-entity-dynamic-fric", e.dynamicGroundFrictionMod, 2);

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

    const btnRoll = this.container.querySelector("#toggle-roll") as HTMLButtonElement;
    const grpRoll = this.container.querySelector("#group-roll-resistance") as HTMLElement;
    if (btnRoll) {
      if (e.rollModule && e.rollModule.enabled) {
        btnRoll.textContent = "Attached";
        btnRoll.classList.add("active");
        if (grpRoll) grpRoll.style.display = "block";
      } else {
        btnRoll.textContent = "Detached";
        btnRoll.classList.remove("active");
        if (grpRoll) grpRoll.style.display = "none";
      }
    }
    if (e.rollModule) {
      this.setSliderVal("slide-entity-roll-resist", "val-entity-roll-resist", e.rollModule.rollResistance, 2);
    }

    if (e === this.character) {
      this.setSliderVal("slide-strength", "val-strength", this.character.strength, 1);
      if (this.character.walkingModule) {
        this.setSliderVal("slide-walk-force", "val-walk-force", this.character.walkingModule.maxWalkForce, 0);
        this.setSliderVal("slide-walk-speed", "val-walk-speed", this.character.walkingModule.maxWalkSpeed, 1);
      }
      if (this.character.pickupModule) {
        this.setSliderVal("slide-pickup-reach", "val-pickup-reach", this.character.pickupModule.pickupReach, 1);
      }
      if (this.character.throwModule) {
        this.setSliderVal("slide-throw-force", "val-throw-force", this.character.throwModule.baseThrowForce, 1);
      }
    }
  }

  private setSliderVal(sliderId: string, labelId: string, val: number, decimals: number): void {
    const slider = this.container.querySelector(`#${sliderId}`) as HTMLInputElement;
    const label = this.container.querySelector(`#${labelId}`) as HTMLElement;
    if (slider) slider.value = val.toString();
    if (label) label.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  }

  private bindEvents(): void {
    // 1. Selector Change
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
    });

    // 2. Selected Entity Sliders
    this.setupSlider("slide-entity-mass", "val-entity-mass", (val) => {
      this.selectedEntity.mass = val;
    }, 1);

    this.setupSlider("slide-entity-radius", "val-entity-radius", (val) => {
      this.selectedEntity.colliderRadius = val;
    }, 2);

    this.setupSlider("slide-entity-bounce", "val-entity-bounce", (val) => {
      this.selectedEntity.bounceMod = val <= 0.01 ? null : val;
    }, 2);

    this.setupSlider("slide-entity-static-fric", "val-entity-static-fric", (val) => {
      this.selectedEntity.staticGroundFrictionMod = val;
    }, 2);

    this.setupSlider("slide-entity-dynamic-fric", "val-entity-dynamic-fric", (val) => {
      this.selectedEntity.dynamicGroundFrictionMod = val;
    }, 2);

    this.setupSlider("slide-entity-roll-resist", "val-entity-roll-resist", (val) => {
      if (this.selectedEntity.rollModule) {
        this.selectedEntity.rollModule.rollResistance = val;
      }
    }, 2);

    // 3. Character Specific Sliders
    this.setupSlider("slide-strength", "val-strength", (val) => {
      this.character.strength = val;
    }, 1);

    this.setupSlider("slide-walk-force", "val-walk-force", (val) => {
      if (this.character.walkingModule) {
        this.character.walkingModule.maxWalkForce = val;
      }
    }, 0);

    this.setupSlider("slide-walk-speed", "val-walk-speed", (val) => {
      if (this.character.walkingModule) {
        this.character.walkingModule.maxWalkSpeed = val;
      }
    }, 1);

    this.setupSlider("slide-pickup-reach", "val-pickup-reach", (val) => {
      if (this.character.pickupModule) {
        this.character.pickupModule.pickupReach = val;
      }
    }, 1);

    this.setupSlider("slide-throw-force", "val-throw-force", (val) => {
      if (this.character.throwModule) {
        this.character.throwModule.baseThrowForce = val;
      }
    }, 1);

    // 4. World Physics Sliders
    this.setupSlider("slide-gravity", "val-gravity", (val) => {
      this.arena.gravity = val;
    }, 1);

    this.setupSlider("slide-wall-height", "val-wall-height", (val) => {
      this.arena.setStandardWallHeight(val);
    }, 1);

    this.setupSlider("slide-friction", "val-friction", (val) => {
      this.arena.frictionCoeff = val;
    }, 1);

    this.setupSlider("slide-static-thresh", "val-static-thresh", (val) => {
      this.arena.staticFrictionThreshold = val;
    }, 2);

    // 5. Module Toggles
    const btnWalk = this.container.querySelector("#toggle-walk") as HTMLButtonElement;
    btnWalk.addEventListener("click", () => {
      if (this.character.walkingModule) {
        this.character.walkingModule = null;
        btnWalk.textContent = "Detached";
        btnWalk.classList.remove("active");
      } else {
        this.character.walkingModule = new WalkingModule();
        btnWalk.textContent = "Attached";
        btnWalk.classList.add("active");
      }
    });

    const btnPickup = this.container.querySelector("#toggle-pickup") as HTMLButtonElement;
    btnPickup.addEventListener("click", () => {
      if (this.character.pickupModule) {
        this.character.pickupModule = null;
        btnPickup.textContent = "Detached";
        btnPickup.classList.remove("active");
      } else {
        this.character.pickupModule = new PickupModule();
        btnPickup.textContent = "Attached";
        btnPickup.classList.add("active");
      }
    });

    const btnThrow = this.container.querySelector("#toggle-throw") as HTMLButtonElement;
    btnThrow.addEventListener("click", () => {
      if (this.character.throwModule) {
        this.character.throwModule = null;
        btnThrow.textContent = "Detached";
        btnThrow.classList.remove("active");
      } else {
        this.character.throwModule = new ThrowModule();
        btnThrow.textContent = "Attached";
        btnThrow.classList.add("active");
      }
    });

    const btnShapeToggle = this.container.querySelector("#toggle-entity-shape") as HTMLButtonElement;
    btnShapeToggle?.addEventListener("click", () => {
      if (this.selectedEntity.visualShape === "box") {
        this.selectedEntity.visualShape = "circle";
        btnShapeToggle.textContent = "Circle ⚪";
        btnShapeToggle.classList.remove("active");
      } else {
        this.selectedEntity.visualShape = "box";
        btnShapeToggle.textContent = "Box 📦";
        btnShapeToggle.classList.add("active");
      }
      this.updateSelectorOptions();
    });

    const btnRollToggle = this.container.querySelector("#toggle-roll") as HTMLButtonElement;
    btnRollToggle?.addEventListener("click", () => {
      const grpRoll = this.container.querySelector("#group-roll-resistance") as HTMLElement;
      if (this.selectedEntity.rollModule) {
        this.selectedEntity.rollModule = null;
        btnRollToggle.textContent = "Detached";
        btnRollToggle.classList.remove("active");
        if (grpRoll) grpRoll.style.display = "none";
      } else {
        this.selectedEntity.rollModule = new RollModule({ rollResistance: 0.4 });
        btnRollToggle.textContent = "Attached";
        btnRollToggle.classList.add("active");
        if (grpRoll) grpRoll.style.display = "block";
        this.setSliderVal("slide-entity-roll-resist", "val-entity-roll-resist", 0.4, 2);
      }
    });

    // 6. Spawners in Units
    this.container.querySelector("#btn-spawn-light")?.addEventListener("click", () => {
      const stone = new GameObject({
        name: "Light Blue Box",
        position: {
          x: this.character.position.x + (Math.random() * 2.0 - 1.0),
          y: this.character.position.y + (Math.random() * 2.0 - 1.0),
          z: 0.4,
        },
        mass: 0.7,
        colliderRadius: 0.26,
        color: "#38bdf8",
        bounceMod: 0.25,
        visualShape: "box",
      });
      this.onSpawnObject(stone);
      this.setSelectedEntity(stone);
    });

    this.container.querySelector("#btn-spawn-heavy")?.addEventListener("click", () => {
      const boulder = new GameObject({
        name: "Heavy Red Box",
        position: {
          x: this.character.position.x + (Math.random() * 2.0 - 1.0),
          y: this.character.position.y + (Math.random() * 2.0 - 1.0),
          z: 0,
        },
        mass: 2.6,
        colliderRadius: 0.40,
        color: "#f87171",
        bounceMod: 0.05,
        visualShape: "box",
      });
      this.onSpawnObject(boulder);
      this.setSelectedEntity(boulder);
    });

    this.container.querySelector("#btn-spawn-bouncy")?.addEventListener("click", () => {
      const ball = new GameObject({
        name: "Super Bouncy Ball",
        position: {
          x: this.character.position.x + (Math.random() * 2.0 - 1.0),
          y: this.character.position.y + (Math.random() * 2.0 - 1.0),
          z: 0.7,
        },
        mass: 0.5,
        colliderRadius: 0.24,
        color: "#4ade80",
        bounceMod: 0.88,
        verticalVelocity: 1.6,
      });
      this.onSpawnObject(ball);
      this.setSelectedEntity(ball);
    });

    this.container.querySelector("#btn-spawn-rolling")?.addEventListener("click", () => {
      const rollBall = new GameObject({
        name: "Rolling Ball (0 Resistance)",
        position: {
          x: this.character.position.x + 1.2,
          y: this.character.position.y,
          z: 0.0,
        },
        velocity: {
          x: 4.5,
          y: 1.5,
        },
        mass: 0.6,
        colliderRadius: 0.28,
        color: "#a855f7",
        bounceMod: 0.95,
        rollModule: new RollModule({
          rollResistance: 0.0,
          angularVelocity: { x: -1.5 / 0.28, y: 4.5 / 0.28, z: 0 },
        }),
      });
      this.onSpawnObject(rollBall);
      this.setSelectedEntity(rollBall);
    });

    this.container.querySelector("#btn-clear-entities")?.addEventListener("click", () => {
      this.onClearObjects();
      this.setSelectedEntity(this.character);
    });
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

  /**
   * Called every frame to display live stats of the selected entity in the inspector
   */
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
        <span class="inspect-k">Speed</span>
        <span class="inspect-v">${speed} u/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Bounce Mod</span>
        <span class="inspect-v">${e.bounceMod !== null ? e.bounceMod.toFixed(2) : 'None'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Static / Dyn Fric</span>
        <span class="inspect-v">${e.staticGroundFrictionMod.toFixed(2)} / ${e.dynamicGroundFrictionMod.toFixed(2)}</span>
      </div>
      ${e.rollModule && e.rollModule.enabled ? `
      <div class="inspect-item">
        <span class="inspect-k">3D Angular Vel</span>
        <span class="inspect-v highlight-z">(${e.rollModule.angularVelocity.x.toFixed(1)}, ${e.rollModule.angularVelocity.y.toFixed(1)}, ${e.rollModule.angularVelocity.z.toFixed(1)}) rad/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Vertical Spin (ωz)</span>
        <span class="inspect-v ${Math.abs(e.rollModule.angularVelocity.z) > 0.05 ? 'highlight-z' : ''}">${e.rollModule.angularVelocity.z.toFixed(2)} rad/s ${e.rollModule.angularVelocity.z > 0.05 ? '↑ Upward' : e.rollModule.angularVelocity.z < -0.05 ? '↓ Downward' : '(Flat)'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Roll Resistance</span>
        <span class="inspect-v ${e.rollModule.rollResistance === 0 ? 'highlight-held' : ''}">${e.rollModule.rollResistance.toFixed(2)} u/s² ${e.rollModule.rollResistance === 0 ? '(0 = Infinite Roll)' : ''}</span>
      </div>
      ` : ''}
      ${isChar ? `
      <div class="inspect-item">
        <span class="inspect-k">Base / Total Mass</span>
        <span class="inspect-v ${this.character.heldObject ? 'highlight-held' : ''}">${this.character.baseMass.toFixed(1)}kg ${this.character.heldObject ? `(+${this.character.heldObject.mass.toFixed(1)}kg = ${this.character.mass.toFixed(1)}kg)` : ''}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Walk Force / Speed Cap</span>
        <span class="inspect-v">${(this.character.walkingModule?.maxWalkForce ?? 50).toFixed(0)} N / ${(this.character.walkingModule?.maxWalkSpeed ?? 5.2).toFixed(1)} u/s</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Facing Angle</span>
        <span class="inspect-v">${Math.round((this.character.facingAngle * 180) / Math.PI)}°</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Held Freebody</span>
        <span class="inspect-v ${this.character.heldObject ? 'highlight-held' : ''}">${this.character.heldObject ? `${this.character.heldObject.name} (${this.character.heldObject.mass}kg)` : 'None'}</span>
      </div>
      ` : `
      <div class="inspect-item">
        <span class="inspect-k">Visual Shape</span>
        <span class="inspect-v ${e.visualShape === 'box' ? 'highlight-held' : ''}">${e.visualShape === 'box' ? 'Box 📦 (Circle Collider)' : 'Circle ⚪'}</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Mass</span>
        <span class="inspect-v">${e.mass.toFixed(1)} kg</span>
      </div>
      <div class="inspect-item">
        <span class="inspect-k">Radius</span>
        <span class="inspect-v">${e.colliderRadius.toFixed(2)} u</span>
      </div>
      `}
    `;
  }
}
