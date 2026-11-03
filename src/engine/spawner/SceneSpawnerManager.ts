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

    // Default Super Apple Spawner: ensures King of the Hill Super Apple is in the arena (cap 1)
    const superAppleSpawner = new SceneSpawner({
      id: "spawner_super_apple_default",
      name: "Super Apple Spawner",
      enabled: true,
      prefabId: "prefab_super_apple",
      intervalMinutes: 1.0,
      maxCount: 1,
      designatedSpawnPoints: [
        { x: 15.0, y: 15.0, z: 0 },
        { x: 8.5, y: 8.5, z: 0 },
        { x: 21.5, y: 8.5, z: 0 },
        { x: 8.5, y: 21.5, z: 0 },
        { x: 21.5, y: 21.5, z: 0 },
      ],
    });

    this.spawners.set(superAppleSpawner.id, superAppleSpawner);

    // Default Gun Spawner: maintains firearms in the quarry arena
    const gunSpawner = new SceneSpawner({
      id: "spawner_gun_default",
      name: "Gun Weapon Spawner",
      enabled: true,
      prefabId: "prefab_pistol",
      intervalMinutes: 0.5,
      maxCount: 2,
      designatedSpawnPoints: [
        { x: 13.5, y: 15.0, z: 0 },
        { x: 16.5, y: 15.0, z: 0 },
        { x: 15.0, y: 8.5, z: 0 },
        { x: 15.0, y: 21.5, z: 0 },
      ],
    });

    this.spawners.set(gunSpawner.id, gunSpawner);
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

  public loadFromConfig(spawnersData: SceneSpawnerOptions[]): void {
    this.spawners.clear();
    for (const data of spawnersData) {
      const spawner = new SceneSpawner(data);
      this.spawners.set(spawner.id, spawner);
    }
    this.notifyChanged();
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
