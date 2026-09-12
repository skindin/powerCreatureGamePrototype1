import { Arena } from "../src/engine/Arena.js";

const arena = new Arena(20, 14, 1.0);
console.log("Default Preset ID:", arena.currentPresetId);
console.log("Total walls:", arena.walls.length);
console.log("First preset in WALL_PRESETS:", Arena.WALL_PRESETS[0].id, Arena.WALL_PRESETS[0].name);

const playerSpawnCol = 5;
const playerSpawnRow = 7;
console.log(`Player spawn at (col ${playerSpawnCol}, row ${playerSpawnRow}) is wall?`, arena.hasWall(playerSpawnCol, playerSpawnRow));

arena.clearAllWalls();
console.log("After clearAllWalls, walls:", arena.walls.length);
arena.resetDefaultWalls();
console.log("After resetDefaultWalls, preset:", arena.currentPresetId, "walls:", arena.walls.length);

if (arena.currentPresetId !== "trenches") {
  throw new Error("FAIL: Default preset is not trenches!");
}
if (arena.hasWall(playerSpawnCol, playerSpawnRow)) {
  throw new Error("FAIL: Player spawn tile is obstructed by a wall!");
}
console.log("PASS: Trench map is default and player spawn is clear! 🎉");
