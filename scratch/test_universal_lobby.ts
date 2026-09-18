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
  }));

  // 5. Client B registers 2 players (Controller 1 & Controller 2 on the same page!)
  wsB.send(JSON.stringify({
    type: 'register_player',
    localId: 'gamepad-0',
    name: 'Player 2 (Page B - Controller 1)',
  }));

  wsB.send(JSON.stringify({
    type: 'register_player',
    localId: 'gamepad-1',
    name: 'Player 3 (Page B - Controller 2)',
  }));

  // Wait for player registrations to process
  await new Promise((r) => setTimeout(r, 200));

  // Verify authoritative player color assignments
  const assignedA = messagesA.find((m) => m.type === 'player_assigned' && m.localId === 'keyboard');
  if (!assignedA || assignedA.playerNumber !== 1 || assignedA.color !== '#f59e0b') {
    throw new Error(`Expected P1 to be yellow #f59e0b, got: ${JSON.stringify(assignedA)}`);
  }
  console.log(`✅ First player to join assigned Player 1 with Yellow: ${assignedA.color}`);

  const assignedB0 = messagesB.find((m) => m.type === 'player_assigned' && m.localId === 'gamepad-0');
  if (!assignedB0 || assignedB0.playerNumber !== 2 || assignedB0.color !== '#06b6d4') {
    throw new Error(`Expected P2 to be cyan #06b6d4, got: ${JSON.stringify(assignedB0)}`);
  }
  console.log(`✅ Second player to join assigned Player 2 with Cyan: ${assignedB0.color}`);

  const assignedB1 = messagesB.find((m) => m.type === 'player_assigned' && m.localId === 'gamepad-1');
  if (!assignedB1 || assignedB1.playerNumber !== 3 || assignedB1.color !== '#10b981') {
    throw new Error(`Expected P3 to be emerald #10b981, got: ${JSON.stringify(assignedB1)}`);
  }
  console.log(`✅ Third player to join assigned Player 3 with Emerald: ${assignedB1.color}`);

  console.log(`Active players in lobby: ${gameServer.players.size}`);
  if (gameServer.players.size !== 3) {
    throw new Error(`Expected 3 players in universal lobby, got ${gameServer.players.size}`);
  }

  // Verify object wall elevation: place a wall directly under stone-1 (x: 6.8, y: 4.4)
  // Col 6, Row 4 is where stone-1 is located
  gameServer.setWallTile(6, 4, true);
  const stone1 = gameServer.objects.get("stone-1");
  if (!stone1 || stone1.z < 1.0 || stone1.supportingSurfaceHeight < 1.0) {
    throw new Error(`Expected stone-1 on wall to have z >= 1.0, got z=${stone1?.z}, surface=${stone1?.supportingSurfaceHeight}`);
  }
  console.log(`✅ Dynamic object on wall correctly elevated to wall top: z=${stone1.z}`);

  // 6. Simulate streaming inputs from both pages for 30 ticks (0.5 seconds)
  // Client A triggers a jump on tick 1 (isClimbHeld = true on open ground)
  for (let tick = 1; tick <= 30; tick++) {
    // Client A moves right and jumps on initial ticks
    wsA.send(JSON.stringify({
      type: 'player_input',
      tick,
      inputs: [{
        localId: 'keyboard',
        moveVector: { x: 1.0, y: 0 },
        isGrabHeld: false,
        isThrowHeld: false,
        mousePos: { x: 10.0, y: 7.0 },
        isClimbHeld: tick <= 3, // Holding jump for first 3 ticks
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

  // Verify Player 1 was airborne during the jump
  const jumpSnapshots = messagesB.filter((m) => m.type === 'world_state' && m.players.some((p: any) => p.playerNumber === 1 && p.z > 0.05));
  if (jumpSnapshots.length === 0) {
    throw new Error("Client B never received any snapshot with Player 1 jumping (z > 0.05)!");
  }
  const maxJumpZ = Math.max(...jumpSnapshots.map((s) => s.players.find((p: any) => p.playerNumber === 1).z));
  console.log(`✅ Player 1 jump successfully synchronized to Client B! Peak jump z reached: ${maxJumpZ}`);

  // 6b. Test Object Pickup & Throw across network
  // Client A picks up stone-1
  wsA.send(JSON.stringify({
    type: 'player_input',
    tick: 31,
    inputs: [{
      localId: 'keyboard',
      moveVector: { x: 0, y: 0 },
      isGrabHeld: true,
      isThrowHeld: false,
      mousePos: { x: 6.8, y: 4.4 },
      isClimbHeld: false,
      isSprinting: false,
      heldObjectId: 'stone-1',
    }],
  }));

  await new Promise((r) => setTimeout(r, 100));

  const serverP1 = Array.from(gameServer.players.values()).find((p) => p.playerNumber === 1);
  if (!serverP1 || serverP1.heldObjectId !== 'stone-1') {
    throw new Error(`Expected Server Player 1 to hold stone-1, got: ${serverP1?.heldObjectId}`);
  }
  const heldStone = gameServer.objects.get('stone-1');
  if (!heldStone || !heldStone.isHeld || heldStone.heldBy !== serverP1.id) {
    throw new Error(`Expected stone-1 to be marked isHeld=true and heldBy=P1, got isHeld=${heldStone?.isHeld}, heldBy=${heldStone?.heldBy}`);
  }
  console.log(`✅ Object pickup authoritatively confirmed on server without repulsion: ${heldStone.id} heldBy ${heldStone.heldBy}`);

  // Client A throws stone-1 towards (12, 7)
  wsA.send(JSON.stringify({
    type: 'player_input',
    tick: 32,
    inputs: [{
      localId: 'keyboard',
      moveVector: { x: 0, y: 0 },
      isGrabHeld: false,
      isThrowHeld: true,
      mousePos: { x: 12.0, y: 7.0 },
      isClimbHeld: false,
      isSprinting: false,
      heldObjectId: null,
    }],
  }));

  // Wait 3 ticks (50ms) for throw trajectory step
  await new Promise((r) => setTimeout(r, 100));

  if (serverP1.heldObjectId !== null) {
    throw new Error(`Expected Server Player 1 to have released stone-1, got: ${serverP1.heldObjectId}`);
  }
  if (!heldStone || heldStone.isHeld) {
    throw new Error(`Expected stone-1 to be released (isHeld=false), got: ${heldStone?.isHeld}`);
  }
  if (Math.abs(heldStone.vx) < 0.5 && Math.abs(heldStone.vy) < 0.5) {
    throw new Error(`Expected stone-1 to have ballistic throw velocity, got vx=${heldStone.vx}, vy=${heldStone.vy}`);
  }
  console.log(`✅ Object throw authoritatively executed on server with ballistic velocity: vx=${heldStone.vx.toFixed(2)}, vy=${heldStone.vy.toFixed(2)}, vz=${heldStone.vz.toFixed(2)}`);

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
