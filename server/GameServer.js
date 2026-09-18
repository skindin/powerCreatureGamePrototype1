import { WebSocketServer } from 'ws';

// Default player colors matching client palette
const PLAYER_COLORS = [
  "#f59e0b", // P1: Amber Gold
  "#06b6d4", // P2: Cyan
  "#10b981", // P3: Emerald
  "#a855f7", // P4: Violet
  "#f43f5e", // P5: Rose
  "#3b82f6", // P6: Blue
];

export class GameServer {
  constructor() {
    this.clients = new Map(); // ws -> { clientId, localPlayers: Set(playerId) }
    this.players = new Map(); // playerId -> PlayerState
    this.objects = new Map(); // objectId -> ObjectState
    this.nextPlayerNumber = 1;
    this.serverTick = 0;
    this.fixedDt = 1 / 60;

    this.cols = 20;
    this.rows = 14;
    this.tileSize = 1.0;
    this.wallHeight = 1.0;

    this.initArenaGrid();
    this.initDefaultObjects();
    this.syncEntitiesWithWalls();
    this.startSimulation();
  }

  initArenaGrid() {
    // Default Trench Tunnels layout matching client Arena.ts
    const grid = Array.from({ length: this.rows }, () => Array.from({ length: this.cols }, () => 1));

    // Carve primary 1-tile-wide horizontal trench tunnels:
    for (let c = 2; c <= 17; c++) {
      grid[3][c] = 0;
      grid[7][c] = 0;
      grid[10][c] = 0;
    }

    // Carve primary 1-tile-wide vertical trench tunnels:
    for (let r = 2; r <= 11; r++) {
      grid[r][5] = 0;  // Intersects player spawn at (col 5, row 7)
      grid[r][10] = 0; // Central trench tunnel artery
      grid[r][14] = 0; // East trench tunnel artery
    }

    // Winding connector trenches & escape passages:
    grid[1][10] = 0; // North trench exit
    grid[12][10] = 0; // South trench exit
    grid[7][1] = 0;  // West perimeter entry
    grid[7][18] = 0; // East perimeter entry
    for (let r = 5; r <= 9; r++) grid[r][2] = 0;  // West auxiliary trench
    for (let r = 5; r <= 9; r++) grid[r][17] = 0; // East auxiliary trench

    // Short connecting cross-tunnels:
    for (let c = 2; c <= 5; c++) grid[5][c] = 0;
    for (let c = 10; c <= 14; c++) grid[5][c] = 0;
    for (let c = 5; c <= 10; c++) grid[9][c] = 0;
    for (let c = 14; c <= 17; c++) grid[9][c] = 0;

    // Player spawn point (col 5, row 7) is guaranteed an open trench
    grid[7][5] = 0;

    this.tileGrid = grid;
    this.wallMapString = this.exportWallMapBinaryString();
    this.rebuildWalls();
  }

  /**
   * Exports wall grid as a binary string ('0' = ground, '1' = wall)
   * indexed from bottom-left (row = rows-1, col = 0) to right, then up to top.
   */
  exportWallMapBinaryString() {
    let result = "";
    for (let r = this.rows - 1; r >= 0; r--) {
      for (let c = 0; c < this.cols; c++) {
        result += this.tileGrid[r][c] === 1 ? "1" : "0";
      }
    }
    return result;
  }

  /**
   * Imports a wall map binary string from bottom-left to top-right.
   */
  importWallMapBinaryString(mapStr) {
    if (!mapStr || mapStr.length < this.rows * this.cols) return false;
    let idx = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      for (let c = 0; c < this.cols; c++) {
        this.tileGrid[r][c] = mapStr[idx++] === "1" ? 1 : 0;
      }
    }
    this.wallMapString = mapStr;
    this.rebuildWalls();
    this.syncEntitiesWithWalls();
    return true;
  }

  setWallTile(col, row, isWall) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    this.tileGrid[row][col] = isWall ? 1 : 0;
    this.wallMapString = this.exportWallMapBinaryString();
    this.rebuildWalls();
    this.syncEntitiesWithWalls();
    return true;
  }

  rebuildWalls() {
    this.walls = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.tileGrid[r][c] === 1) {
          this.walls.push({
            id: `wall-${c}-${r}`,
            x: c * this.tileSize,
            y: r * this.tileSize,
            width: this.tileSize,
            height: this.tileSize,
            wallHeight: this.wallHeight,
          });
        }
      }
    }
  }

  getSupportingWall(x, y, radius = 0) {
    if (radius <= 0) {
      for (const wall of this.walls) {
        if (x >= wall.x && x <= wall.x + wall.width && y >= wall.y && y <= wall.y + wall.height) {
          return wall;
        }
      }
      return null;
    }
    for (const wall of this.walls) {
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy <= radius * radius + 1e-6) {
        return wall;
      }
    }
    return null;
  }

  syncEntitiesWithWalls() {
    for (const obj of this.objects.values()) {
      if (obj.isHeld) continue;
      const r = obj.radius || 0.26;
      const supportingWall = this.getSupportingWall(obj.x, obj.y, r);
      if (supportingWall) {
        if (obj.z < supportingWall.wallHeight) {
          obj.z = supportingWall.wallHeight;
          obj.supportingSurfaceHeight = supportingWall.wallHeight;
          obj.standingWall = supportingWall;
          obj.vz = 0;
        } else {
          obj.standingWall = supportingWall;
          obj.supportingSurfaceHeight = supportingWall.wallHeight;
        }
      } else {
        if (obj.supportingSurfaceHeight >= this.wallHeight - 0.05 || obj.standingWall) {
          obj.standingWall = null;
          obj.supportingSurfaceHeight = 0;
        }
      }
    }
    for (const p of this.players.values()) {
      const r = p.colliderRadius || 0.44;
      const supportingWall = this.getSupportingWall(p.x, p.y, r);
      if (supportingWall) {
        if (p.z < supportingWall.wallHeight) {
          p.z = supportingWall.wallHeight;
          p.supportingSurfaceHeight = supportingWall.wallHeight;
          p.standingWall = supportingWall;
          p.vz = 0;
        } else {
          p.standingWall = supportingWall;
          p.supportingSurfaceHeight = supportingWall.wallHeight;
        }
      } else {
        if (p.supportingSurfaceHeight >= this.wallHeight - 0.05 || p.standingWall) {
          p.standingWall = null;
          p.supportingSurfaceHeight = 0;
        }
      }
    }
  }

  initDefaultObjects() {
    const defaults = [
      { id: "stone-1", name: "Light Blue Box", x: 6.8, y: 4.4, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.26, mass: 0.7, color: "#38bdf8", bounceMod: 0.25, shape: "box" },
      { id: "boulder-1", name: "Heavy Red Box", x: 7.0, y: 9.2, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.40, mass: 2.6, color: "#f87171", bounceMod: 0.05, shape: "box" },
      { id: "bouncy-1", name: "Super Bouncy Ball", x: 5.2, y: 3.0, z: 0.6, vx: 0, vy: 0, vz: 1.0, radius: 0.24, mass: 0.5, color: "#4ade80", bounceMod: 0.85, shape: "circle" },
      { id: "rolling-1", name: "Rolling Ball", x: 13.6, y: 7.0, z: 0, vx: 4.5, vy: 1.5, vz: 0, radius: 0.28, mass: 0.6, color: "#a855f7", bounceMod: 0.95, shape: "circle" },
    ];

    for (const d of defaults) {
      this.objects.set(d.id, {
        ...d,
        supportingSurfaceHeight: 0,
        standingWall: null,
        isHeld: false,
        heldBy: null,
      });
    }
  }

  attach(httpServer) {
    const wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws' || url.pathname === '/ws/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });

    wss.on('connection', (ws) => {
      const clientId = `c_${Math.random().toString(36).substring(2, 9)}`;
      const clientRecord = {
        clientId,
        ws,
        localPlayers: new Set(),
        lastActiveTime: Date.now(),
      };
      this.clients.set(ws, clientRecord);

      // Sanitize any orphaned held states if fresh connection
      for (const obj of this.objects.values()) {
        if (obj.isHeld && (!obj.heldBy || !this.players.has(obj.heldBy))) {
          obj.isHeld = false;
          obj.heldBy = null;
        }
      }

      // Send initial lobby state with authoritative wallMapString
      this.sendJson(ws, {
        type: 'init_state',
        clientId,
        serverTick: this.serverTick,
        arena: {
          width: this.cols * this.tileSize,
          height: this.rows * this.tileSize,
          wallHeight: this.wallHeight,
          cols: this.cols,
          rows: this.rows,
        },
        wallMap: this.wallMapString,
        players: this.serializePlayers(),
        objects: this.serializeObjects(),
      });

      ws.on('message', (message) => {
        try {
          clientRecord.lastActiveTime = Date.now();
          const data = JSON.parse(message.toString());
          this.handleClientMessage(clientRecord, data);
        } catch (e) {
          // Ignore invalid JSON
        }
      });

      ws.on('close', () => {
        this.handleClientDisconnect(clientRecord);
      });

      ws.on('error', () => {
        this.handleClientDisconnect(clientRecord);
      });
    });

    // Periodic heartbeat check: prune zombie connections that closed without proper TCP FIN
    setInterval(() => {
      const now = Date.now();
      for (const [ws, clientRecord] of this.clients.entries()) {
        if (now - clientRecord.lastActiveTime > 4000) {
          this.handleClientDisconnect(clientRecord);
          try { ws.terminate(); } catch (e) {}
        }
      }
    }, 1000);

    console.log('🎮 [GameServer] Authoritative Universal Lobby attached to /ws');
    return wss;
  }

  handleClientMessage(client, msg) {
    if (client) client.lastActiveTime = Date.now();

    if (!msg || !msg.type) return;

    if (msg.type === 'ping') {
      this.sendJson(client.ws, {
        type: 'pong',
        sentAt: msg.sentAt,
        serverTick: this.serverTick,
      });
      return;
    }

    if (msg.type === 'update_wall_tile') {
      const { col, row, isWall } = msg;
      if (this.setWallTile(col, row, isWall)) {
        this.broadcast({
          type: 'wall_map_sync',
          wallMap: this.wallMapString,
        });
      }
      return;
    }

    if (msg.type === 'update_wall_map') {
      if (typeof msg.wallMap === 'string' && this.importWallMapBinaryString(msg.wallMap)) {
        this.broadcast({
          type: 'wall_map_sync',
          wallMap: this.wallMapString,
        });
      }
      return;
    }

    if (msg.type === 'player_pickup') {
      const playerId = `${client.clientId}_${msg.localId}`;
      this.executePickup(playerId, msg.objectId);
      return;
    }

    if (msg.type === 'player_throw') {
      const playerId = `${client.clientId}_${msg.localId}`;
      this.executeThrow(
        playerId,
        msg.objectId,
        msg.vx,
        msg.vy,
        msg.vz,
        msg.targetX,
        msg.targetY,
        msg.startX,
        msg.startY,
        msg.startZ
      );
      return;
    }

    if (msg.type === 'player_drop') {
      const playerId = `${client.clientId}_${msg.localId}`;
      this.executeDrop(
        playerId,
        msg.objectId,
        msg.vx,
        msg.vy,
        msg.vz,
        msg.startX,
        msg.startY,
        msg.startZ
      );
      return;
    }

    if (msg.type === 'register_player') {

      const { localId, name } = msg;
      const playerId = `${client.clientId}_${localId}`;
      const playerNum = this.nextPlayerNumber++;
      const assignedColor = PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];
      const assignedName = name && !name.startsWith("Player ") ? name : `Player ${playerNum}`;

      // Spawn at friendly open coordinates in the trench (col 5, row 7)
      const spawnX = 5.0 + ((playerNum - 1) % 4) * 0.6;
      const spawnY = 7.0 + (Math.floor((playerNum - 1) / 4) % 2) * 0.5;

      const playerState = {
        id: playerId,
        clientId: client.clientId,
        localId,
        playerNumber: playerNum,
        name: assignedName,
        color: assignedColor,
        x: spawnX,
        y: spawnY,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        supportingSurfaceHeight: 0,
        standingWall: null,
        facingAngle: 0,
        colliderRadius: 0.44,
        mass: 1.2,
        strength: 1.0,
        isSprinting: false,
        isActivelyWalking: false,
        isClimbing: false,
        heldObjectId: null,
        isAiming: false,
        aimTarget: null,
        lastThrowTime: 0,
        lastThrownObjectId: null,
        lastProcessedTick: 0,
        lastProcessedTimestamp: 0,
        inputQueue: [],
      };

      // Check if spawned on a wall
      const spawnWall = this.getSupportingWall(spawnX, spawnY, playerState.colliderRadius);
      if (spawnWall) {
        playerState.z = spawnWall.wallHeight;
        playerState.supportingSurfaceHeight = spawnWall.wallHeight;
        playerState.standingWall = spawnWall;
      }

      this.players.set(playerId, playerState);
      client.localPlayers.add(playerId);

      // Send authoritative assignment to the registering client
      this.sendJson(client.ws, {
        type: 'player_assigned',
        localId,
        playerId,
        playerNumber: playerNum,
        color: assignedColor,
        name: assignedName,
      });

      // Broadcast join to all
      this.broadcast({
        type: 'player_joined',
        player: playerState,
      });
      return;
    }

    if (msg.type === 'unregister_player') {
      const playerId = `${client.clientId}_${msg.localId}`;
      this.removePlayer(playerId);
      return;
    }

    if (msg.type === 'player_input') {
      const now = Date.now();
      if (Array.isArray(msg.inputs)) {
        for (const inp of msg.inputs) {
          const playerId = `${client.clientId}_${inp.localId}`;
          const player = this.players.get(playerId);
          if (player) {
            if (msg.tick && player.lastProcessedTick && msg.tick < player.lastProcessedTick) {
              continue; // Discard out-of-order stale input
            }
            if (msg.tick) player.lastProcessedTick = msg.tick;
            if (msg.timestamp) player.lastProcessedTimestamp = msg.timestamp;

            player.inputQueue.push({
              tick: msg.tick || this.serverTick,
              timestamp: msg.timestamp || now,
              moveVector: inp.moveVector || { x: 0, y: 0 },
              isGrabHeld: Boolean(inp.isGrabHeld),
              isThrowHeld: Boolean(inp.isThrowHeld),
              mousePos: inp.mousePos || null,
              isClimbHeld: Boolean(inp.isClimbHeld),
              isSprinting: Boolean(inp.isSprinting),
              heldObjectId: inp.heldObjectId !== undefined ? inp.heldObjectId : null,
              throwEvent: inp.throwEvent || null,
              dropEvent: inp.dropEvent || null,
            });
            if (player.inputQueue.length > 8) {
              player.inputQueue.shift();
            }

          }
        }
      }
    }
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Unconditionally release any objects held by this player
    for (const obj of this.objects.values()) {
      if (obj.heldBy === playerId || (player && player.heldObjectId === obj.id)) {
        obj.isHeld = false;
        obj.heldBy = null;
      }
    }

    this.players.delete(playerId);

    if (this.players.size === 0) {
      this.nextPlayerNumber = 1;
      for (const obj of this.objects.values()) {
        obj.isHeld = false;
        obj.heldBy = null;
      }
    }

    this.broadcast({
      type: 'player_left',
      playerId,
    });
  }

  handleClientDisconnect(client) {
    for (const playerId of client.localPlayers) {
      this.removePlayer(playerId);
    }
    this.clients.delete(client.ws);
  }

  executePickup(playerId, objectId) {
    const player = this.players.get(playerId);
    if (!player) return;
    const targetObj = this.objects.get(objectId);
    if (!targetObj) return;

    // Do NOT pick up if player recently threw this object!
    if (player.lastThrownObjectId === objectId && (Date.now() - (player.lastThrowTime || 0)) < 600) {
      return;
    }

    // If held by someone else, prevent pickup
    if (targetObj.isHeld && targetObj.heldBy && targetObj.heldBy !== playerId) {
      return;
    }

    // Proximity check with network tolerance
    const dist = Math.hypot(
      targetObj.x - player.x,
      targetObj.y - player.y,
      (targetObj.z || 0) - (player.z || 0)
    );
    if (dist > 2.8) {
      return;
    }

    // Release any previous object held by this player
    if (player.heldObjectId && player.heldObjectId !== objectId) {
      const prev = this.objects.get(player.heldObjectId);
      if (prev) {
        prev.isHeld = false;
        prev.heldBy = null;
      }
    }

    targetObj.isHeld = true;
    targetObj.heldBy = playerId;
    targetObj.lastThrower = null;
    player.heldObjectId = targetObj.id;

    const holdPos = this.calculateHeldObjectPosition(player, targetObj);
    targetObj.x = holdPos.x;
    targetObj.y = holdPos.y;
    targetObj.z = holdPos.z;
    targetObj.vx = player.vx;
    targetObj.vy = player.vy;
    targetObj.vz = 0;
  }

  executeThrow(playerId, objectId, vx, vy, vz, targetX, targetY, startX, startY, startZ) {
    const player = this.players.get(playerId);
    const targetObjId = objectId || (player ? player.heldObjectId : null);
    if (!targetObjId) return;
    const obj = this.objects.get(targetObjId);
    if (!obj) return;

    // Verify holding or proximity
    const wasHolding = (player && player.heldObjectId === targetObjId) || obj.heldBy === playerId;
    const isNearby = player && Math.hypot(obj.x - player.x, obj.y - player.y) <= 2.5;
    if (!wasHolding && !isNearby) {
      return;
    }

    obj.isHeld = false;
    obj.heldBy = null;
    obj.lastThrower = playerId;

    if (player) {
      player.lastThrowTime = Date.now();
      player.lastThrownObjectId = targetObjId;
    }

    if (typeof startX === 'number' && typeof startY === 'number') {
      obj.x = startX;
      obj.y = startY;
    } else if (player) {
      const holdPos = this.calculateHeldObjectPosition(player, obj);
      obj.x = holdPos.x;
      obj.y = holdPos.y;
    }

    if (typeof startZ === 'number') {
      obj.z = Math.max(0.3, startZ);
    } else if (player) {
      obj.z = Math.max(0.3, player.z + 0.45);
    } else {
      obj.z = Math.max(0.3, obj.z);
    }

    // Verify throw power / speed (allow up to 25.0 u/s for running recoil)
    const maxAllowedSpeed = 25.0;

    if (typeof vx === 'number' && typeof vy === 'number' && typeof vz === 'number') {
      const speed = Math.hypot(vx, vy, vz);
      if (speed <= maxAllowedSpeed) {
        obj.vx = vx;
        obj.vy = vy;
        obj.vz = vz;
      } else {
        const scale = maxAllowedSpeed / speed;
        obj.vx = vx * scale;
        obj.vy = vy * scale;
        obj.vz = vz * scale;
      }
    } else if (player) {
      const throwSpeed = 9.0;
      const tx = typeof targetX === 'number' ? targetX : player.x + Math.cos(player.facingAngle) * 5.0;
      const ty = typeof targetY === 'number' ? targetY : player.y + Math.sin(player.facingAngle) * 5.0;
      const dx = tx - obj.x;
      const dy = ty - obj.y;
      const dist = Math.max(0.1, Math.hypot(dx, dy));
      const actualDist = Math.min(dist, 13.0);
      const dirX = dx / dist;
      const dirY = dy / dist;
      const totalTime = Math.max(0.2, actualDist / throwSpeed);
      obj.vx = dirX * throwSpeed;
      obj.vy = dirY * throwSpeed;
      obj.vz = (0.5 * 30.0 * totalTime * totalTime) / totalTime;
    }

    // Unconditionally clear heldObjectId across all player records and queued inputs
    for (const p of this.players.values()) {
      if (p.heldObjectId === targetObjId) {
        p.heldObjectId = null;
      }
      if (p.inputQueue) {
        for (const inp of p.inputQueue) {
          if (inp.heldObjectId === targetObjId) {
            inp.heldObjectId = null;
          }
        }
      }
    }
  }

  executeDrop(playerId, objectId, vx, vy, vz, startX, startY, startZ) {
    const player = this.players.get(playerId);
    const targetObjId = objectId || (player ? player.heldObjectId : null);
    if (!targetObjId) return;

    // If player recently committed a throw of this object, do NOT drop it!
    if (player && player.lastThrownObjectId === targetObjId && (Date.now() - (player.lastThrowTime || 0)) < 700) {
      return;
    }

    const obj = this.objects.get(targetObjId);
    if (!obj) return;

    obj.isHeld = false;
    obj.heldBy = null;
    obj.lastThrower = playerId;

    if (typeof startX === 'number' && typeof startY === 'number') {
      obj.x = startX;
      obj.y = startY;
    }
    if (typeof startZ === 'number') {
      obj.z = startZ;
    }

    if (typeof vx === 'number' && typeof vy === 'number' && typeof vz === 'number') {
      obj.vx = vx;
      obj.vy = vy;
      obj.vz = vz;
    } else if (player) {
      obj.vx = player.vx;
      obj.vy = player.vy;
      obj.vz = player.vz;
    }

    // Unconditionally clear heldObjectId across all player records and queued inputs
    for (const p of this.players.values()) {
      if (p.heldObjectId === targetObjId) {
        p.heldObjectId = null;
      }
      if (p.inputQueue) {
        for (const inp of p.inputQueue) {
          if (inp.heldObjectId === targetObjId) {
            inp.heldObjectId = null;
          }
        }
      }
    }
  }


  calculateHeldObjectPosition(player, obj) {

    const defaultHandDist = (player.colliderRadius || 0.44) + (obj.radius || 0.26) * 0.5 + 0.08;
    const dirX = Math.cos(player.facingAngle);
    const dirY = Math.sin(player.facingAngle);
    const heldZ = player.z + 0.45;

    // When standing at or above wall height (Layer 2), ground walls are beneath and do not block
    if (player.z >= this.wallHeight) {
      return {
        x: player.x + dirX * defaultHandDist,
        y: player.y + dirY * defaultHandDist,
        z: heldZ,
      };
    }

    const objRadius = obj.radius || 0.26;
    const safetyMargin = 0.12;
    const reqClearance = objRadius + safetyMargin;
    let minHitDistance = Infinity;

    for (const wall of this.walls) {
      const x1 = wall.x;
      const x2 = wall.x + wall.width;
      const y1 = wall.y;
      const y2 = wall.y + wall.height;
      const R = reqClearance;

      if (dirX > 0.0001 && player.x < x1 - R) {
        const t = (x1 - R - player.x) / dirX;
        const hitY = player.y + t * dirY;
        if (hitY >= y1 - R && hitY <= y2 + R && t < minHitDistance) minHitDistance = t;
      }
      if (dirX < -0.0001 && player.x > x2 + R) {
        const t = (x2 + R - player.x) / dirX;
        const hitY = player.y + t * dirY;
        if (hitY >= y1 - R && hitY <= y2 + R && t < minHitDistance) minHitDistance = t;
      }
      if (dirY > 0.0001 && player.y < y1 - R) {
        const t = (y1 - R - player.y) / dirY;
        const hitX = player.x + t * dirX;
        if (hitX >= x1 - R && hitX <= x2 + R && t < minHitDistance) minHitDistance = t;
      }
      if (dirY < -0.0001 && player.y > y2 + R) {
        const t = (y2 + R - player.y) / dirY;
        const hitX = player.x + t * dirX;
        if (hitX >= x1 - R && hitX <= x2 + R && t < minHitDistance) minHitDistance = t;
      }
    }

    const maxAllowedDist = isFinite(minHitDistance)
      ? Math.max(0, minHitDistance - 0.08)
      : defaultHandDist;
    const finalDist = Math.min(defaultHandDist, maxAllowedDist);

    return {
      x: player.x + dirX * finalDist,
      y: player.y + dirY * finalDist,
      z: heldZ,
    };
  }

  startSimulation() {
    const intervalMs = 1000 / 60; // 60Hz
    let lastTime = Date.now();

    setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      this.serverTick++;
      this.stepPhysics(this.fixedDt);

      // Broadcast world state every 2 ticks (30Hz broadcast for bandwidth efficiency)
      if (this.serverTick % 2 === 0 && this.clients.size > 0) {
        this.broadcast({
          type: 'world_state',
          serverTick: this.serverTick,
          timestamp: Date.now(),
          players: this.serializePlayers(),
          objects: this.serializeObjects(),
        });
      }
    }, intervalMs);
  }

  stepPhysics(dt) {
    // 1. Process player inputs & movement
    for (const player of this.players.values()) {
      const input = player.inputQueue.shift() || {
        moveVector: { x: 0, y: 0 },
        isGrabHeld: false,
        isThrowHeld: false,
        mousePos: null,
        isClimbHeld: false,
        isSprinting: false,
      };

      player.isSprinting = input.isSprinting;
      const speedMult = player.isSprinting ? 1.55 : 1.0;
      const baseSpeed = 4.2;
      const targetVx = input.moveVector.x * baseSpeed * speedMult;
      const targetVy = input.moveVector.y * baseSpeed * speedMult;

      const accel = 18.0;
      player.vx += (targetVx - player.vx) * Math.min(1.0, accel * dt);
      player.vy += (targetVy - player.vy) * Math.min(1.0, accel * dt);

      player.isActivelyWalking = Math.hypot(input.moveVector.x, input.moveVector.y) > 0.1;

      // Facing angle
      if (input.mousePos) {
        player.facingAngle = Math.atan2(input.mousePos.y - player.y, input.mousePos.x - player.x);
        player.isAiming = true;
        player.aimTarget = input.mousePos;
      } else if (player.isActivelyWalking) {
        player.facingAngle = Math.atan2(player.vy, player.vx);
        player.isAiming = false;
      }

      // Update position
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Arena boundary collision
      const r = player.colliderRadius;
      const arenaW = this.cols * this.tileSize;
      const arenaH = this.rows * this.tileSize;
      if (player.x < r) { player.x = r; player.vx = 0; }
      if (player.x > arenaW - r) { player.x = arenaW - r; player.vx = 0; }
      if (player.y < r) { player.y = r; player.vy = 0; }
      if (player.y > arenaH - r) { player.y = arenaH - r; player.vy = 0; }

      // Supporting surface check for player (wall elevation or floor)
      let pSurfaceHeight = 0;
      if (player.z >= this.wallHeight - 0.05 || (player.supportingSurfaceHeight && player.supportingSurfaceHeight >= this.wallHeight - 0.05)) {
        const pWall = this.getSupportingWall(player.x, player.y, player.colliderRadius);
        if (pWall) {
          player.standingWall = pWall;
          pSurfaceHeight = pWall.wallHeight;
        } else {
          player.standingWall = null;
          pSurfaceHeight = 0;
        }
      } else {
        player.standingWall = null;
        pSurfaceHeight = 0;
      }
      player.supportingSurfaceHeight = pSurfaceHeight;

      // Wall climbing & Jumping (Space / Controller A)
      if (input.isClimbHeld) {
        if (player.z < this.wallHeight) {
          const nearWall = this.getSupportingWall(player.x, player.y, player.colliderRadius + 0.15);
          if (nearWall) {
            player.isClimbing = true;
          }
        }
        if (!player.isClimbing) {
          const isGrounded = (Math.abs(player.z - pSurfaceHeight) <= 0.08 && Math.abs(player.vz) <= 0.8);
          if (isGrounded) {
            const heldObj = player.heldObjectId ? this.objects.get(player.heldObjectId) : null;
            const carriedMass = (heldObj && heldObj.mass) ? heldObj.mass : 0;
            const totalMass = Math.max(0.2, (player.mass || 1.2) + carriedMass);
            const takeoffSpeed = Math.min(9.67, 18.5 / totalMass);
            player.vz = takeoffSpeed;
            player.z = Math.max(player.z, pSurfaceHeight + 0.02);
            player.standingWall = null;
          }
        }
      }

      if (player.isClimbing) {
        player.z = Math.min(this.wallHeight, Math.max(player.z, 0) + 3.0 * dt);
        player.vz = 0;
        if (player.z >= this.wallHeight) {
          player.isClimbing = false;
          player.z = this.wallHeight;
          player.supportingSurfaceHeight = this.wallHeight;
        }
      } else if (player.z > pSurfaceHeight || player.vz !== 0) {
        player.vz -= 30.0 * dt;
        player.z += player.vz * dt;
        if (player.z <= pSurfaceHeight) {
          player.z = pSurfaceHeight;
          player.vz = 0;
        }
      }

      // Wall collision for ground-level players against synchronized grid (Layer 1)
      if (player.z < this.wallHeight) {
        this.resolveCircleWallsAgainstGrid(player);
      }

      // Handle Grab / Throw / Drop actions
      if (input.throwEvent) {
        this.executeThrow(
          player.id,
          input.throwEvent.objectId,
          input.throwEvent.vx,
          input.throwEvent.vy,
          input.throwEvent.vz,
          input.throwEvent.targetX,
          input.throwEvent.targetY,
          input.throwEvent.startX,
          input.throwEvent.startY,
          input.throwEvent.startZ
        );
      } else if (input.dropEvent) {
        this.executeDrop(
          player.id,
          input.dropEvent.objectId,
          input.dropEvent.vx,
          input.dropEvent.vy,
          input.dropEvent.vz,
          input.dropEvent.startX,
          input.dropEvent.startY,
          input.dropEvent.startZ
        );
      } else if (input.isThrowHeld && player.heldObjectId) {
        this.executeThrow(
          player.id,
          player.heldObjectId,
          undefined,
          undefined,
          undefined,
          input.mousePos?.x,
          input.mousePos?.y
        );
      } else if (input.heldObjectId) {
        // Client authoritatively holds input.heldObjectId
        const obj = this.objects.get(input.heldObjectId);
        if (obj && obj.lastThrower !== player.id) {
          if (player.heldObjectId !== input.heldObjectId) {
            if (player.heldObjectId) {
              const oldObj = this.objects.get(player.heldObjectId);
              if (oldObj) { oldObj.isHeld = false; oldObj.heldBy = null; }
            }
            if (!obj.isHeld || obj.heldBy === player.id) {
              obj.isHeld = true;
              obj.heldBy = player.id;
              player.heldObjectId = obj.id;
            }
          }
        }
      } else if (player.heldObjectId && input.heldObjectId === null && !input.isGrabHeld && !input.isThrowHeld) {
        // Client released or dropped held object (ignore if during committed throw window)
        const timeSinceThrow = Date.now() - (player.lastThrowTime || 0);
        if (timeSinceThrow > 600) {
          const heldObj = this.objects.get(player.heldObjectId);
          if (!heldObj || (heldObj.lastThrower !== player.id && player.lastThrownObjectId !== player.heldObjectId)) {
            this.executeDrop(player.id, player.heldObjectId);
          }
        }
      } else if (input.isGrabHeld && !player.heldObjectId) {
        const timeSinceThrow = Date.now() - (player.lastThrowTime || 0);
        if (timeSinceThrow > 500) {
          let closestObj = null;
          let closestDist = 1.8; // 3D reach distance with network tolerance
          for (const obj of this.objects.values()) {
            if (obj.isHeld) continue;
            if (obj.lastThrower === player.id || obj.id === player.lastThrownObjectId) continue;
            const deltaMagnitude = Math.hypot(obj.x - player.x, obj.y - player.y, obj.z - player.z);
            if (deltaMagnitude <= closestDist) {
              closestDist = deltaMagnitude;
              closestObj = obj;
            }
          }
          if (closestObj) {
            closestObj.isHeld = true;
            closestObj.heldBy = player.id;
            player.heldObjectId = closestObj.id;
          }
        }
      }


      // Update held object position to attach cleanly in front of hands along facing angle,
      // dynamically clamped outside walls so it never clips
      if (player.heldObjectId) {
        const obj = this.objects.get(player.heldObjectId);
        if (obj) {
          const holdPos = this.calculateHeldObjectPosition(player, obj);
          obj.x = holdPos.x;
          obj.y = holdPos.y;
          obj.z = holdPos.z;
          obj.vx = player.vx;
          obj.vy = player.vy;
          obj.vz = 0;
        }
      }
    }

    // 2. Update dynamic freebody objects
    for (const obj of this.objects.values()) {
      if (obj.isHeld) continue;

      // Surface height check: resting on wall top (Layer 2) or floor (Layer 1)
      let surfaceHeight = 0;
      if (obj.z >= this.wallHeight - 0.05 || (obj.supportingSurfaceHeight && obj.supportingSurfaceHeight >= this.wallHeight - 0.05)) {
        const wall = this.getSupportingWall(obj.x, obj.y, obj.radius);
        if (wall) {
          obj.standingWall = wall;
          surfaceHeight = wall.wallHeight;
        } else {
          obj.standingWall = null;
          surfaceHeight = 0;
        }
      } else {
        obj.standingWall = null;
        surfaceHeight = 0;
      }
      obj.supportingSurfaceHeight = surfaceHeight;

      // Vertical gravity & bouncing against surfaceHeight
      if (obj.z > surfaceHeight || obj.vz !== 0) {
        obj.vz -= 30.0 * dt;
        obj.z += obj.vz * dt;
        if (obj.z <= surfaceHeight) {
          obj.z = surfaceHeight;
          if (obj.vz < -1.0) {
            obj.vz = -obj.vz * (obj.bounceMod || 0.3);
          } else {
            obj.vz = 0;
          }
        }
      }

      // Clear lastThrower once departed from reach or landed safely outside thrower
      if (obj.lastThrower) {
        const thrower = this.players.get(obj.lastThrower);
        const dist2D = thrower ? Math.hypot(obj.x - thrower.x, obj.y - thrower.y) : 999;
        const minSafeDist = (obj.radius || 0.3) + 0.44 + 0.05;
        if (!thrower || Math.hypot(obj.x - thrower.x, obj.y - thrower.y, obj.z - thrower.z) > 1.8 || (obj.z <= surfaceHeight + 0.02 && dist2D > minSafeDist)) {
          obj.lastThrower = null;
        }
      }


      // Ground / wall-top friction
      if (obj.z <= surfaceHeight + 0.02) {
        const frictionCoeff = 3.5;
        obj.vx -= obj.vx * Math.min(1.0, frictionCoeff * dt);
        obj.vy -= obj.vy * Math.min(1.0, frictionCoeff * dt);
        if (Math.hypot(obj.vx, obj.vy) < 0.05) {
          obj.vx = 0;
          obj.vy = 0;
        }
      }

      // Horizontal displacement
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // Arena boundary collision
      const r = obj.radius;
      const arenaW = this.cols * this.tileSize;
      const arenaH = this.rows * this.tileSize;
      if (obj.x < r) { obj.x = r; obj.vx = -obj.vx * (obj.bounceMod || 0.3); }
      if (obj.x > arenaW - r) { obj.x = arenaW - r; obj.vx = -obj.vx * (obj.bounceMod || 0.3); }
      if (obj.y < r) { obj.y = r; obj.vy = -obj.vy * (obj.bounceMod || 0.3); }
      if (obj.y > arenaH - r) { obj.y = arenaH - r; obj.vy = -obj.vy * (obj.bounceMod || 0.3); }

      // Wall collision against synchronized grid ONLY if below wall height (Layer 1)
      if (obj.z < this.wallHeight) {
        this.resolveCircleWallsAgainstGrid(obj);
      }
    }

    // 3. Swept TOI contact rollback collisions between all bodies
    const all = [...this.players.values(), ...Array.from(this.objects.values()).filter(o => !o.isHeld)];
    this.resolveTOICollisions(all);
  }

  resolveCircleWallsAgainstGrid(circle) {
    const r = circle.colliderRadius || circle.radius || 0.35;
    const minCol = Math.max(0, Math.floor(circle.x - r));
    const maxCol = Math.min(this.cols - 1, Math.floor(circle.x + r));
    const minRow = Math.max(0, Math.floor(circle.y - r));
    const maxRow = Math.min(this.rows - 1, Math.floor(circle.y + r));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (this.tileGrid[row][col] === 1) {
          this.resolveCircleWall(circle, {
            x: col * this.tileSize,
            y: row * this.tileSize,
            width: this.tileSize,
            height: this.tileSize,
          });
        }
      }
    }
  }

  resolveCircleWall(circle, wall) {
    const r = circle.colliderRadius || circle.radius || 0.35;
    const closestX = Math.max(wall.x, Math.min(circle.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(circle.y, wall.y + wall.height));
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < r * r && distSq > 0.000001) {
      const dist = Math.sqrt(distSq);
      const overlap = r - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      circle.x += nx * overlap;
      circle.y += ny * overlap;

      const dot = circle.vx * nx + circle.vy * ny;
      if (dot < 0) {
        const bounce = circle.bounceMod || 0;
        circle.vx -= (1 + bounce) * dot * nx;
        circle.vy -= (1 + bounce) * dot * ny;
      }
    }
  }

  resolveTOICollisions(entities) {
    const count = entities.length;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = entities[i];
        const b = entities[j];

        const tierA = (a.z >= this.wallHeight) ? 2 : 1;
        const tierB = (b.z >= this.wallHeight) ? 2 : 1;
        if (tierA !== tierB) continue;

        // Skip any collision involving held objects
        if (a.isHeld || b.isHeld) continue;
        if (a.heldObjectId === b.id || b.heldObjectId === a.id) continue;

        // Skip collision between thrower and their newly thrown/dropped object while departing
        if (a.lastThrower === b.id || b.lastThrower === a.id) continue;

        // If a player is actively holding grab (or holding the object), do NOT repel the object away
        if ((a.inputQueue && a.inputQueue.some(inp => inp.isGrabHeld) && !b.inputQueue) ||
            (b.inputQueue && b.inputQueue.some(inp => inp.isGrabHeld) && !a.inputQueue)) {
          continue;
        }

        const rA = a.colliderRadius || a.radius || 0.35;
        const rB = b.colliderRadius || b.radius || 0.35;
        const minDist = rA + rB;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDist * minDist && distSq > 0.000001) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const invMassA = 1 / Math.max(0.1, a.mass || 1.0);
          const invMassB = 1 / Math.max(0.1, b.mass || 1.0);
          const sumInv = invMassA + invMassB;

          // Rewind overlap along normal
          a.x -= nx * overlap * (invMassA / sumInv);
          a.y -= ny * overlap * (invMassA / sumInv);
          b.x += nx * overlap * (invMassB / sumInv);
          b.y += ny * overlap * (invMassB / sumInv);

          // Velocity impulse
          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const velAlongNormal = relVx * nx + relVy * ny;

          if (velAlongNormal < 0) {
            const restitution = Math.max(0, Math.min(0.8, Math.max(a.bounceMod || 0, b.bounceMod || 0)));
            const impulse = (-(1 + restitution) * velAlongNormal) / sumInv;

            a.vx -= impulse * invMassA * nx;
            a.vy -= impulse * invMassA * ny;
            b.vx += impulse * invMassB * nx;
            b.vy += impulse * invMassB * ny;
          }
        }
      }
    }
  }

  serializePlayers() {
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      clientId: p.clientId,
      localId: p.localId,
      playerNumber: p.playerNumber,
      name: p.name,
      color: p.color,
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
      z: Number(p.z.toFixed(3)),
      vx: Number(p.vx.toFixed(3)),
      vy: Number(p.vy.toFixed(3)),
      vz: Number(p.vz.toFixed(3)),
      supportingSurfaceHeight: Number((p.supportingSurfaceHeight || 0).toFixed(3)),
      facingAngle: Number(p.facingAngle.toFixed(3)),
      isSprinting: p.isSprinting,
      isActivelyWalking: p.isActivelyWalking,
      isClimbing: p.isClimbing,
      heldObjectId: p.heldObjectId,
      isAiming: p.isAiming,
      aimTarget: p.aimTarget ? { x: Number(p.aimTarget.x.toFixed(3)), y: Number(p.aimTarget.y.toFixed(3)) } : null,
    }));
  }

  serializeObjects() {
    return Array.from(this.objects.values()).map((o) => ({
      id: o.id,
      name: o.name,
      x: Number(o.x.toFixed(3)),
      y: Number(o.y.toFixed(3)),
      z: Number(o.z.toFixed(3)),
      vx: Number(o.vx.toFixed(3)),
      vy: Number(o.vy.toFixed(3)),
      vz: Number(o.vz.toFixed(3)),
      supportingSurfaceHeight: Number((o.supportingSurfaceHeight || 0).toFixed(3)),
      radius: o.radius,
      mass: o.mass,
      color: o.color,
      shape: o.shape,
      bounceMod: o.bounceMod || 0.3,
      isHeld: o.isHeld,
      heldBy: o.heldBy,
    }));
  }

  sendJson(ws, obj) {
    if (ws.readyState === 1 /* OPEN */) {
      try {
        ws.send(JSON.stringify(obj));
      } catch (e) {
        // Ignore send errors on disconnecting socket
      }
    }
  }

  broadcast(obj) {
    const payload = JSON.stringify(obj);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === 1 /* OPEN */) {
        try {
          client.ws.send(payload);
        } catch (e) {
          // Ignore
        }
      }
    }
  }
}
