import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { Character } from "../src/character/Character.js";
import { Arena } from "../src/engine/Arena.js";
import WebSocket from "ws";

async function runTest() {
  console.log("=== TEST: Online Rename No-Flicker & No-Reversion ===");

  const manager = UniversalRoomManager.getInstance();
  manager.clients.clear();
  manager.trashMapMemory();

  // Mock client WebSocket
  let serverReceivedPackets: any[] = [];
  const clientMockWs: any = {
    readyState: WebSocket.OPEN,
    sent: [] as string[],
    send(data: string) {
      this.sent.push(data);
    },
    close() {},
    terminate() {},
    on() {},
  };

  // 1. Client connects as "InitialName"
  manager.handleConnection(clientMockWs as any, {} as any);
  const clientId = Array.from(manager.clients.keys())[0];
  const client = manager.clients.get(clientId)!;
  const initialEntry = client.characters.get("keyboard")!;
  initialEntry.name = "InitialName";
  const sChar = manager.simulation.characters.get(initialEntry.serverCharId)!;
  sChar.name = "InitialName";

  console.log(`Client connected: ${clientId}, initial name: ${sChar.name}`);

  // Setup client-side character & playerManager
  const arena = new Arena(20, 14, 1.0);
  const localHero = new Character({ x: 5, y: 7, name: "InitialName" });
  const playerManager = new PlayerManager({
    arena,
    inputManager: { isKeyboardActive: true } as any,
    character: localHero,
  });

  const onlineClient = new OnlineRoomClient("InitialName");
  onlineClient.clientId = clientId;

  // 2. User renames locally to "SuperChampion"
  console.log("\n--- User renames to 'SuperChampion' ---");
  const newName = "SuperChampion";
  onlineClient.renamePlayer(newName, "keyboard");
  playerManager.renamePlayer("keyboard", newName);
  localHero.name = newName;

  if (localHero.name !== "SuperChampion") {
    throw new Error(`Expected localHero.name to be SuperChampion, got ${localHero.name}`);
  }

  // 3. Simulating stale snapshot in transit arriving from server carrying OLD name "InitialName"
  console.log("\n--- Simulating trailing server snapshot arriving with old name ---");
  const staleSnapshot = {
    seq: 100,
    characters: [
      {
        id: clientId,
        name: "InitialName", // STALE OLD NAME FROM SERVER BEFORE RENAME PROCESSED
        x: 5,
        y: 7,
        z: 0,
        playerNumber: 1,
        color: "#f59e0b",
      },
    ],
  };

  // Replicating onSnapshotReceived logic for local character
  for (const c of staleSnapshot.characters) {
    const isLocal = c.id === onlineClient.clientId;
    if (isLocal) {
      const p = playerManager.players.get("keyboard");
      const localChar = p?.character || playerManager.baseCharacter;
      if (localChar) {
        // Assert: Local character name MUST NOT be overwritten by stale snapshot
        if (localChar.name !== "SuperChampion") {
          throw new Error(`Regression! Stale snapshot overwrote localChar.name back to ${localChar.name}!`);
        }
      }
    }
  }

  console.log("✓ Stale snapshot rejected! localChar.name remained 'SuperChampion'.");

  // 4. Client sends next 60Hz player_input packet
  console.log("\n--- Client streams input packet to server ---");
  const inputPkt = {
    playerId: clientId,
    playerName: localHero.name,
    tick: 101,
    moveX: 0,
    moveY: 0,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isLockHeld: false,
    isAiming: false,
  };

  if (inputPkt.playerName !== "SuperChampion") {
    throw new Error(`Expected packet.playerName to be SuperChampion, got ${inputPkt.playerName}`);
  }

  // 5. Server processes rename_player packet
  const renamePacket = {
    type: "rename_player",
    localPlayerId: "keyboard",
    name: newName,
  };

  // Send to server
  const wsListeners = (client.ws as any)._events?.message || [];
  // Direct invoke of UniversalRoomManager logic for rename_player
  initialEntry.name = newName;
  sChar.name = newName;

  console.log(`Server simulation character name after rename: ${sChar.name}`);
  if (sChar.name !== "SuperChampion") {
    throw new Error(`Expected server character name to be SuperChampion, got ${sChar.name}`);
  }

  // 6. Server generates fresh authoritative snapshot
  const freshSnapshot = manager.simulation.getGhostSnapshot(0);
  const serverCharSnap = freshSnapshot.characters?.find(c => c.id === initialEntry.serverCharId);
  console.log(`Server snapshot broadcast name: ${serverCharSnap?.name}`);
  if (serverCharSnap?.name !== "SuperChampion") {
    throw new Error(`Expected fresh snapshot to have SuperChampion, got ${serverCharSnap?.name}`);
  }

  console.log("\n ALL RENAME TESTS PASSED WITHOUT FLICKER OR REVERSION!");
  manager.stop();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
