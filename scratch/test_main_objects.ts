import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { GameLoop } from "../src/engine/GameLoop.js";

const arena = new Arena(20, 14, 1.0);

const character = new Character({
  x: 4.8,
  y: 7.0,
  color: "#f59e0b",
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
});

const objects: GameObject[] = [
  new GameObject({
    id: "stone-1",
    name: "Light Blue Box",
    position: { x: 6.8, y: 4.4, z: 0 },
    mass: 0.7,
    colliderRadius: 0.26,
    color: "#38bdf8",
    bounceMod: 0.25,
    visualShape: "box",
  }),
  new GameObject({
    id: "boulder-1",
    name: "Heavy Red Box",
    position: { x: 7.0, y: 9.2, z: 0 },
    mass: 2.6,
    colliderRadius: 0.40,
    color: "#f87171",
    bounceMod: 0.05,
    visualShape: "box",
  }),
  new GameObject({
    id: "bouncy-1",
    name: "Super Bouncy Ball",
    position: { x: 5.2, y: 3.0, z: 0.6 },
    mass: 0.5,
    colliderRadius: 0.24,
    color: "#4ade80",
    bounceMod: 0.85,
    verticalVelocity: 1.0,
  }),
  new GameObject({
    id: "rolling-1",
    name: "Rolling Ball",
    position: { x: 13.6, y: 7.0, z: 0 },
    velocity: { x: 4.5, y: 1.5 },
    mass: 0.6,
    colliderRadius: 0.28,
    color: "#a855f7",
    bounceMod: 0.95,
  }),
];

arena.syncEntitiesWithWalls([character, ...objects]);

console.log("Before update:");
for (const obj of objects) {
  console.log(`${obj.id}: pos=(${obj.position.x}, ${obj.position.y}, ${obj.position.z}), surfH=${obj.supportingSurfaceHeight}, isAboveWalls=${obj.isAboveWalls}`);
}

// Run 10 frames of updatePosition
for (let f = 1; f <= 10; f++) {
  for (const obj of objects) {
    obj.updatePosition(1 / 60, arena);
  }
}

console.log("\nAfter 10 frames of updatePosition:");
for (const obj of objects) {
  console.log(`${obj.id}: pos=(${obj.position.x}, ${obj.position.y}, ${obj.position.z}), surfH=${obj.supportingSurfaceHeight}, isAboveWalls=${obj.isAboveWalls}`);
}
