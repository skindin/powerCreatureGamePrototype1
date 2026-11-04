import type { Character } from "../Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * RollMovementCapability: Isolated 1-to-1 capability slice for rolling creatures.
 * Exerts directional torque to accelerate, sustains roll momentum when input ceases,
 * registers metabolic energy demand, and handles active braking.
 */
export class RollMovementCapability {
  public static canRoll(char: Character): boolean {
    return Boolean(
      char.rollMovementModule &&
      char.rollMovementModule.enabled &&
      char.rollModule &&
      char.rollModule.enabled
    );
  }

  public static registerDemand(
    char: Character,
    movementInput: Vector2D,
    isBraking: boolean,
    isSprinting: boolean
  ): boolean {
    if (!RollMovementCapability.canRoll(char) || !char.rollMovementModule) return false;

    const mod = char.rollMovementModule;
    const inputMag = Math.hypot(movementInput.x, movementInput.y);
    const isMoving = inputMag > 0.05;

    let sprintingNow = isSprinting;
    if (sprintingNow && mod.sprintConsumesEnergy && char.energyPool) {
      if (char.energyPool.isExhausted || char.energyPool.getCurrentStamina(char.properties) <= 0.0001) {
        sprintingNow = false;
        char.setSprinting(false);
      }
    }

    if (isBraking && mod.brakeConsumesEnergy && char.energyPool) {
      const brakeWatts = mod.maxBrakePowerProp.get(char.properties);
      char.energyPool.registerDemand("brake", brakeWatts, true);
      char.energyPool.activeLocomotionId = "brake";
      return true;
    }

    const consumesEnergy = sprintingNow ? mod.sprintConsumesEnergy : mod.rollConsumesEnergy;
    if (isMoving && consumesEnergy && char.energyPool) {
      const targetSpeed = sprintingNow
        ? mod.maxSprintSpeedProp.get(char.properties)
        : mod.maxRollSpeedProp.get(char.properties);
      const accel = sprintingNow
        ? mod.sprintAccelerationProp.get(char.properties)
        : mod.baseAccelerationProp.get(char.properties);

      const totalMass = Math.max(0.2, char.mass);
      const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
      const effSpeed = Math.max(2.0, Math.min(targetSpeed, curSpeed + 2.0));

      // Mechanical driving power: P = (m * a * v) / efficiency (0.25)
      const rawWatts = (totalMass * accel * effSpeed) / 0.25;
      const cap = sprintingNow
        ? mod.maxSprintPowerProp.get(char.properties)
        : mod.maxRollPowerProp.get(char.properties);
      const allowPartial = sprintingNow ? mod.sprintAllowPartialPower : mod.rollAllowPartialPower;

      let watts = rawWatts;
      if (watts > cap) {
        watts = allowPartial ? cap : 0;
      }

      const abilityId = sprintingNow ? "sprint" : "roll";
      char.energyPool.activeLocomotionId = abilityId;
      char.energyPool.registerDemand(abilityId, watts, allowPartial);
    }

    return true;
  }

  public static actuate(
    char: Character,
    movementInput: Vector2D,
    isBraking: boolean,
    isSprinting: boolean,
    dt: number,
    _arena: Arena
  ): void {
    if (!RollMovementCapability.canRoll(char) || !char.rollMovementModule || !char.rollModule) return;

    const mod = char.rollMovementModule;
    const roll = char.rollModule;
    const R = Math.max(0.1, char.colliderRadius);

    if (isBraking) {
      mod.isBraking = true;
      mod.isRolling = false;

      // Active braking deceleration opposing current velocity
      const brakeDecel = mod.brakeDecelerationProp.get(char.properties);
      const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);

      if (curSpeed > 0) {
        const newSpeed = Math.max(0, curSpeed - brakeDecel * dt);
        if (newSpeed < 0.02) {
          char.velocity.x = 0;
          char.velocity.y = 0;
          roll.angularVelocity.x = 0;
          roll.angularVelocity.y = 0;
        } else {
          const ratio = newSpeed / curSpeed;
          char.velocity.x *= ratio;
          char.velocity.y *= ratio;
          roll.angularVelocity.x *= ratio;
          roll.angularVelocity.y *= ratio;
        }
      }

      // Strong angular damping on brake
      const damp = Math.max(0, 1.0 - 15.0 * dt);
      roll.angularVelocity.x *= damp;
      roll.angularVelocity.y *= damp;
      roll.angularVelocity.z *= damp;
      roll.updateOrientation(dt);
      return;
    }

    mod.isBraking = false;
    const inputMag = Math.hypot(movementInput.x, movementInput.y);

    if (inputMag > 0.05) {
      mod.isRolling = true;
      const dirX = movementInput.x / inputMag;
      const dirY = movementInput.y / inputMag;

      const sprintingNow = isSprinting && !(char.energyPool?.isExhausted);
      const accel = sprintingNow
        ? mod.sprintAccelerationProp.get(char.properties)
        : mod.baseAccelerationProp.get(char.properties);
      const maxSpeed = sprintingNow
        ? mod.maxSprintSpeedProp.get(char.properties)
        : mod.maxRollSpeedProp.get(char.properties);

      // Check current velocity projected along input direction
      const currentSpeedInDir = char.velocity.x * dirX + char.velocity.y * dirY;
      if (currentSpeedInDir < maxSpeed) {
        const addedSpeed = Math.min(accel * dt, maxSpeed - currentSpeedInDir);
        char.velocity.x += dirX * addedSpeed;
        char.velocity.y += dirY * addedSpeed;
      }

      // Couple linear velocity to roll angular velocity
      roll.angularVelocity.y = char.velocity.x / R;
      roll.angularVelocity.x = -char.velocity.y / R;

      // Update facing angle toward movement
      char.facingAngle = Math.atan2(dirY, dirX);
    } else {
      mod.isRolling = false;
      // No input and not braking: creature continues rolling freely!
      // Angular velocity matches linear velocity
      const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
      if (curSpeed > 0.01) {
        roll.angularVelocity.y = char.velocity.x / R;
        roll.angularVelocity.x = -char.velocity.y / R;
      }
    }

    roll.updateOrientation(dt);
  }
}
