# KNURL: how it is made

Record written 2026-10-05 from the original code. Slug `knurl`. Family counters-machines (KNURL, DETENT, WASHER, PLENUM, QUENCH, COFFER). KNURL is the printed mechanical tasbih: a Geneva rounds counter and a separate detent strip, rolled with the thumb.

Number rules for this file. A number that names a code location is a declared value copied from that line. "Computed" means produced on 2026-10-05 by the canonical file's own functions (`K.layout`, `K.sim`, `K.pawlDeflection`, `K.checks`) in headless Chrome at defaults, saved in `fab-knowledge:originals/knurl/drive/layout-defaults.json`. "Measured" comes from the drive in this folder. "Stated" quotes the bench README or page copy and has not been checked against a print.

Short path: `F` is `fab-knowledge:originals/knurl/files/`. Every bare line number is a line of `F/knurl.html` (1569 lines).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "KNURL. mechanical tasbih bench" (title, line 6) |
| owner's slug | knurl |
| canonical file | `F/knurl.html`, copied from `fab-work-directory:benches/knurl/outputs/knurl/knurl.html` |
| sha256 | 90a7f98e708e3fa850e11ce3e58f3ab5fa612b8446f15b5f8a7efbde575e9af1 |
| bytes | 137674 |
| date | 2026-09-07 20:45 (mtime of the byte-identical `~/Downloads/knurl (8).html`); also inside `~/Downloads/files (91).zip` dated 2026-09-08 04:08 |
| runtime | one hand-written file, three script blocks: core `window.KNURL` (lines 162 to 549), design layer (552 to 1226), app module (1229 to 1567); three 0.185.1 and OrbitControls from cdn.jsdelivr.net through an import map (line 1229); six Google fonts |
| brand | hack.build paper shell, canonical pink `#FE0386`, cream, ink, slime |

### 1.1 Every revision found

All in `~/Downloads`, dated by mtime, compared by feature grep on 2026-10-05 (computed).

| file | date | bytes | sha256 (12) | what it adds |
|---|---|---|---|---|
| `knurl.html` | 2026-09-07 15:30 | 102767 | 419e303dc3d2 | first bench, clr 0.15 era |
| `knurl (1).html` | 16:06 | 111133 | 58a48fa037c6 | `pawlDeflection`, slicer `projectSettings`, separate pawl strip |
| `knurl (2).html` | 16:22 | 114111 | e43e43c2a3b0 | same features, fixes |
| `knurl (3).html` | 19:24 | 121827 | e5e4b912dc41 | chaukhandi medallion; clr 0.15 default gone |
| `knurl (4).html` = `(5)` | 19:55, 20:07 | 131005 | 857f32c51248 | pin wall opening and shield arc, thrust ring |
| `knurl (6).html` | 20:31 | 131814 | b21f63ae2b5e | elephant foot relief (`footZ`), clr 0.4 default |
| `knurl (7).html` | 20:33 | 132093 | f16a712931bf | small fixes |
| `knurl (8).html` = harvest | 20:45 | 137674 | 90a7f98e708e | traced keffiyeh motifs (`K.KEF`), keffiyeh corner preset; canonical |

Design files from the same day: `knurl.json` (16:33, the first print preset with `print.clr 0.15`, `axial 0.3`, `pawl.fit 0.2`, the fit that jammed) and `knurl (1).json` (23:06, the refit preset equal to the shipped defaults). Both are kept in `F/history/`. Slicer re-saves `knurl (1).3mf` to `(5).3mf` (2026-09-07 to 09-11) are recorded in `fab-knowledge:sources/downloads/dl-ogee-stipple-mech.md` lines 195 to 209; the app export here is the bench's own.

### 1.2 Why this revision

`(8)` is the newest and the best. Every step from 15:30 adds a correction that came from the first print or the node sweep (separate strip, pin opening and shield, thrust ring, foot relief, refit clearances) and removes none; `(8)` adds only art. The drive on 2026-10-05 built the default design in 761 to 1409 ms to 98,288 triangles with zero page or console errors and "all geometry checks pass" (measured). `CHK-SHP-02` in the plan cites "KNURL 2026-09: 64 reeds at 0.5 deep" and no reed geometry exists in any revision found, so that record comes from a revision that is not on disk (`fab-knowledge:sources/benches/benches-mechanisms.md` line 703).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `knurl.html` | the bench |
| `README.md` | the bench's own README: mechanism, printing and fits, assembly, first print checks, verification claim |
| `examples/knurl_default.json`, `knurl_keffiyeh.json` | design files for the load button |
| `examples/knurl_default.3mf` | the default plate written by the bench: five objects, three filament slots, `project_settings.config` |
| `examples/knurl_face_preview.png`, `knurl_parts_render.png`, `knurl_pawl_strip.png`, `knurl_pin_opening.png`, `knurl_back_options.png` | renders shipped with the bench |
| `history/knurl-first-print-jam-preset.json` | the 15:30 to 16:33 preset with clr 0.15 that bound the star and snapped the pin |
| `history/knurl-refit-preset.json` | the refit preset, equal to the shipped `print` block |

Hashes: `fab-knowledge:originals/knurl/SHA256SUMS`.

---

## 2. What it makes and for whom

A misbaha you roll with the thumb, for someone who counts dhikr in rounds of 33. Five PETG parts, no fasteners, springs or electronics: tray, lid, count wheel, rounds star, detent strip. The thumbwheel rim pokes 2 mm out of the body; each flute is one bead and one click; numerals 1 to 33 show one at a time in a cartouche window; a 3 slot Geneva star under the wheel advances the round (1 to 3, then rolls to 1) in a mihrab arch window. Lid and back carry flush multicolour inlays: Islamic lattices, three medallions for the round back, a keffiyeh traced from a public domain frieze, and Arabic calligraphy on an arc. Body 70.0 x 11.3 mm (computed, readouts).

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/knurl/drive/shoot.cjs` with `drive/shots.json` (puppeteer-core, headless Chrome with SwiftShader, 1280 x 860). Ready when the status pill reads "N tris". The camera was pulled back by six wheel events after `fit`.

| file | caption |
|---|---|
| `shots/k01-assembled-count-1.png` | Assembled default: green body, gold khatam lattice inlay with border ring and "سبحان الله" on an arc, the cartouche count window and the arch rounds window cut through the lid, fluted rim proud of the right edge, lanyard loop. Right rail: live face preview, readouts (Geneva 3 slots, pin r1.3 at 21.65, star r12.50; carry 5.5 counts, ends at bead 1; click about 0.74 N, 0.5 percent strain), "all geometry checks pass". Pill "98,288 tris". |
| `shots/k02-exploded.png` | Exploded (lid +26, wheel +12, star +5, strip +8): numerals 1 to 33 inlaid on the wheel top, the round label on the star, the pawl block and strip on the tray floor. |
| `shots/k03-lid-off-geneva-driving-bead-31.png` | Lid off at count 31: the star mid index ("STAR 53.0 drv"), the face preview shows 31 in the count window and the arch window between labels. |
| `shots/k04-print-plate.png` | Print plate: tray floor down, lid, wheel and star show face down, the strip standing on its long edge, on a 10 mm grid. |
| `shots/k05-keffiyeh-preset-assembled.png` | Keffiyeh preset: the traced net, knots, thick and thin stripes and chevron rows. The face preview takes the preset's cream and black, the 3D view keeps green and gold (defect, section 9). |
| `shots/k06-keffiyeh-back-preview-checks.png` | Back preview "as printed on the bed (mirrored)" for the keffiyeh preset. |

---

## 4. Code map

| area | lines |
|---|---|
| CSS tokens and layout (rail 308, side 352, bar 50) | 11 to 97 |
| header, stage tabs, readout bar, side panel markup | 101 to 160 |
| core: canvas in mm `K.mkCanvas` | 178 to 186 |
| core: path builders (circle, ring, poly, sector, rect, regular, star, arch, cartouche, vesica) | 189 to 216 |
| core: canvas booleans `fill`, `cut`, `stroke`, `cutStroke`, `insetFill`, `evenoddFill` | 218 to 224 |
| core: text by cap height `K.capRatio`, `K.text`, `K.arcText` | 228 to 266 |
| core: marching squares tracer `K.trace` | 269 to 354 |
| core: `area`, `bbox`, `pointIn`, Douglas-Peucker `simplify`, `outsideCount` | 356 to 386 |
| core: `extrude`, `merge`, `transformPositions`, `bounds` | 389 to 422 |
| core: binary STL, store zip with CRC32, 3MF writer | 425 to 548 |
| design: `K.defaults` | 562 to 580 |
| design: `K.layout` (Geneva, z stack, pawl, tabs, pin opening, keeper, loop) | 583 to 671 |
| design: `K.geneva`, `K.sim`, `K.omegaFor` | 674 to 685 |
| design: star outline `starDraw`, `starShape` | 690 to 707 |
| design: windows `windowPaths`, `measureNumerals` | 711 to 747 |
| design: traced keffiyeh motifs `K.KEF`, patterns `K.pattern` | 751 to 886 |
| design: `placeText` (arc text warped in pixel space), `textBand` | 891 to 922 |
| design: `faceArt`, `numeralArt`, `labelArt` | 925 to 970 |
| design: `K.buildParts` (slabs per part) | 975 to 1060 |
| design: `K.buildMeshes` (raster, trace, EPS overlap, extrude) | 1063 to 1095 |
| design: `K.pawlDeflection` | 1101 to 1110 |
| design: `K.platePlacement` | 1113 to 1123 |
| design: `K.MATERIALS`, `filamentList`, `projectSettings` | 1128 to 1161 |
| design: `K.checks` | 1164 to 1225 |
| app: `SCHEMA` (11 sections), `PRESETS` (9) | 1248 to 1314 |
| app: rail builder and controls, image drop and threshold | 1316 to 1381 |
| app: three stage, `fillStage`, `fillPlate`, `poseParts`, `fit` | 1384 to 1437 |
| app: sim `goTo`, `click`, `toggleRun` | 1440 to 1449 |
| app: face preview `drawPreview` | 1452 to 1500 |
| app: rebuild pipeline, checks and readouts | 1503 to 1530 |
| app: exports, wiring, start | 1533 to 1565 |

Hook: none beyond the `window.KNURL` namespace of pure functions. The core comment (lines 163 to 167) says it has "No DOM assumptions beyond a canvas factory, so the same file runs under node-canvas for tests."

---

## 5. Mechanisms and constructions

There is no circuit.

### 5.1 Layout frame and z stack (`K.layout`, lines 583 to 671)

Tray centre at the origin, y up, z 0 at the tray floor top. The wheel centre sits on +x so its rim pokes out: `O = [R - Rc + protrude, 0]` = (12, 0) (computed). The star centre is `S = O + d (cos sigma, sin sigma)` with `sigma = rounds.angle` 190 deg, giving (-12.62, -4.34) (computed).

Z stack at defaults (computed): floor -1.6 to 0; star peg -0.7 into a floor hole from -0.9; star hub 0 to 1.0; star 1.0 to 4.0; wheel underside features from 1.3 (`under0 = star0 + 0.3`); wheel 4.5 to 7.5 (`wheel0 = star1 + axial`); pin root flare from 4.3 (`max(0.2, min(0.4, axial - 0.3))` below the wheel, so the flare stays 0.3 above the star top); lid underside and wall top 7.9 (`part = wheel1 + lidGap`); lid top 9.7; rim notch from 4.1; wall groove 4.3 to 5.5; post top 7.7; counterbore from 6.0; lid boss from 6.3; tabs from 3.6; barb from 4.4; keeper rib from 4.4; strip 3.9 to 7.5 (top level with the wheel top); tilt rail to 4.3. Body 11.3 thick (computed, `lid1 - floor0`), matching the README.

Fixed radii (lines 617 to 624): post 2.0, wheel bore `2.0 + bore`, spacer 4.5, counterbore 4.5, lid boss 4.1 with inner `post + bore + 0.1`, star peg 1.25 in a hole `1.25 + bore`, star hub 3.0 in a cup `3.0 + cup` to 4.7, lock arc radius `rl + lock` = 14.55, thrust ring `Rs - 3.6` to `Rs - 2.4`, lock ring inner 5.5, tilt rail from `rl + 1.5` = 15.5 to `railIn + 1.0` = 16.5 (computed).

### 5.2 External Geneva, 3 slot, closed form (`K.layout` lines 588 to 599; `K.geneva`, `K.sim` lines 674 to 685)

What it does: one pin on the wheel underside turns the star 120 deg once per round of beads, and a lock ring holds the star between drives.

Equations (declared, lines 592 to 599; values computed at defaults):

| quantity | equation | default |
|---|---|---|
| slots n | `rounds.R` | 3 |
| pin radius on the wheel rp | `d sin(pi/n)` | 21.6506 |
| star radius Rs | `d cos(pi/n)` | 12.5000 |
| slot length | `rp + Rs - d` | 9.1506 |
| drive arc alpha | `180 - 360/n` | 60 deg |
| pin radius | `pinR` 1.3, or 0.875 for the 1.75 filament stub | 1.3 |
| slot width | `2 (pinR + clr)` | 3.4 |
| bead pitch delta | `360/N` | 10.909 deg |
| carry | `alpha/delta` | 5.5 beads |
| pin angle at rest betaP | `sigma - dir alpha/2`, wrapped | 160 deg |
| star rest angle rho0 | `sigma + 180 - 180/n` | 310 deg |

`K.geneva(G, phi) = atan2(rp sin phi, d - rp cos phi)` in degrees. `K.sim(D, G, omega)`: `m = betaP + omega - sigma`, `i = round(m/360)`, `phi = m - 360 i`; inside `|phi| <= alpha/2` theta is the closed form, outside it is `sign(phi) 180/n`; star angle `rho = rho0 - i 360/n - theta`; bead index `round(-omega / (delta dir))`, count `idx mod N + startAt`, round `floor(idx/N) mod R + 1`.

Computed over the default round: driving from bead 29 (phi 24.5) through bead 33 and ends exactly at bead 1 of the next round (phi -30), star angle 370.5, 377.8, 413.0, 470.8, 487.3, 490 deg; the README's "28 to 33, finishing exactly as bead 1 appears" (stated) matches (the pin enters the slot mouth between 28 and 29). The dwell fraction is `(n+2)/(2n)` and the index fraction `(n-2)/(2n)`; the seed's `dwell_fraction (n-2)/(2n)` is the index fraction (CANONS.md line 498).

Construction:
1. Star outline (`starDraw`, lines 690 to 702): a disc of `Rs`; for each k a slot stroked from the round end at radius `d - rp` out to `Rs + 3` at angle `180/n + k 360/n` with width `slotW + 2 extra`; a concave lock arc cut as a circle of `lockR + extra` centred at distance d at angle `k 360/n`. `starShape` rasterises and traces it (`minArea 0.2`).
2. Star body (lines 1053 to 1058): peg `starPegR` 1.25 from -0.7 to 0, hub r 3.0 from 0 to 1.0, the star from 1.0 to `star1 - inlay`, and a top skin traced from the star widened by `foot` (elephant foot relief) with the round labels cut out of it and inlaid in the `pip` material.
3. Pin (lines 1038 to 1040): printed pin r 1.3 from `under0` to `flare0`, then a flared root r `pinR + 0.3` to the wheel underside; or a hole `pinR + 0.05` for a filament stub.
4. Lock ring with a swept complement cut (lines 1041 to 1051): a ring from r 5.5 to `rl` 14 on the wheel underside, then for phi from `-(alpha/2 + 4)` to `+(alpha/2 + 4)` in 1 deg steps the star outline is posed by `K.sim`, transformed into the wheel frame and cut as a fill plus a stroke of `2 lock + 0.1`. The lock ring is the complement of the star's motion through the drive window, made in 2D raster.
5. Star location: hub in a cup on the floor (ring `cupOut` to `cupIn + foot` for the first `footZ`, then to `cupIn`), peg into the floor hole, a thrust ring under the star lobes level with the hub top "stops the star rocking" (line 1016), and a lid keeper rib over the far half (lines 664 to 667, 1029): arcs `sigma +- 62` deg about S minus 24 deg either side of the rounds window, kept when at least 18 deg long, radii `Rs - 4.0` to `Rs - 1.5`, with the wheel cleared by `Rc + 0.5`. At defaults one arc 128 to 226 deg (computed).
6. Pin orbit through the wall (lines 655 to 662, 1006 to 1008): `pinSweep = rp + pinR + 0.3 + 0.35` = 23.60; the wall is opened by a circle of that radius about O from `pinCut0` to the notch, half angle `acos(((R - wall)^2 + ox^2 - pinSweep^2) / (2 (R - wall) ox))` = 28.78 deg; a shield arc of 1.2 mm stands inside the orbit at `rp - pinR - 0.5` = 19.85 over `min(80, open + 14)` deg; the pin pokes `O.x + pinSweep - 0.35 - R` = 0.25 mm past the outline (computed), under the 2 mm rim overhang.

Fits: lock ring in star arcs 0.55 nominal; pin in slot `clr` 0.40; hub in cup 0.40; star to wheel axial 0.5.

Failure lessons: the first print at clr 0.15 (`F/history/knurl-first-print-jam-preset.json`) bound the star and snapped the pin (README, stated); the full round node sweep found the pin orbit passing through the wall before a print would have, fixed by the opening and shield (README, stated). The node scripts are not in any file found.

### 5.3 Count wheel with flutes as detent teeth (lines 1031 to 1037)

Disc r `Rc` 25 with N 33 flutes, each a circle of `fluteR` 1.7 centred at `Rc + fluteR - fluteDepth` = 25.5 at `k 360/N`. Slabs: wheel0 to `cbore0` with the post bore `postR + bore` = 2.35 (and the filament pin hole); `cbore0` to `wheel1 - inlay` with the counterbore r 4.5; the top skin (`wheel1 - inlay` to `wheel1`) with flutes and counterbore widened by `foot` 0.25 and the numerals cut out and inlaid in `num`. Numerals: `numeralArt` (lines 951 to 958) places digit k at radius `(numIn + numOut)/2` = 20.05 and angle `180 + (k - 1) delta dir`, rotated to read radially. Flute overlap check: `2 pi Rc / N > 2 fluteR + 0.6`.

### 5.4 Detent strip, a separate cantilever (`K.layout` lines 638 to 649; slabs 991 to 1020; `K.pawlDeflection` 1101 to 1110)

What it does: a flat strip in a slot in a floor block bends sideways as each flute land passes and springs into the next flute: one click per bead, symmetric so the wheel rolls both ways.

Geometry:
1. Bump radius `bumpR = fluteR - 0.2` = 1.5 so it rolls rather than catches.
2. Beam inner line at the tip `pawlLine = Rc - fluteDepth + clr + bumpR` = 25.7.
3. Tip angle snapped to a flute: `round(tip/delta) delta` = 261.82 deg.
4. Strip frame (b, sd): b outward from the strip's wheel-facing line, sd along the strip from the bump. Strip from sd -3 to `len + engage - 0.2` = 26.8, thickness 1.6, a round end r `th/2`, and the bump circle at the tip. Block from sd `len` to `len + engage + 2` = 29, widened 2.1 each side. Slot `-fit/2` to `th + fit/2`, from `len - 0.5` to `len + engage`. Strip z `wheel1 - height` to `wheel1` (3.9 to 7.5): it floats above the floor so the free length is a true cantilever.

Equations (line 648 to 649; PETG E 2000 MPa declared in the code comment):

| quantity | equation | default (computed) |
|---|---|---|
| stiffness k | `3 E (h t^3 / 12) / L^3` with h `height` 3.6, t `thick` 1.6, L `len` 20 | 0.9216 N/mm |
| lift | `fluteDepth - clr` | 0.80 mm |
| click | `k lift` | 0.73728 N |
| strain | `3 lift t / (2 L^2)` | 0.48 percent |
| at clr 0.15 (jam preset) | same | 0.968 N, 0.63 percent |

`clr` is both the pin in slot fit and the pawl standoff, so opening the Geneva fit softens the click (`fab-knowledge:sources/benches/benches-mechanisms.md` line 882).

`K.pawlDeflection(D, G, omega)`: the bump rides flute arcs of radius `fr` centred at `rf = Rc + fr - fluteDepth`, the rim corner at angle `psi = acos((Rc^2 + rf^2 - fr^2)/(2 Rc rf))` (law of cosines), and the land at `Rc + rb`; returns the radial lift above the beam inner line. Computed lift over one bead (0 to 10 deg of wheel): 0, 0.21, 0.60, 0.77, 0.80, 0.80, 0.80, 0.80, 0.76, 0.57, 0.15 mm. The stage rotates the strip about its anchor by `lift / (dx n_y - dy n_x)` (line 1427).

Fits and print: strip in block slot 0.25 per side nominal, 0.00 as printed (a light press, intended). Prints standing on its long edge so bending is in the layer plane; thickness a whole number of 0.4 lines (README). Print 1.2, 1.6 and 2.0 to choose the click, about 0.4 to 1.8 N (README, stated).

Failure lesson: an integral beam printed on the floor is fused along its length and about ten times too stiff (README, stated); canon rule `mech/detent-strip-separate` (CANONS.md line 537).

Checks: strain under 2 percent (error), click between 0.4 and 3 N (warnings), block clear of wall, star sweep, keeper rib and tabs.

### 5.5 Lid with barbed snap tabs, windows and keeper (lines 650 to 654, 1022 to 1029)

Five tabs at 60, 120, 180, 215 and 290 deg, kept only where more than `notchHalf + 10` deg from the thumbwheel notch (notchHalf 41.87 deg computed); each tab 8 mm wide (`tabHalf = 4.0 / Rin` rad), 1.0 thick, inside `Rin = R - wall - 0.15` (the tabs flex, so they get their own 0.15 gap); a barb in two slabs, 0.3 at 40 percent of the barb then 0.5 at the full 0.5 barb, into a wall groove 0.5 deep and 1.2 tall. The wall groove slab is the wall thinned by 0.5 (line 1010). Barbs 0.45 mm one layer overhangs, groove ceiling 0.5 (README, stated). The lid boss caps the post (ring 4.1 to `post + bore + 0.1`).

Windows (`windowPaths`, lines 711 to 741): the count window centre at `O - numR` on the -x axis, width the widest numeral plus 2 `padW`, height `digitH + 2 padH`, shape cartouche (default), vesica, arch or rect. Rounds window at `S + numR (cos psi, sin psi)` over the star's lock arc nearest `180 - lobe 30` deg, shape arch (default), circle, star8 or rect; pips mode puts one window per round along psi. Checks: window taller than pitch shows a neighbour (warning); rounds window over the count wheel (error).

### 5.6 Raster in XY, exact in Z (core lines 178 to 354; `buildParts` 975 to 1060; `buildMeshes` 1063 to 1095)

The way every KNURL body is made, and the reason any font, pattern or dropped image becomes a printable multicolour solid without a CAD kernel.

1. `K.mkCanvas(W, H, ppm)`: a canvas `ceil(W ppm) + 4` px with `setTransform(ppm, 0, 0, -ppm, w/2, h/2)`: millimetres, y up, origin at the centre, round joins and caps.
2. Regions are composed with canvas booleans: fill, `destination-out` cut, stroke and cut stroke, inset fill (fill then cut a 2w stroke).
3. Each part is a list of slabs `{mat, z0, z1, W, draw}`; 9 bodies at defaults (tray body and accent, lid body and accent, wheel body and num, star body and pip, pawl body).
4. `K.trace(cv, {tol, minArea})`: alpha to a float field; marching squares at iso 0.5 with linear edge interpolation; saddle cases 5 and 10 split by the cell mean; an edge graph walked into loops; pixels to mm; Douglas-Peucker on each closed ring split at the two farthest indices (tolerance `print.tol` 0.03 mm); loops under `minArea = 0.35 pi (minFeat/2)^2` dropped; nesting depth by point in polygon against larger loops; even depth outers, odd depth holes given to the smallest containing outer; outers CCW, holes CW.
5. `K.buildMeshes`: rasterise every slab at `ppm` 12; where slab U sits on slab L of the same material, extend the one whose footprint lies inside the other (12 stray pixels allowed) by `EPS = 0.01` mm into its neighbour so shells overlap instead of sharing a face; extrude with `THREE.ExtrudeGeometry` per shape with holes; merge per material.
6. Flush inlays are one alpha field traced twice: the body skin with the art cut out, and the art (lines 1002 to 1003, 1023 to 1024, 1036 to 1037, 1057 to 1058). Every part prints show face down, so inlays are the first 0.6 mm (three 0.2 layers).

Text: size is cap height measured from "0" (`capRatio`), `boost` strokes the glyph for weight, `mirror` flips for bed-side faces. Arc text (`placeText`, lines 891 to 916) is rendered straight into a strip canvas and then warped pixel by pixel onto the arc with bilinear sampling, so Arabic shaping and ligatures survive; `flipAll` mirrors a back face, `glyphMirror` mirrors glyphs for a left-hand build.

Limits: raster bodies differ in antialiasing between browsers, so a port compares z extents exactly and volume within a recorded tolerance (M10 risk table, `docs/plan/milestones/M10-chase.md` line 1354).

### 5.7 Elephant foot relief (lines 981, 1014 to 1015, 1032 to 1036, 1057 to 1058)

The first `footZ` 0.5 mm on the bed spreads about 0.25 (model, stated). Where a bed-side skin mates with a moving part, the model opens it by `foot` 0.25: the star top skin uses the star traced with slots and arcs widened by 0.25; the wheel top skin has flutes and counterbore opened by 0.25; the cup's first 0.5 mm is opened by 0.25. "So foot spread lands in air instead of on a mating part" (README).

### 5.8 As-printed fit model and fit table (`K.checks` lines 1206 to 1221)

Convex walls grow about 0.1, concave walls shrink about 0.15 (declared constants `conv`, `conc`). Every fit reports nominal minus 0.25. Computed at defaults:

| fit | nominal | as printed | gate |
|---|---|---|---|
| lock ring in star arcs | 0.55 | 0.30 | error under 0.08 |
| pin in slot | 0.40 | 0.15 | same |
| hub in cup | 0.40 | 0.15 | same |
| wheel on post | 0.35 | 0.10 | same |
| lid boss in counterbore | 0.40 | 0.15 | same |
| rim in wall notch | 0.60 | 0.35 | same |
| peg in floor hole | 0.35 | 0.10 | same |
| strip in block slot, per side | 0.25 | 0.00 | warning under -0.15 (light press intended) |

README measured on the meshes over a cycle: lock ring never closer than 0.52 to the star; sampled minimum gaps star to wheel 0.27, star to lid 0.40 (stated, node scripts not on disk). First print advice: if anything binds raise that fit by 0.1 and keep the as printed line above 0.1; do not go back to 0.15.

### 5.9 Checks (`K.checks`, lines 1164 to 1225)

About 40 rules, each a sentence with the measured value and the remedy, errors pink and warnings amber: pin and flare reach versus solid wheel radius; lock ring versus wall; tilt rail versus pin orbit; star tip versus wall; star core above 1.2 mm; lock disc radius inside `d (1 - cos(pi/n)) + 0.5` to `rp - pinR - lock - 0.4` and above `lockIn + 2`; numeral pitch minus digit height at least 0.5; numeral band versus flutes and counterbore; widest numeral fits the band; count window versus pitch (warning); rounds window and pips versus wheel; round label and pips on the lobe; first pip versus slot bottoms; at least 1.0 mm under the lid inlay; wheel at least 1.8 under its inlay; thrust ring versus lock ring; shield versus rail; pin proud under 0.6 (warning); tabs versus pin opening; keeper room (warning); at least 3 tabs (warning); tab versus pawl block; block versus keeper, wall and star; strip versus star; strain under 2 percent; click 0.4 to 3 N (warnings); flute overlap; the fit table; face text cap at least 3.2 (warning); digits at least 2.6 (warning). At defaults none fail (computed).

### 5.10 Art generators (lines 751 to 970)

Patterns drawn in the face frame then clipped to the field: khatam (8 point stars, inner ratio 0.7654, pitch 2 scale), hexagram lattice, octagon 4.8.8, jali hexafoil circles, interlaced square lattice, n-fold rosette (chords at `round(0.42 n)` and `round(0.25 n)`). Medallions for the round back: ajrak (kakar zigzag border, riyal dot band, jaal of sitara stars in challo rings with four-petal phul), wazir (ten fold {10/3} star with petals, decagon, kite band, small stars), chaukhandi (sun ray rim, 16 pointed petals, eight petal flower). Keffiyeh (lines 821 to 859) uses `K.KEF` knot and chevron outlines traced from the public domain frieze vector, every distance in units of the thick stripe T: thin 0.32 T, gaps 0.34 T, chevrons 3.37 T tall on a 1.66 T pitch, rows 3.66 T apart, hem 0.32 T; the net is dashed and coarser than cloth so it prints at 0.4. Windows get a frame of `window.frame` and a clear margin; text gets a band cut from the pattern (`textBand`). Dropped PNG, JPG or SVG: luma `0.3 R + 0.59 G + 0.11 B` over alpha against a threshold (default 128, invert option), fitted to a 100 mm canvas, then size, x, y, rotation (lines 1367 to 1381).

### 5.11 Plate, STL and 3MF (lines 425 to 548, 1113 to 1161, 1533 to 1546)

Print placement: tray floor down; lid, wheel and star flipped 180 about X (show face down); strip rotated about Z so it lies along X and stands on its long edge. Plate objects are offset by (110, 100).

3MF: BambuStudio/Orca dialect with the production extension, one mesh object per volume plus a components object per part, vertices deduplicated at 3 decimals, degenerate triangles dropped; `model_settings.config` carries name and extruder per object and per part; `project_settings.config` declares one filament per slot with every per-filament key written once per slot: "the loader sizes the filament list from filament_colour and indexes the other vectors without length checks, so a short vector poisons the whole config" (lines 1125 to 1127). Material table PLA, PETG, ABS, ASA, TPU (nozzle, first layer, range, bed, density, cost, fan, max volumetric speed, flow; lines 1128 to 1134). Printer preset "Flashforge Creator 5 Pro 0.4 nozzle", filament pattern "Generic {TYPE} @FF C5P". After every save the page writes "Open it as a project (File, Open), not Import" (line 1541).

STL zip: each part and material as its own binary STL in print orientation plus a README. Design JSON: images nulled; load deep merges onto defaults. PNG of the face preview.

Print settings (README, stated): Creator 5 Pro, 0.4 nozzle, 0.2 layers, PETG, 3 walls, 20 percent infill, star and wheel outer walls at 30 to 40 mm/s, no supports.

### 5.12 Further constructions found on the checker pass (2026-10-05)

Read from the code; the first pass of this record left them out.

1. Wheel support (lines 623 to 624, 1012 to 1013, 1017, 1025). The count wheel sits on a spacer boss r 4.5 (`spacerR`) from the floor to `wheel0` 4.5 and turns on a post r 2.0 from there to `post1` 7.7; the lid boss ring (r 4.1 outside, 2.45 inside) comes down from z 6.3 and caps the post, so the wheel is trapped between spacer and boss. A tilt rail, an annular sector about O from r 15.5 to 16.5 rising to `rail1` 4.3, holds the wheel level under the lock ring. The rail is left open on the star side by `railEx = acos(((railIn + 0.5)^2 + d^2 - (Rs + 1)^2) / (2 (railIn + 0.5) d)) + 3` either side of sigma, 32.1 deg at defaults (computed), so the star lobes pass. Checks: rail outer plus 0.3 inside the pin's inner orbit `rp - pinR` 20.35 (computed); shield inner face `shieldR - 1.2` 18.65 at least 0.4 outside the rail (computed).
2. Lanyard loop (lines 669, 982 to 984). A circle r `loopR` 4.2 centred at (0, R + 0.35 loopR) = (0, 36.47) (computed) joins the outline of every floor, wall and lid slab; a `loopHole` 2.6 hole is cut through every slab and through the face and back art.
3. Left-hand build (`hand: 'left'`, line 688). Every mesh is mirrored in X at placement (`mirrorX` in `platePlacement`, and in the stage at lines 1406 to 1407); glyphs are pre-mirrored on the canvas (`glyphMirror` in `faceArt`, `mirror` in `numeralArt` and `labelArt`) so text still reads; the face preview mirrors the finished canvas (line 1463).
4. Counting options (lines 560, 1256). `count.dir` sets which way the rim rolls to count up and flips both the numeral order and the bead index; `count.startAt` is 1 or 0; numerals are western or eastern Arabic-Indic (`K.digits` maps each digit through `٠١٢٣٤٥٦٧٨٩`). The rounds slot count n is free: `K.layout` derives rp, Rs, alpha and carry from it.
5. Pips mode (lines 636 to 637, 959 to 970). `rounds.mode 'pips'` replaces the round numeral with R small windows along psi at `pipRad + j pipStep` (4.6 plus 2.7 steps) of radius `pipR` 1.1, drawn as circle, arch or 8-point star; the star top carries, for round r, one inlaid bar from the first pip out past pip r, so round r lights r windows. Two checks keep the bars on the lobe and clear of the slot bottoms.
6. Presets (lines 1304 to 1314). classic 33; 99 names (N 99, wheel Rc 28, body R 38, centre distance 28, lock disc 16, digit 2.6); eastern digits (Amiri, digit 3.1); pips (lock disc 13, step 2.4, pip r 1.0); left hand; black white pink; keffiyeh corner; keffiyeh sketch; keffiyeh. Each starts from `K.defaults()` and carries over any dropped images.
7. Keffiyeh sketch (lines 860 to 878), kept beside the traced keffiyeh: a solid diagonal net with diamond knots clipped to a band of half height 0.42 F, thin, thick and thin lines at 0.475, 0.545 and 0.615 F, olive leaves alternating on a stem at 0.735 F and a hem at 0.89 F, where F is the field radius.
8. Dropped image pipeline (lines 1367 to 1381). The file is drawn on a white canvas at most 900 px on its long side; each pixel is thresholded on `luma x alpha/255 + (255 - alpha)`, so transparent pixels read as white; the slider runs 20 to 235 (default 128) with an invert box; the inlay is fitted to 100 mm and placed with size 5 to 70 mm, x and y within 34 mm, and rotation.
9. Two arc text routines. `K.arcText` (lines 250 to 266) sets glyphs one by one along the arc and nothing calls it (dead code, found by grep); `K.placeText` (section 5.6) is the one in use; its comment (lines 888 to 890) says the strip is warped in pixel space so Arabic shaping survives, which per-glyph placement cannot do.
10. Node hook. `K.canvasFactory` (line 173) is the core's only DOM dependency, which is what lets the same `window.KNURL` functions run under node-canvas.

---

## 6. UX anatomy

- Header: ink bar with 3 px pink rule, "KNURL" in Permanent Marker pink tilted -1.5 deg, subtitle in VT323, status pill (loading, fonts, rebuilding, building, "N tris, M ms", art error, build error), "hack.build" in slime.
- Left rail: `details` sections built from `SCHEMA`: body (with the nine preset buttons on top), counter, rounds, detent (with a hint), windows, face art, face text, back art, back text, colours and slots (four colour swatches plus extruder slot numbers), print (two hints, fits, raster, slicer names). Each numeric row is label with unit, range slider and number box.
- Stage tabs: assembled, exploded, lid off, print plate; edges checkbox; fit.
- Stage: three with damped OrbitControls on an edge grid background; hemisphere plus two directional lights.
- Readout bar (the drive): count and round in 44 px VT323 slime, star angle with "drv" while the Geneva is engaged, pawl lift, click (or Space), run (one bead every 260 ms), reset, scrub over N x R beads; each click eases over 160 ms.
- Right side: live face preview 600 x 600 with face, back, wheel and star tabs. The face view draws the wheel and star under the lid and clips them to the windows, so it shows what the windows reveal at the current count. PNG button, legend, readouts (body, wheel, numeral pitch, Geneva, fits, carry, pawl strip, click, tabs, parts, raster, triangles), checks list with the as-printed fit line, export buttons and the export note.
- Rebuild: art and checks 60 ms after an edit, meshes 500 ms after the last edit; a sequence counter drops stale builds. Fonts: a race of four `document.fonts.load` calls against 2.5 s, rebuild on `loadingdone`.
- Mobile: under 900 px one column, rail capped at 45 vh.

What makes it excellent: the whole mechanism is visible and drivable bead by bead; the window-reveal preview shows the user exactly what they will read; every number the user touches is checked in words with the remedy; the fits are reported as printed, not as modelled; the export opens in the slicer with the right colours. Every 3D body is a real printed part rendered from the same slabs that are exported.

---

## 7. Tests and harness

No tests ship. The README claims a node sweep with manifold booleans over a full round at quarter-bead steps (all pairs zero except the strip bump over the rim mid click; nine watertight bodies) and the scripts are not in any file found (stated). This folder's drive (`drive/shoot.cjs`, `drive/shots.json`, `drive/layout.cjs`) loads the bench, waits for the pill, drives views, scrub and a preset, and evaluates `K.layout`, `K.sim`, `K.pawlDeflection` and `K.checks` at defaults: zero page and console errors (measured 2026-10-05). Checker pass 2026-10-05: 34 claims in this record re-read against `F/knurl.html` (layout constants, z stack, Geneva closed form and the computed drive window, detent beam equations, tab filter and notch half angle, pin opening and shield, keeper arcs, slab order in `buildParts`, EPS overlap rule, tracer steps, fit table, 3MF and STL writers, presets, run and click timings, rebuild debounce, font race); all matched except the tilt rail wording, now stated as radii. Section 5.12 was added from the same read. All six shots were opened and show what their captions say.

The plan reproduces the Geneva and detent at M06-T04 (`packages/mechanisms/test/legacy/knurl.json`, goldens k 0.9216 N/mm, lift 0.8, click 0.73728 N) and renders KNURL from a chase at M10-T08 with a sweep test.

---

## 8. How to make a new thing this way

1. Put the mechanism in closed form first (Geneva `atan2(rp sin phi, d - rp cos phi)` inside the drive window) and drive the whole bench from one `sim(omega)`.
2. Make every body as z slabs of 2D regions drawn with canvas booleans in millimetres, traced and extruded; overlap stacked shells by 0.01 inside their own part.
3. Make inlays flush by tracing one alpha field twice, and print every show face down so the inlay is the first three layers.
4. Cut a rotating member's clearance as the complement of its motion: sweep the partner's outline through the drive window and cut it.
5. Make springs separate parts that bend in the layer plane; compute click and strain from the beam and the flute profile; ship two or three thicknesses.
6. Report every fit as printed (convex +0.1, concave -0.15, foot +0.25 over the first 0.5) and relieve the bed-side skin where it meets a moving part.
7. Write checks as sentences with the measured value and the remedy; show what the user will see through the windows at the current state.
8. Write the 3MF with every per-filament vector full length and tell the user to open it as a project.

---

## 9. Known defects found while driving

- Presets do not recolour the 3D view: `PRESETS` handlers replace `D.colors` and call `buildRail` and `rebuild`, but the cached `MeshStandardMaterial`s in `mats` (line 1394) are only updated by `recolor()`, which the preset handler (line 1324) does not call. The keffiyeh preset shows cream and black in the face preview and green and gold in 3D (measured, `shots/k05`). Exports take colours from `D`, so the 3MF is right.
- The stage is dead offline: three loads from jsdelivr; fonts fall back and art still builds (README, stated).
- No undo, no hook beyond `window.KNURL`, no persistence of the design between sessions except JSON save and load.

---

## 10. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| 3 slot external Geneva, closed form, lock ring | mechanisms | pin_in_slot, bore, pocket | geneva-external (line 396; dwell correction line 498) | mechanisms/geneva-3 (planned M06-T06; not yet in `reference/`) | M06-T04, M10-T08 | MISSING |
| separate detent strip on a fluted count wheel | mechanisms | detent | count-wheel-detent (line 404; force correction lines 496 to 497); rule mech/detent-strip-separate (line 537) | mechanisms/detent-strip (planned M06-T06) | M06-T04 | MISSING |
| swept complement cut (lock ring cut by the star's motion) | mesh | sweepcut (backlog D-060) | MISSING (named as a gap, line 472) | MISSING | none | MISSING |
| elephant foot relief on bed-side skins | mesh, profile | relief (admitted with KNURL at M10, M10-chase.md line 67) | MISSING | MISSING | M10-T08 | MISSING |
| as-printed fit model (convex 0.1, concave 0.15, foot 0.25 over 0.5) | profile | none | MISSING | MISSING | M10-T08 (fits as metrics with gates) | MISSING |
| barbed snap tabs into a wall groove | geom | snap | MISSING (snap family holds five other members, lines 431 to 437) | MISSING | M10 | MISSING |
| pin orbit wall opening plus shield arc | geom | window | MISSING | MISSING | none | MISSING |
| raster in XY, exact in Z with EPS overlap | mesh | raster route | n/a (route) | MISSING | M10-T08 | MISSING (the three lineage rows hold only rastermesh seeds) |
| flush inlay, one alpha field traced twice | inlay | inlay | n/a | MISSING | M03, M10-T08 | MISSING |
| arc text warped in pixel space | inlay | text | n/a | MISSING | M10-T08 | MISSING |
| pattern generators and traced keffiyeh | inlay | art | n/a | MISSING | M10-T08 | MISSING |
| Orca 3MF with full-length filament vectors | 3mf | export | n/a | MISSING | M10-T08 (owner round trips at M00, M00-foundation.md line 1051) | MISSING |
| window-reveal preview and sequence drive | ui-core | view, drive (sequence) | n/a | MISSING | M10-T08 (`slots/KnurlSequence.vue`) | MISSING |
| `SCHEMA` and `PRESETS` as a chase param schema | chase | none | n/a | MISSING | M10-T08 (`tools/legacy/knurl/dump-presets.cjs`) | MISSING |

`lineage.json` holds three rows (healer rastermesh copies and the TOGGLE `part2e.js` canonical), none for KNURL (checked 2026-10-05).
