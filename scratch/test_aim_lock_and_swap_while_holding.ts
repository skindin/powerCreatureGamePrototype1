import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";

console.log("=== Testing Aim Lock While Holding & Pickup/Swap With E / B ===");

const arena = new Arena(20, 14, 1.0);
const canvas = {} as HTMLCanvasElement;
const input = new InputManager(canvas, arena);

// Create player character
const char = new Character({ playerId: "gamepad-0", playerNumber: 1, x: 5, y: 5, color: "#f59e0b" });
char.walkingModule = new WalkingModule();
char.pickupModule = new PickupModule();
char.throwModule = new ThrowModule();

const players = new Map<string, { character: Character; isKeyboard: boolean; slotIndex?: number; wasCursorVisible?: boolean; wasHoldingObject?: boolean }>();
players.set("gamepad-0", { character: char, isKeyboard: false, slotIndex: 0 });

// Target entity 1 (enemy box at (8, 5))
const enemyBox = new GameObject({
  id: "enemy-1",
  position: { x: 8, y: 5, z: 0 },
  mass: 2.0,
  colliderRadius: 0.5,
});
arena.entities.push(enemyBox);

// Ground rock at (5.8, 5) (within grab reach of char at (5, 5))
const groundRock = new GameObject({
  id: "ground-rock",
  position: { x: 5.8, y: 5, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
});
arena.entities.push(groundRock);

// Held rock currently in hands
const heldRock = new GameObject({
  id: "held-rock",
  position: { x: 5, y: 5, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
});
char.heldObject = heldRock;
heldRock.isHeld = true;
heldRock.heldBy = char;

let mockAxes = [0, 0, 0, 0];
let mockButtons: any[] = Array(18).fill({ pressed: false, value: 0 });

(navigator as any).getGamepads = () => [
  {
    index: 0,
    connected: true,
    id: "Xbox Controller",
    mapping: "standard",
    axes: mockAxes,
    buttons: mockButtons,
  }
];

// Test 1: Holding an object without moving right stick
// Cursor must stick 3.0 units in front of character (5 + 3 = 8, 5)
input.pollGamepadSlots(players, arena.entities, arena);
const slot0 = input.gamepadSlots.get(0)!;
slot0.isActive = true;
input.pollGamepadSlots(players, arena.entities, arena);

console.log("Test 1: Holding object, cursor sticking in front");
console.log(`   char.position: (${char.position.x.toFixed(2)}, ${char.position.y.toFixed(2)})`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);

if (slot0.hasMovedAimStick === false && Math.abs(slot0.aimPos.x - 8.0) < 0.05) {
  console.log("   PASS: Cursor sticks 3.0 units in front of character.");
} else {
  throw new Error(`FAILED: Cursor not sticking 3 units in front! aimPos: ${JSON.stringify(slot0.aimPos)}`);
}

// Test 2: AutoLock while holding an object but hasn't yet used right joystick!
// Press LT (Button 6)
mockButtons[6] = { pressed: true, value: 1.0 };
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 2: AutoLock (LT) pressed while holding an object before right stick input");
console.log(`   slot0.isLockHeld: ${slot0.isLockHeld}`);

// Simulate character update with autoLock = true
let trajectoryAimPos = slot0.aimPos;
char.updateCharacter(
  1 / 60,
  slot0.movementVector,
  true,
  trajectoryAimPos,
  arena,
  false,
  arena.entities,
  true // autoLock = true
);

console.log(`   char.activeTrajectory?.isAutoLocked: ${char.activeTrajectory?.isAutoLocked}`);
console.log(`   char.activeTrajectory?.targetObject?.id: ${char.activeTrajectory?.targetObject?.id}`);
console.log(`   char.activeTrajectory landPoint: (${char.activeTrajectory?.landPoint.x.toFixed(2)}, ${char.activeTrajectory?.landPoint.y.toFixed(2)})`);

if (char.activeTrajectory?.isAutoLocked && char.activeTrajectory.targetObject === enemyBox) {
  console.log("   PASS: Trajectory cleanly locked onto the enemyBox closest to the cursor!");
} else {
  throw new Error("FAILED: AutoLock did not lock onto the enemyBox closest to the cursor!");
}

// Test 3: Ground item selection while holding an object
// Even though char is holding heldRock, groundRock is within reach (at 5.8, 5)
// findTargetObject should select groundRock (and NOT heldRock)
const reachableGround = [heldRock, groundRock].filter((o) => o !== char.heldObject && !o.isHeld);
const selectedGroundTarget = char.pickupModule!.findTargetObject(char, slot0.aimPos.x, slot0.aimPos.y, reachableGround, arena.wallHeight);

console.log("\nTest 3: Ground item selection while holding an object");
console.log(`   selectedGroundTarget: ${selectedGroundTarget?.id}`);

if (selectedGroundTarget === groundRock) {
  console.log("   PASS: Ground object is selected while holding an object!");
} else {
  throw new Error(`FAILED: Ground object was not selected! Got: ${selectedGroundTarget?.id}`);
}

// Test 4: Swap using B button on controller
// Press B (Button 1)
mockButtons[6] = { pressed: false, value: 0 }; // Release LT
mockButtons[1] = { pressed: true, value: 1.0 }; // Press B
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 4: Pressing B button while holding to drop & grab ground item");
console.log(`   char.heldObject: ${char.heldObject?.id}`);
console.log(`   heldRock.isHeld: ${heldRock.isHeld}`);

if (char.heldObject === groundRock && heldRock.isHeld === false) {
  console.log("   PASS: Pressing B successfully dropped old held object and grabbed the ground item!");
} else {
  throw new Error(`FAILED: B did not swap held object with ground item! held: ${char.heldObject?.id}`);
}

// Test 5: Keyboard E swap test
// Create keyboard character
const kChar = new Character({ playerId: "keyboard", playerNumber: 2, x: 12, y: 7, color: "#06b6d4" });
kChar.walkingModule = new WalkingModule();
kChar.pickupModule = new PickupModule();
kChar.throwModule = new ThrowModule();

const kHeld = new GameObject({ id: "k-held", position: { x: 12, y: 7, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
kChar.heldObject = kHeld;
kHeld.isHeld = true;
kHeld.heldBy = kChar;

const kGround = new GameObject({ id: "k-ground", position: { x: 12.7, y: 7, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
arena.entities.push(kGround);

// Set mouse cursor over kGround
input.mousePos = { x: 12.7, y: 7 };
input.isKeyboardActive = true;

// Simulate onKeyboardPickup (pressing E key)
input.handleInteractions(kChar, arena, arena.entities, undefined, () => [char, kChar]);
input.onKeyboardPickup!();

console.log("\nTest 5: Pressing E on keyboard while holding to drop & grab ground item");
console.log(`   kChar.heldObject: ${kChar.heldObject?.id}`);
console.log(`   kHeld.isHeld: ${kHeld.isHeld}`);

if (kChar.heldObject === kGround && kHeld.isHeld === false) {
  console.log("   PASS: Pressing E on keyboard dropped old held object and grabbed the ground item!");
} else {
  throw new Error(`FAILED: E on keyboard did not swap held object! held: ${kChar.heldObject?.id}`);
}

console.log("\nALL TESTS PASSED CLEANLY!");
