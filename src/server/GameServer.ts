import { ServerGameSimulation, ServerSimConfig } from "./ServerGameSimulation.js";
import { PlayerInputPacket } from "../engine/physics/StateHistoryBuffer.js";
import { GhostSnapshot } from "../network/RelayClient.js";
import { AuthoritativeWorldSnapshot } from "./AuthoritativeSnapshotManager.js";

export interface ConnectedClient {
  id: string;
  playerNumber: number;
  send: (msg: string) => void;
  lastPingMs: number;
}

/**
 * Authoritative Server Runner (Phase 4).
 * Manages the 60Hz deterministic fixed-timestep game tick loop,
 * client connections, input streaming, and authoritative broadcast.
 */
export class GameServer {
  public simulation: ServerGameSimulation;
  public isRunning: boolean = false;
  public clients: Map<string, ConnectedClient> = new Map();

  private loopInterval: any = null;
  private lastTimeHr: bigint = process.hrtime.bigint();
  private accumulator: number = 0;
  private readonly fixedDt: number = 1 / 60; // 16.6667ms

  public onSnapshotBroadcast?: (snapshot: GhostSnapshot, worldSnapshot?: AuthoritativeWorldSnapshot) => void;

  constructor(config?: ServerSimConfig) {
    this.simulation = new ServerGameSimulation(config);
    this.simulation.initializeDefaultScenario();
  }

  /**
   * Starts the 60Hz fixed-timestep authoritative simulation loop with hrtime drift correction.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimeHr = process.hrtime.bigint();
    this.accumulator = 0;

    // Run high-frequency ticker (~4ms) to evaluate fixed 60Hz intervals
    this.loopInterval = setInterval(() => {
      this.tick();
    }, 4);

    console.log(`[GameServer] Authoritative 60Hz simulation started. Tick: #${this.simulation.currentTick}`);
  }

  /**
   * Stops the server loop.
   */
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    console.log(`[GameServer] Authoritative simulation stopped at tick #${this.simulation.currentTick}`);
  }

  /**
   * Internal high-resolution tick step with accumulator
   */
  private tick(): void {
    if (!this.isRunning) return;

    const nowHr = process.hrtime.bigint();
    const elapsedSec = Number(nowHr - this.lastTimeHr) / 1e9;
    this.lastTimeHr = nowHr;

    this.accumulator += Math.min(0.2, elapsedSec);

    while (this.accumulator >= this.fixedDt) {
      this.simulation.step(this.fixedDt);
      this.accumulator -= this.fixedDt;

      // Broadcast authoritative state if broadcast is due (30Hz or 60Hz, Phase 7.1)
      if (this.simulation.snapshotManager.isBroadcastDue(this.simulation.currentTick)) {
        const worldSnapshot = this.simulation.getAuthoritativeWorldSnapshot();
        const snapshot = this.simulation.getGhostSnapshot(0);
        this.broadcastSnapshot(snapshot, worldSnapshot);
      }
    }
  }

  /**
   * Receives an input packet from a connected client.
   */
  public handleClientInput(packet: PlayerInputPacket): void {
    this.simulation.queueInput(packet);
  }

  /**
   * Broadcasts the authoritative snapshot to all connected clients.
   */
  public broadcastSnapshot(snapshot: GhostSnapshot, worldSnapshot?: AuthoritativeWorldSnapshot): void {
    if (this.onSnapshotBroadcast) {
      this.onSnapshotBroadcast(snapshot, worldSnapshot);
    }

    if (this.clients.size === 0) return;
    const payload = JSON.stringify({
      type: "pc_server_snapshot",
      snapshot,
      worldSnapshot,
    });

    for (const client of this.clients.values()) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn(`[GameServer] Failed to send snapshot to client ${client.id}:`, err);
      }
    }
  }

  /**
   * Registers a newly joined player client.
   */
  public registerClient(client: ConnectedClient): void {
    this.clients.set(client.id, client);
    console.log(`[GameServer] Client connected: ${client.id} (Total: ${this.clients.size})`);
  }

  /**
   * Unregisters a disconnected player client.
   */
  public unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[GameServer] Client disconnected: ${clientId} (Remaining: ${this.clients.size})`);
  }
}
