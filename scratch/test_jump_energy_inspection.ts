import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

console.log("=== Inspecting Jump Energy & Power ===");

const arena = new Arena(20, 20);
const char = new Character({ x: 5, y: 5, mass: 1.2 });

console.log(`Character jumpStrength: ${char.jumpModule!.jumpStrength}, maxInitialSpeed: ${char.jumpModule!.maxInitialSpeed}`);
console.log(`Character mass: ${char.mass}`);
console.log(`jumpConsumesEnergy: ${char.jumpConsumesEnergy}`);
console.log(`EnergyBus maxPower: ${char.energyBus!.getMaxPower()} W, stamina: ${char.energyBus!.getCurrentStamina()} s`);
console.log(`EnergyPool energy: ${char.energyPool!.getCurrentEnergy()} J`);

// Test jump with energy
const takeoffSpeedBefore = char.jumpModule!.maxInitialSpeed;
const jumped = char.jump(arena);
console.log(`Jumped: ${jumped}`);
console.log(`Resulting verticalVelocity: ${char.verticalVelocity}`);
console.log(`Expected initial verticalVelocity: ${takeoffSpeedBefore}`);
console.log(`Wattage on bus after jump: ${char.energyBus!.getCurrentWattage()}`);
console.log(`Stamina remaining after jump: ${char.energyBus!.getCurrentStamina()}`);
console.log(`Pool remaining after jump: ${char.energyPool!.getCurrentEnergy()}`);

// Let's also test what happens when jumping while sprinting!
const char2 = new Character({ x: 5, y: 5, mass: 1.2 });
char2.isSprinting = true;
char2.walkingModule!.sprintConsumesEnergy = true;
const dt = 1 / 60;
char2.walkingModule!.update(char2, { x: 1, y: 0 }, dt, arena);
console.log(`\nBefore Jump while Sprinting: bus live draw = ${char2.energyBus!.getCurrentWattage()} W`);
const jumpedWhileSprint = char2.jump(arena);
console.log(`Jumped while sprinting: ${jumpedWhileSprint}`);
console.log(`Resulting verticalVelocity: ${char2.verticalVelocity}`);
console.log(`Wattage on bus after jump: ${char2.energyBus!.getCurrentWattage()}`);
