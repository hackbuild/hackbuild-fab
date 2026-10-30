The design document as a TypeScript module read as data: source reader, schema, validator, migrations. The renderer binding lives in bench-core. Tier 2; milestone M00 (source reader `src/source.ts` with CHASE_SOURCE_RULES, D-178), M10 (defineChase, defineBuild, schema, validator, migrations, diff, patch) (PACKAGES.md).

Built: M00 (the source reader); M10-T02 (`define.ts`, `params-of.ts`, the derived zod 4.6.5 schemas and CHASE_PARAM_RULES in `schema.ts`, the declares-only verdict in `declares.ts`, registry references in `resolve.ts`, `validate.ts`); M10-T03 (migrations in `migrate/`, deep normalise in `normalise.ts`, the D-131 NaN check in `nan.ts`, share link options in `share.ts`). Staged, not released. The validator command, diff and patch land with M10-T04 and M10-T05.

The registries a chase resolves against are passed in; core assembles them (`core/src/chase/registries.ts`). The package reads no file and runs the same in node and in a bake.
