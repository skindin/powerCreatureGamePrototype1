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
}

export interface ConnectedRoomClient {
  id: string;
  ws: WebSocket;
  characters: Map<string, ClientCharacterEntry>;
  lastPingMs: number;
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

    console.log(`🌐 [UniversalRoom] Authoritative 60Hz physics world active. Ticks: #${this.simulation.currentTick}`);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
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
      if (name && name.trim().length > 0) {
        existing.name = name.trim();
        const sChar = this.simulation.characters.get(existing.serverCharId);
        if (sChar) sChar.name = existing.name;
      }
      return existing;
    }

    const playerNumber = this.allocatePlayerNumber();
    const color = PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length];
    const serverCharId = (localPlayerId === "keyboard" && client.characters.size === 0)
      ? client.id
      : `${client.id}:${localPlayerId}`;
    const charName = name && name.trim().length > 0 ? name.trim() : `Player ${playerNumber}`;

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
      sChar.cleanupBeforeRemoval();
      this.simulation.characters.delete(entry.serverCharId);
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }
    console.log(`🌐 [UniversalRoom] Character removed: ${entry.serverCharId} from client ${client.id}`);
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

    // Listen for incoming messages
    ws.on("message", (raw) => {
      try {
        const text = raw.toString();
        const data = JSON.parse(text);

        if (data.type === "join_room") {
          // If the client provided a list of local players already active on their machine
          if (Array.isArray(data.localPlayers) && data.localPlayers.length > 0) {
            for (const lp of data.localPlayers) {
              if (lp.localPlayerId) {
                this.registerCharacter(client, lp.localPlayerId, lp.name);
              }
            }
          } else if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            primaryEntry.name = data.name.trim();
            const sChar = this.simulation.characters.get(primaryEntry.serverCharId);
            if (sChar) sChar.name = primaryEntry.name;
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
          const entry = this.registerCharacter(client, localPlayerId, data.name);
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
          const charEntry = client.characters.get(localPlayerId);
          const serverCharId = charEntry ? charEntry.serverCharId : (data.serverCharId || clientId);

          const pkt = data.packet as PlayerInputPacket;
          pkt.playerId = serverCharId;

          const sChar = this.simulation.characters.get(serverCharId);
          if (sChar && pkt.playerName && pkt.playerName !== sChar.name) {
            sChar.name = pkt.playerName;
            if (charEntry) charEntry.name = pkt.playerName;
          }

          this.simulation.queueInput(pkt);

          if (data.character) {
            data.character.id = serverCharId;
            if (sChar) {
              data.character.name = sChar.name;
              data.character.color = sChar.color;
            }
            this.simulation.syncCharacterFromPacket(data.character);
          }

          if (Array.isArray(data.reliableActions) && data.reliableActions.length > 0) {
            for (const act of data.reliableActions) {
              act.playerId = serverCharId;
            }
            this.simulation.processReliableActions(data.reliableActions);
          }

          if (Array.isArray(data.objects) && data.objects.length > 0) {
            this.simulation.syncObjectsFromPacket(data.objects, serverCharId);
          }
          return;
        }

        if (data.type === "reliable_action" && data.action) {
          const localPlayerId = data.localPlayerId || "keyboard";
          const charEntry = client.characters.get(localPlayerId);
          const serverCharId = charEntry ? charEntry.serverCharId : (data.serverCharId || clientId);

          const act = data.action as ReliableActionCommand;
          act.playerId = serverCharId;
          this.simulation.processReliableActions([act]);
          return;
        }

        if (data.type === "rename_player") {
          if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            const trimmed = data.name.trim();
            const localPlayerId = data.localPlayerId || "keyboard";
            const charEntry = client.characters.get(localPlayerId);
            if (charEntry) {
              charEntry.name = trimmed;
              const sChar = this.simulation.characters.get(charEntry.serverCharId);
              if (sChar) sChar.name = trimmed;
            }
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

    // Clean up all characters registered by this client
    for (const entry of client.characters.values()) {
      const char = this.simulation.characters.get(entry.serverCharId);
      if (char) {
        char.cleanupBeforeRemoval();
        this.simulation.characters.delete(entry.serverCharId);
      }
    }
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    this.clients.delete(clientId);

    console.log(`🌐 [UniversalRoom] Client disconnected: ${clientId} (Remaining clients: ${this.clients.size})`);

    // TRASH ANY MEMORY OF ONLINE MAP IF NO PLAYERS REMAIN
    if (this.clients.size === 0) {
      this.trashMapMemory();
    }
  }
}
