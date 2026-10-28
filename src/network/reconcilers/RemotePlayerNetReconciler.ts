/**
 * RemotePlayerNetReconciler.ts
 *
 * Extracted from OnlineSessionManager.ts:
 * Handles remote player & dummy character synchronization from server snapshots:
 * - Inert physical combat dummy sync (HP, position, knockback)
 * - Remote player state sync (HP, laser 3-frame jitter debounce, melee strike seq, heldObject attachment)
 * - Disconnected remote player pruning
 * - Pushing snapshot samples into RemoteEntityInterpolator with latency-adaptive interpDelayMs
 */

import type { GameLoop } from "../../engine/GameLoop.js";
import type { OnlineRoomClient } from "../OnlineRoomClient.js";
import type { GhostEntityState, GhostSnapshot } from "../RelayClient.js";

export class RemotePlayerNetReconciler {
  /**
   * Synchronize an inert physical combat dummy character from server state.
   */
  public static syncDummyCharacter(gameLoop: GameLoop, c: GhostEntityState): void {
    const dummy = gameLoop.playerManager.dummyCharacters.find((d) => d.id === c.id || d.id === "dummy-1")
      || gameLoop.allCharacters.find((ac) => ac.id === c.id || ac.id === "dummy-1");
    if (!dummy) return;

    if (c.currentHp !== undefined && dummy.healthModule) {
      dummy.healthModule.isServerAuthoritativeOnly = true;
      const curHp = dummy.healthModule.getCurrentHp(dummy.properties);
      const damage = curHp - c.currentHp;
      if (damage > 0.05) {
        dummy.healthModule.takeDamage(damage, dummy.properties, {
          id: "collision_damage",
          name: "Collision",
          type: "instant",
          amount: damage,
          color: "#f87171",
          isHeal: false,
          fromServer: true,
        });
      } else {
        dummy.healthModule.currentHpProp.set(c.currentHp, dummy.properties);
      }
    }
    if (c.maxHp !== undefined && dummy.healthModule) {
      dummy.healthModule.maxHpProp.set(c.maxHp, dummy.properties);
    }

    // Sync physical coordinates and velocities
    if (c.x !== undefined && c.y !== undefined) {
      const dx = c.x - dummy.position.x;
      const dy = c.y - dummy.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 3.0) {
        // Hard snap on large divergence
        dummy.position.x = c.x;
        dummy.position.y = c.y;
        dummy.position.z = c.z ?? dummy.position.z;
        dummy.velocity.x = c.vx ?? 0;
        dummy.velocity.y = c.vy ?? 0;
      } else if (dist > 0.02) {
        // Smooth convergence blend
        const blend = 0.35;
        dummy.position.x += dx * blend;
        dummy.position.y += dy * blend;
        if (c.z !== undefined) {
          dummy.position.z += (c.z - dummy.position.z) * blend;
        }
        if (c.vx !== undefined) dummy.velocity.x += (c.vx - dummy.velocity.x) * blend;
        if (c.vy !== undefined) dummy.velocity.y += (c.vy - dummy.velocity.y) * blend;
      }
      if (c.isUnderKnockback && c.vx !== undefined && c.vy !== undefined) {
        dummy.velocity.x = c.vx;
        dummy.velocity.y = c.vy;
        dummy.applyKnockbackWindow(350);
      }
      if (c.facingAngle !== undefined) {
        dummy.facingAngle = c.facingAngle;
      }
    }
  }

  /**
   * Synchronize a remote player character (HP, laser debounce, melee punch sequence, heldObject).
   */
  public static syncRemoteCharacterState(gameLoop: GameLoop, c: GhostEntityState): void {
    gameLoop.playerManager.syncRemoteCharacter(c);
    const remChar = gameLoop.playerManager.remotePlayers.get(c.id);
    if (!remChar) return;

    if (c.name && remChar.name !== c.name) {
      remChar.name = c.name;
    }
    if (c.controllerType) {
      remChar.controllerType = c.controllerType;
    }
    if (c.isUsingItem !== undefined) {
      remChar.isUsingItem = Boolean(c.isUsingItem);
    }
    if (c.currentHp !== undefined && remChar.healthModule) {
      remChar.healthModule.isServerAuthoritativeOnly = true;
      const curHp = remChar.healthModule.getCurrentHp(remChar.properties);
      const damage = curHp - c.currentHp;
      if (damage > 0.05) {
        remChar.healthModule.takeDamage(damage, remChar.properties, {
          id: "collision_damage",
          name: "Collision",
          type: "instant",
          amount: damage,
          color: "#f87171",
          isHeal: false,
          fromServer: true,
        });
      } else {
        remChar.healthModule.currentHpProp.set(c.currentHp, remChar.properties);
      }
    }
    if (c.maxHp !== undefined && remChar.healthModule) {
      remChar.healthModule.maxHpProp.set(c.maxHp, remChar.properties);
    }
    // Sync Laser state on remote character
    if (remChar.laserModule) {
      remChar.isLaserAiming = false; // Aiming line is client-private; remote clients must not render it
      if (c.isLaserFiring) {
        remChar.isLaserFiring = true;
        remChar.laserModule.isFiring = true;
        (remChar as any).laserMissedTicks = 0;
      } else {
        // Absorb 1-2 frame snapshot jitter: require 3 consecutive non-firing snapshots (~50ms) to turn off
        const missed = ((remChar as any).laserMissedTicks ?? 0) + 1;
        (remChar as any).laserMissedTicks = missed;
        if (missed >= 3 || !remChar.isLaserFiring) {
          remChar.isLaserFiring = false;
          remChar.laserModule.isFiring = false;
        }
      }
      if (c.laserAimX !== undefined && c.laserAimY !== undefined) {
        remChar.laserAimTarget = { x: c.laserAimX, y: c.laserAimY };
        // NOTE: Do not clamp currentEndpoint to cursor position! LaserRenderer will raycast to wall or offscreen.
      }
      if (c.laserPowerFraction !== undefined) {
        remChar.laserPowerFraction = c.laserPowerFraction;
      }
    }
    // Sync Melee visual strike on remote character using local clock
    if (remChar.meleeModule && c.lastVisualPunchTime !== undefined) {
      const prevPunchSeq = (remChar as any)._lastReceivedPunchSeq ?? 0;
      if (c.lastVisualPunchTime !== prevPunchSeq && c.lastVisualPunchTime > 0) {
        (remChar as any)._lastReceivedPunchSeq = c.lastVisualPunchTime;
        remChar.meleeModule.lastVisualPunchTime = performance.now();
        if (c.visualPunchDirX !== undefined && c.visualPunchDirY !== undefined) {
          remChar.meleeModule.lastVisualPunchDir = { x: c.visualPunchDirX, y: c.visualPunchDirY };
        }
      }
    }
    // Remote character energy, stamina, and wattage are private to that client and not updated on remote entities
    if (c.heldObjectId) {
      const targetObj = gameLoop.objects.find((o) => o.id === c.heldObjectId);
      if (targetObj) {
        // If local character was mistakenly holding this object, release it immediately!
        for (const p of gameLoop.players.values()) {
          if (p.character.heldObject === targetObj) {
            p.character.heldObject = null;
          }
        }
        if (gameLoop.playerManager.baseCharacter.heldObject === targetObj) {
          gameLoop.playerManager.baseCharacter.heldObject = null;
        }
        remChar.heldObject = targetObj;
        targetObj.isHeld = true;
        targetObj.heldBy = remChar;
      }
    }
    // Note: If c.heldObjectId is absent, do NOT prematurely null remChar.heldObject here!
    // GameLoop.syncAuthoritativeObjects() needs to detect that remChar was holding it so
    // it can execute the instantaneous throw hand-off and apply ballistic launch physics.
  }

  /**
   * Prune disconnected remote players that are no longer in the authoritative snapshot.
   */
  public static pruneDisconnectedRemotePlayers(gameLoop: GameLoop, activeCharIds: Set<string>): void {
    for (const remId of gameLoop.playerManager.remotePlayers.keys()) {
      if (!activeCharIds.has(remId)) {
        gameLoop.playerManager.removeRemoteCharacter(remId);
        gameLoop.interpolator.clearEntity(remId);
        for (const obj of gameLoop.objects) {
          if (obj.heldBy && (obj.heldBy as any).playerId === remId) {
            obj.isHeld = false;
            obj.heldBy = null;
            obj.wakeUp();
          }
        }
      }
    }
  }

  /**
   * Push snapshot character samples into RemoteEntityInterpolator with dynamic latency-adaptive delay.
   */
  public static pushInterpolatorSamples(
    gameLoop: GameLoop,
    client: OnlineRoomClient,
    snapshot: GhostSnapshot,
    ghostChars: GhostEntityState[]
  ): void {
    const samples: any[] = [];
    for (const gc of ghostChars) {
      samples.push({
        id: gc.id,
        x: gc.x,
        y: gc.y,
        z: gc.z,
        vx: gc.vx,
        vy: gc.vy,
        vz: gc.vz || 0,
        facingAngle: gc.facingAngle ?? 0,
        isClimbing: gc.isClimbing,
        isAboveWalls: gc.isAboveWalls,
        isGrounded: gc.isGrounded,
        surfaceZ: gc.surfaceZ,
        heldObjectId: gc.heldObjectId || (gc.isHolding ? "held" : null),
        heldBy: gc.heldBy,
        color: gc.color,
        radius: gc.radius,
      });
    }

    // Dynamic latency-adaptive interpolation delay:
    // If the player has high ping, adapt interpDelayMs so buffered snapshots never starve into extrapolation stalls.
    if (client.pingMs > 0) {
      gameLoop.interpolator.interpDelayMs = Math.max(60, Math.min(250, Math.round(client.pingMs * 0.75)));
    }

    gameLoop.interpolator.pushSnapshot(snapshot.seq, samples, performance.now());
  }
}
