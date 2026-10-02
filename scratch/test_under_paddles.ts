import { Arena } from "../src/engine/Arena";
import { Character } from "../src/character/Character";
import { InputManager } from "../src/ui/InputManager";
import { GameObject } from "../src/engine/GameObject";

console.log("=== Testing Gamepad M1 (Right = Jump) & M2 (Left = Sprint) Controls ===");

const arena = new Arena(20, 14, 1.0);
const character = new Character({
  x: 5,
  y: 7,
  color: "#f59e0b",
  playerNumber: 1,
});

// Mock canvas
const canvas = {
  width: 1000,
  height: 700,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }),
  addEventListener: () => {},
  removeEventListener: () => {},
} as any;

const inputManager = new InputManager(canvas, arena);

// Create mock gamepad with 24 buttons
const mockButtons = Array.from({ length: 24 }, () => ({ pressed: false, value: 0 }));
const mockGamepad = {
  index: 0,
  id: "GamePad with M1 (Right) & M2 (Left) Paddles",
  mapping: "standard",
  axes: [0, 0, 0, 0],
  buttons: mockButtons,
  connected: true,
};

// Mock navigator.getGamepads
Object.defineProperty(globalThis, "navigator", {
  value: {
    getGamepads: () => [mockGamepad],
    userAgent: "Node",
  },
  configurable: true,
  writable: true,
});

const playersMap = new Map<string, { character: Character }>();
playersMap.set("gamepad-0", { character });

const getVisualPosition = (c: Character) => ({ x: c.position.x, y: c.position.y });

// 1. Test Right Under-Paddle (M1 -> Button 17 on 19+ pad or Button 16 on 18-pad) triggers Jump
console.log("Test 1: Right Under-Paddle M1 (Button 17) Jump");
mockButtons[17].pressed = true;
mockButtons[17].value = 1.0;

let initialVz = character.verticalVelocity;
console.log("Initial Vz before jump:", initialVz);

inputManager.pollGamepadSlots(
  playersMap,
  [],
  arena,
  [character],
  getVisualPosition
);

const slot = (inputManager as any).gamepadSlots.get(0);
console.log("Slot isClimbHeld:", slot.isClimbHeld);
console.log("Character Vz after right under-paddle M1:", character.verticalVelocity);

if (!slot.isClimbHeld) {
  throw new Error("slot.isClimbHeld should be true when right under-paddle M1 is pressed!");
}
if (character.verticalVelocity <= 0) {
  throw new Error("Character should have jumped (positive Vz) on right under-paddle M1 press!");
}

// Release button 17
mockButtons[17].pressed = false;
mockButtons[17].value = 0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Slot isClimbHeld after release:", slot.isClimbHeld);
if (slot.isClimbHeld) {
  throw new Error("slot.isClimbHeld should be false after releasing right under-paddle!");
}

// 2. Test Left Under-Paddle (M2 -> Button 18 on 19+ pad) triggers Sprint
console.log("Test 2: Left Under-Paddle M2 (Button 18) Sprint");
console.log("Character isSprinting before:", character.isSprinting);

mockButtons[18].pressed = true;
mockButtons[18].value = 1.0;

inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);

console.log("Character isSprinting after left under-paddle M2:", character.isSprinting);
console.log("Slot sprintArmed:", slot.sprintArmed);

if (!character.isSprinting) {
  throw new Error("Character should be sprinting when left under-paddle M2 is pressed!");
}
if (!slot.sprintArmed) {
  throw new Error("slot.sprintArmed should be true!");
}

// Release button 18 while not moving stick -> sprint remains armed until stick movement completes
mockButtons[18].pressed = false;
mockButtons[18].value = 0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Sprint armed after tap:", slot.sprintArmed);

// Deflect stick to move while armed
mockGamepad.axes[0] = 0.8;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Character isSprinting during stick move:", character.isSprinting);
if (!character.isSprinting) {
  throw new Error("Character should be sprinting while stick moves with sprintArmed!");
}

// Return stick to neutral -> sprint turns off
mockGamepad.axes[0] = 0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Character isSprinting after stick returns to neutral:", character.isSprinting);
if (character.isSprinting) {
  throw new Error("Character should stop sprinting after stick returns to neutral!");
}

// 3. Test 18-button layout (where Button 16 = M1 Right Paddle Jump, Button 17 = M2 Left Paddle Sprint)
console.log("Test 3: 18-button layout (Button 16 M1 Right Jump, Button 17 M2 Left Sprint)");
const mock18Buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }));
mockGamepad.buttons = mock18Buttons;

// Press button 16 (M1 Right Paddle) -> Jump
mock18Buttons[16].pressed = true;
mock18Buttons[16].value = 1.0;
character.verticalVelocity = 0;
character.position.z = 0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Slot isClimbHeld with 18-btn Button 16 (M1 Right):", slot.isClimbHeld);
if (!slot.isClimbHeld) {
  throw new Error("Button 16 (M1 Right Paddle) on 18-btn pad should trigger Jump!");
}
mock18Buttons[16].pressed = false;
mock18Buttons[16].value = 0;

// Press button 17 (M2 Left Paddle) -> Sprint
mock18Buttons[17].pressed = true;
mock18Buttons[17].value = 1.0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Character isSprinting with 18-btn Button 17 (M2 Left):", character.isSprinting);
if (!character.isSprinting) {
  throw new Error("Button 17 (M2 Left Paddle) on 18-btn pad should trigger Sprint!");
}
mock18Buttons[17].pressed = false;
mock18Buttons[17].value = 0;

// 4. Test L3 (Button 10) Sprint, and verify R3 (Button 11 / right stick click) DOES NOT trigger Jump
console.log("Test 4: L3 (Button 10) sprint, and verify R3 (Button 11) does NOT trigger jump");
mock18Buttons[10].pressed = true;
mock18Buttons[10].value = 1.0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
if (!character.isSprinting) {
  throw new Error("Button 10 (L3) should trigger sprinting!");
}
mock18Buttons[10].pressed = false;
mock18Buttons[10].value = 0;

// Clicking right stick (Button 11) must NOT trigger jump or climb
mock18Buttons[11].pressed = true;
mock18Buttons[11].value = 1.0;
character.verticalVelocity = 0;
character.position.z = 0;
slot.isClimbHeld = false;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
if (slot.isClimbHeld || character.verticalVelocity > 0) {
  throw new Error("Button 11 (R3 right stick click) should NEVER trigger jump or isClimbHeld!");
}
console.log("Verified: Button 11 (R3 right stick click) did NOT trigger jump (Vz:", character.verticalVelocity, "isClimbHeld:", slot.isClimbHeld, ")");
mock18Buttons[11].pressed = false;
mock18Buttons[11].value = 0;

console.log("SUCCESS! All M1 (Right = Jump) and M2 (Left = Sprint) tests passed!");
