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

export type LogicalOperator = "and" | "or";

export type ConditionType =
  | "group"
  | "always"
  | "holdingObject"
  | "holdingPlainObject"
  | "holdingObjectWithoutAbility"
  | "holdingEdible"
  | "holdingItemWithPrimaryAbility"
  | "emptyHanded"
  | "targetInReach"
  | "stagedActionIs"
  | "buttonHeld"
  | "tagHeld"
  | "tagPressed"
  | "tagReleased"
  | "grounded"
  | "climbing"
  | "isAiming"
  | "isAimingTrajectory"
  | "isLaserAiming"
  | "customProperty";

export interface StageGroup {
  name: string;
  stages: string[];
}

export interface ConditionGate {
  type: ConditionType;
  param?: string; // e.g. "laser", "melee", property name, button code, or stage name
  stageGroup?: string; // stage set/group name when type === "stagedActionIs" (defaults to "default")
  negate?: boolean;
  op?: LogicalOperator; // Logical operator for nested group ("and" | "or", default "or")
  conditions?: ConditionGate[]; // Child conditions if type === "group"
}

export interface ActionInvocation {
  moduleId: string; // e.g. "locomotion", "throwPickup", "laser", "melee", "heldItem", "staging"
  intent: string;   // e.g. "jump", "releaseThrow", "fireLaser", "stageLaser"
  args?: Record<string, any>;
}

export interface InputTagBinding {
  id: string;
  name: string;
  trigger: InputTriggerBinding;
}

export interface ActionStatement {
  type: "action";
  action: ActionInvocation;
}

export interface NestedThreadStatement {
  type: "nestedThread";
  threadId: string;
  rules: ControlRule[];
}

export type RuleStatement = ActionStatement | NestedThreadStatement;

export interface ControlRule {
  id: string;
  name?: string;
  enabled?: boolean;
  priority?: number; // Higher numbers evaluated first
  threadId?: string; // Grouping ID for cascading IF / ELSE IF / ELSE thread
  tagId?: string;    // Reference to an InputTagBinding.id (legacy)
  trigger: InputTriggerBinding;
  conditionOp?: LogicalOperator; // Logical operator for rule conditions ("and" | "or", default "and")
  conditions?: ConditionGate[]; // Multiple conditions
  condition?: ConditionGate;    // Single condition (for backwards compatibility)
  body?: RuleStatement[];       // Ordered sequence of actions and nested IF threads in THEN block
  actions?: ActionInvocation[]; // Multiple result functions executed (legacy / flat)
  action?: ActionInvocation;    // Single action (for backwards compatibility)
  children?: ControlRule[];     // Nested conditional threads/cascade inside this rule's THEN block (legacy / flat)
}

export type LocomotionParadigm = "directVector" | "forwardFacingDrive" | "cursorSteer";
export type AimingParadigm = "faceMouseCursor" | "twinStickAim" | "faceMovement";

export interface KeyboardMouseConfig {
  tags?: InputTagBinding[];
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
  tags?: InputTagBinding[];
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
  tags?: InputTagBinding[];
  widgets: TouchWidgetConfig[];
  rules: ControlRule[];
}

export interface ControlSchema {
  id: string;
  name: string;
  description?: string;
  activeDevice: DeviceChannel;
  stages?: string[];
  stageGroups?: StageGroup[];
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
  stagedActions?: Record<string, string>;
  getStage?: (group?: string) => string;
  
  // Aim positions
  mouseAimPos: Vector2D;
  reticleAimPos: Vector2D;
  facingAngle: number;
  
  // Query helpers
  isKeyDown: (code: string) => boolean;
  isMouseButtonDown: (button: number) => boolean;
  isGamepadButtonDown: (slotIndex: number, btn: number) => boolean;
  getGamepadAxis: (slotIndex: number, axis: "LeftStick" | "RightStick") => Vector2D;

  schema?: ControlSchema;
  keyStates?: {
    isDown: (code: string) => boolean;
    justPressed: (code: string) => boolean;
    justReleased: (code: string) => boolean;
  };
  mouseStates?: {
    isDown: (btn: number) => boolean;
    justPressed: (btn: number) => boolean;
    justReleased: (btn: number) => boolean;
  };
  gamepadStates?: {
    slotIndex: number;
    isDown: (btn: number) => boolean;
    justPressed: (btn: number) => boolean;
    justReleased: (btn: number) => boolean;
  };
}
