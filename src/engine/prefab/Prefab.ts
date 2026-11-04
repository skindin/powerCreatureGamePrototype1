import { GameObject, Vector3D } from "../GameObject.js";
import { ConsumableModule } from "../ConsumableModule.js";
import { RollModule } from "../RollModule.js";
import { GunModule } from "../GunModule.js";
import { Arena } from "../Arena.js";
import { Character } from "../../character/Character.js";
import { LaserModule } from "../../character/LaserModule.js";
import { MeleeModule } from "../../character/MeleeModule.js";
import { ControlSchema } from "../../input/schema/ControlSchemaTypes.js";

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
      const totalJoules = src.totalEnergyJoulesProp.get(this.archetype.properties);
      cloneConsumable = new ConsumableModule({
        tag: src.tag,
        totalEnergyJoules: totalJoules,
        remainingEnergyJoules: totalJoules,
        consumeRateWatts: src.consumeRateWattsProp.get(this.archetype.properties),
        healRate: src.healRateProp.get(this.archetype.properties),
        minScaleFloor: src.minScaleFloor,
        minRadiusFloor: src.minRadiusFloor,
        unlimited: src.unlimited,
      });
      cloneConsumable.initialColliderRadius = src.initialColliderRadius;
    }

    let cloneRoll: RollModule | null = null;
    if (this.archetype.rollModule) {
      const src = this.archetype.rollModule;
      cloneRoll = new RollModule({
        enabled: src.enabled,
        rollResistance: src.rollResistanceProp.get(this.archetype.properties),
        bumpyRollEnabled: src.bumpyRollEnabled,
        bumpiness: src.bumpinessProp.get(this.archetype.properties),
        seed: src.seed,
      });
    }

    let cloneGun: GunModule | null = null;
    if (this.archetype.gunModule) {
      const src = this.archetype.gunModule;
      cloneGun = new GunModule({
        enabled: src.enabled,
        fireRate: src.fireRateProp.get(this.archetype.properties),
        damagePerBullet: src.damagePerBulletProp.get(this.archetype.properties),
        bulletSpeed: src.bulletSpeedProp.get(this.archetype.properties),
        firingSeconds: src.firingSecondsProp.get(this.archetype.properties),
        cooldownTime: src.cooldownTimeProp.get(this.archetype.properties),
        bulletMass: src.bulletMassProp.get(this.archetype.properties),
        gunLength: src.gunLength,
        gunWidth: src.gunWidth,
        bulletColor: src.bulletColor,
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
      gunModule: cloneGun,
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
        if (ent.rigidbodyModule) {
          ent.rigidbodyModule.massProp.literalValue = Number(value);
          ent.rigidbodyModule.massProp.set(Number(value), ent.properties);
        }
        break;
      case "colliderRadius":
        ent.colliderRadius = Number(value);
        if (ent.colliderModule) {
          ent.colliderModule.radius = Number(value);
          if (ent.colliderModule.radiusProp) {
            ent.colliderModule.radiusProp.literalValue = Number(value);
            ent.colliderModule.radiusProp.set(Number(value), ent.properties);
          }
        }
        if (ent.consumableModule) ent.consumableModule.initialColliderRadius = Number(value);
        break;
      case "friction":
        if (ent.frictionModule) {
          ent.frictionModule.staticFrictionProp.literalValue = Number(value);
          ent.frictionModule.staticFrictionProp.set(Number(value), ent.properties);
        }
        break;
      case "dynamicFriction":
        if (ent.frictionModule) {
          ent.frictionModule.dynamicFrictionProp.literalValue = Number(value);
          ent.frictionModule.dynamicFrictionProp.set(Number(value), ent.properties);
        }
        break;
      case "restitution":
      case "bounceMod":
        ent.bounceMod = Number(value);
        if (ent.bounceModule) {
          ent.bounceModule.bounceModProp.literalValue = Number(value);
          ent.bounceModule.bounceModProp.set(Number(value), ent.properties);
        }
        break;
      case "rollResistance":
        if (ent.rollModule) {
          ent.rollModule.rollResistanceProp.literalValue = Number(value);
          ent.rollModule.rollResistanceProp.set(Number(value), ent.properties);
        }
        break;
      case "bumpiness":
        if (ent.rollModule) {
          ent.rollModule.bumpinessProp.literalValue = Number(value);
          ent.rollModule.bumpinessProp.set(Number(value), ent.properties);
        }
        break;
      case "consumable_totalEnergy":
      case "consumableModule.totalEnergyJoules":
        if (ent.consumableModule) {
          ent.consumableModule.totalEnergyJoulesProp.literalValue = Number(value);
          ent.consumableModule.totalEnergyJoulesProp.set(Number(value), ent.properties);
          // If not partially eaten, keep remaining full
          if (ent.consumableModule.remainingEnergyJoulesProp.literalValue > Number(value)) {
            ent.consumableModule.remainingEnergyJoulesProp.literalValue = Number(value);
            ent.consumableModule.remainingEnergyJoulesProp.set(Number(value), ent.properties);
          }
        }
        break;
      case "consumable_consumeRate":
      case "consumableModule.consumeRateWatts":
        if (ent.consumableModule) {
          ent.consumableModule.consumeRateWattsProp.literalValue = Number(value);
          ent.consumableModule.consumeRateWattsProp.set(Number(value), ent.properties);
        }
        break;
      case "consumable_healRate":
      case "consumableModule.healRate":
        if (ent.consumableModule) {
          ent.consumableModule.healRateProp.literalValue = Number(value);
          ent.consumableModule.healRateProp.set(Number(value), ent.properties);
        }
        break;
      case "consumable_tag":
      case "consumableModule.tag":
        if (ent.consumableModule) {
          ent.consumableModule.tag = String(value);
        }
        break;
      case "consumable_unlimited":
      case "consumableModule.unlimited":
        if (ent.consumableModule) {
          ent.consumableModule.unlimited = Boolean(value);
        }
        break;
      case "gun_fireRate":
      case "gunModule.fireRate":
        if (ent.gunModule) {
          ent.gunModule.fireRateProp.literalValue = Number(value);
          ent.gunModule.fireRateProp.set(Number(value), ent.properties);
        }
        break;
      case "gun_damagePerBullet":
      case "gunModule.damagePerBullet":
        if (ent.gunModule) {
          ent.gunModule.damagePerBulletProp.literalValue = Number(value);
          ent.gunModule.damagePerBulletProp.set(Number(value), ent.properties);
        }
        break;
      case "gun_bulletSpeed":
      case "gunModule.bulletSpeed":
        if (ent.gunModule) {
          ent.gunModule.bulletSpeedProp.literalValue = Number(value);
          ent.gunModule.bulletSpeedProp.set(Number(value), ent.properties);
        }
        break;
      case "gun_firingSeconds":
      case "gunModule.firingSeconds":
        if (ent.gunModule) {
          ent.gunModule.firingSecondsProp.literalValue = Number(value);
          ent.gunModule.firingSecondsProp.set(Number(value), ent.properties);
        }
        break;
      case "gun_cooldownTime":
      case "gunModule.cooldownTime":
        if (ent.gunModule) {
          ent.gunModule.cooldownTimeProp.literalValue = Number(value);
          ent.gunModule.cooldownTimeProp.set(Number(value), ent.properties);
        }
        break;
      case "gun_bulletMass":
      case "gunModule.bulletMass":
        if (ent.gunModule) {
          ent.gunModule.bulletMassProp.literalValue = Number(value);
          ent.gunModule.bulletMassProp.set(Number(value), ent.properties);
        }
        break;
      case "gun_gunLength":
      case "gunModule.gunLength":
        if (ent.gunModule) ent.gunModule.gunLength = Number(value);
        break;
      case "gun_gunWidth":
      case "gunModule.gunWidth":
        if (ent.gunModule) ent.gunModule.gunWidth = Number(value);
        break;
      case "gun_bulletColor":
      case "gunModule.bulletColor":
        if (ent.gunModule) ent.gunModule.bulletColor = String(value);
        break;
      default:
        if (ent.properties && ent.properties.has(propKey)) {
          ent.properties.set(propKey, Number(value));
        }
        break;
    }
  }
}
