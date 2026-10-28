import { Character } from "../../character/Character.js";
import { GameObject } from "../../engine/GameObject.js";
import type { GameLoop } from "../../engine/GameLoop.js";
import type { GhostEntityState } from "../RelayClient.js";
import { prefabManager } from "../../engine/prefab/PrefabManager.js";
import { ConsumableModule } from "../../engine/ConsumableModule.js";
import { DamageAuraModule } from "../../engine/DamageAuraModule.js";
import { RollModule } from "../../engine/RollModule.js";
import { ConsumableNetReconciler } from "./ConsumableNetReconciler.js";

/**
 * Isolated Network Reconciler for Dynamic Freebody Objects & Ballistics (Tier 2 Protected)
 *
 * Handles:
 * - Authoritative server prefab/object instantiation on the client
 * - Remote player hold/release and Instant Throw Hand-Off (zero hesitation)
 * - Local player throw/drop RTT prediction guard
 * - Ballistic in-flight, ground landing transition, and ground rollout latency envelopes
 * - Sleeping body snapping and smooth convergence
 */
export class ObjectBallisticsReconciler {
  public static syncAuthoritativeObjects(
    gameLoop: GameLoop,
    serverObjects: GhostEntityState[],
    localClientId?: string,
    serverSeq?: number
  ): void {
    if (!gameLoop.enableAuthoritativeObjectSync) return;
    if (!serverObjects) return;
    if (gameLoop.devPanel?.isEditMode) return;

    // Reject out-of-order or duplicate server snapshots
    if (serverSeq !== undefined && serverSeq <= gameLoop.lastAppliedObjectSeq) {
      return;
    }
    if (serverSeq !== undefined) {
      gameLoop.lastAppliedObjectSeq = serverSeq;
    }

    let maxDrift = 0;

    for (const sObj of serverObjects) {
      if (gameLoop.deletedConsumableIds.has(sObj.id)) {
        const existingIdx = gameLoop.objects.findIndex((o) => o.id === sObj.id);
        if (existingIdx !== -1) {
          const removed = gameLoop.objects.splice(existingIdx, 1)[0];
          if (removed.heldBy && (removed.heldBy as Character).heldObject === removed) {
            (removed.heldBy as Character).heldObject = null;
          }
        }
        continue;
      }

      let localObj = gameLoop.objects.find((o) => o.id === sObj.id);
      if (!localObj) {
        if (
          gameLoop.deletedConsumableIds.has(sObj.id) ||
          (sObj.remainingEnergyJoules !== undefined && sObj.remainingEnergyJoules <= 0.001)
        ) {
          continue;
        }
        localObj = this.instantiateServerObject(gameLoop, sObj);
      }

      // Synchronize explicit overrides sent from server on existing object
      if (sObj.name !== undefined && localObj.name !== sObj.name) localObj.name = sObj.name;
      if (sObj.color !== undefined && localObj.color !== sObj.color) localObj.color = sObj.color;
      if (sObj.shape !== undefined && localObj.visualShape !== sObj.shape) localObj.visualShape = sObj.shape;
      if (sObj.mass !== undefined && Math.abs(localObj.mass - sObj.mass) > 0.001) localObj.mass = sObj.mass;
      if (sObj.bounceMod !== undefined && Math.abs((localObj.bounceMod ?? 0) - sObj.bounceMod) > 0.001) {
        localObj.bounceMod = sObj.bounceMod;
      }

      // 1. Identify if held by any local player on this machine
      const isHeldByAnyLocalPlayer = Boolean(
        localObj.isHeld &&
          localObj.heldBy &&
          Array.from(gameLoop.players.values()).some(
            (p) =>
              p.character === localObj!.heldBy ||
              (localObj!.heldBy as Character).playerId === p.id ||
              (localObj!.heldBy as Character).id === p.id
          )
      );

      // Delegate consumable remaining Joules & volumetric scale reconciliation
      const wasDepleted = ConsumableNetReconciler.syncConsumableObject(
        gameLoop,
        localObj,
        sObj,
        isHeldByAnyLocalPlayer
      );
      if (wasDepleted) {
        continue;
      }

      // If the server explicitly says a remote player holds this object,
      // force local client to relinquish possession if it mistakenly thought it was holding it!
      const sHeldBy = sObj.heldBy;
      const isServerHeldByRemote = Boolean(
        sObj.isHeld &&
          sHeldBy &&
          !Array.from(gameLoop.players.values()).some(
            (p) =>
              sHeldBy === p.id ||
              sHeldBy === p.character.playerId ||
              sHeldBy === p.character.serverCharId ||
              (localClientId && (sHeldBy === localClientId || sHeldBy.startsWith(`${localClientId}:`)))
          )
      );

      if (isHeldByAnyLocalPlayer && isServerHeldByRemote) {
        if (localObj.heldBy instanceof Character && localObj.heldBy.heldObject === localObj) {
          localObj.heldBy.heldObject = null;
        }
        localObj.isHeld = false;
        localObj.heldBy = null;
      } else if (isHeldByAnyLocalPlayer) {
        continue;
      }

      // 2. If dragged by user mouse in editor, user drag governs
      if (gameLoop.inputManager?.draggedEntity === localObj) continue;

      // 3. Remote Player Holding / Releasing Synchronizer:
      const isHeldByMyClient = Boolean(
        sObj.heldBy &&
          localClientId &&
          (sObj.heldBy === localClientId || sObj.heldBy.startsWith(`${localClientId}:`))
      );
      const isMyLocalId = Array.from(gameLoop.players.values()).some(
        (p) => sObj.heldBy === p.id || sObj.heldBy === p.character.playerId
      );
      const isRecentlyDroppedByMe = Boolean(
        localObj.lastDroppedTime > 0 &&
          performance.now() - localObj.lastDroppedTime < 400 &&
          (localObj.lastHolder === gameLoop.character ||
            localObj.lastHolder === gameLoop.primaryCharacter ||
            Array.from(gameLoop.players.values()).some((p) => localObj!.lastHolder === p.character))
      );
      const wasHeldByMe =
        isHeldByMyClient ||
        isMyLocalId ||
        localObj.lastThrower === gameLoop.character ||
        localObj.lastThrower === gameLoop.primaryCharacter ||
        localObj.originalThrower === gameLoop.character ||
        localObj.originalThrower === gameLoop.primaryCharacter ||
        isRecentlyDroppedByMe ||
        Array.from(gameLoop.players.values()).some(
          (p) => localObj!.lastThrower === p.character || localObj!.originalThrower === p.character
        );

      const isLocalChar = (c: Character) =>
        Array.from(gameLoop.players.values()).some(
          (p) => p.character === c || p.character.playerId === c.playerId || p.id === c.playerId
        );
      const remoteHolder = gameLoop.allCharacters.find(
        (c) => !isLocalChar(c) && (c.heldObject === localObj || localObj!.heldBy === c)
      );

      const groundZ = localObj.supportingSurfaceHeight ?? 0;
      const isLocalAirborne = !localObj.isRestingOnSurface && localObj.position.z > groundZ + 0.05;
      const isServerAirborne = !sObj.isGrounded && sObj.z > groundZ + 0.05;

      if (sObj.isHeld && sObj.heldBy) {
        const targetRemoteHolder = gameLoop.allCharacters.find(
          (c) => (c.playerId === sObj.heldBy || c.id === sObj.heldBy) && !isLocalChar(c)
        );
        if (targetRemoteHolder && !wasHeldByMe) {
          localObj.isHeld = true;
          localObj.heldBy = targetRemoteHolder;
          targetRemoteHolder.heldObject = localObj;
          const relPos = targetRemoteHolder.calculateHeldObjectPosition(gameLoop.arena);
          localObj.position.x = relPos.x;
          localObj.position.y = relPos.y;
          localObj.position.z = relPos.z;
          localObj.velocity.x = targetRemoteHolder.velocity.x;
          localObj.velocity.y = targetRemoteHolder.velocity.y;
          localObj.verticalVelocity = 0;
          localObj.isInFlight = false;
          continue;
        }
      } else {
        const isServerLaunched =
          !sObj.isHeld &&
          (isServerAirborne ||
            (sObj.vz !== undefined && sObj.vz > 0.5) ||
            Math.hypot(sObj.vx, sObj.vy) > 1.2);
        if (
          remoteHolder ||
          (localObj.isHeld && localObj.heldBy && !isLocalChar(localObj.heldBy as Character)) ||
          (isServerLaunched && !localObj.isInFlight && !wasHeldByMe)
        ) {
          const prevHolder = (localObj.heldBy as Character) || remoteHolder;
          if (prevHolder && prevHolder.heldObject === localObj) {
            prevHolder.heldObject = null;
          }
          localObj.isHeld = false;
          localObj.heldBy = null;

          // INSTANT THROW HAND-OFF (Zero Hesitation):
          localObj.position.x = sObj.x;
          localObj.position.y = sObj.y;
          localObj.position.z = sObj.z;
          localObj.velocity.x = sObj.vx;
          localObj.velocity.y = sObj.vy;
          localObj.verticalVelocity = sObj.vz ?? 0;
          localObj.isInFlight = sObj.isInFlight !== undefined ? sObj.isInFlight : !sObj.isGrounded;
          localObj.wakeUp();
          if (
            localObj.rollModule &&
            sObj.angX !== undefined &&
            sObj.angY !== undefined &&
            sObj.angZ !== undefined
          ) {
            localObj.rollModule.angularVelocity.x = sObj.angX;
            localObj.rollModule.angularVelocity.y = sObj.angY;
            localObj.rollModule.angularVelocity.z = sObj.angZ;
          }
          continue;
        }
      }

      // 4. Client-Side Prediction for Thrown / Dropped / Released Objects by LOCAL player:
      if (sObj.isHeld && !localObj.isHeld && (wasHeldByMe || localObj.isInFlight)) {
        continue;
      }

      // 5. Ballistic In-Flight & Landing Prediction for Dynamic Freebody Objects:
      const horizDist = Math.hypot(sObj.x - localObj.position.x, sObj.y - localObj.position.y);
      const localSpeed = Math.hypot(localObj.velocity.x, localObj.velocity.y);

      if (sObj.isGrounded) {
        localObj.isInFlight = false;
        localObj.originalThrower = null;
      }

      // 5a. Resting / Sleeping State Synchronization:
      if (sObj.isSleeping) {
        if (horizDist < 1.5 && localSpeed < 0.6) {
          localObj.position.x = sObj.x;
          localObj.position.y = sObj.y;
          localObj.position.z = sObj.z;
          localObj.velocity.x = 0;
          localObj.velocity.y = 0;
          localObj.verticalVelocity = 0;
          localObj.putToSleep();
          localObj.isInFlight = false;
          localObj.originalThrower = null;
          continue;
        }
      }

      // 5b. In-Flight State: Object is in ballistic flight on client or server
      if ((localObj.isInFlight || isLocalAirborne) && !sObj.isSleeping) {
        if (!isLocalAirborne && isServerAirborne && (wasHeldByMe || localObj.isInFlight)) {
          localObj.position.z = groundZ;
          localObj.verticalVelocity = Math.min(0, localObj.verticalVelocity);
          continue;
        }
        if (localObj.isInFlight || isLocalAirborne) {
          if (horizDist < 4.5) {
            continue;
          }
        }
      }

      // 5c. Ground Landing Transition: Local has landed, but server ghost is still trailing in the air
      if (!isLocalAirborne && isServerAirborne && !sObj.isSleeping && (wasHeldByMe || localObj.isInFlight)) {
        if (horizDist < 3.0) {
          localObj.position.z = groundZ;
          localObj.verticalVelocity = Math.min(0, localObj.verticalVelocity);
          continue;
        }
      }

      // 5d. Ground Rollout: Both have landed and local object is rolling out under friction
      if (!isLocalAirborne && !isServerAirborne && !sObj.isSleeping && localSpeed > 0.1) {
        if (horizDist < 2.5) {
          continue;
        }
      }

      // 6. Check physical distance to authoritative server position
      const dx = sObj.x - localObj.position.x;
      const dy = sObj.y - localObj.position.y;
      const dz = sObj.z - localObj.position.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > maxDrift) maxDrift = dist;

      // 7. Hard Teleport on Massive Divergence (> 4.5 units)
      if (dist > 4.5) {
        localObj.position.x = sObj.x;
        localObj.position.y = sObj.y;
        localObj.position.z = sObj.z;
        localObj.velocity.x = sObj.vx;
        localObj.velocity.y = sObj.vy;
        localObj.verticalVelocity = sObj.vz ?? 0;
        if (
          localObj.rollModule &&
          sObj.angX !== undefined &&
          sObj.angY !== undefined &&
          sObj.angZ !== undefined
        ) {
          localObj.rollModule.angularVelocity.x = sObj.angX;
          localObj.rollModule.angularVelocity.y = sObj.angY;
          localObj.rollModule.angularVelocity.z = sObj.angZ;
        }
        continue;
      }

      // 8. Deadzone & micro-flutter filter:
      if (dist < 0.02) {
        continue;
      }

      if (localObj.isInFlight || isLocalAirborne) {
        continue;
      }

      // 9. Smart Smooth Convergence for stationary/pushed/diverged objects
      const blend = localSpeed > 0.2 ? 0.3 : 0.25;
      localObj.position.x += dx * blend;
      localObj.position.y += dy * blend;
      localObj.velocity.x += (sObj.vx - localObj.velocity.x) * blend;
      localObj.velocity.y += (sObj.vy - localObj.velocity.y) * blend;

      if (!isLocalAirborne && dz > 0 && sObj.z > groundZ + 0.05) {
        localObj.position.z = groundZ;
      } else {
        localObj.position.z += dz * blend;
        if (sObj.vz !== undefined) {
          localObj.verticalVelocity += (sObj.vz - localObj.verticalVelocity) * blend;
        }
      }
      if (
        localObj.rollModule &&
        sObj.angX !== undefined &&
        sObj.angY !== undefined &&
        sObj.angZ !== undefined
      ) {
        localObj.rollModule.angularVelocity.x +=
          (sObj.angX - localObj.rollModule.angularVelocity.x) * blend;
        localObj.rollModule.angularVelocity.y +=
          (sObj.angY - localObj.rollModule.angularVelocity.y) * blend;
        localObj.rollModule.angularVelocity.z +=
          (sObj.angZ - localObj.rollModule.angularVelocity.z) * blend;
      }
    }

    // 10. Server-authoritative object deletion fallback
    const serverObjIds = new Set(serverObjects.map((o) => o.id));
    for (let i = gameLoop.objects.length - 1; i >= 0; i--) {
      const obj = gameLoop.objects[i];
      if (!serverObjIds.has(obj.id)) {
        if (
          obj.consumableModule ||
          (obj.isHeld && (obj.heldBy as Character)?.role === "remote_player") ||
          obj.id.startsWith("inst_") ||
          obj.id.startsWith("spawner_")
        ) {
          if (obj.heldBy && (obj.heldBy as Character).heldObject === obj) {
            (obj.heldBy as Character).heldObject = null;
          }
          obj.isHeld = false;
          obj.heldBy = null;
          gameLoop.objects.splice(i, 1);
          if (Array.isArray((gameLoop.arena as any).entities)) {
            const eIdx = (gameLoop.arena as any).entities.indexOf(obj);
            if (eIdx !== -1) {
              (gameLoop.arena as any).entities.splice(eIdx, 1);
            }
          }
        }
      }
    }

    gameLoop.maxObjectDrift = maxDrift;
  }

  private static instantiateServerObject(gameLoop: GameLoop, sObj: GhostEntityState): GameObject {
    const pId =
      sObj.prefabId ||
      (sObj.name === "Apple" || sObj.id.startsWith("apple-") ? "prefab_apple" : undefined);
    const prefab = pId ? prefabManager.get(pId) : undefined;
    let localObj: GameObject;

    if (prefab) {
      localObj = prefab.instantiate({ x: sObj.x, y: sObj.y, z: sObj.z }, gameLoop.arena);
      localObj.id = sObj.id;
      localObj.velocity.x = sObj.vx;
      localObj.velocity.y = sObj.vy;
      localObj.verticalVelocity = sObj.vz ?? 0;
      if (sObj.isSleeping) {
        localObj.putToSleep();
      }

      if (sObj.name !== undefined) localObj.name = sObj.name;
      if (sObj.color !== undefined) localObj.color = sObj.color;
      if (sObj.shape !== undefined) localObj.visualShape = sObj.shape;
      if (sObj.radius !== undefined) {
        localObj.colliderRadius = sObj.radius;
        if (localObj.consumableModule) {
          localObj.consumableModule.initialColliderRadius = sObj.radius;
        }
      }
      if (sObj.mass !== undefined) localObj.mass = sObj.mass;
      if (sObj.bounceMod !== undefined) localObj.bounceMod = sObj.bounceMod;
      if (sObj.consumableTag !== undefined && localObj.consumableModule) {
        localObj.consumableModule.tag = sObj.consumableTag;
      }
      if (sObj.unlimited !== undefined && localObj.consumableModule) {
        localObj.consumableModule.unlimited = sObj.unlimited;
      }
      if (sObj.totalEnergyJoules !== undefined && localObj.consumableModule) {
        localObj.consumableModule.totalEnergyJoulesProp.set(
          sObj.totalEnergyJoules,
          localObj.properties
        );
      }
      if (sObj.remainingEnergyJoules !== undefined && localObj.consumableModule) {
        localObj.consumableModule.remainingEnergyJoulesProp.set(
          sObj.remainingEnergyJoules,
          localObj.properties
        );
        const currentScale = localObj.consumableModule.getScale(localObj.properties);
        const initialRadius =
          localObj.consumableModule.initialColliderRadius || localObj.colliderRadius;
        const targetRadius = Math.max(
          localObj.consumableModule.minRadiusFloor,
          initialRadius * currentScale
        );
        localObj.colliderRadius = targetRadius;
        if (localObj.colliderModule) localObj.colliderModule.radius = targetRadius;
      }
    } else {
      localObj = new GameObject({
        id: sObj.id,
        name: sObj.name || "Server Object",
        position: { x: sObj.x, y: sObj.y, z: sObj.z },
        velocity: { x: sObj.vx, y: sObj.vy },
        verticalVelocity: sObj.vz ?? 0,
        mass: sObj.mass ?? 1.0,
        bounceMod: sObj.bounceMod ?? 0.0,
        color: sObj.color || "#22c55e",
        colliderRadius: sObj.radius || 0.25,
        visualShape: sObj.shape || "circle",
        consumableModule: sObj.consumableTag
          ? new ConsumableModule({
              tag: sObj.consumableTag,
              totalEnergyJoules: sObj.totalEnergyJoules ?? 4000,
              remainingEnergyJoules:
                sObj.remainingEnergyJoules ?? sObj.totalEnergyJoules ?? 4000,
              unlimited: sObj.unlimited,
            })
          : undefined,
        damageAuraModule:
          sObj.damageAuraRadius !== undefined || sObj.damageAuraRate !== undefined
            ? new DamageAuraModule({
                damageRadius: sObj.damageAuraRadius ?? 2.5,
                damageRate: sObj.damageAuraRate ?? 25.0,
              })
            : undefined,
        rollModule:
          sObj.angX !== undefined || sObj.angY !== undefined || sObj.angZ !== undefined
            ? new RollModule({
                rollResistance: 0.0,
                angularVelocity: {
                  x: sObj.angX ?? 0,
                  y: sObj.angY ?? 0,
                  z: sObj.angZ ?? 0,
                },
              })
            : undefined,
      });
      if (localObj.consumableModule) {
        localObj.consumableModule.initialColliderRadius =
          sObj.radius || localObj.colliderRadius;
      }
      if (sObj.isSleeping) {
        localObj.putToSleep();
      }
    }

    gameLoop.objects.push(localObj);
    if (Array.isArray((gameLoop.arena as any).entities)) {
      (gameLoop.arena as any).entities.push(localObj);
    }
    return localObj;
  }
}
