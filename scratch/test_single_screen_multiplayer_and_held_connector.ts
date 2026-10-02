import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Renderer } from "../src/engine/Renderer.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("=== Testing Single-Screen Multiplayer GUI & Held Object Altitude Sync ===");

const arena = new Arena();

const drawnLines: { from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
let drawnAimReticles: { x: number; y: number; color: string }[] = [];
let drawnTrajectories: { char: Character | null | undefined }[] = [];

let currentLineStart: { x: number; y: number } | null = null;

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
  moveTo: (x: number, y: number) => {
    currentLineStart = { x, y };
  },
  lineTo: (x: number, y: number) => {
    if (currentLineStart) {
      drawnLines.push({ from: currentLineStart, to: { x, y } });
    }
  },
  stroke: () => {},
  fill: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  clearRect: () => {},
  clip: () => {},
  translate: () => {},
  rotate: () => {},
  fillText: () => {},
  measureText: () => ({ width: 50 }),
  setLineDash: () => {},
  canvas: { width: 1000, height: 600 },
};

const renderer = new Renderer(mockCtx as any);
// Enable hover visuals so vertical connector lines are active
renderer.viewSettings.verticalVisuals = "both";
renderer.viewSettings.visualAltitudeScale = 0.5;

(renderer as any).trajectoryRenderer.drawTrajectory = (
  traj: any,
  ppu: number,
  arena: Arena,
  viewSettings: any,
  cursorTarget: any,
  character?: Character | null
) => {
  drawnTrajectories.push({ char: character });
};

(renderer as any).trajectoryRenderer.drawAimReticle = (x: number, y: number, color: string) => {
  drawnAimReticles.push({ x, y, color });
};

// -------------------------------------------------------------
// Test 1: Single-Screen Mode (Non-Split Screen) Multi-Player GUI Visibility
// -------------------------------------------------------------
console.log("\n--- Test 1: Single-Screen Mode with 2 Local Players ---");
const char1 = new Character({ name: "Player 1", x: 4, y: 5 });
char1.playerId = "keyboard";
char1.playerNumber = 1;
char1.playerColor = "#f59e0b";

const char2 = new Character({ name: "Player 2", x: 10, y: 5 });
char2.playerId = "gamepad-0";
char2.playerNumber = 2;
char2.playerColor = "#06b6d4";

const rockOnGround = new GameObject({ name: "Ground Rock", position: { x: 10.5, y: 5, z: 0 } });
assert(char2.pickupModule.isObjectInReach(char2, rockOnGround, arena.wallHeight), "rockOnGround must be in reach of char2");

const activeCursors = [
  { character: char1, x: 6, y: 5, color: "#f59e0b", isKeyboard: true },
  { character: char2, x: 12, y: 5, color: "#06b6d4", isKeyboard: false },
];

const targetGrabEntities = new Map<Character, GameObject | null>();
targetGrabEntities.set(char2, rockOnGround);

drawnTrajectories = [];
drawnAimReticles = [];

// Call render() in single screen mode (no split screen)
renderer.render(
  arena,
  [char1, char2],
  [rockOnGround],
  null,
  false,
  null,
  targetGrabEntities,
  false,
  null,
  null,
  activeCursors,
  undefined,
  false,
  char1, // local hero is char1
  new Map() // No remote overrides: both players are local!
);

console.log(`Drawn aim reticles count on single screen: ${drawnAimReticles.length}`);
assert(drawnAimReticles.length === 2, `Expected BOTH Player 1 and Player 2 aim reticles to be drawn, got ${drawnAimReticles.length}`);
assert(drawnAimReticles.some((r) => r.color === "#f59e0b"), "Player 1 reticle must be rendered");
assert(drawnAimReticles.some((r) => r.color === "#06b6d4"), "Player 2 reticle must be rendered on shared single screen!");
console.log("✅ Verified: Both Player 1 and Player 2 have visible aim cursors and GUI on single-screen mode!");

// -------------------------------------------------------------
// Test 2: Held Object Dotted Connector Line & Shadow Sync
// -------------------------------------------------------------
console.log("\n--- Test 2: Held Object Altitude Connector Line Sync ---");
// Player 2 picks up the rock
char2.heldObject = rockOnGround;
rockOnGround.isHeld = true;
rockOnGround.heldBy = char2;

// The rock's raw physics position is at (10.5, 5, 0), but Player 2 moves to (14, 8) and holds it high (z = 1.0)
char2.position.x = 14;
char2.position.y = 8;
char2.facingAngle = 0; // facing right, held hands position will be around (14.5, 8, ~1.0)

const heldHandsPos = char2.calculateHeldObjectPosition(arena);
console.log(`Holder hands calculated position: x=${heldHandsPos.x.toFixed(2)}, y=${heldHandsPos.y.toFixed(2)}, z=${heldHandsPos.z.toFixed(2)}`);
console.log(`Raw un-synced object.position: x=${rockOnGround.position.x.toFixed(2)}, y=${rockOnGround.position.y.toFixed(2)}, z=${rockOnGround.position.z.toFixed(2)}`);

drawnLines.length = 0;
// Render vertical connector line
const ppu = 50;
(renderer as any).drawVerticalConnectorLine(rockOnGround, arena, ppu, [char1, char2]);

console.log(`Connector lines drawn: ${drawnLines.length}`);
assert(drawnLines.length > 0, "Vertical connector line must be drawn for held elevated object");

const line = drawnLines[0];
const expectedGroundX = heldHandsPos.x * ppu;
console.log(`Drawn line X=${line.from.x}, Expected X=${expectedGroundX} (vs old raw obj.pos.x=${rockOnGround.position.x * ppu})`);
assert(Math.abs(line.from.x - expectedGroundX) < 1.0, `Dotted line X (${line.from.x}) must match holder's hands (${expectedGroundX}), NOT raw obj position!`);
assert(Math.abs(line.to.x - expectedGroundX) < 1.0, `Dotted line to.X (${line.to.x}) must match holder's hands (${expectedGroundX})!`);

console.log("✅ Verified: Dotted altitude connector line connects directly to held object at holder's hands!");

console.log("\n🎉 ALL TESTS PASSED 100%!");
