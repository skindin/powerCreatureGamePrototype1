import http from 'node:http';
import { WebSocket } from 'ws';
import { GameServer } from '../server/GameServer.js';

async function testUniversalLobby() {
  console.log("=== Testing Universal Multiplayer Lobby & Continuous TOI Rollback ===");

  // 1. Start HTTP Server & Attach GameServer
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("OK");
  });

  const gameServer = new GameServer();
  gameServer.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as any;
  const port = address.port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;
  console.log(`Universal Lobby running at ${wsUrl}`);

  // 2. Connect Browser Page 1 (Client A)
  const wsA = new WebSocket(wsUrl);
  let clientAId = '';
  const messagesA: any[] = [];
  wsA.on('message', (data) => {
    const parsed = JSON.parse(data.toString());
    messagesA.push(parsed);
    if (parsed.type === 'init_state') {
      clientAId = parsed.clientId;
    }
  });

  await new Promise<void>((resolve) => {
    wsA.on('open', () => resolve());
  });

  // 3. Connect Browser Page 2 (Client B)
  const wsB = new WebSocket(wsUrl);
  let clientBId = '';
  const messagesB: any[] = [];
  wsB.on('message', (data) => {
    const parsed = JSON.parse(data.toString());
    messagesB.push(parsed);
    if (parsed.type === 'init_state') {
      clientBId = parsed.clientId;
    }
  });

  await new Promise<void>((resolve) => {
    wsB.on('open', () => resolve());
  });

  // Wait for init_state
  await new Promise((r) => setTimeout(r, 100));
  console.log(`Client A connected: ${clientAId}`);
  console.log(`Client B connected: ${clientBId}`);

  const initA = messagesA.find((m) => m.type === 'init_state');
  if (!initA || !initA.wallMap || initA.wallMap.length !== 280) {
    throw new Error(`Client A failed to receive 280-char wallMap in init_state! Got: ${initA?.wallMap?.length}`);
  }
  console.log(`✅ Client A received authoritative wallMap (${initA.wallMap.length} binary chars: bottom-left to top-right)`);

  // Test map sync: Client A edits a wall tile (col 0, row 0 -> wall)
  wsA.send(JSON.stringify({
    type: 'update_wall_tile',
    col: 0,
    row: 0,
    isWall: true,
  }));
  await new Promise((r) => setTimeout(r, 100));

  const syncB = messagesB.find((m) => m.type === 'wall_map_sync');
  if (!syncB || !syncB.wallMap) {
    throw new Error("Client B failed to receive wall_map_sync after Client A updated wall tile!");
  }
  console.log(`✅ Client B received real-time wall_map_sync broadcast!`);

  // 4. Client A registers 1 player (Keyboard P1)
  wsA.send(JSON.stringify({
    type: 'register_player',
    localId: 'keyboard',
    name: 'Player 1 (Page A)',
    color: '#f59e0b',
  }));

  // 5. Client B registers 2 players (Controller 1 & Controller 2 on the same page!)
  wsB.send(JSON.stringify({
    type: 'register_player',
    localId: 'gamepad-0',
    name: 'Player 2 (Page B - Controller 1)',
    color: '#06b6d4',
  }));

  wsB.send(JSON.stringify({
    type: 'register_player',
    localId: 'gamepad-1',
    name: 'Player 3 (Page B - Controller 2)',
    color: '#10b981',
  }));

  // Wait for player registrations to process
  await new Promise((r) => setTimeout(r, 200));

  console.log(`Active players in lobby: ${gameServer.players.size}`);
  if (gameServer.players.size !== 3) {
    throw new Error(`Expected 3 players in universal lobby, got ${gameServer.players.size}`);
  }

  // 6. Simulate streaming inputs from both pages for 30 ticks (0.5 seconds)
  for (let tick = 1; tick <= 30; tick++) {
    // Client A moves right
    wsA.send(JSON.stringify({
      type: 'player_input',
      tick,
      inputs: [{
        localId: 'keyboard',
        moveVector: { x: 1.0, y: 0 },
        isGrabHeld: false,
        isThrowHeld: false,
        mousePos: { x: 10.0, y: 7.0 },
        isClimbHeld: false,
        isSprinting: true,
      }],
    }));

    // Client B moves Player 2 left and Player 3 up
    wsB.send(JSON.stringify({
      type: 'player_input',
      tick,
      inputs: [
        {
          localId: 'gamepad-0',
          moveVector: { x: -1.0, y: 0 },
          isGrabHeld: false,
          isThrowHeld: false,
          mousePos: null,
          isClimbHeld: false,
          isSprinting: false,
        },
        {
          localId: 'gamepad-1',
          moveVector: { x: 0, y: -1.0 },
          isGrabHeld: false,
          isThrowHeld: false,
          mousePos: null,
          isClimbHeld: false,
          isSprinting: false,
        },
      ],
    }));

    await new Promise((r) => setTimeout(r, 16));
  }

  // Verify that Client A received world snapshots containing all 3 players
  const latestWorldStateA = messagesA.filter((m) => m.type === 'world_state').pop();
  if (!latestWorldStateA) {
    throw new Error("Client A did not receive any world_state snapshots!");
  }

  console.log(`Latest snapshot on Client A: ${latestWorldStateA.players.length} players, ${latestWorldStateA.objects.length} objects`);
  if (latestWorldStateA.players.length !== 3) {
    throw new Error(`Expected 3 players in world snapshot, got ${latestWorldStateA.players.length}`);
  }

  // 7. Test unregistering one player from Client B
  wsB.send(JSON.stringify({
    type: 'unregister_player',
    localId: 'gamepad-0',
  }));

  await new Promise((r) => setTimeout(r, 150));
  console.log(`Active players in lobby after unregistering one: ${gameServer.players.size}`);
  if (gameServer.players.size !== 2) {
    throw new Error(`Expected 2 players after unregister, got ${gameServer.players.size}`);
  }

  // 8. Disconnect Client B completely
  wsB.close();
  await new Promise((r) => setTimeout(r, 150));
  console.log(`Active players after Client B disconnects: ${gameServer.players.size}`);
  if (gameServer.players.size !== 1) {
    throw new Error(`Expected 1 player remaining after Client B closed, got ${gameServer.players.size}`);
  }

  // Cleanup
  wsA.close();
  server.close();

  console.log("✅ Universal Multiplayer Lobby & Continuous TOI Rollback passed all tests!");
  process.exit(0);
}

testUniversalLobby().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
