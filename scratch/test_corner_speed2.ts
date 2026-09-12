import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { Vector2D, GameObject } from "../src/engine/GameObject.js";

const dt = 1 / 60;
const cornerArena = new Arena(20, 14, 1);
const char = new Character({ x: 5.8, y: 4.1 });
char.position.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.climbingModule!.preventWalkOff = true;

const neInput: Vector2D = { x: 1, y: -1 };

console.log("Initial:", char.position);
for (let f = 1; f <= 30; f++) {
  // Let's see what happens if we simulate the new logic
  // Update character input
  char.updateCharacter(dt, neInput, false, null, cornerArena, false);
  const speed = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`frame ${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}), vel=(${char.velocity.x.toFixed(3)}, ${char.velocity.y.toFixed(3)}), speed=${speed.toFixed(3)}`);
}
