# CLASP Cheatsheet

One page. Copy-paste friendly.

## CDN (browser)

```html
<script src="https://cdn.jsdelivr.net/npm/@clasp-to/core@4.3.1" crossorigin="anonymous"></script>
<script>
  const client = new CLASP.Clasp('wss://relay.clasp.to', { name: 'my-app', reconnect: true });
  await client.connect();
</script>
```

## Node / TypeScript

```js
import { ClaspBuilder } from '@clasp-to/core';

const client = await new ClaspBuilder('ws://localhost:7330')
  .withName('my-app').withReconnect(true, 5000).connect();
```

## Core API

```js
await client.connect();
client.close();
client.connected;        // bool
client.session;          // string | null
client.time();           // µs (server-synced)

// Reading
client.on(pattern, (value, address, meta) => {}, { maxRate?, epsilon? });  // returns unsub()
await client.get(address);       // Promise<Value>, 5s timeout
client.cached(address);          // sync, may be undefined

// Writing
client.set(addr, value, { ttl?, absolute? });       // param, persists
client.emit(addr, payload);                          // event, fire-and-forget
client.stream(addr, value);                          // stream, high-rate, lossy
client.gesture(addr, id, 'start'|'move'|'end'|'cancel', payload);
client.timeline(addr, keyframes, { loop?, startTime? });
client.bundle([{ set: [a, v] }, { emit: [a, p] }], { at? });  // at = µs

// Events
client.onConnect(() => {});
client.onDisconnect((reason) => {});
client.onError((err) => {});
client.onReconnect((attempt) => {});

// Introspection
client.getSignals();
client.querySignals(pattern);
client.getLastError();
```

## Signal type cheat

| Type     | Method       | QoS     | Persists | Use for                |
|----------|--------------|---------|----------|------------------------|
| Param    | `set()`      | Confirm | Yes      | state, settings, positions, presence |
| Event    | `emit()`     | Confirm | No       | cues, button presses, notifications  |
| Stream   | `stream()`   | Fire    | No       | sensors, meters, audio levels        |
| Gesture  | `gesture()`  | Fire    | Phase    | touch/pen/mouse drag                 |
| Timeline | `timeline()` | Commit  | Yes      | keyframe animation                   |

**If a late joiner needs to see it → Param. Otherwise you almost certainly want a Param anyway.**

## Address rules

- Must start with `/`
- Wildcards only in subscriptions: `*` = one segment, `**` = any depth
- `/a/*/c` matches `/a/b/c`, NOT `/a/b/b/c`
- `/**` matches everything: don't use on a shared relay
- Namespace: `/app/<room>/<category>/<id>/<property>`

## QoS flags (wire-level)

- `00` Fire: best effort
- `01` Confirm: at-least-once
- `10` Commit: exactly-once ordered

## CLI (clasp-cli)

```bash
clasp server --port 7330              # run router
clasp osc --port 9000                 # OSC bridge
clasp mqtt --host broker --port 1883  # MQTT bridge
clasp http --bind 0.0.0.0:3000        # HTTP REST bridge
clasp pub /path value                 # debug publish
clasp sub "/path/**"                  # debug subscribe
```

**Always start `clasp server` first, then bridges.**

## Times: µs, not ms

```js
client.time() + 1_000_000   // 1 second from now
client.time() + 100_000     // 100ms from now
```

## Frame format (4-byte header)

```
[0]    0x53 'S'
[1]    flags   [QoS:2][TS:1][Enc:1][Cmp:1][Ver:3]
[2-3]  payload length (u16 BE)
[4+]   payload (binary encoding v3, or MessagePack legacy)
```

SET message is 31 bytes typical. Binary is 55% smaller than JSON.

## Don't mix packages

- `@clasp-to/core` → `on`, `set`, `emit`, `stream`, `gesture`, `timeline`, `bundle`, `get`, `cached`
- `@clasp-to/sdk` → all of above plus `onParam`, `onEvent`, `onStream`, `onGesture`, `onTimeline`, async `set()`, rooms, devices

If you see `onEvent` / `onStream` / `onGesture` / `onTimeline` in user code, they're on SDK. Don't assume those exist in core.

## Public relay

`wss://relay.clasp.to` is LumenCanvas's public CLASP relay. Namespace your addresses with a random prefix. Don't put anything sensitive on it.

## Default ports

| Purpose       | Port | Transport |
|---------------|------|-----------|
| Router        | 7330 | WebSocket |
| Discovery     | 7331 | UDP       |
| mDNS service  | none | `_clasp._tcp.local` |

## Error codes (ranges)

- 100 to 199 protocol
- 200 to 299 address
- 300 to 399 permission
- 400 to 499 state (locks, revisions)
- 500 to 599 server
