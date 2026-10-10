import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

async function run() {
  console.log("=== Testing Pushing Character Head-On vs Dummy ===");
  const arena = new Arena();

  // Hero at (2, 2), Dummy at (2.8, 2.0)
  // Distance = 0.8, Colliders: hero radius 0.44, dummy radius 0.44 -> sum = 0.88
  // They start barely touching (0.08 overlap)
  const hero = new Character({ id: "hero", x: 2.0, y: 2.0, mass: 1.2 });
  const dummy = new Character({ id: "dummy", x: 2.8, y: 2.0, mass: 1.5, controllerType: "none" });

  const dt = 1 / 60;

  console.log(`Initial Hero Pos: (${hero.position.x.toFixed(3)}, ${hero.position.y.toFixed(3)})`);
  console.log(`Initial Dummy Pos: (${dummy.position.x.toFixed(3)}, ${dummy.position.y.toFixed(3)})`);

  // Step 60 ticks where Hero is actively walking right (+X) into Dummy
  for (let tick = 0; tick < 60; tick++) {
    // 1. Hero updates with input
    hero.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena);
    // 2. Dummy updates with 0 input
    dummy.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    // 3. Collision resolver resolves pair
    CollisionResolver.resolveEntityCollisions([hero, dummy], arena, dt);

    if (tick % 10 === 0) {
      console.log(`Tick ${tick}: Hero Pos=(${hero.position.x.toFixed(2)}, ${hero.position.y.toFixed(2)}) Vx=${hero.velocity.x.toFixed(2)} | Dummy Pos=(${dummy.position.x.toFixed(2)}, ${dummy.position.y.toFixed(2)}) Vx=${dummy.velocity.x.toFixed(2)}`);
    }
  }

  console.log(`\nAfter 60 ticks of pushing:`);
  console.log(`Hero Pos: (${hero.position.x.toFixed(2)}, ${hero.position.y.toFixed(2)})`);
  console.log(`Dummy Pos: (${dummy.position.x.toFixed(2)}, ${dummy.position.y.toFixed(2)})`);

  // Now hero STOPS pushing (input = 0)
  console.log("\n=== Hero STOPS Pushing (Input = 0) ===");
  for (let tick = 0; tick < 30; tick++) {
    hero.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    dummy.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    CollisionResolver.resolveEntityCollisions([hero, dummy], arena, dt);

    if (tick % 5 === 0) {
      console.log(`Stop Tick ${tick}: Hero Pos=(${hero.position.x.toFixed(2)}, ${hero.position.y.toFixed(2)}) Vx=${hero.velocity.x.toFixed(2)} | Dummy Pos=(${dummy.position.x.toFixed(2)}, ${dummy.position.y.toFixed(2)}) Vx=${dummy.velocity.x.toFixed(2)}`);
    }
  }
}

run().catch(console.error);
