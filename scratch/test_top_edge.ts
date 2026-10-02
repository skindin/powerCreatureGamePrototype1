import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { Vector2D, GameObject } from "../src/engine/GameObject.js";

const dt = 1 / 60;
const arena = new Arena(20, 14, 1);
const r = 0.45;

console.log("\n--- Walking along top edge pushing North-East ---");
const char = new Character({ x: 4.5, y: 3.56 });
char.position.z = 1.0;
char.supportingSurfaceHeight = 1.0;
const neInput: Vector2D = { x: 1, y: -1 };

for (let f = 1; f <= 15; f++) {
  char.walkingModule!.update(char, neInput, dt, arena);
  const speedBefore = Math.hypot(char.velocity.x, char.velocity.y);

  const candidateX = char.position.x + char.velocity.x * dt;
  const candidateY = char.position.y + char.velocity.y * dt;
  const fullSupport = arena.getSupportingWall(candidateX, candidateY, r);

  if (fullSupport) {
    char.position.x = candidateX;
    char.position.y = candidateY;
    char.standingWall = fullSupport;
  } else {
    const closest = GameObject.getClosestWallPoint(candidateX, candidateY, arena);
    if (closest && closest.dist > 0) {
      const normalX = closest.dx / closest.dist;
      const normalY = closest.dy / closest.dist;

      const tangentX = -normalY;
      const tangentY = normalX;
      const tangentDot = char.velocity.x * tangentX + char.velocity.y * tangentY;

      if (Math.abs(tangentDot) > 0.001 && speedBefore > 0.01) {
        const dir = Math.sign(tangentDot);
        char.velocity.x = tangentX * dir * speedBefore;
        char.velocity.y = tangentY * dir * speedBefore;

        const maxAllowedDist = r - 0.002;
        const clampedX = closest.closestX + normalX * Math.min(closest.dist, maxAllowedDist);
        const clampedY = closest.closestY + normalY * Math.min(closest.dist, maxAllowedDist);

        const nextX = clampedX + char.velocity.x * dt;
        const nextY = clampedY + char.velocity.y * dt;

        const nextClosest = GameObject.getClosestWallPoint(nextX, nextY, arena);
        if (nextClosest && nextClosest.dist > maxAllowedDist) {
          const nx = nextClosest.dx / nextClosest.dist;
          const ny = nextClosest.dy / nextClosest.dist;
          char.position.x = nextClosest.closestX + nx * maxAllowedDist;
          char.position.y = nextClosest.closestY + ny * maxAllowedDist;
        } else {
          char.position.x = nextX;
          char.position.y = nextY;
        }
      } else {
        char.velocity.x = 0;
        char.velocity.y = 0;
        const maxAllowedDist = r - 0.002;
        char.position.x = closest.closestX + normalX * Math.min(closest.dist, maxAllowedDist);
        char.position.y = closest.closestY + normalY * Math.min(closest.dist, maxAllowedDist);
      }
    }
  }
  const speed = Math.hypot(char.velocity.x, char.velocity.y);
  console.log(`frame ${f}: pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}), vel=(${char.velocity.x.toFixed(3)}, ${char.velocity.y.toFixed(3)}), speed=${speed.toFixed(3)}`);
}
