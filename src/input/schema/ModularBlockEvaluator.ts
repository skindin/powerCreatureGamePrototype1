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

    const tokens = InputPressTokenManager.getInstance();
    const currentDownKeys = new Set<string>(input.getActiveKeys());
    if (execCtx.isMouseButtonDown(0)) currentDownKeys.add("MouseLeft");
    if (execCtx.isMouseButtonDown(1)) currentDownKeys.add("MouseMiddle");
    if (execCtx.isMouseButtonDown(2)) currentDownKeys.add("MouseRight");

    // Gamepad button edge registration
    if (execCtx.gamepadStates) {
      for (let b = 0; b <= 16; b++) {
        if (execCtx.gamepadStates.isDown(b)) {
          const gpCode = ControlSchemaArbiter.formatGamepadButtonIndex(b);
          currentDownKeys.add(gpCode);
        }
      }
    } else if (execCtx.isGamepadButtonDown) {
      for (let b = 0; b <= 16; b++) {
        if (execCtx.isGamepadButtonDown(0, b)) {
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
        intent.includes("laser.fire")
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

      // If the button press was consumed by another module (e.g. pickup claimed LMB),
      // no other block can hold or trigger on it until physically released!
      if (tokens.isConsumed(slot.code)) {
        if (!tokens.isClaimedBy(slot.code, blockId) || requireClean) {
          return false;
        }
      }

      if (triggerMode === "hold") {
        return tokens.isDown(slot.code);
      } else if (triggerMode === "down") {
        if (!tokens.isDown(slot.code)) return false;
        if (requireClean) {
          return tokens.canExecute(slot.code, "requireCleanPress", blockId, intent);
        }
        return true;
      } else if (triggerMode === "up") {
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

    // Scan for nearby grabbable objects for pickup and swap
    const grabTargetObjectId = execCtx.targetInReach ? execCtx.targetInReach.id : null;

    // Process blocks in order
    for (const block of blocks) {
      if (!block.enabled) continue;

      switch (block.type) {
        case "locomotion": {
          const b = block as LocomotionControlBlock;
          const gpLeftStick = (execCtx.gamepadStates as any)?.leftStick ?? execCtx.getGamepadAxis(0, "LeftStick");

          // Cursor steer toggle handling
          const isToggleMode = b.cursorSteerMode === "toggleButton";
          if (isToggleMode && b.cursorSteerTrigger) {
            if (isSlotActive(b.cursorSteerTrigger, "down", true, b.id, "locomotion.cursorSteerToggle")) {
              char.isCursorModeActive = !char.isCursorModeActive;
              claimSlot(b.cursorSteerTrigger, b.id, "locomotion.cursorSteerToggle", true);
            }
          }

          isSteerCursorActive =
            (b.cursorSteerMode === "toggleButton" && Boolean(char.isCursorModeActive)) ||
            (b.cursorSteerMode === "whenHoldingButton" && isSlotActive(b.cursorSteerTrigger, "hold", false, b.id, "locomotion.cursorSteer")) ||
            (b.cursorSteerMode === "whenAiming" && isAimingTrajectory);

          char.isSteeringCursor = isSteerCursorActive;

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
            // In cursor mode: STRICTLY no translation forward!
            moveX = 0;
            moveY = 0;
          } else if (b.mode === "analogStick") {
            // Direct Analog Left Stick movement
            if (gpLeftStick && Math.hypot(gpLeftStick.x, gpLeftStick.y) > 0.08) {
              moveX += gpLeftStick.x;
              moveY += gpLeftStick.y;
            }
          } else if (b.mode === "stickDirectionDriveButton") {
            const stickMag = gpLeftStick ? Math.hypot(gpLeftStick.x, gpLeftStick.y) : 0;
            if (stickMag > 0.08) {
              char.facingAngle = Math.atan2(gpLeftStick.y, gpLeftStick.x);
            }
            const fwdActive = isSlotActive(b.forwardTrigger, "hold", false, b.id, "locomotion.forwardDrive");
            if (fwdActive) {
              const driveSpeed = stickMag > 0.08 ? Math.min(1.0, stickMag) : 1.0;
              moveX += Math.cos(char.facingAngle) * driveSpeed;
              moveY += Math.sin(char.facingAngle) * driveSpeed;
              claimSlot(b.forwardTrigger, b.id, "locomotion.forwardDrive", false);
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

          // Jump
          if (isSlotActive(b.jump, "down", true, b.id, "locomotion.jump")) {
            isJumpHeld = true;
            claimSlot(b.jump, b.id, "locomotion.jump", true);
          }

          // Sprint
          if (b.sprint?.mode === "toggle") {
            if (isSlotActive(b.sprint, "down", false, b.id, "locomotion.sprintToggle")) {
              char.isSprinting = !char.isSprinting;
              claimSlot(b.sprint, b.id, "locomotion.sprintToggle", true);
            }
            if (char.isSprinting) isSprinting = true;
          } else {
            if (isSlotActive(b.sprint, "hold", false, b.id, "locomotion.sprint")) {
              isSprinting = true;
              claimSlot(b.sprint, b.id, "locomotion.sprint", false);
            }
          }
          break;
        }

        case "melee": {
          const b = block as MeleeControlBlock;
          if (isSlotActive(b.punch, "down", true, b.id, "melee.punch")) {
            isMeleeRequested = true;
            claimSlot(b.punch, b.id, "melee.punch", true);
          }
          break;
        }

        case "laser": {
          const b = block as LaserControlBlock;
          if (isSlotActive(b.aimTrigger, "hold", false, b.id, "laser.aim")) {
            isLaserAiming = true;
            claimSlot(b.aimTrigger, b.id, "laser.aim");
          }

          if (isLaserAiming && b.fireTrigger?.autoFireWhenAiming) {
            isLaserFiring = true;
          } else if (isSlotActive(b.fireTrigger, "hold", false, b.id, "laser.fire")) {
            isLaserFiring = true;
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
          if (!execCtx.isHoldingItem) {
            char.isChargingThrow = false;
            char.isAimingWallClear = false;
            char.isHoldingThrowRelease = false;
            char.isTriggerPullThrowing = false;
            char.activeTrajectory = null;
            (char as any)._pickupPressCode = null;
            break;
          }

          // If the button pressed to pick up or swap this item is STILL held down,
          // throw charging/aiming is strictly locked out until that button is fully released!
          const pickupCode = (char as any)._pickupPressCode;
          if (pickupCode) {
            if (tokens.isDown(pickupCode)) {
              char.isChargingThrow = false;
              char.isAimingWallClear = false;
              char.isHoldingThrowRelease = false;
              char.isTriggerPullThrowing = false;
              char.activeTrajectory = null;
              break;
            } else {
              // Physical release detected: clear the pickup lockout
              (char as any)._pickupPressCode = null;
            }
          }

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
                const aimDx = targetAimPos.x - char.position.x;
                const aimDy = targetAimPos.y - char.position.y;
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
                const aimDx = targetAimPos.x - char.position.x;
                const aimDy = targetAimPos.y - char.position.y;
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
                  targetAimPos.x,
                  targetAimPos.y,
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
                const aimDx = targetAimPos.x - char.position.x;
                const aimDy = targetAimPos.y - char.position.y;
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
                const aimDx = targetAimPos.x - char.position.x;
                const aimDy = targetAimPos.y - char.position.y;
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

          // Pickup
          if (isSlotActive(b.pickup, "down", true, b.id, "pickup.grab")) {
            if (!execCtx.isHoldingItem && grabTargetObjectId) {
              isGrabHeld = true;
              if (b.pickup?.code) (char as any)._pickupPressCode = b.pickup.code;
              claimSlot(b.pickup, b.id, "pickup.grab", true);
            }
          }

          // Additional Pickup
          if (b.additionalPickup && isSlotActive(b.additionalPickup, "down", true, b.id, "pickup.grab")) {
            if (!execCtx.isHoldingItem && grabTargetObjectId) {
              isGrabHeld = true;
              if (b.additionalPickup?.code) (char as any)._pickupPressCode = b.additionalPickup.code;
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
                if (b.swap?.code) (char as any)._pickupPressCode = b.swap.code;
                claimSlot(b.swap, b.id, "pickup.swap", true);
              }
            } else if (b.triggerPickupWhenEmptyHanded && grabTargetObjectId) {
              isSwap = true;
              isGrabHeld = true;
              if (b.swap?.code) (char as any)._pickupPressCode = b.swap.code;
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

    // Face toward aim target if aiming trajectory, laser, or melee
    if (isLaserAiming || isLaserFiring || isMeleeRequested || isAimingTrajectory) {
      if (!isSteerCursorActive && !char.isSteeringCursor) {
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

    const isAiming = !isEditMode && (isLaserAiming || isAimingTrajectory);
    const kLaunchVel = isThrow && char.activeTrajectory?.launchVel ? char.activeTrajectory.launchVel : undefined;
    const kLaunchPos = isThrow && char.activeTrajectory?.launchPos ? char.activeTrajectory.launchPos : undefined;

    const meleeDx = targetAimPos.x - char.position.x;
    const meleeDy = targetAimPos.y - char.position.y;
    const meleeDist = Math.hypot(meleeDx, meleeDy) || 1;

    return {
      playerId: execCtx.gamepadStates ? `gamepad-${execCtx.gamepadStates.slotIndex}` : "keyboard",
      playerName: char.name,
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
      laserAimX: targetAimPos.x,
      laserAimY: targetAimPos.y,
      laserPowerFraction: char.laserPowerFraction ?? 1.0,
      isMeleeRequested,
      meleeAimDirX: meleeDx / meleeDist,
      meleeAimDirY: meleeDy / meleeDist,
      meleeAimX: targetAimPos.x,
      meleeAimY: targetAimPos.y,
      aimX: targetAimPos.x,
      aimY: targetAimPos.y,
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
