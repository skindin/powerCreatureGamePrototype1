import type { Character } from "../character/Character.js";
import type { InputManager } from "../ui/InputManager.js";
import type { Arena } from "../engine/Arena.js";
import type { GameObject, Vector2D } from "../engine/GameObject.js";

/**
 * Default fallback controls script embedded directly into the bundle.
 */
export const DEFAULT_CONTROLS_SCRIPT = `
// If true: releasing LMB after dragging launches the projectile immediately.
// If false: releasing LMB finishes adjusting the arc and keeps aiming until you tap LMB again.
const FIRE_ON_RELEASE_AFTER_DRAG = true;

// Hold duration threshold (in ms) to transition from a quick tap to a trajectory drag.
const TRAJECTORY_DRAG_HOLD_MS = 200;

export default function updateControls(char, input, actions, state) {
  // 1. Locomotion Movement Vector (WASD / Arrow Keys)
  let moveX = 0;
  let moveY = 0;

  if (input.isDown("KeyW") || input.isDown("ArrowUp")) moveY -= 1;
  if (input.isDown("KeyS") || input.isDown("ArrowDown")) moveY += 1;
  if (input.isDown("KeyA") || input.isDown("ArrowLeft")) moveX -= 1;
  if (input.isDown("KeyD") || input.isDown("ArrowRight")) moveX += 1;

  actions.move(moveX, moveY);

  if (input.isDown("ShiftLeft") || input.isDown("ShiftRight")) {
    actions.sprint(true);
  }

  if (input.isDown("Space")) {
    actions.jump();
  }

  // 2. Facing Direction
  if (!state.isDraggingTrajectory) {
    actions.facePosition(input.mouse.x, input.mouse.y);
  }

  // 3. Object Interaction: Pick Up / Grab (LMB when empty-handed)
  if (!input.isHoldingItem()) {
    if (input.isPressed("MouseLeft") && input.targetInReach) {
      actions.pickup();
    }
  }

  // 4. Throw & Trajectory Drag (Holding an item)
  if (input.isHoldingItem()) {
    const isAimingThrow = input.isDown("MouseRight");

    if (isAimingThrow) {
      actions.aimThrow();

      const lmbHeldMs = input.getHoldDuration("MouseLeft");

      if (input.isDown("MouseLeft")) {
        if (lmbHeldMs >= TRAJECTORY_DRAG_HOLD_MS) {
          if (!state.isDraggingTrajectory) {
            state.isDraggingTrajectory = true;
            state.lockedTarget = { x: input.mouse.x, y: input.mouse.y };
          }

          actions.lockAimTarget(state.lockedTarget.x, state.lockedTarget.y);

          if (input.mouse.dy !== 0) {
            actions.modulateArc(-input.mouse.dy * 0.005);
          }
        }
      }

      if (input.isReleased("MouseLeft")) {
        if (state.isDraggingTrajectory) {
          state.isDraggingTrajectory = false;
          state.lockedTarget = null;

          if (FIRE_ON_RELEASE_AFTER_DRAG) {
            actions.releaseThrow();
          }
        } else if (lmbHeldMs < TRAJECTORY_DRAG_HOLD_MS) {
          actions.releaseThrow();
        }
      }
    } else {
      state.isDraggingTrajectory = false;
      state.lockedTarget = null;

      if (input.isPressed("KeyQ")) {
        actions.drop();
      }

      if (input.isPressed("MouseLeft") && input.targetInReach) {
        actions.swap();
      }
    }
  } else {
    state.isDraggingTrajectory = false;
    state.lockedTarget = null;
  }

  // 5. Eating / Consumable & Item Abilities (Key E)
  if (input.isHoldingItem() && input.isDown("KeyE")) {
    actions.useItem();
  }

  // 6. Combat: Melee Punch (Key F) & Laser (Alt + RMB)
  if (input.isPressed("KeyF")) {
    actions.punch();
  }

  const isAltHeld = input.isDown("AltLeft") || input.isDown("AltRight");
  if (isAltHeld && input.isDown("MouseRight")) {
    actions.aimLaser();
    if (input.isDown("MouseLeft")) {
      actions.fireLaser();
    }
  }
}
`.trim();

export interface ScriptInputContext {
  isDown(code: string | number): boolean;
  isPressed(code: string | number): boolean;
  isReleased(code: string | number): boolean;
  getHoldDuration(code: string | number): number;
  isHeldFor(code: string | number, ms: number): boolean;
  mouse: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    screenX: number;
    screenY: number;
  };
  dt: number;
  time: number;
  isHoldingItem(): boolean;
  heldItemIsEdible(): boolean;
  heldItemHasAbility(): boolean;
  targetInReach: GameObject | null;
  getStage(group?: string): string;
  setStage(group?: string, stage?: string): void;
  character: Character;
}

export interface ScriptActionsContext {
  move(x: number, y: number): void;
  sprint(active?: boolean): void;
  jump(): void;
  pickup(): void;
  drop(): void;
  swap(): void;
  useItem(): void;
  punch(): void;
  aimLaser(): void;
  fireLaser(): void;
  aimThrow(): void;
  releaseThrow(): void;
  lockAimTarget(x: number, y: number): void;
  unlockAimTarget(): void;
  modulateArc(deltaRatio: number): void;
  setTrajectoryArc(ratio: number): void;
  facePosition(x: number, y: number): void;
  faceAngle(radians: number): void;
}

export interface PlayerScriptCommandResult {
  playerId: string;
  moveX: number;
  moveY: number;
  isSprinting: boolean;
  isJumpHeld: boolean;
  isGrabHeld: boolean;
  grabTargetObjectId: string | null;
  isDrop: boolean;
  isThrow: boolean;
  isSwap: boolean;
  isUsingItem: boolean;
  isLaserAiming: boolean;
  isLaserFiring: boolean;
  laserAimX: number;
  laserAimY: number;
  isMeleeRequested: boolean;
  meleeAimDirX: number;
  meleeAimDirY: number;
  meleeAimX: number;
  meleeAimY: number;
  aimX: number;
  aimY: number;
  isAiming: boolean;
  isLockHeld: boolean;
  lockedAimPos: Vector2D | null;
  aimLockDelta: number;
  facingAngle?: number;
  launchVx?: number;
  launchVy?: number;
  launchVz?: number;
  launchStartX?: number;
  launchStartY?: number;
  launchStartZ?: number;
}

export class UserControlScriptRunner {
  private static instance: UserControlScriptRunner | null = null;

  public isEnabled: boolean = true;
  public scriptSource: string = DEFAULT_CONTROLS_SCRIPT;
  public lastError: string | null = null;
  public lastReloadTime: number = 0;

  private compiledFn: ((char: Character, input: ScriptInputContext, actions: ScriptActionsContext, state: Record<string, any>) => void) | null = null;
  public scriptState: Record<string, any> = {};

  // Input history tracking for hold duration, pressed, and released
  private keyHoldStartTimes: Map<string, number> = new Map();
  private prevKeysDown: Set<string> = new Set();
  private currentKeysDown: Set<string> = new Set();
  private justPressedKeys: Set<string> = new Set();
  private justReleasedKeys: Set<string> = new Set();

  private isInitialized: boolean = false;

  public static getInstance(): UserControlScriptRunner {
    if (!this.instance) {
      this.instance = new UserControlScriptRunner();
    }
    return this.instance;
  }

  private constructor() {
    this.compileScript(this.scriptSource);
  }

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.loadFromDisk();

    // Hot-reload automatically when the browser window regains focus (user saved file in editor)
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => {
        this.checkForUpdates();
      });
    }
  }

  public compileScript(sourceCode: string): boolean {
    try {
      let clean = sourceCode.trim();
      if (clean.startsWith("export default")) {
        clean = clean.replace(/^export\s+default\s+/, "");
      }

      // Try compiling as function expression: return (function updateControls(...) { ... })
      let fn: any;
      try {
        const wrapped = new Function(`"use strict"; return (${clean});`);
        fn = wrapped();
      } catch {
        // Fallback: evaluate as function body
        fn = new Function("char", "input", "actions", "state", `"use strict";\n${clean}`);
      }

      if (typeof fn !== "function") {
        throw new Error("controls.js must export a default function updateControls(char, input, actions, state)");
      }

      this.compiledFn = fn;
      this.scriptSource = sourceCode;
      this.lastError = null;
      this.lastReloadTime = performance.now();
      return true;
    } catch (err: any) {
      this.lastError = err?.message || String(err);
      console.warn("[UserControlScriptRunner] Compile error in controls.js:", this.lastError);
      return false;
    }
  }

  public async loadFromDisk(): Promise<boolean> {
    if (typeof window === "undefined" || typeof fetch === "undefined") {
      return false;
    }

    const tryUrls = [
      `/src/config/controls.js?t=${Date.now()}`,
      `/controls.js?t=${Date.now()}`,
    ];

    for (const url of tryUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().length > 0) {
            const ok = this.compileScript(text);
            if (ok) {
              console.log(`[UserControlScriptRunner] Successfully loaded controls script from ${url}`);
              return true;
            }
          }
        }
      } catch {
        // Ignore network / dev server fetch errors and try fallback
      }
    }
    return false;
  }

  public async checkForUpdates(): Promise<void> {
    if (typeof window === "undefined" || typeof fetch === "undefined") return;
    try {
      const res = await fetch(`/src/config/controls.js?t=${Date.now()}`);
      if (res.ok) {
        const text = await res.text();
        if (text && text !== this.scriptSource) {
          const ok = this.compileScript(text);
          if (ok) {
            console.log("[UserControlScriptRunner] Hot-reloaded controls.js from external edit");
          }
        }
      }
    } catch {}
  }

  public async saveScriptToServer(newCode: string): Promise<{ success: boolean; error?: string }> {
    const ok = this.compileScript(newCode);
    if (!ok && this.lastError) {
      return { success: false, error: this.lastError };
    }

    if (typeof window === "undefined" || typeof fetch === "undefined") {
      return { success: true };
    }

    try {
      const res = await fetch("/api/dev/controls-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || `HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to communicate with dev server" };
    }
  }

  private normalizeKey(code: string | number): string {
    if (code === 0 || code === "0" || code === "LMB" || code === "MouseLeft") return "MouseLeft";
    if (code === 1 || code === "1" || code === "MMB" || code === "MouseMiddle") return "MouseMiddle";
    if (code === 2 || code === "2" || code === "RMB" || code === "MouseRight") return "MouseRight";

    if (typeof code === "string") {
      const upper = code.toUpperCase();
      if (upper.length === 1 && upper >= "A" && upper <= "Z") {
        return `Key${upper}`;
      }
      if (code === "Shift") return "ShiftLeft";
      if (code === "Alt") return "AltLeft";
      if (code === "Ctrl" || code === "Control") return "ControlLeft";
    }
    return String(code);
  }

  public poll(
    char: Character,
    input: InputManager,
    arena: Arena,
    objects: GameObject[],
    allCharacters: Character[],
    dt: number
  ): PlayerScriptCommandResult | null {
    if (!this.isEnabled || !this.compiledFn) {
      return null;
    }

    const now = performance.now();

    // 1. Gather all currently active keys & buttons
    this.currentKeysDown.clear();

    if (input.isMouseDown) this.currentKeysDown.add("MouseLeft");
    if (input.isMiddleMouseDown) this.currentKeysDown.add("MouseMiddle");
    if (input.isRightMouseDown) this.currentKeysDown.add("MouseRight");

    for (const key of input.getActiveKeys()) {
      this.currentKeysDown.add(key);
    }

    // 2. Compute justPressed, justReleased, and update hold start times
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();

    for (const key of this.currentKeysDown) {
      if (!this.prevKeysDown.has(key)) {
        this.justPressedKeys.add(key);
        this.keyHoldStartTimes.set(key, now);
      }
    }

    for (const key of this.prevKeysDown) {
      if (!this.currentKeysDown.has(key)) {
        this.justReleasedKeys.add(key);
        this.keyHoldStartTimes.delete(key);
      }
    }

    // Save previous state for next tick
    this.prevKeysDown = new Set(this.currentKeysDown);

    // 3. Find candidate grab/interaction target
    let grabTargetObjectId: string | null = null;
    let grabTargetObject: GameObject | null = null;
    if (char.pickupModule) {
      const candidateEntities = [...allCharacters.filter((c) => c !== char), ...objects].filter(
        (c) => c !== char.heldObject
      );
      const target = char.pickupModule.findTargetObject(
        char,
        input.actualMousePos.x,
        input.actualMousePos.y,
        candidateEntities,
        arena.wallHeight
      );
      if (target) {
        grabTargetObject = target;
        grabTargetObjectId = target.id;
      }
    }

    // 4. Mouse delta accumulation
    const mouseDelta = input.consumeFrameMouseDelta();

    // 5. Construct ergonomic Input Context
    const inputCtx: ScriptInputContext = {
      isDown: (code) => {
        const norm = this.normalizeKey(code);
        if (norm === "ShiftLeft") return this.currentKeysDown.has("ShiftLeft") || this.currentKeysDown.has("ShiftRight");
        if (norm === "AltLeft") return this.currentKeysDown.has("AltLeft") || this.currentKeysDown.has("AltRight");
        if (norm === "ControlLeft") return this.currentKeysDown.has("ControlLeft") || this.currentKeysDown.has("ControlRight");
        return this.currentKeysDown.has(norm);
      },
      isPressed: (code) => {
        const norm = this.normalizeKey(code);
        if (norm === "ShiftLeft") return this.justPressedKeys.has("ShiftLeft") || this.justPressedKeys.has("ShiftRight");
        if (norm === "AltLeft") return this.justPressedKeys.has("AltLeft") || this.justPressedKeys.has("AltRight");
        if (norm === "ControlLeft") return this.justPressedKeys.has("ControlLeft") || this.justPressedKeys.has("ControlRight");
        return this.justPressedKeys.has(norm);
      },
      isReleased: (code) => {
        const norm = this.normalizeKey(code);
        if (norm === "ShiftLeft") return this.justReleasedKeys.has("ShiftLeft") || this.justReleasedKeys.has("ShiftRight");
        if (norm === "AltLeft") return this.justReleasedKeys.has("AltLeft") || this.justReleasedKeys.has("AltRight");
        if (norm === "ControlLeft") return this.justReleasedKeys.has("ControlLeft") || this.justReleasedKeys.has("ControlRight");
        return this.justReleasedKeys.has(norm);
      },
      getHoldDuration: (code) => {
        const norm = this.normalizeKey(code);
        const startTime = this.keyHoldStartTimes.get(norm);
        return startTime !== undefined ? Math.max(0, now - startTime) : 0;
      },
      isHeldFor: (code, ms) => {
        return inputCtx.getHoldDuration(code) >= ms;
      },
      mouse: {
        x: input.actualMousePos.x,
        y: input.actualMousePos.y,
        dx: mouseDelta.dx,
        dy: mouseDelta.dy,
        screenX: input.mousePos.x,
        screenY: input.mousePos.y,
      },
      dt,
      time: now,
      isHoldingItem: () => char.heldObject !== null,
      heldItemIsEdible: () => Boolean(char.heldObject?.consumableModule?.enabled),
      heldItemHasAbility: () => Boolean(char.hasPrimaryItemAbility()),
      targetInReach: grabTargetObject,
      getStage: (group = "default") => char.getStage(group),
      setStage: (group = "default", stage = "none") => char.setStage(group, stage),
      character: char,
    };

    // 6. Action accumulators
    let moveX = 0;
    let moveY = 0;
    let isSprinting = false;
    let isJumpHeld = false;
    let isGrabHeld = false;
    let isDrop = false;
    let isSwap = false;
    let isThrow = false;
    let isUsingItem = false;
    let isLaserAiming = false;
    let isLaserFiring = false;
    let isMeleeRequested = false;
    let isAimingTrajectory = false;
    let lockedAimPos: Vector2D | null = null;
    let authoredFacingAngle: number | undefined = undefined;

    const actionCtx: ScriptActionsContext = {
      move: (x, y) => {
        moveX = x;
        moveY = y;
      },
      sprint: (active = true) => {
        isSprinting = active;
      },
      jump: () => {
        isJumpHeld = true;
      },
      pickup: () => {
        isGrabHeld = true;
      },
      drop: () => {
        isDrop = true;
      },
      swap: () => {
        isSwap = true;
      },
      useItem: () => {
        isUsingItem = true;
      },
      punch: () => {
        isMeleeRequested = true;
      },
      aimLaser: () => {
        isLaserAiming = true;
      },
      fireLaser: () => {
        isLaserFiring = true;
        isLaserAiming = true;
      },
      aimThrow: () => {
        isAimingTrajectory = true;
      },
      releaseThrow: () => {
        isThrow = true;
      },
      lockAimTarget: (x, y) => {
        lockedAimPos = { x, y };
      },
      unlockAimTarget: () => {
        lockedAimPos = null;
      },
      modulateArc: (deltaRatio) => {
        if (!char.throwModule) return;
        const cur = char.throwModule.savedArcRatio ?? 0.5;
        const next = Math.max(0.0, Math.min(1.0, cur + deltaRatio));
        char.throwModule.savedArcRatio = next;
        char.savedArcRatio = next;
        char.throwModule.hasUserSetArcRatio = true;
        char.hasUserSetArcRatio = true;
      },
      setTrajectoryArc: (ratio) => {
        if (!char.throwModule) return;
        const clamped = Math.max(0.0, Math.min(1.0, ratio));
        char.throwModule.savedArcRatio = clamped;
        char.savedArcRatio = clamped;
        char.throwModule.hasUserSetArcRatio = true;
        char.hasUserSetArcRatio = true;
      },
      facePosition: (x, y) => {
        const dx = x - char.position.x;
        const dy = y - char.position.y;
        if (Math.hypot(dx, dy) > 0.05) {
          authoredFacingAngle = Math.atan2(dy, dx);
        }
      },
      faceAngle: (radians) => {
        authoredFacingAngle = radians;
      },
    };

    // 7. Execute user script safely
    try {
      this.compiledFn(char, inputCtx, actionCtx, this.scriptState);
    } catch (err: any) {
      this.lastError = err?.message || String(err);
      console.warn("[UserControlScriptRunner] Runtime error during tick:", this.lastError);
    }

    // 8. Normalize movement vector
    const moveMag = Math.hypot(moveX, moveY);
    if (moveMag > 1.0) {
      moveX /= moveMag;
      moveY /= moveMag;
    }

    // Apply facing angle
    if (authoredFacingAngle !== undefined) {
      char.facingAngle = authoredFacingAngle;
    }

    // Sync state flags back to character
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
      grabTargetObjectId: (isGrabHeld || isSwap) ? grabTargetObjectId : null,
      isDrop,
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
      isLockHeld: Boolean(lockedAimPos),
      lockedAimPos,
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
    };
  }
}
