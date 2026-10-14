# Browser CDN Reference

How to use `@clasp-to/core` directly from a `<script>` tag with no build step. This is the fastest path for demos, toys, multiplayer games, interactive posters, and any single-file HTML artifact.

## CDN URLs

Both CDNs ship the same bundle. Pick one:

**jsDelivr** (what the repo's own HTML demos use):
```html
<script src="https://cdn.jsdelivr.net/npm/@clasp-to/core@4.3.1" crossorigin="anonymous"></script>
```

**unpkg** (explicit IIFE path):
```html
<script src="https://unpkg.com/@clasp-to/core@4.3.1/dist/index.global.js"></script>
```

Always pin a specific version (`@4.3.1`, not `@latest`). Floating versions silently break at runtime when a new major ships. The shipped examples use 4.3.1, a safe default until you have a reason to change it.

The bundle is ~40KB minified / ~12KB gzipped.

## What the bundle exposes

After the script loads, there is one global: `window.CLASP`. It contains:

- `CLASP.Clasp`: the client class (constructor)
- `CLASP.ClaspBuilder`: the builder class
- Plus types, codec helpers, and constants you rarely need directly

The common form is `new CLASP.Clasp(url, options)`. The browser examples in the repo use the two-argument constructor, not the builder, which is simpler for one-off pages.

## Minimal working page

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CLASP demo</title>
  <script src="https://cdn.jsdelivr.net/npm/@clasp-to/core@4.3.1" crossorigin="anonymous"></script>
</head>
<body>
  <input id="fader" type="range" min="0" max="1" step="0.01" value="0.5">
  <div id="readout"></div>

  <script>
    const RELAY = 'wss://relay.clasp.to';  // public relay, or your own server

    (async () => {
      const client = new CLASP.Clasp(RELAY, {
        name: 'fader-demo',
        reconnect: true,
      });

      await client.connect();

      // Subscribe BEFORE setting, so the initial snapshot populates our UI
      client.on('/demo/fader', (value) => {
        document.getElementById('readout').textContent = value.toFixed(2);
      });

      document.getElementById('fader').addEventListener('input', (e) => {
        client.set('/demo/fader', parseFloat(e.target.value));
      });
    })();
  </script>
</body>
</html>
```

Open this file in two browser tabs (or send to a friend): both move the fader, both see the value. The `/demo/fader` address is shared on the public relay. In production you'd namespace under something unique like `/myapp-a7k9x/fader` to avoid collisions.

## The `window.CLASP.Clasp` constructor

```js
new CLASP.Clasp(url, options?)
```

**url**: `ws://` or `wss://` URL of a CLASP router. Use `wss://` for any page served over HTTPS (browsers block mixed content).

**options**, an optional object:
- `name: string`: human-readable client name shown in router logs
- `features?: string[]`: signal types you support: `['param', 'event', 'stream', 'gesture', 'timeline']`
- `token?: string`: JWT capability token for authenticated routers
- `reconnect?: boolean`: default `true`; auto-reconnect on disconnect with exponential backoff (1.5^attempts, capped at 30s, up to 10 attempts)
- `reconnectInterval?: number`: base interval in ms, default 5000
- `connectionTimeout?: number`: initial connect timeout in ms, default 10000

**Returns** a `Clasp` instance. You must still call `await client.connect()` before using it.

## Public relay: `wss://relay.clasp.to`

LumenCanvas runs a public relay. Use it for:

- Prototyping and demos
- Sharing a single-file HTML artifact with friends
- Workshop/education scenarios
- "I just want this to work without setting up a server"

**Namespacing is your problem.** Everyone on `relay.clasp.to` shares one address space. Scope every address under a random unique prefix: `/myapp-${randomId}/...`. A good pattern:

```js
const APP_ID = 'myapp-' + Math.random().toString(36).slice(2, 10);
client.set(`${APP_ID}/state/score`, 42);
```

If the user shares a link, include the app ID in the URL hash so everyone joins the same namespace:

```js
const APP_ID = location.hash.slice(1) || ('myapp-' + Math.random().toString(36).slice(2, 10));
location.hash = APP_ID;
```

**Don't put anything sensitive on the public relay.** No passwords, no personal data, no paid API keys. It's a public shared channel.

For anything real, run your own router (see below).

## Mobile-safe patterns

The repo's `ghostcam.html` (a ghost-drop camera PWA) has hard-won patterns for mobile web. Steal these:

**1. Wait for DOM + CDN.** The `<script>` in `<head>` might still be parsing when your inline script runs. Defer CLASP connection to `DOMContentLoaded` with a small grace period:

```js
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof CLASP?.Clasp !== 'function') {
      console.warn('CLASP CDN not loaded, running offline');
      return;
    }
    connectClasp();
  }, 80);
});
```

**2. Clean up on page hide.** Mobile browsers aggressively freeze background tabs. Tear down subscriptions and close the connection:

```js
const unsubs = [];
unsubs.push(client.on('/room/**', handler));

window.addEventListener('beforeunload', () => {
  unsubs.forEach(fn => { try { fn(); } catch(_){} });
  try { client.close(); } catch(_){}
});
```

**3. Heartbeat for presence.** Mobile screens lock, radios idle. Explicit TTL'd params work better than "last seen timestamp" hacks:

```js
setInterval(() => {
  client.set(`/room/player/${myId}/ping`, Date.now());
}, 5000);
```

Then subscribers prune players whose ping is older than ~15 seconds.

## Multiplayer template (room-scoped state)

This is the `fps-game.html` pattern, stripped to essentials:

```js
const RELAY = 'wss://relay.clasp.to';
const roomId = location.hash.slice(1) || Math.random().toString(36).slice(2, 8);
location.hash = roomId;

const myId = Math.random().toString(36).slice(2, 10);
const myName = prompt('Your name?') || 'anon';

const client = new CLASP.Clasp(RELAY, { name: myName, reconnect: true });
await client.connect();

// Announce yourself; params persist, so late joiners see you immediately
client.set(`/app/${roomId}/player/${myId}/join`, { name: myName, joinedAt: Date.now() });

// See everyone else
const peers = new Map();

client.on(`/app/${roomId}/player/*/join`, (val, addr) => {
  const id = addr.split('/')[4];   // /app/<room>/player/<id>/join
  if (id === myId) return;
  peers.set(id, val);
  render();
});

client.on(`/app/${roomId}/player/*/pos`, (val, addr) => {
  const id = addr.split('/')[4];
  if (id === myId) return;
  const peer = peers.get(id);
  if (peer) { peer.pos = val; render(); }
});

// Broadcast my position as a param (NOT stream) so late joiners see me
setInterval(() => {
  client.set(`/app/${roomId}/player/${myId}/pos`, { x, y });
}, 50);  // 20Hz is fine for most games

// Leave cleanly
window.addEventListener('beforeunload', () => {
  client.emit(`/app/${roomId}/player/${myId}/leave`, {});
  client.close();
});
```

**Key insight from the fps-game:** positions are `set()`, not `stream()`. Late joiners get every current position immediately via the SNAPSHOT message. Streams would leave new players staring at an empty world until someone moved again.

## ES Module from CDN

If you prefer ES modules and can afford the version lookup:

```html
<script type="module">
  import { Clasp } from 'https://cdn.jsdelivr.net/npm/@clasp-to/core@4.3.1/dist/index.mjs';

  const client = new Clasp('wss://relay.clasp.to', { name: 'esm-demo' });
  await client.connect();
  client.on('/esm/**', (v, a) => console.log(a, v));
</script>
```

Use this when you want modern module semantics. The IIFE global form is simpler for artifacts.

## Browser limitations (be honest with users)

Browsers cannot do these things even though CLASP the protocol supports them:

- **No mDNS discovery.** The browser cannot scan the LAN for routers. Always provide an explicit URL.
- **No UDP / TCP / Serial.** WebSocket only.
- **CORS.** If your router is on a different origin than the page, the router must send CORS headers. The public relay does; your self-hosted router might not out of the box.
- **Mixed content.** An HTTPS page cannot connect to `ws://`, only `wss://`. For local dev on `http://localhost`, `ws://localhost:7330` is fine.

## Quick checklist for a CDN-based CLASP page

- [ ] `<script src="https://cdn.jsdelivr.net/npm/@clasp-to/core@4.3.1" crossorigin="anonymous"></script>` in `<head>`, version pinned
- [ ] `new CLASP.Clasp(url, { name, reconnect: true })`
- [ ] `await client.connect()` before any `on`/`set`
- [ ] Subscriptions set up BEFORE writes, so SNAPSHOT lands in your handlers
- [ ] All addresses namespaced under a unique prefix if using the public relay
- [ ] `client.close()` and `unsub()` cleanup on `beforeunload`
- [ ] `wss://` (not `ws://`) if the page is served over HTTPS
