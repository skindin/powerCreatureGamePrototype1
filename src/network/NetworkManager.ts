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
  public onObjectAction: ((packet: Extract<NetworkPacket, { type: "object_action" }>) => void) | null = null;
  public onTrajectoryLaunch: ((packet: Extract<NetworkPacket, { type: "trajectory_launch" }>) => void) | null = null;

  // NTP Clock Synchronization
  private serverTimeOffset = 0;
  private pingInterval: any = null;

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
        this.startPingSync();
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
      case "pong": {
        const rtt = performance.now() - packet.clientTime;
        const oneWay = rtt / 2;
        this.serverTimeOffset = packet.serverTime + oneWay - Date.now();
        break;
      }
      case "object_action": {
        if (packet.playerId !== this.playerId) {
          this.onObjectAction?.(packet);
        }
        break;
      }
      case "trajectory_launch": {
        if (packet.playerId !== this.playerId) {
          this.onTrajectoryLaunch?.(packet);
        }
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
   * Stream local player movement/aim state at ~22Hz with compacted floats
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
    if (now - this.lastPlayerStateSend < 45) return; // ~22Hz cap (prevents TCP buffer bloat)
    this.lastPlayerStateSend = now;

    const r2 = (v: number) => Math.round(v * 100) / 100;

    this.send({
      type: "player_state",
      playerId: this.playerId,
      x: r2(x),
      y: r2(y),
      z: r2(z),
      vx: r2(vx),
      vy: r2(vy),
      vz: r2(vz),
      facingAngle: r2(facingAngle),
      isAiming,
      aimTarget: aimTarget ? { x: r2(aimTarget.x), y: r2(aimTarget.y) } : null,
      heldObjectId,
      isActivelyWalking,
    });
  }

  /**
   * Host sends authoritative world snapshot to all clients at ~16.6Hz (60ms) with compacted floats
   */
  public sendWorldSnapshot(
    objects: ObjectNetworkData[],
    arena: ArenaNetworkData
  ): void {
    if (!this.isHost) return;

    const now = performance.now();
    if (now - this.lastSnapshotSend < 60) return; // ~16.6Hz cap
    this.lastSnapshotSend = now;

    const r2 = (v: number) => Math.round(v * 100) / 100;

    const compactObjects = objects.map((o) => ({
      id: o.id,
      x: r2(o.x),
      y: r2(o.y),
      z: r2(o.z),
      vx: r2(o.vx),
      vy: r2(o.vy),
      vz: r2(o.vz),
      rotX: r2(o.rotX),
      rotY: r2(o.rotY),
      rotZ: r2(o.rotZ),
      isHeld: o.isHeld,
      heldByPlayerId: o.heldByPlayerId,
      supportingSurfaceHeight: r2(o.supportingSurfaceHeight),
    }));

    this.send({
      type: "world_snapshot",
      hostId: this.playerId,
      timestamp: this.getSyncedTime(),
      objects: compactObjects,
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

  private startPingSync(): void {
    this.stopPingSync();
    const sendPing = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: "ping",
          clientTime: performance.now(),
        });
      }
    };
    sendPing();
    this.pingInterval = setInterval(sendPing, 2500);
  }

  private stopPingSync(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Universal server-synchronized timestamp (in milliseconds)
   */
  public getSyncedTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  /**
   * Broadcast an interaction with an object (throw, pickup, drop, impulse)
   * with authoritative synchronized velocity and position
   */
  public sendObjectAction(data: {
    action: "throw" | "pickup" | "drop" | "impulse";
    objectId: string;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    rotX?: number;
    rotY?: number;
    rotZ?: number;
    timestamp?: number;
  }): void {
    const r2 = (v?: number) => (v !== undefined ? Math.round(v * 100) / 100 : undefined);
    this.send({
      type: "object_action",
      action: data.action,
      playerId: this.playerId,
      objectId: data.objectId,
      x: r2(data.x),
      y: r2(data.y),
      z: r2(data.z),
      vx: r2(data.vx),
      vy: r2(data.vy),
      vz: r2(data.vz),
      rotX: r2(data.rotX),
      rotY: r2(data.rotY),
      rotZ: r2(data.rotZ),
      timestamp: data.timestamp ?? this.getSyncedTime(),
    });
  }

  /**
   * Broadcast an analytical trajectory launch
   */
  public sendTrajectoryLaunch(data: {
    objectId: string;
    t0: number;
    x0: number;
    y0: number;
    z0: number;
    vx0: number;
    vy0: number;
    vz0: number;
  }): void {
    const r2 = (v: number) => Math.round(v * 100) / 100;
    this.send({
      type: "trajectory_launch",
      playerId: this.playerId,
      objectId: data.objectId,
      t0: data.t0,
      x0: r2(data.x0),
      y0: r2(data.y0),
      z0: r2(data.z0),
      vx0: r2(data.vx0),
      vy0: r2(data.vy0),
      vz0: r2(data.vz0),
    });
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.stopPingSync();
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
