Command definitions: one spec per command hbf registers (name, group, description, input and output schemas, examples, CLI form), with no run body and no node built-ins. Tier 2. Core binds its run bodies to these with `bind`; a spec with no run body, or a run body with no spec, stops the load with E_KERNEL.

A command lands as a file under `src/defs/`; `node tools/gen-commands.mjs` rewrites `src/defs/index.ts`, and `--check` fails when the index and the directory disagree.

Built: release 1 (R1-engine-01), staged, not released.
