# mesh seed

The raster slab kernel harvested from the hbf handoff, with its pinch healer
replaced by the TOGGLE version (M-1-T09). Later mesh ports start from this
file. The healer freezes a cell after three flips, runs at most 200 passes,
and returns `{changed, converged, frozen, illFormed}`; `converged` is false
when a final full scan still finds ill-formed windows.

## Lineage

The record is the root `lineage.json` (D-156). This table is a readable copy
of its `healer` rows, field for field; `tools/test/lineage.test.mjs` fails
when the two differ. Empty `fixes` is written `[]`, several fixes are joined
with `; `.

| id | kind | source | sha256 | fixes | dest |
|---|---|---|---|---|---|
| healer/hbf-seed-rastermesh | copy | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mesh/rastermesh.js` | a99a159b91c9d392987b22393f04caf035762fe5301013c601c6e5f3a6697fe0 | [] | null |
| healer/inlay-print-forge-rastermesh | copy | `fab-knowledge:originals/inlay/files/skill/print-forge/assets/rastermesh.js` | a99a159b91c9d392987b22393f04caf035762fe5301013c601c6e5f3a6697fe0 | [] | null |
| healer/knuckle-extracted-rastermesh | copy | `fab-knowledge:originals/knuckle/files/extracted/rastermesh.js` | e93f927955d50561b87597f4f98f5868eeb3235b94b4786745eb6fc9ac12c27a | [] | null |
| healer/latest-toggle-rastermesh | copy | `fab-knowledge:evidence/x/latest-haft-toggle/rastermesh.js` | 6c8c99a3abdead869331878d5dd467d237ebf1741be9cffff3ec48e85efc77f7 | [] | null |
| healer/pip-controller-legacy | copy | `fab-knowledge:evidence/x/pip-controller/tools/rastermesh.js` | a99a159b91c9d392987b22393f04caf035762fe5301013c601c6e5f3a6697fe0 | [] | `designs/pip/legacy/tools/rastermesh.js` |
| healer/pip-controller-rastermesh | copy | `fab-knowledge:originals/pip/files/pip-controller/tools/rastermesh.js` | a99a159b91c9d392987b22393f04caf035762fe5301013c601c6e5f3a6697fe0 | [] | null |
| healer/toggle-extracted-rastermesh | copy | `fab-knowledge:originals/toggle/files/extracted/rastermesh.js` | 7ce1ed15c2f13e62999e36853d6fef5cf62ab27770a54ee19143033047eb548f | [] | null |
| healer/toggle-part2e | canonical | `fab-knowledge:evidence/x/toggle/src/src/part2e.js` | 3b08811c0d5011bc331d905a604d74e36ff4c152f1876e0706046890dc89060c | flips map per cell (part2e.js:25); freeze at 3 flips (part2e.js:51 to 53); 200 passes (part2e.js:33); dirty-window revisits (part2e.js:32, 36, 102); packages/mesh/src/routes/raster.ts: TypeScript port of the seed rastermesh.js with this healer, D-054 grid snap per slab bound | `packages/mesh/seed/rastermesh.js` |

The hbf seed copy ran 60 passes with no freeze and returned a bare count. The
latest TOGGLE rastermesh.js is the same healer, unpatched. The four copies under
`fab-knowledge/originals` (INLAY print-forge assets, KNUCKLE and TOGGLE
extracted, PIP controller tools) are the hbf seed text: INLAY and PIP are
byte identical to it, KNUCKLE and TOGGLE add a trailing blank line and TOGGLE
a `/* rastermesh.js */` first line (computed 2026-10-05 with `diff`). All four
keep the 60-pass healer, so none carries a fix.

## Fixtures

`test/heal.test.mjs` holds three fixtures built with a seeded mulberry32
stream. Their goldens are computed numbers from the scratch run (Node
22.12.0, macOS, 2026-10-04), confirmed under Node 22.18.0. The scripts that
produced them are kept unchanged in `test/fixtures/`; they expect
`rastermesh.js` (the hbf seed copy) and `port.js` beside them, which stay in
`fab-knowledge:evidence/x/m1heal/`.

| file | sha256 | what it ran |
|---|---|---|
| `test/fixtures/run2.cjs` | 55cbb7045cc65fc264df746cd784e40a327ee8240ce0862d59226eb79dea0bb2 | fixture A against the seed healer and the port |
| `test/fixtures/port.cjs` | f63f5aa495c400c7ef00091d3ea06394f8ddb0fe871f2c3361f83f68dd56d5bc | fixtures B and C and the 1000-seed count |
| `test/fixtures/osc2.cjs` | 4c29c9eebe9734989ae9ec8ad877dc03b97c6d2cc008e187173949fc09aa2c89 | edge and vertex audit of B and C after one call |

The two tests that compare against the 60-pass seed healer load it from its
`source` path above and are skipped where that path does not exist.
