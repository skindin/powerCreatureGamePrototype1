import { Character } from "../../character/Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { GameLoop } from "../../engine/GameLoop.js";
import type { GhostEntityState } from "../RelayClient.js";
import type { OnlineRoomClient } from "../OnlineRoomClient.js";

/**
 * Isolated Network Reconciler for Consumable Items (Apples / Food / Batteries).
 *
 * Handles remaining energy Joule synchronization, volumetric collider shrinking,
 * the 1500ms local-holder eating grace window, and authoritative object deletions.
 */
export class ConsumableNetReconciler {
  /**
   * Synchronizes consumable remaining energy and volumetric scale from a server object snapshot.
   * Returns `true` if the consumable was depleted and destroyed on this tick (caller should `continue`).
   */
  public static syncConsumableObject(
    gameLoop: GameLoop,
    localObj: GameObject,
    sObj: GhostEntityState,
    isHeldByAnyLocalPlayer: boolean
  ): boolean {
    if (localObj.consumableModule && sObj.unlimited !== undefined) {
      localObj.consumableModule.unlimited = sObj.unlimited;
    }

    if (
      localObj.consumableModule &&
      sObj.remainingEnergyJoules !== undefined &&
      !localObj.consumableModule.unlimited
    ) {
      if (
        !localObj.consumableModule.initialColliderRadius ||
        localObj.consumableModule.initialColliderRadius <= 0
      ) {
        localObj.consumableModule.initialColliderRadius = localObj.colliderRadius;
      }

      if (isHeldByAnyLocalPlayer) {
        // Local holder prediction: only softly reconcile if drift exceeds tolerance (> 100 Joules)
        const currentRemaining = localObj.consumableModule.getRemainingEnergy(localObj.properties);
        const holderChar = localObj.heldBy instanceof Character ? localObj.heldBy : null;
        const isHolderEating = Boolean(
          holderChar && holderChar.isUsingItem && holderChar.canConsumeHeldObject()
        );
        if (isHolderEating && holderChar) {
          (holderChar as any)._lastEatTime = performance.now();
        }
        const timeSinceEating = performance.now() - ((holderChar as any)?._lastEatTime || 0);
        const isRecentlyEating = isHolderEating || timeSinceEating < 1500;

        // If actively eating locally or within settling window, the server's snapshot trails by network latency.
        // Never roll back the apple to a higher (un-eaten) remaining energy while eating or settling.
        if (isRecentlyEating) {
          if (sObj.remainingEnergyJoules < currentRemaining) {
            this.applyEnergyAndScale(localObj, sObj.remainingEnergyJoules);
          }
        } else if (Math.abs(currentRemaining - sObj.remainingEnergyJoules) > 100) {
          this.applyEnergyAndScale(localObj, sObj.remainingEnergyJoules);
        }

        if (sObj.remainingEnergyJoules <= 0.001) {
          localObj.consumableModule.finishConsumption(
            holderChar || (localObj.heldBy as Character) || gameLoop.primaryCharacter!,
            localObj,
            gameLoop.objects,
            gameLoop.arena
          );
          return true;
        }
      } else {
        if (sObj.remainingEnergyJoules <= 0.001) {
          const eater =
            localObj.heldBy instanceof Character ? localObj.heldBy : gameLoop.primaryCharacter!;
          localObj.consumableModule.finishConsumption(
            eater,
            localObj,
            gameLoop.objects,
            gameLoop.arena
          );
          return true;
        }
        // Remote observer: display the consumable's authoritative eat progress and shrink in real time
        this.applyEnergyAndScale(localObj, sObj.remainingEnergyJoules);
      }
    }

    return false;
  }

  private static applyEnergyAndScale(localObj: GameObject, remainingJoules: number): void {
    if (!localObj.consumableModule) return;
    localObj.consumableModule.remainingEnergyJoulesProp.set(remainingJoules, localObj.properties);
    const currentScale = localObj.consumableModule.getScale(localObj.properties);
    const initialRadius =
      localObj.consumableModule.initialColliderRadius || localObj.colliderRadius;
    const targetRadius = Math.max(
      localObj.consumableModule.minRadiusFloor,
      initialRadius * currentScale
    );
    localObj.colliderRadius = targetRadius;
    if (localObj.colliderModule) {
      localObj.colliderModule.radius = targetRadius;
    }
  }

  /**
   * Processes authoritative object deletion events (e.g. depleted food/apple) from a server snapshot.
   */
  public static processObjectDeletionEvents(
    gameLoop: GameLoop,
    client: OnlineRoomClient,
    objectDeletionEvents: Array<{ eventId: string; objectId: string; tick: number }> | undefined
  ): void {
    if (!Array.isArray(objectDeletionEvents) || objectDeletionEvents.length === 0) return;

    for (const del of objectDeletionEvents) {
      const objId = del.objectId;
      gameLoop.deletedConsumableIds.add(objId);

      // Acknowledge priority deletion event back to server
      client.unacknowledgedObjectDeletionAcks.add(del.eventId);

      // Unconditionally delete object from gameLoop and arena
      const idx = gameLoop.objects.findIndex((o) => o.id === objId);
      if (idx !== -1) {
        const targetObj = gameLoop.objects[idx];
        if (targetObj.heldBy && (targetObj.heldBy as Character).heldObject === targetObj) {
          (targetObj.heldBy as Character).heldObject = null;
        }
        targetObj.isHeld = false;
        targetObj.heldBy = null;
        gameLoop.objects.splice(idx, 1);
      }
      for (const p of gameLoop.players.values()) {
        if (p.character.heldObject && p.character.heldObject.id === objId) {
          p.character.heldObject = null;
        }
      }
      for (const c of gameLoop.allCharacters) {
        if (c.heldObject && c.heldObject.id === objId) {
          c.heldObject = null;
        }
      }
      if (Array.isArray((gameLoop.arena as any).entities)) {
        const eIdx = (gameLoop.arena as any).entities.findIndex((e: any) => e.id === objId);
        if (eIdx !== -1) {
          (gameLoop.arena as any).entities.splice(eIdx, 1);
        }
      }
    }
  }
}
