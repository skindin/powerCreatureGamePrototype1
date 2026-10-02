import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { InputManager } from "../ui/InputManager.js";
import { DevPanel } from "../ui/DevPanel.js";

const arena = new Arena(20, 14, 1.0);
console.log("Arena preset:", arena.currentPresetId);
console.log("Arena walls count:", arena.walls.length);

// In Trench Tunnels, let's find a wall tile
const wall = arena.walls[0];
console.log("Wall 0:", wall);

// Create Object A resting on this wall
const objA = new GameObject({
  id: "box-on-wall",
  position: { x: wall.x + 0.5, y: wall.y + 0.5, z: 1.0 },
  mass: 1.0,
  colliderRadius: 0.3,
  hasVerticalPosition: true,
});
objA.supportingSurfaceHeight = 1.0;
objA.standingWall = wall;

// Create Object B flying way above wall height (z = 2.5) towards Object A
const objB = new GameObject({
  id: "flying-box",
  position: { x: wall.x - 1.0, y: wall.y + 0.5, z: 2.5 },
  velocity: { x: 3.0, y: 0 },
  mass: 1.0,
  colliderRadius: 0.3,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
  verticalVelocity: 0,
  hasGravity: false, // keep it way above wall height for testing horizontal collision
});

const character = new Character({ x: 1, y: 1 });
const objects = [objA, objB];

const gameLoop = new GameLoop({
  arena,
  character,
  objects,
  renderer: { render: () => {} } as any,
  inputManager: { isMouseDown: false, mousePos: { x: 0, y: 0 }, movementVector: { x: 0, y: 0 } } as any,
  devPanel: { isEditMode: false, updateInspector: () => {} } as any,
});

console.log("Initial objA:", objA.position, "isAboveWalls:", objA.isAboveWalls, "supportingSurfaceHeight:", objA.supportingSurfaceHeight);
console.log("Initial objB:", objB.position, "isAboveWalls:", objB.isAboveWalls);

let collided = false;
for (let f = 1; f <= 60; f++) {
  const prevVxB = objB.velocity.x;
  (gameLoop as any).updatePhysics(1 / 60);
  
  if (Math.abs(objB.velocity.x - prevVxB) > 0.1 || Math.abs(objA.velocity.x) > 0.1) {
    console.log(`COLLISION DETECTED at frame ${f}! objA vx=${objA.velocity.x.toFixed(2)}, objB vx=${objB.velocity.x.toFixed(2)}`);
    collided = true;
    break;
  }
}

if (!collided) {
  console.log("NO COLLISION! objA pos:", objA.position, "objB pos:", objB.position);
}
