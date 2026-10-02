import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { Renderer } from "../src/engine/Renderer.js";
import { InputManager } from "../src/ui/InputManager.js";
import { DevPanel } from "../src/ui/DevPanel.js";
import { PlayerInputPacket } from "../src/engine/physics/StateHistoryBuffer.js";

console.log("==================================================================");
console.log("TEST SUITE: EXPLICIT GRAB TARGETING & SMART OBJECT SYNCHRONIZATION");
console.log("==================================================================");

// --- Test 1: Explicit Grab Intent (attempt to pick up X) ---
console.log("\n--- Test 1: Explicit Grab Intent on Server & Client ---");

const arena = new Arena(16, 16);
const char1 = new Character({
  x: 4.0,
  y: 4.0,
  color: "#38bdf8",
  playerId: "player-alpha",
});

const rockA = new GameObject({
  id: "rock-a",
  name: "Rock A",
  position: { x: 4.5, y: 4.0, z: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
});

const rockB = new GameObject({
  id: "rock-b",
  name: "Rock B",
  position: { x: 4.0, y: 4.6, z: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
});

const sim = new ServerGameSimulation(16, 16);
sim.initializeFromWorld(arena, [char1], [rockA, rockB]);

// Case 1A: Client sends grab with grabTargetObjectId = null (client had no target in reach)
// The server ghost must NOT grab anything, even though both rockA and rockB are within reach of ghost!
sim.queueInput({
  playerId: "player-alpha",
  moveX: 0,
  moveY: 0,
  isSprinting: false,
  isJumpHeld: false,
  isGrabHeld: true,
  grabTargetObjectId: null, // Explicitly no target
  isAiming: false,
  isLockHeld: false,
});

sim.step(1 / 60);

const sChar = sim.allCharacters[0];
if (sChar.heldObject === null) {
  console.log("✅ Passed: Ghost did not grab any object when grabTargetObjectId was null.");
} else {
  console.error("❌ FAILED: Ghost grabbed an object even though grabTargetObjectId was null:", sChar.heldObject.name);
  process.exit(1);
}

// Case 1B: Client sends explicit grab for rockB specifically (even though rockA is closer!)
sim.queueInput({
  playerId: "player-alpha",
  moveX: 0,
  moveY: 0,
  isSprinting: false,
  isJumpHeld: false,
  isGrabHeld: true,
  grabTargetObjectId: "rock-b", // Explicit intent: pick up B, NOT A
  isAiming: false,
  isLockHeld: false,
});

sim.step(1 / 60);

if (sChar.heldObject && sChar.heldObject.id === "rock-b") {
  console.log("✅ Passed: Ghost explicitly picked up target object 'rock-b', ignoring closer 'rock-a'.");
} else {
  console.error("❌ FAILED: Ghost did not pick up requested 'rock-b':", sChar.heldObject?.id);
  process.exit(1);
}

// --- Test 2: Smart Object Position Synchronization ---
console.log("\n--- Test 2: Smart Object Position Synchronization ---");

// Set up mock GameLoop objects
const clientBox = new GameObject({
  id: "sync-box",
  name: "Sync Box",
  position: { x: 5.0, y: 5.0, z: 0 },
  velocity: { x: 0.5, y: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
});

// Fake mock renderer and devPanel for GameLoop
const mockCanvas = {} as any;
const mockRenderer = { getHoverScale: () => 1.0, showBufferTrail: false } as any;
const mockInput = {} as any;
const mockDevPanel = { isEditMode: false, updateInspector: () => {} } as any;

const gameLoop = new GameLoop({
  canvas: mockCanvas,
  arena,
  character: char1,
  objects: [clientBox],
  renderer: mockRenderer,
  inputManager: mockInput,
  devPanel: mockDevPanel,
});

// Server snapshot reports the object slightly ahead at x = 5.2, vx = 0.8
const serverObjects = [
  {
    id: "sync-box",
    name: "Sync Box",
    x: 5.2,
    y: 5.0,
    z: 0,
    vx: 0.8,
    vy: 0,
    vz: 0,
    radius: 0.3,
    isSleeping: false,
  },
];

const initialX = clientBox.position.x;
gameLoop.syncAuthoritativeObjects(serverObjects);

if (clientBox.position.x > initialX && clientBox.position.x < 5.2) {
  console.log(`✅ Passed: Object position smoothly converged toward server (from ${initialX.toFixed(3)} to ${clientBox.position.x.toFixed(3)}).`);
} else {
  console.error("❌ FAILED: Object position did not smoothly converge:", clientBox.position.x);
  process.exit(1);
}

// Test sleeping sync: server object is sleeping at x = 5.2
const sleepingServerObjects = [
  {
    id: "sync-box",
    name: "Sync Box",
    x: 5.2,
    y: 5.0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 0.3,
    isSleeping: true,
  },
];

// Give client object slow speed
clientBox.velocity.x = 0.05;
gameLoop.syncAuthoritativeObjects(sleepingServerObjects);

if (clientBox.position.x === 5.2 && clientBox.isSleeping) {
  console.log("✅ Passed: Sleeping server object snapped client to exact rest coordinates and entered sleep mode.");
} else {
  console.error("❌ FAILED: Sleeping sync did not snap to rest coordinates:", clientBox.position.x, clientBox.isSleeping);
  process.exit(1);
}

// Test 3: Server Simulation syncObjectsFromPacket (Position AND Velocity)
console.log("\n--- Test 3: Server Simulation syncObjectsFromPacket (Position AND Velocity) ---");

const testRock = sim.objects.find((o) => o.id === "rock-a")!;
// Incoming client packet reports rock-a was kicked to x=6.0, y=5.0 with vx=4.0, vy=1.5
sim.syncObjectsFromPacket([
  {
    id: "rock-a",
    x: 6.0,
    y: 5.0,
    z: 0,
    vx: 4.0,
    vy: 1.5,
    vz: 0,
    radius: 0.3,
  },
]);

if (testRock.position.x === 6.0 && testRock.velocity.x === 4.0 && testRock.velocity.y === 1.5) {
  console.log("✅ Passed: Server object synchronized position AND velocity from incoming packet.");
} else {
  console.error("❌ FAILED: Server object failed to sync position or velocity:", testRock.position, testRock.velocity);
  process.exit(1);
}

// Step server physics forward: rock should integrate the synchronized velocity independently
sim.step(1 / 60);

if (testRock.position.x > 6.0) {
  console.log(`✅ Passed: Server object ran independent physics stepping forward to x=${testRock.position.x.toFixed(3)}.`);
} else {
  console.error("❌ FAILED: Server object did not integrate synchronized velocity:", testRock.position.x);
  process.exit(1);
}

console.log("\n🎉 ALL EXPLICIT GRAB & SMART OBJECT SYNCHRONIZATION TESTS PASSED 100%!");
