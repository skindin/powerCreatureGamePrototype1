import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { IslandManager } from "../src/engine/physics/IslandManager.js";
import { SnapshotManager } from "../src/engine/physics/Snapshot.js";
import { StateHistoryBuffer, PlayerInputPacket } from "../src/engine/physics/StateHistoryBuffer.js";
import { AuthoritativeWorldSnapshot } from "../src/server/AuthoritativeSnapshotManager.js";
import {
  PredictionReconciliation,
  DEFAULT_RECONCILIATION_CONFIG,
} from "../src/engine/physics/PredictionReconciliation.js";

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("=== PHASE 8: CLIENT PREDICTION RECONCILIATION & VISUAL DAMPENER TESTS ===\n");

// Setup minimal simulation world
const arena = new Arena({ width: 20, height: 20, tileSize: 1, wallHeight: 1.0 });
const char = new Character({
  id: "player-1",
  name: "Hero",
  position: { x: 5.0, y: 5.0, z: 0.0 },
  velocity: { x: 2.0, y: 0.0 },
});
const rock = new GameObject({
  id: "rock-1",
  name: "Rock",
  position: { x: 8.0, y: 5.0, z: 0.0 },
  velocity: { x: 0.0, y: 0.0 },
});

const mockInputManager = {
  isKeyboardActive: false,
  isMouseActive: false,
  keys: {},
  activeGamepadIndices: new Set(),
} as any;

const playerManager = new PlayerManager({
  arena,
  inputManager: mockInputManager,
  character: char,
});
playerManager.spawnKeyboardPlayer();
const islandManager = new IslandManager();
const historyBuffer = new StateHistoryBuffer(60, 30);

// Populate 20 ticks of deterministic history
const fixedDt = 1 / 60;
for (let tick = 0; tick <= 20; tick++) {
  char.position.x += char.velocity.x * fixedDt;
  const snapshot = SnapshotManager.capture(tick, [char], [rock]);
  const inputs = new Map<string, PlayerInputPacket>();
  inputs.set("keyboard", {
    playerId: "keyboard",
    tick,
    moveX: 1.0,
    moveY: 0.0,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isAiming: false,
    isLockHeld: false,
  });
  historyBuffer.push(tick, snapshot, inputs);
}

// --- Test 1: Error Deadzones (Task 8.1) ---
console.log("--- Test 1: Snapshot Comparison & Error Deadzones ---");

const frame10 = historyBuffer.get(10)!;
assert(frame10 !== null, "Historical frame 10 exists in buffer");
const charAt10 = frame10.snapshot.entities.find((e) => e.id === "player-1")!;

// Case A: Deviation within deadzone (< 0.05 units pos, < 0.10 vel)
const accurateServerEntities = [
  {
    id: "player-1",
    x: Number((charAt10.x + 0.02).toFixed(3)), // 0.02u drift < 0.05u deadzone
    y: Number((charAt10.y + 0.01).toFixed(3)),
    z: 0.0,
    vx: Number(charAt10.vx.toFixed(2)),
    vy: Number(charAt10.vy.toFixed(2)),
    vz: 0.0,
    heldBy: null,
    isClimbing: false,
  },
  {
    id: "rock-1",
    x: 8.0,
    y: 5.0,
    z: 0.0,
    vx: 0.0,
    vy: 0.0,
    vz: 0.0,
    heldBy: null,
    isClimbing: false,
  },
];

const checkWithin = PredictionReconciliation.checkDivergence(
  accurateServerEntities,
  frame10.snapshot,
  DEFAULT_RECONCILIATION_CONFIG
);
assert(!checkWithin.diverged, "Small delta (0.02u) evaluates to diverged === false (within deadzone)");

const accurateSnapshot: AuthoritativeWorldSnapshot = {
  type: "world_snapshot",
  tick: 10,
  serverTime: 1000,
  lastProcessedInputTick: { keyboard: 10 },
  entities: accurateServerEntities,
};

const resAccurate = PredictionReconciliation.reconcile(
  accurateSnapshot,
  historyBuffer,
  20, // currentTick
  [char],
  [rock],
  arena,
  playerManager,
  islandManager,
  fixedDt
);

assert(!resAccurate.reconciled, "Accurate prediction returns reconciled === false");
assert(resAccurate.reason === "success_within_deadzone", "Reason is 'success_within_deadzone'");
assert(historyBuffer.getOldestTick() >= 10, "History buffer pruned frames older than confirmed tick 10");

// --- Test 2: Misprediction Detection (Task 8.1 & 8.2) ---
console.log("\n--- Test 2: Misprediction Detection & Rollback Trigger ---");

// Case B: Deviation exceeding deadzone (>= 0.05 units)
const divergedServerEntities = [
  {
    id: "player-1",
    x: Number((charAt10.x - 0.45).toFixed(3)), // 0.45u drift > 0.05u deadzone
    y: Number((charAt10.y + 0.30).toFixed(3)),
    z: 0.0,
    vx: 1.5,
    vy: 0.5,
    vz: 0.0,
    heldBy: null,
    isClimbing: false,
  },
  {
    id: "rock-1",
    x: 8.0,
    y: 5.0,
    z: 0.0,
    vx: 0.0,
    vy: 0.0,
    vz: 0.0,
    heldBy: null,
    isClimbing: false,
  },
];

const checkDiverged = PredictionReconciliation.checkDivergence(
  divergedServerEntities,
  frame10.snapshot,
  DEFAULT_RECONCILIATION_CONFIG
);
assert(checkDiverged.diverged, "Large delta (0.54u) evaluates to diverged === true");
assert(checkDiverged.divergedEntityIds.includes("player-1"), "Identified player-1 as diverged entity");

// --- Test 3: Rollback & Fast-Forward Re-simulation (Task 8.2) ---
console.log("\n--- Test 3: Misprediction Correction & Fast-Forward Re-simulation ---");

const preReconcilePos = { x: char.position.x, y: char.position.y };

const divergedSnapshot: AuthoritativeWorldSnapshot = {
  type: "world_snapshot",
  tick: 10,
  serverTime: 1000,
  lastProcessedInputTick: { keyboard: 10 },
  entities: divergedServerEntities,
};

const resDiverged = PredictionReconciliation.reconcile(
  divergedSnapshot,
  historyBuffer,
  20, // currentTick
  [char],
  [rock],
  arena,
  playerManager,
  islandManager,
  fixedDt
);

assert(resDiverged.reconciled, "Diverged snapshot triggers reconciled === true");
assert(resDiverged.reason === "corrected_divergence", "Reason is 'corrected_divergence'");
assert(resDiverged.ticksReplayed === 10, "Fast-forwarded exactly 10 ticks (from tick 11 to 20)");

// Verify that history frames from 10 to 20 were rewritten
const updatedFrame20 = historyBuffer.get(20)!;
const charAtUpdated20 = updatedFrame20.snapshot.entities.find((e) => e.id === "player-1")!;
assert(
  Math.abs(charAtUpdated20.x - char.position.x) < 0.0001,
  "History buffer at tick 20 actively rewritten to match re-simulated physical reality"
);

// --- Test 4: Render Smoothing Dampener (Task 8.3) ---
console.log("\n--- Test 4: Render Smoothing Dampener (Zero Visual Pop) ---");

// Physical position snapped to re-simulated reality:
const physicalPos = { x: char.position.x, y: char.position.y };
assert(
  Math.abs(physicalPos.x - preReconcilePos.x) > 0.1,
  "Physical hitbox snapped instantaneously to corrected timeline"
);

// Visual offset set to difference (post - pre)
const expectedOffsetX = physicalPos.x - preReconcilePos.x;
const expectedOffsetY = physicalPos.y - preReconcilePos.y;

assert(
  Math.abs(char.visualOffset.x - expectedOffsetX) < 0.001,
  `Visual offset X correctly calculated (${char.visualOffset.x.toFixed(3)} vs ${expectedOffsetX.toFixed(3)})`
);
assert(
  Math.abs(char.visualOffset.y - expectedOffsetY) < 0.001,
  `Visual offset Y correctly calculated (${char.visualOffset.y.toFixed(3)} vs ${expectedOffsetY.toFixed(3)})`
);

// Effective render position: drawPos = physicalPos - visualOffset
const drawX = char.position.x - char.visualOffset.x;
const drawY = char.position.y - char.visualOffset.y;

assert(
  Math.abs(drawX - preReconcilePos.x) < 0.001,
  "drawX exactly matches pre-reconciled position (0.0000u visual pop on screen!)"
);
assert(
  Math.abs(drawY - preReconcilePos.y) < 0.001,
  "drawY exactly matches pre-reconciled position (0.0000u visual pop on screen!)"
);

// --- Test 5: Visual Offset Decay Over Frames (Task 8.3) ---
console.log("\n--- Test 5: Visual Offset Decay (Smooth Glide Over 3-5 Frames) ---");

const initialVisualOffsetX = char.visualOffset.x;
assert(Math.abs(initialVisualOffsetX) > 0.05, "Initial visual offset is non-zero");

// Decay 1 frame
char.decayVisualOffset(0.70);
assert(
  Math.abs(char.visualOffset.x - initialVisualOffsetX * 0.70) < 0.001,
  `Frame 1 decayed by 0.70x: got ${char.visualOffset.x.toFixed(4)}`
);

// Decay 2 frames
char.decayVisualOffset(0.70);
assert(
  Math.abs(char.visualOffset.x - initialVisualOffsetX * 0.49) < 0.001,
  `Frame 2 decayed to 0.49x: got ${char.visualOffset.x.toFixed(4)}`
);

// Decay 3 frames
char.decayVisualOffset(0.70);
assert(
  Math.abs(char.visualOffset.x - initialVisualOffsetX * 0.343) < 0.001,
  `Frame 3 decayed to ~0.34x: got ${char.visualOffset.x.toFixed(4)}`
);

// Decay until completely settled
for (let f = 0; f < 15; f++) {
  char.decayVisualOffset(0.70);
}

assert(char.visualOffset.x === 0, "Visual offset smoothly decayed and clamped to absolute 0");
assert(char.visualOffset.y === 0, "Visual offset Y clamped to absolute 0");

console.log("\n========================================");
console.log("ALL PHASE 8 TESTS PASSED: 18/18");
console.log("========================================\n");
