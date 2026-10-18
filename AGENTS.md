# AGENTS.md — Shared Agent Memory & Architecture Router

> **Notice to All AI Agents**:  
> You **MUST** read this document at the start of every session before doing research, planning, or editing code.  
> **Anti-Loop Policy**: Execute directly on Step 1 or Step 2. Never get stuck in analysis loops (no multi-file reads, no redundant searches, no speculation).  
> Before wrapping up your task or concluding your turn, update this file to reflect current milestone status.  
> **Git Rule**: You **MUST** push to origin (`git push origin <branch>`) every single time you commit. Never leave commits unpushed.  

---

## 📚 Historical Milestone Archives

Detailed milestone retrospectives, past implementation notes, equations, and verification logs are archived in dedicated files so agents are not overwhelmed by historical context:

- **[COMPLETED_PHASES.md](file:///c:/Users/tealf/Documents/aiProjects/powerCreatureGamePrototype1/docs/history/COMPLETED_PHASES.md)**: Deep history for Phases 1 through 10 (physics engine, 3D altitude projection, collision detection, sweep CCD, rollback reconciliation, state history buffer, island manager, network protocol, authoritative server foundation, jitter buffer).
- **[COMPLETED_PHASES_11_AND_12.md](file:///c:/Users/tealf/Documents/aiProjects/powerCreatureGamePrototype1/docs/history/COMPLETED_PHASES_11_AND_12.md)**: Deep history for Phase 11 (Blender-style Dynamic Properties, Energy Busses, burst stamina equations, power rationing, dual health/energy screen HUDs) and Phase 12 (Consumables, Eating state machine, Scene Prefabs, Spawners, and Flattest Ballistic Throw trajectories).

---

## 🔒 Sealed & Protected Code Tiers (Agent Rules)

### Tier 1: 🔒 Sealed & Read-Only Files ("Complete" Modules)
> **CRITICAL AGENT CONSTRAINT**:  
> The following 12 files have been audited, fully verified, and deemed feature-complete.  
> Agents **MUST NOT** edit, rewrite, refactor, or delete these files unless you explicitly ask the USER for permission first and receive their direct approval.
> - **Avoid asking for permission for Tier 1 files unless truly necessary.** If you encounter an issue that legitimately requires editing a Tier 1 file, you **MUST ask for permission before touching it**. State: **"This is a Tier 1 (Sealed) file: [filename]"**, and concisely explain the reason in plain English.
>
> 1. `src/engine/FrictionModule.ts` — Ground friction & surface deceleration.
> 2. `src/engine/BounceModule.ts` — Restitution & velocity damping on collision bounces.
> 3. `src/engine/RollModule.ts` — 3D angular velocity, roll resistance, and roll angle orientation.
> 4. `src/engine/GravityModule.ts` — Vertical gravity acceleration ($g$) and airborne physics.
> 5. `src/engine/VerticalPositionModule.ts` — Pseudo-3D altitude coordinate ($z$), velocity ($v_z$), and flight height.
> 6. `src/engine/Arena.ts` — Grid-based arena tile mapping, physical wall heights, and tile queries.
> 7. `src/engine/ColliderModule.ts` — Physical collider radius, CCD sweep eligibility (`canSweep`), and dynamic threshold.
> 8. `src/engine/RigidbodyModule.ts` — Kinematic 2D linear velocity, mass property (`massProp`), vertical velocity, and collision policy (`discrete`/`continuous`/`dynamic`).
> 9. `src/character/JumpModule.ts` — Vertical jump impulse, landing buffers, and dismount hop calculations.
> 10. `src/character/WallEdgeAssistModule.ts` — Geometric math helper preventing creature sticking on corner wall vertices.
> 11. `src/engine/physics/StateHistoryBuffer.ts` — Zero-allocation circular ring buffer for historical physical snapshots.
> 12. `src/engine/physics/IslandManager.ts` — Connected graph discovery of dormant sleeping bodies and active physical islands.
>
> **Enforcement Mechanics**: Marked with OS read-only `attrib +r` and Git pre-commit hook `.githooks/pre-commit`.

### Tier 2: 🛡️ Protected Modules (Solid Foundation — Permission Required)
> **TIER 2 AGENT CONSTRAINT**:  
> The following modules represent solid core systems that are expected to grow with the game:
> - `src/character/WalkingModule.ts` (Ground locomotion, acceleration, sprint state)
> - `src/character/ClimbingModule.ts` (Wall mounting, vertical climbing, open-ground dismount)
> - `src/character/PickupModule.ts` (3D grab reach detection and item attachments)
> - `src/character/ThrowModule.ts` (Parabolic trajectory math, auto-lock target discovery, recoil momentum)
> - `src/engine/physics/Snapshot.ts` (Deterministic state serialization & restore)
> - `src/engine/physics/RemoteEntityInterpolator.ts` (Hermite/linear snapshot interpolation & jitter buffers)
> - `src/engine/physics/PredictionReconciliation.ts` (Historical rollback reconciliation & divergence checks)
>
> **Permission Protocol**:
> 1. Any agent noticing that a change is needed in a **Tier 2 file MUST ask the USER for permission before modifying it**.
> 2. Do NOT use messy workarounds to avoid editing a Tier 2 file if a clean modification is the proper architectural solution.
> 3. State: **"This is a Tier 2 (Protected) file: [filename]"** and state the reason in plain English.

---

## 1. Project Overview & Quick Reference

- **Core Concept**: Top-down 2D action arena and sandbox: creatures run, jump, climb walls of physical height, and pick up / throw dynamic freebodies.
- **Tech Stack**: TypeScript 5.7+, Node.js (v18+), Vite 6.x (`npm run dev`, `npm run build`), HTML5 Canvas 2D (custom software renderer with pseudo-3D altitude projection), WebSocket server (`UniversalRoomManager.ts` on `/ws`).
- **Domain Modules**:
  - `src/character/`: Character entity and capability modules (Walking, Climbing, Pickup, Throw, Jump, Consume).
  - `src/engine/`: Game loop, arena grid, freebody objects, player manager, and rendering.
  - `src/engine/physics/`: Deterministic collision resolver, snapshots, history ring buffer, islands.
  - `src/network/`: WebSocket room client, session manager, and relay simulator.
  - `src/server/`: Authoritative 60Hz physics world simulation, jitter buffer, contested grab arbiter.
  - `src/ui/`: DevPanel inspector, HUD, and InputManager.
- **Git & Remote Tracking**:
  - Remote: `https://github.com/skindin/powerCreatureGamePrototype1.git`
  - Active Branch: `feat/dynamic-property-references` (MANDATORY: always push to `origin feat/dynamic-property-references`).

---

## 2. Current Architecture Summary

- **Dynamic Property Sockets**: Sockets support literal numbers or named object-scoped reference strings (`DynamicProperty`).
- **Energy & Stamina Model**:
  - `EnergyBus`: Channels power to abilities (`WalkingModule`, `ClimbingModule`, `Character.jump`, `PickupModule`, `ThrowModule`, `HealthModule`). Default capacity $500\text{ W}$.
  - Burst Stamina: Exertion duration at max power (default 10.0s). Drains proportional to active wattage: $\text{drain} = \frac{P}{P_{\text{max}}} \cdot dt$. Recovers at rest (0W) by default at 1.0 s/s.
  - Energy Pool: 10,000 J default reservoir. Instant bursts (jump/throw) deduct mechanical work ($E / 0.25$ muscle efficiency).
- **Consumable & Prefab Systems**:
  - `ConsumableModule`: Held items provide energy/health transfer with cube-root volumetric shrinking.
  - `PrefabManager` & `SceneSpawnerManager`: In-memory archetypes and background periodic ground item spawners.
- **HUD & Status Displays**:
  - Dual-column status gauges: Left for Health & Modifiers (HP bar, damage aura/shocks, bio-regen), Right for Energy & Modifiers (Energy/Stamina bars, active power draws).
  - Clean ability tags with signed values and lowercase `/s` rates (e.g. `Sprint -152/s`, `Heal +10/s`).
- **Multiplayer Replication**:
  - Authoritative 60Hz server simulation (`UniversalRoomManager.ts`, `ServerGameSimulation.ts`) with client-side prediction, soft threshold reconciliation, and private energy telemetry.
  - **Surface Impact & Bouncing Synchronization**: In-flight prediction and `originalThrower` ownership are cleared immediately upon surface impact (`position.z <= surfaceHeight` in `MotionIntegrator.ts` and `sObj.isGrounded` in `GameLoop.ts`), enabling Smart Smooth Convergence (25-30% blend) to synchronize bouncing and rolling with the server without airborne prediction fighting.
  - **Synchronized Ballistic Launch Telemetry**: `ThrowModule` uses a unified `computeLaunchVelocity` solver across preview and throw execution. Explicit launch vectors (`launchVx`, `launchVy`, `launchVz`) and departure origins (`launchStartX`, `launchStartY`, `launchStartZ`) are captured in `PlayerInputPacket` and `ReliableActionCommand`, guaranteeing that the authoritative server and replicating clients execute the exact launch parameters without divergence.
  - **Deterministic Collision & Push Absorption**: `CollisionResolver` enforces deterministic normals for near-coincident contacts (no `Math.random()`), and `OnlineSessionManager` blends external server displacements (`dist > 0.06`), faithfully restoring smooth rock-hit and push reactions.

---

## 3. Agent Workflow Rules — STRICT ANTI-ANALYSIS-LOOP POLICY

> ### 🛑 ABSOLUTE BAN ON ANALYSIS LOOPS
> **Agents get stuck in passive analysis loops when they over-investigate instead of acting.**
> You **MUST NOT**:
> - Run iterative grep / search passes across the codebase trying to find "all occurrences" before touching code.
> - Chain consecutive `view_file` calls across multiple files before taking any write action. (Maximum **1 target file read** before executing your edit).
> - Re-read the same file multiple times with different line offsets without editing it.
> - Generate unsolicited exploratory scratch scripts, test runners, or benchmarking scripts before solving the core request.
> - Write long essays or multi-paragraph speculative analysis explaining what you *could* do.
> 
> **THE 2-STEP EXECUTION RULE**:
> - **Step 1**: Identify and inspect ONLY the single primary file that must change.
> - **Step 2**: Apply the edit immediately using `replace_file_content` or `write_to_file`.
> If runtime feedback or build errors occur, fix them directly at the site of the error. Stop analyzing and execute immediately.

1. **Direct Solve (Zero Exploratory Loops)**: Jump directly to the target file and apply the modification on Step 1 or Step 2. Do NOT run multi-turn grep searches, read multiple files sequentially, or create scratch test scripts unless explicitly requested. Stop analyzing and execute immediately.
2. **Read First**: Read this `AGENTS.md` before starting. Consult `docs/history/` only when deep past context is specifically needed.
3. **Push on Commit**: Push to origin (`git push origin <branch>`) every single time you commit.
4. **No Autonomous Browser Testing**: Do NOT run tests in a browser or invoke the browser subagent autonomously.
5. **Targeted Subsystem Edits**: Work strictly within the subsystem requested without scanning unrelated directories.

