import { Arena } from "../src/engine/Arena.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { InputManager } from "../src/ui/InputManager.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";

// Mock canvas
const canvas: any = {
  width: 1000,
  height: 700,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }),
  addEventListener: () => {},
  classList: { toggle: () => {} },
};

(global as any).document = {
  pointerLockElement: null,
  body: { classList: { toggle: () => {} } },
  addEventListener: () => {},
};
(global as any).requestAnimationFrame = () => {};

const arena = new Arena(20, 14, 1.0);
const inputManager = new InputManager(canvas, arena);
const devPanel: any = { isEditMode: false, updateInspector: () => {} };
const renderer: any = { render: () => {} };

const gameLoop = new GameLoop({
  canvas,
  arena,
  character: new Character({ x: 5, y: 5 }),
  objects: [],
  renderer,
  devPanel,
  inputManager,
});

// Spawn keyboard player
const kChar = gameLoop.spawnKeyboardPlayer();
kChar.position.x = 5;
kChar.position.y = 5;

// Empty-handed, no objects in arena
if (kChar.heldObject) {
  throw new Error("Character should be empty handed");
}

// Tick simulation
(gameLoop as any).isRunning = true;
(gameLoop as any).lastTime = 1000;
(gameLoop as any).tick(1016);

if (!inputManager.isCursorVisible) {
  throw new Error("Expected keyboard cursor to be visible even when empty-handed!");
}

console.log("PASS: Keyboard cursor is always visible when empty-handed and out of range of objects!");
