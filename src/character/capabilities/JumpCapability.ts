import type { Character } from "../Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated 1-to-1 capability slice for Vertical Jumping & Landing Buffers.
 * Encapsulates jump metabolic work calculation, EnergyPool burst rationing,
 * and takeoff velocity scaling while keeping Tier 1 JumpModule.ts sealed.
 */
export class JumpCapability {
  public static canJump(char: Character): boolean {
    return Boolean(char.jumpModule && char.jumpModule.enabled && char.hasVerticalPosition);
  }

  public static executeJump(char: Character, arena?: Arena, movementInput?: Vector2D): boolean {
    if (!char.jumpModule || !char.jumpModule.enabled || !char.hasVerticalPosition) {
      return false;
    }

    // A jump can ONLY occur from a supporting surface (ground or wall top).
    // If airborne, do NOT consume energy!
    const surfaceZ = char.supportingSurfaceHeight ?? 0;
    const isGrounded =
      char.isRestingOnSurface ||
      (Math.abs(char.position.z - surfaceZ) <= 0.08 && Math.abs(char.verticalVelocity) <= 0.8);

    if (!isGrounded || char.isHeld) {
      return false;
    }

    // Base unencumbered target takeoff speed (aiming for standard jump height)
    const baseMass = Math.max(0.2, char.baseMass ?? 1.2);
    const totalMass = Math.max(0.2, char.mass);
    const jumpStrength = char.jumpModule.jumpStrengthProp.get(char.properties);
    const maxInitialSpeed = char.jumpModule.maxInitialSpeedProp.get(char.properties);
    const targetTakeoffSpeed = Math.min(maxInitialSpeed, jumpStrength / baseMass);

    if (targetTakeoffSpeed <= 0.01) return false;

    // Target mechanical work needed to propel the full total mass (creature + held item) to normal jump height:
    // W_mech = 0.5 * totalMass * targetTakeoffSpeed^2
    const mechanicalJoules = 0.5 * totalMass * (targetTakeoffSpeed * targetTakeoffSpeed);
    const pool = char.energyPool;
    const efficiency = Math.max(0.01, pool ? pool.getMuscleEfficiency(char.properties) : 0.25);
    const rawMetabolicJoules = Math.max(15, mechanicalJoules / efficiency);
    const jumpCap = char.jumpMaxPowerProp ? char.jumpMaxPowerProp.get(char.properties) : 1200;
    // Demanded burst Joules is budgeted up to the ability's jumpCap:
    const metabolicJoules = Math.min(rawMetabolicJoules, Math.max(0, jumpCap));

    let energyFraction = 1.0;
    if (char.jumpConsumesEnergy) {
      if (pool) {
        if (pool.isExhausted) {
          pool.notifyInsufficientEnergy({
            abilityId: "jump",
            demandedAmount: metabolicJoules,
            isBurst: true,
            registry: char.properties,
          });
          return false;
        }
        if (!char.jumpAllowPartialPower && !pool.canSatisfyFullEnergy(metabolicJoules, 0.05, char.properties)) {
          pool.notifyInsufficientEnergy({
            abilityId: "jump",
            demandedAmount: metabolicJoules,
            isBurst: true,
            registry: char.properties,
          });
          return false;
        }
        const burstRes = pool.requestInstantBurst({
          abilityId: "jump",
          demandedJoules: metabolicJoules,
          allowPartialPower: char.jumpAllowPartialPower,
          registry: char.properties,
        });
        if (!burstRes.granted || burstRes.grantedJoules <= 0.001 || (!char.jumpAllowPartialPower && burstRes.fraction < 1.0)) {
          return false;
        }
        energyFraction = burstRes.fraction * (metabolicJoules / rawMetabolicJoules);
      }
    }

    const jumped = char.jumpModule.jump(char, arena, movementInput);
    if (jumped) {
      const achievableSpeed = targetTakeoffSpeed * Math.sqrt(energyFraction);
      char.verticalVelocity = achievableSpeed;
    }
    return jumped;
  }
}
