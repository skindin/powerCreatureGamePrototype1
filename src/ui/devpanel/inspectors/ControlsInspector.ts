import type { Character } from "../../../character/Character.js";
import type { DevPanel } from "../../DevPanel.js";
import type {
  ControlSchema,
  ControlRule,
  DeviceChannel,
  LocomotionParadigm,
  AimingParadigm,
  ConditionType,
  TriggerMode,
} from "../../../input/schema/ControlSchemaTypes.js";
import {
  DefaultControlSchema,
  BuiltinControlSchemas,
} from "../../../input/schema/presets/DefaultControlSchemas.js";
import { ControlActionCatalog } from "../../../input/schema/ControlActionCatalog.js";

export class ControlsInspector {
  private static activeSchemaMap: Map<string, ControlSchema> = new Map();
  private static activeTab: DeviceChannel = "keyboardMouse";
  private static listeningRuleId: string | null = null;
  private static listeningForwardTrigger: boolean = false;
  private static recorderCleanup: (() => void) | null = null;

  public static getActiveSchema(char: Character): ControlSchema {
    let schema = this.activeSchemaMap.get(char.id);
    if (!schema) {
      // Default to cloned deep copy of DefaultControlSchema
      schema = JSON.parse(JSON.stringify(DefaultControlSchema));
      this.activeSchemaMap.set(char.id, schema!);
    }
    return schema!;
  }

  public static setActiveSchema(char: Character, schema: ControlSchema): void {
    const cloned = JSON.parse(JSON.stringify(schema));
    this.activeSchemaMap.set(char.id, cloned);
  }

  public static notifyRuleFired(ruleId: string): void {
    const card = document.getElementById(`rule-card-${ruleId}`);
    if (card) {
      card.style.borderColor = "#38bdf8";
      card.style.boxShadow = "0 0 8px rgba(56, 189, 248, 0.6)";
      setTimeout(() => {
        if (card) {
          card.style.borderColor = "rgba(255, 255, 255, 0.08)";
          card.style.boxShadow = "none";
        }
      }, 150);
    }
  }

  public static updateLiveDiagnostics(char: Character, ctx?: any): void {
    const schema = this.activeSchemaMap.get(char.id);
    if (!schema) return;

    const rules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;

    const isHolding = Boolean(char.heldObject);
    const isEdible = Boolean(char.canConsumeHeldObject());

    for (const rule of rules) {
      const pip = document.getElementById(`pip-${rule.id}`);
      if (!pip) continue;

      let match = false;
      switch (rule.condition.type) {
        case "always": match = true; break;
        case "holdingObject": match = isHolding; break;
        case "holdingEdible": match = isHolding && isEdible; break;
        case "emptyHanded": match = !isHolding; break;
        case "targetInReach": match = Boolean(ctx?.targetInReach || (char.pickupModule && !isHolding)); break;
        case "stagedActionIs": match = char.stagedAction === rule.condition.param; break;
        case "grounded": match = Boolean(char.isRestingOnSurface); break;
        case "climbing": match = Boolean(char.isClimbing); break;
        default: match = true;
      }

      if (match) {
        pip.style.background = "#10b981";
        pip.style.boxShadow = "0 0 6px rgba(16, 185, 129, 0.7)";
      } else {
        pip.style.background = "#475569";
        pip.style.boxShadow = "none";
      }
    }
  }

  public static renderSection(panel: DevPanel, char: Character, container: HTMLElement): void {
    const schema = this.getActiveSchema(char);

    container.innerHTML = `
      <div class="controls-inspector-root" style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Header & Preset Selector -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <label style="font-size: 0.76rem; font-weight: 600; color: #94a3b8;">Preset Schema:</label>
          <select id="select-control-preset" class="dev-select" style="flex: 1; font-size: 0.74rem;">
            ${BuiltinControlSchemas.map(
              (p) => `<option value="${p.id}" ${p.id === schema.id ? "selected" : ""}>${p.name}</option>`
            ).join("")}
            <option value="custom" ${!BuiltinControlSchemas.some((b) => b.id === schema.id) ? "selected" : ""}>Custom (User Modified)</option>
          </select>
        </div>

        <!-- Device Selector Tabs -->
        <div style="display: flex; gap: 4px; background: rgba(15, 23, 42, 0.8); padding: 3px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <button id="tab-btn-kbm" class="btn-secondary-action" style="flex: 1; font-size: 0.72rem; padding: 4px 6px; ${this.activeTab === "keyboardMouse" ? "background: rgba(6, 182, 212, 0.25); color: #38bdf8; border-color: rgba(56, 189, 248, 0.5);" : ""}">
            ⌨️ Keyboard & Mouse
          </button>
          <button id="tab-btn-pad" class="btn-secondary-action" style="flex: 1; font-size: 0.72rem; padding: 4px 6px; ${this.activeTab === "gamepad" ? "background: rgba(6, 182, 212, 0.25); color: #38bdf8; border-color: rgba(56, 189, 248, 0.5);" : ""}">
            🎮 Gamepad
          </button>
          <button id="tab-btn-tch" class="btn-secondary-action" style="flex: 1; font-size: 0.72rem; padding: 4px 6px; ${this.activeTab === "touch" ? "background: rgba(6, 182, 212, 0.25); color: #38bdf8; border-color: rgba(56, 189, 248, 0.5);" : ""}">
            📱 Touch
          </button>
        </div>

        <!-- Paradigms Area -->
        <div id="controls-paradigms-container" style="background: rgba(15, 23, 42, 0.5); padding: 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.06);">
          ${this.renderParadigmsHtml(schema)}
        </div>

        <!-- Rules Matrix Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <span style="font-size: 0.76rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 4px;">
            ⚡ Action Rules (Top-to-Bottom Priority)
          </span>
          <button id="btn-add-control-rule" class="btn-secondary-action" style="font-size: 0.70rem; padding: 3px 8px; color: #34d399; border-color: rgba(52, 211, 153, 0.4);">
            + Add Rule
          </button>
        </div>

        <!-- Rules List Container -->
        <div id="rules-list-container" style="display: flex; flex-direction: column; gap: 6px;">
          ${this.renderRulesListHtml(char, schema)}
        </div>
      </div>
    `;

    this.attachEventListeners(panel, char, container);
  }

  private static renderParadigmsHtml(schema: ControlSchema): string {
    if (this.activeTab === "keyboardMouse") {
      const cfg = schema.keyboardMouse;
      const isFwd = cfg.locomotion.mode === "forwardFacingDrive";
      const fwdCode = cfg.locomotion.forwardTrigger?.code || "MouseRight";
      const isListeningFwd = this.listeningForwardTrigger;

      return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.74rem; color: #cbd5e1;">Locomotion Mode:</label>
            <select id="select-loco-mode" class="dev-select" style="width: 58%; font-size: 0.72rem;">
              <option value="directVector" ${cfg.locomotion.mode === "directVector" ? "selected" : ""}>Direct 8-Way (WASD)</option>
              <option value="forwardFacingDrive" ${isFwd ? "selected" : ""}>Forward-Facing Drive (Move to Mouse)</option>
            </select>
          </div>

          ${
            isFwd
              ? `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(6, 182, 212, 0.08); padding: 5px 8px; border-radius: 4px; border: 1px solid rgba(6, 182, 212, 0.25);">
              <span style="font-size: 0.72rem; color: #38bdf8;">Forward Button:</span>
              <button id="btn-bind-fwd-trigger" class="btn-secondary-action" style="font-size: 0.72rem; padding: 2px 8px; font-weight: 600; ${isListeningFwd ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #e2e8f0;"}">
                ${isListeningFwd ? "🔴 Press key/mouse..." : `⌨️ ${fwdCode}`}
              </button>
            </div>
            <span style="font-size: 0.68rem; color: #64748b;">
              Character faces mouse cursor. Holding ${fwdCode} drives character forward. Strafe: A/D, Reverse: S.
            </span>
          `
              : ""
          }

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.74rem; color: #cbd5e1;">Aiming Mode:</label>
            <select id="select-aim-mode" class="dev-select" style="width: 58%; font-size: 0.72rem;">
              <option value="faceMouseCursor" ${cfg.aiming.mode === "faceMouseCursor" ? "selected" : ""}>Face Mouse Cursor</option>
              <option value="faceMovement" ${cfg.aiming.mode === "faceMovement" ? "selected" : ""}>Face Movement Direction</option>
            </select>
          </div>
        </div>
      `;
    }

    if (this.activeTab === "gamepad") {
      const cfg = schema.gamepad;
      return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.74rem; color: #cbd5e1;">Left Stick Primary:</label>
            <select id="select-pad-left-primary" class="dev-select" style="width: 58%; font-size: 0.72rem;">
              <option value="directLocomotion" ${cfg.leftStick.primaryMode === "directLocomotion" ? "selected" : ""}>Direct Locomotion (Walk)</option>
              <option value="cursorSteer" ${cfg.leftStick.primaryMode === "cursorSteer" ? "selected" : ""}>Cursor Reticle Steer</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.74rem; color: #cbd5e1;">Dynamic Override:</label>
            <select id="select-pad-dynamic-override" class="dev-select" style="width: 58%; font-size: 0.72rem;">
              <option value="never" ${cfg.leftStick.dynamicOverride?.triggerCondition === "never" ? "selected" : ""}>Disabled (Always Primary)</option>
              <option value="whenLtHeld" ${cfg.leftStick.dynamicOverride?.triggerCondition === "whenLtHeld" ? "selected" : ""}>When Left Trigger (LT) Held</option>
              <option value="whenAiming" ${cfg.leftStick.dynamicOverride?.triggerCondition === "whenAiming" ? "selected" : ""}>When Aiming Ability (Laser/Throw)</option>
              <option value="whenHoldingItem" ${cfg.leftStick.dynamicOverride?.triggerCondition === "whenHoldingItem" ? "selected" : ""}>When Holding Any Object</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.74rem; color: #cbd5e1;">Right Stick:</label>
            <select id="select-pad-right-mode" class="dev-select" style="width: 58%; font-size: 0.72rem;">
              <option value="twinStickAim" ${cfg.rightStick.mode === "twinStickAim" ? "selected" : ""}>Twin Stick 360 Aim</option>
              <option value="disabled" ${cfg.rightStick.mode === "disabled" ? "selected" : ""}>Disabled</option>
            </select>
          </div>
        </div>
      `;
    }

    // Touch
    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <span style="font-size: 0.72rem; color: #38bdf8;">📱 Mobile Virtual Joysticks & Action Buttons</span>
        <span style="font-size: 0.68rem; color: #94a3b8;">
          Multi-joystick support with concentric walk/sprint rings, floating follow-drag centers, and responsive anchors.
        </span>
      </div>
    `;
  }

  private static renderRulesListHtml(char: Character, schema: ControlSchema): string {
    const rules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;

    if (rules.length === 0) {
      return `<div style="text-align: center; color: #64748b; font-size: 0.72rem; padding: 12px;">No action rules defined for this device. Click "+ Add Rule".</div>`;
    }

    return rules
      .map((rule) => {
        const isListening = this.listeningRuleId === rule.id;
        const triggerLabel = this.formatTriggerLabel(rule);
        const actionDef = ControlActionCatalog.findAction(rule.action.moduleId, rule.action.intent);
        const actionLabel = actionDef ? actionDef.label : `${rule.action.moduleId}:${rule.action.intent}`;

        // Module presence verification
        const cat = ControlActionCatalog.categories.find((c) => c.id === rule.action.moduleId);
        const isModuleMissing = cat && !cat.isAttached(char);

        return `
        <div class="control-rule-card" id="rule-card-${rule.id}" style="display: flex; flex-direction: column; gap: 4px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px 8px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
            <!-- Status Pip -->
            <span class="rule-status-pip" id="pip-${rule.id}" style="width: 8px; height: 8px; border-radius: 50%; background: #475569; flex-shrink: 0;" title="Matches Live Condition"></span>

            <!-- Trigger Button (Press to Bind) -->
            <button class="btn-bind-trigger btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.70rem; padding: 2px 6px; font-weight: 600; min-width: 90px; text-align: center; ${isListening ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #38bdf8;"}">
              ${isListening ? "🔴 Listening..." : triggerLabel}
            </button>

            <!-- Mode Selector -->
            <select class="select-rule-mode dev-select" data-rule-id="${rule.id}" style="font-size: 0.68rem; padding: 2px 4px; width: 68px;">
              <option value="press" ${rule.trigger.mode === "press" ? "selected" : ""}>Press</option>
              <option value="hold" ${rule.trigger.mode === "hold" ? "selected" : ""}>Hold</option>
              <option value="release" ${rule.trigger.mode === "release" ? "selected" : ""}>Release</option>
            </select>

            <!-- Condition Gate Selector -->
            <select class="select-rule-cond dev-select" data-rule-id="${rule.id}" style="font-size: 0.68rem; padding: 2px 4px; flex: 1;">
              <option value="always" ${rule.condition.type === "always" ? "selected" : ""}>Always</option>
              <option value="holdingObject" ${rule.condition.type === "holdingObject" ? "selected" : ""}>Holding Item</option>
              <option value="holdingEdible" ${rule.condition.type === "holdingEdible" ? "selected" : ""}>Holding Edible</option>
              <option value="emptyHanded" ${rule.condition.type === "emptyHanded" ? "selected" : ""}>Empty-Handed</option>
              <option value="targetInReach" ${rule.condition.type === "targetInReach" ? "selected" : ""}>Target in Reach</option>
              <option value="stagedActionIs:laser" ${rule.condition.type === "stagedActionIs" && rule.condition.param === "laser" ? "selected" : ""}>Staged == Laser</option>
              <option value="stagedActionIs:throw" ${rule.condition.type === "stagedActionIs" && rule.condition.param === "throw" ? "selected" : ""}>Staged == Throw</option>
              <option value="stagedActionIs:melee" ${rule.condition.type === "stagedActionIs" && rule.condition.param === "melee" ? "selected" : ""}>Staged == Melee</option>
              <option value="grounded" ${rule.condition.type === "grounded" ? "selected" : ""}>On Ground</option>
              <option value="climbing" ${rule.condition.type === "climbing" ? "selected" : ""}>Climbing Wall</option>
            </select>

            <!-- Delete Rule Button -->
            <button class="btn-delete-rule btn-secondary-action" data-rule-id="${rule.id}" style="padding: 2px 5px; color: #f87171; border-color: rgba(248, 113, 113, 0.3); font-size: 0.70rem;" title="Remove Rule">
              🗑️
            </button>
          </div>

          <!-- Target Action Picker Button -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px; padding-left: 14px;">
            <span style="font-size: 0.68rem; color: #94a3b8;">Action Function:</span>
            <button class="btn-open-action-picker btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.70rem; padding: 2px 8px; color: #facc15; border-color: rgba(250, 204, 21, 0.3); text-align: right;">
              ${actionLabel} ▼
            </button>
          </div>

          <!-- Module Missing Warning Banner (if action requires an unattached module) -->
          ${
            isModuleMissing
              ? `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(239, 68, 68, 0.12); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3); margin-top: 2px;">
              <span style="font-size: 0.66rem; color: #f87171;">⚠️ Needs ${cat.label}</span>
              <button class="btn-quick-attach-module btn-secondary-action" data-mod-id="${cat.id}" style="font-size: 0.64rem; padding: 1px 5px; color: #34d399; border-color: rgba(52, 211, 153, 0.4);">
                + Add Module
              </button>
            </div>
          `
              : ""
          }
        </div>
      `;
      })
      .join("");
  }

  private static formatTriggerLabel(rule: ControlRule): string {
    const t = rule.trigger;
    const devIcon = t.device === "keyboard" ? "⌨️" : t.device === "mouse" ? "🖱️" : "🎮";
    const chord = t.chordModifiers && t.chordModifiers.length > 0 ? `${t.chordModifiers.join("+")} + ` : "";
    return `${devIcon} ${chord}${t.code}`;
  }

  private static attachEventListeners(panel: DevPanel, char: Character, container: HTMLElement): void {
    const schema = this.getActiveSchema(char);

    // 1. Preset Selector
    const selectPreset = container.querySelector("#select-control-preset") as HTMLSelectElement;
    if (selectPreset) {
      selectPreset.addEventListener("change", () => {
        const pId = selectPreset.value;
        const found = BuiltinControlSchemas.find((b) => b.id === pId);
        if (found) {
          this.setActiveSchema(char, found);
          this.renderSection(panel, char, container);
        }
      });
    }

    // 2. Tab Buttons
    container.querySelector("#tab-btn-kbm")?.addEventListener("click", () => {
      this.activeTab = "keyboardMouse";
      this.renderSection(panel, char, container);
    });
    container.querySelector("#tab-btn-pad")?.addEventListener("click", () => {
      this.activeTab = "gamepad";
      this.renderSection(panel, char, container);
    });
    container.querySelector("#tab-btn-tch")?.addEventListener("click", () => {
      this.activeTab = "touch";
      this.renderSection(panel, char, container);
    });

    // 3. Locomotion Mode Selector
    const selectLoco = container.querySelector("#select-loco-mode") as HTMLSelectElement;
    if (selectLoco) {
      selectLoco.addEventListener("change", () => {
        schema.keyboardMouse.locomotion.mode = selectLoco.value as LocomotionParadigm;
        this.renderSection(panel, char, container);
      });
    }

    // 4. Forward Trigger Bind Button
    const btnFwdTrigger = container.querySelector("#btn-bind-fwd-trigger");
    if (btnFwdTrigger) {
      btnFwdTrigger.addEventListener("click", () => {
        this.startForwardTriggerListening(panel, char, container);
      });
    }

    // 5. Aim Mode Selector
    const selectAim = container.querySelector("#select-aim-mode") as HTMLSelectElement;
    if (selectAim) {
      selectAim.addEventListener("change", () => {
        schema.keyboardMouse.aiming.mode = selectAim.value as AimingParadigm;
      });
    }

    // 6. Gamepad Left Stick Primary
    const selectPadLeft = container.querySelector("#select-pad-left-primary") as HTMLSelectElement;
    if (selectPadLeft) {
      selectPadLeft.addEventListener("change", () => {
        schema.gamepad.leftStick.primaryMode = selectPadLeft.value as any;
      });
    }

    // 7. Gamepad Dynamic Override
    const selectPadOverride = container.querySelector("#select-pad-dynamic-override") as HTMLSelectElement;
    if (selectPadOverride) {
      selectPadOverride.addEventListener("change", () => {
        if (!schema.gamepad.leftStick.dynamicOverride) {
          schema.gamepad.leftStick.dynamicOverride = {
            triggerCondition: "whenLtHeld",
            overrideMode: "cursorSteer",
          };
        }
        schema.gamepad.leftStick.dynamicOverride.triggerCondition = selectPadOverride.value as any;
      });
    }

    // 8. Add Rule Button
    container.querySelector("#btn-add-control-rule")?.addEventListener("click", () => {
      const newRule: ControlRule = {
        id: "rule-" + Date.now().toString(36),
        name: "New Action Rule",
        enabled: true,
        priority: 50,
        trigger:
          this.activeTab === "gamepad"
            ? { device: "gamepad", code: "GamepadA", mode: "press" }
            : { device: "keyboard", code: "Space", mode: "press" },
        condition: { type: "always" },
        action: { moduleId: "locomotion", intent: "jump" },
      };

      if (this.activeTab === "keyboardMouse") {
        schema.keyboardMouse.rules.unshift(newRule);
      } else if (this.activeTab === "gamepad") {
        schema.gamepad.rules.unshift(newRule);
      } else {
        schema.touch.rules.unshift(newRule);
      }

      this.renderSection(panel, char, container);
    });

    // 9. Rule Cards Events (Trigger bind, Mode, Condition, Action picker, Delete)
    container.querySelectorAll(".btn-bind-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        if (rId) {
          this.startRuleTriggerListening(panel, char, container, rId);
        }
      });
    });

    container.querySelectorAll(".select-rule-mode").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const rule = this.findRule(schema, rId);
        if (rule) {
          rule.trigger.mode = (e.target as HTMLSelectElement).value as TriggerMode;
        }
      });
    });

    container.querySelectorAll(".select-rule-cond").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const val = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          if (val.startsWith("stagedActionIs:")) {
            rule.condition.type = "stagedActionIs";
            rule.condition.param = val.split(":")[1];
          } else {
            rule.condition.type = val as ConditionType;
            rule.condition.param = undefined;
          }
        }
      });
    });

    container.querySelectorAll(".btn-open-action-picker").forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const rId = (btn as HTMLElement).dataset.ruleId;
        if (rId) {
          this.showActionPickerMenu(panel, char, container, rId, btn as HTMLElement);
        }
      });
    });

    container.querySelectorAll(".btn-delete-rule").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        this.deleteRule(schema, rId);
        this.renderSection(panel, char, container);
      });
    });
  }

  private static findRule(schema: ControlSchema, ruleId?: string): ControlRule | undefined {
    if (!ruleId) return undefined;
    const rules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;
    return rules.find((r) => r.id === ruleId);
  }

  private static deleteRule(schema: ControlSchema, ruleId?: string): void {
    if (!ruleId) return;
    const rules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) rules.splice(idx, 1);
  }

  // --- "Press input to bind" Chord Recorder ---
  private static startRuleTriggerListening(
    panel: DevPanel,
    char: Character,
    container: HTMLElement,
    ruleId: string
  ): void {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningRuleId = ruleId;
    this.renderSection(panel, char, container);

    const schema = this.getActiveSchema(char);
    const rule = this.findRule(schema, ruleId);
    if (!rule) return;

    const chord = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape") {
        cleanup();
        this.listeningRuleId = null;
        this.renderSection(panel, char, container);
        return;
      }

      // Check if it's a modifier key
      if (["AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"].includes(e.code)) {
        chord.add(e.code);
        return;
      }

      // Main key pressed!
      rule.trigger.device = "keyboard";
      rule.trigger.code = e.code;
      rule.trigger.chordModifiers = chord.size > 0 ? Array.from(chord) : undefined;

      cleanup();
      this.listeningRuleId = null;
      this.renderSection(panel, char, container);
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const btnName = e.button === 0 ? "MouseLeft" : e.button === 1 ? "MouseMiddle" : "MouseRight";
      rule.trigger.device = "mouse";
      rule.trigger.code = btnName;
      rule.trigger.chordModifiers = chord.size > 0 ? Array.from(chord) : undefined;

      cleanup();
      this.listeningRuleId = null;
      this.renderSection(panel, char, container);
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      this.recorderCleanup = null;
    };

    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
  }

  private static startForwardTriggerListening(
    panel: DevPanel,
    char: Character,
    container: HTMLElement
  ): void {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningForwardTrigger = true;
    this.renderSection(panel, char, container);

    const schema = this.getActiveSchema(char);

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      schema.keyboardMouse.locomotion.forwardTrigger = {
        device: "keyboard",
        code: e.code,
        mode: "hold",
      };
      cleanup();
      this.listeningForwardTrigger = false;
      this.renderSection(panel, char, container);
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const btnName = e.button === 0 ? "MouseLeft" : e.button === 1 ? "MouseMiddle" : "MouseRight";
      schema.keyboardMouse.locomotion.forwardTrigger = {
        device: "mouse",
        code: btnName,
        mode: "hold",
      };
      cleanup();
      this.listeningForwardTrigger = false;
      this.renderSection(panel, char, container);
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      this.recorderCleanup = null;
    };

    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
  }

  // --- Categorized & Collapsible Action Picker Popover ---
  private static showActionPickerMenu(
    panel: DevPanel,
    char: Character,
    container: HTMLElement,
    ruleId: string,
    anchorBtn: HTMLElement
  ): void {
    // Remove existing popover if open
    const existing = document.getElementById("action-picker-popover");
    if (existing) existing.remove();

    const schema = this.getActiveSchema(char);
    const rule = this.findRule(schema, ruleId);
    if (!rule) return;

    const { attached, unattached } = ControlActionCatalog.getCategorizedForCharacter(char);

    const popover = document.createElement("div");
    popover.id = "action-picker-popover";
    popover.style.cssText = `
      position: absolute;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 8px;
      padding: 8px;
      max-height: 280px;
      width: 250px;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.7);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    // Position near button
    const rect = anchorBtn.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 4}px`;
    popover.style.left = `${Math.max(10, rect.left + window.scrollX - 100)}px`;

    popover.innerHTML = `
      <div style="font-size: 0.70rem; font-weight: 700; color: #38bdf8; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        Select Target Action Function
      </div>

      <!-- Attached Modules (Expanded) -->
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 0.64rem; font-weight: 700; color: #34d399;">⭐ ATTACHED MODULES</span>
        ${attached
          .map(
            (cat) => `
          <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.02); border-radius: 4px; padding: 4px;">
            <span style="font-size: 0.68rem; font-weight: 600; color: #e2e8f0;">${cat.icon} ${cat.label}</span>
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px; padding-left: 6px;">
              ${cat.actions
                .map(
                  (act) => `
                <button class="btn-select-action" data-mod="${cat.id}" data-intent="${act.id}" style="text-align: left; background: none; border: none; color: #94a3b8; font-size: 0.68rem; padding: 3px 4px; border-radius: 3px; cursor: pointer;">
                  • <strong style="color: #cbd5e1;">${act.label}</strong>
                </button>
              `
                )
                .join("")}
            </div>
          </div>
        `
          )
          .join("")}
      </div>

      <!-- Unattached Modules (Collapsed by default) -->
      ${
        unattached.length > 0
          ? `
        <details style="margin-top: 4px;">
          <summary style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; cursor: pointer;">
            📦 OTHER MODULES (${unattached.length})
          </summary>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
            ${unattached
              .map(
                (cat) => `
              <div style="display: flex; flex-direction: column; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 4px;">
                <span style="font-size: 0.66rem; color: #64748b;">${cat.icon} ${cat.label}</span>
                <div style="display: flex; flex-direction: column; gap: 2px; padding-left: 6px;">
                  ${cat.actions
                    .map(
                      (act) => `
                    <button class="btn-select-action" data-mod="${cat.id}" data-intent="${act.id}" style="text-align: left; background: none; border: none; color: #64748b; font-size: 0.66rem; padding: 2px 4px; cursor: pointer;">
                      • ${act.label}
                    </button>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </details>
      `
          : ""
      }
    `;

    document.body.appendChild(popover);

    // Click handler for action selection
    popover.querySelectorAll(".btn-select-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mod = (btn as HTMLElement).dataset.mod;
        const intent = (btn as HTMLElement).dataset.intent;
        if (mod && intent) {
          rule.action.moduleId = mod;
          rule.action.intent = intent;
          popover.remove();
          this.renderSection(panel, char, container);
        }
      });
    });

    // Dismiss on click outside
    const onDocClick = (e: MouseEvent) => {
      if (!popover.contains(e.target as Node) && e.target !== anchorBtn) {
        popover.remove();
        document.removeEventListener("click", onDocClick);
      }
    };
    setTimeout(() => document.addEventListener("click", onDocClick), 10);
  }
}
