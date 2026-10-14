# TENON: how it is made

Record written 2026-10-05 from the original code; section 5.9 added 2026-10-06 from the second owner save. Slug `tenon`. Family cases-joinery: the juggling club in eleven printed parts, its two start thread breaks, its bayonet neck joint with a ramp preload and a detent gate, its threaded TPU knob and tip, and the battery stack in the grip.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Computed" numbers were rerun on 2026-10-05 with node v22.18.0 against `fab-knowledge:originals/tenon/files/src/src/part2.js` (the kernel loads in node with `require`, no shim). "Measured" numbers come from the headless drive of the shipped page on 2026-10-05 (config `fab-knowledge:originals/tenon/shots/_drive.json`, log `_drive-log.json` beside it). "README" means the owner's README states it.

Short paths: `F` is `fab-knowledge:originals/tenon/files/`, `SRC` is `F/src/src/`, `H` is `F/src/` (harnesses).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | TENON, printable juggling club bench |
| owner's slug | tenon |
| canonical file | `F/tenon.html` |
| sha256 | 37fee2f32d1adda1e1cd999d3d75086bd83bfe4a41c1eaea75add359a4dd4713 |
| bytes | 1028369 |
| date | 2026-09-29 17:59 (mtime of `~/Downloads/tenon (14).html`, byte identical) |
| source | `F/tenon-src.zip` (sha256 c57ea22562979007b849cdb42fd076611db1cd783c6815216035f617e99820b5), unpacked at `F/src/`; part2.js and part3.js stamped 2026-09-29 17:38 and 17:54 |
| runtime | three.js r128, JSZip, five font faces, all inlined by `H/build.py`; the print-forge `orca3mf.js` is inlined ahead of part2; opens from `file://` offline |
| print target | Flashforge Creator 5 Pro 0.4 nozzle, `0.24mm Standard @FF C5`, 256 x 256 x 256, PETG and TPU on four toolheads |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-pip-latest.md` section 4; copies in `fab-knowledge:evidence/x/downloads/dl-pip-latest/tenon/`.

| date | file | sha256 prefix | what changed |
|---|---|---|---|
| 2026-09-25 22:22 | `tenon (6).html` | 40a595fb | first bench: 4 parts, straight 27 grip, handle 183; this is the state `legacyState()` calls "the first print" |
| 2026-09-25 23:43 | `tenon (7).html` | 880e695e | threaded breaks: 6 parts with neck and throat; `effective()` clamps the joint |
| 2026-09-25 23:45 | `tenon.3mf` | 8f6f1f55 | 6 objects, all named |
| 2026-09-28 22:32 | `tenon (8).html` | 3bd1a435 | 7 parts, `upper` from a mid break; tapered handle |
| 2026-09-28 22:48 | `tenon (9).html` | cee90eae | compare view and the legacy ghost |
| 2026-09-28 23:22 | `tenon (10).html` | 3fa63831 | fat tire knob printed bore down; tip as a 5 mm lid; overhang audit skips the first 1.0 mm |
| 2026-09-29 01:11 | `tenon (11).html` | 75cfda97 | power stack: 11 parts (tray, two pucks, spacer); knob ceiling as a 45 deg cone |
| 2026-09-29 17:50 | `tenon (13).html` | ccd80b18 | tip ring inside the body end instead of a boss |
| 2026-09-29 17:59 | `tenon (14).html` | 37fee2f3 | canonical: loose inserts tinted and slid sideways in explode |
| 2026-09-29 18:02 | `tenon (1).3mf` | de697410 | OrcaSlicer 2.3.2 owner save of an 11 part bench export, every object correctly named |
| 2026-10-02 | `tenon.3mf`, `tenon-stl.zip` in the src package | b82c1125 | node export with 5 objects named `tenon-undefined` and 4 STLs lost (section 7) |
| 2026-10-05 15:08 | `tenon (1).3mf` (second owner save under the same name) | 77727f0d | OrcaSlicer 2.3.2 re-save of the same 11 part export: the handle turned 180 deg about Y, a 2-layer raft for the plate, sliced (section 5.9) |

### 1.2 Why this revision

`tenon (14).html` is the newest bench and the good one: the drive on 2026-10-05 booted with 0 errors, the worked example built with no warnings (measured), and the node sweep over 3 presets plus 60 random states finished with 0 fails (computed, `H/sweep.js`, unseeded `Math.random`, so the 60 states differ per run). The shipped `tenon.3mf` from the Oct 2 package is defective and is not the export this record holds up; the owner's slicer save `tenon (1).3mf` of the bench's own 11 part export is the good export.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `tenon.html` | the shipped bench |
| `tenon-src.zip`, `src/` | `src/part1.html`, `src/part2.js` (kernel, DOM free), `src/part3.js` (viewer and UI), `build.py`, `sweep.js`, `smoke.py`, `smoke_b.py`, `export_default.js`, `package.json` |
| `README.md`, `print-card.txt` | owner README and the print card for the pirouette club |
| `examples/tenon-11part.orca232-save.3mf` | owner OrcaSlicer 2.3.2 save, 11 named objects (sha256 de697410...4c26) |
| `known-bad/tenon.node-export-undefined-names.3mf` | the Oct 2 node export (sha256 b82c1125...dc77), kept as the export completeness fixture |
| `examples/tenon-11part.orca232-save-2026-10-05.3mf` | the second owner save of 2026-10-05 15:08 (sha256 77727f0d6d36ae180976b8fa7b3937c6d8c431f72584608943bb460e0d4d83e5), copied from `fab-knowledge:evidence/x/downloads/skills-2026-10-06/designs/tenon (1).3mf`; the print pose lesson of section 5.9 |

Hashes: `fab-knowledge:originals/tenon/SHA256SUMS`.

---

## 2. What it makes and for whom

A Henrys style juggling club, 520 mm long, printed in eleven parts that screw and twist together, for a juggler who wants a club they can print, carry in pieces, light from inside and rebalance. Default numbers were "measured off a real Henrys Pirouette lying next to the first print" (README): 520 long, knob 40 x 24, handle 250 from knob face to neck tapering 27 to 30 in state (README text says 25 to 29), body 82 max at `atFrac` 0.59, end 45.

Parts and print pose (computed for `blankState()`, which is the pirouette numbers; matches `F/print-card.txt`):

| part (key) | slot, material | height x dia | pose | walls / infill | grams |
|---|---|---|---|---|---|
| body (`bulb`) | 1 PETG clear `#D8E6EE` | 95.5 x 81.2 | tip end down | 3 / 0 | 54.3 |
| upper body (`upper`) | 1 PETG clear | 95.5 x 82.0 | break face down | 3 / 0 | 55.9 |
| neck | 1 PETG clear | 52.0 x 63.4 | break face down, socket up | 3 / 0 | 29.3 |
| handle | 2 PETG `#1A1A1A` | 163.4 x 28.6 | knob end down | 3 / 15 | 44.0 |
| throat | 2 PETG | 156.0 x 39.7 | break face down | 3 / 15 | 46.8 |
| knob | 3 TPU `#FE0386` | 24.0 x 40.0 | bore down, dome up | 3 / 40 | 14.2 |
| tip | 4 TPU `#FE0386` | 17.0 x 45.0 | flat face down | 3 / 20 | 10.5 |
| charger tray | 2 PETG | 7.1 x 31.0 | flat face down | 3 / 30 | 2.3 |
| contact A, B | 2 PETG | 4.0 x 19.0 | flat | 3 / 40 | 1.4 each |
| spacer | 2 PETG | 46.7 x 18.9 | standing | 2 / 0 | 5.1 |

Total 265.2 g, balance 294.0 mm from the knob face, 56.5 percent of the length (computed); the Henrys reference is 218 to 220 g (README). 630,924 triangles at `standard` resolution (computed and measured). The worked example on the welcome card adds a 24 g payload at 235 mm, which gives 289 g and 56 percent (measured).

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860). Copies in `fab-knowledge:originals/tenon/shots/`.

| file | caption |
|---|---|
| `t01-welcome.png` | Welcome card with the four steps and two starts (start blank, worked example). |
| `t02-club-assembled.png` | The pirouette club assembled in iso: pink TPU knob, black tapered handle and throat, the clear body pieces rendered translucent so the thread rings at each break show, pink tip. Rail at CLUB with PRESET chips, the two GHOST buttons and the CLUB sliders with a note on the Pirouette grip. Status: 520 x 82 mm, 289 g, balance 56 percent, 630,924 tris. |
| `t03-joints-explode-cut.png` | JOINTS with EXPLODE and CUT on: the parts spread 45 mm apart along the axis, the loose inserts (tray, pucks, spacer, cell ghost) slid sideways and tinted toward pink, each part cut in half so the spigots, rings and sockets show. Rail: NECK JOINT with BAYONET or THREAD and every lug field. |
| `t04-bayonet-closeup-cut.png` | Front cut of the assembled club, framed small across the middle of the stage: the pink knob and tip at the ends, the pink loose inserts in the grip and the body pieces with their break lines. The individual thread rings are too small to read at this framing (looked at 2026-10-05); `t04b` is the zoom. |
| `t04b-joint-cut-zoom.png` | Zoomed cut at the neck joint: the handle spigot seated in the body socket, a lug in its L groove, the 45 deg chamfers from the spigot bore out to the wall, and the grip bore with the pink spacer. |
| `t05-parts-compare-ghost.png` | PARTS with COMPARE on: the grey ghost of the first print (straight 183 mm grip, six pieces, 239 g) under the live club with the knob faces lined up; rail FILAMENTS with the clear flag and per part slot, walls and infill. |
| `t06-print-plate.png` | PRINT on the plate view: all eleven parts standing in print pose on one 256 plate in rows; rail PRINT REALITY (layer, draft, standard, fine), PLATE and EXPORT with per part height, layer count and slot. |

---

## 4. Build pipeline and code map

`H/build.py` concatenates `SRC/part1.html`, then the print-forge `assets/orca3mf.js`, `SRC/part2.js` and `SRC/part3.js`; inlines three r128 and JSZip from `node_modules`; embeds five font faces as base64 woff2; `--online` keeps the CDN links. Output `out/tenon.html`.

| file | lines | role and key ranges |
|---|---|---|
| `SRC/part1.html` | 381 | tokens (identical `:root` to KNUCKLE), header, steps CLUB, JOINTS, PARTS, PRINT (166 to 169), stage chips (176), welcome (182), panes (199 to 372) |
| `SRC/part2.js` | 808 | DOM free kernel: state (13 to 78), profile (81 to 107), feature fields (110 to 203), revolve kernel (208 to 282), profile builder (286 to 342), parts (345 to 710), build (713 to 757), plate, fit, mass (760 to 807), `module.exports` (808) |
| `SRC/part3.js` | 521 | history (23 to 38), commit model (40 to 67), exports and print card (69 to 169), viewer (171 to 346), UI (348 to 511), boot (514 to 521) |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The revolve kernel with radial feature fields

What it does: makes every round part as one strictly manifold closed surface with threads, lugs, grooves and wire channels carried as radial displacement on profile rows, so no boolean is ever run.

Construction (`SRC/part2.js`):

1. A part is a closed profile of rows `{r, z, f}` traversed CCW in the (r, z) half plane: outer up, top inward, inner down, bottom outward. `f(theta, z)` adds a radial displacement. A row with `r = 0` and no `f` is a pole (comment, lines 206 to 207).
2. `thetaList(n, edges)` (208 to 219): `n` regular columns plus a pair at `edge plus or minus 0.02 deg` for every feature edge (lug sides, groove notch and sweep ends, detent gate edges, wire groove sides); a regular column within 1e-4 of an edge column is dropped ("a regular column that lands on an edge column makes a sliver").
3. `revolve(rows, thetas)` (220 to 258): drop consecutive duplicate rows, emit N vertices per row (one per pole), quads between consecutive rows, fans at poles; flip winding if the signed volume is negative.
4. `Prof` (286 to 315): `pt`, `line` (endpoints inclusive), `curve` (r = fn(z)), and `band(r, zFrom, zTo, coarse, fine, bands, f)`, which steps densely inside feature bands and clamps to any band edge ahead, so a step never straddles a thread end.
5. Resolution presets (74 to 78):

| res | n columns | smooth | feat | fine | thr |
|---|---|---|---|---|---|
| draft | 120 | 4 | 0.4 | 0.12 | 0.35 |
| standard | 200 | 2 | 0.25 | 0.06 | 0.2 |
| fine | 320 | 1 | 0.15 | 0.04 | 0.12 |

6. `overhangAudit(rows)` (329 to 342): the worst downward facing slope of profile edges without fields, ignoring edges that start under z 1.0 ("a rounded rim sitting on the bed is routine"); `build` warns over 50 deg. Every part of the default club reports 45.0 deg or less (computed; knob 45.1 at the ceiling cone, which is under the 50 limit).

Limits: the field is radial only, so a feature that needs an undercut along z must be written as a 45 deg wedge in the field (the lug and groove do this). A field edge not registered in `thetaList` leaves a stair of facets at the edge (inferred).

### 5.2 Two start thread breaks (spigot below, ring above)

What it does: joins body pieces and handle pieces so each part prints with its threads standing up and no supports.

Constants: `split {body true, bodyDrop 52, mid true, midAt 0.5, handle true, handleZ 160, pitch 4, starts 2, depth 1.2, len 10, clear 0.25, spigotWall 2.2, ringWall 3.2}` (`SRC/part2.js` line 31).

Thread profile (`threadProfile`, 110 to 117): one phase is root, flank up, crest, flank down, root with `ff = depth / pitch` and `cf = max(0.05, (1 - 2 ff) 0.4)`; depth over axial run per flank equals `ff pitch`, so each flank is 45 deg.

| field | rows sit at | displacement | options |
|---|---|---|---|
| `extThread` (119 to 132) | minor radius | `+depth profile(ph)`, `ph = frac((z - z0)/pitch - hand starts theta / TAU)` | chamferLo, chamferHi (depth limited by the distance to the end), fillLo, fillHi |
| `intThread` (135 to 145) | root (major plus clearance) | `-depth (1 - profile)` | 45 deg mouth chamfer at `mouth: 'lo'` or `'hi'` |

Parts built in the flipped frame use `hand: -1` so they mate with the handle's right hand thread (lines 377, 454).

Break placement (`buildBody` 463 to 529, `buildHandle` 560 to 639):

1. Body break at `joint.z + bodyDrop`, walked down up to 8 times until the socket chamfer and the ring chamfer clear by 2 mm; warns "body break moved to N mm below the joint".
2. Mid break at `zSplit + (zEnd - zSplit) midAt`, clamped to `[midLo, midHi]` where `midLo = zSplit + len + 1 + 14 + 3 + Ls` and `midHi = zEnd - (tipRoom + 12) - Ls`; skipped with a warning if the body is too short.
3. Handle break at `handleZ` from the knob face, clamped between `knob thread end + 20` and `neck joint - (ring + its chamfer + spigot bore chamfer + 3)`, solved in 3 passes.
4. Ring radius from the narrow end of its span (`min(Ro(0), Ro(len + 1)) - ringWall`) because the club narrows. The spigot rows sit at the minor radius `Rm = Rr - clear - depth` and the thread field adds `depth`, so the spigot major is `Rr - clear`; spigot bore `Rspb = Rm - spigotWall`. Body spigots (`spigotTop`, `SRC/part2.js` lines 504 to 509) warn "spigot bore very small" when `Rspb` (a radius) is under 6 and floor it at 1.5. The grip spigot (`buildHandle` lines 615 to 616) uses its own pair: "grip spigot bore under 6 mm" when `Rspb < 3`, and a 1.5 floor with "grip too thin for the split thread"; its ring is `min(Ro(zs) - wall, Ro(zs) - ringWall)`, sized at the break rather than over the span.
5. Shell rows (`shellRows`, 426 to 450): outer curve, socket or spigot at the top, a 45 deg chamfer from the socket or spigot bore out to the flaring inner wall solved by a 4 iteration fixed point `zc = L - depth - (Ri(zc) - Rsock)`, inner wall, thread ring at the bed end.

Fits: PETG on PETG 0.25 radial; "if a joint binds, raise its clearance by 0.05 and reprint the smaller part" (print card). README: "every part prints its threads standing up with no supports".

### 5.3 The bayonet neck joint with ramp preload and detent gate

What it does: joins the throat (spigot) to the neck or body (socket) with push and turn about 60 deg clockwise seen from the tip; a ramp preloads the shoulder and a detent gate clicks.

Constants: `joint {z 294, mode 'bayonet', spigotLen 22, spigotWall 2.4, socketWall 3.8, clear 0.2, lugs 3, lugW 5, lugH 1.8, lugT 3, lugGap 1.2, sweep 60, preload 0.2, clearZ 0.4, bite 0.2, dir 1}` and the thread fallback `pitch 5, starts 2, depth 1.5, tclear 0.3` (line 24 to 26).

Radii (`jointRadii`, 345 to 356): `Rout = min(outerR(zJ), outerR(zJ + spigotLen + 0.6))`; bayonet `Rsock = Rout - socketWall`, `Rsp = Rsock - clear`, `Rspb = Rsp - spigotWall`. Default `Rout` 19.86, `Rsock` 16.06, `Rsp` 15.86, `Rspb` 13.46 (computed).

Lugs (`lugField`, 148 to 156): within `lugW / 2 / Rsp` rad of each of n lug angles and between `lugGap` and `lugGap + lugT` from the shoulder, radius grows by `min(lugH, s - s0)`: a 45 deg wedge toward the shoulder and a flat far face.

Grooves (`grooveGeom` 158 to 167, `grooveField` 168 to 189):

```
D       = lugH + clear + 0.1                  groove depth
halfN   = (lugW/2 + 0.3) / Rsock               open notch half angle at the mouth
pocket  = lugW / Rsock + 2 deg
gateW   = 4 deg ; run = sweep - pocket ; gateC = run - gateW/2 - 1.5 deg
ramp    = clearZ + preload                     the retaining wall start rises by this along the run
sA0     = lugGap - clearZ ; sB = lugGap + lugT + clearZ
gate:     depth reduces to lugH - clear - bite over gateW, so the lug tip meets bite mm of interference
```

The retaining wall is a 45 deg wedge (`d = min(D, s - sA)`). The socket is built in the flipped frame with `dir` negated so "dir 1 = clockwise seen from the tip locks" (line 457). Checks in `socketTop` (451 to 462): "socket wall behind groove under 1.2 mm" when `socketWall - D < 1.2`; "bayonet sweep overlaps the next lug" when `(2 halfN + sweep) lugs > TAU - 0.2`.

`effective()` (722 to 728) clamps the joint between `zNeck + 20` and `zEnd - spigotLen - 20`.

Fits: 0.2 radial, 0.4 axial clear, 0.2 preload, 0.2 bite, all declared and "Untested at print time" (README "Only you can check").

### 5.4 The fat tire knob with a cone ceiling and the threaded tip lid

Knob (`buildKnob`, 357 to 398), `knob {h 24, d 40, round 9, roundTop 4}`, `knobJoint {pitch 4, starts 2, depth 1.0, len 12, clear 0.3}`: a drum printed bore down, dome up. Root `Rroot = Rh + clear`; wall under 2.5 warns; rim rounds trimmed to the height; bore depth `len + 0.6` with a 2.4 floor, shortened where the 9 mm dome round leaves under 2 mm of wall. The bore ceiling is a 45 deg cone from the thread root to the USB hole (12 mm) so the knob prints with no bridge; "knob ceiling bridges N mm" warns over 3 mm radial; a flat ceiling sits 0.02 above the thread rows, never on them. The handle end carries a matching 45 deg chamfer `cone = max(0, Rh - depth - Rbore)` (`derive`, line 85).

Tip (`buildTip`, 403 to 424), `tip {h 5, fillet 2.4}`, `tipJoint {pitch 4, starts 2, depth 1.2, len 12, clear 0.3, ringWall 3, plugWall 2}`: a lid the full width of the body end with a circular fillet, a threaded cup underneath (external thread with a chamfered top) whose bore is the light window; the matching internal ring sits inside the body end rim (`tipRingRoot`, 399 to 402). Fits: TPU on PETG 0.3.

### 5.5 The battery stack in the grip

`power {on, hole 12, cell {d 18.4, len 65}, groove {n 4, w 1.6, depth 1.0}, puck {t 4, notchW 1.6, notchD 4, clear 0.4}, tray {len 25, boardW 17.5, drop 2.4, overhang 1}}` (line 30).

1. Bore 19.4 for an 18650; reduced with a warning to keep 1.6 mm of wall (`buildHandle` lines 564 to 566).
2. Wire grooves: n axial channels as a radial field on the bore rows, shallowed to keep 1.2 mm under the knob thread root (lines 576 to 585).
3. Contact pucks (`buildPower`, 676 to 710): a disc of `Rb - clear/2` with two rim notches, extruded by an ear clipper (`earClip` 642 to 662, `extrude` 663 to 670); a bent wire lies across the face with tails through the notches; puck A sits `t + 1 + cell.len + 1` above puck B (1 mm of wire proud of each face).
4. Charger tray: a circular segment of the bore with the flat at `drop` 2.4, 25 long, lying sideways in the club (placement as a 3 x 3 basis and offset); warns if the board is wider than the chord.
5. Spacer: a tube from the top of contact A to the break chamfer, length `bayTop - stackTop - 0.5`; warns "battery stack fills the grip bore" under 2.
6. The knob clamps the stack; charge through the knob hole.

### 5.6 Mass and balance

`massReport` (790 to 807): per part `shell = min(volume, area walls 0.42)`, `vol = shell + (volume - shell) infill / 100`, grams by `Orca3MF.MATERIALS[type].density` (PETG 1.27, TPU 1.21 fallback); centroid mapped to model z through `place` (flipped: `z - cz`); payload as one mass at one z; COG fraction against the length. README: "the scale has the last word". `commitLight()` (part3 49 to 53) recomputes mass and colours without a geometry build when only slot, walls, infill or payload change.

### 5.7 Plate layout and exports

`plateLayout` (760 to 780): parts sorted by diameter, greedy rows across `bedW` with 12 mm gaps, rows centred; `fitWarnings` flags a part taller than `bedH` or a set that does not share one plate. Exports (`SRC/part3.js` 69 to 169): 3MF through `Orca3MF.build` with one object per part named `tenon-<label>` from the full `PART_LABEL` map (line 70), STL zip with the print card and the design JSON, the print card with per part pose, walls, infill, layers and grams, slicer notes and assembly text, design JSON `{app: 'tenon-bench', v: 1, state}` with a migration for files from before the taper (line 149).

### 5.8 Constructions the first pass left out (checker, 2026-10-05)

Read from `SRC/part2.js` at the lines named; behaviour is inferred from the code unless marked.

| construction | lines | how it is made |
|---|---|---|
| body break near the tip | 494 | after the walk, a break with `zSplit + len + 30 > zEnd` is pulled up to `zEnd - len - 30` and warns "body break moved up, too close to the tip" |
| tip ring thickness check | 467 to 469 | the tip ring root is `min(Rend, outerR(zEnd - len - 1)) - ringWall` (`tipRingRoot`, 399 to 402); when the body inner wall at `len + 1` is within 0.3 of it, warns "tip ring thinner than the body wall" |
| neck ring check | 499 | "neck ring bore very small" when the neck ring radius is under 6 |
| knob rim rounds | 363 to 366 | top round (handle side) clamped to `Rk - Rroot - 1.2` so the bore mouth keeps 1.2 of wall; club side round clamped to `[0.5, Rk - 0.5]`; both trimmed when `rb + rt > H - 1` |
| knob charge hole | 384 to 385 | the 12 mm hole is clamped inside `min(Rroot - 1.5, Rk - rb - 1.2)` and warns "knob hole narrowed to fit the floor and the dome round"; a 0.8 chamfer sits at its outer edge |
| tip light window | 410 to 411, 421 | the threaded cup has a bore `Rpmin - plugWall` only when that is over 3, with its floor at `clamp(H - 3, 1.6, 4)`; "tip plug too thin" under a 6 minor radius |
| puck stack placement | 690 to 692 | puck B sits at `zH0 + tray.len + 0.6` (on top of the charger tray); puck A at `+ t + 1 + cell.len + 1` |
| puck outline | 682 to 689 | radius `Rb - clear/2`; notches `min(notchW, Rp)` wide and `min(notchD, Rp - 3)` deep at 0 and 180 deg; ear clipped and extruded `t` |
| spacer tube | 700 to 708 | outer `Rb - 0.25` with 0.6 x 45 deg chamfers at both ends, inner `max(3, min(Ro - 2.4, 6))`; length `bayTop - stackTop - 0.5`, floored at 2 with the warning "battery stack N mm fills the M mm grip bore, move the handle break up or use a shorter cell" |
| club outline | 89 to 106 | cubic Hermite from the neck (`slopeNeck` 0.17) to the widest point (slope 0) and on to the end (`slopeEnd` 0.38, negated); the handle is a linear taper from `dKnob` to `dNeck`, joined to the neck by a Hermite blend over `neck.blend` 8 mm |
| presets | 57 to 61 | pirouette 520 / 250 / 82 at 0.59 / 45, joint 294, handle break 160; delphin 520 / 215 / 85 at 0.55 / 46, joint 260, break 145; compact 490 / 230 / 78 at 0.59 / 44, joint 274, break 150 (length / handle / dMax at atFrac / dEnd) |
| mass fallback table | 792 | when `Orca3MF.MATERIALS` is absent (node), densities PLA 1.24, PETG 1.27, TPU 1.21, ABS 1.04, ASA 1.05, and 1.25 for an unknown type |
| plate rows | 760 to 780 | parts sorted by largest radius first; a row breaks when the next diameter plus the gap passes `bedW`; rows and items centred |


### 5.9 Print pose lesson: the owner flipped the handle (2026-10-05 save)

Source: the skills and design downloads reader of 2026-10-06 (`fab-knowledge:sources/downloads/skills-2026-10-06.md` section 4.1), with the contact numbers rerun for this record on 2026-10-06.

What the owner changed. All 11 object meshes are byte identical to the 09-29 save (reader, 4.1). The XML differs in four places:

| place | 09-29 save | 10-05 save |
|---|---|---|
| `3D/3dmodel.model` item 14, `tenon-handle` (163.4 mm tall) | identity transform | turned 180 deg about Y (`-1 0 0 0 1 0 0 0 -1`, with a 6.3e-05 rotation residue) |
| `Metadata/project_settings.config` `raft_layers` | 0 | 2, listed in `different_settings_to_system` |
| `Metadata/model_settings.config` plate `filament_maps` | `1 1 1 1` | `1 2 3 4` (`filament_map_mode` stays "Auto For Flush") |
| `Metadata/plate_1.json` | absent | present: per object bbox and area, layer height 0.24 after slicing |

The `filament_maps` change and `plate_1.json` come from slicing, not from the owner (inferred: under "Auto For Flush" the slicer assigns one tool per filament when it slices, `knowledge/references/print-forge/3mf-dialect.md` lines 151 to 152). The flip and the raft are the owner's.

The numbers, from `3D/Objects/tenon-handle_8.model` (58,968 vertices and 117,936 triangles, z -81.7 to 81.7, counted 2026-10-06; the reader's 15,802 vertices does not match this count):

| pose | bed contact, reader (faces within 0.25 mm of the bottom) | bed contact, rerun: within 0.25 mm / facing straight down | down-facing area steeper than 45 deg |
|---|---|---|---|
| bench export, knob end down (section 2, pose column) | 6.7 mm2 (computed, reader) | 7.9 mm2 / 0 mm2 (computed 2026-10-06) | 6.7 mm2 reader, 8.8 mm2 rerun (computed) |
| owner flip | 56.3 mm2 (computed, reader) | 56.3 mm2 / 56.3 mm2 (computed 2026-10-06) | 369.8 mm2 reader, 370.1 mm2 rerun (computed) |

The two reruns differ from the reader only in where a face counts as touching (the rerun counts the overhang only above the 0.25 mm band; "straight down" is a normal z under -0.99). On every definition the bench pose stands the 163.4 mm handle on less than 8 mm2 of plate, none of it flat, and the owner pose stands it on 56.3 mm2 of flat face.

The lesson. The owner took about 55 times more overhang area (6.7 to 369.8 mm2, reader) to get about 8 times the bed contact (6.7 to 56.3 mm2, reader), and still added a 2-layer raft under the whole plate. Bed contact outranks overhang for a tall part, which agrees with the pose tie-break in `knowledge/04-heuristics.md` (bed contact first, overhang second). The bench's `overhangAudit` (section 5.1 step 6) checks only the slope and ignores the first 1.0 mm, so it passed the pose the owner rejected. No check in the plan measures contact against height: CHK-PRT-12 only excludes the contact face from the overhang count, CHK-PRT-16 checks the build volume. The draft check CHK-PRT-17 in `docs/plan/CHECKS.md` section 9.2 takes this save as its origin; its threshold is unknown, since this save is its only data point (6.7 rejected, 56.3 accepted, no print outcome recorded for either).

For a port: score the handle's pose with bed contact first, report contact area and height beside each other on the plate readout, and offer the flip when the contact is under the threshold the check settles on. Whether the raft was needed at 56.3 mm2 is unknown.

---

## 6. UX anatomy

| element | content |
|---|---|
| header | hack.build mark, `TENON.bench`, tagline "a printable juggling club in pieces that screw together. make things. break things. repeat.", UNDO, REDO, OPEN, SAVE, GUIDE |
| steps | 1 CLUB, 2 JOINTS, 3 PARTS, 4 PRINT; PRINT switches the stage to the plate view and the others back to assembled (`go`, part3 359 to 367) |
| guide line | one sentence per step (part3 352 to 357) |
| stage chips | assembled, plate, explode, cut, compare, then iso, top, front, under |
| CLUB pane | PRESET (pirouette, delphin, compact; GHOST: FIRST PRINT, GHOST: PIN CURRENT), CLUB, BODY, TIP, POWER |
| JOINTS pane | NECK JOINT (bayonet or thread chips and fields), SPLITS, KNOB THREAD, TIP THREAD |
| PARTS pane | FILAMENTS (four slots with a clear flag), PARTS (slot, walls, infill per active part), PAYLOAD, MASS AND BALANCE |
| PRINT pane | PRINT REALITY (layer, resolution chips), PLATE (bed, gap), EXPORT (3MF PROJECT, STL ZIP, PRINT CARD, per part readout) |
| readouts | total mass against Henrys 218 to 220 g; balance and "Henrys clubs balance toward the body, about 55 to 60%"; per part height x diameter, layers, slot; "all N on one plate"; tallest of bedH |
| status | dims, mass, balance percent, tris, ms, fits bed, mesh current, warnings |

Viewer specifics (part3 171 to 346): the club lies across the stage (model z becomes world x); clear slots at opacity 0.42 with no depth write; cut is one clipping plane at y = 0 with double sided materials; explode spaces parts 45 mm along `AXIAL` with the handle fixed, and loose inserts (`RIDES_WITH` the handle) slide 46 mm sideways and tint 55 percent toward pink "so they read as separate pieces inside the grip"; the 18650 is a grey ghost cylinder between the pucks; compare draws `legacyState()` or a pinned design as a grey ghost (opacity 0.55) under the live club with knob faces aligned.

Commit model: `touch()` rebuilds live at 90 ms while a slider moves; `commit()` rebuilds at 200 ms and snapshots history (80 deep); `commitLight()` for mass and colour only.

What makes it excellent: one DOM free kernel runs in the page and in node; every joint is a field on a revolve, so the mesh is manifold by construction; every clamp states where the joint or break moved to and why; mass and balance are first class readouts against a real club; the compare ghost shows what changed since the first print; nothing is taller than the bed and all parts share one plate.

---

## 7. Tests and harness

| harness | what it does |
|---|---|
| `H/sweep.js` | 3 presets plus 60 random states over every slider range, joint mode thread on every fourth, break and power toggles on modular schedules, resolution cycling; per part directed edge pairing (each undirected edge once in each direction), degenerate triangles under 1e-14, positive volume; per profile no self intersection, positive area, no negative r, no zero thickness back tracking fin; failures to `/tmp/fail-<part>.json`. Rerun 2026-10-05: 63 cases, 0 fails, worst 147 ms (computed) |
| `H/smoke.py` | Playwright: example with zero warnings, every step, cut and explode shots, number field, thread mode, split toggles, undo and redo, four exports, JSON round trip, blank start, overflow at 390, 768, 1280, console errors; asserts 4 parts pane rows when unsplit, which went stale when the power parts arrived |
| `H/smoke_b.py` | the split, mid and resplit path with `BENCH.activeParts(state).length` as the expected count; the fix for the stale assertion |
| `H/export_default.js` | node export of the default design to `out/ship/tenon.3mf` and `tenon-stl.zip` |

The shipped failure: `H/export_default.js` maps names through `LABEL = {bulb, neck, handle, throat, knob, tip}`, which has no entry for `upper`, `tray`, `puckA`, `puckB` or `spacer`. The Oct 2 `tenon.3mf` therefore has five objects named `tenon-undefined`, and `tenon-stl.zip` has 7 members because the five undefined parts all wrote `tenon-undefined.stl` (`fab-knowledge:sources/latest/knuckle-tenon-gusset.md` section 2). The bench path in `SRC/part3.js` line 70 is correct, and the owner's save `F/examples/tenon-11part.orca232-save.3mf` carries eleven unique names. Lesson: node and browser exports are two code paths; an export completeness check (every object named, unique names, one STL per part) must run on both.

---

## 8. How to make a new thing this way

1. Describe a round part as one closed (r, z) profile and put every round feature on it as a radial field `f(theta, z)`.
2. Register each feature's edge angles so the columns land on them; never let a regular column sit within 1e-4 of an edge.
3. Step densely only inside feature bands and never across a band edge.
4. Make every retaining face a 45 deg wedge so the part prints on its end with no supports.
5. Put the spigot on the lower piece and the ring in the upper piece so threads print standing up.
6. Walk breaks until rings and chamfers clear by a stated margin; warn with the new position.
7. Audit the profile overhang after the first 1.0 mm.
8. Model mass as walls times 0.42 plus infill fraction and show balance against a reference object.
9. Keep the kernel DOM free and sweep it in node over random states with manifold, volume and profile checks.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (revolve route with radial fields and forced edge columns; ear clip extrude), `constraints` (effective and break walkers as clamps with reasons), `sim` (mass and balance), `hackbuild-3mf` (seed orca3mf, export completeness), `ui-core` (compare ghost, light commit), per `fab-knowledge:synthesis/mappings.md` line 150 |
| feature kinds | pocket, bore; kinds it needs: `thread`, `bayonet`, `groove` (M10-T16 admits thread and bayonet) |
| canon id | MISSING. `docs/plan/CANONS.md` section 8.3 lists "bayonet with ramp preload and detent gate" (TENON, CASK) and "two-start thread break" (TENON) with no ids, landing as the `bayonet` and `thread` kinds (D-059) at M10; section 2.3 rows "screws and threads" and "clutches, detents, bayonets" cover none today. No canon entry for the cone ceiling knob, the battery stack with wire contact pucks, or the mass and balance model |
| reference id | `joints/thread-break` and `joints/bayonet` (M10-T16; `joints/bayonet` is an INDEX id seeded from CASK as a tabslot misfit, rewritten per the M11 table); `surfaces/revolve-fields` proposed in `synthesis/mappings.md` line 150. None exists under `reference/` on 2026-10-05 (MISSING) |
| milestone | M10-T16 (TENON from a chase); revolve route parity M00-T05 (`tools/legacy/tenon-revolve-dump.mjs`); export completeness known-bad fixture M00-T09 and M00-T10 |
| checks | origin of draft CHK-PRT-17 (bed contact area of the export pose, section 5.9); the 2026-10-05 save is its first fixture |
| lineage rows | MISSING: no row in `lineage.json` for `SRC/part2.js` (revolve, thetaList, extThread, intThread, lugField, grooveField, massReport) or `H/sweep.js` |
