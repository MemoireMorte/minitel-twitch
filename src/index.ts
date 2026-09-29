import 'dotenv/config';
import { MinitelServer } from './server.js';
import { TwitchClient } from './twitch.js';
import { VT } from './minitel.js';
import { formatChatLine } from './views/chat.js';
import { buildSubAlert } from './views/alert.js';

const PORT = parseInt(process.env.MINITEL_WS_PORT ?? '8080');
const CHANNEL = process.env.TWITCH_CHANNEL ?? '';
const ALERT_DURATION = parseInt(process.env.ALERT_DURATION_MS ?? '4000');

if (!CHANNEL) {
  console.error('TWITCH_CHANNEL is required in .env');
  process.exit(1);
}

const server = new MinitelServer(PORT);
const twitch = new TwitchClient(CHANNEL);

let alertActive = false;

server.onConnect(() => {
  server.send(VT.SCROLL_ON);
  server.send(VT.CLEAR);
  server.send(VT.CURSOR_OFF);
});

twitch.onMessage((msg) => {
  if (alertActive) return;
  server.send(formatChatLine(msg));
});

twitch.onSub((event) => {
  if (alertActive) return;
  alertActive = true;
  server.send(buildSubAlert(event));
  setTimeout(() => {
    server.send(VT.CLEAR);
    server.send(VT.CURSOR_OFF);
    alertActive = false;
  }, ALERT_DURATION);
});

twitch.connect();

// Dev helper: press Enter in the terminal to fire a test sub alert
if (process.stdin.isTTY) {
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  process.stdin.on('data', (key: string) => {
    const k = key.trim();
    if (k === 's') twitch.simulateSub({ username: 'TestUser', type: 'sub' });
    if (k === 'r') twitch.simulateSub({ username: 'TestUser', type: 'resub', months: 6 });
    if (k === 'g') twitch.simulateSub({ username: 'TestUser', type: 'subgift' });
  });
  console.log('[dev] keys: s=sub  r=resub  g=gift');
}
