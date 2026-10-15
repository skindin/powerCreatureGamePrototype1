import { EnergyPool } from "../src/character/EnergyPool.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { PrefabManager } from "../src/engine/prefab/PrefabManager.js";
import { SceneSpawnerManager } from "../src/engine/spawner/SceneSpawnerManager.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log("=== RUNNING PREFABS & SCENE SPAWNERS VERIFICATION ===");

// 1. Verify Default EnergyPool Auto-Refill is Disabled
console.log("\n--- TEST 1: Default EnergyPool Auto-Refill Disabled ---");
const pool = new EnergyPool();
assert(pool.debugAutoRefillOnEmpty === false, "Default EnergyPool.debugAutoRefillOnEmpty is false");

// 2. Verify PrefabManager & Default Apple Prefab
console.log("\n--- TEST 2: PrefabManager Default Apple Prefab ---");
const pm = new PrefabManager();
const prefabs = pm.getAll();
assert(prefabs.length >= 1, `PrefabManager has at least 1 default prefab (found ${prefabs.length})`);
const applePrefab = pm.get("prefab_apple");
assert(Boolean(applePrefab), "Default 'prefab_apple' found in PrefabManager");
assert(applePrefab!.archetype.name === "Apple", "Apple prefab archetype name is 'Apple'");
assert(Boolean(applePrefab!.archetype.consumableModule), "Apple prefab has ConsumableModule");
assert(applePrefab!.archetype.consumableModule!.tag === "food", "Apple consumable tag is 'food'");
assert(applePrefab!.archetype.consumableModule!.totalEnergyJoulesProp.literalValue === 500, "Apple total energy is 500J");

// 3. Verify Prefab Instantiation
console.log("\n--- TEST 3: Prefab Instantiation & PrefabId Link ---");
const arena = new Arena(20, 14, 1.0);
const liveObjects: GameObject[] = [];
const appleInstance1 = pm.spawn("prefab_apple", { x: 5, y: 5, z: 0 }, arena, liveObjects);
assert(Boolean(appleInstance1), "Spawned instance 1 successfully");
assert(liveObjects.length === 1, "Instance added to liveObjects array");
assert(appleInstance1!.prefabId === "prefab_apple", "Instance has prefabId linked");
assert(appleInstance1!.overriddenProperties.size === 0, "Instance starts with 0 overridden properties");
assert(appleInstance1!.consumableModule!.tag === "food", "Instance has tag 'food'");
assert(appleInstance1!.consumableModule!.getRemainingEnergy(appleInstance1!.properties) === 500, "Instance has 500J energy");

const appleInstance2 = pm.spawn("prefab_apple", { x: 7, y: 7, z: 0 }, arena, liveObjects);
assert(liveObjects.length === 2, "Spawned second instance");

// 4. Verify Prefab Property Cascading to Non-Overridden Instances
console.log("\n--- TEST 4: Prefab Property Cascading ---");
// Edit prefab mass and consumable heal rate
applePrefab!.setProperty("mass", 0.75, liveObjects);
applePrefab!.setProperty("consumable_healRate", 12.0, liveObjects);

assert(appleInstance1!.mass === 0.75, "Instance 1 received propagated mass (0.75kg)");
assert(appleInstance2!.mass === 0.75, "Instance 2 received propagated mass (0.75kg)");
assert(appleInstance1!.consumableModule!.healRateProp.literalValue === 12.0, "Instance 1 received propagated healRate (12 HP/s)");
assert(appleInstance2!.consumableModule!.healRateProp.literalValue === 12.0, "Instance 2 received propagated healRate (12 HP/s)");

// 5. Verify Live Instance Overrides Prevent Overwriting
console.log("\n--- TEST 5: Live Instance Overrides ---");
// Instance 1 overrides mass to 2.5kg
appleInstance1!.mass = 2.5;
appleInstance1!.overriddenProperties.add("mass");

// Edit prefab mass again
applePrefab!.setProperty("mass", 0.90, liveObjects);

assert(appleInstance1!.mass === 2.5, "Instance 1 preserved its overridden mass (2.5kg)");
assert(appleInstance2!.mass === 0.90, "Instance 2 received new prefab mass (0.90kg)");

// Editing an un-overridden property still cascades to instance 1
applePrefab!.setProperty("color", "#22c55e", liveObjects);
assert(appleInstance1!.color === "#22c55e", "Instance 1 un-overridden color still updated to #22c55e");
assert(appleInstance2!.color === "#22c55e", "Instance 2 color updated to #22c55e");

// 6. Verify Creating Prefab from Live Entity
console.log("\n--- TEST 6: Create Prefab from Live Entity ---");
const customObj = new GameObject({
  name: "Golden Pear",
  color: "#eab308",
  visualShape: "circle",
  mass: 1.2,
  colliderRadius: 0.35,
});
const pearPrefab = pm.createFromEntity(customObj, "Golden Pear");
assert(pm.get(pearPrefab.id) !== undefined, "New prefab registered in PrefabManager");
assert(customObj.prefabId === pearPrefab.id, "Source entity linked to new prefab");
assert(pearPrefab.archetype.name === "Golden Pear", "Archetype matches source name");
assert(pearPrefab.archetype.color === "#eab308", "Archetype matches source color");

// 7. Verify Prefab Deletion
console.log("\n--- TEST 7: Prefab Deletion Unlinks Live Instances ---");
pm.delete(pearPrefab.id, [customObj]);
assert(pm.get(pearPrefab.id) === undefined, "Prefab deleted from PrefabManager");
assert(customObj.prefabId === null, "Live object unlinked (prefabId is null)");
assert(customObj.overriddenProperties.size === 0, "Live object overridden properties cleared");

// 8. Verify SceneSpawner Mechanics
console.log("\n--- TEST 8: SceneSpawner Timing, Random Ground Spawn & Max Count ---");
const sm = new SceneSpawnerManager(pm);
const spawners = sm.getAll();
assert(spawners.length >= 1, `SceneSpawnerManager has default spawner (found ${spawners.length})`);
const appleSpawner = spawners[0];
assert(appleSpawner.prefabId === "prefab_apple", "Spawner targets 'prefab_apple'");
assert(appleSpawner.intervalMinutes === 0.25, "Spawner interval is 0.25 minutes (15s)");
assert(appleSpawner.maxCount === 5, "Spawner maxCount is 5");

// Active count in scene
assert(appleSpawner.getActiveCount(liveObjects) === 2, `Active count of apples in scene is 2`);

// Advance time partially (10s) - should not spawn yet
sm.update(10.0, arena, liveObjects);
assert(appleSpawner.getActiveCount(liveObjects) === 2, "No spawn after 10s (target is 15s)");

// Advance time past 15s threshold (6s more -> 16s total) - should spawn 1 apple
sm.update(6.0, arena, liveObjects);
assert(appleSpawner.getActiveCount(liveObjects) === 3, `Apple spawned after interval! (count: ${appleSpawner.getActiveCount(liveObjects)})`);
const latestApple = liveObjects[liveObjects.length - 1];
assert(latestApple.prefabId === "prefab_apple", "Spawned object has prefabId 'prefab_apple'");
assert(!arena.hasWall(Math.floor(latestApple.position.x), Math.floor(latestApple.position.y)), "Spawned apple is on open ground floor, not a wall");

// Test Spawn Now
console.log("\n--- TEST 9: Spawn Now ---");
const instantApple = appleSpawner.spawnNow(arena, liveObjects, pm);
assert(Boolean(instantApple), "Spawn Now created an apple");
assert(appleSpawner.getActiveCount(liveObjects) === 4, "Active count is now 4");

// Fill to maxCount (5)
const fifthApple = appleSpawner.spawnNow(arena, liveObjects, pm);
assert(Boolean(fifthApple), "Spawned 5th apple");
assert(appleSpawner.getActiveCount(liveObjects) === 5, "Active count is at capacity (5)");

// Test maxCount ceiling - spawn attempt must fail
const blockedSpawnNow = appleSpawner.spawnNow(arena, liveObjects, pm);
assert(blockedSpawnNow === null, "Spawn Now refused when activeCount >= maxCount");

// Timer update also does not exceed cap
sm.update(30.0, arena, liveObjects);
assert(appleSpawner.getActiveCount(liveObjects) === 5, "Timer update does not exceed maxCount");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n");
