The design document as a TypeScript module read as data: source reader, schema, validator, migrations. The renderer binding lives in bench-core. Tier 2; milestone M00 (source reader `src/source.ts` with CHASE_SOURCE_RULES, D-178), M10 (defineChase, defineBuild, schema, validator, migrations, diff, patch) (PACKAGES.md).

Built: M00 (the source reader); M10-T02 (`define.ts`, `params-of.ts`, the derived zod 4.6.5 schemas and CHASE_PARAM_RULES in `schema.ts`, the declares-only verdict in `declares.ts`, registry references in `resolve.ts`, `validate.ts`); M10-T03 (migrations in `migrate/`, deep normalise in `normalise.ts`, the D-131 NaN check in `nan.ts`, share link options in `share.ts`). Staged, not released. The validator command, diff and patch land with M10-T04 and M10-T05.

The registries a chase resolves against are passed in; core assembles them (`core/src/chase/registries.ts`). The package reads no file and runs the same in node and in a bake.

## Design module (plan v11.2 section 4.1)

`designs/<id>/design.ts` holds one `export const designModule = design({ id, meta, slots, params, presets, expect, waive, hookup, widgets, build, ... })`. `designToChase` (`src/design.ts`) lowers it to the Chase, and `readChaseSource` does the lowering when the text is a design module, so the pipeline, checks, goldens and bake read the same document. Rules:

- Every member except an inline `build` is a literal read as data with spans (D-178). `chase.patch` edits through the chase pointers: `/id` is `/meta/id`, `/slots` is `/materials`, every other member keeps its name.
- `build` is either the literal `{ module, fn }` of a build.ts, or a function expression. The reader skips a function expression as one opaque span (`/build`) and lowers it to `{ module: "./design.ts", fn: "build" }`; the sandbox resolves `build` as `designModule.build` of design.ts under the same import allowlist.
- `widgets` is a declarative `WidgetDecl[]` for the bench layer; the lowered Chase carries none.
- A build.ts types its params with `defineDesignBuild(designModule, (p, k) => ...)`.
- A directory holds `chase.ts` or `design.ts`; `core/src/design-file.ts` (`designFileIn`, `readDesignDir`) is the one place that recognises either, and `DESIGN_FILES` serves the tools.

Files a new design needs now (counted, from reference/sensors/finger-pot):

1. `design.ts` (authored)
2. `build.ts` (authored; none when `build` is inline)
3. `README.md` (authored)
4. `test/reference.test.ts` (authored)
5. `tsconfig.json` (copied)
6. `expected/build.json`, `report.json`, `edit.json`, `artifacts.json` (four files written by `hbf parity --accept`)
7. `lineage/<subject>.json` and the knowledge record (authored)

That is 11 files with 5 authored by hand beyond the lineage and knowledge rows; generating the reference folder, lineage row and index from the design module, the plan's route to under 8, is not built. Not wired for design.ts: `chase.scaffold --from`, `chase.diff --against <git ref>`, draft bakes, and a bench.ts (it imports `chase` from ./chase).
