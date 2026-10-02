import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import http from "http";

async function run() {
  console.log("=== Reproducing Online Push & Throw Behavior ===");

  const server = http.createServer();
  const roomManager = UniversalRoomManager.getInstance();
  UniversalRoomManager.attach(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  console.log(`Server listening on port ${port}`);

  // Create Client 1 (Player 1)
  const client1 = new OnlineRoomClient("Player 1");
  // Create Client 2 (Player 2)
  const client2 = new OnlineRoomClient("Player 2");

  await client1.connect(`ws://localhost:${port}/ws`);
  await client2.connect(`ws://localhost:${port}/ws`);

  console.log("Both clients connected.");

  // Wait 100ms for registrations
  await new Promise((r) => setTimeout(r, 100));

  const id1 = client1.clientId!;
  const id2 = client2.clientId!;
  console.log("Client 1 ID:", id1);
  console.log("Client 2 ID:", id2);

  const sim = roomManager.simulation;
  const sChar1 = sim.characters.get(id1)!;
  const sChar2 = sim.characters.get(id2)!;

  sChar1.position.x = 5.0;
  sChar1.position.y = 7.0;
  sChar1.velocity.x = 0;
  sChar1.velocity.y = 0;

  sChar2.position.x = 6.0;
  sChar2.position.y = 7.0;
  sChar2.velocity.x = 0;
  sChar2.velocity.y = 0;

  console.log(`Initial: P1 at (${sChar1.position.x}, ${sChar1.position.y}), P2 at (${sChar2.position.x}, ${sChar2.position.y})`);

  // Now simulate 30 ticks where Client 1 is moving RIGHT towards Player 2 (moveX: 1)
  // while Client 2 is IDLE (moveX: 0)
  for (let tick = 1; tick <= 30; tick++) {
    const curTick = sim.currentTick;
    // Client 1 sends input with moveX: 1
    client1.sendPlayerInput("keyboard", {
      tick: curTick,
      moveX: 1.0,
      moveY: 0,
      isSprinting: false,
      isAiming: false,
      isJumpHeld: false,
      isGrabHeld: false,
      isDrop: false,
      isThrow: false,
    }, sChar1 as any, []);

    // Client 2 sends input with moveX: 0 (standing still)
    client2.sendPlayerInput("keyboard", {
      tick: curTick,
      moveX: 0,
      moveY: 0,
      isSprinting: false,
      isAiming: false,
      isJumpHeld: false,
      isGrabHeld: false,
      isDrop: false,
      isThrow: false,
    }, sChar2 as any, []);

    // Wait a tiny bit for WS delivery
    await new Promise((r) => setTimeout(r, 16));

    console.log(`Tick ${tick}: P1 (${sChar1.position.x.toFixed(3)}, ${sChar1.velocity.x.toFixed(3)}) | P2 (${sChar2.position.x.toFixed(3)}, ${sChar2.velocity.x.toFixed(3)})`);
  }

  console.log("\n--- TEST: Player 1 Throws Rock at Player 2 ---");

  // Spawn a rock right in front of Player 1, moving towards Player 2
  const rock = sim.objects.find((o) => o.id === "stone-1");
  if (rock) {
    rock.position.x = 5.2;
    rock.position.y = 7.0;
    rock.position.z = 0.2;
    rock.velocity.x = 15.0; // High speed throw towards P2
    rock.velocity.y = 0;
    rock.isInFlight = true;
    rock.wakeUp();

    console.log(`Launched rock from (${rock.position.x}, ${rock.position.y}) with vx=${rock.velocity.x}`);

    // Client 2's local character (standing idle on Client 2's machine at 6.0, 7.0)
    const localChar2 = {
      position: { x: 6.0, y: 7.0, z: 0 },
      velocity: { x: 0, y: 0 },
      hasVerticalVelocity: false,
      colliderRadius: 0.44,
      isClimbing: false,
      isAboveWalls: false,
      facingAngle: 0,
      heldObject: null,
    };

    for (let tick = 1; tick <= 20; tick++) {
      client2.sendPlayerInput("keyboard", {
        tick,
        moveX: 0,
        moveY: 0,
        isSprinting: false,
        isAiming: false,
        isJumpHeld: false,
        isGrabHeld: false,
        isDrop: false,
        isThrow: false,
      }, localChar2 as any, []);

      await new Promise((r) => setTimeout(r, 16));

      console.log(`Throw Tick ${tick}: Rock (${rock.position.x.toFixed(3)}, vx=${rock.velocity.x.toFixed(3)}) | P2 (${sChar2.position.x.toFixed(3)}, vx=${sChar2.velocity.x.toFixed(3)})`);
    }
  }

  client1.disconnect();
  client2.disconnect();
  roomManager.stop();
  server.close();
}

run().catch(console.error);
