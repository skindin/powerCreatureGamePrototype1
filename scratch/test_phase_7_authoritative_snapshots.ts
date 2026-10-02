import { AuthoritativeSnapshotManager, AuthoritativeWorldSnapshot } from "../src/server/AuthoritativeSnapshotManager.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { PlayerInputPacket } from "../src/engine/physics/StateHistoryBuffer.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { RollModule } from "../src/engine/RollModule.js";

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
    passed++;
  }
}

console.log("=== PHASE 7: AUTHORITATIVE SNAPSHOT BROADCAST & DELTA COMPRESSION TESTS ===");

// 1. Task 7.1: Snapshot Schema & Quantization
console.log("\n--- Test 1: Snapshot Schema & Coordinate Quantization ---");
const char = new Character({
  x: 4.123456,
  y: 7.654321,
  color: "#f59e0b",
  playerId: "player-1",
  name: "Hero",
});
char.velocity.x = 2.3456;
char.velocity.y = -1.7891;

const rock = new GameObject({
  id: "rock-1",
  position: { x: 10.98765, y: 5.4321, z: 0.12345 },
  velocity: { x: 3.3333, y: 4.4444 },
  mass: 1.0,
  colliderRadius: 0.3,
  rollModule: new RollModule({
    angularVelocity: { x: 1.2345, y: -2.3456, z: 0 },
  }),
});

const compChar = AuthoritativeSnapshotManager.compressEntity(char);
assert(compChar.id === "player-1", "Compressed character id matches");
assert(compChar.x === 4.123, `Position x quantized to 3 decimal places (got ${compChar.x})`);
assert(compChar.y === 7.654, `Position y quantized to 3 decimal places (got ${compChar.y})`);
assert(compChar.vx === 2.35, `Velocity vx quantized to 2 decimal places (got ${compChar.vx})`);
assert(compChar.vy === -1.79, `Velocity vy quantized to 2 decimal places (got ${compChar.vy})`);

const compRock = AuthoritativeSnapshotManager.compressEntity(rock);
assert(compRock.id === "rock-1", "Compressed rock id matches");
assert(compRock.z === 0.123, `Altitude z quantized to 3 decimal places (got ${compRock.z})`);
assert(compRock.angX === 1.23, `Angular roll quantized to 2 decimal places (got ${compRock.angX})`);
assert(compRock.angY === -2.35, `Angular roll quantized to 2 decimal places (got ${compRock.angY})`);

// 2. Task 7.1: Configurable Broadcast Rate (30Hz vs 60Hz)
console.log("\n--- Test 2: Configurable Broadcast Rate (30Hz vs 60Hz) ---");
const manager60 = new AuthoritativeSnapshotManager({ broadcastRateHz: 60 });
assert(manager60.isBroadcastDue(1), "60Hz broadcasts on tick 1");
assert(manager60.isBroadcastDue(2), "60Hz broadcasts on tick 2");
assert(manager60.isBroadcastDue(3), "60Hz broadcasts on tick 3");

const manager30 = new AuthoritativeSnapshotManager({ broadcastRateHz: 30 });
assert(!manager30.isBroadcastDue(1), "30Hz skips odd tick 1");
assert(manager30.isBroadcastDue(2), "30Hz broadcasts on even tick 2");
assert(!manager30.isBroadcastDue(3), "30Hz skips odd tick 3");
assert(manager30.isBroadcastDue(4), "30Hz broadcasts on even tick 4");

// 3. Task 7.2: Delta Compression & Sleeping Entity Omission
console.log("\n--- Test 3: Delta Compression & Sleeping Entity Omission ---");
const deltaManager = new AuthoritativeSnapshotManager({
  broadcastRateHz: 60,
  keyframeIntervalTicks: 60,
  deltaCompression: true,
});

// Create initial baseline snapshot (keyframe at tick 0)
const snap0 = deltaManager.createSnapshot(
  0,
  [char],
  [rock],
  { "player-1": 0 },
  undefined,
  undefined,
  true // force keyframe
);

assert(!snap0.isDelta, "Initial snapshot is full keyframe (isDelta === false)");
assert(snap0.entities.length === 2, "Keyframe contains all 2 entities");

// Tick 1: Entities did not move -> delta snapshot should omit unchanged entities!
const snap1 = deltaManager.createSnapshot(
  1,
  [char],
  [rock],
  { "player-1": 1 }
);

assert(snap1.isDelta, "Tick 1 snapshot is delta (isDelta === true)");
assert(snap1.entities.length === 0, `Unchanged entities omitted in delta (entities count: ${snap1.entities.length})`);
assert(deltaManager.totalEntitiesOmittedByDelta === 2, "Recorded 2 entities omitted by delta compression");

// Tick 2: Move character -> character included in delta, unchanged rock omitted!
char.position.x += 0.5;
const snap2 = deltaManager.createSnapshot(
  2,
  [char],
  [rock],
  { "player-1": 2 }
);

assert(snap2.isDelta, "Tick 2 snapshot is delta");
assert(snap2.entities.length === 1, `Delta includes only moved character (count: ${snap2.entities.length})`);
assert(snap2.entities[0].id === "player-1", "Included entity is player-1");

// Tick 3: Put rock to sleep
rock.isSleeping = true;
const snap3 = deltaManager.createSnapshot(
  3,
  [char],
  [rock],
  { "player-1": 3 }
);
// Rock state changed from awake to sleeping -> included in delta once to notify clients
assert(snap3.entities.some((e) => e.id === "rock-1" && e.isSleeping), "Sleeping status change broadcasted in delta");

// Tick 4: Rock remains sleeping -> omitted from subsequent delta snapshots
const snap4 = deltaManager.createSnapshot(
  4,
  [char],
  [rock],
  { "player-1": 4 }
);
assert(!snap4.entities.some((e) => e.id === "rock-1"), "Sleeping resting rock omitted from delta snapshot");

// Tick 60: Keyframe interval -> sends all entities regardless of changes
const snap60 = deltaManager.createSnapshot(
  60,
  [char],
  [rock],
  { "player-1": 60 }
);
assert(!snap60.isDelta, "Tick 60 sends full baseline keyframe (isDelta === false)");
assert(snap60.entities.length === 2, "Full keyframe includes all 2 entities");

// 4. Client Snapshot Merging
console.log("\n--- Test 4: Client-side Snapshot Merging ---");
const clientAccumulatedState = new Map();
AuthoritativeSnapshotManager.mergeSnapshot(clientAccumulatedState, snap0);
assert(clientAccumulatedState.size === 2, "Client state initialized from keyframe with 2 entities");

// Merge delta snap2 (where only char moved)
AuthoritativeSnapshotManager.mergeSnapshot(clientAccumulatedState, snap2);
assert(clientAccumulatedState.size === 2, "Client state still has 2 entities after delta merge");
assert(clientAccumulatedState.get("player-1")!.x === Number(char.position.x.toFixed(3)), "Character position updated in client state");
assert(clientAccumulatedState.has("rock-1"), "Omitted rock preserved in client state");

// 5. Task 7.3: Client ACK Feedback Tracking
console.log("\n--- Test 5: Client ACK Feedback Tracking in ServerGameSimulation ---");
const server = new ServerGameSimulation();
server.initializeDefaultScenario();

// Step server 10 ticks
for (let i = 0; i < 10; i++) {
  server.step(1 / 60);
}
assert(server.currentTick === 10, "Server tick is 10");

// Client sends input packet confirming it received server tick 8
const inputPkt: PlayerInputPacket = {
  playerId: "player-1",
  tick: 5,
  moveX: 1,
  moveY: 0,
  isSprinting: false,
  isJumpHeld: false,
  isGrabHeld: false,
  isAiming: false,
  isLockHeld: false,
  lastReceivedServerTick: 8, // Client ACK
};

server.queueInput(inputPkt);
assert(server.getClientAckedTick("player-1") === 8, `Server tracked client confirmed server tick: ${server.getClientAckedTick("player-1")}`);

// Client confirms later server tick 10
inputPkt.lastReceivedServerTick = 10;
server.queueInput({ ...inputPkt, tick: 6 });
assert(server.getClientAckedTick("player-1") === 10, `Server updated client confirmed server tick to: ${server.getClientAckedTick("player-1")}`);

// Test snapshot generation via ServerGameSimulation
const authoritativeSnapshot = server.getAuthoritativeWorldSnapshot();
assert(authoritativeSnapshot.type === "world_snapshot", "getAuthoritativeWorldSnapshot returns type 'world_snapshot'");
assert(authoritativeSnapshot.tick === 10, "Snapshot tick matches server tick 10");
assert(authoritativeSnapshot.entities.length > 0, "Snapshot contains world entities");

console.log(`\n========================================`);
console.log(`ALL PHASE 7 TESTS PASSED: ${passed}/${total}`);
console.log(`========================================\n`);
