# @hackbuild/registry-loader

The one loader of what registryHash and a chase's ids resolve against
(PLAN.md 4). It collects the constraint defs the workspace packages
export, registers the checks from the seed, and lists the exporter kinds.
Tier 2: no node API and no DOM, so `hbf part.build` and a baked bench page
load the same registry.

- `loadRegistry({ checksSeed, exporters, plugins })` returns the
  constraint registry, the registered checks, plugin kinds, the exporter
  kinds and `versions()`.
- `chaseRegistries(reg)` gives packages/chase resolveRefs its registries.
- `pageFacts(facts)` replaces the baked constraint versions of a page
  with the loaded ones and logs a drift; the baked fact stays one release
  as a cross-check.

`test/hash.test.ts` builds reference/keys/flex-pair in a page build with
the loaded versions and reads the registryHash `part.build` stored in
`expected/build.json`.
