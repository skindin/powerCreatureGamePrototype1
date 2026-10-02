import { Arena, Wall } from '../src/engine/Arena.js';
import { Character } from '../src/character/Character.js';

// Setup two touching walls:
// Wall 1: x: [0, 4]
// Wall 2: x: [4, 8]  (touching at x=4!)
const arena = new Arena(20, 14, 1);
arena.wallHeight = 1.0;
arena.walls = [
  { id: 'w1', x: 0, y: 0, width: 4, height: 10, wallHeight: 1.0 },
  { id: 'w2', x: 4, y: 0, width: 4, height: 10, wallHeight: 1.0 }
];

function areWallsContiguous(w1: Wall, w2: Wall): boolean {
  if (w1.id === w2.id) return true;
  const xOverlap = Math.max(0, Math.min(w1.x + w1.width, w2.x + w2.width) - Math.max(w1.x, w2.x));
  const yOverlap = Math.max(0, Math.min(w1.y + w1.height, w2.y + w2.height) - Math.max(w1.y, w2.y));
  const touchX = Math.abs(w1.x + w1.width - w2.x) < 0.001 || Math.abs(w2.x + w2.width - w1.x) < 0.001;
  const touchY = Math.abs(w1.y + w1.height - w2.y) < 0.001 || Math.abs(w2.y + w2.height - w1.y) < 0.001;
  return (touchX && yOverlap > 0) || (touchY && xOverlap > 0);
}

const dt = 1 / 60;
const char = new Character({ x: 3.8, y: 5.0 });
char.position.z = 1.0;
char.verticalPositionModule!.z = 1.0;
char.supportingSurfaceHeight = 1.0;

let standingWall: Wall | null = arena.walls[0];

for (let frame = 1; frame <= 20; frame++) {
  // Horizontal movement
  char.velocity.x = 4.0;
  char.velocity.y = 0;

  const startX = char.position.x;
  const startY = char.position.y;
  const deltaX = char.velocity.x * dt;
  const deltaY = char.velocity.y * dt;
  const moveDist = Math.hypot(deltaX, deltaY);

  const stepSize = 0.01;
  const numSteps = Math.max(1, Math.ceil(moveDist / stepSize));

  for (let s = 1; s <= numSteps; s++) {
    const t = s / numSteps;
    const sampleX = startX + deltaX * t;
    const sampleY = startY + deltaY * t;

    if (standingWall) {
      const stillTouches = arena.testWallOverlap(sampleX, sampleY, char.colliderRadius, standingWall);
      if (!stillTouches) {
        const newSupport = arena.getSupportingWall(sampleX, sampleY, char.colliderRadius);
        if (newSupport && areWallsContiguous(standingWall, newSupport)) {
          standingWall = newSupport;
        } else {
          standingWall = null;
          char.supportingSurfaceHeight = 0;
        }
      }
    }

    char.position.x = sampleX;
    char.position.y = sampleY;
  }
}

console.log(`Continuous walls test: pos=(${char.position.x.toFixed(2)}, z=${char.position.z.toFixed(2)}), standingWall=${standingWall?.id}`);
if (standingWall?.id === 'w2' && char.position.z === 1.0) {
  console.log('PASS: Successfully walked from Wall 1 to touching Wall 2 at z=1.00! 🎉');
} else {
  throw new Error('FAIL: Continuous wall walk failed!');
}
