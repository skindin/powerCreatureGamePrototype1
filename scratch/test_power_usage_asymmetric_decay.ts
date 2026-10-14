import { Character } from "../src/character/Character.js";
import { EnergyHud } from "../src/ui/EnergyHud.js";

// Mock document for DOM testing in Node
(global as any).document = {
  querySelector: () => null,
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
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

console.log("=== RUNNING ASYMMETRIC POWER INTERPOLATION VERIFICATION TEST ===");

const char = new Character({ name: "Jumper" });
const hud = new EnergyHud(null as any, null as any);

// Mock container so update runs
(hud as any).container = { style: { display: "block" } };
(hud as any).getTargetCharacter = () => char;

const bus = char.getEnergyBus("bus_main")!;
const props = char.properties;

console.log("1. Initial state at rest (0 W):");
hud.update(0.016);
console.log(`   displayedWatts: ${hud.displayedWatts} W`);
if (hud.displayedWatts !== 0) {
  throw new Error(`FAIL: Initial displayedWatts should be 0, got ${hud.displayedWatts}`);
}
console.log("✔ SUCCESS: Initial state is 0 W");

console.log("\n2. Jump Takeoff Impulse Spike: curWatts jumps to 500 W");
bus.currentWattageProp.set(500, props);
hud.update(0.016);
console.log(`   displayedWatts immediately on spike frame: ${hud.displayedWatts} W`);
if (hud.displayedWatts !== 500) {
  throw new Error(`FAIL: Expected instant snap to 500 W on rising spike, got ${hud.displayedWatts}`);
}
console.log("✔ SUCCESS: Current power usage bar instantly jumped to 500 W!");

console.log("\n3. Airborne Frame 1 (+16ms): curWatts drops to 0 W");
bus.currentWattageProp.set(0, props);
hud.update(0.016);
console.log(`   displayedWatts after 16ms: ${hud.displayedWatts.toFixed(2)} W`);
if (hud.displayedWatts <= 0 || hud.displayedWatts >= 500) {
  throw new Error(`FAIL: Expected quick downward interpolation, got ${hud.displayedWatts}`);
}
if (hud.displayedWatts < 420 || hud.displayedWatts > 460) {
  throw new Error(`FAIL: Expected ~440-450 W after 16ms decay, got ${hud.displayedWatts}`);
}
console.log("✔ SUCCESS: Power bar did NOT vanish instantly; it decayed smoothly to ~447 W");

console.log("\n4. Airborne Frame 6 (+100ms total decay):");
for (let i = 0; i < 5; i++) {
  hud.update(0.016);
}
console.log(`   displayedWatts after ~100ms: ${hud.displayedWatts.toFixed(2)} W`);
if (hud.displayedWatts < 180 || hud.displayedWatts > 240) {
  throw new Error(`FAIL: Expected ~200 W after 100ms, got ${hud.displayedWatts}`);
}
console.log("✔ SUCCESS: Power bar is clearly legible, decaying around half-life (~200 W at 100ms)");

console.log("\n5. Second Jump or Sprint Spike during decay: curWatts jumps to 500 W again");
bus.currentWattageProp.set(500, props);
hud.update(0.016);
console.log(`   displayedWatts immediately re-snapped to: ${hud.displayedWatts} W`);
if (hud.displayedWatts !== 500) {
  throw new Error(`FAIL: Expected instant re-snap to 500 W, got ${hud.displayedWatts}`);
}
console.log("✔ SUCCESS: Second spike instantly moved back to 500 W!");

console.log("\n6. Full Decay to Rest (+500ms):");
bus.currentWattageProp.set(0, props);
for (let i = 0; i < 35; i++) {
  hud.update(0.016);
}
console.log(`   displayedWatts after 500ms: ${hud.displayedWatts.toFixed(2)} W`);
if (hud.displayedWatts !== 0) {
  throw new Error(`FAIL: Expected clean snap to 0 W after full decay window, got ${hud.displayedWatts}`);
}
console.log("\n7. Testing Lower Track Live Power Bar vs Power Cap:");
const mockLowerPowerEl: any = { style: {} };
(hud as any).lowerLivePowerFillEl = mockLowerPowerEl;

// 500 W on 10,000 J energy cap should be 5.00%
bus.currentWattageProp.set(500, props);
hud.update(0.016);
console.log(`   Lower bar width at 500 W: ${mockLowerPowerEl.style.width}`);
if (mockLowerPowerEl.style.width !== "5.00%") {
  throw new Error(`FAIL: Expected lower bar width to be 5.00% (500 W / 10,000 J), got ${mockLowerPowerEl.style.width}`);
}
console.log("✔ SUCCESS: Lower bar width aligns with Power Cap at 5.00%!");

// 8. Test First Jump Keyboard Activation:
import { Arena } from "../src/engine/Arena.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";

const arena = new Arena(16, 16);
const mockCanvas: any = { addEventListener: () => {} };
const inputMgr = new InputManager(mockCanvas, arena);
const pm = new PlayerManager({ arena, inputManager: inputMgr });

console.log("\n8. Testing First Jump Responsiveness:");
console.log(`   Initial keyboard player active: ${inputMgr.isKeyboardActive}`);
if (!inputMgr.isKeyboardActive) {
  throw new Error("FAIL: Keyboard player should be active on startup!");
}
const kChar = pm.primaryCharacter;
console.log(`   Initial kChar z: ${kChar.position.z}, vz: ${kChar.verticalVelocity}`);
// Trigger keyboard jump
inputMgr.onKeyboardJump?.();
console.log(`   kChar vz after first jump: ${kChar.verticalVelocity}`);
if (kChar.verticalVelocity <= 0) {
  throw new Error("FAIL: First jump should immediately give positive verticalVelocity!");
}
console.log("✔ SUCCESS: First jump immediately triggers positive vertical velocity!");

console.log("\nALL ASYMMETRIC POWER INTERPOLATION & FIRST JUMP CHECKS PASSED 100%!");
