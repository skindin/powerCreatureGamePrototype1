import { Arena } from "../src/engine/Arena";
import { Character } from "../src/character/Character";
import { GameObject } from "../src/engine/GameObject";
import { ThrowModule } from "../src/character/ThrowModule";

console.log("=== Testing Wall Roof & Object Cursor Throw Targeting ===");

const arena = new Arena(20, 14, 1.0);
const character = new Character({
  id: "char1",
  position: { x: 2, y: 5, z: 0 },
  playerColor: "#f59e0b",
  playerNumber: 1,
});

const rock = new GameObject({
  id: "rock1",
  position: { x: 2, y: 5, z: 0 },
  mass: 1.0,
  colliderRadius: 0.35,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
  hasGravity: true,
});

character.heldObject = rock;
rock.isHeld = true;
rock.heldBy = character;
console.log("Character holding rock:", character.heldObject?.id);

// Pick a wall in the arena
const wall = arena.walls[0];
console.log(`Wall 0: x=${wall.x}, y=${wall.y}, w=${wall.width}, h=${wall.height}, wallH=${wall.wallHeight}`);

const hoverScale = 0.5;
// Screen Y of wall roof is wall.y - wall.wallHeight * hoverScale to wall.y + wall.height - wall.wallHeight * hoverScale
const screenAimX = wall.x + wall.width / 2;
const screenAimY = wall.y - wall.wallHeight * hoverScale + wall.height / 2;

console.log(`Aiming at screen coordinates over wall roof: (${screenAimX}, ${screenAimY})`);

// 1. Test getWallUnderCursor
const detectedWall = ThrowModule.getWallUnderCursor(screenAimX, screenAimY, arena, hoverScale);
console.log("detectedWall:", detectedWall ? `Found wall ${detectedWall.wall.id} at phys (${detectedWall.physX}, ${detectedWall.physY})` : "FAILED");
if (!detectedWall) {
  throw new Error("Failed to detect wall under cursor!");
}

// Check that physical coordinate projects back to screen coordinates
const projectedScreenX = detectedWall.physX;
const projectedScreenY = detectedWall.physY - detectedWall.wall.wallHeight * hoverScale;
console.log(`Projected screen: (${projectedScreenX}, ${projectedScreenY}) matches aim: (${screenAimX}, ${screenAimY})`);
if (Math.abs(projectedScreenX - screenAimX) > 0.001 || Math.abs(projectedScreenY - screenAimY) > 0.001) {
  throw new Error(`Projected screen coordinates do not match aim: (${projectedScreenX}, ${projectedScreenY}) vs (${screenAimX}, ${screenAimY})`);
}

// 2. Test calculateTrajectory
const traj = character.throwModule?.calculateTrajectory(
  character,
  screenAimX,
  screenAimY,
  arena,
  arena.entities,
  hoverScale
);

console.log("Trajectory result:", {
  pointsCount: traj?.points.length,
  isBlockedByWall: traj?.isBlockedByWall,
  isLandingOnWallTop: traj?.isLandingOnWallTop,
  landPoint: traj?.landPoint,
  targetSurfaceHeight: traj?.targetSurfaceHeight,
});

if (!traj) throw new Error("Trajectory calculation returned null!");
if (!traj.isLandingOnWallTop) throw new Error("Trajectory should be landing on wall top!");
if (traj.targetSurfaceHeight !== wall.wallHeight) throw new Error(`Target surface height ${traj.targetSurfaceHeight} does not match wall height ${wall.wallHeight}`);
if (traj.isBlockedByWall) throw new Error("Trajectory should not be blocked by wall when landing on top!");

// Verify screen position of landing marker matches aim
const landScreenX = traj.landPoint.x;
const landScreenY = traj.landPoint.y - traj.landPoint.z * hoverScale;
console.log(`Landing marker screen pos: (${landScreenX}, ${landScreenY}) matches aim (${screenAimX}, ${screenAimY})`);
if (Math.abs(landScreenX - screenAimX) > 0.01 || Math.abs(landScreenY - screenAimY) > 0.01) {
  throw new Error(`Landing marker on screen (${landScreenX}, ${landScreenY}) does not match aim (${screenAimX}, ${screenAimY})`);
}

// 3. Test throw execution and physics simulation
const thrown = character.throwModule?.throwHeldObject(
  character,
  screenAimX,
  screenAimY,
  arena,
  arena.entities,
  hoverScale
);
console.log("Thrown object:", thrown?.id, "vx:", thrown?.velocity.x, "vy:", thrown?.velocity.y, "vz:", thrown?.verticalVelocity);

// Simulate physics in 60Hz steps until object settles
const dt = 1 / 60;
for (let step = 0; step < 180; step++) {
  thrown?.updatePosition(dt, arena);
}

console.log("After simulation resting pos:", {
  x: thrown?.position.x,
  y: thrown?.position.y,
  z: thrown?.position.z,
  standingWall: thrown?.standingWall?.id,
});

if (thrown?.position.z !== wall.wallHeight) {
  throw new Error(`Thrown object should have settled at wall height ${wall.wallHeight}, but is at z=${thrown?.position.z}`);
}
if (!thrown?.standingWall) {
  throw new Error("Thrown object should have standingWall set!");
}

// 4. Test aiming at an object on top of a wall
const targetCrate = new GameObject({
  id: "crate_on_wall",
  position: { x: wall.x + 0.5, y: wall.y + 0.5, z: wall.wallHeight },
  mass: 2.0,
  colliderRadius: 0.35,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
});
targetCrate.standingWall = wall;
arena.entities.push(targetCrate);

const rock2 = new GameObject({
  id: "rock2",
  position: { x: 2, y: 5, z: 0 },
  mass: 1.0,
  colliderRadius: 0.35,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
  hasGravity: true,
});
character.heldObject = rock2;
rock2.isHeld = true;
rock2.heldBy = character;

// The crate visual position on screen is (targetCrate.x, targetCrate.y - targetCrate.z * hoverScale)
const crateScreenX = targetCrate.position.x;
const crateScreenY = targetCrate.position.y - targetCrate.position.z * hoverScale;

const trajToCrate = character.throwModule?.calculateTrajectory(
  character,
  crateScreenX,
  crateScreenY,
  arena,
  arena.entities,
  hoverScale
);

console.log("Trajectory to crate on wall:", {
  targetObject: trajToCrate?.targetObject?.id,
  targetSurfaceHeight: trajToCrate?.targetSurfaceHeight,
  isLandingOnWallTop: trajToCrate?.isLandingOnWallTop,
  landPoint: trajToCrate?.landPoint,
});

if (trajToCrate?.targetObject?.id !== "crate_on_wall") {
  throw new Error(`Trajectory should target crate_on_wall, but targeted ${trajToCrate?.targetObject?.id}`);
}
if (trajToCrate?.targetSurfaceHeight !== wall.wallHeight) {
  throw new Error(`Target surface height should be ${wall.wallHeight}, got ${trajToCrate?.targetSurfaceHeight}`);
}
if (!trajToCrate?.isLandingOnWallTop) {
  throw new Error("Trajectory to crate on wall should be landing on wall top!");
}

console.log("SUCCESS! All wall roof and object aim tests passed!");
