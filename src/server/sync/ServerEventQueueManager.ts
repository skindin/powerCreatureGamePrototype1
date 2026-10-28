/**
 * ServerEventQueueManager.ts
 *
 * Extracted from ServerGameSimulation.ts:
 * Manages authoritative reliable event queues & client ACK tracking:
 * - Contested grab arbitration events (pendingContestedEvents)
 * - Death & respawn events (pendingDeathRespawnEvents)
 * - Object deletion events (pendingObjectDeletionEvents & deletedObjectIds)
 */

import type { ServerGameSimulation } from "../ServerGameSimulation.js";
import type { Character } from "../../character/Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { PlayerInputPacket } from "../../engine/physics/StateHistoryBuffer.js";
import type { DeathRespawnEvent, ObjectDeletionEvent } from "../../network/RelayClient.js";
import { ContestedGrabArbiter, ContestedGrabResult } from "../ContestedGrabArbiter.js";

export class ServerEventQueueManager {
  /**
   * Resolves contested grabs when multiple characters attempt to grab the same object on this tick (Phase 4.3).
   * Keeps active unacknowledged events in pendingContestedEvents until all involved clients acknowledge them.
   */
  public static arbitrateContestedGrabs(
    sim: ServerGameSimulation,
    grabRequests: { char: Character; target: GameObject; pkt: PlayerInputPacket }[]
  ): void {
    const results = ContestedGrabArbiter.arbitrate(grabRequests, sim.currentTick, sim.contestedGrabEvents, sim.arena, sim.objects);
    for (const res of results) {
      sim.pendingContestedEvents.set(res.eventId, {
        event: res,
        createdTick: sim.currentTick,
        acks: new Set<string>(),
      });
      if (sim.onGrabResult) {
        sim.onGrabResult({
          type: "grab_result",
          eventId: res.eventId,
          tick: res.tick,
          targetObjectId: res.targetObjectId,
          playerId: res.winnerPlayerId,
        });
      }
    }
  }

  /**
   * Acknowledges that a client character has received and processed contested grab events.
   */
  public static acknowledgeContestedEvents(sim: ServerGameSimulation, clientCharId: string, eventIds: string[]): void {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = sim.pendingContestedEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);
        // Check if all involved parties (winner + all losers) have acknowledged
        const needed = [pending.event.winnerPlayerId, ...pending.event.loserPlayerIds];
        const allAcked = needed.every((pId) => pending.acks.has(pId));
        if (allAcked) {
          sim.pendingContestedEvents.delete(id);
        }
      }
    }
  }

  /**
   * Returns all active unacknowledged contested grab events for broadcast.
   * Evicts expired events older than 180 ticks (3 seconds) to prevent infinite accumulation.
   */
  public static getActiveContestedEvents(sim: ServerGameSimulation): ContestedGrabResult[] {
    const active: ContestedGrabResult[] = [];
    const nowTick = sim.currentTick;
    for (const [id, record] of sim.pendingContestedEvents.entries()) {
      if (nowTick - record.createdTick > 180) {
        // Expired after 3 seconds of continuous transmission
        sim.pendingContestedEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }

  /**
   * Acknowledges that a client character has received and processed death & respawn events.
   */
  public static acknowledgeDeathRespawnEvents(sim: ServerGameSimulation, clientCharId: string, eventIds: string[]): void {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = sim.pendingDeathRespawnEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);

        // Find target character and clear respawn lock immediately upon acknowledgment
        const targetChar = sim.characters.get(pending.event.targetEntityId) ||
          Array.from(sim.characters.values()).find(
            (c) => c.id === clientCharId ||
                   c.playerId === clientCharId ||
                   (c as any).serverCharId === clientCharId ||
                   c.id === pending.event.targetEntityId ||
                   c.playerId === pending.event.targetEntityId ||
                   (c as any).serverCharId === pending.event.targetEntityId
          );
        if (targetChar) {
          (targetChar as any).isRespawnLocked = false;
        }

        const isTargetAck = clientCharId === pending.event.targetEntityId ||
          (targetChar && (
            clientCharId === targetChar.id ||
            clientCharId === targetChar.playerId ||
            clientCharId === (targetChar as any).serverCharId
          ));

        if (isTargetAck) {
          sim.pendingDeathRespawnEvents.delete(id);
        } else {
          // Clean up once all registered connected players have acknowledged
          const allClientChars = Array.from(sim.characters.keys()).filter((k) => k !== "dummy-1");
          const allAcked = allClientChars.length === 0 || allClientChars.every((cId) => pending.acks.has(cId));
          if (allAcked) {
            sim.pendingDeathRespawnEvents.delete(id);
          }
        }
      }
    }
  }

  /**
   * Returns all active unacknowledged death respawn events for continuous broadcast.
   */
  public static getActiveDeathRespawnEvents(sim: ServerGameSimulation): DeathRespawnEvent[] {
    const active: DeathRespawnEvent[] = [];
    const nowTick = sim.currentTick;
    for (const [id, record] of sim.pendingDeathRespawnEvents.entries()) {
      if (nowTick - record.createdTick > 300) {
        // Expired after 5 seconds of continuous retransmission
        sim.pendingDeathRespawnEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }

  /**
   * Triggers an authoritative object deletion event broadcasted reliably until acknowledged.
   */
  public static triggerObjectDeletion(sim: ServerGameSimulation, objectId: string): void {
    sim.deletedObjectIds.add(objectId);
    // Remove from simulation objects and arena
    const idx = sim.objects.findIndex((o) => o.id === objectId);
    if (idx !== -1) {
      const obj = sim.objects[idx];
      if (obj.heldBy && (obj.heldBy as Character).heldObject === obj) {
        (obj.heldBy as Character).heldObject = null;
      }
      obj.isHeld = false;
      obj.heldBy = null;
      sim.objects.splice(idx, 1);
    }
    if (Array.isArray((sim.arena as any).entities)) {
      const eIdx = (sim.arena as any).entities.findIndex((e: any) => e.id === objectId);
      if (eIdx !== -1) {
        (sim.arena as any).entities.splice(eIdx, 1);
      }
    }
    const eventId = `del_${objectId}_${sim.currentTick}`;
    const event: ObjectDeletionEvent = {
      eventId,
      objectId,
      tick: sim.currentTick,
    };
    sim.pendingObjectDeletionEvents.set(eventId, {
      event,
      createdTick: sim.currentTick,
      acks: new Set(),
    });
  }

  /**
   * Acknowledges that a client character has received and processed object deletion events.
   */
  public static acknowledgeObjectDeletionEvents(sim: ServerGameSimulation, clientCharId: string, eventIds: string[]): void {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = sim.pendingObjectDeletionEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);
        const allClientChars = Array.from(sim.characters.keys()).filter((k) => k !== "dummy-1");
        const allAcked = allClientChars.length === 0 || allClientChars.every((cId) => pending.acks.has(cId));
        if (allAcked) {
          sim.pendingObjectDeletionEvents.delete(id);
        }
      }
    }
  }

  /**
   * Returns all active unacknowledged object deletion events for continuous broadcast.
   */
  public static getActiveObjectDeletionEvents(sim: ServerGameSimulation): ObjectDeletionEvent[] {
    const active: ObjectDeletionEvent[] = [];
    const nowTick = sim.currentTick;
    for (const [id, record] of sim.pendingObjectDeletionEvents.entries()) {
      if (nowTick - record.createdTick > 300) {
        // Expired after 5 seconds of continuous retransmission
        sim.pendingObjectDeletionEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }
}
