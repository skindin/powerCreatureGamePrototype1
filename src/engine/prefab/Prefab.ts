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
        // Walking
        case "maxWalkSpeed":
        case "walkingModule.maxWalkSpeed":
        case "Max Walk Speed (u/s)":
          if (char.walkingModule) char.walkingModule.maxWalkSpeedProp.set(Number(value), char.properties);
          return;
        case "maxWalkForce":
        case "walkingModule.maxWalkForce":
        case "Max Walk Force (N)":
          if (char.walkingModule) char.walkingModule.maxWalkForceProp.set(Number(value), char.properties);
          return;
        case "sprintSpeed":
        case "maxSprintSpeed":
        case "walkingModule.sprintSpeed":
        case "Max Sprint Speed (u/s)":
          if (char.walkingModule) char.walkingModule.maxSprintSpeedProp.set(Number(value), char.properties);
          return;
        case "maxWalkPower":
        case "walkPowerCapacity":
        case "walkingModule.maxWalkPower":
        case "Max Walk Power (Watts)":
          if (char.walkingModule) char.walkingModule.maxWalkPowerProp.set(Number(value), char.properties);
          return;
        case "maxSprintPower":
        case "sprintPowerCapacity":
        case "walkingModule.maxSprintPower":
        case "Max Sprint Power (Watts)":
          if (char.walkingModule) char.walkingModule.maxSprintPowerProp.set(Number(value), char.properties);
          return;
        case "airFriction":
        case "walkingModule.airFriction":
        case "Air / Floating Friction":
          if (char.walkingModule) char.walkingModule.airFrictionProp.set(Number(value), char.properties);
          return;
        case "walkInAir":
        case "walkingModule.walkInAir":
        case "Air Control (Walk in Air)":
          if (char.walkingModule) char.walkingModule.walkInAir = Boolean(value);
          return;
        case "canSprint":
        case "walkingModule.canSprint":
        case "Can Sprint (Shift / Gamepad)":
        case "Can Sprint":
          if (char.walkingModule) char.walkingModule.canSprint = Boolean(value);
          return;
        case "walkConsumesEnergy":
        case "walkingModule.walkConsumesEnergy":
        case "Walk Consumes Energy":
          if (char.walkingModule) char.walkingModule.walkConsumesEnergy = Boolean(value);
          return;
        case "walkAllowPartialPower":
        case "walkingModule.walkAllowPartialPower":
          if (char.walkingModule) char.walkingModule.walkAllowPartialPower = Boolean(value);
          return;
        case "sprintConsumesEnergy":
        case "walkingModule.sprintConsumesEnergy":
        case "Sprint Consumes Energy":
          if (char.walkingModule) char.walkingModule.sprintConsumesEnergy = Boolean(value);
          return;
        case "sprintAllowPartialPower":
        case "walkingModule.sprintAllowPartialPower":
          if (char.walkingModule) char.walkingModule.sprintAllowPartialPower = Boolean(value);
          return;

        // Jump
        case "jumpImpulse":
        case "jumpStrength":
        case "jumpModule.jumpImpulse":
        case "Jump Impulse (N·s)":
        case "Jump Strength (N·s)":
          if (char.jumpModule) char.jumpModule.jumpStrengthProp.set(Number(value), char.properties);
          return;
        case "maxInitialSpeed":
        case "jumpModule.maxInitialSpeed":
        case "Max Takeoff Speed (u/s)":
          if (char.jumpModule) char.jumpModule.maxInitialSpeedProp.set(Number(value), char.properties);
          return;
        case "jumpPowerCapacity":
        case "maxJumpPower":
        case "jumpModule.jumpPowerCapacity":
        case "Jump Power (Watts)":
        case "Max Jump Power (Watts)":
          if (char.jumpPowerCapacityProp) char.jumpPowerCapacityProp.set(Number(value), char.properties);
          return;
        case "jumpConsumesEnergy":
        case "jumpModule.jumpConsumesEnergy":
        case "Jump Consumes Energy":
          char.jumpConsumesEnergy = Boolean(value);
          return;
        case "jumpAllowPartialPower":
        case "jumpModule.jumpAllowPartialPower":
          char.jumpAllowPartialPower = Boolean(value);
          return;

        // Throw
        case "throwForce":
        case "maxThrowSpeed":
        case "throwModule.maxThrowSpeed":
        case "throwModule.throwForce":
        case "Throw Launch Speed (u/s)":
        case "Max Throw Speed (u/s)":
          if (char.throwModule) {
            char.throwModule.baseThrowForceProp.set(Number(value), char.properties);
            char.throwModule.maxThrowSpeedProp.set(Number(value), char.properties);
          }
          return;
        case "maxThrowHeight":
        case "throwModule.maxThrowHeight":
        case "Max Throw Height (u)":
          if (char.throwModule) char.throwModule.maxThrowHeightProp.set(Number(value), char.properties);
          return;
        case "throwPowerCapacity":
        case "maxPower":
        case "maxThrowPower":
        case "throwModule.maxPower":
        case "throwModule.throwPowerCapacity":
        case "Max Throw Power (Watts)":
          if (char.throwModule) char.throwModule.maxPowerProp.set(Number(value), char.properties);
          return;
        case "throwConsumesEnergy":
        case "throwModule.consumesEnergy":
        case "Throw Consumes Energy":
          if (char.throwModule) char.throwModule.consumesEnergy = Boolean(value);
          return;

        // Pickup
        case "pickupReach":
        case "pickupModule.pickupReach":
        case "Pickup Reach (3D) (u)":
          if (char.pickupModule) char.pickupModule.pickupReachProp.set(Number(value), char.properties);
          return;
        case "maxPickupPower":
        case "pickupPowerCapacity":
        case "pickupModule.maxPower":
        case "Max Pickup Power (Watts)":
          if (char.pickupModule) char.pickupModule.maxPowerProp.set(Number(value), char.properties);
          return;
        case "pickupConsumesEnergy":
        case "pickupModule.consumesEnergy":
        case "Pickup Consumes Energy":
          if (char.pickupModule) char.pickupModule.consumesEnergy = Boolean(value);
          return;
        case "pickupAllowPartialPower":
        case "pickupModule.allowPartialPower":
          if (char.pickupModule) char.pickupModule.allowPartialPower = Boolean(value);
          return;

        // Climbing
        case "climbSpeed":
        case "climbingModule.climbSpeed":
        case "Climb Speed (u/s)":
        case "Max Climb Speed (u/s)":
          if (char.climbingModule?.maxClimbSpeedProp) char.climbingModule.maxClimbSpeedProp.set(Number(value), char.properties);
          return;
        case "maxAdhesion":
        case "climbingModule.maxAdhesion":
        case "Max Adhesion (N)":
          if (char.climbingModule?.maxAdhesionProp) char.climbingModule.maxAdhesionProp.set(Number(value), char.properties);
          return;
        case "climbPowerCapacity":
        case "climbMaxPower":
        case "climbingModule.maxPower":
        case "Max Climb Power (Watts)":
          if (char.climbingModule?.maxPowerProp) char.climbingModule.maxPowerProp.set(Number(value), char.properties);
          return;
        case "horizontalClimb":
        case "climbingModule.horizontalClimb":
          if (char.climbingModule) char.climbingModule.horizontalClimb = Boolean(value);
          return;
        case "climbConsumesEnergy":
        case "climbingModule.climbConsumesEnergy":
        case "climbingModule.consumesEnergy":
        case "Climb Consumes Energy":
          if (char.climbingModule) char.climbingModule.consumesEnergy = Boolean(value);
          return;
        case "climbAllowPartialPower":
        case "climbingModule.climbAllowPartialPower":
        case "climbingModule.allowPartialPower":
          if (char.climbingModule) char.climbingModule.allowPartialPower = Boolean(value);
          return;

        // Health
        case "maxHp":
        case "healthModule.maxHp":
        case "Max HP":
        case "Max Health (HP)":
          if (char.healthModule) {
            char.healthModule.maxHp = Number(value);
            if (char.healthModule.maxHpProp) char.healthModule.maxHpProp.set(Number(value), char.properties);
          }
          return;
        case "currentHp":
        case "healthModule.currentHp":
        case "Current HP":
        case "Current Health (HP)":
          if (char.healthModule) {
            char.healthModule.currentHp = Number(value);
            if (char.healthModule.currentHpProp) char.healthModule.currentHpProp.set(Number(value), char.properties);
          }
          return;
        case "naturalHealRate":
        case "healthModule.naturalHealRate":
        case "Passive Heal Rate (HP/s)":
          if (char.healthModule) {
            char.healthModule.maxHealRate = Number(value);
            if (char.healthModule.maxHealRateProp) char.healthModule.maxHealRateProp.set(Number(value), char.properties);
          }
          return;
        case "hpPerJoule":
        case "healthModule.hpPerJoule":
        case "Healing Efficiency (HP/Joule)":
          if (char.healthModule?.hpPerJouleProp) char.healthModule.hpPerJouleProp.set(Number(value), char.properties);
          return;
        case "healthPowerCapacity":
        case "healthMaxPower":
        case "healthModule.maxPower":
        case "Max Healing Power (Watts)":
          if (char.healthModule?.maxPowerProp) char.healthModule.maxPowerProp.set(Number(value), char.properties);
          return;
        case "healthConsumesEnergy":
        case "healthModule.consumesEnergy":
        case "Healing Consumes Energy":
          if (char.healthModule) char.healthModule.consumesEnergy = Boolean(value);
          return;
        case "healthAllowPartialPower":
        case "healthModule.allowPartialPower":
          if (char.healthModule) char.healthModule.allowPartialPower = Boolean(value);
          return;

        // Energy Pool / Stamina
        case "staminaCapacity":
        case "energyPool.staminaCapacity":
        case "Stamina Capacity (J)":
          if (char.energyPool?.maxStaminaProp) char.energyPool.maxStaminaProp.set(Number(value), char.properties);
          return;
        case "staminaRegenRate":
        case "energyPool.staminaRegenRate":
        case "Stamina Regen (W)":
        case "Passive Regen Rate (W = J/s)":
          if (char.energyPool?.staminaRegenRateProp) char.energyPool.staminaRegenRateProp.set(Number(value), char.properties);
          return;
        case "energyPoolCapacity":
        case "energyPool.energyPoolCapacity":
        case "Calorie Pool Capacity (J)":
        case "Energy Pool Capacity (J)":
        case "Max Energy Capacity (J)":
          if (char.energyPool?.maxEnergyProp) char.energyPool.maxEnergyProp.set(Number(value), char.properties);
          return;
        case "currentStamina":
        case "energyPool.currentStamina":
        case "Current Stamina (Joules)":
          if (char.energyPool?.currentStaminaProp) char.energyPool.currentStaminaProp.set(Number(value), char.properties);
          return;
        case "currentEnergy":
        case "energyPool.currentEnergy":
        case "Current Energy (J)":
          if (char.energyPool?.currentEnergyProp) char.energyPool.currentEnergyProp.set(Number(value), char.properties);
          return;
        // Laser
        case "laserDamageRate":
        case "laserModule.damageRate":
        case "Laser Damage Rate (HP/s)":
          if (char.laserModule?.damageRateProp) char.laserModule.damageRateProp.set(Number(value), char.properties);
          return;
        case "laserThickness":
        case "laserModule.thickness":
        case "Beam Thickness (World Units)":
          if (char.laserModule?.thicknessProp) char.laserModule.thicknessProp.set(Number(value), char.properties);
          return;
        case "laserMaxPower":
        case "laserModule.maxPower":
        case "Max Power Rating (Watts)":
        case "Laser Max Power (Watts)":
          if (char.laserModule?.maxPowerProp) char.laserModule.maxPowerProp.set(Number(value), char.properties);
          return;
        case "laserAllowPartialPower":
        case "laserModule.allowPartialPower":
          if (char.laserModule) char.laserModule.allowPartialPower = Boolean(value);
          return;

        // Melee
        case "meleeImpactForce":
        case "meleeModule.impactForce":
        case "Impact Force (N·s)":
        case "Max Punch Force (Newtons)":
          if (char.meleeModule?.maxForceProp) char.meleeModule.maxForceProp.set(Number(value), char.properties);
          return;
        case "punchFrequency":
        case "meleeModule.punchFrequency":
        case "Punch Frequency (Hz)":
          if (char.meleeModule?.punchFrequencyProp) char.meleeModule.punchFrequencyProp.set(Number(value), char.properties);
          return;
        case "meleeReach":
        case "meleeModule.reach":
        case "Attack Reach (Meters)":
          if (char.meleeModule?.reachProp) char.meleeModule.reachProp.set(Number(value), char.properties);
          return;
        case "meleeWidth":
        case "meleeModule.width":
        case "Attack Width (Meters)":
          if (char.meleeModule?.widthProp) char.meleeModule.widthProp.set(Number(value), char.properties);
          return;
        case "meleeMaxPower":
        case "meleeModule.maxPower":
        case "Max Attack Power (Watts)":
        case "Melee Max Power (Watts)":
          if (char.meleeModule?.maxPowerProp) char.meleeModule.maxPowerProp.set(Number(value), char.properties);
          return;
        case "meleeAllowPartialPower":
        case "meleeModule.allowPartialPower":
          if (char.meleeModule) char.meleeModule.allowPartialPower = Boolean(value);
          return;

        // Wall Edge Assist
        case "hangDistance":
        case "wallEdgeAssistModule.hangDistance":
        case "Ledge Hang Distance (u)":
          if (char.wallEdgeAssistModule?.hangDistanceProp) char.wallEdgeAssistModule.hangDistanceProp.set(Number(value), char.properties);
          return;

        // Strength
        case "strength":
        case "Muscle Strength Ratio (×)":
          char.strength = Number(value);
          if (char.strengthProp) char.strengthProp.set(Number(value), char.properties);
          return;

        // Damage Aura
        case "auraRadius":
        case "damageAuraModule.damageRadius":
        case "Aura Radius (u)":
          if (char.damageAuraModule?.damageRadiusProp) char.damageAuraModule.damageRadiusProp.set(Number(value), char.properties);
          return;
        case "damageAuraRate":
        case "damageAuraModule.damageRate":
        case "Damage Rate (HP/s)":
          if (char.damageAuraModule?.damageRateProp) char.damageAuraModule.damageRateProp.set(Number(value), char.properties);
          return;

        // Damage Solver
        case "impactSusceptibility":
        case "damageSolverModule.impactSusceptibility":
        case "Impact Susceptibility (×)":
          if (char.damageSolverModule?.impactSusceptibilityProp) char.damageSolverModule.impactSusceptibilityProp.set(Number(value), char.properties);
          return;
        case "minShockThreshold":
        case "damageSolverModule.minShockThreshold":
        case "Min Shock Threshold (N·s)":
          if (char.damageSolverModule?.damageThresholdHpProp) char.damageSolverModule.damageThresholdHpProp.set(Number(value), char.properties);
          return;
        case "selfImpactWeight":
        case "damageSolverModule.selfImpactWeight":
        case "Self Impact Weight":
          if (char.damageSolverModule?.selfImpactWeightProp) char.damageSolverModule.selfImpactWeightProp.set(Number(value), char.properties);
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
