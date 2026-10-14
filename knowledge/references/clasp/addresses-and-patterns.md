# Addresses & Wildcards

Every CLASP message is routed by an address, an OSC-style path. This is the single most consequential design decision you make when building on CLASP, because a bad address scheme locks you into pain later.

## Address rules

- MUST start with `/`
- Segments separated by `/`
- UTF-8, max 65535 bytes total (in practice, keep them short: under 100 bytes)
- Case-sensitive
- No trailing slash
- Empty segments are invalid: `/a//b` is wrong

Valid:
```
/lumen/scene/0/layer/3/opacity
/midi/launchpad/cc/74
/fps/room42/player/abc123/pos
/sensor/temperature
/
```

Invalid:
```
lumen/scene           (missing leading /)
/lumen//opacity       (empty segment)
/lumen/               (trailing slash)
```

## Wildcards: subscribe only

`*` and `**` are valid **only** in `subscribe()` / `on()` / `query()` patterns. Never in `set()` or `emit()`; a wildcard in a write is a silent bug.

| Pattern               | Matches                                                |
|-----------------------|--------------------------------------------------------|
| `/a/b/c`              | Exact path only                                        |
| `/a/*/c`              | `/a/anything/c`, exactly one segment between          |
| `/a/**`               | `/a`, `/a/b`, `/a/b/c/d`, any depth under `/a`        |
| `/a/**/z`             | Any path starting with `/a` and ending with `/z`       |
| `/**`                 | Everything                                             |

### Common pitfalls

**`/a/*/c` does NOT match `/a/b/b/c`.** `*` is exactly one segment. Use `**` for arbitrary depth.

**`/**` matches everything including `/`.** Subscribing to `/**` on a shared relay floods you with every other app's traffic. Don't.

**Regex characters in addresses are literal.** `/user.name` is a single segment containing a `.`. The pattern matcher uses a specific glob-like syntax, not regex.

## Namespace conventions

Pick a top-level segment that identifies your app and stick to it. This is how apps sharing a router stay out of each other's way.

Conventions seen in the wild:

| Prefix                | Purpose                                    |
|-----------------------|--------------------------------------------|
| `/lumen/...`          | LumenCanvas projection mapping             |
| `/midi/<device>/...`  | MIDI bridge                                |
| `/osc/<app>/...`      | OSC bridge                                 |
| `/dmx/<universe>/...` | DMX bridge                                 |
| `/artnet/<net>/<subnet>/<universe>/<channel>` | Art-Net bridge        |
| `/sacn/<universe>/<channel>` | sACN bridge                         |
| `/app/<app-id>/...`   | User apps                                  |

If you're using the public `relay.clasp.to`, always scope under a random prefix to avoid collisions with other apps on the shared relay. A good pattern:

```js
const APP = 'myapp-' + Math.random().toString(36).slice(2, 10);
client.set(`${APP}/state/score`, 42);
```

## Designing your address hierarchy

The goal is that **natural subscription patterns fall out of the hierarchy**. Think about who subscribes to what before you commit.

### Good: `/app/<room>/player/<id>/<property>`

```
/fps/room42/player/alice/pos
/fps/room42/player/alice/health
/fps/room42/player/bob/pos
/fps/room42/player/bob/health
```

Natural subscriptions:
- `/fps/room42/player/*/pos`: all positions in my room
- `/fps/room42/player/alice/**`: everything about alice
- `/fps/room42/**`: everything in the room

### Bad: `/fps/<property>/<id>` with flat structure

```
/fps/pos/alice
/fps/pos/bob
/fps/health/alice
/fps/health/bob
```

You've lost the ability to say "everything about alice in a single subscription". It's now two patterns or one overly-broad `**`.

### Bad: stuffing data into the segment

```
/fps/alice_pos        ← data embedded in the segment name
/fps/alice_health
```

Segments should be identifiers, not encoded composite keys. Use hierarchy.

## Extracting parts in handlers

When you subscribe with a wildcard, extract the dynamic segments inside your callback:

```js
client.on('/fps/room42/player/*/pos', (value, addr) => {
  const id = addr.split('/')[4];   // /fps/room42/player/<id>/pos
  //                    0  1    2      3    4  5
  peers.get(id)?.applyPos(value);
});
```

If you find yourself doing `split('/')[N]` in many places, consider a helper:

```js
function parseAddr(pattern, addr) {
  const tokens = pattern.split('/');
  const parts = addr.split('/');
  const out = {};
  tokens.forEach((tok, i) => {
    if (tok === '*' || tok === '**') out[`_${i}`] = parts[i];
  });
  return out;
}
```

Or pre-define named addresses:

```js
const addr = {
  playerPos:    (room, id) => `/fps/${room}/player/${id}/pos`,
  playerHealth: (room, id) => `/fps/${room}/player/${id}/health`,
  roomPlayers:  (room)     => `/fps/${room}/player/*/**`,
};
```

## Pattern matcher semantics (what the JS client actually does)

From `client.ts`, the matcher:

1. Replaces `**` with a temporary placeholder
2. Replaces `*` with `[^/]+` (matches any run of non-slash characters)
3. Replaces the placeholder with `.*` (matches anything)
4. Anchors with `^...$` and runs RegExp

This means:

- `*` = one or more non-slash characters (greedy)
- `**` = zero or more characters of any kind
- Exact strings match literally (regex metacharacters in addresses are safe in practice because addresses shouldn't contain them, but don't put `?` or `(` in addresses)

Edge cases:
- `/a/*` matches `/a/b` but NOT `/a/` (trailing empty segment, also invalid)
- `/a/**` matches `/a`, `/a/b`, `/a/b/c`... but note the minimal match: `**` can match zero segments
