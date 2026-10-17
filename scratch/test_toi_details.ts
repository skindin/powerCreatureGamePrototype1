import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

async function run() {
  const arena = new Arena();
  const hero = new Character({ id: "hero", x: 2.0, y: 2.0, mass: 1.2 });
  const dummy = new Character({ id: "dummy", x: 2.8, y: 2.0, mass: 1.5, controllerType: "none" });
  const dt = 1 / 60;

  // Wrap resolvePairDiscreteTOI to log internals
  const orig = CollisionResolver.resolvePairDiscreteTOI;
  CollisionResolver.resolvePairDiscreteTOI = function(a, b, ar, dt) {
    const minDist = a.colliderRadius + b.colliderRadius;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dist = Math.hypot(dx, dy);
    const overlap = minDist - dist;
    const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
    const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
    const normX = dx / dist;
    const normY = dy / dist;
    const velAlongNormal = relVx * normX + relVy * normY;
    const relSpeed = Math.hypot(relVx, relVy);
    const alpha = Math.min(1.0, Math.max(0.0, overlap / (relSpeed * dt)));
    console.log(`   [TOI Debug] dist=${dist.toFixed(4)} overlap=${overlap.toFixed(4)} relVx=${relVx.toFixed(4)} vn=${velAlongNormal.toFixed(4)} alpha=${alpha.toFixed(4)} rewindDt=${(alpha*dt).toFixed(4)} remDt=${((1-alpha)*dt).toFixed(4)}`);
    return orig.call(this, a, b, ar, dt);
  };

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
