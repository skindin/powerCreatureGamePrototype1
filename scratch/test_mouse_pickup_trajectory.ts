import { Character } from "../src/character/Character";
import { Arena } from "../src/engine/Arena";
import { GameObject } from "../src/engine/GameObject";
import { GameLoop } from "../src/engine/GameLoop";
import { InputManager } from "../src/ui/InputManager";
import { ThrowModule } from "../src/character/ThrowModule";
import { PickupModule } from "../src/character/PickupModule";
import { WalkingModule } from "../src/character/WalkingModule";

console.log("=== Testing Keyboard Mouse Trajectory Points Directly to Mouse On Pickup ===");

const arena = new Arena(20, 14, 1.0);
const canvas = {
  width: 1000,
  height: 700,
  addEventListener: () => {},
  removeEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }),
  classList: { toggle: () => {}, contains: () => false },
  requestPointerLock: () => {},
} as unknown as HTMLCanvasElement;

const inputManager = new InputManager(canvas, arena);
inputManager.isKeyboardActive = true;
inputManager.isKeyboardSuspended = false;

const devPanel: any = {
  isEditMode: false,
  setSelectedEntity: () => {},
  updateSliders: () => {},
  refreshEntitySelect: () => {},
};

const renderer: any = {
  getVisualPosition: (e: any) => ({ x: e.position.x, y: e.position.y }),
  getHoverScale: () => 0.5,
};

const gameLoop = new GameLoop({ arena, renderer, inputManager, devPanel, objects: [] });
inputManager.isKeyboardActive = true;
inputManager.isKeyboardSuspended = false;

// Create Keyboard Player character at (5.0, 7.0)
const kChar = new Character({
  playerId: "keyboard",
  playerNumber: 1,
  x: 5.0,
  y: 7.0,
  color: "#f59e0b",
});
kChar.throwModule = new ThrowModule();
kChar.pickupModule = new PickupModule();
kChar.walkingModule = new WalkingModule();

// Set character movement vector (e.g. moving South/Down: dir = (0, 1))
inputManager.movementVector = { x: 0, y: 1 };
kChar.facingAngle = Math.PI / 2; // facing down

// Register player in game loop
(gameLoop as any).players.set("keyboard", {
  isKeyboard: true,
  character: kChar,
});

// Set mouse position far to the North-East at (12.0, 2.0)
inputManager.mousePos = { x: 12.0, y: 2.0 };
inputManager.actualMousePos = { x: 12.0, y: 2.0 };

// Create rock to pick up
const rock = new GameObject({
  id: "test-rock",
  position: { x: 5.0, y: 7.0, z: 0 },
  mass: 1.0,
  colliderRadius: 0.35,
  isStatic: false,
});
arena.entities = [kChar, rock];
(gameLoop as any).objects = [rock];

// Simulate picking up the rock
kChar.heldObject = rock;
rock.isHeld = true;
rock.heldBy = kChar;

(gameLoop as any).updatePhysics(1 / 60);

// Check character active trajectory and facing angle
console.log("Checking results after picking up object with Mouse & Keyboard:");
console.log(`   Mouse Position: (${inputManager.mousePos.x}, ${inputManager.mousePos.y})`);
console.log(`   Character Position: (${kChar.position.x.toFixed(2)}, ${kChar.position.y.toFixed(2)})`);
console.log(`   Character Facing Angle: ${kChar.facingAngle.toFixed(3)} rad`);
console.log(`   Active Trajectory Land Point: (${kChar.activeTrajectory?.landPoint.x.toFixed(2)}, ${kChar.activeTrajectory?.landPoint.y.toFixed(2)})`);

if (!kChar.activeTrajectory) {
  throw new Error("Expected activeTrajectory to be non-null when holding an object with mouse aiming!");
}

// Expected angle from (5, 7) to mouse (12, 2):
// dx = 7, dy = -5 -> angle = Math.atan2(-5, 7) ≈ -0.620 rad
const expectedAngle = Math.atan2(inputManager.mousePos.y - kChar.position.y, inputManager.mousePos.x - kChar.position.x);
if (Math.abs(kChar.facingAngle - expectedAngle) > 0.05) {
  throw new Error(`Expected character to face mouse at ${expectedAngle.toFixed(3)}, but got: ${kChar.facingAngle.toFixed(3)}!`);
}

// Trajectory landPoint should be directed toward the mouse (12, 2), NOT South (5, 10)!
const landDx = kChar.activeTrajectory.landPoint.x - kChar.position.x;
const landDy = kChar.activeTrajectory.landPoint.y - kChar.position.y;
const landAngle = Math.atan2(landDy, landDx);

if (Math.abs(landAngle - expectedAngle) > 0.05) {
  throw new Error(`Expected trajectory to point directly toward mouse (angle ${expectedAngle.toFixed(3)}), but got ${landAngle.toFixed(3)}!`);
}

console.log("✓ PASS: When picking up an object with mouse and keyboard, the trajectory immediately points directly to the mouse cursor!");
