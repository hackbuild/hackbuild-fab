# KERF (Eurorack module designer): how it is made

Record written 2026-10-05 from the original code. Slug `kerf-eurorack`. Family sheet-machines. The owner named this tool KERF; the name is used by three different tools (this designer, a kart racer and an SDR receiver, `docs/plan/GLOSSARY.md` line 558), so the folder carries the qualifier. It is the tool that wrote the five Eurorack panel DXFs and `schmitt_lfo-traces.dxf` that the Downloads sweep listed with "the tool that wrote the panels and traces was not found" (`fab-knowledge:sources/downloads/dl-sweep-unmatched.md` section 3.8): all six regenerate byte for byte from this file (computed, section 1.2).

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "computed" was produced on 2026-10-05 by loading the page's module data and writers (`F/kerf-eurorack.html` lines 842 to 1448, 1864 to 2452) in node v22.18.0. A number marked "measured" comes from the headless drive of the shipped page the same day (1280 x 860, 0 errors). "Inferred" means a reading of the code with no run behind it.

Short paths: `F` is `fab-knowledge:originals/kerf-eurorack/files/`. `H` is `F/kerf-eurorack.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | KERF, Eurorack module designer (panel, vinyl copper traces, components) |
| canonical file | `F/kerf-eurorack.html` (copied from `~/Downloads/kerf (2).html`) |
| sha256 | ede53b3a115717dada829a85570591b3cfe69f2598cace4d8f879f6a36d01f15 |
| bytes | 99047 |
| date | 2026-05-05 14:00 (`kerf (3).html`, 14:01, same bytes) |
| runtime | three.js 0.160 from cdnjs, OrbitControls from unpkg, fonts from the network; exposes `window.KERF = {MODULES, loadModule, generatePanelSVG, generateTraceSVG}` (`H:2778`) |
| process | laser cut 2 mm acrylic panel and 2 mm substrate; vinyl cutter for self-adhesive copper tape traces |
| owner exports | `F/exports/{buffered_mult,dual_attenuator,noise,passive_mult,schmitt_lfo}-panel.dxf` (2026-05-05 21:36), `F/exports/schmitt_lfo-traces.dxf` (2026-05-05 14:00) |

### 1.1 Every revision found

| file | date | bytes | sha256 | role |
|---|---|---|---|---|
| `kerf.html` | 2026-05-05 12:49 | 71743 | 80bcd470f74814d578cbc7b2bfc97219d5d2ab540a7ebfcad20cfceda71e1919 | first designer; no DXF writer (0 matches for `panel.dxf`) |
| `kerf (1).html` | 12:52 | 72385 | 2c7c6dcce629524df521c01d393914142495e344291c96390fbc3b89bbfa7666 | same, small CSS change |
| `kerf (2).html`, `(3)` | 14:00, 14:01 | 99047 | ede53b3a... | adds DXF writers, the routing DRC row and the files modal; canonical |
| `kerf (4)` to `(12)` | 06-11 to 08-05 | | | other tools that reuse the name (kart racer, SDR receiver), not this design |

### 1.2 Why this revision

It is the newest of the designer, and it is the one that made the owner's files: the five panel DXFs and `schmitt_lfo-traces.dxf` in Downloads are byte identical to `generatePanelDXF` and `generateTraceDXF` of this file for the matching modules (computed, 6 of 6 IDENTICAL). It is also the first revision with the routing check, which matters because that check fails on three of the five built-in modules (section 6).

Hashes: `fab-knowledge:originals/kerf-eurorack/SHA256SUMS`.

---

## 2. What it makes and for whom

Five buildable Eurorack modules for a maker with a laser and a vinyl cutter and no PCB fab: a 2 mm front panel with component holes and engraved labels, a 2 mm substrate behind it (front faces 18 mm apart, a clear gap of 16 mm, section 4), and copper tape traces cut on a vinyl cutter and stuck to the substrate's front face. Components mount on the panel; their pins land on the substrate pads. Each module ships a panel SVG (red hairline cut, black engrave), a panel DXF, a trace SVG (filled shapes per net role), a trace DXF and a BOM.

| module | HP | width (computed) | power | built from | MODULES lines |
|---|---|---|---|---|---|
| Passive Mult | 2 | 10.16 | 0 | six PJ-398SM jacks on two buses | `H:933 to 971` |
| Dual Attenuator | 4 | 20.32 | 0 | two 100k pots as dividers, four jacks | `H:983 to 1047` |
| Buffered Mult | 6 | 30.48 | 8 mA | TL072 unity buffer, three outs, LED | `H:1062 to 1174` |
| Schmitt LFO | 4 | 20.32 | 4 mA | 40106 RC oscillator, square and triangle out, LED | `H:1185 to 1301` |
| Noise | 6 | 30.48 | 5 mA | reverse-biased 2N3904 into a TL072 gain stage | `H:1314 to 1447` (the header comment says 4HP; the data says 6) |

---

## 3. Shots

From the headless drive (puppeteer-core through `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, ready on `window.KERF` and the DRC row filled, 2026-10-05). Copies in `fab-knowledge:originals/kerf-eurorack/shots/`.

| file | caption |
|---|---|
| `m01-buffered-mult-iso.png` | Boot module Buffered Mult in 3/4 view: a dark anodized panel with jacks, nuts, labels and the KERF mark, the substrate behind it; right rail with width 6 HP, 9 components, trace length 643 mm, 8 mA, and the DRC row "3 CROSSINGS (REWORK), 2 JUMPERS DECLARED". |
| `m02-buffered-mult-exploded-side.png` | Exploded, side view: panel, jack bodies and LED leads, chip and discretes, substrate with traces, separated along z. |
| `m03-schmitt-lfo-substrate-traces.png` | Schmitt LFO, panel and components hidden, front view of the substrate: power (red), signal (tan) and ground (teal) traces with pads; the teal ground net renders as a wide wedge where its polyline doubles back, and the DRC reads 17 crossings. |
| `m04-schmitt-lfo-files-modal.png` | VIEW ALL FILES: panel SVG with labels RATE, SQR, TRI; trace SVG; panel DXF (R12 text); trace DXF; BOM. |
| `m05-dual-attenuator-front.png` | Dual Attenuator, 3/4: two knobs with orange indicator lines, four jacks, DRC "PASS, 0 CROSSINGS". |

---

## 4. Construction: panel

`buildModule` (`H:1872 to 1982`) and `generatePanelSVG` / `generatePanelDXF` (`H:2200 to 2248`, `H:2384 to 2416`):
1. Rectangle HP x 5.08 by 128.5, origin at the panel centre for modelling, at the bottom-left (DXF) or top-left (SVG) for export.
2. Component holes by type (`panelHoleRadius`, `H:1984 to 1992`): pot r 3.6, jack r 3.2, LED r 2.6, switch r 2.4, other r 2.
3. Mounting holes r 1.6 at 3 mm from the top and bottom: at 3.5 mm from each side for 4 HP and wider (four holes), on the centre line for narrower (two holes).
4. SVG engrave group: labels at the type's label offset (pot 9.5, jack 6, LED 5, switch 6). The cut file and the 3D disagree on which side: the 3D puts the label sprite at `c.y + offset`, above the hole (`H:1929`), while `generatePanelSVG` maps `c.y - off`, below the hole (`H:2233`). Shots `m04` (RATE under the pot) and `m05` (IN above the jack in 3D, below it in the rail preview) show both (measured). The engraved panel therefore reads differently from the model on the screen; a port should pick one side and use it in both places. The module title sits 6 mm above the bottom, the KERF mark 5 mm below the top, and two hairlines run at 9 mm from the top and bottom. The DXF carries no text ("DXF doesn't render text reliably across CAM software").
5. 3D: the panel is an ExtrudeGeometry of the same holes, 2 mm, bevel 0.15.

| constant | value | where |
|---|---|---|
| HP, PANEL_HEIGHT | 5.08, 128.5 | `H:842 to 843` |
| PANEL_THICKNESS, SUBSTRATE_THICKNESS | 2, 2 | `H:844, 846` |
| SUBSTRATE_OFFSET | 18; the comment says "panel back to substrate front", but the model measures it from the panel front. The panel spans z -2 to 0 (`panel.position.z = -thickness`, `H:1921`) and the substrate front sits at z -18 (`H:1975`), so the clear gap between the panel back and the substrate front is 16 mm (computed) | `H:845` |
| TRACE_THICKNESS | 0.06 | `H:847` |

Panel DXF: R12 (`$ACADVER AC1009`), `$INSUNITS 4`, `$MEASUREMENT 1`, layers `0_CUT` (red) and `0_ENGRAVE` (white, empty), outline as four LINE entities, holes as CIRCLE.

---

## 5. Construction: vinyl copper traces

What it does. Turns each net's polyline into a filled ribbon of the net's width, groups ribbons by role, and writes pads under every component pin, so a vinyl cutter can cut copper tape that is then laid on the substrate.

Construction:
1. Pin positions (`PINOUT`, `H:875 to 892`, `dipPins`, `H:895 to 909`), offsets from the component centre on the substrate plane:

| part | pins (mm) | note |
|---|---|---|
| Alpha RV09 pot | CCW (-5, -7), W (0, -7), CW (5, -7) | 5 mm pitch, row 7 mm behind the bushing |
| PJ-398SM jack | T (-2.5, -4.5), S (2.5, -4.5) | switch pin omitted |
| 5 mm LED | A (-1.27, 0), K (1.27, 0) | |
| SPDT toggle | 0, +-4.7625 | 3/16 inch pitch |
| axial resistor | +-3.81 | 7.62 lead spacing |
| film cap | +-2.54 | 5.08 |
| TO-92 | E, B, C at -1.27, 0, 1.27 | |
| DIP | rows at +-3.81, pitch 2.54, pin 1 top left, counter-clockwise | |

2. A net is a list of points, each either a `[componentId, pinId]` reference or a literal `[x, y]` (`resolvePoint`, `H:2020 to 2040`).
3. `ribbonPolygon(line, width)` (`H:2048 to 2086`): at each vertex take the bisector of the incoming and outgoing directions, offset both sides by width/2 times a miter factor `min(2.5, 1/max(0.4, sqrt((1+dot)/2)))`; the left side forward plus the right side reversed is the polygon.
4. Pads: CircleGeometry r 1.2 at every pin (`buildTraces`, `H:2088 to 2148`; SVG `H:2286 to 2293`; DXF layer PADS).
5. Jumpers are insulated wires on the component side, drawn as raised grey tubes; declared per module, not routed.
6. Trace SVG: groups `signal`, `power`, `neg`, `ground` filled in their colours (`TRACE_COLORS`, `H:865 to 870`), dashed outline reference. Trace DXF: R12, layers TRACE_SIGNAL, TRACE_POWER, TRACE_NEG, TRACE_GROUND, PADS, OUTLINE; every ribbon edge as a LINE, pads as CIRCLE r 1.2.

Routing rules (`ROUTING_RULES`, `H:857 to 863`): minimum trace width 1.5 ("anything thinner risks lifting off backing"), minimum clearance 1.0, preferred angles in 45 degree steps, pad diameter 2.5. These are declared design values for vinyl-cut copper tape and have no coupon behind them; PROFILE.md line 880 lists them as candidate copper rule rows.

---

## 6. Check: single-sided routing DRC

`validateRouting(mod)` (`H:2325 to 2344`): every pair of segments from different nets is tested for a proper crossing (`segIntersect`, `H:2309 to 2323`, parameters strictly inside 0.001 to 0.999, shared endpoints within 0.01 ignored). The DRC row reads pass with 0 crossings, pass with n planned jumpers, warn with 1 or 2 crossings, fail with more (`H:2491 to 2507`).

Results on the five built-in modules (computed, and the same on the stage, measured):

| module | nets | pins | trace length | crossings | jumpers | DRC |
|---|---|---|---|---|---|---|
| Passive Mult | 2 | 12 | 200.0 | 0 | 0 | pass |
| Dual Attenuator | 7 | 14 | 268.5 | 0 | 0 | pass |
| Buffered Mult | 11 | 24 | 642.7 | 3 | 2 | fail (3 crossings, signal against ground) |
| Schmitt LFO | 15 | 31 | 773.5 | 17 | 4 | fail |
| Noise | 21 | 32 | 629.5 | 17 | 2 | fail |

Failure lessons:
- Three of five modules that the header comment calls "All real, buildable designs" fail the tool's own single-sided rule, and the owner exported the Schmitt LFO traces (17 crossings) anyway. A crossing in copper tape is a short. The routes were hand-written as coordinates in the module data with no router behind them.
- The DRC tests centre lines only. It does not test the 1.0 mm clearance between ribbon edges, does not enforce the 1.5 mm minimum width (Buffered Mult routes five signal nets at 1.0 and 1.2 mm; Schmitt LFO and Noise route nine signal nets each at 1.0 mm, computed), does not check 45 degree angles, and writes pads at 2.4 mm against the declared 2.5 (inferred from the code).
- The DRC has three blind spots, and all three hide shorts in the shipped data (computed with the page's own `netPolyline`). (1) `segIntersect` returns null when two segments are parallel (`H:2316`), so collinear overlap between nets is never seen. The Schmitt LFO inverter output net (`u1` pin 2 to the rate pot CW, `H:1222 to 1224`) runs along x = -9 on top of the +12V rail for 81.73 mm; the +12V net also overlaps a ground net for 3.69 mm along y = -55, and a signal net overlaps the LED ground for 1.19 mm along y = 30. Noise overlaps +12V with -12V for 2.46 mm and +12V with signal for 5.54 mm; Buffered Mult overlaps a signal net with -12V for 2.46 mm. (2) Segments that share an endpoint are skipped (`H:2312`), so two nets of different roles that end on the same pin are a dead short the check cannot see: Buffered Mult +12V and ground both end on `c1` pin 2; Noise +12V and a signal net both end on `r1` pin 2, and -12V and ground both end on `u1` pin 4. (3) Declared jumpers never subtract from the crossing count; the row compares nothing between the two (`H:2492 to 2507`), so a module with every crossing jumpered still reads "rework". `schmitt_lfo-traces.dxf`, the file the owner exported, carries the 81.73 mm signal on +12V overlap.
- Pads overlap their neighbours. Pads are r 1.2 at every pin, including pins on no net. TO-92 pins sit 1.27 apart (`H:891`), so every transistor's E, B and C pads merge into one copper blob (Noise `q1`); DIP pins at 2.54 leave 0.14 mm of copper gap against the declared 1.0 clearance; Buffered Mult puts LED anode and `r1` pin 2 pads 0.92 mm apart, and Noise puts LED cathode and `r4` pin 2 pads 0.46 mm apart (computed). Several discretes share a centre with a panel part (Schmitt LFO `r1` and the LED both at (0, 30)).
- `powerPads` is declared on the three powered modules (`H:1157`, `H:1283`, `H:1424`) but no writer reads it, and the pin catalogue has no power header. The power nets start at bare coordinates such as (-9, 60), so the cut traces carry no landing for the 16-pin header the BOM lists. The BOM also lists copper tape as "1m x 3mm" strip (`H:1043`, `H:1170`, `H:1298`, `H:1444`); the trace file is a filled layout up to 30.48 x 128.5 mm, which needs sheet copper foil on a carrier, not a 3 mm tape (inferred).
- Nets that double back on themselves (the Schmitt LFO ground net through `[9, 60], [9, -34.5], [9, -7], sqOut S, [9, -14.5], ...`, the Noise net `['u1','3'], [1.19, 26.19], ['u1','3']`) produce self-overlapping ribbon polygons; shot `m03` shows the wedge (measured).

---

## 7. 3D component builders

`buildPot`, `buildJack`, `buildLED`, `buildSwitch`, `buildChip`, `buildResistor`, `buildCap`, `buildTransistor`, `buildLeads` (`H:1566 to 1820`): each part is a small group of cylinders and boxes in its own frame (z toward the viewer), positioned at the panel hole or on the substrate, with leads running back to the substrate. Labels are canvas textures (`makeTextSprite`, `H:1825 to 1849`). Lighting is a workshop rig: hemisphere, ambient, warm key, cool fill, amber rim, a frontal wash and an under-light, ACES tone mapping at exposure 1.45 (`H:1473 to 1501`). Exploded view moves the panel +30 and the substrate and traces -20 on z (`applyLayers`, `H:2174 to 2188`).

Part models, for a port that wants the same look (`H:1566 to 1820`): RV09 pot body r 4.5 x 9 behind the panel, threaded bushing r 3.5, hex nut r 4.2, D shaft r 1.5, knob r 7 to 6.5 x 9 with a ring and an orange indicator bar; PJ-398SM hex nut r 4.5, collar r 3.2, washer, 8 x 8 x 11 body; LED a clear r 2.5 barrel with a dome and an emissive core; toggle with nut, bushing, 6 x 8 x 8 body and a ball-tipped lever; DIP body 7.62 wide, (pins/2) x 2.54 + 2 long, with a pin-1 notch. Leads are r 0.25 rods from z 0 back by a per-part depth: pot and LED 18, toggle 16, jack 14 (`H:1612`, `H:1643`, `H:1674`, `H:1703`). The jack and toggle leads stop 4 and 2 mm short of the substrate front at z -18, so in the model their pins never reach the pads they are meant to land on (computed). A builder needs pin extenders or a shorter stack for those parts.

Jumpers (`buildTraces`, `H:2124 to 2147`): each declared jumper is a CatmullRom tube r 0.35 from pin to pin, arching min(2.5, 0.6 + 0.04 d) above the trace plane, in `#9aa4b4`. They exist only in 3D; neither trace writer emits them, so the jumper list reaches the builder only through the stage.

---

## 8. UX anatomy

| part | what is there |
|---|---|
| shell | dark, amber accent, serif title "KERF" with "eurorack module designer"; header meta 3U 128.5MM, 1HP 5.08MM |
| left rail | MODULES list (name, HP, mA or PASSIVE), DISPLAY toggles (front panel, components, substrate, copper traces, exploded view), LEGEND (signal, +12V, -12V, gnd) |
| stage | three.js, view toolbar 3/4, FRONT, BACK, SIDE; corners with module name, view, scale, camera coordinates |
| right rail | module title, subtitle, description; stats (width, components, trace length, power draw); DRC row; VIEW ALL FILES; PANEL (preview, copy, DXF, SVG); TRACES (preview, copy, DXF, SVG); BILL OF MATERIALS with download |
| files modal | five cards with live previews or DXF text, copy and download each |
| view presets (`setView`, `H:2617 to 2647`) | target (0, 0, -9); 3/4 at (85, 40, 210), FRONT (0, 0, 230), BACK (0, 0, -230), SIDE (260, 0, -9) with fov 50; orbit distance clamped 80 to 400 (`H:1470 to 1471`) |
| readouts | corner camera coordinates and a SCALE of 180 / camera distance, updated every frame (`H:2757 to 2767`); toasts for every copy and download, 1.8 s |
| file names | the module id with `-` turned to `_` (`buffered_mult-panel.dxf`), which is how the owner's Downloads files are named |
| keys | Escape closes the files modal (`H:2705`) |
| missing | editing (modules are fixed data), steps, a hook beyond `window.KERF`, a clearance check, a router |

What makes it worth keeping: the panel, substrate and copper trace stack is a complete no-PCB construction for a module, with real part pin geometry, and the trace export split by net role predates every other vinyl copper bench in the corpus.

---

## 9. Tests and harness

None ship. This record regenerated the owner's six DXFs from the page code (6 identical, computed) and ran `validateRouting` on all modules (section 6). Regenerated SVGs for reference: `F/exports/regenerated/schmitt_lfo-panel.svg`, `schmitt_lfo-traces.svg`, `dual_attenuator-traces.svg` (computed).

---

## 10. Port map

| item | value |
|---|---|
| packages | `copper` or the board package for vinyl traces (ribbon polygons, pads, net roles), `sheet` (panel), `checks` (crossing, clearance, width, angle), `catalog` (RV09, PJ-398SM, LED, TO-92, DIP pin geometry) |
| feature kinds | panel `bore` holes, trace ribbons, pads |
| canon ids | MISSING (no canon for a panel plus vinyl-copper substrate stack) |
| reference ids | MISSING |
| milestone | MISSING; PROFILE.md line 880 records the routing rules as candidate copper rows |
| lineage row | MISSING |
| fixes to carry | test collinear overlap and shared endpoints between different nets (the shipped Schmitt LFO puts an output on +12V); pads sized to pitch (TO-92 and DIP fail today); write `powerPads` and a header footprint; jumpers written to a file and subtracted from crossings; one label side in 3D and SVG; a stack gap that the jack and toggle pins reach; a real clearance DRC on ribbon edges; width and pad rules enforced; refuse export with crossings unless each is a declared jumper; route instead of hand coordinates; the Noise header says 4HP, data says 6 |
