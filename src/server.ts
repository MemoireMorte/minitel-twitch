import { WebSocketServer, WebSocket } from 'ws';

// The ESP32 (arduinoWebSockets) sends "Origin: file://"; browsers send the page's http(s) origin.
// Rejecting browser origins stops web pages on the LAN from hijacking the Minitel connection.
const ALLOWED_ORIGINS = new Set<string | undefined>([undefined, 'file://']);
// We never read from the ESP32 — cap incoming frames so a client can't make us buffer large payloads.
const MAX_INCOMING_BYTES = 1024;
// ~4 s of output at 4800 baud; droppable data beyond this is skipped instead of queued.
const MAX_BUFFERED_BYTES = 2048;

export class MinitelServer {
  private wss: WebSocketServer;
  private socket: WebSocket | null = null;
  private connectCallback: (() => void) | null = null;

  constructor(port: number) {
    this.wss = new WebSocketServer({
      port,
      maxPayload: MAX_INCOMING_BYTES,
      verifyClient: ({ origin }: { origin?: string }) => {
        const ok = ALLOWED_ORIGINS.has(origin);
        if (!ok) console.warn(`[server] rejected connection from origin ${origin}`);
        return ok;
      },
    });
    this.wss.on('connection', (ws) => {
      if (this.socket) {
        console.log('[server] replacing existing connection');
        this.socket.close();
      }
      this.socket = ws;
      console.log('[server] ESP32 connected');
      this.connectCallback?.();

      ws.on('close', () => {
        if (this.socket === ws) this.socket = null;
        console.log('[server] ESP32 disconnected');
      });

      ws.on('error', (err) => {
        console.error('[server] socket error:', err.message);
      });
    });

    this.wss.on('error', (err) => {
      console.error('[server] server error:', err.message);
    });

    console.log(`[server] WebSocket server listening on port ${port}`);
  }

  onConnect(cb: () => void): void {
    this.connectCallback = cb;
  }

  send(data: Buffer): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    }
  }

  // Like send(), but drops the data when the Minitel is falling behind (e.g. chat floods).
  sendDroppable(data: Buffer): void {
    if (this.socket && this.socket.bufferedAmount > MAX_BUFFERED_BYTES) return;
    this.send(data);
  }

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
