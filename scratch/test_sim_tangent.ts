import { Arena, Wall } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1);
// Wall at x: 4..6, y: 4..6. Corner at (6, 4).
const r = 0.45;

let pos = { x: 5.8, y: 4.1, z: 1.0 };
let vel = { x: 3.677, y: -3.677 }; // Speed 5.2 moving North-East
let standingWall: Wall | null = arena.getSupportingWall(pos.x, pos.y, r);

console.log("Start pos:", pos, "vel:", vel, "speed:", Math.hypot(vel.x, vel.y));

for (let f = 1; f <= 30; f++) {
  // Input wants to move North-East at 5.2 m/s:
  vel = { x: 3.677, y: -3.677 };
  const currentSpeed = Math.hypot(vel.x, vel.y);

  const candidateX = pos.x + vel.x * dt;
  const candidateY = pos.y + vel.y * dt;

  let supportedWall: Wall | null = null;
  if (standingWall && arena.testWallOverlap(candidateX, candidateY, r, standingWall)) {
    supportedWall = standingWall;
  } else if (standingWall) {
    for (const w of arena.walls) {
      if (arena.areWallsContiguous(standingWall, w) && arena.testWallOverlap(candidateX, candidateY, r, w)) {
        supportedWall = w;
        break;
      }
    }
  }

  if (supportedWall) {
    pos.x = candidateX;
    pos.y = candidateY;
    standingWall = supportedWall;
  } else {
    // Corner / edge sliding:
    const closest = GameObject.getClosestWallPoint(candidateX, candidateY, arena);
    if (closest && closest.dist > 0) {
      const normalX = closest.dx / closest.dist;
      const normalY = closest.dy / closest.dist;

      const tangentX = -normalY;
      const tangentY = normalX;

      const tangentDot = vel.x * tangentX + vel.y * tangentY;
      if (Math.abs(tangentDot) > 0.001 && currentSpeed > 0.01) {
        const dir = Math.sign(tangentDot);
        vel.x = tangentX * dir * currentSpeed;
        vel.y = tangentY * dir * currentSpeed;

        const maxAllowedDist = r - 0.002;
        const clampedX = closest.closestX + normalX * Math.min(closest.dist, maxAllowedDist);
        const clampedY = closest.closestY + normalY * Math.min(closest.dist, maxAllowedDist);

        const nextX = clampedX + vel.x * dt;
        const nextY = clampedY + vel.y * dt;

        const nextClosest = GameObject.getClosestWallPoint(nextX, nextY, arena);
        if (nextClosest && nextClosest.dist > maxAllowedDist) {
          const nx = nextClosest.dx / nextClosest.dist;
          const ny = nextClosest.dy / nextClosest.dist;
          pos.x = nextClosest.closestX + nx * maxAllowedDist;
          pos.y = nextClosest.closestY + ny * maxAllowedDist;
        } else {
          pos.x = nextX;
          pos.y = nextY;
        }
      } else {
        vel.x = 0;
        vel.y = 0;
        const maxAllowedDist = r - 0.002;
        pos.x = closest.closestX + normalX * Math.min(closest.dist, maxAllowedDist);
        pos.y = closest.closestY + normalY * Math.min(closest.dist, maxAllowedDist);
      }

      const newSupport = arena.getSupportingWall(pos.x, pos.y, r);
      if (newSupport) standingWall = newSupport;
    }
  }

  const speed = Math.hypot(vel.x, vel.y);
  console.log(`frame ${f}: pos=(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}), vel=(${vel.x.toFixed(3)}, ${vel.y.toFixed(3)}), speed=${speed.toFixed(3)}`);
}
