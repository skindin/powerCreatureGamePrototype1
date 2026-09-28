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
}

export interface WorldSnapshot {
  tick: number;
  timestamp: number;
  entities: EntitySnapshot[];
}

export class SnapshotManager {
  /**
   * Captures the physical state of all entities at the given simulation tick.
   */
  public static capture(tick: number, characters: Character[], objects: GameObject[]): WorldSnapshot {
    const all = [...characters, ...objects];
    const entities: EntitySnapshot[] = all.map((e) => ({
      id: e.id,
      name: e.name,
      x: Number(e.position.x.toFixed(4)),
      y: Number(e.position.y.toFixed(4)),
      z: Number(e.position.z.toFixed(4)),
      vx: Number(e.velocity.x.toFixed(4)),
      vy: Number(e.velocity.y.toFixed(4)),
      vz: Number(e.verticalVelocity.toFixed(4)),
      isHeld: e.isHeld,
      heldById: e.heldBy ? e.heldBy.id : null,
      isClimbing: e.isClimbing,
      isCharacter: e.isCharacter,
    }));

    return {
      tick,
      timestamp: performance.now(),
      entities,
    };
  }

  /**
   * Restores entities to the exact state captured in a snapshot.
   */
  public static apply(snapshot: WorldSnapshot, characters: Character[], objects: GameObject[]): void {
    const allMap = new Map<string, GameObject>();
    for (const c of characters) allMap.set(c.id, c);
    for (const o of objects) allMap.set(o.id, o);

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

      if (snap.heldById) {
        entity.heldBy = allMap.get(snap.heldById) ?? null;
      } else {
        entity.heldBy = null;
      }
    }
  }

  /**
   * Compares two snapshots and returns true if any entity diverged beyond the deadzone threshold.
   */
  public static hasDivergence(
    a: WorldSnapshot,
    b: WorldSnapshot,
    posThreshold: number = 0.05,
    velThreshold: number = 0.1
  ): { diverged: boolean; entityId?: string; deltaPos?: number } {
    const mapB = new Map(b.entities.map((e) => [e.id, e]));

    for (const entA of a.entities) {
      const entB = mapB.get(entA.id);
      if (!entB) continue;

      const dx = entA.x - entB.x;
      const dy = entA.y - entB.y;
      const dz = entA.z - entB.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq > posThreshold * posThreshold) {
        return {
          diverged: true,
          entityId: entA.id,
          deltaPos: Math.sqrt(distSq),
        };
      }

      const dvx = entA.vx - entB.vx;
      const dvy = entA.vy - entB.vy;
      const dvz = entA.vz - entB.vz;
      const velDiffSq = dvx * dvx + dvy * dvy + dvz * dvz;

      if (velDiffSq > velThreshold * velThreshold) {
        return {
          diverged: true,
          entityId: entA.id,
          deltaPos: Math.sqrt(velDiffSq),
        };
      }
    }

    return { diverged: false };
  }
}
