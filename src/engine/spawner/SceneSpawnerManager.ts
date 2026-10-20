import { GameObject } from "../GameObject.js";
import { Arena } from "../Arena.js";
import { SceneSpawner, SceneSpawnerOptions } from "./SceneSpawner.js";
import { prefabManager, PrefabManager } from "../prefab/PrefabManager.js";

import { QUARRY_APPLE_SPAWN_POINTS } from "../maps/QuarryMap.js";

export class SceneSpawnerManager {
  private spawners: Map<string, SceneSpawner> = new Map();
  private onSpawnersChangedCallbacks: Set<() => void> = new Set();
  public prefabManager: PrefabManager;

  constructor(pm: PrefabManager = prefabManager) {
    this.prefabManager = pm;
    this.initDefaultSpawners();
  }

  private initDefaultSpawners(): void {
    // Default Apple Spawner: spawns apples at designated clearings throughout the arena
    const appleSpawner = new SceneSpawner({
      id: "spawner_apple_default",
      name: "Apple Spawner",
      enabled: true,
      prefabId: "prefab_apple",
      intervalMinutes: 0.25, // every 15 seconds
      maxCount: 5,           // up to 5 apples in scene at once
      designatedSpawnPoints: QUARRY_APPLE_SPAWN_POINTS,
    });

    this.spawners.set(appleSpawner.id, appleSpawner);
  }

  public getAll(): SceneSpawner[] {
    return Array.from(this.spawners.values());
  }

  public get(id: string): SceneSpawner | undefined {
    return this.spawners.get(id);
  }

  public create(options: SceneSpawnerOptions): SceneSpawner {
    const spawner = new SceneSpawner(options);
    this.spawners.set(spawner.id, spawner);
    this.notifyChanged();
    return spawner;
  }

  public delete(id: string): boolean {
    const deleted = this.spawners.delete(id);
    if (deleted) {
      this.notifyChanged();
    }
    return deleted;
  }

  public update(dt: number, arena: Arena, objects: GameObject[]): void {
    for (const spawner of this.spawners.values()) {
      if (spawner.enabled) {
        spawner.update(dt, arena, objects, this.prefabManager);
      }
    }
  }

  public onSpawnersChanged(cb: () => void): () => void {
    this.onSpawnersChangedCallbacks.add(cb);
    return () => this.onSpawnersChangedCallbacks.delete(cb);
  }

  private notifyChanged(): void {
    for (const cb of this.onSpawnersChangedCallbacks) {
      cb();
    }
  }
}

export const sceneSpawnerManager = new SceneSpawnerManager();
