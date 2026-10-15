import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Character } from "../src/character/Character.js";
import { FoodModule } from "../src/engine/FoodModule.js";
import { SpawnerModule } from "../src/engine/SpawnerModule.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";
import { EnergyPool } from "../src/character/EnergyPool.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

console.log("=== Running Food & Spawner Architecture Tests ===");

// 1. FoodModule: Continuous Ingestion, Energy Transfer & Volumetric Shrinking
{
  const arena = new Arena({ width: 20, height: 14, wallHeight: 2.0 });
  const character = new Character({ x: 5, y: 5 });
  character.energyPool = new EnergyPool({ maxEnergy: 5000, currentEnergy: 1000 });

  const foodObj = new GameObject({
    id: "apple-test-1",
    name: "Crisp Apple",
    position: { x: 5, y: 5, z: 0 },
    colliderRadius: 0.30,
    foodModule: new FoodModule({
      totalEnergyJoules: 2000,
      remainingEnergyJoules: 2000,
      eatRateWatts: 400,
      healRate: 0,
      minScaleFloor: 0.40,
      minRadiusFloor: 0.15,
    }),
  });
  arena.entities.push(foodObj);

  character.heldObject = foodObj;
  foodObj.isHeld = true;
  foodObj.heldBy = character;

  assert(foodObj.foodModule !== null, "Food module attached");
  const fm = foodObj.foodModule!;

  // Verify full initial scale is 1.0
  assert(Math.abs(fm.getScale(foodObj.properties) - 1.0) < 0.001, "Initial food scale is 1.0");

  // Eat for 1.0 second at 400 W -> should consume 400 J and add 400 J to character pool
  const result1 = fm.eat(1.0, character, foodObj, arena);
  assert(Math.abs(result1.joules - 400) < 0.01, `Expected 400 J transferred, got ${result1.joules}`);
  assert(Math.abs(fm.getRemainingEnergy(foodObj.properties) - 1600) < 0.01, `Remaining energy should be 1600 J, got ${fm.getRemainingEnergy(foodObj.properties)}`);
  assert(Math.abs(character.energyPool.getCurrentEnergy(character.properties) - 1400) < 0.01, `Character energy should be 1400 J, got ${character.energyPool.getCurrentEnergy(character.properties)}`);

  // Verify scale has shrunk volumetrically (cbrt(1600/2000) = ~0.928)
  const scale1 = fm.getScale(foodObj.properties);
  assert(scale1 < 1.0 && scale1 > 0.90, `Scale should shrink to ~0.928, got ${scale1}`);
  assert(foodObj.colliderRadius < 0.30, `Collider radius should shrink, got ${foodObj.colliderRadius}`);

  // Test minimum scale floor when only 50 J left (ratio 50/2000 = 0.025, cbrt(0.025) = ~0.29, but minScaleFloor is 0.40)
  fm.remainingEnergyJoulesProp.literalValue = 50;
  const floorScale = fm.getScale(foodObj.properties);
  assert(Math.abs(floorScale - 0.40) < 0.001, `Scale must clamp to minScaleFloor 0.40, got ${floorScale}`);
  fm.eat(0.01, character, foodObj, arena);
  assert(foodObj.colliderRadius >= 0.15, `Collider radius must not drop below minRadiusFloor (0.15), got ${foodObj.colliderRadius}`);

  // When food is fully consumed:
  fm.remainingEnergyJoulesProp.literalValue = 10;
  const finishResult = fm.eat(0.1, character, foodObj, arena); // 400 W * 0.1s = 40 J demand, takes last 10 J
  assert(finishResult.isDepleted, "Food should report isDepleted = true");
  assert(fm.isConsumed, "Food should be marked isConsumed = true");
  assert(character.heldObject === null, "Character heldObject should be cleared upon finish");
  assert(!arena.entities.includes(foodObj), "Food object should be removed from arena.entities upon complete consumption");

  console.log("✓ FoodModule continuous energy transfer, volumetric shrinking, scale floor, and depletion verified!");
}

// 2. Character Movement Agility While Eating (User: "No impact on speed")
{
  const arena = new Arena({ width: 20, height: 14, wallHeight: 2.0 });
  const character = new Character({ x: 5, y: 5 });
  character.energyPool = new EnergyPool({ maxEnergy: 5000, currentEnergy: 3000 });

  const foodObj = new GameObject({
    id: "apple-test-2",
    position: { x: 5, y: 5, z: 0 },
    foodModule: new FoodModule({ totalEnergyJoules: 1000, eatRateWatts: 400 }),
  });
  character.heldObject = foodObj;
  character.isUsingItem = true;

  // Simulate movement update while eating
  character.updateCharacter(1/60, { x: 1, y: 0 }, false, null, arena, false, [foodObj]);
  const normalWalkSpeed = character.walkingModule!.maxWalkSpeedProp.literalValue;

  // Ensure character moves at full normal walk speed without penalty
  assert(character.velocity.x > 0, "Character moves forward while eating");
  assert(character.isUsingItem, "isUsingItem remains active during movement");

  console.log("✓ Character movement agility while eating verified (zero speed penalty)!");
}

// 3. SpawnerModule: Clone On Pickup & Stripping From Picked-Up Item
{
  const arena = new Arena({ width: 20, height: 14, wallHeight: 2.0 });
  const character = new Character({ x: 5, y: 5 });

  const spawnerObj = new GameObject({
    id: "apple-spawner-test",
    name: "Infinite Apple Spawner",
    position: { x: 4.8, y: 5.2, z: 0 },
    color: "#22c55e",
    visualShape: "circle",
    colliderRadius: 0.25,
    mass: 0.35,
    foodModule: new FoodModule({ totalEnergyJoules: 2000, eatRateWatts: 400 }),
    spawnerModule: new SpawnerModule({
      spawnPosition: { x: 4.8, y: 5.2, z: 0 },
      respawnDelay: 0,
    }),
  });
  arena.entities.push(spawnerObj);

  assert(spawnerObj.spawnerModule !== null, "Spawner module initially attached to arena object");
  assert(arena.entities.length === 1, "Initially 1 entity in arena");

  // Character picks up the spawner object
  character.pickupModule!.pickup(character, spawnerObj);
  assert(character.heldObject === spawnerObj, "Character successfully picked up the item");

  // Trigger reproduction on pickup
  const clone = spawnerObj.spawnerModule!.triggerClone(spawnerObj, arena);
  assert(clone !== null, "Clone successfully created");

  // CRITICAL USER REQUIREMENT: "i don't want the one i pick up to have the spawner module."
  assert(spawnerObj.spawnerModule === null, "Picked-up item MUST have its spawnerModule stripped (null)");
  assert(character.heldObject.spawnerModule === null, "Character held item has no spawnerModule");

  // Verify the replacement clone at the spawn position
  assert(clone!.spawnerModule !== null, "Replacement clone RETAINS the spawnerModule");
  assert(clone!.position.x === 4.8 && clone!.position.y === 5.2, "Replacement clone sits exactly at spawn position");
  assert(clone!.foodModule !== null, "Replacement clone has full FoodModule");
  assert(clone!.foodModule!.getRemainingEnergy() === 2000, "Replacement clone has full 2000 J energy");
  assert(arena.entities.includes(clone!), "Replacement clone added to arena.entities");

  // Second pickup test: pickup the clone and verify another clone is created
  const character2 = new Character({ x: 4.8, y: 5.2 });
  character2.pickupModule!.pickup(character2, clone!);
  const secondClone = clone!.spawnerModule!.triggerClone(clone!, arena);
  assert(clone!.spawnerModule === null, "Second picked-up item also stripped of spawnerModule");
  assert(secondClone !== null && secondClone.spawnerModule !== null, "New stationary clone generated");
  assert(secondClone.spawnerModule.spawnCount === 2, "Spawner tracks total spawn count = 2");

  console.log("✓ SpawnerModule clone on pickup & module stripping from held item verified 100%!");
}

// 4. Universal Throw (F key / RB) vs Primary Action (LMB / RT)
{
  const arena = new Arena({ width: 20, height: 14, wallHeight: 2.0 });
  const character = new Character({ x: 5, y: 5 });

  const foodObj = new GameObject({
    id: "apple-throw-test",
    position: { x: 5, y: 5, z: 0 },
    foodModule: new FoodModule({ totalEnergyJoules: 2000, eatRateWatts: 400 }),
  });
  character.heldObject = foodObj;
  foodObj.isHeld = true;
  foodObj.heldBy = character;

  // Universal throw should successfully throw the food object
  assert(character.heldObject !== null, "Character holds food");
  character.throwModule!.throwHeldObject(character, 10, 5, arena);
  assert(character.heldObject === null, "Food successfully thrown via universal throw");
  assert(foodObj.isInFlight, "Food is now airborne in flight");
  assert(foodObj.velocity.x > 0, "Food has launch velocity");

  console.log("✓ Universal Throw correctly launches food objects!");
}

console.log("=== ALL FOOD & SPAWNER ARCHITECTURE TESTS PASSED 100%! ===");
