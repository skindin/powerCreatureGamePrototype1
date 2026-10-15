import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { HealthModule } from "../src/character/HealthModule.js";
import { DamageSolverModule } from "../src/engine/DamageSolverModule.js";

async function runTest() {
  const arena = new Arena();

  // Test 1: Horizontal collision between a projectile and a character at 10 u/s
  const charHorizontal = new Character({
    name: "CharH",
    hasCollider: true,
    colliderRadius: 0.35,
    hasHealth: true,
    healthModule: new HealthModule({ baseMaxHp: 100, currentHp: 100 }),
    damageSolverModule: new DamageSolverModule({ impactSusceptibility: 1.0, damageThresholdHp: 0 }),
    hasMass: true,
    mass: 1.0,
  });
  charHorizontal.position.x = 5.0;
  charHorizontal.position.y = 5.0;
  charHorizontal.position.z = 0.0;
  charHorizontal.velocity.x = 0;
  charHorizontal.velocity.y = 0;

  const rockHorizontal = new GameObject({
    name: "RockH",
    hasCollider: true,
    colliderRadius: 0.35,
    hasMass: true,
    mass: 1.0,
  });
  rockHorizontal.position.x = 5.6; // overlapping: 0.6 < 0.70
  rockHorizontal.position.y = 5.0;
  rockHorizontal.position.z = 0.0;
  rockHorizontal.velocity.x = -10.0; // closing at 10 u/s horizontally
  rockHorizontal.velocity.y = 0;

  CollisionResolver.resolvePairDiscreteTOI(charHorizontal, rockHorizontal, arena, 1 / 60);
  const hpLostHorizontal = 100 - charHorizontal.healthModule!.getCurrentHp();
  console.log(`Horizontal impact damage at 10 u/s: ${hpLostHorizontal.toFixed(2)} HP`);

  // Test 2: Vertical collision where rock is dropped/falling from above onto character at 10 u/s
  const charVertical = new Character({
    name: "CharV",
    hasCollider: true,
    colliderRadius: 0.35,
    hasHealth: true,
    healthModule: new HealthModule({ baseMaxHp: 100, currentHp: 100 }),
    damageSolverModule: new DamageSolverModule({ impactSusceptibility: 1.0, damageThresholdHp: 0 }),
    hasMass: true,
    mass: 1.0,
    hasVerticalPosition: true,
  });
  charVertical.position.x = 10.0;
  charVertical.position.y = 10.0;
  charVertical.position.z = 0.0;
  charVertical.velocity.x = 0;
  charVertical.velocity.y = 0;
  charVertical.verticalVelocity = 0;

  const rockVertical = new GameObject({
    name: "RockV",
    hasCollider: true,
    colliderRadius: 0.35,
    hasMass: true,
    mass: 1.0,
    hasVerticalPosition: true,
  });
  rockVertical.position.x = 10.0; // Directly on top in 2D
  rockVertical.position.y = 10.0;
  rockVertical.position.z = 0.5;  // Falling from above onto character (overlapping vertical volume)
  rockVertical.velocity.x = 0;
  rockVertical.velocity.y = 0;
  rockVertical.verticalVelocity = -10.0; // falling downwards at 10 u/s

  CollisionResolver.resolvePairDiscreteTOI(charVertical, rockVertical, arena, 1 / 60);
  const hpLostVertical = 100 - charVertical.healthModule!.getCurrentHp();
  console.log(`Vertical top-down impact damage at 10 u/s: ${hpLostVertical.toFixed(2)} HP`);

  // Verify damage is non-zero and equal
  if (Math.abs(hpLostVertical - hpLostHorizontal) > 0.01) {
    throw new Error(`Vertical damage (${hpLostVertical.toFixed(2)}) != Horizontal damage (${hpLostHorizontal.toFixed(2)})!`);
  }

  // Verify they slide away from each other horizontally
  const dx = rockVertical.position.x - charVertical.position.x;
  const dy = rockVertical.position.y - charVertical.position.y;
  const distAfter = Math.hypot(dx, dy);
  console.log(`Separation distance between stacked objects after collision: ${distAfter.toFixed(3)} units`);

  if (distAfter < 0.69) {
    throw new Error(`Objects did not slide apart! Distance is ${distAfter}`);
  }

  console.log("SUCCESS: Objects colliding on top of each other deal identical damage and slide apart!");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
