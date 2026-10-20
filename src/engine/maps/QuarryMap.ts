import { Arena, WallMapPreset } from "../Arena.js";
import { GameObject } from "../GameObject.js";
import { RollModule } from "../RollModule.js";

/**
 * 🪨 The Stone Quarry Map Preset
 *
 * An ancient stone quarry with natural elevated rock formations,
 * raised ramparts for vertical throwing / climbing, and tactical monolith cover.
 */
export const quarryPreset: WallMapPreset = {
  id: "quarry",
  name: "🪨 The Stone Quarry",
  badge: "Tactical Boulders",
  description: "Natural quarry ridges and elevated rock ramparts ideal for stone throwing, vertical climbs, and physical cover.",
  generate: (cols: number, rows: number): number[][] => {
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

    // 1. North Rock Ramparts (elevated climbing shelves)
    for (let c = 4; c <= 7; c++) grid[2][c] = 1;
    for (let c = 5; c <= 8; c++) grid[3][c] = 1;
    for (let c = 12; c <= 15; c++) grid[2][c] = 1;

    // 2. South Rock Ramparts (elevated climbing shelves)
    for (let c = 12; c <= 15; c++) grid[11][c] = 1;
    for (let c = 11; c <= 14; c++) grid[10][c] = 1;
    for (let c = 4; c <= 7; c++) grid[11][c] = 1;

    // 3. Central Monolith Pillars (providing tactical cover with an open central gateway at row 7)
    // North Central Monolith
    grid[5][9] = 1;
    grid[5][10] = 1;
    grid[6][9] = 1;
    grid[6][10] = 1;

    // South Central Monolith
    grid[8][9] = 1;
    grid[8][10] = 1;
    grid[9][9] = 1;
    grid[9][10] = 1;

    // 4. Perimeter Flank Barriers (tactical cover on west and east borders)
    grid[5][2] = 1; grid[6][2] = 1;
    grid[7][2] = 1; grid[8][2] = 1;

    grid[5][17] = 1; grid[6][17] = 1;
    grid[7][17] = 1; grid[8][17] = 1;

    return grid;
  },
};

// Register preset into Arena static list if not already present
if (!Arena.WALL_PRESETS.some((p) => p.id === quarryPreset.id)) {
  Arena.WALL_PRESETS.unshift(quarryPreset);
}

/** Designated open ground spawn locations for apples in the Quarry */
export const QUARRY_APPLE_SPAWN_POINTS: { x: number; y: number; z?: number }[] = [
  { x: 10.0, y: 2.2, z: 0 },   // North clearing
  { x: 10.0, y: 11.8, z: 0 },  // South clearing
  { x: 3.5, y: 7.0, z: 0 },    // West clearing
  { x: 16.5, y: 7.0, z: 0 },   // East clearing
  { x: 10.0, y: 7.0, z: 0 },   // Center gateway
];

export const QUARRY_PLAYER_SPAWN = { x: 5.5, y: 7.0 };
export const QUARRY_DUMMY_SPAWN = { x: 14.5, y: 7.0 };

/**
 * Creates the initial scene freebodies for the Quarry map:
 * strictly stones of varying masses and sizes placed across ground and elevated rocks.
 */
export function createQuarryStones(): GameObject[] {
  return [
    // --- Ground Level Throwing Stones ---
    new GameObject({
      id: "stone-ground-1",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 4.2, y: 5.8, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-ground-2",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 4.8, y: 8.5, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-ground-3",
      name: "Heavy Stone",
      prefabId: "prefab_stone",
      position: { x: 8.2, y: 4.5, z: 0 },
      mass: 1.25,
      colliderRadius: 0.28,
      color: "#57534e",
      bounceMod: 0.10,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.50 }),
    }),
    new GameObject({
      id: "stone-ground-4",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 11.8, y: 9.5, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-ground-5",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 15.2, y: 5.8, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-ground-6",
      name: "Heavy Stone",
      prefabId: "prefab_stone",
      position: { x: 15.8, y: 8.5, z: 0 },
      mass: 1.25,
      colliderRadius: 0.28,
      color: "#57534e",
      bounceMod: 0.10,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.50 }),
    }),

    // --- Elevated Stones on Rock Ramparts (Climb to access high-ground ammunition!) ---
    new GameObject({
      id: "stone-elevated-1",
      name: "Rampart Stone",
      prefabId: "prefab_stone",
      position: { x: 6.5, y: 2.5, z: 1.0 },
      mass: 0.90,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-elevated-2",
      name: "Rampart Stone",
      prefabId: "prefab_stone",
      position: { x: 13.5, y: 11.5, z: 1.0 },
      mass: 0.90,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
  ];
}
