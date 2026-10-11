import { EnergyBus } from "../src/character/EnergyBus.js";
import { EnergyPool } from "../src/character/EnergyPool.js";

console.log("=== Testing Stamina Depletion Equation ===");

// 1. Initialize EnergyBus: 250 Watts max power, 10.0 seconds max stamina
const bus = new EnergyBus({
  baseMaxPower: 250.0,
  baseMaxStamina: 10.0,
  staminaRegenRate: 1.0,
});
const pool = new EnergyPool({ infiniteEnergy: true });

console.log(`Initialized: maxPower = ${bus.getMaxPower()} W, maxStamina = ${bus.getMaxStamina()} s`);

// 2. Test Max Power Draw (250 W for 1 second)
// Depletion equation: current wattage / max wattage per second
// At 250 W: 250 / 250 = 1.0 stamina seconds depleted per second
const dt = 1 / 60;
let initialStamina = bus.getCurrentStamina();
if (Math.abs(initialStamina - 10.0) > 0.0001) {
  throw new Error(`Expected initial stamina 10.0, got ${initialStamina}`);
}

// Draw 250 W for 60 frames (1.0 second)
for (let i = 0; i < 60; i++) {
  const granted = bus.requestPower(250.0, dt, pool);
  if (Math.abs(granted - 250.0) > 0.001) {
    throw new Error(`Expected 250W granted, got ${granted}`);
  }
}

let staminaAfter1sMax = bus.getCurrentStamina();
let drained1sMax = initialStamina - staminaAfter1sMax;
console.log(`1.0s at Max Power (250W): Stamina drained = ${drained1sMax.toFixed(4)}s (Remaining: ${staminaAfter1sMax.toFixed(4)}s)`);
if (Math.abs(drained1sMax - 1.0) > 0.001) {
  throw new Error(`Expected exactly 1.0s stamina drained, got ${drained1sMax}`);
}

// Reset stamina for next test
bus.currentStaminaProp.literalValue = 10.0;
bus.isExhausted = false;

// 3. Test Half Power Draw (125 W for 1 second)
// Depletion equation: 125 / 250 = 0.5 stamina seconds depleted per second
// At half power, it can draw continuous energy for twice as long (20 seconds for 10s stamina)!
for (let i = 0; i < 60; i++) {
  const granted = bus.requestPower(125.0, dt, pool);
  if (Math.abs(granted - 125.0) > 0.001) {
    throw new Error(`Expected 125W granted, got ${granted}`);
  }
}

let staminaAfter1sHalf = bus.getCurrentStamina();
let drained1sHalf = 10.0 - staminaAfter1sHalf;
console.log(`1.0s at Half Power (125W): Stamina drained = ${drained1sHalf.toFixed(4)}s (Remaining: ${staminaAfter1sHalf.toFixed(4)}s)`);
if (Math.abs(drained1sHalf - 0.5) > 0.001) {
  throw new Error(`Expected exactly 0.5s stamina drained at half power, got ${drained1sHalf}`);
}

// 4. Test Complete Depletion Duration at Max Power (Should take exactly 10.0 seconds)
bus.currentStaminaProp.literalValue = 10.0;
bus.isExhausted = false;
let secondsAtMax = 0;
while (!bus.isExhausted && bus.getCurrentStamina() > 0.0001) {
  const granted = bus.requestPower(250.0, dt, pool);
  if (granted > 0) {
    secondsAtMax += dt;
  }
}
console.log(`Continuous Max Power Draw: lasted ${secondsAtMax.toFixed(2)} seconds before exhaustion`);
if (Math.abs(secondsAtMax - 10.0) > 0.05) {
  throw new Error(`Expected 10 seconds of continuous max power, got ${secondsAtMax}`);
}

// 5. Test Complete Depletion Duration at Half Power (Should take exactly 20.0 seconds - twice as long!)
bus.currentStaminaProp.literalValue = 10.0;
bus.isExhausted = false;
let secondsAtHalf = 0;
while (!bus.isExhausted && bus.getCurrentStamina() > 0.0001) {
  const granted = bus.requestPower(125.0, dt, pool);
  if (granted > 0) {
    secondsAtHalf += dt;
  }
}
console.log(`Continuous Half Power Draw: lasted ${secondsAtHalf.toFixed(2)} seconds before exhaustion (twice as long!)`);
if (Math.abs(secondsAtHalf - 20.0) > 0.05) {
  throw new Error(`Expected 20 seconds of continuous half power, got ${secondsAtHalf}`);
}

// 6. Test Stamina Recovery at Rest (0 power draw)
// Should recover at staminaRegenRate (1.0 s/s)
bus.currentStaminaProp.literalValue = 0.0;
bus.isExhausted = true;
// Update 60 frames (1 second) of rest
for (let i = 0; i < 60; i++) {
  bus.update(dt, pool);
}
let recoveredStamina = bus.getCurrentStamina();
console.log(`1.0s of Rest: recovered ${recoveredStamina.toFixed(4)}s of stamina`);
if (Math.abs(recoveredStamina - 1.0) > 0.05) {
  throw new Error(`Expected ~1.0s recovered, got ${recoveredStamina}`);
}

console.log("=== ALL STAMINA EQUATION TESTS PASSED PERFECTLY! ===");
