import { GameObject } from "../GameObject.js";
import { ConsumableModule } from "../ConsumableModule.js";
import { Prefab } from "./Prefab.js";
import { Arena } from "../Arena.js";

export class PrefabManager {
  private prefabs: Map<string, Prefab> = new Map();
  private onPrefabChangedCallbacks: Set<() => void> = new Set();

  constructor() {
    this.initDefaultPrefabs();
  }

  private initDefaultPrefabs(): void {
    // 🍏 Default "Apple" food prefab matching original green apple stats
    const appleArchetype = new GameObject({
      id: "archetype_apple",
      name: "Apple",
      position: { x: 0, y: 0, z: 0 },
      color: "#22c55e",
      visualShape: "circle",
      mass: 0.35,
      colliderRadius: 0.25,
      bounceMod: 0.2,
      hasGravity: true,
      hasVerticalPosition: true,
      consumableModule: new ConsumableModule({
        tag: "food",
        totalEnergyJoules: 2000,
        remainingEnergyJoules: 2000,
        consumeRateWatts: 400,
        healRate: 0,
        minScaleFloor: 0.35,
        minRadiusFloor: 0.12,
      }),
    });

    const applePrefab = new Prefab({
      id: "prefab_apple",
      name: "Apple",
      icon: "🍏",
      archetype: appleArchetype,
    });

    this.prefabs.set(applePrefab.id, applePrefab);

    // 🪨 Default "Stone" prefab: dense, rigid rock with low bounce that inflicts high impact damage when thrown
    const stoneArchetype = new GameObject({
      id: "archetype_stone",
      name: "Stone",
      position: { x: 0, y: 0, z: 0 },
      color: "#78716c",
      visualShape: "circle",
      mass: 0.85,
      colliderRadius: 0.22,
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
    });

    const stonePrefab = new Prefab({
      id: "prefab_stone",
      name: "Stone",
      icon: "🪨",
      archetype: stoneArchetype,
    });

    this.prefabs.set(stonePrefab.id, stonePrefab);
  }

  public getAll(): Prefab[] {
    return Array.from(this.prefabs.values());
  }

  public get(id: string): Prefab | undefined {
    return this.prefabs.get(id);
  }

  /**
   * Creates a new Prefab from an existing scene GameObject.
   * Links the source entity to the new prefab as its first instance.
   */
  public createFromEntity(entity: GameObject, name?: string): Prefab {
    const id = `prefab_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const prefabName = name || entity.name || "Custom Prefab";
    const icon = entity.consumableModule ? "🍎" : (entity.visualShape === "box" ? "📦" : "⚪");

    // Clone the archetype
    const GameObjectClass = entity.constructor as any;
    let cloneConsumable: ConsumableModule | null = null;
    if (entity.consumableModule) {
      const src = entity.consumableModule;
      cloneConsumable = new ConsumableModule({
        tag: src.tag,
        totalEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        remainingEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        consumeRateWatts: src.consumeRateWattsProp.literalValue,
        healRate: src.healRateProp.literalValue,
        minScaleFloor: src.minScaleFloor,
        minRadiusFloor: src.minRadiusFloor,
      });
      cloneConsumable.initialColliderRadius = src.initialColliderRadius;
    }

    const archetype = new GameObjectClass({
      name: prefabName,
      position: { x: 0, y: 0, z: 0 },
      color: entity.color,
      visualShape: entity.visualShape,
      mass: entity.mass,
      colliderRadius: entity.consumableModule
        ? (entity.consumableModule.initialColliderRadius || entity.colliderRadius)
        : entity.colliderRadius,
      bounceMod: entity.bounceMod,
      hasGravity: entity.hasGravity,
      hasVerticalPosition: entity.hasVerticalPosition,
      consumableModule: cloneConsumable,
    });

    const prefab = new Prefab({
      id,
      name: prefabName,
      icon,
      archetype,
    });

    this.prefabs.set(id, prefab);

    // Link source entity to this new prefab
    entity.prefabId = id;
    entity.overriddenProperties.clear();

    this.notifyChanged();
    return prefab;
  }

  /**
   * Instantiates a prefab into the scene.
   */
  public spawn(prefabId: string, pos?: Partial<{ x: number; y: number; z: number }>, arena?: Arena, objects?: GameObject[]): GameObject | null {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return null;
    const instance = prefab.instantiate(pos as any, arena);
    if (objects && !objects.includes(instance)) {
      objects.push(instance);
    }
    return instance;
  }

  /**
   * Deletes a prefab without deleting live instances.
   * Any live instances simply have their prefabId cleared.
   */
  public delete(prefabId: string, liveObjects?: GameObject[]): boolean {
    if (!this.prefabs.has(prefabId)) return false;
    this.prefabs.delete(prefabId);

    if (liveObjects) {
      for (const obj of liveObjects) {
        if (obj.prefabId === prefabId) {
          obj.prefabId = null;
          obj.overriddenProperties.clear();
        }
      }
    }

    this.notifyChanged();
    return true;
  }

  public onPrefabsChanged(cb: () => void): () => void {
    this.onPrefabChangedCallbacks.add(cb);
    return () => this.onPrefabChangedCallbacks.delete(cb);
  }

  private notifyChanged(): void {
    for (const cb of this.onPrefabChangedCallbacks) {
      cb();
    }
  }
}

export const prefabManager = new PrefabManager();
