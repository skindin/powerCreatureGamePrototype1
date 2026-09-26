import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";

console.log("=== Testing Controller Aim Cursor Around Grabbables Starts At Character ===");

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

// Grabbable rock placed at (6, 5) — within grab distance (default reach is ~1.5 - 2.0u)
const rock = new GameObject({
  id: "rock1",
  position: { x: 6, y: 5, z: 0 },
  mass: 0.5,
  colliderRadius: 0.25,
});
arena.entities.push(rock);

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

// Poll gamepad initially
input.pollGamepadSlots(players, arena.entities, arena);
const slot0 = input.gamepadSlots.get(0)!;
slot0.isActive = true;

// Set a dummy non-zero offset to simulate a previous aim action
slot0.aimPos = { x: 15, y: 12 };
slot0.aimOffset = { x: 10, y: 7 };

// Test 1: Empty-handed and around something to grab:
// Poll gamepad slots — cursor MUST start at character, NOT at the latest offset (15, 12)!
input.pollGamepadSlots(players, arena.entities, arena);

console.log("Test 1: Empty-handed around something to grab (before moving right stick)");
console.log(`   char.position: (${char.position.x.toFixed(2)}, ${char.position.y.toFixed(2)})`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   slot0.aimOffset: (${slot0.aimOffset?.x.toFixed(2)}, ${slot0.aimOffset?.y.toFixed(2)})`);
console.log(`   slot0.aimMovedWhileInRange: ${slot0.aimMovedWhileInRange}`);

const distToChar = Math.hypot(slot0.aimPos.x - char.position.x, slot0.aimPos.y - char.position.y);
if (distToChar < 0.05 && slot0.aimOffset.x === 0 && slot0.aimOffset.y === 0) {
  console.log("   PASS: Cursor started directly at character (offset 0,0) instead of latest offset (15, 12)!");
} else {
  throw new Error(`FAILED: Cursor did not start at character! dist: ${distToChar}, offset: ${JSON.stringify(slot0.aimOffset)}`);
}

// Test 2: Deflect right joystick to aim at the rock (axes[2] = 1, axes[3] = 0)
// Cursor should move starting from character (5, 5) towards the right (+X)
mockAxes = [0, 0, 1, 0]; // Right stick moving right
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 2: Deflecting right stick while around grabbable");
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   slot0.aimMovedWhileInRange: ${slot0.aimMovedWhileInRange}`);

if (slot0.aimMovedWhileInRange === true && slot0.aimPos.x > 5.0 && Math.abs(slot0.aimPos.y - 5.0) < 0.05) {
  console.log("   PASS: Cursor moved outward starting directly from character!");
} else {
  throw new Error(`FAILED: Cursor did not move outward from character! aimPos: ${JSON.stringify(slot0.aimPos)}`);
}

// Test 3: Player moves far away from all objects (e.g. to (15, 12))
char.position.x = 15;
char.position.y = 12;
mockAxes = [0, 0, 0, 0];
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 3: Moved out of reach of all objects");
console.log(`   slot0.aimMovedWhileInRange: ${slot0.aimMovedWhileInRange}`);
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);

if (slot0.aimMovedWhileInRange === false && Math.hypot(slot0.aimPos.x - 15, slot0.aimPos.y - 12) < 0.05) {
  console.log("   PASS: Out of reach cleanly reset aimMovedWhileInRange and tracks character!");
} else {
  throw new Error("FAILED: Did not cleanly reset when moving out of reach!");
}

// Place a new crate near the player at (15.8, 12)
const crate = new GameObject({
  id: "crate1",
  position: { x: 15.8, y: 12, z: 0 },
  mass: 1.0,
  colliderRadius: 0.35,
});
arena.entities.push(crate);

// Simulate player aimed somewhere else before approaching
slot0.aimPos = { x: 2, y: 2 };
slot0.aimOffset = { x: -13, y: -10 };

// Test 4: Player is now around crate1
input.pollGamepadSlots(players, arena.entities, arena);

console.log("\nTest 4: Around new grabbable crate");
console.log(`   slot0.aimPos: (${slot0.aimPos.x.toFixed(2)}, ${slot0.aimPos.y.toFixed(2)})`);
console.log(`   slot0.aimOffset: (${slot0.aimOffset?.x.toFixed(2)}, ${slot0.aimOffset?.y.toFixed(2)})`);

if (Math.hypot(slot0.aimPos.x - char.position.x, slot0.aimPos.y - char.position.y) < 0.05) {
  console.log("   PASS: Cursor starts at character again, NOT at the previous offset!");
} else {
  throw new Error("FAILED: Cursor did not start at character when around a new grabbable!");
}

console.log("\nALL GRABBABLE CURSOR POSITION TESTS PASSED CLEANLY!");
