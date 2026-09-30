import { Character } from "../character/Character.js";
import { GameObject } from "../engine/GameObject.js";
import { Arena } from "../engine/Arena.js";
import { PlayerInputPacket, ReliableActionCommand } from "../engine/physics/StateHistoryBuffer.js";
import { ServerGameSimulation } from "../server/ServerGameSimulation.js";

export interface GhostEntityState {
  id: string;
  name?: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz?: number;
  surfaceZ?: number;
  isGrounded?: boolean;
  radius: number;
  color?: string;
  shape?: "circle" | "box";
  isHeld?: boolean;
  heldBy?: string | null;
  isAboveWalls?: boolean;
  isClimbing?: boolean;
  angX?: number;
  angY?: number;
  angZ?: number;
  isSleeping?: boolean;
}

import { ClockSyncPacket } from "../server/ServerJitterBuffer.js";

export interface GhostSnapshot {
  seq: number;
  sentAt: number;
  receivedAt: number;
  rttMs: number;
  character: GhostEntityState;
  objects: GhostEntityState[];
  source?: "physics_sim" | "echo";
  ackActionIds?: string[];
  clockSync?: ClockSyncPacket;
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
  serverMode: "physics_sim" | "echo_snapshot";
  serverTick: number;
  unackedActionsCount: number;
  serverJitterDepth?: number;
  serverJitterStarvations?: number;
  serverClockSync?: ClockSyncPacket;
  timeDilation?: number;
}

export class RelayClient {
  public url: string;
  public status: RelayStatus = "disconnected";
  public sendRateHz: number = 30; // 30 updates per second
  public showGhostClones: boolean = true;
  public lerpGhosts: boolean = true;
  public ghostLerpRatePercent: number = 35.0; // percent of delta distance to move per frame at 60 FPS (100% = instant snap)
  public serverMode: "physics_sim" | "echo_snapshot" = "physics_sim"; // Phase 4: Authoritative Server Physics Sim vs Raw Positional Echo
  public serverSimulation: ServerGameSimulation = new ServerGameSimulation();

  private socket: WebSocket | null = null;
  private seq: number = 0;
  private lastSendTime: number = 0;
  private pendingInputsToSend: PlayerInputPacket[] = [];
  private latestGhostSnapshot: GhostSnapshot | null = null;
  private currentGhostSnapshot: GhostSnapshot | null = null;

  // Reliable Action Outbox & Retransmission Queue (Pickup, Drop, Throw)
  private unacknowledgedActions: Map<string, ReliableActionCommand> = new Map();

  public queueReliableAction(action: ReliableActionCommand): void {
    this.unacknowledgedActions.set(action.actionId, action);
  }

  public acknowledgeActions(ackIds: string[]): void {
    for (const id of ackIds) {
      this.unacknowledgedActions.delete(id);
    }
  }

  public get unackedActionsCount(): number {
    return this.unacknowledgedActions.size;
  }

  // Stats
  private packetsSent: number = 0;
  private packetsReceived: number = 0;
  private lastRttMs: number = 0;
  private minRttMs: number = Infinity;
  private maxRttMs: number = 0;
  private totalRttMs: number = 0;

  public onStatsChange?: (stats: RelayStats) => void;
  public onSnapshotReceived?: (snapshot: GhostSnapshot) => void;
  public onClockSync?: (sync: ClockSyncPacket) => void;
  public latestClockSync: ClockSyncPacket | null = null;

  constructor(url: string = "wss://echo.websocket.org") {
    this.url = url;
  }

  /**
   * Advances the authoritative server physics simulation by 1 fixed tick on the continuous 60Hz clock.
   * Called on every game loop physics tick so the server simulation runs independently at full 60Hz speed.
   */
  public stepServerPhysics(dt: number = 1 / 60): void {
    if (this.serverMode !== "physics_sim") return;

    // Step the independent server physics world
    this.serverSimulation.step(dt);

    // Capture the authoritative physical state directly from the 60Hz simulation
    const simSnap = this.serverSimulation.getGhostSnapshot(this.lastRttMs);
    simSnap.source = "physics_sim";
    if (simSnap.ackActionIds && simSnap.ackActionIds.length > 0) {
      this.acknowledgeActions(simSnap.ackActionIds);
    }
    this.latestGhostSnapshot = simSnap;

    // In physics_sim mode, the ghost IS a live 60Hz physics world!
    // Directly mirror to currentGhostSnapshot so it renders the real-time server physics
    // without sluggish visual lerp delay.
    this.currentGhostSnapshot = {
      ...simSnap,
      character: { ...simSnap.character },
      objects: simSnap.objects ? simSnap.objects.map((o) => ({ ...o })) : [],
    };
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

      this.socket.onerror = () => {
        this.status = "error";
        this.notifyStats();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };
    } catch (e) {
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

  /**
   * Updates the ghost interpolation state towards the latest received snapshot.
   * Interpolates at ghostLerpRatePercent % per frame (normalized to 60 FPS).
   * 100% snaps instantly each frame with zero delay.
   * Enforces solid ground/surface contact when target lands.
   */
  public updateGhostLerp(dt: number): void {
    if (this.serverMode === "physics_sim") {
      // In physics_sim mode, the ghost is updated continuously by stepServerPhysics()
      return;
    }

    if (!this.latestGhostSnapshot) {
      this.currentGhostSnapshot = null;
      return;
    }

    if (!this.lerpGhosts || this.ghostLerpRatePercent <= 0) {
      this.currentGhostSnapshot = this.latestGhostSnapshot;
      return;
    }

    // Normalized frame factor: 1.0 at 60 FPS (dt = 1/60s)
    const dt60 = Math.min(3.0, Math.max(0.05, dt * 60));
    const rateFrac = Math.min(1.0, Math.max(0.0, this.ghostLerpRatePercent / 100));
    const moveFrac = rateFrac >= 1.0 ? 1.0 : (1.0 - Math.pow(1.0 - rateFrac, dt60));

    if (!this.currentGhostSnapshot) {
      this.currentGhostSnapshot = {
        ...this.latestGhostSnapshot,
        character: { ...this.latestGhostSnapshot.character },
        objects: this.latestGhostSnapshot.objects ? this.latestGhostSnapshot.objects.map(o => ({ ...o })) : [],
      };
      return;
    }

    const target = this.latestGhostSnapshot;
    const cur = this.currentGhostSnapshot;

    cur.rttMs = target.rttMs;
    cur.seq = target.seq;
    cur.sentAt = target.sentAt;
    cur.receivedAt = target.receivedAt;

    // 1. Lerp Character
    if (target.character) {
      if (!cur.character) {
        cur.character = { ...target.character };
      } else {
        const cTar = target.character;
        const cCur = cur.character;
        cCur.x += (cTar.x - cCur.x) * moveFrac;
        cCur.y += (cTar.y - cCur.y) * moveFrac;

        // Ground & surface contact enforcement
        const tarSurface = cTar.surfaceZ ?? 0;
        const isTarGrounded = Boolean(cTar.isGrounded || cTar.z <= tarSurface + 0.015);

        if (isTarGrounded) {
          // Target is in contact with ground or wall surface!
          // Snap directly if within touchdown range (0.22u) or lower to eliminate hover gap
          if (cCur.z <= tarSurface + 0.22 || cCur.z < cTar.z + 0.05) {
            cCur.z = tarSurface;
          } else {
            cCur.z += (tarSurface - cCur.z) * Math.min(1.0, moveFrac * 1.8);
          }
        } else {
          // Airborne
          cCur.z += (cTar.z - cCur.z) * moveFrac;
          if (Math.abs(cCur.z - cTar.z) < 0.005) {
            cCur.z = cTar.z;
          }
        }

        cCur.vx = cTar.vx;
        cCur.vy = cTar.vy;
        cCur.vz = cTar.vz;
        cCur.surfaceZ = cTar.surfaceZ;
        cCur.isGrounded = cTar.isGrounded;
        cCur.radius = cTar.radius;
        cCur.color = cTar.color;
        cCur.isHeld = cTar.isHeld;
        cCur.shape = cTar.shape;
        cCur.isAboveWalls = cTar.isAboveWalls;
        cCur.isClimbing = cTar.isClimbing;
      }
    }

    // 2. Lerp Objects
    if (target.objects) {
      if (!cur.objects) {
        cur.objects = target.objects.map(o => ({ ...o }));
      } else {
        const updatedObjects: GhostEntityState[] = [];
        for (const oTar of target.objects) {
          const existing = cur.objects.find(o => o.id === oTar.id);
          if (existing) {
            existing.x += (oTar.x - existing.x) * moveFrac;
            existing.y += (oTar.y - existing.y) * moveFrac;

            const tarSurface = oTar.surfaceZ ?? 0;
            const isTarGrounded = Boolean(oTar.isGrounded || oTar.z <= tarSurface + 0.015);

            if (isTarGrounded) {
              if (existing.z <= tarSurface + 0.22 || existing.z < oTar.z + 0.05) {
                existing.z = tarSurface;
              } else {
                existing.z += (tarSurface - existing.z) * Math.min(1.0, moveFrac * 1.8);
              }
            } else {
              existing.z += (oTar.z - existing.z) * moveFrac;
              if (Math.abs(existing.z - oTar.z) < 0.005) {
                existing.z = oTar.z;
              }
            }

            existing.vx = oTar.vx;
            existing.vy = oTar.vy;
            existing.vz = oTar.vz;
            existing.surfaceZ = oTar.surfaceZ;
            existing.isGrounded = oTar.isGrounded;
            existing.radius = oTar.radius;
            existing.color = oTar.color;
            existing.isHeld = oTar.isHeld;
            existing.shape = oTar.shape;
            existing.isAboveWalls = oTar.isAboveWalls;
            existing.isClimbing = oTar.isClimbing;
            updatedObjects.push(existing);
          } else {
            updatedObjects.push({ ...oTar });
          }
        }
        cur.objects = updatedObjects;
      }
    }
  }

  public getLatestGhost(): GhostSnapshot | null {
    if (!this.showGhostClones) return null;
    return this.lerpGhosts ? (this.currentGhostSnapshot ?? this.latestGhostSnapshot) : this.latestGhostSnapshot;
  }

  public syncServerWorld(arena: Arena, characters: Character[], objects: GameObject[]): void {
    this.serverSimulation.initializeFromWorld(arena, characters, objects);
    const snap = this.serverSimulation.getGhostSnapshot(this.lastRttMs);
    snap.source = "physics_sim";
    this.latestGhostSnapshot = snap;
    this.currentGhostSnapshot = {
      ...snap,
      character: { ...snap.character },
      objects: snap.objects ? snap.objects.map((o) => ({ ...o })) : [],
    };
  }

  public getStats(): RelayStats {
    const jitterStats = this.serverSimulation.getJitterStats("keyboard") || this.serverSimulation.getAllJitterStats()[0];
    const clockSync = this.latestClockSync || this.serverSimulation.getLatestClockSync("keyboard") || undefined;
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
      serverMode: this.serverMode,
      serverTick: this.serverSimulation.currentTick,
      unackedActionsCount: this.unacknowledgedActions.size,
      serverJitterDepth: jitterStats ? jitterStats.currentDepth : 0,
      serverJitterStarvations: jitterStats ? jitterStats.starvations : 0,
      serverClockSync: clockSync,
    };
  }

  /**
   * Streams player input packets and current local world state to the network relay.
   * Feeds the authoritative server physics simulation loopback or remote server.
   */
  public sendInput(
    inputs: Map<string, PlayerInputPacket>,
    tick: number,
    character: Character,
    objects: GameObject[],
    nowMs: number
  ): void {
    // Record current tick's input so no frames are dropped under reduced send rates or jitter
    for (const inp of inputs.values()) {
      this.pendingInputsToSend.push({ ...inp, tick });
    }

    if (this.status !== "connected" || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (this.pendingInputsToSend.length > 60) {
        this.pendingInputsToSend = this.pendingInputsToSend.slice(-60);
      }
      return;
    }

    const intervalMs = 1000 / this.sendRateHz;
    if (nowMs - this.lastSendTime < intervalMs) {
      return;
    }
    this.lastSendTime = nowMs;

    const inputList: PlayerInputPacket[] = this.pendingInputsToSend.length > 0
      ? [...this.pendingInputsToSend]
      : Array.from(inputs.values()).map((inp) => ({ ...inp, tick }));
    this.pendingInputsToSend = [];

    const packet = {
      type: "pc_player_input",
      seq: ++this.seq,
      sentAt: performance.now(),
      tick,
      inputs: inputList,
      // Retransmit all unacknowledged reliable actions with every packet until acknowledged
      reliableActions: Array.from(this.unacknowledgedActions.values()),
      // Fallback state sync for visual echo or dual validation
      character: {
        id: character.playerId || "player",
        x: Number(character.position.x.toFixed(3)),
        y: Number(character.position.y.toFixed(3)),
        z: Number(character.position.z.toFixed(3)),
        vx: Number(character.velocity.x.toFixed(3)),
        vy: Number(character.velocity.y.toFixed(3)),
        vz: Number((character.hasVerticalVelocity ? character.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((character.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: character.isRestingOnSurface || character.position.z <= 0.005,
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
        vz: Number((obj.hasVerticalVelocity ? obj.verticalVelocity : 0).toFixed(3)),
        surfaceZ: Number((obj.supportingSurfaceHeight ?? 0).toFixed(3)),
        isGrounded: obj.isRestingOnSurface || obj.position.z <= 0.005,
        radius: obj.colliderRadius,
        color: obj.color,
        shape: obj.visualShape,
        isHeld: obj.isHeld,
        heldBy: obj.heldBy ? (obj.heldBy === character ? "player" : obj.heldBy.id) : null,
        isAboveWalls: obj.isAboveWalls,
        angX: obj.rollModule ? Number(obj.rollModule.angularVelocity.x.toFixed(3)) : undefined,
        angY: obj.rollModule ? Number(obj.rollModule.angularVelocity.y.toFixed(3)) : undefined,
        angZ: obj.rollModule ? Number(obj.rollModule.angularVelocity.z.toFixed(3)) : undefined,
        isSleeping: obj.isSleeping,
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

  /**
   * Called on every game loop tick. Delegates to sendInput.
   */
  public update(character: Character, objects: GameObject[], nowMs: number): void {
    const dummyInputs = new Map<string, PlayerInputPacket>();
    dummyInputs.set(character.playerId || "keyboard", {
      playerId: character.playerId || "keyboard",
      moveX: character.velocity.x !== 0 ? Math.sign(character.velocity.x) : 0,
      moveY: character.velocity.y !== 0 ? Math.sign(character.velocity.y) : 0,
      isSprinting: character.isSprinting,
      isJumpHeld: character.isClimbing,
      isGrabHeld: false,
      isAiming: false,
      isLockHeld: false,
    });
    this.sendInput(dummyInputs, this.seq, character, objects, nowMs);
  }

  private handleMessage(data: string | Blob): void {
    if (typeof data !== "string") return;

    // Ignore non-JSON server banners (e.g. echo.websocket.org greeting)
    if (!data.startsWith("{")) return;

    try {
      const parsed = JSON.parse(data);

      if (parsed.type === "pc_player_input") {
        if (typeof parsed.sentAt !== "number") return;
        const receivedAt = performance.now();
        const rttMs = Math.max(0, receivedAt - parsed.sentAt);

        this.packetsReceived++;
        this.lastRttMs = rttMs;
        if (rttMs < this.minRttMs) this.minRttMs = rttMs;
        if (rttMs > this.maxRttMs) this.maxRttMs = rttMs;
        this.totalRttMs += rttMs;

        // 1. Process returned ACKs to purge delivered actions from retransmission outbox
        if (Array.isArray(parsed.ackActionIds) && parsed.ackActionIds.length > 0) {
          this.acknowledgeActions(parsed.ackActionIds);
        }

        if (this.serverMode === "physics_sim") {
          // Authoritative Server Physics Simulation (Phase 4):
          // Enqueue incoming player inputs returned from the WAN relay into the server input queue!
          if (Array.isArray(parsed.inputs)) {
            for (const inp of parsed.inputs) {
              this.serverSimulation.queueInput(inp);
            }
          }
          // Process and acknowledge high-priority reliable actions authoritatively
          if (Array.isArray(parsed.reliableActions) && parsed.reliableActions.length > 0) {
            const newlyAcked = this.serverSimulation.processReliableActions(parsed.reliableActions);
            this.acknowledgeActions(newlyAcked);
          }
          // Synchronize character: update position AND velocity from client telemetry packet
          // so server player ghost stays tightly locked to player position
          if (parsed.character) {
            this.serverSimulation.syncCharacterFromPacket(parsed.character);
          }
          // Synchronize freebody objects: update positions AND velocities from client packet
          // so server physics advances with the latest physical momentum!
          if (Array.isArray(parsed.objects)) {
            this.serverSimulation.syncObjectsFromPacket(parsed.objects);
          }

          // Phase 6: Clock Sync Feedback from authoritative server
          const simClockSync = this.serverSimulation.getLatestClockSync("keyboard");
          if (simClockSync) {
            this.latestClockSync = simClockSync;
            this.onClockSync?.(simClockSync);
          } else if (parsed.clockSync) {
            this.latestClockSync = parsed.clockSync;
            this.onClockSync?.(parsed.clockSync);
          }
          // Note: Physics simulation advances on its continuous 60Hz physics clock via stepServerPhysics(),
          // NOT per arriving network packet!
        } else {
          // Fallback positional echo
          this.latestGhostSnapshot = {
            seq: parsed.seq,
            sentAt: parsed.sentAt,
            receivedAt,
            rttMs,
            character: parsed.character,
            objects: parsed.objects || [],
            source: "echo",
          };
        }

        this.notifyStats();
        if (this.onSnapshotReceived && this.latestGhostSnapshot) {
          this.onSnapshotReceived(this.latestGhostSnapshot);
        }
      } else if (parsed.type === "pc_state_sync") {
        if (typeof parsed.sentAt !== "number") return;
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
          source: "echo",
        };

        this.notifyStats();
        if (this.onSnapshotReceived && this.latestGhostSnapshot) {
          this.onSnapshotReceived(this.latestGhostSnapshot);
        }
      } else if (parsed.type === "pc_server_snapshot") {
        // Direct broadcast from standalone Node.js GameServer
        const receivedAt = performance.now();
        this.packetsReceived++;
        this.latestGhostSnapshot = {
          ...parsed.snapshot,
          receivedAt,
          source: "physics_sim",
        };
        this.notifyStats();
        if (this.onSnapshotReceived && this.latestGhostSnapshot) {
          this.onSnapshotReceived(this.latestGhostSnapshot);
        }
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
