import type { PlayerInputPacket, ReliableActionCommand } from "../engine/physics/StateHistoryBuffer.js";
import type { GhostSnapshot } from "./RelayClient.js";

export type OnlineConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface OnlineRoomStats {
  status: OnlineConnectionStatus;
  pingMs: number;
  playerCount: number;
  clientId: string | null;
  playerNumber: number;
  playerName: string;
  unackedActionsCount: number;
}

/**
 * OnlineRoomClient
 *
 * Dedicated, lightweight WebSocket client for Phase 10 Live Online Multiplayer.
 * Connects directly to the UniversalRoomManager at '/ws'.
 * Completely separate from RelayClient (the in-browser boomerang simulation).
 */
export class OnlineRoomClient {
  private ws: WebSocket | null = null;
  private pingInterval: any = null;
  private lastPingSentAt: number = 0;

  public status: OnlineConnectionStatus = "disconnected";
  public pingMs: number = 0;
  public playerCount: number = 1;
  public clientId: string | null = null;
  public playerNumber: number = 1;
  public playerName: string = "Player 1";

  public unacknowledgedActions = new Map<string, ReliableActionCommand>();
  public latestGhostSnapshot: GhostSnapshot | null = null;

  public onStatsChange?: (stats: OnlineRoomStats) => void;
  public onJoined?: (info: { clientId: string; playerNumber: number; name: string; color: string }) => void;
  public onSnapshotReceived?: (snapshot: GhostSnapshot) => void;
  public onWorldSnapshotReceived?: (worldSnapshot: any) => void;
  public onClockSync?: (sync: any) => void;

  constructor(initialName?: string) {
    if (initialName) {
      this.playerName = initialName;
    }
  }

  public get unackedActionsCount(): number {
    return this.unacknowledgedActions.size;
  }

  public getLatestSnapshot(): GhostSnapshot | null {
    return this.latestGhostSnapshot;
  }

  public getStats(): OnlineRoomStats {
    return {
      status: this.status,
      pingMs: this.pingMs,
      playerCount: this.playerCount,
      clientId: this.clientId,
      playerNumber: this.playerNumber,
      playerName: this.playerName,
      unackedActionsCount: this.unacknowledgedActions.size,
    };
  }

  private notifyStats(): void {
    this.onStatsChange?.(this.getStats());
  }

  public queueReliableAction(action: ReliableActionCommand): void {
    if (this.clientId) {
      action.playerId = this.clientId;
    }
    this.unacknowledgedActions.set(action.actionId, action);

    // Send standalone packet immediately if open for lowest latency
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
    if (!ackIds || !Array.isArray(ackIds)) return;
    for (const id of ackIds) {
      this.unacknowledgedActions.delete(id);
    }
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
      console.log(`🌐 [OnlineRoomClient] Connecting to: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`✅ [OnlineRoomClient] Connected to universal room at: ${wsUrl}`);
        this.status = "connected";
        this.notifyStats();

        // Send join room request
        this.ws?.send(JSON.stringify({
          type: "join_room",
          name: this.playerName,
        }));

        this.startPingLoop();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const raw = typeof event.data === "string" ? event.data : event.data.toString();
          const msg = JSON.parse(raw);

          if (msg.type === "room_welcome" || msg.type === "room_joined") {
            this.clientId = msg.clientId;
            this.playerNumber = msg.playerNumber || 1;
            if (msg.name) this.playerName = msg.name;
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
            this.pingMs = Math.max(1, rtt);
            this.notifyStats();
            return;
          }

          if (msg.type === "pc_server_snapshot") {
            if (typeof msg.playerCount === "number") {
              this.playerCount = msg.playerCount;
            }

            if (msg.snapshot) {
              msg.snapshot.rttMs = this.pingMs;
              this.latestGhostSnapshot = msg.snapshot;

              if (Array.isArray(msg.snapshot.ackActionIds)) {
                this.acknowledgeActions(msg.snapshot.ackActionIds);
              }

              if (msg.snapshot.clockSync) {
                this.onClockSync?.(msg.snapshot.clockSync);
              }

              this.onSnapshotReceived?.(msg.snapshot);
            }

            if (msg.worldSnapshot) {
              this.onWorldSnapshotReceived?.(msg.worldSnapshot);
            }

            this.notifyStats();
            return;
          }
        } catch (err) {
          console.warn("[OnlineRoomClient] Error parsing message:", err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.warn(`⚠️ [OnlineRoomClient] Disconnected (code: ${event.code}, reason: "${event.reason || "none"}")`);
        this.status = "disconnected";
        this.stopPingLoop();
        this.notifyStats();
      };

      this.ws.onerror = (err) => {
        console.error("[OnlineRoomClient] WebSocket error event:", err);
        this.status = "error";
        this.notifyStats();
      };
    } catch (err) {
      console.error("[OnlineRoomClient] Connect exception:", err);
      this.status = "error";
      this.notifyStats();
    }
  }

  public disconnect(): void {
    this.stopPingLoop();
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
   * Streams local player inputs to the server along with any pending reliable actions.
   */
  public sendPlayerInput(packet: PlayerInputPacket): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      if (this.clientId) {
        packet.playerId = this.clientId;
      }
      const reliableActions = this.unacknowledgedActions.size > 0
        ? Array.from(this.unacknowledgedActions.values())
        : undefined;

      this.ws.send(JSON.stringify({
        type: "player_input",
        packet,
        reliableActions,
      }));
    } catch (_) {}
  }

  public renamePlayer(newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    this.playerName = trimmed;
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
