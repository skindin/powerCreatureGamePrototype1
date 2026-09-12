import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1.0);
arena.wallHeight = 1.0;
arena.walls = [
  { id: "big_wall", x: 2, y: 2, width: 8, height: 8, wallHeight: 1.0 }
];

const char = new Character({ x: 9.5, y: 5.0 });
char.position.z = 1.0;
char.verticalPositionModule!.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.standingWall = arena.walls[0];
char.climbingModule!.enabled = true;
char.climbingModule!.preventWalkOff = true;

console.log("=== Testing stepping off edge with Space held ===");
let fellToGround = false;
for (let f = 1; f <= 50; f++) {
  char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, true);
  if (char.position.z <= 0.001) {
    fellToGround = true;
    console.log(`Landed on ground at frame ${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}, ${char.position.z.toFixed(3)})`);
    break;
  }
}

if (fellToGround) {
  console.log("PASS: Stepping off edge while holding Space dropped player cleanly to ground!");
} else {
  console.error("FAIL: Player did not fall to ground after walking off edge! z=" + char.position.z);
}
