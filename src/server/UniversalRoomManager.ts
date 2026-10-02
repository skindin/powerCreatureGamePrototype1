if (typeof process !== "undefined" && process.env) {
  process.env.WS_NO_BUFFER_UTIL = "1";
  process.env.WS_NO_UTF_8_VALIDATE = "1";
}
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage, Server } from "node:http";
import { ServerGameSimulation } from "./ServerGameSimulation.js";
import { Character } from "../character/Character.js";
import { PLAYER_COLORS } from "../engine/PlayerManager.js";
import type { PlayerInputPacket, ReliableActionCommand } from "../engine/physics/StateHistoryBuffer.js";

export interface ClientCharacterEntry {
  localPlayerId: string;
  serverCharId: string;
  playerNumber: number;
  color: string;
  name: string;
  isDefaultPlaceholder?: boolean;
}

export interface ConnectedRoomClient {
  id: string;
  ws: WebSocket;
  characters: Map<string, ClientCharacterEntry>;
  lastPingMs: number;
  lastSeen: number;
  hasReceivedKeyboardInput?: boolean;
}

/**
 * UniversalRoomManager
 *
 * Dedicated, authoritative 60Hz WebSocket server on path '/ws'.
 * Completely separate from the local boomerang relay client.
 * Runs an independent ServerGameSimulation for real online multiplayer.
 */
export class UniversalRoomManager {
  private static instance: UniversalRoomManager | null = null;

  public simulation: ServerGameSimulation;
  public clients: Map<string, ConnectedRoomClient> = new Map();
  public isRunning = false;
  private needsMapReload: boolean = false;

  private loopInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastTimeHr: bigint = process.hrtime.bigint();
  private accumulator: number = 0;
  private readonly fixedDt: number = 1 / 60;

  constructor() {
    this.simulation = new ServerGameSimulation({
      broadcastRateHz: 60,
      deltaCompression: false,
    });
    this.simulation.initializeDefaultScenario();
  }

  public static getInstance(): UniversalRoomManager {
    if (!UniversalRoomManager.instance) {
      UniversalRoomManager.instance = new UniversalRoomManager();
      UniversalRoomManager.instance.start();
    }
    return UniversalRoomManager.instance;
  }

  /**
   * Attaches the WebSocket server to an existing Node.js HTTP server at path '/ws'.
   */
  public static attach(httpServer: Server): UniversalRoomManager {
    const manager = UniversalRoomManager.getInstance();
    const wss = new WebSocketServer({ noServer: true });

    httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
      try {
        const rawUrl = (req.url || "/").split("?")[0].replace(/\/+$/, "");
        const isWsPath = rawUrl === "/ws" || rawUrl.endsWith("/ws");
        if (isWsPath) {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        }
      } catch (err) {
        console.warn("[UniversalRoom] Upgrade error:", err);
      }
    });

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      manager.handleConnection(ws, req);
    });

    console.log("🌐 [UniversalRoom] Attached WebSocket server at /ws");
    return manager;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimeHr = process.hrtime.bigint();
    this.accumulator = 0;

    this.loopInterval = setInterval(() => {
      this.tick();
    }, 4);

    // Watchdog checking for silent / dropped connections every 1s
    this.heartbeatInterval = setInterval(() => {
      this.checkClientLiveness();
    }, 1000);

    console.log(`🌐 [UniversalRoom] Authoritative 60Hz physics world active. Ticks: #${this.simulation.currentTick}`);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Drops dead / silent clients whose connection was abruptly terminated
   * without a clean WebSocket close frame (e.g. WiFi cut, laptop sleep, crashed tab).
   */
  private checkClientLiveness(): void {
    const now = Date.now();
    const TIMEOUT_MS = 3500; // 3.5s of absolute silence = connection lost
    for (const [clientId, client] of Array.from(this.clients.entries())) {
      if (now - client.lastSeen > TIMEOUT_MS) {
        console.warn(
          `⚠️ [UniversalRoom] Connection lost for client ${clientId} (silent for ${now - client.lastSeen}ms). Evicting character immediately.`
        );
        try {
          client.ws.terminate();
        } catch (_) {}
        this.handleDisconnection(clientId);
      }
    }
  }

  private tick(): void {
    if (!this.isRunning) return;

    // Do not run physics simulation if room is empty
    if (this.clients.size === 0) {
      this.lastTimeHr = process.hrtime.bigint();
      this.accumulator = 0;
      return;
    }

    const nowHr = process.hrtime.bigint();
    const elapsedSec = Number(nowHr - this.lastTimeHr) / 1e9;
    this.lastTimeHr = nowHr;

    this.accumulator += Math.min(0.2, elapsedSec);

    while (this.accumulator >= this.fixedDt) {
      this.simulation.step(this.fixedDt);
      this.accumulator -= this.fixedDt;

      // Broadcast authoritative state at 60Hz to all connected clients
      this.broadcastSnapshot();
    }
  }

  private broadcastSnapshot(): void {
    if (this.clients.size === 0) return;

    const worldSnapshot = this.simulation.getAuthoritativeWorldSnapshot();

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          const snapshot = this.simulation.getGhostSnapshot(client.lastPingMs || 0);
          const clockSync = this.simulation.getLatestClockSync(clientId);
          if (clockSync) {
            snapshot.clockSync = clockSync;
          }

          const payload = JSON.stringify({
            type: "pc_server_snapshot",
            snapshot,
            worldSnapshot,
            playerCount: this.simulation.characters.size,
          });
          client.ws.send(payload);
        } catch (err) {
          console.warn(`[UniversalRoom] Failed to send snapshot to ${clientId}:`, err);
        }
      }
    }
  }

  public allocatePlayerNumber(): number {
    const used = new Set<number>();
    for (const char of this.simulation.characters.values()) {
      if (char.playerNumber && char.playerNumber > 0) {
        used.add(char.playerNumber);
      }
    }
    for (let i = 1; i <= 16; i++) {
      if (!used.has(i)) return i;
    }
    return this.simulation.characters.size + 1;
  }

  public resolveActionPlayerId(
    client: ConnectedRoomClient,
    act: ReliableActionCommand,
    fallbackServerCharId: string
  ): string {
    if (!act.playerId) return fallbackServerCharId;
    // 1. If act.playerId is directly a registered serverCharId for this client, preserve it!
    for (const charEntry of client.characters.values()) {
      if (act.playerId === charEntry.serverCharId) {
        return charEntry.serverCharId;
      }
    }
    // 2. If act.playerId matches a localPlayerId for this client (e.g. "gamepad-0" or "keyboard"), resolve to its serverCharId
    if (client.characters.has(act.playerId)) {
      return client.characters.get(act.playerId)!.serverCharId;
    }
    // 3. If act.playerId contains a colon (e.g. client_xxx:gamepad-0), check if client owns it
    if (act.playerId.startsWith(`${client.id}:`)) {
      return act.playerId;
    }
    return fallbackServerCharId;
  }

  /**
   * Trashes any memory of the online map the moment no players are connected.
   */
  public trashMapMemory(): void {
    console.log("🌐 [UniversalRoom] All players left. Trashing online map memory...");
    for (const obj of this.simulation.objects) {
      obj.isHeld = false;
      obj.heldBy = null;
    }
    for (const char of this.simulation.characters.values()) {
      char.cleanupBeforeRemoval();
    }
    this.simulation.characters.clear();
    this.simulation.objects = [];
    this.simulation.jitterBuffer.clear();
    this.simulation.arena.entities = [];
    this.accumulator = 0;
    this.needsMapReload = true;
    console.log("🌐 [UniversalRoom] Online map memory trashed cleanly.");
  }

  /**
   * Reloads the pristine default scenario when a player tries to connect to an empty room.
   */
  public reloadMap(): void {
    console.log("🌐 [UniversalRoom] Player connecting. Reloading fresh online map...");
    this.simulation.initializeDefaultScenario();
    // Remove placeholder player-1 so only real connecting players occupy slots
    if (this.simulation.characters.has("player-1")) {
      const p1 = this.simulation.characters.get("player-1");
      p1?.cleanupBeforeRemoval();
      this.simulation.characters.delete("player-1");
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
    this.lastTimeHr = process.hrtime.bigint();
    this.accumulator = 0;
    this.needsMapReload = false;
    console.log("🌐 [UniversalRoom] Fresh online map reloaded. Ready for players.");
  }

  public registerCharacter(
    client: ConnectedRoomClient,
    localPlayerId: string,
    name?: string
  ): ClientCharacterEntry {
    const existing = client.characters.get(localPlayerId);
    if (existing) {
      if (name && name.trim().length > 0 && !/^Player(\s+\d+)?$/i.test(name.trim()) && !/^Controller\s+#\d+$/i.test(name.trim())) {
        existing.name = name.trim();
        const sChar = this.simulation.characters.get(existing.serverCharId);
        if (sChar) {
          sChar.name = existing.name;
          sChar.hasCustomName = true;
        }
      }
      return existing;
    }

    const playerNumber = this.allocatePlayerNumber();
    const color = PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length];
    const serverCharId = localPlayerId === "keyboard"
      ? client.id
      : `${client.id}:${localPlayerId}`;
    
    const isExplicitCustom = Boolean(
      name &&
      name.trim().length > 0 &&
      !/^Player(\s+\d+)?$/i.test(name.trim()) &&
      !/^Controller\s+#\d+$/i.test(name.trim())
    );
    const charName = isExplicitCustom ? name!.trim() : `Player ${playerNumber}`;

    const spawnX = 4.8 + ((playerNumber - 1) % 4) * 1.6;
    const spawnY = 7.0 + Math.floor((playerNumber - 1) / 4) * 1.5;

    const character = new Character({
      x: spawnX,
      y: spawnY,
      color,
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      playerId: serverCharId,
      playerNumber,
      name: charName,
      hasCustomName: isExplicitCustom,
    });
    this.simulation.characters.set(serverCharId, character);
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];

    const entry: ClientCharacterEntry = {
      localPlayerId,
      serverCharId,
      playerNumber,
      color,
      name: charName,
    };
    client.characters.set(localPlayerId, entry);

    console.log(
      `🌐 [UniversalRoom] Acknowledged character: ${serverCharId} as P${playerNumber} (${color}, "${charName}") for client ${client.id}`
    );
    return entry;
  }

  public unregisterCharacter(client: ConnectedRoomClient, localPlayerId: string): void {
    const entry = client.characters.get(localPlayerId);
    if (!entry) return;

    client.characters.delete(localPlayerId);
    const sChar = this.simulation.characters.get(entry.serverCharId);
    if (sChar) {
      if (sChar.heldObject) {
        sChar.heldObject.isHeld = false;
        sChar.heldObject.heldBy = null;
        sChar.heldObject.wakeUp();
        sChar.heldObject = null;
      }
      sChar.cleanupBeforeRemoval();
      this.simulation.characters.delete(entry.serverCharId);
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
    this.simulation.jitterBuffer.clear(entry.serverCharId);
    this.simulation.latestClockSync.delete(entry.serverCharId);
    this.simulation.clientAckedTicks.delete(entry.serverCharId);
    console.log(`🌐 [UniversalRoom] Character removed: ${entry.serverCharId} from client ${client.id}`);

    // Broadcast removal to remaining clients immediately
    const leftPayload = JSON.stringify({
      type: "player_left",
      clientId: client.id,
      removedCharIds: [entry.serverCharId],
      playerCount: this.simulation.characters.size,
    });
    for (const other of this.clients.values()) {
      if (other.ws.readyState === WebSocket.OPEN) {
        try {
          other.ws.send(leftPayload);
        } catch (_) {}
      }
    }
    this.broadcastSnapshot();
  }

  public handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    // If room was empty or needs reload, reload fresh map immediately
    if (this.needsMapReload || this.clients.size === 0) {
      this.reloadMap();
    }

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const client: ConnectedRoomClient = {
      id: clientId,
      ws,
      characters: new Map(),
      lastPingMs: 0,
      lastSeen: Date.now(),
    };
    this.clients.set(clientId, client);

    console.log(`🌐 [UniversalRoom] Client connected: ${clientId} (Total clients in room: ${this.clients.size})`);

    // Remove dummy placeholder character if present
    if (this.simulation.characters.has("player-1")) {
      const p1 = this.simulation.characters.get("player-1");
      p1?.cleanupBeforeRemoval();
      this.simulation.characters.delete("player-1");
    }

    // Register initial default player for this connection
    const primaryEntry = this.registerCharacter(client, "keyboard");
    primaryEntry.isDefaultPlaceholder = true;

    // Listen for incoming messages
    ws.on("message", (raw) => {
      try {
        client.lastSeen = Date.now();
        const text = raw.toString();
        const data = JSON.parse(text);

        if (data.type === "leave_room") {
          this.handleDisconnection(clientId);
          try { ws.close(); } catch (_) {}
          return;
        }

        if (data.type === "join_room") {
          // If the client provided a list of local players already active on their machine
          if (Array.isArray(data.localPlayers) && data.localPlayers.length > 0) {
            const requestedLocalIds = new Set(data.localPlayers.map((lp: any) => lp.localPlayerId).filter(Boolean));
            // Prune any characters that were created as temporary default but not requested by this client
            for (const localId of Array.from(client.characters.keys())) {
              if (!requestedLocalIds.has(localId)) {
                this.unregisterCharacter(client, localId);
              }
            }
            for (const lp of data.localPlayers) {
              if (lp.localPlayerId) {
                const reg = this.registerCharacter(client, lp.localPlayerId, lp.name);
                if (lp.localPlayerId !== "keyboard") {
                  reg.isDefaultPlaceholder = false;
                }
              }
            }
          } else {
            // Default: ensure "keyboard" is registered
            if (!client.characters.has("keyboard")) {
              this.registerCharacter(client, "keyboard", data.name);
            } else if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
              const entry = client.characters.get("keyboard")!;
              if (!/^Player(\s+\d+)?$/i.test(data.name.trim()) && !/^Controller\s+#\d+$/i.test(data.name.trim())) {
                entry.name = data.name.trim();
                const sChar = this.simulation.characters.get(entry.serverCharId);
                if (sChar) {
                  sChar.name = entry.name;
                  sChar.hasCustomName = true;
                }
              }
            }
          }

          const primary = client.characters.get("keyboard") || client.characters.values().next().value || primaryEntry;

          ws.send(JSON.stringify({
            type: "room_joined",
            clientId,
            playerNumber: primary.playerNumber,
            name: primary.name,
            color: primary.color,
            registeredPlayers: Array.from(client.characters.values()),
            arena: {
              width: this.simulation.arena.width,
              height: this.simulation.arena.height,
              wallHeight: this.simulation.arena.wallHeight,
              tileGrid: this.simulation.arena.tileGrid,
            },
            worldSnapshot: this.simulation.getAuthoritativeWorldSnapshot(),
          }));
          return;
        }

        if (data.type === "add_player") {
          const localPlayerId = data.localPlayerId || `player-${client.characters.size + 1}`;

          // If this client currently only has the initial unsteered "keyboard" placeholder,
          // and is adding a non-keyboard device (e.g. "gamepad-0"), unregister the placeholder "keyboard"
          // so the client's actual controller cleanly claims the slot without leaving a phantom behind!
          const kbEntry = client.characters.get("keyboard");
          if (
            localPlayerId !== "keyboard" &&
            kbEntry &&
            kbEntry.isDefaultPlaceholder &&
            !client.hasReceivedKeyboardInput &&
            client.characters.size === 1
          ) {
            console.log(`🌐 [UniversalRoom] Replacing unused default placeholder "keyboard" with first real player "${localPlayerId}" for client ${clientId}`);
            this.unregisterCharacter(client, "keyboard");
          }

          const entry = this.registerCharacter(client, localPlayerId, data.name);
          entry.isDefaultPlaceholder = false;
          ws.send(JSON.stringify({
            type: "player_added",
            localPlayerId: entry.localPlayerId,
            serverCharId: entry.serverCharId,
            playerNumber: entry.playerNumber,
            color: entry.color,
            name: entry.name,
          }));
          return;
        }

        if (data.type === "remove_player") {
          const localPlayerId = data.localPlayerId;
          if (localPlayerId) {
            this.unregisterCharacter(client, localPlayerId);
            ws.send(JSON.stringify({
              type: "player_removed",
              localPlayerId,
            }));
          }
          return;
        }

        if (data.type === "player_input" && data.packet) {
          const localPlayerId = data.localPlayerId || "keyboard";
          let charEntry = client.characters.get(localPlayerId);
          if (!charEntry) {
            if (client.characters.size === 0) {
              charEntry = this.registerCharacter(client, localPlayerId, data.character?.name);
            } else {
              // Ignore packets for unmapped/unregistered local players on this client to prevent ghost characters
              return;
            }
          }
          const serverCharId = charEntry.serverCharId;

          const pkt = data.packet as PlayerInputPacket;
          pkt.playerId = serverCharId;

          // Track if keyboard has sent active input
          if (localPlayerId === "keyboard") {
            if (pkt.moveX !== 0 || pkt.moveY !== 0 || pkt.isJumpHeld || pkt.isGrabHeld || pkt.isAiming) {
              charEntry.isDefaultPlaceholder = false;
              client.hasReceivedKeyboardInput = true;
            }
          }

          const sChar = this.simulation.characters.get(serverCharId);
          if (sChar && pkt.playerName && pkt.playerName !== sChar.name) {
            // Only adopt explicit custom name from packet, never overwrite with default template name
            if (!/^Player(\s+\d+)?$/i.test(pkt.playerName.trim()) && !/^Controller\s+#\d+$/i.test(pkt.playerName.trim())) {
              sChar.name = pkt.playerName.trim();
              sChar.hasCustomName = true;
              charEntry.name = pkt.playerName.trim();
            }
          }

          this.simulation.queueInput(pkt);

          // Process reliable actions FIRST before syncCharacterFromPacket clears heldObject
          if (Array.isArray(data.reliableActions) && data.reliableActions.length > 0) {
            for (const act of data.reliableActions) {
              act.playerId = this.resolveActionPlayerId(client, act, serverCharId);
            }
            this.simulation.processReliableActions(data.reliableActions);
          }

          if (data.character) {
            data.character.id = serverCharId;
            if (sChar) {
              data.character.name = sChar.name;
              data.character.color = sChar.color;
            }
            this.simulation.syncCharacterFromPacket(data.character);
          }

          if (Array.isArray(data.objects) && data.objects.length > 0) {
            this.simulation.syncObjectsFromPacket(data.objects, serverCharId);
          }
          return;
        }

        if (data.type === "reliable_action" && data.action) {
          const localPlayerId = data.localPlayerId || "keyboard";
          const charEntry = client.characters.get(localPlayerId);
          const fallbackServerCharId = charEntry ? charEntry.serverCharId : (data.serverCharId || clientId);

          const act = data.action as ReliableActionCommand;
          act.playerId = this.resolveActionPlayerId(client, act, fallbackServerCharId);
          this.simulation.processReliableActions([act]);
          return;
        }

        if (data.type === "rename_player") {
          if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            const trimmed = data.name.trim();
            const localPlayerId = data.localPlayerId || "keyboard";
            let charEntry = client.characters.get(localPlayerId);
            if (!charEntry) {
              charEntry = client.characters.get("keyboard") || client.characters.values().next().value;
            }
            if (charEntry) {
              charEntry.name = trimmed;
              const sChar = this.simulation.characters.get(charEntry.serverCharId);
              if (sChar) sChar.name = trimmed;
            } else if (data.serverCharId) {
              const sChar = this.simulation.characters.get(data.serverCharId);
              if (sChar) sChar.name = trimmed;
            }
            this.broadcastSnapshot();
          }
          return;
        }

        if (data.type === "ping") {
          if (typeof data.clientTimestamp === "number") {
            client.lastPingMs = Math.max(1, Math.round(performance.now() - data.clientTimestamp));
          }
          ws.send(JSON.stringify({
            type: "pong",
            clientTimestamp: data.clientTimestamp,
            serverTick: this.simulation.currentTick,
          }));
          return;
        }
      } catch (err) {
        console.warn(`[UniversalRoom] Error handling packet from ${clientId}:`, err);
      }
    });

    ws.on("close", () => {
      this.handleDisconnection(clientId);
    });

    ws.on("error", (err) => {
      console.warn(`[UniversalRoom] Socket error for ${clientId}:`, err.message);
      this.handleDisconnection(clientId);
    });

    // Send immediate welcome packet
    ws.send(JSON.stringify({
      type: "room_welcome",
      clientId,
      playerNumber: primaryEntry.playerNumber,
      name: primaryEntry.name,
      color: primaryEntry.color,
    }));
  }

  public handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const removedCharIds: string[] = [];

    // Clean up all characters registered by this client
    for (const entry of client.characters.values()) {
      removedCharIds.push(entry.serverCharId);
      const char = this.simulation.characters.get(entry.serverCharId);
      if (char) {
        if (char.heldObject) {
          char.heldObject.isHeld = false;
          char.heldObject.heldBy = null;
          char.heldObject.wakeUp();
          char.heldObject = null;
        }
        char.cleanupBeforeRemoval();
        this.simulation.characters.delete(entry.serverCharId);
      }
      this.simulation.jitterBuffer.clear(entry.serverCharId);
      this.simulation.latestClockSync.delete(entry.serverCharId);
      this.simulation.clientAckedTicks.delete(entry.serverCharId);
    }
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    this.clients.delete(clientId);

    console.log(
      `🌐 [UniversalRoom] Client disconnected: ${clientId} (Remaining clients: ${this.clients.size}, removed characters: ${removedCharIds.join(", ")})`
    );

    // TRASH ANY MEMORY OF ONLINE MAP IF NO PLAYERS REMAIN
    if (this.clients.size === 0) {
      this.trashMapMemory();
    } else {
      // Notify all remaining clients immediately that these characters have left
      const leftPayload = JSON.stringify({
        type: "player_left",
        clientId,
        removedCharIds,
        playerCount: this.simulation.characters.size,
      });
      for (const other of this.clients.values()) {
        if (other.ws.readyState === WebSocket.OPEN) {
          try {
            other.ws.send(leftPayload);
          } catch (_) {}
        }
      }
      // Broadcast an immediate snapshot reflecting the character deletion without waiting for next tick
      this.broadcastSnapshot();
    }
  }
}
