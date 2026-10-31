import type { Vector2D } from "../../engine/GameObject.js";
import type {
  ControlSchema,
  ControlRule,
  ConditionGate,
  ActionInvocation,
  ControlExecutionContext,
  InputTriggerBinding,
  TriggerMode,
  DeviceChannel,
  InputTagBinding,
  RuleStatement,
  PrebuiltControlChannels,
} from "./ControlSchemaTypes.js";
import { ControlActionCatalog } from "./ControlActionCatalog.js";
import { InputPressTokenManager } from "./InputPressTokenManager.js";
import type { InputManager } from "../../ui/InputManager.js";
import type { PlayerInputPacket } from "../../engine/physics/StateHistoryBuffer.js";

export interface EvaluatedControlFrame {
  movementVector: Vector2D;
  aimTarget: Vector2D | null;
  facingAngle?: number;
  activeRules: ControlRule[]; // Rules that passed condition and fired this frame (for DevPanel feedback)
  ruleStates: Map<string, { matchesCondition: boolean; isTriggerActive: boolean }>;
}

export class ControlSchemaArbiter {
  // Reticle steering offset state per character ID
  private static cursorReticleOffsets: Map<string, Vector2D> = new Map();

  public static getCursorOffset(characterId: string): Vector2D {
    let offset = this.cursorReticleOffsets.get(characterId);
    if (!offset) {
      offset = { x: 3.0, y: 0.0 };
      this.cursorReticleOffsets.set(characterId, offset);
    }
    return offset;
  }

  public static getRuleConditions(rule: ControlRule): ConditionGate[] {
    if (rule.conditions && rule.conditions.length > 0) return rule.conditions;
    if (rule.condition) return [rule.condition];
    return [{ type: "always" }];
  }

  public static getRuleActions(rule: ControlRule): ActionInvocation[] {
    if (rule.body && rule.body.length > 0) {
      return rule.body.filter((s) => s.type === "action").map((s) => (s as { type: "action"; action: ActionInvocation }).action);
    }
    if (rule.actions && rule.actions.length > 0) return rule.actions;
    if (rule.action) return [rule.action];
    return [];
  }

  public static getRuleBody(rule: ControlRule): RuleStatement[] {
    if (rule.body && rule.body.length > 0) {
      return rule.body;
    }
    const statements: RuleStatement[] = [];
    const actions = this.getRuleActions(rule);
    for (const act of actions) {
      statements.push({ type: "action", action: act });
    }
    if (rule.children && rule.children.length > 0) {
      const threadMap = new Map<string, ControlRule[]>();
      for (const child of rule.children) {
        const tId = child.threadId || `thread-${child.id}`;
        if (!threadMap.has(tId)) threadMap.set(tId, []);
        threadMap.get(tId)!.push(child);
      }
      for (const [threadId, rules] of threadMap.entries()) {
        statements.push({ type: "nestedThread", threadId, rules });
      }
    }
    return statements;
  }

  public static syncRuleFromStatements(rule: ControlRule): void {
    if (!rule.body) return;
    const actions: ActionInvocation[] = [];
    const children: ControlRule[] = [];
    for (const stmt of rule.body) {
      if (stmt.type === "action") {
        actions.push(stmt.action);
      } else if (stmt.type === "nestedThread") {
        children.push(...stmt.rules);
      }
    }
    rule.actions = actions;
    rule.action = actions[0];
    rule.children = children;
  }

  public static resolveEffectiveTrigger(rule: ControlRule, schema?: ControlSchema, device?: DeviceChannel): InputTriggerBinding {
    if (rule.tagId && schema && device) {
      const cfg = device === "keyboardMouse" ? schema.keyboardMouse : device === "gamepad" ? schema.gamepad : schema.touch;
      const tags: InputTagBinding[] = cfg.tags ?? [];
      const tag = tags.find((t: InputTagBinding) => t.id === rule.tagId);
      if (tag) {
        return {
          ...tag.trigger,
          mode: rule.trigger?.mode ?? tag.trigger.mode ?? "press",
        };
      }
    }
    if (!rule.tagId && (!rule.trigger?.code || rule.trigger.code === "None" || rule.trigger.code === "Always" || rule.trigger.code === "")) {
      return { device: "keyboard", code: "Always", mode: "press" };
    }
    return rule.trigger;
  }

  public static evaluateAllConditions(rule: ControlRule, ctx: ControlExecutionContext): boolean {
    const conds = this.getRuleConditions(rule);
    if (conds.length === 0) return true;
    const op = rule.conditionOp ?? "and";
    if (op === "or") {
      return conds.some((cond) => this.evaluateCondition(cond, ctx, rule));
    }
    return conds.every((cond) => this.evaluateCondition(cond, ctx, rule));
  }

  public static evaluateCondition(cond: ConditionGate, ctx: ControlExecutionContext, _rule?: ControlRule): boolean {
    let result = false;
    switch (cond.type) {
      case "group": {
        const subConds = cond.conditions ?? [];
        if (subConds.length === 0) {
          result = true;
        } else {
          const groupOp = cond.op ?? "or";
          if (groupOp === "or") {
            result = subConds.some((c) => this.evaluateCondition(c, ctx, _rule));
          } else {
            result = subConds.every((c) => this.evaluateCondition(c, ctx, _rule));
          }
        }
        break;
      }
      case "always":
        result = true;
        break;
      case "holdingObject":
        result = ctx.isHoldingItem;
        break;
      case "holdingPlainObject":
      case "holdingObjectWithoutAbility":
        result = ctx.isHoldingItem && !ctx.heldItemHasPrimaryAbility && !ctx.heldItemIsEdible;
        break;
      case "holdingItemWithPrimaryAbility":
      case "holdingEdible":
        result = ctx.isHoldingItem && Boolean(ctx.heldItemHasPrimaryAbility ?? ctx.heldItemIsEdible);
        break;
      case "emptyHanded":
        result = !ctx.isHoldingItem;
        break;
      case "targetInReach":
        result = ctx.targetInReach !== null;
        break;
      case "stagedActionIs": {
        const group = cond.stageGroup || "default";
        const current = ctx.character?.getStage
          ? ctx.character.getStage(group)
          : (ctx.stagedActions?.[group] ?? (group === "default" ? ctx.stagedAction : "none") ?? "none");
        const expected = cond.param || "none";
        result = current === expected;
        break;
      }
      case "grounded":
        result = ctx.isGrounded;
        break;
      case "climbing":
        result = ctx.isClimbing;
        break;
      case "tagHeld":
      case "tagPressed":
      case "tagReleased":
        if (cond.param && ctx.schema) {
          const mode: TriggerMode = cond.type === "tagHeld" ? "hold" : cond.type === "tagPressed" ? "press" : "release";
          const tags = [
            ...(ctx.schema.keyboardMouse?.tags ?? []),
            ...(ctx.schema.gamepad?.tags ?? []),
            ...(ctx.schema.touch?.tags ?? []),
          ];
          const tag = tags.find((t) => t.id === cond.param || t.name === cond.param);
          if (tag) {
            const eff = { ...tag.trigger, mode };
            const dummyKeys = { isDown: ctx.isKeyDown, justPressed: () => false, justReleased: () => false };
            const dummyMouse = { isDown: ctx.isMouseButtonDown, justPressed: () => false, justReleased: () => false };
            result = this.isTriggerActive(
              eff,
              ctx,
              ctx.keyStates ?? dummyKeys,
              ctx.mouseStates ?? dummyMouse,
              ctx.gamepadStates
            );
          }
        }
        break;
      case "buttonHeld":
        if (cond.param) {
          const p = cond.param.trim();
          if (p === "MouseLeft") result = ctx.isMouseButtonDown(0);
          else if (p === "MouseMiddle") result = ctx.isMouseButtonDown(1);
          else if (p === "MouseRight") result = ctx.isMouseButtonDown(2);
          else if (p.startsWith("Gamepad")) {
            const btn = ControlSchemaArbiter.parseGamepadButtonCode(p);
            result = ctx.isGamepadButtonDown(0, btn);
          } else {
            result = ctx.isKeyDown(p);
          }
        }
        break;
      case "isAiming":
        result = Boolean(ctx.character.isAimingTrajectory || ctx.character.isLaserAiming);
        break;
      case "isAimingTrajectory":
        result = Boolean(ctx.character.isAimingTrajectory);
        break;
      case "isLaserAiming":
        result = Boolean(ctx.character.isLaserAiming);
        break;
      default:
        result = true;
    }
    return cond.negate ? !result : result;
  }

  public static isTriggerActive(
    trigger: InputTriggerBinding,
    _ctx: ControlExecutionContext,
    keyStates: {
      isDown: (code: string) => boolean;
      justPressed: (code: string) => boolean;
      justReleased: (code: string) => boolean;
    },
    mouseStates: {
      isDown: (btn: number) => boolean;
      justPressed: (btn: number) => boolean;
      justReleased: (btn: number) => boolean;
    },
    gamepadStates?: {
      slotIndex: number;
      isDown: (btn: number) => boolean;
      justPressed: (btn: number) => boolean;
      justReleased: (btn: number) => boolean;
    }
  ): boolean {
    if (!trigger || !trigger.code || trigger.code === "Always" || trigger.code === "None") {
      return true;
    }

    // 1. Verify chord modifiers if any
    if (trigger.chordModifiers && trigger.chordModifiers.length > 0) {
      for (const mod of trigger.chordModifiers) {
        let isModDown = false;
        if (mod.startsWith("Alt")) {
          isModDown = keyStates.isDown("AltLeft") || keyStates.isDown("AltRight") || keyStates.isDown("Alt");
        } else if (mod.startsWith("Shift")) {
          isModDown = keyStates.isDown("ShiftLeft") || keyStates.isDown("ShiftRight") || keyStates.isDown("Shift");
        } else if (mod.startsWith("Control") || mod.startsWith("Ctrl")) {
          isModDown = keyStates.isDown("ControlLeft") || keyStates.isDown("ControlRight") || keyStates.isDown("Control");
        } else {
          isModDown = keyStates.isDown(mod);
        }
        if (!isModDown) {
          return false;
        }
      }
    }

    // 2. Check main code
    if (trigger.device === "keyboard") {
      if (trigger.mode === "press") return keyStates.justPressed(trigger.code);
      if (trigger.mode === "release") return keyStates.justReleased(trigger.code);
      return keyStates.isDown(trigger.code);
    }

    if (trigger.device === "mouse") {
      const btn = trigger.code === "MouseLeft" ? 0 : trigger.code === "MouseMiddle" ? 1 : 2;
      if (trigger.mode === "press") return mouseStates.justPressed(btn);
      if (trigger.mode === "release") return mouseStates.justReleased(btn);
      return mouseStates.isDown(btn);
    }

    if (trigger.device === "gamepad" && gamepadStates) {
      const btn = this.parseGamepadButtonCode(trigger.code);
      if (btn !== -1) {
        if (trigger.mode === "press") return gamepadStates.justPressed(btn);
        if (trigger.mode === "release") return gamepadStates.justReleased(btn);
        return gamepadStates.isDown(btn);
      }
    }

    return false;
  }

  public static containsInputCondition(cond: ConditionGate): boolean {
    if (cond.type === "tagHeld" || cond.type === "tagPressed" || cond.type === "tagReleased" || cond.type === "buttonHeld") {
      return true;
    }
    if (cond.type === "group" && cond.conditions) {
      return cond.conditions.some((c) => this.containsInputCondition(c));
    }
    return false;
  }

  public static isRuleApplicable(
    rule: ControlRule,
    ctx: ControlExecutionContext,
    schema?: ControlSchema,
    device?: DeviceChannel,
    keyStates?: {
      isDown: (code: string) => boolean;
      justPressed: (code: string) => boolean;
      justReleased: (code: string) => boolean;
    },
    mouseStates?: {
      isDown: (btn: number) => boolean;
      justPressed: (btn: number) => boolean;
      justReleased: (btn: number) => boolean;
    },
    gamepadStates?: {
      slotIndex: number;
      isDown: (btn: number) => boolean;
      justPressed: (btn: number) => boolean;
      justReleased: (btn: number) => boolean;
    }
  ): boolean {
    if (rule.enabled === false) return false;

    // 1. Evaluate explicit conditions
    if (!this.evaluateAllConditions(rule, ctx)) {
      return false;
    }

    // 2. Check if rule conditions already contains an explicit input trigger condition
    const conds = this.getRuleConditions(rule);
    const hasInputCondition = conds.some((c) => this.containsInputCondition(c));

    const effTrigger = this.resolveEffectiveTrigger(rule, schema, device);
    const isPassiveTrigger = !effTrigger || !effTrigger.code || effTrigger.code === "Always" || effTrigger.code === "None";

    if (hasInputCondition || isPassiveTrigger) {
      return true;
    }

    // 3. Fallback for legacy preset rules where input trigger is held in rule.trigger
    const kStates = keyStates ?? ctx.keyStates ?? { isDown: ctx.isKeyDown, justPressed: () => false, justReleased: () => false };
    const mStates = mouseStates ?? ctx.mouseStates ?? { isDown: ctx.isMouseButtonDown, justPressed: () => false, justReleased: () => false };
    return this.isTriggerActive(effTrigger, ctx, kStates, mStates, gamepadStates ?? ctx.gamepadStates);
  }

  public static parseGamepadButtonCode(code: string): number {
    switch (code) {
      case "GamepadA": return 0;
      case "GamepadB": return 1;
      case "GamepadX": return 2;
      case "GamepadY": return 3;
      case "GamepadLB": return 4;
      case "GamepadRB": return 5;
      case "GamepadLT": return 6;
      case "GamepadRT": return 7;
      case "GamepadBack": return 8;
      case "GamepadStart": return 9;
      case "GamepadLS": return 10;
      case "GamepadRS": return 11;
      case "GamepadDpadUp": return 12;
      case "GamepadDpadDown": return 13;
      case "GamepadDpadLeft": return 14;
      case "GamepadDpadRight": return 15;
      default: return -1;
    }
  }

  public static formatGamepadButtonIndex(btn: number): string {
    switch (btn) {
      case 0: return "GamepadA";
      case 1: return "GamepadB";
      case 2: return "GamepadX";
      case 3: return "GamepadY";
      case 4: return "GamepadLB";
      case 5: return "GamepadRB";
      case 6: return "GamepadLT";
      case 7: return "GamepadRT";
      case 8: return "GamepadBack";
      case 9: return "GamepadStart";
      case 10: return "GamepadLS";
      case 11: return "GamepadRS";
      case 12: return "GamepadDpadUp";
      case 13: return "GamepadDpadDown";
      case 14: return "GamepadDpadLeft";
      case 15: return "GamepadDpadRight";
      default: return `GamepadBtn${btn}`;
    }
  }

  public static evaluateFrame(
    schema: ControlSchema,
    ctx: ControlExecutionContext,
    device: "keyboardMouse" | "gamepad" | "touch",
    keyStates: {
      isDown: (code: string) => boolean;
      justPressed: (code: string) => boolean;
      justReleased: (code: string) => boolean;
    },
    mouseStates: {
      isDown: (btn: number) => boolean;
      justPressed: (btn: number) => boolean;
      justReleased: (btn: number) => boolean;
      worldPos: Vector2D;
    },
    gamepadStates?: {
      slotIndex: number;
      isDown: (btn: number) => boolean;
      justPressed: (btn: number) => boolean;
      justReleased: (btn: number) => boolean;
      leftStick: Vector2D;
      rightStick: Vector2D;
    }
  ): EvaluatedControlFrame {
    const activeRules: ControlRule[] = [];
    const ruleStates = new Map<string, { matchesCondition: boolean; isTriggerActive: boolean }>();

    let moveX = 0;
    let moveY = 0;
    let aimTarget: Vector2D | null = null;
    let facingAngle = ctx.facingAngle;

    if (device === "keyboardMouse") {
      const cfg = schema.keyboardMouse;

      // 1. Aiming evaluation
      if (cfg.aiming.mode === "faceMouseCursor") {
        aimTarget = { x: mouseStates.worldPos.x, y: mouseStates.worldPos.y };
        facingAngle = Math.atan2(
          aimTarget.y - ctx.character.position.y,
          aimTarget.x - ctx.character.position.x
        );
      }

      // 2. Locomotion evaluation
      if (cfg.locomotion.mode === "forwardFacingDrive") {
        const isFwd = cfg.locomotion.forwardTrigger
          ? this.isTriggerActive(cfg.locomotion.forwardTrigger, ctx, keyStates, mouseStates)
          : false;

        const fwdX = Math.cos(facingAngle);
        const fwdY = Math.sin(facingAngle);
        const leftX = -fwdY;
        const leftY = fwdX;

        if (isFwd) {
          moveX += fwdX;
          moveY += fwdY;
        }
        if (cfg.locomotion.reverseKey && keyStates.isDown(cfg.locomotion.reverseKey)) {
          moveX -= fwdX * 0.75;
          moveY -= fwdY * 0.75;
        }
        if (cfg.locomotion.strafeLeftKey && keyStates.isDown(cfg.locomotion.strafeLeftKey)) {
          moveX += leftX * 0.85;
          moveY += leftY * 0.85;
        }
        if (cfg.locomotion.strafeRightKey && keyStates.isDown(cfg.locomotion.strafeRightKey)) {
          moveX -= leftX * 0.85;
          moveY -= leftY * 0.85;
        }

        const mag = Math.hypot(moveX, moveY);
        if (mag > 1.0) {
          moveX /= mag;
          moveY /= mag;
        }
      } else {
        // Standard direct WASD vector
        if (cfg.locomotion.moveForwardKey && keyStates.isDown(cfg.locomotion.moveForwardKey)) moveY -= 1;
        if (cfg.locomotion.reverseKey && keyStates.isDown(cfg.locomotion.reverseKey)) moveY += 1;
        if (cfg.locomotion.strafeLeftKey && keyStates.isDown(cfg.locomotion.strafeLeftKey)) moveX -= 1;
        if (cfg.locomotion.strafeRightKey && keyStates.isDown(cfg.locomotion.strafeRightKey)) moveX += 1;
        const mag = Math.hypot(moveX, moveY);
        if (mag > 1.0) {
          moveX /= mag;
          moveY /= mag;
        }
      }

      // 3. Rule arbitration (sorted by priority descending, cascading per thread)
      const sortedRules = [...cfg.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const executedThreads = new Set<string>();
      for (const rule of sortedRules) {
        if (rule.enabled === false) continue;
        const threadKey = rule.threadId ?? (rule.tagId ? `${rule.tagId}:${rule.trigger.mode}` : null);
        if (threadKey && executedThreads.has(threadKey)) {
          ruleStates.set(rule.id, { matchesCondition: false, isTriggerActive: false });
          continue;
        }

        const matchesCondition = this.evaluateAllConditions(rule, ctx);
        const effTrigger = this.resolveEffectiveTrigger(rule, schema, "keyboardMouse");
        const triggerActive = this.isTriggerActive(effTrigger, ctx, keyStates, mouseStates);

        ruleStates.set(rule.id, { matchesCondition, isTriggerActive: triggerActive });

        if (matchesCondition && triggerActive) {
          if (threadKey) {
            executedThreads.add(threadKey);
          }
          activeRules.push(rule);
          const actions = this.getRuleActions(rule);
          for (const act of actions) {
            const actDef = ControlActionCatalog.findAction(act.moduleId, act.intent);
            if (actDef) {
              actDef.execute(ctx, act.args);
            }
          }
        }
      }
    } else if (device === "gamepad" && gamepadStates) {
      const cfg = schema.gamepad;
      const leftStick = gamepadStates.leftStick;
      const rightStick = gamepadStates.rightStick;

      // Stick mode evaluation (Dynamic override)
      let isOverridden = false;
      if (cfg.leftStick.dynamicOverride) {
        const cond = cfg.leftStick.dynamicOverride.triggerCondition;
        if (cond === "whenLtHeld" && gamepadStates.isDown(6)) {
          isOverridden = true;
        } else if (cond === "whenHoldingItem" && ctx.isHoldingItem) {
          isOverridden = true;
        } else if (cond === "whenAiming" && (ctx.stagedAction === "laser" || ctx.isHoldingItem)) {
          isOverridden = true;
        }
      }

      const activeLeftMode = isOverridden
        ? cfg.leftStick.dynamicOverride!.overrideMode
        : cfg.leftStick.primaryMode;

      if (activeLeftMode === "cursorSteer") {
        // Left stick moves reticle offset
        const reticleSpeed = cfg.leftStick.cursorSteerSpeed ?? 14.0;
        const clampRadius = cfg.leftStick.cursorClampRadius ?? 7.5;
        const offset = this.getCursorOffset(ctx.character.id);

        offset.x += leftStick.x * reticleSpeed * ctx.dt;
        offset.y += leftStick.y * reticleSpeed * ctx.dt;

        const dist = Math.hypot(offset.x, offset.y);
        if (dist > clampRadius) {
          offset.x = (offset.x / dist) * clampRadius;
          offset.y = (offset.y / dist) * clampRadius;
        }

        aimTarget = {
          x: ctx.character.position.x + offset.x,
          y: ctx.character.position.y + offset.y,
        };
      } else {
        // Direct locomotion
        moveX = leftStick.x;
        moveY = leftStick.y;
      }

      // Right stick aim
      if (cfg.rightStick.mode === "twinStickAim") {
        const rMag = Math.hypot(rightStick.x, rightStick.y);
        if (rMag > 0.15) {
          aimTarget = {
            x: ctx.character.position.x + rightStick.x * 5.0,
            y: ctx.character.position.y + rightStick.y * 5.0,
          };
        }
      }

      // Rule arbitration (sorted by priority descending, cascading per thread)
      const sortedRules = [...cfg.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const executedThreads = new Set<string>();
      for (const rule of sortedRules) {
        if (rule.enabled === false) continue;
        const threadKey = rule.threadId ?? (rule.tagId ? `${rule.tagId}:${rule.trigger.mode}` : null);
        if (threadKey && executedThreads.has(threadKey)) {
          ruleStates.set(rule.id, { matchesCondition: false, isTriggerActive: false });
          continue;
        }

        const matchesCondition = this.evaluateAllConditions(rule, ctx);
        const effTrigger = this.resolveEffectiveTrigger(rule, schema, "gamepad");
        const triggerActive = this.isTriggerActive(effTrigger, ctx, keyStates, mouseStates, gamepadStates);

        ruleStates.set(rule.id, { matchesCondition, isTriggerActive: triggerActive });

        if (matchesCondition && triggerActive) {
          if (threadKey) {
            executedThreads.add(threadKey);
          }
          activeRules.push(rule);
          const actions = this.getRuleActions(rule);
          for (const act of actions) {
            const actDef = ControlActionCatalog.findAction(act.moduleId, act.intent);
            if (actDef) {
              actDef.execute(ctx, act.args);
            }
          }
        }
      }
    }

    return {
      movementVector: { x: moveX, y: moveY },
      aimTarget,
      facingAngle,
      activeRules,
      ruleStates,
    };
  }

  public static evaluateChannels(
    channels: PrebuiltControlChannels,
    execCtx: ControlExecutionContext,
    input: InputManager
  ): PlayerInputPacket {
    const char = execCtx.character;
    const now = performance.now();
    const tokens = InputPressTokenManager.getInstance();

    // 1. Gather all currently depressed keys & buttons
    const activeKeys = new Set<string>();
    if (input.isMouseDown) activeKeys.add("MouseLeft");
    if (input.isMiddleMouseDown) activeKeys.add("MouseMiddle");
    if (input.isRightMouseDown) activeKeys.add("MouseRight");
    for (const key of input.getActiveKeys()) {
      activeKeys.add(key);
    }
    tokens.update(activeKeys, now);

    // 2. Explicit Locomotion Movement Vector
    let moveX = 0;
    let moveY = 0;
    const loco = channels.locomotion;

    if (loco.mode === "directVector") {
      for (const k of loco.upKeys) if (tokens.isDown(k)) { moveY -= 1; break; }
      for (const k of loco.downKeys) if (tokens.isDown(k)) { moveY += 1; break; }
      for (const k of loco.leftKeys) if (tokens.isDown(k)) { moveX -= 1; break; }
      for (const k of loco.rightKeys) if (tokens.isDown(k)) { moveX += 1; break; }
    } else if (loco.mode === "forwardFacingDrive") {
      const fwdAngle = char.facingAngle ?? 0;
      const fwdX = Math.cos(fwdAngle);
      const fwdY = Math.sin(fwdAngle);
      const leftX = -fwdY;
      const leftY = fwdX;

      const fwdKey = loco.forwardKey || loco.upKeys[0];
      if (fwdKey && tokens.isDown(fwdKey)) {
        moveX += fwdX;
        moveY += fwdY;
      }
      for (const k of loco.downKeys) if (tokens.isDown(k)) { moveX -= fwdX * 0.75; moveY -= fwdY * 0.75; break; }
      for (const k of loco.leftKeys) if (tokens.isDown(k)) { moveX += leftX * 0.85; moveY += leftY * 0.85; break; }
      for (const k of loco.rightKeys) if (tokens.isDown(k)) { moveX -= leftX * 0.85; moveY -= leftY * 0.85; break; }
    } else if (loco.mode === "facingRelativeStrafe") {
      const fwdAngle = char.facingAngle ?? 0;
      const fwdX = Math.cos(fwdAngle);
      const fwdY = Math.sin(fwdAngle);
      const leftX = -fwdY;
      const leftY = fwdX;

      for (const k of loco.upKeys) if (tokens.isDown(k)) { moveX += fwdX; moveY += fwdY; break; }
      for (const k of loco.downKeys) if (tokens.isDown(k)) { moveX -= fwdX; moveY -= fwdY; break; }
      for (const k of loco.leftKeys) if (tokens.isDown(k)) { moveX += leftX; moveY += leftY; break; }
      for (const k of loco.rightKeys) if (tokens.isDown(k)) { moveX -= leftX; moveY -= leftY; break; }
    }

    const moveMag = Math.hypot(moveX, moveY);
    if (moveMag > 1.0) {
      moveX /= moveMag;
      moveY /= moveMag;
    }

    // Sprinting
    let isSprinting = false;
    if (loco.sprintKey) {
      if (loco.sprintMode === "toggle") {
        if (tokens.isFresh(loco.sprintKey)) {
          char.setSprinting(!char.isSprinting);
          tokens.claim(loco.sprintKey, "toggleSprint");
        }
        isSprinting = Boolean(char.isSprinting);
      } else {
        isSprinting = tokens.isDown(loco.sprintKey);
      }
    }

    // Jumping
    const isJumpHeld = loco.jumpKey ? tokens.isDown(loco.jumpKey) : false;

    // 3. Aiming & Facing Direction
    if (channels.aiming.mode === "faceMouseCursor") {
      const aimDx = input.actualMousePos.x - char.position.x;
      const aimDy = input.actualMousePos.y - char.position.y;
      if (Math.hypot(aimDx, aimDy) > 0.05) {
        char.facingAngle = Math.atan2(aimDy, aimDx);
      }
    } else if (channels.aiming.mode === "faceMovement") {
      if (moveMag > 0.05) {
        char.facingAngle = Math.atan2(moveY, moveX);
      }
    }

    // 4. Combat Channels: Melee & Laser
    let isMeleeRequested = false;
    if (channels.melee.enabled) {
      const code = channels.melee.trigger.code;
      if (tokens.canExecute(code, channels.melee.claimPolicy, "melee")) {
        tokens.claim(code, "melee");
        isMeleeRequested = true;
      }
    }

    let isLaserAiming = false;
    let isLaserFiring = false;
    if (channels.laser.enabled) {
      const aimTrig = channels.laser.aimTrigger;
      const isAltChord = (aimTrig.chordModifiers || []).every((m) => tokens.isDown(m));
      if (isAltChord && tokens.isDown(aimTrig.code)) {
        isLaserAiming = true;
        if (tokens.isDown(channels.laser.fireTrigger.code)) {
          isLaserFiring = true;
        }
      }
    }

    // 5. Item Ability / Consume Channel
    let isUsingItem = false;
    const canUseItem = execCtx.isHoldingItem && (execCtx.heldItemIsEdible || execCtx.heldItemHasPrimaryAbility);
    if (canUseItem && channels.consume.enabled) {
      const code = channels.consume.trigger.code;
      if (tokens.canExecute(code, channels.consume.claimPolicy, "consume")) {
        tokens.claim(code, "consume");
        isUsingItem = true;
      }
    }

    // 6. Throw Channel & Universal Trajectory Raw Drag
    let isAimingTrajectory = false;
    let isThrow = false;
    if (execCtx.isHoldingItem && channels.throw.enabled) {
      const aimCode = channels.throw.aimTrigger.code;
      const isAimHeld = tokens.isDown(aimCode);

      if (isAimHeld) {
        isAimingTrajectory = true;
        const fireCode = channels.throw.fireTrigger.code;
        const fireHeldMs = tokens.getHoldDuration(fireCode, now);

        if (channels.throw.arcModulationSource === "mouseDragY") {
          if (tokens.isDown(fireCode)) {
            if (fireHeldMs >= (channels.throw.arcDragHoldThresholdMs || 200)) {
              // Engage universal raw mouse drag
              if (!input.isRawDragging) {
                input.beginRawDrag((_dx, dy) => {
                  if (char.throwModule) {
                    const cur = char.throwModule.savedArcRatio ?? 0.5;
                    const next = Math.max(0.0, Math.min(1.0, cur + (-dy * 0.005)));
                    char.throwModule.savedArcRatio = next;
                    char.savedArcRatio = next;
                    char.throwModule.hasUserSetArcRatio = true;
                    char.hasUserSetArcRatio = true;
                  }
                });
              }
            }
          }
        }

        // Fire release check
        const wasFireDown = execCtx.mouseStates?.justReleased(fireCode === "MouseLeft" ? 0 : 2) || (execCtx.keyStates?.justReleased(fireCode) ?? false);
        if (wasFireDown) {
          if (input.isRawDragging) {
            input.endRawDrag();
            if (channels.throw.fireOnReleaseAim !== true) {
              isThrow = true;
              tokens.claim(fireCode, "throw");
            }
          } else if (fireHeldMs < (channels.throw.arcDragHoldThresholdMs || 200)) {
            isThrow = true;
            tokens.claim(fireCode, "throw");
          }
        }
      } else {
        if (input.isRawDragging) {
          input.endRawDrag();
        }
      }
    }

    // 7. Object Interaction Channel (Grab / Swap)
    let isGrabHeld = false;
    let isSwap = false;
    if (channels.interaction.enabled) {
      const code = channels.interaction.trigger.code;
      if (!execCtx.isHoldingItem) {
        // Empty handed pickup: requires clean press so held buttons don't accidentally grab
        if (tokens.canExecute(code, channels.interaction.claimPolicy, "interact") && execCtx.targetInReach) {
          tokens.claim(code, "interact");
          isGrabHeld = true;
        }
      } else if (channels.interaction.allowSwapWhenHolding && execCtx.targetInReach && !isAimingTrajectory && !isUsingItem) {
        // Swap with nearby item
        if (tokens.canExecute(code, channels.interaction.claimPolicy, "swap")) {
          tokens.claim(code, "swap");
          isSwap = true;
        }
      }
    }

    // Sync character intent flags
    char.isAimingTrajectory = isAimingTrajectory;
    char.isLaserAiming = isLaserAiming;
    char.isLaserFiring = isLaserFiring;
    char.isMeleeRequested = isMeleeRequested;

    if (isAimingTrajectory && char.facingAngle !== undefined) {
      char.lastThrowAimAngle = char.facingAngle;
    }

    const isAiming = isLaserAiming || isAimingTrajectory;
    const kLaunchVel = isThrow && char.activeTrajectory?.launchVel ? char.activeTrajectory.launchVel : undefined;
    const kLaunchPos = isThrow && char.activeTrajectory?.launchPos ? char.activeTrajectory.launchPos : undefined;

    return {
      playerId: "keyboard",
      moveX,
      moveY,
      isSprinting: isSprinting || Boolean(char.isSprinting),
      isJumpHeld,
      isGrabHeld,
      grabTargetObjectId: (isGrabHeld || isSwap) && execCtx.targetInReach ? execCtx.targetInReach.id : null,
      isDrop: false,
      isThrow,
      isSwap,
      isUsingItem,
      isLaserAiming,
      isLaserFiring,
      laserAimX: input.actualMousePos.x,
      laserAimY: input.actualMousePos.y,
      isMeleeRequested,
      meleeAimDirX: (input.actualMousePos.x - char.position.x) / (Math.hypot(input.actualMousePos.x - char.position.x, input.actualMousePos.y - char.position.y) || 1),
      meleeAimDirY: (input.actualMousePos.y - char.position.y) / (Math.hypot(input.actualMousePos.x - char.position.x, input.actualMousePos.y - char.position.y) || 1),
      meleeAimX: input.actualMousePos.x,
      meleeAimY: input.actualMousePos.y,
      aimX: input.actualMousePos.x,
      aimY: input.actualMousePos.y,
      isAiming,
      isLockHeld: Boolean(input.lockedAimPos),
      lockedAimPos: input.lockedAimPos,
      aimLockDelta: 0,
      facingAngle: char.facingAngle,
      ...(kLaunchVel ? {
        launchVx: kLaunchVel.vx,
        launchVy: kLaunchVel.vy,
        launchVz: kLaunchVel.vz,
      } : {}),
      ...(kLaunchPos ? {
        launchStartX: kLaunchPos.x,
        launchStartY: kLaunchPos.y,
        launchStartZ: kLaunchPos.z,
      } : {}),
    } as any;
  }
}
