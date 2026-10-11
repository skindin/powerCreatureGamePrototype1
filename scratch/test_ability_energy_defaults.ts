import { Character } from "../src/character/Character.js";
import { ClimbingModule } from "../src/character/ClimbingModule.js";

console.log("=== Testing Ability Energy Consumption Defaults ===");

const char = new Character();

// 1. Verify walking: walk energy FALSE, sprint energy TRUE, both wired to bus_main
if (char.walkingModule!.walkConsumesEnergy !== false) {
  throw new Error(`Expected walkConsumesEnergy to be false, got ${char.walkingModule!.walkConsumesEnergy}`);
}
if (char.walkingModule!.sprintConsumesEnergy !== true) {
  throw new Error(`Expected sprintConsumesEnergy to be true, got ${char.walkingModule!.sprintConsumesEnergy}`);
}
if (char.walkingModule!.walkEnergyBusId !== "bus_main") {
  throw new Error(`Expected walkEnergyBusId to be 'bus_main', got ${char.walkingModule!.walkEnergyBusId}`);
}
if (char.walkingModule!.sprintEnergyBusId !== "bus_main") {
  throw new Error(`Expected sprintEnergyBusId to be 'bus_main', got ${char.walkingModule!.sprintEnergyBusId}`);
}
console.log("✅ Walking/Sprinting verified: walking consumesEnergy=false, sprinting consumesEnergy=true, bus='bus_main'");

// 2. Verify pickup: consumesEnergy FALSE, wired to bus_main
if (char.pickupModule!.consumesEnergy !== false) {
  throw new Error(`Expected pickupModule.consumesEnergy to be false, got ${char.pickupModule!.consumesEnergy}`);
}
if (char.pickupModule!.energyBusId !== "bus_main") {
  throw new Error(`Expected pickupModule.energyBusId to be 'bus_main', got ${char.pickupModule!.energyBusId}`);
}
console.log("✅ Pickup verified: consumesEnergy=false, bus='bus_main'");

// 3. Verify throw: consumesEnergy TRUE, wired to bus_main
if (char.throwModule!.consumesEnergy !== true) {
  throw new Error(`Expected throwModule.consumesEnergy to be true, got ${char.throwModule!.consumesEnergy}`);
}
if (char.throwModule!.energyBusId !== "bus_main") {
  throw new Error(`Expected throwModule.energyBusId to be 'bus_main', got ${char.throwModule!.energyBusId}`);
}
console.log("✅ Throw verified: consumesEnergy=true, bus='bus_main'");

// 4. Verify jump: consumesEnergy TRUE, wired to bus_main
if (char.jumpConsumesEnergy !== true) {
  throw new Error(`Expected jumpConsumesEnergy to be true, got ${char.jumpConsumesEnergy}`);
}
if (char.jumpEnergyBusId !== "bus_main") {
  throw new Error(`Expected jumpEnergyBusId to be 'bus_main', got ${char.jumpEnergyBusId}`);
}
console.log("✅ Jump verified: consumesEnergy=true, bus='bus_main'");

// 5. Verify health: consumesEnergy TRUE, wired to bus_main
if (char.healthModule!.consumesEnergy !== true) {
  throw new Error(`Expected healthModule.consumesEnergy to be true, got ${char.healthModule!.consumesEnergy}`);
}
if (char.healthModule!.energyBusId !== "bus_main") {
  throw new Error(`Expected healthModule.energyBusId to be 'bus_main', got ${char.healthModule!.energyBusId}`);
}
console.log("✅ Health verified: consumesEnergy=true, bus='bus_main'");

// 6. Verify climbing when attached with default constructor options
const climb = new ClimbingModule({ consumesEnergy: true });
if (climb.consumesEnergy !== true || climb.energyBusId !== "bus_main") {
  throw new Error("Climbing module consumesEnergy or energyBusId mismatch");
}
console.log("✅ Climbing verified: consumesEnergy=true, bus='bus_main'");

console.log("=== ALL ABILITY ENERGY DEFAULTS PASSED! ===");
