# Rendering Subsystem (`src/engine/rendering/`)

This directory contains modular rendering passes for the Canvas 2D engine.

## Modular Passes
- **`TrajectoryRenderer.ts`**:
  - Responsible for drawing:
    1. 3D parabolic throw arcs (dots scaled by altitude $z$).
    2. Exact landing collider footprints (ground vs wall top).
    3. Wall collision impact markers (red dashed X).
    4. Auto-lock target brackets & sightlines.
    5. Precision aim reticles / crosshairs for keyboard and gamepad virtual cursors.
  - **Inputs**: `TrajectoryCalculation`, `Arena`, `ViewSettings`, canvas `ppu`, aim target offset.
  - **Invariants**: Does not mutate physics state or character positions; purely reads calculated trajectory and viewport matrices.
