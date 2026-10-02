import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";
import { StateHistoryBuffer } from "../src/engine/physics/StateHistoryBuffer.js";
import { SnapshotManager } from "../src/engine/physics/Snapshot.js";
import { PredictionReconciliation } from "../src/engine/physics/PredictionReconciliation.js";
import { AuthoritativeWorldSnapshot } from "../src/server/AuthoritativeSnapshotManager.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

console.log("=== PHASE 8 TEST: CLIENT PREDICTION RECONCILIATION & VISUAL SMOOTHING ===");

// 1. Setup Arena, Player, Object, and History Buffer
const arena = new Arena(20, 20);
const dummyCanvas = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
} as unknown as HTMLCanvasElement;
const inputManager = new InputManager(dummyCanvas, arena);
const playerManager = new PlayerManager({ arena, inputManager });
const character = playerManager.baseCharacter;
character.playerId = "keyboard";
character.position.x = 10;
character.position.y = 10;
character.position.z = 0;

const objects: GameObject[] = [
  new GameObject({
    id: "crate-1",
    name: "Wood Crate",
    position: { x: 14, y: 10, z: 0 },
    mass: 1.0,
    colliderRadius: 0.4,
  }),
];

const historyBuffer = new StateHistoryBuffer(60);
const fixedDt = 1 / 60;

console.log("Simulating 30 ticks of walking right...");

// Simulate 30 ticks of walking right (+X)
for (let tick = 1; tick <= 30; tick++) {
  // Capture input (moving right)
  const inputMap = new Map();
  inputMap.set(character.playerId || "keyboard", {
    tick,
    timestamp: performance.now(),
    moveX: 1.0,
    moveY: 0.0,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isDrop: false,
    isThrow: false,
    isAiming: false,
  });

  playerManager.applyPlayerInputs(inputMap, fixedDt, objects, false);
  for (const obj of objects) {
    obj.updatePosition(fixedDt, arena);
  }
  CollisionResolver.resolveEntityCollisions([character, ...objects], arena, fixedDt, null, "dynamic");

  const snap = SnapshotManager.capture(tick, [character], objects);
  historyBuffer.push(tick, snap, inputMap);
}

const posAtTick30 = { x: character.position.x, y: character.position.y };
console.log(`Present tick: #30, Position: (${posAtTick30.x.toFixed(4)}, ${posAtTick30.y.toFixed(4)})`);

// Test 1: Snapshot comparison within deadzones (Prediction Success)
console.log("\n--- TEST 1: Prediction Success within deadzones ---");
const frame15 = historyBuffer.get(15);
if (!frame15) throw new Error("Frame 15 missing");

const accurateServerSnapshot: AuthoritativeWorldSnapshot = {
  tick: 20, // Server clock is at tick 20
  timestamp: performance.now(),
  lastProcessedInputTick: { [character.playerId || "keyboard"]: 15 }, // Server processed up to client tick 15
  entities: frame15.snapshot.entities.map((e) => ({
    id: e.id,
    name: e.name,
    x: e.x + 0.01, // 0.01u tiny delta, well within 0.05u deadzone
    y: e.y,
    z: e.z,
    vx: e.vx,
    vy: e.vy,
    vz: e.vz,
    isHeld: e.isHeld,
    heldBy: e.heldById,
    isClimbing: e.isClimbing,
    isSleeping: e.isSleeping,
  })),
};

const resultSuccess = PredictionReconciliation.reconcile(
  accurateServerSnapshot,
  historyBuffer,
  30,
  character.playerId || "keyboard",
  [character],
  objects,
  arena,
  playerManager,
  fixedDt
);

console.log("Prediction Success Result:", resultSuccess);
if (resultSuccess.reconciled !== false || resultSuccess.reason !== "success_within_deadzone") {
  console.error("FAIL: Expected success_within_deadzone, got:", resultSuccess);
  process.exit(1);
}
console.log("✅ TEST 1 PASSED: Client prediction accurately confirmed without rollbacks or jitter.");

// Test 2: Misprediction detected & corrected forward (Rollback + Replay + Smoothing)
console.log("\n--- TEST 2: Misprediction Rollback, Fast-Forward Re-simulation & Visual Smoothing ---");
// Let's introduce an authoritative bump of +1.5u along Y at tick 15 (e.g. server resolved an impact)
const divergedServerSnapshot: AuthoritativeWorldSnapshot = {
  tick: 22,
  timestamp: performance.now(),
  lastProcessedInputTick: { [character.playerId || "keyboard"]: 15 },
  entities: frame15.snapshot.entities.map((e) => {
    if (e.id === character.id) {
      return {
        id: e.id,
        name: e.name,
        x: e.x,
        y: e.y + 1.5, // 1.5u server displacement
        z: e.z,
        vx: e.vx,
        vy: e.vy,
        vz: e.vz,
        isHeld: false,
        heldBy: null,
        isClimbing: false,
        isSleeping: false,
      };
    }
    return {
      id: e.id,
      name: e.name,
      x: e.x,
      y: e.y,
      z: e.z,
      vx: e.vx,
      vy: e.vy,
      vz: e.vz,
      isHeld: e.isHeld,
      heldBy: e.heldById,
      isClimbing: e.isClimbing,
      isSleeping: e.isSleeping,
    };
  }),
};

const preReconcilePos = { x: character.position.x, y: character.position.y };
const resultReconcile = PredictionReconciliation.reconcile(
  divergedServerSnapshot,
  historyBuffer,
  30,
  character.playerId || "keyboard",
  [character],
  objects,
  arena,
  playerManager,
  fixedDt
);

console.log("Misprediction Reconcile Result:", resultReconcile);
if (resultReconcile.reconciled !== true || resultReconcile.reason !== "corrected_divergence") {
  console.error("FAIL: Expected corrected_divergence, got:", resultReconcile);
  process.exit(1);
}

const postReconcilePos = { x: character.position.x, y: character.position.y };
console.log(`Physical Hitbox: Pre: (${preReconcilePos.x.toFixed(4)}, ${preReconcilePos.y.toFixed(4)}) -> Post: (${postReconcilePos.x.toFixed(4)}, ${postReconcilePos.y.toFixed(4)})`);
console.log(`Visual Offset: (${character.visualOffset.x.toFixed(4)}, ${character.visualOffset.y.toFixed(4)})`);

// Zero-pop check: drawPos = postPos - visualOffset = prePos
const drawX = postReconcilePos.x - character.visualOffset.x;
const drawY = postReconcilePos.y - character.visualOffset.y;
const popDelta = Math.hypot(drawX - preReconcilePos.x, drawY - preReconcilePos.y);
console.log(`Render Screen Position Delta (Pop): ${popDelta.toFixed(6)}u`);

if (popDelta > 0.0001) {
  console.error("FAIL: Visual dampener popped by", popDelta);
  process.exit(1);
}
console.log("✅ Zero Visual Pop confirmed: Rendered position remained perfectly identical at the moment of correction!");

// Test 3: Visual Offset Smooth Decay
console.log("\n--- TEST 3: Visual Offset Decay Over Frames ---");
for (let frame = 1; frame <= 5; frame++) {
  character.decayVisualOffset(0.70);
  const offsetMag = Math.hypot(character.visualOffset.x, character.visualOffset.y);
  console.log(`Frame #${frame} Decay -> Remaining Offset: ${offsetMag.toFixed(4)}u`);
}

if (Math.hypot(character.visualOffset.x, character.visualOffset.y) > 0.3) {
  console.error("FAIL: Visual offset did not decay sufficiently");
  process.exit(1);
}
console.log("✅ TEST 3 PASSED: Visual offset smoothly glides toward 0 without popping.");

console.log("\n🎉 ALL PHASE 8 TESTS PASSED WITH 100% SUCCESS!");
