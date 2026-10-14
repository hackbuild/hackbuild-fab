# Connect an MCP host to hbf

`hbf mcp` serves the registered hbf commands over MCP on stdio, protocol
2026-07-28, on `@modelcontextprotocol/server` 2.3.0 (PLAN.md section 16,
D-108). Each tool runs the same CommandDef the CLI runs and returns the
same CommandResult as `structuredContent`, with the CLI text mirror as its
one text block.

## Before you start

- Node at the `.nvmrc` version (`nvm use` from the repository root).
- `npm ci`, then `npx tsc -b` once: `core/bin/hbf.mjs` runs the compiled
  CLI in `core/dist`.

## Claude Code

Copy the example into the repository root and start Claude Code there:

    cp .mcp.json.example .mcp.json

The server is named `hbf`, so its tools appear as `mcp__hbf__<tool>`.
`.claude/settings.json` keeps an `ask` rule on `mcp__hbf__export_run`, so
the host asks before the call leaves it, and the server then asks again
through elicitation (below).

## Other hosts

Any host that launches a stdio server takes the same line:

    command  npx
    args     --no-install hbf mcp --workspace <repository root> --tools all

`--workspace` sets where designs resolve and where `.hbf/` lives; no tool
argument changes it. `--tools` picks a toolset profile (D-107): `all`,
`query,prove` or `sweep`. A host that cannot set a working directory
passes an absolute `--workspace`.

## Try it without a host

`tools/mcp/client.mjs` is a small client on the pinned SDK that spawns
`hbf mcp` and prints json:

    node tools/mcp/client.mjs list
    node tools/mcp/client.mjs discover
    node tools/mcp/client.mjs call part_build '{"op": "build", "chase": "reference/keys/flex-pair"}'
    node tools/mcp/client.mjs call check_run '{"report": "findings", "build": "reference/keys/flex-pair"}'

A grouped tool takes its selector (`op`, `canon`, `report` or `mode`); the
tool description lists which command each value runs. A field set to null,
false, an empty string or an empty array counts as absent. A field that
belongs to another command of the same tool is `E_SCHEMA`.

## Exports and the gate

`export_run` builds and checks first; a failing build returns its findings
and never asks. A passing build asks the person before anything is
written (D-109):

- A client that declared elicitation gets `input_required` with one form
  field, `approve`, and a message naming the export kind, machine, chase,
  build hash, fail and warn counts and the path it writes. The retry
  carries a signed `requestState` bound to that command, those arguments
  and that build hash, valid 10 minutes and once. A moved build asks again.
- A client without elicitation gets `E_GATE_UNAVAILABLE`, `isError: true`,
  with `personRuns` holding the CLI line a person runs at a terminal.
- Decline, cancel, `approve: false`, and a forged, expired, replayed or
  moved state are `E_GATE` and write nothing.

`node tools/mcp/client.mjs call export_run '<json>'` declares no
elicitation. Add `--ask` and the client puts the server's question to you
on your terminal; anything but `y` declines. No flag or environment
variable answers for a person.

## What a host can cache

`server/discover` and `hbf doctor --json` (under `result.mcp`) report the
same facts: the protocol, the toolset, the served tool names, `toolsHash`
over the listed tools, `profileHash` over `packages/profile/data`, the
kernel version and the SDK versions. A host whose cached `toolsHash`
matches can keep its tool list.

## Limits of this build

- Tools whose covered commands are not registered yet are not listed;
  `server/discover` names them under `unserved`.
- Tasks (`io.modelcontextprotocol/tasks`) and the `--http` transport land
  with M12-T03; every call answers synchronously.
