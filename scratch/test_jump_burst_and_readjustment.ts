import { EnergyBus, ABILITY_METADATA } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";
import { ObjectPropertiesRegistry } from "../src/engine/properties/DynamicProperty.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== Testing Jump Burst Full-Power Readjustment & Sprinting/Walking Labels ===");

const registry = new ObjectPropertiesRegistry();
const pool = new EnergyPool({ baseMaxEnergy: 10000, maxEnergy: 10000 });
const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });

// 1. Verify Names in ABILITY_METADATA
assert(ABILITY_METADATA.sprint.name === "Sprinting", "Sprint name is 'Sprinting'");
assert(ABILITY_METADATA.walk.name === "Walking", "Walk name is 'Walking'");
console.log("✓ ABILITY_METADATA labels verified: Sprinting & Walking");

// 2. Verify dynamic locomotion resolution
bus.activeLocomotionId = "sprint";
bus.requestPower(151.8, 0.016, pool, registry, false, "locomotion", true);
let allocs = bus.getActiveAllocations();
assert(allocs.length === 1, "1 active allocation");
assert(allocs[0].id === "sprint", "Locomotion resolved to 'sprint' while sprinting");
assert(allocs[0].name === "Sprinting", "Locomotion displays as 'Sprinting'");
console.log("✓ Locomotion demand while sprinting correctly registered as 'Sprinting'");

bus.activeLocomotionId = "walk";
bus.requestPower(68.6, 0.016, pool, registry, false, "locomotion", false);
allocs = bus.getActiveAllocations();
const walkAlloc = allocs.find(a => a.id === "walk");
assert(!!walkAlloc, "Locomotion resolved to 'walk' while walking");
assert(walkAlloc!.name === "Walking", "Locomotion displays as 'Walking'");
console.log("✓ Locomotion demand while walking correctly registered as 'Walking'");

// 3. Clean slate for the critical user scenario:
// Character is sprinting (151.8 W, partial) and healing (250 W, partial)
bus.clearDemands();
const bus2 = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
bus2.activeLocomotionId = "sprint";

bus2.beginTick();
// Sprint starts first (order 1)
bus2.requestPower(151.8, 0.016, pool, registry, false, "sprint", true);
// Heal starts second (order 2)
bus2.requestPower(250.0, 0.016, pool, registry, false, "health_regen", true);

allocs = bus2.getActiveAllocations();
assert(allocs.length === 2, "2 active allocations");
assert(allocs[0].id === "sprint", "Sprint is first (order 1)");
assert(allocs[1].id === "health_regen", "Heal is second (order 2)");
assert(Math.abs(allocs[0].grantedWatts - 151.8) < 0.1, "Sprint gets full 151.8 W initially");
assert(Math.abs(allocs[1].grantedWatts - 250.0) < 0.1, "Heal gets full 250 W initially");
console.log(`✓ Before jump: Sprinting=${allocs[0].grantedWatts.toFixed(1)}W, Heal=${allocs[1].grantedWatts.toFixed(1)}W`);

// 4. Character starts jumping (224 J burst, full energy, allowPartialPower: false)
const jumpRes = bus2.requestInstantBurst({
  abilityId: "jump",
  demandedJoules: 224,
  allowPartialPower: false,
  pool,
  registry,
});
assert(jumpRes.granted, "Jump burst granted");
assert(Math.abs(jumpRes.grantedJoules - 224) < 0.1, "Jump granted full 224 Joules");

// Query active allocations immediately!
allocs = bus2.getActiveAllocations();
assert(allocs.length === 3, "3 active allocations after jump");

// Stacking order MUST be left-to-right by activation: Sprint (1) -> Heal (2) -> Jump (3)
assert(allocs[0].id === "sprint", "Sprint is on the left (order 1)");
assert(allocs[1].id === "health_regen", "Heal is in the middle (order 2)");
assert(allocs[2].id === "jump", "Jump is on the right (order 3)");

// Full power Jump MUST claim its full 224 W!
assert(Math.abs(allocs[2].grantedWatts - 224) < 0.1, `Jump granted full 224 W (got ${allocs[2].grantedWatts})`);

// Prior blocks (Sprint and Heal) MUST readjust and downscale to share remaining headroom:
// Remaining headroom = 500 - 224 = 276 W.
// Total demanded = 151.8 + 250 = 401.8 W.
// Expected Sprint = (151.8 / 401.8) * 276 = ~104.3 W.
// Expected Heal = (250 / 401.8) * 276 = ~171.7 W.
const expectedSprintWatts = (151.8 / 401.8) * 276;
const expectedHealWatts = (250.0 / 401.8) * 276;

assert(Math.abs(allocs[0].grantedWatts - expectedSprintWatts) < 0.5, `Sprint readjusted to ${expectedSprintWatts.toFixed(1)}W (got ${allocs[0].grantedWatts.toFixed(1)}W)`);
assert(Math.abs(allocs[1].grantedWatts - expectedHealWatts) < 0.5, `Heal readjusted to ${expectedHealWatts.toFixed(1)}W (got ${allocs[1].grantedWatts.toFixed(1)}W)`);

const totalWatts = allocs[0].grantedWatts + allocs[1].grantedWatts + allocs[2].grantedWatts;
assert(Math.abs(totalWatts - 500) < 0.1, `Total power perfectly equals 500 W (got ${totalWatts.toFixed(2)}W)`);

const sprintWidthPct = (allocs[0].grantedWatts / 500) * 100;
const healWidthPct = (allocs[1].grantedWatts / 500) * 100;
const jumpWidthPct = (allocs[2].grantedWatts / 500) * 100;

console.log(`✓ Readjustment successful during Jump:`);
console.log(`  - Left block (Sprinting): ${allocs[0].grantedWatts.toFixed(1)}W (${sprintWidthPct.toFixed(1)}% width)`);
console.log(`  - Middle block (Heal): ${allocs[1].grantedWatts.toFixed(1)}W (${healWidthPct.toFixed(1)}% width)`);
console.log(`  - Right block (Jump): ${allocs[2].grantedWatts.toFixed(1)}W (${jumpWidthPct.toFixed(1)}% width)`);
console.log(`  - Sum of widths = ${(sprintWidthPct + healWidthPct + jumpWidthPct).toFixed(1)}% (Jump gets its full demanded width!)`);

// 5. Jump burst expires after 0.35s
bus2.update(0.4, pool, registry);
allocs = bus2.getActiveAllocations();
assert(allocs.length === 2, "2 active allocations after jump expires");
assert(Math.abs(allocs[0].grantedWatts - 151.8) < 0.1, "Sprint expands back to 151.8 W");
assert(Math.abs(allocs[1].grantedWatts - 250.0) < 0.1, "Heal expands back to 250.0 W");
console.log(`✓ After jump expires: Sprinting and Heal restore full capacity`);

console.log("\n=== ALL JUMP BURST & READJUSTMENT TESTS PASSED! ===");
