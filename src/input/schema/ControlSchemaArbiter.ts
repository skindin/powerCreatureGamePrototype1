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
} from "./ControlSchemaTypes.js";
import { ControlActionCatalog } from "./ControlActionCatalog.js";

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
    if (rule.actions && rule.actions.length > 0) return rule.actions;
    if (rule.action) return [rule.action];
    return [];
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
    for (const cond of conds) {
      if (!this.evaluateCondition(cond, ctx)) return false;
    }
    return true;
  }

  public static evaluateCondition(cond: ConditionGate, ctx: ControlExecutionContext): boolean {
    let result = false;
    switch (cond.type) {
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
      case "stagedActionIs":
        result = ctx.stagedAction === cond.param || (cond.param === "pickup" && ctx.stagedAction === "grab");
        break;
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

      // 3. Rule arbitration (sorted by priority descending, cascading per tag-thread)
      const sortedRules = [...cfg.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const executedTagTriggers = new Set<string>();
      for (const rule of sortedRules) {
        if (rule.enabled === false) continue;
        const tagKey = rule.tagId ? `${rule.tagId}:${rule.trigger.mode}` : null;
        if (tagKey && executedTagTriggers.has(tagKey)) {
          ruleStates.set(rule.id, { matchesCondition: false, isTriggerActive: false });
          continue;
        }

        const matchesCondition = this.evaluateAllConditions(rule, ctx);
        const effTrigger = this.resolveEffectiveTrigger(rule, schema, "keyboardMouse");
        const triggerActive = this.isTriggerActive(effTrigger, ctx, keyStates, mouseStates);

        ruleStates.set(rule.id, { matchesCondition, isTriggerActive: triggerActive });

        if (matchesCondition && triggerActive) {
          if (tagKey) {
            executedTagTriggers.add(tagKey);
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

      // Rule arbitration (sorted by priority descending, cascading per tag-thread)
      const sortedRules = [...cfg.rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const executedTagTriggers = new Set<string>();
      for (const rule of sortedRules) {
        if (rule.enabled === false) continue;
        const tagKey = rule.tagId ? `${rule.tagId}:${rule.trigger.mode}` : null;
        if (tagKey && executedTagTriggers.has(tagKey)) {
          ruleStates.set(rule.id, { matchesCondition: false, isTriggerActive: false });
          continue;
        }

        const matchesCondition = this.evaluateAllConditions(rule, ctx);
        const effTrigger = this.resolveEffectiveTrigger(rule, schema, "gamepad");
        const triggerActive = this.isTriggerActive(effTrigger, ctx, keyStates, mouseStates, gamepadStates);

        ruleStates.set(rule.id, { matchesCondition, isTriggerActive: triggerActive });

        if (matchesCondition && triggerActive) {
          if (tagKey) {
            executedTagTriggers.add(tagKey);
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
}
