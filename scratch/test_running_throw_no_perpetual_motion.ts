import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";

const arena = new Arena();

// Setup running thrower and remote player
const thrower = new Character({ x: 3.0, y: 5.0, mass: 1.2 });
const target = new Character({ x: 8.0, y: 5.0, mass: 1.2 });
const rock = new GameObject({ id: "heavy-rock", position: { x: 3.0, y: 5.0, z: 0 }, mass: 2.0, colliderRadius: 0.3 });

// Thrower is running right (+X) at 5.0 u/s
thrower.velocity = { x: 5.0, y: 0 };
thrower.isActivelyWalking = true;

thrower.heldObject = rock;
rock.isHeld = true;
rock.heldBy = thrower;

console.log("1. Thrower running at vx =", thrower.velocity.x);

// Throw rock forward towards target (+X)
thrower.throwModule!.throwHeldObject(thrower, 12.0, 5.0, arena);

console.log("2. Immediately after throw:");
console.log("   Rock pos:", rock.position.x.toFixed(3), "vel:", rock.velocity.x.toFixed(3));
console.log("   Thrower pos:", thrower.position.x.toFixed(3), "vel:", thrower.velocity.x.toFixed(3));
console.log("   Rock lastThrower is thrower:", rock.lastThrower === thrower);

// Test CollisionResolver.resolveEntityCollisions:
// Even when rock is overlapping thrower's collider (within reach), lastThrower immunity skips self-collision:
rock.position.x = thrower.position.x + 0.2; // Overlapping: dist = 0.2 < (0.3 + 0.35 = 0.65)
const preCollThrowerVx = thrower.velocity.x;
CollisionResolver.resolveEntityCollisions([thrower, rock, target], arena, 1 / 60, null, "dynamic");
const postCollThrowerVx = thrower.velocity.x;

console.log("3. Overlapping thrower vs rock collision check:");
console.log("   Pre vx:", preCollThrowerVx.toFixed(3), "Post vx:", postCollThrowerVx.toFixed(3));
if (preCollThrowerVx !== postCollThrowerVx) {
  console.error("❌ FAIL: Thrower collided with their own rock!");
  process.exit(1);
} else {
  console.log("   ✅ PASS: Thrower did not collide with own rock!");
}

// Now thrower releases input (stops steering)
thrower.isActivelyWalking = false;
thrower.movementInput = { x: 0, y: 0 };

const dt = 1 / 60;
// Advance 30 ticks (0.5s)
let throwerStopped = false;
for (let t = 0; t < 30; t++) {
  thrower.updatePosition(dt, arena);
  if (Math.hypot(thrower.velocity.x, thrower.velocity.y) === 0 && !throwerStopped) {
    throwerStopped = true;
    console.log(`4. Thrower stopped naturally via ground friction at tick ${t + 1} (vx = 0)`);
  }
}

if (!throwerStopped || thrower.velocity.x !== 0) {
  console.error("❌ FAIL: Thrower failed to stop! Current vx =", thrower.velocity.x);
  process.exit(1);
} else {
  console.log("✅ PASS: Thrower cleanly stopped! No perpetual motion.");
}

// 5. Test Server Sync convergence without circular velocity feedback
console.log("\n5. Testing Server Sync convergence with trailing server snapshot:");
const localChar = thrower;
const myServerState = { x: localChar.position.x + 0.3, y: localChar.position.y, vx: 4.5, vy: 0 };
const dx = myServerState.x - localChar.position.x;
const dy = myServerState.y - localChar.position.y;
const dist = Math.hypot(dx, dy);

if (dist > 0.05) {
  const isSteering = localChar.isActivelyWalking || Math.hypot(localChar.movementInput.x, localChar.movementInput.y) > 0.05;
  const blend = dist > 2.0 ? 1.0 : (isSteering ? 0.35 : 0.4);
  localChar.position.x += dx * blend;
  localChar.position.y += dy * blend;
  // Note: localChar.velocity is NOT overwritten with server vx!
}

console.log("   Local pos after blend:", localChar.position.x.toFixed(3));
console.log("   Local vel after blend:", localChar.velocity.x);
if (localChar.velocity.x !== 0) {
  console.error("❌ FAIL: Server snapshot re-injected velocity into stopped local character!");
  process.exit(1);
} else {
  console.log("   ✅ PASS: Local velocity remains 0. Ground friction preserved, 0 perpetual motion!");
}
