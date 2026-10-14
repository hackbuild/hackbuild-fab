# GIB: how it is made

Printed linear sliders as a single file bench. Two independent choices: BODY flex (all TPU, conductive TPU electrodes) or rigid (PETG, conductive TPU or conductive PLA electrodes), and SENSE touch (capacitive interdigitated segments flush in one slab), finger (bare pot: the fingertip is the wiper) or membrane (pressed pot: a TPU sheet with a conductive strip closes onto a resistive track). No Velostat anywhere. The L x W you type is the L x W you get; internals narrow in a fixed order and the status strip says so.

Number rule: constants are bench defaults in `fab-knowledge:originals/gib/files/src/src/part2.js` at the line named; readouts quoted from shots are computed by the bench; harness results are as stated by the README (not rerun here, marked so).

Folder: `fab-knowledge:originals/gib/`.

## 1. Identity and revision

| field | value |
|---|---|
| owner name | GIB |
| slug | gib |
| canonical revision | `gib (4).html` (= harvested `fab-work-directory:benches/gib/outputs/gib.html` = `gib (5).html` of 2026-09-15), 2026-09-11 18:24, 1000777 bytes |
| sha256 | `4baf10ed14f714575dee28940687e063488203a3954836e3613f0eb81ca204b7` |
| copy here | `fab-knowledge:originals/gib/files/gib_4.html` |
| sources | `fab-knowledge:originals/gib/files/gib-src.zip` (sha256 `7b2b8d2c2588bdd08fd1669c1ec6bd6452ef6ab8c0ea4713a98ff5994054245c`) unpacked to `fab-knowledge:originals/gib/files/src/`: `src/part1.html` (shell, 264 lines), `src/part2.js` (kernel and physics, `GIBCORE`, 562 lines), `src/part3.js` (UI, viewer, hookup, exports, 313 lines), `build.py` (baker), `harness.py` (Playwright), `sweep.js` (node sweep and liveness), `diag.py` (trimesh edge audit) |
| exports | `fab-knowledge:originals/gib/files/gib-example-touch-flex-60x14.3mf`, `fab-knowledge:originals/gib/files/gib-example-membrane-flex-60x16.3mf`, `fab-knowledge:originals/gib/files/gib-example-finger-flex-60x14.3mf` (bench examples), `fab-knowledge:originals/gib/files/gib-finger-rigid-60x16.slicer-save.3mf` and `fab-knowledge:originals/gib/files/gib-finger-rigid-200x14.slicer-save.3mf` (owner slices, 2026-09-11 18:31 and 20:27), `fab-knowledge:originals/gib/files/GIB-README.md` |

### 1.1 Revision table

| Downloads file | date | sha256 (first 8) |
|---|---|---|
| `gib.html` | 2026-09-11 17:53 | `7e3b6898` |
| `gib (1).html` | 18:01 | `2f48a99e` |
| `gib (2).html` | 18:07 | `55a50645` |
| `gib (3).html` | 18:19 | `0085f4df` |
| `gib (4).html` | 18:24 | `4baf10ed` (canonical; `(5)` of 09-15 identical) |

Why (4): newest, identical to the harvested release that ships the README, the source zip and the harness; the owner sliced rigid finger pots from it at 18:31 and 20:27 the same evening (60 x 16 and 200 x 14).

## 2. What it makes and for whom

A maker who needs a slider of a given footprint (a wrist strap, a panel strip, a 200 mm fader) prints it in two or three filaments and wires it as a touch strip, a three-wire pot or a pressed pot, with the bench telling them in numbers whether it will read and how to wire it.

## 3. Shots

Driven with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, 1280 x 860, ready 2.5 s (measured), zero page errors.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/gib/shots/gib-welcome.png` | boot: welcome card (start blank, worked example) over step 1 TYPE with SENSING cards (touch, membrane, finger), BODY cards (flex, rigid), ELECTRODES chips |
| `fab-knowledge:originals/gib/shots/gib-touch-print.png` | worked example 80 x 16 touch in step 4 PRINT: TRY IT finger slider with per-pad delta bars, WILL IT WORK (6 pads pitch 12.9, 126 mm2 each, 0.48 TPU cover, base 10 pF, touch delta 7.4 pF (71 percent), electrode R 27.2 kohm, RC 485 ns, linearity worst 1.91 mm of 78, no dead spots), HOOKUP schematic and wiring text; status `mesh current`, `fits bed` |
| `fab-knowledge:originals/gib/shots/gib-membrane-print.png` | membrane 60 x 16 flex: track 785.2 kohm, end resistance, wiper source 897.8 kohm, gap 0.24, press to close 0.75 N; amber warnings in the status strip (thickness raised to 2.16, narrowed to fit the width with the new values) |
| `fab-knowledge:originals/gib/shots/gib-membrane-explode.png` | step 2 SHAPE with EXPLODE: the membrane sheet lifted off its pocket, the track and collector post visible, the three end pads |
| `fab-knowledge:originals/gib/shots/gib-finger-rigid-print.png` | finger pot 200 x 14 rigid PETG with conductive PLA: track 75.5 kohm, return 106.9 kohm (59 percent of the range, warned), bus 100.2 kohm, skin 300 kohm assumed, cap at W 10 nF settling in 20 ms |
| `fab-knowledge:originals/gib/shots/slicer-finger-rigid-200x14.png` | the owner's slice of the 200 x 14 rigid finger pot |

## 4. Mechanisms, circuits and constructions

### 4.1 Constructive prism mesher with nudge and jitter

`part2.js:59` to `128`, print-forge route B: a part is a stack of watertight prisms in one mesh; same-part prisms overlap `EZ = 0.02` in z; different parts abut exactly.

1. `Mesh.prism(outer, holes, z0, z1)` only queues; triangulation happens at `part()` (`:62` to `65`, `:127`).
2. `emit` (`:66` to `118`): `cleanLoop` removes duplicate and exactly collinear vertices (`:26` to `40`), orient outer ccw and holes cw, earcut, then if any triangle is a sliver (three loop vertices in line: a tooth level with a pad edge, holes on one line) nudge every vertex by a sub-micron hash (4e-4) and retriangulate, up to four attempts; write the nudge back into the caller's polygons so a polygon used as a hole in one part and as an outer in another still matches; walls per loop.
3. `settle()` (`:119` to `126`) re-emits every queued mesh once more if any nudge fired.
4. `jit(L, k)` (`:56`): every hole gets its own sub-micron y offset (up to 2e-3) and x offset (4e-4) at construction, because earcut bridges holes with horizontal cuts and two loops on one exact y line emit slivers.
5. Build order rule (`:232` to `237`): parts that use a polygon as an outer go first, so any nudge is written back before the same polygon is used as a hole in the body.

### 4.2 Footprint contract and layer stack

`build()` (`:158` to `174`): corner radius limited by the margin (`(m - 0.3) x 3.4`); thickness rounds to layers and the floor takes the extra; minimum stacks at 0.24: touch `floor 2 + electrode 2 + cover 2 layers` = 1.44, finger 0.96, membrane 2.16 (README; computed from `blankState`, `:131` to `145`). Narrowing order: membrane track, ledge, post, return, pads (`:272` to `280`); finger track, bus, return, pads (`:359` to `366`); touch pad then segment count (`:185` to `190`). Each narrowing pushes a warning with the new values.

### 4.3 Touch slider (capacitive, canon capacitive-plate family)

`buildTouch` (`:176` to `243`), defaults `touch: { n 5, teeth 2, depth 0.6, gap 0.8, cover true, coverLayers 2 }`, `pad 4`, `margin 1.2`, `clear 0.8` (`:134` to `135`):
1. Segments on pitch `P = (L - 2m)/N`; N drops until `P - gap - 0.6 >= 1.6`.
2. Boundary k is a polyline from `yb` to `yt` with K teeth of depth `D = depth x (P/2 - gap/2 - 0.3)`, hashed sub-micron x offsets; K 0 gives a straight wedge boundary.
3. Each segment polygon: left boundary shifted `+gap/2`, right `-gap/2`, a pad tail of width `min(pad, span - 0.6)` down to the margin, rounded outer corners on the end segments.
4. Prisms: electrodes from floor top `f` to `f + e`; body floor with wire holes; body band around the electrodes `f - EZ` to `f + e + EZ`; cover with pockets over the pads to T.

Physics (`physicsTouch`, `:446` to `485`): finger a grounded 80 mm2 disc; touch delta `E0 er 80 / cover` pF (100 pF bare), times `min(1, max area / 80)`; base C per pad `8 E0 sqrt(A/pi) + 10` pF; worst electrode R `rho x 10 x (H + pad) / (wMean x e)`; RC; linearity by sweeping a 4.5 mm radius finger disc at 42 positions (`sweepTouch(G, 41)` steps 0 to 41, inset by the disc radius at both ends) over the real polygons on a 14 x 14 sample grid with point-in-polygon, centroid of area deltas, linear fit, worst residual; dead spot where the delta sum is under 0.05 (`sweepTouch`, `fingerDeltas`, `:486` to `516`). Notes: delta under 8 percent of base; R over 200 kohm; over 30 kohm calibrate; centroid error over 0.35 P add teeth; electrode height under four covers.

Hookup (`part3.js:216` to `232`): one wire per segment; ESP32 touch pins, MPR121 (longer CDT above 30 kohm), or CapacitiveSensor with 1 Mohm; position by weighted centroid after baseline subtraction, ignore deltas under 10 percent of the largest.

### 4.4 Finger pot (bare, canon finger-pot)

`buildFinger` (`:339` to `396`), defaults `fin: { tw 4, bw 2.5, rw 2.5, gap 1.5, rgap 1.2, skin 300 }`:
1. Three pads stacked across the near end edge, each level with its own lane so nothing crosses: B on the return lane along the bottom edge, W on the collector bus, A on the track at the top.
2. A pad, track, far end bar, return lane and B pad are one conductor polygon; W pad and bus another; both flush from floor top to T.
3. Warnings: bus plus gap plus track over 10 mm (a fingertip spans about 10); return lane within 4.5 of the finger line.

Physics (`:397` to `430`): `Rtrack = rho x 10 x L / (tw x e)`; `Rret` along the return; `Rdead` half the A pad plus the return; worst `Rbus`; skin 300 kohm (assumed); `Rsrc = skin + bus`; cap at W chosen so `5 ms / Rsrc` rounds down to 100, 47, 22, 10, 4.7 or 1 nF; settle `5 Rsrc C`. Notes: skin cancels once the cap settles; return over 35 percent of range; track over 2 Mohm loads like skin. Sim `simFinger` (`:431` to `437`).

Hookup: A to 3.3 V, B to GND; W to an ADC with the chosen cap at the pin; position calibrated at both ends; touch detect without a pull-down by swapping A and B and checking V1 + V2 near supply; median of five samples.

### 4.5 Membrane pot (pressed, canon membrane-slider-gib)

`buildMembrane` (`:245` to `337`), defaults `mem: { tw 5, gapLayers 1, ledge 1.2, cs 2.4, fit 0.15, rw 2.5 }`:
1. Same three-pad end edge; W pad feeds a lead band that rises into a square collector post `cs` under the strip.
2. Track A, far bar, return and B one conductor polygon at `f` to `f + e`; the post from `f + e - EZ` to the strip face.
3. Body: floor, band around the conductors, an active hole with ledges over the track up to the sheet bottom, a pocket `ledge` wider for the sheet to T.
4. Membrane object: TPU sheet inset by `fit` 0.15 in the pocket from the sheet bottom to T, and the conductive strip from `xa0 + 0.6` to `xa1 - 0.6` on its underside, hooked over the post.
5. Print pose: membrane and strip flipped about their own long axis (strip on top) and laid beside the body as a second object (`:326` to `332`).

Physics (`:517` to `550`): track, dead end under the A ledge, return, wiper source `strip + post + lead`; press force `F = 48 E I gap / a^3` with `I = 10 t^3 / 12` (10 mm finger, simply supported across the active width, E of flex TPU 25 MPa). Notes: Rsrc over 100 kohm wants 100 nF and slow sampling or a follower and any pull-down at least 20 x Rsrc; return over 35 percent; track over 1 Mohm; F over 1.5 N too stiff; under 0.05 N may sag closed.

Hookup: slide pot wiring, pull-down at least `max(1 Mohm, 20 Rsrc)`, 100 nF at the ADC, sample period `5 Rsrc 100 nF`, calibrate both ends; on or off only.

### 4.6 Materials and terminals

`COND` (`:10` to `13`): conductive TPU rho 1500 ohm cm (vendor datasheet, "Eel class"), er 5.0, E 25; conductive PLA rho 30 ohm cm along, 115 across (vendor, "Protopasta class"), rigid body only. `BODY` (`:14` to `17`): flex TPU er 5.0 E 25, rigid PETG er 2.6 E 2000. README: printed parts run 1.5 to 3 times the datasheet. The FILAMENT step carries a measurement recipe (`part1.html:229`): print a 40 x 5 x 0.48 bar, read ohms end to end, then `rho = R x 0.5 x 0.048 / 4` ohm cm (cross section 0.5 cm x 0.048 cm over 4 cm), and type that rho into the slot; every electrical readout scales with it (`part3.js:97`). Terminal options `hole` (wire hole `holeD` 2.2) or `pad`; pad and clearance set the pitch (2.0 and 0.54 give 2.54).

### 4.6a TRY IT simulators

`simFinger` (`part2.js:431` to `437`): the finger at fraction `pos` of the travel splits the conductor into `Ra = (Rdead - Rret) + Rtrack pos` on the A side and `Rb = Rret + Rtrack (1 - pos)` on the B side, `V = 3.3 Rb / (Ra + Rb)`; the return lane and half the A pad are the dead resistance that keeps the reading off the rails. `simMembrane` (`:553` onward) does the same for the pressed pot and reports `floating (pull down reads 0)` when not pressed (`part3.js:205` to `207`). The touch card moves a disc over the real segment polygons and draws one delta bar per pad from `fingerDeltas`. The print card adds grams per slot from mesh volume and the Orca density table (`part3.js:210` to `212`).

### 4.7 Exports

`part3.js:267` to `306`: 3MF through print-forge `orca3mf.js` verbatim with each object recentred on the bed and the membrane offset in y; STL zip per object, part and slot plus print card and design.json; print card with GIB extras (sense, body, conductor at rho, stack, physics rows, hookup); design JSON save and open (with nested merge for `touch` and `mem`).

## 5. UX anatomy

Header GIB.BENCH with UNDO, REDO, OPEN, SAVE, GUIDE; steps 1 TYPE, 2 SHAPE, 3 FILAMENT, 4 PRINT with done ticks and a one-sentence guide per step (`part3.js:90` to `100`); welcome card with start blank and worked example; cams iso, top, front, under, plus ghost and explode toggles; legend per slot; rail panels per step (SENSING and BODY type cards, ELECTRODES chips; FOOTPRINT and the per-mode panel; slots with measured rho; TRY IT, WILL IT WORK, HOOKUP, exports); status strip with dims, kilo tris, ms, `mesh current` or `stale`, `fits bed` or `over bed`, and every warning as its own chip. Undo and redo as JSON snapshots 80 deep; 200 ms debounced rebuild (`part3.js:7` to `28`). Hook `window.GIB = { state (get, set rebuilds), build, exportBytes(kind), snapshot, pause, core }` (`part3.js:310`), kinds `3mf`, `stlzip`, `card`, `json`.

What makes it excellent: the footprint contract and the narrowing warnings; physics readouts that say in words when a design will not read and what to change; a hookup card per mode with values filled in from the build; a liveness test that catches dead parameters; a live TRY IT that moves a finger over the real polygons.

## 6. Tests and harness

- `fab-knowledge:originals/gib/files/src/sweep.js`: seeded LCG (seed 777), 600 random states over every sense, body, conductor and terminal; pass if no throw, every edge used exactly twice, no NaN, unless a "too small" warning excuses it; readouts free of NaN and Infinity; warning histogram; liveness per sense: every numeric param times 1.3 plus 0.3 must change a position hash, dead params listed.
- `fab-knowledge:originals/gib/files/src/harness.py`: Playwright chromium with swiftshader, ten named cases through `GIB.core.blankState()` and `GIB.state`, exports 3MF and STL zip through the hook, screenshots, scrollWidth at 390, 768 and 1280, console errors.
- `fab-knowledge:originals/gib/files/src/diag.py`: trimesh edge audit of a 3MF.
- README result (stated, not rerun here): 600 random sets manifold outside "too small" warnings; 20 designs through browser export and `validate_3mf.py --overlap` all pass; no console errors; no sideways scroll.

## 7. Port map

| item | value |
|---|---|
| packages | mesh (constructive prisms with nudge and jitter), circuit (touch, finger and membrane physics), constraints (footprint contract and narrowing order), 3mf (orca3mf), ui-core (hook, harness, hookup card) |
| feature kinds | conductor, pad, port, pocket (membrane pocket, active hole), contact (strip on post, membrane to track) |
| canon ids | membrane-slider-gib (proven), finger-pot (proven), capacitive-plate (proven, for the touch strip) |
| canon MISSING | interdigitated toothed touch-segment slider as its own archetype (the touch mode is closer to wedge-pair-slider than to a single plate); footprint contract narrowing order as a constraints rule |
| reference ids | sensors/membrane-slider-gib, sensors/finger-pot, sensors/capacitive-plate (named in CANONS.md; no folder under `reference/` yet) |
| reference MISSING | touch-segment slider |
| milestone | M01 (constraints), M05 (circuit), M06 (canons), M09 (bench conformance, hook) |
| lineage row | MISSING |
