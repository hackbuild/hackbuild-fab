# CASK: how it is made

Record written 2026-10-05 from the original code. Slug `cask`. Family cases-joinery: the rear enclosure for the Waveshare round displays with a Raspberry Pi 5 inside, its keyed bayonet cap with a lock squeeze ramp, its registration collar on a bought body step, its SG90 face hardware, and STAVE, the stacked laser cut version. The logo caps built on CASK have their own record at `fab-knowledge:originals/cask-caps/RECORD.md`.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Measured" numbers come from the headless drives on 2026-10-05 (configs `fab-knowledge:originals/cask/shots/_drive.json` and `_drive-stave.json`, logs beside them; Chrome headless with network, because both pages import from unpkg) or, where marked, from the STL checks in `fab-knowledge:sources/benches/benches-cases.md` section 1 and `fab-knowledge:sources/downloads/dl-cases.md` section 3. "Computed" means worked by hand from declared values.

Short paths: `F` is `fab-knowledge:originals/cask/files/`, `CB` is `F/cask_bench.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | CASK BENCH v0.4, fit console for the Waveshare 5in round with a Pi 5 |
| owner's slug | cask |
| canonical file | `CB` |
| sha256 | 5e5b6f743e09197bb68ca0bd42608df77e32ef5082374a26cc40d642cd5e4b0d |
| bytes | 63107 |
| date | after 2026-07-21 21:30 (inferred: it is `cask_bench (6).html` of that time with two cap winding orders fixed in `sweepArc` and the breakaway ribs kept out of the assembled preview; no dated Downloads copy exists; harvest copy stamped 2026-09-14) |
| source | the page itself; the geometry library sits between `// ===CASKGEOM-START===` (CB line 184) and `// ===CASKGEOM-END===` (979) as `createCaskLib(THREE, CSG, deps)`; `F/cask.scad` v0.3 mirrors it module for module |
| runtime | three.js 0.160, three-mesh-bvh 0.7.8, three-bvh-csg 0.0.16 from unpkg through an import map (CB 139 to 148); manifold-3d 2.5.1 imported from unpkg at export (CB 1310); not offline |
| print target | any FDM printer; shell and cap face down, no supports; PETG if the Pi runs warm (`F/cask.scad` header) |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-cases.md` section 3 (Downloads mtimes).

| date | file | sha256 prefix | what changed |
|---|---|---|---|
| 2026-07-14 10:35 | `cask_bench.html` | 72ce6b44 | v0.1: bayonet, `ensureOutward`, BVH contact; no collar |
| 2026-07-14 11:26, 11:45 | `cask_bench (1)`, `(3)` | 9b3575ee, b546d414 | v0.2: registration collar, then breakaway tab support rings |
| 2026-07-14 12:08, 16:24 | `stave.html`, `stave (1).html` | 2e25f374, 35a7086c | STAVE v0.1, then v0.2 (the harvested and canonical STAVE) |
| 2026-07-14 12:56, 16:24 | `cask_bench (4)`, `(5)` | 43e48761, c6eb3307 | v0.3: face hardware (SG90 pods, ears, antennae) |
| 2026-07-14 16:16, 16:27 | `cask_cap.stl`, `cask_shell.stl` | efe92d3d, 94c313fa | v0.3 exports from the preview CSG: shell 14,109 and cap 14,108 edges not used twice (measured, dl-cases.md) |
| 2026-07-21 21:30 | `cask_bench (6).html` | 9982a093 | v0.4 with `makeManifoldEvaluator` |
| after 2026-07-21 21:30 | harvested `cask_bench.html` | 5e5b6f74 | canonical v0.4 |
| 2026-07-21 22:25 | `cask4_bench (4).html` = harvest | be282aa1 | CASK4 v0.1, the 4in fork |
| 2026-07-21 22:29 | `newcask_shell (1).stl` | cccba6fc | 4in shell from the Manifold path: 7,792 tris, 0 bad edges, 126.7 dia, z -4.5 to 40.0 (measured, dl-cases.md) |

### 1.2 Why this revision

v0.4 is the newest 5in bench and the first that exports watertight meshes: every harvested STL it wrote passes edge pairing with zero bad edges (shell 11,176 tris, cap 6,484, gauge 7,208, measured in benches-cases.md), against 14,109 bad edges for the v0.3 preview CSG export (kept as `F/known-bad/`). It carries the full feature set (collar, breakaway rings, face hardware, fit report, BVH contact pass, manifold export). The drive on 2026-10-05 built it with 0 errors, 37,301 preview triangles in 654 ms (measured). CASK4 is the same library with 4in defaults (section 5.11); it is newer by an hour and kept as the 4in variant, not the canonical, because it turns face hardware off and drops nothing new into the library except the counterbore skip.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `cask_bench.html`, `cask.scad` | canonical bench and the OpenSCAD v0.3 source it mirrors (parts `shell cap gauge pod ear antenna pod2 ear2 fit both`) |
| `cask4/` | `cask4_bench.html` (CASK4 v0.1), `cask4.scad`, `cask4_shell.manifold-2026-07-21.stl` (the 4in shell from the Manifold path) |
| `stave/` | `stave.html` (STAVE v0.2, stacked laser cut CASK), `stave_sheet_1.svg` (a laser sheet export, 2026-07-14 16:14) |
| `stl/` | representative exports: `cask_shell.stl`, `cask_cap.stl`, `cask_gauge.stl`, `cask_pod2.stl`, `cask_ear2.stl` |
| `scad-previews/` | the OpenSCAD render PNGs shipped with the bench (shell front and back, cap, gauge, fit, face with ears, face with antennae, 4in fit) |
| `known-bad/cask_shell.v0.3-preview-csg-14109-bad-edges.stl` | the v0.3 preview CSG export, kept as the reason the Manifold replay exists |

Not copied: the Waveshare STEP zips in `fab-work-directory:benches/cask/uploads/` (vendor data, 15.6 MB and 4.8 MB), and the remaining STLs (pod, ear, antenna, cask4 cap). Hashes: `fab-knowledge:originals/cask/SHA256SUMS`.

---

## 2. What it makes and for whom

A rear case for a Waveshare round display: Waveshare 5inch HDMI Round Touch 1080x1080 (SKU 24369, 150 mm body) by default, or the 4inch DSI LCD (C) 720x720 (126 mm) in CASK4. The shell screws to the display's four rear VESA holes, wraps a Pi 5 with its active cooler, and a twist lock cap closes the back. Optional face hardware adds two SG90 servo pods on the drum with swappable cat ears or antennae, "screen up opposite the ports, cable hangs down" (face hardware hint, CB 1083). For a maker who bought the round display and wants a desk companion that fits the real part the first time, measured from the factory STEP.

Parts: shell, cap, gauge (a fast footprint test print), servo pod (two), ear or antenna (two); v2 glue on pod and cowl ear in the SCAD.

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860, network on for unpkg). Copies in `fab-knowledge:originals/cask/shots/`.

| file | caption |
|---|---|
| `c01-assembled-fit-report.png` | Assembled default: grey shell with wall vent slots, teal cap with the two vent rings and the rim grip scallops, the gold cat ear swung out on its servo pod at left. The Fit report card lists every row with an LED: mesh contact (red, see 6.4), rear boss to bayonet 3.1, pod tail to rim 4.6, pod to buttons 15.3 deg, screw circle to bore 15.9, tab pad to pcb pocket 0.2 (amber), pi top to cap face 14.8, pi underside to display hdmi 3.1, pi radius to bore 18.7, button tip to pi 2.7, cable slot floor 8.0, assembled depth 56.1, hole circle radius 53.03, and an "attachment swing: clears drum and cap, full travel" row (a fixed string, see 5.13). Rail: Measured group open with the STEP hint. |
| `c02-explode.png` | Explode 45: the cap lifted, the Pi 5 mock with its cooler, USB stacks and ethernet inside the shell, the three teardrop button holes, the display mock dropped below. |
| `c03-xray-section.png` | xray and section on: the shell translucent and the whole assembly clipped at x = 0, showing the Pi on its standoffs over the display back. |
| `c04-shell-only-bayonet.png` | Shell alone: the three bayonet entry slots at the rim, the wall vents, the button teardrops, the tab pads with counterbores, the servo pod bosses and wire slot, the cable slot open to the rim. |
| `c05-cap-gauge.png` | Cap and gauge exploded: the cap's grip scallops and vent arcs, and the gauge (collar ring plus the four tab pads and their breakaway support ribs) in gold. |
| `c06-stave-stack-explode.png` | STAVE v0.2: the laser cut ring stack exploded with the teal collar ring at the bottom, tab layers with capsules, body rings with louvre notches, the groove layer and rim; Fit + schedule (15 + 4 layers, stack 45.0, inner depth 42.0, collar 3.0 of the 4.5 step, M4 head recessed, rod keepout clear, kerf 0.15) and the bill of materials. |
| `c07-stave-layer-groove.png` | STAVE layers view at S14 groove (z 36.0): the bayonet pockets with their detent bumps, the cable gap, and the six M3 rod holes in amber. |
| `c08-stave-sheets.png` | STAVE sheets view: two 600 x 400 sheets with six rings each, cut red and engraved labels blue, SVG and DXF per sheet. |

The OpenSCAD previews in `F/scad-previews/` show the same parts rendered by OpenSCAD.

---

## 4. Build pipeline and code map

No build step: the bench is hand written HTML with an ES module. `createCaskLib` is pure apart from `THREE` and the CSG object, so the cask-caps chat lifted it into node unchanged (`rebuild_5in_cap.mjs`), which is the reason it sits between markers.

| CB lines | contents |
|---|---|
| 191 to 219 | `defaults` |
| 221 to 248 | `derive(p)` |
| 251 to 373 | helpers: `ensureOutward`, `normalize`, `merge`, `brush`, `cylZ`, `radialBox`, `latheZ`, `tangentHullShape`, `extrudeRadial`, `sweepArc` |
| 376 to 405 | `tabsClipped`, `screwCutters` |
| 407 to 482 | `buildShell` |
| 484 to 523 | `lugGeo`, `buildCap` |
| 528 to 538 | `buildRibs` |
| 545 to 696 | `makeManifoldEvaluator`: `weld`, `edgeComponents`, `orient`, `manifoldFromWeld`, `toManifold`, `manifoldToGeometry`, `evaluate` |
| 702 to 774 | face hardware: `localBox`, `buildPodLocal`, `buildAttachmentLocal`, `headFrame` |
| 776 to 787 | `buildGauge` |
| 795 to 884 | `buildDisplayMock`, `buildPiMock` |
| 886 to 974 | `fitReport` |
| 984 to 1166 | app shell: scene, materials, `GROUPS` parameter registry, panel, view chips, `applyView`, `placeParts` |
| 1168 to 1265 | `rebuild` (220 ms debounce), `meshContacts`, `renderFit` |
| 1267 to 1357 | exports: `saveSTL`, `scadBlock`, `ensureManifold`, `cleanBuild`, export buttons |

---

## 5. Mechanisms, circuits and constructions

### 5.1 Keyed bayonet cap with a lock squeeze ramp

What it does: the cap drops its three lugs into three entry slots at the shell rim and twists 20 deg; the travel slot ceiling drops along the twist so the cap is pulled down tight; the lug angles are uneven so the cap only fits one way.

Constants (CB 205 to 206): `lug_angles [30, 120, 225]`, `lug_travel 20` deg, `lug_w 7`, `lug_h 3.2`, `bay_clr 0.35`, `rim_land 1.8`, `lock_squeeze 0.9`; cap `cap_face_t 3`, `skirt_t 2.4`, `skirt_len 12` (CB 210).

Derivation (`derive`, CB 221 to 248; 5in values computed, matching benches-cases.md):

```
id       = display_od - 2 wall              = 144.0
skirt_od = id - 2 bay_clr                   = 143.30
h0       = lug_h + 2 bay_clr                = 3.9     travel slot height
zf       = inner_depth - rim_land - h0      = 34.3    travel slot floor
lug_z0   = cap_face_t + rim_land + bay_clr  = 5.15    lug start on the skirt
entry half angle eh = asin((lug_w/2 + bay_clr) / (id/2))
travel ceiling zTop(th) = th <= a + eh ? L + 1 : zf + h0 - lock_squeeze clamp((th - a)/lug_travel, 0, 1)
```

Construction:

1. Shell slots (CB 424 to 429): per lug angle one `sweepArc(id/2 - 2.5, R + 2, a - eh, a + travel + eh, zf, zTop, 1.5)`, a swept annular sector whose ceiling is a function of angle: open to the rim (L + 1) at the entry, then the travel slot whose ceiling drops `lock_squeeze` over the travel.
2. `sweepArc` (CB 349 to 373): per step 4 vertices (inner bottom, outer bottom, outer top, inner top), quads between steps for bottom, outer, top and inner, two end caps; `ensureOutward` fixes the winding by the signed volume.
3. Cap (CB 499 to 523), built in print orientation, face on the bed: a 3 mm disc of the display OD, a skirt lathe `skirt_od` outer, `skirt_t` thick, `skirt_len` long, and three lugs at NEGATED angles: "cap flips over to install, mirror lands on entries" (CB 506).
4. Lug section (`lugGeo`, CB 484 to 496): a polygon from `x0 = skirt_od/2 - 0.6` at `lug_z0` with a 0.7 sliver at the base, widening to `wall - 0.4` (2.6) proud of the skirt at `lug_z0 + 2.2` and full to `lug_z0 + lug_h`. The underside ramp runs 2.5 out over 2.2 up, about 49 deg from vertical (computed from CB 486), so the lug prints on the upright skirt as a steep chamfer rather than an exact 45; extruded `lug_w` and rotated to its angle.

Fits: 0.35 radial and slot clearance (range 0.1 to 0.8 in the rail), 0.9 squeeze over 20 deg (range 0 to 1.6). Print: cap face down, no supports. Check in the fit report: "rear boss to bayonet" `zf - (boss_z[1] + 3.5)` (tight 2, hit 0) so a pod boss never meets the travel slot.

Limit: keying is by angle only; three lugs at 30, 120, 225 deg leave the 120 to 225 span 105 deg wide and the others 90 and 165 (computed), so a misaligned cap shows at a glance.

### 5.2 Registration collar on the bought body step, with breakaway support rings

What it does: the shell reaches forward past the display's back face and slips over the 146 mm tail step of the 150 mm case, centering the shell and hiding the seam.

Constants (CB 198): `collar true, collar_id 146.7, collar_len 4.3, tab_support true`. Source comment (cask.scad): "Sized 0.35 per side; tighten collar_id if your print rattles." The step is 4.5 long; the collar is 4.3, "shy so the tabs seat first" (benches-cases.md).

Construction: one lathe profile for the shell (CB 413 to 416): `[R, -c0], [R, L], [id/2, L], [id/2, 0], [collar_id/2, 0], [collar_id/2, -c0]`, which leaves an internal shoulder ring at z 0 that seats on the back face. With the collar off it falls back to a cosmetic front flange `ring_w` by `ring_t`.

Breakaway rings (`buildRibs`, CB 528 to 538): with the collar on, the shell prints face down and the tab pads float `collar_len` above the bed; a thin ring under each pad (OD `tab_d - 2`, ID `tab_d - 3.7`, height `collar_len`) carries it and is twisted out with pliers. The rings stay out of the CSG solid, out of the assembled preview and out of the contact pass, and are merged into the shell and gauge STLs at export (CB 1329 to 1340: "the bvh pass indexes shellGeo in place, ribGeo stays soup, and mergeGeometries refuses mixed indexing. flatten before merging").

### 5.3 Tab pads, screws and the gauge coupon

Tabs (`tabsClipped`, CB 376 to 393): for each hole, a `tangentHullShape(tab_d/2, tab_d/2, m)` (the 2D hull of two circles, half angle `acos((R - r)/m)`, CB 325 to 332) from an anchor in mid wall to the hole, extruded `tab_t`, rotated, merged, then intersected with a cylinder of the display OD so nothing pokes outside. Holes on a square of `hole_pitch` 75 rotated `hole_rot` 45 and offset `(0, -1.5)`: `hole_r = 75 sqrt2 / 2 = 53.03` (computed; fit report info row). Screws (`screwCutters`, CB 395 to 405): through hole and counterbore per thread, table M2.5 2.8 / 5.6, M3 3.4 / 6.6, M4 4.5 / 8.5 (CB 223 to 224), counterbore from `mount_surface_h + 2.0`. The SCAD asserts `norm(p) + cbore_d/2 + 1 < id/2` per hole.

Gauge (`buildGauge`, CB 776 to 787): the collar lathe at tab height plus the tabs and screw holes. cask.scad header: "fast test print of the mounting footprint ... worth printing first to confirm the offset sign"; Measured hint: "If it sits 3mm eccentric, flip offset y" (CB 1034).

### 5.4 Shell wall features

| feature | construction (CB) | numbers |
|---|---|---|
| cable slot | a U shape (rounded floor) extruded radially through the wall at `cable_angle`, open through the rim, in its own CSG pass "it may be steered across any other feature" (435 to 445) | `cable_w 14` (USB C plug body), `cable_bottom 8` |
| buttons | `tangentHullShape(button_d/2, 0.5, 0.62 button_d)`: a teardrop with its point up so the hole prints clean in the vertical wall, extruded radially (446 to 457) | 12 mm panel buttons, `button_d 12.4`, center 180, spread 18, count 3, `button_z 16`; merged into one cutter only if `spread >= 2 asin((button_d/2 + 1)/rMid)`, else one pass each |
| wall vents | `radialBox` slots at zones 80 and 280 deg, offsets -14 to 14 step 7, 4 wide, from z 8 to `L - 10` (430 to 433) | |
| cutter grouping | bayonet slots and wall vents share one merged cutter because they never share z (419 to 434) | three-bvh-csg needs merged cutters to be disjoint |

### 5.5 Cap vents and grip

Cap vent arcs (CB 510 to 515): six 30 deg arcs on r 30 to 34 and six on r 44 to 48, offset by 30 deg, through the face. Grip: 48 cylinders of 3.5 dia at 7.5 deg on the rim (CB 516 to 520). The vent rings fix the size of a centred logo on the cap at any display size (cask-caps record).

### 5.6 SG90 face pods with swappable ears and antennae

What it does: two servo pods bolt to bosses on the drum at `up_angle plus or minus ear_spread`; each carries an SG90 whose horn turns an ear or antenna attachment.

Constants (CB 216 to 218): `head_on true, up_angle 180, ear_spread 40, head_style 'ears', head_flap 12, servo_l 23.0, servo_w 12.4, servo_h 22.8, tab_cc 27.8, ear_len 52, ant_len 70` ("measured off the usual clones", cask.scad). Derived (CB 240 to 245): `bay_l = servo_l + 0.4`, `bay_w = servo_w + 0.4`, `pod_len = bay_l + 8`, `pod_z0 4`, `floor_t 3.2`, `pivot_r = display_od/2 + floor_t + bay_w/2`, `pivot_z = pod_z0 + 4 + 0.2 + 5.9`, `boss_z = pod middle plus or minus 8`.

Construction:

1. Shell bosses (CB 458 to 478): per pod two radial cylinders r 3.5 from `R - 0.5` to `R + 5` with 1.4 r holes (M3 self tap), and a radial wire slot 9 wide behind each servo.
2. Pod (`buildPodLocal`, CB 707 to 730), in a local frame (x radial, y along the shaft, z along the drum axis, z symmetric so one print serves both sides): a block minus the drum cylinder (so it hugs the curve), minus the servo bay, minus a wire window, minus two 0.95 r tab screw holes at `tab_cc` and two M3 clearance holes with counterbores through the pod floor.
3. Attachments (`buildAttachmentLocal`, CB 734 to 764): a common horn base (hub pocket r 3.75 deep 4.6, arm slot, 1.3 r screw hole, 2.7 r counterbore) with either a triangular ear plate 3 thick plus a rib and a 1 mm relief, or an antenna stalk r 2.2 with a 5 mm ball, cut flat at z -5.0 so it prints flat.
4. Placement (`headFrame`, CB 765 to 774): a basis at the pod angle with `m = plus or minus 1` mirroring so horns face inboard, and an optional preview flap rotation.

Exports: pod rotated X 90 and lifted `servo_h - 4.5 + 2.4`; ear lifted 5.2, antenna 5.0 so the flat sits on the bed (CB 1341 to 1355).

Glue on v2 (cask.scad 477 to 521): `glue_pod` is a shoe with wide glue wings that hugs the drum with no shell modification, a 1.6 floor, and a wire exit under the shoe; `cowl_ear` is a hollow ear (2 walls, ends capped 2 thick) that slides over the servo and hides it; "keep flap inside +-20 deg, the skirt grazes the drum past that". Exported as `F/stl/cask_pod2.stl` and `cask_ear2.stl`.

Checks: pod tail to rim (tight 2), pod to buttons in degrees with the pod body reach 1.5 or 21.5 mm depending on side (tight 3) (CB 892 to 911).

### 5.7 Bought bodies as STEP measured mocks with a re-pose rule

`buildDisplayMock` (CB 795 to 847): boxes and cylinders measured from the factory STEP: glass 149 x 1.7 at -13.1, body 150 x 6.9, tail 146 x 4.5, pcb pocket 59.5 x 87 x 4.4, board 58 x 85.5 x 1.6, HDMI 12.2 x 15 x 7.1 (top +4.92), two USB C, 4 pin header, backlight key, audio jack, and landing markers at the native holes (plus or minus 37.5, 36) and (plus or minus 37.5, -39). The mock is re-posed so its native hole set lands on the parametric hole set: rotate by `hole_rot - 45`, translate by `hole_off` minus the native offset `(0, -1.5)` rotated (CB 836 to 846). `buildPiMock` (849 to 884): Pi 5 board 85 x 56 x 1.6, ethernet, two USB stacks 15.6 tall, USB C, two micro HDMI, GPIO header, SoC, active cooler 56 x 41 x 15, on `pi_standoff` 8; returns the top z, the rotated footprint corners and the max radius.

### 5.8 The fit report and the BVH contact pass

`fitReport` (CB 886 to 974) returns rows with (tight, hit) thresholds and an LED class:

| row | formula | tight | hit |
|---|---|---|---|
| rear boss to bayonet | `zf - (boss_z[1] + 3.5)` | 2 | 0 |
| pod tail to rim | `inner_depth - (pod_z0 + pod_len)` | 2 | 0 |
| pod to buttons, deg | angular gap with pod reach | 3 | 0 |
| screw circle to bore | `id/2 - 2 - max hole radius` | 1.5 | 0 |
| tab pad to pcb pocket | pad edge to pocket rectangle in the mock frame | 1.0 | -99 (negative reads "pad bridges pocket edge", tight) |
| pi top to cap face | `inner_depth - pi.top` | 2.0 | 0 |
| pi underside to display hdmi | `pi_standoff - 4.92` | 1.0 | 0 |
| pi radius to bore | `id/2 - pi.maxR` | 2.0 | 0 |
| pi radius to skirt | skirt inner minus footprint when the Pi top passes the skirt tip | 2.0 | 0 |
| button tip to pi | each button a lane of `(button_d + 5)/2` half width, tip at `id/2 - button_depth`, walking the Pi perimeter at 41 samples per edge | 2.0 | 0 |
| info | cable slot floor, assembled depth `13.1 + inner_depth + cap_face_t` (56.1), hole circle radius |

`meshContacts` (CB 1232 to 1254): three-mesh-bvh `MeshBVH.intersectsGeometry` of every Pi part and the named display parts (`hdmi usb jack header key case pocket pcb`) against the shell BVH and the seated cap BVH (cap skipped while exploded); hits paint red and the first three names go in the top row.

### 5.9 Two evaluators with one contract: preview CSG, Manifold export

Preview: a three-bvh-csg `Evaluator` with `useGroups false` and attributes position and normal (CB 1184). Export: `makeManifoldEvaluator(wasm)` (CB 545 to 696) is a drop in with the same `evaluate(a, b, op)`; `cleanBuild` replays the same builder through it (CB 1317 to 1326). Source comment: "three-bvh-csg is quick for the live preview but leaves seam cracks a slicer flags as non manifold. exports replay the same build through the manifold kernel" (CB 541 to 544). Steps in the Manifold path:

1. `weld`: vertex key `round(x 8192)` per axis (about 0.12 micron), degenerate triangles dropped.
2. `orient`: flood fill a consistent winding across shared edges (flip a neighbour that shares the same directed edge), then flip each component to positive volume.
3. `manifoldFromWeld`: `new Manifold(mesh)`; if it throws, split into edge connected components (union find) and add them one by one.
4. `manifoldToGeometry`: nudge float32 duplicate positions apart by 0.0002 mm in x, drop triangles whose corners collapse.

Fallback: if the wasm cannot load (offline), the preview mesh is exported with a toast.

Lesson recorded in benches-cases.md: the 0.2 micron nudge is smaller than a 1e-4 mm rounding weld, so a downstream welder at that tolerance can recreate a few non manifold edges (seen on the cask-caps parts).

### 5.10 SCAD round trip

`scadBlock` (CB 1281 to 1305) copies the current parameters as OpenSCAD assignments to paste into `cask.scad`; the SCAD and JS libraries mirror each other (`rbox` = `radialBox`, `cap_lug` = `lugGeo`, `arc_cut` = `sweepArc`).

### 5.11 CASK4: the 4in DSI fork

`F/cask4/cask4_bench.html` differs in its defaults (diffed 2026-10-05): `display_od 126`, `hole_off_y 0` ("pattern dead centered on this panel"), `mount_surface_h 4.0` (pads land on the four case corner bosses), `screw M3`, `tab_d 7.2`, `collar_id 126.7`, `collar_len 4.5`, `cable_angle 270` ("pi power drops past the dsi chin"), `button_center 90`, `skirt_len 9`, `pi_x -10.25`, `pi_standoff 11.1`, `head_on false`; and it skips the counterbore when `tab_d - cbore_d < 2` (CB4 lines 480 and 786). 4in STEP numbers: glass 102 dia, body 126 dia, 124 step for the last 1.0, chin 31 x 6.5, four 7.1 dia corner bosses 3.95 tall at plus or minus 37.5 (benches-cases.md).

### 5.12 STAVE v0.2: the stacked laser cut CASK

`F/stave/stave.html`, library between `// ===STAVEGEOM-START===` (line 127) and `// ===STAVEGEOM-END===` (567) as `createStaveLib(PolyBool)`, polybooljs 1.2.2 for 2D booleans. Same measured hole set and bayonet idea, built from rings of sheet.

| item | rule (stave.html) | default result (measured) |
|---|---|---|
| layer schedule (`derive` 215 to 246, `schedule` 249 to 259) | `nc = floor(4.4 / t)` collar rings (`COLLAR_MAX 4.4`, "case step is 4.5, stay shy so the tabs seat"), `ntab = ceil(5/t)`, `nrim = max(1, ceil(2.4/t))`, one groove layer, `nbody = max(2, ceil(target_depth/t) - ntab - 1 - nrim)` | t 3: 15 shell rings, depth 42.0, stack 45.0, collar 3.0 of the 4.5 step |
| cap schedule (260 to 268) | `ceil(5/t)` face discs, `nrim` spacers, one lug ring | 4 discs |
| kerf | every solid grows by kerf/2 and every hole shrinks by kerf/2 | 0.15 applied |
| tabs (311 to 325) | capsules from mid wall to each hole, unioned and clipped; first tab layer takes the screw hole, the next the counterbore | M4 head recessed 7.0 |
| bayonet in plane (`grooveArc` 186 to 199, 326 to 329, lug ring 350 to 354) | the groove layer has arc pockets with a 0.8 deep detent bump 2.5 deg wide before the final seat; rim layers carry the entry gaps; the cap's lug ring carries the lugs at negated angles because the cap flips on | |
| vents as a baffled louvre (294 to 303) | even body layers notch from outside to mid wall, odd layers notch from the bore, overlapping 1 mm, "so air zigzags through. no ring ever severs" | |
| buttons | "drilled after glue up, see the wrap template. a through wall cut here would sever the ring into arcs" | step bit 12.4 |
| rods and pins (`rodCuts` 273 to 282) | six M3 rods at `ROD_ANGLES [17, 107, 148, 214, 255, 325]` mid wall, head pockets in the first layer past the collar, nut pockets in the cap face; three 3 mm pins at `PIN_ANGLES [0, 100, 205]` on r 64.5 | rod keepout clear |
| BOM (405 to 419) | `4x M4 x min(12, 2 ceil((ntab t + 4.5)/2))`, `6x M3 x ceil((stack - nc t - t + 4)/5) 5`, pins, wood glue, step bit | M4 x 12, M3 x 45 |
| exports (422 to 566) | SVG sheets (cut red 0.1, engrave blue, part labels), packed on 600 x 400; DXF R12 (`$ACADVER AC1009`, `$INSUNITS 4`, layers CUT and ENGRAVE, closed POLYLINE); a wrap template strip for drilling | 19 parts on 5 sheets |

This STAVE is unrelated to the registry's STAVE (the copper chevron key strip); the name is used twice.

### 5.13 Constructions and report rows the first pass left out (checker, 2026-10-05)

Read from `CB` and `F/stave/stave.html` at the lines named; behaviour inferred from the code.

| item | lines | how it is made |
|---|---|---|
| attachment swing row | CB 911 | `rows.push({k:'attachment swing', v:'clears drum and cap, full travel', cls:'ok'})` whenever face hardware is on. It is a constant, not a computed clearance, so it stays green whatever `head_flap`, `ear_len` or `ant_len` are set to. A port must compute it or drop it |
| servo wire slot | CB 474 | per pod one `radialBox(pa, 9, 3.5, pod_z0 + pod_len/2, id/2 - 2, R + 2)`: 9 wide, from z 3.5 with a height of `pod_z0 + pod_len/2` (19.7 at defaults, so up to z 23.2, computed), through the wall behind the servo |
| pod block | CB 710 to 714 | the block runs x from -3.2 to `floor_t + bay_w`, y from `-(servo_h - 4.5) - 2.4` to 0, z over `pod_len`; the drum cylinder of the display OD is subtracted so the pod seats on the curve; the servo bay is `bay_w + 2` deep from `floor_t`, open at y 0 |
| pod wire window | CB 715 | an 11 mm long (z) window from x -3.4 to `floor_t + 1`, y -9 to 1, at the pod middle, so the servo lead leaves through the drum slot |
| pod M3 holes | CB 717 to 726 | r 1.75 clearance through the floor at `pod_len/2 plus or minus 8` (on the shell bosses) with r 3.1 x 2.2 counterbores; servo tab screws r 0.95 at `tab_cc/2` either side, 9 long, at y -4.5 |
| ear plate | CB 738 to 748 | triangle (10, 1.5), (10, 38.5), (10 + ear_len, 20), 3 thick from z -5.2; a root block 6 to 12.5 by 1.5 to 38.5 over the half thickness; a 1 mm deep inset triangle (15, 7), (15, 33), (9 + ear_len, 20) at z -2.9 as a relief panel |
| export lifts | CB 1341 to 1355 | the attachment export takes `head_style 'mix'` to mean both ear and antenna files; every export tries `cleanBuild` through Manifold first and falls back to the preview mesh |
| STAVE cap grip | stave.html 337 to 342 | 48 grip notches of r 1.75 at 7.5 deg, skipped within 5 deg of any rod angle so the rod pockets keep their wall |
| STAVE groove pocket | stave.html 239 to 241, 328 | pocket outer radius `rIn + 2.5 + bay_clr + 0.15`, lug tip `rIn + 2.5`, entry half angle `asin((lug_w/2 + bay_clr)/rIn)`; the pocket arc runs from `a - ew` to `a + lug_travel + ew` with a 0.8 deep, 2.5 deg detent bump |
| STAVE collar ring count | stave.html 230 to 236 | `nc = floor(4.4 / t)`: at t 3 one collar ring (3.0 of the 4.5 step), at t 1.5 two (3.0), at t 2 two (4.0) (computed); the stack height is `depth + nc t` |

---

## 6. UX anatomy

### 6.1 Layout and theme

Dark fit console: `--soot #0d0d0d`, `--tape #2dd4bf` teal accent, `--brass #d9a441` warn, `--ember #e5533d` hit, JetBrains Mono and Oswald, a fractal noise overlay. 44 px header, 308 px parameter aside, stage. Header: `CASK◆BENCH`, "fit console · waveshare 5in round · pi 5", view chips `display pi shell cap gauge xray section`, export buttons Shell STL, Cap STL, Gauge STL, Pod STL, Ear + Ant STL, SCAD block.

### 6.2 Rail

`<details>` groups from the `GROUPS` registry (CB 1033 to 1103): Measured (brass, open, with the STEP and gauge hint), Shell, Registration collar (hint about the ribs), Bayonet, Cable slot, Buttons, Vents, Cap, Face hardware (assembly hint), Mock display (open), Mock pi 5. Numeric rows are slider plus number box; toggles are switches with `role=switch` and keyboard support.

### 6.3 Stage

Fit report card bottom left (LED per row ok, tight, hit, info), Section X slider (-80 to 80) and Explode slider (0 to 70) bottom right, stats top right ("CASK BENCH v0.4 · MM / tris / ms / SINGLE FILE FOREVER"), toast, busy veil. The cap is placed flipped at `inner_depth + cap_face_t + explode`; the display drops `0.45 explode`; the gauge lifts `0.25 explode`.

### 6.4 What makes it excellent, and what to fix

Excellent: the bought part is modelled from its STEP and moves with the parameters, so the markers always land on the tabs; every clearance that matters is a named row with a threshold and an LED; the contact pass tests real meshes at the seated pose; preview speed and export quality come from two evaluators behind one contract; the cheap gauge print proves the hole offset sign before the full shell.

Fix in a port: the default build reports "mesh contact: case tail 146" as a hit (measured, `c01`); the shell's internal shoulder ring sits exactly on the case back face at z 0, so a touching contact reads as an intersection (inferred from CB 413 to 416 and the tail mock at -4.5 to 0). The page needs the network (unpkg), has no steps, no undo, no hook, and no 3MF.

---

## 7. Tests and harness

None shipped. Evidence of checking: the SCAD `assert` per hole and `echo` of the hole circle and bore; the live fit report and contact pass; the gauge print. The drives on 2026-10-05 are recorded in section 3 (0 errors for both pages, measured). Mesh numbers for the shipped STLs are in benches-cases.md section 1 (all ten pass edge pairing with zero bad edges).

---

## 8. How to make a new thing this way

1. Start from the bought part's STEP: measure the body, steps, holes and connector heights, and build a mock that re-poses itself onto the parametric hole set.
2. Register on a step of the bought body with a collar a little shy of the step length, and carry floating pads with breakaway rings.
3. Close with a bayonet whose travel ceiling drops a stated squeeze, with uneven lug angles, and mirror the lugs on a part that prints face down.
4. Give every hole in a vertical wall a teardrop with the point up.
5. Write the fit report as rows with tight and hit thresholds, and test the real meshes at the seated pose.
6. Preview with a fast CSG; export by replaying the same builders through Manifold with weld, orient, component fallback and a duplicate nudge.
7. Ship a gauge coupon of the footprint before the full part.
8. Keep the geometry library between markers so another tool can import it unchanged.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (lathe, radial prisms, swept arc with a variable ceiling; Manifold replay), `geom` (tangent hull), `sim` (BVH contact at the seated pose), `catalog` (Waveshare rounds with STEP provenance, SG90, Pi 5), `project` (SCAD block round trip), `nest` (STAVE sheets) |
| feature kinds | bore with teardrop, boss, pocket (cable slot), window (vents), tabslot (a misfit for the bayonet); kinds it needs: `bayonet`, `registration-collar`, `coupon` for the gauge, per `fab-knowledge:synthesis/mappings.md` line 88 |
| canon id | MISSING. `docs/plan/CANONS.md` section 8.3 lists "bayonet with ramp preload and detent gate" (TENON, CASK) with no id, landing as the `bayonet` kind (D-059) at M10. No canon entry for the registration collar, the breakaway pad rings, the servo pod with swappable attachments, the STAVE louvre baffle or the in plane detent bump |
| reference id | `joints/bayonet` (INDEX, seeded from CASK as a tabslot misfit; M11 table: rewritten on the `bayonet` kind; M10-T16 writes it from TENON); `cases/cask-cap` and `bought/display-mock` (proposed, `synthesis/mappings.md` line 88); `sheet/stacked-rings` for STAVE (line 89). None exists under `reference/` on 2026-10-05 (MISSING) |
| milestone | none assigned for the bench; the cap 3MF is the M00 known-bad fixture (cask-caps record); M-1 worked sessions use `chase.scaffold --from design:cask` as an example |
| lineage rows | MISSING: no row in `lineage.json` for `createCaskLib` (CB 184 to 979), `makeManifoldEvaluator` (545 to 696) or `createStaveLib` |
