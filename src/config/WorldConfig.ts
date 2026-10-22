import { GameObject } from "../engine/GameObject.js";
import { RollModule } from "../engine/RollModule.js";
import { ConsumableModule } from "../engine/ConsumableModule.js";
import { quarryPreset, createQuarryStones } from "../engine/maps/QuarryMap.js";

export interface SerializedGameObjectConfig {
  id: string;
  name: string;
  prefabId?: string;
  position: { x: number; y: number; z: number };
  color: string;
  visualShape?: "circle" | "box";
  mass: number;
  colliderRadius: number;
  bounceMod: number;
  verticalBounce?: boolean;
  staticGroundFrictionMod?: number;
  dynamicGroundFrictionMod?: number;
  isSleeping?: boolean;
  rollModule?: {
    enabled: boolean;
    rollResistance: number;
    bumpyRollEnabled?: boolean;
    bumpiness?: number;
    seed?: number;
  } | null;
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
  healthModule?: {
    enabled: boolean;
    maxHp: number;
    currentHp: number;
    naturalHealRate: number;
  } | null;
  damageAuraModule?: {
    enabled: boolean;
    damageRadius: number;
    damageRate: number;
  } | null;
  damageSolverModule?: {
    enabled: boolean;
    impactSusceptibility: number;
    minShockThreshold: number;
  } | null;
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
  objects: SerializedGameObjectConfig[];
}

export interface WorldConfigDelta {
  clientVersion: number;
  sections: ("arena" | "globalPhysics" | "objects")[];
  arena?: Partial<WorldConfig["arena"]>;
  globalPhysics?: Partial<WorldConfig["globalPhysics"]>;
  objectsDelta?: {
    upsert?: SerializedGameObjectConfig[];
    deletedIds?: string[];
  };
}

/**
 * Serializes a runtime GameObject into a persistent JSON-safe configuration object.
 */
export function serializeGameObject(obj: GameObject): SerializedGameObjectConfig {
  const result: SerializedGameObjectConfig = {
    id: obj.id,
    name: obj.name,
    prefabId: obj.prefabId ?? undefined,
    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
    color: obj.color,
    visualShape: obj.visualShape,
    mass: obj.mass,
    colliderRadius: obj.hasCollider ? obj.colliderRadius : (obj.colliderModule?.radius ?? 0.35),
    bounceMod: obj.bounceMod ?? 0,
    verticalBounce: obj.bounceModule?.verticalBounce ?? false,
    staticGroundFrictionMod: obj.staticGroundFrictionMod,
    dynamicGroundFrictionMod: obj.dynamicGroundFrictionMod,
    isSleeping: obj.isSleeping,
  };

  if (obj.rollModule) {
    result.rollModule = {
      enabled: obj.rollModule.enabled,
      rollResistance: obj.rollModule.rollResistance,
      bumpyRollEnabled: obj.rollModule.bumpyRollEnabled,
      bumpiness: obj.rollModule.bumpiness,
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
      maxHp: obj.healthModule.maxHp,
      currentHp: obj.healthModule.currentHp,
      naturalHealRate: obj.healthModule.maxHealRateProp.literalValue,
    };
  }

  if (obj.damageAuraModule) {
    result.damageAuraModule = {
      enabled: obj.damageAuraModule.enabled,
      damageRadius: obj.damageAuraModule.damageRadius,
      damageRate: obj.damageAuraModule.damageRate,
    };
  }

  if (obj.damageSolverModule) {
    result.damageSolverModule = {
      enabled: obj.damageSolverModule.enabled,
      impactSusceptibility: obj.damageSolverModule.impactSusceptibilityProp.literalValue,
      minShockThreshold: obj.damageSolverModule.minShockThresholdProp.literalValue,
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
    mass: config.mass,
    colliderRadius: config.colliderRadius,
    bounceMod: config.bounceMod,
    staticGroundFrictionMod: config.staticGroundFrictionMod ?? 1.0,
    dynamicGroundFrictionMod: config.dynamicGroundFrictionMod ?? 1.0,
    hasGravity: true,
    hasVerticalPosition: true,
  };

  if (config.rollModule) {
    options.rollModule = new RollModule({
      enabled: config.rollModule.enabled,
      rollResistance: config.rollModule.rollResistance,
      bumpyRollEnabled: config.rollModule.bumpyRollEnabled ?? true,
      bumpiness: config.rollModule.bumpiness ?? 0.22,
      seed: config.rollModule.seed,
    });
  }

  if (config.consumableModule) {
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

  return updated;
}
