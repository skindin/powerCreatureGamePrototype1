import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { WebSocket } from "ws";
import http from "node:http";
import assert from "node:assert";

async function runTest() {
  console.log("=== Testing Multi-Character Naming Isolation & Phantom Character Elimination ===");

  const server = http.createServer();
  const roomManager = UniversalRoomManager.getInstance();
  UniversalRoomManager.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (server.address() as any).port;
  console.log(`✓ Attached test UniversalRoomManager on port ${port}`);

  try {
    // ---------------------------------------------------------------------------------
    // TEST 1: Connecting with only a Gamepad does NOT leave an extra phantom character!
    // ---------------------------------------------------------------------------------
    console.log("\n--- TEST 1: Device Connecting With Gamepad Only (No Keyboard Phantom) ---");
    const ws1 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const c1Msgs: any[] = [];
    ws1.on("message", (raw) => c1Msgs.push(JSON.parse(raw.toString())));
    await new Promise<void>((r) => ws1.on("open", r));

    // Client sends join_room specifying ONLY gamepad-0 as active local player
    ws1.send(JSON.stringify({
      type: "join_room",
      localPlayers: [{ localPlayerId: "gamepad-0" }],
    }));

    await new Promise((r) => setTimeout(r, 60));
    const joined1 = c1Msgs.find((m) => m.type === "room_joined");
    assert(joined1, "Expected room_joined");

    // Verify server has EXACTLY 1 character registered for this client (no phantom keyboard!)
    assert.strictEqual(
      roomManager.simulation.characters.size,
      1,
      `Server simulation must contain exactly 1 character, found: ${roomManager.simulation.characters.size}`
    );
    const activeChar1 = Array.from(roomManager.simulation.characters.values())[0];
    assert.strictEqual(activeChar1.playerNumber, 1, "First player must have playerNumber 1");
    assert.strictEqual(activeChar1.name, "Player 1", "Default name must be Player 1");
    console.log(`✓ Gamepad-only client has exactly 1 character: P${activeChar1.playerNumber} ("${activeChar1.name}") with zero phantom characters.`);

    // ---------------------------------------------------------------------------------
    // TEST 2: Device 1 adds Keyboard with custom name "Dragon"
    // ---------------------------------------------------------------------------------
    console.log("\n--- TEST 2: Custom Name Isolation (No Name Leaking to Other Characters) ---");
    ws1.send(JSON.stringify({
      type: "add_player",
      localPlayerId: "keyboard",
      name: "Dragon",
    }));

    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(roomManager.simulation.characters.size, 2, "Server must have exactly 2 characters for Device 1");

    const charDragon = roomManager.simulation.characters.get(joined1.clientId);
    assert(charDragon, "Keyboard character must exist on server");
    assert.strictEqual(charDragon.name, "Dragon", "Keyboard character must be named Dragon");
    assert.strictEqual(activeChar1.name, "Player 1", "Gamepad character must remain Player 1 (must NOT inherit Dragon!)");
    console.log(`✓ Device 1 characters: P${activeChar1.playerNumber} ("${activeChar1.name}") and P${charDragon.playerNumber} ("${charDragon.name}")`);

    // ---------------------------------------------------------------------------------
    // TEST 3: Device 2 connects with 2 players (Keyboard and Controller)
    // ---------------------------------------------------------------------------------
    console.log("\n--- TEST 3: Device 2 Connects (Sequential Numbering P3, P4 — No Duplicate Player 2) ---");
    const ws2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const c2Msgs: any[] = [];
    ws2.on("message", (raw) => c2Msgs.push(JSON.parse(raw.toString())));
    await new Promise<void>((r) => ws2.on("open", r));

    // Device 2 joins with 2 uncustomized players (passing default/empty names)
    ws2.send(JSON.stringify({
      type: "join_room",
      localPlayers: [
        { localPlayerId: "keyboard", name: "Player 1" }, // Client 2's local template name
        { localPlayerId: "gamepad-0", name: "Player 2" }, // Client 2's local template name
      ],
    }));

    await new Promise((r) => setTimeout(r, 60));
    const joined2 = c2Msgs.find((m) => m.type === "room_joined");
    assert(joined2, "Device 2 expected room_joined");

    // Total characters across both devices must be EXACTLY 4
    assert.strictEqual(
      roomManager.simulation.characters.size,
      4,
      `Server simulation must contain exactly 4 characters, found: ${roomManager.simulation.characters.size}`
    );

    const dev2Chars = Array.from(roomManager.simulation.characters.values()).filter(
      (c) => c.playerId.startsWith(joined2.clientId)
    );
    assert.strictEqual(dev2Chars.length, 2, "Device 2 must have exactly 2 characters on server");

    const pNumbers = dev2Chars.map((c) => c.playerNumber).sort();
    assert.deepStrictEqual(pNumbers, [3, 4], "Device 2 players must be allocated slots P3 and P4!");

    const pNames = dev2Chars.map((c) => c.name).sort();
    assert.deepStrictEqual(
      pNames,
      ["Player 3", "Player 4"],
      "Device 2 players must be authoritatively named 'Player 3' and 'Player 4' (NEVER duplicate 'Player 2')!"
    );
    console.log(`✓ Device 2 characters allocated authoritative slots and names: ${pNames.join(", ")}`);

    // ---------------------------------------------------------------------------------
    // TEST 4: Rogue packet with unknown playerId must NEVER spawn phantom characters
    // ---------------------------------------------------------------------------------
    console.log("\n--- TEST 4: Rogue Packet With Unknown ID Rejection (No Ghost Spawning) ---");
    ws1.send(JSON.stringify({
      type: "player_input",
      localPlayerId: "unknown-ghost-controller",
      packet: {
        playerId: "ghost_unknown_id",
        tick: 1,
        moveX: 1,
        moveY: 0,
      },
      character: {
        id: "ghost_unknown_id",
        x: 10,
        y: 7,
        z: 0,
        vx: 0,
        vy: 0,
        radius: 0.44,
      },
    }));

    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(
      roomManager.simulation.characters.size,
      4,
      `Server simulation must STILL have exactly 4 characters (rogue packet must NOT spawn ghosts!)`
    );
    console.log("✓ Rogue packet correctly rejected without spawning phantom characters!");

    // ---------------------------------------------------------------------------------
    // TEST 5: Snapshot broadcast verification
    // ---------------------------------------------------------------------------------
    console.log("\n--- TEST 5: Snapshot Broadcast Verification ---");
    await new Promise((r) => setTimeout(r, 100));
    const snapshotMsg = c2Msgs.filter((m) => m.type === "pc_server_snapshot").pop();
    assert(snapshotMsg, "Expected pc_server_snapshot packet");
    assert(Array.isArray(snapshotMsg.snapshot?.characters), "Snapshot must contain characters array");
    const snapChars = snapshotMsg.snapshot.characters;
    assert.strictEqual(snapChars.length, 4, `Snapshot must contain exactly 4 characters, got ${snapChars.length}`);

    const snapNames = snapChars.map((c: any) => c.name);
    console.log(`✓ Broadcasted snapshot names: ${snapNames.join(", ")}`);
    assert(snapNames.includes("Dragon"), "Snapshot must include custom name 'Dragon'");
    assert(snapNames.includes("Player 1"), "Snapshot must include 'Player 1'");
    assert(snapNames.includes("Player 3"), "Snapshot must include 'Player 3'");
    assert(snapNames.includes("Player 4"), "Snapshot must include 'Player 4'");

    // Close connections
    ws1.close();
    ws2.close();
    await new Promise((r) => setTimeout(r, 50));

    console.log("\n✅ ALL MULTI-CHARACTER NAMING AND PHANTOM ELIMINATION TESTS PASSED!");
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
