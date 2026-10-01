import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { PlayerManager } from "../src/engine/PlayerManager.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";

async function runTest() {
  console.log("=== TEST: Lock Aim Facing Direction and Synchronization ===");

  // 1. Setup Arena and Entities
  const arena = new Arena(20, 20);
  const p1 = new Character({ id: "p1", x: 5.0, y: 5.0, playerId: "keyboard", playerNumber: 1 });
  const heldRock = new GameObject({ id: "heldRock", x: 5.5, y: 5.0, mass: 1.0, colliderRadius: 0.35 });
  const targetCrate = new GameObject({ id: "targetCrate", x: 5.0, y: 2.0, mass: 2.0, colliderRadius: 0.5 }); // Due north (dy = -3.0, dx = 0) -> angle = -PI/2 (-1.5708)

  arena.entities.push(p1, heldRock, targetCrate);

  // Player picks up heldRock
  const pickedUp = p1.pickupModule?.pickup(p1, heldRock);
  if (!pickedUp || p1.heldObject !== heldRock) {
    throw new Error("Failed to pick up heldRock");
  }
  console.log("1. Held rock picked up successfully.");

  // Mock input state
  const mockInputManager = {
    actualMousePos: { x: 5.0, y: 2.0 }, // Aiming directly at targetCrate
    isMouseDown: false,
    isRightMouseDown: true, // Right Click / Lock held!
    movementVector: { x: 1.0, y: 0.0 }, // Player is actively walking East!
    isKeyboardActive: true,
    isKeyboardSuspended: false,
    isKeyboardSprintActive: false,
    isKeyboardJumpHeld: false,
    isGrabHeld: false,
    isKeyboardDropRequested: false,
    isKeyboardThrowRequested: false,
    gamepadSlots: new Map(),
  };

  const playerManager = new PlayerManager({ arena, inputManager: mockInputManager as any, character: p1 });
  playerManager.spawnKeyboardPlayer();

  // 2. Capture inputs with lock held
  const inputs = playerManager.capturePlayerInputs(false, [heldRock, targetCrate]);
  const pkt = inputs.get("keyboard");
  if (!pkt) throw new Error("Missing keyboard input packet");

  const expectedLockAngle = Math.atan2(targetCrate.position.y - p1.position.y, targetCrate.position.x - p1.position.x);
  console.log(`Expected Lock Angle toward targetCrate: ${expectedLockAngle.toFixed(4)} rad`);
  console.log(`P1 facingAngle in captured packet: ${pkt.facingAngle?.toFixed(4)} rad`);

  const angleDiff = Math.abs((pkt.facingAngle ?? 0) - expectedLockAngle);
  if (angleDiff > 0.01) {
    throw new Error(`Packet facingAngle does not match locked target! Got: ${pkt.facingAngle}, expected: ${expectedLockAngle}`);
  }
  console.log("2. Captured input packet correctly points at locked target.");

  // 3. Apply input packet on client simulation
  const dt = 1 / 60;
  playerManager.applyPlayerInputs(inputs, dt, [heldRock, targetCrate], false);

  console.log(`P1 facingAngle after applyPlayerInputs: ${p1.facingAngle.toFixed(4)} rad`);
  if (Math.abs(p1.facingAngle - expectedLockAngle) > 0.01) {
    throw new Error(`P1 facingAngle failed to face locked target! Got: ${p1.facingAngle}, expected: ${expectedLockAngle}`);
  }

  // Verify held rock is held in front towards the locked target (North, so heldRock.position.y < p1.position.y)
  if (heldRock.position.y >= p1.position.y) {
    throw new Error(`Held rock is not positioned in front towards the locked target! p1.y: ${p1.position.y}, rock.y: ${heldRock.position.y}`);
  }
  console.log("3. Client P1 and held object are facing the locked target while walking East.");

  // 4. Test on Authoritative ServerGameSimulation
  const serverSim = new ServerGameSimulation(20, 20);
  serverSim.initializeFromWorld(arena, [p1], [heldRock, targetCrate]);
  const sP1 = serverSim.characters.get("keyboard");
  if (!sP1) throw new Error("Server P1 character not found");

  const sHeldRock = serverSim.objects.find(o => o.id === "heldRock");
  if (!sHeldRock) throw new Error("Server heldRock not found");
  sP1.pickupModule?.pickup(sP1, sHeldRock);

  serverSim.jitterBuffer.push(pkt);
  serverSim.step(dt);

  console.log(`Server P1 facingAngle: ${sP1.facingAngle.toFixed(4)} rad`);
  if (Math.abs(sP1.facingAngle - expectedLockAngle) > 0.01) {
    throw new Error(`Server P1 facingAngle failed to sync locked target! Got: ${sP1.facingAngle}, expected: ${expectedLockAngle}`);
  }
  console.log("4. Server P1 synchronized facingAngle toward locked target.");

  // 5. Test movement persistence: P1 continues moving East for 10 frames while locked
  for (let i = 0; i < 10; i++) {
    // Mouse stays in place or moves slightly
    mockInputManager.actualMousePos = { x: 5.1, y: 2.2 };
    const stepInputs = playerManager.capturePlayerInputs(false, [heldRock, targetCrate]);
    playerManager.applyPlayerInputs(stepInputs, dt, [heldRock, targetCrate], false);

    const curExpected = Math.atan2(targetCrate.position.y - p1.position.y, targetCrate.position.x - p1.position.x);
    if (Math.abs(p1.facingAngle - curExpected) > 0.01) {
      throw new Error(`Frame ${i}: P1 lost lock orientation while walking! Got: ${p1.facingAngle}, expected: ${curExpected}`);
    }
  }
  console.log("5. P1 maintained facing angle toward locked target over 10 ticks of continuous movement.");

  // 6. Test lock release: when Right Click is released, player reorients to movement
  mockInputManager.isRightMouseDown = false;
  mockInputManager.movementVector = { x: 0.0, y: 1.0 }; // Walking South
  const releaseInputs = playerManager.capturePlayerInputs(false, [heldRock, targetCrate]);
  playerManager.applyPlayerInputs(releaseInputs, dt, [heldRock, targetCrate], false);

  console.log(`P1 facingAngle after releasing lock: ${p1.facingAngle.toFixed(4)} rad`);
  if (p1.lockedTargetObject !== null) {
    throw new Error("lockedTargetObject was not cleared after releasing lock!");
  }
  console.log("6. Lock successfully cleared and normal facing restored.");

  console.log("=== ALL LOCK AIM FACING AND SYNC TESTS PASSED! ===");
}

runTest().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
