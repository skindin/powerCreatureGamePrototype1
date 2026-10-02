import { Arena } from "../src/engine/Arena";
import { Character } from "../src/character/Character";
import { InputManager } from "../src/ui/InputManager";
import { GameLoop } from "../src/engine/GameLoop";

console.log("=== Testing Spacebar Spawns Keyboard Character ===");

const arena = new Arena(20, 14, 1.0);
const character = new Character({ x: 5, y: 7, color: "#f59e0b", playerNumber: 1 });

const canvas = {
  width: 1000,
  height: 700,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }),
  addEventListener: () => {},
  removeEventListener: () => {},
} as any;

let keydownHandler: ((e: any) => void) | null = null;
(globalThis as any).window = {
  addEventListener: (event: string, handler: any) => {
    if (event === "keydown") keydownHandler = handler;
  },
  removeEventListener: () => {},
};

const inputManager = new InputManager(canvas, arena);
const gameLoop = new GameLoop({
  arena,
  character,
  objects: [],
  renderer: { getHoverScale: () => 1.0, getVisualPosition: (e: any) => ({ x: e.position.x, y: e.position.y }) } as any,
  inputManager,
  devPanel: { updateInspector: () => {}, updateSelectorOptions: () => {}, isEditMode: false } as any,
});

// Case 1: Initially no keyboard player
console.log("Initial players count:", gameLoop.players.size);
console.log("isKeyboardActive:", inputManager.isKeyboardActive);

if (inputManager.isKeyboardActive) {
  throw new Error("Keyboard should NOT be active initially on page load!");
}

// Press Space key
console.log("Pressing Space key...");
keydownHandler?.({ code: "Space", repeat: false, target: null });

console.log("After Space, players count:", gameLoop.players.size);
console.log("Has keyboard player:", gameLoop.players.has("keyboard"));
console.log("isKeyboardActive:", inputManager.isKeyboardActive);

if (!gameLoop.players.has("keyboard") || !inputManager.isKeyboardActive) {
  throw new Error("Space key should spawn Keyboard Player!");
}

// Case 2: Remove keyboard player, simulate Gamepad player active, press Space key again!
console.log("\nCase 2: Gamepad player active, Keyboard removed. Press Space:");
gameLoop.removeKeyboardPlayer();
console.log("After remove, has keyboard:", gameLoop.players.has("keyboard"));

// Add a mock gamepad player
gameLoop.spawnGamepadPlayer(0, "Backbone Pro");
console.log("Players count with gamepad:", gameLoop.players.size);

// Press Space again
console.log("Pressing Space key while Gamepad player is active...");
keydownHandler?.({ code: "Space", repeat: false, target: null });

console.log("Has keyboard player now:", gameLoop.players.has("keyboard"));
console.log("Total players now:", gameLoop.players.size);

if (!gameLoop.players.has("keyboard")) {
  throw new Error("Space key MUST spawn keyboard player even when Gamepad is active!");
}

console.log("SUCCESS! Spacebar reliably spawns keyboard player in all conditions!");
