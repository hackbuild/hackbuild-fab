# QUENCH: how it is made

Record written 2026-10-05 from the original code. Slug `quench`. Family counters-machines (KNURL, DETENT, WASHER, PLENUM, QUENCH, COFFER). QUENCH is a portable plasma cut planner: an energy-balance cut speed model, a quality window verdict, a kerf section, a battery and compressed air budget, an ice-bath coil dryer and a rolling mass check, with a three.js plate being cut. It came from the same chat as PLENUM; where PLENUM shows a diode bank cannot cut steel, QUENCH plans the portable plasma route.

Number rules for this file. A number that names a code location is a declared value. "Computed" means produced on 2026-10-05 by the page's own `solve`, `limitFor` and budget arithmetic extracted verbatim and run in node (`fab-knowledge:originals/quench/drive/model.cjs`, output `drive/model-2026-10-05.json`) or read off the page in headless Chrome. The page says its constants were "fitted against published 45 A mild steel cut charts (1.6 to 16 mm) and cross checked at 30 A and 65 A" (lines 241 to 243); the charts are not in the file, so treat the fit as stated, not reproduced.

Short path: `F` is `fab-knowledge:originals/quench/files/`. Bare line numbers are lines of `F/quench.html` (680 lines).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "QUENCH" portable plasma cut planner |
| owner's slug | quench |
| canonical file | `F/quench.html`, copied from `fab-work-directory:benches/quench-plenum/outputs/quench.html` |
| sha256 | 0ed5fed220e786c3f953ccbb7fdf0505f10dca27332b54fd04d4c8dacb1f818c |
| bytes | 29795 |
| date | 2026-07-31 14:40 (mtime of the byte-identical `~/Downloads/quench.html`) |
| runtime | one hand-written file; three.js r128 from cdnjs; Google Fonts |
| registry stub | `hackbuild-tools/tools/vision-3d-and-cad/quench/README.md` in `~/Downloads/hackbuild-tools (3).zip` |

### 1.1 Revisions and why this one

Only one revision exists. The drive on 2026-10-05 opened it with zero page or console errors (measured). The header carries its own disclaimer: "planning aid only. use your torch manufacturer cut chart for final settings."

### 1.2 What is in `files/`

`quench.html` only. Hashes: `fab-knowledge:originals/quench/SHA256SUMS`.

---

## 2. What it makes and for whom

A planner for someone building a battery cart around an inverter plasma cutter: at a current, standoff, material and thickness, what feed rate cuts clean, how the kerf and bevel look, how much cutting a battery pack and compressor buy, how long an ice-bath coil dryer lasts, and whether the cart is still something one person can roll.

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/quench/drive/shoot.cjs` with `drive/shots.json` (puppeteer-core, headless Chrome with SwiftShader, 1280 x 860, 6 s wait, no hook).

| file | caption |
|---|---|
| `shots/q01-default-6mm-mild-45A-iso.png` | Defaults (45 A, 1.5 mm standoff, 6 mm mild steel, 100 percent feed): 1220 mm/min, CLEAN CUT, the speed window bar with the needle in green, kerf 1.72 top and 1.36 bottom, bevel 1.7 deg, lag 2.10 mm, heat 243.5 J/mm, coupling 40 percent; the kerf section; footer budget: 6.69 kW arc and 7.78 kW average, 34.8 min arc-on, 42.4 m of cut, 94 percent duty, 211 W dryer load, 5.3 m of coil, 132 min of ice, 95 kg rolling in amber. 3D: torch over a plate with the kerf running. |
| `shots/q02-end-view-feed-125-high-speed-dross.png` | END view at 125 percent feed: HIGH SPEED DROSS. |
| `shots/q03-feed-150-no-cut-through-side.png` | SIDE view at 150 percent: NO CUT THROUGH, the arc glow under the torch, kerf bottom 0.97 mm, bevel 3.6 deg, dross beads in the section. |
| `shots/q04-aluminium-12mm-feed-60-low-speed-dross.png` | 5052 aluminium, 12 mm, 60 percent feed: LOW SPEED DROSS, optimum 591 mm/min. |

---

## 4. Code map

| area | lines |
|---|---|
| CSS (dark shell, `--arc #ff7a1a`) | 10 to 106 |
| markup: header with disclaimer; left Torch, Workpiece, Travel, View; stage; right Result, window bar, kerf section; footer Battery, Air supply, Coil dryer, Cart | 110 to 229 |
| `MATERIALS` | 245 to 249 |
| `solve` (energy balance, kerf, bevel, lag, heat, verdict) | 252 to 280 |
| `limitFor` (thickness limits) | 282 to 292 |
| state, `recompute`, window layout | 294 to 346 |
| `drawDiag` (kerf section) | 348 to 416 |
| `budget` (battery, air, dryer, mass) | 418 to 466 |
| 3D: `init3D`, `halfGeom`, `rebuild` (cut plate), views, `tick` | 468 to 642 |
| wiring | 644 to 677 |

No hook, no exports, no tests.

---

## 5. Mechanisms and models

### 5.1 Energy-balance cut model (`solve`, lines 252 to 280)

| quantity | equation |
|---|---|
| arc voltage | `V = clamp(95 + 2.5 t + 8 (standoff - 1.5), 90, 175)` |
| arc power | `Parc = V I` |
| kerf coupling | `eta = clamp(0.60 / (1 + t/12) x (I/45)^1.19, 0.02, 0.75)` |
| removal power | `Pk = Parc eta k_mat` |
| nozzle orifice | `0.55 + 0.013 I` mm |
| kerf top | `orifice (1.35 + 0.028 t)` |
| optimal speed | `vOpt = (Pk / Hv) / (kerf top x t)` converted to mm/min |
| commanded speed | `v = vOpt x feed / 100`, r = feed / 100 |
| bevel per side | `1.5 + 0.04 t + (r < 1 ? 6 (1 - r)^1.3 : 4 (r - 1)^1.1)` deg |
| kerf bottom | `max(0.30 kt, kt - 2 t tan(bevel))` |
| cut lag | `0.35 t r^1.8` |
| heat input | `Parc / v` in J/mm |

Materials (declared): mild steel Hv 9.42e9 J/m3, k 1.00; stainless 304 8.08e9, 0.75; aluminium 5052 2.61e9, 0.35.

Verdict by r (lines 272 to 276): over 1.35 NO CUT THROUGH (severity 1.0); over 1.15 HIGH SPEED DROSS (severity `0.2 + 0.8 (r - 1.15)/0.20`); 0.78 to 1.15 CLEAN CUT (0.05); 0.55 to 0.78 LOW SPEED DROSS (`0.2 + 0.6 (0.78 - r)/0.23`); below OVERMELT (1.0). Severity drives the dross bead count and colour; the verdict colour is green for CLEAN CUT, red when severity is over 0.7 and orange otherwise. The window bar draws four bands at 30 to 78, 78 to 115, 115 to 135 and 135 to 160 percent, so the OVERMELT verdict below 55 percent has no band of its own on the bar (found by reading). The "kerf coupling" readout is `eta x k_mat` (40 percent mild at defaults, 11 percent for 12 mm aluminium in `shots/q04`), not eta alone.

`limitFor(s, floor)`: walk thickness from 1 mm in 0.25 steps until `vOpt` drops under 250 mm/min (quality) or 90 (severance).

Computed at defaults (45 A, 1.5 standoff, 6 mm mild): V 110, Parc 4.95 kW, eta 0.40, orifice 1.135, kerf top 1.723, bottom 1.358, vOpt 1220 mm/min, bevel 1.74, lag 2.10, heat 243.5 J/mm, CLEAN CUT. Thickness sweep: 1.6 mm 5931, 3 mm 2888, 6 mm 1220, 10 mm 608, 16 mm 305, 25 mm 151 mm/min. Limits: mild 18.0 and 33.5 mm, stainless 16.5 and 31.5, aluminium 21.0 and 37.5 (quality and severance).

### 5.2 Kerf section (`drawDiag`, lines 348 to 416)

Two plate halves drawn with the kerf top and bottom, a heat-affected-zone stroke whose width scales with heat input, dross beads below when severity is over 0.12 (red over 0.7), dimension lines for kerf top and bottom and thickness, and footers for bevel, lag and HAZ.

### 5.3 Battery, air, dryer and mass budget (`budget`, lines 418 to 466)

| quantity | equation | default (computed) |
|---|---|---|
| torch air | `2.0 + 0.055 I` SCFM at 75 psi | 4.5 SCFM |
| arc duty ceiling | `clamp(compressor CFM / need, 0, 1)` | 94 percent |
| wall input | `Parc / 0.74` (inverter, PFC, PSU) | 6.69 kW |
| average draw | `Pin x duty + compressor W x compDuty` | 7.78 kW |
| run time | `kWh 3.6e6 / avg / 60` | 37.0 min, 34.8 arc-on |
| cut length | `arc minutes x v` | 42.4 m |
| aftercooler load | air from 65 C to 5 C: sensible `mdot 1005 x 60` plus latent `mdot 0.0046 x 2.45e6`, times duty, plus 30 W leak; `mdot = need x 0.000566` kg/s | 211 W |
| coil length | `Q / 39.5` W per metre of 3/8 in tube in ice water | 5.3 m |
| ice runtime | `ice kg x 334000 / Q / 60` | 132 min |
| pack mass | LiFePO4 at 115 Wh/kg | 42 kg |
| compressor and tank | `14 + 3.5 CFM` | 29 kg |
| dryer and ice | `6 + ice + 2.5` | 14 kg |
| total rolling | plus 11 kg inverter plasma unit; green under 45, amber under 95 | 95 kg (94.9, amber) |

### 5.4 The plate being cut (lines 468 to 642)

A 220 x 140 mm plate: two halves extruded from a trapezoid profile of the kerf (`halfGeom`, top width `kt/2`, bottom `kb/2`) up to the torch position, the uncut remainder as a box, a groove floor instead of a through slot when r is over 1.35 (depth `t x clamp(1.35 - (r - 1) 1.6, 0.25, 0.95)`), and dross spheres along both bottom edges only when the cut goes through and severity is over 0.12 (radius `clamp(0.25 + 1.1 sev, 0.25, 1.6)`, red over 0.7, size jittered by `sin(3.1 x)`), so a NO CUT THROUGH plate shows a groove and no dross while the 2D section still draws beads (`shots/q03`). The arc is a glowing column under the torch, scaled by the orifice and `standoff + 0.9 t` tall, shown only while the torch is over the plate. The torch moves at `v/60 x 0.55` mm per second of animation and loops. Views ISO, END and SIDE set the orbit camera.

---

## 6. UX anatomy

Dark instrument shell with an orange arc accent. Header: QUENCH wordmark, subtitle, the red disclaimer. Left: Torch (20 to 65 A, standoff 0.8 to 4.0 mm, orifice, voltage, power), Workpiece (MILD, 304 SS, 5052 AL; thickness 0.8 to 25 mm; quality and sever limits), Travel (feed 30 to 160 percent of optimum, commanded and optimal), View (ISO, END, SIDE; RUN CUT, RESET). Stage: the plate and torch. Right: the big optimal speed, the verdict sentence with colour, the window bar with needle, kerf and heat readouts, the kerf section. Footer: four budget cells with editable pack, compressor and ice inputs. `prefers-reduced-motion` honoured. Under 1100 px it stacks.

What makes it excellent: the verdict and the window bar make the feed rate a place on a map rather than a number; the budget turns a cut chart into minutes, metres and kilograms.

Defects found by reading: `rebuild()` runs every animation frame while the cut runs and allocates new geometry and materials each time without disposing them (lines 616 to 620, 558 to 602); the 2D dross radius expression `0.6 + 0.5 x Math.random() x 0 + 0.4` multiplies the random term by zero (line 394). The window bar has no OVERMELT band below 55 percent (section 5.1). In the ISO view the plate renders close to white (`shots/q01`, `q04`): the plate material is metalness 0.85 under the scene lights, so the material colour barely shows (measured from the shots).

---

## 7. Tests and harness

None ship. This folder's `drive/model.cjs` extracts lines 245 to 292 verbatim and evaluates the defaults, a thickness sweep, the three materials and the budget; `drive/shoot.cjs` drives the page. Checker pass 2026-10-05: 20 claims re-read against `F/quench.html` (arc voltage, coupling, removal power, orifice, kerf top, vOpt units, bevel, kerf bottom, lag, heat input units, the verdict bands, the window bar, `limitFor` step and floors, torch air, duty ceiling, wall input, average draw, run time, dryer load and coil length, ice runtime, mass terms, the plate groove depth and the torch animation rate). All matched; the verdict, coupling readout and 3D dross rules are now stated in full. All four shots were opened and show what their captions say.

---

## 8. How to make a new thing this way

1. Model the process as an energy balance with a few fitted factors, and name the charts the factors were fitted to.
2. Express the operator's control as a ratio to the optimum and map it to named quality bands.
3. Draw the consequence in section (kerf, bevel, dross) next to the number.
4. Carry the plan through to the supplies: energy, air, cooling and mass, each with a pass, caution and fail colour.

---

## 9. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| plasma energy-balance cut model and quality window | profile (stated fit) | none | n/a | MISSING | none | MISSING |
| kerf section view | ui-core | view | n/a | MISSING | none | MISSING |
| battery, air, dryer and mass budget | profile | none | n/a | MISSING | none | MISSING |

Outside the fabrication core; the plan keeps it as a catalog-listed calculator at most (`fab-knowledge:sources/benches/benches-machines.md` lines 860 to 867). M16 plans `designs/quench/legacy/` (M16-knowledge-registry.md line 636). `lineage.json` holds no QUENCH row (checked 2026-10-05).
