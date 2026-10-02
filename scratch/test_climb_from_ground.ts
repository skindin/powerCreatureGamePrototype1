import { Arena } from '../src/engine/Arena.js';
import { Character } from '../src/character/Character.js';

const arena = new Arena(20, 14, 1.0);
arena.loadWallPreset('standard');

// Find a wall in the arena:
const wall = arena.walls[0];
console.log(`Testing with wall: ${wall.id}, bounds: [${wall.x}, ${wall.y}] to [${wall.x + wall.width}, ${wall.y + wall.height}], height=${wall.wallHeight}`);

// Put character on the ground next to the wall, facing the wall
// Character radius = 0.44. Put char to the left of wall at x = wall.x - 0.44 - 0.05
const char = new Character({ x: wall.x - 0.44 - 0.05, y: wall.y + 0.5 });
char.position.z = 0;
char.verticalPositionModule!.z = 0;
char.supportingSurfaceHeight = 0;
char.climbingModule!.enabled = true;

console.log(`Starting pos: x=${char.position.x.toFixed(3)}, y=${char.position.y.toFixed(3)}, z=${char.position.z.toFixed(3)}`);

const dt = 1 / 60;
// Player holds right (towards wall: {x: 1, y: 0}) and holds Space (isClimb = true)
for (let frame = 1; frame <= 50; frame++) {
  char.climbingModule!.update(char, { x: 1, y: 0 }, true, dt, arena);
  char.walkingModule!.update(char, { x: 1, y: 0 }, dt, arena);
  char.updatePosition(dt, arena);

  console.log(`frame ${frame}: z=${char.position.z.toFixed(3)}, isClimbing=${char.isClimbing}, standingWall=${char.standingWall?.id ?? 'null'}, surfH=${char.supportingSurfaceHeight.toFixed(2)}, vz=${char.verticalVelocity.toFixed(2)}, x=${char.position.x.toFixed(3)}`);
}

if (char.position.z < 0.99) {
  throw new Error(`FAIL: Player did not stay on wall top! z=${char.position.z}`);
}
console.log('PASS: Player climbed smoothly from ground to wall top and stayed at z=1.000! 🎉');
