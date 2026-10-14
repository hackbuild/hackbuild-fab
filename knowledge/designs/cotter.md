# COTTER: how it is made

Record written 2026-10-05 from the original code. Slug `cotter`. Family kits-cotter (COTTER, SPARGER W, GUSSET).

Number rules for this file. A number in a table row that names a code location is a declared value copied from that file and line. "Computed" means rerun on 2026-10-05 on this Mac: the hook rule by a Python copy of `GEO.hookRule`, the insertion proof by `tools/hook_fit.py verify` under `uv run --with shapely` (shapely 2.1.2), strains by the cantilever formula `3 t d / (2 L^2)` from the canon (`docs/plan/CANONS.md` line 404). "Measured" comes from the gold drive of the shipped page on 2026-10-05 (`fab-knowledge:sources/gold/cotter.md` section 2) or the drive in this folder. "Inferred" is a reading of the code with no run behind it. "Stated" quotes the owner's README or UI copy.

Short paths: `F` is `fab-knowledge:originals/cotter/files/`, `SRC` is `F/cotter-src/src/`, `TOOLS` is `F/cotter-src/tools/`, `TEST` is `F/cotter-src/test/`. Line numbers are lines of those files; the files use long lines, so one line often holds a whole builder.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | COTTER bench, "a pegboard welcome wall for HeatSync Labs. plan it, print it, cut it, hang it." (stated, `SRC/part1.html` header) |
| owner's slug | cotter |
| canonical file | `F/cotter-r5.html` (copied from `fab-work-directory:cotter (5).html`) |
| sha256 | 9067ce3e7b0862579168b8f2e1ffdb89e44d4ddacb94b40c38c2af7614b38ffc |
| bytes | 2135323 |
| date | 2026-09-24 16:19 (file mtime) |
| source | `F/cotter-src.zip` sha256 ad9951cb1801be2206e7186393989cb0ddf7c588d0ca428e4c900f50c40c9b0e, entries dated 2026-09-20 16:00 to 2026-09-24 15:18, unpacked at `F/cotter-src/`; every app script block in r5 is byte identical to `src/` (checked by extraction, `fab-knowledge:sources/latest/cotter-sparger.md` line 23) |
| runtime | single file, offline from `file://`: three.js 0.128, JSZip 3.10.1, manifold-3d 3.5.3 as a classic script with base64 wasm, qrcode-generator 2.0.4, four fonts, HSL marks and label faces as outlines, a DXF skeleton, orca3mf.js (`F/cotter-src/package.json`, `TOOLS/build.py`) |
| brands | app chrome hack.build; product geometry, paper and filament defaults HeatSync Labs (GANTRY) |

### 1.1 Every revision found

| file | date | bytes | sha256 | notes |
|---|---|---|---|---|
| `~/Downloads/cotter.html` | 2026-09-20 19:27 | 2038727 | 89b45b055dc9bbf0037243ac6da6f885a57492338b40f16362b1e1c93d253302 | r0: rail clips only, no plate packer, no DXF |
| `~/Downloads/cotter (1).html` | 2026-09-20 19:56 | 2055992 | c16c5ebe70b6a179e915ec972b790994e4aa242e689bf87495f249b9a9a72e72 | r1: metal hook mount (through slots, ears, tunnels), `platePlan()` and the plates view |
| `~/Downloads/cotter (2).html` | 2026-09-20 23:16 | 2092202 | 071103489b58bb86ce9fbfc8ee9005759edb1fd9e2834bbbc33570c31ebb4491 | r2: laser joints press, click, glue; laser QR, shelf, bin, sheet pocket; DXF AC1024; `cotter (3).html` is the same bytes |
| `~/Downloads/cotter (4).html` | 2026-09-24 14:53 | 2125035 | 8debe6e454f7ef8d982ee1fd21a1926427d82b4ac4a107f06483a1be8713cc40 | r4: `modules2.js` displays (dial, week, emblem, ledge, spinner, laser twins), long hooks counted apart |
| `fab-work-directory:cotter (5).html` | 2026-09-24 16:19 | 2135323 | 9067ce3e...b38ffc | r5, canonical |
| `fab-work-directory:cotter-src.zip` | entries to 2026-09-24 15:18 | 160205 | ad9951cb...c9b0e | source of r5 |
| owner kits in `~/Downloads/cotter-kit_*` | 2026-09-20 to 09-22 | | listed in `fab-knowledge:sources/downloads/dl-pip-latest.md` lines 266 to 271 | made by r0 and r2; not copied (older geometry) |

### 1.2 Why this revision

r5 is the newest and the best. The gold drive on 2026-10-05 found 0 console errors and 0 page errors on every normal path at 1280 x 860 and 390 x 844 (measured), every template builds, every kit exports (measured, gold note section 2.2). The r4 to r5 diff is a physical correction found by looking at the 3D wall: a metal hook's leg lies on the board face, so every hook-mounted part now stands off by the wire (`HOOK_OFF = 2 * HOOK_R + 0.1`, `SRC/modules.js` line 64) and gets two 8 x 8 feet so it hangs square; hang style became per part (`HANG_F`), and the thumbwheel dial became the DRUM with a paper wrap strip. Nothing regressed between r4 and r5 (gold note section 1.2).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `cotter-r5.html` | the shipped bench |
| `cotter-src.zip`, `cotter-src/` | `src/` (part1.html, geo.js, modules.js, modules2.js, kit.js, app1.js, app2.js, app3.js), `tools/` (build.py, prep_assets.py, hook_fit.py, audit_stl.py, audit_dxf.py, print_audit.py), `test/` (16 scripts), `assets/` (hsl_marks.json, hsl_fonts.json, dxf_template.json), package.json |
| `exports/full-welcome/` | from the gold FULL WELCOME kit made by r5 on 2026-10-05: `x36_rail-clip.3mf`, `x01_header-sign-232mm.3mf` (three-colour flush inlay), `x01_coin-rail-x4-44mm-challenge-coins.3mf`, `x01_insert-waiver_108x140mm.svg`, the README card, `layout.json` |
| `exports/displays/` | from the gold DISPLAYS kit: drum box, drum words, axle pin, spinner base, wheel, knob 3MFs, the drum wrap strip SVG, README card |
| `exports/laser/` | from the gold LASER kit: laser bin SVG and DXF, laser shelf SVG, README card |

Hashes: `fab-knowledge:originals/cotter/SHA256SUMS`.

---

## 2. What it makes and for whom

HeatSync Labs turns its welcome table into a wall on a rolling 2 x 6 ft pegboard. A member who runs the front of the lab picks a starting layout, drags parts hole to hole on a 3D board (side A for visitors, side B for members), styles them, and downloads one zip. The zip mixes four processes: multicolour or single colour FDM prints, laser plywood and acrylic (SVG and DXF), paper inserts, and a count of metal hooks from the drawer. Every file name starts with how many to make.

Every printed part hangs on one printed RAIL CLIP that fits 1/4 in pegboard, or on standard 1/4 in metal hooks. Laser parts hang on two hooks.

Default board (`SRC/app1.js` lines 4 and 8): 24 x 72 holes, hole 6.35, thickness 6.35, pitch 25.4 fixed, bottom edge 170 mm above the floor (`BOARD_LIFT`, "from the rolling base in the photos").

Material slots (`SRC/modules.js` line 12, `SRC/app1.js` lines 5, 6, 9):

| slot | name | role (stated, `SRC/app3.js` line 47) | default |
|---|---|---|---|
| 1 | ink | flames, arrow, type, dark bodies | PETG #15120F |
| 2 | bone | light plates, art on dark bodies | PETG #ECE3D3 |
| 3 | sun | the sun disc, amber plates | PETG #F99A1C |
| 4 | plywood | laser plates (preview only) | #d9b77e |
| 5 | clear acrylic | windows (preview, opacity 0.28) | #cfe8f2 |
| 6 | etch | laser etch pocket (preview) | #3b2a1c |
| 7 | paper | inserts (preview) | #f4efe3 |
| 8 | steel hook | metal hook preview | #b9bec6 in the legend (`SRC/app1.js` line 6); the 3D material is #c9ced6 with metalness 0.25 (`SRC/app2.js` line 9) |

Templates (`SRC/app1.js` lines 16 to 52): TODAY (mono, clips, laser sign plus six prints), TODAY ON METAL HOOKS, DISPLAYS (emblem, three drums, week board, phone ledge, spinner, laser emblem, laser week, laser dial), FULL WELCOME (21 parts, multi), LASER AND METAL HOOKS, BOTH SIDES (planned so no hook tail lands under a part).

---

## 3. Shots

Seven from the gold drive (headless Chrome, 1280 x 860, 2026-10-05), one from `fab-knowledge:originals/cotter/drive/drive.mjs` (same browser, same day). All in `fab-knowledge:originals/cotter/shots/`.

| file | caption |
|---|---|
| `d21-cam-eye-full.png` | FULL WELCOME at EYE LEVEL: camera at 1500 mm, 1.5 m back. The real lockup sign, the amber word strip, a QR tile and three card frames whose paper inserts are textures drawn by the exporter, the sheet rails holding the ABOUT THE LAB page, bins with seeded cards, shelves with seeded objects, coin rail with coins. Pink eye-height ticks either side of the board. |
| `d27-focus-sign-multicolour-inlay.png` | HEADER SIGN close-up after a double click: bone plate, ink lockup and sub line, sun disc, all flush inlays in one print. Selection box pink. Inspector shows width 232 with range plus number box plus unit. |
| `d03-step1-board-hole6-tb4.8-fits-open.png` | Step 1 BOARD with hole 6 and board 4.8: THE CLIP readout solves rod 5.05, bend radius 7.78, sweep 63, locks 5.6 above the hole, reaches 10.4 behind (computed by the page). Fits fold open. The readout labels sit a row below their values (flaw F2 in section 6.9). |
| `c02-days-drum-from-behind-clips-and-axle.png` | DISPLAYS, the two-digit DAYS SINCE LAST INCIDENT drum box from behind with the board hidden: two RAIL CLIPS (bent round rod hook at the top, locating stub one pitch below, spine) sit in the dovetail slots cut straight into the 5.4 mm back plate. The drum box gets no rib: `mountBack` adds one only where the back is thinner than `WALL` (`SRC/modules2.js` line 49 passes `zb = spineD`, so `zB - sd` is 0). Neighbouring parts show the same clips. |
| `d33-focus-drum.png` | The TONIGHT drum box (words drum behind the window, header with the mark) above the paper-strip variant; emblem and week board beside. |
| `d33-focus-spinner.png` | SPINNER: open wheel of eight wedges with radial ink rules, fluted knob on the boss, pointer above, header MAKE SOMETHING. Laser dial and laser week board on hooks beside it. |
| `d36-hooks-bin-tunnels-long-hooks.png` | Hook mount: a bin with the prongs of two metal hooks entering the gabled tunnels under its floor, so the hooks carry the load; seeded cards inside. |
| `d24-cam-plates-iso-full.png` | PLATES view: five 256 x 256 beds from `platePlan()`, every copy of every print in print pose, rail clips nested in rows, a VT323 label per bed ("PLATE 4 OF 5 32 PARTS all filaments"). Labels overlap parts (flaw F13). |

---

## 4. Build pipeline and code map

| step | where | what |
|---|---|---|
| bake | `TOOLS/build.py` lines 1 to 25 | reads `part1.html`; replaces the cdnjs three and jszip tags with inlined copies (asserts exactly one match each); removes Google Fonts links, prepends five `@font-face` rules with base64 woff2; turns `manifold.js` ESM into a classic script (`import.meta.url` to `""`, `export default Module;` to `globalThis.ManifoldModule=Module;`); embeds the wasm as `MANIFOLD_WASM_B64`; appends blocks in order wasm, manifold, qrcode, HSL_MARKS, HSL_FONTS, DXF_TEMPLATE, orca3mf.js, geo, modules, kit, modules2, app1, app2, app3; asserts no U+2014 or U+2013 in any source |
| asset prep | `TOOLS/prep_assets.py` | offline, once: samples the traced HSL mark and lockups and the GANTRY woff2 faces into rings (section 5.7) |
| boot | `SRC/app3.js` lines 173 to 190 | wait for fonts or 2.5 s, decode wasm, `GEO.init`, `setFonts`, `setMarks`; on failure the guide reads "the geometry kernel failed to start"; then `VIEW.init`, bind params, palette, refresh, first undo snapshot, `BENCH.ready = true` |
| kernel wrapper | `SRC/geo.js` | section 5.1 |
| modules | `SRC/modules.js` (printed, laser, joints, mount helpers, exports `MODKIT`), `SRC/modules2.js` (displays) | sections 5.2 to 5.15 |
| exporters | `SRC/kit.js`, `SRC/app3.js` lines 68 to 167 | section 5.16 |
| state, cache, checks, plates, BOM | `SRC/app1.js` | sections 5.16, 5.17 |
| view | `SRC/app2.js` | section 6 |
| UI, undo, kit, hook | `SRC/app3.js` | section 6 |

Script order matters: `modules2.js` reads `root.MODKIT` that `modules.js` exports; `kit.js` sits between them and reads `root.GEO` lazily.

The module contract (`SRC/modules.js` lines 1 to 8, `finish` lines 43 to 52): every builder runs inside `GEO.scope` and returns plain data `{parts [{name, slot, mesh, print}], prints [{key, name, orient, slots, note, qty}], laser [{name, material, T, cut, engrave, light, score, w, h, qty}], clips [[dx, dy]], hooks [[dx, dy]], rect, depth, paper, props, assembly, files, warn}`. Offsets are from the anchor hole, the upper hole of the left clip or hook. `rect` and `depth` come from mesh bounds. Every builder takes `env()` (`SRC/app1.js` line 12): `joint, mount, hole, tb, pegFit, slotFit, spineD 3.0, oddSpan (cols even), mode, deboss 0.6, laserT, kerf, acrylicT`.

Frame (`SRC/geo.js` lines 1 to 4): X right along the board, Y up, Z out of the board toward the visitor; board front face Z = 0, board occupies Z in [-tb, 0]; mm.

---

## 5. Mechanisms, circuits and constructions

There is no circuit in COTTER.

### 5.1 Kernel discipline (`SRC/geo.js`)

What it does: makes manifold-3d safe to call hundreds of times per minute in a browser and keeps coplanar faces exactly coplanar.

| item | rule | location |
|---|---|---|
| tolerances | `setMinCircularAngle(8)`, `setMinCircularEdgeLength(0.35)` | line 13 |
| pool | every method of `Manifold` and `CrossSection` (prototype and static) is wrapped so any returned kernel object is pushed onto `POOL` | lines 14 to 20 |
| `GEO.scope(fn)` | records the pool length, runs fn, then deletes every kernel object made inside, newest first; builders return plain data only | line 24 |
| dyadic snap `q(v)` | `Math.round(v * 1024) / 1024` on every coordinate entering the kernel; dyadic values add and subtract exactly in float64 and survive float32 STL, so faces meant to be coplanar stay coplanar | lines 26 to 28 |
| `poly(pts)` | signed area, reverses a clockwise ring (a clockwise ring is empty under the Positive fill rule) | lines 31 to 32 |
| `profileX(ptsZY, x0, x1)` | side profile drawn as [z, y], extruded along X with an exact axis swap matrix | lines 44 to 45 |
| `profileY(ptsXZ, y0, y1)` | plan section drawn as [x, z], extruded along Y | lines 46 to 47 |
| `capsule(a, b, r, n)` | hull of two spheres, default 28 segments | line 48 |
| `layFlat`, `standSide` | exact permutation matrices for laser plates, no trig | lines 49 to 51 |
| `GEO.mesh(m)` | `simplify(0.002)` first (removes zero-area triangles along straight edges with collinear vertices such as a row of glyph feet; keeps a subset of vertices, so snapped coordinates stay snapped), then positions, indices, volume, area | lines 54 to 58 |

Port lesson: the build cache plus scope plus pool is the working answer to "manifold does not garbage collect". The dyadic snap conflicts with the plan's 6-decimal snap; a decimal grid does not survive float32 (`fab-knowledge:sources/latest/cotter-sparger.md` section 5 conflict 1).

### 5.2 The peg hook rule and the RAIL CLIP (`SRC/geo.js` lines 99 to 128)

What it does: a printed clip that hooks into 1/4 in pegboard and carries a dovetail rail every printed part slides onto. The hook is a bent round rod, and its bend radius is solved from two caliper numbers so the arc clears the bore.

Closed form (`GEO.hookRule`, lines 100 to 106, identical to `TOOLS/hook_fit.py` `design_full`):

```
d  = round(hole - fit, 2)                       fit = pegFit, default 0.95
Rb = d/2 + 1; Rb += 0.25 until
     inner = Rb - d/2 > tb/2  and
     h = (Rb + d/2) - sqrt(inner^2 - (tb/2)^2) <= hole - margin        margin 0.35
sweep s = 20 deg; s += 1 until
     Rb (1 - cos s) + ext sin s + d/2 - hole/2 >= rise                  rise 5.5, ext 2, cap 88
gap = 0.6 (the rod run starts tb + 0.6 behind the face)
locks above hole = Rb (1 - cos s) + ext sin s + d/2 - hole/2           (UI.clipReadout, SRC/app3.js line 24)
reach behind     = Rb sin s + ext cos s + d/2
```

Solved values (computed 2026-10-05 with the formula above):

| hole | board | rod d | bend Rb | sweep deg | locks above hole | reach behind |
|---|---|---|---|---|---|---|
| 6.35 | 6.35 | 5.40 | 11.45 | 52 | 5.50 | 12.95 |
| 6.35 | 4.80 | 5.40 | 7.95 | 62 | 5.51 | 10.66 |
| 6.35 | 3.20 | 5.40 | 5.20 | 77 | 5.50 | 8.22 |
| 6.00 | 6.35 | 5.05 | 11.275 | 53 | 5.61 | 12.73 |
| 6.00 | 4.80 | 5.05 | 7.775 | 63 | 5.55 | 10.36 |
| 7.10 | 6.35 | 6.15 | 11.825 | 52 | 5.65 | 13.62 |
| 7.10 | 4.80 | 6.15 | 8.325 | 61 | 5.56 | 11.33 |
| 6.35 | 4.10 | 5.40 | 6.70 | 68 | 5.57 | 9.66 |

The last row is the board of the owner's first kit (`board.tb` 4.1 in its `layout.json`, `docs/plan/milestones/M02-sim.md` line 428). The 12.95 reach at the default board is the "about 13 mm out the back" behind the tail clash check (section 5.17).

Geometry, step by step:

1. `hookRod(env, y0)` (lines 108 to 113): side plane (z, y), into the board is -z. Points: start at (0, y0, z0) with z0 = -(tb + gap); 10 arc points at angle `sweep * k / 10` about the centre (y0 + Rb, z0), each `[0, cy - Rb cos a, z0 - Rb sin a]`; a tail point `ext` along the tangent. A capsule of radius d/2, 24 segments, joins each consecutive pair starting from (0, y0, 1.5) in front of the face; union.
2. `stubRod(env, y0)` (line 114): a capsule from z 1.5 to `-(min(tb, 5) - r)` one pitch below (y0 = -25.4), the locating stub.
3. `GEO.RAIL` (line 115): `neck 4.0, head 8.0, neckD 0.8, headD 2.0, spineW 8.0, pegT 5.0, off 1.5, below 7.0`. `railLen = 25.4 + 7.0 + d/2` (line 116), 35.1 at default (computed).
4. `railClip(env)` (lines 117 to 128): pegs = union(hook, stub) intersected with a 5.0 mm slab (`pegT`) centred on the hole, so both pegs print flat on the bed when the clip lies on its side and the layers run along the hook, the strong direction. Spine: box 8 wide from y = -25.4 - 7 to the rod top, depth `spineD` 3.0. Neck: box 4 wide, 0.8 deep in front of the spine. Head: hull of two trapezoid sections (neck width at the neck face widening to the head width 8 at depth 2.0), a straight run from the bottom to 3.0 below the top, then a second hull narrowing by 0.7 over the last 3.0 mm as a lead-in. The rail centre sits `off` 1.5 mm right of the hole centre so the pegs can print flat; every part accounts for it (`slotXs = [off, nP + off]`, `SRC/modules.js` line 19).
5. `pegHook(env, len)` (lines 129 to 133): the printed stand-in for a metal hook: the same hook and stub, a prong capsule rising 6 deg over `len` with a 4.5 mm upturned tip, a 3.2 deep spine, all cut to the 5 mm slab.

Fits and print: `pegFit` 0.95 (range 0.5 to 1.6) and `slotFit` 0.2 (0.1 to 0.5) in the BOARD fits fold (`SRC/part1.html` lines 221 to 229). Prints on its side, pegs flat on the bed, no supports (`SRC/kit.js` line 7). Fit test first: one clip and one WORD STRIP; clip too tight in the hole, raise peg under hole; strip too tight on the clip, raise slot clearance by 0.05 (stated, `SRC/app3.js` README lines 116 to 119). The clip in the FULL WELCOME kit is 26 x 41 x 8 mm, 2.1 g (measured from the README card, `F/exports/full-welcome/README.txt`).

Known limits: the UI number boxes have no min or max, so a typed hole of 12 mm is accepted and solved (gold flaw F1). The proof (section 5.3) covers seven hole and board pairs only; the JS ships the closed form for any input.

### 5.3 The insertion proof (`TOOLS/hook_fit.py`)

What it does: proves the clip can actually go into the board, by configuration space search, for the listed sizes.

Argument (docstring, lines 2 to 5): a round rod in a round hole reduces exactly to discs in the mid plane, because the nearest point of the bore to a sphere centred on the mid plane lies in that plane, so the 2D side view is the whole problem.

Construction:

1. `hook_centreline` (lines 13 to 25): run from x 2.0 to -(tb + gap), 24-step arc of radius Rb, tangent tail of length ext.
2. `clip_poly` (lines 27 to 37): shapely buffer of the centreline by r, stub one pitch below buffered by r, spine box; unary union. The spine box runs from the board face to `spine_d + 2.8` = 6.8 mm (default `spine_d` 4.0), a stand-in for the JS spine, neck and head (3.0 + 0.8 + 2.0 = 5.8); the proof is therefore 1.0 mm conservative on the part in front of the face (computed from line 34 and `SRC/geo.js` line 115).
3. `board` (lines 39 to 42): boxes between hole rows -3 to 3 at 25.4 pitch, buffered -0.01 and prepared.
4. `search` (lines 44 to 71): best-first over states (tilt t in 1 deg steps, x and y in 0.2 mm steps) from the seated pose; 11 neighbour moves; priority `-minx - 0.02 tilt` (prefer leaving the board, then tilting); success when the clip's min x clears the face by 0.5; limits tilt 0 to 100 deg, x -12 to 40, y -25 to 25; budget 250000 poses. It searches extraction from the seated pose, which is insertion reversed.
5. `design` (lines 81 to 91, default margin 0.2) and `design_full` (lines 93 to 100, margin 0.35) are the Python twin of `GEO.hookRule`; `verify_all` (lines 102 to 108) runs seven pairs through `design_full` then `search`; exit 1 if any is trapped (line 110).

Rerun 2026-10-05 (computed, 4.4 s wall measured; rerun again by the checker the same day under `uv run --with shapely`, 0.42 s wall, identical output): 7 of 7 INSERTS; poses to clear 106, 92, 106, 100, 93, 110, 92; max tilt 57, 72, 82, 56, 72, 57, 72 deg, in the order of the table in section 5.2. The milestone record adds a sharp-bend case (rod 5.40, Rb 6.0, sweep 52 on hole 6.35 board 6.35) that comes back TRAPPED (computed, `M02-sim.md` line 86): the reason the hook is an arc and not an L.

### 5.4 The dovetail slot with keyhole entry (`SRC/geo.js` lines 134 to 144, `SRC/modules.js` lines 36 to 42 and 156 to 157)

What it does: the female half of the rail. Cut into each printed part's back; the part is offered so the clip heads enter wide pockets, pushed to the board, and slid down until it stops on the rail top.

`GEO.slotCutter(env, slotX, yStop, zBack)`:

1. clearance `c = slotFit`; flank offset `c * sqrt 2`; depth `neckD + headD + 0.2 = 3.0`; half neck `hw = neck/2 + c`; `dn = max(0.2, neckD + c - fl)` is where the offset flank meets the neck wall.
2. dovetail: a six-point section `[slotX +- hw at zBack - 0.05], [+-hw at zBack + dn], [+-(hw + depth - dn) at zBack + depth]`, extruded along Y by `profileY` over length `L = railLen + 1.0`, ending at `yStop = d/2` (the slot stops where the rod top is, `SRC/modules.js` line 18).
3. entry pocket below: box of half width `pw = head/2 + c + 0.4`, from `y1 - (L + 1.5)` up to `y1 + 0.6` (it laps 0.6 up into the dovetail), full depth.
4. ramp: hull from the pocket width at `y1 + 0.6` to `hn = hw - 0.6` at `y1 + 0.6 + (pw - hn)`, so "no face of one piece ends exactly on a face of another" (comment line 141).
5. union of the three; the caller subtracts it.

Where a dovetail is cut the back must be `WALL = 5.4` thick (`SRC/modules.js` line 14). `mountBack` (lines 37 to 42) adds a 16 mm wide rib behind any thinner body from the pocket bottom minus 3 to the slot stop plus 4, then subtracts every cutter. `mountRibs` (line 157) adds full-height 16 mm ribs on upright bodies (bins, shelves, coin rails, sheet rails, phone ledge) so the rear wall itself stays thin.

`clipCols(env, W, max, margin)` (line 22): span in columns `clamp(floor((W - 26) / 25.4), 1, 9)`; for n >= 3, drop one column when its parity does not match `oddSpan`, because on a board with an even hole count only an odd span can sit dead centre. `spanUp` (line 69) rounds up instead.

`plateSeat(env, W, H, band)` (lines 70 to 74) is the one seam every flat part uses: on clips the top is the slot stop plus 5, the back plane is `spineD + WALL - 3`; on hooks the top is 12 above the anchor, a `band` (default 20) holds the hang slots, the back plane is `HOOK_OFF`. It returns `mount(body)` that applies either the hook slots and feet or the dovetails.

### 5.5 Hook mount: hang slots, tunnels, feet and stand-off (`SRC/modules.js` lines 57 to 69, 206 to 214)

What it does: the same parts hang with no printed clips on standard 1/4 in metal hooks (or the printed PEG HOOK), polymorphic over one seam.

| constant | value | meaning | location |
|---|---|---|---|
| `WIRE` | 3.2 | prong wire the tunnels are sized for | line 62 |
| `TUN.apex` | `WIRE * sqrt 2` = 4.525 (computed) | gable apex height | line 62 |
| `TUN.half` | 3.8 | tunnel half width | line 62 |
| `TUN.bot` | apex - half - 7.0 = -6.275 (computed) | tunnel bottom | line 62 |
| `HOOK_R` | 2.25 | metal hook wire radius (4.5 mm wire) | line 64 |
| `HOOK_OFF`, `LZ` | `2 HOOK_R + 0.1` = 4.6 | stand-off: the hook's vertical leg lies on the board face | line 64 |
| `HANG(x, y)` | obround 7.2 x 11.2 centred 2 below the hole | through slot, wire sits in its top | line 214 |
| `feet()` | two 8 x 8 boxes at the bottom corners, moved clear of hook columns (4 mm) | the part hangs square instead of leaning back | line 66 |

Construction: `hangHoles(xs, z0, z1)` (line 67) slabs the HANG obrounds through the plate; `tunnel(x, z0, z1)` (line 68) slabs a five-point gable (45 deg roof so it prints upright) through the whole depth. Bins, shelves and coin rails choose per part (`HANG_F`, line 65): `tab` (slots in a back tab that rises 22 mm above the sides so the prongs sit above the pocket and clear of a hand; short hooks) or `tunnels` (two gabled tunnels under the floor or inside 18 mm end skids; long hooks carry the load). Long hooks are counted apart in the BOM ("straight prong, 50 mm or more: these carry the load", `SRC/app3.js` line 58; `longHooks`, `SRC/app1.js` line 112).

Metal hook preview (`metalHook`, lines 206 to 210): five capsules of r 2.25: the prong out of the upper hole to `len` (25 short, 50 long), an upturned tip, a tail rising behind the board, a stub into the lower hole, and the leg lying on the board face from the upper to the lower hole. Drawn at every hook position from the same offsets the BOM counts.

Failure lesson: before r5 parts on hooks were modelled 1.0 mm off the board and leaned; the 3D wall showed it (section 1.2).

### 5.6 Flush inlay, single colour deboss and the two-piece mark (`applyArt`, `SRC/modules.js` lines 24 to 35)

What it does: puts art into a printed body either as flush inlays on their own filament slots (multi, one pass on a toolchanger) or as a 0.6 mm deboss of the ink pieces (mono, any printer).

Construction:

1. Body slot by ground: `light` bone body with ink art, `dark` ink body with bone art, `amber` sun body with ink art and the disc dropped.
2. Collect `ink` items and `sun` items (none on amber). `ink = union(ink).offset(-HAIR, Miter)`; `sun = (union(sun) - union(ink)).offset(-HAIR, Miter)`, so ink always wins where they meet. `HAIR = 0.02` so shapes that touch at a point (QR corners, a flame tip on the disc) never leave a pinched edge.
3. mono: subtract `slabZ(ink, zFace - deboss, zFace + 0.5)` from the body; the sun disc is the substrate (the single-colour rule for the mark). Return.
4. multi: depth ink `dark ? 1.2 : 0.72`, sun `dark ? 1.2 : 0.96`; upright bodies pass 1.0. For each piece: `solid = slabZ(c, zFace - d, zFace).intersect(body)`; `body -= solid`; keep `solid` as its own part on its own slot.

The mark is always two pieces: flames and sync arrow in one colour, the sun disc in another (README, `SRC/app3.js` lines 154 to 157). `silhouette(mk)` (`SRC/modules2.js` line 16) is flame plus disc with only outer rings kept, holes filled; EMBLEM uses it for relief.

Limit: CHK-3MF-04 in the plan says a 1 um inset by true edge normal; COTTER needs 20 um Miter to split corner-touching QR modules. The check needs two numbers (cotter-sparger.md section 5 conflict 2).

### 5.7 Type, mark, lockup and QR as outlines (`SRC/geo.js` lines 60 to 97, `TOOLS/prep_assets.py`)

What it does: every label and the real HeatSync mark are polygon rings in the kernel and in the SVGs, so no font is needed in any export.

- `GEO.text(str, o)` (lines 63 to 72): glyph rings from `HSL_FONTS[font]`, scale `cap / F.cap`, tracking in em, optional `maxW` shrink, align left, center or right; kerning skipped on purpose (labels are tracked caps). `GEO.wrap` (line 74) greedy word wrap.
- `GEO.mark(size, cx, cy, anchor)` (lines 81 to 82): the mark in its 1000-unit box, placed by optical centre `inkC` (default), disc centre `discC`, or box centre; returns `flame`, `disc`, `sun`.
- `GEO.lockup(kind, w, cx, cy)` (lines 84 to 86): horizontal or stacked lockup scaled to width w, mark placed by the recovered `markX, markY, markS`.
- `GEO.qr(text, size, cx, cy, ecl)` (lines 93 to 97): qrcode-generator matrix, dark runs per row merged into rectangles, unioned; the quiet zone is the caller's job.

Asset prep (`TOOLS/prep_assets.py`, run once offline): source of truth the hsl-forge logos (traced from `public/hsl-logo.png` in heatsynclabs/new-hsl) and woff2 faces. Mark: sample every subpath at 6 points per curve segment (svgpathtools), combine rings even-odd by symmetric difference (shapely), assert the first fill is #F99A1C, split into `sun`, `flame`, and `disc = sun - flame.buffer(0.01)`; simplify at 0.9 in a 1000 box, drop rings under 8 units area, orient outers CCW, flip to y up; anchors `discC [402.9, 531.7]`, `inkC [459.5, 521.0]`. Lockups: recover the mark transform from nested SVG transforms, flatten the wordmark at 10 points per curve. Fonts: Archivo 800, IBM Plex Mono 600, Instrument Sans 500 via fontTools `DecomposingRecordingPen`, 6 points per segment, even-odd, simplified at upm/500, stored per char 32 to 126 with `upm`, `cap` 686, 698, 720 (declared values summarised in cotter-sparger.md section 1.14).

Brand swap today means regenerating both JSONs and hand-editing `KIT.COPY`, `KIT.URLS`, the palette `C`, the address and default slots. No brand-pack contract exists (gap).

### 5.8 Printed wall parts (`SRC/modules.js` lines 76 to 203)

Each builds a body with `G.box`, `profileX` or `profileY`, applies the mount seam, then `applyArt`, then `finish`. Declared values and steps:

| part | construction | key values | pose | lines |
|---|---|---|---|---|
| HEADER SIGN | plate W x (10 + lockup height + sub line + 10) via `plateSeat`; horizontal lockup at width W - 20; sub line in Plex 4.4 cap tracked 0.2 | W 140 to 248, default 232 | face down | 76 to 82 |
| MARK PLATE | square plate; mark at 0.76 of the size centred on its ink | 70 to 200 | face down | 84 to 88 |
| WORD STRIP | 32 tall; Archivo cap 11 tracked 0.03; optional 26 mm mark; on hooks the prongs pass through the two ends and the words sit between | W clamp(text + mark + 26, 90, 246) | face down | 90 to 99 |
| QR TILE | 100 wide, 76 code; headline, QR, small mark, caption; warns when module < 1.9 mm and in mono | Q 76 | face down | 101 to 111 |
| CARD FRAME | back plate `cw + 1 + 2 * 5` wide; two side profiles with a 1.4 gap and 2.4 lip (`profileY`), a bottom band 16 tall (`profileX`); 11 mm radius thumb notch at the top; paper insert at `z1 + 0.4` | cards quarter letter, half letter, 4 x 6, 5 x 7 (line 113); wall 5, band 16, gap 1.4, lip 2.4 | on its back | 113 to 127 |
| SHEET RAILS | top and bottom rails, profiles with a channel `g` (default 3.4) for a full page; top channel deeper by `delta` so the page lifts, swings in and drops; on hooks each rail grows an ear, top ear up and bottom ear down, so the prongs clear the page; warns when rails exceed 250 mm | lift 6, lipB 5, lipT 14, tongue 40 | top upside down, bottom upright (clips) | 129 to 155 |
| BIN | profile with front slope; inner pocket subtracted; wall 2.0, front 2.4; label cap clamp(0.26 x label height, 5, 11); presets stickers, cards, flyers, freebies | `BINS` line 159 | upright | 159 to 174 |
| DISPLAY SHELF | deck 3.0, back upstand 44, lip 14 (18 with tunnels), two 2.4 cheeks; with tunnels two 18 mm end skids carry the prongs | width 4, 6, 8, 9 in | upright | 176 to 187 |
| COIN RAIL | base 11 (14 with tunnels) with a groove `thick + 1.0` wide, 5 deep, set back by `dia sin 12 deg` so coins lean 12 deg on the back wall; back height `max(44, 0.72 dia + base)`; with tunnels warns when fewer coins fit between skids | coins 1 to 5, dia 25 to 60, thick 1.5 to 6 | upright | 189 to 199 |
| PEG HOOK | `GEO.pegHook` | prong 20 to 90 | on its side | 201 to 203 |

Props (seeded preview contents, `SRC/app2.js` lines 48 to 57) come from each part's `props` field: cards in bins, objects on shelves, coins leaning in the groove at the part's own lean, a phone in the ledge. They never export.

### 5.9 DRUM with a printed leaf-spring detent (`SRC/modules2.js` lines 38 to 65)

What it does: an eight-sided (or N-sided) word or digit drum in a hand-sized box. The visitor rolls it with a thumb where it shows below the window; a leaf spring printed into the box presses on the bottom flat and clicks the drum onto each face (stated, blurb line 38 and assembly line 65).

Geometry, step by step:

1. Options: `parseList(p.options)` split on `|`, padded to at least 2; N = count. Presets (line 29): TONIGHT 8 words, DAYS SINCE LAST INCIDENT two digit drums of 0 to 9, MAKE SOMETHING 8 words.
2. Drum section: `R = 22`; `rIn = R cos(pi/N)` (flat distance); `fw = 2 R sin(pi/N)` (flat width). For N = 8: rIn 20.325, fw 16.84; for N = 10: rIn 20.923, fw 13.60 (computed).
3. Box (line 44), all rooted on the back plate so it prints on its back and the front pieces bridge cheek to cheek: back plate (thickness 5.4 on clips, 3.0 on hooks), two 2.4 cheeks, a 2.4 top wall, a front band above the window, a 4 mm rail below it. The window runs `fw + 2` tall around the drum axis. Axis height above the back plate `zc = zb + tb + 2 + R`.
4. Leaf spring per drum (lines 46 to 47): a wall 1.4 thick (y) and up to 12 long (x from `xd + 2` to `min(xd + 14, xd + len - 2)`), rising from 0.5 inside the back plate to the axis height `zc`, with a capsule of radius 0.7 along its top edge. Its top edge sits at `yBl + 0.7 = cy - rIn + 0.3`, so it is pressed 0.3 mm into the drum's bottom flat.
5. Axle bore through the box: capsule radius 1.65 along X (line 48).
6. Mount: hook slots and feet, or `mountBack` dovetails with ribs (line 49). Header art: the mark left of centred words above the window (line 50).
7. Drum body (lines 53 to 58): N-gon with vertices at `(k + 0.5) 2 pi / N`, extruded along X by `profileX`, bored with a capsule of radius 1.75 (3.5 bore). Each flat gets the option text (Archivo, cap `min(10, fw - 4)` for digits or `min(6, fw - 8)` for words, `maxW = len - 7`; 9.6 on the ten-sided digit drum, 6 on the eight-sided word drum, computed) slabbed from `rIn - depth` to `rIn` and rotated to its face: depth 0.72 multi, 0.6 mono, or a 0.5 recess for a paper wrap strip. Multi keeps the words as a second slot part (bone on ink or ink on bone).
8. Axle pin (line 61): capsule r 1.45 through the box with a head capsule r 3.0; prints on its back. Alternative stated: a 3 mm bamboo skewer or 1/8 in rod cut to `W + 4`.
9. Paper labels: `KIT.drumStripSVG` (`SRC/kit.js` lines 80 to 86) makes a letter page with one wrap strip per drum, N panels of `fw - 2.6` by `len - 6.4` with dashed fold lines; "glue stick, one flat at a time".

Spring numbers (computed with the canon formula, cantilever from the back plate, load at the free edge, L = 2 + R + 0.5 = 24.5, t = 1.4):

| case | deflection | strain |
|---|---|---|
| resting on a flat, preload | 0.3 | 0.105 percent |
| passing a vertex, N = 8 | 0.3 + (R - rIn) = 1.975 | 0.69 percent |
| passing a vertex, N = 10 | 0.3 + 1.077 = 1.377 | 0.48 percent |

Fits: drum bore 3.5 on a 2.9 pin is 0.3 per side; box bore 3.3 on 2.9 is 0.2 per side (declared radii lines 48, 58, 61). Print: box on its back, drum on its end ("standing on its end, the same profile all the way up", `SRC/kit.js` line 7), pin on its back.

Known limits (inferred): the box prints on its back, so the blade wall stands up from the bed and bends with its strain running across the layers; 0.69 percent sits under the plan's 1.5 percent across-layer default (`CANONS.md` line 508) but no coupon has tested it. The click force is not computed anywhere in COTTER; KNURL's count-wheel-detent canon carries the force formula a port needs. The drum length range 24 to 90 does not change the blade length (capped at 12).

### 5.10 SPINNER with a flexure-finger click detent and a press-fit knob (`SRC/modules2.js` lines 67 to 81)

What it does: an open wheel of N wedges (default MAKE SOMETHING, 8) with radial ink rules, a pointer above, and a fluted knob. Flick the rim or turn the knob; a bump on a flexure finger in the base parks the wheel on a wedge (stated, blurb line 67, assembly line 81).

Geometry, step by step:

1. Plate: `plateSeat(env, dia + 18, 22 + 4 + dia + 9.5, 20)`; wheel centre `cx = x0 + 9 + R`, `cy = yA - 22 - 4 - R`; wheel thickness `tw = 3.0`.
2. Flexure finger cut into the base cross section (line 72): `edge = cy - R - 1.4`, `fy = edge - 1.2`, `fx0 = cx - 18`, `fx1 = cx + 2`. Three slots leave a finger 20 long and 2.4 tall, rooted at `fx0` and free at `fx1`: a 1.0 slot below it (`fy - 2.2` to `fy - 1.2`), a 1.2 slot above it (`edge` to `edge + 1.2`), a 1.0 end slot at `fx1`. A clearance pocket 6.4 wide above the finger at the wheel's bottom (`cx +- 3.2`, `edge` to `cy - R + 1.4`).
3. Bump (line 73): a 1.5 radius pin at `(cx, cy - R - 0.9)`, slabbed from the base back to the wheel top, standing on the finger 18 mm from its root; its top reaches 0.6 inside the wheel radius.
4. Boss: cylinder r 4.0 from the base face to `zW1 + 2.6`. Pointer: a triangle above the wheel at `cy + R + 1.2` to `cy + R + 8`.
5. Wheel (lines 75 to 76): disc r R, 180 segments, minus a 4.3 radius bore and N notches of radius 2.2 centred on the rim at `90 + i 360/N + 180` deg. Words per wedge by `wedgeText` (lines 24 to 27): tangential, upright at the top; 1 to 2 characters at `0.62 R`, longer text wrapped at cap 5.4 from `0.84 R` inward in 7.6 steps. Radial rules 0.8 wide between wedges. Inlay or deboss by `applyArt`.
6. Knob (line 78): cylinder r 11 by 8 with eight r 3.2 flutes at radius 12.6, and a blind bore r 3.95 by 2.9 printed upward; pressed over the r 4.0 boss.

Spring numbers (computed, same formula, L = 18 to the bump, t = 2.4, d = 0.6): 0.67 percent strain when a rim land passes the bump. The base prints on its back, so the finger bends in the layer plane (inferred), the strong direction.

Fits: wheel bore 4.3 on a 4.0 boss is 0.3 per side; knob bore 3.95 on the 4.0 boss is 0.05 interference per side (declared, line 76 and 78). Mono warns "the wheel words are cut 0.6 mm into the face. rub paint into them" (line 79). Poses: base on its back, wheel and knob face down.

Known limits (inferred): no click force, no notch depth check against the bump height, and the knob press fit has no coupon.

### 5.11 WEEK BOARD T channels and sliding tiles (`SRC/modules2.js` lines 83 to 97)

Seven day rows, each a T channel cut from the right edge: lower channel 15 tall, `cd` 2.4 deep over a 2.0 back, opening 12 wide through a 1.2 lip (`bt 2.0, cd 2.4, lt 1.2, ch 15, oh 12, rp 20`). Day names in Archivo 6.5. Tiles 63 x 14 x 2 with 1 mm chamfered leading corners, sitting 0.2 above the channel floor, in the opposite ground; the first tile of each label prints, the rest fill rows in the preview. Card strips 62 x 13 on a letter page by `KIT.stripsSVG` (`SRC/kit.js` lines 73 to 79). Prints face down. Assembly: "slide a tile in from the right end of a row, chamfered end first, until it stops".

### 5.12 EMBLEM, PHONE LEDGE and MOUNT PAD (`SRC/modules2.js` lines 99 to 134)

- EMBLEM (99 to 109): round plate (clips: one column of clips so ribs stay inside the circle; hooks: two obround ears 18 x 26). Mark at 0.8 of the size by box centre. Relief at heights: multi light, silhouette 1.4 on bone plate then disc 1.2 above; multi dark, a 3.0 round-offset bone halo 1.0 high, ink silhouette 1.4, disc 1.2; mono, one body. Prints on its back so every layer sits on the one below.
- PHONE LEDGE (111 to 122): profile with a 10 deg tilted ledge `D` deep and a `lip` front; four 3 mm 45 deg cheeks under it so it prints upright and the ledge bridges between them; a 14 wide cable notch. On hooks the slots sit under the ledge so the prongs carry the floor away from the device.
- MOUNT PAD (124 to 134): the mount alone, 46 tall; two M3 or #6 holes (r 1.75 through, plus a countersink cone 1.85 deep opening from r 1.75 to r 3.6 at the face, a 45 deg half angle, so 90 deg included, computed from line 131) chosen as the first pair of `[x0 + 7, x1 - 7]`, `cxm +- 12`, `cxm +- 8` that stays 8.1 clear of every rail column and 4.5 inside the edges, else one vertical pair 24 apart; on clips a 0.4 tape recess on the face with r 5.5 islands left round the holes. On clips it prints on its back (slots to the bed, recess up); on hooks the feet stick out the back, so it prints face down (line 132 comment, line 134). Adapts any object to the wall.

### 5.13 Laser joints: press tooth with crush nubs, click tab with spring prongs, glue (`SRC/modules.js` lines 221 to 244)

What it does: every tenon is drawn once, pointing down from an edge on y = 0 with the part above it, then turned into place by `putTenon(t, 'down' | 'up' | 'left' | 'right', x, y)` (line 237: translate, mirror, rotate -90 or 90). `withTenons` (line 238) unions every tooth and subtracts every slit.

`JT = {barb 0.5, prong 2.6, gap 1.3, root 14, slit 0.3, past 2.4}` (line 226). `k` is `env.kerf` (default 0.15, `SRC/app1.js` line 9).

| style | geometry | lines |
|---|---|---|
| press (default, and click when len < 16) | tooth from `x0 = -k/2` to `x1 = len + k/2` (the tab grows by one kerf), 0.6 lead-in chamfers at the tip, crush nubs 0.15 proud on both flanks between 0.4 T and 0.6 T, 0.5 overlap into the body | 229 |
| click (len >= 16) | a centre tongue between two spring prongs 2.6 wide; each prong runs `T + 2.4` past the edge and carries a 0.5 barb at `T + 0.25`; slits 1.3 beside the tongue and 0.3 outside run 14 mm into the part and end in keyhole circles r 1.0 and r 0.7 so they do not start cracks | 230 to 235 |
| glue | plain rectangle `x0 + 0.1` to `x1 - 0.1` | 228 |

Mortises (lines 239 to 240): `mortiseH` and `mortiseV` shrink the slot by k/2 on every side (slot loses one kerf). Tab +1 kerf and slot -1 kerf in one place matches `knowledge/00-constants.md` and the finger-joint canon.

Box teeth `teeth(a, b, even, k)` (lines 241 to 242): odd count `max(3, 2 floor(H / 22) + 1)`; even or odd ownership; notches narrowed by the kerf; first and last tooth extended 2 mm.

Rules (lines 243 to 244): `rearStyle` (teeth through the back plate) follows the joint; `flushStyle` never clicks; `standoff` is 2.8 for click (barbs stand 2.4 proud, the plate hangs 3 mm off the board) else 1.5; `clearOf` keeps tenons 9 mm clear of hook columns. All teeth entering a back plate point the same way, so the box or shelf is built first and pushed into the back plate in one move (README lines 151 to 152).

Spring numbers: README says "about 0.6 percent strain in 3 mm birch ply" (stated, line 149). The cantilever formula with t = 2.6 and d = 0.5 (the barb, `JT.barb`), loaded at the barb face, which sits `T + 0.25` to `T + 0.85` past the edge, gives L = 14 + 3.25 = 17.25 to 17.85 at T 3.0 and 0.65 to 0.61 percent (computed, agrees with the README). An earlier version of this record used L = 14 + 5.4, which is the prong tip (`T + JT.past`), not the barb, and gave 0.52 percent; that figure is withdrawn. Kerf does not add deflection: the tab grows k/2 per side and the mortise shrinks k/2 per side, so after cutting they meet at nominal and only the barb interferes. Birch ply or acrylic; MDF prongs break (stated).

Fit test: cut one bin first; teeth too tight, raise kerf by 0.03; too loose, lower it (stated, README lines 144 to 146). Sheet thickness is a caliper value: "3 mm ply is often 2.7 to 3.2" (stated).

Proof: `TEST/laser_fit.mjs` assembles each laser part in 3D from its own cut outlines at kerf 0 and measures pairwise plate intersection; the limit is 4 mm3 ("crush nubs are worth about 1 mm3 per tooth; a tooth aimed at solid wood is worth 100+"); for the laser bin the front corner column must be 100 +- 0.5 percent wood. Run for press, click, glue on five parameter sets (section 7).

### 5.14 Prong-carried laser shelf, coin ledge and bin (`SRC/modules.js` lines 261 to 306)

What it does: the plywood only locates; the hook prongs carry the load ("the hooks carry the load, the plywood only locates it", README line 114).

`laserShelf(env, p, coin)` (lines 263 to 278):

1. Span `S = n * 25.4`; back plate `W = cols * 25.4 - 2` wide, from 36 below the hooks to `yDeck + T + up_h` above; two 3.6 radius hook holes.
2. Deck underside at `yDeck = 3.2 + 0.4`, so the deck rests on top of the prongs.
3. Deck teeth length 22 at x = 23 and S - 23, plus S/2 when S >= 170; mortises in the back plate at the same x.
4. Gussets just outside the hooks at -14 and S + 14, depth `min(D - 12, 72)`, height 29; tooth up into the deck (flush style) and tooth back into the plate (rear style); lightening hole r `min(4.5, 0.16 h)` when depth >= 60.
5. Mark and label etched under the deck between the hooks, where nothing on the shelf hides it.
6. Coin variant: deck slots `0.78 dia` long, `thick + 0.6` wide, offset `dia sin 12 deg` so coins lean 12 deg on the back plate.
7. Preview: `layFlat` the deck, `standSide` each gusset, exact permutations.

`l_bin` (lines 285 to 306): walls carry a 6 mm skirt below the floor so the floor slots have meat under them; the skirt is notched 8.8 wide over each prong; front corners box-jointed with the odd teeth on the front and the even on the sides; floor keyed into all four walls; a flat 19 mm shoulder at the back of each side keeps meat around the upper tenon and its spring slits.

### 5.15 Laser sheet pocket, emblem, week board and dial (`SRC/modules.js` lines 308 to 335, `SRC/modules2.js` lines 137 to 170)

- Sheet pocket, lip strips (316 to 326): back plate plus two layers of strips on three sides. The first is a spacer the width of the border `b` (12); the second is the same strip made `lip` mm wider (default 5) so it stands over the page edge. Nine M3 x 12 screws or 1/8 in dowel through 3.2 holes. Coverage readout: `100 (2 (lip - slack/2) sh + (lip - slack/2)(sw - 2 lip)) / (sw sh)`, slack 1.5; warns that a bare sheet bows in a 3 mm channel.
- Sheet pocket, window (327 to 335): back, spacer with the page opening `sw + 1.5` wide, clear acrylic window with a thumb notch of radius 14 (28 across) centred on its top edge, four 3.2 pin holes for M3 x 10 screws or 1/8 in dowel.
- Laser emblem (137 to 143): ply back with the silhouette scored on it (green), black silhouette, amber disc, glued in that order; reports how many disc pieces to keep in place.
- Laser week board (145 to 154): back, spacer that is a comb of 16 mm channels open at the right edge, face with 12 mm windows; strips with a 6 mm hazard pull tab.
- Laser dial (156 to 170): base, wheels on a glued 1/4 in dowel `4 T + 6` long, face with a sector window and an etched rim, scalloped knob (12 scallops r 2.6) and knob spacer; clearance from card washers ("a cereal box, about 0.5 mm"). This is the pivot between sheet parts that declares bought round stock (CHK-ASM-09).

### 5.16 Exporters (`SRC/kit.js`, `SRC/app3.js` lines 68 to 167, `SRC/app1.js` lines 92 to 123)

| export | rule | location |
|---|---|---|
| print pose | one of six exact axis swaps applied to every colour part of a print together, then centred in XY and dropped to z = 0: faceDown (x, -y, -z), upright (x, -z, y), upsideDown (x, z, -y), back identity, side and end (-z, y, x); one slicer sentence per pose | `SRC/kit.js` lines 6 to 13 |
| 3MF | `Orca3MF.build({filaments, title, layerHeight 0.24, objects})`, one object per print with every colour part on its slot, stored with JSZip STORE | `SRC/app3.js` lines 75 to 77 |
| STL fallback | `print/stl/<base>__<slot>-<filament>.stl`, one per colour part | line 77 |
| plates | shelf packing per bed (default 256 x 256, gap 5, edge 3), items sorted by group then depth then width, rotated 90 deg only when that is the only way it fits; mono groups by sorted slot set so each plate is one filament; one 3MF per bed with instances via `positions`; a rotated print gets its vertices rotated in the writer | `SRC/app1.js` lines 95 to 102, `SRC/app3.js` lines 79 to 82 |
| laser SVG | copies in one row, 5 margin, 6 gap, mm at 1:1; red #ff0000 0.1 hairline cut, black evenodd fill etch, blue #0000ff fill light etch, green #00aa00 0.1 hairline score; inner cuts before outer cuts | `SRC/kit.js` lines 17 to 27 |
| laser DXF | AC1024 ASCII mm; skeleton written by ezdxf and stored as `dxf_template.json`; the writer pours closed LWPOLYLINEs (group 70 = 1) with hex handles from 256, owner 17, then sets the seed to handle + 16; layers CUT, ETCH, LIGHT, SCORE; coordinates to 1e-4 | `SRC/kit.js` lines 29 to 36 |
| paper inserts | GANTRY light palette `C`; lockup, hazard tape, eyebrow (Plex tracked 0.22), headline (Archivo wrapped), then body plus QR plus URL lines (about), a centred QR plus note, or ruled lines (blank); footer rule, address and "EVERYONE IS WELCOME" (two lines when they collide) | `SRC/kit.js` lines 38 to 72 |
| letter sheets | card inserts tiled onto letter pages with nested SVGs and renamed clip ids | lines 87 to 91 |
| kit zip | `print/xNN_<slug>.3mf`, `print/stl/`, `plates/plate-NN-of-NN_<grp>.3mf`, `laser/xNN_<slug>_<T>mm-<material>.svg`, `laser/dxf/`, `inserts/`, `README.txt` card, `layout.json` `{app: 'cotter-bench', v: 1, state}`, `layout.png`; render loop paused while deflating at level 4 ("in software GL a frame between zip chunks costs seconds") | `SRC/app3.js` lines 72 to 91, 165 to 166 |
| README card | per print: count, size, pose sentence, grams per slot, numbered assembly lines; plates; laser with joint, kerf and sheet; paper; FROM THE DRAWER hook counts short and long; CHECK BEFORE YOU PRINT; fixed text HOW IT HANGS, FIT TEST FIRST, PLATES, SLICER, LASER FILES, JOINTS, THE MARK, WHAT WAS CHECKED BY MACHINE | `SRC/app3.js` lines 74 to 164 |
| grams | `shell = min(V, A x 1.0)`, `g = (shell + 0.15 (V - shell)) / 1000 x 1.27`; time at 20 g/h; "rough: shells at 1 mm plus 15 percent infill" | `SRC/app1.js` line 110, `SRC/app3.js` line 59 |

Gold export sizes (measured, gold note section 2.2): TODAY kit 854348 bytes in 347 ms with 33 entries; FULL WELCOME 4608366 bytes in 2014 ms with 81 entries.

### 5.17 Layout checks and the build cache (`SRC/app1.js` lines 60 to 90)

| check | rule | location |
|---|---|---|
| `collisions()` | footprint rects on the same side overlap by more than 1 mm | lines 77, 80 to 81 |
| `holeClashes()` | a hole takes a peg from one side only; side B columns mirrored `cols - 1 - c`; each peg claims its hole and the one below | lines 82 to 85 |
| `tailClashes()` | a hook pokes about 13 mm out the far side; a peg on one side inside a part on the other, footprint grown 4 sideways and below and 9 above, flags both | lines 87 to 90 |
| `clampItem` | footprint kept on the board | lines 75 to 76 |
| `firstFree` | scan rows 2 to rows - 2, columns left to right, first spot with no overlap | lines 78 to 79 |
| BOM warnings | QR TILE in mono; waiver card still pointing at the home page; parts bigger than the bed; pending builds | lines 121 to 123, `SRC/app3.js` line 61 |

Build cache (lines 61 to 68): `sig = type | JSON(params) | JSON(env())`; `built()` returns a cached result or queues a job; `pump()` builds one job per `setTimeout(0)` tick, syncs the view every third job, caps the cache at 400 FIFO. A thrown build returns a placeholder with `failed: true` and a warning, so one bad part never blanks the wall. One field change rebuilds in 38 to 50 ms; a change that touches every part on FULL WELCOME takes 934 to 950 ms (measured, gold note section 2.1).

### 5.18 Laser sign, laser QR plate and the laser preview stack (`SRC/modules.js` lines 213 to 219, 246 to 259)

Added by the checker on 2026-10-05; the first version of this record named these parts only in the template list.

What it does: the two one-plate laser parts hang flat on two hooks through the same `HANG` obround slots the printed parts use, and every laser part is previewed in 3D from its own cut, etch and light-etch outlines.

| part | construction | key values | lines |
|---|---|---|---|
| LASER SIGN | span `clipCols(env, W, 22, 50)`; plate top 14 above the anchor hole; 24 band above the lockup; lockup width `W - 2 x 18 - 10` (374 at the default 420, computed); sub line Plex cap 8 tracked 0.22; cut = rectangle minus `HANG(0, 0)` and `HANG(n P, 0)`; engrave = flames, type and sub line; light etch = the sun disc; score = a rectangle 6 inside the edge | width 160 to 590, default 420 | 246 to 251 |
| LASER QR PLATE | fixed 3-column span; 118 wide; QR 84 with headline Archivo cap 11 above; mark 24 and caption Plex cap 3.8 at the foot; light etch = the mark disc; score border 5 inside; "test scan the etch before you hang it" | Q 84, W 118 | 253 to 259 |

Laser preview stack:

1. `laserPart(name, material, T, cut, engrave, light, score)` (lines 215 to 216) moves every outline so the cut's lower left corner is the origin and records `w` and `h`; this is the unit the SVG and DXF writers place in a row.
2. `platePreview(cut, engrave, T, z0, light)` (lines 217 to 218) extrudes the cut to a plate on slot 4 (plywood), subtracts a 0.25 deep etch (slot 6, clipped to the plate) and a 0.12 deep light etch (slot 3, the sun colour), so the 3D wall shows etch as a pocket in the face.
3. `border(x0, y0, x1, y1, d)` (line 219) is the inset rectangle used as the green SCORE ring.
4. Stand-off in the preview: the sign, QR plate and sheet pocket sit at `LZ = HOOK_OFF` 4.6 (the r5 hook-leg fix); shelves and bins at `standoff(env)` (1.5, or 2.8 with click joints); the `modules2.js` laser twins (emblem, week board, dial) still sit at 1.5 (`SRC/modules2.js` lines 141, 151, 167). That last group did not get the r5 stand-off (inferred from the code; it changes the preview only, not the cut files).

### 5.19 Laser dial fits and the laser emblem span rule (`SRC/modules2.js` lines 28, 137 to 170)

Laser dial (lines 156 to 170):

| item | rule | value |
|---|---|---|
| base and face dowel holes | r `dw = 3.3` | 6.6 on a 6.35 dowel, 0.125 clearance per side (computed) |
| wheel, knob and knob spacer bores | r `dw - 0.15 = 3.15` | 6.3 on 6.35, 0.025 interference per side, plus glue (computed) |
| dowel length | `4 T + 6` | 18 at T 3.0 (computed) |
| window | `win`: sector from 0.28 R to 0.94 R spanning 0.9 of one wedge angle, centred at the top (line 28) | |
| window rim | `winRim`: the same sector grown 1.6 radially and 2.2 deg each way, minus the window, etched on the face | |
| knob | radius `min(17, 0.3 R)`, 12 scallops of r 2.6 on radius `kR + 1.2`; spacer disc r `0.6 kR` | |
| running gap | the face sits `T + 0.5` above the wheel plane (`z2 = z1 + T + 0.5`), the card washer | 0.5 |
| fasteners | four M3 x 16 through the corners, one ply washer (r 5, 1.6 hole, qty 4) plus one card washer under the face; nuts on the front | stated, assembly lines |

The wheel is engraved with the same `wedgeText` and radial rules as the printed SPINNER (rules 0.7 wide here, 0.8 printed), so one option list drives both.

Laser emblem (lines 137 to 143): plate radius `S/2 + 16`; the hook span starts at `spanUp(floor(0.4 S / 25.4))` and drops two columns at a time while the far corner of a hang slot, at `(n P/2 + 3.6, R - 10.4)` from the plate centre, lies outside `R - 4` (line 139), so both slots stay inside the round plate with 4 mm of wood left. The reported disc piece count is the number of outer rings in the disc (`outerRings`, line 14): the arrow splits the disc, and the assembly line tells the person to cut those pieces together and keep them in place.

### 5.20 State, undo and the design file (`SRC/app3.js` lines 7 to 14, 39 to 43, 181 to 189; `SRC/app1.js` lines 56 to 58)

| pattern | rule | location |
|---|---|---|
| undo | each commit pushes a JSON snapshot of board, fit, style, items and `nextId`; a snapshot equal to the current one is skipped; a new one truncates redo; the stack is capped at 80; `restore` locks history while it rebuilds | `SRC/app3.js` lines 8 to 12 |
| design file | `{app: 'cotter-bench', v: 1, state}`; anything else throws "not a COTTER design"; opened by the OPEN button, a file input, or a .json dropped anywhere on the page | lines 13, 14, 182 to 184 |
| stock link swap | changing a card's insert swaps its link to the new stock URL only while the current link is still one of `KIT.URLS`, so a pasted link survives; a new part with an insert and no link takes the stock URL | line 40; `SRC/app1.js` line 57 |
| preset keeps the label | a preset fills the part's fields, but a label passed with the part is kept | `SRC/app1.js` line 56 |
| inspector clamps | inspector numbers are a range and a number box on one field, and `read()` clamps to the field's min and max; the BOARD pane number boxes have no min or max and are the exception (F1) | line 39 |
| move to side B | the column is mirrored (`cols - 1 - col - round((rect[0] + rect[2]) / 25.4)`, which also mirrors the footprint offset from the anchor hole) so the part keeps its position seen from the other face | line 43 |
| keyboard guard | arrow, delete and ctrl keys are ignored while focus is in an input, textarea or select | line 186 |

---

## 6. UX anatomy

### 6.1 Shell (`SRC/part1.html`)

Header: ink bar, 3 px pink rule, the hack.build mark, "COTTER.bench" in Permanent Marker, tagline in Special Elite, UNDO, REDO, OPEN, SAVE, GUIDE. Steps: 1 BOARD, 2 LAYOUT, 3 STYLE, 4 MAKE (pink underline on current, green number on done). Guide strip: "STEP n NAME" in VT323 pink plus one goal sentence (`GUIDE`, `SRC/app3.js` lines 3 to 4). Stage left on void with a 26 px pink grid; rail right 340 px; status strip at the bottom.

### 6.2 Stage and cams (`SRC/app2.js`)

- Installed scene (lines 13 to 22): the painted board at 170 mm on its rolling base with feet and casters, pink eye-height ticks at 1500 mm, a floor disc.
- Cams strip: FRONT, ISO, EYE LEVEL (camera at 1500 mm, 1.5 m back), EDGE (shows how far each part sticks out), PROPS toggle, BOARD toggle (hides the board so clips show), PLATES mode (lines 32 to 37).
- Legend of slots in use only; side chip SIDE A VISITORS / SIDE B MEMBERS flips the camera 180 deg and places new parts on that side; busy readout `building N`.
- Paper inserts render as textures drawn from `KIT.insertSVG`, the same function that writes the files (lines 44 to 47). Plates view draws the same `platePlan()` that writes the plate 3MFs (lines 59 to 69).

### 6.3 Direct manipulation (`SRC/app2.js` lines 88 to 105)

Drag a part hole to hole: the pointer ray meets the board plane of the part's side, rounds to the nearest column and row, clamps the footprint onto the board, rebuilds the view on every hole change and commits on release. The pick target is an invisible box over the footprint, so thin parts are as easy to grab as thick ones. Empty drag orbits (phi clamped -0.2 to 1.35), right or shift drag pans, wheel zooms 250 to 9000 mm, double click flies to the part. Keyboard: arrows nudge 1 hole, shift 4; Delete, ctrl D, ctrl Z, ctrl shift Z, ctrl Y (`SRC/app3.js` lines 186 to 189).

### 6.4 Rail panes

| pane | content | source |
|---|---|---|
| BOARD | holes across 8 to 48, down 8 to 96, hole 5.5 to 7.5, thickness 3 to 8 (range plus number plus unit); THE CLIP readout (rod, bend radius, sweep, locks above hole, reach behind, board in inches); fits fold with the coupon instruction | `SRC/part1.html` lines 213 to 230, `SRC/app3.js` lines 24 to 25 |
| LAYOUT | TEMPLATES grid (confirm before replacing); PART inspector generated from each module's `fields` (select, bool, number, text, url) with a readout "on the board W x H, sticks out D, clips N, hooks N, plastic G g", the part's warnings, DUPLICATE, MOVE TO SIDE B, DELETE; ADD A PART palette grouped print and laser with a one-line blurb each | `SRC/app3.js` lines 26 to 44 |
| STYLE | HOW PARTS HANG chips with a note per choice; COLOUR chips multi or mono with a note, three slot rows (number, colour, name, PETG PLA ABS ASA, role line); LASER sheet 2 to 6.4, kerf 0 to 0.4, acrylic 1.5 to 6, joint select with a note; PRINTER BED 150 to 400 | `SRC/part1.html` lines 238 to 263, `SRC/app3.js` lines 47 to 54 |
| MAKE | KIT table: make (x14 in VT323 pink), part, how (pose or laser parts), est. (grams or material); short and long metal hooks; paper inserts; plastic total in grams and hours; warnings worst first; DOWNLOAD KIT ZIP and LAYOUT PNG; plate readout; ALREADY OUT THERE with seven prior-art pegboard models and one line each | `SRC/part1.html` lines 266 to 283, `SRC/app3.js` lines 55 to 61 |

Status strip (`SRC/app3.js` lines 62 to 64): `BOARD 24 x 72 holes 610 x 1829 mm`, `PARTS n A a B b`, chips `meshes current` or `building N`, `N overlap`, `N hole clash`, `N tail under part`, colour mode.

Welcome card: one sentence of purpose, six template buttons written as intents ("a handful of single colour prints plus one laser cut sign. up by tonight."), START BLANK (`SRC/part1.html` lines 196 to 208).

### 6.5 The BENCH hook (`SRC/app3.js` lines 170 to 172)

`BENCH = {ready, state(), idle, bom, plates(), loadTemplate(k), waitIdle, designJson, loadDesign, exportBytes('json' | other -> kit, base64), view, addItem(t, p)}`. `commit`, `built`, `collisions`, `holeClashes`, `tailClashes`, `platePlan`, `VIEW`, `ST` are globals because the app files are classic scripts; tests and this folder's drive call them directly.

### 6.6 What makes it excellent

From the gold note section 5, each tied to code above:

1. The stage shows the product where it will live: board at its real height on its base, eye-height ticks, EYE LEVEL cam, seeded props "so the wall reads as a wall and not as empty brackets". The r5 hook stand-off fix came from looking at this view.
2. Preview and export share one source: inserts, plates and hooks on the stage are drawn by the exporters and the BOM's own offsets.
3. Two caliper numbers become solved geometry with a readout in physical words, checked by a configuration space proof the rail mentions in one sentence.
4. Starts are intents with a time and a process mix, and each template sets style as well as parts.
5. Direct manipulation on the real lattice, with an invisible footprint pick box and first-free placement.
6. Checks name the physical cause and the fix ("hooks reach about 13 mm out the back, so move one of the pair"), shown three ways: status chip, red selection box, ranked list in MAKE.
7. One bad part never blanks the wall.
8. MAKE is a count sheet and every file name starts with its count.
9. Both faces of the board are modelled, including what passes through.
10. Rebuilds are per part and cheap (38 to 50 ms per field, measured).
11. Colour is a mode that changes geometry; slots are numbers with jobs.
12. Every option carries its physical consequence in one note.
13. The README says what the machine checked and what only the person can check.
14. Client brand in geometry and paper, house style in the shell.
15. It credits prior art.
16. Testing was part of the design (section 7).

### 6.7 Flaws a port must not copy

From the gold note section 6: F1 number boxes skip the clamp; F2 THE CLIP readout misaligns label and value; F3 a non-Error throw shows "failed to build: undefined"; F4 the rail keeps one scroll position across panes; F5 pink everywhere; F6 phone targets under 44 px and legend over cams; F7 raw emscripten text on kernel failure with a live rail; F8 `exportBytes` treats every kind but json as the kit and the hook lacks rev, built, busy; F9 `alert()` for failures; F10 range input writes state without a commit; F11 stale cam highlight; F12 3D pick is the only selection; F13 plate labels over parts; F14 16 free `.note` paragraphs; F15 welcome on every load, no share link; F16 template blurbs differ between welcome and rail; F17 dead CSS for an art face editor (`#stage.art`, `#face`, `SRC/part1.html` lines 54 to 58); F18 the `modules2.js` header comment (lines 1 to 3) still describes the r4 thumbwheel DIAL that r5 replaced with the DRUM.

---

## 7. Tests and harness

| file | what it proves |
|---|---|
| `TEST/node_build.mjs` | loads geo, modules, kit, modules2 into node via `vm.runInThisContext`, builds every module for multi and mono, clip and hook (env `JOINT`, `HOOKS` overrides), writes print-pose STLs named `<tag>__<id>__<print>__slotN__<name>.stl`, laser SVG and DXF, five inserts, `report.json`, timings and triangle counts |
| `TOOLS/audit_stl.py <dir> [bed]` | per STL: trimesh watertight after vertex merge, winding consistent, volume > 0, body count; per print group: on the bed within 0.05, fits the bed, pairwise colour-part overlap by manifold3d XOR volume over 1e-3 mm3 fails |
| `TOOLS/audit_dxf.py <dir>` | ezdxf reads AC1024, auditor has no errors and no fixes, `$INSUNITS` 4, only LWPOLYLINE, only CUT ETCH LIGHT SCORE, all closed, handles unique and under `$HANDSEED`, extents equal the SVG twin minus 10 mm margin within 0.6 |
| `TOOLS/print_audit.py <dir> [pattern]` | in print pose, faces within 40 deg of straight down with centroid z > 0.3, union-find grouped over face adjacency, patches over 1 mm2 reported as flat or slope with extents and height |
| `TOOLS/hook_fit.py verify` | the insertion proof, section 5.3; rerun 2026-10-05: 7 of 7 INSERTS (computed) |
| `TEST/laser_fit.mjs` | laser assembly interference at kerf 0 under 4 mm3 per pair, l_bin corner column 100 +- 0.5 percent wood; press, click, glue on five parameter sets |
| `TEST/mk_probe.mjs` | mark areas and bounds: flame, disc, sun, sun minus disc minus flame, flame outside sun |
| `TEST/smoke.py` | Playwright with swiftshader: boot time, every template built, BOM rows, a screenshot per cam, kit export size and time, every step; fails on console errors |
| `TEST/interact.py` | real mouse drag three holes right and two down, inspector edit reaches the BOM, undo twice restores, palette add lands free, move to side B, design JSON round trip identical, blank export, no sideways overflow at 390, 768, 1280 |
| `TEST/platecheck.py` | every plate item on the bed, no overlaps, placed count equals wanted count, per template |
| `TEST/sideb.py`, `tails.py`, `resolve.py` | per-template overlap, hole clash, tail clash, off-board counts; `resolve.py` relocates side B items nearest first until no clash (used to plan BOTH SIDES) |
| `TEST/displays.py`, `hooks2.py`, `laserkit.py`, `mkkit.py`, `plates.py`, `closeup.py`, `closeup2.py` | screenshots and kits for displays, hook mode, click joints, plates |

The node harnesses hard-code `root = '/home/claude/cotter'` and need that path or an edit. Defect: `audit_stl.py` line 13 computes a dead `ok` expression (`... if name.count('slot') == 0 or True else True`); the verdict is the `flag` line after it, and the on-bed check runs per group only.

Gold drive: `fab-knowledge:evidence/gold/cotter/drive/drive.mjs` and `extra.mjs` (puppeteer-core 25.12.0). This folder: `fab-knowledge:originals/cotter/drive/drive.mjs`.

---

## 8. How to make a new thing this way

1. Put the kernel behind a scope and a pool; snap every coordinate to 1/1024 mm; wind every polygon CCW; build with profiles and exact axis swaps, never trig rotations for coplanar faces; simplify at 0.002 before meshing.
2. Solve an interface from the person's caliper numbers in closed form, print the solved values in physical words on the measuring step, and prove the closed form by search offline for the sizes that matter.
3. Give every part one mount seam (`plateSeat`, `mountBack`, `mountRibs`, `hangHoles`, `feet`, `tunnel`) so new parts get every mounting system for free.
4. Make springs as separate printed beams with a stated preload and a strain under the across-layer limit when they cross layers: the drum blade (0.3 preload, 0.69 percent peak) and the spinner finger (0.67 percent, in the layer plane) are the two printed worked examples, and the laser click prong (0.61 to 0.65 percent at the barb in 3 mm birch) is the sheet one.
5. Do colour as a mode that changes geometry: flush inlays on slots with a 0.02 Miter inset and ink winning over sun, or a 0.6 deboss with the disc as substrate.
6. Draw every laser tenon once, pointing down, and turn it into place; grow tabs and shrink slots by the kerf in one place; point every tooth into a back plate the same way; prove the joint by assembling the cut outlines at kerf 0.
7. Let bought hardware carry the load and the cut parts only locate it, and count the hardware from the geometry.
8. Export from the same functions the preview uses, prefix every file with its count, and write a README card that says what was checked and what was not.

---

## 9. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| kernel scope, pool, dyadic snap, exact swaps, simplify | mesh, geom | none | n/a | MISSING | M00 | MISSING |
| peg hook rule (closed form) | constraints | peg (backlog, D-060) | `mech/hook-rule` ConstraintDef planned (line 542; fixture `packages/constraints/src/fixtures/hook-rule.ts` named but absent); mechanism entry MISSING (substrate part source is a candidate, line 1177) | MISSING (M11 names `joints/hang-hook` as a fallback, M11-reference.md line 758) | M01 fixture, M06 move | MISSING |
| insertion proof by c-space search | sim | peg | MISSING (CHK-ASM-02 and -03 extended) | MISSING | M02-T09 (`packages/sim/src/programs/cotter/hook.ts` planned) | MISSING (M02 plans a row for `search`) |
| RAIL CLIP dovetail with keyhole entry | geom, mesh | dovetail rail (missing kind) | MISSING (candidate, line 1169) | MISSING | M10 printed joinery (candidate) | MISSING |
| hook mount: hang slots, gabled tunnels, feet, stand-off | geom | hangSlot (backlog D-060) | MISSING | MISSING | none | MISSING |
| flush inlay and mono deboss, two-piece mark | inlay | art region (missing) | MISSING | MISSING | none named | MISSING |
| type, mark, lockup, QR as outlines; brand assets | geom | none | MISSING (brand pack is a gap) | MISSING | none | MISSING |
| DRUM printed leaf-spring detent | mechanisms | detent | MISSING (candidate "printed leaf-spring detent drum", line 1173; nearest admitted canon `count-wheel-detent`, line 404) | MISSING (nearest `mechanisms/detent-strip`) | M10 clutches and detents row | MISSING |
| SPINNER flexure-finger click detent, press-fit knob | mechanisms | detent, snap | MISSING (candidate "flick spinner with click detent", line 1174) | MISSING | M10 | MISSING |
| WEEK BOARD T channel and tiles | geom | pocket, chamfer | MISSING | MISSING | none | MISSING |
| EMBLEM relief, PHONE LEDGE 45 deg cheeks, MOUNT PAD countersinks | geom, mesh | pocket, chamfer, screw | MISSING | MISSING | none | MISSING |
| laser press tooth with crush nubs | nest, geom | tabslot | MISSING (candidate, line 1176); kerf rule shared with `finger-joint` | MISSING | M07 (CHK-SHT-08) | MISSING |
| laser click tab with spring prongs and keyhole slit roots | nest, geom | snap, tabslot | MISSING (candidate, line 1175) | MISSING | M07 (CHK-SHT-08) | MISSING |
| box teeth | nest | finger | `finger-joint` (line 400) | `joints/finger` (planned, not in `reference/`) | M06 | MISSING |
| prong-carried laser shelf, coin ledge, bin | nest | tabslot, lamination | MISSING | MISSING | none | MISSING |
| laser dial on a bought dowel | nest | pivot | MISSING (rule CHK-ASM-09 exists) | MISSING | none | MISSING |
| laser SVG and DXF AC1024 from an ezdxf skeleton | nest | none | n/a | MISSING | M07 (`designs/cotter/legacy/kit.js`, `audit_dxf.py` planned) | MISSING |
| 3MF, plates packer, print pose | 3mf | none | n/a | MISSING | M00, M07 (quantity naming) | MISSING |
| paper inserts and wrap strips | nest (paper process missing) | none | MISSING | MISSING | none | MISSING |
| layout checks: overlap, hole clash, tail clash | checks | none | CHK-ASM-12 and -13 reserved, not entered (CHECKS.md lines 1222 to 1223, 1535) | MISSING | none until the substrate source is admitted | MISSING |
| bake (classic manifold, base64 wasm, fonts, dash assert) | ui-core | none | n/a | MISSING | M09-T01 and T13 | MISSING |
| laser sign and QR plate on hang slots; preview stack with etch pockets and score border | nest | window | MISSING | MISSING | M07 | MISSING |
| undo stack, design file with app tag, stock link swap, side B mirror | ui-core | none | n/a | MISSING | M09 | MISSING |

`lineage.json` holds three rows, none for COTTER (checked 2026-10-05). The registry row for `cotter` is planned at M16-T06 (`M16-knowledge-registry.md` line 522).
