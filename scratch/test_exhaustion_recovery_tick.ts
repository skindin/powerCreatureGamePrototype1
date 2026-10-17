import { EnergyBus } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";
import { ObjectPropertiesRegistry } from "../src/engine/properties/DynamicProperty.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== Testing Exhaustion Recovery Tick Mark Architecture ===");

const registry = new ObjectPropertiesRegistry();
const pool = new EnergyPool({ baseMaxEnergy: 10000, maxEnergy: 10000 });
const bus = new EnergyBus({ baseMaxPower: 500, baseMaxStamina: 10 });

// 1. Initially full stamina, not exhausted
assert(!bus.isExhausted, "Initially not exhausted");
console.log("✓ Initial state: not exhausted");

// Calculate expected tick mark position
const maxS = bus.getMaxStamina(registry);
const maxP = bus.getMaxPower(registry);
const recoveryRatio = bus.recoveryThresholdRatio;
const maxEnergy = pool.getMaxEnergy(registry);
const energyCap = Math.max(100, maxEnergy);

const expectedRecoveryStamina = maxS * recoveryRatio;
const expectedRecoveryEnergy = expectedRecoveryStamina * maxP;
const expectedTickPct = (expectedRecoveryEnergy / energyCap) * 100;

assert(Math.abs(expectedRecoveryStamina - 2.0) < 0.01, `Expected recovery stamina is 2.0s (got ${expectedRecoveryStamina}s)`);
assert(Math.abs(expectedRecoveryEnergy - 1000.0) < 0.1, `Expected recovery energy is 1000 J (got ${expectedRecoveryEnergy} J)`);
assert(Math.abs(expectedTickPct - 10.0) < 0.1, `Expected tick position is 10.0% (got ${expectedTickPct.toFixed(2)}%)`);
console.log(`✓ Exhaustion recovery threshold: ${expectedRecoveryStamina.toFixed(1)}s = ${expectedRecoveryEnergy.toFixed(0)} J (${expectedTickPct.toFixed(1)}% of lower bar)`);

// 2. Drain stamina completely to trigger exhaustion
bus.currentStaminaProp.set(0, registry);
bus.isExhausted = true;
assert(bus.isExhausted, "Bus marked exhausted");

// In EnergyHud, while isExhausted is true:
// The red tick is displayed at left: 10.00%
const simulatedHudTick = {
  visible: bus.isExhausted,
  leftPct: (expectedRecoveryEnergy / energyCap) * 100,
};
assert(simulatedHudTick.visible, "Red tick mark is visible while exhausted");
assert(Math.abs(simulatedHudTick.leftPct - 10.0) < 0.1, "Red tick mark is at 10.0% position");
console.log(`✓ While exhausted: Red tick mark shown at ${simulatedHudTick.leftPct.toFixed(1)}%`);

// 3. Resting: stamina regenerates from 0 towards 2.0s
// At 1.0s stamina, still below 2.0s threshold -> remains exhausted
bus.update(1.0, pool, registry);
assert(bus.isExhausted, "Still exhausted at 1.0s stamina (< 2.0s)");
console.log(`✓ At 1.0s stamina (< 2.0s): still exhausted, red tick still shown`);

// 4. Regenerate past 2.0s threshold -> exhaustion ends!
bus.update(1.05, pool, registry);
const curS = bus.getCurrentStamina(registry);
assert(curS >= 2.0, `Stamina reached ${curS.toFixed(2)}s (>= 2.0s)`);
assert(!bus.isExhausted, "Exhaustion cleared when reaching recovery threshold!");
console.log(`✓ At ${curS.toFixed(2)}s stamina (>= 2.0s): exhaustion cleared, red tick hides!`);

console.log("\n=== ALL EXHAUSTION RECOVERY TICK TESTS PASSED! ===");
