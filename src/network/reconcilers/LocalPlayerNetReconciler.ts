/**
 * LocalPlayerNetReconciler.ts
 *
 * Extracted from OnlineSessionManager.ts:
 * Handles authoritative reconciliation for local client characters:
 * - Authoritative death & respawn events (with eventId deduplication and server ACK)
 * - Soft HP, knockback, energy (with 1500ms eating grace window), and stamina reconciliation
 * - Authoritative color, playerNumber, and default name sync
 * - External server pushes & collision convergence (preserving background/idle push sync)
 */

import type { GameLoop } from "../../engine/GameLoop.js";
import type { OnlineRoomClient } from "../OnlineRoomClient.js";
import type { GhostEntityState, DeathRespawnEvent } from "../RelayClient.js";
import type { Character } from "../../character/Character.js";

export class LocalPlayerNetReconciler {
  /**
   * Process authoritative server death & respawn events.
   */
  public static processDeathRespawnEvents(
    gameLoop: GameLoop,
    client: OnlineRoomClient,
    processedDeathRespawnEventIds: Set<string>,
    deathRespawnEvents?: DeathRespawnEvent[]
  ): void {
    if (!deathRespawnEvents || !Array.isArray(deathRespawnEvents)) return;

    for (const ev of deathRespawnEvents) {
      // Immediately queue acknowledgment back to server so it knows client received it
      client.acknowledgeDeathRespawn(ev.eventId);

      // Deduplicate: only execute dieAndRespawn once per event ID!
      if (processedDeathRespawnEventIds.has(ev.eventId)) {
        continue;
      }
      processedDeathRespawnEventIds.add(ev.eventId);
      if (processedDeathRespawnEventIds.size > 200) {
        const first = processedDeathRespawnEventIds.values().next().value;
        if (first) processedDeathRespawnEventIds.delete(first);
      }

      // Robust match for local character, serverCharId, playerId, or dummy
      let targetChar = gameLoop.allCharacters.find(
        (c) => c.id === ev.targetEntityId ||
               c.serverCharId === ev.targetEntityId ||
               c.playerId === ev.targetEntityId ||
               (c.isDummy && ev.targetEntityId === "dummy-1")
      ) || Array.from(gameLoop.players.values()).find(
        (p) => p.character.serverCharId === ev.targetEntityId ||
               p.id === ev.targetEntityId ||
               p.character.id === ev.targetEntityId ||
               p.character.playerId === ev.targetEntityId
      )?.character;

      if (!targetChar && gameLoop.primaryCharacter) {
        targetChar = gameLoop.primaryCharacter;
      }

      if (targetChar) {
        console.log(`💀 [OnlineSession] Processing authoritative death & respawn for ${targetChar.id || targetChar.name} to (${ev.respawnX}, ${ev.respawnY}, ${ev.respawnZ})`);
        targetChar.dieAndRespawn(gameLoop.arena, {
          x: ev.respawnX,
          y: ev.respawnY,
          z: ev.respawnZ
        });
        if (gameLoop.primaryCharacter && gameLoop.primaryCharacter !== targetChar) {
          gameLoop.primaryCharacter.resetDynamicValues();
        }
        targetChar.velocity.x = 0;
        targetChar.velocity.y = 0;
        if (targetChar.hasVerticalVelocity) {
          targetChar.verticalVelocity = 0;
        }
        targetChar.supportingSurfaceHeight = ev.respawnZ ?? 0;

        if (targetChar.playerId) {
          gameLoop.interpolator.clearEntity(targetChar.playerId);
        }
        if (targetChar.serverCharId) {
          gameLoop.interpolator.clearEntity(targetChar.serverCharId);
        }
        gameLoop.interpolator.clearEntity(targetChar.id);
        gameLoop.historyBuffer.clear();

        // Now that client has snapped to the respawn position, queue the acknowledgment back to server
        client.acknowledgeDeathRespawn(ev.eventId);
      }
    }
  }

  /**
   * Softly reconcile local character HP, knockback, energy, stamina, and identity from server state.
   */
  public static reconcileLocalCharacterStats(
    gameLoop: GameLoop,
    client: OnlineRoomClient,
    c: GhostEntityState
  ): void {
    const localPlayerId = c.id.includes(":") ? c.id.split(":")[1] : "keyboard";
    const p = gameLoop.players.get(localPlayerId);
    const localChar = p?.character || (localPlayerId === "keyboard" ? (gameLoop.players.get("keyboard")?.character || gameLoop.playerManager.baseCharacter) : null);
    if (!localChar) return;

    // Local client trusts its own predicted health, energy, and stamina, but softly reconciles if server diverges or applies damage
    if (c.currentHp !== undefined && localChar.healthModule) {
      const curHp = localChar.healthModule.getCurrentHp(localChar.properties);
      if (c.currentHp < curHp || Math.abs(curHp - c.currentHp) > 15.0) {
        const wasDeadOrZero = curHp <= 0.0001;
        const damageTaken = curHp - c.currentHp;
        if (damageTaken > 0.001) {
          localChar.healthModule.takeDamage(damageTaken, localChar.properties, {
            id: "collision_damage",
            name: "Collision",
            type: "instant",
            amount: damageTaken,
            color: "#f87171",
            isHeal: false,
          });
        } else {
          localChar.healthModule.currentHpProp.set(c.currentHp, localChar.properties);
        }
        // If server restored HP from 0 (respawn occurred), reset energy and stamina
        if (wasDeadOrZero && c.currentHp > 10.0) {
          localChar.resetDynamicValues();
        }
        // If authoritative damage was taken and server reports knockback impulse:
        if (c.currentHp < curHp && c.vx !== undefined && c.vy !== undefined) {
          const serverSpeed = Math.hypot(c.vx, c.vy);
          if (serverSpeed > 1.0) {
            localChar.velocity.x = c.vx;
            localChar.velocity.y = c.vy;
            localChar.applyKnockbackWindow(350);
          }
        }
      }
    }
    // If server reports authoritative knockback or impulse on local character:
    if (c.isUnderKnockback && c.vx !== undefined && c.vy !== undefined) {
      const serverSpeed = Math.hypot(c.vx, c.vy);
      if (serverSpeed > 1.0) {
        localChar.velocity.x = c.vx;
        localChar.velocity.y = c.vy;
        localChar.applyKnockbackWindow(350);
      }
    }
    if (c.maxHp !== undefined && localChar.healthModule) {
      localChar.healthModule.maxHpProp.set(c.maxHp, localChar.properties);
    }
    if (c.currentEnergyJoules !== undefined && localChar.energyPool) {
      const curEnergy = localChar.energyPool.getCurrentEnergy(localChar.properties);
      const isActivelyEating = Boolean(localChar.isUsingItem && localChar.canConsumeHeldObject());
      if (isActivelyEating) {
        (localChar as any)._lastEatTime = performance.now();
      }
      const timeSinceEating = performance.now() - ((localChar as any)._lastEatTime || 0);
      const isRecentlyEating = isActivelyEating || timeSinceEating < 1500;

      // If actively eating locally or within settling window, server telemetry trails by network RTT.
      // Never roll back local predicted energy to a lower trailing server value during this window.
      if (isRecentlyEating) {
        if (c.currentEnergyJoules > curEnergy) {
          localChar.energyPool.currentEnergyProp.set(c.currentEnergyJoules, localChar.properties);
        }
      } else if (Math.abs(curEnergy - c.currentEnergyJoules) > 200.0) {
        localChar.energyPool.currentEnergyProp.set(c.currentEnergyJoules, localChar.properties);
      }
    }
    if (c.isExhausted !== undefined && localChar.energyPool) {
      localChar.energyPool.isExhausted = c.isExhausted;
    }
    const mainBus = localChar.getEnergyBus("bus_main") || localChar.energyBusses.values().next().value;
    if (mainBus && c.currentStaminaSeconds !== undefined) {
      const curStam = mainBus.getCurrentStamina(localChar.properties);
      if (Math.abs(curStam - c.currentStaminaSeconds) > 2.0) {
        mainBus.setCurrentStamina(c.currentStaminaSeconds, localChar.properties);
      }
    }
    const authoritativeColor = c.playerColor || c.color || (p ? p.color : client.assignedColor);
    if (authoritativeColor && (localChar.color !== authoritativeColor || localChar.playerColor !== authoritativeColor)) {
      localChar.color = authoritativeColor;
      localChar.playerColor = authoritativeColor;
      if (p) p.color = authoritativeColor;
    }
    if (c.playerNumber !== undefined && localChar.playerNumber !== c.playerNumber) {
      localChar.playerNumber = c.playerNumber;
      if (p) p.playerNumber = c.playerNumber;
    }
    if (!localChar.hasCustomName) {
      const authoritativeName = c.name || `Player ${localChar.playerNumber || 1}`;
      localChar.name = authoritativeName;
      if (p) p.name = authoritativeName;
    }
  }

  /**
   * Synchronize external server pushes & impulses on local characters.
   */
  public static reconcileLocalCharacterPushes(
    gameLoop: GameLoop,
    client: OnlineRoomClient,
    ghostChars: GhostEntityState[]
  ): void {
    const allLocalChars: Array<{ char: Character; serverId: string }> = [];
    if (gameLoop.playerManager) {
      for (const p of gameLoop.playerManager.players.values()) {
        const sid = p.character.serverCharId || (p.id === "keyboard" ? (client.clientId || "keyboard") : `${client.clientId}:${p.id}`);
        allLocalChars.push({ char: p.character, serverId: sid });
      }
    }
    if (allLocalChars.length === 0 && gameLoop.primaryCharacter) {
      const localChar = gameLoop.primaryCharacter;
      const localServerId = localChar.serverCharId || client.clientId || "keyboard";
      allLocalChars.push({ char: localChar, serverId: localServerId });
    }

    for (const { char: localChar, serverId: localServerId } of allLocalChars) {
      const myServerState = ghostChars.find((gc) => gc.id === localServerId);
      if (myServerState) {
        const nowMs = performance.now();
        const isLocomoting =
          localChar.isActivelyWalking ||
          localChar.isSprinting ||
          Math.hypot(localChar.movementInput?.x ?? 0, localChar.movementInput?.y ?? 0) > 0.01;
        if (isLocomoting) {
          (localChar as any)._lastVoluntaryMoveTime = nowMs;
        }
        const timeSinceThrow = nowMs - ((localChar as any)._lastThrowRecoilTime ?? 0);
        const localSpeed = Math.hypot(localChar.velocity.x, localChar.velocity.y);
        const isRecoilingFromThrow =
          timeSinceThrow < 750 || (timeSinceThrow < 1500 && localSpeed > 0.15);
        const isRecentlyLocomoting =
          isLocomoting ||
          isRecoilingFromThrow ||
          (nowMs - ((localChar as any)._lastVoluntaryMoveTime ?? 0) < 220);
        const isBackgrounded =
          (typeof document !== "undefined" && document.hidden) ||
          (nowMs - ((gameLoop as any).lastTime ?? nowMs) >= 35);
        const hasRecentCollision =
          Boolean(myServerState.isUnderKnockback) ||
          (!isRecoilingFromThrow && localChar.lastCollisionTime > 0 && (nowMs - localChar.lastCollisionTime < 450));

        const dx = myServerState.x - localChar.position.x;
        const dy = myServerState.y - localChar.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 6.0 || (!isRecentlyLocomoting && (dist > 1.5 || isBackgrounded))) {
          localChar.position.x = myServerState.x;
          localChar.position.y = myServerState.y;
          if (myServerState.z !== undefined) {
            localChar.position.z = myServerState.z;
          }
          localChar.velocity.x = myServerState.vx ?? 0;
          localChar.velocity.y = myServerState.vy ?? 0;
        } else if (!isRecentlyLocomoting && dist > 0.005) {
          // Player is idle (not commanding movement): any server position change is an authoritative
          // external push/collision. Converge immediately so idle/background clients never desync when pushed.
          const blend = 0.6;
          localChar.position.x += dx * blend;
          localChar.position.y += dy * blend;
          if (myServerState.z !== undefined && Math.abs(myServerState.z - localChar.position.z) > 0.01) {
            localChar.position.z += (myServerState.z - localChar.position.z) * blend;
          }
          localChar.velocity.x = myServerState.vx ?? 0;
          localChar.velocity.y = myServerState.vy ?? 0;
        } else if (isRecentlyLocomoting && hasRecentCollision && dist > 0.04) {
          // Actively colliding while moving: blend toward authoritative server contact point
          const blend = 0.35;
          localChar.position.x += dx * blend;
          localChar.position.y += dy * blend;
        }
      }
    }
  }
}
