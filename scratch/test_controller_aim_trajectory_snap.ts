import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";

console.log("=== Testing Controller Aim Cursor Forward Follow & Joystick Decoupling ===");

const arena = new Arena(20, 14, 1.0);
const canvas = {} as HTMLCanvasElement;
const input = new InputManager(canvas, arena);

// Create a character with walking, pickup, and throw
const char = new Character({ playerId: "gamepad-0", playerNumber: 1, x: 10, y: 7, color: "#f59e0b" });
char.walkingModule = new WalkingModule();
char.pickupModule = new PickupModule();
char.throwModule = new ThrowModule();

const players = new Map<string, { character: Character; isKeyboard: boolean; slotIndex?: number; wasCursorVisible?: boolean; wasHoldingObject?: boolean }>();
players.set("gamepad-0", { character: char, isKeyboard: false, slotIndex: 0 });

// Mock gamepad with standard mapping
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

// Give character a rock to hold
const rock = new GameObject({
  id: "rock1",
  position: { x: 10, y: 7, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
  hasGravity: true,
  hasVerticalVelocity: true,
});
char.heldObject = rock;
rock.isHeld = true;
rock.heldBy = char;

// Test 1: Initial state - cursor sticks to position in front of character (default facing right: x + 3.0)
input.pollGamepadSlots(players, arena.entities, arena);
const slot0 = input.gamepadSlots.get(0)!;
slot0.isActive = true;
input.pollGamepadSlots(players, arena.entities, arena);

console.log("Test 1: Initial state while holding object");
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   char.position: (${char.position.x.toFixed(2)}, ${char.position.y.toFixed(2)})`);
console.log(`   slot0.aimOffset: (${slot0.aimOffset?.x.toFixed(2)}, ${slot0.aimOffset?.y.toFixed(2)})`);

const expectedInitialX = char.position.x + 3.0;
if (slot0.hasMovedAimStick === false && Math.abs(slot0.aimPos.x - expectedInitialX) < 0.05) {
  console.log("   PASS: Cursor sticks 3.0 units in front of character.");
} else {
  throw new Error(`FAILED: Cursor is not sticking 3 units in front! Expected X: ${expectedInitialX}, got: ${slot0.aimPos.x}`);
}

// Test 2: Moving character with left stick (moving up: axes[0] = 0, axes[1] = -1)
// Cursor should follow dynamically in front of character (facing up: y - 3.0)
mockAxes = [0, -1, 0, 0];
char.position.y = 6.5; // Simulate character walked up
input.pollGamepadSlots(players, arena.entities, arena);
char.updateCharacter(1 / 60, slot0.movementVector, true, slot0.aimPos, arena);

console.log("\nTest 2: Moving with left stick before right stick input");
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   char.position: (${char.position.x.toFixed(2)}, ${char.position.y.toFixed(2)})`);

const expectedUpY = char.position.y - 3.0;
if (slot0.hasMovedAimStick === false && Math.abs(slot0.aimPos.y - expectedUpY) < 0.05) {
  console.log("   PASS: Cursor dynamically followed character and swung 3.0 units in front (facing up)!");
} else {
  throw new Error(`FAILED: Cursor did not follow in front of character! Expected Y: ${expectedUpY}, got: ${slot0.aimPos.y}`);
}

// Test 3: Player moves right stick to aim (e.g. right joystick pushed right: axes[2] = 1, axes[3] = 0)
// Cursor should start moving starting from where it was following in front of character (char.x, char.y - 3)
const prevAimX = slot0.aimPos.x;
const prevAimY = slot0.aimPos.y;
mockAxes = [0, 0, 1, 0]; // Right stick moving right (+X)
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 3: Moving right stick to aim");
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);

if (slot0.hasMovedAimStick === true && slot0.aimPos.x > prevAimX && Math.abs(slot0.aimPos.y - prevAimY) < 0.05) {
  console.log("   PASS: Cursor started moving starting at where it was following in front of the character!");
} else {
  throw new Error("FAILED: Cursor did not move seamlessly from forward position!");
}

// Test 4: Release right stick, now move character around with left stick.
// The cursor should NOT follow the character anymore; it must stay put at its world coordinates!
const lockedWorldAimPos = { x: slot0.aimPos.x, y: slot0.aimPos.y };
mockAxes = [-1, 0, 0, 0]; // Left stick left, right stick centered
char.position.x = 8.0; // Character moves left in arena
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 4: Character moves after right stick was used");
console.log(`   char.position: (${char.position.x.toFixed(2)}, ${char.position.y.toFixed(2)})`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   lockedWorldAimPos: (${lockedWorldAimPos.x.toFixed(2)}, ${lockedWorldAimPos.y.toFixed(2)})`);

if (Math.abs(slot0.aimPos.x - lockedWorldAimPos.x) < 0.001 && Math.abs(slot0.aimPos.y - lockedWorldAimPos.y) < 0.001) {
  console.log("   PASS: Cursor stayed put at world position and did NOT follow the character!");
} else {
  throw new Error("FAILED: Cursor followed character after right stick was used!");
}

// Test 5: Throw held object via RT (Button 7)
mockButtons = Array(18).fill(null).map(() => ({ pressed: false, value: 0 }));
mockButtons[7] = { pressed: true, value: 1.0 };
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 5: Throwing held object");
console.log(`   char.heldObject: ${char.heldObject ? "holding" : "empty"}`);
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);

if (char.heldObject === null && slot0.hasMovedAimStick === false) {
  console.log("   PASS: Object thrown and hasMovedAimStick reset to false!");
} else {
  throw new Error("FAILED: hasMovedAimStick was not reset on throw!");
}

// Test 6: Pick up a new object (holding something again)
const rock2 = new GameObject({
  id: "rock2",
  position: { x: char.position.x + 0.5, y: char.position.y, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
});
char.heldObject = rock2;
rock2.isHeld = true;
rock2.heldBy = char;

mockButtons[7] = { pressed: false, value: 0 };
mockAxes = [1, 0, 0, 0]; // Moving right
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 6: Holding something again");
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   char.position: (${char.position.x.toFixed(2)}, ${char.position.y.toFixed(2)})`);

if (slot0.hasMovedAimStick === false && Math.abs(slot0.aimPos.x - (char.position.x + 3.0)) < 0.05) {
  console.log("   PASS: Cursor sticks in front of character again upon holding a new object!");
} else {
  throw new Error("FAILED: Cursor did not return to sticking in front of character after holding something again!");
}

console.log("\nALL TESTS PASSED CLEANLY!");
