import { WebSocketServer, WebSocket } from 'ws';

export class MinitelServer {
  private wss: WebSocketServer;
  private socket: WebSocket | null = null;
  private connectCallback: (() => void) | null = null;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
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

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
