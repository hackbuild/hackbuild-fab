# Recipes: Common CLASP Patterns

Working code for the patterns that come up over and over. Each recipe notes which API level it uses (`@clasp-to/core` or browser CDN) and the problem it solves.

## 1. Late-joiner state synchronization

**Problem:** A new client joins a running session and needs to see the current state.

**Solution:** Store state as Params. The router sends a SNAPSHOT on subscribe. Subscribe before anything else in your init sequence.

```js
const client = new CLASP.Clasp('wss://relay.clasp.to', { name: 'late-joiner' });
await client.connect();

// Subscribe FIRST: the SNAPSHOT arrives through this handler
const peers = new Map();
client.on('/app/room42/player/*/join', (val, addr) => {
  const id = addr.split('/')[4];
  peers.set(id, val);
  renderRoster();
});

// Now announce ourselves
client.set('/app/room42/player/me/join', { name: 'me', joinedAt: Date.now() });
```

If you write before you subscribe, the SNAPSHOT arrives and there's no handler to receive it. Existing peers show up later only when they move or re-announce.

## 2. Exclusive control (locks)

**Problem:** Multiple controllers could fight over a single knob (e.g., a mixer fader). Give one client exclusive write for a session.

```js
// Request lock
client.set('/mixer/fader/1', 0.5, { /* lock: true when supported */ });

// Listen for denial
client.onError((err) => {
  if (err.code === 401) {
    console.log(`Lock denied, held by ${err.holder}`);
  }
});

// Release later
// (pattern varies by implementation; in the core API, write with unlock intent
//  and the router's lock strategy will release)
```

For full lock semantics across all clients, ensure the router uses the `lock` conflict-resolution strategy for that address (configured server-side in the router's rules).

## 3. Scheduled execution (perfectly-timed cues)

**Problem:** Fire a complex, multi-device cue at exactly the right time, even across slightly-out-of-sync machines.

```js
// Fade house lights + start music + emit cue at exactly server-time + 2s
const startAt = client.time() + 2_000_000;   // microseconds!

client.bundle([
  { set:  ['/lights/house/intensity', 0.0] },
  { set:  ['/audio/track/1/playing', true] },
  { emit: ['/show/cue/fired', { cue: 'intro' }] },
], { at: startAt });
```

The router delays the bundle until its internal clock reaches `startAt` (±1ms tolerance on wired LAN). All subscribers execute simultaneously.

## 4. Bounded rate streaming with deduplication

**Problem:** A sensor publishes at 1000Hz, but your UI only needs 30 updates/sec, and tiny fluctuations below 1% are noise.

**Publisher:**
```js
setInterval(() => {
  client.stream('/sensor/accelerometer', { x: readX(), y: readY(), z: readZ() });
}, 1); // 1000Hz
```

**Subscriber:**
```js
client.on('/sensor/accelerometer', (val) => drawGraph(val), {
  maxRate: 30,       // server delivers at most 30/sec
  epsilon: 0.01,     // skip numeric deltas < 0.01
});
```

The router handles rate limiting and epsilon filtering server-side, so your network stays clean.

## 5. Room-scoped multiplayer (from the fps-game example)

**Problem:** Multiple independent rooms on the same relay. Players see their room, not others'.

```js
const roomId = location.hash.slice(1) || randomId();
location.hash = roomId;
const myId = randomId();

// Announce: params persist so late joiners see you
client.set(`/app/${roomId}/player/${myId}/info`, { name, color });

// Broadcast position (set, not stream, for late-joiner benefit)
setInterval(() => {
  client.set(`/app/${roomId}/player/${myId}/pos`, { x, y, z });
}, 50);

// See everyone else
client.on(`/app/${roomId}/player/*/info`, (val, addr) => {
  const id = addr.split('/')[4];
  if (id !== myId) addPeer(id, val);
});

client.on(`/app/${roomId}/player/*/pos`, (val, addr) => {
  const id = addr.split('/')[4];
  if (id !== myId) updatePeerPos(id, val);
});

// Leave
window.addEventListener('beforeunload', () => {
  client.emit(`/app/${roomId}/player/${myId}/leave`, {});
  client.close();
});
```

Key: positions as `set()`, not `stream()`. Late joiners instantly see everyone's current position via SNAPSHOT.

## 6. Presence with heartbeat + timeout

**Problem:** Detect when a client disappears without a clean disconnect (battery died, tab crashed, mobile radio idle).

**Each client sends a heartbeat param:**
```js
setInterval(() => {
  client.set(`/room/${roomId}/player/${myId}/ping`, Date.now());
}, 5000);
```

**Everyone checks liveness every few seconds:**
```js
const lastSeen = new Map();

client.on(`/room/${roomId}/player/*/ping`, (ts, addr) => {
  const id = addr.split('/')[4];
  lastSeen.set(id, ts);
});

setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of lastSeen) {
    if (now - ts > 15000) {   // 15s timeout
      removePeer(id);
      lastSeen.delete(id);
    }
  }
}, 3000);
```

## 7. Ephemeral state with TTL (ghostcam pattern)

**Problem:** Data that should auto-expire: one-time message, anonymous upload, reveal-then-vanish.

The `set()` options in core support `ttl` in microseconds:
```js
// 5 minutes, absolute expiration
client.set(`/drop/${id}/payload`, data, {
  ttl: 5 * 60 * 1_000_000,
  absolute: true,
});
```

Semantics:
- `absolute: true`: expires at `now + ttl` regardless of access
- `absolute: false` (or omitted): sliding expiration, resets on read

At the router, expired params are removed and their `get()` returns null. In higher-level app wrappers (like ghostcam's `CLASP.get()`), this is often surfaced as the call returning `null` when the value has aged out.

## 8. Bridging two protocols

**Problem:** MIDI controller needs to drive OSC software, or OSC app needs to control DMX.

Use the CLI, not code:

```bash
# Start a router
clasp server --port 7330

# Start the MIDI bridge: your controller appears under /midi/<device>/...
clasp midi --device "Launchpad X"

# Start the OSC bridge: outgoing OSC sends mirror /osc/... params
clasp osc --port 9000

# That's it. Any app can now subscribe to /midi/Launchpad X/cc/* 
# and write to /osc/some/target/address to bridge them.
```

For a direct one-to-one mapping with no other clients involved:

```bash
clasp bridge --source midi:Launchpad\ X --target osc:127.0.0.1:9000
```

## 9. Two-way state sync with a REST API

**Problem:** Existing backend can't speak WebSockets, but you want CLASP clients to see its state.

```bash
# Start HTTP bridge
clasp http --bind 0.0.0.0:3000
```

Then from your backend:
```bash
# Set a CLASP param by PUT
curl -X PUT http://router:3000/api/params/inventory/item42 -d '{"value": 17}' \
  -H "Content-Type: application/json"

# Read a CLASP param
curl http://router:3000/api/params/inventory/item42

# Emit an event
curl -X POST http://router:3000/api/events/stock/restocked -d '{"item":42,"qty":50}'
```

Every CLASP client subscribed to `/inventory/**` sees the updates, late joiners get SNAPSHOT on connect.

## 10. Introspection: "what signals are available?"

**Problem:** Build a UI that shows every exposed parameter on a router.

```js
// Passive: listen for ANNOUNCE messages over time
client.on('/**', () => { /* register handler to absorb traffic if wanted */ });

// Query current announced signals
const signals = client.getSignals();

// Or filter by pattern
const lumenSignals = client.querySignals('/lumen/**');
```

Each signal definition has `{ address, type, datatype?, access?, meta? }` with optional `unit`, `range`, `default`, `description`, which is enough to auto-generate a control UI.

## 11. Graceful reconnect handling

The client auto-reconnects by default with exponential backoff. Show connection state to the user:

```js
client.onConnect(() => updateStatus('connected'));
client.onDisconnect((reason) => updateStatus(`disconnected: ${reason}`));
client.onReconnect((attempt) => updateStatus(`reconnecting (attempt ${attempt})…`));
client.onError((err) => console.warn(err));
```

After a successful reconnect, the client automatically resubscribes to every pattern you'd registered, so there is no need to redo them manually.

To disable auto-reconnect (useful in tests):
```js
new Clasp(url, { reconnect: false });
```

## 12. React custom hook: subscribe to one address

```tsx
function useClaspParam<T extends Value>(
  client: Clasp | null,
  address: string,
  initial: T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (!client) return;
    const unsub = client.on(address, (v) => setValue(v as T));
    return unsub;
  }, [client, address]);

  const write = (v: T) => client?.set(address, v);
  return [value, write];
}

function VolumeFader() {
  const { client } = useClasp('ws://localhost:7330');
  const [volume, setVolume] = useClaspParam(client, '/mixer/master/volume', 0.5);

  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={volume}
      onChange={(e) => setVolume(parseFloat(e.target.value))}
    />
  );
}
```

## 13. Testing without a real router

For unit tests, you can stub the client. For integration tests, run a throwaway router:

```bash
# In a separate process during tests
clasp server --port 7330

# Or docker
docker run -p 7330:7330 lumencanvas/clasp-router
```

Then point your test client at `ws://localhost:7330`. The router is stateless across restarts (unless journaling is enabled), so each test run starts clean.

## 14. Moving from `@clasp-to/core` to `@clasp-to/sdk`

If the app starts needing:
- Typed subscribe helpers (`onEvent`, `onStream`, etc.)
- Promise-returning `set()`
- Encrypted rooms / passwords / TOFU pairing
- Device provisioning (parent/child devices)
- Rules / automation

Then it's time to upgrade to `@clasp-to/sdk`:

```bash
npm install @clasp-to/sdk
```

The migration is additive: SDK wraps core, so existing `on`/`set`/`emit`/`stream` keep working. See the SDK package's own README for the expanded surface.
