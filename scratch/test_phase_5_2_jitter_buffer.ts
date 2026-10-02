import { PlayerJitterQueue, ServerJitterBufferManager } from "../src/server/ServerJitterBuffer.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { PlayerInputPacket } from "../src/engine/physics/StateHistoryBuffer.js";

function makeInput(pId: string, tick: number, moveX: number, moveY: number, aimX = 10, aimY = 10): PlayerInputPacket {
  return {
    playerId: pId,
    tick,
    moveX,
    moveY,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isDrop: false,
    isThrow: false,
    isAiming: true,
    isLockHeld: false,
    aimX,
    aimY,
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

console.log("=== PHASE 5.2 SERVER JITTER BUFFER TESTS ===");

// 1. Sorted Priority Queue & Out-of-Order Packet Insertion
console.log("\n--- Test 1: Out-of-order insertion and sorting ---");
const queue = new PlayerJitterQueue("player-1", { targetDepth: 2, maxCapacity: 60 });
assert(queue.push(makeInput("player-1", 10, 1, 0)), "Push tick 10 succeeded");
assert(queue.push(makeInput("player-1", 15, 1, 0)), "Push tick 15 succeeded");
assert(queue.push(makeInput("player-1", 12, 1, 0)), "Push tick 12 succeeded (out of order)");
assert(queue.push(makeInput("player-1", 11, 1, 0)), "Push tick 11 succeeded (out of order)");

assert(queue.length === 4, "Queue length is 4");
const stats1 = queue.getStats();
assert(stats1.oldestTick === 10, "Oldest tick is 10");
assert(stats1.newestTick === 15, "Newest tick is 15");

// 2. Deduplication of Identical Ticks
console.log("\n--- Test 2: Deduplication of duplicate packets ---");
assert(!queue.push(makeInput("player-1", 12, 0.5, 0)), "Push duplicate tick 12 is rejected");
assert(queue.length === 4, "Queue length remains 4 after duplicate push");
assert(queue.getStats().duplicates === 1, "Duplicate counter is 1");

// 3. Stale Packet Rejection
console.log("\n--- Test 3: Stale packet rejection after consumption ---");
const consume1 = queue.consume();
assert(consume1.packet.tick === 10, "First consumed packet is tick 10");
assert(!queue.push(makeInput("player-1", 10, 1, 1)), "Pushing already consumed tick 10 is rejected as stale");
assert(!queue.push(makeInput("player-1", 8, 1, 1)), "Pushing older tick 8 is rejected as stale");
assert(queue.getStats().duplicates === 3, "Duplicates/stale counter is 3");

// 4. Target Depth & Backlog Drain under Burst
console.log("\n--- Test 4: Burst drainage keeping server aligned with target depth ---");
const burstQueue = new PlayerJitterQueue("player-1", { targetDepth: 2, burstDrainThreshold: 3 });
// Push 6 packets in a sudden network burst
for (let t = 20; t <= 25; t++) {
  burstQueue.push(makeInput("player-1", t, 1, 0));
}
assert(burstQueue.length === 6, "Burst queue has 6 packets before consumption");

// Consuming should drain intermediate packets so that targetDepth (2) packets remain buffered
const burstResult = burstQueue.consume();
assert(burstResult.drainedPackets.length === 3, `Drained 3 backlog packets (got ${burstResult.drainedPackets.length})`);
assert(burstResult.drainedPackets[0].tick === 20, "First drained packet was tick 20");
assert(burstResult.drainedPackets[1].tick === 21, "Second drained packet was tick 21");
assert(burstResult.drainedPackets[2].tick === 22, "Third drained packet was tick 22");
assert(burstResult.packet.tick === 23, "Current consumed packet is tick 23");
assert(burstQueue.length === 2, `Remaining queue depth is exactly targetDepth = 2 (got ${burstQueue.length})`);

// 5. Starvation Handling & Safe Neutral Packet
console.log("\n--- Test 5: Starvation handling & neutral inputs ---");
const starveQueue = new PlayerJitterQueue("player-2", { targetDepth: 2 });
starveQueue.push(makeInput("player-2", 1, 1, 0, 42, 84));
const normalPkt = starveQueue.consume();
assert(!normalPkt.isStarved, "First consume not starved");
assert(normalPkt.packet.aimX === 42 && normalPkt.packet.aimY === 84, "Aim coordinates preserved");

// Now consume while empty
const starvePkt = starveQueue.consume(2);
assert(starvePkt.isStarved, "Starved consume reported isStarved === true");
assert(starvePkt.packet.moveX === 0 && starvePkt.packet.moveY === 0, "Move velocity zeroed to prevent runaway overshoot");
assert(!starvePkt.packet.isJumpHeld && !starvePkt.packet.isGrabHeld && !starvePkt.packet.isThrow, "All trigger buttons released");
assert(starvePkt.packet.aimX === 42 && starvePkt.packet.aimY === 84, "Last known aim cursor coordinates preserved");
assert(starveQueue.getStats().starvations === 1, "Starvation count is 1");

// 6. Capacity Clamp Overflow Protection
console.log("\n--- Test 6: Capacity clamp overflow protection ---");
const clampQueue = new PlayerJitterQueue("player-3", { targetDepth: 2, maxCapacity: 5 });
for (let t = 1; t <= 10; t++) {
  clampQueue.push(makeInput("player-3", t, 0, 0));
}
assert(clampQueue.length === 5, `Queue length clamped to maxCapacity 5 (got ${clampQueue.length})`);
assert(clampQueue.getStats().overflows === 5, "Overflow counter recorded 5 dropped packets");
assert(clampQueue.getStats().oldestTick === 6, "Oldest tick in clamped queue is 6");
assert(clampQueue.getStats().newestTick === 10, "Newest tick in clamped queue is 10");

// 7. Integration with ServerGameSimulation
console.log("\n--- Test 7: Integration with ServerGameSimulation ---");
const server = new ServerGameSimulation();
server.initializeDefaultScenario();

// Queue inputs for server player
server.queueInput(makeInput("player-1", 1, 1, 0));
server.queueInput(makeInput("player-1", 3, 1, 0)); // out of order
server.queueInput(makeInput("player-1", 2, 1, 0)); // out of order
server.queueInput(makeInput("player-1", 2, 1, 0)); // duplicate

const jitterStats = server.getJitterStats("player-1");
assert(jitterStats !== null, "Jitter stats retrieved for player-1");
assert(jitterStats!.currentDepth === 3, `Jitter queue depth is 3 (got ${jitterStats!.currentDepth})`);
assert(jitterStats!.duplicates === 1, "Duplicate packet rejected by simulation jitter queue");

const charBefore = server.characters.get("player-1")!;
const startX = charBefore.position.x;

// Step simulation
for (let i = 0; i < 5; i++) {
  server.step(1 / 60);
}

const charAfter = server.characters.get("player-1")!;
assert(charAfter.position.x > startX, "Character moved smoothly forward under jitter-buffered inputs");
const postStats = server.getJitterStats("player-1")!;
assert(postStats.consumedCount === 3, `Consumed exactly 3 packets (got ${postStats.consumedCount})`);
assert(postStats.starvations === 2, `Starvation triggered gracefully on 2 empty steps (got ${postStats.starvations})`);

console.log(`\n========================================`);
console.log(`ALL TESTS PASSED: ${passed}/${total}`);
console.log(`========================================\n`);
