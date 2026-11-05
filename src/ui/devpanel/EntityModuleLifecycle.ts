import { Character } from "../../character/Character.js";
import { WalkingModule } from "../../character/WalkingModule.js";
import { PickupModule } from "../../character/PickupModule.js";
import { ThrowModule } from "../../character/ThrowModule.js";
import { ClimbingModule } from "../../character/ClimbingModule.js";
import { JumpModule } from "../../character/JumpModule.js";
import { WallEdgeAssistModule } from "../../character/WallEdgeAssistModule.js";
import { RollModule } from "../../engine/RollModule.js";
import { ColliderModule } from "../../engine/ColliderModule.js";
import { FrictionModule } from "../../engine/FrictionModule.js";
import { BounceModule } from "../../engine/BounceModule.js";
import { GravityModule } from "../../engine/GravityModule.js";
import { VerticalPositionModule } from "../../engine/VerticalPositionModule.js";
import { RigidbodyModule } from "../../engine/RigidbodyModule.js";
import { HealthModule } from "../../character/HealthModule.js";
import { DamageAuraModule } from "../../engine/DamageAuraModule.js";
import { DamageSolverModule } from "../../engine/DamageSolverModule.js";
import { CharacterModule } from "../../character/CharacterModule.js";
import { EnergyPool } from "../../character/EnergyPool.js";
import { ConsumableModule } from "../../engine/ConsumableModule.js";
import { ConsumeModule } from "../../character/ConsumeModule.js";
import { LaserModule } from "../../character/LaserModule.js";
import { MeleeModule } from "../../character/MeleeModule.js";
import { SpawnerModule } from "../../engine/SpawnerModule.js";
import { GunModule } from "../../engine/GunModule.js";
import { RollMovementModule } from "../../character/RollMovementModule.js";
import { LocomotionStanceModule } from "../../character/LocomotionStanceModule.js";
import { EnergyGrowthModule } from "../../character/EnergyGrowthModule.js";
import { VomitModule } from "../../character/VomitModule.js";
import type { DevPanel } from "../DevPanel.js";
import type { GameObject } from "../../engine/GameObject.js";

/**
 * Isolated lifecycle manager for attaching, detaching, and toggling
 * entity behavior modules from the DevPanel inspector.
 */
export class EntityModuleLifecycle {
  public static toggleModuleEnabled(panel: DevPanel, modId: string): void {
    const e = panel.selectedEntity;
    if (!e) return;
    const isChar = e instanceof Character;
    const char = isChar ? (e as Character) : null;

    switch (modId) {
      case "rigidbody":
        if (e.rigidbodyModule) e.rigidbodyModule.enabled = !e.rigidbodyModule.enabled;
        break;
      case "collider":
        if (e.colliderModule) e.colliderModule.enabled = !e.colliderModule.enabled;
        break;
      case "friction":
        if (e.frictionModule) e.frictionModule.enabled = !e.frictionModule.enabled;
        break;
      case "bounce":
        if (e.bounceModule) e.bounceModule.enabled = !e.bounceModule.enabled;
        break;
      case "verticalPosition":
        if (e.verticalPositionModule) e.verticalPositionModule.enabled = !e.verticalPositionModule.enabled;
        break;
      case "gravity":
        if (e.gravityModule) e.gravityModule.enabled = !e.gravityModule.enabled;
        break;
      case "roll":
        if (e.rollModule) e.rollModule.enabled = !e.rollModule.enabled;
        break;
      case "rollMovement":
        if (char?.rollMovementModule) char.rollMovementModule.enabled = !char.rollMovementModule.enabled;
        break;
      case "walking":
        if (char?.walkingModule) char.walkingModule.enabled = !char.walkingModule.enabled;
        break;
      case "pickup":
        if (char?.pickupModule) char.pickupModule.enabled = !char.pickupModule.enabled;
        break;
      case "throw":
        if (char?.throwModule) char.throwModule.enabled = !char.throwModule.enabled;
        break;
      case "jump":
        if (char?.jumpModule) char.jumpModule.enabled = !char.jumpModule.enabled;
        break;
      case "wallEdgeAssist":
        if (char?.wallEdgeAssistModule) char.wallEdgeAssistModule.enabled = !char.wallEdgeAssistModule.enabled;
        break;
      case "climbing":
        if (char?.climbingModule) char.climbingModule.enabled = !char.climbingModule.enabled;
        break;
      case "health":
        if (e.healthModule) e.healthModule.enabled = !e.healthModule.enabled;
        break;
      case "damageAura":
        if (e.damageAuraModule) e.damageAuraModule.enabled = !e.damageAuraModule.enabled;
        break;
      case "damageSolver":
        if (e.damageSolverModule) e.damageSolverModule.enabled = !e.damageSolverModule.enabled;
        break;
      case "consume":
        if (char?.consumeModule) char.consumeModule.enabled = !char.consumeModule.enabled;
        break;
      case "consumable":
      case "food":
        if (e.consumableModule) e.consumableModule.enabled = !e.consumableModule.enabled;
        break;
      case "gun":
        if (e.gunModule) e.gunModule.enabled = !e.gunModule.enabled;
        break;
      case "spawner":
        if (e.spawnerModule) e.spawnerModule.enabled = !e.spawnerModule.enabled;
        break;
      case "character":
        if (e.characterModule) e.characterModule.enabled = !e.characterModule.enabled;
        break;
      case "energyPool":
        if (char?.energyPool) char.energyPool.enabled = !char.energyPool.enabled;
        break;
      case "laser":
        if (char?.laserModule) char.laserModule.enabled = !char.laserModule.enabled;
        break;
      case "melee":
        if (char?.meleeModule) char.meleeModule.enabled = !char.meleeModule.enabled;
        break;
      case "locomotionStance":
        if (char?.locomotionStanceModule) char.locomotionStanceModule.enabled = !char.locomotionStanceModule.enabled;
        break;
      case "energyGrowth":
        if (char?.energyGrowthModule) char.energyGrowthModule.enabled = !char.energyGrowthModule.enabled;
        break;
      case "vomit":
        if (char?.vomitModule) char.vomitModule.enabled = !char.vomitModule.enabled;
        break;
    }

    panel.renderEntityModules();
    panel.updateSelectorOptions();
    panel.updateInspector();
    if (!(e instanceof Character)) {
      panel.markDirty("objects", e);
    } else {
      panel.markDirty("player", e);
    }
  }

  public static removeModuleFromSelectedEntity(panel: DevPanel, modId: string): void {
    const e = panel.selectedEntity;
    if (!e) return;
    switch (modId) {
      case "rigidbody":
        e.rigidbodyModule = null;
        break;
      case "collider":
        e.colliderModule = null;
        break;
      case "friction":
        e.frictionModule = null;
        break;
      case "bounce":
        e.bounceModule = null;
        break;
      case "verticalPosition":
        e.verticalPositionModule = null;
        e.position.z = 0;
        e.verticalVelocity = 0;
        e.supportingSurfaceHeight = 0;
        break;
      case "gravity":
        e.gravityModule = null;
        break;
      case "roll":
        e.rollModule = null;
        break;
      case "rollMovement":
        if (e instanceof Character) {
          (e as Character).rollMovementModule = null;
        }
        break;
      case "walking":
        if (e instanceof Character) {
          const char = e as Character;
          char.walkingModule = null;
          char.isActivelyWalking = false;
          char.isSprinting = false;
        }
        break;
      case "pickup":
        if (e instanceof Character) {
          const char = e as Character;
          if (char.heldObject) {
            char.pickupModule?.drop(char);
          }
          char.pickupModule = null;
        }
        break;
      case "throw":
        if (e instanceof Character) {
          (e as Character).throwModule = null;
        }
        break;
      case "jump":
        if (e instanceof Character) {
          (e as Character).jumpModule = null;
        }
        break;
      case "wallEdgeAssist":
        if (e instanceof Character) {
          (e as Character).wallEdgeAssistModule = null;
        }
        break;
      case "climbing":
        if (e instanceof Character) {
          const char = e as Character;
          char.climbingModule = null;
          char.isClimbing = false;
        }
        break;
      case "health":
        e.healthModule = null;
        break;
      case "damageAura":
        e.damageAuraModule = null;
        break;
      case "damageSolver":
        e.damageSolverModule = null;
        break;
      case "consume":
        if (e instanceof Character) {
          (e as Character).consumeModule = null;
        }
        break;
      case "consumable":
      case "food":
        e.consumableModule = null;
        break;
      case "gun":
        e.gunModule = null;
        break;
      case "spawner":
        e.spawnerModule = null;
        break;
      case "character":
        e.characterModule = null;
        break;
      case "energyPool":
        if (e instanceof Character) {
          (e as Character).energyPool = null;
        }
        break;
      case "laser":
        if (e instanceof Character) {
          (e as Character).laserModule = null;
        }
        break;
      case "melee":
        if (e instanceof Character) {
          (e as Character).meleeModule = null;
        }
        break;
      case "locomotionStance":
        if (e instanceof Character) {
          (e as Character).locomotionStanceModule = null;
        }
        break;
      case "energyGrowth":
        if (e instanceof Character) {
          (e as Character).energyGrowthModule = null;
        }
        break;
      case "vomit":
        if (e instanceof Character) {
          (e as Character).vomitModule = null;
        }
        break;
    }

    panel.renderEntityModules();
    panel.updateSelectorOptions();
    panel.updateInspector();
    if (!(e instanceof Character)) {
      panel.markDirty("objects", e);
    } else {
      panel.markDirty("player", e);
    }
  }

  public static addModuleToSelectedEntity(panel: DevPanel, modId: string): void {
    const e = panel.selectedEntity;
    if (!e) return;
    switch (modId) {
      case "rigidbody":
        e.rigidbodyModule = new RigidbodyModule({
          velocity: { x: 0, y: 0 },
          hasVerticalVelocity: true,
          verticalVelocity: 0,
          collisionMode: "dynamic",
          enabled: true,
        });
        break;
      case "collider":
        e.colliderModule = new ColliderModule({ radius: 0.32 });
        break;
      case "friction":
        e.frictionModule = new FrictionModule();
        break;
      case "bounce":
        e.bounceModule = new BounceModule({ bounceMod: 0.4 });
        break;
      case "verticalPosition":
        e.verticalPositionModule = new VerticalPositionModule({
          z: e.position.z,
          hasVerticalVelocity: true,
          verticalVelocity: 0,
          enabled: true,
        });
        break;
      case "gravity":
        e.gravityModule = new GravityModule();
        break;
      case "roll":
        e.rollModule = new RollModule({ rollResistance: 0.4 });
        break;
      case "rollMovement":
        if (e instanceof Character) {
          (e as Character).rollMovementModule = new RollMovementModule({
            baseAcceleration: 22.0,
            sprintAcceleration: 45.0,
            maxRollSpeed: 18.0,
            maxSprintSpeed: 28.0,
            brakeDeceleration: 35.0,
          });
        }
        break;
      case "walking":
        if (e instanceof Character) {
          (e as Character).walkingModule = new WalkingModule({
            walkConsumesEnergy: false,
            walkAllowPartialPower: false,
            sprintConsumesEnergy: true,
            sprintAllowPartialPower: true,
          });
        }
        break;
      case "pickup":
        if (e instanceof Character) {
          (e as Character).pickupModule = new PickupModule({ consumesEnergy: false, allowPartialPower: false });
        }
        break;
      case "throw":
        if (e instanceof Character) {
          (e as Character).throwModule = new ThrowModule({ consumesEnergy: true });
        }
        break;
      case "jump":
        if (e instanceof Character) {
          (e as Character).jumpModule = new JumpModule();
          (e as Character).jumpConsumesEnergy = true;
          (e as Character).jumpAllowPartialPower = false;
        }
        break;
      case "wallEdgeAssist":
        if (e instanceof Character) {
          (e as Character).wallEdgeAssistModule = new WallEdgeAssistModule();
        }
        break;
      case "climbing":
        if (e instanceof Character) {
          (e as Character).climbingModule = new ClimbingModule({ consumesEnergy: true, allowPartialPower: false });
        }
        break;
      case "health":
        e.healthModule = new HealthModule({
          baseMaxHp: 100,
          maxHp: 100,
          currentHp: 100,
          baseMaxHealRate: 5,
          maxHealRate: 5,
          consumesEnergy: true,
          allowPartialPower: true,
        });
        break;
      case "damageAura":
        e.damageAuraModule = new DamageAuraModule({
          damageRadius: 2.0,
          damageRate: 20.0,
        });
        break;
      case "damageSolver":
        e.damageSolverModule = new DamageSolverModule({
          impactSusceptibility: 1.0,
          piercingMultiplier: 1.0,
          damageThresholdHp: 5.0,
        });
        break;
      case "consume":
        if (e instanceof Character) {
          (e as Character).consumeModule = new ConsumeModule({
            acceptedTags: ["food"],
          });
        }
        break;
      case "consumable":
      case "food":
        e.consumableModule = new ConsumableModule({
          tag: "food",
          totalEnergyJoules: 4000,
          consumeRateWatts: 800,
        });
        e.consumableModule.initialColliderRadius = e.colliderRadius;
        break;
      case "gun":
        e.gunModule = new GunModule({
          fireRate: 5.0,
          damagePerBullet: 15.0,
          bulletSpeed: 28.0,
          firingSeconds: 2.5,
          cooldownTime: 1.5,
          bulletMass: 0.06,
        });
        e.gunModule.registerProperties(e.properties);
        break;
      case "spawner":
        e.spawnerModule = new SpawnerModule({
          spawnPosition: { ...e.position },
          respawnDelay: 0,
        });
        break;
      case "character":
        e.characterModule = new CharacterModule({
          role: e instanceof Character ? (e as Character).role : "dummy",
        });
        break;
      case "energyPool":
        if (e instanceof Character) {
          (e as Character).energyPool = new EnergyPool();
        }
        break;
      case "laser":
        if (e instanceof Character) {
          (e as Character).laserModule = new LaserModule();
        }
        break;
      case "melee":
        if (e instanceof Character) {
          (e as Character).meleeModule = new MeleeModule();
        }
        break;
      case "locomotionStance":
        if (e instanceof Character) {
          (e as Character).locomotionStanceModule = new LocomotionStanceModule({
            activeMode: (e as Character).rollMovementModule ? "roll" : "walk",
            supportedModes: ["walk", "roll"],
            enabled: true,
          });
        }
        break;
      case "energyGrowth":
        if (e instanceof Character) {
          (e as Character).energyGrowthModule = new EnergyGrowthModule();
        }
        break;
      case "vomit":
        if (e instanceof Character) {
          (e as Character).vomitModule = new VomitModule();
        }
        break;
    }

    panel.renderEntityModules();
    panel.updateSelectorOptions();
    panel.updateInspector();
    if (!(e instanceof Character)) {
      panel.markDirty("objects", e);
    } else {
      panel.markDirty("player", e);
    }
  }

  public static readonly ALL_MODULE_IDS: readonly string[] = [
    "rigidbody",
    "collider",
    "friction",
    "bounce",
    "verticalPosition",
    "gravity",
    "roll",
    "walking",
    "jump",
    "rollMovement",
    "locomotionStance",
    "pickup",
    "throw",
    "wallEdgeAssist",
    "climbing",
    "health",
    "laser",
    "melee",
    "consume",
    "consumable",
    "gun",
    "spawner",
    "character",
    "energyPool",
    "energyGrowth",
    "vomit",
    "damageAura",
    "damageSolver",
  ];

  /**
   * Synchronizes ALL module existences, enabled states, and configurations from src to dest.
   * Ensures that adding, removing, or saving any module on an entity deterministically syncs
   * the entire module set to its prefab archetype and live instances.
   */
  public static syncAllModules(src: GameObject, dest: GameObject): void {
    for (const modId of this.ALL_MODULE_IDS) {
      this.syncModule(src, dest, modId);
    }
  }

  /**
   * Synchronizes a specific module's existence and property configuration from a source
   * GameObject to a destination GameObject (e.g. from an inspected live entity to a prefab archetype,
   * or between prefab instances).
   */
  public static syncModule(src: GameObject, dest: GameObject, modId: string): void {
    const isSrcChar = src instanceof Character;
    const isDestChar = dest instanceof Character;
    const srcChar = isSrcChar ? (src as Character) : null;
    const destChar = isDestChar ? (dest as Character) : null;

    switch (modId) {
      case "rigidbody":
        if (src.rigidbodyModule) {
          if (!dest.rigidbodyModule) dest.rigidbodyModule = new RigidbodyModule();
          dest.rigidbodyModule.enabled = src.rigidbodyModule.enabled;
          dest.rigidbodyModule.massProp.set(src.rigidbodyModule.massProp.get(src.properties), dest.properties);
          dest.collisionMode = src.collisionMode;
          dest.mass = src.mass;
        } else {
          dest.rigidbodyModule = null;
        }
        break;

      case "collider":
        if (src.colliderModule) {
          if (!dest.colliderModule) dest.colliderModule = new ColliderModule();
          dest.colliderModule.enabled = src.colliderModule.enabled;
          dest.colliderModule.radiusProp.set(src.colliderModule.radiusProp.get(src.properties), dest.properties);
          dest.colliderRadius = src.colliderRadius;
        } else {
          dest.colliderModule = null;
        }
        break;

      case "friction":
        if (src.frictionModule) {
          if (!dest.frictionModule) dest.frictionModule = new FrictionModule();
          dest.frictionModule.enabled = src.frictionModule.enabled;
          dest.frictionModule.staticFrictionProp.set(src.frictionModule.staticFrictionProp.get(src.properties), dest.properties);
          dest.frictionModule.dynamicFrictionProp.set(src.frictionModule.dynamicFrictionProp.get(src.properties), dest.properties);
        } else {
          dest.frictionModule = null;
        }
        break;

      case "bounce":
        if (src.bounceModule) {
          if (!dest.bounceModule) dest.bounceModule = new BounceModule();
          dest.bounceModule.enabled = src.bounceModule.enabled;
          dest.bounceModule.bounceModProp.set(src.bounceModule.bounceModProp.get(src.properties), dest.properties);
          dest.bounceModule.verticalBounce = src.bounceModule.verticalBounce;
          dest.bounceMod = src.bounceMod;
        } else {
          dest.bounceModule = null;
        }
        break;

      case "verticalPosition":
        if (src.verticalPositionModule) {
          if (!dest.verticalPositionModule) dest.verticalPositionModule = new VerticalPositionModule();
          dest.verticalPositionModule.enabled = src.verticalPositionModule.enabled;
        } else {
          dest.verticalPositionModule = null;
        }
        break;

      case "gravity":
        if (src.gravityModule) {
          if (!dest.gravityModule) dest.gravityModule = new GravityModule();
          dest.gravityModule.enabled = src.gravityModule.enabled;
        } else {
          dest.gravityModule = null;
        }
        break;

      case "roll":
        if (src.rollModule) {
          if (!dest.rollModule) dest.rollModule = new RollModule();
          dest.rollModule.enabled = src.rollModule.enabled || Boolean(srcChar?.locomotionStanceModule?.isRollDisabledByWalkStance);
          dest.rollModule.rollResistanceProp.set(src.rollModule.rollResistanceProp.get(src.properties), dest.properties);
          dest.rollModule.bumpyRollEnabled = src.rollModule.bumpyRollEnabled;
          dest.rollModule.bumpinessProp.set(src.rollModule.bumpinessProp.get(src.properties), dest.properties);
          dest.rollModule.seed = src.rollModule.seed;
        } else {
          dest.rollModule = null;
        }
        break;

      case "walking":
        if (destChar) {
          if (srcChar?.walkingModule) {
            if (!destChar.walkingModule) destChar.walkingModule = new WalkingModule();
            destChar.walkingModule.enabled = srcChar.walkingModule.enabled;
            destChar.walkingModule.maxWalkForceProp.set(srcChar.walkingModule.maxWalkForceProp.get(src.properties), dest.properties);
            destChar.walkingModule.maxWalkSpeedProp.set(srcChar.walkingModule.maxWalkSpeedProp.get(src.properties), dest.properties);
            destChar.walkingModule.maxSprintSpeedProp.set(srcChar.walkingModule.maxSprintSpeedProp.get(src.properties), dest.properties);
            destChar.walkingModule.canSprint = srcChar.walkingModule.canSprint;
            destChar.walkingModule.walkInAir = srcChar.walkingModule.walkInAir;
            destChar.walkingModule.walkConsumesEnergy = srcChar.walkingModule.walkConsumesEnergy;
            destChar.walkingModule.walkAllowPartialPower = srcChar.walkingModule.walkAllowPartialPower;
            destChar.walkingModule.sprintConsumesEnergy = srcChar.walkingModule.sprintConsumesEnergy;
            destChar.walkingModule.sprintAllowPartialPower = srcChar.walkingModule.sprintAllowPartialPower;
            if (srcChar.walkingModule.maxWalkPowerProp && destChar.walkingModule.maxWalkPowerProp) {
              destChar.walkingModule.maxWalkPowerProp.set(srcChar.walkingModule.maxWalkPowerProp.get(src.properties), dest.properties);
            }
            if (srcChar.walkingModule.maxSprintPowerProp && destChar.walkingModule.maxSprintPowerProp) {
              destChar.walkingModule.maxSprintPowerProp.set(srcChar.walkingModule.maxSprintPowerProp.get(src.properties), dest.properties);
            }
          } else {
            destChar.walkingModule = null;
          }
        }
        break;

      case "jump":
        if (destChar) {
          if (srcChar?.jumpModule) {
            if (!destChar.jumpModule) destChar.jumpModule = new JumpModule();
            destChar.jumpModule.enabled = srcChar.jumpModule.enabled;
            destChar.jumpModule.jumpStrengthProp.set(srcChar.jumpModule.jumpStrengthProp.get(src.properties), dest.properties);
            destChar.jumpModule.maxInitialSpeedProp.set(srcChar.jumpModule.maxInitialSpeedProp.get(src.properties), dest.properties);
            if (srcChar.jumpPowerCapacityProp && destChar.jumpPowerCapacityProp) {
              destChar.jumpPowerCapacityProp.set(srcChar.jumpPowerCapacityProp.get(src.properties), dest.properties);
            }
            destChar.jumpConsumesEnergy = srcChar.jumpConsumesEnergy;
            destChar.jumpAllowPartialPower = srcChar.jumpAllowPartialPower;
          } else {
            destChar.jumpModule = null;
          }
        }
        break;

      case "rollMovement":
        if (destChar) {
          if (srcChar?.rollMovementModule) {
            if (!destChar.rollMovementModule) destChar.rollMovementModule = new RollMovementModule();
            destChar.rollMovementModule.enabled = srcChar.rollMovementModule.enabled;
            destChar.rollMovementModule.baseAccelerationProp.set(srcChar.rollMovementModule.baseAccelerationProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.sprintAccelerationProp.set(srcChar.rollMovementModule.sprintAccelerationProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.maxRollSpeedProp.set(srcChar.rollMovementModule.maxRollSpeedProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.maxSprintSpeedProp.set(srcChar.rollMovementModule.maxSprintSpeedProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.brakeDecelerationProp.set(srcChar.rollMovementModule.brakeDecelerationProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.freeRollResistanceProp.set(srcChar.rollMovementModule.freeRollResistanceProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.brakeRollResistanceProp.set(srcChar.rollMovementModule.brakeRollResistanceProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.maxRollPowerProp.set(srcChar.rollMovementModule.maxRollPowerProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.maxSprintPowerProp.set(srcChar.rollMovementModule.maxSprintPowerProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.maxBrakePowerProp.set(srcChar.rollMovementModule.maxBrakePowerProp.get(src.properties), dest.properties);
            destChar.rollMovementModule.rollConsumesEnergy = srcChar.rollMovementModule.rollConsumesEnergy;
            destChar.rollMovementModule.rollAllowPartialPower = srcChar.rollMovementModule.rollAllowPartialPower;
            destChar.rollMovementModule.sprintConsumesEnergy = srcChar.rollMovementModule.sprintConsumesEnergy;
            destChar.rollMovementModule.sprintAllowPartialPower = srcChar.rollMovementModule.sprintAllowPartialPower;
            destChar.rollMovementModule.brakeConsumesEnergy = srcChar.rollMovementModule.brakeConsumesEnergy;
            destChar.rollMovementModule.brakeAllowPartialPower = srcChar.rollMovementModule.brakeAllowPartialPower;
            destChar.rollMovementModule.enforceMaxRollSpeed = srcChar.rollMovementModule.enforceMaxRollSpeed;
            destChar.rollMovementModule.enforceMaxSprintSpeed = srcChar.rollMovementModule.enforceMaxSprintSpeed;
          } else {
            destChar.rollMovementModule = null;
          }
        }
        break;

      case "locomotionStance":
        if (destChar) {
          if (srcChar?.locomotionStanceModule) {
            if (!destChar.locomotionStanceModule) {
              destChar.locomotionStanceModule = new LocomotionStanceModule({
                enabled: srcChar.locomotionStanceModule.enabled,
                activeMode: srcChar.locomotionStanceModule.activeMode,
                supportedModes: [...srcChar.locomotionStanceModule.supportedModes],
                canWalkWhileRolling: srcChar.locomotionStanceModule.canWalkWhileRolling,
              });
            } else {
              destChar.locomotionStanceModule.enabled = srcChar.locomotionStanceModule.enabled;
              destChar.locomotionStanceModule.activeMode = srcChar.locomotionStanceModule.activeMode;
              destChar.locomotionStanceModule.supportedModes = [...srcChar.locomotionStanceModule.supportedModes];
              destChar.locomotionStanceModule.canWalkWhileRolling = srcChar.locomotionStanceModule.canWalkWhileRolling;
            }
          } else {
            destChar.locomotionStanceModule = null;
          }
        }
        break;

      case "pickup":
        if (destChar) {
          if (srcChar?.pickupModule) {
            if (!destChar.pickupModule) destChar.pickupModule = new PickupModule();
            destChar.pickupModule.enabled = srcChar.pickupModule.enabled;
            if (srcChar.pickupModule.pickupReachProp && destChar.pickupModule.pickupReachProp) {
              destChar.pickupModule.pickupReachProp.set(srcChar.pickupModule.pickupReachProp.get(src.properties), dest.properties);
            }
            if (srcChar.pickupModule.maxPowerProp && destChar.pickupModule.maxPowerProp) {
              destChar.pickupModule.maxPowerProp.set(srcChar.pickupModule.maxPowerProp.get(src.properties), dest.properties);
            }
            destChar.pickupModule.consumesEnergy = srcChar.pickupModule.consumesEnergy;
            destChar.pickupModule.allowPartialPower = srcChar.pickupModule.allowPartialPower;
          } else {
            destChar.pickupModule = null;
          }
        }
        break;

      case "throw":
        if (destChar) {
          if (srcChar?.throwModule) {
            if (!destChar.throwModule) destChar.throwModule = new ThrowModule();
            destChar.throwModule.enabled = srcChar.throwModule.enabled;
            destChar.throwModule.baseThrowForceProp.set(srcChar.throwModule.baseThrowForceProp.get(src.properties), dest.properties);
            destChar.throwModule.maxPowerProp.set(srcChar.throwModule.maxPowerProp.get(src.properties), dest.properties);
            destChar.throwModule.maxThrowSpeedProp.set(srcChar.throwModule.maxThrowSpeedProp.get(src.properties), dest.properties);
            destChar.throwModule.maxThrowHeightProp.set(srcChar.throwModule.maxThrowHeightProp.get(src.properties), dest.properties);
            destChar.throwModule.consumesEnergy = srcChar.throwModule.consumesEnergy;
          } else {
            destChar.throwModule = null;
          }
        }
        break;

      case "wallEdgeAssist":
        if (destChar) {
          if (srcChar?.wallEdgeAssistModule) {
            if (!destChar.wallEdgeAssistModule) destChar.wallEdgeAssistModule = new WallEdgeAssistModule();
            destChar.wallEdgeAssistModule.enabled = srcChar.wallEdgeAssistModule.enabled;
            if (srcChar.wallEdgeAssistModule.hangDistanceProp && destChar.wallEdgeAssistModule.hangDistanceProp) {
              destChar.wallEdgeAssistModule.hangDistanceProp.set(srcChar.wallEdgeAssistModule.hangDistanceProp.get(src.properties), dest.properties);
            }
            destChar.wallEdgeAssistModule.preventWalkOff = srcChar.wallEdgeAssistModule.preventWalkOff;
          } else {
            destChar.wallEdgeAssistModule = null;
          }
        }
        break;

      case "climbing":
        if (destChar) {
          if (srcChar?.climbingModule) {
            if (!destChar.climbingModule) destChar.climbingModule = new ClimbingModule();
            destChar.climbingModule.enabled = srcChar.climbingModule.enabled;
            if (srcChar.climbingModule.maxClimbSpeedProp && destChar.climbingModule.maxClimbSpeedProp) {
              destChar.climbingModule.maxClimbSpeedProp.set(srcChar.climbingModule.maxClimbSpeedProp.get(src.properties), dest.properties);
            }
            if (srcChar.climbingModule.maxAdhesionProp && destChar.climbingModule.maxAdhesionProp) {
              destChar.climbingModule.maxAdhesionProp.set(srcChar.climbingModule.maxAdhesionProp.get(src.properties), dest.properties);
            }
            if (srcChar.climbingModule.maxPowerProp && destChar.climbingModule.maxPowerProp) {
              destChar.climbingModule.maxPowerProp.set(srcChar.climbingModule.maxPowerProp.get(src.properties), dest.properties);
            }
            destChar.climbingModule.horizontalClimb = srcChar.climbingModule.horizontalClimb;
            destChar.climbingModule.consumesEnergy = srcChar.climbingModule.consumesEnergy;
            destChar.climbingModule.allowPartialPower = srcChar.climbingModule.allowPartialPower;
          } else {
            destChar.climbingModule = null;
          }
        }
        break;

      case "health":
        if (src.healthModule) {
          if (!dest.healthModule) dest.healthModule = new HealthModule();
          dest.healthModule.enabled = src.healthModule.enabled;
          dest.healthModule.maxHp = src.healthModule.getMaxHp(src.properties);
          dest.healthModule.currentHp = src.healthModule.getCurrentHp(src.properties);
          dest.healthModule.maxHealRate = src.healthModule.getMaxHealRate(src.properties);
          if (src.healthModule.joulesPerHpProp && dest.healthModule.joulesPerHpProp) {
            dest.healthModule.joulesPerHpProp.set(src.healthModule.joulesPerHpProp.get(src.properties), dest.properties);
          }
          if (src.healthModule.maxPowerProp && dest.healthModule.maxPowerProp) {
            dest.healthModule.maxPowerProp.set(src.healthModule.maxPowerProp.get(src.properties), dest.properties);
          }
          dest.healthModule.consumesEnergy = src.healthModule.consumesEnergy;
          dest.healthModule.allowPartialPower = src.healthModule.allowPartialPower;
        } else {
          dest.healthModule = null;
        }
        break;

      case "laser":
        if (destChar) {
          if (srcChar?.laserModule) {
            if (!destChar.laserModule) destChar.laserModule = new LaserModule();
            destChar.laserModule.enabled = srcChar.laserModule.enabled;
            if (srcChar.laserModule.damageRateProp && destChar.laserModule.damageRateProp) {
              destChar.laserModule.damageRateProp.set(srcChar.laserModule.damageRateProp.get(src.properties), dest.properties);
            }
            if (srcChar.laserModule.thicknessProp && destChar.laserModule.thicknessProp) {
              destChar.laserModule.thicknessProp.set(srcChar.laserModule.thicknessProp.get(src.properties), dest.properties);
            }
            if (srcChar.laserModule.maxPowerProp && destChar.laserModule.maxPowerProp) {
              destChar.laserModule.maxPowerProp.set(srcChar.laserModule.maxPowerProp.get(src.properties), dest.properties);
            }
            destChar.laserModule.allowPartialPower = srcChar.laserModule.allowPartialPower;
          } else {
            destChar.laserModule = null;
          }
        }
        break;

      case "melee":
        if (destChar) {
          if (srcChar?.meleeModule) {
            if (!destChar.meleeModule) destChar.meleeModule = new MeleeModule();
            destChar.meleeModule.enabled = srcChar.meleeModule.enabled;
            if (srcChar.meleeModule.maxForceProp && destChar.meleeModule.maxForceProp) {
              destChar.meleeModule.maxForceProp.set(srcChar.meleeModule.maxForceProp.get(src.properties), dest.properties);
            }
            if (srcChar.meleeModule.maxPowerProp && destChar.meleeModule.maxPowerProp) {
              destChar.meleeModule.maxPowerProp.set(srcChar.meleeModule.maxPowerProp.get(src.properties), dest.properties);
            }
            if (srcChar.meleeModule.punchFrequencyProp && destChar.meleeModule.punchFrequencyProp) {
              destChar.meleeModule.punchFrequencyProp.set(srcChar.meleeModule.punchFrequencyProp.get(src.properties), dest.properties);
            }
            if (srcChar.meleeModule.reachProp && destChar.meleeModule.reachProp) {
              destChar.meleeModule.reachProp.set(srcChar.meleeModule.reachProp.get(src.properties), dest.properties);
            }
            if (srcChar.meleeModule.widthProp && destChar.meleeModule.widthProp) {
              destChar.meleeModule.widthProp.set(srcChar.meleeModule.widthProp.get(src.properties), dest.properties);
            }
            destChar.meleeModule.allowPartialPower = srcChar.meleeModule.allowPartialPower;
          } else {
            destChar.meleeModule = null;
          }
        }
        break;

      case "consume":
        if (destChar) {
          if (srcChar?.consumeModule) {
            if (!destChar.consumeModule) destChar.consumeModule = new ConsumeModule();
            destChar.consumeModule.enabled = srcChar.consumeModule.enabled;
            destChar.consumeModule.consumptionSpeedMultiplierProp.set(
              srcChar.consumeModule.consumptionSpeedMultiplierProp.get(srcChar.properties),
              destChar.properties
            );
            destChar.consumeModule.acceptedTags = [...srcChar.consumeModule.acceptedTags];
          } else {
            destChar.consumeModule = null;
          }
        }
        break;

      case "consumable":
      case "food":
        if (src.consumableModule) {
          if (!dest.consumableModule) dest.consumableModule = new ConsumableModule();
          dest.consumableModule.enabled = src.consumableModule.enabled;
          dest.consumableModule.tag = src.consumableModule.tag;
          dest.consumableModule.totalEnergyJoulesProp.set(src.consumableModule.totalEnergyJoulesProp.get(src.properties), dest.properties);
          dest.consumableModule.consumeRateWattsProp.set(src.consumableModule.consumeRateWattsProp.get(src.properties), dest.properties);
          dest.consumableModule.healRateProp.set(src.consumableModule.healRateProp.get(src.properties), dest.properties);
          dest.consumableModule.minScaleFloor = src.consumableModule.minScaleFloor;
          dest.consumableModule.minRadiusFloor = src.consumableModule.minRadiusFloor;
          dest.consumableModule.unlimited = src.consumableModule.unlimited;
        } else {
          dest.consumableModule = null;
        }
        break;

      case "gun":
        if (src.gunModule) {
          if (!dest.gunModule) dest.gunModule = new GunModule();
          dest.gunModule.enabled = src.gunModule.enabled;
          dest.gunModule.fireRateProp.set(src.gunModule.fireRateProp.get(src.properties), dest.properties);
          dest.gunModule.damagePerBulletProp.set(src.gunModule.damagePerBulletProp.get(src.properties), dest.properties);
          dest.gunModule.bulletSpeedProp.set(src.gunModule.bulletSpeedProp.get(src.properties), dest.properties);
          dest.gunModule.firingSecondsProp.set(src.gunModule.firingSecondsProp.get(src.properties), dest.properties);
          dest.gunModule.cooldownTimeProp.set(src.gunModule.cooldownTimeProp.get(src.properties), dest.properties);
          dest.gunModule.cooldownDelayProp.set(src.gunModule.cooldownDelayProp.get(src.properties), dest.properties);
          dest.gunModule.bulletMassProp.set(src.gunModule.bulletMassProp.get(src.properties), dest.properties);
          dest.gunModule.turnSpeedProp.set(src.gunModule.turnSpeedProp.get(src.properties), dest.properties);
          dest.gunModule.aimToleranceProp.set(src.gunModule.aimToleranceProp.get(src.properties), dest.properties);
          dest.gunModule.gunLength = src.gunModule.gunLength;
          dest.gunModule.gunWidth = src.gunModule.gunWidth;
          dest.gunModule.bulletColor = src.gunModule.bulletColor;
        } else {
          dest.gunModule = null;
        }
        break;

      case "spawner":
        if (src.spawnerModule) {
          if (!dest.spawnerModule) dest.spawnerModule = new SpawnerModule({ spawnPosition: { ...src.position } });
          dest.spawnerModule.enabled = src.spawnerModule.enabled;
        } else {
          dest.spawnerModule = null;
        }
        break;

      case "character":
        if (src.characterModule) {
          if (!dest.characterModule) dest.characterModule = new CharacterModule();
          dest.characterModule.role = src.characterModule.role;
        } else {
          dest.characterModule = null;
        }
        break;

      case "energyPool":
        if (destChar) {
          if (srcChar?.energyPool) {
            if (!destChar.energyPool) destChar.energyPool = new EnergyPool();
            destChar.energyPool.enabled = srcChar.energyPool.enabled;
            if (srcChar.energyPool.maxStaminaProp && destChar.energyPool.maxStaminaProp) {
              destChar.energyPool.maxStaminaProp.set(srcChar.energyPool.maxStaminaProp.get(src.properties), dest.properties);
            }
            if (srcChar.energyPool.staminaRegenRateProp && destChar.energyPool.staminaRegenRateProp) {
              destChar.energyPool.staminaRegenRateProp.set(srcChar.energyPool.staminaRegenRateProp.get(src.properties), dest.properties);
            }
            if (srcChar.energyPool.maxEnergyProp && destChar.energyPool.maxEnergyProp) {
              destChar.energyPool.maxEnergyProp.set(srcChar.energyPool.maxEnergyProp.get(src.properties), dest.properties);
            }
            if (srcChar.energyPool.muscleEfficiencyProp && destChar.energyPool.muscleEfficiencyProp) {
              destChar.energyPool.muscleEfficiencyProp.set(srcChar.energyPool.muscleEfficiencyProp.get(src.properties), dest.properties);
            }
            destChar.energyPool.infiniteEnergy = srcChar.energyPool.infiniteEnergy;
            destChar.energyPool.debugAutoRefillOnEmpty = srcChar.energyPool.debugAutoRefillOnEmpty;
          } else {
            destChar.energyPool = null;
          }
        }
        break;

      case "damageAura":
        if (src.damageAuraModule) {
          if (!dest.damageAuraModule) dest.damageAuraModule = new DamageAuraModule();
          dest.damageAuraModule.enabled = src.damageAuraModule.enabled;
          dest.damageAuraModule.damageRadiusProp.set(src.damageAuraModule.damageRadiusProp.get(src.properties), dest.properties);
          dest.damageAuraModule.damageRateProp.set(src.damageAuraModule.damageRateProp.get(src.properties), dest.properties);
        } else {
          dest.damageAuraModule = null;
        }
        break;

      case "damageSolver":
        if (src.damageSolverModule) {
          if (!dest.damageSolverModule) dest.damageSolverModule = new DamageSolverModule();
          dest.damageSolverModule.enabled = src.damageSolverModule.enabled;
          dest.damageSolverModule.impactSusceptibilityProp.set(src.damageSolverModule.impactSusceptibilityProp.get(src.properties), dest.properties);
          dest.damageSolverModule.piercingMultiplierProp.set(src.damageSolverModule.piercingMultiplierProp.get(src.properties), dest.properties);
          dest.damageSolverModule.damageThresholdHpProp.set(src.damageSolverModule.damageThresholdHpProp.get(src.properties), dest.properties);
          dest.damageSolverModule.selfImpactWeightProp.set(src.damageSolverModule.selfImpactWeightProp.get(src.properties), dest.properties);
        } else {
          dest.damageSolverModule = null;
        }
        break;

      case "energyGrowth":
        if (destChar) {
          if (srcChar?.energyGrowthModule) {
            destChar.energyGrowthModule = new EnergyGrowthModule(srcChar.energyGrowthModule.toConfig());
          } else {
            destChar.energyGrowthModule = null;
          }
        }
        break;

      case "vomit":
        if (destChar) {
          if (srcChar?.vomitModule) {
            destChar.vomitModule = new VomitModule(srcChar.vomitModule.toConfig(srcChar.properties));
          } else {
            destChar.vomitModule = null;
          }
        }
        break;
    }
  }
}

