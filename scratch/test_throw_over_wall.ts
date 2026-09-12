import { Arena } from '../src/engine/Arena.js';
import { Character } from '../src/character/Character.js';
import { GameObject } from '../src/engine/GameObject.js';
import { ThrowModule } from '../src/character/ThrowModule.js';

const arena = new Arena(20, 14, 1.0);
arena.loadWallPreset('standard');

// Wall at col 10, row 1 (x: [10, 11], y: [1, 2], wallHeight: 1.0)
const wall = arena.walls[0];
console.log(`Wall to throw over: ${wall.id}, bounds: [${wall.x}, ${wall.y}] to [${wall.x + wall.width}, ${wall.y + wall.height}]`);

// Character standing on ground to the left of the wall at x=8.0, y=1.5, z=0
const char = new Character({ x: 8.0, y: 1.5 });
char.throwModule = new ThrowModule();

// Create a throwable object (e.g. rock/item) held by character
const rock = new GameObject({
  id: 'test-rock',
  x: 8.0,
  y: 1.5,
  hasCollider: true,
  colliderRadius: 0.25,
  hasMass: true,
  mass: 1.0,
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
  hasGravity: true,
  z: 0.5
});

char.heldObject = rock;
rock.isHeld = true;
rock.heldBy = char;

// Aim to the right of the wall at x=13.0, y=1.5 (past the wall at x=10..11)
const thrown = char.throwModule.throwHeldObject(char, 13.0, 1.5, arena);
if (!thrown) {
  throw new Error('Failed to throw object!');
}

console.log(`Thrown object initial velocity: vx=${thrown.velocity.x.toFixed(2)}, vz=${thrown.verticalVelocity.toFixed(2)}, z=${thrown.position.z.toFixed(2)}`);

const dt = 1 / 60;
let clearedWall = false;
let hitWall = false;

for (let frame = 1; frame <= 120; frame++) {
  thrown.updatePosition(dt, arena);
  console.log(`frame ${frame}: x=${thrown.position.x.toFixed(2)}, z=${thrown.position.z.toFixed(2)}, vx=${thrown.velocity.x.toFixed(2)}, vz=${thrown.verticalVelocity.toFixed(2)}`);

  // Check if over wall horizontally
  if (thrown.position.x >= wall.x && thrown.position.x <= wall.x + wall.width) {
    console.log(`Over wall at frame ${frame}: x=${thrown.position.x.toFixed(2)}, z=${thrown.position.z.toFixed(2)}, vz=${thrown.verticalVelocity.toFixed(2)}`);
    if (thrown.position.z > wall.wallHeight) {
      clearedWall = true;
    }
  }

  // If stopped or blocked before wall
  if (thrown.position.x < wall.x && Math.abs(thrown.velocity.x) < 0.01 && frame > 10) {
    hitWall = true;
    break;
  }

  // If passed past wall
  if (thrown.position.x > wall.x + wall.width) {
    console.log(`Successfully passed over wall at frame ${frame}: x=${thrown.position.x.toFixed(2)}, z=${thrown.position.z.toFixed(2)}`);
    break;
  }
}

if (hitWall || !clearedWall) {
  throw new Error('FAIL: Thrown object was blocked by wall and could not fly over!');
}

console.log('PASS: Object flew cleanly OVER the wall and landed on the other side! 🎉');
