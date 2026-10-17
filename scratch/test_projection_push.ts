import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

async function run() {
  const arena = new Arena();
  const hero = new Character({ id: "hero", x: 2.0, y: 2.0, mass: 1.2 });
  const dummy = new Character({ id: "dummy", x: 2.8, y: 2.0, mass: 1.5, controllerType: "none" });
  const dt = 1 / 60;

  // Test: In resolvePairDiscreteTOI, separate via projection based on inverse mass
  CollisionResolver.resolvePairDiscreteTOI = function(a, b, _arena, dt) {
    const minDist = a.colliderRadius + b.colliderRadius;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) return false;
    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;
    const normX = dx / dist;
    const normY = dy / dist;

    // Relative velocity
    const relVx = (b.isImmovable ? 0 : b.velocity.x) - (a.isImmovable ? 0 : a.velocity.x);
    const relVy = (b.isImmovable ? 0 : b.velocity.y) - (a.isImmovable ? 0 : a.velocity.y);
    const velAlongNormal = relVx * normX + relVy * normY;

    // Positional separation (projection)
    const mA = a.hasMass ? a.mass : 0;
    const mB = b.hasMass ? b.mass : 0;
    const invA = a.isImmovable || !a.hasMass ? 0 : 1 / mA;
    const invB = b.isImmovable || !b.hasMass ? 0 : 1 / mB;
    const invSum = invA + invB;
    if (invSum > 0.0001) {
      const fixA = overlap * (invA / invSum);
      const fixB = overlap * (invB / invSum);
      if (!a.isImmovable) { a.position.x -= normX * fixA; a.position.y -= normY * fixA; }
      if (!b.isImmovable) { b.position.x += normX * fixB; b.position.y += normY * fixB; }
    }

    // Velocity impulse (restitution = 0 for character pushes)
    const bounceA = a.hasBounce && a.bounceMod !== null ? a.bounceMod : 0;
    const bounceB = b.hasBounce && b.bounceMod !== null ? b.bounceMod : 0;
    const restitution = (a.isCharacter && b.isCharacter) ? 0 : Math.max(bounceA, bounceB);
    (CollisionResolver as any).applyImpulseAtContact(a, b, normX, normY, velAlongNormal, restitution, "discrete_toi");
    return true;
  };

  console.log("--- Running push test with positional separation ---");
  for (let t = 0; t < 60; t++) {
    hero.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena);
    dummy.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    CollisionResolver.resolveEntityCollisions([hero, dummy], arena, dt);
    if (t % 15 === 0) {
      console.log(`Push ${t}: Hero Pos=(${hero.position.x.toFixed(2)}) Vx=${hero.velocity.x.toFixed(2)} | Dummy Pos=(${dummy.position.x.toFixed(2)}) Vx=${dummy.velocity.x.toFixed(2)}`);
    }
  }
  console.log(`After 60 ticks push: Hero Pos=(${hero.position.x.toFixed(2)}) Dummy Pos=(${dummy.position.x.toFixed(2)})`);

  console.log("\n--- Hero STOPS input ---");
  for (let t = 0; t < 30; t++) {
    hero.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    dummy.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena);
    CollisionResolver.resolveEntityCollisions([hero, dummy], arena, dt);
    if (t % 5 === 0) {
      console.log(`Stop ${t}: Hero Pos=(${hero.position.x.toFixed(2)}) Vx=${hero.velocity.x.toFixed(2)} | Dummy Pos=(${dummy.position.x.toFixed(2)}) Vx=${dummy.velocity.x.toFixed(2)}`);
    }
  }
}
run();
