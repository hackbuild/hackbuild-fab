# COLLAR: the challenge coin bench

How COLLAR is made, read from the original code, so a builder can make the next coin bench the same way. The owner names COLLAR as one of their best benches; this file is the bar, and nothing here comes from the quarantined mockups.

Code root for every location below: `fab-knowledge:originals/collar/files/collar.html` (one file, 3185 lines, one inline script from line 591 to 3183). A location written `collar.html:1201-1214` means lines 1201 to 1214 of that file.

Number qualifiers: a number followed by a `collar.html:line` citation is a constant read from that line; `measured` means read off a headless drive of the canonical file on 2026-10-05 (drive script `fab-knowledge:originals/collar/drive/collar.cjs`) or the gold drive recorded in `fab-knowledge:sources/gold/collar-coin.md`; `computed` means arithmetic done here from cited constants; `vendor` means a slicer preset value; `inferred` and `unknown` mean what they say.

## 1. Identity and revision

| item | value |
|---|---|
| name | COLLAR, named for the collar die that forms a struck coin's edge (README, `fab-knowledge:originals/collar/files/README.md`) |
| slug | `collar` (harvest folder `collar-coin`, registry ids `challenge-coin`, `collar`) |
| canonical file | `fab-knowledge:originals/collar/files/collar.html` |
| sha256 | `ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46` |
| bytes | 149897 (measured) |
| built | 2026-08-19 19:25, first seen as `~/Downloads/collar (7).html` (mtime, measured) |
| last re-download | `~/Downloads/collar (13).html`, 2026-09-15 00:20, byte identical (measured) |
| harvest copy | `fab-work-directory:benches/collar-coin/outputs/collar/collar.html`, byte identical |
| conversation | `0ae6e90c-b9cb-4869-9852-ee33f5af5386`, "Multicolor STL for hack.build challenge coins" |
| kind in the plan | `single` reference bench (UI.md section 8, per `fab-knowledge:sources/gold/collar-coin.md` section 8.1) |

### 1.1 Every revision, and why this one is canonical

Six distinct builds exist, all on 2026-08-19 (measured from Downloads mtimes and sha256, `fab-knowledge:sources/gold/collar-coin.md` section 1.1):

| mtime | file in `~/Downloads` | bytes | sha256 (12) | what it added |
|---|---|---|---|---|
| 03:38 | `collar.html` | 104817 | 487d84c0fc9c | first build: tabs BLANK, ART, EDGE, PRINT |
| 12:38 | `collar (1).html` | 113957 | ab61ade8b46d | guide strip, `commit`, `buildNow`, `ensureMesh` |
| 12:45 | `collar (2).html` | 114905 | 64415130ba2c | `blankState`, `hasWork` |
| 12:58 | `collar (3).html` to `(5).html` | 116211 | f69278a18443 | four numbered steps ART, EDGE, COLOUR, PRINT; welcome card; slot badges |
| 18:47 | `collar (6).html` | 126083 | e4dfe7144da6 | 127-key `FILAMENT_TEMPLATE`, `MATERIALS`, slicer profile fold |
| 19:25 | `collar (7).html` to `(13).html` | 149897 | ef0864ab66ca | blank shapes, direct manipulation on the face boards, edge spots, cut-through layers |

The 19:25 build is both the newest and the best: every later download through 2026-09-15 is byte identical, the owner kept exporting from it until 2026-09-19 (`~/Downloads/collar-coin-44mm (8).3mf`), and it carries every feature the earlier builds lack. No newer COLLAR exists anywhere searched (fab-work-directory, evidence/x, evidence/x/downloads/collar, Downloads).

### 1.2 Companions copied

All under `fab-knowledge:originals/collar/files/`, sha256 in `fab-knowledge:originals/collar/SHA256SUMS`.

| file | what it is |
|---|---|
| `collar.html` | the bench |
| `README.md` | the bench's own README (12399 bytes, measured) |
| `example-hackbuild-coin.3mf` | the hack.build preset exported by the chat (779928 bytes, measured) |
| `owner-collar-coin-44mm-20260919.3mf` | the owner's last export, 2026-09-19 07:13, from `~/Downloads/collar-coin-44mm (8).3mf` (94848 triangles, 135 project keys, per `fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 8) |
| `owner-collar-design-20260905.json` | an owner design, pink palette, from `~/Downloads/collar-design (8).json` |
| `owner-collar-print-card-20260819-nfc-020.txt` | owner print card, NFC coin at 0.20 layers, square groove 15 reeds |
| `owner-collar-print-card-20260830-nfc-024.txt` | owner print card, NFC coin at 0.24 layers, pause before layer 11 |
| `owner-collar-faces-20260819.png` | the owner's face PNG export, 2026-08-19 18:39 |
| `drive-print-card-hackbuild-preset.txt`, `drive-collar-design-hackbuild-preset.json` | print card and design JSON pulled from the canonical build by the gold drive |

The HSL coin the owner made in COLLAR and saved in Flash Studio lives with the `coin` record: `fab-knowledge:originals/coin/files/project-3d-coin/hsl.3mf`.

## 2. What it makes and for whom

A flat flush colour inlay challenge coin for the hack.build brand and anyone making event coins on a multi-tool FDM printer (Flashforge Creator 5 Pro, four toolheads). The body carries pockets; each colour part drops into its pocket, so both faces finish at one Z and nothing is embossed (`collar.html:593-603`). It exports a slicer-ready project 3MF that opens in Flash Studio, OrcaSlicer or Bambu Studio with every part already on its extruder and every filament declared, plus per-colour STLs, a print card, a face PNG and a design JSON. It runs from `file://` with no install; fonts are the only network request (`collar.html:9`).

The market gap it fills, from the README: HueForge, Kromacut, ColorStack, PrintPal, LithophaneMaker, ItsLitho and MakerTools3D make plates or lithophanes from images; none model a planchet, an edge treatment, a rim band, an insert pocket, a pause layer or the minimum feature a 0.4 nozzle lays down.

## 3. Shots

Folder: `fab-knowledge:originals/collar/shots/`. `c-*` are clean 1280 x 860 drives of the canonical file (measured, 2026-10-05). `g-*` are copied from the gold drive in `fab-knowledge:evidence/gold/collar-coin/shots/`.

| shot | caption |
|---|---|
| `c-01-hackbuild-preset-art-step.png` | The hack.build preset on step 1 ART. 3D viewport on top (reeded pink rim, cream arc, pink wrench), the two face boards below drawn from the same label function as the mesh, readout rail on the right: 94,848 triangles, 7 slabs, 5.15 cm3, 6.55 g (measured). The back board shows "IACK.BUILI": art clipped to the art radius circle, a known flaw (section 7). |
| `c-02-hackbuild-exploded-colour-step.png` | Step 3 COLOUR with the exploded view: each slot lifted by (slot - 1) x 0.9 x thickness (`collar.html:1977`), so the pink rim ring, the cream inlay and the pocketed black body separate. Slot rows carry `body`, `rim`, `front face`, `both faces` badges. |
| `c-03-hackbuild-flipped-back-face-edge-step.png` | Step 2 EDGE with the viewport flipped: the bed face shows the wordmark mirrored in the model, which reads right once the coin is turned over in hand. Rim note: "Flute roots stay 1.20 mm clear of the body colour." |
| `c-04-hackbuild-nfc-pocket-pause-print-step.png` | Step 4 PRINT, hack.build art at 4.2 mm with the sealed NFC pocket on: dashed pocket circle on the front board, readout SLICER block with pocket floor Z 1.80, roof Z 2.40, pause before layer 13 in pink, and the pocket note "1.00 mm of slop round a 25.0 mm tag. Floor 0.60 mm, roof 0.60 mm" (measured). |
| `g-d-03-preset-seal-tagline.png` | Seal + tagline preset: cream ring with MAKE THINGS on the top arc and BREAK THINGS on the bottom arc (flip on), back face REPEAT. with a pink dot from the pipe split. Reeded fine edge 72 x 0.7 x 1.5. |
| `g-d-05-preset-casino-chip.png` | Casino chip preset: 40 mm, navy body, rim band 4.5 mm in slot 1 broken into 12 segments alternating cream and red, square groove edge, front text 25. |
| `g-d-06-preset-big-50mm-medallion.png` | Big 50 mm medallion: diamond knurl 30 x 0.9 x 2.4 at 40 degrees, which forces slab-per-layer slicing (20 slabs, 125,852 triangles, measured in the gold drive). |
| `g-d-16-art-arc-text-dragged-radius-angle.png` | Direct manipulation mid-session: the selected image layer shows the pink dashed bbox, corner scale square and rotate dot; the arc text was dragged to a new radius and centre angle. |

## 4. Mechanisms and constructions

COLLAR has no moving mechanism and no circuit. Its constructions are geometric and procedural. Each section gives what it does, the construction in order, constants with qualifiers, code locations, fits and print settings, and limits.

### 4.1 Blank shape: implicit outline, bisection, normalisation

What it does: lets the planchet be round, squircle, rounded square, dog tag, rounded bar, hexagon, octagon, triangle or shield, and keeps the widest point equal to the diameter asked for.

Construction:
1. Each shape is an implicit function `f(x, y, R, params) <= 0` inside (`SHAPES`, `collar.html:668-708`). Round is `hypot(x, y) - R`; squircle `|x/R|^4 + |y/R|^4 - 1`; rounded square `rrect(x, y, a, a, a * corner)` with `a = R / sqrt 2`; dog tag `rrect(R, R * aspect, R * aspect)`; bar `rrect(R, R * aspect, R * aspect * corner)`; hexagon, octagon, triangle `ngon(n)` taking the max over k of `p . n_k - R cos(pi / n)` with the first normal at 90 degrees (`collar.html:713-721`); shield is a top `rrect` offset by 0.35 x 0.72 R with a 0.18 R corner and a bottom `|x| - 0.82 R sqrt(max(0, 1 - 1.05 t^3))`, `t = -y / R` (`collar.html:698-707`).
2. `rrect` is the standard rounded-box SDF (`collar.html:709-712`).
3. `shapeR(theta)` finds the outline radius by 26 bisection steps between 0 and 1.05 R along the ray (`collar.html:722-732`).
4. `baseLUT()` samples 8192 angles from -pi to pi, then scales every radius by `R / max` so the widest point equals the nominal diameter (`collar.html:898-909`, `LUT_N = 8192` at `collar.html:898`). Cached by `shape|dia|aspect|corner`.
5. `shapeMinR()` is the smallest LUT radius (`collar.html:735-740`); it sets the rim inner radius `R_RIM_IN = shapeMinR - rim.w` when the rim is on and the art radius `R_ART = max(2, R_RIM_IN - art.keep)` (`collar.html:742-743`).

Constants: aspect default 0.72, corner 0.3 (`collar.html:649`); UI ranges aspect 0.3 to 1, corner 0.02 to 1 (`collar.html:315-317`). Aspect shows only for dog tag and bar, corner only for rounded square and bar (`syncShapeParams`, `collar.html:2322-2331`).

Limits and lessons: art is clipped to a circle of `R_ART`, the inscribed circle of the shortest radius (`collar.html:1183-1192`), so on a dog tag or shield wide text is cut ("IACK.BUILI" on the hack.build back, visible in `c-01`). A port clips to the outline inset by the keepout instead (proposed CHK-INL-10 in `fab-knowledge:synthesis/mappings.md`).

### 4.2 Edge profile registry: r(theta, z) with a z-dependence flag

What it does: cuts the coin edge with 11 numismatic treatments plus a scalloped blank, each one record.

Construction:
1. Each style is a record `{label, zDep, uses, note, r(t, z, p)}` in `EDGES` (`collar.html:761-872`). `p.R` is the base LUT radius at that angle, `t` the angle, `pa = 2 pi / count`, `phi = t - round(t / pa) pa`, arc length `s = phi R`, `val1(x) = 1 - min(1, 2 |x - round(x)|)` (`collar.html:758-759`).
2. `edgeLUT(z)` evaluates the style at every LUT angle with `p.R = base[i]` (`collar.html:910-918`), so the edge follows non-round blanks.
3. The slab planner slices at every layer only when `zDep` is set (`collar.html:1209`); otherwise the edge is a prism.
4. The UI shows only the sliders listed in `uses` (`syncEdgeUI`, `collar.html:2371-2385`) and the note comes from the same record; the print card prints reed pitch only if `uses` includes count (`collar.html:1847`).

Formulas (all `collar.html`, lines in the table):

| key | label | zDep | r(theta, z) | lines |
|---|---|---|---|---|
| plain | plain | no | `R` | 762-766 |
| reeded | reeded | no | circular cutter `rc = (w^2/4 + d^2) / (2d)`, centre `at = R + rc - d`, `r = min(R, at cos phi - sqrt(at^2 cos^2 phi - at^2 + rc^2))` when the discriminant is positive | 767-779 |
| milled | milled V | no | `R - d (1 - |s| / (w/2))` inside the mouth | 780-789 |
| square | square groove | no | `R - d` where `|s| <= w/2` | 790-798 |
| openreed | open reed | no | reeded except a smooth arc of `gapDeg` centred at the bottom | 799-808 |
| knurl | diamond knurl | yes | `pitch = 2 pi R / count`, `T = tan(twist)`, `a = (s + zT)/pitch`, `b = (s - zT)/pitch`, `R - d max(val1(a), val1(b))` | 809-819 |
| rope | rope | yes | `R - d (0.5 - 0.5 cos(2 pi frac(a)))`, `a = (tR + zT)/pitch` | 820-829 |
| beaded | beaded | yes | spherical dent at mid height: `q = 1 - (s^2 + (z - thk/2)^2)/rb^2`, `rb = max(w/2, 0.2)`, `R - d sqrt(q)` | 830-840 |
| oblique | oblique line | yes | `R - d val1(a)` | 841-850 |
| wave | wave | no | `R - d (0.5 - 0.5 cos(count t))` | 851-855 |
| petal | petal cut | yes | spherical dent centred at `z = 0.72 thk` | 856-866 |
| lobed | scalloped blank | no | same as wave; a planchet shape | 867-871 |

Presets (`EDGE_PRESETS`, `collar.html:874-889`): plain; reeded fine 72 / 0.7 / 1.5; reeded 40 / 1.0 / 2.8; reeded coarse 24 / 1.4 / 4.4; milled V 44 / 1.1 / 3.0; square groove 32 / 1.0 / 2.0; open reed 40 / 1.0 / 2.8 / gap 70; diamond knurl 28 / 0.9 / 2.4 / twist 40; rope 26 / 0.9 / twist 30; beaded 30 / 0.9 / 2.6; oblique 60 / 0.8 / twist 55; wave 18 / 1.2; petal 26 / 1.0 / 3.0; scalloped 12 / 2.2 (count / depth / width).

Print rules carried in the notes: reeds under 0.6 mm deep print round, "Ask me how I know" (`collar.html:2778-2779`, from the python coin's 64 reeds at 0.5 mm that printed round); turn off arc fitting on the outer wall or the reeds get smoothed (`collar.html:511-512`). zDep edges raise triangles two to three times (README) and the knurl at grid 1536 took 2875 ms and 579,634 triangles (measured, gold drive).

Not built: edge lettering and sequential numbering (README); they need text wrapped onto a cylinder.

### 4.3 Rim band and edge spots

What it does: a full-thickness coloured band following the blank outline, optionally broken into casino-chip segments that alternate between one or two spot colours.

Construction (inside `labelSlab`, `collar.html:1221-1258`, and the preview twin `previewLabels`, `collar.html:2002-2032`):
1. A pixel is rim when `rim.on` and `d >= base[idx] - rim.w` (`collar.html:1244`), so the band is an even width on any blank.
2. Spots: `a = theta + pi + phase`, `k = floor(a / pitch)`, `f = a / pitch - k`, `pitch = 2 pi / dashN`; when `f < duty` the pixel takes `dashSlot`, or `dashSlot2` on odd k when alternating (`collar.html:1245-1251`). Spots run the full thickness, so they read on the edge and as spots on both faces.
3. The rim label wins over art (art is tested only in the `else` branch), so art never paints into the rim.

Constants: rim width 2.2 default, range 0.6 to 6 (`collar.html:651`, `collar.html:390`); spots 12 segments, 45 percent duty, slot 2, alternate off, second slot 1, phase 0 (`collar.html:651`); ranges 2 to 48, 5 to 95, 0 to 90 (`collar.html:397-401`).

Checks: flute root clearance `(R - depth) - R_RIM_IN < 0.4` turns the rim note red with both radii and two fixes (`collar.html:2748-2755`); spots with the rim off show "Turn the rim band on above first" (`collar.html:2361-2363`). The dash note computes arc per segment `2 pi (shapeMinR - rim.w/2) / dashN x duty` (`collar.html:2365-2366`).

Limit: presets set `rim` as a whole object without the dash keys, so turning spots on after the hack.build preset reads NaN (gold flaw F2; visible in `c-03` as "each about NaN mm of arc"). A port deep-merges preset sub-objects over `blankState`.

### 4.4 Face art composer

What it does: turns each face's layer stack (images, live text, arc text, rings) into a per-pixel slot map, with no vector boolean library.

Construction (`renderLayer`, `collar.html:990-1117`; `buildFace`, `collar.html:1126-1198`):
1. A scratch canvas at the grid resolution maps model mm with origin at the centre and y up: `setTransform(k, 0, 0, k, res/2, res/2)`, `k = res / dia` (`collar.html:935-939`). `readMask` keeps alpha over 120 and flips rows so row 0 is the bottom (`collar.html:928-934`).
2. Ring layers are evaluated per pixel: inside `[r0, r1]`, optionally segmented by `seg` and `duty` (`collar.html:992-1008`).
3. Text: a pipe splits a line into runs alternating `slot` and `accent`; `runGap` mm of real air is inserted at each split so a dot reads instead of merging into the next letter (`collar.html:1010-1019`, `collar.html:1056-1068`). Straight text is centred, line height 1.18 x size (`collar.html:1053`). Arc text places each character at `A0 + sign (cur + adv/2) / Rb`, rotated `pi/2 - A` (or `-pi/2 - A` when `flip` puts it on the bottom of a seal), advances measured per character with `n` standing in for a space and multiplied by `track` (`collar.html:1027-1050`).
4. Images: scaled so the long side spans `2 R_ART x scale`, then three modes (`collar.html:1076-1116`): mono threshold on luminance `0.299 r + 0.587 g + 0.114 b <= thr` (invert flips); silhouette (any alpha 120 or more); match palette, nearest slot by weighted RGB distance `0.30 dr^2 + 0.59 dg^2 + 0.11 db^2`, body-slot pixels left as body (`collar.html:1088-1103`). Dropped SVGs start in palette mode, rasters in mono (`collar.html:2578`). The built-in hack.build mark is the two verbatim path strings `LOGO_ARC`, `LOGO_WRENCH` in an 800-unit viewBox (`collar.html:605-606`, `logoSVG` at `collar.html:2831-2834`), which is how one SVG lands a cream arc and a pink wrench on two extruders.
5. Layers stack in order; later ones paint over earlier ones (`collar.html:1141-1147`).
6. A `cut` layer writes into a `holes` mask instead of a slot; holes go through every slab and are not clipped to the art radius (`collar.html:1131-1139`, `collar.html:1193-1197`). A ring at r0 0, r1 3 with cut on gives a 6 mm hanging hole (README).

### 4.5 Art hygiene

What it does: makes screen art printable on a 0.4 nozzle.

Construction, per used slot, in this order (`collar.html:1149-1192`):
1. Stroke boost: separable box dilate by `boost x k / 2` px when at least 1 px (`dilate`, `collar.html:942-967`).
2. Despeckle: drop 4-connected islands under `max(1, round(pi (minF k / 2)^2 x 0.35))` px (`collar.html:1161-1166`, flood fill at `collar.html:968-985`). The 0.35 factor exists because despeckle at the full min-feature disc ate the full stop in hack.build (COLLAR v3); a dot that is the min feature must survive (comment at `collar.html:1162-1163`).
3. Colour gap: remove cells of slot s within `gap x k / 2` px of any other slot (dilate the union of the others) so two colours never butt (`collar.html:1169-1180`).
4. Clip to the art radius circle (`collar.html:1183-1192`).

Defaults: boost 0.10, gap 0.45, keepout 1.4, despeckle on, min feature 0.90 (`collar.html:653`); ranges boost 0 to 0.6, gap 0 to 1.5, keep 0 to 6, minF 0.3 to 2 (`collar.html:349-356`). All live behind the "fine tuning" fold.

### 4.6 Slab planner: raster in XY, exact in Z

What it does: cuts the coin into Z slabs whose boundaries land exactly on every height that matters, then labels each slab cell by cell.

Construction:
1. `planSlabs()` collects z breaks at 0, thk, inlay, thk - inlay, every layer inside the chamfer from both faces (`ceil(cham / layer)` steps), the pocket floor and ceiling, and every layer when the edge is zDep; rounds to 1e-4 and sorts (`collar.html:1201-1214`).
2. `insetAt(z) = max(0, cham - z, cham - (thk - z))` gives the 45 degree edge break as a per-slab inset (`collar.html:1215-1219`).
3. `labelSlab(z0, z1)` evaluates at the slab middle `zm` (`collar.html:1221-1258`): outside `cut[idx] - inset` is air; holes are air; rim band per 4.3; else front art if `zm >= thk - inlay`, back art if `zm <= inlay`, else body; inside the pocket z range and radius the label is 0.
4. Per-pixel radius and angle are precomputed once into `D2` and `TH` (`collar.html:1373-1378`); the angle indexes the 8192 LUT.
5. The back art is mirrored in X before slabbing because the bed face is read from the other side (`collar.html:1382-1384`); holes from the back are mirrored the same way (`collar.html:1385-1393`).
6. Consecutive slabs with identical label grids are merged so walls come out tall (`collar.html:1396-1406`).

Constants: grid `res` 512 across the diameter, range 384 to 1536 step 128 (`collar.html:644`, `collar.html:498`), which is 0.086 mm per cell at 44 mm (computed: 44 / 512). Layer 0.2 default, range 0.06 to 0.32 (`collar.html:644`, `collar.html:450`). Inlay 1.2, range 0.2 to 2.4 step 0.2 (`collar.html:644`, `collar.html:440`). Thickness 3.6, range 1.6 to 8 (`collar.html:644`, `collar.html:324`). Chamfer 0.5, range 0 to 2 (`collar.html:644`, `collar.html:452`).

Lesson: the layer default 0.2 disagrees with the process preset the file names, `0.24mm Standard @FF C5` (`collar.html:647`). A 1.2 inlay is whole layers at both (6 and 5, computed), but the NFC preset's pocket floor at 1.8 is 7.5 layers at 0.24 (computed), so the pause layer printed for a 0.2 slice is wrong on a 0.24 slice (`fab-knowledge:sources/benches/benches-coins-inlay.md` section 1.3). The owner's Aug 30 print card shows them switching the layer to 0.24 by hand (`owner-collar-print-card-20260830-nfc-024.txt`). A port derives the layer from the process preset.

### 4.7 Mesher: greedy caps, wall runs, cross-slab wall merge, T-junction conforming

What it does: emits one closed, consistently wound mesh per slot from the slab label grids, with faces only where two labels differ, so parts never overlap and sum to the solid.

Construction (`buildMesh`, `collar.html:1368-1506`):
1. Horizontal faces at every slab boundary including the two outer ones: for each slot that differs between the slab below and above, a mask is greedy-merged into rectangles (`greedy`, `collar.html:1261-1278`) and emitted up (+z) for the slot below or down (-z) for the slot above (`collar.html:1414-1434`).
2. Vertical walls: runs along rows and columns per slab keyed `dir|line|i0|i1|a|b`; a run that repeats in the next slab with touching z is extended instead of re-emitted, which merges walls across slabs (`collar.html:1441-1493`). The comment at `collar.html:1436-1440` gives the reason: the rim and art boundaries do not move up the coin, only the chamfered outline does. Cross-slab merging took triangles from about 180k to 110k (per `fab-knowledge:sources/benches/benches-coins-inlay.md` section 1.3).
3. `conformQuads` fixes T-junctions exactly: collect every unique vertex, index the three axis lines through each, insert any vertex lying strictly inside a quad edge, then fan from the quad centre, which is always interior so no fan triangle is degenerate; plain two-triangle split when nothing is inserted (`collar.html:1294-1352`). Greedy merging had left 13k to 30k dangling T-junction edges before this pass (same source).
4. `packPart` flattens triangles to position and normal arrays (`collar.html:1354-1366`).
5. Volumes per slot come from cell counts times slab height, not from the mesh (`estimateVolume`, `collar.html:1508-1517`).

Measured: the hack.build preset builds 94,848 triangles in 7 slabs (measured, `c-01`), and the gold drive found every edge balanced in all three parts, STL volumes matching the print card to two decimals, and byte-identical 3MFs for the same design.

Limits: no pinch healer. Where art pixels touch only at a corner, an edge is used by four faces (4 such edges in the gold drive export, measured); the README's "strictly manifold" holds only without diagonal contacts. The later `rastermesh.js` `fixPinches` (see the `inlay` record) and TOGGLE's `part2e.js` (lineage row `healer/toggle-part2e`) solve this.

### 4.8 Sealed insert pocket and pause layer

What it does: a sealed void for a 25 mm NFC sticker or a magnet, with floor and ceiling on layer boundaries and the pause layer computed.

Construction:
1. `NFC_Z0 = max(inlay, round(((inlay + thk - inlay) / 2 - depth / 2) / layer) x layer)`: centre the pocket in the solid core, snapped to a layer boundary (`collar.html:746-751`).
2. The planner adds `NFC_Z0` and `NFC_Z0 + depth` as z breaks (`collar.html:1208`); `labelSlab` sets label 0 for `zm` strictly inside that range and `d <= dia/2` (`collar.html:1228-1230`, `collar.html:1254`).
3. `pauseInfo()` returns `z = NFC_Z0 + depth` and `layer = round(z / layer) + 1` (`collar.html:1886-1889`).
4. The note reports slop `dia - tag`, floor `NFC_Z0 - inlay`, roof `thk - inlay - NFC_Z0 - depth`, and turns red under 0.3 mm (`collar.html:2763-2775`). The readout puts "pause before layer N" in pink (`collar.html:2727-2732`). The print card adds the slicer gesture: Preview tab, vertical layer slider, right click the plus dot, Add pause; greyed out unless print order is by layer and the cursor is on the plus dot (`collar.html:1861-1873`).

Constants: tag 25, pocket 26, depth 0.6 (`collar.html:652`); ranges tag 6 to 55, pocket 8 to 60, depth 0.2 to 3 (`collar.html:458-462`). The NFC preset sets thickness 4.2 (`collar.html:2894-2901`). With the hack.build art at 4.2 mm: floor Z 1.80, roof Z 2.40, pause before layer 13, walls 0.60 and 0.60 (measured, `c-04`).

Fits: 1.0 mm diametral slop round a 25 mm tag drops in without fighting (README, computed 26 - 25). Pocket 0.6 tall clears the chip bump on the thicker stickers (python coin README).

Rounding knife edge: on the default 3.6 mm coin the unsnapped floor is exactly 7.5 layers, so `Math.round` decides between floor Z 1.40 and 1.60 on float noise. In the browser `thk - inlay` evaluates to 2.4000000000000004, the quotient lands at 7.500000000000001 and the floor snaps up to 1.60 (floor wall 0.40, roof wall 0.20, pause layer 12; measured in `fab-knowledge:evidence/gold/collar-coin/exports/hook-print-card.txt`). Writing the same sum as `(1.2 + 2.4) / 2 - 0.3` gives 7.499999999999998 and floor 1.40 (computed in node). A port snaps with an explicit epsilon and a stated tie rule.

Limits: the 0.3 mm wall threshold is below the skill's print-reality rule of 0.6 floor and 0.8 roof (`fab-knowledge:originals/inlay/files/skill/print-forge/references/print-reality.md`), and a failing pocket still builds and exports (gold flaw F6). The default 0.6 pocket on a 3.6 coin fails its own rule with a 0.20 roof (measured, gold `d-49`).

### 4.9 Project 3MF writer (Orca dialect, 127 filament keys)

What it does: writes a 3MF that Orca-derived slicers treat as their own project, so part-to-extruder assignment and the full filament list survive import.

Construction (`collar.html:1565-1837`):
1. Package entries: `[Content_Types].xml` (rels, model, config, png, txt, stl), `_rels/.rels`, `3D/3dmodel.model`, `Metadata/model_settings.config`, `Metadata/project_settings.config` (when write filaments is on), `Metadata/slice_info.config`, `Metadata/filament_sequence.json`, `Metadata/collar_print_card.txt` (`collar.html:1822-1837`).
2. Model XML: namespaces core 2015/02, production 2015/06 as `p`, BambuStudio 2021; `Application` = `BambuStudio-01.10.01.50`, `OrcaSlicer` 2.1.1, `BambuStudio:3mfVersion` 1 (`collar.html:1571-1591`). One mesh object per slot part with UUID `hex8(i + (1 << 16)) + SUF_SUB`, one components object assembling them, one build item at (128, 128, 0) with `auto_drop="1"` (`collar.html:1582-1620`). UUID suffixes are fixed constants (`collar.html:1575-1579`). Vertices are welded at 1e-4 before writing (`weld`, `collar.html:1552-1563`) and printed with 5 decimals.
3. `model_settings.config`: one object, `extruder` metadata per part equal to its slot, plate with `filament_map_mode` "Auto For Flush" and `filament_maps` "1 2 3", one model_instance and one assemble_item (`collar.html:1622-1656`).
4. `project_settings.config`: printer and process preset names only, never their settings (`collar.html:1765-1776`); 99 verbatim per-filament keys from `FILAMENT_TEMPLATE` repeated N times (`collar.html:1745`, `collar.html:1777`) plus 28 computed per slot from `MATERIALS` (`collar.html:1780-1809`), all as strings. Total 127 per-filament keys, set-equal to the Flash Studio round trip (measured in `fab-knowledge:sources/benches/benches-coins-inlay.md` section 4.4). Filament preset names from a pattern `Generic {TYPE}` with the material substituted (`collar.html:1779`).
5. `slice_info.config` header `X-BBL-Client-Version 01.10.01.50` (`collar.html:1813-1820`).
6. ZIP writer with its own CRC32, `CompressionStream('deflate-raw')` when available and store otherwise, and a fixed DOS time 0x2821 so the same design gives the same bytes (`collar.html:1675-1731`).

Each rule cost a failure (comments at `collar.html:1565-1570`, `collar.html:1733-1744`, `collar.html:1765-1768`): without the Application tag the importer loads geometry only; with per-filament vectors shorter than N the filament list collapses to one; without printer and process names the slicer invents an external preset named after the file.

`MATERIALS` (`collar.html:1747-1756`): PLA 220 / 55 / 1.24, PETG 250 / 80 / 1.27, ABS 255 / 95 / 1.04, ASA 260 / 95 / 1.05, TPU 235 / 35 / 1.22, PC 270 / 100 / 1.20, PA 280 / 100 / 1.14, PVA 220 / 60 / 1.24 (nozzle C / bed C / density g per cm3). These drift from the skill's `materials.json` (PETG 240 / 70); one table with provenance is the fix (`fab-knowledge:sources/benches/benches-coins-inlay.md` section 7.3).

Limits: `ST` defaults the preset pattern to `Generic {TYPE} @FF C5P` but `blankState` resets it to `Generic {TYPE}` at boot (`collar.html:646`, `collar.html:2839`), so exports ask for `Generic PETG` (gold flaw F12). Every per-filament value is the same per slot except the 28 computed ones; the gold save differs per slot on 17 keys (`docs/plan/PLAN.md` line 680).

### 4.10 STL bundle, print card, face PNG, design JSON

- STL bundle: one binary STL per slot named `collar-coin-slot<N>-<name>.stl`, stored uncompressed, plus `print-card.txt` and `collar-design.json` (`collar.html:3090-3104`; `stlBinary` at `collar.html:1529-1549`).
- Print card (`printCard`, `collar.html:1839-1884`): blank, inlay in mm and layers, edge with count, depth, width and pitch `2 pi R / count`, rim band slot, filament map per slot with colour, material, cm3 and grams, pocket floor and ceiling Z with walls, the pause instruction with the slicer gesture, slicing notes (layer, no supports, no brim, ironing, smooth plate for a glossy back, arc fitting off, mirrored back explained), mesh stats. Written into the 3MF and the STL zip.
- Face PNG: 1200 x 620, front and back "as it reads in hand" (`collar.html:3106-3116`).
- Design JSON: `collar: 1` marker, all state, images as data URLs (`serialize`, `collar.html:2950-2966`); `deserialize` merges top-level keys and refuses a file without the marker (`collar.html:2967-2988`).

### 4.11 Viewport

Raw WebGL, no three.js (`collar.html:1891-1999`). Two Lambert lights at weights 0.72 and 0.24 plus 0.20 ambient and a 0.14 rim term (`collar.html:1895-1905`); orthographic camera framed from the diameter, `rad = dia x dist x 0.62` (`collar.html:1968-1970`); orbit by mouse or one-finger touch, wheel zoom clamped 0.45 to 4 (`collar.html:1931-1946`); flip rotates by pi about X (`collar.html:1971`); exploded lifts each slot by `(slot - 1) x 0.9 x thk` (`collar.html:1977`). Clear colour is cream (`collar.html:1966`).

Limit: wire mode draws the triangle soup as one LINE_STRIP, a hatch across the coin (`collar.html:1982`, gold flaw F5).

### 4.12 Art board: direct manipulation on the face boards

What it does: the two 520 px face canvases under the viewport are the editor; what is drawn there is what prints.

Construction:
1. `previewLabels` composes the face from the same `buildFace` the mesh uses, at the inlay band's Z, with the edge cut, rim, spots and holes (`collar.html:2002-2032`). `drawFace` paints at 420 px and draws the NFC pocket as a dashed circle (`collar.html:2034-2062`).
2. `layerBBox` renders the layer alone at 160 px and takes the pixel bounds; cached by a signature of the layer fields plus diameter, keepout, rim width and shape (`collar.html:2103-2130`).
3. Handles: pink dashed bbox, a 9 px pink corner square at the bottom right, a rotate dot on a 22 px stem (`HANDLE = 9`, `ROTGAP = 22`, `collar.html:2068`; `drawHandles`, `collar.html:2079-2101`).
4. Pointer down selects the topmost layer whose bbox, padded by 1.2 percent of the diameter, contains the point, switches the face tab and opens only that layer in the list (`layerAt`, `collar.html:2131-2142`; `selectLayer`, `collar.html:2593-2602`; `collar.html:2622-2644`).
5. Drag semantics follow the geometry (`collar.html:2646-2683`): body drag moves dx, dy in mm; arc text has no x and y, so a drag sets its radius (clamped 2 to `R_ART + keep`) and centre angle; a ring drag moves its centre radius keeping its width; the corner scales about the coin centre by distance ratio (image scale 0.05 to 1.6, text size 1 to 40, ring radii); the dot rotates (arc text: shifts the centre angle). Hover changes the cursor per handle (`collar.html:2648-2654`).
6. Every move is a `touch(40)`; release is one `commit()` (`collar.html:2681`, `collar.html:2685-2690`).
7. Keys: arrows nudge 0.2 mm, shift 1 mm; on arc text up and down change radius and left and right change angle by 1 or 5 degrees; Delete or Backspace removes (`collar.html:3152-3171`). Drop a file anywhere adds image layers (`collar.html:3065-3073`).

Limits: one scale corner, no snapping, no board zoom; each pointermove redraws both boards at 420 px (gold flaws F21, F22).

### 4.13 Touch, commit and the build loop

What it does: keeps the 2D preview live while dragging and rebuilds the mesh once per locked-in change, never stacking builds, never exporting a stale mesh.

Construction:
1. `bindRange` wires every slider: `input` sets state, refreshes the value label and calls `touch()`; `change` calls `commit()` (`collar.html:2166-2179`).
2. `touch(delay)` marks dirty, refreshes readouts and notes, and redraws the face boards after 90 ms by default (40 during drags, 240 while typing) (`collar.html:2182-2191`).
3. `commit()` touches, refreshes the slot badges and schedules `doBuild(true)` after 320 ms; if a build is running it sets `queued` (`collar.html:2198-2207`).
4. `doBuild` runs one build at a time inside a 20 ms timeout, logs a warning over 2500 ms, keeps the previous mesh and turns the status dot red on a throw, and runs one queued follow-up (`collar.html:2799-2820`).
5. `ensureMesh()` rebuilds synchronously before every export when dirty (`collar.html:2823-2828`).
6. Text fields patch the layer title in place and debounce the preview at 240 ms instead of re-rendering the list, so focus is never torn out from under the cursor (`txt`, `collar.html:2495-2509`).

Measured: one rebuild per gesture or slider release, 179 to 466 ms at grid 512 (gold drive).

### 4.14 Layer stack editor and slot rows

What it does: the left-column list that holds each face's layers, and the colour step's slot rows, with every per-layer control built from four small factories.

Construction:
1. `renderLayerList` draws one accordion row per layer: a swatch (slot colour; a black and white 45 degree hatch when `cut` is on; a pink to cream gradient for a palette image), the title from `layerTitle` (text with the pipe removed, first 16 characters), and three buttons `^` move up one, `*`/`o` mute (sets `L.off`, which `buildFace` and `layerAt` skip), `x` delete (`collar.html:2410-2452`). An empty face shows a hint that explains stacking and the pipe split (`collar.html:2415-2424`).
2. Clicking a title toggles `open` and selects the layer on the board; only the open row shows its editor (`collar.html:2441-2446`).
3. `layerEditor` builds controls per kind (`collar.html:2516-2565`). Every layer starts with `cut right through`. Image: colour mode (mono threshold, silhouette, match palette), slot unless palette, threshold 0 to 255 and invert in mono, scale 0.05 to 1.6, offset x and y -30 to 30, rotate -180 to 180, mirror. Text: text, slot, accent slot, split gap 0 to 4, font (the `FONTS` list at `collar.html:2161`), size 1 to 30, caps, bold, layout straight or arc; arc adds radius 2 to 60, centre angle, tracking 0.6 to 2.2 and `bottom of seal`; straight adds offsets and rotate. Ring: slot, inner r and outer r 0 to 40, segments 1 to 120, duty 5 to 100 percent.
4. The factories: `num` pairs a range and a number box on one value, both `touch()` on input and `commit()` on change (`collar.html:2461-2475`); `sel` and `chk` commit on change (`collar.html:2476-2494`); `txt` is the typing-safe field in 4.13.
5. New-layer defaults (`collar.html:2398-2408`): text `hack|.build`, slot 2, accent 3, Permanent Marker 7.5, run gap 0.6, tracking 1.05; arc text `MAKE THINGS` at size 4.2 on radius `R_ART - 2`, centre angle 90; ring from `R_ART - 1.4` to `R_ART` in slot 3, 1 segment, duty 60. `addLayer` opens and selects the new layer and commits (`collar.html:2390-2397`).
6. Slot rows (`renderSlots`, `collar.html:2240-2291`): 2 / 3 / 4 colour chips, then per slot an index tile, a name field, a colour picker, a material select from `MATERIAL_LIST`, and badges body, rim and the `usedBy` face badge. Name and colour edits re-render the layer list so swatches follow.

Limits: arc text lays out only the first line of a multi-line string (`lines[0]`, `collar.html:1030`); layer order moves only up, one step at a time; a palette image counts as using every slot in `usedBy` (`collar.html:2234`).

## 5. UX anatomy

| region | content | code |
|---|---|---|
| shell | grid 330 px / 1fr / 300 px; right column hidden under 1180 px; single column under 820 px | `collar.html:45-58` |
| tokens | pink #FE0386, cream #f5f0e6, ink #1a1a1a, void #0a0a0a, raised #fffdf7, sunk #efe9db, edge #e8e0d0, slime #a6e22e; IBM Plex Mono body, Permanent Marker title, Special Elite tagline, VT323 values | `collar.html:11-21` |
| header | mark, `COLLAR.` in Permanent Marker, tagline "challenge coin bench / flat inlay / slicer ready", auto rebuild checkbox, guide, presets, save json, load json, rebuild now (pink) | `collar.html:277-293` |
| steps | 1 art, 2 edge, 3 colour, 4 print as numbered tiles; guide strip `step N of 4 . name` plus one goal sentence | `collar.html:298-304`, `GUIDE` at `collar.html:2150-2159` |
| step 1 art | start from (6 presets, blank first), blank shape (9 chips, proportion and corner only when used), coin size, faces tabs, drop box, add text, add arc text, add ring, clear face, layer list, fine tuning fold, `next: cut the edge` | `collar.html:307-364` |
| step 2 edge | 14 edge preset chips, per-style note, only the used sliders, rim band with live clearance note, edge spots with live arc note, `next: pick the colours` | `collar.html:367-409` |
| step 3 colour | 2 / 3 / 4 colour chips, one row per slot (number, name, colour, material, role badges), slicer profile fold, who gets what (body slot, rim slot), colour depth with inlay note, `next: print settings` | `collar.html:412-444`, badges `usedBy` at `collar.html:2229-2238` |
| step 4 print | layers (layer height, edge break, layer note), insert pocket, export (3mf project pink, stl bundle, print card, face png, readiness note), printer profile fold, mesh quality fold, how to slice this fold | `collar.html:447-518` |
| stage | stagebar chips solid, wire, exploded, flip, reset view; WebGL viewport; two face boards with captions `front / top face` and `back / bed face`; hint line | `collar.html:522-543` |
| readout rail | COIN (diameter, thickness, inlay with layers, core between, art radius, rim band, reed pitch, grid mm/px), MESH (triangles, slabs, volume, mass, grams per slot), SLICER (layer height, total layers, pocket floor, roof, pause before), LOG (black terminal, 300-line cap), tips | `collar.html:546-559`, `refreshStats` at `collar.html:2699-2734` |
| status strip | dot (slime ok, amber busy, red error) and one phrase; tagline "make things. break things. repeat." | `collar.html:562-567` |
| welcome | two-sentence purpose, four steps one line each, two starts: blank coin or the hack.build coin; Escape or click outside closes | `collar.html:569-587`, `collar.html:3141-3147` |
| presets | blank coin, hack.build coin, seal + tagline, nfc tag coin, casino chip, big 50mm medallion; one confirm when art would be lost | `PRESETS` at `collar.html:2851-2925`, `applyPreset` at `collar.html:2929-2934` |

The computing notes are the bench's design knowledge; each states the measured value, the limit or the colliding value, and a fix:

| note | rule | code |
|---|---|---|
| `inlayNote` | inlay not a whole number of layers (tolerance 0.02 layer); inlay under 0.8 mm tints; core under 0.4 turns red | `collar.html:2740-2744` |
| `rimNote` | flute root clearance under 0.4 mm turns red with both radii and two fixes | `collar.html:2748-2759` |
| `dashNote` | segment arc length, or "turn the rim on" | `collar.html:2360-2368` |
| `layerNote` | total layers and the inlay layer count | `collar.html:2761` |
| `nfcNote` | slop, floor, roof, pause layer and Z, or red under 0.3 mm walls | `collar.html:2763-2775` |
| `resNote` | mm per pixel and what the grid costs | `collar.html:2746` |
| `expNote` | not built, stale with auto, stale without auto, or ready with triangles | `collar.html:2188-2190`, `collar.html:2794` |
| `tips` | reeds under 0.6 mm print round; zero colour gap with three slots | `collar.html:2777-2781` |

## 6. What makes it excellent, as rules to copy

1. Boot builds a real, exportable blank coin behind the welcome card (`collar.html:3174-3180`); the first thing seen is a coin.
2. Steps follow how the owner designs a coin: art, edge, colour, print. Art points at slot numbers, so filaments are decided last and the colour step shows which faces use each slot.
3. Print knowledge lives in live numeric notes beside the control they constrain, naming the value, the collision and the fix.
4. The one number the printer needs, the pause layer, is computed from the same snapped Z the mesh uses and shown pink in the readout, in the note and on the card with the slicer gesture.
5. Touch and commit are separate; builds never stack; exports always pass through `ensureMesh`.
6. Typing never re-renders its own container.
7. Direct manipulation knows the geometry: arc text drags to radius and angle; rings keep their width.
8. The board is the print: the 2D editor draws from the mesh's own label function.
9. Every edge style is one record carrying its formula, its used params, its note and its slicing need.
10. Numismatic vocabulary is used correctly and teaches: reed, flute, land, milled, open reed, petal cut, scalloped blank as a planchet shape.
11. The kernel matches the deliverable: raster in XY, exact in Z, walls merged across slabs, T-junctions conformed, same design gives the same bytes.
12. The 3MF dialect is written from a real Flash Studio save, and the comments say why each rule exists.

## 7. Known limits and failure lessons

From `fab-knowledge:sources/gold/collar-coin.md` section 7, confirmed in the code read here:

| id | limit | code |
|---|---|---|
| F1 | no `BENCH` or `HB` hook; tests reach the page's global lexical scope | whole file |
| F2 | presets replace sub-objects whole; spots after the hack.build preset read NaN | `collar.html:2858` |
| F3 | every step tile that is not current gets the done style, even unvisited ones | `collar.html:3041-3050` |
| F5 | wire mode is one LINE_STRIP | `collar.html:1982` |
| F6 | warnings never gate an export | `collar.html:2736-2782` |
| F7 | art clipped to the inscribed circle, "IACK.BUILI" | `collar.html:1183-1192` |
| F8 | dropping to 2 slots clamps slot refs; going back does not restore them | `collar.html:2217-2226` |
| F10 | the slow-build warning points at "the blank tab", which no longer exists | `collar.html:2809` |
| F11 | total mass uses PETG density 1.27 whatever the slot materials | `collar.html:1859`, `collar.html:2717` |
| F12 | preset pattern reset to `Generic {TYPE}` at boot | `collar.html:2839` |
| F13 | no pinch healer; diagonal pixel contacts give 4-face edges | `collar.html:1368-1506` |
| F15 | no undo | none |
| F16 | fonts from Google Fonts; offline it falls back to system mono | `collar.html:9` |

Lessons carried from the python coin that preceded it (see the `coin` record): Application tag; per-filament vector length N; mirror the bed face; period kerning; 1.2 mm inlay for pink over black; reeds at least 1.0 mm deep.

## 8. Tests and harness

COLLAR ships no test file. Testing reaches the classic script's global scope (`ST`, `MESH`, `building`, `dirty`, `buildNow`, `doBuild`, `commit`, `ensureMesh`, `export3mf`, `stlBinary`, `printCard`, `serialize`, `deserialize`, `applyPreset`, `syncAll`).

- Gold drive: `fab-knowledge:evidence/gold/collar-coin/drive/drive.js` (73 shots, timings, exports, provoked failures), `mprobe.js` (phone reach), `inspect3mf.py`; results in `report.json` and `run.log` beside it.
- This record's drive: `fab-knowledge:originals/collar/drive/collar.cjs` (puppeteer-core, system Chrome headless, SwiftShader); ready when `MESH` is set; settled when `building` and `dirty` are both false.
- README claims every part watertight with consistent winding, zero overlap and parts summing to the solid, verified against trimesh and lib3mf; the gold drive found 4 four-face edges where art touched at a corner (measured).

## 9. Port map

| field | value |
|---|---|
| packages | profile, geom, mesh, 3mf, inlay, ui-core (`fab-knowledge:synthesis/mappings.md` row COLLAR) |
| feature kinds (in the 26) | edgeProfile, pocket, chamfer, window |
| kinds it needs that the 26 lack | `inlay` (art region by slot), `sealed-pocket` (pocket flag with pause layer output), rim band and edge spots as inlay region kinds |
| check families | CHK-PRT, CHK-3MF, CHK-INL, CHK-SHP, CHK-UI; proposed CHK-INL-05 to 10 and CHK-PRT-10 come from COLLAR notes |
| mechanism canon id | MISSING: no mechanism, and `docs/plan/CANONS.md` has no entry for the edge profile registry, the rim band or the sealed pocket |
| circuit canon | none (no circuit) |
| reference id | `cosmetic/coin-inlay` and `cosmetic/edge-profiles` in the handoff INDEX (`fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/reference/INDEX.md` lines 39 and 40); `reference/cosmetic/coin-inlay/` is written at M03-T08 (`docs/plan/milestones/M03-inlay.md` line 610). Proposed and MISSING: `cosmetic/casino-chip`, `kinds/sealed-pocket`, `exports/orca-3mf-roundtrip` |
| milestones | M00 (COLLAR offsets match to 1e-6 mm, per-part volumes within 1e-3 mm3 of legacy, COLLAR key set equals the 127 gold keys) and M03 (COLLAR v5 art pipeline on shared kernels), `docs/plan/MILESTONES.md` lines 57 and 60 |
| lineage row | MISSING: `lineage.json` holds only the three healer rows; nothing names `collar.html` or its sha |
