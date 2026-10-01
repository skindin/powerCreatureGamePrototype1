if (typeof process !== "undefined" && process.env) {
  process.env.WS_NO_BUFFER_UTIL = "1";
  process.env.WS_NO_UTF_8_VALIDATE = "1";
}
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage, Server } from "node:http";
import { ServerNetworkPipeline, ConnectedClientInfo } from "../network/protocol/ServerNetworkPipeline.js";
import { ClientInputPacket } from "../network/protocol/NetworkPackets.js";

export interface ConnectedRoomSocket {
  id: string;
  ws: WebSocket;
  info: ConnectedClientInfo;
}

/**
 * UniversalRoomManager
 *
 * Real server manager for Phase 10 Live Online Multiplayer.
 * Attaches to an HTTP server and serves WebSocket connections at '/ws'.
 * Delegates all physics simulation, input ingestion, contested grab arbitration,
 * and snapshot creation directly to the reusable ServerNetworkPipeline.
 */
export class UniversalRoomManager {
  private static instance: UniversalRoomManager | null = null;

  public pipeline: ServerNetworkPipeline;
  public sockets: Map<string, ConnectedRoomSocket> = new Map();
  public isRunning = false;

  private loopInterval: NodeJS.Timeout | null = null;
  private lastTimeHr: bigint = process.hrtime.bigint();
  private accumulator: number = 0;
  private readonly fixedDt: number = 1 / 60;

  constructor() {
    this.pipeline = new ServerNetworkPipeline();
  }

  public get simulation() {
    return this.pipeline.simulation;
  }

  public static getInstance(): UniversalRoomManager {
    if (!UniversalRoomManager.instance) {
      UniversalRoomManager.instance = new UniversalRoomManager();
      UniversalRoomManager.instance.start();
    }
    return UniversalRoomManager.instance;
  }

  /**
   * Attaches the WebSocket server to an existing Node.js HTTP server.
   * Intercepts upgrades on path '/ws'.
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
      this.pipeline.step(this.fixedDt);
      this.accumulator -= this.fixedDt;

      // Broadcast authoritative state at 60Hz to all connected clients
      this.broadcastSnapshot();
    }
  }

  private broadcastSnapshot(): void {
    if (this.sockets.size === 0) return;

    const worldSnapshot = this.pipeline.getAuthoritativeWorldSnapshot();

    for (const [clientId, sock] of this.sockets) {
      if (sock.ws.readyState === WebSocket.OPEN) {
        try {
          const packet = this.pipeline.createSnapshotPacketForClient(clientId, worldSnapshot);
          sock.ws.send(JSON.stringify(packet));
        } catch (err) {
          console.warn(`[UniversalRoom] Failed to send snapshot to ${clientId}:`, err);
        }
      }
    }
  }

  public handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const info = this.pipeline.registerClient(clientId);

    const roomSocket: ConnectedRoomSocket = {
      id: clientId,
      ws,
      info,
    };
    this.sockets.set(clientId, roomSocket);

    console.log(`🌐 [UniversalRoom] Player connected: ${clientId} as P${info.playerNumber} "${info.name}" (Total: ${this.sockets.size})`);

    // Listen for incoming messages
    ws.on("message", (raw) => {
      try {
        const text = raw.toString();
        const data = JSON.parse(text);

        if (data.type === "join_room") {
          if (data.name && typeof data.name === "string" && data.name.trim().length > 0) {
            this.pipeline.renameClient(clientId, data.name.trim());
          }
          ws.send(JSON.stringify({
            type: "room_joined",
            clientId,
            playerNumber: info.playerNumber,
            name: info.name,
            color: info.color,
            arena: {
              width: this.simulation.arena.width,
              height: this.simulation.arena.height,
              wallHeight: this.simulation.arena.wallHeight,
              tileGrid: this.simulation.arena.tileGrid,
            },
            worldSnapshot: this.pipeline.getAuthoritativeWorldSnapshot(),
          }));
          return;
        }

        if (data.type === "player_input") {
          this.pipeline.processClientPacket(clientId, data as ClientInputPacket);
          return;
        }

        if (data.type === "reliable_action" && data.action) {
          this.pipeline.executeReliableAction(clientId, data.action);
          return;
        }

        if (data.type === "rename_player") {
          if (data.name && typeof data.name === "string") {
            this.pipeline.renameClient(clientId, data.name);
          }
          return;
        }

        if (data.type === "ping") {
          if (typeof data.clientTimestamp === "number") {
            info.lastPingMs = Math.max(1, Math.round(performance.now() - data.clientTimestamp));
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

    // Send immediate welcome packet so client knows connection is established
    ws.send(JSON.stringify({
      type: "room_welcome",
      clientId,
      playerNumber: info.playerNumber,
      name: info.name,
      color: info.color,
    }));
  }

  public handleDisconnection(clientId: string): void {
    const sock = this.sockets.get(clientId);
    if (!sock) return;

    this.sockets.delete(clientId);
    this.pipeline.unregisterClient(clientId);

    console.log(`🌐 [UniversalRoom] Player disconnected: ${clientId} (Remaining: ${this.sockets.size})`);
  }
}
