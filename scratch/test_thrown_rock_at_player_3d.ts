import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

console.log("=== Testing Thrown Rock at Player 3D & Direct Push Alignment ===");

const arena = new Arena(30, 20);

// Test 1: Airborne rock with z = 1.1 (Layer 2) hitting a character on the ground at z = 0 (Layer 1)
console.log("\n--- TEST 1: Airborne Thrown Rock (Layer 2) vs Ground Character (Layer 1) ---");
const groundChar = new Character({ x: 5.0, y: 7.0, mass: 1.2, colliderRadius: 0.44 });
groundChar.position.z = 0;

const flyingRock = new GameObject({
  position: { x: 4.5, y: 7.0, z: 0.85 },
  mass: 0.8,
  colliderRadius: 0.35,
  hasBounce: true,
  bounceMod: 0.4,
});
flyingRock.velocity = { x: 12.0, y: 0 };
flyingRock.verticalVelocity = -1.0; // Descending into character

console.log(`Initial Rock: pos=(${flyingRock.position.x}, ${flyingRock.position.y}, ${flyingRock.position.z}), r=${flyingRock.colliderRadius}, v=(${flyingRock.velocity.x}, ${flyingRock.velocity.y})`);
console.log(`Initial Char: pos=(${groundChar.position.x}, ${groundChar.position.y}, ${groundChar.position.z}), r=${groundChar.colliderRadius}`);

const res = CollisionResolver.resolvePairDiscreteTOI(flyingRock, groundChar, arena, 1 / 60);
console.log(`resolvePairDiscreteTOI result: ${res}`);

console.log(`Post-impact Char vx: ${groundChar.velocity.x.toFixed(2)}, pos: (${groundChar.position.x.toFixed(3)}, ${groundChar.position.y.toFixed(3)})`);
console.log(`Post-impact Rock vx: ${flyingRock.velocity.x.toFixed(2)}`);

if (groundChar.velocity.x <= 1.0) {
  console.error("FAIL: Ground character was not knocked back by airborne thrown rock!");
  process.exit(1);
}
console.log("✅ SUCCESS: Airborne thrown rock hit the ground character and transferred momentum!");

// Test 2: Pushing directly along +X to verify NO perpendicular (Y) sliding
console.log("\n--- TEST 2: Push Along +X Verifying NO Perpendicular Sliding ---");
const pusher = new Character({ x: 5.0, y: 7.0, mass: 1.2, colliderRadius: 0.44 });
const target = new Character({ x: 5.8, y: 7.0, mass: 1.2, colliderRadius: 0.44 });

// Pusher walks right (+X) directly towards target
pusher.velocity = { x: 4.0, y: 0 };
target.velocity = { x: 0, y: 0 };

for (let step = 1; step <= 10; step++) {
  pusher.position.x += pusher.velocity.x * (1 / 60);
  pusher.position.y += pusher.velocity.y * (1 / 60);
  target.position.x += target.velocity.x * (1 / 60);
  target.position.y += target.velocity.y * (1 / 60);

  CollisionResolver.resolveEntityCollisions([pusher, target], arena, 1 / 60, null, "dynamic");
}

console.log(`After 10 push steps: Target pos: (${target.position.x.toFixed(3)}, ${target.position.y.toFixed(3)})`);
const yDeviation = Math.abs(target.position.y - 7.0);
console.log(`Y deviation (perpendicular slide): ${yDeviation.toFixed(6)}`);

if (yDeviation > 0.001) {
  console.error(`FAIL: Target experienced perpendicular sliding! dy=${yDeviation}`);
  process.exit(1);
}
if (target.position.x <= 5.85) {
  console.error("FAIL: Target was not pushed forward along X!");
  process.exit(1);
}

console.log("✅ SUCCESS: Target was pushed straight forward along X with 0 perpendicular sliding!");

console.log("\n🎉 ALL 3D & ALIGNMENT TESTS PASSED!");
