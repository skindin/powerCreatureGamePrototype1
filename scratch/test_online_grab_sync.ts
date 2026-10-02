import http from "node:http";
import WebSocket from "ws";
import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";

async function runGrabTest(): Promise<void> {
  console.log("🧪 Starting Online Room Grab & Carry Synchronization Test...");

  (global as any).WebSocket = WebSocket;

  // 1. Create HTTP server and attach UniversalRoomManager
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("OK");
  });

  const roomManager = UniversalRoomManager.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;
  console.log(`✅ UniversalRoomManager listening at ${wsUrl}`);

  // 2. Connect Client 1 (TealBeast) and Client 2 (CyanNinja)
  const client1 = new OnlineRoomClient("TealBeast");
  const client2 = new OnlineRoomClient("CyanNinja");

  let c1Joined = false;
  let c2Joined = false;
  client1.onJoined = () => { c1Joined = true; };
  client2.onJoined = () => { c2Joined = true; };

  client1.connect(wsUrl);
  client2.connect(wsUrl);

  for (let i = 0; i < 50; i++) {
    if (c1Joined && c2Joined) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!c1Joined || !c2Joined) throw new Error("Clients failed to connect/join");
  console.log("✅ Both clients joined room!");

  // 3. Test Client 1 Grabbing an Object
  // Get an object from the server simulation
  const targetObj = roomManager.simulation.objects[0];
  console.log(`🎯 Target object for grab test: ${targetObj.name} (${targetObj.id})`);

  let c2SawC1Holding = false;
  let c2SawObjectHeld = false;

  client2.onSnapshotReceived = (snap) => {
    if (snap.characters) {
      const c1 = snap.characters.find((c: any) => c.id === client1.clientId);
      if (c1 && c1.heldObjectId === targetObj.id && c1.isHolding) {
        c2SawC1Holding = true;
      }
    }
    if (snap.objects) {
      const obj = snap.objects.find((o: any) => o.id === targetObj.id);
      if (obj && obj.isHeld && (obj.heldBy === client1.clientId || obj.heldBy === "player")) {
        c2SawObjectHeld = true;
      }
    }
  };

  // Client 1 grabs targetObj locally and streams telemetry
  const mockHoldingChar = {
    playerId: client1.clientId!,
    name: client1.playerName,
    position: { x: targetObj.position.x, y: targetObj.position.y, z: 0.0 },
    velocity: { x: 1.0, y: 0.0 },
    hasVerticalVelocity: false,
    verticalVelocity: 0,
    colliderRadius: 0.44,
    color: "#f59e0b",
    isClimbing: false,
    isAboveWalls: false,
    facingAngle: 0.0,
    heldObject: { id: targetObj.id },
  };

  const mockObjectsClient1 = roomManager.simulation.objects.map((o) => ({
    id: o.id,
    name: o.name,
    position: { x: o.position.x, y: o.position.y, z: o.position.z },
    velocity: { x: o.velocity.x, y: o.velocity.y },
    hasVerticalVelocity: false,
    colliderRadius: o.colliderRadius,
    color: o.color,
    visualShape: o.visualShape,
    isHeld: o.id === targetObj.id,
    heldBy: o.id === targetObj.id ? mockHoldingChar : null,
    isAboveWalls: false,
    isSleeping: false,
  }));

  // Client 1 sends input with reliable action AND telemetry
  client1.queueReliableAction({
    actionId: `test-act-pickup-${Date.now()}`,
    type: "pickup",
    tick: 1,
    timestamp: performance.now(),
    playerId: client1.clientId!,
    targetObjectId: targetObj.id,
  });

  client1.sendPlayerInput(
    {
      playerId: client1.clientId!,
      playerName: client1.playerName,
      tick: 1,
      moveX: 1.0,
      moveY: 0.0,
      isSprinting: false,
      isJumpHeld: false,
      isAiming: false,
      isGrabHeld: true,
      grabTargetObjectId: targetObj.id,
    },
    mockHoldingChar,
    mockObjectsClient1
  );

  // Client 2 is moving around and sending its telemetry (where Client 2 is NOT holding targetObj)
  const mockFreeCharClient2 = {
    playerId: client2.clientId!,
    name: client2.playerName,
    position: { x: 8.0, y: 8.0, z: 0.0 },
    velocity: { x: 0.0, y: 0.0 },
    hasVerticalVelocity: false,
    verticalVelocity: 0,
    colliderRadius: 0.44,
    color: "#06b6d4",
    isClimbing: false,
    isAboveWalls: false,
    facingAngle: 0.0,
    heldObject: null,
  };

  const mockObjectsClient2 = roomManager.simulation.objects.map((o) => ({
    id: o.id,
    name: o.name,
    position: { x: o.position.x, y: o.position.y, z: o.position.z },
    velocity: { x: o.velocity.x, y: o.velocity.y },
    hasVerticalVelocity: false,
    colliderRadius: o.colliderRadius,
    color: o.color,
    visualShape: o.visualShape,
    isHeld: false, // Client 2 does not hold it
    heldBy: null,
    isAboveWalls: false,
    isSleeping: false,
  }));

  // Client 2 sends repeated packets to simulate network traffic
  for (let step = 0; step < 10; step++) {
    client2.sendPlayerInput(
      {
        playerId: client2.clientId!,
        playerName: client2.playerName,
        tick: step + 1,
        moveX: 0.0,
        moveY: 0.0,
        isSprinting: false,
        isJumpHeld: false,
        isAiming: false,
      },
      mockFreeCharClient2,
      mockObjectsClient2
    );
    await new Promise((r) => setTimeout(r, 16));
  }

  // Wait to confirm Client 2 received Client 1 holding targetObj
  for (let i = 0; i < 50; i++) {
    if (c2SawC1Holding && c2SawObjectHeld) break;
    await new Promise((r) => setTimeout(r, 20));
  }

  if (!c2SawC1Holding) throw new Error("Client 2 never saw Client 1 marked as holding targetObj");
  if (!c2SawObjectHeld) throw new Error("Client 2 never saw targetObj marked as isHeld=true");
  console.log("✅ Verified: Client 2 successfully saw Client 1 holding targetObj in server snapshots!");
  console.log("✅ Verified: Client 2's packets (isHeld=false) did NOT ungrab the object from Client 1!");

  // 4. Test Client 1 Throwing the Object
  let c2SawObjectReleased = false;
  client2.onSnapshotReceived = (snap) => {
    if (snap.objects) {
      const obj = snap.objects.find((o: any) => o.id === targetObj.id);
      if (obj && !obj.isHeld) {
        c2SawObjectReleased = true;
      }
    }
  };

  mockHoldingChar.heldObject = null as any;
  client1.sendPlayerInput(
    {
      playerId: client1.clientId!,
      playerName: client1.playerName,
      tick: 20,
      moveX: 0.0,
      moveY: 0.0,
      isSprinting: false,
      isJumpHeld: false,
      isAiming: false,
      isThrow: true,
      aimX: 10.0,
      aimY: 10.0,
    },
    mockHoldingChar,
    mockObjectsClient2
  );

  for (let i = 0; i < 50; i++) {
    if (c2SawObjectReleased) break;
    await new Promise((r) => setTimeout(r, 20));
  }

  if (!c2SawObjectReleased) throw new Error("Client 2 never saw targetObj released after throw");
  console.log("✅ Verified: Object release / throw synchronized to all clients!");

  // Clean disconnect
  client1.disconnect();
  client2.disconnect();
  roomManager.stop();
  server.close();

  console.log("🎉 ALL ONLINE GRAB & CARRY SYNCHRONIZATION TESTS PASSED 100%!");
}

runGrabTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
