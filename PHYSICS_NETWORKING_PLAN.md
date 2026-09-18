# Phase 1.2: Physics Networking Architecture & Implementation Plan
*(Adapted from Rocket League's Deterministic Physics & Network Synchronization Model)*

> **File Notice**: This is a living design & planning document located directly in the project root.  
> You can directly edit this file, check off items, change parameters, or adjust technical specifications at any time.

---

## 1. Overview & Core Philosophy

The goal of Phase 1.2 is to implement a high-performance, responsive physics networking architecture for **Power Creature (Prototype 1)**. In an action arena featuring wall climbing, sprinting, picking up, throwing, and dragging dynamic freebodies (rocks, crates, food, and other creatures), players must experience **0ms perceived input latency** while preserving physical consistency and resolving multi-player physical interactions fairly.

By adapting the core principles pioneered by Psyonix in *Rocket League*, this plan achieves:
1. **Instantaneous Local Feel**: The local player immediately predicts movement, sprint bursts, grabs, throws, and collisions with zero perceived control delay.
2. **Sub-Tick Contact Rollback (Time of Impact - TOI)**: Eliminates collision "squish," sticky walls, and high-speed tunneling by rolling colliding bodies back along their paths of travel to the exact point of tangent contact before calculating impulses.
3. **Adaptive Clock Synchronization (Time Dilation)**: The server monitors per-player input buffer depth and gently nudges the client physics speed ($0.99\times$ to $1.01\times$) to prevent buffer starvation and stutter without hard pauses.
4. **Selective Prediction via "Islands of Influence"**: Only objects actively being moved, carried, kicked, or thrown by players are simulated and rolled back on the client. Resting arena objects sit completely dormant ("Sleeping").

---

## 2. The Three Core Pillars Adapted to Power Creature

### Pillar 1: Fixed Timestep & Continuous Contact Rollback (TOI)

In naive discrete physics loops, if two fast-moving entities penetrate at the end of a tick, an iterative separation solver pushes them apart and reflects velocity. In high-speed throws or tight wall corners, this causes objects to feel "mushy," get stuck in walls, or explode outward with unnatural energy.

```text
Discrete Overlap (Flawed):
[Frame 0]  (A) --------->            (B)
[Frame 1]                 (A [overlap] B)  <-- Solver pushes apart from inside each other!

Rollback to Contact / TOI (Rocket League Style):
[Frame 0]  (A) --------->            (B)
[Frame 1 Detection]       (A [overlap] B)
[Rewind to Contact]        (A)(B)          <-- Roll back to exact tangent point of impact
[Apply Impulse & Finish]  <-(A) (B)->      <-- Step forward remainder of frame cleanly
```

#### Rules & Implementation for Power Creature:
1. **Fixed Simulation Tick**:
   - Simulation runs at a deterministic fixed timestep of 60Hz (`fixedDt = 1 / 60`).
2. **Continuous Swept Collision Detection**:
   - When moving freebodies (characters, thrown rocks, crates), calculate their ray/capsule sweep over the frame $\Delta t$.
3. **Rollback to Touch**:
   - If a collision occurs during the frame at fraction $\alpha \in [0, 1]$, rewind both bodies to that exact contact instant.
4. **Impulse Calculation at Tangent**:
   - Apply normal reaction, mass ratio, restitution (bounce), and surface friction at the exact tangent line.
   - For massless vs. massive objects, maintain the game's rule: massive objects transfer closing velocity to massless items without losing momentum unless pinned against a wall.
5. **Two-Tier Altitude Gating**:
   - Contact sweeps only occur if both entities are on the same height tier (both below wall height, or both above wall height). If a thrown rock's altitude is above wall height ($z \ge \text{wallHeight}$), ground-level collisions are cleanly bypassed.

---

### Pillar 2: Server Authority & Adaptive Input Buffer (Time Dilation)

The server is the ultimate arbiter—not for strict anti-cheat in this prototype, but to serve as the **authoritative tiebreaker** when multiple players contest the same object (e.g., two players attempting to grab the same rock on the same frame).

```text
CLIENT                                                    SERVER
[Tick 101: Move Right, Grab]
[Tick 102: Move Right, Throw] ----(Network Transit)----> [Input Queue (Target: 2 frames)]
                                                          [Tick 100 Simulates]
                                                          Buffer low?  -> "Speed up client 1%"
                                                          Buffer high? -> "Slow down client 1%"
```

#### Rules & Implementation for Power Creature:
1. **Input Packets with Tick Counters**:
   - The client packages inputs labeled with sequential tick numbers:
     `{ tick: 105, moveVector, isGrabHeld, mousePos, isClimbHeld, isSprinting }`.
2. **Server Input Buffer**:
   - The server maintains a short target queue (e.g., 2 ticks of input) for each connected player.
   - This buffer absorbs minor network jitter so the server never starves for input.
3. **Adaptive Time Dilation (The "Cruise Control")**:
   - If a client's inputs arrive too slowly (queue drops below 1 frame), the server instructs the client to run its physics accumulator slightly faster (e.g., $1.01 \times \Delta t$).
   - If a client's inputs arrive too quickly (queue grows beyond 3 frames), the server instructs the client to run slightly slower (e.g., $0.99 \times \Delta t$).
   - This micro-adjustment is imperceptible to the player and prevents stutter, pause-frames, or sudden jumps.

---

### Pillar 3: Client Prediction, Islands of Influence & Selective Rollback

In an arena with 50+ freebodies (rocks, food, crates, dummies), rolling back the entire world on every server packet would be wasteful and unnecessary.

```text
       [Resting Rock 1] (Sleeping)          [Resting Food] (Sleeping)
              |                                     |
    (Untouched / Dormant)                 (Untouched / Dormant)

       [Player A] <====== Holding / Carrying ======> [Rock 2] (Active)
          \                                             /
           +-----------------+-------------------------+
                             |
                     [Active Island A]
           (Only this island predicts and rolls back!)
```

#### Rules & Implementation for Power Creature:
1. **Sleeping vs. Active Bodies**:
   - Any freebody resting on the ground with $v \approx 0$ is marked **Sleeping**.
   - Sleeping bodies require zero network bandwidth and are skipped during client prediction rollbacks.
2. **Islands of Influence**:
   - When a player punches, kicks, picks up, or bumps into a freebody, that freebody wakes up and is added to that player's **Active Island**.
   - If that freebody strikes another freebody (e.g., a thrown crate hitting a rock), the secondary object joins the island.
   - Once all objects in an island come to rest or separate, the island dissolves back into sleeping objects.
3. **Ring Buffer of Past States**:
   - The client stores the past 60–120 frames in a circular history buffer:
     - Player position, velocity, and module states (holding state, climbing state, sprinting).
     - Positions and velocities of all entities currently in the player's active island.
4. **Reconciliation & Deadzone Check**:
   - When the server broadcasts its authoritative state for Tick $T$:
     - The client compares the server's state at Tick $T$ with its history at Tick $T$.
     - **Deadzone Tolerance**: If the difference is below a negligible threshold (e.g., $< 1.5\text{px}$ position, $< 0.1$ velocity), the client considers its prediction correct and does nothing.
     - **Misprediction Correction**: If an unexpected collision or state change occurred:
       1. Snap the affected island's entities back to the Server's state at Tick $T$.
       2. Re-simulate physics forward from Tick $T+1$ to current Tick $T_{now}$ using the recorded input history.
5. **Visual Smoothing Layer**:
   - Physical coordinates snap immediately so game logic and hitboxes are 100% accurate.
   - The renderer tracks a visual offset that smoothly decays over 3–5 frames, masking any correction from the human eye.

---

## 3. High-Level Architecture Flow

```text
 CLIENT (Local Player A)                               SERVER (Authoritative Hub)
=========================                             ============================
[Player presses 'E' or RT to Grab]
  |--> Client predicts: attaches Rock #5 to hands
  |--> Tags Rock #5 as "Active Island A"
  |--> Appends input to History Ring Buffer (Tick 100)
  |--> Sends input {tick: 100, action: GRAB, target: 5} ----> [Enters Server Buffer]
  |                                                                   |
[Client continues simulating Ticks 101...105]                         | Server waits for buffer
                                                                      | Runs Tick 100
                                                                      | Validates grab
                                                                      | Generates authoritative snapshot
  |<---- Sends snapshot {tick: 100, rock5: {pos, heldBy: A}} <--------|
  |
[Client compares Tick 100 Server State with History]
  |--> Match within deadzone? Yes -> Discard History up to Tick 100.
  |--> Mismatch? (e.g. Player B grabbed it first)
         |--> Snap Rock #5 to Server State at Tick 100
         |--> Fast-forward / Re-simulate Ticks 101...105 for Island A
         |--> Rock #5 drops or transfers smoothly with visual dampener.
```

---

## 4. Specific Mechanics Breakdown

### 4.1 Grabbing, Holding & Dragging
- **Client Prediction**: When the player presses Grab near an object, the client immediately predicts snapping the object into hands.
- **Server Verification**: The server checks if the object was within reach at that tick and wasn't already claimed by another player.
- **Conflict Resolution**: If two players grab the same item on the same frame, the server uses a deterministic tiebreaker (e.g. lowest entity ID or highest creature Strength). The losing player's client receives a rollback releasing the item.
- **Dragging Coupled Physics**: When dragging a heavy creature or item, both entities share an active island until released.

### 4.2 Ballistic Throws Over Walls
- **Client Prediction**: When thrown, the client predicts the full 3D parabolic arc ($x, y, z$).
- **Wall Clearance**: As long as $z \ge \text{wallHeight}$, horizontal wall collision checks are skipped on both client and server.
- **Wall-Start Clamping**: If throwing while facing against a wall, trajectory start point is clamped outside wall geometry so items never spawn embedded inside walls.
- **Handoff**: The thrown item remains in the thrower's active island until it lands and comes to rest, or collides with another player/island, at which point the server merges the islands.

### 4.3 Wall Climbing & Pinned States
- **Climbing**: Climbing state (attached to wall surface, vertical movement) is simulated deterministically as part of the creature's state flags.
- **Pinned Against Walls**: When a massive entity pushes a massless entity against a wall, the contact rollback halts both entities at the boundary without jittering.

---

## 5. Phased Implementation Roadmap

- [x] **Phase 1.2.0: Telemetry & Latency Baseline (Completed)**
  - Top-bar mode switch between Single Player and Multiplayer.
  - `RelayClient.ts` WebSocket echo connection (`wss://echo.websocket.org`, `wss://ws.postman-echo.com/raw`).
  - Real-time RTT telemetry HUD (current, min, max, avg ping, packet counters).
  - Semi-transparent Ghost Clones (`👻 ECHO (X ms)`) demonstrating internet latency live on canvas.

- [ ] **Phase 1.2.1: Deterministic Physics & TOI Contact Rollback**
  - Continuous swept collision test for circle-to-circle and circle-to-wall contacts.
  - Sub-tick contact rewind before applying bounce and surface friction impulses.
  - Maintain massless vs. massive closing velocity inheritance rule.
  - Automated headless simulation test verifying 100% determinism locally across repeated runs.

- [ ] **Phase 1.2.2: State Snapshot & Circular History Ring Buffer**
  - Define serializable `StateSnapshot` (positions $x, y, z$, velocities $vx, vy, vz$, angular velocities, holding connections, climbing state).
  - 120-tick circular buffer in client simulation loop.
  - Add DevPanel "Simulate Rollback" debugging button (rewind 30 ticks locally, change input, verify fast-forward replay).

- [ ] **Phase 1.2.3: Active Islands of Influence Graph**
  - Sleeping flag on resting arena objects ($v \approx 0$).
  - Island dependency graph grouping interacting, held, or touching objects into isolated islands.
  - Selective resimulation harness (only stepping active island entities during rollbacks).

- [ ] **Phase 1.2.4: Authoritative Server Input Queue & Time Dilation**
  - Structured input packet `{ tick, moveVector, isGrabHeld, mousePos, isClimbHeld, isSprinting }`.
  - Server-side jitter queue targeting 2 frames.
  - Adaptive accumulator scaler (`speedUp: 1.01` / `slowDown: 0.99`) based on queue depth.

- [ ] **Phase 1.2.5: Client Prediction Reconciliation & Visual Smoothing**
  - Snapshot comparison with configurable error deadzone ($< 1.5\text{px}$).
  - Selective island rollback and fast-forward re-simulation.
  - Render-layer positional dampener (lerping visual transform across 3–5 frames to eliminate visual popping).

---

## 6. Open Questions & Design Notes
*(Feel free to write notes, adjust numbers, or add ideas directly here)*

- **Ballistic Item Handoff**: Does a thrown rock remain on the thrower's client island until it touches the ground, or does the server take authoritative flight control at apex?
- **Creature-to-Creature Grabs**: When a creature grabs another player character, the server acts as the strict authoritative arbiter to avoid contradictory local predictions.
- **Roll Dynamics Synchronization**: Angular velocity vector and roll resistance indicators are included in snapshots to maintain seamless rotational alignment.
