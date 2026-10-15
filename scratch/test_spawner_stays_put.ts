import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { SpawnerModule } from "../src/engine/SpawnerModule.js";
import { ConsumableModule } from "../src/engine/ConsumableModule.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { InputManager } from "../src/ui/InputManager.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { ContestedGrabArbiter } from "../src/server/ContestedGrabArbiter.js";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function runTests() {
  console.log("=== Testing Spawner Stays Put & Dispenses Clone to Hands ===");

  const arena = new Arena({ width: 20, height: 14, wallHeight: 2.0 });
  const objects: GameObject[] = [];

  // Create spawner apple sitting on the ground at (5.0, 5.0, 0)
  const spawnerPos = { x: 5.0, y: 5.0, z: 0 };
  const spawnerApple = new GameObject({
    id: "spawner-apple-1",
    name: "Apple Spawner",
    position: { ...spawnerPos },
    color: "#ef4444",
    visualShape: "circle",
    colliderRadius: 0.35,
    mass: 0.5,
    consumableModule: new ConsumableModule({
      tag: "food",
      totalEnergyJoules: 500,
      remainingEnergyJoules: 500,
      consumeRateWatts: 100,
    }),
    spawnerModule: new SpawnerModule({
      spawnPosition: { ...spawnerPos },
      enabled: true,
    }),
  });
  objects.push(spawnerApple);

  // Character standing right next to the apple
  const hero = new Character({ x: 5.2, y: 5.0 });
  const inputManager = new InputManager({} as any, arena);
  const playerManager = new PlayerManager({
    arena,
    inputManager,
    character: hero,
  });

  // 1. Client PlayerManager test: Character grabs the spawner apple
  console.log("1. Testing PlayerManager grab interaction...");
  assert(hero.heldObject === null, "Hero hands empty initially");
  assert(spawnerApple.isHeld === false, "Spawner apple is unheld initially");
  assert(spawnerApple.spawnerModule !== null, "Spawner apple has SpawnerModule");

  // Send input packet with grabTargetObjectId targeting the spawner apple
  const playerId = "keyboard";
  const inputMap1 = new Map();
  inputMap1.set(playerId, {
    playerId,
    tick: 1,
    moveX: 0,
    moveY: 0,
    isJumpHeld: false,
    isGrabHeld: true,
    grabTargetObjectId: spawnerApple.id,
    facingAngle: 0,
    isAiming: false,
    aimX: 5.0,
    aimY: 5.0,
  });
  playerManager.applyPlayerInputs(inputMap1, 0.016, objects, false);

  // Assertions:
  // - Spawner stays put!
  assert(spawnerApple.isHeld === false, "Spawner apple MUST remain unheld (isHeld === false)");
  assert(spawnerApple.heldBy === null, "Spawner apple heldBy must be null");
  assert(spawnerApple.position.x === 5.0 && spawnerApple.position.y === 5.0, "Spawner apple position must stay put at (5, 5)");
  assert(spawnerApple.spawnerModule !== null, "Spawner apple must RETAIN its SpawnerModule");
  assert(spawnerApple.spawnerModule!.spawnCount === 1, "Spawner apple spawnCount must be incremented to 1");

  // - Clone goes to character's hands!
  assert(hero.heldObject !== null, "Hero must now hold an object");
  assert(hero.heldObject !== spawnerApple, "Hero must NOT hold the spawner apple");
  const heldClone = hero.heldObject!;
  assert(heldClone.spawnerModule === null, "Clone in hero's hands must NOT have a SpawnerModule");
  assert(heldClone.isHeld === true, "Clone isHeld must be true");
  assert(heldClone.heldBy === hero, "Clone heldBy must be hero");
  assert(objects.includes(heldClone), "Clone must be in the world objects array");
  assert(heldClone.consumableModule !== null, "Clone has consumableModule");
  assert(heldClone.consumableModule!.tag === "food", "Clone consumable tag is 'food'");
  assert(heldClone.consumableModule!.getRemainingEnergy() === 500, "Clone has 500 J energy");
  console.log("PASS: PlayerManager grab left spawner in place and placed clone without spawner into hero's hands!");

  // 2. Drop the clone, pick up another clone from the same stationary spawner!
  console.log("2. Testing second pickup from stationary spawner...");
  hero.pickupModule!.drop(hero);
  assert(hero.heldObject === null, "Hero dropped the clone");
  assert(objects.includes(heldClone), "First clone is still in objects on the ground");

  // Pick up again from the spawner
  const inputMap2 = new Map();
  inputMap2.set(playerId, {
    playerId,
    tick: 2,
    moveX: 0,
    moveY: 0,
    isJumpHeld: false,
    isGrabHeld: true,
    grabTargetObjectId: spawnerApple.id,
    facingAngle: 0,
    isAiming: false,
    aimX: 5.0,
    aimY: 5.0,
  });
  playerManager.applyPlayerInputs(inputMap2, 0.016, objects, false);

  assert(spawnerApple.isHeld === false, "Spawner apple still unheld");
  assert(spawnerApple.spawnerModule!.spawnCount === 2, "Spawner apple spawnCount is now 2");
  assert(hero.heldObject !== null && hero.heldObject !== heldClone && hero.heldObject !== spawnerApple, "Hero holds a brand new second clone");
  assert(hero.heldObject.spawnerModule === null, "Second clone has no SpawnerModule");
  assert(spawnerApple.position.x === 5.0 && spawnerApple.position.y === 5.0, "Spawner apple STILL sitting at (5, 5)");
  console.log("PASS: Second clone dispensed without moving the spawner!");

  // 3. Server Game Simulation pickup action
  console.log("3. Testing ServerGameSimulation pickup action...");
  const serverSim = new ServerGameSimulation();
  const serverSpawner = new GameObject({
    id: "server-spawner-1",
    name: "Server Apple Spawner",
    position: { x: 3.0, y: 3.0, z: 0 },
    colliderRadius: 0.35,
    mass: 0.5,
    spawnerModule: new SpawnerModule({ spawnPosition: { x: 3.0, y: 3.0, z: 0 }, enabled: true }),
  });
  serverSim.objects.push(serverSpawner);
  const serverHero = new Character({ x: 3.2, y: 3.0, playerId: "p_server" });
  serverSim.characters.set("p_server", serverHero);

  serverSim.processReliableActions([
    {
      actionId: "act-pickup-1",
      type: "pickup",
      playerId: "p_server",
      targetObjectId: serverSpawner.id,
      tick: 1,
      timestamp: 100,
    },
  ]);

  assert(serverSpawner.isHeld === false, "Server spawner stays unheld");
  assert(serverSpawner.position.x === 3.0 && serverSpawner.position.y === 3.0, "Server spawner stays at (3, 3)");
  assert(serverHero.heldObject !== null && serverHero.heldObject !== serverSpawner, "Server hero holds clone");
  assert(serverHero.heldObject.spawnerModule === null, "Server clone has no SpawnerModule");
  console.log("PASS: ServerGameSimulation correctly dispenses clone and keeps spawner in place!");

  // 4. ContestedGrabArbiter test
  console.log("4. Testing ContestedGrabArbiter...");
  const arbiterChar = new Character({ x: 3.2, y: 3.0, playerId: "p_arbiter" });
  const arbiterSpawner = new GameObject({
    id: "arb-spawner",
    name: "Arbiter Spawner",
    position: { x: 3.0, y: 3.0, z: 0 },
    spawnerModule: new SpawnerModule({ enabled: true }),
  });
  const arbiterObjects: GameObject[] = [arbiterSpawner];
  ContestedGrabArbiter.arbitrate(
    [
      {
        char: arbiterChar,
        target: arbiterSpawner,
        pkt: { tick: 1, moveX: 0, moveY: 0, isJumpHeld: false, isGrabHeld: true, facingAngle: 0, isAiming: false },
      },
    ],
    1,
    undefined,
    arena,
    arbiterObjects
  );
  assert(arbiterSpawner.isHeld === false, "Arbiter spawner remains unheld");
  assert(arbiterChar.heldObject !== null && arbiterChar.heldObject !== arbiterSpawner, "Arbiter char holds clone");
  assert(arbiterChar.heldObject.spawnerModule === null, "Arbiter clone has no spawner module");
  console.log("PASS: ContestedGrabArbiter correctly handles spawner targets!");

  console.log("\nALL SPAWNER CONTRACT TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
