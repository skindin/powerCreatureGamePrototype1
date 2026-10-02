import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { RemoteEntityInterpolator, RemoteEntitySample } from "../src/engine/physics/RemoteEntityInterpolator.js";
import { PlayerInputPacket } from "../src/engine/physics/StateHistoryBuffer.js";

console.log("=== Testing Remote Player Explicit Facing Angle Transmission & Interpolation ===");

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

const arena = new Arena();
const serverSim = new ServerGameSimulation();
const interpolator = new RemoteEntityInterpolator();

const p2Char = new Character({
  id: "player-2",
  name: "Player 2",
  position: { x: 10, y: 7, z: 0 },
  playerColor: "#06b6d4",
});
p2Char.playerId = "player-2";

const rock = new GameObject({
  id: "rock-1",
  name: "Rock",
  position: { x: 10.5, y: 7, z: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
});

serverSim.initializeFromWorld(arena, [p2Char], [rock]);

// 1. SCENARIO A: Player 2 holds an object, walks EAST (moveX=1, moveY=0), but aims NORTH (aimX=10, aimY=2)
// Facing angle towards aim (north, dy = -5, dx = 0) is -Math.PI / 2 (-1.5708 rad).
const targetAimAngle = -Math.PI / 2; // -1.5708 (North)
p2Char.facingAngle = targetAimAngle;

const inputPacket: PlayerInputPacket = {
  tick: 1,
  playerId: "player-2",
  moveX: 1.0, // Moving East
  moveY: 0.0,
  isSprinting: false,
  isJumpHeld: false,
  isGrabHeld: false,
  isDrop: false,
  isThrow: false,
  aimX: 10, // Aiming North
  aimY: 2,
  isAiming: true,
  isLockHeld: false,
  facingAngle: targetAimAngle, // Explicitly facing North!
};

// Queue input on server and step 60Hz physics
serverSim.queueInput(inputPacket);
serverSim.step(1 / 60);

// Verify server character preserved facingAngle
const serverP2 = serverSim.characters.get("player-2");
assert(Boolean(serverP2), "Server should have player-2 character");
console.log(`Server character facingAngle: ${serverP2!.facingAngle.toFixed(4)} (Expected: ${targetAimAngle.toFixed(4)})`);
assert(Math.abs(serverP2!.facingAngle - targetAimAngle) < 0.05, "Server character must preserve explicit facingAngle");

// Fetch snapshot from server
const ghostSnap = serverSim.getGhostSnapshot(60);
const p2Ghost = ghostSnap.characters?.find((c) => c.id === "player-2");
assert(Boolean(p2Ghost), "Ghost snapshot should contain player-2");
console.log(`Ghost snapshot facingAngle: ${p2Ghost!.facingAngle?.toFixed(4)}`);
assert(p2Ghost!.facingAngle !== undefined, "GhostEntityState must include facingAngle");
assert(Math.abs(p2Ghost!.facingAngle! - targetAimAngle) < 0.05, "Ghost snapshot facingAngle must match targetAimAngle");

// Feed snapshot to RemoteEntityInterpolator
const samples: RemoteEntitySample[] = [{
  id: p2Ghost!.id,
  x: p2Ghost!.x,
  y: p2Ghost!.y,
  z: p2Ghost!.z,
  vx: p2Ghost!.vx,
  vy: p2Ghost!.vy,
  vz: p2Ghost!.vz || 0,
  facingAngle: p2Ghost!.facingAngle!,
}];

const now = performance.now();
interpolator.pushSnapshot(ghostSnap.seq, samples, now);

// Step interpolator and sample state while moving
let interpState = interpolator.getInterpolatedState("player-2", now, 60);
assert(Boolean(interpState), "Interpolator must return state for player-2");
console.log(`Remote entity interpolated facingAngle while walking East: ${interpState!.facingAngle.toFixed(4)}`);
assert(
  Math.abs(interpState!.facingAngle - targetAimAngle) < 0.1,
  `Remote player must face aim target (${targetAimAngle.toFixed(4)}), NOT movement direction (0.0000)! Got: ${interpState!.facingAngle.toFixed(4)}`
);
console.log("✓ Remote player correctly faces aim target while moving in different direction!");

// 2. SCENARIO B: Player 2 STOPS walking (moveX=0, moveY=0, vx=0, vy=0) while facing an arbitrary angle (e.g. West, Math.PI)
const stoppedAngle = Math.PI; // 3.1415 (West)
serverP2!.velocity.x = 0;
serverP2!.velocity.y = 0;
serverP2!.facingAngle = stoppedAngle;

const stopSamples: RemoteEntitySample[] = [{
  id: "player-2",
  x: 10,
  y: 7,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  facingAngle: stoppedAngle,
}];

interpolator.pushSnapshot(2, stopSamples, now + 100);

// Advance time to allow smoothing filter to converge
for (let step = 1; step <= 20; step++) {
  interpState = interpolator.getInterpolatedState("player-2", now + 100 + step * 16, 60);
}

assert(Boolean(interpState), "Interpolator must return state when stopped");
console.log(`Remote entity interpolated facingAngle when stopped: ${interpState!.facingAngle.toFixed(4)} (Expected: ${stoppedAngle.toFixed(4)})`);

// Verify it did NOT reset to 0 (facing right)!
assert(
  Math.abs(interpState!.facingAngle - 0) > 0.5,
  "FAILED: Remote player snapped to 0.0000 (facing right) when stopped!"
);
assert(
  Math.abs(Math.abs(interpState!.facingAngle) - stoppedAngle) < 0.15,
  `Remote player must preserve facing angle when stopped! Got: ${interpState!.facingAngle.toFixed(4)}`
);
console.log("✓ Remote player does NOT snap to 0 (right) when stopped!");

console.log("✅ All remote player facing angle tests passed 100%!");
