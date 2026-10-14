# THINPOT (FEELER, second harvest): how it is made

The printed sensor bench in its final form: 22 parametric sensor archetypes that each build a closed mesh per filament on a four-head printer, prove their own continuity and isolation, state what they will read, show a hookup schematic, and simulate a stimulus. THINPOT is the name of archetype 21 (a printed membrane potentiometer) and the owner's name for this harvest; the bench itself says FEELER (the plan's working name for the design is STYLUS). This revision carries the two printed dome buttons the owner's family depends on (the flip bowl with a flange lock and the in-place cone), the ladder keypad that reads a grid of them on one analogue pin, and the line-for-line port of the print-forge 3MF writer.

Number rule: constants are bench defaults at the line named in `fab-knowledge:originals/thinpot/files/feeler_thinpot.html`; readouts quoted from shots are computed by the bench; anything measured says measured.

Folder: `fab-knowledge:originals/thinpot/`.

## 1. Identity and revision

| field | value |
|---|---|
| owner name | THINPOT (FEELER THINPOT, STYLUS second harvest) |
| slug | thinpot |
| canonical revision | `feeler (16).html` 2026-09-11 00:20 (= `(17)` 09-15, `(18)` 09-24, = harvested `fab-work-directory:benches/feeler-thinpot/outputs/feeler.html`), 412640 bytes, 7157 lines |
| sha256 | `35467f4b022178334c6aba422985854b6bc298927f5f552bc38e79465219b222` |
| copy here | `fab-knowledge:originals/thinpot/files/feeler_thinpot.html` (single file, no vendor libraries: own WebGL renderer, own earcut port, own zip and 3MF) |
| exports and evidence | `fab-knowledge:originals/thinpot/files/feeler-ladder-inplace-sample.3mf` (bench sample: base, chain, common, domes, plugs), `fab-knowledge:originals/thinpot/files/feeler-ladder_6.bench-export.3mf` (bench export 2026-09-08 20:19, 97 per-filament keys), `fab-knowledge:originals/thinpot/files/feeler-ladder.json` (saved design, 2026-09-08 23:17), `fab-knowledge:originals/thinpot/files/feeler-thinpot.slicer-save.3mf` (owner slice of a THINPOT, 2026-09-10 17:22) |
| predecessor | FEELER v1 (`fab-knowledge:originals/feeler-v1/`), 20 archetypes |

### 1.1 Revision table

| Downloads files | dates | what |
|---|---|---|
| `feeler.html` to `(2).html` | 2026-08-21 | before v1 |
| `feeler (3)` to `(5).html` | 2026-08 | FEELER v1 (`0671193e`) |
| `feeler (6)` to `(15).html` | 2026-09-08 04:05 to 09-10 14:31 | THINPOT text and the ladder from (6); dome saga passes |
| `feeler (16)` to `(18).html` | 2026-09-11 to 09-24 | final, identical (`35467f4b`) |

Why (16): newest and identical to every later save; the owner sliced its ladder and thinpot outputs (Flash Studio screenshot of the in-place ladder and the 09-10 thinpot save), and its 3MF writer is the one that round-trips.

## 2. What it makes and for whom

A maker with a four-head FDM printer (Creator 5 Pro preset) picks a sensor archetype, shapes it, drives it in a simulator, assigns four filament slots (structure, conductive, flex, second conductive) and exports a 3MF with every part on its slot, plus a print card with BOM, assembly steps, wiring and the hookup circuit.

## 3. Shots

Driven with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, 1280 x 860, zero page errors.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/thinpot/shots/tp-picker.png` | after START: the full-stage archetype picker, 22 of 22, group chips (all, well behaved, piezoresistive, hybrid, metamaterial, exotic), search, cards with a rendered preview, name, group, blurb, part and wire counts |
| `fab-knowledge:originals/thinpot/shots/tp-thinpot-shape.png` | THINPOT picked, SHAPE tab, solid: PETG base and rim, the membrane with its tail over the boss, three terminal pads with wire holes at the near end; PRESS sim at the top of the rail, then PARAMETERS starting at active length 100 |
| `fab-knowledge:originals/thinpot/shots/tp-thinpot-drive.png` | DRIVE tab, ghost on: MATERIALS panel (PETG base, conductive PLA track, TPU 95A membrane, conductive TPU collector strip), PRESS sim (position 0.50, force 2 N, load 1000 kohm) with tap to low and high ends 2.08 kohm each, contact R 2.24 kohm, output 0.50 x Vin; header chips PARTS 4, TRIS 2,000, MASS 15.9 g, GATES 8/8; size `32.2 x 135.8 x 4.0 mm, 20 layers at 0.20` |
| `fab-knowledge:originals/thinpot/shots/tp-thinpot-hookup.png` | HOOKUP panel: schematic MCU to T1, T2, T3 with a 100k pull-down on T2, three numbered wiring lines, the formula; WIRING table per terminal; YOU ALSO NEED |
| `fab-knowledge:originals/thinpot/shots/tp-ladder-drive.png` | LADDER KEYPAD 3 x 4 in DRIVE: twelve dome keys on a base with serpentine chain resistors and trim bridges, KEYS sim (key 1, pull-down 100k, 25 C): OUT 3.30 V, ADC 1023, smallest step 49.75 counts; `79.6 x 114.0 x 9.1 mm` |
| `fab-knowledge:originals/thinpot/shots/tp-switch-shape.png` | DOME SWITCH, SHAPE: flip bowl dome over two half-disc contacts, PRESS sim open, parameters with `dome print` select (separate bowl or in-place cone) |
| `fab-knowledge:originals/thinpot/shots/owner-flashstudio-ladder-inplace.png` | the owner's Flash Studio slice of the in-place ladder (2026-09-08 19:57): 12 tool changes, 27.33 g, 58 m 27 s, warning of empty layers between 4.09 and 4.8 (the dome saga pass that failed) |
| `fab-knowledge:originals/thinpot/shots/slicer-thinpot.png` | the owner's slice of a THINPOT strip |

## 4. Mechanisms, circuits and constructions

Script blocks in `fab-knowledge:originals/thinpot/files/feeler_thinpot.html`: `window.geom` (`:338` to `983`), `FEELER_CORE` with materials, Ctx, helpers and archetypes 1 to 14 plus switch and thinpot helpers (`:984` to `3055`), archetypes encoder, wiper, matrix, level, hotwire, thinpot, ladder, whisker (`:3056` to `4672`), `SIM` interaction models (`:4673` to `5349`), `FEELER_EXPORT` (`:5350` to `5657`), app (`:5658` to `7157`).

### 4.1 Geometry kernel: exact prisms with a slab list

- 2D helpers (`:349` to `416`): area, ccw/cw, rect, rrect, circle, ngon, sector, `dedupe` (1e-6), `cleanLoop` (removes exactly collinear vertices before caps and walls, because the triangulator drops them and cap and wall would disagree on that edge, `:398` to `410`), translate, rotate.
- `stroke(pts, w, cap)` (`:419` to `480`): left side forward, right side back; outside corners rounded with fans; inside corners use the miter intersection of the two offset segments when it lies within three half widths, else a bevel; round or flat caps.
- `keyhole` (`:482`), own earcut port (`:497` to `726`), `triangulate(outer, holes)` (`:727` to `748`).
- `Mesh` (`:751` to `855`): `prism(outer, holes, z0, z1, sTop, cx, cy)` with caps from the triangulation and walls from the original loops (bridge edges never become geometry), optional top scale for tapers; every prism appends `{o, h, z0, z1}` to `mesh.slabs`, which is what the net checker reads, so the electrical model and the mesh come from the same call. `apex` (cone or pyramid to a point), `revolve` (closed (r, z) loop), `lathe` (half profile touching the axis).
- Lattices (`:857` to `937`): `reentrantCell`, `hexRing`, `reentrantField`, `serpentine` with 8-segment U turns, `spiral`, `combPair`.
- Continuity predicates (`:939` onward): `pointInPoly`, `pointInRing`, `segHit`, `ringsOverlap`, `slabsTouch(a, b, tol 0.02)` (`:967`).

### 4.2 Build context: declarations, net solver and fits

`Ctx` (`:1024` to `1199`): `part(name, role)`, `get`, `drop` (virtual part, not printed), `pose(name, {dx, dy, dz, flipZ})` print pose, `say` readout, `note`, `pause(z, why)`, `tap(label, x, y, z)`, `joined(...)`, `apart(...)`, `apartExcept(part, ...)`, `bom`, `step`, `wire(term, fn, how)`, `circuit(spec)`, `fit(name, nominal, actual, min, max)` with `ok = min <= actual <= max`, `makesContact(a, b, how)`, `absorbTerminals()` (folds the shared terminals part into the first conductor it touches, so a trace landing on its tab is one solid).

`solve()` (`:1128` to `1198`): union find with path halving over every slab of every non-virtual `cond` or `aux` part where `slabsTouch` holds; each tap resolves to the first slab whose z range contains it within 0.05 and whose ring contains (x, y); assertions: tap on no conductor, `joined` ("continuous" or "is broken"), `apart` ("isolated" or "are shorted"), `apartExcept` (rebuild the union find without the named part; the taps must fall onto distinct nets, the articulation check that proves a wiper, collector or sense sheet is the only path).

Shared maths (`:1086` to `1234`): `dividerR(R0, vcc) = max(R0, vcc/0.02 - R0, 47)` (match the sensor, current under 20 mA); `niceR` snaps to E24; `traceR(rho, L, w, t) = rho x 10 x L / (w t)` (ohm cm and mm to ohm); `capPF(A, d, er) = 8.854e-3 er A / d`; `selfCapPF`; `touchPF` (finger as a grounded 80 mm2 plate plus a 0.15 air and stratum gap); `seriesPF`; `beamF` cantilever first mode. Terminal helpers `terminalRow`, `terminalRing`, `terminalColumn` draw into the shared terminals part with a tap each.

Materials (`:998` to `1014`, vendor-class bench values): CPLA rho 15 along, 60 across (ohm cm), gauge factor 3, tcr -1.0 %/C; CPLA_HI 1.5 and 8; CTPU 1000 and 3500, gf 12; CTPU_LO 120 and 400; structural PLA, PETG, ABS, ASA, PC, TPU 95A (E 30), TPU 85A, PVDF, PVA, glow PLA with nozzle and bed temps, density and er. Roles (`:1016` to `1021`): rigid STRUCTURE (PETG), cond CONDUCTIVE (CPLA), flex FLEX (TPU95), aux SECOND COND (CTPU).

### 4.3 Spring button 1: flip bowl dome with flange lock (`domeCap`, canon dome-button)

`:1352` to `1418`. The dome is a flat-topped TPU bowl printed upside down beside the base (flat top on the bed, plug on the floor of the bowl), so nothing bridges and nothing needs support.
1. Skirt `max(0.8, 4 layers)`; with the lock, at least `flange + 1.0 + 0.8`.
2. Plug radius `min(rPk, rimR - wall - 1.1, 0.4 rimR)`: a thin disc `max(0.6, 3 layers)` bonded to the ceiling and a narrow stem `max(0.9, 0.7 rPk)` hanging to the contact gap. Code comment: a big thick plug was the old mistake; it turns the top into a rigid plate and the dome cannot flex.
3. Flat top `rFlat = min(rimR - wall - 0.3, max(rPk + 0.6, 0.3 rimR))`; the rest is shoulder.
4. Gapped pedestal ring under the rim and a gapped collar outside it (`collarGap` 0.3, width `max(0.84, 2.1 nozzle)`), sectors split at the trace exit angles.
5. Flange lock: a TPU flange 1.0 wide, `max(0.8, 4 layers)` thick round the rim snaps under a revolved collar lip whose underside is a 45 deg ramp (prints in place with no support) and whose top is a 0.6 lead-in, so the dome presses in with a click and stays without glue.
6. The bowl profile (`:1403` to `1411`) is a flat top of radius `rFlat` followed by a quarter-ellipse shoulder from `rFlat` out to the rim (outer `r = rFlat + (rimR - rFlat) cos t`, `z = base + domeH sin t`; inner the same with `rimR - wall` and `domeH - wall`), revolved at 64 segments; plug and stem by `lathe`. With the lock the foot of the profile carries the flange: out 1.0 at the contact level, up `ft`, then a 45 deg slope back in to the rim, which prints as the flange underside when the bowl is upside down and mates with the lip ramp when assembled.
6a. Lip construction (`:1390` to `1399`): below the contact level the collar is gapped sectors (so the traces pass); above it one continuous revolved lip ring: inner face at `rimR + collarGap`, underside a 45 deg ramp rising from `z1 + ft + 0.2` over the 1.0 flange width, a 0.6 vertical catch face, then a 0.6 45 deg lead-in to the collar top. The rim snaps past the lead-in and the flange sits under the catch face. The plug sits in the conductive TPU slot because printed on the underside of a TPU ceiling it fuses to the dome where a PLA puck would peel off.
7. Feel index `(wall/0.8)^3 x (rFlat/rimR/0.35)^2`.

Fits in the users (switch `:1700` to `1846`, ladder): plug clearance at rest (0.2 to `0.85 domeH`), shoulder to flex at least 1.5.

Switch construction around the dome (`:1717` to `1835`): base `od + 10` by `od + termL + 12`; two half-disc pads of radius `rC2 = clamp(max(2.0, rPk + 0.8), 1.5, rPad0 - 0.5)` split by the clearance `max(0.8, 0.8 trace)`; pedestal and collar gapped at plus and minus 90 deg for the two traces (`gapA = (trace/2 + clr)/rimR + 0.06` rad); the lower half pad's trace runs straight down to terminal 1, the upper half's trace leaves north through the pedestal gap and runs round the outside of the collar at `rimR + 1.3 (lock) + collar width + clr + trace/2` to terminal 2. In bowl mode the dome and plug are posed with `flipZ` beside the base at `dx = W/2 + rimR + 6`. Readouts: contact gap and its layers, wiring R, closed R `Rwire + 2k` to `Rwire + 60k`, snap ratio, plug and dome top sizes, feel word (`light click` under 0.6, `crisp click` under 1.5, `firm` under 3.5, else `stiff`). A pause at the contact layer offers a foil disc across both half pads. Hookup `switch`: term 1 to a GPIO with the internal pull-up (or 10k to 3V3), term 2 to ground, pressed reads low, debounce 10 to 20 ms in software. Switch defaults: od 18, rise 4, bowl wall 0.8 ("0.8 clicks, 1.2 is a thumb press"), plug 4, contact gap 1.2, base 1.6, contact layer 0.6, trace 1.4. Both dome modes contact two half-disc pads split by the clearance, so the plug stays small.

### 4.4 Spring button 2: in-place cone (`domeCone`, canon flex-cone-key family)

`:1299` to `1350`. A steep TPU cone standing on its pedestal, printed with everything else, with a conductive TPU cap bridged over a small hole at its top; the cap's underside is the contact.
1. Walls held at or above 40 deg from horizontal (`thMin`), so no support.
2. `rCap = clamp(holeR + wall/sin 45, 1.2, 0.45 rimR)`, then three fixed-point iterations of `domeH = max(domeH, (rimR - rCap) tan 40)`, `th = atan2(domeH, rimR - rCap)`, `rCap = clamp(holeR + wall/sin th, ...)`.
3. Cap thickness `max(3 layers, 0.6)`; wall measured through the slant (horizontal offset `wall/sin th`).
4. Hinge band: the lowest 30 percent of the cone is thinner, `hingeT = min(wall, max(0.42, 1.05 nozzle))`; that is where the cone folds and what makes the button light.
5. Pedestal sectors only; `innerR(z)` returned so contacts can be sized to clear the cone inside.
6. Feel index `(wall/0.6)^3 x (hingeT/0.45)^1.5`.

Contacts in place (switch `:1740` to `1760`, ladder `:4444` to `4470`): two half columns rise inside the cone to within the contact gap of the cap; `gapIn = max(1.2, travel < 0.35 cavity ? 0.45 cavity : min(travel, 0.5 cavity))`; columns stop where `innerR(z) - clearance < 1.5` (raised in 0.3 steps). Fits `cone wall angle 40 (39.9..90)`, `cap to contacts 0.45 cavity (max(1.2, 0.33 cavity)..0.55 cavity)`. Cone wall is cut to `(rimR - 3.0) sin 40` (switch) or `(rimR - 2.5) sin 40` (ladder) with a note.

Failure lesson (owner slice, `fab-knowledge:originals/thinpot/shots/owner-flashstudio-ladder-inplace.png`): the in-place ladder sliced with empty layers between 4.09 and 4.8 and floating regions; the knowledge record names it dome saga pass 2 (cone inner wall not parallel to the outer). The final code measures the wall through the slant and carries the skirt bore at the same radius so the inner cone runs straight into it with no thin spot (`:1311` to `1318`).

### 4.5 THINPOT: printed membrane potentiometer (canon membrane-slider-thinpot)

`:4022` to `4210`. Defaults: active length 100, width 12, taper lin, membrane `collector` (TPU plus low-ohm strip, position) or `ctpu` (cTPU sheet, position and pressure), terminals hole, pin (0.64 square header press fit), screw (M3 and washer, pitch at least 7.6), tape, or tab (croc clip fin 6 tall); track 6 wide, 0.6 thick; base 2; air gap 0.6; rim 4; membrane 0.8; strip 0.4; flex base option; terminal pitch 5.08; test force 2 N.
1. Track width profile `wAt(u)`: linear, or `wMax exp(-ln(wMax/wMin) t)` with t = u (log) or 1 - u (reverse log), `wMin = min(wMax, max(2 nozzle, 1.0))`; 48 segments with R integrated per segment into `Rcum` so the readout gives R at 25, 50, 75 percent.
2. Terminals all at the near end in one row: T1 straight down out of the track through the near rim along a lane to its pad; T3 up through the far rim, round the outside of `+X`, back along the lane to its pad; T2 a boss (the T2 pad metal carried up to rim height) that the membrane tail lands on.
3. Base plate, full-height side rails, end rails split in their lower slab around the trace gap and bridged by a full upper slab; rail pieces inset 0.3 and 0.6 "so no two shells share a vertex".
4. Membrane: rim outline plus a tail over the boss, built in 40 segments; collector strip inset 1.0 and flush in the underside with a thin frame round it so the sheet lies flat; posed flipped beside the base (`pose` with `flipZ`).
5. Contact model: patch area `pi (1.5 sqrt(F/2))^2`; collector `rhoZ(aux) x 10 x stripT / Ac + 400/(F + 0.05)^0.6`; cTPU sheet `rhoZ x 10 x memT / Ac + 3000/(F + 0.05)^0.8`.
6. Net assertions: T1 to track lo, T3 to track hi, T1 to T3 joined; T2 to boss and collector joined; T1 apart from T2 and collector; `apartExcept('collector strip', T1, T2)`; `makesContact` collector to track lo and hi.
7. Fits: membrane travel 0.2 to 3; tail over the boss 2 to 20.
8. Notes: under about 0.4 mm gap the sheet sags into the track and reads a phantom touch; the collector must be a low-ohm grade (warns when aux rho over 200 ohm cm); taper gradient limited to `wMax/wMin` by the nozzle (6:1 at 6 mm, computed).
9. Hookup `pot` (`:4201`): T1 ground, T3 3V3, T2 to ADC with 100k pull-down so untouched reads zero; "V = 3.3 x position along the track, 0 V untouched".
10. Sim `SIM.thinpot` (`:4899` to `4939`): position, force 0 to 10 N, load; touched over 0.15 N; loaded divider `Rpar = Rlo (Rc + Rl)/(Rlo + Rc + Rl)`; cTPU mode adds a force estimate; `move` dimples the membrane with radius `max(3.5, min(L/4, 4 + 0.35 F))`.

Known defect: the HOOKUP schematic draws T1 to 3V3 and T3 to GND while the wiring text says T1 to ground and T3 to 3V3 (`fab-knowledge:originals/thinpot/shots/tp-thinpot-hookup.png`); direction flips, function unchanged.

### 4.6 LADDER keypad: dome keys on one analogue pin (canon ladder-keypad)

`:4213` to `4562`. Defaults nx 3, ny 4, print flip or in place, cone wall 0.6, plug 3, contact hole 3, lock on, pitch 22, dome 11 by 3.5, bowl wall 0.8, travel 1.0, conductor 0.6, base 2.4, track 0.8, trim bridges on, pull-down 100 kohm, supply 3.3.
1. Key order boustrophedon so every link is a neighbour.
2. Each key splits into an A half (top, a node of the chain) and a B half (bottom, on the common).
3. Common: strips under the B pads on a buried layer, a spine one layer deeper up the left edge with an arm per row, a printed 1.4 via per row; the base is floor, deep filler around spine and arms, a rigid separator with via holes, then the strip layer with the strips cut out; slabs lapped or inset by a hair; mounting-hole polygons rotated by pi/24 (and 1.5 times that on the separator) so no vertex lands on the slab below.
4. Chain links: vertical serpentines in the box between two collars (`s = pitch/2 - collarR - clr`), legs `floor((2s - tw)/(tw + clr)) + 1` rounded down to even; row-change links horizontal with leg length trimmed so every link matches the first link's path length.
5. Escapes leave each pad radially through the pedestal and collar gap until clear of the collar, then square to the nearest path end, landing 0.35 inside the path; minimum escape angle `asin((tw/2 + 0.12)/(rC - 0.6 tw)) + 0.03`.
6. Trim bridges: a 0.6 bar across every adjacent leg pair at mid span; each cut adds about one loop.
7. Pitch opens automatically so a resistor fits between two collars; base thickens to carry two buried layers.
8. Levels `V(k) = Rpar/(Rup + Rpar)` with `Rup = kR`, plus a no-key level; smallest step in volts and 10-bit counts (49.75 counts at defaults, computed in the DRIVE shot); note when under 25 counts.
9. Hookup `ladder` (`:4551`): the keypad is the divider; 100k pull-down must be much larger than the chain; decode with N + 1 thresholds halfway between levels, two equal samples to debounce; print the chain in standard cPLA so steps stay tens of kohm.

### 4.7 The other archetypes (all in this revision)

| # | id | name | group | build lines | hookup kind | one-line construction |
|---|---|---|---|---|---|---|
| 1 | cappad | CAPACITIVE PADS | well behaved | `:1427` to `1699` | cap | pads, mutual grid, tapered stacked slider bands, proximity disc with split guard, wheel sectors to a terminal ring |
| 2 | switch | DOME SWITCH | well behaved | `:1700` to `1846` | switch | flip bowl or in-place cone over two half-disc contacts (4.3, 4.4) |
| 3 | flexstrip | BEND / STRETCH STRIP | piezoresistive | `:1847` to `2007` | divider, pot | cTPU strips either side of the neutral axis, body pocketed exactly where each strip lives |
| 4 | compress | COMPRESSION CELL | piezoresistive | `:2008` to `2103` | divider | column printed standing so current crosses layers; diaphragm cap, post to a top pad |
| 5 | meander | RESISTIVE TRACK | well behaved | `:2104` to `2258` | lowside, divider | serpentine, spiral or bar as heater, resistor or RTD |
| 6 | tribo | TRIBOELECTRIC CELL | exotic | `:2259` to `2383` | hiz | TPU ribs over an unbroken electrode, membrane and upper electrode |
| 7 | horn | PIEZO STRAIN HORN | hybrid | `:2384` to `2446` | piezo | lever with a living hinge and a keyhole pocket for a disc dropped in at a pause |
| 8 | comb | CANTILEVER BANK | exotic | `:2447` to `2534` | divider | beams `L = len0 ratio^i` with root gauges on a shared bus |
| 9 | auxetic | AUXETIC STRAIN GAUGE | metamaterial | `:2535` to `2606` | divider | re-entrant honeycomb between full-width bus bars |
| 10 | triaxial | THREE AXIS LOAD CELL | metamaterial | `:2607` to `2683` | divider | three lattice blocks each compliant on one axis, corner posts |
| 11 | bistable | SNAP THROUGH ARRAY | metamaterial | `:2684` to `2841` | multi | beams print flat as straight strips pushed into wall pockets; strip length `span + 2 (slotD - play) + pi^2 rise^2 /(4 span)` |
| 12 | gradient | LOG LOAD CELL | metamaterial | `:2842` to `2910` | divider | hex lattice bands with a wall thickness ramp |
| 13 | absorber | RF ABSORBER TILE | exotic | `:2911` to `2971` | none | conductive pyramids, wedges or cones |
| 14 | rfpatch | CHIPLESS RF STRAIN TAG | exotic | `:2972` to `3055` | rf | split rings, dipoles or spirals on a TPU substrate |
| 15 | encoder | ROTARY ENCODER | well behaved | `:3090` to `3330` | multi | code disc on a buried common, shoes on parallel lanes pre-rotated by shoe angle, flush filler |
| 16 | wiper | POTENTIOMETER | well behaved | `:3331` to `3697` | pot | arc, collector, keyed carrier on a 6 mm D shaft, journal, snap ring, end stops; carrier, arm and shoe posed upside down |
| 17 | matrix | PRESSURE MATRIX | piezoresistive | `:3698` to `3789` | matrix | rows on cond, columns on aux, piezoresistive sheet between |
| 18 | level | LEVEL PROBE | well behaved | `:3790` to `3912` | capdiff | blade or coaxial electrodes, pads in open pockets |
| 19 | hotwire | THERMAL FLOW SENSOR | hybrid | `:3913` to `4021` | divider | serpentine bridged between two posts plus a shielded reference |
| 20 | thinpot | THINPOT | well behaved | `:4022` to `4212` | pot | 4.5 |
| 21 | ladder | LADDER KEYPAD | well behaved | `:4213` to `4562` | ladder | 4.6 |
| 22 | whisker | TACTILE WHISKER | hybrid | `:4563` to `4672` | multi | tapered shaft on a TPU flexure, floating collar bridges to one of n sector contacts |

Known defect carried into this revision: the encoder draws B marks offset by `step/2` (180 electrical deg, B is the complement of A, no direction) while the sim uses `step/4` (CANONS.md section 3.1; mark drawing in the encoder block above).

### 4.8 Gates

`runGates` (`:5722` to `5760`): fits plate 256 x 256 x 256; every part at least one layer (warn under 1.5); conductive slot is conductive; flex slot is elastomeric when a flex part exists; closed manifold shells (`edgeCheck`, every directed edge keyed at 4 decimals has its reverse, `:5761` to `5772`); bed temps within 35 C (warn over 15); hardened nozzle warning when a conductive filament is used; circuit continuity and isolation from the net report. Header chip GATES n/m (8/8 at the shots).

### 4.9 3MF and exports

`FEELER_EXPORT` (`:5350` to `5657`): binary STL, store-only zip with CRC32, `weld(mesh)` (1e-5 snap, drop degenerate and zero-area faces, `:5419`), and a line-for-line port of print-forge `orca3mf.js` (`:5446` onward): only the five preset-name keys plus per-filament vectors, never printer or process scoped keys, never `extruder_variant_list` (throws at `:5588`), never `paint_color`, every vector exactly N long, every value a string. App exports (`:7004` to `7101`): posed meshes (`posedMesh` applies `flipZ` and reverses winding), 3MF, STL zip with a README print card, single STL of visible parts, print card text (params, materials, gates, pauses, BOM, steps, wiring, hookup), design JSON.

## 5. UX anatomy

- Header: FEELER mark and wordmark, tabs `1 TYPE / 2 SHAPE / 3 DRIVE / 4 FILAMENT / 5 PRINT` with ticks on visited tabs and the later tabs locked until a type is picked (`renderTabs`, `:6112` to `6125`); chips PARTS, TRIS, MASS, GATES n/m.
- Welcome card: four-step list, START, LOAD A DESIGN.
- Picker: full-stage overlay of cards rendered from real builds at defaults, group chips, search by what you want to measure (`:6226` to `6413`).
- Stage: own WebGL renderer with rim light in the accent, title, cams ISO, TOP, FRONT, GHOST, EDGES, SPIN, PLATE; per-part legend; size and layer count.
- Rail: the drive controls and the slot legend ride at the top of every tab (comment at `:6127` to `6130`); arriving at DRIVE turns ghost on; DRIVE has OUTPUT channels with bars, SCOPE (sweep the first input and plot every channel), CIRCUIT net report and gaps that close, HOOKUP schematic, WIRING table, YOU ALSO NEED, ASSEMBLY, FITS; FILAMENT has four slots with material and colour; PRINT has layer, nozzle, printer profile fold, PLATE panel, pauses, exports, checks.

What makes it excellent: one declaration vocabulary (tap, joined, apart, apartExcept, makesContact, fit, pose, circuit, wire, bom, step, pause) shared by 22 archetypes; the net model comes from the same prism calls as the mesh; every clamp explains itself in a note; the two spring buttons print with no support and their fits are checked; every archetype says how to wire it with a schematic.

## 6. Tests and harness

No hook global and no test file (the bench was tested by hand in the chat). In-page gates only. Owner evidence: Flash Studio slices of the ladder and a thinpot (section 3). The 3MF round trip: the slicer saves keep four filaments, the bench colours and extruders 1 to 4 (downloads reader, `fab-knowledge:sources/downloads/dl-gudgeon-tang-keyway.md` section 4).

## 7. Port map

| item | value |
|---|---|
| packages | geom (stroke, cleanLoop, earcut), mesh (exact prism, apex, revolve, lathe, slab list), circuit (net solver, articulation check, R and C models, read circuits dividerR and niceR), sim (interaction models), profile (materials), archetypes, 3mf, ui-core (picker, scope, drive, hookup), chase |
| feature kinds | conductor, contact, port, pad, pocket, window, snap (flange lock), detent (pot detent), pin_in_slot (pot carrier), bore (journal), screw (bushing), boss |
| canon ids | dome-button (proven, flip bowl and in-place cone), flex-cone-key (proven; STYLUS provenance), ladder-keypad (proven), membrane-slider-thinpot (proven), printed-rotary-pot (proven, `feeler-wiper` alias), capacitive-plate (proven, `feeler-cappad`); 22 candidates `feeler-<id>` (CANONS.md section 6) |
| canon MISSING | flange lock collar with 45 deg ramp lip as its own snap entry (snap family has five fixed entries, D-096); trim-bridge serpentine resistor; boustrophedon equal-length chain; the 17 archetypes without a canon entry beyond the candidate list (tribo, horn, comb, auxetic, triaxial, bistable, gradient, absorber, rfpatch, encoder, matrix, level, hotwire, whisker, flexstrip, compress, meander) |
| reference ids | buttons/dome, buttons/flex-cone, buttons/ladder-key, sensors/membrane-slider-thinpot, sensors/rotary-pot (named in CANONS.md; no folder under `reference/` yet) |
| reference MISSING | references for the 22 candidates (STYLUS writes them at M10) |
| milestone | M06 (22 THINPOT candidates, encoder B at step/4, typed params), M10 (STYLUS from chase), M14 (STYLUS dome on a lid face) |
| lineage row | MISSING |
