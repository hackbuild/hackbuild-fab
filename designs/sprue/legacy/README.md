# SPRUE legacy copy

`sprue.html`, `sprue.py` and `print-card.txt` are the SPRUE bench, its
python generator and the print card that generator wrote, kept unchanged as
the originals of record for the port in `../build.ts` and the package
parity in `../test/` (D-142, D-156, D-222). They are never edited;
`tools/legacy/sprue-parity.mjs`, `tools/py/harness/sprue_parity.py` and the
tests that cut code from `sprue.html` refuse to run when the bytes stop
matching `sha256.txt`.

| file | copied from | canonical row | sha256 | bytes (measured) |
|---|---|---|---|---|
| `sprue.html` | `fab-knowledge:originals/sprue/files/sprue.html` (lineage `sprue.bench/design-legacy`; byte identical to the harvest row `sprue.bench/harvest`) | `sprue.bench/sprue-html` | `a1acb293ad96c7dd5062a9e65741a7f27959584dfb10e64decb41468c59e4fe7` | 160912 |
| `sprue.py` | `fab-knowledge:originals/sprue/files/sprue.py` (lineage `sprue.py/design-legacy`) | `sprue.py/sprue-py` | `1c2f22a66394abff83774c9dbcac2c0c5766959cbc22564c362530b7b8c5da4b` | 43104 |
| `print-card.txt` | `fab-knowledge:originals/sprue/files/print-card.txt` (lineage `sprue.print-card/design-legacy`) | `sprue.print-card/print-card-txt` | `0d0e12011d9f2776a301b912d1b5d194e894f22bc694fc6c503258b74becb4da` | 1028 |

Built 2026-09-06; only one build of each file exists (record
`knowledge/designs/sprue.md` 1.1). The conversation is
`6794b094-b698-4192-8dc1-2321c473be09`, "Fast multi-color 3D printed
giveaway coins".

What the port reads from `sprue.html`, by line: the engine (279 to 942:
`fromPolygon` 337, `catmull` 364, `pickOutline` 380, `circleOutline` 387,
`trace` 403, `simplify` 450, `group` 514, `build` 668), the app state and
presets (956 to 992), `geo` (996 to 1033), `drawLayer` (1040 to 1095),
`compose` (1097 to 1111) and `checkThin` (1114 to 1125). From `sprue.py`:
`motif_bolt` (312) and `build_object` (487 to 525). `print-card.txt` is
read by the parity harness for the informational volume table.

## Public through release 1 (R1-rails-public-10)

Kept in git: `sprue.html`, `sprue.py`, `print-card.txt`, `README.md` and
`sha256.txt`. The CI sprue parity step
(`tools/py/harness/sprue_parity.py designs/sprue/legacy/sprue.html`) reads
the page and `print-card.txt`, and the geom trace test cuts code from the
page. `sprue.py` has no reader; it stays because the held mechanism
(D-286, `tools/legacy/held.mjs`) records held bytes through a
`SHA256SUMS` and this folder pins by `sha256.txt`. The folder holds no
slicer save, shot or print zip.
