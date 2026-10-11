import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

console.log("=== Testing Locomotion Wattage & Speed ===");

const arena = new Arena(20, 20);
const char = new Character({ x: 5, y: 5, mass: 1.2 });

const dt = 1 / 60;
const inputVec = { x: 1, y: 0 };

// 1. Test Sprinting with Energy Enabled
char.walkingModule!.sprintConsumesEnergy = true;
char.isSprinting = true;

// Run 1 frame
char.walkingModule!.update(char, inputVec, dt, arena);

const sprintWatts = char.energyBus!.getCurrentWattage(char.properties);
const sprintSpeed = Math.hypot(char.velocity.x, char.velocity.y);
console.log(`Sprinting: Wattage = ${sprintWatts.toFixed(2)} W, Speed after 1 frame = ${sprintSpeed.toFixed(2)} u/s (Target = ${char.walkingModule!.maxSprintSpeed} u/s)`);

if (sprintWatts < 140 || sprintWatts > 165) {
  throw new Error(`Expected sprint wattage ~150W, got ${sprintWatts}`);
}

// Tick for 30 frames (0.5s) to allow acceleration to reach top speed
for (let i = 0; i < 30; i++) {
  char.walkingModule!.update(char, inputVec, dt, arena);
  char.energyBus.update(dt, char.energyPool, char.properties);
}

const finalSprintSpeed = Math.hypot(char.velocity.x, char.velocity.y);
console.log(`Sprinting steady speed = ${finalSprintSpeed.toFixed(2)} u/s (Base walk speed is ${char.walkingModule!.maxWalkSpeed} u/s)`);

if (finalSprintSpeed < char.walkingModule!.maxWalkSpeed) {
  throw new Error(`Sprint speed (${finalSprintSpeed.toFixed(2)}) is slower than walk speed (${char.walkingModule!.maxWalkSpeed})!`);
}

if (Math.abs(finalSprintSpeed - char.walkingModule!.maxSprintSpeed) > 0.1) {
  throw new Error(`Expected sprint speed to reach ~${char.walkingModule!.maxSprintSpeed}, got ${finalSprintSpeed.toFixed(2)}`);
}

console.log("✅ Sprinting reached full top speed (8.06 u/s) at ~152 W without any speed choke!");

// 2. Test Walking with Energy Enabled
char.velocity.x = 0;
char.velocity.y = 0;
char.isSprinting = false;
char.walkingModule!.walkConsumesEnergy = true;

// Tick for 30 frames
for (let i = 0; i < 30; i++) {
  char.walkingModule!.update(char, inputVec, dt, arena);
  char.energyBus.update(dt, char.energyPool, char.properties);
}

const walkWatts = char.energyBus!.getCurrentWattage(char.properties);
const finalWalkSpeed = Math.hypot(char.velocity.x, char.velocity.y);
console.log(`Walking: Wattage = ${walkWatts.toFixed(2)} W, Speed = ${finalWalkSpeed.toFixed(2)} u/s`);

if (walkWatts < 60 || walkWatts > 75) {
  throw new Error(`Expected walk wattage ~68W, got ${walkWatts}`);
}

if (Math.abs(finalWalkSpeed - char.walkingModule!.maxWalkSpeed) > 0.1) {
  throw new Error(`Expected walk speed ~${char.walkingModule!.maxWalkSpeed}, got ${finalWalkSpeed.toFixed(2)}`);
}

console.log("✅ Walking reached full walk speed (5.2 u/s) at ~68.6 W!");
console.log("=== ALL LOCOMOTION WATTAGE TESTS PASSED! ===");
