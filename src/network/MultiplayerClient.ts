import { Character } from "../character/Character.js";
import { Vector2D } from "../engine/GameObject.js";
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
  private pingInterval: any = null;
  private reconnectTimer: any = null;
  private isIntentionalDisconnect: boolean = false;

  public onStatsChange?: (stats: MultiplayerStats) => void;

  constructor(gameLoop?: GameLoop) {
    this.gameLoop = gameLoop || null;
    this.determineDefaultUrl();
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
   * Registers a local player on this browser page with the authoritative server lobby.
   */
  public registerLocalPlayer(localId: string, name: string, color: string, playerNumber: number): void {
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
    }> = [];

    for (const [key, entry] of localPlayers) {
      let moveVector: Vector2D = { x: 0, y: 0 };
      let isGrabHeld = false;
      let isThrowHeld = false;
      let mousePos: Vector2D | null = null;
      let isClimbHeld = false;
      let isSprinting = entry.character.isSprinting;

      if (entry.isKeyboard) {
        if (inputManager.isKeyboardActive) {
          moveVector = inputManager.movementVector;
          isGrabHeld = Boolean(inputManager.isGrabHeld);
          isThrowHeld = Boolean(inputManager.isMouseDown && entry.character.heldObject);
          mousePos = inputManager.isCursorVisible ? inputManager.mousePos : null;
          isClimbHeld = Boolean(inputManager.isKeyboardJumpHeld);
          isSprinting = Boolean(inputManager.isKeyboardSprintActive);
        }
      } else if (entry.slotIndex !== undefined) {
        const slot = inputManager.gamepadSlots.get(entry.slotIndex);
        if (slot && slot.connected) {
          moveVector = slot.movementVector;
          isGrabHeld = Boolean(slot.isGrabHeld);
          isThrowHeld = Boolean(slot.isThrowHeld);
          mousePos = slot.aimPos;
          isClimbHeld = Boolean(slot.isClimbHeld);
          isSprinting = Boolean(slot.isSprintToggled);
        }
      }

      inputsToSend.push({
        localId: key,
        moveVector,
        isGrabHeld,
        isThrowHeld,
        mousePos,
        isClimbHeld,
        isSprinting,
      });
    }

    if (inputsToSend.length > 0) {
      this.sendJson({
        type: "player_input",
        tick: this.clientTick,
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

      if (msg.type === "init_state") {
        this.clientId = msg.clientId;
        this.reconcileWorldState(msg.players || [], msg.objects || []);
        this.notifyStats();
        return;
      }

      if (msg.type === "world_state") {
        this.reconcileWorldState(msg.players || [], msg.objects || []);
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

  private reconcileWorldState(serverPlayers: RemotePlayerSnapshot[], serverObjects: ObjectSnapshot[]): void {
    this.connectedPlayersCount = serverPlayers.length;
    this.notifyStats();

    if (!this.gameLoop) return;

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
          if (driftDist > 0.4) {
            // Smoothly snap position towards authoritative server position
            lChar.position.x += (sp.x - lChar.position.x) * 0.4;
            lChar.position.y += (sp.y - lChar.position.y) * 0.4;
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
        rChar.position.z += (sp.z - rChar.position.z) * lerpFactor;
        rChar.velocity.x = sp.vx;
        rChar.velocity.y = sp.vy;
        rChar.facingAngle = sp.facingAngle;
        rChar.setSprinting(sp.isSprinting);
        rChar.isActivelyWalking = sp.isActivelyWalking;
        rChar.isClimbing = sp.isClimbing;
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
      const localObj = this.gameLoop.allObjects.find((o) => o.id === so.id);
      if (localObj) {
        // If not held by a local player, interpolate to server state
        const isHeldByLocal = localObj.heldBy && Array.from(this.gameLoop.players.values()).some(p => p.character === localObj.heldBy);
        if (!isHeldByLocal) {
          localObj.position.x += (so.x - localObj.position.x) * 0.4;
          localObj.position.y += (so.y - localObj.position.y) * 0.4;
          localObj.position.z += (so.z - localObj.position.z) * 0.4;
          localObj.velocity.x = so.vx;
          localObj.velocity.y = so.vy;
          localObj.isHeld = so.isHeld;
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
      this.registerLocalPlayer(key, entry.name, entry.color, entry.playerNumber);
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
