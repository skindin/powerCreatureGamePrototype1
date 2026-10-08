---
name: physics-debugger
description: Specialized instructions and reference for working on deterministic physics, Swept CCD, Discrete TOI rollback, and restitution.
---

# Physics & Collision Resolution Skill

Use this skill when modifying, debugging, or verifying:
- `src/engine/physics/CollisionResolver.ts`
- `src/engine/physics/Snapshot.ts`
- `src/engine/physics/StateHistoryBuffer.ts`
- `src/engine/physics/IslandManager.ts`
- `src/engine/GameLoop.ts`

## Key Invariants
1. **Protected Modules**: Note that `Snapshot.ts`, `RemoteEntityInterpolator.ts`, and `PredictionReconciliation.ts` are **Tier 2** (ask permission before editing). `StateHistoryBuffer.ts` and `IslandManager.ts` are **Tier 1 Sealed** (permission strictly required).
2. **Two-Tier Altitude Gating**: Layer 1 ($z < \text{wallHeight}$) collides with ground walls; Layer 2 ($z \ge \text{wallHeight}$) passes over walls.
3. **Collision Modes**:
   - `discrete_toi`: Tangent contact rollback to contact fraction $\alpha \in [0, 1]$.
   - `continuous_swept`: Swept circle quadratic detection against walls/entities.
   - `dynamic`: Auto-promotes based on speed-to-radius ratio.
4. **Testing**: Validate changes using `npx tsx scratch/test_phase_2_history_rollback.ts` and `npx tsx scratch/test_dynamic_bounce.ts`.
