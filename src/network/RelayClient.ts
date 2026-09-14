import { Character } from "../character/Character.js";
import { GameObject } from "../engine/GameObject.js";

export interface GhostEntityState {
  id: string;
  name?: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  color?: string;
  shape?: "circle" | "box";
  isHeld?: boolean;
  heldBy?: string | null;
  isAboveWalls?: boolean;
  isClimbing?: boolean;
}

export interface GhostSnapshot {
  seq: number;
  sentAt: number;
  receivedAt: number;
  rttMs: number;
  character: GhostEntityState;
  objects: GhostEntityState[];
}

export type RelayStatus = "disconnected" | "connecting" | "connected" | "error";

export interface RelayStats {
  status: RelayStatus;
  url: string;
  packetsSent: number;
  packetsReceived: number;
  lastRttMs: number;
  minRttMs: number;
  maxRttMs: number;
  avgRttMs: number;
  sendRateHz: number;
}

export class RelayClient {
  public url: string;
  public status: RelayStatus = "disconnected";
  public sendRateHz: number = 30; // 30 updates per second
  public showGhostClones: boolean = true;

  private socket: WebSocket | null = null;
  private seq: number = 0;
  private lastSendTime: number = 0;
  private latestGhostSnapshot: GhostSnapshot | null = null;

  // Stats
  private packetsSent: number = 0;
  private packetsReceived: number = 0;
  private lastRttMs: number = 0;
  private minRttMs: number = Infinity;
  private maxRttMs: number = 0;
  private totalRttMs: number = 0;

  public onStatsChange?: (stats: RelayStats) => void;
  public onSnapshotReceived?: (snapshot: GhostSnapshot) => void;

  constructor(url: string = "wss://echo.websocket.org") {
    this.url = url;
  }

  public connect(newUrl?: string): void {
    if (newUrl) this.url = newUrl;
    this.disconnect();

    this.status = "connecting";
    this.notifyStats();

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.status = "connected";
        this.notifyStats();
      };

      this.socket.onclose = () => {
        this.status = "disconnected";
        this.notifyStats();
      };

      this.socket.onerror = (err) => {
        console.warn("[RelayClient] Socket error:", err);
        this.status = "error";
        this.notifyStats();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (e) {
      console.error("[RelayClient] Connection failed:", e);
      this.status = "error";
      this.notifyStats();
    }
  }

  public disconnect(): void {
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
    this.status = "disconnected";
    this.notifyStats();
  }

  public getLatestGhost(): GhostSnapshot | null {
    if (!this.showGhostClones) return null;
    return this.latestGhostSnapshot;
  }

  public getStats(): RelayStats {
    return {
      status: this.status,
      url: this.url,
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      lastRttMs: this.lastRttMs,
      minRttMs: this.minRttMs === Infinity ? 0 : this.minRttMs,
      maxRttMs: this.maxRttMs,
      avgRttMs: this.packetsReceived > 0 ? this.totalRttMs / this.packetsReceived : 0,
      sendRateHz: this.sendRateHz,
    };
  }

  /**
   * Called on every game loop tick. If enough time has passed based on sendRateHz,
   * sends current state to the 3rd party relay server.
   */
  public update(character: Character, objects: GameObject[], nowMs: number): void {
    if (this.status !== "connected" || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const intervalMs = 1000 / this.sendRateHz;
    if (nowMs - this.lastSendTime < intervalMs) {
      return;
    }
    this.lastSendTime = nowMs;

    const packet = {
      type: "pc_state_sync",
      seq: ++this.seq,
      sentAt: performance.now(),
      character: {
        id: "player",
        x: Number(character.position.x.toFixed(3)),
        y: Number(character.position.y.toFixed(3)),
        z: Number(character.position.z.toFixed(3)),
        vx: Number(character.velocity.x.toFixed(3)),
        vy: Number(character.velocity.y.toFixed(3)),
        radius: character.colliderRadius,
        color: character.color,
        isClimbing: character.isClimbing,
        isAboveWalls: character.isAboveWalls,
      },
      objects: objects.map((obj) => ({
        id: obj.id,
        name: obj.name,
        x: Number(obj.position.x.toFixed(3)),
        y: Number(obj.position.y.toFixed(3)),
        z: Number(obj.position.z.toFixed(3)),
        vx: Number(obj.velocity.x.toFixed(3)),
        vy: Number(obj.velocity.y.toFixed(3)),
        radius: obj.colliderRadius,
        color: obj.color,
        shape: obj.visualShape,
        isHeld: obj.isHeld,
        heldBy: obj.heldBy ? (obj.heldBy === character ? "player" : obj.heldBy.id) : null,
        isAboveWalls: obj.isAboveWalls,
      })),
    };

    try {
      this.socket.send(JSON.stringify(packet));
      this.packetsSent++;
      this.notifyStats();
    } catch (err) {
      console.warn("[RelayClient] Error sending packet:", err);
    }
  }

  private handleMessage(data: string | Blob): void {
    if (typeof data !== "string") return;

    // Ignore non-JSON server banners (e.g. echo.websocket.org greeting)
    if (!data.startsWith("{")) return;

    try {
      const parsed = JSON.parse(data);
      if (parsed.type !== "pc_state_sync" || typeof parsed.sentAt !== "number") {
        return;
      }

      const receivedAt = performance.now();
      const rttMs = Math.max(0, receivedAt - parsed.sentAt);

      this.packetsReceived++;
      this.lastRttMs = rttMs;
      if (rttMs < this.minRttMs) this.minRttMs = rttMs;
      if (rttMs > this.maxRttMs) this.maxRttMs = rttMs;
      this.totalRttMs += rttMs;

      this.latestGhostSnapshot = {
        seq: parsed.seq,
        sentAt: parsed.sentAt,
        receivedAt,
        rttMs,
        character: parsed.character,
        objects: parsed.objects || [],
      };

      this.notifyStats();
      if (this.onSnapshotReceived) {
        this.onSnapshotReceived(this.latestGhostSnapshot);
      }
    } catch (e) {
      // Ignored malformed payload
    }
  }

  private notifyStats(): void {
    if (this.onStatsChange) {
      this.onStatsChange(this.getStats());
    }
  }
}
