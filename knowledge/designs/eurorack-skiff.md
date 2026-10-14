# EURORACK SKIFF: how it is made

Record written 2026-10-05 from the original code. Slug `eurorack-skiff`. Family sheet-machines. A parametric laser-cut 3U Eurorack case (skiff): six flat parts, through-tenon joinery, optional wedge tilt, one DXF and one SVG of all parts laid out in a column.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "computed" was produced on 2026-10-05 by loading the page's own geometry functions (`F/eurorack-skiff-r7.html` lines 631 to 1227) in node v22.18.0 and calling them. A number marked "measured" comes from the headless drive of the shipped page the same day (Chrome, swiftshader, 1280 x 860, 0 errors). "Inferred" means a reading of the code with no run behind it.

Short paths: `F` is `fab-knowledge:originals/eurorack-skiff/files/`. `H` is `F/eurorack-skiff-r7.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | EURORACK SKIFF, parametric laser-cut case designer |
| owner's slug | eurorack-skiff (no registry row; the Downloads sweep calls it "Eurorack skiff designer", `fab-knowledge:sources/downloads/dl-sweep-unmatched.md` section 3.8) |
| canonical file | `F/eurorack-skiff-r7.html` (copied from `~/Downloads/eurorack-skiff (7).html`) |
| sha256 | ae30bd558c13e57990013cb3d34aa8bcc03d05df5aee928390b576fe63970dde |
| bytes | 64364 |
| date | 2026-05-05 14:03 |
| runtime | three.js 0.160 and OrbitControls from unpkg via an import map; needs network |
| process | laser, 2 to 6 mm sheet (ply, MDF or acrylic per the page text) |
| companion | `F/eurorack-skiff-r6-kick.html` (revision 6, the wedge with a kick; section 5) |
| owner exports | `F/exports/eurorack-skiff-84hp-d79-t5.dxf` (2026-05-05 21:36), `F/exports/eurorack-skiff-104hp-d77-t5.dxf` (2026-05-04 20:39) |

### 1.1 Every revision found

| file | date | bytes | sha256 | what changed |
|---|---|---|---|---|
| `eurorack-skiff.html`, `(1)` | 2026-05-04 19:46, 19:58 | 56523 | d36146a53b809d45584ec90ecbb13f5783c08bd52b7ce0077747cba9ced6e2cb | first build, flat case only |
| `(2)` | 05-04 20:18 | 55974 | 5135434a3c39ddb07820b1e2b0e0707c976ddfff4632da84e032a9d6d0af7817 | |
| `(3)` | 05-04 20:58 | 58925 | 5036d9343509aa47124224ba2a04c9acadb05002a8b768b5fd9bdaabf26ae9df | tilt slider and tilted rail slots |
| `(4)` | 05-04 21:54 | 63347 | e64d01a363c02ae557f098f41c3c1ab8ee78c65a86abe70c19ced24f05f9105c | side styles (vented, grip, webbed) and a wedge kick |
| `(5)` | 05-05 12:12 | 63991 | 10c7d21006be173f3fab07a8d6c1042eabb065642785977174921b06c68be2bc | `rise` so the tilted lower rail sits on the bottom plate; kick sized so the wall in front of the rail stays t thick |
| `(6)` | 05-05 13:12 | 64724 | 199d42c40c8885a1f62f1a6a21887ccc9dff25041b2b406d3602a1cfc0795aa7 | kick of exactly t, bottom plate recessed to the module corner |
| `(7)` | 05-05 14:03 | 64364 | ae30bd558c13e57990013cb3d34aa8bcc03d05df5aee928390b576fe63970dde | clean wedge, no kick; canonical |

### 1.2 Why this revision

Revision 7 is the newest and it is the revision the owner exported with. The owner's `eurorack-skiff-84hp-d79-t5.dxf` (2026-05-05 21:36, seven hours after r7) is reproduced byte for byte by r7's `partsToDXF` with hp 84, depth 79, thickness 5, rail height 10, tilt 7, grip sides, 6 bottom tabs, kerf 0.10 (computed, by searching the parameter space; tab length 8 to 24 all give the same bytes because the tab length is clamped, section 4). The bottom plate front recess in that file is 0.614 mm = 5 tan 7 deg, which is r7's clean wedge rule and not r6's (computed). The earlier `104hp-d77-t5` export (2026-05-04 20:39) reproduces from r1, r2, r3 and r7 alike at tilt 0, rail height 15, 6 tabs (computed), so the flat case geometry did not change across revisions.

The trade r7 made: the clean wedge thins the cheek in front of the rail to 2.34, 1.92, 1.44 and 0.91 mm at 10, 15, 20 and 25 deg in 3 mm stock (declared `H:732 to 734`; 1.92 and 0.915 recomputed). r6 keeps t(cos θ - sin² θ), 2.86 to 2.18 mm, with a vertical kick. A builder who wants tilt over 15 deg in 3 mm stock should take the r6 cheek (`F/eurorack-skiff-r6-kick.html`, `dims()` around line 728).

Hashes: `fab-knowledge:originals/eurorack-skiff/SHA256SUMS`.

---

## 2. What it makes and for whom

A six-piece flat-pack case for Eurorack modules: bottom plate, two cheeks, lower rail, upper rail, back-top strut. Rails are drilled with an M3 clearance hole every HP so any module screws straight into the rail face (or into inserts or nuts behind it). The specs tab says the design honours the Doepfer A-100 standard: 1 HP 5.08 mm, 3U panel 128.5 mm, mounting holes 3 mm from the top and bottom edge, 122.5 mm apart (`H:596 to 597`). It is structural only; a bus board and power supply are the builder's (`H:605 to 606`).

---

## 3. Shots

From the headless drive (puppeteer-core through `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, 2026-10-05; the page has no hook, so the drive sets sliders and dispatches input events, and dollies the camera out with five wheel events). Copies in `fab-knowledge:originals/eurorack-skiff/shots/`.

| file | caption |
|---|---|
| `e01-default-84hp-flat.png` | Defaults: 84 HP, depth 60, 3 mm, rail 12, tilt 0. Dark stage, sample modules in muted colours with knobs, M3 screw heads on the rails, legend; info bar PARTS 6, SHEET 443 x 412 MM, CASE 433 x 60 x 141 MM. |
| `e02-owner-export-84hp-d79-t5-tilt7-grip.png` | The owner's export settings: tilt 7, 5 mm, rail 10, depth 79, grip cheeks, 6 tabs. CASE 437 x 79 x 150 MM; the grip capsule slots show on the right cheek. |
| `e03-tilt20-webbed-exploded.png` | Tilt 20, webbed cheeks, exploded 35 mm: the rails and modules tilt about the lower rail's outer bottom edge; the back strut stays level. |
| `e04-cut-layout.png` | CUT LAYOUT at tilt 20: bottom plate with six side tabs, two wedge cheeks with tilted rail slots, open notches for the bottom tabs and the triangular truss cuts, drawn y down on a cream grid. |
| `e05-specifications.png` | SPECIFICATIONS: case outer dimensions, module mounting (lower hole z 11.71, upper 134.21, spacing 122.50), material, joinery cards and the design notes. |

---

## 4. Construction: rails, holes and the 122.5 mm hole spacing

What it does. Places the lower and upper rails so that a 3U panel's mounting holes land on the rail centre lines exactly 122.5 mm apart, whatever the rail height, thickness and tilt.

Construction (`dims(p)`, `H:659 to 771`), z up from the desk, u back from the case front:
1. `rise = t sin θ` when tilted, else 0, so the tilted lower rail's back corner sits on the bottom plate instead of dipping into it.
2. Lower rail bottom `t + rise`, top `t + railHeight + rise`; lower hole on its centre line.
3. Module bottom = lower hole - 3; module top = module bottom + 128.5; upper hole = module top - 3; upper rail centred on the upper hole.
4. Rails are inset t from the cheek front (`railFrontInset = t`) so the cheek slots are closed, not open notches.
5. Tilt anchor = the lower rail's outer front bottom corner (u = t, v = t + rise); every rail and module point rotates clockwise about it (`rot(u, v)`), top moving back.
6. Rail parts (`genRail`, `H:998 to 1048`): length = HP x 5.08 between the cheek inner faces, plus a tenon of length t at each end that passes through the cheek; tenon height railHeight - kerf. Holes: d 3.2, one per HP, first at HP/2 from the inner face, on the rail centre line. The strut is the same part with no holes.

| constant | value | where |
|---|---|---|
| HP | 5.08 | `H:631` |
| MODULE_HEIGHT | 128.5 | `H:632` |
| MODULE_HOLE_OFFSET | 3.0 | `H:633` |
| M3_DIA | 3.2 | `H:634` |
| defaults | hp 84, t 3, depth 60, rail 12, tilt 0, standard, 3 tabs, tab 14, kerf 0.10 | `H:639 to 654` |
| slider ranges | hp 20 to 120, depth 40 to 120, t 2 to 6 step 0.5, rail 8 to 20, tilt 0 to 25, tabs 2 to 6, tab 8 to 24, kerf 0 to 0.4 step 0.02 | `H:437 to 513` |

Results (computed): at defaults the case is 432.72 x 60 x 140.5, holes at z 9.0 and 131.5, spacing 122.5; at the owner's export settings the case is 436.72 x 79 x 149.122, holes 10.609 and 133.109, spacing 122.5, rise 0.609. Spacing stays 122.5 at every tilt because both rails shift and rotate together.

Bottom tabs (`bottomFingerPositions`, `H:776 to 793`): n tabs spread along the cheek depth between a front keep-out of 2t + 2 and a back keep-out of 2t + 2 (strut on); tab length = min(fingerLength, usable/n - 4); equal gaps. At the owner's export the six tabs are 5.167 mm long whatever the slider says (computed), which is why tab length 8 to 24 all reproduce the same DXF. The clamp also bites at the defaults: usable = 60 - 8 - 8 = 44, so three tabs are 44/3 - 4 = 10.667 mm, not the 14 the slider shows (computed). The SPECIFICATIONS card still prints `numFingers x fingerLength` ("3 x 14 mm" at defaults, "6 x 14 mm" in `shots/e05-specifications.png`), the slider value and not the cut value (`H:1631`). With the strut off the back keep-out drops to 2 mm, so the tabs move back and lengthen.

---

## 5. Construction: wedge cheek with tilt

What it does. Tilts the module face back like a wedge case, keeps the rails inside the cheek, and grows the depth when the tilted upper rail needs it.

Construction (`dims`, `H:718 to 757`; `genCheek`, `H:856 to 996`):
1. Untilted: cheek back height = max(zModuleTop + zModuleBottom, upper rail top + 2) (`H:725`). At defaults that is 140.5 = 134.5 + 6, which lands 3 mm above the upper rail top; the sum looks like a slip for `zModuleTop + something` but gives a usable height (inferred).
2. Tilted: back height = max over the upper rail's tilted outer and inner top v + railHeight + 2 (room for the strut); the slanted front runs from (0, 0) at the desk to the shoulder at u = backHeight tan θ (r7 clean wedge, no kick); depth grows to at least shoulder + 2t + strut inset + 5.
3. Bottom plate front recess = t tan θ so its top front corner lies on the slant (r7); r6 used t + (railHeight/2 - 3) sin θ.
4. Outline: open notches along the bottom edge for the bottom plate tabs (width + kerf, depth t + kerf/2), then the back edge, the shoulder and the slant.
5. Cuts: the two rail slots as tilted rectangles (each corner rotated about the anchor), widened by kerf/2 on every side; the strut slot axis-aligned at the back wall top.
6. Decorative cuts in a column at u = D - 4t - 6, between the rails with 8 mm keep-outs: vented (3 to 7 round holes r 2.5), grip (a capsule slot min(50, 0.85 (D - 6t)) x 9, plus a smaller one below if room), webbed (up to three triangles alternating apex up and down).

Wall in front of the rail (r7): distance from the slant through (0, 0) to the tilted rail corner. Computed with r7: 4.279 mm at tilt 7 in 5 mm stock; 1.92 mm at 15 deg and 0.915 mm at 25 deg in 3 mm stock. The code comment (`H:732 to 734`) calls 20 deg the practical limit in 3 mm stock.

3D (`rebuild3DClean`, `H:1373 to 1568`): bottom plate and cheeks are extruded from the same part outlines; rails, modules (sample widths 8, 6, 12, 4, 8, 16, 6, 4, 14, 8, 6, 4 HP) and screws live in a tilt group rotated about the anchor; the strut stays outside the group, level.

---

## 6. Joinery and the kerf slider

Bottom plate tabs (`genBottomPlate`, `H:817 to 854`) are cut narrower by kerf (v1 + k/2 to v2 - k/2); cheek notches are cut wider by kerf (u1 - k/2 to u2 + k/2, depth t + k/2); rail tenons are railHeight - k high; rail slots are t + k by railHeight + k.

Defect in the naming (inferred from the code, `H:806 to 815`, `H:831 to 836`, `H:878 to 883`): the slider says "Kerf Compensation" and the help text says "Tighter slots/looser tabs", but the code shrinks every tab and grows every slot by the slider value. A laser already removes about kerf/2 per side, so a designed tab of w cuts to about w - k and a designed slot to about w + k. With the slider at k the cut fit is therefore looser by about 2k on each tab and slot, about 0.4 mm of play across a tab at the default 0.10 with a 0.10 kerf. The value behaves as a clearance, not a compensation. `applyKerf()` is a no-op left in place. A builder porting this should name it clearance and add a real kerf offset at export.

Fits. Through-tenons pass fully through the cheeks; friction fit with optional glue or wedges (declared, `H:594`).

Strut slot breaks the cheek top (computed, `H:749` and `H:918 to 925`). The strut sits with its top at `zStrutTop = cheekBackHeight`, the same v as the cheek's top edge, and the slot is grown by k/2 on every side. The slot rectangle therefore reaches H + k/2 (140.55 against a cheek top of 140.5 at defaults; 149.172 against 149.122 at the owner's export, computed), so the cut slot and the outline overlap and the strut slot cuts as an open notch at the cheek top, with no bridge of material above the strut. The strut can drop in from above, and nothing holds it down except friction. A port that wants a closed slot should drop the strut by at least t below the cheek top or say in the record that it is a notch.

Back strut and the cut. "Include back-top strut" sits in the DISPLAY group but it changes the cut: with it off the strut part, both strut slots and the 2t back keep-out for the tabs all go away and PARTS reads 5 (`H:1060`, `H:781`, `H:918`, `H:1587`).

---

## 7. Layout and writers

`layoutParts(parts, 5)` (`H:1067 to 1079`): stacks parts in one column with 5 mm padding; sheet width = widest part + 10. At defaults 442.72 x 412; at the owner's export 446.72 x 441.63 (computed). The specs card says "Suitable stock A4 / 200x300" regardless of size (`H:1626`), which a 443 mm wide sheet does not fit.

DXF (`partsToDXF`, `H:1137 to 1206`): R12 header `$ACADVER AC1009`, `$INSUNITS 4`, `$EXTMAX` fixed at 1000 x 1000, a two-layer table (0 and CUT), outlines and cuts as closed LWPOLYLINE (R2000 entity in an R12 file), holes as CIRCLE, all on CUT. The owner's 84 HP file holds 16 LWPOLYLINE and 168 CIRCLE (computed). File name `eurorack-skiff-${hp}hp-d${depth}-t${thickness}` uses the slider depth, not the auto-expanded depth. Tilted cheeks carry a doubled vertex: the wedge branch pushes `[0, kickHeight]` with kickHeight 0 and then the closing `[0, 0]` (`H:894` and `H:898`); `partsToDXF` drops only the last point, so each tilted cheek polyline in the owner's 84 HP file starts and ends on (0, 0), a zero-length closing edge (computed). Most CAM tools ignore it; a strict closed-loop check would not.

On-screen CUT LAYOUT (`renderLayoutSVG`, `H:1084 to 1132`): cream `#f5f1e8` sheet with a 10 mm grid, every path in `#8b1a1a` at 0.3, part names and sizes as grey labels. The legend under it says "PINK = kerf-compensated" (`H:587`), but no path is drawn pink, so the legend promises a marking the view never shows.

SVG (`partsToSVG`, `H:1208 to 1227`): mm width and height, black 0.1 stroke, paths and circles; part coordinates are written y down without a flip, so the SVG is a mirror image of the DXF (inferred; a mirrored cheek is the other cheek, so the parts still cut right). `F/exports/regenerated/eurorack-skiff-84hp-d79-t5.svg` is r7's SVG for the owner's settings (computed).

---

## 8. UX anatomy

| part | what is there |
|---|---|
| shell | dark instrument shell, accent orange `#ff7733`, teal `#5fc9a8`, JetBrains Mono; not the hack.build paper set (`H:9 to 25`) |
| left rail (340 px) | WIDTH (HP slider, presets 42, 60, 84, 104), DEPTH AND MATERIAL (depth, thickness, rail height, tilt, side style), JOINERY (tab count, tab length, kerf), DISPLAY (modules, M3 holes, back strut, grid, exploded), EXPORT (DXF, SVG), RESET |
| tabs | 3D MODEL, CUT LAYOUT, SPECIFICATIONS |
| info bar | PARTS, SHEET, CASE |
| stage | three.js with shadows, OrbitControls, HUD with mouse hints, legend |
| specs | four cards (case, mounting, material, joinery) and the design notes: standards, assembly, bill of materials, power note |
| display toggles | "Show M3 mounting holes" only hides the screw heads in 3D; the cut keeps every hole. "Include back-top strut" changes the cut (section 6). Grid shows an 800 mm GridHelper; Exploded moves parts 35 mm |
| explode (`H:1392`, `H:1409`, `H:1427`, `H:1432`, `H:1459`, `H:1472`) | bottom plate down 35, cheeks out 35 sideways, lower rail down 35 and upper rail up 35 along the tilted face, strut up 17.5 |
| 3D dressing (`H:1484 to 1561`, `H:1260 to 1310`) | modules are 1.5 mm boxes 0.4 mm under size, 0.75 mm in front of the rail face; knobs floor(HP/4) per module, r 2, offset 20 mm up or down by module parity; screw heads r 2.2 x 1.5 at every HP on both hole lines; scene fog 400 to 900, PCF soft shadows 2048 map, warm rim light |
| missing | steps, warnings (no check fires on thin cheeks), hook, print or cut card beyond the specs text |

What makes it excellent: the 122.5 mm rule is built into the geometry rather than checked after; tilt rotates rails, modules and screws about one physical corner, and the bottom plate and cheek follow from that corner; the comments state the trade (wall thickness against look) with numbers at each tilt.

---

## 9. Tests and harness

None ship. The record's checks: r7 regenerates both owner DXFs byte for byte (computed). A port test set: hole spacing 122.5 for every tilt and thickness; wall in front of the rail at least t/2 or warn; owner DXF parity; tab and slot sizes per kerf setting.

---

## 10. Port map

| item | value |
|---|---|
| packages | `sheet` (part generators), `nest` (replace the single column), `checks`, `profile` (kerf and clearance split) |
| feature kinds | `tabslot` (through-tenon rails and strut), `finger` (bottom tabs into open notches), `window` (vents, grip, truss), `bore` (M3 per HP) |
| canon ids | MISSING: no canon for a rail case with the HP pitch and 122.5 mm hole rule; `finger-joint` (CANONS.md line 400) covers the tabs only loosely |
| reference ids | MISSING (nearest: `joints/tab-slot`, scaffold INDEX line 31) |
| milestone | MISSING (no card names it) |
| lineage row | MISSING |
| catalog | Doepfer A-100 mechanical constants (HP 5.08, 3U 128.5, hole inset 3) as declared standard values |
| fixes to carry | name the kerf slider a clearance and add an export kerf offset; close the strut slot or call it a notch; report the clamped tab length; move the strut toggle out of DISPLAY; drop the doubled (0, 0) vertex; draw or remove the pink legend; a thin-wall warning on the cheek; SVG y flip; `$EXTMAX` from the layout; file name from the real depth; a real nest |
