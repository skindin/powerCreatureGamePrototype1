import {
  OnlineClientTransport,
} from "./transports/OnlineClientTransport.js";
import type {
  OnlineTransportStats,
  OnlineConnectionStatus,
} from "./transports/OnlineClientTransport.js";

export { OnlineClientTransport };
export type { OnlineTransportStats, OnlineConnectionStatus };
export const OnlineRoomClient = OnlineClientTransport;
export type OnlineRoomClient = OnlineClientTransport;

