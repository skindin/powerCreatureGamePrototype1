import { Arena } from "./Arena.js";
import { GameObject } from "./GameObject.js";

/**
 * Handles vertical physics (gravity integration, surface impact bounce,
 * roll angular velocity coupling) and ground friction deceleration.
 */
export class MotionIntegrator {
  /**
   * Integrates vertical velocity and position under gravity, resolving surface contact and bounces.
   */
  public static integrateVerticalMotion(
    entity: GameObject,
    surfaceHeight: number,
    dt: number,
    arena: Arena
  ): void {
    if (entity.hasGravity && entity.hasVerticalVelocity) {
      if (entity.position.z > surfaceHeight || entity.verticalVelocity !== 0) {
        entity.verticalVelocity -= arena.gravity * dt;
        entity.position.z += entity.verticalVelocity * dt;

        // Surface impact (hitting floor or top of wall from above)
        if (entity.position.z <= surfaceHeight) {
          entity.position.z = surfaceHeight;
          const bounceThreshold = Math.max(0.25, 1.25 * arena.gravity * dt);
          if (
            !entity.isCharacter &&
            entity.hasVerticalBounce &&
            entity.bounceMod !== null &&
            entity.bounceMod > 0 &&
            Math.abs(entity.verticalVelocity) > bounceThreshold
          ) {
            const impactVz = Math.abs(entity.verticalVelocity);
            entity.verticalVelocity = -entity.verticalVelocity * entity.bounceMod;

            // Vertical bounce couples into rolling dynamics only if surface friction is present
            if (entity.hasFriction && entity.rollModule && entity.rollModule.enabled) {
              const roll = entity.rollModule;
              const R = entity.colliderRadius > 0 ? entity.colliderRadius : 0.3;
              const beta = 0.4;
              const e = entity.bounceMod;
              const normalImpulse = (1 + e) * entity.mass * impactVz;

              const muBounce = arena.frictionCoeff * entity.dynamicGroundFrictionMod * 0.05;
              const vSlipX = entity.velocity.x - roll.angularVelocity.y * R;
              const vSlipY = entity.velocity.y + roll.angularVelocity.x * R;
              const slipSpeed = Math.hypot(vSlipX, vSlipY);

              if (slipSpeed > 0.001 && muBounce > 0) {
                const maxFricImpulse = muBounce * normalImpulse;
                const stickImpulse = (slipSpeed * entity.mass) / (1 + 1 / beta);
                const actualImpulse = Math.min(stickImpulse, maxFricImpulse);

                const impX = (vSlipX / slipSpeed) * actualImpulse;
                const impY = (vSlipY / slipSpeed) * actualImpulse;

                entity.velocity.x -= impX / entity.mass;
                entity.velocity.y -= impY / entity.mass;

                roll.angularVelocity.y += impX / (beta * entity.mass * R);
                roll.angularVelocity.x -= impY / (beta * entity.mass * R);
              }

              const spinDamp = Math.max(0.65, 1.0 - (1 - e) * 0.35);
              roll.angularVelocity.x *= spinDamp;
              roll.angularVelocity.y *= spinDamp;
              roll.angularVelocity.z *= spinDamp;
            }
          } else {
            // No bounce: dead stick impact
            entity.verticalVelocity = 0;
          }
        }
      }
    } else {
      // Zero gravity: maintains elevation unless vertical velocity is present
      if (entity.hasVerticalVelocity && entity.verticalVelocity !== 0) {
        entity.position.z += entity.verticalVelocity * dt;
        if (entity.position.z <= surfaceHeight) {
          entity.position.z = surfaceHeight;
          const bounceThreshold = Math.max(0.25, 1.25 * arena.gravity * dt);
          if (
            entity.hasVerticalBounce &&
            entity.bounceMod !== null &&
            entity.bounceMod > 0 &&
            Math.abs(entity.verticalVelocity) > bounceThreshold
          ) {
            entity.verticalVelocity = -entity.verticalVelocity * entity.bounceMod;
          } else {
            entity.verticalVelocity = 0;
          }
        }
      }
    }
  }

  /**
   * Applies ground friction, roll resistance, and rolling angular coupling to an entity resting on a surface.
   */
  public static integrateGroundFrictionAndRoll(
    entity: GameObject,
    surfaceHeight: number,
    dt: number,
    arena: Arena
  ): void {
    const restVzThreshold = Math.max(0.05, 1.1 * arena.gravity * dt);
    const isResting =
      Math.abs(entity.position.z - surfaceHeight) <= 0.02 &&
      Math.abs(entity.verticalVelocity) <= restVzThreshold;

    if (isResting && entity.hasFriction) {
      const isActivelyWalking =
        entity.isCharacter &&
        (entity as any).walkingModule?.enabled &&
        (entity as any).isActivelyWalking;

      if (!isActivelyWalking) {
        if (entity.rollModule && entity.rollModule.enabled) {
          const roll = entity.rollModule;
          const R = entity.colliderRadius > 0 ? entity.colliderRadius : 0.3;
          const muG = arena.frictionCoeff * entity.dynamicGroundFrictionMod;
          const beta = 0.4;

          const vSlipX = entity.velocity.x - roll.angularVelocity.y * R;
          const vSlipY = entity.velocity.y + roll.angularVelocity.x * R;
          const slipSpeed = Math.hypot(vSlipX, vSlipY);

          if (muG > 0 && slipSpeed > 0.001) {
            const maxSlipDelta = muG * (1 + 1 / beta) * dt;
            if (slipSpeed <= maxSlipDelta) {
              const totalMomX = entity.velocity.x + beta * roll.angularVelocity.y * R;
              const totalMomY = entity.velocity.y - beta * roll.angularVelocity.x * R;
              const rollVx = totalMomX / (1 + beta);
              const rollVy = totalMomY / (1 + beta);
              entity.velocity.x = rollVx;
              entity.velocity.y = rollVy;
              roll.angularVelocity.y = rollVx / R;
              roll.angularVelocity.x = -rollVy / R;
            } else {
              const fx = (vSlipX / slipSpeed) * muG * dt;
              const fy = (vSlipY / slipSpeed) * muG * dt;
              entity.velocity.x -= fx;
              entity.velocity.y -= fy;
              roll.angularVelocity.y += fx / (beta * R);
              roll.angularVelocity.x -= fy / (beta * R);
            }
          }

          // Roll Resistance
          const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
          if (speed > 0) {
            if (roll.rollResistance > 0) {
              const decel = roll.rollResistance * dt;
              const newSpeed = Math.max(0, speed - decel);
              if (newSpeed < 0.005) {
                entity.velocity.x = 0;
                entity.velocity.y = 0;
                roll.angularVelocity.x = 0;
                roll.angularVelocity.y = 0;
              } else {
                const ratio = newSpeed / speed;
                entity.velocity.x *= ratio;
                entity.velocity.y *= ratio;
                roll.angularVelocity.x *= ratio;
                roll.angularVelocity.y *= ratio;
              }
            }
          } else {
            const spinSpeed = Math.hypot(roll.angularVelocity.x, roll.angularVelocity.y);
            if (spinSpeed > 0 && muG > 0) {
              const spinDecel = (muG / (beta * R)) * dt;
              const newSpin = Math.max(0, spinSpeed - spinDecel);
              const ratio = spinSpeed > 0 ? newSpin / spinSpeed : 0;
              roll.angularVelocity.x *= ratio;
              roll.angularVelocity.y *= ratio;
            }
          }

          if (Math.abs(roll.angularVelocity.z) > 0.001) {
            if (roll.rollResistance > 0) {
              const zDecel = (roll.rollResistance / (beta * R)) * dt;
              const signZ = Math.sign(roll.angularVelocity.z);
              const magZ = Math.abs(roll.angularVelocity.z);
              roll.angularVelocity.z = magZ <= zDecel ? 0 : signZ * (magZ - zDecel);
            }
          }

          roll.updateVisualPhase(dt);
        } else {
          // Standard sliding ground friction
          const speed = Math.hypot(entity.velocity.x, entity.velocity.y);
          if (speed > 0) {
            const staticThreshold = arena.staticFrictionThreshold * entity.staticGroundFrictionMod;
            if (speed < staticThreshold) {
              entity.velocity.x = 0;
              entity.velocity.y = 0;
            } else {
              const frictionForce = arena.frictionCoeff * entity.dynamicGroundFrictionMod * dt;
              const newSpeed = Math.max(0, speed - frictionForce);
              const ratio = newSpeed / speed;
              entity.velocity.x *= ratio;
              entity.velocity.y *= ratio;
            }
          }
        }
      }
    } else {
      // Frictionless or airborne or no mass: spin is NOT affected by ground!
      if (entity.rollModule && entity.rollModule.enabled) {
        entity.rollModule.updateVisualPhase(dt);
      }
    }
  }
}
