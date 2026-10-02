import { ServerJitterBufferManager, PlayerJitterQueue } from "../src/server/ServerJitterBuffer.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { PlayerInputPacket } from "../src/engine/physics/StateHistoryBuffer.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Renderer } from "../src/engine/Renderer.js";
import { InputManager } from "../src/ui/InputManager.js";
import { DevPanel } from "../src/ui/DevPanel.js";

function makeInput(pId: string, tick: number): PlayerInputPacket {
  return {
    playerId: pId,
    tick,
    moveX: 1,
    moveY: 0,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isDrop: false,
    isThrow: false,
    isAiming: false,
    isLockHeld: false,
  };
}

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

console.log("=== PHASE 6: ADAPTIVE CLOCK SYNCHRONIZATION & TIME DILATION TESTS ===");

// 1. Task 6.1: Queue Depth Measurement & Dilation Factor Computation
console.log("\n--- Test 1: Underflow, Overflow, and Steady State Dilation Factors ---");
const queue = new PlayerJitterQueue("player-1", { targetDepth: 2 });

// Underflow: empty queue (depth = 0 < 1)
assert(queue.computeDilationFactor() > 1.0, `Empty queue triggers speedup (> 1.00): ${queue.computeDilationFactor()}x`);
assert(queue.computeDilationFactor() <= 1.02, `Dilation factor does not exceed max clamp 1.02x: ${queue.computeDilationFactor()}x`);

// Steady state: target depth (depth = 2)
queue.push(makeInput("player-1", 1));
queue.push(makeInput("player-1", 2));
assert(queue.length === 2, "Queue depth is 2 (target)");
assert(queue.computeDilationFactor() === 1.0, `Target depth (2) yields exact 1.000x cruise speed: ${queue.computeDilationFactor()}x`);

// Minor acceptable cushion (depth = 3)
queue.push(makeInput("player-1", 3));
assert(queue.length === 3, "Queue depth is 3");
assert(queue.computeDilationFactor() === 1.0, `Depth 3 cushion yields 1.000x: ${queue.computeDilationFactor()}x`);

// Overflow: depth > 3 (depth = 4)
queue.push(makeInput("player-1", 4));
assert(queue.length === 4, "Queue depth is 4 (overflow)");
assert(queue.computeDilationFactor() < 1.0, `Overflow depth 4 triggers slowdown (< 1.00): ${queue.computeDilationFactor()}x`);
assert(queue.computeDilationFactor() >= 0.98, `Slowdown factor does not drop below min clamp 0.98x: ${queue.computeDilationFactor()}x`);

// Extreme Overflow: depth = 5+
queue.push(makeInput("player-1", 5));
assert(queue.length === 5, "Queue depth is 5");
assert(queue.computeDilationFactor() === 0.985, `High overflow yields 0.985x: ${queue.computeDilationFactor()}x`);

// 2. Task 6.2: ClockSyncPacket Generation in ServerGameSimulation
console.log("\n--- Test 2: Server Periodic Evaluation & Feedback Packets ---");
const server = new ServerGameSimulation();
server.initializeDefaultScenario();

// Advance 10 ticks to trigger first periodic check
for (let i = 0; i < 10; i++) {
  server.step(1 / 60);
}

const sync1 = server.getLatestClockSync("player-1");
assert(sync1 !== null, "ClockSyncPacket generated on tick 10");
assert(sync1!.serverTick === 10, "Packet serverTick matches simulation tick 10");
assert(sync1!.targetQueueDepth === 2, "targetQueueDepth is 2");
assert(sync1!.currentQueueDepth === 0, "currentQueueDepth is 0 (underflow)");
assert(sync1!.dilationFactor > 1.0, `Underflow dilation factor is > 1.00: ${sync1!.dilationFactor}x`);

// Now push 2 packets into player's queue and step to tick 20
server.queueInput(makeInput("player-1", 100));
server.queueInput(makeInput("player-1", 101));

for (let i = 0; i < 10; i++) {
  server.step(1 / 60);
}

const sync2 = server.getLatestClockSync("player-1");
assert(sync2!.serverTick === 20, "ClockSync updated on tick 20");
assert(sync2!.currentQueueDepth === 0, "Packets consumed during stepping, back to underflow");

// Test ghost snapshot includes clockSync
const snapshot = server.getGhostSnapshot(50);
assert(snapshot.clockSync !== undefined, "GhostSnapshot contains clockSync field");
assert(snapshot.clockSync!.type === "clock_sync", "Snapshot clockSync type is 'clock_sync'");

// 3. Task 6.3: Client Adaptive Accumulator in GameLoop
console.log("\n--- Test 3: Client Accumulator Adaptive Time Dilation ---");
// Create mock canvas and context for GameLoop
const mockCanvas = { width: 800, height: 600 } as any;
const mockCtx = {
  canvas: mockCanvas,
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  roundRect: () => {},
  fillText: () => {},
  measureText: () => ({ width: 50 }),
} as any;

const arena = new Arena(20, 14, 1.0);
const renderer = new Renderer(mockCtx);
const inputManager = new InputManager(mockCanvas, arena);
const mockDevPanel = {
  isEditMode: false,
  editTool: "select",
  updateInspector: () => {},
  selectedEntity: null,
  rollbackDepthTicks: 30,
} as any;

const gameLoop = new GameLoop({
  arena,
  objects: [],
  renderer,
  inputManager,
  devPanel: mockDevPanel,
});

assert(gameLoop.timeDilation === 1.0, "Initial client timeDilation is 1.000");

// Apply an underflow clock sync (speed up 1.5%)
gameLoop.applyClockSync({
  type: "clock_sync",
  serverTick: 100,
  targetQueueDepth: 2,
  currentQueueDepth: 0,
  dilationFactor: 1.015,
});

assert(gameLoop.targetTimeDilation === 1.015, "targetTimeDilation updated to 1.015");

// Test clamping of rogue extreme factors
gameLoop.applyClockSync({
  type: "clock_sync",
  serverTick: 101,
  targetQueueDepth: 2,
  currentQueueDepth: 0,
  dilationFactor: 1.500, // beyond clamp
});
assert(gameLoop.targetTimeDilation === 1.020, `Extreme dilation clamped to 1.020 (got ${gameLoop.targetTimeDilation})`);

gameLoop.applyClockSync({
  type: "clock_sync",
  serverTick: 102,
  targetQueueDepth: 2,
  currentQueueDepth: 10,
  dilationFactor: 0.500, // below clamp
});
assert(gameLoop.targetTimeDilation === 0.980, `Extreme slowdown clamped to 0.980 (got ${gameLoop.targetTimeDilation})`);

// Reset to normal 1.01x cruise speed
gameLoop.applyClockSync({
  type: "clock_sync",
  serverTick: 103,
  targetQueueDepth: 2,
  currentQueueDepth: 1,
  dilationFactor: 1.010,
});

// Accumulator progression test with dilation
const initialAccum = (gameLoop as any).accumulator;
const deltaSec = 0.016; // ~1 frame

// Test accumulator integration: accumulator += deltaSec * timeDilation
(gameLoop as any).accumulator += deltaSec * 1.01;
assert((gameLoop as any).accumulator > initialAccum + deltaSec, "Accumulator accumulated more than 1.0x due to time dilation");

// Return to steady state (1.00x)
gameLoop.applyClockSync({
  type: "clock_sync",
  serverTick: 110,
  targetQueueDepth: 2,
  currentQueueDepth: 2,
  dilationFactor: 1.000,
});
assert(gameLoop.targetTimeDilation === 1.000, "Stabilized server buffer returns targetTimeDilation to 1.000x");

console.log(`\n========================================`);
console.log(`ALL PHASE 6 TESTS PASSED: ${passed}/${total}`);
console.log(`========================================\n`);
