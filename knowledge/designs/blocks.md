# BLOCKS (blocks.hack.build): how it is made

Record id: originals/blocks. Written 2026-10-05 from the original code of the canonical file, read in full (vendor libraries skipped: three r128, JSZip 3.10.1, earcut 2.2.4, polygon-clipping 0.15.7). Family: blocks (BLOCKS and its parent BOSS, `fab-knowledge:originals/boss/RECORD.md`).

Qualifiers used on every number: `measured` (a run of the shipped file in a browser, with date), `computed` (a node rerun of the shipped generator code on 2026-10-05, scripts in a session scratch folder, or arithmetic on the code's own constants), `vendor`, `inferred`, `unknown`, or a source file and line where the number is a constant in the code.

---

## 1. Identity and revision

| File | Modified | Bytes | sha256 | Status |
|---|---|---|---|---|
| `~/Downloads/boss.html` | 2026-09-14 00:46 | 1131340 | `00badce59c6638dbfd6c920bed481d93a683c605330780fb197686cda4e413f5` | BOSS v1, the parent; own record `fab-knowledge:originals/boss/RECORD.md` |
| `~/Downloads/blocks.html` | 2026-09-14 16:20 | 1196039 | `74924aa8a85d55a9c03498a64b1cf7b71e9ebab56d628ade01f6e8707419fdb6` | first BLOCKS build; kept here as `files/blocks-prev-0914-1620.html` for diffing |
| `~/Downloads/blocks (1).html` | 2026-09-14 16:59 | 1201487 | `96bf187a3c56fcc04cca7491c4a2ff22c1d4ed1e87954c7694d953c04faf8b6c` | CANONICAL, copied to `files/blocks.html` |
| `~/Downloads/blocks (2).html`, `blocks (3).html` | 2026-09-14 17:37, 2026-09-15 00:20 | 1201487 | same as `(1)` | downloaded again |
| `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/blocks/legacy/blocks.html` | 2026-09-15 15:11 | 1201487 | same as `(1)` | the handoff keeps this build |
| `fab-knowledge:evidence/gold/blocks/blocks.html` | | 1201487 | same as `(1)` | gold copy that was driven |

Why `blocks (1).html`: it is the newest build (every later download is byte identical) and it is good. Against the 16:20 build it only adds robustness in the kernel and builders (polygon clipping retry with a 0.4 micron jitter, `kernel.js:108-120`; a strip seam rule that a seam may not pass through a hole, `blocks.js:110-141`; pads stop at `STD.flangeTop`, `blocks.js:203-206`; terminals from perimeter cells, `parts.js:96-114`; per row lead lanes on the flat TOUCH strip, `parts.js:786-825`). The UI scripts are unchanged between the two builds (`fab-knowledge:sources/downloads/dl-baffle-inlay-coin.md` section 4). It was driven end to end with zero console errors (measured, gold drive 2026-10-05, `fab-knowledge:sources/gold/blocks.md` section 2.3). No newer BLOCKS or BOSS file exists in `fab-work-directory`, `evidence/x` or `Downloads` (searched by name and by the strings `blocks.hack.build` and `BOSS.bench`).

The owner names BLOCKS as one of the best benches. It is the reference `composer` in the plan (UI.md section 8).

## 2. What it makes and for whom

A LEGO compatible electronics system printed in four filaments on a four head FDM machine (Flashforge Creator 5 Pro, 0.4 nozzle), and the single file bench that generates every part, checks it, lets a person snap parts on an 8 mm stud grid, wires them with printed wires whose length is the length that prints, solves the DC circuit, and exports the part or the whole scene as one plate. Tagline in the header: "stud and socket electronics you print".

For a maker with a multi material printer, conductive PLA and conductive TPU, who wants ESP32-C3 SuperMini, Raspberry Pi Pico or Teensy 4.0 pins on studs, and printed buttons, knobs, sliders, touch pads, force sensors, lamps and resistors that plug onto them. The bench owns the claim that printed conductors are kilohm class and shows the person what that costs on their own spools.

Filament slots (`blocks.js:54-59`): 1 PETG cream `#f5f0e6` structure; 2 conductive PLA `#1a1a1a`, rho 30 ohm cm (the MATERIALS note, `app3.js:24`, and the print card, `export.js:83`, name it "Protopasta class, about 30 ohm cm along the print"; not measured on a print); 3 TPU 95A `#FE0386` flex; 4 conductive TPU `#4a4a4a`, rho 1500 ohm cm ("Eel class", same two places; not measured).

## 3. Files in this folder

`fab-knowledge:originals/blocks/`, sha256 of every file in `SHA256SUMS`.

| Path | What |
|---|---|
| `files/blocks.html` | the canonical bench, one file, runs from `file://` |
| `files/blocks-prev-0914-1620.html` | the build 39 minutes older, for diffing |
| `files/src-extracted/*.js`, `shell.html` | each app `<script>` block of `blocks.html` written to its own file (byte for byte, split by this record; `shell.html` has the scripts and base64 fonts blanked). BLOCKS shipped no source zip; BOSS did (`originals/boss/files/boss-src.zip`) |
| `files/exports/blocks-seat-raspberry-pi-pico-snap.3mf` | Pico snap seat 3MF from the UI button (measured, gold drive 2026-10-05): 1,476,481 bytes, 4 filaments, 2 objects, 6 parts |
| `files/exports/blocks-seat-raspberry-pi-pico-snap-print-card.txt`, `-design.json` | its print card and design json |
| `files/exports/blocks-scene.card.txt`, `blocks-scene.json` | the worked scene THE FULL MONTY print card (per slot grams PETG 216.1, cPLA 43.0, TPU 21.5, cTPU 22.6, measured) and design json |

Line references below are to `files/src-extracted/<name>.js`. The same code sits in `files/blocks.html` at html line = extracted line + offset:

| Script | Offset | Script | Offset |
|---|---|---|---|
| orca3mf.js | 302 | sim.js | 2766 |
| kernel.js | 602 | scenes.js | 2929 |
| blocks.js | 1015 | app1.js | 3158 |
| parts.js | 1408 | app2.js | 3396 |
| export.js | 2643 | app3.js | 3845 |

Architecture (plain scripts, one global each, run in node and browser): `K` kernel (polygons, triangulation, prism and revolve mesher, audits, net check); `BLOCKS` standard, slots, Body builder, bore, clutch, column, pin socket, router; `PARTS` boards and the 11 part generators; `SIM` scene and solver; `SCENES` worked scenes; `EXPORT` plate, 3MF, STL zip, card, json; `BENCH_PART`, `BENCH_SCENE`, `BENCH_PRINT`, `BENCH` the four step app.

## 4. Shots

`fab-knowledge:originals/blocks/shots/`, copied from the gold drive (`fab-knowledge:evidence/gold/blocks/shots/`, 1280 x 860, headless Chrome, 2026-10-05). Each was opened and looked at.

| Shot | Shows |
|---|---|
| `blocks-d-03-cam-xray-on.png` | C3 SuperMini press seat with x ray on: PETG at 0.18 opacity, so the cPLA posts, flanges, pin pads and both buried trace layers read in 3D |
| `blocks-d-06-seat-pico-snap.png` | Pico snap seat, 7 x 11 studs, with the lid set beside the body in its closed orientation, hooks hanging down (the PART view ignores print poses, see 6), pink TPU hooks, PETG knuckle, rails and contact bump rows on the deck |
| `blocks-d-30-hook-button-4-4-matrix.png` | BUTTON 4 x 4 in row/column matrix wiring: 16 pink in place TPU cones with grey cTPU caps, one side tab terminal visible |
| `blocks-d-30-hook-knob-detent-12-3.png` | KNOB selector asked for 12 positions at 3 studs: collector ring, sectors, side tabs, and the fluted knob cap set beside the body the way it sits when assembled, pointer up (the PART view ignores print poses); 12 asked, 7 built (readout note) |
| `blocks-d-51-build-full-monty.png` | BUILD with THE FULL MONTY: 22 x 20 breadboard deck, seat, every brick, 20 printed wires as pink arches, net voltage discs on studs |
| `blocks-d-59-build-wire-too-short.png` | a wire set by hand to 12 mm: red on the stage, SELECTED says "too short to reach: it needs 99.4 mm or more"; BOARD PINS with live readings |
| `blocks-d-65c-build-led-on-pin.png` | a small scene wired by real canvas clicks: two wires from seat to lamp, HUD "wire 66.2 mm printed for a 58.2 mm span, 27.6 kohm", RESULT "0.02 mA (faint)" |
| `blocks-d-71-print-scene-plate.png` | PRINT the whole scene: every part and wire in print pose on the 256 mm bed outline, count list with each wire's printed length |

Over 100 more shots (every cam, every catalog part, phone width) are in the gold folder and listed in `fab-knowledge:sources/gold/blocks.md`.

---

## 5. Mechanisms, circuits and constructions

### 5.1 The standard and the layer snap

What it does: one set of numbers every part obeys, so stacks line up and every z lands on a layer.

Constants (`blocks.js:14-44`): layer `L` 0.2, `snap(z, up)` rounds or ceils to layers (line 15). Pitch `P` 8.0, stud 4.8 x 1.8, `plateH` 3.2, `deckH` 6.4, `brickH` 9.6, `MODULES` plate 3.2, deck 6.4, brick 9.6, tall 12.8 (16, 32, 48, 64 layers, computed). `sockH` 2.2 (1.8 stud plus 0.4 headroom, 11 layers). `flangeH` 0.6. `sockID_flex` 4.6 (0.2 interference on a 4.8 stud). `sockID_rigid` 4.86 (prints about 4.74, inferred in the comment). `sockOD` 6.6 (1.4 of body between rings at 8 mm pitch). `padD` 5.6. `postD` 3.0. `isoT` 0.4. `traceT` 0.6, `gapT` 0.4, `traceW` 1.0, `clr` 0.6, `cell` 0.4. `sheetT` 1.6, `capH` 3.2. `clutch` flex. Derived and rounded to the micron (lines 40-44): `flangeTop` 2.8, `L1` 3.2, `L2` 4.2, `padTop` 4.8.

z stack of a conductive column: socket ring 0 to 2.2, flange 2.2 to 2.8, iso PETG 2.8 to 3.2, L1 3.2 to 3.8, PETG 3.8 to 4.2, L2 4.2 to 4.8, pads and bore floors at 4.8, body top at the module height, stud 1.8 above.

Fit dialect (`blocks.js:46-52`): `FIT` press 0.10, snug 0.25, free 0.45 added to the shaft; `SHRINK` 0.12 (a printed hole comes out 0.12 under its drawn size, inferred); `LEAD` 0.4 with `LEAD_STEP` 0.2; `MINWALL` PETG 0.6, cPLA 0.5, TPU 0.8 (declared, unused by any check).

Resistance (`blocks.js:62`): `barR(rho, len, area) = rho * 10 * len / area` (ohm cm to ohm mm). At 1.0 x 0.6 cPLA that is 500 ohm per mm (computed).

Limits: the standard differs from BOSS v1 (sockH 2.4, flange 0.72, traces 0.72 with 0.48 PETG, L 0.24); the plan keeps both as presets `boss-v1` and `blocks-html` with no default until a print (D-087, CANONS.md `blocks-stud` row). `STD.clutch` says it is set in MATERIALS; there is no control for it (gold F13). The 3MF and card say 0.20 layers (export.js:95-96) while the PRINT NOTES panel still says 0.24 (shell).

### 5.2 Body: the negative space multi material builder

What it does: builds a multi slot part as PETG = outline minus every feature, per z band, so slots never overlap and the slicer sees clean parts.

Construction (`blocks.js:67-108`, class `Body`):
1. `feature(slot, mpoly, z0, z1, tag)` collects inside features (slot 0 is void); `outside(...)` collects prisms above or beside the outline (studs, rims, rails). Every z is snapped to the micron on the way in (line 70).
2. `build()` first rejects any two non void features of different slots that overlap in z by more than 0.005 and in xy by more than 1e-3 mm2, naming both tags and the area (lines 80-86).
3. Collect z breakpoints; two closer than 0.015 are an error (lines 87-90).
4. Per band, base slot (PETG, or TPU for flat parts) = outline minus the union of every feature alive in the band; every band after the first starts 0.013 below its breakpoint so it overlaps the band beneath (same slot, the slicer unions it) and anything alive in that overlap is cut too (lines 91-100).
5. Non base features become prisms with `shrink` (the 1 um inset of 5.3), so a shared face is never coplanar with the matrix (lines 101-104).
6. `tap(name, x, y, z)` declares net terminals for the net check; `fit(label, value, lo, hi)` records a fit with an ok flag (lines 72-74).

`bandPrism` (`blocks.js:113-141`): a cap with more than about eighty holes defeats earcut hole bridging, so a band with more than 48 rings is cut into `ceil(rings / 20)` strips. Seams are moved to an x that no hole spans (holes widened 0.1, searched in 0.1 steps up to 2 pitches), at least 2 mm from the ends and 2 mm apart; strips overlap 0.02 each side.

Lesson: this is the solid builder the plan's `mesh` package can adopt for printed circuit parts (benches-conductive-b.md New evidence). The strip seam rule exists because seams through a hole left two strips sharing arc vertices (comment lines 118-120).

### 5.3 Kernel: exact prism geometry

What it does: polygon booleans plus earcut caps and walls into audited watertight shells.

Steps and constants (`kernel.js`):
- Polygons are polygon-clipping MultiPolygons; `cleanPoly` makes outers CCW, holes CW, drops rings under 1e-7 mm2 (lines 50-61).
- `cleanRing` (lines 26-48): snap every vertex to 6 decimals ("what the validator sees is what we triangulate"), drop repeats within 5e-6, strip collinear midpoints where |cross| / chord < 2e-5 (earcut skips them and leaves T junctions against caps).
- `circle(cx, cy, r, n = 48, rot = pi/n)`: half step rotation so no vertex sits on an axis line (lines 68-73). `rrect` 8 segments per corner. `ring2` = circle minus circle.
- `stroke(pts, w)` (lines 93-106): union of segment quads plus joint circles of radius `w/2 + 0.03`, so joints cross the quad edges and the union has no pinch vertices.
- `clipRetry` (lines 108-120): on a polygon-clipping throw, retry with all but the first input jittered by 0.0004 k mm, k = 1 to 3.
- `insetRing` with `INSET` 1e-3 (1 um) along the vertex bisector divided by `max(0.3, cos half angle)` (lines 142-156): "above the meshing nudge (2e-4) and the float32 boolean tolerance, 240x under a layer".
- `triangulatePoly` (lines 179-206): earcut on a copy rotated by `0.37 + seed * 0.001` rad so rows of holes never share a support line, per vertex hash jitter up to `1e-6 * seed`; Euler check: n vertices and h holes give `n + 2h - 2` triangles; zero area triangles are counted, never dropped.
- `Mesh._prismPoly` (lines 237-272): up to 14 tries; from try 3 a physical nudge up to 0.2 um per vertex hashed by position; every try audited (each undirected edge used exactly twice, no repeated directed edge, no degenerate triangle).
- `revolve(profile, cx, cy, n = 48)` (lines 274-303): vertices on the axis become poles, half step rotation, winding fixed by signed volume.
- `rotY(zTop, xMid)` is a real 180 degree rotation about y for print poses (hands preserved); `flipZ` is a mirror, safe only for symmetric parts (lines 314-315).
- `auditMerged(tol = 1e-4)` merges vertices the way a slicer does and audits (lines 352-362).

Limits: each failure that produced a rule is in the comments: coplanar faces read as slivers in float32 booleans (inset), collinear midpoints left T junctions (stripper), hole rows sharing a support line broke earcut (rotation, jitter, retries, nudge), tangent joint circles left pinch vertices (+0.03).

### 5.4 The stud column (canon `blocks-stud`)

What it does: one conductive position. A cTPU socket ring underneath, a cPLA flange as contact face and lock, a cPLA post up through the body, a cPLA stud on top: the stud on top and the socket underneath are one net, so columns stack.

Construction (`blocks.js:168-226`):
1. `clutchRing` (lines 169-184): flex mode (default) puts a ring `ring2(OD 6.6, ID 4.6)` in cTPU (conductive) or TPU (plain) from 0 to `sockH`, plus a void core. Rigid mode on a plain column cuts a 4.86 PETG bore with a 0.2 deep lead in of +0.4.
2. `column(body, cx, cy, {peg})` (lines 186-220): peg `both` (socket under, stud over), `down`, `up` (flush pad under, stud over), `pad`. With a socket: flange disc d 6.6 from `sockH` to `flangeTop` (from `sockH - 0.02` when ring and conductor share a slot). Without: a flush pad d 5.6 from 0 to `min(flangeTop, top - 0.6)` so a trace may cross over it with 0.4 PETG between.
3. Post d 3.0 from just under the flange (minus 0.02) to the top (stud) or to `padTop`.
4. With a stud: a 0.04 post tip overlapping the top face (`outside`, top - 0.02 to top + 0.02) and the stud d 4.8 from top to top + 1.8.
5. Taps: `<name>` mid post, `<name>.sock` in the ring wall, or `<name>.pad`.
6. `plainColumn` (lines 221-226): a plain clutch ring and a stud in the base slot.

Contact resistance model: `postR(top) = barR(30, max(1, top - L1), pi * 1.5^2) + 400` (parts.js:59); the 400 ohm is an estimate for the socket contact (inferred). For a brick: 671.6 ohm (computed).

Fits and print: no supports; the ring stretches 0.2 over a stud (inferred, README; untested on a print). Limits: whether cTPU keeps contact after cycles is open (BOSS README). Port note: M06-T12 applies this column to a fresh prism with both standards.

### 5.5 Press fit bore dialect and the pin socket with a wiper tab

What it does: every hole in the system is drawn as shaft plus allowance with the same stepped lead in, and a header pin is pressed onto a cPLA pad with a cPLA wiper tab that bites the pin.

Construction:
- `bore(body, spec)` (`blocks.js:144-166`): drawn D = shaft + FIT; round holes get `max(20, round(D * 24))` segments, square holes 4. Optional `tab`: a rectangle of conductor cut out of the hole edge, `into` mm into the bore, added as a feature in `t.slot` with a tap. Lead in: void `D + 0.4` over the top 0.2, `D + 0.2` over the next 0.2. Records `{shaft, drawn, fit, printed = D - 0.12, depth}`.
- `pinSocket` (`blocks.js:229-245`): pin square 0.64, `PIN_SHAFT = 0.64 * sqrt 2 = 0.905` (the diagonal has to pass). A cPLA pad 2.6 x 1.9 offset 0.4 outward, from L1 to `padTop`; bore press fit (1.005 drawn) from `padTop` to the top with a cPLA wiper tab 1.3 wide, 1.1 long, 0.12 into the bore.
- `plainPin` (lines 247-249): the same bore with no contact for unselected pins.

Fits computed at C3 press defaults (node rerun 2026-10-05): pin bore depth 4.8 (fit 3 to 12, pass); web between bores 1.535 (min 0.6); web between pads 0.64 (min 0.5). Readout "board sits 1.2 mm proud if the pins are the usual 6 mm (trim them or pick the tall body)".

Limits: the 0.12 shrink and the wiper bite are not measured on a print.

### 5.6 Two layer router with rip up

What it does: routes every pin to its column on two buried cPLA layers without the person drawing anything.

Construction (`blocks.js:261-379`, `route` and `astar`):
1. Grid of 0.4 mm cells over the part, per layer. Border keep out `ceil(d / cell)` cells with `d = clr + w/2 = 1.1`; optional keep in polygon.
2. Obstacles (circles, rects) stamped dilated by 1.1; a net may enter its own obstacles (`own`).
3. Nets sorted shortest Manhattan length first ("short traces claim the lanes next to the pads").
4. A* 4 connected, cost 1 per cell plus `bendCost` 4 per turn, Manhattan heuristic, binary heap. Layer order by `prefer` (seat pins prefer layer `k % 2`); a fixed `layer` pins a net (button matrix rows on L1, columns on L2).
5. Committed traces stamped with radius `w + clr = 1.6`; nets of the same `group` may share stamped lanes (BLOCKS addition, line 299).
6. On failure: route again with committed traces as soft cells at +60, rip every net the path crosses, commit, requeue the victims; at most 60 rips. Remaining failures become `ROUTE FAILED: <net>` warnings.
7. Paths compressed to corners, points closer than 0.25 dropped, length summed; `traceFeature` strokes 1.0 wide into L1 (3.2 to 3.8) or L2 (4.2 to 4.8) and returns `barR`.
8. `routeTo` (`parts.js:170-191`) unions paths of one net group per layer before they become geometry, so traces sharing a lane never leave coincident faces.

Measured readouts: C3 press seat `routed 16/16 on 8 L1 / 8 L2`; Pico snap `30/30 on 16 L1 / 14 L2` (computed, node rerun 2026-10-05). Lesson: longest first routing blocked lanes, hence shortest first with rip up (BOSS README).

### 5.7 Net check, OPEN and SHORT

What it does: proves on every build that each pin reaches its stud and socket and no two nets touch.

Construction: `K.netCheck(meshes, taps, {tol: 0.02})` (`kernel.js:366-394`): every recorded conductive prism is a node; two join when z ranges overlap within 0.02, bboxes overlap, and xy intersection exceeds 1e-4 mm2 (union find). Taps resolve by point in polygon at their z. `finish()` (`parts.js:61-87`) then emits `OPEN: a is not joined to b` for each `expectJoined` pair, `tap <name> hits no conductor`, and `SHORT: a + b` for any group of distinct base names sharing a net unless listed in `allowShared`; it also audits every mesh with vertex merge and adds side tab links as resistors.

Readout: "manifold, nets and fits all pass (n fits checked)" (`app1.js:208`); a failure lists the check, value and legal range. Limit: with zero fits the line still says pass (gold F8).

### 5.8 SEAT: board carrier (canon `blocks-board-seat`)

What it does: brings each selected board pin to its own perimeter column; press fit header pins or a bare board in a snap frame.

Boards (`parts.js:30-44`, pad maps inferred, no drawing cited): c3mini 18.0 x 22.4 x 1.0, rowX 8.75, 8 per side, castellated; pico 21.0 x 51.0 x 1.0, rowX 8.89, 20 per side, default 24 of 40 pins; teensy40 17.78 x 35.56 x 1.6, rowX 7.62, 14 per side, not castellated; custom. All pitch 2.54, vio 3.3.

Construction (`parts.js:222-344`):
1. `autosize` (lines 222-233): start 4 x 3 studs; grow cols until the outer stud rows clear `halfNeed` (snap `w/2 + 0.2 + 1.2 + (pin hinge 0.4 + 4.4, else 1.6 + 0.9) + 0.3`; press `w/2 + 1.4`); grow rows until they clear `l/2 + 3.2` (snap) or `+ 1.2`; grow until perimeter positions per side `rows + 2 floor((cols - 2)/2)` hold the selected pins; grow cols until lanes `floor((half span - 1.5 - 0.6 - 0.5 - laneStart)/0.8) + 1 >= ceil(nSel/2) + 2`, `laneStart = rowX + 1.3 + 0.6 + 0.5`.
2. `seatTargets` (lines 234-246): per side a list of the top end cells, the side column top to bottom, then the bottom end cells; a centred window of the needed length is picked. The end cells sit on the opposite half: `endXs` is `sx * (cols - 1 - 2q) / 2 * P * -1` (line 238), so the left row's top and bottom end cells are right of centre and the right row's are left of centre (computed, node rerun 2026-10-05: C3 press seat maps 5V to cell 4,4, GND to 3,4 and IO0 to 3,0, while IO5 lands on 1,4 and IO21 on 2,0; Pico snap maps GP0 to 5,10 and VBUS to 1,10). The leads at the ends therefore cross; two layers and rip up absorb it (16/16 and 30/30 routed). The comment in the BOSS source says "from centre outward", so the sign is likely an error (inferred).
3. Per selected pin: press mode `pinSocket` (5.5); snap mode a cPLA contact bump 2.0 x 1.4 from L1 to top + 0.4 under the castellation (lines 287-293). Unselected pins get a plain bore.
4. A column at the target cell; a net from the landing to the column, `prefer = k % 2`.
5. Plain columns elsewhere; studs suppressed inside the keep out zone that covers the pin landings (press `max(w/2 + 0.6, rowX + 2.6)`), because a stud on a pad was the overlap an earlier build shipped (lines 306-315).
6. Route (5.6); per pin model element `R = trace + barR(30, top - L1, pi 1.5^2) + 400`.
7. Body heights: press 9.6 or tall 12.8 (`height` param); snap 9.6.

Snap frame, lid and hinge (`snapFrame`, `parts.js:349-427`): PETG rails 1.2 thick, `0.4 + t + 0.3` tall, 0.2 off the board; end walls with a 10 mm USB notch at +y; hook pockets 1.6 x 6.8, 3.0 deep, with a 0.6 x 0.8 undercut; lid 2.4 thick drawn closed with a window leaving 4 mm bars over the pad rows and 3 mm end bars plus the USB slot; TPU presser ribs 1.2 wide, 0.6 tall under the lid over the bump rows; TPU hooks with 0.5 barbs 0.8 tall; filament pin hinge: two body knuckles r 2.2 with a press bore `1.75 + 0.10`, one long lid knuckle with a free bore `1.75 + 0.45`, axis at the lid mid plane, built with `prismY` so the profile is drawn as (x, z). The lid's print pose is `rotY` (a rotation, not a mirror) set beside the body.

Fits (computed, Pico snap, node rerun 2026-10-05): lid corner clears the rail on the swing 2.864 (min 0.8); presser rib squeeze 0.3 (0.2 to 0.6, a constant, not computed from geometry); rail to stud clearance 4.9 (min 0.3); knuckle interleave gap 0.4 (0.2 to 1.2); bump pitch web 1.14 (min 0.6). Readout swing radius 2.9 mm.

Run results (computed, node rerun 2026-10-05): C3 press 6 x 5 studs (48 x 40 x 9.6), 16 conductive, 70,476 tris, pin to stud 6.9 to 22.9 kohm; Pico snap 7 x 11 (56 x 88), 30 conductive, 146,848 tris, 8.4 to 61.3 kohm.

Limits: pad maps have no provenance; the Teensy is not castellated so bumps land on annular rings (warning note in code); the hooks carry no strain or closure check; the 0.3 rib squeeze is asserted, not derived.

### 5.9 DECK: blank, painted nets, breadboard

What it does: the base. Blank is studs only; painted nets join any studs you paint with buried bars; breadboard copies a solderless breadboard at 8 mm pitch.

Construction (`parts.js:430-562`):
1. Params: mode (default `bread`), cols, rows 2 to 24, height 6.4 (routed) or 3.2 (no routing), pegs, bank 5, gutter 3 studs, rail pairs 2, nets.
2. `breadLayout` (lines 533-561): rail pairs on the top two and bottom two rows whatever the aspect (`V+a` row `rows-1`, `GNDa` row `rows-2`, `V+b` row 0, `GNDb` row 1, all on L2), tie banks of `bank` studs on L1 either side of a centre gutter.
3. Net cells get conductive columns; others plain.
4. Breadboard bars are straight strokes 1.6 wide (traceW + 0.6) on their layer, modelled as one resistor per pitch: `barR(30, 8, 1.6 x 0.6) = 2.5 kohm` (computed).
5. Painted nets chain cells nearest neighbour and go through the router (lines 494-519).
6. A 3.2 plate with nets warns that it has no room for traces.

Net painter UI (`app1.js:171-187`): 8 net chips, one cell per stud, top row first; click paints, click again clears.

Run (computed, node rerun): default 12 x 10 breadboard deck 229,112 tris, 68 conductive positions, bar R 10.0 to 27.5 kohm. 22 x 20 breadboard builds in 11.1 s (measured, gold).

### 5.10 WIRE: printed wire with peg caps (canon `blocks-wire`)

What it does: a flexible TPU sheath with a conductive core in one of five shapes, ending in peg caps that plug onto any stud and take a stud on top.

Construction (`parts.js:565-710`):
1. `wirePath` (lines 578-603): straight; arc (R = max(radius, sheathW), sweep `min(L/R, 1.9 pi)`); spiral (Archimedean `r = r0 + b theta`, `b = pitch / 2 pi`, `r0 = max(pitch + 6.2, 1.6 sheathW)` so the inner cap clears the next turn, step `1.2 / r`); zigzag (amplitude, period, plus a 3 mm tail); S (two quarter arcs with straights `max(5, (L - pi R)/2)`).
2. Caps: a 7.6 square, r 1.2, at each non bare end. The sheath run and the caps are unioned into one TPU region before anything is cut (no seam, no sliver; `unionSafe` retries with a 0.7 um nudge, lines 640-650).
3. Sheath sandwich: full band 0 to 0.5, a band holed around the core from 0.48 to 1.12, full band 1.1 to 1.6 (`sheetT`); caps continue in TPU up to `capH` 3.2 around the conductor (lines 662-669).
4. Cap conductor per end (cTPU so the ring grips): ring 0 to 2.2 and flange to 2.8 for a socket, or a pad 5.6; post d 3.0 to the cap top; stud 1.8 above for `stud` and `up` ends (lines 670-683).
5. Core stroke `coreW` (default 1.2) from z 0.5 to 1.1; a cTPU core ends inside the ring wall (cut at `4.6/2 + 0.3`), a cPLA core ends at the ring's outer face plus 0.3 so it never crosses the socket cavity (line 685).
6. Bare ends trim the sheath 5 mm.

Equations: `R = barR(rho_core, len, coreW x 0.6)`. Spans: `max = len - 1.0` pulled straight; `flat` = chord. Verdict: R < 100 kohm "signal and ADC fine"; < 1 Mohm "digital fine, ADC needs a 100 nF at the pin"; above "digital only (slow edges), no analog" (line 702).

Run (computed, node rerun): straight 80 cTPU 1.67 Mohm, 3,420 tris, footprint 87.6 x 7.6; straight 80 cPLA 33.3 kohm; spiral 200 (201.0 mm) 4.19 Mohm in 42.5 x 43.2. Fit: sheath wall each side `(sheathW - coreW)/2 >= 0.6` (1.0 at defaults).

Limits: scene wires are always straight (5.21), so the spiral that saves bed space is never used by the plate (gold F10).

### 5.11 Side tabs and the flat flex form

What it does: a control part keeps its top face clear, so each terminal gets a plate high tab beside the body: socket under it onto the deck, stud on it for a wire, same net as the column. The flat form makes a part a flexible TPU sheet with peg caps.

Side tab (`parts.js:116-145`): `tabCells` picks, per terminal cell, the nearest free neighbour outside the body; `tabRect` is one cell, `P - 0.4` plus 1.2 along the out direction, r 1.0, unioned into the outline; everything above `plateH` is voided; a cPLA link strip 3.2 wide at the flange level 2.2 to 2.8 joins the inner column to the tab column; tab column peg `both` at top 3.2. Port gets `topZ 3.2` so the scene keys its contact at that height (`sim.js:21-22`). Link resistance `barR(30, 8, 3.2 x 0.6) + 2 postR(3.2)` = 2.13 kohm (computed).

Flat form (`parts.js:193-219`): body base slot TPU, 0 to `capH`; everything outside the caps voided above `sheetT` 1.6; caps `P - 0.4` square r 1.2; columns in cTPU; `flatTrace` is a cTPU stroke 0.6 thick on top of the sheet (1.0 to 1.6), default 2.0 wide.

Limit: terminals too deep inside the body get no tab and a note "wire them from the deck".

### 5.12 JUMPER and BUS

`parts.js:713-745`. n x w columns at plate 3.2, deck 6.4 or brick 9.6. Bus mode adds an L1 bar 1.6 wide per row and a tie across rows; a bus on a 3.2 plate is raised to the 6.4 deck with a readout saying why (lines 724-731). Bar R per pitch `barR(30, 8, 1.6 x 0.6) = 2.5 kohm`; through R `postR(6.4) = 536 ohm` (computed).

### 5.13 BUTTON array: in place TPU cone switch (the spring button of this family)

What it does: an array of buttons, each a TPU cone printed in place on the brick top with a three layer cTPU cap; pressing it lets the cap land on two cPLA half columns and close the switch.

Construction (`parts.js:862-950`):
1. Params: buttons across and down 1 to 4, wiring `each` (2 terminals per button), `common` (n + 1), `matrix` (rows + columns), cone top hole 2.5 to 5 (3.5), cone base 9 to 15 (13). Each button takes a 2 x 2 stud cell; terminals are picked from perimeter cells nearest each button (`edgePicker`); if terminals run out the generator retries with one fewer column.
2. Well: void circle `r = coneD/2 - 1.2` from `top - 3.6` up.
3. Contacts: two cPLA half columns from a circle r 2.4, split by a 1.2 slot, each half its own obstacle (so a matrix lead cannot walk through a contact), rising from L1 to `contactTop = top + 2.0 - 1.6`. At the default brick top 9.6 `contactTop` is 10.0, so the half columns stand 0.4 above the brick top, inside the cone's cavity (computed).
4. Cone (TPU) by `revolve`: 40 degree wall, 0.6 thick, horizontal wall `hw = 0.6 / sin 40 = 0.933`, `rBase = coneD/2`, `rTop = capD/2 + hw`, `coneH = (rBase - rTop) tan 40`.
5. Cap (cTPU) by `revolve`: 0.6 thick, its side follows the cone's inner wall line `rIn(z) = rTop - hw + (zc1 - z)/tan 40` exactly, so it is supported at every layer; then shrunk 1.5 um radially toward its own cone centre so it never touches the TPU.
6. Matrix wiring routes row leads on L1 and column leads on L2.

Equations and run (computed, defaults): coneH 3.20, travel to contact `(zc1 - 0.6) - contactTop` = 2.20 mm; on R `3e3 + 2 postR(top) + leads` = 4.3 kohm; fits travel 2.202 in 1.0 to `cavD/2 + 0.6 = 2.4` (pass), gap between cones `2P - coneD` = 3.0 (min 1.0).

Limits and lessons: travel is 69 percent of the cone height (computed); the HAFT flex cone rule puts contact at about 45 to 50 percent and never under 1.2 (CANONS.md `flex-cone-key`, M10 line 174), so this cone may not close on a print (unverified). The hookup says "each S to a GPIO with INPUT_PULLUP, COM to GND; reads LOW when pressed", which the bench's own solver disproves for printed paths (5.23). Matrix wiring has no diodes, so two keys in a column ghost (hookup line 948). For a proven printed spring button use the PIP click spring key and flex cone key (canon `click-spring-key`, `flex-cone-key`).

### 5.14 KNOB: printed rotary pot and detent selector, snap in knob

What it does: a 3 to 5 stud square brick with a printed track under a knob that snaps in through a bore; continuous pot or N position selector.

Construction (`parts.js:1044-1153`):
1. Track radius `rTrack = nsz P / 2 - 2.8` (9.2 at 3 studs), collector `rColl = rTrack - 3.6` (5.6), track width 2.4, flush cPLA or cTPU from `top - 0.6` to top.
2. Pot: a cTPU arc of `sweep` (180 to 330, default 270) whose gap faces the one corner with no terminal; cPLA lands at both ends to A and B; collector ring always a full circle so the wiper stays on it.
3. Selector: `maxSect = floor(pi / asin((2.4 + 1.4)/(2 rTrack)))`; sectors `min(positions, perimeter - 1, maxSect)`; each sector is an arc with half angle `pi/n - (2.4 + 1.4)/(2 rTrack)` on its own post; terminals are the perimeter columns nearest each sector bearing, plus W.
4. Shaft bore `4.5 + 0.45` free from `padTop`, a barb relief d 7.0, 1.6 tall.
5. Knob (separate object): PETG cap d `nsz P - 1.4` (22.6), 16 flutes r 1.1, pointer bar, skirt, shaft d 4.5; TPU barb by revolve d 6.4 at the shaft foot; cTPU wiper pad under the knob 0.6 thick spanning collector to track. Print pose `rotY` beside the body.

Run (computed): pot track 451.6 kohm end to end; selector 6 positions, 60 deg apart, 36 deg of contact each. Fits: wiper to track overlap 2.4 (min 1.2); barb catch `(6.4 - 4.95)/2 = 0.725` (0.6 to 2.0); wiper reach past the skirt 0.1 (bounds -99 to 99, so it never fails).

Limits (gold F2): the pot element has `on: null` so its wiper is always 1 Gohm open in the solver; the selector declares `type: 'rotary'`, which `solve()` has no branch for, so no position ever pulls a pin. Twelve positions at 3 studs clamp to what fits with a readout note.

No mechanical detent (found in this check): the `detent` type builds only electrical sectors. There is no bump, notch, spring arm or index feature on the knob, the skirt or the body, so the knob turns freely and the person finds a position by the pointer. The selector element is `{type: 'rotary', w: 'W', outs: P1..Pn, Ron: 6000 + 2 postR(top)}` (`parts.js:1102`). For a printed click detent use the DETENT or PAWL originals (`knowledge/designs/detent.md`, `pawl.md`).

### 5.15 SLIDER: finger pot, membrane pot, touch strip

Construction (`parts.js:953-1042`): n x 2 studs (default 4). Track length `n P - 6` (26), track at y -2.0, `trackW` 3.5; finger type: cTPU track flush beside a cPLA bus 2.0 wide 0.8 away, the finger is the wiper (`Rskin` 300 kohm, inferred); membrane type: a PETG rim and a separate TPU strip with a cTPU band underside that presses track onto bus (`Rskin` 8 kohm), printed face down beside the brick; strip type: `segs` cPLA pads 10 tall with 1.2 gaps, one terminal each. Flat form: A and B leave by the bottom edge, W by the top, because a single sided sheet cannot cross.

Run (computed): finger track 164.3 kohm end to end, lead 2.3 kohm. Hookup: A to 3V3, B to GND, W to ADC; read again with A and B swapped to detect no touch.

### 5.16 TOUCH: capacitive pads, brick or flat sheet

Construction (`parts.js:747-825`): brick: nx x ny pads (2 x 2 studs each), flush cPLA rrect 12 mm r 1.5 from `top - 0.6` to top on a pad post; delta C 4.2 pF class from `e0 x 3.0 x 80 mm2 / 0.5 mm` (inferred). Flat: pads in cTPU on the 1.6 sheet, each lead runs sideways into its own lane (1.6 wide, 0.6 gaps) then straight to its column cap; pads trimmed to leave room for lanes; pads in one column share a cap (readout note). Run (computed): brick lead 4.7 kohm; flat 4 x 4 pads trimmed to 6.0, lead 262.5 kohm.

Limit (gold F2): controls write `touch0..N` but the solver reads `ctrl.touched`, so the checkboxes do nothing.

### 5.17 FORCE: comb plus cTPU membrane

Construction (`parts.js:827-860`): 2 x 2 brick; comb of `fingers` (6) cPLA fingers 1.0 wide over 11 mm, two spines on two posts, flush in the top 0.6; PETG rim (inner 12.0, outer 13.6, 1.2 tall); separate membrane: TPU 0.4 to 1.2 with a cTPU disc 10 x 10, 0.4 thick, underneath, printed face down beside the brick. Model `R = Rlead + Rmin + (Rmax - Rmin)/(1 + 6F)`, Rmin 2 kohm, Rmax 5 Mohm, open below 0.05 N (inferred). Fit comb gap 0.6 to 3 (1.00 at defaults, computed); lead 3.3 kohm (computed).

### 5.18 LAMP: LED holder whose printed path is the series resistor

Construction (`parts.js:1155-1188`): 3n x 1 studs; LED bore `ledD + 0.25` (snug) 3.2 deep; legs at +-1.27 into cPLA cups 1.8 square from L1 to `padTop` with press bores `0.55 + 0.10`; leads routed to A and K columns. Model: LED Vf 2.0, `Rs = 2 postR(top) + 2000` = 3.3 kohm; readout `(3.3 - 2.0)/Rs` = 0.39 mA "visible" above 0.3 mA, else "dim, use a 5 V rail or a wider trace" (computed). At rho 300 the readout drops to 8.2 kohm, 0.16 mA (measured, gold `blocks-d-41`). The routed lead resistances `Rs.A`, `Rs.K` are computed by `routeTo` and then not used: `Rs = 2 postR(top) + 2000` is a constant 2000 ohm stand in for the traces (`parts.js:1182`). BOSS summed the routed traces (`boss-src/src/parts.js:623`), so the BLOCKS readout does not follow the routed length.

### 5.19 RESISTOR: trimmable meander

Construction (`parts.js:1190-1214`): 2 x 1 brick; cPLA meander flush in the top, legs 2 to 12 (6), leg span 4.4, width 0.8, pitch `12 / legs`; a cuttable bridge across each leg pair shorts it until cut. Model `R0 = barR(30, 12, 0.8 x 0.6) + 2 postR`, `Rstep = barR(30, span + pitch, 0.48)`. Run (computed): uncut 8.8 kohm, +4.0 kohm per cut, 28.8 kohm all cut.

### 5.20 Composer scene: grid, rotation, stacking, contact nets

What it does: parts placed on an 8 mm world grid in quarter turns settle onto whatever is beneath them, and nets form only by physical contact.

Construction (`sim.js:13-64`):
1. `rotCell` turns a local cell by r quarter turns CCW; `worldCell = (ci, cj) + rotated cell`.
2. Stacking (`settleAll`, lines 37-43): instances settle in insertion order; each rests on the top of the highest earlier instance whose footprint overlaps. `move` re-inserts the moved instance last, so it lands on top.
3. Contacts (`nets`, lines 47-64): every top port is keyed `wi,wj,(z + portTop).toFixed(2)`; a bottom port of X at `wi,wj,z_X` unions with every top port at that key. Wires union their two end ports. Union find over port nodes.

Rule this teaches (guide text, app3.js:70): "nets form by contact only". Measured: THE FULL MONTY has 10 parts, 20 wires, 47 contacts, solved in 8 to 11 ms (gold 2.1).

### 5.21 Port wiring: a scene wire is the printed wire

What it does: clicking two pegs makes a printed WIRE part whose length is fitted to the span plus slack, drawn as an arch solved to exactly that length, refitted when parts move, red when it cannot reach, and printed at that length.

Construction (`app2.js:42-96`, `142-199`, `213-233`, `311-340`):
0. Core: a wire placed with the wire tool or by a recipe has a cPLA core (`state.wireCore` 2, `app1.js:98`; `core: S.CPLA` in `loadPreset`, `app2.js:423`), while the WIRE catalog part defaults to cTPU. So scene wires are about 33 kohm per 80 mm (cPLA), not 1.67 Mohm (computed from `barR`), and there is no control in the UI to switch a scene wire to cTPU.
1. End point: port top + `COREZ` 0.8 + `level x (capH + studH - sockH)` = level x 2.8, so a wire cap stacked on another cap sits one cap higher (a cap is a plate with its own stud).
2. `fitLen(D, slack) = round1(max(2 capH + 8, D + slack))`, slack default 8 mm.
3. `archHeight(D, L)`: a Catmull-Rom curve through the ends and three lifted points (0.72 h, h, 0.72 h at quarter spans); bisection 22 steps on h in [0, max(6, L)] until the curve length equals L.
4. `wireGroup`: tube r 1.6 along the curve, 7.6 square caps of `capH`, red `#ff3b30` when the span exceeds `span.max = len - 1`.
5. Peg resolution: `resolveWireEnd` takes the nearest top port within 1.5 cells; if it is buried or taken, `freeStudOnNet` finds the nearest free top port on the same net (side tab, deck stud), and the HUD says where it landed; `freeEnd` stacks a cap on a cap by level.
6. Refit: every move or rotate calls `refitWires` for wires on the moved instance unless the length was set by hand (`manual`).
7. SELECTED for a wire: span now, prints as, slack, lead R, print length (min 12), fit slack 0 to 40, refit to span, remove, and "this is the length that goes on the plate: the arch you see is solved to it, so what you print is what fits."

Measured (gold 2026-10-05): HUD "wire 83.5 mm printed for a 75.5 mm span, 34.8 kohm"; dragging the lamp one cell refit two wires 83.5 to 90.4 and 66.2 to 74.0 mm; a 12 mm hand set wire turned red with "it needs 99.4 mm or more".

Limits: `makeWire` always builds `straight` (line 84), so the scene plate never coils a long wire (gold F10); the "too short" line uses class `warn` (unstyled) where the rest use `warns`.

### 5.22 The DC solver

Construction (`sim.js:66-157`): modified nodal analysis, dense Gaussian elimination with partial pivoting (`solveDense`). Elements from each part's `model.elements`: `R` (min 1e-3), `switch` (Ron or 1e9), `trim` (`R0 + cuts x Rstep`), `force` (5.17), `pot` (two track halves `R pos` and `R (1 - pos)` plus a wiper `Rskin + Rlead` when `ctrl[on]`, else 1e9), `led` (piecewise linear: off below Vf with 1e-9 S, else `(V - Vf)/(Rs + 20)`), `touch` (300 kohm finger to ground when touched), `V` (SUPPLY, rails, OUT_H, OUT_L). Board pins: rails are sources; OUT_H drives vio, OUT_L 0; PULLUP is 50 kohm to vio; IN and ADC are 1e9 to ground. Ground row replaced by identity; every other node gets 1e-12 S to ground so floating nets stay defined. Newton on LED states up to 40 iterations, stop when the largest diode step is under 1e-4 V. Readings: `adc = round(clamp(V/vio) x 4095)`; `digital = V > 0.5 vio ? HIGH : LOW`. SUPPLY is a virtual 1 x 2 brick, 1.5 to 5 V, default 3.3 (lines 9-11).

Solver gaps found in this check:
- Element types `rotary` (KNOB selector) and `pass` (JUMPER through columns) have no branch in `solve()`, so they are silently skipped (`pass` is harmless because the column is one port; `rotary` means no selector position ever conducts).
- `touch` reads `ctrl.touched` (one key for every pad, ignoring the element's own `ctrl`) and adds the 300 kohm finger only `if (gndKey && ...)` (`sim.js:84`). `gndKey` is set while iterating instances, so a TOUCH placed before the seat or SUPPLY never gets its finger. Computed (node, 2026-10-05; C3 press seat, TOUCH 1 x 1 side tab, 40 mm cPLA wire, IO2 PULLUP, `touched` true): seat added first 2.862 V, touch added first 3.300 V. Scenes always add the deck and seat first, so recipes do not hit this.
- Recipes set pin mode `TOUCH` (TOUCH pads, THE FULL MONTY) but the BOARD PINS select has no TOUCH option (`MODES`, `app2.js:341`) and the solver treats any unknown mode as 1 Gohm to ground, so those pins read as plain inputs with no label.

### 5.23 The undefined band pullup verdict

What it does: tells the person that a printed switch on an internal pullup never reaches a clean LOW, and what to do instead.

Code: `app2.js:383`: for every pin in IN or PULLUP mode with `0.3 vio < V < 0.7 vio`, RESULT adds "<pin> sits at <V> V, in the undefined band: printed paths are kilohm class, so read it with ADC and a threshold, or use a stiffer external pullup."

Reproduced on the BLOCKS standard (computed, node rerun of the shipped generators 2026-10-05: C3 press seat, BUTTON 1 x 1 pressed, IO2 PULLUP, two straight wires IO2 to S1 tab and GND to COM tab; band 0.99 to 2.31 V):

| Wires | IO2 pressed | 0.5 vio read | Band |
|---|---|---|---|
| 10 mm cPLA | 1.575 V | LOW | undefined |
| 40 mm cPLA | 1.932 V | HIGH | undefined |
| 80 mm cPLA | 2.229 V | HIGH | undefined |
| 80 mm cTPU | 3.252 V | HIGH | reads released |

On BOSS v1 the same scene gives 1.308, 1.624, 1.917, 3.224 V (computed, this session; equals the M05-T07 expected table). Limits (gold F4): the digital read is one 0.5 vio threshold, so a green HIGH can sit beside the undefined hint; the pullup is 50 kohm in code while copy says 45; the band is one fixed fraction for every board. The plan replaces it with per MCU VIL, VIH and pullup rows (M05-T07, D-076, D-077).

### 5.24 Worked scenes as recipes

`scenes.js:16-158`: 11 recipes `{deck, seat, items: {key: [partId, params, ctrl]}, wires: [fromKey, port, toKey, port], pins, note}`: BUTTON pad, KNOB divider, KNOB selector, SLIDER, TOUCH pads, FORCE, LAMP, RESISTOR divider, JUMPER bus, BREADBOARD deck, THE FULL MONTY. `load` (lines 181-217) builds the deck, places the seat (on the gutter when asked), packs items first free rectangle bottom left to top right with one cell of air where possible (`packer`, lines 162-178), wires by port name through `topPort` (a terminal without a top peg uses its `+` side tab), sets pin modes, and the builder fits every wire length from the actual build. Each note teaches the circuit.

Limits found in the code (gold F1, F5, F6, plus this read): recipes say `deck: {topo: ...}` but DECK reads `mode` with default `bread`, so every scene sits on a breadboard whose tie strips short the terminals (computed: `deck({topo: 'blank'})` builds "DECK 12x10 bread"); `seatAt: 'gutter'` reads `deck.bb` but the part stores `bread`, so the seat is never centred on the gutter (found in this read, scenes.js:189 against parts.js:457); `buildSceneChips` is never called (it is exported at `app2.js:446` and nothing in `app3.js` boot calls it), so the SCENES panel shows only its note text with no chips (after `example()` the note becomes the loaded scene's note, as in shot d-51), and recipes other than THE FULL MONTY are reachable only through `BENCH_SCENE.loadPreset`; items the packer cannot place and wires with no top port are skipped silently; keys such as `angle`, `pressed`, `touched`, `ledD`, `n` are not declared by the parts they target. With decks forced blank the button drops IO2 from 3.300 to 2.139 V (measured, gold probe).

### 5.25 Export: plate, 3MF, STL zip, print card, design json

Construction (`export.js`): `placeObjects` applies each object's pose (`flipY` uses `rotY` about the object's own x midline and top) and lifts to z 0, keeping vertex coordinates small with the bed offset carried as the build item transform (lines 15-41). `layoutScene` packs parts left to right in rows with 8 mm gaps on a 256 bed and reports parts whose row overflows in y (lines 44-62). `packageFor` builds the Orca3MF config: four filaments from SLOTS, Creator 5 Pro printer with process `0.20mm Standard @FF C5`, layer 0.2, one object per placed object with one part per slot (lines 91-99). `stlZip` writes `<object>_<part>_slot<n>.stl`, `print-card.txt`, `design.json`. The print card adds readouts, hookup, BOM, warnings, materials, purge advice (at least 70 mm3 into cTPU), and the per colour STL fallback. Writer: print-forge `orca3mf.js` verbatim (103 project keys, measured on the exported 3MF, gold 2.2).

Limits (gold F9, F18): layout checks rows overflowing in y only, so a 400 mm straight wire reports "fits the bed" while drawn crossing it; export proceeds with failing fits; `exportBytes('json')` omits the `bench` block the UI download carries; an empty selection throws in the hook and returns silently in the UI.

---

## 6. UX anatomy

Shell (`shell.html`): paper app shell. Tokens: pink `#FE0386`, cream `#f5f0e6`, paper `#fffdf7`, sunk `#efe9db`, ink `#1a1a1a`, void `#0a0a0a`, ok `#1f9d55`, warn `#c77700`, err `#c3251f`, slime `#a6e22e`, amber `#ffb020`. Fonts Permanent Marker, Special Elite, VT323, IBM Plex Mono 400/600, inlined as base64 woff2.

- Header: mark, `blocks.hack.build` in Permanent Marker with pink dots, Special Elite tagline, undo, redo, open, save, guide.
- Steps strip: 1 PART, 2 MATERIALS, 3 BUILD, 4 PRINT; pink underline and number box on current, green box on visited (`app3.js:73-81`).
- Guide strip: `STEP N NAME` in VT323 pink plus one goal sentence (`app3.js:68-71`).
- Stage: void with a 26 px pink graph rule; three r128 perspective 38 deg, z up; cams iso, top, front, under, x ray toggle (PETG 0.18 opacity, depth write off); spherical orbit 0.008 rad per px, phi clamped 0.05 to pi - 0.05, right or shift drag pans, wheel 0.89 or 1.12 clamped 20 to 1500, render on dirty only (`app1.js:11-60`); legend top right; HUD bottom left; tools strip move, wire, rotate, delete, run shown only in BUILD.
- Welcome card: name, one paragraph, four cell step grid, starts `start with a seat` and `the full monty scene`; returns on every load.
- Rail 340 px, one pane per step:
  - PART: CATALOG (11 tiles), PARAMETERS rendered from each part's schema `{k, label, type, options | min max step, def, unit, group}` by one function (`buildParams`, `app1.js:117-142`) with two custom field types `pinset` (checkbox per board pin in the board's two row layout, presets `all pins` and `rails + 4 io`) and `nets` (the painter); READOUT (key value lines written by the generator, each with its consequence) and the checks line; HOOKUP and `needs:`.
  - MATERIALS: per slot colour, name, role, and resistivity for the two conductors; every edit rebuilds readouts and the solver (`app3.js:9-25`); PRINT REALITY notes.
  - BUILD: SCENES, PALETTE (`add current`, quick chips, three seats), SCENE list with wire rows and lengths, SELECTED (part facts and live controls, or the wire panel of 5.21), BOARD PINS (mode select per pin: input, input pullup, analog read, output HIGH, output LOW, with a live reading), RESULT (contacts, wires, LED mA with faint below 0.5 and dim below 2, element readings, a fold of joined nets sorted by voltage, hints).
  - PRINT: WHAT TO PRINT (this part or the whole scene, count list), EXPORT (3MF project, STL zip, print card, design json, plate note), PRINT NOTES.
- Stage feedback in BUILD: pink ghost box at the drop height (opacity 0.35), R rotates, Esc cancels, shift click repeats; slime ring on the first wire end; net voltage discs on every top stud (grey under 0.05 V, green rising, amber above 0.7 of 5 V); pink LED glow sphere with opacity `min(0.95, 0.15 + mA/6)`.
- Keys: Ctrl or Cmd+Z undo, with Shift redo (`app3.js:93`); in BUILD, with the canvas focused, R rotates the selected part and Delete or Backspace removes it, both refitting wires (`app2.js:249-255`); hovering reports `<part> at ci,cj stacked z mm up`. A CLEAR button in the SCENE panel empties the grid.
- PART view versus PRINT view: `showPart` (`app1.js:84-95`) draws every object of a part in its build coordinates and lays objects k > 0 in a row 8 mm to the side; it ignores `pose`, so a lid, knob or membrane appears in its assembled orientation (hooks down, pointer up). Only the PRINT plate (`showPlate`, `app3.js:46-53`, through `EXPORT.placeObjects`) applies the print pose. The status dims in PART include the second objects' heights (Pico snap reads 56.0 x 88.0 x 14.69 mm, measured, shot d-06).
- Status strip: dims, triangles, build ms on the left; chips `checks pass`, `fits bed`, `N warnings`, `over the bed` (over 250 mm); in BUILD `N parts, N wires`, contacts, solve ms, `circuit solved`.
- Commit model: select and number commit on change, range previews only its number until change; 320 ms debounce (10 ms for discrete clicks); solver reruns 60 ms after a control; 80 deep JSON undo of `{part, scene}` skipping identical snapshots (`app1.js:102-104`, `189-202`).
- Save `blocks-bench.json` `{tool, version, part, scene, slots}`; open restores slots too.
- Hook `window.BENCH` (`app3.js:103-113`): `state`, `scene`, `goStep(n)`, `run()`, `example()`, `setPart(id, params)`, `exportBytes('3mf' | 'stl' | 'card' | 'json')` resolving to a Uint8Array, `ready()`.
- No drive pad: stimulus lives in SELECTED and BOARD PINS.
- Phone: under 820 px rail 290; under 640 px the rail stacks under the stage at 46 percent; no sideways scroll at 390, 768, 1280 (measured, gold 3.5).

## 7. What makes it excellent

From the gold note (`fab-knowledge:sources/gold/blocks.md` section 5), each checked against the code above:

1. The scene is the print: a placed wire is a printed part at the length the layout needs, with its arch solved to that length (5.21).
2. Physical contact makes the nets, so the build step teaches the mechanics it simulates (5.20).
3. Every readout is a number with its consequence (`0.39 mA: visible`, `digital only (slow edges), no analog`, `board sits 1.2 mm proud ...`).
4. Material numbers drive everything: a typed resistivity rebuilds every readout and the solver.
5. The checks line says what passed; every part is audited for manifold, nets, shorts and fits on every build.
6. A seat grows to the pins you pick and reports `routed n/n on L1 / L2`.
7. Second objects (lid, knob, membranes) appear beside the body in PART, assembled orientation, and in their print pose on the PRINT plate, so the person sees both what it is and how it prints.
8. One schema renders eleven very different parts.
9. Worked scenes are recipes built live against the current standard.
10. Continuous stage feedback while editing.
11. The paper shell skeleton holds at every width with no console errors.
12. Fast where touched: small parts 5 to 125 ms, the solver about 10 ms for 47 contacts (measured).

## 8. Known limits and failure lessons (consolidated)

Gold F1 to F18 (`sources/gold/blocks.md` section 6) all hold for this file. Added in this read:

- The PALETTE chip `PLATE 8x8` calls `partFor('plate')`, but BLOCKS replaced PLATE with DECK, so `PARTS.make('plate')` throws "no part plate" (computed, `app2.js:113`).
- `seatAt: 'gutter'` never applies (5.24).
- BUTTON travel 2.20 of a 3.20 cone (5.13) and the fit passes because its bound uses the well depth.
- `MINWALL` is declared and never checked.
- Added in the check pass (2026-10-05, each verified in the code, the numbers computed in node): SEAT end cells assigned to the opposite half (5.8); KNOB `detent` has no mechanical detent (5.14); LAMP ignores its routed trace R (5.18); scene wires are cPLA by default with no UI to change it (5.21); TOUCH finger depends on insertion order, `rotary` and `pass` are unsolved, recipe pin mode `TOUCH` is unknown to the UI and solver (5.22); PART view ignores print poses (6); PRINT NOTES still say "push two 8 mm bits of 1.75 filament in" while the BLOCKS BOM asks for one pin of board length plus 4 mm (`parts.js:386`), so the notes are BOSS copy.

Rules to copy into new designs (gold section 7, R1 to R18): connecting parts in a composer are printed parts with fitted length; nets from declared contact only; readouts pair value and verdict; one place for material numbers; check summaries count what ran; recipes are keyed by declared ids with an expected reading; every control key declared once and read through its declaration; status describes the current view; plate fit checks both axes; coiled wires when straight does not fit; long builds behind a busy state; one focal pink.

## 9. Tests and harness

BLOCKS shipped no harness of its own. What exists:

- Gold drive (`fab-knowledge:evidence/gold/blocks/drive/`): `drive.mjs` (every step, cam, part, 21 variants through `setPart`, exports through `exportBytes`, both widths), `drive2.mjs` (a scene built and wired with real canvas clicks, drag refit, phone), `probe.mjs` and `probe2.mjs` (every scene control against the solver, with decks forced blank). Logs `blocks-drive-log.json`, `drive2-log.json`, `probe-out.json`, `probe-out-patched.json`.
- The BOSS harnesses run the same architecture: `test_parts.js`, `sweep.js`, `test_sim.js`, `test_sim2.js`, `export_all.js`, `smoke.py`, `browser_sweep.py` (`fab-knowledge:originals/boss/files/boss-src/`). They load `kernel.js` and `parts.js` by `require`, which also works for the extracted BLOCKS scripts once `boss.js` is swapped for `blocks.js` (this record ran them that way through `vm.runInThisContext`).
- Not run for this record: `validate_3mf.py` on the BLOCKS exports (BOSS's 21 shipped 3MFs passed it on 2026-10-04, measured, benches-conductive-b.md B.11).

## 10. Port map

| Feature or mechanism | Package (plan) | Feature kinds | Canon id (CANONS.md) | Reference id | Milestone | Lineage row (`lineage.json`) |
|---|---|---|---|---|---|---|
| stud column | archetypes, mesh | conductor, contact, port | `blocks-stud` (proven) | `conductors/blocks-stud`, `conductors/blocks-stud-applied` (planned, not in repo) | M06-T07, M06-T12 | MISSING |
| printed wire with peg caps | archetypes | conductor, port x2 | `blocks-wire` (proven) | `conductors/blocks-wire` (planned) | M06 | MISSING |
| SEAT press and snap | archetypes, catalog | pocket, contact xN, port xN, snap, hinge | `blocks-board-seat` (proven) | `seats/blocks-seat` (planned) | M06, M08 (board catalog) | MISSING |
| buried two layer traces | copper/router, mesh | conductor xN | `buried-trace-stack` (cites BLOCKS) | `conductors/buried-trace-stack` (planned) | M05, M06 | MISSING |
| undefined band verdict | circuit | read model pullup | `blocks-stud` read model; check CHK-NET-05 | `electrical/blocks-pullup-band` (planned) | M05-T07 | MISSING |
| composer scene, contact nets, port wiring, stacking | ui, sim, chase | scene of instances, contact rule, wire instance | MISSING (no scene, contact or port to port wire declaration; gold 8.6 items 1 to 3) | MISSING | M10 (`designs/blocks`, `apps/blocks`, D-143) | MISSING |
| DECK painted nets and breadboard | archetypes | conductor xN, port xN | MISSING | MISSING | M10 | MISSING |
| side tab terminal | archetypes | port, conductor | MISSING | MISSING | M10 | MISSING |
| flat flex sheet form | archetypes | conductor, port | MISSING | MISSING | none | MISSING |
| BUTTON cone array, each/common/matrix | archetypes | pocket, contact, conductor x2, boss | MISSING (candidate "BOSS cone button", CANONS.md backlog); proven alternative `flex-cone-key` | MISSING | M10 | MISSING |
| KNOB pot and selector with snap barb | archetypes | conductor x3, contact, snap, pocket | MISSING (closest `printed-rotary-pot`, TANG R6) | MISSING | none | MISSING |
| SLIDER finger, membrane, strip | archetypes | conductor x2, contact, port x3 | `finger-pot` (GIB), `printed-membrane-slider` (TANG); BLOCKS variants MISSING | `sensors/finger-pot` (planned) | M06 | MISSING |
| TOUCH brick and flat | archetypes | conductor, pad | `capacitive-plate` (related); "touch brick" candidate MISSING | MISSING | M10 | MISSING |
| FORCE comb and membrane | archetypes | conductor x2, contact | `force-comb` (proven, other source); "force brick" candidate MISSING | MISSING | M10 | MISSING |
| LAMP with printed series R | archetypes | pocket, conductor x2 | MISSING (candidate) | MISSING | M10 | MISSING |
| RESISTOR trimmable meander | archetypes | conductor | MISSING (candidate; related `printed-pullup-meander`) | MISSING | M10 | MISSING |
| JUMPER and BUS | archetypes | conductor, port xN | MISSING | MISSING | M10 | MISSING |
| Body negative space builder, kernel | mesh, geom | all | n/a (kernel) | n/a | M00 to M02 | MISSING |
| DC MNA solver | circuit | n/a | n/a | `electrical/blocks-pullup-band` | M05 | MISSING |
| export plate, 3MF, card | 3mf | n/a | n/a | n/a | M03, M04 | MISSING |
| worked scene recipes | chase | scene preset with expected reading | MISSING | MISSING | M10 | MISSING |

Chase kind `composer`, shell `paper`, steps PART, MATERIALS, BUILD, PRINT; the BUILD panels and stage tools need declarations the plan does not have yet (gold 8.3 to 8.6). `lineage.json` holds three rows today (rastermesh healers); no BLOCKS or BOSS row exists.

## 11. Lineage and kin

- Parent: BOSS v1, 2026-09-13 sources (`originals/boss`). BLOCKS changed the standard to 0.2 layers, added DECK, NxM JUMPER, BUTTON arrays, KNOB, SLIDER types, TOUCH flat, side tabs and the flat form, the bore and clutch dialects, the printed length wire, scenes.js, and the kernel robustness fixes.
- Kin that reuse BLOCKS ideas: BAFFLE R3 LEGO tile carrier on conductive studs (CANONS.md backlog), TOGGLE terminals with a BLOCKS mode at 8 mm pitch (`sources/latest/haft-toggle.md` 4.4), `tilt-stick-blocks` reference, PIP and HAFT flex cone and click spring keys (the proven successor to the BLOCKS cone button).
- INLAY is not in this lineage: the INLAY bench is the print-forge skill's template in the coin line (python coin, COLLAR, SPRUE, INLAY, SASH; `fab-knowledge:synthesis/patterns-and-lineage.md` lines 348 and 371). It shares only the bench skeleton and `orca3mf.js`. Its files are `~/Downloads/inlay-bench.html` and `inlay-bench (1).html` (2026-09-07) and `fab-work-directory/benches/print-forge-3mf/outputs/print-forge/`.
