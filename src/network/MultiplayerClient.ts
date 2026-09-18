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

  private socket: WebSocket | null = null;
  private gameLoop: GameLoop | null = null;
  private clientTick: number = 0;
  private lastServerTick: number = 0;
  private lastServerTimestamp: number = 0;
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

  public handleLocalPlayerThrow(
    localId: string,
    thrownObj: GameObject,
    vx: number,
    vy: number,
    vz: number,
    targetX?: number,
    targetY?: number
  ): void {
    this.recentlyReleasedObjects.set(thrownObj.id, performance.now() + 1500);
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
        if (msg.wallMap && this.gameLoop) {
          const allEnts = [...this.gameLoop.allCharacters, ...this.gameLoop.allObjects];
          this.gameLoop.arena.importWallMapBinaryString(msg.wallMap, allEnts);
        }
        this.reconcileWorldState(msg.players || [], msg.objects || []);
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
        const now = Date.now();
        if (typeof msg.serverTick === "number") {
          if (this.lastServerTick !== 0 && msg.serverTick < this.lastServerTick) {
            return; // Discard out-of-order older tick
          }
          this.lastServerTick = msg.serverTick;
        }
        if (typeof msg.timestamp === "number") {
          if (this.lastServerTimestamp !== 0 && msg.timestamp < this.lastServerTimestamp) {
            return; // Discard out-of-order older timestamp
          }
          if (now - msg.timestamp > 600) {
            return; // Discard snapshot delayed by > 600ms
          }
          this.lastServerTimestamp = msg.timestamp;
        }
        this.reconcileWorldState(msg.players || [], msg.objects || [], msg.timestamp);
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

  private reconcileWorldState(serverPlayers: RemotePlayerSnapshot[], serverObjects: ObjectSnapshot[], snapshotTimestamp?: number): void {
    this.connectedPlayersCount = serverPlayers.length;
    this.notifyStats();

    if (!this.gameLoop) return;

    const now = Date.now();
    const oneWayLatencyMs = snapshotTimestamp && snapshotTimestamp > 0
      ? Math.max(0, Math.min(200, (now - snapshotTimestamp)))
      : (this.pingMs > 0 ? this.pingMs / 2 : 25);
    const latencySec = oneWayLatencyMs / 1000;

    // 1. Reconcile remote characters (characters controlled by other browser tabs/devices)
    const activeRemoteIds = new Set<string>();

    for (const sp of serverPlayers) {
      if (sp.clientId === this.clientId) {
        // Local player: reconcile with deadzone check to preserve instant local feel (Pillar 3)
        const localEntry = this.gameLoop.players.get(sp.localId);
        if (localEntry) {
          const lChar = localEntry.character;
          const driftDist = Math.hypot(sp.x - lChar.position.x, sp.y - lChar.position.y);
          // If local prediction deviated significantly (e.g. unexpected collision with remote player)
          if (driftDist > 0.45) {
            // Smoothly snap position towards authoritative server position
            lChar.position.x += (sp.x - lChar.position.x) * 0.4;
            lChar.position.y += (sp.y - lChar.position.y) * 0.4;
          }
          // Vertical drift check
          const zDrift = Math.abs(sp.z - lChar.position.z);
          if (zDrift > 0.6) {
            lChar.position.z += (sp.z - lChar.position.z) * 0.4;
          }

          // Authoritative held object sync for local character
          if (sp.heldObjectId) {
            const releaseUntil = this.recentlyReleasedObjects.get(sp.heldObjectId);
            const isRecentlyReleased = releaseUntil !== undefined && performance.now() < releaseUntil;
            if (!isRecentlyReleased) {
              const heldObj = this.gameLoop.allObjects.find((o) => o.id === sp.heldObjectId);
              if (heldObj && lChar.heldObject !== heldObj) {
                lChar.heldObject = heldObj;
                heldObj.isHeld = true;
                heldObj.heldBy = lChar;
              }
              // Server confirmed pickup
              this.recentlyPickedUpObjects.delete(sp.heldObjectId);
            }
          } else if (lChar.heldObject) {
            const releaseUntil = this.recentlyReleasedObjects.get(lChar.heldObject.id);
            const isRecentlyReleased = releaseUntil !== undefined && performance.now() < releaseUntil;
            const pickupUntil = this.recentlyPickedUpObjects.get(lChar.heldObject.id);
            const isRecentlyPickedUp = pickupUntil !== undefined && performance.now() < pickupUntil;
            if (!isRecentlyReleased && !isRecentlyPickedUp) {
              lChar.heldObject.isHeld = false;
              lChar.heldObject.heldBy = null;
              lChar.heldObject = null;
            }
          }
        }
      } else {
        // Remote player: ensure remote character exists and update with interpolation
        activeRemoteIds.add(sp.id);
        const rChar = this.ensureRemoteCharacter(sp);
        // Smoothly interpolate remote character position & state
        const lerpFactor = 0.5;
        rChar.position.x += (sp.x - rChar.position.x) * lerpFactor;
        rChar.position.y += (sp.y - rChar.position.y) * lerpFactor;
        rChar.verticalVelocity = sp.vz;
        if (Math.abs(sp.z - rChar.position.z) > 0.05) {
          rChar.position.z += (sp.z - rChar.position.z) * 0.6;
        } else {
          rChar.position.z = sp.z;
        }
        rChar.velocity.x = sp.vx;
        rChar.velocity.y = sp.vy;
        rChar.facingAngle = sp.facingAngle;
        rChar.setSprinting(sp.isSprinting);
        rChar.isActivelyWalking = sp.isActivelyWalking;
        rChar.isClimbing = sp.isClimbing;
        rChar.isAiming = sp.isAiming;
        rChar.aimTarget = sp.aimTarget;

        // Support wall check for remote character
        const supWall = this.gameLoop.arena.getSupportingWall(rChar.position.x, rChar.position.y, rChar.colliderRadius);
        if (supWall && rChar.position.z >= supWall.wallHeight - 0.05) {
          rChar.supportingSurfaceHeight = supWall.wallHeight;
          (rChar as any).standingWall = supWall;
        } else {
          rChar.supportingSurfaceHeight = 0;
          (rChar as any).standingWall = null;
        }

        // Held object sync for remote character
        if (sp.heldObjectId) {
          const heldObj = this.gameLoop.allObjects.find((o) => o.id === sp.heldObjectId);
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
    }

    // Remove any remote characters that left the universal lobby
    for (const [rId] of this.remoteCharacters) {
      if (!activeRemoteIds.has(rId)) {
        this.removeRemoteCharacter(rId);
      }
    }

    // 2. Reconcile arena dynamic objects
    for (const so of serverObjects) {
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

      // Check if this object was recently thrown, dropped, or picked up locally
      const releaseUntil = this.recentlyReleasedObjects.get(localObj.id);
      const isRecentlyReleased = releaseUntil !== undefined && performance.now() < releaseUntil;
      const pickupUntil = this.recentlyPickedUpObjects.get(localObj.id);
      const isRecentlyPickedUp = pickupUntil !== undefined && performance.now() < pickupUntil;

      // If a remote player intercepted/picked up this object, clear the local release lock
      const isHeldByAnyLocalPlayer = Array.from(this.gameLoop.players.values()).some(
        (p) => p.character.id === so.heldBy || (p.character as any).playerId === so.heldBy
      );
      if (isRecentlyReleased && so.isHeld && so.heldBy && !isHeldByAnyLocalPlayer) {
        this.recentlyReleasedObjects.delete(localObj.id);
      }
      const activeRecentlyReleased = this.recentlyReleasedObjects.has(localObj.id) && performance.now() < (this.recentlyReleasedObjects.get(localObj.id) || 0);

      const localHolder = !activeRecentlyReleased
        ? Array.from(this.gameLoop.players.values()).find(
            (p) => p.character.heldObject === localObj || p.character === localObj.heldBy
          )
        : null;

      if (localHolder) {
        // Held by local player on this device
        localHolder.character.heldObject = localObj;
        localObj.isHeld = true;
        localObj.heldBy = localHolder.character;
        const heldPos = localHolder.character.calculateHeldObjectPosition(this.gameLoop.arena);
        localObj.position.x = heldPos.x;
        localObj.position.y = heldPos.y;
        localObj.position.z = heldPos.z;
        localObj.velocity.x = localHolder.character.velocity.x;
        localObj.velocity.y = localHolder.character.velocity.y;
        localObj.verticalVelocity = 0;
      } else if (so.isHeld && so.heldBy && !activeRecentlyReleased) {
        // Held by remote player
        if (!isRecentlyPickedUp) {
          localObj.isHeld = true;
          localObj.position.x = so.x;
          localObj.position.y = so.y;
          localObj.position.z = so.z;
          localObj.velocity.x = so.vx;
          localObj.velocity.y = so.vy;
          localObj.verticalVelocity = so.vz;
        }
      } else {
        // Free-standing on ground, wall top, or airborne in ballistic trajectory
        localObj.isHeld = false;
        localObj.heldBy = null;
        if (!activeRecentlyReleased && !isRecentlyPickedUp) {
          const serverSpeed = Math.hypot(so.vx, so.vy, so.vz);
          const localSpeed = Math.hypot(localObj.velocity.x, localObj.velocity.y, localObj.verticalVelocity);

          if (serverSpeed < 0.05 && localSpeed < 0.1) {
            // Object is at rest on both client and server:
            // Settle cleanly to authoritative server position and zero velocities to prevent micro-jitter
            const dx = so.x - localObj.position.x;
            const dy = so.y - localObj.position.y;
            const dz = so.z - localObj.position.z;
            const driftDist = Math.hypot(dx, dy, dz);
            if (driftDist > 0.03) {
              const settleLerp = driftDist > 0.4 ? 0.35 : 0.15;
              localObj.position.x += dx * settleLerp;
              localObj.position.y += dy * settleLerp;
              localObj.position.z += dz * settleLerp;
            }
            localObj.velocity.x = 0;
            localObj.velocity.y = 0;
            localObj.verticalVelocity = 0;
          } else {
            // Object is in motion (rolling, flying ballistic arc, sliding):
            // Forward-extrapolate the server's snapshot position by elapsed one-way latency
            const expectedX = so.x + so.vx * latencySec;
            const expectedY = so.y + so.vy * latencySec;
            const expectedZ = Math.max(0, so.z + so.vz * latencySec - (so.vz !== 0 ? 0.5 * 30.0 * latencySec * latencySec : 0));

            const dx = expectedX - localObj.position.x;
            const dy = expectedY - localObj.position.y;
            const dz = expectedZ - localObj.position.z;
            const driftDist = Math.hypot(dx, dy, dz);

            if (driftDist <= 0.35) {
              // Deadzone: local client simulation matches the latency-compensated server position within 0.35u.
              // NEVER tug the position backwards! Local simulation runs 100% fluidly and monotonically.
              const velDrift = Math.hypot(so.vx - localObj.velocity.x, so.vy - localObj.velocity.y, so.vz - localObj.verticalVelocity);
              if (velDrift > 0.6) {
                localObj.velocity.x += (so.vx - localObj.velocity.x) * 0.08;
                localObj.velocity.y += (so.vy - localObj.velocity.y) * 0.08;
                localObj.verticalVelocity += (so.vz - localObj.verticalVelocity) * 0.08;
              }
            } else if (driftDist <= 2.0) {
              // Moderate drift: gently pull toward latency-compensated expected position without jarring reversals
              const smoothLerp = 0.12;
              localObj.position.x += dx * smoothLerp;
              localObj.position.y += dy * smoothLerp;
              localObj.position.z += dz * smoothLerp;
              localObj.velocity.x += (so.vx - localObj.velocity.x) * 0.15;
              localObj.velocity.y += (so.vy - localObj.velocity.y) * 0.15;
              localObj.verticalVelocity += (so.vz - localObj.verticalVelocity) * 0.15;
            } else {
              // Significant desync (> 2.0u): snap strongly to authoritative state
              const snapLerp = 0.5;
              localObj.position.x += dx * snapLerp;
              localObj.position.y += dy * snapLerp;
              localObj.position.z += dz * snapLerp;
              localObj.velocity.x = so.vx;
              localObj.velocity.y = so.vy;
              localObj.verticalVelocity = so.vz;
            }
          }
        } else if (activeRecentlyReleased && !so.isHeld) {
          // Server has acknowledged release and is running parallel physics
          // Softly correct only if significant drift occurs (> 1.5u)
          const expectedX = so.x + so.vx * latencySec;
          const expectedY = so.y + so.vy * latencySec;
          const drift = Math.hypot(expectedX - localObj.position.x, expectedY - localObj.position.y, so.z - localObj.position.z);
          if (drift > 1.5) {
            localObj.position.x += (expectedX - localObj.position.x) * 0.15;
            localObj.position.y += (expectedY - localObj.position.y) * 0.15;
            localObj.position.z += (so.z - localObj.position.z) * 0.15;
          }
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

  private cleanupRemoteCharacters(): void {
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
