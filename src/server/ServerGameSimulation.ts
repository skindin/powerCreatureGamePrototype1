import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { CollisionResolver } from "../engine/physics/CollisionResolver.js";
import { IslandManager } from "../engine/physics/IslandManager.js";
import { SnapshotManager, WorldSnapshot } from "../engine/physics/Snapshot.js";
import { PlayerInputPacket, ReliableActionCommand } from "../engine/physics/StateHistoryBuffer.js";
import { GhostSnapshot, GhostEntityState } from "../network/RelayClient.js";
import { RollModule } from "../engine/RollModule.js";
import { ServerJitterBufferManager, JitterBufferStats, ClockSyncPacket } from "./ServerJitterBuffer.js";
import {
  AuthoritativeSnapshotManager,
  AuthoritativeWorldSnapshot,
} from "./AuthoritativeSnapshotManager.js";
import { PLAYER_COLORS } from "../engine/PlayerManager.js";

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

export interface ContestedGrabResult {
  tick: number;
  targetObjectId: string;
  winnerPlayerId: string;
  loserPlayerIds: string[];
  reason: "strength" | "proximity" | "id_priority";
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

  // Per-player input jitter buffer (Phase 5.2)
  public jitterBuffer: ServerJitterBufferManager;

  // Adaptive Clock Sync & Time Dilation (Phase 6)
  public latestClockSync: Map<string, ClockSyncPacket> = new Map();
  public clockSyncCheckInterval: number = 10; // Check every 10 ticks (6.1)

  // Authoritative Snapshot Broadcast & Delta Compression (Phase 7)
  public snapshotManager: AuthoritativeSnapshotManager;
  public clientAckedTicks: Map<string, number> = new Map(); // Client confirmed server ticks (7.3)

  // Contested grab arbitration audit log
  public contestedGrabEvents: ContestedGrabResult[] = [];

  // Reliable action deduplication & ACK tracking
  private processedActionIds: Set<string> = new Set();
  private recentAckedActionIds: string[] = [];

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
    // Generate Standard preset walls
    this.arena.loadWallPreset("standard");

    // Spawn player 1
    const player1 = new Character({
      x: 4.8,
      y: 7.0,
      color: "#f59e0b",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      playerId: "player-1",
      playerNumber: 1,
      name: "Server Player 1",
    });
    this.characters.set(player1.playerId, player1);

    // Spawn default freebody test objects
    this.objects = [
      new GameObject({
        id: "stone-1",
        name: "Light Blue Box",
        position: { x: 6.8, y: 4.4, z: 0 },
        mass: 0.7,
        colliderRadius: 0.26,
        color: "#38bdf8",
        bounceMod: 0.25,
        visualShape: "box",
      }),
      new GameObject({
        id: "boulder-1",
        name: "Heavy Red Box",
        position: { x: 7.0, y: 9.2, z: 0 },
        mass: 2.6,
        colliderRadius: 0.40,
        color: "#f87171",
        bounceMod: 0.05,
        visualShape: "box",
      }),
      new GameObject({
        id: "bouncy-1",
        name: "Super Bouncy Ball",
        position: { x: 5.2, y: 3.0, z: 0.6 },
        mass: 0.5,
        colliderRadius: 0.24,
        color: "#4ade80",
        bounceMod: 0.85,
        verticalVelocity: 1.0,
      }),
      new GameObject({
        id: "rolling-1",
        name: "Rolling Ball",
        position: { x: 13.6, y: 7.0, z: 0 },
        velocity: { x: 4.5, y: 1.5 },
        mass: 0.6,
        colliderRadius: 0.28,
        color: "#a855f7",
        bounceMod: 0.95,
        rollModule: new RollModule({
          rollResistance: 0.0,
          angularVelocity: { x: -1.5 / 0.28, y: 4.5 / 0.28, z: 0 },
        }),
      }),
    ];

    this.arena.syncEntitiesWithWalls([...this.allCharacters, ...this.objects]);
    this.jitterBuffer.clear();
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
      const pNum = this.characters.size + 1;
      const newChar = new Character({
        x: this.arena.width / 2,
        y: this.arena.height / 2,
        playerId: packet.playerId,
        playerNumber: pNum,
        name: `Player ${pNum}`,
      });
      this.characters.set(packet.playerId, newChar);
      this.arena.entities = [...this.allCharacters, ...this.objects];
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
      let sObj = this.objects.find((o) => o.id === cObj.id);
      if (!sObj) {
        sObj = new GameObject({
          id: cObj.id,
          name: cObj.name || "Object",
          position: { x: cObj.x, y: cObj.y, z: cObj.z },
          color: cObj.color || "#38bdf8",
          colliderRadius: cObj.radius || 0.35,
          visualShape: cObj.shape || "circle",
        });
        this.objects.push(sObj);
        this.arena.entities = [...this.allCharacters, ...this.objects];
      }

      // 1. Synchronize Held State
      if (cObj.isHeld) {
        const holderId = cObj.heldBy || senderClientId;
        const sChar = holderId
          ? (this.characters.get(holderId) || this.allCharacters.find((c) => c.playerId === holderId || c.id === holderId))
          : null;
        if (sChar) {
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
      }

      // If object is currently held on the server by ANYONE, do not let non-holders overwrite its position/velocity!
      if (sObj.isHeld) {
        continue;
      }

      // 2. Synchronize Sleeping / Resting State
      if (cObj.isSleeping) {
        sObj.position.x = cObj.x;
        sObj.position.y = cObj.y;
        sObj.position.z = cObj.z;
        sObj.putToSleep();
        continue;
      } else if (sObj.isSleeping) {
        sObj.wakeUp();
      }

      // 3. Synchronize Velocity AND Position directly from client telemetry
      sObj.position.x = cObj.x;
      sObj.position.y = cObj.y;
      sObj.position.z = cObj.z;
      sObj.velocity.x = cObj.vx;
      sObj.velocity.y = cObj.vy;
      sObj.verticalVelocity = cObj.vz ?? 0;

      // 4. Synchronize Roll Angular Velocity
      if (sObj.rollModule && cObj.angX !== undefined && cObj.angY !== undefined && cObj.angZ !== undefined) {
        sObj.rollModule.angularVelocity.x = cObj.angX;
        sObj.rollModule.angularVelocity.y = cObj.angY ?? 0;
        sObj.rollModule.angularVelocity.z = cObj.angZ ?? 0;
      }
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
    let sChar = this.characters.get(charId);

    if (!sChar) {
      // Dynamically instantiate and register the new player character on the server
      const pNum = this.characters.size + 1;
      const assignedColor = PLAYER_COLORS[(pNum - 1) % PLAYER_COLORS.length];
      sChar = new Character({
        x: clientChar.x,
        y: clientChar.y,
        color: assignedColor,
        colliderRadius: clientChar.radius || 0.44,
        mass: 1.2,
        strength: 1.0,
        playerId: charId,
        playerNumber: pNum,
        name: clientChar.name || `Player ${pNum}`,
      });
      this.characters.set(charId, sChar);
      this.arena.entities = [...this.allCharacters, ...this.objects];
    }

    // 1. Synchronize Linear and Vertical Velocity
    sChar.velocity.x = clientChar.vx;
    sChar.velocity.y = clientChar.vy;
    if (sChar.hasVerticalVelocity && clientChar.vz !== undefined) {
      sChar.verticalVelocity = clientChar.vz;
    }

    // 2. Synchronize Physical Coordinates directly
    sChar.position.x = clientChar.x;
    sChar.position.y = clientChar.y;
    sChar.position.z = clientChar.z;

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
    // Note: client packets are NOT permitted to override the server's authoritative player color.

    // 4. Synchronize Held Object state
    if (clientChar.heldObjectId) {
      const sObj = this.objects.find((o) => o.id === clientChar.heldObjectId);
      if (sObj) {
        sChar.heldObject = sObj;
        sObj.isHeld = true;
        sObj.heldBy = sChar;
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
      sObj.isHeld = false;
      sObj.heldBy = null;
      sChar.heldObject = null;
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
      const char = this.characters.get(act.playerId || "keyboard") || this.allCharacters[0];
      if (!char) continue;

      if (act.type === "pickup") {
        if (!char.heldObject && char.pickupModule && act.targetObjectId) {
          const target = this.objects.find((o) => o.id === act.targetObjectId);
          if (target && (!target.isHeld || target.heldBy === char)) {
            char.pickupModule.pickup(char, target);
          }
        }
      } else if (act.type === "drop") {
        if (char.heldObject && char.pickupModule) {
          char.pickupModule.drop(char);
        }
      } else if (act.type === "throw") {
        if (char.heldObject && char.throwModule) {
          const aimX = act.aimX ?? (char.position.x + Math.cos(char.facingAngle) * 3);
          const aimY = act.aimY ?? (char.position.y + Math.sin(char.facingAngle) * 3);
          char.throwModule.throwHeldObject(
            char,
            aimX,
            aimY,
            this.arena,
            undefined,
            undefined,
            act.isLockHeld ?? false
          );
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
   */
  private arbitrateContestedGrabs(
    grabRequests: { char: Character; target: GameObject; pkt: PlayerInputPacket }[]
  ): void {
    // Group requests by target object ID
    const targetGroups = new Map<string, { char: Character; target: GameObject; pkt: PlayerInputPacket }[]>();
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

      this.contestedGrabEvents.push({
        tick: this.currentTick,
        targetObjectId: objId,
        winnerPlayerId: winner.char.playerId,
        loserPlayerIds: losers.map((l) => l.char.playerId),
        reason,
      });

      // Winner claims the item; losers fail to grab
      winner.char.pickupModule?.pickup(winner.char, winner.target);
    }
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

    for (const [pId, char] of this.characters) {
      // Consume input from the server jitter buffer (Phase 5.2)
      const { packet: pkt, drainedPackets } = this.jitterBuffer.consume(pId, this.currentTick);

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
        if (char.activeTrajectory?.isAutoLocked && char.activeTrajectory.targetObject) {
          const dx = char.activeTrajectory.targetObject.position.x - char.position.x;
          const dy = char.activeTrajectory.targetObject.position.y - char.position.y;
          if (Math.hypot(dx, dy) > 0.05) {
            char.facingAngle = Math.atan2(dy, dx);
          }
        } else if (catchupPkt.facingAngle !== undefined) {
          char.facingAngle = catchupPkt.facingAngle;
        }
        if (char.heldObject) {
          const heldPos = char.calculateHeldObjectPosition(this.arena);
          char.heldObject.position.x = heldPos.x;
          char.heldObject.position.y = heldPos.y;
          char.heldObject.position.z = heldPos.z;
        }
      }

      if (pkt) {
        if (char.isSprinting !== pkt.isSprinting) {
          char.setSprinting(pkt.isSprinting);
        }

        const aimTarget = pkt.aimX !== undefined && pkt.aimY !== undefined ? { x: pkt.aimX, y: pkt.aimY } : null;

        // Process dedicated Drop (Q / Y)
        if (pkt.isDrop && char.heldObject && char.pickupModule) {
          char.pickupModule.drop(char);
        }

        // Process dedicated Throw (RT / RB / Left Click)
        if (pkt.isThrow && char.heldObject && char.throwModule && aimTarget) {
          char.throwModule.throwHeldObject(
            char,
            aimTarget.x,
            aimTarget.y,
            this.arena,
            undefined,
            undefined,
            pkt.isLockHeld
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
              if (explicitTarget) {
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

          if (target) {
            grabRequests.push({ char, target, pkt });
          }
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
          pkt.isLockHeld
        );

        // Explicitly enforce facing angle sent by client packet (or locked target if active)
        if (char.activeTrajectory?.isAutoLocked && char.activeTrajectory.targetObject) {
          const dx = char.activeTrajectory.targetObject.position.x - char.position.x;
          const dy = char.activeTrajectory.targetObject.position.y - char.position.y;
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
      } else {
        // Neutral step for empty-handed player
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
    const lastProcessedInputTick: { [playerId: string]: number } = {};
    for (const [pId] of this.characters) {
      const stats = this.jitterBuffer.getStats(pId);
      if (stats && stats.lastConsumedTick !== null) {
        lastProcessedInputTick[pId] = stats.lastConsumedTick;
      }
    }
    const primaryChar = this.characters.get("keyboard") || this.allCharacters[0];
    const targetPId = primaryChar ? primaryChar.playerId : "keyboard";
    const clockSync = this.latestClockSync.get(targetPId) || this.latestClockSync.get("keyboard") || undefined;

    return this.snapshotManager.createSnapshot(
      this.currentTick,
      this.allCharacters,
      this.objects,
      lastProcessedInputTick,
      this.getRecentAckedActionIds(),
      clockSync,
      forceKeyframe
    );
  }

  /**
   * Produces a GhostSnapshot suitable for rendering or network broadcast.
   * Directly reflects the true physical state of the authoritative simulation.
   */
  public getGhostSnapshot(rttMs: number = 0, forPlayerId?: string): GhostSnapshot {
    const primaryChar = this.characters.get("keyboard") || this.allCharacters[0];
    const targetPId = forPlayerId || (primaryChar ? primaryChar.playerId : "keyboard");
    const clockSync = this.latestClockSync.get(targetPId) || this.latestClockSync.get("keyboard");

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

    const ghostObjects: GhostEntityState[] = this.objects.map((obj) => {
      const holder = (obj.heldBy instanceof Character ? obj.heldBy : null) || this.allCharacters.find((c) => c.heldObject === obj);
      let posX = obj.position.x;
      let posY = obj.position.y;
      let posZ = obj.position.z;
      if ((obj.isHeld || holder) && holder) {
        const relPos = holder.calculateHeldObjectPosition(this.arena);
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

    const ghostCharacters: GhostEntityState[] = this.allCharacters.map((c) => ({
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
      seq: this.currentTick,
      sentAt: performance.now(),
      receivedAt: performance.now(),
      rttMs,
      character: ghostChar,
      characters: ghostCharacters,
      objects: ghostObjects,
      ackActionIds: this.getRecentAckedActionIds(),
      clockSync,
    };
  }
}
