# SPLICE and SPLICE-C: how they are made

Two single-sided copper tape boards for a pan and tilt laser rig, cut from adhesive copper sheet on a vinyl cutter and laid on a lasercut backing. SPLICE rev C is a 29.8 x 25.9 mm breakout with no microcontroller: five input pads, two servo headers, one NPN transistor switching a laser. SPLICE-C is the castellated version: an ESP32-C3 SuperMini soldered by its edge castellations straight onto the tape, with the same servo and laser circuit, a supply jumper and a vinyl mask, on a 35.4 x 49.6 mm board. Both ship a copper cut SVG, a guide, a backing DXF and a 3D sim that is built from the cut geometry. They are the tape siblings of the TRUNNION PCB. This record says how they are made, from the original files, so a builder can make the next tape board the same way.

Number rule for this file: geometry is read from the shipped SVG, DXF and the `geo` JSON embedded in each sim; rules and circuit values are stated in `files/README-trunnion.md` (the bench README, section "SPLICE rev C") unless computed here from that geometry; measured figures come from the headless drive of 2026-10-05.

Folder: `fab-knowledge:originals/splice/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | SPLICE rev C and SPLICE-C (bench `trunnion`, chat "Laser servo control PCB design"); SPLICE-C is the file placed in the handoff registry |
| slug | splice |
| canonical revision | SPLICE-C as harvested: `files/splice-c/splicec-3d.html` (sha256 `11c95b6fa0f6b2402d25e4d3a1504e1b733f8e8985536602a814c211645db011`, byte-identical to `~/Downloads/splicec-3d.html` of 2026-09-15 15:00), `splicec-copper.svg` (`bcb735aa881d...`), `splicec-guide.svg`, `splicec-mask.svg`, `splicec-backing.dxf` (`af6a6e501874...`) |
| second board | SPLICE rev C: `files/splice-rev-c/splice-copper.svg` (`31cd7c5297be...`), `splice-guide.svg`, `splice-backing.dxf`, `splice-3d.html` (`e01a5c265d83...`), `splice3d.json` |
| earlier states | `files/earlier/splice-copper-20260730.svg` (52.0 x 33.0, nets 5V, GND, SIG1, SIG2, BASE1, BASE2, COL), `files/earlier/splicec-3d.html` and `splicec-copper.svg` (2026-08-01 00:25, 31.1 x 43.1, Q1 flipped), from the downloads reader |
| notes | `files/README-trunnion.md` |
| owner uploads | `files/owner-uploads/` (two SuperMini listing photos and two close crops of the SPLICE-C sim) |
| generator source | MISSING. Neither the script that wrote the copper SVGs, guides and DXFs nor the one that baked the sim `geo` JSON was harvested; the README says "Verified before export: every pad lands on its net" without the checker |

### 1.1 Revision table

| date | state |
|---|---|
| 2026-07-30 19:33 | earliest SPLICE copper, 52.0 x 33.0 |
| 2026-07-31 to 08-01 | SPLICE rev C breakout, 29.8 x 25.9 (README section) |
| 2026-08-01 00:25 | SPLICE-C at 31.1 x 43.1, "castellations soldered, USB over the edge", Q1 flipped |
| harvest | SPLICE-C at 35.4 x 49.6, "16 castellations, USB at the RIGHT edge", Q1 C B E, vinyl mask added |

### 1.2 Why SPLICE-C, with rev C kept

SPLICE-C is the newest and the one the registry points at; it adds the module-on-tape construction, the supply jumper and a mask. Rev C is kept as the second canonical board because its README section carries the routing rules (ladder, single width, uniform gap, erosion test) that SPLICE-C inherits and its sim drives the servos.

## 2. What they make and for whom

A maker with a Cricut (or any vinyl cutter), copper tape sheet, a laser cutter for 3 mm backing, a TO-92 NPN, a 1k resistor, two servo headers and a laser diode module builds a working laser turret controller in an evening without ordering a PCB. SPLICE rev C takes signals from any 3.3 V board; SPLICE-C carries its own ESP32-C3.

## 3. Shots

Driven headless on 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (Chrome, swiftshader, 1280 x 860) through the sims' own controls (no hook). Three r128 is inlined; fonts come from Google. Console errors: 0 (measured).

| file | what it shows |
|---|---|
| `shots/c02-splicec-base-3mA-laser-on-current.png` | SPLICE-C ISO with BASE 3.0 mA: plywood backing with the printed guide, copper nets, the SuperMini block, two servo headers, Q1, R1 standing, laser leads and a lit laser can with its beam, pink current dots on the collector path and teal dots on the base path; readout "collector 300 mA, Q1 Vce 0.29 V, Q1 heat 89 mW, laser firing" |
| `shots/c03-splicec-top-vinyl-mask-lift.png` | TOP with VINYL on and PARTS off: castellation pads under the dashed module outline labelled ESP32-C3 SUPERMINI and USB, the servo G V S pads, Q1 E B C, L- and L+, the translucent mask open at every joint |
| `shots/c04-splice-rev-c-breakout-3d.png` | SPLICE rev C sim: 5-pin input header, two servo headers with horns, Q1, R1 on 0.4 in centres, laser leads; BASE, SERVO A and SERVO B sliders; readout "collector cut off, laser dark" |
| `shots/c05-cut-files-copper-guide-mask-and-rev-c.png` | the four shipped SVGs at true aspect: SPLICE-C copper, guide (with net colours, labels and the logo), vinyl mask, and SPLICE rev C copper |

## 4. Circuits and constructions

### 4.1 NPN low-side laser switch (canon candidate `npn-low-side-tape`)

The laser's + sits on the 5 V rail and its - goes to the NPN collector; the emitter goes to ground; the base is fed only through R1 1k from a 3.3 V GPIO. About 2.5 mA of base drive gives roughly 250 mA of collector current at hFE 100; drop to 470R for more; Vce(sat) about 0.3 V, about 75 mW at 250 mA (stated). Pinout: rev C is E B C left to right with the flat face toward the pads for 2N3904, PN2222A, S8050 (BC337 reversed); SPLICE-C is C B E (part desc in the `geo` JSON). R1 on 0.4 in centres in rev C with 6.96 mm clear between the two halves of the base net (stated); standing on 4 mm centres in SPLICE-C.

Sim model (`update()`, `splicec-3d.html` lines 336 to 358): `Ic = min(Ib x 100, 400)` mA, the laser counted on when `Ic` passes 5 mA (base above 0.05 mA), off state `Vce` 5.00; `Vce = 0.25 + Ic/1000 x 0.15`, heat `Vce x Ic`; laser emissive and beam opacity scale with `Ic/250`. At 3.0 mA: 300 mA, 0.29 V, 89 mW (measured on the readout, matches the formula computed). The BASE slider sets the base current directly (slider value / 10, line 397); the sim does not derive it from the GPIO voltage and R1. By hand, (3.3 - 0.7) / 1k = 2.6 mA (computed), which is the README's "about 2.5 mA".

### 4.2 The ladder routing rule (rev C, inherited by SPLICE-C)

Every row sits on one 2.54 mm ladder; SIG A, 5V and GND run dead straight from the input pads to the servo pins; only SIG B steps one rung, on a true 45; every segment is orthogonal or 45 (stated). One trace width, 1.6 mm, everywhere; pads 2.9 x 1.6 pills with the long axis perpendicular to the pitch. Minimum gap 0.94 mm and nearly uniform, because gap = pitch - width = 2.54 - 1.6 (computed; the `SIGA` ring in `splice3d.json` spans y 4.04 to 5.64 and `5V` starts at 6.58, a 0.94 gap, computed). Each net is one contiguous piece with no interior holes; "eroding every shape by 0.75 mm leaves one connected skeleton", so nothing tears while weeding (stated, not rerun here).

### 4.3 Cut file format

Copper SVG: black on white, true size in mm (`width="29.8mm"`, `"35.4mm"`), one closed `evenodd` path per net, pads as rounded pills sampled as polylines. Guide SVG: the same geometry as outlines and fills with labels for laying the tape (SPLICE-C guide adds net colours, the SuperMini outline and a logo). Mask SVG (SPLICE-C): three vinyl parts, the first with 8 openings, open at every solder joint (`mask_parts` in the `geo` JSON: 3 parts, holes 8, 0, 0, counted). Backing DXF: rev C is R12 with layers OUTLINE (chamfered board), HOLES (four 3.2), ENGRAVE (every copper outline for registration), LABELS (TEXT), using only LINE, CIRCLE and TEXT; SPLICE-C's DXF has `$INSUNITS 4` and layers OUTLINE, ENGRAVE, LABELS with no HOLES layer and no `$ACADVER` (read from the file header).

Process (TRUNNION tape notes in the same README): cut, weed, lay each net down as a single piece; overlapping tape joints are resistive because the adhesive does not conduct, so solder any seam.

### 4.4 SPLICE-C: module on tape, supply jumper, mask

Board 35.4 x 49.6, corner radius 3.2, backing 3.0 thick (`geo.board`). The SuperMini lies on the tape and is soldered by its 16 castellations, USB at the right edge (part U1 desc). Nets: USB5V, V5, GND, SIG1, SIG2, BASE1, BASE2, COL, plus 11 MECH islands (`geo.nets`, counted). `JMP` solder jumper: bridged, USB 5 V feeds the rail; cut, the rail takes external power only. `EXT` wires: EXT+ taps the rail, EXT- taps ground at the emitter. `LAS` wires feed the laser. Build order is three layers like SPINDLE: guide sticker on the backing, copper, then the vinyl mask (`buildGuide`, `buildCopper`, `buildMask`, lines 129 to 190).

Hazard carried over from TRUNNION: never feed external 5 V while the bridge is intact and USB is plugged in; the SuperMini has no OR-ing diode on its 5 V pin (stated for SJ1 in the README; same topology).

### 4.5 3D sim built from the cut geometry

The sim reads `geo` (line 67): backing extruded from the outline with holes; each net ring extruded by `0.07 x TZ` (tape thickness 0.07 shown at a chosen exaggeration, `buildCopper`, lines 129 to 147); the guide PNG mapped onto the backing top by board UV (lines 149 to 168); parts drawn by kind: `header`, `to92`, `axial`, `module`, `bridge`, `wires` (lines 209 to 291); `jumper` has no renderer, so JMP is invisible. Current flow: point lists `flow.main`, `ret`, `emit` resampled every 1.2 mm with 26 pink dots, and `flow.base`, `base2` with 8 teal dots (lines 309 to 332). Click a copper mesh to light its whole net and read its rule; click a part for its description (lines 379 onward). Further construction read from the code: the vinyl mask is extruded 0.14 thick (two tape thicknesses) at 0.24 opacity and sits on top of the copper at `TH + 0.07 TZ + 0.01` (lines 171 to 190); `backCopper()` (lines 191 to 202) extrudes an optional `nets_back` layer under the backing for a two-sided tape board, though neither shipped `geo` carries `nets_back` (checked 2026-10-05); the `module` kind draws the SuperMini as a black block sized from the part's `w`, `th`, `d` with a USB shell 8.94 x 3.16 x 7.35 at its left end, a 5 x 5 chip and a 5.5 x 9 antenna plate (lines 259 to 268); `bridge` draws a translucent patch plus a 1.6 wide copper strip between two pins (lines 269 to 278); LIFT raises parts by 0.12 and copper by 0.035 per step, so guide, tape and parts separate (lines 345 to 347). Camera presets ISO (az -0.7, el 0.85, r 78), TOP (0, 1.45, 66) and EDGE (0, 0.07, 72) (line 457).

Defects: the TAPE Z `onchange` handler (lines 400 to 454) pastes the whole guide, copper, mask and back-copper build again inside the handler. Copper is rebuilt cleanly (`buildCopper` removes the old group first), but the pasted code declares `let guideMesh` and `let maskGrp` inside the handler, which shadow the outer variables: every change adds a guide plane that stays visible and that the GUIDE toggle cannot reach, and a mask group that starts hidden and that the VINYL toggle cannot reach, while VINYL keeps showing the first mask at the first tape height; the net click text is rev C's ("1.6 mm wide, 0.94 mm from its neighbours") hard-coded into SPLICE-C.

## 5. UX anatomy

| region | content |
|---|---|
| header | `SPLICE-C.` in Permanent Marker with a pink dot, subtitle in Special Elite ("castellated / 35.4 x 49.6 mm / single sided"), `hack.build` right |
| SIM card | cream heading strip, 2 px cream border, 5 px black shadow: BASE mA 0 to 6.0, LIFT (parts and tape lift off the backing), TAPE Z 1 to 30 x 0.07 mm; toggles ISO, TOP, EDGE, PARTS, CURRENT, GUIDE, VINYL, SPIN (rev C adds SERVO A and SERVO B sliders) |
| info card | live readout (base drive, collector, Vce, heat, laser, tape) or the clicked net or part |
| stage | soft PCF shadows at 2048, hand orbit (pointer, right-drag or shift pan, wheel zoom 12 to 300) |

What makes it excellent: the board on screen is extruded from the exact cut geometry, the current dots walk the real load and base paths, and LIFT separates guide, copper and parts so the build order is visible. The single-width ladder rule makes the cut file weedable by construction rather than by inspection.

## 6. Tests and harness

None shipped. The README's pre-export verification (every pad on its net; laser + on 5V, laser - on the collector, emitter on ground, base only through R1) and the 0.75 mm erosion test are stated without code. Not rerun here (no polygon library installed for this pass).

## 7. Port map

| item | value |
|---|---|
| packages | `copper` (ladder strategy, single width, uniform gap, erosion connectivity), `circuits` / `archetypes` (NPN low side), `board` (backing DXF), `ui-core` (board drive pad: base current slider and current dots) |
| feature kinds | `pad`, `conductor` (copper kinds); MISSING: a `weedability` check (erode by 0.75, one component) and a `castellated-module-seat` on tape |
| canon ids | `npn-low-side-tape` (candidate, CANONS.md line 1182); `c3-carrier` (candidate, line 598, through the SuperMini pad map); MISSING: `copper-ladder-route` (all rows on one 2.54 ladder, orthogonal or 45, gap = pitch - width), `armed-indicator` (TRUNNION note) |
| reference ids | `seats/c3-supermini` (handoff INDEX, SPINDLE source); MISSING: a SPLICE board reference |
| milestones | M05 (copper routing and the weedability check), M08 (board and catalog, NPN archetype candidate) |
| lineage row | MISSING |
