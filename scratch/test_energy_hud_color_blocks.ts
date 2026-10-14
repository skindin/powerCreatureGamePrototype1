import { EnergyBus, ABILITY_METADATA } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";
import { ObjectPropertiesRegistry } from "../src/engine/properties/DynamicProperty.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== Testing EnergyHud Color Blocks & Active Allocations Architecture ===");

const registry = new ObjectPropertiesRegistry();
const pool = new EnergyPool({ baseMaxEnergy: 10000, maxEnergy: 10000 });
const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });

// 1. Initially idle: no active allocations
assert(bus.getActiveAllocations().length === 0, "Initially 0 active allocations");
console.log("✓ Initial state idle with 0 allocations");

// 2. Sprint requests 152 W (partial power)
bus.beginTick();
const sprintWatts = bus.requestPower(152, 0.016, pool, registry, false, "sprint", true);
assert(Math.abs(sprintWatts - 152) < 0.1, "Sprint gets full 152 W");

let allocs = bus.getActiveAllocations();
assert(allocs.length === 1, "1 active allocation");
assert(allocs[0].id === "sprint", "Allocation id is sprint");
assert(allocs[0].color === ABILITY_METADATA.sprint.color, `Sprint color matches ${ABILITY_METADATA.sprint.color}`);
assert(allocs[0].allowPartialPower === true, "Sprint is partial power");
assert(Math.abs(allocs[0].grantedWatts - 152) < 0.1, "Sprint granted 152 W");
console.log("✓ Sprint allocation registered with correct color and watts");

// 3. Heal requests 250 W concurrently (partial power)
const healWatts = bus.requestPower(250, 0.016, pool, registry, false, "health_regen", true);
assert(Math.abs(healWatts - 250) < 0.1, "Heal gets full 250 W");
allocs = bus.getActiveAllocations();
assert(allocs.length === 2, "2 active allocations");
console.log("✓ Heal allocation registered alongside sprint");

// 4. Climb requests 260 W (Full power: allowPartialPower = false)
// Two-tier priority: Climb takes precedence, sprint and heal downscale!
bus.beginTick();
const climbWatts = bus.requestPower(260, 0.016, pool, registry, false, "climb", false);
const sprintWattsDownscaled = bus.requestPower(152, 0.016, pool, registry, false, "sprint", true);
const healWattsDownscaled = bus.requestPower(250, 0.016, pool, registry, false, "health_regen", true);

assert(Math.abs(climbWatts - 260) < 0.1, "Climb gets full 260 W");
assert(sprintWattsDownscaled < 152, "Sprint downscaled");
assert(healWattsDownscaled < 250, "Heal downscaled");

allocs = bus.getActiveAllocations();
assert(allocs.length === 3, "3 active allocations");

// Verify Left-to-Right Activation Ordering: Sprint (order 1) -> Heal (order 2) -> Climb (order 3)
assert(allocs[0].id === "sprint", "Sprint is first in allocations as it was activated first");
assert(allocs[1].id === "health_regen", "Heal is second in allocations as it was activated second");
assert(allocs[2].id === "climb", "Climb is third in allocations as it was activated third");
assert(allocs[2].color === ABILITY_METADATA.climb.color, "Climb has purple color");

// Verify downscaling fraction
const sprintAlloc = allocs.find(a => a.id === "sprint")!;
const healAlloc = allocs.find(a => a.id === "health_regen")!;
assert(sprintAlloc.fraction < 0.99, "Sprint has downscaled fraction");
assert(healAlloc.fraction < 0.99, "Heal has downscaled fraction");
console.log(`✓ Precedence verified: ${allocs[0].name} [Full] -> ${allocs[1].name} (${Math.round(allocs[1].fraction * 100)}%) -> ${allocs[2].name} (${Math.round(allocs[2].fraction * 100)}%)`);

// 5. Instant Burst action (Jump): 224 Joules
const jumpBurst = bus.requestInstantBurst({
  abilityId: "jump",
  demandedJoules: 224,
  pool,
  registry,
});
assert(jumpBurst.granted, "Jump burst granted");

allocs = bus.getActiveAllocations();
const jumpAlloc = allocs.find(a => a.id === "jump");
assert(!!jumpAlloc, "Jump burst is present in active allocations");
assert(jumpAlloc!.isBurst === true, "Jump is flagged as burst");
assert(jumpAlloc!.color === ABILITY_METADATA.jump.color, "Jump has pink color");
assert(jumpAlloc!.burstTimer! > 0, "Jump has burst timer set for visual hold");
console.log("✓ Jump instant burst correctly added to allocations with burst timer and pink color");

// 6. Burst decay: after 0.6s, jump burst allocation expires
bus.update(0.6, pool, registry);
allocs = bus.getActiveAllocations();
assert(!allocs.find(a => a.id === "jump"), "Jump burst expired after decay timer");
console.log("✓ Burst allocation cleanly decays and expires");

console.log("\n=== ALL COLOR BLOCKS & ALLOCATIONS TESTS PASSED SUCCESSFULLY! ===");
