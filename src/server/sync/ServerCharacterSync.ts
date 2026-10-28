/**
 * ServerCharacterSync.ts
 *
 * TIER 2 (Protected) Module:
 * Extracted from ServerGameSimulation.ts:
 * Synchronizes authoritative server characters from incoming client telemetry packets.
 * Includes the Dual Competing Authority Channels guard (`hasPendingThrow`) so raw telemetry
 * never drops a held object before a queued `isThrow` packet or reliable throw action executes.
 */

import type { ServerGameSimulation } from "../ServerGameSimulation.js";
import type { GhostEntityState } from "../../network/RelayClient.js";

export class ServerCharacterSync {
  /**
   * Synchronizes all authoritative server characters from client telemetry packets.
   */
  public static syncCharactersFromPacket(sim: ServerGameSimulation, clientChars: GhostEntityState[]): void {
    if (!Array.isArray(clientChars) || clientChars.length === 0) return;
    for (const c of clientChars) {
      ServerCharacterSync.syncCharacterFromPacket(sim, c);
    }
  }

  /**
   * Synchronizes the authoritative server character from client telemetry packets.
   * Updates velocity and coordinates directly so the server player ghost stays locked to the client.
   */
  public static syncCharacterFromPacket(sim: ServerGameSimulation, clientChar: GhostEntityState): void {
    if (!clientChar) return;

    const charId = clientChar.id || "keyboard";
    const sChar = sim.characters.get(charId);
    if (!sChar) {
      // In authoritative server mode, ignore telemetry for unknown/unregistered characters
      return;
    }

    // Server-authoritative death respawn lock:
    // If character is marked respawn-locked, only unlock when incoming packet is aligned with respawn coordinates!
    if ((sChar as any).isRespawnLocked && (sChar as any).authoritativeRespawnPos) {
      const respawnPos = (sChar as any).authoritativeRespawnPos;
      const distToRespawn = Math.hypot(clientChar.x - respawnPos.x, clientChar.y - respawnPos.y);
      if (distToRespawn <= 1.5) {
        // Incoming packet is aligned with respawn position: unlock character!
        (sChar as any).isRespawnLocked = false;
      } else {
        // Keep character firmly locked at respawn coordinates if packet predates respawn
        sChar.position.x = respawnPos.x;
        sChar.position.y = respawnPos.y;
        sChar.position.z = respawnPos.z;
        sChar.velocity.x = 0;
        sChar.velocity.y = 0;
        if (sChar.hasVerticalVelocity) sChar.verticalVelocity = 0;
        return;
      }
    }

    // Secondary check against active unacknowledged pending death events
    for (const pending of sim.pendingDeathRespawnEvents.values()) {
      const isTarget = pending.event.targetEntityId === charId ||
                       pending.event.targetEntityId === sChar.id ||
                       pending.event.targetEntityId === sChar.playerId ||
                       pending.event.targetEntityId === (sChar as any).serverCharId;
      const hasAcked = pending.acks.has(charId) ||
                       pending.acks.has(sChar.id) ||
                       (sChar.playerId && pending.acks.has(sChar.playerId)) ||
                       ((sChar as any).serverCharId && pending.acks.has((sChar as any).serverCharId));
      if (isTarget && !hasAcked) {
        sChar.position.x = pending.event.respawnX;
        sChar.position.y = pending.event.respawnY;
        sChar.position.z = pending.event.respawnZ;
        sChar.velocity.x = 0;
        sChar.velocity.y = 0;
        if (sChar.hasVerticalVelocity) sChar.verticalVelocity = 0;
        return;
      }
    }

    const now = performance.now();
    const hasRecentImpact = sChar.isUnderKnockback || (sChar.lastCollisionTime > 0 && (now - sChar.lastCollisionTime < 400));

    const isClientMoving = Math.hypot(clientChar.vx, clientChar.vy) > 0.1;

    // 1. Synchronize Linear and Vertical Velocity
    if (hasRecentImpact) {
      // Character has an active collision impulse on the server (e.g. was pushed or hit by thrown object).
      // Blend voluntary client velocity with impulse velocity instead of wiping out the impulse!
      if (isClientMoving) {
        sChar.velocity.x += (clientChar.vx - sChar.velocity.x) * 0.3;
        sChar.velocity.y += (clientChar.vy - sChar.velocity.y) * 0.3;
      }
    } else {
      sChar.velocity.x = clientChar.vx;
      sChar.velocity.y = clientChar.vy;
    }

    if (sChar.hasVerticalVelocity && clientChar.vz !== undefined) {
      const surfaceZ = sChar.supportingSurfaceHeight ?? 0;
      const isServerGrounded = sChar.isRestingOnSurface ||
        (Math.abs(sChar.position.z - surfaceZ) <= 0.08 && Math.abs(sChar.verticalVelocity) <= 0.8);

      // If client took off jumping while server character was grounded, authoritatively execute jump
      // so energy and stamina are deducted and synchronized on the authoritative server
      if (
        isServerGrounded &&
        !sChar.isClimbing &&
        !sChar.isHeld &&
        !hasRecentImpact &&
        clientChar.vz > 1.0
      ) {
        const moveInput = isClientMoving ? { x: clientChar.vx, y: clientChar.vy } : undefined;
        sChar.jump(sim.arena, moveInput);
      }

      if (!hasRecentImpact || clientChar.vz > sChar.verticalVelocity) {
        sChar.verticalVelocity = clientChar.vz;
      }
    }

    // 2. Synchronize Physical Coordinates
    const dx = clientChar.x - sChar.position.x;
    const dy = clientChar.y - sChar.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2.5) {
      // Large difference (teleport or initial join): snap
      sChar.position.x = clientChar.x;
      sChar.position.y = clientChar.y;
      sChar.position.z = clientChar.z;
    } else if (hasRecentImpact) {
      // During active collision on the server, preserve the physical push!
      // Only blend client position if the client is actively steering/walking:
      if (isClientMoving) {
        sChar.position.x += dx * 0.25;
        sChar.position.y += dy * 0.25;
      }
      sChar.position.z = clientChar.z;
    } else {
      // When not colliding, sync directly to eliminate drift
      sChar.position.x = clientChar.x;
      sChar.position.y = clientChar.y;
      sChar.position.z = clientChar.z;
    }

    // 3. Synchronize Surface & Elevation States
    if (clientChar.surfaceZ !== undefined) {
      sChar.supportingSurfaceHeight = clientChar.surfaceZ;
    }
    if (clientChar.isGrounded) {
      const surfaceZ = clientChar.surfaceZ ?? 0;
      if (sChar.position.z <= surfaceZ + 0.1) {
        sChar.position.z = surfaceZ;
        sChar.verticalVelocity = 0;
      }
    }
    if (clientChar.isClimbing !== undefined) {
      sChar.isClimbing = clientChar.isClimbing;
    }
    if (clientChar.facingAngle !== undefined) {
      sChar.facingAngle = clientChar.facingAngle;
    }
    if (clientChar.isUsingItem !== undefined) {
      sChar.isUsingItem = Boolean(clientChar.isUsingItem);
    }

    // 4. Synchronize Held Object state
    // Authoritative Server Protection: A client cannot simply claim an object upon joining or telemetry.
    // An object is only kept held if the server's authoritative state already has it held by this character,
    // or if the client explicitly releases/drops an object it was holding.
    if (clientChar.heldObjectId) {
      if (sChar.hasDiedAwaitingNewPickup) {
        // Character died and has not yet picked up a new item; ignore stale heldObjectId packet
      } else {
        const sObj = sim.objects.find((o) => o.id === clientChar.heldObjectId);
        if (sObj && sObj.heldBy === sChar && sChar.heldObject === sObj) {
          // Keep synced with hands
          const relPos = sChar.calculateHeldObjectPosition(sim.arena);
          sObj.position.x = relPos.x;
          sObj.position.y = relPos.y;
          sObj.position.z = relPos.z;
          sObj.velocity.x = sChar.velocity.x;
          sObj.velocity.y = sChar.velocity.y;
          sObj.verticalVelocity = 0;
        }
      }
    } else if (sChar.heldObject && clientChar.isHolding === false) {
      // Dual Authority Channel Guard:
      // Never allow raw telemetry to unhold/drop an object if a throw packet is queued in the jitter buffer
      // or if a throw was just executed within the last 250ms!
      const hasPendingThrow =
        (((sChar as any)._pendingThrowUntilMs ?? 0) > now) ||
        (now - ((sChar as any)._lastServerThrowTime ?? 0) < 250);
      if (hasPendingThrow) {
        return;
      }

      const sObj = sChar.heldObject;
      if (sObj.consumableModule && (sObj.consumableModule.isConsumed || sObj.consumableModule.getRemainingEnergy(sObj.properties) <= 0.05)) {
        sim.triggerObjectDeletion(sObj.id);
      } else {
        sObj.isHeld = false;
        sObj.heldBy = null;
        sChar.heldObject = null;
      }
    }
  }
}
