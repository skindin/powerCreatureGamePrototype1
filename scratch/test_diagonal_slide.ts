import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1.0);
arena.wallHeight = 1.0;
// Wall from x=0..10, y=0..2
arena.walls = [
  { id: "w1", x: 0, y: 0, width: 10, height: 2, wallHeight: 1.0 }
];

const char = new Character({ x: 5.0, y: 1.5 });
char.position.z = 1.0;
char.verticalPositionModule!.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.standingWall = arena.walls[0];
char.climbingModule!.enabled = true;
char.climbingModule!.preventWalkOff = true;

console.log("=== Test: Moving Diagonally (Up-Right, {x: 1, y: 1}) on Horizontal Wall ===");
// Walk diagonally up and right (North edge is at y = 2.0)
for (let f = 1; f <= 30; f++) {
  char.updateCharacter(dt, { x: 1, y: 1 }, false, null, arena, false);
  if (f % 5 === 0 || f === 1) {
    const speed = Math.hypot(char.velocity.x, char.velocity.y);
    console.log(`f${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}), vel=(${char.velocity.x.toFixed(3)}, ${char.velocity.y.toFixed(3)}), speed=${speed.toFixed(3)}`);
  }
}
