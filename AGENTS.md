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
- **Git & Remote Tracking**:
  - Remote: `https://github.com/skindin/powerCreatureGamePrototype1.git`
  - Active Branch: `dynamic-property-references` (MANDATORY: always push to `origin dynamic-property-references`).

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
- **Phase 11.14 (Background Physics/Health Simulation & HP Regen Wattage Equation)**:
  - **Background Character Simulation**: Updated `PlayerManager.ts` to ensure registered player characters without input packets (e.g. keyboard suspended on window blur/background tab) continuously update physics, gravity, settling, health logic, and death/respawn with neutral inputs (`{ x: 0, y: 0 }`). Input listening remains appropriately suspended, but characters in damage auras now smoothly perish and respawn immediately to one of the 4 clearings without waiting for the window to regain focus.
  - **HP Regen Wattage Equation Clarification**: Confirmed that the 250 W draw during passive bio-regeneration is strictly derived from the mechanical formula $P = \frac{\text{healRate}}{\text{hpPerJoule}} = \frac{10.0\text{ HP/s}}{0.04\text{ HP/J}} = 250.0\text{ W}$, not a hardcoded ceiling. With the bus max power now at 500 W, higher heal rates or custom efficiencies scale dynamically without clamping.
  - **Automated Verification**: Verified 100% via `scratch/test_background_respawn.ts` alongside full regression suite.
- **Phase 11.15 (Default Energy Capacity Update to 10,000 Joules)**:
  - **Default Energy Pool Capacity**: Updated default `baseMaxEnergy` in `EnergyPool` from 1,000.0 J to 10,000.0 J. Newly spawned characters, freshly initialized pools, and reset energy reserves now start with a full 10,000 Joules energy reservoir.
  - **Automated Verification**: Verified 100% across the full regression test suite (`test_energy_consumption.ts`, `test_healing_stamina_drain.ts`, `test_background_respawn.ts`, etc.).
- **Phase 11.16 (Allow Partial Power & Two-Tier Priority Precedent Architecture)**:
  - **Two-Tier Priority Allocation**: In `EnergyBus`, full-power demands (`allowPartialPower = false`) take absolute precedence over partial-power demands (`allowPartialPower = true`), evaluated in FIFO order. If a full-power ability (e.g. Climb or Jump) is initiated while partial-power abilities (Sprint, Heal) are running, the full-power ability claims 100% of its needed wattage, while partial-power abilities yield headroom and scale down proportionally to share whatever capacity remains. If bus capacity or headroom cannot satisfy 100% of a full-power ability, it receives 0 W and refuses to run.
  - **Ability Toggles & Presets**: Added `Allow Partial Power` boolean toggles conditionally rendered under each `Consumes Energy` toggle in the DevPanel inspector across Walking (default false), Sprinting (default true), Jump (default false), Climbing (default false), Pickup (default false), and Health/Healing (default true). Excluded from Throwing.
  - **Automated Verification**: Verified 100% via `scratch/test_allow_partial_power.ts` alongside the full project regression test suite.
- **Phase 11.17 (Contention-Preserved Sprint Architecture & Continuous Mid-Air Sprinting)**:
  - **Contention vs True Exhaustion Distinction**: Separated temporary power starvation from genuine stamina/energy exhaustion. In `EnergyBus`, added `canSupportPowerInIsolation(demandedWatts, minThreshold, dt, pool, registry)` to verify if sprinting would be supported if no competing abilities were running.
  - **No Untoggle During Contention**: When competing abilities (e.g. Jump takeoff impulse, Climb, or Health bio-regen) consume bus capacity below the sprint threshold, sprint is NOT untoggled (`character.setSprinting(false)` is not called). The character temporarily falls back to base walk speed drawing 0 W sprint power, keeping sprint armed in the background.
  - **Proportional Resumption**: As soon as competing abilities leave enough headroom to beat base walk speed ($> 98\text{ W}$), sprint immediately resumes at the exact achievable speed corresponding to available wattage ($5.20\text{ u/s} \to 8.06\text{ u/s}$), only reaching full speed when 100% of sprint power is available.
  - **Continuous Mid-Air Sprinting**: Jump only charges metabolic impulse energy at the takeoff frame ($t = 0$). Mid-flight ($t > 0$), Jump is no longer consuming power, leaving the bus headroom open. When `walkInAir` is enabled, sprint does not wait until landing—it accelerates the character mid-air immediately as power allows.
  - **True Exhaustion Untoggle**: When burst stamina reaches $0.0\text{s}$ or the energy pool is genuinely empty ("either way"), sprint cleanly untoggles, requiring the player to recover and re-toggle sprint.
  - **Automated Verification**: Verified 100% via `scratch/test_sprint_midair_and_contention.ts` alongside the full regression test suite (`test_allow_partial_power.ts`, `test_concurrent_rationing_and_stamina.ts`, `test_locomotion_wattage.ts`, `test_stamina_drain_equation.ts`, `test_energy_consumption.ts`).
- **Phase 11.18 (Two-Tier Coordinated Power Cap & Energy Cap Screen HUD & Asymmetric Power Decay)**:
  - **Screen-Space HUD Widget (`EnergyHud`)**: Mounted in `.canvas-wrapper` at the bottom of the arena viewport, featuring a clean two-tier stacked layout with zero text pill clutter.
  - **Upper Track (Power Bar - Width of Power Cap = 500 W)**:
    - Track width strictly represents the **Power Cap** ($500\text{ W}$), sized at $22\text{px}$ height (`.energy-hud-track-power`).
    - Glowing electric cyan live power draw bar (`#bar-hud-live-power`) showing active draw ($0\text{ W} \to 500\text{ W}$) with a clean border edge—white needle/dot completely removed.
    - **Asymmetric Power Draw Smoothing**: Instantly snaps to higher values (instant attack) so momentary spikes like jumping ($500\text{ W}$) are immediately visible at their peak, then smoothly and quickly interpolates downwards ($\sim 350\text{ms}$ decay window, $\lambda = 9.5$) to make burst energy expenditure vivid and readable.
    - **Multi-Tick Spike Retention (`recentPeakWattage`)**: In `EnergyBus`, tracks burst peak wattage across multi-tick accumulator frames so fixed timestep catchups never overwrite burst power draws with $0\text{ W}$ before the render frame reads them.
    - Ability ticks proportionally placed on the power cap scale (Sprint $152\text{/s}$ at $30.4\%$, Jump $224$ at $44.8\%$, Climb $235\text{/s}$ at $47.0\%$, Heal $250\text{/s}$ at $50.0\%$, Throw $116$ at $23.2\%$).
    - **Power Cap Marker**: Sits at the $100\%$ right edge of the top bar labeled `Power Cap 500/s`.
    - **Hide Non-Consuming Abilities**: Completely hides Walk and any ability where `consumesEnergy` is false.
    - **Anti-Collision Staggering**: Dynamic alternation between top and bottom tiers, plus automatic `tier-2` vertical elevation when two neighboring badges on the same side are within $9\%$ width of each other.
  - **Lower Track (Energy & Stamina Scale - Width of Energy Cap = 10,000 J)**:
    - Full track width represents the **Energy Cap** ($10,000\text{ J}$), explicitly showing the un-filled gap between current and max energy.
    - **Current Energy Fill**: Amber/gold fill showing remaining pool energy ($0 \to 10,000\text{ J}$).
    - **Current Stamina Fill**: Translucent emerald green fill showing current stamina in Joules ($E = \text{stamina} \times P_{\text{max}}$, up to $5,000\text{ J} = 50\%$).
    - **Lower Track Live Power Bar**: Synchronized cyan power meter using the identical asymmetric instant attack and fast decay, scaled against the Energy Cap ($0 \to 500\text{ W} = 0\% \to 5\%$) so players directly see power draw relative to the Power Cap tick mark.
    - **Power Cap Tick Mark**: Positioned at $500\text{ J}$ ($5\%$) labeled `Power Cap (500/s)`.
    - **Stamina Cap Tick Mark**: Positioned at $5,000\text{ J}$ ($50\%$) labeled `Stamina Cap (5,000 J)`.
    - **Energy Cap Indicator**: Sits at $100\%$ ($10,000\text{ J}$) labeled `Energy Cap (10,000 J)`.
  - **First Jump Input Fix**: Automatically claims and activates the keyboard player on boot and executes jumps on the first Space keypress without swallowing the initial input.
  - **Automated Verification**: Verified 100% via `scratch/test_live_power_bar_tracks.ts`, `scratch/test_energy_hud_scale_and_ticks.ts`, and `scratch/test_power_usage_asymmetric_decay.ts` alongside full project regression test suite.
- **Phase 11.19 (Dedicated Instant Burst Architecture & Coordinated Power Peak Visualization)**:
  - **Dedicated Instant Burst API (`requestInstantBurst`)**: Created a specialized API in `EnergyBus` for instantaneous work actions (jump, throw, pickup) rather than treating impulse work as continuous power.
  - **Burst Capacity Limit**: Instant actions are strictly bounded by available burst capacity: $\text{burst energy} \le \text{currentStamina} \times \text{maxPower}$. If `allowPartialPower = true`, executes with the maximum affordable work fraction; if false, prevents execution when stamina is insufficient.
  - **Proportional Power Peaks**: Replaced artificial clamping to the 500 W ceiling with an intuitive visual power peak equation: $P_{\text{peak}} = \min(\text{maxPower}, P_{\text{baseline}} + P_{\text{burst}})$. A 224 J jump performed from a standstill honestly peaks at 224 W (matching the `Jump 224` tick on the upper track), while a jump during a 152 W sprint peaks at $152 + 224 = 376\text{ W}$.
  - **Non-Destructive Peak Reading**: Removed the destructive `recentPeakWattage = 0` read inside `getCurrentWattage()`, replacing it with a timed hold window (`recentPeakHoldTimer`) that naturally resets to continuous live wattage after 0.08s. Both `DevPanel` and `EnergyHud` now read the identical peak reliably without erasing each other's state.
  - **First-Press Jump & Unsuspend Synchronization**: In `InputManager.ts` and `PlayerManager.ts`, pressing Space immediately unsuspends the keyboard if paused and targets `primaryCharacter` even if unindexed, ensuring the power bar flashes instantly on the very first jump.
  - **White Dot Removed with Intact Cyan Fill**: Maintained the clean solid cyan gradient bar without needle or dot on both tracks with instant attack and smooth quick decay ($\lambda = 9.5$).
  - **Automated Verification**: Verified 100% via `scratch/test_instant_burst_architecture.ts` alongside the full project regression test suite.
- **Phase 11.20 (Color-Coded Power Blocks, Precedence Tags & Clean Game UI)**:
  - **Upper Power Bar Color-Coded Blocks**: Removed all static tick marks, tick lines, and badges from the top bar. Replaced with dynamic color-coded blocks representing each active consuming ability (Sprint in Amber `#f59e0b`, Heal in Green `#22c55e`, Climb in Purple `#a855f7`, Jump in Pink `#ec4899`, Walk in Sky Blue `#38bdf8`, Pickup in Yellow `#eab308`, Throw in Rose `#f43f5e`).
  - **Clean Ability Tags with `/s` Rate Suffix**: Time-based continuous abilities display `/s` directly after the energy rate (e.g. `Sprint 152/s`, `Heal 250/s`, `Climb 260/s`, `Walk 69/s`), while instant burst actions display the energy work without `/s` (e.g. `Jump 224`). Removed all fraction percentages, units like "Watts", and debug text.
  - **Transparent Game-Ready HUD**: Removed the card background, borders, and backdrop-filter covering the viewport. The HUD now floats seamlessly over the gameplay with sleek, dark translucent glass bars.
  - **Clean Unified Bottom Bar**: Both bars share identical width. Visualizes Current Energy (gold fill), Current Stamina (emerald fill), Stamina Cap (notch), and Energy Cap (notch) on the same scale, with power cap and cyan meter completely removed.
- **Phase 11.21 (Left-to-Right Chronological Stacking, Smooth Block Interpolation & Minimalist Game HUD)**:
  - **Left-to-Right Activation Stacking**: In `EnergyBus`, active allocations and bursts are ordered by activation sequence (`order`). When sprinting starts first and a jump follows, Sprint remains anchored on the left and Jump smoothly expands to its right. Reverse order (jump first, then sprint) places Jump on the left and Sprint on the right.
  - **Smooth Interpolation to/from 0**: In `EnergyHud`, visual blocks track interpolated wattage (`currentWatts`). Upon activation, blocks expand smoothly from 0 width ($\alpha = 18.0$); upon deactivation/expiration, blocks smoothly contract back to 0 ($\lambda = 14.0$) before being pruned, with ability tags smoothly fading in and out alongside their blocks.
  - **Purged 1P Header & Minimize Button**: Removed the player card header badge (`1P • Player 1`) and the minimize button completely, letting the HUD bars float cleanly with zero UI obstruction.
  - **Removed Yellow End Line**: Completely eliminated the yellow glowing energy cap line from the right edge of the bottom bar, leaving only the emerald stamina cap notch when stamina capacity is below maximum energy.
  - **Automated Verification**: Verified 100% via `scratch/test_left_to_right_stacking.ts`, `scratch/test_energy_hud_color_blocks.ts`, and full regression test suite.
- **Phase 11.22 (Decoupled Tag Energy Readouts from Visual Bar Animation)**:
  - **Stable Ability Readouts**: Decoupled the displayed number/rate in ability tags from the visual block width interpolation. Active tags display their genuine steady or allocated rate (`stableWatts`, e.g. `Sprint 152/s`, `Jump 224`), eliminating numeric counting up (`0 -> 152/s`) or down (`152/s -> 0`) as blocks smoothly animate.
  - **Clean Entry/Exit Transitions**: Visual bar blocks continue to smoothly grow from 0 and decay back to 0 to provide clean visual continuity, while tag text stays fixed at the true ability consumption rate with smooth opacity fading.
  - **Automated Verification**: Verified 100% via `scratch/test_energy_hud_color_blocks.ts` alongside the full project regression test suite.
- **Phase 11.23 (Ability Naming Parity: Sprint, Walk, Jump, Heal)**:
  - **Single-Word Ability Names**: Updated `ABILITY_METADATA` labels to `"Sprint"` and `"Walk"` to match the clean single-word naming style of `"Jump"` and `"Heal"`, dynamically resolving generic `"locomotion"` calls according to `bus.activeLocomotionId` set by `Character.ts`.
  - **Enforced Lowercase `/s`**: Removed `text-transform: uppercase` from `.hud-power-tag` and added `text-transform: lowercase` to `.hud-tag-rate` so the `/s` time suffix strictly remains lowercase across all ability tags.
  - **Automated Verification**: Verified 100% via `scratch/test_hud_ability_readjustment.ts`.
- **Phase 11.24 (Exhaustion Recovery Red Tick Mark & Clean Gauge Styling)**:
  - **Exhaustion Recovery Threshold Indicator**: Added a red tick mark (`#tick-hud-exhaustion-recovery`) on the lower reservoir track that becomes visible only when the character is exhausted (`isExhausted === true`).
  - **Overlay Visibility Fix**: Removed the `.hidden` class from the tick markup to prevent `.hidden { display: none !important; }` from suppressing the element when `display: block` was set in script.
  - **Clean Slender Styling**: Designed as a clean $1.5\text{px}$ notch flush inside the energy track (`top: 0; height: 100%`) without extending outside the bar or displaying protruding arrows, with `z-index: 20` and a subtle red glow (`#ef4444`).
  - **Dynamic Positioning**: Positions precisely at $\frac{\text{maxStamina} \times \text{recoveryThresholdRatio} \times \text{maxPower}}{\text{energyCap}} \times 100\%$ (defaulting to 10.0% of the bar, corresponding to $2.0\text{s} \times 500\text{ W} = 1,000\text{ J}$ on a $10,000\text{ J}$ bar). As stamina recovers and reaches the red tick, exhaustion immediately clears and the tick cleanly hides.
  - **Automated Verification**: Verified 100% via `scratch/test_hud_ability_readjustment.ts`.
- **Phase 11.26 (Dual Health & Energy Screen HUD Gauges Architecture)**:
  - **Side-by-Side Dual Gauges**: Re-architected the in-game screen HUD into two coordinated columns: Health System on the left, Energy & Power System squished into the right side (`.hud-columns-container` with 1fr 1fr grid and 16px gap).
  - **Upper Health Modifiers Track**:
    - Upper track displays active health modifiers with color-coded blocks and tags above it, perfectly mirroring the Power bar layout on the right.
    - **Continuous Damage Over Time (DOT)**: Damage Aura (e.g. `Aura 20/s` in `#ef4444`) smoothly expands when entering aura radius and contracts to 0 when leaving.
    - **Instant Damage Bursts**: Blunt collision shocks and attack impacts (e.g. `Impact 15` in `#f87171`) trigger a 0.55s burst block and tag without `/s`.
    - **Continuous Healing Over Time (HOT)**: Passive cellular bio-regeneration (e.g. `Heal 10/s` in `#22c55e`) displays while wounded and smoothly clears when reaching full health.
    - **Instant Healing**: Potion/pickup heals (e.g. `Heal 10` in `#22c55e`) display as burst actions.
    - Dynamic capacity scale (`effectiveCap = Math.max(40, maxHp * 0.5, totalUnits)`) prevents block overflow.
- **Phase 11.27 (Inverted Main/Modifier Track Layout & Distinctive Heart & Lightning Symbols)**:
  - **Inverted Track Ordering**: Swapped bar positions in both columns while preserving mod list tags on top:
    - Health Column: Mod list tags on top, primary Health Bar (HP) as upper track (16px), Health Modifiers Bar as lower track (14px).
    - Energy Column: Mod list tags on top, primary Energy & Stamina Bar as upper track (16px), Power / Energy Modifiers Bar as lower track (14px).
  - **Distinctive Heart & Lightning Symbols**:
    - Upper HP Bar: Glowing solid red Heart (`❤` in `#ef4444`) in a dedicated 20px prefix wrapper.
    - Lower HP Mod Bar: Subtle red Heart modifier symbol (`❤±` in `#f87171`).
    - Upper Energy Bar: Glowing solid gold Lightning (`⚡` in `#fbbf24`) in a dedicated 20px prefix wrapper.
- **Phase 11.28 (Vertically Split Mod Bars & Signed Mod Tag Rates Architecture)**:
  - **Signed Mod Tag Values**: Added explicit `+` and `-` sign prefixes to all active modifier tags:
    - Positive healing: `Heal +10/s`, `Potion +20`.
    - Negative health damage: `Aura -20/s`, `Impact -15`, `Damage -10`.
    - Negative energy draws: `Sprint -152/s`, `Jump -224`, `Heal -250/s`, `Climb -260/s`, `Walk -69/s`.
  - **Vertically Split Mod Bars (Without Dividing Line)**:
    - Modifier tracks (18px) are vertically split into two seamless halves inside the dark glass container:
      - **Upper Lane (`top: 0; height: 50%`)**: Positive modifiers (healing gains on health; future energy generation/charging on energy).
      - **Lower Lane (`top: 50%; height: 50%`)**: Negative modifiers (damage aura and impact shock on health; sprint/jump/climb/heal draws on energy).
    - Blocks stack horizontally within their respective vertical lane from left to right, allowing concurrent visualization of opposing forces (e.g. green heal bar flowing on top while red damage bar flows on bottom).
  - **Automated Verification**: Verified 100% via `scratch/test_split_mod_bars.ts`, `scratch/test_health_modifiers_hud.ts`, `scratch/test_energy_hud_color_blocks.ts`, and full regression test suite.
- **Phase 11.29 (Thicker 1.5x Tracks, Dedicated Non-Overlapping Stamina Lane & View Menu UI Transparency Slider)**:
  - **1.5x Thicker Tracks & Expanded Container**:
    - Primary resource tracks (Health Bar on left, Energy & Stamina Bar on right) increased 1.5x in thickness from 16px to 24px (`height: 24px`).
    - Secondary modifier tracks (Health Modifiers Bar on left, Power Bar on right) adjusted to two-thirds thickness at 18px (`height: 18px`), keeping them sleek and visually subordinate to the 24px primary bars.
    - Status HUD container width expanded from 760px to 860px for greater horizontal length and readability.
  - **Dedicated Non-Overlapping Stamina Bar (1/3 Track Thickness)**:
    - Replaced the previous 100% height transparent overlay (`rgba(34, 197, 94, 0.45)`) with a dedicated top lane occupying exactly one-third of the 24px energy track thickness (`top: 0; height: 33.333%`, or 8px).
    - Energy reservoir occupies the remaining two-thirds of the track thickness (`top: 33.333%; height: 66.667%`, or 16px).
    - Stamina bar is a solid, vibrant emerald gradient (`linear-gradient(90deg, #15803d, #16a34a, #22c55e)`) with a crisp highlight border (`#86efac`), turning crimson when exhausted.
    - Energy reservoir is a solid amber/gold gradient (`linear-gradient(90deg, #b45309, #d97706, #fbbf24)`).
    - Stamina cap tick and exhaustion recovery tick notches are flush and contained strictly within the upper 1/3 stamina lane.
  - **HUD Opacity Slider in View Menu (HUD Scoped Only)**:
    - Added HUD Opacity slider (`#slide-hud-opacity`) in the View Settings menu (`#view-settings-panel`), ranging from 20% to 100% with a default of 70% opacity.
    - Dynamic live preview and persistent preference storage via `localStorage.getItem("pcg_hud_opacity")`.
    - Scoped transparency strictly and exclusively to the on-screen status screen HUD (`.energy-hud-container` containing health, energy, stamina, and power stat bars) via CSS variable `--hud-opacity: 0.70`.
- **Phase 12 (Food & Edible Mechanics, Contextual Primary Abilities, Universal Throw & Infinite Spawner Behavior)**:
  - **Food Item & Continuous Ingestion (`FoodModule`)**:
    - **Continuous Energy Transfer**: Holding food and holding Primary Action (Left Mouse Button / Gamepad `RT`) smoothly transfers energy into the character's energy bus pool at `eatRateJoulesPerSecProp` (default 100 J/s) with optional biological healing (`healRateHpPerSecProp`, default 0 HP/s).
    - **Volumetric Shrinking & Visual Scale Floor**: Food visually shrinks in real-time as its remaining Joules decrease: $r(t) = r_0 \times \left(\frac{E(t)}{E_0}\right)^{1/3}$. To prevent minuscule, unclickable or barely visible crumbs if the player stops eating and drops or throws the item, a scale floor ($25\%$ of original radius: $r_{\text{min}} = 0.25 \times r_0$) is enforced until the food is fully eaten.
    - **Depletion & Full Consumption**: When remaining energy hits $0\text{ J}$ ($E \le 0.001\text{ J}$), the food is completely consumed: the character releases its grip, the item is destroyed and removed from the world, and any associated modifiers cleanly clear.
    - **Zero Speed Penalty**: Characters maintain full movement agility, running and dodging at normal speed with zero speed penalty while eating.
  - **Contextual Primary Ability vs. Universal Throw**:
    - **Dedicated Universal Throw Control**: Pressing `KeyF` (or Gamepad `RB`) universally launches any held object with trajectory aiming, regardless of whether the object has a primary ability.
    - **Contextual Primary Action**: Pressing Left Mouse Button (or Gamepad `RT`) executes the held item's primary capability (e.g., eating food if held). If the held object has no primary ability (e.g., plain crate or rock), it naturally falls back to throwing for seamless backwards compatibility.
    - **Drop**: Pressing `KeyQ` drops the held item in place, retaining its current shrunken scale and remaining energy.
  - **Modular Infinite Spawner Behavior (`SpawnerModule`)**:
    - **Clone-on-Pickup**: When an object with `SpawnerModule` is picked up by a player, a clone is immediately instantiated at the original spawn coordinates with identical physical properties, visuals, and stats.
    - **Held Item Module Stripping**: The `SpawnerModule` is stripped from the held object upon pickup (`grabbedObj.removeModule(SpawnerModule)`), while the newly spawned clone retains the spawner so it can be picked up infinitely without cascading duplication while carried.
    - **Pre-Spawned Energy Apple Spawner**: Pre-spawned in the arena at `(4.8, 1.5, 0)` with apple red tint (`#ef4444`), $500\text{ J}$ total energy, $100\text{ J/s}$ eat rate, and $+5\text{ HP/s}$ healing.
  - **DevPanel Integration**:
    - Added dedicated inspector cards for `FoodModule` (Total Energy, Remaining Energy, Eat Rate, Heal Rate) and `SpawnerModule` (Enabled, Respawn Delay, Spawned Count).
    - Added `Food` and `Spawner` to the "Add Physical Behavior" dropdown for any selected entity or new object.
  - **Automated Verification**: Verified 100% via `scratch/test_food_and_spawner.ts` alongside full regression test suite.
- **Phase 12.2 (Consumable Module, Tag Registry, Character Consume Ability & Spawner World Array Fix)**:
  - **ConsumableModule ("Consumable")**: Renamed food behavior to `ConsumableModule`. Attached items carry a customizable `tag` (e.g., "food", "potion", "battery"), full property sockets, dynamic volumetric shrinking, and clean world disposal when energy reaches 0 J (`objects.splice(idx, 1)`).
  - **ConsumableTagRegistry**: Shared registry managing user-created tags with full CRUD control: create, list, inline rename (cascades to all items and characters), and inline delete (unlinks and clears references).
  - **Character ConsumeModule ("Consume")**: First-class modular ability on `Character` with an interactive multi-tag selector (`acceptedTags`). Characters only consume held items whose tags match their accepted list.
  - **SpawnerModule World Array Fix**: Passed the active `objects` array into `triggerClone(pickedEntity, arena, objects)` so cloned replicas are pushed directly into the physical world array upon pickup, while stripping `spawnerModule` from the held item.
  - **TagSelectorControl**: Blender-style UI control supporting single-tag dropdowns with inline search, rename (✎), delete (🗑), and creation (+ Add Tag) for Consumable items, and multi-tag chip lists with dropdown selection for the Character Consume ability.
  - **Automated Verification**: Verified 100% via `scratch/test_consumable_tags_and_spawner.ts` alongside full regression suite.
- **Phase 12.3 (Post-Eating Grab Suppression & Radial Pie Progress Gauge)**:
  - **Post-Eating Grab Suppression**: Implemented per-entity grab suppression state machine in `PlayerManager.ts`. When an item finishes being consumed (or is released/dropped/thrown) while the grab input (LMB, Key E, Gamepad RT/B) is depressed, auto-grab is strictly suppressed. Characters will only enter the auto-grab state if the player has started seeking something to grab *since* their hands became empty (i.e. released the mouse/trigger and pressed it anew while empty-handed).
  - **Circular Pie Consumption Gauge**: Implemented a rich radial pie/bar meter in `EntityPass.ts` rendered around held consumable items when being consumed or partially eaten:
    - **Background Plate & Track Ring**: Dark translucent backing disk (`rgba(15, 23, 42, 0.78)`) with slate ring track framing the item without obscuring it.
    - **Translucent Pie Wedge**: Dynamic filled pie slice from 12 o'clock clockwise proportional to the remaining consumable energy ratio.
    - **Perimeter Circular Bar**: High-visibility glowing emerald/lime arc (`#22c55e` / `#4ade80`, `lineWidth = 3.5`, rounded line caps) tracking remaining nutrition.
    - **Live Percentage Pill**: Floating dark badge above the pie showing live countdown (`100%` down to `0%`) while actively eating.
  - **Automated Verification**: Verified 100% via `scratch/test_grab_suppression_and_pie.ts` alongside full regression test suite and clean `npm run build`.
- **Phase 12.4 (Simplified Eating Status Ring & Post-Pickup Eat Suppression)**:
  - **Clean Circular Progress Ring (No Sprite Obscuration)**: Removed the dark backing disk plate, filled translucent pie slice, and overhead percentage pill badge from `EntityPass.ts`. Replaced with `EntityPass.drawConsumableEatingRing`:
    - Renders a subtle circular track ring (`rgba(15, 23, 42, 0.45)`, `lineWidth = 2.5`) and an emerald progress arc (`#22c55e`, `lineWidth = 2.5`, `lineCap = "round"`).
    - Positioned along the outer perimeter (`ringRadius = Math.max(renderRadius + stemExtra + 3, renderRadius + 5)`), completely outside the food sprite and stem/leaf geometry so the food artwork is never covered.
    - Preserves backwards-compatibility aliases `drawConsumablePieForeground` and `drawConsumablePieBackground`.
  - **Post-Pickup Eat Suppression (Release & Repress Required)**:
    - Added `useItemSuppressed` flag to `GrabSuppressionState` in `PlayerManager.ts`.
    - If the player is holding the primary feature button (Left Mouse Button or Gamepad `RT`) at the moment an item is picked up (e.g. from an auto-grab sweep or pickup hold), the character will NOT start eating immediately.
    - The character will only begin eating once the player has released the primary button and pressed it again while holding the item.
  - **Automated Verification**: Verified 100% via `scratch/test_grab_suppression_and_pie.ts` and clean `npm run build`.
- **Phase 12.5 (Stationary Spawner Architecture & Clone-to-Hand Dispensing)**:
  - **Spawner Stays Put**: When a character picks up from an entity with `SpawnerModule`, the spawner entity remains stationary at its world position with its `SpawnerModule` intact (`isHeld = false`, `heldBy = null`). It never moves into the character's hands and never disappears or appears at its original position.
  - **Clone Without Spawner into Hands**: An identical clone without the spawner behavior (`clone.spawnerModule = null`) is instantiated and placed directly into the character's hands (`pickupModule.pickup(char, clone)`).
  - **World Integration & Infinite Dispensing**: The clone is pushed to the active world `objects` array so it can be eaten, dropped, or thrown like any standard item. The stationary spawner increments `spawnCount` and can dispense subsequent clones repeatedly.
  - **Multiplayer & Arbiter Synchronization**: Supported across client (`PlayerManager.ts`), server simulation (`ServerGameSimulation.ts`), and contested grabs (`ContestedGrabArbiter.ts`).
- **Phase 12.6 (Scene Prefabs & Background Scene Spawners System)**:
  - **Disabled Default Character Energy Auto-Refill**: In `EnergyPool.ts`, changed `debugAutoRefillOnEmpty` default to `false`. Characters no longer auto-refill to 10,000 J when exhausted, making consumables and food gathering essential for survival.
  - **Scene Prefab Architecture (`Prefab` & `PrefabManager`)**:
    - In-memory archetype templates created in the scene (no disk file requirement).
    - Default "Apple" food prefab (`#ef4444`, 500 J, 100 W, `food` tag) initialized in `PrefabManager`.
    - Dedicated collapsible "📦 Scene Prefabs" accordion section in DevPanel with live instance count badge.
    - Editable archetype parameters: color, shape (box/circle), mass, collider radius, consumable tag, energy capacity, consume rate, and heal rate.
    - **Override & Propagation Model**: Live instances track modified properties via `entity.overriddenProperties`. Editing prefab parameters cascades to all non-overridden live instances in the scene. Overridden instances preserve their customized values and display an override count badge with a "↺ Revert" button.
    - "📦 Make Prefab" button on selected scene entities and "+ Add Prefab from Scene Object" modal.
    - "➕ Spawn" button to spawn an instance directly on the arena floor.
    - Deleting a prefab unlinks live instances (`entity.prefabId = null`) without destroying the objects in the world.
  - **Background Scene Spawner Architecture (`SceneSpawner` & `SceneSpawnerManager`)**:
    - Dedicated collapsible "🌱 Scene Spawners" accordion section in DevPanel.
    - Background simulation manager updating inside `GameLoop.updatePhysics(dt)` (not a physical entity in the world).
    - Default "Random Apple Spawner" (interval: 0.25 min / 15s, max items: 5).
    - Configurable fields: **Interval in minutes per item** (`intervalMinutes`, e.g. 0.25 min = 15s) and **Max amount of items in scene** (`maxCount`).
    - Periodic ground placement: randomly selects open floor tiles avoiding walls via `!arena.hasWall(x, y)`.
    - Automated pausing when active count reaches `maxCount`.
    - "⚡ Spawn Now" instant button and live telemetry readout ("Scene Count: X / Y" and "Next in: Z.Zs").
  - **Automated Verification**: Verified 100% via `scratch/test_prefabs_and_scene_spawners.ts` and clean `npm run build`.
- **Phase 12.7 (Apple Prefab Stats Parity & Post-Pickup Consumption Suppression)**:
  - **Apple Prefab Stats Parity**:
    - Removed hardcoded `"food-apple-spawner-1"` scene GameObject from `main.ts`.
    - Updated default `"Apple"` prefab archetype in `PrefabManager.ts` to match the exact stats of the original green apple:
      - Color: `"#22c55e"` (green)
      - Mass: `0.35`
      - Collider radius: `0.25`
      - Bounce restitution: `0.2`
      - Consumable energy: `2000 J` (`remainingEnergyJoules = 2000`)
      - Consume rate: `400 W`
      - Biological healing rate: `0 HP/s`
      - Consumable tag: `"food"`
      - Icon: `"🍏"`
  - **Eliminated False HP / Energy Gain on Initial Pickup**:
    - **Re-ordered Held Object Transition**: Moved the `currentHeldId !== prevHeldId` transition detection to the top of `PlayerManager.applyPlayerInputs` (before line 855 where `char.consumeModule.consume()` is evaluated), guaranteeing that newly acquired items never consume energy or restore HP on their initial pickup frame.
    - **Pre-Pickup Button Suppression**: When an item enters a character's hands while the trigger button (Left Mouse Button for keyboard/mouse, Gamepad RT) was already being pressed before or during pickup, `gState.useItemSuppressed` is strictly set to `true`, and `char.isUsingItem` and `char.eatRateWatts` are zeroed out.
    - **Explicit Release & Repress Required**: Consumable behaviors only begin once the player completely releases the activation button and presses it again after the item is in their hands.
    - **Spawner Cloning in InputManager**: Added spawner detection in `InputManager.handleClick` and `onKeyboardPickup` to dispense a clone without spawner behavior into hands, keeping the spawner entity stationary at its location and setting `justPickedUp = true`.
  - **Automated Verification**: Verified 100% via `scratch/test_apple_pickup_and_suppression.ts`, `scratch/test_grab_suppression_and_pie.ts`, `scratch/test_prefabs_and_scene_spawners.ts`, and clean `npm run build`.
- **Phase 12.8 (HUD Click-Through & Pointer Events Transparent Architecture)**:
  - **Eliminated HUD Mouse Interception**: Changed `.energy-hud-container` from `pointer-events: auto` to `pointer-events: none` and added `.energy-hud-container * { pointer-events: none; }` in `src/style.css`.
  - **Seamless Ability Activation Over HUD**: Clicking or dragging across health bars, energy tracks, or modifier tags now passes straight through to the underlying canvas without blocking attacks, throws, eating, or movement aiming.
  - **Interactive Exceptions Preserved**: `.energy-hud-mini` and `.energy-hud-mini *` retain `pointer-events: auto` so the mini collapsed pill remains fully interactive when collapsed.
  - **Automated Verification**: Verified 100% across test suite and clean `npm run build`.

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
