import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Testing Player 2 Throw Direction Verification ===");

// 1. Setup Arena and PlayerManager
const arena = new Arena(20, 20);
const mockCanvas = { width: 1000, height: 1000 } as any;
const inputManager = new InputManager(mockCanvas, arena);
const playerManager = new PlayerManager({ arena, inputManager });

// Spawn Player 1 (keyboard) and Player 2 (gamepad-0)
const p1Char = playerManager.spawnKeyboardPlayer();
const p2Char = playerManager.spawnGamepadPlayer(0, "Xbox Controller");

assert(playerManager.players.size === 2, "Should have 2 players connected");
assert(p2Char.playerId === "gamepad-0", "Player 2 playerId should be gamepad-0");

// Create a grabbable rock for Player 2
const rock = new GameObject({
  id: "test-rock-p2",
  position: { x: p2Char.position.x + 0.5, y: p2Char.position.y },
  mass: 1.0,
  colliderRadius: 0.35,
});
arena.entities = [p1Char, p2Char, rock];

// Player 2 picks up the rock
p2Char.pickupModule.pickup(p2Char, rock);
assert(p2Char.heldObject === rock, "Player 2 should be holding the rock");

// 2. Test: Player 2 aims with Right Stick towards (-4, -3) (up-left direction)
let slot = inputManager.gamepadSlots.get(0);
if (!slot) {
  slot = {
    index: 0,
    connected: true,
    id: "Xbox Controller",
    prevButtons: [],
    movementVector: { x: 0, y: 0 },
    aimOffset: { x: 0, y: 0 },
    aimPos: { x: p2Char.position.x, y: p2Char.position.y },
    hasMovedAimStick: true,
  } as any;
  inputManager.gamepadSlots.set(0, slot);
} else {
  slot.connected = true;
  slot.hasMovedAimStick = true;
}
// Aim at an absolute position up-left from p2Char
const targetAimX = p2Char.position.x - 4.0;
const targetAimY = p2Char.position.y - 3.0;
slot.aimPos = { x: targetAimX, y: targetAimY };

// Player 2 is moving right on the left stick: (1, 0)
slot.movementVector = { x: 1.0, y: 0.0 };
slot.isThrowRequested = true;

// Capture inputs
const inputs = playerManager.capturePlayerInputs(false, [rock]);
const p2Input = inputs.get("gamepad-0");
assert(p2Input !== undefined, "Player 2 input packet should exist");
assert(p2Input?.isThrow === true, "Player 2 input should request throw");
assert(p2Input?.aimX === targetAimX, `aimX should match targetAimX (${targetAimX}), got ${p2Input?.aimX}`);
assert(p2Input?.aimY === targetAimY, `aimY should match targetAimY (${targetAimY}), got ${p2Input?.aimY}`);

console.log(`p2Char position: x=${p2Char.position.x}, y=${p2Char.position.y}`);
console.log(`targetAim: x=${targetAimX}, y=${targetAimY}`);
console.log(`rock position: x=${rock.position.x}, y=${rock.position.y}`);
console.log(`p2Input: aimX=${p2Input?.aimX}, aimY=${p2Input?.aimY}, isThrow=${p2Input?.isThrow}`);

// Apply inputs (executes throw)
playerManager.applyPlayerInputs(inputs, 1 / 60, [rock], false);

// Verify rock was thrown
assert(p2Char.heldObject === null, "Player 2 should no longer hold the rock");
assert(!rock.isHeld, "Rock should no longer be marked as held");

// Verify rock launch velocity is directed toward (-4, -3) (up-left) and NOT right (1, 0)
console.log(`Rock launch velocity: vx=${rock.velocity.x.toFixed(3)}, vy=${rock.velocity.y.toFixed(3)}`);
assert(rock.velocity.x < 0, `Rock vx should be negative (aimed left), got ${rock.velocity.x}`);
assert(rock.velocity.y < 0, `Rock vy should be negative (aimed up), got ${rock.velocity.y}`);

// Verify ratio matches direction
const expectedRatio = (-3.0) / (-4.0); // 0.75
const actualRatio = rock.velocity.y / rock.velocity.x;
assert(Math.abs(actualRatio - expectedRatio) < 0.1, `Trajectory ratio ${actualRatio} should be close to ${expectedRatio}`);

// On the tick the throw executes, character faces the throw aim direction
console.log(`Character facing angle on throw tick: ${p2Char.facingAngle}`);
const expectedThrowAngle = Math.atan2(-3, -4);
assert(Math.abs(p2Char.facingAngle - expectedThrowAngle) < 0.05, `Character should face throw direction (${expectedThrowAngle}), got ${p2Char.facingAngle}`);

// On the subsequent tick when empty-handed and moving right (1, 0), character faces movement direction (0 rad)
const nextInputs = playerManager.capturePlayerInputs(false, [rock]);
playerManager.applyPlayerInputs(nextInputs, 1 / 60, [rock], false);
console.log(`Character facing angle on subsequent move tick: ${p2Char.facingAngle}`);
assert(p2Char.facingAngle === 0, `Character facing angle ${p2Char.facingAngle} should face movement direction (0 rad) after empty-handed move`);

console.log("✅ All Player 2 throw direction tests passed!");
process.exit(0);
