import { Vector2D } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import type { DevPanel } from "./DevPanel.js";

export class InputManager {
  private canvas: HTMLCanvasElement;
  private arena: Arena;
  private keysPressed: Set<string> = new Set();
  
  public mousePos: Vector2D = { x: 0, y: 0 };
  public isMouseDown = false;
  public movementVector: Vector2D = { x: 0, y: 0 };
  public justPickedUp = false;
  public hoverEntity: GameObject | null = null;

  // Action callback hooks
  public handleClick?: (clickX: number, clickY: number) => void;
  public onRightClick?: (clickX: number, clickY: number) => void;
  public onDropAttempt?: () => void;
  public onMouseMove?: (x: number, y: number) => void;

  constructor(canvas: HTMLCanvasElement, arena: Arena) {
    this.canvas = canvas;
    this.arena = arena;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener("keydown", (e) => {
      this.keysPressed.add(e.code);
      this.updateMovementVector();

      if (e.code === "KeyE") {
        // Alternative interact / drop key
        if (this.onDropAttempt) {
          this.onDropAttempt();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed.delete(e.code);
      this.updateMovementVector();
    });

    this.canvas.addEventListener("mousemove", (e) => {
      this.updateMousePos(e);
      if (this.onMouseMove) {
        this.onMouseMove(this.mousePos.x, this.mousePos.y);
      }
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 2) {
        // Right click handles selection
        return;
      }
      if (e.button !== 0) return; // Only primary left click
      this.isMouseDown = true;
      this.updateMousePos(e);

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
      if (e.button !== 0) return;
      this.isMouseDown = false;
      this.justPickedUp = false;
    });

    // Touch support for mobile / touchscreens
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        this.isMouseDown = true;
        this.updateTouchPos(e.touches[0]);
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
    });
  }

  private updateMousePos(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.arena.width / rect.width;
    const scaleY = this.arena.height / rect.height;
    this.mousePos.x = (e.clientX - rect.left) * scaleX;
    this.mousePos.y = (e.clientY - rect.top) * scaleY;
  }

  private updateTouchPos(touch: Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.arena.width / rect.width;
    const scaleY = this.arena.height / rect.height;
    this.mousePos.x = (touch.clientX - rect.left) * scaleX;
    this.mousePos.y = (touch.clientY - rect.top) * scaleY;
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

  public handleInteractions(
    character: Character,
    arena: Arena,
    objects: GameObject[],
    devPanel?: DevPanel
  ): void {
    const findEntityAt = (x: number, y: number, tolerance = 0.35): GameObject | null => {
      // Check objects first (so objects on top or near player can be picked)
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const dist = Math.hypot(obj.position.x - x, obj.position.y - y);
        if (dist <= obj.colliderRadius + tolerance) {
          return obj;
        }
      }
      // Check character
      const distChar = Math.hypot(character.position.x - x, character.position.y - y);
      if (distChar <= character.colliderRadius + tolerance) {
        return character;
      }
      return null;
    };

    // Hover tracking (especially useful in Edit Mode)
    this.onMouseMove = (x: number, y: number) => {
      if (devPanel?.isEditMode) {
        const found = findEntityAt(x, y, 0.3);
        this.hoverEntity = found;
        this.canvas.style.cursor = found ? "pointer" : "crosshair";
      } else {
        this.hoverEntity = null;
        this.canvas.style.cursor = "default";
      }
    };

    this.handleClick = (clickX: number, clickY: number) => {
      // If Edit Mode is active: left-click selects entities without throwing/grabbing!
      if (devPanel?.isEditMode) {
        const found = findEntityAt(clickX, clickY, 0.35);
        if (found) {
          devPanel.setSelectedEntity(found);
        } else {
          devPanel.setSelectedEntity(character);
        }
        return;
      }

      // Play Mode:
      // 1. If holding an object and ready to throw (and not the same click as pickup):
      if (character.heldObject && character.throwModule && !this.justPickedUp) {
        character.throwModule.throwHeldObject(character, clickX, clickY, arena);
        return;
      }

      // 2. If NOT holding an object: attempt pickup
      if (!character.heldObject && character.pickupModule) {
        const target = character.pickupModule.findTargetObject(character, clickX, clickY, objects);
        if (target) {
          character.pickupModule.pickup(character, target);
          this.justPickedUp = true;
        }
      }
    };

    // Right click selects any entity in the Dev Panel (works in both Play & Edit modes)
    this.onRightClick = (clickX: number, clickY: number) => {
      if (!devPanel) return;
      const found = findEntityAt(clickX, clickY, 0.4);
      devPanel.setSelectedEntity(found ?? character);
    };

    this.onDropAttempt = () => {
      if (character.heldObject && character.pickupModule) {
        character.pickupModule.drop(character);
      }
    };
  }
}
