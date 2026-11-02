import { Character } from "../../../character/Character.js";
import type { DevPanel } from "../../DevPanel.js";
import type {
  ControlSchema,
  ControlRule,
  DeviceChannel,
  LocomotionParadigm,
  AimingParadigm,
  ConditionType,
  ConditionGate,
  StageGroup,
  TriggerMode,
  InputTagBinding,
  InputTriggerBinding,
  ActionInvocation,
  ActionStatement,
  NestedThreadStatement,
  ControlBlock,
  BlockInputSlot,
  LocomotionControlBlock,
  MeleeControlBlock,
  LaserControlBlock,
  ThrowControlBlock,
  ItemInteractionControlBlock,
  FacingControlBlock,
} from "../../../input/schema/ControlSchemaTypes.js";
import {
  DefaultControlSchema,
  DefaultPrebuiltChannels,
  DefaultPipelineBindings,
  DefaultControlBlocks,
  DefaultGamepadControlBlocks,
  BuiltinControlSchemas,
} from "../../../input/schema/presets/DefaultControlSchemas.js";
import { ControlActionCatalog } from "../../../input/schema/ControlActionCatalog.js";
import { ControlSchemaArbiter } from "../../../input/schema/ControlSchemaArbiter.js";
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
  public static popoutWindow: Window | null = null;
  public static isParentReloading: boolean = false;
  private static lastRebindTime: number = 0;
  private static modalOverlay: HTMLElement | null = null;
  private static workingSchema: ControlSchema | null = null;
  private static activeTab: DeviceChannel = "keyboardMouse";
  private static listeningBlockTarget: {
    blockId: string;
    slotName: string;
    gateIdx?: number;
    isMoveKey?: "upKey" | "downKey" | "leftKey" | "rightKey" | "reverseKey" | "strafeLeftKey" | "strafeRightKey";
  } | null = null;
  private static showJsonEditor: boolean = false;
  private static jsonErrorMessage: string | null = null;
  private static collapsedRuleIds: Set<string> = new Set<string>();
  private static listeningTagId: string | null = null;
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

  public static ensureChannels(schema: ControlSchema): void {
    if (!schema) return;
    if (!schema.keyboardMouse.blocks) {
      schema.keyboardMouse.blocks = JSON.parse(JSON.stringify(DefaultControlBlocks));
    }
    if (!schema.gamepad.blocks) {
      schema.gamepad.blocks = JSON.parse(JSON.stringify(DefaultGamepadControlBlocks));
    }
    if (!schema.keyboardMouse.pipeline) {
      schema.keyboardMouse.pipeline = JSON.parse(JSON.stringify(DefaultPipelineBindings));
    }
    if (!schema.pipeline) {
      schema.pipeline = schema.keyboardMouse.pipeline;
    }
    if (!schema.keyboardMouse.channels) {
      schema.keyboardMouse.channels = JSON.parse(JSON.stringify(DefaultPrebuiltChannels));
    }

    const migratePipeline = (pl: any[]) => {
      if (!Array.isArray(pl)) return;
      for (const b of pl) {
        if (b && b.source && (b.source as any).chordModifiers && Array.isArray((b.source as any).chordModifiers)) {
          const chords: string[] = (b.source as any).chordModifiers;
          if (chords.length > 0) {
            if (!b.source.additionalCodes) b.source.additionalCodes = [];
            for (const c of chords) {
              if (c && !b.source.additionalCodes.includes(c)) {
                b.source.additionalCodes.push(c);
              }
            }
          }
          delete (b.source as any).chordModifiers;
        }
      }
    };
    if (schema.keyboardMouse.pipeline) migratePipeline(schema.keyboardMouse.pipeline);
    if (schema.pipeline) migratePipeline(schema.pipeline);
  }

  public static getActiveBlocks(schema: ControlSchema): ControlBlock[] {
    if (this.activeTab === "gamepad") {
      if (!schema.gamepad.blocks) {
        schema.gamepad.blocks = JSON.parse(JSON.stringify(DefaultGamepadControlBlocks));
      }
      return schema.gamepad.blocks!;
    }
    if (!schema.keyboardMouse.blocks) {
      schema.keyboardMouse.blocks = JSON.parse(JSON.stringify(DefaultControlBlocks));
    }
    return schema.keyboardMouse.blocks!;
  }

  public static ensureSchemaTags(schema: ControlSchema): void {
    if (!schema) return;
    this.ensureChannels(schema);
    // 1. Keyboard & Mouse Tags
    if (!schema.keyboardMouse.tags) {
      schema.keyboardMouse.tags = [];
    }
    // Clean up phantom "Always" tags if present
    schema.keyboardMouse.tags = schema.keyboardMouse.tags.filter(
      (t) => t.trigger.code !== "Always" && t.trigger.code !== "None" && Boolean(t.trigger.code)
    );
    const kTags = schema.keyboardMouse.tags;

    // Ensure at least one primary Action tag exists
    if (kTags.length === 0) {
      kTags.push({
        id: "tag-kbm-action",
        name: "Action",
        trigger: { device: "mouse", code: "MouseRight", mode: "hold" },
      });
    }

    for (const rule of schema.keyboardMouse.rules) {
      if (rule.trigger.code === "Always" || rule.trigger.code === "None" || !rule.trigger.code) {
        rule.tagId = undefined;
        continue;
      }
      if (!rule.tagId) {
        let matchingTag: InputTagBinding | undefined = kTags.find(
          (t) =>
            t.trigger.code === rule.trigger.code &&
            t.trigger.device === rule.trigger.device &&
            (t.trigger.chordModifiers?.join(",") ?? "") === (rule.trigger.chordModifiers?.join(",") ?? "")
        );
        if (!matchingTag) {
          const tagId = "tag-kbm-" + Math.random().toString(36).substring(2, 8);
          matchingTag = {
            id: tagId,
            name: rule.name ? rule.name.replace(/\s*\(.*\)/, "").trim() : `${rule.trigger.code}`,
            trigger: {
              device: rule.trigger.device,
              code: rule.trigger.code,
              chordModifiers: rule.trigger.chordModifiers ? [...rule.trigger.chordModifiers] : undefined,
              mode: rule.trigger.mode ?? "press",
            },
          };
          kTags.push(matchingTag);
        }
        rule.tagId = matchingTag.id;
      }
    }

    // 2. Gamepad Tags
    if (!schema.gamepad.tags) {
      schema.gamepad.tags = [];
    }
    schema.gamepad.tags = schema.gamepad.tags.filter(
      (t) => t.trigger.code !== "Always" && t.trigger.code !== "None" && Boolean(t.trigger.code)
    );
    const gpTags = schema.gamepad.tags;

    if (gpTags.length === 0) {
      gpTags.push({
        id: "tag-pad-action",
        name: "Action",
        trigger: { device: "gamepad", code: "GamepadRT", mode: "hold" },
      });
    }

    for (const rule of schema.gamepad.rules) {
      if (rule.trigger.code === "Always" || rule.trigger.code === "None" || !rule.trigger.code) {
        rule.tagId = undefined;
        continue;
      }
      if (!rule.tagId) {
        let matchingTag: InputTagBinding | undefined = gpTags.find((t) => t.trigger.code === rule.trigger.code);
        if (!matchingTag) {
          const tagId = "tag-pad-" + Math.random().toString(36).substring(2, 8);
          matchingTag = {
            id: tagId,
            name: rule.name ? rule.name.replace(/\s*\(.*\)/, "").trim() : `${rule.trigger.code}`,
            trigger: {
              device: "gamepad",
              code: rule.trigger.code,
              mode: rule.trigger.mode ?? "press",
            },
          };
          gpTags.push(matchingTag);
        }
        rule.tagId = matchingTag.id;
      }
    }

    // 3. Touch Tags
    if (!schema.touch.tags) {
      schema.touch.tags = [];
    }
  }

  public static getActiveDeviceTags(schema: ControlSchema): InputTagBinding[] {
    if (this.activeTab === "keyboardMouse") {
      if (!schema.keyboardMouse.tags) schema.keyboardMouse.tags = [];
      return schema.keyboardMouse.tags;
    }
    if (this.activeTab === "gamepad") {
      if (!schema.gamepad.tags) schema.gamepad.tags = [];
      return schema.gamepad.tags;
    }
    if (!schema.touch.tags) schema.touch.tags = [];
    return schema.touch.tags;
  }

  public static getActiveSchema(char: Character): ControlSchema {
    if (char.controlSchema) {
      this.ensureSchemaTags(char.controlSchema);
      return char.controlSchema;
    }
    if (char.prefabId) {
      const prefab = prefabManager.get(char.prefabId);
      if (prefab?.controlSchema) {
        char.controlSchema = JSON.parse(JSON.stringify(prefab.controlSchema));
        this.ensureSchemaTags(char.controlSchema!);
        return char.controlSchema!;
      }
    }
    char.controlSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    this.ensureSchemaTags(char.controlSchema!);
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

    const effectiveCtx = ctx ?? {
      character: char,
      dt: 1 / 60,
      isHoldingItem: Boolean(char.heldObject),
      heldItemIsEdible: Boolean(char.canConsumeHeldObject()),
      heldItemHasPrimaryAbility: Boolean(char.hasPrimaryItemAbility()),
      targetInReach: null,
      isGrounded: Boolean(char.isRestingOnSurface),
      isClimbing: Boolean(char.isClimbing),
      stagedAction: char.stagedAction,
      facingAngle: char.facingAngle ?? 0,
      mouseAimPos: { x: 0, y: 0 },
      reticleAimPos: { x: 0, y: 0 },
      isKeyDown: () => false,
      isMouseButtonDown: () => false,
      isGamepadButtonDown: () => false,
      getGamepadAxis: () => ({ x: 0, y: 0 }),
      schema: this.workingSchema,
    };

    const checkRules = (ruleList: ControlRule[]) => {
      for (const rule of ruleList) {
        const match = ControlSchemaArbiter.evaluateAllConditions(rule, effectiveCtx);
        if (isPopoutActive) {
          const pip = this.popoutWindow!.document.getElementById(`pip-${rule.id}`);
          if (pip) {
            pip.style.background = match ? "#10b981" : "#475569";
            pip.style.boxShadow = match ? "0 0 6px rgba(16, 185, 129, 0.85)" : "none";
          }
        }
        if (isModalActive && this.modalOverlay) {
          const pip = this.modalOverlay.querySelector(`#pip-${rule.id}`) as HTMLElement | null;
          if (pip) {
            pip.style.background = match ? "#10b981" : "#475569";
            pip.style.boxShadow = match ? "0 0 6px rgba(16, 185, 129, 0.85)" : "none";
          }
        }
        for (const stmt of ControlSchemaArbiter.getRuleBody(rule)) {
          if (stmt.type === "nestedThread") {
            checkRules(stmt.rules);
          }
        }
      }
    };
    checkRules(rules);
  }

  // --- Window / Modal Open & Lifecycle ---

  public static getWindowName(char?: Character | null): string {
    return "ControlsSchemaWindow_" + (char?.playerId || "keyboard");
  }

  public static openModal(panel: DevPanel, char: Character): void {
    this.openWindow(panel, char);
  }

  public static openWindow(panel: DevPanel, char: Character): void {
    this.modalChar = char;
    this.modalPanel = panel;
    const schema = this.getActiveSchema(char);
    this.ensureChannels(schema);
    this.workingSchema = JSON.parse(JSON.stringify(schema));
    this.showJsonEditor = false;
    this.jsonErrorMessage = null;
    this.listeningRuleId = null;
    this.listeningForwardTrigger = false;
    this.listeningLocoKey = null;
    this.listeningBlockTarget = null;

    if (typeof document !== "undefined" && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }

    try {
      localStorage.setItem("pcg_controls_popout_open", "true");
    } catch {}

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
      popout = window.open("", this.getWindowName(char), windowFeatures);
    } catch {
      popout = null;
    }

    if (popout && !popout.closed) {
      this.setupPopoutWindow(popout, char);
      return;
    }

    // Fallback: If browser blocked popups, open in-canvas modal dialog
    this.openInCanvasModal(panel, char);
  }

  public static setupPopoutWindow(popout: Window, char: Character): void {
    this.popoutWindow = popout;
    this.isParentReloading = false;
    this.lastRebindTime = Date.now();

    // Close any fallback in-page modal
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }

    try {
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
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: #38bdf8; border-radius: 5px; }
    ::-webkit-scrollbar-thumb:hover { background: #7dd3fc; }
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
  <script>
    (function() {
      function tryRebind() {
        try {
          if (window.opener && window.opener.ControlsInspector && typeof window.opener.ControlsInspector.rebindPopoutWindow === "function") {
            window.opener.ControlsInspector.rebindPopoutWindow(window);
            return true;
          }
        } catch(e) {}
        return false;
      }

      window.addEventListener("DOMContentLoaded", function() {
        setTimeout(tryRebind, 50);
      });

      setInterval(function() {
        try {
          if (!window.opener || window.opener.closed) return;
          if (window.__needsRebind && window.opener.ControlsInspector) {
            window.__needsRebind = false;
            tryRebind();
          }
        } catch(e) {}
      }, 250);
    })();
  </script>
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
        if (!ControlsInspector.isParentReloading) {
          try {
            localStorage.removeItem("pcg_controls_popout_open");
          } catch {}
          ControlsInspector.popoutWindow = null;
        }
      });
    } catch (e) {
      console.warn("Could not setup popout document:", e);
    }

    this.renderActiveView();
  }

  public static restorePopoutIfPreviouslyOpen(panel: DevPanel, char: Character): void {
    let wasOpen = false;
    try {
      wasOpen = localStorage.getItem("pcg_controls_popout_open") === "true";
    } catch {}
    if (!wasOpen) return;

    this.modalChar = char;
    this.modalPanel = panel;
    const windowName = this.getWindowName(char);
    let popout: Window | null = null;
    try {
      popout = window.open("", windowName);
    } catch {
      popout = null;
    }

    if (popout && !popout.closed) {
      const schema = this.getActiveSchema(char);
      this.ensureChannels(schema);
      this.workingSchema = JSON.parse(JSON.stringify(schema));
      this.setupPopoutWindow(popout, char);
    }
  }

  public static rebindPopoutWindow(popout: Window): void {
    if (!popout || popout.closed) return;
    if (Date.now() - this.lastRebindTime < 350) return;
    this.lastRebindTime = Date.now();
    this.popoutWindow = popout;
    this.isParentReloading = false;

    if (!this.modalChar && (window as any).character) {
      this.modalChar = (window as any).character;
    }
    if (!this.modalPanel && (window as any).devPanel) {
      this.modalPanel = (window as any).devPanel;
    }

    if (this.modalChar) {
      const schema = this.getActiveSchema(this.modalChar);
      this.ensureChannels(schema);
      this.workingSchema = JSON.parse(JSON.stringify(schema));
      this.setupPopoutWindow(popout, this.modalChar);
    }
  }

  private static openInCanvasModal(_panel: DevPanel, _char: Character): void {
    if (typeof document !== "undefined" && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }

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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;
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
    try {
      localStorage.removeItem("pcg_controls_popout_open");
    } catch {}
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
    this.listeningBlockTarget = null;
  }

  private static async saveAndCommit(): Promise<void> {
    if (!this.modalChar || !this.workingSchema) return;

    const char = this.modalChar;
    const schema = this.workingSchema;
    const root = this.getRootContainer();

    // Pre-save flush: ensure all live select and input values in the DOM are written to workingSchema
    if (root) {
      root.querySelectorAll(".select-action-stage-group").forEach((sel) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((sel as HTMLElement).dataset.statementIdx ?? "0", 10);
        const val = (sel as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = (stmts[sIdx] as ActionStatement).action;
            act.args = { ...(act.args || {}), group: val };
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
          }
        }
      });
      root.querySelectorAll(".select-action-stage").forEach((sel) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((sel as HTMLElement).dataset.statementIdx ?? "0", 10);
        const val = (sel as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = (stmts[sIdx] as ActionStatement).action;
            act.args = { ...(act.args || {}), stage: val };
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
          }
        }
      });
      root.querySelectorAll(".select-cond-stage-group").forEach((sel) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const cPath = (sel as HTMLElement).dataset.condPath ?? "";
        const val = (sel as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.stageGroup = val;
          }
        }
      });
      root.querySelectorAll(".select-cond-stage").forEach((sel) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const cPath = (sel as HTMLElement).dataset.condPath ?? "";
        const val = (sel as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
          }
        }
      });
      root.querySelectorAll(".input-cond-param").forEach((inp) => {
        const rId = (inp as HTMLElement).dataset.ruleId;
        const cPath = (inp as HTMLElement).dataset.condPath ?? "";
        const val = (inp as HTMLInputElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
          }
        }
      });
    }

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

    const existingBody = root.querySelector("#controls-scroll-body") as HTMLElement | null;
    const prevScrollTop = existingBody ? existingBody.scrollTop : 0;

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
        background: #0b1120;
        ${isPopout ? "height: 100%; border: none; border-radius: 0;" : "border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 10px; width: 880px; max-width: 96vw; height: min(900px, calc(100vh - 28px)); max-height: calc(100vh - 28px);"}
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #ffffff;
        box-shadow: ${isPopout ? "none" : "0 25px 60px rgba(0, 0, 0, 0.85)"};
      ">
        <style>
          #controls-scroll-body::-webkit-scrollbar { width: 10px; height: 10px; }
          #controls-scroll-body::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 5px; }
          #controls-scroll-body::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.35); border-radius: 5px; border: 2px solid rgba(15, 23, 42, 0.6); }
          #controls-scroll-body::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.55); }
        </style>
        <!-- Title Bar / Header -->
        <div style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: rgba(15, 23, 42, 0.98); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.15rem;">🎮</span>
            <div>
              <div style="font-weight: 700; font-size: 0.94rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                Controls Schema: <span style="color: #ffffff;">${char.name || "Character"}</span>
                <span class="badge" style="background: rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">ID: ${char.id}</span>
                ${isPopout ? `<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">🪟 Separate Window</span>` : ""}
              </div>
            </div>
          </div>
          <button id="btn-close-controls-modal" class="btn-secondary-action" style="padding: 4px 10px; font-size: 0.82rem; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: transparent;" title="Close Window">✕ Close</button>
        </div>

        <!-- Subheader: Linked Prefab Bar & Preset Selector -->
        <div style="flex-shrink: 0; padding: 10px 18px; background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(148, 163, 184, 0.15); display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px; padding: 6px 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.76rem; color: #94a3b8; font-weight: 600;">Linked Archetype:</span>
              <span style="font-size: 0.78rem; color: #ffffff; font-weight: 600;">${prefabName || "(Standalone Character)"}</span>
              ${prefab ? `<span class="badge" style="background: rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">Auto-Persists to Prefab on Save</span>` : ""}
            </div>
            <div style="display: flex; gap: 6px;">
              ${
                prefab
                  ? `
                <button id="btn-revert-controls-from-prefab" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05);" title="Discard unsaved changes and reload clean controls from prefab archetype">↺ Reset to Prefab Defaults</button>
              `
                  : `
                <button id="btn-make-char-prefab" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05);" title="Turn this character into a reusable Character Prefab with this control schema">📦 Save as New Prefab</button>
              `
              }
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <label style="font-size: 0.78rem; font-weight: 600; color: #94a3b8; white-space: nowrap;">Preset Template:</label>
            <select id="select-control-preset" class="dev-select" style="flex: 1; font-size: 0.76rem; color: #ffffff; background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.25);">
              ${BuiltinControlSchemas.map(
                (p) => `<option value="${p.id}" ${p.id === schema.id ? "selected" : ""}>${p.name}</option>`
              ).join("")}
              <option value="custom" ${!BuiltinControlSchemas.some((b) => b.id === schema.id) ? "selected" : ""}>Custom (User Modified)</option>
            </select>
          </div>
        </div>

        <!-- Device Channel Tabs -->
        <div style="flex-shrink: 0; display: flex; gap: 4px; padding: 8px 18px 0 18px; background: rgba(15, 23, 42, 0.5);">
          <button id="tab-btn-kbm" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "keyboardMouse" ? "background: #0f172a; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); border-bottom: 2px solid #ffffff;" : "background: transparent; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2);"}" >
            ⌨️ Keyboard & Mouse
          </button>
          <button id="tab-btn-pad" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "gamepad" ? "background: #0f172a; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); border-bottom: 2px solid #ffffff;" : "background: transparent; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2);"}" >
            🎮 Gamepad
          </button>
          <button id="tab-btn-tch" class="btn-secondary-action" style="flex: 1; font-size: 0.78rem; padding: 7px 12px; font-weight: 600; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; ${this.activeTab === "touch" ? "background: #0f172a; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); border-bottom: 2px solid #ffffff;" : "background: transparent; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2);"}" >
            📱 Mobile Touch
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div id="controls-scroll-body" style="flex: 1 1 0px; min-height: 0; overflow-y: scroll; scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.4) rgba(15, 23, 42, 0.6); padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; background: #090d16;">
          
          ${this.activeTab === "keyboardMouse" || this.activeTab === "gamepad" ? `
            ${this.renderBlocksHtml(schema)}
          ` : `
            <!-- Touch Locomotion Paradigm Section -->
            <div id="section-locomotion" style="background: rgba(15, 23, 42, 0.85); border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.25); padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(148, 163, 184, 0.15); padding-bottom: 8px;">
                <span style="font-size: 0.84rem; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                  📱 Touch Locomotion & Widgets
                </span>
              </div>
              <div id="controls-paradigms-container">
                ${this.renderParadigmsHtml(schema)}
              </div>
            </div>

            <!-- Rules Matrix Header -->
            <div id="section-rules-header" style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 6px; border-top: 1px solid rgba(148, 163, 184, 0.15);">
              <span style="font-size: 0.80rem; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                ⚡ Action Threads (${activeRulesCount} branches)
              </span>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button id="btn-add-control-rule" class="btn-secondary-action" type="button" style="font-size: 0.74rem; padding: 4px 12px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(255, 255, 255, 0.08); font-weight: 600;">
                  + Add Rule
                </button>
              </div>
            </div>

            <!-- Rules List Container -->
            <div id="rules-list-container" style="display: flex; flex-direction: column; gap: 8px;">
              ${this.renderRulesListHtml(char, schema)}
            </div>
          `}

          <!-- Collapsible Raw JSON Editor Drawer -->
          <div style="margin-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button id="btn-toggle-json-drawer" class="btn-secondary-action" type="button" style="font-size: 0.74rem; padding: 4px 10px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: transparent;">
                ${this.showJsonEditor ? "▲ Hide Raw JSON" : "📋 View / Edit Raw JSON"}
              </button>
              <span style="font-size: 0.70rem; color: #64748b;">Direct JSON Schema inspection & export</span>
            </div>

            ${
              this.showJsonEditor
                ? `
              <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 6px; padding: 8px;">
                ${
                  this.jsonErrorMessage
                    ? `<div style="color: #ffffff; font-size: 0.72rem; background: rgba(239, 68, 68, 0.2); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.4);">⚠️ ${this.jsonErrorMessage}</div>`
                    : ""
                }
                <textarea id="textarea-controls-json" style="width: 100%; height: 200px; font-family: monospace; font-size: 0.72rem; background: #090d16; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 4px; padding: 8px; resize: vertical; box-sizing: border-box;" spellcheck="false">${JSON.stringify(
                    schema,
                    null,
                    2
                  )}</textarea>
                <div style="display: flex; justify-content: flex-end; gap: 6px;">
                  <button id="btn-copy-json" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 8px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.25); background: transparent;">📋 Copy JSON</button>
                  <button id="btn-apply-json" class="btn-secondary-action" style="font-size: 0.72rem; padding: 3px 12px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(255, 255, 255, 0.08); font-weight: 600;">Apply JSON Changes</button>
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Footer Bar -->
        <div style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: rgba(15, 23, 42, 0.98); border-top: 1px solid rgba(148, 163, 184, 0.15);">
          <div style="font-size: 0.74rem; color: #94a3b8;">
            Schema: <strong style="color: #ffffff;">${schema.name}</strong>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="btn-modal-cancel" class="btn-secondary-action" style="padding: 6px 14px; font-size: 0.78rem; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); background: transparent;">Close</button>
            <button id="btn-modal-save-close" class="btn-secondary-action" style="padding: 6px 18px; font-size: 0.78rem; font-weight: 700; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.4); background: rgba(255, 255, 255, 0.12);" title="Saves live controls, updates the linked prefab archetype, and permanently persists to worldConfig.json on disk">
              💾 Save & Apply
            </button>
          </div>
        </div>
      </div>
    `;

    root.innerHTML = dialogHtml;
    if (prevScrollTop > 0) {
      const newBody = root.querySelector("#controls-scroll-body") as HTMLElement | null;
      if (newBody) newBody.scrollTop = prevScrollTop;
    }
    this.attachEventListeners(root);
  }

  // --- Sub-Section HTML Builders ---

  public static renderTagsSectionHtml(schema: ControlSchema): string {
    const tags = this.getActiveDeviceTags(schema);
    if (tags.length === 0) {
      return `
        <div style="text-align: center; color: #94a3b8; font-size: 0.74rem; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">
          No action keybind tags defined yet. Click "+ Add Keybind Tag" to create one.
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button id="btn-add-tag" class="btn-secondary-action" type="button" style="font-size: 0.72rem; padding: 3px 10px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.05);">
            + Add Keybind Tag
          </button>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: grid; grid-template-columns: 1fr 150px 32px; gap: 8px; font-size: 0.68rem; font-weight: 700; color: #94a3b8; padding: 0 4px;">
          <span>ACTION NAME</span>
          <span>KEY / BUTTON BIND</span>
          <span></span>
        </div>
        ${tags.map((tag) => {
          const isListening = this.listeningTagId === tag.id;
          const triggerLabel = this.formatTriggerLabel(tag);
          return `
            <div class="keybind-tag-row" style="display: grid; grid-template-columns: 1fr 150px 32px; gap: 8px; align-items: center; background: rgba(0,0,0,0.25); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 4px; padding: 4px 6px;">
              <input type="text" class="input-tag-name dev-input" data-tag-id="${tag.id}" value="${tag.name}" placeholder="e.g. Action, Sprint, Aim, Jump..." style="font-size: 0.74rem; padding: 2px 6px; font-weight: 600; color: #ffffff; background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.25);" />
              <button class="btn-bind-tag btn-secondary-action" data-tag-id="${tag.id}" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 600; text-align: center; border: 1px solid rgba(148, 163, 184, 0.25); ${isListening ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #ffffff; background: rgba(255, 255, 255, 0.05);"}" title="Click to bind key or mouse button">
                ${isListening ? "🔴 Press key..." : triggerLabel}
              </button>
              <button class="btn-delete-tag btn-secondary-action" data-tag-id="${tag.id}" style="padding: 2px 4px; color: #94a3b8; font-size: 0.70rem; border: 1px solid rgba(148, 163, 184, 0.2); background: transparent;" title="Delete Tag">
                🗑️
              </button>
            </div>
          `;
        }).join("")}
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button id="btn-add-tag" class="btn-secondary-action" type="button" style="font-size: 0.72rem; padding: 3px 10px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.05);">
            + Add Keybind Tag
          </button>
        </div>
      </div>
    `;
  }

  public static getActiveStageGroups(schema: ControlSchema): StageGroup[] {
    if (!schema.stageGroups || !Array.isArray(schema.stageGroups) || schema.stageGroups.length === 0) {
      if (schema.stages && Array.isArray(schema.stages) && schema.stages.length > 0) {
        schema.stageGroups = [{ name: "default", stages: [...schema.stages] }];
      } else {
        schema.stageGroups = [{ name: "default", stages: ["none"] }];
      }
    }
    for (const g of schema.stageGroups) {
      if (!g.stages || !Array.isArray(g.stages) || g.stages.length === 0) {
        g.stages = ["none"];
      } else if (!g.stages.includes("none")) {
        g.stages.unshift("none");
      } else if (g.stages[0] !== "none") {
        g.stages = ["none", ...g.stages.filter((s) => s !== "none")];
      }
    }
    schema.stages = schema.stageGroups[0].stages;
    return schema.stageGroups;
  }

  public static getStagesForGroup(schema: ControlSchema, groupName?: string): string[] {
    const groups = this.getActiveStageGroups(schema);
    const g = groups.find((grp) => grp.name === (groupName || "default")) || groups[0];
    return g ? g.stages : ["none"];
  }

  public static getActiveStages(schema: ControlSchema): string[] {
    return this.getActiveStageGroups(schema)[0].stages;
  }

  private static renameStageGroupInRules(schema: ControlSchema, oldGroupName: string, newGroupName: string): void {
    const processRule = (rule: ControlRule) => {
      const conds = ControlSchemaArbiter.getRuleConditions(rule);
      let condsChanged = false;
      const updateCond = (cond: ConditionGate) => {
        if (cond.type === "stagedActionIs" && (cond.stageGroup === oldGroupName || (!cond.stageGroup && oldGroupName === "default"))) {
          cond.stageGroup = newGroupName;
          condsChanged = true;
        }
        if (cond.type === "group" && cond.conditions) {
          for (const sub of cond.conditions) {
            updateCond(sub);
          }
        }
      };
      for (const cond of conds) {
        updateCond(cond);
      }
      if (condsChanged) {
        rule.conditions = conds;
        rule.condition = conds[0];
      }

      const stmts = ControlSchemaArbiter.getRuleBody(rule);
      let stmtsChanged = false;
      for (const stmt of stmts) {
        if (stmt.type === "action") {
          if (stmt.action.moduleId === "staging" && stmt.action.intent === "setStage") {
            if (stmt.action.args?.group === oldGroupName || (!stmt.action.args?.group && oldGroupName === "default")) {
              stmt.action.args = { ...(stmt.action.args || {}), group: newGroupName };
              stmtsChanged = true;
            }
          }
        } else if (stmt.type === "nestedThread") {
          for (const childRule of stmt.rules) {
            processRule(childRule);
          }
        }
      }
      if (stmtsChanged) {
        rule.body = stmts;
        ControlSchemaArbiter.syncRuleFromStatements(rule);
      }
    };

    if (schema.keyboardMouse?.rules) {
      for (const r of schema.keyboardMouse.rules) processRule(r);
    }
    if (schema.gamepad?.rules) {
      for (const r of schema.gamepad.rules) processRule(r);
    }
    if (schema.touch?.rules) {
      for (const r of schema.touch.rules) processRule(r);
    }
  }

  private static renameStageInRules(schema: ControlSchema, groupName: string, oldName: string, newName: string): void {
    const processRule = (rule: ControlRule) => {
      const conds = ControlSchemaArbiter.getRuleConditions(rule);
      let condsChanged = false;
      const updateCond = (cond: ConditionGate) => {
        const matchesGroup = (cond.stageGroup || "default") === (groupName || "default");
        if (cond.type === "stagedActionIs" && matchesGroup && (cond.param === oldName || (!cond.param && oldName === "none"))) {
          cond.param = newName;
          condsChanged = true;
        }
        if (cond.type === "group" && cond.conditions) {
          for (const sub of cond.conditions) {
            updateCond(sub);
          }
        }
      };
      for (const cond of conds) {
        updateCond(cond);
      }
      if (condsChanged) {
        rule.conditions = conds;
        rule.condition = conds[0];
      }

      const stmts = ControlSchemaArbiter.getRuleBody(rule);
      let stmtsChanged = false;
      for (const stmt of stmts) {
        if (stmt.type === "action") {
          if (stmt.action.moduleId === "staging" && stmt.action.intent === "setStage") {
            const matchesGroup = (stmt.action.args?.group || "default") === (groupName || "default");
            if (matchesGroup && (stmt.action.args?.stage === oldName || (!stmt.action.args?.stage && oldName === "none"))) {
              stmt.action.args = { ...(stmt.action.args || {}), stage: newName };
              stmtsChanged = true;
            }
          }
        } else if (stmt.type === "nestedThread") {
          for (const childRule of stmt.rules) {
            processRule(childRule);
          }
        }
      }
      if (stmtsChanged) {
        rule.body = stmts;
        ControlSchemaArbiter.syncRuleFromStatements(rule);
      }
    };

    if (schema.keyboardMouse?.rules) {
      for (const r of schema.keyboardMouse.rules) processRule(r);
    }
    if (schema.gamepad?.rules) {
      for (const r of schema.gamepad.rules) processRule(r);
    }
    if (schema.touch?.rules) {
      for (const r of schema.touch.rules) processRule(r);
    }
  }

  private static deleteStageGroupInRules(schema: ControlSchema, deletedGroupName: string): void {
    const firstGroup = schema.stageGroups?.[0]?.name || "default";
    this.renameStageGroupInRules(schema, deletedGroupName, firstGroup);
  }

  private static deleteStageInRules(schema: ControlSchema, groupName: string, deletedStageName: string): void {
    this.renameStageInRules(schema, groupName, deletedStageName, "none");
  }

  public static getConditionListAndIndex(rule: ControlRule, pathStr: string): { list: ConditionGate[]; index: number } | null {
    if (!pathStr && pathStr !== "0") return null;
    const parts = pathStr.split(".").map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    const conds = ControlSchemaArbiter.getRuleConditions(rule);
    let currentList = conds;
    for (let i = 0; i < parts.length - 1; i++) {
      const idx = parts[i];
      const parentGate = currentList[idx];
      if (!parentGate || parentGate.type !== "group" || !parentGate.conditions) {
        return null;
      }
      currentList = parentGate.conditions;
    }
    return { list: currentList, index: parts[parts.length - 1] };
  }

  public static getConditionByPath(rule: ControlRule, pathStr: string): ConditionGate | null {
    const res = this.getConditionListAndIndex(rule, pathStr);
    if (!res || !res.list[res.index]) return null;
    return res.list[res.index];
  }

  public static getConditionGroupList(rule: ControlRule, pathStr: string): { list: ConditionGate[]; group?: ConditionGate } | null {
    const conds = ControlSchemaArbiter.getRuleConditions(rule);
    if (!pathStr || pathStr.trim() === "") {
      return { list: conds };
    }
    const parts = pathStr.split(".").map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    let currentGroup: ConditionGate | undefined;
    let currentList = conds;
    for (let i = 0; i < parts.length; i++) {
      const idx = parts[i];
      currentGroup = currentList[idx];
      if (!currentGroup || currentGroup.type !== "group" || !currentGroup.conditions) {
        return null;
      }
      currentList = currentGroup.conditions;
    }
    return { list: currentList, group: currentGroup };
  }

  public static renderStagesSectionHtml(schema: ControlSchema): string {
    const stageGroups = this.getActiveStageGroups(schema);
    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${stageGroups
          .map((group, gIdx) => `
          <div class="stage-group-card" style="display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(167, 139, 250, 0.25); border-radius: 6px; padding: 7px 9px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; border-bottom: 1px solid rgba(167, 139, 250, 0.2); padding-bottom: 5px;">
              <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                <span style="font-size: 0.74rem;">📁</span>
                <span style="font-size: 0.66rem; font-weight: 700; color: #a78bfa; text-transform: uppercase;">SET:</span>
                <input
                  type="text"
                  class="input-stage-group-name dev-input"
                  data-group-idx="${gIdx}"
                  value="${group.name}"
                  placeholder="Set name (e.g. default, stance)..."
                  style="font-size: 0.72rem; padding: 2px 6px; font-weight: 700; color: #ffffff; background: #0f172a; border: 1px solid rgba(167, 139, 250, 0.35); max-width: 140px;"
                />
                ${gIdx === 0 ? `<span style="font-size: 0.62rem; color: #64748b; font-style: italic;">(Primary Set)</span>` : ""}
              </div>
              <div>
                ${stageGroups.length > 1 ? `
                  <button class="btn-delete-stage-group btn-secondary-action" data-group-idx="${gIdx}" style="padding: 2px 6px; color: #f87171; font-size: 0.66rem; border: 1px solid rgba(248, 113, 113, 0.3); background: transparent; cursor: pointer;" title="Delete Stage Set">
                    🗑️ Delete Set
                  </button>
                ` : ""}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 4px;">
              ${group.stages
                .map((stg, sIdx) => {
                  const isNone = stg === "none";
                  return `
                  <div class="control-stage-row" style="display: grid; grid-template-columns: 1fr 32px; gap: 8px; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 4px; padding: 3px 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 0.70rem;">🎭</span>
                      <input
                        type="text"
                        class="input-stage-name dev-input"
                        data-group-idx="${gIdx}"
                        data-stage-idx="${sIdx}"
                        value="${stg}"
                        placeholder="Stage name..."
                        ${isNone ? "disabled" : ""}
                        style="font-size: 0.72rem; padding: 2px 6px; font-weight: 600; color: ${isNone ? "#94a3b8" : "#ffffff"}; background: ${isNone ? "rgba(255,255,255,0.03)" : "#0f172a"}; border: 1px solid rgba(148, 163, 184, 0.25); flex: 1;"
                      />
                      ${isNone ? `<span style="font-size: 0.62rem; color: #64748b; font-style: italic; white-space: nowrap;">(Immutable Default)</span>` : ""}
                    </div>
                    <div>
                      ${!isNone ? `
                        <button class="btn-delete-stage btn-secondary-action" data-group-idx="${gIdx}" data-stage-idx="${sIdx}" style="padding: 2px 4px; color: #94a3b8; font-size: 0.68rem; border: 1px solid rgba(148, 163, 184, 0.2); background: transparent; cursor: pointer;" title="Delete Stage">
                          🗑️
                        </button>
                      ` : ""}
                    </div>
                  </div>
                `;
                })
                .join("")}
              <div style="display: flex; justify-content: flex-start; margin-top: 2px;">
                <button class="btn-add-stage btn-secondary-action" data-group-idx="${gIdx}" type="button" style="font-size: 0.68rem; padding: 2px 8px; color: #ffffff; border: 1px dashed rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.03); cursor: pointer;">
                  + Add Stage to "${group.name}"
                </button>
              </div>
            </div>
          </div>
        `).join("")}
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button id="btn-add-stage-group" class="btn-secondary-action" type="button" style="font-size: 0.72rem; padding: 3px 10px; color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.35); background: rgba(167, 139, 250, 0.08); cursor: pointer;">
            + Add Stage Set
          </button>
        </div>
      </div>
    `;
  }

  public static formatChannelKeyLabel(code: string, chordModifiers?: string[]): string {
    if (!code) return "None";
    let base = code;
    if (base.startsWith("Gamepad")) {
      switch (base) {
        case "GamepadA": return "A (South)";
        case "GamepadB": return "B (East)";
        case "GamepadX": return "X (West)";
        case "GamepadY": return "Y (North)";
        case "GamepadLB": return "LB";
        case "GamepadRB": return "RB";
        case "GamepadLT": return "LT";
        case "GamepadRT": return "RT";
        case "GamepadLS": return "LS (Click)";
        case "GamepadRS": return "RS (Click)";
        case "GamepadDpadUp": return "D-Pad Up";
        case "GamepadDpadDown": return "D-Pad Down";
        case "GamepadDpadLeft": return "D-Pad Left";
        case "GamepadDpadRight": return "D-Pad Right";
        case "GamepadStart": return "Start";
        case "GamepadBack": return "Select / Back";
        default: return base.replace("Gamepad", "Pad ");
      }
    }
    if (base.startsWith("Key")) base = base.substring(3);
    else if (base.startsWith("Digit")) base = base.substring(5);
    else if (base === "MouseLeft") base = "LMB";
    else if (base === "MouseRight") base = "RMB";
    else if (base === "MouseMiddle") base = "MMB";
    else if (base === "Space") base = "Space";
    else if (base === "ShiftLeft") base = "Shift";
    else if (base === "ControlLeft") base = "Ctrl";
    else if (base === "AltLeft") base = "Alt";
    else if (base === "ArrowUp") base = "↑";
    else if (base === "ArrowDown") base = "↓";
    else if (base === "ArrowLeft") base = "←";
    else if (base === "ArrowRight") base = "→";

    if (chordModifiers && chordModifiers.length > 0) {
      const mods = chordModifiers.map((m) => {
        if (m.startsWith("Alt")) return "Alt";
        if (m.startsWith("Shift")) return "Shift";
        if (m.startsWith("Control") || m.startsWith("Ctrl")) return "Ctrl";
        return m;
      });
      return `${mods.join(" + ")} + ${base}`;
    }
    return base;
  }

  private static defaultCleanForSlot(slotName: string): boolean {
    if (
      slotName === "forwardTrigger" ||
      slotName === "sprint" ||
      slotName === "aimTrigger" ||
      slotName === "consume"
    ) {
      return false;
    }
    return true;
  }

  private static renderInputSlot(
    blockId: string,
    slotName: string,
    slot?: BlockInputSlot | null,
    labelPrefix: string = ""
  ): string {
    const isListeningPrimary =
      this.listeningBlockTarget &&
      this.listeningBlockTarget.blockId === blockId &&
      this.listeningBlockTarget.slotName === slotName &&
      this.listeningBlockTarget.gateIdx === undefined &&
      !this.listeningBlockTarget.isMoveKey;

    const code = slot?.code;
    const label = code ? this.formatChannelKeyLabel(code) : "None (Unassigned)";
    const gateButtons = slot?.gateButtons || [];
    const isClean = slot?.requireCleanPress !== undefined
      ? Boolean(slot.requireCleanPress)
      : this.defaultCleanForSlot(slotName);

    return `
      <div style="display: flex; flex-direction: column; gap: 3px;">
        ${labelPrefix ? `<span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">${labelPrefix}</span>` : ""}
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px;">
          <!-- Primary Input Slot Badge -->
          <div style="display: inline-flex; align-items: center; gap: 2px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; padding: 1px 4px;">
            <button class="btn-block-slot-bind btn-secondary-action" data-block-id="${blockId}" data-slot-name="${slotName}" type="button" style="
              font-size: 0.72rem;
              padding: 2px 6px;
              font-weight: 600;
              border: none;
              background: transparent;
              ${isListeningPrimary ? "color: #ef4444; font-weight: 700; animation: pulse 1s infinite;" : (code ? "color: #fff;" : "color: #64748b; font-style: italic;")}
            " title="Click to bind key or mouse button">
              ${isListeningPrimary ? "🔴 Press button / key..." : (code ? (code.startsWith("Gamepad") ? `🎮 ${label}` : code.startsWith("Mouse") ? `🖱️ ${label}` : `⌨️ ${label}`) : "🚫 None (Unassigned)")}
            </button>
            ${code ? `
              <button class="btn-block-slot-clear" data-block-id="${blockId}" data-slot-name="${slotName}" type="button" style="
                font-size: 0.64rem;
                color: #ef4444;
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0 3px;
                line-height: 1;
              " title="Clear this input (disable completely)">✕</button>
            ` : ""}
          </div>

          <!-- Gate Hold Keys Badges -->
          ${gateButtons.map((gCode, gIdx) => {
            const isListeningGate =
              this.listeningBlockTarget &&
              this.listeningBlockTarget.blockId === blockId &&
              this.listeningBlockTarget.slotName === slotName &&
              this.listeningBlockTarget.gateIdx === gIdx;
            const gLabel = this.formatChannelKeyLabel(gCode);
            return `
              <div style="display: inline-flex; align-items: center; gap: 2px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 4px; padding: 1px 4px;">
                <span style="font-size: 0.62rem; color: #38bdf8; font-weight: 700;">+</span>
                <button class="btn-block-slot-gate-bind btn-secondary-action" data-block-id="${blockId}" data-slot-name="${slotName}" data-gate-idx="${gIdx}" type="button" style="
                  font-size: 0.68rem;
                  padding: 1px 4px;
                  font-weight: 600;
                  border: none;
                  background: transparent;
                  color: #fff;
                  ${isListeningGate ? "color: #ef4444; font-weight: 700;" : ""}
                " title="Click to rebind held gate button">
                  ${isListeningGate ? "🔴 Press..." : (gCode.startsWith("Gamepad") ? `🎮 ${gLabel}` : gCode.startsWith("Mouse") ? `🖱️ ${gLabel}` : `⌨️ ${gLabel}`)}
                </button>
                <button class="btn-block-slot-gate-remove" data-block-id="${blockId}" data-slot-name="${slotName}" data-gate-idx="${gIdx}" type="button" style="
                  font-size: 0.62rem;
                  color: #ef4444;
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  padding: 0 2px;
                  line-height: 1;
                " title="Remove this held button requirement">✕</button>
              </div>
            `;
          }).join("")}

          <!-- Add Gate Button Button -->
          <button class="btn-block-slot-add-gate btn-secondary-action" data-block-id="${blockId}" data-slot-name="${slotName}" type="button" style="
            font-size: 0.60rem;
            font-weight: 600;
            padding: 2px 5px;
            background: rgba(56, 189, 248, 0.08);
            border: 1px dashed rgba(56, 189, 248, 0.4);
            color: #38bdf8;
            border-radius: 3px;
            cursor: pointer;
          " title="Require an additional held button for this action">+ Key</button>

          <!-- Clean Press Toggle Checkbox -->
          <label style="display: inline-flex; align-items: center; gap: 3px; margin-left: 6px; cursor: pointer; user-select: none;" title="Require clean press: button must be released before triggering this action again (prevents continuous auto-repeat)">
            <input type="checkbox" class="block-slot-clean-toggle" data-block-id="${blockId}" data-slot-name="${slotName}" ${isClean ? "checked" : ""} style="cursor: pointer; width: 12px; height: 12px; accent-color: #38bdf8;" />
            <span style="font-size: 0.62rem; font-weight: 600; ${isClean ? "color: #38bdf8;" : "color: #64748b;"}">Clean</span>
          </label>
        </div>
      </div>
    `;
  }

  private static renderBlockBodyHtml(block: ControlBlock): string {
    switch (block.type) {
      case "locomotion": {
        const b = block as LocomotionControlBlock;
        b.mode = b.mode || "wasd";
        b.moveKeys = b.moveKeys || { upKey: "KeyW", downKey: "KeyS", leftKey: "KeyA", rightKey: "KeyD" };
        b.forwardTrigger = b.forwardTrigger || { code: "MouseRight" };
        b.reverseKey = b.reverseKey !== undefined ? b.reverseKey : "KeyS";
        b.strafeLeftKey = b.strafeLeftKey !== undefined ? b.strafeLeftKey : "KeyA";
        b.strafeRightKey = b.strafeRightKey !== undefined ? b.strafeRightKey : "KeyD";
        b.cursorSteerTrigger = b.cursorSteerTrigger || { code: "GamepadLB" };
        b.cursorSteerMode = b.cursorSteerMode || "whenHoldingButton";
        b.jump = b.jump || { code: "Space" };
        b.sprint = b.sprint || { code: "ShiftLeft", mode: "hold" };

        const renderMoveKey = (dir: string, keyName: "upKey" | "downKey" | "leftKey" | "rightKey" | "reverseKey" | "strafeLeftKey" | "strafeRightKey") => {
          const isListening = this.listeningBlockTarget?.blockId === b.id && this.listeningBlockTarget?.isMoveKey === keyName;
          const code = (keyName === "reverseKey" || keyName === "strafeLeftKey" || keyName === "strafeRightKey")
            ? (b as any)[keyName]
            : b.moveKeys![keyName];
          const lbl = code ? this.formatChannelKeyLabel(code) : "None";
          return `
            <div style="display: inline-flex; align-items: center; gap: 2px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; padding: 1px 4px;">
              <span style="font-size: 0.64rem; color: #94a3b8; font-weight: 700;">${dir}</span>
              <button class="btn-block-move-key btn-secondary-action" data-block-id="${b.id}" data-move-key="${keyName}" type="button" style="
                font-size: 0.68rem; padding: 2px 6px; font-weight: 600; border: none; background: transparent; ${isListening ? "color: #ef4444; font-weight: 700;" : (code ? "color: #fff;" : "color: #64748b; font-style: italic;")}
              ">${isListening ? "🔴 Press..." : lbl}</button>
              ${code ? `<button class="btn-block-move-key-clear" data-block-id="${b.id}" data-move-key="${keyName}" type="button" style="font-size: 0.62rem; color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 0 2px;">✕</button>` : ""}
            </div>
          `;
        };

        return `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #38bdf8;">Locomotion Mode:</span>
              <select class="block-loco-mode dev-select" data-block-id="${b.id}" style="font-size: 0.72rem; padding: 3px 8px; background: #0f172a; color: #fff; border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;">
                <option value="stickDirectionDriveButton" ${b.mode === "stickDirectionDriveButton" ? "selected" : ""}>🕹️ Stick Controls Direction (Hold Button to Move Forward)</option>
                <option value="analogStick" ${b.mode === "analogStick" ? "selected" : ""}>🕹️ Left Stick Direct Analog Movement (Stick directly walks player)</option>
                <option value="wasd" ${b.mode === "wasd" || !b.mode ? "selected" : ""}>🎮 Directional Buttons / Keys (WASD / D-Pad Buttons)</option>
                <option value="walkToMouse" ${b.mode === "walkToMouse" ? "selected" : ""}>🖱️ Walk to Mouse (Forward Drive Toward Cursor)</option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; align-items: start;">
              ${b.mode === "analogStick" ? `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="font-size: 0.64rem; color: #94a3b8; font-weight: 600;">
                    🕹️ Left Stick Direct Movement
                  </div>
                  <div style="font-size: 0.60rem; color: #64748b; line-height: 1.3;">
                    Left stick directly accelerates the creature in full 360° analog directions.
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 2px;">
                    <div>
                      ${this.renderInputSlot(b.id, "cursorSteerTrigger", b.cursorSteerTrigger, "Cursor Steering Button (e.g. GamepadLB)")}
                    </div>
                    <div>
                      <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Cursor Steer Mode</span>
                      <select class="block-loco-cursor-mode dev-select" data-block-id="${b.id}" style="margin-top: 4px; font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px; width: 100%;">
                        <option value="toggleButton" ${b.cursorSteerMode === "toggleButton" ? "selected" : ""}>🔄 Toggle Cursor Mode (Press button to toggle)</option>
                        <option value="cursorWhenIdle" ${b.cursorSteerMode === "cursorWhenIdle" ? "selected" : ""}>🕹️ Cursor When Stopped / Raw When Walking (Forward switch switches mode)</option>
                        <option value="whenHoldingButton" ${b.cursorSteerMode === "whenHoldingButton" ? "selected" : ""}>✋ Hold Modifier Button (Hold to steer cursor)</option>
                        <option value="whenAiming" ${b.cursorSteerMode === "whenAiming" ? "selected" : ""}>🎯 When Aiming / Throwing (Auto-steer when aiming)</option>
                        <option value="never" ${b.cursorSteerMode === "never" ? "selected" : ""}>🚫 Never (Stick always controls direction)</option>
                      </select>
                    </div>
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-raw-walking-toggle" data-block-id="${b.id}" ${b.rawDirectionWhileWalking ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🚶 Forward Switch Overrides to Raw Direction While Walking</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When toggled on: releasing forward switch uses cursor mode; holding forward switch walks and attacks in raw stick direction.
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-stick-cursor-toggle" data-block-id="${b.id}" ${b.stickCursorInFront ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🎯 Stick Cursor In Front Outside Cursor Mode</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When outside/exiting cursor mode: sticks cursor directly in front along facing direction, with distance scaled by stick magnitude.
                  </div>
                  ${b.stickCursorInFront ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                      <span style="font-size: 0.62rem; color: #94a3b8; font-weight: 600;">Max / Clamp Distance:</span>
                      <input type="number" step="0.5" min="1" max="30" class="block-loco-cursor-max-dist dev-input" data-block-id="${b.id}" value="${b.cursorMaxDistance ?? 6.0}" style="width: 60px; font-size: 0.68rem; padding: 2px 4px; background: #0f172a; color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); border-radius: 3px;" />
                      <span style="font-size: 0.58rem; color: #64748b;">units</span>
                    </div>
                  ` : ""}
                </div>
              ` : b.mode === "stickDirectionDriveButton" ? `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div>
                    ${this.renderInputSlot(b.id, "forwardTrigger", b.forwardTrigger, "Forward Drive Button / Trigger (e.g. GamepadRT)")}
                    <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                      Point left stick in desired heading; hold this button down to move forward. Left stick alone points direction without moving.
                    </div>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 2px;">
                    <div>
                      ${this.renderInputSlot(b.id, "cursorSteerTrigger", b.cursorSteerTrigger, "Cursor Steering Button (e.g. GamepadLB)")}
                    </div>
                    <div>
                      <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Cursor Steer Mode</span>
                      <select class="block-loco-cursor-mode dev-select" data-block-id="${b.id}" style="margin-top: 4px; font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px; width: 100%;">
                        <option value="toggleButton" ${b.cursorSteerMode === "toggleButton" ? "selected" : ""}>🔄 Toggle Cursor Mode (Press button to toggle)</option>
                        <option value="cursorWhenIdle" ${b.cursorSteerMode === "cursorWhenIdle" ? "selected" : ""}>🕹️ Cursor When Stopped / Raw When Walking (Forward switch switches mode)</option>
                        <option value="whenHoldingButton" ${b.cursorSteerMode === "whenHoldingButton" ? "selected" : ""}>✋ Hold Modifier Button (Hold to steer cursor)</option>
                        <option value="whenAiming" ${b.cursorSteerMode === "whenAiming" ? "selected" : ""}>🎯 When Aiming / Throwing (Auto-steer when aiming)</option>
                        <option value="never" ${b.cursorSteerMode === "never" ? "selected" : ""}>🚫 Never (Stick always controls direction)</option>
                      </select>
                    </div>
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-raw-walking-toggle" data-block-id="${b.id}" ${b.rawDirectionWhileWalking ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🚶 Forward Switch Overrides to Raw Direction While Walking</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When toggled on: releasing forward switch uses cursor mode; holding forward switch walks and attacks in raw stick direction.
                  </div>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-top: 6px;">
                    <input type="checkbox" class="block-loco-stick-cursor-toggle" data-block-id="${b.id}" ${b.stickCursorInFront ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #38bdf8;" />
                    <span style="font-size: 0.64rem; font-weight: 600; color: #e2e8f0;">🎯 Stick Cursor In Front Outside Cursor Mode</span>
                  </label>
                  <div style="font-size: 0.58rem; color: #64748b; margin-top: 2px; line-height: 1.25;">
                    When outside/exiting cursor mode: sticks cursor directly in front along facing direction, with distance scaled by stick magnitude.
                  </div>
                  ${b.stickCursorInFront ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                      <span style="font-size: 0.62rem; color: #94a3b8; font-weight: 600;">Max / Clamp Distance:</span>
                      <input type="number" step="0.5" min="1" max="30" class="block-loco-cursor-max-dist dev-input" data-block-id="${b.id}" value="${b.cursorMaxDistance ?? 6.0}" style="width: 60px; font-size: 0.68rem; padding: 2px 4px; background: #0f172a; color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); border-radius: 3px;" />
                      <span style="font-size: 0.58rem; color: #64748b;">units</span>
                    </div>
                  ` : ""}
                </div>
              ` : b.mode === "walkToMouse" ? `
                <div>
                  ${this.renderInputSlot(b.id, "forwardTrigger", b.forwardTrigger, "Forward Drive Button (Toward Cursor)")}
                  <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                    Hold to run directly toward cursor. Facing automatically follows the mouse.
                  </div>
                  <div style="margin-top: 6px;">
                    <span style="font-size: 0.62rem; color: #94a3b8; font-weight: 600;">Optional Relative Keys:</span>
                    <div style="display: flex; gap: 4px; margin-top: 2px; flex-wrap: wrap;">
                      ${renderMoveKey("Back", "reverseKey")}
                      ${renderMoveKey("Left", "strafeLeftKey")}
                      ${renderMoveKey("Right", "strafeRightKey")}
                    </div>
                  </div>
                </div>
              ` : `
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Directional Movement (WASD / D-Pad Buttons)</span>
                    <label style="display: inline-flex; align-items: center; gap: 3px; cursor: pointer; user-select: none;" title="Require clean tap for movement (step-by-step)">
                      <input type="checkbox" class="block-move-keys-clean-toggle" data-block-id="${b.id}" ${b.moveKeys?.requireCleanPress ? "checked" : ""} style="cursor: pointer; width: 11px; height: 11px; accent-color: #38bdf8;" />
                      <span style="font-size: 0.58rem; font-weight: 600; ${b.moveKeys?.requireCleanPress ? "color: #38bdf8;" : "color: #64748b;"}">Clean Tap</span>
                    </label>
                  </div>
                  <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
                    ${renderMoveKey("↑", "upKey")}
                    ${renderMoveKey("↓", "downKey")}
                    ${renderMoveKey("←", "leftKey")}
                    ${renderMoveKey("→", "rightKey")}
                  </div>
                  <div style="font-size: 0.60rem; color: #64748b; margin-top: 3px;">
                    Only the bound buttons above move the creature. The left joystick will not move the creature in this mode.
                  </div>
                </div>
              `}
              <div>
                ${this.renderInputSlot(b.id, "jump", b.jump, "Jump / Vertical Hop")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "sprint", b.sprint, "Sprint")}
                <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.62rem; color: #94a3b8;">Sprint Mode:</span>
                  <select class="block-sprint-mode dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                    <option value="hold" ${b.sprint.mode !== "toggle" ? "selected" : ""}>Hold to Sprint</option>
                    <option value="toggle" ${b.sprint.mode === "toggle" ? "selected" : ""}>Toggle Sprint</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case "melee": {
        const b = block as MeleeControlBlock;
        b.punch = b.punch || { code: "KeyF" };
        return `
          <div style="display: flex; gap: 16px; align-items: start;">
            <div>
              ${this.renderInputSlot(b.id, "punch", b.punch, "Melee Punch / Attack")}
            </div>
            <div style="font-size: 0.68rem; color: #64748b; padding-top: 14px;">
              Strikes in the direction of the aim cursor with physical punch force and cooldown.
            </div>
          </div>
        `;
      }

      case "laser": {
        const b = block as LaserControlBlock;
        b.aimTrigger = b.aimTrigger || { code: "MouseRight", gateButtons: ["AltLeft"] };
        b.fireTrigger = b.fireTrigger || { code: "MouseLeft" };
        b.powerLevel = b.powerLevel || { source: "mouseWheel", sensitivity: 1.0 };
        return `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; align-items: start;">
            <div>
              ${this.renderInputSlot(b.id, "aimTrigger", b.aimTrigger, "Aim Feature Trigger")}
              <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 0.62rem; color: #94a3b8;">Aim Method (2D Input):</span>
                <select class="block-laser-aim-mode dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                  <option value="mouseWorldPos" ${b.aimMode !== "rawDirection" && b.aimMode !== "mouseScreenPos" ? "selected" : ""}>🌐 Game Cursor (Mouse World Pos)</option>
                  <option value="mouseScreenPos" ${b.aimMode === "mouseScreenPos" ? "selected" : ""}>🖥️ Screen Coordinates</option>
                  <option value="rawDirection" ${b.aimMode === "rawDirection" ? "selected" : ""}>🧭 Raw Direction Heading</option>
                </select>
              </div>
            </div>
            <div>
              ${this.renderInputSlot(b.id, "fireTrigger", b.fireTrigger, "Fire Laser Trigger")}
              <div style="margin-top: 4px;">
                <label style="display: flex; align-items: center; gap: 4px; font-size: 0.64rem; color: #94a3b8; cursor: pointer;">
                  <input type="checkbox" class="block-laser-autofire" data-block-id="${b.id}" ${b.fireTrigger.autoFireWhenAiming ? "checked" : ""} />
                  <span>Auto-fire continuously while aiming</span>
                </label>
              </div>
            </div>
            <div>
              <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Power Level (1D Input)</span>
              <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                <select class="block-laser-power-source dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                  <option value="mouseWheel" ${b.powerLevel.source === "mouseWheel" ? "selected" : ""}>🎡 Mouse Scroll Wheel</option>
                  <option value="mouseDeltaY" ${b.powerLevel.source === "mouseDeltaY" ? "selected" : ""}>🖱️ Mouse Delta Y (Vertical Drag)</option>
                  <option value="none" ${b.powerLevel.source === "none" ? "selected" : ""}>🚫 None / Fixed Power</option>
                </select>
                ${b.powerLevel.source !== "none" ? `
                  <button class="btn-block-laser-power-clear" data-block-id="${b.id}" type="button" style="font-size: 0.62rem; color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 0 3px;" title="Disable power level modulation">✕</button>
                ` : ""}
              </div>
            </div>
          </div>
        `;
      }

      case "throw": {
        const b = block as ThrowControlBlock;
        b.mode = b.mode || "chargeAndRelease";
        b.chargeTrigger = b.chargeTrigger || { code: "MouseLeft" };
        b.aimTrigger = b.aimTrigger || { code: "MouseRight" };
        b.fireTrigger = b.fireTrigger || { code: "MouseLeft" };
        b.quickTrigger = b.quickTrigger || { code: "MouseLeft" };
        b.arcModulation = b.arcModulation || { source: "mouseDeltaY", autoCursorLock: true, sensitivity: 0.005 };
        b.enableProximityCancel = Boolean(b.enableProximityCancel);
        b.cancelRadius = b.cancelRadius ?? 1.5;
        b.triggerMargin = b.triggerMargin ?? 0.15;

        let modeSpecificHtml = "";
        if (b.mode === "chargeAndRelease") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "chargeTrigger", b.chargeTrigger, "Charge & Release Throw Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Hold to charge trajectory/power, release to throw.
              </div>
            </div>
          `;
        } else if (b.mode === "triggerPullForce") {
          modeSpecificHtml = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div>
                ${this.renderInputSlot(b.id, "chargeTrigger", b.chargeTrigger, "Analog Throw Trigger (e.g. GamepadRT)")}
                <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                  Pull trigger to scale throw force & trajectory height. Releasing the trigger fires the throw.
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span style="font-size: 0.68rem; color: #94a3b8;">Trigger Deadzone Margin:</span>
                <input type="number" step="0.05" min="0.0" max="0.5" class="block-throw-trigger-margin dev-input" data-block-id="${b.id}" value="${b.triggerMargin ?? 0.15}" style="width: 55px; font-size: 0.72rem; padding: 2px 4px; background: #0f172a; color: #fff; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; text-align: center;" />
                <span style="font-size: 0.65rem; color: #64748b;">(0.0–0.5 threshold before force begins increasing)</span>
              </div>
            </div>
          `;
        } else if (b.mode === "holdAndRelease") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "chargeTrigger", b.chargeTrigger, "Hold to Aim & Release Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Hold to preview lowest energy trajectory that reaches target without charging. Release to throw.
              </div>
            </div>
          `;
        } else if (b.mode === "aimAndFire") {
          modeSpecificHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
              <div>
                ${this.renderInputSlot(b.id, "aimTrigger", b.aimTrigger, "Aim Arc Preview Button")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "fireTrigger", b.fireTrigger, "Launch / Fire Throw Button")}
              </div>
              <div>
                <span style="font-size: 0.64rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Arc Modulation (1D Input)</span>
                <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                  <select class="block-throw-arc-source dev-select" data-block-id="${b.id}" style="font-size: 0.68rem; padding: 2px 6px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 3px;">
                    <option value="mouseDeltaY" ${b.arcModulation.source === "mouseDeltaY" ? "selected" : ""}>🖱️ Mouse Delta Y (Vertical Drag)</option>
                    <option value="mouseWheel" ${b.arcModulation.source === "mouseWheel" ? "selected" : ""}>🎡 Mouse Scroll Wheel</option>
                    <option value="none" ${b.arcModulation.source === "none" ? "selected" : ""}>🚫 None / Fixed Arc</option>
                  </select>
                </div>
              </div>
            </div>
          `;
        } else if (b.mode === "quickOptimal") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "quickTrigger", b.quickTrigger, "Instant Optimal Throw Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Throws the item immediately along the most efficient flattest ballistic arc on press.
              </div>
            </div>
          `;
        } else if (b.mode === "quickWallClear") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "quickTrigger", b.quickTrigger, "Instant Wall-Clear Throw Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Instantly calculates and fires the lowest energy trajectory that clears all intervening walls.
              </div>
            </div>
          `;
        } else if (b.mode === "aimWallClear") {
          modeSpecificHtml = `
            <div>
              ${this.renderInputSlot(b.id, "aimTrigger", b.aimTrigger, "Aim Wall-Clear Button")}
              <div style="font-size: 0.62rem; color: #64748b; margin-top: 3px;">
                Hold to preview lowest energy trajectory that clears intervening walls, release to fire.
              </div>
            </div>
          `;
        }

        const isHoldAndReleaseMode = b.mode === "chargeAndRelease" || b.mode === "aimWallClear" || b.mode === "holdAndRelease" || b.mode === "triggerPullForce";
        const proximityCancelHtml = isHoldAndReleaseMode
          ? `
            <div style="margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.72rem; color: #e2e8f0;">
                <input type="checkbox" class="block-throw-cancel-toggle" data-block-id="${b.id}" ${b.enableProximityCancel ? "checked" : ""} style="cursor: pointer; accent-color: #38bdf8;" />
                <span>Cancel throw when target pos is close to character</span>
              </label>
              ${
                b.enableProximityCancel
                  ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.68rem; color: #94a3b8;">Cancel Radius:</span>
                  <input type="number" step="0.1" min="0.2" max="10" class="block-throw-cancel-radius dev-input" data-block-id="${b.id}" value="${b.cancelRadius ?? 1.5}" style="width: 55px; font-size: 0.72rem; padding: 2px 4px; background: #0f172a; color: #fff; border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 4px; text-align: center;" />
                  <span style="font-size: 0.65rem; color: #64748b;">tiles</span>
                </div>
              `
                  : ""
              }
            </div>
          `
          : "";

        return `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: #38bdf8;">Trajectory Manipulation Style:</span>
              <select class="block-throw-mode dev-select" data-block-id="${b.id}" style="font-size: 0.72rem; padding: 3px 8px; background: #0f172a; color: #fff; border: 1px solid rgba(56,189,248,0.4); border-radius: 4px;">
                <option value="chargeAndRelease" ${b.mode === "chargeAndRelease" ? "selected" : ""}>🏹 Charge and Release (Bow style)</option>
                <option value="triggerPullForce" ${b.mode === "triggerPullForce" ? "selected" : ""}>🎮 Analog Trigger Pull Force (Scale Force with Trigger, Release to Fire)</option>
                <option value="holdAndRelease" ${b.mode === "holdAndRelease" ? "selected" : ""}>🏹 Hold & Release (Static Lowest Energy Arc)</option>
                <option value="aimAndFire" ${b.mode === "aimAndFire" ? "selected" : ""}>🎯 Aim & Fire (Preview button + Launch button)</option>
                <option value="quickOptimal" ${b.mode === "quickOptimal" ? "selected" : ""}>⚡ Most Efficient (Quick Optimal Arc)</option>
                <option value="quickWallClear" ${b.mode === "quickWallClear" ? "selected" : ""}>🧱 Quick Wall-Clear (Lowest Energy No Wall Collision)</option>
                <option value="aimWallClear" ${b.mode === "aimWallClear" ? "selected" : ""}>🏹 Aim Wall-Clear (Aim Lowest Energy, Release to Fire)</option>
              </select>
            </div>
            ${modeSpecificHtml}
            ${proximityCancelHtml}
          </div>
        `;
      }

      case "itemInteraction": {
        const b = block as ItemInteractionControlBlock;
        b.pickup = b.pickup || { code: "MouseLeft" };
        b.drop = b.drop || { code: "KeyQ" };
        b.swap = b.swap || { code: "KeyF" };
        b.consume = b.consume || { code: "KeyE" };
        b.swapRequiresHolding = Boolean(b.swapRequiresHolding);
        b.triggerPickupWhenEmptyHanded = b.triggerPickupWhenEmptyHanded ?? true;

        return `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: start;">
              <div>
                ${this.renderInputSlot(b.id, "pickup", b.pickup, "Pick Up Ground Item")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "drop", b.drop, "Drop Held Item")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "swap", b.swap, "Swap Ground/Held Item")}
              </div>
              <div>
                ${this.renderInputSlot(b.id, "consume", b.consume, "Consume / Bite Item")}
              </div>
            </div>
            
            <!-- Prebuilt Options -->
            <div style="display: flex; flex-wrap: wrap; gap: 16px; padding-top: 8px; border-top: 1px dashed rgba(148,163,184,0.2); font-size: 0.68rem; color: #94a3b8;">
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="checkbox" class="block-item-swap-requires-holding" data-block-id="${b.id}" ${b.swapRequiresHolding ? "checked" : ""} />
                <span>Swap requires already holding an item (strict swap)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                <input type="checkbox" class="block-item-trigger-pickup-empty" data-block-id="${b.id}" ${b.triggerPickupWhenEmptyHanded ? "checked" : ""} />
                <span>Swap button triggers pickup when empty-handed</span>
              </label>
            </div>

            <!-- Additional Pickup Slot -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="min-width: 200px;">
                ${this.renderInputSlot(b.id, "additionalPickup", b.additionalPickup, "Additional Empty-Handed Pickup Button (Optional)")}
              </div>
              <span style="font-size: 0.62rem; color: #64748b; padding-top: 12px;">Extra dedicated button to pick up when empty-handed.</span>
            </div>
          </div>
        `;
      }

      case "facing": {
        const b = block as FacingControlBlock;
        b.mode = b.mode || "mouseWorldPos";
        return `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Heading / Facing Direction:</span>
            <select class="block-facing-mode dev-select" data-block-id="${b.id}" style="font-size: 0.72rem; padding: 2px 8px; background: #0f172a; color: #fff; border: 1px solid rgba(148,163,184,0.3); border-radius: 4px;">
              <option value="mouseWorldPos" ${b.mode === "mouseWorldPos" ? "selected" : ""}>🎯 Face Mouse Cursor / Reticle</option>
              <option value="fromMovement" ${b.mode === "fromMovement" ? "selected" : ""}>🏃 Face Movement Vector Direction</option>
            </select>
          </div>
        `;
      }
    }
    return "";
  }

  private static renderBlocksHtml(schema: ControlSchema): string {
    const blocks = this.getActiveBlocks(schema);
    const isGamepad = this.activeTab === "gamepad";

    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Header with Add Control Module dropdown -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px; padding: 8px 14px;">
          <div style="font-size: 0.74rem; color: #cbd5e1;">
            <strong style="color: #38bdf8;">${isGamepad ? "🎮 Gamepad Modular Controls" : "🧱 Modular Control System"}:</strong>
            ${isGamepad ? "Configure controller bindings with prebuilt capability modules. Click any slot to bind by pressing a controller button/trigger or key, or click <strong>✕</strong> to clear/disable." : "Each capability has its own self-contained block with prebuilt logic. Click any slot to rebind, or click <strong>✕</strong> to clear/disable."}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <select id="select-add-control-block" class="dev-select" style="font-size: 0.72rem; font-weight: 700; padding: 4px 8px; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #38bdf8; border-radius: 4px;">
              <option value="" disabled selected>+ Add Control Module...</option>
              <option value="locomotion">+ Locomotion (Move, Jump, Sprint)</option>
              <option value="itemInteraction">+ Item Interaction (Pickup, Drop, Swap, Eat)</option>
              <option value="throw">+ Throwing & Ballistics</option>
              <option value="melee">+ Melee Combat</option>
              <option value="laser">+ Laser Beam</option>
              <option value="facing">+ Heading / Facing Angle</option>
            </select>
          </div>
        </div>

        <!-- Blocks Container -->
        <div id="control-blocks-container" style="display: flex; flex-direction: column; gap: 10px;">
          ${blocks.length === 0 ? `
            <div style="text-align: center; color: #64748b; font-size: 0.76rem; padding: 24px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px dashed rgba(148,163,184,0.2);">
              No control blocks assigned. Select an option from "+ Add Control Module" to assign controls!
            </div>
          ` : blocks.map((b) => {
            const typeIcons: Record<string, string> = {
              locomotion: "🏃",
              itemInteraction: "📦",
              throw: "🏹",
              melee: "🥊",
              laser: "⚡",
              facing: "🎯",
            };
            const icon = typeIcons[b.type] || "🎮";

            return `
              <div class="control-block-card" data-block-id="${b.id}" style="
                display: flex;
                flex-direction: column;
                gap: 8px;
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid ${b.enabled ? "rgba(148, 163, 184, 0.25)" : "rgba(239, 68, 68, 0.25)"};
                border-radius: 6px;
                padding: 10px 14px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                opacity: ${b.enabled ? "1" : "0.6"};
              ">
                <!-- Block Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(148, 163, 184, 0.15); padding-bottom: 6px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.90rem;">${icon}</span>
                    <span style="font-size: 0.78rem; font-weight: 700; color: #f8fafc;">${b.name || b.type.toUpperCase()}</span>
                    <span style="font-size: 0.60rem; padding: 1px 5px; background: rgba(56,189,248,0.15); color: #38bdf8; border-radius: 3px; font-weight: 700; text-transform: uppercase;">${b.type}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 0.68rem; color: #94a3b8; cursor: pointer;">
                      <input type="checkbox" class="block-toggle-enabled" data-block-id="${b.id}" ${b.enabled ? "checked" : ""} />
                      <span>Enabled</span>
                    </label>
                    <button class="btn-block-delete btn-secondary-action" data-block-id="${b.id}" type="button" style="
                      font-size: 0.66rem;
                      color: #ef4444;
                      padding: 2px 6px;
                      border: 1px solid rgba(239, 68, 68, 0.3);
                      background: rgba(239, 68, 68, 0.1);
                      border-radius: 3px;
                      cursor: pointer;
                    " title="Remove this control module">🗑️ Remove</button>
                  </div>
                </div>

                <!-- Block Body -->
                <div class="control-block-body">
                  ${this.renderBlockBodyHtml(b)}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  private static startBlockKeyListening(
    blockId: string,
    slotName: string,
    gateIdx?: number,
    isMoveKey?: "upKey" | "downKey" | "leftKey" | "rightKey" | "reverseKey" | "strafeLeftKey" | "strafeRightKey"
  ): void {
    if (this.recorderCleanup) {
      this.recorderCleanup();
      this.recorderCleanup = null;
    }

    this.listeningBlockTarget = { blockId, slotName, gateIdx, isMoveKey };
    this.renderActiveView();

    const commitTrigger = (code: string) => {
      const schema = this.workingSchema;
      if (!schema) return;
      const blocks = this.getActiveBlocks(schema);
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      if (isMoveKey && block.type === "locomotion") {
        const loco = block as LocomotionControlBlock;
        if (isMoveKey === "reverseKey" || isMoveKey === "strafeLeftKey" || isMoveKey === "strafeRightKey") {
          (loco as any)[isMoveKey] = code;
        } else {
          loco.moveKeys = loco.moveKeys || {};
          loco.moveKeys[isMoveKey] = code;
        }
      } else {
        const slot = (block as any)[slotName] as BlockInputSlot | undefined;
        if (gateIdx !== undefined) {
          if (slot && slot.gateButtons) {
            slot.gateButtons[gateIdx] = code;
          }
        } else {
          if (slot) {
            slot.code = code;
          } else {
            (block as any)[slotName] = { code };
          }
        }
      }

      cleanup();
      this.listeningBlockTarget = null;
      this.renderActiveView();
    };

    let isGamepadPolling = true;
    let animId: number | null = null;
    const pollGamepad = () => {
      if (!isGamepadPolling) return;
      const gamepads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
      for (let g = 0; g < gamepads.length; g++) {
        const gp = gamepads[g];
        if (!gp) continue;
        for (let b = 0; b < gp.buttons.length; b++) {
          if (gp.buttons[b].pressed || gp.buttons[b].value > 0.5) {
            const code = ControlSchemaArbiter.formatGamepadButtonIndex(b);
            commitTrigger(code);
            return;
          }
        }
      }
      animId = requestAnimationFrame(pollGamepad);
    };
    animId = requestAnimationFrame(pollGamepad);

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        cleanup();
        this.listeningBlockTarget = null;
        this.renderActiveView();
        return;
      }
      commitTrigger(e.code);
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const buttonMap: Record<number, string> = {
        0: "MouseLeft",
        1: "MouseMiddle",
        2: "MouseRight",
        3: "MouseBack",
        4: "MouseForward",
      };
      commitTrigger(buttonMap[e.button] || `MouseButton${e.button}`);
    };

    const cleanup = () => {
      isGamepadPolling = false;
      if (animId !== null) cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        this.popoutWindow.removeEventListener("mousedown", onMouseDown, true);
      }
      this.recorderCleanup = null;
    };

    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("mousedown", onMouseDown, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      this.popoutWindow.addEventListener("mousedown", onMouseDown, true);
    }
  }

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
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.4); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.18);">
            <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 500;">${label}:</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button data-loco-key="${keyName}" class="btn-bind-loco-key btn-secondary-action" style="font-size: 0.74rem; padding: 2px 8px; font-weight: 600; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05); ${isListening ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : (val ? "color: #ffffff;" : "color: #64748b; font-style: italic;")}">
                ${isListening ? "🔴 Press key..." : (val ? `⌨️ ${val}` : "(Unbound)")}
              </button>
              ${val ? `<button data-clear-loco-key="${keyName}" class="btn-clear-loco-key btn-icon" style="padding: 2px 6px; font-size: 0.70rem; color: #94a3b8; background: transparent; border: 1px solid rgba(148, 163, 184, 0.2);" title="Unbind key">✕</button>` : ""}
            </div>
          </div>
        `;
      };

      return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 0.76rem; color: #ffffff; font-weight: 600;">Locomotion Mode:</label>
            <select id="select-loco-mode" class="dev-select" style="width: 58%; font-size: 0.74rem; color: #ffffff; background: #0f172a; border: 1px solid rgba(148, 163, 184, 0.25);">
              <option value="directVector" ${cfg.locomotion.mode === "directVector" ? "selected" : ""}>Direct 8-Way (WASD)</option>
              <option value="forwardFacingDrive" ${isFwd ? "selected" : ""}>Forward-Facing Drive (Move to Mouse)</option>
            </select>
          </div>

          ${
            isFwd
              ? `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.04); padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(148, 163, 184, 0.2);">
              <span style="font-size: 0.74rem; color: #ffffff; font-weight: 600;">Forward Drive Trigger:</span>
              <button id="btn-bind-fwd-trigger" class="btn-secondary-action" style="font-size: 0.74rem; padding: 2px 8px; font-weight: 600; border: 1px solid rgba(148, 163, 184, 0.25); background: rgba(255, 255, 255, 0.05); ${isListeningFwd ? "background: #ef4444; color: #fff; animation: pulse 1s infinite;" : "color: #ffffff;"}">
                ${isListeningFwd ? "🔴 Press key/mouse..." : `⌨️ ${fwdCode}`}
              </button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 2px;">
              ${renderLocoKeyRow("Reverse (Optional)", "reverseKey")}
              ${renderLocoKeyRow("Strafe Left (Optional)", "strafeLeftKey")}
              ${renderLocoKeyRow("Strafe Right (Optional)", "strafeRightKey")}
            </div>
            <span style="font-size: 0.70rem; color: #94a3b8; line-height: 1.3;">
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
    const tags = this.getActiveDeviceTags(schema);
    const stageGroups = this.getActiveStageGroups(schema);

    // Normalize legacy rules that had tagId or outer trigger modes into unified conditions
    for (const rule of rules) {
      if (rule.tagId) {
        const mode = rule.trigger?.mode || "press";
        const condType: ConditionType = mode === "hold" ? "tagHeld" : mode === "release" ? "tagReleased" : "tagPressed";
        const conds = ControlSchemaArbiter.getRuleConditions(rule);
        if (conds.length === 1 && conds[0].type === "always") {
          rule.conditions = [{ type: condType, param: rule.tagId }];
        } else if (!conds.some((c) => c.type === "tagHeld" || c.type === "tagPressed" || c.type === "tagReleased")) {
          rule.conditions = [{ type: condType, param: rule.tagId }, ...conds];
        } else {
          rule.conditions = conds;
        }
        rule.condition = rule.conditions[0];
        if (!rule.threadId) {
          rule.threadId = `thread-${rule.tagId}`;
        }
        rule.tagId = undefined;
        rule.trigger = { device: "keyboard", code: "Always", mode: "hold" };
      }
      if (!rule.threadId) {
        rule.threadId = `thread-${rule.id}`;
      }
    }

    if (rules.length === 0) {
      return `
        <div style="text-align: center; color: #94a3b8; font-size: 0.76rem; padding: 18px; background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px;">
          No conditional threads defined. Click "+ Add New Conditional Thread" to build a control cascade.
        </div>
      `;
    }

    const renderActionStatementHtml = (
      rule: ControlRule,
      act: ActionInvocation,
      sIdx: number,
      totalStmts: number
    ): string => {
      const actionDef = ControlActionCatalog.findAction(act.moduleId, act.intent);
      const actionLabel = actionDef ? actionDef.label : `${act.moduleId}:${act.intent}`;
      const cat = ControlActionCatalog.categories.find((c) => c.id === act.moduleId);
      const isModuleMissing = cat && !cat.isAttached(char);

      return `
        <div class="then-statement-action" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background: rgba(255,255,255,0.02); border: 1px solid rgba(148,163,184,0.15); border-radius: 3px; padding: 2px 6px;">
          <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
            <span style="font-size: 0.62rem; color: #94a3b8; width: 14px;">${sIdx + 1}.</span>
            <button class="btn-open-action-picker btn-secondary-action" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.68rem; padding: 2px 8px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.05); border-radius: 3px; text-align: left; flex: 1;" title="Change Action Function">
              ${actionLabel} ▼
            </button>
            ${act.moduleId === "staging" ? (() => {
              const currentGroup = act.args?.group || stageGroups[0]?.name || "default";
              const stagesInGroup = ControlsInspector.getStagesForGroup(schema, currentGroup);
              return `
                <select class="select-action-stage-group dev-select" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.68rem; padding: 1px 4px; color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); background: #0f172a; max-width: 95px;" title="Target Stage Set">
                  ${stageGroups.map((g) => `<option value="${g.name}" ${currentGroup === g.name ? "selected" : ""}>📁 ${g.name}</option>`).join("")}
                </select>
                <select class="select-action-stage dev-select" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.68rem; padding: 1px 6px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: #0f172a; max-width: 105px;" title="Target Stage within ${currentGroup}">
                  ${stagesInGroup.map((stg) => `<option value="${stg}" ${(act.args?.stage || "none") === stg ? "selected" : ""}>🎭 ${stg}</option>`).join("")}
                </select>
              `;
            })() : ""}
            ${isModuleMissing ? `<span style="font-size: 0.58rem; color: #94a3b8;" title="Character lacks this behavior module">⚠️ Missing</span>` : ""}
          </div>
          <div style="display: flex; align-items: center; gap: 3px; flex-shrink: 0;">
            <button class="btn-move-statement-up btn-icon" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx > 0 ? "pointer" : "default"};" ${sIdx === 0 ? "disabled" : ""} title="Move Action Up">▲</button>
            <button class="btn-move-statement-down btn-icon" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx < totalStmts - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx < totalStmts - 1 ? "pointer" : "default"};" ${sIdx === totalStmts - 1 ? "disabled" : ""} title="Move Action Down">▼</button>
            <button class="btn-delete-statement btn-icon" data-rule-id="${rule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: #94a3b8; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: pointer;" title="Remove Action">✕</button>
          </div>
        </div>
      `;
    };

    const renderNestedThreadStatementHtml = (
      parentRule: ControlRule,
      stmt: NestedThreadStatement,
      sIdx: number,
      totalStmts: number,
      depth: number
    ): string => {
      const threadRules = stmt.rules;
      const bg = "rgba(10, 15, 29, 0.85)";
      const border = "rgba(148, 163, 184, 0.25)";

      return `
        <div class="control-thread-card nested-thread-card" data-parent-rule-id="${parentRule.id}" data-thread-id="${stmt.threadId}" style="display: flex; flex-direction: column; gap: 6px; background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: 8px 10px; margin-top: 3px; margin-bottom: 3px;">
          <!-- Nested Thread Card Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(148, 163, 184, 0.15); padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.62rem; color: #94a3b8; width: 14px;">${sIdx + 1}.</span>
              <span style="font-size: 0.66rem; font-weight: 700; color: #ffffff; letter-spacing: 0.03em;">🔀 Nested Cascade Block</span>
            </div>
            <div style="display: flex; align-items: center; gap: 3px;">
              <button class="btn-move-statement-up btn-icon" data-rule-id="${parentRule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx > 0 ? "pointer" : "default"};" ${sIdx === 0 ? "disabled" : ""} title="Move Nested Thread Up">▲ Thread</button>
              <button class="btn-move-statement-down btn-icon" data-rule-id="${parentRule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${sIdx < totalStmts - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${sIdx < totalStmts - 1 ? "pointer" : "default"};" ${sIdx === totalStmts - 1 ? "disabled" : ""} title="Move Nested Thread Down">▼ Thread</button>
              <button class="btn-delete-statement btn-icon" data-rule-id="${parentRule.id}" data-statement-idx="${sIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: #94a3b8; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: pointer;" title="Remove Entire Nested Thread">🗑️</button>
            </div>
          </div>

          <!-- Cascade Branches in Block -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${threadRules
              .map((r, rIdx) => {
                const isLast = rIdx === threadRules.length - 1;
                const conds = ControlSchemaArbiter.getRuleConditions(r);
                const isAlways = conds.length === 1 && conds[0].type === "always";
                const badge = rIdx === 0 ? "IF" : isLast && isAlways ? "ELSE" : "ELSE IF";
                return renderBranchRowHtml(r, badge, depth, rIdx, threadRules.length, stmt.threadId);
              })
              .join("")}
          </div>

          <!-- Add Branch to this Cascade Block -->
          <div style="display: flex; justify-content: flex-start; margin-top: 2px;">
            <button class="btn-add-thread-branch btn-secondary-action" data-thread-id="${stmt.threadId}" style="font-size: 0.64rem; padding: 3px 8px; color: #ffffff; border: 1px dashed rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.03); border-radius: 4px; cursor: pointer;">
              + Add Else If Branch
            </button>
          </div>
        </div>
      `;
    };

    const renderConditionTreeHtml = (
      rule: ControlRule,
      condList: ConditionGate[],
      op: "and" | "or",
      parentPath: string,
      depth = 0
    ): string => {
      const isRoot = parentPath === "";
      return `
        <div style="display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px;">
          ${condList
            .map((cond, cIdx) => {
              const currentPath = parentPath !== "" ? `${parentPath}.${cIdx}` : `${cIdx}`;
              const opBadgeHtml = cIdx > 0 ? `
                <button class="btn-toggle-cond-op" data-rule-id="${rule.id}" data-group-path="${parentPath}" type="button" style="font-size: 0.60rem; font-weight: 800; color: ${op === "or" ? "#f59e0b" : "#38bdf8"}; background: ${op === "or" ? "rgba(245, 158, 11, 0.15)" : "rgba(56, 189, 248, 0.15)"}; border: 1px solid ${op === "or" ? "rgba(245, 158, 11, 0.4)" : "rgba(56, 189, 248, 0.4)"}; border-radius: 3px; padding: 0 4px; cursor: pointer; text-transform: uppercase;" title="Click to toggle between AND / OR">${op.toUpperCase()}</button>
              ` : "";

              if (cond.type === "group") {
                const groupOp = cond.op || "or";
                const subConds = cond.conditions || [];
                return `
                  ${opBadgeHtml}
                  <div class="cond-group-block" style="display: inline-flex; align-items: center; gap: 3px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 4px; padding: 1px 4px;">
                    <span style="font-size: 0.82rem; font-weight: 800; color: #c084fc; user-select: none;">(</span>
                    ${renderConditionTreeHtml(rule, subConds, groupOp, currentPath, depth + 1)}
                    <span style="font-size: 0.82rem; font-weight: 800; color: #c084fc; user-select: none;">)</span>
                    <button class="btn-delete-condition btn-icon" data-rule-id="${rule.id}" data-cond-path="${currentPath}" type="button" style="font-size: 0.58rem; padding: 0 3px; color: #f87171; background: transparent; border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 2px; cursor: pointer;" title="Remove Condition Group">✕</button>
                  </div>
                `;
              }

              return `
                ${opBadgeHtml}
                <div style="display: inline-flex; align-items: center; gap: 3px; background: rgba(255,255,255,0.04); border: 1px solid rgba(148,163,184,0.2); border-radius: 3px; padding: 1px 4px;">
                  <select class="select-rule-cond dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;">
                    <optgroup label="🎮 Keybind / Control Inputs">
                      <option value="tagPressed" ${cond.type === "tagPressed" ? "selected" : ""}>Keybind: Press</option>
                      <option value="tagHeld" ${cond.type === "tagHeld" ? "selected" : ""}>Keybind: Hold</option>
                      <option value="tagReleased" ${cond.type === "tagReleased" ? "selected" : ""}>Keybind: Release</option>
                      <option value="buttonHeld" ${cond.type === "buttonHeld" ? "selected" : ""}>Raw Key/Button Code...</option>
                    </optgroup>
                    <optgroup label="🌍 Game Conditions">
                      <option value="always" ${cond.type === "always" ? "selected" : ""}>Always (Unconditional)</option>
                      <option value="stagedActionIs" ${cond.type === "stagedActionIs" ? "selected" : ""}>Stage Is...</option>
                      <option value="emptyHanded" ${cond.type === "emptyHanded" ? "selected" : ""}>Empty-Handed</option>
                      <option value="holdingPlainObject" ${cond.type === "holdingPlainObject" || cond.type === "holdingObjectWithoutAbility" ? "selected" : ""}>Holding Plain Item (No Ability)</option>
                      <option value="holdingItemWithPrimaryAbility" ${cond.type === "holdingItemWithPrimaryAbility" || cond.type === "holdingEdible" ? "selected" : ""}>Holding Item With Ability</option>
                      <option value="holdingObject" ${cond.type === "holdingObject" ? "selected" : ""}>Holding Any Item</option>
                      <option value="targetInReach" ${cond.type === "targetInReach" ? "selected" : ""}>Target in Reach</option>
                      <option value="grounded" ${cond.type === "grounded" ? "selected" : ""}>On Ground</option>
                      <option value="climbing" ${cond.type === "climbing" ? "selected" : ""}>Climbing Wall</option>
                      <option value="isAimingTrajectory" ${cond.type === "isAimingTrajectory" ? "selected" : ""}>Aiming Trajectory (Throw)</option>
                      <option value="isLaserAiming" ${cond.type === "isLaserAiming" ? "selected" : ""}>Aiming Laser</option>
                      <option value="isAiming" ${cond.type === "isAiming" ? "selected" : ""}>Aiming (Any)</option>
                    </optgroup>
                  </select>
                  ${
                    cond.type === "tagPressed" || cond.type === "tagHeld" || cond.type === "tagReleased"
                      ? `
                    <select class="select-cond-tag dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; max-width: 140px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;" title="Select keybind tag to check">
                      ${tags.map((tg) => `<option value="${tg.id}" ${cond.param === tg.id || cond.param === tg.name ? "selected" : ""}>🏷️ ${tg.name}</option>`).join("")}
                    </select>
                  `
                      : cond.type === "stagedActionIs"
                      ? (() => {
                        const currentGroup = cond.stageGroup || stageGroups[0]?.name || "default";
                        const stagesInGroup = ControlsInspector.getStagesForGroup(schema, currentGroup);
                        return `
                          <select class="select-cond-stage-group dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; max-width: 95px; color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); background: #0f172a;" title="Stage Set">
                            ${stageGroups.map((g) => `<option value="${g.name}" ${currentGroup === g.name ? "selected" : ""}>📁 ${g.name}</option>`).join("")}
                          </select>
                          <select class="select-cond-stage dev-select" data-rule-id="${rule.id}" data-cond-path="${currentPath}" style="font-size: 0.68rem; padding: 1px 4px; max-width: 105px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;" title="Stage within ${currentGroup}">
                            ${stagesInGroup.map((stg) => `<option value="${stg}" ${(cond.param || "none") === stg ? "selected" : ""}>🎭 ${stg}</option>`).join("")}
                          </select>
                        `;
                      })()
                      : cond.type === "buttonHeld"
                      ? `<input class="input-cond-param dev-input" data-rule-id="${rule.id}" data-cond-path="${currentPath}" value="${cond.param ?? "MouseRight"}" placeholder="e.g. MouseRight" style="font-size: 0.68rem; padding: 1px 4px; width: 90px; color: #ffffff; border: 1px solid rgba(148,163,184,0.2); background: #0f172a;" />`
                      : ""
                  }
                  ${condList.length > 1 || !isRoot ? `<button class="btn-delete-condition btn-icon" data-rule-id="${rule.id}" data-cond-path="${currentPath}" type="button" style="font-size: 0.58rem; padding: 0 3px; color: #94a3b8; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: pointer;" title="Remove Condition">✕</button>` : ""}
                </div>
              `;
            })
            .join("")}
          <button class="btn-add-condition btn-secondary-action" data-rule-id="${rule.id}" data-group-path="${parentPath}" type="button" style="font-size: 0.60rem; padding: 1px 5px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.04); border-radius: 3px;" title="Add condition">+ Cond</button>
          <button class="btn-add-cond-group btn-secondary-action" data-rule-id="${rule.id}" data-group-path="${parentPath}" type="button" style="font-size: 0.60rem; padding: 1px 5px; color: #c084fc; border: 1px solid rgba(168,85,247,0.35); background: rgba(168,85,247,0.1); border-radius: 3px;" title="Add nested condition group (OR / AND)">${isRoot ? "+ (Group)" : "+ ( )"}</button>
        </div>
      `;
    };

    const renderBranchRowHtml = (
      rule: ControlRule,
      branchBadge: string,
      depth = 0,
      branchIdx = 0,
      totalBranches = 1,
      threadId = ""
    ): string => {
      const conds = ControlSchemaArbiter.getRuleConditions(rule);
      const rootOp = rule.conditionOp || "and";
      const statements = ControlSchemaArbiter.getRuleBody(rule);

      return `
        <div class="thread-branch-block" id="rule-card-${rule.id}" style="display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 5px; padding: 7px 10px;">
          <!-- Top Row: Branch Label + Status Pip + Horizontally Stacked Conditions with Nested Groups -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px;">
            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; flex: 1; min-width: 0;">
              <span class="rule-status-pip" id="pip-${rule.id}" style="width: 7px; height: 7px; border-radius: 50%; background: #475569; flex-shrink: 0;" title="Live Condition Status"></span>

              <span style="font-size: 0.66rem; font-weight: 700; color: #ffffff; background: rgba(255,255,255,0.08); border: 1px solid rgba(148,163,184,0.25); padding: 1px 6px; border-radius: 3px; letter-spacing: 0.04em;">
                ${branchBadge}:
              </span>

              <!-- Stacked Conditions (Listed Horizontally with Nested Groups) -->
              ${renderConditionTreeHtml(rule, conds, rootOp, "")}
            </div>

            <!-- Branch Reorder & Delete Buttons -->
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
              ${totalBranches > 1 ? `
                <button class="btn-move-branch-up btn-icon" data-thread-id="${threadId}" data-branch-idx="${branchIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${branchIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${branchIdx > 0 ? "pointer" : "default"};" ${branchIdx === 0 ? "disabled" : ""} title="Move Branch Up">▲</button>
                <button class="btn-move-branch-down btn-icon" data-thread-id="${threadId}" data-branch-idx="${branchIdx}" style="font-size: 0.58rem; padding: 1px 4px; color: ${branchIdx < totalBranches - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${branchIdx < totalBranches - 1 ? "pointer" : "default"};" ${branchIdx === totalBranches - 1 ? "disabled" : ""} title="Move Branch Down">▼</button>
              ` : ""}
              <button class="btn-delete-rule btn-secondary-action" data-rule-id="${rule.id}" style="flex: 0 0 20px; width: 20px; height: 20px; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); font-size: 0.66rem; border-radius: 3px; background: transparent; cursor: pointer;" title="Remove Branch">
                🗑️
              </button>
            </div>
          </div>

          <!-- Bottom Block: THEN Action Execution (Stacked Vertically Like Classic Code) -->
          <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 14px; border-left: 2px solid rgba(148, 163, 184, 0.25); margin-left: 6px; margin-top: 3px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.66rem; font-weight: 700; color: #ffffff; letter-spacing: 0.04em;">
                THEN:
              </span>
              <div style="display: flex; gap: 4px;">
                <button class="btn-add-action btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.60rem; padding: 1px 6px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.04); border-radius: 3px; cursor: pointer;" title="Add action function">+ Add Action</button>
                <button class="btn-add-nested-thread btn-secondary-action" data-rule-id="${rule.id}" style="font-size: 0.60rem; padding: 1px 6px; color: #ffffff; border: 1px solid rgba(148,163,184,0.25); background: rgba(255,255,255,0.04); border-radius: 3px; cursor: pointer;" title="Add nested IF/THEN block inside this action">+ Add Nested Thread</button>
              </div>
            </div>

            <!-- Vertically Ordered Statements in THEN Body (Actions & Nested Cascade Blocks Interleaved) -->
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${statements.length === 0
                ? `<div style="font-size: 0.62rem; color: #64748b; font-style: italic; padding: 2px 4px;">No actions or nested blocks in this THEN body.</div>`
                : statements
                    .map((stmt, sIdx) => {
                      if (stmt.type === "action") {
                        return renderActionStatementHtml(rule, stmt.action, sIdx, statements.length);
                      } else {
                        return renderNestedThreadStatementHtml(rule, stmt, sIdx, statements.length, depth + 1);
                      }
                    })
                    .join("")}
            </div>
          </div>
        </div>
      `;
    };

    const renderCascadeBlocksHtml = (ruleList: ControlRule[], depth = 0): string => {
      // Group rules by threadId
      const threadMap = new Map<string, ControlRule[]>();
      for (const rule of ruleList) {
        if (!rule.threadId) {
          rule.threadId = `thread-${rule.id}`;
        }
        const tId = rule.threadId;
        if (!threadMap.has(tId)) threadMap.set(tId, []);
        threadMap.get(tId)!.push(rule);
      }

      const threadCards: string[] = [];
      const totalBlocks = threadMap.size;
      let bIdx = 0;

      for (const [tId, threadRules] of threadMap.entries()) {
        const bg = depth === 0 ? "rgba(15, 23, 42, 0.7)" : "rgba(10, 15, 29, 0.85)";
        const border = depth === 0 ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.25)";
        threadCards.push(`
          <div class="control-thread-card" style="display: flex; flex-direction: column; gap: 8px; background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: ${depth === 0 ? "10px 12px" : "8px 10px"}; margin-top: ${depth > 0 ? "6px" : "0"};">
            ${depth === 0 && totalBlocks > 1 ? `
              <!-- Top-level Block Reorder Controls -->
              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-bottom: -2px;">
                <button class="btn-move-cascade-block-up btn-icon" data-thread-id="${tId}" style="font-size: 0.58rem; padding: 1px 6px; color: ${bIdx > 0 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${bIdx > 0 ? "pointer" : "default"};" ${bIdx === 0 ? "disabled" : ""} title="Move Entire Block Up">▲ Block</button>
                <button class="btn-move-cascade-block-down btn-icon" data-thread-id="${tId}" style="font-size: 0.58rem; padding: 1px 6px; color: ${bIdx < totalBlocks - 1 ? "#ffffff" : "#475569"}; background: transparent; border: 1px solid rgba(148,163,184,0.2); border-radius: 2px; cursor: ${bIdx < totalBlocks - 1 ? "pointer" : "default"};" ${bIdx === totalBlocks - 1 ? "disabled" : ""} title="Move Entire Block Down">▼ Block</button>
              </div>
            ` : ""}

            <!-- Cascade Branches in Block -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${threadRules
                .map((r, rIdx) => {
                  const isLast = rIdx === threadRules.length - 1;
                  const conds = ControlSchemaArbiter.getRuleConditions(r);
                  const isAlways = conds.length === 1 && conds[0].type === "always";
                  const badge = rIdx === 0 ? "IF" : isLast && isAlways ? "ELSE" : "ELSE IF";
                  return renderBranchRowHtml(r, badge, depth, rIdx, threadRules.length, tId);
                })
                .join("")}
            </div>

            <!-- Add Branch to this Cascade Block -->
            <div style="display: flex; justify-content: flex-start; margin-top: 2px;">
              <button class="btn-add-thread-branch btn-secondary-action" data-thread-id="${tId}" style="font-size: 0.64rem; padding: 3px 8px; color: #ffffff; border: 1px dashed rgba(148, 163, 184, 0.3); background: rgba(255, 255, 255, 0.03); border-radius: 4px; cursor: pointer;">
                + Add Else If Branch
              </button>
            </div>
          </div>
        `);
        bIdx++;
      }
      return threadCards.join("");
    };

    return `
      ${renderCascadeBlocksHtml(rules, 0)}
      <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
        <button id="btn-add-control-thread" class="btn-secondary-action" style="font-size: 0.72rem; padding: 4px 12px; color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(255, 255, 255, 0.08); font-weight: 600; cursor: pointer;">
          + Add Cascade Block
        </button>
      </div>
    `;
  }

  private static formatTriggerLabel(item: { trigger: InputTriggerBinding } | InputTriggerBinding): string {
    const t = "trigger" in item ? item.trigger : item;
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

    // Modular Control Blocks Event Listeners
    if (this.activeTab === "keyboardMouse" || this.activeTab === "gamepad") {
      const blocks = this.getActiveBlocks(schema);
      const isGamepad = this.activeTab === "gamepad";

      // Add Control Block dropdown
      const selectAddBlock = root.querySelector("#select-add-control-block") as HTMLSelectElement;
      if (selectAddBlock) {
        selectAddBlock.addEventListener("change", () => {
          const type = selectAddBlock.value as any;
          if (!type) return;
          const newId = `block-${type}-${Date.now().toString(36)}`;
          if (type === "locomotion") {
            blocks.push(isGamepad ? {
              type: "locomotion",
              id: newId,
              name: "Locomotion",
              enabled: true,
              mode: "wasd",
              moveKeys: { upKey: "GamepadDpadUp", downKey: "GamepadDpadDown", leftKey: "GamepadDpadLeft", rightKey: "GamepadDpadRight", requireCleanPress: false },
              jump: { code: "GamepadA", requireCleanPress: true },
              sprint: { code: "GamepadLS", mode: "hold", requireCleanPress: false },
            } : {
              type: "locomotion",
              id: newId,
              name: "Locomotion",
              enabled: true,
              mode: "wasd",
              moveKeys: { upKey: "KeyW", downKey: "KeyS", leftKey: "KeyA", rightKey: "KeyD" },
              jump: { code: "Space" },
              sprint: { code: "ShiftLeft", mode: "hold" },
            });
          } else if (type === "itemInteraction") {
            blocks.push(isGamepad ? {
              type: "itemInteraction",
              id: newId,
              name: "Item Interaction",
              enabled: true,
              pickup: { code: "GamepadX", requireCleanPress: true },
              drop: { code: "GamepadY", requireCleanPress: true },
              swap: { code: "GamepadB", requireCleanPress: true },
              consume: { code: "GamepadLB", requireCleanPress: false },
              swapRequiresHolding: false,
              triggerPickupWhenEmptyHanded: true,
            } : {
              type: "itemInteraction",
              id: newId,
              name: "Item Interaction",
              enabled: true,
              pickup: { code: "MouseLeft" },
              drop: { code: "KeyQ" },
              swap: { code: "KeyF" },
              consume: { code: "KeyE" },
              swapRequiresHolding: false,
              triggerPickupWhenEmptyHanded: true,
            });
          } else if (type === "throw") {
            blocks.push(isGamepad ? {
              type: "throw",
              id: newId,
              name: "Throwing & Ballistics",
              enabled: true,
              mode: "chargeAndRelease",
              chargeTrigger: { code: "GamepadRT", requireCleanPress: true },
              aimTrigger: { code: "GamepadLT", requireCleanPress: false },
              fireTrigger: { code: "GamepadRT", requireCleanPress: true },
              quickTrigger: { code: "GamepadRT", requireCleanPress: true },
              arcModulation: { source: "none", autoCursorLock: false, sensitivity: 0.005 },
              enableProximityCancel: false,
              cancelRadius: 1.5,
            } : {
              type: "throw",
              id: newId,
              name: "Throwing & Ballistics",
              enabled: true,
              mode: "chargeAndRelease",
              chargeTrigger: { code: "MouseLeft" },
              aimTrigger: { code: "MouseRight" },
              fireTrigger: { code: "MouseLeft" },
              quickTrigger: { code: "MouseLeft" },
              arcModulation: { source: "mouseDeltaY", autoCursorLock: true, sensitivity: 0.005 },
              enableProximityCancel: false,
              cancelRadius: 1.5,
            });
          } else if (type === "melee") {
            blocks.push(isGamepad ? {
              type: "melee",
              id: newId,
              name: "Melee Combat",
              enabled: true,
              punch: { code: "GamepadB", requireCleanPress: true },
            } : {
              type: "melee",
              id: newId,
              name: "Melee Combat",
              enabled: true,
              punch: { code: "KeyF" },
            });
          } else if (type === "laser") {
            blocks.push(isGamepad ? {
              type: "laser",
              id: newId,
              name: "Laser Beam",
              enabled: true,
              aimTrigger: { code: "GamepadLT", requireCleanPress: false },
              aimMode: "mouseWorldPos",
              fireTrigger: { code: "GamepadRT", autoFireWhenAiming: false, requireCleanPress: false },
              powerLevel: { source: "none", sensitivity: 1.0 },
            } : {
              type: "laser",
              id: newId,
              name: "Laser Beam",
              enabled: true,
              aimTrigger: { code: "MouseRight", gateButtons: ["AltLeft"] },
              aimMode: "mouseWorldPos",
              fireTrigger: { code: "MouseLeft", autoFireWhenAiming: false },
              powerLevel: { source: "mouseWheel", sensitivity: 1.0 },
            });
          } else if (type === "facing") {
            blocks.push({
              type: "facing",
              id: newId,
              name: "Aim / Heading Facing",
              enabled: true,
              mode: "mouseWorldPos",
            });
          }
          this.renderActiveView();
        });
      }

      // Delete Block button
      root.querySelectorAll(".btn-block-delete").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const idx = blocks.findIndex((b) => b.id === bId);
          if (idx >= 0) {
            blocks.splice(idx, 1);
            this.renderActiveView();
          }
        });
      });

      // Toggle Block Enabled checkbox
      root.querySelectorAll(".block-toggle-enabled").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block) {
            block.enabled = (e.target as HTMLInputElement).checked;
            this.renderActiveView();
          }
        });
      });

      // Bind Primary Input Slot
      root.querySelectorAll(".btn-block-slot-bind").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const slotName = (btn as HTMLElement).dataset.slotName;
          if (bId && slotName) {
            this.startBlockKeyListening(bId, slotName);
          }
        });
      });

      // Clear Primary Input Slot (X button)
      root.querySelectorAll(".btn-block-slot-clear").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const slotName = (btn as HTMLElement).dataset.slotName;
          const block = blocks.find((b) => b.id === bId);
          if (block && slotName) {
            const slot = (block as any)[slotName];
            if (slot) {
              slot.code = null;
            }
            this.renderActiveView();
          }
        });
      });

      // Bind Gate Key
      root.querySelectorAll(".btn-block-slot-gate-bind").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const slotName = (btn as HTMLElement).dataset.slotName;
          const gateIdx = parseInt((btn as HTMLElement).dataset.gateIdx || "-1", 10);
          if (bId && slotName && gateIdx >= 0) {
            this.startBlockKeyListening(bId, slotName, gateIdx);
          }
        });
      });

      // Remove Gate Key (X button)
      root.querySelectorAll(".btn-block-slot-gate-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const slotName = (btn as HTMLElement).dataset.slotName;
          const gateIdx = parseInt((btn as HTMLElement).dataset.gateIdx || "-1", 10);
          const block = blocks.find((b) => b.id === bId);
          if (block && slotName && gateIdx >= 0) {
            const slot = (block as any)[slotName];
            if (slot && slot.gateButtons) {
              slot.gateButtons.splice(gateIdx, 1);
            }
            this.renderActiveView();
          }
        });
      });

      // Add Gate Key
      root.querySelectorAll(".btn-block-slot-add-gate").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const slotName = (btn as HTMLElement).dataset.slotName;
          const block = blocks.find((b) => b.id === bId);
          if (bId && block && slotName) {
            let slot = (block as any)[slotName];
            if (!slot) {
              slot = { code: null, gateButtons: [] };
              (block as any)[slotName] = slot;
            }
            slot.gateButtons = slot.gateButtons || [];
            const newIdx = slot.gateButtons.length;
            slot.gateButtons.push("KeyD");
            this.startBlockKeyListening(bId, slotName, newIdx);
          }
        });
      });

      // Move Keys (WASD / Relative Strafe)
      root.querySelectorAll(".btn-block-move-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const moveKey = (btn as HTMLElement).dataset.moveKey as any;
          if (bId && moveKey) {
            this.startBlockKeyListening(bId, "moveKeys", undefined, moveKey);
          }
        });
      });

      // Move Key Clear (X button)
      root.querySelectorAll(".btn-block-move-key-clear").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const moveKey = (btn as HTMLElement).dataset.moveKey as any;
          const block = blocks.find((b) => b.id === bId);
          if (block && block.type === "locomotion" && moveKey) {
            const loco = block as LocomotionControlBlock;
            if (moveKey === "reverseKey" || moveKey === "strafeLeftKey" || moveKey === "strafeRightKey") {
              (loco as any)[moveKey] = null;
            } else if (loco.moveKeys) {
              loco.moveKeys[moveKey as "upKey" | "downKey" | "leftKey" | "rightKey"] = null;
            }
            this.renderActiveView();
          }
        });
      });

      // Locomotion Mode selector (WASD vs Walk to Mouse)
      root.querySelectorAll(".block-loco-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LocomotionControlBlock;
          if (block) {
            block.mode = (e.target as HTMLSelectElement).value as any;
            this.renderActiveView();
          }
        });
      });

      // Slot Clean Press Toggle
      root.querySelectorAll(".block-slot-clean-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const slotName = (chk as HTMLElement).dataset.slotName;
          const block = blocks.find((b) => b.id === bId);
          if (block && slotName) {
            const slot = (block as any)[slotName] as BlockInputSlot | undefined;
            const checked = (e.target as HTMLInputElement).checked;
            if (slot) {
              slot.requireCleanPress = checked;
            } else {
              (block as any)[slotName] = { code: null, requireCleanPress: checked };
            }
            this.renderActiveView();
          }
        });
      });

      // Move Keys Clean Tap Toggle
      root.querySelectorAll(".block-move-keys-clean-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId);
          if (block && block.type === "locomotion") {
            const loco = block as LocomotionControlBlock;
            loco.moveKeys = loco.moveKeys || {};
            loco.moveKeys.requireCleanPress = (e.target as HTMLInputElement).checked;
            this.renderActiveView();
          }
        });
      });

      // Sprint mode
      root.querySelectorAll(".block-sprint-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LocomotionControlBlock;
          if (block && block.sprint) {
            block.sprint.mode = (e.target as HTMLSelectElement).value as any;
          }
        });
      });

      // Laser aim mode
      root.querySelectorAll(".block-laser-aim-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LaserControlBlock;
          if (block) {
            block.aimMode = (e.target as HTMLSelectElement).value as any;
          }
        });
      });

      // Laser autofire
      root.querySelectorAll(".block-laser-autofire").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LaserControlBlock;
          if (block && block.fireTrigger) {
            block.fireTrigger.autoFireWhenAiming = (e.target as HTMLInputElement).checked;
          }
        });
      });

      // Laser power source
      root.querySelectorAll(".block-laser-power-source").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LaserControlBlock;
          if (block) {
            block.powerLevel = block.powerLevel || {};
            block.powerLevel.source = (e.target as HTMLSelectElement).value as any;
            this.renderActiveView();
          }
        });
      });

      // Laser power clear
      root.querySelectorAll(".btn-block-laser-power-clear").forEach((btn) => {
        btn.addEventListener("click", () => {
          const bId = (btn as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LaserControlBlock;
          if (block && block.powerLevel) {
            block.powerLevel.source = "none";
            this.renderActiveView();
          }
        });
      });

      // Throw mode
      root.querySelectorAll(".block-throw-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as ThrowControlBlock;
          if (block) {
            block.mode = (e.target as HTMLSelectElement).value as any;
            this.renderActiveView();
          }
        });
      });

      // Throw arc source
      root.querySelectorAll(".block-throw-arc-source").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as ThrowControlBlock;
          if (block) {
            block.arcModulation = block.arcModulation || {};
            block.arcModulation.source = (e.target as HTMLSelectElement).value as any;
            this.renderActiveView();
          }
        });
      });

      // Throw proximity cancel toggle
      root.querySelectorAll(".block-throw-cancel-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as ThrowControlBlock;
          if (block) {
            block.enableProximityCancel = (e.target as HTMLInputElement).checked;
            if (block.cancelRadius === undefined) block.cancelRadius = 1.5;
            this.renderActiveView();
          }
        });
      });

      // Throw proximity cancel radius input
      root.querySelectorAll(".block-throw-cancel-radius").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const bId = (inp as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as ThrowControlBlock;
          if (block) {
            const val = parseFloat((e.target as HTMLInputElement).value);
            block.cancelRadius = isNaN(val) ? 1.5 : Math.max(0.1, val);
            this.renderActiveView();
          }
        });
      });

      // Throw trigger pull deadzone margin input
      root.querySelectorAll(".block-throw-trigger-margin").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const bId = (inp as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as ThrowControlBlock;
          if (block) {
            const val = parseFloat((e.target as HTMLInputElement).value);
            block.triggerMargin = isNaN(val) ? 0.15 : Math.max(0.0, Math.min(0.5, val));
            this.renderActiveView();
          }
        });
      });

      // Locomotion cursor steer mode select
      root.querySelectorAll(".block-loco-cursor-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LocomotionControlBlock;
          if (block) {
            block.cursorSteerMode = (e.target as HTMLSelectElement).value as any;
            this.renderActiveView();
          }
        });
      });

      // Locomotion raw direction while walking toggle
      root.querySelectorAll(".block-loco-raw-walking-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LocomotionControlBlock;
          if (block) {
            block.rawDirectionWhileWalking = (e.target as HTMLInputElement).checked;
          }
        });
      });

      // Locomotion stick cursor in front toggle
      root.querySelectorAll(".block-loco-stick-cursor-toggle").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LocomotionControlBlock;
          if (block) {
            block.stickCursorInFront = (e.target as HTMLInputElement).checked;
            this.renderActiveView();
          }
        });
      });

      // Locomotion cursor max clamp distance input
      root.querySelectorAll(".block-loco-cursor-max-dist").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const bId = (inp as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as LocomotionControlBlock;
          if (block) {
            const val = parseFloat((e.target as HTMLInputElement).value);
            if (!isNaN(val) && val > 0) {
              block.cursorMaxDistance = val;
            }
          }
        });
      });

      // Item swap requires holding checkbox
      root.querySelectorAll(".block-item-swap-requires-holding").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as ItemInteractionControlBlock;
          if (block) {
            block.swapRequiresHolding = (e.target as HTMLInputElement).checked;
          }
        });
      });

      // Item trigger pickup when empty-handed checkbox
      root.querySelectorAll(".block-item-trigger-pickup-empty").forEach((chk) => {
        chk.addEventListener("change", (e) => {
          const bId = (chk as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as ItemInteractionControlBlock;
          if (block) {
            block.triggerPickupWhenEmptyHanded = (e.target as HTMLInputElement).checked;
          }
        });
      });

      // Facing mode
      root.querySelectorAll(".block-facing-mode").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const bId = (sel as HTMLElement).dataset.blockId;
          const block = blocks.find((b) => b.id === bId) as FacingControlBlock;
          if (block) {
            block.mode = (e.target as HTMLSelectElement).value as any;
          }
        });
      });
    }

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

    // 8c. Collapse All / Expand All Rules
    root.querySelector("#btn-collapse-all-rules")?.addEventListener("click", () => {
      const rules =
        this.activeTab === "keyboardMouse"
          ? schema.keyboardMouse.rules
          : this.activeTab === "gamepad"
          ? schema.gamepad.rules
          : schema.touch.rules;
      for (const r of rules) {
        this.collapsedRuleIds.add(r.id);
      }
      this.renderActiveView();
    });

    root.querySelector("#btn-expand-all-rules")?.addEventListener("click", () => {
      this.collapsedRuleIds.clear();
      this.renderActiveView();
    });

    // Navigation Jump Listeners between Layer 1 and Layer 2
    root.querySelector("#btn-jump-to-tags")?.addEventListener("click", () => {
      const scrollBody = root.querySelector("#controls-scroll-body") as HTMLElement | null;
      if (scrollBody) {
        scrollBody.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    root.querySelector("#btn-jump-to-rules")?.addEventListener("click", () => {
      const rulesHeader = root.querySelector("#section-rules-header") as HTMLElement | null;
      if (rulesHeader) {
        rulesHeader.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    root.querySelector("#btn-add-tag")?.addEventListener("click", () => {
      const tags = this.getActiveDeviceTags(schema);
      const isPad = this.activeTab === "gamepad";
      const newTag: InputTagBinding = {
        id: (isPad ? "tag-pad-" : "tag-kbm-") + Math.random().toString(36).substring(2, 8),
        name: `Tag ${tags.length + 1}`,
        trigger: isPad
          ? { device: "gamepad", code: "GamepadA", mode: "press" }
          : { device: "keyboard", code: "KeyF", mode: "press" },
      };
      tags.push(newTag);
      this.renderActiveView();
    });

    root.querySelectorAll(".input-tag-name").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const tagId = (inp as HTMLElement).dataset.tagId;
        const val = (e.target as HTMLInputElement).value;
        const tags = this.getActiveDeviceTags(schema);
        const tag = tags.find((t) => t.id === tagId);
        if (tag) tag.name = val;
      });
      inp.addEventListener("change", () => {
        this.renderActiveView();
      });
    });

    root.querySelectorAll(".btn-bind-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tagId = (btn as HTMLElement).dataset.tagId;
        if (tagId) {
          this.startTagTriggerListening(tagId);
        }
      });
    });

    root.querySelectorAll(".btn-delete-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tagId = (btn as HTMLElement).dataset.tagId;
        const tags = this.getActiveDeviceTags(schema);
        const idx = tags.findIndex((t) => t.id === tagId);
        if (idx !== -1) {
          tags.splice(idx, 1);
          const rules =
            this.activeTab === "keyboardMouse"
              ? schema.keyboardMouse.rules
              : this.activeTab === "gamepad"
              ? schema.gamepad.rules
              : schema.touch.rules;
          for (const rule of rules) {
            if (rule.tagId === tagId) {
              rule.tagId = tags[0]?.id;
              if (tags[0]) {
                rule.trigger.code = tags[0].trigger.code;
                rule.trigger.device = tags[0].trigger.device;
                rule.trigger.chordModifiers = tags[0].trigger.chordModifiers ? [...tags[0].trigger.chordModifiers] : undefined;
              }
            }
          }
          this.renderActiveView();
        }
      });
    });

    // Stage Management Listeners
    root.querySelector("#btn-add-stage-group")?.addEventListener("click", () => {
      const groups = ControlsInspector.getActiveStageGroups(schema);
      let counter = groups.length + 1;
      let newName = `set_${counter}`;
      while (groups.some((g) => g.name === newName)) {
        counter++;
        newName = `set_${counter}`;
      }
      groups.push({ name: newName, stages: ["none"] });
      this.renderActiveView();
    });

    root.querySelectorAll(".input-stage-group-name").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const gIdx = parseInt((inp as HTMLElement).dataset.groupIdx ?? "-1", 10);
        const groups = ControlsInspector.getActiveStageGroups(schema);
        if (gIdx >= 0 && groups[gIdx]) {
          const oldName = groups[gIdx].name;
          const newName = (e.target as HTMLInputElement).value.trim();
          if (!newName || groups.some((g, i) => i !== gIdx && g.name === newName)) {
            (e.target as HTMLInputElement).value = oldName;
            return;
          }
          groups[gIdx].name = newName;
          ControlsInspector.renameStageGroupInRules(schema, oldName, newName);
          this.renderActiveView();
        }
      });
    });

    root.querySelectorAll(".btn-delete-stage-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gIdx = parseInt((btn as HTMLElement).dataset.groupIdx ?? "-1", 10);
        const groups = ControlsInspector.getActiveStageGroups(schema);
        if (groups.length > 1 && gIdx >= 0 && groups[gIdx]) {
          const oldName = groups[gIdx].name;
          groups.splice(gIdx, 1);
          ControlsInspector.deleteStageGroupInRules(schema, oldName);
          this.renderActiveView();
        }
      });
    });

    root.querySelectorAll(".btn-add-stage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gIdx = parseInt((btn as HTMLElement).dataset.groupIdx ?? "0", 10);
        const groups = ControlsInspector.getActiveStageGroups(schema);
        if (groups[gIdx]) {
          const group = groups[gIdx];
          let counter = 1;
          let newName = `stage_${counter}`;
          while (group.stages.includes(newName)) {
            counter++;
            newName = `stage_${counter}`;
          }
          group.stages.push(newName);
          this.renderActiveView();
        }
      });
    });

    root.querySelectorAll(".input-stage-name").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const gIdx = parseInt((inp as HTMLElement).dataset.groupIdx ?? "0", 10);
        const sIdx = parseInt((inp as HTMLElement).dataset.stageIdx ?? "-1", 10);
        if (sIdx <= 0) return; // Cannot edit "none"
        const groups = ControlsInspector.getActiveStageGroups(schema);
        if (groups[gIdx] && groups[gIdx].stages[sIdx]) {
          const group = groups[gIdx];
          const oldName = group.stages[sIdx];
          const newName = (e.target as HTMLInputElement).value.trim();
          if (!newName || newName === "none" || (group.stages.includes(newName) && group.stages.indexOf(newName) !== sIdx)) {
            (e.target as HTMLInputElement).value = oldName;
            return;
          }
          group.stages[sIdx] = newName;
          ControlsInspector.renameStageInRules(schema, group.name, oldName, newName);
          this.renderActiveView();
        }
      });
    });

    root.querySelectorAll(".btn-delete-stage").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gIdx = parseInt((btn as HTMLElement).dataset.groupIdx ?? "0", 10);
        const sIdx = parseInt((btn as HTMLElement).dataset.stageIdx ?? "-1", 10);
        if (sIdx <= 0) return; // Cannot delete "none"
        const groups = ControlsInspector.getActiveStageGroups(schema);
        if (groups[gIdx] && groups[gIdx].stages[sIdx]) {
          const group = groups[gIdx];
          const oldName = group.stages[sIdx];
          group.stages.splice(sIdx, 1);
          ControlsInspector.deleteStageInRules(schema, group.name, oldName);
          this.renderActiveView();
        }
      });
    });

    // 9. Add Thread Button / Add New Cascade Thread
    const addNewThread = () => {
      const rules =
        this.activeTab === "keyboardMouse"
          ? schema.keyboardMouse.rules
          : this.activeTab === "gamepad"
          ? schema.gamepad.rules
          : schema.touch.rules;
      const threadId = `thread-${Date.now().toString(36)}`;
      const newRule: ControlRule = {
        id: "rule-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        name: "Action Branch",
        enabled: true,
        priority: 50,
        threadId,
        trigger: { device: "keyboard", code: "Always", mode: "hold" },
        conditions: [{ type: "always" }],
        condition: { type: "always" },
        actions: [{ moduleId: "throwPickup", intent: "grabItem" }],
        action: { moduleId: "throwPickup", intent: "grabItem" },
      };
      rules.push(newRule);
      this.renderActiveView();
    };

    root.querySelector("#btn-add-control-rule")?.addEventListener("click", addNewThread);
    root.querySelector("#btn-add-control-thread")?.addEventListener("click", addNewThread);

    // 9a. Add Thread Branch (IF / ELSE IF)
    root.querySelectorAll(".btn-add-thread-branch").forEach((btn) => {
      btn.addEventListener("click", () => {
        const threadId = (btn as HTMLElement).dataset.threadId || `thread-${Date.now().toString(36)}`;
        const rootRules =
          this.activeTab === "keyboardMouse"
            ? schema.keyboardMouse.rules
            : this.activeTab === "gamepad"
            ? schema.gamepad.rules
            : schema.touch.rules;
        const targetList = this.findRuleListForThread(schema, threadId) ?? rootRules;

        const newRule: ControlRule = {
          id: "rule-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
          name: "Action Branch",
          enabled: true,
          priority: 50,
          threadId,
          trigger: { device: "keyboard", code: "Always", mode: "hold" },
          conditions: [{ type: "always" }],
          condition: { type: "always" },
          actions: [{ moduleId: "throwPickup", intent: "grabItem" }],
          action: { moduleId: "throwPickup", intent: "grabItem" },
        };
        targetList.push(newRule);
        this.renderActiveView();
      });
    });

    // 9a2. Add Nested Thread within an action block (THEN: block)
    root.querySelectorAll(".btn-add-nested-thread").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.addNestedThreadToRule(rule);
        }
      });
    });

    // 9b. Toggle Individual Rule Collapse
    root.querySelectorAll(".btn-toggle-rule-collapse").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        if (rId) {
          if (this.collapsedRuleIds.has(rId)) {
            this.collapsedRuleIds.delete(rId);
          } else {
            this.collapsedRuleIds.add(rId);
          }
          this.renderActiveView();
        }
      });
    });

    // 10. Rule Select Tag
    root.querySelectorAll(".select-rule-tag").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const tagId = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          if (!tagId) {
            rule.tagId = undefined;
            rule.trigger.code = "Always";
            rule.trigger.device = "keyboard";
            rule.trigger.chordModifiers = undefined;
          } else {
            rule.tagId = tagId;
            const tags = this.getActiveDeviceTags(schema);
            const tag = tags.find((t) => t.id === tagId);
            if (tag) {
              rule.trigger.code = tag.trigger.code;
              rule.trigger.device = tag.trigger.device;
              rule.trigger.chordModifiers = tag.trigger.chordModifiers ? [...tag.trigger.chordModifiers] : undefined;
            }
          }
          this.renderActiveView();
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
          this.renderActiveView();
        }
      });
    });

    // 12. Rule Conditions (Multiple, Nested Groups & Logical Operators)
    root.querySelectorAll(".btn-toggle-cond-op").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const gPath = (btn as HTMLElement).dataset.groupPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          if (gPath === "") {
            rule.conditionOp = (rule.conditionOp ?? "and") === "and" ? "or" : "and";
          } else {
            const res = ControlsInspector.getConditionGroupList(rule, gPath);
            if (res?.group) {
              res.group.op = (res.group.op ?? "or") === "and" ? "or" : "and";
            }
          }
          this.renderActiveView();
        }
      });
    });

    root.querySelectorAll(".btn-add-condition").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const gPath = (btn as HTMLElement).dataset.groupPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          const res = ControlsInspector.getConditionGroupList(rule, gPath);
          if (res) {
            res.list.push({ type: "always" });
            rule.conditions = ControlSchemaArbiter.getRuleConditions(rule);
            rule.condition = rule.conditions[0];
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".btn-add-cond-group").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const gPath = (btn as HTMLElement).dataset.groupPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          const res = ControlsInspector.getConditionGroupList(rule, gPath);
          if (res) {
            res.list.push({
              type: "group",
              op: "or",
              conditions: [{ type: "always" }, { type: "always" }],
            });
            rule.conditions = ControlSchemaArbiter.getRuleConditions(rule);
            rule.condition = rule.conditions[0];
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".btn-delete-condition").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const cPath = (btn as HTMLElement).dataset.condPath ?? "";
        const rule = this.findRule(schema, rId);
        if (rule) {
          const res = ControlsInspector.getConditionListAndIndex(rule, cPath);
          if (res) {
            if (res.list.length > 1) {
              res.list.splice(res.index, 1);
            } else {
              res.list[0] = { type: "always" };
            }
            rule.conditions = ControlSchemaArbiter.getRuleConditions(rule);
            rule.condition = rule.conditions[0];
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".select-rule-cond").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const cPath = (sel as HTMLElement).dataset.condPath ?? "";
        const val = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            if (val === "stagedActionIs") {
              targetCond.type = "stagedActionIs";
              const groups = ControlsInspector.getActiveStageGroups(schema);
              if (!targetCond.stageGroup || !groups.some((g) => g.name === targetCond.stageGroup)) {
                targetCond.stageGroup = groups[0]?.name || "default";
              }
              const stages = ControlsInspector.getStagesForGroup(schema, targetCond.stageGroup);
              if (!targetCond.param || !stages.includes(targetCond.param)) {
                targetCond.param = "none";
              }
            } else if (val === "tagPressed" || val === "tagHeld" || val === "tagReleased") {
              targetCond.type = val;
              const tags = this.getActiveDeviceTags(schema);
              if (!targetCond.param || !tags.some((t) => t.id === targetCond.param)) {
                targetCond.param = tags[0]?.id ?? "";
              }
            } else if (val === "buttonHeld") {
              targetCond.type = "buttonHeld";
              if (!targetCond.param) targetCond.param = "MouseRight";
            } else {
              targetCond.type = val as ConditionType;
              targetCond.param = undefined;
            }
            rule.condition = rule.conditions?.[0];
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".select-cond-tag").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const cPath = (sel as HTMLElement).dataset.condPath ?? "";
        const val = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
            rule.condition = rule.conditions?.[0];
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".select-cond-stage-group").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const cPath = (sel as HTMLElement).dataset.condPath ?? "";
        const val = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.stageGroup = val;
            const stages = ControlsInspector.getStagesForGroup(schema, val);
            if (!targetCond.param || !stages.includes(targetCond.param)) {
              targetCond.param = "none";
            }
            rule.condition = rule.conditions?.[0];
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".select-cond-stage").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const cPath = (sel as HTMLElement).dataset.condPath ?? "";
        const val = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
            rule.condition = rule.conditions?.[0];
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".input-cond-param").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const rId = (inp as HTMLElement).dataset.ruleId;
        const cPath = (inp as HTMLElement).dataset.condPath ?? "";
        const val = (e.target as HTMLInputElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const targetCond = ControlsInspector.getConditionByPath(rule, cPath);
          if (targetCond) {
            targetCond.param = val;
          }
        }
      });
    });

    root.querySelectorAll(".select-action-stage-group").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((sel as HTMLElement).dataset.statementIdx ?? "0", 10);
        const val = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = (stmts[sIdx] as ActionStatement).action;
            act.args = { ...(act.args || {}), group: val };
            const stages = ControlsInspector.getStagesForGroup(schema, val);
            if (!act.args.stage || !stages.includes(act.args.stage)) {
              act.args.stage = "none";
            }
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
            this.renderActiveView();
          }
        }
      });
    });

    root.querySelectorAll(".select-action-stage").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const rId = (sel as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((sel as HTMLElement).dataset.statementIdx ?? "0", 10);
        const val = (e.target as HTMLSelectElement).value;
        const rule = this.findRule(schema, rId);
        if (rule) {
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[sIdx] && stmts[sIdx].type === "action") {
            const act = (stmts[sIdx] as ActionStatement).action;
            act.args = { ...(act.args || {}), stage: val };
            rule.body = stmts;
            ControlSchemaArbiter.syncRuleFromStatements(rule);
            this.renderActiveView();
          }
        }
      });
    });

    // 12b. Rule Actions & Statements (Multiple & Interleaved)
    root.querySelectorAll(".btn-add-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.addActionToRule(rule);
        }
      });
    });

    root.querySelectorAll(".btn-move-statement-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((btn as HTMLElement).dataset.statementIdx ?? "0", 10);
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.moveStatement(rule, sIdx, -1);
        }
      });
    });

    root.querySelectorAll(".btn-move-statement-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((btn as HTMLElement).dataset.statementIdx ?? "0", 10);
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.moveStatement(rule, sIdx, 1);
        }
      });
    });

    root.querySelectorAll(".btn-delete-statement").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rId = (btn as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((btn as HTMLElement).dataset.statementIdx ?? "0", 10);
        const rule = this.findRule(schema, rId);
        if (rule) {
          this.deleteStatement(rule, sIdx);
        }
      });
    });

    root.querySelectorAll(".btn-move-branch-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = (btn as HTMLElement).dataset.threadId;
        const bIdx = parseInt((btn as HTMLElement).dataset.branchIdx ?? "0", 10);
        if (tId) {
          this.moveBranch(schema, tId, bIdx, -1);
        }
      });
    });

    root.querySelectorAll(".btn-move-branch-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = (btn as HTMLElement).dataset.threadId;
        const bIdx = parseInt((btn as HTMLElement).dataset.branchIdx ?? "0", 10);
        if (tId) {
          this.moveBranch(schema, tId, bIdx, 1);
        }
      });
    });

    root.querySelectorAll(".btn-move-cascade-block-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = (btn as HTMLElement).dataset.threadId;
        if (tId) {
          this.moveCascadeBlock(schema, tId, -1);
        }
      });
    });

    root.querySelectorAll(".btn-move-cascade-block-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tId = (btn as HTMLElement).dataset.threadId;
        if (tId) {
          this.moveCascadeBlock(schema, tId, 1);
        }
      });
    });

    // 13. Rule Action Picker Popover
    root.querySelectorAll(".btn-open-action-picker").forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const rId = (btn as HTMLElement).dataset.ruleId;
        const sIdx = parseInt((btn as HTMLElement).dataset.statementIdx ?? (btn as HTMLElement).dataset.actionIdx ?? "0", 10);
        if (rId) {
          this.showActionPickerMenu(rId, sIdx, btn as HTMLElement);
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
    const rootRules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;

    function search(list: ControlRule[]): ControlRule | undefined {
      for (const r of list) {
        if (r.id === ruleId) return r;
        for (const stmt of ControlSchemaArbiter.getRuleBody(r)) {
          if (stmt.type === "nestedThread") {
            const found = search(stmt.rules);
            if (found) return found;
          }
        }
        if (r.children && r.children.length > 0) {
          const found = search(r.children);
          if (found) return found;
        }
      }
      return undefined;
    }

    return search(rootRules);
  }

  private static deleteRule(schema: ControlSchema, ruleId?: string): void {
    if (!ruleId) return;
    const rootRules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;

    function remove(list: ControlRule[]): boolean {
      const idx = list.findIndex((r) => r.id === ruleId);
      if (idx !== -1) {
        list.splice(idx, 1);
        return true;
      }
      for (const r of list) {
        for (const stmt of ControlSchemaArbiter.getRuleBody(r)) {
          if (stmt.type === "nestedThread") {
            if (remove(stmt.rules)) {
              ControlSchemaArbiter.syncRuleFromStatements(r);
              return true;
            }
          }
        }
        if (r.children && r.children.length > 0) {
          if (remove(r.children)) return true;
        }
      }
      return false;
    }

    remove(rootRules);
  }

  private static findRuleListForThread(schema: ControlSchema, threadId: string): ControlRule[] | null {
    const rootRules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;

    function search(list: ControlRule[]): ControlRule[] | null {
      if (list.some((r) => r.threadId === threadId)) {
        return list;
      }
      for (const r of list) {
        for (const stmt of ControlSchemaArbiter.getRuleBody(r)) {
          if (stmt.type === "nestedThread") {
            const found = search(stmt.rules);
            if (found) return found;
          }
        }
        if (r.children && r.children.length > 0) {
          const found = search(r.children);
          if (found) return found;
        }
      }
      return null;
    }

    return search(rootRules);
  }

  private static addActionToRule(rule: ControlRule): void {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    stmts.push({
      type: "action",
      action: { moduleId: "locomotion", intent: "jump" },
    });
    rule.body = stmts;
    ControlSchemaArbiter.syncRuleFromStatements(rule);
    this.renderActiveView();
  }

  private static addNestedThreadToRule(rule: ControlRule): void {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    const subThreadId = `subthread-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
    const newChildRule: ControlRule = {
      id: "rule-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      name: "Nested Action Branch",
      enabled: true,
      priority: 50,
      threadId: subThreadId,
      trigger: { device: "keyboard", code: "Always", mode: "hold" },
      conditions: [{ type: "always" }],
      condition: { type: "always" },
      actions: [{ moduleId: "throwPickup", intent: "grabItem" }],
      action: { moduleId: "throwPickup", intent: "grabItem" },
      body: [{ type: "action", action: { moduleId: "throwPickup", intent: "grabItem" } }],
    };
    stmts.push({
      type: "nestedThread",
      threadId: subThreadId,
      rules: [newChildRule],
    });
    rule.body = stmts;
    ControlSchemaArbiter.syncRuleFromStatements(rule);
    this.renderActiveView();
  }

  private static moveStatement(rule: ControlRule, stmtIdx: number, delta: -1 | 1): void {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    const targetIdx = stmtIdx + delta;
    if (targetIdx < 0 || targetIdx >= stmts.length) return;
    const temp = stmts[stmtIdx];
    stmts[stmtIdx] = stmts[targetIdx];
    stmts[targetIdx] = temp;
    rule.body = stmts;
    ControlSchemaArbiter.syncRuleFromStatements(rule);
    this.renderActiveView();
  }

  private static deleteStatement(rule: ControlRule, stmtIdx: number): void {
    const stmts = ControlSchemaArbiter.getRuleBody(rule);
    if (stmtIdx >= 0 && stmtIdx < stmts.length) {
      stmts.splice(stmtIdx, 1);
      rule.body = stmts;
      ControlSchemaArbiter.syncRuleFromStatements(rule);
      this.renderActiveView();
    }
  }

  private static moveBranch(schema: ControlSchema, threadId: string, branchIdx: number, delta: -1 | 1): void {
    const list = this.findRuleListForThread(schema, threadId);
    if (!list) return;
    const threadRules = list.filter((r) => r.threadId === threadId);
    const targetBranchIdx = branchIdx + delta;
    if (targetBranchIdx < 0 || targetBranchIdx >= threadRules.length) return;
    const ruleA = threadRules[branchIdx];
    const ruleB = threadRules[targetBranchIdx];
    const idxA = list.indexOf(ruleA);
    const idxB = list.indexOf(ruleB);
    if (idxA !== -1 && idxB !== -1) {
      list[idxA] = ruleB;
      list[idxB] = ruleA;
      this.renderActiveView();
    }
  }

  private static moveCascadeBlock(schema: ControlSchema, threadId: string, delta: -1 | 1): void {
    const rootRules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;

    const distinctThreadIds: string[] = [];
    for (const r of rootRules) {
      const tId = r.threadId || `thread-${r.id}`;
      if (!distinctThreadIds.includes(tId)) {
        distinctThreadIds.push(tId);
      }
    }

    const curIdx = distinctThreadIds.indexOf(threadId);
    const targetIdx = curIdx + delta;
    if (curIdx === -1 || targetIdx < 0 || targetIdx >= distinctThreadIds.length) return;

    const otherThreadId = distinctThreadIds[targetIdx];
    const groups = new Map<string, ControlRule[]>();
    for (const tId of distinctThreadIds) {
      groups.set(tId, []);
    }
    for (const r of rootRules) {
      const tId = r.threadId || `thread-${r.id}`;
      groups.get(tId)?.push(r);
    }

    distinctThreadIds[curIdx] = otherThreadId;
    distinctThreadIds[targetIdx] = threadId;

    rootRules.length = 0;
    for (const tId of distinctThreadIds) {
      const grp = groups.get(tId);
      if (grp) rootRules.push(...grp);
    }
    this.renderActiveView();
  }

  // --- "Press Input to Bind" Tag Recorder (Layer 1) ---

  private static syncRulesForTag(schema: ControlSchema, tag: InputTagBinding): void {
    const rules =
      this.activeTab === "keyboardMouse"
        ? schema.keyboardMouse.rules
        : this.activeTab === "gamepad"
        ? schema.gamepad.rules
        : schema.touch.rules;
    for (const rule of rules) {
      if (rule.tagId === tag.id) {
        rule.trigger.device = tag.trigger.device;
        rule.trigger.code = tag.trigger.code;
        rule.trigger.chordModifiers = tag.trigger.chordModifiers ? [...tag.trigger.chordModifiers] : undefined;
      }
    }
  }

  private static startTagTriggerListening(tagId: string): void {
    if (this.recorderCleanup) this.recorderCleanup();
    this.listeningTagId = tagId;
    this.renderActiveView();

    if (!this.workingSchema) return;
    const schema = this.workingSchema;
    const tags = this.getActiveDeviceTags(schema);
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    if (this.activeTab === "gamepad") {
      let isDone = false;
      let animId: number | null = null;

      const pollGamepad = () => {
        if (isDone) return;
        const gamepads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
        for (let g = 0; g < gamepads.length; g++) {
          const gp = gamepads[g];
          if (!gp) continue;
          for (let b = 0; b < gp.buttons.length; b++) {
            if (gp.buttons[b].pressed || gp.buttons[b].value > 0.5) {
              const code = ControlSchemaArbiter.formatGamepadButtonIndex(b);
              tag.trigger = {
                device: "gamepad",
                code,
                mode: "press",
              };
              this.syncRulesForTag(schema, tag);
              cleanup();
              this.listeningTagId = null;
              this.renderActiveView();
              return;
            }
          }
        }
        animId = requestAnimationFrame(pollGamepad);
      };

      const cleanup = () => {
        isDone = true;
        if (animId !== null) cancelAnimationFrame(animId);
        window.removeEventListener("keydown", onKeyDown, true);
        if (this.popoutWindow && !this.popoutWindow.closed) {
          this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        }
        this.recorderCleanup = null;
      };

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Escape") {
          cleanup();
          this.listeningTagId = null;
          this.renderActiveView();
        }
      };

      this.recorderCleanup = cleanup;
      window.addEventListener("keydown", onKeyDown, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      }
      animId = requestAnimationFrame(pollGamepad);
      return;
    }

    // Keyboard & Mouse recording with immediate modifier detection + chord support
    let heldModifier: string | null = null;
    let chordTimer: any = null;

    const commitTrigger = (device: "keyboard" | "mouse", code: string, chordModifiers?: string[]) => {
      tag.trigger = {
        device,
        code,
        chordModifiers: chordModifiers && chordModifiers.length > 0 ? chordModifiers : undefined,
        mode: "press",
      };
      this.syncRulesForTag(schema, tag);
      cleanup();
      this.listeningTagId = null;
      this.renderActiveView();
    };

    const isModifier = (code: string) =>
      ["AltLeft", "AltRight", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "MetaLeft", "MetaRight"].includes(code);

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape") {
        cleanup();
        this.listeningTagId = null;
        this.renderActiveView();
        return;
      }

      if (isModifier(e.code)) {
        if (!heldModifier) {
          heldModifier = e.code;
          // Set ~250ms timer to bind as standalone modifier if no second key is pressed
          chordTimer = setTimeout(() => {
            if (heldModifier) {
              commitTrigger("keyboard", heldModifier);
            }
          }, 250);
        }
        return;
      }

      // Non-modifier pressed!
      if (heldModifier) {
        if (chordTimer) clearTimeout(chordTimer);
        commitTrigger("keyboard", e.code, [heldModifier]);
      } else {
        commitTrigger("keyboard", e.code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // If releasing the modifier before another key was pressed, bind immediately as standalone
      if (heldModifier && e.code === heldModifier) {
        if (chordTimer) clearTimeout(chordTimer);
        commitTrigger("keyboard", heldModifier);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const btnName = e.button === 0 ? "MouseLeft" : e.button === 1 ? "MouseMiddle" : "MouseRight";
      if (heldModifier) {
        if (chordTimer) clearTimeout(chordTimer);
        commitTrigger("mouse", btnName, [heldModifier]);
      } else {
        commitTrigger("mouse", btnName);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const cleanup = () => {
      if (chordTimer) clearTimeout(chordTimer);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      if (this.popoutWindow && !this.popoutWindow.closed) {
        this.popoutWindow.removeEventListener("keydown", onKeyDown, true);
        this.popoutWindow.removeEventListener("keyup", onKeyUp, true);
        this.popoutWindow.removeEventListener("mousedown", onMouseDown, true);
        this.popoutWindow.removeEventListener("contextmenu", onContextMenu, true);
      }
      this.recorderCleanup = null;
    };

    this.recorderCleanup = cleanup;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    if (this.popoutWindow && !this.popoutWindow.closed) {
      this.popoutWindow.addEventListener("keydown", onKeyDown, true);
      this.popoutWindow.addEventListener("keyup", onKeyUp, true);
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

  private static showActionPickerMenu(ruleId: string, statementIdx: number, anchorBtn: HTMLElement): void {
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
      border: 1px solid rgba(148, 163, 184, 0.3);
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
      <div style="font-size: 0.74rem; font-weight: 700; color: #ffffff; padding-bottom: 6px; border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
        Select Target Action Function
      </div>

      <!-- Attached Modules (Prioritized) -->
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 0.66rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">⭐ ATTACHED MODULES</span>
        ${attached
          .map(
            (cat) => `
          <div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.03); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 4px; padding: 4px;">
            <span style="font-size: 0.70rem; font-weight: 600; color: #ffffff;">${cat.icon} ${cat.label}</span>
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 2px; padding-left: 6px;">
              ${cat.actions
                .map(
                  (act) => `
                <button class="btn-select-action" data-mod="${cat.id}" data-intent="${act.id}" style="text-align: left; background: none; border: none; color: #ffffff; font-size: 0.70rem; padding: 3px 4px; border-radius: 3px; cursor: pointer;">
                  • <strong style="color: #ffffff;">${act.label}</strong>
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
        if (!this.workingSchema) return;
        const schema = this.workingSchema;
        const mod = (btn as HTMLElement).dataset.mod;
        const intent = (btn as HTMLElement).dataset.intent;
        if (mod && intent) {
          const actDef = ControlActionCatalog.findAction(mod, intent);
          if (actDef?.recommendedMode && rule.trigger.mode === "press") {
            rule.trigger.mode = actDef.recommendedMode;
          }
          const stmts = ControlSchemaArbiter.getRuleBody(rule);
          if (stmts[statementIdx] && stmts[statementIdx].type === "action") {
            (stmts[statementIdx] as ActionStatement).action.moduleId = mod;
            (stmts[statementIdx] as ActionStatement).action.intent = intent;
            if (mod === "staging" && intent === "setStage") {
              const defaultGrp = ControlsInspector.getActiveStageGroups(schema)[0]?.name || "default";
              const existingArgs = (stmts[statementIdx] as ActionStatement).action.args || {};
              (stmts[statementIdx] as ActionStatement).action.args = {
                group: existingArgs.group || defaultGrp,
                stage: existingArgs.stage || "none",
              };
            }
          } else {
            const actions = ControlSchemaArbiter.getRuleActions(rule);
            if (actions[statementIdx]) {
              actions[statementIdx].moduleId = mod;
              actions[statementIdx].intent = intent;
              if (mod === "staging" && intent === "setStage") {
                const defaultGrp = ControlsInspector.getActiveStageGroups(schema)[0]?.name || "default";
                const existingArgs = actions[statementIdx].args || {};
                actions[statementIdx].args = {
                  group: existingArgs.group || defaultGrp,
                  stage: existingArgs.stage || "none",
                };
              }
            } else {
              const defaultGrp = ControlsInspector.getActiveStageGroups(schema)[0]?.name || "default";
              actions.push({
                moduleId: mod,
                intent,
                args: mod === "staging" ? { group: defaultGrp, stage: "none" } : undefined,
              });
            }
            rule.actions = actions;
            rule.action = actions[0];
          }
          rule.body = stmts;
          ControlSchemaArbiter.syncRuleFromStatements(rule);
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

// Expose on window for popout cross-window communication & register beforeunload hook
if (typeof window !== "undefined") {
  (window as any).ControlsInspector = ControlsInspector;

  window.addEventListener("beforeunload", () => {
    ControlsInspector.isParentReloading = true;
    if (ControlsInspector.popoutWindow && !ControlsInspector.popoutWindow.closed) {
      try {
        (ControlsInspector.popoutWindow as any).__needsRebind = true;
        const root = ControlsInspector.popoutWindow.document.getElementById("controls-window-root");
        if (root) {
          root.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; color:#94a3b8; background:#090d16;">
              <div style="font-size:2rem; animation: pulse 1s infinite;">🔄</div>
              <div style="margin-top:12px; font-size:1rem; font-weight:600; color:#ffffff;">Reloading with Game...</div>
              <div style="margin-top:4px; font-size:0.75rem;">Reconnecting controls schema to refreshed game instance</div>
            </div>
          `;
        }
      } catch {}
    }
  });
}

