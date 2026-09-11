export interface PlayerNetworkData {
  id: string;
  name: string;
  color: string;
  connectedAt: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingAngle: number;
  isAiming: boolean;
  aimTarget: { x: number; y: number } | null;
  heldObjectId: string | null;
  isActivelyWalking: boolean;
  isHost: boolean;
}

export interface ObjectNetworkData {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  isHeld: boolean;
  heldByPlayerId: string | null;
  supportingSurfaceHeight: number;
}

export interface ArenaNetworkData {
  gravity: number;
  frictionCoeff: number;
  staticFrictionThreshold: number;
}

export type NetworkPacket =
  | {
      type: "init";
      playerId: string;
      playerColor: string;
      playerName: string;
      isHost: boolean;
      hostId: string;
      players: PlayerNetworkData[];
      arena: ArenaNetworkData;
      objects?: ObjectNetworkData[];
    }
  | {
      type: "player_joined";
      player: PlayerNetworkData;
    }
  | {
      type: "player_left";
      playerId: string;
      newHostId: string;
    }
  | {
      type: "role_change";
      isHost: boolean;
      hostId: string;
    }
  | {
      type: "player_state";
      playerId: string;
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      facingAngle: number;
      isAiming: boolean;
      aimTarget: { x: number; y: number } | null;
      heldObjectId: string | null;
      isActivelyWalking: boolean;
    }
  | {
      type: "world_snapshot";
      hostId: string;
      timestamp: number;
      objects: ObjectNetworkData[];
      arena: ArenaNetworkData;
    }
  | {
      type: "client_action";
      playerId: string;
      action: "pickup" | "throw" | "drop";
      targetObjectId?: string;
      aimX?: number;
      aimY?: number;
    }
  | {
      type: "host_event";
      event: "object_spawned" | "object_deleted";
      objectData?: any;
      objectId?: string;
    };
