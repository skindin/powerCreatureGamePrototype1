import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { RemoteEntityInterpolator } from "../src/engine/physics/RemoteEntityInterpolator.js";

console.log("=== Multi-Frame Push Simulation (Simulating Client GameLoop) ===");

const arena = new Arena(30, 20);
console.log("Arena walls count:", arena.walls.length);
for (const w of arena.walls) {
  console.log(`Wall: (${w.x}, ${w.y}) ${w.width}x${w.height}`);
}

// Local player A (keyboard) at open ground (5, 7)
const localChar = new Character({ x: 5.0, y: 7.0, mass: 1.2, colliderRadius: 0.44 });

// Remote player B at (5.7, 7.0)
const remoteChar = new Character({ x: 5.7, y: 7.0, mass: 1.2, colliderRadius: 0.44, playerId: "remote-1" });

const interpolator = new RemoteEntityInterpolator();

// Suppose remote player B is stationary on their own client at (5.7, 7.0)
let now = 1000;
interpolator.pushSnapshot(1, [{ id: "remote-1", x: 5.7, y: 7.0, z: 0, vx: 0, vy: 0, vz: 0, isClimbing: false }], now);
interpolator.pushSnapshot(2, [{ id: "remote-1", x: 5.7, y: 7.0, z: 0, vx: 0, vy: 0, vz: 0, isClimbing: false }], now + 50);
interpolator.pushSnapshot(3, [{ id: "remote-1", x: 5.7, y: 7.0, z: 0, vx: 0, vy: 0, vz: 0, isClimbing: false }], now + 100);

const dt = 1 / 60;

for (let frame = 1; frame <= 5; frame++) {
  now += dt * 1000;
  console.log(`\n--- FRAME ${frame} ---`);
  console.log(`Start of frame - Local A: (${localChar.position.x.toFixed(3)}, ${localChar.position.y.toFixed(3)}) v=(${localChar.velocity.x.toFixed(2)}, ${localChar.velocity.y.toFixed(2)})`);

  // 1. Local Player A walks right (+X) with input { x: 1, y: 0 }
  localChar.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false, [localChar, remoteChar], false);
  console.log(`After updateCharacter - Local A: (${localChar.position.x.toFixed(3)}, ${localChar.position.y.toFixed(3)}) v=(${localChar.velocity.x.toFixed(2)}, ${localChar.velocity.y.toFixed(2)})`);

  // 2. Remote Player B sync logic from GameLoop.ts lines 440-485
  const interp = interpolator.getInterpolatedState("remote-1", now);
  if (interp) {
    const dx = interp.x - remoteChar.position.x;
    const dy = interp.y - remoteChar.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2.5) {
      remoteChar.position.x = interp.x;
      remoteChar.position.y = interp.y;
      remoteChar.velocity.x = interp.vx;
      remoteChar.velocity.y = interp.vy;
    } else if (now - remoteChar.lastCollisionTime < 400) {
      // ACTIVE RECENT COLLISION
      remoteChar.updatePosition(dt, arena);
      const blend = 0.25;
      remoteChar.position.x += dx * blend;
      remoteChar.position.y += dy * blend;
      remoteChar.velocity.x += (interp.vx - remoteChar.velocity.x) * blend;
      remoteChar.velocity.y += (interp.vy - remoteChar.velocity.y) * blend;
    } else {
      if (dist > 0.02) {
        remoteChar.position.x = interp.x;
        remoteChar.position.y = interp.y;
        remoteChar.velocity.x = interp.vx;
        remoteChar.velocity.y = interp.vy;
      }
    }
  }
  console.log(`After remote sync - Remote B: (${remoteChar.position.x.toFixed(3)}, ${remoteChar.position.y.toFixed(3)}) v=(${remoteChar.velocity.x.toFixed(2)}, ${remoteChar.velocity.y.toFixed(2)})`);

  // 3. Collision resolution
  CollisionResolver.resolveEntityCollisions([localChar, remoteChar], arena, dt, null, "dynamic");
  console.log(`After resolveEntityCollisions - Local A: (${localChar.position.x.toFixed(3)}, ${localChar.position.y.toFixed(3)}) v=(${localChar.velocity.x.toFixed(2)}, ${localChar.velocity.y.toFixed(2)}) | Remote B: (${remoteChar.position.x.toFixed(3)}, ${remoteChar.position.y.toFixed(3)}) v=(${remoteChar.velocity.x.toFixed(2)}, ${remoteChar.velocity.y.toFixed(2)})`);
}
