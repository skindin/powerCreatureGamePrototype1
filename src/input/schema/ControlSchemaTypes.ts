import type { Vector2D } from "../../engine/GameObject.js";
import type { Character } from "../../character/Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

export type DeviceChannel = "keyboardMouse" | "gamepad" | "touch";

export type TriggerMode = "press" | "hold" | "release";

export interface InputTriggerBinding {
  device: "keyboard" | "mouse" | "gamepad" | "touch";
  code: string; // e.g. "KeyW", "MouseLeft", "MouseRight", "GamepadRT", "GamepadA", "TouchStick1"
  chordModifiers?: string[]; // e.g. ["AltLeft"], ["ShiftLeft"], ["GamepadLB"]
  mode: TriggerMode;
  holdThresholdMs?: number; // default ~200ms
}

export type ConditionType =
  | "always"
  | "holdingObject"
  | "holdingEdible"
  | "holdingItemWithPrimaryAbility"
  | "emptyHanded"
  | "targetInReach"
  | "stagedActionIs"
  | "buttonHeld"
  | "grounded"
  | "climbing"
  | "customProperty";

export interface ConditionGate {
  type: ConditionType;
  param?: string; // e.g. "laser", "melee", property name, or button code
  negate?: boolean;
}

export interface ControlRule {
  id: string;
  name?: string;
  enabled?: boolean;
  priority?: number; // Higher numbers evaluated first
  trigger: InputTriggerBinding;
  condition: ConditionGate;
  action: {
    moduleId: string; // e.g. "locomotion", "throwPickup", "laser", "melee", "consume", "staging"
    intent: string;   // e.g. "jump", "releaseThrow", "fireLaser", "stageLaser"
    args?: Record<string, any>;
  };
}

export type LocomotionParadigm = "directVector" | "forwardFacingDrive" | "cursorSteer";
export type AimingParadigm = "faceMouseCursor" | "twinStickAim" | "faceMovement";

export interface KeyboardMouseConfig {
  aiming: {
    mode: AimingParadigm;
  };
  locomotion: {
    mode: LocomotionParadigm;
    forwardTrigger?: InputTriggerBinding; // e.g. MouseRight (hold)
    strafeLeftKey?: string;  // e.g. "KeyA"
    strafeRightKey?: string; // e.g. "KeyD"
    reverseKey?: string;     // e.g. "KeyS"
    moveForwardKey?: string; // e.g. "KeyW"
  };
  rules: ControlRule[];
}

export interface GamepadConfig {
  leftStick: {
    primaryMode: "directLocomotion" | "cursorSteer";
    dynamicOverride?: {
      triggerCondition: "whenAiming" | "whenLtHeld" | "whenHoldingItem" | "never";
      overrideMode: "cursorSteer" | "directLocomotion";
    };
    cursorSteerSpeed?: number;   // default 14 world units/sec
    cursorClampRadius?: number;  // default 7.5 world units
  };
  rightStick: {
    mode: "twinStickAim" | "disabled";
  };
  rules: ControlRule[];
}

export interface TouchDeflectionRing {
  id: string;
  minDeflection: number; // 0.0 to 1.0
  maxDeflection: number; // 0.0 to 1.0
  signalId: string;      // e.g. "walk", "sprint", "outerEdgeTrigger"
}

export interface TouchWidgetConfig {
  id: string;
  type: "joystick" | "actionButton" | "gestureZone";
  label?: string;
  anchor: "bottomLeft" | "bottomRight" | "topLeft" | "topRight" | "center" | "customPercent";
  offset: { x: number; y: number };
  radius: number;
  centering: "fixed" | "floating" | "followDrag";
  snapBackOnRelease: boolean;
  rings: TouchDeflectionRing[];
  tapAction?: string;
  holdAction?: string;
  holdThresholdMs?: number;
}

export interface TouchConfig {
  widgets: TouchWidgetConfig[];
  rules: ControlRule[];
}

export interface ControlSchema {
  id: string;
  name: string;
  description?: string;
  activeDevice: DeviceChannel;
  keyboardMouse: KeyboardMouseConfig;
  gamepad: GamepadConfig;
  touch: TouchConfig;
}

export interface ControlExecutionContext {
  character: Character;
  arena?: Arena;
  dt: number;
  
  // Real-time states
  isGrounded: boolean;
  isClimbing: boolean;
  isHoldingItem: boolean;
  heldItemIsEdible: boolean;
  heldItemHasPrimaryAbility?: boolean;
  targetInReach: GameObject | null;
  stagedAction: string | null;
  
  // Aim positions
  mouseAimPos: Vector2D;
  reticleAimPos: Vector2D;
  facingAngle: number;
  
  // Query helpers
  isKeyDown: (code: string) => boolean;
  isMouseButtonDown: (button: number) => boolean;
  isGamepadButtonDown: (slotIndex: number, btn: number) => boolean;
  getGamepadAxis: (slotIndex: number, axis: "LeftStick" | "RightStick") => Vector2D;
}
