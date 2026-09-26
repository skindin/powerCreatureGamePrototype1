import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";

console.log("=== Testing Pickup (E / B) and Drop (Q / Y) Strict Separation ===");

const arena = new Arena(20, 14, 1.0);
const canvas = {} as HTMLCanvasElement;
const input = new InputManager(canvas, arena);

// 1. Setup keyboard character
const kChar = new Character({ playerId: "keyboard", playerNumber: 1, x: 5, y: 5, color: "#f59e0b" });
kChar.walkingModule = new WalkingModule();
kChar.pickupModule = new PickupModule();

const rock1 = new GameObject({ id: "rock-1", position: { x: 5.5, y: 5, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
arena.entities.push(rock1);

input.isKeyboardActive = true;
input.mousePos = { x: 5.5, y: 5 };

// Bind input manager keyboard actions for kChar
input.handleInteractions(kChar, arena, arena.entities, undefined, () => [kChar]);

console.log("\nTest 1: Empty-handed pressing Q (drop)");
input.onKeyboardDrop!();
console.log(`   kChar.heldObject: ${kChar.heldObject?.id ?? "none"}`);
if (kChar.heldObject === null) {
  console.log("   PASS: Q does not pick up item when empty-handed!");
} else {
  throw new Error("FAILED: Q picked up item when it should only drop!");
}

console.log("\nTest 2: Empty-handed pressing E (pickup)");
input.onKeyboardPickup!();
console.log(`   kChar.heldObject: ${kChar.heldObject?.id ?? "none"}`);
if (kChar.heldObject === rock1 && rock1.isHeld === true) {
  console.log("   PASS: E picks up item and KEEPS holding it!");
} else {
  throw new Error("FAILED: E did not pick up and hold item!");
}

console.log("\nTest 3: Holding item with none in reach, pressing E (pickup)");
// Move character far away from any other entities
kChar.position.x = 10;
kChar.position.y = 10;
input.mousePos = { x: 10, y: 10 };
input.handleInteractions(kChar, arena, arena.entities, undefined, () => [kChar]);
input.onKeyboardPickup!();
console.log(`   kChar.heldObject: ${kChar.heldObject?.id ?? "none"}`);
if (kChar.heldObject === rock1 && rock1.isHeld === true) {
  console.log("   PASS: E does not drop held item when no target to swap with!");
} else {
  throw new Error("FAILED: E dropped held item when no target in reach!");
}

console.log("\nTest 4: Holding item, pressing Q (drop)");
input.onKeyboardDrop!();
console.log(`   kChar.heldObject: ${kChar.heldObject?.id ?? "none"}`);
if (kChar.heldObject === null && rock1.isHeld === false) {
  console.log("   PASS: Q successfully drops held item!");
} else {
  throw new Error("FAILED: Q did not drop held item!");
}

// 2. Setup gamepad character for Y / B tests
console.log("\n--- Testing Controller Y (drop) & B (pickup) ---");
const gChar = new Character({ playerId: "gamepad-0", playerNumber: 2, x: 2, y: 2, color: "#06b6d4" });
gChar.walkingModule = new WalkingModule();
gChar.pickupModule = new PickupModule();

const rock2 = new GameObject({ id: "rock-2", position: { x: 2.5, y: 2, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
arena.entities.push(rock2);

const players = new Map<string, { character: Character; isKeyboard: boolean; slotIndex?: number }>();
players.set("gamepad-0", { character: gChar, isKeyboard: false, slotIndex: 0 });

let mockButtons: any[] = Array(18).fill({ pressed: false, value: 0 });
(navigator as any).getGamepads = () => [
  { index: 0, connected: true, id: "Xbox Controller", axes: [0, 0, 0, 0], buttons: mockButtons }
];

console.log("\nTest 5: Controller empty-handed pressing Y (button 3)");
mockButtons[3] = { pressed: true, value: 1.0 }; // Y pressed
input.pollGamepadSlots(players, arena.entities, arena);
console.log(`   gChar.heldObject: ${gChar.heldObject?.id ?? "none"}`);
if (gChar.heldObject === null) {
  console.log("   PASS: Controller Y does not pick up item when empty-handed!");
} else {
  throw new Error("FAILED: Controller Y picked up item when it should only drop!");
}

console.log("\nTest 6: Controller empty-handed pressing B (button 1)");
mockButtons[3] = { pressed: false, value: 0 }; // Y released
mockButtons[1] = { pressed: true, value: 1.0 }; // B pressed
input.pollGamepadSlots(players, arena.entities, arena);
console.log(`   gChar.heldObject: ${gChar.heldObject?.id ?? "none"}`);
if (gChar.heldObject === rock2 && rock2.isHeld === true) {
  console.log("   PASS: Controller B picks up item and KEEPS holding it!");
} else {
  throw new Error("FAILED: Controller B did not pick up item!");
}

console.log("\nTest 7: Controller holding item, pressing Y (button 3)");
mockButtons[1] = { pressed: false, value: 0 }; // B released
mockButtons[3] = { pressed: true, value: 1.0 }; // Y pressed
input.pollGamepadSlots(players, arena.entities, arena);
console.log(`   gChar.heldObject: ${gChar.heldObject?.id ?? "none"}`);
if (gChar.heldObject === null && rock2.isHeld === false) {
  console.log("   PASS: Controller Y drops held item!");
} else {
  throw new Error("FAILED: Controller Y did not drop held item!");
}

console.log("\nALL TESTS PASSED CLEANLY!");
