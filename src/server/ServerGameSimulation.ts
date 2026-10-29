import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { CollisionResolver } from "../engine/physics/CollisionResolver.js";
import { IslandManager } from "../engine/physics/IslandManager.js";
import { SnapshotManager, WorldSnapshot } from "../engine/physics/Snapshot.js";
import { PlayerInputPacket, ReliableActionCommand } from "../engine/physics/StateHistoryBuffer.js";
import { GhostSnapshot, GhostEntityState, DeathRespawnEvent, ObjectDeletionEvent } from "../network/RelayClient.js";
import { SceneSpawnerManager } from "../engine/spawner/SceneSpawnerManager.js";
import { PrefabManager } from "../engine/prefab/PrefabManager.js";
import { ServerJitterBufferManager, JitterBufferStats, ClockSyncPacket } from "./ServerJitterBuffer.js";
import {
  AuthoritativeSnapshotManager,
  AuthoritativeWorldSnapshot,
} from "./AuthoritativeSnapshotManager.js";
import { ContestedGrabResult } from "./ContestedGrabArbiter.js";
import { ServerTelemetryBroadcaster } from "./ServerTelemetryBroadcaster.js";
import { WorldConfig } from "../config/WorldConfig.js";
import { ServerWorldInitializer } from "./sync/ServerWorldInitializer.js";
import { ServerEventQueueManager } from "./sync/ServerEventQueueManager.js";
import { ServerReliableActionProcessor } from "./sync/ServerReliableActionProcessor.js";
import { ServerCharacterSync } from "./sync/ServerCharacterSync.js";
import { ServerObjectSync } from "./sync/ServerObjectSync.js";

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
 * CollisionResolver, and IslandManager, and delegates initialization, event queues,
 * reliable actions, and telemetry sync to dedicated `src/server/sync/` modules.
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

  public initializeFromWorld(
    clientArena: Arena,
    clientCharacters: Character[],
    clientObjects: GameObject[]
  ): void {
    ServerWorldInitializer.initializeFromWorld(this, clientArena, clientCharacters, clientObjects);
  }

  public initializeDefaultScenario(): void {
    ServerWorldInitializer.initializeDefaultScenario(this);
  }

  public initializeFromConfig(config: WorldConfig): void {
    ServerWorldInitializer.initializeFromConfig(this, config);
  }

  /**
   * Enqueues an incoming input packet from a player into the server jitter buffer.
   * Also tracks client acknowledged server ticks (Phase 7.3) and pending throw guard window.
   */
  public queueInput(packet: PlayerInputPacket): boolean {
    if (packet.lastReceivedServerTick !== undefined) {
      const cur = this.clientAckedTicks.get(packet.playerId) ?? 0;
      if (packet.lastReceivedServerTick > cur) {
        this.clientAckedTicks.set(packet.playerId, packet.lastReceivedServerTick);
      }
    }
    const sChar = packet.playerId ? this.characters.get(packet.playerId) : undefined;
    if (packet.playerId && !sChar) {
      // In authoritative server mode, ignore input for unknown or unregistered characters
      return false;
    }
    if (sChar && packet.isThrow) {
      // Guard against raw telemetry unholding the object before the throw executes
      (sChar as any)._pendingThrowUntilMs = performance.now() + 250;
    }
    return this.jitterBuffer.push(packet);
  }

  public getClientAckedTick(playerId: string): number {
    return this.clientAckedTicks.get(playerId) ?? 0;
  }

  public getJitterStats(playerId: string): JitterBufferStats | null {
    return this.jitterBuffer.getStats(playerId);
  }

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
    if (!this.characters.has("keyboard")) {
      const syncPacket = this.jitterBuffer.evaluateClockSync("keyboard", this.currentTick);
      this.latestClockSync.set("keyboard", syncPacket);
    }
  }

  public getLatestClockSync(playerId: string): ClockSyncPacket | null {
    return this.latestClockSync.get(playerId) ?? null;
  }

  public syncObjectsFromPacket(clientObjects: GhostEntityState[], senderClientId?: string): void {
    ServerObjectSync.syncObjectsFromPacket(this, clientObjects, senderClientId);
  }

  public syncCharactersFromPacket(clientChars: GhostEntityState[]): void {
    ServerCharacterSync.syncCharactersFromPacket(this, clientChars);
  }

  public syncCharacterFromPacket(clientChar: GhostEntityState): void {
    ServerCharacterSync.syncCharacterFromPacket(this, clientChar);
  }

  public processReliableActions(actions: ReliableActionCommand[]): string[] {
    return ServerReliableActionProcessor.processReliableActions(
      this,
      actions,
      this.processedActionIds,
      this.recentAckedActionIds
    );
  }

  public getRecentAckedActionIds(): string[] {
    return [...this.recentAckedActionIds];
  }

  private arbitrateContestedGrabs(
    grabRequests: { char: Character; target: GameObject; pkt: PlayerInputPacket }[]
  ): void {
    ServerEventQueueManager.arbitrateContestedGrabs(this, grabRequests);
  }

  public acknowledgeContestedEvents(clientCharId: string, eventIds: string[]): void {
    ServerEventQueueManager.acknowledgeContestedEvents(this, clientCharId, eventIds);
  }

  public getActiveContestedEvents(): ContestedGrabResult[] {
    return ServerEventQueueManager.getActiveContestedEvents(this);
  }

  public acknowledgeDeathRespawnEvents(clientCharId: string, eventIds: string[]): void {
    ServerEventQueueManager.acknowledgeDeathRespawnEvents(this, clientCharId, eventIds);
  }

  public getActiveDeathRespawnEvents(): DeathRespawnEvent[] {
    return ServerEventQueueManager.getActiveDeathRespawnEvents(this);
  }

  public triggerObjectDeletion(objectId: string): void {
    ServerEventQueueManager.triggerObjectDeletion(this, objectId);
  }

  public acknowledgeObjectDeletionEvents(clientCharId: string, eventIds: string[]): void {
    ServerEventQueueManager.acknowledgeObjectDeletionEvents(this, clientCharId, eventIds);
  }

  public getActiveObjectDeletionEvents(): ObjectDeletionEvent[] {
    return ServerEventQueueManager.getActiveObjectDeletionEvents(this);
  }

  /**
   * Applies exactly one tick of held-item primary ability use (e.g. eating for consumables) for a character.
   */
  private applyItemUse(char: Character, isUsing: boolean, dt: number): void {
    if (!isUsing || !char.heldObject) return;
    const heldObj = char.heldObject;
    if (heldObj.hasPrimaryItemAbility?.()) {
      const res = heldObj.usePrimaryItemAbility(dt, char, this.objects, this.arena);
      if (res.isDepleted && !heldObj.consumableModule?.unlimited) {
        this.triggerObjectDeletion(heldObj.id);
      }
    } else if (char.consumeModule && char.consumeModule.canConsume(heldObj)) {
      const result = char.consumeModule.consume(dt, char, heldObj, this.objects, this.arena);
      if (result.isDepleted && !heldObj.consumableModule?.unlimited) {
        this.triggerObjectDeletion(heldObj.id);
      }
    }
  }

  public settleClientConsumedObject(serverCharId: string, objectId: string): void {
    ServerObjectSync.settleClientConsumedObject(this, serverCharId, objectId);
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
          const thrown = char.throwModule.throwHeldObject(
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
          if (thrown) {
            (char as any)._lastServerThrowTime = performance.now();
            (char as any)._pendingThrowUntilMs = 0;
          }
        }

        // Collect explicit grab requests for authoritative arbitration
        if (pkt.isGrabHeld && !char.heldObject && char.pickupModule) {
          const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
          let target: GameObject | null = null;
          if (pkt.grabTargetObjectId !== undefined) {
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
            const grabAimX = aimTarget ? aimTarget.x : char.position.x;
            const grabAimY = aimTarget ? aimTarget.y : char.position.y;
            target = char.pickupModule.findTargetObject(char, grabAimX, grabAimY, others, this.arena.wallHeight);
          }

          if (target && (!target.isHeld || target.heldBy === char)) {
            grabRequests.push({ char, target, pkt });
          }
        }

        // Process Swap Item (drop held object, then arbitrate grab excluding dropped object)
        if ((pkt as any).isSwap && char.pickupModule) {
          const dropped = char.heldObject;
          if (dropped) {
            char.pickupModule.drop(char);
          }
          const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects].filter((o) => o !== dropped);
          let target: GameObject | null = null;
          if (pkt.grabTargetObjectId && pkt.grabTargetObjectId !== dropped?.id) {
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
          } else {
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
          (char as any).laserStarvedTicks = 0;
          if ((pkt as any).laserAimX !== undefined && (pkt as any).laserAimY !== undefined) {
            char.laserAimTarget = { x: (pkt as any).laserAimX, y: (pkt as any).laserAimY };
          }
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
        if (!isStarved) {
          this.applyItemUse(char, char.isUsingItem, dt);
        }
      } else {
        // Neutral step for character without input packet this tick
        if (!char.heldObject || !char.canConsumeHeldObject()) {
          char.isUsingItem = false;
        }
        if (char.laserModule) {
          const starved = ((char as any).laserStarvedTicks ?? 0) + 1;
          (char as any).laserStarvedTicks = starved;
          if (starved > 8 || !char.isLaserFiring) {
            char.isLaserAiming = false;
            char.isLaserFiring = false;
            char.laserAimTarget = null;
          }
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
      if (obj.healthModule && obj.healthModule.enabled && !obj.isCharacter) {
        obj.healthModule.update(dt, obj as any, this.arena);
      }
    }

    // 4b. Consumption for non-player characters
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

    // 4e. Process death respawns hook setup for characters
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

  public getAuthoritativeWorldSnapshot(forceKeyframe: boolean = false): AuthoritativeWorldSnapshot {
    return ServerTelemetryBroadcaster.createAuthoritativeWorldSnapshot(this, forceKeyframe);
  }

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
