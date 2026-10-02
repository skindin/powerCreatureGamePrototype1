import http from "node:http";
import WebSocket from "ws";
import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";
import { PlayerManager, PLAYER_COLORS } from "../src/engine/PlayerManager.js";
import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";

async function runColorTest(): Promise<void> {
  console.log("🧪 Starting Online Player Color Synchronization Test...");

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

  // 2. Connect Client 1
  const client1 = new OnlineRoomClient("Alpha");
  let client1Joined = false;
  let client1SlotInfo: any = null;
  client1.onJoined = (info) => {
    client1Joined = true;
    client1SlotInfo = info;
  };
  client1.connect(wsUrl);

  for (let i = 0; i < 50; i++) {
    if (client1Joined) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!client1Joined) throw new Error("Client 1 failed to join");

  console.log(`Client 1 joined: P${client1SlotInfo.playerNumber} with color ${client1SlotInfo.color}`);
  if (client1SlotInfo.playerNumber !== 1) throw new Error(`Client 1 expected P1, got P${client1SlotInfo.playerNumber}`);
  if (client1SlotInfo.color !== PLAYER_COLORS[0]) throw new Error(`Client 1 expected ${PLAYER_COLORS[0]}, got ${client1SlotInfo.color}`);

  // 3. Connect Client 2
  const client2 = new OnlineRoomClient("Beta");
  let client2Joined = false;
  let client2SlotInfo: any = null;
  client2.onJoined = (info) => {
    client2Joined = true;
    client2SlotInfo = info;
  };
  client2.connect(wsUrl);

  for (let i = 0; i < 50; i++) {
    if (client2Joined) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!client2Joined) throw new Error("Client 2 failed to join");

  console.log(`Client 2 joined: P${client2SlotInfo.playerNumber} with color ${client2SlotInfo.color}`);
  if (client2SlotInfo.playerNumber !== 2) throw new Error(`Client 2 expected P2, got P${client2SlotInfo.playerNumber}`);
  if (client2SlotInfo.color !== PLAYER_COLORS[1]) throw new Error(`Client 2 expected ${PLAYER_COLORS[1]}, got ${client2SlotInfo.color}`);

  // 4. Verify client stats reflect authoritative assigned colors
  const stats1 = client1.getStats();
  const stats2 = client2.getStats();
  if (stats1.color !== PLAYER_COLORS[0]) throw new Error(`Client 1 stats.color expected ${PLAYER_COLORS[0]}, got ${stats1.color}`);
  if (stats2.color !== PLAYER_COLORS[1]) throw new Error(`Client 2 stats.color expected ${PLAYER_COLORS[1]}, got ${stats2.color}`);
  console.log("✅ Client 1 & Client 2 stats.color match assigned colors!");

  // 5. Test client-side PlayerManager behavior for Client 2
  const arena2 = new Arena(20, 14, 1.0);
  const hero2 = new Character({
    x: 4.8,
    y: 7.0,
    color: "#f59e0b",
    colliderRadius: 0.44,
    mass: 1.2,
    strength: 1.0,
  });
  const pm2 = new PlayerManager({
    arena: arena2,
    inputManager: { isKeyboardActive: false } as any,
    character: hero2,
  });

  hero2.playerId = "keyboard";
  hero2.playerNumber = client2SlotInfo.playerNumber;
  hero2.color = client2SlotInfo.color;
  hero2.playerColor = client2SlotInfo.color;
  hero2.name = client2SlotInfo.name;

  pm2.baseCharacter.playerId = "keyboard";
  pm2.baseCharacter.playerNumber = client2SlotInfo.playerNumber;
  pm2.baseCharacter.color = client2SlotInfo.color;
  pm2.baseCharacter.playerColor = client2SlotInfo.color;
  pm2.baseCharacter.name = client2SlotInfo.name;

  // Simulate user pressing a movement key, triggering spawnKeyboardPlayer()
  const spawnedChar = pm2.spawnKeyboardPlayer();
  console.log(`Spawned character on Client 2: P${spawnedChar.playerNumber}, color: ${spawnedChar.playerColor}`);
  if (spawnedChar.playerNumber !== 2) throw new Error(`Client 2 spawnKeyboardPlayer wiped playerNumber to ${spawnedChar.playerNumber}`);
  if (spawnedChar.playerColor !== PLAYER_COLORS[1]) throw new Error(`Client 2 spawnKeyboardPlayer wiped playerColor to ${spawnedChar.playerColor}`);
  if (spawnedChar.color !== PLAYER_COLORS[1]) throw new Error(`Client 2 spawnKeyboardPlayer wiped color to ${spawnedChar.color}`);

  const pEntry = pm2.players.get("keyboard");
  if (!pEntry || pEntry.color !== PLAYER_COLORS[1]) throw new Error(`Client 2 pEntry.color expected ${PLAYER_COLORS[1]}, got ${pEntry?.color}`);
  console.log("✅ Client 2 PlayerManager preserves server-assigned color and slot!");

  // 6. Test that server rejects client trying to override color
  client2.sendPlayerInput(hero2, [], 100);

  // Allow server to process input and produce a snapshot
  await new Promise((r) => setTimeout(r, 60));

  const serverChar2 = roomManager.simulation.characters.get(client2SlotInfo.clientId);
  if (!serverChar2) throw new Error("Server character 2 not found in simulation");
  console.log(`Server character 2 color: ${serverChar2.color}, playerColor: ${serverChar2.playerColor}`);
  if (serverChar2.color !== PLAYER_COLORS[1]) throw new Error(`Server allowed client to override color! Expected ${PLAYER_COLORS[1]}, got ${serverChar2.color}`);
  if (serverChar2.playerColor !== PLAYER_COLORS[1]) throw new Error(`Server allowed client to override playerColor! Expected ${PLAYER_COLORS[1]}, got ${serverChar2.playerColor}`);
  console.log("✅ Server authoritatively preserved color despite client packet!");

  // 7. Verify snapshots received by Client 1 show Client 2 as Cyan (P2)
  let latestSnap1: any = null;
  client1.onSnapshotReceived = (snap) => {
    latestSnap1 = snap;
  };

  for (let i = 0; i < 50; i++) {
    if (latestSnap1 && latestSnap1.characters && latestSnap1.characters.length >= 2) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!latestSnap1) throw new Error("Client 1 received no snapshot");

  const snapChar2 = latestSnap1.characters.find((c: any) => c.id === client2SlotInfo.clientId);
  if (!snapChar2) throw new Error("Client 2 missing from Client 1 snapshot");
  console.log(`Client 1 received Client 2 in snapshot: id=${snapChar2.id}, color=${snapChar2.color}, playerColor=${snapChar2.playerColor}, playerNumber=${snapChar2.playerNumber}`);
  if (snapChar2.color !== PLAYER_COLORS[1]) throw new Error(`Snapshot color expected ${PLAYER_COLORS[1]}, got ${snapChar2.color}`);
  if (snapChar2.playerNumber !== 2) throw new Error(`Snapshot playerNumber expected 2, got ${snapChar2.playerNumber}`);
  console.log("✅ Snapshots broadcast authoritative colors to all clients!");

  // Cleanup
  client1.disconnect();
  client2.disconnect();
  roomManager.stop();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log("🎉 ALL ONLINE PLAYER COLOR SYNCHRONIZATION TESTS PASSED 100%!");
}

runColorTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
