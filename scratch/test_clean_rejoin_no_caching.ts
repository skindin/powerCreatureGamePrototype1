import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";
import { Character } from "../src/character/Character.js";
import http from "node:http";
import WebSocket from "ws";

async function runCleanDisconnectRejoinTest() {
  console.log("🧪 Testing Clean Disconnect Rejoin and No Position Caching...");
  (global as any).WebSocket = WebSocket;

  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("OK");
  });
  const room = UniversalRoomManager.attach(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as any).port;

  // 1. Client 1 connects
  const c1 = new OnlineRoomClient("FirstPlayer");
  let c1Spawn: any = null;
  c1.onPlayerRegistered = (info) => {
    c1Spawn = info.spawnPos;
  };

  await c1.connect(`ws://127.0.0.1:${port}/ws`);
  await new Promise((r) => setTimeout(r, 200));

  console.log("C1 Initial Spawn:", c1Spawn);
  if (!c1Spawn || Math.abs(c1Spawn.x - 4.8) > 0.05 || Math.abs(c1Spawn.y - 7.0) > 0.05) {
    throw new Error(`Expected C1 to spawn at (4.8, 7.0), got ${JSON.stringify(c1Spawn)}`);
  }

  // Simulate C1 sending telemetry from somewhere far away (e.g. (10.0, 5.0))
  c1.sendPlayerInput(
    "keyboard",
    {
      playerId: c1.clientId!,
      playerName: "FirstPlayer",
      tick: 10,
      moveX: 1,
      moveY: 0,
      isSprinting: false,
      isJumpHeld: false,
      isGrabHeld: false,
      isLockHeld: false,
      isAiming: false,
    },
    new Character({ x: 10.0, y: 5.0, name: "FirstPlayer" })
  );

  await new Promise((r) => setTimeout(r, 100));

  // Verify server processed or moved, then C1 leaves
  console.log("C1 disconnecting...");
  c1.disconnect();
  await new Promise((r) => setTimeout(r, 200));

  // 2. Client 2 connects as a new user taking Slot 1 / first player
  const c2 = new OnlineRoomClient("SecondPlayer");
  let c2Spawn: any = null;
  c2.onPlayerRegistered = (info) => {
    c2Spawn = info.spawnPos;
  };

  await c2.connect(`ws://127.0.0.1:${port}/ws`);
  await new Promise((r) => setTimeout(r, 200));

  console.log("C2 Fresh Spawn after C1 left:", c2Spawn);
  if (!c2Spawn || Math.abs(c2Spawn.x - 4.8) > 0.05 || Math.abs(c2Spawn.y - 7.0) > 0.05) {
    throw new Error(`Expected fresh player C2 to spawn cleanly at dedicated spawn (4.8, 7.0), got ${JSON.stringify(c2Spawn)}`);
  }

  // Verify server simulation character is at (4.8, 7.0) and has spawnImmunityTicks active
  const sChar = room.simulation.characters.get(c2.clientId!);
  if (!sChar) {
    throw new Error("Server simulation should have C2 registered");
  }
  if (Math.abs(sChar.position.x - 4.8) > 0.05 || Math.abs(sChar.position.y - 7.0) > 0.05) {
    throw new Error(`Server character position should be at (4.8, 7.0), got (${sChar.position.x}, ${sChar.position.y})`);
  }

  // 3. Client 2 tries to send a packet with a stale local coordinate from local mode (e.g. (14.0, 10.0))
  // Because spawnImmunityTicks is active (> 0), the server MUST NOT snap to the client coordinate!
  c2.sendPlayerInput(
    "keyboard",
    {
      playerId: c2.clientId!,
      playerName: "SecondPlayer",
      tick: 20,
      moveX: 0,
      moveY: 0,
      isSprinting: false,
      isJumpHeld: false,
      isGrabHeld: false,
      isLockHeld: false,
      isAiming: false,
    },
    new Character({ x: 14.0, y: 10.0, name: "SecondPlayer" })
  );

  await new Promise((r) => setTimeout(r, 100));

  // Verify server character did NOT jump to 14.0, 10.0!
  if (Math.abs(sChar.position.x - 4.8) > 0.1 || Math.abs(sChar.position.y - 7.0) > 0.1) {
    throw new Error(`Spawn immunity violated! Character jumped to (${sChar.position.x}, ${sChar.position.y})`);
  }

  console.log("✅ Clean disconnect rejoin & spawn immunity confirmed! Zero stale position caching!");

  c2.disconnect();
  room.stop();
  server.close();
  console.log("🎉 ALL TESTS PASSED!");
  process.exit(0);
}

runCleanDisconnectRejoinTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
