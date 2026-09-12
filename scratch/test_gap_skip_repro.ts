import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1.0);
arena.wallHeight = 1.0;
arena.walls = [
  { id: "w1", x: 0, y: 0, width: 4, height: 10, wallHeight: 1.0 },
  { id: "w2", x: 5, y: 0, width: 4, height: 10, wallHeight: 1.0 }
];

const char = new Character({ x: 3.8, y: 5.0 });
char.position.z = 1.0;
char.verticalPositionModule!.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.standingWall = arena.walls[0];
char.climbingModule!.enabled = true;
char.climbingModule!.preventWalkOff = false; // Walking across gap with toggle off or walkoff enabled

console.log("=== Test: Walking across gap without holding Space ===");
let skippedGap = false;
let fellToGround = false;

for (let f = 1; f <= 60; f++) {
  // Walking right without Space
  char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false);
  console.log(`frame ${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}, ${char.position.z.toFixed(3)}), standingWall=${char.standingWall?.id ?? 'null'}, surfH=${char.supportingSurfaceHeight.toFixed(2)}, vz=${char.verticalVelocity.toFixed(2)}`);

  if (char.position.x >= 5.0 && char.position.z >= 0.95) {
    skippedGap = true;
    break;
  }
  if (char.position.z <= 0.001) {
    fellToGround = true;
    break;
  }
}

if (skippedGap) {
  console.error("FAIL: Character skipped across the gap onto Wall 2 top without falling!");
} else if (fellToGround) {
  console.log("PASS: Character cleanly dismounted into gap and fell to ground!");
} else {
  console.error("FAIL: Character neither skipped nor fell! pos=" + JSON.stringify(char.position));
}
