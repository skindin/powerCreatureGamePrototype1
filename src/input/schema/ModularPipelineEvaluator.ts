import type {
  InputPipelineBinding,
  ControlExecutionContext,
  BindingCondition,
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

  public static checkBindingCondition(
    condition: BindingCondition | undefined,
    execCtx: ControlExecutionContext
  ): boolean {
    if (!condition || condition === "none") return true;
    switch (condition) {
      case "emptyHanded":
        return !execCtx.isHoldingItem;
      case "holdingItem":
        return Boolean(execCtx.isHoldingItem);
      case "holdingConsumable":
        return Boolean(
          execCtx.isHoldingItem &&
          (execCtx.heldItemIsEdible || execCtx.heldItemHasPrimaryAbility)
        );
      case "holdingThrowable":
        return Boolean(
          execCtx.isHoldingItem &&
          !execCtx.heldItemIsEdible &&
          !execCtx.heldItemHasPrimaryAbility
        );
      case "targetInReach":
        return Boolean(execCtx.targetInReach);
      case "targetNotInReach":
        return !execCtx.targetInReach;
      case "isGrounded":
        return Boolean(execCtx.isGrounded);
      case "isClimbing":
        return Boolean(execCtx.isClimbing);
      default:
        return true;
    }
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
    const currentDownKeys = new Set<string>(input.getActiveKeys());
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
    let isDrop = false;
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
      if (!this.checkBindingCondition(binding.condition, execCtx)) continue;

      const { source, processor, target } = binding;

      // --- Process Button Processor ---
      if (processor.type === "button" && source.type === "button") {
        const primaryCode = source.code;
        const allCodes = [
          primaryCode,
          ...(source.additionalCodes || []),
          ...(source.chordModifiers || []),
        ];

        // All required keys in this multi-button / chord combination must be held
        const areAllDown = allCodes.every((c) => tokens.isDown(c));
        const anyFresh = allCodes.some((c) => tokens.isFresh(c));

        const isCodeJustReleased = (c: string): boolean => {
          if (c.startsWith("Mouse")) {
            const idx = c === "MouseLeft" ? 0 : c === "MouseMiddle" ? 1 : c === "MouseRight" ? 2 : -1;
            return idx >= 0 ? execCtx.mouseStates?.justReleased(idx) ?? false : false;
          }
          return execCtx.keyStates?.justReleased(c) ?? false;
        };
        const anyJustReleased = allCodes.some(isCodeJustReleased);
        const claimAll = (tgt: string) => {
          for (const c of allCodes) {
            tokens.claim(c, binding.id, tgt);
          }
        };

        let signalActive = false;

        if (processor.triggerMode === "down") {
          if (processor.requireCleanPress) {
            signalActive =
              areAllDown &&
              anyFresh &&
              allCodes.every((c) => tokens.canExecute(c, "requireCleanPress", binding.id, target));
          } else {
            signalActive = areAllDown && anyFresh;
          }
        } else if (processor.triggerMode === "hold") {
          if (processor.requireCleanPress) {
            signalActive =
              areAllDown &&
              allCodes.every((c) => tokens.canExecute(c, "requireCleanPress", binding.id, target));
          } else {
            signalActive = areAllDown;
          }
        } else if (processor.triggerMode === "up") {
          if (processor.requireCleanPress) {
            signalActive =
              Boolean(anyJustReleased) &&
              allCodes.every((c) => tokens.canExecuteRelease(c, "requireCleanPress", binding.id, target));
          } else {
            signalActive = Boolean(anyJustReleased);
          }
        } else if (processor.triggerMode === "timedHold") {
          const holdMs = tokens.getHoldDuration(primaryCode, now);
          const reached = areAllDown && holdMs >= (processor.holdThresholdMs || 200);
          if (processor.requireCleanPress) {
            signalActive =
              reached &&
              allCodes.every((c) => tokens.canExecute(c, "requireCleanPress", binding.id, target));
          } else {
            signalActive = reached;
          }
        }

        if (signalActive && processor.claimOnFire && processor.triggerMode !== "up") {
          for (const c of allCodes) {
            tokens.claim(c, binding.id, target);
          }
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
                claimAll("throw.aim");
              }
              break;
            case "throw.chargeArc":
              if (execCtx.isHoldingItem) {
                isAimingTrajectory = true;
                char.isChargingThrow = true;
                if (!char.throwChargeStartTime) {
                  char.throwChargeStartTime = now;
                }
                claimAll("throw.chargeArc");
              }
              break;
            case "throw.chargeBow":
              if (execCtx.isHoldingItem) {
                isAimingTrajectory = true;
                char.isChargingThrow = true;
                if (!char.throwChargeStartTime) {
                  char.throwChargeStartTime = now;
                }
                claimAll("throw.chargeBow");
              }
              break;
            case "throw.quickOptimal":
              if (execCtx.isHoldingItem) {
                char.hasUserSetArcRatio = false;
                if (char.throwModule) {
                  char.throwModule.hasUserSetArcRatio = false;
                }
                isThrow = true;
                claimAll("throw.fire");
              }
              break;
            case "throw.fire":
              if (execCtx.isHoldingItem) {
                isThrow = true;
                claimAll("throw.fire");
              }
              break;
            case "consume.bite":
              if (execCtx.isHoldingItem && (execCtx.heldItemIsEdible || execCtx.heldItemHasPrimaryAbility)) {
                isUsingItem = true;
                claimAll("consume.bite");
              }
              break;
            case "pickup.grab":
              if (!execCtx.isHoldingItem && execCtx.targetInReach) {
                isGrabHeld = true;
                claimAll("pickup.grab");
              }
              break;
            case "pickup.drop":
              if (execCtx.isHoldingItem) {
                isDrop = true;
                claimAll("pickup.drop");
              }
              break;
            case "pickup.swap":
              if (execCtx.isHoldingItem && execCtx.targetInReach && !isAimingTrajectory) {
                isSwap = true;
                claimAll("pickup.swap");
              }
              break;
            case "melee.punch":
              isMeleeRequested = true;
              claimAll("melee.punch");
              break;
            case "laser.aim":
              isLaserAiming = true;
              break;
            case "laser.fire":
              isLaserFiring = true;
              break;
          }
        }

        // Auto-release fire for chargeBow on button release
        if (target === "throw.chargeBow" && anyJustReleased && char.isChargingThrow && execCtx.isHoldingItem) {
          isThrow = true;
          char.isChargingThrow = false;
          char.throwChargeStartTime = null;
          claimAll("throw.fire");
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

    if (!isAimingTrajectory && char.isChargingThrow && !isThrow) {
      char.isChargingThrow = false;
      char.throwChargeStartTime = null;
      char.throwChargeProgress = 0;
    }
    if (isThrow) {
      char.isChargingThrow = false;
      char.throwChargeStartTime = null;
      char.throwChargeProgress = 0;
    }

    const isAiming = isLaserAiming || isAimingTrajectory;
    const kLaunchVel = isThrow && char.activeTrajectory?.launchVel ? char.activeTrajectory.launchVel : undefined;
    const kLaunchPos = isThrow && char.activeTrajectory?.launchPos ? char.activeTrajectory.launchPos : undefined;

    return {
      playerId: "keyboard",
      moveX,
      moveY,
      isSprinting: isSprinting || Boolean(char.isSprinting),
      isJumpHeld,
      isGrabHeld,
      grabTargetObjectId: (isGrabHeld || isSwap) && execCtx.targetInReach ? execCtx.targetInReach.id : null,
      isDrop,
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
      meleeAimX: input.actualMousePos.x,
      meleeAimY: input.actualMousePos.y,
      aimX: input.actualMousePos.x,
      aimY: input.actualMousePos.y,
      isAiming,
      isLockHeld: Boolean(input.lockedAimPos),
      lockedAimPos: input.lockedAimPos,
      aimLockDelta: 0,
      facingAngle: char.facingAngle,
      ...(kLaunchVel ? {
        launchVx: kLaunchVel.vx,
        launchVy: kLaunchVel.vy,
        launchVz: kLaunchVel.vz,
      } : {}),
      ...(kLaunchPos ? {
        launchStartX: kLaunchPos.x,
        launchStartY: kLaunchPos.y,
        launchStartZ: kLaunchPos.z,
      } : {}),
    } as any;
  }
}
