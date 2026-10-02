import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { Vector2D } from "../src/engine/GameObject.js";

const dt = 1 / 60;
const holeArena = new Arena(20, 14, 1);
holeArena.walls = [
  { id: "wall-1", x: 3, y: 4, width: 2, height: 2, wallHeight: 1.0 },
  { id: "wall-2", x: 6, y: 4, width: 2, height: 2, wallHeight: 1.0 },
];

const charReGrab = new Character({ x: 4.8, y: 5.0 });
charReGrab.position.z = 1.0;
charReGrab.supportingSurfaceHeight = 1.0;
charReGrab.climbingModule!.preventWalkOff = true;
const eastInput: Vector2D = { x: 1, y: 0 };

console.log("=== Mid-Air Re-Grab Test ===");
// Step off wall into gap holding Space
for (let f = 1; f <= 15; f++) {
  charReGrab.updateCharacter(dt, eastInput, false, null, holeArena, true);
  console.log(`frame ${f}: pos=(${charReGrab.position.x.toFixed(2)}, ${charReGrab.position.y.toFixed(2)}, ${charReGrab.position.z.toFixed(2)}), vz=${charReGrab.verticalVelocity.toFixed(2)}, surfH=${charReGrab.supportingSurfaceHeight}`);
}

// Release Space for 1 frame
charReGrab.updateCharacter(dt, eastInput, false, null, holeArena, false);
console.log(`Released Space: z=${charReGrab.position.z.toFixed(2)}, suppressed=${charReGrab.climbingModule!.climbSuppressedUntilRePress}`);

// Press Space AGAIN mid-air (near Wall 2)
let reGrabbed = false;
for (let f = 1; f <= 20; f++) {
  charReGrab.updateCharacter(dt, eastInput, false, null, holeArena, true);
  console.log(`re-grab frame ${f}: pos=(${charReGrab.position.x.toFixed(2)}, ${charReGrab.position.z.toFixed(2)}), isClimbing=${charReGrab.isClimbing}`);
  if (charReGrab.isClimbing && charReGrab.position.z > 0.1) {
    reGrabbed = true;
    break;
  }
}
console.log("Re-grabbed:", reGrabbed);
