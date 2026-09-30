import { WorldSnapshot } from "./Snapshot.js";

export type ReliableActionType = "pickup" | "drop" | "throw";

/**
 * High-priority action command requiring delivery confirmation and automatic retransmission.
 */
export interface ReliableActionCommand {
  actionId: string;
  type: ReliableActionType;
  tick: number;
  timestamp: number;
  playerId: string;
  targetObjectId?: string | null;
  aimX?: number;
  aimY?: number;
  isLockHeld?: boolean;
}

/**
 * Encapsulates the exact input state dispatched for a single player on a specific physics tick.
 */
export interface PlayerInputPacket {
  tick?: number;
  subTickTime?: number;
  playerId: string;
  moveX: number;
  moveY: number;
  isSprinting: boolean;
  isJumpHeld: boolean;
  isGrabHeld: boolean;
  grabTargetObjectId?: string | null;
  isDrop?: boolean;
  isThrow?: boolean;
  aimX?: number;
  aimY?: number;
  isAiming: boolean;
  isLockHeld: boolean;
  reliableActions?: ReliableActionCommand[];
}

/**
 * Historical record of a simulation frame, storing the physical world snapshot and player inputs.
 */
export interface HistoryFrame {
  tick: number;
  timestamp: number;
  snapshot: WorldSnapshot;
  inputs: Map<string, PlayerInputPacket>;
}

/**
 * Result data from a historical rollback and re-simulation test.
 */
export interface RollbackResult {
  success: boolean;
  startTick: number;
  endTick: number;
  ticksReplayed: number;
  durationMs: number;
  diverged: boolean;
  entityId?: string;
  maxDeltaPos: number;
  maxDeltaVel: number;
  message: string;
}

/**
 * StateHistoryBuffer
 *
 * High-performance circular ring buffer storing recent physics snapshots and player inputs.
 * Supports dynamic capacity resizing live, O(1) tick lookup, and hard rollback limits to protect framerate.
 */
export class StateHistoryBuffer {
  private buffer: (HistoryFrame | null)[];
  private capacity: number;
  private oldestTick: number = -1;
  private latestTick: number = -1;
  public maxRollbackTicks: number = 30; // Hard clamp to prevent frame stutters

  constructor(capacity: number = 60, maxRollbackTicks: number = 30) {
    this.capacity = Math.max(10, capacity);
    this.maxRollbackTicks = Math.max(5, maxRollbackTicks);
    this.buffer = new Array(this.capacity).fill(null);
  }

  /**
   * Resizes the ring buffer capacity dynamically while preserving recent history.
   */
  public setCapacity(newCapacity: number): void {
    const clamped = Math.max(10, Math.min(180, newCapacity));
    if (clamped === this.capacity) return;

    const validFrames = this.getAllFrames();
    this.capacity = clamped;
    this.buffer = new Array(clamped).fill(null);
    this.oldestTick = -1;
    this.latestTick = -1;

    // Retain newest frames up to the new capacity
    const startIdx = Math.max(0, validFrames.length - clamped);
    for (let i = startIdx; i < validFrames.length; i++) {
      const f = validFrames[i];
      this.push(f.tick, f.snapshot, f.inputs);
    }
  }

  public getCapacity(): number {
    return this.capacity;
  }

  /**
   * Pushes a new frame into the circular buffer at index (tick % capacity).
   */
  public push(tick: number, snapshot: WorldSnapshot, inputs: Map<string, PlayerInputPacket>): void {
    const idx = tick % this.capacity;
    this.buffer[idx] = {
      tick,
      timestamp: performance.now(),
      snapshot,
      inputs: new Map(inputs),
    };

    if (this.oldestTick === -1 || tick < this.oldestTick) {
      this.oldestTick = tick;
    }
    if (this.latestTick === -1 || tick > this.latestTick) {
      this.latestTick = tick;
    }

    // Prune oldest tick if capacity was exceeded
    if (this.latestTick - this.oldestTick >= this.capacity) {
      this.oldestTick = this.latestTick - this.capacity + 1;
    }
  }

  /**
   * Retrieves the historical frame for a specific simulation tick, or null if outside the buffer.
   */
  public get(tick: number): HistoryFrame | null {
    if (tick < this.oldestTick || tick > this.latestTick) return null;
    const idx = tick % this.capacity;
    const frame = this.buffer[idx];
    if (frame && frame.tick === tick) {
      return frame;
    }
    return null;
  }

  /**
   * Updates/rewrites the physical snapshot for an existing historical frame (used during reconciliation).
   */
  public updateSnapshot(tick: number, snapshot: WorldSnapshot): boolean {
    if (tick < this.oldestTick || tick > this.latestTick) return false;
    const idx = tick % this.capacity;
    const frame = this.buffer[idx];
    if (frame && frame.tick === tick) {
      frame.snapshot = snapshot;
      return true;
    }
    return false;
  }

  public getOldestTick(): number {
    return this.oldestTick;
  }

  public getLatestTick(): number {
    return this.latestTick;
  }

  public getCount(): number {
    if (this.latestTick === -1 || this.oldestTick === -1) return 0;
    return Math.max(0, this.latestTick - this.oldestTick + 1);
  }

  /**
   * Returns all valid frames currently retained in chronological order.
   */
  public getAllFrames(): HistoryFrame[] {
    const list: HistoryFrame[] = [];
    if (this.oldestTick === -1) return list;
    for (let t = this.oldestTick; t <= this.latestTick; t++) {
      const frame = this.get(t);
      if (frame) list.push(frame);
    }
    return list;
  }

  /**
   * Clears all buffered entries.
   */
  public clear(): void {
    this.buffer.fill(null);
    this.oldestTick = -1;
    this.latestTick = -1;
  }
}
