import { Arena } from "../engine/Arena.js";
import { GameObject } from "../engine/GameObject.js";
import { Character } from "../character/Character.js";
import { CollisionResolver } from "../engine/physics/CollisionResolver.js";
import { IslandManager } from "../engine/physics/IslandManager.js";
import { SnapshotManager, WorldSnapshot } from "../engine/physics/Snapshot.js";
import { PlayerInputPacket } from "../engine/physics/StateHistoryBuffer.js";
import { GhostSnapshot, GhostEntityState } from "../network/RelayClient.js";
import { RollModule } from "../engine/RollModule.js";

export interface ServerSimConfig {
  arenaWidth?: number;
  arenaHeight?: number;
  wallHeight?: number;
  collisionMode?: "dynamic" | "discrete" | "continuous" | "naive";
  fixedDt?: number;
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

  // Per-player input jitter queue
  private inputQueues: Map<string, PlayerInputPacket[]> = new Map();
  private lastKnownInputs: Map<string, PlayerInputPacket> = new Map();

  // Contested grab arbitration audit log
  public contestedGrabEvents: ContestedGrabResult[] = [];

  constructor(config?: ServerSimConfig) {
    const width = config?.arenaWidth ?? 20;
    const height = config?.arenaHeight ?? 14;
    const wallH = config?.wallHeight ?? 1.0;
    this.arena = new Arena(width, height, wallH);
    this.islandManager = new IslandManager();
    if (config?.collisionMode) this.collisionMode = config.collisionMode;
    if (config?.fixedDt) this.fixedDt = config.fixedDt;
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
  }

  /**
   * Enqueues an incoming input packet from a player into the server jitter buffer.
   */
  public queueInput(packet: PlayerInputPacket): void {
    const pId = packet.playerId;
    let queue = this.inputQueues.get(pId);
    if (!queue) {
      queue = [];
      this.inputQueues.set(pId, queue);
    }
    // De-duplicate if tick number is present
    if (packet.tick !== undefined) {
      if (queue.some((p) => p.tick === packet.tick)) {
        return;
      }
    }
    queue.push(packet);
    // Cap buffer depth to prevent runaway queues under severe network stall
    if (queue.length > 60) {
      queue.shift();
    }
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
      let pkt = this.inputQueues.get(pId)?.shift();
      if (pkt) {
        this.lastKnownInputs.set(pId, pkt);
      } else {
        // Queue is momentarily starved (inputs still traversing WAN relay).
        // Maintain directional steering across brief jitter, but release button presses!
        const last = this.lastKnownInputs.get(pId);
        pkt = last
          ? { ...last, isJumpHeld: false, isGrabHeld: false, isDrop: false, isThrow: false }
          : undefined;
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

        // Collect grab requests for authoritative arbitration
        if (pkt.isGrabHeld && !char.heldObject && char.pickupModule) {
          const others = [...this.allCharacters.filter((c) => c !== char), ...this.objects];
          const grabAimX = aimTarget ? aimTarget.x : char.position.x;
          const grabAimY = aimTarget ? aimTarget.y : char.position.y;
          const target = char.pickupModule.findTargetObject(char, grabAimX, grabAimY, others, this.arena.wallHeight);
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

    // 7. Capture authoritative world snapshot
    return SnapshotManager.capture(this.currentTick, this.allCharacters, this.objects, false);
  }

  /**
   * Produces a GhostSnapshot suitable for rendering or network broadcast.
   * Directly reflects the true physical state of the authoritative simulation.
   */
  public getGhostSnapshot(rttMs: number = 0): GhostSnapshot {
    const primaryChar = this.characters.get("keyboard") || this.allCharacters[0];

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
      color: primaryChar ? primaryChar.color : "#f59e0b",
      isClimbing: primaryChar ? primaryChar.isClimbing : false,
      isAboveWalls: primaryChar ? primaryChar.isAboveWalls : false,
    };

    const ghostObjects: GhostEntityState[] = this.objects.map((obj) => ({
      id: obj.id,
      name: obj.name,
      x: Number(obj.position.x.toFixed(3)),
      y: Number(obj.position.y.toFixed(3)),
      z: Number(obj.position.z.toFixed(3)),
      vx: Number(obj.velocity.x.toFixed(3)),
      vy: Number(obj.velocity.y.toFixed(3)),
      vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
      surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
      isGrounded: obj.isRestingOnSurface || obj.position.z <= 0.005,
      radius: obj.colliderRadius,
      color: obj.color,
      shape: obj.visualShape,
      isHeld: obj.isHeld,
      heldBy: obj.heldBy ? (obj.heldBy === primaryChar ? "player" : obj.heldBy.id) : null,
      isAboveWalls: obj.isAboveWalls,
    }));

    return {
      seq: this.currentTick,
      sentAt: performance.now(),
      receivedAt: performance.now(),
      rttMs,
      character: ghostChar,
      objects: ghostObjects,
    };
  }
}
