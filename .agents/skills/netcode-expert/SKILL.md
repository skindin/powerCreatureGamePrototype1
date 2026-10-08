---
name: netcode-expert
description: Specialized instructions and reference for working on the WebSocket multiplayer networking, authoritative server, and client telemetry.
---

# Netcode & Multiplayer Architecture Skill

Use this skill when modifying, debugging, or adding features to:
- `src/network/OnlineRoomClient.ts`
- `src/network/OnlineSessionManager.ts`
- `src/network/RelayClient.ts`
- `src/server/UniversalRoomManager.ts`
- `src/server/ServerGameSimulation.ts`
- `src/server/ServerJitterBuffer.ts`
- `src/server/ContestedGrabArbiter.ts`

## Key Invariants
1. **Server Authority**: The server alone allocates player slots, player numbers, colors, and initial spawn coordinates (`(4.8, 7.0, 0)`).
2. **Submissive Spawning**: The client must not transmit `charTelemetry` or `objTelemetry` with coordinates until it has received `onPlayerRegistered` containing `spawnPos` and snapped to it locally (`spawnAlignedPlayerIds`).
3. **No Stale Caching on Disconnect**: When all players leave, `UniversalRoomManager.trashMapMemory()` completely clears simulation state, entities, and jitter queues.
4. **Testing**: Validate changes using `npx tsx scratch/test_phase_10_online_room.ts` and `npx tsx scratch/test_clean_rejoin_no_caching.ts`.
