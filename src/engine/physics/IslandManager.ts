import { GameObject } from "../GameObject.js";
import { Character } from "../../character/Character.js";
import { Arena } from "../Arena.js";

/**
 * Represents a connected cluster of interacting physical entities.
 * (e.g. Player A holding Rock 1, or Rock 2 colliding with Crate 3).
 */
export interface PhysicalIsland {
  id: string;
  entities: Set<GameObject>;
  hasPlayer: boolean;
  lastActiveTick: number;
}

/**
 * IslandManager
 *
 * Implements Phase 3 "Islands of Influence" optimization:
 * - Partitions the game world into disconnected interaction subgraphs.
 * - Entities resting at zero kinetic energy (sleeping) are excluded from active islands.
 * - When client prediction rollback occurs, only the island containing the local player
 *   needs to be rewound and re-simulated. All other dormant/unrelated islands take 0 CPU.
 */
export class IslandManager {
  private islands: Map<string, PhysicalIsland> = new Map();
  private entityToIsland: Map<string, PhysicalIsland> = new Map();
  private nextIslandId = 1;

  /**
   * Rebuilds the dynamic interaction graph for the current simulation frame.
   * Adjacency is formed by:
   * 1. Character holding an object (holder <-> heldObject).
   * 2. Recent contact between entities (lastContactPoint set & speed > 0).
   * 3. Proximity overlap between non-sleeping entities.
   */
  public updateIslands(
    characters: Character[],
    objects: GameObject[],
    currentTick: number,
    arena: Arena
  ): void {
    this.islands.clear();
    this.entityToIsland.clear();

    const allEntities = [...characters, ...objects];
    const visited = new Set<string>();

    // Helper: build adjacency list
    const adj = new Map<string, Set<GameObject>>();
    for (const e of allEntities) {
      adj.set(e.id, new Set());
    }

    // 1. Holding connections
    for (const char of characters) {
      if (char.heldObject) {
        adj.get(char.id)?.add(char.heldObject);
        adj.get(char.heldObject.id)?.add(char);
      }
    }

    // 2. Dynamic contact / proximity between active entities
    const activeEntities = allEntities.filter((e) => !e.isSleeping || e.isCharacter);
    const activeCount = activeEntities.length;

    for (let i = 0; i < activeCount; i++) {
      for (let j = i + 1; j < activeCount; j++) {
        const a = activeEntities[i];
        const b = activeEntities[j];

        // Skip if on different height tiers
        if (GameObject.getEntityLayer(a, arena.wallHeight) !== GameObject.getEntityLayer(b, arena.wallHeight)) {
          continue;
        }

        // Distance check: connect if overlapping or in near contact
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const distSq = dx * dx + dy * dy;
        const touchDist = a.colliderRadius + b.colliderRadius + 0.05;

        if (distSq <= touchDist * touchDist) {
          adj.get(a.id)?.add(b);
          adj.get(b.id)?.add(a);
        }
      }
    }

    // 3. Flood-fill / Connected components discovery
    for (const e of allEntities) {
      if (visited.has(e.id)) continue;

      // Sleeping entities with no connections form isolated 1-element dormant islands
      const neighbors = adj.get(e.id);
      if (e.isSleeping && (!neighbors || neighbors.size === 0)) {
        visited.add(e.id);
        const dormantIsland: PhysicalIsland = {
          id: `island-dormant-${e.id}`,
          entities: new Set([e]),
          hasPlayer: false,
          lastActiveTick: currentTick,
        };
        this.islands.set(dormantIsland.id, dormantIsland);
        this.entityToIsland.set(e.id, dormantIsland);
        continue;
      }

      // BFS to collect all connected entities in this island
      const islandEntities = new Set<GameObject>();
      const queue: GameObject[] = [e];
      visited.add(e.id);

      let islandHasPlayer = false;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        islandEntities.add(curr);
        if (curr.isCharacter) {
          islandHasPlayer = true;
        }

        const currNeighbors = adj.get(curr.id);
        if (currNeighbors) {
          for (const n of currNeighbors) {
            if (!visited.has(n.id)) {
              visited.add(n.id);
              queue.push(n);
            }
          }
        }
      }

      const island: PhysicalIsland = {
        id: `island-${this.nextIslandId++}`,
        entities: islandEntities,
        hasPlayer: islandHasPlayer,
        lastActiveTick: currentTick,
      };

      this.islands.set(island.id, island);
      for (const ent of islandEntities) {
        this.entityToIsland.set(ent.id, island);
      }
    }
  }

  /**
   * Retrieves the active island containing the specified entity.
   */
  public getIslandForEntity(entityId: string): PhysicalIsland | undefined {
    return this.entityToIsland.get(entityId);
  }

  /**
   * Returns all entities in the island containing the specified character or entity.
   * If the entity is not found or isolated, returns a set containing just that entity.
   */
  public getInfluencedEntities(entityId: string): Set<GameObject> {
    const island = this.entityToIsland.get(entityId);
    if (island) {
      return island.entities;
    }
    return new Set();
  }

  /**
   * Returns statistics about the active islands.
   */
  public getStats(): {
    totalIslands: number;
    activeIslands: number;
    sleepingCount: number;
    totalEntities: number;
  } {
    let activeIslands = 0;
    let sleepingCount = 0;
    let totalEntities = 0;

    for (const island of this.islands.values()) {
      totalEntities += island.entities.size;
      let allSleeping = true;
      for (const e of island.entities) {
        if (e.isSleeping) sleepingCount++;
        else allSleeping = false;
      }
      if (!allSleeping) {
        activeIslands++;
      }
    }

    return {
      totalIslands: this.islands.size,
      activeIslands,
      sleepingCount,
      totalEntities,
    };
  }
}
