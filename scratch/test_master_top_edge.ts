import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { Vector2D } from "../src/engine/GameObject.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1);

console.log("\n--- Master branch: Walking along top edge pushing North-East ---");
const char = new Character({ x: 4.5, y: 3.56 });
char.position.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.climbingModule!.preventWalkOff = true;
const neInput: Vector2D = { x: 1, y: -1 };

for (let f = 1; f <= 15; f++) {
  char.updateCharacter(dt, neInput, false, null, arena, false);
  const speed = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`frame ${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}), vel=(${char.velocity.x.toFixed(3)}, ${char.velocity.y.toFixed(3)}), speed=${speed.toFixed(3)}`);
}
