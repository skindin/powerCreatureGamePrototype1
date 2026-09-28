# FROZEN FILES & ARCHITECTURAL BOUNDARIES RULE

## 🔒 Sealed / Read-Only Files
The following files are verified complete, fully tested, and mathematically stable.
AI Agents **MUST NOT** edit, refactor, rewrite, or modify these files under any circumstances, unless the USER explicitly names the file in their prompt and specifically commands an edit:

1. `src/engine/MassModule.ts` — Mass, inertia, inverse mass calculations.
2. `src/engine/FrictionModule.ts` — Ground friction & surface deceleration.
3. `src/engine/BounceModule.ts` — Restitution & velocity damping on collision bounces.
4. `src/engine/RollModule.ts` — 3D angular velocity, roll resistance, and roll angle orientation.
5. `src/engine/GravityModule.ts` — Vertical gravity acceleration ($g$) and airborne physics.
6. `src/engine/VerticalPositionModule.ts` — Pseudo-3D altitude coordinate ($z$), velocity ($v_z$), and flight height.
7. `src/engine/Arena.ts` — Grid-based arena tile mapping, physical wall heights, and tile queries.

## Contract Invariance
- If a new feature requires changes to how these systems behave, use **composition**, **event listeners**, or external adapter modules.
- Do not add direct side-effects into these files.
- Treat their exported public methods and properties as immutable contracts.
