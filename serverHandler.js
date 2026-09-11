import { WebSocketServer, WebSocket } from 'ws';

// Curated modern aesthetic color palette for characters
const AESTHETIC_COLORS = [
  '#38bdf8', // Sky Cyan
  '#f59e0b', // Radiant Amber
  '#ec4899', // Electric Rose
  '#10b981', // Emerald Mint
  '#a855f7', // Vivid Purple
  '#f97316', // Coral Orange
  '#06b6d4', // Teal Neon
  '#eab308', // Cyber Yellow
  '#8b5cf6', // Deep Violet
  '#14b8a6', // Soft Jade
];

export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Single shared global room
  const clients = new Map();
  let nextColorIndex = 0;

  function getHostClient() {
    let oldest = null;
    for (const client of clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!oldest || client.connectedAt < oldest.connectedAt) {
          oldest = client;
        }
      }
    }
    return oldest;
  }

  function broadcast(packet, excludeWs = null) {
    const raw = JSON.stringify(packet);
    for (const client of clients.values()) {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    }
  }

  wss.on('connection', (ws, req) => {
    const playerId = `p_${Math.random().toString(36).substring(2, 7)}`;
    const color = AESTHETIC_COLORS[nextColorIndex % AESTHETIC_COLORS.length];
    nextColorIndex++;
    const connectedAt = Date.now();
    const playerName = `Player ${color.toUpperCase()}`;

    const clientData = {
      ws,
      playerId,
      name: playerName,
      color,
      connectedAt,
      state: {
        id: playerId,
        name: playerName,
        color,
        connectedAt,
        x: 4.0 + (clients.size * 1.5) % 10.0,
        y: 6.0 + ((clients.size * 1.2) % 6.0),
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        facingAngle: 0,
        isAiming: false,
        aimTarget: null,
        heldObjectId: null,
        isActivelyWalking: false,
        isHost: false,
      },
    };

    clients.set(playerId, clientData);

    // Determine current host
    const currentHost = getHostClient();
    const isThisClientHost = currentHost?.playerId === playerId;
    clientData.state.isHost = isThisClientHost;

    // Compile list of existing players
    const existingPlayers = [];
    for (const c of clients.values()) {
      existingPlayers.push({
        ...c.state,
        isHost: c.playerId === currentHost?.playerId,
      });
    }

    // 1. Send init packet to newly connected client
    const initPacket = {
      type: 'init',
      playerId,
      playerColor: color,
      playerName,
      isHost: isThisClientHost,
      hostId: currentHost?.playerId || playerId,
      players: existingPlayers,
      arena: {
        gravity: 10.0,
        frictionCoeff: 10.4,
        staticFrictionThreshold: 0.16,
      },
    };
    ws.send(JSON.stringify(initPacket));

    // 2. Broadcast player_joined to all other clients
    broadcast(
      {
        type: 'player_joined',
        player: clientData.state,
      },
      ws
    );

    console.log(`[Multiplayer] Player joined: ${playerId} (${color}) | Total: ${clients.size} | Host: ${currentHost?.playerId}`);

    // Message handling
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        switch (msg.type) {
          case 'world_snapshot': {
            // Host sends authoritative snapshot -> relay to all guests
            broadcast(msg, ws);
            break;
          }
          case 'player_state': {
            // Client updates own position/aim/velocity -> update local cache & relay to everyone else
            const client = clients.get(playerId);
            if (client) {
              Object.assign(client.state, {
                x: msg.x,
                y: msg.y,
                z: msg.z,
                vx: msg.vx,
                vy: msg.vy,
                vz: msg.vz,
                facingAngle: msg.facingAngle,
                isAiming: msg.isAiming,
                aimTarget: msg.aimTarget,
                heldObjectId: msg.heldObjectId,
                isActivelyWalking: msg.isActivelyWalking,
              });
            }
            broadcast(msg, ws);
            break;
          }
          case 'client_action': {
            // Non-host requested an action (e.g. pickup, throw) -> relay to Host
            const host = getHostClient();
            if (host && host.ws.readyState === WebSocket.OPEN) {
              host.ws.send(JSON.stringify(msg));
            }
            break;
          }
          case 'ping': {
            // NTP clock synchronization ping
            ws.send(JSON.stringify({
              type: 'pong',
              clientTime: msg.clientTime,
              serverTime: Date.now(),
            }));
            break;
          }
          case 'object_action': {
            // Distributed physics ownership: relay throw, pickup, drop, impulse to all other clients immediately
            broadcast(msg, ws);
            break;
          }
          case 'trajectory_launch': {
            // Relay trajectory launch to all other clients immediately
            broadcast(msg, ws);
            break;
          }
          case 'host_event': {
            // Host spawned or removed an object -> relay to all guests
            broadcast(msg, ws);
            break;
          }
        }
      } catch (err) {
        console.error('[Multiplayer] Error parsing message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(playerId);
      console.log(`[Multiplayer] Player disconnected: ${playerId} | Remaining: ${clients.size}`);

      const newHost = getHostClient();
      const newHostId = newHost?.playerId || '';

      // If a new host was elected, notify them
      if (newHost && newHost.ws.readyState === WebSocket.OPEN) {
        newHost.state.isHost = true;
        newHost.ws.send(
          JSON.stringify({
            type: 'role_change',
            isHost: true,
            hostId: newHostId,
          })
        );
      }

      // Notify everyone of player disconnect & current host
      broadcast({
        type: 'player_left',
        playerId,
        newHostId,
      });
    });

    ws.on('error', (err) => {
      console.error(`[Multiplayer] Socket error for ${playerId}:`, err.message);
    });
  });

  return wss;
}
