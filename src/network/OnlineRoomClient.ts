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
  color: string;
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
  public hasCustomName: boolean = false;
  public assignedColor: string = "#f59e0b";

  public unacknowledgedActions = new Map<string, ReliableActionCommand>();
  public latestGhostSnapshot: GhostSnapshot | null = null;
  public localPlayers = new Map<string, { localPlayerId: string; serverCharId: string; playerNumber: number; color: string; name: string }>();
  public lastServerMessageTime: number = 0;

  public onStatsChange?: (stats: OnlineRoomStats) => void;
  public onJoined?: (info: { clientId: string; playerNumber: number; name: string; color: string }) => void;
  public onPlayerRegistered?: (info: { localPlayerId: string; serverCharId: string; playerNumber: number; color: string; name: string }) => void;
  public onPlayerRemoved?: (localPlayerId: string) => void;
  public onPlayerLeft?: (charId: string) => void;
  public onSnapshotReceived?: (snapshot: GhostSnapshot) => void;
  public onWorldSnapshotReceived?: (worldSnapshot: any) => void;
  public onClockSync?: (sync: any) => void;

  constructor(initialName?: string) {
    if (initialName) {
      this.playerName = initialName;
      this.hasCustomName = !/^Player(\s+\d+)?$/i.test(initialName.trim());
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
      color: this.assignedColor,
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

        // Send join room request with all local players currently active on this client
        const activeLocalPlayers = Array.from(this.localPlayers.values()).map(p => ({
          localPlayerId: p.localPlayerId,
          name: (p.name && !/^Player(\s+\d+)?$/i.test(p.name.trim()) && !/^Controller\s+#\d+$/i.test(p.name.trim()))
            ? p.name
            : (p.localPlayerId === "keyboard" && this.hasCustomName ? this.playerName : undefined),
        }));

        this.ws?.send(JSON.stringify({
          type: "join_room",
          name: this.hasCustomName ? this.playerName : undefined,
          localPlayers: activeLocalPlayers.length > 0
            ? activeLocalPlayers
            : [{ localPlayerId: "keyboard", name: this.hasCustomName ? this.playerName : undefined }],
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
            if (msg.color) this.assignedColor = msg.color;
            if (msg.name) this.playerName = msg.name;

            if (Array.isArray(msg.registeredPlayers)) {
              for (const reg of msg.registeredPlayers) {
                this.localPlayers.set(reg.localPlayerId, reg);
                this.onPlayerRegistered?.(reg);
              }
            } else {
              const defaultReg = {
                localPlayerId: "keyboard",
                serverCharId: this.clientId || "client",
                playerNumber: this.playerNumber,
                color: this.assignedColor,
                name: this.playerName,
              };
              this.localPlayers.set("keyboard", defaultReg);
              this.onPlayerRegistered?.(defaultReg);
            }

            this.notifyStats();

            this.onJoined?.({
              clientId: msg.clientId,
              playerNumber: msg.playerNumber,
              name: msg.name,
              color: msg.color || this.assignedColor,
            });
            return;
          }

          if (msg.type === "player_added") {
            this.localPlayers.set(msg.localPlayerId, msg);
            this.onPlayerRegistered?.(msg);
            return;
          }

          this.lastServerMessageTime = Date.now();

          if (msg.type === "player_removed") {
            this.localPlayers.delete(msg.localPlayerId);
            this.onPlayerRemoved?.(msg.localPlayerId);
            return;
          }

          if (msg.type === "player_left") {
            if (Array.isArray(msg.removedCharIds)) {
              for (const charId of msg.removedCharIds) {
                this.onPlayerLeft?.(charId);
              }
            }
            if (typeof msg.playerCount === "number") {
              this.playerCount = msg.playerCount;
            }
            this.notifyStats();
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
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: "leave_room",
            clientId: this.clientId,
          }));
        }
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.status = "disconnected";
    this.notifyStats();
  }

  public getServerCharId(localPlayerId: string = "keyboard"): string {
    const reg = this.localPlayers.get(localPlayerId);
    if (reg) return reg.serverCharId;
    if (localPlayerId === "keyboard" || !localPlayerId) return this.clientId || "keyboard";
    return this.clientId ? `${this.clientId}:${localPlayerId}` : localPlayerId;
  }

  public addPlayer(localPlayerId: string, name?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const isCustom = Boolean(
        name &&
        name.trim().length > 0 &&
        !/^Player(\s+\d+)?$/i.test(name.trim()) &&
        !/^Controller\s+#\d+$/i.test(name.trim())
      );
      this.ws.send(JSON.stringify({
        type: "add_player",
        localPlayerId,
        name: isCustom ? name!.trim() : undefined,
      }));
    } catch (_) {}
  }

  public removePlayer(localPlayerId: string): void {
    this.localPlayers.delete(localPlayerId);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({
        type: "remove_player",
        localPlayerId,
      }));
    } catch (_) {}
  }

  /**
   * Streams local player inputs to the server along with local character & object telemetry.
   * Enables the authoritative server to maintain locked coordinates and velocity for each local character.
   */
  public sendPlayerInput(
    localPlayerId: string,
    packet: PlayerInputPacket,
    character?: any,
    objects?: any[]
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const serverCharId = this.getServerCharId(localPlayerId);
      packet.playerId = serverCharId;

      const isCustomCharacter = Boolean(character?.hasCustomName && character?.name);
      if (isCustomCharacter) {
        packet.playerName = character.name;
      } else if (localPlayerId === "keyboard" && this.hasCustomName && this.playerName) {
        packet.playerName = this.playerName;
      } else {
        packet.playerName = character?.name;
      }

      const reliableActions = this.unacknowledgedActions.size > 0
        ? Array.from(this.unacknowledgedActions.values())
        : undefined;

      const charTelemetry = character ? {
        id: serverCharId,
        name: isCustomCharacter
          ? character.name
          : (localPlayerId === "keyboard" && this.hasCustomName ? this.playerName : character.name),
        x: Number(character.position.x.toFixed(3)),
        y: Number(character.position.y.toFixed(3)),
        z: Number(character.position.z.toFixed(3)),
        vx: Number(character.velocity.x.toFixed(3)),
        vy: Number(character.velocity.y.toFixed(3)),
        vz: Number((character.hasVerticalVelocity ? character.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((character.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: character.isRestingOnSurface || character.position.z <= 0.005,
        radius: character.colliderRadius,
        color: character.playerColor || character.color,
        isClimbing: character.isClimbing,
        isAboveWalls: character.isAboveWalls,
        facingAngle: Number(character.facingAngle.toFixed(4)),
        heldObjectId: character.heldObject ? character.heldObject.id : null,
        isHolding: Boolean(character.heldObject),
      } : undefined;

      // Only stream telemetry for objects that this specific local character has authority over (held in hands)
      const myHeldObjects = (Array.isArray(objects) && objects.length > 0)
        ? objects.filter((obj) => obj.isHeld && (obj.heldBy === character || character?.heldObject === obj))
        : [];

      const objTelemetry = myHeldObjects.length > 0 ? myHeldObjects.map((obj) => ({
        id: obj.id,
        name: obj.name,
        x: Number(obj.position.x.toFixed(3)),
        y: Number(obj.position.y.toFixed(3)),
        z: Number(obj.position.z.toFixed(3)),
        vx: Number(obj.velocity.x.toFixed(3)),
        vy: Number(obj.velocity.y.toFixed(3)),
        vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: obj.isRestingOnSurface || obj.position.z <= 0.005,
        radius: obj.colliderRadius,
        color: obj.color,
        shape: obj.visualShape,
        isHeld: true,
        heldBy: serverCharId,
        isAboveWalls: obj.isAboveWalls,
        angX: obj.rollModule ? Number(obj.rollModule.angularVelocity.x.toFixed(3)) : undefined,
        angY: obj.rollModule ? Number(obj.rollModule.angularVelocity.y.toFixed(3)) : undefined,
        angZ: obj.rollModule ? Number(obj.rollModule.angularVelocity.z.toFixed(3)) : undefined,
        isSleeping: obj.isSleeping,
      })) : undefined;

      this.ws.send(JSON.stringify({
        type: "player_input",
        localPlayerId,
        serverCharId,
        packet,
        character: charTelemetry,
        objects: objTelemetry,
        reliableActions,
      }));
    } catch (_) {}
  }

  public renamePlayer(newName: string, localPlayerId: string = "keyboard"): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (localPlayerId === "keyboard") {
      this.playerName = trimmed;
      this.hasCustomName = !/^Player(\s+\d+)?$/i.test(trimmed) && !/^Controller\s+#\d+$/i.test(trimmed);
    }
    const entry = this.localPlayers.get(localPlayerId);
    if (entry) entry.name = trimmed;
    this.notifyStats();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({
        type: "rename_player",
        localPlayerId,
        serverCharId: this.getServerCharId(localPlayerId),
        name: trimmed,
      }));
    } catch (_) {}
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingInterval = setInterval(() => {
      // Check for silent connection loss (4 seconds without any server message)
      if (this.status === "connected" && this.lastServerMessageTime > 0 && Date.now() - this.lastServerMessageTime > 4000) {
        console.warn("⚠️ [OnlineRoomClient] Server connection lost (heartbeat timeout). Evicting room session.");
        this.disconnect();
        return;
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSentAt = performance.now();
        try {
          this.ws.send(JSON.stringify({
            type: "ping",
            clientTimestamp: this.lastPingSentAt,
          }));
        } catch (_) {}
      }
    }, 1000);
  }

  private stopPingLoop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
