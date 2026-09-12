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

console.log("=== Testing walking towards edge with Space NOT held (preventWalkOff) ===");
for (let f = 1; f <= 50; f++) {
  char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false);
}
console.log(`After 50 frames: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}, ${char.position.z.toFixed(3)})`);

if (char.position.z === 1.0 && char.position.x <= 10.45) {
  console.log("PASS: Ledge guard held player on top of wall at z=1.0 when Space is NOT held!");
} else {
  console.error("FAIL: Player fell off or exceeded ledge! pos=" + JSON.stringify(char.position));
}
