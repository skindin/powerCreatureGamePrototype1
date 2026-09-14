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
- **Graphics & Rendering**: Vanilla HTML5 Canvas 2D (custom software renderer with pseudo-3D altitude scaling, ground footprint shadows, and wall-height indicator rings)
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
  - Ballistic parabolic trajectory calculation previews throw arcs, showing clearance over walls.
  - Carrying heavy objects scales throw speed and distance according to creature strength vs. object weight.
- **Roll Dynamics**:
  - Spherical freebodies support 3D angular velocity, roll resistance, and rotating directional roll indicators rendered on canvas.

### Multiplayer Telemetry & Ghost Clones (Phase 1.2 Foundation — Functional)
- **Top-Bar Mode Switcher**: Toggle between **👤 Single Player** and **🌐 Multiplayer (Relay Test)**.
- **3rd-Party Echo Relay (`RelayClient.ts`)**:
  - Connects to public WebSocket echo servers (`wss://echo.websocket.org`, `wss://ws.postman-echo.com/raw`).
  - Serializes character and freebody states at **30Hz** or **60Hz** with high-resolution timestamps.
  - Bounces packets across the public internet to measure true real-world Round-Trip Time (RTT).
- **Live Latency HUD**:
  - Displays connection state, real-time RTT (e.g. ~160ms across states), min/max/avg ping, packet counts, and preset switches.
- **Ghost Clones**:
  - Rendered as semi-transparent silhouettes (`alpha = 0.5`) with dashed neon borders and ping badges (`👻 ECHO (160ms)`).
  - Visually demonstrates real-world network delay as ghost objects follow physical objects with exact latency.

---

## 3. Key Architectural Decisions

1. **60Hz Fixed Timestep**:
   - Standardized on **60Hz** (`dt = 1 / 60`) for physics simulation across client and server.
2. **True Modularity & Opt-in Mechanics**:
   - If a creature or freebody does not have a module (e.g. no `StaminaModule`, no `ClimbingModule`, no `RollModule`), that system simply does not run for that entity. Never introduce hardcoded monolithic checks.
3. **Rocket League-Style Rollback Physics (Phase 1.2 Architecture)**:
   - **Continuous Swept Contact Rollback (TOI)**: Fast-moving colliders rewind to the exact point of tangent contact before applying impulse/restitution, eliminating penetration squish.
   - **Islands of Influence**: Resting/sleeping arena objects ($v \approx 0$) are excluded from resimulation. Only active players and the objects they currently touch, hold, or throw form an active island.
   - **Time Dilation Clock Sync**: The server adjusts client physics speed ($0.99\times$ to $1.01\times$) to maintain a stable ~2-frame input buffer without client hitching.
   - **Decoupled Visual Smoothing**: Physical coordinates snap immediately on rollback correction; renderer interpolates visual offsets across 3–5 frames so corrections are imperceptible.
4. **Desktop / Laptop Development Workflow**:
   - The primary code repository is hosted on GitHub: `https://github.com/skindin/powerCreatureGamePrototype1.git` on branch `branch1`.
   - Work is synced across desktop and laptop via Git commits and pulls.
5. **Dynamic UI Scaling & Aspect-Ratio Preservation**:
   - Canvas wrapper and viewport containers enforce `min-width: 0; min-height: 0;` so flexbox children scale down fluidly on laptop displays and high-DPI scaling (125%/150%).
   - `#game-canvas` uses `aspect-ratio: 20 / 14; object-fit: contain;` to guarantee the complete arena is visible with zero edge cropping across all window sizes.
   - DevPanel inspector sidebar is collapsible via header toggle button, close button, and hotkeys (`Backquote` or `KeyI`), auto-collapsing on compact screens (< 1180px) to maximize gameplay area.
6. **Resilient Local Launcher**:
   - `Launcher.cs` / `LaunchGame.exe` automatically searches for and injects `C:\Program Files\nodejs` into the process environment and verifies port 5173 health before opening the game window.

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
