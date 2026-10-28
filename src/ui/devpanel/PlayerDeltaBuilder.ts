import { Character } from "../../character/Character.js";
import type { GameObject } from "../../engine/GameObject.js";
import type { DynamicProperty } from "../../engine/properties/DynamicProperty.js";
import type { SerializedCharacterConfig } from "../../config/WorldConfig.js";

/**
 * Isolated utility for resolving DynamicProperty sockets to canonical WorldConfig
 * property paths and constructing single-property player delta payloads.
 * Adding or renaming a module property path happens strictly in this file.
 */
export class PlayerDeltaBuilder {
  public static setNestedProperty(target: any, path: string, value: any): void {
    const parts = path.split(".");
    let curr = target;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]] || typeof curr[parts[i]] !== "object") {
        curr[parts[i]] = {};
      }
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = value;
  }

  public static resolvePropertyPath(owner: GameObject, prop: DynamicProperty, label?: string): string {
    const isChar = owner instanceof Character || (owner as any).isCharacter;
    if (isChar) {
      const char = owner as Character;
      if (char.walkingModule) {
        if (prop === char.walkingModule.maxWalkForceProp) return "walkingModule.maxWalkForce";
        if (prop === char.walkingModule.maxWalkSpeedProp) return "walkingModule.maxWalkSpeed";
        if (prop === char.walkingModule.maxSprintSpeedProp) return "walkingModule.sprintSpeed";
        if (prop === char.walkingModule.maxWalkPowerProp || prop === char.walkingModule.walkPowerCapacityProp) return "walkingModule.maxWalkPower";
        if (prop === char.walkingModule.maxSprintPowerProp || prop === char.walkingModule.sprintPowerCapacityProp) return "walkingModule.maxSprintPower";
        if (prop === char.walkingModule.airFrictionProp) return "walkingModule.airFriction";
      }
      if (char.jumpModule) {
        if (prop === char.jumpModule.jumpStrengthProp) return "jumpModule.jumpImpulse";
        if (prop === char.jumpModule.maxInitialSpeedProp) return "jumpModule.maxInitialSpeed";
      }
      if (char.jumpPowerCapacityProp && prop === char.jumpPowerCapacityProp) {
        return "jumpModule.jumpPowerCapacity";
      }
      if (char.throwModule) {
        if (prop === char.throwModule.maxPowerProp) return "throwModule.throwPowerCapacity";
        if (prop === char.throwModule.maxThrowSpeedProp) return "throwModule.maxThrowSpeed";
        if (prop === char.throwModule.maxThrowHeightProp) return "throwModule.maxThrowHeight";
      }
      if (char.pickupModule) {
        if (prop === char.pickupModule.pickupReachProp) return "pickupModule.pickupReach";
        if (prop === char.pickupModule.maxPowerProp) return "pickupModule.maxPower";
      }
      if (char.climbingModule) {
        if (prop === char.climbingModule.maxClimbSpeedProp) return "climbingModule.climbSpeed";
        if (prop === char.climbingModule.maxPowerProp) return "climbingModule.maxPower";
        if (prop === char.climbingModule.maxAdhesionProp) return "climbingModule.maxAdhesion";
      }
      if (char.laserModule) {
        if (prop === char.laserModule.damageRateProp) return "laserModule.damageRate";
        if (prop === char.laserModule.thicknessProp) return "laserModule.thickness";
        if (prop === char.laserModule.maxPowerProp) return "laserModule.maxPower";
      }
      if (char.meleeModule) {
        if (prop === char.meleeModule.maxForceProp) return "meleeModule.impactForce";
        if (prop === char.meleeModule.maxPowerProp) return "meleeModule.maxPower";
        if (prop === char.meleeModule.punchFrequencyProp) return "meleeModule.punchFrequency";
        if (prop === char.meleeModule.reachProp) return "meleeModule.reach";
        if (prop === char.meleeModule.widthProp) return "meleeModule.width";
      }
      if (char.healthModule) {
        if (prop === char.healthModule.maxHpProp) return "healthModule.maxHp";
        if (prop === char.healthModule.maxHealRateProp) return "healthModule.naturalHealRate";
        if (prop === char.healthModule.maxPowerProp) return "healthModule.maxPower";
        if (prop === char.healthModule.joulesPerHpProp) return "healthModule.joulesPerHp";
      }
      if (char.energyPool) {
        if (prop === char.energyPool.maxStaminaProp) return "energyPool.staminaCapacity";
        if (prop === char.energyPool.staminaRegenRateProp) return "energyPool.staminaRegenRate";
        if (prop === char.energyPool.maxEnergyProp) return "energyPool.energyPoolCapacity";
      }
      if (char.wallEdgeAssistModule) {
        if (prop === char.wallEdgeAssistModule.hangDistanceProp) return "wallEdgeAssistModule.hangDistance";
      }
      if (char.strengthProp && prop === char.strengthProp) return "strength";
      if (char.colliderModule && prop === char.colliderModule.radiusProp) return "colliderRadius";
      if (char.rigidbodyModule && prop === char.rigidbodyModule.massProp) return "mass";
    }

    if (owner.rigidbodyModule && prop === owner.rigidbodyModule.massProp) return "mass";
    if (owner.colliderModule && prop === owner.colliderModule.radiusProp) return "colliderRadius";
    if (owner.frictionModule) {
      if (prop === owner.frictionModule.staticFrictionProp) return "friction";
      if (prop === owner.frictionModule.dynamicFrictionProp) return "dynamicFriction";
    }
    if (owner.bounceModule && prop === owner.bounceModule.bounceModProp) return "restitution";
    if (owner.rollModule) {
      if (prop === owner.rollModule.rollResistanceProp) return "rollResistance";
      if (prop === owner.rollModule.bumpinessProp) return "bumpiness";
    }
    if (owner.consumableModule) {
      if (prop === owner.consumableModule.totalEnergyJoulesProp) return "consumableModule.totalEnergyJoules";
      if (prop === owner.consumableModule.remainingEnergyJoulesProp) return "consumableModule.remainingEnergyJoules";
      if (prop === owner.consumableModule.consumeRateWattsProp) return "consumableModule.consumeRateWatts";
      if (prop === owner.consumableModule.healRateProp) return "consumableModule.healRate";
    }
    if (owner.damageAuraModule) {
      if (prop === owner.damageAuraModule.damageRadiusProp) return "damageAuraModule.damageRadius";
      if (prop === owner.damageAuraModule.damageRateProp) return "damageAuraModule.damageRate";
    }
    if (owner.damageSolverModule) {
      if (prop === owner.damageSolverModule.impactSusceptibilityProp) return "damageSolverModule.impactSusceptibility";
      if (prop === owner.damageSolverModule.damageThresholdHpProp) return "damageSolverModule.minShockThreshold";
      if (prop === owner.damageSolverModule.selfImpactWeightProp) return "damageSolverModule.selfImpactWeight";
    }

    if (prop.referenceKey && prop.referenceKey.trim().length > 0) {
      return prop.referenceKey.trim();
    }

    if (label) {
      const l = label.trim().toLowerCase();
      if (l.includes("walk force")) return "walkingModule.maxWalkForce";
      if (l.includes("walk speed")) return "walkingModule.maxWalkSpeed";
      if (l.includes("sprint speed")) return "walkingModule.sprintSpeed";
      if (l.includes("walk power")) return "walkingModule.maxWalkPower";
      if (l.includes("sprint power")) return "walkingModule.maxSprintPower";
      if (l.includes("air control") || l.includes("walk in air")) return "walkingModule.walkInAir";
      if (l.includes("air fric")) return "walkingModule.airFriction";
      if (l.includes("can sprint")) return "walkingModule.canSprint";
      if (l.includes("jump impulse") || l.includes("jump strength")) return "jumpModule.jumpImpulse";
      if (l.includes("takeoff speed")) return "jumpModule.maxInitialSpeed";
      if (l.includes("jump power")) return "jumpModule.jumpPowerCapacity";
      if (l.includes("throw speed") || l.includes("throw force")) return "throwModule.maxThrowSpeed";
      if (l.includes("throw height")) return "throwModule.maxThrowHeight";
      if (l.includes("throw power") || l.includes("throw wattage")) return "throwModule.throwPowerCapacity";
      if (l.includes("pickup reach")) return "pickupModule.pickupReach";
      if (l.includes("pickup power")) return "pickupModule.maxPower";
      if (l.includes("climb speed")) return "climbingModule.climbSpeed";
      if (l.includes("climb power")) return "climbingModule.maxPower";
      if (l.includes("sideways climb") || l.includes("horizontal climb")) return "climbingModule.horizontalClimbMultiplier";
      if (l.includes("adhesion")) return "climbingModule.wallAdhesionRange";
      if (l.includes("laser max power") || l.includes("power rating")) return "laserModule.maxPower";
      if (l.includes("beam range") || l.includes("laser range")) return "laserModule.maxRange";
      if (l.includes("beam damage") || l.includes("laser damage")) return "laserModule.damageRate";
      if (l.includes("beam width") || l.includes("beam thickness") || l.includes("laser thickness")) return "laserModule.thickness";
      if (l.includes("punch force") || l.includes("attack force")) return "meleeModule.impactForce";
      if (l.includes("attack power") || l.includes("punch power") || l.includes("melee max power")) return "meleeModule.maxPower";
      if (l.includes("punch freq") || l.includes("attack freq")) return "meleeModule.punchFrequency";
      if (l.includes("punch reach") || l.includes("attack reach")) return "meleeModule.reach";
      if (l.includes("attack width") || l.includes("punch width")) return "meleeModule.width";
      if (l.includes("max hp") || l.includes("max health")) return "healthModule.maxHp";
      if (l.includes("heal rate") || l.includes("natural heal")) return "healthModule.naturalHealRate";
      if (l.includes("health power") || l.includes("heal power")) return "healthModule.maxPower";
      if (l.includes("energy cost per hp") || l.includes("joules/hp") || l.includes("joule per hp") || l.includes("hp per joule")) return "healthModule.joulesPerHp";
      if (l.includes("stamina cap")) return "energyPool.staminaCapacity";
      if (l.includes("stamina regen")) return "energyPool.staminaRegenRate";
      if (l.includes("energy capacity") || l.includes("calorie")) return "energyPool.energyPoolCapacity";
      if (l.includes("max power out")) return "energyPool.maxPowerOutput";
      if (l.includes("muscle") || l.includes("metabolic eff")) return "energyPool.muscleEfficiency";
      if (l.includes("edge assist") || l.includes("hang radius")) return "wallEdgeAssistModule.hangDistance";
      if (l.includes("mass")) return "mass";
      if (l.includes("strength")) return "strength";
      if (l.includes("collider radius")) return "colliderRadius";
      if (l.includes("friction")) return "friction";
      if (l.includes("bounciness") || l.includes("restitution")) return "restitution";
      if (l.includes("roll resist")) return "rollResistance";
    }

    return label || "prop";
  }

  public static buildSinglePropertyPlayerDelta(propKey: string, value: any): SerializedCharacterConfig {
    const norm = (propKey || "").trim();
    let canonical = norm;
    const aliasMap: Record<string, string> = {
      walkInAir: "walkingModule.walkInAir",
      "Air Control (Walk in Air)": "walkingModule.walkInAir",
      canSprint: "walkingModule.canSprint",
      "Can Sprint": "walkingModule.canSprint",
      "Can Sprint (Shift / Gamepad)": "walkingModule.canSprint",
      walkConsumesEnergy: "walkingModule.walkConsumesEnergy",
      "Walk Consumes Energy": "walkingModule.walkConsumesEnergy",
      walkAllowPartialPower: "walkingModule.walkAllowPartialPower",
      sprintConsumesEnergy: "walkingModule.sprintConsumesEnergy",
      "Sprint Consumes Energy": "walkingModule.sprintConsumesEnergy",
      sprintAllowPartialPower: "walkingModule.sprintAllowPartialPower",
      maxWalkForce: "walkingModule.maxWalkForce",
      walkForce: "walkingModule.maxWalkForce",
      "Max Walk Force (N)": "walkingModule.maxWalkForce",
      maxWalkSpeed: "walkingModule.maxWalkSpeed",
      walkSpeed: "walkingModule.maxWalkSpeed",
      "Max Walk Speed (u/s)": "walkingModule.maxWalkSpeed",
      sprintSpeed: "walkingModule.sprintSpeed",
      maxSprintSpeed: "walkingModule.sprintSpeed",
      "Max Sprint Speed (u/s)": "walkingModule.sprintSpeed",
      walkPowerCapacity: "walkingModule.maxWalkPower",
      maxWalkPower: "walkingModule.maxWalkPower",
      "Max Walk Power (Watts)": "walkingModule.maxWalkPower",
      sprintPowerCapacity: "walkingModule.maxSprintPower",
      maxSprintPower: "walkingModule.maxSprintPower",
      "Max Sprint Power (Watts)": "walkingModule.maxSprintPower",
      airFriction: "walkingModule.airFriction",
      jumpImpulse: "jumpModule.jumpImpulse",
      jumpStrength: "jumpModule.jumpImpulse",
      "Jump Impulse (N·s)": "jumpModule.jumpImpulse",
      "Jump Strength (N·s)": "jumpModule.jumpImpulse",
      maxInitialSpeed: "jumpModule.maxInitialSpeed",
      "Max Takeoff Speed (u/s)": "jumpModule.maxInitialSpeed",
      jumpPowerCapacity: "jumpModule.jumpPowerCapacity",
      maxJumpPower: "jumpModule.jumpPowerCapacity",
      "Max Jump Power (Watts)": "jumpModule.jumpPowerCapacity",
      jumpConsumesEnergy: "jumpModule.jumpConsumesEnergy",
      jumpAllowPartialPower: "jumpModule.jumpAllowPartialPower",
      throwForce: "throwModule.maxThrowSpeed",
      maxThrowSpeed: "throwModule.maxThrowSpeed",
      "Max Throw Speed (u/s)": "throwModule.maxThrowSpeed",
      maxThrowHeight: "throwModule.maxThrowHeight",
      "Max Throw Height (u)": "throwModule.maxThrowHeight",
      throwPowerCapacity: "throwModule.throwPowerCapacity",
      maxPower: "throwModule.throwPowerCapacity",
      maxThrowPower: "throwModule.throwPowerCapacity",
      throwWattage: "throwModule.throwPowerCapacity",
      "Max Throw Power (Watts)": "throwModule.throwPowerCapacity",
      throwConsumesEnergy: "throwModule.consumesEnergy",
      pickupReach: "pickupModule.pickupReach",
      "Pickup Reach (3D) (u)": "pickupModule.pickupReach",
      maxPickupPower: "pickupModule.maxPower",
      pickupPowerCapacity: "pickupModule.maxPower",
      "Max Pickup Power (Watts)": "pickupModule.maxPower",
      pickupConsumesEnergy: "pickupModule.consumesEnergy",
      pickupAllowPartialPower: "pickupModule.allowPartialPower",
      climbSpeed: "climbingModule.climbSpeed",
      "Max Climb Speed (u/s)": "climbingModule.climbSpeed",
      climbPowerCapacity: "climbingModule.maxPower",
      maxClimbPower: "climbingModule.maxPower",
      "Max Climb Power (Watts)": "climbingModule.maxPower",
      climbConsumesEnergy: "climbingModule.consumesEnergy",
      climbAllowPartialPower: "climbingModule.allowPartialPower",
      horizontalClimbMultiplier: "climbingModule.horizontalClimbMultiplier",
      wallAdhesionRange: "climbingModule.wallAdhesionRange",
      maxHp: "healthModule.maxHp",
      "Max Health (HP)": "healthModule.maxHp",
      naturalHealRate: "healthModule.naturalHealRate",
      "Natural Heal Rate (HP/s)": "healthModule.naturalHealRate",
      healthMaxPower: "healthModule.maxPower",
      healthConsumesEnergy: "healthModule.consumesEnergy",
      healthAllowPartialPower: "healthModule.allowPartialPower",
      joulesPerHp: "healthModule.joulesPerHp",
      "Energy Cost per HP (Joules/HP)": "healthModule.joulesPerHp",
      hpPerJoule: "healthModule.joulesPerHp",
      "Healing Efficiency (HP/Joule)": "healthModule.joulesPerHp",
      laserMaxPower: "laserModule.maxPower",
      laserPowerCapacity: "laserModule.maxPower",
      laserMaxRange: "laserModule.maxRange",
      laserDamageRate: "laserModule.damageRate",
      laserThickness: "laserModule.thickness",
      laserAllowPartialPower: "laserModule.allowPartialPower",
      meleeImpactForce: "meleeModule.impactForce",
      meleeMaxPower: "meleeModule.maxPower",
      meleePunchFrequency: "meleeModule.punchFrequency",
      meleeReach: "meleeModule.reach",
      meleeWidth: "meleeModule.width",
      meleeAllowPartialPower: "meleeModule.allowPartialPower",
      staminaCapacity: "energyPool.staminaCapacity",
      "Stamina Capacity (J)": "energyPool.staminaCapacity",
      staminaRegenRate: "energyPool.staminaRegenRate",
      "Stamina Regen Rate (W)": "energyPool.staminaRegenRate",
      energyPoolCapacity: "energyPool.energyPoolCapacity",
      "Energy Pool (Calorie) Capacity (J)": "energyPool.energyPoolCapacity",
      maxPowerOutput: "energyPool.maxPowerOutput",
      muscleEfficiency: "energyPool.muscleEfficiency",
      "Muscle Metabolic Efficiency (Ratio)": "energyPool.muscleEfficiency",
      assistRadius: "wallEdgeAssistModule.hangDistance",
      hangDistance: "wallEdgeAssistModule.hangDistance",
      "Edge Assist Radius (u)": "wallEdgeAssistModule.hangDistance",
    };

    if (aliasMap[norm]) {
      canonical = aliasMap[norm];
    }

    const res: any = {};
    if (canonical.includes(".")) {
      PlayerDeltaBuilder.setNestedProperty(res, canonical, value);
    } else {
      res[canonical] = value;
    }
    return res;
  }
}
