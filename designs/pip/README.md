# PIP

PIP: the harvested original in `legacy/`; the chase port lands at M10 (D-142). `test/` checks that the legacy bake installs its `npm:` sources first.

`migrate/legacy.ts` reads a legacy PIP save (`{app: "pip-bench", v: 1, state}` or a bare state) into a design document for share links with no version prefix (D-167); the example saves it loads are copied under `test/fixtures/legacy/` with `SHA256SUMS` (M10-T03).
