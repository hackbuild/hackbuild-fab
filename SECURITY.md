# Security

## Reporting a vulnerability

Report through GitHub private vulnerability reporting on
hackbuild/hackbuild-fab: the Security tab, then "Report a vulnerability".
Do not open a public issue for a fault that lets someone open the export
gate, read a key, or run code outside a sandbox. Include the command or
page, the input, what happened and what you expected.

## Supported versions

No version has been released. Fixes land on the main branch only. When a
release ships, this section names the versions that receive fixes.

## The export gate

Every fabrication export (`export.run`) passes build, checks and a host
gate that a person approves.

- In node the gate needs an interactive TTY on stdin and stdout and has no
  bypass flag. Without a terminal the command returns E_GATE_UNAVAILABLE
  and names the line a person runs.
- One approval binds one command, one args digest and one build hash, once,
  for 10 minutes (a code constant). Its MAC key lives in
  `.hbf/gate.key` in the workspace, 32 random bytes, mode 0600, never
  logged.
- `.claude/settings.json` denies an agent reads of `.hbf/gate.key` and
  `.hbf/http.token` and asks before every `export.run` call, through MCP or
  the CLI.
- What the gate does not stop: an actor who already holds the user's shell
  can read the key file.

## Plugins and scripts

Plugins and custom scripts arrive in release 3. Until then the repository
runs no third-party plugin. The threat model they ship under:

- A plugin is trusted as code only after its sha256 is pinned; a changed
  file is a new plugin and needs a new pin.
- Scripts run in QuickJS with no file system, no network and no process
  access.
- A plugin cannot remove a check or ungate an exporter; the release 3
  registries refuse such an entry.

## API keys

A key typed into a bench stays in that browser's memory for the session,
never in the store, a share link, an export or provenance. The page shows
only its first 4 and last 4 characters. Owner keys live only in function
environment variables.

## Scope

USE.md covers what the project will not help make. TRADEMARKS.md covers
the marks.
