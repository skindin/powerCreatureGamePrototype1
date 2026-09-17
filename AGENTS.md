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
  - Controls bar cleanly displays the `👥 N PLAYERS` roster button and `🎮 GAMEPAD` connection badge (individual player sprinting operates independently without a global status box cluttering the bar).
  - Gamepad connection displays live `🎮 GAMEPAD` status badge.

### Dynamic Multi-Player, Controllers Panel & Colored Sightlines (Phase 1.1 Expansion — Fully Functional)
- **Multi-Gamepad & Multi-Character Support**:
  - Deterministically polls multiple gamepads simultaneously via `pollGamepadSlots()`. Each connected controller has its own independent character, movement vectors, aim reticle travel, climbing, sprint, grab, and throw mechanics.
- **On-Demand Player Join, Unassigned Page Load & Device Reconnect**:
  - **Initial Page Load**: The primary character exists in the arena unassigned (not automatically claimed by keyboard). Floating tag reads `Press Space / A`.
  - **First Device Connection**: Whichever input device (Keyboard `Space` or any Gamepad `A`) presses join first claims the standing character as Player 1 (Amber Gold).
  - **Subsequent Device Joins**: When the primary character is already controlled, additional devices pressing `Space` or `A` dynamically spawn Player 2, Player 3, etc.
  - **Last Player Removal Rule**: Removing the last active player does **never delete the character from the arena**. Instead, it cleanly unassigns the controller/keyboard and drops any held object safely. The character remains standing in the arena, ready to be claimed by the next device to press `Space` or `A`.
  - **Physical Disconnection**: When a controller disconnects, its player entry is removed; if it was the last player, the character remains standing in place unassigned.
- **Interactive Arena Players & Controllers Panel (`src/ui/PlayersPanel.ts`)**:
  - Accessible via top-bar toggle button (`#toggle-players-btn` / `👥 Players (N)`), in-game HUD chip (`#btn-quick-players`), or hotkey (`P`).
  - Lists every active character with their player number, device name ("Keyboard & Mouse", "Xbox Wireless Controller"), and assigned theme color swatch.
  - Provides a dedicated **`✕ Remove` button** next to each player's name to remove that player from the arena on demand.
  - Inactive/Available section lists available join options (`+ Add` button and join key prompts).
- **Player-Colored Dotted Sightlines to Cursors**:
  - For every active player, a dotted guide line (`setLineDash([4, 4])`) in that player's assigned color connects directly from the character center to their aim cursor.
  - Each cursor reticle displays the player's color and floating "P1", "P2" badge, eliminating any ambiguity about which reticle belongs to which player across the arena.
- **Curated Player Color Palette**:
  - Player 1: Amber Gold (`#f59e0b`)
  - Player 2: Cyan (`#06b6d4`)
  - Player 3: Emerald (`#10b981`)
  - Player 4: Violet (`#a855f7`)
  - Player 5: Rose (`#f43f5e`)
  - Player 6: Blue (`#3b82f6`)
- **Universal Player Character Selection & Independent Customization**:
  - All player characters (Player 1, Player 2, Player 3, etc.) are fully selectable, hoverable, inspectable, and editable on both the canvas and in the inspector panel.
  - **Canvas Picking (`InputManager.ts`)**: `findEntityAt` dynamically queries `getAllCharacters()`, allowing left-click dragging in Edit Mode and right-click inspection in Play & Edit Modes for any player character.
  - **Entity Selector Dropdown (`DevPanel.ts`)**: Lists every active character by name and mass (`⭐ Player 1 (1.2kg)`, `⭐ Player 2 (1.2kg)`). Auto-refreshes when players join or leave.
  - **Polymorphic Ability Slider Binding**: Selecting any `Character` activates character abilities (Walking, Strength, Pickup, Throw, Climbing). Sliders inspect and directly mutate the selected character's modules without affecting other characters.
  - **Safe Selection Fallback**: Removing a player character safely updates dropdown options and falls back to the primary character if the removed character was currently selected.

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
12. **Straight Trajectory Dots Broken into Ground & Wall-Height Sections (Hover & Both Modes)**:
    - In addition to the elevated 3D parabolic arc, the straight dotted guide line along the throw path is broken into parallel sections based on projectile altitude:
      - **Below Wall Height ($z < \text{wallHeight}$)**: Rendered on the ground track ($(x, y)$) as opaque white dots (`rgba(255, 255, 255, 0.95)`).
      - **At or Above Wall Height ($z \ge \text{wallHeight}$)**: Moved vertically upwards on screen to wall height ($(x, y - \text{wallHeight} \times \text{visualAltitudeScale})$) as transparent white dots (`rgba(255, 255, 255, 0.38)`).
      - For an arched throw over wall height, this renders as 3 parallel straight dotted sections (2 aligned ground segments at start and end, with the mid-air segment elevated and parallel between them).
    - No tether or connector lines are drawn between the character and held objects.
13. **Shadow Fills Covered Below Entities & Collider Outlines Render On Top of Everything**:
    - **Shadow Fills**: Only the dark shadow fills are covered by walls and entities. Ground shadow fills render on the floor grid below wall bases and ground entities; wall-top shadow fills (masked to wall squares) render on wall roofs before elevated entities are drawn.
    - **Collider Position Outlines Render On Top of Everything**: The dashed outline of the actual collider position (`drawObjectColliderPositionOutline`) renders **ON TOP OF EVERYTHING** (after walls, ground entities, and elevated entities).
    - **Top-Most Relevant Outline Rule**: Exactly one outline is drawn for an elevated object — if an object is above a wall ($z \ge \text{wallHeight} - 0.05$ over wall geometry), only the outline around the shadow on the top of the wall is drawn (ground footprint outline under the wall is omitted). If over open ground, the ground outline is drawn.
    - **Vertical Altitude Connector Lines**: Renders for every object with effective elevation $> 0$ (computing `Math.max(position.z, supportingSurfaceHeight, standingWall ? wallHeight : 0)` so it is never logically hidden when resting on walls). Rendered **OVER** the character and objects using high-contrast white dashes (`[4, 4]`) with a dark drop shadow, connecting directly from the object's center down to its real 2D position on the ground/wall surface.
14. **Held Objects & Bigger-Without-Hover Wall Transparency**:
    - Objects held by a character render with semi-transparency (`globalAlpha = 0.55`) and are sorted to render ON TOP OF the holding character at all times, ensuring the player can clearly see their character and facing orientation through the carried object.
    - Entities on walls render semi-transparent (`globalAlpha = 0.55`) when they get bigger and are not hovering over a shadow (`useBigger && (!useHover || hoverScale <= 0) && isOnLayer2`), ensuring players can see what is underneath them on the wall/floor. When hovering over a shadow in Hover mode, they render opaque.
15. **Virtual Infinite Layer Collision System & Layer 2 Collision Indicators**:
    - Objects only collide with each other if they occupy the exact same vertical layer: $\text{layer} = \lfloor \text{effectiveHeight} / \text{wallHeight} \rfloor + 1$.
    - **Layer 1** ($0 \le z < \text{wallHeight}$): Ground layer — this is the **only** layer that has physical walls.
    - **Layer 2** ($\text{wallHeight} \le z < 2 \times \text{wallHeight}$): Wall-top elevation layer.
    - **Layer 3, 4, ...**: Infinite higher elevation layers. Projectiles and high-flying entities pass completely through entities on other layers without collision unless they are on the exact same layer.
    - **Layer 2 Collision Visuals**:
      - **Vertical Altitude Line Notches & Zone**: The vertical line marks the Layer 2 floor ($z = \text{wallHeight}$) and Layer 2 ceiling ($z = 2 \times \text{wallHeight}$) with distinct horizontal brackets and transition dots, tinting the Layer 2 collision zone in cyan (`#38bdf8`).
      - **Layer 2 Ceiling Footprint Outline**: When an airborne object is in Layer 3 or higher ($z \ge 2 \times \text{wallHeight}$), a dashed cyan footprint outline renders at the Layer 2 ceiling height ($(y - 2 \times \text{wallHeight} \times \text{hoverScale}) \times \text{ppu}$ in Hover mode, or $2\times$ reference ring in Bigger Sprites mode), visually showing the exact threshold the object must drop below to enter and collide with Layer 2.
16. **Multiplayer Ghost Interpolation (Lerp)**:
    - In `#multiplayer-relay-hud`, players can toggle ghost clone position smoothing on/off (`#relay-toggle-lerp-btn`) and adjust the float speed field (`#relay-lerp-rate-input` in `% / s`, persisted in `localStorage` under `pcg_ghost_lerp` and `pcg_ghost_lerp_rate`).
    - Interpolation advances each render frame via `relayClient.updateGhostLerp(dt)`: moves each ghost entity (character and freebody objects) along the delta vector $(\mathbf{P}_{\text{target}} - \mathbf{P}_{\text{current}})$ by $\min(1.0, (\text{rate} / 100) \times dt)$ of the delta distance per second. When disabled, raw network snapshot coordinates render directly.
17. **True 3D Pickup Range & Delta Magnitude Calculation**:
    - Replaced the legacy 2D distance and cross-layer multiplier ratio with true 3D Euclidean distance math.
    - An object is in grab reach if and only if the delta magnitude of their 3D positions $\sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2} \le \text{pickupReach}$, using the exact physical coordinates of the character and target object (accounting for surface elevation when standing on wall tops).
    - Forces the character to be within a single pickup range across all vertical altitudes: airborne objects high overhead ($z \gg 0$) or objects far below can no longer be grabbed by flat 2D proximity. DevPanel pickup slider governs the single 3D sphere reach.
18. **Dynamic Object Behavior Modules & Add Behavior Menu**:
    - Replaced the static, monolithic inspector cards in `DevPanel.ts` with a fully dynamic module management system:
      - **Only Attached Behaviors Render**: An entity only displays module cards for behaviors that are actively attached (`collider`, `mass`, `friction`, `bounce`, `verticalPosition`, `gravity`, `roll`, plus creature abilities `walking`, `strength`, `pickup`, `throw`, `climbing`).
      - **Individual Module Removal**: Every active module card features a dedicated `✕ Remove` button at top-right. Clicking it immediately detaches the module from the entity (setting the module property to `null` and resetting relevant dynamic fields like velocity, elevation, or grip), removing the card from the UI.
      - **Bottom `➕ Add Behavior` Button**: Placed cleanly at the bottom of the behaviors list. Shows a dynamic count of unattached behaviors. Clicking it toggles a styled dropdown listing only behaviors not yet attached.
      - **Instant Re-Addition**: Selecting any behavior from the dropdown instantiates that module on the entity, immediately re-renders its card with live tuning sliders, and removes it from the dropdown. Fully synchronized with entity selection, duplication, and deletion.
19. **Held Object Wall Clamping & Throw Clearance**:
    - **Exact Quadratic Ray-Wall Distance Solver**:
      - Replaced discrete binary search and negative pull-back with an exact quadratic ray-obstacle distance solver in `Character.calculateHeldObjectPosition(arena)`.
      - Solves the ray-plane intersections for the 4 expanded wall edges ($x_1 - R, x_2 + R, y_1 - R, y_2 + R$) and the exact quadratic equation $t^2 + 2(\vec{v} \cdot \vec{w})t + (\|\vec{w}\|^2 - R^2) = 0$ for the 4 rounded corner circles of each wall.
      - Finds the exact earliest positive contact distance along the facing direction ray ($d_{\text{hit}}$) without iterative guessing.
      - Pulls the held object back along the ray to $\max(0, d_{\text{hit}} - \text{extraThrowClearback})$, strictly enforcing $d \ge 0$ so the object is **never** pulled behind the player's back or flipped violently from side to side in tight corridors.
      - Provides clean clearance for throws so the projectile has horizontal distance to gain vertical altitude before reaching the wall face.
    - **Dense Trajectory Clearance Sampling**:
      - In `ThrowModule.computeLaunchVelocity`, dense sampling near the start of the throw trajectory ($s \in [0.005, 0.1]$) ensures that walls immediately in front of the thrower are detected and the parabolic arc is granted sufficient upward launch velocity ($v_z$) to cleanly clear the wall top without colliding on release.
20. **Gamepad Hold-to-Grab (RT & B)**:
    - **RT (Right Trigger)**: Previously only grabbed on the initial press edge. Now, if RT is held while empty-handed and no object is in range, `rtHeld = true` is set and `pickupAndSwap` is re-called every physics tick while RT remains held. The moment an object enters the aim cursor's pickup radius, it is grabbed automatically. `rtHeld` clears when the grab succeeds or RT is released.
    - **B Button**: Same hold-to-grab behavior via `bHeld` flag. Retries `pickupAndSwap` every tick while B is held and the character is empty-handed. Drops/swaps (fresh press only) when already holding an object.
    - The release-lock (`rtGrabbed`) still applies: after grabbing via RT, the trigger must be released before RT can throw — preventing accidental immediate throws.
21. **Continuous Climbing & Dismounting Without Releasing Climb Control**:
    - Removed the artificial restrictions that forced players to release the climb button (Space / Gamepad A) before dismounting or before climbing again.
    - **Inward Mounting Nudge**: Upon reaching wall top ($z \ge \text{wallHeight}$), the character is nudged inward onto the wall platform by $\min(r \times 0.5, 0.18\text{u})$ so they firmly plant on the wall rather than teetering on the exterior edge.
    - **Movement Requirement Before Dismount (`hasMovedOntoWall`)**:
      - Prevents the character from instantly dropping back into freefall the moment they hit the wall top.
      - Tracks movement after mounting (`mountStartX, mountStartY`). Dismounting past the guardrail or into gaps is gated by `canDismount = !climbMod || climbMod.hasMovedOntoWall`.
      - Requires the character to move onto the wall platform (traveling $\ge 0.20\text{u}$ inward or having character center inside the wall footprint) before a dismount off an edge can occur.
      - Once on the wall, walking off any edge cleanly dismounts while holding climb.
    - **Instant Mid-Air Climbing from Current Height**:
      - Players do **not** have to wait until hitting the ground to climb again.
      - At any vertical elevation ($z < \text{wallHeight}$), the second the character contacts any wall they are moving towards (`targetDot > 0.01` and `shortestDist <= r + contactTolerance`) while holding the climb button, they immediately latch on and resume climbing upward from their current altitude.
      - Removed mid-air re-grab lockouts (`climbSuppressedUntilRelease`), enabling seamless wall-to-wall traversing, mid-air ledge catches, and continuous dismount/re-climb loops.
22. **Universal Multi-Player Grab Highlights & Themed Targeting Rings**:
    - In `Renderer.ts`, `drawFreebodyObject` and `drawCharacter` evaluate pickup reach across `allCharacters` (`charactersInReach = allCharacters.filter(...)`), eliminating the previous restriction where only Player 1 (`characters[0]`) triggered object highlights.
    - **Player-Colored Grab Badges & Highlights**: When any player targets a reachable object (via virtual aim stick or mouse cursor), the object renders an outer highlight border and solid glowing ring matching that targeting player's theme color (e.g. Amber Gold `#f59e0b` for P1, Cyan `#06b6d4` for P2).
    - **Multiplayer Badge Context**: If multiple players are present in the arena, the badge displays `P1 GRAB`, `P2 GRAB`, etc., making it clear which player has lock on the object. In single player, it displays `GRAB`.
    - **Gamepad Pickup Target Expansion**: In `InputManager.pollGamepadSlots`, grabbable candidate lists incorporate other characters (`[...allCharacters.filter(c => c !== char), ...objects]`), ensuring gamepad players can interact with and pick up all eligible entities.
23. **Simulation Pause & Graceful Zero-Player State**:
    - **Automatic Simulation Pause**: When all players depart the arena (`isPaused = players.size === 0`), `GameLoop.tick` pauses physics integration and clears the fixed timestep accumulator. Freebody objects remain frozen in place rather than rolling or falling unchecked.
    - **Continuous Input Polling for Rejoin**: Gamepad polling (`pollGamepadSlots`) and keyboard Spacebar listeners remain active while paused so pressing `Space` or Controller `(A)` immediately spawns a character back into the arena.
    - **Zero-Backlog Unpausing**: Spawning any player (`spawnKeyboardPlayer` or `spawnGamepadPlayer`) resets `lastTime = performance.now()` and `accumulator = 0`, resuming smooth 60Hz physics without time-skip spikes.
    - **Glassmorphic Paused Overlay & HUD Sync**: `Renderer` draws a center paused card (`⏸️ SIMULATION PAUSED`) with rejoin prompts; the header badge updates to `⏸️ PAUSED`.
    - **Defensive DevPanel & Selection Fallbacks**: `DevPanel` selection falls back cleanly to remaining objects or an empty state rather than referencing removed character instances, guarding all sliders, creator spawning, and inspector displays against null reference crashes.
24. **Vertical Connector Line Anchors to First Surface Beneath Entity**:
    - In `Renderer.ts` (`drawVerticalConnectorLine`), the vertical connector line dynamically identifies the physical surface directly beneath the entity's $(x, y)$ coordinates:
      - **Above Open Ground**: If no wall exists directly beneath the entity's footprint (`arena.getSupportingWall(...) === null`), the line anchors all the way down to `groundY` (ground level), even when the entity is high in the air above wall elevation ($z \ge \text{wallHeight}$). It renders the Layer 1 segment in white, the threshold notch at `layer2BaseY`, and the Layer 2 segment in cyan.
      - **On or Directly Above a Wall**: If an actual wall exists directly beneath the entity and elevation is at or above wall height ($z \ge \text{wallHeight} - 0.05$), the line anchors to the wall top (`layer2BaseY`) and draws upward to `renderY`. Entities resting on the wall top have zero-length line (suppressed).
25. **Player Name Tags Render Above Everything in Final Pass**:
    - Player name tags ("P1", "P2", "Press Space / A") are rendered in a dedicated final render pass (`drawCharacterNameTag`) in `Renderer.ts` after walls, 2.5D wall tops, entities, and trajectory lines are drawn, ensuring name tags are never occluded by wall tops.
26. **Disabled Blue Outline for Above Layer 2 Threshold**:
    - In `Renderer.ts` (`drawObjectColliderPositionOutline`), disabled the cyan/blue dashed outline (`rgba(56, 189, 248)`) that was previously rendered for objects elevated above the Layer 2 ceiling ($z \ge 2 \times \text{wallHeight}$).
27. **JumpModule Addition & 1.5-Unit Apex Height Calibration (Space / Gamepad A)**:
    - Added `JumpModule.ts` defining modular vertical jumping mechanics with `jumpStrength` (impulse in $\text{N}\cdot\text{s}$) and `maxInitialSpeed` (maximum takeoff velocity cap).
    - **Default Calibration**: Configured with `jumpStrength = 11.6` and `maxInitialSpeed = 15.0`. Under standard arena gravity ($g = 30.0$) and default character mass ($1.2\text{kg}$), discrete 60Hz Euler integration yields an apex height of exactly **$1.50\text{ units}$** ($1.498\text{u}$), allowing creatures to clear 1.5 wall-height layers unencumbered.
    - **Encumbered Physics Scaling**: Vertical takeoff velocity scales with combined load ($v_z = \min(\text{maxInitialSpeed}, \text{jumpStrength} / (m_{\text{char}} + m_{\text{held}}))$), reducing jump height realistically when holding rocks, crates, or other creatures.
    - **Input Binding**: Initiated on non-repeat `Spacebar` (keyboard) and button 0 / `A` button (gamepad), while preserving initial device claiming / join triggers when unassigned.
28. **WallEdgeAssistModule Decoupling & Optional ClimbingModule Detachment**:
    - Separated wall platform edge guardrails and clamp states (`preventWalkOff`, `hangDistance`, `isAssistClampArmed`, `hasMovedOntoWall`, mount tracking) out of `ClimbingModule` into an independent `WallEdgeAssistModule.ts`.
    - **Removed Climbing from Default Character**: Default player characters spawn with `climbingModule = null`, giving them jump and edge guardrail capabilities by default without vertical wall adhesion.
    - **Decoupled Ledge Protection**: Characters walking on wall tops retain ledge protection (`preventWalkOff = true`) even without climbing abilities attached.
    - **Optional Addable Behavior**: `ClimbingModule` remains fully supported as an opt-in creature ability; players can re-attach climbing at any time via the DevPanel "➕ Add Behavior" dropdown.
29. **Directional Jump Impulse When Walking Against Obstacles & Wall Assist**:
    - When walking against a wall obstacle or against the wall edge assist clamp, horizontal velocity is zeroed by the collision/clamp system, which previously resulted in purely vertical jumps with zero horizontal displacement ("no motion").
    - In `JumpModule.jump`, when a player jumps while holding a directional movement input (`movementInput` from keyboard WASD or gamepad analog stick), the character is granted one physics step of velocity ($v_{\text{step}} = a_{\text{walk}} \cdot dt \approx 0.486\text{ u/s}$, scaling up to $0.729\text{ u/s}$ when sprinting and scaling with carried mass) in the held direction if current velocity along that direction is lower.
    - Jumping on wall platforms automatically disarms `wallEdgeAssistModule.isAssistClampArmed` and requires `isRestingOnSurface` for `wasStandingOnWallTop`, allowing creatures to cleanly leap off wall ledges and over obstacles without mid-air clamp interference.

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
