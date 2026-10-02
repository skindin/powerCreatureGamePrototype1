import { ServerGameSimulation } from "../src/server/ServerGameSimulation.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";
import { GameLoop } from "../src/engine/GameLoop.js";

const sim = new ServerGameSimulation();

// P1 at (3, 5), P2 at (8, 5)
const sP1 = new Character({ x: 3.0, y: 5.0, mass: 1.2, playerId: "p1" });
const sP2 = new Character({ x: 8.0, y: 5.0, mass: 1.2, playerId: "p2" });
sim.characters.set("p1", sP1);
sim.characters.set("p2", sP2);

const rock = new GameObject({ id: "rock", position: { x: 3.0, y: 5.0, z: 0.5 }, mass: 2.0, colliderRadius: 0.3 });
sim.objects.push(rock);
sim.arena.entities = [...sim.allCharacters, ...sim.objects];

// Local client for P1
const cP1 = new Character({ x: 3.0, y: 5.0, mass: 1.2, playerId: "p1" });
const cRock = new GameObject({ id: "rock", position: { x: 3.0, y: 5.0, z: 0.5 }, mass: 2.0, colliderRadius: 0.3 });
cP1.heldObject = cRock;
cRock.isHeld = true;
cRock.heldBy = cP1;

sP1.heldObject = rock;
rock.isHeld = true;
rock.heldBy = sP1;

console.log("=== P1 RUNNING AND THROWING ===");
// P1 runs forward for 10 ticks
for (let t = 0; t < 10; t++) {
  // P1 inputs moveX: 1.0
  cP1.updateCharacter(1/60, { x: 1.0, y: 0 }, false, null, sim.arena, false, [cP1, cRock]);
  sim.queueInput({
    playerId: "p1",
    tick: t,
    moveX: 1.0,
    moveY: 0,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isDrop: false,
    isThrow: false,
    isAiming: false,
    isLockHeld: false,
  });
  sim.syncCharacterFromPacket({
    id: "p1",
    x: cP1.position.x,
    y: cP1.position.y,
    z: cP1.position.z,
    vx: cP1.velocity.x,
    vy: cP1.velocity.y,
  });
  sim.step(1/60);
}

console.log(`After 10 run ticks: cP1 pos=${cP1.position.x.toFixed(2)}, vel=${cP1.velocity.x.toFixed(2)} | sP1 pos=${sP1.position.x.toFixed(2)}, vel=${sP1.velocity.x.toFixed(2)}`);

// At tick 10: P1 THROWS rock!
console.log("--- P1 THROWS ---");
cP1.throwModule!.throwHeldObject(cP1, 8.0, 5.0, sim.arena);
sim.processReliableActions([{
  actionId: "throw-1",
  type: "throw",
  playerId: "p1",
  aimX: 8.0,
  aimY: 5.0,
}]);

// Now P1 releases keys (moveX: 0, moveY: 0)
// Let's run 60 ticks and see what happens to cP1, sP1, sP2!
for (let t = 11; t < 80; t++) {
  // P1 client update
  cP1.updateCharacter(1/60, { x: 0, y: 0 }, false, null, sim.arena, false, [cP1, cRock]);

  // Server snapshot arrival on client: main.ts logic
  const dx = sP1.position.x - cP1.position.x;
  const dy = sP1.position.y - cP1.position.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0.05) {
    const isSteering = cP1.isActivelyWalking || Math.hypot(cP1.movementInput.x, cP1.movementInput.y) > 0.05;
    const blend = dist > 2.0 ? 1.0 : (isSteering ? 0.35 : 0.4);
    cP1.position.x += dx * blend;
    cP1.position.y += dy * blend;
  }

  // Client telemetry to server
  sim.queueInput({
    playerId: "p1",
    tick: t,
    moveX: 0,
    moveY: 0,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: false,
    isDrop: false,
    isThrow: false,
    isAiming: false,
    isLockHeld: false,
  });
  sim.syncCharacterFromPacket({
    id: "p1",
    x: cP1.position.x,
    y: cP1.position.y,
    z: cP1.position.z,
    vx: cP1.velocity.x,
    vy: cP1.velocity.y,
  });

  // P2 client telemetry
  sim.syncCharacterFromPacket({
    id: "p2",
    x: sP2.position.x,
    y: sP2.position.y,
    z: sP2.position.z,
    vx: 0,
    vy: 0,
  });

  sim.step(1/60);

  if (t % 5 === 0 || sP2.lastCollisionTime > 0) {
    console.log(`Tick ${t}: cP1 pos=(${cP1.position.x.toFixed(2)}, ${cP1.position.y.toFixed(2)}) vel=(${cP1.velocity.x.toFixed(2)}, ${cP1.velocity.y.toFixed(2)}) | sP1 pos=(${sP1.position.x.toFixed(2)}, ${sP1.position.y.toFixed(2)}) vel=(${sP1.velocity.x.toFixed(2)}, ${sP1.velocity.y.toFixed(2)}) | sP2 pos=(${sP2.position.x.toFixed(2)}, ${sP2.position.y.toFixed(2)}) vel=(${sP2.velocity.x.toFixed(2)}, ${sP2.velocity.y.toFixed(2)}) | Rock pos=(${rock.position.x.toFixed(2)}, ${rock.position.y.toFixed(2)})`);
  }
}
