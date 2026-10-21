# GUSSET legacy copy

GUSSET v16, kept byte identical as an input of the M07 nest cards (D-142,
D-156). The owner default D-019 keeps the shop work (lumber, paint,
yardage, crew, costing) out of the plan; this copy is mined for its
MaxRects nest and its five sort orders only. Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/gusset.md` |
| copied from | `fab-work-directory:gusset (10).html`, renamed `gusset-10.html` here; byte identical to `originals/gusset/files/gusset-v16.html` (lineage `gusset.bench/v16`, canonical) |
| lineage row | `gusset.bench/m07-legacy` |

## Kernels

Introduced: `nestOnce`, `nest` (five sort orders, the best sheet count
wins) and `packBoards`, byte identical from GUSSET v1 to v16.

## Known unfixed defects

- The page loads three.js 0.147.0 from cdn.jsdelivr.net, so it needs the
  network to open (`knowledge/designs/gusset.md` section 1).

## Held in the originals (R1-rails-public-11)

The copies `SHA256SUMS` lists are held out of git (D-286, PLAN.md section 5).
Each one's archive id is its `where: private` row in
`tools/legacy/inventory.json`: the original when `fab-knowledge:originals`
holds the same bytes, else `fab-knowledge:originals/_legacy/<repo path>`.
`shasum -a 256 -c SHA256SUMS` checks a restored copy. A file this README
names above is that held copy.
