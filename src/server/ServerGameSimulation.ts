import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { CollisionResolver } from "../engine/physics/CollisionResolver.js";
import { IslandManager } from "../engine/physics/IslandManager.js";
import { SnapshotManager, WorldSnapshot } from "../engine/physics/Snapshot.js";
import { PlayerInputPacket, ReliableActionCommand } from "../engine/physics/StateHistoryBuffer.js";
import { GhostSnapshot, GhostEntityState, DeathRespawnEvent, ObjectDeletionEvent } from "../network/RelayClient.js";
import { RollModule } from "../engine/RollModule.js";
import { ConsumableModule } from "../engine/ConsumableModule.js";
import { SceneSpawnerManager } from "../engine/spawner/SceneSpawnerManager.js";
import { PrefabManager } from "../engine/prefab/PrefabManager.js";
import { ServerJitterBufferManager, JitterBufferStats, ClockSyncPacket } from "./ServerJitterBuffer.js";
import {
  AuthoritativeSnapshotManager,
  AuthoritativeWorldSnapshot,
} from "./AuthoritativeSnapshotManager.js";
import { ContestedGrabArbiter, ContestedGrabResult } from "./ContestedGrabArbiter.js";
import { ServerTelemetryBroadcaster } from "./ServerTelemetryBroadcaster.js";
import { quarryPreset, QUARRY_DUMMY_SPAWN, createQuarryStones } from "../engine/maps/QuarryMap.js";
import { HealthModule } from "../character/HealthModule.js";
import { WorldConfig, deserializeGameObject, applyCharacterConfig } from "../config/WorldConfig.js";

export type { ContestedGrabResult, DeathRespawnEvent };

export interface ServerSimConfig {
  arenaWidth?: number;
  arenaHeight?: number;
  wallHeight?: number;
  collisionMode?: "dynamic" | "discrete" | "continuous" | "naive";
  fixedDt?: number;
  jitterTargetDepth?: number;
  broadcastRateHz?: 30 | 60;
  deltaCompression?: boolean;
}

/**
 * Headless, authoritative server-side simulation engine (Phase 4).
 * Completely decoupled from HTML5 Canvas and DOM APIs.
 * Runs deterministic 60Hz physics steps using Arena, GameObject, Character,
 * CollisionResolver, and IslandManager.
 */
export class ServerGameSimulation {
  public arena: Arena;
  public characters: Map<string, Character> = new Map();
  public objects: GameObject[] = [];
  public islandManager: IslandManager;
  public currentTick: number = 0;
  public fixedDt: number = 1 / 60;
  public collisionMode: "dynamic" | "discrete" | "continuous" | "naive" = "dynamic";

  // Background scene spawner manager (authoritative item dispensing on server)
  public sceneSpawnerManager: SceneSpawnerManager;
  public prefabManager: PrefabManager;

  // Per-player input jitter buffer (Phase 5.2)
  public jitterBuffer: ServerJitterBufferManager;

  // Adaptive Clock Sync & Time Dilation (Phase 6)
  public latestClockSync: Map<string, ClockSyncPacket> = new Map();
  public clockSyncCheckInterval: number = 10; // Check every 10 ticks (6.1)

  // Authoritative Snapshot Broadcast & Delta Compression (Phase 7)
  public snapshotManager: AuthoritativeSnapshotManager;
  public clientAckedTicks: Map<string, number> = new Map(); // Client confirmed server ticks (7.3)

  // Contested grab arbitration audit log & active reliable retry map
  public contestedGrabEvents: ContestedGrabResult[] = [];
  public pendingContestedEvents: Map<string, { event: ContestedGrabResult; createdTick: number; acks: Set<string> }> = new Map();

  // Authoritative death & respawn reliable retry map
  public pendingDeathRespawnEvents: Map<string, { event: DeathRespawnEvent; createdTick: number; acks: Set<string> }> = new Map();

  // Authoritative object deletion reliable retry map (e.g. eaten consumables)
  public pendingObjectDeletionEvents: Map<string, { event: ObjectDeletionEvent; createdTick: number; acks: Set<string> }> = new Map();

  // Reliable action deduplication & ACK tracking
  private processedActionIds: Set<string> = new Set();
  private recentAckedActionIds: string[] = [];

  // Track deleted object IDs so client telemetry packets cannot resurrect deleted items (e.g. eaten food)
  public deletedObjectIds: Set<string> = new Set();

  // Authoritative grab result priority broadcast callback
  public onGrabResult?: (result: any) => void;

  constructor(config?: ServerSimConfig) {
    const width = config?.arenaWidth ?? 20;
    const height = config?.arenaHeight ?? 14;
    const wallH = config?.wallHeight ?? 1.0;
    this.arena = new Arena(width, height, wallH);
    this.islandManager = new IslandManager();
    if (config?.collisionMode) this.collisionMode = config.collisionMode;
    if (config?.fixedDt) this.fixedDt = config.fixedDt;
    this.jitterBuffer = new ServerJitterBufferManager({
      targetDepth: config?.jitterTargetDepth ?? 2,
      maxCapacity: 60,
    });
    this.snapshotManager = new AuthoritativeSnapshotManager({
      broadcastRateHz: config?.broadcastRateHz ?? 60,
      deltaCompression: config?.deltaCompression ?? true,
    });
    this.prefabManager = new PrefabManager();
    this.sceneSpawnerManager = new SceneSpawnerManager(this.prefabManager);
  }

  public get allCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  /**
   * Initializes or syncs the server simulation world from the client arena and entities.
   */
  public initializeFromWorld(
    clientArena: Arena,
    clientCharacters: Character[],
    clientObjects: GameObject[]
  ): void {
    // 1. Replicate Arena dimensions and walls
    this.arena.width = clientArena.width;
    this.arena.height = clientArena.height;
    this.arena.tileSize = clientArena.tileSize;
    this.arena.setStandardWallHeight(clientArena.wallHeight);
    this.arena.tileGrid = clientArena.tileGrid.map((row) => [...row]);
    this.arena.rebuildWalls();

    // 2. Replicate Characters
    this.characters.clear();
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
      this.characters.set(serverChar.playerId, serverChar);
    }

    // 3. Replicate Freebody Objects
    this.objects = clientObjects.map((o) => {
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
        const sChar = this.characters.get(clientChar.playerId || "keyboard");
        const sObj = this.objects.find((o) => o.id === clientChar.heldObject!.id);
        if (sChar && sObj) {
          sChar.heldObject = sObj;
          sObj.isHeld = true;
          sObj.heldBy = sChar;
        }
      }
    }

    this.arena.syncEntitiesWithWalls([...this.allCharacters, ...this.objects]);
    this.jitterBuffer.clear();
  }

  /**
   * Initializes default standard arena and freebodies if starting standalone without client.
   */
  public initializeDefaultScenario(): void {
    // Generate Quarry preset walls
    this.arena.loadWallPreset(quarryPreset.id);

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
    this.characters.set(player1.playerId, player1);

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
    this.characters.set(dummy.id, dummy);

    // Spawn default freebody test stones
    this.objects = createQuarryStones();

    this.arena.syncEntitiesWithWalls([...this.allCharacters, ...this.objects]);
    this.jitterBuffer.clear();
  }

  /**
   * Initializes or hot-reloads the authoritative server simulation world from a persistent WorldConfig.
   */
  public initializeFromConfig(config: WorldConfig): void {
    if (config.arena) {
      if (config.arena.width && config.arena.height) {
        this.arena.width = config.arena.width;
        this.arena.height = config.arena.height;
      }
      if (config.arena.wallHeight !== undefined) {
        this.arena.setStandardWallHeight(config.arena.wallHeight);
      }
      if (config.arena.tileGrid) {
        this.arena.tileGrid = config.arena.tileGrid.map((row) => [...row]);
        this.arena.rebuildWalls();
      } else if (config.arena.presetId) {
        this.arena.loadWallPreset(config.arena.presetId);
      }
    }

    if (config.globalPhysics) {
      if (config.globalPhysics.gravity !== undefined) {
        this.arena.gravity = config.globalPhysics.gravity;
      }
      if (config.globalPhysics.collisionDamageScale !== undefined) {
        GameObject.globalWorldCollisionDamageScale = config.globalPhysics.collisionDamageScale;
      }
      if (config.globalPhysics.collisionMode) {
        this.collisionMode = config.globalPhysics.collisionMode;
      }
    }

    // Preserve existing players, or spawn defaults deterministically at quarry spawn points
    if (this.characters.size === 0) {
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
      this.characters.set(player1.playerId, player1);

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
      this.characters.set(dummy.id, dummy);
    } else if (config.player) {
      // Update all existing connected player characters with newly saved player configuration
      for (const char of this.characters.values()) {
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
      this.prefabManager.loadFromConfig(config.prefabs);
    }

    // Load objects ONLY IF room is currently uninitialized/empty!
    // If simulation is already running with active players, preserve live freebody positions, velocities and in-flight states!
    if (this.objects.length === 0) {
      if (config.objects && config.objects.length > 0) {
        this.objects = config.objects.map(deserializeGameObject);
      } else {
        this.objects = createQuarryStones();
      }
      this.arena.syncEntitiesWithWalls([...this.allCharacters, ...this.objects]);
      this.jitterBuffer.clear();
    }
  }

  /**
   * Enqueues an incoming input packet from a player into the server jitter buffer.
   * Also tracks client acknowledged server ticks (Phase 7.3).
   */
  public queueInput(packet: PlayerInputPacket): boolean {
    if (packet.lastReceivedServerTick !== undefined) {
      const cur = this.clientAckedTicks.get(packet.playerId) ?? 0;
      if (packet.lastReceivedServerTick > cur) {
        this.clientAckedTicks.set(packet.playerId, packet.lastReceivedServerTick);
      }
    }
    if (packet.playerId && !this.characters.has(packet.playerId)) {
      // In authoritative server mode, ignore input for unknown or unregistered characters
      return false;
    }
    return this.jitterBuffer.push(packet);
  }

  /**
   * Retrieves the highest server tick confirmed acknowledged by a client (Phase 7.3).
   */
  public getClientAckedTick(playerId: string): number {
    return this.clientAckedTicks.get(playerId) ?? 0;
  }

  /**
   * Retrieves telemetry stats for a player's jitter buffer.
   */
  public getJitterStats(playerId: string): JitterBufferStats | null {
    return this.jitterBuffer.getStats(playerId);
  }

  /**
   * Retrieves telemetry stats for all active jitter buffers.
   */
  public getAllJitterStats(): JitterBufferStats[] {
    return this.jitterBuffer.getAllStats();
  }

  /**
   * Evaluates jitter buffer depths and computes adaptive clock sync packets for all players (Phase 6).
   */
  public evaluateClockSync(): void {
    for (const [pId] of this.characters) {
      const syncPacket = this.jitterBuffer.evaluateClockSync(pId, this.currentTick);
      this.latestClockSync.set(pId, syncPacket);
    }
    // Fallback for default keyboard player if not explicitly in characters map
    if (!this.characters.has("keyboard")) {
      const syncPacket = this.jitterBuffer.evaluateClockSync("keyboard", this.currentTick);
      this.latestClockSync.set("keyboard", syncPacket);
    }
  }

  /**
   * Retrieves the latest ClockSyncPacket for a player.
   */
  public getLatestClockSync(playerId: string): ClockSyncPacket | null {
    return this.latestClockSync.get(playerId) ?? null;
  }

  /**
   * Synchronizes server simulation objects from incoming client telemetry packets.
   * Synchronizes positions AND velocities, 3D roll angular velocity, and held/resting states
   * so the server runs physics independently with accurate momentum and coordinates.
   */
  public syncObjectsFromPacket(clientObjects: GhostEntityState[], senderClientId?: string): void {
    if (!clientObjects || clientObjects.length === 0) return;

    for (const cObj of clientObjects) {
      if (this.deletedObjectIds.has(cObj.id)) {
        continue;
      }
      if (cObj.remainingEnergyJoules !== undefined && cObj.remainingEnergyJoules <= 0.001) {
        this.triggerObjectDeletion(cObj.id);
        continue;
      }
      let sObj = this.objects.find((o) => o.id === cObj.id);
      if (!sObj) {
        const pId = cObj.prefabId || (cObj.name === "Apple" || cObj.id.startsWith("apple-") ? "prefab_apple" : undefined);
        const prefab = pId ? this.prefabManager.get(pId) : undefined;
        if (prefab) {
          sObj = prefab.instantiate({ x: cObj.x, y: cObj.y, z: cObj.z }, this.arena);
          sObj.id = cObj.id;
          sObj.velocity.x = cObj.vx;
          sObj.velocity.y = cObj.vy;
          sObj.verticalVelocity = cObj.vz ?? 0;
          if (cObj.name !== undefined) sObj.name = cObj.name;
          if (cObj.color !== undefined) sObj.color = cObj.color;
          if (cObj.shape !== undefined) sObj.visualShape = cObj.shape;
          if (cObj.radius !== undefined) {
            sObj.colliderRadius = cObj.radius;
            if (sObj.consumableModule) {
              sObj.consumableModule.initialColliderRadius = cObj.radius;
            }
          }
          if (cObj.mass !== undefined) sObj.mass = cObj.mass;
          if (cObj.bounceMod !== undefined) sObj.bounceMod = cObj.bounceMod;
        } else {
          sObj = new GameObject({
            id: cObj.id,
            name: cObj.name || "Object",
            position: { x: cObj.x, y: cObj.y, z: cObj.z },
            mass: cObj.mass ?? 1.0,
            bounceMod: cObj.bounceMod ?? 0.0,
            color: cObj.color || "#38bdf8",
            colliderRadius: cObj.radius || 0.35,
            visualShape: cObj.shape || "circle",
            consumableModule: cObj.consumableTag
              ? new ConsumableModule({
                  tag: cObj.consumableTag,
                  totalEnergyJoules: cObj.totalEnergyJoules ?? 4000,
                  remainingEnergyJoules: cObj.remainingEnergyJoules ?? cObj.totalEnergyJoules ?? 4000,
                })
              : undefined,
          });
        }
        this.objects.push(sObj);
        this.arena.entities = [...this.allCharacters, ...this.objects];
      }

      // Synchronize consumable remaining energy from client stream (adopt client's consumed energy progression)
      if (sObj.consumableModule && cObj.remainingEnergyJoules !== undefined) {
        const curServerRemaining = sObj.consumableModule.getRemainingEnergy(sObj.properties);
        const clientRemaining = cObj.remainingEnergyJoules;
        if (sObj.isHeld) {
          if (clientRemaining < curServerRemaining) {
            const energyEaten = curServerRemaining - clientRemaining;
            const holder = (sObj.heldBy instanceof Character) ? sObj.heldBy : null;
            if (holder && holder.energyPool && holder.energyPool.enabled) {
              const curPool = holder.energyPool.getCurrentEnergy(holder.properties);
              const maxPool = holder.energyPool.getMaxEnergy(holder.properties);
              holder.energyPool.currentEnergyProp.set(Math.min(maxPool, curPool + energyEaten), holder.properties);
            }
            const healRate = sObj.consumableModule.getHealRate(sObj.properties);
            const consumeRate = sObj.consumableModule.getConsumeRate(sObj.properties);
            if (healRate > 0 && consumeRate > 0 && holder && holder.healthModule && holder.healthModule.enabled) {
              const secondsEaten = energyEaten / consumeRate;
              holder.healthModule.heal(healRate * secondsEaten, holder.properties, {
                id: "consumable_nutrition",
                name: sObj.consumableModule.tag ? `Consumable (${sObj.consumableModule.tag})` : "Consumable",
                type: "continuous",
                rate: healRate,
                color: "#22c55e",
                isHeal: true,
              });
            }
            sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
            const currentScale = sObj.consumableModule.getScale(sObj.properties);
            const initialRadius = sObj.consumableModule.initialColliderRadius || sObj.colliderRadius;
            sObj.colliderRadius = Math.max(sObj.consumableModule.minRadiusFloor, initialRadius * currentScale);
            if (sObj.colliderModule) sObj.colliderModule.radius = sObj.colliderRadius;
          } else if (Math.abs(clientRemaining - curServerRemaining) > 100) {
            sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
          }
        } else {
          sObj.consumableModule.remainingEnergyJoulesProp.set(clientRemaining, sObj.properties);
        }
      }

      // 1. Synchronize Held State
      if (cObj.isHeld) {
        const holderId = cObj.heldBy || senderClientId;
        const sChar = holderId
          ? (this.characters.get(holderId) || this.allCharacters.find((c) => c.playerId === holderId || c.id === holderId))
          : null;
        if (sChar) {
          // If the object is ALREADY held by another character on the server, reject client packet attempting to steal it!
          if (sObj.isHeld && sObj.heldBy && sObj.heldBy !== sChar) {
            continue;
          }
          sObj.isHeld = true;
          sObj.heldBy = sChar;
          sChar.heldObject = sObj;
          const relPos = sChar.calculateHeldObjectPosition(this.arena);
          sObj.position.x = relPos.x;
          sObj.position.y = relPos.y;
          sObj.position.z = relPos.z;
          sObj.velocity.x = sChar.velocity.x;
          sObj.velocity.y = sChar.velocity.y;
          sObj.verticalVelocity = 0;
        }
        continue;
      } else if (sObj.isHeld) {
        // Was held on server: only the character holding it can release it via their packet!
        const holderId = sObj.heldBy instanceof Character ? (sObj.heldBy.playerId || sObj.heldBy.id) : null;
        if (senderClientId && holderId && holderId !== senderClientId) {
          // Packet from another client who is NOT holding this object: DO NOT ungrab!
          continue;
        }
        sObj.isHeld = false;
        if (sObj.heldBy && sObj.heldBy instanceof Character) {
          sObj.heldBy.heldObject = null;
        }
        sObj.heldBy = null;

        // If the object being dropped/released was a consumed/depleted item, trigger authoritative deletion immediately!
        if (sObj.consumableModule && (sObj.consumableModule.isConsumed || sObj.consumableModule.getRemainingEnergy(sObj.properties) <= 0.001)) {
          this.triggerObjectDeletion(sObj.id);
          continue;
        }
      }

      // STRICT MULTIPLAYER AUTHORITY RULE:
      // Freebody objects in the arena (in flight, resting, rolling) are simulated authoritatively
      // by the 60Hz server engine. Non-holding clients CANNOT overwrite freebody position or velocity!
      // This completely eliminates cross-client tug-of-wars, delayed teleports, and settling desyncs.
      continue;
    }
  }

  /**
   * Synchronizes all authoritative server characters from client telemetry packets.
   */
  public syncCharactersFromPacket(clientChars: GhostEntityState[]): void {
    if (!Array.isArray(clientChars) || clientChars.length === 0) return;
    for (const c of clientChars) {
      this.syncCharacterFromPacket(c);
    }
  }

  /**
   * Synchronizes the authoritative server character from client telemetry packets.
   * Updates velocity and coordinates directly so the server player ghost stays locked to the client.
   * If a character is not yet registered on the server, dynamically instantiates it.
   */
  public syncCharacterFromPacket(clientChar: GhostEntityState): void {
    if (!clientChar) return;

    const charId = clientChar.id || "keyboard";
    const sChar = this.characters.get(charId);
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
    for (const pending of this.pendingDeathRespawnEvents.values()) {
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
        sChar.jump(this.arena, moveInput);
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
    // Note: client packets are NOT permitted to override the server's authoritative player color.

    // 4. Synchronize Held Object state
    // Authoritative Server Protection: A client cannot simply claim an object upon joining or telemetry.
    // An object is only kept held if the server's authoritative state already has it held by this character,
    // or if the client explicitly releases/drops an object it was holding.
    if (clientChar.heldObjectId) {
      const sObj = this.objects.find((o) => o.id === clientChar.heldObjectId);
      if (sObj && sObj.heldBy === sChar && sChar.heldObject === sObj) {
        // Keep synced with hands
        const relPos = sChar.calculateHeldObjectPosition(this.arena);
        sObj.position.x = relPos.x;
        sObj.position.y = relPos.y;
        sObj.position.z = relPos.z;
        sObj.velocity.x = sChar.velocity.x;
        sObj.velocity.y = sChar.velocity.y;
        sObj.verticalVelocity = 0;
      }
    } else if (sChar.heldObject && clientChar.isHolding === false) {
      const sObj = sChar.heldObject;
      if (sObj.consumableModule && (sObj.consumableModule.isConsumed || sObj.consumableModule.getRemainingEnergy(sObj.properties) <= 0.05)) {
        this.triggerObjectDeletion(sObj.id);
      } else {
        sObj.isHeld = false;
        sObj.heldBy = null;
        sChar.heldObject = null;
      }
    }
  }

  /**
   * Authoritatively processes high-priority reliable action commands (pickup, drop, throw).
   * Idempotent: Deduplicates actions so retransmissions are acknowledged without re-executing.
   */
  public processReliableActions(actions: ReliableActionCommand[]): string[] {
    const newlyAcked: string[] = [];

    for (const act of actions) {
      newlyAcked.push(act.actionId);
      if (!this.recentAckedActionIds.includes(act.actionId)) {
        this.recentAckedActionIds.push(act.actionId);
        if (this.recentAckedActionIds.length > 100) {
          this.recentAckedActionIds.shift();
        }
      }

      // Idempotency: skip if already processed
      if (this.processedActionIds.has(act.actionId)) {
        continue;
      }
      this.processedActionIds.add(act.actionId);
      if (this.processedActionIds.size > 2000) {
        const first = this.processedActionIds.values().next().value;
        if (first) this.processedActionIds.delete(first);
      }

      // Execute authoritative action
      let char = this.characters.get(act.playerId || "keyboard");
      if (!char && act.playerId) {
        char = this.allCharacters.find(
          (c) => c.playerId === act.playerId ||
                 c.playerId.endsWith(`:${act.playerId}`) ||
                 c.id === act.playerId
        );
      }
      if (!char) {
        char = this.allCharacters[0];
      }
      if (!char) continue;

      if (act.type === "pickup") {
        if (!char.heldObject && char.pickupModule && act.targetObjectId) {
          const target = this.objects.find((o) => o.id === act.targetObjectId);
          if (target && (!target.isHeld || target.heldBy === char)) {
            let itemToHold = target;
            if (target.spawnerModule && target.spawnerModule.enabled) {
              const clone = target.spawnerModule.triggerClone(target, this.arena, this.objects);
              if (clone) itemToHold = clone;
            }
            char.pickupModule.pickup(char, itemToHold);
            itemToHold.isHeld = true;
            itemToHold.heldBy = char;
            char.heldObject = itemToHold;

            if (this.onGrabResult) {
              this.onGrabResult({
                type: "grab_result",
                eventId: `grab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                tick: this.currentTick,
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
        const throwTarget = char.heldObject;
        if (throwTarget && char.throwModule) {
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
          char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            this.arena,
            undefined,
            undefined,
            act.isLockHeld ?? false,
            launchVel,
            launchPos
          );
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
          const candidates = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
          char.melee(this.arena, candidates, normDirX, normDirY);
        }
      }
    }

    return newlyAcked;
  }

  public getRecentAckedActionIds(): string[] {
    return [...this.recentAckedActionIds];
  }

  /**
   * Resolves contested grabs when multiple characters attempt to grab the same object on this tick (Phase 4.3).
   * Keeps active unacknowledged events in pendingContestedEvents until all involved clients acknowledge them.
   */
  private arbitrateContestedGrabs(
    grabRequests: { char: Character; target: GameObject; pkt: PlayerInputPacket }[]
  ): void {
    const results = ContestedGrabArbiter.arbitrate(grabRequests, this.currentTick, this.contestedGrabEvents, this.arena, this.objects);
    for (const res of results) {
      this.pendingContestedEvents.set(res.eventId, {
        event: res,
        createdTick: this.currentTick,
        acks: new Set<string>(),
      });
      if (this.onGrabResult) {
        this.onGrabResult({
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
  public acknowledgeContestedEvents(clientCharId: string, eventIds: string[]): void {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = this.pendingContestedEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);
        // Check if all involved parties (winner + all losers) have acknowledged
        const needed = [pending.event.winnerPlayerId, ...pending.event.loserPlayerIds];
        const allAcked = needed.every((pId) => pending.acks.has(pId));
        if (allAcked) {
          this.pendingContestedEvents.delete(id);
        }
      }
    }
  }

  /**
   * Returns all active unacknowledged contested grab events for broadcast.
   * Evicts expired events older than 180 ticks (3 seconds) to prevent infinite accumulation.
   */
  public getActiveContestedEvents(): ContestedGrabResult[] {
    const active: ContestedGrabResult[] = [];
    const nowTick = this.currentTick;
    for (const [id, record] of this.pendingContestedEvents.entries()) {
      if (nowTick - record.createdTick > 180) {
        // Expired after 3 seconds of continuous transmission
        this.pendingContestedEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }

  /**
   * Acknowledges that a client character has received and processed death & respawn events.
   */
  public acknowledgeDeathRespawnEvents(clientCharId: string, eventIds: string[]): void {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = this.pendingDeathRespawnEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);

        // Find target character and clear respawn lock immediately upon acknowledgment
        const targetChar = this.characters.get(pending.event.targetEntityId) ||
          Array.from(this.characters.values()).find(
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
          this.pendingDeathRespawnEvents.delete(id);
        } else {
          // Clean up once all registered connected players have acknowledged
          const allClientChars = Array.from(this.characters.keys()).filter((k) => k !== "dummy-1");
          const allAcked = allClientChars.length === 0 || allClientChars.every((cId) => pending.acks.has(cId));
          if (allAcked) {
            this.pendingDeathRespawnEvents.delete(id);
          }
        }
      }
    }
  }

  /**
   * Returns all active unacknowledged death respawn events for continuous broadcast.
   */
  public getActiveDeathRespawnEvents(): DeathRespawnEvent[] {
    const active: DeathRespawnEvent[] = [];
    const nowTick = this.currentTick;
    for (const [id, record] of this.pendingDeathRespawnEvents.entries()) {
      if (nowTick - record.createdTick > 300) {
        // Expired after 5 seconds of continuous retransmission
        this.pendingDeathRespawnEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }

  /**
   * Triggers an authoritative object deletion event broadcasted reliably until acknowledged.
   */
  public triggerObjectDeletion(objectId: string): void {
    this.deletedObjectIds.add(objectId);
    // Remove from simulation objects and arena
    const idx = this.objects.findIndex((o) => o.id === objectId);
    if (idx !== -1) {
      const obj = this.objects[idx];
      if (obj.heldBy && (obj.heldBy as Character).heldObject === obj) {
        (obj.heldBy as Character).heldObject = null;
      }
      obj.isHeld = false;
      obj.heldBy = null;
      this.objects.splice(idx, 1);
    }
    if (Array.isArray((this.arena as any).entities)) {
      const eIdx = (this.arena as any).entities.findIndex((e: any) => e.id === objectId);
      if (eIdx !== -1) {
        (this.arena as any).entities.splice(eIdx, 1);
      }
    }
    const eventId = `del_${objectId}_${this.currentTick}`;
    const event: ObjectDeletionEvent = {
      eventId,
      objectId,
      tick: this.currentTick,
    };
    this.pendingObjectDeletionEvents.set(eventId, {
      event,
      createdTick: this.currentTick,
      acks: new Set(),
    });
  }

  /**
   * Acknowledges that a client character has received and processed object deletion events.
   */
  public acknowledgeObjectDeletionEvents(clientCharId: string, eventIds: string[]): void {
    if (!eventIds || !Array.isArray(eventIds)) return;
    for (const id of eventIds) {
      const pending = this.pendingObjectDeletionEvents.get(id);
      if (pending) {
        pending.acks.add(clientCharId);
        const allClientChars = Array.from(this.characters.keys()).filter((k) => k !== "dummy-1");
        const allAcked = allClientChars.length === 0 || allClientChars.every((cId) => pending.acks.has(cId));
        if (allAcked) {
          this.pendingObjectDeletionEvents.delete(id);
        }
      }
    }
  }

  /**
   * Returns all active unacknowledged object deletion events for continuous broadcast.
   */
  public getActiveObjectDeletionEvents(): ObjectDeletionEvent[] {
    const active: ObjectDeletionEvent[] = [];
    const nowTick = this.currentTick;
    for (const [id, record] of this.pendingObjectDeletionEvents.entries()) {
      if (nowTick - record.createdTick > 300) {
        // Expired after 5 seconds of continuous retransmission
        this.pendingObjectDeletionEvents.delete(id);
      } else {
        active.push(record.event);
      }
    }
    return active;
  }

  /**
   * Applies exactly one tick of held-item use (eating) for a character.
   * Invariant: for player characters this is called once per real client input packet,
   * so the server credits exactly the same energy the client predicted.
   */
  private applyItemUse(char: Character, isUsing: boolean, dt: number): void {
    if (!isUsing || !char.consumeModule || !char.consumeModule.canConsume(char.heldObject)) return;
    const heldObj = char.heldObject!;
    const result = char.consumeModule.consume(dt, char, heldObj, this.objects, this.arena);
    if (result.isDepleted) {
      this.triggerObjectDeletion(heldObj.id);
    }
  }

  /**
   * Settles a consumable the client reports as fully eaten.
   * The client finishes eating up to (RTT/2 + jitter delay) before the server processes those
   * same input ticks, so any energy still left in the server's copy is energy the client already
   * ate. Credit it to the holder before deleting, otherwise that energy is silently lost.
   */
  public settleClientConsumedObject(serverCharId: string, objectId: string): void {
    const sChar = this.characters.get(serverCharId);
    const obj = this.objects.find((o) => o.id === objectId) || (sChar?.heldObject?.id === objectId ? sChar.heldObject : null);
    const holder = (obj && obj.heldBy instanceof Character) ? obj.heldBy : sChar;
    const isHolder = Boolean(holder && (
      holder === sChar ||
      holder.id === serverCharId ||
      holder.playerId === serverCharId ||
      (holder as any).serverCharId === serverCharId
    ));
    if (obj && holder && isHolder && obj.consumableModule) {
      const cm = obj.consumableModule;
      const remaining = cm.getRemainingEnergy(obj.properties);
      if (remaining > 0.001) {
        if (holder.energyPool && holder.energyPool.enabled) {
          const pool = holder.energyPool;
          const cur = pool.getCurrentEnergy(holder.properties);
          const max = pool.getMaxEnergy(holder.properties);
          pool.currentEnergyProp.set(Math.min(max, cur + remaining), holder.properties);
        }
        const healRate = cm.getHealRate(obj.properties);
        if (healRate > 0 && holder.healthModule && holder.healthModule.enabled) {
          const secondsLeft = remaining / cm.getConsumeRate(obj.properties);
          holder.healthModule.heal(healRate * secondsLeft, holder.properties, {
            id: "consumable_nutrition",
            name: cm.tag ? `Consumable (${cm.tag})` : "Consumable",
            type: "continuous",
            rate: healRate,
            color: "#22c55e",
            isHeal: true,
          });
        }
        cm.remainingEnergyJoulesProp.set(0, obj.properties);
      }
    }
    this.triggerObjectDeletion(objectId);
  }

  /**
   * Advances the authoritative simulation by 1 fixed physics tick.
   * Deterministically applies player inputs, freebody updates, and collision resolution.
   */
  public step(dt: number = this.fixedDt): WorldSnapshot {
    this.currentTick++;

    // 1. Synchronize active entities on arena
    this.arena.entities = [...this.allCharacters, ...this.objects];

    // 2. Consume queued inputs per character
    const grabRequests: { char: Character; target: GameObject; pkt: PlayerInputPacket }[] = [];
    const inputDrivenChars = new Set<Character>();

    for (const [pId, char] of this.characters) {
      // Consume input from the server jitter buffer (Phase 5.2)
      const { packet: pkt, drainedPackets, isStarved } = this.jitterBuffer.consume(pId, this.currentTick);
      inputDrivenChars.add(char);

      // Fast-forward movement / aim from drained burst packets so state stays synchronized with client stream
      for (const catchupPkt of drainedPackets) {
        char.updateCharacter(
          dt,
          { x: catchupPkt.moveX, y: catchupPkt.moveY },
          catchupPkt.isAiming,
          catchupPkt.aimX !== undefined && catchupPkt.aimY !== undefined ? { x: catchupPkt.aimX, y: catchupPkt.aimY } : null,
          this.arena,
          catchupPkt.isJumpHeld,
          this.arena.entities,
          catchupPkt.isLockHeld
        );

        if (catchupPkt.facingAngle !== undefined) {
          char.facingAngle = catchupPkt.facingAngle;
        }
        if (char.heldObject) {
          const heldPos = char.calculateHeldObjectPosition(this.arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
        // Every real client input is one client tick of eating, even when fast-forwarded
        this.applyItemUse(char, Boolean((catchupPkt as any).isUsingItem), dt);
      }

      if (pkt) {
        if ((pkt as any).isUsingItem !== undefined) {
          char.isUsingItem = Boolean((pkt as any).isUsingItem);
        } else if (!char.heldObject || !char.canConsumeHeldObject()) {
          char.isUsingItem = false;
        }
        if (char.isSprinting !== pkt.isSprinting) {
          char.setSprinting(pkt.isSprinting);
        }

        const aimTarget = pkt.aimX !== undefined && pkt.aimY !== undefined ? { x: pkt.aimX, y: pkt.aimY } : null;

        // Process dedicated Drop (Q / Y)
        if (pkt.isDrop && char.heldObject && char.pickupModule) {
          char.pickupModule.drop(char);
        }

        // Process dedicated Throw (RT / RB / Left Click)
        if (pkt.isThrow && char.heldObject && char.throwModule) {
          const aimX = aimTarget ? aimTarget.x : (pkt.aimX !== undefined ? pkt.aimX : (char.position.x + Math.cos(char.facingAngle) * 3));
          const aimY = aimTarget ? aimTarget.y : (pkt.aimY !== undefined ? pkt.aimY : (char.position.y + Math.sin(char.facingAngle) * 3));
          const launchVel = (pkt as any).launchVx !== undefined ? {
            vx: (pkt as any).launchVx,
            vy: (pkt as any).launchVy,
            vz: (pkt as any).launchVz ?? 0
          } : undefined;
          const launchPos = (pkt as any).launchStartX !== undefined ? {
            x: (pkt as any).launchStartX,
            y: (pkt as any).launchStartY,
            z: (pkt as any).launchStartZ ?? 0
          } : undefined;
          if (char.energyPool && launchVel) {
            const pool = char.energyPool;
            const heldMass = char.heldObject.hasMass ? Math.max(0.1, char.heldObject.mass) : 1.0;
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
          char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            this.arena,
            undefined,
            undefined,
            pkt.isLockHeld,
            launchVel,
            launchPos
          );
        }

        // Collect explicit grab requests for authoritative arbitration
        if (pkt.isGrabHeld && !char.heldObject && char.pickupModule) {
          const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
          let target: GameObject | null = null;
          if (pkt.grabTargetObjectId !== undefined) {
            // Explicit intent from client: only grab the exact requested object
            if (pkt.grabTargetObjectId !== null) {
              const explicitTarget = others.find((o) => o.id === pkt.grabTargetObjectId);
              if (explicitTarget && (!explicitTarget.isHeld || explicitTarget.heldBy === char)) {
                const maxReach = char.pickupModule.pickupReach * 1.35;
                const charZ = Math.max(char.position.z, char.supportingSurfaceHeight ?? 0);
                const targetZ = Math.max(explicitTarget.position.z, explicitTarget.supportingSurfaceHeight ?? 0);
                const dist3D = Math.hypot(
                  explicitTarget.position.x - char.position.x,
                  explicitTarget.position.y - char.position.y,
                  targetZ - charZ
                );
                if (dist3D <= maxReach) {
                  target = explicitTarget;
                }
              }
            }
          } else {
            // Fallback for legacy test harness packets
            const grabAimX = aimTarget ? aimTarget.x : char.position.x;
            const grabAimY = aimTarget ? aimTarget.y : char.position.y;
            target = char.pickupModule.findTargetObject(char, grabAimX, grabAimY, others, this.arena.wallHeight);
          }

          if (target && (!target.isHeld || target.heldBy === char)) {
            grabRequests.push({ char, target, pkt });
          }
        }

        // Laser inputs
        if (char.laserModule) {
          char.isLaserAiming = Boolean((pkt as any).isLaserAiming);
          char.isLaserFiring = Boolean((pkt as any).isLaserFiring);
          char.laserAimTarget = (pkt as any).laserAimX !== undefined
            ? { x: (pkt as any).laserAimX, y: (pkt as any).laserAimY }
            : null;
          char.laserPowerFraction = typeof (pkt as any).laserPowerFraction === "number"
            ? (pkt as any).laserPowerFraction
            : 1.0;
          char.laserCandidateEntities = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
        }

        // Melee inputs
        if (char.meleeModule) {
          char.isMeleeRequested = Boolean((pkt as any).isMeleeRequested);
          char.meleeAimDir = (pkt as any).meleeAimDirX !== undefined && (pkt as any).meleeAimDirY !== undefined
            ? { x: (pkt as any).meleeAimDirX, y: (pkt as any).meleeAimDirY }
            : ((pkt as any).meleeAimX !== undefined
              ? { x: (pkt as any).meleeAimX - char.position.x, y: (pkt as any).meleeAimY - char.position.y }
              : null);
          char.meleeCandidateEntities = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
        }

        // Integrate character movement & climbing
        char.updateCharacter(
          dt,
          { x: pkt.moveX, y: pkt.moveY },
          pkt.isAiming,
          aimTarget,
          this.arena,
          pkt.isJumpHeld,
          this.arena.entities,
          pkt.isLockHeld,
          (pkt as any).lockedAimPos ?? null
        );

        // Explicitly enforce facing angle sent by client packet (or locked target if active)
        if ((pkt as any).lockedAimPos) {
          const lPos = (pkt as any).lockedAimPos;
          const dx = lPos.x - char.position.x;
          const dy = lPos.y - char.position.y;
          if (Math.hypot(dx, dy) > 0.05) {
            char.facingAngle = Math.atan2(dy, dx);
          }
        } else if (pkt.facingAngle !== undefined) {
          char.facingAngle = pkt.facingAngle;
        }
        if (char.heldObject) {
          const heldPos = char.calculateHeldObjectPosition(this.arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
        // Starvation ticks are synthesized (no client tick happened), so they never eat
        if (!isStarved) {
          this.applyItemUse(char, char.isUsingItem, dt);
        }
      } else {
        // Neutral step for character without input packet this tick
        if (!char.heldObject || !char.canConsumeHeldObject()) {
          char.isUsingItem = false;
        }
        if (char.laserModule) {
          char.isLaserAiming = false;
          char.isLaserFiring = false;
          char.laserAimTarget = null;
        }
        if (char.meleeModule) {
          char.isMeleeRequested = false;
          char.meleeAimDir = null;
        }
        char.updateCharacter(dt, { x: 0, y: 0 }, false, null, this.arena, false, this.arena.entities, false);
      }
    }

    // 3. Resolve Contested Grabs authoritatively
    if (grabRequests.length > 0) {
      this.arbitrateContestedGrabs(grabRequests);
    }

    // 4. Update all freebody objects
    for (const obj of this.objects) {
      if (obj.isHeld && obj.heldBy && obj.heldBy instanceof Character) {
        const relPos = obj.heldBy.calculateHeldObjectPosition(this.arena);
        obj.position.x = relPos.x;
        obj.position.y = relPos.y;
        obj.position.z = relPos.z;
        obj.velocity.x = obj.heldBy.velocity.x;
        obj.velocity.y = obj.heldBy.velocity.y;
        obj.verticalVelocity = 0;
        continue;
      }
      obj.updatePosition(dt, this.arena);
      // Process health logic on objects that are not characters
      if (obj.healthModule && obj.healthModule.enabled && !obj.isCharacter) {
        obj.healthModule.update(dt, obj as any, this.arena);
      }
    }

    // 4b. Consumption for non-player characters (player characters eat per input packet above)
    for (const char of this.allCharacters) {
      if (!inputDrivenChars.has(char)) {
        this.applyItemUse(char, char.isUsingItem, dt);
      }
    }

    // 4c. Process Damage Aura emitters across all entities
    const allEntities = [...this.allCharacters, ...this.objects];
    for (const ent of allEntities) {
      if (ent.damageAuraModule && ent.damageAuraModule.enabled) {
        ent.damageAuraModule.update(dt, ent, this.arena);
      }
    }

    // 4d. Update background scene spawners (periodic item dispensing on authoritative server)
    this.sceneSpawnerManager.update(dt, this.arena, this.objects);

    // 4c. Process death respawns hook setup for characters
    for (const char of this.allCharacters) {
      if (char.healthModule && !char.healthModule.onDeathRespawn) {
        char.healthModule.onDeathRespawn = (entity, respawnPos) => {
          const charId = (entity as Character).playerId || (entity as any).serverCharId || entity.id;
          const eventId = `death-${charId}-${this.currentTick}`;
          this.pendingDeathRespawnEvents.set(eventId, {
            event: {
              eventId,
              targetEntityId: charId,
              tick: this.currentTick,
              respawnX: respawnPos.x,
              respawnY: respawnPos.y,
              respawnZ: respawnPos.z,
              maxHp: entity.healthModule ? entity.healthModule.getMaxHp(entity.properties) : 100,
            },
            createdTick: this.currentTick,
            acks: new Set<string>(),
          });
        };
      }
    }

    // 5. Deterministic collision resolution across all entities
    CollisionResolver.resolveEntityCollisions(
      [...this.allCharacters, ...this.objects],
      this.arena,
      dt,
      null,
      this.collisionMode
    );

    // 6. Update physical islands of influence & sleeping bodies
    this.islandManager.updateIslands(this.allCharacters, this.objects, this.currentTick, this.arena);

    // 6b. Phase 6.1: Periodic Server Buffer Depth Measurement & Clock Sync Evaluation
    if (this.currentTick % this.clockSyncCheckInterval === 0) {
      this.evaluateClockSync();
    }

    // 7. Capture authoritative world snapshot
    return SnapshotManager.capture(this.currentTick, this.allCharacters, this.objects, false);
  }

  /**
   * Generates a quantized, delta-compressed AuthoritativeWorldSnapshot for network broadcast (Phase 7).
   */
  public getAuthoritativeWorldSnapshot(forceKeyframe: boolean = false): AuthoritativeWorldSnapshot {
    return ServerTelemetryBroadcaster.createAuthoritativeWorldSnapshot(this, forceKeyframe);
  }

  /**
   * Produces a GhostSnapshot suitable for rendering or network broadcast.
   * Directly reflects the true physical state of the authoritative simulation.
   */
  public getGhostSnapshot(rttMs: number = 0, forPlayerId?: string): GhostSnapshot {
    return ServerTelemetryBroadcaster.createGhostSnapshot(
      this.currentTick,
      this.allCharacters,
      this.characters,
      this.objects,
      this.arena,
      this.latestClockSync,
      this.getRecentAckedActionIds(),
      this.getActiveContestedEvents(),
      rttMs,
      forPlayerId,
      this.getActiveDeathRespawnEvents(),
      this.getActiveObjectDeletionEvents(),
      this.prefabManager
    );
  }
}
