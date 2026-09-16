import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";

const arena = new Arena(20, 14, 1.0);
console.assert(arena.gravity === 30.0, `Expected gravity 30.0, got ${arena.gravity}`);

const char = new Character({
  name: "Player 1",
  x: 4.0,
  y: 7.5,
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
});

console.assert(char.climbingModule?.maxAdhesion === 105.0, `Expected maxAdhesion 105.0, got ${char.climbingModule?.maxAdhesion}`);

const targetWall = arena.walls.find(w => w.wallHeight >= 1.0)!;
char.position.x = targetWall.x - char.colliderRadius;
char.position.y = targetWall.y + 0.5;
char.position.z = 0;

const moveInput = { x: 1.0, y: 0.0 };

// 1. Test empty-handed climbing (1.2kg * 30 = 36N <= 105N)
const isClimbing = char.climbingModule?.update(char, moveInput, true, 1 / 60, arena);
console.log(`Empty-handed (36N / 105N): isClimbing = ${isClimbing}`);
console.assert(isClimbing === true, "Expected empty-handed character to climb");

// 2. Test holding light box (0.7kg, total 1.9kg * 30 = 57N <= 105N)
const lightBox = new GameObject({ id: "light", name: "Light Box", mass: 0.7, position: { x: 0, y: 0, z: 0 } });
char.heldObject = lightBox;
const isClimbingWithLight = char.climbingModule?.update(char, moveInput, true, 1 / 60, arena);
console.log(`Holding 0.7kg box (57N / 105N): isClimbing = ${isClimbingWithLight}`);
console.assert(isClimbingWithLight === true, "Expected character holding light object to climb");

// 3. Test holding heavy box (2.6kg, total 3.8kg * 30 = 114N > 105N) -> SLIP!
const heavyBox = new GameObject({ id: "heavy", name: "Heavy Red Box", mass: 2.6, position: { x: 0, y: 0, z: 0 } });
char.heldObject = heavyBox;
const isClimbingWithHeavy = char.climbingModule?.update(char, moveInput, true, 1 / 60, arena);
console.log(`Holding 2.6kg heavy box (114N / 105N): isClimbing = ${isClimbingWithHeavy}`);
console.assert(isClimbingWithHeavy === false, "Expected character holding heavy object to slip!");

console.log("\nALL PROPORTIONAL ADHESION TESTS PASSED! 🎉");
