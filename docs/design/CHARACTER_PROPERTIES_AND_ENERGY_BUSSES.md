# Brainstorm & Architecture Specification: Character Properties, Dynamic Energy Busses, and Node-Based Object System

**Status**: Draft / Active Discussion  
**Target Branch Recommendation**: `feat/character-properties-and-nodes` (To be branched from `solidify-core` upon approval)  
**Authors**: Teal & Antigravity  
**Date**: October 8, 2026  

---

## 1. Executive Summary & Vision

We are moving away from hardcoded, rigid entity parameters (like static creature strength values hardwired to specific module internals) toward a **flexible, modular, and node-driven character architecture**.

Key outcomes:
1. **Explicit Character Identification**: An explicit `CharacterModule` distinguishing characters from generic freebodies / objects, routing control mode (Local Player, Remote Peer, NPC / AI) and dynamic input binding (Keyboard/Mouse, Gamepad slot, Touchscreen).
2. **Generic Dynamic Properties Registry**: Devs can define, name, add, and tune arbitrary numeric properties (e.g., `ArmStrength`, `LegStrength`, `GlobalStrength`, `MaxHP`, `MaxEnergy`) that other behavior modules dynamically bind to via dropdown/keys.
3. **Multi-Tier Energy Busses**:
   - **HP**: Lethal damage threshold.
   - **Energy Pool**: Total stored chemical/biological reserve.
   - **Energy Busses**: Intermediate power channels with **Max Power** (draw rate limit) and **Stamina** (burst duration limit before local exhaustion).
   - **Hierarchical Bus Routing**: Busses can feed from parent busses (e.g. `LocomotionBus` and `CombatBus` draw from `CoreMetabolicBus`).
4. **Node Graph Architecture & Prefab Serialization**:
   - Visualizing and inspecting these relationships using a node viewer.
   - Dynamic prefab instantiation and dynamic runtime binding (e.g., hotplugging a new Gamepad dynamically binds a local player prefab to the input group).

---

## 2. Core Pillars & Detailed Breakdown

### Pillar A: The `CharacterModule` & Controller Authority Switching
Currently, objects in the world are distinguished mainly by whether they exist in `playerManager` or are freebody items. There is no first-class `CharacterModule` component on `GameObject`.

#### Responsibilities of `CharacterModule`:
- **Identity & Role**:
  - `LOCAL_PLAYER`: Governed by local input capture.
  - `REMOTE_PLAYER`: Governed by network interpolation & server snapshot packets.
  - `NPC_AI`: Governed by local or authoritative behavioral AI script / state machine.
- **Dynamic Input Binding**:
  - Automatically or manually bound to an **Input Channel / Group** (e.g., `KeyboardMouse`, `Gamepad_0`, `Gamepad_1`, `Touch_VirtualStick`).
  - Hotplug support: When a new gamepad connects, the system can dynamically bind an unbound local character prefab to that controller index.
- **Lifecycle & State**:
  - Alive, Stunned, Exhausted, Dead.
  - Coordinates death transitions when `HP <= 0` (ragdoll state, dropping inventory, respawn trigger).

---

### Pillar B: Dynamic Named Properties (Decoupling Stats from Code)
Today, `StrengthModule.ts` is a sealed Tier 1 module providing a static multiplier used for throw/carrying. We want greater designer freedom without touching code.

#### Two Architectural Patterns to Decide:
- **Option 1: Centralized `PropertiesRegistryModule` on GameObject**:
  - A dictionary of named properties: `{ [name: string]: { value: number, min?: number, max?: number } }`.
  - Modules like `ThrowModule` or `WalkingModule` don't hardcode their stat; they have a property reference string (e.g. `strengthPropertyKey = "ArmStrength"`).
  - If `"ArmStrength"` is not found, it falls back to `"Strength"` or default `1.0`.
- **Option 2: Decentralized Module Export & Bus Linking**:
  - Any module can declare exported outputs (e.g., `LegStrength: 1.5`).
  - Other modules link directly to specific exported slots.

*(Recommendation: Option 1 is far simpler to inspect in DevPanel and configure in prefabs).*

---

### Pillar C: Energy Busses, Burst Stamina, and Cascading Exhaustion

This is one of the most innovative mechanics proposed. Rather than a flat stamina bar where running out stops everything:

```
[ Core Energy Reserve (e.g., 1000 Joules) ]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  [ Locomotion Bus ]       [ Upper-Body / Combat Bus ]
  • Max Power: 20 J/s      • Max Power: 100 J/s
  • Stamina: 5 sec burst   • Stamina: 2 sec burst
         │                       │
   ┌─────┴─────┐           ┌─────┴─────┐
   ▼           ▼           ▼           ▼
Walking     Running     Throwing    Punching
```

#### Energy Bus Spec:
- **`maxPower`**: Max energy/sec this bus can supply. Even if an ability wants 200 power, the bus caps it at `maxPower`.
- **`stamina`**: Local endurance accumulator. When drawing at high capacity, stamina drains.
- **Local Exhaustion**: If a bus runs out of stamina, only abilities attached to that bus enter cooldown/fatigue, while other busses remain operational.
- **Cascading Draw**: If Bus A draws from Bus B, exhausting Bus B impacts Bus A, but exhausting Bus A does not necessarily exhaust Bus C.

---

### Pillar D: Prefab System & Node Graph Viewer

To make this manageable without manual code edits:
1. **JSON Prefab Schema**:
   - Defines all components, named properties, busses, and inter-module wiring for an entity.
   - Example: `beast_standard.prefab.json`, `heavy_thrower.prefab.json`.
2. **Runtime Prefab Spawner**:
   - `PrefabManager.instantiate("beast_standard", { x: 4.8, y: 7.0, z: 0, controller: "Gamepad_0" })`.
3. **Node Viewer / Inspector UI**:
   - An interactive tab in DevPanel (or modal overlay) showing nodes:
     - Property Nodes (HP, ArmStrength, LegStrength)
     - Bus Nodes (LocomotionBus, CombatBus)
     - Ability/Behavior Modules (Walking, Climbing, Throwing)
     - Connections (wires connecting properties and energy supplies).

---

## 3. Open Design Questions for teal & antigravity

1. **Hierarchy vs. Flat Energy Busses**:
   - Do we need arbitrarily deep bus trees (Bus -> Bus -> Bus), or is a 2-tier model (Global Pool -> Subsystem Busses) sufficient for prototype gameplay?
2. **Legacy Module Compatibility**:
   - For sealed Tier 1 modules (`StrengthModule.ts`, etc.), should new properties wrap around them, or should new character features bypass `StrengthModule` using our dynamic properties registry?
3. **UI DevPanel Integration**:
   - Should we build a simple card-based property editor first, or dive straight into a 2D canvas-based node wire graph?

---

## 4. Next Step Checklist
- [ ] Align on open design questions above.
- [ ] Confirm and switch to git branch `feat/character-properties-and-nodes`.
- [ ] Implement `CharacterModule` & Dynamic Property Store.
- [ ] Implement `EnergyBusModule`.
- [ ] Build DevPanel Property/Bus Inspector.
