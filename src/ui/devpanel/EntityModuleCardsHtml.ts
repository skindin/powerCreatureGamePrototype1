import { Character, type CharacterRole } from "../../character/Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { DevPanel } from "../DevPanel.js";

/**
 * Isolated HTML renderer for Entity Behavior Cards and the "Add Behavior" catalog
 * in the DevPanel Inspector.
 */
export class EntityModuleCardsHtml {
  public static renderCardsAndCatalog(
    panel: DevPanel,
    e: GameObject,
    container: HTMLElement,
    addBtn: HTMLButtonElement,
    dropdown: HTMLElement
  ): void {
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

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
        <button class="btn-toggle-module ${isEnabled ? "active" : "disabled"}" data-module-id="${modId}" title="${isEnabled ? "Disable" : "Enable"} this behavior">
          ${isEnabled ? "✓ Enabled" : "✕ Disabled"}
        </button>
        <button class="btn-remove-module" data-module-id="${modId}" title="Remove behavior from object">✕ Remove</button>
      </div>
    `;

    const renderToggleRow = (checkboxId: string, label: string, isChecked: boolean, title: string = "Save setting to project") => {
      const saveBtnId = `btn-save-${checkboxId.replace(/^check-/, "")}`;
      return `
        <div class="toggle-row" style="margin-top: 5px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.8rem; color: #cbd5e1;">${label}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="checkbox" id="${checkboxId}" ${isChecked ? "checked" : ""}>
            <button type="button" class="prop-save-btn" id="${saveBtnId}" title="${title}">💾</button>
          </div>
        </div>
      `;
    };

    const isCollapsed = (id: string) => (panel as any).isSectionCollapsed(id);

    // 0. Character Module
    if (hasCharModule) {
      attachedCount++;
      const currentRole: CharacterRole = e.characterModule?.role ?? (char ? char.role : "local_player");
      html += `
        <div class="module-card ${!charModuleEnabled ? "module-disabled" : ""}" data-module-id="character">
          ${panel.renderModuleHeader("character", "👤 Character Module", renderToggleBtn("character", charModuleEnabled))}
          <div id="collapse-body-mod-character" style="display: ${isCollapsed("mod-character") ? "none" : "block"};">
          ${!charModuleEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Character Module is disabled</div>` : ""}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Classifies entity role: Local/Remote Player, Local/Remote AI, or Inert Dummy.
          </div>
          <div class="slider-group" style="margin-top: 6px;">
            <div class="slider-label">
              <span>Entity Role</span>
              <span id="badge-char-role" class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.68rem;">${currentRole.toUpperCase()}</span>
            </div>
            <select id="select-char-role" class="dev-select" style="width: 100%;">
              <option value="local_player" ${currentRole === "local_player" ? "selected" : ""}>Local Player (Human Keyboard/Gamepad)</option>
              <option value="local_ai" ${currentRole === "local_ai" ? "selected" : ""}>Local AI (Autonomous Bot)</option>
              <option value="remote_player" ${currentRole === "remote_player" ? "selected" : ""}>Remote Player (Network Client)</option>
              <option value="remote_ai" ${currentRole === "remote_ai" ? "selected" : ""}>Remote AI (Server Bot)</option>
              <option value="dummy" ${currentRole === "dummy" ? "selected" : ""}>Dummy (Inert Physical Target)</option>
            </select>
          </div>
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <button id="btn-open-character-controls" class="btn-secondary-action" type="button" style="width: 100%; padding: 6px 10px; font-weight: 600; font-size: 0.76rem; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.08); display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>🎮</span> Configure Controls Schema
            </button>
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
        : (!vertPosEnabled ? `<div class="module-dep-warning" style="margin-top: 4px;">⚠️ Inactive: Vertical Position behavior is disabled</div>` : "");

      html += `
        <div class="module-card ${!rbEnabled ? "module-disabled" : ""}" data-module-id="rigidbody">
          ${panel.renderModuleHeader("rigidbody", "⚙️ Rigidbody", renderToggleBtn("rigidbody", rbEnabled))}
          <div id="collapse-body-mod-rigidbody" style="display: ${isCollapsed("mod-rigidbody") ? "none" : "block"};">
          ${!rbEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Rigidbody behavior is disabled</div>` : ""}
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
              <option value="dynamic" ${e.collisionMode === "dynamic" ? "selected" : ""}>Dynamic (Follows Velocity)</option>
              <option value="discrete" ${e.collisionMode === "discrete" ? "selected" : ""}>Force Discrete</option>
              <option value="continuous" ${e.collisionMode === "continuous" ? "selected" : ""}>Force Continuous Swept</option>
            </select>
          </div>
          <div class="toggle-subrow" style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.8rem; color: #e2e8f0;">Vertical Velocity</label>
            <button id="toggle-mod-vert-vel" class="btn-toggle ${e.hasVerticalVelocity && vertPosEnabled ? "active" : ""}" ${!vertPosEnabled ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ""}>
              ${e.hasVerticalVelocity && vertPosEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
          ${vertPosWarning}
          <div id="group-mod-vert-vel" style="display: ${e.hasVerticalVelocity && vertPosEnabled ? "block" : "none"}; margin-top: 6px;">
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
        <div class="module-card ${!colEnabled ? "module-disabled" : ""}" data-module-id="collider">
          ${panel.renderModuleHeader("collider", "🛡️ Collider", renderToggleBtn("collider", colEnabled))}
          <div id="collapse-body-mod-collider" style="display: ${isCollapsed("mod-collider") ? "none" : "block"};">
          ${!colEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Collider behavior is disabled (passes through objects)</div>` : ""}
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
        : (!massEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Mass is zero or disabled</div>` : "");

      html += `
        <div class="module-card ${!fricEnabled ? "module-disabled" : ""}" data-module-id="friction">
          ${panel.renderModuleHeader("friction", "🛝 Friction", renderToggleBtn("friction", fricEnabled))}
          <div id="collapse-body-mod-friction" style="display: ${isCollapsed("mod-friction") ? "none" : "block"};">
          ${!fricEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Friction behavior is disabled</div>` : ""}
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
        : (!massEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Mass is zero or disabled</div>` : "");

      const bounceVertWarning = e.bounceModule?.verticalBounce && (!e.hasVerticalVelocity || !vertPosEnabled)
        ? `<div class="module-dep-warning">⚠️ Vertical bounce inactive without Vertical Velocity / Vertical Position</div>`
        : "";

      html += `
        <div class="module-card ${!bounceEnabled ? "module-disabled" : ""}" data-module-id="bounce">
          ${panel.renderModuleHeader("bounce", "🏀 Bounciness", renderToggleBtn("bounce", bounceEnabled))}
          <div id="collapse-body-mod-bounce" style="display: ${isCollapsed("mod-bounce") ? "none" : "block"};">
          ${!bounceEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Bounciness behavior is disabled</div>` : ""}
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
        <div class="module-card ${!vertPosEnabled ? "module-disabled" : ""}" data-module-id="verticalPosition">
          ${panel.renderModuleHeader("verticalPosition", "↕️ Vertical Position", renderToggleBtn("verticalPosition", vertPosEnabled))}
          <div id="collapse-body-mod-verticalPosition" style="display: ${isCollapsed("mod-verticalPosition") ? "none" : "block"};">
          ${!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : ""}
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
        : (!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : "");

      html += `
        <div class="module-card ${!gravEnabled ? "module-disabled" : ""}" data-module-id="gravity">
          ${panel.renderModuleHeader("gravity", "🪐 Gravity", renderToggleBtn("gravity", gravEnabled))}
          <div id="collapse-body-mod-gravity" style="display: ${isCollapsed("mod-gravity") ? "none" : "block"};">
          ${!gravEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Gravity behavior is disabled</div>` : ""}
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
        : (!fricEnabled ? `<div class="module-dep-warning">ℹ️ Spin not resisted: Friction behavior is disabled</div>` : "");

      html += `
        <div class="module-card ${!rollEnabled ? "module-disabled" : ""}" data-module-id="roll">
          ${panel.renderModuleHeader("roll", "🔄 Roll", renderToggleBtn("roll", rollEnabled))}
          <div id="collapse-body-mod-roll" style="display: ${isCollapsed("mod-roll") ? "none" : "block"};">
          ${!rollEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Roll behavior is disabled</div>` : ""}
          ${rollFricWarning}
          <div id="prop-socket-roll-resist"></div>
          ${renderToggleRow("check-roll-bumpy-enabled", "Bumpy Roll (Hop on Bumps)", Boolean(e.rollModule?.bumpyRollEnabled), "Save Bumpy Roll to project")}
          <div id="prop-socket-roll-bumpiness" style="display: ${e.rollModule?.bumpyRollEnabled ? "block" : "none"};"></div>
          </div>
        </div>
      `;
    }

    // Character Abilities
    if (isChar && char) {
      if (hasWalkingModule) {
        attachedCount++;
        const walkFricWarning = !hasFrictionModule
          ? `<div class="module-dep-warning">⚠️ Requires Friction behavior (feet slip without ground traction)</div>`
          : (!fricEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Friction behavior is disabled</div>` : "");

        const walkStrWarning = !char.hasStrength
          ? `<div class="module-dep-warning">⚠️ Requires Muscle Strength (cannot propel body)</div>`
          : "";

        html += `
          <div class="module-card ${!walkEnabled ? "module-disabled" : ""}" data-module-id="walking">
            ${panel.renderModuleHeader("walking", "🚶 Walking Ability", renderToggleBtn("walking", walkEnabled))}
            <div id="collapse-body-mod-walking" style="display: ${isCollapsed("mod-walking") ? "none" : "block"};">
            ${!walkEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Walking Ability is disabled</div>` : ""}
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
            <div id="field-walk-partial-power" style="display: ${char.walkingModule?.walkConsumesEnergy ? "block" : "none"}; padding-left: 8px;">
              ${renderToggleRow("check-walk-partial-power", "Allow Partial Power", Boolean(char.walkingModule?.walkAllowPartialPower), "Save Walk Partial Power to project")}
            </div>
            ${renderToggleRow("check-sprint-energy", "Sprint Consumes Energy", Boolean(char.walkingModule?.sprintConsumesEnergy), "Save Sprint Consumes Energy to project")}
            <div id="field-sprint-partial-power" style="display: ${char.walkingModule?.sprintConsumesEnergy ? "block" : "none"}; padding-left: 8px;">
              ${renderToggleRow("check-sprint-partial-power", "Allow Partial Power", Boolean(char.walkingModule?.sprintAllowPartialPower), "Save Sprint Partial Power to project")}
            </div>
            </div>
          </div>
        `;
      }

      if (hasPickupModule) {
        attachedCount++;
        html += `
          <div class="module-card ${!pickupEnabled ? "module-disabled" : ""}" data-module-id="pickup">
            ${panel.renderModuleHeader("pickup", "✋ Pickup Ability", renderToggleBtn("pickup", pickupEnabled))}
            <div id="collapse-body-mod-pickup" style="display: ${isCollapsed("mod-pickup") ? "none" : "block"};">
            ${!pickupEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Pickup Ability is disabled</div>` : ""}
            <div id="prop-socket-pickup-reach"></div>
            <div id="prop-socket-pickup-power-cap"></div>
            ${renderToggleRow("check-pickup-energy", "Consumes Energy", Boolean(char.pickupModule?.consumesEnergy), "Save Pickup Consumes Energy to project")}
            <div id="field-pickup-partial-power" style="display: ${char.pickupModule?.consumesEnergy ? "block" : "none"}; padding-left: 8px;">
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
          : "";

        html += `
          <div class="module-card ${!throwEnabled ? "module-disabled" : ""}" data-module-id="throw">
            ${panel.renderModuleHeader("throw", "🎯 Throw Ability", renderToggleBtn("throw", throwEnabled))}
            <div id="collapse-body-mod-throw" style="display: ${isCollapsed("mod-throw") ? "none" : "block"};">
            ${!throwEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Throw Ability is disabled</div>` : ""}
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
          : (!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : "");

        html += `
          <div class="module-card ${!jumpEnabled ? "module-disabled" : ""}" data-module-id="jump">
            ${panel.renderModuleHeader("jump", "🦘 Jump Ability", renderToggleBtn("jump", jumpEnabled))}
            <div id="collapse-body-mod-jump" style="display: ${isCollapsed("mod-jump") ? "none" : "block"};">
            ${!jumpEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Jump Ability is disabled</div>` : ""}
            ${jumpVertWarning}
            <div id="prop-socket-jump-strength"></div>
            <div id="prop-socket-jump-max-speed"></div>
            <div id="prop-socket-jump-power-cap"></div>
            ${renderToggleRow("check-jump-energy", "Consumes Energy", Boolean(char.jumpConsumesEnergy), "Save Jump Consumes Energy to project")}
            <div id="field-jump-partial-power" style="display: ${char.jumpConsumesEnergy ? "block" : "none"}; padding-left: 8px;">
              ${renderToggleRow("check-jump-partial-power", "Allow Partial Power", Boolean(char.jumpAllowPartialPower), "Save Jump Partial Power to project")}
            </div>
            </div>
          </div>
        `;
      }

      if (hasEdgeAssistModule) {
        attachedCount++;
        html += `
          <div class="module-card ${!edgeAssistEnabled ? "module-disabled" : ""}" data-module-id="wallEdgeAssist">
            ${panel.renderModuleHeader("wallEdgeAssist", "🛡️ Wall Edge Assist", renderToggleBtn("wallEdgeAssist", edgeAssistEnabled))}
            <div id="collapse-body-mod-wallEdgeAssist" style="display: ${isCollapsed("mod-wallEdgeAssist") ? "none" : "block"};">
            ${!edgeAssistEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Wall Edge Assist is disabled</div>` : ""}
            <div class="toggle-row" style="margin-bottom: 8px;">
              <label style="font-size: 0.8rem;">Prevent Walk-Off</label>
              <button id="toggle-edge-walkoff" class="btn-toggle ${char.wallEdgeAssistModule?.preventWalkOff ? "active" : ""}">
                ${char.wallEdgeAssistModule?.preventWalkOff ? "Active" : "Inactive"}
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
          : (!vertPosEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Vertical Position behavior is disabled</div>` : "");

        const climbStrWarning = !char.hasStrength
          ? `<div class="module-dep-warning">⚠️ Requires Muscle Strength to climb</div>`
          : "";

        html += `
          <div class="module-card ${!climbEnabled ? "module-disabled" : ""}" data-module-id="climbing">
            ${panel.renderModuleHeader("climbing", "🧗 Climbing Ability", renderToggleBtn("climbing", climbEnabled))}
            <div id="collapse-body-mod-climbing" style="display: ${isCollapsed("mod-climbing") ? "none" : "block"};">
            ${!climbEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Climbing Ability is disabled</div>` : ""}
            ${climbVertWarning}
            ${climbStrWarning}
            <div class="toggle-row" style="margin-bottom: 8px;">
              <label style="font-size: 0.8rem;">Sideways Climb</label>
              <button id="toggle-climb-sideways" class="btn-toggle ${char.climbingModule?.horizontalClimb ? "active" : ""}">
                ${char.climbingModule?.horizontalClimb ? "Active" : "Inactive"}
              </button>
            </div>
            <div id="prop-socket-climb-adhesion"></div>
            <div id="prop-socket-climb-speed"></div>
            <div id="prop-socket-climb-power-cap"></div>
            ${renderToggleRow("check-climb-energy", "Consumes Energy", Boolean(char.climbingModule?.consumesEnergy), "Save Climb Consumes Energy to project")}
            <div id="field-climb-partial-power" style="display: ${char.climbingModule?.consumesEnergy ? "block" : "none"}; padding-left: 8px;">
              ${renderToggleRow("check-climb-partial-power", "Allow Partial Power", Boolean(char.climbingModule?.allowPartialPower), "Save Climb Partial Power to project")}
            </div>
            </div>
          </div>
        `;
      }
    }

    // Health & Vitality Module
    if (hasHealthModule && e.healthModule) {
      attachedCount++;
      const hm = e.healthModule;
      html += `
        <div class="module-card ${!healthEnabled ? "module-disabled" : ""}" data-module-id="health">
          ${panel.renderModuleHeader("health", "❤️ Health & Vitality", renderToggleBtn("health", healthEnabled))}
          <div id="collapse-body-mod-health" style="display: ${isCollapsed("mod-health") ? "none" : "block"};">
          ${!healthEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Health & Vitality is disabled</div>` : ""}
          <div style="font-size: 0.78rem; color: #94a3b8; margin: 4px 0 6px 0; display: flex; justify-content: space-between;">
            <span>Current Status:</span>
            <span id="val-entity-health-status" style="font-family: monospace; font-weight: 600; color: ${hm.currentHp < hm.maxHp * 0.3 ? "#ef4444" : (hm.currentHp < hm.maxHp * 0.6 ? "#f59e0b" : "#22c55e")};">
              ${hm.currentHp.toFixed(1)} / ${hm.maxHp.toFixed(1)} HP (${((hm.currentHp / Math.max(0.1, hm.maxHp)) * 100).toFixed(0)}%)
            </span>
          </div>

          <div id="prop-socket-health-cur"></div>
          <div id="prop-socket-health-max"></div>
          <div id="prop-socket-health-healrate"></div>
          <div id="prop-socket-health-joulesperhp"></div>
          <div id="prop-socket-health-power-cap"></div>

          ${renderToggleRow("check-health-energy", "Healing Consumes Energy", Boolean(hm.consumesEnergy), "Save Healing Consumes Energy to project")}
          <div id="field-health-partial-power" style="display: ${hm.consumesEnergy ? "block" : "none"}; padding-left: 8px;">
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

    // Damage Aura Module
    if (hasDamageAuraModule && e.damageAuraModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!damageAuraEnabled ? "module-disabled" : ""}" data-module-id="damageAura">
          ${panel.renderModuleHeader("damageAura", "☣️ Damage Aura", renderToggleBtn("damageAura", damageAuraEnabled))}
          <div id="collapse-body-mod-damageAura" style="display: ${isCollapsed("mod-damageAura") ? "none" : "block"};">
          ${!damageAuraEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Damage Aura is disabled</div>` : ""}
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
        : "";
      html += `
        <div class="module-card ${!damageSolverEnabled ? "module-disabled" : ""}" data-module-id="damageSolver">
          ${panel.renderModuleHeader("damageSolver", "🛡️ Damage Solver & Armor", renderToggleBtn("damageSolver", damageSolverEnabled))}
          <div id="collapse-body-mod-damageSolver" style="display: ${isCollapsed("mod-damageSolver") ? "none" : "block"};">
          ${!damageSolverEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Damage Solver is disabled</div>` : ""}
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

    // Consume Module
    if (hasConsumeModule && char && char.consumeModule) {
      attachedCount++;
      html += `
        <div class="module-card ${!consumeEnabled ? "module-disabled" : ""}" data-module-id="consume">
          ${panel.renderModuleHeader("consume", "🍴 Consume Ability", renderToggleBtn("consume", consumeEnabled))}
          <div id="collapse-body-mod-consume" style="display: ${isCollapsed("mod-consume") ? "none" : "block"};">
          ${!consumeEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Item consumption is disabled</div>` : ""}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Governs this character's ability to consume physical items. The character will only consume held items whose tags match their accepted list.
          </div>

          <div id="prop-socket-consume-tags" style="margin-top: 6px;"></div>
          </div>
        </div>
      `;
    }

    // Laser Blast Module
    if (hasLaserModule && char && char.laserModule) {
      attachedCount++;
      const lm = char.laserModule;
      const curPower = lm.actualPowerWatts;
      const isFiring = lm.isFiring;
      const isAiming = lm.isAiming;
      const stateStr = isFiring ? "🔥 FIRING" : (isAiming ? "🎯 AIMING" : "💤 IDLE");
      const stateColor = isFiring ? "#f43f5e" : (isAiming ? "#06b6d4" : "#94a3b8");

      html += `
        <div class="module-card ${!laserEnabled ? "module-disabled" : ""}" data-module-id="laser">
          ${panel.renderModuleHeader("laser", "🔫 Laser Blast", renderToggleBtn("laser", laserEnabled))}
          <div id="collapse-body-mod-laser" style="display: ${isCollapsed("mod-laser") ? "none" : "block"};">
          ${!laserEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Laser ability is disabled</div>` : ""}
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

    // Melee Module
    if (hasMeleeModule && char && char.meleeModule) {
      attachedCount++;
      const mm = char.meleeModule;
      html += `
        <div class="module-card ${!meleeEnabled ? "module-disabled" : ""}" data-module-id="melee">
          ${panel.renderModuleHeader("melee", "🥊 Melee Attack", renderToggleBtn("melee", meleeEnabled))}
          <div id="collapse-body-mod-melee" style="display: ${isCollapsed("mod-melee") ? "none" : "block"};">
          ${!meleeEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Melee attack is disabled</div>` : ""}
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

    // Consumable Module
    if (hasConsumableModule && e.consumableModule) {
      attachedCount++;
      const cm = e.consumableModule;
      const curEnergy = cm.getRemainingEnergy(e.properties);
      const maxEnergy = cm.getTotalEnergy(e.properties);
      const consumablePct = maxEnergy > 0 ? Math.min(100, Math.max(0, (curEnergy / maxEnergy) * 100)) : 0;

      html += `
        <div class="module-card ${!consumableEnabled ? "module-disabled" : ""}" data-module-id="consumable">
          ${panel.renderModuleHeader("consumable", "🍎 Consumable", renderToggleBtn("consumable", consumableEnabled))}
          <div id="collapse-body-mod-consumable" style="display: ${isCollapsed("mod-consumable") ? "none" : "block"};">
          ${!consumableEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Consumable ingestion is disabled</div>` : ""}
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Consumable physical item. Characters with matching accepted tags can hold and consume this item to transfer energy and nutrients, shrinking until 100% consumed.
          </div>

          <div id="prop-socket-consumable-tag" style="margin-bottom: 6px;"></div>

          <div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">
            <label for="chk-consumable-unlimited" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; cursor: pointer;">
              ♾️ Unlimited Energy (KotH)
            </label>
            <input type="checkbox" id="chk-consumable-unlimited" ${cm.unlimited ? "checked" : ""} style="cursor: pointer; accent-color: #ec4899; width: 16px; height: 16px;" />
          </div>

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

    // Spawner Module
    if (hasSpawnerModule && e.spawnerModule) {
      attachedCount++;
      const sm = e.spawnerModule;

      html += `
        <div class="module-card ${!spawnerEnabled ? "module-disabled" : ""}" data-module-id="spawner">
          ${panel.renderModuleHeader("spawner", "📦 Spawner (Clone On Pickup)", renderToggleBtn("spawner", spawnerEnabled))}
          <div id="collapse-body-mod-spawner" style="display: ${isCollapsed("mod-spawner") ? "none" : "block"};">
          ${!spawnerEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Spawner replication is disabled</div>` : ""}
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

    // Energy Pool Module
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
        <div class="module-card ${!energyPoolEnabled ? "module-disabled" : ""}" data-module-id="energyPool">
          ${panel.renderModuleHeader("energyPool", "⚡ Energy Pool & Stamina", renderToggleBtn("energyPool", energyPoolEnabled))}
          <div id="collapse-body-mod-energyPool" style="display: ${isCollapsed("mod-energyPool") ? "none" : "block"};">
          ${!energyPoolEnabled ? `<div class="module-dep-warning">⚠️ Inactive: Energy Pool is disabled</div>` : ""}
          <div id="warn-energy-exhausted" class="module-dep-warning" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); display: ${ep.isExhausted ? "block" : "none"};">⚠️ Exhausted! Stamina depleted below recovery threshold (${(ep.recoveryThresholdRatio * 100).toFixed(0)}%)</div>
          <div style="font-size: 0.76rem; color: #94a3b8; margin: 4px 0 6px 0;">
            Consolidated biochemical energy store (Joules) and burst stamina. Food calories do not regenerate; burst stamina replenishes when resting.
          </div>

          <div style="margin: 6px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; color: #e2e8f0; margin-bottom: 2px;">
              <span>Caloric Energy Reservoir</span>
              <span id="label-energy-pool-status">${curEnergy.toFixed(0)} / ${maxEnergy.toFixed(0)} J (${energyPct.toFixed(0)}%)</span>
            </div>
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 4px; height: 10px; overflow: hidden;">
              <div id="bar-energy-pool-fill" style="background: linear-gradient(90deg, #ca8a04, #eab308); height: 100%; width: ${energyPct}%; transition: width 0.1s ease;"></div>
            </div>
          </div>

          <div style="margin: 6px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; color: #e2e8f0; margin-bottom: 2px;">
              <span>Stamina Reservoir</span>
              <span id="label-energy-stamina-status">${curStamina.toFixed(0)} / ${maxStamina.toFixed(0)} J (${staminaPct.toFixed(0)}%)</span>
            </div>
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; height: 10px; overflow: hidden;">
              <div id="bar-energy-stamina-fill" style="background: linear-gradient(90deg, #0284c7, #38bdf8); height: 100%; width: ${staminaPct}%; transition: width 0.1s ease;"></div>
            </div>
          </div>

          <div style="margin: 6px 0; padding: 4px 8px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; color: #94a3b8;">Current Power Draw:</span>
            <span id="label-energy-wattage" style="font-size: 0.82rem; font-weight: 700; color: ${curWatts > 0 ? "#38bdf8" : "#64748b"};">${curWatts.toFixed(0)} Watts</span>
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
            <input type="checkbox" id="check-energy-infinite" ${ep.infiniteEnergy ? "checked" : ""}>
          </div>
          <div class="toggle-row" style="margin-top: 4px; margin-bottom: 4px;">
            <span style="font-size: 0.8rem; color: #cbd5e1;">Debug Auto-Refill on Empty</span>
            <input type="checkbox" id="check-energy-autorefill" ${ep.debugAutoRefillOnEmpty ? "checked" : ""}>
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

    const unattached = allModules.filter((m) => !m.isAttached);

    if (unattached.length === 0) {
      addBtn.innerHTML = `<span>✓</span> All Behaviors Added`;
      addBtn.disabled = true;
      dropdown.style.display = "none";
      dropdown.innerHTML = "";
    } else {
      addBtn.innerHTML = `<span>➕</span> Add Behavior (${unattached.length} available)`;
      addBtn.disabled = false;
      dropdown.innerHTML = unattached
        .map(
          (m) => `
        <button class="add-behavior-item" data-module-id="${m.id}" type="button">
          <span class="add-behavior-item-icon">${m.icon}</span>
          <div style="display: flex; flex-direction: column; text-align: left;">
            <span style="font-weight: 600; font-size: 0.82rem; color: #e2e8f0;">${m.name}</span>
            <span class="add-behavior-item-desc">${m.description}</span>
          </div>
        </button>
      `
        )
        .join("");
    }
  }
}

