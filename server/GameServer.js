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
    return true;
  }

  setWallTile(col, row, isWall) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    this.tileGrid[row][col] = isWall ? 1 : 0;
    this.wallMapString = this.exportWallMapBinaryString();
    this.rebuildWalls();
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

  initDefaultObjects() {
    const defaults = [
      { id: "stone-1", name: "Light Blue Box", x: 6.8, y: 4.4, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.26, mass: 0.7, color: "#38bdf8", bounceMod: 0.25, shape: "box" },
      { id: "stone-2", name: "Orange Boulder", x: 13.2, y: 9.6, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.38, mass: 1.8, color: "#fb923c", bounceMod: 0.35, shape: "circle" },
      { id: "crate-1", name: "Emerald Crate", x: 10.0, y: 4.5, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.35, mass: 1.0, color: "#34d399", bounceMod: 0.2, shape: "box" },
      { id: "crate-2", name: "Purple Block", x: 10.0, y: 9.5, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.32, mass: 0.9, color: "#c084fc", bounceMod: 0.25, shape: "box" },
      { id: "food-1", name: "Golden Apple", x: 15.0, y: 4.0, z: 0, vx: 0, vy: 0, vz: 0, radius: 0.22, mass: 0.4, color: "#facc15", bounceMod: 0.5, shape: "circle" },
    ];

    for (const d of defaults) {
      this.objects.set(d.id, {
        ...d,
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
      };
      this.clients.set(ws, clientRecord);

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

    console.log('🎮 [GameServer] Authoritative Universal Lobby attached to /ws');
    return wss;
  }

  handleClientMessage(client, msg) {
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

    if (msg.type === 'register_player') {
      const { localId, name, color } = msg;
      const playerId = `${client.clientId}_${localId}`;
      const playerNum = this.nextPlayerNumber++;
      const assignedColor = color || PLAYER_COLORS[(playerNum - 1) % PLAYER_COLORS.length];

      // Spawn at friendly open coordinates in the trench (col 5, row 7)
      const spawnX = 5.0 + ((playerNum - 1) % 4) * 0.6;
      const spawnY = 7.0 + (Math.floor((playerNum - 1) / 4) % 2) * 0.5;

      const playerState = {
        id: playerId,
        clientId: client.clientId,
        localId,
        playerNumber: playerNum,
        name: name || `Player ${playerNum}`,
        color: assignedColor,
        x: spawnX,
        y: spawnY,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
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
        inputQueue: [],
      };

      this.players.set(playerId, playerState);
      client.localPlayers.add(playerId);

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
      if (Array.isArray(msg.inputs)) {
        for (const inp of msg.inputs) {
          const playerId = `${client.clientId}_${inp.localId}`;
          const player = this.players.get(playerId);
          if (player) {
            player.inputQueue.push({
              tick: msg.tick || this.serverTick,
              moveVector: inp.moveVector || { x: 0, y: 0 },
              isGrabHeld: Boolean(inp.isGrabHeld),
              isThrowHeld: Boolean(inp.isThrowHeld),
              mousePos: inp.mousePos || null,
              isClimbHeld: Boolean(inp.isClimbHeld),
              isSprinting: Boolean(inp.isSprinting),
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

    if (player.heldObjectId) {
      const obj = this.objects.get(player.heldObjectId);
      if (obj) {
        obj.isHeld = false;
        obj.heldBy = null;
      }
    }

    this.players.delete(playerId);

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

      // Wall collision for ground-level players against synchronized grid
      if (player.z < this.wallHeight) {
        this.resolveCircleWallsAgainstGrid(player);
      }

      // Handle Grab / Throw actions
      if (input.isThrowHeld && player.heldObjectId) {
        const obj = this.objects.get(player.heldObjectId);
        if (obj) {
          obj.isHeld = false;
          obj.heldBy = null;
          const throwSpeed = 9.0;
          const dir = player.facingAngle;
          obj.vx = Math.cos(dir) * throwSpeed;
          obj.vy = Math.sin(dir) * throwSpeed;
          obj.vz = 4.5; // Ballistic arc
        }
        player.heldObjectId = null;
      } else if (input.isGrabHeld && !player.heldObjectId) {
        let closestObj = null;
        let closestDist = 1.2; // reach distance
        for (const obj of this.objects.values()) {
          if (obj.isHeld) continue;
          const d = Math.hypot(obj.x - player.x, obj.y - player.y);
          if (d < closestDist) {
            closestDist = d;
            closestObj = obj;
          }
        }
        if (closestObj) {
          closestObj.isHeld = true;
          closestObj.heldBy = player.id;
          player.heldObjectId = closestObj.id;
        }
      }

      // Update held object position to attach in front of hands
      if (player.heldObjectId) {
        const obj = this.objects.get(player.heldObjectId);
        if (obj) {
          const holdDist = player.colliderRadius + obj.radius + 0.1;
          obj.x = player.x + Math.cos(player.facingAngle) * holdDist;
          obj.y = player.y + Math.sin(player.facingAngle) * holdDist;
          obj.z = player.z + 0.3;
          obj.vx = player.vx;
          obj.vy = player.vy;
          obj.vz = 0;
        }
      }
    }

    // 2. Update dynamic freebody objects
    for (const obj of this.objects.values()) {
      if (obj.isHeld) continue;

      if (obj.z > 0 || obj.vz !== 0) {
        obj.vz -= 18.0 * dt;
        obj.z += obj.vz * dt;
        if (obj.z <= 0) {
          obj.z = 0;
          if (obj.vz < -1.0) {
            obj.vz = -obj.vz * (obj.bounceMod || 0.3);
          } else {
            obj.vz = 0;
          }
        }
      }

      if (obj.z === 0) {
        const frictionCoeff = 3.5;
        obj.vx -= obj.vx * Math.min(1.0, frictionCoeff * dt);
        obj.vy -= obj.vy * Math.min(1.0, frictionCoeff * dt);
        if (Math.hypot(obj.vx, obj.vy) < 0.05) {
          obj.vx = 0;
          obj.vy = 0;
        }
      }

      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      const r = obj.radius;
      const arenaW = this.cols * this.tileSize;
      const arenaH = this.rows * this.tileSize;
      if (obj.x < r) { obj.x = r; obj.vx = -obj.vx * (obj.bounceMod || 0.3); }
      if (obj.x > arenaW - r) { obj.x = arenaW - r; obj.vx = -obj.vx * (obj.bounceMod || 0.3); }
      if (obj.y < r) { obj.y = r; obj.vy = -obj.vy * (obj.bounceMod || 0.3); }
      if (obj.y > arenaH - r) { obj.y = arenaH - r; obj.vy = -obj.vy * (obj.bounceMod || 0.3); }

      // Wall collision against synchronized grid only if below wall height
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
      radius: o.radius,
      mass: o.mass,
      color: o.color,
      shape: o.shape,
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
