import { defineConfig, Plugin } from 'vite';
import { setupWebSocketServer } from './serverHandler.js';

function multiplayerPlugin(): Plugin {
  return {
    name: 'multiplayer-ws',
    configureServer(server) {
      if (server.httpServer) {
        setupWebSocketServer(server.httpServer);
      }
    },
  };
}

export default defineConfig({
  plugins: [multiplayerPlugin()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    port: 5173,
    allowedHosts: true, // Allow external tunnel hosts (e.g. *.loca.lt, ngrok, LAN IPs)
  },
});
