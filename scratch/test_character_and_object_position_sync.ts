import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { GhostEntityState } from "../src/network/RelayClient.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("==================================================================");
console.log("🧪 TESTING CHARACTER & OBJECT POSITION & VELOCITY SYNCHRONIZATION");
console.log("==================================================================");

// Setup Headless World
const sim = new ServerGameSimulation();
const arena = new Arena(20, 14, 1.0);
const clientChar = new Character({
  x: 5.0,
  y: 7.0,
  color: "#f59e0b",
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
  playerId: "keyboard",
});

const clientObj = new GameObject({
  id: "box-1",
  name: "Test Box",
  position: { x: 8.0, y: 7.0, z: 0 },
  velocity: { x: 2.0, y: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
  color: "#38bdf8",
});

sim.initializeFromWorld(arena, [clientChar], [clientObj]);

const serverChar = sim.characters.get("keyboard")!;
const serverObj = sim.objects[0];

assert(serverChar !== undefined, "Server character initialized");
assert(serverObj !== undefined, "Server object initialized");

// Test 1: syncCharacterFromPacket updates server character position and velocity
console.log("\n--- TEST 1: Character Position & Velocity Sync ---");
const charTelemetry: GhostEntityState = {
  id: "keyboard",
  x: 6.2,
  y: 7.5,
  z: 0.5,
  vx: 3.5,
  vy: 1.2,
  vz: 2.0,
  radius: 0.44,
  surfaceZ: 0,
  isGrounded: false,
  isClimbing: false,
};

// Initial divergence is > 0.4, should snap directly
sim.syncCharacterFromPacket(charTelemetry);
assert(Math.abs(serverChar.position.x - 6.2) < 0.001, "Server char snapped to client X");
assert(Math.abs(serverChar.position.y - 7.5) < 0.001, "Server char snapped to client Y");
assert(Math.abs(serverChar.position.z - 0.5) < 0.001, "Server char snapped to client Z");
assert(Math.abs(serverChar.velocity.x - 3.5) < 0.001, "Server char velocity X synced");
assert(Math.abs(serverChar.velocity.y - 1.2) < 0.001, "Server char velocity Y synced");
assert(Math.abs(serverChar.verticalVelocity - 2.0) < 0.001, "Server char vertical velocity synced");
console.log("✅ Test 1 Passed: Character snapped to client coordinates and inherited velocity");

// Test 2: Character smooth convergence when close (dist <= 0.4)
console.log("\n--- TEST 2: Smooth Character Convergence ---");
const smallDeltaTelemetry: GhostEntityState = {
  id: "keyboard",
  x: 6.3, // delta = 0.1
  y: 7.5,
  z: 0.5,
  vx: 3.5,
  vy: 1.2,
  vz: 2.0,
  radius: 0.44,
};

sim.syncCharacterFromPacket(smallDeltaTelemetry);
// 50% blend of 0.1 delta = +0.05 -> x becomes 6.25
assert(Math.abs(serverChar.position.x - 6.25) < 0.01, `Server char converged smoothly (got ${serverChar.position.x.toFixed(3)})`);
console.log(`✅ Test 2 Passed: Character converged smoothly to ${serverChar.position.x.toFixed(3)}`);

// Test 3: Starvation handling stops runaway ghost steering
console.log("\n--- TEST 3: Starvation Handling Stops Runaway Steering ---");
// Simulate empty queue over multiple ticks
const startX = serverChar.position.x;
for (let t = 0; t < 10; t++) {
  sim.step(1 / 60);
}
// Without inputs, character should decelerate / stay in place, NOT sprint across the arena!
const distanceMoved = Math.abs(serverChar.position.x - startX);
assert(distanceMoved < 0.5, `Character remained bounded during starvation (moved ${distanceMoved.toFixed(3)}u)`);
console.log(`✅ Test 3 Passed: Starved queue did not cause runaway sprint (moved only ${distanceMoved.toFixed(3)}u)`);

// Test 4: Freebody Object Tight Sync
console.log("\n--- TEST 4: Freebody Object Tight Sync ---");
const objTelemetry: GhostEntityState[] = [
  {
    id: "box-1",
    x: 8.6, // delta = 0.6 > 0.4 -> snap
    y: 7.0,
    z: 0,
    vx: 5.0,
    vy: -1.0,
    vz: 0,
    radius: 0.3,
  },
];

sim.syncObjectsFromPacket(objTelemetry);
assert(Math.abs(serverObj.position.x - 8.6) < 0.001, "Server object snapped on >0.4 divergence");
assert(Math.abs(serverObj.velocity.x - 5.0) < 0.001, "Server object velocity synced");
console.log("✅ Test 4 Passed: Server object snapped on divergence and inherited exact velocity");

// Test 5: Ghost snapshot verification
console.log("\n--- TEST 5: Ghost Snapshot Generation ---");
const snap = sim.getGhostSnapshot(45);
assert(Math.abs(snap.character.x - serverChar.position.x) < 0.001, "Ghost snapshot matches server char X");
assert(Math.abs(snap.character.y - serverChar.position.y) < 0.001, "Ghost snapshot matches server char Y");
assert(Math.abs(snap.objects[0].x - serverObj.position.x) < 0.001, "Ghost snapshot matches server obj X");
console.log("✅ Test 5 Passed: Ghost snapshot reflects exact server coordinates");

console.log("\n==================================================================");
console.log("🎉 ALL CHARACTER & OBJECT POSITION SYNC TESTS PASSED 100%!");
console.log("==================================================================");
