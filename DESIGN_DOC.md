# Power Creature Prototype 1: Master Design Document

> **Document Status**: Living Document (Freely editable by both user and assistant in IDE)  
> **Target Version**: Prototype 1 (Foundations, Sandbox, & Developer Tool)  
> **Workspace Location**: `DESIGN_DOC.md`

---

## 1. High-Level Vision & Objectives

The goal of Prototype 1 is to build a top-down 2D creature action arena that doubles as an interactive **Developer Sandbox & Tuning Tool**.

Rather than locking game mechanics into rigid, hardcoded scripts, the entire engine is built around **true modularity**:
- Creatures are assembled from independent, opt-in modules.
- If a creature does not have a module (such as no stamina, no melee, or no throw), that mechanic simply does not exist for that creature.
- Developers can tweak variables live in the game, save/load presets, and toggle or remove modules at will.

---

## 2. Core Functional Design

### 2.1 Removable & Composable Modules
Every mechanic is an independent building block.
- **Opt-In Presence**: A creature's template specifies which modules it actually has. If a module (e.g. Stamina) is omitted, the creature has no stamina bar, consumes no stamina, and runs no stamina checks.
- **Runtime Toggling**: If a module is present on a creature, developers can also temporarily toggle it on or off in the Dev Panel to test mechanics in isolation.
- **Clean Isolation**: Modules manage their own state and rules without tangling with unrelated systems.

### 2.2 Dynamic Variable Registry
Variables are kept straightforward and directly accessible:
- **Raw Values**: At their base, variables are simple values (e.g. movement speed = 120, can sprint = true).
- **Optional Tweak Controls**: When a variable is useful to adjust live, optional slider boundaries (min, max, step) can be defined so the Dev Panel generates a slider automatically.
- **Instant Updates**: Moving a slider in the Dev Panel instantly changes how the creature behaves in the arena without reloading the page.

### 2.3 Flexible Control Mappings
Abilities are decoupled from hardcoded keys:
- **Action Triggers**: Each action (Move, Sprint, Melee Punch, Throw, Pick Up) can have multiple different controls assigned to it at the same time.
- **Desktop & Touch Harmony**:
  - A player can trigger an action using keyboard keys, mouse clicks, on-screen touch joysticks, or gamepad buttons.
- **Aim Direction**: Actions can pull their aiming direction from whichever source makes sense:
  - The mouse cursor position.
  - The direction the creature is currently facing or moving.
  - A dedicated virtual aim stick.

---

## 3. Character Mechanics & The 4-Pillar Energy Model

Creatures can feature up to 4 interconnected energy stats:

- **HP (Hit Points)**: Primary vitality. Reaching 0 eliminates the creature.
- **Energy (Fuel Tank)**: Acquired by eating food scattered around the arena. Non-walking physical exertions and health regeneration draw from this fuel supply. If Energy hits 0, fuel-costing abilities fail.
- **Power Output (Wattage / Peak Force)**: The peak burst force a creature can deliver at any instant. Each ability requires a certain amount of power to use at full effectiveness.
- **Stamina (Exertion Pool)**: How long a sustained burst of effort can last before fatigue sets in. Stamina regenerates on its own as long as the exertion ability is not actively being used.

### Rule of Activation
To use an energy-costing ability, a creature must meet all three conditions:
1. Has enough **Energy** (sufficient fuel in the tank).
2. Has enough **Power Output** (meets the required peak force).
3. Has **Stamina** remaining (not completely exhausted).

---

## 4. Base Prototype Abilities & Actions

| Ability | How It Functions | Resource Cost | Control Options |
| :--- | :--- | :--- | :--- |
| **Sprinting** | High-speed burst of movement | Drains Stamina over time; minor Energy fuel burn | Outer ring of Movement Joystick, or `Shift` key |
| **Melee (Punch / Jab)** | Quick forward strike with knockback | Flat Energy fuel cost per strike; pauses Stamina regen briefly | Dedicated Melee Joystick / Tap, or Keybind / Left Click towards mouse |
| **Ballistic Throw** | Launches held freebody along an arc; throw distance and speed scale with creature strength | Energy cost based on item weight; Stamina on release | Dedicated Throw Joystick / Hold & Drag, or Keybind / Right Click towards mouse |
| **Healing (Resting)** | Slowly restores missing HP when resting | Drains Energy fuel while healing | Passive when stationary and not taking damage |
| **Pick Up / Swap / Drop** | Grabs a nearby freebody (including other creatures) if light enough for the creature's strength; swaps or drops on repeat | None | Context touch button, or `E` key / Interact keybind |

---

## 5. Top-Down Arena Physics & Freebody Throws Over Walls

1. **Top-Down Perspective**: The camera looks directly down at the arena from above.
2. **Universal Freebody Objects (Including Creatures)**:
   - Any physics-enabled freebody entity in the arena—including items (rocks, crates, pots, food) and **other creatures**—can potentially be grabbed and thrown.
3. **Weight vs. Strength to Grab**:
   - Every freebody (item or creature) has a defined weight.
   - A creature can only grab and lift a target if its **Strength** meets or exceeds the target's weight. Heavy objects or heavier creatures cannot be picked up by a weaker creature.
4. **Throw Distance & Force Scaling**:
   - How far and how fast an object travels when thrown is directly determined by the creature's strength relative to the object's weight.
   - High strength launching a light object produces high speed and long distance; heavier objects fly shorter distances.
5. **Pseudo-3D Ballistic Height**:
   - Thrown objects travel across the ground while also having vertical height.
   - A ground shadow is drawn on the floor where the item would land.
   - The airborne item sprite is drawn higher on the screen based on how high it is in the air.
6. **Flying Over Walls**:
   - Walls have a physical height.
   - When a thrown object is higher than the wall, it flies cleanly over the wall.
   - Once it falls to wall height or lower, it will collide with the wall or hit the floor.

---

## 6. Touch & Multi-Ring Virtual Joysticks

1. **Movement Joystick (Left Thumb)**:
   - **Inner Ring**: Normal walking speed (free, does not cost stamina).
   - **Outer Ring**: Sprinting (high speed, drains stamina).
2. **Gesture Actions**:
   - **Quick Tap & Release**: Snap strike or action in current direction.
   - **Drag & Aim**: Previews the trajectory arc or attack direction.
   - **Hold at Center**: Enter new control mode, used to enter throwing mode, where user can then release joystick to throw the object in the direction of the drag.
   - **Drag Back to Center**: Cancels an aimed throw cleanly without firing.

---

## 7. Developer Sandbox & Live Tweaker Panel

Accessible directly inside the app as a collapsible sidebar:
- **Module Manager**: Checkbox list of all available modules on the active creature. Instantly attach, detach, or toggle modules on and off.
- **Live Variable Sliders**: Sliders for speeds, friction, stamina rates, punch range, throw arcs, and wall heights that take effect immediately.
- **Preset Manager**: Save current creature configurations to JSON presets and switch between presets with one click.
- **Arena Spawner**: Buttons to spawn test dummies (with floating damage popups and HP bars), food items, and throwable rocks or crates.

---

## 8. Multi-Stage Development Roadmap

- [ ] **Stage 1: Dynamic Modular Engine Core & Sandbox Foundation**
  - Modular creature architecture (opt-in modules + runtime toggles).
  - Central variable registry with live dev panel sliders.
  - Multi-binding control system (keyboard, mouse, and touch joysticks).
  - Arena with wall heights, ground food, and throwable items.
  - Base creature with 4 energy stats, sprinting, melee punch, and ballistic throws over walls.
  - Developer panel with sliders, module toggles, and target dummy spawner.
- [ ] **Stage 2: Comprehensive Testing & Tuning Suite**
  - Dedicated testing guide (`STAGE_1_TESTING.md`).
  - Interactive test scenarios (wall clearance tests, stamina exhaustion tests, knockback calibration).
- [ ] **Stage 3: Multiplayer Networking & Lobbies**
  - Room code lobbies (4-letter codes).
  - State synchronization.
  - Game modes (Solo Elimination, Duos, Skirmish).
- [ ] **Stage 4: PWA Packaging & Mobile Polish**
  - Offline-first installation.
  - Full-screen touch ergonomics and viewport locking.

---

*Feel free to edit, add sections, adjust numbers, or leave notes directly in this file at any time.*
