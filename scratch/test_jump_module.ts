import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ClimbingModule } from "../src/character/ClimbingModule.js";
import { WalkingModule } from "../src/character/WalkingModule.js";

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
char.position.z = 0;
char.verticalVelocity = 0;
char.supportingSurfaceHeight = 0;
char.standingWall = null;

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

// 6. Directional Jump Velocity Test (Jump force at 45 degrees to jump direction)
console.log("\n6. Testing Directional Jump at 45 Degrees to Jump Direction:");
// Reset character to ground at rest
char.position.x = 5.0;
char.position.y = 5.0;
char.position.z = 0;
char.verticalVelocity = 0;
char.velocity.x = 0;
char.velocity.y = 0;
char.supportingSurfaceHeight = 0;

// Jump with directional input { x: 1, y: 0 }
const dirJumped = char.jump(arena, { x: 1, y: 0 });
console.log("  Directional jump returned:", dirJumped);
console.log("  Takeoff vz:", char.verticalVelocity.toFixed(4), "u/s");
console.log("  Takeoff vx:", char.velocity.x.toFixed(4), "u/s");
console.log("  Takeoff vy:", char.velocity.y.toFixed(4), "u/s");

const jumpAngleDeg = Math.atan2(char.verticalVelocity, Math.hypot(char.velocity.x, char.velocity.y)) * (180 / Math.PI);
console.log(`  Trajectory angle with horizontal plane: ${jumpAngleDeg.toFixed(2)}°`);

if (Math.abs(jumpAngleDeg - 45.0) > 0.1) {
  console.error(`FAILED: Expected jump angle of 45°, got ${jumpAngleDeg.toFixed(2)}°`);
  process.exit(1);
}
console.log("  PASS: Jump force directed at exactly 45 degrees to the jump direction!");

// 7. Testing Jump Off Wall Edge with Wall Assist Clamp
console.log("\n7. Testing Jump Off Wall Edge with Wall Edge Assist Clamp:");
char.climbingModule = null;
char.position.x = wall.x + wall.width - 0.05; // Near right edge of wall
char.position.y = wall.y + 0.5;
char.position.z = wall.wallHeight;
char.supportingSurfaceHeight = wall.wallHeight;
char.standingWall = wall;
char.verticalVelocity = 0;
char.velocity.x = 0;
char.velocity.y = 0;
if (char.wallEdgeAssistModule) {
  char.wallEdgeAssistModule.isAssistClampArmed = true;
}

// Jump to the right (off the ledge into the open)
const ledgeJump = char.jump(arena, { x: 1, y: 0 });
console.log("  Ledge jump returned:", ledgeJump);
console.log("  isAssistClampArmed immediately after jump:", char.wallEdgeAssistModule?.isAssistClampArmed);
console.log("  Horizontal vx immediately after jump:", char.velocity.x.toFixed(4), "u/s");

if (char.wallEdgeAssistModule?.isAssistClampArmed) {
  console.error("FAILED: wallEdgeAssistModule was not disarmed on jump!");
  process.exit(1);
}

// Simulate physics until landing on ground
let airborneTicks = 0;
const startX = char.position.x;
while (char.position.z > 0.001 && airborneTicks < 120) {
  char.updatePosition(dt, arena);
  airborneTicks++;
}

console.log(`  Landed after ${airborneTicks} ticks (${(airborneTicks * dt).toFixed(3)}s)`);
console.log(`  Start X: ${startX.toFixed(3)}, Landed X: ${char.position.x.toFixed(3)}`);
console.log(`  Horizontal distance cleared: ${(char.position.x - startX).toFixed(3)} units`);

if (char.position.x <= startX + 0.15) {
  console.error("FAILED: Character did not move forward through the air off the wall ledge!");
  process.exit(1);
}
console.log("  PASS: Character successfully cleared the wall edge assist obstacle!");

// 8. Testing Wall Assist Only Operates at Exactly Wall Height Standing on Top of Wall
console.log("\n8. Testing Wall Assist Strictly Requires Exactly Wall Height Standing on Top of Wall:");
// 8a. Airborne above wall (z = 1.20, standing on wall top is false)
char.position.x = wall.x + wall.width - 0.05;
char.position.y = wall.y + 0.5;
char.position.z = 1.20;
char.verticalVelocity = 0;
char.supportingSurfaceHeight = wall.wallHeight;
char.standingWall = wall;
char.velocity.x = 2.0; // Moving outward past edge
char.updatePosition(dt, arena);
console.log("  Airborne at z=1.20 (above wall top): isAssistClampArmed =", char.wallEdgeAssistModule?.isAssistClampArmed);
if (char.wallEdgeAssistModule?.isAssistClampArmed) {
  console.error("FAILED: wall assist armed while airborne above wall height!");
  process.exit(1);
}
console.log("  PASS: Wall assist remains disarmed when airborne above wall height.");

// 8b. Grounded (z = 0)
char.position.x = wall.x - 0.10;
char.position.y = wall.y + 0.5;
char.position.z = 0;
char.verticalVelocity = 0;
char.supportingSurfaceHeight = 0;
char.standingWall = null;
char.updatePosition(dt, arena);
console.log("  Grounded at z=0: isAssistClampArmed =", char.wallEdgeAssistModule?.isAssistClampArmed);
if (char.wallEdgeAssistModule?.isAssistClampArmed) {
  console.error("FAILED: wall assist armed while grounded!");
  process.exit(1);
}
console.log("  PASS: Wall assist remains disarmed when on ground.");

// 8c. Standing at exactly wall height resting on wall top
char.position.x = wall.x + 0.5;
char.position.y = wall.y + 0.5;
char.position.z = wall.wallHeight;
char.verticalVelocity = 0;
char.supportingSurfaceHeight = wall.wallHeight;
char.standingWall = wall;
char.updatePosition(dt, arena);
// Move near edge (within hang distance)
char.position.x = wall.x + wall.width - 0.05;
char.updatePosition(dt, arena);
console.log("  Resting at exactly wall height (z=1.00): isAssistClampArmed =", char.wallEdgeAssistModule?.isAssistClampArmed);
if (!char.wallEdgeAssistModule?.isAssistClampArmed) {
  console.error("FAILED: wall assist did not arm when resting on wall top at exactly wall height!");
  process.exit(1);
}
console.log("  PASS: Wall assist correctly arms when resting on top of a wall at exactly wall height!");

// 9. Testing Hold-Down Jump: immediate takeoff the moment character touches the ground
console.log("\n9. Testing Hold-Down Jump (Auto-jump upon touching the ground):");
// Reset character to ground at rest
char.position.x = 5.0;
char.position.y = 5.0;
char.position.z = 0;
char.verticalVelocity = 0;
char.supportingSurfaceHeight = 0;
char.standingWall = null;
char.climbingModule = null; // Default character has no climbing module

// Simulate tick with isJumpHeld = true: initial takeoff
char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, true);
console.log("  Initial jump vz:", char.verticalVelocity.toFixed(3), "u/s, z:", char.position.z.toFixed(3));
if (char.verticalVelocity <= 8.0) {
  console.error("FAILED: Initial jump failed to initiate!");
  process.exit(1);
}

// Keep holding jump throughout flight
let midAirTicks = 0;
let touchdownTick = 0;
for (let t = 1; t <= 100; t++) {
  const prevZ = char.position.z;
  const prevVz = char.verticalVelocity;
  char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, true);
  if (prevVz < 0 && char.verticalVelocity > 8.0) {
    // Character just touched the ground and immediately launched into next jump!
    touchdownTick = t;
    console.log(`  Touched down at tick ${t}: immediately took off with vz = ${char.verticalVelocity.toFixed(3)} u/s, z = ${char.position.z.toFixed(3)}`);
    break;
  }
  if (char.position.z > 0.05) {
    midAirTicks++;
  }
}

if (touchdownTick === 0) {
  console.error("FAILED: Character did not immediately jump upon touching the ground while holding jump!");
  process.exit(1);
}
console.log("  PASS: Held jump continuously and took off the exact moment of touchdown!");

// 9b. Testing pressing/holding jump in mid-air: launches the moment of ground contact
char.position.x = 5.0;
char.position.y = 5.0;
char.position.z = 0.8;
char.verticalVelocity = -4.0; // Falling towards ground
char.supportingSurfaceHeight = 0;
char.standingWall = null;

// While falling, player begins holding jump input (Space / A)
let midAirHeldLanded = false;
for (let t = 1; t <= 40; t++) {
  char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, true);
  if (char.verticalVelocity > 8.0) {
    midAirHeldLanded = true;
    console.log(`  Mid-air hold landed at tick ${t}: immediately took off with vz = ${char.verticalVelocity.toFixed(3)} u/s, z = ${char.position.z.toFixed(3)}`);
    break;
  }
}

if (!midAirHeldLanded) {
  console.error("FAILED: Character did not jump upon touching ground when holding jump from mid-air!");
  process.exit(1);
}
console.log("  PASS: Holding jump in mid-air jumped the moment character touched the ground!");

// 9c. Testing releasing jump before landing: character stays grounded without jumping
char.position.x = 5.0;
char.position.y = 5.0;
char.position.z = 0.5;
char.verticalVelocity = -3.0; // Falling towards ground
char.supportingSurfaceHeight = 0;
char.standingWall = null;

for (let t = 1; t <= 40; t++) {
  char.updateCharacter(dt, { x: 0, y: 0 }, false, null, arena, false); // NOT holding jump
}
console.log("  Released jump landing: z =", char.position.z.toFixed(3), "vz =", char.verticalVelocity.toFixed(3), "isRestingOnSurface =", char.isRestingOnSurface);
if (char.position.z !== 0 || char.verticalVelocity !== 0 || !char.isRestingOnSurface) {
  console.error("FAILED: Character should be resting on ground when jump is released!");
  process.exit(1);
}
console.log("  PASS: Character safely rests on ground when jump is not held!");

// 10. Testing WalkingModule Air Control (walkInAir toggle and mid-air walking force)
console.log("\n10. Testing WalkingModule Air Control (walkInAir):");
char.walkingModule = new WalkingModule();
char.walkingModule.walkInAir = true;

// Reset character in mid-air with zero horizontal velocity
char.position.x = 5.0;
char.position.y = 5.0;
char.position.z = 1.0;
char.verticalVelocity = 0;
char.supportingSurfaceHeight = 0;
char.velocity.x = 0;
char.velocity.y = 0;

// 10a. With walkInAir = true, movement input in air should apply walking force
char.walkingModule.update(char, { x: 1, y: 0 }, dt, arena);
console.log("  Mid-air with walkInAir=true, holding Right: vx =", char.velocity.x.toFixed(4), "u/s");
if (char.velocity.x <= 0.1) {
  console.error("FAILED: WalkingModule did not apply walking force in the air when walkInAir=true!");
  process.exit(1);
}
console.log("  PASS: Walking force successfully applied in mid-air for air control!");

// 10b. With no movement input in mid-air, character should coast (no air braking)
const coastVx = char.velocity.x;
char.walkingModule.update(char, { x: 0, y: 0 }, dt, arena);
console.log("  Mid-air releasing movement input: vx =", char.velocity.x.toFixed(4), "u/s (expected preserved:", coastVx.toFixed(4), ")");
if (char.velocity.x !== coastVx) {
  console.error("FAILED: Character should not brake in mid-air when releasing input!");
  process.exit(1);
}
console.log("  PASS: Ballistic momentum preserved in mid-air when not steering!");

// 10c. With walkInAir = false, no walking force should apply in mid-air
char.walkingModule.walkInAir = false;
char.velocity.x = 0;
char.velocity.y = 0;
char.walkingModule.update(char, { x: 1, y: 0 }, dt, arena);
console.log("  Mid-air with walkInAir=false, holding Right: vx =", char.velocity.x.toFixed(4), "u/s");
if (char.velocity.x !== 0) {
  console.error("FAILED: Walking force should NOT apply in mid-air when walkInAir=false!");
  process.exit(1);
}
console.log("  PASS: Air control cleanly disabled when walkInAir=false!");

console.log("\n=== ALL JUMP & WALL EDGE ASSIST TESTS PASSED! ===");


