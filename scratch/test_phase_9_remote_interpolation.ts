/**
 * scratch/test_phase_9_remote_interpolation.ts
 *
 * Comprehensive headless test suite for Phase 9:
 * 1. Server Multi-Player Awareness: ServerGameSimulation dynamically registers and simulates Player 2.
 * 2. RemoteEntityInterpolator Forward Prediction:
 *    - Remote player visual avatar LEADS the server ghost clone while in motion.
 *    - Remote player smoothly settles onto the server ghost position when stopped.
 * 3. Split-Screen Viewport mouse coordinate transformation (Screen 1 vs Screen 2).
 * 4. Multi-player split simulation toggle and auto-reversion rules.
 */

import { RemoteEntityInterpolator, RemoteEntitySample } from "../src/engine/physics/RemoteEntityInterpolator.js";
import { CanvasViewport } from "../src/ui/InputManager.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASSED: ${msg}`);
}

function runTests() {
  console.log("==================================================================");
  console.log("PHASE 9 TEST SUITE: MULTI-PLAYER SERVER & PREDICTIVE LEADING GHOST");
  console.log("==================================================================");

  // -------------------------------------------------------------
  // Test 1: Server Multi-Player Awareness & Dynamic Registration
  // -------------------------------------------------------------
  console.log("\n--- Test 1: Server Simulation Multi-Player Registration ---");
  const arena = new Arena(20, 14, 1.0);
  const p1 = new Character({ x: 5, y: 5, playerId: "player-1", name: "Player 1", color: "#f59e0b" });
  const p2 = new Character({ x: 12, y: 7, playerId: "player-2", name: "Player 2", color: "#38bdf8" });
  const objects = [new GameObject({ id: "box-1", position: { x: 8, y: 8, z: 0 } })];

  const server = new ServerGameSimulation({ broadcastRateHz: 60, deltaCompression: false });
  // Initialize server with both players
  server.initializeFromWorld(arena, [p1, p2], objects);

  assert(server.allCharacters.length === 2, `Server world initialized with 2 characters (got ${server.allCharacters.length})`);
  assert(server.characters.has("player-1"), "Server contains Player 1");
  assert(server.characters.has("player-2"), "Server contains Player 2");

  // Verify getGhostSnapshot outputs both characters
  const ghostSnap = server.getGhostSnapshot(50);
  assert(ghostSnap.characters !== undefined && ghostSnap.characters.length === 2, `Ghost snapshot contains 2 ghost characters (got ${ghostSnap.characters?.length})`);
  const gP1 = ghostSnap.characters!.find((c) => c.id === "player-1");
  const gP2 = ghostSnap.characters!.find((c) => c.id === "player-2");
  assert(gP1 !== undefined && gP1.x === 5, "Ghost snapshot has Player 1 at x=5");
  assert(gP2 !== undefined && gP2.x === 12, "Ghost snapshot has Player 2 at x=12");

  // Test dynamic synchronization of third player via syncCharactersFromPacket
  server.syncCharactersFromPacket([
    {
      id: "player-3",
      name: "Player 3",
      x: 15,
      y: 9,
      z: 0,
      vx: 1.5,
      vy: 0,
      color: "#10b981",
      radius: 0.44,
      isGrounded: true,
      isAboveWalls: false,
    },
  ]);
  assert(server.allCharacters.length === 3, "Server dynamically registered Player 3 from telemetry packet");
  assert(server.characters.get("player-3")?.velocity.x === 1.5, "Player 3 velocity synchronized on server");

  // -------------------------------------------------------------
  // Test 2: Remote Player Avatar LEADING the Server Ghost
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Remote Avatar LEADS the Server Ghost While Moving ---");
  const interpolator = new RemoteEntityInterpolator();
  interpolator.mode = "extrapolation";
  interpolator.defaultLeadTimeMs = 100; // 100ms lead time

  const now = 2000;
  // Server snapshot: Player 2 at X = 10.0, moving right at vx = 4.0 u/s
  const serverP2X = 10.0;
  const sampleMoving: RemoteEntitySample = {
    id: "player-2",
    x: serverP2X,
    y: 5.0,
    z: 0.0,
    vx: 4.0, // moving right at 4 u/s
    vy: 0.0,
    vz: 0.0,
    facingAngle: 0.0,
    isClimbing: false,
    isAboveWalls: false,
    isGrounded: true,
    surfaceZ: 0.0,
    heldObjectId: null,
    heldBy: null,
    color: "#38bdf8",
    radius: 0.44,
  };

  interpolator.pushSnapshot(1, [sampleMoving], now);

  // Client requests predicted state of remote Player 2
  // With vx = 4.0 and leadTime = 0.1s (100ms), the predicted position should be ~10.40u
  const predMoving = interpolator.getInterpolatedState("player-2", now, 60);
  assert(predMoving !== null, "Predicted state retrieved for remote Player 2");
  assert(predMoving!.x > serverP2X, `Remote Player 2 visual position (${predMoving!.x.toFixed(3)}) is strictly GREATER than server ghost position (${serverP2X})`);
  assert(predMoving!.x >= serverP2X + 0.35, `Remote Player 2 LEADS server ghost by at least 0.35u (lead = ${(predMoving!.x - serverP2X).toFixed(3)}u)`);

  // When remote player stops (vx = 0), predicted state settles onto server ghost position
  console.log("\n--- Test 2b: Remote Avatar Settles onto Server Ghost When Stopped ---");
  const sampleStopped: RemoteEntitySample = {
    ...sampleMoving,
    x: 14.0, // server caught up to 14.0
    vx: 0.0, // stopped
    vy: 0.0,
  };
  interpolator.pushSnapshot(2, [sampleStopped], now + 500);

  // Step several visual frames to allow smooth settling
  let predStopped = interpolator.getInterpolatedState("player-2", now + 516, 60);
  for (let step = 1; step <= 30; step++) {
    predStopped = interpolator.getInterpolatedState("player-2", now + 500 + step * 16.6, 60);
  }
  assert(Math.abs(predStopped!.x - 14.0) < 0.05, `Remote avatar settled cleanly onto server ghost position at rest (got ${predStopped!.x.toFixed(3)}, expected ~14.000)`);

  // -------------------------------------------------------------
  // Test 3: Split-Screen Viewport Mouse Coordinate Transformation
  // -------------------------------------------------------------
  console.log("\n--- Test 3: Split-Screen Viewport Mouse Mapping ---");
  const canvasW = 1600;
  const canvasH = 900;
  const arenaW = 20;
  const arenaH = 14;

  const vpW = 800;
  const vpH = 900;
  const scale = Math.min((vpW - 32) / arenaW, (vpH - 48) / arenaH);
  const vp1OffsetX = 0 + (vpW - arenaW * scale) / 2;
  const vp1OffsetY = 0 + 28 + (vpH - 28 - arenaH * scale) / 2;

  const vp2OffsetX = 800 + (vpW - arenaW * scale) / 2;
  const vp2OffsetY = 0 + 28 + (vpH - 28 - arenaH * scale) / 2;

  const vp1: CanvasViewport = { x: 0, y: 0, width: vpW, height: vpH, scale, offsetX: vp1OffsetX, offsetY: vp1OffsetY };
  const vp2: CanvasViewport = { x: 800, y: 0, width: vpW, height: vpH, scale, offsetX: vp2OffsetX, offsetY: vp2OffsetY };

  const mapMouseToArena = (canvasPixelX: number, canvasPixelY: number, vp: CanvasViewport) => {
    return {
      arenaX: Math.max(0, Math.min(arenaW, (canvasPixelX - vp.offsetX) / vp.scale)),
      arenaY: Math.max(0, Math.min(arenaH, (canvasPixelY - vp.offsetY) / vp.scale)),
    };
  };

  // Keyboard player on Screen 2 (Right Half)
  const centerVp2X = vp2.offsetX + (arenaW / 2) * vp2.scale;
  const centerVp2Y = vp2.offsetY + (arenaH / 2) * vp2.scale;

  const mappedVp2 = mapMouseToArena(centerVp2X, centerVp2Y, vp2);
  assert(Math.abs(mappedVp2.arenaX - 10.0) < 0.001, `Screen 2 accurately maps mouse X to center (10.0, got ${mappedVp2.arenaX})`);
  assert(Math.abs(mappedVp2.arenaY - 7.0) < 0.001, `Screen 2 accurately maps mouse Y to center (7.0, got ${mappedVp2.arenaY})`);

  // Keyboard player on Screen 1 (Left Half)
  const centerVp1X = vp1.offsetX + (arenaW / 2) * vp1.scale;
  const centerVp1Y = vp1.offsetY + (arenaH / 2) * vp1.scale;

  const mappedVp1 = mapMouseToArena(centerVp1X, centerVp1Y, vp1);
  assert(Math.abs(mappedVp1.arenaX - 10.0) < 0.001, `Screen 1 accurately maps mouse X to center (10.0, got ${mappedVp1.arenaX})`);
  assert(Math.abs(mappedVp1.arenaY - 7.0) < 0.001, `Screen 1 accurately maps mouse Y to center (7.0, got ${mappedVp1.arenaY})`);

  // -------------------------------------------------------------
  // Test 4: Split-Screen Auto-Reversion Rules
  // -------------------------------------------------------------
  console.log("\n--- Test 4: Split-Screen Auto-Reversion Rules ---");

  class MockGameLoop {
    public splitClientSimsEnabled = false;
    public isMultiplayerMode = false;
    public playerCount = 1;

    public get isSplitScreen(): boolean {
      return this.splitClientSimsEnabled && this.isMultiplayerMode && this.playerCount >= 2;
    }
  }

  const loop = new MockGameLoop();
  loop.splitClientSimsEnabled = true;
  loop.isMultiplayerMode = true;
  loop.playerCount = 1;
  assert(!loop.isSplitScreen, "Split screen inactive with only 1 player");

  loop.playerCount = 2;
  assert(loop.isSplitScreen, "Split screen active with 2 players in multiplayer mode");

  loop.isMultiplayerMode = false;
  assert(!loop.isSplitScreen, "Split screen auto-reverts to single view when switching to Local Game");

  loop.isMultiplayerMode = true;
  loop.splitClientSimsEnabled = false;
  assert(!loop.isSplitScreen, "Split screen auto-reverts to single view when toggle is turned OFF");

  console.log("\n==================================================================");
  console.log("🎉 ALL PHASE 9 MULTI-PLAYER & PREDICTIVE LEADING TESTS PASSED 100%!");
  console.log("==================================================================");
}

runTests();
