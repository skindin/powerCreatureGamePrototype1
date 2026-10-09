import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { DamageSolverModule } from "../src/engine/DamageSolverModule.js";

async function testImpactDamage() {
  console.log("=== Testing Collision Damage Solver & Impact Trauma ===");

  const arena = new Arena();
  const resolver = new CollisionResolver();

  // Create character with Health and DamageSolver
  const hero = new Character({
    id: "hero",
    name: "Hero",
    position: { x: 5, y: 5, z: 0 },
    velocity: { x: 10, y: 0 }, // Moving fast toward a wall or heavy object
    radius: 0.32,
    mass: 1.0,
    health: { baseMaxHp: 100, maxHp: 100, currentHp: 100 },
  });
  hero.damageSolverModule = new DamageSolverModule({
    impactSusceptibility: 1.0,
    minShockThreshold: 2.0,
  });

  const hpBefore = hero.healthModule!.currentHp;
  console.log(`Hero HP before wall impact: ${hpBefore}`);

  // Simulate a blunt impact with high deceleration shock (e.g. 15.0 u/s²)
  const impactEvent = {
    absorbedShock: 15.0,
    impactSpeed: 10.0,
    otherEntity: null,
    normalX: -1,
    normalY: 0,
  };

  hero.damageSolverModule.handleImpact(impactEvent, hero, hero.healthModule!, 1.0);
  const hpAfter = hero.healthModule!.currentHp;
  console.log(`Hero HP after impact (15.0 shock, min thresh 2.0, world scale 1.0): ${hpAfter}`);

  if (hpAfter >= hpBefore) {
    throw new Error("Expected HP to decrease following severe blunt impact!");
  }

  // Low shock below threshold should deal 0 damage
  const lowImpact = {
    absorbedShock: 1.5, // below minShockThreshold of 2.0
    impactSpeed: 1.0,
    otherEntity: null,
    normalX: -1,
    normalY: 0,
  };
  // Advance time past cooldown
  await new Promise((r) => setTimeout(r, 70));
  hero.damageSolverModule.handleImpact(lowImpact, hero, hero.healthModule!, 1.0);
  console.log(`Hero HP after low shock (1.5 shock < 2.0 thresh): ${hero.healthModule!.currentHp}`);
  if (hero.healthModule!.currentHp !== hpAfter) {
    throw new Error("Low impact below threshold should not have inflicted damage!");
  }

  console.log("✅ Collision Damage Solver tests passed successfully!");
}

testImpactDamage().catch((err) => {
  console.error(err);
  process.exit(1);
});
