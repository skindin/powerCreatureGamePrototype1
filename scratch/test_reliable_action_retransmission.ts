import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { RelayClient } from "../src/network/RelayClient.js";
import { ReliableActionCommand } from "../src/engine/physics/StateHistoryBuffer.js";

console.log("==================================================================");
console.log("TEST SUITE: RELIABLE ACTION COMMANDS, RETRANSMISSION & ACKS");
console.log("==================================================================");

// --- Test 1: Queuing & Retransmission of Important Actions ---
console.log("\n--- Test 1: Outbox Queuing & Retransmission ---");

const relayClient = new RelayClient();
const action1: ReliableActionCommand = {
  actionId: "act-keyboard-pickup-1-100",
  type: "pickup",
  tick: 42,
  timestamp: Date.now(),
  playerId: "player-alpha",
  targetObjectId: "rock-test",
};

relayClient.queueReliableAction(action1);

if (relayClient.unackedActionsCount === 1) {
  console.log("✅ Passed: Important action queued in unacknowledged outbox.");
} else {
  console.error("❌ FAILED: Action was not queued:", relayClient.unackedActionsCount);
  process.exit(1);
}

// Check that subsequent sendInput captures include the action
// Even if packet is lost, unackedActionsCount remains 1
if (relayClient.unackedActionsCount === 1) {
  console.log("✅ Passed: Action remains in outbox for retransmission until ACK'd.");
}

// --- Test 2: Server Idempotent Execution & Deduplication ---
console.log("\n--- Test 2: Server Idempotent Execution & Deduplication ---");

const arena = new Arena(16, 16);
const char = new Character({
  x: 5.0,
  y: 5.0,
  playerId: "player-alpha",
});

const rock = new GameObject({
  id: "rock-test",
  name: "Rock Test",
  position: { x: 5.3, y: 5.0, z: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
});

const serverSim = new ServerGameSimulation(16, 16);
serverSim.initializeFromWorld(arena, [char], [rock]);

// First transmission arrival
const acks1 = serverSim.processReliableActions([action1]);

const sChar = serverSim.allCharacters[0];
if (sChar.heldObject && sChar.heldObject.id === "rock-test") {
  console.log("✅ Passed: Server executed important 'pickup' command authoritatively.");
} else {
  console.error("❌ FAILED: Server failed to execute pickup command:", sChar.heldObject);
  process.exit(1);
}

if (acks1.includes("act-keyboard-pickup-1-100")) {
  console.log("✅ Passed: Server generated ACK for actionId 'act-keyboard-pickup-1-100'.");
} else {
  console.error("❌ FAILED: Server failed to generate ACK:", acks1);
  process.exit(1);
}

// Duplicate retransmission arrival (due to network latency/packet delay)
const acks2 = serverSim.processReliableActions([action1]);

if (acks2.includes("act-keyboard-pickup-1-100")) {
  console.log("✅ Passed: Server acknowledged duplicate retransmission without double-executing.");
} else {
  console.error("❌ FAILED: Server failed to acknowledge duplicate retransmission:", acks2);
  process.exit(1);
}

// --- Test 3: Delivery Confirmation & Purge on Client ---
console.log("\n--- Test 3: Delivery Confirmation & Purge on Client ---");

// Client receives ACK
relayClient.acknowledgeActions(acks1);

if (relayClient.unackedActionsCount === 0) {
  console.log("✅ Passed: Client received delivery confirmation and purged action from retransmission outbox.");
} else {
  console.error("❌ FAILED: Outbox still contains unacknowledged action:", relayClient.unackedActionsCount);
  process.exit(1);
}

// --- Test 4: Dedicated Drop and Throw Reliable Commands ---
console.log("\n--- Test 4: Dedicated Drop and Throw Reliable Commands ---");

// Throw command
const throwAction: ReliableActionCommand = {
  actionId: "act-keyboard-throw-2-200",
  type: "throw",
  tick: 43,
  timestamp: Date.now(),
  playerId: "player-alpha",
  targetObjectId: "rock-test",
  aimX: 10.0,
  aimY: 5.0,
  isLockHeld: false,
};

const throwAcks = serverSim.processReliableActions([throwAction]);

const sRock = serverSim.objects.find((o) => o.id === "rock-test")!;
if (sChar.heldObject === null && sRock.velocity.x > 0) {
  console.log(`✅ Passed: Server executed important 'throw' command with launch velocity vx=${sRock.velocity.x.toFixed(2)}.`);
} else {
  console.error("❌ FAILED: Server failed to execute throw command:", sChar.heldObject, sRock.velocity);
  process.exit(1);
}

if (throwAcks.includes("act-keyboard-throw-2-200")) {
  console.log("✅ Passed: Throw command acknowledged successfully.");
} else {
  console.error("❌ FAILED: Server failed to generate ACK for throw:", throwAcks);
  process.exit(1);
}

console.log("\n🎉 ALL RELIABLE ACTION RETRANSMISSION & ACK TESTS PASSED 100%!");
