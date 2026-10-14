# SPOOL: how it is made

Record written 2026-10-05 from the original code. Slug `spool`. Family robots. The owner's slug SPOOL collides with an April 2026 "SPOOL, Sequenced Playback Over Open Logic" show controller (D-189 lists the collision); this record is the 12 servo humanoid.

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula or a value printed by the canonical page in the 2026-10-05 drive. "Stated" quotes BUILD.md. Units are mm, degrees, grams and N cm.

Short paths: `F` is `fab-knowledge:originals/spool/files/`; `SP` is `F/src/spool_parts.py`; `RT` is `F/src/route12.py`; `H` is `F/spool-robot.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "SPOOL / whole robot"; "12 joints, 12 GH-S37D servos, one per joint. Every part is the exported CAD, placed by the verified routing." |
| owner's slug | spool |
| canonical page | `H`, copied from `fab-work-directory:benches/spool/outputs/spool-robot.html`; byte-identical to `~/Downloads/spool-robot (9).html` |
| sha256 | e301ef720e9fb472d2faa840a33003551ceb2b013249af14e114ba1b2613d946 (188446 bytes, 625 lines; line 108 is the 160930 character payload) |
| date | 2026-07-30 15:24 (Downloads mtime); CAD zip entries 2026-07-30 15:11 |
| CAD bundle | `F/spool-cad.zip`, sha256 8206f46b92f3a3ed4c672181bf7cb67ac6a5b3bc23af5451fd280599a3a1fdfa: `spool_parts.py`, `route12.py`, `mkplan.py`, `sweep.py`, `assembly.json`, `geom.json`, `smoke.js`, `smoke2.js`, `BUILD.md`, and STL plus STEP for 13 shapes |
| runtime | three.js r128 classic script from cdnjs; payload JSON inline; JetBrains Mono from Google Fonts |
| hook | none; `smoke.js` and `smoke2.js` run the page script in a vm context |
| chat | "3D printed humanoid robot with micro servos", conversation 8fa309ce-737a-4aa9-b89a-df8a856a5acc |

### 1.1 Every revision found

From `~/Downloads` (downloads reader, SPOOL section, rechecked 2026-10-05).

| file | date | what |
|---|---|---|
| `spool (5).html` | 2026-07-30 11:11 | "18-DOF micro-servo humanoid", 265 mm |
| `spool-joint.html` | 11:48 | joint sim and part library; robot 455 g, segment 33 mm |
| `spool-robot.html`, `(1)` to `(8)` | 12:17 to 15:03 | whole robot revisions (12:18 legs splayed and hips doubled; 14:48 the floating spine) |
| `spool-mk2.html` | 13:32 | mk2: 8 joints, every axis lateral, 11 printed parts |
| `spool-robot (9).html` = harvest | 15:24 | canonical |

### 1.2 Why this revision

It is the newest and it carries the fixes for every fault the owner's screenshots and the checks found: legs that reached 6 mm past the centreline and passed through each other (12:18 screenshot), the torso and head hovering 3.2 mm over the waist and neck (14:48 screenshot, "the floating spine"), bolt circles over hollow shells, self tappers used as structural fasteners, and a cantilevered 3 mm shoulder tab. Its CAD bundle is complete and its plan, sweep and page share one face table. The drive on 2026-10-05 found no page errors.

Known drift:

- The shoulder face in the page has no forward offset: `F.t_shoR = face([TOR_SHO_X, 0, TOR_SHO_Z], ...)` (`H` 199), while the router has `face([TOR_SHO_X, SHO_FWD, TOR_SHO_Z], ...)` (`RT` 27) with `SHO_FWD = 30`, which is where the torso's shoulder shelves are (`SP` 276, 293 to 299). Found in the code on 2026-10-05; not checked against the render.
- The router's hip and shoulder faces do not sit on the CAD's bolt patterns (found in the code and confirmed by sectioning the shipped STLs on a scratch copy, 2026-10-05; not checked against the render). `geom.json` puts the hip face at `HIP_PAD_X 22` and the shoulder face at `TOR_SHO_X 50`, matching BUILD.md ("Hip pads sit 22 mm either side of centre", "50 mm out from the torso centre"). The shipped `pelvis.stl` has its hip pad tap holes centred at x plus and minus 14 (holes at 9 and 19, D1.65) plus a second clearance pattern at plus and minus 15 (holes at 10 and 20, which merge into D2.5 ovals at 19.55), from `pelvis_solid` (`SP` 264 to 267); the shipped `torso.stl` has the shoulder shelf pattern centred at x plus and minus 42 (`W/2 + 20`, holes at 37 and 47, `SP` 293, 299). Both are 8 mm inboard of the faces the plan mates to, so the hip saddle's inserts at 17 and 27 and the shoulder saddle's at 45 and 55 meet no hole. The fix is one source of truth: derive the face table from the CAD constants (as `X1`, `PAD_Z` already are) instead of a second literal.
- The generator's stall table (`SP` 409 to 448) is from an earlier layout: electronics 38 g (the page adds 58), a leg of 4 saddles, 4 yokes and 2 `link_18`, and a hip roll row, while the plan has 3 joints per leg, no links and no hip roll.
- The page header readouts are height 294, stance width 78, printed 205 g, total 313 g at READY (computed by the page); BUILD.md says 287 mm and 275 g; `spool_parts.py __main__` prints the constants "leg 118" and "height 240".
- BUILD.md "The joint" says the ears take M2 x 8 self tappers; "Fastening" and `SP` line 130 put M2 heat-set inserts (3.2 x 4.5) in the ears.
- `pelvis_solid` docstring (lines 258 to 259) says each hip roll servo tucks under the plate; the robot has no hip roll. The page still references `link_26`, `link_44` and twin joints (`H` 235, 256) that the plan does not use. `link_18` and `link_30` are exported but not in the BOM.

### 1.3 What is in `fab-knowledge:originals/spool/files/`

| path | what |
|---|---|
| `spool-robot.html` | the sim |
| `spool-cad.zip` | the CAD bundle as shipped |
| `BUILD.md` | build notes (byte-identical to the copy in the zip) |
| `src/spool_parts.py`, `route12.py`, `mkplan.py`, `sweep.py`, `smoke.js`, `smoke2.js`, `assembly.json`, `geom.json` | sources and plan, from the zip |
| `exports/gauge.stl`, `saddle.stl`, `saddle.step`, `yoke.stl`, `yoke_top.stl` | the fit gauge and the joint module |

Hashes: `fab-knowledge:originals/spool/SHA256SUMS`.

---

## 2. What it makes and for whom

A small humanoid on twelve PES GH-S37D 3.7 g servos, one per joint: hip pitch, knee and ankle pitch per leg, shoulder pitch and elbow per arm, waist yaw, neck pan. One universal joint module throughout: a saddle that holds the servo and a yoke that straddles it. No roll axes, so it stands, squats, leans, twists and poses and does not walk. For a maker who wants the smallest servo humanoid that is honest about which joints stall.

BOM (stated): printed saddle x6, saddle_M x6, yoke x5, yoke_M x5, yoke_top x2, pelvis, torso, foot x2, head_shell, hand x2, plus the gauge (24 parts, 12 shapes). Bought: 12 GH-S37D with 17 mm double horns, M2 x 8 self tappers x24, M2 x 10 cap plus nut x48, M2 x 6 with washer x12, M1.6 x 5 x48, 1S 400 mAh LiPo, 5 V BEC, 16 channel servo controller.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), waiting until the ASSEMBLING overlay hides. Files in `fab-knowledge:originals/spool/shots/`. No page errors.

| file | caption |
|---|---|
| `s01-ready-3q.png` | READY pose, 3/4 view: orange printed saddles and pads, dark yokes, translucent blue servos, shadow on the floor. Left: BUILD (height 294, stance 78, printed 205 g, total 313 g) and STATIC LOAD per joint in N cm against 4.9 with "29% margin at the worst joint (knee)". Right: POSE, WEIGHT ON, VIEW, DISPLAY, EXPLODE and the joint sliders by group with servo counts. |
| `s02-deep-squat-stall.png` | DEEP squat from the SIDE: knee 7.0 / 4.9 in red, ankle 4.0 amber, both knee yokes painted red; "knee stalls at 142% of rated torque in this pose". |
| `s03-salute-front.png` | SALUTE from the FRONT: shoulder pitch -150, elbow 120. |
| `s04-twist-right-foot.png` | TWIST with WEIGHT ON RIGHT FOOT, 3/4 view: waist 45, neck -35; loads recomputed with the right foot planted. |
| `s05-stand-explode-1.png` | STAND with EXPLODE 1.00: each body pushed 30 mm out along the line from the robot centre to its COM, so every saddle, yoke, servo and horn separates. |
| `s06-legs-closeup.png` | SQUAT, LEGS view: the stacked saddle and yoke modules of hip, knee and ankle. |

---

## 4. Code map

| area | file and lines |
|---|---|
| servo spec `S` | `SP` 22 to 32 |
| fits and fasteners, the P4 pattern | `SP` 35 to 46 |
| saddle frame limits `X0`, `X1`, `ZB`, `ZT`, `PAD_Z` | `SP` 48 to 54 |
| primitives `B`, `CZ`, `CX_`, `CY_`, `p4_x`, `p4_z`, `fil`, `save` | `SP` 57 to 98 |
| SADDLE | `SP` 102 to 155 |
| YOKE (and the bridged `yoke_top`) | `SP` 159 to 203 |
| twin saddle and yoke, angle, combo (defined, unused) | `SP` 207 to 238 |
| link | `SP` 242 to 253 |
| pelvis, torso, torso side and deck (unused), foot, head, hand | `SP` 257 to 363 |
| gauge (the +X end of a saddle) | `SP` 366 to 368 |
| mirrored left parts, BUILD list | `SP` 372 to 391 |
| mass and per-joint stall check | `SP` 393 to 448 |
| faces, `mate_k`, `pick` | `RT` 3 to 52 |
| the plan: which face mates which, quarter turns, limits | `F/src/mkplan.py` 1 to 35 |
| clearance sweep | `F/src/sweep.py` 1 to 61 |
| page: styles and panels | `H` 10 to 106 |
| page: payload decode, mass and signed tetra COM | `H` 112 to 144 |
| page: scene, shadows, materials | `H` 146 to 185 |
| page: faces and `mateK` (router maths) | `H` 187 to 219 |
| page: build the tree, mirror the left side | `H` 221 to 294 |
| page: joint sign calibration by probe | `H` 296 to 317 |
| page: `plant()` | `H` 319 to 340 |
| page: support-aware torque | `H` 361 to 383 |
| page: poses and loops | `H` 385 to 436 |
| page: UI, explode, readouts, verdict | `H` 438 to 556 |
| page: orbit, loop with ankle follow | `H` 558 to 621 |

---

## 5. Mechanisms and constructions

There is no circuit in the outputs; the BOM names a 16 channel servo controller.

### 5.1 Servo spec and the fit gauge (`SP` 22 to 32, 366 to 368)

GH-S37D: case 20.30 x 9.00 x 22.04; boss 3.46 tall, D7.60; spline D4.80; flange span 31.60 from z 15.30 to 17.80 (2.50 thick); flange hole pitch 27.20, hole 2.00; shaft 6.00 from the case end; horn 17.0 x 6.0 x 3.0 with an 8.40 hub; 3.70 g; stall 4.90 N cm. Case centre in x `CX = L/2 - SHAFT_END = 4.15` (computed). `FLG_BOT`, `FLG_PITCH`, `SHAFT_END` and `BOSS_D` are scaled from the vendor drawing, not measured (BUILD.md), so the first print is `gauge.stl`: the saddle's +X end only (`SP` 366 to 368). Check the servo drops in, the ears seat flush and a screw bites; correct `S` and rebuild (`SP` docstring).

### 5.2 Saddle (`SP` 102 to 155)

What it does: holds the servo. The servo drops in from +Y because the spine is on -Y only.

Frame: origin at the spline centre, +Z the shaft, +X along the case toward its long end, z 0 the case bottom. `PY = 9.00 + 0.70 = 9.70`, `YLIM = PY/2 + 1.90 = 6.75`, `X0 = -15.8 + 4.15 - 1.9 = -13.55`, `X1 = 15.8 + 4.15 + 1.9 = 21.85`, `ZB = -1.90`, `ZT = 15.30`, `PAD_Z = 6.70` (computed; `F/src/geom.json` agrees on X1, ZB, ZT, YLIM, PAD_Z).

Construction in order: two end blocks under the ear ends (each to 3.2 past the ear tip), filleted 1.5 on vertical edges; the -Y spine; a 1.9 floor; hollow the end blocks to a 1.9 shell; cut the ear recess (span plus 0.7, flange thickness plus 1.0) and the case pocket (20.30 + 0.70 by 9.70); a cable exit through the +X end; two M2 heat-set holes 3.2 x 4.5 at the ear pitch; a printed pivot stub D6.0 x 5 under the floor with a D8.2 x 1 shoulder and a heat-set hole for a retaining screw; a side pad 16 x 6.5 x 18 on the -Y spine with the P4 pattern as inserts; an underside pad 18 x 13.5 x 3.0 with the P4 pattern as M2 clearance holes and a relief around the stub; and the +X end pad with the P4 pattern as inserts.

Underside pad lesson (BUILD.md "Fastening"): at 6.5 thick it runs into the sweep of its own yoke's lower arm, which passes 5 to 8.2 below the floor, so it stays 3 mm and takes through bolts. The waist and neck must be bolted down before their servo goes in, because the nuts sit in the servo pocket.

### 5.3 Yoke and the bridged yoke_top (`SP` 159 to 203)

What it does: straddles the servo. The top arm captures the horn; the lower arm rides the saddle's pivot stub, so the far side of the joint is supported and the spline is not cantilevered.

Constants: horn seat `Y_ZT0 = 22.04 + 3.46 = 25.50`; top arm to `Y_ZT1 = 29.10`; lower arm from `Y_ZB0 = -10.10` to `Y_ZB1 = -6.90`; half width `Y_YL = 9.15`; spine at `X_SP1 = X0 - 3.65 = -17.20` ("must clear the saddle side pad through a full sweep"), pad plane `X_SP0 = -20.40`; arm reach `X_ARM = 17/2 + 3.4 = 11.9` (computed).

Construction: top arm, spine and lower arm, filleted 2.0 on x edges; horn capture pocket (17.5 x 6.5 x 3.2), hub relief D9.2, a D2.2 horn screw hole on the axis and four D1.6 horn screw holes at x -6.5, -4.0, 4.0 and 6.5; pivot bore `6.0 + 2 x 0.30 = 6.6` with a D4.7 retainer counterbore; the mouth opened so the yoke slides over the servo; the P4 pattern through the spine pad. `yoke_top` adds a 30 x 18.3 x 6.5 bridge over the horn with the P4 pattern as inserts, so a part can sit on the shaft axis (waist and neck). Verified clear -120 to +120 against the saddle and the servo (stated). Shaft to shaft pitch along a limb `X1 - X_SP0 = 42.25` (computed; `geom.json`).

### 5.4 One square interface at any quarter turn (`SP` 46, 75 to 84)

`P4 = [(-5,-5), (5,-5), (-5,5), (5,5)]`: four M2 on a 10 mm square, so parts mate at any 90 degrees. The pattern is cut as clearance (2.20), tap (1.65) or insert (3.2 x 4.5 in a 6.5 pad) depending on which side of the joint can be reached after assembly. Faces in use: `sadX` (saddle end, along the limb), `sadS` (saddle side, across), `sadB` (saddle underside, along the shaft), `yoke` (yoke pad, drives the next segment), `ytop` (bridged yoke top).

### 5.5 Mate by face and quarter turn, scored (`RT` 7 to 52, `F/src/mkplan.py`)

A face is a point and a normal (`RT` 15 to 31). `mate_k(parent, fp, fc, k)`: `R = axang(n_p, k pi/2) . rot_between(n_c, -n_p)`, `t = R_p (p_p - R p_c) + t_p`. In the antiparallel case `rot_between` picks a fixed perpendicular axis (x unless the vector is near x), and the page copies the same choice or "the whole chain comes out rolled by 180 degrees" (`H` 203 to 213).

`pick(parent, pf, cf, ws, wo, of, tidy, align, want, signed)` tries k from 0 to 3 and scores: the child's shaft axis against a wanted world direction (absolute, or signed), a named face normal against a wanted direction, an optional local axis alignment, minus 0.02 x drift from the parent position along the tidy axes; the best k wins. The hip uses `signed=True` so the module hangs away from the body (the 12:18 fix).

The plan (`assembly.json`, 12 nodes): pelvis root; right hip pitch on `hipR` (k 2), knee (k 0), ankle pitch (k 0), foot (k 2); waist on `pelTop` with `sadB` (k 0, yoke_top); torso on the waist's `ytop`; neck pan on `t_top` (yoke_top); head; right shoulder pitch on `t_shoR` (k 2), elbow, hand. Limits: hip -95 to 55, knee 0 to 110, ankle -55 to 55, shoulder -160 to 90, elbow 0 to 135, waist plus and minus 60, neck plus and minus 80.

Spacing rules (stated): hip pads 22 either side of centre, set by the feet overlapping at anything narrower; shoulder shelves 30 forward of the leg plane and 50 out, because forward keeps an arm out of a leg; knee capped at 110 because the last 15 degrees bring the foot within 3.3 of the hand.

### 5.6 Clearance sweep (`F/src/sweep.py`)

Assemble at given angles from the plan; the left leg is an x mirror of the right; the left arm is mirrored about the torso plane with the waist yaw removed and reapplied. Sample every 4th unique vertex per part, skip same-group pairs and the `MATED` list, AABB reject at 16 mm, brute force minimum distance. Gap in the method: `MATED` is keyed by part type, not by instance (`F/src/sweep.py` 45 to 50), so every saddle against every yoke, every saddle against the torso and pelvis, and every yoke against the torso are skipped wherever they are, including the left leg's saddles against the right leg's yokes and an arm saddle against the torso side. Servos and horns are not in the sampled set (`NM`, line 9). The tightest gaps below therefore exclude the pairs most likely to touch.

| pose | tightest gap |
|---|---|
| standing | 9.5 |
| ready | 7.8 |
| squat | 8.5 |
| arms forward, arms back | 9.5 |
| elbow at 135 | 5.4 |
| hip at either limit | 8.1 |
| waist 45, neck 80 | 9.5 |
| everything at once | 6.5 |

(stated, BUILD.md "Spacing"; the driver that prints this table is not in the zip.)

### 5.7 Fastening by back reachability, and the seat check (BUILD.md)

- Unreachable backs (saddle end and side pads, yoke bridge, servo ears): M2 heat-set inserts, hole 3.2 (knurl minus 0.2), 4.5 deep for a 4 mm insert, in a 6.5 pad. Reachable backs (pelvis, torso, head, foot, saddle underside): M2 through bolts and nuts. Reason: self tappers in printed pilots strip within roughly twenty insertion cycles.
- The shoulder was a cantilevered 3 mm tab carrying a whole arm; the one-piece torso now ties the shelf into the side wall and the deck with gussets (`SP` 292 to 299).
- Seat check: every bolted pair measured surface to surface after assembly; all eleven seats at 0.00. It caught the pelvis, torso and head shells hollow under their bolt circles (now solid landing plates, for example the 22 x 22 plate in `pelvis_solid`, `SP` 268 to 271) and the waist and neck assembled with the plain yoke, leaving torso and head hovering by the 3.2 bridge thickness. Method (from the robots knowledge file): sample triangle interiors and query a KD tree; vertex to vertex distance is meaningless for flat faces in contact. The seat check script is not in the zip.
- PLA creeps under a holding load: saddles, yokes, pelvis and torso in PETG or ABS; PLA is fine for the head shell and hands.

### 5.8 Planting, ankle follow and support-aware torque (`H` 296 to 383, 590 to 611)

Joint sign calibration (`H` 296 to 317): rotate each joint 0.12 rad, measure a probe point on the foot, hand or head, and flip `sign` if it moved against the wanted direction.

`plant()`: every leg axis is lateral, so the support foot's tilt is one rotation about world x; take it off the whole robot, then drop the robot so the lowest foot touches y 0. Ankles follow `-(hip + knee)` unless an ankle slider is dragged.

Mass per part from the payload; COM per part from the signed tetrahedron volume integral of the mesh (`H` 132 to 141); servo 3.7 g, horn 0.4 g, electronics 58 g added to the total.

Torque per joint: sum each body's moment about the joint axis. If the joint's subtree contains a planted foot, the load comes from the ground side: everything except the subtree, halved in double support. Capacity `4.9 x servos`. Bars and yokes: over 0.8 amber, over 1.0 red (and the yoke turns red). Verdict: margin, "is the limit at" over 80 percent, "stalls at" over 100 percent.

Static estimate in the generator (`SP` 430 to 448): ankle pitch whole body with a 15 mm COM lead, knee at a 20 degree bend, hip pitch lifting the swing leg 30 degrees, hip roll lean 12 mm, shoulder and elbow with the arm straight; flags OK under 75 percent of stall, TIGHT under 100, STALL over. BUILD.md: worst static joint 82 percent; live, standing costs the knee about 77 percent and the DEEP squat about 119 percent. The drive measured 142 percent for DEEP (computed by the page, `s02`). The arms hang 30 forward and pull the COM 14 ahead of the leg line, so the soles are offset 14 forward.

### 5.9 Body parts (`SP` 242 to 363)

| part | construction | interface |
|---|---|---|
| pelvis | 60 x 26 x 3.2 plate filleted 4, a 30 x 13 centre cut, a 3 x 11 rear wall; two 18 x 18 x 3.2 hip pads under the plate; a solid 22 x 22 landing plate over the centre cut | hip pads: P4 tapped 1.65 at x plus and minus 14 and P4 clearance at plus and minus 15 (see the drift note); waist: P4 clearance at the centre |
| torso | one piece 44 x 24 x 46, wall 2.4, filleted 4, front, back and side windows; a 26 x 20 floor and roof 3.8 thick; per side a shelf 22 x 20 x 3.2 at (plus or minus 42, 30, 34), a 34 x 20 x 5.5 shelf web, a 30 x 3 x 16 front gusset, a 3 x 20 x 16 wall plate, a 3 x 40 x 16 side rib running back to the body, and a 10 x 30 x 4.5 deck tie | P4 clearance to the waist and to the neck, P4 clearance under each shelf |
| foot | 34 x 50 x 2.8 sole centred 14 forward, filleted 6, a 14 x 24 window; toe and heel ribs 5 x 6; a 24 x 24 x 4.4 boss and a 26 x 26 x 0.8 cap at y 5; four D7 x 1.0 recesses under the sole corners at (plus or minus 14, 14 plus or minus 24) | P4 clearance up through the boss to the ankle yoke |
| head shell | 34 x 30 x 27, wall 2.0, filleted 5, open at the bottom; a 22 x 7 eye slot in the front at 0.62 of the height; two D3 holes in the top at x plus and minus 11; a 24 x 20 x 4 base plate | P4 clearance to the neck yoke top |
| hand | a 3.4 x 18 x 20 palm plate; two 22 x 4.2 x 14 fingers at y plus and minus 5.5 with 9 long tips turned 30 degrees inward | P4 clearance through the palm, mates the elbow yoke |
| link (`link_18`, `link_30`) | two 3.4 x 20 x 19 end plates, two 2.8 x 15 side rails, a 2.4 floor; D8 lightening holes every 12 for longer links, none for 18 and 30 because `range(1, int((L - 12) // 13))` is empty at those lengths | P4 clearance at both ends; exported, not in the plan |

The left side prints as `mirrored(fn)`, the same solid mirrored in the XZ plane, which is also how the page builds it.

### 5.10 Pose loops and joint smoothing (`H` 386 to 436, 590 to 611)

Poses are target tables: READY (shoulder -14, elbow 40, hip -14, knee 28), SQUAT (hip -52, knee 104, shoulder -70, elbow 30), DEEP (hip -72, knee 110, shoulder -90, elbow 20), REACH, SALUTE, TWIST (waist 45, neck -35). Every frame each joint eases toward its target by `min(1, 9 dt)` of the gap, is clamped to its limits, and is written as `sign x val` on the pivot. With ANKLES FOLLOW on, each ankle target is `clamp(-(hip + knee))`, which keeps the sole parallel to the pelvis; dragging an ankle slider turns it off. Loops (stopped by `prefers-reduced-motion`): WAVE (right shoulder -120, elbow `50 + 34 sin 5t`), WALK (hip `-22 sin(3.2t + i pi)`, knee `max(0, 40 sin(3.2t + i pi + 0.7))`, ankle `0.7 (knee - hip)`, arms `22 sin` in counter phase, elbows 24), SWAY (`b = sin 1.2t`: hips, knees and ankles nod by 3, 4 and 2 degrees, waist `18 b`, neck `-12 b`). WALK moves the legs in the air of a planted robot; it does not translate the body. `targetsFor` also defines a ONE LEG pose (left hip -45, knee 78, ankle -30) with no button.

### 5.11 Mesh transport and COM (`H` 116 to 144)

Each part arrives as int16 vertices at a fixed 0.01 mm quantum (`pos = v x 0.01`) with u16 indices and its mass `g` precomputed by the generator (volume x 1.24 x 0.80). The COM per part is the signed tetrahedron integral `sum(v_i (a + b + c) / 4) / sum(v_i)` over faces against the origin, which is exact for a closed mesh and needs no voxelising. Total mass adds 3.7 g per servo, 0.4 g per horn and 58 g of electronics.

---

## 6. Fits and print settings

| item | value | source |
|---|---|---|
| clearance | 0.35 per side | `SP` 35 |
| wall | 1.90 | `SP` 36 |
| M2 | free 2.20, tap 1.65, head 4.20 | `SP` 37 to 40 |
| heat-set | 3.2 x 4.5 in a 6.5 pad | `SP` 39 |
| pivot | stub D6.00, 0.30 clearance (bore 6.6) | `SP` 41 to 42 |
| horn pocket | horn plus 0.5, hub plus 0.8 | `SP` 183 to 185 |
| mass model | PLA 1.24 g/cm3 x 0.80 fill | `SP` 43 to 44 |
| print | four perimeters minimum on saddles and yokes; yoke printed standing on its pad face so layers run across the spine; 100 percent infill around the knee and ankle pockets | BUILD.md "Print settings" |
| material | PETG or ABS for saddles, yokes, pelvis, torso; PLA for head shell and hands | BUILD.md |

---

## 7. UX anatomy

Dark shell (`--bg #0d1113 --accent #2ee6b8 --warn #ff5c4d --mid #f0a03a`), JetBrains Mono, floating HUD panels over a full-window canvas with shadow-mapped key light (PCF soft, 2048 map), a teal rim light and a warm fill.

- Boot overlay ASSEMBLING.
- Left HUD: title and subtitle; BUILD (height, stance width, printed, total mass); STATIC LOAD per joint with a bar and N cm against capacity; the verdict line.
- Right HUD: POSE (STAND, READY, SQUAT, DEEP, REACH, SALUTE, TWIST) and loops (WAVE, WALK, SWAY); WEIGHT ON (BOTH FEET, RIGHT FOOT, LEFT FOOT, FLOATING); VIEW (FRONT, 3/4, SIDE, BACK, LEGS, HEAD); DISPLAY (SERVOS, PRINTED, WIREFRAME, GRID, ANKLES FOLLOW, LOAD COLOUR); EXPLODE; joint sliders grouped BODY, HEAD, LEG R, LEG L, ARM R, ARM L with servo counts.
- Bottom hint: drag orbit, wheel zoom, right drag pan. `prefers-reduced-motion` stops the loops. Under 900 px the panels stack.
- What makes it excellent: every part on screen is the exported CAD placed by the same face-and-quarter-turn maths the router used; the robot stays planted on its support foot as joints move; the yoke of a joint over stall turns red in the model itself.

---

## 8. Tests and harness

| test | what | result |
|---|---|---|
| `sweep.py` | sampled vertex clearance per pose | stated table, section 5.6 |
| `smoke.js`, `smoke2.js` | the page script in a vm context with jsdom and a `FakeRenderer`; 40 then 45 frames per pose; reads `mH`, `verdict`, `tqlist` | not rerun; BUILD.md says this is how "the two undeclared variables in the last build should have been caught" |
| `spool_parts.py __main__` | volumes, masses, the per-joint stall table | not rerun (needs cadquery) |
| seat check | surface to surface on every bolted pair | stated 11 of 11 at 0.00; script not in the zip |
| drive 2026-10-05 | six shots | no page errors |

---

## 9. Port map

| item | value |
|---|---|
| packages | `motion` (mate by face and quarter turn, `pick` scoring, plant, ankle follow), `sim` (sampled clearance sweep, seat check), `catalog` (GH-S37D with fields scaled from the drawing marked), `profile` (insert sizes, PLA creep rule), `mesh` (cadquery primitives, mirrored left parts) |
| feature kinds | `horn` (capture pocket with four screws), `hinge` (pivot stub far side), `screw` (insert or through bolt by back reachability), `pocket` (servo, drop in from +Y), `boss`; MISSING: a typed `mount` interface with quarter-turn symmetry (PLAN line 608 names SPOOL as a source), and a landing plate under a bolt circle |
| canon id | MISSING as a mechanism; "saddle and yoke" is listed in CANONS section 8.3 as a reference, "seat check script missing" |
| reference id | `joints/saddle-yoke` (handoff INDEX, seed; M11 writes it for `horn` and `screw`) |
| milestone | M11 (reference `joints/saddle-yoke`, CHK-ASM-01 driver reach and CHK-ASM-03 servo pocket insertion); M16 (registry row, `designs/spool/legacy/`) |
| lineage row | MISSING |
