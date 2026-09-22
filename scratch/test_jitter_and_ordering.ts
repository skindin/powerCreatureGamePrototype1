import { GameServer } from "../server/GameServer.js";
import { MultiplayerClient } from "../src/network/MultiplayerClient.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { Arena } from "../src/engine/Arena.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("=== 1. Testing Server-side Input Ordering & Late Input Discard ===");
  const server = new GameServer();

  // Create mock client and player
  const mockWs = { send: () => {} };
  const clientObj = { clientId: "c_test", ws: mockWs, localPlayers: new Set() };
  server.clients.set(mockWs, clientObj);
  server.handleClientMessage(clientObj, {
    type: "register_player",
    localId: "keyboard",
    name: "Tester",
  });

  const player = server.players.get("c_test_keyboard");
  assert(Boolean(player), "Player registered successfully on server");

  // Step 1: Send tick 10
  const now = Date.now();
  server.handleClientMessage(clientObj, {
    type: "player_input",
    tick: 10,
    timestamp: now,
    inputs: [{ localId: "keyboard", moveVector: { x: 1, y: 0 } }],
  });

  // Step 2: Send tick 12 (out of order, arrives before 11)
  server.handleClientMessage(clientObj, {
    type: "player_input",
    tick: 12,
    timestamp: now + 33,
    inputs: [{ localId: "keyboard", moveVector: { x: 1, y: 0 } }],
  });

  // Step 3: Send tick 11 (arrives after 12)
  server.handleClientMessage(clientObj, {
    type: "player_input",
    tick: 11,
    timestamp: now + 16,
    inputs: [{ localId: "keyboard", moveVector: { x: 1, y: 0 } }],
  });

  // Verify inputQueue is strictly sorted in ascending order: [10, 11, 12]
  const queuedTicks = player!.inputQueue.map((i: any) => i.tick);
  assert(
    queuedTicks.length === 3 && queuedTicks[0] === 10 && queuedTicks[1] === 11 && queuedTicks[2] === 12,
    `Out-of-order inputs kept in strict order: [${queuedTicks.join(", ")}]`
  );

  // Step 4: Discard late input (> 350ms old)
  const initialQueueLen = player!.inputQueue.length;
  server.handleClientMessage(clientObj, {
    type: "player_input",
    tick: 13,
    timestamp: now - 500, // 500ms in the past (too late)
    inputs: [{ localId: "keyboard", moveVector: { x: 1, y: 0 } }],
  });
  assert(player!.inputQueue.length === initialQueueLen, "Input received too late (> 350ms) was discarded");

  // Step 5: Execute inputs and test stale tick discard
  server.stepPhysics(1 / 60); // Executes tick 10
  assert(player!.lastExecutedTick === 10, "Server executed tick 10");

  // Try to send tick 10 again (or tick 9)
  server.handleClientMessage(clientObj, {
    type: "player_input",
    tick: 10,
    timestamp: now,
    inputs: [{ localId: "keyboard", moveVector: { x: 1, y: 0 } }],
  });
  assert(player!.inputQueue.length === 2, "Stale tick (tick <= lastExecutedTick) was discarded");

  console.log("\n=== 2. Testing Client-side Snapshot Ordering & Late Snapshot Discard ===");
  // Mock client environment
  (global as any).window = {
    location: { protocol: "http:", host: "localhost:5173" },
    addEventListener: () => {},
  };

  const arena = new Arena({ cols: 20, rows: 14, tileSize: 1.0, wallHeight: 1.0 });
  const mockObjects: any[] = [];
  const mockGameLoop = {
    arena,
    get allObjects() { return mockObjects; },
    get allCharacters() { return []; },
    objects: mockObjects,
    players: new Map(),
    addRemoteCharacter: () => {},
    removeRemoteCharacter: () => {},
  } as unknown as GameLoop;

  const client = new MultiplayerClient(mockGameLoop);
  client.clientId = "client_local";

  const snapBaseTime = Date.now();
  // Send snapshot 10
  client.queueSnapshot(10, snapBaseTime, [], []);

  // Send snapshot 13 (out of order, arrives before 11 and 12)
  client.queueSnapshot(13, snapBaseTime + 100, [], []);

  // Send snapshot 11 (arrives out of order)
  client.queueSnapshot(11, snapBaseTime + 33, [], []);

  // Send snapshot 12 (arrives out of order)
  client.queueSnapshot(12, snapBaseTime + 66, [], []);

  const clientQueueTicks = client.snapshotQueue.map((s) => s.serverTick);
  assert(
    clientQueueTicks.length === 4 &&
    clientQueueTicks[0] === 10 &&
    clientQueueTicks[1] === 11 &&
    clientQueueTicks[2] === 12 &&
    clientQueueTicks[3] === 13,
    `Out-of-order snapshots kept in strict order: [${clientQueueTicks.join(", ")}]`
  );

  // Send snapshot received too late (> 400ms old)
  const prevClientLen = client.snapshotQueue.length;
  client.queueSnapshot(14, Date.now() - 500, [], []);
  assert(client.snapshotQueue.length === prevClientLen, "Snapshot received too late (> 400ms) was discarded");

  // Send duplicate tick
  client.queueSnapshot(12, snapBaseTime + 66, [], []);
  assert(client.snapshotQueue.length === prevClientLen, "Duplicate snapshot tick was discarded");

  console.log("\n=== 3. Testing Timestamp-Spaced Playback Interpolation (Smoothness Bias) ===");
  // Clear queue for deterministic interpolation test
  client.snapshotQueue = [];
  client.isPlaybackInitialized = false;

  const t0 = Date.now();
  const t1 = t0 + 40; // 40ms later
  const remoteP0: any = {
    id: "remote_1",
    clientId: "client_remote",
    localId: "keyboard",
    playerNumber: 2,
    name: "Remote Player",
    color: "#06b6d4",
    x: 4.0,
    y: 5.0,
    z: 0.0,
    vx: 2.0,
    vy: 0.0,
    vz: 0.0,
    facingAngle: 0.0,
    isSprinting: false,
    isActivelyWalking: true,
    isClimbing: false,
    heldObjectId: null,
    isAiming: false,
    aimTarget: null,
  };

  const remoteP1: any = {
    ...remoteP0,
    x: 4.8, // moved +0.8 units in 40ms
    y: 5.0,
    facingAngle: 0.2,
  };

  const obj0: any = {
    id: "stone-test",
    name: "Test Stone",
    x: 6.0,
    y: 6.0,
    z: 0.0,
    vx: 1.0,
    vy: 0.0,
    vz: 0.0,
    radius: 0.3,
    mass: 1.0,
    color: "#ffffff",
    shape: "circle",
    isHeld: false,
    heldBy: null,
  };

  const obj1: any = {
    ...obj0,
    x: 6.4, // moved +0.4 units in 40ms
    y: 6.0,
  };

  client.queueSnapshot(100, t0, [remoteP0], [obj0]);
  client.queueSnapshot(101, t1, [remoteP1], [obj1]);

  // Manually configure playbackTime exactly halfway between t0 and t1 (alpha = 0.5)
  client.isPlaybackInitialized = true;
  client.playbackTime = t0 + 20; // 20ms in = 50% between t0 and t1

  client.updatePlayback(0); // Evaluate at current playbackTime

  const remoteChar = client.remoteCharacters.get("remote_1");
  assert(Boolean(remoteChar), "Remote character created in client remoteCharacters map");
  assert(
    Math.abs(remoteChar!.position.x - 4.4) < 0.01,
    `Remote character interpolated smoothly to midpoint: x=${remoteChar!.position.x.toFixed(3)} (expected 4.400)`
  );

  const localObj = (mockGameLoop as any).allObjects.find((o: any) => o.id === "stone-test");
  assert(Boolean(localObj), "Dynamic object exists in gameLoop");
  assert(
    Math.abs(localObj.position.x - 6.2) < 0.01,
    `Dynamic object interpolated smoothly to midpoint: x=${localObj.position.x.toFixed(3)} (expected 6.200)`
  );

  // Advance playbackTime to 75%
  client.playbackTime = t0 + 30; // 30ms in = 75%
  client.updatePlayback(0);

  assert(
    Math.abs(remoteChar!.position.x - 4.6) < 0.01,
    `Remote character advanced smoothly to 75%: x=${remoteChar!.position.x.toFixed(3)} (expected 4.600)`
  );
  assert(
    Math.abs(localObj.position.x - 6.3) < 0.01,
    `Dynamic object advanced smoothly to 75%: x=${localObj.position.x.toFixed(3)} (expected 6.300)`
  );

  console.log("\n🎉 ALL NETWORK ORDERING, JITTER DISCARD & PLAYBACK TESTS PASSED!\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
