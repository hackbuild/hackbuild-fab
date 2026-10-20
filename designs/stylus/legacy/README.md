# STYLUS legacy copy

STYLUS (working name, was FEELER) is one design whose sensor types are
archetype entries (D-164). This folder keeps both shipped FEELER benches,
the ladder design saved from the 22-archetype bench and two ladder 3MFs,
byte identical, as the inputs of M10-T09 and the BenchHook adapter targets
of M10-T01 (D-142, D-156, D-222). Nothing here is edited; `shasum -a 256 -c
SHA256SUMS` checks every file.

| field | value |
|---|---|
| records | `knowledge/designs/thinpot.md` (THINPOT, UX of record: section 5), `knowledge/designs/feeler-v1.md` (v1) |
| produced by | the FEELER bench chats, single files with their own WebGL renderer, earcut port, zip and 3MF writer, no git; v1 on 2026-08-21, THINPOT `feeler (6)` to `(16)` from 2026-09-08 to 2026-09-11 (thinpot.md 1.1) |
| canonical | `thinpot/feeler.html` = `feeler (16).html` (2026-09-11 00:20), 22 archetypes; every later save, `(17)` and `(18)`, is byte identical (thinpot.md 1.1). `v1/feeler.html` (20 archetypes) is the predecessor and a `copy` row |
| equal to | `fab-knowledge:originals/thinpot/files/feeler_thinpot.html`, `originals/feeler-v1/files/feeler_v1.html`, `originals/thinpot/files/feeler-ladder.json` and `feeler-ladder-inplace-sample.3mf` (compared by sha256 2026-10-14); `feeler-ladder (1).3mf` is not in the originals set |

## Files

| file | copied from | sha256 (12) | bytes | lineage rows |
|---|---|---|---|---|
| `feeler-thinpot.zip!feeler.html` | `fab-work-directory:benches/feeler-thinpot/outputs/feeler.html` | 35467f4b0221 | 412640 | `feeler.bench/thinpot-16` (canonical), `feeler.bench/thinpot-16-bench-outputs` |
| `feeler-v1.zip!feeler.html` | `fab-work-directory:benches/feeler-v1/outputs/feeler.html` | 0671193edade | 279521 | `feeler.bench/v1`, `feeler.bench/v1-bench-outputs` |
| `feeler-ladder-inplace-sample.3mf` | `fab-work-directory:benches/feeler-thinpot/outputs/` | 02c1ac43a12e | 2491320 | `feeler.ladder-sample/thinpot-16`, `/bench-outputs` |
| `feeler-ladder.json` | `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/feeler/` (saved 2026-09-08 23:17, `v` 1, `type` ladder) | a01cc14d16a0 | 6733 | `feeler.ladder-json/thinpot-16`, `/dl`; the fixture `migrate/legacy.ts` is tested against in M10-T09 |
| `feeler-ladder (1).3mf` | same downloads folder (2026-09-08 17:01) | 8f61c82cdfb2 | 2328655 | `feeler.ladder-3mf/dl` |
| `shots/tp-*`, `shots/owner-*`, `shots/slicer-*` | `fab-knowledge:originals/thinpot/shots/` | per SHA256SUMS | | side by side review |
| `shots/v1/` | `fab-knowledge:originals/feeler-v1/shots/` | per SHA256SUMS | | side by side review |

Sizes and hashes measured 2026-10-14; a `zip!member` row gives the
member's bytes. The downloads folder holds five
ladder 3MFs (`feeler-ladder.3mf`, `(1)`, `(2)`, `(6)`, `(10)`); the card
names `(1)`, and no two of the five share a hash.

## Why the two pages are zip members

Both pages draw their gate marks with emoji entities (U+2713, U+2717,
U+26A0; thinpot lines 6115 to 6903, v1 lines 4748 to 5163). RULES.md
allows no emoji in a repo file and lint-voice can never allow one, so each
page is kept byte identical as the one member of a stored zip,
`feeler-thinpot.zip` (412798 bytes, sha256 c98ec71db2fa) and
`feeler-v1.zip` (279679 bytes, sha256 e994300f2bba), the way
`blocks/legacy/boss-src.zip` keeps `build.py`. `tools/legacy/stored-zip.mjs`
writes them (no compression, UTC member times, a fixed archive comment) and
reads them; `tools/test/m10-legacy.test.mjs` rebuilds each zip from its
members and hashes the members against the card's table. The hook suite
extracts each page to `out/legacy-pages/` and checks its sha256 before it
opens it (`LegacyAdapter.archive`). Made with

    node tools/legacy/stored-zip.mjs designs/stylus/legacy/feeler-thinpot.zip feeler.html=<fab-work-directory>/benches/feeler-thinpot/outputs/feeler.html
    node tools/legacy/stored-zip.mjs designs/stylus/legacy/feeler-v1.zip feeler.html=<fab-work-directory>/benches/feeler-v1/outputs/feeler.html

## Hook

Neither page installs a global. The adapters read the DOM:

- `stylus` (THINPOT) boots on the type picker with no type; each picker
  card is a real build at defaults drawn into a 2D canvas, so it is ready
  when the first card has painted pixels. Its example clicks the first
  card, which builds that type onto the stage.
- `stylus-v1` boots with type `cappad` built; it is ready when the legend
  rows and the size HUD are written, which `rebuild()` does after
  `upload()` hands the build to the stage.

The stage itself is WebGL with `preserveDrawingBuffer: false`, so a pixel
read after compositing proves nothing; both probes read what the build
writes. Design JSON, exports and drive are not provided by the legacy
benches.

## Inherited defects the port must not carry

- Six Google fonts load at run time (line 9 of both pages); offline the
  faces fall back.
- The encoder draws B marks offset by `step/2` (180 electrical deg) while
  the sim uses `step/4`, in both pages (thinpot.md 4.7; CANONS.md 3.1 sets
  the port to step/4).
- The THINPOT HOOKUP schematic draws T1 to 3V3 and T3 to GND while the
  wiring text says the reverse (`shots/tp-thinpot-hookup.png`).
- v1 only: the encoder fit reads `P.armW`, which is not an encoder param,
  so one fit is NaN and never ok; the welcome card says fourteen
  archetypes for twenty; `EZ` overlaps between materials (feeler-v1.md
  4.7). THINPOT fixed all three.
