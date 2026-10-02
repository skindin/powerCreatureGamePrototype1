import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { SnapshotManager } from "../src/engine/physics/Snapshot.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log("=== Phase A: Collision Resolution & Snapshot Verification ===\n");

const arena = new Arena();
const dt = 1 / 60;

// Test 1: Dynamic Mode Promotion
console.log("--- Test 1: Dynamic Mode Promotion ---");
const slowObj = new GameObject({
  position: { x: 5, y: 5 },
  velocity: { x: 1.0, y: 0.0 }, // 1 u/s -> displacement = 1/60 = 0.0167 u << 0.35 * 0.5 (0.175 u)
  colliderRadius: 0.35,
  collisionMode: "dynamic",
});
assert(slowObj.getEffectiveCollisionMode(dt) === "discrete", "Slow object resolves to discrete mode in dynamic policy");

const fastObj = new GameObject({
  position: { x: 5, y: 5 },
  velocity: { x: 25.0, y: 0.0 }, // 25 u/s -> displacement = 25/60 = 0.416 u > 0.35 * 0.5 (0.175 u)
  colliderRadius: 0.35,
  collisionMode: "dynamic",
});
assert(fastObj.getEffectiveCollisionMode(dt) === "continuous", "Fast object resolves to continuous swept mode in dynamic policy");

// Test 2: Discrete TOI Rollback on Overlap
console.log("\n--- Test 2: Discrete TOI Rollback ---");
const ballA = new GameObject({
  position: { x: 4.8, y: 5.0 },
  velocity: { x: 3.0, y: 0.0 },
  colliderRadius: 0.30,
  mass: 1.0,
  bounceMod: 0.8,
  collisionMode: "discrete",
});
const ballB = new GameObject({
  position: { x: 5.2, y: 5.0 }, // distance = 0.4 < 0.6 (minDist) -> overlapping!
  velocity: { x: -3.0, y: 0.0 },
  colliderRadius: 0.30,
  mass: 1.0,
  bounceMod: 0.8,
  collisionMode: "discrete",
});

const resolvedDiscrete = CollisionResolver.resolvePairDiscreteTOI(ballA, ballB, arena, dt);
assert(resolvedDiscrete === true, "Discrete TOI detected and resolved overlapping contact");
assert(ballA.velocity.x < 0, `Ball A bounced backward (vx = ${ballA.velocity.x.toFixed(2)})`);
assert(ballB.velocity.x > 0, `Ball B bounced backward (vx = ${ballB.velocity.x.toFixed(2)})`);
assert(ballA.lastCollisionType === "discrete_toi", "Collision type recorded as discrete_toi");

// Test 3: Continuous Swept (CCD) High-Speed Tunneling Prevention
console.log("\n--- Test 3: Continuous Swept (CCD) High-Speed Impact ---");
// Bullet traveling at 40 u/s towards resting target
const bullet = new GameObject({
  position: { x: 2.0, y: 5.0 },
  velocity: { x: 40.0, y: 0.0 }, // In 1 tick moves 40/60 = 0.67u
  colliderRadius: 0.15,
  mass: 0.5,
  bounceMod: 0.9,
  collisionMode: "continuous",
});
const restingCrate = new GameObject({
  position: { x: 2.4, y: 5.0 }, // distance = 0.4u. Bullet would jump to 2.67u (tunneling 0.27u past crate!)
  velocity: { x: 0.0, y: 0.0 },
  colliderRadius: 0.25,
  mass: 2.0,
  bounceMod: 0.5,
  collisionMode: "discrete", // Discrete crate, but bullet is Continuous!
});

// Advance positions by v * dt as step begins
bullet.position.x += bullet.velocity.x * dt;
bullet.position.y += bullet.velocity.y * dt;

CollisionResolver.resolveEntityCollisions([bullet, restingCrate], arena, dt, null, "dynamic");
assert(bullet.lastCollisionType === "continuous_swept", "Continuous swept collision supersedes discrete crate");
assert(bullet.velocity.x < 0, `High-speed bullet bounced backward (vx = ${bullet.velocity.x.toFixed(2)})`);
assert(restingCrate.velocity.x > 0, `Resting crate received forward impulse (vx = ${restingCrate.velocity.x.toFixed(2)})`);

// Test 4: SnapshotManager Serialization & State Restoration
console.log("\n--- Test 4: SnapshotManager Deterministic State Restoration ---");
const snap = SnapshotManager.capture(100, [], [bullet, restingCrate]);
assert(snap.tick === 100, "Snapshot captured tick 100 correctly");
assert(snap.entities.length === 2, "Snapshot recorded 2 entities");

const savedBulletX = bullet.position.x;
const savedBulletVx = bullet.velocity.x;

// Perturb state
bullet.position.x = 999.0;
bullet.velocity.x = 0.0;

// Restore from snapshot
SnapshotManager.apply(snap, [], [bullet, restingCrate]);
assert(Math.abs(bullet.position.x - savedBulletX) < 0.001, `Restored bullet position: ${bullet.position.x} === ${savedBulletX}`);
assert(Math.abs(bullet.velocity.x - savedBulletVx) < 0.001, `Restored bullet velocity: ${bullet.velocity.x} === ${savedBulletVx}`);

const divergenceCheck = SnapshotManager.hasDivergence(snap, snap, 0.01, 0.01);
assert(!divergenceCheck.diverged, "Self-comparison reports zero divergence");

console.log("\n🎉 ALL PHASE A VERIFICATION TESTS PASSED!");
