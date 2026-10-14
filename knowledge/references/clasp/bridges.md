# Bridges & CLI

A bridge is a specialized CLASP client that translates between CLASP and an external protocol: OSC, MIDI, DMX, Art-Net, sACN, MQTT, WebSocket, Socket.IO, HTTP. Bridges are bidirectional: external devices both read from and write to CLASP state through their native protocol.

Always prefer the existing `clasp-cli` bridges over rolling your own. They're battle-tested, handle all the edge cases (MIDI SysEx, OSC bundles, DMX frame timing, Art-Net broadcast), and compose cleanly.

## Installing the CLI

```bash
cargo install clasp-cli
```

Or from source:
```bash
git clone https://github.com/lumencanvas/clasp.git
cd clasp
cargo install --path crates/clasp-cli
```

Desktop app releases (macOS DMG, Windows installer, Linux AppImage) at <https://github.com/lumencanvas/clasp/releases>.

## The architecture (important: read this)

CLASP is router-centric. A `clasp` router runs, and bridges connect to it. Do NOT try to run a bridge without a router first.

```
External devices  ←→  Bridge process  ←→  CLASP Router  ←→  Other clients/bridges
(OSC, MIDI, DMX)      (clasp osc, etc.)   (clasp server)     (browser apps, scripts)
```

Start order: **router first, then every bridge**.

```bash
# Terminal 1: the central hub
clasp server --port 7330

# Terminal 2: OSC bridge
clasp osc --port 9000

# Terminal 3: MQTT bridge
clasp mqtt --host localhost --port 1883 --topic "sensors/#"

# Terminal 4: your app
node my-app.js
```

## CLI commands (overview)

### Run a router

```bash
clasp server --port 7330
# or:
clasp server --protocol websocket --bind 0.0.0.0 --port 7330
```

`--bind 0.0.0.0` makes it reachable on the LAN; default is `127.0.0.1`.

### Run protocol bridges

```bash
# OSC
clasp osc --port 9000

# MQTT
clasp mqtt --host localhost --port 1883 --topic "sensors/#"

# WebSocket (e.g. for a non-CLASP WebSocket app)
clasp websocket --mode server --url 0.0.0.0:8080

# HTTP REST
clasp http --bind 0.0.0.0:3000

# Help
clasp --help
```

### Pub/sub from the command line (debugging)

```bash
clasp pub /lights/brightness 0.75
clasp sub "/lights/**"
```

Handy for sanity-checking that a bridge is forwarding messages correctly.

### Direct bridge (two protocols, no router needed for simple cases)

```bash
clasp bridge --source osc:0.0.0.0:9000 --target mqtt:localhost:1883
```

## Protocol mappings

### MIDI → CLASP

| MIDI               | CLASP address                        | Signal | Value type           |
|--------------------|--------------------------------------|--------|----------------------|
| Note On/Off        | `/midi/<device>/note`                | Event  | `{ note, velocity, channel }` |
| CC                 | `/midi/<device>/cc/<num>`            | Param  | u8 (0-127)           |
| Pitch Bend         | `/midi/<device>/bend`                | Param  | i16 (-8192 to 8191)  |
| Program Change     | `/midi/<device>/program`             | Event  | `{ program, channel }` |
| Clock              | `/midi/<device>/clock`               | Event  | (24 PPQ tick)        |
| Start/Stop         | `/midi/<device>/transport`           | Event  | `{ state: "start"\|"stop"\|"continue" }` |

The direction is bidirectional: set `/midi/launchpad/cc/74` to 64 and the bridge sends the corresponding MIDI CC message to the device.

### OSC ↔ CLASP

Path-to-path, types auto-mapped:

```
OSC  /synth/osc1/cutoff ,f 0.5
  ↔  CLASP SET /osc/synth/osc1/cutoff 0.5

OSC Bundle with timetag
  ↔  CLASP BUNDLE { timestamp: timetag, messages: [...] }
```

Type mapping:
- OSC int32 ↔ CLASP i32
- OSC float32 ↔ CLASP f32
- OSC string ↔ CLASP string
- OSC blob ↔ CLASP bytes
- OSC timetag ↔ CLASP timestamp (µs)

### DMX / Art-Net / sACN

Lighting protocols map by universe + channel:

```
DMX Universe 1, Channel 47 = 255
  → /dmx/1/47           Param u8 = 255

Art-Net Net:Subnet:Universe 0:1:2, Channel 1-512
  → /artnet/0/1/2/<channel>   Param u8

sACN Universe 100, Priority 200
  → /sacn/100/<channel>       Param u8  (priority in metadata)
```

Direction: both. Write `/dmx/1/47 = 255` and the bridge sends the DMX frame. Read `/dmx/1/47` to see the last value received.

### MQTT

MQTT topics map to CLASP addresses:

```
MQTT topic sensors/temperature → CLASP /mqtt/sensors/temperature
MQTT wildcards sensors/#        → CLASP subscription /mqtt/sensors/**
```

The `+` MQTT wildcard maps to CLASP `*`, and `#` to `**`.

### HTTP REST

The HTTP bridge exposes CLASP over a REST API:

```
GET  /api/params/lumen/opacity     → current value
PUT  /api/params/lumen/opacity     → set value (JSON body)
POST /api/events/cue/fire          → emit event
GET  /api/query?pattern=/lumen/**  → list matching signals
```

Useful for integration with existing web services that can't or don't want to run a WebSocket client.

## Bridge announcements

Bridges self-describe via ANNOUNCE so other clients can discover what's connected:

```json
{
  "type": "ANNOUNCE",
  "namespace": "/midi/launchpad",
  "meta": {
    "bridge": true,
    "protocol": "midi",
    "device": "Novation Launchpad X",
    "bidirectional": true
  },
  "signals": [...]
}
```

If you're building a UI that shows "what's connected", subscribe to ANNOUNCEs and build your device list from `meta.bridge === true` entries.

## When you actually need a custom bridge

`clasp-cli` covers almost every creative protocol. You only need to write your own when:

1. The external protocol isn't in the standard list (e.g., a proprietary lighting desk, a custom serial protocol for an art installation)
2. You need protocol-specific semantics the generic bridge can't express (e.g., DMX strobe macros, OSC that uses a Query Language)
3. You need to bridge a protocol that needs local privileged access (Bluetooth HID, CoreMIDI virtual ports on macOS)

In those cases, write a small Rust binary using `clasp-client` and `clasp-core`, or a Node.js script using `@clasp-to/core`, that speaks both protocols and forwards messages. The structure:

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
│ External     │◀───▶│  Your bridge    │◀───▶│ CLASP       │
│ hardware/API │     │  (node/rust)    │     │ router      │
└──────────────┘     └─────────────────┘     └─────────────┘
```

Use CLASP params for anything with state, events for one-shot triggers. Announce your signals so others can discover them. Publish both directions.

## Migration recipes

If you're moving an existing system onto CLASP:

- **From OSC**: install the OSC bridge on your router, point existing OSC apps at its port. Done. You gain state, discovery, types, and multi-protocol routing.
- **From MIDI**: install the MIDI bridge. MIDI CCs become Params (so a late-joining dashboard sees current values), notes become Events.
- **From WebSocket + JSON**: this is the biggest upgrade. You get signal type semantics, efficient binary encoding, wildcard subscriptions, and state sync. Requires rewriting the client-side library call sites.
- **From MQTT**: similar pub/sub mental model. Add signal type semantics (what was every message a "stream"? now distinguish params from events), gain timing and introspection.

## Docker

Official image:
```bash
docker run -p 7330:7330 lumencanvas/clasp-router
```

The repo has a `docker-compose.yml` in `examples/` with a full router + MQTT broker setup for local dev.

## Self-hosted deployment

For production self-hosting, the repo's `deploy/droplet/` has scripts for DigitalOcean-style deployment. Basic ingredients:

1. A Rust build of the router behind a TLS-terminating reverse proxy (Caddy or nginx)
2. A domain with an SSL cert so browsers can `wss://` in
3. If you want auth: a capability token issuer (or use the built-in registry crate)

Don't expose an open router on the public internet without tokens. It's a shared message bus; anyone can write to any address.
