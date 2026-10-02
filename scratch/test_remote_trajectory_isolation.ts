import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Renderer, SplitScreenPlayerView } from "../src/engine/Renderer.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("=== Testing Remote Trajectory and Destination Marker Isolation ===");

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

// Create two characters holding objects and actively aiming
const char1 = new Character({ name: "Player 1", x: 5, y: 5 });
char1.playerId = "keyboard";
char1.playerNumber = 1;

const rock1 = new GameObject({ name: "Rock 1", x: 5, y: 5 });
char1.heldObject = rock1;
rock1.isHeld = true;
rock1.heldBy = char1;

// Simulate active trajectory for char1
char1.activeTrajectory = {
  points: [
    { x: 5, y: 5, z: 0.5 },
    { x: 7, y: 5, z: 1.5 },
    { x: 9, y: 5, z: 0.0 },
  ],
  landPoint: { x: 9, y: 5, z: 0.0 },
  isLandingOnWallTop: false,
  isBlockedByWall: false,
  isAutoLocked: false,
  targetObject: null,
  horizontalDistance: 4,
  maxAltitude: 1.5,
  flightDuration: 0.8,
  throwVelocity: { x: 5, y: 0 },
  launchVerticalVelocity: 4,
  colliderRadius: 0.35,
  visualShape: "circle",
};

const char2 = new Character({ name: "Player 2", x: 15, y: 15 });
char2.playerId = "gamepad-0";
char2.playerNumber = 2;

const rock2 = new GameObject({ name: "Rock 2", x: 15, y: 15 });
char2.heldObject = rock2;
rock2.isHeld = true;
rock2.heldBy = char2;

// Simulate active trajectory for char2
char2.activeTrajectory = {
  points: [
    { x: 15, y: 15, z: 0.5 },
    { x: 17, y: 15, z: 1.5 },
    { x: 19, y: 15, z: 0.0 },
  ],
  landPoint: { x: 19, y: 15, z: 0.0 },
  isLandingOnWallTop: false,
  isBlockedByWall: false,
  isAutoLocked: false,
  targetObject: null,
  horizontalDistance: 4,
  maxAltitude: 1.5,
  flightDuration: 0.8,
  throwVelocity: { x: 5, y: 0 },
  launchVerticalVelocity: 4,
  colliderRadius: 0.35,
  visualShape: "circle",
};

// Spy on TrajectoryRenderer.drawTrajectory and drawAimReticle
let drawnTrajectories: { traj: any; char: Character | null | undefined }[] = [];
let drawnAimReticles: { x: number; y: number; color: string }[] = [];

(renderer as any).trajectoryRenderer.drawTrajectory = (
  traj: any,
  ppu: number,
  arena: Arena,
  viewSettings: any,
  cursorTarget: any,
  character?: Character | null
) => {
  drawnTrajectories.push({ traj, char: character });
};

(renderer as any).trajectoryRenderer.drawAimReticle = (x: number, y: number, color: string) => {
  drawnAimReticles.push({ x, y, color });
};

// --- Test 1: Single Screen Rendering with Local and Remote Player ---
console.log("\n--- Scenario 1: Single Screen Rendering (char1 is local, char2 is remote) ---");
drawnTrajectories = [];
drawnAimReticles = [];

const remoteOverrides = new Map<string, any>();
remoteOverrides.set("gamepad-0", { x: 15, y: 15, z: 0, facingAngle: 0, isClimbing: false });

renderer.render(
  arena,
  [char1, char2],
  [rock1, rock2],
  null,
  false,
  null,
  undefined,
  false,
  null,
  null,
  [
    { character: char1, x: 9, y: 5, color: "#38bdf8", isKeyboard: true },
    { character: char2, x: 19, y: 15, color: "#f59e0b", isKeyboard: false },
  ],
  undefined,
  false,
  char1, // local hero is char1
  remoteOverrides
);

console.log(`Drawn trajectories count: ${drawnTrajectories.length}`);
assert(drawnTrajectories.length === 1, `Expected exactly 1 trajectory to be drawn, got ${drawnTrajectories.length}`);
assert(drawnTrajectories[0].char === char1, "Drawn trajectory must belong to char1 (local player)");
assert(drawnTrajectories[0].traj === char1.activeTrajectory, "Drawn trajectory must match char1.activeTrajectory");
console.log("✅ Verified: Remote char2's throw trajectory and destination marker were NOT drawn on char1's screen.");

// --- Test 2: Split Screen Rendering ---
console.log("\n--- Scenario 2: Split Screen Rendering (Dual Client Simulation) ---");
const playerViews: SplitScreenPlayerView[] = [
  {
    playerNumber: 1,
    playerName: "Player 1",
    playerColor: "#38bdf8",
    isKeyboard: true,
    character: char1,
    activeAimCursor: { character: char1, x: 9, y: 5, color: "#38bdf8", isKeyboard: true },
  },
  {
    playerNumber: 2,
    playerName: "Player 2",
    playerColor: "#f59e0b",
    isKeyboard: false,
    character: char2,
    activeAimCursor: { character: char2, x: 19, y: 15, color: "#f59e0b", isKeyboard: false },
  },
];

drawnTrajectories = [];
renderer.renderSplitScreen(
  arena,
  playerViews,
  [rock1, rock2],
  null,
  remoteOverrides
);

console.log(`Split screen total trajectories drawn across both viewports: ${drawnTrajectories.length}`);
assert(drawnTrajectories.length === 2, `Expected exactly 2 trajectories (1 per viewport), got ${drawnTrajectories.length}`);
assert(drawnTrajectories[0].char === char1, "First viewport (Client 1) must ONLY draw char1's trajectory");
assert(drawnTrajectories[1].char === char2, "Second viewport (Client 2) must ONLY draw char2's trajectory");
console.log("✅ Verified: In split screen, each client screen ONLY renders its own trajectory and destination marker, never the remote client's.");

// --- Test 3: Remote Aim Reticles Not Drawn for Remote Players ---
console.log("\n--- Scenario 3: Precision Aim Reticle When Not Holding ---");
char1.activeTrajectory = null;
char2.activeTrajectory = null;
drawnAimReticles = [];

renderer.render(
  arena,
  [char1, char2],
  [rock1, rock2],
  null,
  false,
  null,
  undefined,
  false,
  null,
  null,
  [
    { character: char1, x: 9, y: 5, color: "#38bdf8", isKeyboard: true },
    { character: char2, x: 19, y: 15, color: "#f59e0b", isKeyboard: false },
  ],
  undefined,
  false,
  char1, // local hero is char1
  remoteOverrides
);

console.log(`Drawn aim reticles count: ${drawnAimReticles.length}`);
assert(drawnAimReticles.length === 1, `Expected exactly 1 aim reticle for local player, got ${drawnAimReticles.length}`);
assert(drawnAimReticles[0].color === "#38bdf8", "Drawn reticle must be char1's color (#38bdf8)");
console.log("✅ Verified: Remote aim reticle is not rendered on local client's screen.");

console.log("\n🎉 ALL REMOTE TRAJECTORY ISOLATION TESTS PASSED 100%!");
