import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { GameServer } from "../src/server/GameServer.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../engine/Arena.js";

console.log("==================================================================");
console.log("PHASE 4 TEST SUITE: AUTHORITATIVE SERVER PHYSICS SIMULATION CORE");
console.log("==================================================================");

// --- Test 1: Headless Server Simulation Initialization & Stepping ---
console.log("\n--- Test 1: Headless Server Simulation & Physics Stepping ---");
const serverSim = new ServerGameSimulation();
serverSim.initializeDefaultScenario();

if (serverSim.arena.walls.length === 0) {
  throw new Error("Expected server simulation to load standard walls");
}
console.log(`✅ Passed: Server simulation initialized headless arena with ${serverSim.arena.walls.length} walls.`);

const player1 = serverSim.characters.get("player-1");
if (!player1) {
  throw new Error("Expected player-1 to exist in server simulation");
}

// Queue jump input for 1 tick
serverSim.queueInput({
  playerId: "player-1",
  moveX: 1.0,
  moveY: 0.0,
  isSprinting: false,
  isJumpHeld: true,
  isGrabHeld: false,
  isAiming: false,
  isLockHeld: false,
});

// Step 1 tick: player takes off
serverSim.step(1 / 60);
console.log(`Tick #1: Player Z = ${player1.position.z.toFixed(4)}, Vz = ${player1.verticalVelocity.toFixed(4)}`);
if (player1.verticalVelocity <= 0 || player1.position.z <= 0) {
  throw new Error("Expected player to take off on jump input");
}
console.log("✅ Passed: Player jumped with real vertical velocity on server physics step.");

// Step 40 ticks until gravity brings player back down to solid ground (g = 30.0 u/s^2)
for (let i = 2; i <= 45; i++) {
  serverSim.step(1 / 60);
}
console.log(`Tick #45: Player Z = ${player1.position.z.toFixed(4)}, Vz = ${player1.verticalVelocity.toFixed(4)}, Resting = ${player1.isRestingOnSurface}`);
if (player1.position.z !== 0 || !player1.isRestingOnSurface) {
  throw new Error(`Expected player to land with solid ground contact (Z = 0), got ${player1.position.z}`);
}
console.log("✅ Passed: Server gravity and collision resolver landed character with solid ground contact (Z = 0.000).");

// --- Test 2: Ghost Snapshot Reflects Server Physics State ---
console.log("\n--- Test 2: Ghost Snapshot Authoritative Output ---");
const ghostSnap = serverSim.getGhostSnapshot(45);
if (ghostSnap.character.z !== 0 || !ghostSnap.character.isGrounded) {
  throw new Error(`Expected ghost snapshot to report grounded contact, got z=${ghostSnap.character.z}`);
}
console.log(`Ghost Snapshot Z: ${ghostSnap.character.z}, Grounded: ${ghostSnap.character.isGrounded}, Objects: ${ghostSnap.objects.length}`);
console.log("✅ Passed: getGhostSnapshot output reflects true authoritative server physics.");

// --- Test 3: Phase 4.3 Contested Grab Resolution ---
console.log("\n--- Test 3: Contested Grab Arbitration (Strength & Proximity Tiebreakers) ---");
// Create a separate arena scenario with two players and a rock between them
const contestSim = new ServerGameSimulation();
contestSim.initializeDefaultScenario();

const charAlpha = new Character({
  x: 6.0,
  y: 4.4,
  playerId: "player-alpha",
  strength: 1.0, // Standard strength
  colliderRadius: 0.44,
});

const charBeta = new Character({
  x: 7.6,
  y: 4.4,
  playerId: "player-beta",
  strength: 2.0, // Stronger character!
  colliderRadius: 0.44,
});

contestSim.characters.set("player-alpha", charAlpha);
contestSim.characters.set("player-beta", charBeta);

// Target object at (6.8, 4.4) is exactly equidistant (0.8 units) from both players
const stone = contestSim.objects.find((o) => o.id === "stone-1")!;
stone.position.x = 6.8;
stone.position.y = 4.4;
stone.position.z = 0;

// Both players press grab targeting the stone on the exact same tick
contestSim.queueInput({
  playerId: "player-alpha",
  moveX: 0,
  moveY: 0,
  isSprinting: false,
  isJumpHeld: false,
  isGrabHeld: true,
  aimX: 6.8,
  aimY: 4.4,
  isAiming: true,
  isLockHeld: false,
});

contestSim.queueInput({
  playerId: "player-beta",
  moveX: 0,
  moveY: 0,
  isSprinting: false,
  isJumpHeld: false,
  isGrabHeld: true,
  aimX: 6.8,
  aimY: 4.4,
  isAiming: true,
  isLockHeld: false,
});

// Step simulation: contested grab arbitration resolves
contestSim.step(1 / 60);

if (contestSim.contestedGrabEvents.length === 0) {
  throw new Error("Expected contested grab event to be recorded");
}

const event = contestSim.contestedGrabEvents[0];
console.log(`Contested Grab Resolved: Winner=${event.winnerPlayerId}, Loser=${event.loserPlayerIds[0]}, Reason=${event.reason}`);

if (event.winnerPlayerId !== "player-beta" || event.reason !== "strength") {
  throw new Error(`Expected player-beta to win by strength, got ${event.winnerPlayerId} via ${event.reason}`);
}

if (charBeta.heldObject !== stone || charAlpha.heldObject !== null) {
  throw new Error("Expected charBeta to hold the stone and charAlpha to hold nothing");
}
console.log("✅ Passed: Stronger player won contested grab arbitration authoritatively.");

// --- Test 4: Standalone GameServer Loop Lifecycle ---
console.log("\n--- Test 4: Standalone GameServer Loop Lifecycle ---");
const gameServer = new GameServer();
let broadcastCount = 0;
gameServer.onSnapshotBroadcast = () => {
  broadcastCount++;
};

gameServer.start();
if (!gameServer.isRunning) {
  throw new Error("Expected GameServer to be running");
}

// Wait 100ms (~6 ticks) to verify tick execution
await new Promise((resolve) => setTimeout(resolve, 120));
gameServer.stop();

console.log(`GameServer executed and broadcasted ${broadcastCount} authoritative 60Hz ticks in 120ms.`);
if (broadcastCount < 3) {
  throw new Error(`Expected at least 3 ticks in 120ms, got ${broadcastCount}`);
}
console.log("✅ Passed: Standalone GameServer runs high-resolution 60Hz authoritative loop cleanly.");

console.log("\n🎉 ALL PHASE 4 AUTHORITATIVE SERVER PHYSICS SIMULATION TESTS PASSED 100%!");
