# CLASP Protocol Reference

The wire-level protocol specification. Use this for: implementing a custom client, debugging frames on the wire, writing an embedded C client, bridging CLASP to a protocol `clasp-cli` doesn't support, or just understanding what's actually happening under the JS client's API.

Authoritative source: `CLASP-Protocol.md` in the lumencanvas/clasp repo, which this file condenses.

## Contents

- Frame format (4 bytes minimum, 12 with timestamp)
- Payload encoding: binary (default) and MessagePack (legacy)
- The 17 message types
- The 5 signal types
- Data type codes
- QoS levels
- Address scheme + wildcards
- Clock sync (NTP-like)
- Security: TLS, capability tokens, pairing

## Frame format

Every CLASP frame on the wire has this shape:

```
┌───────────────────────────────────────────────────────────────┐
│ Byte 0    Magic: 0x53 ('S')                                   │
│ Byte 1    Flags:                                              │
│             [7:6] QoS (00=Fire, 01=Confirm, 10=Commit)        │
│             [5]   Timestamp present                            │
│             [4]   Encrypted                                    │
│             [3]   Compressed                                   │
│             [2:0] Encoding (001=binary default, 000=msgpack)   │
│ Byte 2-3  Payload length (uint16 big-endian, max 65535)        │
├───────────────────────────────────────────────────────────────┤
│ If timestamp flag:                                             │
│ Byte 4-11  Timestamp (uint64 µs, big-endian)                   │
├───────────────────────────────────────────────────────────────┤
│ Payload (binary or MessagePack)                                │
└───────────────────────────────────────────────────────────────┘
```

Total overhead: **4 bytes minimum**, **12 bytes with timestamp**.

Binary encoding is the default (encoding bits `001`). Decoders auto-detect MessagePack (bits `000`) for backward compatibility: if the first payload byte is `0x80-0x8F`, `0xDE`, or `0xDF`, the payload is MessagePack.

## Payload: compact binary encoding (default)

A typical SET message is 31 bytes total, 55% smaller than the equivalent JSON and roughly 8M/s encode, 11M/s decode on a single core.

### SET layout

```
┌──────────┬──────────┬─────────┬─────────┬──────────┬──────────┐
│ MsgType  │ Flags    │ AddrLen │ Address │ Value    │ [Rev]    │
│ 0x21     │ vtype+fl │ u16 BE  │ UTF-8   │ encoded  │ u64 BE?  │
└──────────┴──────────┴─────────┴─────────┴──────────┴──────────┘

Flags byte:
  [7] has_revision     [6] lock        [5] unlock
  [4] reserved         [3:0] value_type
```

### Value type codes

| Code | Type   | Encoding                              |
|------|--------|---------------------------------------|
| 0x00 | null   | 0 bytes                               |
| 0x01 | false  | 0 bytes                               |
| 0x02 | true   | 0 bytes                               |
| 0x05 | i32    | 4 bytes big-endian                    |
| 0x06 | i64    | 8 bytes big-endian                    |
| 0x07 | f64    | 8 bytes IEEE 754 big-endian           |
| 0x08 | string | u16 length + UTF-8 bytes              |
| 0x09 | bytes  | u32 length + raw bytes                |
| 0x0A | array  | u32 count + typed elements            |
| 0x0B | map    | u32 count + (string, type, value)×    |

### Creative extension types (for arrays)

| Ext  | Type   | Size | Purpose                  |
|------|--------|------|--------------------------|
| 0x10 | vec2   | 8    | f32 × 2                  |
| 0x11 | vec3   | 12   | f32 × 3                  |
| 0x12 | vec4   | 16   | f32 × 4                  |
| 0x13 | color  | 4    | u8 RGBA                  |
| 0x14 | colorf | 16   | f32 RGBA                 |
| 0x15 | mat3   | 36   | f32 × 9                  |
| 0x16 | mat4   | 64   | f32 × 16                 |

## Message catalog (all 17)

| Code | Name        | Dir         | Purpose                                    |
|------|-------------|-------------|--------------------------------------------|
| 0x01 | HELLO       | Client→Srv  | Connection initiation                       |
| 0x02 | WELCOME     | Server→Cli  | Connection accepted                         |
| 0x03 | ANNOUNCE    | Both        | Capability / signal advertisement           |
| 0x10 | SUBSCRIBE   | Client→Srv  | Subscribe to pattern                        |
| 0x11 | UNSUBSCRIBE | Client→Srv  | Unsubscribe                                 |
| 0x20 | PUBLISH     | Both        | Send Event / Stream / Gesture / Timeline    |
| 0x21 | SET         | Both        | Set Param value                             |
| 0x22 | GET         | Client→Srv  | Request current value                       |
| 0x23 | SNAPSHOT    | Server→Cli  | Current state dump (for late joiners)       |
| 0x30 | BUNDLE      | Both        | Atomic group, optionally scheduled          |
| 0x40 | SYNC        | Both        | Clock synchronization                       |
| 0x41 | PING        | Both        | Keepalive                                   |
| 0x42 | PONG        | Both        | Keepalive response                          |
| 0x50 | ACK         | Both        | Acknowledgment                              |
| 0x51 | ERROR       | Both        | Error response                              |
| 0x60 | QUERY       | Client→Srv  | Introspection query                         |
| 0x61 | RESULT      | Server→Cli  | Query result                                |

### HELLO / WELCOME

HELLO opens the connection:
```json
{
  "type": "HELLO",
  "version": 2,
  "name": "My Controller",
  "features": ["param", "event", "stream"],
  "capabilities": { "encryption": true, "compression": "lz4" },
  "token": "bearer:..."
}
```

WELCOME is the server's reply with the session ID and server time:
```json
{
  "type": "WELCOME",
  "version": 2,
  "session": "abc123",
  "name": "LumenCanvas Studio",
  "features": ["param", "event", "stream", "timeline"],
  "time": 1704067200000000,
  "token": "bearer:xyz..."
}
```

### SUBSCRIBE

```json
{
  "type": "SUBSCRIBE",
  "id": 1,
  "pattern": "/lumen/scene/*/layer/*/opacity",
  "types": ["param"],
  "options": { "maxRate": 30, "epsilon": 0.01, "history": 1 }
}
```

`id` is a client-assigned subscription ID used for UNSUBSCRIBE. Options throttle the server-side delivery rate (`maxRate`), drop non-significant numeric changes (`epsilon`), or request the last N historical values (`history`).

### SET

```json
{
  "type": "SET",
  "address": "/lumen/opacity",
  "value": 0.75,
  "revision": 41,
  "lock": false
}
```

`revision` is optional; if supplied, it's an optimistic-lock expectation: the server rejects the write if its current revision doesn't match.

### PUBLISH

PUBLISH carries any non-Param signal. The `signal` field discriminates:
```json
{ "type": "PUBLISH", "address": "/cue/fire", "signal": "event",    "payload": { "cue": "intro" } }
{ "type": "PUBLISH", "address": "/fader/1",  "signal": "stream",   "value": 0.5 }
{ "type": "PUBLISH", "address": "/touch",    "signal": "gesture",  "id": 1, "phase": "move", "payload": { "x": 0.5, "y": 0.3 } }
{ "type": "PUBLISH", "address": "/opacity",  "signal": "timeline", "keyframes": [...], "loop": false }
```

### BUNDLE

```json
{
  "type": "BUNDLE",
  "timestamp": 1704067300000000,
  "messages": [
    { "type": "SET", "address": "/light/1", "value": 1.0 },
    { "type": "SET", "address": "/light/2", "value": 0.0 },
    { "type": "PUBLISH", "address": "/cue/fire", "signal": "event", "payload": { "id": "intro" } }
  ]
}
```

If `timestamp` is set, the router delays execution until that server time. Tolerance: ±1ms. This is how you do perfectly-timed multi-device cues.

### SNAPSHOT

Sent by the server in response to a SUBSCRIBE or GET, with current Param values:
```json
{
  "type": "SNAPSHOT",
  "params": [
    { "address": "/lumen/opacity", "value": 0.75, "revision": 42 },
    { "address": "/lumen/color",   "value": [255,0,0,255], "revision": 17 }
  ]
}
```

This is why subscribing *before* setting matters: SNAPSHOT fires through your existing handlers.

### ERROR codes

- **100 to 199**: Protocol errors (malformed frame, unknown message type)
- **200 to 299**: Address errors (invalid path, not found)
- **300 to 399**: Permission errors (unauthorized, token expired)
- **400 to 499**: State errors (lock held, revision mismatch)
- **500 to 599**: Server errors (internal, overloaded)

## Signal types in depth

| Type     | Default QoS | Persists | Coalesce          | Primary use            |
|----------|-------------|----------|-------------------|------------------------|
| Param    | Confirm     | Yes      | Last value wins   | Stateful values        |
| Event    | Confirm     | No       | Never             | Triggers               |
| Stream   | Fire        | No       | Recent values     | High-rate data         |
| Gesture  | Fire        | Phase    | By `id` on `move` | Touch/pen/motion       |
| Timeline | Commit      | Yes      | Never             | Keyframed automation   |

### Param conflict resolution

When two clients write the same address:

| Strategy | Behavior                            | Use case                    |
|----------|-------------------------------------|-----------------------------|
| `lww`    | Last-write-wins by timestamp (default) | Simple state                |
| `max`    | Keep the maximum value              | Meters, levels              |
| `min`    | Keep the minimum value              | Limits                      |
| `lock`   | First writer holds exclusive write  | Dedicated-controller params |
| `merge`  | App-defined merge                   | Complex objects             |

Lock acquisition:

```
Client → SET { address, value, lock: true }
Server → ACK  { address, locked: true, holder: session }   // granted
         ERROR { code: 401, holder: session }              // denied

Client → SET { address, value, unlock: true }              // release
```

### Gesture phases

- `start`: finger/pen/mouse down
- `move`: continuous update (MAY be coalesced by the router)
- `end`: released normally
- `cancel`: interrupted (e.g., system dialog popped up)

`start` and `end` are never coalesced. Multiple simultaneous gestures are distinguished by `id`.

## Addresses and wildcards

Addresses are OSC-style paths, UTF-8, max 65535 bytes (in practice, keep them short).

```
/lumen/scene/0/layer/3/opacity
/midi/launchpad/cc/74
/fps/room42/player/abc123/pos
```

Wildcards, **subscription-only** (not valid in SET):

- `*` matches exactly one segment: `/a/*/c` matches `/a/b/c` but NOT `/a/b/b/c`
- `**` matches any number of segments: `/a/**` matches `/a`, `/a/b`, `/a/b/c/d`

Namespace convention: top-level segment identifies the app (`/lumen`, `/midi`, `/dmx`, `/fps`, etc.). This is how apps on the same router stay out of each other's way.

## Clock sync (SYNC, NTP-style)

```
Client                              Server
  |                                    |
  |── SYNC { t1: T1 } ────────────────▶|   (receives at T2)
  |                                    |
  |◀── SYNC { t1:T1, t2:T2, t3:T3 } ───|   (sends at T3)
  |   (receives at T4)                 |
```

The client computes:
```
roundTrip = (T4 - T1) - (T3 - T2)
offset    = ((T2 - T1) + (T3 - T4)) / 2
```

The JS client does this automatically, updating its server-time offset. `client.time()` then returns estimated server time in microseconds.

Quality on LAN wired: ±1ms. WiFi: ±5 to 10ms. Not for hard-realtime / safety-critical applications.

## QoS levels

- **Fire (0)**: best effort, no confirmation. Use for streams, gestures, anything where the next value is coming soon.
- **Confirm (1)**: at-least-once delivery. Use for params, events, anything that should not silently drop.
- **Commit (2)**: exactly-once ordered delivery. Use for bundles, transactions.

QoS is set per-frame in the flags byte. In the JS client, each write method picks the right default.

## Security

### TLS

- WebSocket: use `wss://` (TLS 1.3). `ws://` only for localhost dev.
- UDP / WebRTC DataChannel: DTLS (built into WebRTC).
- QUIC: TLS 1.3 mandatory.

### Capability tokens (JWT)

```json
{
  "iss": "clasp:lumencanvas",
  "sub": "user:moheeb",
  "iat": 1704067200,
  "exp": 1704153600,
  "sf": {
    "read":  ["/lumen/**"],
    "write": ["/lumen/scene/*/layer/*/opacity"],
    "constraints": {
      "/lumen/scene/*/layer/*/opacity": { "range": [0, 1], "maxRate": 60 }
    }
  }
}
```

Passed in HELLO's `token` field. The router validates on every SET/PUBLISH against the token's `read`/`write` scopes and any range/rate constraints.

### Pairing (zero-config, no PKI)

For studio/local setups:

1. Server displays a 6-digit code
2. Client enters the code (or scans a QR)
3. Shared secret derived from the code via PBKDF
4. Session encrypted end-to-end

## Transports

| Transport  | Best for                         |
|------------|----------------------------------|
| WebSocket  | Browsers, cross-platform default |
| QUIC       | Mobile, 0-RTT reconnect, migration |
| UDP        | LAN, embedded, lowest overhead   |
| TCP        | Environments that block UDP      |
| Serial     | Hardware, UART/RS-232, DMX       |
| BLE        | Battery-powered sensors          |
| WebRTC DC  | Browser-to-browser P2P           |

WebSocket is the mandatory baseline for interop. `wss://host:port/clasp` with subprotocol `clasp`, binary frames only (no text frames). Use WebSocket ping/pong for keepalive.

## Wire-format examples

### SET /lumen/opacity 0.75 (v3 binary, 31 bytes)

```
53               Magic 'S'
01               Flags: QoS=Fire, no TS, binary encoding
00 1B            Payload length (27 bytes)
21               MsgType SET
07               Value type f64 (0x07), no flags
00 0E            Address length (14)
2F 6C 75 6D 65 6E 2F 6F 70 61 63 69 74 79   "/lumen/opacity"
3F E8 00 00 00 00 00 00                     0.75 as f64 BE
```

### Scheduled BUNDLE with timestamp (69 bytes, still MessagePack example)

See `CLASP-Protocol.md` Appendix A for full hex breakdown; the short version: flags byte has bit 5 set, 8 bytes of timestamp follow the length, then the MessagePack bundle payload.

## Implementing a minimal client

To bring up a new CLASP client from scratch, the minimum is ~200 LOC:

1. WebSocket connection, binary frames
2. Framer: encode/decode the 4-byte header
3. Binary payload codec (just SET + PUBLISH + HELLO + SUBSCRIBE + PING is enough to do something useful)
4. HELLO / WELCOME handshake
5. Subscription table + wildcard matcher

Everything else (SYNC, BUNDLE, timelines, locks, capability tokens, conflict resolution) is opt-in. Start minimal, add only what you need.

## Conformance levels

| Level     | Requirements                                            | Target            |
|-----------|---------------------------------------------------------|-------------------|
| Minimal   | WebSocket + HELLO/WELCOME + SET + PUBLISH               | Browser apps      |
| Standard  | + SUBSCRIBE + Param/Event/Stream + MessagePack         | Desktop apps      |
| Full      | + Timeline + Gestures + Discovery + Bridges             | Professional tools |
| Embedded  | UDP + numeric addresses + fixed types                   | Microcontrollers  |
