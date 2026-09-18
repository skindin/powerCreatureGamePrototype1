import { defineConfig, type Plugin, build } from 'vite';
import localtunnel from 'localtunnel';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getAllFeedback, createFeedback, updateFeedbackStatus } from './server/feedbackStore.js';
import { GameServer } from './server/GameServer.js';

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

    const res = await fetch('https://api.github.com/repos/skindin/powerCreatureGamePrototype1/commits/branch1/status', {
      headers,
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return cachedBuildStatus || { state: 'unknown', isBuilding: false, isFailed: false, isSuccess: false };
    }

    const data: any = await res.json();
    const primary = data.statuses && data.statuses.length > 0 ? data.statuses[0] : null;
    const sha = data.sha || '';
    const shortSha = sha ? sha.substring(0, 7) : '';
    const state = data.state || 'unknown';
    const desc = primary?.description || (state === 'pending' ? 'Building on Railway...' : '');
    const targetUrl = primary?.target_url || '';
    const currentSha = (process.env.RAILWAY_GIT_COMMIT_SHA || '').substring(0, 7);

    const isBuilding = state === 'pending' || (Boolean(sha) && Boolean(currentSha) && !sha.startsWith(currentSha) && state !== 'failure' && state !== 'error');
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

  return {
    name: 'auto-localtunnel',
    configureServer(server) {
      // 1. Intercept public tunnel requests (loca.lt) and serve the single pre-bundled production dist/
      // This prevents 50+ concurrent unbundled ESM requests from choking localtunnel with 502 Bad Gateway
      server.middlewares.use((req, res, next) => {
        const host = (req.headers['host'] || '').toString().toLowerCase();
        const forwardedHost = (req.headers['x-forwarded-host'] || '').toString().toLowerCase();
        const isTunnel =
          forwardedHost.includes('loca.lt') ||
          host.includes('loca.lt') ||
          req.headers['x-forwarded-proto'] === 'https' ||
          Boolean(req.headers['x-forwarded-for']) ||
          Boolean(req.headers['bypass-tunnel-reminder']);

        const rawUrl = req.url || '/';
        const urlObj = new URL(rawUrl, `http://${req.headers['host'] || 'localhost'}`);
        const urlPath = decodeURIComponent(urlObj.pathname);

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
          // If a client tries requesting raw unbundled /src files, redirect to fresh /
          if (req.url && req.url.startsWith('/src/')) {
            res.writeHead(302, { Location: '/' });
            res.end();
            return;
          }

          if (serveDistFile(req.url || '/', res)) {
            return;
          }
        }
        next();
      });

      // 2. Auto-rebuild dist on source file changes in background so dist is always live
      let buildTimeout: any = null;
      server.watcher.on('change', (file) => {
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

      // 3. Attach Authoritative Multiplayer Universal Lobby Server
      if (server.httpServer) {
        const devGameServer = new GameServer();
        devGameServer.attach(server.httpServer);
      }

      // 4. Start tunnel
      server.httpServer?.once('listening', () => {
        const addr = server.httpServer?.address();
        const port = typeof addr === 'object' && addr?.port ? addr.port : 5173;
        connectTunnel(port);
      });

      if (server.httpServer?.listening) {
        const addr = server.httpServer.address();
        const port = typeof addr === 'object' && addr?.port ? addr.port : 5173;
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
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    port: 5173,
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
      ],
    },
  },
}));
