import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";

console.log("=== Testing Controller Aim Cursor & Trajectory Forward/Snap Logic ===");

const arena = new Arena(20, 14, 1.0);
const canvas = {} as HTMLCanvasElement;
const input = new InputManager(canvas, arena);

// Create a character with walking, pickup, and throw
const char = new Character({ playerId: "gamepad-0", playerNumber: 1, x: 10, y: 7, color: "#f59e0b" });
char.walkingModule = new WalkingModule();
char.pickupModule = new PickupModule();
char.throwModule = new ThrowModule();

const players = new Map<string, { character: Character; isKeyboard: boolean; slotIndex?: number; wasCursorVisible?: boolean }>();
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

// Test 1: Initial state - cursor starts at character
input.pollGamepadSlots(players, arena.entities, arena);
const slot0 = input.gamepadSlots.get(0)!;
slot0.isActive = true;
input.pollGamepadSlots(players, arena.entities, arena);
console.log("Test 1: Initial state");
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   char.position: (${char.position.x.toFixed(2)}, ${char.position.y.toFixed(2)})`);
console.log(`   slot0.aimOffset: (${slot0.aimOffset?.x.toFixed(2)}, ${slot0.aimOffset?.y.toFixed(2)})`);

if (slot0.hasMovedAimStick === false && Math.hypot(slot0.aimPos.x - char.position.x, slot0.aimPos.y - char.position.y) < 0.05) {
  console.log("   PASS: Cursor starts at character with aimOffset = 0.");
} else {
  throw new Error("FAILED: Cursor did not start at character!");
}

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

// Test 2: Character moving to the right (Left stick: axes[0] = 1, axes[1] = 0)
// While holding an object and hasMovedAimStick = false, trajectory should project forward in movement direction
mockAxes = [1, 0, 0, 0]; // Left stick moving right (+X)
input.pollGamepadSlots(players, arena.entities, arena);

// Simulate GameLoop update physics logic
let trajectoryAimPos = slot0.aimPos;
if (!slot0.hasMovedAimStick) {
  let dirX = 1;
  let dirY = 0;
  const moveMag = Math.hypot(slot0.movementVector.x, slot0.movementVector.y);
  if (moveMag > 0.05) {
    dirX = slot0.movementVector.x / moveMag;
    dirY = slot0.movementVector.y / moveMag;
  }
  const forwardDist = 3.0;
  trajectoryAimPos = {
    x: char.position.x + dirX * forwardDist,
    y: char.position.y + dirY * forwardDist,
  };
}

char.updateCharacter(
  1 / 60,
  slot0.movementVector,
  true,
  trajectoryAimPos,
  arena,
  false,
  arena.entities,
  false
);

console.log("\nTest 2: Holding object & moving with left stick (before moving right stick)");
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);
console.log(`   trajectoryAimPos: (${trajectoryAimPos.x.toFixed(2)}, ${trajectoryAimPos.y.toFixed(2)})`);
console.log(`   activeTrajectory landing: (${char.activeTrajectory?.landPoint.x.toFixed(2)}, ${char.activeTrajectory?.landPoint.y.toFixed(2)})`);

if (char.activeTrajectory && char.activeTrajectory.landPoint.x > char.position.x + 2.5) {
  console.log("   PASS: Aiming trajectory projected 3 units in movement direction!");
} else {
  throw new Error("FAILED: Trajectory was not projected in movement direction!");
}

// Test 3: Player moves Right Stick Upwards (axes[2] = 0, axes[3] = -1)
// Should snap trajectory to cursor and set hasMovedAimStick = true
mockAxes = [1, 0, 0, -1]; // Left stick right, Right stick up (-Y)
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 3: Moving right stick to aim");
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);

if (slot0.hasMovedAimStick === true && slot0.aimPos.y < char.position.y - 2.5) {
  console.log("   PASS: Cursor snapped in stick direction (~3 units up) and hasMovedAimStick is true.");
} else {
  throw new Error("FAILED: Cursor did not snap in stick direction!");
}

// Update character with current slot0.aimPos
char.updateCharacter(
  1 / 60,
  slot0.movementVector,
  true,
  slot0.aimPos,
  arena,
  false,
  arena.entities,
  false
);

console.log(`   activeTrajectory landing: (${char.activeTrajectory?.landPoint.x.toFixed(2)}, ${char.activeTrajectory?.landPoint.y.toFixed(2)})`);
if (char.activeTrajectory && char.activeTrajectory.landPoint.y < char.position.y - 2.5) {
  console.log("   PASS: Trajectory snapped to the cursor position!");
} else {
  throw new Error("FAILED: Trajectory did not snap to cursor!");
}

// Test 4: Throw object via RT (Button 7)
mockButtons[7] = { pressed: true, value: 1.0 };
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 4: Throwing held object");
console.log(`   char.heldObject: ${char.heldObject ? "holding" : "empty"}`);
console.log(`   slot0.hasMovedAimStick: ${slot0.hasMovedAimStick}`);

if (char.heldObject === null && slot0.hasMovedAimStick === false) {
  console.log("   PASS: Object thrown and hasMovedAimStick cleanly reset to false!");
} else {
  throw new Error("FAILED: Throw did not reset hasMovedAimStick!");
}

console.log("\nSUCCESS! All controller aim and trajectory forward/snap tests passed cleanly!");
