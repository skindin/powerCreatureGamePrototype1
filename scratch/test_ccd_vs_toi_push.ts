import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

console.log("=== Testing Continuous Swept vs Discrete TOI ===");

const arena = new Arena(30, 20);

// Test 1: SPRINTING into another character (High speed triggers Continuous Swept)
console.log("\n--- TEST 1: Continuous Swept (High Speed Sprint) ---");
const charA = new Character({ x: 10, y: 10, mass: 1.2, colliderRadius: 0.44 });
const charB = new Character({ x: 10.7, y: 10.02, mass: 1.2, colliderRadius: 0.44 }); // Slight 0.02 offset

// Moving right at sprint speed (8 u/s)
charA.velocity = { x: 8, y: 0 };
charB.velocity = { x: 0, y: 0 };

console.log(`Before TOI - Char A: (${charA.position.x.toFixed(3)}, ${charA.position.y.toFixed(3)}), v=(${charA.velocity.x.toFixed(2)}, ${charA.velocity.y.toFixed(2)})`);
console.log(`Before TOI - Char B: (${charB.position.x.toFixed(3)}, ${charB.position.y.toFixed(3)}), v=(${charB.velocity.x.toFixed(2)}, ${charB.velocity.y.toFixed(2)})`);

// Advance Char A as would happen in game loop before collision resolver
charA.position.x += charA.velocity.x * (1 / 60);
charA.position.y += charA.velocity.y * (1 / 60);

console.log(`After movement step - Char A: (${charA.position.x.toFixed(3)}, ${charA.position.y.toFixed(3)})`);

CollisionResolver.resolvePairContinuousSwept(charA, charB, arena, 1 / 60);

console.log(`After Continuous Swept - Char A v=(${charA.velocity.x.toFixed(2)}, ${charA.velocity.y.toFixed(2)}) pos=(${charA.position.x.toFixed(3)}, ${charA.position.y.toFixed(3)})`);
console.log(`After Continuous Swept - Char B v=(${charB.velocity.x.toFixed(2)}, ${charB.velocity.y.toFixed(2)}) pos=(${charB.position.x.toFixed(3)}, ${charB.position.y.toFixed(3)})`);

// Test 2: Discrete TOI (Walking speed)
console.log("\n--- TEST 2: Discrete TOI (Walking Speed) ---");
const charA2 = new Character({ x: 10, y: 10, mass: 1.2, colliderRadius: 0.44 });
const charB2 = new Character({ x: 10.7, y: 10.02, mass: 1.2, colliderRadius: 0.44 });

charA2.velocity = { x: 4, y: 0 };
charB2.velocity = { x: 0, y: 0 };

charA2.position.x += charA2.velocity.x * (1 / 60);
charA2.position.y += charA2.velocity.y * (1 / 60);

CollisionResolver.resolvePairDiscreteTOI(charA2, charB2, arena, 1 / 60);

console.log(`After Discrete TOI - Char A2 v=(${charA2.velocity.x.toFixed(2)}, ${charA2.velocity.y.toFixed(2)}) pos=(${charA2.position.x.toFixed(3)}, ${charA2.position.y.toFixed(3)})`);
console.log(`After Discrete TOI - Char B2 v=(${charB2.velocity.x.toFixed(2)}, ${charB2.velocity.y.toFixed(2)}) pos=(${charB2.position.x.toFixed(3)}, ${charB2.position.y.toFixed(3)})`);
