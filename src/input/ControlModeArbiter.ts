import type { Character } from "../character/Character.js";

/**
 * Exclusive modal action states for primary button / trigger arbitration.
 *
 * Priority Hierarchy (Highest to Lowest):
 * 1. `LASER`   — Active when `isLaserAiming` or `isLaserFiring` (`laserModule.isAiming || laserModule.isFiring`).
 *                Suppresses throw charging, trajectory preview, and pickup.
 * 2. `CONSUME` — Active when holding an edible object and `isConsumingItem`
 *                (or eating latches the primary action button until release).
 *                Suppresses throw charging and trajectory preview until button release.
 * 3. `THROW`   — Active when holding a non-eating object (`heldObject !== null`
 *                and `!isConsumingItem` and `!isLaserActive`).
 * 4. `PICKUP`  — Active when empty-handed (`heldObject === null` and `!isLaserActive`).
 */
export type PrimaryControlMode = "LASER" | "CONSUME" | "THROW" | "PICKUP";

export class ControlModeArbiter {
  /**
   * Evaluates the current exclusive primary action control mode for a character.
   * Modify ONLY this method when adding or reordering modal primary-action abilities.
   */
  public static resolvePrimaryMode(
    character: Character,
    eatActionLatchedUntilRelease: boolean = false
  ): PrimaryControlMode {
    const isLaserActive = Boolean(
      character.isLaserAiming ||
      character.isLaserFiring ||
      (character.laserModule && character.laserModule.enabled && (character.laserModule.isAiming || character.laserModule.isFiring))
    );
    if (isLaserActive) {
      return "LASER";
    }
    const isEating = Boolean(character.isConsumingItem);
    if (isEating || eatActionLatchedUntilRelease) {
      return "CONSUME";
    }
    if (character.heldObject !== null) {
      return "THROW";
    }
    return "PICKUP";
  }

  /**
   * Returns true if the character is currently permitted to charge a throw or
   * display the ballistic throw trajectory preview.
   */
  public static canAimOrChargeThrow(
    character: Character,
    eatActionLatchedUntilRelease: boolean = false
  ): boolean {
    const isLaserActive = Boolean(
      character.isLaserAiming ||
      character.isLaserFiring ||
      (character.laserModule && character.laserModule.enabled && (character.laserModule.isAiming || character.laserModule.isFiring))
    );
    const isEating = Boolean(character.isConsumingItem);
    return (
      character.heldObject !== null &&
      !isEating &&
      !eatActionLatchedUntilRelease &&
      !isLaserActive
    );
  }
}
