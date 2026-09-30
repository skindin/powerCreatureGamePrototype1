import { RemoteEntityInterpolator, RemoteEntitySample } from "../src/engine/physics/RemoteEntityInterpolator.js";

console.log("=== Testing Remote Entity Snapshot Interpolation (Zero Bobbing & Zero Overshoot) ===");

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

const interpolator = new RemoteEntityInterpolator();
interpolator.interpDelayMs = 60; // 60ms delay buffer (~3.6 frames)

// ----------------------------------------------------------------------------------------
// Test 1: Remote Entity Moving at Constant Speed (4 u/s)
// Snapshots spaced at 50ms intervals
// ----------------------------------------------------------------------------------------
console.log("\n--- Test 1: Remote Entity Moving Smoothly Under Snapshot Interpolation ---");

const t0 = 1000;
const snap1: RemoteEntitySample = {
  id: "player-2",
  x: 10.0,
  y: 5.0,
  z: 0.0,
  vx: 4.0,
  vy: 0.0,
  vz: 0.0,
  facingAngle: 0.0,
  isClimbing: false,
  isAboveWalls: false,
  isGrounded: true,
  surfaceZ: 0.0,
  heldObjectId: null,
  heldBy: null,
};

const snap2: RemoteEntitySample = {
  ...snap1,
  x: 10.2, // +0.2u in 50ms (4.0 u/s)
};

const snap3: RemoteEntitySample = {
  ...snap1,
  x: 10.4,
};

const snap4: RemoteEntitySample = {
  ...snap1,
  x: 10.6,
};

interpolator.pushSnapshot(1, [snap1], t0);
interpolator.pushSnapshot(2, [snap2], t0 + 50);
interpolator.pushSnapshot(3, [snap3], t0 + 100);
interpolator.pushSnapshot(4, [snap4], t0 + 150);

// With interpDelayMs = 60:
// At now = t0 + 160, renderTime = t0 + 100. Exactly on snap3 (x = 10.4).
const sampleAt160 = interpolator.getInterpolatedState("player-2", t0 + 160);
assert(Boolean(sampleAt160), "Sample at t0 + 160 must exist");
console.log(`Rendered position at t0+160: ${sampleAt160!.x.toFixed(4)} (Expected: 10.4000)`);
assert(Math.abs(sampleAt160!.x - 10.4) < 0.001, "Should render exactly 10.4000");

// At now = t0 + 185, renderTime = t0 + 125. Exactly halfway between snap3 (10.4) and snap4 (10.6): x = 10.5.
const sampleAt185 = interpolator.getInterpolatedState("player-2", t0 + 185);
assert(Boolean(sampleAt185), "Sample at t0 + 185 must exist");
console.log(`Rendered position at t0+185: ${sampleAt185!.x.toFixed(4)} (Expected: 10.5000)`);
assert(Math.abs(sampleAt185!.x - 10.5) < 0.001, "Should render exactly 10.5000 (halfway)");
assert(!sampleAt185!.isExtrapolated, "Snapshot interpolation is never marked as extrapolated");

// ----------------------------------------------------------------------------------------
// Test 2: Remote Entity Stopping — Zero Overshoot & Zero Bobbing
// The player stops at x = 10.8000 at t0 + 200.
// ----------------------------------------------------------------------------------------
console.log("\n--- Test 2: Remote Entity Stopping with ZERO Overshoot and ZERO Bobbing ---");

const snapStop: RemoteEntitySample = {
  ...snap1,
  x: 10.8, // stopped dead at 10.8
  vx: 0.0,
  vy: 0.0,
};

const snapStillStopped: RemoteEntitySample = {
  ...snapStop,
  x: 10.8,
};

interpolator.pushSnapshot(5, [snapStop], t0 + 200);
interpolator.pushSnapshot(6, [snapStillStopped], t0 + 250);
interpolator.pushSnapshot(7, [snapStillStopped], t0 + 300);

let lastX = 10.5;
let maxObservedX = -Infinity;

// Sample frame-by-frame every 8ms from now = t0 + 185 to t0 + 400
for (let t = t0 + 185; t <= t0 + 400; t += 8) {
  const state = interpolator.getInterpolatedState("player-2", t)!;
  if (state.x > maxObservedX) maxObservedX = state.x;

  // Verify monotonicity: x must never decrease (no bobbing backwards!)
  assert(
    state.x >= lastX - 0.00001,
    `BOB BACK DETECTED! Position decreased from ${lastX.toFixed(5)} to ${state.x.toFixed(5)} at time ${t}!`
  );

  // Verify overshoot: x must NEVER exceed the stop coordinate 10.8000
  assert(
    state.x <= 10.80001,
    `OVERSHOOT DETECTED! Position ${state.x.toFixed(5)} exceeded stop coordinate 10.8000!`
  );

  lastX = state.x;
}

console.log(`Max observed X during stop: ${maxObservedX.toFixed(5)} (Target stop: 10.80000)`);
assert(Math.abs(maxObservedX - 10.8) < 0.0001, "Final resting position must be exactly 10.8000");
console.log("✓ ZERO OVERSHOOT CONFIRMED: Position never exceeded 10.8000u!");
console.log("✓ ZERO BOBBING CONFIRMED: Position monotonically advanced to 10.8000u without ever reversing!");

// ----------------------------------------------------------------------------------------
// Test 3: Shortest Arc Facing Angle Lerp Across Pi Boundary
// ----------------------------------------------------------------------------------------
console.log("\n--- Test 3: Shortest Arc Angle Lerp Across Pi Boundary ---");

const interpAngle = new RemoteEntityInterpolator();
interpAngle.interpDelayMs = 50;

const snapAngle1: RemoteEntitySample = {
  ...snap1,
  facingAngle: 3.10, // ~177 deg
};
const snapAngle2: RemoteEntitySample = {
  ...snap1,
  facingAngle: -3.10, // ~ -177 deg (only 0.083 rad away, crossing pi)
};

interpAngle.pushSnapshot(1, [snapAngle1], 100);
interpAngle.pushSnapshot(2, [snapAngle2], 150);

// Sample halfway (renderTime = 125)
const midAngle = interpAngle.getInterpolatedState("player-2", 175)!;
console.log(`Interpolated angle between 3.10 and -3.10: ${midAngle.facingAngle.toFixed(4)}`);
// Shortest path goes through +/- PI (~3.14159 or -3.14159), NOT through 0!
assert(
  Math.abs(Math.abs(midAngle.facingAngle) - Math.PI) < 0.1,
  `Angle should interpolate across boundary through pi (~3.14), not spin through 0. Got: ${midAngle.facingAngle}`
);
console.log("✓ Shortest arc correctly preserved across boundary!");

// ----------------------------------------------------------------------------------------
// Test 4: Teleport / Respawn Large Distance Jump
// ----------------------------------------------------------------------------------------
console.log("\n--- Test 4: Teleport / Respawn Large Distance Jump Guard ---");

const interpTeleport = new RemoteEntityInterpolator();
interpTeleport.interpDelayMs = 50;
interpTeleport.maxTeleportThreshold = 8.0;

const snapBeforeTeleport: RemoteEntitySample = {
  ...snap1,
  x: 2.0,
  y: 2.0,
};

const snapAfterTeleport: RemoteEntitySample = {
  ...snap1,
  x: 18.0, // jumped 16 units across arena
  y: 12.0,
};

interpTeleport.pushSnapshot(1, [snapBeforeTeleport], 100);
interpTeleport.pushSnapshot(2, [snapAfterTeleport], 150);

// When sampling halfway, it should snap directly to after-teleport rather than sliding through middle of arena
const teleportSample = interpTeleport.getInterpolatedState("player-2", 175)!;
console.log(`Position during teleport jump: x=${teleportSample.x}, y=${teleportSample.y}`);
assert(teleportSample.x === 18.0 && teleportSample.y === 12.0, "Must snap immediately on teleport jump");
console.log("✓ Teleport guard prevents sliding across arena on respawn/teleport!");

console.log("\n==================================================================");
console.log("🎉 ALL SNAPSHOT INTERPOLATION TESTS PASSED WITH 100% PRECISION!");
console.log("==================================================================");
