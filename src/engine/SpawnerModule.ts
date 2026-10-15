import type { GameObject, Vector3D } from "./GameObject.js";
import type { Arena } from "./Arena.js";
import { FoodModule } from "./FoodModule.js";

export interface SpawnerModuleOptions {
  spawnPosition?: Partial<Vector3D>;
  respawnDelay?: number;
  enabled?: boolean;
}

/**
 * SpawnerModule gives an entity infinite reproduction behavior upon being picked up.
 * When a character picks up the entity:
 * 1. An identical replacement clone is created at its original spawnPosition with the SpawnerModule attached.
 * 2. The picked-up entity held by the character has its SpawnerModule removed, ensuring players
 *    carry clean, standard items rather than portable infinite dispensers.
 */
export class SpawnerModule {
  public id = "spawner";
  public name = "Spawner (Clone On Pickup)";
  public enabled = true;

  /** The physical anchor coordinates where the replacement item spawns */
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
   * Executed when the host entity is picked up by a character.
   * Clones a replacement at spawnPosition, leaves it in the arena, and strips
   * the SpawnerModule from the picked-up entity so the player holds a normal item.
   */
  public triggerClone(pickedEntity: GameObject, arena: Arena): GameObject | null {
    if (!this.enabled || !arena) return null;

    // Dynamically clone the host GameObject archetype
    const GameObjectClass = pickedEntity.constructor as any;

    const clonePosition: Vector3D = {
      x: this.spawnPosition.x,
      y: this.spawnPosition.y,
      z: this.spawnPosition.z,
    };

    // If initial spawn position was never recorded (e.g. placed at runtime), record current position
    if (clonePosition.x === 0 && clonePosition.y === 0 && clonePosition.z === 0) {
      clonePosition.x = pickedEntity.position.x;
      clonePosition.y = pickedEntity.position.y;
      clonePosition.z = pickedEntity.position.z;
    }

    // Configure food clone if host was edible
    let cloneFoodModule: FoodModule | null = null;
    if (pickedEntity.foodModule) {
      const fm = pickedEntity.foodModule;
      const totalEnergy = fm.totalEnergyJoulesProp.literalValue;
      cloneFoodModule = new FoodModule({
        totalEnergyJoules: totalEnergy,
        remainingEnergyJoules: totalEnergy,
        eatRateWatts: fm.eatRateWattsProp.literalValue,
        healRate: fm.healRateProp.literalValue,
        minScaleFloor: fm.minScaleFloor,
        minRadiusFloor: fm.minRadiusFloor,
      });
      cloneFoodModule.initialColliderRadius = fm.initialColliderRadius;
    }

    // Configure new spawner module for the stationary replacement clone
    const cloneSpawner = new SpawnerModule({
      spawnPosition: { ...clonePosition },
      respawnDelay: this.respawnDelay,
      enabled: true,
    });
    cloneSpawner.spawnCount = this.spawnCount + 1;

    // Instantiate replacement clone
    const cloneObj: GameObject = new GameObjectClass({
      name: pickedEntity.name,
      position: clonePosition,
      color: pickedEntity.color,
      visualShape: pickedEntity.visualShape,
      mass: pickedEntity.mass,
      colliderRadius: pickedEntity.foodModule
        ? (pickedEntity.foodModule.initialColliderRadius || pickedEntity.colliderRadius)
        : pickedEntity.colliderRadius,
      bounceMod: pickedEntity.bounceMod,
      hasGravity: pickedEntity.hasGravity,
      hasVerticalPosition: pickedEntity.hasVerticalPosition,
      foodModule: cloneFoodModule,
    });

    cloneObj.spawnerModule = cloneSpawner;

    // Add replacement clone to arena entities
    if (Array.isArray(arena.entities)) {
      arena.entities.push(cloneObj);
    }

    // Increment spawn count
    this.spawnCount++;

    // User requirement: "i don't want the one i pick up to have the spawner module."
    // Strip SpawnerModule from the picked-up item now in the character's hands
    pickedEntity.spawnerModule = null;

    return cloneObj;
  }
}
