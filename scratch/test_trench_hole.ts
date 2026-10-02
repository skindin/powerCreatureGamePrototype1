import { Arena } from '../src/engine/Arena.js';
import { Character } from '../src/character/Character.js';

console.log('--- TEST: Jumping into a 1x1 hole between walls ---');
// Preset "trenches" in Arena:
const arena = new Arena(20, 14, 1.0);
arena.loadWallPreset('trenches');

// In "trenches" preset, col 5 is a 1-tile wide empty trench (r=2..11), col 4, row 2 has a wall, col 6, row 2 has a wall.
// Player starts on top of wall at col 4, row 2 (x: 4.5, y: 2.5, z: 1.0)
const char = new Character({ x: 4.5, y: 2.5 });
char.position.z = 1.0;
char.verticalPositionModule!.z = 1.0;
char.supportingSurfaceHeight = 1.0;
char.standingWall = arena.getSupportingWall(4.5, 2.5, char.colliderRadius);
char.climbingModule!.enabled = true;
char.climbingModule!.preventWalkOff = false;

console.log(`Starting wall: ${char.standingWall?.id}, pos=(${char.position.x}, ${char.position.y}, z=${char.position.z})`);

// Walk directly right (+x) across the 1-tile wide trench at col 5 without space:
// Col 6 starts at x = 6.0
const dt = 1 / 60;
let fellIntoTrench = false;
let landedAtWall8Top = false;

for (let frame = 1; frame <= 60; frame++) {
  char.climbingModule!.update(char, { x: 1, y: 0 }, false, dt, arena);
  char.walkingModule!.update(char, { x: 1, y: 0 }, dt, arena);
  char.updatePosition(dt, arena);

  console.log(`frame ${frame}: x=${char.position.x.toFixed(3)}, y=${char.position.y.toFixed(3)}, z=${char.position.z.toFixed(3)}, standingWall=${char.standingWall?.id ?? 'null'}, surfH=${char.supportingSurfaceHeight.toFixed(2)}`);

  // Col 6 starts at x = 6.0
  if (char.position.x >= 6.0 && char.position.z >= 0.95) {
    landedAtWall8Top = true;
    break;
  }
  if (char.position.z <= 0.001) {
    fellIntoTrench = true;
    console.log(`Fell to bottom of trench at frame ${frame}: x=${char.position.x.toFixed(3)}, z=${char.position.z.toFixed(3)}`);
    break;
  }
}

if (landedAtWall8Top) {
  throw new Error('FAIL: Glided over trench onto opposite wall!');
}
if (!fellIntoTrench) {
  throw new Error('FAIL: Did not land at bottom of trench!');
}
console.log('PASS: Successfully fell into trench without gliding across! 🎉');
