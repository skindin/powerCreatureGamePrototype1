import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { SnapshotManager, WorldSnapshot } from "../src/engine/physics/Snapshot.js";
import { StateHistoryBuffer, PlayerInputPacket } from "../src/engine/physics/StateHistoryBuffer.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("=== Phase 2: State History Buffer & Rollback Verification ===\n");

const arena = new Arena();
const dt = 1 / 60;

// Test 1: Circular Ring Buffer Lifecycle & Dynamic Resizing
console.log("--- Test 1: Ring Buffer Storage & Dynamic Resizing ---");
const buffer = new StateHistoryBuffer(60, 30);
assert(buffer.getCapacity() === 60, "Initial capacity is 60 ticks (1.0s)");
assert(buffer.getCount() === 0, "Initial count is 0");

// Push 40 dummy snapshots
for (let t = 0; t < 40; t++) {
  const dummySnap: WorldSnapshot = { tick: t, timestamp: t * 16.6, entities: [] };
  const dummyInputs = new Map<string, PlayerInputPacket>();
  buffer.push(t, dummySnap, dummyInputs);
}
assert(buffer.getCount() === 40, "Buffer contains 40 frames");
assert(buffer.getOldestTick() === 0, "Oldest tick is 0");
assert(buffer.getLatestTick() === 39, "Latest tick is 39");
assert(buffer.get(20)?.tick === 20, "O(1) retrieval for tick #20 returns correct frame");
assert(buffer.get(100) === null, "Out-of-range retrieval returns null");

// Push past capacity to test circular wrapping
for (let t = 40; t < 80; t++) {
  const dummySnap: WorldSnapshot = { tick: t, timestamp: t * 16.6, entities: [] };
  buffer.push(t, dummySnap, new Map());
}
assert(buffer.getCount() === 60, "Buffer capacity capped at 60 frames");
assert(buffer.getOldestTick() === 20, "Oldest tick correctly rolled to 20 after 80 pushes");
assert(buffer.getLatestTick() === 79, "Latest tick is 79");
assert(buffer.get(10) === null, "Pruned tick #10 returns null");
assert(buffer.get(20) !== null, "Tick #20 (current oldest) is available");

// Test Live Dynamic Capacity Resizing
console.log("\n--- Test 2: Live Dynamic Capacity Resizing ---");
// Shrink capacity down to 30 ticks live
buffer.setCapacity(30);
assert(buffer.getCapacity() === 30, "Capacity dynamically resized to 30 ticks");
assert(buffer.getCount() === 30, "Retained newest 30 frames");
assert(buffer.getOldestTick() === 50, "Oldest tick pruned to 50");
assert(buffer.getLatestTick() === 79, "Latest tick preserved at 79");

// Expand capacity up to 90 ticks live
buffer.setCapacity(90);
assert(buffer.getCapacity() === 90, "Capacity dynamically expanded to 90 ticks");
assert(buffer.getCount() === 30, "Existing 30 frames preserved without corruption");
for (let t = 80; t < 120; t++) {
  buffer.push(t, { tick: t, timestamp: t * 16.6, entities: [] }, new Map());
}
assert(buffer.getCount() === 70, "Buffer populated up to 70 frames in expanded capacity");
assert(buffer.getLatestTick() === 119, "Latest tick reached 119");

// Test 3: Bit-Level Deterministic Rollback & Re-Simulation
console.log("\n--- Test 3: Deterministic Multi-Tick Rollback & Replay ---");
const char = new Character("p1", "Player 1", { x: 5.0, y: 5.0 }, "#f59e0b");
const ball = new GameObject({
  id: "ball-1",
  name: "Bouncing Ball",
  position: { x: 7.0, y: 5.0 },
  velocity: { x: 6.0, y: 2.0 },
  colliderRadius: 0.35,
  mass: 1.0,
  bounceMod: 0.8,
  collisionMode: "dynamic",
});
const crate = new GameObject({
  id: "crate-1",
  name: "Crate",
  position: { x: 10.0, y: 5.0 },
  velocity: { x: -2.0, y: 0.0 },
  colliderRadius: 0.5,
  mass: 3.0,
  bounceMod: 0.3,
  collisionMode: "dynamic",
});

const simBuffer = new StateHistoryBuffer(60, 30);
const allEntities = [char, ball, crate];

// Run simulation forward for 40 ticks while recording states & varying inputs
for (let tick = 1; tick <= 40; tick++) {
  // Simulate active player movement inputs
  const inputs = new Map<string, PlayerInputPacket>();
  const moveX = Math.cos(tick * 0.1);
  const moveY = Math.sin(tick * 0.1);
  inputs.set(char.id, {
    playerId: char.id,
    moveX,
    moveY,
    isSprinting: tick > 20,
    isJumpHeld: false,
    isGrabHeld: false,
    isAiming: false,
    isLockHeld: false,
  });

  // Apply character movement
  char.position.x += moveX * 0.1;
  char.position.y += moveY * 0.1;

  // Step dynamic objects
  ball.updatePosition(dt, arena);
  crate.updatePosition(dt, arena);

  // Resolve collisions
  CollisionResolver.resolveEntityCollisions(allEntities, arena, dt, null, "dynamic");

  // Capture snapshot & record to history buffer
  const snap = SnapshotManager.capture(tick, [char], [ball, crate]);
  simBuffer.push(tick, snap, inputs);
}

// Capture ground truth state at tick 40
const originalTick40 = SnapshotManager.capture(40, [char], [ball, crate]);

// Now rollback 30 ticks back to tick 10
const rollbackDepth = 30;
const targetTick = 40 - rollbackDepth; // tick 10
const targetFrame = simBuffer.get(targetTick);
assert(targetFrame !== null, `Target frame for tick #${targetTick} found in history buffer`);

// Rollback world state to tick 10
SnapshotManager.apply(targetFrame!.snapshot, [char], [ball, crate]);

// Re-simulate forward from tick 11 to 40 using recorded inputs
for (let simTick = targetTick + 1; simTick <= 40; simTick++) {
  const frame = simBuffer.get(simTick);
  const input = frame?.inputs.get(char.id);

  if (input) {
    char.position.x += input.moveX * 0.1;
    char.position.y += input.moveY * 0.1;
  }

  ball.updatePosition(dt, arena);
  crate.updatePosition(dt, arena);

  CollisionResolver.resolveEntityCollisions(allEntities, arena, dt, null, "dynamic");
}

// Capture re-simulated state at tick 40
const replayedTick40 = SnapshotManager.capture(40, [char], [ball, crate]);

// Check divergence
const divergence = SnapshotManager.hasDivergence(originalTick40, replayedTick40, 0.0001, 0.0001);
assert(!divergence.diverged, "Rollback & replay achieved 0.0000u bit-level deterministic match!");
assert(divergence.maxDeltaPos < 0.00001, `Max position delta is negligible (${divergence.maxDeltaPos})`);
assert(divergence.maxDeltaVel < 0.00001, `Max velocity delta is negligible (${divergence.maxDeltaVel})`);

// Test 4: Desync Injection & Reconciliation
console.log("\n--- Test 4: Desync Perturbation & Forward Divergence ---");
// Roll back to tick 20 and inject an impulse into ball
const frame20 = simBuffer.get(20);
SnapshotManager.apply(frame20!.snapshot, [char], [ball, crate]);
ball.velocity.x += 15.0; // Perturbation injected into the past!

// Re-simulate to tick 40
for (let simTick = 21; simTick <= 40; simTick++) {
  const frame = simBuffer.get(simTick);
  const input = frame?.inputs.get(char.id);
  if (input) {
    char.position.x += input.moveX * 0.1;
    char.position.y += input.moveY * 0.1;
  }
  ball.updatePosition(dt, arena);
  crate.updatePosition(dt, arena);
  CollisionResolver.resolveEntityCollisions(allEntities, arena, dt, null, "dynamic");
}

const desyncedTick40 = SnapshotManager.capture(40, [char], [ball, crate]);
const desyncCheck = SnapshotManager.hasDivergence(originalTick40, desyncedTick40, 0.05, 0.05);
assert(desyncCheck.diverged, "Perturbation in the past caused forward trajectory to alter as expected");
assert(desyncCheck.maxDeltaPos > 1.0, `Trajectory divergence measured correctly (${desyncCheck.maxDeltaPos.toFixed(2)}u)`);

console.log("\n🎉 ALL PHASE 2 STATE HISTORY & ROLLBACK VERIFICATION TESTS PASSED!");
