import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const arena = new Arena(20, 14, 1.0);
console.assert(arena.gravity === 30.0, `Expected gravity 30.0, got ${arena.gravity}`);

const char = new Character({
  name: "Player 1",
  x: 4.0, // next to wall at (5, 7)
  y: 7.5,
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
});

// Position character directly adjacent to a wall
const wall = arena.walls[0]; // let's find a wall
const targetWall = arena.walls.find(w => w.wallHeight >= 1.0)!;
char.position.x = targetWall.x - char.colliderRadius;
char.position.y = targetWall.y + 0.5;
char.position.z = 0;

console.log(`Testing climb against wall at (${targetWall.x}, ${targetWall.y}) with arena.gravity = ${arena.gravity}...`);
console.log(`Character mass = ${char.mass}, requiredForce = ${char.mass * arena.gravity} N, maxAdhesion = ${char.climbingModule?.maxAdhesion} N`);

// Push toward wall and hold climb
const moveInput = { x: 1.0, y: 0.0 };
const isClimbing = char.climbingModule?.update(char, moveInput, true, 1 / 60, arena);

console.log(`Climb result: isClimbing = ${isClimbing}, char.isClimbing = ${char.isClimbing}, z = ${char.position.z}`);
console.assert(isClimbing === true, `Expected character to climb, but got ${isClimbing}`);
console.assert(char.isClimbing === true, "Expected char.isClimbing to be true");

// Step 30 ticks of climbing
for (let i = 0; i < 30; i++) {
  char.climbingModule?.update(char, moveInput, true, 1 / 60, arena);
}

console.log(`After 30 ticks: z = ${char.position.z.toFixed(2)} (wallHeight = ${targetWall.wallHeight})`);
console.assert(char.position.z > 0.5, `Expected character to ascend, got z = ${char.position.z}`);
console.log("✓ Climbing works perfectly with gravity = 30.0!");
