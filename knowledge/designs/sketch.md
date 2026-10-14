# SKETCH: how it is made

Record written 2026-10-05 from the original code. Slug `sketch`. Family sheet-machines. A single-file laser design tool: plates (2D profiles with a thickness), joints that write geometry into both plates, a constrained 2D sketcher, a prism assembly view, a shelf nester, arc-fitted SVG and DXF writers, a store-only zip bundle, a script API and six generators.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "computed" was produced on 2026-10-05 by calling the page's own kernel (`SK`, `SKS`, `SKIO`) inside headless Chrome with puppeteer-core: each generator run with its default parameters, evaluated, nested and written. A number marked "measured" comes from the headless drive of the shipped page the same day (1280 x 860, 0 page errors, 0 console errors). "Inferred" means a reading of the code with no run behind it.

Short paths: `F` is `fab-knowledge:originals/sketch/files/`. `H` is `F/sketch.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SKETCH, lasercut design tool with 3D assembly (renamed from RABBET) |
| owner's slug | sketch (registry: sketch, live, group sheet, kernels shape fab) |
| chat | "Laser cutting design tool with 3D assembly", conversation 31d86a32-2b64-4c2f-b978-367fda911f39 |
| canonical file | `F/sketch.html` (SKETCH v3) |
| sha256 | 39b5ebce5ce14ac50233f16f3875e5bbcf32136c8ba47fb1e28558243b8a98d5 |
| bytes | 247124 |
| date | 2026-09-14 16:05 (mtime of `~/Downloads/sketch (1).html`; `(2)` 09-15 00:20 and `(3)` 09-15 00:37 are the same bytes; the handoff copy `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/sketch/legacy/sketch.html` is the same bytes) |
| runtime | no libraries; Google Fonts only; opens from `file://` |
| scripts | kernel `SK` (`H:354 to 1001`), sketch kernel `SKS` (`H:1002 to 1998`), renderers `SKR` (`H:1999 to 2522`), script API, generators and writers `SKIO` (`H:2523 to 3141`), app `A` (`H:3142 to 5195`) |
| plans | `F/sketch-plan.md` (sha256 3a2f1631a04b6d7771d994c5c5ad243428dd65a3216f8e68daf11f3daff4ad75, 2026-09-12 13:36, same bytes in Downloads and the bench) and `F/rabbet-plan.md` (b3d46243c4b19e16a1105f272710901eabe4cf4a1aa034ad5f2764a0a56429e3); they differ in naming only |

### 1.1 Every revision found

| file | date | bytes | sha256 | role |
|---|---|---|---|---|
| `~/Downloads/sketch.html` | 2026-09-12 16:52 | 158131 | 1a135564894f96ec1828d248dd53695affa434f8685c79ed7711858ad301af0a | earlier build, four scripts (no constrained sketch kernel `SKS`), 3192 lines |
| `~/Downloads/sketch (1).html` to `(3)` | 2026-09-14 16:05 to 09-15 00:37 | 247124 | 39b5ebce... | v3, five scripts, 5197 lines; canonical |
| handoff `designs/sketch/legacy/sketch.html` | copied 2026-09-15 15:11 | 247124 | 39b5ebce... | same bytes |
| `fab-work-directory:benches/sketch/outputs/` | | | | plan documents only |

### 1.2 Why this revision

Newest, and the only one with the constrained 2D sketcher (Gauss-Newton solver, regions, trim, fillet, inference). The drive on 2026-10-05 booted it with 0 errors, ran all six generators, nested and wrote SVG, DXF and script; the BOX project rendered to script and re-run reproduced every plate profile hash (computed, section 11). The earlier Sep 12 build lacks the sketcher and is not kept.

### 1.3 What is in `fab-knowledge:originals/sketch/files/`

| path | what |
|---|---|
| `sketch.html` | SKETCH v3 |
| `sketch-plan.md`, `rabbet-plan.md` | the plan, twice |
| `exports/box-sheet1.svg`, `exports/box-sheet1.dxf` | BOX generator defaults, nested, kerf mode none (computed) |
| `exports/box-sheet1-kerf-outline.dxf` | the same sheet with kerf mode outline (computed) |
| `exports/box.project.ts`, `exports/box.sketch.json` | the BOX project as script and as JSON (computed) |
| `exports/kerf-coupon-sheet1.svg` | KERF COUPON defaults (computed) |
| `exports/hinge-sampler-sheet1.dxf` | HINGE SAMPLER defaults; shows the hinge slits on the SCORE layer (section 9) |

Hashes: `fab-knowledge:originals/sketch/SHA256SUMS`.

---

## 2. What it makes and for whom

A browser CAD for things cut from sheet: a maker sketches a profile on a plate, gives the plate a material, poses plates in 3D, joins edges with generated joints, nests and cuts. The welcome card states the model in two sentences: "A plate is a 2D profile with a thickness. A joint is a relationship that writes geometry into both plates. Everything else here follows from that." (`H:4527`). One project model under six modes: DRAW, PLATE, ASSEMBLY, SHEETS, CODE, SIM (keys 1 to 6). Every edit is an op on a timeline with undo.

The plan (`F/sketch-plan.md`) sets SLUG as the acceptance target: M1 rebuild a SLUG panel faster than in Fusion (line 441), M2 rebuild SLUG's cabinet with identical cut sheets by hash (line 443), M5 reproduce SLUG's 126 of 128 vend trials (line 449).

---

## 3. Shots

From the headless drive (puppeteer-core through `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs`, ready on `window.A.P.plates.length > 0`, 2026-10-05). Copies in `fab-knowledge:originals/sketch/shots/`.

| file | caption |
|---|---|
| `k01-welcome-over-box.png` | Boot: the BOX generator has already run (toast "script ran: 5 plates, 8 joints"), ASSEMBLY mode behind the welcome modal with five cards: BOX, BOARD CASE, KERF COUPON, BLANK, OPEN. |
| `k02-assembly-box-explode.png` | ASSEMBLY, explode 35 percent: the own canvas prism renderer (painter sorted, Lambert shaded) on a void stage with a pink ground grid; base selected in pink; rail with PLATES, POSE (x y z, rx ry rz, LAY FLAT, STAND UP, SNAP 90), JOINTS (eight finger joints with fit class and count), VIEW; tray TIMELINE with PROJECT and SCRIPT ops. |
| `k03-draw-front-plate-fingers.png` | DRAW on the front plate: slime outer profile with finger tabs on W, E and S, pink port slot hole, engraved "hack.build" label, dashed blue ghost of the mating plates, dotted amber joint marks on the joined edges; HUD bbox 120 x 48, cut 447.39 mm, hash db7b99f3; rail ACTIVE PLATE, SKETCH status, SELECTION, CONSTRAINTS, GEOMETRY, PARAMS. |
| `k04-sheets-nested.png` | SHEETS: the five BOX plates on a 600 x 400 sheet, 10.6 percent utilization; EXPORT pane with kerf mode, dialect, SVG, DXF, BUNDLE ZIP and the line "kerf is applied here, never in the model". |
| `k06-waffle-open-section-check.png` | WAFFLE FRAME generator: five ribs cross-lapped, six crossLap joints; tray CHECKS shows `STR.OPEN_SECTION` info "every plate lies in one or two planes". |
| `k07-hinge-sampler-draw.png` | HINGE SAMPLER plate "hinge p4.0" in DRAW: the slit lattice drawn as dashed blue lines, the colour of SCORE (section 9). |
| `k05-code-box-generator.png` | CODE mode with the BOX generator source (47 lines) in the editor and the GENERATORS list in the rail. |

---

## 4. Data model and evaluation pipeline

Project (`K.blankProject`, `H:490 to 500`): `{schema 1, name, units mm, params {name: {expr, v}}, materials[], defaultMaterial, plates[], joints[], sheets[], machine {bedW 600, bedH 400, honeycombGap 5}, exportCfg {kerfMode none, dialect generic}}`. Plate (`api.plate`, `H:2580 to 2599`): `{id, name, materialId, count, face, thicknessOverride, entities[], pose {p, r}, visible, colour, explodeAmt 40, tags, sk}` where `entities` are parametric primitives and `sk` is a constrained sketch. Joint (`mkJoint`, `H:2600 to 2605`): `{id, kind, a {plateId, edge}, b {plateId, edge}, params {count 3, fit slide, startA true, spanA [0,1], spanB [0,1], ...}}`.

```
K.evaluate(P)                                  H:832
  K.resolveParams(P)                           params as expressions, in order
  for each plate: K.evalPlate(P, plate)        H:736
     tessellate entities (K.tessEntity)        closed loops, open polylines, labels
     sketch regions (SKS.regions) + open paths
     outer = role outer, else largest loop; others become holes, islands, scores, engraves
     group joints by edge; per edge: K.edgeInfo, jointContribution for each joint, waveFromMods once
     despike outer, holes, islands; bbox, area, cut length, score length, FNV-1a hash
  D.checks = K.runChecks(P, D)                 H:845
```

| material default (`K.defaultMaterial`, `H:476 to 489`) | value |
|---|---|
| t | 3.0 |
| kerf | 0.18 |
| fit | press -0.05, slide 0.05, loose 0.15 (added to the pocket) |
| sheet | 600 x 400 |
| minFeature | 1.0 |
| minHingeRadius | 14 (stored, read by nothing) |
| laser | cut 18, power 75, passes 1, score 80, engrave 180 |

Expressions (`K.evalExpr`, `H:457 to 469`): numbers pass through; other strings must match `/^[0-9a-zA-Z_+\-*/%(). ,<>=?:]*$/` and run through `new Function` with the param scope plus `t` and `kerf` of the plate material. Profile hash (`hashPts`, `H:447 to 452`): FNV-1a 32 bit over JSON with numbers rounded to 0.001.

---

## 5. Construction: joints written once per edge

What it does. A joint names an edge of each plate and writes tabs, pockets, slots or notches into both. Every joint on an edge contributes modifiers and the edge is rebuilt once, "because cutting per joint would leave the second joint measuring a fragment the first one left behind" (`H:616 to 618`).

Construction, in order:
1. Edge naming (`sideOfSeg`, `K.edgeInfo`, `H:595 to 615`): a segment within 0.08 mm of a bbox side is on N (max y), S, E or W; the longest such segment is the edge.
2. Cells (`K.fingerCells(L, count, startMale, fit)`, `H:635 to 649`): n = round(count); 2n - 1 equal cells of width w = L/(2n - 1); male cells alternate starting with `startMale`; clearance fit/2 is applied only at tab to pocket interfaces (`s += d` unless first cell, `e -= d` unless last cell), never at the free ends, "or the corner picks up a sliver thinner than the kerf".
3. Span: `spanA`, `spanB` limit a joint to a fraction of its edge; s0 = span[0] L; Leff = (span[1] - span[0]) L.
4. Contribution (`jointContribution`, `H:660 to 725`):
   - finger: plate A (startMale) pushes male cells out by the mate thickness `tOther`; plate B (not startMale) cuts its non-male cells in by `tOther`, so both plates finish flush at the corner.
   - tabSlot, throughTab: plate A gets tabs of depth `tOther + proud` (proud 2 for throughTab); plate B gets rectangular slot holes on a line parallel to its edge at inset `tMe/2 + gap`, slot width `tOther + fit`.
   - crossLap: a notch of width `tOther + fit`, depth `depth x extent` (default 0.5 of the plate's extent across the edge) at parameter `at` (or `atA`, `atB` per plate).
   - butt: nothing.
5. Edge rebuild (`waveFromMods(a, b, mods)`, `H:619 to 633`): sort modifiers by start; walk the edge emitting out-and-back rectangles of depth d along the outward normal; splice into the outer loop (`spliceSeg`).
6. `despike(loop)` (`H:424 to 445`): up to six passes removing zero-area out-and-back spikes where two joints meet at a corner, which would double a cut line.
7. Each joint leaves a `jointMark {joint, side, cells, w, depth, fit, male}`; checks measure finger width from the mark, not from the cut edge.

Equations. Tab width = w - fit, pocket width = w + fit, so the designed clearance across one finger is 2 x fit before kerf (inferred from `fingerCells`; the SIM fit readout computes the same `gap = (cell + fit) - (cell - fit)`, `H:3729 to 3731`). At slide 0.05 that is 0.10 mm.

| check on a joint | rule | where |
|---|---|---|
| JNT.FINGER_NARROW | w < 1 t (warn) | `H:902` |
| JNT.FINGER_WIDE | w > 3 t (warn) | `H:903` |
| JNT.CLEARANCE | abs(fit) < kerf/4 and class not press (info) | `H:907 to 908` |
| JNT.T_MISMATCH | finger joint with thickness difference > 0.4 (warn) | `H:909 to 910` |
| JNT.EDGE_SHARED | two joints claim overlapping spans of one edge (err) | `H:874 to 891` |
| JNT.EDGE_MISSING | no straight edge on the named side (err, from evalPlate) | `H:807` |
| JNT.BROKEN | joint points at a missing plate | `H:894` |

Results (computed, BOX defaults W 120, D 80, H 45, t 3, fingers auto): finger cell width on the vertical corners 6.429 mm (fc(45) = ceil(45/12) = 4, 7 cells), on the front and back bottoms 6.000 mm (fc(120) = 10, 19 cells over Leff 114 with spanA [t/W, 1 - t/W]), on the side bottoms 5.692 mm (fc(80) = 7, 13 cells over 74). Profile sizes: base 114 x 74, front and back 120 x 48, left and right 80 x 48. 0 checks fire.

Failure lessons recorded in code comments: second joint measuring a fragment (one pass per edge); corner sliver from clearance at free ends (interface-only clearance); doubled cut lines at corners (`despike`); finger width measured off the cut edge (measure the mark).

Tab and slot fit (inferred from `jointContribution`, `H:687 to 713`). Both plates of a tabSlot or throughTab lay out their cells with `layout(true)`, so plate B's slot holes take the male cell extents, the same w - fit as plate A's tabs. The slot is `tOther + fit` across but exactly the tab length along the edge: the designed clearance along a tab is 0 before kerf, against 2 x fit for a finger. The SIM fit table (`H:3720 to 3735`) prints `(cell + fit) - (cell - fit)` for every joint kind, so it reports 0.10 mm of slide clearance on a tab and slot that has none lengthwise. The slot line sits at `tMe/2 + gap` from plate B's edge, the slotted plate's own half thickness (`H:696`); with plates of different thickness the slot centre is tB/2 from the edge while the tab plate is tA thick. BOX in tabbed mode passes `inset: t/2` explicitly and one stock, so it is unaffected.

No span agreement check (inferred, `H:671 to 675`, `H:845 to 936`). Each plate lays its cells over its own edge length times its own span. Nothing compares Leff on A with Leff on B, so a joint between edges of different lengths with default spans writes fingers that do not line up, and no check fires. BOX gets it right by passing `spanA [t/W, 1 - t/W]` on the wall bottoms.

Limits (inferred): joints do not pose plates; poses are explicit and joints only write geometry. The crossLap span reported to the edge-sharing check is a fixed `at +- 0.012` of the edge (`K.jointSpan`, `H:651 to 659`).

---

## 6. Mechanism of the tool: constrained 2D sketch kernel (`SKS`, `H:1002 to 1998`)

Model (`H:1022 to 1033`): `{pts {id: {x, y, fix}}, curves [line p0 p1 | arc c p0 p1 ccw | circle c r], cons [], seq}`.

Residuals (`RES`, `H:1100 to 1151`): horizontal, vertical, parallel (cross of unit directions), perpendicular (dot), equal (length), equalRadius, distance, distanceX, distanceY, radius, angle (abs signed angle minus v), coincident, pointOn (line distance or circle radius), midpoint, concentric, tangent (line to arc: abs signed distance of the centre minus R; arc to arc: centre distance minus R1 + R2), symmetric, fix. Every arc adds an implicit equal-radius residual (`H:1173 to 1178`). Each residual is multiplied by its weight `w` (default 1; drags use 6).

Solver (`S.solve`, `H:1188 to 1238`), damped Gauss-Newton:
1. Unknowns are the x and y of every non-fixed point.
2. Jacobian by forward difference, h = 1e-7 (`H:1244 to 1255`).
3. Normal equations `(JᵀJ + lam (1 + diag)) dx = -Jᵀr` (Tikhonov, `H:1210 to 1220`), solved by Gauss-Jordan with partial pivoting, pivots under 1e-12 skipped (`H:1256 to 1275`).
4. Line search: step 1, up to six halvings by 0.4; accept the first that lowers the residual norm, then lam = max(1e-9, 0.4 lam); on failure lam x 8, abort over 1e6. lam starts 1e-6; 60 iterations; stop when the norm is under 1e-9.
5. The loop bound reads `it<opts.iters||it<60` (`H:1203`), so an `iters` option can raise the cap but never lower it under 60.
6. Status (`S.applyDof`, `H:1239 to 1242`): rank of J by elimination with pivot threshold 1e-7 (`H:1276 to 1294`); dof = vars - rank; state conflict when the residual is over 1e-4, under when dof > 0, else full. The stage colours geometry blue (under), cream (full) or red (conflict).

Regions (`S.regions`, `H:1336 to 1413`): tessellate non-construction curves at 0.05 mm chord; split every segment at every crossing (bbox reject first); build a half-edge graph with outgoing edges sorted by angle; walk faces taking the next clockwise edge; keep loops with positive area; nesting depth by testing each loop's centroid inside larger loops; odd depth is a hole. Open chains (curves in no region, or role score) become score lines (`S.openPaths`, `H:1435 to 1444`).

Edit operations: trim at crossings (`H:1492 to 1539`), extend to the first curve hit (`H:1547 to 1585`), fillet and chamfer of two lines with tangent and radius constraints added so the fillet stays a fillet (`H:1607 to 1638`), offset with corners closed by intersecting neighbouring offsets (`H:1685 to 1731`), weld under 0.02 mm, mirror, linear and circular pattern, rect with H and V constraints, polygon with equal sides, slot with tangent arcs, and explode of a parametric primitive into sketch geometry (`H:1831 to 1856`).

Inference (`S.infer`, `H:1871 to 1976`), ranked: endpoints, then intersections near the cursor, midpoints and centres, quadrants, on-curve; then H and V alignment guides; then direction from the anchor (horizontal, vertical, parallel or perpendicular to an existing line); angle lock in 15 degree steps; grid only per axis, only when the cursor is within tolerance of a grid line and nothing better claimed that axis ("a grid that always rounds would swamp the alignment and direction guides"). Inferred constraints are applied to the new curve (`S.applyInferred`).

Limits: the plan (`F/sketch-plan.md`) says to vendor a JSketcher-style solver, PLAN section 14 says adopt planegcs, and v3 ships this one; the mappings record (`fab-knowledge:synthesis/mappings.md` line 238) names the choice open.

---

## 7. Construction: kerf belongs to export, never to the model

`K.exportProfile(P, plate, prof, mode)` (`H:939 to 954`): mode none returns the nominal loops; outline grows the outer by kerf/2 and shrinks holes by kerf/2 with `offsetLoop` (miter offset; where a miter would reach past 4 x d the vertex is replaced by the start of the next offset segment, a one-point bevel, `H:397 to 421`); joint does the same only for plates that carry joint marks; islands always grow except in mode none. The sheet view stays nominal; the top bar chip reads NOMINAL or KERF OUTLINE. Comment in the plan: "This respects the way he cut SLUG (compensation off, joint clearances designed in)" (`F/sketch-plan.md` line 321).

KERF COUPON generator (`H:2799 to 2818`): one strip 140 x 34 (computed) with nine thickness slots `tslot` of length 22 at pitch 14, fit stepping from -0.08 by 0.02, each value engraved; cut it, find the first slot the stock slides into, set the material kerf. FIT TEST (`H:2820 to 2836`): one finger tab and pocket pair per class (press, slide, loose). Material modal text: "Kerf belongs to the material and the machine, not the drawing" (`H:4522`).

Coupon range (inferred from `H:2799 to 2818` and `K.exportProfile`). In the default kerf mode none a slot drawn t + d cuts about t + d + kerf wide, so the first slot that admits the stock reads kerf as about -d. The ladder runs d from -0.08 to +0.08, so it resolves a kerf only up to 0.08 mm; with the declared ply kerf of 0.18 every slot admits the stock and the coupon says nothing. In kerf mode outline the holes are already shrunk by kerf/2 per side and the coupon measures fit instead of kerf. A port should start the ladder near minus the expected kerf (for example -0.30) or state which mode the coupon is cut in.

Limit: the fit test triggers `STR.OPEN_SECTION` (six flat plates in one plane class) though it is not a structure (computed).

---

## 8. Construction: shelf nester (`K.nest`, `H:957 to 999`)

Per material: expand plates by count; sort by max side then area, descending; shelves run from the top of the sheet down; each part tries its orientation, then 90 degrees, then a new shelf, then a new sheet; spacing kerf + 1.5 (1.68 at defaults), margin 6. Utilization is profile area over sheet area. Results (computed): BOX 1 sheet, 10.63 percent; BOARD CASE 1 sheet, 8.16 percent; KERF COUPON 1.74; FIT TEST 3.45; WAFFLE 11.7; HINGE SAMPLER 5.5.

Limit (inferred, also in M07-motion-nest.md line 470): after three attempts the fall-through places the part at the sheet margin without testing occupancy, so an unlucky or oversize part can overlap. Parts can be dragged and rotated on the sheet by hand (each move is an op).

---

## 9. Construction: living hinge entity (the plan's `flexcut`)

`tessEntity` kind hinge (`H:574 to 587`): rows = max(2, floor(h/pitch)); row y = y - h/2 + (i + 0.5) h/rows; odd rows offset by (cut + gap)/2; segments of length cut every cut + gap from x - w/2 + land to x + w/2 - land; a segment shorter than 0.4 x cut is dropped. Defaults w 60, h 40, cut 12, gap 3, pitch 4, land 3 (`api.sketch.hinge`, `H:2567`). HINGE SAMPLER (`H:2865 to 2881`): three 110 x 40 strips with a 70 x 34 lattice at pitch x 1, 1.5 and 2 (4, 6, 8 mm), cut 14, gap 3, land 4.

Defect found 2026-10-05 (computed): the hinge returns open polylines, and `evalPlate` sends every open polyline to `prof.scores` (`H:747`). The API gives the hinge entity `role:'cut'` (`H:2567`) and the GEOMETRY list shows it as cut (shot `k07`), but `evalPlate` never reads the role of an open polyline, so the slits export on the SCORE layer: the HINGE SAMPLER DXF carries 60 entities on SCORE and none of the slits on CUT (`F/exports/hinge-sampler-sheet1.dxf`). Cut at score power, the hinge would not bend. The stage also draws them dashed blue (shot `k07`). The fix belongs in the port: a hinge slit is a through cut.

Missing (inferred): `minHingeRadius` 14 is stored and read by nothing; no degrees-per-row rule (TUMBLER's 13 degrees, CHK-SHT-06) and no ligament check run.

---

## 10. Construction: writers and bundle (`SKIO`, `H:2884 to 3141`)

Arc fitting (`IO.fitArcs(pts, closed, tol=0.1)`, `H:2915 to 2962`): from each point, fit a circle through three points; extend while each next point is on the circle within tol, each chord passes the sagitta test (chord midpoint on the circle, chord under 1.2 r) and the turn keeps its sign; accept an arc of at least 3 segments and sweep 0.20 rad to just under 2 pi; otherwise emit the longest collinear run. The sagitta test exists because "any four corners of a rectangle sit on a common circle, so radius agreement alone would turn finger teeth into arcs". `IO.wholeCircle(pts, 0.02)` detects a closed loop that is one circle (8 points or more).

SVG (`IO.sheetSVG`, `H:3003 to 3043`): mm units, one y flip at the root group, layer groups in cut order ENGRAVE, SCORE, CUT_INNER, CUT, LABEL with inkscape labels; stroke colours from `IO.LAYERS` (`H:2999`): CUT black, CUT_INNER red, SCORE blue, ENGRAVE green, LABEL grey; the DXF LAYER table gives ACI 7, 1, 5, 3, 8 in the same order; labels are un-mirrored with a local `scale(1,-1)`, whole circles as two half arcs, labels as text.

DXF (`IO.sheetDXF`, `H:3046 to 3102`): `$INSUNITS 4`, a LAYER table of five layers, CIRCLE for whole circles, LWPOLYLINE with `AcDbPolyline`, closed flag and bulge `tan(sweep/4)` signed by direction on the start vertex, TEXT for labels; no `$ACADVER`, no handles, no repeated first vertex (fails CHK-SHT-03 as the plan words it). Layer counts on the BOX sheet: CUT_INNER 16, CUT 5, LABEL 1 (computed).

Bundle (`exportZip`, `H:4257 to 4292`; `IO.zip`, `H:3105 to 3133`): store-only zip with a hand-written CRC32; `sheets/NN-name.svg` and `.dxf` per sheet, `README.txt` (units, kerf mode, dialect, layers in cut order, materials, parts with counts and hashes, joints, assembly order), `project.sketch.json`, `project.ts`.

Limit (inferred): the dialect setting (generic, lightburn, glowforge) is written into the README and changes nothing in the SVG or DXF.

---

## 11. Script API, generators and project as script

API (`K.makeApi`, `H:2533 to 2616`), the same surface the CODE editor, generators and the intended MCP call: `params({...})` (choices that are not numbers never enter the expression scope), `material(id, opts)`, `sketch.{rect, circle, slot, poly, tslot, hinge, label, grid}`, `plate(name, mat, ents, {at, rot, count, t})` with `.add`, `.engrave`, `.score`, `.at`, `.rot`, `.count`, `.edge(side)`, `joint.{finger, tabSlot, throughTab, crossLap, butt}`, `mate.note` (stub), `log`. `K.runScript` runs the source through `new Function` in strict mode (`H:2618 to 2628`).

Generators (`IO.generators`, `H:2682 to 2882`):

| id | what | computed at defaults |
|---|---|---|
| box | four walls and a base; finger count auto `max(2, ceil(L/(4t)))` ("a finger wants to be about 2t wide"); base wrap or tabbed; lid none, flat or lip; vent grid; port slot; engraved label | 5 plates, 8 joints, 0 checks |
| case | enclosure around pi4 (85 x 56, holes 58 x 49), pizero, esp32, uno; standoff holes from board data; top vent grid. The blurb says the USB opening is "placed from the board data", but the two openings are fixed: a 14 x 8 slot at x = -W/4 on the front and a 16 x 7 slot centred on the right wall, the same for every board (`H:2794 to 2796`) | 6 plates, 12 joints, 0 checks |
| coupon | kerf coupon, section 7 | 1 plate |
| fittest | press, slide, loose finger pairs | 6 plates, 3 joints, STR.OPEN_SECTION info |
| waffle | cross-lapped egg crate | 5 plates, 6 joints, STR.OPEN_SECTION info |
| hinge | hinge sampler, section 9 | 3 plates |

`K.toScript(P)` (`H:2631 to 2679`) renders the project back to this dialect. Round trip (computed): BOX rendered to script and re-run gives the same five profile hashes (fbec8513, db7b99f3, 2aa2dae5, d8bd4e8c, d8bd4e8c). The rendered script is frozen: entity sizes come out as numbers (`sketch.rect(114, 74, ...)` in `F/exports/box.project.ts`), so its `params` line no longer drives any geometry, and choice params (`joinery`, `lid`) are dropped because they never entered `P.params`. Editing W in the rendered script changes nothing; the hashes match only because nothing is re-derived.

Limits (inferred): the op log stores `{seq, kind, label, ts, author}` plus a full JSON snapshot per op (`commit`, `H:3219 to 3227`); undo restores snapshots; ops carry no payload, so the log cannot replay, and `toScript` renders the current state rather than the ops. `K.runScript` starts from `K.blankProject()` and keeps its `W`, `D`, `H` params, so every generated project carries stray params (measured: the hinge sampler shows W 120, D 80, H 40 in PARAMS). Scripts run with no sandbox beyond strict mode.

---

## 12. Checks (`K.runChecks`, `H:845 to 936`)

Ids live in v3: SKT.EXPR, SKT.REGION, SKT.CONFLICT, TOPO.NO_OUTER, TOPO.MULTI_BODY, TOPO.HOLE_OUTSIDE, TOPO.SLIVER (segment under one kerf), MAT.MIN_FEATURE, SHT.TOO_BIG, SHT.OVERFLOW, SHT.OFF_SHEET, SHT.FALLTHROUGH (part under the honeycomb gap), ASM.NO_JOINTS, JNT.EDGE_MISSING, JNT.EDGE_SHARED, JNT.BROKEN, JNT.FINGER_NARROW, JNT.FINGER_WIDE, JNT.CLEARANCE, JNT.T_MISMATCH, STR.OPEN_SECTION (four or more plates whose rotations occupy under three axis classes). This is a second id scheme beside CHK-*.

Defect (inferred, `H:863`): SHT.TOO_BIG tests `bbox.w > sheet.w && bbox.h > sheet.w`, comparing both sides to the sheet width and never to its height.

---

## 13. 3D: own prism renderer (`SKR`, `H:2350 to 2521`)

`R.plateMesh` builds two caps (keeping the 2D loops for evenodd fill) and one quad per outline and hole segment, posed by Euler XYZ degrees and offset along the plate normal by explode x `explodeAmt` (40). `R.view3d` places an orbit camera (yaw -52, pitch 26 at iso), projects with focal = 1.15 x min(w, h), culls faces behind the eye, sorts by mean depth (painter), shades Lambert with light (0.4, -0.7, 0.8) as 0.35 + 0.65 max(0, n.l), draws a ground grid and an axis marker; xray draws faces at 0.22 alpha. Picking tests the projected top cap. No three.js. Limits: painter sorting misorders interpenetrating faces; no interference check.

---

## 14. UX anatomy

| part | what is there |
|---|---|
| shell | the `--hb-` token set: `--hb-pink #FE0386`, paper `#f5f0e6`, raised, sunk, edge, ink to ink-4, void, ok, warn, err, info, slime, lit-warn, lit-err, lit-info, lit-dim; IBM Plex Mono body, VT323 instrument labels, Permanent Marker title, Special Elite for the welcome line (`H:11 to 37`) |
| layout | grid: top bar 46, sub bar 30, option bar 26, stage, tray 210; rail 336 on the right; under 900 px the rail becomes a fixed overlay (`H:58 to 64`, `H:273 to 280`) |
| top bar | mark, SKETCH title, project name, mode tabs, UNDO, REDO, MAT chip (name, t, k), NOMINAL or KERF chip, CHECKS chip (CLEAR, n WARN, n ERR), SAVE, EXPORT |
| sub bar | per mode tools; DRAW create tools V L R C A P S . G and modify tools T E O F K M D, pattern, construction X, delete, fit |
| option bar | tool name, tool numbers (sides, slot width, offset, fillet, chamfer), SNAP, GRID 10 / 5 / 1 MM, ANGLE LOCK 15, GHOST MATES, the CONSTRAIN bar enabled by selection count, and a one-line hint per tool (`TOOLHINT`, `H:3371 to 3388`) |
| stage | corner title and plate, HUD (bbox, cut length, hash; or util and parts; or plates, joints, explode), view chips (dof state, snap, angle lock, fit; or iso, top, front, side, xray), foot (x, y, grid, zoom, tool, step), numeric entry overlay that takes typed length, angle, width, height or radius while drawing |
| rail panes | DRAW: ACTIVE PLATE, SKETCH (state, dof, points and curves, residual, SOLVE, RELAX ALL), SELECTION, CONSTRAINTS, GEOMETRY, PARAMS, CHECKS. PLATE: PLATES, PLATE, READOUTS (bbox, thickness, area, cut length, score length, holes, cut time estimate, hash), JOINTS ON THIS PLATE, MATERIALS. ASSEMBLY: PLATES, POSE, JOINTS, VIEW. SHEETS: SHEETS, SHEET, EXPORT, MATERIALS. CODE: GENERATORS with parameter sliders and RUN, LOG. SIM: kind, time, play, READOUT |
| tray | TIMELINE (one card per op, click to go back), CHECKS, CONSOLE |
| other | command palette on `/` or ctrl K (modes, generators, tools, plates, params, export); welcome modal; joint modal (plate A gets tabs, plate B gets pockets; kind; fit class; count; spans); material modal |
| SIM | assembly order (plates by joint degree, insertion axis from the plate normal), joint fit section table (cell, tab, gap, press / snug under 0.12 / loose), shake (counts unjoined plates); all shallow |
| files | SAVE downloads `<name>.sketch.json`; OPEN reads one back through a file input and reseeds the timeline; there is no autosave or local storage, so a reload loses unsaved work (`H:4550 to 4569`) |
| stage glitches (measured, shots) | in CODE mode the stage corner title and HUD (plates, joints, explode) draw over the editor head (`k05`); in ASSEMBLY the HUD read "explode 0%" while the foot read "explode 35%" (`k02`) |
| SIM fit table | `gap = female - male + kerfEff*0` (`H:3731`): the kerf term is multiplied by zero, so the table never shows kerf; see section 5 for tab and slot |
| hook | `window.A`, `window.SK`, `window.SKS`, `window.SKR`, `window.SKIO`; no `BENCH` or `HB` hook |

What makes it excellent: the joint algorithm (one pass per edge, interface-only clearance, despike, marks) is right and short; kerf lives at export with a coupon to measure it; the arc fitter keeps finger teeth square and circles true; generators are scripts on the same API, so a generator, the CODE editor and an agent are one caller; it opens offline from `file://`. The plan names it the reference for the FAB app shell (top bar, sub bar, option bar, rail 336, tray 210, palette, toasts, modal host), not for a bench (`fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` line 654).

---

## 15. Tests and harness

None ship. The drive used here calls the page globals: `SK.runScript(gen.src, defaults)`, `SK.evaluate`, `SK.nest`, `SKIO.sheetSVG`, `SKIO.sheetDXF`, `SK.toScript`. A port test set: run each generator at defaults and compare profile hashes; toScript round trip; joint cell widths per generator; layer counts per export; the hinge-on-CUT fix; SHT.TOO_BIG both orientations; nest fall-through overlap.

---

## 16. Port map

| item | value |
|---|---|
| packages | `sheet` (no package today; mappings.md line 581 seeds it from SKETCH v3), `geom` (offsetLoop, despike, regions, fitArcs, wholeCircle), `nest` (shelf packer as the offline fallback, M07), `checks` (map the SKETCH ids onto CHK-SHT, CHK-FIT), `project` (op log with payloads, hashes), `chase` (generators as param schemas plus a script), `ui-core` (palette, tray, numeric entry, the app shell), and a 2D constraint solver (this one, or planegcs) |
| feature kinds | `finger`, `tabslot` (tabSlot, throughTab), `bridge` (via tslot), `flexcut` (hinge entity), `coupon` (KERF COUPON, FIT TEST); crossLap |
| feature kinds MISSING | `crossLap` has no feature kind in the plan's list; `pivot` refusal absent |
| canon ids | `finger-joint` (typed, CANONS.md line 400, source TUMBLER; SKETCH's `fingerCells` is a second source with a different cell rule: 2n - 1 cells and interface-only clearance against TUMBLER's L/(2n+1) with kerf terms); `living-hinge` (typed, CANONS.md line 399, TUMBLER) |
| canon MISSING | cross lap (half-depth notch pair); tab and slot with proud through-tab; kerf coupon ladder as a canon (only as `sheet/coupon` reference and D-205) |
| reference ids | `joints/tab-slot`, `joints/finger`, `mechanisms/living-hinge`, `sheet/coupon` (scaffold INDEX lines 31, 36, 42) |
| milestones | M04 (CHK-SHT-09 hinge radius, citing `minHingeRadius` never read), M07 (nest, fitArcs, wholeCircle, LWPOLYLINE bulge writer), M09 (shell tokens `--hb-rail 336`, `--hb-tray 210`) |
| lineage row | MISSING |
| fixes to carry | hinge slits on CUT (honour `role`); tab and slot length clearance; a span agreement check between mates; slot inset from the tab plate's thickness; a coupon ladder that reaches the real kerf; toScript that keeps expressions and choices; board-placed openings in BOARD CASE; SHT.TOO_BIG; nest fall-through; op payloads for replay; stray params in `runScript`; dialect wired to layer colours; `$ACADVER`, handles and repeated vertex for CHK-SHT-03 |
