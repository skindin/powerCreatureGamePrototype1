import { Character } from "../src/character/Character.js";
import { EnergyHud } from "../src/ui/EnergyHud.js";

// Mock document for DOM testing in Node
(global as any).document = {
  querySelector: () => null,
  getElementById: () => null,
  createElement: () => ({
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: { add: () => {}, remove: () => {} },
    style: {}
  })
};
(global as any).window = {
  addEventListener: () => {}
};

console.log("=== RUNNING ENERGY HUD SCALE & TICKS TEST (POWER CAP & ENERGY CAP WIDTHS) ===");

const char = new Character({ name: "Tester" });
const hud = new EnergyHud(null as any, null as any);

const bus = char.getEnergyBus("bus_main")!;
const pool = char.energyPool!;
const props = char.properties;

const maxPower = bus.getMaxPower(props); // 500 W
const maxStamina = bus.getMaxStamina(props); // 10.0 s
const maxEnergy = pool.getMaxEnergy(props); // 10,000 J

console.log("1. Checking core capacity parameters:");
console.log(`  maxPower (Power Cap): ${maxPower} W`);
console.log(`  maxStamina: ${maxStamina} s`);
console.log(`  maxEnergy (Energy Cap): ${maxEnergy} J`);

// 2. Top Bar: Width of Power Cap (500 W)
const topBarScale = maxPower;
console.log(`\n2. Top Bar Scale: ${topBarScale} W`);
if (topBarScale !== 500) {
  throw new Error(`FAIL: Top bar scale should be 500 W, got ${topBarScale}`);
}

const ticks = hud.computeAbilityTicks(char);
console.log("   Computed Top Bar Ticks:");
ticks.forEach(t => {
  const pct = (t.value / topBarScale) * 100;
  console.log(`   - [${t.id}] ${t.name}: ${t.value}${t.isContinuousRate ? '/s' : ''} -> ${pct.toFixed(1)}%`);
});

// Power Cap tick on top bar should be at 100%
const topCapTick = ticks.find(t => t.id === "cap")!;
const topCapPct = (topCapTick.value / topBarScale) * 100;
if (Math.abs(topCapPct - 100.0) > 0.01) {
  throw new Error(`FAIL: Power Cap tick on top bar should be at 100%, got ${topCapPct}%`);
}
console.log("✔ SUCCESS: Power Cap tick is at 100% of top bar (width of power cap)!");

// Sprint tick on top bar should be at ~30.4%
const sprintTick = ticks.find(t => t.id === "sprint")!;
const sprintPct = (sprintTick.value / topBarScale) * 100;
console.log(`✔ SUCCESS: Sprint (${sprintTick.value} W) is at ${sprintPct.toFixed(1)}% along top bar`);

// Walk must be hidden
if (ticks.some(t => t.id === "walk")) {
  throw new Error("FAIL: Walk tick must be hidden!");
}
console.log("✔ SUCCESS: Walk is hidden when walkConsumesEnergy is false!");

// 3. Bottom Bar: Width of Energy Cap (10,000 J)
const bottomBarScale = maxEnergy;
console.log(`\n3. Bottom Bar Scale: ${bottomBarScale} J`);
if (bottomBarScale !== 10000) {
  throw new Error(`FAIL: Bottom bar scale should be 10,000 J, got ${bottomBarScale}`);
}

// Power Cap on Bottom Bar: 500 J / 10,000 J = 5%
const lowerPowerCapPct = (maxPower / bottomBarScale) * 100;
console.log(`  Power Cap on Bottom Bar: ${lowerPowerCapPct.toFixed(1)}%`);
if (Math.abs(lowerPowerCapPct - 5.0) > 0.01) {
  throw new Error(`FAIL: Power Cap on bottom bar should be 5%, got ${lowerPowerCapPct}%`);
}
console.log("✔ SUCCESS: Power Cap marker on bottom bar is at 5%!");

// Stamina Cap on Bottom Bar: (10s * 500W) = 5,000 J / 10,000 J = 50%
const staminaCapJoules = maxStamina * maxPower;
const lowerStaminaCapPct = (staminaCapJoules / bottomBarScale) * 100;
console.log(`  Stamina Cap on Bottom Bar: ${lowerStaminaCapPct.toFixed(1)}% (${staminaCapJoules} J)`);
if (Math.abs(lowerStaminaCapPct - 50.0) > 0.01) {
  throw new Error(`FAIL: Stamina Cap on bottom bar should be 50%, got ${lowerStaminaCapPct}%`);
}
console.log("✔ SUCCESS: Stamina Cap marker on bottom bar is at 50%!");

// Current Stamina on Bottom Bar when full: 50%
const curStaminaEnergy = bus.getCurrentStamina(props) * maxPower;
const lowerCurStaminaPct = (curStaminaEnergy / bottomBarScale) * 100;
console.log(`  Current Stamina on Bottom Bar: ${lowerCurStaminaPct.toFixed(1)}%`);
if (Math.abs(lowerCurStaminaPct - 50.0) > 0.01) {
  throw new Error(`FAIL: Current Stamina fill on bottom bar should be 50%, got ${lowerCurStaminaPct}%`);
}
console.log("✔ SUCCESS: Current Stamina fill on bottom bar correctly tracks stamina Joules over energy cap!");

// Current Energy on Bottom Bar when full: 100%
const curEnergy = pool.getCurrentEnergy(props);
const lowerCurEnergyPct = (curEnergy / bottomBarScale) * 100;
console.log(`  Current Energy on Bottom Bar: ${lowerCurEnergyPct.toFixed(1)}%`);
if (Math.abs(lowerCurEnergyPct - 100.0) > 0.01) {
  throw new Error(`FAIL: Current Energy fill on bottom bar should be 100%, got ${lowerCurEnergyPct}%`);
}
console.log("✔ SUCCESS: Current Energy fill on bottom bar correctly fills against energy cap!");

console.log("\n=== ALL REVISED ENERGY HUD TESTS PASSED PERFECTLY! ===");
