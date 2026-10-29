import { Character } from "../../../character/Character.js";
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
import { prefabManager } from "../../../engine/prefab/PrefabManager.js";
import { DevConfigPersistence } from "../DevConfigPersistence.js";

/**
 * ControlsInspector provides a dedicated separate program window (and fallback modal dialog)
 * for inspecting, customizing, recording, and persisting character-specific and prefab-specific
 * control schemas.
 */
export class ControlsInspector {
  private static modalChar: Character | null = null;
  private static modalPanel: DevPanel | null = null;
  private static popoutWindow: Window | null = null;
  private static modalOverlay: HTMLElement | null = null;
  private static workingSchema: ControlSchema | null = null;
  private static activeTab: DeviceChannel = "keyboardMouse";
  private static showJsonEditor: boolean = false;
  private static jsonErrorMessage: string | null = null;
  private static listeningRuleId: string | null = null;
  private static listeningForwardTrigger: boolean = false;
  private static listeningLocoKey: "moveForwardKey" | "reverseKey" | "strafeLeftKey" | "strafeRightKey" | null = null;
  private static recorderCleanup: (() => void) | null = null;
  private static keydownListener: ((e: KeyboardEvent) => void) | null = null;

  // --- Public API ---

  public static isWindowOpen(): boolean {
    return Boolean(this.popoutWindow && !this.popoutWindow.closed);
  }

  public static isModalOpen(): boolean {
    return Boolean(this.modalOverlay && document.body.contains(this.modalOverlay));
  }

  public static getActiveSchema(char: Character): ControlSchema {
    if (char.controlSchema) {
      return char.controlSchema;
    }
    if (char.prefabId) {
      const prefab = prefabManager.get(char.prefabId);
      if (prefab?.controlSchema) {
        char.controlSchema = JSON.parse(JSON.stringify(prefab.controlSchema));
        return char.controlSchema!;
      }
    }
    char.controlSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    return char.controlSchema!;
  }

  public static setActiveSchema(char: Character, schema: ControlSchema): void {
    char.controlSchema = JSON.parse(JSON.stringify(schema));
  }

  public static notifyRuleFired(ruleId: string): void {
    // 1. Highlight in separate popout window
    if (this.popoutWindow && !this.popoutWindow.closed) {
      const doc = this.popoutWindow.document;
      const card = doc.getElementById(`rule-card-${ruleId}`);
      if (card) {
        card.style.borderColor = "#38bdf8";
        card.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.8)";
        setTimeout(() => {
          if (card) {
            card.style.borderColor = "rgba(255, 255, 255, 0.08)";
            card.style.boxShadow = "none";
          }
        }, 150);
      }
    }

    // 2. Highlight in fallback in-page modal
    if (this.modalOverlay) {
      const card = this.modalOverlay.querySelector(`#rule-card-${ruleId}`) as HTMLElement | null;
      if (card) {
        card.style.borderColor = "#38bdf8";
        card.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.8)";
        setTimeout(() => {
          if (card) {
            card.style.borderColor = "rgba(255, 255, 255, 0.08)";
            card.style.boxShadow = "none";
          }
        }, 150);
      }
    }
  }

  public static updateLiveDiagnostics(char: Character, ctx?: any): void {
    const isPopoutActive = Boolean(this.popoutWindow && !this.popoutWindow.closed);
    const isModalActive = this.isModalOpen();
    if (!isPopoutActive && !isModalActive) return;
    if (this.modalChar !== char || !this.workingSchema) return;

    const rules =
      this.activeTab === "keyboardMouse"
        ? this.workingSchema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? this.workingSchema.gamepad.rules
        : this.workingSchema.touch.rules;

    const isHolding = Boolean(char.heldObject);
    const isEdible = Boolean(char.canConsumeHeldObject());

    for (const rule of rules) {
      let match = false;
      switch (rule.condition.type) {
        case "always": match = true; break;
        case "holdingObject": match = isHolding; break;
        case "holdingItemWithPrimaryAbility":
        case "holdingEdible": match = isHolding && (Boolean(char.hasPrimaryItemAbility()) || isEdible); break;
        case "emptyHanded": match = !isHolding; break;
        case "targetInReach": match = Boolean(ctx?.targetInReach || (char.pickupModule && !isHolding)); break;
        case "stagedActionIs": match = char.stagedAction === rule.condition.param; break;
        case "grounded": match = Boolean(char.isRestingOnSurface); break;
        case "climbing": match = Boolean(char.isClimbing); break;
        default: match = true;
      }

      // Update in popout window
      if (isPopoutActive) {
        const pip = this.popoutWindow!.document.getElementById(`pip-${rule.id}`);
        if (pip) {
          pip.style.background = match ? "#10b981" : "#475569";
          pip.style.boxShadow = match ? "0 0 6px rgba(16, 185, 129, 0.85)" : "none";
        }
      }

      // Update in fallback modal
      if (isModalActive && this.modalOverlay) {
        const pip = this.modalOverlay.querySelector(`#pip-${rule.id}`) as HTMLElement | null;
        if (pip) {
          pip.style.background = match ? "#10b981" : "#475569";
          pip.style.boxShadow = match ? "0 0 6px rgba(16, 185, 129, 0.85)" : "none";
        }
      }
    }
  }

  // --- Window / Modal Open & Lifecycle ---

  public static openModal(panel: DevPanel, char: Character): void {
    this.openWindow(panel, char);
  }

  public static openWindow(panel: DevPanel, char: Character): void {
    this.modalChar = char;
    this.modalPanel = panel;
    this.workingSchema = JSON.parse(JSON.stringify(this.getActiveSchema(char)));
    this.showJsonEditor = false;
    this.jsonErrorMessage = null;
    this.listeningRuleId = null;
    this.listeningForwardTrigger = false;
    this.listeningLocoKey = null;

    // If popout window is already open, focus it and update content
    if (this.popoutWindow && !this.popoutWindow.closed) {
      try {
        this.popoutWindow.document.title = `🎮 Controls Schema — ${char.name || "Character"}`;
        this.popoutWindow.focus();
        this.renderActiveView();
        return;
      } catch {
        this.popoutWindow = null;
      }
    }

    // Try opening as a dedicated separate program window (OS window)
    const width = 840;
    const height = 900;
    const left = Math.max(20, window.screenX + 30);
    const top = Math.max(20, window.screenY + 30);
    const windowFeatures = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;

    let popout: Window | null = null;
    try {
      popout = window.open("", `ControlsSchemaWindow_${char.id}`, windowFeatures);
    } catch {
      popout = null;
    }

    if (popout && !popout.closed) {
      this.popoutWindow = popout;

      // Close any fallback in-page modal
      if (this.modalOverlay) {
        this.modalOverlay.remove();
        this.modalOverlay = null;
      }

      popout.document.open();
      popout.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>🎮 Controls Schema — ${char.name || "Character"}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #090d16;
      color: #e2e8f0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #090d16; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }
    .btn-secondary-action {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-secondary-action:hover {
      background: #334155;
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .dev-select {
      background: #0f172a;
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 5px;
      padding: 4px 6px;
      outline: none;
    }
    .dev-select:focus {
      border-color: #38bdf8;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div id="controls-window-root" style="flex: 1; display: flex; flex-direction: column; height: 100%; overflow: hidden;"></div>
</body>
</html>`);
      popout.document.close();

      // Copy stylesheet references into popout window
      document.querySelectorAll("link[rel='stylesheet'], style").forEach((tag) => {
        try {
          popout!.document.head.appendChild(tag.cloneNode(true));
        } catch {}
      });

      // Cleanup when user closes popout window
      popout.addEventListener("unload", () => {
        this.popoutWindow = null;
      });

      this.renderActiveView();
      return;
    }

    // Fallback: If browser blocked popups, open in-canvas modal dialog
    this.openInCanvasModal(panel, char);
  }

  private static openInCanvasModal(_panel: DevPanel, _char: Character): void {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "controls-modal-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(3, 7, 18, 0.80);
      backdrop-filter: blur(6px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    `;
    document.body.appendChild(overlay);
    this.modalOverlay = overlay;

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeModal();
      }
    };

    this.keydownListener = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (this.listeningRuleId || this.listeningForwardTrigger) return;
        this.closeModal();
      }
    };
    window.addEventListener("keydown", this.keydownListener);

    this.renderActiveView();
  }

  public static closeModal(): void {
    if (this.recorderCleanup) {
      this.recorderCleanup();
      this.recorderCleanup = null;
    }
    if (this.keydownListener) {
      window.removeEventListener("keydown", this.keydownListener);
      this.keydownListener = null;
    }
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.close();
      this.popoutWindow = null;
    }
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
    const popover = document.getElementById("action-picker-popover");
    if (popover) popover.remove();

    this.modalChar = null;
    this.modalPanel = null;
    this.workingSchema = null;
    this.listeningRuleId = null;
    this.listeningForwardTrigger = false;
    this.listeningLocoKey = null;
  }

  private static async saveAndCommit(): Promise<void> {
    if (!this.modalChar || !this.workingSchema) return;

    const char = this.modalChar;
    const schema = this.workingSchema;
    const root = this.getRootContainer();
    const saveBtn = root?.querySelector("#btn-modal-save-close") as HTMLButtonElement | null;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "⏳ Saving to Project...";
    }

    try {
      await DevConfigPersistence.saveControlSchema(this.modalPanel, char, schema);
      const prefab = char.prefabId ? prefabManager.get(char.prefabId) : undefined;
      const targetDesc = prefab ? `${char.name || "Character"} & ${prefab.name} Prefab` : (char.name || "Character");
      this.showToast(`✓ Saved & persisted controls for ${targetDesc} to worldConfig.json!`);
    } catch (err: any) {
      console.error("Failed to save controls:", err);
      this.showToast(`❌ Save failed: ${err.message || err}`, true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Save & Apply";
      }
      this.renderActiveView();
    }
  }

  private static showToast(message: string, isError = false): void {
    const targets: Document[] = [document];
    if (this.popoutWindow && !this.popoutWindow.closed) {
      targets.push(this.popoutWindow.document);
    }

    for (const doc of targets) {
      const existing = doc.getElementById("controls-save-toast");
      if (existing) existing.remove();

      const toast = doc.createElement("div");
      toast.id = "controls-save-toast";
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${isError ? "rgba(239, 68, 68, 0.95)" : "rgba(16, 185, 129, 0.95)"};
        color: #ffffff;
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      `;
      toast.innerHTML = `<span>${isError ? "⚠️" : "✓"}</span> <span>${message}</span>`;
      doc.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease-out";
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }

  // --- View Rendering (Popout Window or In-Canvas Dialog) ---

  private static getRootContainer(): HTMLElement | null {
    if (this.popoutWindow && !this.popoutWindow.closed) {
      return this.popoutWindow.document.getElementById("controls-window-root");
    }
    if (this.modalOverlay) {
      return this.modalOverlay;
    }
    return null;
  }

  private static renderActiveView(): void {
    const root = this.getRootContainer();
    if (!root || !this.modalChar || !this.workingSchema) return;

    const char = this.modalChar;
    const schema = this.workingSchema;
    const prefab = char.prefabId ? prefabManager.get(char.prefabId) : undefined;
    const prefabName = prefab ? `${prefab.icon} ${prefab.name}` : null;
    const isPopout = Boolean(this.popoutWindow && !this.popoutWindow.closed);

    const activeRulesCount =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules.length
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules.length
        : schema.touch.rules.length;

    const dialogHtml = `
      <div id="controls-dialog-container" style="
        background: #0f172a;
        ${isPopout ? "height: 100%; border: none; border-radius: 0;" : "border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; width: 780px; max-width: 95vw; max-height: 92vh;"}
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #e2e8f0;
        box-shadow: ${isPopout ? "none" : "0 25px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(56, 189, 248, 0.15)"};
      ">
        <!-- Title Bar / Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: rgba(15, 23, 42, 0.98); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">🎮</span>
            <div>
              <div style="font-weight: 700; font-size: 0.94rem; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                Controls Schema: <span style="color: #38bdf8;">${char.name || "Character"}</span>
                <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;">ID: ${char.id}</span>
                ${isPopout ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;">🪟 Separate Window</span>` : ""}
              </div>
            </div>
          </div>
          <button id="btn-close-controls-modal" class="btn-secondary-action" style="padding: 4px 10px; font-size: 0.82rem; color: #94a3b8;" title="Close Window">✕ Close</button>
        </div>

        <!-- Subheader: Linked Prefab Bar & Preset Selector -->
        <div style="padding: 10px 18px; background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.06); display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; padding: 6px 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.76rem; color: #c084fc; font-weight: 600;">Linked Archetype:</span>
              <span style="font-size: 0.78rem; color: #e2e8f0; font-weight: 600;">${prefabName || "(Standalone Character)"}</span>
              ${prefab ? `<span class="badge" style="background: rgba(52, 211, 153, 0.15); color: #34d399; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px;">Auto-Persists to Prefab on Save</span>` : ""}
            </div>
            <div style="display: flex; gap: 6px;">
              ${
                prefab
                  ? `
                <button id="btn-revert-controls-from-prefab" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);" title="Discard unsaved changes and reload clean controls from prefab archetype">↺ Reset to Prefab Defaults</button>
              `
                  : `
                <button id="btn-make-char-prefab" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #c084fc; border-color: rgba(168, 85, 247, 0.4);" title="Turn this character into a reusable Character Prefab with this control schema">📦 Save as New Prefab</button>
              `
              }
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <label style="font-size: 0.78rem; font-weight: 600; color: #94a3b8; white-space: nowrap;">Preset Template:</label>
            <select id="select-control-preset" class="dev-select" style="flex: 1; font-size: 0.76rem;">
              ${BuiltinControlSchemas.map(
                (p) => `<option value="${p.id}" ${p.id === schema.id ? "selected" : ""}>${p.name}</option>`
              ).join("")}
              <option value="custom" ${!BuiltinControlSchemas.some((b) => b.id === schema.id) ? "selected" : ""}>Custom (User Modified)</option>
            </select>
          </div>
        </div>

        <!-- Device Channel Tabs -->
        <div style="display: flex; gap: 4px; padding: 8px 18px 0 18px; background: rgba(15, 23, 42, 0.5);">
          <button id="tab-btn-kbm" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "keyboardMouse" ? "background: #1e293b; color: #38bdf8; border-color: rgba(56, 189, 248, 0.5); border-bottom: 2px solid #38bdf8;" : "background: rgba(15, 23, 42, 0.6); color: #94a3b8;"}">
            ⌨️ Keyboard & Mouse
          </button>
          <button id="tab-btn-pad" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "gamepad" ? "background: #1e293b; color: #38bdf8; border-color: rgba(56, 189, 248, 0.5); border-bottom: 2px solid #38bdf8;" : "background: rgba(15, 23, 42, 0.6); color: #94a3b8;"}">
            🎮 Gamepad
          </button>
          <button id="tab-btn-tch" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "touch" ? "background: #1e293b; color: #38bdf8; border-color: rgba(56, 189, 248, 0.5); border-bottom: 2px solid #38bdf8;" : "background: rgba(15, 23, 42, 0.6); color: #94a3b8;"}">
            📱 Mobile Touch
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div style="flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; background: #1e293b;">
          
          <!-- Paradigms Area -->
          <div id="controls-paradigms-container" style="background: rgba(15, 23, 42, 0.75); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
            ${this.renderParadigmsHtml(schema)}
          </div>

          <!-- Rules Matrix Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <span style="font-size: 0.80rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
              ⚡ Action Rules (${activeRulesCount})
              <span style="font-size: 0.70rem; font-weight: 400; color: #94a3b8;">— Evaluated top to bottom</span>
            </span>
            <button id="btn-add-control-rule" class="btn-secondary-action" style="font-size: 0.74rem; padding: 4px 12px; color: #34d399; border-color: rgba(52, 211, 153, 0.4); font-weight: 600;">
              + Add Rule
            </button>
          </div>

          <!-- Rules List Container -->
          <div id="rules-list-container" style="display: flex; flex-direction: column; gap: 6px;">
            ${this.renderRulesListHtml(char, schema)}
          </div>

          <!-- Collapsible Raw JSON Editor Drawer -->
          <div style="margin-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button id="btn-toggle-json-drawer" class="btn-secondary-action" type="button" style="font-size: 0.74rem; padding: 4px 10px; color: #c084fc; border-color: rgba(168, 85, 247, 0.4);">
                ${this.showJsonEditor ? "▲ Hide Raw JSON" : "📋 View / Edit Raw JSON"}
              </button>
              <span style="font-size: 0.70rem; color: #64748b;">Direct JSON Schema inspection & export</span>
            </div>

            ${
              this.showJsonEditor
                ? `
              <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 6px; padding: 8px;">
                ${
                  this.jsonErrorMessage
                    ? `<div style="color: #f87171; font-size: 0.72rem; background: rgba(239, 68, 68, 0.15); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3);">⚠️ ${this.jsonErrorMessage}</div>`
                    : ""
                }
                <textarea id="textarea-controls-json" style="width: 100%; height: 200px; font-family: monospace; font-size: 0.72rem; background: #090d16; color: #38bdf8; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 8px; resize: vertical; box-sizing: border-box;" spellcheck="false">${JSON.stringify(
                    schema,
                    null,
                    2
                  )}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 6px;">
                  <button id="btn-copy-json" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #94a3b8;">📋 Copy JSON</button>
                  <button id="btn-apply-json" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 12px; color: #34d399; border-color: rgba(52, 211, 153, 0.4); font-weight: 600;">Apply JSON Changes</button>
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Footer Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: rgba(15, 23, 42, 0.98); border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 0.74rem; color: #94a3b8;">
            Schema: <strong style="color: #cbd5e1;">${schema.name}</strong>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-modal-cancel" class="btn-secondary-action" style="padding: 6px 14px; font-size: 0.78rem;">Close</button>
            <button id="btn-modal-save-close" class="btn-secondary-action" style="padding: 6px 18px; font-size: 0.78rem; font-weight: 700; color: #38bdf8; border-color: rgba(56, 189, 248, 0.5); background: rgba(56, 189, 248, 0.12);" title="Saves live controls, updates the linked prefab archetype, and permanently persists to worldConfig.json on disk">
              💾 Save & Apply
            </button>
          </div>
        </div>
      </div>
    `;

    root.innerHTML = dialogHtml;
    this.attachEventListeners(root);
  }

  // --- Sub-Section HTML Builders ---

  private static renderParadigmsHtml(schema: ControlSchema): string {
    if (this.activeTab === "keyboardMouse") {
      const cfg = schema.keyboardMouse;
      const isFwd = cfg.locomotion.mode === "forwardFacingDrive";
      const fwdCode = cfg.locomotion.forwardTrigger?.code || "MouseRight";
      const isListeningFwd = this.listeningForwardTrigger;

      const renderLocoKeyRow = (label: string, keyName: "moveForwardKey" | "reverseKey" | "strafeLeftKey" | "strafeRightKey") => {
        const val = cfg.locomotion[keyName];
        const isListening = this.listeningLocoKey === keyName;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.06);">
            <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 500;">${label}:</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button data-loco-key="${keyName}" class="btn-bind-loco-key btn-secondary-action" style="font-size: 0.74rem; padding: 2px 8px; font-weight: 600; ${isListening ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : (val ? "color: #38bdf8;" : "color: #64748b; font-style: italic;")}">
                ${isListening ? "🔴 Press key..." : (val ? `⌨️ ${val}` : "(Unbound)")}
              </button>
              ${val ? `<button data-clear-loco-key="${keyName}" class="btn-clear-loco-key btn-icon" style="padding: 2px 6px; font-size: 0.70rem; color: #f87171; background: rgba(239, 68, 68, 0.1);" title="Unbind key">✕</button>` : ""}
            </div>
          </div>
        `;
      };

      return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Locomotion Mode:</label>
            <select id="select-loco-mode" class="dev-select" style="width: 58%; font-size: 0.74rem;">
              <option value="directVector" ${cfg.locomotion.mode === "directVector" ? "selected" : ""}>Direct 8-Way (WASD)</option>
              <option value="forwardFacingDrive" ${isFwd ? "selected" : ""}>Forward-Facing Drive (Move to Mouse)</option>
            </select>
          </div>

          ${
            isFwd
              ? `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(6, 182, 212, 0.08); padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(6, 182, 212, 0.25);">
              <span style="font-size: 0.74rem; color: #38bdf8; font-weight: 600;">Forward Drive Trigger:</span>
              <button id="btn-bind-fwd-trigger" class="btn-secondary-action" style="font-size: 0.74rem; padding: 2px 8px; font-weight: 600; ${isListeningFwd ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #e2e8f0;"}">
                ${isListeningFwd ? "🔴 Press key/mouse..." : `⌨️ ${fwdCode}`}
              </button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
              ${renderLocoKeyRow("Reverse (Optional)", "reverseKey")}
              ${renderLocoKeyRow("Strafe Left (Optional)", "strafeLeftKey")}
              ${renderLocoKeyRow("Strafe Right (Optional)", "strafeRightKey")}
            </div>
            <span style="font-size: 0.70rem; color: #64748b; line-height: 1.3;">
              Creature faces mouse cursor. Drive trigger moves forward. Reverse and strafe keys are optional — click ✕ to unbind them and free A, S, D for abilities.
            </span>
          `
              : `
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${renderLocoKeyRow("Move Forward / Up", "moveForwardKey")}
              ${renderLocoKeyRow("Move Backward / Down", "reverseKey")}
              ${renderLocoKeyRow("Strafe Left", "strafeLeftKey")}
              ${renderLocoKeyRow("Strafe Right", "strafeRightKey")}
            </div>
            <span style="font-size: 0.70rem; color: #64748b; line-height: 1.3;">
              Direct directional movement. Unbound keys will produce zero movement.
            </span>
          `
          }

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Aiming Mode:</label>
            <select id="select-aim-mode" class="dev-select" style="width: 58%; font-size: 0.74rem;">
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
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Left Stick Primary:</label>
            <select id="select-pad-left-primary" class="dev-select" style="width: 58%; font-size: 0.74rem;">
              <option value="directLocomotion" ${cfg.leftStick.primaryMode === "directLocomotion" ? "selected" : ""}>Direct Locomotion (Walk)</option>
              <option value="cursorSteer" ${cfg.leftStick.primaryMode === "cursorSteer" ? "selected" : ""}>Cursor Reticle Steer</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Dynamic Override:</label>
            <select id="select-pad-dynamic-override" class="dev-select" style="width: 58%; font-size: 0.74rem;">
              <option value="never" ${cfg.leftStick.dynamicOverride?.triggerCondition === "never" ? "selected" : ""}>Disabled (Always Primary)</option>
              <option value="whenLtHeld" ${cfg.leftStick.dynamicOverride?.triggerCondition === "whenLtHeld" ? "selected" : ""}>When Left Trigger (LT) Held</option>
              <option value="whenAiming" ${cfg.leftStick.dynamicOverride?.triggerCondition === "whenAiming" ? "selected" : ""}>When Aiming Ability (Laser/Throw)</option>
              <option value="whenHoldingItem" ${cfg.leftStick.dynamicOverride?.triggerCondition === "whenHoldingItem" ? "selected" : ""}>When Holding Any Object</option>
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #cbd5e1; font-weight: 600;">Right Stick:</label>
            <select id="select-pad-right-mode" class="dev-select" style="width: 58%; font-size: 0.74rem;">
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
        <span style="font-size: 0.76rem; color: #38bdf8; font-weight: 600;">📱 Mobile Virtual Joysticks & Action Buttons</span>
        <span style="font-size: 0.70rem; color: #94a3b8; line-height: 1.3;">
          Supports multi-joystick layouts with concentric walk/sprint rings, dynamic follow-drag centers, tap-to-trigger actions, and responsive screen anchors.
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
      return `<div style="text-align: center; color: #64748b; font-size: 0.76rem; padding: 16px; background: rgba(15, 23, 42, 0.4); border-radius: 6px;">No action rules defined for this device. Click "+ Add Rule".</div>`;
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
        <div class="control-rule-card" id="rule-card-${rule.id}" style="display: flex; flex-direction: column; gap: 4px; background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 6px 10px; position: relative; transition: all 0.15s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
            <!-- Status Pip -->
            <span class="rule-status-pip" id="pip-${rule.id}" style="width: 8px; height: 8px; border-radius: 50%; background: #475569; flex-shrink: 0;" title="Matches Live Player Condition"></span>

            <!-- Trigger Button (Press to Bind) -->
            <button class="btn-bind-trigger btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 600; min-width: 110px; text-align: center; ${isListening ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #38bdf8;"}">
              ${isListening ? "🔴 Listening..." : triggerLabel}
            </button>

            <!-- Mode Selector -->
            <select class="select-rule-mode dev-select" data-rule-id="${rule.id}" style="font-size: 0.70rem; padding: 2px 4px; width: 75px;">
              <option value="press" ${rule.trigger.mode === "press" ? "selected" : ""}>Press</option>
              <option value="hold" ${rule.trigger.mode === "hold" ? "selected" : ""}>Hold</option>
              <option value="release" ${rule.trigger.mode === "release" ? "selected" : ""}>Release</option>
            </select>

            <!-- Condition Gate Selector -->
            <select class="select-rule-cond dev-select" data-rule-id="${rule.id}" style="font-size: 0.70rem; padding: 2px 4px; flex: 1;">
              <option value="always" ${rule.condition.type === "always" ? "selected" : ""}>Always</option>
              <option value="holdingObject" ${rule.condition.type === "holdingObject" ? "selected" : ""}>Holding Item</option>
              <option value="holdingItemWithPrimaryAbility" ${rule.condition.type === "holdingItemWithPrimaryAbility" || rule.condition.type === "holdingEdible" ? "selected" : ""}>Holding Item With Ability</option>
              <option value="emptyHanded" ${rule.condition.type === "emptyHanded" ? "selected" : ""}>Empty-Handed</option>
              <option value="targetInReach" ${rule.condition.type === "targetInReach" ? "selected" : ""}>Target in Reach</option>
              <option value="stagedActionIs:laser" ${rule.condition.type === "stagedActionIs" && rule.condition.param === "laser" ? "selected" : ""}>Staged == Laser</option>
              <option value="stagedActionIs:throw" ${rule.condition.type === "stagedActionIs" && rule.condition.param === "throw" ? "selected" : ""}>Staged == Throw</option>
              <option value="stagedActionIs:melee" ${rule.condition.type === "stagedActionIs" && rule.condition.param === "melee" ? "selected" : ""}>Staged == Melee</option>
              <option value="grounded" ${rule.condition.type === "grounded" ? "selected" : ""}>On Ground</option>
              <option value="climbing" ${rule.condition.type === "climbing" ? "selected" : ""}>Climbing Wall</option>
            </select>

            <!-- Delete Rule Button -->
            <button class="btn-delete-rule btn-secondary-action" data-rule-id="${rule.id}" style="padding: 2px 6px; color: #f87171; border-color: rgba(248, 113, 113, 0.3); font-size: 0.72rem;" title="Remove Rule">
              🗑️
            </button>
          </div>

          <!-- Target Action Picker Button -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px; padding-left: 14px;">
            <span style="font-size: 0.70rem; color: #94a3b8;">Action Function:</span>
            <button class="btn-open-action-picker btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.72rem; padding: 2px 8px; color: #facc15; border-color: rgba(250, 204, 21, 0.3); text-align: right;">
              ${actionLabel} ▼
            </button>
          </div>

          <!-- Module Missing Warning Banner -->
          ${
            isModuleMissing
              ? `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(239, 68, 68, 0.12); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.3); margin-top: 2px;">
              <span style="font-size: 0.68rem; color: #f87171;">⚠️ Character lacks ${cat.label} behavior</span>
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

  // --- Event Listeners Attachment ---

  private static attachEventListeners(root: HTMLElement): void {
    if (!this.modalChar || !this.workingSchema) return;

    const char = this.modalChar;
    const schema = this.workingSchema;
    const prefab = char.prefabId ? prefabManager.get(char.prefabId) : undefined;

    // Close button (X)
    root.querySelector("#btn-close-controls-modal")?.addEventListener("click", () => {
      this.closeModal();
    });

    // Cancel / Close button
    root.querySelector("#btn-modal-cancel")?.addEventListener("click", () => {
      this.closeModal();
    });

    // Save & Apply button
    root.querySelector("#btn-modal-save-close")?.addEventListener("click", () => {
      this.saveAndCommit();
    });

    // Prefab Sync & Revert Buttons
    root.querySelector("#btn-revert-controls-from-prefab")?.addEventListener("click", () => {
      if (prefab?.controlSchema) {
        this.workingSchema = JSON.parse(JSON.stringify(prefab.controlSchema));
        this.showToast(`Reset to default ${prefab.name} controls`);
        this.renderActiveView();
      }
    });

    root.querySelector("#btn-make-char-prefab")?.addEventListener("click", async () => {
      const p = prefabManager.createFromEntity(char);
      p.controlSchema = JSON.parse(JSON.stringify(schema));
      char.controlSchema = JSON.parse(JSON.stringify(schema));
      char.prefabId = p.id;
      await DevConfigPersistence.saveControlSchema(this.modalPanel, char, schema);
      this.showToast(`Created Prefab: ${p.name} and saved to project!`);
      this.renderActiveView();
    });

    // 1. Preset Selector
    const selectPreset = root.querySelector("#select-control-preset") as HTMLSelectElement;
    if (selectPreset) {
      selectPreset.addEventListener("change", () => {
        const pId = selectPreset.value;
        const found = BuiltinControlSchemas.find((b) => b.id === pId);
        if (found) {
          this.workingSchema = JSON.parse(JSON.stringify(found));
          this.renderActiveView();
        }
      });
    }

    // 2. Tab Buttons
    root.querySelector("#tab-btn-kbm")?.addEventListener("click", () => {
      this.activeTab = "keyboardMouse";
      this.renderActiveView();
    });
    root.querySelector("#tab-btn-pad")?.addEventListener("click", () => {
      this.activeTab = "gamepad";
      this.renderActiveView();
    });
    root.querySelector("#tab-btn-tch")?.addEventListener("click", () => {
      this.activeTab = "touch";
      this.renderActiveView();
    });

    // 3. Locomotion Mode Selector
    const selectLoco = root.querySelector("#select-loco-mode") as HTMLSelectElement;
    if (selectLoco) {
      selectLoco.addEventListener("change", () => {
        schema.keyboardMouse.locomotion.mode = selectLoco.value as LocomotionParadigm;
        this.renderActiveView();
      });
    }

    // 4. Forward Trigger Bind Button
    const btnFwdTrigger = root.querySelector("#btn-bind-fwd-trigger");
    if (btnFwdTrigger) {
      btnFwdTrigger.addEventListener("click", () => {
        this.startForwardTriggerListening();
      });
    }

    // 4b. Locomotion Key Bind & Clear Buttons
    root.querySelectorAll(".btn-bind-loco-key").forEach((btn) => {
      btn.addEventListener("click", () => {
        const keyName = (btn as HTMLElement).dataset.locoKey as any;
        if (keyName) this.startLocoKeyListening(keyName);
      });
    });

    root.querySelectorAll(".btn-clear-loco-key").forEach((btn) => {
      btn.addEventListener("click", () => {
        const keyName = (btn as HTMLElement).dataset.clearLocoKey as any;
        if (keyName && schema.keyboardMouse.locomotion) {
          delete schema.keyboardMouse.locomotion[keyName as keyof typeof schema.keyboardMouse.locomotion];
          this.renderActiveView();
        }
      });
    });

    // 5. Aim Mode Selector
    const selectAim = root.querySelector("#select-aim-mode") as HTMLSelectElement;
    if (selectAim) {
      selectAim.addEventListener("change", () => {
        schema.keyboardMouse.aiming.mode = selectAim.value as AimingParadigm;
      });
    }

    // 6. Gamepad Left Stick Primary
    const selectPadLeft = root.querySelector("#select-pad-left-primary") as HTMLSelectElement;
    if (selectPadLeft) {
      selectPadLeft.addEventListener("change", () => {
        schema.gamepad.leftStick.primaryMode = selectPadLeft.value as any;
      });
    }

    // 7. Gamepad Dynamic Override
    const selectPadOverride = root.querySelector("#select-pad-dynamic-override") as HTMLSelectElement;
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

    // 8. Gamepad Right Stick Mode
    const selectPadRight = root.querySelector("#select-pad-right-mode") as HTMLSelectElement;
    if (selectPadRight) {
      selectPadRight.addEventListener("change", () => {
        schema.gamepad.rightStick.mode = selectPadRight.value as any;
      });
    }

    // 9. Add Rule Button
    root.querySelector("#btn-add-control-rule")?.addEventListener("click", () => {
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

      this.renderActiveView();
    });

    // 10. Rule Bind Trigger
    root.querySelectorAll(".btn-bind-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        if (rId) {
          this.startRuleTriggerListening(rId);
        }
      });
    });

    // 11. Rule Mode
    root.querySelectorAll(".select-rule-mode").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const rule = this.findRule(schema, rId);
        if (rule) {
          rule.trigger.mode = (e.target as HTMLSelectElement).value as TriggerMode;
        }
      });
    });

    // 12. Rule Condition
    root.querySelectorAll(".select-rule-cond").forEach((sel) => {
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

    // 13. Rule Action Picker Popover
    root.querySelectorAll(".btn-open-action-picker").forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const rId = (btn as HTMLElement).dataset.ruleId;
        if (rId) {
          this.showActionPickerMenu(rId, btn as HTMLElement);
        }
      });
    });

    // 14. Rule Delete
    root.querySelectorAll(".btn-delete-rule").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        this.deleteRule(schema, rId);
        this.renderActiveView();
      });
    });

    // 15. Raw JSON Drawer Toggle & Editor
    root.querySelector("#btn-toggle-json-drawer")?.addEventListener("click", () => {
      this.showJsonEditor = !this.showJsonEditor;
      this.jsonErrorMessage = null;
      this.renderActiveView();
    });

    root.querySelector("#btn-apply-json")?.addEventListener("click", () => {
      const textarea = root.querySelector("#textarea-controls-json") as HTMLTextAreaElement | null;
      if (!textarea) return;
      try {
        const parsed = JSON.parse(textarea.value);
        if (!parsed.id || !parsed.name || !parsed.keyboardMouse || !parsed.gamepad) {
          throw new Error("JSON missing essential ControlSchema properties (id, name, keyboardMouse, gamepad).");
        }
        this.workingSchema = parsed;
        this.jsonErrorMessage = null;
        this.showToast("Parsed & Applied JSON Schema");
        this.renderActiveView();
      } catch (err: any) {
        this.jsonErrorMessage = err.message || "Invalid JSON syntax";
        this.renderActiveView();
      }
    });

    root.querySelector("#btn-copy-json")?.addEventListener("click", () => {
      const textarea = root.querySelector("#textarea-controls-json") as HTMLTextAreaElement | null;
      if (textarea) {
        navigator.clipboard.writeText(textarea.value);
        this.showToast("Copied JSON to clipboard");
      }
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

  // --- "Press Input to Bind" Chord Recorder ---

  private static startRuleTriggerListening(ruleId: string): void {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningRuleId = ruleId;
    this.renderActiveView();

    if (!this.workingSchema) return;
    const rule = this.findRule(this.workingSchema, ruleId);
    if (!rule) return;

    const chord = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape") {
        cleanup();
        this.listeningRuleId = null;
        this.renderActiveView();
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
      this.renderActiveView();
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
      this.renderActiveView();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        this.popoutWindow.removeEventListener("mousedown", onMouseDown, true);
        this.popoutWindow.removeEventListener("contextmenu", onContextMenu, true);
      }
      this.recorderCleanup = null;
    };

    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      this.popoutWindow.addEventListener("mousedown", onMouseDown, true);
      this.popoutWindow.addEventListener("contextmenu", onContextMenu, true);
    }
  }

  private static startForwardTriggerListening(): void {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningForwardTrigger = true;
    this.renderActiveView();

    if (!this.workingSchema) return;
    const schema = this.workingSchema;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape") {
        cleanup();
        this.listeningForwardTrigger = false;
        this.renderActiveView();
        return;
      }

      schema.keyboardMouse.locomotion.forwardTrigger = {
        device: "keyboard",
        code: e.code,
        mode: "hold",
      };
      cleanup();
      this.listeningForwardTrigger = false;
      this.renderActiveView();
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
      this.renderActiveView();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        this.popoutWindow.removeEventListener("mousedown", onMouseDown, true);
        this.popoutWindow.removeEventListener("contextmenu", onContextMenu, true);
      }
      this.recorderCleanup = null;
    };

    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      this.popoutWindow.addEventListener("mousedown", onMouseDown, true);
      this.popoutWindow.addEventListener("contextmenu", onContextMenu, true);
    }
  }

  private static startLocoKeyListening(keyName: "moveForwardKey" | "reverseKey" | "strafeLeftKey" | "strafeRightKey"): void {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningLocoKey = keyName;
    this.renderActiveView();

    if (!this.workingSchema) return;
    const schema = this.workingSchema;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape") {
        cleanup();
        this.listeningLocoKey = null;
        this.renderActiveView();
        return;
      }

      schema.keyboardMouse.locomotion[keyName] = e.code;
      cleanup();
      this.listeningLocoKey = null;
      this.renderActiveView();
    };

    const cleanup = () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
      }
      this.recorderCleanup = null;
    };

    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
    }
  }

  // --- Categorized Action Function Popover ---

  private static showActionPickerMenu(ruleId: string, anchorBtn: HTMLElement): void {
    const activeDoc = this.popoutWindow && !this.popoutWindow.closed ? this.popoutWindow.document : document;
    const existing = activeDoc.getElementById("action-picker-popover");
    if (existing) existing.remove();

    if (!this.modalChar || !this.workingSchema) return;
    const char = this.modalChar;
    const rule = this.findRule(this.workingSchema, ruleId);
    if (!rule) return;

    const { attached, unattached } = ControlActionCatalog.getCategorizedForCharacter(char);

    const popover = activeDoc.createElement("div");
    popover.id = "action-picker-popover";
    popover.style.cssText = `
      position: fixed;
      z-index: 10005;
      background: #090d16;
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 8px;
      padding: 10px;
      max-height: 340px;
      width: 290px;
      overflow-y: auto;
      box-shadow: 0 15px 35px rgba(0,0,0,0.85);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-family: inherit;
    `;

    const rect = anchorBtn.getBoundingClientRect();
    const winHeight = this.popoutWindow && !this.popoutWindow.closed ? this.popoutWindow.innerHeight : window.innerHeight;
    const winWidth = this.popoutWindow && !this.popoutWindow.closed ? this.popoutWindow.innerWidth : window.innerWidth;
    popover.style.top = `${Math.min(winHeight - 360, rect.bottom + 4)}px`;
    popover.style.left = `${Math.max(10, Math.min(winWidth - 310, rect.left - 100))}px`;

    popover.innerHTML = `
      <div style="font-size: 0.74rem; font-weight: 700; color: #38bdf8; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08);">
        Select Target Action Function
      </div>

      <!-- Attached Modules (Prioritized) -->
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 0.66rem; font-weight: 700; color: #34d399; letter-spacing: 0.05em;">⭐ ATTACHED MODULES</span>
        ${attached
          .map(
            (cat) => `
          <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.03); border-radius: 4px; padding: 4px;">
            <span style="font-size: 0.70rem; font-weight: 600; color: #e2e8f0;">${cat.icon} ${cat.label}</span>
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px; padding-left: 6px;">
              ${cat.actions
                .map(
                  (act) => `
                <button class="btn-select-action" data-mod="${cat.id}" data-intent="${act.id}" style="text-align: left; background: none; border: none; color: #94a3b8; font-size: 0.70rem; padding: 3px 4px; border-radius: 3px; cursor: pointer;">
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
          <summary style="font-size: 0.66rem; font-weight: 700; color: #94a3b8; cursor: pointer;">
            📦 OTHER MODULES (${unattached.length})
          </summary>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
            ${unattached
              .map(
                (cat) => `
              <div style="display: flex; flex-direction: column; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 4px;">
                <span style="font-size: 0.68rem; color: #64748b;">${cat.icon} ${cat.label}</span>
                <div style="display: flex; flex-direction: column; gap: 2px; padding-left: 6px;">
                  ${cat.actions
                    .map(
                      (act) => `
                    <button class="btn-select-action" data-mod="${cat.id}" data-intent="${act.id}" style="text-align: left; background: none; border: none; color: #64748b; font-size: 0.68rem; padding: 2px 4px; cursor: pointer;">
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

    activeDoc.body.appendChild(popover);

    popover.querySelectorAll(".btn-select-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mod = (btn as HTMLElement).dataset.mod;
        const intent = (btn as HTMLElement).dataset.intent;
        if (mod && intent) {
          rule.action.moduleId = mod;
          rule.action.intent = intent;
          popover.remove();
          this.renderActiveView();
        }
      });
    });

    const onDocClick = (e: MouseEvent) => {
      if (!popover.contains(e.target as Node) && e.target !== anchorBtn) {
        popover.remove();
        activeDoc.removeEventListener("click", onDocClick);
      }
    };
    setTimeout(() => activeDoc.addEventListener("click", onDocClick), 10);
  }
}
