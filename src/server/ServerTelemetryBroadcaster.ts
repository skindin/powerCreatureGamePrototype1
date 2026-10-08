import { Character } from "../character/Character.js";
import { GameObject } from "../engine/GameObject.js";
import { Arena } from "../engine/Arena.js";
import { GhostSnapshot, GhostEntityState } from "../network/RelayClient.js";
import { AuthoritativeWorldSnapshot } from "./AuthoritativeSnapshotManager.js";
import { ClockSyncPacket } from "./ServerJitterBuffer.js";
import { ServerGameSimulation } from "./ServerGameSimulation.js";

/**
 * ServerTelemetryBroadcaster
 *
 * Dedicated domain service isolating authoritative snapshot creation and serialization (Phase 5).
 * Prepares:
 * 1) GhostSnapshot (for rendering, interpolation, and relay loopbacks)
 * 2) AuthoritativeWorldSnapshot (quantized delta-compressed world updates)
 */
export class ServerTelemetryBroadcaster {
  /**
   * Builds an uncompressed GhostSnapshot suitable for canvas rendering or client interpolation.
   */
  public static createGhostSnapshot(
    currentTick: number,
    allCharacters: Character[],
    charactersMap: Map<string, Character>,
    objects: GameObject[],
    arena: Arena,
    latestClockSync: Map<string, ClockSyncPacket>,
    recentAckedActionIds: string[],
    contestedGrabEvents?: import("./ContestedGrabArbiter.js").ContestedGrabResult[],
    rttMs: number = 0,
    forPlayerId?: string
  ): GhostSnapshot {
    const primaryChar = charactersMap.get("keyboard") || allCharacters[0];
    const targetPId = forPlayerId || (primaryChar ? primaryChar.playerId : "keyboard");
    const clockSync = latestClockSync.get(targetPId) || latestClockSync.get("keyboard");

    const ghostChar: GhostEntityState = {
      id: primaryChar ? primaryChar.playerId : "player",
      x: primaryChar ? Number(primaryChar.position.x.toFixed(3)) : 0,
      y: primaryChar ? Number(primaryChar.position.y.toFixed(3)) : 0,
      z: primaryChar ? Number(primaryChar.position.z.toFixed(3)) : 0,
      vx: primaryChar ? Number(primaryChar.velocity.x.toFixed(3)) : 0,
      vy: primaryChar ? Number(primaryChar.velocity.y.toFixed(3)) : 0,
      vz: primaryChar ? Number((primaryChar.hasVerticalVelocity ? primaryChar.verticalVelocity : 0).toFixed(3)) : 0,
      surfaceZ: primaryChar ? Number((primaryChar.supportingSurfaceHeight ?? 0).toFixed(3)) : 0,
      isGrounded: primaryChar ? (primaryChar.isRestingOnSurface || primaryChar.position.z <= 0.005) : true,
      radius: primaryChar ? primaryChar.colliderRadius : 0.44,
      color: primaryChar ? (primaryChar.playerColor || primaryChar.color) : "#f59e0b",
      playerColor: primaryChar ? (primaryChar.playerColor || primaryChar.color) : "#f59e0b",
      playerNumber: primaryChar ? primaryChar.playerNumber : 1,
      isClimbing: primaryChar ? primaryChar.isClimbing : false,
      isAboveWalls: primaryChar ? primaryChar.isAboveWalls : false,
      facingAngle: primaryChar ? Number(primaryChar.facingAngle.toFixed(4)) : 0,
    };

    const ghostObjects: GhostEntityState[] = objects.map((obj) => {
      const holder = (obj.heldBy instanceof Character ? obj.heldBy : null) || allCharacters.find((c) => c.heldObject === obj);
      let posX = obj.position.x;
      let posY = obj.position.y;
      let posZ = obj.position.z;
      if ((obj.isHeld || holder) && holder) {
        const relPos = holder.calculateHeldObjectPosition(arena);
        posX = relPos.x;
        posY = relPos.y;
        posZ = relPos.z;
      }
      return {
        id: obj.id,
        name: obj.name,
        x: Number(posX.toFixed(3)),
        y: Number(posY.toFixed(3)),
        z: Number(posZ.toFixed(3)),
        vx: Number(obj.velocity.x.toFixed(3)),
        vy: Number(obj.velocity.y.toFixed(3)),
        vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: obj.isRestingOnSurface || obj.position.z <= 0.005,
        radius: obj.colliderRadius,
        color: obj.color,
        shape: obj.visualShape,
        isHeld: obj.isHeld || Boolean(holder),
        heldBy: holder ? (holder.playerId || (holder === primaryChar ? "player" : holder.id)) : (obj.heldBy ? ((obj.heldBy as Character).playerId || obj.heldBy.id) : null),
        isAboveWalls: obj.isAboveWalls,
        angX: obj.rollModule ? Number(obj.rollModule.angularVelocity.x.toFixed(3)) : undefined,
        angY: obj.rollModule ? Number(obj.rollModule.angularVelocity.y.toFixed(3)) : undefined,
        angZ: obj.rollModule ? Number(obj.rollModule.angularVelocity.z.toFixed(3)) : undefined,
        isSleeping: obj.isSleeping,
      };
    });

    const ghostCharacters: GhostEntityState[] = allCharacters.map((c) => ({
      id: c.playerId || c.id || "player",
      name: c.name,
      x: Number(c.position.x.toFixed(3)),
      y: Number(c.position.y.toFixed(3)),
      z: Number(c.position.z.toFixed(3)),
      vx: Number(c.velocity.x.toFixed(3)),
      vy: Number(c.velocity.y.toFixed(3)),
      vz: Number((c.hasVerticalVelocity ? c.verticalVelocity : 0).toFixed(3)),
      surfaceZ: Number((c.supportingSurfaceHeight ?? 0).toFixed(3)),
      isGrounded: c.isRestingOnSurface || c.position.z <= 0.005,
      radius: c.colliderRadius,
      color: c.playerColor || c.color,
      playerColor: c.playerColor || c.color,
      playerNumber: c.playerNumber,
      isClimbing: c.isClimbing,
      isAboveWalls: c.isAboveWalls,
      facingAngle: Number(c.facingAngle.toFixed(4)),
      heldObjectId: c.heldObject ? c.heldObject.id : null,
      isHolding: Boolean(c.heldObject),
    }));

    return {
      seq: currentTick,
      sentAt: performance.now(),
      receivedAt: performance.now(),
      rttMs,
      character: ghostChar,
      characters: ghostCharacters,
      objects: ghostObjects,
      ackActionIds: recentAckedActionIds,
      contestedGrabEvents: contestedGrabEvents && contestedGrabEvents.length > 0 ? [...contestedGrabEvents] : undefined,
      clockSync,
    };
  }

  /**
   * Generates a quantized, delta-compressed AuthoritativeWorldSnapshot for network broadcast.
   */
  public static createAuthoritativeWorldSnapshot(
    simulation: ServerGameSimulation,
    forceKeyframe: boolean = false
  ): AuthoritativeWorldSnapshot {
    const lastProcessedInputTick: { [playerId: string]: number } = {};
    for (const [pId] of simulation.characters) {
      const stats = simulation.jitterBuffer.getStats(pId);
      if (stats && stats.lastConsumedTick !== null) {
        lastProcessedInputTick[pId] = stats.lastConsumedTick;
      }
    }
    const primaryChar = simulation.characters.get("keyboard") || simulation.allCharacters[0];
    const targetPId = primaryChar ? primaryChar.playerId : "keyboard";
    const clockSync = simulation.latestClockSync.get(targetPId) || simulation.latestClockSync.get("keyboard") || undefined;

    return simulation.snapshotManager.createSnapshot(
      simulation.currentTick,
      simulation.allCharacters,
      simulation.objects,
      lastProcessedInputTick,
      simulation.getRecentAckedActionIds(),
      clockSync,
      forceKeyframe
    );
  }
}
