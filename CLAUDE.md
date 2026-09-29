# minitel-twitch

## Project Goal
Display Twitch live session events on a physical Minitel terminal connected to WiFi.
Use cases: scrolling chat, subscription/follow alerts as "pictures" (Minitel graphics).

## Hardware
- Minitel device (French videotex terminal, likely Minitel 1B or 2)
- Connected to WiFi — accessible via WebSocket (ws://), telnet, or SSH

## Minitel Technical Constraints
- Display: 40 columns × 25 rows of text (Minitel 1/1B) or 80×25 (Minitel 2 in certain modes)
- Character set: Videotex (not standard ASCII) — special encoding for accented chars
- Graphics: Mosaic (semigraphics) block characters — not pixel-level, 2×3 blocks per cell
- Colors: 8 foreground + 8 background colors
- No images, no fonts beyond built-in — everything is text + mosaic blocks
- Input: keyboard on the Minitel itself (not relevant for this project)
- Protocol: Minitel uses the Télétel/Videotex protocol (escape sequences for color, cursor, etc.)
  - Must send proper escape sequences, not raw text

## Connectivity — ESP32 Firmware (iodeo/Minitel-ESP32)
- Firmware: https://github.com/iodeo/Minitel-ESP32
- The ESP32 acts as a **client** — it connects OUT to a WebSocket server or telnet server
- Serial to Minitel: **4800 baud** (also supports 1200/9600)
- Data flow: **raw byte passthrough** — whatever bytes the server sends arrive verbatim at the Minitel
- WebSocket mode: ESP32 connects to `ws://<host>:<port>` — we run a WS server locally
- Telnet mode: ESP32 connects to `<host>:9000` (telnet) — we can run a telnet server locally
- We must run the server on the local network so the ESP32 can reach it

## Architecture
```
Twitch IRC ──┐
             ├──► local Node.js/Python server ──► WebSocket/Telnet server ──► ESP32 ──► Minitel
Twitch EventSub ──┘       (Videotex encoder)
```

## Twitch Integration
- Twitch chat: connect to Twitch IRC (`irc.chat.twitch.tv:6697` over TLS or WS)
- Twitch events (subs, follows, raids): use EventSub WebSocket (`wss://eventsub.wss.twitch.tv/ws`)
- Auth: need a Twitch OAuth token (Client Credentials for read-only events, or Authorization Code for chat)

## Videotex Reference
- Python library `pynitel` (cquest) or `PyMinitel` (zigazou) — good reference for encoding
- The MicroPython adaptations in the repo (`upynitel`, `uPyMinitel`) show the escape sequences used
- Key sequences: ESC + attribute byte for colors, cursor control, clear screen, etc.

## Stack
- Node.js or Python server on local machine
- Runs WebSocket server (or telnet server) that the ESP32 connects to
- Connects to Twitch IRC + EventSub
- Encodes events as Videotex byte sequences and writes them to the connected ESP32 socket

## Key Files
- `src/index.ts` — entry point, wires server + twitch + views
- `src/server.ts` — WebSocket server the ESP32 connects to (one connection at a time)
- `src/twitch.ts` — Twitch IRC client (anonymous justinfan), adapted from chat-parser; emits ChatMessage + SubEvent
- `src/minitel.ts` — Videotex encoder: VT constants, `encodeText()`, `center()`, `fixed()`
- `src/views/chat.ts` — formats a chat message as a 40-col line + CRLF
- `src/views/alert.ts` — builds a full-screen sub/follow alert buffer
- `src/types.ts` — shared interfaces (ChatMessage, SubEvent, etc.)

## Running
```bash
npm start        # run once
npm run dev      # watch mode (restarts on file change)
```

## Notes
- Twitch IRC is anonymous (justinfan) — no OAuth needed for read-only chat + sub events
- Accent handling: strips accents via NFD normalization (v1); proper SS2 Videotex encoding is a future improvement
- No colors: Minitel 1B renders all 8 colors as grey levels; no color escape sequences are sent
- Alert flow: clear screen → show alert → wait ALERT_DURATION_MS → clear screen → chat resumes scrolling
