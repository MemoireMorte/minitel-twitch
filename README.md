# minitel-twitch

Display your Twitch live chat — and full-screen alerts for subs and raids — on a real
Minitel terminal.

A small Node.js server reads your channel's chat from Twitch, converts every message into
Minitel (Videotex) codes, and streams them over WebSocket to an ESP32 WiFi adapter plugged
into the Minitel.

```
Twitch chat ──► minitel-twitch server ──► WebSocket ──► ESP32 ──► Minitel
               (Videotex encoder)         (your LAN)
```

## Features

- **Scrolling chat**: 40-column word-wrapped lines, usernames shown in inverse video,
  French accents rendered natively (é, è, à, ç…).
- **Full-screen alerts** for new subs, resubs, gifted subs, mystery gifts and raids. The
  alert stays up for a few seconds, then chat resumes.
- **Beep** on every alert (uses the Minitel's built-in bell).
- **No Twitch account or token needed**: chat is read anonymously.

## What you need

- A **Minitel** (tested on Minitel 1B).
- An **ESP32 WiFi adapter** for the Minitel running the
  [iodeo/Minitel-ESP32](https://github.com/iodeo/Minitel-ESP32) firmware.
- A machine on the **same local network** to run the server: any PC, Raspberry Pi, NAS
  or home server with Docker or Node.js.

## Installation

Pick either Docker or Node.js.

### Option A: Docker (recommended)

A prebuilt image (amd64 and arm64) is published on GitHub Container Registry.

**With Docker Compose**: download [`docker-compose.yml`](docker-compose.yml), set your
channel name, then start it:

```yaml
    environment:
      TWITCH_CHANNEL: "your_channel_name"
```

```bash
docker compose up -d
```

**Or with a single command:**

```bash
docker run -d --name minitel-twitch --restart unless-stopped \
  -p 8080:8080 \
  -e TWITCH_CHANNEL=your_channel_name \
  ghcr.io/memoiremorte/minitel-twitch:latest
```

To update, pull the latest image and restart (`docker compose pull && docker compose up -d`).

### Option B: Node.js

Requires Node.js 20 or later.

```bash
git clone https://github.com/MemoireMorte/minitel-twitch.git
cd minitel-twitch
npm install
cp .env.example .env      # then edit .env and set TWITCH_CHANNEL
npm run build
npm start
```

You should see:

```
[server] WebSocket server listening on port 8080
[twitch] connected to #your_channel_name
```

## Connecting the Minitel

1. Find the local IP address of the machine running the server (e.g. `192.168.1.20`).
2. In the ESP32 firmware's configuration menu, select **WebSocket** mode and set the
   server to `ws://192.168.1.20:8080`.
3. Set the Minitel speed to match the firmware (4800 baud by default).
4. Connect. The screen clears and chat starts scrolling as messages arrive.

Only one Minitel can be connected at a time: a new connection replaces the previous one.

## Configuration

All settings are environment variables, set in `.env` for Node.js or in the
`environment:` section for Docker.

| Variable            | Default | Description                                                  |
|---------------------|---------|--------------------------------------------------------------|
| `TWITCH_CHANNEL`    | *(required)* | Twitch channel to follow, without `#`                   |
| `MINITEL_WS_PORT`   | `8080`  | Port the ESP32 connects to                                   |
| `ALERT_DURATION_MS` | `4000`  | How long an alert stays on screen, in milliseconds           |
| `ALERTS_ENABLED`    | `true`  | Set to `false` to disable full-screen sub/raid alerts        |
| `BELL_ENABLED`      | `true`  | Set to `false` to show alerts without the beep               |

## Testing alerts

You can fire fake alerts without waiting for a real sub or raid. With the Minitel
connected, run:

```bash
npm run sim
```

Then type one of these keys and press **Enter**:

| Key | Alert                 |
|-----|-----------------------|
| `s` | New sub               |
| `r` | Resub (6 months)      |
| `g` | Gifted sub            |
| `d` | Raid (42 viewers)     |

> The test keys don't work with `npm run dev`: in watch mode, Enter restarts the app.

## Development

```bash
npm run dev    # auto-restarts on file changes
npm run build  # compile TypeScript to dist/
```

| File                  | Role                                                   |
|-----------------------|--------------------------------------------------------|
| `src/index.ts`        | Entry point: wires the server, Twitch and the views    |
| `src/server.ts`       | WebSocket server the ESP32 connects to                 |
| `src/twitch.ts`       | Anonymous Twitch chat client (chat, subs, raids)       |
| `src/minitel.ts`      | Videotex encoder: control codes, accents, text helpers |
| `src/views/chat.ts`   | Formats a chat message into 40-column lines            |
| `src/views/alert.ts`  | Builds the full-screen alert                           |

## Troubleshooting

- **Nothing on the Minitel**: check that the ESP32 and the server are on the same network,
  and that port 8080 isn't blocked by a firewall. The server logs a line when the ESP32
  connects.
- **`TWITCH_CHANNEL is required`**: the channel name isn't set; the app exits right away.
- **`EADDRINUSE`**: another copy of the app (or another program) is already using port
  8080. Stop it, or change `MINITEL_WS_PORT`.
- **Garbled characters**: the Minitel and ESP32 speeds don't match.
