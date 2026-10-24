import { Character } from "../character/Character.js";
import { GameObject } from "../engine/GameObject.js";
import { Arena } from "../engine/Arena.js";
import { GhostSnapshot, GhostEntityState } from "../network/RelayClient.js";
import { AuthoritativeWorldSnapshot } from "./AuthoritativeSnapshotManager.js";
import { ClockSyncPacket } from "./ServerJitterBuffer.js";
import { ServerGameSimulation } from "./ServerGameSimulation.js";
import { prefabManager as defaultPrefabManager, PrefabManager } from "../engine/prefab/PrefabManager.js";

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
    forPlayerId?: string,
    deathRespawnEvents?: import("../network/RelayClient.js").DeathRespawnEvent[],
    objectDeletionEvents?: import("../network/RelayClient.js").ObjectDeletionEvent[],
    prefabManagerInstance?: PrefabManager
  ): GhostSnapshot {
    const primaryChar = charactersMap.get("keyboard") || allCharacters[0];
    const targetPId = forPlayerId || (primaryChar ? primaryChar.playerId : "keyboard");
    const clockSync = latestClockSync.get(targetPId) || latestClockSync.get("keyboard");
    const pm = prefabManagerInstance || defaultPrefabManager;

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

      const pId = obj.prefabId || (obj.name === "Apple" || obj.id.startsWith("apple-") ? "prefab_apple" : undefined);
      const prefab = pId ? pm.get(pId) : undefined;

      const baseState: GhostEntityState = {
        id: obj.id,
        x: Number(posX.toFixed(3)),
        y: Number(posY.toFixed(3)),
        z: Number(posZ.toFixed(3)),
        vx: Number(obj.velocity.x.toFixed(3)),
        vy: Number(obj.velocity.y.toFixed(3)),
        vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: obj.isRestingOnSurface || obj.position.z <= 0.005,
        isHeld: obj.isHeld || Boolean(holder),
        heldBy: holder ? (holder.playerId || (holder === primaryChar ? "player" : holder.id)) : (obj.heldBy ? ((obj.heldBy as Character).playerId || obj.heldBy.id) : null),
        isInFlight: Boolean(obj.isInFlight),
        isAboveWalls: obj.isAboveWalls,
        angX: obj.rollModule ? Number(obj.rollModule.angularVelocity.x.toFixed(3)) : undefined,
        angY: obj.rollModule ? Number(obj.rollModule.angularVelocity.y.toFixed(3)) : undefined,
        angZ: obj.rollModule ? Number(obj.rollModule.angularVelocity.z.toFixed(3)) : undefined,
        isSleeping: obj.isSleeping,
      };

      if (prefab && prefab.archetype) {
        const arch = prefab.archetype;
        baseState.prefabId = pId;

        // Omit static and archetype properties unless they differ from the prefab
        if (obj.name !== arch.name) {
          baseState.name = obj.name;
        }
        if (obj.color !== arch.color) {
          baseState.color = obj.color;
        }
        if (obj.visualShape !== arch.visualShape) {
          baseState.shape = obj.visualShape;
        }

        const archRadius = arch.consumableModule ? (arch.consumableModule.initialColliderRadius || arch.colliderRadius) : arch.colliderRadius;
        if (Math.abs(obj.colliderRadius - archRadius) > 0.005) {
          baseState.radius = Number(obj.colliderRadius.toFixed(3));
        }

        if (Math.abs(obj.mass - arch.mass) > 0.001) {
          baseState.mass = Number(obj.mass.toFixed(3));
        }

        const objBounce = obj.bounceMod ?? 0;
        const archBounce = arch.bounceMod ?? 0;
        if (Math.abs(objBounce - archBounce) > 0.001) {
          baseState.bounceMod = Number(objBounce.toFixed(3));
        }

        if (obj.consumableModule && obj.consumableModule.enabled) {
          const archConsumable = arch.consumableModule && arch.consumableModule.enabled ? arch.consumableModule : null;
          if (!archConsumable || obj.consumableModule.tag !== archConsumable.tag) {
            baseState.consumableTag = obj.consumableModule.tag;
          }

          const objTotal = obj.consumableModule.getTotalEnergy(obj.properties);
          const archTotal = archConsumable ? archConsumable.getTotalEnergy(arch.properties) : 0;
          if (Math.abs(objTotal - archTotal) > 0.1) {
            baseState.totalEnergyJoules = Number(objTotal.toFixed(1));
          }

          const objRem = obj.consumableModule.getRemainingEnergy(obj.properties);
          if (obj.isHeld || Math.abs(objRem - objTotal) > 0.1 || (archConsumable && Math.abs(objRem - archTotal) > 0.1)) {
            baseState.remainingEnergyJoules = Number(objRem.toFixed(1));
          }
        }

        if (obj.healthModule && obj.healthModule.enabled) {
          const curHp = obj.healthModule.getCurrentHp(obj.properties);
          const maxHp = obj.healthModule.getMaxHp(obj.properties);
          const archCurHp = arch.healthModule && arch.healthModule.enabled ? arch.healthModule.getCurrentHp(arch.properties) : undefined;
          const archMaxHp = arch.healthModule && arch.healthModule.enabled ? arch.healthModule.getMaxHp(arch.properties) : undefined;
          if (archCurHp === undefined || Math.abs(curHp - archCurHp) > 0.1) {
            baseState.currentHp = Number(curHp.toFixed(1));
          }
          if (archMaxHp === undefined || Math.abs(maxHp - archMaxHp) > 0.1) {
            baseState.maxHp = Number(maxHp.toFixed(1));
          }
        }

        if (obj.damageAuraModule && obj.damageAuraModule.enabled) {
          const auraRadius = obj.damageAuraModule.getDamageRadius(obj.properties);
          const auraRate = obj.damageAuraModule.getDamageRate(obj.properties);
          const archRadius = arch.damageAuraModule && arch.damageAuraModule.enabled ? arch.damageAuraModule.getDamageRadius(arch.properties) : undefined;
          const archRate = arch.damageAuraModule && arch.damageAuraModule.enabled ? arch.damageAuraModule.getDamageRate(arch.properties) : undefined;
          if (archRadius === undefined || Math.abs(auraRadius - archRadius) > 0.05) {
            baseState.damageAuraRadius = Number(auraRadius.toFixed(2));
          }
          if (archRate === undefined || Math.abs(auraRate - archRate) > 0.05) {
            baseState.damageAuraRate = Number(auraRate.toFixed(2));
          }
        }
      } else {
        baseState.name = obj.name;
        baseState.radius = obj.colliderRadius;
        baseState.color = obj.color;
        baseState.shape = obj.visualShape;
        baseState.mass = Number(obj.mass.toFixed(3));
        baseState.bounceMod = obj.bounceMod !== null ? Number(obj.bounceMod.toFixed(3)) : undefined;
        baseState.currentHp = obj.healthModule && obj.healthModule.enabled ? Number(obj.healthModule.getCurrentHp(obj.properties).toFixed(1)) : undefined;
        baseState.maxHp = obj.healthModule && obj.healthModule.enabled ? Number(obj.healthModule.getMaxHp(obj.properties).toFixed(1)) : undefined;
        baseState.consumableTag = obj.consumableModule && obj.consumableModule.enabled ? obj.consumableModule.tag : undefined;
        baseState.remainingEnergyJoules = obj.consumableModule && obj.consumableModule.enabled ? Number(obj.consumableModule.getRemainingEnergy(obj.properties).toFixed(1)) : undefined;
        baseState.totalEnergyJoules = obj.consumableModule && obj.consumableModule.enabled ? Number(obj.consumableModule.getTotalEnergy(obj.properties).toFixed(1)) : undefined;
        baseState.damageAuraRadius = obj.damageAuraModule && obj.damageAuraModule.enabled ? Number(obj.damageAuraModule.getDamageRadius(obj.properties).toFixed(2)) : undefined;
        baseState.damageAuraRate = obj.damageAuraModule && obj.damageAuraModule.enabled ? Number(obj.damageAuraModule.getDamageRate(obj.properties).toFixed(2)) : undefined;
      }

      return baseState;
    });

    const ghostCharacters: GhostEntityState[] = allCharacters.map((c) => {
      const mainBus = c.getEnergyBus("bus_main") || c.energyBusses.values().next().value;
      // Privacy constraint: Energy, stamina, and wattage are private to each client's owned characters.
      // Other remote clients must not receive private energy/stamina telemetry for other players.
      const charId = c.playerId || c.id || "player";
      const isOwnedByRecipient = !targetPId || (
        charId === targetPId ||
        charId.startsWith(`${targetPId}:`) ||
        (targetPId === "keyboard" && (c === primaryChar || charId === "player" || charId === "keyboard"))
      );

      return {
        id: charId,
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
        isUsingItem: Boolean(c.isUsingItem),
        isDummy: c.characterModule?.role === "dummy" || c.controllerType === "none" || c.id === "dummy-1",
        role: c.characterModule?.role ?? (c.controllerType === "none" ? "dummy" : "remote_player"),
        controllerType: c.controllerType,
        currentHp: c.healthModule && c.healthModule.enabled ? Number(c.healthModule.getCurrentHp(c.properties).toFixed(1)) : undefined,
        maxHp: c.healthModule && c.healthModule.enabled ? Number(c.healthModule.getMaxHp(c.properties).toFixed(1)) : undefined,
        currentEnergyJoules: isOwnedByRecipient && c.energyPool ? Number(c.energyPool.getCurrentEnergy(c.properties).toFixed(1)) : undefined,
        maxEnergyJoules: isOwnedByRecipient && c.energyPool ? Number(c.energyPool.getMaxEnergy(c.properties).toFixed(1)) : undefined,
        currentStaminaSeconds: isOwnedByRecipient && mainBus ? Number(mainBus.getCurrentStamina(c.properties).toFixed(2)) : undefined,
        maxStaminaSeconds: isOwnedByRecipient && mainBus ? Number(mainBus.getMaxStamina(c.properties).toFixed(2)) : undefined,
        currentWattage: isOwnedByRecipient && mainBus ? Number(mainBus.getCurrentWattage(c.properties).toFixed(1)) : undefined,
        isExhausted: isOwnedByRecipient && c.energyPool ? Boolean(c.energyPool.isExhausted) : undefined,
        lastVisualPunchTime: c.meleeModule ? c.meleeModule.lastVisualPunchTime : undefined,
        visualPunchDirX: c.meleeModule ? Number(c.meleeModule.lastVisualPunchDir.x.toFixed(3)) : undefined,
        visualPunchDirY: c.meleeModule ? Number(c.meleeModule.lastVisualPunchDir.y.toFixed(3)) : undefined,
        isUnderKnockback: Boolean(c.isUnderKnockback),
        isLaserAiming: Boolean(c.isLaserAiming),
        isLaserFiring: Boolean(c.isLaserFiring),
        laserAimX: c.laserAimTarget ? Number(c.laserAimTarget.x.toFixed(3)) : undefined,
        laserAimY: c.laserAimTarget ? Number(c.laserAimTarget.y.toFixed(3)) : undefined,
        laserPowerFraction: typeof c.laserPowerFraction === "number" ? Number(c.laserPowerFraction.toFixed(2)) : undefined,
      };
    });

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
      deathRespawnEvents: deathRespawnEvents && deathRespawnEvents.length > 0 ? [...deathRespawnEvents] : undefined,
      objectDeletionEvents: objectDeletionEvents && objectDeletionEvents.length > 0 ? [...objectDeletionEvents] : undefined,
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
