import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";

const arena = new Arena(20, 14, 1.0);
arena.gravity = 30.0;

const stone = new GameObject({
  id: "stone-1",
  name: "Light Blue Box",
  position: { x: 10.0, y: 4.0, z: 0 },
  mass: 0.7,
  colliderRadius: 0.26,
  color: "#38bdf8",
  bounceMod: 0.25,
  visualShape: "box",
});

stone.velocity.x = 2.0;
stone.verticalVelocity = -0.01;

const dt = 1 / 60;
console.log("Testing GameObject.updatePosition with live fix (gravity = 30.0):");
for (let tick = 1; tick <= 20; tick++) {
  stone.updatePosition(dt, arena);
  if (tick <= 5 || tick === 12 || tick === 20) {
    console.log(`Tick ${tick}: z = ${stone.position.z.toFixed(4)}, vz = ${stone.verticalVelocity.toFixed(4)}, vx = ${stone.velocity.x.toFixed(4)}, isResting = ${stone.isRestingOnSurface}`);
  }
}

console.assert(stone.velocity.x === 0, `Expected stone to stop, got vx = ${stone.velocity.x}`);
console.assert(stone.position.z === 0, `Expected stone at z=0, got z = ${stone.position.z}`);
console.assert(stone.verticalVelocity === 0, `Expected vz=0, got vz = ${stone.verticalVelocity}`);
console.log("\n✓ Light Blue Box comes to a complete rest with friction as expected!");
