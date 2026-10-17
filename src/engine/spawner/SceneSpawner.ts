import { GameObject } from "../GameObject.js";
import { Arena } from "../Arena.js";
import { PrefabManager } from "../prefab/PrefabManager.js";

export interface SceneSpawnerOptions {
  id: string;
  name?: string;
  enabled?: boolean;
  prefabId: string;
  intervalMinutes?: number;
  maxCount?: number;
}

/**
 * SceneSpawner
 * 
 * Background spawner that spawns prefab instances throughout the arena at a configurable
 * time interval (in minutes), capped at a maximum count of live scene instances.
 */
export class SceneSpawner {
  public id: string;
  public name: string;
  public enabled: boolean = true;
  public prefabId: string;
  
  /** Interval in minutes between spawn attempts (e.g. 0.20 min = 12s, 1.0 min = 60s) */
  public intervalMinutes: number = 0.20;

  /** Maximum number of active live instances of this prefab allowed in the scene */
  public maxCount: number = 5;

  /** Elapsed time in seconds towards next spawn */
  public timerSeconds: number = 0;

  constructor(options: SceneSpawnerOptions) {
    this.id = options.id;
    this.name = options.name || "Scene Spawner";
    if (options.enabled !== undefined) this.enabled = options.enabled;
    this.prefabId = options.prefabId;
    if (options.intervalMinutes !== undefined) this.intervalMinutes = Math.max(0.01, options.intervalMinutes);
    if (options.maxCount !== undefined) this.maxCount = Math.max(1, options.maxCount);
  }

  /**
   * Returns current count of active live instances of this prefab in the scene.
   */
  public getActiveCount(objects: GameObject[]): number {
    return objects.filter((o) => o.prefabId === this.prefabId).length;
  }

  /**
   * Advances timer and spawns an instance when interval expires, unless maxCount is reached.
   */
  public update(dt: number, arena: Arena, objects: GameObject[], prefabManager: PrefabManager): GameObject | null {
    if (!this.enabled || !arena) return null;

    const activeCount = this.getActiveCount(objects);
    if (activeCount >= this.maxCount) {
      // Pause countdown or reset if at/exceeded cap
      return null;
    }

    this.timerSeconds += dt;
    const targetIntervalSec = this.intervalMinutes * 60;

    if (this.timerSeconds >= targetIntervalSec) {
      this.timerSeconds = 0;
      return this.spawnNow(arena, objects, prefabManager);
    }

    return null;
  }

  /**
   * Immediately spawns an instance of the assigned prefab at a valid random open ground spot.
   */
  public spawnNow(arena: Arena, objects: GameObject[], prefabManager: PrefabManager): GameObject | null {
    if (!arena) return null;

    const activeCount = this.getActiveCount(objects);
    if (activeCount >= this.maxCount) {
      return null;
    }

    const pos = this.findRandomGroundPosition(arena);
    const instance = prefabManager.spawn(this.prefabId, pos, arena, objects);
    return instance;
  }

  /**
   * Finds a random open ground coordinate in the arena away from perimeter and solid walls.
   */
  public findRandomGroundPosition(arena: Arena): { x: number; y: number; z: number } {
    const margin = 1.5;
    const minX = margin;
    const maxX = Math.max(margin + 1, arena.width - margin);
    const minY = margin;
    const maxY = Math.max(margin + 1, arena.height - margin);

    // Try up to 25 random points to find an open floor tile
    for (let i = 0; i < 25; i++) {
      const rx = minX + Math.random() * (maxX - minX);
      const ry = minY + Math.random() * (maxY - minY);
      const tileX = Math.floor(rx);
      const tileY = Math.floor(ry);

      if (!arena.hasWall(tileX, tileY)) {
        return { x: rx, y: ry, z: 0 };
      }
    }

    // Fallback: arena center
    return { x: arena.width / 2, y: arena.height / 2, z: 0 };
  }
}
