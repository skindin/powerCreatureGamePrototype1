import { EnergyBus, ABILITY_METADATA } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";
import { ObjectPropertiesRegistry } from "../src/engine/properties/DynamicProperty.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== Testing Ability Naming, Two-Tier Block Sizing, & Exhaustion Tick ===");

// 1. Verify Ability Names in Metadata
assert(ABILITY_METADATA.sprint.name === "Sprint", "sprint name is 'Sprint'");
assert(ABILITY_METADATA.walk.name === "Walk", "walk name is 'Walk'");
assert(ABILITY_METADATA.jump.name === "Jump", "jump name is 'Jump'");
assert(ABILITY_METADATA.health_regen.name === "Heal", "health_regen name is 'Heal'");
console.log("✓ Ability names in metadata correctly set to 'Sprint', 'Walk', 'Jump', 'Heal'");

// 2. Test concurrent allocation with Jump (full-power) preempting Sprint and Heal (partial-power)
const registry = new ObjectPropertiesRegistry();
const pool = new EnergyPool({ baseMaxEnergy: 10000 });
const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });

// Sprint draws 152 W (partial power allowed)
bus.requestPower(152, 0.016, pool, registry, false, "sprint", true);
// Heal draws 250 W (partial power allowed)
bus.requestPower(250, 0.016, pool, registry, false, "health_regen", true);

let allocs = bus.getActiveAllocations(registry);
assert(allocs.length === 2, "2 continuous abilities active");
const sprintAlloc = allocs.find(a => a.id === "sprint")!;
const healAlloc = allocs.find(a => a.id === "health_regen")!;
assert(Math.abs(sprintAlloc.grantedWatts - 152) < 0.1, "Sprint granted full 152 W");
assert(Math.abs(healAlloc.grantedWatts - 250) < 0.1, "Heal granted full 250 W");
console.log("✓ Sprint and Heal both receive full power when under 500W cap");

// Now trigger Jump burst (224 Joules / Watts, allowPartialPower = false)
const jumpRes = bus.requestInstantBurst({
  abilityId: "jump",
  demandedJoules: 224,
  allowPartialPower: false,
  pool,
  registry
});
assert(jumpRes.granted, "Jump granted full power");

// Readjusted allocations:
allocs = bus.getActiveAllocations(registry);
const jumpAlloc = allocs.find(a => a.id === "jump")!;
assert(!!jumpAlloc, "Jump is in active allocations");
assert(jumpAlloc.allowPartialPower === false, "Jump is full power (!allowPartialPower)");
assert(Math.abs(jumpAlloc.grantedWatts - 224) < 0.1, "Jump granted exact 224 W demanded");

// Verify Sprint and Heal were readjusted to share the remaining 276 W:
const readjustedSprint = allocs.find(a => a.id === "sprint")!;
const readjustedHeal = allocs.find(a => a.id === "health_regen")!;
const remainingHeadroom = 500 - 224; // 276 W
const expectedSprint = (152 / (152 + 250)) * remainingHeadroom; // ~104.3 W
const expectedHeal = (250 / (152 + 250)) * remainingHeadroom; // ~171.7 W

assert(Math.abs(readjustedSprint.grantedWatts - expectedSprint) < 1.0, `Sprint readjusted to ~${expectedSprint.toFixed(1)}W (got ${readjustedSprint.grantedWatts.toFixed(1)}W)`);
assert(Math.abs(readjustedHeal.grantedWatts - expectedHeal) < 1.0, `Heal readjusted to ~${expectedHeal.toFixed(1)}W (got ${readjustedHeal.grantedWatts.toFixed(1)}W)`);
console.log(`✓ When Jump demands 224W full power, Sprint readjusts to ${readjustedSprint.grantedWatts.toFixed(1)}W and Heal readjusts to ${readjustedHeal.grantedWatts.toFixed(1)}W`);

// 3. Exhaustion & Recovery Threshold
bus.currentStaminaProp.set(0, registry);
bus.isExhausted = true;
assert(bus.isExhausted === true, "Bus is marked exhausted");
const recoveryThresholdStamina = bus.getMaxStamina(registry) * bus.recoveryThresholdRatio;
assert(recoveryThresholdStamina === 2.0, "Recovery threshold is 20% of max stamina (2.0s)");

// Recover to 1.5s (still exhausted)
bus.currentStaminaProp.set(1.5, registry);
bus.update(0.01, pool, registry);
assert(bus.isExhausted === true, "Still exhausted at 1.5s (< 2.0s)");

// Recover past 2.0s (exhaustion clears)
bus.currentStaminaProp.set(2.1, registry);
bus.update(0.01, pool, registry);
assert(bus.isExhausted === false, "Exhaustion cleared at 2.1s (>= 2.0s)");
console.log("✓ Exhaustion state properly clears once stamina recovers past 20% threshold");

console.log("\n=== ALL TESTS PASSED! ===");
