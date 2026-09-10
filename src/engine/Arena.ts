export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  wallHeight: number;
}

export class Arena {
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

  constructor(width = 20, height = 14, tileSize = 1.0) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.cols = Math.floor(width / tileSize); // 20 cols (1 wall each)
    this.rows = Math.floor(height / tileSize); // 14 rows (1 wall each)

    this.wallHeight = 1.0; // Standard single height for all walls (1 unit high)
    this.gravity = 10.0; // 10.0 u/s²
    this.frictionCoeff = 10.4; // 10.4 u/s²
    this.staticFrictionThreshold = 0.16; // 0.16 u/s

    // Initialize tile grid (rows x cols)
    this.tileGrid = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => 0)
    );

    this.setupDefaultTileMap();
    this.rebuildWalls();
  }

  private setupDefaultTileMap(): void {
    // 1. Center dividing wall column (column 10, with an opening in the middle)
    const midCol = 10;
    for (let r = 1; r <= 4; r++) {
      this.tileGrid[r][midCol] = 1;
    }
    // Rows 5, 6, 7 are open gateway
    for (let r = 8; r <= 12; r++) {
      this.tileGrid[r][midCol] = 1;
    }

    // 2. Left side obstacle (2x2 grid block)
    this.tileGrid[4][4] = 1;
    this.tileGrid[5][4] = 1;
    this.tileGrid[4][5] = 1;
    this.tileGrid[5][5] = 1;

    // 3. Right side obstacle (2x2 grid block)
    this.tileGrid[7][15] = 1;
    this.tileGrid[8][15] = 1;
    this.tileGrid[7][16] = 1;
    this.tileGrid[8][16] = 1;
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
    return (dx * dx + dy * dy) < (radius * radius);
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
   * Returns the elevation of the physical surface directly beneath (x, y) for a collider of radius.
   * If the collider overlaps a wall, returns wall.wallHeight.
   * Otherwise returns 0 (ground level).
   */
  public getSupportingSurfaceHeight(x: number, y: number, radius = 0): number {
    const wall = this.getSupportingWall(x, y, radius);
    return wall ? wall.wallHeight : 0;
  }
}
