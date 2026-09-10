# Phase 1: Implementation & Testing Specification

> **Document Status**: Skeleton Outline (To be filled out section by section)  
> **Workspace Location**: `PHASE_ONE.md`  
> **Reference Doc**: `DESIGN_DOC.md`

---

## 1. Engine & Modular Architecture Skeleton

### 1.1 Entity-Module System
<!-- How entities and their opt-in modules are structured and initialized -->
- 

### 1.2 Dynamic Variable Registry & Live Tuning
<!-- How variables are stored, read, and updated live from the dev panel -->
- 

### 1.3 Game Loop & Render Pipeline
<!-- Fixed update rate, canvas layering, top-down projection -->
- 

---

## 2. Controls & Input Mapping Skeleton

### 2.1 Multi-Ring Movement Joystick (Touch)
<!-- Inner ring walk vs. outer ring sprint thresholds and gestures -->
- 

### 2.2 Aiming & Throw Control Mode (Touch)
<!-- Hold-at-center to enter throw mode, drag to aim, release to throw, drag-back to cancel -->
- 

### 2.3 Desktop Keyboard & Mouse Mappings
<!-- Keybinds, mouse aiming reticle, multi-binding structure -->
- 

---

## 3. Creature Stats & 4-Pillar Energy Model Skeleton

### 3.1 The 4 Energy Stats
<!-- HP, Food Energy tank, Power Output (Wattage), Stamina pool -->
- 

### 3.2 Strength, Weight & Exertion Rules
<!-- Strength value, weight calculation, ability activation conditions -->
- 

### 3.3 Recovery & Drain Rates
<!-- Stamina auto-regen, resting HP heal from Food Energy, sprint/melee costs -->
- 

---

## 4. Freebody Physics, Grabbing & Throws Skeleton

### 4.1 Universal Freebody Definition
<!-- Items (rocks, food, crates) and other creatures as freebodies with weight -->
- 

### 4.2 Grabbing, Dragging & Connection Rules
<!-- Lift when Strength >= Weight; drag when too heavy; break-away/stun rules -->
- 

### 4.3 Ballistic Throw & Trajectory Arc Preview
<!-- Trajectory line, wall-clearance pattern change, wall-block truncation, release force -->
- 

### 4.4 Visual Height, Shadows & Overlap Transparency
<!-- Shadow scaling when airborne, transparency over underlying objects -->
- 

---

## 5. Arena Environment & Wall Collision Skeleton

### 5.1 Arena Bounds & Floor Grid
<!-- Size, layout, surface properties -->
- 

### 5.2 Wall System & Heights
<!-- Wall placement, wall height values, ground collision vs airborne clearance -->
- 

### 5.3 Arena Spawns
<!-- Initial spawn points for player, target dummy, food items, throwable rocks -->
- 

---

## 6. Developer Sandbox & Live Tweaker Panel Skeleton

### 6.1 Panel Layout & Docking
<!-- Collapsible sidebar layout, placement on desktop and mobile -->
- 

### 6.2 Module Toggle Matrix
<!-- List of modules that can be checked on/off or detached in real-time -->
- 

### 6.3 Variable Slider Sections
<!-- Categorized sliders for speeds, stamina, punch, throw, and wall heights -->
- 

### 6.4 Spawner & Sandbox Utilities
<!-- Spawn dummy, spawn rock/food, reset arena, export/import JSON presets -->
- 

---

## 7. Phase 1 Verification & Step-by-Step Test Checklist

### 7.1 Movement & Joystick Tests
- [ ] 

### 7.2 4-Pillar Energy & Stamina Exhaustion Tests
- [ ] 

### 7.3 Melee Strike & Knockback Tests
- [ ] 

### 7.4 Grab, Drag & Ballistic Throw Tests
- [ ] 

### 7.5 Wall Collision & Trajectory Clearance Tests
- [ ] 

### 7.6 Dev Tweaker Live Slider & Module Toggle Tests
- [ ] 
