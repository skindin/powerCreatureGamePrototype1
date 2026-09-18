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
        };
        this.gamepadSlots.set(i, slot);
      } else {
        slot.connected = true;
        slot.id = gp.id;
      }

      const isButtonPressed = (btnIndex: number): boolean => {
        const b = gp.buttons[btnIndex];
        if (!b) return false;
        return typeof b === "object" ? b.pressed || b.value > 0.3 : (b as unknown as number) > 0.3;
      };

      const isPrevPressed = (btnIndex: number): boolean => slot.prevButtons[btnIndex] === true;

      // Check if this controller currently has an active character in arena
      const playerEntry = playersMap.get(`gamepad-${i}`);
      const char = playerEntry ? playerEntry.character : null;
      slot.isActive = char !== null;

      // 1. Controller is connected but its character is NOT currently in the arena:
      // Pressing A (Xbox button 0 / Cross) adds their character back in!
      if (!slot.isActive || !char) {
        const btn0Current = isButtonPressed(0);
        const btn0JustPressed = btn0Current && !isPrevPressed(0);
        if (btn0JustPressed) {
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
      // Preserves where the cursor is in relation to the character
      const visualPos = getVisualPosition
        ? getVisualPosition(char)
        : { x: char.position.x, y: char.position.y };

      if (!slot.aimOffset) {
        slot.aimOffset = { x: 0, y: 0 };
      }
      if (!slot.aimPos) {
        slot.aimPos = { x: 0, y: 0 };
      }

      if (!slot.aimOffsetInitialized) {
        const dir = char.facingAngle ?? 0;
        slot.aimOffset = {
          x: Math.cos(dir) * 3.5,
          y: Math.sin(dir) * 3.5,
        };
        slot.aimOffsetInitialized = true;
      }

      if (rMag > deadzone) {
        const cursorSpeed = 17.0;
        slot.aimOffset.x += rx * cursorSpeed * dt;
        slot.aimOffset.y += ry * cursorSpeed * dt;
        slot.lastAimMoveTime = performance.now();
        slot.aimMovedWhileInRange = true;
      }

      slot.aimPos.x = visualPos.x + slot.aimOffset.x;
      slot.aimPos.y = visualPos.y + slot.aimOffset.y;

      const clampedX = Math.max(0.1, Math.min(arena.width - 0.1, slot.aimPos.x));
      const clampedY = Math.max(0.1, Math.min(arena.height - 0.1, slot.aimPos.y));
      slot.aimPos.x = clampedX;
      slot.aimPos.y = clampedY;
      slot.aimOffset.x = clampedX - visualPos.x;
      slot.aimOffset.y = clampedY - visualPos.y;

      // Button 6 (LT / L2): Auto-lock aiming
      slot.isLockHeld = isButtonPressed(6);

      // Button 0 (A on Xbox / Cross on PS): Jump (and Climbing / Dismounting if climb module attached)
      const btn0Current = isButtonPressed(0);
      slot.isClimbHeld = btn0Current;
      if (btn0Current && !isPrevPressed(0)) {
        char.jump(arena, slot.movementVector);
      }

      // Button 4 (LB / L1) or Button 10 (L3 / Left Stick Click): Sprint
      const lbCurrent = isButtonPressed(4) || isButtonPressed(10);
      const lbJustPressed = lbCurrent && !(isPrevPressed(4) || isPrevPressed(10));
      const isStickMoving = lMag > deadzone;

      if (lbJustPressed) {
        slot.sprintArmed = !slot.sprintArmed;
        char.setSprinting(slot.sprintArmed);
      }

      if (lbCurrent) {
        slot.sprintArmed = true;
        char.setSprinting(true);
      }

      if (isStickMoving) {
        if (slot.sprintArmed) {
          char.setSprinting(true);
        }
      } else {
        // Left stick is in neutral deadzone
        if (slot.wasMoving && !lbCurrent) {
          // Stick was released after moving, and LB/L3 is not being held
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
        const isLockHeld = isButtonPressed(6);
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
