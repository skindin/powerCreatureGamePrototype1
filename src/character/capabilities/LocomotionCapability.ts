import type { Character } from "../Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated 1-to-1 capability slice for Ground Locomotion (Walking & Sprinting).
 * Encapsulates metabolic power demand registration, exhaustion sprint-cancellation,
 * and delegation to WalkingModule without touching Tier 2 WalkingModule.ts.
 */
export class LocomotionCapability {
  public static canWalk(char: Character): boolean {
    return Boolean(
      char.walkingModule &&
      char.walkingModule.enabled &&
      (char.isRestingOnSurface ? char.hasFriction : char.walkingModule.walkInAir)
    );
  }

  public static registerDemand(char: Character, movementInput: Vector2D): boolean {
    const canWalk = LocomotionCapability.canWalk(char);
    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    const isMoving = inputMag > 0.05;
    const isActivelySprinting = Boolean(char.walkingModule?.canSprint && char.isSprinting);
    let sprintingNow = isActivelySprinting;

    if (sprintingNow && char.walkingModule?.sprintConsumesEnergy) {
      if (char.energyPool && (char.energyPool.isExhausted || char.energyPool.getCurrentStamina(char.properties) <= 0.0001)) {
        sprintingNow = false;
        char.setSprinting(false);
        const Cr = 0.40;
        const totalMass = char.hasMass ? Math.max(0.2, char.mass) : 1.0;
        const targetSpeed = char.walkingModule.maxSprintSpeedProp.get(char.properties);
        const rawSprintWatts = (totalMass * 9.81 * Cr * targetSpeed) / 0.25;
        char.energyPool.notifyInsufficientEnergy({
          abilityId: "sprint",
          demandedAmount: rawSprintWatts,
          isBurst: false,
          unit: "W/s",
          registry: char.properties,
        });
      }
    }

    const locomotionConsumesEnergy = sprintingNow
      ? char.walkingModule?.sprintConsumesEnergy
      : char.walkingModule?.walkConsumesEnergy;

    if (canWalk && isMoving && locomotionConsumesEnergy && char.walkingModule && char.energyPool) {
      const carriedMass = char.carriedMass;
      const loadFactor = carriedMass / (Math.max(0.1, char.strength) * 8.0);
      const targetSpeed = sprintingNow
        ? char.walkingModule.maxSprintSpeedProp.get(char.properties)
        : char.walkingModule.maxWalkSpeedProp.get(char.properties);
      const v = targetSpeed / (1.0 + loadFactor);
      const g = 9.81;
      const Cr = sprintingNow ? 0.40 : 0.28;
      const totalMass = char.hasMass ? Math.max(0.2, char.mass) : 1.0;
      const resForce = totalMass * g * Cr;
      const rawLocomotionWatts = (resForce * v) / 0.25;
      const cap = sprintingNow
        ? char.walkingModule.maxSprintPowerProp.get(char.properties)
        : char.walkingModule.maxWalkPowerProp.get(char.properties);
      const allowPartial = sprintingNow
        ? char.walkingModule.sprintAllowPartialPower
        : char.walkingModule.walkAllowPartialPower;
      let locomotionWatts = rawLocomotionWatts;
      if (locomotionWatts > cap) {
        locomotionWatts = allowPartial ? cap : 0;
      }
      const locomotionId = sprintingNow ? "sprint" : "walk";
      char.energyPool.activeLocomotionId = locomotionId;
      char.energyPool.registerDemand(locomotionId, locomotionWatts, allowPartial);
    }

    return canWalk;
  }

  public static actuate(char: Character, canWalk: boolean, movementInput: Vector2D, dt: number, arena: Arena): void {
    if (canWalk && char.walkingModule) {
      char.walkingModule.update(char, movementInput, dt, arena);
    } else {
      char.isActivelyWalking = false;
    }
  }
}
