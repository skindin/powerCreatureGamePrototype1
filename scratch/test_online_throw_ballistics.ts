import { Arena } from "../src/engine/Arena.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { GhostEntityState } from "../src/network/RelayClient.js";

function runTest() {
  console.log("=== Testing Online Throw Ballistics & In-Flight Protection ===");

  const arena = new Arena();
  const player = new Character({
    id: "hero",
    name: "Hero",
    position: { x: 5, y: 10, z: 0 },
    color: "#38bdf8",
  });
  player.playerId = "keyboard";

  const rock = new GameObject({
    id: "rock-1",
    name: "Rock",
    position: { x: 5, y: 10, z: 0 },
    mass: 1.0,
    colliderRadius: 0.35,
  });

  arena.entities = [player, rock];

  const mockCanvas = {} as any;
  const mockRenderer = { getHoverScale: () => 1.0, showBufferTrail: false } as any;
  const mockInput = { isKeyboardActive: false, gamepadSlots: new Map() } as any;
  const mockDevPanel = { isEditMode: false, updateInspector: () => {} } as any;

  const gameLoop = new GameLoop({
    canvas: mockCanvas,
    arena,
    character: player,
    objects: [rock],
    renderer: mockRenderer,
    inputManager: mockInput,
    devPanel: mockDevPanel,
  });
  gameLoop.enableAuthoritativeObjectSync = true;

  // 1. Pick up the rock
  player.pickupModule.pickup(player, rock);
  if (!player.heldObject || !rock.isHeld) {
    throw new Error("Failed to pick up rock locally");
  }
  console.log("✓ Rock picked up locally");

  // 2. Perform throw aimed 6 units ahead at (11, 10)
  const aimX = 11;
  const aimY = 10;
  const thrown = player.throwModule.throwHeldObject(player, aimX, aimY, arena);
  if (!thrown || thrown !== rock) {
    throw new Error("Failed to throw rock locally");
  }
  if (!rock.isInFlight) {
    throw new Error("rock.isInFlight should be true immediately after throw");
  }
  console.log("✓ Rock launched into ballistic flight: isInFlight=true, vz=" + rock.verticalVelocity.toFixed(2));

  const initialVz = rock.verticalVelocity;
  const initialVx = rock.velocity.x;

  // 3. Simulate incoming server snapshots from 100ms ago (where server still thought rock was held!)
  const trailingHeldSnapshot: GhostEntityState[] = [{
    id: "rock-1",
    name: "Rock",
    x: 5,
    y: 10,
    z: 0.45,
    vx: 0,
    vy: 0,
    vz: 0,
    isHeld: true,
    heldBy: "server_client_123",
    isGrounded: false,
    radius: 0.35,
  }];

  // Apply trailing held snapshot with clientId matching server's client id
  gameLoop.syncAuthoritativeObjects(trailingHeldSnapshot, "server_client_123");

  // Verify client did NOT snap rock back into hands or kill velocity
  if (rock.isHeld) {
    throw new Error("Rock was erroneously snapped back into hands by trailing server snapshot!");
  }
  if (Math.abs(rock.verticalVelocity - initialVz) > 0.0001) {
    throw new Error("Vertical velocity was corrupted by trailing server snapshot!");
  }
  if (Math.abs(rock.velocity.x - initialVx) > 0.0001) {
    throw new Error("Linear velocity was corrupted by trailing server snapshot!");
  }
  console.log("✓ In-flight protection successfully ignored trailing server held snapshot (no dragdown)");

  // 4. Advance physics through flight frames and apply trailing airborne snapshots
  let flightTicks = 0;
  let reachedApex = false;
  let landed = false;

  for (let t = 0; t < 120; t++) {
    rock.updatePosition(1 / 60, arena);

    if (rock.position.z > 0.5) reachedApex = true;

    // Simulate trailing server snapshot that is 4 ticks behind
    const trailingServerX = Math.max(5, rock.position.x - 0.5);
    const trailingServerZ = Math.max(0, rock.position.z - 0.3);
    const trailingAirborneSnapshot: GhostEntityState[] = [{
      id: "rock-1",
      name: "Rock",
      x: trailingServerX,
      y: 10,
      z: trailingServerZ,
      vx: 5,
      vy: 0,
      vz: 0,
      isHeld: false,
      heldBy: null,
      isGrounded: false,
      radius: 0.35,
    }];

    gameLoop.syncAuthoritativeObjects(trailingAirborneSnapshot, "server_client_123");

    if (rock.isInFlight) {
      flightTicks++;
    } else {
      landed = true;
      console.log(`Landed at tick ${t}, x=${rock.position.x.toFixed(2)}, z=${rock.position.z.toFixed(2)}, isResting=${rock.isRestingOnSurface}`);
      break;
    }
  }

  console.log(`Finished loop: ticks=${flightTicks}, reachedApex=${reachedApex}, landed=${landed}, x=${rock.position.x.toFixed(2)}, z=${rock.position.z.toFixed(2)}`);

  if (!reachedApex) {
    throw new Error("Rock failed to reach parabolic apex during flight!");
  }
  if (rock.position.x < 8.9) {
    throw new Error(`Rock did not reach target aim distance! Final x=${rock.position.x}`);
  }
  if (!landed || rock.isInFlight) {
    throw new Error("Rock did not cleanly transition out of in-flight upon landing!");
  }

  console.log(`✓ Rock completed full ballistic arc over ${flightTicks} ticks, reached x=${rock.position.x.toFixed(2)}, and smoothly landed!`);

  // Scenario 2: Wall Clearance test
  console.log("\n--- Scenario 2: Throw Over Wall with Trailing Snapshots ---");
  player.velocity = { x: 0, y: 0 };
  player.position = { x: 5, y: 10, z: 0 };
  arena.walls = [{
    id: "wall-mid",
    x: 7.0,
    y: 9.0,
    width: 1.0,
    height: 2.0,
    wallHeight: 1.0,
  }];

  const rock2 = new GameObject({
    id: "rock-2",
    name: "Rock 2",
    position: { x: 5, y: 10, z: 0 },
    mass: 1.0,
    colliderRadius: 0.35,
  });
  gameLoop.objects = [rock2];
  player.pickupModule.pickup(player, rock2);

  const launchRes = player.throwModule.throwHeldObject(player, 11, 10, arena);
  if (!rock2.isInFlight) {
    throw new Error("rock2 must be in flight");
  }
  console.log(`Rock 2 launched: vx=${rock2.velocity.x.toFixed(2)}, vy=${rock2.velocity.y.toFixed(2)}, vz=${rock2.verticalVelocity.toFixed(2)}, startZ=${rock2.position.z.toFixed(2)}`);

  for (let t = 0; t < 120; t++) {
    rock2.updatePosition(1 / 60, arena);

    // Feed trailing server snapshots
    const trailingSnap: GhostEntityState[] = [{
      id: "rock-2",
      name: "Rock 2",
      x: Math.max(5, rock2.position.x - 0.5),
      y: 10,
      z: Math.max(0, rock2.position.z - 0.2),
      vx: 5,
      vy: 0,
      vz: 0,
      isHeld: false,
      heldBy: null,
      isGrounded: false,
      radius: 0.35,
    }];
    gameLoop.syncAuthoritativeObjects(trailingSnap, "server_client_123");

    if (!rock2.isInFlight) break;
  }

  console.log(`Rock 2 finished at x=${rock2.position.x.toFixed(2)}, z=${rock2.position.z.toFixed(2)}`);
  if (rock2.position.x < 8.5) {
    throw new Error(`Rock 2 was stopped by wall! Ended up at x=${rock2.position.x.toFixed(2)}`);
  }
  console.log("✓ Rock 2 successfully cleared the wall and landed on the opposite side!");

  console.log("=== ALL ONLINE THROW BALLISTICS TESTS PASSED ===");
}

runTest();
