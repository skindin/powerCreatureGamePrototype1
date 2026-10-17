import type { GameObject, Vector3D } from "./GameObject.js";
import type { Arena } from "./Arena.js";
import { ConsumableModule } from "./ConsumableModule.js";

export interface SpawnerModuleOptions {
  spawnPosition?: Partial<Vector3D>;
  respawnDelay?: number;
  enabled?: boolean;
}

/**
 * SpawnerModule gives an entity infinite reproduction behavior upon being picked up.
 * When a character attempts to pick up the spawner entity:
 * 1. The spawner entity stays put at its location with its SpawnerModule intact.
 * 2. An identical clone is created WITHOUT the SpawnerModule.
 * 3. The clone is placed into the character's hands via pickupModule.pickup(character, clone).
 * 4. The clone is added to the active world objects array so it can be eaten, dropped, or thrown normally.
 */
export class SpawnerModule {
  public id = "spawner";
  public name = "Spawner (Clone On Pickup)";
  public enabled = true;

  /** The physical anchor coordinates where this spawner resides */
  public spawnPosition: Vector3D = { x: 0, y: 0, z: 0 };

  /** Number of times this spawner has generated a clone */
  public spawnCount: number = 0;

  /** Configurable respawn delay in seconds (0 = instant clone upon pickup) */
  public respawnDelay: number = 0;

  constructor(options?: SpawnerModuleOptions) {
    if (options?.spawnPosition) {
      this.spawnPosition = {
        x: options.spawnPosition.x ?? 0,
        y: options.spawnPosition.y ?? 0,
        z: options.spawnPosition.z ?? 0,
      };
    }
    if (options?.respawnDelay !== undefined) this.respawnDelay = Math.max(0, options.respawnDelay);
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  /**
   * Executed when a character picks up from this spawner entity.
   * Creates an identical clone without spawner behavior that goes into the character's hands,
   * while the spawner entity stays put in the arena with its SpawnerModule intact.
   */
  public triggerClone(
    spawnerEntity: GameObject,
    arena?: Arena,
    objects?: GameObject[]
  ): GameObject | null {
    if (!this.enabled || !spawnerEntity) return null;

    // Dynamically clone the host GameObject archetype
    const GameObjectClass = spawnerEntity.constructor as any;

    // Configure consumable clone if host was consumable / edible
    let cloneConsumableModule: ConsumableModule | null = null;
    const srcConsumable = spawnerEntity.consumableModule;
    if (srcConsumable) {
      const totalEnergy = srcConsumable.totalEnergyJoulesProp.literalValue;
      cloneConsumableModule = new ConsumableModule({
        tag: srcConsumable.tag,
        totalEnergyJoules: totalEnergy,
        remainingEnergyJoules: totalEnergy,
        consumeRateWatts: srcConsumable.consumeRateWattsProp.literalValue,
        healRate: srcConsumable.healRateProp.literalValue,
        minScaleFloor: srcConsumable.minScaleFloor,
        minRadiusFloor: srcConsumable.minRadiusFloor,
      });
      cloneConsumableModule.initialColliderRadius = srcConsumable.initialColliderRadius;
    }

    // Instantiate clone WITHOUT SpawnerModule
    const cloneObj: GameObject = new GameObjectClass({
      name: spawnerEntity.name,
      position: {
        x: spawnerEntity.position.x,
        y: spawnerEntity.position.y,
        z: spawnerEntity.position.z,
      },
      color: spawnerEntity.color,
      visualShape: spawnerEntity.visualShape,
      mass: spawnerEntity.mass,
      colliderRadius: spawnerEntity.consumableModule
        ? (spawnerEntity.consumableModule.initialColliderRadius || spawnerEntity.colliderRadius)
        : spawnerEntity.colliderRadius,
      bounceMod: spawnerEntity.bounceMod,
      hasGravity: spawnerEntity.hasGravity,
      hasVerticalPosition: spawnerEntity.hasVerticalPosition,
      consumableModule: cloneConsumableModule,
    });

    // The clone does NOT have spawner behavior!
    cloneObj.spawnerModule = null;

    // Synchronize clone elevation with arena walls if arena provided
    if (arena && typeof (arena as any).syncEntitiesWithWalls === "function") {
      (arena as any).syncEntitiesWithWalls([cloneObj]);
    }

    // Add clone directly to the active world objects array
    if (objects && Array.isArray(objects)) {
      if (!objects.includes(cloneObj)) {
        objects.push(cloneObj);
      }
    }

    // Spawner entity stays put in the arena with its SpawnerModule intact!
    this.spawnCount++;

    return cloneObj;
  }
}

