import localtunnel from 'localtunnel';
import qrcodeTerminal from 'qrcode-terminal';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 5173;

const tunnelJsonPath = path.join(__dirname, 'public', 'tunnel.json');

function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('⚡ Power Creature Game — Nationwide Share Tool');
  console.log(`Checking local server on port ${PORT}...`);

  const isRunning = await checkServerRunning(PORT);
  if (!isRunning) {
    console.log(`⚠️ Local server on port ${PORT} is not running yet.`);
    console.log(`👉 In another terminal, run: npm run dev`);
  }

  console.log('🌐 Opening secure HTTPS tunnel to public internet...');
  try {
    let tunnel;
    while (true) {
      tunnel = await localtunnel({ port: PORT, subdomain: 'pcg-arena-teal', local_host: 'localhost' });
      if (tunnel.url === 'https://pcg-arena-teal.loca.lt') {
        break;
      }
      console.log(`⚠️ Subdomain 'pcg-arena-teal' was temporarily reserved (assigned ${tunnel.url}). Retrying in 4s...`);
      tunnel.close();
      await new Promise((r) => setTimeout(r, 4000));
    }

    // Write public URL to public/tunnel.json and dist/tunnel.json so in-game UI can read it
    try {
      fs.writeFileSync(tunnelJsonPath, JSON.stringify({ active: true, url: 'https://pcg-arena-teal.loca.lt' }, null, 2));
      const distPath = path.join(__dirname, 'dist', 'tunnel.json');
      fs.writeFileSync(distPath, JSON.stringify({ active: true, url: 'https://pcg-arena-teal.loca.lt' }, null, 2));
    } catch {}

    console.log('\n======================================================');
    console.log('🚀 YOUR GAME IS NOW ACCESSIBLE ACROSS THE COUNTRY!');
    console.log(`🌐 Public URL: ${tunnel.url}`);
    console.log('======================================================\n');
    console.log('📱 Scan this QR Code with your phone camera to play:\n');
    qrcodeTerminal.generate(tunnel.url, { small: true });
    console.log('\n💡 Tips for playing on your phone:');
    console.log('1. Scan the QR code or type the URL into Safari / Chrome.');
    console.log('2. Pair your Bluetooth controller (Xbox, PS4/PS5, Razer Kishi, etc.) to your phone.');
    console.log('3. Tap "Add to Home Screen" to install and play in full-screen landscape!');
    console.log('\n(Keep this terminal open while you play. Press Ctrl+C to stop.)\n');

    const cleanup = () => {
      console.log('\nClosing tunnel...');
      try {
        fs.writeFileSync(tunnelJsonPath, JSON.stringify({ active: false, url: 'https://pcg-arena-teal.loca.lt' }, null, 2));
        const distPath = path.join(__dirname, 'dist', 'tunnel.json');
        fs.writeFileSync(distPath, JSON.stringify({ active: false, url: 'https://pcg-arena-teal.loca.lt' }, null, 2));
      } catch {}
      tunnel.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    tunnel.on('close', cleanup);
  } catch (err) {
    console.error('❌ Failed to open tunnel:', err);
    process.exit(1);
  }
}

main();
