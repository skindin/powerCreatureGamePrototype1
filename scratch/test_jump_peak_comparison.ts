import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";

const arena = new Arena(20, 20);

// Jump 1: WITHOUT energy
const charNoEnergy = new Character({ x: 5, y: 5, mass: 1.2 });
charNoEnergy.jumpConsumesEnergy = false;
charNoEnergy.jump(arena);
let peakNoEnergy = 0;
const dt = 1 / 60;
while (charNoEnergy.verticalVelocity > 0) {
  charNoEnergy.position.z += charNoEnergy.verticalVelocity * dt;
  charNoEnergy.verticalVelocity -= arena.gravity * dt;
  if (charNoEnergy.position.z > peakNoEnergy) peakNoEnergy = charNoEnergy.position.z;
}

// Jump 2: WITH energy
const charWithEnergy = new Character({ x: 5, y: 5, mass: 1.2 });
charWithEnergy.jumpConsumesEnergy = true;
charWithEnergy.jump(arena);
let peakWithEnergy = 0;
while (charWithEnergy.verticalVelocity > 0) {
  charWithEnergy.position.z += charWithEnergy.verticalVelocity * dt;
  charWithEnergy.verticalVelocity -= arena.gravity * dt;
  if (charWithEnergy.position.z > peakWithEnergy) peakWithEnergy = charWithEnergy.position.z;
}

console.log(`Peak WITHOUT energy: ${peakNoEnergy.toFixed(4)} u`);
console.log(`Peak WITH energy:    ${peakWithEnergy.toFixed(4)} u`);
console.log(`Difference:          ${(peakWithEnergy - peakNoEnergy).toFixed(6)} u`);
