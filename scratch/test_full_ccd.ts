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

// Implement custom update with interpolation for character
function updateWithInterpolation(char: Character, moveInput: { x: number; y: number }, isClimb: boolean): void {
  const dt = 1 / 60;
  // 0. Climbing module
  if (char.climbingModule) {
    char.climbingModule.update(char, moveInput, isClimb, dt, arena);
  }
  // 1. Walking module
  if (char.walkingModule) {
    char.walkingModule.update(char, moveInput, dt, arena);
  }

  // 2. Base physics with interpolation
  const wasStandingOnWallTop = !char.isClimbing && char.supportingSurfaceHeight >= arena.wallHeight - 0.05;
  const dismountAllowed = Boolean(wasStandingOnWallTop && isClimb && !char.climbingModule?.dismountSuppressedUntilRelease);
  const isPreventWalkOffActive = Boolean(
    wasStandingOnWallTop &&
    char.climbingModule?.enabled &&
    char.climbingModule?.preventWalkOff &&
    !dismountAllowed
  );

  const startX = char.position.x;
  const startY = char.position.y;
  const deltaX = char.velocity.x * dt;
  const deltaY = char.velocity.y * dt;
  const moveDist = Math.hypot(deltaX, deltaY);

  if (wasStandingOnWallTop && !isPreventWalkOffActive) {
    const stepSize = 0.01;
    const numSteps = Math.max(1, Math.ceil(moveDist / stepSize));
    let hasDismountedIntoGap = false;

    for (let s = 1; s <= numSteps; s++) {
      const t = s / numSteps;
      const sampleX = startX + deltaX * t;
      const sampleY = startY + deltaY * t;

      const support = arena.getSupportingWall(sampleX, sampleY, char.colliderRadius);
      if (!support) {
        hasDismountedIntoGap = true;
        char.supportingSurfaceHeight = 0;
        if (char.climbingModule) {
          char.climbingModule.climbSuppressedUntilRelease = true;
        }
      }

      char.position.x = sampleX;
      char.position.y = sampleY;

      if (hasDismountedIntoGap) {
        for (const wall of arena.walls) {
          (char as any).resolveWallCollision(wall);
        }
      }
    }
  } else {
    char.updatePosition(dt, arena);
    return;
  }

  // Vertical physics
  let surfaceHeight = char.supportingSurfaceHeight;
  if (char.isClimbing) {
    surfaceHeight = Math.max(surfaceHeight, char.position.z);
    char.verticalVelocity = 0;
  }
  char.supportingSurfaceHeight = surfaceHeight;

  if (char.position.z > surfaceHeight || char.verticalVelocity !== 0) {
    char.verticalVelocity -= arena.gravity * dt;
    char.position.z += char.verticalVelocity * dt;
    if (char.position.z <= surfaceHeight) {
      char.position.z = surfaceHeight;
      char.verticalVelocity = 0;
    }
  }
}

console.log('--- Test 1: Walking across 1.0m gap WITHOUT Space ---');
const char1 = new Character({ x: 3.8, y: 5.0 });
char1.position.z = 1.0;
char1.verticalPositionModule!.z = 1.0;
char1.supportingSurfaceHeight = 1.0;
char1.climbingModule!.enabled = true;
char1.climbingModule!.preventWalkOff = false;

let reachedTop1 = false;
for (let frame = 1; frame <= 30; frame++) {
  updateWithInterpolation(char1, { x: 1, y: 0 }, false);
  if (frame % 5 === 0 || char1.position.z <= 0.01) {
    console.log(`frame ${frame}: x=${char1.position.x.toFixed(3)}, z=${char1.position.z.toFixed(3)}, vz=${char1.verticalVelocity.toFixed(2)}, surfH=${char1.supportingSurfaceHeight.toFixed(2)}`);
  }
  if (char1.position.x >= 5.0 && char1.position.z >= 0.95) {
    reachedTop1 = true;
    break;
  }
}
console.log('Test 1 reached top of Wall 2:', reachedTop1);
if (reachedTop1) {
  throw new Error('FAIL: Player walked across gap onto Wall 2 without falling!');
}
console.log('PASS 1: Player fell cleanly into the gap without reaching top of Wall 2! 🎉');
