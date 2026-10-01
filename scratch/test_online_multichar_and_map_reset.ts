import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { WebSocket } from "ws";
import http from "node:http";
import assert from "node:assert";

async function runTest() {
  console.log("=== Testing Multi-Character Per Machine & Map Memory Trashing/Reloading ===");

  // 1. Start test HTTP server and attach UniversalRoomManager
  const server = http.createServer();
  const roomManager = UniversalRoomManager.getInstance();
  const wss = UniversalRoomManager.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;
  console.log(`✓ Attached test UniversalRoomManager on port ${port}`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Single machine connecting with Keyboard + Controller
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Multi-Player on One Machine ---");
    const ws1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    const client1Msgs: any[] = [];
    ws1.on("message", (raw) => {
      client1Msgs.push(JSON.parse(raw.toString()));
    });

    await new Promise<void>((resolve) => ws1.on("open", resolve));

    // Wait for room_welcome
    await new Promise((r) => setTimeout(r, 50));
    const welcome = client1Msgs.find((m) => m.type === "room_welcome");
    assert(welcome, "Expected room_welcome packet");
    assert.strictEqual(welcome.playerNumber, 1, "First player must be P1");
    assert.strictEqual(welcome.color, "#f59e0b", "P1 must have Amber color");
    console.log(`✓ Client 1 connected: P${welcome.playerNumber} (${welcome.color})`);

    // Send join_room with keyboard player named "TealBeast"
    ws1.send(JSON.stringify({
      type: "join_room",
      name: "TealBeast",
      localPlayers: [{ localPlayerId: "keyboard", name: "TealBeast" }],
    }));

    await new Promise((r) => setTimeout(r, 50));
    const joined = client1Msgs.find((m) => m.type === "room_joined");
    assert(joined, "Expected room_joined packet");
    assert.strictEqual(joined.name, "TealBeast", "Nametag / name must be TealBeast");
    console.log(`✓ Client 1 joined as "${joined.name}"`);

    // Now, Player 2 joins on the SAME machine (e.g. Controller #1 plugged in or 'A' pressed)
    ws1.send(JSON.stringify({
      type: "add_player",
      localPlayerId: "gamepad-0",
      name: "ControllerPlayer",
    }));

    await new Promise((r) => setTimeout(r, 50));
    const playerAdded = client1Msgs.find((m) => m.type === "player_added");
    assert(playerAdded, "Expected player_added response from server");
    assert.strictEqual(playerAdded.localPlayerId, "gamepad-0", "localPlayerId must be gamepad-0");
    assert.strictEqual(playerAdded.playerNumber, 2, "Server must assign playerNumber 2 to 2nd character");
    assert.strictEqual(playerAdded.color, "#06b6d4", "Server must assign Cyan color (#06b6d4) to P2");
    assert.strictEqual(playerAdded.name, "ControllerPlayer", "Server must retain player name");
    console.log(`✓ Server acknowledged 2nd player on same machine as P${playerAdded.playerNumber} (${playerAdded.color}, "${playerAdded.name}")`);

    // Verify simulation characters
    assert.strictEqual(roomManager.simulation.characters.size, 2, "Server simulation must contain 2 characters");
    const char1 = roomManager.simulation.characters.get(joined.clientId);
    const char2 = roomManager.simulation.characters.get(`${joined.clientId}:gamepad-0`);
    assert(char1, "P1 character must exist in simulation");
    assert(char2, "P2 character must exist in simulation");
    assert.strictEqual(char1.name, "TealBeast", "P1 name must be TealBeast");
    assert.strictEqual(char2.name, "ControllerPlayer", "P2 name must be ControllerPlayer");
    assert.strictEqual(char1.color, "#f59e0b", "P1 color must be #f59e0b");
    assert.strictEqual(char2.color, "#06b6d4", "P2 color must be #06b6d4");
    console.log("✓ Server simulation has both characters with distinct authoritative colors and names");

    // -------------------------------------------------------------
    // TEST 2: Another machine connects (Remote Client)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Second Machine Connects ---");
    const ws2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const client2Msgs: any[] = [];
    ws2.on("message", (raw) => {
      client2Msgs.push(JSON.parse(raw.toString()));
    });
    await new Promise<void>((resolve) => ws2.on("open", resolve));
    await new Promise((r) => setTimeout(r, 50));

    ws2.send(JSON.stringify({
      type: "join_room",
      name: "RemoteHero",
      localPlayers: [{ localPlayerId: "keyboard", name: "RemoteHero" }],
    }));
    await new Promise((r) => setTimeout(r, 50));

    const joined2 = client2Msgs.find((m) => m.type === "room_joined");
    assert(joined2, "Client 2 expected room_joined");
    assert.strictEqual(joined2.playerNumber, 3, "Client 2 must be assigned P3");
    assert.strictEqual(joined2.color, "#10b981", "Client 2 must be assigned Emerald color (#10b981)");
    console.log(`✓ Client 2 on separate machine assigned P${joined2.playerNumber} (${joined2.color})`);

    // Verify snapshot received by Client 2 contains all 3 characters with names & colors
    const snapshotMsg = client2Msgs.filter((m) => m.type === "pc_server_snapshot" && m.snapshot?.characters?.length === 3).pop();
    assert(snapshotMsg, "Client 2 must receive snapshot containing all 3 characters");
    const snapChars = snapshotMsg.snapshot.characters;
    const p1Snap = snapChars.find((c: any) => c.name === "TealBeast");
    const p2Snap = snapChars.find((c: any) => c.name === "ControllerPlayer");
    const p3Snap = snapChars.find((c: any) => c.name === "RemoteHero");
    assert(p1Snap && p1Snap.color === "#f59e0b", "P1 snapshot valid");
    assert(p2Snap && p2Snap.color === "#06b6d4", "P2 snapshot valid");
    assert(p3Snap && p3Snap.color === "#10b981", "P3 snapshot valid");
    console.log("✓ Authoritative snapshot streams all 3 characters with exact chosen names and assigned colors to remote client");

    // -------------------------------------------------------------
    // TEST 3: Trashing Map Memory when 0 players remain & Reloading
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Trashing Map Memory on Empty & Reloading ---");

    // First displace an object in the simulation (e.g. stone-1)
    const stone = roomManager.simulation.objects.find((o) => o.id === "stone-1");
    assert(stone, "stone-1 exists");
    stone.position.x = 99.5;
    stone.position.y = 88.5;
    console.log(`✓ Displaced stone-1 to (${stone.position.x}, ${stone.position.y})`);

    // Disconnect all clients
    console.log("Disconnecting Client 1 and Client 2...");
    ws1.close();
    ws2.close();
    await new Promise((r) => setTimeout(r, 100));

    // Verify room is empty and memory trashed
    assert.strictEqual(roomManager.clients.size, 0, "Clients map must be empty");
    assert.strictEqual(roomManager.simulation.characters.size, 0, "Simulation characters must be completely cleared");
    assert.strictEqual(roomManager.simulation.objects.length, 0, "Simulation objects must be trashed/cleared");
    console.log("✓ Room empty: Simulation characters and objects completely trashed from memory!");

    // Now a new player connects!
    console.log("New player connecting to empty room...");
    const ws3 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const client3Msgs: any[] = [];
    ws3.on("message", (raw) => {
      client3Msgs.push(JSON.parse(raw.toString()));
    });
    await new Promise<void>((resolve) => ws3.on("open", resolve));
    await new Promise((r) => setTimeout(r, 50));

    // Verify map was reloaded fresh
    assert(roomManager.simulation.objects.length > 0, "Simulation objects must be reloaded");
    const freshStone = roomManager.simulation.objects.find((o) => o.id === "stone-1");
    assert(freshStone, "Fresh stone-1 reloaded");
    assert.strictEqual(freshStone.position.x, 6.8, "stone-1 reset to pristine spawn X=6.8");
    assert.strictEqual(freshStone.position.y, 4.4, "stone-1 reset to pristine spawn Y=4.4");
    console.log(`✓ Fresh map reloaded: stone-1 at pristine spawn (${freshStone.position.x}, ${freshStone.position.y})`);

    // Verify new player gets P1 and Amber color
    const welcome3 = client3Msgs.find((m) => m.type === "room_welcome");
    assert(welcome3, "Expected room_welcome");
    assert.strictEqual(welcome3.playerNumber, 1, "First player to connect to reloaded map must be P1");
    assert.strictEqual(welcome3.color, "#f59e0b", "P1 must receive Amber color (#f59e0b)");
    console.log(`✓ Reconnecting player gets fresh P${welcome3.playerNumber} (${welcome3.color})`);

    ws3.close();
    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
    process.exit(0);
  } finally {
    roomManager.stop();
    server.close();
  }
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
