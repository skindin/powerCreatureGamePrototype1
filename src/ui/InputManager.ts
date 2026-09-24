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
  leftPaddlePressTime?: number;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private arena: Arena;
  private keysPressed: Set<string> = new Set();
  private isEKeyDepressed = false;
  public isKeyboardSprintActive = false;
  
  // Keyboard player active state (true when keyboard & mouse character is in arena)
  public isKeyboardActive = true;

  public mousePos: Vector2D = { x: 0, y: 0 };
  public actualMousePos: Vector2D = { x: 0, y: 0 };
  public lastMouseMoveTime = 0;
  public isCursorVisible = false;
  public isMouseDown = false;
  public isRightMouseDown = false;
  public hoverWallTile: { col: number; row: number } | null = null;
  public movementVector: Vector2D = { x: 0, y: 0 };
  public justPickedUp = false;

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
  public gamepadAimOffset: Vector2D = { x: 3.5, y: 0 };

  public get isGrabHeld(): boolean {
    return this.isKeyboardActive && !this.isThrowingPress && this.isMouseDown;
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
    return this.isKeyboardActive && !this.isTextInputFocused() && this.keysPressed.has("Space");
  }

  public get isClimbHeld(): boolean {
    return this.isKeyboardJumpHeld || this.isGamepadClimbHeld;
  }

  // Selection & dragging state
  public hoverEntity: GameObject | null = null;
  public selectedCanvasEntity: GameObject | null = null;
  public draggedEntity: GameObject | null = null;
  public dragOffset: Vector2D = { x: 0, y: 0 };

  // Action callback hooks
  public handleClick?: (clickX: number, clickY: number) => void;
  public onMouseDown?: (clickX: number, clickY: number) => void;
  public onRightMouseDown?: (clickX: number, clickY: number) => void;
  public onMouseUp?: (clickX: number, clickY: number) => void;
  public onRightClick?: (clickX: number, clickY: number) => void;
  public onDropAttempt?: () => void;
  public onMouseMove?: (x: number, y: number) => void;
  public onToggleSprint?: (active?: boolean) => void;
  public onStopKeyboardSprint?: () => void;
  public onGamepadStatusChange?: (connected: boolean, name: string) => void;
  public onKeyboardJoin?: () => void;
  public onKeyboardJump?: () => void;
  public onGamepadJoin?: (slotIndex: number) => void;
  public onGamepadDisconnected?: (slotIndex: number) => void;

  constructor(canvas: HTMLCanvasElement, arena: Arena) {
    this.canvas = canvas;
    this.arena = arena;
    this.mousePos = { x: arena.width / 2, y: arena.height / 2 };
    this.actualMousePos = { x: arena.width / 2, y: arena.height / 2 };
    this.setupListeners();
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

    window.addEventListener("keydown", (e) => {
      // If user is focused on or typing into ANY text box or form input,
      // allow default browser behavior (typing characters, spaces, backspaces)
      // and do NOT hijack input or trigger game actions!
      if (this.isTextInputFocused() || this.isTargetTextInput(e.target)) {
        return;
      }

      // Space key: Claim Keyboard Player 1 if not yet active, otherwise trigger jump
      if (e.code === "Space") {
        if (!this.isKeyboardActive) {
          this.onKeyboardJoin?.();
          return;
        } else if (!e.repeat) {
          this.onKeyboardJump?.();
        }
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

      if (e.code === "KeyE") {
        // Must release E key first before pressing it again to pick up or drop
        if (e.repeat || this.isEKeyDepressed) return;
        this.isEKeyDepressed = true;

        if (this.onDropAttempt) {
          this.onDropAttempt();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (this.isTextInputFocused() || this.isTargetTextInput(e.target)) {
        this.keysPressed.delete(e.code);
        return;
      }

      this.keysPressed.delete(e.code);
      this.updateMovementVector();

      if (e.code === "KeyE") {
        this.isEKeyDepressed = false;
      }

      // Automatically turn off sprint when all movement keys are released!
      if (!this.hasAnyMovementKeyPressed()) {
        this.isKeyboardSprintActive = false;
        this.onStopKeyboardSprint?.();
      }
    });

    window.addEventListener("blur", () => {
      this.isEKeyDepressed = false;
      this.keysPressed.clear();
      this.isKeyboardSprintActive = false;
      this.onStopKeyboardSprint?.();
      this.updateMovementVector();
    });

    // Track mouse position globally so the aim cursor NEVER goes stale when the
    // mouse drifts outside the canvas bounds (e.g. header bar, inspector sidebar).
    window.addEventListener("mousemove", (e) => {
      this.lastMouseMoveTime = performance.now();
      this.updateMousePos(e);
      if (this.onMouseMove) {
        this.onMouseMove(this.mousePos.x, this.mousePos.y);
      }
    });

    this.canvas.addEventListener("mousedown", (e) => {
      this.activeInputDevice = "keyboard";
      this.lastMouseMoveTime = performance.now();
      this.updateMousePos(e);
      if (e.button === 2) {
        this.isRightMouseDown = true;
        if (this.onRightMouseDown) {
          this.onRightMouseDown(this.mousePos.x, this.mousePos.y);
        }
        return;
      }
      if (e.button !== 0) return; // Only primary left click
      this.isMouseDown = true;

      if (this.onMouseDown) {
        this.onMouseDown(this.mousePos.x, this.mousePos.y);
      }

      if (this.handleClick) {
        this.handleClick(this.mousePos.x, this.mousePos.y);
      }
    });

    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault(); // Prevent browser context menu
      this.updateMousePos(e);
      if (this.onRightClick) {
        this.onRightClick(this.mousePos.x, this.mousePos.y);
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
        return;
      }
      if (e.button !== 0) return;
      this.isMouseDown = false;
      this.justPickedUp = false;
      this.isThrowingPress = false;
      if (this.onMouseUp) {
        this.onMouseUp(this.mousePos.x, this.mousePos.y);
      }
    });

    // Touch support for mobile / touchscreens
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
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

  private updateMousePos(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = Math.max(0, Math.min(this.arena.width, (e.clientX - rect.left) * (this.arena.width / rect.width)));
    const my = Math.max(0, Math.min(this.arena.height, (e.clientY - rect.top) * (this.arena.height / rect.height)));
    this.actualMousePos.x = mx;
    this.actualMousePos.y = my;
    this.mousePos.x = mx;
    this.mousePos.y = my;
  }

  private updateTouchPos(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = Math.max(0, Math.min(this.arena.width, (touch.clientX - rect.left) * (this.arena.width / rect.width)));
    const my = Math.max(0, Math.min(this.arena.height, (touch.clientY - rect.top) * (this.arena.height / rect.height)));
    this.actualMousePos.x = mx;
    this.actualMousePos.y = my;
    this.mousePos.x = mx;
    this.mousePos.y = my;
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
    getVisualPosition?: (entity: GameObject) => Vector2D
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
          aimOffset: { x: 3.5, y: 0 },
          leftPaddlePressTime: 0,
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

      // Check extra axes for paddles if available (e.g. axes[4], axes[6])
      let axisLeftPaddle = false;
      let axisRightPaddle = false;
      if (gp.axes && gp.axes.length > 4) {
        if (gp.axes.length > 5 && Math.abs(gp.axes[4]) > 0.5) {
          if (gp.axes[4] < -0.5) axisLeftPaddle = true;
          else if (gp.axes[4] > 0.5) axisRightPaddle = true;
        }
      }

      // Left Under-Paddle (M2) / Sprint buttons:
      // LB (4), L3 (10), X (2), Select/Back (8), D-pad Left (14), D-pad Down (13), D-pad Up (12), plus extended M2 paddles & axes
      const leftPaddleButtonIndices = [4, 10, 2, 8, 14, 13, 12];
      const leftPaddleCurrent = isAnyButtonPressed(leftPaddleButtonIndices) || extendedLeftPaddle || axisLeftPaddle;
      const leftPaddlePrev = isAnyButtonPrevPressed(leftPaddleButtonIndices) || extendedPrevLeftPaddle;
      const leftPaddleJustPressed = leftPaddleCurrent && !leftPaddlePrev;
      const leftPaddleJustReleased = !leftPaddleCurrent && leftPaddlePrev;

      // Right Under-Paddle (M1) / Jump & Climb buttons:
      // A (0), Y (3), Menu/Start (9), D-pad Right (15), plus extended M1 paddles & axes
      // NOTE: Button 11 (R3 / right stick click) is explicitly EXCLUDED so clicking the right joystick never triggers climb/jump!
      const rightPaddleButtonIndices = [0, 3, 9, 15];
      const rightPaddleCurrent = isAnyButtonPressed(rightPaddleButtonIndices) || extendedRightPaddle || axisRightPaddle;
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
      } else {
        slot.movementVector.x = 0;
        slot.movementVector.y = 0;
      }

      // Right Joystick for absolute arena aim reticle:
      // Operates like a free-floating mouse cursor in world coordinates (unleashed from character)
      const visualPos = getVisualPosition
        ? getVisualPosition(char)
        : { x: char.position.x, y: char.position.y };

      if (!slot.aimOffset) {
        slot.aimOffset = { x: 0, y: 0 };
      }
      if (!slot.aimPos) {
        slot.aimPos = { x: visualPos.x, y: visualPos.y };
      }

      if (!slot.aimOffsetInitialized) {
        const dir = char.facingAngle ?? 0;
        slot.aimPos = {
          x: visualPos.x + Math.cos(dir) * 3.5,
          y: visualPos.y + Math.sin(dir) * 3.5,
        };
        slot.aimOffset = {
          x: slot.aimPos.x - visualPos.x,
          y: slot.aimPos.y - visualPos.y,
        };
        slot.aimOffsetInitialized = true;
      }

      if (rMag > deadzone) {
        const cursorSpeed = 17.0;
        slot.aimPos.x += rx * cursorSpeed * dt;
        slot.aimPos.y += ry * cursorSpeed * dt;
        slot.lastAimMoveTime = performance.now();
        slot.aimMovedWhileInRange = true;
      }

      const clampedX = Math.max(0.1, Math.min(arena.width - 0.1, slot.aimPos.x));
      const clampedY = Math.max(0.1, Math.min(arena.height - 0.1, slot.aimPos.y));
      slot.aimPos.x = clampedX;
      slot.aimPos.y = clampedY;
      slot.aimOffset.x = clampedX - visualPos.x;
      slot.aimOffset.y = clampedY - visualPos.y;

      // Button 6 (LT / L2): Auto-lock aiming
      // Strictly check Button 6 (LT trigger). Never check raw axes which can rest non-zero on mobile/unmapped pads!
      const isLtPressed = isButtonPressed(6, 0.35);
      slot.isLockHeld = isLtPressed;

      // Button 0 (A on Xbox / Cross on PS) or Right Under-Paddle (Button 18/20/11/3): Jump (and Climbing / Dismounting if climb module attached)
      slot.isClimbHeld = rightPaddleCurrent;
      if (rightPaddleJustPressed) {
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

      // Grabbable target candidates include freebody objects and other characters
      const grabbableTargets = allCharacters
        ? [...allCharacters.filter((c) => c !== char), ...objects]
        : objects;

      const isCursorVis = slot.isCursorVisible ?? false;
      const aimX = isCursorVis ? slot.aimPos.x : undefined;
      const aimY = isCursorVis ? slot.aimPos.y : undefined;

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
            if (!char.heldObject) {
              slot.bHeld = true;
            } else {
              slot.bHeld = false;
            }
          }
        } else if (char.heldObject) {
          slot.bHeld = false;
          if (!isPrevPressed(1) && char.pickupModule) {
            char.pickupModule.pickupAndSwap(
              char,
              grabbableTargets,
              arena.wallHeight,
              aimX,
              aimY
            );
          }
        }
      }

      // Button 7 (RT / R2) & Button 5 (RB / R1): Grab & Throw
      const rbCurrent = isButtonPressed(5);
      const rbJustPressed = rbCurrent && !isPrevPressed(5);
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
          } else {
            slot.rtHeld = true;
          }
        }
      } else {
        slot.rtHeld = false;
        const isLockHeld = isButtonPressed(6, 0.35);
        if (!isPrevPressed(7) && rtCurrent && !slot.rtGrabbed && char.throwModule) {
          char.throwModule.throwHeldObject(
            char, slot.aimPos.x, slot.aimPos.y, arena, undefined, undefined, isLockHeld
          );
        }
        if (rbJustPressed && char.throwModule) {
          char.throwModule.throwHeldObject(
            char, slot.aimPos.x, slot.aimPos.y, arena, undefined, undefined, isLockHeld
          );
        }
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
        this.canvas.style.cursor = "default";
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

    this.handleClick = (clickX: number, clickY: number) => {
      if (devPanel?.isEditMode) {
        // Handled in onMouseDown/onMouseMove
        return;
      }

      if (!this.isKeyboardActive) return;
      const activeChar = (getAllCharacters ? getAllCharacters().find((c) => c.playerId === "keyboard") : null);
      if (!activeChar) return;

      // Play Mode:
      // 1. If holding an object and ready to throw (and not the same click as pickup):
      if (activeChar.heldObject && activeChar.throwModule && !this.justPickedUp) {
        const autoLock = this.isRightMouseDown;
        activeChar.throwModule.throwHeldObject(activeChar, clickX, clickY, arena, undefined, undefined, autoLock);
        this.isThrowingPress = true; // This click was used to throw; cannot immediately grab until released
        return;
      }

      // 2. If NOT holding an object: attempt pickup
      if (!activeChar.heldObject && activeChar.pickupModule) {
        const grabbableTargets = getAllCharacters
          ? [...getAllCharacters().filter((c) => c !== activeChar), ...objects]
          : objects;
        const isCursorVis = this.isCursorVisible;
        const aimX = isCursorVis ? clickX : undefined;
        const aimY = isCursorVis ? clickY : undefined;
        if (activeChar.pickupModule.pickupAndSwap(activeChar, grabbableTargets, arena.wallHeight, aimX, aimY)) {
          this.justPickedUp = true;
        }
      }
    };

    // Right click selects any entity in the Dev Panel (works in both Play & Edit modes, except Wall Tool)
    this.onRightClick = (clickX: number, clickY: number) => {
      if (devPanel?.isEditMode && devPanel.editTool === "walls") {
        return; // Wall erasing is handled via onRightMouseDown & drag
      }
      if (!devPanel) return;
      const found = findEntityAt(clickX, clickY, 0.4);
      if (found) {
        this.selectedCanvasEntity = found;
        devPanel.setSelectedEntity(found);
      }
      // If clicked empty space, keep the last focused entity in devPanel!
    };

    this.onDropAttempt = () => {
      if (!this.isKeyboardActive) return;
      const activeChar = (getAllCharacters ? getAllCharacters().find((c) => c.playerId === "keyboard") : null);
      if (!activeChar) return;
      if (activeChar.heldObject && activeChar.pickupModule) {
        activeChar.pickupModule.drop(activeChar);
      } else if (!activeChar.heldObject && activeChar.pickupModule) {
        const grabbableTargets = getAllCharacters
          ? [...getAllCharacters().filter((c) => c !== activeChar), ...objects]
          : objects;
        const isCursorVis = this.isCursorVisible;
        const aimX = isCursorVis ? (this.gamepadConnected ? this.gamepadAimPos.x : this.mousePos.x) : undefined;
        const aimY = isCursorVis ? (this.gamepadConnected ? this.gamepadAimPos.y : this.mousePos.y) : undefined;
        activeChar.pickupModule.pickupAndSwap(activeChar, grabbableTargets, arena.wallHeight, aimX, aimY);
      }
    };
  }
}
