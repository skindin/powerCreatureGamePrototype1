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

const r = 0.44;
// Start position on Wall 1 near east edge:
const p0 = { x: 3.8, y: 5.0 };
// At 4 m/s over dt = 1/60, moving East:
const vx = 4.0;
const dt = 1 / 60;

// Simulate moving from x=3.8 to x=5.2 frame by frame, but with interpolation within each frame
let currentX = p0.x;
let currentY = p0.y;

console.log('Testing interpolation between frames:');
for (let frame = 1; frame <= 15; frame++) {
  const nextX = currentX + vx * dt;
  const nextY = currentY;

  // Interpolation along (currentX, currentY) -> (nextX, nextY)
  const dist = Math.hypot(nextX - currentX, nextY - currentY);
  const stepSize = 0.02;
  const steps = Math.max(1, Math.ceil(dist / stepSize));

  let detectedGap = false;
  let gapT = 0;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const sampleX = currentX + (nextX - currentX) * t;
    const sampleY = currentY + (nextY - currentY) * t;

    const support = arena.getSupportingWall(sampleX, sampleY, r);
    if (!support) {
      detectedGap = true;
      gapT = t;
      console.log(`Frame ${frame}: GAP DETECTED at sample t=${t.toFixed(2)}, x=${sampleX.toFixed(3)}! Collider touches NO wall!`);
      break;
    }
  }

  currentX = nextX;
  currentY = nextY;
}
