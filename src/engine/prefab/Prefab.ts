import { GameObject, Vector3D } from "../GameObject.js";
import { ConsumableModule } from "../ConsumableModule.js";
import { RollModule } from "../RollModule.js";
import { Arena } from "../Arena.js";
import { Character } from "../../character/Character.js";
import { serializeCharacter, applyCharacterConfig } from "../../config/WorldConfig.js";

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
    if ((this.archetype as any).isCharacter) {
      const srcChar = this.archetype as Character;
      const spawnPos: Vector3D = {
        x: pos?.x ?? this.archetype.position.x,
        y: pos?.y ?? this.archetype.position.y,
        z: pos?.z ?? this.archetype.position.z,
      };

      const instance = new Character({
        name: srcChar.name,
        color: srcChar.color,
        colliderRadius: srcChar.colliderRadius,
        mass: srcChar.mass,
        strength: srcChar.strength,
        randomSpawn: pos ? false : true,
        x: spawnPos.x,
        y: spawnPos.y,
      });
      instance.position.z = spawnPos.z;
      instance.prefabId = this.id;
      instance.overriddenProperties = new Set<string>();

      // Transfer full serialized capability configs (walking, jump, throw, health, energy, etc.)
      applyCharacterConfig(instance, serializeCharacter(srcChar));

      if (arena && typeof (arena as any).syncEntitiesWithWalls === "function") {
        (arena as any).syncEntitiesWithWalls([instance]);
      }
      return instance;
    }

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
    if ((ent as any).isCharacter) {
      const char = ent as Character;
      switch (propKey) {
        case "maxWalkSpeed":
        case "Max Walk Speed (u/s)":
          if (char.walkingModule) char.walkingModule.maxWalkSpeedProp.set(Number(value), char.properties);
          return;
        case "maxWalkForce":
        case "Max Walk Force (N)":
          if (char.walkingModule) char.walkingModule.maxWalkForceProp.set(Number(value), char.properties);
          return;
        case "sprintSpeed":
        case "maxSprintSpeed":
        case "Max Sprint Speed (u/s)":
          if (char.walkingModule) char.walkingModule.maxSprintSpeedProp.set(Number(value), char.properties);
          return;
        case "jumpImpulse":
        case "Jump Impulse (N·s)":
          if (char.jumpModule) char.jumpModule.jumpStrengthProp.set(Number(value), char.properties);
          return;
        case "throwForce":
        case "Throw Launch Speed (u/s)":
          if (char.throwModule) char.throwModule.baseThrowForceProp.set(Number(value), char.properties);
          return;
        case "climbSpeed":
        case "Climb Speed (u/s)":
          if (char.climbingModule?.maxClimbSpeedProp) char.climbingModule.maxClimbSpeedProp.set(Number(value), char.properties);
          return;
        case "maxHp":
        case "Max HP":
          if (char.healthModule) char.healthModule.maxHp = Number(value);
          return;
        case "currentHp":
        case "Current HP":
          if (char.healthModule) char.healthModule.currentHp = Number(value);
          return;
        case "naturalHealRate":
        case "Passive Heal Rate (HP/s)":
          if (char.healthModule) char.healthModule.maxHealRate = Number(value);
          return;
        case "staminaCapacity":
        case "Stamina Capacity (J)":
          if (char.energyPool?.maxStaminaProp) char.energyPool.maxStaminaProp.set(Number(value), char.properties);
          return;
        case "staminaRegenRate":
        case "Stamina Regen (W)":
          if (char.energyPool?.staminaRegenRateProp) char.energyPool.staminaRegenRateProp.set(Number(value), char.properties);
          return;
        case "energyPoolCapacity":
        case "Calorie Pool Capacity (J)":
          if (char.energyPool?.maxEnergyProp) char.energyPool.maxEnergyProp.set(Number(value), char.properties);
          return;
        case "laserDamageRate":
          if (char.laserModule?.damageRateProp) char.laserModule.damageRateProp.set(Number(value), char.properties);
          return;
        case "meleeImpactForce":
          if (char.meleeModule?.maxForceProp) char.meleeModule.maxForceProp.set(Number(value), char.properties);
          return;
        case "strength":
          char.strength = Number(value);
          return;
      }
    }

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
      default:
        // DynamicProperty registry fallback if a named object property exists
        if (ent.properties && ent.properties.has(propKey)) {
          ent.properties.set(propKey, Number(value));
        }
        break;
    }
  }
}
