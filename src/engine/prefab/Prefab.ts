import { GameObject, Vector3D } from "../GameObject.js";
import { ConsumableModule } from "../ConsumableModule.js";
import { RollModule } from "../RollModule.js";
import { Arena } from "../Arena.js";
import { Character } from "../../character/Character.js";
import { LaserModule } from "../../character/LaserModule.js";
import { MeleeModule } from "../../character/MeleeModule.js";
import type { ControlSchema } from "../../input/schema/ControlSchemaTypes.js";

export interface PrefabOptions {
  id: string;
  name: string;
  icon?: string;
  archetype: GameObject;
  controlSchema?: ControlSchema;
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
  public controlSchema?: ControlSchema;

  constructor(options: PrefabOptions) {
    this.id = options.id;
    this.name = options.name;
    this.icon = options.icon ?? "📦";
    this.archetype = options.archetype;
    this.controlSchema = options.controlSchema;
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
        unlimited: src.unlimited,
      });
      cloneConsumable.initialColliderRadius = src.initialColliderRadius;
    }

    let cloneRoll: RollModule | null = null;
    if (this.archetype.rollModule) {
      cloneRoll = new RollModule({
        enabled: this.archetype.rollModule.enabled,
        rollResistance: this.archetype.rollModule.rollResistance,
        bumpyRollEnabled: this.archetype.rollModule.bumpyRollEnabled,
        bumpiness: this.archetype.rollModule.bumpiness,
        seed: this.archetype.rollModule.seed,
      });
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
      rollModule: cloneRoll,
    });

    instance.prefabId = this.id;
    instance.overriddenProperties = new Set<string>();

    if (this.archetype instanceof Character && instance instanceof Character) {
      const srcChar = this.archetype as Character;
      const targetChar = instance as Character;

      targetChar.strength = srcChar.strength;
      if (srcChar.laserModule) {
        targetChar.laserModule = new LaserModule({
          damageRate: srcChar.laserModule.damageRateProp.literalValue,
          maxDamageRate: srcChar.laserModule.maxDamageRateProp.literalValue,
          thickness: srcChar.laserModule.thicknessProp.literalValue,
          maxPower: srcChar.laserModule.maxPowerProp.literalValue,
        });
      }
      if (srcChar.meleeModule) {
        targetChar.meleeModule = new MeleeModule({
          maxForce: srcChar.meleeModule.maxForceProp.literalValue,
          reach: srcChar.meleeModule.reachProp.literalValue,
          punchFrequency: srcChar.meleeModule.punchFrequencyProp.literalValue,
        });
      }
      if (!srcChar.walkingModule) targetChar.walkingModule = null;
      if (!srcChar.pickupModule) targetChar.pickupModule = null;
      if (!srcChar.throwModule) targetChar.throwModule = null;
      if (!srcChar.jumpModule) targetChar.jumpModule = null;
      if (!srcChar.climbingModule) targetChar.climbingModule = null;

      const schemaToApply = this.controlSchema || srcChar.controlSchema;
      if (schemaToApply) {
        targetChar.controlSchema = JSON.parse(JSON.stringify(schemaToApply));
      }
    }

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
      case "consumable_unlimited":
        if (ent.consumableModule) {
          ent.consumableModule.unlimited = Boolean(value);
        }
        break;
    }
  }
}
