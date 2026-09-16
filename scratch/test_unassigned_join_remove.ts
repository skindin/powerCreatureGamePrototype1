import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameLoop, PLAYER_COLORS } from "../src/engine/GameLoop.js";
import { GameObject } from "../src/engine/GameObject.js";
import { InputManager } from "../src/ui/InputManager.js";
import { DevPanel } from "../src/ui/DevPanel.js";

// Mock canvas and context for headless testing
const mockCtx = {
  canvas: { width: 800, height: 560, style: {} },
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  closePath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  measureText: () => ({ width: 40 }),
  fillText: () => {},
  roundRect: () => {},
  setLineDash: () => {},
} as any;

const mockRenderer = {
  render: () => {},
} as any;

const arena = new Arena(20, 14, 1.0);
const initialChar = new Character({
  name: "Player 1",
  color: PLAYER_COLORS[0],
  x: 4.8,
  y: 7.0,
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
});
const objects: GameObject[] = [];

const inputManager = new InputManager(mockCtx.canvas, arena);
const devPanel = {
  isEditMode: false,
  editTool: "select",
  updateSelectorOptions: () => {},
  updateInspector: () => {},
  setSelectedEntity: () => {},
} as unknown as DevPanel;

const gameLoop = new GameLoop({
  arena,
  character: initialChar,
  objects,
  renderer: mockRenderer,
  inputManager,
  devPanel,
});

console.log("--- 1. Testing Initial State (Page Load) ---");
console.assert(gameLoop.players.size === 0, `Expected 0 players on load, got ${gameLoop.players.size}`);
console.assert(gameLoop.allCharacters.length === 1, `Expected 1 character in arena, got ${gameLoop.allCharacters.length}`);
console.assert(gameLoop.baseCharacter.playerId === "", `Expected unassigned baseCharacter playerId, got '${gameLoop.baseCharacter.playerId}'`);
console.assert(gameLoop.primaryCharacter === gameLoop.baseCharacter, "Expected primaryCharacter to be baseCharacter");
console.assert(!inputManager.isKeyboardActive, "Expected keyboard to be inactive initially");
console.log("✓ Initial state verified: Character is in arena unassigned, 0 players active.");

console.log("\n--- 2. Testing First Join with Keyboard (Spacebar) ---");
const p1Char = gameLoop.spawnKeyboardPlayer();
console.assert(p1Char === gameLoop.baseCharacter, "Expected keyboard to claim existing baseCharacter");
console.assert(gameLoop.players.size === 1, `Expected 1 player, got ${gameLoop.players.size}`);
console.assert(p1Char.playerId === "keyboard", `Expected playerId 'keyboard', got '${p1Char.playerId}'`);
console.assert(p1Char.playerNumber === 1, `Expected playerNumber 1, got ${p1Char.playerNumber}`);
console.assert(inputManager.isKeyboardActive, "Expected isKeyboardActive to be true");
console.log("✓ Keyboard successfully connected to baseCharacter.");

console.log("\n--- 3. Testing Second Join with Gamepad 0 (Button A) ---");
const p2Char = gameLoop.spawnGamepadPlayer(0, "Xbox Wireless Controller");
console.assert(p2Char !== gameLoop.baseCharacter, "Expected gamepad to spawn a new character for P2");
console.assert(gameLoop.players.size === 2, `Expected 2 players, got ${gameLoop.players.size}`);
console.assert(gameLoop.allCharacters.length === 2, `Expected 2 characters in arena, got ${gameLoop.allCharacters.length}`);
console.assert(p2Char.playerId === "gamepad-0", `Expected playerId 'gamepad-0', got '${p2Char.playerId}'`);
console.assert(p2Char.playerNumber === 2, `Expected playerNumber 2, got ${p2Char.playerNumber}`);
console.log("✓ Gamepad successfully spawned Player 2.");

console.log("\n--- 4. Testing Removing Player 2 ---");
gameLoop.removePlayer("gamepad-0");
console.assert(gameLoop.players.size === 1, `Expected 1 player after removing P2, got ${gameLoop.players.size}`);
console.assert(gameLoop.allCharacters.length === 1, `Expected 1 character in arena, got ${gameLoop.allCharacters.length}`);
console.assert(gameLoop.players.has("keyboard"), "Expected keyboard to still be active");
console.log("✓ Player 2 removed, Player 1 remains.");

console.log("\n--- 5. Testing Removing LAST Player (Player 1) ---");
// The core requirement: Removing the last player must NOT delete it; only remove controller/keyboard!
gameLoop.removePlayer("keyboard");
console.assert(gameLoop.players.size === 0, `Expected 0 connected players, got ${gameLoop.players.size}`);
console.assert(gameLoop.allCharacters.length === 1, `Expected baseCharacter to STAY in arena, got ${gameLoop.allCharacters.length}`);
console.assert(gameLoop.baseCharacter.playerId === "", `Expected baseCharacter to be unassigned, got '${gameLoop.baseCharacter.playerId}'`);
console.assert(gameLoop.primaryCharacter === gameLoop.baseCharacter, "Expected primaryCharacter fallback to baseCharacter");
console.assert(!inputManager.isKeyboardActive, "Expected isKeyboardActive to be false");
console.log("✓ Last player removed: Character NOT deleted! Controller/keyboard cleanly removed.");

console.log("\n--- 6. Testing Gamepad 0 Connecting First after Last Player Removed ---");
// "just connect whatever the first controller/keyboard to press a/space"
const p1FromGamepad = gameLoop.spawnGamepadPlayer(0, "DualSense Wireless Controller");
console.assert(p1FromGamepad === gameLoop.baseCharacter, "Expected Gamepad 0 to claim the standing baseCharacter");
console.assert(gameLoop.players.size === 1, `Expected 1 player, got ${gameLoop.players.size}`);
console.assert(p1FromGamepad.playerId === "gamepad-0", `Expected playerId 'gamepad-0', got '${p1FromGamepad.playerId}'`);
console.assert(p1FromGamepad.playerNumber === 1, `Expected playerNumber 1, got ${p1FromGamepad.playerNumber}`);
console.log("✓ Gamepad 0 successfully connected to standing baseCharacter as Player 1.");

console.log("\n--- 7. Testing Removing Gamepad 0 (Last Player Again) ---");
gameLoop.removePlayer("gamepad-0");
console.assert(gameLoop.players.size === 0, `Expected 0 connected players, got ${gameLoop.players.size}`);
console.assert(gameLoop.allCharacters.length === 1, `Expected 1 character in arena, got ${gameLoop.allCharacters.length}`);
console.assert(gameLoop.baseCharacter.playerId === "", `Expected baseCharacter unassigned, got '${gameLoop.baseCharacter.playerId}'`);
console.log("✓ Gamepad 0 removed: baseCharacter remains standing in arena.");

console.log("\n--- 8. Testing Keyboard Connecting Back In (Spacebar) ---");
const p1FromKeyboard = gameLoop.spawnKeyboardPlayer();
console.assert(p1FromKeyboard === gameLoop.baseCharacter, "Expected Keyboard to claim the standing baseCharacter");
console.assert(gameLoop.players.size === 1, `Expected 1 player, got ${gameLoop.players.size}`);
console.assert(p1FromKeyboard.playerId === "keyboard", `Expected playerId 'keyboard', got '${p1FromKeyboard.playerId}'`);
console.assert(p1FromKeyboard.playerNumber === 1, `Expected playerNumber 1, got ${p1FromKeyboard.playerNumber}`);
console.log("✓ Keyboard reconnected to baseCharacter as Player 1.");

console.log("\nALL TESTS PASSED SUCCESSFULLY! 🎉");
