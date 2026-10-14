hbf: one set of CommandDef objects and the CLI transport, the store and the gate. MCP and HTTP land at M12. Tier app; milestone M00 (PACKAGES.md).

The bin `bin/hbf.mjs` runs the compiled `dist/cli.js`, which is gitignored. In a
fresh clone run `npx tsc -b` from the repo root once before `npx --no-install hbf`.
