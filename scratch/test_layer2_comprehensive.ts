import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { GameLoop } from "../src/engine/GameLoop.js";

const arena = new Arena(20, 14, 1.0);
const dt = 1 / 60;

console.log("=== TEST 1: Object way above wall height (z=2.5) collides with object resting on wall (z=1.0) ===");
// Wall at x: [4, 5], y: [4, 5]
const wall = arena.getWallAt(4.5, 4.5);
if (!wall) throw new Error("Expected wall at (4.5, 4.5)");

const restingObj = new GameObject({
  id: "resting-obj",
  position: { x: 4.5, y: 4.5, z: 1.0 },
  mass: 1.0,
  colliderRadius: 0.3,
  hasVerticalPosition: true,
});
restingObj.supportingSurfaceHeight = 1.0;
restingObj.standingWall = wall;

// Flying object way above wall height at z=2.5 moving towards restingObj
const highFlyingObj = new GameObject({
  id: "flying-obj",
  position: { x: 3.5, y: 4.5, z: 2.5 },
  velocity: { x: 2.0, y: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
  verticalVelocity: 0,
  hasGravity: false, // Keep high at z=2.5 to test pure Layer 2 collision
});

const character = new Character({ x: 1, y: 1 });
const objects = [restingObj, highFlyingObj];

const gameLoop = new GameLoop({
  arena,
  character,
  objects,
  renderer: { render: () => {} } as any,
  inputManager: { isMouseDown: false, mousePos: { x: 0, y: 0 }, movementVector: { x: 0, y: 0 } } as any,
  devPanel: { isEditMode: false, updateInspector: () => {} } as any,
});

let collidedTest1 = false;
for (let f = 1; f <= 60; f++) {
  const prevVxFlying = highFlyingObj.velocity.x;
  (gameLoop as any).updatePhysics(dt);

  if (Math.abs(restingObj.velocity.x) > 0.1 || highFlyingObj.velocity.x < prevVxFlying - 0.1) {
    console.log(`✓ SUCCESS: Layer 2 collision occurred at frame ${f}!`);
    console.log(`  restingObj vx=${restingObj.velocity.x.toFixed(2)}, highFlyingObj vx=${highFlyingObj.velocity.x.toFixed(2)}`);
    collidedTest1 = true;
    break;
  }
}

if (!collidedTest1) {
  console.error("✗ FAIL: Flying object passed right through object resting on wall without colliding!");
  process.exit(1);
}

console.log("\n=== TEST 2: Object way above wall height (z=2.5) does NOT collide with object on ground (z=0) ===");
const groundObj = new GameObject({
  id: "ground-obj",
  position: { x: 10.0, y: 3.0, z: 0 }, // In open ground tunnel
  mass: 1.0,
  colliderRadius: 0.3,
  hasVerticalPosition: true,
});
groundObj.supportingSurfaceHeight = 0;

const highFlyingObj2 = new GameObject({
  id: "flying-obj-2",
  position: { x: 9.0, y: 3.0, z: 2.5 },
  velocity: { x: 3.0, y: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
  verticalVelocity: 0,
  hasGravity: false,
});

const objects2 = [groundObj, highFlyingObj2];
const gameLoop2 = new GameLoop({
  arena,
  character,
  objects: objects2,
  renderer: { render: () => {} } as any,
  inputManager: { isMouseDown: false, mousePos: { x: 0, y: 0 }, movementVector: { x: 0, y: 0 } } as any,
  devPanel: { isEditMode: false, updateInspector: () => {} } as any,
});

let collidedTest2 = false;
for (let f = 1; f <= 30; f++) {
  (gameLoop2 as any).updatePhysics(dt);
  if (Math.abs(groundObj.velocity.x) > 0.05) {
    collidedTest2 = true;
    break;
  }
}

if (collidedTest2) {
  console.error("✗ FAIL: High flying object collided with ground object!");
  process.exit(1);
} else {
  console.log("✓ SUCCESS: High flying object passed cleanly over ground object without colliding!");
}

console.log("\n=== ALL LAYER 2 TESTS PASSED! ===");
