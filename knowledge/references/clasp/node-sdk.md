# Node.js / TypeScript Reference: `@clasp-to/core`

The full API surface of the core client library, with exact method signatures and semantics pulled from the source in `bindings/js/packages/clasp-core/`. This is also the API exposed as `window.CLASP.Clasp` in the browser.

## Installation

```bash
npm install @clasp-to/core
```

Works with Node.js 18+, all modern bundlers (Vite, esbuild, Rollup, webpack 5+), Bun, Deno with npm compat.

## Imports

```ts
import { Clasp, ClaspBuilder } from '@clasp-to/core';
// Plus, if you want them:
import type { Value, SignalType, Message, ParamValue, SignalDefinition } from '@clasp-to/core';
import { MessageType, QoS } from '@clasp-to/core';
```

ESM is the preferred entry. CommonJS (`require('@clasp-to/core')`) is also shipped.

## `ClaspBuilder`: the fluent constructor

```ts
class ClaspBuilder {
  constructor(url: string);

  name(name: string): this;
  withName(name: string): this;               // alias

  features(features: string[]): this;
  withFeatures(features: string[]): this;     // alias

  token(token: string): this;
  withToken(token: string): this;             // alias

  reconnect(enabled: boolean): this;
  withReconnect(enabled: boolean, intervalMs?: number): this;

  reconnectInterval(ms: number): this;

  async connect(): Promise<Clasp>;  // constructs Clasp + connects + returns it
}
```

Typical usage:

```ts
const client = await new ClaspBuilder('ws://localhost:7330')
  .withName('my-app')
  .withFeatures(['param', 'event', 'stream'])
  .withReconnect(true, 5000)
  .connect();
```

The builder is fully optional. You can also do:

```ts
const client = new Clasp('ws://localhost:7330', { name: 'my-app' });
await client.connect();
```

Or, as a static helper:

```ts
const client = Clasp.builder('ws://localhost:7330').withName('my-app').build();
await client.connect();
```

## `Clasp`: the client

### Constructor

```ts
new Clasp(url: string, options?: ConnectOptions);

interface ConnectOptions {
  name?: string;                // client name, default 'CLASP JS Client'
  features?: string[];          // default ['param', 'event', 'stream']
  token?: string;               // JWT capability token
  reconnect?: boolean;          // default true
  reconnectInterval?: number;   // base ms for exponential backoff, default 5000
  connectionTimeout?: number;   // initial connect timeout ms, default 10000
}
```

### Lifecycle

```ts
async connect(timeout?: number): Promise<void>;
close(): void;

// read-only
get connected(): boolean;
get session(): string | null;  // session ID from WELCOME
```

`connect()` resolves once the server has sent `WELCOME`. It rejects on timeout, WebSocket error, or if the connection closes before `WELCOME` arrives. On disconnect, if `reconnect` is true, the client schedules reconnects with exponential backoff (base × 1.5^attempts, capped at 30s, max 10 attempts) and automatically resubscribes all existing subscriptions after reconnect.

`close()` disables auto-reconnect and closes the WebSocket.

### Reading state

```ts
subscribe(
  pattern: string,
  callback: (value: Value, address: string, meta?: ParamValue) => void,
  options?: { maxRate?: number; epsilon?: number },
): Unsubscribe;

on(pattern, callback, options?): Unsubscribe;  // alias for subscribe

async get(address: string): Promise<Value>;   // resolves from cache or queries server; 5s timeout

cached(address: string): Value | undefined;   // sync, returns undefined if never seen

getSignals(): SignalDefinition[];             // all ANNOUNCEd signals seen
querySignals(pattern: string): SignalDefinition[];
```

- `pattern` supports `*` (one segment) and `**` (any segments). `/a/*/c` matches `/a/b/c` but not `/a/b/b/c`; `/a/**` matches any depth under `/a/`.
- `maxRate` rate-limits callback invocations (Hz). Server-side throttling.
- `epsilon` suppresses updates where numeric values changed by less than this amount.
- `callback`'s `meta` is present for `SNAPSHOT`-derived deliveries and contains `{ address, value, revision, writer?, timestamp? }`.
- The returned `Unsubscribe` function is critical: call it when the component unmounts or the page unloads.

### Writing state

```ts
set(address: string, value: Value, options?: { ttl?: number; absolute?: boolean }): void;
emit(address: string, payload?: Value): void;
stream(address: string, value: Value): void;
gesture(
  address: string,
  gestureId: number,
  phase: 'start' | 'move' | 'end' | 'cancel',
  payload?: Value,
): void;
timeline(
  address: string,
  keyframes: Array<{
    time: number;   // microseconds offset from start
    value: Value;
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step';
  }>,
  options?: { loop?: boolean; startTime?: number },
): void;
bundle(
  messages: Array<{ set?: [string, Value]; emit?: [string, Value] }>,
  options?: { at?: number },  // microseconds since epoch
): void;
```

All write methods return `void`. The core library does not surface server acks as Promises. For "I know it was committed" semantics, subscribe to the same address and wait for the echo, or use `@clasp-to/sdk`.

QoS per method:
- `set()`: QoS.Confirm (at-least-once delivery)
- `emit()`: QoS.Confirm
- `stream()`: QoS.Fire (best effort, lossy)
- `gesture()`: QoS.Fire
- `timeline()`: QoS.Confirm
- `bundle()`: QoS.Commit (exactly-once ordered)

### Time

```ts
time(): number;  // current time in microseconds since Unix epoch, server-synced
```

The client adjusts for server offset on WELCOME and periodically via SYNC messages. Use this for scheduled bundle timestamps: `client.bundle(msgs, { at: client.time() + 100_000 })` = 100ms from now.

### Events

```ts
onConnect(callback: () => void): void;
onDisconnect(callback: (reason?: string) => void): void;
onError(callback: (error: Error) => void): void;
onReconnect(callback: (attempt: number) => void): void;

getLastError(): ErrorMessage | null;
clearError(): void;
```

These register callbacks; you can add more than one. They fire for lifecycle events. For per-message error visibility, read `getLastError()` after an operation.

## Value types

```ts
type Value =
  | null
  | boolean
  | number       // encoded as f64 on the wire
  | string
  | Uint8Array   // binary blob
  | Value[]
  | { [key: string]: Value };
```

Numbers are always f64 on the wire. If you need integer semantics at the protocol level, the binary codec supports i32/i64 (see `protocol.md`). In practice, use JS numbers and accept that integers up to 2^53 round-trip perfectly.

## React integration

This is the pattern straight from the core README, adapted for production:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Clasp, type Value } from '@clasp-to/core';

function useClasp(url: string) {
  const clientRef = useRef<Clasp | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Clasp(url, { name: 'react-app', reconnect: true });
    clientRef.current = client;

    client.onConnect(() => setConnected(true));
    client.onDisconnect(() => setConnected(false));

    client.connect().catch((e) => console.error('CLASP connect failed:', e));

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [url]);

  return { client: clientRef.current, connected };
}

function useClaspValue<T extends Value = Value>(
  client: Clasp | null,
  address: string,
  initialValue: T,
) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    if (!client) return;
    const unsub = client.on(address, (v) => setValue(v as T));
    return unsub;
  }, [client, address]);

  return value;
}

function Fader({ address }: { address: string }) {
  const { client, connected } = useClasp('ws://localhost:7330');
  const value = useClaspValue(client, address, 0);

  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={Number(value)}
      disabled={!connected}
      onChange={(e) => client?.set(address, parseFloat(e.target.value))}
    />
  );
}
```

Two rules for React:

1. **Return the unsub from `useEffect`.** Failing to do this leaks subscriptions on every re-render of a component with a changing address.
2. **Close the client on unmount.** Otherwise the app keeps a zombie WebSocket alive.

For Next.js / SSR, the `Clasp` constructor is browser/Node and safe in both, but calling `connect()` requires a WebSocket implementation. On the client side you're fine; on the server, you'd need to defer connection to an effect or use dynamic imports.

## Environment variables convention

The repo's examples respect:

| Variable | Default | Purpose |
|----------|---------|---------|
| `CLASP_URL` | `ws://localhost:7330` | Router URL |
| `CLASP_TOKEN` | (none) | JWT capability token |

Adopt this convention in tools and examples you write.

## Core vs. `@clasp-to/sdk`: don't conflate them

`@clasp-to/core` has the minimal client surface documented above. There's a separate higher-level package, `@clasp-to/sdk`, that wraps core and adds:

- Typed subscribe helpers: `onParam`, `onEvent`, `onStream`, `onGesture`, `onTimeline`
- Async `set()` that actually returns a Promise resolving on ACK
- `value(address)`: synchronous cached read
- Device registration and provisioning (parent/child devices)
- Encrypted rooms with passwords and TOFU key rotation
- Rules engine client
- Bridge configuration

If the user's code uses any of these methods, they're on SDK. If you're writing code for `@clasp-to/core`, don't use them; they won't exist. When a user asks for encrypted rooms or device pairing, recommend switching to `@clasp-to/sdk` rather than re-implementing those primitives on top of core.

Also watch out for app-level wrappers like the ghostcam example's `CLASP.setBlob` / `CLASP.remove` / `CLASP.getEntry`. Those are local extensions (IndexedDB + localStorage cache around the real client), not part of any official package. Don't propagate them as if they were standard.

## Gotchas summary

- Numbers on the wire are f64. No i32/u32/u64 distinction unless you're writing the codec directly.
- Addresses must start with `/`. Wildcards only work in subscriptions, never in `set`.
- Time units: microseconds. Not milliseconds. Not nanoseconds.
- `connect()` can hang if the server ignores you: respect the `connectionTimeout`.
- Reconnect is on by default. When testing, sometimes you want `reconnect: false` to see errors loudly.
- Subscribe BEFORE writing, if you want to see the SNAPSHOT reply; otherwise it arrives and has nowhere to go.
