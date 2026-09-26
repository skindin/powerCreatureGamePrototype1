import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { WalkingModule } from "../src/character/WalkingModule.js";
import { PickupModule } from "../src/character/PickupModule.js";
import { ThrowModule } from "../src/character/ThrowModule.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";

console.log("=== Testing Q/Y Drop & E/B Pickup with Drop/Pickup Doubling ===");

const arena = new Arena(20, 14, 1.0);
const canvas = {
  width: 1000,
  height: 700,
  getContext: () => ({ canvas: { width: 1000, height: 700 } }),
  addEventListener: () => {},
} as unknown as HTMLCanvasElement;

const input = new InputManager(canvas, arena);

// --- KEYBOARD TESTS ---
console.log("\n--- KEYBOARD TESTS ---");
const kChar = new Character({ playerId: "keyboard", playerNumber: 1, x: 5, y: 5, color: "#f59e0b" });
kChar.walkingModule = new WalkingModule();
kChar.pickupModule = new PickupModule();
kChar.throwModule = new ThrowModule();

const kHeld = new GameObject({ id: "k-held", position: { x: 5, y: 5, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
kChar.heldObject = kHeld;
kHeld.isHeld = true;
kHeld.heldBy = kChar;

input.isKeyboardActive = true;
input.handleInteractions(kChar, arena, [kHeld], undefined, () => [kChar]);

// Test K1: Holding an item, none within range to pick up. Pressing E doubles as drop control and drops the item!
input.onKeyboardPickup!();
console.log("K1: Holding item with none in range, pressing E: heldObject =", kChar.heldObject);
if (kChar.heldObject !== null || kHeld.isHeld !== false) {
  throw new Error("FAILED: E should double as drop control and drop held item when none in range!");
}
console.log("   PASS: E doubled as drop control when none in range to pick up.");

// Re-grab kHeld for Test K2
kChar.heldObject = kHeld;
kHeld.isHeld = true;
kHeld.heldBy = kChar;

// Test K2: Holding an item, pressing Q drops the held item
input.onKeyboardDrop!();
console.log("K2: Pressing Q: heldObject =", kChar.heldObject);
if (kChar.heldObject !== null || kHeld.isHeld !== false) {
  throw new Error("FAILED: Q should drop the held item!");
}
console.log("   PASS: Q successfully dropped the held item onto the ground.");

// Test K3: Empty-handed, ground item in reach. Pressing Q (drop control) doubles as pickup control and picks it up!
input.mousePos = { x: 5, y: 5 };
input.isCursorVisible = true;
input.handleInteractions(kChar, arena, [kHeld], undefined, () => [kChar]);
input.onKeyboardDrop!();
console.log("K3: Empty-handed pressing Q: heldObject =", kChar.heldObject?.id);
if (kChar.heldObject !== kHeld || kHeld.isHeld !== true) {
  throw new Error("FAILED: Q should double as pickup control when empty-handed near ground item!");
}
console.log("   PASS: Q doubled as pickup control and picked up ground item.");

// Test K4: Holding an item AND ground item in reach. Pressing E swaps them!
const kGround2 = new GameObject({ id: "k-ground-2", position: { x: 5.5, y: 5, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
arena.entities = [kChar, kHeld, kGround2];
input.mousePos = { x: 5.5, y: 5 };
input.isCursorVisible = true;
input.handleInteractions(kChar, arena, [kHeld, kGround2], undefined, () => [kChar]);
input.onKeyboardPickup!();
console.log("K4: Holding item with ground item selected, pressing E: heldObject =", kChar.heldObject?.id);
if (kChar.heldObject !== kGround2 || kHeld.isHeld !== false || kGround2.isHeld !== true) {
  throw new Error(`FAILED: E should swap held item with ground item! Got: ${kChar.heldObject?.id}`);
}
console.log("   PASS: E cleanly swapped the held item with the targeted ground item.");


// --- CONTROLLER TESTS ---
console.log("\n--- CONTROLLER TESTS ---");
const cChar = new Character({ playerId: "gamepad-0", playerNumber: 2, x: 10, y: 10, color: "#06b6d4" });
cChar.walkingModule = new WalkingModule();
cChar.pickupModule = new PickupModule();
cChar.throwModule = new ThrowModule();

const cHeld = new GameObject({ id: "c-held", position: { x: 10, y: 10, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
cChar.heldObject = cHeld;
cHeld.isHeld = true;
cHeld.heldBy = cChar;

const players = new Map<string, { character: Character; isKeyboard: boolean; slotIndex?: number }>();
players.set("gamepad-0", { character: cChar, isKeyboard: false, slotIndex: 0 });

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

input.pollGamepadSlots(players, [cHeld], arena, [cChar]);
const slot0 = input.gamepadSlots.get(0)!;
slot0.isActive = true;

// Test C1: Holding an item, none within range to pick up. Pressing B (button 1) doubles as drop control and drops the item!
mockButtons[1] = { pressed: true, value: 1.0 };
input.pollGamepadSlots(players, [cHeld], arena, [cChar]);
console.log("C1: Holding item with none in range, pressing B: heldObject =", cChar.heldObject);
if (cChar.heldObject !== null || cHeld.isHeld !== false) {
  throw new Error("FAILED: Controller B should double as drop control and drop held item when none in range!");
}
console.log("   PASS: Controller B doubled as drop control and dropped held item.");

// Re-grab cHeld for Test C2
cChar.heldObject = cHeld;
cHeld.isHeld = true;
cHeld.heldBy = cChar;
mockButtons[1] = { pressed: false, value: 0 };
input.pollGamepadSlots(players, [cHeld], arena, [cChar]); // Clear state

// Test C2: Holding an item, pressing Y (button 3) drops the held item!
mockButtons[3] = { pressed: true, value: 1.0 };
input.pollGamepadSlots(players, [cHeld], arena, [cChar]);
console.log("C2: Pressing Y (button 3): heldObject =", cChar.heldObject);
if (cChar.heldObject !== null || cHeld.isHeld !== false) {
  throw new Error("FAILED: Controller Y (button 3) should drop the held item!");
}
console.log("   PASS: Controller Y (button 3) successfully dropped the held item onto the ground.");

// Test C3: Empty-handed, ground item in reach. Pressing Y (button 3) doubles as pickup control and picks it up!
mockButtons[3] = { pressed: false, value: 0 };
input.pollGamepadSlots(players, [cHeld], arena, [cChar]); // Clear state

mockButtons[3] = { pressed: true, value: 1.0 };
slot0.aimPos = { x: 10, y: 10 };
slot0.isCursorVisible = true;
input.pollGamepadSlots(players, [cHeld], arena, [cChar]);
console.log("C3: Empty-handed pressing Y: heldObject =", cChar.heldObject?.id);
if (cChar.heldObject !== cHeld || cHeld.isHeld !== true) {
  throw new Error("FAILED: Controller Y should double as pickup control when empty-handed near ground item!");
}
console.log("   PASS: Controller Y doubled as pickup control and picked up ground item.");

// Test C4: Holding an item AND ground item in reach. Pressing B swaps them!
const cGround2 = new GameObject({ id: "c-ground-2", position: { x: 10.5, y: 10, z: 0 }, mass: 0.5, colliderRadius: 0.25 });
mockButtons[3] = { pressed: false, value: 0 };
input.pollGamepadSlots(players, [cHeld, cGround2], arena, [cChar]); // Clear state

mockButtons[1] = { pressed: true, value: 1.0 }; // Press B to swap
slot0.aimPos = { x: 10.5, y: 10 };
slot0.isCursorVisible = true;
input.pollGamepadSlots(players, [cHeld, cGround2], arena, [cChar]);
console.log("C4: Holding item with ground item selected, pressing B: heldObject =", cChar.heldObject?.id);
if (cChar.heldObject !== cGround2 || cHeld.isHeld !== false || cGround2.isHeld !== true) {
  throw new Error(`FAILED: Controller B should swap held item with ground item! Got: ${cChar.heldObject?.id}`);
}
console.log("   PASS: Controller B cleanly swapped held item with targeted ground item.");

console.log("\nALL PICKUP AND DROP CONTROL TESTS PASSED CLEANLY!");
