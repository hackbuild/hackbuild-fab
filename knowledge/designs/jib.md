# JIB: how it is made

Record written 2026-10-05 from the original code. Slug `jib`. Family robots. JIB is the lasercut member of the DAVIT family: same job (a servo arm on a PVC mast), cut from one sheet of 3 mm ply instead of printed.

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula or a value printed by the page in the 2026-10-05 drive. "Stated" quotes BUILD.md or the sheet's score text. Units are mm, degrees, grams and kg cm.

Short paths: `F` is `fab-knowledge:originals/jib/files/`. `H` is `F/jib.html`; `M` is `F/jib_mount.scad`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "JIB . bench sim" (title); "lasercut servo arm on a PVC mast, DAVIT family . hack.build" |
| owner's slug | jib |
| canonical page | `H`, copied from `fab-work-directory:benches/jib-davit-lasercut/outputs/jib.html` |
| sha256 | fd968e5721bac20b7c72a4552275f26b48fdbb10ef122b01c92f4249c57cc331 (46254 bytes, 617 lines; line 91 is the 20676 character `DATA` part table) |
| companions | `F/jib.svg` (534e7e7c4e7f...), `F/jib_mount.scad` (8bd722f8ecc6...), `F/BUILD.md` (88ec1d17490e...) |
| date | unknown; the harvest copies carry mtime 2026-09-14 19:47 (copy date). Chat "Laser cut robot arm with PVC pole mount", conversation 6323ca11-c27c-422b-ab16-56b748acfe84 (`fab-work-directory:CHATS.tsv`) |
| runtime | three.js 0.160.0 ES module from cdn.jsdelivr.net (`H` line 89); needs the network once |
| hook | none |

### 1.1 Every revision found

One. The downloads reader found no JIB file in `~/Downloads` (the one name hit is an unrelated image), and a fresh `find` to depth 3 on 2026-10-05 returned the same. M16 cites the same `jib.html` sha256 (fd968e57...).

### 1.2 Why this revision

It is the only one, and it is complete: a cut sheet with a fit coupon, a printed mount in OpenSCAD with STLs for three pipe sizes, and a sim whose part outlines are the sheet's polygons. The drive found no page errors.

### 1.3 What is in `fab-knowledge:originals/jib/files/`

| path | what |
|---|---|
| `jib.html` | the sim |
| `jib.svg` | the 340 x 246 cut sheet, one right arm |
| `jib_mount.scad` | the clamshell mount source |
| `BUILD.md` | layers, order of work, servos, sim notes |
| `exports/jib_mount_15in_shellA.stl`, `jib_mount_15in_shellB.stl`, `jib_mount_key.stl` | the 1.5 in mount set as rendered (the 1 in and 2 in sets stay in the bench folder) |

Hashes: `fab-knowledge:originals/jib/SHA256SUMS`.

---

## 2. What it makes and for whom

One 3 DOF arm plus a gripper on a PVC mast: an MG996R class standard servo at the shoulder in a printed clamp, three 9 g micros at elbow, wrist and grip. The arm plates are cut from one 340 x 246 sheet of 3 mm ply (or acrylic); the only print is the clamshell mount and its two keys. No hardware beyond the servo bags. The left arm is the same sheet mirrored so the pocket engraves face the servos. For a maker with a laser and a small printer who wants an arm in an afternoon; `sheet-design.md` names the rule "print the part that clamps a round thing, cut everything flat".

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), 6 s wait (no hook). Files in `fab-knowledge:originals/jib/shots/`. No page errors.

| file | caption |
|---|---|
| `j06-hover-card.png` | Default pose (shoulder -20, elbow -45, wrist 35, grip 18) on 1.5 in pipe: birch plates stacked in parallel bands, micro servo boxes, the dark clamshell mount. Hovering UP draws its cut outline in the bottom-left card: "UP 9.4 g . 3 mm ply . cut outline". Torque bars 25, 55, 34 percent; pinch 563 g stall, 338 g working; tip y 206, z -147, reach 253; lateral 71.4. |
| `j02-preset-reach-payload-300.png` | REACH preset (all zero, grip 30) with a 300 g payload. |
| `j03-pair-hail-trace.png` | PAIR on (mirrored second arm and second cradle), TRACE on, HAIL preset: "STALL ELBOW, WRIST" in red. |
| `j04-folded-elbow-wrist-stall.png` | Elbow and wrist at -100 with 300 g: elbow 179 percent and wrist 105 percent of stall, both bars red, tip trace line from the previous pose. |
| `j05-pair-default-300g.png` | Both arms back at the default pose with 300 g: shoulder 73 percent amber, elbow 180 and wrist 118 percent red. |
| `j07-cut-sheet-svg.png` | `jib.svg` rendered: UP with the standard horn bone pocket and D15 hub hole, FORE, HAND, JAW and FIX JAW with micro cross pockets, two PILLARs, six KEY wedges, DISC, and the COUPON strip with slot gauges 2.7 to 3.0, a case cutout and both horn pockets; score text with the build rules along the bottom. |

---

## 4. Code map

| area | file and lines |
|---|---|
| tokens and layout | `H` 8 to 48 |
| panel markup (MAST, POSE, LOADS, TORQUE, foot note) | `H` 55 to 86 |
| part table `DATA` (outer, holes, mass per part; `meta`) | `H` 91 |
| constants: pipes, bands, link lengths, servo masses, stall defaults | `H` 96 to 103 |
| polygon centroid with holes subtracted | `H` 106 to 123 |
| 2D transform, rect, segment intersection, point in polygon, `polyHit` | `H` 127 to 162 |
| scene, lights, materials | `H` 165 to 185 |
| plate extrusion, servo box, horn disc | `H` 187 to 214 |
| lateral offset `x0()` | `H` 216 |
| arm build: joint groups, bands, parts per joint | `H` 219 to 252 |
| pose and bands | `H` 254 to 263 |
| mast and cradle stand-in | `H` 266 to 293 |
| forward kinematics, torque, contact | `H` 296 to 336 |
| torque bars, pinch, warnings, tip readout (`solve`) | `H` 339 to 383 |
| sliders, volts, micro, pair, trace, pipes, presets | `H` 386 to 433 |
| tip trace ring buffer | `H` 436 to 453 |
| damped camera, pick, wheel zoom to cursor, isolate, card | `H` 456 to 575 |
| boot and loop | `H` 578 to 614 |
| mount parameters | `M` 12 to 31 |
| bowtie key profile and channel | `M` 33 to 36, 50 to 53 |
| teardrop | `M` 39 to 42 |
| half shell with crush ribs and lugs | `M` 44 to 68 |
| servo cradle | `M` 70 to 79 |
| shellA, shellB, key | `M` 81 to 110 |

---

## 5. Mechanisms and constructions

There is no circuit.

### 5.1 Horn as the only bearing between sheet parts (sheet, `F/jib.svg`; sim `H` 219 to 252)

What it does: each joint turns on the servo's own output. A plate carries a servo in a through cutout; the next plate carries that servo's horn in an engraved pocket and is clamped to it by the bag horn screw. There is no printed or cut pivot pin anywhere, which is the sheet rule "lasercut pegs are cams, not journals".

Construction:

1. Micro cutout 23.1 x 12.7 for a 22.8 x 12.4 case (0.15 per side, `meta.mic.cutL`, `cutW`); two 1.7 pilots at plus and minus 13.85 from the cutout centre for the bag flange screws (`meta.mic.pilot`, `pilot_d`).
2. Horn pocket: black filled evenodd path in layer `POCKET`, engraved 2.0 deep for the micro cross and 2.4 deep for the standard bone (score text line 2 and BUILD.md "Layers"). Engrave before the through cut.
3. Standard horn on UP: hub passes a D15 hole, DISC goes on top under the M3 horn screw, the bone pocket keys the horn (BUILD.md step 6).
4. Plates stack in parallel bands along the mast normal: `BAND = {UP 0, FORE 7.2, HAND 14.4, JAW 21.6}` (`H` 97), so each plate sits one band above the plate it hangs from.

Link lengths: `L1 = 110` (shoulder to elbow), `L2 = 80` (elbow to wrist), `GX = 46` (wrist to jaw pivot) (`H` 98). Micro servo boxes sit at x 104.7 on UP, 74.7 on FORE and 40.7 on HAND (`H` 231 to 238), each 9.15 below its plate band.

Limits: no out-of-plane load path except the horn and screw; a standard horn screw is the shoulder's only retention.

### 5.2 Gripper: pillars, fixed jaw and wedge keys (sheet; `H` 237 to 245)

Two PILLARs stand in slots in HAND and carry FIX JAW 4.2 above the moving jaw plane (`meta.JAW_GAP 4.2`); wedge KEYs with a 5.2 to 3.6 taper lock the pillar tabs (score text line 7). The sheet cuts six KEYs (`QTY KEY x6`, `H` 101), BUILD.md says four lock the tabs, so two are spares. MOVJAW rides the grip servo horn in a cross pocket. Jaw length 52 (`meta.JAW_LEN`). Both jaws carry a row of saw teeth (visible in `j07`).

Pinch readout (`H` 367 to 368): `pinchG = stallMic / 3.2 x 1000`, a 3.2 cm effective jaw arm; at SG90 4.8 V stall 1.8 that is 563 g, 338 g working at 60 percent (computed by the page).

### 5.3 Coupon first (sheet)

The COUPON strip carries slot gauges at 2.70, 2.80, 2.90 and 3.00, a micro case cutout and both horn pockets. Procedure (BUILD.md step 1): cut it on a scrap of the actual stock, adjust kerf until the pillar tab is snug by hand in one slot and both horns seat flush, then cut the sheet. Score text line 3: "pick the slot that press fits your stock, test both horn pockets, tune engrave power for depth". No measured kerf is recorded.

### 5.4 Clamshell pipe mount with bowtie keys (`M`)

What it does: clamps the shoulder servo to the pipe with no screws.

Parameters (`M` 12 to 29): `od` (33.4 for 1 in, 48.3 for 1.5 in, 60.3 for 2 in); `clr 0.5`, `wall 4`, `r_in = od/2 + clr/2`, `r_out = r_in + wall`; shellA height 60, shellB 34; crush rib 0.6; `gap_a = 4` degrees shy of each parting plane as squeeze allowance; servo pocket 41.2 x 20.6 x 28 deep; cradle 56 x 27; pilots D2.5 x 10 at y plus and minus 5, z plus and minus 24.7; key ends 7.2, waist 3.6, length 9, height 30, clearance 0.25.

Construction:

1. `half(h, sideB)`: `rotate_extrude` of a `wall` x h rectangle at radius `r_in` over 180 - 2 x 4 degrees; four crush ribs 0.6 proud inward at -55, -20, 20, 55 degrees (A) or 125, 160, 200, 235 (B); two lugs 8.4 x (wall + 7.5) mirrored about y; minus two bowtie key channels at y = r_in + 5, grown by the key clearance (waist grows 0.6 of it).
2. `cradle()`: a block from `r_in - 2` out to `r_out + 3 + 28`, minus the servo pocket opening outward, a wire notch 8 x 8 at one end, four teardrop pilots (`teardrop`: circle plus a triangle apex 0.72 d above centre, extruded along x) for the bag flange screws; plus a D6 cone marking the shaft end.
3. `shellA = half(60) + (cradle clipped to the shell height, minus the pipe bore)`.
4. `shellB = half(34, sideB) - two optional D4.6 teardrop screw holes at z plus and minus 10 - optional zip slots at 150 and 210 degrees`.
5. `key`: the bowtie extruded 30 plus a 2 mm head offset 1.6.

Assembly: clamp both shells on the pipe and drive the two keys into the dovetail channels until the crush ribs bite (BUILD.md step 5). Flip the same set 180 degrees about the pipe for a second arm. Print upright, pipe axis vertical, brim on, PETG or PLA, 30 percent infill. The wall count is stated twice and disagrees: `M` line 9 says "4+ walls", BUILD.md step 3 says "3 walls"; use 4 for the shells, which carry the crush rib load.

### 5.5 Planar kinematics, static torque and 2D contact (`H` 296 to 336)

FK in the arm plane: `a0 = t0`, `a01 = a0 + t1`, `a012 = a01 + t2`, `a3 = a012 - t3`; P1 origin, `P2 = L1 (cos a0, sin a0)`, `P3 = P2 + L2 (cos a01, sin a01)`, `G = P3 + GX (cos a012, sin a012)`.

Torque: point masses `[link, local point, grams]` transformed by `xfp` (rotate by the link angle, add the link origin): UP centroid with 9.4 g, elbow micro at (104.7, 0) with the micro mass plus 1.2 g horn, FORE, wrist micro, HAND, FIXJAW, two pillars at (20, 12) and (66, 12), a 0.5 g key at (43, 12), the grip micro at (40.7, 0), MOVJAW, and the payload at (78, 2) in the hand frame. Plate centroids come from `partCentroid` (shoelace centroid of the outer minus each hole). The moment arm is the horizontal world distance from each joint origin; result `|sum| / 10000` in kg cm (grams times mm). Masses: micro 9 g (SG90) or 13.4 g (MG90S) (`H` 99). Stall defaults std 9.4 / 11.0, SG90 1.8 / 2.1, MG90S 2.1 / 2.6 at 4.8 / 6.0 V, editable (`H` 100). Bars teal under 60 percent, amber 60 to 100, red at 100 and over with a STALL line naming the joint; a tick at 60 percent marks a working limit.

Contact: three hard-coded pairs only: wrist servo rectangle (24.5 x 14 at 74.7 on FORE) against the UP outline, grip servo (at 40.7 on HAND) against UP and against FORE. `polyHit` is a bbox reject, then every edge pair tested with `segInt`, then point in polygon both ways. A hit paints both parts with emissive 0x6e1414 and prints "CONTACT a x b".

Limits: no pipe, mount or out-of-plane contact; the jaws and the standard servo are not tested; the tip trace is a 900 point ring buffer.

### 5.6 Mirrored second arm by basis, not by geometry (`H` 219 to 259)

What it does: PAIR shows a left arm built from the same right-arm plate polygons, which is the sheet rule "mirror the whole file for the left arm".

Construction: `buildArm(sign)` gives the arm root a basis that maps the arm plane onto the mast. For `sign = 1` the local x axis goes to world +y, local y to world +z and the plate normal (local z) to world +x. For `sign = -1` the basis is (0, 1, 0), (0, 0, -1), (-1, 0, 0), so the plate normal points to world -x and the arm hangs on the other side of the pipe. `applyPose` multiplies every joint angle by `sign`, and the jaw by `-sign`, so one slider set drives both arms as mirror images. The plate stack offset along the normal is `x0() = od/2 + 47.3` (`H` 216): for 1.5 in pipe 71.4 (computed, printed as "lateral 71.4 mm"), which is where the standard horn face sits. Each item in the stack carries its band offset `dz`, and `applyBands` sets `z = x0() + dz` on pipe change. The tip trace follows arm 0 only.

### 5.7 Mast and cradle stand-in (`H` 266 to 293)

The sim does not load the mount STL. It draws a 380 long pipe of the chosen OD, an open ring `r_out = od/2 + 0.25 + 4` tall 60 (the shellA height), and per side a cradle box from `r_in - 2` to `rim = r_out + 31` (27 x 56), a 30 x 19.7 x 40.7 standard servo box and a D6 x 11 shaft stub at `rim + 5.5`. These match `M` (`clr 0.5` gives `r_in = od/2 + 0.25`; `cw 3 + pk_d 28 = 31`; cradle 27 x 56). The second cradle shows only with PAIR. None of these bodies takes part in the contact test.

### 5.8 Sheet constants carried in `DATA.meta` (`H` 91)

`T 3.0`, `L_UP 110`, `L_FORE 80`, `GRIP_X 46`, `JAW_LEN 52`, `JAW_GAP 4.2`, `PILLAR_X 24`, `PILLAR_Y 11`; micro `L 22.8`, `W 12.4`, `cutL 23.1`, `cutW 12.7`, `shaft_off 5.3`, `pilot 13.85`, `pilot_d 1.7`, `head 4.6`, `below 20.5`, `flange 2.4`; `stdshaft 10.1`. The page reads only `T` from `meta`; link lengths are repeated as literals on `H` line 98, and the pillar stand-ins sit at (20, 12) and (66, 12) on HAND (`H` 240 to 243), not at `PILLAR_X`, `PILLAR_Y`. Part rows carry `outer`, `holes` and `mass` only: UP 65 outline vertices and 6 holes, FORE 65 and 5, HAND 66 and 6, MOVJAW 80 and 1, FIXJAW 34 and 2, PILLAR 12 and 2, DISC 64 and 1 (counted from `DATA`). There is no `engraves` field, which is why the hover card never shades pockets.

---

## 6. Fits and cut settings

| item | value | source |
|---|---|---|
| stock | 3.0 ply or acrylic, "measure your stock" | `meta.T`, score text line 2 |
| layers | CUT red #FF0000 0.2 stroke; POCKET black fill evenodd; SCORE blue | `F/jib.svg` |
| engrave depth | 2.0 micro cross, 2.4 standard bone | score text line 2 |
| order | engrave passes before the through cut; coupon first | BUILD.md steps 1 to 2 |
| micro cutout | 23.1 x 12.7 for 22.8 x 12.4 | `meta.mic` |
| pilots | D1.7 at 13.85 | `meta.mic` |
| slot gauges | 2.70, 2.80, 2.90, 3.00 | coupon label |
| key taper | 5.2 to 3.6 | score text line 7 |
| mount clearance on pipe | 0.5 diametral, 4 degree parting gaps, 0.6 crush ribs | `M` 15 to 22 |
| key clearance | 0.25 | `M` 29 |
| mount print | upright, pipe axis vertical, brim, no supports, 30 percent, PETG or PLA; walls disagree: "4+ walls" in `M` line 9, "3 walls" in BUILD.md step 3 | `M` 9, BUILD.md 11 |
| part masses | UP 9.4, FORE 5.1, HAND 5.1, MOVJAW 1.8, FIXJAW 0.9, PILLAR 0.3, DISC 0.9 g | `DATA.parts[*].mass` |

---

## 7. UX anatomy

Dark instrument shell (`--bg #101216 --panel #181b20 --teal #3fd1b0 --amber #d9a03a --red #e05252 --birch #d9b98a`), stage left, 300 px panel right.

- Panel: wordmark JIB; MAST (1, 1.5, 2 in); POSE (shoulder plus and minus 90, elbow and wrist plus and minus 100, grip 0 to 48; presets HANG -88/10/30/20, REACH 0/0/0/30, LIFT 30/-75/45/10, HAIL 70/-20/-40/44; PAIR and TRACE); LOADS (payload 0 to 300 step 5, volts 4.8 or 6.0, micro SG90 or MG90S, editable stall fields); TORQUE bars with the 60 percent tick, pinch line, red warnings, tip y and z and reach, mast and lateral offset; a foot note.
- Stage: birch plates with dark edges, damped camera (exponential smoothing at 11 per second), wheel zoom toward the point under the cursor, right drag pan, double click focus, click isolates (others to opacity 0.07), Escape clears. Hover draws the part's cut outline and holes in a card with its mass.
- Exports: none in the page; the SVG and STLs are the deliverables.
- What makes it excellent: the parts on stage are the exact sheet polygons extruded to stock thickness, so what moves is what gets cut; the hover card shows the cut outline of any part; torque and stall are honest for the chosen micro and voltage.

Gaps: the card's engrave shading reads `part.engraves`, which the data does not carry, so pockets never show in the card; the jaws and standard servo have no contact test.

---

## 8. Tests and harness

None. No smoke test, checker or hook is in the outputs. The drive on 2026-10-05 recorded no page errors.

---

## 9. Port map

| item | value |
|---|---|
| packages | `nest` (one sheet, CUT, POCKET and SCORE layers, coupon), `sim` (2D polygon contact), `motion` (planar 3R FK), `profile` (kerf from the coupon, engrave depths), `mesh` (OpenSCAD mount: rotate_extrude shell, crush ribs, bowtie key) |
| feature kinds | `coupon`, `pocket` with depth on a sheet part (engraved horn keying), `tabslot` (pillar tabs and wedge keys), `lamination` (parallel plate bands), `horn`, `pivot` (horn as the only bearing), `bore` (teardrop pilots in the mount) |
| canon id | MISSING: no entry for the horn-pocket pivot on sheet parts, the bowtie key clamshell clamp, or the wedge key lock |
| reference id | MISSING (`sheet/horn-pocket-arm` is a candidate name in the bench reader) |
| milestone | M16 (registry row `jib`, derivedFrom davit, `designs/jib/legacy/`); no port milestone |
| lineage row | MISSING |
