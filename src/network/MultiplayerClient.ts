import { Character } from "../character/Character.js";
import { GameObject, Vector2D } from "../engine/GameObject.js";
import { GameLoop } from "../engine/GameLoop.js";

export type MultiplayerStatus = "disconnected" | "connecting" | "connected" | "error";

export interface MultiplayerStats {
  status: MultiplayerStatus;
  url: string;
  pingMs: number;
  minPingMs: number;
  maxPingMs: number;
  avgPingMs: number;
  connectedPlayersCount: number;
  packetsSent: number;
  packetsReceived: number;
}

export interface RemotePlayerSnapshot {
  id: string;
  clientId: string;
  localId: string;
  playerNumber: number;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingAngle: number;
  isSprinting: boolean;
  isActivelyWalking: boolean;
  isClimbing: boolean;
  heldObjectId: string | null;
  isAiming: boolean;
  aimTarget: { x: number; y: number } | null;
}

export interface ObjectSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  mass: number;
  color: string;
  shape: "circle" | "box";
  isHeld: boolean;
  heldBy: string | null;
}

export interface TimedSnapshot {
  serverTick: number;
  timestamp: number;
  localReceiveTime: number;
  players: RemotePlayerSnapshot[];
  objects: ObjectSnapshot[];
}

export class MultiplayerClient {
  public status: MultiplayerStatus = "disconnected";
  public url: string = "";
  public clientId: string = "";
  public pingMs: number = 0;
  public minPingMs: number = Infinity;
  public maxPingMs: number = 0;
  public avgPingMs: number = 0;
  public totalPingMs: number = 0;
  public pingCount: number = 0;
  public packetsSent: number = 0;
  public packetsReceived: number = 0;
  public connectedPlayersCount: number = 0;

  // Remote characters spawned from other players in the universal lobby
  public remoteCharacters: Map<string, Character> = new Map();

  // Timestamp-spaced snapshot playback buffer for jitter-free interpolation
  public snapshotQueue: TimedSnapshot[] = [];
  public playbackTime: number = 0;
  public interpolationDelayMs: number = 75; // ~2.25 server broadcast frames for jitter absorption
  public isPlaybackInitialized: boolean = false;
  public lastRenderedServerTick: number = 0;

  private socket: WebSocket | null = null;
  private gameLoop: GameLoop | null = null;
  private clientTick: number = 0;
  private lastServerTick: number = 0;
  private pingInterval: any = null;
  private reconnectTimer: any = null;
  private isIntentionalDisconnect: boolean = false;

  // Tracking objects recently thrown or dropped locally to prevent stale server snapshots
  // from snapping them back into character hands before the server processes the release.
  private recentlyReleasedObjects: Map<string, number> = new Map();
  // Tracking objects recently picked up locally to prevent stale server snapshots (before the server confirms the pickup)
  // from forcibly dropping the item back to the ground.
  private recentlyPickedUpObjects: Map<string, number> = new Map();
  private pendingThrowEvents: Map<string, { objectId: string; startX?: number; startY?: number; startZ?: number; vx: number; vy: number; vz: number; targetX?: number; targetY?: number }> = new Map();
  private pendingDropEvents: Map<string, { objectId: string; startX?: number; startY?: number; startZ?: number; vx: number; vy: number; vz: number }> = new Map();

  public onStatsChange?: (stats: MultiplayerStats) => void;
  public onStatusChange?: (status: MultiplayerStatus, url: string) => void;
  public onInitState?: (msg: any) => void;

  constructor(gameLoop?: GameLoop) {
    this.gameLoop = gameLoop || null;
    this.determineDefaultUrl();

    window.addEventListener("beforeunload", () => {
      this.disconnect(true);
    });
  }


  public setGameLoop(gameLoop: GameLoop): void {
    this.gameLoop = gameLoop;
  }

  public determineDefaultUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws`;
    return this.url;
  }

  public connect(customUrl?: string): void {
    this.isIntentionalDisconnect = false;
    this.lastServerTick = 0;
    this.lastRenderedServerTick = 0;
    this.snapshotQueue = [];
    this.isPlaybackInitialized = false;
    this.playbackTime = 0;
    if (customUrl) {
      this.url = customUrl;
    } else if (!this.url) {
      this.determineDefaultUrl();
    }

    this.disconnect(false);
    this.status = "connecting";
    this.notifyStats();

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.status = "connected";
        this.notifyStats();
        this.startPing();
        this.syncAllLocalPlayers();
      };

      this.socket.onclose = () => {
        this.status = "disconnected";
        this.cleanupRemoteCharacters();
        this.notifyStats();
        if (!this.isIntentionalDisconnect) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), 3000);
        }
      };

      this.socket.onerror = () => {
        this.status = "error";
        this.notifyStats();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (e) {
      this.status = "error";
      this.notifyStats();
    }
  }

  public disconnect(intentional = true): void {
    this.isIntentionalDisconnect = intentional;
    clearInterval(this.pingInterval);
    clearTimeout(this.reconnectTimer);

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }

    this.cleanupRemoteCharacters();
    this.snapshotQueue = [];
    this.isPlaybackInitialized = false;
    this.playbackTime = 0;
    this.lastRenderedServerTick = 0;
    this.status = "disconnected";
    this.notifyStats();
  }

  /**
   * Binds onThrow and onDrop callbacks to a local character to send authoritative throw/drop actions
   */
  public bindCharacterCallbacks(localId: string, char: Character): void {
    char.onThrow = (thrownObj, vx, vy, vz, targetX, targetY) => {
      this.handleLocalPlayerThrow(localId, thrownObj, vx, vy, vz, targetX, targetY);
    };
    char.onDrop = (droppedObj) => {
      this.handleLocalPlayerDrop(localId, droppedObj);
    };
    char.onPickup = (pickedObj) => {
      this.handleLocalPlayerPickup(localId, pickedObj);
    };
  }

  public handleLocalPlayerPickup(
    localId: string,
    pickedObj: GameObject
  ): void {
    this.recentlyReleasedObjects.delete(pickedObj.id);
    this.recentlyPickedUpObjects.set(pickedObj.id, performance.now() + 1500);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendJson({
        type: "player_pickup",
        localId,
        objectId: pickedObj.id,
      });
    }
  }

  /**
   * Returns true if the object is in the optimistic-throw / optimistic-drop local simulation window.
   * Used by GameLoop to allow local physics integration for in-flight objects even in multiplayer mode.
   */
  public isObjectInOptimisticFlight(objId: string): boolean {
    const releaseUntil = this.recentlyReleasedObjects.get(objId);
    return releaseUntil !== undefined && performance.now() < releaseUntil;
  }

  public handleLocalPlayerThrow(
    localId: string,
    thrownObj: GameObject,
    vx: number,
    vy: number,
    vz: number,
    targetX?: number,
    targetY?: number
  ): void {
    // 2500ms TTL covers worst-case round-trip (server validates & confirms) plus interpolation delay
    this.recentlyReleasedObjects.set(thrownObj.id, performance.now() + 2500);
    this.recentlyPickedUpObjects.delete(thrownObj.id);
    const evt = {
      objectId: thrownObj.id,
      startX: thrownObj.position.x,
      startY: thrownObj.position.y,
      startZ: thrownObj.position.z,
      vx,
      vy,
      vz,
      targetX,
      targetY,
    };
    this.pendingThrowEvents.set(localId, evt);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendJson({
        type: "player_throw",
        localId,
        ...evt,
      });
    }
  }

  public handleLocalPlayerDrop(
    localId: string,
    droppedObj: GameObject
  ): void {
    this.recentlyReleasedObjects.set(droppedObj.id, performance.now() + 1500);
    this.recentlyPickedUpObjects.delete(droppedObj.id);
    const evt = {
      objectId: droppedObj.id,
      startX: droppedObj.position.x,
      startY: droppedObj.position.y,
      startZ: droppedObj.position.z,
      vx: droppedObj.velocity.x,
      vy: droppedObj.velocity.y,
      vz: droppedObj.verticalVelocity,
    };
    this.pendingDropEvents.set(localId, evt);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendJson({
        type: "player_drop",
        localId,
        ...evt,
      });
    }
  }

  /**
   * Registers a local player on this browser page with the authoritative server lobby.
   */
  public registerLocalPlayer(localId: string, name: string, color: string, playerNumber: number): void {
    if (this.gameLoop) {
      const entry = this.gameLoop.players.get(localId);
      if (entry && entry.character) {
        this.bindCharacterCallbacks(localId, entry.character);
      } else if (localId === "keyboard" && this.gameLoop.baseCharacter) {
        this.bindCharacterCallbacks(localId, this.gameLoop.baseCharacter);
      }
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.sendJson({
      type: "register_player",
      localId,
      name,
      color,
      playerNumber,
    });
  }


  /**
   * Unregisters a local player from the authoritative server lobby.
   */
  public unregisterLocalPlayer(localId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.sendJson({
      type: "unregister_player",
      localId,
    });
  }

  /**
   * Sends an updated wall map binary string to the server lobby.
   */
  public sendWallMapUpdate(wallMap: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.sendJson({
      type: "update_wall_map",
      wallMap,
    });
  }

  /**
   * Sends a single wall tile change to the server lobby.
   */
  public sendWallTileUpdate(col: number, row: number, isWall: boolean): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.sendJson({
      type: "update_wall_tile",
      col,
      row,
      isWall,
    });
  }

  /**
   * Called on every 60Hz physics tick to gather and transmit inputs for all local players on this page.
   */
  public updatePhysicsTick(
    localPlayers: Map<string, { id: string; character: Character; slotIndex?: number; isKeyboard: boolean }>,
    inputManager: any
  ): void {
    if (this.status !== "connected" || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.clientTick++;
    const inputsToSend: Array<{
      localId: string;
      moveVector: Vector2D;
      isGrabHeld: boolean;
      isThrowHeld: boolean;
      mousePos: Vector2D | null;
      isClimbHeld: boolean;
      isSprinting: boolean;
      heldObjectId: string | null;
      throwEvent?: { objectId: string; startX?: number; startY?: number; startZ?: number; vx: number; vy: number; vz: number; targetX?: number; targetY?: number } | null;
      dropEvent?: { objectId: string; startX?: number; startY?: number; startZ?: number; vx: number; vy: number; vz: number } | null;
    }> = [];


    for (const [key, entry] of localPlayers) {
      let moveVector: Vector2D = { x: 0, y: 0 };
      let isGrabHeld = false;
      let isThrowHeld = false;
      let mousePos: Vector2D | null = null;
      let isClimbHeld = false;
      let isSprinting = entry.character.isSprinting;
      const heldObjectId = entry.character.heldObject ? entry.character.heldObject.id : null;

      let isThrowCommitted = false;
      if (entry.isKeyboard) {
        if (inputManager.isKeyboardActive) {
          isThrowCommitted = performance.now() < (inputManager.throwCommitUntil ?? 0);
          moveVector = inputManager.movementVector;
          isGrabHeld = Boolean(inputManager.isGrabHeld) && !isThrowCommitted;
          isThrowHeld = Boolean(
            isThrowCommitted ||
            inputManager.justThrown ||
            (inputManager.isMouseDown && entry.character.heldObject && !inputManager.justPickedUp)
          );
          mousePos = inputManager.isCursorVisible ? inputManager.mousePos : null;
          isClimbHeld = Boolean(inputManager.isKeyboardJumpHeld);
          isSprinting = Boolean(inputManager.isKeyboardSprintActive);
          if (inputManager.justThrown) {
            inputManager.justThrown = false;
          }
        }
      } else if (entry.slotIndex !== undefined) {
        const slot = inputManager.gamepadSlots.get(entry.slotIndex);
        if (slot && slot.connected) {
          isThrowCommitted = slot.throwCommitUntil !== undefined && performance.now() < slot.throwCommitUntil;
          moveVector = slot.movementVector;
          isGrabHeld = Boolean(slot.isGrabHeld) && !isThrowCommitted;
          isThrowHeld = Boolean(slot.isThrowHeld || isThrowCommitted);
          mousePos = slot.aimPos;
          isClimbHeld = Boolean(slot.isClimbHeld);
          isSprinting = Boolean(slot.isSprintToggled);
        }
      }

      const throwEvt = this.pendingThrowEvents.get(key) || null;
      const dropEvt = this.pendingDropEvents.get(key) || null;
      // Retain throwEvt across frames until throw commit window completes to guarantee network delivery
      if (throwEvt && !isThrowCommitted) {
        this.pendingThrowEvents.delete(key);
      }
      if (dropEvt) {
        this.pendingDropEvents.delete(key);
      }

      inputsToSend.push({
        localId: key,
        moveVector,
        isGrabHeld,
        isThrowHeld,
        mousePos,
        isClimbHeld,
        isSprinting,
        heldObjectId,
        throwEvent: throwEvt,
        dropEvent: dropEvt,
      });
    }


    if (inputsToSend.length > 0) {
      this.sendJson({
        type: "player_input",
        tick: this.clientTick,
        timestamp: Date.now(),
        inputs: inputsToSend,
      });
      this.packetsSent++;
    }
  }

  private handleMessage(data: string): void {
    this.packetsReceived++;
    try {
      const msg = JSON.parse(data);
      if (!msg || !msg.type) return;

      if (msg.type === "pong") {
        const now = performance.now();
        const rtt = Math.max(0, now - msg.sentAt);
        this.pingMs = Math.round(rtt);
        if (this.pingMs < this.minPingMs) this.minPingMs = this.pingMs;
        if (this.pingMs > this.maxPingMs) this.maxPingMs = this.pingMs;
        this.totalPingMs += this.pingMs;
        this.pingCount++;
        this.avgPingMs = Math.round(this.totalPingMs / this.pingCount);
        this.notifyStats();
        return;
      }

      if (msg.type === "player_assigned") {
        const localEntry = this.gameLoop?.players.get(msg.localId);
        if (localEntry) {
          localEntry.playerNumber = msg.playerNumber;
          localEntry.color = msg.color;
          localEntry.name = msg.name;
          localEntry.character.playerNumber = msg.playerNumber;
          localEntry.character.playerColor = msg.color;
          localEntry.character.color = msg.color;
          localEntry.character.name = msg.name;
          this.gameLoop?.onPlayersChanged?.();
        }
        return;
      }

      if (msg.type === "init_state") {
        this.clientId = msg.clientId;
        this.lastServerTick = msg.serverTick || 0;
        if (msg.wallMap && this.gameLoop) {
          const allEnts = [...this.gameLoop.allCharacters, ...this.gameLoop.allObjects];
          this.gameLoop.arena.importWallMapBinaryString(msg.wallMap, allEnts);
        }
        this.queueSnapshot(msg.serverTick || 1, msg.timestamp || Date.now(), msg.players || [], msg.objects || []);
        if (this.onInitState) {
          this.onInitState(msg);
        }
        this.notifyStats();
        return;
      }

      if (msg.type === "wall_map_sync") {
        if (msg.wallMap && this.gameLoop) {
          const allEnts = [...this.gameLoop.allCharacters, ...this.gameLoop.allObjects];
          this.gameLoop.arena.importWallMapBinaryString(msg.wallMap, allEnts);
        }
        return;
      }

      if (msg.type === "world_state") {
        this.queueSnapshot(msg.serverTick, msg.timestamp, msg.players || [], msg.objects || []);
        return;
      }

      if (msg.type === "player_joined") {
        if (msg.player && msg.player.clientId !== this.clientId) {
          this.ensureRemoteCharacter(msg.player);
        }
        return;
      }

      if (msg.type === "player_left") {
        if (msg.playerId) {
          this.removeRemoteCharacter(msg.playerId);
        }
        return;
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Queues an incoming server snapshot in strict chronological order.
   * Discards messages that arrived too late or are older than the current render playback point.
   */
  public queueSnapshot(
    serverTick: number,
    timestamp: number,
    players: RemotePlayerSnapshot[],
    objects: ObjectSnapshot[]
  ): void {
    const now = Date.now();

    // 1. Discard messages received too late (> 400ms old)
    if (timestamp && now - timestamp > 400) {
      return;
    }

    // 2. Discard if message is older than what we've already rendered past
    if (this.lastRenderedServerTick > 0 && typeof serverTick === "number" && serverTick <= this.lastRenderedServerTick) {
      return;
    }

    // 3. Discard duplicate tick
    if (typeof serverTick === "number" && this.snapshotQueue.some((s) => s.serverTick === serverTick)) {
      return;
    }

    const snap: TimedSnapshot = {
      serverTick: serverTick || (this.snapshotQueue.length > 0 ? this.snapshotQueue[this.snapshotQueue.length - 1].serverTick + 1 : 1),
      timestamp: timestamp || now,
      localReceiveTime: performance.now(),
      players,
      objects,
    };

    // 4. Keep out-of-order snapshots in strict ascending order of serverTick / timestamp
    let inserted = false;
    for (let i = 0; i < this.snapshotQueue.length; i++) {
      if (snap.serverTick < this.snapshotQueue[i].serverTick) {
        this.snapshotQueue.splice(i, 0, snap);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.snapshotQueue.push(snap);
    }

    // Cap queue length to 30 snapshots (~1s), discarding oldest excess
    if (this.snapshotQueue.length > 30) {
      this.snapshotQueue.shift();
    }

    this.connectedPlayersCount = players.length;
    this.notifyStats();

    // Ensure remote character entities exist in gameLoop
    for (const sp of players) {
      if (sp.clientId !== this.clientId) {
        this.ensureRemoteCharacter(sp);
      }
    }

    // Ensure dynamic objects exist in gameLoop
    if (this.gameLoop) {
      for (const so of objects) {
        let localObj = this.gameLoop.allObjects.find((o) => o.id === so.id);
        if (!localObj) {
          localObj = new GameObject({
            id: so.id,
            name: so.name,
            position: { x: so.x, y: so.y, z: so.z },
            velocity: { x: so.vx, y: so.vy },
            verticalVelocity: so.vz,
            mass: so.mass,
            colliderRadius: so.radius,
            color: so.color,
            bounceMod: (so as any).bounceMod ?? 0.3,
            visualShape: so.shape,
          });
          this.gameLoop.objects.push(localObj);
          this.gameLoop.arena.syncEntitiesWithWalls([localObj]);
        }
      }
    }
  }

  /**
   * Advances the playback timeline and smoothly interpolates remote entities between
   * adjacent snapshots according to their timestamps, prioritizing smoothness over simultaneous accuracy.
   */
  public updatePlayback(dtSec: number): void {
    if (!this.gameLoop || this.snapshotQueue.length === 0) return;

    let dt = dtSec;
    if (isNaN(dt) || dt < 0) dt = 1 / 60;

    // 1. Initialize playback time if not yet started
    if (!this.isPlaybackInitialized) {
      const first = this.snapshotQueue[0];
      this.playbackTime = first.timestamp - this.interpolationDelayMs;
      this.isPlaybackInitialized = true;
    }

    // 2. Adjust playback speed slightly to maintain ideal buffer depth (absorbing network jitter)
    const newest = this.snapshotQueue[this.snapshotQueue.length - 1];
    let timeScale = 1.0;
    if (newest) {
      const bufferDepth = newest.timestamp - this.playbackTime;
      if (bufferDepth > 140) {
        // Buffer growing (burst arrived): gently accelerate playback by 6%
        timeScale = 1.06;
      } else if (bufferDepth < 50) {
        // Buffer starving (network delay): gently decelerate playback by 6% to prevent starving
        timeScale = 0.94;
      }
    }

    this.playbackTime += dt * 1000 * timeScale;

    // 3. Find surrounding snapshots S0 (<= playbackTime) and S1 (> playbackTime)
    let s0: TimedSnapshot | null = null;
    let s1: TimedSnapshot | null = null;

    for (let i = 0; i < this.snapshotQueue.length; i++) {
      if (this.snapshotQueue[i].timestamp <= this.playbackTime) {
        s0 = this.snapshotQueue[i];
      } else {
        s1 = this.snapshotQueue[i];
        break;
      }
    }

    // 4. Calculate interpolation factor alpha
    let alpha = 1.0;
    if (s0 && s1) {
      const span = s1.timestamp - s0.timestamp;
      alpha = span > 0 ? Math.max(0, Math.min(1, (this.playbackTime - s0.timestamp) / span)) : 1.0;
    } else if (!s0 && s1) {
      s0 = s1;
      alpha = 0;
      this.playbackTime = s1.timestamp;
    } else if (s0 && !s1) {
      // Starvation: playback reached newest snapshot, hold latest state smoothly
      alpha = 1.0;
    }

    if (!s0) return;

    const s0Players = new Map<string, RemotePlayerSnapshot>(s0.players.map((p) => [p.id, p]));
    const s1Players = s1 ? new Map<string, RemotePlayerSnapshot>(s1.players.map((p) => [p.id, p])) : s0Players;

    const s0Objects = new Map<string, ObjectSnapshot>(s0.objects.map((o) => [o.id, o]));
    const s1Objects = s1 ? new Map<string, ObjectSnapshot>(s1.objects.map((o) => [o.id, o])) : s0Objects;

    // 5. Smoothly interpolate Remote Characters
    const activeRemoteIds = new Set<string>();
    for (const [pId, p0] of s0Players) {
      if (p0.clientId === this.clientId) continue; // Local player predicted locally
      activeRemoteIds.add(pId);
      const p1 = s1Players.get(pId) || p0;
      const rChar = this.ensureRemoteCharacter(p1);

      // Smooth coordinates interpolation
      rChar.position.x = p0.x + (p1.x - p0.x) * alpha;
      rChar.position.y = p0.y + (p1.y - p0.y) * alpha;
      rChar.position.z = p0.z + (p1.z - p0.z) * alpha;
      rChar.velocity.x = p0.vx + (p1.vx - p0.vx) * alpha;
      rChar.velocity.y = p0.vy + (p1.vy - p0.vy) * alpha;
      rChar.verticalVelocity = p0.vz + (p1.vz - p0.vz) * alpha;

      // Shortest angular rotation
      let dTheta = (p1.facingAngle - p0.facingAngle) % (Math.PI * 2);
      if (dTheta < -Math.PI) dTheta += Math.PI * 2;
      if (dTheta > Math.PI) dTheta -= Math.PI * 2;
      rChar.facingAngle = p0.facingAngle + dTheta * alpha;

      rChar.setSprinting(alpha > 0.5 ? p1.isSprinting : p0.isSprinting);
      rChar.isActivelyWalking = alpha > 0.5 ? p1.isActivelyWalking : p0.isActivelyWalking;
      rChar.isClimbing = alpha > 0.5 ? p1.isClimbing : p0.isClimbing;
      rChar.isAiming = alpha > 0.5 ? p1.isAiming : p0.isAiming;
      rChar.aimTarget = p1.aimTarget || p0.aimTarget;

      // Wall elevation check for remote character
      const supWall = this.gameLoop.arena.getSupportingWall(rChar.position.x, rChar.position.y, rChar.colliderRadius);
      if (supWall && rChar.position.z >= supWall.wallHeight - 0.05) {
        rChar.supportingSurfaceHeight = supWall.wallHeight;
        (rChar as any).standingWall = supWall;
      } else {
        rChar.supportingSurfaceHeight = 0;
        (rChar as any).standingWall = null;
      }

      // Held object sync for remote character
      const heldObjId = alpha > 0.5 ? p1.heldObjectId : p0.heldObjectId;
      if (heldObjId) {
        const heldObj = this.gameLoop.allObjects.find((o) => o.id === heldObjId);
        if (heldObj) {
          rChar.heldObject = heldObj;
          heldObj.isHeld = true;
          heldObj.heldBy = rChar;
          const heldPos = rChar.calculateHeldObjectPosition(this.gameLoop.arena);
          heldObj.position.x = heldPos.x;
          heldObj.position.y = heldPos.y;
          heldObj.position.z = heldPos.z;
          heldObj.velocity.x = rChar.velocity.x;
          heldObj.velocity.y = rChar.velocity.y;
          heldObj.verticalVelocity = 0;
        }
      } else if (rChar.heldObject) {
        rChar.heldObject.isHeld = false;
        rChar.heldObject.heldBy = null;
        rChar.heldObject = null;
      }
    }

    // Remove any remote characters that left
    for (const [rId] of this.remoteCharacters) {
      if (!activeRemoteIds.has(rId)) {
        this.removeRemoteCharacter(rId);
      }
    }

    // 6. Smoothly interpolate Dynamic Objects
    for (const [oId, o0] of s0Objects) {
      const o1 = s1Objects.get(oId) || o0;
      const localObj = this.gameLoop.allObjects.find((o) => o.id === oId);
      if (!localObj) continue;

      const releaseUntil = this.recentlyReleasedObjects.get(localObj.id);
      const isRecentlyReleased = releaseUntil !== undefined && performance.now() < releaseUntil;
      const pickupUntil = this.recentlyPickedUpObjects.get(localObj.id);
      const isRecentlyPickedUp = pickupUntil !== undefined && performance.now() < pickupUntil;

      // If held by local player, let local player position it directly in hands
      const isHeldByLocalPlayer = Array.from(this.gameLoop.players.values()).some(
        (p) => p.character.heldObject === localObj || p.character === localObj.heldBy
      );

      if (isHeldByLocalPlayer && !isRecentlyReleased) {
        continue;
      }

      const isHeldByRemote =
        (o1.isHeld && o1.heldBy && !isHeldByLocalPlayer) ||
        (o0.isHeld && o0.heldBy && !isHeldByLocalPlayer);
      if (isHeldByRemote) {
        // Position attached via remote player hands above
        continue;
      }

      // Unheld dynamic object: smoothly interpolate coordinates between snapshots
      if (!isRecentlyReleased && !isRecentlyPickedUp) {
        localObj.isHeld = false;
        localObj.heldBy = null;
        localObj.position.x = o0.x + (o1.x - o0.x) * alpha;
        localObj.position.y = o0.y + (o1.y - o0.y) * alpha;
        localObj.position.z = o0.z + (o1.z - o0.z) * alpha;
        localObj.velocity.x = o0.vx + (o1.vx - o0.vx) * alpha;
        localObj.velocity.y = o0.vy + (o1.vy - o0.vy) * alpha;
        localObj.verticalVelocity = o0.vz + (o1.vz - o0.vz) * alpha;
      } else if (isRecentlyReleased) {
        // Optimistic throw / drop: local ballistic physics is running in GameLoop.
        // Only apply a gentle drift correction if server and client are far apart (> 1.2u),
        // to absorb cases where the server had a different release position.
        // Do NOT snap the position; preserve local momentum (smoothness over accuracy).
        const serverX = o1.x + (o0.x - o1.x) * (1 - alpha);
        const serverY = o1.y + (o0.y - o1.y) * (1 - alpha);
        const driftDist = Math.hypot(serverX - localObj.position.x, serverY - localObj.position.y);
        if (driftDist > 1.2) {
          // Soft 8% ease per playback step toward server confirmed position
          localObj.position.x += (serverX - localObj.position.x) * 0.08;
          localObj.position.y += (serverY - localObj.position.y) * 0.08;
        }
        // Once the server snapshot shows the object unheld, clear the optimistic lock early
        if (!o1.isHeld && !o0.isHeld) {
          localObj.isHeld = false;
          localObj.heldBy = null;
        }

        const supWall = this.gameLoop.arena.getSupportingWall(localObj.position.x, localObj.position.y, localObj.colliderRadius);
        if (supWall && localObj.position.z >= supWall.wallHeight - 0.05) {
          localObj.supportingSurfaceHeight = supWall.wallHeight;
          (localObj as any).standingWall = supWall;
        } else {
          localObj.supportingSurfaceHeight = 0;
          (localObj as any).standingWall = null;
        }
      }
    }

    // 7. Prune older snapshots from queue
    this.lastRenderedServerTick = s0.serverTick;
    const s0Idx = this.snapshotQueue.indexOf(s0);
    if (s0Idx > 0) {
      this.snapshotQueue.splice(0, s0Idx);
    }

    // 8. Reconcile Local Player (bias towards smoothness!)
    // Using the newest server snapshot, gently correct local character drift only if > 0.45u
    if (newest) {
      for (const sp of newest.players) {
        if (sp.clientId === this.clientId) {
          const localEntry = this.gameLoop.players.get(sp.localId);
          if (localEntry) {
            const lChar = localEntry.character;
            const driftDist = Math.hypot(sp.x - lChar.position.x, sp.y - lChar.position.y);
            // Deadzone: if within 0.45u, zero correction to preserve crisp, jitter-free local response
            if (driftDist > 0.45) {
              // Gentle 10% ease per tick (smoothness over simultaneous accuracy!)
              lChar.position.x += (sp.x - lChar.position.x) * 0.1;
              lChar.position.y += (sp.y - lChar.position.y) * 0.1;
            }
            const zDrift = Math.abs(sp.z - lChar.position.z);
            if (zDrift > 0.5) {
              lChar.position.z += (sp.z - lChar.position.z) * 0.1;
            }

            // Authoritative held object sync for local character
            if (sp.heldObjectId) {
              const releaseUntil = this.recentlyReleasedObjects.get(sp.heldObjectId);
              const isRel = releaseUntil !== undefined && performance.now() < releaseUntil;
              if (!isRel) {
                const heldObj = this.gameLoop.allObjects.find((o) => o.id === sp.heldObjectId);
                if (heldObj && lChar.heldObject !== heldObj) {
                  lChar.heldObject = heldObj;
                  heldObj.isHeld = true;
                  heldObj.heldBy = lChar;
                }
                this.recentlyPickedUpObjects.delete(sp.heldObjectId);
              }
            } else if (lChar.heldObject) {
              const releaseUntil = this.recentlyReleasedObjects.get(lChar.heldObject.id);
              const isRel = releaseUntil !== undefined && performance.now() < releaseUntil;
              const pickupUntil = this.recentlyPickedUpObjects.get(lChar.heldObject.id);
              const isPick = pickupUntil !== undefined && performance.now() < pickupUntil;
              if (!isRel && !isPick) {
                lChar.heldObject.isHeld = false;
                lChar.heldObject.heldBy = null;
                lChar.heldObject = null;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Backwards-compatible reconciliation method for test harnesses and direct invocations.
   */
  public reconcileWorldState(
    serverPlayers: RemotePlayerSnapshot[],
    serverObjects: ObjectSnapshot[],
    snapshotTimestamp?: number
  ): void {
    const tick = ++this.lastServerTick;
    this.queueSnapshot(tick, snapshotTimestamp || Date.now(), serverPlayers, serverObjects);
    this.updatePlayback(1 / 60);
  }


  private ensureRemoteCharacter(sp: RemotePlayerSnapshot): Character {
    let char = this.remoteCharacters.get(sp.id);
    if (!char) {
      char = new Character({
        name: sp.name,
        color: sp.color,
        x: sp.x,
        y: sp.y,
        mass: 1.2,
        strength: 1.0,
        playerNumber: sp.playerNumber,
        playerId: sp.id,
      });
      char.playerNumber = sp.playerNumber;
      char.playerColor = sp.color;
      char.color = sp.color;
      char.name = sp.name;

      this.remoteCharacters.set(sp.id, char);

      // Register remote character in GameLoop so it renders and collides
      if (this.gameLoop) {
        this.gameLoop.addRemoteCharacter(char);
      }
    }
    return char;
  }

  private removeRemoteCharacter(playerId: string): void {
    const char = this.remoteCharacters.get(playerId);
    if (char) {
      if (this.gameLoop) {
        this.gameLoop.removeRemoteCharacter(char);
      }
      this.remoteCharacters.delete(playerId);
    }
  }

  public cleanupRemoteCharacters(): void {
    if (this.gameLoop) {
      for (const char of this.remoteCharacters.values()) {
        this.gameLoop.removeRemoteCharacter(char);
      }
    }
    this.remoteCharacters.clear();
  }

  private syncAllLocalPlayers(): void {
    if (!this.gameLoop) return;
    for (const [key, entry] of this.gameLoop.players) {
      if (entry && entry.character) {
        this.bindCharacterCallbacks(key, entry.character);
      }
      this.registerLocalPlayer(key, entry.name, entry.color, entry.playerNumber);
    }
    if (this.gameLoop.baseCharacter) {
      this.bindCharacterCallbacks("keyboard", this.gameLoop.baseCharacter);
    }
  }


  private startPing(): void {
    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.sendJson({
          type: "ping",
          sentAt: performance.now(),
        });
      }
    }, 1500);
  }

  private sendJson(obj: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(obj));
      } catch (e) {
        // Ignore
      }
    }
  }

  private notifyStats(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.status, this.url);
    }
    if (this.onStatsChange) {
      this.onStatsChange({
        status: this.status,
        url: this.url,
        pingMs: this.pingMs,
        minPingMs: this.minPingMs === Infinity ? 0 : this.minPingMs,
        maxPingMs: this.maxPingMs,
        avgPingMs: this.avgPingMs,
        connectedPlayersCount: this.connectedPlayersCount,
        packetsSent: this.packetsSent,
        packetsReceived: this.packetsReceived,
      });
    }
  }
}
