import { Arena } from "./engine/Arena.js";
import { Character } from "./character/Character.js";
import { GameObject } from "./engine/GameObject.js";
import { RollModule } from "./engine/RollModule.js";
import { Renderer, VerticalVisualMode } from "./engine/Renderer.js";
import { InputManager } from "./ui/InputManager.js";
import { DevPanel } from "./ui/DevPanel.js";
import { PlayersPanel } from "./ui/PlayersPanel.js";
import { FeedbackPanel } from "./ui/FeedbackPanel.js";
import { GameLoop } from "./engine/GameLoop.js";
import { RelayClient } from "./network/RelayClient.js";
import { DeployNotifier } from "./ui/DeployNotifier.js";
import QRCode from "qrcode";

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

  // Size the canvas CSS dimensions to exactly fit the wrapper at 20:14 ratio.
  // This is done in JS (not CSS) so getBoundingClientRect() always matches the
  // true arena display area — making the mouse coordinate formula pixel-perfect.
  const fitCanvas = () => {
    const wrapper = canvas.parentElement as HTMLElement;
    if (!wrapper) return;
    const s = getComputedStyle(wrapper);
    const availW = wrapper.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
    const availH = wrapper.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
    const scale = Math.min(availW / arena.width, availH / arena.height);
    canvas.style.width  = `${Math.floor(arena.width  * scale)}px`;
    canvas.style.height = `${Math.floor(arena.height * scale)}px`;
  };
  const canvasResizeObserver = new ResizeObserver(fitCanvas);
  canvasResizeObserver.observe(canvas.parentElement!);
  window.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", () => {
    setTimeout(fitCanvas, 60);
    setTimeout(fitCanvas, 250);
  });
  document.addEventListener("fullscreenchange", () => {
    setTimeout(fitCanvas, 60);
    setTimeout(fitCanvas, 200);
  });
  if (screen.orientation) {
    screen.orientation.addEventListener("change", () => {
      setTimeout(fitCanvas, 60);
      setTimeout(fitCanvas, 250);
    });
  }
  fitCanvas();

  // Mobile & Gamepad Browser Back Prevention:
  // Intercept history popstate and navigation keys (such as LB on mobile controllers or Android back gestures)
  // so pressing Left Bumper never leaves the game.
  try {
    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", () => {
      history.pushState(null, "", window.location.href);
    });
  } catch {}

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "BrowserBack" || e.key === "GoBack" || (e as any).key === "AndroidBack") {
        e.preventDefault();
      }
    },
    { capture: true }
  );

  // Maximize / Fullscreen Manager & Orientation Lock:
  const btnMaximize = document.getElementById("btn-maximize-screen");
  const maximizeIcon = document.getElementById("maximize-btn-icon");
  const maximizeText = document.getElementById("maximize-btn-text");
  const mobileBtnMaximize = document.getElementById("mobile-btn-maximize");
  const mobileMaximizeIcon = document.getElementById("mobile-maximize-icon");
  const mobileMaximizeText = document.getElementById("mobile-maximize-text");
  const mobileMaximizeBadge = document.getElementById("mobile-maximize-badge");
  const mobileFloatingFsBtn = document.getElementById("mobile-fullscreen-btn");

  const isFullscreenActive = (): boolean => {
    return Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  };

  const updateFullscreenUI = () => {
    const isFs = isFullscreenActive();
    if (btnMaximize) {
      if (isFs) {
        btnMaximize.classList.add("active");
        if (maximizeIcon) maximizeIcon.textContent = "🗗";
        if (maximizeText) maximizeText.textContent = "Restore";
        btnMaximize.title = "Exit Fullscreen (Esc / F11)";
      } else {
        btnMaximize.classList.remove("active");
        if (maximizeIcon) maximizeIcon.textContent = "⛶";
        if (maximizeText) maximizeText.textContent = "Maximize";
        btnMaximize.title = "Maximize / Fullscreen (F11)";
      }
    }
    if (mobileBtnMaximize) {
      if (isFs) {
        mobileBtnMaximize.classList.add("active");
        if (mobileMaximizeIcon) mobileMaximizeIcon.textContent = "🗗";
        if (mobileMaximizeText) mobileMaximizeText.textContent = "Restore Screen";
        if (mobileMaximizeBadge) mobileMaximizeBadge.textContent = "Active";
      } else {
        mobileBtnMaximize.classList.remove("active");
        if (mobileMaximizeIcon) mobileMaximizeIcon.textContent = "⛶";
        if (mobileMaximizeText) mobileMaximizeText.textContent = "Maximize Screen";
        if (mobileMaximizeBadge) mobileMaximizeBadge.textContent = "Full";
      }
    }
    if (mobileFloatingFsBtn) {
      if (isFs) {
        mobileFloatingFsBtn.classList.add("hidden");
      } else {
        mobileFloatingFsBtn.classList.remove("hidden");
      }
    }
  };

  const toggleFullscreen = async () => {
    const docEl = document.documentElement as any;
    const isFs = isFullscreenActive();

    if (!isFs) {
      const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (req) {
        try {
          await req.call(docEl, { navigationUI: "hide" });
        } catch (err) {
          try {
            await req.call(docEl);
          } catch (err2) {
            console.warn("Fullscreen request notice:", err2);
          }
        }
      }

      // iOS Safari scroll collapse fallback
      window.scrollTo(0, 0);
      setTimeout(() => window.scrollTo(0, 0), 100);

      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock("landscape").catch(() => {});
      }
    } else {
      const exit = document.exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
      if (exit) {
        try {
          await exit.call(document);
        } catch (err) {
          console.warn("Fullscreen exit notice:", err);
        }
      }
    }
    updateFullscreenUI();
  };

  btnMaximize?.addEventListener("click", () => toggleFullscreen());
  mobileBtnMaximize?.addEventListener("click", () => toggleFullscreen());
  mobileFloatingFsBtn?.addEventListener("click", () => toggleFullscreen());

  document.addEventListener("fullscreenchange", updateFullscreenUI);
  document.addEventListener("webkitfullscreenchange", updateFullscreenUI);
  document.addEventListener("mozfullscreenchange", updateFullscreenUI);
  document.addEventListener("MSFullscreenChange", updateFullscreenUI);

  updateFullscreenUI();

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
  let gameLoop: GameLoop | null = null;
  const getAllActiveCharacters = (): Character[] => {
    return gameLoop ? gameLoop.allCharacters : [character];
  };

  const renderer = new Renderer(ctx);
  const devPanel = new DevPanel({
    container: devContainer,
    character,
    arena,
    objects,
    getAllCharacters: getAllActiveCharacters,
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
  inputManager.handleInteractions(character, arena, objects, devPanel, getAllActiveCharacters);
  devPanel.onSelectionChange = (entity) => {
    inputManager.selectedCanvasEntity = entity;
  };

  // Sprint interaction
  inputManager.onToggleSprint = (active?: boolean) => {
    const newState = active !== undefined ? active : !character.isSprinting;
    character.setSprinting(newState);
  };
  inputManager.onStopKeyboardSprint = () => {
    character.setSprinting(false);
  };

  // Gamepad Connection Indicator
  const controllerBadge = document.getElementById("controller-badge");
  const mobileGamepadStatus = document.getElementById("mobile-gamepad-status");
  inputManager.onGamepadStatusChange = (connected, name) => {
    if (controllerBadge) {
      if (connected) {
        controllerBadge.classList.remove("hidden");
        controllerBadge.title = `Gamepad Connected: ${name}`;
      } else {
        controllerBadge.classList.add("hidden");
      }
    }
    if (mobileGamepadStatus) {
      if (connected) {
        mobileGamepadStatus.classList.remove("hidden");
      } else {
        mobileGamepadStatus.classList.add("hidden");
      }
    }
  };

  // Register PWA Service Worker for offline play on HTTPS/tunnel, unregister on localhost for live updates
  if ("serviceWorker" in navigator) {
    if (window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("PWA ServiceWorker registration notice:", err);
      });
    } else {
      // On localhost / desktop app: unregister service workers so changes are always 100% live
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  }

  // 6. Start Fixed-Timestep Game Loop
  gameLoop = new GameLoop({
    arena,
    character,
    objects,
    renderer,
    inputManager,
    devPanel,
  });
  (window as any).gameLoop = gameLoop;
  (window as any).character = character;

  // 6b. Initialize Players & Controllers Panel
  const playersPanel = new PlayersPanel(gameLoop, inputManager);
  void playersPanel;

  // 6c. Initialize Bugs & Suggestions (Feedback) Panel
  const feedbackPanel = new FeedbackPanel();
  void feedbackPanel;

  // Keep dev selector synced across dynamic character spawns/removals
  const originalOnPlayersChanged = gameLoop.onPlayersChanged;
  gameLoop.onPlayersChanged = () => {
    originalOnPlayersChanged?.();
    devPanel.updateSelectorOptions();
    if (gameLoop) {
      const allChars = gameLoop.allCharacters;
      if (devPanel.selectedEntity instanceof Character && !allChars.includes(devPanel.selectedEntity as Character)) {
        devPanel.setSelectedEntity(gameLoop.primaryCharacter || allChars[0] || objects[0] || (null as any));
      }
    }
  };

  // Sprint interaction
  inputManager.onToggleSprint = (active?: boolean) => {
    const target = gameLoop ? (gameLoop.players.get("keyboard")?.character ?? gameLoop.primaryCharacter) : character;
    if (target) {
      const newState = active !== undefined ? active : !target.isSprinting;
      target.setSprinting(newState);
    }
  };
  inputManager.onStopKeyboardSprint = () => {
    const target = gameLoop ? (gameLoop.players.get("keyboard")?.character ?? gameLoop.primaryCharacter) : character;
    if (target) {
      target.setSprinting(false);
    }
  };

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

  const mobileModeSingleBtn = document.getElementById("mobile-mode-single-btn");
  const mobileModeMultiBtn = document.getElementById("mobile-mode-multi-btn");

  const setMode = (multiplayer: boolean) => {
    isMultiplayerMode = multiplayer;
    if (multiplayer) {
      btnSinglePlayer?.classList.remove("active");
      btnMultiplayer?.classList.add("active");
      mobileModeSingleBtn?.classList.remove("active");
      mobileModeMultiBtn?.classList.add("active");
      relayHud?.classList.remove("hidden");
      relayStatusPill?.classList.remove("hidden");
      relayClient.connect();
    } else {
      btnSinglePlayer?.classList.add("active");
      btnMultiplayer?.classList.remove("active");
      mobileModeSingleBtn?.classList.add("active");
      mobileModeMultiBtn?.classList.remove("active");
      relayHud?.classList.add("hidden");
      relayStatusPill?.classList.add("hidden");
      relayClient.disconnect();
    }
  };

  btnSinglePlayer?.addEventListener("click", () => setMode(false));
  btnMultiplayer?.addEventListener("click", () => setMode(true));
  mobileModeSingleBtn?.addEventListener("click", () => setMode(false));
  mobileModeMultiBtn?.addEventListener("click", () => setMode(true));

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

    const mobileRelayStatus = document.getElementById("mobile-relay-status");
    const mobilePingDisplay = document.getElementById("mobile-ping-display");
    if (isMultiplayerMode) {
      mobileRelayStatus?.classList.remove("hidden");
      if (mobilePingDisplay) {
        mobilePingDisplay.textContent = stats.status === "connected" ? `${Math.round(stats.lastRttMs)} ms` : stats.status;
      }
      const mobileDot = mobileRelayStatus?.querySelector(".status-dot");
      if (mobileDot) mobileDot.className = `status-dot ${stats.status}`;
    } else {
      mobileRelayStatus?.classList.add("hidden");
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

  const relayToggleLerpBtn = document.getElementById("relay-toggle-lerp-btn") as HTMLButtonElement | null;
  const relayLerpRateInput = document.getElementById("relay-lerp-rate-input") as HTMLInputElement | null;

  // Restore saved lerp settings
  try {
    const savedLerp = localStorage.getItem("pcg_ghost_lerp");
    if (savedLerp !== null) {
      relayClient.lerpGhosts = savedLerp === "true";
    }
    const savedRate = localStorage.getItem("pcg_ghost_lerp_rate");
    if (savedRate !== null) {
      const parsed = parseFloat(savedRate);
      if (!isNaN(parsed) && parsed >= 0) {
        relayClient.ghostLerpRatePercent = parsed;
      }
    }
  } catch {}

  const updateLerpUi = () => {
    if (relayToggleLerpBtn) {
      if (relayClient.lerpGhosts) {
        relayToggleLerpBtn.textContent = "⚡ Lerp: ON";
        relayToggleLerpBtn.className = "btn-lerp-toggle active";
      } else {
        relayToggleLerpBtn.textContent = "⚡ Lerp: OFF";
        relayToggleLerpBtn.className = "btn-lerp-toggle off";
      }
    }
    if (relayLerpRateInput) {
      relayLerpRateInput.value = relayClient.ghostLerpRatePercent.toString();
    }
  };

  updateLerpUi();

  relayToggleLerpBtn?.addEventListener("click", () => {
    relayClient.lerpGhosts = !relayClient.lerpGhosts;
    updateLerpUi();
    try {
      localStorage.setItem("pcg_ghost_lerp", relayClient.lerpGhosts ? "true" : "false");
    } catch {}
  });

  const handleRateChange = () => {
    if (!relayLerpRateInput) return;
    const val = parseFloat(relayLerpRateInput.value);
    if (!isNaN(val) && val >= 0) {
      relayClient.ghostLerpRatePercent = val;
      try {
        localStorage.setItem("pcg_ghost_lerp_rate", val.toString());
      } catch {}
    }
  };

  relayLerpRateInput?.addEventListener("input", handleRateChange);
  relayLerpRateInput?.addEventListener("change", handleRateChange);

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

  // 8. Setup Inspector Sidebar Toggle & Auto-Responsive Layout
  const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
  const quickSidebarTab = document.getElementById("quick-sidebar-tab");

  const setSidebarOpen = (open: boolean) => {
    if (!devContainer) return;
    if (open) {
      devContainer.classList.remove("collapsed");
      toggleSidebarBtn?.classList.add("active");
      quickSidebarTab?.classList.add("hidden");
    } else {
      devContainer.classList.add("collapsed");
      toggleSidebarBtn?.classList.remove("active");
      quickSidebarTab?.classList.remove("hidden");
    }
    try {
      localStorage.setItem("pcg_sidebar_open", open ? "true" : "false");
    } catch {
      // Ignore localStorage errors
    }
  };

  // Default to open on desktop/laptop (>= 950px), or restore saved user preference
  let startSidebarOpen = true;
  const isMobileOrTouch = window.matchMedia("(pointer: coarse)").matches;
  try {
    const saved = localStorage.getItem("pcg_sidebar_open");
    if (isMobileOrTouch) {
      startSidebarOpen = false;
    } else if (saved !== null) {
      startSidebarOpen = saved === "true";
    } else if (window.innerWidth < 950) {
      startSidebarOpen = false;
    }
  } catch {
    startSidebarOpen = !isMobileOrTouch && window.innerWidth >= 950;
  }
  setSidebarOpen(startSidebarOpen);

  toggleSidebarBtn?.addEventListener("click", () => {
    const isCollapsed = devContainer.classList.contains("collapsed");
    setSidebarOpen(isCollapsed);
  });

  quickSidebarTab?.addEventListener("click", () => {
    setSidebarOpen(true);
  });

  devContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest("#btn-close-dev-panel")) {
      setSidebarOpen(false);
    }
    if (target && target.closest("#btn-dev-view-settings")) {
      const isOpen = !viewSettingsPanel?.classList.contains("hidden");
      setViewSettingsOpen(!isOpen);
    }
  });

  // 8b. Setup View Settings Floating Panel & Vertical Visuals Mode
  const toggleViewSettingsBtn = document.getElementById("toggle-view-settings-btn");
  const viewSettingsPanel = document.getElementById("view-settings-panel");
  const btnCloseViewSettings = document.getElementById("btn-close-view-settings");
  const visualOptionBtns = document.querySelectorAll<HTMLButtonElement>(".visual-option-btn");
  const mobileVisualBtns = document.querySelectorAll<HTMLButtonElement>(".mobile-visual-btn");

  const setViewSettingsOpen = (open: boolean) => {
    if (!viewSettingsPanel) return;
    if (open) {
      viewSettingsPanel.classList.remove("hidden");
      toggleViewSettingsBtn?.classList.add("active");
    } else {
      viewSettingsPanel.classList.add("hidden");
      toggleViewSettingsBtn?.classList.remove("active");
    }
  };

  toggleViewSettingsBtn?.addEventListener("click", () => {
    const isOpen = !viewSettingsPanel?.classList.contains("hidden");
    setViewSettingsOpen(!isOpen);
  });

  btnCloseViewSettings?.addEventListener("click", () => {
    setViewSettingsOpen(false);
  });

  // Apply saved or default vertical visuals mode (default is orthographic "hover" mode without scale)
  const validModes: VerticalVisualMode[] = ["bigger", "hover", "both"];
  let savedMode: VerticalVisualMode = "hover";
  try {
    if (localStorage.getItem("pcg_view_default_ortho_v1") !== "true") {
      localStorage.setItem("pcg_vertical_visuals", "hover");
      localStorage.setItem("pcg_view_default_ortho_v1", "true");
    }
    const stored = localStorage.getItem("pcg_vertical_visuals") as VerticalVisualMode;
    if (stored && validModes.includes(stored)) {
      savedMode = stored;
    }
  } catch {
    // Ignore localStorage errors
  }

  const applyVisualMode = (mode: VerticalVisualMode) => {
    renderer.setVerticalVisualMode(mode);
    try {
      localStorage.setItem("pcg_vertical_visuals", mode);
    } catch {
      // Ignore localStorage errors
    }
    visualOptionBtns.forEach((btn) => {
      if (btn.getAttribute("data-mode") === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    mobileVisualBtns.forEach((btn) => {
      if (btn.getAttribute("data-visual-mode") === mode) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  };

  applyVisualMode(savedMode);

  visualOptionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode") as VerticalVisualMode;
      if (mode && validModes.includes(mode)) {
        applyVisualMode(mode);
      }
    });
  });

  mobileVisualBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-visual-mode") as VerticalVisualMode;
      if (mode && validModes.includes(mode)) {
        applyVisualMode(mode);
      }
    });
  });

  // Visual Wall Height & Isometric Depth Slider (0.0 to 1.0)
  const slideVisualWallHeight = document.getElementById("slide-visual-wall-height") as HTMLInputElement | null;
  const valVisualWallHeight = document.getElementById("val-visual-wall-height");
  const mobileSlideWallHeight = document.getElementById("mobile-slide-wall-height") as HTMLInputElement | null;
  const mobileValWallHeight = document.getElementById("mobile-val-wall-height");

  let savedVisualWallHeight = 0.5;
  try {
    const storedH = localStorage.getItem("pcg_visual_wall_height");
    if (storedH !== null) {
      const parsedH = parseFloat(storedH);
      // If user had old default 1.0, update to new default 0.5; if custom, respect it
      if (!isNaN(parsedH) && parsedH >= 0 && parsedH <= 1.0 && parsedH !== 1.0) {
        savedVisualWallHeight = parsedH;
      } else if (parsedH === 1.0) {
        savedVisualWallHeight = 0.5;
      }
    }
  } catch {
    // Ignore localStorage error
  }

  const applyVisualWallHeight = (scale: number) => {
    renderer.setVisualAltitudeScale(scale);
    if (slideVisualWallHeight) slideVisualWallHeight.value = scale.toFixed(2);
    if (valVisualWallHeight) valVisualWallHeight.textContent = scale.toFixed(2);
    if (mobileSlideWallHeight) mobileSlideWallHeight.value = scale.toFixed(2);
    if (mobileValWallHeight) mobileValWallHeight.textContent = scale.toFixed(2);
    try {
      localStorage.setItem("pcg_visual_wall_height", scale.toString());
    } catch {
      // Ignore localStorage error
    }
  };

  applyVisualWallHeight(savedVisualWallHeight);

  slideVisualWallHeight?.addEventListener("input", () => {
    const val = parseFloat(slideVisualWallHeight.value);
    if (!isNaN(val)) {
      applyVisualWallHeight(val);
    }
  });

  mobileSlideWallHeight?.addEventListener("input", () => {
    const val = parseFloat(mobileSlideWallHeight.value);
    if (!isNaN(val)) {
      applyVisualWallHeight(val);
    }
  });

  // View Settings remains open while testing gameplay modes; close via '✕', 'V', 'Esc', or toggle button

  // Phone Connect Modal Logic
  const btnPhoneConnect = document.getElementById("btn-phone-connect");
  const phoneModal = document.getElementById("phone-modal");
  const btnClosePhoneModal = document.getElementById("btn-close-phone-modal");
  const qrCanvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
  const phoneUrlInput = document.getElementById("phone-url-input") as HTMLInputElement | null;
  const btnCopyPhoneUrl = document.getElementById("btn-copy-phone-url");
  const phoneModalTip = document.getElementById("phone-modal-tip");

  const setPhoneModalOpen = async (open: boolean) => {
    if (!phoneModal) return;
    if (open) {
      phoneModal.classList.remove("hidden");
      btnPhoneConnect?.classList.add("active");
      setViewSettingsOpen(false);

      // Persistent worldwide URL requested by user - NEVER display any random link
      const persistentUrl = "https://pcg-arena-teal.loca.lt";

      try {
        const res = await fetch("/tunnel.json?" + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            if (phoneModalTip) {
              phoneModalTip.innerHTML = `<span>🟢 <b>Live Worldwide Tunnel Active!</b> Open <code>${persistentUrl}</code> from anywhere in the country.</span>`;
            }
          } else {
            if (phoneModalTip) {
              phoneModalTip.innerHTML = `<span>🌐 <b>Permanent Link:</b> <code>${persistentUrl}</code><br/>💡 Toggle <b>Public</b> in the app header or run <code>npm run share</code> to activate.</span>`;
            }
          }
        }
      } catch {
        // Keep persistentUrl
      }

      if (phoneUrlInput) {
        phoneUrlInput.value = persistentUrl;
      }

      if (qrCanvas) {
        QRCode.toCanvas(qrCanvas, persistentUrl, {
          width: 180,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        }).catch((err) => console.error("QR render error:", err));
      }
    } else {
      phoneModal.classList.add("hidden");
      btnPhoneConnect?.classList.remove("active");
    }
  };

  // Public Worldwide Link Widget Handlers
  const persistentWorldwideUrl = "https://pcg-arena-teal.loca.lt";
  const btnPublicUrlDisplay = document.getElementById("btn-public-url-display") as HTMLButtonElement | null;
  const btnCopyPublicUrl = document.getElementById("btn-copy-public-url") as HTMLButtonElement | null;
  const publicStatusDot = document.getElementById("public-status-dot");
  const btnCopyRoomUrl = document.getElementById("btn-copy-room-url");

  const copyPublicLink = async (triggerBtn?: HTMLElement | null) => {
    try {
      await navigator.clipboard.writeText(persistentWorldwideUrl);
      if (btnPublicUrlDisplay) {
        const originalText = btnPublicUrlDisplay.textContent;
        btnPublicUrlDisplay.textContent = "✅ Copied!";
        btnPublicUrlDisplay.classList.add("copied");
        setTimeout(() => {
          btnPublicUrlDisplay.textContent = originalText;
          btnPublicUrlDisplay.classList.remove("copied");
        }, 1500);
      }
      if (btnCopyPublicUrl) {
        btnCopyPublicUrl.textContent = "✅ Copied!";
        btnCopyPublicUrl.classList.add("copied");
        setTimeout(() => {
          btnCopyPublicUrl.textContent = "📋 Copy";
          btnCopyPublicUrl.classList.remove("copied");
        }, 1500);
      }
      if (triggerBtn && triggerBtn !== btnCopyPublicUrl && triggerBtn !== btnPublicUrlDisplay) {
        triggerBtn.textContent = "✅ Copied!";
        setTimeout(() => {
          triggerBtn.textContent = "📋 Copy";
        }, 1500);
      }
    } catch {
      // Fallback
    }
  };

  btnPublicUrlDisplay?.addEventListener("click", () => copyPublicLink());
  btnCopyPublicUrl?.addEventListener("click", () => copyPublicLink());
  btnCopyRoomUrl?.addEventListener("click", () => copyPublicLink(btnCopyRoomUrl));

  // Periodic Tunnel Status Checker
  const checkTunnelStatus = async () => {
    try {
      const res = await fetch("/tunnel.json?" + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (publicStatusDot) {
          if (data.active) {
            publicStatusDot.className = "status-dot";
            publicStatusDot.setAttribute("title", "Public tunnel is online & accessible nationwide");
          } else {
            publicStatusDot.className = "status-dot connecting";
            publicStatusDot.setAttribute("title", "Public tunnel is in standby");
          }
        }
        const mobilePublicDot = document.getElementById("mobile-public-dot");
        if (mobilePublicDot) {
          mobilePublicDot.className = data.active ? "status-dot" : "status-dot connecting";
        }
      }
    } catch {
      // Offline / error
    }
  };

  checkTunnelStatus();
  setInterval(checkTunnelStatus, 4000);

  btnPhoneConnect?.addEventListener("click", () => {
    const isOpen = !phoneModal?.classList.contains("hidden");
    setPhoneModalOpen(!isOpen);
  });

  btnClosePhoneModal?.addEventListener("click", () => {
    setPhoneModalOpen(false);
  });

  btnCopyPhoneUrl?.addEventListener("click", async () => {
    if (phoneUrlInput?.value) {
      await navigator.clipboard.writeText(phoneUrlInput.value);
      btnCopyPhoneUrl.textContent = "Copied!";
      setTimeout(() => {
        btnCopyPhoneUrl.textContent = "Copy";
      }, 1500);
    }
  });

  // Close Phone Modal if clicking outside
  document.addEventListener("pointerdown", (e) => {
    const target = e.target as HTMLElement | null;
    if (
      phoneModal &&
      !phoneModal.classList.contains("hidden") &&
      target &&
      !phoneModal.contains(target) &&
      !btnPhoneConnect?.contains(target)
    ) {
      setPhoneModalOpen(false);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (
      (e.code === "Backquote" || (e.code === "KeyI" && !e.ctrlKey && !e.metaKey && !e.altKey)) &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement)
    ) {
      const isCollapsed = devContainer.classList.contains("collapsed");
      setSidebarOpen(isCollapsed);
    }

    if (
      e.code === "KeyV" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement)
    ) {
      const isOpen = !viewSettingsPanel?.classList.contains("hidden");
      setViewSettingsOpen(!isOpen);
    }

    if (e.code === "F11") {
      e.preventDefault();
      toggleFullscreen();
    }

    if (e.code === "Escape") {
      setMobileMenuOpen(false);
      setViewSettingsOpen(false);
      setPhoneModalOpen(false);
      feedbackPanel.close();
    }
  });

  // Setup Mobile Landscape Menu & Hamburger Button
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileExpandedMenu = document.getElementById("mobile-expanded-menu");
  const btnCloseMobileMenu = document.getElementById("btn-close-mobile-menu");
  const mobileBtnCopyUrl = document.getElementById("mobile-btn-copy-url");
  const mobileBtnQr = document.getElementById("mobile-btn-qr");
  const mobileBtnPlayers = document.getElementById("mobile-btn-players");
  const mobileBtnInspector = document.getElementById("mobile-btn-inspector");
  const mobilePlayersBadge = document.getElementById("mobile-players-badge");

  const setMobileMenuOpen = (open: boolean) => {
    if (!mobileExpandedMenu) return;
    if (open) {
      mobileExpandedMenu.classList.remove("hidden");
      mobileMenuBtn?.classList.add("active");
      if (mobilePlayersBadge && gameLoop) {
        const count = gameLoop.players.size;
        mobilePlayersBadge.textContent = `${count} Active`;
      }
    } else {
      mobileExpandedMenu.classList.add("hidden");
      mobileMenuBtn?.classList.remove("active");
    }
  };

  mobileMenuBtn?.addEventListener("click", () => {
    const isOpen = !mobileExpandedMenu?.classList.contains("hidden");
    setMobileMenuOpen(!isOpen);
  });

  btnCloseMobileMenu?.addEventListener("click", () => {
    setMobileMenuOpen(false);
  });

  mobileExpandedMenu?.addEventListener("click", (e) => {
    if (e.target === mobileExpandedMenu) {
      setMobileMenuOpen(false);
    }
  });

  mobileBtnCopyUrl?.addEventListener("click", () => {
    copyPublicLink(mobileBtnCopyUrl);
  });

  mobileBtnQr?.addEventListener("click", () => {
    setMobileMenuOpen(false);
    setPhoneModalOpen(true);
  });

  mobileBtnPlayers?.addEventListener("click", () => {
    setMobileMenuOpen(false);
    playersPanel.toggle();
  });

  mobileBtnInspector?.addEventListener("click", () => {
    setMobileMenuOpen(false);
    const isCollapsed = devContainer.classList.contains("collapsed");
    setSidebarOpen(isCollapsed);
  });

  // Keep mobile players badge up to date on player changes
  const prevOnPlayersChanged = gameLoop.onPlayersChanged;
  gameLoop.onPlayersChanged = () => {
    prevOnPlayersChanged?.();
    if (mobilePlayersBadge && gameLoop) {
      const count = gameLoop.players.size;
      mobilePlayersBadge.textContent = `${count} Active`;
    }
  };

  // Connect Game Loop to Ghost Clones and Network Telemetry Dispatch
  gameLoop.getGhostSnapshot = (dt: number) => {
    if (!isMultiplayerMode) return null;
    relayClient.updateGhostLerp(dt);
    return relayClient.getLatestGhost();
  };
  gameLoop.onPhysicsTick = (_dt, nowMs) => {
    if (isMultiplayerMode) {
      relayClient.update(character, objects, nowMs);
    }
  };

  gameLoop.start();

  // Start background Railway live deployment notifier (never forces a reload)
  new DeployNotifier();

  console.log("🚀 Power Creature Game Prototype 1 (Phase 1.1) running!");
}

window.addEventListener("DOMContentLoaded", bootstrap);
