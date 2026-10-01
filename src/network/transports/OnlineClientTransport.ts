import { ClientNetworkPipeline, ClientPipelineStats } from "../protocol/ClientNetworkPipeline.js";
import {
  PlayerInputPacket,
  ReliableActionCommand,
  GhostSnapshot,
} from "../protocol/NetworkPackets.js";

export type OnlineConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface OnlineTransportStats {
  status: OnlineConnectionStatus;
  pingMs: number;
  playerCount: number;
  clientId: string | null;
  playerNumber: number;
  playerName: string;
  pipelineStats: ClientPipelineStats;
}

/**
 * OnlineClientTransport
 *
 * Real WebSocket transport for Phase 10 Live Online Multiplayer.
 * Connects to the authoritative Universal Room WebSocket server.
 * Delegates all input packaging, reliable action outbox management,
 * and snapshot ingestion directly to the shared ClientNetworkPipeline.
 */
export class OnlineClientTransport {
  public pipeline: ClientNetworkPipeline;
  private ws: WebSocket | null = null;
  private pingInterval: any = null;
  private lastPingSentAt: number = 0;

  public status: OnlineConnectionStatus = "disconnected";
  public playerCount: number = 1;
  public clientId: string | null = null;
  public playerNumber: number = 1;

  public onStatsChange?: (stats: OnlineTransportStats) => void;
  public onJoined?: (info: { clientId: string; playerNumber: number; name: string; color: string }) => void;

  constructor(initialName?: string) {
    this.pipeline = new ClientNetworkPipeline(initialName);
  }

  public get playerName(): string {
    return this.pipeline.playerName;
  }

  public set playerName(val: string) {
    this.pipeline.playerName = val;
  }

  public get pingMs(): number {
    return this.pipeline.lastRttMs;
  }

  public get unackedActionsCount(): number {
    return this.pipeline.unackedActionsCount;
  }

  public getLatestSnapshot(): GhostSnapshot | null {
    return this.pipeline.latestGhostSnapshot;
  }

  public getStats(): OnlineTransportStats {
    return {
      status: this.status,
      pingMs: this.pipeline.lastRttMs,
      playerCount: this.playerCount,
      clientId: this.clientId,
      playerNumber: this.playerNumber,
      playerName: this.pipeline.playerName,
      pipelineStats: this.pipeline.getStats(),
    };
  }

  private notifyStats(): void {
    this.onStatsChange?.(this.getStats());
  }

  public queueReliableAction(action: ReliableActionCommand): void {
    if (this.clientId) {
      action.playerId = this.clientId;
    }
    this.pipeline.queueReliableAction(action);

    // Send standalone packet immediately if open for lowest possible latency
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: "reliable_action",
          action,
        }));
      } catch (_) {}
    }
  }

  public acknowledgeActions(ackIds?: string[]): void {
    this.pipeline.acknowledgeActions(ackIds);
  }

  public connect(url?: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = url || (() => {
      const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
      const protocol = isSecure ? "wss:" : "ws:";
      const host = typeof window !== "undefined" ? window.location.host : "127.0.0.1:5173";
      return `${protocol}//${host}/ws`;
    })();

    this.status = "connecting";
    this.notifyStats();

    try {
      console.log(`🌐 [OnlineTransport] Connecting to: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`✅ [OnlineTransport] Connected to universal room at: ${wsUrl}`);
        this.status = "connected";
        this.notifyStats();

        // Send join room packet with desired handle
        const handle = this.pipeline.playerName || "Player 1";
        this.ws?.send(JSON.stringify({
          type: "join_room",
          name: handle,
        }));

        this.startPingLoop();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const raw = typeof event.data === "string" ? event.data : event.data.toString();
          const msg = JSON.parse(raw);

          if (msg.type === "room_welcome" || msg.type === "room_joined") {
            console.log(`🎉 [OnlineTransport] Room joined: P${msg.playerNumber} "${msg.name}" (ID: ${msg.clientId})`);
            this.clientId = msg.clientId;
            this.pipeline.clientId = msg.clientId;
            this.playerNumber = msg.playerNumber || 1;
            if (msg.name) this.pipeline.playerName = msg.name;
            this.notifyStats();
            this.onJoined?.({
              clientId: msg.clientId,
              playerNumber: msg.playerNumber,
              name: msg.name,
              color: msg.color,
            });
            return;
          }

          if (msg.type === "pong") {
            const rtt = Math.round(performance.now() - msg.clientTimestamp);
            this.pipeline.lastRttMs = Math.max(1, rtt);
            this.notifyStats();
            return;
          }

          if (msg.type === "pc_server_snapshot") {
            if (typeof msg.playerCount === "number") {
              this.playerCount = msg.playerCount;
            }
            if (msg.snapshot) {
              msg.snapshot.rttMs = this.pipeline.lastRttMs;
              this.pipeline.processServerSnapshot(msg.snapshot, msg.worldSnapshot);
            }
            return;
          }
        } catch (err) {
          console.warn("[OnlineTransport] Error parsing message:", err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.warn(`⚠️ [OnlineTransport] Disconnected (code: ${event.code}, reason: "${event.reason || "none"}", wasClean: ${event.wasClean})`);
        this.status = "disconnected";
        this.pipeline.reset();
        this.stopPingLoop();
        this.notifyStats();
      };

      this.ws.onerror = (err) => {
        console.error("[OnlineTransport] WebSocket error event:", err);
        this.status = "error";
        this.notifyStats();
      };
    } catch (err) {
      console.error("[OnlineTransport] Connect exception:", err);
      this.status = "error";
      this.notifyStats();
    }
  }

  public disconnect(): void {
    this.stopPingLoop();
    this.pipeline.reset();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.status = "disconnected";
    this.notifyStats();
  }

  /**
   * Streams local player inputs using ClientNetworkPipeline.
   */
  public sendPlayerInput(packet: PlayerInputPacket): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const inputs = new Map<string, PlayerInputPacket>();
      inputs.set(this.clientId || "keyboard", packet);

      const packetToSend = this.pipeline.createInputPacket(inputs, packet.tick ?? 0);
      this.ws.send(JSON.stringify(packetToSend));
    } catch (_) {}
  }

  public renamePlayer(newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    this.pipeline.playerName = trimmed;
    this.notifyStats();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({
        type: "rename_player",
        name: trimmed,
      }));
    } catch (_) {}
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSentAt = performance.now();
        try {
          this.ws.send(JSON.stringify({
            type: "ping",
            clientTimestamp: this.lastPingSentAt,
          }));
        } catch (_) {}
      }
    }, 2000);
  }

  private stopPingLoop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
