import localtunnel from 'localtunnel';
import qrcode from 'qrcode-terminal';

const PORT = 5173;
console.log(`Connecting port ${PORT}...`);
const tunnel = await localtunnel({ port: PORT });
console.log(`URL: ${tunnel.url}`);
qrcode.generate(tunnel.url, { small: true });
tunnel.close();
console.log('Test successful!');
