import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    port: 5173,
    allowedHosts: true, // Allow external tunnel hosts (e.g. *.loca.lt, ngrok, LAN IPs)
  },
});
