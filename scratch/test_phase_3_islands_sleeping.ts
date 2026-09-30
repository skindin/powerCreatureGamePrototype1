/**
 * Phase 3 Automated Verification Test:
 * Tests Sleeping Freebody Dynamics and Islands of Influence Partitioning.
 */

import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { CollisionResolver } from "../src/engine/physics/CollisionResolver.js";
import { IslandManager } from "../src/engine/physics/IslandManager.js";
import { SnapshotManager } from "../src/engine/physics/Snapshot.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("==================================================================");
console.log("PHASE 3 TEST SUITE: SLEEPING BODIES & ISLANDS OF INFLUENCE");
console.log("==================================================================");

const arena = new Arena({ width: 20, height: 20 });
const islandManager = new IslandManager();

// Test 1: Sleeping freebody transitions after 15 resting ticks
console.log("\n--- Test 1: Sleeping Freebody State Transitions ---");
const rock = new GameObject({
  id: "rock-1",
  name: "Rock",
  position: { x: 5, y: 5, z: 0 },
  velocity: { x: 0, y: 0 },
  hasVerticalPosition: true,
  hasVerticalVelocity: true,
  mass: 2.0,
  colliderRadius: 0.4,
  dynamicGroundFrictionMod: 1.0,
});

assert(!rock.isSleeping, "Rock should initially be awake");
assert(rock.sleepTimer === 0, "Initial sleepTimer should be 0");

// Step 14 times (not yet asleep)
for (let t = 0; t < 14; t++) {
  rock.updatePosition(1 / 60, arena);
}
assert(!rock.isSleeping, "Rock should still be awake at 14 resting ticks");
assert(rock.sleepTimer === 14, `sleepTimer should be 14 (got ${rock.sleepTimer})`);

// Step 15th time -> should enter sleep
rock.updatePosition(1 / 60, arena);
assert(rock.isSleeping, "Rock should enter sleep at 15 resting ticks");
console.log("✅ Passed: Rock entered sleep mode after 15 resting ticks.");

// Test 2: External impulse wakes up sleeping body
console.log("\n--- Test 2: Collision Impulse Wakes Up Sleeping Freebody ---");
const mover = new GameObject({
  id: "mover-1",
  name: "Fast Ball",
  position: { x: 4.5, y: 5.0, z: 0 },
  velocity: { x: 5.0, y: 0 },
  mass: 3.0,
  colliderRadius: 0.4,
});

assert(rock.isSleeping, "Rock must be sleeping before collision");
assert(!mover.isSleeping, "Mover is active");

// In the fixed update loop, positions are integrated first, then collisions are resolved
mover.updatePosition(1 / 60, arena);

// Resolve collision
CollisionResolver.resolveEntityCollisions([mover, rock], arena, 1 / 60);

assert(!rock.isSleeping, "Rock should wake up immediately upon contact impulse");
assert(rock.sleepTimer === 0, "Rock sleepTimer should reset to 0 upon wakeup");
console.log("✅ Passed: Sleeping rock woke up immediately upon collision.");

// Test 3: Islands of Influence Graph Partitioning
console.log("\n--- Test 3: Islands of Influence Graph Partitioning ---");
const charA = new Character({
  name: "Player A",
  x: 2,
  y: 2,
});
charA.id = "char-A";
const heldRock = new GameObject({
  id: "held-rock",
  name: "Held Rock",
  position: { x: 2, y: 2, z: 0.5 },
  mass: 1.5,
  colliderRadius: 0.3,
});
charA.heldObject = heldRock;
heldRock.heldBy = charA;
heldRock.isHeld = true;

const sleepingCrate = new GameObject({
  id: "sleeping-crate",
  name: "Dormant Crate",
  position: { x: 15, y: 15, z: 0 },
  velocity: { x: 0, y: 0 },
  mass: 5.0,
  colliderRadius: 0.6,
});
sleepingCrate.putToSleep();

islandManager.updateIslands([charA], [heldRock, sleepingCrate], 100, arena);

const charIsland = islandManager.getIslandForEntity(charA.id);
assert(charIsland !== undefined, "Character A must have an island");
assert(charIsland!.entities.has(charA), "Island must contain Character A");
assert(charIsland!.entities.has(heldRock), "Island must contain held rock");
assert(!charIsland!.entities.has(sleepingCrate), "Dormant crate must NOT be in Character A's island");

const crateIsland = islandManager.getIslandForEntity(sleepingCrate.id);
assert(crateIsland !== undefined, "Sleeping crate has its own island");
assert(crateIsland!.entities.size === 1, "Sleeping crate island should only contain itself");

const stats = islandManager.getStats();
console.log(`Island Stats: Total=${stats.totalIslands}, Active=${stats.activeIslands}, Sleeping=${stats.sleepingCount}`);
assert(stats.activeIslands === 1, "Should have exactly 1 active island (Char A + Held Rock)");
assert(stats.sleepingCount === 1, "Should have 1 sleeping entity");
console.log("✅ Passed: Islands of influence cleanly separated active player from sleeping crate.");

// Test 4: Selective Island Snapshot Restoration
console.log("\n--- Test 4: Selective Snapshot Restoration ---");
const snap = SnapshotManager.capture(100, [charA], [heldRock, sleepingCrate]);

// Alter positions
charA.position.x = 8;
sleepingCrate.position.x = 99;

// Restore ONLY charA's island
const islandEntities = islandManager.getInfluencedEntities(charA.id);
SnapshotManager.apply(snap, [charA], [heldRock, sleepingCrate], islandEntities);

assert(charA.position.x === 2, `Char A should be restored to x=2 (got ${charA.position.x})`);
assert(sleepingCrate.position.x === 99, `Sleeping crate should remain untouched at x=99 (got ${sleepingCrate.position.x})`);
console.log("✅ Passed: Selective island restoration restored active island without touching dormant entities.");

console.log("\n🎉 ALL PHASE 3 UNIT & INTEGRATION TESTS PASSED 100%!\n");
