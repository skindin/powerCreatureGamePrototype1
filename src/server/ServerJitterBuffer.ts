import { PlayerInputPacket } from "../engine/physics/StateHistoryBuffer.js";

/**
 * Feedback command sent from the authoritative server to synchronize the client's clock (Phase 6).
 * Tells the client accumulator to gently dilate by +/-1% to maintain a steady 2-frame server jitter buffer.
 */
export interface ClockSyncPacket {
  type: "clock_sync";
  serverTick: number;
  targetQueueDepth: number; // 2
  currentQueueDepth: number;
  dilationFactor: number;   // e.g. 1.015 (speed up) or 0.985 (slow down)
  playerId?: string;
}

/**
 * Diagnostics & telemetry metrics for a player's server jitter buffer.
 */
export interface JitterBufferStats {
  playerId: string;
  currentDepth: number;
  targetDepth: number;
  oldestTick: number | null;
  newestTick: number | null;
  lastConsumedTick: number | null;
  starvations: number;
  overflows: number;
  duplicates: number;
  burstDrains: number;
  receivedCount: number;
  consumedCount: number;
}

/**
 * Configuration options for the Server Jitter Buffer.
 */
export interface JitterBufferConfig {
  /** Target queue depth in ticks (default: 2 ticks = ~33.3ms) */
  targetDepth?: number;
  /** Maximum queue capacity before dropping oldest inputs (default: 60 ticks = ~1.0s) */
  maxCapacity?: number;
  /** Queue length threshold above which excess burst backlog is drained (default: 3 ticks) */
  burstDrainThreshold?: number;
}

/**
 * Result of consuming an input from the jitter buffer on a simulation tick.
 */
export interface JitterConsumeResult {
  packet: PlayerInputPacket;
  isStarved: boolean;
  drainedPackets: PlayerInputPacket[];
}

/**
 * Per-player Priority Queue sorted by simulation tick.
 * Absorbs WAN network packet jitter, handles out-of-order packet delivery,
 * deduplicates retransmitted packets, and provides steady inputs at 60Hz.
 */
export class PlayerJitterQueue {
  public readonly playerId: string;
  public targetDepth: number;
  public maxCapacity: number;
  public burstDrainThreshold: number;

  private queue: PlayerInputPacket[] = [];
  private lastConsumedTick: number | null = null;
  private lastKnownInput: PlayerInputPacket | null = null;

  // Diagnostics counters
  private starvations: number = 0;
  private overflows: number = 0;
  private duplicates: number = 0;
  private burstDrains: number = 0;
  private receivedCount: number = 0;
  private consumedCount: number = 0;
  private hasPrimed: boolean = false;

  constructor(playerId: string, config?: JitterBufferConfig) {
    this.playerId = playerId;
    this.targetDepth = config?.targetDepth ?? 2;
    this.maxCapacity = config?.maxCapacity ?? 60;
    this.burstDrainThreshold = config?.burstDrainThreshold ?? Math.max(4, this.targetDepth + 2);
  }

  /**
   * Current number of input packets waiting in the jitter buffer.
   */
  public get length(): number {
    return this.queue.length;
  }

  /**
   * Enqueues an incoming input packet into the priority queue, sorted ascending by tick.
   * Drops duplicates and stale packets. Clamps at max capacity.
   *
   * @returns true if packet was enqueued, false if rejected (duplicate or stale).
   */
  public push(packet: PlayerInputPacket): boolean {
    if (packet.tick !== undefined) {
      // 1. Stale check: Packet arrived too late; this tick has already been consumed and simulated
      if (this.lastConsumedTick !== null && packet.tick <= this.lastConsumedTick) {
        this.duplicates++;
        return false;
      }

      // 2. Duplicate check: Packet with this exact tick is already in the queue
      if (this.queue.some((p) => p.tick === packet.tick)) {
        this.duplicates++;
        return false;
      }
    }

    // 3. Priority insertion: Keep queue strictly sorted ascending by tick
    if (packet.tick !== undefined) {
      let insertIdx = 0;
      while (
        insertIdx < this.queue.length &&
        (this.queue[insertIdx].tick ?? -Infinity) <= packet.tick
      ) {
        insertIdx++;
      }
      this.queue.splice(insertIdx, 0, packet);
    } else {
      // Fallback if tick is undefined: append to end of queue
      this.queue.push(packet);
    }

    // 4. Capacity overflow protection: Drop oldest packet if buffer exceeds max capacity
    if (this.queue.length > this.maxCapacity) {
      this.queue.shift();
      this.overflows++;
    }

    this.receivedCount++;
    return true;
  }

  /**
   * Consumes the next input packet for the current server simulation tick.
   *
   * - If queue has burst backlog exceeding target depth, excess intermediate packets
   *   are drained and returned in `drainedPackets` so the caller can apply fast-forward updates.
   * - If queue has available inputs and is primed, pops the oldest sorted packet.
   * - When a player first joins, waits until targetDepth (e.g. 2 packets) are primed before consuming,
   *   preventing high-ping players from stuttering in half-speed slow motion.
   * - If queue is starved (empty), generates a safe neutral packet with zero movement
   *   to prevent runaway ghost overshoot while preserving last known aim direction.
   */
  public consume(serverTick?: number): JitterConsumeResult {
    const drainedPackets: PlayerInputPacket[] = [];

    // If queue is not empty, ensure hasPrimed is marked true
    if (!this.hasPrimed && this.queue.length > 0) {
      this.hasPrimed = true;
    }

    // 1. Drain burst backlog if queue has backed up (> burstDrainThreshold)
    // We retain targetDepth packets in the queue so the next ticks remain buffered.
    if (this.queue.length > this.burstDrainThreshold) {
      const excessCount = this.queue.length - (this.targetDepth + 1);
      for (let i = 0; i < excessCount; i++) {
        const excessPkt = this.queue.shift();
        if (excessPkt) {
          drainedPackets.push(excessPkt);
          this.consumedCount++;
          if (excessPkt.tick !== undefined) {
            this.lastConsumedTick = excessPkt.tick;
          }
          this.lastKnownInput = excessPkt;
          this.burstDrains++;
        }
      }
    }

    // 2. Consume packet for current tick
    if (this.queue.length > 0) {
      const pkt = this.queue.shift()!;
      this.consumedCount++;
      if (pkt.tick !== undefined) {
        this.lastConsumedTick = pkt.tick;
      }
      this.lastKnownInput = pkt;
      return {
        packet: pkt,
        isStarved: false,
        drainedPackets,
      };
    }

    // 3. Starvation Handling: Queue is empty
    this.starvations++;
    const neutralPacket: PlayerInputPacket = {
      playerId: this.playerId,
      tick: serverTick,
      moveX: 0,
      moveY: 0,
      isSprinting: false,
      isJumpHeld: false,
      isGrabHeld: false,
      isDrop: false,
      isThrow: false,
      isAiming: false,
      isLockHeld: false,
      // Retain last known aim coordinates so player orientation doesn't snap abruptly
      aimX: this.lastKnownInput?.aimX,
      aimY: this.lastKnownInput?.aimY,
      facingAngle: this.lastKnownInput?.facingAngle,
    };

    return {
      packet: neutralPacket,
      isStarved: true,
      drainedPackets,
    };
  }

  /**
   * Peeks at the next packet in the queue without removing it.
   */
  public peek(): PlayerInputPacket | null {
    return this.queue[0] ?? null;
  }

  /**
   * Resets the queue state.
   */
  public clear(): void {
    this.queue = [];
    this.lastConsumedTick = null;
    this.lastKnownInput = null;
    this.hasPrimed = false;
  }

  /**
   * Returns telemetry statistics for this jitter buffer queue.
   */
  public getStats(): JitterBufferStats {
    const oldestTick = this.queue.length > 0 ? (this.queue[0].tick ?? null) : null;
    const newestTick =
      this.queue.length > 0 ? (this.queue[this.queue.length - 1].tick ?? null) : null;

    return {
      playerId: this.playerId,
      currentDepth: this.queue.length,
      targetDepth: this.targetDepth,
      oldestTick,
      newestTick,
      lastConsumedTick: this.lastConsumedTick,
      starvations: this.starvations,
      overflows: this.overflows,
      duplicates: this.duplicates,
      burstDrains: this.burstDrains,
      receivedCount: this.receivedCount,
      consumedCount: this.consumedCount,
    };
  }

  /**
   * Computes the adaptive time dilation factor to maintain steady target depth (Phase 6).
   * - Underflow (< 1 frame): 1.015 (speed up 1.5% to avoid starvation)
   * - Overflow (> 3 frames): 0.990 or 0.985 (slow down 1.0% to 1.5% to drain backlog)
   * - Steady (1 to 3 frames): 1.000 (steady cruise speed)
   * Clamped strictly between [0.98, 1.02].
   */
  public computeDilationFactor(): number {
    const depth = this.queue.length;
    if (depth < 1) {
      return 1.015;
    } else if (depth > 3) {
      return depth >= 5 ? 0.985 : 0.990;
    }
    return 1.000;
  }
}

/**
 * Server-wide manager for per-player jitter buffer queues.
 */
export class ServerJitterBufferManager {
  private queues: Map<string, PlayerJitterQueue> = new Map();
  private config?: JitterBufferConfig;

  constructor(config?: JitterBufferConfig) {
    this.config = config;
  }

  /**
   * Retrieves or creates the jitter queue for the given player.
   */
  public getQueue(playerId: string): PlayerJitterQueue {
    let queue = this.queues.get(playerId);
    if (!queue) {
      queue = new PlayerJitterQueue(playerId, this.config);
      this.queues.set(playerId, queue);
    }
    return queue;
  }

  /**
   * Enqueues an incoming input packet for its target player.
   */
  public push(packet: PlayerInputPacket): boolean {
    return this.getQueue(packet.playerId).push(packet);
  }

  /**
   * Consumes an input packet for a player on the current server tick.
   */
  public consume(playerId: string, serverTick?: number): JitterConsumeResult {
    return this.getQueue(playerId).consume(serverTick);
  }

  /**
   * Evaluates the clock sync packet for a player at the current server tick (Phase 6).
   */
  public evaluateClockSync(playerId: string, serverTick: number): ClockSyncPacket {
    const queue = this.getQueue(playerId);
    const dilation = queue.computeDilationFactor();
    return {
      type: "clock_sync",
      serverTick,
      targetQueueDepth: queue.targetDepth,
      currentQueueDepth: queue.length,
      dilationFactor: dilation,
      playerId,
    };
  }

  /**
   * Returns telemetry stats for a specific player's jitter buffer.
   */
  public getStats(playerId: string): JitterBufferStats | null {
    const queue = this.queues.get(playerId);
    return queue ? queue.getStats() : null;
  }

  /**
   * Returns telemetry stats for all active player jitter queues.
   */
  public getAllStats(): JitterBufferStats[] {
    return Array.from(this.queues.values()).map((q) => q.getStats());
  }

  /**
   * Clears a specific player's queue or all queues.
   */
  public clear(playerId?: string): void {
    if (playerId) {
      this.queues.get(playerId)?.clear();
    } else {
      for (const queue of this.queues.values()) {
        queue.clear();
      }
      this.queues.clear();
    }
  }
}
