# PLENUM: how it is made

Record written 2026-10-05 from the original code. Slug `plenum`. Family counters-machines (KNURL, DETENT, WASHER, PLENUM, QUENCH, COFFER). PLENUM is a design calculator for a sub-ambient cooled multi-emitter 445 nm diode head in a Class 1 enclosure: diode, thermal, chiller, psychrometric and optical models with a 3D gantry and an irradiance ladder that says where the beam lands against material thresholds. It came from the same chat as QUENCH ("DIY portable laser cutter with refrigerant cooling"); its own ladder shows a diode bank lands below steel cutting, which is why QUENCH exists.

Number rules for this file. A number that names a code location is a declared value. "Computed" means produced on 2026-10-05 by the page's own functions extracted verbatim and run in node (`fab-knowledge:originals/plenum/drive/model.cjs`, output `drive/model-2026-10-05.json`) or read off the page in headless Chrome. Every model constant is a design estimate with no fitting data in the file; treat them as inferred.

Short path: `F` is `fab-knowledge:originals/plenum/files/`. Bare line numbers are lines of `F/plenum.html` (613 lines).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "PLENUM / sub-ambient diode head" (title, line 6) |
| owner's slug | plenum |
| canonical file | `F/plenum.html`, copied from `fab-work-directory:benches/quench-plenum/outputs/plenum.html` |
| sha256 | c6d3a172772cae82e77eb16ffac7f48630b08eaac68e8f6435dd2b0fd6e2468d |
| bytes | 28194 |
| date | 2026-07-31 15:00 (mtime of the byte-identical `~/Downloads/plenum.html`) |
| runtime | one hand-written file; three.js r128 from cdnjs; Barlow Condensed and JetBrains Mono from Google Fonts |
| registry stub | `hackbuild-tools/tools/vision-3d-and-cad/plenum/README.md` inside `~/Downloads/hackbuild-tools (3).zip` (2026-08-06) describes the same file |

### 1.1 Revisions and why this one

Only one revision exists in the harvest and in Downloads. It is the canonical file by default; the drive on 2026-10-05 opened it with zero page or console errors (measured).

### 1.2 What is in `files/`

`plenum.html` only. Hashes: `fab-knowledge:originals/plenum/SHA256SUMS`.

---

## 2. What it makes and for whom

A decision tool for someone planning a laser cutter around a bank of 445 nm diodes cooled below ambient: how much optical power comes out at a drive current and coolant temperature, what the chiller can actually remove at the setpoint, whether the cold plate will frost and how much dry purge gas that needs, and what the focused irradiance can do to wood, acrylic, plastics and steel. It produces no files.

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/plenum/drive/shoot.cjs` with `drive/shots.json` (puppeteer-core, headless Chrome with SwiftShader, 1280 x 860, 6 s wait, no hook).

| file | caption |
|---|---|
| `shots/p01-start-room-temp-loop.png` | At load: 24 emitters at 4.5 A, setpoint -10 C; the loop starts at the 22 C ambient and reads 21.6 C by the time of the frame (measured from the readout); output 119.4 W optical, NOMINAL. 3D: gantry rails and cross beam, the translucent plenum with foam wireframe, copper plate tinted by temperature, collimator and lens, beam cone, the 620 x 300 x 420 enclosure. |
| `shots/p02-pulled-down-after-run.png` | After a further 20 s of wall clock: loop 20.8 C, 0.8 K below the p01 frame and 1.2 K below the start (measured from the readouts). Thermal mass 4666 J/K against about 121 W of net cooling gives 0.026 K per second of thermal time (computed), so the frame saw about 46 s of thermal time, well under the nominal 4x of the wall clock, because SwiftShader frames are slow (section 5.3). The thermal run trace shows coolant, plate and junction against the setpoint and dew point lines. |
| `shots/p03-rotated-shaping-ladder.png` | Beam shaping ROTATED: the ladder needle at 29.8 kW/cm2, spot 0.72 mm, BPP 119 mm.mrad, in "harden steel surface". |
| `shots/p04-lid-open-interlock.png` | Lid open: "LID OPEN, DRIVE INHIBITED" over the stage, note INTERLOCK OPEN, no emission. |

---

## 4. Code map

| area | lines |
|---|---|
| CSS tokens (`--cold #5ec8ff`, `--hot #ff8a3d`, `--good #46d9a8`, `--warn #ff4d5e`), grid 252 / stage / 300, footer | 11 to 90 |
| markup: header with LID button; left Source, Cold loop, Room; stage; right Output, Temperatures, note, Thermal run; footer Optical train and ladder | 95 to 196 |
| diode model `emitter` | 207 to 224 |
| thermal resistances, `bank` junction iteration | 226 to 243 |
| psychrometrics `pvsat`, `dewpoint`, `humRatio` | 245 to 251 |
| chiller derate `chillerCap` | 253 to 256 |
| state, `physics` (plate, chiller, dew point, optics, irradiance) | 258 to 285 |
| loop integrator `integrate` | 287 to 294 |
| `refresh` (readouts, purge sizing, note states) | 297 to 353 |
| irradiance ladder `BANDS`, `drawLadder` | 355 to 394 |
| thermal trace | 396 to 429 |
| 3D assembly `init3D`, `updateScene`, orbit, `tick` | 431 to 581 |
| wiring | 583 to 609 |

No hook, no exports, no tests.

---

## 5. Mechanisms and models

There is no fabricated part; the mechanisms are the models.

### 5.1 Diode emitter model (`emitter`, lines 207 to 224)

InGaN 445 nm single emitter, "NUBM4x class" (declared):

| quantity | equation |
|---|---|
| threshold | `Ith = 0.40 exp((Tj - 25) / 95)` A (Arrhenius with T0 near 95 K) |
| slope efficiency | `1.45 (1 - 0.0012 (Tj - 25))` W/A |
| rollover knee | `Iknee = 5.2 (1 - 0.0035 (Tj - 25))` A |
| optical power | `P = max(0, slope (I - Ith)) exp(-0.12 (I / Iknee)^6)` |
| forward voltage | `Vf = 4.10 + 0.11 I - 0.003 (Tj - 25)` |

The comment's point: cooling buys a higher knee, not efficiency (lines 213 to 214).

### 5.2 Bank thermal model (`bank`, lines 226 to 243; `physics`, lines 265 to 270)

`R_WB` 0.025 K/W coolant to plate (copper block at 2 L/min), `R_TIM` 0.020 K/W, `R_JC` 1.2 K/W per emitter (declared). Junction: start at plate + 30, iterate 40 times `Tj += (Tplate + qE R_JC - Tj) x 0.4` where `qE = Pelec - Popt` per emitter. Plate: `Tplate = loop + q (R_WB + R_TIM)` with the bank solved twice (once at loop, once at the resulting plate).

Computed with 24 emitters (the page's own functions):

| case | loop C | optical W | electrical W | heat W | plate C | Tj C | wall plug |
|---|---|---|---|---|---|---|---|
| 4.5 A | 22 | 119.2 | 486 | 367 | 38.3 | 56.7 | 24.5 percent |
| 4.5 A | 25 | 117.2 | 485 | 368 | 41.4 | 59.7 | 24.2 percent |
| 4.5 A | -10 | 136.0 | 497 | 360 | 6.2 | 24.2 | 27.4 percent |
| 5.5 A | 22 | 101.6 | 604 | 502 | 43.7 | 68.8 | 16.8 percent |
| 5.5 A | 25 | 96.9 | 602 | 505 | 46.8 | 72.1 | 16.1 percent |
| 5.5 A | -10 | 141.4 | 617 | 476 | 11.0 | 34.8 | 22.9 percent |

At room temperature 5.5 A gives less light than 4.5 A (rollover); at -10 C it gives more. State the loop temperature with any of these numbers (the plan's "117 W ... 95 W" figures are the 25 C rows).

### 5.3 Chiller and cold loop (`chillerCap`, `integrate`, lines 253 to 256, 287 to 294)

Capacity derates about 3 percent per kelvin of setpoint depression from a nameplate quoted near 20 C: `cap = nameplate exp(0.030 (set - 20))`; 1200 W at -10 C gives 487.9 W (computed). Loop: thermal mass `C = mcu 385 + 1.2 x 3600` J/K (copper plate plus about 1.2 kg of glycol mix), room leak `1.6 (amb - loop)` W/K, proportional chiller demand `clamp((loop - set) cap / 2, 0, cap)`, `loop += (q + leak - demand) dt / C`, clamped -40 to 95. The tick advances 0.2 s of thermal time per 0.05 s step, up to four steps a frame ("1 second of wall clock advances 4 seconds of thermal time", line 563); readouts and the trace sample every 0.25 s and keep 220 points. The 4x holds only while frames come faster than 50 ms: each frame's dt is capped at 0.05 s before it is added to the accumulator (line 560), so on a slow renderer thermal time runs slower than 4x wall clock (the drive's p01 to p02 frames show it).

### 5.4 Psychrometrics and dry purge (lines 245 to 251, 327 to 336)

Magnus form with 610.94, 17.625, 243.04; dew point from ambient and RH (22 C, 45 percent gives 9.52 C, computed); humidity ratio `0.622 pv / (101325 - pv)`. Purge for a sealed 0.9 L plenum: target dew point 8 K below the plate; dilution count `n = ln(w_amb / w_target)`; initial purge `3 Vp n` litres; hold flow `max(0.3, 0.12 Vp n)` L/min. Frost margin = plate minus ambient dew point.

Note states, in priority order (lines 338 to 344): INTERLOCK OPEN (lid), THERMAL RUNAWAY (Tj over 90), COOLING SHORTFALL (heat over chiller capacity), FROST RISK (margin at or below 0), MARGINAL (under 3 K), NOMINAL.

### 5.5 Optics and the irradiance ladder (lines 275 to 281, 355 to 394)

`BPP = (bank width / 2)(slow divergence / 2)` in mm.rad, times a shaping factor (RAW 1.00, STEP STACK 0.45, ROTATED 0.18); `NA = clamp(aperture / (2 FL), 0.02, 0.42)` ("simple aspheres give out past about 0.4"); spot diameter `2 BPP / NA`; irradiance `P / (pi (spot/2)^2)` in W/cm2. Defaults 19 mm bank, 8 deg slow divergence, 75 mm FL, 50 mm aperture: NA 0.333, BPP 663 mm.mrad and a 3.98 mm spot raw, 298 and 1.79 mm step stack, 119 and 0.72 mm rotated; at 136 W that is 1.1, 5.4 and 33.8 kW/cm2 (computed).

Ladder bands in W/cm2 on a log axis 1e1 to 1e7 (declared): char wood 1e2 to 5e2; cut acrylic 5e2 to 2e3; weld thermoplastic 2e3 to 8e3; harden steel surface 8e3 to 5e4; melt or clad steel 5e4 to 5e5; keyhole, cut steel 5e5 to 1e7. An orange needle marks the current irradiance with the spot and BPP.

### 5.6 Interlock (lines 596 to 602, 232, 520 to 521)

The LID button toggles `S.lid`; the bank is computed with zero current when the lid is open; the lid mesh lifts and tilts; an overlay reads "LID OPEN, DRIVE INHIBITED".

### 5.7 The 3D view as a state display (`updateScene`, lines 513 to 540)

Found on the checker pass. The gantry scene is driven by the same state as the readouts:
1. Cold plate colour: `cold = clamp((25 - Tplate) / 45, 0, 1)` sets HSL hue `0.06 + 0.50 cold`, lightness `0.45 + 0.12 cold`, so the copper reads orange when warm and blue when cold.
2. Frost: when the plate is below the ambient dew point the translucent plenum box turns pale (0xdff2ff) and its opacity rises from 0.14 to 0.30.
3. Lid: open lifts the lid from y 300 to 372 and tilts it 0.22 rad; the bank runs at zero current.
4. Beam: visible only when the lid is closed and optical power is above 0.5 W; a point light under the lens scales with `popt / 40` (clamped at 5); the beam opacity pulses at `0.38 + 0.14 sin(0.004 t)` unless reduced motion is set.

---

## 6. UX anatomy

Dark instrument shell. Header: PLENUM wordmark, subtitle, the LID toggle as the one safety control. Left: Source (emitters 1 to 24, drive 0 to 6.5 A, forward voltage, threshold, knee), Cold loop (setpoint -25 to 25 C, nameplate 100 to 2500 W, copper mass 0.2 to 4 kg, capacity at setpoint, loop temp), Room (ambient, RH, dew point, purge, hold flow). Stage: three.js gantry with orbit, wheel zoom and right-drag pan. Right: big optical watts, electrical, wall plug, heat; temperatures with colour states; the coloured note; the thermal run trace with RUNNING and RESET TO AMBIENT. Footer: optical train inputs with the shaping segment and the ladder. `prefers-reduced-motion` honoured. Under 1100 px it stacks.

What makes it excellent: one honest verdict sentence that changes with the state, and the ladder that answers "what will this do" in material terms rather than in watts.

Defect seen in the shots: at 1280 px wide the ladder labels overlap where bands are narrow ("cut acrylic", "weld thermoplastic", "harden steel surface"). The guard draws a label when the band is wider than a fixed 110 canvas px (line 376) and never measures the label, and a 16 px label such as "weld thermoplastic" is wider than its band. The axis caption "W/cm2" is drawn at x 4 on top of the "1e1" tick label (measured, every shot).

---

## 7. Tests and harness

None ship. This folder's `drive/model.cjs` extracts lines 216 to 256 verbatim and evaluates them (section 5.2 table, chiller, dew point, optics); `drive/shoot.cjs` drives the page. Checker pass 2026-10-05: 18 claims re-read against `F/plenum.html` (emitter equations, the three resistances, junction iteration count and relaxation, the two-pass plate solve, chiller derate, loop mass, leak and demand, integrator clamp and clock, Magnus constants, purge sizing, note priority, BPP, NA clamp, spot, irradiance, band edges, ladder axis). The models matched; two shot captions were wrong about the loop temperature and are corrected from the readouts in the images, the ladder label defect is restated from the code, and section 5.7 was added. All four shots were opened and show what their captions say.

---

## 8. How to make a new thing this way

1. Put each physical model in one small function with its constants named and commented with their source class.
2. Iterate coupled quantities (junction temperature and dissipation) to a fixed point instead of guessing.
3. Integrate slow dynamics on an accelerated clock and say so on screen.
4. Turn every state into one sentence with a colour, in a fixed priority order.
5. End with a ladder that maps the result to what the user is trying to do.

---

## 9. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| diode emitter and bank thermal model | profile (inferred constants) | none | n/a | MISSING | none | MISSING |
| chiller derate and loop integrator | profile | none | n/a | MISSING | none | MISSING |
| psychrometric purge sizing | profile | none | n/a | MISSING | none | MISSING |
| BPP, NA, spot, irradiance ladder as a "where this lands" readout | ui-core, profile | view (readout) | n/a | MISSING | none | MISSING |
| lid interlock as a sim state | sim | none | n/a | MISSING | none | MISSING |

Outside the fabrication core; the plan keeps it as a catalog-listed calculator at most (`fab-knowledge:sources/benches/benches-machines.md` lines 860 to 867). M16 plans `designs/plenum/legacy/` (M16-knowledge-registry.md line 636). `lineage.json` holds no PLENUM row (checked 2026-10-05).
