# Codebase Segmentation & Isolation Plan (Argon Revision)

## Executive Summary

When an AI coding agent is tasked with modifying or adding a game feature (such as tuning a combat ability, adjusting stamina drain, or changing input bindings), it frequently modifies unrelated subsystems or introduces regressions in neighboring mechanics.

This document establishes the **1-to-1 Feature Capsule & Capability Isolation Architecture** designed around a single metric:
> **The 1-File Edit Guarantee**: Any change to an existing mechanic's math, energy cost, HUD preview, or inspector UI must be achievable by reading and editing **1 single isolated file**, with zero risk of touching another mechanic.

---

## 1. Root Mechanisms of Cross-Subsystem Contagion

1. **Monolithic Host Files (`Character.ts` & `DevPanel.ts`)**:
   - `Character.ts` previously contained inline metabolic energy equations for walking, sprinting, climbing, health regeneration, throwing, and laser aiming inside a single `update()` method and `getAnticipatedModifiers()` method.
   - `DevPanel.ts` (5,833 lines) contained all module inspectors, prefab editors, spawner editors, and config delta builders in a single class.
2. **Cross-Capability Direct Imports**:
   - Capabilities imported other capabilities for shared math (e.g. `LaserModule.ts` importing `ThrowModule.ts` for elevation raycasting).
3. **Overloaded Primary Trigger Contention**:
   - `LMB` / `RT` simultaneously serves Laser Fire, Consumable Eating, Throw Release, and Pickup Grab.
4. **Conflict with the `AGENTS.md` 2-Step Anti-Loop Rule**:
   - When 1 feature spans 6 mega-files, agents following the 2-Step Rule either get stuck in analysis loops or leave half the stack out of sync.

---

## 2. Implemented Segmentation Architecture

### Pillar 1: 1-to-1 Character Capability Slices (`src/character/capabilities/`)
All ability-specific energy demand equations, HUD anticipated modifier previews, and tick actuation logic are extracted out of `Character.ts` into strict 1-to-1 capability modules:
- `src/character/capabilities/LocomotionCapability.ts` (Walk & Sprint demand + actuation)
- `src/character/capabilities/ClimbingCapability.ts` (Climb isometric/ascent demand + actuation)
- `src/character/capabilities/JumpCapability.ts` (Jump metabolic burst cost + hop actuation)
- `src/character/capabilities/ThrowCapability.ts` (Throw anticipated modifier preview + throw/drop actuation)
- `src/character/capabilities/LaserCapability.ts` (Laser anticipated modifier + continuous demand + beam actuation)
- `src/character/capabilities/MeleeCapability.ts` (Melee burst actuation + recoil/damage)
- `src/character/capabilities/ConsumeCapability.ts` (Consumable eating actuation)
- `src/character/capabilities/HealthRegenCapability.ts` (Health regeneration demand + healing tick)

**Preservation of Tier 1 & Tier 2 Files**:
All Tier 1 Sealed (`JumpModule.ts`, `WallEdgeAssistModule.ts`) and Tier 2 Protected (`WalkingModule.ts`, `ClimbingModule.ts`, `PickupModule.ts`, `ThrowModule.ts`) modules remain 100% untouched; the capability slices encapsulate the orchestration and metabolic math that previously cluttered `Character.ts`.

### Pillar 2: Shared Physics Utilities (`src/engine/physics/ElevationRaycaster.ts`)
Shared 3D raycast and ground-elevation intersection math is extracted into `src/engine/physics/ElevationRaycaster.ts` so combat modules (`LaserModule.ts`) never import interaction modules (`ThrowModule.ts`).

### Pillar 3: DevPanel Functional Decomposition (`src/ui/devpanel/`)
`DevPanel.ts` is decomposed into isolated functional slices:
- `src/ui/devpanel/PlayerDeltaBuilder.ts` (Single-property player config delta serialization)
- `src/ui/devpanel/PrefabsPanelSection.ts` (Scene Prefabs editor UI & handlers)
- `src/ui/devpanel/SpawnersPanelSection.ts` (Scene Spawners editor UI & handlers)
- `src/ui/devpanel/inspectors/` (Modular entity behavior inspector renderers)

### Pillar 4: Input Arbitration Isolation (`src/input/ControlModeArbiter.ts`)
Centralizes primary action priority (`Laser` > `Consume` > `Throw` > `Pickup`) and button-release latching so editing one ability's trigger conditions never breaks another ability.

### Pillar 5: Mechanical Guardrails (`.githooks/pre-commit` & `AGENTS.md`)
- `.githooks/pre-commit` enforces Tier 1 read-only protection and blocks illegal cross-imports between capability modules.
- `AGENTS.md` provides a direct **1-File Edit Routing Table** so agents immediately target the isolated file for any task.
