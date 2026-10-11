import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";

console.log("=== Testing Energy Consumption Integration ===");

const arena = new Arena(20, 20);
const char = new Character({ id: "test_char", x: 5, y: 5, mass: 1.0 });

// 1. Verify default energy pool and bus
if (!char.energyPool || !char.energyBus) {
  throw new Error("Character does not have energyPool or energyBus initialized");
}
char.energyPool.infiniteEnergy = false;
char.energyPool.debugAutoRefillOnEmpty = false;

const initialPoolJoules = char.energyPool.getCurrentEnergy(char.properties);
const initialStamina = char.energyBus.getCurrentStamina(char.properties);
console.log(`Initial Pool: ${initialPoolJoules} J, Initial Stamina: ${initialStamina}`);

// 2. Test Walking Energy Consumption
char.walkingModule!.walkConsumesEnergy = true;
const dt = 1 / 60;
const inputVec = { x: 1, y: 0 };

// Tick walking for 60 frames (1 second)
for (let i = 0; i < 60; i++) {
  char.walkingModule!.update(char, inputVec, dt, arena);
}

const poolAfterWalk = char.energyPool.getCurrentEnergy(char.properties);
console.log(`Pool after 1s walking: ${poolAfterWalk} J (consumed ${initialPoolJoules - poolAfterWalk} J)`);
if (poolAfterWalk >= initialPoolJoules) {
  throw new Error("Walking did not consume energy from energy pool!");
}

// 3. Test Sprinting Stamina & Energy Consumption
char.walkingModule!.sprintConsumesEnergy = true;
char.isSprinting = true;
const poolBeforeSprint = poolAfterWalk;
const staminaBeforeSprint = char.energyBus.getCurrentStamina(char.properties);

for (let i = 0; i < 60; i++) {
  char.walkingModule!.update(char, inputVec, dt, arena);
}

const poolAfterSprint = char.energyPool.getCurrentEnergy(char.properties);
const staminaAfterSprint = char.energyBus.getCurrentStamina(char.properties);
console.log(`Pool after sprint: ${poolAfterSprint} J (consumed ${poolBeforeSprint - poolAfterSprint} J)`);
console.log(`Stamina after sprint: ${staminaAfterSprint} (drained ${staminaBeforeSprint - staminaAfterSprint})`);

if (poolAfterSprint >= poolBeforeSprint) {
  throw new Error("Sprinting did not consume energy!");
}
if (staminaAfterSprint >= staminaBeforeSprint) {
  throw new Error("Sprinting did not drain stamina!");
}

// 4. Test Jump Energy Consumption
char.jumpConsumesEnergy = true;
const poolBeforeJump = poolAfterSprint;
const jumpSuccess = char.jump(arena, inputVec);
const poolAfterJump = char.energyPool.getCurrentEnergy(char.properties);
console.log(`Jump success: ${jumpSuccess}, Pool after jump: ${poolAfterJump} J (consumed ${poolBeforeJump - poolAfterJump} J)`);

if (poolAfterJump >= poolBeforeJump) {
  throw new Error("Jump did not consume energy!");
}

// 5. Test Pickup Energy Consumption
char.pickupModule!.consumesEnergy = true;
const rock = new GameObject({ id: "rock1", x: 5.2, y: 5.2, mass: 2.0 });
const poolBeforePickup = poolAfterJump;
const pickupSuccess = char.pickupModule!.pickup(char, rock);
const poolAfterPickup = char.energyPool.getCurrentEnergy(char.properties);
console.log(`Pickup success: ${pickupSuccess}, Pool after pickup: ${poolAfterPickup} J (consumed ${poolBeforePickup - poolAfterPickup} J)`);

if (poolAfterPickup >= poolBeforePickup) {
  throw new Error("Pickup did not consume energy!");
}

// 6. Test Throw Energy Consumption
char.throwModule!.consumesEnergy = true;
const poolBeforeThrow = poolAfterPickup;
const thrown = char.throwModule!.throwHeldObject(char, 10, 10, arena);
const poolAfterThrow = char.energyPool.getCurrentEnergy(char.properties);
console.log(`Throw success: ${thrown !== null}, Pool after throw: ${poolAfterThrow} J (consumed ${poolBeforeThrow - poolAfterThrow} J)`);

if (poolAfterThrow >= poolBeforeThrow) {
  throw new Error("Throw did not consume energy!");
}

// 7. Test Health Regeneration Energy Consumption
char.healthModule!.consumesEnergy = true;
char.healthModule!.currentHpProp.literalValue = 50; // Wounded
const poolBeforeHeal = poolAfterThrow;
char.healthModule!.update(1.0, char, arena);
const poolAfterHeal = char.energyPool.getCurrentEnergy(char.properties);
console.log(`Pool after 1s heal: ${poolAfterHeal} J (consumed ${poolBeforeHeal - poolAfterHeal} J), HP: ${char.healthModule!.getCurrentHp()}`);

if (poolAfterHeal >= poolBeforeHeal) {
  throw new Error("Healing did not consume energy!");
}

console.log("=== ALL ENERGY CONSUMPTION TESTS PASSED! ===");
