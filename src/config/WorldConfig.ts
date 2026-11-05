import { GameObject } from "../engine/GameObject.js";
import { RigidbodyModule } from "../engine/RigidbodyModule.js";
import { ColliderModule } from "../engine/ColliderModule.js";
import { FrictionModule } from "../engine/FrictionModule.js";
import { BounceModule } from "../engine/BounceModule.js";
import { VerticalPositionModule } from "../engine/VerticalPositionModule.js";
import { GravityModule } from "../engine/GravityModule.js";
import { RollModule } from "../engine/RollModule.js";
import { RollMovementModule } from "../character/RollMovementModule.js";
import { LocomotionStanceModule, type LocomotionMode } from "../character/LocomotionStanceModule.js";
import { ConsumableModule } from "../engine/ConsumableModule.js";
import { ConsumeModule } from "../character/ConsumeModule.js";
import { GunModule } from "../engine/GunModule.js";
import { HealthModule } from "../character/HealthModule.js";
import { LaserModule } from "../character/LaserModule.js";
import { MeleeModule } from "../character/MeleeModule.js";
import { ClimbingModule } from "../character/ClimbingModule.js";
import { WalkingModule } from "../character/WalkingModule.js";
import { JumpModule } from "../character/JumpModule.js";
import { ThrowModule } from "../character/ThrowModule.js";
import { PickupModule } from "../character/PickupModule.js";
import { EnergyPool } from "../character/EnergyPool.js";
import { WallEdgeAssistModule } from "../character/WallEdgeAssistModule.js";
import { DamageAuraModule } from "../engine/DamageAuraModule.js";
import { DamageSolverModule } from "../engine/DamageSolverModule.js";
import { quarryPreset, createQuarryStones } from "../engine/maps/QuarryMap.js";
import { Character } from "../character/Character.js";
import type { ControlSchema } from "../input/schema/ControlSchemaTypes.js";

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

  // Gun Weapon
  hasGunModule?: boolean;
  gunModule?: {
    enabled: boolean;
    fireRate: number;
    damagePerBullet: number;
    bulletSpeed: number;
    firingSeconds: number;
    cooldownTime: number;
    cooldownDelay?: number;
    bulletMass: number;
    turnSpeed?: number;
    aimTolerance?: number;
    gunLength?: number;
    gunWidth?: number;
    bulletColor?: string;
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
    piercingMultiplier?: number;
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
  controlSchema?: ControlSchema;
}

export interface SerializedCharacterConfig {
  id?: string;
  name?: string;
  prefabId?: string;
  color?: string;
  mass?: number;
  colliderRadius?: number;

  strength?: number;

  hasRigidbody?: boolean;
  rigidbodyModule?: {
    enabled?: boolean;
    mass?: number;
    collisionMode?: "discrete" | "continuous" | "dynamic";
    hasVerticalVelocity?: boolean;
  } | null;

  hasCollider?: boolean;
  colliderModule?: {
    enabled?: boolean;
    radius?: number;
  } | null;

  hasFriction?: boolean;
  frictionModule?: {
    enabled?: boolean;
    staticFrictionMod?: number;
    dynamicFrictionMod?: number;
  } | null;

  hasVerticalPosition?: boolean;
  verticalPositionModule?: {
    enabled?: boolean;
    z?: number;
  } | null;

  hasGravity?: boolean;
  gravityModule?: {
    enabled?: boolean;
  } | null;

  hasWalking?: boolean;
  walkingModule?: {
    enabled?: boolean;
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
    enabled?: boolean;
    jumpImpulse?: number;
    maxInitialSpeed?: number;
    jumpPowerCapacity?: number;
    jumpConsumesEnergy?: boolean;
    jumpAllowPartialPower?: boolean;
  };

  hasThrow?: boolean;
  throwModule?: {
    enabled?: boolean;
    throwForce?: number;
    throwPowerCapacity?: number;
    maxPower?: number;
    maxThrowSpeed?: number;
    maxThrowHeight?: number;
    consumesEnergy?: boolean;
  };

  hasPickup?: boolean;
  pickupModule?: {
    enabled?: boolean;
    pickupReach?: number;
    maxPower?: number;
    consumesEnergy?: boolean;
    allowPartialPower?: boolean;
  };

  hasClimbing?: boolean;
  climbingModule?: {
    enabled?: boolean;
    climbSpeed?: number;
    maxAdhesion?: number;
    maxPower?: number;
    horizontalClimb?: boolean;
    consumesEnergy?: boolean;
    allowPartialPower?: boolean;
  };

  hasHealth?: boolean;
  healthModule?: {
    enabled?: boolean;
    maxHp?: number;
    currentHp?: number;
    naturalHealRate?: number;
    joulesPerHp?: number;
    hpPerJoule?: number;
    maxPower?: number;
    consumesEnergy?: boolean;
    allowPartialPower?: boolean;
  };

  hasConsume?: boolean;
  consumeModule?: {
    enabled?: boolean;
    consumptionSpeedMultiplier?: number;
    acceptedTags?: string[];
  };

  hasLaser?: boolean;
  laserModule?: {
    enabled?: boolean;
    maxRange?: number;
    damageRate?: number;
    maxPower?: number;
    thickness?: number;
    allowPartialPower?: boolean;
  };

  hasMelee?: boolean;
  meleeModule?: {
    enabled?: boolean;
    impactForce?: number;
    maxPower?: number;
    punchFrequency?: number;
    reach?: number;
    width?: number;
    allowPartialPower?: boolean;
  };

  hasEnergyPool?: boolean;
  energyPool?: {
    enabled?: boolean;
    staminaCapacity?: number;
    staminaRegenRate?: number;
    energyPoolCapacity?: number;
    maxPowerOutput?: number;
    currentStamina?: number;
    currentEnergy?: number;
    muscleEfficiency?: number;
    infiniteEnergy?: boolean;
    debugAutoRefillOnEmpty?: boolean;
  };

  hasWallEdgeAssist?: boolean;
  wallEdgeAssistModule?: {
    enabled?: boolean;
    hangDistance?: number;
    assistRadius?: number;
    preventWalkOff?: boolean;
  } | null;

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
    piercingMultiplier?: number;
    minShockThreshold?: number;
    selfImpactWeight?: number;
  } | null;

  hasBounce?: boolean;
  bounceMod?: number;
  verticalBounce?: boolean;
  bounceModule?: {
    enabled?: boolean;
    bounceMod?: number;
    verticalBounce?: boolean;
  } | null;

  hasRigidbody?: boolean;
  rigidbodyModule?: {
    enabled?: boolean;
    mass?: number;
    collisionMode?: CollisionMode;
    hasVerticalVelocity?: boolean;
  } | null;

  hasCollider?: boolean;
  colliderModule?: {
    enabled?: boolean;
    radius?: number;
  } | null;

  hasFriction?: boolean;
  frictionModule?: {
    enabled?: boolean;
    staticFrictionMod?: number;
    dynamicFrictionMod?: number;
  } | null;

  hasVerticalPosition?: boolean;
  verticalPositionModule?: {
    enabled?: boolean;
    z?: number;
  } | null;

  hasGravity?: boolean;
  gravityModule?: {
    enabled?: boolean;
  } | null;

  hasRollModule?: boolean;
  rollModule?: {
    enabled?: boolean;
    rollResistance?: number;
    bumpyRollEnabled?: boolean;
    bumpiness?: number;
    seed?: number;
  };

  hasRollMovement?: boolean;
  rollMovementModule?: {
    enabled?: boolean;
    baseAcceleration?: number;
    sprintAcceleration?: number;
    maxRollSpeed?: number;
    maxSprintSpeed?: number;
    brakeDeceleration?: number;
    freeRollResistance?: number;
    brakeRollResistance?: number;
    rollPowerCapacity?: number;
    sprintPowerCapacity?: number;
    brakePowerCapacity?: number;
    consumesEnergy?: boolean;
    allowPartialPower?: boolean;
    sprintConsumesEnergy?: boolean;
    sprintAllowPartialPower?: boolean;
    brakeConsumesEnergy?: boolean;
    brakeAllowPartialPower?: boolean;
    enforceMaxRollSpeed?: boolean;
    enforceMaxSprintSpeed?: boolean;
  };

  hasLocomotionStance?: boolean;
  locomotionStanceModule?: {
    enabled?: boolean;
    activeMode?: LocomotionMode;
    supportedModes?: LocomotionMode[];
    canWalkWhileRolling?: boolean;
  } | null;

  controlSchema?: ControlSchema;
}

export interface SerializedPrefabConfig {
  id: string;
  name: string;
  icon?: string;
  archetype: SerializedGameObjectConfig | SerializedCharacterConfig;
  controlSchema?: ControlSchema;
}

export interface SerializedSpawnerConfig {
  id: string;
  name: string;
  enabled: boolean;
  prefabId: string;
  intervalMinutes: number;
  maxCount: number;
  designatedSpawnPoints?: { x: number; y: number; z?: number }[];
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
  spawners?: SerializedSpawnerConfig[];
}

export interface WorldConfigDelta {
  clientVersion: number;
  sections: ("arena" | "globalPhysics" | "player" | "objects" | "prefabs" | "spawners")[];
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
  prefabs?: SerializedPrefabConfig[];
  spawners?: SerializedSpawnerConfig[];
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

  if (char.controlSchema) {
    result.controlSchema = JSON.parse(JSON.stringify(char.controlSchema));
  }

  if (char.strengthProp) {
    result.strength = char.strengthProp.get(char.properties);
  } else if (char.strength !== undefined) {
    result.strength = char.strength;
  }

  if (char.walkingModule) {
    result.hasWalking = true;
    result.walkingModule = {
      enabled: char.walkingModule.enabled,
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
    result.hasJump = true;
    result.jumpModule = {
      enabled: char.jumpModule.enabled,
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
    result.hasThrow = true;
    result.throwModule = {
      enabled: char.throwModule.enabled,
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
    result.hasPickup = true;
    result.pickupModule = {
      enabled: char.pickupModule.enabled,
      pickupReach: char.pickupModule.pickupReachProp ? char.pickupModule.pickupReachProp.get(char.properties) : 1.2,
      maxPower: char.pickupModule.maxPowerProp ? char.pickupModule.maxPowerProp.get(char.properties) : undefined,
      consumesEnergy: char.pickupModule.consumesEnergy,
      allowPartialPower: char.pickupModule.allowPartialPower,
    };
  } else {
    result.hasPickup = false;
  }

  if (char.climbingModule) {
    result.hasClimbing = true;
    result.climbingModule = {
      enabled: char.climbingModule.enabled,
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
    result.hasHealth = true;
    result.healthModule = {
      enabled: char.healthModule.enabled,
      maxHp: char.healthModule.getMaxHp(char.properties),
      currentHp: char.healthModule.getCurrentHp(char.properties),
      naturalHealRate: char.healthModule.getMaxHealRate(char.properties),
      joulesPerHp: char.healthModule.joulesPerHpProp ? char.healthModule.joulesPerHpProp.get(char.properties) : undefined,
      hpPerJoule: char.healthModule.joulesPerHpProp ? char.healthModule.joulesPerHpProp.get(char.properties) : undefined,
      maxPower: char.healthModule.maxPowerProp ? char.healthModule.maxPowerProp.get(char.properties) : undefined,
      consumesEnergy: char.healthModule.consumesEnergy,
      allowPartialPower: char.healthModule.allowPartialPower,
    };
  } else {
    result.hasHealth = false;
  }

  if (char.consumeModule) {
    result.hasConsume = true;
    result.consumeModule = {
      enabled: char.consumeModule.enabled,
      consumptionSpeedMultiplier: char.consumeModule.consumptionSpeedMultiplierProp ? char.consumeModule.consumptionSpeedMultiplierProp.get(char.properties) : 1.0,
      acceptedTags: [...char.consumeModule.acceptedTags],
    };
  } else {
    result.hasConsume = false;
  }

  if (char.laserModule) {
    result.hasLaser = true;
    result.laserModule = {
      enabled: char.laserModule.enabled,
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
    result.hasMelee = true;
    result.meleeModule = {
      enabled: char.meleeModule.enabled,
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
    result.hasEnergyPool = true;
    result.energyPool = {
      enabled: char.energyPool.enabled,
      staminaCapacity: char.energyPool.maxStaminaProp?.get(char.properties) ?? 5000,
      staminaRegenRate: char.energyPool.staminaRegenRateProp?.get(char.properties) ?? 500,
      energyPoolCapacity: char.energyPool.maxEnergyProp?.get(char.properties) ?? 10000,
      currentStamina: char.energyPool.currentStaminaProp?.get(char.properties),
      currentEnergy: char.energyPool.currentEnergyProp?.get(char.properties),
      muscleEfficiency: char.energyPool.muscleEfficiencyProp?.get(char.properties) ?? 0.25,
      infiniteEnergy: char.energyPool.infiniteEnergy,
      debugAutoRefillOnEmpty: char.energyPool.debugAutoRefillOnEmpty,
    };
  } else {
    result.hasEnergyPool = false;
  }

  if (char.wallEdgeAssistModule) {
    result.hasWallEdgeAssist = true;
    result.wallEdgeAssistModule = {
      enabled: char.wallEdgeAssistModule.enabled,
      hangDistance: char.wallEdgeAssistModule.hangDistanceProp ? char.wallEdgeAssistModule.hangDistanceProp.get(char.properties) : 0.3,
      preventWalkOff: char.wallEdgeAssistModule.preventWalkOff,
    };
  } else {
    result.hasWallEdgeAssist = false;
  }

  if (char.damageAuraModule) {
    result.hasDamageAuraModule = true;
    result.damageAuraModule = {
      enabled: char.damageAuraModule.enabled,
      damageRadius: char.damageAuraModule.damageRadiusProp.get(char.properties),
      damageRate: char.damageAuraModule.damageRateProp.get(char.properties),
    };
  } else {
    result.hasDamageAuraModule = false;
  }

  if (char.damageSolverModule) {
    result.hasDamageSolverModule = true;
    result.damageSolverModule = {
      enabled: char.damageSolverModule.enabled,
      impactSusceptibility: char.damageSolverModule.impactSusceptibilityProp.get(char.properties),
      piercingMultiplier: char.damageSolverModule.piercingMultiplierProp.get(char.properties),
      minShockThreshold: char.damageSolverModule.damageThresholdHpProp.get(char.properties),
      selfImpactWeight: char.damageSolverModule.selfImpactWeightProp.get(char.properties),
    };
  } else {
    result.hasDamageSolverModule = false;
  }

  if (char.bounceModule) {
    result.hasBounce = true;
    result.bounceMod = char.bounceModule.bounceModProp.get(char.properties);
    result.verticalBounce = char.bounceModule.verticalBounce;
    result.bounceModule = {
      enabled: char.bounceModule.enabled,
      bounceMod: char.bounceModule.bounceModProp.get(char.properties),
      verticalBounce: char.bounceModule.verticalBounce,
    };
  } else {
    result.hasBounce = false;
  }

  if (char.rigidbodyModule) {
    result.hasRigidbody = true;
    result.rigidbodyModule = {
      enabled: char.rigidbodyModule.enabled,
      mass: char.rigidbodyModule.massProp.get(char.properties),
      collisionMode: char.rigidbodyModule.collisionMode,
      hasVerticalVelocity: char.rigidbodyModule.hasVerticalVelocity,
    };
  } else {
    result.hasRigidbody = false;
  }

  if (char.colliderModule) {
    result.hasCollider = true;
    result.colliderModule = {
      enabled: char.colliderModule.enabled,
      radius: char.colliderModule.radiusProp.get(char.properties),
    };
  } else {
    result.hasCollider = false;
  }

  if (char.frictionModule) {
    result.hasFriction = true;
    result.frictionModule = {
      enabled: char.frictionModule.enabled,
      staticFrictionMod: char.frictionModule.staticFrictionProp.get(char.properties),
      dynamicFrictionMod: char.frictionModule.dynamicFrictionProp.get(char.properties),
    };
  } else {
    result.hasFriction = false;
  }

  if (char.verticalPositionModule) {
    result.hasVerticalPosition = true;
    result.verticalPositionModule = {
      enabled: char.verticalPositionModule.enabled,
      z: Math.round(char.position.z * 100) / 100,
    };
  } else {
    result.hasVerticalPosition = false;
  }

  if (char.gravityModule) {
    result.hasGravity = true;
    result.gravityModule = {
      enabled: char.gravityModule.enabled,
    };
  } else {
    result.hasGravity = false;
  }

  if (char.rollModule) {
    result.hasRollModule = true;
    result.rollModule = {
      enabled: char.rollModule.enabled || Boolean(char.locomotionStanceModule?.isRollDisabledByWalkStance),
      rollResistance: char.rollModule.rollResistanceProp.get(char.properties),
      bumpyRollEnabled: char.rollModule.bumpyRollEnabled,
      bumpiness: char.rollModule.bumpinessProp.get(char.properties),
      seed: char.rollModule.seed,
    };
  } else {
    result.hasRollModule = false;
  }

  if (char.rollMovementModule) {
    result.hasRollMovement = true;
    result.rollMovementModule = {
      enabled: char.rollMovementModule.enabled,
      baseAcceleration: char.rollMovementModule.baseAccelerationProp.get(char.properties),
      sprintAcceleration: char.rollMovementModule.sprintAccelerationProp.get(char.properties),
      maxRollSpeed: char.rollMovementModule.maxRollSpeedProp.get(char.properties),
      maxSprintSpeed: char.rollMovementModule.maxSprintSpeedProp.get(char.properties),
      brakeDeceleration: char.rollMovementModule.brakeDecelerationProp.get(char.properties),
      freeRollResistance: char.rollMovementModule.freeRollResistanceProp.get(char.properties),
      brakeRollResistance: char.rollMovementModule.brakeRollResistanceProp.get(char.properties),
      rollPowerCapacity: char.rollMovementModule.maxRollPowerProp.get(char.properties),
      sprintPowerCapacity: char.rollMovementModule.maxSprintPowerProp.get(char.properties),
      brakePowerCapacity: char.rollMovementModule.maxBrakePowerProp.get(char.properties),
      consumesEnergy: char.rollMovementModule.rollConsumesEnergy,
      allowPartialPower: char.rollMovementModule.rollAllowPartialPower,
      sprintConsumesEnergy: char.rollMovementModule.sprintConsumesEnergy,
      sprintAllowPartialPower: char.rollMovementModule.sprintAllowPartialPower,
      brakeConsumesEnergy: char.rollMovementModule.brakeConsumesEnergy,
      brakeAllowPartialPower: char.rollMovementModule.brakeAllowPartialPower,
      enforceMaxRollSpeed: char.rollMovementModule.enforceMaxRollSpeed,
      enforceMaxSprintSpeed: char.rollMovementModule.enforceMaxSprintSpeed,
    };
  } else {
    result.hasRollMovement = false;
  }

  if (char.locomotionStanceModule) {
    result.hasLocomotionStance = true;
    result.locomotionStanceModule = {
      enabled: char.locomotionStanceModule.enabled,
      activeMode: char.locomotionStanceModule.activeMode,
      supportedModes: [...char.locomotionStanceModule.supportedModes],
      canWalkWhileRolling: char.locomotionStanceModule.canWalkWhileRolling,
    };
  } else {
    result.hasLocomotionStance = false;
  }

  return result;
}

/**
 * Applies saved character configuration onto an active Character instance.
 */
export function applyCharacterConfig(char: Character, config: SerializedCharacterConfig): void {
  if (config.controlSchema) {
    char.controlSchema = JSON.parse(JSON.stringify(config.controlSchema));
  }
  if (config.name) char.name = config.name;
  if (config.color) char.color = config.color;
  if (config.mass !== undefined) {
    char.mass = config.mass;
    if (char.rigidbodyModule) char.rigidbodyModule.massProp.set(config.mass, char.properties);
    char.properties?.set("mass", config.mass);
  }
  if (config.colliderRadius !== undefined) {
    char.colliderRadius = config.colliderRadius;
    if (char.colliderModule) char.colliderModule.radiusProp.set(config.colliderRadius, char.properties);
    char.properties?.set("colliderRadius", config.colliderRadius);
  }
  if (config.strength !== undefined) {
    char.strength = config.strength;
    if (char.strengthProp) char.strengthProp.set(config.strength, char.properties);
    char.properties?.set("strength", config.strength);
  }

  if (config.hasWalking === false && !config.walkingModule) {
    char.walkingModule = null;
  } else if (config.hasWalking === false && config.walkingModule === undefined) {
    char.walkingModule = null;
  } else if (config.walkingModule || config.hasWalking === true) {
    if (!char.walkingModule) {
      char.walkingModule = new WalkingModule();
    }
    const wm = char.walkingModule;
    if (wm) {
      wm.enabled = config.walkingModule?.enabled ?? true;
      if (config.walkingModule) {
        if (config.walkingModule.maxWalkForce !== undefined) {
          wm.maxWalkForceProp.set(config.walkingModule.maxWalkForce, char.properties);
          char.properties?.set("maxWalkForce", config.walkingModule.maxWalkForce);
        }
        if (config.walkingModule.maxWalkSpeed !== undefined) {
          wm.maxWalkSpeedProp.set(config.walkingModule.maxWalkSpeed, char.properties);
          char.properties?.set("maxWalkSpeed", config.walkingModule.maxWalkSpeed);
        }
        if (config.walkingModule.sprintSpeed !== undefined) {
          wm.maxSprintSpeedProp.set(config.walkingModule.sprintSpeed, char.properties);
          char.properties?.set("sprintSpeed", config.walkingModule.sprintSpeed);
        }
        if (config.walkingModule.canSprint !== undefined) wm.canSprint = config.walkingModule.canSprint;
        if (config.walkingModule.walkInAir !== undefined) wm.walkInAir = config.walkingModule.walkInAir;
        if (config.walkingModule.walkConsumesEnergy !== undefined) wm.walkConsumesEnergy = config.walkingModule.walkConsumesEnergy;
        if (config.walkingModule.walkAllowPartialPower !== undefined) wm.walkAllowPartialPower = config.walkingModule.walkAllowPartialPower;
        if (config.walkingModule.sprintConsumesEnergy !== undefined) wm.sprintConsumesEnergy = config.walkingModule.sprintConsumesEnergy;
        if (config.walkingModule.sprintAllowPartialPower !== undefined) wm.sprintAllowPartialPower = config.walkingModule.sprintAllowPartialPower;

        const walkPower = config.walkingModule.maxWalkPower ?? (config.walkingModule as any).walkPowerCapacity;
        if (walkPower !== undefined && wm.maxWalkPowerProp) {
          wm.maxWalkPowerProp.set(walkPower, char.properties);
          char.properties?.set("walkPowerCapacity", walkPower);
        }
        const sprintPower = config.walkingModule.maxSprintPower ?? (config.walkingModule as any).sprintPowerCapacity;
        if (sprintPower !== undefined && wm.maxSprintPowerProp) {
          wm.maxSprintPowerProp.set(sprintPower, char.properties);
          char.properties?.set("sprintPowerCapacity", sprintPower);
        }
        if (config.walkingModule.airFriction !== undefined && wm.airFrictionProp) {
          wm.airFrictionProp.set(config.walkingModule.airFriction, char.properties);
          char.properties?.set("airFriction", config.walkingModule.airFriction);
        }
      }
      if (config.hasWalking === false) {
        char.walkingModule = null;
      }
    }
  }

  if (config.hasJump === false) {
    char.jumpModule = null;
  } else if (config.jumpModule || config.hasJump === true) {
    if (!char.jumpModule) {
      char.jumpModule = new JumpModule();
    }
    const jm = char.jumpModule;
    if (jm) {
      jm.enabled = config.jumpModule?.enabled ?? true;
      if (config.jumpModule) {
        if (config.jumpModule.jumpImpulse !== undefined) {
          jm.jumpStrengthProp.set(config.jumpModule.jumpImpulse, char.properties);
          char.properties?.set("jumpImpulse", config.jumpModule.jumpImpulse);
        }
        if (config.jumpModule.maxInitialSpeed !== undefined) {
          jm.maxInitialSpeedProp.set(config.jumpModule.maxInitialSpeed, char.properties);
          char.properties?.set("maxInitialSpeed", config.jumpModule.maxInitialSpeed);
        }
        const jumpPower = config.jumpModule.jumpPowerCapacity ?? (config.jumpModule as any).maxPower;
        if (jumpPower !== undefined && char.jumpPowerCapacityProp) {
          char.jumpPowerCapacityProp.set(jumpPower, char.properties);
          char.properties?.set("jumpPowerCapacity", jumpPower);
        }
        if (config.jumpModule.jumpConsumesEnergy !== undefined) char.jumpConsumesEnergy = config.jumpModule.jumpConsumesEnergy;
        if (config.jumpModule.jumpAllowPartialPower !== undefined) char.jumpAllowPartialPower = config.jumpModule.jumpAllowPartialPower;
      }
    }
  }

  if (config.hasThrow === false) {
    char.throwModule = null;
  } else if (config.throwModule || config.hasThrow === true) {
    if (!char.throwModule) {
      char.throwModule = new ThrowModule();
    }
    const tm = char.throwModule;
    if (tm) {
      tm.enabled = config.throwModule?.enabled ?? true;
      if (config.throwModule) {
        if (config.throwModule.throwForce !== undefined) {
          tm.baseThrowForceProp.set(config.throwModule.throwForce, char.properties);
          char.properties?.set("throwForce", config.throwModule.throwForce);
        }
        const throwPower = config.throwModule.throwPowerCapacity ?? config.throwModule.maxPower;
        if (throwPower !== undefined) {
          tm.maxPowerProp.set(throwPower, char.properties);
          char.properties?.set("throwPowerCapacity", throwPower);
        }
        if (config.throwModule.maxThrowSpeed !== undefined) {
          tm.maxThrowSpeedProp.set(config.throwModule.maxThrowSpeed, char.properties);
          char.properties?.set("maxThrowSpeed", config.throwModule.maxThrowSpeed);
        }
        if (config.throwModule.maxThrowHeight !== undefined) {
          tm.maxThrowHeightProp.set(config.throwModule.maxThrowHeight, char.properties);
          char.properties?.set("maxThrowHeight", config.throwModule.maxThrowHeight);
        }
        if (config.throwModule.consumesEnergy !== undefined) tm.consumesEnergy = config.throwModule.consumesEnergy;
      }
    }
  }

  if (config.hasPickup === false) {
    char.pickupModule = null;
  } else if (config.pickupModule || config.hasPickup === true) {
    if (!char.pickupModule) {
      char.pickupModule = new PickupModule();
    }
    const pm = char.pickupModule;
    if (pm) {
      pm.enabled = config.pickupModule?.enabled ?? true;
      if (config.pickupModule) {
        if (config.pickupModule.pickupReach !== undefined && pm.pickupReachProp) {
          pm.pickupReachProp.set(config.pickupModule.pickupReach, char.properties);
          char.properties?.set("pickupReach", config.pickupModule.pickupReach);
        }
        const pickupPower = config.pickupModule.maxPower ?? (config.pickupModule as any).pickupPowerCapacity;
        if (pickupPower !== undefined && pm.maxPowerProp) {
          pm.maxPowerProp.set(pickupPower, char.properties);
          char.properties?.set("pickupPowerCapacity", pickupPower);
        }
        if (config.pickupModule.consumesEnergy !== undefined) pm.consumesEnergy = config.pickupModule.consumesEnergy;
        if (config.pickupModule.allowPartialPower !== undefined) pm.allowPartialPower = config.pickupModule.allowPartialPower;
      }
    }
  }

  if (config.hasClimbing === false) {
    char.climbingModule = null;
  } else if (config.climbingModule || config.hasClimbing === true) {
    if (!char.climbingModule) {
      char.climbingModule = new ClimbingModule();
    }
    char.climbingModule.enabled = config.climbingModule?.enabled ?? true;
    if (config.climbingModule) {
      const climbSpeed = config.climbingModule.climbSpeed ?? (config.climbingModule as any).maxClimbSpeed;
      if (climbSpeed !== undefined && char.climbingModule.maxClimbSpeedProp) {
        char.climbingModule.maxClimbSpeedProp.set(climbSpeed, char.properties);
        char.properties?.set("climbSpeed", climbSpeed);
      }
      const adhesion = config.climbingModule.maxAdhesion ?? (config.climbingModule as any).wallAdhesionRange;
      if (adhesion !== undefined && char.climbingModule.maxAdhesionProp) {
        char.climbingModule.maxAdhesionProp.set(adhesion, char.properties);
        char.properties?.set("wallAdhesionRange", adhesion);
      }
      const climbPower = config.climbingModule.maxPower ?? (config.climbingModule as any).climbPowerCapacity;
      if (climbPower !== undefined && char.climbingModule.maxPowerProp) {
        char.climbingModule.maxPowerProp.set(climbPower, char.properties);
        char.properties?.set("climbPowerCapacity", climbPower);
      }
      if (config.climbingModule.horizontalClimb !== undefined) char.climbingModule.horizontalClimb = config.climbingModule.horizontalClimb;
      if ((config.climbingModule as any).horizontalClimbMultiplier !== undefined && (char.climbingModule as any).horizontalClimbMultiplierProp) {
        (char.climbingModule as any).horizontalClimbMultiplierProp.set((config.climbingModule as any).horizontalClimbMultiplier, char.properties);
      }
      if (config.climbingModule.consumesEnergy !== undefined) char.climbingModule.consumesEnergy = config.climbingModule.consumesEnergy;
      if (config.climbingModule.allowPartialPower !== undefined) char.climbingModule.allowPartialPower = config.climbingModule.allowPartialPower;
    }
  }

  if (config.hasHealth === false) {
    char.healthModule = null;
  } else if (config.healthModule || config.hasHealth === true) {
    if (!char.healthModule) {
      char.healthModule = new HealthModule();
    }
    char.healthModule.enabled = config.healthModule?.enabled ?? true;
    if (config.healthModule) {
      if (config.healthModule.maxHp !== undefined) {
        char.healthModule.maxHp = config.healthModule.maxHp;
        char.properties?.set("maxHp", config.healthModule.maxHp);
      }
      if (config.healthModule.currentHp !== undefined) char.healthModule.currentHp = config.healthModule.currentHp;
      if (config.healthModule.naturalHealRate !== undefined) {
        char.healthModule.maxHealRate = config.healthModule.naturalHealRate;
        char.properties?.set("naturalHealRate", config.healthModule.naturalHealRate);
      }
      if (config.healthModule.joulesPerHp !== undefined && char.healthModule.joulesPerHpProp) {
        char.healthModule.joulesPerHpProp.set(config.healthModule.joulesPerHp, char.properties);
        char.properties?.set("joulesPerHp", config.healthModule.joulesPerHp);
        char.properties?.set("hpPerJoule", config.healthModule.joulesPerHp);
      } else if (config.healthModule.hpPerJoule !== undefined && char.healthModule.joulesPerHpProp) {
        const val = config.healthModule.hpPerJoule;
        const converted = val < 1.0 ? 1.0 / Math.max(0.0001, val) : val;
        char.healthModule.joulesPerHpProp.set(converted, char.properties);
        char.properties?.set("joulesPerHp", converted);
        char.properties?.set("hpPerJoule", converted);
      }
      if (config.healthModule.maxPower !== undefined && char.healthModule.maxPowerProp) {
        char.healthModule.maxPowerProp.set(config.healthModule.maxPower, char.properties);
        char.properties?.set("healthMaxPower", config.healthModule.maxPower);
      }
      if (config.healthModule.consumesEnergy !== undefined) char.healthModule.consumesEnergy = config.healthModule.consumesEnergy;
      if (config.healthModule.allowPartialPower !== undefined) char.healthModule.allowPartialPower = config.healthModule.allowPartialPower;
    }
  }

  if (config.hasEnergyPool === false) {
    char.energyPool = null;
  } else if (config.energyPool || config.hasEnergyPool === true) {
    if (!char.energyPool) {
      char.energyPool = new EnergyPool();
    }
    const ep = char.energyPool;
    if (ep) {
      ep.enabled = config.energyPool?.enabled ?? true;
      if (config.energyPool) {
        if (config.energyPool.staminaCapacity !== undefined && ep.maxStaminaProp) {
          ep.maxStaminaProp.set(config.energyPool.staminaCapacity, char.properties);
          char.properties?.set("staminaCapacity", config.energyPool.staminaCapacity);
        }
        if (config.energyPool.staminaRegenRate !== undefined && ep.staminaRegenRateProp) {
          ep.staminaRegenRateProp.set(config.energyPool.staminaRegenRate, char.properties);
          char.properties?.set("staminaRegenRate", config.energyPool.staminaRegenRate);
        }
        if (config.energyPool.energyPoolCapacity !== undefined && ep.maxEnergyProp) {
          ep.maxEnergyProp.set(config.energyPool.energyPoolCapacity, char.properties);
          char.properties?.set("energyPoolCapacity", config.energyPool.energyPoolCapacity);
        }
        if (config.energyPool.muscleEfficiency !== undefined && ep.muscleEfficiencyProp) {
          ep.muscleEfficiencyProp.set(config.energyPool.muscleEfficiency, char.properties);
          char.properties?.set("muscleEfficiency", config.energyPool.muscleEfficiency);
        }
        if (config.energyPool.currentStamina !== undefined && ep.currentStaminaProp) ep.currentStaminaProp.set(config.energyPool.currentStamina, char.properties);
        if (config.energyPool.currentEnergy !== undefined && ep.currentEnergyProp) ep.currentEnergyProp.set(config.energyPool.currentEnergy, char.properties);
        if (config.energyPool.infiniteEnergy !== undefined) ep.infiniteEnergy = config.energyPool.infiniteEnergy;
        if (config.energyPool.debugAutoRefillOnEmpty !== undefined) ep.debugAutoRefillOnEmpty = config.energyPool.debugAutoRefillOnEmpty;
      }
    }
  }

  if (config.hasWallEdgeAssist === false) {
    char.wallEdgeAssistModule = null;
  } else if (config.wallEdgeAssistModule || config.hasWallEdgeAssist === true) {
    if (!char.wallEdgeAssistModule) {
      char.wallEdgeAssistModule = new WallEdgeAssistModule();
    }
    const wea = char.wallEdgeAssistModule;
    if (wea) {
      wea.enabled = config.wallEdgeAssistModule?.enabled ?? true;
      if (config.wallEdgeAssistModule) {
        const hang = config.wallEdgeAssistModule.hangDistance ?? config.wallEdgeAssistModule.assistRadius;
        if (hang !== undefined && wea.hangDistanceProp) {
          wea.hangDistanceProp.set(hang, char.properties);
          char.properties?.set("hangDistance", hang);
          char.properties?.set("assistRadius", hang);
        }
        if (config.wallEdgeAssistModule.preventWalkOff !== undefined) wea.preventWalkOff = config.wallEdgeAssistModule.preventWalkOff;
      }
    }
  }

  if (config.hasConsume === false) {
    char.consumeModule = null;
  } else if (config.consumeModule || config.hasConsume === true) {
    if (!char.consumeModule) char.consumeModule = new ConsumeModule();
    char.consumeModule.enabled = config.consumeModule?.enabled ?? true;
    if (config.consumeModule) {
      if (config.consumeModule.consumptionSpeedMultiplier !== undefined && char.consumeModule.consumptionSpeedMultiplierProp) {
        char.consumeModule.consumptionSpeedMultiplierProp.set(config.consumeModule.consumptionSpeedMultiplier, char.properties);
        char.properties?.set("consumptionSpeedMultiplier", config.consumeModule.consumptionSpeedMultiplier);
      }
      if (config.consumeModule.acceptedTags) {
        char.consumeModule.acceptedTags = [...config.consumeModule.acceptedTags];
      }
    }
  }

  if (config.hasLaser === false) {
    char.laserModule = null;
  } else if (config.laserModule || config.hasLaser === true) {
    if (!char.laserModule) char.laserModule = new LaserModule();
    char.laserModule.enabled = config.laserModule?.enabled ?? true;
    if (config.laserModule) {
      if (config.laserModule.damageRate !== undefined && char.laserModule.damageRateProp) {
        char.laserModule.damageRateProp.set(config.laserModule.damageRate, char.properties);
        char.properties?.set("laserDamageRate", config.laserModule.damageRate);
      }
      if (config.laserModule.thickness !== undefined && char.laserModule.thicknessProp) {
        char.laserModule.thicknessProp.set(config.laserModule.thickness, char.properties);
        char.properties?.set("laserThickness", config.laserModule.thickness);
      }
      const laserPower = config.laserModule.maxPower ?? (config.laserModule as any).powerRating;
      if (laserPower !== undefined && char.laserModule.maxPowerProp) {
        char.laserModule.maxPowerProp.set(laserPower, char.properties);
        char.properties?.set("laserMaxPower", laserPower);
      }
      if (config.laserModule.allowPartialPower !== undefined) char.laserModule.allowPartialPower = config.laserModule.allowPartialPower;
    }
  }

  if (config.hasMelee === false) {
    char.meleeModule = null;
  } else if (config.meleeModule || config.hasMelee === true) {
    if (!char.meleeModule) char.meleeModule = new MeleeModule();
    char.meleeModule.enabled = config.meleeModule?.enabled ?? true;
    if (config.meleeModule) {
      if (config.meleeModule.impactForce !== undefined && char.meleeModule.maxForceProp) {
        char.meleeModule.maxForceProp.set(config.meleeModule.impactForce, char.properties);
        char.properties?.set("meleeMaxForce", config.meleeModule.impactForce);
      }
      if (config.meleeModule.maxPower !== undefined && char.meleeModule.maxPowerProp) {
        char.meleeModule.maxPowerProp.set(config.meleeModule.maxPower, char.properties);
        char.properties?.set("meleeMaxPower", config.meleeModule.maxPower);
      }
      if (config.meleeModule.punchFrequency !== undefined && char.meleeModule.punchFrequencyProp) {
        char.meleeModule.punchFrequencyProp.set(config.meleeModule.punchFrequency, char.properties);
        char.properties?.set("meleeFrequency", config.meleeModule.punchFrequency);
      }
      if (config.meleeModule.reach !== undefined && char.meleeModule.reachProp) {
        char.meleeModule.reachProp.set(config.meleeModule.reach, char.properties);
        char.properties?.set("meleeReach", config.meleeModule.reach);
      }
      if (config.meleeModule.width !== undefined && char.meleeModule.widthProp) {
        char.meleeModule.widthProp.set(config.meleeModule.width, char.properties);
        char.properties?.set("meleeWidth", config.meleeModule.width);
      }
      if (config.meleeModule.allowPartialPower !== undefined) char.meleeModule.allowPartialPower = config.meleeModule.allowPartialPower;
    }
  }

  if (config.hasDamageAuraModule === false) {
    char.damageAuraModule = null;
  } else if (config.damageAuraModule || config.hasDamageAuraModule === true) {
    if (!char.damageAuraModule) char.damageAuraModule = new DamageAuraModule();
    char.damageAuraModule.enabled = config.damageAuraModule?.enabled ?? true;
    if (config.damageAuraModule) {
      if (config.damageAuraModule.damageRadius !== undefined) char.damageAuraModule.damageRadiusProp.set(config.damageAuraModule.damageRadius, char.properties);
      if (config.damageAuraModule.damageRate !== undefined) char.damageAuraModule.damageRateProp.set(config.damageAuraModule.damageRate, char.properties);
    }
  }

  if (config.hasBounce === false) {
    char.bounceModule = null;
  } else if (config.bounceModule || config.bounceMod !== undefined || config.hasBounce === true) {
    if (!char.bounceModule) {
      char.bounceModule = new BounceModule({
        bounceMod: config.bounceModule?.bounceMod ?? config.bounceMod ?? 0.4,
        verticalBounce: config.bounceModule?.verticalBounce ?? config.verticalBounce ?? false,
        enabled: config.bounceModule?.enabled ?? true,
      });
    }
    char.bounceModule.enabled = config.bounceModule?.enabled ?? true;
    const bMod = config.bounceModule?.bounceMod ?? config.bounceMod;
    if (bMod !== undefined) {
      char.bounceMod = bMod;
      char.bounceModule.bounceMod = bMod;
      char.bounceModule.bounceModProp.set(bMod, char.properties);
    }
    const vBounce = config.bounceModule?.verticalBounce ?? config.verticalBounce;
    if (vBounce !== undefined) {
      char.bounceModule.verticalBounce = vBounce;
    }
  }

  if (config.hasRigidbody === false) {
    char.rigidbodyModule = null;
  } else if (config.rigidbodyModule || config.hasRigidbody === true) {
    if (!char.rigidbodyModule) {
      char.rigidbodyModule = new RigidbodyModule({
        mass: config.rigidbodyModule?.mass ?? config.mass ?? 60,
        velocity: { x: 0, y: 0 },
        hasVerticalVelocity: config.rigidbodyModule?.hasVerticalVelocity ?? true,
        verticalVelocity: 0,
        collisionMode: config.rigidbodyModule?.collisionMode ?? "dynamic",
        enabled: config.rigidbodyModule?.enabled ?? true,
      });
    }
    char.rigidbodyModule.enabled = config.rigidbodyModule?.enabled ?? true;
    if (config.rigidbodyModule) {
      if (config.rigidbodyModule.mass !== undefined) char.rigidbodyModule.massProp.set(config.rigidbodyModule.mass, char.properties);
      if (config.rigidbodyModule.collisionMode !== undefined) char.rigidbodyModule.collisionMode = config.rigidbodyModule.collisionMode;
      if (config.rigidbodyModule.hasVerticalVelocity !== undefined) char.rigidbodyModule.hasVerticalVelocity = config.rigidbodyModule.hasVerticalVelocity;
    }
  }

  if (config.hasCollider === false) {
    char.colliderModule = null;
  } else if (config.colliderModule || config.hasCollider === true) {
    if (!char.colliderModule) {
      char.colliderModule = new ColliderModule({
        radius: config.colliderModule?.radius ?? config.colliderRadius ?? 0.4,
        enabled: config.colliderModule?.enabled ?? true,
      });
    }
    char.colliderModule.enabled = config.colliderModule?.enabled ?? true;
    if (config.colliderModule?.radius !== undefined) {
      char.colliderModule.radiusProp.set(config.colliderModule.radius, char.properties);
    }
  }

  if (config.hasFriction === false) {
    char.frictionModule = null;
  } else if (config.frictionModule || config.hasFriction === true) {
    if (!char.frictionModule) {
      char.frictionModule = new FrictionModule({
        staticFrictionMod: config.frictionModule?.staticFrictionMod ?? 1.0,
        dynamicFrictionMod: config.frictionModule?.dynamicFrictionMod ?? 1.0,
        enabled: config.frictionModule?.enabled ?? true,
      });
    }
    char.frictionModule.enabled = config.frictionModule?.enabled ?? true;
    if (config.frictionModule?.staticFrictionMod !== undefined) {
      char.frictionModule.staticFrictionProp.set(config.frictionModule.staticFrictionMod, char.properties);
    }
    if (config.frictionModule?.dynamicFrictionMod !== undefined) {
      char.frictionModule.dynamicFrictionProp.set(config.frictionModule.dynamicFrictionMod, char.properties);
    }
  }

  if (config.hasVerticalPosition === false) {
    char.verticalPositionModule = null;
  } else if (config.verticalPositionModule || config.hasVerticalPosition === true) {
    if (!char.verticalPositionModule) {
      char.verticalPositionModule = new VerticalPositionModule({
        z: config.verticalPositionModule?.z ?? char.position.z ?? 0,
        hasVerticalVelocity: true,
        verticalVelocity: 0,
        enabled: config.verticalPositionModule?.enabled ?? true,
      });
    }
    char.verticalPositionModule.enabled = config.verticalPositionModule?.enabled ?? true;
  }

  if (config.hasGravity === false) {
    char.gravityModule = null;
  } else if (config.gravityModule || config.hasGravity === true) {
    if (!char.gravityModule) {
      char.gravityModule = new GravityModule({
        enabled: config.gravityModule?.enabled ?? true,
      });
    }
    char.gravityModule.enabled = config.gravityModule?.enabled ?? true;
  }

  if (config.hasRollModule === false) {
    char.rollModule = null;
  } else if (config.rollModule || config.hasRollModule === true) {
    if (!char.rollModule) {
      char.rollModule = new RollModule({
        enabled: config.rollModule?.enabled ?? true,
        rollResistance: config.rollModule?.rollResistance ?? 0.08,
        bumpyRollEnabled: config.rollModule?.bumpyRollEnabled ?? false,
        bumpiness: config.rollModule?.bumpiness ?? 0,
        seed: config.rollModule?.seed,
      });
    } else {
      char.rollModule.enabled = config.rollModule?.enabled ?? true;
      if (config.rollModule) {
        if (config.rollModule.rollResistance !== undefined) {
          char.rollModule.rollResistanceProp.set(config.rollModule.rollResistance, char.properties);
        }
        if (config.rollModule.bumpyRollEnabled !== undefined) {
          char.rollModule.bumpyRollEnabled = config.rollModule.bumpyRollEnabled;
        }
        if (config.rollModule.bumpiness !== undefined) {
          char.rollModule.bumpinessProp.set(config.rollModule.bumpiness, char.properties);
        }
      }
    }
  }

  if (config.hasRollMovement === false) {
    char.rollMovementModule = null;
  } else if (config.rollMovementModule || config.hasRollMovement === true) {
    if (!char.rollMovementModule) {
      char.rollMovementModule = new RollMovementModule({
        enabled: config.rollMovementModule?.enabled ?? true,
        baseAcceleration: config.rollMovementModule?.baseAcceleration ?? 22.0,
        sprintAcceleration: config.rollMovementModule?.sprintAcceleration ?? 45.0,
        maxRollSpeed: config.rollMovementModule?.maxRollSpeed ?? 18.0,
        maxSprintSpeed: config.rollMovementModule?.maxSprintSpeed ?? 32.0,
        brakeDeceleration: config.rollMovementModule?.brakeDeceleration ?? 55.0,
        freeRollResistance: config.rollMovementModule?.freeRollResistance ?? (char.rollModule ? char.rollModule.rollResistanceProp.get(char.properties) : 0.08),
        brakeRollResistance: config.rollMovementModule?.brakeRollResistance ?? 1.5,
        maxRollPower: config.rollMovementModule?.rollPowerCapacity ?? 800.0,
        maxSprintPower: config.rollMovementModule?.sprintPowerCapacity ?? 1800.0,
        maxBrakePower: config.rollMovementModule?.brakePowerCapacity ?? 400.0,
        rollConsumesEnergy: config.rollMovementModule?.consumesEnergy ?? true,
        rollAllowPartialPower: config.rollMovementModule?.allowPartialPower ?? true,
        sprintConsumesEnergy: config.rollMovementModule?.sprintConsumesEnergy ?? true,
        sprintAllowPartialPower: config.rollMovementModule?.sprintAllowPartialPower ?? true,
        brakeConsumesEnergy: config.rollMovementModule?.brakeConsumesEnergy ?? false,
        brakeAllowPartialPower: config.rollMovementModule?.brakeAllowPartialPower ?? true,
        enforceMaxRollSpeed: config.rollMovementModule?.enforceMaxRollSpeed ?? false,
        enforceMaxSprintSpeed: config.rollMovementModule?.enforceMaxSprintSpeed ?? false,
      });
      char.rollMovementModule.registerProperties(char.properties);
    } else {
      char.rollMovementModule.enabled = config.rollMovementModule?.enabled ?? true;
      if (config.rollMovementModule) {
        if (config.rollMovementModule.baseAcceleration !== undefined) {
          char.rollMovementModule.baseAccelerationProp.set(config.rollMovementModule.baseAcceleration, char.properties);
        }
        if (config.rollMovementModule.sprintAcceleration !== undefined) {
          char.rollMovementModule.sprintAccelerationProp.set(config.rollMovementModule.sprintAcceleration, char.properties);
        }
        if (config.rollMovementModule.maxRollSpeed !== undefined) {
          char.rollMovementModule.maxRollSpeedProp.set(config.rollMovementModule.maxRollSpeed, char.properties);
        }
        if (config.rollMovementModule.maxSprintSpeed !== undefined) {
          char.rollMovementModule.maxSprintSpeedProp.set(config.rollMovementModule.maxSprintSpeed, char.properties);
        }
        if (config.rollMovementModule.brakeDeceleration !== undefined) {
          char.rollMovementModule.brakeDecelerationProp.set(config.rollMovementModule.brakeDeceleration, char.properties);
        }
        if (config.rollMovementModule.freeRollResistance !== undefined) {
          char.rollMovementModule.freeRollResistanceProp.set(config.rollMovementModule.freeRollResistance, char.properties);
          if (char.rollModule && !char.rollMovementModule.isBraking) {
            char.rollModule.rollResistanceProp.set(config.rollMovementModule.freeRollResistance, char.properties);
          }
        }
        if (config.rollMovementModule.brakeRollResistance !== undefined) {
          char.rollMovementModule.brakeRollResistanceProp.set(config.rollMovementModule.brakeRollResistance, char.properties);
        }
        if (config.rollMovementModule.rollPowerCapacity !== undefined) {
          char.rollMovementModule.maxRollPowerProp.set(config.rollMovementModule.rollPowerCapacity, char.properties);
        }
        if (config.rollMovementModule.sprintPowerCapacity !== undefined) {
          char.rollMovementModule.maxSprintPowerProp.set(config.rollMovementModule.sprintPowerCapacity, char.properties);
        }
        if (config.rollMovementModule.brakePowerCapacity !== undefined) {
          char.rollMovementModule.maxBrakePowerProp.set(config.rollMovementModule.brakePowerCapacity, char.properties);
        }
        if (config.rollMovementModule.consumesEnergy !== undefined) {
          char.rollMovementModule.rollConsumesEnergy = config.rollMovementModule.consumesEnergy;
        }
        if (config.rollMovementModule.allowPartialPower !== undefined) {
          char.rollMovementModule.rollAllowPartialPower = config.rollMovementModule.allowPartialPower;
        }
        if (config.rollMovementModule.sprintConsumesEnergy !== undefined) {
          char.rollMovementModule.sprintConsumesEnergy = config.rollMovementModule.sprintConsumesEnergy;
        }
        if (config.rollMovementModule.sprintAllowPartialPower !== undefined) {
          char.rollMovementModule.sprintAllowPartialPower = config.rollMovementModule.sprintAllowPartialPower;
        }
        if (config.rollMovementModule.brakeConsumesEnergy !== undefined) {
          char.rollMovementModule.brakeConsumesEnergy = config.rollMovementModule.brakeConsumesEnergy;
        }
        if (config.rollMovementModule.brakeAllowPartialPower !== undefined) {
          char.rollMovementModule.brakeAllowPartialPower = config.rollMovementModule.brakeAllowPartialPower;
        }
        if (config.rollMovementModule.enforceMaxRollSpeed !== undefined) {
          char.rollMovementModule.enforceMaxRollSpeed = config.rollMovementModule.enforceMaxRollSpeed;
        }
        if (config.rollMovementModule.enforceMaxSprintSpeed !== undefined) {
          char.rollMovementModule.enforceMaxSprintSpeed = config.rollMovementModule.enforceMaxSprintSpeed;
        }
      }
    }
  }

  if (config.hasLocomotionStance === false) {
    char.locomotionStanceModule = null;
  } else if (config.locomotionStanceModule || config.hasLocomotionStance === true) {
    if (!char.locomotionStanceModule) {
      char.locomotionStanceModule = new LocomotionStanceModule({
        enabled: config.locomotionStanceModule?.enabled ?? true,
        activeMode: (config.locomotionStanceModule?.activeMode as any) ?? "roll",
        supportedModes: (config.locomotionStanceModule?.supportedModes as any) ?? ["roll", "walk"],
        canWalkWhileRolling: config.locomotionStanceModule?.canWalkWhileRolling ?? false,
      });
    } else {
      char.locomotionStanceModule.enabled = config.locomotionStanceModule?.enabled ?? true;
      if (config.locomotionStanceModule) {
        if (config.locomotionStanceModule.activeMode !== undefined) {
          char.locomotionStanceModule.activeMode = config.locomotionStanceModule.activeMode as any;
        }
        if (config.locomotionStanceModule.supportedModes !== undefined && Array.isArray(config.locomotionStanceModule.supportedModes)) {
          char.locomotionStanceModule.supportedModes = [...(config.locomotionStanceModule.supportedModes as any)];
        }
        if (config.locomotionStanceModule.canWalkWhileRolling !== undefined) {
          char.locomotionStanceModule.canWalkWhileRolling = config.locomotionStanceModule.canWalkWhileRolling;
        }
      }
    }
  }

  if (config.hasDamageSolverModule === false) {
    char.damageSolverModule = null;
  } else if (config.damageSolverModule || config.hasDamageSolverModule === true) {
    if (!char.damageSolverModule) char.damageSolverModule = new DamageSolverModule();
    char.damageSolverModule.enabled = config.damageSolverModule?.enabled ?? true;
    if (config.damageSolverModule) {
      if (config.damageSolverModule.impactSusceptibility !== undefined) char.damageSolverModule.impactSusceptibilityProp.set(config.damageSolverModule.impactSusceptibility, char.properties);
      if (config.damageSolverModule.piercingMultiplier !== undefined) char.damageSolverModule.piercingMultiplierProp.set(config.damageSolverModule.piercingMultiplier, char.properties);
      if (config.damageSolverModule.minShockThreshold !== undefined) char.damageSolverModule.damageThresholdHpProp.set(config.damageSolverModule.minShockThreshold, char.properties);
      if (config.damageSolverModule.selfImpactWeight !== undefined) char.damageSolverModule.selfImpactWeightProp.set(config.damageSolverModule.selfImpactWeight, char.properties);
    }
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
    hasGunModule: obj.gunModule !== null,
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

  if (obj.gunModule) {
    result.gunModule = {
      enabled: obj.gunModule.enabled,
      fireRate: obj.gunModule.fireRateProp.get(obj.properties),
      damagePerBullet: obj.gunModule.damagePerBulletProp.get(obj.properties),
      bulletSpeed: obj.gunModule.bulletSpeedProp.get(obj.properties),
      firingSeconds: obj.gunModule.firingSecondsProp.get(obj.properties),
      cooldownTime: obj.gunModule.cooldownTimeProp.get(obj.properties),
      cooldownDelay: obj.gunModule.cooldownDelayProp.get(obj.properties),
      bulletMass: obj.gunModule.bulletMassProp.get(obj.properties),
      turnSpeed: obj.gunModule.turnSpeedProp.get(obj.properties),
      aimTolerance: obj.gunModule.aimToleranceProp.get(obj.properties),
      gunLength: obj.gunModule.gunLength,
      gunWidth: obj.gunModule.gunWidth,
      bulletColor: obj.gunModule.bulletColor,
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
      piercingMultiplier: obj.damageSolverModule.piercingMultiplierProp.get(obj.properties),
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

  // Gun Weapon
  if (config.hasGunModule === false) {
    options.gunModule = null;
  } else if (config.gunModule) {
    options.gunModule = new GunModule({
      enabled: config.gunModule.enabled,
      fireRate: config.gunModule.fireRate,
      damagePerBullet: config.gunModule.damagePerBullet,
      bulletSpeed: config.gunModule.bulletSpeed,
      firingSeconds: config.gunModule.firingSeconds,
      cooldownTime: config.gunModule.cooldownTime,
      cooldownDelay: config.gunModule.cooldownDelay,
      bulletMass: config.gunModule.bulletMass,
      turnSpeed: config.gunModule.turnSpeed,
      aimTolerance: config.gunModule.aimTolerance,
      gunLength: config.gunModule.gunLength,
      gunWidth: config.gunModule.gunWidth,
      bulletColor: config.gunModule.bulletColor,
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
      piercingMultiplier: config.damageSolverModule.piercingMultiplier,
      damageThresholdHp: config.damageSolverModule.minShockThreshold,
      selfImpactWeight: config.damageSolverModule.selfImpactWeight,
    });
  }

  const obj = new GameObject(options);
  if (config.isSleeping !== undefined) {
    obj.isSleeping = config.isSleeping;
  }
  if (config.controlSchema && (obj as any) instanceof Character) {
    (obj as any).controlSchema = JSON.parse(JSON.stringify(config.controlSchema));
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
export function serializePrefab(prefab: { id: string; name: string; icon?: string; archetype: GameObject; controlSchema?: ControlSchema }): SerializedPrefabConfig {
  const schema = prefab.controlSchema || (prefab.archetype instanceof Character ? prefab.archetype.controlSchema : undefined);
  const isChar = prefab.archetype instanceof Character || (prefab.archetype as any).isCharacter;
  return {
    id: prefab.id,
    name: prefab.name,
    icon: prefab.icon,
    archetype: isChar
      ? (serializeCharacter(prefab.archetype as Character) as any)
      : serializeGameObject(prefab.archetype),
    ...(schema ? { controlSchema: schema } : {}),
  };
}
