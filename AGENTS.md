# AGENTS.md — Shared Agent Memory & Architecture Router

> **Notice to All AI Agents**:  
> You **MUST** read this document at the start of every session before doing research, planning, or editing code.  
> Before wrapping up your task or concluding your turn, update this file to reflect current milestone status.  
> **Git Rule**: You **MUST** push to origin (`git push origin <branch>`) every single time you commit. Never leave commits unpushed.  
> **Historical Archive**: Completed phases (Phases 1.1 through 10.6) are archived in [COMPLETED_PHASES.md](file:///c:/Users/tealf/Documents/aiProjects/powerCreatureGamePrototype1/docs/history/COMPLETED_PHASES.md).

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
  - `src/character/`: Character entity and capability modules (Walking, Climbing, Pickup, Throw, Jump).
  - `src/engine/`: Game loop, arena grid, freebody objects, player manager, and rendering.
  - `src/engine/physics/`: Deterministic collision resolver, snapshots, history ring buffer, islands.
  - `src/network/`: WebSocket room client, session manager, and relay simulator.
  - `src/server/`: Authoritative 60Hz physics world simulation, jitter buffer, contested grab arbiter.
  - `src/ui/`: DevPanel inspector, HUD, and InputManager.

---

## 2. Active Milestone: Phase 11 (Dynamic Properties & Energy Busses Architecture)

- **Phase 11.1 (Blender-Style Dynamic Property Sockets)**:
  - `DynamicProperty`: Sockets with dual modes: `literalValue` or `isReference` linking to a named property string.
  - `ObjectPropertiesRegistry`: Object-scoped dictionary of named referenceable properties with locally unique names.
  - **Limbo State**: Deleting a reference property leaves sockets in an explicit warning/limbo state with expedited "+ Recreate" or "Unlink" quick-fixes.
  - **Rename Propagation**: Renaming an object property string dynamically cascades to all sockets pointing to that name on the entity.
  - **Scrub Draggable Fields**: Click-and-drag horizontal scrubber with rate proportional to initial magnitude, replacing hardcoded `<input type="range">` sliders.
  - **DevPanel Integration**: `PropertyControl` mounted for `MassModule` and `StrengthModule`.
  - Design document: [CHARACTER_PROPERTIES_AND_ENERGY_BUSSES.md](file:///c:/Users/tealf/Documents/aiProjects/powerCreatureGamePrototype1/docs/design/CHARACTER_PROPERTIES_AND_ENERGY_BUSSES.md).
- **Phase 11.2 (Health, Damage Aura & Collision Damage Solver Foundation)**:
  - `HealthModule`: `baseMaxHp`, `maxHpProp`, `currentHpProp`, `baseMaxHealRate`, `maxHealRateProp`, `consumesEnergy` toggle, and placeholder death/respawn loop.
  - `DamageAuraModule`: Radiates continuous damage within 3D spherical radius (`damageRadiusProp`, `damageRateProp`) to any entity with a `HealthModule`.
  - `DamageSolverModule`: Articulated defensive/armor layer converting absorbed blunt impact shock from wall/obstacle and entity collisions into HP damage scaled by impact susceptibility and global collision damage scale.
  - **Hazard Orb**: Pre-spawned hazard orb (`#ef4444`, 2.5u radius, 20 HP/s) with `DamageAuraModule` in `main.ts` for instant testability.
  - **Dynamic Overhead Health Bar**: Overhead HP bar drawn above characters and objects only when wounded (`currentHp < maxHp`).
  - **Ability Energy Toggles**: `consumesEnergy` flags and DevPanel warnings added to Walking, Pickup, Throw, Jump, and Climbing abilities.
  - Roadmap document: [health_energy_consumables_roadmap.md](file:///C:/Users/tealf/.gemini/antigravity-ide/brain/9a7a90af-a0fb-448e-bbeb-0fa9a4c2bb40/health_energy_consumables_roadmap.md).
- **Phase 11.3 (CharacterModule & Explicit Entity Role Architecture)**:
  - `CharacterModule`: First-class modular entity role classifier (`local_player`, `local_ai`, `remote_player`, `remote_ai`, `dummy`).
  - **Dummy Distinction**: Inert physical entity with health/combat modules; excluded from server player number/color chronological allocation (real players are assigned P1, P2...).
  - **Local Client Trust**: Dummies are simulated locally without waiting for server input or suffering remote interpolation lag, and are excluded from `remoteOverrides`.
  - **Renderer GUI**: Preserves grab prompts and trajectory line for all local players, resolving previous dummy selection overshadowing.
  - **DevPanel Integration**: Added Character Module card with interactive role selector and behavior toggle/removal.

---

## 3. Active Milestone: Phase 10 (Online Multiplayer Architecture)

- **Phase 10.7 (Dedicated Spawn & Random Overlap Separation)**:
  - Universal spawn coordinate: `(4.8, 7.0, 0)`.
  - Overlap separation: If entities spawn directly on top of each other ($dist \le 0.0001$), push apart in a random angle $\theta \in [0, 2\pi)$.
  - Top-left persistent ping indicator (`#persistent-ping-hud`) visible in all multiplayer modes.
- **Phase 10.8 (Submissive Spawning & Uncapped Velocity)**:
  - Spawn immunity resistance removed (`spawnImmunityTicks` eliminated).
  - Client local character is 100% submissive on initial join: snaps immediately to server-dictated `spawnPos`, zeroing velocity and clearing interpolator history.
  - Jitter buffer consumes packets immediately without artificial queue priming delays.
- **Phase 10.9 (Zero Initial Position Leak & Spawn Gating)**:
  - Local clients never transmit position coordinates (`charTelemetry`, `objTelemetry`) until the client has received authoritative `onPlayerRegistered` with `spawnPos` and snapped to it (`spawnAlignedPlayerIds`).
  - Client `join_room` and `add_player` requests never propose coordinates; server is sole spawn authority.

---

## 3. Agent Workflow Rules

1. **Strict Action-First Cap**: Maximum 2 file reads (`view_file`) or search calls per prompt before making edits or taking action. Never repeatedly view the same file or re-read already known code. Stop analyzing and execute immediately.
2. **Read First**: Read this `AGENTS.md` before starting. Deep historical notes live in `docs/history/COMPLETED_PHASES.md`.
3. **Push on Commit**: Push to origin (`git push origin <branch>`) every single time you commit.
4. **No Autonomous Browser Testing**: Do NOT run tests in a browser or invoke the browser subagent autonomously. Use headless test scripts (`npx tsx scratch/test_*.ts`) for verification.
5. **Targeted Subsystem Edits**: Work strictly within the subsystem requested (`src/network`, `src/ui`, `src/character`, etc.) without scanning unrelated directories.
