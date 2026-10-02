import { Character } from "../src/character/Character";
import { ThrowModule } from "../src/character/ThrowModule";
import { Arena } from "../src/engine/Arena";
import { GameObject } from "../src/engine/GameObject";

console.log("=== Testing Auto-Aim Target Height and Height Limits ===");

const arena = new Arena(20, 14, 1.0);

// Setup thrower
const thrower = new Character({ playerId: "keyboard", playerNumber: 1, x: 5, y: 5, color: "#f59e0b" });
thrower.throwModule = new ThrowModule();
thrower.throwModule.maxThrowHeight = 5.0; // 5 units max throw height reach

// Held rock to throw
const heldRock = new GameObject({
  id: "held-rock",
  position: { x: 5, y: 5, z: 0.5 },
  mass: 1.0,
  colliderRadius: 0.35,
  isStatic: false,
});
thrower.heldObject = heldRock;
heldRock.isHeld = true;
heldRock.heldBy = thrower;

// 1. Create a high-up moving target object (e.g. rock at altitude z = 3.5)
const highTarget = new GameObject({
  id: "high-target",
  position: { x: 9.0, y: 5.0, z: 3.5 },
  mass: 1.0,
  colliderRadius: 0.35,
  isStatic: false,
});

arena.entities = [thrower, heldRock, highTarget];

// Aim at the visual screen position of the high target:
// visualY = y - z * hoverScale = 5.0 - 3.5 * 0.5 = 3.25
const aimX = 9.0;
const aimY = 5.0 - 3.5 * 0.5; // 3.25

// Test 1: Calculate trajectory with autoLock = true
const traj = thrower.throwModule.calculateTrajectory(
  thrower,
  aimX,
  aimY,
  arena,
  arena.entities,
  0.5,
  true // autoLock active
);

if (!traj) {
  throw new Error("Expected trajectory to be calculated, got null");
}

console.log("Test 1 - High target auto-lock:");
console.log(`   isAutoLocked: ${traj.isAutoLocked}`);
console.log(`   targetObject: ${traj.targetObject?.id}`);
console.log(`   targetSurfaceHeight: ${traj.targetSurfaceHeight}`);
console.log(`   landPoint: (${traj.landPoint.x.toFixed(2)}, ${traj.landPoint.y.toFixed(2)}, ${traj.landPoint.z?.toFixed(2)})`);
console.log(`   peakHeight: ${traj.peakHeight?.toFixed(2)}`);

if (!traj.isAutoLocked || traj.targetObject?.id !== "high-target") {
  throw new Error("Expected trajectory to be auto-locked on 'high-target'");
}

// targetSurfaceHeight and landPoint.z should match the target's height 3.5!
if (Math.abs((traj.targetSurfaceHeight ?? 0) - 3.5) > 0.01) {
  throw new Error(`Expected targetSurfaceHeight to be 3.5, got: ${traj.targetSurfaceHeight}`);
}
if (Math.abs((traj.landPoint.z ?? 0) - 3.5) > 0.01) {
  throw new Error(`Expected landPoint.z to be 3.5, got: ${traj.landPoint.z}`);
}

// Trajectory's final point z should reach 3.5!
const finalPoint = traj.points[traj.points.length - 1];
console.log(`   finalPoint: (${finalPoint.x.toFixed(2)}, ${finalPoint.y.toFixed(2)}, ${finalPoint.z.toFixed(2)})`);
if (Math.abs(finalPoint.z - 3.5) > 0.05) {
  throw new Error(`Expected final trajectory point z to reach 3.5, got: ${finalPoint.z}`);
}

console.log("✓ Test 1 passed: Trajectory reaches the high-up object's 3D altitude!");

// Test 2: Moving target updates trajectory
console.log("\nTest 2 - Moving target position update:");
// Target moves to (10.0, 6.0, 4.2)
highTarget.position.x = 10.0;
highTarget.position.y = 6.0;
highTarget.position.z = 4.2;

const traj2 = thrower.throwModule.calculateTrajectory(
  thrower,
  10.0,
  6.0 - 4.2 * 0.5,
  arena,
  arena.entities,
  0.5,
  true
);

if (!traj2 || Math.abs((traj2.targetSurfaceHeight ?? 0) - 4.2) > 0.01) {
  throw new Error(`Expected targetSurfaceHeight to update to 4.2, got: ${traj2?.targetSurfaceHeight}`);
}
console.log(`   Updated targetSurfaceHeight: ${traj2.targetSurfaceHeight}`);
console.log("✓ Test 2 passed: Moving target position dynamically updates trajectory reach!");

// Test 3: Maximum throw height limit
console.log("\nTest 3 - Maximum throw height limit:");
// Target flies way too high: z = 12.0 (thrower maxThrowHeight = 5.0, startZ = 0.5 -> maxAllowed = 5.5)
highTarget.position.z = 12.0;

const traj3 = thrower.throwModule.calculateTrajectory(
  thrower,
  10.0,
  6.0 - 12.0 * 0.5,
  arena,
  arena.entities,
  0.5,
  true
);

if (!traj3) {
  throw new Error("Expected trajectory to be calculated for clamped target");
}

const expectedMax = (traj3.points[0]?.z ?? 1.05) + thrower.throwModule.maxThrowHeight;
console.log(`   Target actual z: ${highTarget.position.z}`);
console.log(`   Clamped targetSurfaceHeight: ${traj3.targetSurfaceHeight}`);
console.log(`   Expected max allowed z: ${expectedMax}`);

if (Math.abs((traj3.targetSurfaceHeight ?? 0) - expectedMax) > 0.01) {
  throw new Error(`Expected targetSurfaceHeight to be clamped to ${expectedMax}, got: ${traj3.targetSurfaceHeight}`);
}
console.log("✓ Test 3 passed: Excessive height is clamped to max throw height!");

// Test 4: Physical throw execution gives object proper launch velocities
console.log("\nTest 4 - Physical throw execution:");
highTarget.position.z = 3.0; // Target at z = 3.0

const thrown = thrower.throwModule.throwHeldObject(
  thrower,
  10.0,
  6.0 - 3.0 * 0.5,
  arena,
  arena.entities,
  0.5,
  true
);

if (!thrown) {
  throw new Error("Expected thrown object, got null");
}

console.log(`   Thrown velocity: vx=${thrown.velocity.x.toFixed(2)}, vy=${thrown.velocity.y.toFixed(2)}, vz=${thrown.verticalVelocity.toFixed(2)}`);
if (thrown.verticalVelocity <= 0) {
  throw new Error(`Expected positive launch vertical velocity to reach high target, got: ${thrown.verticalVelocity}`);
}
console.log("✓ Test 4 passed: Thrown object has upward vertical velocity to reach target height!");

console.log("\n=== ALL AUTO-AIM HEIGHT TESTS PASSED SUCCESSFULLY! ===");
