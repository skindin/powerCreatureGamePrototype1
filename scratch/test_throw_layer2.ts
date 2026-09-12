import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { ThrowModule } from "../src/character/ThrowModule.js";

const arena = new Arena(20, 14, 1.0);

const character = new Character({
  x: 5.0,
  y: 7.0, // In trench at col 5, row 7
  color: "#f59e0b",
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
});

// A target object resting on a wall top at (5.0, 4.0, 1.0)
const wallAtTarget = arena.getWallAt(5.0, 4.0);
console.log("Wall at (5.0, 4.0):", wallAtTarget);

const targetObj = new GameObject({
  id: "target-box",
  position: { x: 5.0, y: 4.0, z: 1.0 },
  mass: 0.7,
  colliderRadius: 0.26,
  hasVerticalPosition: true,
});
targetObj.supportingSurfaceHeight = 1.0;
targetObj.standingWall = wallAtTarget;

// Character holds a thrown object
const thrownObj = new GameObject({
  id: "thrown-ball",
  position: { x: 5.0, y: 7.0, z: 0.45 },
  mass: 0.5,
  colliderRadius: 0.25,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
});
character.heldObject = thrownObj;
thrownObj.isHeld = true;
thrownObj.heldBy = character;

const objects = [targetObj, thrownObj];

const gameLoop = new GameLoop({
  arena,
  character,
  objects,
  renderer: { render: () => {} } as any,
  inputManager: { isMouseDown: false, mousePos: { x: 0, y: 0 }, movementVector: { x: 0, y: 0 } } as any,
  devPanel: { isEditMode: false, updateInspector: () => {} } as any,
});

// Throw towards (5.0, 2.0) - aiming beyond the wall and targetObj!
const throwMod = new ThrowModule();
throwMod.throwHeldObject(character, 5.0, 2.0, arena);

console.log("Thrown! Initial thrownObj vz:", thrownObj.verticalVelocity, "vy:", thrownObj.velocity.y, "pos:", thrownObj.position);

for (let f = 1; f <= 90; f++) {
  (gameLoop as any).updatePhysics(1 / 60);

  const dy = Math.abs(thrownObj.position.y - targetObj.position.y);
  const dx = Math.abs(thrownObj.position.x - targetObj.position.x);
  const dist = Math.hypot(dx, dy);

  if (f % 5 === 0 || dist < 0.6) {
    console.log(`f=${f}: thrown pos=(${thrownObj.position.x.toFixed(2)}, ${thrownObj.position.y.toFixed(2)}, ${thrownObj.position.z.toFixed(2)}), target pos=(${targetObj.position.x.toFixed(2)}, ${targetObj.position.y.toFixed(2)}, ${targetObj.position.z.toFixed(2)}), dist=${dist.toFixed(2)}, targetVy=${targetObj.velocity.y.toFixed(2)}`);
  }

  if (Math.abs(targetObj.velocity.y) > 0.1) {
    console.log(`COLLISION at frame ${f}!`);
    break;
  }
}

if (!hitTarget) {
  console.log("MISSED TARGET! thrownObj final pos:", thrownObj.position, "targetObj pos:", targetObj.position);
}
