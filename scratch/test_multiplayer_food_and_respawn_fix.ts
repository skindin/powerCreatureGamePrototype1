import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { ConsumableModule } from "../src/engine/ConsumableModule.js";
import { HealthModule } from "../src/character/HealthModule.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("=== Testing Multiplayer Food Deletion & Death Respawn Fixes ===");

// -------------------------------------------------------------
// Test 1: Food Consumption Deletion Pipeline in Multiplayer
// -------------------------------------------------------------
console.log("\n[Test 1] Verifying Food Consumption Deletion in Multiplayer...");
{
  const sim = new ServerGameSimulation();

  const apple = new GameObject({
    id: "apple-spawner-1",
    name: "Apple",
    position: { x: 5, y: 5, z: 0 },
    consumableModule: new ConsumableModule({
      tag: "fruit",
      totalEnergyJoules: 500,
      remainingEnergyJoules: 500,
    }),
  });
  sim.objects.push(apple);
  sim.arena.entities = [...sim.allCharacters, ...sim.objects];

  const char = new Character({
    id: "client_1:keyboard",
    playerId: "client_1:keyboard",
    name: "Player 1",
    x: 5,
    y: 5,
  });
  (char as any).serverCharId = "client_1:keyboard";
  sim.characters.set("client_1:keyboard", char);

  // Player picks up apple
  apple.isHeld = true;
  apple.heldBy = char;
  char.heldObject = apple;

  // Simulate client eating food until finished:
  // Client notifies via consumedObjectIds in packet
  sim.triggerObjectDeletion(apple.id);

  // Verify apple was removed from server objects and arena
  assert(!sim.objects.some((o) => o.id === "apple-spawner-1"), "Apple must be removed from sim.objects");
  assert(!sim.arena.entities.some((e: any) => e.id === "apple-spawner-1"), "Apple must be removed from sim.arena.entities");
  assert(char.heldObject === null, "Character hands must be cleared");

  // Verify deletion event was generated for all clients
  const activeDeletions = sim.getActiveObjectDeletionEvents();
  assert(activeDeletions.length === 1, "Must have 1 active object deletion event");
  assert(activeDeletions[0].objectId === "apple-spawner-1", "Deletion event must target apple-spawner-1");

  // Verify safeguard: If a packet arrives indicating character is no longer holding a depleted object,
  // the server triggers deletion rather than dropping it
  const apple2 = new GameObject({
    id: "apple-depleted-2",
    name: "Depleted Apple",
    position: { x: 5, y: 5, z: 0 },
    consumableModule: new ConsumableModule({
      tag: "fruit",
      totalEnergyJoules: 500,
      remainingEnergyJoules: 0.01,
    }),
  });
  sim.objects.push(apple2);
  apple2.isHeld = true;
  apple2.heldBy = char;
  char.heldObject = apple2;

  // Client sends packet where isHolding is false
  sim.syncCharacterFromPacket({
    id: "client_1:keyboard",
    x: 5,
    y: 5,
    z: 0,
    vx: 0,
    vy: 0,
    isHolding: false,
    heldObjectId: null,
  });

  assert(!sim.objects.some((o) => o.id === "apple-depleted-2"), "Depleted apple must be deleted, NOT dropped on ground!");
  console.log("  ✓ Food deletion pipeline and server safeguard verified 100%!");
}

// -------------------------------------------------------------
// Test 2: Server-Authoritative Death & Respawn Lock (No Oscillation)
// -------------------------------------------------------------
console.log("\n[Test 2] Verifying Server-Authoritative Death Respawn Lock...");
{
  const sim = new ServerGameSimulation();
  const serverCharId = "client_1:keyboard";

  const char = new Character({
    id: serverCharId,
    playerId: serverCharId,
    name: "Player 1",
    x: 3.5,
    y: 7.0,
  });
  (char as any).serverCharId = serverCharId;
  sim.characters.set(serverCharId, char);

  // Setup death respawn hook
  char.healthModule!.onDeathRespawn = (entity, respawnPos) => {
    const charId = (entity as Character).playerId || (entity as any).serverCharId || entity.id;
    const eventId = `death-${charId}-${sim.currentTick}`;
    sim.pendingDeathRespawnEvents.set(eventId, {
      event: {
        eventId,
        targetEntityId: charId,
        tick: sim.currentTick,
        respawnX: respawnPos.x,
        respawnY: respawnPos.y,
        respawnZ: respawnPos.z,
        maxHp: 100,
      },
      createdTick: sim.currentTick,
      acks: new Set<string>(),
    });
  };

  // Character dies at (3.5, 7.0)
  const explicitRespawn = { x: 17.0, y: 3.5, z: 0 };
  char.healthModule!.dieAndRespawn(char, undefined, explicitRespawn);

  assert(char.position.x === 17.0 && char.position.y === 3.5, "Server character must immediately be at respawn coordinates");

  const deathEvents = sim.getActiveDeathRespawnEvents();
  assert(deathEvents.length === 1, "Must generate 1 death respawn event");
  const dEv = deathEvents[0];
  assert(dEv.targetEntityId === serverCharId, `targetEntityId must be ${serverCharId}, got ${dEv.targetEntityId}`);
  assert(dEv.respawnX === 17.0 && dEv.respawnY === 3.5, "Event must contain exact respawn coordinates");

  // Step 1: Unacknowledged client packet sending OLD death position (3.5, 7.0)
  sim.syncCharacterFromPacket({
    id: serverCharId,
    x: 3.5,
    y: 7.0,
    z: 0,
    vx: 1.0,
    vy: 1.0,
  });

  // Verify server REJECTED the packet and kept player at (17.0, 3.5)
  assert(char.position.x === 17.0 && char.position.y === 3.5, "Server MUST REJECT unacknowledged packet and stay at respawn pos!");
  console.log("  ✓ Unacknowledged client position packet was rejected cleanly!");

  // Step 2: Client packet with ACK, but still sending STALE old coordinates (3.5, 7.0)
  // (e.g. packet generated right before or concurrently with death event arrival)
  sim.acknowledgeDeathRespawnEvents(serverCharId, [dEv.eventId]);

  sim.syncCharacterFromPacket({
    id: serverCharId,
    x: 3.5,
    y: 7.0,
    z: 0,
    vx: 0.5,
    vy: 0.5,
  });

  // Verify server REJECTED the stale coordinates and preserved respawn position (17.0, 3.5)
  assert(char.position.x === 17.0 && char.position.y === 3.5, "Server MUST REJECT stale packet coordinates (> 1.2 units) even with ACK!");
  console.log("  ✓ Stale pre-respawn packet rejected even after ACK!");

  // Step 3: Client snapped to respawn position sends valid aligned coordinates (17.0, 3.5)
  sim.syncCharacterFromPacket({
    id: serverCharId,
    x: 17.0,
    y: 3.5,
    z: 0,
    vx: 0,
    vy: 0,
  });

  assert(char.position.x === 17.0 && char.position.y === 3.5, "Server accepts aligned packet");

  // Step 4: After alignment, normal voluntary movements (e.g. 17.1, 3.5) are accepted
  sim.syncCharacterFromPacket({
    id: serverCharId,
    x: 17.1,
    y: 3.5,
    z: 0,
    vx: 0.5,
    vy: 0,
  });

  assert(char.position.x === 17.1, "Voluntary movement accepted after respawn alignment");
  console.log("  ✓ Post-respawn voluntary movement accepted seamlessly without oscillation!");
}

console.log("\n=== ALL MULTIPLAYER FOOD & RESPAWN FIX TESTS PASSED 100%! ===");
