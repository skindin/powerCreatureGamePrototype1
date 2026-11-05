import type {
  ControlBlock,
  ControlExecutionContext,
  BlockInputSlot,
  WalkSprintControlBlock,
  RollMovementControlBlock,
  JumpControlBlock,
  MeleeControlBlock,
  LaserControlBlock,
  ThrowControlBlock,
  ItemInteractionControlBlock,
  FacingControlBlock,
  LocomotionStanceControlBlock,
} from "./ControlSchemaTypes.js";
import type { InputManager } from "../../ui/InputManager.js";
import { InputPressTokenManager } from "./InputPressTokenManager.js";
import type { PlayerInputPacket } from "../../engine/physics/StateHistoryBuffer.js";
import { ThrowCapability } from "../../character/capabilities/ThrowCapability.js";
import { ControlSchemaArbiter } from "./ControlSchemaArbiter.js";
import { BulletManager } from "../../engine/bullet/BulletManager.js";

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
    const isEditMode = typeof window !== "undefined" && Boolean((window as any).__DEV_PANEL_OPEN);

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
    let isBraking = false;
    char.isBraking = false;
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
    let isGunAimFiring = false;
    let activeRawDragThisFrame = false;
    let isSteerCursorActive = false;

    // Reticle/Aim target position (works seamlessly for mouse and gamepad reticle)
    const baseAim = execCtx.reticleAimPos || execCtx.mouseAimPos || input.actualMousePos || { x: char.position.x + 1, y: char.position.y };
    const targetAimPos = { x: baseAim.x, y: baseAim.y };

    const hasBothRollAndWalkBlocks =
      blocks.some((blk) => blk.enabled && blk.type === "rollMovement") &&
      blocks.some((blk) => blk.enabled && (blk.type === "walkSprint" || blk.type === "locomotion"));
    const isLockedInWalkStance = Boolean(
      char.locomotionMode === "walk" &&
      (!char.locomotionStanceModule || !char.locomotionStanceModule.enabled || char.locomotionStanceModule.isRollDisabledByWalkStance)
    );

    // Pre-evaluate locomotion cursor mode states
    const preferredLocoType = isLockedInWalkStance ? "walkSprint" : "rollMovement";
    const locoBlock = (
      blocks.find((blk) => blk.enabled && blk.type === preferredLocoType) ||
      blocks.find((blk) => blk.enabled && (blk.type === "locomotion" || blk.type === "walkSprint" || blk.type === "rollMovement"))
    ) as (WalkSprintControlBlock | RollMovementControlBlock) | undefined;
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
    const hasLaserCapability = Boolean(char.laserModule && char.laserModule.enabled);
    const laserBlock = hasLaserCapability
      ? (blocks.find((blk) => blk.enabled && blk.type === "laser") as LaserControlBlock | undefined)
      : undefined;

    if (laserBlock) {
      if (laserBlock.aimTrigger?.code && isSlotActive(laserBlock.aimTrigger, "hold", false, laserBlock.id, "laser.aim")) {
        isLaserAiming = true;
      }
      if (isLaserAiming) {
        if (laserBlock.fireTrigger?.autoFireWhenAiming) {
          isLaserFiring = true;
        } else if (isSlotActive(laserBlock.fireTrigger, "hold", false, laserBlock.id, "laser.fire")) {
          isLaserFiring = true;
        }
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

    // Helper to compute kinematic braking and arrival deadzone toward the cursor
    const computeCursorArriveDrive = (
      distToCursor: number,
      charRadius: number
    ): { driveFactor: number; shouldUpdateFacing: boolean; isArrived: boolean } => {
      const arrivalDeadzone = Math.max(0.18, charRadius * 0.55);
      if (distToCursor <= arrivalDeadzone) {
        return { driveFactor: 0, shouldUpdateFacing: false, isArrived: true };
      }

      // Kinematic stopping distance based on current speed and ground deceleration:
      // d_stop = v^2 / (2 * a_brake) + 1 frame lead
      const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
      const totalMass = char.hasMass ? Math.max(0.2, char.mass) : 1.0;
      const arenaFriction = execCtx.arena ? execCtx.arena.frictionCoeff : 10.4;
      const grip = char.isRestingOnSurface ? (char.dynamicGroundFrictionMod * (arenaFriction / 10.0)) : 1.0;
      const maxWalkForce = char.walkingModule ? char.walkingModule.maxWalkForceProp.get(char.properties) : 35.0;
      const isSprinting = Boolean(char.walkingModule?.canSprint && char.isSprinting);
      const effForce = isSprinting ? maxWalkForce * 1.5 : maxWalkForce;
      const maxAccel = Math.max(8.0, ((effForce * Math.max(0.1, char.strength)) / totalMass) * grip);

      const stoppingDist = (curSpeed * curSpeed) / (2 * maxAccel) + curSpeed * execCtx.dt + arrivalDeadzone;

      if (distToCursor > stoppingDist) {
        // Outside braking threshold: full 100% responsive sprint/walk speed with zero sluggishness
        return { driveFactor: 1.0, shouldUpdateFacing: true, isArrived: false };
      }

      // Inside braking window: square-root deceleration curve for crisp settling without slow creeping
      const span = Math.max(0.01, stoppingDist - arrivalDeadzone);
      const factor = Math.sqrt(Math.max(0, Math.min(1.0, (distToCursor - arrivalDeadzone) / span)));
      return { driveFactor: factor, shouldUpdateFacing: true, isArrived: false };
    };

    // Scan for nearby grabbable objects for pickup and swap
    const grabTargetObjectId = execCtx.targetInReach ? execCtx.targetInReach.id : null;

    // Helper to query whether a raw input code (keyboard, mouse, gamepad) is physically held down
    const isButtonCodePhysicallyDown = (code: string | undefined | null): boolean => {
      if (!code) return false;
      if (code.startsWith("Gamepad")) {
        const btn = ControlSchemaArbiter.parseGamepadButtonCode(code);
        if (btn >= 0) {
          if (execCtx.gamepadStates?.getValue && execCtx.gamepadStates.getValue(btn) > 0.15) return true;
          if (execCtx.getGamepadButtonValue && execCtx.getGamepadButtonValue(execCtx.gamepadStates?.slotIndex ?? 0, btn) > 0.15) return true;
          if (execCtx.gamepadStates?.isDown && execCtx.gamepadStates.isDown(btn)) return true;
        }
      } else if (code.startsWith("Mouse")) {
        const idx = code === "MouseLeft" ? 0 : code === "MouseMiddle" ? 1 : code === "MouseRight" ? 2 : -1;
        if (idx >= 0) {
          if (execCtx.isMouseButtonDown(idx)) return true;
          if (execCtx.mouseStates?.isDown && execCtx.mouseStates.isDown(idx)) return true;
        }
      } else {
        if (tokens.isDown(code) || (execCtx.keyStates?.isDown && execCtx.keyStates.isDown(code))) return true;
      }
      return false;
    };

    // Order blocks deterministically so stance switching runs first and facing runs after movement vectors are computed
    const orderedBlocks = [
      ...blocks.filter((b) => b.type === "locomotionStance"),
      ...blocks.filter((b) => b.type !== "locomotionStance" && b.type !== "facing"),
      ...blocks.filter((b) => b.type === "facing"),
    ];

    // Process blocks in order
    for (const block of orderedBlocks) {
      if (!block.enabled) continue;

      const isLockedInWalkStanceNow = Boolean(
        char.locomotionMode === "walk" &&
        (!char.locomotionStanceModule || !char.locomotionStanceModule.enabled || char.locomotionStanceModule.isRollDisabledByWalkStance)
      );

      switch (block.type) {
        case "walkSprint":
        case "locomotion":
        case "rollMovement": {
          if (hasBothRollAndWalkBlocks) {
            if (block.type === "rollMovement" && isLockedInWalkStanceNow) {
              break;
            }
            if ((block.type === "walkSprint" || block.type === "locomotion") && !isLockedInWalkStanceNow) {
              break;
            }
          }
          const b = block as WalkSprintControlBlock | RollMovementControlBlock;
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
            // In cursor mode: character faces toward cursor with kinematic arrival deadzone
            const aimDx = targetAimPos.x - char.position.x;
            const aimDy = targetAimPos.y - char.position.y;
            const mouseDist = Math.hypot(aimDx, aimDy);
            const arrive = computeCursorArriveDrive(mouseDist, char.colliderRadius ?? 0.44);

            if (arrive.shouldUpdateFacing && mouseDist > 0.05) {
              char.facingAngle = Math.atan2(aimDy, aimDx);
            }

            if (arrive.isArrived) {
              const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
              if (curSpeed < 0.25) {
                char.velocity.x = 0;
                char.velocity.y = 0;
              }
            }

            // In cursor mode: walk forward button only drives toward cursor if also pushing joystick
            const stickMag = gpLeftStick ? Math.hypot(gpLeftStick.x, gpLeftStick.y) : 0;
            const isSameTrigger = Boolean(
              b.forwardTrigger?.code &&
              b.cursorSteerTrigger?.code &&
              b.forwardTrigger.code === b.cursorSteerTrigger.code
            );
            const canDriveFwd = fwdActive && (!isSameTrigger || b.cursorSteerMode !== "whenHoldingButton");
            if (canDriveFwd && stickMag > 0.08 && arrive.driveFactor > 0.001) {
              moveX += Math.cos(char.facingAngle) * arrive.driveFactor;
              moveY += Math.sin(char.facingAngle) * arrive.driveFactor;
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
            // Update facing angle toward aim cursor with kinematic arrival deadzone
            const aimDx = targetAimPos.x - char.position.x;
            const aimDy = targetAimPos.y - char.position.y;
            const mouseDist = Math.hypot(aimDx, aimDy);
            const arrive = computeCursorArriveDrive(mouseDist, char.colliderRadius ?? 0.44);

            if (arrive.shouldUpdateFacing && mouseDist > 0.05) {
              char.facingAngle = Math.atan2(aimDy, aimDx);
            }

            if (arrive.isArrived) {
              const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
              if (curSpeed < 0.25) {
                char.velocity.x = 0;
                char.velocity.y = 0;
              }
            }

            // Forward Drive Button (e.g. MouseRight or KeyW)
            const fwdActive = isSlotActive(b.forwardTrigger, "hold", false, b.id, "locomotion.forward");
            if (fwdActive && arrive.driveFactor > 0.001) {
              moveX += Math.cos(char.facingAngle) * arrive.driveFactor;
              moveY += Math.sin(char.facingAngle) * arrive.driveFactor;
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

          // Legacy Jump fallback if block has jump and no separate jump block exists
          if ("jump" in b && b.jump && !blocks.some((blk) => blk.enabled && blk.type === "jump")) {
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

          // Brake (for rolling creatures)
          if (b.brake && b.brake.code) {
            if (isSlotActive(b.brake, "hold", false, b.id, "locomotion.brake")) {
              isBraking = true;
              claimSlot(b.brake, b.id, "locomotion.brake", false);
            }
          }
          char.isBraking = isBraking;
          break;
        }

        case "jump": {
          const b = block as JumpControlBlock;
          const slot = b.jumpTrigger || b.jump;
          const jumpRequiresClean = slot?.requireCleanPress === true || b.requireCleanPress === true;
          if (jumpRequiresClean) {
            if (isSlotActive(slot, "down", true, b.id, "jump")) {
              isJumpHeld = true;
              claimSlot(slot, b.id, "jump", true);
            }
          } else {
            if (isSlotActive(slot, "hold", false, b.id, "jump")) {
              isJumpHeld = true;
              claimSlot(slot, b.id, "jump", false);
            }
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
            break;
          }

          // Gun Wielding: If holding a gun, check if throw override trigger is active.
          // If not active, show high-speed ballistic bullet trajectory and suppress physical throwing.
          const isHoldingGun = Boolean(char.heldObject?.gunModule && char.heldObject.gunModule.enabled);
          const isThrowOverrideActive = isHoldingGun && Boolean(
            b.throwOverrideTrigger &&
            b.throwOverrideTrigger.code &&
            (isSlotActive(b.throwOverrideTrigger, "hold", false, b.id, "check") ||
             isSlotActive(b.throwOverrideTrigger, "down", false, b.id, "check") ||
             getSlotAnalogValue(b.throwOverrideTrigger) > 0.15)
          );

          if (isHoldingGun && !isThrowOverrideActive) {
            char.isChargingThrow = false;
            char.isAimingWallClear = false;
            char.isHoldingThrowRelease = false;
            char.isTriggerPullThrowing = false;
            char.triggerThrowPower = 0;
            char.throwChargeStartTime = null;
            char.throwChargeProgress = 0;
            char.activeTrajectory = null;
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
            const slotsToCheck = [b.chargeTrigger, b.aimTrigger, b.fireTrigger, b.quickTrigger].filter(Boolean);
            const anyHeld = slotsToCheck.some((slot) => {
              const triggerVal = getSlotAnalogValue(slot);
              const isDown = isSlotActive(slot, "down", false, b.id, "check");
              const isHold = isSlotActive(slot, "hold", false, b.id, "check");
              return triggerVal > 0.05 || isDown || isHold;
            });
            if (anyHeld) {
              char.isChargingThrow = false;
              char.isAimingWallClear = false;
              char.isHoldingThrowRelease = false;
              char.isTriggerPullThrowing = false;
              char.triggerThrowPower = 0;
              char.throwChargeStartTime = null;
              char.throwChargeProgress = 0;
              char.activeTrajectory = null;
              break;
            } else {
              (char as any)._throwRequiresFreshPress = false;
            }
          }

          // Check if player pressed the cancel throw button while aiming/charging trajectory
          const isAimingOrCharging = Boolean(
            char.isChargingThrow ||
            char.isHoldingThrowRelease ||
            char.isAimingWallClear ||
            char.isTriggerPullThrowing ||
            char.isAimingTrajectory ||
            char.activeTrajectory !== null ||
            (b.mode === "chargeAndRelease" && isSlotActive(b.chargeTrigger, "hold", false, b.id, "check")) ||
            (b.mode === "holdAndRelease" && isSlotActive(b.chargeTrigger, "hold", false, b.id, "check")) ||
            (b.mode === "aimAndFire" && isSlotActive(b.aimTrigger, "hold", false, b.id, "check")) ||
            (b.mode === "aimWallClear" && isSlotActive(b.aimTrigger, "hold", false, b.id, "check")) ||
            (b.mode === "triggerPullForce" && getSlotAnalogValue(b.chargeTrigger) > 0.05)
          );

          if (isAimingOrCharging && b.cancelTrigger && isSlotActive(b.cancelTrigger, "down", true, b.id, "throw.cancelButton")) {
            isThrow = false;
            isAimingTrajectory = false;
            char.isAimingTrajectory = false;
            char.isChargingThrow = false;
            char.isHoldingThrowRelease = false;
            char.isAimingWallClear = false;
            char.isTriggerPullThrowing = false;
            char.triggerThrowPower = 0;
            char.throwChargeStartTime = null;
            char.throwChargeProgress = 0;
            char.activeTrajectory = null;
            char.isThrowCancelZone = false;
            (char as any)._throwRequiresFreshPress = true;
            claimSlot(b.cancelTrigger, b.id, "throw.cancelButton", true);
            break;
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
              if (b.pickup?.code) {
                (char as any)._pickupPressCode = b.pickup.code;
                (char as any)._throwRequiresFreshPress = true;
                (char as any)._fireRequiresFreshPress = true;
              }
              claimSlot(b.pickup, b.id, "pickup.grab", true);
            }
          }

          // Additional Pickup
          if (b.additionalPickup && isSlotActive(b.additionalPickup, "down", true, b.id, "pickup.grab")) {
            if (!execCtx.isHoldingItem && grabTargetObjectId) {
              isGrabHeld = true;
              if (b.additionalPickup?.code) {
                (char as any)._pickupPressCode = b.additionalPickup.code;
                (char as any)._throwRequiresFreshPress = true;
                (char as any)._fireRequiresFreshPress = true;
              }
              claimSlot(b.additionalPickup, b.id, "pickup.grab", true);
            }
          }

          // Drop
          if (execCtx.isHoldingItem && isSlotActive(b.drop, "down", true, b.id, "pickup.drop")) {
            isDrop = true;
            (char as any)._pickupPressCode = null;
            (char as any)._throwRequiresFreshPress = false;
            (char as any)._fireRequiresFreshPress = false;
            (char as any)._isConsumeToggledOn = false;
            (char as any)._toggledConsumeItemId = null;
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
                (char as any)._isConsumeToggledOn = false;
                (char as any)._toggledConsumeItemId = null;
                if (b.swap?.code) {
                  (char as any)._pickupPressCode = b.swap.code;
                  (char as any)._throwRequiresFreshPress = true;
                  (char as any)._fireRequiresFreshPress = true;
                }
                claimSlot(b.swap, b.id, "pickup.swap", true);
              }
            } else if (b.triggerPickupWhenEmptyHanded && grabTargetObjectId) {
              isSwap = true;
              isGrabHeld = true;
              (char as any)._isConsumeToggledOn = false;
              (char as any)._toggledConsumeItemId = null;
              if (b.swap?.code) {
                (char as any)._pickupPressCode = b.swap.code;
                (char as any)._throwRequiresFreshPress = true;
                (char as any)._fireRequiresFreshPress = true;
              }
              claimSlot(b.swap, b.id, "pickup.swap", true);
            }
          }

          // Reset toggle if item left hand or was replaced by a different item
          const currentHeldItemId = char.heldObject?.id ?? null;
          if ((char as any)._isConsumeToggledOn) {
            if (!currentHeldItemId || currentHeldItemId !== (char as any)._toggledConsumeItemId || isDrop || isSwap || isThrow) {
              (char as any)._isConsumeToggledOn = false;
              (char as any)._toggledConsumeItemId = null;
            }
          }

          // Consume / Eat / Primary Item Ability (Default: "toggle" mode; can be configured to "hold")
          const isToggleMode = b.consumeMode !== "hold" && (b.consume as any)?.mode !== "hold";
          const canConsumeHeld = Boolean(
            execCtx.heldItemIsEdible ||
            execCtx.heldItemHasPrimaryAbility ||
            (char.heldObject && char.hasPrimaryItemAbility?.())
          );

          if (isToggleMode) {
            const consumeCode = b.consume?.code;
            const isConsumePhysDown = isButtonCodePhysicallyDown(consumeCode);
            const gatesDown = !b.consume?.gateButtons?.length || b.consume.gateButtons.every((g) => tokens.isDown(g));
            const isConsumeActive = isConsumePhysDown && gatesDown;

            const prevKey = `_prevConsumeActive_${b.id}`;
            const wasConsumeActive = Boolean((char as any)[prevKey]);
            (char as any)[prevKey] = isConsumeActive;

            // Leading-edge press: strictly true ONLY on the exact frame the button transitions from not-pressed to pressed!
            const isConsumeJustPressed = isConsumeActive && !wasConsumeActive;

            if (isConsumeJustPressed) {
              if ((char as any)._isConsumeToggledOn) {
                // Pressing again while eating toggles eating OFF
                (char as any)._isConsumeToggledOn = false;
                (char as any)._toggledConsumeItemId = null;
              } else if (canConsumeHeld && currentHeldItemId) {
                // Pressing while holding an edible/primary ability item toggles eating ON
                (char as any)._isConsumeToggledOn = true;
                (char as any)._toggledConsumeItemId = currentHeldItemId;
              }
              if (consumeCode) {
                tokens.consume(consumeCode, b.id, "consume.toggle");
              }
            }

            if ((char as any)._isConsumeToggledOn) {
              if (currentHeldItemId && currentHeldItemId === (char as any)._toggledConsumeItemId && canConsumeHeld && !isDrop && !isSwap && !isThrow) {
                isUsingItem = true;
              } else {
                (char as any)._isConsumeToggledOn = false;
                (char as any)._toggledConsumeItemId = null;
              }
            }
          } else {
            // Traditional hold mode: active only while holding the button
            if (canConsumeHeld && isSlotActive(b.consume, "hold", false, b.id, "consume.bite")) {
              isUsingItem = true;
              claimSlot(b.consume, b.id, "consume.bite", false);
            }
          }

          // Fire Weapon / Shoot Gun
          const isHoldingGunItem = Boolean(char.heldObject?.gunModule && char.heldObject.gunModule.enabled);
          const throwBlock = blocks.find((blk) => blk.enabled && blk.type === "throw") as ThrowControlBlock | undefined;
          const isThrowOverrideActive = isHoldingGunItem && Boolean(
            throwBlock?.throwOverrideTrigger &&
            throwBlock.throwOverrideTrigger.code &&
            (isSlotActive(throwBlock.throwOverrideTrigger, "hold", false, throwBlock.id, "check") ||
             isSlotActive(throwBlock.throwOverrideTrigger, "down", false, throwBlock.id, "check") ||
             getSlotAnalogValue(throwBlock.throwOverrideTrigger) > 0.15)
          );

          // If the button pressed to pick up or swap this item is STILL held down,
          // firing is strictly locked out until that button is fully released!

          const pickupCode = (char as any)._pickupPressCode;
          const fireCode = b.fireWeapon?.code;

          if (pickupCode) {
            if (isButtonCodePhysicallyDown(pickupCode)) {
              (char as any)._fireRequiresFreshPress = true;
              (char as any)._throwRequiresFreshPress = true;
            } else {
              // Physical release detected: clear the pickup lockout
              (char as any)._pickupPressCode = null;
            }
          }

          let isFireBlockedByCleaning = false;
          if ((char as any)._pickupPressCode && fireCode === (char as any)._pickupPressCode) {
            isFireBlockedByCleaning = true;
          }

          if ((char as any)._fireRequiresFreshPress) {
            if (fireCode && isButtonCodePhysicallyDown(fireCode)) {
              isFireBlockedByCleaning = true;
            } else {
              (char as any)._fireRequiresFreshPress = false;
            }
          }

          const isGunOverheated = Boolean(char.heldObject?.gunModule?.isOverheated);
          const isFireSlotActive = Boolean(
            !isThrowOverrideActive &&
            !isFireBlockedByCleaning &&
            !isGunOverheated &&
            b.fireWeapon && (
              isSlotActive(b.fireWeapon, "hold", false, b.id, "gun.fire") ||
              isSlotActive(b.fireWeapon, "down", false, b.id, "gun.fire") ||
              getSlotAnalogValue(b.fireWeapon) > 0.15
            )
          );

          if (isHoldingGunItem && isFireSlotActive && execCtx.arena) {
            isGunAimFiring = true;
            const gun = char.heldObject!.gunModule!;
            const effAim = getEffectiveAimPos();
            const aimDx = effAim.x - char.position.x;
            const aimDy = effAim.y - char.position.y;
            const targetAimAngle = Math.hypot(aimDx, aimDy) > 0.05
              ? Math.atan2(aimDy, aimDx)
              : (char.facingAngle ?? 0);

            // Compute signed shortest angular difference to target
            const currentAngle = char.facingAngle ?? 0;
            let angleDiff = targetAimAngle - currentAngle;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

            // Rotate character smoothly toward target at gun turn speed
            const turnSpeed = gun.getTurnSpeed ? gun.getTurnSpeed(char.properties) : gun.turnSpeed;
            const dt = execCtx.dt || (1 / 60);
            const maxStep = (turnSpeed > 0 ? turnSpeed : 22.0) * dt;

            if (Math.abs(angleDiff) <= maxStep) {
              char.facingAngle = targetAimAngle;
              angleDiff = 0;
            } else {
              char.facingAngle = currentAngle + Math.sign(angleDiff) * maxStep;
              angleDiff = targetAimAngle - char.facingAngle;
              angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            }

            // Only fire bullet once character is facing the right way (within alignment tolerance)
            const tolerance = gun.getAimTolerance ? gun.getAimTolerance(char.properties) : gun.aimTolerance;
            const isFacingRightWay = Math.abs(angleDiff) <= (tolerance > 0 ? tolerance : 0.15);

            if (isFacingRightWay) {
              isUsingItem = true;
              (char as any).isFiringWeapon = true;
              BulletManager.getInstance().fireBullet(char, gun, effAim, execCtx.arena);
            } else {
              isUsingItem = false;
              (char as any).isFiringWeapon = false;
            }
            claimSlot(b.fireWeapon, b.id, "gun.fire", false);
          } else {
            (char as any).isFiringWeapon = false;
          }
          break;
        }

        case "facing": {
          const b = block as FacingControlBlock;
          // When actively aiming and shooting a gun, preserve the gun aim facing angle
          if (isGunAimFiring) {
            break;
          }
          // Right stick MUST NOT control direction anywhere
          // Left stick should not change character direction when moving cursor
          if (isSteerCursorActive || char.isSteeringCursor) {
            break;
          }
          const locoBlock = execCtx.schema?.gamepad?.blocks?.find((blk) => blk.enabled && (blk.type === "locomotion" || blk.type === "walkSprint")) as WalkSprintControlBlock | undefined;
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

        case "locomotionStance": {
          const b = block as LocomotionStanceControlBlock;
          const isButtonDown = (slot?: BlockInputSlot | null) => {
            if (!slot || !slot.code) return false;
            const isPhysDown = isButtonCodePhysicallyDown(slot.code);
            const gatesDown = !slot.gateButtons?.length || slot.gateButtons.every((g) => tokens.isDown(g));
            return isPhysDown && gatesDown;
          };

          const isJustPressed = (slot?: BlockInputSlot | null, actionKey: string = "") => {
            if (!slot || !slot.code) return false;
            const isDown = isButtonDown(slot);
            const stateKey = `_prevStanceDown_${b.id}_${actionKey}`;
            const wasDown = Boolean((char as any)[stateKey]);
            (char as any)[stateKey] = isDown;
            return isDown && !wasDown;
          };

          // 1. Cycle Trigger (e.g. KeyC or GamepadLB)
          if (isJustPressed(b.cycleTrigger, "cycle")) {
            char.cycleLocomotionMode();
            if (b.cycleTrigger?.code) {
              tokens.consume(b.cycleTrigger.code, b.id, "locomotion.cycleStance");
            }
          }

          // 2. Direct Stance Triggers
          if (isJustPressed(b.walkTrigger, "walk")) {
            char.locomotionMode = "walk";
            if (b.walkTrigger?.code) tokens.consume(b.walkTrigger.code, b.id, "locomotion.stanceWalk");
          }
          if (isJustPressed(b.rollTrigger, "roll")) {
            char.locomotionMode = "roll";
            if (b.rollTrigger?.code) tokens.consume(b.rollTrigger.code, b.id, "locomotion.stanceRoll");
          }
          if (isJustPressed(b.flyTrigger, "fly")) {
            char.locomotionMode = "fly";
            if (b.flyTrigger?.code) tokens.consume(b.flyTrigger.code, b.id, "locomotion.stanceFly");
          }

          // 3. Hold-to-shift trigger
          if (b.shiftTrigger && b.holdToShiftMode && b.holdToShiftMode !== "none") {
            const isShiftDown = isButtonDown(b.shiftTrigger);
            const shiftStateKey = `_isHoldingStanceShift_${b.id}`;
            if (isShiftDown) {
              if (!(char as any)[shiftStateKey]) {
                (char as any)[shiftStateKey] = true;
                (char as any)[`_preShiftStance_${b.id}`] = char.locomotionMode;
                char.locomotionMode = b.holdToShiftMode;
              }
            } else {
              if ((char as any)[shiftStateKey]) {
                (char as any)[shiftStateKey] = false;
                const prev = (char as any)[`_preShiftStance_${b.id}`] ?? "walk";
                char.locomotionMode = prev;
              }
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

    // Face toward aim target if aiming trajectory, laser, melee, or gun:
    // In Cursor Mode (or Mouse/Keyboard): character faces towards cursor.
    // In Raw Direction Mode on Gamepad: character strictly maintains stick-directed facing angle.
    if (isLaserAiming || isLaserFiring || isMeleeRequested || isAimingTrajectory || isGunAimFiring) {
      if (isGunAimFiring) {
        // Facing angle was oriented towards shooting target with turn speed in the item block
      } else if (isSteerCursorActive || char.isSteeringCursor) {
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

    const isAiming = !isEditMode && (isLaserAiming || isAimingTrajectory || isGunAimFiring);
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

    if (isDrop || isThrow || isSwap || !char.heldObject) {
      (char as any)._isConsumeToggledOn = false;
      (char as any)._toggledConsumeItemId = null;
      isUsingItem = false;
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
