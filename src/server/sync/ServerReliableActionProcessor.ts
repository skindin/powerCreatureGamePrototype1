/**
 * ServerReliableActionProcessor.ts
 *
 *TIER 2 (Protected) Module:
 * Extracted from ServerGameSimulation.ts:
 * Authoritatively processes high-priority reliable action commands (pickup, drop, throw, punch).
 * Idempotent: Deduplicates actions so retransmissions are acknowledged without re-executing.
 * Stamps `_lastServerThrowTime` on throw execution so raw telemetry packets never override a throw.
 */

import type { ServerGameSimulation } from "../ServerGameSimulation.js";
import type { ReliableActionCommand } from "../../engine/physics/StateHistoryBuffer.js";

export class ServerReliableActionProcessor {
  /**
   * Authoritatively processes high-priority reliable action commands (pickup, drop, throw, punch).
   */
  public static processReliableActions(
    sim: ServerGameSimulation,
    actions: ReliableActionCommand[],
    processedActionIds: Set<string>,
    recentAckedActionIds: string[]
  ): string[] {
    const newlyAcked: string[] = [];

    for (const act of actions) {
      newlyAcked.push(act.actionId);
      if (!recentAckedActionIds.includes(act.actionId)) {
        recentAckedActionIds.push(act.actionId);
        if (recentAckedActionIds.length > 100) {
          recentAckedActionIds.shift();
        }
      }

      // Idempotency: skip if already processed
      if (processedActionIds.has(act.actionId)) {
        continue;
      }
      processedActionIds.add(act.actionId);
      if (processedActionIds.size > 2000) {
        const first = processedActionIds.values().next().value;
        if (first) processedActionIds.delete(first);
      }

      // Execute authoritative action
      let char = sim.characters.get(act.playerId || "keyboard");
      if (!char && act.playerId) {
        char = sim.allCharacters.find(
          (c) => c.playerId === act.playerId ||
                 c.playerId.endsWith(`:${act.playerId}`) ||
                 c.id === act.playerId
        );
      }
      if (!char) {
        char = sim.allCharacters[0];
      }
      if (!char) continue;

      if (act.type === "pickup") {
        if (!char.heldObject && char.pickupModule && act.targetObjectId) {
          const target = sim.objects.find((o) => o.id === act.targetObjectId);
          if (target && (!target.isHeld || target.heldBy === char)) {
            let itemToHold = target;
            if (target.spawnerModule && target.spawnerModule.enabled) {
              const clone = target.spawnerModule.triggerClone(target, sim.arena, sim.objects);
              if (clone) itemToHold = clone;
            }
            char.pickupModule.pickup(char, itemToHold);
            itemToHold.isHeld = true;
            itemToHold.heldBy = char;
            char.heldObject = itemToHold;

            if (sim.onGrabResult) {
              sim.onGrabResult({
                type: "grab_result",
                eventId: `grab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                tick: sim.currentTick,
                targetObjectId: itemToHold.id,
                playerId: char.playerId || char.id,
              });
            }
          }
        }
      } else if (act.type === "drop") {
        if (char.heldObject && char.pickupModule) {
          char.pickupModule.drop(char);
        }
      } else if (act.type === "throw") {
        const throwTarget = char.heldObject || (act.targetObjectId ? sim.objects.find((o) => o.id === act.targetObjectId && (!o.isHeld || o.heldBy === char)) : null);
        if (throwTarget && char.throwModule) {
          if (!char.heldObject) {
            char.heldObject = throwTarget;
            throwTarget.isHeld = true;
            throwTarget.heldBy = char;
          }
          const aimX = act.aimX ?? (char.position.x + Math.cos(char.facingAngle) * 3);
          const aimY = act.aimY ?? (char.position.y + Math.sin(char.facingAngle) * 3);
          const launchVel = (act as any).launchVx !== undefined ? {
            vx: (act as any).launchVx,
            vy: (act as any).launchVy,
            vz: (act as any).launchVz ?? 0
          } : undefined;
          const launchPos = (act as any).launchStartX !== undefined ? {
            x: (act as any).launchStartX,
            y: (act as any).launchStartY,
            z: (act as any).launchStartZ ?? 0
          } : undefined;
          if (char.energyPool && launchVel) {
            const pool = char.energyPool;
            const heldMass = throwTarget.hasMass ? Math.max(0.1, throwTarget.mass) : 1.0;
            const launchSpeed = Math.hypot(launchVel.vx, launchVel.vy, launchVel.vz);
            const poolEfficiency = Math.max(0.01, pool.getMuscleEfficiency(char.properties));
            const neededJoules = (0.5 * heldMass * launchSpeed * launchSpeed) / poolEfficiency + 100;
            pool.isExhausted = false;
            const curStam = pool.getCurrentStamina(char.properties);
            if (curStam < neededJoules) {
              pool.currentStaminaProp.set(neededJoules, char.properties);
            }
            if (!pool.infiniteEnergy && pool.getCurrentEnergy(char.properties) < neededJoules) {
              pool.currentEnergyProp.set(neededJoules, char.properties);
            }
            if (char.throwModule && char.throwModule.maxPowerProp.get(char.properties) < neededJoules) {
              char.throwModule.maxPowerProp.set(neededJoules, char.properties);
            }
          }
          const thrown = char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            sim.arena,
            undefined,
            undefined,
            act.isLockHeld ?? false,
            launchVel,
            launchPos
          );
          if (thrown) {
            (char as any)._lastServerThrowTime = performance.now();
            (char as any)._pendingThrowUntilMs = 0;
          }
        }
      } else if ((act.type as string) === "punch") {
        if (char.meleeModule && char.meleeModule.enabled) {
          const aimX = act.aimX !== undefined ? act.aimX : (char.position.x + Math.cos(char.facingAngle) * 3);
          const aimY = act.aimY !== undefined ? act.aimY : (char.position.y + Math.sin(char.facingAngle) * 3);
          const dirX = aimX - char.position.x;
          const dirY = aimY - char.position.y;
          const mag = Math.hypot(dirX, dirY);
          const normDirX = mag > 0.001 ? dirX / mag : Math.cos(char.facingAngle);
          const normDirY = mag > 0.001 ? dirY / mag : Math.sin(char.facingAngle);
          char.facingAngle = Math.atan2(normDirY, normDirX);
          const candidates = [...sim.allCharacters.filter((c) => c !== char), ...sim.objects];
          char.melee(sim.arena, candidates, normDirX, normDirY);
        }
      }
    }

    return newlyAcked;
  }
}
