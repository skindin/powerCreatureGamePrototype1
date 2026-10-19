import { DynamicProperty } from "../engine/properties/DynamicProperty.js";
import type { ObjectPropertiesRegistry } from "../engine/properties/DynamicProperty.js";
import type { Character } from "./Character.js";
import type { Arena } from "../engine/Arena.js";
import type { GameObject } from "../engine/GameObject.js";

export interface MeleeModuleOptions {
  maxForce?: number;
  punchFrequency?: number;
  reach?: number;
  width?: number;
  energyBusId?: string;
  allowPartialPower?: boolean;
  enabled?: boolean;
}

export interface MeleeHitResult {
  hitTargets: GameObject[];
  actualForce: number;
  energySpentJoules: number;
  recoilVx: number;
  recoilVy: number;
}

/**
 * MeleeModule
 *
 * Implements a high-energy physics-based burst melee attack.
 * - Triggered via X key (Keyboard) or X button (Gamepad) in character facing direction.
 * - Creates an oriented rectangle of effect (reach x width) aligned along character's facing direction.
 * - Energy cost is calculated from the mechanical work needed to accelerate and deliver the attack force:
 *   Work = Force * reach / muscleEfficiency.
 * - Draws burst energy directly from the main energy bus (bus_main).
 * - Applies Newton's third law mutual momentum exchange (knockback and attacker recoil) taking into account
 *   entity masses, while ground friction decelerates both bodies post-impact.
 * - Converts force into deceleration shock (F / mass) dispatched to the target's DamageSolverModule,
 *   scaling damage by the target's impact susceptibility multiplier.
 */
export class MeleeModule {
  public id = "melee_attack";
  public name = "Melee Attack";
  public enabled = true;

  /** Maximum peak force (Newtons) delivered by a full punch */
  public maxForceProp: DynamicProperty;
  /** Punches per second (Hz) */
  public punchFrequencyProp: DynamicProperty;
  /** Forward length of the rectangular attack zone (world units / meters) */
  public reachProp: DynamicProperty;
  /** Perpendicular width of the rectangular attack zone (world units / meters) */
  public widthProp: DynamicProperty;

  /** Energy Bus to draw burst energy from */
  public energyBusId: string = "bus_main";
  /** Whether to allow punches at partial force when the bus cannot grant 100% burst energy */
  public allowPartialPower: boolean = true;

  /** Time of last punch execution (performance.now ms) */
  public lastPunchTime: number = 0;
  /** Visual indicator state: timestamp of recent punch for rendering strike effect */
  public lastVisualPunchTime: number = 0;
  public lastVisualPunchDir: { x: number; y: number } = { x: 1, y: 0 };
  public lastVisualPunchReach: number = 1.2;
  public lastVisualPunchWidth: number = 0.8;

  constructor(options?: MeleeModuleOptions) {
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.energyBusId) this.energyBusId = options.energyBusId;
    if (options?.allowPartialPower !== undefined) this.allowPartialPower = options.allowPartialPower;

    this.maxForceProp = new DynamicProperty(options?.maxForce ?? 350.0);
    this.punchFrequencyProp = new DynamicProperty(options?.punchFrequency ?? 4.0);
    this.reachProp = new DynamicProperty(options?.reach ?? 1.2);
    this.widthProp = new DynamicProperty(options?.width ?? 0.8);
  }

  public get maxForce(): number {
    return this.maxForceProp.literalValue;
  }
  public set maxForce(val: number) {
    this.maxForceProp.literalValue = val;
  }

  public get punchFrequency(): number {
    return this.punchFrequencyProp.literalValue;
  }
  public set punchFrequency(val: number) {
    this.punchFrequencyProp.literalValue = val;
  }

  public get reach(): number {
    return this.reachProp.literalValue;
  }
  public set reach(val: number) {
    this.reachProp.literalValue = val;
  }

  public get width(): number {
    return this.widthProp.literalValue;
  }
  public set width(val: number) {
    this.widthProp.literalValue = val;
  }

  public getMaxForce(registry?: ObjectPropertiesRegistry): number {
    return Math.max(1.0, this.maxForceProp.get(registry));
  }

  public getPunchFrequency(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0.1, this.punchFrequencyProp.get(registry));
  }

  public getReach(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0.1, this.reachProp.get(registry));
  }

  public getWidth(registry?: ObjectPropertiesRegistry): number {
    return Math.max(0.1, this.widthProp.get(registry));
  }

  /**
   * Checks whether the cooldown interval between punches has elapsed.
   */
  public canPunchNow(now: number, registry?: ObjectPropertiesRegistry): boolean {
    const freq = this.getPunchFrequency(registry);
    const cooldownMs = (1.0 / freq) * 1000.0;
    return (now - this.lastPunchTime) >= cooldownMs;
  }

  /**
   * Executes a melee strike from the attacker along the given normalized direction vector.
   */
  public executePunch(
    attacker: Character,
    dirX: number,
    dirY: number,
    potentialTargets: GameObject[],
    _arena: Arena,
    now: number = performance.now()
  ): MeleeHitResult | null {
    if (!this.enabled) return null;
    if (!this.canPunchNow(now, attacker.properties)) return null;

    const registry = attacker.properties;
    const maxForce = this.getMaxForce(registry);
    const reach = this.getReach(registry);
    const width = this.getWidth(registry);

    // Normalize attack direction
    const dirMag = Math.hypot(dirX, dirY);
    let uX = 1;
    let uY = 0;
    if (dirMag > 0.001) {
      uX = dirX / dirMag;
      uY = dirY / dirMag;
    } else {
      const facing = attacker.facingAngle ?? 0;
      uX = Math.cos(facing);
      uY = Math.sin(facing);
    }

    // 1. Calculate Burst Energy Cost from physical work
    // Work = Force * distance. With biological muscle efficiency (0.25 default), demandedJoules = W / efficiency.
    const muscleEff = registry?.get("muscleEfficiency") ?? 0.25;
    const mechanicalWorkJoules = maxForce * reach;
    const demandedJoules = mechanicalWorkJoules / Math.max(0.01, muscleEff);

    const bus = attacker.energyBusses.get(this.energyBusId) || attacker.energyBus;
    let actualForce = maxForce;
    let energySpent = 0;

    if (bus) {
      if (bus.isExhausted) {
        return null; // Denied when exhausted
      }

      const burstRes = bus.requestInstantBurst({
        abilityId: "melee",
        demandedJoules,
        allowPartialPower: this.allowPartialPower,
        pool: attacker.energyPool,
        registry,
      });

      if (!burstRes.granted || burstRes.fraction <= 0.001) {
        return null;
      }
      actualForce = maxForce * burstRes.fraction;
      energySpent = burstRes.grantedJoules;
    }

    this.lastPunchTime = now;
    this.lastVisualPunchTime = now;
    this.lastVisualPunchDir = { x: uX, y: uY };
    this.lastVisualPunchReach = reach;
    this.lastVisualPunchWidth = width;

    // 2. Identify all candidate targets inside the oriented bounding rectangle (OBB)
    // The rectangle starts at attacker position (plus small offset) and extends forward by `reach`,
    // with perpendicular thickness `width` (-width/2 to +width/2).
    const perpX = -uY;
    const perpY = uX;
    const startX = attacker.position.x;
    const startY = attacker.position.y;
    const halfWidth = width * 0.5;

    const hitTargets: GameObject[] = [];

    for (const obj of potentialTargets) {
      if (obj === attacker) continue;
      if ((obj as any).isDead) continue;
      // If object is being held by this attacker, don't punch it
      if (attacker.heldObject === obj) continue;

      const objRadius = obj.colliderRadius > 0 ? obj.colliderRadius : 0.3;
      const dx = obj.position.x - startX;
      const dy = obj.position.y - startY;

      // Project onto forward direction (longitudinal distance)
      const forwardProj = dx * uX + dy * uY;
      // Project onto perpendicular direction (lateral distance)
      const lateralProj = dx * perpX + dy * perpY;

      // Check within longitudinal range [0, reach + objRadius] and lateral range [-halfWidth - objRadius, halfWidth + objRadius]
      if (
        forwardProj >= -objRadius * 0.5 &&
        forwardProj <= (reach + objRadius) &&
        Math.abs(lateralProj) <= (halfWidth + objRadius)
      ) {
        // Vertical altitude check: ensure punch reaches the target's height
        const attackerZ = attacker.position.z;
        const targetZ = obj.position.z;
        const targetHeight = (obj as any).height ?? (obj.colliderRadius * 2);
        if (targetZ + targetHeight >= attackerZ - 0.2 && targetZ <= attackerZ + 1.5) {
          hitTargets.push(obj);
        }
      }
    }

    // 3. Physical Impulse & Knockback Exchange
    // Contact impulse duration dt (stroke contact time): approx 0.05 seconds
    const contactDt = 0.05;
    const totalImpulse = actualForce * contactDt;

    // Recoil on attacker (Newton's 3rd law applied when striking targets)
    let recoilVx = 0;
    let recoilVy = 0;

    if (hitTargets.length > 0) {
      const impulsePerTarget = totalImpulse / hitTargets.length;
      const attackerMass = Math.max(0.2, attacker.mass);

      for (const target of hitTargets) {
        const targetMass = Math.max(0.2, target.mass);

        // Target knockback: Delta v = J / mass
        const targetDv = impulsePerTarget / targetMass;
        if (target.rigidbodyModule && target.rigidbodyModule.enabled) {
          target.velocity.x += uX * targetDv;
          target.velocity.y += uY * targetDv;
        } else {
          // If entity has simple velocity property
          target.velocity.x = (target.velocity.x ?? 0) + uX * targetDv;
          target.velocity.y = (target.velocity.y ?? 0) + uY * targetDv;
        }

        // Apply HP damage via target's DamageSolverModule (factors in impactSusceptibility and damageThresholdHp)
        const shockDeceleration = actualForce / targetMass;
        target.dispatchImpact({
          absorbedShock: shockDeceleration,
          impactSpeed: targetDv,
          otherEntity: attacker,
          normalX: -uX,
          normalY: -uY,
        });

        // Accumulate recoil impulse on attacker
        const recoilDv = impulsePerTarget / attackerMass;
        recoilVx -= uX * recoilDv;
        recoilVy -= uY * recoilDv;
      }

      // Apply attacker recoil momentum
      if (attacker.rigidbodyModule && attacker.rigidbodyModule.enabled) {
        attacker.velocity.x += recoilVx;
        attacker.velocity.y += recoilVy;
      } else {
        attacker.velocity.x += recoilVx;
        attacker.velocity.y += recoilVy;
      }
    }

    return {
      hitTargets,
      actualForce,
      energySpentJoules: energySpent,
      recoilVx,
      recoilVy,
    };
  }
}
