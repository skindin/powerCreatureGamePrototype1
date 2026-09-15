# AGENTS.md — Shared Agent Memory & Architecture Guide

> **Notice to All AI Agents**:  
> You **MUST** read this document at the start of every session before doing research, planning, or editing code.  
> Before wrapping up your task or concluding your turn, you **MUST** update this file to reflect any new architectural decisions, progress made, or changes to the project roadmap.

---

## 1. Project Overview & Tech Stack

### High-Level Concept
**Power Creature Game (Prototype 1)** is a top-down 2D action arena and interactive developer sandbox where creatures fight, sprint, climb, and pick up / throw dynamic freebodies (rocks, crates, food, and even other creatures) across an arena featuring walls of physical height.

### Tech Stack
- **Language & Runtime**: TypeScript 5.7+, Node.js (v18+)
- **Build Tool & Bundler**: Vite 6.x (`npm run dev`, `npm run build`)
- **Graphics & Rendering**: Vanilla HTML5 Canvas 2D (custom software renderer with pseudo-3D altitude scaling, ground footprint shadows, and wall-height indicator rings; multiplayer ghost clones dynamically synchronize with view settings modes: bigger, hover, or both)
- **Styling**: Vanilla CSS with modern dark glassmorphic UI tokens (`src/style.css`)
- **Networking**: WebSocket protocol with JSON telemetry; currently uses 3rd-party cloud echo relays (`wss://echo.websocket.org`, `wss://ws.postman-echo.com/raw`) for latency & ghost clone validation
- **Launcher / Desktop App**: Lightweight C# launcher (`Launcher.cs` / `LaunchGame.exe` / `desktop_app/`)

### File Structure Map
```text
powerCreatureGamePrototype1/
├── DESIGN_DOC.md          # Living Master Design Document
├── PHASE_ONE.md           # Phase 1 properties & milestone notes
├── AGENTS.md              # Shared agent memory across sessions & devices (this file)
├── index.html             # Main entry HTML, top bar, HUD overlays, canvas
├── package.json           # Dependencies and scripts (dev, build, preview, start)
├── server.js              # Node.js production static server with health checks
├── vite.config.ts         # Vite configuration
├── src/
│   ├── main.ts            # Application bootstrap, entity initialization, mode switching
│   ├── style.css          # Design system, glassmorphic HUDs, inspector styling
│   ├── character/         # Modular creature capabilities
│   │   ├── Character.ts   # Core creature entity with composable modules
│   │   ├── WalkingModule.ts
│   │   ├── ClimbingModule.ts
│   │   ├── PickupModule.ts
│   │   └── ThrowModule.ts
│   ├── engine/            # Simulation and rendering core
│   │   ├── Arena.ts       # Grid-based arena with wall heights and tile queries
│   │   ├── GameLoop.ts    # 60Hz fixed timestep simulation loop, collision resolver
│   │   ├── GameObject.ts  # Universal freebody entity (mass, colliders, altitude)
│   │   ├── Renderer.ts    # Canvas 2D renderer, altitude projection, ghost clones
│   │   ├── ColliderModule.ts
│   │   ├── FrictionModule.ts
│   │   ├── BounceModule.ts
│   │   ├── GravityModule.ts
│   │   ├── MassModule.ts
│   │   ├── RollModule.ts  # 3D angular velocity, rolling resistance, indicators
│   │   └── VerticalPositionModule.ts
│   ├── network/           # Networking and telemetry
│   │   └── RelayClient.ts # WebSocket relay client, RTT latency tracking, ghost snapshots
│   └── ui/                # User interface and developer tools
│       ├── DevPanel.ts    # Collapsible live inspector, variable sliders, wall tools
│       └── InputManager.ts # Keyboard, mouse, drag-and-drop, touch controls
└── scratch/               # Automated test simulations and headless scenarios
```

---

## 2. Current State & Progress

### Physics & Controls (Phase 1.1 — Fully Functional)
- **60Hz Deterministic Fixed Timestep**: Simulation advances strictly in `fixedDt = 1 / 60` increments with an accumulator preventing spiral-of-death on tab unfocus.
- **Two-Tier Altitude Gating**:
  - Objects exist in pseudo-3D with $(x, y, z)$ coordinates and vertical velocity $v_z$.
  - **Layer 1** (Ground, $z < \text{wallHeight}$): Collides with ground-level walls and entities.
  - **Layer 2** (Wall elevation, $z \ge \text{wallHeight}$): Cleanly passes *over* ground walls. Thrown items fly above walls and only hit walls if falling down to wall height.
- **Wall Climbing & Dismounting**:
  - Space key climbs walls or dismounts.
  - Dismounting only occurs when the player actively steers/pushes towards open ground.
- **Universal Freebodies**:
  - Every dynamic object (and creature) has mass, collider radius, bounce restitution, and friction.
  - **Massless vs. Massive Rule**: Massless objects absorb separation and inherit closing velocity from massive objects without dampening massive objects, unless pinned against a wall.
- **Grabbing, Carrying & Throwing**:
  - Players can pick up nearby items (`E` key or Left Click).
  - Ballistic parabolic trajectory calculation previews throw arcs, showing clearance over walls. When holding an object with mouse and keyboard, the creature continuously faces the mouse cursor and projects the ballistic trajectory toward the mouse.
  - Carrying heavy objects scales throw speed and distance according to creature strength vs. object weight.
- **Roll Dynamics**:
  - Spherical freebodies support 3D angular velocity, roll resistance, and rotating directional roll indicators rendered on canvas.

### Gamepad Controller & Virtual Aim Cursor (Phase 1.1 Expansion — Fully Functional)
- **Standard Gamepad API Polling**:
  - Polled deterministically each physics tick (`pollGamepad()`) in `InputManager.ts` & `GameLoop.ts`.
  - **Left Joystick (`axes[0]`, `axes[1]`)**: Smooth proportional analog character movement with $0.18$ radial deadzone. Movement direction **never** aims the throwing arc.
  - **Right Joystick (`axes[2]`, `axes[3]`) Virtual Aim Cursor**:
    - Operates like a free-floating mouse cursor that can travel anywhere across the screen/arena.
    - **Active Device Isolation**: The virtual joystick cursor is **only** drawn and active when playing with a controller (`activeInputDevice === "gamepad"`). When playing with keyboard and mouse, the joystick cursor is never drawn, and mouse & keyboard controls operate 100% cleanly without controller overrides.
    - **Always Visible On Controller**: Stays visible and active on screen at all times whenever using a controller — it **never** disappears when you release or stop moving the joysticks.
    - **Facing Direction Rule**: The character **only** turns to face the aim cursor when holding an object (ready to throw). When empty-handed, the character turns to face their movement direction.
    - **No Position Resets**: Position is preserved after throwing or picking up objects (never reset).
    - **Cursor-Directed Pickup Targeting**: Moving the cursor highlights the closest reachable grabbable object on the ground (white ring), just like a mouse cursor.
    - Deflecting the right joystick pushes the crosshair in that direction at $17.0\text{ u/s}$ ($2\times$ original speed).
    - Releasing the stick leaves the cursor locked at its relative offset from the character (`gamepadAimOffset`), maintaining its screen position as the character moves.
    - The cursor itself is **unclamped** by throw distance, roaming freely across the entire arena/screen.
    - The throw target (trajectory arc & landing marker) points along the ray from character toward the cursor, with its physical landing distance clamped to **$13.0\text{ units}$** (`maxThrowAimDistance = 13.0`, restored original setting).
    - When aiming beyond throw range, a dashed sightline guides the eye from the clamped landing target to the unclamped aim reticle.
  - **Bottom Button (`A` / Cross, `button[0]`)**: Wall climbing and dismounting (`isClimbHeld`).
  - **Right Trigger (`RT`, `button[7]`)**:
    - **Empty-handed**: Grabs the reachable grabbable object closest to the virtual aim cursor.
    - **Holding an object**: Throws the held object toward the cursor. A release-lock (`rtGrabbed`) requires the player to release the trigger after grabbing before a throw can be initiated, preventing accidental immediate throws upon pickup.
  - **Right Bumper (`RB` / R1, `button[5]`)**:
    - Dedicated throw button when holding an object (never grabs). Throws immediately at the virtual aim cursor.
  - **`B` Button (`button[1]`)**: Pickup & swap (`pickupAndSwap`) — grabs the reachable object closest to the cursor, swaps held object with ground object, or drops if no reachable object.
  - **Left Bumper (`LB` / L1, `button[4]`)**: Toggles Sprinting on/off.
- **Sprinting Mechanics**:
  - `Shift + WASD` (or `LB` controller bumper) toggles sprint mode.
  - Increases character speed by **$1.55\times$** and propulsion acceleration by **$1.5\times$** via `WalkingModule.ts`.
  - Releasing directional movement controls automatically resets sprinting to off.
  - Top controls bar displays interactive `⚡ WALK` / `⚡ SPRINTING` badge with animated golden glow.
  - Gamepad connection displays live `🎮 GAMEPAD` status badge.

### Mobile Landscape & PWA (Installable Game — Fully Functional)
- **Mobile Landscape Layout**:
  - Strictly **no virtual on-screen touch controls** per user directive; full gamepad/controller compatibility.
  - Notch and camera safe-area padding using `viewport-fit=cover` and CSS `env(safe-area-inset-left/right)`.
  - Compact header (36px) preserving aspect ratio ($20:14$) of arena canvas on phones (e.g. 844x390, 932x430).
- **Progressive Web App (PWA)**:
  - `public/manifest.webmanifest`: Configured with `display: "standalone"`, `orientation: "landscape"`, and theme colors for full-screen mobile app install.
  - `public/sw.js`: Service worker with network-first app caching for instant offline loading.
  - `public/icon.svg`: Scalable high-resolution creature game icon.
- **Persistent Remote Connection & Nationwide Public Access**:
  - Tunnel consistently binds to **`https://pcg-arena-teal.loca.lt`** via `--subdomain pcg-arena-teal`.
  - Built-in project dependencies: `localtunnel`, `qrcode`, `qrcode-terminal`.
  - **Prominent Display & Direct Utilization Across the Entire App**:
    - **In-Game Header Bar Widget** (`#public-link-widget`): Directly displays `PUBLIC: https://pcg-arena-teal.loca.lt` with a live pulsing status dot, instant 1-click clipboard copy (`#btn-copy-public-url` & clicking the URL), a direct browser open button (`↗`), and phone QR code scan modal (`📱 QR`).
    - **Desktop App Header Bar** (`desktop_app/Form1.cs`): Features dedicated `btnPublicLink` (`🌐 https://pcg-arena-teal.loca.lt`) with instant copy feedback, `↗ Open` to launch in the default browser, and auto-starts the tunnel on launch (`_ = StartTunnelAsync()`).
    - **Multiplayer Relay HUD (`#multiplayer-relay-hud`)**: Features a dedicated `Public Game Room` row with `https://pcg-arena-teal.loca.lt`, 1-click copy, and browser open button for inviting remote players.
    - **Pre-Bundled Tunnel Serving (`vite.config.ts`)**: Remote requests passing through localtunnel (`x-forwarded-host: *.loca.lt`) are automatically served the optimized pre-bundled production build from `dist/` (instead of 50+ concurrent unbundled ESM `.ts` requests). This completely eliminates 502 Bad Gateway proxy timeouts on remote laptops/phones, while preserving instant HMR for local PC development. Background watcher auto-updates `dist/` on source edits.
  - **In-Game `📱 Phone Link` Modal & View Settings Access**:
    - Accessible directly in the browser top-bar (`#btn-phone-connect`, `#toggle-view-settings-btn`), in the desktop app top bar (`👁 View`), and in the Inspector panel (`👁️ View`).
    - View Settings panel is elevated to `z-index: 50` and remains open during live gameplay so players can test visual options live without click-outside closing.

---

## 3. Key Architectural Decisions

1. **60Hz Fixed Timestep**:
   - Standardized on **60Hz** (`dt = 1 / 60`) for physics simulation across client and server.
2. **True Modularity & Opt-in Mechanics**:
   - If a creature or freebody does not have a module (e.g. no `StaminaModule`, no `ClimbingModule`, no `RollModule`), that system simply does not run for that entity. Never introduce hardcoded monolithic checks.
3. **Controller-First Mobile Experience**:
   - Mobile devices in landscape use physical Bluetooth/USB gamepads without on-screen virtual touch UI overlays.
4. **Rocket League-Style Rollback Physics (Phase 1.2 Architecture)**:
   - **Continuous Swept Contact Rollback (TOI)**: Fast-moving colliders rewind to the exact point of tangent contact before applying impulse/restitution, eliminating penetration squish.
   - **Islands of Influence**: Resting/sleeping arena objects ($v \approx 0$) are excluded from resimulation. Only active players and the objects they currently touch, hold, or throw form an active island.
   - **Time Dilation Clock Sync**: The server adjusts client physics speed ($0.99\times$ to $1.01\times$) to maintain a stable ~2-frame input buffer without client hitching.
   - **Decoupled Visual Smoothing**: Physical coordinates snap immediately on rollback correction; renderer interpolates visual offsets across 3–5 frames so corrections are imperceptible.
5. **Desktop / Laptop Development Workflow**:
   - The primary code repository is hosted on GitHub: `https://github.com/skindin/powerCreatureGamePrototype1.git` on branch `branch1`.
   - Work is synced across desktop and laptop via Git commits and pulls.
6. **Dynamic UI Scaling & Aspect-Ratio Preservation**:
   - Application layout uses a full-width header (`.top-bar` at `100vw`, `z-index: 30`) and a flex column container (`#app-layout`).
   - `.app-body` wraps `.viewport-container` and `#dev-sidebar`, so the inspector panel docks *below* the top bar and never covers header buttons.
   - Canvas wrapper and viewport containers enforce `min-width: 0; min-height: 0;` so flexbox children scale down fluidly on laptop displays and high-DPI scaling (125%/150%).
   - `#game-canvas` uses `aspect-ratio: 20 / 14; object-fit: contain;` to guarantee the complete arena is visible with zero edge cropping across all window sizes.
   - DevPanel inspector sidebar is open by default on desktop/laptops ($\ge 950\text{px}$) with user preference persisted in `localStorage` under `pcg_sidebar_open`.
   - Collapsing is supported via header toggle button, close button `✕`, hotkeys (`Backquote` or `KeyI`), and a floating `.quick-sidebar-tab` docked to the right edge of the viewport.
   - Responsive media queries collapse top-bar button labels to compact icon pills (`👁️` and `🛠️`) at $< 1140\text{px}$ to prevent header button cropping.
7. **Resilient Local Launcher & Zero-Cache Ephemeral Desktop App**:
   - `Launcher.cs` / `LaunchGame.exe` automatically searches for and injects `C:\Program Files\nodejs` into the process environment and verifies port 5173 health before opening the game window.
   - `desktop_app/Form1.cs` / `PowerCreatureGame.exe` strictly enforces **Zero Persistent Cache**:
     - Creates an isolated ephemeral profile folder per session in `%TEMP%` (`PowerCreatureGame_Session_<GUID>`).
     - Passes `--disable-http-cache --disable-cache --disk-cache-size=0 --disable-application-cache` to `CoreWebView2EnvironmentOptions`.
     - Explicitly clears `DiskCache`, `ServiceWorkers`, `CacheStorage`, `IndexedDb`, and `WebSql` on initialization.
     - Appends a cache-busting timestamp parameter (`?_v=<epoch_ms>`) on startup to guarantee the latest live Vite dev server source is always rendered.
     - Deletes the ephemeral folder upon app exit.
8. **Movement Auto-Cancels Sprint**:
   - In `WalkingModule.ts`, letting go of directional movement controls (`!isMoving`, i.e. keys or left joystick released) automatically resets `character.isSprinting = false`.
   - `Character.ts` dispatches `onSprintChange` events so HUD badges (`#sprint-badge`) update instantly without desync.
9. **Wall-Start Throw Clamping**:
   - `ThrowModule.clampStartOutsideWalls`: If a character is on the ground ($z < \text{wallHeight}$) and facing into a wall, held objects and projectile trajectories are clamped to the closest non-overlapping coordinates outside the wall face, preventing items from clipping or spawning embedded inside wall geometry.
10. **Isometric 2.5D Walls & Entity Occlusion Transparency**:
    - In Hover Above Shadow and Both modes, walls render with 2.5D depth as two stacked squares: an intermediate slate bottom square (`#1e293b`) at ground level and a lighter top square (`#334155`) shifted vertically by $y - \text{wallHeight} \times \text{visualAltitudeScale}$. Ground tiles remain deep slate (`#0f172a`), creating clear visual separation between floor, wall front face, and wall roof.
    - **Occlusion Transparency**: Transparency (`globalAlpha = 0.35`) triggers when **any** ground entity's collider (player character, crates, rocks, food, creatures) on screen is completely above the wall's ground collider (`objY + objR <= wall.y`), overlapping on screen X, and within the top square's projection. Being beside a wall (left or right) never causes transparency.
    - **Wall Tops Render Over Objects**: In the rendering pipeline, wall top squares render OVER ground-layer entities ($z < \text{wallHeight}$), ensuring proper occlusion and clean see-through transparency. Elevated entities ($z \ge \text{wallHeight}$) render on top of the wall roof.
11. **Visual Wall Height Slider & Cursor Aim Alignment**:
    - View Settings features a visual wall height slider from `0.0` (pure 2D flat) to `1.0` (1:1 isometric height), scaling the vertical position of wall top squares, squishing the visible front face, and scaling all altitude hover offsets.
    - Ground aim reticle always renders precisely at the cursor position. High-elevation wall hits render the landing target vertically elevated above the mouse at $(y - z_{\text{hit}} \times \text{scale})$ with an altitude guide line.
    - Elevated entities cast secondary shadows on top of wall surfaces when hovering over walls at $z \ge \text{wallHeight}$.
12. **Straight Trajectory Dots to Bottom-Most Visible Shadow (Hover & Both Modes)**:
    - When `useHover && visualAltitudeScale > 0`, in addition to the elevated 3D parabolic arc, a straight line composed strictly of dots (no duplicate dashed stroke) connects the throw start position shadow directly to the **bottom-most visible shadow** of the trajectory.
    - If landing on or hitting a wall at altitude ($z \ge \text{wallHeight}$), the bottom-most visible shadow targets the top of that wall at $(y - \text{wallHeight} \times \text{visualAltitudeScale}) \times \text{ppu}$. If landing on the floor, it targets the true ground coordinates.
    - Dots are opaque (`rgba(255, 255, 255, 0.95)`) when below wall height ($z < \text{wallHeight}$), and transparent (`rgba(255, 255, 255, 0.38)`) when at or above wall height ($z \ge \text{wallHeight}$). Dots overlapping the character's body are skipped.
13. **Shadows Render Below Entities & Top-Most Shadow Outline Rule**:
    - All shadows (ground shadow fills, ground outlines, wall-top shadows, and vertical altitude connector lines) render **below entities**:
      - Ground shadows render on the floor grid below all wall bases and ground entities.
      - Wall-top shadows and vertical connector lines render on wall tops before elevated entities are drawn.
    - **Top-Most Relevant Shadow Outline Rule**: Outlines are strictly drawn only for the top-most relevant shadow. If an object or landing indicator is above a wall ($z \ge \text{wallHeight}$ over wall geometry), only the outline around the shadow for the top of the wall is drawn (ground footprint outline under the wall is omitted). If over open ground, the ground outline is drawn.
    - **Top of Wall Shadow Masking**: Wall-top shadow fills (for elevated objects and landing targets) are masked via clipping to the top of wall squares so the shadow fill never bleeds outside the wall roof into open air. The outlines remain unmasked so the full shape is clearly visible.
14. **Held Objects Render On Top & Transparent**:
    - Objects held by a character render with semi-transparency (`globalAlpha = 0.55`) and are sorted to render ON TOP OF the holding character at all times, ensuring the player can clearly see their character and facing orientation through the carried object.

---

## 4. Immediate Next Steps

| Priority | Task | Description |
| :--- | :--- | :--- |
| **1** | **Continuous Swept Collisions (TOI Rollback)** | Replace discrete overlap separation in `GameLoop.ts` with swept circle-circle and circle-wall collision detection that rewinds to the contact instant before calculating impulses. |
| **2** | **State Snapshot & History Ring Buffer** | Implement `StateSnapshot` serialization and a 120-tick circular buffer to store past entity positions, velocities, and holding states for rollback replay. |
| **3** | **Active Islands Graph** | Create an island manager that tags idle freebodies as Sleeping, only simulating and rolling back entities coupled to active players. |
| **4** | **Authoritative Server Input Queue** | Implement the server-side input buffer with adaptive time dilation hints (`speedUp` / `slowDown`) sent to the client. |
| **5** | **Client Prediction & Reconciliation** | Implement client state comparison against server snapshots with an error deadzone, selective resimulation, and render-layer smoothing. |

---

## 5. Agent Workflow Rule

> ### ⚠️ Mandatory Instructions for Future Agent Sessions:
> 1. **Read First**: Always read `AGENTS.md` and `DESIGN_DOC.md` before answering questions, generating plans, or editing code.
> 2. **Check Current Branch & Status**: Work on the active branch (`branch1` unless specified otherwise) and verify `git status`.
> 3. **Preserve Modularity**: Never couple features directly into the core loop if they belong in composable modules.
> 4. **Update Memory Before Concluding**: Whenever you introduce architectural changes, implement new features, or alter project direction, update this `AGENTS.md` file so the next agent (or session on another device) has full context.
