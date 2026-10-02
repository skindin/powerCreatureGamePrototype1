import http from "node:http";
import WebSocket from "ws";
import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";

async function runTest(): Promise<void> {
  console.log("🧪 Starting Phase 10 Online Room Integration Test...");

  // Polyfill global WebSocket for node environment
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

  // 2. Connect Client 1 (TealBeast)
  const client1 = new OnlineRoomClient("TealBeast");
  let client1Joined = false;
  let client1SlotInfo: any = null;
  client1.onJoined = (info) => {
    client1Joined = true;
    client1SlotInfo = info;
    console.log(`✅ Client 1 joined: ${info.name} as P${info.playerNumber} (${info.color})`);
  };

  client1.connect(wsUrl);

  // Wait for Client 1 join
  for (let i = 0; i < 50; i++) {
    if (client1Joined) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!client1Joined) throw new Error("Client 1 failed to join within 1s");
  if (client1SlotInfo.playerNumber !== 1) throw new Error(`Expected P1 for first player, got P${client1SlotInfo.playerNumber}`);

  // 3. Connect Client 2 (CyanNinja)
  const client2 = new OnlineRoomClient("CyanNinja");
  let client2Joined = false;
  let client2SlotInfo: any = null;
  client2.onJoined = (info) => {
    client2Joined = true;
    client2SlotInfo = info;
    console.log(`✅ Client 2 joined: ${info.name} as P${info.playerNumber} (${info.color})`);
  };

  client2.connect(wsUrl);

  // Wait for Client 2 join
  for (let i = 0; i < 50; i++) {
    if (client2Joined) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!client2Joined) throw new Error("Client 2 failed to join within 1s");
  if (client2SlotInfo.playerNumber !== 2) throw new Error(`Expected P2 for second player, got P${client2SlotInfo.playerNumber}`);

  // 4. Test bidirectional snapshot streaming and position synchronization
  let c1ReceivedC2 = false;
  let c2ReceivedC1 = false;
  let c2XPos = 0;
  let c1YPos = 0;

  client1.onSnapshotReceived = (snap) => {
    if (snap.characters) {
      const c2 = snap.characters.find((c: any) => c.id === client2.clientId);
      if (c2) {
        c1ReceivedC2 = true;
        c2XPos = c2.x;
      }
    }
  };

  client2.onSnapshotReceived = (snap) => {
    if (snap.characters) {
      const c1 = snap.characters.find((c: any) => c.id === client1.clientId);
      if (c1) {
        c2ReceivedC1 = true;
        c1YPos = c1.y;
      }
    }
  };

  // Simulate Player 1 moving and sending inputs + telemetry
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
    },
    {
      playerId: client1.clientId!,
      name: client1.playerName,
      position: { x: 5.5, y: 7.2, z: 0.0 },
      velocity: { x: 3.0, y: 0.0 },
      hasVerticalVelocity: false,
      verticalVelocity: 0,
      colliderRadius: 0.44,
      color: client1SlotInfo.color,
      isClimbing: false,
      isAboveWalls: false,
      facingAngle: 0.0,
    }
  );

  // Simulate Player 2 moving and sending inputs + telemetry
  client2.sendPlayerInput(
    {
      playerId: client2.clientId!,
      playerName: client2.playerName,
      tick: 1,
      moveX: 0.0,
      moveY: 1.0,
      isSprinting: false,
      isJumpHeld: false,
      isAiming: false,
    },
    {
      playerId: client2.clientId!,
      name: client2.playerName,
      position: { x: 8.0, y: 8.5, z: 0.0 },
      velocity: { x: 0.0, y: 2.5 },
      hasVerticalVelocity: false,
      verticalVelocity: 0,
      colliderRadius: 0.44,
      color: client2SlotInfo.color,
      isClimbing: false,
      isAboveWalls: false,
      facingAngle: Math.PI / 2,
    }
  );

  // Wait for snapshots to be broadcasted
  for (let i = 0; i < 50; i++) {
    if (c1ReceivedC2 && c2ReceivedC1) break;
    await new Promise((r) => setTimeout(r, 20));
  }

  if (!c1ReceivedC2) throw new Error("Client 1 never received Client 2 in server snapshots");
  if (!c2ReceivedC1) throw new Error("Client 2 never received Client 1 in server snapshots");
  console.log(`✅ Bidirectional position sync verified: C1 saw C2 at x=${c2XPos}, C2 saw C1 at y=${c1YPos}`);

  // 5. Test Player Renaming
  let c2SawRenamedC1 = false;
  client2.onSnapshotReceived = (snap) => {
    if (snap.characters) {
      const c1 = snap.characters.find((c: any) => c.id === client1.clientId);
      if (c1 && c1.name === "TealKing") {
        c2SawRenamedC1 = true;
      }
    }
  };

  client1.renamePlayer("TealKing");

  for (let i = 0; i < 50; i++) {
    if (c2SawRenamedC1) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!c2SawRenamedC1) throw new Error("Client 2 did not receive renamed player 'TealKing'");
  console.log("✅ Live player rename sync verified");

  // 6. Test Disconnection & Roster Cleanup
  let c1SawC2Leave = false;
  client1.onSnapshotReceived = (snap) => {
    if (snap.characters) {
      const c2 = snap.characters.find((c: any) => c.id === client2.clientId);
      if (!c2) {
        c1SawC2Leave = true;
      }
    }
  };

  client2.disconnect();

  for (let i = 0; i < 50; i++) {
    if (c1SawC2Leave) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!c1SawC2Leave) throw new Error("Client 1 still has Client 2 in roster after disconnection");
  console.log("✅ Client disconnection and server roster cleanup verified");

  // Teardown
  client1.disconnect();
  roomManager.stop();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log("🎉 ALL PHASE 10 ONLINE MULTIPLAYER TESTS PASSED 100%!");
}

runTest().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
