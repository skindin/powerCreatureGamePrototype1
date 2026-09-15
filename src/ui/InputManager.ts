import { Vector2D } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import type { DevPanel } from "./DevPanel.js";

export class InputManager {
  private canvas: HTMLCanvasElement;
  private arena: Arena;
  private keysPressed: Set<string> = new Set();
  private isEKeyDepressed = false;
  
  public mousePos: Vector2D = { x: 0, y: 0 };
  public isMouseDown = false;
  public isRightMouseDown = false;
  public hoverWallTile: { col: number; row: number } | null = null;
  public movementVector: Vector2D = { x: 0, y: 0 };
  public justPickedUp = false;

  public isThrowingPress = false;

  // Gamepad controller state
  public gamepadConnected = false;
  public gamepadName = "";
  public isGamepadClimbHeld = false;
  public isGamepadAiming = false;
  public isGamepadAimActive = false;
  public activeInputDevice: "keyboard" | "gamepad" = "keyboard";
  public gamepadAimPos: Vector2D = { x: 0, y: 0 };
  public gamepadAimOffset: Vector2D = { x: 3.5, y: 0 };
  private isGamepadAimOffsetInitialized = false;
  private prevButtons: boolean[] = [];
  private rtGrabbed = false; // true when the current held object was grabbed via RT — must release RT before RT can throw
  private rtHeld = false;    // true when RT is held down while empty-handed waiting for a target to enter range
  private bHeld = false;     // true when B is held down while empty-handed waiting for a target to enter range

  public get isGrabHeld(): boolean {
    return !this.isThrowingPress && this.isMouseDown;
  }

  public get isUsingGamepad(): boolean {
    return this.gamepadConnected && this.activeInputDevice === "gamepad";
  }

  public get isClimbHeld(): boolean {
    return this.keysPressed.has("Space") || this.isGamepadClimbHeld;
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
  public onToggleSprint?: () => void;
  public onGamepadStatusChange?: (connected: boolean, name: string) => void;

  constructor(canvas: HTMLCanvasElement, arena: Arena) {
    this.canvas = canvas;
    this.arena = arena;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener("keydown", (e) => {
      this.activeInputDevice = "keyboard";
      this.keysPressed.add(e.code);
      this.updateMovementVector();

      // Shift + WASD sprint toggle
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (!e.repeat && this.onToggleSprint) {
          this.onToggleSprint();
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
      this.keysPressed.delete(e.code);
      this.updateMovementVector();

      if (e.code === "KeyE") {
        this.isEKeyDepressed = false;
      }
    });

    window.addEventListener("blur", () => {
      this.isEKeyDepressed = false;
      this.keysPressed.clear();
      this.updateMovementVector();
    });

    // Track mouse position globally so the aim cursor NEVER goes stale when the
    // mouse drifts outside the canvas bounds (e.g. header bar, inspector sidebar).
    window.addEventListener("mousemove", (e) => {
      this.updateMousePos(e);
      if (this.onMouseMove) {
        this.onMouseMove(this.mousePos.x, this.mousePos.y);
      }
    });

    this.canvas.addEventListener("mousedown", (e) => {
      this.activeInputDevice = "keyboard";
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
    this.mousePos.x = Math.max(0, Math.min(this.arena.width, (e.clientX - rect.left) * (this.arena.width / rect.width)));
    this.mousePos.y = Math.max(0, Math.min(this.arena.height, (e.clientY - rect.top) * (this.arena.height / rect.height)));
  }

  private updateTouchPos(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = Math.max(0, Math.min(this.arena.width, (touch.clientX - rect.left) * (this.arena.width / rect.width)));
    this.mousePos.y = Math.max(0, Math.min(this.arena.height, (touch.clientY - rect.top) * (this.arena.height / rect.height)));
  }

  private updateMovementVector(): void {
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

  public pollGamepad(
    character: Character,
    objects: GameObject[],
    arena: Arena
  ): void {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    let gp: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i]!.connected) {
        gp = gamepads[i];
        break;
      }
    }

    if (!gp) {
      if (this.gamepadConnected) {
        this.gamepadConnected = false;
        this.gamepadName = "";
        this.isGamepadClimbHeld = false;
        this.isGamepadAiming = false;
        this.isGamepadAimActive = false;
        this.onGamepadStatusChange?.(false, "");
      }
      return;
    }

    if (!this.gamepadConnected) {
      this.gamepadConnected = true;
      this.gamepadName = gp.id;
      this.onGamepadStatusChange?.(true, gp.id);
    }

    // 1. Left Joystick for movement (axes 0, 1)
    const deadzone = 0.18;
    const lx = gp.axes[0] ?? 0;
    const ly = gp.axes[1] ?? 0;
    const rx = gp.axes[2] ?? 0;
    const ry = gp.axes[3] ?? 0;
    const lMag = Math.hypot(lx, ly);
    const rMag = Math.hypot(rx, ry);

    // Detect if gamepad has intentional active input
    const anyButtonPressed = gp.buttons.some((b) => (typeof b === "object" ? b.pressed || b.value > 0.25 : (b as unknown as number) > 0.25));
    if (lMag > deadzone || rMag > deadzone || anyButtonPressed) {
      this.activeInputDevice = "gamepad";
    }

    if (!this.isUsingGamepad) {
      this.isGamepadAiming = false;
      this.isGamepadAimActive = false;
      return;
    }

    if (lMag > deadzone) {
      const normalizedMag = Math.min(1.0, (lMag - deadzone) / (1.0 - deadzone));
      this.movementVector.x = (lx / lMag) * normalizedMag;
      this.movementVector.y = (ly / lMag) * normalizedMag;
    } else {
      // Revert to keyboard keys if left stick is centered
      if (this.keysPressed.size > 0) {
        this.updateMovementVector();
      } else {
        this.movementVector.x = 0;
        this.movementVector.y = 0;
      }
    }

    // 2. Right Joystick (axes 2, 3): Virtual aim cursor as ABSOLUTE arena position
    // Stays exactly where it is on screen — only moves when joystick is pushed.
    // Character walking does NOT drag the cursor.
    this.isGamepadAiming = true;
    this.isGamepadAimActive = true;

    // Initialize cursor in front of character on first connect
    if (!this.isGamepadAimOffsetInitialized) {
      this.gamepadAimPos.x = character.position.x + Math.cos(character.facingAngle) * 3.0;
      this.gamepadAimPos.y = character.position.y + Math.sin(character.facingAngle) * 3.0;
      this.isGamepadAimOffsetInitialized = true;
    }

    // When the right joystick is pushed, move the cursor in that direction on screen
    if (rMag > deadzone) {
      const cursorSpeed = 17.0;
      const dt = 1 / 60;
      this.gamepadAimPos.x += rx * cursorSpeed * dt;
      this.gamepadAimPos.y += ry * cursorSpeed * dt;
    }
    // When joystick is released, cursor stays at its current screen position — no drift!

    // Clamp cursor within arena boundaries
    this.gamepadAimPos.x = Math.max(0.1, Math.min(arena.width - 0.1, this.gamepadAimPos.x));
    this.gamepadAimPos.y = Math.max(0.1, Math.min(arena.height - 0.1, this.gamepadAimPos.y));

    // Helper to read button states safely
    const isButtonPressed = (btnIndex: number): boolean => {
      const b = gp!.buttons[btnIndex];
      if (!b) return false;
      return typeof b === "object" ? b.pressed || b.value > 0.3 : (b as unknown as number) > 0.3;
    };

    const isPrevPressed = (btnIndex: number): boolean => {
      return this.prevButtons[btnIndex] === true;
    };

    // 3. Button 0 (A on Xbox / Cross on PS): Climbing / Dismounting
    this.isGamepadClimbHeld = isButtonPressed(0);

    // 4. Button 4 (Left Bumper / LB / L1): Toggle Sprint
    const lbCurrent = isButtonPressed(4);
    if (lbCurrent && !isPrevPressed(4)) {
      if (this.onToggleSprint) {
        this.onToggleSprint();
      }
    }

    // 5. Button 1 (B on Xbox / Circle on PS): Pickup & Swap
    // Holding B while empty-handed will grab the moment an object enters range.
    const bCurrent = isButtonPressed(1);
    const bJustReleased = !bCurrent && isPrevPressed(1);
    if (bJustReleased) {
      this.bHeld = false;
    }
    if (bCurrent) {
      if (!character.heldObject && character.pickupModule) {
        // On first press OR while holding waiting for an object, try to grab
        if (!isPrevPressed(1) || this.bHeld) {
          character.pickupModule.pickupAndSwap(
            character,
            objects,
            arena.wallHeight,
            this.gamepadAimPos.x,
            this.gamepadAimPos.y
          );
          if (!character.heldObject) {
            // Nothing in range yet — keep waiting
            this.bHeld = true;
          } else {
            this.bHeld = false;
          }
        } else if (character.heldObject) {
          // Was holding and already has object — bHeld should already be false
          this.bHeld = false;
        }
      } else if (character.heldObject) {
        this.bHeld = false;
        // B while holding: drop / swap (only on fresh press)
        if (!isPrevPressed(1) && character.pickupModule) {
          character.pickupModule.pickupAndSwap(
            character,
            objects,
            arena.wallHeight,
            this.gamepadAimPos.x,
            this.gamepadAimPos.y
          );
        }
      }
    }

    // 6. Right Trigger (RT / R2, button 7): Grab when empty-handed, Throw when holding
    //    - Must RELEASE the trigger between grabbing and throwing (rtGrabbed flag prevents instant throw)
    //    - Holding RT while empty-handed will grab the moment an object enters range.
    // 7. Right Bumper (RB / R1, button 5): Throw only (never grabs)
    const rbCurrent = isButtonPressed(5);
    const rbJustPressed = rbCurrent && !isPrevPressed(5);
    const rtCurrent = isButtonPressed(7);
    const rtJustReleased = !rtCurrent && isPrevPressed(7);

    // Clear the grab-lock and waiting flag when RT is fully released
    if (rtJustReleased) {
      this.rtGrabbed = false;
      this.rtHeld = false;
    }

    if (!character.heldObject) {
      // Empty-handed: RT grabs the closest object to aim cursor.
      // If holding RT with nothing in range, keep trying each tick.
      if (rtCurrent && character.pickupModule && (!isPrevPressed(7) || this.rtHeld)) {
        character.pickupModule.pickupAndSwap(
          character,
          objects,
          arena.wallHeight,
          this.gamepadAimPos.x,
          this.gamepadAimPos.y
        );
        if (character.heldObject) {
          this.rtGrabbed = true; // locked — must release RT before it can throw
          this.rtHeld = false;
        } else {
          this.rtHeld = true; // nothing in range yet — keep waiting
        }
      }
    } else {
      this.rtHeld = false;
      // Holding an object:
      // RT throws only if trigger was released since the grab (rtGrabbed = false)
      if (!isPrevPressed(7) && rtCurrent && !this.rtGrabbed && character.throwModule) {
        character.throwModule.throwHeldObject(
          character, this.gamepadAimPos.x, this.gamepadAimPos.y, arena
        );
      }
      // RB throws immediately (separate button, no grab-lock needed)
      if (rbJustPressed && character.throwModule) {
        character.throwModule.throwHeldObject(
          character, this.gamepadAimPos.x, this.gamepadAimPos.y, arena
        );
      }
    }

    // Store button states for edge detection on next tick
    this.prevButtons = gp.buttons.map((b) => (typeof b === "object" ? b.pressed || b.value > 0.3 : (b as unknown as number) > 0.3));
  }

  public handleInteractions(
    character: Character,
    arena: Arena,
    objects: GameObject[],
    devPanel?: DevPanel
  ): void {
    if (devPanel) {
      this.selectedCanvasEntity = devPanel.selectedEntity;
    }

    const findEntityAt = (x: number, y: number, tolerance = 0.35): GameObject | null => {
      // Check objects first (so objects on top or near player can be picked)
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const r = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
        // Check physical ground collider position
        const distGround = Math.hypot(obj.position.x - x, obj.position.y - y);
        // Check hovering visual position (if elevated above ground)
        const distHover = Math.hypot(obj.position.x - x, (obj.position.y - obj.position.z) - y);
        if (distGround <= r + tolerance || distHover <= r + tolerance) {
          return obj;
        }
      }
      // Check character
      const charR = character.hasCollider ? character.colliderRadius : 0.44;
      const distCharGround = Math.hypot(character.position.x - x, character.position.y - y);
      const distCharHover = Math.hypot(character.position.x - x, (character.position.y - character.position.z) - y);
      if (distCharGround <= charR + tolerance || distCharHover <= charR + tolerance) {
        return character;
      }
      return null;
    };

    const applyWallDraw = (col: number, row: number) => {
      if (col < 0 || col >= arena.cols || row < 0 || row >= arena.rows) return;
      const changed = arena.setWallTile(col, row, true);
      if (changed) {
        const allEntities = [character, ...objects];
        arena.syncEntitiesWithWalls(allEntities);
        arena.currentPresetId = "custom";
        devPanel?.updateWallPresetUI();
      }
    };

    const applyWallErase = (col: number, row: number) => {
      if (col < 0 || col >= arena.cols || row < 0 || row >= arena.rows) return;
      if (arena.tileGrid[row][col] === 1) {
        arena.setWallTile(col, row, false);
        const allEntities = [character, ...objects];
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
      const col = Math.floor(x / arena.tileSize);
      const row = Math.floor(y / arena.tileSize);
      if (col >= 0 && col < arena.cols && row >= 0 && row < arena.rows) {
        this.hoverWallTile = { col, row };
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

      // Play Mode:
      // 1. If holding an object and ready to throw (and not the same click as pickup):
      if (character.heldObject && character.throwModule && !this.justPickedUp) {
        character.throwModule.throwHeldObject(character, clickX, clickY, arena);
        this.isThrowingPress = true; // This click was used to throw; cannot immediately grab until released
        return;
      }

      // 2. If NOT holding an object: attempt pickup
      if (!character.heldObject && character.pickupModule) {
        const target = character.pickupModule.findTargetObject(character, clickX, clickY, objects, arena.wallHeight);
        if (target) {
          character.pickupModule.pickup(character, target);
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
      const aimX = this.gamepadConnected ? this.gamepadAimPos.x : this.mousePos.x;
      const aimY = this.gamepadConnected ? this.gamepadAimPos.y : this.mousePos.y;
      if (character.heldObject && character.pickupModule) {
        character.pickupModule.drop(character);
      } else if (!character.heldObject && character.pickupModule) {
        const target = character.pickupModule.findTargetObject(character, aimX, aimY, objects, arena.wallHeight);
        if (target) {
          character.pickupModule.pickup(character, target);
        }
      }
    };
  }
}
