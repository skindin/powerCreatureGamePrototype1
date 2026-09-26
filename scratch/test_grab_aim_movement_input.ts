import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";

console.log("=== Testing Grab & Aim strictly based on latest movement input ===");

const arena = new Arena(20, 14, 1.0);
const canvas = {} as HTMLCanvasElement;
const input = new InputManager(canvas, arena);

const char = new Character({ playerId: "gamepad-0", playerNumber: 1, x: 5, y: 5, color: "#f59e0b" });
char.walkingModule = new WalkingModule();
char.pickupModule = new PickupModule();
char.throwModule = new ThrowModule();

const players = new Map<string, { character: Character; isKeyboard: boolean; slotIndex?: number; wasCursorVisible?: boolean; wasHoldingObject?: boolean }>();
players.set("gamepad-0", { character: char, isKeyboard: false, slotIndex: 0 });

let mockAxes = [0, 0, 0, 0];
let mockButtons: any[] = Array(18).fill(null).map(() => ({ pressed: false, value: 0 }));

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

// Initialize slot
input.pollGamepadSlots(players, arena.entities, arena);
const slot0 = input.gamepadSlots.get(0)!;
slot0.isActive = true;

// Test 1: Empty-handed with nothing to grab: cursor is at character and NOT visible, does NOT follow in front
console.log("\nTest 1: Empty-handed with nothing to grab");
mockAxes = [-1, 0, 0, 0];
input.pollGamepadSlots(players, arena.entities, arena);

console.log(`   movementVector: (${slot0.movementVector.x.toFixed(2)}, ${slot0.movementVector.y.toFixed(2)})`);
console.log(`   lastMovementInputAngle: ${slot0.lastMovementInputAngle?.toFixed(3)} rad (${((slot0.lastMovementInputAngle ?? 0) * 180 / Math.PI).toFixed(1)} deg)`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
if (Math.abs((slot0.lastMovementInputAngle ?? 0) - Math.PI) < 0.01) {
  console.log("   PASS: Angle is strictly Math.PI (180 deg) to the left.");
} else {
  throw new Error(`FAIL: Expected Math.PI, got ${slot0.lastMovementInputAngle}`);
}
// When empty-handed and nothing to grab, cursor stays at character, NOT 3 units in front
if (Math.abs(slot0.aimPos.x - char.position.x) < 0.05 && Math.abs(slot0.aimPos.y - char.position.y) < 0.05) {
  console.log("   PASS: Cursor is at character position, NOT following in front when empty-handed.");
} else {
  throw new Error(`FAIL: Cursor was at (${slot0.aimPos.x}, ${slot0.aimPos.y}) instead of character position (${char.position.x}, ${char.position.y})`);
}

// Test 2: Pickup an item while holding RT before entering range (Continuous hold-to-grab)
console.log("\nTest 2: Continuous hold-to-grab (holding RT before entering range)");
const rock = new GameObject({
  id: "test-rock",
  position: { x: 3.5, y: 5, z: 0 }, // Out of reach initially from (5, 5)
  mass: 0.5,
  colliderRadius: 0.25,
});
arena.entities.push(rock);

// Press and hold RT while out of reach
mockAxes = [0, 0, 0, 0];
mockButtons[7] = { pressed: true, value: 1.0 };
input.pollGamepadSlots(players, arena.entities, arena);
console.log(`   Initial RT press (out of reach): char.heldObject = ${char.heldObject?.id ?? "none"}`);
if (char.heldObject === null) {
  console.log("   PASS: Did not grab rock while out of range.");
} else {
  throw new Error("FAIL: Grabbed rock while out of reach!");
}

// Now move into reach while STILL holding RT
char.position.x = 4.2; // Now rock at 3.5 is within pickup reach (0.7 units away)
input.pollGamepadSlots(players, arena.entities, arena);
console.log(`   After moving into reach while holding RT: char.heldObject = ${char.heldObject?.id ?? "none"}`);
if (char.heldObject === rock) {
  console.log("   PASS: Successfully grabbed rock the instant it entered range while holding RT!");
} else {
  throw new Error("FAIL: Did not grab rock when entering range while holding RT!");
}

// Test 3: Holding item: cursor is now placed directly in front (to the left, Math.PI) based on latest movement input angle
console.log("\nTest 3: Cursor placement upon grabbing while holding item");
console.log(`   slot0.aimPos after grab: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
// Char is at (4.2, 5), last movement angle is Math.PI, so cursor is at (4.2 - 3.0 = 1.2, 5.0)
if (Math.abs(slot0.aimPos.x - 1.2) < 0.05 && Math.abs(slot0.aimPos.y - 5.0) < 0.05) {
  console.log("   PASS: Cursor placed directly in front (to the left) in latest movement input direction!");
} else {
  throw new Error(`FAIL: Expected (1.2, 5.0), got (${slot0.aimPos.x}, ${slot0.aimPos.y})`);
}

// Test 4: Moving while holding item without moving right aim stick: cursor follows in front along movement direction
console.log("\nTest 4: Moving while holding item (axes[1] = 1, moving down)");
mockAxes = [0, 1, 0, 0];
char.position.y = 6.0;
input.pollGamepadSlots(players, arena.entities, arena);
console.log(`   slot0.aimPos while moving down: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
// Downwards input means angle is PI/2, cursor should follow 3 units down from char at (4.2, 6.0): (4.2, 9.0)
if (Math.abs(slot0.aimPos.x - 4.2) < 0.05 && Math.abs(slot0.aimPos.y - 9.0) < 0.05) {
  console.log("   PASS: Cursor follows in front of character while holding item!");
} else {
  throw new Error(`FAIL: Expected (4.2, 9.0), got (${slot0.aimPos.x}, ${slot0.aimPos.y})`);
}

console.log("\nAll tests passed successfully!");
