import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { ServerTelemetryBroadcaster } from "../src/server/ServerTelemetryBroadcaster.js";
import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ConsumableModule } from "../src/engine/ConsumableModule.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { Renderer } from "../src/engine/Renderer.js";
import { InputManager } from "../src/ui/InputManager.js";
import { DevPanel } from "../src/ui/DevPanel.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runTest() {
  console.log("=== Testing Multiplayer Food & Energy Systems ===");

  // 1. Setup Server Simulation
  const serverSim = new ServerGameSimulation({
    arenaWidth: 20,
    arenaHeight: 14,
  });

  // Create an apple on the server
  const serverApple = new GameObject({
    id: "apple-online-1",
    name: "Apple",
    position: { x: 5.0, y: 5.0, z: 0 },
    colliderRadius: 0.25,
    consumableModule: new ConsumableModule({
      tag: "food",
      totalEnergyJoules: 1000,
      remainingEnergyJoules: 1000,
      consumeRateWatts: 500,
    }),
  });
  serverSim.objects.push(serverApple);

  // Create P1 on the server
  const serverP1 = new Character({
    playerId: "player-1",
    name: "P1",
    x: 5.0,
    y: 5.0,
  });
  serverSim.characters.set(serverP1.playerId, serverP1);

  // P1 picks up the apple on the server
  serverP1.heldObject = serverApple;
  serverApple.isHeld = true;
  serverApple.heldBy = serverP1;

  // 2. Setup Client GameLoop for Observer (Client 2)
  const clientArena = new Arena(20, 14, 1.0);
  const client2Char = new Character({
    playerId: "keyboard",
    name: "Local Player 2",
    x: 10.0,
    y: 10.0,
  });
  (client2Char as any)._isInOnlineMode = true;

  const canvasMock: any = {
    getContext: () => ({
      save: () => {},
      restore: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      measureText: () => ({ width: 10 }),
      fillText: () => {},
    }),
    width: 800,
    height: 600,
    style: {},
  };
  const renderer = new Renderer(canvasMock, clientArena);
  const inputManager = new InputManager(canvasMock, clientArena);
  const devPanelMock: any = {
    isEditMode: false,
    updateInspector: () => {},
  };

  const clientGameLoop = new GameLoop({
    arena: clientArena,
    character: client2Char,
    objects: [],
    renderer,
    inputManager,
    devPanel: devPanelMock,
  });

  // Client 2 connects: initially has 0 objects
  assert(clientGameLoop.objects.length === 0, "Client starts with 0 objects");

  // Broadcast initial server telemetry snapshot to Client 2
  const snapshot1 = serverSim.getGhostSnapshot();
  clientGameLoop.syncAuthoritativeObjects(snapshot1.objects, "client-2", snapshot1.seq);

  // Client 2 should now have spawned the apple authoritatively!
  assert(clientGameLoop.objects.length === 1, "Server apple was authoritatively spawned on Client 2");
  const clientApple = clientGameLoop.objects[0];
  assert(clientApple.id === "apple-online-1", "Spawned object has matching ID");
  assert(clientApple.consumableModule !== null, "Spawned object has ConsumableModule");
  assert(clientApple.consumableModule!.remainingEnergyJoules === 1000, "Spawned apple has 1000 Joules");

  // 3. Simulate P1 eating the apple on the server for 1 second (500W * 1s = 500 Joules consumed)
  serverP1.isUsingItem = true;
  for (let i = 0; i < 60; i++) {
    serverSim.step();
  }

  const remainingOnServer = serverApple.consumableModule!.getRemainingEnergy();
  assert(
    Math.abs(remainingOnServer - 500) < 5,
    `Server processed eating: remaining is ${remainingOnServer.toFixed(1)} J (expected ~500 J)`
  );

  // 4. Broadcast updated server telemetry snapshot to Client 2 (Observer)
  const snapshot2 = serverSim.getGhostSnapshot();
  clientGameLoop.syncAuthoritativeObjects(snapshot2.objects, "client-2", snapshot2.seq);

  const clientRemaining = clientApple.consumableModule!.getRemainingEnergy();
  assert(
    Math.abs(clientRemaining - remainingOnServer) < 1,
    `Client 2 observer observed apple eating status: ${clientRemaining.toFixed(1)} J`
  );
  assert(clientApple.colliderRadius < 0.25, `Client apple shrunk in size: radius=${clientApple.colliderRadius.toFixed(3)}`);

  // 5. Finish eating the apple completely on the server (another 1.2 seconds)
  for (let i = 0; i < 72; i++) {
    serverSim.step();
  }
  assert(
    !serverSim.objects.some((o) => o.id === "apple-online-1"),
    "Apple was completely depleted and deleted on the server"
  );
  assert(serverP1.heldObject === null, "Server player dropped depleted apple from hands");

  // 6. Broadcast deletion snapshot to Client 2
  const snapshot3 = serverSim.getGhostSnapshot();
  clientGameLoop.syncAuthoritativeObjects(snapshot3.objects, "client-2", snapshot3.seq);

  assert(
    !clientGameLoop.objects.some((o) => o.id === "apple-online-1"),
    "Client 2 cleanly deleted the apple after server depletion"
  );

  console.log("=== ALL MULTIPLAYER FOOD & ENERGY TESTS PASSED! ===");
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
