import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { GhostEntityState } from "../src/network/RelayClient.js";

function runTest() {
  console.log("=== Testing Remote Throw Instant Hand-Off & Authority Isolation ===");

  const arena = new Arena();
  const serverSim = new ServerGameSimulation(arena);

  // Client A (Thrower)
  const charA = new Character({ id: "client_A", name: "Player A", position: { x: 5, y: 10, z: 0 }, color: "#f59e0b" });
  charA.playerId = "client_A";

  // Client B (Observer)
  const charB = new Character({ id: "client_B", name: "Player B", position: { x: 12, y: 10, z: 0 }, color: "#06b6d4" });
  charB.playerId = "client_B";

  const rock = new GameObject({ id: "rock-1", name: "Rock", position: { x: 5, y: 10, z: 0 }, mass: 1.0, colliderRadius: 0.35 });

  serverSim.characters.set("client_A", charA);
  serverSim.characters.set("client_B", charB);
  serverSim.objects = [rock];
  serverSim.arena.entities = [charA, charB, rock];

  // 1. Client A picks up rock on server
  serverSim.processReliableActions([{
    actionId: "act-pickup-1",
    type: "pickup",
    playerId: "client_A",
    targetObjectId: "rock-1",
    tick: 1,
    timestamp: performance.now(),
  }]);

  if (!charA.heldObject || !rock.isHeld || rock.heldBy !== charA) {
    throw new Error("Rock not held by charA on server");
  }
  console.log("✓ Rock held by Player A on server");

  // Setup Client B's local GameLoop
  const clientBRock = new GameObject({ id: "rock-1", name: "Rock", position: { x: 5, y: 10, z: 0 }, mass: 1.0, colliderRadius: 0.35 });
  const clientBRemoteA = new Character({ id: "client_A", name: "Player A", position: { x: 5, y: 10, z: 0 }, color: "#f59e0b" });
  clientBRemoteA.playerId = "client_A";
  const clientBHero = new Character({ id: "client_B", name: "Player B", position: { x: 12, y: 10, z: 0 }, color: "#06b6d4" });
  clientBHero.playerId = "keyboard";

  clientBRemoteA.heldObject = clientBRock;
  clientBRock.isHeld = true;
  clientBRock.heldBy = clientBRemoteA;

  const mockCanvas = {} as any;
  const mockRenderer = { getHoverScale: () => 1.0, showBufferTrail: false } as any;
  const mockInput = { isKeyboardActive: false, gamepadSlots: new Map() } as any;
  const mockDevPanel = { isEditMode: false, updateInspector: () => {} } as any;

  const gameLoopB = new GameLoop({
    canvas: mockCanvas,
    arena,
    character: clientBHero,
    objects: [clientBRock],
    renderer: mockRenderer,
    inputManager: mockInput,
    devPanel: mockDevPanel,
  });
  gameLoopB.playerManager.remotePlayers.set("client_A", clientBRemoteA);
  gameLoopB.enableAuthoritativeObjectSync = true;

  // 2. Client A throws rock toward (10, 10) on server
  serverSim.processReliableActions([{
    actionId: "act-throw-1",
    type: "throw",
    playerId: "client_A",
    targetObjectId: "rock-1",
    aimX: 10,
    aimY: 10,
    tick: 2,
    timestamp: performance.now(),
  }]);

  if (rock.isHeld || !rock.isInFlight) {
    throw new Error("Server throw did not launch rock into flight");
  }
  console.log(`✓ Server launched throw: vx=${rock.velocity.x.toFixed(2)}, vz=${rock.verticalVelocity.toFixed(2)}`);

  // Step server physics by 1 tick
  serverSim.step(1 / 60);

  // 3. Server generates snapshot and sends to Client B
  const snap = serverSim.getGhostSnapshot();

  // Client B receives snapshot: verify INSTANT HAND-OFF (zero hesitation!)
  gameLoopB.syncAuthoritativeObjects(snap.objects, "client_B", snap.seq);

  if (clientBRemoteA.heldObject !== null) {
    throw new Error("Client B still had heldObject attached to remote A!");
  }
  if (clientBRock.isHeld) {
    throw new Error("clientBRock.isHeld should be false after release hand-off");
  }
  if (Math.abs(clientBRock.velocity.x - rock.velocity.x) > 0.01) {
    throw new Error(`Client B did not instantly adopt launch velocity! Client=${clientBRock.velocity.x}, Server=${rock.velocity.x}`);
  }
  if (Math.abs(clientBRock.position.x - rock.position.x) > 0.01) {
    throw new Error(`Client B did not instantly adopt launch position! Client=${clientBRock.position.x}, Server=${rock.position.x}`);
  }
  console.log("✓ Client B instantly adopted server launch position & velocity (ZERO HESITATION)");

  // 4. Verify Server Authority Rule:
  // Simulate Client B sending a stale unheld object telemetry packet (e.g. from an old position x=5.0)
  const staleClientBPacket: GhostEntityState[] = [{
    id: "rock-1",
    name: "Rock",
    x: 5.0,
    y: 10,
    z: 0.45,
    vx: 0,
    vy: 0,
    vz: 0,
    isHeld: false,
    heldBy: null,
    radius: 0.35,
  }];

  const rockXBeforeStalePacket = rock.position.x;
  serverSim.syncObjectsFromPacket(staleClientBPacket, "client_B");

  if (Math.abs(rock.position.x - rockXBeforeStalePacket) > 0.0001) {
    throw new Error(`Server allowed non-holder Client B to yank rock backwards! Rock X changed to ${rock.position.x}`);
  }
  console.log("✓ Server correctly rejected unheld packet from Client B (NO TUG-OF-WAR / ZERO BACK-AND-FORTH JITTER)");

  // 5. Simulate 60 ticks of flight on server and Client B
  for (let t = 0; t < 60; t++) {
    serverSim.step(1 / 60);
    clientBRock.updatePosition(1 / 60, arena);

    const midSnap = serverSim.getGhostSnapshot();
    gameLoopB.syncAuthoritativeObjects(midSnap.objects, "client_B", midSnap.seq);
  }

  console.log(`✓ Settling: Server rock at x=${rock.position.x.toFixed(2)}, Client B rock at x=${clientBRock.position.x.toFixed(2)}`);
  if (Math.abs(rock.position.x - clientBRock.position.x) > 0.1) {
    throw new Error("Client B diverged from server resting position!");
  }
  if (rock.position.x < 8.5) {
    throw new Error("Rock failed to reach target contact point!");
  }
  console.log("✓ Rock settled cleanly at target contact point for all clients!");
  console.log("=== ALL REMOTE THROW HANDSHAKE TESTS PASSED ===");
}

runTest();
