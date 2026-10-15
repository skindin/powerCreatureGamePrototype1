import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ConsumableModule } from "../src/engine/ConsumableModule.js";
import { ConsumeModule } from "../src/character/ConsumeModule.js";
import { Arena } from "../src/engine/Arena.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";
import { EntityPass } from "../src/engine/rendering/EntityPass.js";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== Running Grab & Eat Suppression and Consumable Ring Tests ===");

// 1. Setup Arena, PlayerManager, Character, and Objects
const arena = new Arena();
const inputManager = new InputManager({} as any, arena);
const hero = new Character({
  name: "Hero",
  x: 5,
  y: 5,
  colliderRadius: 0.44
});
hero.consumeModule = new ConsumeModule({ acceptedTags: ["food"] });

const playerManager = new PlayerManager({
  arena,
  inputManager,
  character: hero
});

// A consumable apple in the hero's hand
const apple = new GameObject({
  id: "apple-1",
  position: { x: 5.2, y: 5, z: 1 },
  consumableModule: new ConsumableModule({
    tag: "food",
    totalEnergyJoules: 100,
    consumeRateWatts: 50
  })
});

// A second object (clone) sitting right on the ground near the hero
const cloneApple = new GameObject({
  id: "apple-clone",
  position: { x: 5.3, y: 5, z: 1 },
  consumableModule: new ConsumableModule({
    tag: "food",
    totalEnergyJoules: 100,
    consumeRateWatts: 50
  })
});

const objects: GameObject[] = [apple, cloneApple];

// Hero picks up the apple while mouse is up
inputManager.isMouseDown = false;
hero.pickupModule!.pickup(hero, apple);
assert(hero.heldObject === apple, "Hero should be holding the apple");
playerManager.applyPlayerInputs(playerManager.capturePlayerInputs(false, objects), 0.016, objects, false);

// 2. Player presses and holds mouse to eat the apple
inputManager.isMouseDown = true;

// Capture player inputs
let inputs = playerManager.capturePlayerInputs(false, objects);
let kPkt = inputs.get("keyboard")!;
assert(kPkt.isUsingItem === true, "isUsingItem should be true while holding consumable and mouse is pressed to eat");
assert(kPkt.isGrabHeld === false, "isGrabHeld should be false while eating consumable");
assert(kPkt.grabTargetObjectId === null, "grabTargetObjectId should be null while eating consumable");

// Apply input: simulate eating until depleted
console.log("Eating apple...");
for (let i = 0; i < 5; i++) {
  playerManager.applyPlayerInputs(inputs, 0.5, objects, false);
}

assert(apple.consumableModule!.isConsumed, "Apple should be consumed");
assert(hero.heldObject === null, "Hero's hand should now be empty after eating");
assert(!objects.includes(apple), "Apple should be removed from objects array");

// 3. CRITICAL CHECK 1: POST-EATING GRAB SUPPRESSION
// Player has NOT released the mouse yet! (inputManager.isMouseDown is still true)
console.log("Checking grab suppression while mouse is still held after eating...");

inputs = playerManager.capturePlayerInputs(false, objects);
kPkt = inputs.get("keyboard")!;

assert(kPkt.isGrabHeld === false, "isGrabHeld MUST be false because mouse was not released since hand became empty!");
assert(kPkt.grabTargetObjectId === null, "grabTargetObjectId MUST be null - no auto grab!");

// Run physics / apply inputs: hero must NOT grab cloneApple!
playerManager.applyPlayerInputs(inputs, 0.016, objects, false);
assert(hero.heldObject === null, "Hero must NOT auto-grab cloneApple while mouse is held!");

// Run a few more frames with mouse still down: hero still must not grab!
for (let f = 0; f < 10; f++) {
  inputs = playerManager.capturePlayerInputs(false, objects);
  playerManager.applyPlayerInputs(inputs, 0.016, objects, false);
}
assert(hero.heldObject === null, "Hero must remain empty-handed as long as mouse has not been released!");
console.log("PASS: Grab suppression successfully prevented auto-grab while mouse was held down!");

// 4. Release mouse
console.log("Releasing mouse...");
inputManager.isMouseDown = false;
inputs = playerManager.capturePlayerInputs(false, objects);
playerManager.applyPlayerInputs(inputs, 0.016, objects, false);

// 5. Now press mouse again to seek grab
console.log("Pressing mouse down anew to seek grab...");
inputManager.isMouseDown = true;
// Position mouse near cloneApple
inputManager.actualMousePos.x = cloneApple.position.x;
inputManager.actualMousePos.y = cloneApple.position.y;

inputs = playerManager.capturePlayerInputs(false, objects);
kPkt = inputs.get("keyboard")!;

assert(kPkt.isGrabHeld === true, "isGrabHeld should now be true because mouse was pressed anew after releasing!");
assert(kPkt.grabTargetObjectId === cloneApple.id, `grabTargetObjectId should target cloneApple, got ${kPkt.grabTargetObjectId}`);

// Apply inputs: hero picks up cloneApple while mouse is HELD DOWN
playerManager.applyPlayerInputs(inputs, 0.016, objects, false);
assert(hero.heldObject === cloneApple, "Hero should now successfully pick up cloneApple!");
console.log("PASS: Hero grabbed cloneApple!");

// 6. CRITICAL CHECK 2: POST-PICKUP EAT SUPPRESSION
// Player is STILL holding mouse from the grab!
console.log("Checking eat suppression: must not eat immediately upon picking up item while mouse is still held from grab...");
inputs = playerManager.capturePlayerInputs(false, objects);
kPkt = inputs.get("keyboard")!;

assert(kPkt.isUsingItem === false, "isUsingItem MUST be false because mouse was not released and repressed after pickup!");
playerManager.applyPlayerInputs(inputs, 0.5, objects, false);
assert(hero.eatRateWatts === 0, "eatRateWatts must be 0 - not eating!");
assert(cloneApple.consumableModule!.remainingEnergyJoulesProp.literalValue === 100, "cloneApple energy must be unconsumed 100J!");

// Run 5 more frames with mouse held down: still no eating!
for (let f = 0; f < 5; f++) {
  inputs = playerManager.capturePlayerInputs(false, objects);
  playerManager.applyPlayerInputs(inputs, 0.1, objects, false);
}
assert(hero.eatRateWatts === 0, "Hero still must not eat while mouse remains held from grab!");
assert(cloneApple.consumableModule!.remainingEnergyJoulesProp.literalValue === 100, "cloneApple energy still untouched!");
console.log("PASS: Eating correctly suppressed while mouse remained held from pickup!");

// 7. Now release mouse and press it anew: NOW it should eat!
console.log("Releasing mouse and repressing to eat...");
inputManager.isMouseDown = false;
inputs = playerManager.capturePlayerInputs(false, objects);
playerManager.applyPlayerInputs(inputs, 0.016, objects, false);

inputManager.isMouseDown = true;
inputs = playerManager.capturePlayerInputs(false, objects);
kPkt = inputs.get("keyboard")!;

assert(kPkt.isUsingItem === true, "isUsingItem MUST now be true after releasing and repressing mouse!");
playerManager.applyPlayerInputs(inputs, 0.5, objects, false);
assert(hero.eatRateWatts > 0, "eatRateWatts should be > 0 (eating active)!");
assert(cloneApple.consumableModule!.remainingEnergyJoulesProp.literalValue < 100, "cloneApple energy should now be decreasing!");
console.log("PASS: Successfully started eating after releasing and repressing mouse!");

// 8. Test clean circular ring method exists on EntityPass
assert(typeof EntityPass.drawConsumableEatingRing === "function", "drawConsumableEatingRing should be a function");
console.log("PASS: EntityPass drawConsumableEatingRing verified!");

console.log("ALL TESTS PASSED SUCCESSFULLY!");
