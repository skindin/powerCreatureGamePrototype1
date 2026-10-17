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
    damageThresholdHp: 2.0, // absorbs first 2.0 HP of any impact
  });

  const hpBefore = hero.healthModule!.currentHp;
  console.log(`Hero HP before wall impact: ${hpBefore}`);

  // Simulate a blunt impact with high deceleration shock (15.0 u/s²)
  // baseDamage = 15.0 * worldScale(1.0) * susc(1.0) = 15.0 HP
  // finalDamage = max(0, 15.0 - 2.0) = 13.0 HP -> HP becomes 87
  const impactEvent = {
    absorbedShock: 15.0,
    impactSpeed: 10.0,
    otherEntity: null,
    normalX: -1,
    normalY: 0,
  };

  hero.damageSolverModule.handleImpact(impactEvent, hero, hero.healthModule!, 1.0);
  const hpAfter = hero.healthModule!.currentHp;
  console.log(`Hero HP after impact (15.0 base HP damage - 2.0 HP threshold): ${hpAfter}`);

  if (hpAfter !== 87) {
    throw new Error(`Expected HP to be 87 after 15.0 base - 2.0 thresh, but got ${hpAfter}!`);
  }

  // Low shock where base HP damage <= damageThresholdHp (1.5 base HP <= 2.0 thresh)
  // finalDamage = max(0, 1.5 - 2.0) = 0 HP -> HP remains 87
  const lowImpact = {
    absorbedShock: 1.5,
    impactSpeed: 1.0,
    otherEntity: null,
    normalX: -1,
    normalY: 0,
  };
  // Advance time past cooldown
  await new Promise((r) => setTimeout(r, 70));
  hero.damageSolverModule.handleImpact(lowImpact, hero, hero.healthModule!, 1.0);
  console.log(`Hero HP after low shock (1.5 base HP damage < 2.0 HP thresh clamped to 0): ${hero.healthModule!.currentHp}`);
  if (hero.healthModule!.currentHp !== hpAfter) {
    throw new Error("Low impact below HP threshold should have been clamped to 0 damage!");
  }

  console.log("✅ Collision Damage Solver tests passed successfully!");
}

testImpactDamage().catch((err) => {
  console.error(err);
  process.exit(1);
});
