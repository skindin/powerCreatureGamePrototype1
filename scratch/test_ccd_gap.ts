import { Arena } from '../src/engine/Arena.js';
import { Character } from '../src/character/Character.js';

// Setup two walls with 1-tile gap:
// Wall 1: x: [0, 4], y: [0, 10]
// Gap:    x: [4, 5] (width 1.0, collider diameter 0.88 fits)
// Wall 2: x: [5, 9], y: [0, 10]
const arena = new Arena(20, 14, 1);
arena.wallHeight = 1.0;
arena.walls = [
  { id: 'w1', x: 0, y: 0, width: 4, height: 10, wallHeight: 1.0 },
  { id: 'w2', x: 5, y: 0, width: 4, height: 10, wallHeight: 1.0 }
];

const dt = 1 / 60;

// Test A: Walking East across gap WITHOUT Space (preventWalkOff = false)
console.log('=== Test A: Walking across 1.0m gap WITHOUT Space ===');
const charA = new Character({ x: 3.8, y: 5.0 });
charA.position.z = 1.0;
charA.verticalPositionModule!.z = 1.0;
charA.supportingSurfaceHeight = 1.0;
charA.climbingModule!.enabled = true;
charA.climbingModule!.preventWalkOff = false;

let reachedOtherWallTopA = false;
for (let frame = 1; frame <= 30; frame++) {
  charA.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false);
  if (frame % 5 === 0 || charA.position.z <= 0.01) {
    console.log(`frame ${frame}: x=${charA.position.x.toFixed(3)}, z=${charA.position.z.toFixed(3)}, surfH=${charA.supportingSurfaceHeight.toFixed(2)}, vz=${charA.verticalVelocity.toFixed(2)}`);
  }
  if (charA.position.x >= 5.0 && charA.position.z >= 0.95) {
    reachedOtherWallTopA = true;
    break;
  }
}
console.log('Test A reached other wall top:', reachedOtherWallTopA);
