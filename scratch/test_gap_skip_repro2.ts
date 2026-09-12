import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

const dt = 1 / 60;

console.log("=== Scenario 5: 0.8m gap between Wall 1 and Wall 2 with default preventWalkOff = true ===");
{
  const arena = new Arena(20, 14, 1.0);
  arena.wallHeight = 1.0;
  arena.walls = [
    { id: "w1", x: 0, y: 0, width: 4, height: 10, wallHeight: 1.0 },
    { id: "w2", x: 4.8, y: 0, width: 4, height: 10, wallHeight: 1.0 } // 0.8m gap
  ];
  const char = new Character({ x: 3.8, y: 5.0 });
  char.position.z = 1.0;
  char.verticalPositionModule!.z = 1.0;
  char.supportingSurfaceHeight = 1.0;
  char.standingWall = arena.walls[0];
  char.climbingModule!.enabled = true;
  char.climbingModule!.preventWalkOff = true; // default!

  let reachedWall2 = false;
  let fellToGround = false;

  for (let f = 1; f <= 60; f++) {
    char.updateCharacter(dt, { x: 1, y: 0 }, false, null, arena, false); // NO SPACE PRESSED
    console.log(`f${f}: x=${char.position.x.toFixed(3)}, z=${char.position.z.toFixed(3)}, wall=${char.standingWall?.id ?? 'null'}, surfH=${char.supportingSurfaceHeight.toFixed(2)}`);
    if (char.standingWall?.id === "w2") {
      reachedWall2 = true;
      break;
    }
    if (char.position.z <= 0.01) {
      fellToGround = true;
      break;
    }
  }

  if (reachedWall2) {
    console.error("BUG REPRODUCED! Character skipped across 0.8m gap onto Wall 2 without holding Space!");
  } else if (fellToGround) {
    console.log("Character fell to ground.");
  } else {
    console.log("Character stopped at edge.");
  }
}
