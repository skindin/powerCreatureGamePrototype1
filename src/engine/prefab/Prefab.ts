import { GameObject, Vector3D } from "../GameObject.js";
import { ConsumableModule } from "../ConsumableModule.js";
import { Arena } from "../Arena.js";

export interface PrefabOptions {
  id: string;
  name: string;
  icon?: string;
  archetype: GameObject;
}

/**
 * Prefab
 * 
 * In-memory scene template defining an entity archetype.
 * Instantiating a prefab creates a live GameObject instance linked to this prefab.
 * When prefab properties are edited, changes dynamically propagate to all live instances
 * that have not explicitly overridden that property.
 */
export class Prefab {
  public id: string;
  public name: string;
  public icon: string;
  public archetype: GameObject;

  constructor(options: PrefabOptions) {
    this.id = options.id;
    this.name = options.name;
    this.icon = options.icon ?? "📦";
    this.archetype = options.archetype;
  }

  /**
   * Instantiates a new live GameObject from this prefab.
   */
  public instantiate(pos?: Partial<Vector3D>, arena?: Arena): GameObject {
    const GameObjectClass = this.archetype.constructor as any;

    let cloneConsumable: ConsumableModule | null = null;
    if (this.archetype.consumableModule) {
      const src = this.archetype.consumableModule;
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

    const spawnPos: Vector3D = {
      x: pos?.x ?? this.archetype.position.x,
      y: pos?.y ?? this.archetype.position.y,
      z: pos?.z ?? this.archetype.position.z,
    };

    const instance: GameObject = new GameObjectClass({
      name: this.archetype.name,
      position: spawnPos,
      color: this.archetype.color,
      visualShape: this.archetype.visualShape,
      mass: this.archetype.mass,
      colliderRadius: this.archetype.consumableModule
        ? (this.archetype.consumableModule.initialColliderRadius || this.archetype.colliderRadius)
        : this.archetype.colliderRadius,
      bounceMod: this.archetype.bounceMod,
      hasGravity: this.archetype.hasGravity,
      hasVerticalPosition: this.archetype.hasVerticalPosition,
      consumableModule: cloneConsumable,
    });

    instance.prefabId = this.id;
    instance.overriddenProperties = new Set<string>();

    if (arena && typeof (arena as any).syncEntitiesWithWalls === "function") {
      (arena as any).syncEntitiesWithWalls([instance]);
    }

    return instance;
  }

  /**
   * Updates a property on the prefab archetype and cascades the change to all
   * live instances that have not overridden this property.
   */
  public setProperty(propKey: string, value: any, liveObjects: GameObject[]): void {
    // 1. Update archetype
    this.applyPropertyToEntity(this.archetype, propKey, value);

    // 2. Cascade to non-overridden live instances
    for (const obj of liveObjects) {
      if (obj.prefabId === this.id) {
        if (!obj.overriddenProperties.has(propKey)) {
          this.applyPropertyToEntity(obj, propKey, value);
        }
      }
    }
  }

  private applyPropertyToEntity(ent: GameObject, propKey: string, value: any): void {
    switch (propKey) {
      case "name":
        ent.name = String(value);
        break;
      case "color":
        ent.color = String(value);
        break;
      case "visualShape":
        ent.visualShape = value === "box" ? "box" : "circle";
        break;
      case "mass":
        ent.mass = Number(value);
        if (ent.rigidbodyModule) ent.rigidbodyModule.massProp.literalValue = Number(value);
        break;
      case "colliderRadius":
        ent.colliderRadius = Number(value);
        if (ent.colliderModule) ent.colliderModule.radius = Number(value);
        if (ent.consumableModule) ent.consumableModule.initialColliderRadius = Number(value);
        break;
      case "consumable_totalEnergy":
        if (ent.consumableModule) {
          ent.consumableModule.totalEnergyJoulesProp.literalValue = Number(value);
          // If not partially eaten, keep remaining full
          if (ent.consumableModule.remainingEnergyJoulesProp.literalValue > Number(value)) {
            ent.consumableModule.remainingEnergyJoulesProp.literalValue = Number(value);
          }
        }
        break;
      case "consumable_consumeRate":
        if (ent.consumableModule) {
          ent.consumableModule.consumeRateWattsProp.literalValue = Number(value);
        }
        break;
      case "consumable_healRate":
        if (ent.consumableModule) {
          ent.consumableModule.healRateProp.literalValue = Number(value);
        }
        break;
      case "consumable_tag":
        if (ent.consumableModule) {
          ent.consumableModule.tag = String(value);
        }
        break;
    }
  }
}
