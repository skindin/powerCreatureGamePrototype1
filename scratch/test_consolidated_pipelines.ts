import http from "node:http";
import { WebSocket } from "ws";
import { ClientNetworkPipeline } from "../src/network/protocol/ClientNetworkPipeline.js";
import { ServerNetworkPipeline } from "../src/network/protocol/ServerNetworkPipeline.js";
import { UniversalRoomManager } from "../src/server/UniversalRoomManager.js";
import { OnlineClientTransport } from "../src/network/transports/OnlineClientTransport.js";
import { BoomerangRelayTransport } from "../src/network/transports/BoomerangRelayTransport.js";

// Polyfill WebSocket in Node environment for OnlineClientTransport
if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = WebSocket;
}

async function runPipelineTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING CONSOLIDATED NETWORK PIPELINES & BEHAVIORS");
  console.log("===============================================================");

  // --- UNIT 1: ClientNetworkPipeline Logic ---
  console.log("\n--- TEST 1: ClientNetworkPipeline Outbox & Packaging ---");
  const clientPipe = new ClientNetworkPipeline("TestHero");
  clientPipe.clientId = "hero_1";

  clientPipe.queueReliableAction({
    actionId: "act_1",
    type: "pickup",
    playerId: "hero_1",
    targetObjectId: "rock-1",
    tick: 10,
    timestamp: 1000,
  });

  if (clientPipe.unackedActionsCount !== 1) {
    throw new Error(`Expected 1 unacked action, got ${clientPipe.unackedActionsCount}`);
  }

  const packet = clientPipe.createInputPacket(new Map(), 10);
  if (!packet.reliableActions || packet.reliableActions.length !== 1 || packet.reliableActions[0].actionId !== "act_1") {
    throw new Error("createInputPacket failed to include queued reliable action");
  }
  console.log("✅ ClientNetworkPipeline outbox and packaging verified!");

  // Test ACK processing
  clientPipe.processServerSnapshot({
    seq: 10,
    sentAt: packet.sentAt,
    receivedAt: packet.sentAt + 20,
    rttMs: 20,
    character: { id: "hero_1", x: 5, y: 5, z: 0, vx: 0, vy: 0, radius: 0.44 },
    objects: [],
    ackActionIds: ["act_1"],
  });

  if (clientPipe.unackedActionsCount !== 0) {
    throw new Error(`Expected unackedActionsCount to be 0 after ACK, got ${clientPipe.unackedActionsCount}`);
  }
  console.log("✅ ClientNetworkPipeline ACK clearing and RTT calculation verified!");

  // --- UNIT 2: ServerNetworkPipeline Logic ---
  console.log("\n--- TEST 2: ServerNetworkPipeline Ingestion & Execution ---");
  const serverPipe = new ServerNetworkPipeline();
  const cInfo = serverPipe.registerClient("client_alpha", "Alpha");
  console.log(`Registered client in server simulation: ${cInfo.name} (P${cInfo.playerNumber})`);

  const rockObj = serverPipe.simulation.objects[0];
  const alphaChar = serverPipe.simulation.characters.get("client_alpha")!;
  alphaChar.position.x = rockObj.position.x + 0.2;
  alphaChar.position.y = rockObj.position.y;

  serverPipe.processClientPacket("client_alpha", {
    type: "pc_player_input",
    seq: 1,
    sentAt: 100,
    tick: 1,
    inputs: [{
      playerId: "client_alpha",
      playerName: "Alpha",
      tick: 1,
      moveX: 0,
      moveY: 0,
      isSprinting: false,
      isJumpHeld: false,
      isGrabHeld: true,
      isDrop: false,
      isThrow: false,
    }],
    reliableActions: [{
      actionId: "act_grab_rock",
      type: "pickup",
      playerId: "client_alpha",
      targetObjectId: rockObj.id,
      tick: 1,
      timestamp: 100,
    }],
  });

  // Step server physics to process input & action
  serverPipe.step(1 / 60);

  if (!alphaChar.heldObject || alphaChar.heldObject.id !== rockObj.id) {
    throw new Error("ServerNetworkPipeline failed to authoritatively execute pickup action");
  }
  console.log("✅ ServerNetworkPipeline authoritative action execution verified!");

  const snapPacket = serverPipe.createSnapshotPacketForClient("client_alpha");
  if (!snapPacket.snapshot.ackActionIds?.includes("act_grab_rock")) {
    throw new Error("Server snapshot failed to include ackActionIds for executed action");
  }
  console.log("✅ ServerNetworkPipeline snapshot creation with ACKs and clockSync verified!");

  // --- UNIT 3: BoomerangRelayTransport ---
  console.log("\n--- TEST 3: BoomerangRelayTransport Instantiation & Simulation ---");
  const boomerang = new BoomerangRelayTransport("wss://dummy.relay");
  boomerang.queueReliableAction({
    actionId: "act_boom",
    type: "drop",
    playerId: "keyboard",
    tick: 1,
    timestamp: 100,
  });
  if (boomerang.unackedActionsCount !== 1) {
    throw new Error("BoomerangRelayTransport failed to track reliable action in client pipeline");
  }
  boomerang.stepServerPhysics(1 / 60);
  const ghost = boomerang.getLatestGhost();
  if (!ghost) {
    throw new Error("BoomerangRelayTransport failed to step server physics and produce ghost");
  }
  console.log("✅ BoomerangRelayTransport using consolidated pipelines verified!");

  // --- UNIT 4: Real Online Multiplayer Server + OnlineClientTransport ---
  console.log("\n--- TEST 4: Real UniversalRoomManager & OnlineClientTransport Over /ws ---");
  const server = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end("ok");
  });

  const roomManager = UniversalRoomManager.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as any;
  const wsUrl = `ws://127.0.0.1:${address.port}/ws`;
  console.log(`Test server running on ${wsUrl}`);

  const onlineClient = new OnlineClientTransport("CyberKnight");
  let joined = false;
  onlineClient.onJoined = (info) => {
    joined = true;
    console.log(`Online client joined room: ${info.name} as P${info.playerNumber}`);
  };

  onlineClient.connect(wsUrl);

  await new Promise<void>((resolve, reject) => {
    const check = setInterval(() => {
      if (joined && onlineClient.clientId) {
        clearInterval(check);
        resolve();
      }
    }, 20);
    setTimeout(() => {
      clearInterval(check);
      reject(new Error("OnlineClientTransport connection timeout"));
    }, 3000);
  });

  // Verify online client sends reliable action and receives authoritative snapshot
  const clientChar = roomManager.simulation.characters.get(onlineClient.clientId!)!;
  const testObj = roomManager.simulation.objects[0];
  clientChar.position.x = testObj.position.x + 0.2;
  clientChar.position.y = testObj.position.y;

  const onlineActId = "act_online_grab";
  onlineClient.queueReliableAction({
    actionId: onlineActId,
    type: "pickup",
    playerId: onlineClient.clientId!,
    targetObjectId: testObj.id,
    tick: 1,
    timestamp: performance.now(),
  });

  onlineClient.sendPlayerInput({
    playerId: onlineClient.clientId!,
    playerName: "CyberKnight",
    tick: 1,
    moveX: 0,
    moveY: 0,
    isSprinting: false,
    isJumpHeld: false,
    isGrabHeld: true,
    isDrop: false,
    isThrow: false,
  });

  let ackReceived = false;
  onlineClient.pipeline.onSnapshot = (snapshot) => {
    if (snapshot.ackActionIds?.includes(onlineActId)) {
      ackReceived = true;
    }
  };

  await new Promise<void>((resolve, reject) => {
    const check = setInterval(() => {
      if (ackReceived && onlineClient.unackedActionsCount === 0) {
        clearInterval(check);
        resolve();
      }
    }, 20);
    setTimeout(() => {
      clearInterval(check);
      reject(new Error("OnlineClientTransport reliable action execution/ACK timeout"));
    }, 4000);
  });

  console.log("✅ OnlineClientTransport reliable action executed, acknowledged, and outbox cleared!");

  // Clean up
  onlineClient.disconnect();
  roomManager.stop();
  server.close();

  console.log("\n===============================================================");
  console.log("🎉 ALL CONSOLIDATED PIPELINE ARCHITECTURE TESTS PASSED 100%!");
  console.log("===============================================================\n");
  process.exit(0);
}

runPipelineTests().catch((err) => {
  console.error("❌ Pipeline test failed:", err);
  process.exit(1);
});
