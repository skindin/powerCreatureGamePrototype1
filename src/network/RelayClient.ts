import {
  BoomerangRelayTransport,
  RelayStats,
  RelayStatus,
} from "./transports/BoomerangRelayTransport.js";
import { GhostEntityState, GhostSnapshot } from "./protocol/NetworkPackets.js";

export type { GhostEntityState, GhostSnapshot, RelayStats, RelayStatus };
export { BoomerangRelayTransport };
export const RelayClient = BoomerangRelayTransport;
export type RelayClient = BoomerangRelayTransport;
