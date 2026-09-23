import { Arena } from "../src/engine/Arena";
import { Character } from "../src/character/Character";
import { InputManager } from "../src/ui/InputManager";
import { GameObject } from "../src/engine/GameObject";

console.log("=== Testing Gamepad Under-Paddle Controls (Sprint & Jump/Climb) ===");

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

// Create mock gamepad with under-paddles (buttons 17 = Left Paddle, 18 = Right Paddle)
const mockButtons = Array.from({ length: 24 }, () => ({ pressed: false, value: 0 }));
const mockGamepad = {
  index: 0,
  id: "Pro Controller with Paddles",
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

// 1. Test Right Under-Paddle (Button 18) triggers Jump
console.log("Test 1: Right Under-Paddle (Button 18) Jump");
mockButtons[18].pressed = true;
mockButtons[18].value = 1.0;

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
console.log("Character Vz after right under-paddle:", character.verticalVelocity);

if (!slot.isClimbHeld) {
  throw new Error("slot.isClimbHeld should be true when right under-paddle is pressed!");
}
if (character.verticalVelocity <= 0) {
  throw new Error("Character should have jumped (positive Vz) on right under-paddle press!");
}

// Release button 18
mockButtons[18].pressed = false;
mockButtons[18].value = 0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Slot isClimbHeld after release:", slot.isClimbHeld);
if (slot.isClimbHeld) {
  throw new Error("slot.isClimbHeld should be false after releasing right under-paddle!");
}

// 2. Test Left Under-Paddle (Button 17) triggers Sprint
console.log("Test 2: Left Under-Paddle (Button 17) Sprint");
console.log("Character isSprinting before:", character.isSprinting);

mockButtons[17].pressed = true;
mockButtons[17].value = 1.0;

inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);

console.log("Character isSprinting after left under-paddle:", character.isSprinting);
console.log("Slot sprintArmed:", slot.sprintArmed);

if (!character.isSprinting) {
  throw new Error("Character should be sprinting when left under-paddle is pressed!");
}
if (!slot.sprintArmed) {
  throw new Error("slot.sprintArmed should be true!");
}

// Release button 17 while not moving stick -> sprint remains armed until stick movement completes
mockButtons[17].pressed = false;
mockButtons[17].value = 0;
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

// 3. Test Button 19 (Left Lower Paddle) and Button 20 (Right Lower Paddle) on 4-paddle controllers
console.log("Test 3: 4-Paddle support (Button 19 & Button 20)");
mockButtons[19].pressed = true;
mockButtons[19].value = 1.0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Character isSprinting with button 19:", character.isSprinting);
if (!character.isSprinting) {
  throw new Error("Button 19 (Left Lower Paddle) should trigger sprinting!");
}
mockButtons[19].pressed = false;
mockButtons[19].value = 0;

mockButtons[20].pressed = true;
mockButtons[20].value = 1.0;
character.verticalVelocity = 0;
inputManager.pollGamepadSlots(playersMap, [], arena, [character], getVisualPosition);
console.log("Slot isClimbHeld with button 20:", slot.isClimbHeld);
if (!slot.isClimbHeld) {
  throw new Error("Button 20 (Right Lower Paddle) should trigger isClimbHeld / jump!");
}

console.log("SUCCESS! All under-paddle tests passed!");
