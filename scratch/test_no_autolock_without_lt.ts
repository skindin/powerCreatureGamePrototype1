import { Character } from "../src/character/Character.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";

const arena = new Arena(20, 14, 1.0);
const character = new Character({
  x: 5.0,
  y: 7.0,
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
});

const heldStone = new GameObject({
  id: "held-stone",
  position: { x: 5.0, y: 7.0, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
  hasGravity: true,
  hasVerticalVelocity: true,
});

character.heldObject = heldStone;
heldStone.isHeld = true;
heldStone.heldBy = character;

// Place a target box at open trench (8.0, 7.0)
const targetBox = new GameObject({
  id: "target-box",
  name: "Target Box",
  position: { x: 8.0, y: 7.0, z: 0 },
  mass: 1.0,
  colliderRadius: 0.4,
  hasGravity: true,
  hasVerticalVelocity: true,
});

const entities = [character, heldStone, targetBox];

console.log("=== Testing Trajectory AutoLock Behavior ===");

// 1. Aim slightly offset from the target box (at open ground (8.2, 7.2)), with autoLock = false (NOT holding LT)
const aimX = 8.2;
const aimY = 7.2;

const trajNoLock = character.throwModule.calculateTrajectory(
  character,
  aimX,
  aimY,
  arena,
  entities,
  0.5,
  false // autoLock = false!
);

console.log("Test 1: autoLock = false (LT NOT held)");
console.log("   isAutoLocked:", trajNoLock?.isAutoLocked);
console.log("   targetObject:", trajNoLock?.targetObject?.id ?? null);
console.log("   landPoint.x:", trajNoLock?.landPoint.x.toFixed(2), "aimX:", aimX);
console.log("   landPoint.y:", trajNoLock?.landPoint.y.toFixed(2), "aimY:", aimY);

if (trajNoLock?.isAutoLocked) {
  throw new Error("FAIL: isAutoLocked should be FALSE when autoLock is false!");
}
if (trajNoLock?.targetObject) {
  throw new Error("FAIL: targetObject should be null when autoLock is false!");
}
if (Math.abs(trajNoLock!.landPoint.x - aimX) > 0.05 || Math.abs(trajNoLock!.landPoint.y - aimY) > 0.05) {
  throw new Error("FAIL: Trajectory should aim at cursor coordinates, NOT snap to targetBox!");
}
console.log("   PASS: Trajectory did not snap to any object without LT held.");

// 2. Now test with autoLock = true (holding LT)
const trajWithLock = character.throwModule.calculateTrajectory(
  character,
  aimX,
  aimY,
  arena,
  entities,
  0.5,
  true // autoLock = true!
);

console.log("Test 2: autoLock = true (LT held)");
console.log("   isAutoLocked:", trajWithLock?.isAutoLocked);
console.log("   targetObject:", trajWithLock?.targetObject?.id ?? null);
console.log("   landPoint.x:", trajWithLock?.landPoint.x.toFixed(2), "targetBox.x:", targetBox.position.x);
console.log("   landPoint.y:", trajWithLock?.landPoint.y.toFixed(2), "targetBox.y:", targetBox.position.y);

if (!trajWithLock?.isAutoLocked) {
  throw new Error("FAIL: isAutoLocked should be TRUE when autoLock is true!");
}
if (trajWithLock?.targetObject?.id !== "target-box") {
  throw new Error("FAIL: targetObject should be target-box when autoLock is true!");
}
if (Math.abs(trajWithLock!.landPoint.x - targetBox.position.x) > 0.01) {
  throw new Error("FAIL: Trajectory should snap to targetBox position when autoLock is true!");
}
console.log("   PASS: Trajectory locked onto targetBox cleanly when LT is held.");

console.log("SUCCESS! All AutoLock tests passed cleanly!");
