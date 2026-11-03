import type {
  ControlBlock,
  ControlExecutionContext,
  BlockInputSlot,
  LocomotionControlBlock,
  MeleeControlBlock,
  LaserControlBlock,
  ThrowControlBlock,
  ItemInteractionControlBlock,
  FacingControlBlock,
} from "./ControlSchemaTypes.js";
import type { InputManager } from "../../ui/InputManager.js";
import { InputPressTokenManager } from "./InputPressTokenManager.js";
import type { PlayerInputPacket } from "../../engine/physics/StateHistoryBuffer.js";
import { ThrowCapability } from "../../character/capabilities/ThrowCapability.js";
import { ControlSchemaArbiter } from "./ControlSchemaArbiter.js";

/**
 * ModularBlockEvaluator executes prebuilt, intuitive Control Blocks.
 * Each gameplay capability (Locomotion, Item Interaction, Throwing, Melee, Laser, Facing)
 * is represented as a self-contained ControlBlock with its own tailored prebuilt logic.
 */
export class ModularBlockEvaluator {
  private static accumulators: Map<string, number> = new Map();
  public static activeRawDragBlockId: string | null = null;

  public static getAccumulatorValue(id: string, defaultValue: number = 0.5): number {
    if (!this.accumulators.has(id)) {
      this.accumulators.set(id, defaultValue);
    }
    return this.accumulators.get(id)!;
  }

  public static setAccumulatorValue(id: string, value: number): void {
    this.accumulators.set(id, value);
  }

  public static evaluateBlocks(
    blocks: ControlBlock[],
    execCtx: ControlExecutionContext,
    input: InputManager
  ): PlayerInputPacket {
    const char = execCtx.character;
    const now = performance.now();
    const isEditMode = Boolean((window as any).__DEV_PANEL_OPEN);

    const playerId = execCtx.gamepadStates
      ? `gamepad-${execCtx.gamepadStates.slotIndex}`
      : (char.playerId || "keyboard");
    const tokens = InputPressTokenManager.getInstance(playerId);
    const currentDownKeys = new Set<string>();

    if (!execCtx.gamepadStates) {
      for (const k of input.getActiveKeys()) currentDownKeys.add(k);
      if (execCtx.isMouseButtonDown(0)) currentDownKeys.add("MouseLeft");
      if (execCtx.isMouseButtonDown(1)) currentDownKeys.add("MouseMiddle");
      if (execCtx.isMouseButtonDown(2)) currentDownKeys.add("MouseRight");
    } else {
      // Gamepad button edge registration strictly for this specific controller slot
      for (let b = 0; b <= 16; b++) {
        const val = execCtx.gamepadStates.getValue ? execCtx.gamepadStates.getValue(b) : 0;
        if (execCtx.gamepadStates.isDown(b) || val > 0.15) {
          const gpCode = ControlSchemaArbiter.formatGamepadButtonIndex(b);
          currentDownKeys.add(gpCode);
        }
      }
    }
    tokens.update(currentDownKeys, now);

    const isCodeJustReleased = (c: string): boolean => {
      if (c.startsWith("Gamepad")) {
        const btn = ControlSchemaArbiter.parseGamepadButtonCode(c);
        if (btn >= 0 && execCtx.gamepadStates) {
          return execCtx.gamepadStates.justReleased(btn);
        }
        return false;
      }
      if (c.startsWith("Mouse")) {
        const idx = c === "MouseLeft" ? 0 : c === "MouseMiddle" ? 1 : c === "MouseRight" ? 2 : -1;
        return idx >= 0 ? execCtx.mouseStates?.justReleased(idx) ?? false : false;
      }
      return execCtx.keyStates?.justReleased(c) ?? false;
    };

    const defaultCleanForIntent = (intent: string): boolean => {
      if (
        intent.includes("forward") ||
        intent.includes("sprint") ||
        intent.includes("aim") ||
        intent.includes("consume") ||
        intent.includes("laser.fire") ||
        intent.includes("jump")
      ) {
        return false;
      }
      return true;
    };

    const isSlotActive = (
      slot: BlockInputSlot | undefined | null,
      triggerMode: "down" | "hold" | "up" = "down",
      defaultRequireClean: boolean = true,
      blockId: string = "",
      intent: string = ""
    ): boolean => {
      if (!slot || !slot.code) return false;
      // All gate modifier buttons must be currently down
      if (slot.gateButtons && slot.gateButtons.length > 0) {
        const allGatesDown = slot.gateButtons.every((g) => tokens.isDown(g));
        if (!allGatesDown) return false;
      }

      const requireClean = slot.requireCleanPress !== undefined
        ? slot.requireCleanPress
        : defaultRequireClean;

      // Analog trigger detection (GamepadLT / GamepadRT)
      const isAnalogTrigger = slot.code === "GamepadLT" || slot.code === "GamepadRT";
      const analogVal = isAnalogTrigger ? getSlotAnalogValue(slot) : 0;
      const isAnalogPulled = analogVal > 0.15;
      const isCodeDown = tokens.isDown(slot.code) || isAnalogPulled;

      // Track analog trigger transition cleanly across all frames
      let isAnalogJustPulled = false;
      let isAnalogJustReleased = false;
      if (isAnalogTrigger) {
        const prevAnalog = (char as any)[`_prevAnalog_${slot.code}`] ?? 0;
        (char as any)[`_prevAnalog_${slot.code}`] = analogVal;
        isAnalogJustPulled = prevAnalog <= 0.15 && isAnalogPulled;
        isAnalogJustReleased = prevAnalog > 0.15 && !isAnalogPulled;
      }

      // If the button press was consumed by another module (e.g. pickup claimed LMB),
      // no other block can hold or trigger on it until physically released!
      // Modifier, cursor steer, or forward drive intents are non-exclusive and must not be blocked by action token consumption
      const isModifierIntent = intent.includes("cursorSteer") || intent.includes("forwardDrive") || intent.includes("sprint");
      if (tokens.isConsumed(slot.code) && !isModifierIntent) {
        if (!tokens.isClaimedBy(slot.code, blockId) || requireClean) {
          return false;
        }
      }

      if (triggerMode === "hold") {
        return isCodeDown;
      } else if (triggerMode === "down") {
        if (!isCodeDown) return false;
        if (requireClean) {
          if (isAnalogTrigger && isAnalogJustPulled && !tokens.isConsumed(slot.code)) {
            return true;
          }
          return tokens.canExecute(slot.code, "requireCleanPress", blockId, intent);
        }
        return true;
      } else if (triggerMode === "up") {
        if (isAnalogTrigger && isAnalogJustReleased) {
          return true;
        }
        if (!isCodeJustReleased(slot.code) && !tokens.wasReleased(slot.code)) return false;
        if (requireClean) {
          return tokens.canExecuteRelease(slot.code, "requireCleanPress", blockId, intent);
        }
        return true;
      }
      return false;
    };

    const isSlotAnyJustReleased = (slot?: BlockInputSlot | null): boolean => {
      if (!slot || !slot.code) return false;
      if (isCodeJustReleased(slot.code) || tokens.wasReleased(slot.code)) return true;
      if (slot.gateButtons && slot.gateButtons.some((g) => isCodeJustReleased(g) || tokens.wasReleased(g))) return true;
      return false;
    };

    const claimSlot = (
      slot: BlockInputSlot | undefined | null,
      blockId: string,
      intent: string,
      isActionExecution: boolean = true
    ): void => {
      if (!slot || !slot.code) return;
      const requireClean = slot.requireCleanPress !== undefined
        ? slot.requireCleanPress
        : defaultCleanForIntent(intent);

      if (requireClean && isActionExecution) {
        tokens.consume(slot.code, blockId, intent);
      } else {
        tokens.claim(slot.code, blockId, intent);
      }

      if (slot.gateButtons) {
        for (const g of slot.gateButtons) {
          tokens.claim(g, blockId, intent);
        }
      }
    };

    const getSlotAnalogValue = (slot?: BlockInputSlot | null): number => {
      if (!slot || !slot.code) return 0;
      if (slot.code.startsWith("Gamepad")) {
        const btn = ControlSchemaArbiter.parseGamepadButtonCode(slot.code);
        if (btn >= 0) {
          if (execCtx.gamepadStates?.getValue) {
            return execCtx.gamepadStates.getValue(btn);
          }
          if (execCtx.getGamepadButtonValue) {
            return execCtx.getGamepadButtonValue(execCtx.gamepadStates?.slotIndex ?? 0, btn);
          }
          return execCtx.gamepadStates?.isDown(btn) ? 1.0 : 0.0;
        }
        return 0;
      }
      if (slot.code.startsWith("Mouse")) {
        const idx = slot.code === "MouseLeft" ? 0 : slot.code === "MouseMiddle" ? 1 : slot.code === "MouseRight" ? 2 : -1;
        return (idx >= 0 && execCtx.mouseStates?.isDown(idx)) ? 1.0 : 0.0;
      }
      return tokens.isDown(slot.code) ? 1.0 : 0.0;
    };

    let moveX = 0;
    let moveY = 0;
    let isSprinting = false;
    let isJumpHeld = false;
    let isGrabHeld = false;
    let isDrop = false;
    let isThrow = false;
    let isSwap = false;
    let isUsingItem = false;
    let isLaserAiming = false;
    let isLaserFiring = false;
    let isMeleeRequested = false;
    let isAimingTrajectory = false;
    let activeRawDragThisFrame = false;
    let isSteerCursorActive = false;

    // Reticle/Aim target position (works seamlessly for mouse and gamepad reticle)
    const targetAimPos = execCtx.reticleAimPos || execCtx.mouseAimPos || input.actualMousePos;

    // Pre-evaluate locomotion cursor mode states
    const locoBlock = blocks.find((blk) => blk.enabled && blk.type === "locomotion") as LocomotionControlBlock | undefined;
    if (locoBlock) {
      const isToggleMode = locoBlock.cursorSteerMode === "toggleButton";
      if (isToggleMode && locoBlock.cursorSteerTrigger) {
        if (isSlotActive(locoBlock.cursorSteerTrigger, "down", true, locoBlock.id, "locomotion.cursorSteerToggle")) {
          char.isCursorModeActive = !char.isCursorModeActive;
          claimSlot(locoBlock.cursorSteerTrigger, locoBlock.id, "locomotion.cursorSteerToggle", true);
        }
      }

      const isHoldMode = locoBlock.cursorSteerMode === "whenHoldingButton";
      const isHoldActive = isHoldMode && isSlotActive(locoBlock.cursorSteerTrigger, "hold", false, locoBlock.id, "locomotion.cursorSteer");

      const isDriveButtonMode = locoBlock.mode === "stickDirectionDriveButton";
      const isSameTrigger = Boolean(
        locoBlock.forwardTrigger?.code &&
        locoBlock.cursorSteerTrigger?.code &&
        locoBlock.forwardTrigger.code === locoBlock.cursorSteerTrigger.code
      );

      // In analogStick or wasd mode, forwardTrigger does not drive locomotion
      const fwdActive = isDriveButtonMode
        ? isSlotActive(locoBlock.forwardTrigger, "hold", false, locoBlock.id, "locomotion.forwardDrive")
        : false;

      const gpLeftStick = (execCtx.gamepadStates as any)?.leftStick ?? execCtx.getGamepadAxis(0, "LeftStick");
      const stickMag = gpLeftStick ? Math.hypot(gpLeftStick.x, gpLeftStick.y) : 0;
      const isPushingStick = stickMag > 0.08;

      if (isHoldActive) {
        // Holding cursor steer modifier button directly engages cursor mode!
        isSteerCursorActive = true;
      } else if (isToggleMode && Boolean(char.isCursorModeActive)) {
        if (locoBlock.rawDirectionWhileWalking && isDriveButtonMode && fwdActive && isPushingStick && !isSameTrigger) {
          isSteerCursorActive = false;
        } else {
          isSteerCursorActive = true;
        }
      } else if (locoBlock.cursorSteerMode === "cursorWhenIdle") {
        const isLocomoting = isDriveButtonMode ? (fwdActive && isPushingStick) : isPushingStick;
        isSteerCursorActive = !isLocomoting;
      } else if (locoBlock.cursorSteerMode === "whenAiming") {
        isSteerCursorActive = isAimingTrajectory;
      } else {
        isSteerCursorActive = false;
      }

      char.isSteeringCursor = isSteerCursorActive;
    }

    // Pre-evaluate laser aiming & firing state for modal arbitration (LASER > CONSUME > THROW > PICKUP)
    const laserBlock = blocks.find((blk) => blk.enabled && blk.type === "laser") as LaserControlBlock | undefined;
    if (laserBlock) {
      if (isSlotActive(laserBlock.aimTrigger, "hold", false, laserBlock.id, "laser.aim")) {
        isLaserAiming = true;
      }
      const isAimConfigured = Boolean(laserBlock.aimTrigger && laserBlock.aimTrigger.code);
      const canFire = !isAimConfigured || isLaserAiming;
      if (isLaserAiming && laserBlock.fireTrigger?.autoFireWhenAiming) {
        isLaserFiring = true;
      } else if (canFire && isSlotActive(laserBlock.fireTrigger, "hold", false, laserBlock.id, "laser.fire")) {
        isLaserFiring = true;
      }
    }

    // Helper to get effective aim position for abilities:
    // In Raw Direction Mode on Gamepad: abilities aim along the character's raw facing direction.
    // In Cursor Mode (or Mouse/Keyboard): abilities aim at targetAimPos (the cursor).
    const getEffectiveAimPos = (): { x: number; y: number } => {
      const isRawMode = !isSteerCursorActive && !char.isSteeringCursor && Boolean(execCtx.gamepadStates);
      if (isRawMode) {
        if (locoBlock?.stickCursorInFront) {
          return targetAimPos;
        }
        const rawAngle = char.facingAngle ?? 0;
        const rawDirX = Math.cos(rawAngle);
        const rawDirY = Math.sin(rawAngle);
        const cursorDist = Math.hypot(targetAimPos.x - char.position.x, targetAimPos.y - char.position.y);
        const forwardDist = Math.max(3.5, cursorDist);
        return {
          x: char.position.x + rawDirX * forwardDist,
          y: char.position.y + rawDirY * forwardDist,
        };
      }
      return targetAimPos;
    };

    // Scan for nearby grabbable objects for pickup and swap
    const grabTargetObjectId = execCtx.targetInReach ? execCtx.targetInReach.id : null;

    // Process blocks in order
    for (const block of blocks) {
      if (!block.enabled) continue;

      switch (block.type) {
        case "locomotion": {
          const b = block as LocomotionControlBlock;
          const gpLeftStick = (execCtx.gamepadStates as any)?.leftStick ?? execCtx.getGamepadAxis(0, "LeftStick");
          const fwdActive = isSlotActive(b.forwardTrigger, "hold", false, b.id, "locomotion.forwardDrive");

          if (isSteerCursorActive) {
            if (b.cursorSteerMode === "whenHoldingButton") {
              claimSlot(b.cursorSteerTrigger, b.id, "locomotion.cursorSteer", false);
            }
            if (gpLeftStick && Math.hypot(gpLeftStick.x, gpLeftStick.y) > 0.08) {
              const cursorSpeed = 17.0;
              targetAimPos.x += gpLeftStick.x * cursorSpeed * execCtx.dt;
              targetAimPos.y += gpLeftStick.y * cursorSpeed * execCtx.dt;
              if (execCtx.arena) {
                targetAimPos.x = Math.max(0.1, Math.min(execCtx.arena.width - 0.1, targetAimPos.x));
                targetAimPos.y = Math.max(0.1, Math.min(execCtx.arena.height - 0.1, targetAimPos.y));
              }
              if (execCtx.gamepadStates) {
                const slot = input.gamepadSlots.get(execCtx.gamepadStates.slotIndex);
                if (slot) {
                  slot.aimPos.x = targetAimPos.x;
                  slot.aimPos.y = targetAimPos.y;
                  slot.hasMovedAimStick = true;
                  slot.aimMovedWhileInRange = true;
                  if (!slot.aimOffset) slot.aimOffset = { x: 0, y: 0 };
                  slot.aimOffset.x = slot.aimPos.x - char.position.x;
                  slot.aimOffset.y = slot.aimPos.y - char.position.y;
                }
              }
            }
            // In cursor mode: character always faces toward the cursor!
            const aimDx = targetAimPos.x - char.position.x;
            const aimDy = targetAimPos.y - char.position.y;
            if (Math.hypot(aimDx, aimDy) > 0.05) {
              char.facingAngle = Math.atan2(aimDy, aimDx);
            }

            // In cursor mode: walk forward button only drives toward cursor if also pushing joystick
            const stickMag = gpLeftStick ? Math.hypot(gpLeftStick.x, gpLeftStick.y) : 0;
            const isSameTrigger = Boolean(
              b.forwardTrigger?.code &&
              b.cursorSteerTrigger?.code &&
              b.forwardTrigger.code === b.cursorSteerTrigger.code
            );
            const canDriveFwd = fwdActive && (!isSameTrigger || b.cursorSteerMode !== "whenHoldingButton");
            if (canDriveFwd && stickMag > 0.08) {
              moveX += Math.cos(char.facingAngle);
              moveY += Math.sin(char.facingAngle);
              claimSlot(b.forwardTrigger, b.id, "locomotion.forwardDrive", false);
            } else {
              moveX = 0;
              moveY = 0;
            }
          } else if (b.mode === "analogStick") {
            // Direct Analog Left Stick movement
            if (gpLeftStick && Math.hypot(gpLeftStick.x, gpLeftStick.y) > 0.08) {
              moveX += gpLeftStick.x;
              moveY += gpLeftStick.y;
              char.facingAngle = Math.atan2(gpLeftStick.y, gpLeftStick.x);
            }
          } else if (b.mode === "stickDirectionDriveButton") {
            const stickMag = gpLeftStick ? Math.hypot(gpLeftStick.x, gpLeftStick.y) : 0;
            if (stickMag > 0.08) {
              char.facingAngle = Math.atan2(gpLeftStick.y, gpLeftStick.x);
              if (fwdActive) {
                const driveSpeed = Math.min(1.0, stickMag);
                moveX += Math.cos(char.facingAngle) * driveSpeed;
                moveY += Math.sin(char.facingAngle) * driveSpeed;
                claimSlot(b.forwardTrigger, b.id, "locomotion.forwardDrive", false);
              }
            } else {
              // Only walk forward if also pushing joystick
              moveX = 0;
              moveY = 0;
            }
          } else if (b.mode === "walkToMouse") {
            // Update facing angle toward aim cursor
            const aimDx = targetAimPos.x - char.position.x;
            const aimDy = targetAimPos.y - char.position.y;
            const mouseDist = Math.hypot(aimDx, aimDy);
            if (mouseDist > 0.05) {
              char.facingAngle = Math.atan2(aimDy, aimDx);
            }

            // Forward Drive Button (e.g. MouseRight or KeyW)
            const fwdActive = isSlotActive(b.forwardTrigger, "hold", false, b.id, "locomotion.forward");
            if (fwdActive) {
              moveX += Math.cos(char.facingAngle);
              moveY += Math.sin(char.facingAngle);
              claimSlot(b.forwardTrigger, b.id, "locomotion.forward");
            }

            // Optional reverse / back-pedal key
            if (b.reverseKey && tokens.isDown(b.reverseKey)) {
              moveX -= Math.cos(char.facingAngle);
              moveY -= Math.sin(char.facingAngle);
              tokens.claim(b.reverseKey, b.id, "locomotion.reverse");
            }

            // Optional strafe keys (relative to character facing)
            if (b.strafeLeftKey && tokens.isDown(b.strafeLeftKey)) {
              moveX += Math.sin(char.facingAngle);
              moveY -= Math.cos(char.facingAngle);
              tokens.claim(b.strafeLeftKey, b.id, "locomotion.strafeLeft");
            }
            if (b.strafeRightKey && tokens.isDown(b.strafeRightKey)) {
              moveX -= Math.sin(char.facingAngle);
              moveY += Math.cos(char.facingAngle);
              tokens.claim(b.strafeRightKey, b.id, "locomotion.strafeRight");
            }
          } else {
            // Move WASD
            if (b.moveKeys) {
              const requireCleanMove = Boolean(b.moveKeys.requireCleanPress);
              let vx = 0;
              let vy = 0;
              if (b.moveKeys.upKey && tokens.isDown(b.moveKeys.upKey) && (!requireCleanMove || !tokens.isConsumed(b.moveKeys.upKey))) {
                vy -= 1;
                if (requireCleanMove) tokens.consume(b.moveKeys.upKey, b.id, "locomotion.moveUp");
              }
              if (b.moveKeys.downKey && tokens.isDown(b.moveKeys.downKey) && (!requireCleanMove || !tokens.isConsumed(b.moveKeys.downKey))) {
                vy += 1;
                if (requireCleanMove) tokens.consume(b.moveKeys.downKey, b.id, "locomotion.moveDown");
              }
              if (b.moveKeys.leftKey && tokens.isDown(b.moveKeys.leftKey) && (!requireCleanMove || !tokens.isConsumed(b.moveKeys.leftKey))) {
                vx -= 1;
                if (requireCleanMove) tokens.consume(b.moveKeys.leftKey, b.id, "locomotion.moveLeft");
              }
              if (b.moveKeys.rightKey && tokens.isDown(b.moveKeys.rightKey) && (!requireCleanMove || !tokens.isConsumed(b.moveKeys.rightKey))) {
                vx += 1;
                if (requireCleanMove) tokens.consume(b.moveKeys.rightKey, b.id, "locomotion.moveRight");
              }
              moveX += vx;
              moveY += vy;
            }
          }

          // Stick cursor in front when outside/exiting cursor mode on gamepad
          if (!isSteerCursorActive && b.stickCursorInFront && execCtx.gamepadStates) {
            const stickMag = gpLeftStick ? Math.hypot(gpLeftStick.x, gpLeftStick.y) : 0;
            const maxDist = b.cursorMaxDistance ?? 6.0;
            const minDist = b.cursorMinDistance ?? Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.5);
            const isAimingThrow = Boolean(char.isChargingThrow || char.isTriggerPullThrowing || isAimingTrajectory);

            let curDist: number;
            if (b.lockCursorDistanceToMax) {
              curDist = maxDist;
            } else if (stickMag > 0.08) {
              const normalizedMag = Math.min(1.0, (stickMag - 0.08) / 0.92);
              curDist = minDist + normalizedMag * (maxDist - minDist);
              if (isAimingThrow) {
                (char as any)._aimingThrowDist = curDist;
              }
            } else if (isAimingThrow && (char as any)._aimingThrowDist !== undefined) {
              // During throw aiming: if player releases stick to pull trigger, retain the intentional aim distance!
              curDist = (char as any)._aimingThrowDist;
            } else {
              // Outside aiming or at rest: cursor sits predictably and consistently at max clamp distance!
              curDist = maxDist;
              (char as any)._aimingThrowDist = undefined;
            }

            const facing = char.facingAngle ?? 0;
            targetAimPos.x = char.position.x + Math.cos(facing) * curDist;
            targetAimPos.y = char.position.y + Math.sin(facing) * curDist;
            if (execCtx.arena) {
              targetAimPos.x = Math.max(0.1, Math.min(execCtx.arena.width - 0.1, targetAimPos.x));
              targetAimPos.y = Math.max(0.1, Math.min(execCtx.arena.height - 0.1, targetAimPos.y));
            }
            const slot = input.gamepadSlots.get(execCtx.gamepadStates.slotIndex);
            if (slot) {
              slot.aimPos.x = targetAimPos.x;
              slot.aimPos.y = targetAimPos.y;
              slot.hasMovedAimStick = true;
              slot.aimMovedWhileInRange = true;
              if (!slot.aimOffset) slot.aimOffset = { x: 0, y: 0 };
              slot.aimOffset.x = slot.aimPos.x - char.position.x;
              slot.aimOffset.y = slot.aimPos.y - char.position.y;
            }
          }
          (char as any)._prevSteerCursorActive = isSteerCursorActive;

          // Jump: continuous jumping while button is held once touching ground,
          // unless explicitly configured with requireCleanPress: true in control schema.
          const jumpRequiresClean = b.jump?.requireCleanPress === true;
          if (jumpRequiresClean) {
            if (isSlotActive(b.jump, "down", true, b.id, "locomotion.jump")) {
              isJumpHeld = true;
              claimSlot(b.jump, b.id, "locomotion.jump", true);
            }
          } else {
            if (isSlotActive(b.jump, "hold", false, b.id, "locomotion.jump")) {
              isJumpHeld = true;
              claimSlot(b.jump, b.id, "locomotion.jump", false);
            }
          }

          // Sprint
          const isSprintHold = b.sprint?.mode !== "toggle";
          if (!isSprintHold) {
            // Toggle sprint mode
            if (isSlotActive(b.sprint, "down", false, b.id, "locomotion.sprintToggle")) {
              char.isSprinting = !char.isSprinting;
              claimSlot(b.sprint, b.id, "locomotion.sprintToggle", true);
            }
            if (char.isSprinting) isSprinting = true;
          } else {
            // Hold sprint mode: only active while sprint key/button is actively held
            if (isSlotActive(b.sprint, "hold", false, b.id, "locomotion.sprint")) {
              isSprinting = true;
              claimSlot(b.sprint, b.id, "locomotion.sprint", false);
            } else {
              isSprinting = false;
            }
            char.isSprinting = isSprinting;
          }
          break;
        }

        case "melee": {
          const b = block as MeleeControlBlock;
          if (isLaserAiming || isLaserFiring) {
            break;
          }
          if (isSlotActive(b.punch, "down", true, b.id, "melee.punch")) {
            isMeleeRequested = true;
            claimSlot(b.punch, b.id, "melee.punch", true);
          }
          break;
        }

        case "laser": {
          const b = block as LaserControlBlock;
          if (isLaserAiming) {
            claimSlot(b.aimTrigger, b.id, "laser.aim");
          }

          if (isLaserFiring) {
            claimSlot(b.fireTrigger, b.id, "laser.fire");
          }

          // Power Level adjustment
          if (b.powerLevel?.source === "mouseWheel" && isLaserAiming) {
            const rawDelta = input.aimLockRawDelta || input.arcModulationDeltaY || 0;
            if (rawDelta !== 0) {
              const sens = b.powerLevel.sensitivity || 0.05;
              const cur = this.getAccumulatorValue(b.id, 0.5);
              const next = Math.max(0.1, Math.min(1.0, cur + rawDelta * sens));
              this.setAccumulatorValue(b.id, next);
              char.laserPowerFraction = next;
            }
          }
          break;
        }

        case "throw": {
          const b = block as ThrowControlBlock;
          if (isLaserAiming || isLaserFiring) {
            char.isChargingThrow = false;
            char.isAimingWallClear = false;
            char.isHoldingThrowRelease = false;
            char.isTriggerPullThrowing = false;
            char.activeTrajectory = null;
            (char as any)._throwRequiresFreshPress = true;
            break;
          }
          if (!execCtx.isHoldingItem) {
            char.isChargingThrow = false;
            char.isAimingWallClear = false;
            char.isHoldingThrowRelease = false;
            char.isTriggerPullThrowing = false;
            char.activeTrajectory = null;
            (char as any)._pickupPressCode = null;
            break;
          }

          // If the button pressed to pick up or swap this item is STILL held down or releasing,
          // throw charging/aiming is strictly locked out until that button is fully released!
          const pickupCode = (char as any)._pickupPressCode;
          if (pickupCode) {
            const isDown = tokens.isDown(pickupCode);
            let analogVal = 0;
            if (pickupCode.startsWith("Gamepad")) {
              const btn = ControlSchemaArbiter.parseGamepadButtonCode(pickupCode);
              if (btn >= 0) {
                if (execCtx.gamepadStates?.getValue) {
                  analogVal = execCtx.gamepadStates.getValue(btn);
                } else if (execCtx.getGamepadButtonValue) {
                  analogVal = execCtx.getGamepadButtonValue(execCtx.gamepadStates?.slotIndex ?? 0, btn);
                }
              }
            }

            if (isDown || analogVal > 0.05) {
              char.isChargingThrow = false;
              char.isAimingWallClear = false;
              char.isHoldingThrowRelease = false;
              char.isTriggerPullThrowing = false;
              char.activeTrajectory = null;
              (char as any)._throwRequiresFreshPress = true;
              break;
            } else {
              // Physical release detected: clear the pickup lockout and require fresh press
              (char as any)._pickupPressCode = null;
              (char as any)._throwRequiresFreshPress = true;
              break;
            }
          }

          if ((char as any)._throwRequiresFreshPress) {
            const primarySlot = b.chargeTrigger || b.fireTrigger || b.quickTrigger;
            const triggerVal = getSlotAnalogValue(primarySlot);
            const isDown = isSlotActive(primarySlot, "down", false, b.id, "check");
            const isHold = isSlotActive(primarySlot, "hold", false, b.id, "check");
            if (triggerVal > 0.05 || isDown || isHold) {
              char.isChargingThrow = false;
              char.isAimingWallClear = false;
              char.isHoldingThrowRelease = false;
              char.isTriggerPullThrowing = false;
              char.activeTrajectory = null;
              break;
            } else {
              (char as any)._throwRequiresFreshPress = false;
            }
          }

          const effAim = getEffectiveAimPos();

          switch (b.mode) {
            case "chargeAndRelease": {
              if (isSlotActive(b.chargeTrigger, "hold", false, b.id, "throw.chargeBow")) {
                isAimingTrajectory = true;
                char.isChargingThrow = true;
                if (!char.throwChargeStartTime) {
                  char.throwChargeStartTime = now;
                }
                claimSlot(b.chargeTrigger, b.id, "throw.chargeBow", false);
              }

              // Auto-release fire on button / gate release
              if (isSlotAnyJustReleased(b.chargeTrigger) && char.isChargingThrow) {
                const aimDx = effAim.x - char.position.x;
                const aimDy = effAim.y - char.position.y;
                const distToAim = Math.hypot(aimDx, aimDy);
                const cancelDistance = b.cancelRadius ?? Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

                if (b.enableProximityCancel && distToAim < cancelDistance) {
                  isThrow = false;
                  char.isChargingThrow = false;
                  char.throwChargeStartTime = null;
                  char.throwChargeProgress = 0;
                  char.activeTrajectory = null;
                  char.isThrowCancelZone = false;
                  claimSlot(b.chargeTrigger, b.id, "throw.cancel", false);
                } else {
                  isThrow = true;
                  char.isChargingThrow = false;
                  char.throwChargeStartTime = null;
                  char.isThrowCancelZone = false;
                  claimSlot(b.chargeTrigger, b.id, "throw.fire", true);
                }
              }
              break;
            }

            case "holdAndRelease": {
              // Hold to preview lowest energy trajectory that reaches target without charging, release to fire
              if (isSlotActive(b.chargeTrigger, "hold", false, b.id, "throw.holdAndRelease")) {
                isAimingTrajectory = true;
                char.isHoldingThrowRelease = true;
                char.hasUserSetArcRatio = false;
                if (char.throwModule) {
                  char.throwModule.hasUserSetArcRatio = false;
                }
                claimSlot(b.chargeTrigger, b.id, "throw.holdAndRelease", false);
              }

              if (isSlotAnyJustReleased(b.chargeTrigger) && char.isHoldingThrowRelease) {
                const aimDx = effAim.x - char.position.x;
                const aimDy = effAim.y - char.position.y;
                const distToAim = Math.hypot(aimDx, aimDy);
                const cancelDistance = b.cancelRadius ?? Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

                if (b.enableProximityCancel && distToAim < cancelDistance) {
                  isThrow = false;
                  char.isHoldingThrowRelease = false;
                  char.activeTrajectory = null;
                  char.isThrowCancelZone = false;
                  claimSlot(b.chargeTrigger, b.id, "throw.cancel", false);
                } else {
                  isThrow = true;
                  char.isHoldingThrowRelease = false;
                  char.isThrowCancelZone = false;
                  claimSlot(b.chargeTrigger, b.id, "throw.fire", true);
                }
              }
              break;
            }

            case "aimAndFire": {
              if (isSlotActive(b.aimTrigger, "hold", false, b.id, "throw.aim")) {
                isAimingTrajectory = true;
                claimSlot(b.aimTrigger, b.id, "throw.aim", false);
              }

              if (isSlotActive(b.fireTrigger, "down", true, b.id, "throw.fire")) {
                isThrow = true;
                claimSlot(b.fireTrigger, b.id, "throw.fire", true);
              }

              // Arc Height Modulation
              if (b.arcModulation && b.arcModulation.source !== "none" && isAimingTrajectory) {
                const isMouseDelta = b.arcModulation.source === "mouseDeltaY";
                if (isMouseDelta && b.arcModulation.autoCursorLock) {
                  activeRawDragThisFrame = true;
                  if (!input.isRawDragging) {
                    ModularBlockEvaluator.activeRawDragBlockId = b.id;
                    input.beginRawDrag((_dx, dy) => {
                      const sens = b.arcModulation?.sensitivity || 0.005;
                      const cur = this.getAccumulatorValue(b.id, 0.5);
                      const next = Math.max(0.0, Math.min(1.0, cur - dy * sens));
                      this.setAccumulatorValue(b.id, next);
                      if (char.throwModule) {
                        char.throwModule.savedArcRatio = next;
                        char.throwModule.hasUserSetArcRatio = true;
                      }
                      char.savedArcRatio = next;
                      char.hasUserSetArcRatio = true;
                    });
                  }
                } else if (b.arcModulation.source === "mouseWheel") {
                  const rawDelta = input.aimLockRawDelta || input.arcModulationDeltaY || 0;
                  if (rawDelta !== 0) {
                    const sens = b.arcModulation.sensitivity || 0.05;
                    const cur = this.getAccumulatorValue(b.id, 0.5);
                    const next = Math.max(0.0, Math.min(1.0, cur + rawDelta * sens));
                    this.setAccumulatorValue(b.id, next);
                    if (char.throwModule) {
                      char.throwModule.savedArcRatio = next;
                      char.throwModule.hasUserSetArcRatio = true;
                    }
                    char.savedArcRatio = next;
                    char.hasUserSetArcRatio = true;
                  }
                }
              }
              break;
            }

            case "quickOptimal": {
              if (isSlotActive(b.quickTrigger, "down", true, b.id, "throw.fire")) {
                char.hasUserSetArcRatio = false;
                if (char.throwModule) {
                  char.throwModule.hasUserSetArcRatio = false;
                }
                isThrow = true;
                claimSlot(b.quickTrigger, b.id, "throw.fire", true);
              }
              break;
            }

            case "quickWallClear": {
              if (isSlotActive(b.quickTrigger, "down", true, b.id, "throw.fire") && execCtx.arena) {
                ThrowCapability.findLowestEnergyWallClearTrajectory(
                  char,
                  execCtx.arena,
                  effAim.x,
                  effAim.y,
                  execCtx.arena.entities,
                  false,
                  input.lockedAimPos,
                  0
                );
                isThrow = true;
                claimSlot(b.quickTrigger, b.id, "throw.fire", true);
              }
              break;
            }

            case "aimWallClear": {
              if (isSlotActive(b.aimTrigger, "hold", false, b.id, "throw.aimWallClear")) {
                isAimingTrajectory = true;
                char.isAimingWallClear = true;
                claimSlot(b.aimTrigger, b.id, "throw.aimWallClear", false);
              }

              if (isSlotAnyJustReleased(b.aimTrigger) && char.isAimingWallClear) {
                const aimDx = effAim.x - char.position.x;
                const aimDy = effAim.y - char.position.y;
                const distToAim = Math.hypot(aimDx, aimDy);
                const cancelDistance = b.cancelRadius ?? Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

                if (b.enableProximityCancel && distToAim < cancelDistance) {
                  isThrow = false;
                  char.isAimingWallClear = false;
                  char.activeTrajectory = null;
                  char.isThrowCancelZone = false;
                  claimSlot(b.aimTrigger, b.id, "throw.cancel", false);
                } else {
                  isThrow = true;
                  char.isAimingWallClear = false;
                  char.isThrowCancelZone = false;
                  claimSlot(b.aimTrigger, b.id, "throw.fire", true);
                }
              }
              break;
            }

            case "triggerPullForce": {
              const triggerVal = getSlotAnalogValue(b.chargeTrigger);
              const margin = b.triggerMargin ?? 0.15;
              const isTouchingTrigger = triggerVal > 0.05;

              if (isTouchingTrigger) {
                isAimingTrajectory = true;
                char.isTriggerPullThrowing = true;
                const forceFraction = triggerVal <= margin
                  ? 0.0
                  : Math.min(1.0, (triggerVal - margin) / (1.0 - margin));
                char.triggerThrowPower = forceFraction;
                claimSlot(b.chargeTrigger, b.id, "throw.triggerPull", false);
              }

              const isReleased = isSlotAnyJustReleased(b.chargeTrigger) || (!isTouchingTrigger && Boolean(char.isTriggerPullThrowing));
              if (isReleased && char.isTriggerPullThrowing) {
                const aimDx = effAim.x - char.position.x;
                const aimDy = effAim.y - char.position.y;
                const distToAim = Math.hypot(aimDx, aimDy);
                const cancelDistance = b.cancelRadius ?? Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

                if (b.enableProximityCancel && distToAim < cancelDistance) {
                  isThrow = false;
                  char.isTriggerPullThrowing = false;
                  char.triggerThrowPower = 0;
                  char.activeTrajectory = null;
                  char.isThrowCancelZone = false;
                  claimSlot(b.chargeTrigger, b.id, "throw.cancel", false);
                } else {
                  isThrow = true;
                  char.isTriggerPullThrowing = false;
                  char.isThrowCancelZone = false;
                  claimSlot(b.chargeTrigger, b.id, "throw.fire", true);
                }
              }
              break;
            }
          }
          break;
        }

        case "itemInteraction": {
          const b = block as ItemInteractionControlBlock;
          if (isLaserAiming || isLaserFiring) {
            break;
          }

          // Pickup
          if (isSlotActive(b.pickup, "down", true, b.id, "pickup.grab")) {
            if (!execCtx.isHoldingItem && grabTargetObjectId) {
              isGrabHeld = true;
              if (b.pickup?.code) { (char as any)._pickupPressCode = b.pickup.code; (char as any)._throwRequiresFreshPress = true; }
              claimSlot(b.pickup, b.id, "pickup.grab", true);
            }
          }

          // Additional Pickup
          if (b.additionalPickup && isSlotActive(b.additionalPickup, "down", true, b.id, "pickup.grab")) {
            if (!execCtx.isHoldingItem && grabTargetObjectId) {
              isGrabHeld = true;
              if (b.additionalPickup?.code) { (char as any)._pickupPressCode = b.additionalPickup.code; (char as any)._throwRequiresFreshPress = true; }
              claimSlot(b.additionalPickup, b.id, "pickup.grab", true);
            }
          }

          // Drop
          if (execCtx.isHoldingItem && isSlotActive(b.drop, "down", true, b.id, "pickup.drop")) {
            isDrop = true;
            (char as any)._pickupPressCode = null;
            claimSlot(b.drop, b.id, "pickup.drop", true);
          }

          // Swap
          if (isSlotActive(b.swap, "down", true, b.id, "pickup.swap")) {
            if (b.swapRequiresHolding && !execCtx.isHoldingItem) {
              // Denied: user configured swap to require holding an item
            } else if (execCtx.isHoldingItem) {
              // Swap key must NOT drop or trigger unless another object is near enough to swap it with!
              if (grabTargetObjectId) {
                isSwap = true;
                if (b.swap?.code) { (char as any)._pickupPressCode = b.swap.code; (char as any)._throwRequiresFreshPress = true; }
                claimSlot(b.swap, b.id, "pickup.swap", true);
              }
            } else if (b.triggerPickupWhenEmptyHanded && grabTargetObjectId) {
              isSwap = true;
              isGrabHeld = true;
              if (b.swap?.code) { (char as any)._pickupPressCode = b.swap.code; (char as any)._throwRequiresFreshPress = true; }
              claimSlot(b.swap, b.id, "pickup.swap", true);
            }
          }

          // Consume / Eat
          if (execCtx.heldItemIsEdible && isSlotActive(b.consume, "hold", false, b.id, "consume.bite")) {
            isUsingItem = true;
            claimSlot(b.consume, b.id, "consume.bite", false);
          }
          break;
        }

        case "facing": {
          const b = block as FacingControlBlock;
          // Right stick MUST NOT control direction anywhere
          // Left stick should not change character direction when moving cursor
          if (isSteerCursorActive || char.isSteeringCursor) {
            break;
          }
          const locoBlock = execCtx.schema?.gamepad?.blocks?.find((blk) => blk.enabled && blk.type === "locomotion") as LocomotionControlBlock | undefined;
          if (locoBlock?.mode === "stickDirectionDriveButton") {
            // Facing is already set by left stick heading in locomotion block
            break;
          }
          if (execCtx.gamepadStates) {
            const gpLeftStick = (execCtx.gamepadStates as any)?.leftStick ?? execCtx.getGamepadAxis(0, "LeftStick");
            if (gpLeftStick && Math.hypot(gpLeftStick.x, gpLeftStick.y) > 0.08) {
              char.facingAngle = Math.atan2(gpLeftStick.y, gpLeftStick.x);
            } else if (Math.hypot(moveX, moveY) > 0.05) {
              char.facingAngle = Math.atan2(moveY, moveX);
            }
          } else if (b.mode === "mouseWorldPos") {
            const aimDx = targetAimPos.x - char.position.x;
            const aimDy = targetAimPos.y - char.position.y;
            if (Math.hypot(aimDx, aimDy) > 0.05) {
              char.facingAngle = Math.atan2(aimDy, aimDx);
            }
          } else if (b.mode === "fromMovement") {
            if (Math.hypot(moveX, moveY) > 0.05) {
              char.facingAngle = Math.atan2(moveY, moveX);
            }
          }
          break;
        }
      }
    }

    // Release pointer lock if no block needed raw dragging this frame
    if (!activeRawDragThisFrame && input.isRawDragging && this.activeRawDragBlockId) {
      input.endRawDrag();
      this.activeRawDragBlockId = null;
    }

    // Sync character intent states
    char.isAimingTrajectory = isAimingTrajectory;
    char.isLaserAiming = isLaserAiming;
    char.isLaserFiring = isLaserFiring;
    char.isMeleeRequested = isMeleeRequested;

    // Face toward aim target if aiming trajectory, laser, or melee:
    // In Cursor Mode (or Mouse/Keyboard): character faces towards cursor.
    // In Raw Direction Mode on Gamepad: character strictly maintains stick-directed facing angle.
    if (isLaserAiming || isLaserFiring || isMeleeRequested || isAimingTrajectory) {
      if (isSteerCursorActive || char.isSteeringCursor) {
        const aimDx = targetAimPos.x - char.position.x;
        const aimDy = targetAimPos.y - char.position.y;
        if (Math.hypot(aimDx, aimDy) > 0.05) {
          char.facingAngle = Math.atan2(aimDy, aimDx);
          if (isAimingTrajectory) {
            char.lastThrowAimAngle = char.facingAngle;
          }
        }
      } else if (!execCtx.gamepadStates) {
        const aimDx = targetAimPos.x - char.position.x;
        const aimDy = targetAimPos.y - char.position.y;
        if (Math.hypot(aimDx, aimDy) > 0.05) {
          char.facingAngle = Math.atan2(aimDy, aimDx);
          if (isAimingTrajectory) {
            char.lastThrowAimAngle = char.facingAngle;
          }
        }
      }
    }

    // Normalize movement vector if diagonal/stick exceeded 1.0
    const moveLen = Math.hypot(moveX, moveY);
    if (moveLen > 1.0) {
      moveX /= moveLen;
      moveY /= moveLen;
    }

    // When the creature stops moving, sprint naturally cancels (matches keyboard mode)
    if (moveLen < 0.05) {
      isSprinting = false;
      char.isSprinting = false;
    }

    const isAiming = !isEditMode && (isLaserAiming || isAimingTrajectory);
    const kLaunchVel = isThrow && char.activeTrajectory?.launchVel ? char.activeTrajectory.launchVel : undefined;
    const kLaunchPos = isThrow && char.activeTrajectory?.launchPos ? char.activeTrajectory.launchPos : undefined;

    const finalAimPos = getEffectiveAimPos();
    const isRawDirectionMode = !isSteerCursorActive && !char.isSteeringCursor && Boolean(execCtx.gamepadStates);
    let meleeAimDirX: number;
    let meleeAimDirY: number;

    if (isRawDirectionMode) {
      const rawAngle = char.facingAngle ?? 0;
      meleeAimDirX = Math.cos(rawAngle);
      meleeAimDirY = Math.sin(rawAngle);
    } else {
      const meleeDx = finalAimPos.x - char.position.x;
      const meleeDy = finalAimPos.y - char.position.y;
      const meleeDist = Math.hypot(meleeDx, meleeDy) || 1;
      meleeAimDirX = meleeDx / meleeDist;
      meleeAimDirY = meleeDy / meleeDist;
    }

    return {
      playerId: execCtx.gamepadStates ? `gamepad-${execCtx.gamepadStates.slotIndex}` : "keyboard",
      playerName: char.name,
      moveX,
      moveY,
      isSprinting: isSprinting,
      isJumpHeld,
      isGrabHeld,
      grabTargetObjectId: (isGrabHeld || isSwap) ? grabTargetObjectId : null,
      isDrop,
      isThrow,
      isSwap,
      isUsingItem,
      isLaserAiming,
      isLaserFiring,
      laserAimX: finalAimPos.x,
      laserAimY: finalAimPos.y,
      laserPowerFraction: char.laserPowerFraction ?? 1.0,
      isMeleeRequested,
      meleeAimDirX,
      meleeAimDirY,
      meleeAimX: finalAimPos.x,
      meleeAimY: finalAimPos.y,
      aimX: finalAimPos.x,
      aimY: finalAimPos.y,
      isAiming,
      isLockHeld: false,
      lockedAimPos: null,
      aimLockDelta: 0,
      facingAngle: char.facingAngle ?? 0,
      ...(kLaunchVel
        ? {
            launchVx: kLaunchVel.vx,
            launchVy: kLaunchVel.vy,
            launchVz: kLaunchVel.vz,
          }
        : {}),
      ...(kLaunchPos
        ? {
            launchStartX: kLaunchPos.x,
            launchStartY: kLaunchPos.y,
            launchStartZ: kLaunchPos.z,
          }
        : {}),
    } as any;
  }
}
