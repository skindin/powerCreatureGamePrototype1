import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ConsumableModule } from "../src/engine/ConsumableModule.js";
import { ConsumeModule } from "../src/character/ConsumeModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { PrefabManager } from "../src/engine/prefab/PrefabManager.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log("=== Testing Apple Prefab Stats and Consumption Suppression on Initial Pickup ===");

// 1. Verify Apple Prefab Archetype Stats
const pm = new PrefabManager();
const applePrefab = pm.get("prefab_apple");
assert(applePrefab !== undefined, "Apple prefab exists in PrefabManager");
assert(applePrefab!.icon === "🍏", `Apple icon is 🍏 (got ${applePrefab!.icon})`);

const arch = applePrefab!.archetype;
assert(arch.color === "#22c55e", `Archetype color is #22c55e (got ${arch.color})`);
assert(arch.mass === 0.35, `Archetype mass is 0.35 (got ${arch.mass})`);
assert(arch.colliderRadius === 0.25, `Archetype colliderRadius is 0.25 (got ${arch.colliderRadius})`);
assert(arch.bounceMod === 0.2, `Archetype bounceMod is 0.2 (got ${arch.bounceMod})`);

const cMod = arch.consumableModule;
assert(cMod !== undefined, "Archetype has ConsumableModule");
assert(cMod!.tag === "food", `ConsumableModule tag is food (got ${cMod!.tag})`);
assert(cMod!.totalEnergyJoules === 2000, `ConsumableModule total energy is 2000 J (got ${cMod!.totalEnergyJoules})`);
assert(cMod!.remainingEnergyJoules === 2000, `ConsumableModule remaining energy is 2000 J (got ${cMod!.remainingEnergyJoules})`);
assert(cMod!.consumeRateWatts === 400, `ConsumableModule consumeRateWatts is 400 W (got ${cMod!.consumeRateWatts})`);
assert(cMod!.healRate === 0, `ConsumableModule healRate is 0 HP/s (got ${cMod!.healRate})`);

// 2. Test Pickup Suppression: No false HP or Energy gain when picking up with button held
const arena = new Arena();
const char = new Character({
  id: "char-1",
  name: "Hero",
  x: 5,
  y: 5,
  color: "#3b82f6",
});
char.consumeModule = new ConsumeModule({ acceptedTags: ["food"] });
char.pickupModule = new PickupModule();

// Spawn an apple instance
const apple = applePrefab!.instantiate({ x: 5.2, y: 5 });
const objects: GameObject[] = [apple];

const canvasMock = {
  width: 800,
  height: 600,
  style: {},
  addEventListener: () => {},
  removeEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
} as unknown as HTMLCanvasElement;

const inputManager = new InputManager(canvasMock, arena);
const playerManager = new PlayerManager({ arena, inputManager, character: char });

// Character starts with initial energy and health
const initialEnergy = char.energyPool?.getCurrentEnergy(char.properties) ?? 0;
const initialHp = char.healthModule?.getCurrentHp(char.properties) ?? 100;
const initialAppleEnergy = apple.consumableModule!.remainingEnergyJoules;

console.log(`Initial state: char energy = ${initialEnergy} J, HP = ${initialHp}, apple energy = ${initialAppleEnergy} J`);

// Simulate player pressing mouse down to grab the apple
inputManager.isMouseDown = true;
inputManager.actualMousePos = { x: 5.2, y: 5 };

// Simulate pickup happening (e.g. via input packet seeking grab)
const inputs = playerManager.capturePlayerInputs(false, objects);
const kbPkt = inputs.get("keyboard");
assert(kbPkt !== undefined, "Keyboard input packet generated");
assert(kbPkt!.isUsingItem === false, "isUsingItem must be FALSE when not holding consumable");

// Apply input packet to execute pickup
playerManager.applyPlayerInputs(inputs, 1 / 60, objects, false);
assert(char.heldObject === apple, "Character picked up apple");
assert(char.isUsingItem === false, "char.isUsingItem must be FALSE immediately upon pickup");
assert(char.eatRateWatts === 0, "char.eatRateWatts must be 0 immediately upon pickup");

const gState = playerManager.getGrabSuppressionState(char.id);
assert(gState.useItemSuppressed === true, "gState.useItemSuppressed must be TRUE immediately upon pickup");

// Run 5 frames while mouse is STILL held down from the initial grab click
for (let f = 0; f < 5; f++) {
  const frameInputs = playerManager.capturePlayerInputs(false, objects);
  const framePkt = frameInputs.get("keyboard");
  assert(framePkt!.isUsingItem === false, `Frame ${f + 1}: isUsingItem packet field must remain FALSE while mouse was held prior to pickup`);
  playerManager.applyPlayerInputs(frameInputs, 1 / 60, objects, false);
  assert(char.isUsingItem === false, `Frame ${f + 1}: char.isUsingItem must remain FALSE`);
  assert(char.eatRateWatts === 0, `Frame ${f + 1}: char.eatRateWatts must remain 0`);
}

// Verify that 0 energy and 0 health were transferred during pickup and hold
const currentEnergy = char.energyPool?.getCurrentEnergy(char.properties) ?? 0;
const currentHp = char.healthModule?.getCurrentHp(char.properties) ?? 100;
assert(currentEnergy === initialEnergy, `Energy must not have increased (expected ${initialEnergy}, got ${currentEnergy})`);
assert(currentHp === initialHp, `Health must not have increased (expected ${initialHp}, got ${currentHp})`);
assert(apple.consumableModule!.remainingEnergyJoules === initialAppleEnergy, `Apple energy must be untouched (expected ${initialAppleEnergy}, got ${apple.consumableModule!.remainingEnergyJoules})`);

// 3. Now simulate releasing the mouse button
console.log("Simulating releasing mouse button...");
inputManager.isMouseDown = false;
inputManager.justPickedUp = false;

const releaseInputs = playerManager.capturePlayerInputs(false, objects);
playerManager.applyPlayerInputs(releaseInputs, 1 / 60, objects, false);

assert(gState.useItemSuppressed === false, "gState.useItemSuppressed must reset to FALSE when mouse is released");
assert(char.isUsingItem === false, "char.isUsingItem must remain FALSE while mouse is up");

// 4. Now simulate repressing the mouse button explicitly to eat!
console.log("Simulating pressing mouse button again to eat...");
inputManager.isMouseDown = true;

const eatInputs = playerManager.capturePlayerInputs(false, objects);
const eatPkt = eatInputs.get("keyboard");
assert(eatPkt!.isUsingItem === true, "eatPkt.isUsingItem must be TRUE now that mouse was released and repressed");

playerManager.applyPlayerInputs(eatInputs, 1 / 60, objects, false);
assert(char.isUsingItem === true, "char.isUsingItem must be TRUE now that eating is active");
assert(char.eatRateWatts === 400, `char.eatRateWatts must be 400 W (got ${char.eatRateWatts})`);

// Apple energy should now have decreased
assert(apple.consumableModule!.remainingEnergyJoules < initialAppleEnergy, `Apple energy should now have decreased after explicit repress (was ${initialAppleEnergy}, now ${apple.consumableModule!.remainingEnergyJoules})`);

console.log("🎉 All Apple Prefab and Consumption Suppression tests PASSED successfully!");
