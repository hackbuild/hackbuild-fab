# BOSS (BOSS.bench): how it is made

Record id: originals/boss. Written 2026-10-05 from the original sources in `boss-src.zip`, read in full (vendor libraries skipped). Family: blocks. BOSS is the first build of the system later renamed BLOCKS; the canonical design of the family is BLOCKS (`fab-knowledge:originals/blocks/RECORD.md`). BOSS is kept as its own original because it is the only build that ships its sources, node and Playwright harnesses, 21 validated example 3MFs, and the standard (BOSS v1) the plan's M05 reproduction and the `boss-v1` stud preset are written against.

Qualifiers: `measured` (a run in a browser or validator, with date), `computed` (node rerun of the shipped sources on 2026-10-05, or arithmetic on code constants), `inferred`, `vendor`, `unknown`, or a source file and line.

---

## 1. Identity and revision

| File | Modified | Bytes | sha256 | Status |
|---|---|---|---|---|
| `fab-work-directory:benches/blocks/outputs/boss/boss.html` | 2026-09-14 19:51 (harvest copy) | 1131340 | `00badce59c6638dbfd6c920bed481d93a683c605330780fb197686cda4e413f5` | CANONICAL; same bytes as `~/Downloads/boss.html` (2026-09-14 00:46) |
| `.../boss/boss-src.zip` | sources stamped 2026-09-13 22:05 to 23:17, README 2026-09-14 00:44 | 76002 | `185c1d1bb6692945a3d2b956c7512ee7fd3b9766576396f404d2501a28ffa3b2` | sources and harnesses |
| `.../blocks/outputs/boss-examples.zip` | | 16508691 | `df211c444d19c2cba0c2b2c1b2e32e8746141c17aa097fc11b7892ece583e146` | same 63 files as `boss/examples/`; not copied (duplicate) |

Chat: `c2b7c4cb-48e4-42f8-9a75-648e4d019868`, "Modular 3D printed electronics system" (`fab-knowledge:sources/benches/benches-conductive-b.md`). There is one BOSS revision; it is canonical by being the only one. It is good: every part builds clean, 21 of 21 shipped 3MFs pass `validate_3mf.py --overlap` (measured 2026-10-04, benches-conductive-b.md B.11), zero console errors when driven (measured 2026-10-05, gold note 2.3). It is superseded as a design by BLOCKS (later the same day).

## 2. What it makes and for whom

The same system as BLOCKS (stud and socket electronics in four filaments, PETG, conductive PLA, TPU 95A, conductive TPU), at the first standard, with ten parts: SEAT, PLATE, WIRE, JUMPER, TOUCH, FORCE, BUTTON, SLIDER, LAMP, RESISTOR. For the same maker. The README (`files/README.md`) states the number that matters: pin to stud paths 5 to 50 kohm, cTPU wire about 1 Mohm per 80 mm, cPLA core about 20 kohm; fine for GPIO through ADC, touch, dividers and faint LEDs, not for motors, LED strips, or an internal pullup.

## 3. Files in this folder

`fab-knowledge:originals/boss/`, sha256 of every file in `SHA256SUMS`.

| Path | What |
|---|---|
| `files/boss.html` | the bench, one file, `file://` |
| `files/boss-src.zip`, `files/boss-src/` | sources (`src/kernel.js`, `boss.js`, `parts.js`, `sim.js`, `export.js`, `app1.js`, `app2.js`, `app3.js`, `shell.html`), `build.py`, `package.json`, `test_parts.js`, `sweep.js`, `test_sim.js`, `test_sim2.js`, `export_all.js`, `smoke.py`, `browser_sweep.py`, README |
| `files/README.md` | the shipped README |
| `files/examples/boss-seat-pico-snap.3mf` and `-print-card.txt` | Pico snap seat export |
| `files/examples/boss-example-scene.3mf` | the worked example scene on one plate |
| `files/examples/boss-wire-spiral-200.3mf` | the coiled wire |
| `files/examples/boss-button-print-card.txt`, `boss-seat-c3mini-press-print-card.txt` | print cards |

Line references are to `files/boss-src/src/<name>.js`.

## 4. Shots

`fab-knowledge:originals/boss/shots/`: six from the gold drive (1280 x 860, headless Chrome, 2026-10-05) and one shipped with the bench (`screens/`). Each was opened and looked at.

| Shot | Shows |
|---|---|
| `boss-d-01-welcome.png` | welcome card over the default seat: name, paragraph, four step grid, `start with a seat` and `worked example scene` |
| `boss-d-02-part.png` | C3 SuperMini press seat, 6 x 5 studs: black cPLA conductive studs on the perimeter, cream PETG plain studs, the header pin rows |
| `boss-d-03-part-readout.png` | the same seat with READOUT (seat height 11.28 mm, 47 layers; routed 16/16 on 8 L1 / 8 L2; pin to stud 6.1 to 19.4 kohm) and the green checks line |
| `boss-d-05-build-example.png` | BUILD with the worked example: PLATE 10 x 8, seat, button, lamp, resistor, touch, five pink schematic wire arches |
| `boss-d-06-build-result.png` | BOARD PINS (IO2 analog read 245 counts, 0.20 V: the pressed button ties IO2 to the seat GND column, which sits 0.20 V up on the lamp's return current, see 5.13) and RESULT (LED 0.02 mA faint) |
| `boss-d-07-print.png` | PRINT this part with EXPORT and PRINT NOTES |
| `boss-pico-snap-seat.png` | shipped screen: Pico snap seat with its lid printed flat beside it (pink TPU ribs and hooks standing up); no hinge knuckles are visible above the body and the status reads 56.0 x 88.0 x 28.00 mm, because the knuckles are built under the body (5.5) |

---

## 5. Mechanisms, circuits and constructions

Most constructions are the same code BLOCKS later refined; each section below states the BOSS form and its constants. Read the BLOCKS record for the shared algorithm detail (kernel, Body, router, net check, solver).

### 5.1 BOSS v1 standard

`boss.js:5-25`: layer `L` 0.24 and `snap` to it. `P` 8.0, stud 4.8 x 1.8, `plateH` 3.2, `brickH` 9.6. `sockH` 2.4 (1.8 stud plus 0.6 headroom). `sockID_flex` 4.6 (0.2 interference). `sockID_rigid` 5.0 (prints about 4.85, inferred). `sockOD` 6.6. `flangeH` 0.72. `postD` 3.0. Press pin pad `padW` 1.8, `boreD` 0.9, `boreInPad` 1.2 (0.64 square pin in a 0.9 bore that prints about 0.75, inferred). `L1` 3.36, `traceT` 0.72, `gapT` 0.48, so L1 3.36 to 4.08, PETG to 4.56, L2 4.56 to 5.28, `padTop` 5.28 (computed). `traceW` 1.0, `clr` 0.6, `cell` 0.4. `voidID_plain` 5.0.

Slots (`boss.js:28-33`) and `barR` (line 38) as in BLOCKS. At 1.0 x 0.72 cPLA a trace is 416.7 ohm per mm (computed).

This is the `boss-v1` preset of canon `blocks-stud` (CANONS.md) and the standard of the M05-T07 table.

### 5.2 Body, kernel, router, net check

`Body` (`boss.js:42-88`): the negative space builder (PETG per band = outline minus features, 0.013 band overlap, 0.015 minimum breakpoint spacing, cross slot overlap above 0.005 z and 1e-3 mm2 is an error). No strip splitting (BLOCKS added `bandPrism`). Kernel (`kernel.js`): same as BLOCKS except no polygon clipping retry and 6 triangulation tries instead of 14; `flipZ` is the print pose flip. Router (`boss.js:132-256`): grid A* on 0.4, dilation 1.1, trace stamp 1.6, shortest first, bend cost 4, soft rip up cost 60, max 60 rips; no shared lanes per group. Net check (`kernel.js` `netCheck`, tol 0.02, area 1e-4) and `finish()` (`parts.js:46-69`) give OPEN, SHORT, tap misses and the vertex merge audit.

### 5.3 The stud column (canon `blocks-stud`, preset `boss-v1`)

`column` (`boss.js:93-110`): cTPU ring `ring2(OD 6.6, ID 4.6)` from 0 to 2.4 with a void core; cPLA flange d 6.6 from 2.4 to 3.12; cPLA post d 3.0 from 3.10 to the top (or `postZ0` when there is no socket); a 0.04 post tip and a cPLA stud 1.8 above the top. Taps at the post (`postTop - 0.5`) and in the ring wall. Options `stud`, `socket`, `top`, `name`, `ringSlot`, `sockID`, `postZ0`, `postTop`. `plainColumn` (lines 112-117): a 5.0 void socket and a PETG stud. Contact model `postR(top) = barR(30, top - L1, pi 1.5^2) + 400` (`parts.js:456`).

### 5.4 Press pin pad

`pinPad` (`boss.js:119-127`): a cPLA block 1.8 square from L1 to `padTop`, a bored collar 1.2 above it (0.9 bore through the collar), and a void pin bore 0.9 to the top. The header pin tip seats in a cPLA cup. Unselected pins get a plain 0.9 bore.

### 5.5 SEAT (canon `blocks-board-seat`)

`parts.js:72-262`. Same boards table as BLOCKS (pad maps inferred). `autosize` (lines 72-85): press `halfNeed = w/2 + 0.8`; snap `w/2 + 0.2 + 1.2 + (pin 0.3 + 4.4, hooks 1.6 + 0.9) + 0.3`; lanes from `laneStart = rowX + padW/2 + clr + traceW/2` at 0.8 pitch, need `ceil(nSel/2) + 2`. Targets and routing as BLOCKS. Press height `snap(5.28 + 1.2 + (pinLen - 1.2), up)`, `pinLen` 3 to 8 (default 6) gives 11.28 (47 layers, computed). Snap mode: body 9.6; cPLA contact bumps 2.0 x 1.4 from L1 to `top + 0.48`; PETG rails 1.2 thick, `0.48 + t + 0.3` tall; end walls with a 10 mm USB notch; hook pockets 1.6 x 6.8 x 3.0 with a 0.6 x 0.8 undercut; lid 2.4 thick printed flat beside the body, inner face up, window with 4 mm and 3 mm bars; TPU ribs 1.2 wide 0.72 tall standing up; TPU hooks with 0.5 barbs; filament pin hinge with two body knuckles r 2.2, 6 mm long, at `+-(l/2 - 4)` and one lid knuckle, bores d 2.0 for two 8 mm bits of 1.75 filament (BOM line).

Fits: press `pin bore engagement` = pinLen - 0.02 in 3 to 12; `pad web between pins` = pitch - 1.8 = 0.74 (min 0.6). Snap `rib press onto board` 0.3 in 0.2 to 0.6 (a constant); `rail to stud clearance` 5.0 (Pico, computed); `bump pitch web` 1.14 (min 0.6).

Run (computed, node rerun 2026-10-05): C3 press 6 x 5 (48 x 40), 65,768 tris, 16/16 on 8 L1 / 8 L2, pin to stud 6.1 to 19.4 kohm; Pico snap 7 x 11 (56 x 88), 128,656 tris, 30/30 on 16 L1 / 14 L2, 7.1 to 51.2 kohm. Other variants in benches-conductive-b.md B.6 (run 2026-10-04): Teensy press 6 x 12, 28/28, 6.9 to 19.4 kohm; Pico press all 40 pins 7 x 18, 40/40, 8.1 to 29.7 kohm.

Limits: the lid is printed flat but drawn unrelated to its closed pose, so no swing or knuckle gap check exists (BLOCKS added both); the hooks have no strain or closure check; bumps 0.48 proud on a non castellated Teensy land on annular rings (README open question).

Hinge knuckles land under the body (found in this check): the knuckle profiles are drawn in (x, z) and passed to `Mesh.prism(..., {axis: 'y'})` (`parts.js:210`, `235`), which maps polygon u to world z and v to world x. The knuckles therefore come out rotated 90 degrees with profile x as height: computed (node, 2026-10-05, Pico snap) the seat PETG mesh spans z -16.60 to 11.40 and the lid PETG z -16.59 to 2.40, and the shipped screen shows a 28.00 mm tall part with no knuckle on top. The export's `placeObjects` lifts each object by its lowest z, so a printed BOSS pin hinge seat would stand on the misplaced knuckles (inferred from `export.js`). BLOCKS added `prismY` (`blocks.js:251-258`, comment: "a side profile authored as (x, z) lands rotated 90 degrees and below the bed") and draws the lid closed for exactly this reason. Seat targets use the same `seatTargets` as BLOCKS, including the end cells on the opposite half (BLOCKS record 5.8).

### 5.6 PLATE with painted nets (BOSS only)

`parts.js:265-321`: cols x rows (default 8 x 8), 3.6 thick (15 layers: 0.96 floor, own L1 0.96 to 1.68, gap, own L2 2.16 to 2.88, 0.72 roof). Net cells get a cPLA post from 0.96 to the top, a post tip and a cPLA stud; others get a PETG stud. No sockets underneath (bottom ports false). Each painted net routes as a nearest neighbour chain through the router. Run (computed): 6 x 6 with two nets, 3 traces, 13.5 to 16.9 kohm. BLOCKS replaced PLATE with DECK (blank, nets, breadboard, with sockets).

### 5.7 WIRE (canon `blocks-wire`)

`parts.js:324-432`: shapes straight, arc, spiral (`r0 = max(4, 1.2 sheathW)`), zigzag, S; ends `stud` or `bare`. Core 1.2 wide from z 0.48 to 1.44 in a TPU sheath 3.2 wide and 1.92 tall built as three bands (full, holed around the core with 0.02 overlap, full). Stud caps 7.6 square r 0.8, `capH = sockH + flangeH + 2.16 = 5.28` (computed), with a cTPU ring 0 to 2.4, flange to 3.12, post to the cap top, stud above. Caps are separate TPU prisms beside a sheath cut 0.02 short of the cap (`capSq - 0.04`). A cTPU core ends in the ring wall (`4.6/2 + 0.3`), a cPLA core at the ring's outer face (`6.6/2`). Bare ends trim the sheath 5 mm. `R = barR(rho, len, coreW x 0.96)`; verdict thresholds 100 kohm and 1 Mohm as BLOCKS.

Run (computed): straight 80 cTPU 1.04 Mohm, 2,588 tris; spiral 200 (201.9 mm) 2.63 Mohm in 36.0 x 40.9 mm. Benches note (run 2026-10-04): zigzag 86 mm 1.12 Mohm; S 104 mm cPLA 27.1 kohm.

### 5.8 JUMPER and BUS

`parts.js:459-476`: 1 x n columns; bus mode an L1 bar 1.6 wide. Height select offers `plate 3.2` and `brick 9.6`, but the code builds `+p.h >= 9 ? 9.6 : 6.0`, so the plate option makes a 6.0 tall jumper that is no module (found in this read, line 462). Run (computed): bus 1 x 4 through R 665 ohm.

### 5.9 TOUCH

`parts.js:479-498`: 2 x 2, one flush cPLA pad 12 x 12 (8 to 13), 0.72 thick, on a centre post; delta C `8.854e-12 x 3.0 x 80e-6 / 0.5e-3` = 4.2 pF class (computed, model inferred). Control key `touched` matches the solver's `ctrl.touched`, so in BOSS the touch checkbox works, with one condition: the solver adds the finger only when a ground is already known (`if (gndKey && ctrl.touched)`, `sim.js:81`), so a TOUCH placed before the seat or SUPPLY is ignored (same code as BLOCKS; computed on BLOCKS, BLOCKS record 5.22). BLOCKS renamed the keys to `touch0..N` and broke it (BLOCKS record 5.16). Run (computed): lead 4.0 kohm.

### 5.10 FORCE

`parts.js:501-535`: comb as BLOCKS (6 fingers 1.0 over 11 mm, gap 1.00 computed); rim 1.2 tall; membrane TPU from 0.48 to 1.2 with a cTPU disc 0.48 underneath, exported flipped with `flip` about h 1.2, resting on a 0.24 ledge (comment). Same force model. Run (computed): lead 2.9 kohm; fit comb gap 1.00 in 0.6 to 3.

### 5.11 BUTTON: in place TPU cone switch

`parts.js:538-576`: one button on a 2 x 2 brick, terminals A and B on opposite corner columns. Well 3.7 deep, radius `coneD/2 - 1.2`. Contact gap `max(1.2, min(0.5 x 3.7, 0.45 x 3.7)) = 1.665`; `contactTop = top + 2.0 - 1.665` (cap assumed 2.0 above the deck when relaxed). Two cPLA half columns r 2.4 split by 1.2 from L1 to `contactTop`. Cone: TPU revolve, 40 deg, 0.6 wall, `hw = 0.933`, base 13, top hole 3.5, height 3.2 (computed). Cap: cTPU revolve 0.72 (3 layers) whose side follows the cone's inner wall line exactly, shrunk 1.5 um radially. Travel `(zc1 - 0.72) - contactTop` = 2.147 (computed); fit `travel under half the cavity` 1.2 to `cavD/2 + 0.3 = 2.15`, passes at its upper bound. On R `3e3 + leads + 2 postR` = 10.1 kohm (computed).

Limits: travel is 67 percent of cone height; the HAFT flex cone rule is about 45 to 50 percent (CANONS.md `flex-cone-key`); unverified on a print. Hookup "A to GPIO with INPUT_PULLUP, B to GND; reads LOW when pressed" is disproved by the bench's own solver (5.14).

### 5.12 SLIDER, LAMP, RESISTOR

- SLIDER (`parts.js:579-601`): fixed 4 x 2; cTPU track 26 x 3.5 flush beside a cPLA bus 2.0 wide 0.8 away; finger wiper `Rskin` 300 kohm (inferred); controls `pos`, `down` match the solver. Run (computed): track 136.9 kohm, lead 2.1 kohm.
- LAMP (`parts.js:604-628`): 1 x 3; LED bore `ledD + 0.4`, 5.0 deep; legs at +-1.27 into cPLA cups 1.8 square with 0.9 bores; `Rs = traces + 2 postR`. Run (computed): 7.2 kohm, 0.18 mA at 3.3 V, "dim, use a 5 V rail or a wider trace". Param key `ledD`.
- RESISTOR (`parts.js:631-660`): 1 x 2; meander legs 3 to 9 step 2 (5), width `legW` 0.8 to 2.0 (1.0), span 5.0, pitch `(12 - w)/(legs - 1)`; cuttable bridge per pair. Run (computed): uncut 6.3 kohm, +3.2 kohm per cut, 19.2 kohm all cut.

### 5.13 Scene, wiring and solver

Scene (`sim.js`): grid, quarter turn rotation, insertion order stacking, contact by coincident cell and height (keyed to 2 decimals) exactly as BLOCKS, without side tab `topZ`. Solver (`sim.js:63-140`): the same MNA, element set, 50 kohm pullup (line 91), 1e9 high impedance, 1e-12 leak, Newton up to 40 iterations, ADC 4095 counts, digital at 0.5 vio.

Wire tool (`app2.js:116-124`): click a stud, click a stud; length `max(20, ceil((d + 12)/5) x 5)` straight cPLA; the arch drawn is schematic (`lift = 8 + min(20, 0.15 d)`, `wireGroup`, lines 39-50), unrelated to the printed length. BLOCKS replaced this with the fitted printed length and solved arch.

Worked example (`app2.js:265-279`): PLATE 10 x 8 with nets `[[5,5],[9,7]]` and `[[0,0],[9,0]]`, seat C3 press at 2,1, BUTTON, LAMP, RESISTOR, TOUCH, five cPLA wires of 30 to 40 mm, IO2 ADC, IO3 OUT_H, IO4 ADC, button pressed. Measured (gold 2026-10-05): loads in 433 ms; lamp 0.02 mA faint; IO2 0.20 V, 245 counts. Computed (node rerun 2026-10-05, same scene): IO2 0.198 V pressed, 0.099 V released. The pressed reading is not a float: the button ties IO2 to the seat GND column, and that column sits 0.198 V above board ground because the lamp's 0.019 mA returns through the 10.4 kohm GND trace (pin to stud element `pin:GND`). Released, IO2 is the midpoint of two 1 Gohm paths. ADC mode has no pullup, so the example does not show a readable button. The example also wires onto ports with no peg: BUTTON A and B, RESISTOR A and B and TOUCH PAD are `top: false` (every cell is in `noStud`), which the wire tool itself refuses ("no stud there", `app2.js:117`); only `example()` bypasses it.

### 5.14 The undefined band verdict (origin)

Hint (`app2.js:236`): IN or PULLUP pin between 0.3 and 0.7 vio gets "sits at <V> V, in the undefined band: printed paths are kilohm class, so read it with ADC and a threshold, or use a stiffer external pullup."

Reproduced (computed, node rerun 2026-10-05; C3 press seat, BUTTON pressed, IO2 PULLUP, two straight wires IO2 to A and GND to B):

| Wires | IO2 pressed | 0.5 vio read | Band 0.99 to 2.31 V |
|---|---|---|---|
| 10 mm cPLA | 1.308 V | LOW | undefined |
| 40 mm cPLA | 1.624 V | LOW | undefined |
| 80 mm cPLA | 1.917 V | HIGH | undefined |
| 80 mm cTPU | 3.224 V | HIGH | reads released |

These equal the M05-T07 expected table (`docs/plan/milestones/M05-circuit-copper.md`), which extends it to 120 to 200 mm, zigzag and spiral, and per MCU pullup and threshold rows. `test_sim2.js` gives 2.05 V for an 80 mm cPLA S bend (benches-conductive-b.md B.8). Limits: fixed 50 kohm and 0.5 vio; the README says 45 kohm.

### 5.15 Export

`export.js`: `placeObjects` with `flip` (mirror about h; BLOCKS moved to a true rotation), `layoutScene` rows with 8 mm gaps on 256, Orca3MF with `DEFAULT_PRINTER` (Creator 5 Pro 0.4, `0.24mm Standard @FF C5`) and layer 0.24 (line 89), STL zip per mesh plus card and json, print card with per slot grams (Pico snap seat PETG 53.6 g, cPLA 5.5 g, TPU 0.2 g, cTPU 1.5 g, run 2026-10-04, B.9). Scene export lays every scene wire out as its own straight part.

## 6. UX anatomy

The shell BLOCKS kept: ink header with `BOSS.bench` in Permanent Marker and a pink period, tagline, undo, redo, open, save, guide; steps 1 PART, 2 MATERIALS, 3 BUILD, 4 PRINT; guide strip; void stage with graph rule, cams iso, top, front, under, x ray, legend, HUD, BUILD only tools move, wire, rotate, delete, run; welcome card with `start with a seat` and `worked example scene`; rail 340 px with CATALOG (10 tiles), PARAMETERS (schema rendered, pin set grid with `all pins` and `rails + 4 io`, plate net painter), READOUT and checks line, HOOKUP; FILAMENTS with resistivity; PALETTE, SCENE, SELECTED, BOARD PINS, RESULT; WHAT TO PRINT, EXPORT, PRINT NOTES; status strip chips. Hook `window.BENCH` (`app3.js:102-112`): `state`, `scene`, `goStep`, `run`, `example`, `setPart`, `exportBytes`, `ready()`. Save `boss-bench.json`. No drive pad.

What makes it excellent at this stage: the same E1 to E12 as BLOCKS except E1 (printed length wires) and E9 (recipes), which BLOCKS added; plus a full source tree with harnesses and a dash rule enforced at build time.

## 7. Tests and harness

| Harness | What | Result |
|---|---|---|
| `test_parts.js [id]` | every catalog part at named variants: audit, fits, nets, readout | all clean, zero warnings (run 2026-10-04, B.11) |
| `sweep.js` | 18 extra cases | clean, with vacuous cases: `pins: 'all'` (a string) builds a 0 pin seat that reports clean; `lamp {led: 3}` uses a key the generator ignores; `resistor {legs: 8}` builds although the schema steps 3 to 9 by 2 |
| `test_sim.js`, `test_sim2.js` | scenes: plate, seat, supply, lamp, wires; button on pullup | numbers in 5.14 |
| `export_all.js` | writes each example 3MF, STL zip and card | the 63 files in `examples/` |
| `smoke.py` | Playwright swiftshader at 1280, 768, 390: no sideways scroll, step shots, example run, 3MF through the hook into `validate_3mf.py --overlap`, console errors | not rerun here |
| `browser_sweep.py` | 21 cases through `setPart` and `exportBytes('3mf')`, each validated | not rerun here |
| `build.py` | bakes fonts, three, jszip, earcut, polygon-clipping, print-forge `orca3mf.js` and the sources; asserts no U+2014 or U+2013 in the output | the dash rule as a build failure |
| validator on shipped examples | `validate_3mf.py --overlap` | 21 of 21 pass (measured 2026-10-04) |

`package.json`: `build` (python3 build.py), `test` (node test_parts.js and node sweep.js), `smoke` (python3 smoke.py). Pinned: three 0.128.0, jszip 3.10.1, earcut 2.2.4, polygon-clipping 0.15.7.

## 8. Port map

| Feature or mechanism | Package | Feature kinds | Canon id | Reference id | Milestone | Lineage row |
|---|---|---|---|---|---|---|
| stud column at BOSS v1 | archetypes | conductor, contact, port | `blocks-stud`, preset `boss-v1` | `conductors/blocks-stud`, `conductors/blocks-stud-applied` (planned, not in repo) | M06-T07, M06-T12 | MISSING |
| wire with stud caps | archetypes | conductor, port x2 | `blocks-wire` | `conductors/blocks-wire` (planned) | M06 | MISSING |
| seat press pad and snap frame | archetypes | pocket, contact xN, port xN, snap, hinge | `blocks-board-seat` | `seats/blocks-seat` (planned) | M06, M08 | MISSING |
| undefined band reproduction | circuit | read model pullup | CHK-NET-05 | `electrical/blocks-pullup-band` (planned) | M05-T07 (inputs `designs/blocks/legacy/boss-src/`) | MISSING |
| PLATE painted nets | archetypes | conductor xN, port xN | MISSING | MISSING | M10 | MISSING |
| cone button, touch brick, force brick, lamp, trimmable meander | archetypes | as BLOCKS | MISSING (CANONS.md backlog: "archetype candidates when BLOCKS renders from chase at M10") | MISSING | M10 | MISSING |
| bench legacy files | designs/blocks/legacy | n/a | n/a | n/a | M10-T10 (boss.html, boss-src.zip, boss-examples.zip) | MISSING |

## 9. Lineage

BOSS (2026-09-13 sources, 2026-09-14 00:46 file) to BLOCKS (2026-09-14 16:20 and 16:59). BOSS draws on FEELER (in place cone rules, revolve), GIB (finger mode slider), print-forge (`orca3mf.js`, bench skeleton) and the KEYWAY family's discipline (benches-conductive-b.md part C). Successors of its mechanisms: PIP and HAFT flex cone and click spring keys; TOGGLE BLOCKS terminal mode; BAFFLE R3 tile carrier on conductive studs.
