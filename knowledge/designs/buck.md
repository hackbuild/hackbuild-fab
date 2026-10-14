# BUCK: how it is made

Record written 2026-10-06 from the original code. Slug `buck`. Family robots: a talking deer trophy head that hangs on pegboard, with an organic head grown from a signed distance field on manifold-3d, a servo jaw that slides onto its horn along a swept path, an ESP32-S3 and an I2S amp on rails inside the neck, and four PETG slots.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Measured" numbers come from the headless drive of the shipped page on 2026-10-06 (config `fab-knowledge:originals/buck/shots/_drive.json`, log `_drive-log.json` beside it; Chrome headless with SwiftShader, so every time in ms is this host only). "Computed" numbers were computed on 2026-10-06 inside that drive from the meshes the bench built, by the script in the `b06` shot of the config. "Bench text" means the page says it in its own copy.

Short paths: `F` is `fab-knowledge:originals/buck/files/`, `SRC` is `F/src/`. The page is one file with eight inline scripts and no source package. `SRC` holds the four app scripts cut out of the page byte for byte, each starting with the page's own header comment line, so line numbers in this record match the line numbers of the skills reader (`fab-knowledge:sources/downloads/skills-2026-10-06.md` section 4.3), plus `SRC/page-head.html`, everything before the first script (CSS, markup, fonts).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | BUCK, talking trophy head bench (`BUCK . bench`) |
| owner's slug | buck |
| canonical file | `F/buck.html` |
| sha256 | 9386ee690df90c75d992f5bd8a5506e504d509bf2fb58d40dede30bf5215d2f5 |
| bytes | 1840669 |
| date | 2026-10-06 12:08 (mtime of `~/Downloads/buck.html`, byte identical; copy in `fab-knowledge:evidence/x/downloads/skills-2026-10-06/designs/buck.html`) |
| runtime | three.js r128, JSZip 3.10.1, manifold-3d 3.5.4 classic script with its wasm as base64 (`BUCK_WASM_B64`), the print-forge `orca3mf.js`, then `sdf.js`, `engine.js`, `app.js`; four font faces inlined; opens from `file://` offline |
| print target | Flashforge Creator 5 Pro 0.4 nozzle, `0.24mm Standard @FF C5`, preset pattern `Generic {TYPE} @FF C5P`, bed 256 x 256 (`SRC/engine.js` lines 47 to 48) |

### 1.1 Every revision found

| date (mtime) | file | sha256 (first 8) | what changed |
|---|---|---|---|
| 2026-10-05 18:21 | `talking-deer-print-lab.html` | 9b13ea91 | not BUCK and not the owner's bench: a fixed mesh viewer of the same subject, no checks, sage palette, "has not been printed" (skills reader section 4.4); kept as evidence only, never a sample |
| 2026-10-06 12:08 | `buck.html` | 9386ee69 | this record: engine v1, four PETG slots with accent inlays, ESP32-S3 plus MAX98357A, M3 jaw pivot screw, seven fit checks |
| 2026-10-06 15:04 | `buck (1).html` | 272872ee | `engine.js` header becomes "BUCK engine v2"; "every part is a single material"; sculpted head field with published landmarks; printed pivot pin with a barb, printed pegboard hooks, nose cap on a muzzle peg, press-in eyes; checks grow to 14 names |
| 2026-10-06 17:15 | `buck (2).html` | 40d3459d | adds the NULLLAB NS4168 amp and speaker kit on posts and spigots, a controller plinth, screwdriver reach checks; 22 check names |
| 2026-10-06 18:15 | `buck (3).html` | be3e035e | adds a hollow jaw with a 45 deg roofed void, three M3 x 16 head screws, a 1.2 mm boss wall check, a plate bar; 25 check names; welcome names an RP2040-Zero as a second controller |

The three later revisions were found in `~/Downloads` while this record was written; copies are in `F/later/` with their hashes in SHA256SUMS. They were compared by script header, check names and welcome copy only (counts computed by grep on the extracted scripts, 2026-10-06). Their engine is a rewrite (`engine.js` 961 lines here, 1085 in `(1)`, 1271 in `(3)`, counted). This record does not describe them.

### 1.2 Why this revision

`buck.html` is the revision the skills reader of 2026-10-06 read and the one this fold was asked to record. It drives clean: it boots with no page errors, the buck preset builds with all 7 checks clear and no warnings, and the stag preset does the same (measured). The newest revision, `buck (3).html`, is the likely canonical once read, because it removes the M3 jaw screw and adds the checks that v1 lacks (eye pockets blind, boss wall, screwdriver reach). A re-record against `buck (3).html` is owed; until it lands, port the mechanisms below from this file and read the v2 check list as the to-do list.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `buck.html` | the shipped bench |
| `src/sdf.js` (64 lines), `src/engine.js` (961), `src/app.js` (632), `src/orca3mf.js` (299) | the app scripts cut out of the page (line counts by wc) |
| `src/page-head.html` | the page before its first script: `:root` tokens, CSS, markup, four inlined font faces |
| `later/buck (1).html`, `later/buck (2).html`, `later/buck (3).html` | the later revisions of 1.1, not yet recorded |

Hashes: `fab-knowledge:originals/buck/SHA256SUMS`.

---

## 2. What it makes and for whom

A small talking deer trophy you print, wire and hang on pegboard (bench text). An SG90 or MG90 servo swings the jaw; an ESP32-S3 board and a MAX98357A I2S amp drive a 28 x 6 mm speaker inside the neck; one USB-C cable runs out the back. For a maker with a four-toolhead printer who wants an animatronic that prints with no supports and assembles with five screws.

Presets (`SRC/app.js` lines 14 to 19): buck (defaults), stag (scale 1.26, muzzle 1.06, crown 1.05, crown antlers, spread 1.1), doe (no antlers, ears 1.2, scale 1.1, muzzle 0.95), spike (spike antlers, scale 1.06).

Defaults (`SRC/engine.js` lines 28 to 49): scale 1.15, tilt 12 deg nose down, wall 2.4; jaw open 22 deg, gap 0.5, tongue on; servo SG90; board S3MINI 22.6 x 18.0; amp Adafruit 3006 19.4 x 17.8; speaker 28 x 6; printed eyes; ears with inner inlays; fork antlers; shield plaque 8 thick with a 14 margin, hook holes 4 in apart at 7.0 mm, keyholes and trim on.

Hardware tables (`SRC/engine.js` lines 10 to 26), all as the code states them, no drawing cited (tier inferred):

| row | values |
|---|---|
| SG90 / MG90 | body 22.8 x 12.4 x 22.7; flange at 15.9, 2.5 thick, 32.3 long, holes 27.8 apart; shaft 6.0 off centre; tower 11.8 dia to 26.6; spline top 29.8; horn hub 7.0 x 2.1, plate 1.6 thick, 15.5 long, 6.4 to 4.2 wide; screw head 4.8 x 1.6 |
| boards | ESP32-S3 SuperMini 22.6 x 18.0; Waveshare ESP32-S3-Zero 23.5 x 18.0; Seeed XIAO ESP32S3 21.0 x 17.8; Adafruit QT Py ESP32-S3 22.8 x 17.8; custom |
| amps | MAX98357A Adafruit 3006 19.4 x 17.8; generic purple 18.6 x 15.6; custom |

Parts and print pose for the buck preset at draft (computed from the drive; pose from `SRC/engine.js` lines 857 to 868 and the print card, `SRC/app.js` line 344):

| object | parts (slot) | print pose | size x, y, z | bed contact | overhang (app rule) |
|---|---|---|---|---|---|
| head | head (1 cream), nose (4 pink), eyes (4) | neck rim down, nose up | 74.1 x 105.3 x 138.6 | 816.0 mm2 | 1104.4 mm2 |
| jaw | jaw (1), tongue (4) | mouth face down | 65.9 x 91.4 x 19.9 | 2833.7 mm2 | 394.8 mm2 |
| mount | plaque with fin, rails and tray (3 black), trim (4) | flat back down | 123.2 x 138.0 x 76.3 | 12130.0 mm2 | 1519.5 mm2 |
| antler L, R | antler (2 white) | flat | 17.0 x 66.9 x 4.8 | 448.1 mm2 each | 0 |
| ear L, R | ear (1), ear inner (4) | flat | 19.8 x 44.5 x 3.6 | 532.1 mm2 each | 249.2 mm2 each |

Bed contact is the area of faces within 0.25 mm of the bed facing down (normal z under -0.9); overhang is the app's own rule (section 5.11). All seven objects pack on one 256 plate; the stag preset needs two (measured, status chip "2 plates"). The bench's grams readout gave slot 1 about 76 g, slot 2 about 3, slot 3 about 76, slot 4 about 2 (measured readout; flat factor, section 5.12). Plaque 123 x 138 mm; triangle count 45k at draft; rebuild 994 ms with the shell cached (measured).

---

## 3. Shots

Driven headless on 2026-10-06 (1280 x 860). Copies in `fab-knowledge:originals/buck/shots/`. The driver's 15 s ready wait timed out on the first build (boot to ready 20,624 ms, measured); the first shot's own poll waited for `BENCH.ready`, so every shot is of a built model.

| file | caption |
|---|---|
| `b01-welcome.png` | Welcome card over the dimmed stage: `BUCK.bench`, one paragraph on servo, ESP32-S3, MAX98357A and the multicolour 3MF, four step tiles (head, guts, mount, print), presets BUCK, STAG, DOE, SPIKE. Status: head 74 x 105 x 139 mm, 45k tris, 2586 ms, "fits: 7 checks clear". |
| `b02-buck-assembled.png` | The buck in iso on the pegboard: cream head with pink nose, eyes and inner ears, white fork antlers in their pedicles, black shield plaque with a pink trim ring hanging on two steel peghooks. Rail at SHAPE, ANTLERS, EARS + EYES. Jaw bar at the foot of the stage. |
| `b03-explode-xray.png` | EXPLODE with X-RAY: head and jaw translucent, the jaw dropped forward and down with the white horn in its groove, the blue servo on the fin, the green ESP32 and purple amp on their rails, the speaker tray, the four rim bosses, ears and antlers lifted off their mortises. |
| `b04-guts-section-jaw-open.png` | GUTS with SECTION at x = 0 and the jaw at 22 deg: the cut head shows the wall, the hinge pad, the cavity caps under the forehead, the fin with the servo, and the jaw swung open below the throat notch. CUT X bar visible. |
| `b05-mount-pegboard-front.png` | MOUNT, front view: the head centred on the shield plaque, the two hook holes 4 in apart on the 1 in pegboard grid with the hooks through them, the keyholes lower down. Rail: PLAQUE (shield, oval, rounded), PEGBOARD with the 1 in grid note. |
| `b06-print-bed-overhang.png` | PRINT on the print bed: head standing rim down with the cavity, bosses and pads visible, plaque on its back with the fin, rails and tray standing up, jaw on its mouth face, antlers and ears flat. Rail: FIT CHECKS (7 OK, one INFO "jaw arms at +-20.0 mm, room for +-26.4"), FILAMENTS with four PETG slots and role selects. |
| `b07-stag-preset.png` | The stag preset: larger head (82 x 117 x 155 mm), crown antlers; checks still 7 clear, room for +-30.0; status chip "2 plates" in amber. |

---

## 4. Build pipeline and code map

No build script ships. The page inlines, in order: three r128 (603,463 characters), JSZip 3.10.1 (97,650), manifold-3d 3.5.4 as a classic script (82,454), the wasm as base64 (722,009), then the four app scripts (counted). `boot()` decodes the wasm, calls `ManifoldModule({wasmBinary})` and `setup()`, applies the buck preset and builds (`SRC/app.js` lines 620 to 630).

| file | lines | role and key ranges |
|---|---|---|
| `SRC/sdf.js` | 64 | `ell` (8 to 13), `rcone` after Inigo Quilez (15 to 26), `smin` (27), `makeHead` (30 to 60); exports `BUCKSDF` |
| `SRC/engine.js` | 961 | `HW` (10 to 26), `defaults` (28 to 50), maths (53 to 75), `cleanMesh` (79 to 125), `build` (128 to 957): shell (183 to 231), jaw frame (233 to 271), arm inset (273 to 310), servo and horn (312 to 334), jaw (336 to 388), shell features (390 to 494), speaker tray place (496 to 525), shell boolean (527 to 535), board slots (538 to 579), spine fin (581 to 637), tray (639 to 655), plaque (657 to 736), flat parts (739 to 806), hardware stand-ins (809 to 821), checks (824 to 856), print poses and meshes (857 to 909), slide-on audit (910 to 948); exports `BUCK` |
| `SRC/app.js` | 632 | presets (14 to 26), undo (28 to 34), build loop (36 to 67), viewer (73 to 298), plates (300 to 327), exports (329 to 398), BENCH hook (399 to 414), BOM, assembly and wiring text (416 to 431), talk, mic, wiggle (433 to 482), UI (484 to 617), boot (619 to 630) |
| `SRC/orca3mf.js` | 299 | the print-forge `assets/orca3mf.js`; identical to `packages/3mf/seed/orca3mf.js` apart from the header comment line and one trailing newline (diff, 2026-10-06) |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The organic head as a signed distance field

What it does: describes the whole head (neck, skull, cheeks, jaw mass, forehead, muzzle) as one smooth field so the shell, its inner wall and every surface point the engine needs come from the same function.

Construction (`SRC/sdf.js` `makeHead`, lines 30 to 60). Mounted frame: x right, y out of the wall, z up, mm; d > 0 outside.

1. The neck is a round cone from (0, -14, -10) radius 40 x neck to (0, 32, 10) radius 25, squashed to 0.86 in x (lines 39 to 40). It starts behind the plaque so the trim at y = 0 cuts a clean rim.
2. The skull pieces are posed about a pivot at y 46, z 6 and turned nose down by `tilt` (`headLocal`, line 35): cranium ellipsoid at (0, 54, 22) radii 31 x crown, 26, 24 x crown; cheeks (0, 64, 4) 27 x cheek, 27, 16; jaw mass (0, 50, 0) 25 x cheek, 15, 13; forehead (0, 72, 19) 19, 22, 12; muzzle a round cone from (0, 70, 11) radius 17 forward 44 x muzzle to radius 10 (lines 42 to 47).
3. The pieces join with a polynomial smooth min, k 14, 12, 10, 10, 12 in that order (lines 48 to 52, `smin` line 27).
4. A flat chin and throat floor at local z = -10, ramped off behind y 58 over 16 mm, gives the jaw a printable face and the head a clean underside (lines 54 to 57).
5. Everything scales by `s` (line 37 and 58). The field is close to a true distance near the surface only (header comment lines 2 to 4), which is what the level set and the wall offset need.

Limits: the ellipsoid distance is the first order bound `k0 (k0 - 1) / k1`, so offsets far from the surface are not true distances; a wall much thicker than a few mm would thin unevenly (inferred).

### 5.2 Field to mesh on manifold-3d

What it does: turns the field into two closed manifolds, the outer skin and the cavity, in the browser, cached so a non-shape edit does not regrow them.

Construction (`SRC/engine.js`):

1. Bounds: a 3 mm scan of half the field (x >= 0) for d < 3, mirrored in x, padded 3 mm, y from -3 (lines 215 to 221).
2. `Manifold.levelSet(p => -d(p), bnd, edge, 0)` with edge 1.25 mm at draft and 0.75 mm at fine (line 137, 226), then `simplify` at 0.05 or 0.025 mm ("level sets are dense and uniform; simplify keeps them within tol of the surface", line 225).
3. The cavity is a second level set of `dIn = max(d + wall, nose plane, roof caps)` (lines 196, 214, 227). The nose plane, at 45 deg (normal (0, 1, -1)), sits 6 mm behind the nose cut so the cavity stops short of the nose part (lines 193 to 196).
4. Cache: the key is `JSON.stringify([shape, wall, edge])`; on a hit the two manifolds are reused, on a miss the old ones are deleted first (lines 184, 222 to 229). The skin is trimmed at the plaque plane y = 0 (line 230).
5. Every manifold made in a build is pushed to `track` and deleted at the end (lines 131 to 132, 954).

Measured cost on this host: level sets 1,610 ms on the first build and 58 ms with the cache; the whole first build 2,586 ms, a cached rebuild 994 ms, the stag build 3,443 ms (measured, drive log).

### 5.3 Hollow shell printed rim down: 45 deg cavity caps

What it does: makes the inside of the head printable rim down with no support by capping any part of the cavity roof that leans past 45 deg.

Construction (`SRC/engine.js` lines 197 to 214):

1. Forehead: scan the roof height `zTop(y)` along the centre line in 0.4 mm steps down from 95 x S; find the highest roof point; walk forward in 0.5 mm steps and, at the first step where the roof falls faster than slope -1, add the plane `(0, r45, r45)` through that point (line 205).
2. Cheeks: at two heights (z = 0 and half the roof peak), find the widest half width by bisection, walk forward, and at the first step where the width shrinks faster than 1 mm per mm add a mirrored pair of 45 deg planes `(+-r45, r45, 0)` (lines 207 to 212).
3. `dIn` takes the max of the cavity field and every cap (line 214), so the level set of the cavity already carries the flat 45 deg faces.

Bosses hung off the inside of the wall get the same rule: `rampBoss` hulls a boss with a copy of itself shifted `len` down the print axis (-y) and `len` outward, which leaves a 45 deg underside; the outer skin trims the hull (lines 394 to 397). Used for the hinge pads (len 8), mortise bosses (depth + 2) and eye bosses (5).

### 5.4 The servo jaw on one axis

What it does: hinges the jaw on the servo horn on the right and an M3 pivot screw on the left, on one axis, with the jaw region cut from the same skin as the head.

Construction (`SRC/engine.js`):

1. Hinge: local y = 50 x S, z = chin floor + `hbMin`, where `hbMin = max(Rb + wall + g + 0.6, servo W / 2 + wall + g + 0.8, 12.5 x S)`, Rb 8.5 (lines 234 to 239). The disc of radius Rb stays with the shell.
2. Jaw region in the (y, z) plane: below the mouth line (through the hinge raised 3.5 to a point 4 mm past the muzzle tip), in front of the rear ray at `-90 + open + 4` deg, in front of the hinge, minus the Rb disc (lines 240 to 261). Its twin dilated by the gap `g` plus the throat wedge the jaw swings into is cut from the head (lines 262 to 271).
3. Arm inset: the arm footprint (hub radius 6.6 and a bar 13.3 long at -20 deg) is sampled at eight poses, closed, half open, open, and slid 3, 6, 10, 15 and 21 mm along the insertion path; each sample point inside the head bisects the cavity half width; `aMin` is the narrowest (lines 276 to 299).
4. Required half width `aReq = (tR - 0.1 + hubH + towerTop + tL + 1.0) / 2` with right arm 5.2 and left arm 4.0 thick; `a = min(aMin - g - 0.2, aReq + 0.6)`; if `aMax < aReq` the build errors "head too narrow at the jaw hinge for the servo: raise scale or cheek width (short by N mm)" (lines 300 to 310). Buck preset: arms at +-20.0 mm, room for +-26.4 (measured, INFO row).
5. The servo stand-in is built from the `HW` row at the hinge with its shaft on the axis; the horn plate is the hull of the hub and the plate tip, pointing along the arm at -20 deg (lines 313 to 333).
6. Jaw solid: skin intersected with the jaw prism, plus a right arm (5.2 thick, inside face at `a`) and a left arm (4.0), minus the swept pocket, groove and pilot (5.5), with a 1.25 radius pilot for the M3 pivot on the left (lines 337 to 366).
7. Tongue inlay: a hull of a small circle and an ellipse 34 x 9 (times S) on the mouth face, 1.2 deep; the inlay is EPSI (0.004 mm) smaller than its pocket on every face so the two never overlap (lines 367 to 386, EPSI line 142).
8. Shell side: hinge pads radius 7 on both cheeks, ramped 8; an M3 clearance hole (radius 1.7) through the left pad; a teardrop access hole in the right cheek to reach the horn screw (lines 398 to 411).

### 5.5 The jaw slides onto the horn: swept pocket and swept overlap check

What it does: lets the jaw go on after the head is assembled, up and back through the mouth, so the right arm captures the horn already pressed on the spline; then proves the path is clear.

Construction (`SRC/engine.js`):

1. Insertion direction 135 deg in the jaw's (y, z) frame, "up and back" (lines 248 to 249).
2. Every cutter that must pass the horn is the hull of its section and a copy translated along that direction: the servo stub pocket, radius 13.4, swept 60 mm (line 354); the horn groove, the horn section offset 0.25 round, swept 40 mm (line 357); the screw head pocket, radius head + 0.4, swept 40 mm (line 359). Each is extruded across the right arm's thickness (lines 355 to 360) and subtracted (line 364).
3. Check (lines 848 to 853): the jaw near the hinge is translated back along the insertion direction by 1.5, 4, 8, 14 and 22 mm; at each step it is intersected with the head near the hinge, the parts fixed to the mount, and the horn; the worst volume is reported; pass under 0.5 mm3. Over 0.05 mm3 the finding names the body, the first travel that hit and the hit's bounding box.
4. The arm inset of 5.4 step 3 already sampled the slid poses, so the arms are sized to pass before the check runs.

Assembly order the print card gives (`SRC/app.js` lines 423 to 428): servo on the fin with no horn; boards and speaker in; head over the fin, four screws from the back; drive the servo to closed, press the horn on through the mouth, horn screw through the right cheek hole; slide the jaw up and back so the right arm captures the horn; M3 pivot through the left cheek.

### 5.6 Swing and fit checks by intersection volume

`SRC/engine.js` lines 824 to 856. Everything that can touch the jaw is clipped to a 72 mm box about the hinge, and the jaw to a box 16 mm smaller, before any boolean (lines 834 to 837).

| check | rule | buck preset |
|---|---|---|
| jaw at 0, 50 and 100 percent of `open` | jaw rotated about the hinge, intersected with the head and with the mount plus servo; pass under 0.5 mm3; over 0.05 mm3 the bounding box of each hit is kept | 0 mm3 at 0, 11 and 22 deg (measured) |
| horn sits in the jaw groove | horn against jaw plus tongue; pass under 0.3 mm3 | 0 (measured) |
| servo clear of the head | servo against the head near the hinge; pass under 0.3 mm3 | 0 (measured) |
| jaw slides onto the horn | 5.5 step 3; pass under 0.5 mm3 | 0 (measured) |
| head slides onto the mount | 5.7; pass under 0.05 mm | 0 (measured) |
| fit errors | "head too narrow at the jaw hinge for the servo", "speaker does not fit in the neck", "ESP32 board does not fit in the neck", "amp board does not fit in the neck" (lines 309, 512, 555, 556) | none (measured) |

A failing check becomes a warning with its volume (line 855); the rail shows OK or HIT per check and FIX per error (`SRC/app.js` lines 577 to 583).

### 5.7 Slide-on audit: 0.4 mm raster

What it does: proves the head can slide straight onto the mount along +y (out of the wall) without hitting anything already fixed to the plaque.

Construction (`SRC/engine.js` lines 910 to 948):

1. A grid in (x, z) at 0.4 mm over the field bounds plus 5 mm.
2. Every head triangle is rasterised into the grid keeping the smallest y per cell (`yMin`, the head's first surface met while sliding home).
3. Every fixed body (the mount parts, then the servo, ESP32, amp and speaker stand-ins) is rasterised keeping the largest y per cell (`yMax`) and which body set it. The horn is left out: it goes on after the head (comment line 936).
4. A cell overlaps when `yMax - yMin > 0.05`, ignoring cells with `yMax <= 0.05`; the worst overlap, its x and z, and the worst per body are reported. Pass under 0.05 mm; a fail warns "head hits mount, servo while sliding on (N mm at x X z Z)".

The fin is cut to the same rule before the audit runs: for each z row at 0.75 mm the fin is marched forward in 0.5 mm steps until the cavity closes within `g` at three x samples, and the fin profile follows that line (lines 613 to 631). The audit catches what the cut misses (boards, speaker, rails).

### 5.8 Inside the neck: ESP32-S3 seat, amp seat and speaker tray

1. Centre fin 3.0 thick in x, its position set by the servo stack from the right arm inward (`xs`, line 306); web from the plaque to the servo flange corners, a strip out to the rail ends, rounded about the hinge with radius 12.2 and cut in the head's frame so the jaw sweep clears it (lines 581 to 603); a servo window 0.6 oversize, flange pilots radius 0.9, two zip tie slots (lines 605 to 637).
2. Boards slide in edge first, no headers (bench text): the controller on the left face of the fin, the amp on the right. PCB 1.6 thick at 3.6 off the fin with 4.2 of components; each board's height is the highest z, searched down in 0.5 mm steps, where the whole board envelope plus 2.8 mm clears the cavity by `g + 0.5` (lines 540 to 554, `cavFree` 502 to 507).
3. Rails per board edge: a bar from the plaque (y -0.5, "grows off the plaque so it prints without a ledge") to the board end, run 0.6 into the fin "so the two never share a face", with a slot 0.2 wider than the PCB on each side, open at the front; solid below y 10 is the board stop (lines 559 to 578).
4. The controller's USB-C faces the plaque; a slot through the plaque straight behind it (hull of two radius 4.6 circles 4.4 apart) and a groove down the back to the bottom edge carry the cable (lines 713 to 720).
5. Speaker tray: the lowest z, searched up in 0.5 mm steps, where the tray box (speaker + 5.2 wide, + 2.0 long, floor 1.4, lip 1.2) clears the cavity (lines 497 to 512); walls with inward lips and a front kerb with a 45 deg back so it prints (lines 639 to 655); grille slots 1.6 wide at 3.2 pitch, cut through the throat and the tray floor so the speaker fires down (lines 514 to 525, 651). Buck preset: tray floor at z -17, controller centre at z 18.5, amp at z 18 (measured).

Wiring the bench prints (`SRC/app.js` lines 429 to 431): servo signal GPIO 7; servo + 5V (USB); amp VIN 5V; amp GND and servo - to GND; BCLK GPIO 5, LRC GPIO 6, DIN GPIO 4; SD and GAIN open; LED eyes GPIO 8 through 220 ohm. Bench text: "pins are a suggestion for an S3; any free GPIO works. keep off the strapping pins 0, 3, 45 and 46." No ESP32-S3 datasheet is cited in the page (tier inferred until a vendor page is cited).

### 5.9 Mount: plaque, pegboard holes and the locating lip

`SRC/engine.js` lines 657 to 736.

1. Outline around the neck slice at y 0.35 plus the margin, at least wide enough for the hook holes (`pitch/2 + holeD/2 + 7.3`): shield (hull of five circles radius 7, point at the bottom), oval or rounded rectangle (lines 659 to 677). Front edge bevelled 1.2 (line 680).
2. Hook holes at `+-pitch/2` with `pitch = pitchIn x 25.4`, so the two holes sit a whole number of inches apart on the 1 in pegboard grid (lines 663, 699 to 702; bench text). Buck preset: holes at x +-50.8, z 43.0 (measured). Keyholes radius 4.3 with a 9 mm slot and a 3.2 deep pocket behind, skipped when they would land under the neck (lines 703 to 712).
3. Locating lip: the cavity slice at y 2.2 offset in by `g` and by `g + 1.8`, extruded 1.8 forward, notched round each rim boss (lines 686 to 694). The neck rim drops over it.
4. Four rim screw bosses inside the neck at 50, 130, 230 and 310 deg, found as the farthest cavity contour point along each ray and set 2.6 inward; boss radius 3.8, pilot radius 1.3, 9.5 deep; plaque holes radius 1.7 with a 3.2 radius counterbore 3 deep (lines 412 to 431, 697).
5. Trim inlay: a ring between offsets -4.2 and -6.0 of the outline, 1.2 deep; the trim part is EPSI smaller than its channel and steps round every hole by 1.6 (lines 682 to 685, 722 to 732).
6. The mount object is the union of plaque, fin, tray and both rail sets, minus every plaque hole and the trim channel (lines 734 to 736).

The viewer draws a 16 x 14 in pegboard on the 1 in grid with two peghooks, aligned so the hook holes land on board holes (`SRC/app.js` lines 158 to 189).

### 5.10 Flat parts: antlers and ears in mortises

1. Mortise and boss (`SRC/engine.js` lines 441 to 450): pocket = tenon + 0.22 each side, 0.6 deeper than the tenon; boss = tenon + 2.6 each side, 2.4 deeper; the boss is ramped (5.3). Antler sockets sit on the crown found by `surf`, a march and bisection along a ray from an inside point (lines 155 to 160, 456 to 463); ear sockets likewise (464 to 471).
2. Antlers: skeletons of Bezier capsules (spike one beam; fork a beam and a tine; crown a beam and three tines), radii clamped at 1.25 minimum, 4.8 thick with a stepped top chamfer only so nothing overhangs (`flatSolid`), and a 6 x 8.6 tenon (lines 740 to 784). Right side mirrored.
3. Ears: outline `w = We/2 sin(pi t)^0.75 + (1 - t) 2.4` over 30 x 15 (times size and S), 3.6 thick, 5.2 x 7.6 tenon; the inner ear is an inlay 1.2 deep, offset 2.6 in from the rim, EPSI smaller than its pocket (lines 785 to 805).
4. Eyes: printed discs radius 4.2 x size on ramped bosses, or holes for 3 mm or 5 mm LEDs (lines 482 to 494). Nose: the skin in front of a plane 10 x S behind the muzzle tip, as its own part shifted EPSI (lines 529, 534).

### 5.11 Print poses, mesh clean and the overhang readout

1. Poses (`SRC/engine.js` lines 857 to 868): head rim down (rotate x 90, y becomes z), jaw with its mouth face down (Rodrigues alignment of the mouth normal to -z), mount on its flat back, flat parts as built. Each object's print mesh is shifted to min z 0 and centred (lines 900 to 905).
2. Mesh clean (`cleanMesh`, lines 79 to 125, after `simplify(0.001)` at line 874): up to 8 passes that merge vertices of edges shorter than 1e-7 mm (squared length under 1e-14) and flip the long edge of any zero area cap (twice area squared under 1e-12) to the neighbour's far vertex when that keeps the mesh manifold; then compact. "inlays sit EPSI inside their pockets so this cannot make parts overlap" (comment line 873).
3. Overhang readout (`SRC/app.js` lines 608 to 617, colour 237 to 243): a print face counts when its normal z is under -0.72 and its lowest vertex is above 0.4 mm. On the plate view those faces turn amber. The rule flags a face whose normal is within 43.9 deg of straight down, that is a face within 43.9 deg of horizontal (computed, acos 0.72).

Limit found by the drive: the readout sums parts of one object separately, so the underside of an inlay resting on its host counts as overhang. Each ear reports 249.2 mm2, which is the inner ear's floor (298 mm3 / 1.2 mm is 248 mm2, computed). The total readout of 35.2 cm2 for the buck preset includes those 498 mm2 (computed).

### 5.12 Exports and the grams estimate

`SRC/app.js` lines 300 to 398.

1. Plates: objects sorted by footprint area, shelf packed on the bed with a 6 mm margin and a 7 mm gap, each tried as is and turned a quarter (lines 301 to 327).
2. 3MF per plate and 3MF per part through `Orca3MF.build` with the four slots, printer and process names, the preset pattern, `writeFilaments` and the layer height; parts carry their slot (lines 330 to 337, 368 to 386). Every export first rebuilds at fine and puts the draft setting back (`ensureFresh`, lines 57 to 67).
3. STL zip: one STL per part named `object__part__slotN.stl`, plus `print-card.txt` and `design.json` `{app: 'buck-bench', v: 1, state}` (lines 387 to 397).
4. Print card: the Orca3MF card plus ORIENTATION ("no supports anywhere; brim only on the head if your bed needs it"), HARDWARE, ASSEMBLY and WIRING (lines 342 to 348, 417 to 431).
5. Save: inside a claude.ai artifact, through `window.claude.use('downloads')`, wrapping any file that is not zip, txt, json or png in a zip; otherwise an anchor download (lines 349 to 366).
6. Grams: `volume / 1000 x density x 0.55` per slot (line 587). A flat factor; TENON's shell plus infill model (`fab-knowledge:originals/tenon/RECORD.md` section 5.6) is better. Do not port the factor.

### 5.13 The talking jaw

`SRC/app.js` lines 433 to 482.

| mode | rule |
|---|---|
| talk | speech synthesis at pitch 0.8; a syllable envelope from vowel groups, 0.19 s per syllable at amplitude 0.55 to 1.0, 0.06 s per space and 0.28 s per punctuation mark; each syllable a half sine 0.25 s long; a word boundary event forces 0.8 for 140 ms |
| mic | microphone RMS through an analyser (fft 1024), gate 0.015, gain 9, clamped to 1, smoothed 0.35 per frame |
| wiggle | `0.5 - 0.5 cos(2 pi 0.8 t)` for 2.5 s |

All three drive `VIEW.jaw`, clamped to `0..open`, which rotates the jaw group about the hinge (lines 435, 291). The firmware side is not in the page.

---

## 6. UX anatomy

| element | content |
|---|---|
| header | hack.build mark, `BUCK . bench`, tagline "talking trophy head, servo jaw, pegboard mount. make things. break things. repeat.", UNDO, REDO, OPEN, SAVE, GUIDE; ink bar with a 3 px pink rule (`SRC/page-head.html` line 38) |
| steps | 1 HEAD, 2 GUTS, 3 MOUNT, 4 PRINT; done steps get a green number (page-head line 49; shots b04 to b06) |
| guide strip | one line per step (`SRC/app.js` lines 486 to 490) |
| stage | void with a 26 px pink grid at 14 percent (page-head line 55); camera chips iso, front, side, top, under; mode chips assembled, explode, print bed, x-ray, section, hardware, pegboard; legend of the four roles with slot colours, plus overhang amber on the print bed; BUILDING flag; CUT X bar; jaw bar with slider, text, TALK, MIC, WIGGLE |
| welcome | paper card with an 8 px pink block shadow, four step tiles, four presets (page-head lines 121 to 129) |
| rail | 350 px paper, 3 px ink border (line 75). HEAD: SHAPE (scale, muzzle, neck, crown, cheeks, nose down, wall), ANTLERS, EARS + EYES. GUTS: JAW (swing, clearance, tongue), BOARDS, SPEAKER, WIRING table. MOUNT: PLAQUE, PEGBOARD. PRINT: FIT CHECKS, FILAMENTS (four slots, role selects), PRINT (draft or fine mesh, layer, bed, slicer profile names), EXPORT (3MF plates, 3MF per part, STL zip, print card), readout, HARDWARE |
| status | ink strip in VT323: head dims, tris, ms, then chips "fits: N checks clear" or "N fit problems", plates count (amber over 1), draft or fine mesh (amber when stale) |
| type and colour | Permanent Marker, Special Elite, VT323, IBM Plex Mono, all inlined; `--pink #FE0386`, `--cream #f5f0e6`, `--paper #fffdf7`, `--ink #1a1a1a`, `--void #0a0a0a`, amber `#ffb020` for overhang (page-head lines 15 to 20) |
| mobile | under 820 px the rail is 290 px; under 640 px the rail moves under the stage at 46 percent height and the legend and jaw text hide (lines 130 to 131); reduced motion honoured |

Viewer specifics (`SRC/app.js` lines 73 to 298): model frame z up under a root group turned -90 deg about x; creased normals averaged only across faces within 38 deg, so the skin reads smooth and the cuts stay crisp (lines 123 to 145); x-ray sets head, jaw, ears and antlers to opacity 0.22 with no depth write; section is one clipping plane on x; explode eases 0.18 per frame to fixed offsets (head up and back, jaw forward and down, antlers and ears outward); hardware stand-ins in fixed colours (servo blue, ESP32 green, amp purple). Orbit: left drag rotates, right or shift drag pans, wheel zooms, double click refits.

Commit model: a slider previews nothing; `change` commits, which bumps the revision, snapshots after 400 ms (60 deep) and builds after 320 ms; a build in flight queues the next (lines 28 to 55). A slot colour or role change recolours without a build (lines 540, 556).

BENCH hook (lines 399 to 414): `state`, `result`, `build`, `preset(name)`, `set(path, value)`, `exportBytes(kind)` returning base64 for 3mf, parts, stl, card and json, `view`, `ready`.

What makes it excellent: an organic, sculptural part built and checked in the browser from a few named parameters, with no BRep; the shell, cavity, caps, bosses and the fin profile all read one field, so a shape change moves every fit together; every motion the assembly needs (jaw swing, jaw slide-on, head slide-on) is a check with a volume or a distance and a named body; every part prints with no support and the bench says why for each one.

---

## 7. Tests and harness

None ship with the page. The BENCH hook is the only test surface; the drive of section 3 used it. The checks in 5.6 and 5.7 run on every build.

Gaps a port must close, found while writing:

| gap | evidence |
|---|---|
| no node or headless sweep over presets and random states | no harness in the page or in Downloads |
| the overhang readout counts inlay floors resting on their host part | 5.11, ear 249.2 mm2 (computed) |
| hardware rows (SG90, boards, amps) cite no drawing | `SRC/engine.js` lines 10 to 26 |
| the ESP32-S3 strapping pins cite no datasheet | `SRC/app.js` line 430 and bench text |
| grams use a flat 0.55 factor | `SRC/app.js` line 587 |
| the driver's 15 s ready wait is shorter than the first build on SwiftShader | drive log, ready 20,624 ms |

---

## 8. How to make a new thing this way

1. Write the organic form as one field: ellipsoids and round cones joined by a smooth min, posed in a local frame, with flat planes intersected where the part must sit or mate.
2. Grow the skin and the cavity with `Manifold.levelSet` at a draft edge, simplify within a stated tolerance, and cache both by a key of the shape parameters.
3. Before the cavity level set, scan its roof and side walls and cap them with 45 deg planes, so the shell prints rim down with no support; give every boss on the inside wall a 45 deg ramp by hull.
4. Cut moving parts from the same skin, and cut the gap-dilated twin plus the swing wedge from the host.
5. For a part that slides into place, sweep each cutter along the insertion direction by hull, and check the path by intersection volume at sampled travels.
6. For a body that slides over fixed parts, rasterise both along the slide axis and compare first-hit and last-hit depths per cell.
7. Size the inside parts by searching the field (board heights, tray depth, arm inset), and turn a failed search into a FIX message that says what to change.
8. Make inlays EPSI smaller than their pockets so the mesh cleaner can never make parts overlap.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (an SDF level set route does not exist; the `MeshRoute` union of D-053 and `docs/plan/PACKAGES.md` line 402 has none; owner decision D-230 holds the default: BUCK's head enters as an imported mesh only), `geom` (CrossSection hulls and offsets for jaw region, arms and outlines), `checks` (swing and slide-on volumes, raster slide audit), `catalog` (SG90, ESP32-S3 boards, MAX98357A rows), `3mf` (the seed `orca3mf.js`, byte identical), `ui-core` (jaw drive, talk envelope, creased normals) |
| feature kinds | pocket, bore, inlay; kinds it needs: a swept insertion pocket, a mortise with a ramped boss, a hollow shell with capped cavity |
| canon id | MISSING. `docs/plan/CANONS.md` line 1240 holds the substrate part source (pegboard) in the backlog with COTTER as its only design; BUCK is the second pegboard design (1 in grid, 4 in hook span). No canon for an organic shell, a servo jaw or a slide-on audit |
| checks | second origin for CHK-ASM-02, -03, -10 (swept insertion pocket with volume at sampled travel) and CHK-ASM-11 (jaw clear at three swing poses, volumes reported); slide-on raster audit listed as a candidate in CHECKS.md section 9.9; the 45 deg cavity caps generate what CHK-SHP-03 checks |
| reference id | MISSING; none under `reference/` on 2026-10-06 |
| milestone | none until D-230 is answered; the ESP32-S3 row waits in M08-T04 for a vendor datasheet page (`docs/plan/milestones/M08-board-catalog.md`) |
| lineage rows | MISSING: no row in `lineage.json` for `sdf.js` or `engine.js` |
| skills reader | `fab-knowledge:sources/downloads/skills-2026-10-06.md` section 4.3 and ranked items 2 to 5 |
