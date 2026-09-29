// Adapted from chat-parser/src/lib/twitch/chatParser.ts
// Key change: uses ws package WebSocket instead of browser WebSocket.
// Stripped down to chat messages + sub events only (no commands/URLs/auth).
// Adds auto-reconnect with exponential backoff.

import { WebSocket } from 'ws';
import type { ChatMessage, SubEvent, SubEventType, UserRole } from './types.js';

const IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 60000;

const SUB_TYPES: SubEventType[] = ['sub', 'resub', 'subgift', 'anonsubgift', 'submysterygift', 'raid'];

export class TwitchClient {
  private ws: WebSocket | null = null;
  private channel: string;
  private messageCallback: ((msg: ChatMessage) => void) | null = null;
  private subCallback: ((event: SubEvent) => void) | null = null;
  private reconnectDelay = RECONNECT_BASE_MS;
  private stopped = false;

  constructor(channel: string) {
    const sanitized = channel.toLowerCase().replace(/^#/, '');
    if (!/^\w{1,25}$/.test(sanitized)) throw new Error(`Invalid channel: "${channel}"`);
    this.channel = sanitized;
  }

  onMessage(cb: (msg: ChatMessage) => void): void { this.messageCallback = cb; }
  onSub(cb: (event: SubEvent) => void): void { this.subCallback = cb; }
  simulateSub(event: SubEvent): void { this.subCallback?.(event); }

  connect(): void {
    this.stopped = false;
    this.open();
  }

  disconnect(): void {
    this.stopped = true;
    this.ws?.close();
    this.ws = null;
  }

  private open(): void {
    const nick = `justinfan${Math.floor(Math.random() * 99999)}`;
    const ws = new WebSocket(IRC_URL);
    this.ws = ws;

    ws.on('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send(`NICK ${nick}`);
      ws.send(`JOIN #${this.channel}`);
      this.reconnectDelay = RECONNECT_BASE_MS;
      console.log(`[twitch] connected to #${this.channel}`);
    });

    ws.on('message', (data) => {
      this.handleRaw(data.toString());
    });

    ws.on('close', () => {
      console.log('[twitch] disconnected');
      if (!this.stopped) this.scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error('[twitch] error:', err.message);
    });
  }

  private scheduleReconnect(): void {
    console.log(`[twitch] reconnecting in ${this.reconnectDelay}ms`);
    setTimeout(() => { if (!this.stopped) this.open(); }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
  }

  private handleRaw(raw: string): void {
    for (const line of raw.split('\r\n')) {
      if (!line) continue;
      if (line.startsWith('PING')) {
        this.ws?.send('PONG :tmi.twitch.tv');
        continue;
      }
      const msg = this.parsePrivmsg(line);
      if (msg) this.messageCallback?.(msg);

      const sub = this.parseUsernotice(line);
      if (sub) this.subCallback?.(sub);
    }
  }

  private parsePrivmsg(line: string): ChatMessage | null {
    const match = line.match(/^@(\S+) :(\w+)!\w+@\S+ PRIVMSG (#\S+) :(.+)$/);
    if (!match) return null;
    const badges = match[1].match(/(?:^|;)badges=([^;]*)/)?.[1] ?? '';
    const role: UserRole =
      badges.includes('broadcaster') ? 'broadcaster' :
      badges.includes('moderator')   ? 'moderator' :
      'viewer';
    return { username: match[2], message: match[4], role };
  }

  private parseUsernotice(line: string): SubEvent | null {
    const match = line.match(/^@(\S+) :tmi\.twitch\.tv USERNOTICE #\S+/);
    if (!match) return null;
    const tags: Record<string, string> = Object.fromEntries(
      match[1].split(';').map((t) => t.split('=') as [string, string])
    );
    const type = tags['msg-id'] as SubEventType;
    if (!SUB_TYPES.includes(type)) return null;
    const months = parseInt(tags['msg-param-cumulative-months'] ?? '0') || undefined;
    const viewers = parseInt(tags['msg-param-viewerCount'] ?? '0') || undefined;
    return {
      username: tags['login'] ?? tags['display-name'] ?? 'anonymous',
      type,
      months,
      viewers,
    };
  }
}
