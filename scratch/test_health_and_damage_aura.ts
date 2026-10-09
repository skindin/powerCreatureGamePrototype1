import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { DamageAuraModule } from "../src/engine/DamageAuraModule.js";
import { HealthModule } from "../src/character/HealthModule.js";
import { Arena } from "../src/engine/Arena.js";

function testHealthAndDamageAura() {
  console.log("=== Running Health & Damage Aura Integration Tests ===");

  const arena = new Arena(20, 14, 1.0);
  const hero = new Character("hero", { x: 5.0, y: 5.0, z: 0 }, 1.0);
  hero.spawnPos = { x: 5.0, y: 5.0, z: 0 };

  if (!hero.healthModule) {
    throw new Error("Hero does not have a default healthModule!");
  }

  console.log(`Initial hero HP: ${hero.healthModule.currentHp} / ${hero.healthModule.maxHp}`);
  if (hero.healthModule.currentHp !== 100 || hero.healthModule.maxHp !== 100) {
    throw new Error(`Unexpected initial HP values: ${hero.healthModule.currentHp}`);
  }

  // 1. Manual damage and heal
  hero.healthModule.takeDamage(30, hero.properties);
  console.log(`After 30 damage: HP = ${hero.healthModule.currentHp}`);
  if (Math.abs(hero.healthModule.currentHp - 70) > 0.001) {
    throw new Error(`Expected 70 HP, got ${hero.healthModule.currentHp}`);
  }

  hero.healthModule.heal(15, hero.properties);
  console.log(`After 15 heal: HP = ${hero.healthModule.currentHp}`);
  if (Math.abs(hero.healthModule.currentHp - 85) > 0.001) {
    throw new Error(`Expected 85 HP, got ${hero.healthModule.currentHp}`);
  }

  // 2. Passive regeneration over 1 second (heal rate = 10 HP/s)
  hero.healthModule.update(1.0, hero, arena);
  console.log(`After 1s passive regen: HP = ${hero.healthModule.currentHp}`);
  if (Math.abs(hero.healthModule.currentHp - 95) > 0.001) {
    throw new Error(`Expected 95 HP after 1s regen, got ${hero.healthModule.currentHp}`);
  }

  // Regen caps at maxHp
  hero.healthModule.update(1.0, hero, arena);
  console.log(`After another 1s regen: HP = ${hero.healthModule.currentHp} (capped at maxHp)`);
  if (Math.abs(hero.healthModule.currentHp - 100) > 0.001) {
    throw new Error(`Expected 100 HP, got ${hero.healthModule.currentHp}`);
  }

  // 3. Active Damage Aura test
  const hazard = new GameObject({
    id: "hazard-1",
    position: { x: 5.0, y: 5.0, z: 0 },
    damageAuraModule: new DamageAuraModule({
      damageRadius: 2.0,
      damageRate: 20.0,
    }),
  });

  // Hero is at (5, 5, 0), distance = 0 <= 2.0.
  // Over 0.5s: damage = 20 * 0.5 = 10 HP.
  // Meanwhile hero's passive regen is 10 HP/s * 0.5 = 5 HP.
  // Net delta = -5 HP -> from 100 to 95.
  hazard.damageAuraModule.update(0.5, hazard, [hero]);
  hero.healthModule.update(0.5, hero, arena);

  console.log(`After 0.5s in Damage Aura (damage 10, regen 5): HP = ${hero.healthModule.currentHp}`);
  if (Math.abs(hero.healthModule.currentHp - 95) > 0.001) {
    throw new Error(`Expected 95 HP, got ${hero.healthModule.currentHp}`);
  }

  // Move hero far outside aura (dx = 10)
  hero.position.x = 15.0;
  hazard.damageAuraModule.update(0.5, hazard, [hero]);
  console.log(`Hero outside aura: HP remains unchanged by aura = ${hero.healthModule.currentHp}`);
  if (Math.abs(hero.healthModule.currentHp - 95) > 0.001) {
    throw new Error(`Expected HP to remain 95 outside aura`);
  }

  // 4. Fatal damage & respawn loop
  hero.position.x = 5.0;
  hero.velocity.x = 8.0;
  hero.velocity.y = 4.0;
  hero.isActivelyWalking = true;
  hero.isSprinting = true;

  // Inflict fatal damage (150 damage on 95 HP)
  hero.healthModule.takeDamage(150, hero.properties);
  console.log(`After fatal damage (pre-tick): HP = ${hero.healthModule.currentHp}`);
  if (hero.healthModule.currentHp !== 0) {
    throw new Error(`Expected 0 HP after fatal damage, got ${hero.healthModule.currentHp}`);
  }

  // Ticking health triggers dieAndRespawn
  hero.healthModule.update(0.016, hero, arena);
  console.log(`After respawn: HP = ${hero.healthModule.currentHp}, pos = (${hero.position.x}, ${hero.position.y}), vel = (${hero.velocity.x}, ${hero.velocity.y})`);

  if (hero.healthModule.currentHp !== 100) {
    throw new Error(`Expected full 100 HP after respawn, got ${hero.healthModule.currentHp}`);
  }
  const isOneOfFourSpawns = HealthModule.RESPAWN_SPAWNS.some(
    (s) => Math.abs(s.x - hero.position.x) < 0.001 && Math.abs(s.y - hero.position.y) < 0.001
  );
  if (!isOneOfFourSpawns) {
    throw new Error(`Expected snap to one of four online clearings, got (${hero.position.x}, ${hero.position.y}, ${hero.position.z})`);
  }
  if (hero.velocity.x !== 0 || hero.velocity.y !== 0) {
    throw new Error(`Expected velocity zeroed on death, got (${hero.velocity.x}, ${hero.velocity.y})`);
  }

  console.log("✅ All Health & Damage Aura tests passed successfully!");
}

testHealthAndDamageAura();
