/**
 * ServerWorldInitializer.ts
 *
 * Extracted from ServerGameSimulation.ts:
 * Handles authoritative server world initialization & hot-reload:
 * - initializeFromWorld (replicates client arena, characters, objects, and held attachments)
 * - initializeDefaultScenario (Quarry preset, Player 1, Sparring Dummy, Quarry stones)
 * - initializeFromConfig (persistent WorldConfig hot-reload, prefabs, spawners)
 */

import type { ServerGameSimulation } from "../ServerGameSimulation.js";
import type { Arena } from "../../engine/Arena.js";
import { GameObject } from "../../engine/GameObject.js";
import { Character } from "../../character/Character.js";
import { RollModule } from "../../engine/RollModule.js";
import { ConsumableModule } from "../../engine/ConsumableModule.js";
import { quarryPreset, QUARRY_DUMMY_SPAWN, createQuarryStones } from "../../engine/maps/QuarryMap.js";
import { HealthModule } from "../../character/HealthModule.js";
import { WorldConfig, deserializeGameObject, applyCharacterConfig } from "../../config/WorldConfig.js";

export class ServerWorldInitializer {
  /**
   * Initializes or syncs the server simulation world from the client arena and entities.
   */
  public static initializeFromWorld(
    sim: ServerGameSimulation,
    clientArena: Arena,
    clientCharacters: Character[],
    clientObjects: GameObject[]
  ): void {
    // 1. Replicate Arena dimensions and walls
    sim.arena.width = clientArena.width;
    sim.arena.height = clientArena.height;
    sim.arena.tileSize = clientArena.tileSize;
    sim.arena.setStandardWallHeight(clientArena.wallHeight);
    sim.arena.tileGrid = clientArena.tileGrid.map((row) => [...row]);
    sim.arena.rebuildWalls();

    // 2. Replicate Characters
    sim.characters.clear();
    for (const c of clientCharacters) {
      const serverChar = new Character({
        x: c.position.x,
        y: c.position.y,
        color: c.playerColor || c.color || "#f59e0b",
        colliderRadius: c.colliderRadius,
        mass: c.baseMass || 1.2,
        strength: c.strength,
        playerId: c.playerId || "keyboard",
        playerNumber: c.playerNumber || 1,
        name: c.name || "Server Character",
      });
      serverChar.position.z = c.position.z;
      serverChar.velocity.x = c.velocity.x;
      serverChar.velocity.y = c.velocity.y;
      serverChar.verticalVelocity = c.verticalVelocity;
      serverChar.facingAngle = c.facingAngle;
      serverChar.isClimbing = c.isClimbing;
      serverChar.isSprinting = c.isSprinting;
      sim.characters.set(serverChar.playerId, serverChar);
    }

    // 3. Replicate Freebody Objects
    sim.objects = clientObjects.map((o) => {
      const serverObj = new GameObject({
        id: o.id,
        name: o.name,
        position: { x: o.position.x, y: o.position.y, z: o.position.z },
        velocity: { x: o.velocity.x, y: o.velocity.y },
        verticalVelocity: o.verticalVelocity,
        mass: o.mass,
        colliderRadius: o.colliderRadius,
        color: o.color,
        bounceMod: o.bounceMod,
        staticGroundFrictionMod: o.staticGroundFrictionMod,
        dynamicGroundFrictionMod: o.dynamicGroundFrictionMod,
        visualShape: o.visualShape,
        rollModule: o.rollModule
          ? new RollModule({
              rollResistance: o.rollModule.rollResistance,
              angularVelocity: { ...o.rollModule.angularVelocity },
              bumpyRollEnabled: o.rollModule.bumpyRollEnabled,
              bumpiness: o.rollModule.bumpiness,
              seed: o.rollModule.seed,
            })
          : undefined,
        consumableModule: o.consumableModule
          ? new ConsumableModule({
              tag: o.consumableModule.tag,
              totalEnergyJoules: o.consumableModule.getTotalEnergy(o.properties),
              remainingEnergyJoules: o.consumableModule.getRemainingEnergy(o.properties),
              consumeRateWatts: o.consumableModule.getConsumeRate(o.properties),
              healRate: o.consumableModule.getHealRate(o.properties),
              minScaleFloor: o.consumableModule.minScaleFloor,
              minRadiusFloor: o.consumableModule.minRadiusFloor,
              enabled: o.consumableModule.enabled,
            })
          : undefined,
      });
      serverObj.isSleeping = o.isSleeping;
      return serverObj;
    });

    // 4. Synchronize held object relations
    for (const clientChar of clientCharacters) {
      if (clientChar.heldObject) {
        const sChar = sim.characters.get(clientChar.playerId || "keyboard");
        const sObj = sim.objects.find((o) => o.id === clientChar.heldObject!.id);
        if (sChar && sObj) {
          sChar.heldObject = sObj;
          sObj.isHeld = true;
          sObj.heldBy = sChar;
        }
      }
    }

    sim.arena.syncEntitiesWithWalls([...sim.allCharacters, ...sim.objects]);
    sim.jitterBuffer.clear();
  }

  /**
   * Initializes default standard arena and freebodies if starting standalone without client.
   */
  public static initializeDefaultScenario(sim: ServerGameSimulation): void {
    // Generate Quarry preset walls
    sim.arena.loadWallPreset(quarryPreset.id);

    // Spawn player 1
    const p1Spawn = HealthModule.RESPAWN_SPAWNS[0];
    const player1 = new Character({
      x: p1Spawn.x,
      y: p1Spawn.y,
      color: "#f59e0b",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      playerId: "player-1",
      playerNumber: 1,
      name: "Server Player 1",
    });
    player1.position.z = p1Spawn.z ?? 0;
    sim.characters.set(player1.playerId, player1);

    // Spawn authoritative Sparring Dummy (inert character with controllerType "none")
    const dummy = new Character({
      id: "dummy-1",
      x: QUARRY_DUMMY_SPAWN.x,
      y: QUARRY_DUMMY_SPAWN.y,
      color: "#64748b",
      colliderRadius: 0.44,
      mass: 1.5,
      strength: 0,
      name: "Sparring Dummy",
      controllerType: "none",
      role: "dummy",
    });
    sim.characters.set(dummy.id, dummy);

    // Spawn default freebody test stones
    sim.objects = createQuarryStones();

    sim.arena.syncEntitiesWithWalls([...sim.allCharacters, ...sim.objects]);
    sim.jitterBuffer.clear();
  }

  /**
   * Initializes or hot-reloads the authoritative server simulation world from a persistent WorldConfig.
   */
  public static initializeFromConfig(sim: ServerGameSimulation, config: WorldConfig): void {
    if (config.arena) {
      if (config.arena.width && config.arena.height) {
        sim.arena.width = config.arena.width;
        sim.arena.height = config.arena.height;
      }
      if (config.arena.wallHeight !== undefined) {
        sim.arena.setStandardWallHeight(config.arena.wallHeight);
      }
      if (config.arena.tileGrid) {
        sim.arena.tileGrid = config.arena.tileGrid.map((row) => [...row]);
        sim.arena.rebuildWalls();
      } else if (config.arena.presetId) {
        sim.arena.loadWallPreset(config.arena.presetId);
      }
    }

    if (config.globalPhysics) {
      if (config.globalPhysics.gravity !== undefined) {
        sim.arena.gravity = config.globalPhysics.gravity;
      }
      if (config.globalPhysics.collisionDamageScale !== undefined) {
        GameObject.globalWorldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
      }
      if (config.globalPhysics.collisionMode) {
        sim.collisionMode = config.globalPhysics.collisionMode;
      }
    }

    // Preserve existing players, or spawn defaults deterministically at quarry spawn points
    if (sim.characters.size === 0) {
      const p1Spawn = HealthModule.RESPAWN_SPAWNS[0];
      const player1 = new Character({
        x: p1Spawn.x,
        y: p1Spawn.y,
        color: "#f59e0b",
        colliderRadius: 0.44,
        mass: 1.2,
        strength: 1.0,
        playerId: "player-1",
        playerNumber: 1,
        name: "Server Player 1",
      });
      player1.position.z = p1Spawn.z ?? 0;
      if (config.player) {
        applyCharacterConfig(player1, config.player);
        player1.playerId = "player-1";
        player1.playerNumber = 1;
      }
      sim.characters.set(player1.playerId, player1);

      const dummy = new Character({
        id: "dummy-1",
        x: QUARRY_DUMMY_SPAWN.x,
        y: QUARRY_DUMMY_SPAWN.y,
        color: "#64748b",
        colliderRadius: 0.44,
        mass: 1.5,
        strength: 0,
        name: "Sparring Dummy",
        controllerType: "none",
        role: "dummy",
      });
      sim.characters.set(dummy.id, dummy);
    } else if (config.player) {
      // Update all existing connected player characters with newly saved player configuration
      for (const char of sim.characters.values()) {
        if (char.characterModule?.role === "dummy" || char.controllerType === "none") continue;
        const savedPlayerId = char.playerId;
        const savedPlayerNum = char.playerNumber;
        const savedColor = char.color;
        const savedName = char.name;
        const hasCustom = char.hasCustomName;
        applyCharacterConfig(char, config.player);
        char.playerId = savedPlayerId;
        char.playerNumber = savedPlayerNum;
        char.color = savedColor;
        if (hasCustom) {
          char.name = savedName;
          char.hasCustomName = true;
        }
      }
    }

    // Load prefabs if present
    if (config.prefabs && Array.isArray(config.prefabs)) {
      sim.prefabManager.loadFromConfig(config.prefabs);
    }

    // Load spawners if present
    if (config.spawners && Array.isArray(config.spawners)) {
      sim.sceneSpawnerManager.loadFromConfig(config.spawners);
    }

    // Load objects ONLY IF room is currently uninitialized/empty!
    // If simulation is already running with active players, preserve live freebody positions, velocities and in-flight states!
    if (sim.objects.length === 0) {
      if (config.objects && config.objects.length > 0) {
        sim.objects = config.objects.map(deserializeGameObject);
      } else {
        sim.objects = createQuarryStones();
      }
      sim.arena.syncEntitiesWithWalls([...sim.allCharacters, ...sim.objects]);
      sim.jitterBuffer.clear();
    }
  }
}
