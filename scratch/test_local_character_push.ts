import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

const arena = new Arena();
const c1 = new Character({ x: 5.0, y: 7.0, mass: 1.2, colliderRadius: 0.44 });
const c2 = new Character({ x: 6.0, y: 7.0, mass: 1.2, colliderRadius: 0.44 });

const dt = 1 / 60;
console.log("=== Testing Character Pushing Character Locally ===");

for (let tick = 1; tick <= 30; tick++) {
  // C1 walking right with full force
  c1.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false, [c1, c2], false);
  // C2 standing idle
  c2.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, false, [c1, c2], false);

  // Position updates
  c1.updatePosition(dt, arena);
  c2.updatePosition(dt, arena);

  // Collision resolution
  CollisionResolver.resolveEntityCollisions([c1, c2], arena, dt, null, "dynamic");

  if (tick % 5 === 0 || tick <= 5) {
    console.log(`Tick ${tick}: C1 (${c1.position.x.toFixed(3)}, vx=${c1.velocity.x.toFixed(3)}) | C2 (${c2.position.x.toFixed(3)}, vx=${c2.velocity.x.toFixed(3)})`);
  }
}
