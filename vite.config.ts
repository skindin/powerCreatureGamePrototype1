process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';
import { defineConfig, type Plugin, build } from 'vite';
import localtunnel from 'localtunnel';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

import { getAllFeedback, createFeedback, updateFeedbackStatus } from './server/feedbackStore.js';

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
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

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function serveDistFile(reqPath: string, res: any): boolean {
  let cleanPath = reqPath.split('?')[0];
  if (cleanPath === '/' || cleanPath === '') cleanPath = '/index.html';

  const distDir = path.resolve(__dirname, 'dist');
  const filePath = path.resolve(distDir, cleanPath.replace(/^\//, ''));
  if (!filePath.startsWith(distDir)) return false;

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (cleanPath.endsWith('.html') || cleanPath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    fs.createReadStream(filePath).pipe(res);
    return true;
  }
  return false;
}

let cachedBuildStatus: any = null;
let lastBuildStatusFetch = 0;
const BUILD_STATUS_CACHE_MS = 10000;

function getCurrentBranch(): string {
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
    const headers: Record<string, string> = { 'User-Agent': 'PowerCreatureGame' };
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

    const data: any = await res.json();
    const hasStatuses = Array.isArray(data.statuses) && data.statuses.length > 0;
    const primary = hasStatuses ? data.statuses[0] : null;
    const sha = data.sha || '';
    const shortSha = sha ? sha.substring(0, 7) : '';
    const rawState = data.state || 'unknown';
    // GitHub returns state: "pending" by default when total_count = 0 / statuses is empty.
    // We must only treat state as active if actual status checks exist.
    const state = hasStatuses ? rawState : (rawState === 'pending' ? 'idle' : rawState);
    const isBuilding = Boolean(hasStatuses && state === 'pending');
    const isFailed = Boolean(hasStatuses && (state === 'failure' || state === 'error'));
    const isSuccess = Boolean(hasStatuses && state === 'success');
    const desc = primary?.description || (isBuilding ? 'Building on Railway...' : '');
    const targetUrl = primary?.target_url || '';

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
  } catch (err: any) {
    return cachedBuildStatus || { state: 'unknown', isBuilding: false, isFailed: false, isSuccess: false, error: err?.message };
  }
}

function autoTunnelPlugin(): Plugin {
  let tunnelInstance: any = null;
  let isClosing = false;
  let retryTimer: any = null;

  async function connectTunnel(port: number) {
    if (isClosing) return;
    if (process.env.ENABLE_TUNNEL !== 'true') return;
    try {
      // Do not override local_host so the Host header reflects pcg-arena-teal.loca.lt
      const tunnel = await localtunnel({
        port,
        subdomain: 'pcg-arena-teal',
        local_host: '127.0.0.1',
      });

      // Strict enforcement: if localtunnel assigned a random fallback URL, close and retry until pcg-arena-teal is bound
      if (tunnel.url !== 'https://pcg-arena-teal.loca.lt') {
        console.warn(`⚠️ [AutoTunnel] Subdomain temporarily reserved (assigned ${tunnel.url}). Reclaiming 'pcg-arena-teal' in 4s...`);
        tunnel.close();
        if (!isClosing) {
          retryTimer = setTimeout(() => connectTunnel(port), 4000);
        }
        return;
      }

      tunnelInstance = tunnel;
      console.log(`\n======================================================`);
      console.log(`🚀 Nationwide Public URL Live: ${tunnel.url}`);
      console.log(`======================================================\n`);

      const payload = JSON.stringify({ active: true, url: 'https://pcg-arena-teal.loca.lt' }, null, 2);
      try { fs.writeFileSync(path.resolve(__dirname, 'public/tunnel.json'), payload); } catch {}
      try { fs.writeFileSync(path.resolve(__dirname, 'dist/tunnel.json'), payload); } catch {}

      tunnel.on('close', () => {
        tunnelInstance = null;
        if (!isClosing) {
          console.log('⚠️ [AutoTunnel] Disconnected. Reconnecting in 3s...');
          retryTimer = setTimeout(() => connectTunnel(port), 3000);
        }
      });

      tunnel.on('error', (err: any) => {
        console.warn('⚠️ [AutoTunnel] Notice:', err?.message || err);
      });
    } catch (err: any) {
      if (!isClosing) {
        console.warn('⚠️ [AutoTunnel] Connection failed, retrying in 4s...', err?.message || err);
        retryTimer = setTimeout(() => connectTunnel(port), 4000);
      }
    }
  }

  function cleanUpTunnel() {
    isClosing = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (tunnelInstance) {
      try { tunnelInstance.close(); } catch {}
      tunnelInstance = null;
    }
    const payload = JSON.stringify({ active: false, url: 'https://pcg-arena-teal.loca.lt' }, null, 2);
    try { fs.writeFileSync(path.resolve(__dirname, 'public/tunnel.json'), payload); } catch {}
    try { fs.writeFileSync(path.resolve(__dirname, 'dist/tunnel.json'), payload); } catch {}
  }

  let cachedGitStatus: any = null;
  let lastGitStatusCheck = 0;
  let inFlightGitCheck: Promise<any> | null = null;

  async function getGitStatusAsync() {
    const now = Date.now();
    if (cachedGitStatus && now - lastGitStatusCheck < 4000) {
      return cachedGitStatus;
    }
    if (inFlightGitCheck) {
      return inFlightGitCheck;
    }

    inFlightGitCheck = (async () => {
      try {
        const [branchRes, headRes, configRes] = await Promise.all([
          execAsync('git branch --show-current', { encoding: 'utf8', timeout: 3000 }).catch(() => ({ stdout: 'clean-physics-baseline' })),
          execAsync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 3000 }).catch(() => ({ stdout: '' })),
          execAsync('git status --porcelain src/config/worldConfig.json', { encoding: 'utf8', timeout: 3000 }).catch(() => ({ stdout: '' })),
        ]);

        const branch = branchRes.stdout.trim() || 'clean-physics-baseline';
        const headCommit = headRes.stdout.trim();
        const dataModified = configRes.stdout.trim().length > 0;

        let aheadCount = 0;
        try {
          const aheadRes = await execAsync(`git rev-list --count origin/${branch}..HEAD`, { encoding: 'utf8', timeout: 3000 });
          aheadCount = parseInt(aheadRes.stdout.trim(), 10) || 0;
        } catch {}

        let codeModified = false;
        let codeFilesCount = 0;
        try {
          const allRes = await execAsync('git status --porcelain src/', { encoding: 'utf8', timeout: 3000 });
          const codeLines = allRes.stdout.trim().split('\n').filter((l) => l.trim() && !l.includes('worldConfig.json'));
          codeModified = codeLines.length > 0;
          codeFilesCount = codeLines.length;
        } catch {}

        cachedGitStatus = {
          branch,
          headCommit,
          dataModified,
          aheadCount,
          codeModified,
          codeFilesCount,
        };
        lastGitStatusCheck = Date.now();
        return cachedGitStatus;
      } finally {
        inFlightGitCheck = null;
      }
    })();

    return inFlightGitCheck;
  }

  function getLastSyncInfo(): { timestamp: number; commit: string } {
    try {
      const p = path.resolve(__dirname, 'dist/.last-sync.json');
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch {}
    return { timestamp: 0, commit: '' };
  }

  function saveLastSyncInfo(info: { timestamp: number; commit: string }) {
    try {
      const p = path.resolve(__dirname, 'dist/.last-sync.json');
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(info), 'utf8');
    } catch {}
  }

  function hasSourceCodeChangedSince(sinceMs: number): boolean {
    if (sinceMs <= 0) return true;
    try {
      const srcDir = path.resolve(__dirname, 'src');
      const indexHtml = path.resolve(__dirname, 'index.html');
      if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).mtimeMs > sinceMs) return true;

      function checkDir(dir: string): boolean {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (checkDir(full)) return true;
          } else if (entry.isFile()) {
            if (entry.name === 'worldConfig.json') continue;
            if (fs.statSync(full).mtimeMs > sinceMs) return true;
          }
        }
        return false;
      }
      return checkDir(srcDir);
    } catch {
      return true;
    }
  }

  return {
    name: 'auto-localtunnel',
    handleHotUpdate({ file }) {
      if (file.includes('worldConfig')) {
        // Return empty array to strictly prevent any HMR or page reload when worldConfig.json changes
        return [];
      }
    },
    configureServer(server) {
      let activeRoomManager: any = null;
      const getRoomManager = async () => {
        if (activeRoomManager) return activeRoomManager;
        try {
          const mod = await server.ssrLoadModule?.('/src/server/UniversalRoomManager.ts');
          if (mod?.UniversalRoomManager) {
            activeRoomManager = mod.UniversalRoomManager;
            return activeRoomManager;
          }
        } catch (err: any) {
          console.warn('⚠️ [Vite] Could not SSR load UniversalRoomManager.ts, falling back:', err?.message || err);
        }
        try {
          const mod = await import('./server/dist/UniversalRoomManager.js');
          if (mod?.UniversalRoomManager) {
            activeRoomManager = mod.UniversalRoomManager;
            return activeRoomManager;
          }
        } catch (err: any) {}
        return null;
      };

      if (server.httpServer) {
        getRoomManager().then((UniversalRoomManager) => {
          if (UniversalRoomManager) {
            UniversalRoomManager.attach(server.httpServer!);
          }
        });
      }

      // 1. Intercept public tunnel requests (loca.lt) and serve the single pre-bundled production dist/
      // This prevents 50+ concurrent unbundled ESM requests from choking localtunnel with 502 Bad Gateway
      server.middlewares.use(async (req, res, next) => {
        const host = (req.headers['host'] || '').toString().toLowerCase();
        const forwardedHost = (req.headers['x-forwarded-host'] || '').toString().toLowerCase();
        const isTunnel =
          forwardedHost.includes('loca.lt') ||
          host.includes('loca.lt') ||
          Boolean(req.headers['bypass-tunnel-reminder']);

        const rawUrl = req.url || '/';
        const urlObj = new URL(rawUrl, `http://${req.headers['host'] || 'localhost'}`);
        const urlPath = decodeURIComponent(urlObj.pathname);

        // World Config API endpoints (Local Development Only)
        if (urlPath === '/api/dev/world-config') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          const configPath = path.resolve(__dirname, 'src/config/worldConfig.json');
          if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.end(data);
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Config not found' }));
          }
          return;
        }

        if (urlPath === '/api/dev/save-config') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          // Strict Security Guard: Only allow from local machine/LAN, never from external public tunnel
          if (isTunnel) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'World config saving is not permitted via public tunnel' }));
            return;
          }

          parseJsonBody(req).then((delta: any) => {
            const configPath = path.resolve(__dirname, 'src/config/worldConfig.json');
            let currentConfig: any = {};
            try {
              if (fs.existsSync(configPath)) {
                currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              }
            } catch {}

            function deepMerge(target: any, source: any): any {
              if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
              const result = { ...(target || {}) };
              for (const key of Object.keys(source)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                  result[key] = deepMerge(result[key], source[key]);
                } else {
                  result[key] = source[key];
                }
              }
              return result;
            }

            // Merge delta selectively
            const updatedConfig: any = {
              version: (currentConfig.version || 1) + 1,
              lastSaved: new Date().toISOString(),
              arena: { ...(currentConfig.arena || {}), ...(delta.arena || {}) },
              globalPhysics: { ...(currentConfig.globalPhysics || {}), ...(delta.globalPhysics || {}) },
              player: delta.player ? deepMerge(currentConfig.player || {}, delta.player) : currentConfig.player,
              objects: [...(currentConfig.objects || [])],
              prefabs: currentConfig.prefabs ? [...currentConfig.prefabs] : undefined,
            };

            if (delta.arena?.tileGrid) {
              updatedConfig.arena.tileGrid = delta.arena.tileGrid.map((row: any) => [...row]);
            }

            if (delta.objectsDelta) {
              if (delta.objectsDelta.replaceAll && Array.isArray(delta.objectsDelta.replaceAll)) {
                updatedConfig.objects = [...delta.objectsDelta.replaceAll];
              } else {
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
            }

            if (delta.prefabsDelta) {
              if (delta.prefabsDelta.replaceAll && Array.isArray(delta.prefabsDelta.replaceAll)) {
                updatedConfig.prefabs = [...delta.prefabsDelta.replaceAll];
              } else {
                const { upsert, deletedIds } = delta.prefabsDelta;
                const prefabMap = new Map();
                for (const p of (updatedConfig.prefabs || [])) {
                  prefabMap.set(p.id, p);
                }
                if (deletedIds && Array.isArray(deletedIds)) {
                  for (const id of deletedIds) prefabMap.delete(id);
                }
                if (upsert && Array.isArray(upsert)) {
                  for (const item of upsert) prefabMap.set(item.id, item);
                }
                updatedConfig.prefabs = Array.from(prefabMap.values());
              }
            }

            const jsonStr = JSON.stringify(updatedConfig, null, 2);
            fs.writeFileSync(configPath, jsonStr, 'utf8');

            // Keep moduleGraph fresh for future reads without triggering HMR reload
            try {
              const mod = server.moduleGraph.getModuleById(configPath);
              if (mod) server.moduleGraph.invalidateModule(mod);
            } catch {}

            // Also keep public/dist in sync if present
            try {
              const distConfigPath = path.resolve(__dirname, 'dist/config/worldConfig.json');
              if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
                fs.mkdirSync(path.dirname(distConfigPath), { recursive: true });
                fs.writeFileSync(distConfigPath, jsonStr, 'utf8');
              }
            } catch {}

            // Hot reload UniversalRoomManager in background without triggering dev server SSR re-eval
            getRoomManager().then((UniversalRoomManager) => {
              UniversalRoomManager?.getInstance().reloadWorldConfig?.(updatedConfig);
            }).catch(() => {});

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: true, version: updatedConfig.version, lastSaved: updatedConfig.lastSaved }));
          }).catch((err) => {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Failed to parse delta payload', details: err?.message }));
          });
          return;
        }

        // Git Data Status API (inspects worldConfig, ahead commits, and active branch non-blockingly)
        if (urlPath === '/api/dev/git-status') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          try {
            const status = await getGitStatusAsync();
            res.statusCode = 200;
            res.end(JSON.stringify(status));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || String(err) }));
          }
          return;
        }

        // Git Push Data API (Commits and pushes ONLY worldConfig.json)
        if (urlPath === '/api/dev/git-push-data') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (isTunnel) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'Git push operations are prohibited via public tunnel' }));
            return;
          }

          try {
            const branch = execSync('git branch --show-current', { encoding: 'utf8', timeout: 2000 }).trim() || 'clean-physics-baseline';

            // Check if worldConfig.json has uncommitted changes
            const configStatus = execSync('git status --porcelain src/config/worldConfig.json', { encoding: 'utf8', timeout: 2000 }).trim();
            let commitCreated = false;
            if (configStatus.length > 0) {
              execSync('git add src/config/worldConfig.json', { encoding: 'utf8', timeout: 2000 });
              execSync('git commit -m "chore(data): update world properties and configuration from editor"', { encoding: 'utf8', timeout: 4000 });
              commitCreated = true;
            }

            // Push to remote branch
            execSync(`git push origin ${branch}`, { encoding: 'utf8', timeout: 20000 });
            const newHead = execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 2000 }).trim();
            cachedGitStatus = null;
            lastGitStatusCheck = 0;

            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              branch,
              commitSha: newHead,
              commitCreated,
              message: `Successfully pushed data to origin/${branch}`,
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || String(err) }));
          }
          return;
        }

        // Sync & Rebuild API (Verifies tsc, rebuilds dist snapshot, reloads server)
        if (urlPath === '/api/dev/sync-rebuild') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (isTunnel) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: 'Sync/rebuild prohibited via public tunnel' }));
            return;
          }

          let currentHead = '';
          try {
            currentHead = execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 2000 }).trim();
          } catch {}

          const lastSync = getLastSyncInfo();
          const codeChanged = hasSourceCodeChangedSince(lastSync.timestamp);
          const commitChanged = currentHead !== lastSync.commit;

          // Instant return if no code has changed and commit is unchanged
          if (!codeChanged && !commitChanged && lastSync.timestamp > 0) {
            console.log(`⚡ [SyncRebuild] Code is already up to date (${currentHead}). Reusing snapshot in <10ms.`);
            try {
              const configPath = path.resolve(__dirname, 'src/config/worldConfig.json');
              if (fs.existsSync(configPath)) {
                const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const UniversalRoomManager = await getRoomManager();
                UniversalRoomManager?.getInstance().reloadWorldConfig?.(cfg);
              }
            } catch {}
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              commitSha: currentHead,
              timestamp: new Date().toISOString(),
              message: 'Runtime snapshot is already up to date.',
            }));
            return;
          }

          // Pre-flight type check to prevent compiling broken code mid-agent-edit
          try {
            console.log('🔍 [SyncRebuild] Checking TypeScript compilation...');
            const tscPath = path.resolve(__dirname, 'node_modules/typescript/bin/tsc');
            execSync(`"${process.execPath}" "${tscPath}" --noEmit`, { encoding: 'utf8', timeout: 20000, stdio: 'pipe' });
          } catch (tscErr: any) {
            const details = tscErr.stdout || tscErr.stderr || tscErr.message;
            console.warn('⚠️ [SyncRebuild] TypeScript errors detected. Aborting rebuild snapshot:', details);
            res.statusCode = 422;
            res.end(JSON.stringify({
              success: false,
              error: 'TypeScript compile errors detected. An agent may be actively editing code.',
              details,
            }));
            return;
          }

          try {
            console.log('🔄 [SyncRebuild] Rebuilding client and server bundles...');
            await build({ build: { emptyOutDir: false } });
            await build({ build: { ssr: 'src/server/UniversalRoomManager.ts', outDir: 'server/dist', emptyOutDir: false } });

            // Reload server simulation with latest worldConfig
            const configPath = path.resolve(__dirname, 'src/config/worldConfig.json');
            if (fs.existsSync(configPath)) {
              const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              const UniversalRoomManager = await getRoomManager();
              UniversalRoomManager?.getInstance().reloadWorldConfig?.(cfg);
            }

            saveLastSyncInfo({ timestamp: Date.now(), commit: currentHead });

            console.log(`✅ [SyncRebuild] Successfully updated runtime snapshot to commit ${currentHead}!`);
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              commitSha: currentHead,
              timestamp: new Date().toISOString(),
              message: 'Runtime snapshot rebuilt and synced successfully.',
            }));
          } catch (err: any) {
            console.error('❌ [SyncRebuild] Build error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Build failed: ' + (err?.message || String(err)) }));
          }
          return;
        }

        // Restart Server Simulation API
        if (urlPath === '/api/dev/restart-server') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          try {
            const configPath = path.resolve(__dirname, 'src/config/worldConfig.json');
            if (fs.existsSync(configPath)) {
              const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              const UniversalRoomManager = await getRoomManager();
              UniversalRoomManager?.getInstance().reloadWorldConfig?.(cfg);
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, message: 'Server physics simulation restarted cleanly.' }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err?.message || String(err) }));
          }
          return;
        }

        // Feedback API endpoints
        if (urlPath === '/api/feedback') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const items = getAllFeedback();
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.end(JSON.stringify(items));
            return;
          }

          if (req.method === 'POST') {
            parseJsonBody(req).then((body) => {
              if (!body.description || typeof body.description !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Description is required' }));
                return;
              }
              const created = createFeedback(body);
              res.statusCode = 201;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(created));
            }).catch(() => {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            });
            return;
          }
        }

        if (urlPath.startsWith('/api/feedback/') && req.method === 'PATCH') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          const id = urlPath.replace('/api/feedback/', '');
          parseJsonBody(req).then((body) => {
            const updated = updateFeedbackStatus(id, body.completed);
            if (!updated) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Feedback not found' }));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(updated));
          }).catch(() => {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          });
          return;
        }

        if (req.url && (req.url.startsWith('/api/version') || req.url.startsWith('/api/deploy-status') || req.url === '/health')) {
          getLiveBuildStatus().then((buildStatus) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              deployId: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RAILWAY_DEPLOYMENT_ID || 'local-dev',
              commit: (process.env.RAILWAY_GIT_COMMIT_SHA || 'dev').substring(0, 7),
              bootTime: new Date().toISOString(),
              buildStatus,
            }));
          });
          return;
        }

        if (isTunnel) {


          if (serveDistFile(req.url || '/', res)) {
            return;
          }
        }
        next();
      });

      // 2. Auto-rebuild dist on source file changes in background so dist is always live
      let buildTimeout: any = null;
      server.watcher.on('change', (file) => {
        if (file.includes('worldConfig')) return;
        if (file.includes('src') || file.includes('index.html')) {
          clearTimeout(buildTimeout);
          buildTimeout = setTimeout(async () => {
            try {
              console.log('🔄 [AutoBundle] Updating dist for remote tunnel devices...');
              await build({ build: { emptyOutDir: false } });
              console.log('✅ [AutoBundle] dist updated!');
            } catch (e: any) {
              console.warn('⚠️ [AutoBundle] Build error:', e?.message || e);
            }
          }, 600);
        }
      });

      // 3. Start tunnel
      server.httpServer?.once('listening', () => {
        const addr = server.httpServer?.address();
        const port = typeof addr === 'object' && addr?.port ? addr.port : 3000;
        connectTunnel(port);
      });

      if (server.httpServer?.listening) {
        const addr = server.httpServer.address();
        const port = typeof addr === 'object' && addr?.port ? addr.port : 3000;
        connectTunnel(port);
      }

      server.httpServer?.once('close', cleanUpTunnel);
      process.once('SIGINT', cleanUpTunnel);
      process.once('SIGTERM', cleanUpTunnel);
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: command === 'serve' ? [autoTunnelPlugin()] : [],
  ssr: {
    noExternal: ['ws'],
  },
  server: {
    host: '0.0.0.0', // Listen on all network addresses (0.0.0.0)
    port: 3000,
    allowedHosts: true, // Allow external tunnel hosts (e.g. *.loca.lt, ngrok, LAN IPs)
    watch: {
      ignored: [
        '**/app/**',
        '**/desktop_app/**',
        '**/*.WebView2/**',
        '**/scratch/**',
        '**/.git/**',
        '**/tunnel.json',
        '**/dist/**',
        /worldConfig/,
      ],
    },
  },
}));
