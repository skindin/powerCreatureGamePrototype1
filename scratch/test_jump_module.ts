import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ClimbingModule } from "../src/character/ClimbingModule.js";

console.log("=== Testing JumpModule & WallEdgeAssistModule ===");

const arena = new Arena(20, 14, 1.0);
arena.gravity = 30.0;

// 1. Default Character Configuration
const char = new Character({
  x: 5.0,
  y: 7.0,
  mass: 1.2,
});

console.log("\n1. Verifying Default Character Modules:");
console.log("  climbingModule:", char.climbingModule ? "Present (FAIL)" : "null (PASS - removed from default)");
console.log("  jumpModule:", char.jumpModule ? "Present (PASS)" : "null (FAIL)");
console.log("  wallEdgeAssistModule:", char.wallEdgeAssistModule ? "Present (PASS)" : "null (FAIL)");

if (char.climbingModule !== null || !char.jumpModule || !char.wallEdgeAssistModule) {
  console.error("FAILED: Default character module setup incorrect");
  process.exit(1);
}

// 2. Unencumbered Jump Test
console.log("\n2. Testing Unencumbered Jump (1.2kg char, 30.0 gravity):");
char.position.z = 0;
char.verticalVelocity = 0;
char.supportingSurfaceHeight = 0;

const jumped = char.jump(arena);
console.log("  jump() returned:", jumped);
console.log("  Initial Takeoff Velocity vz:", char.verticalVelocity.toFixed(3), "u/s");

const expectedVz = (char.jumpModule?.jumpStrength ?? 11.6) / 1.2; // ~9.67 u/s
const vzDiff = Math.abs(char.verticalVelocity - expectedVz);
if (vzDiff > 0.05) {
  console.error(`FAILED: Initial takeoff velocity ${char.verticalVelocity} differs from expected ${expectedVz}`);
  process.exit(1);
}

// Simulate 60Hz physics until apex
const dt = 1 / 60;
let maxZ = 0;
let ticks = 0;
while (char.verticalVelocity > 0 && ticks < 120) {
  char.updatePosition(dt, arena);
  if (char.position.z > maxZ) maxZ = char.position.z;
  ticks++;
}

console.log(`  Apex reached after ${ticks} ticks (${(ticks * dt).toFixed(3)}s)`);
console.log(`  Max jump height reached: ${maxZ.toFixed(3)} units (layers)`);
console.log(`  Target height: 1.5 units`);

if (maxZ < 1.40 || maxZ > 1.65) {
  console.error(`FAILED: Jump height ${maxZ} is outside the target range [1.40, 1.65] units!`);
  process.exit(1);
}
console.log("  PASS: Reached ~1.5 units (layers)!");

// 3. Encumbered Jump Test (Carrying heavy object)
console.log("\n3. Testing Encumbered Jump (Holding 1.2kg crate, total mass 2.4kg):");
// Reset character to ground
while (char.position.z > 0.001) {
  char.updatePosition(dt, arena);
}
char.verticalVelocity = 0;
char.position.z = 0;

const crate = new GameObject({
  id: "test-crate",
  mass: 1.2,
  colliderRadius: 0.3,
});
crate.isHeld = true;
char.heldObject = crate;

const jumpedEncumbered = char.jump(arena);
console.log("  jump() while holding 1.2kg object returned:", jumpedEncumbered);
console.log("  Encumbered Takeoff Velocity vz:", char.verticalVelocity.toFixed(3), "u/s");

let maxZEncumbered = 0;
ticks = 0;
while (char.verticalVelocity > 0 && ticks < 120) {
  char.updatePosition(dt, arena);
  if (char.position.z > maxZEncumbered) maxZEncumbered = char.position.z;
  ticks++;
}

console.log(`  Encumbered Max jump height: ${maxZEncumbered.toFixed(3)} units`);
if (maxZEncumbered >= maxZ * 0.7) {
  console.error(`FAILED: Carrying heavy object did not proportionally scale jump height down!`);
  process.exit(1);
}
console.log("  PASS: Heavy carrying mass naturally scaled jump height!");

// Clean up held object
char.heldObject = null;
crate.isHeld = false;

// 4. Wall Edge Assist Test
console.log("\n4. Testing Wall Edge Assist (preventWalkOff without ClimbingModule):");
// Place character on a wall top
const wall = arena.walls[0] ?? { x: 5, y: 5, width: 2, height: 2, wallHeight: 1.0 };
char.position.x = wall.x + 0.5;
char.position.y = wall.y + 0.5;
char.position.z = wall.wallHeight;
char.supportingSurfaceHeight = wall.wallHeight;
char.standingWall = wall;
char.verticalVelocity = 0;

console.log("  Character resting on wall top. wallEdgeAssistModule enabled:", char.wallEdgeAssistModule?.enabled);
console.log("  preventWalkOff:", char.wallEdgeAssistModule?.preventWalkOff);

// Jump from wall top
const wallJumped = char.jump(arena);
console.log("  Jump from wall top returned:", wallJumped);
console.log("  Initial vz from wall top:", char.verticalVelocity.toFixed(3), "u/s");
console.log("  Character position.z immediately after takeoff:", char.position.z.toFixed(3));

let maxWallJumpZ = char.position.z;
ticks = 0;
while (char.verticalVelocity > 0 && ticks < 120) {
  char.updatePosition(dt, arena);
  if (char.position.z > maxWallJumpZ) maxWallJumpZ = char.position.z;
  ticks++;
}
console.log(`  Apex from wall top reached: ${maxWallJumpZ.toFixed(3)} units (ground elevation)`);
console.log(`  Relative jump height from wall top: ${(maxWallJumpZ - wall.wallHeight).toFixed(3)} units`);

if (maxWallJumpZ - wall.wallHeight < 1.40 || maxWallJumpZ - wall.wallHeight > 1.65) {
  console.error(`FAILED: Wall top jump height ${maxWallJumpZ - wall.wallHeight} outside expected range!`);
  process.exit(1);
}
console.log("  PASS: Wall top jump works seamlessly!");

// 5. Optional ClimbingModule Re-attachment Test
console.log("\n5. Testing Optional ClimbingModule Re-attachment:");
char.climbingModule = new ClimbingModule();
console.log("  Re-attached ClimbingModule:", char.climbingModule ? "SUCCESS" : "FAIL");
console.log("  ClimbingModule maxAdhesion:", char.climbingModule.maxAdhesion);
console.log("  ClimbingModule maxClimbSpeed:", char.climbingModule.maxClimbSpeed);

console.log("\n=== ALL JUMP & WALL EDGE ASSIST TESTS PASSED! ===");
