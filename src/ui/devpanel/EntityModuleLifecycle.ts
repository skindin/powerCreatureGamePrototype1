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
import type { DevPanel } from "../DevPanel.js";

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
}

