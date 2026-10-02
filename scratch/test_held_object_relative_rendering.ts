import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Renderer } from "../src/engine/Renderer.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { InputManager } from "../src/ui/InputManager.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { GhostEntityState } from "../src/network/RelayClient.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("=== Testing Held Object Relative Rendering & Local Pickup Robustness ===");

const arena = new Arena();
const mockCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  closePath: () => {},
  rect: () => {},
  roundRect: () => {},
  arc: () => {},
  arcTo: () => {},
  ellipse: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  clip: () => {},
  translate: () => {},
  rotate: () => {},
  fillText: () => {},
  measureText: () => ({ width: 50 }),
  setLineDash: () => {},
  canvas: { width: 800, height: 600 },
};

const canvas = {
  width: 800,
  height: 600,
  getContext: () => mockCtx,
} as any;

const renderer = new Renderer(mockCtx as any);
const inputManager = new InputManager(canvas, arena);

// --- Test 1: Remote Player holding an object rendered with remoteOverrides ---
console.log("\n--- Scenario 1: Remote Player Moving at High Speed With Held Object ---");
const p2Char = new Character({ name: "Player 2", x: 10, y: 7 });
p2Char.playerId = "gamepad-0";
p2Char.facingAngle = Math.PI / 4; // 45 degrees

const rock = new GameObject({
  id: "rock-1",
  name: "Rock",
  x: 10.5,
  y: 7.5,
  mass: 2.0,
  colliderRadius: 0.3,
  hasCollider: true,
  hasPickup: true,
});

p2Char.pickupModule!.pickup(p2Char, rock, arena);
assert(p2Char.heldObject === rock, "p2Char should hold rock");
assert(rock.isHeld === true, "rock should be marked held");
assert(rock.heldBy === p2Char, "rock.heldBy should be p2Char");

// Simulate remoteOverrides moving Player 2 to a completely different interpolated position (e.g. x=15, y=12)
const remoteOverrides = new Map<string, { x: number; y: number; z: number; facingAngle?: number; isClimbing?: boolean }>();
remoteOverrides.set("gamepad-0", {
  x: 15.0,
  y: 12.0,
  z: 0.0,
  facingAngle: -Math.PI / 2, // Aiming North
});

// Render the scene as Player 1 (localHero = p1)
const p1Char = new Character({ name: "Player 1", x: 5, y: 5 });
p1Char.playerId = "keyboard";

let drawnRockX = 0;
let drawnRockY = 0;
mockCtx.arc = (x: number, y: number, r: number) => {
  if (Math.abs(r - 9.6) < 0.5 && x > 0) {
    drawnRockX = x;
    drawnRockY = y;
  }
};

renderer.renderArenaScene(
  arena,
  [p1Char, p2Char],
  [rock],
  32, // ppu
  null,
  false,
  null,
  null,
  false,
  null,
  null,
  false,
  null,
  false,
  p1Char, // localHero is Player 1
  remoteOverrides
);

// Hand position of Player 2 at the overridden position:
const expectedHandDist = p2Char.colliderRadius + rock.colliderRadius * 0.5 + 0.08;
const expectedX = 15.0 + Math.cos(-Math.PI / 2) * expectedHandDist;
const expectedY = 12.0 + Math.sin(-Math.PI / 2) * expectedHandDist;
const hoverOffset = 0.45 * 0.5; // z * hoverScale
const expectedPxX = expectedX * 32;
const expectedPxY = (expectedY - hoverOffset) * 32;

console.log(`Drawn Rock Pixel Pos: (${drawnRockX.toFixed(2)}, ${drawnRockY.toFixed(2)})`);
console.log(`Expected Hand Pixel Pos: (${expectedPxX.toFixed(2)}, ${expectedPxY.toFixed(2)})`);

const pixelOffset = Math.hypot(drawnRockX - expectedPxX, drawnRockY - expectedPxY);
assert(pixelOffset < 0.01, `Held object MUST render exactly at remote character's hands! Offset: ${pixelOffset}px`);
console.log("✓ Remote Player held object is rendered with exactly 0.0000u offset from hands!");

// Verify Player 2's physics position was cleanly restored after rendering
assert(p2Char.position.x === 10, "p2Char physics position X must be restored");
assert(p2Char.position.y === 7, "p2Char physics position Y must be restored");
console.log("✓ Remote Player physics position was cleanly restored in finally block!");

// --- Test 2: Local Player Pickup & Snapshot Resilience ---
console.log("\n--- Scenario 2: Local Player Pickup Never Glitches or Drops ---");
const loop = new GameLoop({
  arena,
  character: p1Char,
  objects: [rock],
  canvas,
  renderer,
  inputManager,
  devPanel: { isEditMode: false, updateInspector: () => {} } as any,
});

loop.playerManager.players.set("keyboard", {
  id: "keyboard",
  name: "Player 1",
  playerNumber: 1,
  color: "#f59e0b",
  isKeyboard: true,
  character: p1Char,
});

p2Char.pickupModule!.drop(p2Char); // Free rock
rock.position.x = 5.3;
rock.position.y = 5.0;

p1Char.pickupModule!.pickup(p1Char, rock, arena);
assert(p1Char.heldObject === rock, "p1Char holds rock");

// Simulate 60 ticks of incoming server snapshots with isHeld = false
for (let i = 0; i < 60; i++) {
  const laggingSnapshot: GhostEntityState[] = [{
    id: "rock-1",
    name: "Rock",
    x: 5.3,
    y: 5.0,
    radius: 0.3,
    isHeld: false,
    heldBy: null,
  }];

  (loop as any).syncAuthoritativeObjects(laggingSnapshot);
  assert(p1Char.heldObject === rock, `Tick ${i}: p1Char.heldObject must NEVER be dropped by server snapshots`);
  assert(rock.isHeld === true, `Tick ${i}: rock.isHeld must remain true`);
  assert(rock.heldBy === p1Char, `Tick ${i}: rock.heldBy must remain p1Char`);
}
console.log("✓ 60 ticks of lagging server snapshots: 0 drops, 0 glitching, rock stayed 100% held!");

// --- Test 3: Server Simulation relative position serialization ---
console.log("\n--- Scenario 3: Authoritative Server Simulation Serialization ---");
const server = new ServerGameSimulation();
server.initializeDefaultScenario();

const sChar = server.allCharacters[0];
const sRock = server.objects[0];

sChar.position.x = 8.0;
sChar.position.y = 8.0;
sChar.facingAngle = 0;
sChar.pickupModule!.pickup(sChar, sRock, server.arena);

// Run 5 ticks of movement on server
for (let i = 0; i < 5; i++) {
  sChar.velocity.x = 4.0;
  server.step(1 / 60);
}

const snap = server.getGhostSnapshot();
const snapRock = snap.objects?.find((o) => o.id === sRock.id);
assert(Boolean(snapRock), "Snapshot must contain rock");
assert(snapRock!.isHeld === true, "Snapshot rock must be marked isHeld = true");
assert(snapRock!.heldBy === (sChar.playerId || "player"), "Snapshot rock heldBy must match character");

const handPos = sChar.calculateHeldObjectPosition(server.arena);
const snapOffset = Math.hypot(snapRock!.x - handPos.x, snapRock!.y - handPos.y);
assert(snapOffset < 0.01, `Server snapshot rock position must be relative to character hands! Offset: ${snapOffset}`);
console.log("✓ Server snapshot serializes rock position relative to character hands!");

console.log("\n==================================================");
console.log("🎉 ALL TESTS PASSED WITH 100% PRECISION!");
console.log("==================================================");
