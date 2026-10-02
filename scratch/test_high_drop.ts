import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";

const arena = new Arena(20, 14, 1.0);
arena.gravity = 30.0;

const stone = new GameObject({
  id: "stone-1",
  name: "Light Blue Box",
  position: { x: 1.5, y: 1.5, z: 1.0 }, // (1.5, 1.5) is open ground
  mass: 0.7,
  colliderRadius: 0.26,
  color: "#38bdf8",
  bounceMod: 0.25,
  visualShape: "box",
});

stone.velocity.x = 2.0;

const dt = 1 / 60;
console.log("Testing high drop onto ground from z = 1.0 under gravity = 30.0:");
let bounced = false;
for (let tick = 1; tick <= 50; tick++) {
  stone.updatePosition(dt, arena);
  if (stone.verticalVelocity > 0.5) bounced = true;
  if (tick <= 20 && tick % 4 === 0) {
    console.log(`Tick ${tick}: z = ${stone.position.z.toFixed(4)}, vz = ${stone.verticalVelocity.toFixed(4)}, vx = ${stone.velocity.x.toFixed(4)}, isResting = ${stone.isRestingOnSurface}`);
  }
}

console.assert(bounced, "Expected stone to have bounced from 1.0u fall");
console.assert(stone.velocity.x === 0, `Expected stone to stop, got vx = ${stone.velocity.x}`);
console.assert(stone.position.z === 0, `Expected stone at z=0, got z = ${stone.position.z}`);
console.assert(stone.verticalVelocity === 0, `Expected vz=0, got vz = ${stone.verticalVelocity}`);
console.log("✓ High drop bounces naturally and then comes to complete rest!");
