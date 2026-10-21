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
import { DamageAuraModule } from "../engine/DamageAuraModule.js";
import { DamageSolverModule } from "../engine/DamageSolverModule.js";
import { quarryPreset, createQuarryStones } from "../engine/maps/QuarryMap.js";

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
  } | null;

  // Backwards compatibility legacy fields
  mass?: number;
  colliderRadius?: number;
  bounceMod?: number;
  verticalBounce?: boolean;
  staticGroundFrictionMod?: number;
  dynamicGroundFrictionMod?: number;
}

import type { Character } from "../character/Character.js";

export interface SerializedCharacterConfig {
  id?: string;
  name?: string;
  prefabId?: string;
  color?: string;
  mass?: number;
  colliderRadius?: number;

  hasWalking?: boolean;
  walkingModule?: {
    maxWalkForce?: number;
    maxWalkSpeed?: number;
    sprintSpeed?: number;
    canSprint?: boolean;
    walkInAir?: boolean;
  };

  hasJump?: boolean;
  jumpModule?: {
    jumpImpulse?: number;
  };

  hasThrow?: boolean;
  throwModule?: {
    throwForce?: number;
  };

  hasClimbing?: boolean;
  climbingModule?: {
    climbSpeed?: number;
  };

  hasHealth?: boolean;
  healthModule?: {
    maxHp?: number;
    currentHp?: number;
    naturalHealRate?: number;
  };

  hasLaser?: boolean;
  laserModule?: {
    maxRange?: number;
    damageRate?: number;
  };

  hasMelee?: boolean;
  meleeModule?: {
    impactForce?: number;
  };

  hasEnergyPool?: boolean;
  energyPool?: {
    staminaCapacity?: number;
    staminaRegenRate?: number;
    energyPoolCapacity?: number;
  };
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
}

export interface WorldConfigDelta {
  clientVersion: number;
  sections: ("arena" | "globalPhysics" | "player" | "objects")[];
  arena?: Partial<WorldConfig["arena"]>;
  globalPhysics?: Partial<WorldConfig["globalPhysics"]>;
  player?: SerializedCharacterConfig;
  objectsDelta?: {
    upsert?: SerializedGameObjectConfig[];
    deletedIds?: string[];
    replaceAll?: SerializedGameObjectConfig[];
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

  if (char.walkingModule) {
    result.hasWalking = char.walkingModule.enabled;
    result.walkingModule = {
      maxWalkForce: char.walkingModule.maxWalkForceProp.get(char.properties),
      maxWalkSpeed: char.walkingModule.maxWalkSpeedProp.get(char.properties),
      sprintSpeed: char.walkingModule.maxSprintSpeedProp.get(char.properties),
      canSprint: char.walkingModule.canSprint,
      walkInAir: char.walkingModule.walkInAir,
    };
  } else {
    result.hasWalking = false;
  }

  if (char.jumpModule) {
    result.hasJump = char.jumpModule.enabled;
    result.jumpModule = {
      jumpImpulse: char.jumpModule.jumpStrengthProp.get(char.properties),
    };
  } else {
    result.hasJump = false;
  }

  if (char.throwModule) {
    result.hasThrow = char.throwModule.enabled;
    result.throwModule = {
      throwForce: char.throwModule.baseThrowForceProp.get(char.properties),
    };
  } else {
    result.hasThrow = false;
  }

  if (char.climbingModule) {
    result.hasClimbing = char.climbingModule.enabled;
    result.climbingModule = {
      climbSpeed: char.climbingModule.maxClimbSpeedProp?.get(char.properties) ?? 3.5,
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
    };
  } else {
    result.hasHealth = false;
  }

  if (char.laserModule) {
    result.hasLaser = char.laserModule.enabled;
    result.laserModule = {
      maxRange: 15,
      damageRate: char.laserModule.damageRateProp?.get(char.properties) ?? 25,
    };
  } else {
    result.hasLaser = false;
  }

  if (char.meleeModule) {
    result.hasMelee = char.meleeModule.enabled;
    result.meleeModule = {
      impactForce: char.meleeModule.maxForceProp?.get(char.properties) ?? 15,
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
    };
  } else {
    result.hasEnergyPool = false;
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
  }

  if (config.hasJump === false) {
    char.jumpModule = null;
  } else if (config.jumpModule && char.jumpModule) {
    char.jumpModule.enabled = true;
    if (config.jumpModule.jumpImpulse !== undefined) char.jumpModule.jumpStrengthProp.set(config.jumpModule.jumpImpulse, char.properties);
  }

  if (config.hasThrow === false) {
    char.throwModule = null;
  } else if (config.throwModule && char.throwModule) {
    char.throwModule.enabled = true;
    if (config.throwModule.throwForce !== undefined) char.throwModule.baseThrowForceProp.set(config.throwModule.throwForce, char.properties);
  }

  if (config.hasHealth === false) {
    char.healthModule = null;
  } else if (config.healthModule && char.healthModule) {
    char.healthModule.enabled = true;
    if (config.healthModule.maxHp !== undefined) char.healthModule.maxHp = config.healthModule.maxHp;
    if (config.healthModule.currentHp !== undefined) char.healthModule.currentHp = config.healthModule.currentHp;
    if (config.healthModule.naturalHealRate !== undefined) char.healthModule.maxHealRate = config.healthModule.naturalHealRate;
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
      gravity: 24,
      collisionDamageScale: 1.0,
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
    objects: [...base.objects],
  };

  for (const section of delta.sections) {
    if (section === "arena" && delta.arena) {
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
    }
  }

  return updated;
}
