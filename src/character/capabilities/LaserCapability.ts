import type { Character, AnticipatedModifier } from "../Character.js";
import type { Arena } from "../../engine/Arena.js";

/**
 * Isolated 1-to-1 capability slice for the Continuous Laser Blast ability.
 * Encapsulates HUD anticipated modifier preview and per-tick LaserModule actuation.
 */
export class LaserCapability {
  public static getAnticipatedModifier(char: Character): AnticipatedModifier | null {
    if (char.laserModule && char.laserModule.enabled && char.laserModule.isAiming && !char.laserModule.isFiring) {
      const demandedPower = char.laserModule.calculateDemandedPower(
        char.properties,
        char.laserPowerFraction > 0 ? char.laserPowerFraction : 1.0
      );
      const pool = char.energyPool;
      if (demandedPower > 0 && (!pool || !pool.isExhausted)) {
        return {
          id: "anticipated_laser",
          abilityId: "laser_blast",
          name: "Laser",
          color: "#06b6d4",
          amount: Math.round(demandedPower),
          isBurst: false,
          isPositive: false,
          order: 940,
        };
      }
    }
    return null;
  }

  public static isLaserModeActive(char: Character): boolean {
    return Boolean(
      char.isLaserAiming ||
      char.isLaserFiring ||
      (char.laserModule && (char.laserModule.isAiming || char.laserModule.isFiring))
    );
  }

  public static actuate(char: Character, dt: number, arena: Arena): void {
    if (char.laserModule && char.laserModule.enabled) {
      char.laserModule.update(
        dt,
        char,
        arena,
        char.laserAimTarget,
        char.isLaserAiming,
        char.isLaserFiring,
        char.laserCandidateEntities,
        0,
        char.laserPowerFraction
      );
      char.isLaserFiring = char.laserModule.isFiring;
    }
  }
}

