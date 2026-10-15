import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { ConsumableModule } from "../src/engine/ConsumableModule.js";
import { ConsumeModule } from "../src/character/ConsumeModule.js";
import { SpawnerModule } from "../src/engine/SpawnerModule.js";
import { consumableTagRegistry } from "../src/engine/properties/ConsumableTagRegistry.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

async function runTests() {
  console.log("=== TEST SUITE: Consumable Tags, ConsumeModule & Spawner Replication ===");

  // 1. Tag Registry tests
  console.log("\n--- 1. ConsumableTagRegistry: Add, Rename, Delete ---");
  const testTag = "energy_core";
  assert(consumableTagRegistry.add(testTag), "Can add new tag 'energy_core'");
  assert(consumableTagRegistry.has("energy_core"), "Tag registry has 'energy_core'");

  let renameFired = false;
  const unsubRename = consumableTagRegistry.onRename((oldT, newT) => {
    if (oldT === "energy_core" && newT === "power_cell") {
      renameFired = true;
    }
  });

  assert(consumableTagRegistry.rename("energy_core", "power_cell"), "Can rename 'energy_core' to 'power_cell'");
  assert(renameFired, "Rename listener fired with old and new tag");
  assert(consumableTagRegistry.has("power_cell"), "Registry contains renamed tag 'power_cell'");
  assert(!consumableTagRegistry.has("energy_core"), "Registry no longer contains old tag 'energy_core'");
  unsubRename();

  let deleteFired = false;
  const unsubDelete = consumableTagRegistry.onDelete((deletedT) => {
    if (deletedT === "power_cell") {
      deleteFired = true;
    }
  });

  assert(consumableTagRegistry.delete("power_cell"), "Can delete tag 'power_cell'");
  assert(deleteFired, "Delete listener fired");
  assert(!consumableTagRegistry.has("power_cell"), "Registry no longer has 'power_cell'");
  unsubDelete();

  // 2. ConsumeModule and Tag Filtering
  console.log("\n--- 2. Character ConsumeModule Tag Matching ---");
  const arena = new Arena();
  const char = new Character({
    name: "TestConsumer",
    position: { x: 5, y: 5, z: 0 },
  });
  char.consumeModule = new ConsumeModule({
    acceptedTags: ["food", "drink"],
  });

  const apple = new GameObject({
    id: "item-apple",
    name: "Apple",
    position: { x: 5, y: 5, z: 0 },
    consumableModule: new ConsumableModule({
      tag: "food",
      totalEnergyJoules: 100,
      consumeRateWatts: 50,
    }),
  });

  const potion = new GameObject({
    id: "item-potion",
    name: "Magic Potion",
    position: { x: 5, y: 5, z: 0 },
    consumableModule: new ConsumableModule({
      tag: "potion",
      totalEnergyJoules: 200,
      consumeRateWatts: 50,
    }),
  });

  assert(char.consumeModule.canConsume(apple), "Character can consume apple (tag 'food' is accepted)");
  assert(!char.consumeModule.canConsume(potion), "Character cannot consume potion (tag 'potion' not accepted yet)");

  // Add 'potion' to accepted tags
  char.consumeModule.addTag("potion");
  assert(char.consumeModule.canConsume(potion), "Character can consume potion after adding 'potion' to accepted tags");

  // 3. Complete Ingestion and Removal from World (Disappearing)
  console.log("\n--- 3. Consumable Depletion & World Removal ---");
  const objects: GameObject[] = [apple, potion];
  char.heldObject = apple;
  apple.isHeld = true;
  apple.heldBy = char;

  assert(objects.includes(apple), "Apple is initially in objects list");
  assert(char.heldObject === apple, "Character is holding apple");

  // Consume 1 second at 50W (50J drained)
  const res1 = char.consumeModule.consume(1.0, char, apple, objects, arena);
  assert(res1.joules === 50, "Drained 50 Joules from apple");
  assert(!res1.isDepleted, "Apple is not yet depleted (50J remaining)");
  assert(objects.includes(apple), "Apple is still in objects list after partial consumption");

  // Consume another 1.1 seconds (draining remaining 50J to 0J)
  const res2 = char.consumeModule.consume(1.1, char, apple, objects, arena);
  assert(res2.isDepleted, "Apple is now depleted (0J remaining)");
  assert(apple.consumableModule?.isConsumed === true, "Apple marked as isConsumed = true");
  assert(char.heldObject === null, "Character dropped consumed apple (heldObject is null)");
  assert(!objects.includes(apple), "Apple was REMOVED from objects array! It has disappeared from the world!");
  assert(objects.length === 1 && objects[0] === potion, "Only potion remains in objects array");

  // 4. SpawnerModule (Cloning on Pickup & Stripping from Held Item)
  console.log("\n--- 4. SpawnerModule Cloning on Pickup ---");
  const originalPos = { x: 3.5, y: 6.0, z: 0 };
  const spawnerApple = new GameObject({
    id: "spawner-apple",
    name: "Infinite Energy Apple",
    position: originalPos,
    color: "#22c55e",
    consumableModule: new ConsumableModule({
      tag: "food",
      totalEnergyJoules: 500,
      consumeRateWatts: 100,
    }),
    spawnerModule: new SpawnerModule({
      spawnPosition: originalPos,
      enabled: true,
    }),
  });

  objects.push(spawnerApple);
  assert(objects.includes(spawnerApple), "Spawner apple added to objects list");
  assert(spawnerApple.spawnerModule !== null, "Spawner apple has spawnerModule before pickup");

  // Simulate character picking up spawner apple
  char.heldObject = spawnerApple;
  spawnerApple.isHeld = true;
  spawnerApple.heldBy = char;

  // Trigger clone on pickup
  const clone = spawnerApple.spawnerModule.triggerClone(spawnerApple, arena, objects);
  assert(clone !== null, "Clone was successfully created");
  assert(objects.includes(clone!), "Replacement clone was automatically added to objects array!");
  assert(spawnerApple.spawnerModule === null, "Held apple had its SpawnerModule stripped!");
  assert(clone!.spawnerModule !== null, "Clone in world retained SpawnerModule!");
  assert(clone!.position.x === originalPos.x && clone!.position.y === originalPos.y, "Clone is positioned at original spawn position");
  assert(clone!.consumableModule?.tag === "food", "Clone has matching consumable tag 'food'");
  assert(clone!.consumableModule?.totalEnergyJoules === 500, "Clone has full 500J energy");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
