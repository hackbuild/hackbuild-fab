# BAIL: the bolo tie bench

How the owner's BAIL bench is made, read from its code, so a builder can port its pieces to the packages and make the next bolo tie bench the same way. BAIL is registered as an original under D-222 on the owner's word, "incorporate bail" (2026-10-30). Nothing here comes from the quarantined mockups.

Code root for every location below: `fab-knowledge:originals/bail/files/bail.html` (one file, 3178 lines, eight code parts from line 400 to 3176 after two inlined libraries). A location written `bail.html:1349-1406` means lines 1349 to 1406 of that file.

Number qualifiers: a number followed by a `bail.html:line` citation is a constant read from that line; `measured` means read off a headless drive of the canonical file on 2026-10-30 (drive script `fab-knowledge:originals/bail/drive/bail.cjs`, output `drive/bail-drive.json`, Chrome 150.0.7871.125 through Playwright 1.63.0 from file://) or off the repo validator run on the evidence files; `computed` means arithmetic done here from cited constants; `vendor` means a slicer preset value; `inferred` and `unknown` mean what they say.

## 1. Identity and revision

| item | value |
|---|---|
| name | BAIL, shown as "BAIL.BENCH" with the tagline "multimaterial bolo ties. make things. break things. repeat." (`bail.html:166-167`) |
| slug | `bail` |
| canonical file | `fab-knowledge:originals/bail/files/bail.html` |
| sha256 | `4accb6428d31b3e687340ed8e35c2fb5f0edc19307d4090bd37d066474e86ccd` |
| bytes | 1,116,497 (measured) |
| built | 2026-10-30 01:15 (mtime, measured) |
| kind in the plan | `single` bench, the first adopted bench (plan v11 section 4.3) |
| made by | the owner; this record names it the owner's BAIL bench |

### 1.1 Revisions, and why this one is canonical

| mtime | file | bytes | sha256 (12) | what it holds |
|---|---|---|---|---|
| 00:56 | `files/bail-r1.html` | 1,081,806 | 0664393a0bee | r1: 10 presets (no cameo), no relief layer, no Depth Anything route, no hardware rows (no U clip, cord, kit tips), no locating peg |
| 01:15 | `files/bail.html` | 1,116,497 | 4accb6428d31 | adds the CAMEO preset and the relief layer with its Depth Anything V2 small route, the `HW` hardware rows (cord, back, tips), the `pad` locating peg and its checks (counts of the word in each file, measured: relief 0 in r1 and 55 here, uclip 0 and 2, pegW 0 and 10, cameo 0 and 8) |

The 01:15 build is newer and a superset of r1, and every owner export under `evidence/` is dated 01:27 or later, so it is canonical. r1 is kept as a copy (lineage `bail.bench/bail-r1`).

### 1.2 Companions copied

All under `fab-knowledge:originals/bail/`, sha256 in `fab-knowledge:originals/bail/SHA256SUMS`.

| file | what it is |
|---|---|
| `files/bail.html` | the bench |
| `files/bail-r1.html` | revision r1 |
| `evidence/bail-hackbuild.3mf` | the owner's export of the hack.build design, 2026-10-30 01:30; project 3MF, 6 meshes (slide 80,812, 23,668 and 77,708 triangles; tip 576, 384 and 1,152), 4 filaments |
| `evidence/bail-hslcut.3mf`, `evidence/bail-hslcut (1).3mf` | the owner's exports of the HSL die cut design, 01:27 and 01:28; the first 6 meshes, the second 5 |
| `evidence/bail-cameo.3mf` | 2026-10-30 01:41; a slicer save holding the four designs, 12 build items (section 7.2) |
| `drive/bail.cjs`, `drive/bail-drive.json` | the shot and timing drive of section 3 and its output |
| `shots/b-NN-<preset>-art-step.png`, `shots/b-NN-<preset>-checks-step.png` | 22 shots, one pair per preset |

## 2. What it makes and for whom

A multimaterial bolo tie slide, the plate on a cord, plus the two tips that cap the cord, on a multi-tool FDM printer (Flashforge Creator 5 Pro, four toolheads; `bail.html:1090-1091` writes the printer and process names). The slide carries art on a front and a back face as flush colour inlay; the tips are revolved solids banded across up to three slots. The owner wears it on a 4 mm braided leather cord with a U slide clip or a printed clasp. It exports a slicer-ready project 3MF that opens in Flash Studio, OrcaSlicer or Bambu Studio with every part on its extruder, plus per-part STLs, a print card, a face PNG and a design JSON. It runs from `file://`; the page loads fonts from embedded base64 and only the relief route reaches the network (section 4.13).

What BAIL adds to COLLAR (`knowledge/designs/collar.md`), the coin bench it extends: seven layer kinds on one layer model (text, shape, logo, scope, circuit, image, relief), a cut mode per layer (through and pocket), three clasp constructions with print pose rules, banded revolved tips, a hardware table, eleven presets, a wear pose with the cord, and a relief cameo. It reuses the print-forge `RasterMesh` (`bail.html:400-753`) and the Orca 3MF writer (`bail.html:754-1053`).

## 3. Shots

Folder: `fab-knowledge:originals/bail/shots/`. All 1280 x 860 drives of the canonical file, 2026-10-30 (measured). For each preset `BENCH.load(key)` built it, then step 1 ART was opened for `*-art-step.png` (3D wear pose on the left, the front face board in the middle, the design cards and layer list on the right) and step 6 PRINT for `*-checks-step.png` (print reality, plate, exports and the readout). Each was looked at on 2026-10-30.

| shot | caption |
|---|---|
| `b-01-hsl-art-step.png` | HEATSYNC: a 46 mm concho with 18 scallops, the HeatSync mark in bone, sun and ink, 217,372 triangles in 421 to 525 ms (measured). The status strip shows one check chip, the photo note of the U clip. |
| `b-02-hslcut-art-step.png` | HSL DIE CUT: the slide outline follows the mark. The right edge of the cut outline is flat and vertical in the board, clipped where the grid ends (section 7.1). |
| `b-03-hackbuild-art-step.png` | HACK.BUILD: a 44 mm round slide, the mark in ink and pink on cream with "hack.build" in Permanent Marker, a jack plug tip in the wear pose, 188,806 triangles. |
| `b-04-scope-art-step.png` | SCOPE: a rounded rectangle bezel, a 3 by 2 Lissajous trace over an 8 division graticule in a phosphor green. |
| `b-05-trace-art-step.png` | TRACE: a shield in solder mask green with seeded copper traces, pads with drills, a frame and silk text, buried cord channels. |
| `b-06-mesa-art-step.png` | MESA: a sun with gaps that widen toward the horizon, a mesa skyline in pink and a saguaro in ink. |
| `b-07-concho-art-step.png` | CONCHO: the generic base, a ring and a stepped diamond in pink on a scalloped blank. |
| `b-08-setting-art-step.png` | SETTING: an oval with a 2.4 mm deep pocket for a cabochon, drawn grey in the board; face up. |
| `b-09-monogram-art-step.png` | MONOGRAM: an octagon with a rotated frame and "MZ" in Permanent Marker, buried channels, hex tips. |
| `b-10-cameo-art-step.png` | CAMEO: the relief layer inflating the hack.build mark into a 2.4 mm cameo, shaded in the board, 158,352 triangles with a 53,800 triangle heightfield part. |
| `b-11-custom-art-step.png` | YOUR ART: a blank round slide waiting for an SVG or PNG drop, the store bought tips row. |
| `b-NN-<preset>-checks-step.png` | the same preset on step 6: the layer, min feature, boost, gap, despeckle and resolution controls, the plate, the export buttons and the check list. |

## 4. Mechanisms and constructions

Each section gives what it does, the construction in order, constants with qualifiers, code locations, fits and print settings, and limits.

### 4.1 The eight parts

The page inlines JSZip (`bail.html:375-389`) and three.js (`390-398`), then eight scripts of its own. Line ranges include the script tags.

| part | lines | what it holds |
|---|---|---|
| rastermesh.js | 400-753 | `RasterMesh`: raster in XY, exact in Z; label slabs, pinch healer, greedy caps, conformed T-junctions, per-slot meshes. The print-forge seed, lineage `healer/*` |
| orca3mf.js | 754-1053 | the project 3MF writer: `MATERIALS`, `FILAMENT_TEMPLATE`, model, model settings, project settings, slice info, `stl`, `printCard` |
| part2a marks | 1054-1061 | `MARKS`: the HeatSync and hack.build marks, "verbatim mark geometry. never redraw." |
| part2b state | 1062-1675 | state, `HW` hardware rows, layer factories, 11 presets, history, the layer painters (`shapePath`, `paintLayer`, `circuitOf`), the blank, `composeFace` |
| part3 kernel | 1676-2099 | the slide kernel (`buildSlide`), clasps, revolved tips, `build`, the plate layout |
| part3b relief | 2100-2291 | the relief height field, its mesh, Depth Anything in the browser |
| part4 view | 2292-2543 | exports and the three.js viewer with the wear and print poses |
| part5 ui | 2544-3176 | six steps, bindings, presets, layers, the face editor, status, boot |

The eight own parts run 2,777 lines with their tags and 2,769 from each opening tag to its last line before the closing tag (computed from the table).

### 4.2 The layer model

`lay(kind, o)` (`bail.html:1128`) gives every layer the same ten fields: `id` (from a counter `L10`, `L11`, ...), `kind`, `dx`, `dy` (mm), `rot` (degrees counter-clockwise), `slot`, `slot2` (1-based filament slots), `cut` (`none`, `through` or `pocket`), `depth` (pocket depth, mm, default 1.2) and `mute`. Defaults: dx 0, dy 0, rot 0, slot 1, slot2 2, cut `none`, depth 1.2, mute false. A design holds `faces: { front: [...], back: [...] }` and is saved as `{ app: "bail-bench", v: 1, state }` (`bail.html:2342`, `designJson`). The seven kinds and their own fields, with the factory that sets the defaults:

| kind | factory | fields and defaults | what slot and slot2 paint |
|---|---|---|---|
| text | `T` (1129) | `text`, `font` plexb, `size` 4 mm, `ls` 0 (letter spacing, mm), `arc` 0 (signed radius, mm), `splitGap` 0.6 mm | slot the first run, slot2 the run after a pipe; an arc ignores the pipe and uses slot only (`partsOf` 1282, `slotFor` 1290) |
| shape | `SH` (1130) | `shape` (13 kinds), `w` 20, `h` 20, `t` 1.2, `n` 6 | slot |
| logo | `LOGO` (1131) | `brand` hb or hsl, `w` 30 | hb: slot the arc, slot2 the wrench; hsl: slot the flames and arrow, slot2 the sun disc (1291) |
| scope | `SCOPE` (1132) | `a` 3, `b` 2, `phase` 90 degrees, `w` 30, `h` 22, `t` 0.9 | slot |
| circuit | `CIRC` (1140) | `seed` 7, `w` 34, `h` 40, `pitch` 2.4, `tw` 0.8 (trace), `pad` 2.2, `drill` 0.7, `density` 1, `clip` ellipse | slot the traces, slot2 the pads, the body colour the drills (1292) |
| image | `add` (2778) | `src`, `mode` mono, silhouette or palette, `w` 24, `thr` 0.5, `invert` false | mono and silhouette: slot; palette: each pixel to the nearest filament slot by weighted RGB distance (0.3, 0.59, 0.11, 1481 to 1485) |
| relief | `RELIEF` (1133) | `src`, `depthSrc`, `source` depth, `model` `onnx-community/depth-anything-v2-small`, `device` auto, `w` 30, `height` 2.4, `base` 0.24, `bgcut` 0.25, `gamma` 1, `smooth` 0.3, `detail` 0.15, `roll` 1.2, `inset` 0.6, `thr` 0.5, `invert` false, `mode` smooth, `split` 1 | slot the relief, slot2 above the split height in terrace mode (1830 to 1832) |

Layer order is paint order: later layers paint over earlier ones (`composeFace`, 1629 to 1655). The editor offers duplicate, raise, lower and copy to the other face (2859 to 2870).

### 4.3 The layer painters

`paintLayer(ctx, L, res, part, ignoreXform)` (`bail.html:1408-1496`) paints one part of one layer as an alpha mask on a canvas covering the grid, y up, in mm: `translate(W/2, H/2)`, `scale(res, -res)`, then, unless `ignoreXform`, `translate(dx, dy)` and `rotate(rot)` (1411). A cell counts when alpha is above 127 (1649). `partsOf` (1282) is how many parts a layer paints: 2 for text with a pipe and no arc, 2 for a logo, 3 for a circuit, the palette size for a palette image, else 1.

**Shape** (`shapePath`, 1349-1406), in layer-local mm, y up, `n = max(1, round(n))`:

| shape | construction | lines |
|---|---|---|
| ring | the ellipse w by h less an inner ellipse of semi-axes `max(0.01, w/2 - t)` and `max(0.01, h/2 - t)`, even-odd | 1356 |
| rect | `rect(-w/2, -h/2, w, h)` | 1354 |
| ellipse | `ellipse(0, 0, w/2, h/2)` | 1355 |
| frame | the rect less one inset by t on every side, even-odd | 1357 |
| diamond | four points on the axes at w/2 and h/2 | 1358 |
| chevrons | three chevrons at x = -0.4 w, 0, 0.4 w; the arms sit 0.16 w left of the tip and the stroke is t thick | 1359 |
| grid | scope graticule: n + 1 bars across and `max(1, round(n h / w))` + 1 lines, each t wide and t longer than the frame | 1360-1366 |
| sun | a disc of diameter w cut by n gaps at `y = -w/2 (k+1)/(n+1) + 0.04 w`, gap height `t (0.55 + 0.9 k / max(1, n-1))`, drawn with destination-out | 1367-1373 |
| saguaro | a trunk stroke 0.27 w wide and two arm strokes 0.2 w wide, round caps and joins, base cut square by a `fillRect` | 1374-1383 |
| mesa | one polygon of 12 unit points scaled by w and h | 1384 |
| zigzag | a polyline of 2n + 1 points on rails t/2 inside the extent, stroked t wide with miter joins and miter limit 10 | 1385-1388 |
| steps | the stepped diamond: a quarter of n steps mirrored in y and x, a closed outline stroked t wide with miter joins | 1389-1396 |
| arrow | a shaft t tall, a head 0.3 w long (at most 1.2 h) and two tail feathers, one nonzero fill | 1397-1404 |

**Text** (1416-1444): `font` is a key into `FONTS` (`marker` Permanent Marker, `plexb` and `plex` IBM Plex Mono, `elite` Special Elite, `vt` VT323, line 1068); `FONTW` puts weight 600 on `plexb` (1069). The text is set glyph by glyph with `textBaseline` middle and `textAlign` left. A run measures the sum of its glyph widths plus `ls` each, less one `ls` (an empty run measures minus `ls`). Straight text is centred on x = 0 with the pipe runs `splitGap` apart. An arc has radius `|arc|`; above 0 it runs along the top of the circle, below 0 along the bottom, each glyph rotated to the tangent, and the whole arc turns with `dx`, `dy` and `rot`.

**Logo** (1445-1456): the mark maps path units to mm as `s (p + at - centre)` with y flipped, `s = w / span`, where hb has span 800 and centre (517, 503) and hsl span 985 and centre (459.5, 479) with an extra offset (-26, -4) (`MARKS`, 1056-1059). hsl fills even-odd; hb fills with the canvas default.

**Scope** (1457-1462): `N = 1600` points, `x = w/2 sin(a u + phase)`, `y = h/2 sin(b u)`, `u` over one turn, stroked t wide with round caps and joins.

**Circuit** (`circuitOf`, 1297-1347; paint 1463-1466): seeded with `mulberry32(seed * 9973 + 17)`. Nodes sit on a grid of pitch `max(1, pitch)` inside the board less half a pad, inside the ellipse when `clip` is ellipse; the wanted trace count is `round(count * 0.11 * density)`. Each trace starts at a random free node, heads along an axis, turns 45 degrees right or left with probability 0.3 per step (a draw of 0.5 picks the side), takes 3 to 11 steps, and refuses nodes already used, diagonals that cross an earlier diagonal, and nodes of its own path. A trace under 3 nodes is dropped. Each kept trace reserves its nodes and a one node halo round both ends, and puts a pad at each end. Traces are stroked `tw` wide with round caps and joins; pads are discs of diameter `pad`; drills are discs of diameter `drill` painted in the body colour.

The three painter families differ in what they are tested against in the repo: `packages/inlay/test/bail-layers.test.ts` compares the port to the cells BAIL's own canvas paints (fixture `packages/inlay/test/fixtures/bail-canvas.json.gz`, captured by `tools/inlay/bail-canvas.cjs`).

### 4.4 The marks registry

`MARKS` (`bail.html:1056-1059`) holds two marks as SVG path strings with offsets: hsl `sun` (2,515 characters, measured) and `flame` (10,607) with `gx -26`, `gy -4`, `cx 459.5`, `cy 479`, `span 985`; hb `arc` (889) and `wrench` (503) with `ax 490`, `ay 121`, `wx 498`, `wy 314`, `cx 517`, `cy 503`, `span 800`. The hack.build strings equal the two paths of `hackbuild-mark.svg` that COLLAR and `reference/cosmetic/coin-inlay` use (checked byte equal on 2026-10-30). The HeatSync mark is the HeatSync Labs logo; the owner has not cleared it for the public repository. The commands used are `M`, `m`, `h`, `l`, `v`, `z` for hb, `M`, `c`, `l`, `z` and `m` for hsl, so the node path flattener reads both with curves on. A `build` rule refuses a HeatSync mark whose two slots are equal (`bail.html:2027`) and warns when its flames sit on the body slot (2028).

### 4.5 The blank: slide shapes

`blankPath(ctx)` (`bail.html:1508-1529`) draws the blank for `slide.shape` at `slide.w` by `slide.h`: round (an arc of diameter w), oval (an ellipse), rect (rounded by `slide.r` with `arcTo`), shield (a top quadratic and two bezier sides to a point), concho (a circle of diameter w scalloped by `scallops` lobes of depth `scallopD`, 1440 points), hex, octagon, arrowhead, and `outline`. `outline` (1555 to 1583) builds the blank from the front art itself: every non-cut, non-relief layer is painted, the cells within `outline` mm of the art by an exact distance transform (Felzenszwalb, `edt`, 1530 to 1551) become the blank, only the largest island is kept, and holes are filled by a flood from the border; with no art it falls back to a circle of diameter w. `blankExtent` (1497) is w by h, and for `outline` w + 2 outline + 1 by h + 2 outline + 1. `gridFor(res)` adds 8 cells to each dimension (`W = ceil(w res) + 8`). Defaults (`blankState`, 1076): shape round, w 44, h 44, r 6, scallops 16, scallopD 1.2, outline 2.4, thk 4.8, inlayF 0.72, inlayB 0.48, chamF 0.48, chamB 0.24, orient down; rim on, 1.6 mm.

A distance field of the blank (`dist`, mm from the edge, `(edt - 0.5) / res`, 1585) decides the rim band (`dist < rim.w` takes the rim slot) and the edge break.

### 4.6 The face composer and hygiene

`composeFace(face, G, blank, quick)` (`bail.html:1629-1675`) paints one face as it is read: the front from the front, the back from the back (so the back board is the face as seen from behind).

1. The blank fills with the rim slot where `dist < rim.w` and the body slot elsewhere; cells at `dist >= rim.w` are writable.
2. Each layer paints, part by part, into `labels` (kept `under` for undo), `cuts` (cut through) or `pocket` (cut pocket, the deepest wins); relief layers are skipped.
3. Unless `quick` (the 4 cells per mm drag preview), per slot but the body slot: stroke boost (a disc dilate of `boost x res` cells into body cells that are writable), `openSlot` (a disc open at `floor(minF/2 x res)` cells, cells that fall away return to what was under them, 1597 to 1615), `despeckleSlot` (4-connected islands under `round(0.35 pi (minF/2 res)^2)` cells fall away, 1616 to 1628) and `RasterMesh.gap` (a colour gap of `round(gap x res)` cells). The rim then repaints.
4. Cut cells are set to label 0.

Defaults (`print`, 1090): layer 0.24 mm, minF 0.6 mm, boost 0.15 mm, gap 0, despeckle on, res 8 cells per mm. The 0.35 factor is COLLAR's (`knowledge/designs/collar.md` section 4.5); the open step is the print-forge recipe (lineage `inlay.hygiene-print-forge`), not COLLAR's box dilate.

### 4.7 The label slab kernel

What it does: turns the two faces, the body, the clasp and the relief into one label grid per print layer, merges equal neighbours into slabs and meshes them with the print-forge `RasterMesh`, so the per-slot meshes sum to the solid with no overlap.

Construction (`buildSlide`, `bail.html:1699-1876`):

1. The faces are composed (4.6) and flipped to print coordinates: with `orient` down the front prints on the bed and its art is mirrored (`toP`, 1706), so the slide reads right once turned over; with `up` the back is mirrored.
2. A thickness budget snaps every height to the layer (`snapL`, `snapUp`, 1681 and 1682): `thk`, front inlay `inF`, back inlay `inB`, chamfers. Buried channels raise `thk` to `snapUp(inF + 2 Lh + ch + skin)`; inlays are clamped to leave a core of two layers (`'inlays clamped to keep a solid core'`).
3. Per print layer k, with `zm = (k + 0.5) Lh`, `u` is the depth from the front face and `ub` from the back; the source is the front art while `u < inF`, the back art while `ub < inB`, else the body base. A cell is skipped when it is outside the blank, cut through, closer to the edge than the chamfer inset `max(0, chF - u, chB - ub)` (a stepped 45 degree edge break), under a pocket, or inside the pad recess (4.8).
4. Layers above the body: the bridge or peg rise (4.8) and, for a terraced relief, one grid per relief layer.
5. Consecutive identical grids merge into slabs (`same`, 1844 to 1851); `vol.addSlab`, `vol.fixPinches()` (the healer fills one cell per corner-to-corner contact) and `vol.mesh()` give a mesh per slot. The relief in smooth mode is a separate closed heightfield part (4.13).

Measured on the canonical file (section 8): 119,418 to 217,372 triangles and 6 to 8 slabs per preset, in 265 to 547 ms.

### 4.8 Clasps

`claspGeom` (`bail.html:1685-1697`) derives the numbers every consumer shares. `clasp.kind` is `pad`, `bridge` or `buried`. Cord diameter `cord` 4 mm, clearance `clr` 0.5 mm; channel width `cw = cord + clr` (4.5 mm; twin pairs) or `2 cord + clr` (one channel for both strands); channel height `ch = snapUp(cord + clr)` (4.56 mm at 0.24, computed); strand positions `xs` at plus and minus `spacing / 2` (12 mm default) or 0.

| construction | what it is | where |
|---|---|---|
| Store back recess with a locating peg (`pad`) | a rounded rectangle recess `padW` by `padH` (17.4 by 8.4 mm for the U clip, the hardware size plus 0.4 mm) and `padDepth` deep, centred `padY` off the slide centre, cut from the back face; a square peg `pegW` (2.2 mm) wide rises from the recess floor to `pegH` (0.96 mm, computed from `padDepth + 0.24`), keying the square hole of the clip plate. The recess only exists face down. | masks 1739-1748, recess test 1821 and 1826, peg layers 1836 |
| Twin printed bridges (`bridge`) | two blocks `cw + 2 wall` wide (wall 1.6 mm) and `len` long (18 mm) standing on the back face, each with a channel `cw` wide open to the end and a roof 1.2 mm thick printed as a bridge across it; the cord threads in from the top edge. Face down only. | masks 1749-1773, layers 1837-1843 |
| Buried channels (`buried`) | channels `cw` wide and `ch` tall cut inside the body between `uc0` and `uc1 = thk - skin`, with a back skin of 1.2 mm, running the full length and leaving through the top and bottom edges | 1717-1724, 1820 |
| TPU grip fins (`grip`) | ribs `ribW = max(0.9, 1.5 minF)` wide every `gripPitch` (2.4 mm) across the channel, projecting `finP = min(cw/2 - 0.2, clr/2 + gripP)` from each wall (gripP 0.35 mm), in the grip slot, so the strand is squeezed to `cord - 2 gripP` (3.30 mm) | 1693-1694, 1759-1762 |

Print pose rules, each a check the kernel emits as a string (section 4.14 lists them):

- Bridges need face down. Face up, `claspGeom` builds buried channels instead and says so (1688).
- A front pocket printed face down makes its floor a bridge: warn. A back pocket printed face up: warn (1731, 1732).
- A relief rises off the front, so the slide has to print face up: error (1801).
- A pocket keeps a floor of 3 layers (`floorMin`, 1728); a pocket that reaches buried channels is an error (1733).
- The two channels need 0.8 mm of body between them (1785); a bridge span over 8.8 mm warns, the figure PETG bridges cleanly (1787, inferred by the owner); a bridge block that hangs off the slide is trimmed with a warn, or an error past 5 percent of its cells (1788).
- Grip fins on a slot that is not TPU warn that they will be stiff (1792). A clearance under 0.25 mm warns that braided cord will bind (1794).
- The pad recess within 1.2 mm of the edge warns, within 0 mm errors (1776); a peg wider than the recess less 2 mm errors (1780).

### 4.9 Ends: banded revolved tips

What it does: caps each cord end with a revolved solid, printed standing on its open end, banded across up to three slots so one tip carries colour rings.

Construction (`bail.html:1879-2018`):

1. `tipProfile(kind, L, R)` (1885-1946) returns an outer profile (a polyline of `[z, r]`) and bands (`[z0, role]`) for seven kinds. Defaults `TIP_DEFAULTS` (1879) are `[L, D, bore]` in mm: bullet 38, 8, 16; cone 38, 8, 11.5; jack 40, 8, 15; probe 44, 8, 16; fuse 34, 8, 13; hex 34, 8, 14; drop 34, 11, 12. Roles (`TIP_ROLES`, 1880): bullet body and collar; cone body and collar and ball; jack housing, metal and insulators; probe handle, guard and pin; fuse glass and caps; hex body and stripes; drop bulb and neck.
2. Roles A, B and C map to `slotA`, `slotB`, `slotC`; neighbouring bands on one slot merge.
3. The bore has radius `(cord + clr) / 2` (clearance `ends.clr` 0.3 mm, so 4.3 mm at the 4 mm cord, measured as the checks read "tip bore 4.30 mm"), depth `bore`, closed by a 45 degree cone so no bridge is needed. `wallOK` (1982) steps the bore shorter by 0.25 mm until every point keeps a 0.9 mm wall (error under 2 mm: "the tip is too thin for a ... mm cord. make it fatter").
4. Each band is clipped out of the outer and inner chains (`clipChain`, 1927 to 1946), closed into a polygon and revolved (`revolve`, 1947 to 1972) at 48 segments (`segs`, 12 or more; a hex uses 6 with a 30 degree phase), then the bands of one slot are concatenated into one part.
5. A slope check warns when a profile widens faster than 45 degrees going up (1992).

`ends.kind` `ots` is no printed tip: the store bought kit tips `kit32` and the row checks the cord against the bore (1975-1977).

### 4.10 Hardware rows

`HW` (`bail.html:1098-1111`) is the table of things the owner buys. All three groups are read off a photo of the owner's parts, so every number is inferred (the U clip row carries a note to that effect and the build emits it, 1781).

| group | key | name | numbers |
|---|---|---|---|
| cord | `saintrygo4` | Saintrygo braided leather 4 mm (the owner's) | d 4 mm |
| cord | `braid3`, `braid5`, `custom` | braided leather 3 and 5 mm, custom | d 3, d 5 |
| back | `uclip` | U slide clip 17 x 7 mm, 2 loops (the owner's kit) | W 17, L 8 (along the cord), plateT 0.6, loopH 5, total 7, hole 2.4 mm |
| back | `flap` | locking flap back 19.6 x 16.3 mm | W 19.6, L 16.3, plateT 0.8, loopH 4, total 4, hole 0 |
| tips | `kit32` | cone tips 32 x 8.8 mm, 4 mm bore (the owner's kit) | L 32, D 8.8, bore 4 |

`applyBackHw` (1112-1120) sets the recess from a row: `padW = W + 0.4`, `padH = L + 0.4`, `padR 0.6`, `plateT`, `padDepth = max(0.48, ceil((plateT + 0.1) / 0.24) x 0.24)`, `peg = hole > 0`, `pegW = max(1.2, hole - 0.2)`, `pegH = padDepth + 0.24`. A cord tighter than `loopH - 0.4` warns (1779). The band length along the cord (the U clip's `L 8`) and the square hole are the two numbers the row's own note tells the owner to measure and correct.

### 4.11 The colour model

`ST.colour` (`bail.html:1086`): `n` slots in use (3 or 4), `body` (the slot the slide body prints in, which is a colour of its own, 1 to 4 and 3 on most presets), `rim` (the band slot when `rim.on`, rim width `rim.w` mm), and `slots`, four rows `{ color, type, name }` with the type a material of `MATERIALS` (`bail.html:779`: PLA, PETG, ABS, ASA, TPU, PC, PA, PVA, each with a tray id, nozzle and bed temperatures and a density; PETG 1.27 and TPU 1.21 g/cm3, the writer's table, tier unknown). The fourth slot is the grip colour, TPU `#2B2B2B`, on every preset. Colours are shown as entered in the viewer, with `#FFFFFF` lifted to `#F4F1EA` (`colourOf`, `bail.html:2436`). The cord colour is its own field (`cordColor`). The locating peg prints in the body slot (1836).

### 4.12 The 11 presets

`PRESETS` (`bail.html:1143-1243`), each a function over a fresh `blankState`, held as values. Slide, clasp, ends, then slot names; sizes are mm.

| key | name and sub | slide | art | clasp | ends |
|---|---|---|---|---|---|
| hsl | HEATSYNC, concho, store back | concho 46, 18 scallops, thk 4.8, inlayF 0.72 | HeatSync mark 36 mm; back arc text "HEATSYNC LABS" and "MESA AZ" | pad, padY 1.5 | bullet 38 x 8, bore 16 |
| hslcut | HSL DIE CUT, mark shaped, bridges | outline 2.0 around a 44 mm mark, thk 4.32, rim 1.4 | HeatSync mark 44 mm; back "HSL" | bridge, twin, spacing 11, len 15, tunY 1 | cone 36 x 8, bore 11 |
| hackbuild | HACK.BUILD, jack plug tips, TPU grip | round 44, thk 4.32, inlayF 1.2 | hack.build mark 26 mm and "hack\|.build" in Permanent Marker; back arcs "MAKE THINGS" and "BREAK THINGS" in VT323 | bridge, twin, spacing 12, len 18, grip on slot 4 | jack 40 x 8, bore 15 |
| scope | SCOPE, lissajous, probe tips | rect 44 x 36, r 6, rim 2.6 | graticule 34 x 26 and a 3 by 2 trace 30 x 22; back "X:Y 3:2" and "CH1 CH2" | pad | probe 44 x 8, bore 16 |
| trace | TRACE, pcb shield, fuse tips | shield 40 x 48, thk 7.44, rim off | circuit seed 11, a frame, "U1" and "HB-01"; back "REV A" and "hack.build" | buried, twin, spacing 12, skin 1.2 | fuse 34 x 8, bore 13 |
| mesa | MESA, sunset, saguaro, arrowhead | round 46, thk 4.8, inlayF 1.2 | sun 30 mm with 5 gaps, mesa 46 x 13, saguaro 13 x 24; back "ARIZONA" and steps | pad, padY 1.5 | cone 38 x 8, bore 11.5 |
| concho | CONCHO, generic base to build on | concho 44, thk 4.32 | ring 34 and steps 18 | pad | bullet |
| setting | SETTING, cabochon pocket, face up | oval 36 x 46, thk 4.8, orient up | an ellipse 25.6 x 35.6 cut as a 2.4 mm pocket in a ring 29.6 x 39.6; back "25 x 35" | pad | drop 34 x 11, bore 12 |
| monogram | MONOGRAM, initials, octagon | octagon 40 x 40, thk 7.44 | rotated frame 30 and "MZ" in Permanent Marker 15 mm | buried, twin, spacing 11 | hex 34 x 8, bore 14 |
| cameo | CAMEO, depth anything relief | oval 36 x 46, thk 3.84, orient up, rim 1.8, layer 0.12 | a ring and a relief of the hack.build mark inflated (source `inflate`, 2.4 mm tall) | pad | drop 34 x 11 |
| custom | YOUR ART, drop an svg or png | round 44, thk 4.32, inlayF 0.96 | none | pad | ots (store bought) |

Colour slots (ink, pink, cream and a grip) are the repo's brand colours on hackbuild, scope uses bezel, phosphor, screen and graticule, trace uses mask, copper and silk, mesa adds amber. The welcome overlay draws a 120 px thumbnail of each preset's front face (`drawThumb`, 2719).

### 4.13 The relief route

The relief layer (`bail.html:2100-2291`) turns an image into a height field on the front face, built either smooth (its own closed heightfield part) or terraced into the label slabs, one grid per print layer, with an optional second colour above `split x max height`.

- Source: `depth` (a stored depth map), `luma` (brightness) or `inflate` (a silhouette inflated by distance, `sqrt(1 - (1 - t)^2)`).
- Depth Anything V2 small (Apache-2.0) runs in the browser through transformers.js 4.3.2 from jsDelivr, loaded on demand: `TJS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2'` (`bail.html:2245`), model `onnx-community/depth-anything-v2-small`, device `webgpu` when an adapter exists (fp16) else `wasm` (q8, with an fp32 retry), progress reported as a percent of the downloaded megabytes. The depth map is stored in the layer as a PNG data URL (`depthSrc`) so the build reads a stored map and never the network; the model needs the network once (the failure message says so, `bail.html:2881`).
- Height: `h = max(0.12, base + (height - base) x v x f)` where `v` is the normalised depth with `bgcut` removed and `gamma` applied, `f` an edge roll `smoothstep(roll)`, plus `detail x highpass x 2.5` from the photo.
- Smooth mode meshes the field (`heightfieldMesh`, 2217-2244) on the plane `z = thk`, splitting each top quad along the shorter height diagonal; the part is named `relief`. The check says "turn on adaptive layer height in the slicer so it follows the curve".
- The region is the covered, inside-the-blank cells at least `rim.w + inset` from the edge; islands under a min feature disc fall away; `healMask2D` fills one cell per diagonal contact.

Measured on the CAMEO preset (SVG source, `inflate`): the relief reaches 2.40 mm over 199 mm2 and the heightfield part is 53,800 triangles of the 158,352 total.

### 4.14 Checks the kernel emits

The kernel returns checks as pairs `[level, text]` with level `ok`, `warn` or `err` (`MODEL.checks`), shown as chips and in step 6. They are prose, with no measured, legal, constraint or origin fields. Every message the code emits (`bail.html:1676-2099`), with the number it computes:

| level | message | line |
|---|---|---|
| warn | printed bridges need face down; built as buried channels instead | 1688 |
| warn | thickness raised from A to B mm to bury the channels | 1722 |
| chip | inlays clamped to keep a solid core | 1725 |
| warn | front pocket clamped to leave a F mm floor | 1729 |
| warn | back pocket clamped to leave a floor | 1730 |
| warn | a front pocket printed face down makes its floor a bridge. switch the print pose to face up | 1731 |
| warn | a back pocket printed face up makes its floor a bridge. switch the print pose to face down | 1732 |
| err | front pocket reaches the buried channels. make the slide thicker or the pocket shallower | 1733 |
| ok | face up: no recess, glue the store back flat to the back face | 1775 |
| err or warn | pad recess comes within D mm of the edge. make the slide bigger or move the pad | 1776 |
| ok | HARDWARE NAME: recess W x H mm, D deep, E mm from the edge[, P mm square locating peg] | 1777 |
| warn | a C mm cord is tight in the L mm loops of the HARDWARE | 1779 |
| err | the locating peg is wider than the recess | 1780 |
| warn | band length along the cord and the square hole are read off the photo; measure one and correct them | 1781 (the `uclip` note, 1103) |
| err | the two channels are D mm apart. raise the spacing to at least S | 1785 |
| ok or warn | bridge span W mm[, over the 8.8 mm that PETG bridges cleanly], channel H tall | 1787 |
| err or warn | part of the bridges hangs off the slide and was trimmed. shorten them or move them | 1788 |
| ok | buried channels W x H mm, back skin S, exit through the top and bottom edges | 1789 |
| ok or warn | grip fins squeeze the cord to C mm[ on TPU; or : they are not on a TPU slot, so they will be stiff] | 1792 |
| warn | under 0.25 mm cord clearance: braided cord will bind | 1794 |
| err | a relief rises off the front, so the slide has to print face up. switch the print pose in step 2 | 1801 |
| warn | relief layers only work on the front; the one on the back is ignored | 1808 |
| ok | relief up to H mm over A mm2, N terraces of L[, second colour from S mm up] or smooth: turn on adaptive layer height in the slicer so it follows the curve | 1864 |
| warn | terraces are L mm tall; a 0.12 layer reads much more like a carved cameo | 1865 |
| warn | N pinch cells healed: the art is at the resolution limit, raise the resolution or thicken strokes | 1867 |
| ok | N pinch cells healed where art meets corner to corner (single cells, invisible at print scale) | 1868 |
| err | the tip is too thin for a C mm cord. make it fatter | 1988 |
| warn | bore depth limited to B mm to keep a 0.9 mm wall | 1988 |
| ok | tip bore D mm, B mm deep, cone ended so the bore needs no bridge | 1989 |
| warn | the tip widens faster than 45 degrees going up; expect a rough underside | 1992 |
| ok or err | the kit tips take B mm cord; the cord is C mm, or the store tip row text | 1975 |
| err | the HeatSync mark is two pieces: the sun disc and the flames need different slots | 2027 |
| warn | HeatSync flames are on the body colour, so only the disc will show | 2028 |
| warn | front or back layer NAME lands outside the printable area | 2030 |
| chip | min feature under 0.4 mm will not print on a 0.4 nozzle | 2031 |
| err | the plate does not fit the bed. fewer sets or a bigger bed | 2033 |
| chip | build over 2.5 s, drop resolution | 2038 |

Counted from the table: 37 rows; 16 are warnings, 7 errors, 6 notes, 3 chips, and 5 take one of two levels by a number (computed).

### 4.15 Exports and the project 3MF

Exports (`bail.html:2296-2381`, buttons 3141 to 3152): 3MF PROJECT, STL ZIP (one STL per part, `print-card.txt` and `bail-design.json`), PRINT CARD, FACES PNG, and the design JSON (SAVE). The page also exposes `BENCH.build()`, `BENCH.load(key)`, `BENCH.state()`, `BENCH.model()`, `BENCH.exportBytes(kind)` for 3mf, stl, card, json and png (1065, 2095 to 2097, 2370, 2718, 3173), and `BENCH.ready`.

The 3MF (`pkgConfig`, 2300) has an object `slide` with one part per slot named `slide-<slot name>-<slot>` (and `slide-relief-...` for the heightfield) and an object `tip` with its parts, both laid on the plate by `plateLayout` (2049): per set one slide and its two tips, 6 mm apart, the tips standing beside the slide; `plate.count` sets and a bed of 256 x 256 mm. The writer (`Orca3MF.build`) writes the Bambu 01.10.01.50 dialect: `FILAMENT_TEMPLATE` (68 verbatim keys and a computed set), `MATERIALS` per type, `printer_settings_id`, `print_settings_id`, preset names built from `pattern` (`Generic {TYPE} @FF C5P`), p:UUID attributes made from the object id with fixed suffixes, a fixed build UUID `2c7c17d8-22b5-4d84-8835-1976022ea369` (`bail.html:789`). Grams per filament are computed from signed volumes times the type density and printed in the readout and the print card (`printCard`, 1028); the card adds a BOLO block with the slide size, the print pose, the cord, the clasp, the relief and the tips, then the check list.

### 4.16 The viewer and the wear pose

`VIEW` (`bail.html:2383-2542`): a three.js scene, two poses chosen by `ST.ui.pose`. The wear pose rotates the slide upright, builds the cord as a centripetal Catmull-Rom curve through 15 points (up through the clasp, round the neck behind at 135 mm, back down) tubed at the cord radius in `cordColor`, and stands the two tips on the ends with their own meshes (the store bought tips as a lathe in grey metal); a pad clasp draws a ghost of the hardware plate and loops so the clasp reads. The print pose draws the 256 x 256 mm plate with pink edges and every set. Cameras: iso, front, back, side and explode. A legend lists the slots and fades the unused ones.

### 4.17 The face editor

The face editor (`bail.html:2899-3111`) is a canvas over the exact print raster (or a 4 cells per mm quick raster while dragging) with these controls (the guide text reads "drag moves, corners scale, dot rotates, wheel zooms, right drag pans, alt snaps, arrows nudge, delete removes"):

- Handles from the layer's own bounds: `layerBBox` renders the layer at 3 cells per mm with its transform ignored and takes the mask bounds, cached by a signature of the layer fields (2908 to 2928); four corner squares and a rotate dot 26 px above the top edge (`HANDLE` 5, `ROT_STEM` 26, `HIT` 9, 2902); a hit test for rotate, scale, move and select (2940 to 2952).
- Move: drag, shift locks the axis, snap to the centre lines within 0.6 mm unless alt is held, positions rounded to 0.25 mm (3057 to 3069).
- Scale: the ratio of the pointer's distance from the centre to its start; text scales `size` (floor 1.5 mm), shape, scope and circuit scale `w` and `h` (and `t` unless shift is held), others scale `w`.
- Rotate: the pointer angle about the centre; snaps to -180, -90, 0, 90 and 180 within 4 degrees, shift to 15 degree steps, alt for none.
- Wheel zoom about the pointer from 0.5 to 8 times, right drag pans, double click resets the view (on text it focuses the text field).
- Keys: arrows nudge 0.25 mm and shift 5 mm, delete removes, `[` and `]` lower and raise, ctrl D duplicates, ctrl Z and Y undo and redo (3096 to 3111). History keeps up to 80 snapshots debounced at 450 ms (1250 to 1264).
- Drop: an image or SVG dropped on the page becomes an image layer (SVG in palette mode, raster in mono) or, with a relief layer selected, its source (2885 to 2898). A JSON drop loads a design (2877).
- The face canvas draws the clasp footprint as an overlay and a pocket darkened to 45 percent (3027 to 3043).
- Editing is by the layer list and a property panel built per kind (2786 to 2877): sliders with number fields, slot selects named by the slot rows, a "use as" select (inlay, cut through, pocket) with a pocket depth, mute, duplicate, raise, lower and copy to the other face.

## 5. UX anatomy

Header: BAIL.BENCH wordmark, tagline, UNDO, REDO, OPEN, SAVE, DESIGNS. A pink rule, then a step rail of six: 1 ART, 2 SLIDE, 3 CLASP, 4 ENDS, 5 COLOUR, 6 PRINT, each showing done (green number) or current (pink). A guide strip under the rail names the step. The stage splits in two on step 1: the 3D viewport with WEAR and PRINT poses and ISO, FRONT, BACK, SIDE and EXPLODE cameras on the left, and the face board on the right; on the other steps the viewport takes the width. The right column holds panels per step: DESIGN (the 11 cards), FACE (front and back chips), LAYERS and PROPS on step 1; the slide, clasp, ends and colour rows on 2 to 5; print reality, plate and exports on 6. The status strip at the bottom shows the size in mm, the triangle count, the build time and chips: fits bed, mesh current or stale, and the check counts (clicking goes to step 6). Fonts are the repo's five faces from embedded base64 (Permanent Marker, Special Elite, IBM Plex Mono, VT323), loaded before the first build (`bail.html:3164`).

## 6. What makes it excellent, as rules to copy

1. One layer model for every kind: ten shared fields and a per-kind field set, so one editor, one history and one JSON serve them all.
2. Parts, not layers, paint slots: a logo is two parts, a circuit three, text up to two, each with its own slot and a documented order, so one object lands on several extruders.
3. A build is a function of the state: `build()` reads `ST` and returns the model, so `BENCH.build()` and `BENCH.exportBytes` drive it from a test and a preset is values, never code.
4. Hardware is a table of things the owner buys, and the geometry follows the row (`applyBackHw`): the recess and peg change when the clip changes, and the row says which numbers were read off a photo.
5. Print pose is a first class setting with rules: the face-down mirror, the pocket-floor bridge and the relief direction are named and checked.
6. Every height snaps to the layer, and equal neighbouring layers merge into slabs, so the meshes have few triangles and tall walls.
7. The drag preview is a cheaper raster of the same function; the exact raster shows when the build is current.
8. The exports are produced from the model on screen: the 3MF, the STLs, the card, the PNG and the JSON all come from `MODEL`.

## 7. Known limits and failure lessons

### 7.1 Defects in the bench

Each was observed on the canonical file on 2026-10-30.

| defect | evidence | consequence for a port |
|---|---|---|
| the HSL DIE CUT slide has a flat vertical right edge | `shots/b-02-hslcut-art-step.png`: the outline preset builds a 47.0 x 48.25 mm slide (measured) inside a grid of `w + 2 outline + 1` = 49 mm, and the flames reach past it | size the outline grid from the art bounds |
| the arrow shape has a hairline gap where its tail feathers cross the shaft | the feathers and the shaft are subpaths of opposite orientation filled nonzero; BAIL's canvas shows the gap (the port keeps it: 683 cells differ from a union against 76 from BAIL's canvas at 8 cells per mm, computed, `packages/inlay/test/bail-layers.test.ts`) | keep for parity, or union the subpaths |
| a sun layer erases earlier layers on the outline canvas | `composeBlank` paints every layer on one canvas without clearing, and the sun gaps are `destination-out` (`bail.html:1367-1373` against 1555 to 1560), inferred from the code | clear per layer |
| an empty text run measures minus `ls` | `measure` returns `w - ls` for an empty string (1421) | measure empty runs as 0 |
| checks are prose | section 4.14: no measured, legal, constraint or origin | each message becomes a `CheckResult` with evidence |
| relief and the pocket route have no inlay equivalent | the repo's inlay kind carves no pocket and takes no relief (section 9) | the clasps and pockets belong to `designs/bail` |
| the node text route sets the middle baseline 0.075 em lower than Chrome | the same text on BAIL's canvas and on the repo's vector surface: ink 1.44 mm under the line against 1.81 mm for a 5 mm size (measured, `packages/inlay/test/bail-layers.test.ts`) | move the node baseline or compare with an allowance |
| `plexb` is weight 600 | `FONTW` (1069); the node face table holds 400 and 700 | lower `plexb` to 700 |

### 7.2 What the repo validator finds in the evidence 3MFs

`uv run --project tools/py tools/py/validate_3mf.py --overlap <file>` on each file, 2026-10-30 (measured; exit status 1 on all four):

| file | meshes and triangles | build | failed rows |
|---|---|---|---|
| `bail-hackbuild.3mf` | 6; 80,812, 23,668, 77,708, 576, 384, 1,152 | 3 items, 27 pairs compared, 0 intersected | CHK-3MF-02, CHK-3MF-03, CHK-3MF-07 (18 checks, 1 skipped, 3 failed) |
| `bail-hslcut.3mf` | 6; 117,656, 13,898, 65,618, 1,728, 288, 192 | 3 items, 27 pairs, 0 intersected | the same three (18 checks, 1 skipped, 3 failed) |
| `bail-hslcut (1).3mf` | 5; 106,952, 13,898, 62,046, 132, 84 | 3 items, 16 pairs, 0 intersected | the same three (17 checks, 1 skipped, 3 failed) |
| `bail-cameo.3mf` | 24; the four designs, up to 154,088 triangles in one mesh | 12 items, 560 pairs, 20 intersected, worst intersection 0.000000 mm3 | CHK-3MF-03, CHK-PRT-01[lib3mf], CHK-ART-01 (42 checks, 1 skipped, 3 failed) |

The three BAIL exports drift from the 3MF dialect in the same way:

- CHK-3MF-02: 37 of the 127 template keys are absent (`project_settings.config` holds 103 keys; 90 of 127 present), among them `activate_air_filtration_during_print`, `adaptive_pressure_advance`, `curr_bed_type`, `filament_map`, `filament_self_index`, `filament_extruder_variant`, `filament_ironing_*`, `filament_flush_*`, `first_x_layer_fan_speed`, `from`, `name` and `volumetric_speed_coefficients`.
- CHK-3MF-03: 13 keys outside the template, 7 of them vectors; the ones the writer adds are `filament_load_time`, `filament_prime_volume`, `filament_scarf_gap`, `filament_scarf_height`, `filament_scarf_length`, `filament_scarf_seam_type` and `filament_unload_time`.
- CHK-3MF-07: `filament_map`, `filament_self_index` and `filament_extruder_variant` are missing, which the writer keeps (C-07).
- `curr_bed_type` is not written, so the slicer opens on its default plate (cold plate in Flash Studio).
- Geometry is sound in all three: every mesh passes CHK-PRT-01 topology with 0 non manifold vertices and lib3mf reads the files; the parts do not intersect.

`bail-cameo.3mf` is a different file: 669 project keys and `3D/Objects/*.model` parts, which a slicer writes, so it is a slicer re-save of the four designs (inferred from the structure). It passes CHK-3MF-02 and -07 (127 of 127 template keys present) and fails:

- CHK-PRT-01[lib3mf]: "lib3mf could not read the file: Lib3MFException 5: A UUID is not unique within a package." Four build item p:UUIDs appear twice: the second item that instances a tip object carries the first one's UUID (measured, `3D/3dmodel.model`).
- CHK-ART-01: "object name "tip" used 4 times; object name "slide" used 4 times".
- CHK-3MF-03: 542 keys outside the template, and the forbidden keys `extruder_variant_list` and `layer_height` present.

The evidence slides differ from the preset at its defaults: the hack.build slot 1 mesh is 80,812 triangles in the file and 84,288 on the canonical bench at the preset, with no grip part (slot 4, 768 triangles at the preset) in the file; the owner edited the design before exporting (inferred).

## 8. Tests and harness

| item | what it does |
|---|---|
| `drive/bail.cjs` | loads the canonical file from `file://` in system Chrome 150.0.7871.125 through the repo's Playwright 1.63.0 with swiftshader GL, runs `BENCH.load(key)` and three `BENCH.build()` for each of the 11 presets, saves the two shots and writes `drive/bail-drive.json`; zero page errors on all runs (measured) |
| `tools/inlay/bail-canvas.cjs` | runs BAIL's `paintLayer` and `circuitOf` unchanged on 44 layers at 8 cells per mm and writes the cells to `packages/inlay/test/fixtures/bail-canvas.json.gz` |
| `packages/inlay/test/bail-layers.test.ts` | holds the repo painters to determinism, bounds, slot assignment and to those cells |
| `spec/test/art.test.ts` | the art document against BAIL's defaults, the content address and the validator |
| `reference/cosmetic/art-layers` | the reference of the new layer kinds (section 9) |

Measured builds, 2026-10-30 (`BENCH.build()` on the loaded preset, three runs each, milliseconds, Chrome 150 headless, `MODEL.ms` is `performance.now()` around `build()`; macOS 12.7.4, Darwin 21.6.0, core count unknown):

| preset | build ms (three runs) | triangles | slabs | pinch cells healed | slide w x h x thickness, mm | slot meshes (triangles) |
|---|---|---|---|---|---|---|
| hsl | 509, 421, 525 | 217,372 | 8 | 40 | 45.9 x 45.4 x 4.80 | s1 117,824; s2 18,678; s3 78,278; tips 1,920 and 672 |
| hslcut | 456, 547, 461 | 171,386 | 7 | 15 | 47.0 x 48.3 x 4.32 | s1 98,544; s2 13,898; s3 57,312; tips 384 and 1,248 |
| hackbuild | 491, 428, 408 | 188,806 | 8 | 30 | 43.9 x 43.9 x 4.32 | s1 84,288; s2 23,668; s3 77,970; s4 768; tips 576, 384, 1,152 |
| scope | 368, 370, 370 | 146,482 | 8 | 390 | 43.9 x 35.9 x 4.32 | s1 13,740; s2 43,492; s3 56,922; s4 30,120 |
| trace | 420, 438, 414 | 143,240 | 8 | 36 | 39.9 x 47.9 x 7.44 | s1 82,244; s2 43,364; s3 16,384 |
| mesa | 473, 451, 453 | 145,044 | 8 | 91 | 45.9 x 45.9 x 4.80 | s1 67,488; s2 15,748; s3 49,588; s4 10,588 |
| concho | 369, 356, 348 | 139,550 | 8 | 0 | 43.9 x 43.9 x 4.32 | s1 82,960; s2 2,976; s3 51,022 |
| setting | 303, 278, 265 | 119,418 | 6 | 0 | 35.9 x 45.9 x 4.80 | s1 54,132; s2 13,940; s3 49,042 |
| monogram | 365, 358, 383 | 172,912 | 8 | 0 | 39.9 x 39.9 x 7.44 | s1 71,350; s2 31,376; s3 69,970 |
| cameo | 322, 350, 316 | 158,352 | 6 | 0 | 35.9 x 45.9 x 3.84 | s1 48,640; s2 37,760; s3 15,848; relief 53,800 |
| custom | 319, 317, 322 | 87,858 | 8 | 0 | 43.9 x 43.9 x 4.32 | s1 60,616; s3 27,242 |

The plan's earlier figure of 744 ms for the HEATSYNC build (217,372 triangles) was measured elsewhere; here that preset builds in 421 to 525 ms. Both agree on the triangle count.

Checks the drive collected per preset: five presets carry the U clip photo note as a warning (hsl, scope, mesa, concho and custom), and no preset emits an error (measured).

## 9. Port map

| BAIL | lands in | state on 2026-10-30 |
|---|---|---|
| layer model (4.2) | `spec/art.ts`: `ArtDocument` with front and back faces, content addressed `hbf://art/<sha256>`, validator and BAIL's defaults | built (plan v11 4.3 step a) |
| shape, scope, circuit, logo, text with `ls` and anchored arcs (4.3) | `packages/inlay/src/layers/*.ts`, lowered from the document by `src/art-lower.ts`; reference `reference/cosmetic/art-layers` | built (step a) |
| marks (4.4) | `packages/inlay/src/marks.ts`, the HeatSync mark verbatim | built (step a); the HeatSync mark awaits the owner |
| face editor (4.17) | `packages/bench` art board, state in `bench-core` | step b, not started |
| label slab kernel, clasps, ends, hardware rows, presets, checks as evidence (4.7 to 4.14) | `designs/bail/build.ts`, `packages/catalog` rows (tier inferred) | step c, not started |
| wear pose, the extra exports (4.15, 4.16) | a viewer scene and the exports registry | step d, not started |
| relief (4.13) | after the owner's answer on a network intake step | step e, not started |
| image and relief layers, pocket cuts | typed in `spec/art.ts`, refused by the lowering | not started |
