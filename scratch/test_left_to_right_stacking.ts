import { EnergyBus, ABILITY_METADATA } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";
import { ObjectPropertiesRegistry } from "../src/engine/properties/DynamicProperty.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== Testing Left-to-Right Stacking & Activation Order ===");

const registry = new ObjectPropertiesRegistry();
const pool = new EnergyPool({ baseMaxEnergy: 10000, maxEnergy: 10000 });
const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });

// 1. Start sprinting first
bus.beginTick();
const sprintWatts = bus.requestPower(152, 0.016, pool, registry, false, "sprint", true);
assert(Math.abs(sprintWatts - 152) < 0.1, "Sprint gets full 152 W");

let allocs = bus.getActiveAllocations();
assert(allocs.length === 1, "1 active allocation");
assert(allocs[0].id === "sprint", "Sprint is first");
console.log(`✓ Sprint registered at order ${allocs[0].order}`);

// 2. While sprinting, jump!
const jumpBurst = bus.requestInstantBurst({
  abilityId: "jump",
  demandedJoules: 224,
  pool,
  registry,
});
assert(jumpBurst.granted, "Jump burst granted");

allocs = bus.getActiveAllocations();
assert(allocs.length === 2, "2 active allocations");

// Verify that Sprint is on the LEFT (index 0) and Jump is to the RIGHT (index 1)
assert(allocs[0].id === "sprint", `Sprint is on the LEFT (index 0, order ${allocs[0].order})`);
assert(allocs[1].id === "jump", `Jump is to the RIGHT (index 1, order ${allocs[1].order})`);
assert(allocs[0].order < allocs[1].order, `Sprint order (${allocs[0].order}) < Jump order (${allocs[1].order})`);
console.log(`✓ Verified left-to-right stacking: [${allocs[0].name} (left)] -> [${allocs[1].name} (right)]`);

// 3. Test reverse: if jump happens first, then sprint
const bus2 = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });
const jumpFirst = bus2.requestInstantBurst({
  abilityId: "jump",
  demandedJoules: 224,
  pool,
  registry,
});
assert(jumpFirst.granted, "Jump first granted");

bus2.beginTick();
bus2.requestPower(152, 0.016, pool, registry, false, "sprint", true);

const allocs2 = bus2.getActiveAllocations();
assert(allocs2.length === 2, "2 active allocations");
assert(allocs2[0].id === "jump", "Jump is on the LEFT because it was triggered first");
assert(allocs2[1].id === "sprint", "Sprint is to the RIGHT because it was triggered second");
console.log(`✓ Verified reverse activation: [${allocs2[0].name} (left)] -> [${allocs2[1].name} (right)]`);

console.log("\n=== ALL LEFT-TO-RIGHT STACKING TESTS PASSED! ===");
