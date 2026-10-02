import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { WebSocket } from "ws";
import http from "node:http";
import assert from "node:assert";

async function runTest() {
  console.log("=== Testing Phone / Controller Connection (No Phantom Character) ===");

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
    // SCENARIO 1: Phone connects before controller is ready (empty/default join),
    // then adds Gamepad 0 claiming the primary avatar.
    // ---------------------------------------------------------------------------------
    console.log("\n--- SCENARIO 1: Phone Connects Initially, Then Controller Joins (Zero Phantom Characters) ---");
    const wsPhone = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const phoneMsgs: any[] = [];
    wsPhone.on("message", (raw) => phoneMsgs.push(JSON.parse(raw.toString())));
    await new Promise<void>((r) => wsPhone.on("open", r));

    // Phone sends join_room with default/empty (or fallback keyboard)
    wsPhone.send(JSON.stringify({
      type: "join_room",
      name: "TealBeast",
      localPlayers: [{ localPlayerId: "keyboard", name: "TealBeast" }],
    }));

    await new Promise((r) => setTimeout(r, 60));
    const phoneJoined = phoneMsgs.find((m) => m.type === "room_joined");
    assert(phoneJoined, "Expected room_joined for phone");
    const phoneClientId = phoneJoined.clientId;

    // At this moment, server has 1 default character
    assert.strictEqual(roomManager.simulation.characters.size, 1);

    // Now phone detects mobile gamepad and sends add_player for gamepad-0
    wsPhone.send(JSON.stringify({
      type: "add_player",
      localPlayerId: "gamepad-0",
      name: "TealBeast",
    }));

    await new Promise((r) => setTimeout(r, 60));
    const phoneAdded = phoneMsgs.find((m) => m.type === "player_added");
    assert(phoneAdded, "Expected player_added for gamepad-0");
    assert.strictEqual(phoneAdded.localPlayerId, "gamepad-0");
    assert.strictEqual(phoneAdded.serverCharId, `${phoneClientId}:gamepad-0`);
    assert.strictEqual(phoneAdded.playerNumber, 1, "Should cleanly take Player 1 slot");
    assert.strictEqual(phoneAdded.name, "TealBeast");

    // CRUCIAL: Server must have EXACTLY 1 character (the placeholder keyboard MUST be unregistered!)
    assert.strictEqual(
      roomManager.simulation.characters.size,
      1,
      `Server must contain EXACTLY 1 character for phone, found: ${roomManager.simulation.characters.size}`
    );
    assert(
      !roomManager.simulation.characters.has(phoneClientId),
      "Server must NOT contain the unsteered keyboard placeholder character"
    );
    assert(
      roomManager.simulation.characters.has(`${phoneClientId}:gamepad-0`),
      "Server must contain the active gamepad character"
    );

    const activePhoneChar = roomManager.simulation.characters.get(`${phoneClientId}:gamepad-0`)!;
    assert.strictEqual(activePhoneChar.name, "TealBeast");
    console.log(`✓ Phone placeholder keyboard cleanly replaced by gamepad-0: P${activePhoneChar.playerNumber} ("${activePhoneChar.name}")`);

    // Verify remote client (PC) connecting sees EXACTLY 1 character for the phone
    const wsPC = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const pcMsgs: any[] = [];
    wsPC.on("message", (raw) => pcMsgs.push(JSON.parse(raw.toString())));
    await new Promise<void>((r) => wsPC.on("open", r));

    wsPC.send(JSON.stringify({
      type: "join_room",
      name: "PC_Player",
      localPlayers: [{ localPlayerId: "keyboard", name: "PC_Player" }],
    }));

    await new Promise((r) => setTimeout(r, 80));

    // Check snapshots received by PC
    const snapshotsForPC = pcMsgs.filter((m) => m.type === "pc_server_snapshot" && m.snapshot);
    assert(snapshotsForPC.length > 0, "PC must receive snapshots");
    const latestSnapshot = snapshotsForPC[snapshotsForPC.length - 1].snapshot;

    const phoneCharsInSnapshot = latestSnapshot.characters.filter((c: any) =>
      c.id === phoneClientId || c.id.startsWith(`${phoneClientId}:`)
    );
    assert.strictEqual(
      phoneCharsInSnapshot.length,
      1,
      `PC must see EXACTLY 1 character belonging to the phone, but found ${phoneCharsInSnapshot.length}`
    );
    assert.strictEqual(phoneCharsInSnapshot[0].id, `${phoneClientId}:gamepad-0`);
    assert.strictEqual(phoneCharsInSnapshot[0].name, "TealBeast");
    console.log(`✓ Remote PC observes EXACTLY 1 character for the phone ("${phoneCharsInSnapshot[0].name}"). ZERO phantoms!`);

    // Clean up scenario 1
    wsPhone.close();
    wsPC.close();
    await new Promise((r) => setTimeout(r, 60));

    // ---------------------------------------------------------------------------------
    // SCENARIO 2: Phone connects with Gamepad 0 ALREADY active locally
    // ---------------------------------------------------------------------------------
    console.log("\n--- SCENARIO 2: Phone Connects With Gamepad 0 Already Active Locally ---");
    const wsPhone2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const phone2Msgs: any[] = [];
    wsPhone2.on("message", (raw) => phone2Msgs.push(JSON.parse(raw.toString())));
    await new Promise<void>((r) => wsPhone2.on("open", r));

    wsPhone2.send(JSON.stringify({
      type: "join_room",
      name: "TealBeast",
      localPlayers: [{ localPlayerId: "gamepad-0", name: "TealBeast" }],
    }));

    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(
      roomManager.simulation.characters.size,
      1,
      `Server must contain EXACTLY 1 character, found: ${roomManager.simulation.characters.size}`
    );
    const p2Char = Array.from(roomManager.simulation.characters.values())[0];
    assert.strictEqual(p2Char.name, "TealBeast");
    console.log(`✓ Direct gamepad join registered single character: P${p2Char.playerNumber} ("${p2Char.name}")`);

    wsPhone2.close();
    await new Promise((r) => setTimeout(r, 60));

    // ---------------------------------------------------------------------------------
    // SCENARIO 3: PC with active keyboard movements, then plugs in controller as Player 2
    // ---------------------------------------------------------------------------------
    console.log("\n--- SCENARIO 3: PC With Actively Steered Keyboard Adds Gamepad 2 ---");
    const wsPC2 = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const pc2Msgs: any[] = [];
    wsPC2.on("message", (raw) => pc2Msgs.push(JSON.parse(raw.toString())));
    await new Promise<void>((r) => wsPC2.on("open", r));

    wsPC2.send(JSON.stringify({
      type: "join_room",
      name: "GamerOne",
      localPlayers: [{ localPlayerId: "keyboard", name: "GamerOne" }],
    }));
    await new Promise((r) => setTimeout(r, 60));

    // Send active movement input for keyboard
    wsPC2.send(JSON.stringify({
      type: "player_input",
      localPlayerId: "keyboard",
      packet: {
        playerId: "keyboard",
        tick: 1,
        moveX: 1.0,
        moveY: 0,
        isSprinting: false,
        isJumpHeld: false,
        isGrabHeld: false,
        isLockHeld: false,
        isAiming: false,
      },
    }));
    await new Promise((r) => setTimeout(r, 60));

    // Now add Gamepad 0 as secondary local player
    wsPC2.send(JSON.stringify({
      type: "add_player",
      localPlayerId: "gamepad-0",
      name: "ControllerBuddy",
    }));
    await new Promise((r) => setTimeout(r, 60));

    // Since keyboard was actively steered, BOTH characters must be preserved!
    assert.strictEqual(
      roomManager.simulation.characters.size,
      2,
      `Server must preserve both keyboard and gamepad when keyboard was active, found: ${roomManager.simulation.characters.size}`
    );
    console.log(`✓ Actively steered keyboard preserved alongside gamepad: 2 characters active on server.`);

    wsPC2.close();
    await new Promise((r) => setTimeout(r, 60));

    console.log("\n🎉 ALL PHANTOM CHARACTER ELIMINATION TESTS PASSED 100%!");
  } finally {
    roomManager.stop();
    server.close();
  }
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
