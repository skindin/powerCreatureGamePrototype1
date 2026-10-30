/**
 * controls.js — User Scriptable Control Schema
 * 
 * Edit this file directly in any text editor or via the in-game Controls Inspector!
 * Changes take effect immediately without recompilation.
 * 
 * =============================================================================
 * PARAMETERS:
 * =============================================================================
 * @param {Character} char - The local player character instance.
 * 
 * @param {InputContext} input - Ergonomic input queries and state:
 *   - input.isDown(code)          -> boolean (true while key/button is held down)
 *   - input.isPressed(code)       -> boolean (true ONLY on initial frame pressed)
 *   - input.isReleased(code)      -> boolean (true ONLY on frame released)
 *   - input.getHoldDuration(code) -> number (milliseconds continuously held down)
 *   - input.isHeldFor(code, ms)   -> boolean (true if held >= ms)
 *   - input.mouse                 -> { x, y, dx, dy, screenX, screenY }
 *   - input.dt                    -> number (delta time in seconds, ~0.0167)
 *   - input.time                  -> number (performance.now() in ms)
 *   - input.isHoldingItem()       -> boolean
 *   - input.heldItemIsEdible()    -> boolean
 *   - input.heldItemHasAbility()  -> boolean
 *   - input.targetInReach         -> GameObject or null
 *   - input.getStage(group)       -> string (current stage for named group, default "none")
 *   - input.setStage(group, stage)
 * 
 * Key / Button Code Aliases:
 *   - "MouseLeft", "LMB", 0
 *   - "MouseRight", "RMB", 2
 *   - "MouseMiddle", "MMB", 1
 *   - "KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight", "KeyE", "KeyQ", "KeyF", etc.
 * 
 * @param {ActionContext} actions - High-level intent triggers:
 *   - actions.move(x, y)               -> sets normalized locomotion vector
 *   - actions.sprint(boolean)          -> sets sprinting state
 *   - actions.jump()                   -> requests jump / dismount hop
 *   - actions.pickup()                 -> grabs nearest target in reach
 *   - actions.drop()                   -> drops held item
 *   - actions.swap()                   -> swaps held item with target
 *   - actions.useItem()                -> eats consumable or activates primary item ability
 *   - actions.punch()                  -> requests directional melee punch
 *   - actions.aimLaser()               -> activates laser aiming
 *   - actions.fireLaser()              -> fires laser beam
 *   - actions.aimThrow()               -> activates ballistic trajectory preview
 *   - actions.releaseThrow()           -> throws the held object
 *   - actions.lockAimTarget(x, y)      -> freezes trajectory landing spot in place during drag
 *   - actions.unlockAimTarget()        -> restores dynamic mouse-following aim target
 *   - actions.modulateArc(deltaRatio)  -> adjusts arc ratio (-1.0 to 1.0, e.g. -dy * 0.005)
 *   - actions.setTrajectoryArc(ratio)  -> directly sets arc ratio between 0.0 (flat) and 1.0 (high lob)
 *   - actions.facePosition(x, y)       -> orients character facing toward world coordinates
 *   - actions.faceAngle(radians)       -> sets character facing angle directly
 * 
 * @param {Object} state - Persistent state dictionary preserved between ticks.
 * =============================================================================
 */

// If true: releasing LMB after dragging launches the projectile immediately.
// If false: releasing LMB finishes adjusting the arc and keeps aiming until you tap LMB again.
const FIRE_ON_RELEASE_AFTER_DRAG = true;

// Hold duration threshold (in ms) to transition from a quick tap to a trajectory drag.
const TRAJECTORY_DRAG_HOLD_MS = 200;

export default function updateControls(char, input, actions, state) {
  // -------------------------------------------------------------
  // 1. Locomotion Movement Vector (WASD / Arrow Keys)
  // -------------------------------------------------------------
  let moveX = 0;
  let moveY = 0;

  if (input.isDown("KeyW") || input.isDown("ArrowUp")) moveY -= 1;
  if (input.isDown("KeyS") || input.isDown("ArrowDown")) moveY += 1;
  if (input.isDown("KeyA") || input.isDown("ArrowLeft")) moveX -= 1;
  if (input.isDown("KeyD") || input.isDown("ArrowRight")) moveX += 1;

  actions.move(moveX, moveY);

  // Sprint (Shift)
  if (input.isDown("ShiftLeft") || input.isDown("ShiftRight")) {
    actions.sprint(true);
  }

  // Jump (Space)
  if (input.isDown("Space")) {
    actions.jump();
  }

  // -------------------------------------------------------------
  // 2. Facing Direction
  // -------------------------------------------------------------
  // When dragging trajectory, the landing position is locked, so we don't snap facing to mouse
  if (!state.isDraggingTrajectory) {
    actions.facePosition(input.mouse.x, input.mouse.y);
  }

  // -------------------------------------------------------------
  // 3. Object Interaction: Pick Up / Grab (LMB when empty-handed)
  // -------------------------------------------------------------
  if (!input.isHoldingItem()) {
    if (input.isPressed("MouseLeft") && input.targetInReach) {
      actions.pickup();
    }
  }

  // -------------------------------------------------------------
  // 4. Throw & Trajectory Drag (Holding an item)
  // -------------------------------------------------------------
  if (input.isHoldingItem()) {
    const isAimingThrow = input.isDown("MouseRight");

    if (isAimingThrow) {
      actions.aimThrow();

      const lmbHeldMs = input.getHoldDuration("MouseLeft");

      // While holding LMB down:
      if (input.isDown("MouseLeft")) {
        if (lmbHeldMs >= TRAJECTORY_DRAG_HOLD_MS) {
          // Held long enough: enter Trajectory Drag mode!
          if (!state.isDraggingTrajectory) {
            state.isDraggingTrajectory = true;
            // Freeze the landing target spot at the current cursor location
            state.lockedTarget = { x: input.mouse.x, y: input.mouse.y };
          }

          // Keep landing spot locked in place so dragging only affects trajectory arc height
          actions.lockAimTarget(state.lockedTarget.x, state.lockedTarget.y);

          // Drag mouse vertically to raise or lower arc:
          // Moving UP (negative dy) raises the arc toward high lob (1.0)
          // Moving DOWN (positive dy) lowers the arc toward flat throw (0.0)
          if (input.mouse.dy !== 0) {
            actions.modulateArc(-input.mouse.dy * 0.005);
          }
        }
      }

      // When LMB is released:
      if (input.isReleased("MouseLeft")) {
        if (state.isDraggingTrajectory) {
          // Finished dragging trajectory
          state.isDraggingTrajectory = false;
          state.lockedTarget = null;

          if (FIRE_ON_RELEASE_AFTER_DRAG) {
            actions.releaseThrow();
          }
        } else if (lmbHeldMs < TRAJECTORY_DRAG_HOLD_MS) {
          // Quick tap (< 200ms): fire/throw immediately!
          actions.releaseThrow();
        }
      }
    } else {
      // Not aiming: reset trajectory drag state
      state.isDraggingTrajectory = false;
      state.lockedTarget = null;

      // Drop item (Key Q)
      if (input.isPressed("KeyQ")) {
        actions.drop();
      }

      // Swap item (LMB when near another item)
      if (input.isPressed("MouseLeft") && input.targetInReach) {
        actions.swap();
      }
    }
  } else {
    state.isDraggingTrajectory = false;
    state.lockedTarget = null;
  }

  // -------------------------------------------------------------
  // 5. Eating / Consumable & Item Abilities (Key E)
  // -------------------------------------------------------------
  if (input.isHoldingItem() && input.isDown("KeyE")) {
    actions.useItem();
  }

  // -------------------------------------------------------------
  // 6. Combat: Melee Punch (Key F) & Laser (Alt + RMB)
  // -------------------------------------------------------------
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
