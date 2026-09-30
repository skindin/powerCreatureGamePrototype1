import { GameObject } from "../GameObject.js";
import { Character } from "../../character/Character.js";


export interface EntitySnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  isHeld: boolean;
  heldById: string | null;
  isClimbing: boolean;
  isCharacter: boolean;
  facingAngle?: number;
  isSprinting?: boolean;
  standingWallId?: string | null;
  isSleeping?: boolean;
  angX?: number;
  angY?: number;
  angZ?: number;
}

export interface WorldSnapshot {
  tick: number;
  timestamp: number;
  entities: EntitySnapshot[];
}

export class SnapshotManager {
  /**
   * Captures the physical state of all entities at the given simulation tick.
   * If quantize is true, numbers are rounded to 4 decimals for network packets;
   * otherwise, exact 64-bit IEEE floats are retained for local rollback determinism.
   */
  public static capture(
    tick: number,
    characters: Character[],
    objects: GameObject[],
    quantize: boolean = false
  ): WorldSnapshot {
    const all = [...characters, ...objects];
    const entities: EntitySnapshot[] = all.map((e) => {
      const isChar = e.isCharacter;
      const char = isChar ? (e as any) : null;
      const roll = e.rollModule;

      return {
        id: e.id,
        name: e.name,
        x: quantize ? Number(e.position.x.toFixed(4)) : e.position.x,
        y: quantize ? Number(e.position.y.toFixed(4)) : e.position.y,
        z: quantize ? Number(e.position.z.toFixed(4)) : e.position.z,
        vx: quantize ? Number(e.velocity.x.toFixed(4)) : e.velocity.x,
        vy: quantize ? Number(e.velocity.y.toFixed(4)) : e.velocity.y,
        vz: quantize ? Number(e.verticalVelocity.toFixed(4)) : e.verticalVelocity,
        isHeld: e.isHeld,
        heldById: e.heldBy ? e.heldBy.id : null,
        isClimbing: e.isClimbing,
        isCharacter: isChar,
        facingAngle: char ? char.facingAngle : undefined,
        isSprinting: char ? char.isSprinting : undefined,
        standingWallId: e.standingWall ? e.standingWall.id : null,
        isSleeping: e.isSleeping,
        angX: roll && roll.enabled ? (quantize ? Number(roll.angularVelocity.x.toFixed(4)) : roll.angularVelocity.x) : undefined,
        angY: roll && roll.enabled ? (quantize ? Number(roll.angularVelocity.y.toFixed(4)) : roll.angularVelocity.y) : undefined,
        angZ: roll && roll.enabled ? (quantize ? Number(roll.angularVelocity.z.toFixed(4)) : roll.angularVelocity.z) : undefined,
      };
    });

    return {
      tick,
      timestamp: performance.now(),
      entities,
    };
  }

  /**
   * Restores entities to the exact state captured in a snapshot.
   * If filterEntities is provided, only restores entities present in that set (Phase 3 Island optimization).
   */
  public static apply(
    snapshot: WorldSnapshot,
    characters: Character[],
    objects: GameObject[],
    filterEntities?: Set<GameObject>
  ): void {
    const allMap = new Map<string, GameObject>();
    for (const c of characters) {
      if (!filterEntities || filterEntities.has(c)) {
        allMap.set(c.id, c);
        c.heldObject = null; // Reset heldObject before re-binding
      }
    }
    for (const o of objects) {
      if (!filterEntities || filterEntities.has(o)) {
        allMap.set(o.id, o);
      }
    }

    for (const snap of snapshot.entities) {
      const entity = allMap.get(snap.id);
      if (!entity) continue;

      entity.position.x = snap.x;
      entity.position.y = snap.y;
      entity.position.z = snap.z;
      entity.velocity.x = snap.vx;
      entity.velocity.y = snap.vy;
      entity.verticalVelocity = snap.vz;
      entity.isHeld = snap.isHeld;
      entity.isClimbing = snap.isClimbing;
      entity.isSleeping = snap.isSleeping ?? false;

      if (snap.isCharacter && entity.isCharacter) {
        const char = entity as any;
        if (snap.facingAngle !== undefined) char.facingAngle = snap.facingAngle;
        if (snap.isSprinting !== undefined) char.isSprinting = snap.isSprinting;
      }

      if (entity.rollModule && entity.rollModule.enabled && snap.angX !== undefined) {
        entity.rollModule.angularVelocity.x = snap.angX;
        entity.rollModule.angularVelocity.y = snap.angY ?? 0;
        entity.rollModule.angularVelocity.z = snap.angZ ?? 0;
      }

      if (snap.heldById) {
        const holder = allMap.get(snap.heldById);
        entity.heldBy = holder ?? null;
        if (holder && (holder as any).heldObject !== undefined) {
          (holder as any).heldObject = entity;
        }
      } else {
        entity.heldBy = null;
      }
    }
  }

  /**
   * Compares two snapshots and evaluates divergence.
   */
  public static hasDivergence(
    a: WorldSnapshot,
    b: WorldSnapshot,
    posThreshold: number = 0.05,
    velThreshold: number = 0.1
  ): { diverged: boolean; entityId?: string; deltaPos?: number; maxDeltaPos: number; maxDeltaVel: number } {
    const mapB = new Map(b.entities.map((e) => [e.id, e]));
    let maxDeltaPos = 0;
    let maxDeltaVel = 0;
    let divergedEntityId: string | undefined;

    for (const entA of a.entities) {
      const entB = mapB.get(entA.id);
      if (!entB) continue;

      const dx = entA.x - entB.x;
      const dy = entA.y - entB.y;
      const dz = entA.z - entB.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > maxDeltaPos) maxDeltaPos = dist;

      const dvx = entA.vx - entB.vx;
      const dvy = entA.vy - entB.vy;
      const dvz = entA.vz - entB.vz;
      const velDiff = Math.hypot(dvx, dvy, dvz);
      if (velDiff > maxDeltaVel) maxDeltaVel = velDiff;

      if (!divergedEntityId && (dist > posThreshold || velDiff > velThreshold)) {
        divergedEntityId = entA.id;
      }
    }

    return {
      diverged: divergedEntityId !== undefined,
      entityId: divergedEntityId,
      deltaPos: maxDeltaPos,
      maxDeltaPos,
      maxDeltaVel,
    };
  }
}
