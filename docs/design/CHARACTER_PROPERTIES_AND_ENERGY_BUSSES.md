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
   - **Energy Busses**: Intermediate power channels with **Max Power** (draw rate limit) and **Stamina** (burst duration limit before local exhaustion, regenerates over time with NO energy cost).
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
  - Alive, Dead.
  - Coordinates death transitions when `HP <= 0` (dropping inventory, respawn trigger).

---

## 2. Phased Roadmap

### Phase 1: Dynamic Property References System (Blender Node Socket Model) 🎯 [CURRENT]
- **Dual-Mode Property Sockets**:
  - **Literal Mode (Default)**: Behaves like a standard independent numeric field (e.g. `1.0`).
  - **Reference Mode**: Plugs into an object-scoped named property (e.g., linked to `"ArmStrength"`).
- **Inline Value Editing with Linked Indicator**:
  - Even when referencing a property, the value remains directly editable right in the field.
  - Modifying the value updates the shared property across all modules referencing it.
  - Shows an obvious visual badge/pill displaying that it is a reference and its linked name.
- **Reference Selector & Management Dropdown**:
  - Toggle button on the field to switch between Literal and Reference mode.
  - **Searchable List**: Scrollable list of existing referenceable properties on this object with a search bar.
  - **Create New**: Inline input to create and name a new property on this object.
  - **Locally Unique Names**: Enforces unique property names within this single `GameObject`.
  - **Rename & Delete Actions**: Each referenced property row in the management UI has:
    - An **inline rename button/field** (updates all sockets referencing this key).
    - A **delete button** (prompts or detaches sockets back to their current literal value).

### Phase 2: Multi-Tier Energy Busses & Burst Stamina
- Core energy pool vs. subsystem energy busses (Locomotion, Combat, etc.).
- `maxPower` (draw limit) and `stamina` (burst duration before local exhaustion).
- Stamina regenerates over time with zero energy cost.
- Hierarchical bus drawing and localized vs. cascading fatigue.

### Phase 3: Explicit `CharacterModule` & Dynamic Input Group Binding
- Distinguish characters from freebodies.
- Role switching (`LOCAL_PLAYER`, `REMOTE_PLAYER`, `NPC_AI`).
- Dynamic input channel binding (hotplugging gamepads, touch, keyboard).
- Life state (`Alive`, `Dead`).

### Phase 4: Node Graph Visualizer & Prefab Blueprint Serialization
- Interactive 2D canvas node wire viewer for inspecting sockets, properties, and busses.
- JSON Prefab loading/saving with wiring intact.

---

## 3. Phase 1 Technical Design Details

### 3.1 Data Model
```typescript
export interface ObjectProperty {
  id: string; // locally unique name (e.g., "ArmStrength")
  value: number;
  min?: number;
  max?: number;
  step?: number;
}

export class DynamicProperty {
  public isReference: boolean = false;
  public referenceKey: string = '';
  public literalValue: number = 1.0;

  constructor(defaultValue: number = 1.0) {
    this.literalValue = defaultValue;
  }

  public get(owner: GameObject): number {
    if (this.isReference && this.referenceKey) {
      return owner.properties?.get(this.referenceKey) ?? this.literalValue;
    }
    return this.literalValue;
  }

  public set(owner: GameObject, newValue: number): void {
    if (this.isReference && this.referenceKey) {
      owner.properties?.set(this.referenceKey, newValue);
    } else {
      this.literalValue = newValue;
    }
  }
}
```

### 3.2 UI Flow (DevPanel / Property Control)
```
[ Literal Field ]
[ 1.50 ] [ 🔗 Link ]

[ Linked Reference Field ]
[ 1.50 ] [ 🔗 ArmStrength ✕ ] -> Updates ArmStrength, shows linked indicator

[ Dropdown Open ]
┌───────────────────────────────┐
│ 🔍 [ Search properties...   ] │
├───────────────────────────────┤
│ • ArmStrength [1.50] [✎] [🗑] │
│ • LegStrength [2.00] [✎] [🗑] │
├───────────────────────────────┤
│ [+ New Property Name ] [ Add ]│
└───────────────────────────────┘
```

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
