import { Arena, Wall } from '../src/engine/Arena.js';
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
const r = 0.44;

console.log('=== Test: Interpolated movement across gap ===');

let posX = 3.8;
let posY = 5.0;
let posZ = 1.0;
let velX = 4.0; // 4 m/s East
let velY = 0.0;
let velZ = 0.0;
let supportingHeight = 1.0;
let isDismountFalling = false;

for (let frame = 1; frame <= 20; frame++) {
  const targetX = posX + velX * dt;
  const targetY = posY + velY * dt;

  const dist = Math.hypot(targetX - posX, targetY - posY);
  const stepSize = 0.01;
  const numSteps = Math.max(1, Math.ceil(dist / stepSize));

  for (let s = 1; s <= numSteps; s++) {
    const t = s / numSteps;
    const sampleX = posX + (targetX - posX) * t;
    const sampleY = posY + (targetY - posY) * t;

    // Check if collider touches any wall at this point
    const support = arena.getSupportingWall(sampleX, sampleY, r);

    if (!support) {
      // Any point where collider wouldn't be touching a wall:
      if (!isDismountFalling) {
        isDismountFalling = true;
        supportingHeight = 0;
        console.log(`Frame ${frame}, step ${s}: Left wall into gap! isDismountFalling=true, surfH=0`);
      }
    }

    if (isDismountFalling) {
      // Collide with the wall we are heading towards (Wall 2):
      // Wall 2 starts at x=5.0. Collider radius is 0.44 -> max x is 5.0 - 0.44 = 4.56
      if (sampleX + r > 5.0) {
        posX = 5.0 - r;
        velX = 0;
        console.log(`Frame ${frame}, step ${s}: Collided with Wall 2 at x=${posX.toFixed(3)}! Blocked from entering Wall 2.`);
        break;
      }
    }

    posX = sampleX;
    posY = sampleY;
  }

  // Vertical integration
  if (posZ > supportingHeight || velZ !== 0) {
    velZ -= 10.0 * dt;
    posZ += velZ * dt;
    if (posZ <= supportingHeight) {
      posZ = supportingHeight;
      velZ = 0;
    }
  }

  console.log(`Frame ${frame} end: x=${posX.toFixed(3)}, z=${posZ.toFixed(3)}, vz=${velZ.toFixed(2)}, isDismountFalling=${isDismountFalling}`);
  if (posZ <= 0.001) {
    console.log(`Landed on ground at frame ${frame}: x=${posX.toFixed(3)}, z=0.00`);
    break;
  }
}
