import { defineConfig, type Plugin, build } from 'vite';
import localtunnel from 'localtunnel';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

      // 3. Start tunnel
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
