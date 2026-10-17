import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ConsumableModule } from "../src/engine/ConsumableModule.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";

// Mock canvas
const canvasMock = {
  width: 800,
  height: 600,
  addEventListener: () => {},
  removeEventListener: () => {},
  classList: { add: () => {}, remove: () => {} },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
} as unknown as HTMLCanvasElement;

const arena = new Arena({ width: 30, height: 20 });
const inputManager = new InputManager(canvasMock, arena);
const baseChar = new Character({ id: "char-1", x: 10, y: 10, playerId: "keyboard" });
const playerManager = new PlayerManager({ arena, inputManager, character: baseChar });

// Create an apple (food consumable)
const apple = new GameObject({
  id: "apple-1",
  x: 10,
  y: 10,
  consumableModule: new ConsumableModule({
    tag: "food",
    totalEnergyJoules: 500,
    healRate: 10,
    consumeRateWatts: 50,
  }),
});

console.log("=== Test 1: Holding an item with non-directional primary ability (food) without Alt ===");
// Pick up the apple
baseChar.heldObject = apple;
apple.isHeld = true;
apple.heldBy = baseChar;

// Simulate mouse position at (25, 25), movement input walking right (1, 0)
inputManager.isKeyboardActive = true;
inputManager.isKeyboardSuspended = false;
inputManager.actualMousePos = { x: 25, y: 25 };
inputManager.movementVector = { x: 1, y: 0 };
inputManager.isAltHeld = false;
inputManager.isMouseDown = false;

// Character facingAngle initially 0
baseChar.facingAngle = 0;

// Capture inputs
let inputPackets = playerManager.capturePlayerInputs(false, [apple]);
let kPkt = inputPackets.get("keyboard")!;

console.log("isAiming when Alt is NOT held:", kPkt.isAiming);
console.log("facingAngle matches movement direction (0 rad):", kPkt.facingAngle === 0);
if (kPkt.isAiming !== false) {
  throw new Error("FAIL: isAiming should be false when Alt is not held for non-directional item");
}

// Character update tick
baseChar.updateCharacter(
  1 / 60,
  { x: kPkt.moveX, y: kPkt.moveY },
  kPkt.isAiming,
  { x: kPkt.aimX, y: kPkt.aimY },
  arena,
  false,
  [apple],
  false
);

console.log("activeTrajectory should be null:", baseChar.activeTrajectory === null);
if (baseChar.activeTrajectory !== null) {
  throw new Error("FAIL: activeTrajectory should not be computed when Alt is not held for food");
}

console.log("\n=== Test 2: Pressing LMB without Alt triggers item use (eating), NOT throw ===");
inputManager.isMouseDown = true;
inputPackets = playerManager.capturePlayerInputs(false, [apple]);
kPkt = inputPackets.get("keyboard")!;

console.log("kPkt.isUsingItem:", kPkt.isUsingItem);
console.log("kPkt.isThrow:", kPkt.isThrow);
if (!kPkt.isUsingItem || kPkt.isThrow) {
  throw new Error(`FAIL: Expected isUsingItem=true and isThrow=false, got isUsingItem=${kPkt.isUsingItem}, isThrow=${kPkt.isThrow}`);
}

console.log("\n=== Test 3: Holding Alt swaps to Throw ability ===");
inputManager.isMouseDown = false;
inputManager.isAltHeld = true;

inputPackets = playerManager.capturePlayerInputs(false, [apple]);
kPkt = inputPackets.get("keyboard")!;

console.log("isAiming when Alt IS held:", kPkt.isAiming);
console.log("Character facing angle faces mouse cursor (aimX: 25, aimY: 25):");
const expectedAimAngle = Math.atan2(25 - 10, 25 - 10); // ~0.785 rad (45 deg)
console.log(`Expected angle: ${expectedAimAngle.toFixed(3)}, facingAngle: ${kPkt.facingAngle.toFixed(3)}`);
if (Math.abs(kPkt.facingAngle - expectedAimAngle) > 0.05) {
  throw new Error(`FAIL: Expected facingAngle to face cursor (~${expectedAimAngle}), got ${kPkt.facingAngle}`);
}

baseChar.updateCharacter(
  1 / 60,
  { x: kPkt.moveX, y: kPkt.moveY },
  kPkt.isAiming,
  { x: kPkt.aimX, y: kPkt.aimY },
  arena,
  false,
  [apple],
  false
);

console.log("activeTrajectory when Alt is held:", baseChar.activeTrajectory !== null);
if (baseChar.activeTrajectory === null) {
  throw new Error("FAIL: activeTrajectory should be active and previewed when Alt is held");
}

console.log("\n=== Test 4: Holding a regular object with NO other ability (default throw) ===");
const rock = new GameObject({ id: "rock-1", x: 10, y: 10 });
baseChar.heldObject = rock;
rock.isHeld = true;
rock.heldBy = baseChar;
inputManager.isAltHeld = false; // Alt not held

inputPackets = playerManager.capturePlayerInputs(false, [rock]);
kPkt = inputPackets.get("keyboard")!;

console.log("isAiming for object with NO other ability (Alt not held):", kPkt.isAiming);
console.log("facingAngle faces cursor:", Math.abs(kPkt.facingAngle - expectedAimAngle) < 0.05);
if (kPkt.isAiming !== true) {
  throw new Error("FAIL: Object with no other ability should default to throw and aim");
}

baseChar.updateCharacter(
  1 / 60,
  { x: kPkt.moveX, y: kPkt.moveY },
  kPkt.isAiming,
  { x: kPkt.aimX, y: kPkt.aimY },
  arena,
  false,
  [rock],
  false
);

console.log("activeTrajectory for rock:", baseChar.activeTrajectory !== null);
if (baseChar.activeTrajectory === null) {
  throw new Error("FAIL: Trajectory should be drawn for object with no other ability");
}

console.log("\n✅ ALL ABILITY SWAP AND NON-DIRECTIONAL AIMING TESTS PASSED!");
