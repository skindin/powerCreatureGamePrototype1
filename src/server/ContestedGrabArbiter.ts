import { Character } from "../character/Character.js";
import { GameObject } from "../engine/GameObject.js";
import { PlayerInputPacket } from "../engine/physics/StateHistoryBuffer.js";

export interface ContestedGrabRequest {
  char: Character;
  target: GameObject;
  pkt: PlayerInputPacket;
}

export interface ContestedGrabResult {
  eventId: string;
  tick: number;
  targetObjectId: string;
  winnerPlayerId: string;
  loserPlayerIds: string[];
  reason: "strength" | "proximity" | "id_priority";
}

/**
 * ContestedGrabArbiter
 *
 * Dedicated domain service isolating contested grab arbitration (Phase 5).
 * When multiple characters attempt to grab the same object on the same tick,
 * this arbiter deterministically breaks ties using:
 * 1) Higher creature strength
 * 2) Closest 3D Euclidean distance
 * 3) Deterministic player ID string priority
 */
export class ContestedGrabArbiter {
  /**
   * Resolves a list of grab requests on a given tick, granting the target object
   * to the winning character and logging the outcome to an audit history array.
   */
  public static arbitrate(
    grabRequests: ContestedGrabRequest[],
    currentTick: number,
    auditLog?: ContestedGrabResult[]
  ): ContestedGrabResult[] {
    const results: ContestedGrabResult[] = [];
    if (!grabRequests || grabRequests.length === 0) return results;

    // Group requests by target object ID
    const targetGroups = new Map<string, ContestedGrabRequest[]>();
    for (const req of grabRequests) {
      const objId = req.target.id;
      let group = targetGroups.get(objId);
      if (!group) {
        group = [];
        targetGroups.set(objId, group);
      }
      group.push(req);
    }

    for (const [objId, requests] of targetGroups) {
      if (requests.length === 1) {
        // Uncontested grab
        const req = requests[0];
        req.char.pickupModule?.pickup(req.char, req.target);
        continue;
      }

      // CONTESTED GRAB TIEBREAKER:
      // 1) Higher creature strength wins
      // 2) Closest 3D distance wins
      // 3) Lower playerId string hash wins
      requests.sort((a, b) => {
        if (Math.abs(b.char.strength - a.char.strength) > 0.001) {
          return b.char.strength - a.char.strength;
        }
        const distA = Math.hypot(
          a.target.position.x - a.char.position.x,
          a.target.position.y - a.char.position.y,
          a.target.position.z - a.char.position.z
        );
        const distB = Math.hypot(
          b.target.position.x - b.char.position.x,
          b.target.position.y - b.char.position.y,
          b.target.position.z - b.char.position.z
        );
        if (Math.abs(distA - distB) > 0.001) {
          return distA - distB;
        }
        return a.char.playerId.localeCompare(b.char.playerId);
      });

      const winner = requests[0];
      const losers = requests.slice(1);

      let reason: "strength" | "proximity" | "id_priority" = "id_priority";
      if (Math.abs(winner.char.strength - losers[0].char.strength) > 0.001) {
        reason = "strength";
      } else {
        const distWin = Math.hypot(
          winner.target.position.x - winner.char.position.x,
          winner.target.position.y - winner.char.position.y,
          winner.target.position.z - winner.char.position.z
        );
        const distLose = Math.hypot(
          losers[0].target.position.x - losers[0].char.position.x,
          losers[0].target.position.y - losers[0].char.position.y,
          losers[0].target.position.z - losers[0].char.position.z
        );
        if (Math.abs(distWin - distLose) > 0.001) {
          reason = "proximity";
        }
      }

      const outcome: ContestedGrabResult = {
        eventId: `grab-${objId}-${currentTick}-${winner.char.playerId}`,
        tick: currentTick,
        targetObjectId: objId,
        winnerPlayerId: winner.char.playerId,
        loserPlayerIds: losers.map((l) => l.char.playerId),
        reason,
      };

      results.push(outcome);
      if (auditLog) {
        auditLog.push(outcome);
      }

      // Winner claims the item; losers fail to grab
      winner.char.pickupModule?.pickup(winner.char, winner.target);
    }

    return results;
  }
}
