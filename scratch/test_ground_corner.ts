import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { Vector2D } from "../src/engine/GameObject.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1);
// Wall at x: 4..6, y: 4..6.
// Corner of wall is (4, 4) on ground.
// Character starts at (3.5, 3.8) on ground (z = 0).
const char = new Character({ x: 3.5, y: 3.8 });
char.position.z = 0;

// Walk South-East towards corner (4, 4)
const seInput: Vector2D = { x: 1, y: 1 };

console.log("Ground walk into corner test:");
for (let f = 1; f <= 20; f++) {
  char.updateCharacter(dt, seInput, false, null, arena, false);
  const speed = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`frame ${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}), vel=(${char.velocity.x.toFixed(3)}, ${char.velocity.y.toFixed(3)}), speed=${speed.toFixed(3)}`);
}
