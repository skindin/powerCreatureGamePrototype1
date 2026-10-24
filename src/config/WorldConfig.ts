import { GameObject } from "../engine/GameObject.js";
import { RigidbodyModule } from "../engine/RigidbodyModule.js";
import { ColliderModule } from "../engine/ColliderModule.js";
import { FrictionModule } from "../engine/FrictionModule.js";
import { BounceModule } from "../engine/BounceModule.js";
import { VerticalPositionModule } from "../engine/VerticalPositionModule.js";
import { GravityModule } from "../engine/GravityModule.js";
import { RollModule } from "../engine/RollModule.js";
import { ConsumableModule } from "../engine/ConsumableModule.js";
import { HealthModule } from "../character/HealthModule.js";
import { LaserModule } from "../character/LaserModule.js";
import { MeleeModule } from "../character/MeleeModule.js";
import { DamageAuraModule } from "../engine/DamageAuraModule.js";
import { DamageSolverModule } from "../engine/DamageSolverModule.js";
import { quarryPreset, createQuarryStones } from "../engine/maps/QuarryMap.js";
import type { Character } from "../character/Character.js";

export interface SerializedGameObjectConfig {
  id: string;
  name: string;
  prefabId?: string;
  position: { x: number; y: number; z: number };
  color: string;
  visualShape?: "circle" | "box";
  isSleeping?: boolean;

  // Rigidbody
  hasRigidbody?: boolean;
  rigidbodyModule?: {
    enabled: boolean;
    mass: number;
    collisionMode?: "discrete" | "continuous" | "dynamic";
    hasVerticalVelocity?: boolean;
  } | null;

  // Collider
  hasCollider?: boolean;
  colliderModule?: {
    enabled: boolean;
    radius: number;
  } | null;

  // Friction
  hasFriction?: boolean;
  frictionModule?: {
    enabled: boolean;
    staticFrictionMod: number;
    dynamicFrictionMod: number;
  } | null;

  // Bounce
  hasBounce?: boolean;
  bounceModule?: {
    enabled: boolean;
    bounceMod: number;
    verticalBounce: boolean;
  } | null;

  // Vertical Position
  hasVerticalPosition?: boolean;
  verticalPositionModule?: {
    enabled: boolean;
    z: number;
  } | null;

  // Gravity
  hasGravity?: boolean;
  gravityModule?: {
    enabled: boolean;
  } | null;

  // Roll
  hasRollModule?: boolean;
  rollModule?: {
    enabled: boolean;
    rollResistance: number;
    bumpyRollEnabled?: boolean;
    bumpiness?: number;
    seed?: number;
  } | null;

  // Consumable
  hasConsumableModule?: boolean;
  consumableModule?: {
    enabled: boolean;
    tag: string;
    totalEnergyJoules: number;
    remainingEnergyJoules: number;
    consumeRateWatts: number;
    healRate: number;
    minScaleFloor?: number;
    minRadiusFloor?: number;
    unlimited?: boolean;
  } | null;

  // Health & Vitality
  hasHealthModule?: boolean;
  healthModule?: {
    enabled: boolean;
    maxHp: number;
    currentHp: number;
    naturalHealRate: number;
  } | null;

  // Damage Aura
  hasDamageAuraModule?: boolean;
  damageAuraModule?: {
    enabled: boolean;
    damageRadius: number;
    damageRate: number;
  } | null;

  // Damage Solver & Armor
  hasDamageSolverModule?: boolean;
  damageSolverModule?: {
    enabled: boolean;
    impactSusceptibility: number;
    minShockThreshold: number;
    selfImpactWeight?: number;
  } | null;

  // Backwards compatibility legacy fields
  mass?: number;
  colliderRadius?: number;
  bounceMod?: number;
  verticalBounce?: boolean;
  staticGroundFrictionMod?: number;
  dynamicGroundFrictionMod?: number;
}

export interface SerializedCharacterConfig {
  id?: string;
  name?: string;
  prefabId?: string;
  color?: string;
  mass?: number;
  colliderRadius?: number;

  strength?: number;

  hasWalking?: boolean;
  walkingModule?: {
    maxWalkForce?: number;
    maxWalkSpeed?: number;
    sprintSpeed?: number;
    canSprint?: boolean;
    walkInAir?: boolean;
    airFriction?: number;
    walkConsumesEnergy?: boolean;
    walkAllowPartialPower?: boolean;
    sprintConsumesEnergy?: boolean;
    sprintAllowPartialPower?: boolean;
    maxWalkPower?: number;
    maxSprintPower?: number;
  };

  hasJump?: boolean;
  jumpModule?: {
    jumpImpulse?: number;
    maxInitialSpeed?: number;
    jumpPowerCapacity?: number;
    jumpConsumesEnergy?: boolean;
    jumpAllowPartialPower?: boolean;
  };

  hasThrow?: boolean;
  throwModule?: {
    throwForce?: number;
    throwPowerCapacity?: number;
    maxPower?: number;
    maxThrowSpeed?: number;
    maxThrowHeight?: number;
    consumesEnergy?: boolean;
  };

  hasPickup?: boolean;
  pickupModule?: {
    pickupReach?: number;
    maxPower?: number;
    consumesEnergy?: boolean;
    allowPartialPower?: boolean;
  };

  hasClimbing?: boolean;
  climbingModule?: {
    climbSpeed?: number;
    maxAdhesion?: number;
    maxPower?: number;
    horizontalClimb?: boolean;
    consumesEnergy?: boolean;
    allowPartialPower?: boolean;
  };

  hasHealth?: boolean;
  healthModule?: {
    maxHp?: number;
    currentHp?: number;
    naturalHealRate?: number;
    hpPerJoule?: number;
    maxPower?: number;
    consumesEnergy?: boolean;
    allowPartialPower?: boolean;
  };

  hasLaser?: boolean;
  laserModule?: {
    maxRange?: number;
    damageRate?: number;
    maxPower?: number;
    thickness?: number;
    allowPartialPower?: boolean;
  };

  hasMelee?: boolean;
  meleeModule?: {
    impactForce?: number;
    maxPower?: number;
    punchFrequency?: number;
    reach?: number;
    width?: number;
    allowPartialPower?: boolean;
  };

  hasEnergyPool?: boolean;
  energyPool?: {
    staminaCapacity?: number;
    staminaRegenRate?: number;
    energyPoolCapacity?: number;
    maxPowerOutput?: number;
    currentStamina?: number;
    currentEnergy?: number;
    infiniteEnergy?: boolean;
    debugAutoRefillOnEmpty?: boolean;
  };

  wallEdgeAssistModule?: {
    hangDistance?: number;
    preventWalkOff?: boolean;
  };

  hasDamageAuraModule?: boolean;
  damageAuraModule?: {
    enabled?: boolean;
    damageRadius?: number;
    damageRate?: number;
  } | null;

  hasDamageSolverModule?: boolean;
  damageSolverModule?: {
    enabled?: boolean;
    impactSusceptibility?: number;
    minShockThreshold?: number;
    selfImpactWeight?: number;
  } | null;
}

export interface SerializedPrefabConfig {
  id: string;
  name: string;
  icon?: string;
  archetype: SerializedGameObjectConfig;
}

export interface WorldConfig {
  version: number;
  lastSaved: string;
  arena: {
    width: number;
    height: number;
    wallHeight: number;
    presetId?: string;
    tileGrid?: number[][];
  };
  globalPhysics: {
    gravity: number;
    collisionDamageScale: number;
    collisionMode?: "dynamic" | "discrete" | "continuous" | "naive";
  };
  player?: SerializedCharacterConfig;
  objects: SerializedGameObjectConfig[];
  prefabs?: SerializedPrefabConfig[];
}

export interface WorldConfigDelta {
  clientVersion: number;
  sections: ("arena" | "globalPhysics" | "player" | "objects" | "prefabs")[];
  arena?: Partial<WorldConfig["arena"]>;
  globalPhysics?: Partial<WorldConfig["globalPhysics"]>;
  player?: SerializedCharacterConfig;
  objectsDelta?: {
    upsert?: SerializedGameObjectConfig[];
    deletedIds?: string[];
    replaceAll?: SerializedGameObjectConfig[];
  };
  prefabsDelta?: {
    upsert?: SerializedPrefabConfig[];
    deletedIds?: string[];
    replaceAll?: SerializedPrefabConfig[];
  };
}

/**
 * Serializes a live runtime Character into a persistent JSON-safe configuration object.
 */
export function serializeCharacter(char: Character): SerializedCharacterConfig {
  const result: SerializedCharacterConfig = {
    id: char.id,
    name: char.name,
    prefabId: char.prefabId || "prefab_player",
    color: char.color,
    mass: char.rigidbodyModule ? char.rigidbodyModule.massProp.get(char.properties) : char.mass,
    colliderRadius: char.colliderModule ? char.colliderModule.radiusProp.get(char.properties) : char.colliderRadius,
  };

  if (char.strengthProp) {
    result.strength = char.strengthProp.get(char.properties);
  } else if (char.strength !== undefined) {
    result.strength = char.strength;
  }

  if (char.walkingModule) {
    result.hasWalking = char.walkingModule.enabled;
    result.walkingModule = {
      maxWalkForce: char.walkingModule.maxWalkForceProp.get(char.properties),
      maxWalkSpeed: char.walkingModule.maxWalkSpeedProp.get(char.properties),
      sprintSpeed: char.walkingModule.maxSprintSpeedProp.get(char.properties),
      canSprint: char.walkingModule.canSprint,
      walkInAir: char.walkingModule.walkInAir,
      walkConsumesEnergy: char.walkingModule.walkConsumesEnergy,
      walkAllowPartialPower: char.walkingModule.walkAllowPartialPower,
      sprintConsumesEnergy: char.walkingModule.sprintConsumesEnergy,
      sprintAllowPartialPower: char.walkingModule.sprintAllowPartialPower,
      maxWalkPower: char.walkingModule.maxWalkPowerProp ? char.walkingModule.maxWalkPowerProp.get(char.properties) : undefined,
      maxSprintPower: char.walkingModule.maxSprintPowerProp ? char.walkingModule.maxSprintPowerProp.get(char.properties) : undefined,
      airFriction: char.walkingModule.airFrictionProp ? char.walkingModule.airFrictionProp.get(char.properties) : undefined,
    };
  } else {
    result.hasWalking = false;
  }

  if (char.jumpModule) {
    result.hasJump = char.jumpModule.enabled;
    result.jumpModule = {
      jumpImpulse: char.jumpModule.jumpStrengthProp.get(char.properties),
      maxInitialSpeed: char.jumpModule.maxInitialSpeedProp.get(char.properties),
      jumpPowerCapacity: char.jumpPowerCapacityProp ? char.jumpPowerCapacityProp.get(char.properties) : undefined,
      jumpConsumesEnergy: char.jumpConsumesEnergy,
      jumpAllowPartialPower: char.jumpAllowPartialPower,
    };
  } else {
    result.hasJump = false;
  }

  if (char.throwModule) {
    result.hasThrow = char.throwModule.enabled;
    result.throwModule = {
      throwForce: char.throwModule.baseThrowForceProp.get(char.properties),
      throwPowerCapacity: char.throwModule.maxPowerProp.get(char.properties),
      maxPower: char.throwModule.maxPowerProp.get(char.properties),
      maxThrowSpeed: char.throwModule.maxThrowSpeedProp.get(char.properties),
      maxThrowHeight: char.throwModule.maxThrowHeightProp.get(char.properties),
      consumesEnergy: char.throwModule.consumesEnergy,
    };
  } else {
    result.hasThrow = false;
  }

  if (char.pickupModule) {
    result.hasPickup = char.pickupModule.enabled;
    result.pickupModule = {
      pickupReach: char.pickupModule.pickupReachProp ? char.pickupModule.pickupReachProp.get(char.properties) : 1.2,
      maxPower: char.pickupModule.maxPowerProp ? char.pickupModule.maxPowerProp.get(char.properties) : undefined,
      consumesEnergy: char.pickupModule.consumesEnergy,
      allowPartialPower: char.pickupModule.allowPartialPower,
    };
  } else {
    result.hasPickup = false;
  }

  if (char.climbingModule) {
    result.hasClimbing = char.climbingModule.enabled;
    result.climbingModule = {
      climbSpeed: char.climbingModule.maxClimbSpeedProp?.get(char.properties) ?? 3.5,
      maxAdhesion: char.climbingModule.maxAdhesionProp?.get(char.properties) ?? 20,
      maxPower: char.climbingModule.maxPowerProp?.get(char.properties),
      horizontalClimb: char.climbingModule.horizontalClimb,
      consumesEnergy: char.climbingModule.consumesEnergy,
      allowPartialPower: char.climbingModule.allowPartialPower,
    };
  } else {
    result.hasClimbing = false;
  }

  if (char.healthModule) {
    result.hasHealth = char.healthModule.enabled;
    result.healthModule = {
      maxHp: char.healthModule.getMaxHp(char.properties),
      currentHp: char.healthModule.getCurrentHp(char.properties),
      naturalHealRate: char.healthModule.getMaxHealRate(char.properties),
      hpPerJoule: char.healthModule.hpPerJouleProp ? char.healthModule.hpPerJouleProp.get(char.properties) : undefined,
      maxPower: char.healthModule.maxPowerProp ? char.healthModule.maxPowerProp.get(char.properties) : undefined,
      consumesEnergy: char.healthModule.consumesEnergy,
      allowPartialPower: char.healthModule.allowPartialPower,
    };
  } else {
    result.hasHealth = false;
  }

  if (char.laserModule) {
    result.hasLaser = char.laserModule.enabled;
    result.laserModule = {
      maxRange: 15,
      damageRate: char.laserModule.damageRateProp?.get(char.properties) ?? 25,
      thickness: char.laserModule.thicknessProp?.get(char.properties) ?? 0.1,
      maxPower: char.laserModule.maxPowerProp?.get(char.properties) ?? 2000,
      allowPartialPower: char.laserModule.allowPartialPower,
    };
  } else {
    result.hasLaser = false;
  }

  if (char.meleeModule) {
    result.hasMelee = char.meleeModule.enabled;
    result.meleeModule = {
      impactForce: char.meleeModule.maxForceProp?.get(char.properties) ?? 350,
      maxPower: char.meleeModule.maxPowerProp?.get(char.properties) ?? 1000,
      punchFrequency: char.meleeModule.punchFrequencyProp?.get(char.properties) ?? 2.5,
      reach: char.meleeModule.reachProp?.get(char.properties) ?? 1.2,
      width: char.meleeModule.widthProp?.get(char.properties) ?? 0.8,
      allowPartialPower: char.meleeModule.allowPartialPower,
    };
  } else {
    result.hasMelee = false;
  }

  if (char.energyPool) {
    result.hasEnergyPool = char.energyPool.enabled;
    result.energyPool = {
      staminaCapacity: char.energyPool.maxStaminaProp?.get(char.properties) ?? 5000,
      staminaRegenRate: char.energyPool.staminaRegenRateProp?.get(char.properties) ?? 500,
      energyPoolCapacity: char.energyPool.maxEnergyProp?.get(char.properties) ?? 10000,
      currentStamina: char.energyPool.currentStaminaProp?.get(char.properties),
      currentEnergy: char.energyPool.currentEnergyProp?.get(char.properties),
      infiniteEnergy: char.energyPool.infiniteEnergy,
      debugAutoRefillOnEmpty: char.energyPool.debugAutoRefillOnEmpty,
    };
  } else {
    result.hasEnergyPool = false;
  }

  if (char.wallEdgeAssistModule) {
    result.wallEdgeAssistModule = {
      hangDistance: char.wallEdgeAssistModule.hangDistanceProp ? char.wallEdgeAssistModule.hangDistanceProp.get(char.properties) : 0.3,
      preventWalkOff: char.wallEdgeAssistModule.preventWalkOff,
    };
  }

  if (char.damageSolverModule) {
    result.hasDamageSolverModule = char.damageSolverModule.enabled;
    result.damageSolverModule = {
      enabled: char.damageSolverModule.enabled,
      impactSusceptibility: char.damageSolverModule.impactSusceptibilityProp.get(char.properties),
      minShockThreshold: char.damageSolverModule.damageThresholdHpProp.get(char.properties),
      selfImpactWeight: char.damageSolverModule.selfImpactWeightProp.get(char.properties),
    };
  } else {
    result.hasDamageSolverModule = false;
  }

  return result;
}

/**
 * Applies saved character configuration onto an active Character instance.
 */
export function applyCharacterConfig(char: Character, config: SerializedCharacterConfig): void {
  if (config.name) char.name = config.name;
  if (config.color) char.color = config.color;
  if (config.mass !== undefined) {
    char.mass = config.mass;
    if (char.rigidbodyModule) char.rigidbodyModule.massProp.set(config.mass, char.properties);
  }
  if (config.colliderRadius !== undefined) {
    char.colliderRadius = config.colliderRadius;
    if (char.colliderModule) char.colliderModule.radiusProp.set(config.colliderRadius, char.properties);
  }

  if (config.hasWalking === false) {
    char.walkingModule = null;
  } else if (config.walkingModule && char.walkingModule) {
    char.walkingModule.enabled = true;
    if (config.walkingModule.maxWalkForce !== undefined) char.walkingModule.maxWalkForceProp.set(config.walkingModule.maxWalkForce, char.properties);
    if (config.walkingModule.maxWalkSpeed !== undefined) char.walkingModule.maxWalkSpeedProp.set(config.walkingModule.maxWalkSpeed, char.properties);
    if (config.walkingModule.sprintSpeed !== undefined) char.walkingModule.maxSprintSpeedProp.set(config.walkingModule.sprintSpeed, char.properties);
    if (config.walkingModule.canSprint !== undefined) char.walkingModule.canSprint = config.walkingModule.canSprint;
    if (config.walkingModule.walkInAir !== undefined) char.walkingModule.walkInAir = config.walkingModule.walkInAir;
    if (config.walkingModule.walkConsumesEnergy !== undefined) char.walkingModule.walkConsumesEnergy = config.walkingModule.walkConsumesEnergy;
    if (config.walkingModule.walkAllowPartialPower !== undefined) char.walkingModule.walkAllowPartialPower = config.walkingModule.walkAllowPartialPower;
    if (config.walkingModule.sprintConsumesEnergy !== undefined) char.walkingModule.sprintConsumesEnergy = config.walkingModule.sprintConsumesEnergy;
    if (config.walkingModule.sprintAllowPartialPower !== undefined) char.walkingModule.sprintAllowPartialPower = config.walkingModule.sprintAllowPartialPower;
    if (config.walkingModule.maxWalkPower !== undefined && char.walkingModule.maxWalkPowerProp) char.walkingModule.maxWalkPowerProp.set(config.walkingModule.maxWalkPower, char.properties);
    if (config.walkingModule.maxSprintPower !== undefined && char.walkingModule.maxSprintPowerProp) char.walkingModule.maxSprintPowerProp.set(config.walkingModule.maxSprintPower, char.properties);
    if (config.walkingModule.airFriction !== undefined && char.walkingModule.airFrictionProp) char.walkingModule.airFrictionProp.set(config.walkingModule.airFriction, char.properties);
  }

  if (config.hasJump === false) {
    char.jumpModule = null;
  } else if (config.jumpModule && char.jumpModule) {
    char.jumpModule.enabled = true;
    if (config.jumpModule.jumpImpulse !== undefined) char.jumpModule.jumpStrengthProp.set(config.jumpModule.jumpImpulse, char.properties);
    if (config.jumpModule.maxInitialSpeed !== undefined) char.jumpModule.maxInitialSpeedProp.set(config.jumpModule.maxInitialSpeed, char.properties);
    if (config.jumpModule.jumpPowerCapacity !== undefined && char.jumpPowerCapacityProp) char.jumpPowerCapacityProp.set(config.jumpModule.jumpPowerCapacity, char.properties);
    if (config.jumpModule.jumpConsumesEnergy !== undefined) char.jumpConsumesEnergy = config.jumpModule.jumpConsumesEnergy;
    if (config.jumpModule.jumpAllowPartialPower !== undefined) char.jumpAllowPartialPower = config.jumpModule.jumpAllowPartialPower;
  }

  if (config.hasThrow === false) {
    char.throwModule = null;
  } else if (config.throwModule && char.throwModule) {
    char.throwModule.enabled = true;
    if (config.throwModule.throwForce !== undefined) char.throwModule.baseThrowForceProp.set(config.throwModule.throwForce, char.properties);
    if (config.throwModule.maxPower !== undefined) char.throwModule.maxPowerProp.set(config.throwModule.maxPower, char.properties);
    if (config.throwModule.throwPowerCapacity !== undefined) char.throwModule.maxPowerProp.set(config.throwModule.throwPowerCapacity, char.properties);
    if (config.throwModule.maxThrowSpeed !== undefined) char.throwModule.maxThrowSpeedProp.set(config.throwModule.maxThrowSpeed, char.properties);
    if (config.throwModule.maxThrowHeight !== undefined) char.throwModule.maxThrowHeightProp.set(config.throwModule.maxThrowHeight, char.properties);
    if (config.throwModule.consumesEnergy !== undefined) char.throwModule.consumesEnergy = config.throwModule.consumesEnergy;
  }

  if (config.hasPickup === false) {
    char.pickupModule = null;
  } else if (config.pickupModule && char.pickupModule) {
    char.pickupModule.enabled = true;
    if (config.pickupModule.pickupReach !== undefined && char.pickupModule.pickupReachProp) char.pickupModule.pickupReachProp.set(config.pickupModule.pickupReach, char.properties);
    if (config.pickupModule.maxPower !== undefined && char.pickupModule.maxPowerProp) char.pickupModule.maxPowerProp.set(config.pickupModule.maxPower, char.properties);
    if (config.pickupModule.consumesEnergy !== undefined) char.pickupModule.consumesEnergy = config.pickupModule.consumesEnergy;
    if (config.pickupModule.allowPartialPower !== undefined) char.pickupModule.allowPartialPower = config.pickupModule.allowPartialPower;
  }

  if (config.hasClimbing === false) {
    char.climbingModule = null;
  } else if (config.climbingModule && char.climbingModule) {
    char.climbingModule.enabled = true;
    if (config.climbingModule.climbSpeed !== undefined && char.climbingModule.maxClimbSpeedProp) char.climbingModule.maxClimbSpeedProp.set(config.climbingModule.climbSpeed, char.properties);
    if (config.climbingModule.maxAdhesion !== undefined && char.climbingModule.maxAdhesionProp) char.climbingModule.maxAdhesionProp.set(config.climbingModule.maxAdhesion, char.properties);
    if (config.climbingModule.maxPower !== undefined && char.climbingModule.maxPowerProp) char.climbingModule.maxPowerProp.set(config.climbingModule.maxPower, char.properties);
    if (config.climbingModule.horizontalClimb !== undefined) char.climbingModule.horizontalClimb = config.climbingModule.horizontalClimb;
    if (config.climbingModule.consumesEnergy !== undefined) char.climbingModule.consumesEnergy = config.climbingModule.consumesEnergy;
    if (config.climbingModule.allowPartialPower !== undefined) char.climbingModule.allowPartialPower = config.climbingModule.allowPartialPower;
  }

  if (config.hasHealth === false) {
    char.healthModule = null;
  } else if (config.healthModule && char.healthModule) {
    char.healthModule.enabled = true;
    if (config.healthModule.maxHp !== undefined) char.healthModule.maxHp = config.healthModule.maxHp;
    if (config.healthModule.currentHp !== undefined) char.healthModule.currentHp = config.healthModule.currentHp;
    if (config.healthModule.naturalHealRate !== undefined) char.healthModule.maxHealRate = config.healthModule.naturalHealRate;
    if (config.healthModule.hpPerJoule !== undefined && char.healthModule.hpPerJouleProp) char.healthModule.hpPerJouleProp.set(config.healthModule.hpPerJoule, char.properties);
    if (config.healthModule.maxPower !== undefined && char.healthModule.maxPowerProp) char.healthModule.maxPowerProp.set(config.healthModule.maxPower, char.properties);
    if (config.healthModule.consumesEnergy !== undefined) char.healthModule.consumesEnergy = config.healthModule.consumesEnergy;
    if (config.healthModule.allowPartialPower !== undefined) char.healthModule.allowPartialPower = config.healthModule.allowPartialPower;
  }

  if (config.hasEnergyPool === false) {
    char.energyPool = null;
  } else if (config.energyPool && char.energyPool) {
    char.energyPool.enabled = true;
    if (config.energyPool.staminaCapacity !== undefined && char.energyPool.maxStaminaProp) char.energyPool.maxStaminaProp.set(config.energyPool.staminaCapacity, char.properties);
    if (config.energyPool.staminaRegenRate !== undefined && char.energyPool.staminaRegenRateProp) char.energyPool.staminaRegenRateProp.set(config.energyPool.staminaRegenRate, char.properties);
    if (config.energyPool.energyPoolCapacity !== undefined && char.energyPool.maxEnergyProp) char.energyPool.maxEnergyProp.set(config.energyPool.energyPoolCapacity, char.properties);
    if (config.energyPool.currentStamina !== undefined && char.energyPool.currentStaminaProp) char.energyPool.currentStaminaProp.set(config.energyPool.currentStamina, char.properties);
    if (config.energyPool.currentEnergy !== undefined && char.energyPool.currentEnergyProp) char.energyPool.currentEnergyProp.set(config.energyPool.currentEnergy, char.properties);
    if (config.energyPool.infiniteEnergy !== undefined) char.energyPool.infiniteEnergy = config.energyPool.infiniteEnergy;
    if (config.energyPool.debugAutoRefillOnEmpty !== undefined) char.energyPool.debugAutoRefillOnEmpty = config.energyPool.debugAutoRefillOnEmpty;
  }

  if (config.wallEdgeAssistModule && char.wallEdgeAssistModule) {
    if (config.wallEdgeAssistModule.hangDistance !== undefined) char.wallEdgeAssistModule.hangDistanceProp.set(config.wallEdgeAssistModule.hangDistance, char.properties);
    if (config.wallEdgeAssistModule.preventWalkOff !== undefined) char.wallEdgeAssistModule.preventWalkOff = config.wallEdgeAssistModule.preventWalkOff;
  }

  if (config.hasLaser === false) {
    char.laserModule = null;
  } else if (config.laserModule) {
    if (!char.laserModule) char.laserModule = new LaserModule();
    char.laserModule.enabled = true;
    if (config.laserModule.damageRate !== undefined && char.laserModule.damageRateProp) char.laserModule.damageRateProp.set(config.laserModule.damageRate, char.properties);
    if (config.laserModule.thickness !== undefined && char.laserModule.thicknessProp) char.laserModule.thicknessProp.set(config.laserModule.thickness, char.properties);
    if (config.laserModule.maxPower !== undefined && char.laserModule.maxPowerProp) char.laserModule.maxPowerProp.set(config.laserModule.maxPower, char.properties);
    if (config.laserModule.allowPartialPower !== undefined) char.laserModule.allowPartialPower = config.laserModule.allowPartialPower;
  }

  if (config.hasMelee === false) {
    char.meleeModule = null;
  } else if (config.meleeModule) {
    if (!char.meleeModule) char.meleeModule = new MeleeModule();
    char.meleeModule.enabled = true;
    if (config.meleeModule.impactForce !== undefined && char.meleeModule.maxForceProp) char.meleeModule.maxForceProp.set(config.meleeModule.impactForce, char.properties);
    if (config.meleeModule.maxPower !== undefined && char.meleeModule.maxPowerProp) char.meleeModule.maxPowerProp.set(config.meleeModule.maxPower, char.properties);
    if (config.meleeModule.punchFrequency !== undefined && char.meleeModule.punchFrequencyProp) char.meleeModule.punchFrequencyProp.set(config.meleeModule.punchFrequency, char.properties);
    if (config.meleeModule.reach !== undefined && char.meleeModule.reachProp) char.meleeModule.reachProp.set(config.meleeModule.reach, char.properties);
    if (config.meleeModule.width !== undefined && char.meleeModule.widthProp) char.meleeModule.widthProp.set(config.meleeModule.width, char.properties);
    if (config.meleeModule.allowPartialPower !== undefined) char.meleeModule.allowPartialPower = config.meleeModule.allowPartialPower;
  }

  if (config.damageAuraModule && char.damageAuraModule) {
    if (config.damageAuraModule.damageRadius !== undefined) char.damageAuraModule.damageRadiusProp.set(config.damageAuraModule.damageRadius, char.properties);
    if (config.damageAuraModule.damageRate !== undefined) char.damageAuraModule.damageRateProp.set(config.damageAuraModule.damageRate, char.properties);
  }

  if (config.damageSolverModule && char.damageSolverModule) {
    if (config.damageSolverModule.impactSusceptibility !== undefined) char.damageSolverModule.impactSusceptibilityProp.set(config.damageSolverModule.impactSusceptibility, char.properties);
    if (config.damageSolverModule.minShockThreshold !== undefined) char.damageSolverModule.damageThresholdHpProp.set(config.damageSolverModule.minShockThreshold, char.properties);
    if (config.damageSolverModule.selfImpactWeight !== undefined) char.damageSolverModule.selfImpactWeightProp.set(config.damageSolverModule.selfImpactWeight, char.properties);
  }
}

/**
 * Serializes a runtime GameObject into a persistent JSON-safe configuration object.
 */
export function serializeGameObject(obj: GameObject): SerializedGameObjectConfig {
  const result: SerializedGameObjectConfig = {
    id: obj.id,
    name: obj.name,
    prefabId: obj.prefabId || undefined,
    position: {
      x: Math.round(obj.position.x * 100) / 100,
      y: Math.round(obj.position.y * 100) / 100,
      z: Math.round(obj.position.z * 100) / 100,
    },
    color: obj.color,
    visualShape: obj.visualShape,
    isSleeping: obj.isSleeping,

    hasRigidbody: obj.rigidbodyModule !== null,
    hasCollider: obj.colliderModule !== null,
    hasFriction: obj.frictionModule !== null,
    hasBounce: obj.bounceModule !== null,
    hasVerticalPosition: obj.verticalPositionModule !== null,
    hasGravity: obj.gravityModule !== null,
    hasRollModule: obj.rollModule !== null,
    hasConsumableModule: obj.consumableModule !== null,
    hasHealthModule: obj.healthModule !== null,
    hasDamageAuraModule: obj.damageAuraModule !== null,
    hasDamageSolverModule: obj.damageSolverModule !== null,

    mass: obj.rigidbodyModule ? obj.rigidbodyModule.massProp.get(obj.properties) : 1.0,
    colliderRadius: obj.colliderModule ? obj.colliderModule.radiusProp.get(obj.properties) : 0.35,
    bounceMod: obj.bounceModule ? obj.bounceModule.bounceModProp.get(obj.properties) : 0.4,
    verticalBounce: obj.bounceModule?.verticalBounce ?? false,
    staticGroundFrictionMod: obj.frictionModule ? obj.frictionModule.staticFrictionProp.get(obj.properties) : 1.0,
    dynamicGroundFrictionMod: obj.frictionModule ? obj.frictionModule.dynamicFrictionProp.get(obj.properties) : 1.0,
  };

  if (obj.rigidbodyModule) {
    result.rigidbodyModule = {
      enabled: obj.rigidbodyModule.enabled,
      mass: obj.rigidbodyModule.massProp.get(obj.properties),
      collisionMode: obj.collisionMode,
      hasVerticalVelocity: obj.rigidbodyModule.hasVerticalVelocity,
    };
  }

  if (obj.colliderModule) {
    result.colliderModule = {
      enabled: obj.colliderModule.enabled,
      radius: obj.colliderModule.radiusProp.get(obj.properties),
    };
  }

  if (obj.frictionModule) {
    result.frictionModule = {
      enabled: obj.frictionModule.enabled,
      staticFrictionMod: obj.frictionModule.staticFrictionProp.get(obj.properties),
      dynamicFrictionMod: obj.frictionModule.dynamicFrictionProp.get(obj.properties),
    };
  }

  if (obj.bounceModule) {
    result.bounceModule = {
      enabled: obj.bounceModule.enabled,
      bounceMod: obj.bounceModule.bounceModProp.get(obj.properties),
      verticalBounce: obj.bounceModule.verticalBounce,
    };
  }

  if (obj.verticalPositionModule) {
    result.verticalPositionModule = {
      enabled: obj.verticalPositionModule.enabled,
      z: Math.round(obj.position.z * 100) / 100,
    };
  }

  if (obj.gravityModule) {
    result.gravityModule = {
      enabled: obj.gravityModule.enabled,
    };
  }

  if (obj.rollModule) {
    result.rollModule = {
      enabled: obj.rollModule.enabled,
      rollResistance: obj.rollModule.rollResistanceProp.get(obj.properties),
      bumpyRollEnabled: obj.rollModule.bumpyRollEnabled,
      bumpiness: obj.rollModule.bumpinessProp.get(obj.properties),
      seed: obj.rollModule.seed,
    };
  }

  if (obj.consumableModule) {
    result.consumableModule = {
      enabled: obj.consumableModule.enabled,
      tag: obj.consumableModule.tag,
      totalEnergyJoules: obj.consumableModule.getTotalEnergy(obj.properties),
      remainingEnergyJoules: obj.consumableModule.getRemainingEnergy(obj.properties),
      consumeRateWatts: obj.consumableModule.getConsumeRate(obj.properties),
      healRate: obj.consumableModule.getHealRate(obj.properties),
      minScaleFloor: obj.consumableModule.minScaleFloor,
      minRadiusFloor: obj.consumableModule.minRadiusFloor,
      unlimited: obj.consumableModule.unlimited,
    };
  }

  if (obj.healthModule) {
    result.healthModule = {
      enabled: obj.healthModule.enabled,
      maxHp: obj.healthModule.getMaxHp(obj.properties),
      currentHp: obj.healthModule.getCurrentHp(obj.properties),
      naturalHealRate: obj.healthModule.getMaxHealRate(obj.properties),
    };
  }

  if (obj.damageAuraModule) {
    result.damageAuraModule = {
      enabled: obj.damageAuraModule.enabled,
      damageRadius: obj.damageAuraModule.damageRadiusProp.get(obj.properties),
      damageRate: obj.damageAuraModule.damageRateProp.get(obj.properties),
    };
  }

  if (obj.damageSolverModule) {
    result.damageSolverModule = {
      enabled: obj.damageSolverModule.enabled,
      impactSusceptibility: obj.damageSolverModule.impactSusceptibilityProp.get(obj.properties),
      minShockThreshold: obj.damageSolverModule.damageThresholdHpProp.get(obj.properties),
      selfImpactWeight: obj.damageSolverModule.selfImpactWeightProp.get(obj.properties),
    };
  }

  return result;
}

/**
 * Reconstructs a runtime GameObject from a serialized configuration object.
 */
export function deserializeGameObject(config: SerializedGameObjectConfig): GameObject {
  const options: any = {
    id: config.id,
    name: config.name,
    prefabId: config.prefabId,
    position: { x: config.position.x, y: config.position.y, z: config.position.z },
    color: config.color,
    visualShape: config.visualShape || "circle",
  };

  // 1. Rigidbody
  if (config.hasRigidbody === false) {
    options.rigidbodyModule = null;
    options.hasRigidbody = false;
  } else if (config.rigidbodyModule) {
    options.rigidbodyModule = new RigidbodyModule({
      mass: config.rigidbodyModule.mass ?? config.mass ?? 1.0,
      velocity: { x: 0, y: 0 },
      hasVerticalVelocity: config.rigidbodyModule.hasVerticalVelocity ?? true,
      verticalVelocity: 0,
      collisionMode: config.rigidbodyModule.collisionMode ?? "dynamic",
      enabled: config.rigidbodyModule.enabled ?? true,
    });
  } else {
    options.mass = config.mass ?? 1.0;
  }

  // 2. Collider
  if (config.hasCollider === false) {
    options.colliderModule = null;
  } else if (config.colliderModule) {
    options.colliderModule = new ColliderModule({
      radius: config.colliderModule.radius ?? config.colliderRadius ?? 0.35,
      enabled: config.colliderModule.enabled ?? true,
    });
  } else if (config.colliderRadius !== undefined) {
    options.colliderRadius = config.colliderRadius;
  }

  // 3. Friction
  if (config.hasFriction === false) {
    options.frictionModule = null;
  } else if (config.frictionModule) {
    options.frictionModule = new FrictionModule({
      staticFrictionMod: config.frictionModule.staticFrictionMod ?? config.staticGroundFrictionMod ?? 1.0,
      dynamicFrictionMod: config.frictionModule.dynamicFrictionMod ?? config.dynamicGroundFrictionMod ?? 1.0,
      enabled: config.frictionModule.enabled ?? true,
    });
  } else {
    options.staticGroundFrictionMod = config.staticGroundFrictionMod ?? 1.0;
    options.dynamicGroundFrictionMod = config.dynamicGroundFrictionMod ?? 1.0;
  }

  // 4. Bounce
  if (config.hasBounce === false) {
    options.bounceModule = null;
  } else if (config.bounceModule) {
    options.bounceModule = new BounceModule({
      bounceMod: config.bounceModule.bounceMod ?? config.bounceMod ?? 0.4,
      verticalBounce: config.bounceModule.verticalBounce ?? config.verticalBounce ?? false,
      enabled: config.bounceModule.enabled ?? true,
    });
  } else if (config.bounceMod !== undefined) {
    options.bounceMod = config.bounceMod;
  }

  // 5. Vertical Position
  if (config.hasVerticalPosition === false) {
    options.verticalPositionModule = null;
    options.hasVerticalPosition = false;
  } else if (config.verticalPositionModule) {
    options.verticalPositionModule = new VerticalPositionModule({
      z: config.verticalPositionModule.z ?? config.position.z ?? 0,
      hasVerticalVelocity: true,
      verticalVelocity: 0,
      enabled: config.verticalPositionModule.enabled ?? true,
    });
  } else {
    options.hasVerticalPosition = true;
  }

  // 6. Gravity
  if (config.hasGravity === false) {
    options.gravityModule = null;
    options.hasGravity = false;
  } else if (config.gravityModule) {
    options.gravityModule = new GravityModule({
      enabled: config.gravityModule.enabled ?? true,
    });
  } else {
    options.hasGravity = true;
  }

  // 7. Roll
  if (config.hasRollModule === false) {
    options.rollModule = null;
  } else if (config.rollModule) {
    options.rollModule = new RollModule({
      enabled: config.rollModule.enabled,
      rollResistance: config.rollModule.rollResistance,
      bumpyRollEnabled: config.rollModule.bumpyRollEnabled ?? true,
      bumpiness: config.rollModule.bumpiness ?? 0.22,
      seed: config.rollModule.seed,
    });
  }

  // 8. Consumable
  if (config.hasConsumableModule === false) {
    options.consumableModule = null;
  } else if (config.consumableModule) {
    options.consumableModule = new ConsumableModule({
      enabled: config.consumableModule.enabled,
      tag: config.consumableModule.tag,
      totalEnergyJoules: config.consumableModule.totalEnergyJoules,
      remainingEnergyJoules: config.consumableModule.remainingEnergyJoules,
      consumeRateWatts: config.consumableModule.consumeRateWatts,
      healRate: config.consumableModule.healRate,
      minScaleFloor: config.consumableModule.minScaleFloor,
      minRadiusFloor: config.consumableModule.minRadiusFloor,
      unlimited: config.consumableModule.unlimited,
    });
  }

  // 9. Health & Vitality
  if (config.hasHealthModule === false) {
    options.healthModule = null;
  } else if (config.healthModule) {
    options.healthModule = new HealthModule({
      enabled: config.healthModule.enabled,
      baseMaxHp: config.healthModule.maxHp,
      maxHp: config.healthModule.maxHp,
      currentHp: config.healthModule.currentHp,
      baseMaxHealRate: config.healthModule.naturalHealRate,
      maxHealRate: config.healthModule.naturalHealRate,
      consumesEnergy: false,
    });
  }

  // 10. Damage Aura
  if (config.hasDamageAuraModule === false) {
    options.damageAuraModule = null;
  } else if (config.damageAuraModule) {
    options.damageAuraModule = new DamageAuraModule({
      enabled: config.damageAuraModule.enabled,
      damageRadius: config.damageAuraModule.damageRadius,
      damageRate: config.damageAuraModule.damageRate,
    });
  }

  // 11. Damage Solver & Armor
  if (config.hasDamageSolverModule === false) {
    options.damageSolverModule = null;
  } else if (config.damageSolverModule) {
    options.damageSolverModule = new DamageSolverModule({
      enabled: config.damageSolverModule.enabled,
      impactSusceptibility: config.damageSolverModule.impactSusceptibility,
      damageThresholdHp: config.damageSolverModule.minShockThreshold,
      selfImpactWeight: config.damageSolverModule.selfImpactWeight,
    });
  }

  const obj = new GameObject(options);
  if (config.isSleeping !== undefined) {
    obj.isSleeping = config.isSleeping;
  }
  return obj;
}

/**
 * Generates the clean baseline default WorldConfig from the standard Quarry map preset.
 * Strictly adheres to Arena.ts gravity = 30.0 and GameObject.ts collisionDamageScale = 0.1.
 */
export function generateDefaultWorldConfig(): WorldConfig {
  const defaultStones = createQuarryStones();
  return {
    version: 1,
    lastSaved: new Date().toISOString(),
    arena: {
      width: 20,
      height: 14,
      wallHeight: 1.0,
      presetId: quarryPreset.id,
      tileGrid: quarryPreset.generate(20, 14),
    },
    globalPhysics: {
      gravity: 30.0,
      collisionDamageScale: 0.1,
      collisionMode: "dynamic",
    },
    objects: defaultStones.map(serializeGameObject),
  };
}

/**
 * Deterministically merges an incremental delta update into an existing WorldConfig.
 * Updates the version number and lastSaved timestamp.
 */
export function mergeWorldConfigDelta(base: WorldConfig, delta: WorldConfigDelta): WorldConfig {
  const updated: WorldConfig = {
    version: (base.version || 1) + 1,
    lastSaved: new Date().toISOString(),
    arena: { ...base.arena },
    globalPhysics: { ...base.globalPhysics },
    player: base.player ? { ...base.player } : undefined,
    objects: [...base.objects],
    prefabs: base.prefabs ? [...base.prefabs] : undefined,
  };

  for (const section of delta.sections) {
    if (section === "player" && delta.player) {
      updated.player = {
        ...(updated.player || {}),
        ...delta.player,
      };
    } else if (section === "arena" && delta.arena) {
      updated.arena = {
        ...updated.arena,
        ...delta.arena,
      };
      if (delta.arena.tileGrid) {
        updated.arena.tileGrid = delta.arena.tileGrid.map((row) => [...row]);
      }
    } else if (section === "globalPhysics" && delta.globalPhysics) {
      updated.globalPhysics = {
        ...updated.globalPhysics,
        ...delta.globalPhysics,
      };
    } else if (section === "objects" && delta.objectsDelta) {
      if (delta.objectsDelta.replaceAll) {
        updated.objects = [...delta.objectsDelta.replaceAll];
      } else {
        const { upsert, deletedIds } = delta.objectsDelta;
        const objectMap = new Map<string, SerializedGameObjectConfig>();
        for (const obj of updated.objects) {
          objectMap.set(obj.id, obj);
        }

        if (deletedIds) {
          for (const id of deletedIds) {
            objectMap.delete(id);
          }
        }

        if (upsert) {
          for (const item of upsert) {
            objectMap.set(item.id, item);
          }
        }

        updated.objects = Array.from(objectMap.values());
      }
    } else if (section === "prefabs" && delta.prefabsDelta) {
      if (delta.prefabsDelta.replaceAll) {
        updated.prefabs = [...delta.prefabsDelta.replaceAll];
      } else {
        const { upsert, deletedIds } = delta.prefabsDelta;
        const prefabMap = new Map<string, SerializedPrefabConfig>();
        for (const p of (updated.prefabs || [])) {
          prefabMap.set(p.id, p);
        }

        if (deletedIds) {
          for (const id of deletedIds) {
            prefabMap.delete(id);
          }
        }

        if (upsert) {
          for (const item of upsert) {
            prefabMap.set(item.id, item);
          }
        }

        updated.prefabs = Array.from(prefabMap.values());
      }
    }
  }

  return updated;
}

/**
 * Serializes a Prefab archetype into a persistent JSON-safe configuration object.
 */
export function serializePrefab(prefab: { id: string; name: string; icon?: string; archetype: GameObject }): SerializedPrefabConfig {
  return {
    id: prefab.id,
    name: prefab.name,
    icon: prefab.icon,
    archetype: serializeGameObject(prefab.archetype),
  };
}
