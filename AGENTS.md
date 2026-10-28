# AGENTS.md — Shared Agent Memory & Architecture Router

> **Notice to All AI Agents**:  
> You **MUST** read this document at the start of every session before doing research, planning, or editing code.  
> **Anti-Loop Policy**: Execute directly on Step 1 or Step 2. Never get stuck in analysis loops (no multi-file reads, no redundant searches, no speculation).  
> **No-Journal Policy**: Do NOT log task updates, bug fixes, or routine changelogs here. This file is strictly for architecture, rules, and protected file tiers. Keep edits minimal.  
> **No-LaTeX Policy**: Antigravity does **NOT** parse LaTeX math syntax (`$...$` or `$$...$$`). Never use LaTeX math blocks or dollar-sign equations in responses or docs. Use clean code backticks (e.g. `k = 2`, `v_z`), plain text, or standard unicode symbols (`ω`, `θ`, `Δ`, `²`, `×`, `√`).  
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
> 3. `src/engine/RollModule.ts` — 3D angular velocity, roll resistance, orientation quaternion, and toggleable bumpy-roll surface roughness (seeded, carved inward from the collider).
> 4. `src/engine/GravityModule.ts` — Vertical gravity acceleration (`g`) and airborne physics.
> 5. `src/engine/VerticalPositionModule.ts` — Pseudo-3D altitude coordinate (`z`), velocity (`v_z`), and flight height.
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
  - `Behavior-Driven Power`: Abilities directly dictate their own maximum power capacity via dedicated `DynamicProperty` sockets (`sprintPowerCapacityProp`, `walkPowerCapacityProp`, `climbPowerCapacityProp`, `maxPowerProp` for laser, `throwPowerCapacityProp`, `jumpPowerCapacityProp`).
  - `EnergyBus`: Exists strictly for stamina limits and exhaustion state; does NOT dictate max power capacity.
  - `Stamina Reservoir`: Energy reservoir measured in Joules (default 5,000 J). Drains directly by `ΔStamina = P × dt J`. Recovers when resting (0W physical exertion) at `staminaRegenRate` (default 500 W = 500 J/s).
  - `Energy Pool`: 10,000 J default food calorie reservoir (does not passively regenerate). Instant bursts (jump/throw) deduct mechanical work (`E / 0.25` muscle efficiency) directly in Joules from both stamina and the pool.
  - `Exhaustion Gatekeeping`: Exhausted bus strictly denies all power/burst requests (`canAfford`, `requestInstantBurst`, `requestPower`) until stamina recovers past 20% threshold.
- **Consumable & Prefab Systems**: Held items transfer energy/health with cube-root volumetric shrinking; `PrefabManager` & `SceneSpawnerManager` manage archetypes and periodic world spawns.
- **HUD & Status Displays**: Dual-column gauges (Health/Modifiers on left, Energy/Stamina on right) with lowercase `/s` rates and signed ability tags.
- **Multiplayer Replication**: Authoritative 60Hz server world (`UniversalRoomManager.ts`, `ServerGameSimulation.ts`) with client prediction, soft reconciliation, and private energy telemetry.
- **Input & Device Assignment**: First active device (gamepad or keyboard/touch) claims `baseCharacter`; hot-swappable controller detection.
- **Throwing & Trajectory System**: Ballistic trajectory solver with visual altitude offset (`Y_phys = Y_screen + Z × scale`), ground footprint clearance tests, and elevated wall landing resolution.

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
6. **No-LaTeX Policy**: Antigravity UI does NOT parse LaTeX math formatting (`$...$` or `$$...$$`). Always use code backticks (e.g. `k = 2`, `v_z`), plain text, or standard unicode characters (`ω`, `θ`, `Δ`, `×`, `²`, `√`).

---

## 4. 1-File Edit Routing Table (Subsystem Isolation Map)

> **CRITICAL ISOLATION RULE**:  
> Host containers (`src/character/Character.ts` and `src/ui/DevPanel.ts`) are thin orchestrators. To prevent cross-subsystem regressions, **DO NOT** inline ability math, energy demand formulas, or module inspector bindings into `Character.ts` or `DevPanel.ts`. Always inspect and edit the single isolated slice below:

### A. Character Gameplay Capabilities (`src/character/capabilities/`)
| Subsystem / Mechanic | Primary Isolated File to Edit | Underlying Module |
| :--- | :--- | :--- |
| **Walking & Sprinting** (metabolic demand, exhaustion cancel, locomotion tick) | `src/character/capabilities/LocomotionCapability.ts` | `WalkingModule.ts` (Tier 2) |
| **Wall Climbing** (isometric hold watts, vertical ascent watts, climb tick) | `src/character/capabilities/ClimbingCapability.ts` | `ClimbingModule.ts` (Tier 2) |
| **Jumping & Dismount Hop** (jump burst energy, rationing, takeoff scaling) | `src/character/capabilities/JumpCapability.ts` | `JumpModule.ts` (Tier 1) |
| **Throwing & Held Object Clearance** (throw HUD preview, trajectory, wall clearance) | `src/character/capabilities/ThrowCapability.ts` | `ThrowModule.ts` (Tier 2) |
| **Laser Beam** (laser HUD anticipated modifier, aiming/firing tick actuation) | `src/character/capabilities/LaserCapability.ts` | `src/character/LaserModule.ts` |
| **Melee Punch** (directional punch execution, cooldowns, tick actuation) | `src/character/capabilities/MeleeCapability.ts` | `src/character/MeleeModule.ts` |
| **Passive Health Regen** (metabolic heal wattage demand & HP recovery tick) | `src/character/capabilities/HealthRegenCapability.ts` | `src/character/HealthModule.ts` |
| **Eating / Consumables** (bite energy/HP transfer, volumetric shrinking) | `src/character/ConsumeModule.ts` | `src/engine/ConsumableModule.ts` |
| **Modal Action Priority** (`LASER` > `CONSUME` > `THROW` > `PICKUP` arbitration) | `src/input/ControlModeArbiter.ts` | `src/ui/InputManager.ts` |
| **3D Wall / Elevation Raycasting** (shared ray-wall intersection helpers) | `src/engine/physics/ElevationRaycaster.ts` | `Arena.ts` (Tier 1) |

### B. DevPanel & Inspector Slices (`src/ui/devpanel/`)
| UI / Inspector Feature | Primary Isolated File to Edit |
| :--- | :--- |
| **Entity Behavior Cards HTML & Add Catalog** | `src/ui/devpanel/EntityModuleCardsHtml.ts` |
| **Add / Remove / Toggle Entity Behavior Modules** | `src/ui/devpanel/EntityModuleLifecycle.ts` |
| **Physics & Core Module Controls** (Rigidbody, Collider, Mass, Friction, Bounce, Roll, Gravity) | `src/ui/devpanel/inspectors/PhysicsModulesInspector.ts` |
| **Locomotion Module Controls** (Walking, Sprint, Strength, Jump, WallEdgeAssist, Climbing) | `src/ui/devpanel/inspectors/LocomotionModulesInspector.ts` |
| **Interaction Module Controls** (Pickup, Throw, Consume, Consumable) | `src/ui/devpanel/inspectors/InteractionModulesInspector.ts` |
| **Health, Damage Aura & Damage Solver Controls** | `src/ui/devpanel/inspectors/HealthAndDamageInspector.ts` |
| **Laser Module Inspector Controls** | `src/ui/devpanel/inspectors/LaserInspector.ts` |
| **Melee Module Inspector Controls** | `src/ui/devpanel/inspectors/MeleeInspector.ts` |
| **Energy Pool & Stamina Inspector Controls** | `src/ui/devpanel/inspectors/EnergyPoolInspector.ts` |
| **Scene Prefabs Panel & Archetype Controls** | `src/ui/devpanel/PrefabsPanelSection.ts` |
| **Scene Spawners Panel & Live Telemetry** | `src/ui/devpanel/SpawnersPanelSection.ts` |
| **Property Path Resolution & Player Delta Builder** | `src/ui/devpanel/PlayerDeltaBuilder.ts` |
| **Config Persistence, Auto-Save & Git Sync** | `src/ui/devpanel/DevConfigPersistence.ts` |
