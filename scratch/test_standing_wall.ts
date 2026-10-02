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
char.climbingModule!.enabled = true;
char.climbingModule!.preventWalkOff = false;

// Standing wall is Wall 1
let standingWall: Wall | null = arena.walls[0];

// Custom simulation of updatePosition with standingWall & interpolation
function simulateStep(): void {
  // 0. Supporting surface
  let surfaceHeight = 0;
  if (char.position.z >= arena.wallHeight - 0.05 || (char.supportingSurfaceHeight >= arena.wallHeight - 0.05 && char.position.z >= arena.wallHeight - 0.2)) {
    if (standingWall) {
      const touchesCurrent = arena.testWallOverlap(char.position.x, char.position.y, char.colliderRadius, standingWall);
      if (touchesCurrent) {
        surfaceHeight = standingWall.wallHeight;
      } else {
        const newSupport = arena.getSupportingWall(char.position.x, char.position.y, char.colliderRadius);
        if (newSupport && areWallsContiguous(standingWall, newSupport)) {
          standingWall = newSupport;
          surfaceHeight = newSupport.wallHeight;
        } else {
          standingWall = null;
          surfaceHeight = 0;
          char.climbingModule!.climbSuppressedUntilRelease = true;
        }
      }
    }
  }
  char.supportingSurfaceHeight = surfaceHeight;

  // 1. Vertical physics
  if (char.position.z > surfaceHeight || char.verticalVelocity !== 0) {
    char.verticalVelocity -= arena.gravity * dt;
    char.position.z += char.verticalVelocity * dt;
    if (char.position.z <= surfaceHeight) {
      char.position.z = surfaceHeight;
      char.verticalVelocity = 0;
    }
  }

  // 2. Horizontal walking input: velocity = (4, 0)
  char.velocity.x = 4.0;
  char.velocity.y = 0;

  // 3. Interpolated horizontal movement
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
          // Exited onto gap! Dismount!
          standingWall = null;
          char.supportingSurfaceHeight = 0;
          char.climbingModule!.climbSuppressedUntilRelease = true;
        }
      }
    }

    char.position.x = sampleX;
    char.position.y = sampleY;

    // If dismounted into gap or airborne:
    if (!standingWall) {
      for (const wall of arena.walls) {
        (char as any).resolveWallCollision(wall);
      }
    }
  }
}

console.log('=== TEST: Walking across gap WITHOUT Space with standingWall & CCD ===');

let reachedTop = false;
for (let frame = 1; frame <= 30; frame++) {
  simulateStep();

  if (frame % 5 === 0 || char.position.z <= 0.01) {
    console.log(`frame ${frame}: x=${char.position.x.toFixed(3)}, z=${char.position.z.toFixed(3)}, surfH=${char.supportingSurfaceHeight.toFixed(2)}, vz=${char.verticalVelocity.toFixed(2)}, standingWall=${standingWall?.id ?? 'null'}`);
  }

  if (char.position.x >= 5.0 && char.position.z >= 0.95) {
    reachedTop = true;
    break;
  }
  if (char.position.z <= 0.001) {
    break;
  }
}

console.log('Reached top of Wall 2:', reachedTop);
if (reachedTop) {
  throw new Error('FAIL: Player reached Wall 2 top without falling!');
}
console.log('PASS: Player fell cleanly into the gap! Landed at ground level! 🎉');
