# Prior art and position

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

This file holds the novelty claim in the form that survives the prior art, the related work with
corrected citations, the evidence behind the claim and its weak points, the plan to demonstrate it,
the competitor facts as verified on 2026-10-04, where the project loses, the 2026 AI research the
agent surface rests on, the claims that may not be cited yet, and the open questions. PLAN.md
sections 2 and 19 summarise it; this file is the detail.

Source order: `fab-knowledge:synthesis/verified-claims.md`
overrides every other note. Below it sit
`fab-knowledge:synthesis/prior-art-and-position.md` and the
research notes listed in section 10. Where they disagree, the verified claim wins and the correction
id (C-##) is named.

Qualifiers follow D-007. A number reported in a paper is "measured by the authors" or "computed by
the authors". A price, user count or datasheet value is "vendor". A number this project produced by
rerunning code is "computed (rerun)". hbf (working name) is the binary, CHASE (working name) is the
typed design document, STYLUS (working name) is the printed sensor design, PIP (was HAFT) is the
published controller at hackbuild/pip-controller.

## 1. The claim

### 1.1 Public wording

The public wording is fixed by D-020 and used verbatim on the site, in READMEs, talks and papers:

> In hackbuild-fab a printed conductor is a region of the part. The build derives the nets from the
> conductive geometry it produced, computes each net's resistance from printed cross section, path
> length and a per-direction resistivity, solves the operating point, and checks the voltage
> against the thresholds of the pin it lands on. For multi-material printed nets we found none that
> does this in the surveyed literature; the tools we surveyed take design intent in (a schematic, an
> electrode list or drawn traces) and put geometry out.

Scope of the claim (C-13): multi-material printed nets, and cross-process conductive regions, whose
anisotropic per-net resistance is derived from the built conductive geometry and solved as an
operating point against the receiving pin's thresholds. Flat PCB netlist extraction exists (CAM
compares Gerber copper against an IPC-D-356 netlist), so flat copper is outside the claim. Altium
Designer 3D-MID holds nets on a solid, so "holds nets and solids together" is outside the claim.

### 1.2 One-line form

> Nets and resistance derived from the printed solid, checked against the microcontroller pin.

The one-line form appears only beside a link to the full wording and the related-work table in
section 3.

### 1.3 Academic framing

"Geometry to netlist with a solved DC check, inside a multi-process deterministic build." A paper or
talk cites, at minimum, Capricate, Midas, Wasserfall et al. 2020, Trilaterate, Thermoformed Circuit
Boards, SurfCuit, Printegrated Circuits and Altium Designer 3D-MID, with Tactlets as placement prior
art for `arch.apply`. Survey wording is "none found in the surveyed literature", with the survey
list attached.

### 1.4 Retired wording

| retired | why | replacement |
|---|---|---|
| "KiCad knows nets and not solids. Fusion knows solids and not nets. Nothing holds both." (v3 PLAN.md section 2) | Altium 3D-MID holds nets on a STEP or IGES substrate; Wasserfall's slicer holds an EAGLE netlist and a solid (verified-claims C12, C13) | section 1.1 |
| "nothing else in the world can say so" | universal negative; Capricate reasoned about printed trace resistance against a sensing threshold in 2015 | "none found in the surveyed literature" |
| "netlist in, routed geometry out" as the description of rivals | Capricate takes electrode placements, TCB takes clicked grid points, Tactlets has traces drawn by hand | "design intent in (schematic, electrode list or drawn traces), geometry out" |
| "a 45k pullup" in the BLOCKS story | the shipped BOSS sim models 50 kohm (C-02, D-076) | 50 kohm, with wire material and carbon-filled filament stated (D-077) |
| TCB as "the closest thing found" (v3 section 15) | Capricate is closer: in-solid routing, conductive partition, directional resistivity, a resistance ceiling | Capricate named as nearest prior art |
| vinyl copper routing under "nobody has it" (v3 section 15) | Midas (UIST 2012) auto-routed vinyl copper sensor layouts | "No maintained tool routes vinyl copper with clearance, weedability and terminal gates." (D-029) |
| first, only, nobody, nothing else | owner language rule and D-020 | not used in public copy |

### 1.5 The second claim

The declaration loop is the broader differentiator and carries less novelty risk than the conductor:

> A design is a typed document of declarations. The tool derives legal intervals from its kernels
> before a value is chosen, builds deterministically, and proves every declaration against the
> built geometry with a check that cites the failure it came from.

| nearest prior art | what it does | what it lacks against the loop |
|---|---|---|
| brepjs-cad 0.178.2 | a part module exports `expected = {volume, tolerancePct}`; the CLI exits non-zero unless the shape is valid and each declared measurement is in tolerance | checks after generation; no derived intervals; one process |
| Onshape FeatureScript | typed parameters with bounds in a precondition block | bounds are static, carry no reason, no fabrication checks |
| atopile | `assert v_out within 3.3V +/- 5%` on electrical parameters | electrical only |
| Circuit JSON error elements | errors keyed by element id with `minimum_clearance` and `actual_clearance` | produced after layout, board only |
| PCBSchemaGen verifier | deterministic five-layer verifier with localized errors | schematic structure only |

None of these spans processes, derives intervals before generation, or records an origin per rule.
The defensible asset is the failure corpus that the origins point at (D-023).

Carries: D-020, D-023, C-13.

## 2. What survives and what does not

### 2.1 The claim split into parts

| part of the claim | status | closest prior art (verified) |
|---|---|---|
| conductor as a material region of a printed solid | prior art, many times | Capricate (UIST 2015), Flexibles (CHI 2017), Trilaterate (CHI 2019), MetaSense (UIST 2021), TCB (CHI 2021) |
| automatic routing of conductors inside a solid | prior art | Capricate (A* on a regular 3D grid, electrode to nearest endpoint); Trilaterate (shielded routing); Wasserfall et al. 2020 (octagrid A* inside a modified Slic3r from EAGLE schematics) |
| a tool that holds nets and a solid together | prior art, commercial | Altium Designer 3D-MID (single-part STEP or IGES substrate). Other 3D-MID tools are unverified (section 8) |
| netlist extraction from built copper | prior art for flat PCB | CAM comparison of Gerber copper against IPC-D-356 |
| resistance from printed geometry, R = rho L / (w t) | textbook, used as a design rule | Flowers et al. 2017; Capricate 30 kohm ceiling; Crespo-Miguel et al. 2025 three-direction conductivity |
| vinyl copper routing | prior art | Midas (UIST 2012); SurfCuit (IEEE CG&A 2017) routes copper tape on print surfaces |
| placing parametric controls on faces of a 3D shape | prior art | Tactlets (UIST 2019), 10 controls, traces routed by hand |
| nets derived from multi-material printed conductive regions after the build, no schematic as input | none found in the surveyed literature | every surveyed system takes design intent in and puts geometry out |
| per-net DC resistance from cross section, length and per-direction resistivity, solved as an operating point and checked against the receiving pin's VIL and VIH | none found in the surveyed literature | Capricate stops at a resistance ceiling for capacitive SNR; Protoboard checks voltage and protocol at system level and cannot see whether a printed path is 22 ohm or 22 kohm |
| one deterministic build across FDM, laser, vinyl copper and PCB with one versioned check registry | no single tool found | HPI tools are laser only; HCI printed-circuit tools are FDM only; Midas is vinyl only; Altium is PCB plus MID; Platener mixes print and laser with no electrical content |
| fit classes that change with process pair, each tied to a recorded failure | no published equivalent found | SpringFit and Kerf-Canceling Mechanisms address laser kerf only |
| legal intervals derived from kernels before generation, returned with the reason | no product found | Onshape bounds are static; brepjs-cad and atopile check after |

### 2.2 Direction of derivation

Every surveyed system takes intent in and makes geometry. The value of the reverse direction grows
because of that: hbf can check geometry other tools emit, and imported meshes that never had a
schematic.

| system | input | output | router | electrical model |
|---|---|---|---|---|
| Midas (UIST 2012) | sensor shapes, types and obstacles drawn in an editor | vinyl-cut copper pads with routed connections, assembly steps, firmware | automatic over the sheet | capacitive touch events |
| Capricate (UIST 2015) | electrode placements on a mesh | conductive and non-conductive partition of the solid | A* on a 3D grid, nearest endpoint, no netlist | 30 kohm ceiling as a design rule |
| Trilaterate (CHI 2019) | sensor placement | shielded sensors routed in the solid | automatic | capacitance |
| Tactlets (UIST 2019) | controls from a 10-entry library placed on a shape | taxels with traces to an accessible point | by hand | electro-tactile drive and touch |
| Wasserfall et al. (2020) | EAGLE schematic plus the model, inside the slicer | G-code with channels, silver paste wires and pick and place steps | octagrid A* in slicer polygons, offsets Delta_k = k dp + (dc + gamma)/2, interlayer overlap omega | none found in the text |
| TCB (CHI 2021) | substrate STL plus clicked grid points | substrate and trace STLs | by hand on a point grid | none |
| SurfCuit (IEEE CG&A 2017) | circuit on a print surface | copper tape layout | interactive tool | none |
| Altium Designer 3D-MID | schematic nets plus a single-part STEP or IGES substrate | traces on the 3D surface, STEP, IGES or Parasolid, pick and place for LDS | interactive | 3D DRC in open beta (width, clearance, length) |
| hackbuild-fab | CHASE plus build.ts, or an imported mesh | Part IR, nets derived from conductive bodies, per-net resistance, operating point, per-MCU verdict | PIP router merged with TOGGLE assignment (D-092) for routing; extraction runs on any geometry | analytic DC in the bake, eecircuit-engine lazy (D-086) |

Evidence for the table: `fab-knowledge:evidence/x/web-hci-fab-research/`
(`capricate.txt`, `wasserfall.pdf.txt`, `tcb.pdf.txt`) and
`fab-knowledge:research/hci-fabrication-prior-art.md` section
3.1, corrected by verified-claims C12 (Tactlets routes by hand; Wasserfall is 2020).

Carries: D-020, D-021, C-13.

## 3. Related work

### 3.1 Printed conductors and circuits in solids

| work | authors, venue | identifier | what it shows | relation | what hackbuild-fab takes |
|---|---|---|---|---|---|
| Capricate | Schmitz, Khalilbeigi, Balwierz, Lissermann, Mühlhäuser, Steimle. UIST 2015 | https://mschmitz.org/publications/schmitz-UIST15-capricate.pdf | capacitive electrodes printed inside an object in one multi-material pass; electrode routed to the nearest endpoint, no schematic; cABS resistivity 0.438 along, 0.817 perpendicular in plane, 0.998 ohm cm vertical (measured by the authors, 14 samples at 100 x 12 x 1 mm); trace resistance at most 30 kohm for SNR 5:1 across electrodes of 5 to 20 mm (measured by the authors); electrode thickness at least 0.2 mm, width and length at least the 0.8 mm nozzle; overlay at most 10 mm at SNR 6.33 | nearest prior art | profile row cABS (D-081); capacitive plate check constants; reference reproduction (section 4.5) |
| Midas | Savage, Zhang, Hartmann. UIST 2012 | DOI 10.1145/2380116.2380189 | vinyl-cut copper sensor layouts with auto-routed connections, assembly instructions and firmware | prior art for vinyl routing | `copper` cites it; extraction trigger D-029 |
| Topology-Aware Routing of 3D-Printed Circuits | Wasserfall, Hendrich, Ahlers, Zhang. Additive Manufacturing 36 (2020) 101523 | DOI 10.1016/j.addma.2020.101523 | EAGLE schematics imported into a modified Slic3r; octagrid A* grown in infill, perimeter-respecting offsets, interlayer overlap | design intent in | reference design for in-print routing offsets |
| Trilaterate | Schmitz, Stitz, Müller, Funk, Mühlhäuser. CHI 2019 | https://mschmitz.org/publications/schmitz-CHI19-trilaterate.pdf | hover, touch and force position by capacitive trilateration; the tool places and routes actively shielded sensors in the object | design intent in | shield layer in the buried stack |
| Thermoformed Circuit Boards (TCB) | Hong, Myant, Boyle. CHI 2021 | arXiv 2011.06473 | flat printed substrate with conductive traces, heat bent, copper electroplated to 0.1 to 0.2 ohm (measured by the authors); Rhino and Grasshopper editor draws traces on a point grid and exports STL; vertical Electrifi traces 7x the resistance of horizontal (measured by the authors); 0.5 mm minimum electroplatable trace and gap at a 0.4 nozzle | geometry out, no netlist | sloped and vertical conductor warnings |
| Flexibles | Schmitz, Steimle, Huber, Dezfuli, Mühlhäuser. CHI 2017 | https://mschmitz.org/publications/schmitz-CHI17-flexibles.pdf | printed flexible tangibles mapping press, squeeze and bend to touchscreen signals | conductor as a region | flex button lineage in the archetypes registry |
| MetaSense | Gong, Seow, Honnet, Forman, Mueller. UIST 2021 | https://hcie.csail.mit.edu/research/metasense/metasense.html | metamaterial cell walls as capacitive electrodes placed from a mechanical simulation; wiring by hand, auto-routing listed as future work | conductor as a region | archetype candidate (shear-cell sensor) |
| SurfCuit | Umetani, Schmidt. IEEE CG&A 2017 (arXiv 1606.09540, 2016) | arXiv 1606.09540 | copper tape and solder on FDM print surfaces, routed by an interactive tool | design intent in | vinyl copper on 3D faces |
| Printegrated Circuits | Child, Hanton, Dawson, Hodges, Fraser. TEI 2026 | https://research-information.bris.ac.uk/en/publications/printegrated-circuits-personal-fabrication-of-3d-printed-devices-/ | a conventional PCB embedded during printing; conductive filament driven into plated holes ("Prinjection") | design intent in | third seat mode candidate |
| Altium Designer 3D-MID | Altium, product | https://www.altium.com/documentation/altium-designer/pcb/3d-mid-design | schematic nets routed on a single-part STEP or IGES substrate | nets on solids, design intent in | reverse-check target (section 4.5) |
| Tactlets | Groeger, Feick, Withana, Steimle. UIST 2019 | https://www-live.dfki.de/fileadmin/user_upload/import/10735_tactlets_UIST_19.pdf | Rhino add-on placing 10 parametric electro-tactile controls on 3D shapes; traces routed by hand | placement prior art for `arch.apply` only (C-13) | cited in CANONS.md beside `arch.apply` |

Physics references used by `profile` and the archetypes:

| work | identifier | figures | use |
|---|---|---|---|
| Flowers, Reyes, Ye, Kim, Wiley. Additive Manufacturing 18 (2017) 156 to 163 | https://people.duke.edu/~bjw24/Publication86.pdf | printed carbon black 12, graphene 0.78, Electrifi 0.014 ohm cm (measured by the authors); resistors over three decades tuned by geometry | R = rho L / (w t) as an accepted design rule |
| Crespo-Miguel et al. Nature Communications 2025 | PMC11794641 | three principal conductivity directions for Protopasta CB-PLA, strain and temperature dependent | the along, across, through model |
| Nowka 2024 | PMC11510930 | Protopasta cPLA printed 11.69 parallel, 16.37 perpendicular, 8.005 ohm cm Z (measured by the authors); Electrifi printed 0.021, 0.048, 0.061 ohm cm | Protopasta rows only (C-09); never applied to Yousu |

### 3.2 Sheet, laser and mechanism design

| work | identifier | figures (qualifier) | use |
|---|---|---|---|
| HPI Baudisch lab project list | https://hpi.de/baudisch/projects.html (read 2026-10-04) | 18 laser-related projects including two at UIST 2026 | v3 and RESEARCH.md said twelve |
| Platener. Beyer, Gurevich, Mueller, Chen, Baudisch. CHI 2015 | DOI 10.1145/2702123.2702225 | 10x or more speed-up for 39.5 percent of 2,250 models (measured by the authors; C-14) | print only what needs printing |
| SpringFit. Roumen et al. UIST 2019 | https://hpi.de/baudisch/projects/springfit.html | cantilever springs take 7.5x the kerf variation at equal stiffness (measured by the authors); tested at 0.12 and 0.20 mm kerf | sheet fit failures offer the cantilever as a legal alternative |
| Kerf-Canceling Mechanisms. Roumen et al. UIST 2020 | https://hpi.de/baudisch/projects/kerf-canceling-mechanisms.html | bearings work from 0 to 0.45 mm simulated kerf; friction 3.1 to 3.4 mN across kerf against 40.6 mN tight for a plain bearing (measured by the authors) | mechanism canon entry candidate; "lasercut pegs are cams" has a published fix |
| Roadkill. Abdullah et al. UIST 2021 | https://hpi.de/baudisch/projects/roadkill.html | assembly 2.4x faster than pair-wise labelling (measured by the authors) | `nest` assembly-adjacency objective |
| Assembler3. Roumen et al. CHI 2021 | DOI 10.1145/3411764.3445453 | 100 of 105 models reconstructed from 2D plans (measured by the authors) | SVG and DXF import into Part IR |
| kyub. Baudisch et al. CHI 2019 | https://hpi.de/baudisch/projects/kyub-a-3d-editor-for-modeling-sturdy-laser-cut-objects.html | closed finger-jointed boxes hold over 500 kg (measured by the authors) | closed-box rule as a sheet check |
| Fabricaide. Sethapakdi, Anderson, Sy, Mueller. CHI 2021 | https://hcie.csail.mit.edu/research/fabricaide/fabricaide.html | stock-aware live nesting | `nest` objective, stock in `profile` |
| Computational Design of Mechanical Characters. Coros et al. SIGGRAPH 2013 | https://studios.disneyresearch.com/2013/07/21/computational-design-of-mechanical-characters/ | mechanism chosen and optimised from a sketched motion curve | motion-curve index over the mechanisms registry |
| Computational Design of Linkage-Based Characters. Thomaszewski et al. SIGGRAPH 2014 | https://ri.cmu.edu/publications/computational-design-of-linkage-based-characters | topology browse then continuous optimisation with singularity guards | linkage constraints |
| Acoustic Voxels. Li, Levin, Matusik, Zheng. SIGGRAPH 2016 | https://www.cs.columbia.edu/cg/lego | per-primitive characteristics precomputed and composed | canon entries store a precomputed characteristic |

What the literature has that the canons lack: an inverse step from desired motion to mechanism. What
the canons have that the literature lacks: checks that cite recorded failures, and fit classes per
process pair. No paper found carries fit classes that change with process.

### 3.3 Citation fixes applied (C-14)

| was | is | evidence |
|---|---|---|
| Wasserfall et al. 2021 | Additive Manufacturing 36 (2020) 101523 | Crossref DOI 10.1016/j.addma.2020.101523 |
| SurfCuit 2016 | IEEE CG&A 2017; 2016 is the arXiv preprint | publisher record (verified-claims C12) |
| Platener 39.9 percent | 39.5 percent of 2,250 models | DOI 10.1145/2702123.2702225 |
| ProCAD and "Clarify Before You Draw" as two works | one paper, arXiv 2602.03045; ProCAD is the system | arXiv record |
| Text2CAD-Bench "13 to 67 percent" | DeepSeek-V3.2 L1 Geo invalidity 13.3 percent (Table 1, CadQuery) against 67.3 percent (Table 3, command sequence) | https://arxiv.org/html/2605.18430 |
| Tactlets among automatic routers | routes by hand; placement prior art only | `fab-knowledge:evidence/scratch/tact.txt` lines 640 to 642 (verified-claims C12) |
| Capricate "0.2 mm minimum electrode" | 0.2 mm minimum electrode thickness; width and length at least the 0.8 mm nozzle | `capricate.txt` lines 415 to 420 |
| PCBSchemaGen 81.3 percent unattributed | Gemma-4-31B average on PCBBench | arXiv 2602.00510 |
| HPI "twelve projects" | 18 laser-related projects | hpi.de project list, 2026-10-04 |

Carries: D-021, C-14.

## 4. Evidence, weak points and demonstration

The claim is about a mechanism (derive, solve, compare) and holds at any resistivity. The
demonstration numbers hold only as far as their inputs are measured, and today none of the shop's
conductive filament is measured (D-082, owner; default: none until the owner prints the coupons, and
public claims state the tier).

### 4.1 BLOCKS undefined band, rerun (C-03, D-077)

Rerun of the shipped BOSS sim at its 50 kohm pullup, c3mini seat, PULLUP on IO2, Node v22
(computed, rerun; verified-claims C5). Source: `boss-src/src/sim.js` inside
`fab-work-directory:benches/blocks/outputs/boss/boss-src.zip`.

| wire | length (mm) | pressed pin (V, computed) |
|---|---|---|
| cPLA straight | 10 | 1.31 |
| cPLA straight | 40 | 1.62 |
| cPLA straight | 80 | 1.92 |
| cPLA straight | 120 | 2.12 |
| cPLA straight | 150 | 2.24 |
| cPLA straight | 170 | 2.31 |
| cPLA straight | 200 | 2.39 |
| cPLA zigzag | 200 | 2.42 |
| cTPU (default) | 10 to 200 | 3.15 to 3.27 |

| threshold set | source | verdict on the rerun |
|---|---|---|
| blocks.html UI hint 0.3 to 0.7 VIO, 0.99 to 2.31 V | app code, legacy | undefined for short to medium cPLA wires; leaves the band above 2.31 V at 170 to 200 mm |
| BOSS sim single threshold 0.5 VIO, 1.65 V | `sim.js:135`, legacy | the solver classifies by one threshold and has no undefined band |
| ESP32-C3 VIL max 0.825 V, VIH min 2.475 V, pullup 45 kohm typical | datasheet v2.4 p. 55 (vendor) | every cPLA case undefined |
| RP2040 VIL max 0.8 V, VIH min 2.0 V at 3.3 V, pullup 50 to 80 kohm | datasheet pp. 616 to 617 (vendor); Pico inherits, not separately checked | 2.05 V and above reads HIGH, so the press is missed; shorter wires undefined |
| any set, cTPU wires | rerun | the press never registers |

The public page states 50 kohm, the wire material, and that the result applies to carbon-filled
filament only. With Electrifi-class copper filament (printed 0.021 to 0.061 ohm cm, measured by Nowka
2024) traces fall to ohms and the band does not arise. The BOSS 50 kohm and the 0.3 to 0.7 VIO hint
are kept only to reproduce BOSS; `circuit.solve` classifies LOW, UNDEFINED or HIGH per MCU from the
per-MCU pin table and sweeps both ends of the pullup range (D-076).

### 4.2 PIP timings (D-079, C-06)

PIP (was HAFT) is the first hardware read of a printed circuit designed by this toolchain. Source:
hackbuild/pip-controller b137deb (2026-09-19T01:12:56Z), `README.md:155-180`,
`docs/electrical.md:34-41`, `firmware/pip/pip.ino:20`, `firmware/pip_stick/pip_stick.ino:25`.

| figure | value | qualifier |
|---|---|---|
| RC time constant | 15.7 us | computed (bench) |
| settle, 5 tau | 78 us | computed |
| press crossings, all keys | 113 us (RIGHT) to 2431 us (UP) | measured |
| eight of ten keys | 1067 to 2431 us, 10 to 30x the computed settle | measured |
| RIGHT, SELECT | 1.4x and 5.3x the computed settle | measured |
| touch paths | 0.91 to 0.93 Mohm | computed |
| key paths | 1.5 to 1.72 Mohm | computed |
| skin | 1 to 20 Mohm; the bench assumes 20 | inferred (docs) |
| reject threshold | about 4 Mohm (4.35 computed) | computed |
| touch accepts | under about 58 Mohm | computed |
| pip_stick KEY_WAIT_US | 3500 us | as shipped |
| pip.ino KEY_WAIT_US | 200 us | as shipped |

Two readings follow. Contact behaviour dominates bulk resistivity for keys, so a DC claim needs a
read model with a calibrated wait (D-078). And the shipped pip.ino still waits 200 us against
measured crossings above 1 ms on most keys; hackbuild-fab does not edit pip-controller (D-080, owner;
default: the gap is recorded in RISKS.md and archetype provenance, the owner decides whether pip.ino
moves to 3500 us).

### 4.3 Resistivity behind the numbers (C-09, D-081)

| row | value (ohm cm) | tier | rule |
|---|---|---|---|
| Yousu cPLA and cTPU, raw filament | 240 to 481 | vendor | raw filament only; never scaled onto printed traces by 8 to 16x |
| PIP preset cPLA along, through; cTPU | 500, 2000; 400 | inferred | working default for the shop's Yousu spool (`pip-controller/src/layout.js:46`) |
| Protopasta cPLA molded, XY, Z | 15, 30, 115 | vendor | Protopasta only |
| Nowka 2024 Protopasta printed parallel, perpendicular, Z | 11.69, 16.37, 8.005 | measured by the authors | Protopasta only |
| Capricate cABS along, perpendicular, vertical | 0.438, 0.817, 0.998 | measured by the authors | Torwell cABS; reference reproduction |
| Electrifi printed | 0.021, 0.048, 0.061 | measured by Nowka 2024 | vendor grades 0.01 and 0.1 (10,000 and 1,000 S/m) |

Full table, tiers and the coupon write path: PROFILE.md. CHK-NET-05 warns while the working row is
inferred.

### 4.4 Weak points

| weak point | effect on the claim | handling | decision |
|---|---|---|---|
| no measured coupon of the shop's Yousu cPLA or cTPU | every resistance in a demonstration is inferred | publish with the tier stated, or after a four-wire coupon along, across and through | D-082 (owner), D-081 |
| contact dominates bulk for keys (PIP 10 to 30x) | a DC operating point alone does not predict press timing | read models with coupon-calibrated waits; computed waits qualified | D-078, D-079 |
| BLOCKS verdict depends on wire material and length | the headline case fails with the default cTPU wires | page states scope; per-MCU table | D-076, D-077 |
| one hardware read so far (PIP) | thin empirical base | Capricate reproduction adds a published result; coupons add rows | D-105 |
| Nano Dimension FLIGHT behaviour unknown | one commercial tool could extract connectivity from regions | open question (section 9); wording stays "surveyed literature" | D-020 |
| survey was bounded (search budget ran out; dblp and Semantic Scholar unreachable) | a missed paper could predate the claim | survey list published with the claim | D-020 |

### 4.5 Demonstration plan

| step | milestone | what | acceptance | decision |
|---|---|---|---|---|
| 1. Reproduce Capricate | M05 | `reference/electrical/capricate-touch` rebuilds the paper's minimal electrode trace (0.8 mm wide, 0.2 mm layer) with a cABS profile row from section 4.3 at tier measured by the authors | `hbf circuit.solve` on the reference reports a 100 mm trace at 2738.7 ohm along and 5106.9 ohm perpendicular (computed from the row); the 30 kohm capacitive ceiling gives a maximum length of 1095.4 mm along (computed), consistent with the paper's reliable sensing to 10 cm; the capacitive plate check passes at 100 mm and fails past the computed limit | D-021, D-105 |
| 2. Reverse-check other tools | M05 for STL inputs, M14 for STEP | net extraction run on a Capricate STL pair, a TCB export, and an Altium 3D-MID STEP once the `brep` route can import STEP | the derived netlist equals the netlist the tool routed from, or the report names the open or short with its location | D-024, D-160 |
| 3. Fix the numbers | M05 and M08 | per-MCU pin rows in catalog with provenance; BOSS constants kept as legacy | BLOCKS reproduction within 0.01 V of section 4.1 plus per-MCU verdicts | D-076, D-077 |
| 4. Publish | after M05, owner timing | one page with the BLOCKS result (50 kohm, wire material, carbon-filled only), the Capricate reproduction, the section 3.1 table, the resistivity tier, and the verified block | page passes lint-voice; carries "What is verified, and what is not"; no first, only, nobody, nothing else | D-008, D-020 |

The Capricate case geometry beyond the minimal trace (electrode diameters 5 to 20 mm, series
resistors 20 to 120 kohm in 10 kohm steps) comes from `capricate.txt` lines 406 to 416 in the
research scratch folder. The reproduction lives in the admitting milestone with its `expected/`
goldens (D-105).

Carries: D-076, D-077, D-078, D-079, D-080, D-081, D-082, C-03, C-06, C-09.

## 5. Competitors

Facts as verified on 2026-10-04 (verified-claims C13, C9, C8). Threat reads are this project's
judgment.

| rival | layer of overlap | verified fact | source | threat | response |
|---|---|---|---|---|---|
| OrcaSlicer Design tab | kernel, export, agent | OCCT kernel with a vendored SolveSpace solver inside the slicer; PR 15238 opened 2026-08-13, landed on main 2026-09-18; nightly only, experimental and off by default; follow-up PR 16089 merged 2026-10-04, PR 16019 open; recipe stored as `Metadata/orca_cad.bin`; MCP bridge `tools/orca_cad_mcp_bridge.py` whose docstring names Claude Code; last stable OrcaSlicer 2.4.2 (2026-07-07), AGPLv3 | gh pr view 15238; docs/HLSD/design-tab.md; orcaslicer.com wiki | high, rising | position on fits, checks, provenance, conductors and multi-process; hbf tools return intervals and verdicts where the bridge returns geometry; carry `Metadata/hackbuild_chase.json` the way Orca carries its recipe (D-159); multi-material support is unverified (section 9) |
| tscircuit and Circuit JSON | PCB, agent, enclosures | MIT; `tscircuit` 0.0.2744 and `@tscircuit/core` 0.0.2086 both published 2026-10-04, several publishes a day; `tscircuit` 49,522,337 B unpacked; agent skill `tscircuit/skill` with staged `tsci check`; props `assembly.printedpart`, `enclosure.fdm.box`, `enclosure.cutoutaperture`, `insertionDirection`; circuit-json 0.0.516 (ISC) has `source_printed_part`, `cad_component.model_3mf_url`, clearance errors with `actual_clearance` and `minimum_clearance`; contributor bounties 15 to 500 USD on a weekly cycle over four weeks | npm; @tscircuit/props 0.0.687 typings; tscircuit/docs bounties-and-sponsorship.md | medium | wrap as a board backend with exact pins at M08 (D-089); emit and read Circuit JSON (D-091); ally |
| Zoo Design Studio (KittyCAD/modeling-app) | kernel, document, agent | client MIT, v1.4.11 current as of 2026-09-28; geometry engine closed and run in Zoo's cloud; KCL 2.0 default, 3.0 opt in; Zoo MCP exposes 46 tools | gh api KittyCAD/modeling-app; KittyCAD/mcp; migrating-to-kcl-3.md | medium | interop by STEP only; mine KCL tags and per-file units; offline single-file bake is a structural gap Zoo cannot close |
| Cuttle | sheet UI | 24 USD monthly or 216 USD yearly; free tier 10 downloads and 5 projects (vendor) | cuttle.xyz/pricing | low to medium | SKETCH builds assembly, mixed-process fits and sim, which Cuttle lacks; mine packaged view and per-row revert |
| Onshape FeatureScript MCP | agent, constraints | FeatureScript MCP server announced mid August 2026 (trade press dated 2026-08-14; PTC page returned 403) | embeddedcomputing.com | low | Onshape bounds are static; hbf intervals are derived from kernels and carry the reason |
| Fusion local and Data MCP | agent | exists; the July 2026 date is unverified and dropped (D-022) | Autodesk pages returned 403 | low | adapters outside core, later |
| MakerWorld Parametric Model Maker | UI, community | MakerWorld about 10M monthly users and 2.6M models (vendor, 2025); PMM runs OpenSCAD in the browser; OpenSCAD version, BOSL2 support and `mw_plate_N()` unverified | 3dprint.com/324181 | medium | OpenSCAD wrapper export of a frozen chase once the PMM facts are checked; cross-post with links back |
| brepjs-cad | declaration loop, agent | 0.178.2; part module exports `expected` values checked on a real kernel, exit code as verdict; ships `brep-mcp` with one `run_program` tool | brepjs-cad llms.txt and README | low | nearest open analogue of declare and prove; mine its report shape |
| OpenUHD and Protoboard | system description and validation | OpenUHD v0.1.0 (2026-05-03), README says it is "not a CAD kernel"; Protoboard validates voltage, protocol, timing, bolt patterns and thermal ranges | github.com/Delta-Robotics-Inc/OpenUHD README:93; protoboard.ai | low | they validate the system level, hbf the fabricated level; UHD export later (D-160) |
| LightBurn | laser output | Core 99 USD, Pro 199 USD (vendor, from 2024-10-01) | lightburnsoftware.com | low | consumer of `nest` output; `lbrn2` export kind; mine the material test ordered by risk |
| Glowforge Box Builder | sheet UI | AI box design tool shipped after Glowforge's 2025 restructuring, when the co-founders reacquired the brand, hardware and software (trade press) | https://www.geekwire.com/2025/glowforge-hits-restart-after-restructuring-co-founders-acquire-key-assets-of-laser-engraver-startup/ | low | confirms demand for SKETCH; SKETCH answers with open DXF, assembly and mixed-process fits, offline and with no account |
| xTool Creative Space | sheet UI, materials | EasySet library of 16,000+ settings per machine, material and process (vendor); scanning a QR code on xTool material loads its settings; full app on a phone for P2 and P2S (vendor support pages) | https://support.xtool.com/article/1863, https://support-pre.xtool.com/article/1306, https://support.xtool.com/article/1140 | low | a process tool with a material library and no modeller; borrow the printed code in reverse, a QR on the print card that opens the design at a permanent address (D-167) |
| Altium Designer 3D-MID | circuits on solids | schematic nets on a single-part STEP or IGES substrate | altium.com 3d-mid-design | low, different market | related work; reverse-check target |
| KiCad 10 | PCB | `kicad-cli` exports exist in 9 and 10; IPC API is PCB-only and needs a GUI until KiCad 11 adds headless IPC through kicad-cli | dev-docs.kicad.org | none | interop through files and `kicad-cli`; kicadts for read and write (D-090) |

What the Orca Design tab lacks in this plan's terms: feature kinds with fit classes, a check
registry, conductors or nets, material provenance, an art pipeline beyond extruded regions, sheet and
copper processes. What it has that hackbuild-fab does not: a BRep kernel in the slicer, STEP in and
out, an agent surface already wired, and geometry committed straight to a plate, which removes the
3MF writer problem for its users. Evidence:
`fab-knowledge:research/3dp-landscape.md` section 1.1.

Positioning (D-023): a fabrication design environment for mechanical, cosmetic and electrical things.
The CAD category carries a buyer checklist this project loses on, so public copy avoids it. The
printed conductor leads only when the question is novelty.

Carries: D-022, D-023, D-089, D-090, D-091, D-167.

## 6. Where the project loses

Stated once, with who wins and what the plan does about it.

| area | who wins | evidence | response |
|---|---|---|---|
| BRep depth, fillets on arbitrary edges, organic surfaces | Orca Design tab, Zoo, Onshape, Fusion | restricted vocabulary by design (D-024) | `brep` route via replicad 1.1.0 at M14, opt in; imported meshes as part sources |
| STEP fluency | same | STEP arrives with M14 (D-160) | interop at the edges |
| PCB layout and autorouting depth | tscircuit, KiCad | tscircuit boards in the corpus did not finish: AUGER 58 unroutable traces, GROMMET 5 DRC errors | wrap tscircuit; keep the gated Python route that produced the verified boards (D-089) |
| 2D vector editing polish | Cuttle | SKETCH v3 has no editing UI of that quality | mine Cuttle patterns in UI.md |
| collaboration, accounts, hosted rendering | Onshape, Zoo, MakerWorld | offline single-file benches by design | stated as the trust edge: work from a file, no account |
| on-platform customisation for end users | MakerWorld PMM | a chase cannot run on the platform | OpenSCAD wrapper export after the PMM facts are verified |
| community size and distribution | MakerWorld (about 10M monthly users, vendor) | no audience or platform today | cross-post; failure corpus as content (D-042, owner; default CC BY 4.0) |
| measured material data | vendors and papers | no shop coupon measured (D-082) | coupons as the only write path, by a person |
| kerf modelling | HPI line, Kerfmeter | sheet fits are fixed values while kerf varies 0.12 to 0.20 mm between cutters (measured by SpringFit authors) | kerf null until measured per machine (D-101) |
| touch authoring | Tinkercad, Shapr3D | face editor gestures are mouse only | touch-only pass at 390 px (D-125) |
| team size | every funded rival | single maintainer | RISKS.md R-20; scope held by the repo boundary rule (D-025) |

Carries: D-024, D-025, D-089, D-101, D-125.

## 7. 2026 AI research

### 7.1 CAD and PCB generation

| paper | identifier | exact figure, table and model | bearing |
|---|---|---|---|
| Text2CAD-Bench. Wang, Meng, Xiang, Liu, Zhou, Chen, Tang | arXiv 2605.18430 (2026-05-18) | DeepSeek-V3.2 L1 Geo invalidity 13.3 percent with CadQuery (Table 1) against 67.3 percent with command sequences (Table 3); L3 invalidity 68 to 70 percent applies to GPT-5.2 (68.0), Claude-4.5-Sonnet (70.0) and DeepSeek-V3.2 (69.0) only; across all models L3 Geo spans 12.8 to 92 percent (measured by the authors) | code beats command sequences; sweeps, lofts, shells and freeform are where models fail; supports the restricted vocabulary (D-024) |
| BenchCAD. Zhang, Liu, Chen, Li, Yang, Peng, Chen | arXiv 2605.10865 (2026-05-11) | 17,900 execution-verified CadQuery programs over 106 industrial part families; models replace sweeps, lofts and twist-extrudes with sketch and extrude (measured by the authors) | part families as a list for the catalog and mechanisms registry |
| Clarify Before You Draw (system: ProCAD). Yuan, Zhao, Molodyk, Hu, Chen | arXiv 2602.03045 (2026-02-03, revised 2026-06-15) | one paper; mean Chamfer distance down 79.9 percent against Claude Sonnet 4.5; invalidity 4.8 to 0.9 percent (measured by the authors) | `chase.validate` returns typed questions before generation (D-133) |
| PCBSchemaGen. Zou, Han, Nazerian, Zhang, Guo, Huang | arXiv 2602.00510 (2026-01-31, revised 2026-06-17) | 81.3 percent is Gemma-4-31B's average on PCBBench; 227 IC tasks over 22 domains; deterministic five-layer verifier with error localization (measured by the authors) | localized, deterministic findings are the shape of CheckResult (D-064) |
| CircuitLM. Al Hasan, Raiyan, Alvee, Sadik | arXiv 2601.04505 (IEEE LLM-Aided Design 2026) | 100 prompts, 5 LLMs; ERC severities Critical, Major, Minor, Warning | considered for D-067; the scale adopted is block, warn, note |
| TypedSchematics. Garza, Swanson | arXiv 2509.14576 (2025-09-18) | typed circuit blocks with real-time connection errors on merge | prior art for typed ports; the addition here is ports with geometry and fits |
| pcbGPT. King, Kehrberg, Beigl, Röddiger | arXiv 2606.01188 | Python DSL to editable KiCad schematics with multi-stage validation; existence confirmed, figures read at abstract level only (section 8) | same convergence on deterministic validation |

Convergence reading: every 2026 paper pairs a generator with a deterministic verifier. None reaches
into fabricated geometry. The CAD papers score Chamfer distance and IoU against a reference mesh, and
the PCB papers stop at schematic structure. A benchmark scoring "the declared function holds in the
built geometry" was not found; the reference library and the agent evals (D-155) are the base for
one.

### 7.2 Agent surface evidence

| source | exact figure | bearing |
|---|---|---|
| OpenAI function-calling guidance | fewer than 20 functions available at the start of a turn (soft guidance) | 19 MCP tools (D-107) |
| Anthropic, advanced tool use (anthropic.com/engineering/advanced-tool-use) | tool search cut context consumed by tool definitions from about 77K to 8.7K tokens and raised Opus 4 accuracy from 49 to 74 percent; input examples raised complex-parameter accuracy from 72 to 90 percent (vendor) | input examples from references (D-112) |
| RAG-MCP | arXiv 2505.03275: selection accuracy 13.62 to 43.13 percent across large tool sets (measured by the authors) | narrow, fixed tool list |
| Claude API tool definitions | names match `^[a-zA-Z0-9_-]{1,128}$` (vendor docs) | underscore names, no dots (C-12) |

Carries: D-021, D-064, D-067, D-107, D-112, D-133, D-155, C-12, C-14.

## 8. Do not cite until

Each item below stays out of the plan, docs, posts and talks until a primary source is cited in the
row's "needed to cite" column and verified-claims.md gains a confirmed row (C-15, D-022).

| claim as it appeared | status | needed to cite | appeared in |
|---|---|---|---|
| MakerWorld PMM runs OpenSCAD 2021.01 | unverified, likely wrong (two notes cite a 2026.01.14 snapshot from forum posts) | a Bambu Lab or MakerWorld page naming the version | plan-deltas R72, parametric-ux-prior-art.md |
| PMM supports BOSL2 and `mw_plate_N()` | unverified | official PMM documentation or a tested upload | 3dp-landscape.md section 5 |
| KiCad 2025 fund drive 71,366 USD toward 128k | no primary source | KiCad's own announcement with the figures | prior-art-and-position.md 2.12 |
| Printables 20 percent store fee | no primary source | Prusa's terms page | prior-art-and-position.md 2.12 |
| Fusion local and Data MCP launched July 2026 | date unverified | Autodesk announcement with date | prior-art-and-position.md 2.10 |
| NEXTRA, TARGET 3001 V18, Nano Dimension FLIGHT and its SOLIDWORKS add-in, Zuken hold nets with solids | unverified (pages 404 or unchecked) | each vendor's product page | v3 claim rewrite, plan-deltas R9 |
| OSHWA certification is free | cost unverified; requirements cover only what the creator controls | certification.oshwa.org fee statement | LICENSING.md, plan-deltas R74 |
| ISO/IEC 25422:2025 is 3MF Core 1.3 | standard exists, Core version unconfirmed (iso.org 403) | the ISO record naming the Core version | plan-deltas R73 |
| Electrifi 0.006 ohm cm | no primary page; cite vendor grades 0.01 and 0.1 ohm cm instead | a current Multi3D page stating 0.006 | hci-fabrication-prior-art.md 3.2 |
| PETG HF elongation 8.6 XY, 5.1 Z | reseller page only | Bambu's own TDS | 3dp-landscape.md:504 |
| Repomix 882,310 bytes for tscircuit | not reproduced | a rerun with the command recorded | code-cad-and-eda-tooling.md |
| Zoo engine streamed over WebRTC | not rechecked on 2026-10-04 | current Zoo docs | code-cad-and-eda-tooling.md 4.1 |
| pcbGPT pass@1 0.90 overall, 0.72 hard | read at abstract level through pith.science | the paper's results table | hci-fabrication-prior-art.md section 6 |
| Calì et al. 2012, Megaro et al. 2017, Polymorphic Blocks (UIST 2020) figures | cited from memory | the papers read | hci-fabrication-prior-art.md sections 5 and 6 |
| "Print-n-Strip", a named "Infill sensors" paper, a named "RFID printing" paper | not found | a link from the owner | research brief |

Carries: D-022, C-15.

## 9. Open questions

| question | why it matters | who answers | default meanwhile |
|---|---|---|---|
| Does Nano Dimension FLIGHT extract connectivity from conductive regions? | the one commercial tool that could undercut the derivation direction; the sources found do not say | research, with a primary source | wording stays "none found in the surveyed literature"; FLIGHT is not cited (section 8) |
| Will the Orca Design tab ship in a stable release, and with multi-material assignment? | multi-material assignment in a slicer CAD would overlap the inlay and slot story | watch OrcaSlicer releases and PR 16019 | treat as nightly only; multi-material unverified |
| Which paper is "Print-n-Strip"? | named in the research brief, not found on arXiv or the web | owner (link) | not cited |
| Which paper is the "Infill sensors" work? | closest found is M3D-skin (arXiv 2510.12419, 2025), a multi-material FDM tactile sensor with hierarchical infill | owner (link) | M3D-skin cited only as itself, if at all |
| Which paper is the "RFID printing" work? | closest found is Electrifi UHF RFID tag antennas (iris.unisalento.it/handle/11587/441711), FFF tags read to 3 m against 7 m for aerosol jet | owner (link) | RF stays out of scope |
| When does the shop's Yousu coupon get measured? | every demonstration number is inferred until then | owner (D-082) | publish with tier stated or wait |
| Does Altium's 3D DRC leave open beta, and does it extract nets from geometry? | changes the nets-on-solids row | research | cite as nets on a single-part substrate with DRC in open beta |

## 10. Sources

Synthesis and verification:

| file | use |
|---|---|
| `fab-knowledge:synthesis/verified-claims.md` | C1, C3, C5, C8, C9, C10, C11, C12, C13, C14; overrides everything below |
| `fab-knowledge:synthesis/prior-art-and-position.md` | sections 1 to 3 and 5; base of sections 1, 2, 5, 6 here |
| `fab-knowledge:synthesis/plan-deltas.md` | R9 to R12, R16, R72 to R74 |
| `fab-knowledge:plan/_architect.md` | D-020 to D-023, D-076 to D-082, ledger C-01 to C-17 |

Research notes:

| file | covers |
|---|---|
| `fab-knowledge:research/hci-fabrication-prior-art.md` | printed circuits, routing, HPI line, mechanisms, 2026 benchmarks, OpenUHD, Protoboard |
| `fab-knowledge:research/code-cad-and-eda-tooling.md` | Zoo, Onshape, brepjs-cad, tscircuit, Circuit JSON, KiCad |
| `fab-knowledge:research/3dp-landscape.md` | slicers, Orca Design tab, MakerWorld PMM, filament data |
| `fab-knowledge:research/maker-culture-and-market.md` | platforms, LightBurn pricing, MakerWorld numbers |
| `fab-knowledge:research/ai-tooling-and-api-design.md` | tool-count evidence, MCP 2026-07-28 |
| `fab-knowledge:research/parametric-ux-prior-art.md` | Cuttle, LightBurn, PMM UI |

Paper text extracted locally:
`fab-knowledge:evidence/x/web-hci-fab-research/`
(`capricate.txt`, `wasserfall.pdf.txt`, `tcb.pdf.txt`, `springfit.txt`, `kerf.txt`).

Related plan documents: PLAN.md sections 2 and 19 (summary), PROFILE.md (resistivity and per-MCU
rows), CANONS.md (`arch.apply` and Tactlets), CHECKS.md (capacitive plate and CHK-NET-05),
LICENSING.md (OSHWA), RISKS.md (R-16 novelty challenged, R-21 pip.ino wait, R-23 claim page before a
measured coupon), milestones/M05-circuit-copper.md (Capricate reproduction and BLOCKS acceptance).
