import type { Character } from "../Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * RollMovementCapability: Isolated 1-to-1 capability slice for rolling creatures.
 * Exerts directional torque to accelerate, sustains roll momentum when input ceases,
 * registers metabolic energy demand, and handles active physical counter-torque braking.
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

    if (isBraking) {
      // Braking temporarily increases roll resistance and does not require energy
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
      const enforceMax = sprintingNow
        ? mod.enforceMaxSprintSpeed
        : mod.enforceMaxRollSpeed;

      const totalMass = Math.max(0.2, char.mass);
      const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
      const effSpeed = enforceMax
        ? Math.max(2.0, Math.min(targetSpeed, curSpeed + 2.0))
        : Math.max(2.0, curSpeed + 2.0);

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

    char.isActivelyWalking = false;
    const mod = char.rollMovementModule;
    const roll = char.rollModule;
    const R = Math.max(0.1, char.colliderRadius);

    if (isBraking) {
      mod.isBraking = true;
      mod.isRolling = false;

      // Active braking: temporarily increases roll resistance and does not require energy
      const brakeResistance = mod.brakeRollResistanceProp.get(char.properties);
      roll.rollResistanceProp.literalValue = brakeResistance;
      roll.rollResistanceProp.set(brakeResistance, char.properties);
      char.properties?.set("rollResistance", brakeResistance);

      const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
      const spinSpeed = Math.hypot(roll.angularVelocity.x, roll.angularVelocity.y);
      if (curSpeed <= 0.01 && spinSpeed <= 0.01) {
        char.velocity.x = 0;
        char.velocity.y = 0;
        roll.angularVelocity.x = 0;
        roll.angularVelocity.y = 0;
        return;
      }

      // When resting on ground and nearly stopped, clamp residual drift to prevent endless micro-sliding
      if (char.isRestingOnSurface && curSpeed < 0.05 && spinSpeed < 0.05) {
        char.velocity.x = 0;
        char.velocity.y = 0;
        roll.angularVelocity.x = 0;
        roll.angularVelocity.y = 0;
      }

      return;
    }

    mod.isBraking = false;
    // When not braking, restore free roll resistance
    const freeResistance = mod.freeRollResistanceProp.get(char.properties);
    roll.rollResistanceProp.literalValue = freeResistance;
    roll.rollResistanceProp.set(freeResistance, char.properties);
    char.properties?.set("rollResistance", freeResistance);
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
      const enforceMax = sprintingNow
        ? mod.enforceMaxSprintSpeed
        : mod.enforceMaxRollSpeed;

      const consumesEnergy = sprintingNow ? mod.sprintConsumesEnergy : mod.rollConsumesEnergy;
      let powerScale = 1.0;

      if (consumesEnergy && char.energyPool) {
        const totalMass = Math.max(0.2, char.mass);
        const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
        const effSpeed = enforceMax
          ? Math.max(2.0, Math.min(maxSpeed, curSpeed + 2.0))
          : Math.max(2.0, curSpeed + 2.0);
        const rawWatts = (totalMass * accel * effSpeed) / 0.25;
        const cap = sprintingNow
          ? mod.maxSprintPowerProp.get(char.properties)
          : mod.maxRollPowerProp.get(char.properties);
        const allowPartial = sprintingNow ? mod.sprintAllowPartialPower : mod.rollAllowPartialPower;

        let requestedWatts = rawWatts;
        if (requestedWatts > cap) {
          requestedWatts = allowPartial ? cap : 0;
        }

        const abilityId = sprintingNow ? "sprint" : "roll";
        const grantedWatts = char.energyPool.requestPower(
          requestedWatts,
          dt,
          char.properties,
          false,
          abilityId,
          allowPartial
        );
        powerScale = requestedWatts > 0 ? Math.min(1.0, grantedWatts / requestedWatts) : 0;
      }

      if (powerScale > 0.001) {
        const effectiveAccel = accel * powerScale;
        if (enforceMax) {
          // Max speed is enforced: check current velocity projected along input direction
          const currentSpeedInDir = char.velocity.x * dirX + char.velocity.y * dirY;
          const effectiveMaxSpeed = maxSpeed * (mod.rollAllowPartialPower ? Math.max(0.2, powerScale) : 1.0);
          if (currentSpeedInDir < effectiveMaxSpeed) {
            const addedSpeed = Math.min(effectiveAccel * dt, effectiveMaxSpeed - currentSpeedInDir);
            char.velocity.x += dirX * addedSpeed;
            char.velocity.y += dirY * addedSpeed;
          }
          const curSpeed = Math.hypot(char.velocity.x, char.velocity.y);
          if (curSpeed > effectiveMaxSpeed) {
            char.velocity.x = (char.velocity.x / curSpeed) * effectiveMaxSpeed;
            char.velocity.y = (char.velocity.y / curSpeed) * effectiveMaxSpeed;
          }
        } else {
          // Max speed is NOT enforced (off by default): accelerate freely without speed cap!
          char.velocity.x += dirX * effectiveAccel * dt;
          char.velocity.y += dirY * effectiveAccel * dt;
        }
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
  }
}
