import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1.0);
arena.loadWallPreset("trenches");

// Corner tile in trenches
// Let's place character right at a corner hanging off the edge
const char = new Character({ x: 5.4, y: 3.4 });
char.position.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.climbingModule!.preventWalkOff = true;

console.log("=== Test: Hanging off corner while pressing diagonally into void ===");
let oscillated = false;
let lastSignX = 0;
let signChanges = 0;

for (let f = 1; f <= 60; f++) {
  // Pressing towards the void (North-West)
  char.updateCharacter(dt, { x: -1, y: -1 }, false, null, arena, false);
  const vx = char.velocity.x;
  if (Math.abs(vx) > 0.05) {
    const s = Math.sign(vx);
    if (lastSignX !== 0 && s !== lastSignX) {
      signChanges++;
    }
    lastSignX = s;
  }
  if (f % 10 === 0) {
    console.log(`f${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}), vel=(${char.velocity.x.toFixed(3)}, ${char.velocity.y.toFixed(3)})`);
  }
}

console.log("Sign changes in X velocity:", signChanges);
if (signChanges > 3) {
  throw new Error("FAIL: Oscillating back and forth across corner!");
} else {
  console.log("PASS: Solid corner hanging without oscillation! 🎉");
}
