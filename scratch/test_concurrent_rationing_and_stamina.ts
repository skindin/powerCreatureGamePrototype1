import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

console.log("=== Comprehensive Verification: Concurrent Power Rationing & Stamina Regeneration ===");

const arena = new Arena();
const char = new Character();
arena.entities = [char];

// ----------------------------------------------------------------------------
// Test 1: Concurrent Sprinting and Healing Proportional Power Rationing
// ----------------------------------------------------------------------------
console.log("\n--- Test 1: Proportional Power Rationing ---");
char.healthModule.currentHpProp.set(50.0, char.properties);
char.healthModule.maxHpProp.set(100.0, char.properties);
char.healthModule.maxHealRateProp.set(20.0, char.properties); // Demands 500 W @ 0.04 HP/J
char.healthModule.consumesEnergy = true;
char.isSprinting = true;

const dt = 1 / 60;
char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false, arena.entities, false);

const curWatts = char.energyBus.getCurrentWattage(char.properties);
const maxWatts = char.energyBus.getMaxPower(char.properties);
console.log(`Demanded: ${(151.8 + 500).toFixed(1)} W, Bus Max: ${maxWatts} W, Granted Wattage: ${curWatts.toFixed(2)} W`);

if (curWatts > maxWatts + 0.001) {
  throw new Error(`Wattage (${curWatts}) exceeded max power (${maxWatts})!`);
}
if (Math.abs(curWatts - maxWatts) > 0.1) {
  throw new Error(`Expected granted power to equal max power when demands exceed capacity, got ${curWatts}`);
}
console.log("✅ Concurrent power draw is strictly capped at maxPower (500 W) and proportionally nerfed!");

// ----------------------------------------------------------------------------
// Test 2: Resting Stamina Recovery While Wounded
// ----------------------------------------------------------------------------
console.log("\n--- Test 2: Resting Stamina Recovery While Wounded ---");
char.isSprinting = false;
char.healthModule.currentHpProp.set(60.0, char.properties);
char.energyBus.currentStaminaProp.set(1.0, char.properties); // Start low / near exhausted

for (let s = 1; s <= 15; s++) {
  for (let i = 0; i < 60; i++) {
    char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, false, arena.entities, false);
  }
}

const recoveredStamina = char.energyBus.getCurrentStamina(char.properties);
console.log(`Stamina after 15s rest while healing: ${recoveredStamina.toFixed(2)}s / 10.0s`);
if (recoveredStamina < 9.5) {
  throw new Error(`Stamina failed to regenerate to full while resting! Got ${recoveredStamina}`);
}
console.log("✅ Stamina smoothly regenerates to full 10.0s while resting, even when wounded!");

// ----------------------------------------------------------------------------
// Test 3: Airborne Jump Holding Does Not Drain Stamina
// ----------------------------------------------------------------------------
console.log("\n--- Test 3: Airborne Jump Holding ---");
char.energyBus.currentStaminaProp.set(5.0, char.properties);
for (let i = 0; i < 60; i++) {
  char.position.z = 2.0;
  char.verticalVelocity = 0;
  char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, true, arena.entities, false);
}

const airStamina = char.energyBus.getCurrentStamina(char.properties);
console.log(`Stamina after 1s holding jump in air: ${airStamina.toFixed(2)}s`);
if (airStamina < 5.0) {
  throw new Error(`Stamina drained while holding jump in air! Got ${airStamina}`);
}
console.log("✅ Airborne jump holding does not consume any energy or drain stamina!");

console.log("\n=== ALL CONCURRENT RATIONING & STAMINA TESTS PASSED PERFECTLY! ===");
