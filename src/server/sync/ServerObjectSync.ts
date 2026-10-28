/**
 * ServerObjectSync.ts
 *
 * Extracted from ServerGameSimulation.ts:
 * Synchronizes server simulation objects and consumed-object settlements from incoming client packets.
 * Includes the Dual Competing Authority Channels guard (`hasPendingThrow`) so raw telemetry
 * never drops a held object before a queued `isThrow` packet or reliable throw action executes.
 */

import type { ServerGameSimulation } from "../ServerGameSimulation.js";
import type { GhostEntityState } from "../../network/RelayClient.js";
import { GameObject } from "../../engine/GameObject.js";
import { Character } from "../../character/Character.js";
import { ConsumableModule } from "../../engine/ConsumableModule.js";

export class ServerObjectSync {
  /**
   * Synchronizes server simulation objects from incoming client telemetry packets.
   */
  public static syncObjectsFromPacket(
    sim: ServerGameSimulation,
    clientObjects: GhostEntityState[],
    senderClientId?: string
  ): void {
    if (!clientObjects || clientObjects.length === 0) return;

    const now = performance.now();

    for (const cObj of clientObjects) {
      if (sim.deletedObjectIds.has(cObj.id)) {
        continue;
      }
      if (cObj.remainingEnergyJoules !== undefined && cObj.remainingEnergyJoules <= 0.001) {
        sim.triggerObjectDeletion(cObj.id);
        continue;
      }
      let sObj = sim.objects.find((o) => o.id === cObj.id);
      if (!sObj) {
        const pId = cObj.prefabId || (cObj.name === "Apple" || cObj.id.startsWith("apple-") ? "prefab_apple" : undefined);
        const prefab = pId ? sim.prefabManager.get(pId) : undefined;
        if (prefab) {
          sObj = prefab.instantiate({ x: cObj.x, y: cObj.y, z: cObj.z }, sim.arena);
          sObj.id = cObj.id;
          sObj.velocity.x = cObj.vx;
          sObj.velocity.y = cObj.vy;
          sObj.verticalVelocity = cObj.vz ?? 0;
          if (cObj.name !== undefined) sObj.name = cObj.name;
          if (cObj.color !== undefined) sObj.color = cObj.color;
          if (cObj.shape !== undefined) sObj.visualShape = cObj.shape;
          if (cObj.radius !== undefined) {
            sObj.colliderRadius = cObj.radius;
            if (sObj.consumableModule) {
              sObj.consumableModule.initialColliderRadius = cObj.radius;
            }
          }
          if (cObj.mass !== undefined) sObj.mass = cObj.mass;
          if (cObj.bounceMod !== undefined) sObj.bounceMod = cObj.bounceMod;
        } else {
          sObj = new GameObject({
            id: cObj.id,
            name: cObj.name || "Object",
            position: { x: cObj.x, y: cObj.y, z: cObj.z },
            mass: cObj.mass ?? 1.0,
            bounceMod: cObj.bounceMod ?? 0.0,
            color: cObj.color || "#38bdf8",
            colliderRadius: cObj.radius || 0.35,
            visualShape: cObj.shape || "circle",
            consumableModule: cObj.consumableTag
              ? new ConsumableModule({
                  tag: cObj.consumableTag,
                  totalEnergyJoules: cObj.totalEnergyJoules ?? 4000,
                  remainingEnergyJoules: cObj.remainingEnergyJoules ?? cObj.totalEnergyJoules ?? 4000,
                })
              : undefined,
          });
        }
        sim.objects.push(sObj);
        sim.arena.entities = [...sim.allCharacters, ...sim.objects];
      }

      // Synchronize consumable remaining energy from client stream (adopt client's consumed energy progression)
      if (sObj.consumableModule && cObj.remainingEnergyJoules !== undefined && !sObj.consumableModule.unlimited) {
        const curServerRemaining = sObj.consumableModule.getRemainingEnergy(sObj.properties);
        const clientRemaining = cObj.remainingEnergyJoules;
        if (sObj.isHeld) {
          if (clientRemaining < curServerRemaining) {
            const energyEaten = curServerRemaining - clientRemaining;
            const holder = (sObj.heldBy instanceof Character) ? sObj.heldBy : null;
            if (holder && holder.energyPool && holder.energyPool.enabled) {
              const curPool = holder.energyPool.getCurrentEnergy(holder.properties);
              const maxPool = holder.energyPool.getMaxEnergy(holder.properties);
              holder.energyPool.currentEnergyProp.set(Math.min(maxPool, curPool + energyEaten), holder.properties);
            }
            const healRate = sObj.consumableModule.getHealRate(sObj.properties);
            const consumeRate = sObj.consumableModule.getConsumeRate(sObj.properties);
            if (healRate > 0 && consumeRate > 0 && holder && holder.healthModule && holder.healthModule.enabled) {
              const secondsEaten = energyEaten / consumeRate;
              holder.healthModule.heal(healRate * secondsEaten, holder.properties, {
                id: "consumable_nutrition",
                name: sObj.consumableModule.tag ? `Consumable (${sObj.consumableModule.tag})` : "Consumable",
                type: "continuous",
                rate: healRate,
                color: "#22c55e",
                isHeal: true,
              });
            }
            sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
            const currentScale = sObj.consumableModule.getScale(sObj.properties);
            const initialRadius = sObj.consumableModule.initialColliderRadius || sObj.colliderRadius;
            sObj.colliderRadius = Math.max(sObj.consumableModule.minRadiusFloor, initialRadius * currentScale);
            if (sObj.colliderModule) sObj.colliderModule.radius = sObj.colliderRadius;
          } else if (Math.abs(clientRemaining - curServerRemaining) > 100) {
            sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
          }
        } else {
          sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
        }
      }

      // 1. Synchronize Held State
      if (cObj.isHeld) {
        const holderId = cObj.heldBy || senderClientId;
        const sChar = holderId
          ? (sim.characters.get(holderId) || sim.allCharacters.find((c) => c.playerId === holderId || c.id === holderId))
          : null;
        if (sChar) {
          // If the character recently died and has not legitimately picked up a new item after dying, reject client packet attempting to hold/move it!
          if (sChar.hasDiedAwaitingNewPickup) {
            continue;
          }
          // If the object is ALREADY held by another character on the server, reject client packet attempting to steal it!
          if (sObj.isHeld && sObj.heldBy && sObj.heldBy !== sChar) {
            continue;
          }
          sObj.isHeld = true;
          sObj.heldBy = sChar;
          sChar.heldObject = sObj;
          const relPos = sChar.calculateHeldObjectPosition(sim.arena);
          sObj.position.x = relPos.x;
          sObj.position.y = relPos.y;
          sObj.position.z = relPos.z;
          sObj.velocity.x = sChar.velocity.x;
          sObj.velocity.y = sChar.velocity.y;
          sObj.verticalVelocity = 0;
        }
        continue;
      } else if (sObj.isHeld) {
        // Was held on server: only the character holding it can release it via their packet!
        const holderChar = sObj.heldBy instanceof Character ? sObj.heldBy : null;
        const holderId = holderChar ? (holderChar.playerId || holderChar.id) : null;
        if (senderClientId && holderId && holderId !== senderClientId) {
          // Packet from another client who is NOT holding this object: DO NOT ungrab!
          continue;
        }

        // Dual Authority Channel Guard:
        // Never allow raw telemetry to unhold/drop an object if the holder has a pending throw
        // in the jitter buffer or just executed a throw within the last 250ms!
        if (holderChar) {
          const hasPendingThrow =
            (((holderChar as any)._pendingThrowUntilMs ?? 0) > now) ||
            (now - ((holderChar as any)._lastServerThrowTime ?? 0) < 250);
          if (hasPendingThrow) {
            continue;
          }
        }

        sObj.isHeld = false;
        if (sObj.heldBy && sObj.heldBy instanceof Character) {
          sObj.heldBy.heldObject = null;
        }
        sObj.heldBy = null;

        // If the object being dropped/released was a consumed/depleted item, trigger authoritative deletion immediately!
        if (sObj.consumableModule && (sObj.consumableModule.isConsumed || sObj.consumableModule.getRemainingEnergy(sObj.properties) <= 0.001)) {
          sim.triggerObjectDeletion(sObj.id);
          continue;
        }
      }

      // STRICT MULTIPLAYER AUTHORITY RULE:
      // Freebody objects in the arena (in flight, resting, rolling) are simulated authoritatively
      // by the 60Hz server engine. Non-holding clients CANNOT overwrite freebody position or velocity!
      continue;
    }
  }

  /**
   * Settles a consumable the client reports as fully eaten.
   */
  public static settleClientConsumedObject(
    sim: ServerGameSimulation,
    serverCharId: string,
    objectId: string
  ): void {
    const sChar = sim.characters.get(serverCharId);
    const obj = sim.objects.find((o) => o.id === objectId) || (sChar?.heldObject?.id === objectId ? sChar.heldObject : null);
    const holder = (obj && obj.heldBy instanceof Character) ? obj.heldBy : sChar;
    const isHolder = Boolean(holder && (
      holder === sChar ||
      holder.id === serverCharId ||
      holder.playerId === serverCharId ||
      (holder as any).serverCharId === serverCharId
    ));
    if (obj && holder && isHolder && obj.consumableModule) {
      if (obj.consumableModule.unlimited) return;
      const cm = obj.consumableModule;
      const remaining = cm.getRemainingEnergy(obj.properties);
      if (remaining > 0.001) {
        if (holder.energyPool && holder.energyPool.enabled) {
          const pool = holder.energyPool;
          const cur = pool.getCurrentEnergy(holder.properties);
          const max = pool.getMaxEnergy(holder.properties);
          pool.currentEnergyProp.set(Math.min(max, cur + remaining), holder.properties);
        }
        const healRate = cm.getHealRate(obj.properties);
        if (healRate > 0 && holder.healthModule && holder.healthModule.enabled) {
          const secondsLeft = remaining / cm.getConsumeRate(obj.properties);
          holder.healthModule.heal(healRate * secondsLeft, holder.properties, {
            id: "consumable_nutrition",
            name: cm.tag ? `Consumable (${cm.tag})` : "Consumable",
            type: "continuous",
            rate: healRate,
            color: "#22c55e",
            isHeal: true,
          });
        }
        cm.remainingEnergyJoulesProp.set(0, obj.properties);
      }
    }
    sim.triggerObjectDeletion(objectId);
  }
}
