import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { GameLoop } from "../src/engine/GameLoop.js";
import { DevPanel } from "../src/ui/DevPanel.js";
import { Renderer } from "../src/engine/Renderer.js";
import { Character } from "../src/character/Character.js";
import { GameObject } from "../src/engine/GameObject.js";

// Setup server
const server = new UniversalRoomManager();
// Register client 1
const mockWs1 = { readyState: 1, send: () => {}, on: () => {} };
server.handleConnection(mockWs1 as any, {} as any);
// Register client 2
const mockWs2 = { readyState: 1, send: () => {}, on: () => {} };
server.handleConnection(mockWs2 as any, {} as any);

const [c1, c2] = Array.from(server.clients.values());
console.log("Client 1:", c1.id, "Client 2:", c2.id);

// Add a heavy rock to the server at (3, 7)
const sRock = new GameObject({ id: "rock-1", position: { x: 3.0, y: 7.0, z: 0 }, mass: 2.0, colliderRadius: 0.3 });
server.simulation.objects.push(sRock);
server.simulation.arena.entities = [...server.simulation.allCharacters, ...server.simulation.objects];

// Find server characters
const sP1 = server.simulation.characters.get(c1.id)!;
const sP2 = server.simulation.characters.get(c2.id)!;
console.log(`Initial Server: P1=(${sP1.position.x}, ${sP1.position.y}), P2=(${sP2.position.x}, ${sP2.position.y})`);

// Setup Client 1 local simulation
const canvas1 = { width: 1000, height: 1000, getContext: () => null };
const renderer1 = new Renderer(canvas1 as any, server.simulation.arena);
const createMockInputManager = () => ({
  draggedEntity: null,
  mousePos: { x: 0, y: 0 },
  actualMousePos: { x: 0, y: 0 },
  movementVector: { x: 0, y: 0 },
  isKeyboardActive: false,
  isLeftMouseDown: false,
  isRightMouseDown: false,
  isShiftDown: false,
  isSpaceDown: false,
  isQDown: false,
  isEDown: false,
  activeAimCursors: [],
  aimSlots: new Map(),
  pollGamepadSlots: () => {},
  onKeyboardJoin: null,
  onKeyboardJump: null,
  onKeyboardPickup: null,
  onKeyboardDrop: null,
  onKeyboardThrow: null,
});
const devPanel1 = { isEditMode: false } as any;
const inputManager1 = createMockInputManager() as any;
const loop1 = new GameLoop({
  arena: server.simulation.arena,
  objects: [],
  renderer: renderer1,
  inputManager: inputManager1,
  devPanel: devPanel1,
});

// Setup Client 2 local simulation
const canvas2 = { width: 1000, height: 1000, getContext: () => null };
const renderer2 = new Renderer(canvas2 as any, server.simulation.arena);
const devPanel2 = { isEditMode: false } as any;
const inputManager2 = createMockInputManager() as any;
const loop2 = new GameLoop({
  arena: server.simulation.arena,
  objects: [],
  renderer: renderer2,
  inputManager: inputManager2,
  devPanel: devPanel2,
});

// Client 1 hero is P1
const c1P1 = loop1.primaryCharacter!;
c1P1.serverCharId = c1.id;
c1P1.position.x = sP1.position.x;
c1P1.position.y = sP1.position.y;
const c1Rock = new GameObject({ id: "rock-1", position: { x: 3.0, y: 7.0, z: 0 }, mass: 2.0, colliderRadius: 0.3 });
loop1.objects.push(c1Rock);

// Client 2 hero is P2
const c2P2 = loop2.primaryCharacter!;
c2P2.serverCharId = c2.id;
c2P2.position.x = sP2.position.x;
c2P2.position.y = sP2.position.y;
const c2Rock = new GameObject({ id: "rock-1", position: { x: 3.0, y: 7.0, z: 0 }, mass: 2.0, colliderRadius: 0.3 });
loop2.objects.push(c2Rock);

// On Client 1, add remote character for P2
const c1P2 = loop1.playerManager.syncRemoteCharacter({
  id: c2.id,
  playerNumber: 2,
  color: "#38bdf8",
  name: "Player 2",
  x: sP2.position.x,
  y: sP2.position.y,
  z: 0,
});

// On Client 2, add remote character for P1
const c2P1 = loop2.playerManager.syncRemoteCharacter({
  id: c1.id,
  playerNumber: 1,
  color: "#f59e0b",
  name: "Player 1",
  x: sP1.position.x,
  y: sP1.position.y,
  z: 0,
});

// C1 P1 picks up rock
c1P1.heldObject = c1Rock;
c1Rock.isHeld = true;
c1Rock.heldBy = c1P1;

sP1.heldObject = sRock;
sRock.isHeld = true;
sRock.heldBy = sP1;

console.log("=== PHASE 1: C1 RUNS FORWARD FOR 15 TICKS ===");
const dt = 1 / 60;
for (let t = 0; t < 15; t++) {
  // C1 update with moveX = 1.0 (towards P2)
  c1P1.updateCharacter(dt, { x: 1.0, y: 0 }, false, null, loop1.arena, false, loop1.allCharacters);
  
  // C2 update idle
  c2P2.updateCharacter(dt, { x: 0, y: 0 }, false, null, loop2.arena, false, loop2.allCharacters);

  // Send telemetry to server
  server.simulation.queueInput({
    playerId: c1.id,
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
  server.simulation.syncCharacterFromPacket({
    id: c1.id,
    x: c1P1.position.x,
    y: c1P1.position.y,
    z: c1P1.position.z,
    vx: c1P1.velocity.x,
    vy: c1P1.velocity.y,
  });

  server.simulation.queueInput({
    playerId: c2.id,
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
  server.simulation.syncCharacterFromPacket({
    id: c2.id,
    x: c2P2.position.x,
    y: c2P2.position.y,
    z: c2P2.position.z,
    vx: 0,
    vy: 0,
  });

  server.simulation.step(dt);
  const snap = server.simulation.getGhostSnapshot(0);

  // Feed snapshots to clients
  feedSnapshotToClient(loop1, c1P1, c1.id, snap);
  feedSnapshotToClient(loop2, c2P2, c2.id, snap);
}

console.log(`After running: C1P1=(${c1P1.position.x.toFixed(2)}, ${c1P1.position.y.toFixed(2)}) vx=${c1P1.velocity.x.toFixed(2)} | SP1=(${sP1.position.x.toFixed(2)}, ${sP1.position.y.toFixed(2)}) vx=${sP1.velocity.x.toFixed(2)}`);

// At tick 15: C1 THROWS rock at P2!
console.log("=== PHASE 2: C1 THROWS ROCK AT P2 ===");
c1P1.throwModule!.throwHeldObject(c1P1, sP2.position.x, sP2.position.y, loop1.arena);
server.simulation.processReliableActions([{
  actionId: "throw-1",
  type: "throw",
  playerId: c1.id,
  aimX: sP2.position.x,
  aimY: sP2.position.y,
}]);

// Now run 120 ticks (2 seconds) where C1 releases controls (moveX: 0, moveY: 0)
console.log("=== PHASE 3: CONTROLS RELEASED — SIMULATING 120 TICKS ===");
for (let t = 16; t < 150; t++) {
  // Client 1 step: idle
  (loop1 as any).updatePhysics(dt);

  // Client 2 step: idle
  (loop2 as any).updatePhysics(dt);

  // Send telemetry
  server.simulation.queueInput({
    playerId: c1.id,
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
  server.simulation.syncCharacterFromPacket({
    id: c1.id,
    x: c1P1.position.x,
    y: c1P1.position.y,
    z: c1P1.position.z,
    vx: c1P1.velocity.x,
    vy: c1P1.velocity.y,
  });

  server.simulation.queueInput({
    playerId: c2.id,
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
  server.simulation.syncCharacterFromPacket({
    id: c2.id,
    x: c2P2.position.x,
    y: c2P2.position.y,
    z: c2P2.position.z,
    vx: c2P2.velocity.x,
    vy: c2P2.velocity.y,
  });

  server.simulation.step(dt);
  const snap = server.simulation.getGhostSnapshot(0);

  feedSnapshotToClient(loop1, c1P1, c1.id, snap);
  feedSnapshotToClient(loop2, c2P2, c2.id, snap);

  if (t === 40 || t === 50) {
    const rc = loop1.playerManager.remotePlayers.get(c2.id)!;
    const nowPhys = performance.now();
    const interp = loop1.interpolator.getInterpolatedState(rc.playerId, nowPhys);
    const latest = loop1.interpolator.getLatestState(rc.playerId);
    console.log(`[DEBUG Tick ${t}] rc.lastCollisionTime=${rc.lastCollisionTime}, now=${nowPhys}, diff=${nowPhys - rc.lastCollisionTime}, isColliding=${nowPhys - rc.lastCollisionTime < 400}, interp=${JSON.stringify(interp)}, latest=${JSON.stringify(latest)}`);
  }
  if (t % 10 === 0 || t === 149) {
    console.log(`Tick ${t}:
      C1: localP1=(${c1P1.position.x.toFixed(2)}, ${c1P1.position.y.toFixed(2)}) vx=${c1P1.velocity.x.toFixed(2)} | remoteP2=(${c1P2.position.x.toFixed(2)}, ${c1P2.position.y.toFixed(2)}) vx=${c1P2.velocity.x.toFixed(2)} | c1Rock=(${c1Rock.position.x.toFixed(2)}, ${c1Rock.position.y.toFixed(2)})
      C2: localP2=(${c2P2.position.x.toFixed(2)}, ${c2P2.position.y.toFixed(2)}) vx=${c2P2.velocity.x.toFixed(2)} | remoteP1=(${c2P1.position.x.toFixed(2)}, ${c2P1.position.y.toFixed(2)}) vx=${c2P1.velocity.x.toFixed(2)}
      Server: sP1=(${sP1.position.x.toFixed(2)}, ${sP1.position.y.toFixed(2)}) vx=${sP1.velocity.x.toFixed(2)} | sP2=(${sP2.position.x.toFixed(2)}, ${sP2.position.y.toFixed(2)}) vx=${sP2.velocity.x.toFixed(2)} | sRock=(${sRock.position.x.toFixed(2)}, ${sRock.position.y.toFixed(2)})`);
  }
}

function feedSnapshotToClient(loop: GameLoop, localChar: Character, localClientId: string, snapshot: any) {
  const ghostChars = (snapshot.characters && snapshot.characters.length > 0)
    ? snapshot.characters
    : (snapshot.character ? [snapshot.character] : []);

  if (loop.currentTick === 40) {
    console.log("Snapshot chars at tick 40:", ghostChars.map((g: any) => g.id), "rc.playerId is:", localChar?.playerId, "c2.id is:", localClientId);
  }

  const samples: any[] = [];
  for (const gc of ghostChars) {
    samples.push({
      id: gc.id,
      x: gc.x,
      y: gc.y,
      z: gc.z,
      vx: gc.vx,
      vy: gc.vy,
      vz: gc.vz || 0,
      facingAngle: gc.facingAngle ?? 0,
      isClimbing: gc.isClimbing,
      isAboveWalls: gc.isAboveWalls,
      isGrounded: gc.isGrounded,
      surfaceZ: gc.surfaceZ,
      heldObjectId: gc.heldObjectId,
      heldBy: gc.heldBy,
      color: gc.color,
      radius: gc.radius,
    });
  }
  loop.interpolator.pushSnapshot(snapshot.seq, samples, performance.now());

  // Section 2b from main.ts:
  const localServerId = localChar?.serverCharId || localClientId;
  if (localChar && localServerId) {
    const myServerState = ghostChars.find((gc: any) => gc.id === localServerId);
    if (myServerState) {
      const dx = myServerState.x - localChar.position.x;
      const dy = myServerState.y - localChar.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05) {
        const now = performance.now();
        const isRecentThrowRecoil = now - (localChar.lastThrowTime ?? 0) < 600;
        const localSpeed = Math.hypot(localChar.velocity.x, localChar.velocity.y);
        const serverSpeed = Math.hypot(myServerState.vx, myServerState.vy);
        if (!isRecentThrowRecoil && !(localSpeed > 0.1 && serverSpeed < 0.05)) {
          const isSteering = localChar.isActivelyWalking || Math.hypot(localChar.movementInput.x, localChar.movementInput.y) > 0.05;
          const blend = dist > 2.0 ? 1.0 : (isSteering ? 0.35 : 0.4);
          localChar.position.x += dx * blend;
          localChar.position.y += dy * blend;
        }
      }
    }
  }

  // Section 3: sync freebody objects
  if (Array.isArray(snapshot.objects)) {
    loop.syncAuthoritativeObjects(snapshot.objects, localClientId, snapshot.seq);
  }
}
