import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";
import http from "node:http";
import WebSocket from "ws";

async function run() {
  console.log("🧪 Testing Server-Authoritative Spawning and Contested Grab Reliable ACKs...");
  (global as any).WebSocket = WebSocket;

  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("OK");
  });
  const room = UniversalRoomManager.attach(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as any).port;

  const c1 = new OnlineRoomClient("Player1");
  const c2 = new OnlineRoomClient("Player2");

  let c1SpawnReceived: any = null;
  let c2SpawnReceived: any = null;

  c1.onPlayerRegistered = (info) => {
    c1SpawnReceived = info.spawnPos;
  };
  c2.onPlayerRegistered = (info) => {
    c2SpawnReceived = info.spawnPos;
  };

  await c1.connect(`ws://127.0.0.1:${port}/ws`);
  await c2.connect(`ws://127.0.0.1:${port}/ws`);

  await new Promise((r) => setTimeout(r, 200));

  console.log(`P1 server spawnPos:`, c1SpawnReceived);
  console.log(`P2 server spawnPos:`, c2SpawnReceived);

  if (!c1SpawnReceived || c1SpawnReceived.x !== 3.5 || c1SpawnReceived.y !== 7.0) {
    throw new Error(`Expected P1 to spawn at (3.5, 7.0), got ${JSON.stringify(c1SpawnReceived)}`);
  }
  if (!c2SpawnReceived || c2SpawnReceived.x !== 17.0 || c2SpawnReceived.y !== 3.5) {
    throw new Error(`Expected P2 to spawn at (17.0, 3.5), got ${JSON.stringify(c2SpawnReceived)}`);
  }
  console.log("✅ Server-authoritative slot spawning verified!");

  // Test Contested Grab Arbitration reliable transmission & ACK
  let c1ContestedEvents: any[] = [];
  let c2ContestedEvents: any[] = [];
  c1.onContestedGrabEvents = (evs) => { c1ContestedEvents.push(...evs); };
  c2.onContestedGrabEvents = (evs) => { c2ContestedEvents.push(...evs); };

  // Simulate both players grabbing the same object on server
  const sim = room.simulation;
  const targetObj = sim.objects[0];
  const char1 = sim.characters.get(c1.clientId!);
  const char2 = sim.characters.get(c2.clientId!);

  if (!char1 || !char2 || !targetObj) {
    throw new Error("Missing characters or objects for grab contest test");
  }

  // Position both characters right next to targetObj
  char1.position.x = targetObj.position.x - 0.2;
  char1.position.y = targetObj.position.y;
  char2.position.x = targetObj.position.x + 0.2;
  char2.position.y = targetObj.position.y;
  char1.strength = 1.0;
  char2.strength = 2.0; // char2 wins by strength!

  // Send grab requests simultaneously
  c1.sendPlayerInput("keyboard", {
    tick: 1,
    moveX: 0,
    moveY: 0,
    isSprinting: false,
    isAiming: false,
    isJumpHeld: false,
    isGrabHeld: true,
    isThrow: false,
    isDrop: false,
    grabTargetObjectId: targetObj.id,
  }, char1 as any, [targetObj]);

  c2.sendPlayerInput("keyboard", {
    tick: 1,
    moveX: 0,
    moveY: 0,
    isSprinting: false,
    isAiming: false,
    isJumpHeld: false,
    isGrabHeld: true,
    isThrow: false,
    isDrop: false,
    grabTargetObjectId: targetObj.id,
  }, char2 as any, [targetObj]);

  // Wait a few ticks for simulation to step and broadcast
  await new Promise((r) => setTimeout(r, 200));

  console.log(`C1 contested events count: ${c1ContestedEvents.length}`);
  console.log(`C2 contested events count: ${c2ContestedEvents.length}`);

  if (c2ContestedEvents.length === 0 || c1ContestedEvents.length === 0) {
    throw new Error("Expected contested events to be received by both clients!");
  }

  const ev = c2ContestedEvents[0];
  console.log(`Arbitration event: Winner=${ev.winnerPlayerId}, Losers=${ev.loserPlayerIds}, Reason=${ev.reason}`);
  if (ev.winnerPlayerId !== char2.playerId) {
    throw new Error(`Expected char2 to win by strength, but winner was ${ev.winnerPlayerId}`);
  }
  if (!ev.loserPlayerIds.includes(char1.playerId)) {
    throw new Error(`Expected char1 to be in loserPlayerIds, got ${ev.loserPlayerIds}`);
  }

  // Confirm client ACK was queued
  console.log(`C1 unacked contested acks size: ${c1.unacknowledgedContestedAcks.size}`);
  console.log(`C2 unacked contested acks size: ${c2.unacknowledgedContestedAcks.size}`);

  // Send next input packets carrying the ACKs
  c1.sendPlayerInput("keyboard", {
    tick: 2,
    moveX: 0,
    moveY: 0,
    isSprinting: false,
    isAiming: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isThrow: false,
    isDrop: false,
  });
  c2.sendPlayerInput("keyboard", {
    tick: 2,
    moveX: 0,
    moveY: 0,
    isSprinting: false,
    isAiming: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isThrow: false,
    isDrop: false,
  });

  await new Promise((r) => setTimeout(r, 200));

  console.log(`Server pending contested events: ${sim.pendingContestedEvents.size}`);
  if (sim.pendingContestedEvents.size !== 0) {
    throw new Error(`Expected server pendingContestedEvents to be cleared after both ACKs, but size is ${sim.pendingContestedEvents.size}`);
  }

  console.log("✅ Contested Grab Arbitration reliable transmission & ACK verified!");

  c1.disconnect();
  c2.disconnect();
  room.stop();
  server.close();
  console.log("🎉 ALL TESTS PASSED!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
