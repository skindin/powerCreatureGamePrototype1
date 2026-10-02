import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { RemoteEntityInterpolator } from "../src/engine/physics/RemoteEntityInterpolator.js";
import WebSocket from "ws";

async function runTest() {
  console.log("=== TEST: Immediate Character Removal on Connection Loss ===");

  // 1. Initialize UniversalRoomManager
  const manager = UniversalRoomManager.getInstance();
  manager.clients.clear();
  manager.trashMapMemory();

  console.log("Room initialized. Current characters in sim:", manager.simulation.characters.size);

  // 2. Mock two clients connecting to server
  const client1MockWs: any = {
    readyState: WebSocket.OPEN,
    sent: [] as string[],
    send(data: string) { this.sent.push(data); },
    close() {},
    terminate() { this.readyState = WebSocket.CLOSED; },
    on() {},
  };

  const client2MockWs: any = {
    readyState: WebSocket.OPEN,
    sent: [] as string[],
    send(data: string) { this.sent.push(data); },
    close() {},
    terminate() { this.readyState = WebSocket.CLOSED; },
    on() {},
  };

  // Connect client 1 with keyboard + controller
  manager.handleConnection(client1MockWs as any, {} as any);
  const client1Id = Array.from(manager.clients.keys())[0];
  const client1 = manager.clients.get(client1Id)!;
  manager.registerCharacter(client1, "gamepad-0", "Player 2 Controller");

  // Connect client 2
  manager.handleConnection(client2MockWs as any, {} as any);
  const client2Id = Array.from(manager.clients.keys()).find(id => id !== client1Id)!;
  const client2 = manager.clients.get(client2Id)!;

  console.log(`Connected Client 1 (${client1Id}): ${client1.characters.size} characters`);
  console.log(`Connected Client 2 (${client2Id}): ${client2.characters.size} characters`);
  console.log(`Total server simulation characters: ${manager.simulation.characters.size}`);

  if (manager.simulation.characters.size !== 3) {
    throw new Error(`Expected 3 characters on server, got ${manager.simulation.characters.size}`);
  }

  // Pick up an object with Client 1's controller character
  const c1CharId = client1.characters.get("gamepad-0")!.serverCharId;
  const c1Char = manager.simulation.characters.get(c1CharId)!;
  const testObj = manager.simulation.objects[0];
  testObj.isHeld = true;
  testObj.heldBy = c1Char;
  c1Char.heldObject = testObj;

  console.log(`Assigned held object ${testObj.id} to ${c1CharId}`);

  // 3. Client 2 sets up client-side PlayerManager & RemoteEntityInterpolator
  const arena = new Arena(20, 14, 1.0);
  const hero2 = new Character({ x: 5, y: 7 });
  const playerManager = new PlayerManager({
    arena,
    inputManager: { isKeyboardActive: false } as any,
    character: hero2,
  });
  const interpolator = new RemoteEntityInterpolator();

  // Client 2 receives snapshot with all 3 characters
  const char1Entry = client1.characters.get("keyboard")!;
  const char2Entry = client1.characters.get("gamepad-0")!;
  playerManager.syncRemoteCharacter({ id: char1Entry.serverCharId, x: 5, y: 7, z: 0, name: char1Entry.name });
  playerManager.syncRemoteCharacter({ id: char2Entry.serverCharId, x: 6, y: 7, z: 0, name: char2Entry.name });
  interpolator.pushSnapshot(1, [
    { id: char1Entry.serverCharId, x: 5, y: 7, z: 0, vx: 0, vy: 0, vz: 0, facingAngle: 0 },
    { id: char2Entry.serverCharId, x: 6, y: 7, z: 0, vx: 0, vy: 0, vz: 0, facingAngle: 0 },
  ], performance.now());

  console.log(`Client 2 remote players before disconnect: ${playerManager.remotePlayers.size}`);
  if (playerManager.remotePlayers.size !== 2) {
    throw new Error(`Expected 2 remote players on Client 2, got ${playerManager.remotePlayers.size}`);
  }

  // 4. Client 1 connection is abruptly lost!
  client2MockWs.sent = []; // Clear sent messages on client 2
  console.log("\n--- Simulating Client 1 connection loss ---");
  manager.handleDisconnection(client1Id);

  // Check 4.1: Server immediately removed Client 1's characters
  console.log(`Server characters after Client 1 disconnection: ${manager.simulation.characters.size}`);
  if (manager.simulation.characters.size !== 1) {
    throw new Error(`Expected exactly 1 character remaining on server, got ${manager.simulation.characters.size}`);
  }
  if (manager.simulation.characters.has(char1Entry.serverCharId) || manager.simulation.characters.has(char2Entry.serverCharId)) {
    throw new Error("Client 1 characters still present in server simulation!");
  }

  // Check 4.2: Held object was immediately dropped and woke up
  if (testObj.isHeld || testObj.heldBy !== null || testObj.isSleeping) {
    throw new Error(`Expected held object to be released and awake, got isHeld=${testObj.isHeld}, heldBy=${testObj.heldBy}, isSleeping=${testObj.isSleeping}`);
  }
  console.log("Held object dropped and woke up cleanly.");

  // Check 4.3: Server immediately broadcasted player_left and snapshot to Client 2
  const leftMsg = client2MockWs.sent.find((s: string) => s.includes('"type":"player_left"'));
  if (!leftMsg) {
    throw new Error("Expected server to send 'player_left' packet to Client 2 immediately!");
  }
  const parsedLeft = JSON.parse(leftMsg);
  console.log("Client 2 received player_left packet:", parsedLeft);
  if (!parsedLeft.removedCharIds.includes(char1Entry.serverCharId) || !parsedLeft.removedCharIds.includes(char2Entry.serverCharId)) {
    throw new Error(`Expected removedCharIds to include [${char1Entry.serverCharId}, ${char2Entry.serverCharId}], got ${JSON.stringify(parsedLeft.removedCharIds)}`);
  }

  const snapshotMsg = client2MockWs.sent.find((s: string) => s.includes('"type":"pc_server_snapshot"'));
  if (!snapshotMsg) {
    throw new Error("Expected server to broadcast immediate snapshot to Client 2!");
  }

  // Check 4.4: Client 2 processes player_left removal
  for (const removedId of parsedLeft.removedCharIds) {
    playerManager.removeRemoteCharacter(removedId);
    interpolator.clearEntity(removedId);
  }

  console.log(`Client 2 remote players after processing player_left: ${playerManager.remotePlayers.size}`);
  if (playerManager.remotePlayers.size !== 0) {
    throw new Error(`Expected 0 remote players on Client 2, got ${playerManager.remotePlayers.size}`);
  }
  const leftoverInterp = interpolator.getInterpolatedState(char1Entry.serverCharId, performance.now(), 0);
  if (leftoverInterp !== null) {
    throw new Error("Expected interpolator to return null for evicted character!");
  }
  console.log("Client 2 remote players and interpolator evicted immediately with zero residual ghost state.");

  // 5. Test Server Watchdog Liveness Timeout
  console.log("\n--- Testing Server Watchdog Liveness Timeout ---");
  const client2Instance = manager.clients.get(client2Id)!;
  // Artificially age client2's lastSeen timestamp by 4000ms
  client2Instance.lastSeen = Date.now() - 4000;
  // Trigger checkClientLiveness
  (manager as any).checkClientLiveness();

  console.log(`Server characters after watchdog timeout: ${manager.simulation.characters.size}`);
  console.log(`Connected clients after watchdog timeout: ${manager.clients.size}`);
  if (manager.clients.size !== 0 || manager.simulation.characters.size !== 0) {
    throw new Error("Expected watchdog to evict silent client and trash map on 0 clients!");
  }
  console.log("Watchdog successfully evicted silent connection and trashed map memory.");

  console.log("\n ALL TESTS PASSED SUCCESSFULLY!");
  manager.stop();
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
