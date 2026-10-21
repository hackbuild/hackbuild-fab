# SASH legacy copy

The SASH source zip and baked bench, kept byte identical as the inputs of
M02-T10 (D-142, D-156). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/sash.md` |
| phase | 3, the skill crystallises (2026-09-08; `syn/patterns-and-lineage.md` section 1) |
| copied from | `fab-work-directory:benches/sash/outputs/sash/` (`sash-src.zip`, `sash.html`); both byte identical to `originals/sash/files/` |
| kernel | `runCheck` at `src/part2.js` line 814 inside `sash-src.zip`; that member is byte identical to `originals/sash/files/src/src/part2.js` (sha256 536cfa371fabda52, computed) |
| lineage rows | `sash.run-check/part2` (canonical), `sash.run-check/bench-src-zip`, `sash.parts/part2`, `sash.smoke/sash-src` |
| voice lint | `sash.html` inlines three.js, whose minified text holds one exclaim; `tools/lint-voice.allow.json` exempts this file from the exclaim rule only |

## Kernels

Consumed: the print-forge `rastermesh.js` with the pinch healer and
`orca3mf.js`, the INLAY bench skeleton.

Introduced: the prismatic raster sweep (`runCheck`, half steps along the
slide), the surface composers and the glyph library.

## Known unfixed defects

- The writer carries the 97-key filament template, not 127
  (`knowledge/designs/sash.md` 1.2).
- Slide fits 0.2 sides, 0.2 depth, 0.25 ends are the PETG fits that worked on KNURL, not measured
  on SASH; click force is analytic only; rib drag is untested
  (`knowledge/designs/sash.md` 6).
- A sliver of the next station shows at window edges (`examples/windows.png`).

## Held in the originals (R1-rails-public-11)

The copies `SHA256SUMS` lists are held out of git (D-286, PLAN.md section 5).
Each one's archive id is its `where: private` row in
`tools/legacy/inventory.json`: the original when `fab-knowledge:originals`
holds the same bytes, else `fab-knowledge:originals/_legacy/<repo path>`.
`shasum -a 256 -c SHA256SUMS` checks a restored copy. A file this README
names above is that held copy.
