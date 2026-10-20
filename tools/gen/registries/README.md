# Registry generators

One module per gathered registry, run by `node tools/gen/registries.mjs` in file name order.
A module exports `name` (lowercase letters, digits, hyphens) and `outputs(root)` returning `[{ path, text }]`, path relative to root.
Each output path has one owning module; the module header names its fragment directory and the one rule for adding a fragment.
Pure node only: no dist reads, no network. Helpers live in `tools/gen/lib.mjs`.
A new module comes with `tools/test/<name>.test.mjs`; `--check` runs in `npm run derived` and fails on any stale output.
