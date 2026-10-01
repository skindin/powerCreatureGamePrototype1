import { PlayerInputPacket, ReliableActionCommand } from "../../engine/physics/StateHistoryBuffer.js";
import { ClockSyncPacket } from "../../server/ServerJitterBuffer.js";
import {
  AuthoritativeWorldSnapshot,
  CompressedEntityState,
} from "../../server/AuthoritativeSnapshotManager.js";

export type { PlayerInputPacket, ReliableActionCommand };
export type { ClockSyncPacket };
export type { AuthoritativeWorldSnapshot, CompressedEntityState };

/**
 * Universal entity state representation for network transmission and interpolation.
 */
export interface GhostEntityState {
  id: string;
  name?: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz?: number;
  surfaceZ?: number;
  isGrounded?: boolean;
  radius: number;
  color?: string;
  shape?: "circle" | "box";
  isHeld?: boolean;
  heldBy?: string | null;
  isAboveWalls?: boolean;
  isClimbing?: boolean;
  facingAngle?: number;
  heldObjectId?: string | null;
  isHolding?: boolean;
  angX?: number;
  angY?: number;
  angZ?: number;
  isSleeping?: boolean;
}

/**
 * State snapshot payload received from server or echo relay.
 */
export interface GhostSnapshot {
  seq: number;
  sentAt: number;
  receivedAt: number;
  rttMs: number;
  character: GhostEntityState;
  characters?: GhostEntityState[];
  objects: GhostEntityState[];
  source?: "physics_sim" | "echo";
  ackActionIds?: string[];
  clockSync?: ClockSyncPacket;
  worldSnapshot?: AuthoritativeWorldSnapshot;
}

/**
 * Packet sent by a client streaming inputs and reliable actions.
 */
export interface ClientInputPacket {
  type: "pc_player_input";
  seq: number;
  sentAt: number;
  tick: number;
  lastReceivedServerTick?: number;
  inputs: PlayerInputPacket[];
  reliableActions?: ReliableActionCommand[];
  character?: GhostEntityState;
  characters?: GhostEntityState[];
  objects?: GhostEntityState[];
}

/**
 * Packet broadcast by authoritative server to clients.
 */
export interface ServerSnapshotPacket {
  type: "pc_server_snapshot";
  snapshot: GhostSnapshot;
  worldSnapshot?: AuthoritativeWorldSnapshot;
  playerCount?: number;
}

/**
 * Room management handshake packets.
 */
export interface JoinRoomPacket {
  type: "join_room";
  name: string;
}

export interface RoomJoinedPacket {
  type: "room_joined" | "room_welcome";
  clientId: string;
  playerNumber: number;
  name: string;
  color: string;
  arena?: {
    width: number;
    height: number;
    wallHeight: number;
    tileGrid: number[][];
  };
  worldSnapshot?: AuthoritativeWorldSnapshot;
}

export interface RenamePlayerPacket {
  type: "rename_player";
  name: string;
}

export interface PingPacket {
  type: "ping";
  clientTimestamp: number;
}

export interface PongPacket {
  type: "pong";
  clientTimestamp: number;
  serverTick: number;
}

export interface StandaloneReliableActionPacket {
  type: "reliable_action";
  action: ReliableActionCommand;
}

export type NetworkMessage =
  | ClientInputPacket
  | ServerSnapshotPacket
  | JoinRoomPacket
  | RoomJoinedPacket
  | RenamePlayerPacket
  | PingPacket
  | PongPacket
  | StandaloneReliableActionPacket;
