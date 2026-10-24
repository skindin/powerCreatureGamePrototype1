import assert from "node:assert";
import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { OnlineSessionManager } from "../src/network/OnlineSessionManager.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

(globalThis as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

console.log("==================================================================");
console.log("🧪 TESTING ONLINE SPRINT WALL COLLISION DAMAGE & HP STABILITY");
console.log("==================================================================");

// 1. Arena setup
const arena = new Arena(20, 20);

// 2. Setup Client GameLoop
const clientCanvas = { width: 800, height: 600 } as any;
const mockRenderer = { getHoverScale: () => 1.0, showBufferTrail: false } as any;
const mockInput = { isKeyboardActive: false, gamepadSlots: new Map() } as any;
const mockDevPanel = { isEditMode: false, updateInspector: () => {} } as any;

const clientLoop = new GameLoop({
  arena,
  objects: [],
  renderer: mockRenderer,
  inputManager: mockInput,
  devPanel: mockDevPanel,
});
clientLoop.arena = arena;
const clientChar = clientLoop.playerManager.baseCharacter;
clientChar.position.x = 18.5; // Near right wall (x=20)
clientChar.position.y = 10;
clientChar.position.z = 0;
clientLoop.enableAuthoritativeObjectSync = true;

// Setup mock online session manager
const mockClient = {
  on: () => {},
  send: () => {},
  sendPlayerInput: () => {},
  sendReliableAction: () => {},
  unacknowledgedObjectDeletionAcks: new Set(),
  unacknowledgedDeathRespawnAcks: new Set(),
  unacknowledgedContestedAcks: new Set(),
} as any;

const sessionManager = new OnlineSessionManager(mockClient, clientLoop);

// 3. Setup ServerGameSimulation
const serverSim = new ServerGameSimulation(arena);
const serverChar = new Character({
  id: "keyboard",
  name: "Player 1",
  position: { x: 18.5, y: 10, z: 0 },
  color: "#3b82f6",
  colliderRadius: 0.44,
  mass: 1.2,
});
serverChar.playerId = "keyboard";
serverSim.characters.set("keyboard", serverChar);

console.log("\n--- TEST 1: Sprinting directly into arena wall in online mode ---");
clientChar.setSprinting(true);
const initialHp = clientChar.healthModule.getCurrentHp(clientChar.properties);
assert.strictEqual(initialHp, 100, "Initial HP must be 100");

let hpDipped = false;
let knockbackObserved = false;

for (let frame = 0; frame < 60; frame++) {
  const dt = 1 / 60;

  // Client updates character movement
  clientChar.movementInput = { x: 1, y: 0 };
  clientChar.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false, clientLoop.objects, false);

  // Client physics & collision resolution
  CollisionResolver.resolveEntityCollisions(
    [clientChar, ...clientLoop.objects],
    arena,
    dt,
    null,
    "continuous"
  );

  // Server processes input with trailing latency
  serverSim.queueInput("keyboard", {
    tick: frame,
    moveX: 1,
    moveY: 0,
    isSprinting: true,
    isJumpHeld: false,
    isGrabHeld: false,
    isThrow: false,
    isDrop: false,
    isAiming: false,
  });
  serverSim.step(dt);
  const serverSnapshot = serverSim.getGhostSnapshot(60, "keyboard");

  // Send server snapshot to client with trailing speed (representing 60ms RTT lag)
  // Server state has high sprint velocity (vx ~ 8.06) while client hit wall and stopped (vx = 0)
  const myServerGhost = serverSnapshot.characters.find((c) => c.id === "keyboard");
  if (myServerGhost) {
    sessionManager.handleSnapshotReceived(serverSnapshot);
  }

  const curHp = clientChar.healthModule.getCurrentHp(clientChar.properties);
  if (curHp < 100) {
    hpDipped = true;
    console.error(`Frame ${frame}: Client HP dipped to ${curHp}!`);
  }
  if (clientChar.isUnderKnockback) {
    knockbackObserved = true;
    console.error(`Frame ${frame}: Client erroneously flagged with isUnderKnockback!`);
  }
}

assert.strictEqual(hpDipped, false, "Client HP must NEVER dip or wig out when sprinting into walls!");
assert.strictEqual(knockbackObserved, false, "Client must NEVER be put into involuntary knockback from sprinting into walls!");
console.log("✅ Test 1 Passed: Sprinting into wall produced 0 damage and 0 HP flutter across all 60 frames.");

console.log("\n--- TEST 2: Sprinting directly into a stationary prop / freebody ---");
const crate = new GameObject({
  id: "crate_test",
  name: "Crate",
  position: { x: 19.0, y: 10, z: 0 },
  mass: 10.0,
  colliderRadius: 0.4,
});
clientLoop.objects.push(crate);
serverSim.objects.push(crate);

// Place client near crate and sprint into crate
clientChar.position.x = 18.2;
clientChar.position.y = 10;
clientChar.velocity.x = 8.0;
clientChar.setSprinting(true);

for (let frame = 0; frame < 30; frame++) {
  const dt = 1 / 60;
  clientChar.movementInput = { x: 1, y: 0 };
  clientChar.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false, clientLoop.objects, false);

  CollisionResolver.resolveEntityCollisions(
    [clientChar, ...clientLoop.objects],
    arena,
    dt,
    null,
    "continuous"
  );

  const curHp = clientChar.healthModule.getCurrentHp(clientChar.properties);
  assert.strictEqual(curHp, 100, `Client HP must remain 100 when bumping into stationary crate at frame ${frame}`);
}

console.log("✅ Test 2 Passed: Sprinting into stationary crate produced 0 damage on character.");

console.log("\n--- TEST 3: Involuntary knockback fling (e.g. punch / projectile) STILL deals wall damage ---");
// Manually apply genuine involuntary knockback with high speed into wall
clientChar.position.x = 19.5;
clientChar.position.y = 10;
clientChar.velocity.x = 12.0; // Thrown/knocked back into right wall at 12 m/s
clientChar.velocity.y = 0;
// Character is NOT actively locomoting (reeling from external hit)
clientChar.isActivelyWalking = false;
clientChar.isSprinting = false;
clientChar.movementInput = { x: 0, y: 0 };
clientChar.applyKnockbackWindow(600);

const hpBeforeFling = clientChar.healthModule.getCurrentHp(clientChar.properties);
clientChar.updatePosition(1 / 60, arena);

const hpAfterFling = clientChar.healthModule.getCurrentHp(clientChar.properties);
console.log(`HP before fling into wall: ${hpBeforeFling}, HP after fling: ${hpAfterFling}`);
assert.ok(hpAfterFling < hpBeforeFling, "Involuntary knockback fling into wall MUST still inflict wall impact damage!");
console.log("✅ Test 3 Passed: Involuntary combat knockback fling correctly inflicts wall impact damage as intended.");

console.log("\n==================================================================");
console.log("🎉 ALL TESTS PASSED: WALL SPRINT HP DAMAGE & WIGGLE COMPLETELY RESOLVED!");
console.log("==================================================================");
