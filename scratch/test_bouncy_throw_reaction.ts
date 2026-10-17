import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { GhostEntityState } from "../src/network/RelayClient.js";

function testBouncyBallReboundSync() {
  console.log("=== Testing Bouncy Ball Rebound & Trailing Server Sync ===");

  const arena = new Arena({ width: 20, height: 20 });
  const localPlayer = new Character({
    id: "p1",
    playerId: "p1",
    x: 4.0,
    y: 7.0,
    colliderRadius: 0.44,
    mass: 1.2,
  });

  const remotePlayer = new Character({
    id: "p2",
    playerId: "p2",
    x: 8.0,
    y: 7.0,
    colliderRadius: 0.44,
    mass: 1.2,
  });

  const bouncyBall = new GameObject({
    id: "bouncy-1",
    name: "Super Bouncy Ball",
    position: { x: 7.3, y: 7.0, z: 0.3 },
    velocity: { x: 10.0, y: 0 },
    mass: 0.5,
    colliderRadius: 0.24,
    bounceMod: 0.85,
    verticalVelocity: 0,
  });
  bouncyBall.isInFlight = true;
  bouncyBall.lastThrower = localPlayer;
  bouncyBall.originalThrower = localPlayer;

  const mockCanvas = {} as any;
  const mockRenderer = { getHoverScale: () => 1.0, showBufferTrail: false } as any;
  const mockInput = { isKeyboardActive: false, gamepadSlots: new Map() } as any;
  const mockDevPanel = { isEditMode: false, updateInspector: () => {} } as any;

  // Set up GameLoop
  const mockGameLoop = new GameLoop({
    canvas: mockCanvas,
    arena,
    character: localPlayer,
    objects: [bouncyBall],
    renderer: mockRenderer,
    inputManager: mockInput,
    devPanel: mockDevPanel,
  });
  mockGameLoop.playerManager.remotePlayers.set("p2", remotePlayer);
  mockGameLoop.players.set("p1", { id: "p1", playerNumber: 1, color: "#f59e0b", character: localPlayer } as any);

  // 1. Step local physics: bouncy ball moves from x=7.3 to impact remote player at x=8.0
  const dt = 1 / 60;
  bouncyBall.position.x += bouncyBall.velocity.x * dt; // x = 7.466
  const hit = CollisionResolver.resolvePairDiscreteTOI(bouncyBall, remotePlayer, arena, dt);
  console.log(`Initial hit detected: ${hit}`);
  if (!hit) {
    throw new Error("Expected initial hit between bouncy ball and remotePlayer");
  }

  const postHitVx = bouncyBall.velocity.x;
  console.log(`Post-impact local ball vx: ${postHitVx.toFixed(2)} (expect negative rebound)`);
  if (postHitVx >= 0) {
    throw new Error(`Expected negative rebound velocity, got ${postHitVx}`);
  }

  // 2. Trailing server snapshots arrive where the server ball has NOT hit remote player yet
  // Server ball is still at x=7.2 moving forward at vx=+10.0 m/s
  for (let f = 1; f <= 3; f++) {
    const trailingServerObj: GhostEntityState = {
      id: "bouncy-1",
      x: 7.2 + f * 0.15,
      y: 7.0,
      z: 0.3,
      vx: 10.0,
      vy: 0,
      radius: 0.24,
    };

    mockGameLoop.syncAuthoritativeObjects([trailingServerObj], "p1", f);

    console.log(`Frame ${f} sync: local ball vx=${bouncyBall.velocity.x.toFixed(2)}, x=${bouncyBall.position.x.toFixed(3)}`);

    // The local ball must NOT have its velocity flipped back to positive!
    if (bouncyBall.velocity.x >= 0) {
      throw new Error(`Glitch detected on frame ${f}! Local velocity flipped to forward (${bouncyBall.velocity.x}) due to trailing server snapshot!`);
    }
  }

  // 3. Server snapshot arrives where server ball HAS rebounded:
  const serverReboundObj: GhostEntityState = {
    id: "bouncy-1",
    x: bouncyBall.position.x + 0.1,
    y: 7.0,
    z: 0.3,
    vx: postHitVx,
    vy: 0,
    radius: 0.24,
  };

  mockGameLoop.syncAuthoritativeObjects([serverReboundObj], "p1", 4);
  console.log(`Post-server-rebound sync: local ball vx=${bouncyBall.velocity.x.toFixed(2)}, x=${bouncyBall.position.x.toFixed(3)}`);
  if (bouncyBall.velocity.x >= 0) {
    throw new Error("Expected negative velocity after server rebound sync");
  }

  console.log("✅ Bouncy ball rebound & trailing server snapshot sync PASSED perfectly without glitching!");
}

function testServerOwnedObjectThrowBetweenPlayers() {
  console.log("\n=== Testing Server-Owned Object Throw Between Players ===");

  const arena = new Arena({ width: 20, height: 20 });
  const localPlayer = new Character({
    id: "p1",
    playerId: "p1",
    x: 4.0,
    y: 7.0,
    colliderRadius: 0.44,
    mass: 1.2,
  });

  const remotePlayer = new Character({
    id: "p2",
    playerId: "p2",
    x: 10.0,
    y: 7.0,
    colliderRadius: 0.44,
    mass: 1.2,
  });

  const stone = new GameObject({
    id: "stone-1",
    name: "Stone",
    position: { x: 4.8, y: 7.0, z: 0 },
    velocity: { x: 0, y: 0 },
    mass: 0.7,
    colliderRadius: 0.30,
    bounceMod: 0.05,
  });

  const mockGameLoop = new GameLoop({
    canvas: {} as any,
    arena,
    character: localPlayer,
    objects: [stone],
    renderer: { getHoverScale: () => 1.0, showBufferTrail: false } as any,
    inputManager: { isKeyboardActive: false, gamepadSlots: new Map() } as any,
    devPanel: { isEditMode: false, updateInspector: () => {} } as any,
  });
  mockGameLoop.playerManager.remotePlayers.set("p2", remotePlayer);
  mockGameLoop.players.set("p1", { id: "p1", playerNumber: 1, color: "#f59e0b", character: localPlayer } as any);

  // Player 1 throws stone towards Player 2 at vx=8.0
  stone.isInFlight = true;
  stone.lastThrower = localPlayer;
  stone.originalThrower = localPlayer;
  stone.velocity.x = 8.0;
  stone.position.z = 0.4;

  console.log("Local stone thrown: vx=8.0, x=4.8");

  // In flight, server sends snapshots tracking the stone
  for (let tick = 1; tick <= 5; tick++) {
    const serverStone: GhostEntityState = {
      id: "stone-1",
      x: 4.8 + tick * 0.13,
      y: 7.0,
      z: 0.4,
      vx: 8.0,
      vy: 0,
      radius: 0.30,
    };

    mockGameLoop.syncAuthoritativeObjects([serverStone], "p1", tick);
    console.log(`In-flight Tick ${tick}: local vx=${stone.velocity.x.toFixed(2)}, x=${stone.position.x.toFixed(3)}`);
    if (stone.velocity.x < 7.0) {
      throw new Error(`In-flight velocity unexpectedly dropped to ${stone.velocity.x}`);
    }
  }

  // Stone reaches Player 2 and impacts Player 2
  stone.position.x = 9.4;
  const dt = 1 / 60;
  const hit = CollisionResolver.resolvePairDiscreteTOI(stone, remotePlayer, arena, dt);
  console.log(`Impact with remote player: hit=${hit}, stone vx=${stone.velocity.x.toFixed(2)}, remotePlayer vx=${remotePlayer.velocity.x.toFixed(2)}`);

  // Server snapshot arrives with server impact
  const serverImpactStone: GhostEntityState = {
    id: "stone-1",
    x: stone.position.x,
    y: 7.0,
    z: 0.1,
    vx: 0.2,
    vy: 0,
    radius: 0.30,
    isGrounded: true,
  };
  mockGameLoop.syncAuthoritativeObjects([serverImpactStone], "p1", 6);
  console.log(`Post-impact sync: stone vx=${stone.velocity.x.toFixed(2)}, x=${stone.position.x.toFixed(3)}`);

  console.log("✅ Server-owned object throw between players PASSED cleanly without async glitches!");
}

testBouncyBallReboundSync();
testServerOwnedObjectThrowBetweenPlayers();
