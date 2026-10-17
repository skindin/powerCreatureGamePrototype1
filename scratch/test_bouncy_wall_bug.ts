import { Arena } from '../src/engine/Arena.js';
import { GameObject } from '../src/engine/GameObject.js';

const arena = new Arena(20, 14, 1.0);
arena.wallHeight = 1.0;
arena.walls = [
  { id: 'w1', x: 5.0, y: 0.0, width: 2.0, height: 10.0, wallHeight: 1.0 }
];

const ball = new GameObject({
  id: 'bouncy-1',
  name: 'Super Bouncy Ball',
  position: { x: 4.6, y: 5.0, z: 0.1 },
  velocity: { x: 5.0, y: 0.0 },
  verticalVelocity: -10.0,
  mass: 0.5,
  colliderRadius: 0.24,
  bounceMod: 0.85,
});
ball.isInFlight = true;

const dt = 1 / 60;
console.log('Initial: x=' + ball.position.x + ', z=' + ball.position.z + ', vx=' + ball.velocity.x + ', vz=' + ball.verticalVelocity);

let bouncedOffWall = false;
for (let tick = 1; tick <= 20; tick++) {
  ball.updatePosition(dt, arena);
  console.log(`Tick ${tick}: x=${ball.position.x.toFixed(3)}, z=${ball.position.z.toFixed(3)}, vx=${ball.velocity.x.toFixed(3)}, vz=${ball.verticalVelocity.toFixed(3)}, isInFlight=${ball.isInFlight}`);
  if (ball.velocity.x < 0) {
    bouncedOffWall = true;
  }
}

if (!bouncedOffWall) {
  throw new Error('FAIL: Ball did not bounce away from wall!');
}
console.log('PASS: Bouncy ball cleanly bounced away from wall! 🎉');
