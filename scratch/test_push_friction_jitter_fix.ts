import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

const arena = new Arena();

// Test 1: Ground Friction on idle Character in open space
const c1 = new Character({ x: 3, y: 3 });
c1.velocity.x = 2.0;
c1.velocity.y = 0.0;
c1.isActivelyWalking = false;

const dt = 1 / 60;
let ticksToStop = 0;
for (let i = 0; i < 60; i++) {
  c1.updatePosition(dt, arena);
  if (Math.hypot(c1.velocity.x, c1.velocity.y) === 0 && ticksToStop === 0) {
    ticksToStop = i + 1;
  }
}

console.log(`[Test 1] Initial vx=2.0 -> Stopped in ${ticksToStop} ticks (~${(ticksToStop * dt).toFixed(2)}s). Final vx = ${c1.velocity.x}`);
if (ticksToStop >= 10 && ticksToStop <= 20 && c1.velocity.x === 0) {
  console.log("✅ PASS: Ground friction smoothly stopped idle character in ~0.2s without sliding forever!");
} else {
  console.error("❌ FAIL: Idle character failed to stop appropriately! ticksToStop =", ticksToStop);
  process.exit(1);
}

// Test 2: Two characters colliding (Player 1 pushes Player 2) in open space
const p1 = new Character({ x: 2.0, y: 3.0, mass: 1.2, colliderRadius: 0.44 });
const p2 = new Character({ x: 2.8, y: 3.0, mass: 1.2, colliderRadius: 0.44 });
p1.isActivelyWalking = true;
p2.isActivelyWalking = false;

const initialP2X = p2.position.x;
const p2Positions: number[] = [p2.position.x];

// Simulate 10 ticks of P1 walking into P2 along +X
for (let t = 0; t < 10; t++) {
  p1.position.x += 2.0 * dt; // P1 moves right at 2 u/s
  CollisionResolver.resolveEntityCollisions([p1, p2], arena, dt, null, "discrete");
  p2.updatePosition(dt, arena);
  p2Positions.push(p2.position.x);
}

console.log(`[Test 2] P1 pushes P2: P2 started at ${initialP2X.toFixed(3)}, moved to ${p2.position.x.toFixed(3)}`);
let monotonicForward = true;
for (let i = 1; i < p2Positions.length; i++) {
  if (p2Positions[i] < p2Positions[i - 1] - 0.001) {
    monotonicForward = false;
    console.error(`Position decreased at step ${i}: ${p2Positions[i - 1]} -> ${p2Positions[i]}`);
  }
}

if (monotonicForward && p2.position.x > initialP2X + 0.1) {
  console.log("✅ PASS: P2 was pushed forward smoothly with zero jitter/rubber-banding!");
} else {
  console.error("❌ FAIL: P2 jittered or didn't move forward!");
  process.exit(1);
}

// Test 3: P1 stops pushing -> P2 comes to a full stop via friction
for (let t = 0; t < 30; t++) {
  p2.updatePosition(dt, arena);
}

console.log(`[Test 3] After P1 stops pushing: P2 final velocity vx = ${p2.velocity.x}`);
if (p2.velocity.x === 0 && p2.velocity.y === 0) {
  console.log("✅ PASS: P2 came to a crisp, complete stop via ground friction!");
} else {
  console.error("❌ FAIL: P2 kept sliding after push stopped!");
  process.exit(1);
}

console.log("\n🎉 ALL TESTS PASSED!");
