# FRET: how it is made

Record written 2026-10-05 from the original code. Slug `fret`. Family KEYWAY (chat `cricut-midi-seven`), sixth board, the playable one ("The playable one", registry `tools.json`). Shared skeleton, `svgpath.py` and viewer shell: `fab-knowledge:originals/keyway/RECORD.md` section 4; the constraint-ranked lane solver is recorded in full in `fab-knowledge:originals/tessera/RECORD.md` section 5.4.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Computed" means the rerun of 2026-10-04, `fab-knowledge:originals/fret/files/rerun/run-2026-10-04.txt`. "Measured" means the headless drive of 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code.

Short paths: `F` is `fab-knowledge:originals/fret/files/`. `GEN` is `F/gen_fret.py`. `SIM` is `F/fret_sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | FRET rev A: isomorphic Wicki-Hayden hex keyboard, 15 keys, 3 long sliders, 21 finger rail |
| owner's slug | fret |
| canonical file | `GEN`, sha256 301f6ffc2529d7193cc57fd7406e5c6da01340d1064288253dad7fa5a5507481 |
| viewer | `SIM`, sha256 406757c645f5a2e23a3d613282ddc4d625a2d32f4d6535b8caabc9b07c76eff3, 207186 bytes |
| date | 2026-08-10 19:57 (zip stamp of `~/Downloads/files (53).zip`, identical member for member) |
| size | 248 x 244 mm, r 3.2 (`GEN` line 41) |
| nets | 21: K1 to K15, AR_A, AR_B, L1_A, L1_B, L2_A, L2_B (`GEN` line 64) |
| gates | 95, all pass (computed) |

One shipped revision. The previous revision inside the chat used straight vertical channels between key columns, which pushed the columns apart and broke the honeycomb into strips (README); it was not saved. The docstring still describes an earlier plan (section 7).

Why this revision: the only one, and the best board of the family: it plays, it routes 21 nets in 3 lanes, and the generator asserts the musical layout itself (interval gates). 95 of 95 at 1.000 mm (computed). The viewer carries the `S.span` defect (section 7).

`files/`: generator, `svgpath.py`, README, geometry JSON (with the note map), viewer, `layers/`, `inputs/`, `rerun/`.

---

## 2. What it makes and for whom

An isomorphic keyboard cut from copper, vinyl and sticker paper. Wicki-Hayden: up a column is +2 (whole tone), up-right +7 (fifth), down-right +5 (fourth), so a scale, chord or arpeggio is one hand shape that slides anywhere and plays in all twelve keys. Fifteen interlocking hex keys from C3 to E5 (28 semitones, computed), two 122 mm flank sliders under the thumbs, a 108 mm arc across the top (computed), 21 contacts in one row. Two MPR121. Keys are on or off; the sliders carry expression.

---

## 3. Shots

Headless drive 2026-10-05; the page throws the `S.span` TypeError on load (measured) and builds no tab row; the driver unhid Sense model and Wiring. Sense SVG capped at 690 px tall. Files in `fab-knowledge:originals/fret/shots/`.

| file | caption |
|---|---|
| `f01-stack-iso-default.png` | Layer stack at load, no tab row. |
| `f02-stack-exploded-orbited.png` | Exploded and orbited. |
| `f03-top-collapsed.png` | Top, collapsed: the honeycomb with note names C3 to E5 on pink hex inlays, SL1 and SL2 on the flanks with graduations, ARC across the top, the interval line "UP +2 UP-RIGHT +7 DOWN-RIGHT +5", the 21 finger rail. |
| `f04-sense-k8-touched.png` | Key K8 held: "K8 (D4)", delta +71, TOUCHED, "Note D4. One channel, 585 mm2 of plate" (measured). The copper shows the zigzag grout ribbons carrying 3 or 4 traces each and both arc ends running along y 189. |
| `f05-sense-slider-ar.png` | Arc dragged: A/(A+B) 0.349, "66.3 deg of a 108 mm sweep", CC 33, zone 3 of 8 (read from the shot; consistent with t = (66.3 - 40)/100 = 0.263 over the 40 to 140 deg read window, computed). |
| `f06-wiring.png` | Wiring (unhidden): 21 rows SL1 B, SL1 A, ARC A, the left column keys, then each column in turn, ARC B, SL2 A, SL2 B, with deep and shallow fingers; heading still reads "The rail: 18 contacts, one row"; generator pane empty. |

---

## 4. Shared kernel (brief)

`P` lines 39 to 63; helpers lines 70 to 82 with `smooth(d=0.25)`; `apol` and `annulus` about the arc centre lines 84 to 94; `hexagon(cx, cy, s)` flat top, vertices at 60 k deg (lines 96 to 100); outline lines 102 to 104; union and smooth lines 275 to 276; gates lines 292 to 404; refusal line 408; emit lines 412 to 508.

---

## 5. Mechanisms, circuits and constructions

### 5.1 Interlocking flat-top hex lattice

Construction (lines 111 to 149):

1. `s = 21`; `hex_h = sqrt(3) * s`; column pitch `dxc = 1.5 s = 31.5` so columns interlock.
2. Column x `COLX[c] = 64 + c * 31.5`; centre y `cy(c, r) = 58 + hex_h/2 + (r + 0.5 if c odd) * hex_h`: odd columns sit half a hex higher.
3. Key: `hexagon(X, cy, 21).buffer(-6.0)` (seam), then `buffer(-2.6).buffer(2.6)` (round).
4. Net `K(c * 3 + r + 1)`; note `semi = 48 + 2r + (1 if c odd) + 6c`; label `NAMES[semi % 12] + octave`.

The generator's key stats come from a proxy: `ELEC` is `hexagon(cx, cy, s - seam)`, circumradius 15 (line 279), so the gate and the shipped stats report 585 mm2 and 28.1 x 26.0 mm (`key_w = 2 (s - seam/sin 60)`, `key_h = sqrt(3) (s - seam)`, lines 311 to 314, 499 to 501). The copper key itself is `hexagon(21).buffer(-6)` then rounded 2.6, a hex pulled in 6 mm per edge: 512.2 mm2 and 27.3 x 24.4 mm across (computed 2026-10-05 with shapely 2.x over the same construction). So the stat overstates the plate by about 14 percent and the height by 1.6 mm; `key_w` matches the copper before rounding, `key_h` does not. The vinyl overhang gate tests the larger proxy, so it stays conservative.

### 5.2 Zigzag grout ribbon routing

What it does: the grout between two key columns is a zigzag through the facing hex vertices, and the traces run down it, so the columns stay interlocked.

Construction (lines 121 to 182):

1. `ribbon(c)`: collect every key centre y of columns c and c-1, add a point half a hex above the top and below the bottom; at each y take x = `X - s` if a column c key is nearer, else `X - dxc + s` (the facing vertex of column c-1).
2. Per column, nets sorted top first (ARC A joins column 0 above every key); `SHIFT[net] = 3.2 * (i + 0.5)`: the top key takes the innermost shift.
3. A key taps out of its left flank at `cx - s + ero + 1.6` (`ero = 6.0 / sin 60`, how far the erosion pulls a vertex in x), enters its column's shifted ribbon at its own height (interpolated on the segment that spans that y), and follows the ribbon down; column 0 instead runs to a straight channel at x 34 plus its shift.

Why a shift works: shifting the whole zigzag sideways by d keeps a constant perpendicular gap of `d * sin 60`; at 3.2 that is 2.77 mm (computed), at least `tw + clr = 2.5`.

Gates (lines 341 to 349): per channel, sub-lane spacing times sin 60 at least 2.5; no ribbon carries more than rows + 1 traces. Computed: channel 0 carries 4 traces, channels 1 to 4 carry 3.

Failure story: straight vertical channels needed more than a hex width between columns and the honeycomb fell back into separate strips (README).

### 5.3 Isomorphic interval gates

What it does: the generator proves the layout is isomorphic, so a dimension change cannot silently break the fingering.

Construction (lines 318 to 339): `semi(c, r)`; vertical set over every column pair (r, r+1) must equal {2}; for each key the physical neighbour up-right is `(c+1, r)` from an even column and `(c+1, r+1)` from an odd one, down-right `(c+1, r-1)` or `(c+1, r)`; those interval sets must equal {7} and {5}; no duplicate notes; range at least 24 semitones; at least 6 of the 7 diatonic degrees of the home key. Computed: {2}, {7}, {5}; 15 distinct notes C3 D3 E3 G3 A3 B3 C4 D4 E4 G4 A4 B4 C5 D5 E5; range 28; 6 of 7 degrees (no F).

### 5.4 Long sliders: flanks and top arc

Flanks (lines 185 to 201): x (12, 32) and (216, 236), y 64 to 186, `lin_off 6`, thin end 3.0; A thick at the bottom, B thick at the top; B escapes sideways along `ly1 - 1.6` to corridors x 5.5 and 242.5.

Arc (lines 203 to 222): centre (124, 160.7), r 56 to 68 over 38 to 142 deg with a 4 deg end offset; both ends step up to `arc_run_y 189`, run sideways along that clear row, then A joins the leftmost key channel (x 34 plus its shift) and B drops at x 208, right of the keys.

Gates (lines 350 to 382): flank spans (computed 0.827 to 0.173 over 122 mm); arc span (computed 0.204 to 0.758), sweep over 70 mm (computed 108); straight sliders at least 55 mm; sliders clear the honeycomb by at least 0.9 (computed 11.00); sliders inside the keepout.

### 5.5 Rail and ranked fan

21 fingers 9 wide on an 11 pitch, depths 16 and 11, lanes y 54 down on 3.0 (12 lanes); the TESSERA constraint ranking (lines 224 to 259). Computed: 3 of 12 lanes. The 2 mm side gap is "comfortable with mini alligator clips, fiddly with full-size ones" (README).

### 5.6 Faceplate and accents

`VINYL` as the family, overhang 1.4; hex inlays `hexagon(cx, cy, s - seam - 2.6)`; arc and flank faces (lines 278 to 290). The faceplate prints note names at cap 7.5, nine graduations per slider marching up the flank, and the interval line (lines 452 to 467).

### 5.7 Read model

As SPLINE; a key touch shows its note from `G.notes` and the interval rule (`SIM` lines 232 to 236).

### 5.8 Constructions the first pass left out

**Note map and rail order (measured from f06, consistent with `GEN` lines 144 to 148 and 225).** Column c, row r carries `48 + 2r + (c odd) + 6c`: column 0 C3 D3 E3, column 1 G3 A3 B3, column 2 C4 D4 E4, column 3 G4 A4 B4, column 4 C5 D5 E5. Within a column the top key arrives first along the rail because it takes the innermost ribbon shift, so the rail runs SL1 B, SL1 A, ARC A, E3 D3 C3, B3 A3 G3, E4 D4 C4, B4 A4 G4, E5 D5 C5, ARC B, SL2 A, SL2 B; finger 1 is deep and depths alternate. Rail x0 = 124 - 20 * 11 / 2 = 14 (computed).

**Flank wedge shape (`GEN` lines 185 to 201).** Vertical, 20 mm wide: `wsum = 20 - 1.4`, `hmax = wsum - 3.0` = 15.6; A hugs the inner left edge x `lx0`, thick (15.6) at y 64 and thin (3.0) at y 180; B hugs `lx1`, thick at y 186 and thin at y 70. A escapes down at its thick end (`lx0 + hmax/2`, `y0 + 1.6`); B escapes sideways along `y1 - 1.6` to the corridor outboard of the slider.

**Faceplate art (`GEN` lines 448 to 481).** Note names at cap 7.5, Plex Mono 700, at key centre minus 3.6; `ARC` at cap 2.4 above the flank tops (`ly1 + 3.5`); nine radial arc ticks; `SL1`, `SL2` labels at `ly1 + 2.6`; nine 1.8 x 0.7 graduations per flank placed outboard (left of SL1 at `lx0 - 3.0`, right of SL2 at `lx1 + 1.2`) on the read window `y0 + 6` to `y1 - 6`; the line `FRET REV A  .  WICKI-HAYDEN  .  UP +2  UP-RIGHT +7  DOWN-RIGHT +5` at (126, 47) and the tagline at (126, 42). The printed faceplate strokes every key's proxy hex, the arc face and both flank faces with a 0.35 ink line, so the honeycomb reads as outlined cells on the paper. Brand: mark 12 mm at (8, 30), wordmark cap 5.0 from x 22, below the left flank; `FRET_BRAND=1` moves it into copper.

**Shipped JSON extras (`GEN` lines 494 to 496).** `columns` (the five column x values), `ribbons` (the zigzag centreline polylines for columns 1 to 4, unshifted) and `notes` (net to note name) ship with the geometry, so a port can redraw the grout routing and label keys without rerunning the lattice math.

---

## 6. UX anatomy

KEYWAY family shell with hex hit paths and note names in the readout. The excellence of the design: musical structure enforced as a gate, honeycomb kept by routing in the grout, and three long expression sliders where the thumbs rest.

## 7. Known limits and failure lessons

1. Viewer `S.span` throw (`SIM` line 275), no tab bar (measured).
2. Docstring drift: it describes 16 keys in a 4x4 lattice, 22 channels, two sliders across the top at 78 and 56 mm and a 91 mm arc (`GEN` lines 9 to 17); the code builds 15 keys (5 x 3), 21 nets, 122 mm flank sliders and a 108 mm arc.
3. The final console line prints "keys 42 x 36 mm" from the un-seamed hex (`GEN` lines 512 to 514); the gate and stats say 28.1 x 26.0.
4. Viewer copy drift: rail heading "18 contacts" (`SIM` line 98); "CAP1188 x3, 24 channels, 18 used" and "drop a slider and two blades" (lines 260 to 261), copied from SPLINE; `r-c` is written twice in a row (lines 232 to 233).
5. No F in the home key (6 of 7 degrees); `base` transposes.
6. Font and logo inputs absent from the bench folder.
7. More docstring and title drift: the docstring (lines 19 to 23) still says straight vertical channels between the key columns are the routing, which is the failed revision; the copper layer title says "16 hex keys, 3 sliders, 22 finger rail" (line 441).
8. No vinyl overhang gate for the flank sliders: SPLINE and TESSERA gate both straight sliders (`vinyl overhangs both straight sliders`); FRET gates the 15 keys and the arc only (lines 399 to 401). The flank sliders sit inside the vinyl in the shipped files (inferred from the outline offsets: slider x 12 to 236 against the vinyl at 2.0 from the edge), but no gate holds it.
9. Flank slider readout inverted, as SPLINE (`SIM` lines 203 to 205): "% from the bottom" prints `t * 100` where `t` is 1 at the bottom (inferred; no shot drives a flank slider).
10. Key stats overstate the plate (section 5.1): 585 mm2 reported, 512 mm2 of copper (computed).

## 8. Tests and harness

95 in-generator gates, 95 of 95 (computed), worst 1.000 mm at K10/K15.

## 9. Port map

| item | value |
|---|---|
| packages | `copper` (hex lattice, zigzag ribbon sub-lanes, ranked fan, rail, long sliders), `geom` (hexagon, erode, polyline shift), `circuit` (key note map, channel budget 21 of 24) |
| feature kinds | `conductor`, `pad`, `window`, `lamination` |
| canon ids | `hex-key` (proven, FRET provenance, CANONS.md line 585); `arc-slider` (line 582; FRET not in its provenance); `wedge-pair-slider` (line 581; FRET not in its provenance) |
| canon MISSING | zigzag ribbon routing through an interlocked lattice; isomorphic interval gate (lattice basis plus expected interval per move); arc end run along a clear row |
| reference ids | `surfaces/fret-hex` (INDEX, FRET) |
| milestone | M05 (95 gates, MILESTONES.md line 62), M06 |
| lineage row | MISSING |
