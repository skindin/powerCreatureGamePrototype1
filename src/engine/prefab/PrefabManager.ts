import { GameObject } from "../GameObject.js";
import { ConsumableModule } from "../ConsumableModule.js";
import { RollModule } from "../RollModule.js";
import { GunModule } from "../GunModule.js";
import { RollMovementModule } from "../../character/RollMovementModule.js";
import { WalkingModule } from "../../character/WalkingModule.js";
import { LocomotionStanceModule } from "../../character/LocomotionStanceModule.js";
import { EnergyGrowthModule } from "../../character/EnergyGrowthModule.js";
import { VomitModule } from "../../character/VomitModule.js";
import { Prefab } from "./Prefab.js";
import { Arena } from "../Arena.js";
import { Character } from "../../character/Character.js";
import {
  SerializedPrefabConfig,
  SerializedCharacterConfig,
  deserializeGameObject,
  serializePrefab,
  applyCharacterConfig,
} from "../../config/WorldConfig.js";
import {
  DefaultControlSchema,
  SpeedBallControlSchema,
  HunterControlSchema,
  GamepadHybridSchema,
} from "../../input/schema/presets/DefaultControlSchemas.js";

export class PrefabManager {
  private prefabs: Map<string, Prefab> = new Map();
  private onPrefabChangedCallbacks: Set<() => void> = new Set();

  constructor() {
    this.initDefaultPrefabs();
  }

  private initDefaultPrefabs(): void {
    // 🍏 Default "Apple" food prefab matching original green apple stats
    const appleArchetype = new GameObject({
      id: "archetype_apple",
      name: "Apple",
      position: { x: 0, y: 0, z: 0 },
      color: "#22c55e",
      visualShape: "circle",
      mass: 0.35,
      colliderRadius: 0.25,
      bounceMod: 0.2,
      hasGravity: true,
      hasVerticalPosition: true,
      consumableModule: new ConsumableModule({
        tag: "food",
        totalEnergyJoules: 4000,
        remainingEnergyJoules: 4000,
        consumeRateWatts: 800,
        healRate: 0,
        minScaleFloor: 0.35,
        minRadiusFloor: 0.12,
      }),
    });

    const applePrefab = new Prefab({
      id: "prefab_apple",
      name: "Apple",
      icon: "🍏",
      archetype: appleArchetype,
    });

    this.prefabs.set(applePrefab.id, applePrefab);

    // 💖 King of the Hill "Super Apple" prefab: unlimited hot pink apple yielding 2,000 J/sec
    const superAppleArchetype = new GameObject({
      id: "archetype_super_apple",
      name: "Super Apple",
      position: { x: 0, y: 0, z: 0 },
      color: "#ff1493",
      visualShape: "circle",
      mass: 0.45,
      colliderRadius: 0.30,
      bounceMod: 0.2,
      hasGravity: true,
      hasVerticalPosition: true,
      consumableModule: new ConsumableModule({
        tag: "food",
        unlimited: true,
        totalEnergyJoules: 10000,
        remainingEnergyJoules: 10000,
        consumeRateWatts: 2000,
        healRate: 0,
        minScaleFloor: 1.0,
        minRadiusFloor: 0.30,
      }),
    });

    const superApplePrefab = new Prefab({
      id: "prefab_super_apple",
      name: "Super Apple",
      icon: "💖",
      archetype: superAppleArchetype,
    });

    this.prefabs.set(superApplePrefab.id, superApplePrefab);

    // 🪨 Default "Stone" prefab: dense, rigid rock with low bounce that inflicts high impact damage when thrown
    const stoneArchetype = new GameObject({
      id: "archetype_stone",
      name: "Stone",
      position: { x: 0, y: 0, z: 0 },
      color: "#78716c",
      visualShape: "circle",
      mass: 0.85,
      colliderRadius: 0.22,
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      rollModule: new RollModule({
        rollResistance: 0.45,
        bumpyRollEnabled: true,
        bumpiness: 0.28,
      }),
    });

    const stonePrefab = new Prefab({
      id: "prefab_stone",
      name: "Stone",
      icon: "🪨",
      archetype: stoneArchetype,
    });

    this.prefabs.set(stonePrefab.id, stonePrefab);

    // ⚡ "Rapid Blaster" Gun prefab: high fire rate automatic blaster
    const blasterArchetype = new GameObject({
      id: "archetype_blaster",
      name: "Rapid Blaster",
      position: { x: 0, y: 0, z: 0 },
      color: "#0284c7",
      visualShape: "box",
      mass: 0.55,
      colliderRadius: 0.22,
      bounceMod: 0.15,
      hasGravity: true,
      hasVerticalPosition: true,
      gunModule: new GunModule({
        fireRate: 10.0,
        damagePerBullet: 12.0,
        bulletSpeed: 28.0,
        firingSeconds: 3.0,
        cooldownTime: 1.8,
        cooldownDelay: 0.4,
        bulletMass: 0.04,
        gunLength: 0.60,
        gunWidth: 0.24,
        bulletColor: "#38bdf8",
      }),
    });

    const blasterPrefab = new Prefab({
      id: "prefab_blaster",
      name: "Rapid Blaster",
      icon: "⚡",
      archetype: blasterArchetype,
    });
    this.prefabs.set(blasterPrefab.id, blasterPrefab);

    // 🐐 Default "Laser Goat" character prefab
    const playerArchetype = new Character({
      id: "archetype_player",
      name: "Laser Goat",
      color: "#f59e0b",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
    });
    playerArchetype.bounceMod = 0.15;

    const playerPrefab = new Prefab({
      id: "prefab_player",
      name: "Laser Goat",
      icon: "🐐",
      archetype: playerArchetype,
    });

    playerArchetype.controlSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    playerPrefab.controlSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    this.prefabs.set(playerPrefab.id, playerPrefab);

    // ⚡ Default "Speed Ball" character prefab
    const speedBallArchetype = new Character({
      id: "archetype_speed_ball",
      name: "Speed Ball",
      color: "#38bdf8",
      colliderRadius: 0.44,
      mass: 1.2,
      strength: 1.0,
    });
    speedBallArchetype.bounceMod = 0.85;
    if (speedBallArchetype.bounceModule) {
      speedBallArchetype.bounceModule.bounceMod = 0.85;
      speedBallArchetype.bounceModule.verticalBounce = true;
    }
    speedBallArchetype.walkingModule = new WalkingModule({
      walkConsumesEnergy: false,
      walkAllowPartialPower: false,
      sprintConsumesEnergy: true,
      sprintAllowPartialPower: true,
    });
    speedBallArchetype.laserModule = null;
    speedBallArchetype.rollModule = new RollModule({
      rollResistance: 0.08,
      bumpyRollEnabled: false,
      bumpiness: 0,
    });
    speedBallArchetype.rollMovementModule = new RollMovementModule({
      baseAcceleration: 22.0,
      sprintAcceleration: 45.0,
      maxRollSpeed: 18.0,
      maxSprintSpeed: 32.0,
      freeRollResistance: 0.08,
      brakeRollResistance: 2.5,
      rollConsumesEnergy: true,
      rollAllowPartialPower: true,
    });
    speedBallArchetype.rollMovementModule.registerProperties(speedBallArchetype.properties);
    speedBallArchetype.locomotionStanceModule = new LocomotionStanceModule({
      activeMode: "roll",
      supportedModes: ["roll", "walk"],
      canWalkWhileRolling: false,
      enabled: true,
    });

    speedBallArchetype.prefabId = "prefab_speed_ball";
    speedBallArchetype.controlSchema = JSON.parse(JSON.stringify(SpeedBallControlSchema));

    const speedBallPrefab = new Prefab({
      id: "prefab_speed_ball",
      name: "Speed Ball",
      icon: "⚡",
      archetype: speedBallArchetype,
      controlSchema: JSON.parse(JSON.stringify(SpeedBallControlSchema)),
    });
    this.prefabs.set(speedBallPrefab.id, speedBallPrefab);

    // Default "Hunter" character prefab (Mouse-Facing Drive + Left-Hand Staging)
    const hunterArchetype = new Character({
      id: "archetype_hunter",
      name: "Hunter",
      color: "#06b6d4",
      colliderRadius: 0.44,
      mass: 1.1,
      strength: 1.2,
    });
    hunterArchetype.controlSchema = JSON.parse(JSON.stringify(HunterControlSchema));

    const hunterPrefab = new Prefab({
      id: "prefab_hunter",
      name: "Hunter",
      icon: "🏹",
      archetype: hunterArchetype,
      controlSchema: JSON.parse(JSON.stringify(HunterControlSchema)),
    });
    this.prefabs.set(hunterPrefab.id, hunterPrefab);

    // Default "Fighter" character prefab (Gamepad Hybrid - Reticle Steer)
    const fighterArchetype = new Character({
      id: "archetype_fighter",
      name: "Fighter",
      color: "#f43f5e",
      colliderRadius: 0.48,
      mass: 1.4,
      strength: 1.5,
    });
    fighterArchetype.controlSchema = JSON.parse(JSON.stringify(GamepadHybridSchema));

    const fighterPrefab = new Prefab({
      id: "prefab_fighter",
      name: "Fighter",
      icon: "🥊",
      archetype: fighterArchetype,
      controlSchema: JSON.parse(JSON.stringify(GamepadHybridSchema)),
    });
    this.prefabs.set(fighterPrefab.id, fighterPrefab);

    // 🧬 Default "Bio-Grower" character prefab (Scale With Energy + Projectile Vomit, Goat base stats, no climbing)
    const growerArchetype = new Character({
      id: "archetype_grower_character",
      name: "Bio-Grower",
      color: "#10b981",
      colliderRadius: 0.44,
      mass: 1.2,
    });
    growerArchetype.bounceMod = 0.15;
    growerArchetype.climbingModule = null;
    if (growerArchetype.energyPool) {
      growerArchetype.energyPool.maxEnergyJoules = 20000;
      growerArchetype.energyPool.currentEnergyJoules = 6667;
      growerArchetype.energyPool.staminaCapacityJoules = 10000;
      growerArchetype.energyPool.staminaRegenRateWatts = 1000;
      growerArchetype.energyPool.currentStaminaJoules = 5000;
    }
    growerArchetype.energyGrowthModule = new EnergyGrowthModule({
      enabled: true,
      minScaleMultiplier: 0.5,
      maxScaleMultiplier: 2.0,
      startingScaleMultiplier: 1.0,
      scaleMass: true,
      scaleCollider: true,
      scaleSprite: true,
      autoScaleReachWithCollider: true,
      baseValues: {
        mass: 1.2,
        colliderRadius: 0.44,
        pickupReach: 1.3,
        "walk.maxWalkForce": 35,
        "walk.maxWalkSpeed": 5.2,
        "walk.maxSprintSpeed": 8.06,
        "walk.maxWalkPower": 300,
        "walk.maxSprintPower": 500,
        "jump.jumpStrength": 18.5,
        "jump.maxPower": 1200,
        "throw.maxPower": 1200,
        "throw.maxThrowSpeed": 69,
        "melee.maxForce": 350,
        "melee.maxPower": 500,
        "melee.reach": 1.2,
        "melee.width": 0.8,
        "laser.damageRate": 25,
        "laser.maxPower": 2000,
        "health.maxHealth": 100,
        "stamina.maxStamina": 10000,
        "stamina.regenRate": 1000,
      },
    });
    growerArchetype.vomitModule = new VomitModule({
      enabled: true,
      globEnergyJoules: 2000,
      launchSpeed: 11.0,
      cooldownSeconds: 0.35,
      globColor: "#84cc16",
      consumeRateWatts: 1000,
    });
    growerArchetype.prefabId = "prefab_grower_character";

    const growerSchema = JSON.parse(JSON.stringify(DefaultControlSchema));
    if (growerSchema.keyboardMouse?.blocks) {
      growerSchema.keyboardMouse.blocks = growerSchema.keyboardMouse.blocks.filter(
        (b: any) => b.type !== "vomit"
      );
      growerSchema.keyboardMouse.blocks.push({
        id: "block-vomit",
        type: "vomit",
        name: "Throw Up / Vomit",
        enabled: true,
        mode: "holdAndRelease",
        chargeTrigger: { code: "MouseLeft", gateButtons: ["AltLeft"], requireCleanPress: true },
        aimTrigger: { code: "AltLeft", requireCleanPress: false },
        fireTrigger: { code: "MouseLeft", requireCleanPress: true },
        quickTrigger: { code: "MouseLeft", gateButtons: ["AltLeft"], requireCleanPress: true },
        cancelTrigger: { code: "KeyX", requireCleanPress: true },
        arcModulation: { source: "mouseDeltaY", autoCursorLock: true, sensitivity: 0.005 },
        enableProximityCancel: true,
        cancelRadius: 1.5,
      });
    }
    if (growerSchema.gamepad?.blocks) {
      growerSchema.gamepad.blocks = growerSchema.gamepad.blocks.filter(
        (b: any) => b.type !== "vomit"
      );
      growerSchema.gamepad.blocks.push({
        id: "block-vomit-gp",
        type: "vomit",
        name: "Throw Up / Vomit",
        enabled: true,
        mode: "holdAndRelease",
        chargeTrigger: { code: "GamepadRT", gateButtons: ["GamepadLT"], requireCleanPress: true },
        aimTrigger: { code: "GamepadLT", requireCleanPress: false },
        fireTrigger: { code: "GamepadRT", requireCleanPress: true },
        quickTrigger: { code: "GamepadRT", gateButtons: ["GamepadLT"], requireCleanPress: true },
        cancelTrigger: { code: null, requireCleanPress: true },
        triggerMargin: 0.15,
        arcModulation: { source: "none", autoCursorLock: false, sensitivity: 0.005 },
        enableProximityCancel: true,
        cancelRadius: 1.5,
      });
    }
    growerArchetype.controlSchema = growerSchema;

    const growerPrefab = new Prefab({
      id: "prefab_grower_character",
      name: "Bio-Grower",
      icon: "🧬",
      archetype: growerArchetype,
      controlSchema: JSON.parse(JSON.stringify(growerSchema)),
    });
    this.prefabs.set(growerPrefab.id, growerPrefab);
  }

  public getAll(): Prefab[] {
    return Array.from(this.prefabs.values());
  }

  public get(id: string): Prefab | undefined {
    return this.prefabs.get(id);
  }

  /**
   * Loads or updates prefab definitions from serialized world configuration.
   */
  public loadFromConfig(configs: SerializedPrefabConfig[]): void {
    if (!configs || !Array.isArray(configs)) return;
    this.prefabs.clear();
    this.initDefaultPrefabs();
    for (const cfg of configs) {
      if (!cfg || !cfg.id || !cfg.archetype) continue;
      const arc = cfg.archetype as any;
      const isCharacterConfig =
        cfg.id === "prefab_player" ||
        cfg.id === "prefab_speed_ball" ||
        cfg.id === "prefab_hunter" ||
        cfg.id === "prefab_fighter" ||
        cfg.id === "prefab_grower_character" ||
        Boolean(arc.walkingModule || arc.jumpModule || arc.rollMovementModule || arc.energyGrowthModule || arc.vomitModule || arc.isCharacter);

      let archetype: GameObject;
      if (isCharacterConfig) {
        const char = new Character({
          id: arc.id || `archetype_${cfg.id}`,
          name: arc.name || cfg.name,
          color: arc.color || "#f59e0b",
          colliderRadius: arc.colliderRadius ?? 0.44,
          mass: arc.mass ?? 1.2,
          strength: arc.strength ?? 1.0,
        });
        char.prefabId = cfg.id;
        applyCharacterConfig(char, arc as SerializedCharacterConfig);
        archetype = char;
      } else {
        archetype = deserializeGameObject(cfg.archetype as any);
      }

      const schemaToUse = cfg.controlSchema || (archetype instanceof Character ? archetype.controlSchema : undefined);

      const prefab = new Prefab({
        id: cfg.id,
        name: cfg.name,
        icon: cfg.icon,
        archetype,
        controlSchema: schemaToUse,
      });
      this.prefabs.set(cfg.id, prefab);
    }
    this.notifyChanged();
  }

  public exportAll(): SerializedPrefabConfig[] {
    return Array.from(this.prefabs.values()).map(serializePrefab);
  }

  /**
   * Creates a new Prefab from an existing scene GameObject.
   * Links the source entity to the new prefab as its first instance.
   */
  public createFromEntity(entity: GameObject, name?: string): Prefab {
    const id = `prefab_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const prefabName = name || entity.name || "Custom Prefab";
    const icon = entity.gunModule ? "🔫" : (entity.consumableModule ? "🍎" : (entity.visualShape === "box" ? "📦" : "⚪"));

    // Clone the archetype
    const GameObjectClass = entity.constructor as any;
    let cloneConsumable: ConsumableModule | null = null;
    if (entity.consumableModule) {
      const src = entity.consumableModule;
      cloneConsumable = new ConsumableModule({
        tag: src.tag,
        totalEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        remainingEnergyJoules: src.totalEnergyJoulesProp.literalValue,
        consumeRateWatts: src.consumeRateWattsProp.literalValue,
        healRate: src.healRateProp.literalValue,
        minScaleFloor: src.minScaleFloor,
        minRadiusFloor: src.minRadiusFloor,
        unlimited: src.unlimited,
      });
      cloneConsumable.initialColliderRadius = src.initialColliderRadius;
    }

    let cloneRoll: RollModule | null = null;
    if (entity.rollModule) {
      const src = entity.rollModule;
      cloneRoll = new RollModule({
        enabled: src.enabled,
        rollResistance: src.rollResistance,
        bumpyRollEnabled: src.bumpyRollEnabled,
        bumpiness: src.bumpiness,
        seed: src.seed,
      });
    }

    let cloneGun: GunModule | null = null;
    if (entity.gunModule) {
      const src = entity.gunModule;
      cloneGun = new GunModule({
        enabled: src.enabled,
        fireRate: src.fireRateProp.literalValue,
        damagePerBullet: src.damagePerBulletProp.literalValue,
        bulletSpeed: src.bulletSpeedProp.literalValue,
        firingSeconds: src.firingSecondsProp.literalValue,
        cooldownTime: src.cooldownTimeProp.literalValue,
        bulletMass: src.bulletMassProp.literalValue,
        gunLength: src.gunLength,
        gunWidth: src.gunWidth,
        bulletColor: src.bulletColor,
      });
    }

    const archetype = new GameObjectClass({
      name: prefabName,
      position: { x: 0, y: 0, z: 0 },
      color: entity.color,
      visualShape: entity.visualShape,
      mass: entity.mass,
      colliderRadius: entity.consumableModule
        ? (entity.consumableModule.initialColliderRadius || entity.colliderRadius)
        : entity.colliderRadius,
      bounceMod: entity.bounceMod,
      hasGravity: entity.hasGravity,
      hasVerticalPosition: entity.hasVerticalPosition,
      consumableModule: cloneConsumable,
      rollModule: cloneRoll,
      gunModule: cloneGun,
    });

    const prefab = new Prefab({
      id,
      name: prefabName,
      icon,
      archetype,
      controlSchema: (entity instanceof Character && (entity as Character).controlSchema) ? JSON.parse(JSON.stringify((entity as Character).controlSchema)) : undefined,
    });

    this.prefabs.set(id, prefab);

    // Link source entity to this new prefab
    entity.prefabId = id;
    entity.overriddenProperties.clear();

    this.notifyChanged();
    return prefab;
  }

  /**
   * Instantiates a prefab into the scene.
   */
  public spawn(prefabId: string, pos?: Partial<{ x: number; y: number; z: number }>, arena?: Arena, objects?: GameObject[]): GameObject | null {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return null;
    const instance = prefab.instantiate(pos as any, arena);
    if (objects && !objects.includes(instance)) {
      objects.push(instance);
    }
    return instance;
  }

  /**
   * Deletes a prefab without deleting live instances.
   * Any live instances simply have their prefabId cleared.
   */
  public delete(prefabId: string, liveObjects?: GameObject[]): boolean {
    if (!this.prefabs.has(prefabId)) return false;
    this.prefabs.delete(prefabId);

    if (liveObjects) {
      for (const obj of liveObjects) {
        if (obj.prefabId === prefabId) {
          obj.prefabId = null;
          obj.overriddenProperties.clear();
        }
      }
    }

    this.notifyChanged();
    return true;
  }

  public onPrefabsChanged(cb: () => void): () => void {
    this.onPrefabChangedCallbacks.add(cb);
    return () => this.onPrefabChangedCallbacks.delete(cb);
  }

  private notifyChanged(): void {
    for (const cb of this.onPrefabChangedCallbacks) {
      cb();
    }
  }
}

export const prefabManager = new PrefabManager();
