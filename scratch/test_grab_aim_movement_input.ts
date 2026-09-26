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

// Test 1: Move left (axes[0] = -1, axes[1] = 0)
console.log("\nTest 1: Moving left (inputVector.x = -1)");
mockAxes = [-1, 0, 0, 0];
input.pollGamepadSlots(players, arena.entities, arena);

console.log(`   movementVector: (${slot0.movementVector.x.toFixed(2)}, ${slot0.movementVector.y.toFixed(2)})`);
console.log(`   lastMovementInputAngle: ${slot0.lastMovementInputAngle?.toFixed(3)} rad (${((slot0.lastMovementInputAngle ?? 0) * 180 / Math.PI).toFixed(1)} deg)`);
if (Math.abs((slot0.lastMovementInputAngle ?? 0) - Math.PI) < 0.01) {
  console.log("   PASS: Angle is strictly Math.PI (180 deg) to the left.");
} else {
  throw new Error(`FAIL: Expected Math.PI, got ${slot0.lastMovementInputAngle}`);
}

// Test 2: Stop moving while facing an obstacle where velocity might be zero or distorted
console.log("\nTest 2: Stick released to neutral after moving left");
mockAxes = [0, 0, 0, 0];
// Pretend character has arbitrary non-zero velocity or zero velocity due to wall
char.velocity.x = 0;
char.velocity.y = 2.5; // Suppose collision pushed them along wall
input.pollGamepadSlots(players, arena.entities, arena);

console.log(`   char.velocity: (${char.velocity.x.toFixed(2)}, ${char.velocity.y.toFixed(2)})`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
// Should be 3 units to the LEFT (x = 5 - 3 = 2, y = 5) based on movement input, NOT y-velocity!
if (Math.abs(slot0.aimPos.x - 2.0) < 0.05 && Math.abs(slot0.aimPos.y - 5.0) < 0.05) {
  console.log("   PASS: Cursor sticks 3 units to the left based strictly on latest movement input, completely ignoring velocity!");
} else {
  throw new Error(`FAIL: Cursor position (${slot0.aimPos.x}, ${slot0.aimPos.y}) does not match expected (2.0, 5.0)`);
}

// Test 3: Pickup an item while holding RT before entering range (Continuous hold-to-grab)
console.log("\nTest 3: Continuous hold-to-grab (holding RT before entering range)");
const rock = new GameObject({
  id: "test-rock",
  position: { x: 3.5, y: 5, z: 0 }, // Out of reach initially from (5, 5)
  mass: 0.5,
  colliderRadius: 0.25,
});
arena.entities.push(rock);

// Press and hold RT
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

// Test 4: Cursor position after grab
console.log("\nTest 4: Cursor placement upon grabbing");
console.log(`   slot0.aimPos after grab: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
// Char is at (4.2, 5), facing left (PI), so cursor should be at (4.2 - 3 = 1.2, 5.0)
if (Math.abs(slot0.aimPos.x - 1.2) < 0.05 && Math.abs(slot0.aimPos.y - 5.0) < 0.05) {
  console.log("   PASS: Cursor placed directly in front (to the left) in latest movement input direction!");
} else {
  throw new Error(`FAIL: Expected (1.2, 5.0), got (${slot0.aimPos.x}, ${slot0.aimPos.y})`);
}

console.log("\nAll tests passed successfully!");
