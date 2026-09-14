import { Arena } from "./engine/Arena.js";
import { Character } from "./character/Character.js";
import { GameObject } from "./engine/GameObject.js";
import { RollModule } from "./engine/RollModule.js";
import { Renderer } from "./engine/Renderer.js";
import { InputManager } from "./ui/InputManager.js";
import { DevPanel } from "./ui/DevPanel.js";
import { GameLoop } from "./engine/GameLoop.js";
import { RelayClient } from "./network/RelayClient.js";

function bootstrap(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  const devContainer = document.getElementById("dev-sidebar") as HTMLElement;

  if (!canvas || !devContainer) {
    console.error("Missing canvas or dev-sidebar container in DOM");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to acquire 2D canvas context");
    return;
  }

  // 1. Initialize Arena (20 units wide x 14 units tall, 1 wall = 1 unit)
  const arena = new Arena(20, 14, 1.0);
  canvas.width = 1000;
  canvas.height = 700;

  // 2. Initialize Base Character in unit coordinates
  const character = new Character({
    x: 4.8,
    y: 7.0,
    color: "#f59e0b", // Amber body
    colliderRadius: 0.44,
    mass: 1.2,
    strength: 1.0,
  });

  // 3. Initialize Initial Freebody Objects in unit coordinates
  const objects: GameObject[] = [
    new GameObject({
      id: "stone-1",
      name: "Light Blue Box",
      position: { x: 6.8, y: 4.4, z: 0 },
      mass: 0.7,
      colliderRadius: 0.26,
      color: "#38bdf8",
      bounceMod: 0.25,
      visualShape: "box",
    }),
    new GameObject({
      id: "boulder-1",
      name: "Heavy Red Box",
      position: { x: 7.0, y: 9.2, z: 0 },
      mass: 2.6,
      colliderRadius: 0.40,
      color: "#f87171",
      bounceMod: 0.05,
      visualShape: "box",
    }),
    new GameObject({
      id: "bouncy-1",
      name: "Super Bouncy Ball",
      position: { x: 5.2, y: 3.0, z: 0.6 },
      mass: 0.5,
      colliderRadius: 0.24,
      color: "#4ade80",
      bounceMod: 0.85,
      verticalVelocity: 1.0,
    }),
    new GameObject({
      id: "rolling-1",
      name: "Rolling Ball",
      position: { x: 13.6, y: 7.0, z: 0 },
      velocity: { x: 4.5, y: 1.5 },
      mass: 0.6,
      colliderRadius: 0.28,
      color: "#a855f7",
      bounceMod: 0.95,
      rollModule: new RollModule({
        rollResistance: 0.0,
        angularVelocity: { x: -1.5 / 0.28, y: 4.5 / 0.28, z: 0 },
      }),
    }),
  ];

  // Synchronize initial entities with the arena walls so any entity placed on a wall starts at wall elevation (Layer 2)
  arena.syncEntitiesWithWalls([character, ...objects]);

  // 4. Initialize Renderer & Dev Panel
  const renderer = new Renderer(ctx);
  const devPanel = new DevPanel({
    container: devContainer,
    character,
    arena,
    objects,
    onSpawnObject: (newObj) => {
      arena.syncEntitiesWithWalls([newObj]);
      objects.push(newObj);
      devPanel.updateSelectorOptions();
    },
    onDeleteObject: (targetObj) => {
      const idx = objects.indexOf(targetObj);
      if (idx !== -1) {
        objects.splice(idx, 1);
      }
      devPanel.updateSelectorOptions();
    },
    onClearObjects: () => {
      if (character.heldObject) {
        character.heldObject.isHeld = false;
        character.heldObject.heldBy = null;
        character.heldObject = null;
      }
      objects.length = 0;
      devPanel.updateSelectorOptions();
    },
  });

  // 5. Initialize Input Manager with Dev Panel interaction
  const inputManager = new InputManager(canvas, arena);
  inputManager.handleInteractions(character, arena, objects, devPanel);
  devPanel.onSelectionChange = (entity) => {
    inputManager.selectedCanvasEntity = entity;
  };

  // 6. Start Fixed-Timestep Game Loop
  const gameLoop = new GameLoop({
    arena,
    character,
    objects,
    renderer,
    inputManager,
    devPanel,
  });

  // 7. Setup Multiplayer 3rd-Party Relay Client & Mode Switching
  const relayClient = new RelayClient("wss://echo.websocket.org");
  let isMultiplayerMode = false;

  const btnSinglePlayer = document.getElementById("mode-singleplayer-btn");
  const btnMultiplayer = document.getElementById("mode-multiplayer-btn");
  const relayHud = document.getElementById("multiplayer-relay-hud");
  const relayStatusPill = document.getElementById("relay-status-pill");
  const relayPingDisplay = document.getElementById("relay-ping-display");
  const relayBadgeStatus = document.getElementById("relay-badge-status");
  const relayConnectBtn = document.getElementById("relay-connect-btn") as HTMLButtonElement | null;
  const relayToggleGhostsBtn = document.getElementById("relay-toggle-ghosts-btn") as HTMLButtonElement | null;
  const relayUrlInput = document.getElementById("relay-url-input") as HTMLInputElement | null;
  const btnPresetPostman = document.getElementById("btn-preset-postman");
  const btnPresetOrg = document.getElementById("btn-preset-org");
  const rttCurrent = document.getElementById("rtt-current");
  const rttSub = document.getElementById("rtt-sub");
  const packetCounts = document.getElementById("relay-packet-counts");
  const rate30Btn = document.getElementById("rate-30hz-btn");
  const rate60Btn = document.getElementById("rate-60hz-btn");

  const setMode = (multiplayer: boolean) => {
    isMultiplayerMode = multiplayer;
    if (multiplayer) {
      btnSinglePlayer?.classList.remove("active");
      btnMultiplayer?.classList.add("active");
      relayHud?.classList.remove("hidden");
      relayStatusPill?.classList.remove("hidden");
      relayClient.connect();
    } else {
      btnSinglePlayer?.classList.add("active");
      btnMultiplayer?.classList.remove("active");
      relayHud?.classList.add("hidden");
      relayStatusPill?.classList.add("hidden");
      relayClient.disconnect();
    }
  };

  btnSinglePlayer?.addEventListener("click", () => setMode(false));
  btnMultiplayer?.addEventListener("click", () => setMode(true));

  relayClient.onStatsChange = (stats) => {
    if (relayBadgeStatus) {
      relayBadgeStatus.textContent = stats.status;
      relayBadgeStatus.className = `relay-badge-status ${stats.status}`;
    }

    if (relayConnectBtn) {
      relayConnectBtn.textContent = stats.status === "connected" ? "Disconnect" : "Connect";
    }

    const dot = relayStatusPill?.querySelector(".status-dot");
    if (dot) {
      dot.className = `status-dot ${stats.status}`;
    }

    const pingText = stats.status === "connected" ? `${Math.round(stats.lastRttMs)} ms` : stats.status;
    if (relayPingDisplay) relayPingDisplay.textContent = pingText;
    if (rttCurrent) {
      rttCurrent.textContent = stats.status === "connected" ? `${Math.round(stats.lastRttMs)} ms` : "-- ms";
      if (stats.lastRttMs < 70) rttCurrent.style.color = "#22c55e";
      else if (stats.lastRttMs < 140) rttCurrent.style.color = "#f59e0b";
      else rttCurrent.style.color = "#ef4444";
    }

    if (rttSub) {
      rttSub.textContent = `min: ${Math.round(stats.minRttMs)} ms | max: ${Math.round(stats.maxRttMs)} ms | avg: ${Math.round(stats.avgRttMs)} ms`;
    }

    if (packetCounts) {
      packetCounts.textContent = `Sent: ${stats.packetsSent} | Echoed: ${stats.packetsReceived}`;
    }
  };

  relayConnectBtn?.addEventListener("click", () => {
    if (relayClient.status === "connected") {
      relayClient.disconnect();
    } else {
      if (relayUrlInput) relayClient.url = relayUrlInput.value.trim();
      relayClient.connect();
    }
  });

  relayToggleGhostsBtn?.addEventListener("click", () => {
    relayClient.showGhostClones = !relayClient.showGhostClones;
    if (relayClient.showGhostClones) {
      relayToggleGhostsBtn.textContent = "👻 Ghosts: ON";
      relayToggleGhostsBtn.className = "btn-ghost-toggle active";
    } else {
      relayToggleGhostsBtn.textContent = "👻 Ghosts: OFF";
      relayToggleGhostsBtn.className = "btn-ghost-toggle off";
    }
  });

  relayUrlInput?.addEventListener("change", () => {
    relayClient.url = relayUrlInput.value.trim();
    if (relayClient.status === "connected") {
      relayClient.connect();
    }
  });

  btnPresetPostman?.addEventListener("click", () => {
    const url = "wss://ws.postman-echo.com/raw";
    if (relayUrlInput) relayUrlInput.value = url;
    relayClient.url = url;
    relayClient.connect();
  });

  btnPresetOrg?.addEventListener("click", () => {
    const url = "wss://echo.websocket.org";
    if (relayUrlInput) relayUrlInput.value = url;
    relayClient.url = url;
    relayClient.connect();
  });

  rate30Btn?.addEventListener("click", () => {
    relayClient.sendRateHz = 30;
    rate30Btn.classList.add("active");
    rate60Btn?.classList.remove("active");
  });

  rate60Btn?.addEventListener("click", () => {
    relayClient.sendRateHz = 60;
    rate60Btn.classList.add("active");
    rate30Btn?.classList.remove("active");
  });

  // Connect Game Loop to Ghost Clones and Network Telemetry Dispatch
  gameLoop.getGhostSnapshot = () => (isMultiplayerMode ? relayClient.getLatestGhost() : null);
  gameLoop.onPhysicsTick = (_dt, nowMs) => {
    if (isMultiplayerMode) {
      relayClient.update(character, objects, nowMs);
    }
  };

  gameLoop.start();
  console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!");
}

window.addEventListener("DOMContentLoaded", bootstrap);
