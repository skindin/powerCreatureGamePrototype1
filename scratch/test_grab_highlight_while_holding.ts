import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Renderer } from "../src/engine/Renderer.js";

console.log("=== Testing Highlight & Colored Outline Near Objects While Holding ===");

const arena = new Arena(20, 14, 1.0);

const mockCtx: any = {
  canvas: { width: 1000, height: 700 },
  clearRect: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  stroke: () => {},
  fill: () => {},
  arc: () => {},
  rect: () => {},
  roundRect: () => {},
  moveTo: () => {},
  lineTo: () => {},
  fillText: () => {},
  measureText: () => ({ width: 20 }),
  setLineDash: () => {},
  strokeStyle: "",
  lineWidth: 1,
  fillStyle: "",
  globalAlpha: 1,
};

const renderer = new Renderer(mockCtx);

// 1. Setup Player 1 (Amber Gold: #f59e0b) holding a rock
const p1 = new Character({ playerId: "keyboard", playerNumber: 1, x: 5, y: 5, color: "#f59e0b" });
p1.playerColor = "#f59e0b";
p1.walkingModule = new WalkingModule();
p1.pickupModule = new PickupModule();
p1.throwModule = new ThrowModule();

const heldRock = new GameObject({
  id: "held-rock",
  position: { x: 5, y: 5, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
});
p1.heldObject = heldRock;
heldRock.isHeld = true;
heldRock.heldBy = p1;

// 2. Setup Ground Rock 1 at (5.7, 5) (close to p1, in reach)
const groundRock1 = new GameObject({
  id: "ground-rock-1",
  position: { x: 5.7, y: 5, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
  visualShape: "box",
});

// 3. Setup Ground Rock 2 at (5.0, 5.8) (also in reach)
const groundRock2 = new GameObject({
  id: "ground-rock-2",
  position: { x: 5.0, y: 5.8, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
  visualShape: "circle",
});

// 4. Far Rock at (10, 10) (out of reach)
const farRock = new GameObject({
  id: "far-rock",
  position: { x: 10, y: 10, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
});

arena.entities = [p1, heldRock, groundRock1, groundRock2, farRock];
const allObjects = [heldRock, groundRock1, groundRock2, farRock];

// Simulate GameLoop targeting:
// Cursor is at (6, 5) (closer to groundRock1 than groundRock2)
const cursorX = 6.0;
const cursorY = 5.0;

const others = allObjects;
const reachable = others.filter((o) => p1.pickupModule!.isObjectInReach(p1, o, arena.wallHeight));
console.log(`Reachable items count: ${reachable.length} (expected 2: groundRock1, groundRock2)`);
if (reachable.includes(heldRock)) throw new Error("Held rock should NOT be reachable!");
if (reachable.includes(farRock)) throw new Error("Far rock should NOT be reachable!");
if (!reachable.includes(groundRock1) || !reachable.includes(groundRock2)) {
  throw new Error("Both groundRock1 and groundRock2 should be reachable!");
}

const reachableGround = reachable.filter((o) => o !== p1.heldObject && !o.isHeld);
const target = p1.pickupModule!.findTargetObject(p1, cursorX, cursorY, reachableGround, arena.wallHeight);
console.log(`Target closest to cursor: ${target?.id} (expected ground-rock-1)`);
if (target !== groundRock1) {
  throw new Error(`Expected ground-rock-1 to be target, got: ${target?.id}`);
}

const targetGrabEntities = new Map<Character, GameObject | null>();
targetGrabEntities.set(p1, target);

// Track all stroke operations
let capturedStrokeStyles: Record<string, string[]> = {};
let currentRenderingObj: GameObject | null = null;

mockCtx.stroke = function() {
  if (currentRenderingObj) {
    if (!capturedStrokeStyles[currentRenderingObj.id]) {
      capturedStrokeStyles[currentRenderingObj.id] = [];
    }
    capturedStrokeStyles[currentRenderingObj.id].push(mockCtx.strokeStyle);
  }
};

// Render groundRock1 (the active target closest to cursor)
currentRenderingObj = groundRock1;
(renderer as any).drawFreebodyObject(groundRock1, [p1], 50, targetGrabEntities, arena);

console.log(`groundRock1 strokeStyles:`, capturedStrokeStyles["ground-rock-1"]);

// Must have drawn stroke in p1's theme color: #f59e0b
if (!capturedStrokeStyles["ground-rock-1"].includes("#f59e0b")) {
  throw new Error(`Expected groundRock1 to include strokeStyle #f59e0b, got: ${JSON.stringify(capturedStrokeStyles["ground-rock-1"])}`);
}

// Render groundRock2 (in reach, but not the targeted one)
currentRenderingObj = groundRock2;
(renderer as any).drawFreebodyObject(groundRock2, [p1], 50, targetGrabEntities, arena);

console.log(`groundRock2 strokeStyles:`, capturedStrokeStyles["ground-rock-2"]);
// groundRock2 is in reach, so it should have strokes (white/reachColor outline and dashed reach ring)
if (!capturedStrokeStyles["ground-rock-2"] || capturedStrokeStyles["ground-rock-2"].length === 0) {
  throw new Error("groundRock2 should have had strokes for reach highlight!");
}

// Render heldRock (should NOT be treated as within pickup reach)
currentRenderingObj = heldRock;
(renderer as any).drawFreebodyObject(heldRock, [p1], 50, targetGrabEntities, arena);
console.log(`heldRock strokeStyles:`, capturedStrokeStyles["held-rock"]);
// Held rock should NEVER have the vibrant target theme color
if (capturedStrokeStyles["held-rock"]?.includes("#f59e0b")) {
  throw new Error("heldRock should NOT have player target color outline!");
}

console.log("\nALL HIGHLIGHT & COLORED OUTLINE TESTS PASSED CLEANLY!");
