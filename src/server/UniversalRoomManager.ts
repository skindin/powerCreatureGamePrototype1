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

export interface ConnectedRoomClient {
  id: string;
  ws: WebSocket;
  playerNumber: number;
  name: string;
  color: string;
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
            playerCount: this.clients.size,
          });
          client.ws.send(payload);
        } catch (err) {
          console.warn(`[UniversalRoom] Failed to send snapshot to ${clientId}:`, err);
        }
      }
    }
  }

  private allocatePlayerNumber(): number {
    const used = new Set<number>();
    for (const c of this.clients.values()) {
      used.add(c.playerNumber);
    }
    for (let i = 1; i <= 16; i++) {
      if (!used.has(i)) return i;
    }
    return this.clients.size + 1;
  }

  public handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const playerNumber = this.allocatePlayerNumber();
    const color = PLAYER_COLORS[(playerNumber - 1) % PLAYER_COLORS.length];
    const defaultName = `Player ${playerNumber}`;

    const client: ConnectedRoomClient = {
      id: clientId,
      ws,
      playerNumber,
      name: defaultName,
      color,
      lastPingMs: 0,
    };
    this.clients.set(clientId, client);

    console.log(`🌐 [UniversalRoom] Player connected: ${clientId} as P${playerNumber} (Total in room: ${this.clients.size})`);

    // Remove dummy placeholder character if present
    if (this.simulation.characters.has("player-1")) {
      this.simulation.characters.delete("player-1");
    }

    // Spawn character in simulation
    const spawnX = 4.8 + ((playerNumber - 1) % 4) * 1.6;
    const spawnY = 7.0 + Math.floor((playerNumber - 1) / 4) * 1.5;

    const character = new Character({
      x: spawnX,
      y: spawnY,
      color,
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      playerId: clientId,
      playerNumber,
      name: defaultName,
    });
    this.simulation.characters.set(clientId, character);
    this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];

    // Listen for incoming messages
    ws.on("message", (raw) => {
      try {
        const text = raw.toString();
        const data = JSON.parse(text);

        if (data.type === "join_room") {
          if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            client.name = data.name.trim();
            character.name = client.name;
          }
          ws.send(JSON.stringify({
            type: "room_joined",
            clientId,
            playerNumber,
            name: character.name,
            color: character.color,
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

        if (data.type === "player_input" && data.packet) {
          const pkt = data.packet as PlayerInputPacket;
          pkt.playerId = clientId;
          if (pkt.playerName && pkt.playerName !== character.name) {
            client.name = pkt.playerName;
            character.name = pkt.playerName;
          }
          this.simulation.queueInput(pkt);

          if (data.character) {
            data.character.id = clientId;
            if (character.name) data.character.name = character.name;
            if (character.color) data.character.color = character.color;
            this.simulation.syncCharacterFromPacket(data.character);
          }

          if (Array.isArray(data.objects) && data.objects.length > 0) {
            this.simulation.syncObjectsFromPacket(data.objects, clientId);
          }

          if (Array.isArray(data.reliableActions) && data.reliableActions.length > 0) {
            for (const act of data.reliableActions) {
              act.playerId = clientId;
            }
            this.simulation.processReliableActions(data.reliableActions);
          }
          return;
        }

        if (data.type === "reliable_action" && data.action) {
          const act = data.action as ReliableActionCommand;
          act.playerId = clientId;
          this.simulation.processReliableActions([act]);
          return;
        }

        if (data.type === "rename_player") {
          if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            client.name = data.name.trim();
            character.name = client.name;
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
      playerNumber,
      name: character.name,
      color: character.color,
    }));
  }

  public handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);
    const char = this.simulation.characters.get(clientId);
    if (char) {
      char.cleanupBeforeRemoval();
      this.simulation.characters.delete(clientId);
      this.simulation.arena.entities = [...this.simulation.allCharacters, ...this.simulation.objects];
    }

    console.log(`🌐 [UniversalRoom] Player disconnected: ${clientId} (Remaining in room: ${this.clients.size})`);
  }
}
