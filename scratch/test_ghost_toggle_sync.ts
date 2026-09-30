import { RelayClient } from "../src/network/RelayClient.js";
import { RemoteEntityInterpolator, RemoteEntitySample } from "../src/engine/physics/RemoteEntityInterpolator.js";
import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

console.log("=== Testing Ghost Toggle Decoupling from Network Sync ===");

const arena = new Arena();
const relayClient = new RelayClient();
const interpolator = new RemoteEntityInterpolator();

const p1 = new Character({
  id: "player-1",
  name: "Player 1",
  position: { x: 5, y: 5, z: 0 },
  playerColor: "#f59e0b",
});
p1.playerId = "player-1";

const p2 = new Character({
  id: "player-2",
  name: "Player 2",
  position: { x: 10, y: 8, z: 0 },
  playerColor: "#06b6d4",
});
p2.playerId = "player-2";

// Initialize server simulation with characters
relayClient.syncServerWorld(arena, [p1, p2], []);

// 1. Verify that initially, showGhostClones is true and getLatestGhost returns snapshot
if (!relayClient.showGhostClones) {
  throw new Error("Expected relayClient.showGhostClones to default to true");
}
let snap = relayClient.getLatestGhost();
if (!snap) {
  throw new Error("Expected getLatestGhost() to return snapshot when showGhostClones is true");
}
console.log("✓ Initial getLatestGhost() returns snapshot when showGhostClones is true");

// 2. TOGGLE GHOSTS OFF
relayClient.showGhostClones = false;

// 3. Verify getLatestGhost() STILL returns snapshot (crucial fix!)
snap = relayClient.getLatestGhost();
if (!snap) {
  throw new Error("FAILED: getLatestGhost() returned null when showGhostClones is false! Network sync was severed.");
}
console.log("✓ getLatestGhost() STILL returns valid snapshot even when showGhostClones is false!");

// 4. Verify characters are present in snapshot
if (!snap.characters || snap.characters.length < 2) {
  throw new Error(`Expected at least 2 characters in snapshot, got ${snap.characters?.length}`);
}
console.log(`✓ Snapshot contains ${snap.characters.length} characters`);

// 5. Simulate server simulation moving Player 2 (e.g. walking right)
p2.velocity.x = 4.0;
p2.position.x = 12.0;
relayClient.syncServerWorld(arena, [p1, p2], []);

// Fetch updated snapshot with ghosts still toggled OFF
snap = relayClient.getLatestGhost();
if (!snap) {
  throw new Error("Snapshot was null after world update with ghosts off");
}

const samples: RemoteEntitySample[] = snap.characters!.map((gc) => ({
  id: gc.id,
  x: gc.x,
  y: gc.y,
  z: gc.z,
  vx: gc.vx,
  vy: gc.vy,
  vz: gc.vz || 0,
  facingAngle: 0,
  isClimbing: gc.isClimbing,
  isAboveWalls: gc.isAboveWalls,
  isGrounded: gc.isGrounded,
  surfaceZ: gc.surfaceZ,
  heldObjectId: null,
  heldBy: null,
  color: gc.color,
  radius: gc.radius,
}));

const now = performance.now();
interpolator.pushSnapshot(snap.seq, samples, now);

// 6. Test that remote player (Player 2) interpolates and forward-predicts properly
const p2State = interpolator.getInterpolatedState("player-2", now, 60);
if (!p2State) {
  throw new Error("Failed to get interpolated state for player-2 when ghosts are toggled OFF!");
}

console.log(`✓ Player 2 remote interpolated state computed successfully: x=${p2State.x.toFixed(3)}, y=${p2State.y.toFixed(3)}`);
if (p2State.x < 12.0) {
  throw new Error(`Expected Player 2 to lead server position (>= 12.0), got ${p2State.x}`);
}
console.log("✓ Player 2 forward prediction leads server position as expected!");

console.log("✅ All ghost toggle decoupling tests passed successfully!");
