import http from "node:http";
import { WebSocket } from "ws";
import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";

async function runTest() {
  console.log("🧪 [Test] Starting Secondary Player Throw Verification...");

  const server = http.createServer();
  const roomManager = UniversalRoomManager.getInstance();
  const wss = UniversalRoomManager.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as any).port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  let client: OnlineRoomClient | null = null;

  try {
    const arena = new Arena();
    const stone = new GameObject({
      id: "stone-1",
      name: "Light Blue Box",
      position: { x: 6.8, y: 4.4, z: 0 },
      mass: 0.7,
      colliderRadius: 0.26,
      color: "#38bdf8",
      bounceMod: 0.25,
      visualShape: "box",
    });

    const mockCanvas = {} as any;
    const mockRenderer = { getHoverScale: () => 1.0, showBufferTrail: false } as any;
    const mockInput = { isKeyboardActive: false, gamepadSlots: new Map() } as any;
    const mockDevPanel = { isEditMode: false, updateInspector: () => {} } as any;

    const gameLoop = new GameLoop({
      canvas: mockCanvas,
      arena,
      objects: [stone],
      renderer: mockRenderer,
      inputManager: mockInput,
      devPanel: mockDevPanel,
    });
    gameLoop.enableAuthoritativeObjectSync = true;

    client = new OnlineRoomClient();
    client.connect(wsUrl);

    await new Promise<void>((resolve) => {
      client!.onJoined = () => resolve();
    });
    console.log("✅ Client connected and joined universal room");

    // Spawn keyboard and gamepad-0 players in client playerManager
    const kbChar = gameLoop.playerManager.spawnKeyboardPlayer();
    const gpChar = gameLoop.playerManager.spawnGamepadPlayer(0, "Controller #1");

    // Register gamepad player with server
    client.addPlayer("gamepad-0");
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Verify both characters exist on the server
    const serverChars = roomManager.simulation.characters;
    const gpServerCharId = client.getServerCharId("gamepad-0");
    if (!serverChars.has(gpServerCharId)) {
      throw new Error(`Server missing gamepad character with id ${gpServerCharId}`);
    }
    console.log(`✅ Gamepad character registered on server: ${gpServerCharId}`);

    // Teleport gamepad character next to stone-1 and pick it up
    gpChar.position.x = stone.position.x;
    gpChar.position.y = stone.position.y;
    gpChar.pickupModule?.pickup(gpChar, stone);

    if (gpChar.heldObject !== stone) {
      throw new Error("Client gamepad character failed to pick up stone-1");
    }
    console.log("✅ Gamepad character picked up stone-1 locally");

    // Send pickup action & telemetry to server
    const pickupAction = {
      actionId: `act-gp0-pickup-${Date.now()}`,
      type: "pickup" as const,
      tick: 1,
      timestamp: performance.now(),
      playerId: "gamepad-0",
      targetObjectId: stone.id,
    };
    client.queueReliableAction(pickupAction);

    // Stream inputs for a few ticks to let server process pickup
    for (let t = 0; t < 6; t++) {
      client.sendPlayerInput("keyboard", {
        playerId: client.getServerCharId("keyboard"),
        moveX: 0,
        moveY: 0,
        isSprinting: false,
        isJumpHeld: false,
        isGrabHeld: false,
        isAiming: false,
        isLockHeld: false,
      }, kbChar, gameLoop.objects);

      client.sendPlayerInput("gamepad-0", {
        playerId: gpServerCharId,
        moveX: 0,
        moveY: 0,
        isSprinting: false,
        isJumpHeld: false,
        isGrabHeld: false,
        isAiming: true,
        isLockHeld: false,
        aimX: gpChar.position.x + 5,
        aimY: gpChar.position.y,
      }, gpChar, gameLoop.objects);

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const sGpChar = serverChars.get(gpServerCharId);
    console.log(`Server sGpChar.heldObject: ${sGpChar?.heldObject?.id}`);

    // Now Gamepad throws the object!
    const throwAimX = gpChar.position.x + 8.0;
    const throwAimY = gpChar.position.y;
    const throwAction = {
      actionId: `act-gp0-throw-${Date.now()}`,
      type: "throw" as const,
      tick: 7,
      timestamp: performance.now(),
      playerId: "gamepad-0",
      targetObjectId: stone.id,
      aimX: throwAimX,
      aimY: throwAimY,
    };

    // Client executes throw locally
    gpChar.throwModule?.throwHeldObject(gpChar, throwAimX, throwAimY, arena);
    if (stone.isHeld || !stone.isInFlight) {
      throw new Error("Client throw did not launch stone into flight");
    }
    const clientLaunchSpeed = Math.hypot(stone.velocity.x, stone.velocity.y);
    console.log(`✅ Client launched stone: speed=${clientLaunchSpeed.toFixed(2)}, vz=${stone.verticalVelocity.toFixed(2)}`);

    // Client queues reliable throw action
    client.queueReliableAction(throwAction);

    // Send input stream from both players
    for (let t = 0; t < 12; t++) {
      client.sendPlayerInput("keyboard", {
        playerId: client.getServerCharId("keyboard"),
        moveX: 0,
        moveY: 0,
        isSprinting: false,
        isJumpHeld: false,
        isGrabHeld: false,
        isAiming: false,
        isLockHeld: false,
      }, kbChar, gameLoop.objects);

      client.sendPlayerInput("gamepad-0", {
        playerId: gpServerCharId,
        moveX: 0,
        moveY: 0,
        isSprinting: false,
        isJumpHeld: false,
        isGrabHeld: false,
        isAiming: false,
        isLockHeld: false,
      }, gpChar, gameLoop.objects);

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    // Check server state of stone-1
    const sStone = roomManager.simulation.objects.find((o) => o.id === "stone-1");
    if (!sStone) throw new Error("Server stone-1 not found");

    const sSpeed = Math.hypot(sStone.velocity.x, sStone.velocity.y);
    console.log(`Server stone state: isHeld=${sStone.isHeld}, isInFlight=${sStone.isInFlight}, speed=${sSpeed.toFixed(2)}, vz=${sStone.verticalVelocity.toFixed(2)}, x=${sStone.position.x.toFixed(2)}`);

    if (sStone.isHeld) {
      throw new Error("Server stone is still held after throw action!");
    }
    if (sSpeed < 1.0 && sStone.position.x <= gpChar.position.x + 1.0) {
      throw new Error(`Server stone did not launch with speed! speed=${sSpeed.toFixed(2)}, x=${sStone.position.x.toFixed(2)}`);
    }

    // Now test client syncAuthoritativeObjects with a server snapshot
    const serverObjSnap = [{
      id: "stone-1",
      x: sStone.position.x,
      y: sStone.position.y,
      z: sStone.position.z,
      vx: sStone.velocity.x,
      vy: sStone.velocity.y,
      vz: sStone.verticalVelocity,
      isGrounded: false,
      isSleeping: false,
    }];

    gameLoop.syncAuthoritativeObjects(serverObjSnap as any, client.clientId || undefined, 100);

    const clientStoneSpeed = Math.hypot(stone.velocity.x, stone.velocity.y);
    console.log(`Client stone state after sync: isInFlight=${stone.isInFlight}, speed=${clientStoneSpeed.toFixed(2)}, vz=${stone.verticalVelocity.toFixed(2)}, x=${stone.position.x.toFixed(2)}`);

    if (clientStoneSpeed < 1.0) {
      throw new Error(`Client stone velocity was crushed to 0! speed=${clientStoneSpeed.toFixed(2)}`);
    }

    console.log("🎉 ALL SECONDARY PLAYER THROW TESTS PASSED PERFECTLY!");
    client.disconnect();
    roomManager.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err);
    if (client) client.disconnect();
    roomManager.stop();
    server.close();
    process.exit(1);
  }
}

runTest();
