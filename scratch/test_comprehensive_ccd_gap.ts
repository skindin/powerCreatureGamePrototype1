import { Arena } from '../src/engine/Arena.js';
import { Character } from '../src/character/Character.js';

console.log('========================================================');
console.log('COMPREHENSIVE TEST: CCD GAP INTERPOLATION & DISMOUNT');
console.log('========================================================\n');

const dt = 1 / 60;

// Setup arena with 2 walls separated by 1.0m gap
// Wall 1: x: [0, 4], y: [0, 10]
// Gap:    x: [4, 5] (1.0m width)
// Wall 2: x: [5, 9], y: [0, 10]
// Contiguous Wall 1B: x: [0, 4], y: [10, 14]
function createTestArena(): Arena {
  const arena = new Arena(20, 14, 1.0);
  arena.wallHeight = 1.0;
  arena.walls = [
    { id: 'w1', x: 0, y: 0, width: 4, height: 10, wallHeight: 1.0 },
    { id: 'w2', x: 5, y: 0, width: 4, height: 10, wallHeight: 1.0 },
    { id: 'w1_contig', x: 0, y: 10, width: 4, height: 4, wallHeight: 1.0 }
  ];
  return arena;
}

// -----------------------------------------------------------------
// TEST 1: Walking across gap WITHOUT hitting Space bar
// Expected: Collider detects gap via CCD interpolation, dismounts,
// collides with Wall 2, falls cleanly to ground (z=0), never lands on Wall 2 top.
// -----------------------------------------------------------------
console.log('--- TEST 1: Walking across gap WITHOUT hitting Space bar ---');
{
  const arena = createTestArena();
  const char = new Character({ x: 3.8, y: 5.0 });
  char.position.z = 1.0;
  char.verticalPositionModule!.z = 1.0;
  char.supportingSurfaceHeight = 1.0;
  char.standingWall = arena.walls[0];
  char.climbingModule!.enabled = true;
  char.climbingModule!.preventWalkOff = false; // Player has prevent-walk-off disabled or walks off

  let reachedWall2Top = false;
  let fellToGround = false;

  for (let frame = 1; frame <= 60; frame++) {
    // Walking input: hold right (x: +1, y: 0), Space NOT held
    char.climbingModule!.update(char, { x: 1, y: 0 }, false, dt, arena);
    char.walkingModule!.update(char, { x: 1, y: 0 }, dt, arena);
    char.updatePosition(dt, arena);

    if (char.position.x >= 5.0 && char.position.z >= 0.95) {
      reachedWall2Top = true;
      break;
    }
    if (char.position.z <= 0.001) {
      fellToGround = true;
      console.log(`Landed on ground at frame ${frame}: x=${char.position.x.toFixed(3)}, z=${char.position.z.toFixed(3)}`);
      break;
    }
  }

  if (reachedWall2Top) {
    throw new Error('FAIL: Player walked across gap onto Wall 2 top without falling!');
  }
  if (!fellToGround) {
    throw new Error('FAIL: Player did not fall to ground!');
  }
  console.log('PASS TEST 1: Player cleanly dismounted into gap, collided with Wall 2, and fell to ground! 🎉\n');
}

// -----------------------------------------------------------------
// TEST 2: Walking across gap WITH Space bar pressed (jump dismount)
// Expected: Dismounts into gap, collides with Wall 2, falls to ground.
// -----------------------------------------------------------------
console.log('--- TEST 2: Walking across gap WITH Space bar pressed ---');
{
  const arena = createTestArena();
  const char = new Character({ x: 3.8, y: 5.0 });
  char.position.z = 1.0;
  char.verticalPositionModule!.z = 1.0;
  char.supportingSurfaceHeight = 1.0;
  char.standingWall = arena.walls[0];
  char.climbingModule!.enabled = true;
  char.climbingModule!.preventWalkOff = true;

  let reachedWall2Top = false;
  let fellToGround = false;

  for (let frame = 1; frame <= 60; frame++) {
    // Holding Space bar while walking right
    char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, true);

    if (char.position.x >= 5.0 && char.position.z >= 0.95) {
      reachedWall2Top = true;
      break;
    }
    if (char.position.z <= 0.001) {
      fellToGround = true;
      console.log(`Landed on ground at frame ${frame}: x=${char.position.x.toFixed(3)}, z=${char.position.z.toFixed(3)}`);
      break;
    }
  }

  if (reachedWall2Top) {
    throw new Error('FAIL: Player jumped across gap onto Wall 2 top without falling!');
  }
  if (!fellToGround) {
    throw new Error('FAIL: Player did not fall to ground!');
  }
  console.log('PASS TEST 2: Player jumped off, collided with Wall 2, and fell to ground! 🎉\n');
}

// -----------------------------------------------------------------
// TEST 3: PreventWalkOff active: Space NOT held
// Expected: Ledge guard deflects player along Wall 1 edge, player NEVER walks off.
// -----------------------------------------------------------------
console.log('--- TEST 3: PreventWalkOff active (Space NOT held) ---');
{
  const arena = createTestArena();
  const char = new Character({ x: 3.8, y: 5.0 });
  char.position.z = 1.0;
  char.verticalPositionModule!.z = 1.0;
  char.supportingSurfaceHeight = 1.0;
  char.standingWall = arena.walls[0];
  char.climbingModule!.enabled = true;
  char.climbingModule!.preventWalkOff = true;

  for (let frame = 1; frame <= 60; frame++) {
    // Trying to walk directly right into the void
    char.climbingModule!.update(char, { x: 1, y: 0 }, false, dt, arena);
    char.walkingModule!.update(char, { x: 1, y: 0 }, dt, arena);
    char.updatePosition(dt, arena);
  }

  if (char.position.z < 0.95) {
    throw new Error(`FAIL: Player fell off wall with preventWalkOff active! z=${char.position.z}`);
  }
  if (char.position.x > 4.45) {
    throw new Error(`FAIL: Player moved past edge into void! x=${char.position.x}`);
  }
  console.log(`PASS TEST 3: Ledge guard held player on wall at x=${char.position.x.toFixed(3)}, z=${char.position.z.toFixed(3)}! 🎉\n`);
}

// -----------------------------------------------------------------
// TEST 4: Walking between contiguous walls (Wall 1 to Wall 1B)
// Expected: Player smoothly transitions between contiguous wall blocks without falling.
// -----------------------------------------------------------------
console.log('--- TEST 4: Walking between contiguous walls ---');
{
  const arena = createTestArena();
  const char = new Character({ x: 2.0, y: 9.5 });
  char.position.z = 1.0;
  char.verticalPositionModule!.z = 1.0;
  char.supportingSurfaceHeight = 1.0;
  char.standingWall = arena.walls[0]; // w1
  char.climbingModule!.enabled = true;

  // Walk in +y direction across border y=10 into w1_contig
  for (let frame = 1; frame <= 60; frame++) {
    char.climbingModule!.update(char, { x: 0, y: 1 }, false, dt, arena);
    char.walkingModule!.update(char, { x: 0, y: 1 }, dt, arena);
    char.updatePosition(dt, arena);
  }

  if (char.position.z < 0.95) {
    throw new Error(`FAIL: Player fell while walking between contiguous walls! z=${char.position.z}`);
  }
  if (char.position.y <= 10.5) {
    throw new Error(`FAIL: Player did not cross onto contiguous wall! y=${char.position.y}`);
  }
  if (char.standingWall?.id !== 'w1_contig') {
    throw new Error(`FAIL: standingWall was not transferred to w1_contig! id=${char.standingWall?.id}`);
  }
  console.log(`PASS TEST 4: Seamlessly walked from w1 to w1_contig at y=${char.position.y.toFixed(3)}, standingWall=${char.standingWall?.id}! 🎉\n`);
}

// -----------------------------------------------------------------
// TEST 5: Mid-air re-grab across gap
// Expected: When falling in gap, releasing Space and repressing Space allows grabbing Wall 2.
// -----------------------------------------------------------------
console.log('--- TEST 5: Mid-air re-grab across gap ---');
{
  const arena = createTestArena();
  const char = new Character({ x: 3.8, y: 5.0 });
  char.position.z = 1.0;
  char.verticalPositionModule!.z = 1.0;
  char.supportingSurfaceHeight = 1.0;
  char.standingWall = arena.walls[0];
  char.climbingModule!.enabled = true;
  char.climbingModule!.preventWalkOff = false;

  // Step 1: Walk off wall without space to dismount into gap
  for (let frame = 1; frame <= 22; frame++) {
    char.climbingModule!.update(char, { x: 1, y: 0 }, false, dt, arena);
    char.walkingModule!.update(char, { x: 1, y: 0 }, dt, arena);
    char.updatePosition(dt, arena);
  }

  console.log(`Dismounted into gap at frame 22: x=${char.position.x.toFixed(3)}, z=${char.position.z.toFixed(3)}, isClimbing=${char.isClimbing}`);
  if (char.position.z >= 0.95 || char.position.z <= 0.1) {
    throw new Error('Player is not in mid-air gap!');
  }

  // Step 2: Fresh press of Space while moving towards Wall 2 (x: +1)
  char.climbingModule!.update(char, { x: 1, y: 0 }, true, dt, arena);
  char.updatePosition(dt, arena);

  console.log(`After fresh press: isClimbing=${char.isClimbing}, z=${char.position.z.toFixed(3)}`);
  if (!char.isClimbing) {
    throw new Error('FAIL: Fresh press of Space did not re-grab Wall 2 in mid-air!');
  }
  console.log('PASS TEST 5: Fresh press successfully grabbed Wall 2 mid-air! 🎉\n');
}

console.log('========================================================');
console.log('ALL COMPREHENSIVE CCD GAP TESTS PASSED PERFECTLY! 🚀');
console.log('========================================================');
