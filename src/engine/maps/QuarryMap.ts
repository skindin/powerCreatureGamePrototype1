import { Arena, WallMapPreset } from "../Arena.js";
import { GameObject } from "../GameObject.js";
import { RollModule } from "../RollModule.js";
import { ConsumableModule } from "../ConsumableModule.js";

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

    // Dynamic scale for larger square maps (e.g. 30x30) or classic 20x14
    if (cols >= 24 && rows >= 24) {
      // 1. Four Corner Rock Ramparts (elevated climbing shelves at wallHeight 1.0)
      // Northwest Rampart
      for (let r = 3; r <= 6; r++) {
        for (let c = 3; c <= 6; c++) {
          if (!(r === 6 && c === 6)) grid[r][c] = 1;
        }
      }
      // Northeast Rampart
      for (let r = 3; r <= 6; r++) {
        for (let c = cols - 7; c <= cols - 4; c++) {
          if (!(r === 6 && c === cols - 7)) grid[r][c] = 1;
        }
      }
      // Southwest Rampart
      for (let r = rows - 7; r <= rows - 4; r++) {
        for (let c = 3; c <= 6; c++) {
          if (!(r === rows - 7 && c === 6)) grid[r][c] = 1;
        }
      }
      // Southeast Rampart
      for (let r = rows - 7; r <= rows - 4; r++) {
        for (let c = cols - 7; c <= cols - 4; c++) {
          if (!(r === rows - 7 && c === cols - 7)) grid[r][c] = 1;
        }
      }

      // 2. Central Monolith Pillars with tactical 4-way cross corridor (center at ~15, 15)
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);

      // Northwest monolith
      for (let r = midR - 4; r <= midR - 2; r++) {
        for (let c = midC - 4; c <= midC - 2; c++) grid[r][c] = 1;
      }
      // Northeast monolith
      for (let r = midR - 4; r <= midR - 2; r++) {
        for (let c = midC + 2; c <= midC + 4; c++) grid[r][c] = 1;
      }
      // Southwest monolith
      for (let r = midR + 2; r <= midR + 4; r++) {
        for (let c = midC - 4; c <= midC - 2; c++) grid[r][c] = 1;
      }
      // Southeast monolith
      for (let r = midR + 2; r <= midR + 4; r++) {
        for (let c = midC + 2; c <= midC + 4; c++) grid[r][c] = 1;
      }

      // 3. Midfield Flank Cover Boulders
      for (let r = midR - 1; r <= midR + 1; r++) {
        grid[r][4] = 1;
        grid[r][cols - 5] = 1;
      }
      for (let c = midC - 1; c <= midC + 1; c++) {
        grid[4][c] = 1;
        grid[rows - 5][c] = 1;
      }

      return grid;
    }

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
  { x: 15.0, y: 7.0, z: 0 },    // North clearing
  { x: 15.0, y: 23.0, z: 0 },   // South clearing
  { x: 7.0, y: 15.0, z: 0 },    // West clearing
  { x: 23.0, y: 15.0, z: 0 },   // East clearing
  { x: 8.5, y: 8.5, z: 0 },     // Northwest courtyard
  { x: 21.5, y: 8.5, z: 0 },    // Northeast courtyard
  { x: 8.5, y: 21.5, z: 0 },    // Southwest courtyard
  { x: 21.5, y: 21.5, z: 0 },   // Southeast courtyard
  { x: 15.0, y: 2.2, z: 0 },    // North perimeter
  { x: 15.0, y: 27.8, z: 0 },   // South perimeter
  { x: 2.2, y: 15.0, z: 0 },    // West perimeter
  { x: 27.8, y: 15.0, z: 0 },   // East perimeter
  { x: 4.5, y: 4.5, z: 1.0 },   // Elevated NW Rampart
  { x: 25.5, y: 4.5, z: 1.0 },  // Elevated NE Rampart
  { x: 4.5, y: 25.5, z: 1.0 },  // Elevated SW Rampart
  { x: 25.5, y: 25.5, z: 1.0 }, // Elevated SE Rampart
];

export const QUARRY_PLAYER_SPAWN = { x: 7.5, y: 7.5 };
export const QUARRY_DUMMY_SPAWN = { x: 15.0, y: 10.0 };

/**
 * Creates the initial scene freebodies for the Quarry map:
 * strictly stones of varying masses and sizes placed across ground and elevated rocks.
 */
export function createQuarryStones(): GameObject[] {
  return [
    // --- King of the Hill: Central Super Apple ---
    new GameObject({
      id: "super-apple-center",
      name: "Super Apple",
      prefabId: "prefab_super_apple",
      position: { x: 15.0, y: 15.0, z: 0 },
      mass: 0.45,
      colliderRadius: 0.30,
      color: "#ff1493",
      bounceMod: 0.20,
      hasGravity: true,
      hasVerticalPosition: true,
      consumableModule: new ConsumableModule({
        tag: "food",
        unlimited: true,
        totalEnergyJoules: 10000,
        remainingEnergyJoules: 10000,
        consumeRateWatts: 2000,
        healRate: 0,
        minScaleFloor: 1.0,
        minRadiusFloor: 0.30,
      }),
    }),

    // --- Ground Level Throwing Stones (Distributed across all 4 Quadrants) ---
    // Northwest Quadrant (P1 area)
    new GameObject({
      id: "stone-nw-1",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 6.2, y: 6.8, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-nw-2",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 8.8, y: 8.5, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),

    // Northeast Quadrant (P2 area)
    new GameObject({
      id: "stone-ne-1",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 21.2, y: 6.8, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-ne-2",
      name: "Heavy Stone",
      prefabId: "prefab_stone",
      position: { x: 23.5, y: 8.5, z: 0 },
      mass: 1.25,
      colliderRadius: 0.28,
      color: "#57534e",
      bounceMod: 0.10,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.50 }),
    }),

    // Southwest Quadrant (P3 area)
    new GameObject({
      id: "stone-sw-1",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 6.5, y: 21.5, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-sw-2",
      name: "Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 8.8, y: 23.2, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),

    // Southeast Quadrant (P4 area)
    new GameObject({
      id: "stone-se-1",
      name: "Small Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 21.5, y: 21.5, z: 0 },
      mass: 0.65,
      colliderRadius: 0.18,
      color: "#a8a29e",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-se-2",
      name: "Heavy Stone",
      prefabId: "prefab_stone",
      position: { x: 23.8, y: 23.2, z: 0 },
      mass: 1.25,
      colliderRadius: 0.28,
      color: "#57534e",
      bounceMod: 0.10,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.50 }),
    }),

    // Central Tactical Ammunition
    new GameObject({
      id: "stone-center-1",
      name: "Central Heavy Boulder",
      prefabId: "prefab_stone",
      position: { x: 15.0, y: 13.2, z: 0 },
      mass: 1.5,
      colliderRadius: 0.32,
      color: "#57534e",
      bounceMod: 0.10,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.50 }),
    }),
    new GameObject({
      id: "stone-center-2",
      name: "Central Throwing Stone",
      prefabId: "prefab_stone",
      position: { x: 15.0, y: 16.8, z: 0 },
      mass: 0.85,
      colliderRadius: 0.22,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),

    // --- Elevated Stones on Rock Ramparts (Climb to access high-ground ammunition!) ---
    new GameObject({
      id: "stone-elevated-nw",
      name: "Rampart Stone NW",
      prefabId: "prefab_stone",
      position: { x: 4.5, y: 4.5, z: 1.0 },
      mass: 0.90,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-elevated-ne",
      name: "Rampart Stone NE",
      prefabId: "prefab_stone",
      position: { x: 24.5, y: 4.5, z: 1.0 },
      mass: 0.90,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-elevated-sw",
      name: "Rampart Stone SW",
      prefabId: "prefab_stone",
      position: { x: 4.5, y: 24.5, z: 1.0 },
      mass: 0.90,
      colliderRadius: 0.23,
      color: "#78716c",
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({ rollResistance: 0.45 }),
    }),
    new GameObject({
      id: "stone-elevated-se",
      name: "Rampart Stone SE",
      prefabId: "prefab_stone",
      position: { x: 24.5, y: 24.5, z: 1.0 },
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
