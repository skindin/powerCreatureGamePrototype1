import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

async function run() {
  const arena = new Arena();
  const hero = new Character({ id: "hero", x: 2.0, y: 2.0, mass: 1.2 });
  const dummy = new Character({ id: "dummy", x: 2.8, y: 2.0, mass: 1.5, controllerType: "none" });
  const dt = 1 / 60;

  for (let tick = 0; tick < 5; tick++) {
    console.log(`\n--- Tick ${tick} ---`);
    console.log(`Pre:  H=(${hero.position.x.toFixed(4)}, ${hero.position.y.toFixed(4)}) v=(${hero.velocity.x.toFixed(4)}) | D=(${dummy.position.x.toFixed(4)}, ${dummy.position.y.toFixed(4)}) v=(${dummy.velocity.x.toFixed(4)})`);
    hero.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena);
    dummy.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    console.log(`Post-update: H=(${hero.position.x.toFixed(4)}, ${hero.position.y.toFixed(4)}) v=(${hero.velocity.x.toFixed(4)}) | D=(${dummy.position.x.toFixed(4)}, ${dummy.position.y.toFixed(4)}) v=(${dummy.velocity.x.toFixed(4)})`);
    CollisionResolver.resolveEntityCollisions([hero, dummy], arena, dt);
    console.log(`Post-resolv: H=(${hero.position.x.toFixed(4)}, ${hero.position.y.toFixed(4)}) v=(${hero.velocity.x.toFixed(4)}) | D=(${dummy.position.x.toFixed(4)}, ${dummy.position.y.toFixed(4)}) v=(${dummy.velocity.x.toFixed(4)})`);
  }
}
run();
