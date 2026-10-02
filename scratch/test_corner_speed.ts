import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { Vector2D } from "../src/engine/GameObject.js";

const dt = 1 / 60;
const cornerArena = new Arena(20, 14, 1);
const charCorner = new Character({ x: 5.8, y: 4.1 });
charCorner.position.z = 1.0;
charCorner.supportingSurfaceHeight = 1.0;
charCorner.climbingModule!.preventWalkOff = true;

const neInput: Vector2D = { x: 1, y: -1 };

console.log("Initial:", charCorner.position);
for (let f = 1; f <= 30; f++) {
  charCorner.updateCharacter(dt, neInput, false, null, cornerArena, false);
  const speed = Math.hypot(charCorner.velocity.x, charCorner.velocity.y);
  console.log(`frame ${f}: pos=(${charCorner.position.x.toFixed(3)}, ${charCorner.position.y.toFixed(3)}), vel=(${charCorner.velocity.x.toFixed(3)}, ${charCorner.velocity.y.toFixed(3)}), speed=${speed.toFixed(3)}`);
}
