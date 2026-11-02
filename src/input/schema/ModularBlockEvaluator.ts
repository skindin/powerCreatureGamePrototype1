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
    tokens.update(currentDownKeys, now);

    const isCodeJustReleased = (c: string): boolean => {
      if (c.startsWith("Mouse")) {
        const idx = c === "MouseLeft" ? 0 : c === "MouseMiddle" ? 1 : c === "MouseRight" ? 2 : -1;
        return idx >= 0 ? execCtx.mouseStates?.justReleased(idx) ?? false : false;
      }
      return execCtx.keyStates?.justReleased(c) ?? false;
    };

    const isSlotActive = (
      slot: BlockInputSlot | undefined | null,
      triggerMode: "down" | "hold" | "up" = "down",
      requireClean: boolean = true,
      blockId: string = "",
      intent: string = ""
    ): boolean => {
      if (!slot || !slot.code) return false;
      // All gate modifier buttons must be currently down
      if (slot.gateButtons && slot.gateButtons.length > 0) {
        const allGatesDown = slot.gateButtons.every((g) => tokens.isDown(g));
        if (!allGatesDown) return false;
      }
      if (triggerMode === "hold") {
        return tokens.isDown(slot.code) && (!requireClean || !tokens.isConsumed(slot.code));
      } else if (triggerMode === "down") {
        if (!tokens.isDown(slot.code)) return false;
        if (tokens.isConsumed(slot.code)) return false;
        if (requireClean) {
          return tokens.canExecute(slot.code, "requireCleanPress", blockId, intent);
        }
        return true;
      } else if (triggerMode === "up") {
        return isCodeJustReleased(slot.code);
      }
      return false;
    };

    const isSlotAnyJustReleased = (slot?: BlockInputSlot | null): boolean => {
      if (!slot || !slot.code) return false;
      if (isCodeJustReleased(slot.code)) return true;
      if (slot.gateButtons && slot.gateButtons.some(isCodeJustReleased)) return true;
      return false;
    };

    const claimSlot = (slot: BlockInputSlot | undefined | null, blockId: string, intent: string): void => {
      if (!slot || !slot.code) return;
      tokens.claim(slot.code, blockId, intent);
      if (slot.gateButtons) {
        for (const g of slot.gateButtons) {
          tokens.claim(g, blockId, intent);
        }
      }
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

    // Scan for nearby grabbable objects for pickup and swap
    const grabTargetObjectId = execCtx.targetInReach ? execCtx.targetInReach.id : null;

    // Process blocks in order
    for (const block of blocks) {
      if (!block.enabled) continue;

      switch (block.type) {
        case "locomotion": {
          const b = block as LocomotionControlBlock;
          if (b.mode === "walkToMouse") {
            // Update facing angle toward mouse cursor
            const aimDx = input.actualMousePos.x - char.position.x;
            const aimDy = input.actualMousePos.y - char.position.y;
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
              let vx = 0;
              let vy = 0;
              if (b.moveKeys.upKey && tokens.isDown(b.moveKeys.upKey)) vy -= 1;
              if (b.moveKeys.downKey && tokens.isDown(b.moveKeys.downKey)) vy += 1;
              if (b.moveKeys.leftKey && tokens.isDown(b.moveKeys.leftKey)) vx -= 1;
              if (b.moveKeys.rightKey && tokens.isDown(b.moveKeys.rightKey)) vx += 1;
              moveX += vx;
              moveY += vy;
            }
          }

          // Jump
          if (isSlotActive(b.jump, "down", true, b.id, "locomotion.jump")) {
            isJumpHeld = true;
            claimSlot(b.jump, b.id, "locomotion.jump");
          }

          // Sprint
          if (b.sprint?.mode === "toggle") {
            if (isSlotActive(b.sprint, "down", false, b.id, "locomotion.sprintToggle")) {
              char.isSprinting = !char.isSprinting;
              claimSlot(b.sprint, b.id, "locomotion.sprintToggle");
            }
            if (char.isSprinting) isSprinting = true;
          } else {
            if (isSlotActive(b.sprint, "hold", false, b.id, "locomotion.sprint")) {
              isSprinting = true;
              claimSlot(b.sprint, b.id, "locomotion.sprint");
            }
          }
          break;
        }

        case "melee": {
          const b = block as MeleeControlBlock;
          if (isSlotActive(b.punch, "down", true, b.id, "melee.punch")) {
            isMeleeRequested = true;
            claimSlot(b.punch, b.id, "melee.punch");
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
          if (!execCtx.isHoldingItem) break;

          switch (b.mode) {
            case "chargeAndRelease": {
              if (isSlotActive(b.chargeTrigger, "hold", true, b.id, "throw.chargeBow")) {
                isAimingTrajectory = true;
                char.isChargingThrow = true;
                if (!char.throwChargeStartTime) {
                  char.throwChargeStartTime = now;
                }
                claimSlot(b.chargeTrigger, b.id, "throw.chargeBow");
              }

              // Auto-release fire on button / gate release
              if (isSlotAnyJustReleased(b.chargeTrigger) && char.isChargingThrow) {
                const aimDx = input.actualMousePos.x - char.position.x;
                const aimDy = input.actualMousePos.y - char.position.y;
                const distToAim = Math.hypot(aimDx, aimDy);
                const cancelDistance = Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

                if (distToAim < cancelDistance) {
                  isThrow = false;
                  char.isChargingThrow = false;
                  char.throwChargeStartTime = null;
                  char.throwChargeProgress = 0;
                  char.activeTrajectory = null;
                  char.isThrowCancelZone = false;
                  claimSlot(b.chargeTrigger, b.id, "throw.cancel");
                } else {
                  isThrow = true;
                  char.isChargingThrow = false;
                  char.throwChargeStartTime = null;
                  claimSlot(b.chargeTrigger, b.id, "throw.fire");
                }
              }
              break;
            }

            case "aimAndFire": {
              if (isSlotActive(b.aimTrigger, "hold", true, b.id, "throw.aim")) {
                isAimingTrajectory = true;
                claimSlot(b.aimTrigger, b.id, "throw.aim");
              }

              if (isSlotActive(b.fireTrigger, "down", true, b.id, "throw.fire")) {
                isThrow = true;
                claimSlot(b.fireTrigger, b.id, "throw.fire");
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
                claimSlot(b.quickTrigger, b.id, "throw.fire");
              }
              break;
            }

            case "quickWallClear": {
              if (isSlotActive(b.quickTrigger, "down", true, b.id, "throw.fire") && execCtx.arena) {
                ThrowCapability.findLowestEnergyWallClearTrajectory(
                  char,
                  execCtx.arena,
                  input.actualMousePos.x,
                  input.actualMousePos.y,
                  execCtx.arena.entities,
                  false,
                  input.lockedAimPos,
                  0
                );
                isThrow = true;
                claimSlot(b.quickTrigger, b.id, "throw.fire");
              }
              break;
            }

            case "aimWallClear": {
              if (isSlotActive(b.aimTrigger, "hold", true, b.id, "throw.aimWallClear")) {
                isAimingTrajectory = true;
                char.isAimingWallClear = true;
                claimSlot(b.aimTrigger, b.id, "throw.aimWallClear");
              }

              if (isSlotAnyJustReleased(b.aimTrigger) && char.isAimingWallClear) {
                const aimDx = input.actualMousePos.x - char.position.x;
                const aimDy = input.actualMousePos.y - char.position.y;
                const distToAim = Math.hypot(aimDx, aimDy);
                const cancelDistance = Math.max(1.0, (char.colliderRadius ?? 0.35) + 0.65);

                if (distToAim < cancelDistance) {
                  isThrow = false;
                  char.isAimingWallClear = false;
                  char.activeTrajectory = null;
                  char.isThrowCancelZone = false;
                  claimSlot(b.aimTrigger, b.id, "throw.cancel");
                } else {
                  isThrow = true;
                  char.isAimingWallClear = false;
                  claimSlot(b.aimTrigger, b.id, "throw.fire");
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
            if (!execCtx.isHoldingItem) {
              isGrabHeld = true;
              claimSlot(b.pickup, b.id, "pickup.grab");
            }
          }

          // Additional Pickup
          if (b.additionalPickup && isSlotActive(b.additionalPickup, "down", true, b.id, "pickup.grab")) {
            if (!execCtx.isHoldingItem) {
              isGrabHeld = true;
              claimSlot(b.additionalPickup, b.id, "pickup.grab");
            }
          }

          // Drop
          if (execCtx.isHoldingItem && isSlotActive(b.drop, "down", true, b.id, "pickup.drop")) {
            isDrop = true;
            claimSlot(b.drop, b.id, "pickup.drop");
          }

          // Swap
          if (isSlotActive(b.swap, "down", true, b.id, "pickup.swap")) {
            if (b.swapRequiresHolding && !execCtx.isHoldingItem) {
              // Denied: user configured swap to require holding an item
            } else {
              isSwap = true;
              // If empty-handed and allowed, trigger pickup
              if (!execCtx.isHoldingItem && b.triggerPickupWhenEmptyHanded) {
                isGrabHeld = true;
              }
              claimSlot(b.swap, b.id, "pickup.swap");
            }
          }

          // Consume / Eat
          if (execCtx.heldItemIsEdible && isSlotActive(b.consume, "hold", true, b.id, "consume.bite")) {
            isUsingItem = true;
            claimSlot(b.consume, b.id, "consume.bite");
          }
          break;
        }

        case "facing": {
          const b = block as FacingControlBlock;
          if (b.mode === "mouseWorldPos") {
            const aimDx = input.actualMousePos.x - char.position.x;
            const aimDy = input.actualMousePos.y - char.position.y;
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

    // Face toward mouse if aiming trajectory, laser, or melee
    if (isLaserAiming || isLaserFiring || isMeleeRequested || isAimingTrajectory) {
      const aimDx = input.actualMousePos.x - char.position.x;
      const aimDy = input.actualMousePos.y - char.position.y;
      if (Math.hypot(aimDx, aimDy) > 0.05) {
        char.facingAngle = Math.atan2(aimDy, aimDx);
        if (isAimingTrajectory) {
          char.lastThrowAimAngle = char.facingAngle;
        }
      }
    }

    const isMouseAiming = !isEditMode && (isLaserAiming || isAimingTrajectory);
    const kLaunchVel = isThrow && char.activeTrajectory?.launchVel ? char.activeTrajectory.launchVel : undefined;
    const kLaunchPos = isThrow && char.activeTrajectory?.launchPos ? char.activeTrajectory.launchPos : undefined;

    const meleeDx = input.actualMousePos.x - char.position.x;
    const meleeDy = input.actualMousePos.y - char.position.y;
    const meleeDist = Math.hypot(meleeDx, meleeDy) || 1;

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
      meleeAimDirX: meleeDx / meleeDist,
      meleeAimDirY: meleeDy / meleeDist,
      meleeAimX: input.actualMousePos.x,
      meleeAimY: input.actualMousePos.y,
      aimX: input.actualMousePos.x,
      aimY: input.actualMousePos.y,
      isAiming: isMouseAiming,
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
