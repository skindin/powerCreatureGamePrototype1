process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getAllFeedback, createFeedback, updateFeedbackStatus } from './server/feedbackStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');

// Deployment tracking for live browser update notifications (Railway environment variables)
const SERVER_BOOT_TIME = new Date().toISOString();
const DEPLOY_ID =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.RAILWAY_DEPLOYMENT_ID ||
  process.env.BUILD_ID ||
  SERVER_BOOT_TIME;
const COMMIT_HASH = (process.env.RAILWAY_GIT_COMMIT_SHA || '').substring(0, 7);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function sendFile(res, filePath, statusCode = 200) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
    };

    // Cache immutable assets with hash, no-cache for index.html
    if (filePath.includes(path.sep + 'assets' + path.sep)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache, must-revalidate';
    }

    res.writeHead(statusCode, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

let cachedBuildStatus = null;
let lastBuildStatusFetch = 0;
const BUILD_STATUS_CACHE_MS = 10000;

function getCurrentBranch() {
  try {
    const gitHead = fs.readFileSync(path.resolve(__dirname, '.git/HEAD'), 'utf8').trim();
    if (gitHead.startsWith('ref: refs/heads/')) {
      return gitHead.replace('ref: refs/heads/', '');
    }
  } catch {}
  return process.env.RAILWAY_GIT_BRANCH || 'dynamic-property-references';
}

async function getLiveBuildStatus() {
  const now = Date.now();
  if (cachedBuildStatus && (now - lastBuildStatusFetch) < BUILD_STATUS_CACHE_MS) {
    return cachedBuildStatus;
  }

  try {
    const headers = { 'User-Agent': 'PowerCreatureGame' };
    if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`;
    }

    const branch = getCurrentBranch();
    const res = await fetch(`https://api.github.com/repos/skindin/powerCreatureGamePrototype1/commits/${encodeURIComponent(branch)}/status`, {
      headers,
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return cachedBuildStatus || { state: 'unknown', isBuilding: false, isFailed: false, isSuccess: false };
    }

    const data = await res.json();
    const primary = data.statuses && data.statuses.length > 0 ? data.statuses[0] : null;
    const sha = data.sha || '';
    const shortSha = sha ? sha.substring(0, 7) : '';
    const state = data.state || 'unknown';
    const desc = primary?.description || (state === 'pending' ? 'Building on Railway...' : '');
    const targetUrl = primary?.target_url || '';

    const isBuilding = state === 'pending';
    const isFailed = state === 'failure' || state === 'error';
    const isSuccess = state === 'success';

    cachedBuildStatus = {
      state,
      sha,
      shortSha,
      description: desc,
      targetUrl,
      isBuilding,
      isFailed,
      isSuccess,
      lastChecked: new Date().toISOString(),
    };
    lastBuildStatusFetch = now;
    return cachedBuildStatus;
  } catch (err) {
    return cachedBuildStatus || { state: 'unknown', isBuilding: false, isFailed: false, isSuccess: false, error: err.message };
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const urlPath = decodeURIComponent(urlObj.pathname);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Feedback API endpoints
  if (urlPath === '/api/feedback') {
    if (req.method === 'GET') {
      const items = getAllFeedback();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
      res.end(JSON.stringify(items));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        if (!body.description || typeof body.description !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Description is required' }));
          return;
        }
        const created = createFeedback(body);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(created));
        return;
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }
    }
  }

  if (urlPath.startsWith('/api/feedback/') && req.method === 'PATCH') {
    const id = urlPath.replace('/api/feedback/', '');
    try {
      const body = await parseJsonBody(req);
      const updated = updateFeedbackStatus(id, body.completed);
      if (!updated) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Feedback not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(updated));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }
  }

  // Health check endpoint for Railway deployment monitoring
  if (urlPath === '/health' || urlPath === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('OK');
    return;
  }

  // WebSocket endpoint guard: if HTTP GET hits /ws, inform client to upgrade
  if (urlPath === '/ws' || urlPath.endsWith('/ws')) {
    res.writeHead(426, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Upgrade': 'WebSocket',
    });
    res.end('Upgrade Required: Connect via WebSocket (ws:// or wss://)');
    return;
  }

  // Room status diagnostic endpoint
  if (urlPath === '/api/room-status') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(JSON.stringify({
      attached: Boolean(universalRoomManager),
      error: universalRoomError,
      clients: universalRoomManager ? universalRoomManager.clients.size : 0,
      tick: universalRoomManager ? universalRoomManager.simulation.currentTick : 0,
    }));
    return;
  }

  // Version / deployment info endpoint for live browser notification
  if (urlPath === '/api/version' || urlPath === '/api/deploy-status') {
    const buildStatus = await getLiveBuildStatus();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(JSON.stringify({
      deployId: DEPLOY_ID,
      commit: COMMIT_HASH,
      bootTime: SERVER_BOOT_TIME,
      buildStatus,
    }));
    return;
  }

  // World Config API endpoints (Local Development Only)
  if (urlPath === '/api/dev/world-config') {
    const configPath = path.resolve(__dirname, 'src/config/worldConfig.json');
    const distConfigPath = path.resolve(__dirname, 'dist/config/worldConfig.json');
    const targetFile = fs.existsSync(configPath) ? configPath : (fs.existsSync(distConfigPath) ? distConfigPath : null);
    if (targetFile) {
      const data = fs.readFileSync(targetFile, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.end(data);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Config not found' }));
    }
    return;
  }

  if (urlPath === '/api/dev/save-config') {
    // Strict Security Guard: Only allow from localhost / loopback, never from tunnel or external production
    const reqHost = (req.headers['host'] || '').toLowerCase();
    const isLocal = reqHost.startsWith('localhost') || reqHost.startsWith('127.0.0.1');
    const isProduction = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_GIT_COMMIT_SHA);
    if (!isLocal || isProduction) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'World config saving is strictly disabled on production/remote servers' }));
      return;
    }

    try {
      const delta = await parseJsonBody(req);
      const configPath = path.resolve(__dirname, 'src/config/worldConfig.json');
      let currentConfig = {};
      try {
        if (fs.existsSync(configPath)) {
          currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch {}

      const updatedConfig = {
        version: (currentConfig.version || 1) + 1,
        lastSaved: new Date().toISOString(),
        arena: { ...(currentConfig.arena || {}), ...(delta.arena || {}) },
        globalPhysics: { ...(currentConfig.globalPhysics || {}), ...(delta.globalPhysics || {}) },
        player: delta.player ? { ...(currentConfig.player || {}), ...delta.player } : currentConfig.player,
        objects: [...(currentConfig.objects || [])],
      };

      if (delta.arena?.tileGrid) {
        updatedConfig.arena.tileGrid = delta.arena.tileGrid.map((row) => [...row]);
      }

      if (delta.objectsDelta) {
        const { upsert, deletedIds } = delta.objectsDelta;
        const objectMap = new Map();
        for (const obj of updatedConfig.objects) {
          objectMap.set(obj.id, obj);
        }
        if (deletedIds && Array.isArray(deletedIds)) {
          for (const id of deletedIds) objectMap.delete(id);
        }
        if (upsert && Array.isArray(upsert)) {
          for (const item of upsert) objectMap.set(item.id, item);
        }
        updatedConfig.objects = Array.from(objectMap.values());
      }

      const jsonStr = JSON.stringify(updatedConfig, null, 2);
      fs.writeFileSync(configPath, jsonStr, 'utf8');

      try {
        const distConfigPath = path.resolve(__dirname, 'dist/config/worldConfig.json');
        if (fs.existsSync(DIST_DIR)) {
          fs.mkdirSync(path.dirname(distConfigPath), { recursive: true });
          fs.writeFileSync(distConfigPath, jsonStr, 'utf8');
        }
      } catch {}

      if (universalRoomManager && typeof universalRoomManager.reloadWorldConfig === 'function') {
        universalRoomManager.reloadWorldConfig(updatedConfig);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, version: updatedConfig.version, lastSaved: updatedConfig.lastSaved }));
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Failed to save config delta', details: err?.message }));
      return;
    }
  }

  // Only allow GET and HEAD for static files
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('405 Method Not Allowed');
    return;
  }

  // Prevent directory traversal attacks
  const safeRelativePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let targetPath = path.join(DIST_DIR, safeRelativePath);

  // Ensure target stays inside DIST_DIR
  if (!targetPath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(targetPath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
      fs.stat(targetPath, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          sendFile(res, targetPath);
        } else {
          // SPA fallback to root index.html
          sendFile(res, path.join(DIST_DIR, 'index.html'));
        }
      });
      return;
    }

    if (!err && stats.isFile()) {
      sendFile(res, targetPath);
      return;
    }

    // SPA fallback: return index.html for non-asset routes
    const fallbackPath = path.join(DIST_DIR, 'index.html');
    fs.stat(fallbackPath, (err3, stats3) => {
      if (!err3 && stats3.isFile()) {
        sendFile(res, fallbackPath);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Build output not found. Please run "npm run build" first.');
      }
    });
  });
});

// Attach Authoritative Universal Multiplayer Room WebSocket Server (Phase 10)
let universalRoomManager = null;
let universalRoomError = null;
try {
  let UniversalRoomManager;
  try {
    const res = await import('./server/dist/UniversalRoomManager.js');
    UniversalRoomManager = res.UniversalRoomManager;
  } catch (_e) {
    const moduleUrl = pathToFileURL(path.join(__dirname, 'server', 'dist', 'UniversalRoomManager.js')).href;
    const res = await import(moduleUrl);
    UniversalRoomManager = res.UniversalRoomManager;
  }
  universalRoomManager = UniversalRoomManager.attach(server);
} catch (err) {
  universalRoomError = (err && (err.stack || err.message)) || String(err);
  console.error('❌ [UniversalRoom] Failed to attach UniversalRoomManager:', err);
}

server.listen(PORT, HOST, () => {
  console.log(`⚡ Power Creature Game server running at http://${HOST}:${PORT}`);
  console.log(`Serving static files from: ${DIST_DIR}`);
});

// Graceful shutdown handlers
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`Received ${signal}, closing HTTP server...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });
}
