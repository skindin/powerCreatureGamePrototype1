import { GameObject } from "../GameObject.js";
import { ConsumableModule } from "../ConsumableModule.js";
import { RollModule } from "../RollModule.js";
import { Prefab } from "./Prefab.js";
import { Arena } from "../Arena.js";
import { Character } from "../../character/Character.js";
import { SerializedPrefabConfig, deserializeGameObject, serializePrefab } from "../../config/WorldConfig.js";

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
        totalEnergyJoules: 4000,
        remainingEnergyJoules: 4000,
        consumeRateWatts: 800,
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
      rollModule: new RollModule({
        rollResistance: 0.45,
        bumpyRollEnabled: true,
        bumpiness: 0.28,
      }),
    });

    const stonePrefab = new Prefab({
      id: "prefab_stone",
      name: "Stone",
      icon: "🪨",
      archetype: stoneArchetype,
    });

    this.prefabs.set(stonePrefab.id, stonePrefab);

    // 🧙 Default "Player" character prefab
    const playerArchetype = new Character({
      id: "archetype_player",
      name: "Player",
      color: "#f59e0b",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
      randomSpawn: false,
    });

    const playerPrefab = new Prefab({
      id: "prefab_player",
      name: "Player",
      icon: "🧙",
      archetype: playerArchetype,
    });

    this.prefabs.set(playerPrefab.id, playerPrefab);
  }

  public getAll(): Prefab[] {
    return Array.from(this.prefabs.values());
  }

  public get(id: string): Prefab | undefined {
    return this.prefabs.get(id);
  }

  /**
   * Loads or updates prefab definitions from serialized world configuration.
   */
  public loadFromConfig(configs: SerializedPrefabConfig[]): void {
    if (!configs || !Array.isArray(configs)) return;
    for (const cfg of configs) {
      if (!cfg || !cfg.id || !cfg.archetype) continue;
      const archetype = deserializeGameObject(cfg.archetype);
      const existing = this.prefabs.get(cfg.id);
      if (existing) {
        existing.name = cfg.name;
        if (cfg.icon) existing.icon = cfg.icon;
        existing.archetype = archetype;
      } else {
        const prefab = new Prefab({
          id: cfg.id,
          name: cfg.name,
          icon: cfg.icon,
          archetype,
        });
        this.prefabs.set(cfg.id, prefab);
      }
    }
    this.notifyChanged();
  }

  public exportAll(): SerializedPrefabConfig[] {
    return Array.from(this.prefabs.values()).map(serializePrefab);
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

    let cloneRoll: RollModule | null = null;
    if (entity.rollModule) {
      cloneRoll = new RollModule({
        enabled: entity.rollModule.enabled,
        rollResistance: entity.rollModule.rollResistance,
        bumpyRollEnabled: entity.rollModule.bumpyRollEnabled,
        bumpiness: entity.rollModule.bumpiness,
        seed: entity.rollModule.seed,
      });
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
      rollModule: cloneRoll,
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
