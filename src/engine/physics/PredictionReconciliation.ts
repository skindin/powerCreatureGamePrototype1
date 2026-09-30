import { Character } from "../../character/Character.js";
import { Arena } from "../Arena.js";
import { GameObject } from "../GameObject.js";
import { PlayerManager } from "../PlayerManager.js";
import { AuthoritativeWorldSnapshot, CompressedEntityState } from "../../server/AuthoritativeSnapshotManager.js";
import { CollisionMode, CollisionResolver } from "./CollisionResolver.js";
import { IslandManager } from "./IslandManager.js";
import { SnapshotManager, WorldSnapshot } from "./Snapshot.js";
import { StateHistoryBuffer } from "./StateHistoryBuffer.js";

export interface ReconciliationConfig {
  posDeadzone: number; // units, default 0.05 (~1.8px)
  velDeadzone: number; // units/s, default 0.10
  maxTeleportDistance: number; // units, beyond which visual damping snaps immediately (default 4.0)
  visualDecayFactor: number; // default 0.70x per frame
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  posDeadzone: 0.05,
  velDeadzone: 0.10,
  maxTeleportDistance: 4.0,
  visualDecayFactor: 0.70,
};

export interface ReconciliationResult {
  tick: number;
  reconciled: boolean;
  reason: "success_within_deadzone" | "frame_outside_buffer" | "corrected_divergence";
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
 * 1. Snapshot Comparison & Error Deadzones: Compares incoming authoritative server snapshots with local history.
 * 2. Misprediction Correction: When divergence exceeds deadzones, rewinds state to server tick, applies corrections,
 *    and fast-forwards physics re-simulation using recorded player inputs.
 * 3. Render Smoothing Dampener: Offsets rendering to prevent visual popping and glides smoothly to zero over 3-5 frames.
 */
export class PredictionReconciliation {
  public static config: ReconciliationConfig = { ...DEFAULT_RECONCILIATION_CONFIG };
  public static totalReconciliations: number = 0;
  public static totalSuccesses: number = 0;
  public static lastReconciliationTime: number = 0;
  public static lastResult: ReconciliationResult | null = null;

  /**
   * Compares an authoritative server snapshot with a client historical snapshot against error deadzones.
   */
  public static checkDivergence(
    serverEntities: CompressedEntityState[],
    clientSnapshot: WorldSnapshot,
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

    for (const sEnt of serverEntities) {
      const cEnt = clientSnapshot.entities.find((e) => e.id === sEnt.id);
      if (!cEnt) continue;

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
   * Evaluates an incoming authoritative world snapshot against local prediction history.
   * If within deadzones, confirms prediction and discards older history.
   * If diverged, rolls back, reconciles physics forward, and sets visual dampeners.
   */
  public static reconcile(
    serverSnapshot: AuthoritativeWorldSnapshot,
    historyBuffer: StateHistoryBuffer,
    currentTick: number,
    characters: Character[],
    objects: GameObject[],
    arena: Arena,
    playerManager: PlayerManager,
    islandManager: IslandManager,
    fixedDt: number = 1 / 60,
    collisionMode: CollisionMode = "dynamic",
    isEditMode: boolean = false,
    config: ReconciliationConfig = this.config
  ): ReconciliationResult {
    const startTime = performance.now();
    const serverTick = serverSnapshot.tick;

    // 1. Look up client historical frame at serverTick
    const historicalFrame = historyBuffer.get(serverTick);
    if (!historicalFrame) {
      return {
        tick: serverTick,
        reconciled: false,
        reason: "frame_outside_buffer",
        divergedEntityIds: [],
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        ticksReplayed: 0,
        durationMs: performance.now() - startTime,
      };
    }

    // 2. Check for divergence against deadzone tolerances
    const check = this.checkDivergence(serverSnapshot.entities, historicalFrame.snapshot, config);

    if (!check.diverged) {
      // PREDICTION SUCCESS: client predicted physics accurately within deadzones!
      this.totalSuccesses++;
      historyBuffer.pruneOlderThan(serverTick);

      const result: ReconciliationResult = {
        tick: serverTick,
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

    // 3. MISPREDICTION DETECTED: Rollback & Fast-Forward Reconciliation
    this.totalReconciliations++;
    this.lastReconciliationTime = performance.now();

    const allEntities = [...characters, ...objects];

    // Step A: Record current predicted present positions to calculate visual smoothing offsets
    const prePositions = new Map<string, { x: number; y: number }>();
    for (const ent of allEntities) {
      prePositions.set(ent.id, { x: ent.position.x, y: ent.position.y });
    }

    // Step B: Roll back physical state to serverTick historical baseline
    SnapshotManager.apply(historicalFrame.snapshot, characters, objects);

    // Step C: Apply authoritative server state corrections at serverTick
    for (const sEnt of serverSnapshot.entities) {
      const entity = allEntities.find((e) => e.id === sEnt.id);
      if (!entity) continue;

      entity.position.x = sEnt.x;
      entity.position.y = sEnt.y;
      entity.position.z = sEnt.z;

      entity.velocity.x = sEnt.vx;
      entity.velocity.y = sEnt.vy;
      entity.verticalVelocity = sEnt.vz;

      if (entity.rollModule) {
        if (sEnt.angX !== undefined) entity.rollModule.angularVelocity.x = sEnt.angX;
        if (sEnt.angY !== undefined) entity.rollModule.angularVelocity.y = sEnt.angY;
        if (sEnt.angZ !== undefined) entity.rollModule.angularVelocity.z = sEnt.angZ;
      }

      if (entity.isCharacter) {
        (entity as Character).isClimbing = Boolean(sEnt.isClimbing);
      }

      if (sEnt.isSleeping !== undefined) {
        if (sEnt.isSleeping) {
          entity.putToSleep();
        } else {
          entity.wakeUp();
        }
      }
    }

    // Step D: Update history frame at serverTick with corrected state
    historyBuffer.updateSnapshot(serverTick, SnapshotManager.capture(serverTick, characters, objects));

    // Step E: Re-simulate physics forward from (serverTick + 1) to currentTick using recorded inputs
    let simTick = serverTick;
    let ticksReplayed = 0;

    while (simTick < currentTick) {
      simTick++;
      ticksReplayed++;

      const frame = historyBuffer.get(simTick);
      const inputs = frame ? frame.inputs : new Map();

      // Deterministically apply recorded inputs
      playerManager.applyPlayerInputs(inputs, fixedDt, objects, isEditMode);

      // Update freebody object positions
      for (const obj of objects) {
        obj.updatePosition(fixedDt, arena);
      }

      // Resolve collisions
      CollisionResolver.resolveEntityCollisions(
        allEntities,
        arena,
        fixedDt,
        null,
        collisionMode
      );

      // Update physical islands
      islandManager.updateIslands(characters, objects, simTick, arena);

      // Overwrite history frame with deterministic re-simulation
      historyBuffer.updateSnapshot(simTick, SnapshotManager.capture(simTick, characters, objects));
    }

    // Step F: Apply Render Smoothing Dampener (Task 8.3)
    // visualOffset = postPos - prePos, so drawX = postPos - visualOffset = prePos
    for (const ent of allEntities) {
      const pre = prePositions.get(ent.id);
      if (!pre) continue;

      const dx = ent.position.x - pre.x;
      const dy = ent.position.y - pre.y;
      const jumpDist = Math.hypot(dx, dy);

      if (jumpDist >= 0.001 && jumpDist < config.maxTeleportDistance) {
        // Smooth visual dampener: entity appears exactly at its pre-reconciled position and glides to real physics
        ent.visualOffset.x = dx;
        ent.visualOffset.y = dy;
      } else if (jumpDist >= config.maxTeleportDistance) {
        // Hard teleport for extreme jumps: clear visual offset to avoid flying across world
        ent.visualOffset.x = 0;
        ent.visualOffset.y = 0;
      }
    }

    // Step G: Prune confirmed history older than serverTick
    historyBuffer.pruneOlderThan(serverTick);

    const elapsedMs = performance.now() - startTime;
    const result: ReconciliationResult = {
      tick: serverTick,
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
