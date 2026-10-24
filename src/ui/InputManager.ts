import { Vector2D } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import type { DevPanel } from "./DevPanel.js";

export interface GamepadSlotState {
  index: number;
  connected: boolean;
  id: string;
  isActive: boolean;
  movementVector: Vector2D;
  aimPos: Vector2D;
  isClimbHeld: boolean;
  prevButtons: boolean[];
  rtGrabbed: boolean;
  rtHeld: boolean;
  bHeld: boolean;
  aimOffsetInitialized: boolean;
  sprintArmed?: boolean;
  wasMoving?: boolean;
  lastAimMoveTime: number;
  isCursorVisible?: boolean;
  aimMovedWhileInRange?: boolean;
  aimOffset?: Vector2D;
  isLockHeld?: boolean;
  lockedAimPos?: Vector2D | null;
  leftPaddlePressTime?: number;
  hasMovedAimStick?: boolean;
  wasHoldingObject?: boolean;
  lastMovementInputAngle?: number;
  isThrowRequested?: boolean;
  isDropRequested?: boolean;
  isJumpRequested?: boolean;
  isUsingItem?: boolean;
  isAltHeld?: boolean;
  wasAltHeld?: boolean;
  lastThrowAimAngle?: number;
  arcModulationCursor?: Vector2D | null;
  arcModulationDeltaY?: number;
  isLaserAiming?: boolean;
  isLaserFiring?: boolean;
  laserTriggerValue?: number;
  wasLaserAiming?: boolean;
  isMeleeRequested?: boolean;
  meleeAimDir?: Vector2D | null;
}

export interface CanvasViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Linearly clamps an aim position along a forward ray (origin + dir * forwardDist)
 * to the boundary of the scene/game view (arena bounds).
 * Instead of component-wise clamping which distorts angles, this performs linear ray clipping
 * against the bounding box, preserving the exact forward angle and preventing cursor/character drift.
 */
export function calculateClampedForwardAimPos(
  charPos: { x: number; y: number },
  dirX: number,
  dirY: number,
  forwardDist: number,
  arenaWidth: number,
  arenaHeight: number,
  margin = 0.15
): { x: number; y: number; dist: number } {
  const minX = margin;
  const maxX = Math.max(minX, arenaWidth - margin);
  const minY = margin;
  const maxY = Math.max(minY, arenaHeight - margin);

  const charX = Math.max(minX, Math.min(maxX, charPos.x));
  const charY = Math.max(minY, Math.min(maxY, charPos.y));

  let maxAllowedDist = forwardDist;

  if (dirX > 0.0001) {
    maxAllowedDist = Math.min(maxAllowedDist, (maxX - charX) / dirX);
  } else if (dirX < -0.0001) {
    maxAllowedDist = Math.min(maxAllowedDist, (minX - charX) / dirX);
  }

  if (dirY > 0.0001) {
    maxAllowedDist = Math.min(maxAllowedDist, (maxY - charY) / dirY);
  } else if (dirY < -0.0001) {
    maxAllowedDist = Math.min(maxAllowedDist, (minY - charY) / dirY);
  }

  const finalDist = Math.max(0, maxAllowedDist);
  return {
    x: charX + dirX * finalDist,
    y: charY + dirY * finalDist,
    dist: finalDist,
  };
}

export class InputManager {
  public canvas: HTMLCanvasElement;
  private arena: Arena;
  public keyboardViewport: CanvasViewport | null = null;

  public get pixelsPerUnit(): number {
    return this.canvas && this.arena?.width ? this.canvas.width / this.arena.width : 50;
  }
  private keysPressed: Set<string> = new Set();
  public isEKeyDepressed = false;
  public isQKeyDepressed = false;
  public isKeyboardSprintActive = false;
  public isAltHeld = false;
  public lastKeyboardThrowAimAngle?: number;

  public isKeyPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  // Keyboard player active state (true when keyboard & mouse character is in arena)
  public isKeyboardActive = true;
  public isKeyboardThrowRequested = false;
  public isKeyboardDropRequested = false;
  public isKeyboardJumpRequested = false;

  public mousePos: Vector2D = { x: 0, y: 0 };
  public actualMousePos: Vector2D = { x: 0, y: 0 };
  public lastMouseMoveTime = 0;
  public isCursorVisible = false;
  public isMouseDown = false;
  public isRightMouseDown = false;
  public hoverWallTile: { col: number; row: number } | null = null;
  public movementVector: Vector2D = { x: 0, y: 0 };
  public justPickedUp = false;

  // Pointer lock state (disabled: free and visible cursor)
  public isPointerLocked = false;
  public devPanel?: DevPanel;

  // Whether keyboard and mouse input to the character is suspended (e.g. after pressing Escape)
  // until the user clicks the game view again
  public isKeyboardSuspended = false;

  public hideCursor(): void {
    if (this.canvas) {
      this.canvas.style.cursor = "none";
    }
  }

  public unhideCursor(): void {
    if (this.canvas) {
      this.canvas.style.cursor = "crosshair";
    }
  }

  public requestPointerLock(): void {
    if (typeof document === "undefined" || !this.canvas) return;
    try {
      const p = (this.canvas as any).requestPointerLock?.();
      if (p && typeof p.catch === "function") {
        p.catch(() => { });
      }
    } catch { }
  }

  public exitPointerLock(): void {
    if (typeof document !== "undefined" && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch { }
    }
  }

  public isThrowingPress = false;

  // Gamepad controller slots (multi-gamepad support)
  public gamepadSlots: Map<number, GamepadSlotState> = new Map();
  public gamepadConnected = false;
  public gamepadName = "";
  public isGamepadClimbHeld = false;
  public isGamepadAiming = false;
  public isGamepadAimActive = false;
  public activeInputDevice: "keyboard" | "gamepad" = "keyboard";
  public gamepadAimPos: Vector2D = { x: 0, y: 0 };
  public gamepadAimOffset: Vector2D = { x: 0, y: 0 };
  public lockedAimPos: Vector2D | null = null;
  public recordedMousePos: Vector2D | null = null;
  public isAwaitingUnlock: boolean = false;
  private unlockTimeoutId: number | null = null;
  public aimLockRawDelta: number = 0; // Legacy sum
  public aimLockRawDx: number = 0; // Raw physical horizontal mouse delta during lock
  public aimLockRawDy: number = 0; // Raw physical vertical mouse delta during lock
  public arcModulationDeltaY: number = 0; // Accumulated vertical mouse delta for trajectory modulation
  public arcModulationCursor: Vector2D | null = null; // Screen-space position of modulation cursor during right-click lock
  public arcDetentSide: "lower" | "higher" | null = null; // Active side of the efficiency detent threshold
  public lastClientX: number | null = null;
  public lastClientY: number | null = null;
  public isKeyboardMeleeRequested: boolean = false;

  public get isGrabHeld(): boolean {
    return (
      this.isKeyboardActive &&
      !this.isKeyboardSuspended &&
      !this.isThrowingPress &&
      (this.isMouseDown || this.isEKeyDepressed || this.keysPressed.has("KeyE"))
    );
  }

  public get isUsingGamepad(): boolean {
    return this.gamepadConnected && this.activeInputDevice === "gamepad";
  }

  public isTextInputFocused(): boolean {
    if (typeof document === "undefined") return false;
    const active = document.activeElement;
    if (!active) return false;
    const tagName = active.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
      return true;
    }
    if ((active as HTMLElement).isContentEditable) {
      return true;
    }
    return false;
  }

  private isTargetTextInput(target: EventTarget | null): boolean {
    if (!target) return false;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      Boolean((target as HTMLElement)?.isContentEditable)
    ) {
      return true;
    }
    return false;
  }

  public get isKeyboardJumpHeld(): boolean {
    return (
      this.isKeyboardActive &&
      !this.isTextInputFocused() &&
      (this.keysPressed.has("Space") || this.isKeyboardJumpRequested)
    );
  }

  public get isClimbHeld(): boolean {
    return this.isKeyboardJumpHeld || this.isGamepadClimbHeld;
  }

  public get isCtrlHeld(): boolean {
    return this.keysPressed.has("ControlLeft") || this.keysPressed.has("ControlRight");
  }

  // Selection & dragging state
  public hoverEntity: GameObject | null = null;
  public selectedCanvasEntity: GameObject | null = null;
  public draggedEntity: GameObject | null = null;
  public dragOffset: Vector2D = { x: 0, y: 0 };

  // Action callback hooks
  public handleClick?: (clickX: number, clickY: number, e?: MouseEvent) => void;
  public onMouseDown?: (clickX: number, clickY: number, e?: MouseEvent) => void;
  public onRightMouseDown?: (clickX: number, clickY: number) => void;
  public onMouseUp?: (clickX: number, clickY: number) => void;
  public onRightClick?: (clickX: number, clickY: number) => void;
  public onDropAttempt?: () => void;
  public onKeyboardPickup?: () => void;
  public onKeyboardDrop?: () => void;
  public onMouseMove?: (x: number, y: number) => void;
  public onToggleSprint?: (active?: boolean) => void;
  public onStopKeyboardSprint?: () => void;
  public onGamepadStatusChange?: (connected: boolean, name: string) => void;
  public onKeyboardJoin?: () => void;
  public onKeyboardJump?: () => void;
  public onGamepadJoin?: (slotIndex: number) => void;
  public onGamepadDisconnected?: (slotIndex: number) => void;
  public canLockAim?: () => boolean;
  public onLaserWheelAdjust?: (delta: number) => void;
  /** Scrolling sensitivity for laser power adjustment (higher = faster rate changes) */
  public laserScrollSensitivity: number = 10.0;

  constructor(canvas: HTMLCanvasElement, arena: Arena) {
    this.canvas = canvas;
    this.arena = arena;
    this.mousePos = { x: arena.width / 2, y: arena.height / 2 };
    this.actualMousePos = { x: arena.width / 2, y: arena.height / 2 };
    this.setupListeners();
    this.updateCanvasCursorClass();
  }

  private setupListeners(): void {
    if (typeof window === "undefined") return;

    // When an input/textarea/select receives focus, immediately release any active game keys
    // so the character doesn't keep running or jumping while the user types.
    window.addEventListener("focusin", (e) => {
      if (this.isTextInputFocused() || this.isTargetTextInput(e.target)) {
        this.keysPressed.clear();
        this.isEKeyDepressed = false;
        this.isKeyboardSprintActive = false;
        this.onStopKeyboardSprint?.();
        this.updateMovementVector();
      }
    });

    // Intercept accidental tab close (e.g. Ctrl+W or closing tab) while game is active
    window.addEventListener("beforeunload", (e) => {
      // Browsers intentionally disallow silent preventDefault() on Ctrl+W in windowed tabs for security.
      // Setting returnValue / preventDefault triggers the browser's native confirmation dialog:
      // "Leave site? Changes you made may not be saved."
      // This stops Ctrl+W from immediately closing the tab during play.
      e.preventDefault();
      e.returnValue = "";
    });

    // In Chromium browsers (Chrome, Edge), the Keyboard Lock API allows capturing
    // browser-reserved keys like Ctrl+W while in fullscreen mode without any prompt.
    if (typeof document !== "undefined" && typeof navigator !== "undefined" && "keyboard" in navigator) {
      const keyboard = (navigator as any).keyboard;
      if (typeof keyboard?.lock === "function") {
        document.addEventListener("fullscreenchange", async () => {
          if (document.fullscreenElement) {
            try {
              await keyboard.lock(["KeyW", "KeyN", "KeyT", "KeyS", "KeyP", "KeyD"]);
            } catch (err) {
              console.warn("Keyboard lock failed:", err);
            }
          } else {
            try {
              keyboard.unlock();
            } catch {}
          }
        });
      }
    }

    window.addEventListener("keydown", (e) => {
      // If Alt is pressed or held, prevent browser menu activation, menu bar focus, and browser shortcuts
      if (e.altKey || e.code === "AltLeft" || e.code === "AltRight" || e.key === "Alt") {
        this.isAltHeld = true;
        if (!this.isTextInputFocused() && !this.isTargetTextInput(e.target)) {
          e.preventDefault();
        }
      }

      // Prevent browser features triggered by Ctrl / Meta key combinations (e.g. Save, Print, Find, Zoom, Bookmarks, Select-All)
      if ((e.ctrlKey || e.metaKey) && e.key !== "Control" && e.key !== "Meta") {
        const inTextInput = this.isTextInputFocused() || this.isTargetTextInput(e.target);
        if (inTextInput) {
          // Inside text inputs, preserve standard clipboard and cursor/text editing shortcuts:
          // Ctrl+C (copy), Ctrl+V (paste), Ctrl+X (cut), Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo),
          // Ctrl+A (select all within input), and word navigation / deletion
          const isTextEditing =
            e.code === "KeyC" ||
            e.code === "KeyV" ||
            e.code === "KeyX" ||
            e.code === "KeyZ" ||
            e.code === "KeyY" ||
            e.code === "KeyA" ||
            e.code === "ArrowLeft" ||
            e.code === "ArrowRight" ||
            e.code === "ArrowUp" ||
            e.code === "ArrowDown" ||
            e.code === "Backspace" ||
            e.code === "Delete" ||
            e.code === "Home" ||
            e.code === "End";

          if (!isTextEditing) {
            e.preventDefault();
          }
        } else {
          // Outside text inputs, allow browser developer inspection tools (Ctrl+Shift+I / J / C)
          const isDevTools =
            e.shiftKey &&
            (e.code === "KeyI" || e.code === "KeyJ" || e.code === "KeyC");

          if (!isDevTools) {
            e.preventDefault();
          }
        }
      }

      // If user is focused on or typing into ANY text box or form input,
      // allow default browser behavior (typing characters, spaces, backspaces)
      // and do NOT hijack input or trigger game actions!
      if (this.isTextInputFocused() || this.isTargetTextInput(e.target)) {
        return;
      }

      // Space key: Claim Keyboard Player 1 if not yet active, and trigger jump
      if (e.code === "Space") {
        this.isKeyboardSuspended = false;
        this.updateCanvasCursorClass();
        if (!this.isKeyboardActive) {
          this.onKeyboardJoin?.();
        }
        if (!e.repeat) {
          this.isKeyboardJumpRequested = true;
          this.onKeyboardJump?.();
        }
      }

      if (e.code === "Escape") {
        this.isKeyboardSuspended = true;
        this.updateCanvasCursorClass();
        this.keysPressed.clear();
        this.isQKeyDepressed = false;
        this.isEKeyDepressed = false;
        this.isKeyboardSprintActive = false;
        this.isKeyboardJumpRequested = false;
        this.isAltHeld = false;
        this.isMouseDown = false;
        this.isRightMouseDown = false;
        this.updateMovementVector();
        this.exitPointerLock();
        return;
      }

      // If suspended from Escape, ignore all game key inputs until user clicks the game view again
      if (this.isKeyboardSuspended) {
        return;
      }

      if (e.code === "AltLeft" || e.code === "AltRight" || e.key === "Alt") {
        this.isAltHeld = true;
        // Prevent default browser alt menu activation in browsers
        e.preventDefault();
      }

      // On-demand join if keyboard player is not yet active
      if (!this.isKeyboardActive && e.code !== "Escape") {
        this.onKeyboardJoin?.();
      }

      this.activeInputDevice = "keyboard";
      this.keysPressed.add(e.code);
      this.updateMovementVector();

      // Shift toggles sprinting on / off (pressing Shift untoggles sprinting)
      if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && !e.repeat) {
        this.isKeyboardSprintActive = !this.isKeyboardSprintActive;
        if (this.isKeyboardSprintActive) {
          this.onToggleSprint?.(true);
        } else {
          this.onStopKeyboardSprint?.();
        }
      }

      if (e.code === "KeyQ") {
        // Q key drops currently held item
        if (e.repeat || this.isQKeyDepressed) return;
        this.isQKeyDepressed = true;

        this.onKeyboardDrop?.();
      }

      if (e.code === "KeyE") {
        // E key picks up ground item or swaps held item with targeted ground item
        if (e.repeat || this.isEKeyDepressed) return;
        this.isEKeyDepressed = true;

        this.onKeyboardPickup?.();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (this.isTextInputFocused() || this.isTargetTextInput(e.target)) {
        this.keysPressed.delete(e.code);
        return;
      }

      this.keysPressed.delete(e.code);

      if (this.isKeyboardSuspended) {
        this.updateMovementVector();
        return;
      }

      this.updateMovementVector();

      if (e.code === "KeyQ") {
        this.isQKeyDepressed = false;
      }

      if (e.code === "KeyE") {
        this.isEKeyDepressed = false;
      }

      if (e.code === "AltLeft" || e.code === "AltRight" || e.key === "Alt") {
        this.isAltHeld = false;
        if (!this.isTextInputFocused() && !this.isTargetTextInput(e.target)) {
          e.preventDefault();
        }
      }

      // Automatically turn off sprint when all movement keys are released!
      if (!this.hasAnyMovementKeyPressed()) {
        this.isKeyboardSprintActive = false;
        this.onStopKeyboardSprint?.();
      }
    });

    window.addEventListener("blur", () => {
      this.isKeyboardSuspended = true;
      this.isRightMouseDown = false;
      this.isAwaitingUnlock = false;
      this.unhideCursor();
      this.lockedAimPos = null;
      this.exitPointerLock();
      this.updateCanvasCursorClass();
      this.isQKeyDepressed = false;
      this.isEKeyDepressed = false;
      this.isAltHeld = false;
      this.keysPressed.clear();
      this.isKeyboardSprintActive = false;
      this.onStopKeyboardSprint?.();
      this.updateMovementVector();
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isKeyboardSuspended) {
        return;
      }
      this.lastMouseMoveTime = performance.now();

      if (this.isRightMouseDown && this.lockedAimPos) {
        // While locked, take raw mouse input to increase/decrease arc height
        const movementDy = (e.movementY !== undefined && e.movementY !== 0)
          ? e.movementY
          : (this.lastClientY !== null ? e.clientY - this.lastClientY : 0);
        const movementDx = (e.movementX !== undefined && e.movementX !== 0)
          ? e.movementX
          : (this.lastClientX !== null ? e.clientX - this.lastClientX : 0);
        this.lastClientX = e.clientX;
        this.lastClientY = e.clientY;

        this.aimLockRawDx += movementDx;
        this.aimLockRawDy += movementDy;
        this.aimLockRawDelta += movementDx + movementDy;
        this.arcModulationDeltaY += movementDy;

        // Keep game cursor snapped to recorded mouse pos
        if (this.recordedMousePos) {
          this.mousePos.x = this.recordedMousePos.x;
          this.mousePos.y = this.recordedMousePos.y;
          this.actualMousePos.x = this.recordedMousePos.x;
          this.actualMousePos.y = this.recordedMousePos.y;
        }
        return;
      }

      // Do not move game cursor until AFTER unlocked!
      if (this.isAwaitingUnlock || (typeof document !== "undefined" && document.pointerLockElement)) {
        if (this.recordedMousePos) {
          this.mousePos.x = this.recordedMousePos.x;
          this.mousePos.y = this.recordedMousePos.y;
          this.actualMousePos.x = this.recordedMousePos.x;
          this.actualMousePos.y = this.recordedMousePos.y;
        }
        return;
      }

      this.updateMousePos(e);
      if (this.onMouseMove) {
        this.onMouseMove(this.mousePos.x, this.mousePos.y);
      }
    });

    const completeUnlock = () => {
      if (this.unlockTimeoutId) {
        clearTimeout(this.unlockTimeoutId);
        this.unlockTimeoutId = null;
      }
      // 1. Mouse has been first unlocked!
      // 2. AND THEN set game cursor to recorded mouse position:
      if (this.recordedMousePos) {
        this.mousePos.x = this.recordedMousePos.x;
        this.mousePos.y = this.recordedMousePos.y;
        this.actualMousePos.x = this.recordedMousePos.x;
        this.actualMousePos.y = this.recordedMousePos.y;
      }
      // 3. Make it visible:
      this.unhideCursor();
      // 4. And make game cursor follow mouse again:
      this.isAwaitingUnlock = false;
      this.lockedAimPos = null;
      this.arcModulationCursor = null;
      this.arcModulationDeltaY = 0;
      this.arcDetentSide = null;
      if (typeof document !== "undefined") {
        document.body.classList.remove("pointer-locked");
        this.canvas?.classList.remove("pointer-locked");
      }
    };

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = (document.pointerLockElement === this.canvas);
      if (!this.isPointerLocked && this.isAwaitingUnlock) {
        // Defer completion to next animation frame so the browser finishes restoring hardware cursor coordinates first
        requestAnimationFrame(() => {
          completeUnlock();
        });
      }
    });

    document.addEventListener("pointerlockerror", () => {
      this.isPointerLocked = false;
      completeUnlock();
    });

    this.canvas.addEventListener("mousedown", (e) => {
      this.activeInputDevice = "keyboard";
      this.lastMouseMoveTime = performance.now();

      // On-demand join if keyboard player is not yet active
      if (!this.isKeyboardActive) {
        this.onKeyboardJoin?.();
      }

      // Resume keyboard/mouse control when clicking on the game view
      const wasSuspended = this.isKeyboardSuspended;
      this.isKeyboardSuspended = false;
      this.updateCanvasCursorClass();

      this.updateMousePos(e);

      // If we just clicked to refocus/unpause the game view from Escape, don't trigger an accidental throw or grab
      if (wasSuspended) {
        return;
      }

      if (e.button === 2) {
        this.isRightMouseDown = true;
        const isAlt = e.altKey || this.keysPressed.has("AltLeft") || this.keysPressed.has("AltRight") || this.isAltHeld;
        if (isAlt) {
          // Alt + RMB enters Laser Aiming Mode
          this.isKeyboardMeleeRequested = false;
        } else {
          // Plain RMB is Melee Punch
          this.isKeyboardMeleeRequested = true;
        }
        if (this.onRightMouseDown) {
          this.onRightMouseDown(this.mousePos.x, this.mousePos.y);
        }
        return;
      }
      if (e.button !== 0) return; // Only primary left click
      this.isMouseDown = true;

      if (this.onMouseDown) {
        this.onMouseDown(this.mousePos.x, this.mousePos.y, e);
      }

      if (this.handleClick) {
        this.handleClick(this.mousePos.x, this.mousePos.y, e);
      }
    });

    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault(); // Prevent browser context menu
      if (this.isKeyboardSuspended || this.lockedAimPos || this.isAwaitingUnlock || (typeof document !== "undefined" && document.pointerLockElement)) {
        if (this.recordedMousePos) {
          this.mousePos.x = this.recordedMousePos.x;
          this.mousePos.y = this.recordedMousePos.y;
          this.actualMousePos.x = this.recordedMousePos.x;
          this.actualMousePos.y = this.recordedMousePos.y;
        }
        return;
      }
      this.updateMousePos(e);
      if (this.onRightClick) {
        this.onRightClick(this.mousePos.x, this.mousePos.y);
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
        this.isKeyboardMeleeRequested = false;
        const wasLocked = Boolean(this.lockedAimPos || this.isPointerLocked || (typeof document !== "undefined" && document.pointerLockElement));
        this.aimLockRawDelta = 0;
        this.aimLockRawDx = 0;
        this.aimLockRawDy = 0;
        this.arcModulationDeltaY = 0;
        this.arcModulationCursor = null;
        this.arcDetentSide = null;
        this.lastClientX = null;
        this.lastClientY = null;

        // Move game cursor to recorded position it was at when originally locked
        if (this.recordedMousePos) {
          this.mousePos.x = this.recordedMousePos.x;
          this.mousePos.y = this.recordedMousePos.y;
          this.actualMousePos.x = this.recordedMousePos.x;
          this.actualMousePos.y = this.recordedMousePos.y;
        }

        // Unlock mouse: do NOT let game cursor follow mouse until AFTER unlocked!
        if (wasLocked) {
          this.isAwaitingUnlock = true;
          this.exitPointerLock();
          if (this.unlockTimeoutId) clearTimeout(this.unlockTimeoutId);
          this.unlockTimeoutId = window.setTimeout(() => {
            if (this.isAwaitingUnlock) {
              completeUnlock();
            }
          }, 80);
        } else {
          completeUnlock();
        }
        return;
      }
      if (e.button !== 0) return;
      this.isMouseDown = false;
      this.justPickedUp = false;
      this.isThrowingPress = false;
      if (this.isKeyboardSuspended) return;
      if (this.onMouseUp) {
        this.onMouseUp(this.mousePos.x, this.mousePos.y);
      }
    });

    window.addEventListener("wheel", (e) => {
      e.preventDefault();
      const isAlt = e.altKey || this.keysPressed.has("AltLeft") || this.keysPressed.has("AltRight") || this.isAltHeld;
      const isLaserMode = isAlt && this.isRightMouseDown;

      if (isLaserMode) {
        // Alt + RMB: adjust laser power
        const isShift = e.shiftKey || this.keysPressed.has("ShiftLeft") || this.keysPressed.has("ShiftRight");
        const dir = e.deltaY < 0 ? 1 : -1;
        const step = isShift ? dir * (this.laserScrollSensitivity * 3.0) : dir * this.laserScrollSensitivity;
        this.onLaserWheelAdjust?.(step);
      } else {
        // Change throw trajectory height:
        // Scroll UP (negative deltaY) = higher/steeper arc
        // Scroll DOWN (positive deltaY) = flatter/lower arc
        const sign = Math.sign(e.deltaY);
        const notchDelta = (sign !== 0 ? sign : (e.deltaY < 0 ? -1 : 1)) * 15;
        this.arcModulationDeltaY += notchDelta;
      }
    }, { passive: false });

    // Touch support for mobile / touchscreens
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        if (!this.isKeyboardActive) {
          this.onKeyboardJoin?.();
        }
        this.isMouseDown = true;
        this.lastMouseMoveTime = performance.now();
        this.updateTouchPos(e.touches[0]);
        if (this.onMouseDown) {
          this.onMouseDown(this.mousePos.x, this.mousePos.y);
        }
        if (this.handleClick) {
          this.handleClick(this.mousePos.x, this.mousePos.y);
        }
      }
    }, { passive: false });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) {
        this.lastMouseMoveTime = performance.now();
        this.updateTouchPos(e.touches[0]);
        if (this.onMouseMove) {
          this.onMouseMove(this.mousePos.x, this.mousePos.y);
        }
      }
    }, { passive: false });

    window.addEventListener("touchend", () => {
      this.isMouseDown = false;
      this.justPickedUp = false;
      this.isThrowingPress = false;
      if (this.onMouseUp) {
        this.onMouseUp(this.mousePos.x, this.mousePos.y);
      }
    });

    window.addEventListener("gamepadconnected", (e) => {
      this.gamepadConnected = true;
      this.gamepadName = e.gamepad.id;
      this.activeInputDevice = "gamepad";
      this.isGamepadAiming = true;
      this.isGamepadAimActive = true;
      if (this.onGamepadStatusChange) {
        this.onGamepadStatusChange(true, this.gamepadName);
      }
    });

    window.addEventListener("gamepaddisconnected", () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const hasAny = Array.from(gamepads).some((gp) => gp && gp.connected);
      this.gamepadConnected = hasAny;
      if (!hasAny) {
        this.gamepadName = "";
        this.isGamepadClimbHeld = false;
        this.isGamepadAiming = false;
        this.isGamepadAimActive = false;
      }
      if (this.onGamepadStatusChange) {
        this.onGamepadStatusChange(this.gamepadConnected, this.gamepadName);
      }
    });
  }

  public setKeyboardViewport(vp: CanvasViewport | null): void {
    this.keyboardViewport = vp;
  }

  private updateMousePos(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    let rawMx = 0;
    let rawMy = 0;
    if (this.keyboardViewport) {
      const vp = this.keyboardViewport;
      const canvasPixelX = (e.clientX - rect.left) * (this.canvas.width / Math.max(1, rect.width));
      const canvasPixelY = (e.clientY - rect.top) * (this.canvas.height / Math.max(1, rect.height));
      rawMx = (canvasPixelX - vp.offsetX) / Math.max(0.0001, vp.scale);
      rawMy = (canvasPixelY - vp.offsetY) / Math.max(0.0001, vp.scale);
    } else {
      rawMx = (e.clientX - rect.left) * (this.arena.width / Math.max(1, rect.width));
      rawMy = (e.clientY - rect.top) * (this.arena.height / Math.max(1, rect.height));
    }

    const mx = Math.max(0, Math.min(this.arena.width, rawMx));
    const my = Math.max(0, Math.min(this.arena.height, rawMy));
    this.actualMousePos.x = mx;
    this.actualMousePos.y = my;
    this.mousePos.x = mx;
    this.mousePos.y = my;
  }

  private updateTouchPos(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    if (this.keyboardViewport) {
      const vp = this.keyboardViewport;
      const canvasPixelX = (touch.clientX - rect.left) * (this.canvas.width / Math.max(1, rect.width));
      const canvasPixelY = (touch.clientY - rect.top) * (this.canvas.height / Math.max(1, rect.height));
      const mx = Math.max(0, Math.min(this.arena.width, (canvasPixelX - vp.offsetX) / Math.max(0.0001, vp.scale)));
      const my = Math.max(0, Math.min(this.arena.height, (canvasPixelY - vp.offsetY) / Math.max(0.0001, vp.scale)));
      this.actualMousePos.x = mx;
      this.actualMousePos.y = my;
      this.mousePos.x = mx;
      this.mousePos.y = my;
    } else {
      const mx = Math.max(0, Math.min(this.arena.width, (touch.clientX - rect.left) * (this.arena.width / Math.max(1, rect.width))));
      const my = Math.max(0, Math.min(this.arena.height, (touch.clientY - rect.top) * (this.arena.height / Math.max(1, rect.height))));
      this.actualMousePos.x = mx;
      this.actualMousePos.y = my;
      this.mousePos.x = mx;
      this.mousePos.y = my;
    }
  }

  public updateCanvasCursorClass(): void {
    if (typeof document === "undefined" || !this.canvas) return;
    if (this.isKeyboardSuspended || this.devPanel?.isEditMode) {
      this.canvas.classList.add("show-os-cursor");
    } else {
      this.canvas.classList.remove("show-os-cursor");
    }
  }

  /**
   * Helper to check if any directional movement key (WASD or Arrow keys) is currently pressed.
   */
  public hasAnyMovementKeyPressed(): boolean {
    return (
      this.keysPressed.has("KeyW") ||
      this.keysPressed.has("KeyA") ||
      this.keysPressed.has("KeyS") ||
      this.keysPressed.has("KeyD") ||
      this.keysPressed.has("ArrowUp") ||
      this.keysPressed.has("ArrowLeft") ||
      this.keysPressed.has("ArrowDown") ||
      this.keysPressed.has("ArrowRight")
    );
  }

  private updateMovementVector(): void {
    if (!this.isKeyboardActive || this.isTextInputFocused()) {
      this.movementVector.x = 0;
      this.movementVector.y = 0;
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.keysPressed.has("KeyW") || this.keysPressed.has("ArrowUp")) dy -= 1;
    if (this.keysPressed.has("KeyS") || this.keysPressed.has("ArrowDown")) dy += 1;
    if (this.keysPressed.has("KeyA") || this.keysPressed.has("ArrowLeft")) dx -= 1;
    if (this.keysPressed.has("KeyD") || this.keysPressed.has("ArrowRight")) dx += 1;

    const mag = Math.hypot(dx, dy);
    if (mag > 0) {
      this.movementVector.x = dx / mag;
      this.movementVector.y = dy / mag;
    } else {
      this.movementVector.x = 0;
      this.movementVector.y = 0;
    }
  }

  /**
   * Polls all connected Gamepad slots deterministically.
   * If a connected gamepad's character was removed, pressing the 'A' button (button 0) adds their character back.
   * If a gamepad is active, processes analog movement, virtual aim reticle travel, climbing, sprint, grab, and throw.
   */
  public pollGamepadSlots(
    playersMap: Map<string, { character: Character; slotIndex?: number; isKeyboard?: boolean }>,
    objects: GameObject[],
    arena: Arena,
    allCharacters?: Character[],
    _getVisualPosition?: (entity: GameObject) => Vector2D
  ): void {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const deadzone = 0.18;
    const dt = 1 / 60;
    let anyConnected = false;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp || !gp.connected) {
        const existingSlot = this.gamepadSlots.get(i);
        if (existingSlot && existingSlot.connected) {
          existingSlot.connected = false;
          if (existingSlot.isActive) {
            existingSlot.isActive = false;
            this.onGamepadDisconnected?.(i);
          }
        }
        continue;
      }

      anyConnected = true;
      let slot = this.gamepadSlots.get(i);
      if (!slot) {
        slot = {
          index: i,
          connected: true,
          id: gp.id,
          isActive: false,
          movementVector: { x: 0, y: 0 },
          aimPos: { x: arena.width / 2, y: arena.height / 2 },
          isClimbHeld: false,
          prevButtons: [],
          rtGrabbed: false,
          rtHeld: false,
          bHeld: false,
          aimOffsetInitialized: false,
          sprintArmed: false,
          wasMoving: false,
          lastAimMoveTime: 0,
          aimOffset: { x: 0, y: 0 },
          leftPaddlePressTime: 0,
          hasMovedAimStick: false,
          wasHoldingObject: false,
        };
        this.gamepadSlots.set(i, slot);
      } else {
        slot.connected = true;
        slot.id = gp.id;
      }

      const isButtonPressed = (btnIndex: number, threshold = 0.3): boolean => {
        const b = gp.buttons[btnIndex];
        if (!b) return false;
        return typeof b === "object" ? b.pressed || b.value > threshold : (b as unknown as number) > threshold;
      };

      const getButtonValue = (btnIndex: number): number => {
        const b = gp.buttons[btnIndex];
        if (!b) return 0;
        if (typeof b === "object") {
          return typeof b.value === "number" ? b.value : (b.pressed ? 1.0 : 0.0);
        }
        return typeof b === "number" ? b : 0;
      };

      const isPrevPressed = (btnIndex: number): boolean => slot.prevButtons[btnIndex] === true;

      // Check if this controller currently has an active character in arena
      const playerEntry = playersMap.get(`gamepad-${i}`);
      const char = playerEntry ? playerEntry.character : null;
      slot.isActive = char !== null;

      // Helper to test if any button in an array is pressed
      const isAnyButtonPressed = (indices: number[]): boolean => {
        return indices.some((idx) => isButtonPressed(idx));
      };
      const isAnyButtonPrevPressed = (indices: number[]): boolean => {
        return indices.some((idx) => isPrevPressed(idx));
      };

      // Check extended paddle buttons:
      // On mobile gamepads (e.g. GameSir G8, Razer, Flydigi), back paddles are explicitly labelled:
      // - Right Paddle = M1
      // - Left Paddle = M2
      // In the Gamepad API:
      // - If controller has 17 buttons (indices 0..16): Button 16 is M1 (Right Paddle)
      // - If controller has 18 buttons (indices 0..17): Button 16 is M1 (Right Paddle / Jump), Button 17 is M2 (Left Paddle / Sprint)
      // - If controller has 19+ buttons (indices 0..18+):
      //   Odd indices (17, 19, 21...) = M1 / M3 (Right side paddles)
      //   Even indices (18, 20, 22...) = M2 / M4 (Left side paddles)
      //   Button 16 is also M1 if present.
      let extendedLeftPaddle = false;
      let extendedPrevLeftPaddle = false;
      let extendedRightPaddle = false;
      let extendedPrevRightPaddle = false;

      const numButtons = gp.buttons.length;
      if (numButtons === 17) {
        // Button 16 = M1 (Right Paddle / Jump)
        if (isButtonPressed(16)) extendedRightPaddle = true;
        if (isPrevPressed(16)) extendedPrevRightPaddle = true;
      } else if (numButtons === 18) {
        // Button 16 = M1 (Right Paddle / Jump), Button 17 = M2 (Left Paddle / Sprint)
        if (isButtonPressed(16)) extendedRightPaddle = true;
        if (isPrevPressed(16)) extendedPrevRightPaddle = true;
        if (isButtonPressed(17)) extendedLeftPaddle = true;
        if (isPrevPressed(17)) extendedPrevLeftPaddle = true;
      } else if (numButtons > 18) {
        for (let bIdx = 16; bIdx < numButtons; bIdx++) {
          if (bIdx === 16) {
            // Button 16 on 19+ pads can be M1
            if (isButtonPressed(16)) extendedRightPaddle = true;
            if (isPrevPressed(16)) extendedPrevRightPaddle = true;
            continue;
          }
          if (bIdx % 2 === 1) {
            // 17, 19, 21... = M1 / M3 (Right side paddles -> Jump)
            if (isButtonPressed(bIdx)) extendedRightPaddle = true;
            if (isPrevPressed(bIdx)) extendedPrevRightPaddle = true;
          } else {
            // 18, 20, 22... = M2 / M4 (Left side paddles -> Sprint)
            if (isButtonPressed(bIdx)) extendedLeftPaddle = true;
            if (isPrevPressed(bIdx)) extendedPrevLeftPaddle = true;
          }
        }
      }

      // Left Under-Paddle (M2) / Sprint buttons:
      // Left Joystick Click (L3 / Button 10), plus extended M2 back paddles (buttons 17+)
      // NOTE: Button 4 (Left Bumper / LB) is no longer sprint; LB is exclusively Laser Mode!
      const leftPaddleButtonIndices = [10];
      const leftPaddleCurrent = isAnyButtonPressed(leftPaddleButtonIndices) || extendedLeftPaddle;
      const leftPaddlePrev = isAnyButtonPrevPressed(leftPaddleButtonIndices) || extendedPrevLeftPaddle;
      const leftPaddleJustPressed = leftPaddleCurrent && !leftPaddlePrev;
      const leftPaddleJustReleased = !leftPaddleCurrent && leftPaddlePrev;

      // Right Under-Paddle (M1) / Jump & Climb buttons:
      // Button 0 (A on Xbox / Cross on PS), plus extended M1 back paddles (buttons 16+).
      // NOTE: Burger / Menu / Start (Button 9) and D-pad Right (Button 15) are strictly excluded so they do NOT trigger jump!
      const rightPaddleButtonIndices = [0];
      const rightPaddleCurrent = isAnyButtonPressed(rightPaddleButtonIndices) || extendedRightPaddle;
      const rightPaddlePrev = isAnyButtonPrevPressed(rightPaddleButtonIndices) || extendedPrevRightPaddle;
      const rightPaddleJustPressed = rightPaddleCurrent && !rightPaddlePrev;

      // 1. Controller is connected but its character is NOT currently in the arena:
      // Pressing A (Xbox button 0 / Cross) or Right Under-Paddle adds their character back in!
      if (!slot.isActive || !char) {
        if (rightPaddleJustPressed) {
          this.onGamepadJoin?.(i);
        }
        slot.prevButtons = gp.buttons.map((b) => (typeof b === "object" ? b.pressed || b.value > 0.3 : (b as unknown as number) > 0.3));
        continue;
      }

      // 2. Controller is active in arena: process all inputs for char
      const lx = gp.axes[0] ?? 0;
      const ly = gp.axes[1] ?? 0;
      const rx = gp.axes[2] ?? 0;
      const ry = gp.axes[3] ?? 0;
      const lMag = Math.hypot(lx, ly);
      const rMag = Math.hypot(rx, ry);

      if (lMag > deadzone || rMag > deadzone || gp.buttons.some((b) => (typeof b === "object" ? b.pressed || b.value > 0.25 : (b as unknown as number) > 0.25))) {
        this.activeInputDevice = "gamepad";
      }

      // Left Joystick for movement
      if (lMag > deadzone) {
        const normalizedMag = Math.min(1.0, (lMag - deadzone) / (1.0 - deadzone));
        slot.movementVector.x = (lx / lMag) * normalizedMag;
        slot.movementVector.y = (ly / lMag) * normalizedMag;
        slot.lastMovementInputAngle = Math.atan2(slot.movementVector.y, slot.movementVector.x);
        char.lastMovementInputAngle = slot.lastMovementInputAngle;
      } else {
        slot.movementVector.x = 0;
        slot.movementVector.y = 0;
      }

      // Right Joystick for absolute arena aim reticle:
      // Operates like a free-floating mouse cursor in world coordinates (unleashed from character)
      const isHolding = char.heldObject !== null;
      if (isHolding && !slot.wasHoldingObject) {
        // Just picked up an object: place cursor directly in front in latest movement input direction
        if (rMag <= deadzone) {
          slot.hasMovedAimStick = false;
        }
        slot.aimMovedWhileInRange = false;
        slot.lastThrowAimAngle = undefined;
        char.lastThrowAimAngle = undefined;
        const moveMag = Math.hypot(slot.movementVector.x, slot.movementVector.y);
        const inputAngle = moveMag > 0.05
          ? Math.atan2(slot.movementVector.y, slot.movementVector.x)
          : (char.facingAngle ?? 0);
        slot.lastMovementInputAngle = inputAngle;
        char.lastMovementInputAngle = inputAngle;
        char.facingAngle = inputAngle;
        const forwardDist = 3.0;
        const clamped = calculateClampedForwardAimPos(char.position, Math.cos(inputAngle), Math.sin(inputAngle), forwardDist, arena.width, arena.height);
        slot.aimPos.x = clamped.x;
        slot.aimPos.y = clamped.y;
        slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
        slot.aimOffset.x = clamped.x - char.position.x;
        slot.aimOffset.y = clamped.y - char.position.y;
      }
      if (!isHolding && slot.wasHoldingObject) {
        slot.hasMovedAimStick = false;
        slot.aimMovedWhileInRange = false;
      }
      slot.wasHoldingObject = isHolding;

      if (!slot.aimOffset) {
        slot.aimOffset = { x: 0, y: 0 };
      }
      if (!slot.aimPos) {
        slot.aimPos = { x: char.position.x, y: char.position.y };
      }

      if (!slot.aimOffsetInitialized) {
        slot.aimPos = {
          x: char.position.x,
          y: char.position.y,
        };
        slot.aimOffset = {
          x: 0,
          y: 0,
        };
        slot.aimOffsetInitialized = true;
        slot.hasMovedAimStick = false;
      }

      // Grabbable target candidates include freebody objects and other characters
      const grabbableTargets = allCharacters
        ? [...allCharacters.filter((c) => c !== char), ...objects]
        : objects;

      const hasReachable = !isHolding && Boolean(
        char.pickupModule &&
        char.pickupModule.enabled &&
        grabbableTargets.some((obj) => char.pickupModule!.isObjectInReach(char, obj, arena.wallHeight))
      );

      // Button 4 (LB / L1): Enter Laser Mode
      const isLbPressed = isButtonPressed(4, 0.3);
      const isLbJustPressed = isLbPressed && !isPrevPressed(4);
      const isLbJustReleased = !isLbPressed && isPrevPressed(4);
      slot.isLaserAiming = isLbPressed;

      if (isLbJustPressed) {
        // Entering laser mode starts in forward-leading mode before right JS is touched
        slot.hasMovedAimStick = false;
        slot.aimMovedWhileInRange = true;
      } else if (isLbJustReleased) {
        slot.hasMovedAimStick = false;
      }

      if (slot.isLaserAiming) {
        if (!slot.hasMovedAimStick) {
          let dirX = 1;
          let dirY = 0;
          const moveMag = Math.hypot(slot.movementVector.x, slot.movementVector.y);
          if (moveMag > 0.05) {
            dirX = slot.movementVector.x / moveMag;
            dirY = slot.movementVector.y / moveMag;
            const moveAngle = Math.atan2(dirY, dirX);
            slot.lastMovementInputAngle = moveAngle;
            char.lastMovementInputAngle = moveAngle;
            char.facingAngle = moveAngle;
            char.lastThrowAimAngle = moveAngle;
            slot.lastThrowAimAngle = moveAngle;
          } else {
            const facing = char.facingAngle ?? char.lastThrowAimAngle ?? slot.lastThrowAimAngle ?? 0;
            dirX = Math.cos(facing);
            dirY = Math.sin(facing);
          }
          const forwardDist = 5.0;
          const clamped = calculateClampedForwardAimPos(char.position, dirX, dirY, forwardDist, arena.width, arena.height);
          slot.aimPos.x = clamped.x;
          slot.aimPos.y = clamped.y;
          slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
          slot.aimOffset.x = clamped.x - char.position.x;
          slot.aimOffset.y = clamped.y - char.position.y;
        }
      } else if (isHolding) {
        // If holding an object and player has NOT moved the right aim stick yet
        if (!slot.hasMovedAimStick) {
          const isThrowActive = !char.isPrimaryAbilityNonDirectional() || slot.isAltHeld;
          if (isThrowActive) {
            let dirX = 1;
            let dirY = 0;
            const moveMag = Math.hypot(slot.movementVector.x, slot.movementVector.y);
            if (moveMag > 0.05) {
              dirX = slot.movementVector.x / moveMag;
              dirY = slot.movementVector.y / moveMag;
              const moveAngle = Math.atan2(dirY, dirX);
              slot.lastMovementInputAngle = moveAngle;
              char.lastMovementInputAngle = moveAngle;
              char.facingAngle = moveAngle;
              char.lastThrowAimAngle = moveAngle;
              slot.lastThrowAimAngle = moveAngle;
            } else {
              const facing = char.facingAngle ?? 0;
              dirX = Math.cos(facing);
              dirY = Math.sin(facing);
            }
            const forwardDist = 3.0;
            const clamped = calculateClampedForwardAimPos(char.position, dirX, dirY, forwardDist, arena.width, arena.height);
            slot.aimPos.x = clamped.x;
            slot.aimPos.y = clamped.y;
            slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
            slot.aimOffset.x = clamped.x - char.position.x;
            slot.aimOffset.y = clamped.y - char.position.y;
          }
        }
      } else {
        // Empty-handed:
        if (!hasReachable && !slot.isLaserAiming) {
          // Out of range: reset aimMovedWhileInRange and keep cursor at character
          slot.aimMovedWhileInRange = false;
          slot.aimPos.x = char.position.x;
          slot.aimPos.y = char.position.y;
          slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
          slot.aimOffset.x = 0;
          slot.aimOffset.y = 0;
        } else if (!slot.aimMovedWhileInRange && !slot.isLaserAiming) {
          // Around something to grab: start cursor AT character instead of latest offset!
          slot.aimPos.x = char.position.x;
          slot.aimPos.y = char.position.y;
          slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
          slot.aimOffset.x = 0;
          slot.aimOffset.y = 0;
        }
      }

      // Button 6 (LT / L2): Act like Alt (switches from dynamic primary ability e.g. eating to explicit throwing mode)
      const isLtPressed = isButtonPressed(6, 0.2);
      const isLtJustPressed = isLtPressed && !slot.wasAltHeld;
      const isLtJustReleased = !isLtPressed && Boolean(slot.wasAltHeld);
      slot.wasAltHeld = isLtPressed;
      slot.isAltHeld = isLtPressed;

      if (isHolding && char.isPrimaryAbilityNonDirectional()) {
        if (isLtJustPressed) {
          // Entering throwing mode: reset cursor to default forward distance (3.0 units) directly in front of character
          slot.hasMovedAimStick = false;
          slot.aimMovedWhileInRange = false;

          const facing = char.facingAngle ?? 0;
          const dirX = Math.cos(facing);
          const dirY = Math.sin(facing);
          const forwardDist = 3.0;
          const clamped = calculateClampedForwardAimPos(char.position, dirX, dirY, forwardDist, arena.width, arena.height);
          slot.aimPos.x = clamped.x;
          slot.aimPos.y = clamped.y;
          slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
          slot.aimOffset.x = clamped.x - char.position.x;
          slot.aimOffset.y = clamped.y - char.position.y;
          char.lastThrowAimAngle = facing;
          slot.lastThrowAimAngle = facing;
        } else if (isLtJustReleased && !slot.isLaserAiming) {
          slot.hasMovedAimStick = false;
          slot.aimMovedWhileInRange = false;
        }
      }

      // Button 5 (RB / R1): Holding enters Trajectory Scaler Mode
      const isRbPressed = isButtonPressed(5);
      const canModulateTrajectory = isHolding && Boolean(char.throwModule && char.throwModule.enabled) &&
        (!char.isPrimaryAbilityNonDirectional() || slot.isAltHeld);

      if (isRbPressed && canModulateTrajectory) {
        if (!slot.isLockHeld) {
          slot.lockedAimPos = { x: slot.aimPos.x, y: slot.aimPos.y };
          slot.isLockHeld = true;
          slot.arcModulationDeltaY = 0;
          slot.hasMovedAimStick = true;
          slot.aimMovedWhileInRange = true;
        }

        // Freeze cursor at lockedAimPos while RB is held
        if (slot.lockedAimPos) {
          slot.aimPos.x = slot.lockedAimPos.x;
          slot.aimPos.y = slot.lockedAimPos.y;
        }

        // Directional input from right joystick does NOT move cursor, but vertical deflection scales trajectory height
        if (Math.abs(ry) > deadzone) {
          const modulationSpeed = 450.0; // pixels per second on the rail
          slot.arcModulationDeltaY = (slot.arcModulationDeltaY ?? 0) + ry * modulationSpeed * dt;
          slot.hasMovedAimStick = true;
          slot.aimMovedWhileInRange = true;
        }
      } else {
        if (slot.isLockHeld) {
          slot.lockedAimPos = null;
          slot.isLockHeld = false;
          slot.arcModulationCursor = null;
          slot.arcModulationDeltaY = 0;
        }
      }


      if (slot.isLaserAiming) {
        // Read analog trigger float values (0.0 to 1.0)
        // Primary trigger is Right Trigger (RT, Button 7); also check Left Trigger (LT, Button 6)
        const rtFloat = getButtonValue(7);
        const ltFloat = getButtonValue(6);
        const triggerDepth = Math.max(rtFloat, ltFloat);

        if (triggerDepth > 0.03) {
          slot.isLaserFiring = true;
          slot.laserTriggerValue = triggerDepth;
        } else {
          slot.isLaserFiring = false;
          slot.laserTriggerValue = 0;
        }

        // Orient character towards laser aim target while in laser mode (only if aim stick manually moved)
        if (slot.hasMovedAimStick) {
          const aimDx = slot.aimPos.x - char.position.x;
          const aimDy = slot.aimPos.y - char.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            char.facingAngle = Math.atan2(aimDy, aimDx);
          }
        }
      } else {
        slot.isLaserFiring = false;
        slot.laserTriggerValue = 0;
      }

      if (rMag > deadzone && !slot.isLockHeld) {
        // Move aim cursor if aiming is enabled: throwing mode (LT held or throwable held), laser mode (LB held), or selecting nearby grabbable objects
        const canAim = slot.isLaserAiming || (isHolding && (!char.isPrimaryAbilityNonDirectional() || slot.isAltHeld)) || (!isHolding && hasReachable);
        if (canAim) {
          const cursorSpeed = 17.0;
          if (!isHolding && hasReachable && !slot.aimMovedWhileInRange) {
            // Starting to aim around grabbables: start directly at the character!
            slot.aimPos.x = char.position.x;
            slot.aimPos.y = char.position.y;
            slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
            slot.aimOffset.x = 0;
            slot.aimOffset.y = 0;
          }
          slot.hasMovedAimStick = true;
          slot.aimPos.x += rx * cursorSpeed * dt;
          slot.aimPos.y += ry * cursorSpeed * dt;
          slot.lastAimMoveTime = performance.now();
          slot.aimMovedWhileInRange = true;

          const aimDx = slot.aimPos.x - char.position.x;
          const aimDy = slot.aimPos.y - char.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            const angle = Math.atan2(aimDy, aimDx);
            slot.lastThrowAimAngle = angle;
            char.lastThrowAimAngle = angle;
          }
        }
      }

      if (isHolding && (!char.isPrimaryAbilityNonDirectional() || slot.isAltHeld)) {
        if (slot.hasMovedAimStick) {
          const aimDx = slot.aimPos.x - char.position.x;
          const aimDy = slot.aimPos.y - char.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            const angle = Math.atan2(aimDy, aimDx);
            slot.lastThrowAimAngle = angle;
            char.lastThrowAimAngle = angle;
          }
        }
      }

      if (slot.hasMovedAimStick) {
        const clampedX = Math.max(0.1, Math.min(arena.width - 0.1, slot.aimPos.x));
        const clampedY = Math.max(0.1, Math.min(arena.height - 0.1, slot.aimPos.y));
        slot.aimPos.x = clampedX;
        slot.aimPos.y = clampedY;
        slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
        slot.aimOffset.x = clampedX - char.position.x;
        slot.aimOffset.y = clampedY - char.position.y;
      }

      // Button 0 (A on Xbox / Cross on PS) or Right Under-Paddle (Button 18/20/11/3): Jump (and Climbing / Dismounting if climb module attached)
      slot.isClimbHeld = rightPaddleCurrent || Boolean(slot.isJumpRequested);
      if (rightPaddleJustPressed) {
        slot.isJumpRequested = true;
        char.jump(arena, slot.movementVector);
      }

      // Button 4 (LB / L1), Button 10 (L3), or Left Under-Paddle: Sprint
      // Supports BOTH Hold-to-Sprint AND Tap-to-Sprint seamlessly!
      const isStickMoving = lMag > deadzone;

      if (leftPaddleJustPressed) {
        slot.leftPaddlePressTime = performance.now();
        // If already sprinting and moving, tapping it again toggles sprint off. Otherwise activate sprint!
        if (char.isSprinting && isStickMoving) {
          slot.sprintArmed = false;
          char.setSprinting(false);
        } else {
          slot.sprintArmed = true;
          char.setSprinting(true);
        }
      } else if (leftPaddleCurrent) {
        // Actively holding paddle down guarantees sprinting
        slot.sprintArmed = true;
        char.setSprinting(true);
      } else if (leftPaddleJustReleased) {
        const pressDuration = performance.now() - (slot.leftPaddlePressTime ?? 0);
        if (pressDuration > 220) {
          // Dedicated hold-to-sprint: releasing the paddle immediately returns to normal walk speed
          slot.sprintArmed = false;
          char.setSprinting(false);
        }
        // If it was a quick tap (< 220ms), slot.sprintArmed remains true so player continues sprinting while moving stick!
      }

      if (isStickMoving) {
        if (slot.sprintArmed || leftPaddleCurrent) {
          char.setSprinting(true);
        }
      } else {
        // Left stick is in neutral deadzone: disarm sprint when motion stops (unless paddle is actively held)
        if (slot.wasMoving && !leftPaddleCurrent) {
          slot.sprintArmed = false;
          char.setSprinting(false);
        }
      }
      slot.wasMoving = isStickMoving;

      const isCursorVis = (slot.isCursorVisible ?? false) || Boolean(slot.isLaserAiming);
      const aimX = (isCursorVis || isHolding || slot.aimMovedWhileInRange) ? slot.aimPos.x : undefined;
      const aimY = (isCursorVis || isHolding || slot.aimMovedWhileInRange) ? slot.aimPos.y : undefined;

      const onGrabSuccess = () => {
        slot.hasMovedAimStick = false;
        slot.aimMovedWhileInRange = false;
        slot.lastThrowAimAngle = undefined;
        char.lastThrowAimAngle = undefined;
        const moveMag = Math.hypot(slot.movementVector.x, slot.movementVector.y);
        const inputAngle = moveMag > 0.05
          ? Math.atan2(slot.movementVector.y, slot.movementVector.x)
          : (char.facingAngle ?? 0);
        slot.lastMovementInputAngle = inputAngle;
        char.lastMovementInputAngle = inputAngle;
        char.facingAngle = inputAngle;
        const forwardDist = 3.0;
        slot.aimPos.x = char.position.x + Math.cos(inputAngle) * forwardDist;
        slot.aimPos.y = char.position.y + Math.sin(inputAngle) * forwardDist;
        slot.aimOffset = slot.aimOffset || { x: 0, y: 0 };
        slot.aimOffset.x = Math.cos(inputAngle) * forwardDist;
        slot.aimOffset.y = Math.sin(inputAngle) * forwardDist;
      };

      // Button 1 (B on Xbox / Circle on PS): Pickup & Swap
      const bCurrent = isButtonPressed(1);
      const bJustReleased = !bCurrent && isPrevPressed(1);
      if (bJustReleased) {
        slot.bHeld = false;
      }
      if (bCurrent) {
        if (!char.heldObject && char.pickupModule) {
          if (!isPrevPressed(1) || slot.bHeld) {
            char.pickupModule.pickupAndSwap(
              char,
              grabbableTargets,
              arena.wallHeight,
              aimX,
              aimY
            );
            if (char.heldObject) {
              slot.bHeld = false;
              onGrabSuccess();
            } else {
              slot.bHeld = true;
            }
          }
        } else if (char.heldObject) {
          slot.bHeld = false;
          if (!isPrevPressed(1) && char.pickupModule) {
            const swapped = char.pickupModule.pickupAndSwap(
              char,
              grabbableTargets,
              arena.wallHeight,
              aimX,
              aimY
            );
            if (swapped) {
              onGrabSuccess();
            }
          }
        }
      }

      // Button 2 (X on Xbox / Square on PS) or Button 11 (R3): Melee Attack in facing direction
      const xCurrent = isButtonPressed(2) || isButtonPressed(11);
      slot.isMeleeRequested = xCurrent;

      if (xCurrent) {
        // Attack points in character's facing direction
        const mDirX = Math.cos(char.facingAngle ?? 0);
        const mDirY = Math.sin(char.facingAngle ?? 0);
        slot.meleeAimDir = { x: mDirX, y: mDirY };
      } else {
        slot.meleeAimDir = null;
      }

      // Button 3 (Y on Xbox / Triangle on PS): Dedicated Drop item
      const yCurrent = isButtonPressed(3);
      if (yCurrent && !isPrevPressed(3) && char.pickupModule) {
        if (char.heldObject) {
          slot.isDropRequested = true;
          char.pickupModule.drop(char);
        }
      }

      // Button 7 (RT / R2): Grab & Throw (suppressed in Laser Mode, where pulling RT fires the laser with analog power)
      if (!slot.isLaserAiming) {
        const rtCurrent = isButtonPressed(7);
        const rtJustReleased = !rtCurrent && isPrevPressed(7);

        if (rtJustReleased) {
          slot.rtGrabbed = false;
          slot.rtHeld = false;
        }

        if (!char.heldObject) {
          if (rtCurrent && char.pickupModule && (!isPrevPressed(7) || slot.rtHeld)) {
            char.pickupModule.pickupAndSwap(
              char,
              grabbableTargets,
              arena.wallHeight,
              aimX,
              aimY
            );
            if (char.heldObject) {
              slot.rtGrabbed = true;
              slot.rtHeld = false;
              onGrabSuccess();
            } else {
              slot.rtHeld = true;
            }
          }
        } else {
          slot.rtHeld = false;

          const isHoldingFood = Boolean(char.heldObject?.consumableModule?.enabled);
          if (isHoldingFood && !slot.isAltHeld) {
            // Food primary action without LT: RT held down continuously eats
            slot.isUsingItem = rtCurrent;
          } else {
            slot.isUsingItem = false;
            // When holding LT (Alt) or holding non-food: RT throws!
            if (!isPrevPressed(7) && rtCurrent && !slot.rtGrabbed && char.throwModule) {
              slot.isThrowRequested = true;
            }
          }
        }
      } else {
        slot.rtGrabbed = false;
        slot.rtHeld = false;
        slot.isUsingItem = false;
      }

      // Record buttons for edge detection
      slot.prevButtons = gp.buttons.map((b) => (typeof b === "object" ? b.pressed || b.value > 0.3 : (b as unknown as number) > 0.3));
    }

    if (this.gamepadConnected !== anyConnected) {
      this.gamepadConnected = anyConnected;
      const firstConnected = Array.from(this.gamepadSlots.values()).find((s) => s.connected);
      this.gamepadName = firstConnected ? firstConnected.id : "";
      this.onGamepadStatusChange?.(anyConnected, this.gamepadName);
    }
  }

  /**
   * Backward-compatible singleplayer gamepad poll adapter
   */
  public pollGamepad(
    character: Character,
    objects: GameObject[],
    arena: Arena
  ): void {
    const singleMap = new Map<string, { character: Character; slotIndex?: number }>();
    singleMap.set("gamepad-0", { character, slotIndex: 0 });
    this.pollGamepadSlots(singleMap, objects, arena);

    const slot0 = this.gamepadSlots.get(0);
    if (slot0 && slot0.connected) {
      this.isGamepadClimbHeld = slot0.isClimbHeld;
      this.isGamepadAiming = true;
      this.isGamepadAimActive = true;
      this.gamepadAimPos.x = slot0.aimPos.x;
      this.gamepadAimPos.y = slot0.aimPos.y;
      if (slot0.aimOffset) {
        this.gamepadAimOffset.x = slot0.aimOffset.x;
        this.gamepadAimOffset.y = slot0.aimOffset.y;
      }
    } else {
      this.isGamepadClimbHeld = false;
      this.isGamepadAiming = false;
      this.isGamepadAimActive = false;
    }
  }

  public handleInteractions(
    character: Character,
    arena: Arena,
    objects: GameObject[],
    devPanel?: DevPanel,
    getAllCharacters?: () => Character[]
  ): void {
    this.devPanel = devPanel;
    this.updateCanvasCursorClass();
    if (devPanel) {
      this.selectedCanvasEntity = devPanel.selectedEntity;
    }

    const findEntityAt = (x: number, y: number, tolerance = 0.35): GameObject | null => {
      const scale = arena.visualAltitudeScale ?? 0.5;
      // Check objects first (so objects on top or near player can be picked)
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const r = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
        // Check physical ground collider position
        const distGround = Math.hypot(obj.position.x - x, obj.position.y - y);
        // Check hovering visual position (if elevated above ground)
        const distHover = Math.hypot(obj.position.x - x, (obj.position.y - obj.position.z * scale) - y);
        const distHover1to1 = Math.hypot(obj.position.x - x, (obj.position.y - obj.position.z) - y);
        if (distGround <= r + tolerance || distHover <= r + tolerance || distHover1to1 <= r + tolerance) {
          return obj;
        }
      }
      // Check all active player characters (Player 1, Player 2, etc.)
      const chars = getAllCharacters ? getAllCharacters() : (character ? [character] : []);
      for (let i = chars.length - 1; i >= 0; i--) {
        const c = chars[i];
        const charR = c.hasCollider ? c.colliderRadius : 0.44;
        const distCharGround = Math.hypot(c.position.x - x, c.position.y - y);
        const distCharHover = Math.hypot(c.position.x - x, (c.position.y - c.position.z * scale) - y);
        const distCharHover1to1 = Math.hypot(c.position.x - x, (c.position.y - c.position.z) - y);
        if (distCharGround <= charR + tolerance || distCharHover <= charR + tolerance || distCharHover1to1 <= charR + tolerance) {
          return c;
        }
      }
      return null;
    };

    const applyWallDraw = (col: number, row: number) => {
      if (col < 0 || col >= arena.cols || row < 0 || row >= arena.rows) return;
      const changed = arena.setWallTile(col, row, true);
      if (changed) {
        const chars = getAllCharacters ? getAllCharacters() : (character ? [character] : []);
        const allEntities = [...chars, ...objects];
        arena.syncEntitiesWithWalls(allEntities);
        arena.currentPresetId = "custom";
        devPanel?.updateWallPresetUI();
      }
    };

    const applyWallErase = (col: number, row: number) => {
      if (col < 0 || col >= arena.cols || row < 0 || row >= arena.rows) return;
      if (arena.tileGrid[row][col] === 1) {
        arena.setWallTile(col, row, false);
        const chars = getAllCharacters ? getAllCharacters() : (character ? [character] : []);
        const allEntities = [...chars, ...objects];
        arena.syncEntitiesWithWalls(allEntities);
        arena.currentPresetId = "custom";
        devPanel?.updateWallPresetUI();
      }
    };

    this.onMouseDown = (x: number, y: number) => {
      if (devPanel?.isEditMode) {
        if (devPanel.editTool === "walls") {
          const col = Math.floor(x / arena.tileSize);
          const row = Math.floor(y / arena.tileSize);
          applyWallDraw(col, row);
          return;
        }

        const found = findEntityAt(x, y, 0.35);
        if (found) {
          this.selectedCanvasEntity = found;
          devPanel.setSelectedEntity(found);
          this.draggedEntity = found;
          this.dragOffset.x = found.position.x - x;
          this.dragOffset.y = found.position.y - y;
          this.canvas.style.cursor = "grabbing";
        } else {
          // Clicked empty ground: deselect in arena (corners go away), but preserve devPanel focus!
          this.selectedCanvasEntity = null;
          this.draggedEntity = null;
        }
      }
    };

    this.onRightMouseDown = (x: number, y: number) => {
      if (devPanel?.isEditMode && devPanel.editTool === "walls") {
        const col = Math.floor(x / arena.tileSize);
        const row = Math.floor(y / arena.tileSize);
        applyWallErase(col, row);
      }
    };

    // Hover & drag tracking in Edit Mode
    this.onMouseMove = (x: number, y: number) => {
      if (arena && arena.tileSize) {
        const col = Math.floor(x / arena.tileSize);
        const row = Math.floor(y / arena.tileSize);
        if (col >= 0 && col < arena.cols && row >= 0 && row < arena.rows) {
          this.hoverWallTile = { col, row };
        } else {
          this.hoverWallTile = null;
        }
      } else {
        this.hoverWallTile = null;
      }

      if (devPanel?.isEditMode) {
        if (devPanel.editTool === "walls") {
          this.hoverEntity = null;
          this.draggedEntity = null;
          this.canvas.style.cursor = "cell";
          if (this.isMouseDown && this.hoverWallTile) {
            applyWallDraw(this.hoverWallTile.col, this.hoverWallTile.row);
          } else if (this.isRightMouseDown && this.hoverWallTile) {
            applyWallErase(this.hoverWallTile.col, this.hoverWallTile.row);
          }
          return;
        }

        if (this.isMouseDown && this.draggedEntity) {
          // Drag object wherever the user moves the mouse
          const targetX = x + this.dragOffset.x;
          const targetY = y + this.dragOffset.y;
          const r = this.draggedEntity.hasCollider ? this.draggedEntity.colliderRadius : (this.draggedEntity.colliderModule?.radius ?? 0.32);
          this.draggedEntity.position.x = Math.max(r, Math.min(arena.width - r, targetX));
          this.draggedEntity.position.y = Math.max(r, Math.min(arena.height - r, targetY));

          // Zero out velocities so object stays put where dragged
          this.draggedEntity.velocity.x = 0;
          this.draggedEntity.velocity.y = 0;
          this.draggedEntity.verticalVelocity = 0;
          if (this.draggedEntity.rollModule) {
            this.draggedEntity.rollModule.angularVelocity.x = 0;
            this.draggedEntity.rollModule.angularVelocity.y = 0;
            this.draggedEntity.rollModule.angularVelocity.z = 0;
          }
          this.canvas.style.cursor = "grabbing";
        } else {
          const found = findEntityAt(x, y, 0.3);
          this.hoverEntity = found;
          this.canvas.style.cursor = found ? "grab" : "crosshair";
        }
      } else {
        this.hoverEntity = null;
        this.draggedEntity = null;
        this.canvas.style.cursor = "crosshair";
      }
    };

    this.onMouseUp = (_x: number, _y: number) => {
      if (this.draggedEntity) {
        arena.syncEntitiesWithWalls([this.draggedEntity]);
        this.draggedEntity = null;
      }
      if (devPanel?.isEditMode) {
        if (devPanel.editTool === "walls") {
          this.canvas.style.cursor = "cell";
        } else {
          const found = findEntityAt(this.mousePos.x, this.mousePos.y, 0.3);
          this.hoverEntity = found;
          this.canvas.style.cursor = found ? "grab" : "crosshair";
        }
      }
    };

    const getActiveKeyboardChar = (): Character | null => {
      if (getAllCharacters) {
        const chars = getAllCharacters();
        // Priority 1: explicitly marked with playerId === "keyboard"
        const kbChar = chars.find((c) => c.playerId === "keyboard");
        if (kbChar) return kbChar;
        // Priority 2: local character not assigned to a gamepad or marked as remote
        const localChar = chars.find((c) => !c.playerId?.startsWith("gamepad") && !c.playerId?.startsWith("remote"));
        if (localChar) return localChar;
        if (chars.length > 0) return chars[0];
      }
      return character;
    };

    this.onLaserWheelAdjust = (delta: number) => {
      const activeChar = getActiveKeyboardChar();
      if (activeChar && activeChar.laserModule) {
        activeChar.laserModule.adjustDamageRate(delta, activeChar.properties);
      }
    };

    this.handleClick = (clickX: number, clickY: number, e?: MouseEvent) => {
      const isCtrl = e?.ctrlKey || this.isKeyPressed("ControlLeft") || this.isKeyPressed("ControlRight");
      if (devPanel?.isEditMode) {
        if (isCtrl) {
          const found = findEntityAt(clickX, clickY, 0.4);
          if (found) {
            this.selectedCanvasEntity = found;
            devPanel.setSelectedEntity(found);
          }
        }
        return;
      }

      // In Play Mode, holding Control is for Laser Blast (firing/aiming) - do NOT select entity, grab, or throw!
      if (isCtrl) {
        return;
      }

      if (devPanel?.isEditMode) {
        // Handled in onMouseDown/onMouseMove
        return;
      }

      if (!this.isKeyboardActive) return;
      const activeChar = getActiveKeyboardChar();
      if (!activeChar) return;

      // Play Mode:
      // 1. If holding an object:
      if (activeChar.heldObject) {
        this.justPickedUp = false;
        // If holding an item with an inherent primary ability (e.g. food consumable):
        // Default ability is triggered by Left Mouse.
        // Holding Alt switches to the alternative ability (Throw) until released.
        const hasPrimaryAbility = activeChar.hasPrimaryItemAbility?.() ?? Boolean(activeChar.heldObject.consumableModule?.enabled);
        if (hasPrimaryAbility && !this.isAltHeld) {
          // Primary ability is triggered continuously while LMB is down in capturePlayerInputs
          return;
        }

        // Execute Throw if Alt is held OR if the object has no other primary ability:
        if (activeChar.throwModule) {
          this.isKeyboardThrowRequested = true;
          this.isThrowingPress = true; // This click was used to throw; cannot immediately grab until released
          return;
        }
      }

      // 2. If NOT holding an object: attempt pickup
      if (!activeChar.heldObject && activeChar.pickupModule) {
        const grabbableTargets = getAllCharacters
          ? [...getAllCharacters().filter((c) => c !== activeChar), ...objects]
          : objects;
        const aimX = clickX;
        const aimY = clickY;
        const target = activeChar.pickupModule.findTargetObject(activeChar, aimX, aimY, grabbableTargets, arena.wallHeight);
        if (target && target.spawnerModule && target.spawnerModule.enabled) {
          const clone = target.spawnerModule.triggerClone(target, arena, objects);
          if (clone) {
            const pickedUp = activeChar.pickupModule.pickup(activeChar, clone);
            if (!pickedUp) {
              const idx = objects.indexOf(clone);
              if (idx !== -1) objects.splice(idx, 1);
            } else {
              this.justPickedUp = true;
            }
          }
        } else if (activeChar.pickupModule.pickupAndSwap(activeChar, grabbableTargets, arena.wallHeight, aimX, aimY)) {
          this.justPickedUp = true;
        }
      }
    };

    // Right click is reserved for item throw lock (and wall erasing in edit mode)
    this.onRightClick = (_clickX: number, _clickY: number) => {
      // Intentionally empty: selection is now Ctrl + Left Click so Right Click does not accidentally change selection
    };

    this.onKeyboardDrop = () => {
      if (!this.isKeyboardActive) return;
      const activeChar = getActiveKeyboardChar();
      if (!activeChar || !activeChar.pickupModule) return;
      if (activeChar.heldObject) {
        this.isKeyboardDropRequested = true;
        activeChar.pickupModule.drop(activeChar);
      }
    };

    this.onKeyboardPickup = () => {
      if (!this.isKeyboardActive) return;
      const activeChar = getActiveKeyboardChar();
      if (!activeChar || !activeChar.pickupModule) return;
      const grabbableTargets = getAllCharacters
        ? [...getAllCharacters().filter((c) => c !== activeChar), ...objects]
        : objects;
      const aimX = this.actualMousePos.x;
      const aimY = this.actualMousePos.y;
      const target = activeChar.pickupModule.findTargetObject(activeChar, aimX, aimY, grabbableTargets, arena.wallHeight);
      if (target && target.spawnerModule && target.spawnerModule.enabled) {
        const clone = target.spawnerModule.triggerClone(target, arena, objects);
        if (clone) {
          const pickedUp = activeChar.pickupModule.pickup(activeChar, clone);
          if (!pickedUp) {
            const idx = objects.indexOf(clone);
            if (idx !== -1) objects.splice(idx, 1);
          }
        }
      } else {
        activeChar.pickupModule.pickupAndSwap(activeChar, grabbableTargets, arena.wallHeight, aimX, aimY);
      }
    };

    this.onDropAttempt = this.onKeyboardPickup;
  }
}
