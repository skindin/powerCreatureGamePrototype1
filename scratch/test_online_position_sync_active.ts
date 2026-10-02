import http from "http";
import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineRoomClient } from "../src/network/OnlineRoomClient.js";

async function run() {
  console.log("=== Testing Online Position Synchronization ===");
  const server = http.createServer();
  const roomManager = UniversalRoomManager.getInstance();
  UniversalRoomManager.attach(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  const client1 = new OnlineRoomClient("Alice");
  const client2 = new OnlineRoomClient("Bob");

  let c2SawC1At: { x: number; y: number } | null = null;
  client2.onSnapshotReceived = (snap) => {
    const chars = snap.characters || (snap.character ? [snap.character] : []);
    const c1 = chars.find((c: any) => c.id === client1.clientId);
    if (c1) {
      c2SawC1At = { x: c1.x, y: c1.y };
    }
  };

  await client1.connect(`ws://localhost:${port}/ws`);
  await client2.connect(`ws://localhost:${port}/ws`);

  await new Promise((r) => setTimeout(r, 100));

  const c1Char = {
    position: { x: 14.5, y: 8.2, z: 0 },
    velocity: { x: 3.5, y: 0 },
    hasVerticalVelocity: false,
    colliderRadius: 0.44,
    isClimbing: false,
    isAboveWalls: false,
    facingAngle: 0,
    heldObject: null,
  };

  // Alice sends her current position (14.5, 8.2)
  client1.sendPlayerInput("keyboard", {
    tick: 1,
    moveX: 1.0,
    moveY: 0,
    isSprinting: false,
    isAiming: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isDrop: false,
    isThrow: false,
  }, c1Char as any, []);

  // Wait 50ms for server tick & broadcast
  await new Promise((r) => setTimeout(r, 50));

  console.log("Alice local pos:", c1Char.position);
  console.log("Bob received Alice pos:", c2SawC1At);

  if (!c2SawC1At) {
    throw new Error("Bob never received Alice's position!");
  }

  const dx = Math.abs(c2SawC1At.x - c1Char.position.x);
  const dy = Math.abs(c2SawC1At.y - c1Char.position.y);
  console.log(`Discrepancy: dx=${dx.toFixed(4)}, dy=${dy.toFixed(4)}`);

  if (dx > 0.1 || dy > 0.1) {
    throw new Error(`Position mismatch too large! Expected close to (14.5, 8.2), got (${c2SawC1At.x}, ${c2SawC1At.y})`);
  }

  console.log("✅ SUCCESS: Positions are actively and accurately synchronized!");

  client1.disconnect();
  client2.disconnect();
  roomManager.stop();
  server.close();
}

run().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
