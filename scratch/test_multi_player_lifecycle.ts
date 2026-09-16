import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { InputManager } from "../src/ui/InputManager.js";
import { Renderer } from "../src/engine/Renderer.js";

// Mock canvas and DOM environment for Node / headless run
class MockCanvas {
  width = 1000;
  height = 700;
  parentElement = {
    clientWidth: 1000,
    clientHeight: 700,
  };
  style = { width: "1000px", height: "700px" };
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1000, height: 700 };
  }
  getContext() {
    return {
      canvas: this,
      clearRect() {},
      beginPath() {},
      arc() {},
      fill() {},
      stroke() {},
      moveTo() {},
      lineTo() {},
      save() {},
      restore() {},
      setLineDash() {},
      measureText() {
        return { width: 20 };
      },
      fillText() {},
      roundRect() {},
    };
  }
}

async function runTest() {
  console.log("--- Starting Multi-Player Lifecycle & Controller Test ---");

  const arena = new Arena(20, 14, 1.0);
  const canvas = new MockCanvas() as unknown as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  const renderer = new Renderer(ctx);

  const char1 = new Character({ x: 5.0, y: 7.0 });
  const box1 = new GameObject({
    name: "Test Box",
    position: { x: 5.5, y: 7.0, z: 0 },
    mass: 1.0,
    colliderRadius: 0.3,
  });

  const inputManager = new InputManager(canvas, arena);
  const gameLoop = new GameLoop({
    arena,
    character: char1,
    objects: [box1],
    renderer,
    inputManager,
    devPanel: { isEditMode: false, updateInspector() {} } as any,
  });

  // 1. Initial State: Keyboard Player active as Player 1
  console.log("1. Testing initial keyboard player...");
  if (gameLoop.allCharacters.length !== 1) {
    throw new Error(`Expected 1 initial character, got ${gameLoop.allCharacters.length}`);
  }
  const p1 = gameLoop.players.get("keyboard");
  if (!p1 || p1.playerNumber !== 1 || p1.color !== "#f59e0b") {
    throw new Error(`Unexpected P1 state: ${JSON.stringify(p1)}`);
  }
  console.log("✓ Initial Player 1 (Keyboard) active with color:", p1.color);

  // 2. Character Grabs Box, then Player is removed
  console.log("2. Testing character holding item and removal cleanup...");
  char1.pickupModule?.pickup(char1, box1);
  if (!char1.heldObject || !box1.isHeld) {
    throw new Error("Failed to pick up test box");
  }
  console.log("✓ Character is holding object:", box1.name);

  gameLoop.removeKeyboardPlayer();
  if (gameLoop.allCharacters.length !== 0) {
    throw new Error("Expected 0 characters after removing keyboard player");
  }
  if (inputManager.isKeyboardActive) {
    throw new Error("isKeyboardActive should be false after removal");
  }
  if (box1.isHeld || box1.heldBy !== null) {
    throw new Error("Held object was not properly released upon character removal!");
  }
  console.log("✓ Keyboard player removed, box safely dropped, isKeyboardActive = false");

  // 3. Test Spacebar Join
  console.log("3. Testing Spacebar join trigger...");
  inputManager.onKeyboardJoin?.();
  if (gameLoop.allCharacters.length !== 1 || !inputManager.isKeyboardActive) {
    throw new Error("Failed to rejoin via keyboard join trigger");
  }
  console.log("✓ Keyboard player rejoined via Spacebar trigger, player count =", gameLoop.allCharacters.length);

  // 4. Test Gamepad Slot 0 Join via A button
  console.log("4. Testing Gamepad Slot 0 join on 'A' button...");
  // Mock Gamepad in navigator
  let mockGamepads: any[] = [
    {
      index: 0,
      connected: true,
      id: "Xbox Wireless Controller",
      axes: [0, 0, 0, 0],
      buttons: [{ pressed: true, value: 1.0 }], // A button pressed
    },
  ];
  Object.defineProperty(globalThis, "navigator", {
    value: {
      getGamepads: () => mockGamepads,
    },
    configurable: true,
    writable: true,
  });

  // Poll gamepads — should fire onGamepadJoin(0)
  inputManager.pollGamepadSlots(gameLoop.players, [box1], arena);

  if (gameLoop.allCharacters.length !== 2) {
    throw new Error(`Expected 2 characters after Gamepad 0 joins, got ${gameLoop.allCharacters.length}`);
  }
  const p2 = gameLoop.players.get("gamepad-0");
  if (!p2 || p2.playerNumber !== 2 || p2.color !== "#06b6d4") {
    throw new Error(`Unexpected P2 state: ${JSON.stringify(p2)}`);
  }
  console.log("✓ Gamepad Player 2 spawned with Cyan color (#06b6d4):", p2.name);

  // 5. Test Gamepad Slot 1 Join via A button
  console.log("5. Testing Gamepad Slot 1 join on 'A' button...");
  mockGamepads = [
    {
      index: 0,
      connected: true,
      id: "Xbox Wireless Controller",
      axes: [0, 0, 0, 0],
      buttons: [{ pressed: false, value: 0 }],
    },
    {
      index: 1,
      connected: true,
      id: "DualSense Wireless Controller",
      axes: [0, 0, 0, 0],
      buttons: [{ pressed: true, value: 1.0 }], // A button pressed
    },
  ];

  inputManager.pollGamepadSlots(gameLoop.players, [box1], arena);

  if (gameLoop.allCharacters.length !== 3) {
    throw new Error(`Expected 3 characters after Gamepad 1 joins, got ${gameLoop.allCharacters.length}`);
  }
  const p3 = gameLoop.players.get("gamepad-1");
  if (!p3 || p3.playerNumber !== 3 || p3.color !== "#10b981") {
    throw new Error(`Unexpected P3 state: ${JSON.stringify(p3)}`);
  }
  console.log("✓ Gamepad Player 3 spawned with Emerald color (#10b981):", p3.name);

  // 6. Test Removing Gamepad Player 2 and Rejoining via A button
  console.log("6. Testing removing Gamepad 0 and rejoining via 'A' button...");
  gameLoop.removeGamepadPlayer(0);
  if (gameLoop.allCharacters.length !== 2) {
    throw new Error(`Expected 2 characters after removing Gamepad 0, got ${gameLoop.allCharacters.length}`);
  }
  console.log("✓ Gamepad 0 character removed, remaining players:", gameLoop.allCharacters.length);

  // Press A on controller 0 again
  mockGamepads[0] = {
    index: 0,
    connected: true,
    id: "Xbox Wireless Controller",
    axes: [0, 0, 0, 0],
    buttons: [{ pressed: true, value: 1.0 }],
  };
  inputManager.pollGamepadSlots(gameLoop.players, [box1], arena);

  if (gameLoop.allCharacters.length !== 3) {
    throw new Error(`Expected 3 characters after Gamepad 0 rejoins, got ${gameLoop.allCharacters.length}`);
  }
  console.log("✓ Gamepad 0 character successfully rejoined by pressing A button!");

  // 7. Test Physical Disconnect of Gamepad 1
  console.log("7. Testing physical disconnect of Gamepad 1...");
  mockGamepads[1] = {
    index: 1,
    connected: false,
  };
  inputManager.pollGamepadSlots(gameLoop.players, [box1], arena);

  if (gameLoop.allCharacters.length !== 2) {
    throw new Error(`Expected 2 characters after Gamepad 1 disconnected, got ${gameLoop.allCharacters.length}`);
  }
  console.log("✓ Disconnected gamepad character was automatically removed!");

  console.log("\n=========================================");
  console.log("ALL MULTI-PLAYER LIFECYCLE TESTS PASSED! 🎉");
  console.log("=========================================\n");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
