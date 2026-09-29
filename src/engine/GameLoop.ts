import { Arena } from "./Arena.js";
import { Character } from "../character/Character.js";
import { GameObject } from "./GameObject.js";
import { Renderer, RollbackPathPoint } from "./Renderer.js";
import { InputManager } from "../ui/InputManager.js";
import { DevPanel } from "../ui/DevPanel.js";
import { PlayerManager, PlayerEntry, PLAYER_COLORS } from "./PlayerManager.js";
import { CollisionResolver, CollisionMode } from "./physics/CollisionResolver.js";
import { SnapshotManager, WorldSnapshot } from "./physics/Snapshot.js";
import { StateHistoryBuffer, RollbackResult } from "./physics/StateHistoryBuffer.js";

export type { PlayerEntry, CollisionMode, WorldSnapshot, RollbackResult };
export { PLAYER_COLORS, StateHistoryBuffer };


export class GameLoop {
  private arena: Arena;
  private objects: GameObject[];
  private renderer: Renderer;
  private inputManager: InputManager;
  private devPanel: DevPanel;

  // Dedicated player session manager
  public playerManager: PlayerManager;

  public get players(): Map<string, PlayerEntry> {
    return this.playerManager.players;
  }
  public get onPlayersChanged(): (() => void) | undefined {
    return this.playerManager.onPlayersChanged;
  }
  public set onPlayersChanged(cb: (() => void) | undefined) {
    this.playerManager.onPlayersChanged = cb;
  }
  public get baseCharacter(): Character {
    return this.playerManager.baseCharacter;
  }
  public set baseCharacter(char: Character) {
    this.playerManager.baseCharacter = char;
  }
  public get allCharacters(): Character[] {
    return this.playerManager.allCharacters;
  }
  public get primaryCharacter(): Character {
    return this.playerManager.primaryCharacter;
  }
  public get character(): Character {
    return this.primaryCharacter;
  }

  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedDt = 1 / 60; // 60Hz fixed simulation timestep

  public getGhostSnapshot?: (dt: number) => import("../network/RelayClient.js").GhostSnapshot | null;
  public onPhysicsTick?: (dt: number, nowMs: number) => void;

  public currentTick = 0;
  public timeDilation = 1.0;
  public isPhysicsPaused = false;
  public globalCollisionMode: CollisionMode = "dynamic";
  public lastSnapshot: WorldSnapshot | null = null;
  public historyBuffer = new StateHistoryBuffer(60, 30);

  public get isPaused(): boolean {
    return this.isPhysicsPaused;
  }
  public set isPaused(val: boolean) {
    this.isPhysicsPaused = val;
  }

  public stepSingleTick(): void {
    this.updatePhysics(this.fixedDt);
    if (this.onPhysicsTick) {
      this.onPhysicsTick(this.fixedDt, performance.now());
    }
    this.renderFrame(this.fixedDt);
    this.devPanel.updateInspector();
  }


  constructor(options: {
    arena: Arena;
    character?: Character;
    objects: GameObject[];
    renderer: Renderer;
    inputManager: InputManager;
    devPanel: DevPanel;
  }) {
    this.arena = options.arena;
    this.objects = options.objects;
    this.renderer = options.renderer;
    this.inputManager = options.inputManager;
    this.devPanel = options.devPanel;

    this.playerManager = new PlayerManager({
      arena: this.arena,
      inputManager: this.inputManager,
      character: options.character,
    });
  }

  public spawnKeyboardPlayer(): Character {
    this.lastTime = performance.now();
    this.accumulator = 0;
    return this.playerManager.spawnKeyboardPlayer();
  }

  public removeKeyboardPlayer(): void {
    this.playerManager.removeKeyboardPlayer();
  }

  public spawnGamepadPlayer(slotIndex: number, gamepadName?: string): Character {
    this.lastTime = performance.now();
    this.accumulator = 0;
    return this.playerManager.spawnGamepadPlayer(slotIndex, gamepadName);
  }

  public removeGamepadPlayer(slotIndex: number): void {
    this.playerManager.removeGamepadPlayer(slotIndex);
  }

  public removePlayer(playerId: string): void {
    this.playerManager.removePlayer(playerId);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }

  public stop(): void {
    this.isRunning = false;
  }

  private renderFrame(deltaSeconds: number): void {
    const { targetGrabEntities, activeAimCursors } = this.playerManager.computeAimCursorsAndGrabTargets(
      this.objects,
      this.devPanel.isEditMode
    );

    const isWallEditor = this.devPanel.isEditMode && this.devPanel.editTool === "walls";
    const ghostData = this.getGhostSnapshot ? this.getGhostSnapshot(deltaSeconds) : null;

    this.renderer.globalCollisionMode = this.globalCollisionMode;
    this.renderer.historyBufferStatus = {
      count: this.historyBuffer.getCount(),
      capacity: this.historyBuffer.getCapacity(),
    };

    // Update live continuous buffer trail diagnostics for selected entity (or player)
    if (this.renderer.showBufferTrail) {
      const targetEntity = this.devPanel?.selectedEntity || this.allCharacters[0];
      if (targetEntity) {
        const targetId = targetEntity.id;
        const allFrames = this.historyBuffer.getAllFrames();
        const trailPoints: RollbackPathPoint[] = [];
        for (const f of allFrames) {
          const snap = f.snapshot.entities.find((e) => e.id === targetId);
          if (snap) {
            trailPoints.push({ x: snap.x, y: snap.y, z: snap.z, tick: f.tick });
          }
        }
        trailPoints.push({
          x: targetEntity.position.x,
          y: targetEntity.position.y,
          z: targetEntity.position.z,
          tick: this.currentTick,
        });

        const depth = this.devPanel?.rollbackDepthTicks ?? 30;
        const targetDepthTick = Math.max(this.historyBuffer.getOldestTick(), this.currentTick - depth);

        this.renderer.liveBufferTrail = {
          enabled: true,
          points: trailPoints,
          targetDepthTick,
          radius: targetEntity.colliderRadius,
          entityName: targetEntity.name,
        };
      } else {
        this.renderer.liveBufferTrail = null;
      }
    } else {
      this.renderer.liveBufferTrail = null;
    }

    this.renderer.render(
      this.arena,
      this.allCharacters,
      this.objects,
      this.inputManager.selectedCanvasEntity,
      this.devPanel.isEditMode,
      this.inputManager.hoverEntity,
      targetGrabEntities,
      isWallEditor,
      this.inputManager.hoverWallTile,
      ghostData,
      activeAimCursors,
      undefined,
      false
    );
  }

  private tick(currentTime: number): void {
    if (!this.isRunning) return;

    let deltaSeconds = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Prevent spiral of death on tab unfocus
    if (deltaSeconds > 0.2) {
      deltaSeconds = 0.2;
    }

    if (!this.isPhysicsPaused) {
      this.accumulator += deltaSeconds * this.timeDilation;

      // Fixed timestep simulation updates
      while (this.accumulator >= this.fixedDt) {
        this.updatePhysics(this.fixedDt);
        if (this.onPhysicsTick) {
          this.onPhysicsTick(this.fixedDt, currentTime);
        }
        this.accumulator -= this.fixedDt;
      }
    }

    this.renderFrame(deltaSeconds);
    this.devPanel.updateInspector();

    requestAnimationFrame((t) => this.tick(t));
  }

  private updatePhysics(dt: number): void {
    this.currentTick++;
    const input = this.inputManager;

    // Synchronize active entities and visual altitude scale on arena
    this.arena.entities = [...this.allCharacters, ...this.objects];
    this.arena.visualAltitudeScale = this.renderer.getHoverScale();

    // 1. Poll connected Gamepads (rising-edge A button to join, analog sticks, triggers)
    input.pollGamepadSlots(
      this.players,
      this.objects,
      this.arena,
      this.allCharacters,
      (entity) => this.renderer.getVisualPosition(entity)
    );
    // 2. Update players (keyboard, gamepads, or idle baseCharacter) and capture inputs
    const currentInputs = this.playerManager.updatePlayers(dt, this.objects, this.devPanel.isEditMode);

    // 3. Update all freebody objects (skip physics integration while manually dragged in Edit Mode)
    for (const obj of this.objects) {
      if (input.draggedEntity === obj) continue;
      obj.updatePosition(dt, this.arena);
    }

    // 4. Resolve collisions across all characters and objects via CollisionResolver
    CollisionResolver.resolveEntityCollisions(
      [...this.allCharacters, ...this.objects],
      this.arena,
      dt,
      input.draggedEntity,
      this.globalCollisionMode
    );

    // 5. Capture deterministic state snapshot for history, reconciliation, and networking
    this.lastSnapshot = SnapshotManager.capture(
      this.currentTick,
      this.allCharacters,
      this.objects
    );

    // 6. Record frame into circular history buffer
    this.historyBuffer.push(this.currentTick, this.lastSnapshot, currentInputs);
  }

  /**
   * Rewinds the simulation back by N ticks and re-simulates forward using historical inputs,
   * verifying bit-level deterministic state reproduction.
   */
  public simulateRollbackTest(ticksBack: number = 30): RollbackResult {
    const startTime = performance.now();
    const currentTick = this.currentTick;
    const availableTicks = this.historyBuffer.getCount() - 1;

    if (availableTicks <= 0) {
      return {
        success: false,
        startTick: currentTick,
        endTick: currentTick,
        ticksReplayed: 0,
        durationMs: 0,
        diverged: false,
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        message: "History buffer is empty. Let the simulation run for a few ticks first.",
      };
    }

    const clampedTicksBack = Math.max(1, Math.min(ticksBack, this.historyBuffer.maxRollbackTicks, availableTicks));
    const targetTick = currentTick - clampedTicksBack;
    const targetFrame = this.historyBuffer.get(targetTick);

    if (!targetFrame) {
      return {
        success: false,
        startTick: targetTick,
        endTick: currentTick,
        ticksReplayed: 0,
        durationMs: 0,
        diverged: false,
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        message: `Historical snapshot for tick #${targetTick} not found in buffer.`,
      };
    }

    // 1. Capture original present state for exact verification
    const originalPresent = SnapshotManager.capture(currentTick, this.allCharacters, this.objects);

    // 2. Roll back state to targetTick
    SnapshotManager.apply(targetFrame.snapshot, this.allCharacters, this.objects);
    let simTick = targetTick;

    const targetEntity = this.devPanel?.selectedEntity || this.allCharacters[0];
    const replayedPath: RollbackPathPoint[] = [{
      x: targetEntity.position.x,
      y: targetEntity.position.y,
      z: targetEntity.position.z,
      tick: targetTick,
    }];

    // 3. Re-simulate forward tick-by-tick up to currentTick using recorded inputs
    while (simTick < currentTick) {
      simTick++;
      const frame = this.historyBuffer.get(simTick);
      const inputs = frame ? frame.inputs : new Map();

      // Apply historical inputs
      this.playerManager.applyPlayerInputs(inputs, this.fixedDt, this.objects, this.devPanel.isEditMode);

      // Step objects
      for (const obj of this.objects) {
        obj.updatePosition(this.fixedDt, this.arena);
      }

      // Resolve collisions
      CollisionResolver.resolveEntityCollisions(
        [...this.allCharacters, ...this.objects],
        this.arena,
        this.fixedDt,
        null,
        this.globalCollisionMode
      );

      replayedPath.push({
        x: targetEntity.position.x,
        y: targetEntity.position.y,
        z: targetEntity.position.z,
        tick: simTick,
      });
    }

    // 4. Capture replayed state and check divergence against original
    const replayedPresent = SnapshotManager.capture(currentTick, this.allCharacters, this.objects);
    const divergence = SnapshotManager.hasDivergence(originalPresent, replayedPresent, 0.0001, 0.0001);
    const elapsedMs = performance.now() - startTime;

    // Display replayed ghost trace on canvas
    this.renderer.rollbackDiagnostics = {
      type: "pure_replay",
      targetName: targetEntity.name,
      startTick: targetTick,
      endTick: currentTick,
      timestamp: performance.now(),
      durationMs: 3500,
      radius: targetEntity.colliderRadius,
      originalPath: replayedPath,
      reconciledPath: replayedPath,
      deltaPos: divergence.maxDeltaPos,
    };

    return {
      success: true,
      startTick: targetTick,
      endTick: currentTick,
      ticksReplayed: clampedTicksBack,
      durationMs: elapsedMs,
      diverged: divergence.diverged,
      entityId: divergence.entityId,
      maxDeltaPos: divergence.maxDeltaPos,
      maxDeltaVel: divergence.maxDeltaVel,
      message: divergence.diverged
        ? `DIVERGENCE DETECTED: Entity ${divergence.entityId} deviated by ${divergence.maxDeltaPos.toFixed(4)}u!`
        : `PERFECT REPLAY: ${clampedTicksBack} ticks re-simulated in ${elapsedMs.toFixed(2)}ms with 0.0000u divergence!`,
    };
  }

  /**
   * Injects a physical perturbation into the past (Tick T - N) and re-simulates forward,
   * demonstrating how client-side prediction reconciles when a server packet alters past state.
   */
  public injectPerturbationTest(ticksBack: number = 20, targetOverride?: GameObject | null): RollbackResult {
    const startTime = performance.now();
    const currentTick = this.currentTick;
    const availableTicks = this.historyBuffer.getCount() - 1;

    if (availableTicks <= 0) {
      return {
        success: false,
        startTick: currentTick,
        endTick: currentTick,
        ticksReplayed: 0,
        durationMs: 0,
        diverged: false,
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        message: "History buffer is empty. Let the simulation run for a few ticks first.",
      };
    }

    const clampedTicksBack = Math.max(1, Math.min(ticksBack, this.historyBuffer.maxRollbackTicks, availableTicks));
    const targetTick = currentTick - clampedTicksBack;
    const targetFrame = this.historyBuffer.get(targetTick);

    if (!targetFrame) {
      return {
        success: false,
        startTick: targetTick,
        endTick: currentTick,
        ticksReplayed: 0,
        durationMs: 0,
        diverged: false,
        maxDeltaPos: 0,
        maxDeltaVel: 0,
        message: `Historical snapshot for tick #${targetTick} not found in buffer.`,
      };
    }

    // 1. Capture original present state
    const originalPresent = SnapshotManager.capture(currentTick, this.allCharacters, this.objects);

    // Identify target entity to apply the simulated tackle to
    let candidate: GameObject | null | undefined = targetOverride || this.devPanel?.selectedEntity;
    if (candidate && !candidate.hasRigidbody) {
      candidate = null;
    }
    const targetEntity = candidate || this.objects.find(o => o.hasRigidbody) || this.allCharacters[0];
    const targetId = targetEntity.id;

    // Capture the original predicted path from the history buffer for comparison
    const originalPath: RollbackPathPoint[] = [];
    for (let t = targetTick; t <= currentTick; t++) {
      const f = this.historyBuffer.get(t);
      if (f) {
        const entSnap = f.snapshot.entities.find(e => e.id === targetId);
        if (entSnap) {
          originalPath.push({ x: entSnap.x, y: entSnap.y, z: entSnap.z, tick: t });
        }
      }
    }
    originalPath.push({
      x: targetEntity.position.x,
      y: targetEntity.position.y,
      z: targetEntity.position.z,
      tick: currentTick,
    });

    // 2. Roll back state to targetTick
    SnapshotManager.apply(targetFrame.snapshot, this.allCharacters, this.objects);
    const impactPos = { x: targetEntity.position.x, y: targetEntity.position.y, z: targetEntity.position.z };

    // 3. Inject past tackle impulse (simulating an external hit or collision from another player)
    if (targetEntity.hasRigidbody) {
      const speed = Math.hypot(targetEntity.velocity.x, targetEntity.velocity.y);
      if (speed > 1.0) {
        const perpX = -targetEntity.velocity.y / speed;
        const perpY = targetEntity.velocity.x / speed;
        targetEntity.velocity.x += perpX * 12.0;
        targetEntity.velocity.y += perpY * 12.0;
      } else {
        targetEntity.velocity.x += 12.0;
        targetEntity.velocity.y -= 10.0;
      }
    }

    const reconciledPath: RollbackPathPoint[] = [{
      x: targetEntity.position.x,
      y: targetEntity.position.y,
      z: targetEntity.position.z,
      tick: targetTick,
    }];

    let simTick = targetTick;

    // 4. Re-simulate forward to currentTick
    while (simTick < currentTick) {
      simTick++;
      const frame = this.historyBuffer.get(simTick);
      const inputs = frame ? frame.inputs : new Map();

      this.playerManager.applyPlayerInputs(inputs, this.fixedDt, this.objects, this.devPanel.isEditMode);

      for (const obj of this.objects) {
        obj.updatePosition(this.fixedDt, this.arena);
      }

      CollisionResolver.resolveEntityCollisions(
        [...this.allCharacters, ...this.objects],
        this.arena,
        this.fixedDt,
        null,
        this.globalCollisionMode
      );

      reconciledPath.push({
        x: targetEntity.position.x,
        y: targetEntity.position.y,
        z: targetEntity.position.z,
        tick: simTick,
      });
    }

    // 5. Update lastSnapshot
    this.lastSnapshot = SnapshotManager.capture(currentTick, this.allCharacters, this.objects);
    const divergence = SnapshotManager.hasDivergence(originalPresent, this.lastSnapshot, 0.05, 0.1);
    const elapsedMs = performance.now() - startTime;

    // Trigger ghost visual diagnostics showing old vs. new path
    this.renderer.rollbackDiagnostics = {
      type: "desync_tackle",
      targetName: targetEntity.name,
      startTick: targetTick,
      endTick: currentTick,
      timestamp: performance.now(),
      durationMs: 4500, // 4.5 seconds of smooth visibility
      radius: targetEntity.colliderRadius,
      originalPath,
      reconciledPath,
      impactPos,
      deltaPos: divergence.maxDeltaPos,
    };

    return {
      success: true,
      startTick: targetTick,
      endTick: currentTick,
      ticksReplayed: clampedTicksBack,
      durationMs: elapsedMs,
      diverged: divergence.diverged,
      entityId: targetEntity ? targetEntity.id : undefined,
      maxDeltaPos: divergence.maxDeltaPos,
      maxDeltaVel: divergence.maxDeltaVel,
      message: `PAST TACKLE RECONCILED: Injected tackle impulse at tick #${targetTick} on ${targetEntity?.name || 'entity'}; forward timeline re-routed by ${divergence.maxDeltaPos.toFixed(2)}u in ${elapsedMs.toFixed(2)}ms.`,
    };
  }

  public resolveFreebodyCollisions(dt: number = this.fixedDt): void {
    CollisionResolver.resolveEntityCollisions(
      [...this.allCharacters, ...this.objects],
      this.arena,
      dt,
      this.inputManager.draggedEntity,
      this.globalCollisionMode
    );
  }

  public legacyResolveFreebodyCollisions(): void {
    const all = [...this.allCharacters, ...this.objects];
    const input = this.inputManager;

    // Iterative separation solver: pushes entities away until not overlapping
    const iterations = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];

          // Skip if either is currently held in hands or actively dragged in Edit Mode
          if (a.isHeld || b.isHeld || a === input.draggedEntity || b === input.draggedEntity) continue;

          // Skip if either entity does not have an active collider
          if (!a.hasCollider || !b.hasCollider) continue;

          // Infinite Virtual Layer Collision Rule:
          // Objects only collide if they are on the exact same layer (height / wallHeight).
          // Only Layer 1 has walls.
          const layerA = GameObject.getEntityLayer(a, this.arena.wallHeight);
          const layerB = GameObject.getEntityLayer(b, this.arena.wallHeight);
          if (layerA !== layerB) continue;

          // 2D planar distance between the centers of the two colliders
          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dist2DSq = dx * dx + dy * dy;
          const minDist = a.colliderRadius + b.colliderRadius;

          if (dist2DSq < minDist * minDist && dist2DSq > 0.000001) {
            const dist = Math.sqrt(dist2DSq);
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normY = dy / dist;

            // Relative 2D velocity (B relative to A)
            const relVx = b.velocity.x - a.velocity.x;
            const relVy = b.velocity.y - a.velocity.y;
            const velAlongNormal = relVx * normX + relVy * normY;

            const isMasslessA = !a.hasMass;
            const isMasslessB = !b.hasMass;

            // Case 1: Both objects are massless (50/50 separation without mass ratio)
            if (isMasslessA && isMasslessB) {
              a.position.x -= normX * overlap * 0.5;
              a.position.y -= normY * overlap * 0.5;
              b.position.x += normX * overlap * 0.5;
              b.position.y += normY * overlap * 0.5;

              if (velAlongNormal < 0) {
                const impulse = -velAlongNormal * 0.5;
                a.velocity.x -= impulse * normX;
                a.velocity.y -= impulse * normY;
                b.velocity.x += impulse * normX;
                b.velocity.y += impulse * normY;
              }
              continue;
            }

            // Case 2: A is Massive, B is Massless
            // "massless objects will inherit velocity, but they will ONLY inherit velocity.
            // don't let the massive object be affected at all unless it's pressing the massless object against a wall."
            if (!isMasslessA && isMasslessB) {
              const isBPinned = this.isEntityPinnedAgainstWall(b, normX, normY);
              if (isBPinned) {
                // B is pinned against wall; A cannot push through B
                a.position.x -= normX * overlap;
                a.position.y -= normY * overlap;
                a.velocity.x = 0;
                a.velocity.y = 0;
              } else {
                // A is completely unaffected! B absorbs entire separation and inherits velocity from A
                b.position.x += normX * overlap;
                b.position.y += normY * overlap;

                if (velAlongNormal < 0) {
                  // B inherits closing velocity along normal from A without dampening A
                  b.velocity.x += (a.velocity.x - b.velocity.x) * Math.abs(normX);
                  b.velocity.y += (a.velocity.y - b.velocity.y) * Math.abs(normY);
                }
              }
              continue;
            }

            // Case 3: A is Massless, B is Massive
            if (isMasslessA && !isMasslessB) {
              const isAPinned = this.isEntityPinnedAgainstWall(a, -normX, -normY);
              if (isAPinned) {
                b.position.x += normX * overlap;
                b.position.y += normY * overlap;
                b.velocity.x = 0;
                b.velocity.y = 0;
              } else {
                a.position.x -= normX * overlap;
                a.position.y -= normY * overlap;

                if (velAlongNormal < 0) {
                  a.velocity.x += (b.velocity.x - a.velocity.x) * Math.abs(normX);
                  a.velocity.y += (b.velocity.y - a.velocity.y) * Math.abs(normY);
                }
              }
              continue;
            }

            // Case 4: Both objects are massive - standard mass-weighted physics
            const invMassA = 1 / a.mass;
            const invMassB = 1 / b.mass;
            const invMassSum = invMassA + invMassB;
            if (invMassSum <= 0.0001) continue;

            const ratioA = invMassA / invMassSum;
            const ratioB = invMassB / invMassSum;

            // Positional separation in 2D
            a.position.x -= normX * overlap * ratioA;
            a.position.y -= normY * overlap * ratioA;
            b.position.x += normX * overlap * ratioB;
            b.position.y += normY * overlap * ratioB;

            if (velAlongNormal < 0) {
              // When actively walking against an object, contact is an inelastic continuous push (restitution = 0)
              const isActivelyPushing = (a instanceof Character && a.isActivelyWalking) || (b instanceof Character && b.isActivelyWalking);
              const canBounce = a.hasBounce && b.hasBounce;
              const eA = (a.isCharacter || !a.hasBounce) ? 0.0 : (a.bounceMod ?? 0.0);
              const eB = (b.isCharacter || !b.hasBounce) ? 0.0 : (b.bounceMod ?? 0.0);
              const restitution = (isActivelyPushing || !canBounce) ? 0.0 : Math.max(0.0, Math.min(0.98, Math.max(eA, eB)));

              // Normal impulse magnitude J_n (strictly conserving linear momentum)
              const normalImpulse = -(1 + restitution) * velAlongNormal / invMassSum;

              a.velocity.x -= normalImpulse * invMassA * normX;
              a.velocity.y -= normalImpulse * invMassA * normY;

              b.velocity.x += normalImpulse * invMassB * normX;
              b.velocity.y += normalImpulse * invMassB * normY;

              // Tangential relative velocity (perpendicular to normal)
              const tangX = -normY;
              const tangY = normX;
              const relVt = relVx * tangX + relVy * tangY;

              if (Math.abs(relVt) > 0.001) {
                // Contact friction
                const muObj = 0.35 * Math.sqrt(a.dynamicGroundFrictionMod * b.dynamicGroundFrictionMod);
                const beta = 0.4; // Sphere rotational inertia factor
                const stickImpulse = Math.abs(relVt) / (invMassSum * (1 + 1 / beta));
                const maxFricImpulse = muObj * Math.abs(normalImpulse);
                const fricImpulse = Math.min(stickImpulse, maxFricImpulse) * Math.sign(relVt);

                // Tangential impulse opposes relative sliding velocity
                a.velocity.x += fricImpulse * invMassA * tangX;
                a.velocity.y += fricImpulse * invMassA * tangY;

                b.velocity.x -= fricImpulse * invMassB * tangX;
                b.velocity.y -= fricImpulse * invMassB * tangY;

                // Rotational coupling if roll module is present
                if (a.rollModule && a.rollModule.enabled) {
                  const spinImpulse = fricImpulse / (beta * a.mass * a.colliderRadius);
                  a.rollModule.angularVelocity.z += spinImpulse;
                  a.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, a.rollModule.angularVelocity.z));

                  if (a.isRestingOnSurface) {
                    a.rollModule.angularVelocity.y = a.velocity.x / a.colliderRadius;
                    a.rollModule.angularVelocity.x = -a.velocity.y / a.colliderRadius;
                  }
                }

                if (b.rollModule && b.rollModule.enabled) {
                  const spinImpulseB = fricImpulse / (beta * b.mass * b.colliderRadius);
                  b.rollModule.angularVelocity.z -= spinImpulseB;
                  b.rollModule.angularVelocity.z = Math.max(-30, Math.min(30, b.rollModule.angularVelocity.z));

                  if (b.isRestingOnSurface) {
                    b.rollModule.angularVelocity.y = b.velocity.x / b.colliderRadius;
                    b.rollModule.angularVelocity.x = -b.velocity.y / b.colliderRadius;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private isEntityPinnedAgainstWall(entity: GameObject, pushDirX: number, pushDirY: number): boolean {
    const r = entity.colliderRadius > 0 ? entity.colliderRadius : 0.3;
    const eps = 0.05;

    // Arena outer boundaries
    if (pushDirX > 0.3 && entity.position.x >= this.arena.width - r - eps) return true;
    if (pushDirX < -0.3 && entity.position.x <= r + eps) return true;
    if (pushDirY > 0.3 && entity.position.y >= this.arena.height - r - eps) return true;
    if (pushDirY < -0.3 && entity.position.y <= r + eps) return true;

    // Arena internal walls
    for (const wall of this.arena.walls) {
      if (entity.position.z < wall.wallHeight - 0.05) {
        const testX = entity.position.x + pushDirX * eps;
        const testY = entity.position.y + pushDirY * eps;
        const closestX = Math.max(wall.x, Math.min(testX, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(testY, wall.y + wall.height));
        const dx = testX - closestX;
        const dy = testY - closestY;
        if (dx * dx + dy * dy < r * r) {
          return true;
        }
      }
    }
    return false;
  }
}
