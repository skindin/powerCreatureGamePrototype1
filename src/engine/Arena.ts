import type { GameObject } from "./GameObject.js";
import { VerticalPositionModule } from "./VerticalPositionModule.js";

export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  wallHeight: number;
}

export interface WallMapPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  generate: (cols: number, rows: number) => number[][];
}

export class Arena {
  public static readonly WALL_PRESETS: WallMapPreset[] = [
    {
      id: "trenches",
      name: "⛏️ Trench Tunnels",
      badge: "Dense Walls",
      description: "Mostly elevated walls with a winding network of 1-tile-wide ground-level trench tunnels.",
      generate: (cols, rows) => {
        // Start with solid walls across the entire 20x14 arena (280 wall tiles)
        const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));

        // Carve primary 1-tile-wide horizontal trench tunnels:
        for (let c = 2; c <= 17; c++) {
          grid[3][c] = 0;
          grid[7][c] = 0;
          grid[10][c] = 0;
        }

        // Carve primary 1-tile-wide vertical trench tunnels:
        for (let r = 2; r <= 11; r++) {
          grid[r][5] = 0;  // Intersects player spawn at (col 5, row 7)
          grid[r][10] = 0; // Central trench tunnel artery
          grid[r][14] = 0; // East trench tunnel artery
        }

        // Winding connector trenches & escape passages:
        grid[1][10] = 0; // North trench exit
        grid[12][10] = 0; // South trench exit
        grid[7][1] = 0;  // West perimeter entry
        grid[7][18] = 0; // East perimeter entry
        for (let r = 5; r <= 9; r++) grid[r][2] = 0;  // West auxiliary trench
        for (let r = 5; r <= 9; r++) grid[r][17] = 0; // East auxiliary trench

        // Short connecting cross-tunnels:
        for (let c = 2; c <= 5; c++) grid[5][c] = 0;
        for (let c = 10; c <= 14; c++) grid[5][c] = 0;
        for (let c = 5; c <= 10; c++) grid[9][c] = 0;
        for (let c = 14; c <= 17; c++) grid[9][c] = 0;

        // Player spawn point (col 5, row 7) is guaranteed an open trench
        grid[7][5] = 0;

        return grid;
      },
    },
    {
      id: "standard",
      name: "🏛️ Standard Arena",
      badge: "Balanced",
      description: "Center dividing wall with an open gateway and two 2×2 cover obstacles.",
      generate: (cols, rows) => {
        const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
        const midCol = 10;
        for (let r = 1; r <= 4; r++) grid[r][midCol] = 1;
        for (let r = 8; r <= 12; r++) grid[r][midCol] = 1;
        grid[4][4] = 1; grid[5][4] = 1; grid[4][5] = 1; grid[5][5] = 1;
        grid[7][15] = 1; grid[8][15] = 1; grid[7][16] = 1; grid[8][16] = 1;
        return grid;
      },
    },
    {
      id: "courtyards",
      name: "🏰 Courtyards & Platforms",
      badge: "4 Quadrants",
      description: "Four large raised platforms in each corner with a central dais and open courtyards.",
      generate: (cols, rows) => {
        const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
        // 4 corner raised platforms
        for (let r = 2; r <= 4; r++) {
          for (let c = 3; c <= 6; c++) grid[r][c] = 1;
          for (let c = 13; c <= 16; c++) grid[r][c] = 1;
        }
        for (let r = 9; r <= 11; r++) {
          for (let c = 3; c <= 6; c++) grid[r][c] = 1;
          for (let c = 13; c <= 16; c++) grid[r][c] = 1;
        }
        // Center raised dais
        for (let r = 6; r <= 7; r++) {
          for (let c = 9; c <= 10; c++) grid[r][c] = 1;
        }
        return grid;
      },
    },
    {
      id: "pillars",
      name: "🗿 Pillars & Monoliths",
      badge: "Tactical Cover",
      description: "Raised monoliths and stepping-stone pillars scattered across the arena.",
      generate: (cols, rows) => {
        const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
        const pillarCoords = [
          [3, 2], [8, 2], [15, 2],
          [3, 10], [8, 10], [15, 10],
          [5, 6], [13, 6], [9, 6]
        ];
        for (const [pc, pr] of pillarCoords) {
          grid[pr][pc] = 1;
          grid[pr + 1][pc] = 1;
          grid[pr][pc + 1] = 1;
          grid[pr + 1][pc + 1] = 1;
        }
        return grid;
      },
    },
    {
      id: "maze",
      name: "🌀 Labyrinth Maze",
      badge: "Winding Paths",
      description: "Interlocking corridors and winding paths with high walls to climb over or navigate.",
      generate: (cols, rows) => {
        const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
        for (let r = 1; r <= 9; r++) grid[r][4] = 1;
        for (let r = 4; r <= 12; r++) grid[r][7] = 1;
        for (let r = 1; r <= 9; r++) grid[r][10] = 1;
        for (let r = 4; r <= 12; r++) grid[r][13] = 1;
        for (let r = 1; r <= 9; r++) grid[r][16] = 1;
        for (let c = 7; c <= 10; c++) grid[4][c] = 1;
        for (let c = 13; c <= 16; c++) grid[4][c] = 1;
        for (let c = 4; c <= 7; c++) grid[9][c] = 1;
        for (let c = 10; c <= 13; c++) grid[9][c] = 1;
        return grid;
      },
    },
    {
      id: "empty",
      name: "⬜ Empty (Open Arena)",
      badge: "Clean Slate",
      description: "Completely open arena with zero walls for custom level design.",
      generate: (cols, rows) => {
        return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
      },
    },
  ];

  public width: number;
  public height: number;
  public tileSize: number;
  public cols: number;
  public rows: number;

  public wallHeight: number; // Standard height for all walls
  public gravity: number;
  public frictionCoeff: number;
  public staticFrictionThreshold: number;

  public tileGrid: number[][];
  public walls: Wall[] = [];
  public currentPresetId = "trenches";

  /** All active game objects and characters in the arena */
  public entities: GameObject[] = [];
  /** Active visual altitude scale for pseudo-3D elevation */
  public visualAltitudeScale = 0.5;

  constructor(width = 20, height = 14, tileSize = 1.0) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.cols = Math.floor(width / tileSize); // 20 cols (1 wall each)
    this.rows = Math.floor(height / tileSize); // 14 rows (1 wall each)

    this.wallHeight = 1.0; // Standard single height for all walls (1 unit high)
    this.gravity = 30.0; // 30.0 u/s²
    this.frictionCoeff = 10.4; // 10.4 u/s²
    this.staticFrictionThreshold = 0.16; // 0.16 u/s

    // Initialize tile grid (rows x cols)
    this.tileGrid = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => 0)
    );

    this.loadWallPreset("trenches");
  }

  /**
   * Reconstructs the physical wall array from the tile grid using standard wall height
   */
  public rebuildWalls(): void {
    this.walls = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.tileGrid[r][c] === 1) {
          this.walls.push({
            id: `wall-${c}-${r}`,
            x: c * this.tileSize,
            y: r * this.tileSize,
            width: this.tileSize,
            height: this.tileSize,
            wallHeight: this.wallHeight, // All walls have this standard height
          });
        }
      }
    }
  }

  /**
   * Updates standard wall height and synchronizes all walls
   */
  public setStandardWallHeight(newHeight: number): void {
    this.wallHeight = newHeight;
    this.rebuildWalls();
  }

  /**
   * Sets a specific grid cell to wall (1) or empty (0) and rebuilds physical walls
   */
  public setWallTile(col: number, row: number, isWall: boolean): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    const val = isWall ? 1 : 0;
    if (this.tileGrid[row][col] === val) return false;
    this.tileGrid[row][col] = val;
    this.rebuildWalls();
    return true;
  }

  /**
   * Checks if a grid cell has a wall
   */
  public hasWall(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.tileGrid[row][col] === 1;
  }

  /**
   * Loads a predefined wall layout by preset ID and optionally syncs entity elevations
   */
  public loadWallPreset(presetId: string, entities?: GameObject[]): boolean {
    const preset = Arena.WALL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;
    this.currentPresetId = presetId;
    this.tileGrid = preset.generate(this.cols, this.rows);
    this.rebuildWalls();
    this.syncEntitiesWithWalls(entities);
    return true;
  }

  /**
   * Synchronizes entity elevations: any entity on the ground overlapping a newly placed wall
   * is smoothly elevated to the wall height.
   */
  public syncEntitiesWithWalls(entities?: GameObject[]): void {
    if (!entities) return;
    for (const ent of entities) {
      const r = ent.hasCollider ? ent.colliderRadius : (ent.colliderModule?.radius ?? 0.32);
      const supportingWall = this.getSupportingWall(ent.position.x, ent.position.y, r);
      if (supportingWall) {
        if (ent.position.z < supportingWall.wallHeight) {
          if (!ent.hasVerticalPosition) {
            if (!ent.verticalPositionModule) {
              ent.verticalPositionModule = new VerticalPositionModule({
                z: supportingWall.wallHeight,
                hasVerticalVelocity: true,
              });
            } else {
              ent.verticalPositionModule.enabled = true;
            }
          }
          // Immediately elevate to wall height without adding velocity
          ent.position.z = supportingWall.wallHeight;
          ent.supportingSurfaceHeight = supportingWall.wallHeight;
          (ent as any).standingWall = supportingWall;
          ent.verticalVelocity = 0;
        } else {
          // At or above wall height: keep standingWall reference refreshed to active wall
          (ent as any).standingWall = supportingWall;
          ent.supportingSurfaceHeight = supportingWall.wallHeight;
        }
      } else {
        // No wall remains under the entity's collider:
        // If entity was resting on or supported by a wall, clear support so it falls naturally
        if (ent.supportingSurfaceHeight >= this.wallHeight - 0.05 || (ent as any).standingWall !== null) {
          (ent as any).standingWall = null;
          ent.supportingSurfaceHeight = 0;
          if (ent.isCharacter) {
            const char = ent as any;
            if (char.climbingModule) {
              char.climbingModule.isDismountFreefall = true;
            }
          }
        }
      }
    }
  }

  /**
   * Clears all internal walls from the arena
   */
  public clearAllWalls(entities?: GameObject[]): void {
    this.loadWallPreset("empty", entities);
  }

  /**
   * Resets the arena to its default layout (Trench Tunnels)
   */
  public resetDefaultWalls(entities?: GameObject[]): void {
    this.loadWallPreset("trenches", entities);
  }

  /**
   * Checks if a point (x, y) is located within the footprint of a wall
   */
  public getWallAt(x: number, y: number): Wall | null {
    for (const wall of this.walls) {
      if (
        x >= wall.x &&
        x <= wall.x + wall.width &&
        y >= wall.y &&
        y <= wall.y + wall.height
      ) {
        return wall;
      }
    }
    return null;
  }

  /**
   * Tests if a circle collider at (x, y) with radius overlaps a wall's 2D footprint.
   */
  public testWallOverlap(x: number, y: number, radius: number, wall: Wall): boolean {
    const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - closestX;
    const dy = y - closestY;
    return (dx * dx + dy * dy) <= (radius * radius) + 1e-6;
  }

  /**
   * Finds the wall supporting an entity at (x, y) with given collider radius.
   * If the collider overlaps any wall, that wall supports the entity.
   */
  public getSupportingWall(x: number, y: number, radius = 0): Wall | null {
    if (radius <= 0) {
      return this.getWallAt(x, y);
    }
    for (const wall of this.walls) {
      if (this.testWallOverlap(x, y, radius, wall)) {
        return wall;
      }
    }
    return null;
  }

  /**
   * Tests if two walls touch or are contiguous (share an edge or corner with no gap)
   */
  public areWallsContiguous(w1: Wall, w2: Wall): boolean {
    if (w1.id === w2.id) return true;
    const xDist = Math.max(0, Math.max(w1.x, w2.x) - Math.min(w1.x + w1.width, w2.x + w2.width));
    const yDist = Math.max(0, Math.max(w1.y, w2.y) - Math.min(w1.y + w1.height, w2.y + w2.height));
    const xOverlap = Math.min(w1.x + w1.width, w2.x + w2.width) - Math.max(w1.x, w2.x);
    const yOverlap = Math.min(w1.y + w1.height, w2.y + w2.height) - Math.max(w1.y, w2.y);
    return (xDist < 0.001 && yOverlap > 0.05) || (yDist < 0.001 && xOverlap > 0.05);
  }

  /**
   * Returns the elevation of the physical surface directly beneath (x, y) for a collider of radius.
   * If the collider overlaps a wall, returns wall.wallHeight.
   * Otherwise returns 0 (ground level).
   */
  public getSupportingSurfaceHeight(x: number, y: number, radius = 0): number {
    const wall = this.getSupportingWall(x, y, radius);
    return wall ? wall.wallHeight : 0;
  }
}
