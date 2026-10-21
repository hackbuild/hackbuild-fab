# SHUNT legacy copy

The SHUNT R1 board record and its generator, kept byte identical as the
input of the M04-T06 expect-set fixture (D-074, D-142). Nothing here is
edited; `shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/shunt.md` (G7 row) |
| copied from | `fab-knowledge:originals/shunt/files/` (`board.json`, `gen_board.py`), byte identical to `fab-work-directory/benches/shunt/outputs/shunt-r1/` (sha256 in the M04 card header) |
| lineage rows | `shunt.generator/r1` (canonical, `gen_board.py`), `shunt.generator/r1-legacy` and `shunt.board/r1-legacy` (copies) |
| read by | `packages/checks/test/expect.test.ts` |

## A contract fixture

G7 in `gen_board.py` (lines 699 to 718) is an inverted gate: the board
ships with exactly 5 shorts and 5 floating nets, and the gate fails when
either count drifts. The measured set the M04 fixture reads is
`board.json` `defects`: `shorts` is written from the `SHORTS` list typed
by hand at lines 705 to 709, and `floating` is derived from the nets some
part carries, by name. So the shorts half of the measured set is a hand
list in the legacy file, and the fixture proves the expect-set mechanism,
not the board's copper.

At M08 the measured set comes from nets extracted from the board geometry
(D-089) and this fixture is replaced.

No check id is assigned to the shorts set or the floating set in
CHECKS.md section 10; the fixture carries the declared sets under the
target ids `shunt-r1/shorts` and `shunt-r1/floating` until M08 names the
checks.

## Held in the originals (R1-rails-public-11)

The copies `SHA256SUMS` lists are held out of git (D-286, PLAN.md section 5).
Each one's archive id is its `where: private` row in
`tools/legacy/inventory.json`: the original when `fab-knowledge:originals`
holds the same bytes, else `fab-knowledge:originals/_legacy/<repo path>`.
`shasum -a 256 -c SHA256SUMS` checks a restored copy. A file this README
names above is that held copy.
