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
- **Phase 11.4 (Energy Bus Ability Connections & DevPanel Accordion Collapsibles)**:
  - `EnergyBus Connection`: Added `energyBusId` connection sockets to `WalkingModule` (walk & sprint), `PickupModule`, `ThrowModule`, `JumpModule` (via `Character.jumpEnergyBusId`), `ClimbingModule`, and `HealthModule` (healing). Each module renders a dropdown below its energy toggle to bind to any character energy bus (defaulting to `"bus_main"`).
  - `Character.energyBusses`: Characters maintain a registry `Map<string, EnergyBus>` and `getEnergyBus(busId)` resolver.
  - `Collapsible Sections & Behaviors`: Interactive accordion collapse (`▶` / `▼`) enabled across the entire DevPanel: Live Diagnostics, Physics & Collisions, History Buffer & Rollback Replay, Selected Physical Behaviors section, every individual attached behavior card, Add New Object creator section, every individual behavior card within the New Object creator, and World Physics & Environment.
- **Phase 11.5 (Active Energy & Stamina Consumption Across Abilities)**:
  - **Removed Stale UI Warnings**: Completely purged obsolete "Energy Busses not implemented yet" warnings from DevPanel cards.
  - **Live Power Deduction & Proportional Scaling**: Wired `bus.requestPower(...)` logic into `WalkingModule` (75W walk, 350W sprint), `Character.jump` (1200W impulse), `PickupModule` (400W–500W lift), `ThrowModule` (600W–800W throw), `ClimbingModule` (80W hold, 260W vertical climb), and `HealthModule` (50W per HP/s passive regeneration). When pool energy or stamina cannot satisfy 100% of the requested power, abilities run at the maximum possible partial power fraction until fully depleted.
  - **Live Telemetry & Status Bars**: Added dynamic frame-by-frame UI updates for Burst Stamina (`current / max (pct%)`) and Energy Reservoir (`current / max J (pct%)`), plus a dedicated `Current Wattage Used (W)` DynamicProperty socket and live power readout field on the Energy Bus card.
  - **Exhaustion & Depletion Disabling**: Depleting the pool or draining stamina completely halts walking propulsion, cancels jumps, prevents throws and pickups, stops passive regeneration, and causes characters clinging to walls to slip. Sprint speed (not just force) drops to walk speed when sprint power is unavailable.
  - **Physics-Based Costs**: Burst actions (jump, throw, pickup) are charged once via `EnergyBus.requestEnergy(joules, minDt, ...)` using mechanical work (½mv² for jump/throw, m·g·h for lift) ÷ 25% muscle efficiency, charged as if unresisted. Jump only charges at the grounded takeoff moment (never while airborne/held key). Climbing draws isometric hold (m·g) + ascent (m·g·v) power.
- **Phase 11.6 (Pure Seconds Stamina Model & Wattage Depletion Equation)**:
  - **Stamina Definition**: Stamina represents duration in seconds of continuous exertion at `maxPower`. Default `baseMaxStamina = 10.0` seconds.
  - **Depletion Equation**: Depletion rate is strictly `current wattage / max wattage per second`. Over `dt`, `staminaDrain = (currentWatts / maxPower) * dt`.
  - **Duration Scaling**: Drawing at 100% max wattage drains at 1.0 s/s (10s stamina lasts 10s); drawing at 50% max wattage drains at 0.5 s/s and lasts twice as long (10s stamina lasts 20s); drawing at 0W drains 0s.
  - **Stamina Regeneration**: When not drawing power (0W), stamina recovers at `staminaRegenRate` seconds/second of rest (default 1.0 s/s).
  - **Multi-Request Accumulation**: `EnergyBus.requestPower` cleanly accumulates power draws across concurrent abilities in each tick and publishes total wattage to `currentWattageProp`.
  - **DevPanel Telemetry & Controls**: Updated DevPanel stamina meter to display seconds (`10.0s / 10.0s (100%)`), with 1.0s capacity scrubber steps and 0.2 s/s regen rate scrubber steps.
  - **Automated Verification**: Verified 100% via `scratch/test_stamina_drain_equation.ts` and `scratch/test_energy_consumption.ts`.
- **Phase 11.7 (Default Collapsed Inspector Accordions & Ability Energy Presets)**:
  - **Default Collapsed Inspector**: All collapsible accordion headers in the DevPanel inspector (Diagnostics, Physics, History Buffer, Selected Physical Behaviors, attached behavior cards, New Object Creator modules, World Physics) are now collapsed by default via `expandedSections` set.
  - **Ability Energy Defaults**: Configured default energy consumption across abilities on `Character`:
    - Walking: `walkConsumesEnergy = false`
    - Sprinting: `sprintConsumesEnergy = true`, `sprintEnergyBusId = "bus_main"`
    - Jumping: `jumpConsumesEnergy = true`, `jumpEnergyBusId = "bus_main"`
    - Throwing: `consumesEnergy = true`, `energyBusId = "bus_main"`
    - Picking Up: `consumesEnergy = false`, `energyBusId = "bus_main"`
    - Climbing: `consumesEnergy = true`, `energyBusId = "bus_main"`
    - Health / Healing: `consumesEnergy = true`, `energyBusId = "bus_main"`
  - **DevPanel Add Behavior Parity**: Newly attached abilities via DevPanel follow these exact energy defaults and bus connections.
  - **Automated Verification**: Verified 100% via `scratch/test_ability_energy_defaults.ts`.
- **Phase 11.8 (Locomotion Power Physics Correction)**:
  - **Replaced Transient Acceleration with Steady-State Locomotion Work**: In `WalkingModule.ts` (Tier 2, user permission granted), replaced the erroneous rocket launch formula (`8 * m * v^2 = 624 W`) with standard steady-state biomechanical metabolic transport power: `P_metabolic = (totalMass * g * Cr * v) / 0.25`.
  - **Sprinting & Walking Power Realism**: Sprinting at 8.06 u/s costs **151.8 W** (using running resistance `Cr = 0.40`), and walking at 5.20 u/s costs **68.6 W** (using walking resistance `Cr = 0.28`).
  - **Speed Choke Eliminated**: Because 151.8 W is well below the bus's 250 W limit, 100% of requested power is granted, allowing full 8.06 u/s sprint speed without any speed degradation.
  - **Automated Verification**: Verified 100% via `scratch/test_locomotion_wattage.ts`.


---

- **Phase 11.9 (Forward-Facing Efficiency Sockets & Cloud Run Proxy Fix)**:
  - **DevPanel Forward-Facing Sockets**: Added "Healing Efficiency (HP/Joule)" (hpPerJouleProp) to HealthModule card and "Muscle Metabolic Efficiency (Ratio)" (muscleEfficiencyProp) to EnergyBus card.
  - **Environment Variables Cleanup**: Removed GITHUB_TOKEN and ENABLE_TUNNEL from .env.example so AI Studio Build stops prompting the user for tokens.
  - **Cloud Run Proxy & Tunnel Middleware Fix**: Narrowed isTunnel in vite.config.ts to only match loca.lt domains (preventing Cloud Run HTTPS reverse proxy headers from triggering tunnel redirects or serving stale bundles).
  - **CSS Delivery Restored**: Eliminated the 302 redirect on /src/style.css, restoring full CSS styling and default accordion collapsing.
  - **PWA Service Worker Scoping**: Restricted service worker registration to explicit loca.lt domains, ensuring Cloud Run preview iframes always fetch live un-cached source files.
- **Phase 11.10 (Multi-Ability Proportional Power Rationing & Resting Stamina Recovery)**:
  - **Proportional Power Rationing Formula**: When multiple abilities concurrently demand power exceeding `maxPower` (250 W), each ability receives its exact proportional share: `P_granted = (P_demanded / P_total_demanded) * maxPower`. Total power draw is strictly capped at `maxPower` (250 W), preventing excess power draw (e.g., 401.8 W previously drawn when sprinting and healing simultaneously).
  - **Physical Exertion vs Metabolic Healing Separation**: Muscular burst stamina is only depleted by physical movement/actions (`WalkingModule`, `ClimbingModule`, jumps, throws, lifts). Passive cellular bio-healing (`HealthModule`) draws power through the bus against `maxPower` and consumes Joules from `EnergyPool`, but does not drain muscular burst stamina or prevent resting stamina recovery.
  - **Resting Stamina Recovery**: When physically resting (stationary on the ground), stamina smoothly regenerates at `staminaRegenRate` (1.0 s/s) all the way to 100% (10.0s) capacity without freezing at 2.0s or oscillating while wounded.
  - **Airborne Jump Holding Energy Fix**: In `Character.jump`, verified physical grounding (`isGrounded`) before charging metabolic jump impulse energy, eliminating phantom energy drains while airborne with Space held. Reordered hold-to-jump buffer before `bus.update(dt)`.
  - **Automated Verification**: Verified 100% across `test_concurrent_rationing_and_stamina.ts`, `test_locomotion_wattage.ts`, `test_stamina_drain_equation.ts`, `test_energy_consumption.ts`, and `test_health_and_damage_aura.ts`.
- **Phase 11.11 (Sprint Energy Floor & Automatic Detoggle Architecture)**:
  - **Graceful Sprint Deceleration**: When bus power is partially granted or rationed, sprint speed decelerates smoothly between `maxSprintSpeed` (8.06 u/s) and base walk speed (5.20 u/s) proportional to granted wattage.
  - **Base Speed Power Threshold Check (`peekPower`)**: In `EnergyBus.peekPower`, safely checks available power without deducting energy or draining stamina. If available power cannot exceed the metabolic power needed to run faster than base walk speed ($P_{\text{granted}} \le P_{\text{base}}$), sprint automatically detoggles (`character.setSprinting(false)`).
  - **Detoggle to Free Walk**: Detoggled movement continues seamlessly at full base walk speed (5.20 u/s) drawing 0W with zero stamina drain (when `walkConsumesEnergy` is false). Players never stall, halt, or crawl slower than base walk speed due to sprint energy limits.
  - **Input Synchronization**: Attached `onSprintChange` listeners in `PlayerManager` and `main.ts` so detoggling disarms keyboard (`isKeyboardSprintActive`) and gamepad (`slot.sprintArmed`) sprint states.
  - **Automated Verification**: Verified 100% via `scratch/test_sprint_detoggle_and_floor.ts`, alongside the full regression suite.
- **Phase 11.12 (Default Watt Capacity Update to 500 Watts)**:
  - **Default Bus Power Capacity**: Updated default `baseMaxPower` in `EnergyBus` from 250.0 W to 500.0 W. Characters can now concurrently sprint (~152 W) and heal at full rate (250 W) with headroom, drawing up to 500 W total before rationing occurs.
  - **Automated Verification**: Verified 100% via regression suite (`test_concurrent_rationing_and_stamina.ts`, `test_locomotion_wattage.ts`, `test_sprint_detoggle_and_floor.ts`).
- **Phase 11.13 (Unified Stamina Depletion Across All Power Draws & Live Stamina Field)**:
  - **Unified Stamina Depletion**: Removed the health regen exemption (`abilityId !== "health_regen"`) in `EnergyBus.requestPower`. All power drawn from the energy bus (including health regeneration at 250 W) now strictly drains burst stamina according to the universal equation `staminaDrain = (grantedWatts / maxPower) * dt` (e.g. 250 W on a 500 W bus drains stamina at 0.5 s/s).
  - **Resting Stamina Recovery**: When power draw drops to 0 W (e.g. character heals back to full health or rests), stamina smoothly recovers at `staminaRegenRate` (1.0 s/s).
  - **DevPanel Live Current Stamina Socket**: Mounted a live `PropertyControl` socket for `currentStaminaProp` ("Current Stamina Left (Seconds)") directly underneath "Burst Stamina Capacity (Seconds)" in the DevPanel Energy Bus card, updating continuously in real time.
  - **Automated Verification**: Verified 100% via `scratch/test_healing_stamina_drain.ts` and the full regression test suite.

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
