# BAIL

The owner's bolo tie bench (record `knowledge/designs/bail.md`, original `fab-knowledge:originals/bail/files/bail.html`, D-222) as a design on the libraries and the engine. `build.ts` is the same kind of code a skill page writes against `@hackbuild/engine` (`docs/skill/LIBRARIES.md`, "writing a build"): it imports spec only and calls the author API. Plan v11.2 section 4.3 step (c).

| file | what it holds |
|---|---|
| `chase.ts` | slide, rim, clasp, ends, inlay controls and the `art` param of kind layers; 9 presets as values, each with its art document; 4 filament slots, slot 4 TPU95 as flex |
| `build.ts` | the blank outline, the rim ring, the inlay features from the art document, the store back recess with its peg, twin printed bridges in the clasp slot, grip fins, revolved tips on the plate, the rigid fin warning and the ported BAIL checks |
| `bench.ts`, `bench.entry.ts`, `page-build.ts`, `page-facts.d.ts`, `bake.json` | the bench and its bake inputs; `node tools/bake/bake.mjs designs/bail/bake.json` writes `dist/bench/bail.html` |
| `expected/` | parity goldens, written by `SOURCE_DATE_EPOCH=315532800 hbf parity designs/bail --accept` |
| `test/` | `build.test.ts` the chase, the art uris and each of the 9 preset builds through the CLI; `draft.test.ts` the draft numbers, the rim, the slots and the warnings in process; `catalog.test.ts` the copies of the hardware rows; `bench.test.ts` the bench |

## Hardware

Hardware rows (tier inferred, "read off the photo") are in `packages/catalog/data/connectors/`: `bail-cord-saintrygo4`, `bail-back-uclip`, `bail-back-flap`, `bail-tips-kit32`. The chase carries their numbers as params (cord, hwW, hwL, plateT, hole) and `build.ts` carries the kit tip numbers, because a build reads params only. `test/catalog.test.ts` holds each copy equal to its row.

`bail-back-flap` (the locking flap back, 19.6 x 16.3 mm, no square hole) is unused. No param default and no preset reads it. BAIL selects it through its hardware list; here a person enters its numbers as hwW, hwL, plateT and hole.

## Revision 6

`bail-6.html` leaves the kernel, clasps and tips as they are (BAIL lines 1685 to 2018 equal lines 17157 to 17518 of r6). It adds an uploaded slide shape, the badge preset in place of custom and the relief placeholder; none is carried.

## Colour and slot 4

Slot 4 is TPU95 here (role flex), the grip slot. BAIL puts rigid PETG on slot 4 in two presets, so those colours move to slots 1 to 3 and each preset note says which BAIL colour it stands for. Distances are CIELAB, computed.

| preset | BAIL slot 4 colour | port | why |
|---|---|---|---|
| scope | graticule #3E7A55: the grid, the CH1 CH2 text, the probe pin band (bail.html 1175 to 1179) | slot 1, ink | nearest of slots 1 to 3: 49.1 to ink, 57.0 to cream, 114.3 to pink |
| mesa | amber #FFB020: the sun (bail.html 1194), the cone collar and ball (1198) | sun slot 2, pink; collar and ball slot 3, cream | cream is nearest to amber (74.9) but is the body slot, so a sun in it would not show; ink 103.7 and pink 102.7 leave pink. the tips have no host, so they take cream |

## Rim

BAIL labels the rim band on every layer (`composeFace` line 1635, `buildSlide` line 1714), so the side wall prints in the rim colour. Here the rim is a ring prism through the whole thickness in the `rim` slot, and the slide prism stands inside it. One limit remains.

- The inner edge is `k.ring.offset(outline, -rimW)` with round joins, BAIL's distance field cut at the rim width (computed). A rim wider than the blank half width raises E_SCHEMA at `/rimW`.
- BAIL clips art at the band (`writable`, lines 1636 and 1637). The inlay kind refuses art cells outside the host outline, so art may not cross into the band. Three presets shrank for it: heatsync logo 34 mm (BAIL 36), mesa skyline 27 mm wide (BAIL 46 on a 46 mm blank, 30 before the ring), monogram frame 25 mm (BAIL 30).

The rim body is absent when the rim is off or shares the body slot.

## Die cut

`shape: outline` ports `composeBlank` (bail.html 1560 to 1583): the front art grown by the `outline` margin (field at 237), the largest island kept, holes filled. `build.ts` flattens the front path layers (M m L l H h V v C c Z z, 12 points per cubic), turns every ring counter-clockwise so the union fills holes, and calls `k.ring.offset(rings, outline, "round")`; the largest counter-clockwise ring is the blank. A front face down build mirrors the art in x first, because the bed face is read in hand and held against the outline mirrored. With no front path art the blank is a disc of `w` mm (bail.html 1578) and the build warns `OUTLINE_NO_ART`.

The `hslcut` preset ports `hslcut` (bail.html 1153 to 1163). The HeatSync mark is two path layers, sun disc then flames, with the `d` strings of `packages/inlay/src/marks.ts` and the bounds that reproduce the logo layer placement (span 985, centre minus the part offset). BAIL paints the mark as a logo layer; the path layers paint the same shapes and give the outline something to trace. The flames take slot 1 and the sun disc slot 2 (pink), where BAIL's disc is amber. Chamfers are not applied (see Not carried).

## Bridges and clasp slot

The bridges print in `claspSlot` (BAIL `clasp.slot`, default 1, line 1840), and the hackbuild preset uses 1. The trace preset is 1 and the monogram preset 3, as in BAIL. Face up with bridges throws E_KERNEL, as does buried face up: BAIL turns a face up bridge into a buried channel, and this kernel cannot cut one.

Buried channels build as twin printed bridges. The trace and monogram presets keep thickness 7.45 (BAIL 7.44, a layer top) and the bridges stand on top of it, 5.76 mm proud (computed: channel 4.56 plus roof 1.2), where BAIL buries the channel inside the slide.

## Rigid grip fins

The fin material is read from the profile: `handling.flexible` of the material in the grip slot (tpu95 true, petg false, tier inferred). A flexible material builds the fins as role flex; any other builds them as role body and raises the build warning `GRIP_RIGID`. The warning gives the squeeze in mm (computed), legal (none for a rigid fin), the constraint (the slot material and its `handling.flexible`, with its modulus from the profile) and the origin (`evidence/PRINT-NOTES.md`, the owner's PETG print where braided cord did not pass), plus a bound. No check in the registry reads fin material, so this is a warning and not a check.

## Ported BAIL checks

`BuildWarning` has code, text, param and bound, so measured, legal, constraint and origin are in the text in that order and the bound holds the limit with its source. A refusal is a `commandError` with the same facts in `got` and `expected`.

| check | build | BAIL |
|---|---|---|
| pad recess near the edge | `PAD_EDGE` warns under 1.2 mm, E_SCHEMA at `/padY` when the recess leaves the blank | line 1776 |
| bridge trimmed at the edge | `BRIDGE_TRIMMED` warns, E_SCHEMA at `/len` past 5 percent of the footprint | line 1788 |
| kit tip bore against the cord | E_SCHEMA at `/cord` when the cord exceeds the bore plus 0.05 mm | line 1977 |

BAIL trims bridge cells within 0.6 mm of the edge (line 1771) and counts them. This build clips the bridges at the outline only and counts the same cells.

The `SLOPE` and both `CLAMP` warnings (thickness to a layer top, tip bore depth) give measured, legal, constraint, origin and a bound.

## Not carried

| item | why |
|---|---|
| die cut tracing of text, shape and logo layers | the outline traces front path layers only (see Die cut); other kinds raise `OUTLINE_ART_SKIPPED` |
| concho outline detail | the concho samples 360 points; BAIL samples 1440 (line 1523). the chord error of the outline is 0.0009 mm against BAIL's 0.00005 mm at the 23 mm radius of the 46 mm blank (computed) |
| buried channels | a void inside the inlay host cannot be cut (the host must be a prism from the bed, and the `bore` kind has no generator in this build); `buried` builds twin bridges with a warning |
| cabochon pocket and the setting preset | the inlay kind refuses `cut` pocket and `cut` through |
| relief cameo, palette image | no painter yet; a mono or silhouette PNG image layer lowers by tracing (packages/inlay art-lower imageToPath) |
| separate back colour depth, chamfers | the inlay feature takes one depth; chamfers are not applied to an inlay host |
| per preset palettes | a preset keeps the filament slots; the preset note names BAIL's palette |
| hex tip phase, preset art sizes | the revolve route has no phase; mesa, monogram and heatsync art are smaller than BAIL's so they stay inside the rim ring |
| hardware loop height check | the loop height is not a chase param |
| wear pose, extra exports | plan step (d) |

## Metrics and claims

The build writes three informational metrics, qualifier computed on an inferred basis, and the chase declares one claim per metric (claim functions in `packages/checks/src/claims/fns.ts`). A person measures each with calipers and the cord and enters it with `hbf evidence add`; no row is written here.

| metric | claim fn | band, mm | built when |
|---|---|---|---|
| `bail.channel.clearWidth` | `bail.channelClear` | 4.25 to 5, nominal 4.5 | twin bridge clasp; net of the fin tips when grip fins are on |
| `bail.tip.bore` | `bail.tipBore` | 4 to 4.8, nominal 4.3 | any tips; the kit bore for store bought tips |
| `bail.clip.recessClearance` | `bail.clipFit` | 0.2 to 0.6, nominal 0.4 | store back recess, front face down |

The default build is the store back recess with printed tips, so the channel claim reads no metric there and is E_PARAM_MISSING until the clasp is set to bridges.

## Numbers awaiting profile rows

Typed in `build.ts` or `chase.ts` from BAIL, each read from the bench and not yet a profile row (qualifier inferred in the warnings). A person or the owner enters the rows; nothing here promotes them.

| number | where | bail.html |
|---|---|---|
| pad recess edge floor 1.2 mm | `PAD_EDGE_MM` | 1776 |
| bridge edge margin 0.6 mm | `BRIDGE_EDGE_MM` | 1771 |
| bridge trim refusal 5 percent | `BRIDGE_TRIM_ERR` | 1788 |
| kit bore tolerance 0.05 mm | `KIT_BORE_TOL_MM` | 1977 |
| kit tip 32 x 8.8 mm, bore 4 mm | `KIT_TIP`, catalog row bail-tips-kit32 | 1098 to 1111 |
| tip wall 0.9 mm, scan start 0.45 mm and step 0.05 mm, 1 mm end margin | `TIP_WALL_MM`, `wallOK` | 1986 |
| tip bore step 0.25 mm and floor 2 mm | the clamp loop | 1988 |
| tip slope ceiling 1.05 | `TIP_SLOPE_MAX` | 1992 |
| tip proportions (0.16 L, 0.9 R, 0.34 R and the rest) and chamfer min(0.4, 0.1 R) | `tipProfile` | 1885 to 1946 |
| fin margin 0.2 mm, fin width floor 0.9 mm and 1.5 x min feature | `finP`, `ribW` | 1693, 1694 |
| channel gap floor 0.8 mm | the spacing refusal | 1784, 1785 |
| cord clearance floor 0.25 mm | `CLEARANCE` | 1794 |
| recess allowance 0.4 mm, corner radius 0.6 mm, depth `ceil((plateT + 0.1) / layer)` | pad recess | 1114, 1115 |
| peg width `max(1.2, hole - 0.2)`, peg rise one layer past the recess | peg body | 1116 |
| bridge span ceiling 8.8 mm | already profile `bridge.maxMm` (inferred) | 1787 |
| plate gap 6 mm | `gap` | 2051 |
| tip segments 48 (6 for hex) | tips | 1085 |
