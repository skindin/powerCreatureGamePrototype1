import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { InputManager } from "../src/ui/InputManager.js";
import { GameObject } from "../src/engine/GameObject.js";

// Mock canvas and DOM environment for Node test
class MockCanvas {
  public width = 1000;
  public height = 700;
  public classList = {
    toggle: (cls: string, state: boolean) => {},
    add: (cls: string) => {},
    remove: (cls: string) => {},
  };
  private listeners: Record<string, Function[]> = {};

  public addEventListener(event: string, fn: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  public getBoundingClientRect() {
    return { left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700 };
  }

  public requestPointerLock(options?: any) {
    mockDocument.pointerLockElement = this;
    for (const fn of mockDocument.listeners["pointerlockchange"] || []) {
      fn();
    }
  }

  public trigger(event: string, data: any) {
    for (const fn of this.listeners[event] || []) {
      fn(data);
    }
  }
}

const mockDocument: any = {
  pointerLockElement: null,
  body: {
    classList: {
      toggle: (cls: string, state: boolean) => {},
      add: (cls: string) => {},
      remove: (cls: string) => {},
    },
  },
  listeners: {} as Record<string, Function[]>,
  addEventListener: (event: string, fn: Function) => {
    if (!mockDocument.listeners[event]) mockDocument.listeners[event] = [];
    mockDocument.listeners[event].push(fn);
  },
  exitPointerLock: () => {
    mockDocument.pointerLockElement = null;
    for (const fn of mockDocument.listeners["pointerlockchange"] || []) {
      fn();
    }
  },
};

(global as any).document = mockDocument;
(global as any).window = {
  addEventListener: (event: string, fn: Function) => {},
};

console.log("=== Testing Pointer Lock and Raw Mouse Movement ===");

const arena = new Arena(20, 14, 1.0);
const canvas = new MockCanvas() as any;
const input = new InputManager(canvas, arena);

// 1. Initial State
if (input.isPointerLocked) {
  throw new Error("Pointer lock should initially be false");
}

// 2. Click game view (mousedown)
console.log("Simulating click on game canvas...");
canvas.trigger("mousedown", {
  button: 0,
  clientX: 500,
  clientY: 350,
});

if (!input.isPointerLocked) {
  throw new Error("Pointer lock was not activated on canvas click!");
}
console.log("✓ Pointer lock successfully requested and activated on canvas click.");

// 3. Raw mouse input movement
const initialX = input.actualMousePos.x;
const initialY = input.actualMousePos.y;

// Send raw delta movementX = 50, movementY = -30
(input as any).updateMousePos({
  movementX: 50,
  movementY: -30,
  clientX: 500, // Should be ignored under pointer lock!
  clientY: 350,
});

const unitsPerPxX = arena.width / 1000;
const unitsPerPxY = arena.height / 700;
const expectedX = initialX + 50 * unitsPerPxX;
const expectedY = initialY - 30 * unitsPerPxY;

if (Math.abs(input.actualMousePos.x - expectedX) > 0.001 || Math.abs(input.actualMousePos.y - expectedY) > 0.001) {
  throw new Error(`Raw mouse movement mismatch! Expected (${expectedX}, ${expectedY}), got (${input.actualMousePos.x}, ${input.actualMousePos.y})`);
}
console.log(`✓ Raw mouse input correctly accumulated: delta (50, -30) moved cursor to (${input.actualMousePos.x.toFixed(3)}, ${input.actualMousePos.y.toFixed(3)})`);

// 4. Test exit pointer lock
input.exitPointerLock();
if (input.isPointerLocked) {
  throw new Error("Pointer lock should be false after exitPointerLock");
}
console.log("✓ Exit pointer lock successfully restored mouse.");

console.log("=== All Pointer Lock and Raw Mouse Input Tests Passed! ===");
