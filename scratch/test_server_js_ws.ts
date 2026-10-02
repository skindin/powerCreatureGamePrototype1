import { spawn } from "node:child_process";
import WebSocket from "ws";

async function testServer(): Promise<void> {
  console.log("🧪 Testing server.js with UniversalRoomManager /ws connection...");
  const TEST_PORT = "3456";

  const proc = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: TEST_PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (d) => {
    console.log("[server stdout]", d.toString().trim());
  });
  proc.stderr.on("data", (d) => {
    console.error("[server stderr]", d.toString().trim());
  });

  try {
    // Wait for server to boot
    await new Promise((r) => setTimeout(r, 1500));

    // 1. Fetch /api/room-status
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/room-status`);
    const status = await res.json();
    console.log("📊 /api/room-status response:", status);

    if (!status.attached) {
      throw new Error(`UniversalRoomManager not attached! Error: ${status.error}`);
    }
    console.log("✅ UniversalRoomManager is attached!");

    // 2. Connect WebSocket to /ws
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws`);
    
    const joinedPromise = new Promise<void>((resolve, reject) => {
      ws.on("open", () => {
        console.log("🌐 WebSocket connected to /ws!");
        ws.send(JSON.stringify({ type: "join_room", name: "TestBot" }));
      });
      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        console.log("📩 Received WS message type:", msg.type);
        if (msg.type === "room_joined") {
          console.log(`✅ Joined room as ${msg.name} (P${msg.playerNumber})`);
          resolve();
        }
      });
      ws.on("error", (err) => {
        reject(err);
      });
    });

    await Promise.race([
      joinedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("WS timeout")), 3000)),
    ]);

    ws.close();
    console.log("🎉 ALL TESTS PASSED!");
  } finally {
    proc.kill("SIGTERM");
  }
}

testServer().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
