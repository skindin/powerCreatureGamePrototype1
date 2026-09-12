import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1.0);
arena.wallHeight = 1.0;
arena.walls = [
  { id: "big_wall", x: 2, y: 2, width: 8, height: 8, wallHeight: 1.0 }
];

const char = new Character({ x: 5.0, y: 5.0 });
char.position.z = 1.0;
char.verticalPositionModule!.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.standingWall = arena.walls[0];
char.climbingModule!.enabled = true;
char.climbingModule!.preventWalkOff = true;

console.log("=== Testing pressing Space in middle of wall ===");
console.log(`Initial: pos=(${char.position.x}, ${char.position.y}, ${char.position.z}), surfH=${char.supportingSurfaceHeight}`);

// Frame 1: fresh press of Space
char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, true);
console.log(`After frame 1 (Space held, no move): pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}, ${char.position.z.toFixed(3)}), surfH=${char.supportingSurfaceHeight.toFixed(3)}, vz=${char.verticalVelocity.toFixed(3)}`);

for (let f = 2; f <= 30; f++) {
  char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, true);
}
console.log(`After 30 frames (Space held, walking East): pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}, ${char.position.z.toFixed(3)}), surfH=${char.supportingSurfaceHeight.toFixed(3)}, vz=${char.verticalVelocity.toFixed(3)}`);

if (char.position.z === 1.0) {
  console.log("PASS: Player stayed solidly at z=1.0 on top of wall when pressing Space in middle of wall!");
} else {
  console.error("FAIL: Player fell or sank into wall! z=" + char.position.z);
}
