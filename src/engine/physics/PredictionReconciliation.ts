import { Character } from "../../character/Character.js";
import { Arena } from "../Arena.js";
import { GameObject } from "../GameObject.js";
import { PlayerManager } from "../PlayerManager.js";
import { AuthoritativeWorldSnapshot, CompressedEntityState } from "../../server/AuthoritativeSnapshotManager.js";
import { CollisionMode, CollisionResolver } from "./CollisionResolver.js";
import { SnapshotManager, WorldSnapshot } from "./Snapshot.js";
import { StateHistoryBuffer } from "./StateHistoryBuffer.js";

export interface ReconciliationConfig {
  posDeadzone: number; // units, default 0.05 (~1.8px)
  velDeadzone: number; // units/s, default 0.15
  maxTeleportDistance: number; // units, beyond which visual damping snaps immediately (default 4.0)
  visualDecayFactor: number; // default 0.70x per frame
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  posDeadzone: 0.05,
  velDeadzone: 0.15,
  maxTeleportDistance: 4.0,
  visualDecayFactor: 0.70,
};

export interface ReconciliationResult {
  tick: number;
  reconciled: boolean;
  reason: "success_within_deadzone" | "frame_outside_buffer" | "no_client_tick" | "entity_not_found" | "corrected_divergence";
  divergedEntityIds: string[];
  maxDeltaPos: number;
  maxDeltaVel: number;
  ticksReplayed: number;
  durationMs: number;
}

/**
 * PredictionReconciliation
 *
 * Implements Phase 8 Client Prediction Reconciliation & Visual Smoothing Dampener:
 * 1. Snapshot Comparison & Error Deadzones: Compares incoming authoritative server snapshots with local client history
 *    at the exact client input tick acknowledged by the server (lastProcessedInputTick).
 * 2. Misprediction Correction: When divergence exceeds deadzones, rewinds the local player to the server state,
 *    and fast-forwards physics re-simulation to the present using recorded historical player inputs.
 * 3. Render Smoothing Dampener: Offsets rendering to prevent visual popping (0.000u pop) and glides smoothly to zero over 3-5 frames.
 */
export class PredictionReconciliation {
  public static config: ReconciliationConfig = { ...DEFAULT_RECONCILIATION_CONFIG };
  public static totalReconciliations: number = 0;
  public static totalSuccesses: number = 0;
  public static lastReconciliationTime: number = 0;
  public static lastResult: ReconciliationResult | null = null;

  /**
   * Compares the authoritative server state of the target entity with the client's historical prediction.
   */
  public static checkDivergence(
    serverEntities: CompressedEntityState[],
    clientSnapshot: WorldSnapshot,
    targetEntityId: string,
    config: ReconciliationConfig = this.config
  ): {
    diverged: boolean;
    divergedEntityIds: string[];
    maxDeltaPos: number;
    maxDeltaVel: number;
  } {
    let maxDeltaPos = 0;
    let maxDeltaVel = 0;
    const divergedEntityIds: string[] = [];

    const sEnt = serverEntities.find((e) => e.id === targetEntityId);
    const cEnt = clientSnapshot.entities.find((e) => e.id === targetEntityId);

    if (sEnt && cEnt) {
      const deltaX = Math.abs(sEnt.x - cEnt.x);
      const deltaY = Math.abs(sEnt.y - cEnt.y);
      const deltaZ = Math.abs(sEnt.z - cEnt.z);
      const deltaPos = Math.hypot(deltaX, deltaY, deltaZ);

      const deltaVx = Math.abs(sEnt.vx - cEnt.vx);
      const deltaVy = Math.abs(sEnt.vy - cEnt.vy);
      const deltaVz = Math.abs(sEnt.vz - cEnt.vz);
      const deltaVel = Math.hypot(deltaVx, deltaVy, deltaVz);

      if (deltaPos > maxDeltaPos) maxDeltaPos = deltaPos;
      if (deltaVel > maxDeltaVel) maxDeltaVel = deltaVel;

      const isPosDiverged = deltaPos >= config.posDeadzone;
      const isVelDiverged = deltaVel >= config.velDeadzone;
      const isHeldDiverged = (sEnt.heldBy ?? null) !== (cEnt.heldById ?? null);
      const isClimbDiverged = Boolean(sEnt.isClimbing) !== Boolean(cEnt.isClimbing);

      if (isPosDiverged || isVelDiverged || isHeldDiverged || isClimbDiverged) {
        divergedEntityIds.push(sEnt.id);
      }
    }

    return {
      diverged: divergedEntityIds.length > 0,
      divergedEntityIds,
      maxDeltaPos,
      maxDeltaVel,
    };
  }

  /**
   * Evaluates an incoming authoritative world snapshot against local prediction history for the local player.
   * If within deadzones, confirms prediction and discards older history.
   * If diverged, rolls back, reconciles physics forward, and sets visual dampeners.
   */
  public static reconcile(
    serverSnapshot: AuthoritativeWorldSnapshot,
    historyBuffer: StateHistoryBuffer,
    currentTick: number,
    localPlayerId: string,
    characters: Character[],
    objects: GameObject[],
    arena: Arena,
    playerManager: PlayerManager,
    fixedDt: number = 1 / 60,
    collisionMode: CollisionMode = "dynamic",
    isEditMode: boolean = false,
    config: ReconciliationConfig = this.config
  ): ReconciliationResult {
    const startTime = performance.now();

    // 1. Identify the exact client input tick acknowledged by the server
    let clientTick: number | undefined;
    if (serverSnapshot.lastProcessedInputTick) {
      clientTick = serverSnapshot.lastProcessedInputTick[localPlayerId];
      if (clientTick === undefined && Object.keys(serverSnapshot.lastProcessedInputTick).length > 0) {
        clientTick = Object.values(serverSnapshot.lastProcessedInputTick)[0];
      }
    }

    if (clientTick === undefined) {
      clientTick = serverSnapshot.tick;
    }

    // 2. Check if clientTick is within the historical buffer
    if (clientTick < historyBuffer.getOldestTick() || clientTick > historyBuffer.getLatestTick()) {
      return {
        tick: clientTick,
        reconciled: false,
        reason: "frame_outside_buffer",
        divergedEntityIds: [],
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        ticksReplayed: 0,
        durationMs: performance.now() - startTime,
      };
    }

    const historicalFrame = historyBuffer.get(clientTick);
    if (!historicalFrame) {
      return {
        tick: clientTick,
        reconciled: false,
        reason: "frame_outside_buffer",
        divergedEntityIds: [],
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        ticksReplayed: 0,
        durationMs: performance.now() - startTime,
      };
    }

    // 3. Find the local player character
    const localChar = characters.find((c) => c.playerId === localPlayerId) || characters[0];
    if (!localChar) {
      return {
        tick: clientTick,
        reconciled: false,
        reason: "entity_not_found",
        divergedEntityIds: [],
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        ticksReplayed: 0,
        durationMs: performance.now() - startTime,
      };
    }

    // 4. Check for divergence against deadzone tolerances
    const check = this.checkDivergence(serverSnapshot.entities, historicalFrame.snapshot, localChar.id, config);

    if (!check.diverged) {
      // PREDICTION SUCCESS: client predicted physics accurately within deadzones!
      this.totalSuccesses++;
      historyBuffer.pruneOlderThan(clientTick);

      const result: ReconciliationResult = {
        tick: clientTick,
        reconciled: false,
        reason: "success_within_deadzone",
        divergedEntityIds: [],
        maxDeltaPos: check.maxDeltaPos,
        maxDeltaVel: check.maxDeltaVel,
        ticksReplayed: 0,
        durationMs: performance.now() - startTime,
      };
      this.lastResult = result;
      return result;
    }

    // 5. MISPREDICTION DETECTED: Rollback & Fast-Forward Reconciliation
    this.totalReconciliations++;
    this.lastReconciliationTime = performance.now();

    // Step A: Record current predicted present position
    const prePos = { x: localChar.position.x, y: localChar.position.y };

    // Step B: Snap local character state to authoritative server snapshot state at clientTick
    const sEnt = serverSnapshot.entities.find((e) => e.id === localChar.id);
    if (sEnt) {
      localChar.position.x = sEnt.x;
      localChar.position.y = sEnt.y;
      localChar.position.z = sEnt.z;

      localChar.velocity.x = sEnt.vx;
      localChar.velocity.y = sEnt.vy;
      localChar.verticalVelocity = sEnt.vz;

      localChar.isClimbing = Boolean(sEnt.isClimbing);

      if (localChar.rollModule && sEnt.angX !== undefined) {
        localChar.rollModule.angularVelocity.x = sEnt.angX;
        localChar.rollModule.angularVelocity.y = sEnt.angY ?? 0;
        localChar.rollModule.angularVelocity.z = sEnt.angZ ?? 0;
      }
    }

    // Step C: Update historical snapshot at clientTick
    historyBuffer.updateSnapshot(clientTick, SnapshotManager.capture(clientTick, characters, objects));

    // Step D: Fast-forward physics re-simulation from clientTick + 1 to currentTick using recorded player inputs
    let simTick = clientTick;
    let ticksReplayed = 0;

    while (simTick < currentTick) {
      simTick++;
      ticksReplayed++;

      const frame = historyBuffer.get(simTick);
      const inputs = frame ? frame.inputs : new Map();

      // Deterministically apply recorded inputs (isReplay = true prevents duplicate network actions)
      playerManager.applyPlayerInputs(inputs, fixedDt, objects, isEditMode, true);

      // Resolve collisions for local character
      CollisionResolver.resolveEntityCollisions(
        [localChar, ...objects],
        arena,
        fixedDt,
        null,
        collisionMode
      );

      // Overwrite history frame with deterministic re-simulation
      historyBuffer.updateSnapshot(simTick, SnapshotManager.capture(simTick, characters, objects));
    }

    // Step E: Apply Render Smoothing Dampener (Task 8.3)
    // visualOffset = postPos - prePos, so drawX = postPos - visualOffset = prePos (0 visual pop!)
    const postPos = { x: localChar.position.x, y: localChar.position.y };
    const dx = postPos.x - prePos.x;
    const dy = postPos.y - prePos.y;
    const jumpDist = Math.hypot(dx, dy);

    if (jumpDist >= 0.001 && jumpDist < config.maxTeleportDistance) {
      localChar.visualOffset.x = dx;
      localChar.visualOffset.y = dy;
    } else if (jumpDist >= config.maxTeleportDistance) {
      localChar.visualOffset.x = 0;
      localChar.visualOffset.y = 0;
    }

    // Step F: Prune confirmed history older than clientTick
    historyBuffer.pruneOlderThan(clientTick);

    const elapsedMs = performance.now() - startTime;
    const result: ReconciliationResult = {
      tick: clientTick,
      reconciled: true,
      reason: "corrected_divergence",
      divergedEntityIds: check.divergedEntityIds,
      maxDeltaPos: check.maxDeltaPos,
      maxDeltaVel: check.maxDeltaVel,
      ticksReplayed,
      durationMs: elapsedMs,
    };

    this.lastResult = result;
    return result;
  }
}
