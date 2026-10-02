import { GameLoop } from "../src/engine/GameLoop.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { Arena } from "../src/engine/Arena.js";
import { ReliableActionCommand } from "../src/engine/physics/StateHistoryBuffer.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("==================================================================");
console.log("🧪 TESTING THROW CLIENT PREDICTION, FLIGHT PRESERVATION & SERVER SYNC");
console.log("==================================================================");

// 1. Setup Arena and Entities
const arena = new Arena(20, 14, 1.0);
const clientChar = new Character({
  x: 5.0,
  y: 7.0,
  color: "#f59e0b",
  colliderRadius: 0.44,
  mass: 1.2,
  strength: 1.0,
  playerId: "keyboard",
});

const clientBox = new GameObject({
  id: "throw-box-1",
  name: "Throw Box",
  position: { x: 5.0, y: 7.0, z: 0.5 },
  mass: 1.0,
  colliderRadius: 0.3,
  color: "#38bdf8",
});

// Character holds the box
clientChar.heldObject = clientBox;
clientBox.isHeld = true;
clientBox.heldBy = clientChar;

const mockCanvas = {} as any;
const mockRenderer = { getHoverScale: () => 1.0, showBufferTrail: false } as any;
const mockInput = { isKeyboardThrowRequested: false, actualMousePos: { x: 10.0, y: 7.0 } } as any;
const mockDevPanel = { isEditMode: false, updateInspector: () => {} } as any;

const gameLoop = new GameLoop({
  canvas: mockCanvas,
  arena,
  character: clientChar,
  objects: [clientBox],
  renderer: mockRenderer,
  inputManager: mockInput,
  devPanel: mockDevPanel,
});

let dispatchedAction: ReliableActionCommand | null = null;
gameLoop.onReliableAction = (act) => {
  dispatchedAction = act;
};

// 2. Perform throw on client via applyPlayerInputs
console.log("\n--- TEST 1: Deterministic Throw & Reliable Action Dispatch ---");
const inputMap = new Map();
inputMap.set("keyboard", {
  playerId: "keyboard",
  moveX: 0,
  moveY: 0,
  isSprinting: false,
  isJumpHeld: false,
  isGrabHeld: false,
  isDrop: false,
  isThrow: true,
  aimX: 10.0,
  aimY: 7.0,
  isAiming: true,
  isLockHeld: false,
});

gameLoop.playerManager.applyPlayerInputs(inputMap, 1 / 60, false, [clientBox]);

assert(!clientBox.isHeld, "Box is released from player hands");
assert(clientBox.velocity.x > 1.0, `Box received ballistic horizontal velocity: vx=${clientBox.velocity.x.toFixed(2)}`);
assert(clientBox.verticalVelocity > 0.5, `Box received ballistic vertical velocity: vz=${clientBox.verticalVelocity.toFixed(2)}`);
assert(clientBox.lastThrower === clientChar, "Box has lastThrower set to client character");
assert(dispatchedAction !== null && (dispatchedAction as ReliableActionCommand).type === "throw", "Reliable throw command was dispatched");
console.log(`✅ Test 1 Passed: Box launched with vx=${clientBox.velocity.x.toFixed(2)}, vz=${clientBox.verticalVelocity.toFixed(2)}, action dispatched`);

// 3. Test syncAuthoritativeObjects with trailing server snapshot (server still thinks object is held)
console.log("\n--- TEST 2: Trailing Server Snapshot Does NOT Kill Throw Velocity ---");
const initialVx = clientBox.velocity.x;
const initialVz = clientBox.verticalVelocity;
const initialX = clientBox.position.x;

// Server is lagging by 100ms and still reports sObj as held at player position (vx=0, vy=0)
const laggingServerObjects = [
  {
    id: "throw-box-1",
    name: "Throw Box",
    x: 5.0,
    y: 7.0,
    z: 0.5,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 0.3,
    isHeld: true,
    heldBy: "keyboard",
    isSleeping: false,
  },
];

// Call syncAuthoritativeObjects multiple times to simulate incoming frames while lagging
for (let frame = 0; frame < 5; frame++) {
  gameLoop.syncAuthoritativeObjects(laggingServerObjects);
}

assert(clientBox.velocity.x === initialVx, "Throw velocity vx was NOT dampened or killed by lagging server");
assert(clientBox.verticalVelocity === initialVz, "Throw velocity vz was NOT dampened or killed by lagging server");
assert(clientBox.position.x === initialX, "Throw position was NOT pulled backward into player hands");
console.log("✅ Test 2 Passed: In-flight throw physics fully preserved against lagging server held states");

// 4. Test Server Simulation Processing of the Throw Command
console.log("\n--- TEST 3: Server Authoritatively Executes Throw ---");
const serverSim = new ServerGameSimulation();
serverSim.initializeFromWorld(arena, [clientChar], [clientBox]);

const serverChar = serverSim.characters.get("keyboard")!;
const serverBox = serverSim.objects[0];

// Put server box in server character's hands to represent pre-throw state
serverChar.heldObject = serverBox;
serverBox.isHeld = true;
serverBox.heldBy = serverChar;

// Server receives the reliable throw action
serverSim.processReliableActions([dispatchedAction!]);

assert(!serverBox.isHeld, "Server box is released");
assert(serverBox.velocity.x > 1.0, `Server box launched with ballistic velocity: vx=${serverBox.velocity.x.toFixed(2)}`);
assert(serverBox.verticalVelocity > 0.5, `Server box launched with vertical velocity: vz=${serverBox.verticalVelocity.toFixed(2)}`);
console.log(`✅ Test 3 Passed: Server authoritatively executed throw with matching ballistic launch (vx=${serverBox.velocity.x.toFixed(2)})`);

console.log("\n==================================================================");
console.log("🎉 ALL THROW CLIENT PREDICTION & FLIGHT PRESERVATION TESTS PASSED 100%!");
console.log("==================================================================");
