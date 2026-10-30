import type { Character } from "../../character/Character.js";
import type { Vector2D } from "../../engine/GameObject.js";
import type { ControlExecutionContext } from "./ControlSchemaTypes.js";

export interface ActionDefinition {
  id: string; // e.g. "releaseThrow"
  label: string; // e.g. "Release Throw"
  description: string;
  recommendedMode?: "press" | "hold" | "release";
  execute: (ctx: ControlExecutionContext, args?: Record<string, any>) => void;
  stop?: (ctx: ControlExecutionContext) => void;
}

export interface ModuleActionCategory {
  id: string; // e.g. "laser"
  label: string; // e.g. "⚡ Laser Module"
  icon: string;
  requiredModule?: string; // e.g. "laserModule"
  isAttached: (char: Character) => boolean;
  actions: ActionDefinition[];
}

export class ControlActionCatalog {
  public static readonly categories: ModuleActionCategory[] = [
    // 1. Locomotion
    {
      id: "locomotion",
      label: "Locomotion & Mobility",
      icon: "🏃",
      requiredModule: "walkingModule",
      isAttached: (char: Character) => Boolean(char.walkingModule && char.walkingModule.enabled),
      actions: [
        {
          id: "jump",
          label: "Jump (Impulse)",
          description: "Performs a vertical physical takeoff jump",
          recommendedMode: "press",
          execute: (ctx) => {
            if (ctx.character.jumpModule) {
              ctx.character.jump();
            }
          },
        },
        {
          id: "toggleSprint",
          label: "Toggle Sprint",
          description: "Toggles sprinting locomotion state",
          recommendedMode: "press",
          execute: (ctx) => {
            ctx.character.setSprinting(!ctx.character.isSprinting);
          },
        },
        {
          id: "holdSprint",
          label: "Hold Sprint",
          description: "Sprints while trigger is held down",
          recommendedMode: "hold",
          execute: (ctx) => {
            ctx.character.setSprinting(true);
          },
          stop: (ctx) => {
            ctx.character.setSprinting(false);
          },
        },
      ],
    },

    // 2. Climbing
    {
      id: "climbing",
      label: "Wall Climbing",
      icon: "🧗",
      requiredModule: "climbingModule",
      isAttached: (char: Character) => Boolean(char.climbingModule && char.climbingModule.enabled),
      actions: [
        {
          id: "mountOrClimb",
          label: "Mount / Hold Wall",
          description: "Mounts and climbs wall when touching a climbable edge",
          recommendedMode: "hold",
          execute: (ctx) => {
            if (ctx.character.climbingModule && !ctx.character.isClimbing) {
              ctx.character.isClimbing = true;
            }
          },
          stop: (ctx) => {
            if (ctx.character.climbingModule) {
              ctx.character.isClimbing = false;
            }
          },
        },
      ],
    },

    // 3. Throwing
    {
      id: "throw",
      label: "Throwing & Trajectory",
      icon: "🎯",
      requiredModule: "throwModule",
      isAttached: (char: Character) => Boolean(char.throwModule && char.throwModule.enabled),
      actions: [
        {
          id: "aimThrow",
          label: "Aim Throw Trajectory",
          description: "Shows anticipatory parabolic trajectory while held",
          recommendedMode: "hold",
          execute: (ctx) => {
            if (ctx.character.heldObject) {
              ctx.character.isAimingTrajectory = true;
            }
          },
          stop: (ctx) => {
            ctx.character.isAimingTrajectory = false;
          },
        },
        {
          id: "releaseThrow",
          label: "Release Throw",
          description: "Throws held item along trajectory to aim position",
          recommendedMode: "release",
          execute: (ctx) => {
            if (ctx.character.heldObject && ctx.character.throwModule && ctx.arena) {
              const aim = ctx.mouseAimPos || ctx.reticleAimPos;
              ctx.character.throwModule.throwHeldObject(ctx.character, aim.x, aim.y, ctx.arena);
            }
          },
        },
      ],
    },

    // 4. Grabbing & Pickup
    {
      id: "pickup",
      label: "Grabbing & Pickup",
      icon: "✋",
      requiredModule: "pickupModule",
      isAttached: (char: Character) => Boolean(char.pickupModule && char.pickupModule.enabled),
      actions: [
        {
          id: "pickupReach",
          label: "Pick Up / Grab Object",
          description: "Picks up the target object currently within reach",
          recommendedMode: "press",
          execute: (ctx) => {
            if (!ctx.character.heldObject && ctx.targetInReach && ctx.character.pickupModule) {
              ctx.character.pickupModule.pickup(ctx.character, ctx.targetInReach);
            }
          },
        },
        {
          id: "dropItem",
          label: "Drop Held Object",
          description: "Gently drops the held object onto the ground",
          recommendedMode: "press",
          execute: (ctx) => {
            if (ctx.character.heldObject) {
              ctx.character.unhold();
            }
          },
        },
        {
          id: "swap",
          label: "Swap Item",
          description: "Drops currently held item and picks up the selected item (excluding the dropped item)",
          recommendedMode: "press",
          execute: (ctx) => {
            const pickupMod = ctx.character.pickupModule;
            if (!pickupMod) return;
            const char = ctx.character;
            const dropped = char.heldObject;
            if (dropped) {
              pickupMod.drop(char);
            }
            const target = ctx.targetInReach && ctx.targetInReach !== dropped ? ctx.targetInReach : null;
            if (target) {
              pickupMod.pickup(char, target);
            } else if ((ctx as any).candidateEntities && ctx.arena) {
              const aim = ctx.mouseAimPos || ctx.reticleAimPos;
              const candidates = ((ctx as any).candidateEntities as any[]).filter((e) => e !== dropped && e.colliderModule);
              pickupMod.pickupAndSwap(char, candidates, ctx.arena.wallHeight, aim?.x, aim?.y);
            }
          },
        },
      ],
    },

    // 4. Laser Module
    {
      id: "laser",
      label: "Laser Beam",
      icon: "⚡",
      requiredModule: "laserModule",
      isAttached: (char: Character) => Boolean(char.laserModule && char.laserModule.enabled),
      actions: [
        {
          id: "fireLaser",
          label: "Fire Laser (Held)",
          description: "Fires continuous directed laser beam towards aim cursor",
          recommendedMode: "hold",
          execute: (ctx) => {
            if (ctx.character.laserModule) {
              ctx.character.isLaserAiming = true;
              ctx.character.isLaserFiring = true;
              ctx.character.laserModule.isAiming = true;
              ctx.character.laserModule.isFiring = true;
            }
          },
          stop: (ctx) => {
            if (ctx.character.laserModule) {
              ctx.character.isLaserFiring = false;
              ctx.character.isLaserAiming = false;
              ctx.character.laserModule.isFiring = false;
              ctx.character.laserModule.isAiming = false;
            }
          },
        },
        {
          id: "aimLaser",
          label: "Aim Laser Reticle",
          description: "Shows laser aiming guide without firing energy",
          recommendedMode: "hold",
          execute: (ctx) => {
            if (ctx.character.laserModule) {
              ctx.character.isLaserAiming = true;
              ctx.character.laserModule.isAiming = true;
            }
          },
          stop: (ctx) => {
            if (ctx.character.laserModule) {
              ctx.character.isLaserAiming = false;
              ctx.character.laserModule.isAiming = false;
            }
          },
        },
      ],
    },

    // 5. Melee Module
    {
      id: "melee",
      label: "Melee Punch",
      icon: "🥊",
      requiredModule: "meleeModule",
      isAttached: (char: Character) => Boolean(char.meleeModule && char.meleeModule.enabled),
      actions: [
        {
          id: "punch",
          label: "Directional Punch",
          description: "Executes a fast physical punch in the facing or aim direction",
          recommendedMode: "press",
          execute: (ctx) => {
            if (ctx.character.meleeModule) {
              const aim = ctx.mouseAimPos || ctx.reticleAimPos;
              const dir: Vector2D = aim
                ? { x: aim.x - ctx.character.position.x, y: aim.y - ctx.character.position.y }
                : { x: Math.cos(ctx.facingAngle), y: Math.sin(ctx.facingAngle) };
              const len = Math.hypot(dir.x, dir.y);
              const normDir = len > 0.001 ? { x: dir.x / len, y: dir.y / len } : { x: 1, y: 0 };
              ctx.character.isMeleeRequested = true;
              ctx.character.meleeAimDir = normDir;
            }
          },
        },
      ],
    },

    // 6. Held Item Abilities
    {
      id: "heldItem",
      label: "Held Item Abilities",
      icon: "✨",
      isAttached: (char: Character) => Boolean(char.pickupModule && char.pickupModule.enabled),
      actions: [
        {
          id: "primaryItemAbility",
          label: "Primary Item Ability",
          description: "Uses the primary ability of the held item (e.g. consuming food or activating tools)",
          recommendedMode: "hold",
          execute: (ctx) => {
            if (ctx.character.heldObject) {
              ctx.character.isUsingItem = true;
            }
          },
          stop: (ctx) => {
            ctx.character.isUsingItem = false;
          },
        },
      ],
    },

    // 7. Control Staging
    {
      id: "staging",
      label: "Stage",
      icon: "🎭",
      isAttached: () => true, // Always available
      actions: [
        {
          id: "setStage",
          label: "Set Stage",
          description: "Sets the active stage state to a chosen stage value",
          recommendedMode: "press",
          execute: (ctx, args) => {
            const targetStage = args?.stage || "none";
            ctx.character.stagedAction = targetStage;
          },
        },
      ],
    },
  ];

  public static findAction(moduleId: string, intent: string): ActionDefinition | undefined {
    // Backward compatibility alias: throwPickup -> throw or pickup
    if (moduleId === "throwPickup") {
      if (intent === "pickupReach" || intent === "dropItem") {
        moduleId = "pickup";
      } else {
        moduleId = "throw";
      }
    }
    // Backward compatibility alias: consume.eatHeldItem -> heldItem.primaryItemAbility
    if ((moduleId === "consume" || moduleId === "heldItem") && (intent === "eatHeldItem" || intent === "primaryItemAbility")) {
      const heldCat = this.categories.find((c) => c.id === "heldItem");
      const action = heldCat?.actions.find((a) => a.id === "primaryItemAbility");
      if (action) return action;
    }
    const cat = this.categories.find((c) => c.id === moduleId);
    return cat?.actions.find((a) => a.id === intent);
  }

  public static getCategorizedForCharacter(char: Character): {
    attached: ModuleActionCategory[];
    unattached: ModuleActionCategory[];
  } {
    const attached: ModuleActionCategory[] = [];
    const unattached: ModuleActionCategory[] = [];

    for (const cat of this.categories) {
      if (cat.isAttached(char)) {
        attached.push(cat);
      } else {
        unattached.push(cat);
      }
    }

    return { attached, unattached };
  }
}
