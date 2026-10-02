import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const dt = 1 / 60;

console.log("=== Scenario 4B: Walking diagonally across corner-to-corner with Space held (dismounting) ===");
{
  const arena = new Arena(20, 14, 1.0);
  arena.wallHeight = 1.0;
  arena.walls = [
    { id: "w1", x: 4, y: 4, width: 1, height: 1, wallHeight: 1.0 },
    { id: "w2", x: 5, y: 5, width: 1, height: 1, wallHeight: 1.0 }
  ];
  const char = new Character({ x: 4.5, y: 4.5 });
  char.position.z = 1.0;
  char.verticalPositionModule!.z = 1.0;
  char.supportingSurfaceHeight = 1.0;
  char.standingWall = arena.walls[0];
  char.climbingModule!.enabled = true;
  char.climbingModule!.preventWalkOff = true;

  let fellToGround = false;
  let skippedToW2 = false;

  for (let f = 1; f <= 50; f++) {
    char.updateCharacter(dt, { x: 1, y: 1 }, false, null, arena, true); // Space held
    if (char.standingWall?.id === "w2" && char.position.z >= 0.95) {
      skippedToW2 = true;
      break;
    }
    if (char.position.z <= 0.01) {
      fellToGround = true;
      break;
    }
  }
  console.log(`Result: fellToGround=${fellToGround}, skippedToW2=${skippedToW2}, pos=(${char.position.x.toFixed(3)}, ${char.position.y.toFixed(3)}, ${char.position.z.toFixed(3)})`);
}
