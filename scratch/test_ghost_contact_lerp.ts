import { RelayClient, GhostSnapshot } from "../src/network/RelayClient.js";

console.log("=== Testing Ghost Lerp Rate per Frame & Ground Contact Snapping ===");

const client = new RelayClient("wss://echo.websocket.org");
client.lerpGhosts = true;
client.ghostLerpRatePercent = 35.0; // 35% per frame

// Simulate receiving a packet where character jumped and reached peak z = 1.2
const peakSnapshot: GhostSnapshot = {
  seq: 1,
  sentAt: 100,
  receivedAt: 120,
  rttMs: 20,
  character: {
    id: "player",
    x: 5.0,
    y: 7.0,
    z: 1.2,
    vx: 0,
    vy: 0,
    vz: 0,
    surfaceZ: 0,
    isGrounded: false,
    radius: 0.44,
  },
  objects: [],
};

// Simulate message arrival by accessing internal snapshot
(client as any).latestGhostSnapshot = peakSnapshot;

// 1. Initial frame initializes current snapshot
client.updateGhostLerp(1 / 60);
let ghost = client.getLatestGhost();
if (!ghost || !ghost.character) {
  throw new Error("Failed to get initial ghost snapshot");
}
console.log(`Initial Ghost Z: ${ghost.character.z.toFixed(3)} (Target: 1.2)`);
if (Math.abs(ghost.character.z - 1.2) > 0.001) {
  throw new Error(`Expected initial ghost Z to match target 1.2, got ${ghost.character.z}`);
}

// 2. Now simulate receiving a landing packet (character landed on ground, z = 0, isGrounded = true)
const landingSnapshot: GhostSnapshot = {
  seq: 2,
  sentAt: 150,
  receivedAt: 170,
  rttMs: 20,
  character: {
    id: "player",
    x: 5.0,
    y: 7.0,
    z: 0.0,
    vx: 0,
    vy: 0,
    vz: 0,
    surfaceZ: 0,
    isGrounded: true,
    radius: 0.44,
  },
  objects: [],
};

(client as any).latestGhostSnapshot = landingSnapshot;

// Step frames forward
console.log("\nSimulating frames moving towards ground landing:");
let frames = 0;
while (ghost.character.z > 0 && frames < 20) {
  client.updateGhostLerp(1 / 60);
  ghost = client.getLatestGhost()!;
  frames++;
  console.log(`  Frame ${frames}: Ghost Z = ${ghost.character.z.toFixed(4)}`);
}

if (ghost.character.z !== 0) {
  throw new Error(`Expected ghost to snap to solid ground Z = 0, got ${ghost.character.z}`);
}

console.log(`✅ Passed: Ghost cleanly touched and snapped to solid ground contact (Z = 0.000) within ${frames} frames!`);

// 3. Test immediate 100% per-frame snap
client.ghostLerpRatePercent = 100.0;
const movedSnapshot: GhostSnapshot = {
  seq: 3,
  sentAt: 200,
  receivedAt: 220,
  rttMs: 20,
  character: {
    id: "player",
    x: 12.5,
    y: 9.0,
    z: 0.5,
    vx: 0,
    vy: 0,
    radius: 0.44,
  },
  objects: [],
};
(client as any).latestGhostSnapshot = movedSnapshot;
client.updateGhostLerp(1 / 60);
ghost = client.getLatestGhost()!;
if (Math.abs(ghost.character.x - 12.5) > 0.001 || Math.abs(ghost.character.z - 0.5) > 0.001) {
  throw new Error(`Expected 100% lerp to snap immediately, got x=${ghost.character.x}, z=${ghost.character.z}`);
}
console.log("✅ Passed: 100% per-frame lerp snaps immediately with 0 delay!");

console.log("\n🎉 ALL GHOST CONTACT & LERP TESTS PASSED 100%!");
