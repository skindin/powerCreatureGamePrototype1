import {
  NetworkPacket,
  ObjectNetworkData,
  ArenaNetworkData,
} from "./types.js";

export type PacketHandler<T extends NetworkPacket["type"]> = (
  packet: Extract<NetworkPacket, { type: T }>
) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;

  public playerId = "";
  public playerColor = "#f59e0b";
  public playerName = "Player";
  public isHost = false;
  public hostId = "";

  // Event handlers
  public onInit: ((packet: Extract<NetworkPacket, { type: "init" }>) => void) | null = null;
  public onPlayerJoined: ((packet: Extract<NetworkPacket, { type: "player_joined" }>) => void) | null = null;
  public onPlayerLeft: ((packet: Extract<NetworkPacket, { type: "player_left" }>) => void) | null = null;
  public onRoleChange: ((packet: Extract<NetworkPacket, { type: "role_change" }>) => void) | null = null;
  public onPlayerState: ((packet: Extract<NetworkPacket, { type: "player_state" }>) => void) | null = null;
  public onWorldSnapshot: ((packet: Extract<NetworkPacket, { type: "world_snapshot" }>) => void) | null = null;
  public onClientAction: ((packet: Extract<NetworkPacket, { type: "client_action" }>) => void) | null = null;
  public onHostEvent: ((packet: Extract<NetworkPacket, { type: "host_event" }>) => void) | null = null;

  // Rate-limiting timers
  private lastPlayerStateSend = 0;
  private lastSnapshotSend = 0;

  constructor() {
    this.connect();
  }

  public connect(): void {
    if (this.isDestroyed) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log(`[NetworkManager] Connecting to ${wsUrl}...`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[NetworkManager] Connected to multiplayer room!");
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const packet: NetworkPacket = JSON.parse(event.data);
          this.handlePacket(packet);
        } catch (err) {
          console.error("[NetworkManager] Error handling packet:", err);
        }
      };

      this.ws.onclose = () => {
        console.warn("[NetworkManager] Connection closed. Attempting reconnect in 2s...");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[NetworkManager] WebSocket error:", err);
      };
    } catch (err) {
      console.error("[NetworkManager] Connection setup failed:", err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  private handlePacket(packet: NetworkPacket): void {
    switch (packet.type) {
      case "init": {
        this.playerId = packet.playerId;
        this.playerColor = packet.playerColor;
        this.playerName = packet.playerName;
        this.isHost = packet.isHost;
        this.hostId = packet.hostId;
        this.onInit?.(packet);
        break;
      }
      case "player_joined": {
        this.onPlayerJoined?.(packet);
        break;
      }
      case "player_left": {
        if (packet.newHostId) {
          this.hostId = packet.newHostId;
          const wasHost = this.isHost;
          this.isHost = packet.newHostId === this.playerId;
          if (!wasHost && this.isHost) {
            console.log("👑 [NetworkManager] Promoted to Host! Dev tools unlocked.");
            this.onRoleChange?.({ type: "role_change", isHost: true, hostId: this.playerId });
          }
        }
        this.onPlayerLeft?.(packet);
        break;
      }
      case "role_change": {
        this.isHost = packet.isHost;
        this.hostId = packet.hostId;
        console.log(`[NetworkManager] Role changed: isHost = ${this.isHost}`);
        this.onRoleChange?.(packet);
        break;
      }
      case "player_state": {
        if (packet.playerId !== this.playerId) {
          this.onPlayerState?.(packet);
        }
        break;
      }
      case "world_snapshot": {
        if (!this.isHost) {
          this.onWorldSnapshot?.(packet);
        }
        break;
      }
      case "client_action": {
        if (this.isHost) {
          this.onClientAction?.(packet);
        }
        break;
      }
      case "host_event": {
        this.onHostEvent?.(packet);
        break;
      }
    }
  }

  public send(packet: NetworkPacket): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    }
  }

  /**
   * Stream local player movement/aim state at ~45Hz
   */
  public sendPlayerState(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    facingAngle: number,
    isAiming: boolean,
    aimTarget: { x: number; y: number } | null,
    heldObjectId: string | null,
    isActivelyWalking: boolean
  ): void {
    const now = performance.now();
    if (now - this.lastPlayerStateSend < 22) return; // ~45Hz cap
    this.lastPlayerStateSend = now;

    this.send({
      type: "player_state",
      playerId: this.playerId,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      facingAngle,
      isAiming,
      aimTarget,
      heldObjectId,
      isActivelyWalking,
    });
  }

  /**
   * Host sends authoritative world snapshot to all clients at ~30Hz
   */
  public sendWorldSnapshot(
    objects: ObjectNetworkData[],
    arena: ArenaNetworkData
  ): void {
    if (!this.isHost) return;

    const now = performance.now();
    if (now - this.lastSnapshotSend < 30) return; // ~33Hz cap
    this.lastSnapshotSend = now;

    this.send({
      type: "world_snapshot",
      hostId: this.playerId,
      timestamp: Date.now(),
      objects,
      arena,
    });
  }

  /**
   * Non-host requests an action to be executed authoritatively by the host
   */
  public sendAction(
    action: "pickup" | "throw" | "drop",
    targetObjectId?: string,
    aimX?: number,
    aimY?: number
  ): void {
    this.send({
      type: "client_action",
      playerId: this.playerId,
      action,
      targetObjectId,
      aimX,
      aimY,
    });
  }

  /**
   * Host broadcasts object creation or deletion
   */
  public sendHostEvent(
    event: "object_spawned" | "object_deleted",
    objectData?: any,
    objectId?: string
  ): void {
    if (!this.isHost) return;
    this.send({
      type: "host_event",
      event,
      objectData,
      objectId,
    });
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
