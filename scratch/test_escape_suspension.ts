import { Arena } from "../src/engine/Arena.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { InputManager } from "../src/ui/InputManager.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";

// Mock Canvas and Window
class MockCanvas {
  public width = 1000;
  public height = 700;
  public classList = { toggle: () => {} };
  private listeners: Record<string, Function[]> = {};

  public addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  public getBoundingClientRect() {
    return { left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700 };
  }

  public requestPointerLock() {
    mockDoc.pointerLockElement = this;
    for (const fn of mockDoc.listeners["pointerlockchange"] || []) {
      fn();
    }
  }

  public trigger(event: string, data: any) {
    for (const fn of this.listeners[event] || []) {
      fn(data);
    }
  }
}

const windowListeners: Record<string, Function[]> = {};
const mockDoc: any = {
  pointerLockElement: null,
  body: { classList: { toggle: () => {} } },
  listeners: {} as Record<string, Function[]>,
  addEventListener: (event: string, fn: Function) => {
    if (!mockDoc.listeners[event]) mockDoc.listeners[event] = [];
    mockDoc.listeners[event].push(fn);
  },
  exitPointerLock: () => {
    mockDoc.pointerLockElement = null;
    for (const fn of mockDoc.listeners["pointerlockchange"] || []) {
      fn();
    }
  },
};

(global as any).document = mockDoc;
(global as any).window = {
  addEventListener: (event: string, fn: Function) => {
    if (!windowListeners[event]) windowListeners[event] = [];
    windowListeners[event].push(fn);
  },
};
(global as any).requestAnimationFrame = () => {};

const triggerWindow = (event: string, data: any) => {
  for (const fn of windowListeners[event] || []) {
    fn(data);
  }
};

console.log("=== Testing Escape Suspension of Keyboard/Mouse Input ===");

const arena = new Arena(20, 14, 1.0);
const canvas = new MockCanvas() as any;
const input = new InputManager(canvas, arena);
const devPanel: any = { isEditMode: false, updateInspector: () => {} };
const renderer: any = { render: () => {}, getVisualPosition: (e: any) => ({ x: e.position.x, y: e.position.y }) };

const gameLoop = new GameLoop({
  canvas,
  arena,
  character: new Character({ x: 5, y: 5 }),
  objects: [],
  renderer,
  devPanel,
  inputManager: input,
});

const kChar = gameLoop.spawnKeyboardPlayer();
(gameLoop as any).isRunning = true;

// 1. Initial click on canvas to focus and lock
canvas.trigger("mousedown", { button: 0, clientX: 500, clientY: 350 });

if (input.isKeyboardSuspended) {
  throw new Error("Keyboard input should not be suspended initially");
}
if (!input.isPointerLocked) {
  throw new Error("Pointer lock should be active after canvas click");
}
console.log("✓ Initial game view click locks pointer and enables input.");

// 2. Press W key -> movement vector should be upwards (y = -1)
triggerWindow("keydown", { code: "KeyW" });
if (input.movementVector.y !== -1) {
  throw new Error(`Expected movementVector.y === -1, got ${input.movementVector.y}`);
}
console.log("✓ KeyW actively moves character.");

// 3. User hits ESCAPE!
console.log("Simulating pressing Escape key...");
triggerWindow("keydown", { code: "Escape" });

if (!input.isKeyboardSuspended) {
  throw new Error("input.isKeyboardSuspended should be true after Escape!");
}
if (input.isPointerLocked) {
  throw new Error("Pointer lock should be released after Escape!");
}
if (input.movementVector.x !== 0 || input.movementVector.y !== 0) {
  throw new Error(`Movement vector should be zeroed out on Escape, got (${input.movementVector.x}, ${input.movementVector.y})`);
}
console.log("✓ Escape successfully suspended input, cleared movement vector, and released pointer lock.");

// 4. Try pressing keys and moving mouse while suspended -> must be ignored!
triggerWindow("keydown", { code: "KeyD" });
triggerWindow("keydown", { code: "Space" });
triggerWindow("mousemove", { movementX: 100, movementY: 50 });

if (input.movementVector.x !== 0 || input.movementVector.y !== 0) {
  throw new Error("Keys pressed while suspended should be completely ignored!");
}

// Tick GameLoop
(gameLoop as any).lastTime = 1000;
(gameLoop as any).tick(1016);

if (kChar.velocity.x !== 0 || kChar.velocity.y !== 0) {
  throw new Error("Character velocity must be 0 while keyboard is suspended!");
}
if (input.isCursorVisible) {
  throw new Error("Aim cursor should not be active while suspended from Escape!");
}
console.log("✓ Keyboard keys, mouse movement, and game loop completely ignore player controls while suspended.");

// 5. User clicks on the game view canvas again!
console.log("Simulating clicking game view canvas to resume...");
canvas.trigger("mousedown", { button: 0, clientX: 600, clientY: 400 });

if (input.isKeyboardSuspended) {
  throw new Error("isKeyboardSuspended should be false after clicking game view canvas!");
}
if (!input.isPointerLocked) {
  throw new Error("Pointer lock should be re-acquired after clicking game view canvas!");
}
console.log("✓ Clicking game view canvas resumed keyboard/mouse controls and re-locked pointer.");

// 6. Press W key again -> should move now!
triggerWindow("keydown", { code: "KeyW" });
if (input.movementVector.y !== -1) {
  throw new Error(`Expected movementVector.y === -1 after resuming, got ${input.movementVector.y}`);
}
console.log("✓ KeyW actively moves character again after clicking game view.");

console.log("=== ALL ESCAPE SUSPENSION TESTS PASSED! ===");
