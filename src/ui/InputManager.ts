import { Vector2D } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { VerticalPositionModule } from "../engine/VerticalPositionModule.js";
import type { DevPanel } from "./DevPanel.js";

export class InputManager {
  private canvas: HTMLCanvasElement;
  private arena: Arena;
  private keysPressed: Set<string> = new Set();
  
  public mousePos: Vector2D = { x: 0, y: 0 };
  public isMouseDown = false;
  public isRightMouseDown = false;
  public hoverWallTile: { col: number; row: number } | null = null;
  public movementVector: Vector2D = { x: 0, y: 0 };
  public justPickedUp = false;

  public get isGrabKeyHeld(): boolean {
    return this.keysPressed.has("KeyE");
  }

  public isThrowingPress = false;

  public get isGrabHeld(): boolean {
    return (!this.isThrowingPress && this.isMouseDown) || this.isGrabKeyHeld;
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
    if (devPanel) {
      this.selectedCanvasEntity = devPanel.selectedEntity;
    }

    const findEntityAt = (x: number, y: number, tolerance = 0.35): GameObject | null => {
      // Check objects first (so objects on top or near player can be picked)
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const r = obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.32);
        const dist = Math.hypot(obj.position.x - x, obj.position.y - y);
        if (dist <= r + tolerance) {
          return obj;
        }
      }
      // Check character
      const charR = character.hasCollider ? character.colliderRadius : 0.44;
      const distChar = Math.hypot(character.position.x - x, character.position.y - y);
      if (distChar <= charR + tolerance) {
        return character;
      }
      return null;
    };

    const applyWallDraw = (col: number, row: number) => {
      if (col < 0 || col >= arena.cols || row < 0 || row >= arena.rows) return;
      const changed = arena.setWallTile(col, row, true);
      if (changed) {
        // Elevate any entity overlapping this tile on the ground
        const tileWall = {
          id: `wall-${col}-${row}`,
          x: col * arena.tileSize,
          y: row * arena.tileSize,
          width: arena.tileSize,
          height: arena.tileSize,
          wallHeight: arena.wallHeight,
        };
        const allEntities = [character, ...objects];
        for (const ent of allEntities) {
          const r = ent.hasCollider ? ent.colliderRadius : (ent.colliderModule?.radius ?? 0.32);
          if (arena.testWallOverlap(ent.position.x, ent.position.y, r, tileWall)) {
            if (ent.position.z < arena.wallHeight) {
              if (!ent.hasVerticalPosition) {
                if (!ent.verticalPositionModule) {
                  ent.verticalPositionModule = new VerticalPositionModule({ z: arena.wallHeight, hasVerticalVelocity: true });
                } else {
                  ent.verticalPositionModule.enabled = true;
                }
              }
              ent.position.z = arena.wallHeight;
              ent.supportingSurfaceHeight = arena.wallHeight;
              ent.verticalVelocity = 0;
            }
          }
        }
      }
    };

    const applyWallErase = (col: number, row: number) => {
      if (col < 0 || col >= arena.cols || row < 0 || row >= arena.rows) return;
      arena.setWallTile(col, row, false);
      // Erased walls remove supporting surfaces; GameObject.updatePosition will naturally drop unsupported entities
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
        const target = character.pickupModule.findTargetObject(character, clickX, clickY, objects);
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
      if (character.heldObject && character.pickupModule) {
        character.pickupModule.drop(character);
      } else if (!character.heldObject && character.pickupModule) {
        const target = character.pickupModule.findTargetObject(character, this.mousePos.x, this.mousePos.y, objects);
        if (target) {
          character.pickupModule.pickup(character, target);
          this.justPickedUp = true;
        }
      }
    };
  }
}
