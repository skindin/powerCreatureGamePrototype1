import type {
  InputPipelineBinding,
  ControlExecutionContext,
} from "./ControlSchemaTypes.js";
import type { InputManager } from "../../ui/InputManager.js";
import { InputPressTokenManager } from "./InputPressTokenManager.js";
import type { PlayerInputPacket } from "../../engine/physics/StateHistoryBuffer.js";

/**
 * ModularPipelineEvaluator executes the unbundled, modular Left-to-Right input pipeline:
 * [ Raw Input Source ] ---> [ Processor / Cleaning ] ---> [ Module Target Socket ]
 *
 * Everything (movement, facing, jump, throw, consume) is an independent, deletable binding.
 */
export class ModularPipelineEvaluator {
  private static accumulators: Map<string, number> = new Map();
  public static activeRawDragBindingId: string | null = null;

  public static getAccumulatorValue(bindingId: string, defaultValue: number = 0.5): number {
    if (!this.accumulators.has(bindingId)) {
      this.accumulators.set(bindingId, defaultValue);
    }
    return this.accumulators.get(bindingId)!;
  }

  public static setAccumulatorValue(bindingId: string, value: number): void {
    this.accumulators.set(bindingId, value);
  }

  public static evaluatePipeline(
    pipeline: InputPipelineBinding[],
    execCtx: ControlExecutionContext,
    input: InputManager
  ): PlayerInputPacket {
    const char = execCtx.character;
    const tokens = InputPressTokenManager.getInstance();
    const now = performance.now();

    // 1. Ingest raw physical inputs into token manager
    const currentDownKeys = new Set<string>();
    const keyCodes = [
      "KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight",
      "KeyE", "KeyF", "KeyR", "KeyQ", "KeyC", "KeyV", "KeyZ", "KeyX",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "AltLeft", "AltRight", "ControlLeft", "ControlRight",
    ];
    for (const code of keyCodes) {
      if (execCtx.isKeyDown(code)) currentDownKeys.add(code);
    }
    if (execCtx.isMouseButtonDown(0)) currentDownKeys.add("MouseLeft");
    if (execCtx.isMouseButtonDown(1)) currentDownKeys.add("MouseMiddle");
    if (execCtx.isMouseButtonDown(2)) currentDownKeys.add("MouseRight");

    tokens.update(currentDownKeys, now);

    // Dynamic state buckets written by sockets
    let moveX = 0;
    let moveY = 0;
    let isSprinting = false;
    let isJumpHeld = false;
    let isGrabHeld = false;
    let isSwap = false;
    let isThrow = false;
    let isUsingItem = false;
    let isLaserAiming = false;
    let isLaserFiring = false;
    let isMeleeRequested = false;
    let isAimingTrajectory = false;

    let activeRawDragThisFrame = false;

    // 2. Iterate each modular pipeline binding
    for (const binding of pipeline) {
      if (!binding.enabled) continue;

      const { source, processor, target } = binding;

      // --- Process Button Processor ---
      if (processor.type === "button" && source.type === "button") {
        const code = source.code;
        const chordMods = source.chordModifiers || [];
        const isChordDown = chordMods.every((m) => tokens.isDown(m));

        if (!isChordDown && chordMods.length > 0) {
          continue;
        }

        let signalActive = false;
        const isDown = tokens.isDown(code);
        const isFresh = tokens.isFresh(code);
        const justReleased =
          (source.device === "mouse" && (code === "MouseLeft" ? execCtx.mouseStates?.justReleased(0) : execCtx.mouseStates?.justReleased(2))) ||
          (execCtx.keyStates?.justReleased(code) ?? false);

        if (processor.triggerMode === "down") {
          if (processor.requireCleanPress) {
            signalActive = tokens.canExecute(code, "requireCleanPress", binding.id);
          } else {
            signalActive = isFresh;
          }
        } else if (processor.triggerMode === "hold") {
          if (processor.requireCleanPress) {
            signalActive = tokens.canExecute(code, "requireCleanPress", binding.id) && isDown;
          } else {
            signalActive = isDown;
          }
        } else if (processor.triggerMode === "up") {
          signalActive = Boolean(justReleased);
        } else if (processor.triggerMode === "timedHold") {
          const holdMs = tokens.getHoldDuration(code, now);
          signalActive = isDown && holdMs >= (processor.holdThresholdMs || 200);
        }

        if (signalActive && processor.claimOnFire && processor.triggerMode !== "up") {
          tokens.claim(code, binding.id);
        }

        // Apply signal to Target Socket
        if (signalActive) {
          switch (target) {
            case "locomotion.forwardThrust": {
              const facing = char.facingAngle ?? 0;
              moveX += Math.cos(facing);
              moveY += Math.sin(facing);
              break;
            }
            case "locomotion.reverseThrust": {
              const facing = char.facingAngle ?? 0;
              moveX -= Math.cos(facing) * 0.75;
              moveY -= Math.sin(facing) * 0.75;
              break;
            }
            case "locomotion.strafeLeft": {
              const facing = char.facingAngle ?? 0;
              moveX += -Math.sin(facing) * 0.85;
              moveY += Math.cos(facing) * 0.85;
              break;
            }
            case "locomotion.strafeRight": {
              const facing = char.facingAngle ?? 0;
              moveX -= -Math.sin(facing) * 0.85;
              moveY += Math.cos(facing) * 0.85;
              break;
            }
            case "locomotion.sprint":
              isSprinting = true;
              break;
            case "locomotion.jump":
              isJumpHeld = true;
              break;
            case "throw.aim":
              if (execCtx.isHoldingItem) {
                isAimingTrajectory = true;
              }
              break;
            case "throw.fire":
              if (execCtx.isHoldingItem) {
                isThrow = true;
                tokens.claim(code, "throw");
              }
              break;
            case "consume.bite":
              if (execCtx.isHoldingItem && (execCtx.heldItemIsEdible || execCtx.heldItemHasPrimaryAbility)) {
                isUsingItem = true;
                tokens.claim(code, "consume");
              }
              break;
            case "pickup.grab":
              if (!execCtx.isHoldingItem && execCtx.targetInReach) {
                isGrabHeld = true;
                tokens.claim(code, "pickup");
              }
              break;
            case "pickup.swap":
              if (execCtx.isHoldingItem && execCtx.targetInReach && !isAimingTrajectory) {
                isSwap = true;
                tokens.claim(code, "swap");
              }
              break;
            case "melee.punch":
              isMeleeRequested = true;
              tokens.claim(code, "melee");
              break;
            case "laser.aim":
              isLaserAiming = true;
              break;
            case "laser.fire":
              isLaserFiring = true;
              break;
          }
        }
      }

      // --- Process 2D Vector / Composite Processor ---
      else if (processor.type === "2d_vector" && source.type === "composite_4key") {
        let vx = 0;
        let vy = 0;
        if (tokens.isDown(source.upKey)) vy -= 1;
        if (tokens.isDown(source.downKey)) vy += 1;
        if (tokens.isDown(source.leftKey)) vx -= 1;
        if (tokens.isDown(source.rightKey)) vx += 1;

        if (processor.mode === "facingRelative") {
          const facing = char.facingAngle ?? 0;
          const fwdX = Math.cos(facing);
          const fwdY = Math.sin(facing);
          const leftX = -fwdY;
          const leftY = fwdX;
          moveX += vx * leftX - vy * fwdX;
          moveY += vx * leftY - vy * fwdY;
        } else {
          moveX += vx;
          moveY += vy;
        }
      }

      // --- Process Facing Processor ---
      else if (processor.type === "facing") {
        if (processor.mode === "fromMousePos" && source.type === "2d_vector") {
          const aimDx = input.actualMousePos.x - char.position.x;
          const aimDy = input.actualMousePos.y - char.position.y;
          if (Math.hypot(aimDx, aimDy) > 0.05) {
            char.facingAngle = Math.atan2(aimDy, aimDx);
          }
        } else if (processor.mode === "fromMovement") {
          if (Math.hypot(moveX, moveY) > 0.05) {
            char.facingAngle = Math.atan2(moveY, moveX);
          }
        }
      }

      // --- Process 1D Scalar / Raw Mouse Drag Processor ---
      else if (processor.type === "1d_scalar" && source.type === "1d_scalar") {
        const isMouseDelta = source.source === "mouseDeltaY" || source.source === "mouseDeltaX";
        const gateCode = processor.gateButton?.code;
        const isGateActive = gateCode ? tokens.isDown(gateCode) : true;

        if (isMouseDelta && processor.autoCursorLock && isGateActive) {
          activeRawDragThisFrame = true;

          // Engage universal pointer lock & freeze game reticle
          if (!input.isRawDragging) {
            ModularPipelineEvaluator.activeRawDragBindingId = binding.id;
            input.beginRawDrag((dx, dy) => {
              const delta = source.source === "mouseDeltaY" ? -dy : dx;
              const sens = processor.sensitivity || 0.005;

              if (processor.mode === "accumulator") {
                const cur = this.getAccumulatorValue(binding.id, processor.initialValue ?? 0.5);
                const min = processor.clampMin ?? 0.0;
                const max = processor.clampMax ?? 1.0;
                const next = Math.max(min, Math.min(max, cur + delta * sens));
                this.setAccumulatorValue(binding.id, next);

                // Pipe into Target Socket
                if (target === "throw.arcHeight") {
                  if (char.throwModule) {
                    char.throwModule.savedArcRatio = next;
                    char.throwModule.hasUserSetArcRatio = true;
                  }
                  char.savedArcRatio = next;
                  char.hasUserSetArcRatio = true;
                } else if (target === "laser.power") {
                  char.laserPowerFraction = next;
                }
              }
            });
          }
        } else if (source.source === "mouseWheel") {
          // Wheel scalar processing
          const rawDelta = input.aimLockRawDelta || input.arcModulationDeltaY || 0;
          if (rawDelta !== 0) {
            const sens = processor.sensitivity || 0.05;
            const cur = this.getAccumulatorValue(binding.id, processor.initialValue ?? 0.5);
            const min = processor.clampMin ?? 0.0;
            const max = processor.clampMax ?? 1.0;
            const next = Math.max(min, Math.min(max, cur + rawDelta * sens));
            this.setAccumulatorValue(binding.id, next);

            if (target === "throw.arcHeight") {
              if (char.throwModule) {
                char.throwModule.savedArcRatio = next;
                char.throwModule.hasUserSetArcRatio = true;
              }
              char.savedArcRatio = next;
              char.hasUserSetArcRatio = true;
            } else if (target === "laser.power") {
              char.laserPowerFraction = next;
            }
          }
        }
      }
    }

    // Terminate raw mouse drag if no active gated 1D processor is running
    if (!activeRawDragThisFrame && input.isRawDragging) {
      input.endRawDrag();
      ModularPipelineEvaluator.activeRawDragBindingId = null;
    }

    // Normalize movement vector
    const moveMag = Math.hypot(moveX, moveY);
    if (moveMag > 1.0) {
      moveX /= moveMag;
      moveY /= moveMag;
    }

    // Sync character state
    char.isAimingTrajectory = isAimingTrajectory;
    char.isLaserAiming = isLaserAiming;
    char.isLaserFiring = isLaserFiring;
    char.isMeleeRequested = isMeleeRequested;

    if (isAimingTrajectory && char.facingAngle !== undefined) {
      char.lastThrowAimAngle = char.facingAngle;
    }

    return {
      playerId: "keyboard",
      moveX,
      moveY,
      isSprinting: isSprinting || Boolean(char.isSprinting),
      isJumpHeld,
      isGrabHeld,
      grabTargetObjectId: (isGrabHeld || isSwap) && execCtx.targetInReach ? execCtx.targetInReach.id : null,
      isDrop: false,
      isThrow,
      isSwap,
      isUsingItem,
      isLaserAiming,
      isLaserFiring,
      laserAimX: input.actualMousePos.x,
      laserAimY: input.actualMousePos.y,
      isMeleeRequested,
      meleeAimDirX: (input.actualMousePos.x - char.position.x) / (Math.hypot(input.actualMousePos.x - char.position.x, input.actualMousePos.y - char.position.y) || 1),
      meleeAimDirY: (input.actualMousePos.y - char.position.y) / (Math.hypot(input.actualMousePos.x - char.position.x, input.actualMousePos.y - char.position.y) || 1),
    } as any;
  }
}
