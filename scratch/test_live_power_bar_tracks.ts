import { Character } from "../src/character/Character.js";
import { EnergyHud } from "../src/ui/EnergyHud.js";

// Mock document for DOM testing in Node
(global as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};
(global as any).document = {
  querySelector: () => null,
  getElementById: () => null,
  createElement: () => ({
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {} },
    style: {}
  })
};

console.log("=== Testing Power Usage Bar and Jump Trigger ===");

const char = new Character({
  x: 5,
  y: 5,
  color: "#38bdf8",
  name: "Hero"
});

const bus = char.getEnergyBus("bus_main")!;
const pool = char.energyPool!;
const props = char.properties;

// Ensure 500 W and 10,000 J
console.log(`Max Power: ${bus.getMaxPower(props)} W`);
console.log(`Max Energy: ${pool.getMaxEnergy(props)} J`);

const hud = new EnergyHud();
(hud as any).getTargetCharacter = () => char;

// Mock DOM elements
const upperLivePowerEl: any = { style: { width: "0%", display: "none" } };
const lowerLivePowerEl: any = { style: { width: "0%", display: "none" } };
(hud as any).container = { style: { display: "block" } };
(hud as any).livePowerFillEl = upperLivePowerEl;
(hud as any).lowerLivePowerFillEl = lowerLivePowerEl;

// 1. Initial Rest
hud.update(0.016);
console.log("\n1. Initial Rest State:");
console.log(`   hud.displayedWatts: ${hud.displayedWatts} W`);
console.log(`   upperLivePowerEl.style.width: ${upperLivePowerEl.style.width}`);
console.log(`   upperLivePowerEl.style.display: ${upperLivePowerEl.style.display}`);
if (hud.displayedWatts !== 0) throw new Error("Expected 0 displayedWatts at rest");

// 2. Perform a jump (takes 500 W)
console.log("\n2. Perform Jump (Takeoff):");
char.jump();
console.log(`   bus.recentPeakWattage right after jump: ${bus.recentPeakWattage} W`);
if (bus.recentPeakWattage < 450) throw new Error(`Expected jump power spike >= 450 W, got ${bus.recentPeakWattage}`);

// Simulate a multi-tick accumulator step where tick 1 updates bus, then tick 2 runs with 0 power
bus.update(0.016, pool, props); // Tick 1 (published 500 W)
bus.update(0.016, pool, props); // Tick 2 (idle in air, 0 W)

const peakRead = bus.getCurrentWattage(props);
console.log(`   bus.getCurrentWattage() after multi-tick: ${peakRead} W`);
if (peakRead < 450) throw new Error("Expected getCurrentWattage to preserve recent peak across multi-ticks");

// Set peak for HUD to read on render frame
(bus as any).recentPeakWattage = 500;

// 3. HUD Update on Jump Frame
hud.update(0.016);
console.log("\n3. HUD Render on Jump Frame:");
console.log(`   hud.displayedWatts: ${hud.displayedWatts} W`);
console.log(`   Upper Track width: ${upperLivePowerEl.style.width} (Scale = Power Cap 500 W)`);
console.log(`   Lower Track width: ${lowerLivePowerEl.style.width} (Scale = Energy Cap 10,000 J)`);
console.log(`   Upper Track display: ${upperLivePowerEl.style.display}`);
console.log(`   Lower Track display: ${lowerLivePowerEl.style.display}`);

if (hud.displayedWatts < 450) throw new Error("HUD displayedWatts failed to snap to jump peak");
if (upperLivePowerEl.style.width !== "100.00%") throw new Error(`Expected upper track 100.00%, got ${upperLivePowerEl.style.width}`);
if (lowerLivePowerEl.style.width !== "5.00%") throw new Error(`Expected lower track 5.00%, got ${lowerLivePowerEl.style.width}`);

// 4. Quick interpolation downward
console.log("\n4. Quick Downward Interpolation (Mid-flight frames):");
for (let frame = 1; frame <= 10; frame++) {
  hud.update(0.016);
  if (frame === 1 || frame === 5 || frame === 10) {
    console.log(`   Frame +${frame * 16}ms: ${hud.displayedWatts.toFixed(1)} W | Upper: ${upperLivePowerEl.style.width} | Lower: ${lowerLivePowerEl.style.width}`);
  }
}

if (hud.displayedWatts >= 500) throw new Error("displayedWatts should have interpolated down");
if (hud.displayedWatts <= 0) throw new Error("displayedWatts decayed too prematurely");

// 5. Full decay to 0
for (let i = 0; i < 30; i++) {
  hud.update(0.016);
}
console.log(`\n5. After 500ms total decay: ${hud.displayedWatts.toFixed(1)} W (display: ${upperLivePowerEl.style.display})`);
if (hud.displayedWatts !== 0) throw new Error("Expected complete rest at 0 W");
if (upperLivePowerEl.style.display !== "none") throw new Error("Expected display none at rest");

console.log("\n>>> ALL TESTS PASSED! Power bars render correctly on both tracks with instant attack and fast decay! <<<");
