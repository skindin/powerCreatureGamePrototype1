---
name: ui-devpanel
description: Developer tools, inspector panel, canvas HUD overlays, and InputManager conventions. Load this skill when editing dev controls, HUD widgets, or keybindings.
---

# UI & DevPanel Architecture Guide

## 1. Core Principles
- **DevPanel (`src/ui/DevPanel.ts`)**:
  - Live inspector for physics values, entities, wall drawing tools, and online multiplayer debug actions.
  - Collapsible cards with consistent design tokens matching `src/style.css`.
  - When modifying controls, keep sliders and buttons reactive; avoid full DOM reconstructions when updating single state values.
- **HUD Overlays & Rendering (`src/engine/rendering/`)**:
  - Keep canvas debug overlays toggleable (default OFF for gameplay).
  - Use modular renderers like `TrajectoryRenderer.ts` rather than bloating `Renderer.ts`.
- **Input Management (`src/ui/InputManager.ts`)**:
  - Centralized dispatch for Keyboard, Mouse, and Gamepad.
  - Player input packets are captured deterministically per tick for both local simulation and network synchronization.
