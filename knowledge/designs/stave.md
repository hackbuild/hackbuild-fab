# STAVE: how it is made

Record written 2026-10-05 from the original code. Slug `stave` (the copper chevron strip of the KEYWAY family; "STAVE, stacked laser cut CASK" is a different design under the same name, recorded with CASK). Family KEYWAY (chat `cricut-midi-seven`), seventh board, sized to the owner's 4 inch copper tape. Shared skeleton, `svgpath.py` and viewer shell: `fab-knowledge:originals/keyway/RECORD.md` section 4; the constraint-ranked lane solver: `fab-knowledge:originals/tessera/RECORD.md` section 5.4.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Computed" means the rerun of 2026-10-04, `fab-knowledge:originals/stave/files/rerun/run-2026-10-04.txt`. "Measured" means the headless drive of 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code.

Short paths: `F` is `fab-knowledge:originals/stave/files/`. `GEN` is `F/gen_stave.py`. `SIM` is `F/stave_sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | STAVE rev A: one octave scale strip, 8 chevron keys, 2 sliders, 12 finger rail down the left edge |
| owner's slug | stave |
| canonical file | `GEN`, sha256 0d7a79321b8069a518ce57e362665b2a719368525838a729eb27db1fcda12100 |
| viewer | `SIM`, sha256 4077a6f66bd2187aecdacc17fdc32eefef871df54079f424cb56bb2807691fdd, 125120 bytes |
| date | 2026-08-10, after FRET (19:57) by build order; the README cites FRET's lattice (inferred; no Downloads zip carries STAVE) |
| size | 96 x 250 mm, r 3.2 (`GEN` line 40); tape 101.6 mm (line 41) |
| nets | 12: D1 to D8, L1_A, L1_B, L2_A, L2_B (`GEN` line 55) |
| gates | 57, all pass (computed) |

One shipped revision, harvest only (`fab-work-directory:benches/cricut-midi-seven/outputs/stave/`). The handoff copied the same viewer (sha256 4077a6f6..., 125120 bytes) into `designs/stave/legacy/`, so the legacy file carries the viewer defect. `~/Downloads/stave.html` (2026-07-14) is the laser CASK STAVE v0.1, a different design.

Why this revision: the only one; 57 of 57 at 1.200 mm (computed), and the tape-width gate makes it the family's example of a stock constraint as a first-class check.

`files/`: generator, `svgpath.py`, README, geometry JSON, viewer, `layers/`, `inputs/`, `rerun/`.

---

## 2. What it makes and for whom

A one panel scale strip that cuts from a single pass of 4 inch (101.6 mm) copper tape with 2.8 mm spare each side (computed), using about 250 mm of roll. Eight keys sliced from one slab by chevron seams (52 x 17.1 mm, 859 mm2 each, the largest key in the family, computed), marked with scale degrees: the pitch per degree is a firmware table, so the board plays any scale. Two 50 mm sliders across the ends (computed). Twelve contacts in one row down the left edge. One MPR121 or 12 ESP32-S3 touch pins.

Why one column (README): at 96 mm the rail and its fan take about 38 mm, leaving about 52 mm of playable width; two hex columns in 52 mm give keys under 20 mm and four pitch classes. The isomorphic keyboard wants about 200 mm of width.

---

## 3. Shots

Headless drive 2026-10-05; the page throws the `S.span` TypeError on load (measured) and builds no tab row; the driver unhid Sense model and Wiring. Sense SVG capped at 690 px tall. Files in `fab-knowledge:originals/stave/shots/`.

| file | caption |
|---|---|
| `st01-stack-iso-default.png` | Layer stack at load, no tab row; the long narrow strip. |
| `st02-stack-exploded-orbited.png` | Exploded at lift 100: backer, guide, copper, dark vinyl, faceplate, pink chevron inlays. |
| `st03-top-collapsed.png` | Top, collapsed: degree numerals 1 to 8 on nested chevrons, SL1 and SL2 at the ends. |
| `st04-sense-d4-touched.png` | Key D4 held: channel "D4 (single tile electrode)", baseline 180, delta +71, TOUCHED, "Scale degree 4. One channel, 859 mm2 of plate. Which pitch this degree plays is a table in firmware" (read from the shot; "tile" is copy drift from TESSERA). |
| `st05-sense-slider-l1.png` | Lower slider dragged: A/(A+B) 0.330, 74 percent along 50 mm, CC 94, zone 6 (measured). The copper shows each key tapping straight out of its left edge into a vertical lane and turning once to its finger; the readout note still mentions "The arc reports an angle" though STAVE has no arc. |
| `st06-wiring.png` | Wiring (unhidden): 12 rows SL1 B, SL1 A, DEG 1 to 8, SL2 A, SL2 B; heading reads "The rail: 18 contacts, one row"; generator pane empty. |

---

## 4. Shared kernel (brief)

`P` lines 38 to 54; helpers lines 60 to 72 with `smooth(d=0.25)`; outline lines 74 to 76; union and smooth lines 179 to 180; gates lines 197 to 268; refusal line 272; emit lines 276 to 360.

---

## 5. Mechanisms, circuits and constructions

### 5.1 Chevron-sliced key slab

What it does: eight keys cut from one slab by identical V seams, so they nest and the strip reads as one sliced object.

Construction (lines 82 to 104):

1. Slab (40, 50, 92, 200); `pitch = 150 / 8 = 18.75`; `xm = 66`.
2. `seam(k)`: 26 points across the slab; `off = -5 + 2 * 5 * |x - xm| / 26`; y = `50 + k * pitch + off` (a V pointing down by 5 mm at the centre).
3. Key k: `Polygon(seam(k) + reversed(seam(k+1))).buffer(-0.8)` (half the 1.6 seam), then `buffer(-2.2).buffer(2.2)`.
4. Escape: tap at `(42, cy)`, straight left into a vertical lane.

Gates (lines 219 to 226): key plate over 600 mm2 (computed 859; like FRET, this measures `ELEC`, the seam-buffered slice before the 2.2 rounding; the copper key is 853.3 mm2 and 50.4 mm across, x 40.8 to 91.2, computed 2026-10-05 with shapely 2.x over the same construction); all keys equal within 5 mm2; 8 keys; adjacent keys hold at least 0.9 apart (computed 1.60). Weeding (README): the seams are 1.6 wide and 52 long; start at the point of the V and pull toward the edges.

### 5.2 End sliders and the escape-outside rule

Construction (lines 106 to 123): boxes (40, 8, 90, 36) and (40, 214, 90, 242); `hmax = (28 - 1.4) - 3.0`; A thick at the left and runs to `lx1 - 6`; B thick at the right from `lx0 + 6`. A escapes from its thick end at `lx0 + 1.6`. B runs from its thick end to `xb = lx1 - 3.0` and then to the outer margin y 4 or 246.

Two gate catches (README; comment line 120): the wedge pair's own diagonal gap (about 3.0 mm) cannot carry its own escape (a 1.6 trace with clearance needs 3.4), so B leaves through the outer margin; and the drop must pass outside A's end (`lx1 - 3.0` is right of `lx1 - lin_off`), since dropping 3 mm inside A's end went through A's thin tail as a dead-on overlap.

Gates (lines 228 to 243): ratio monotone left to right, span inside 0.10 to 0.90 (computed 0.854 to 0.146), travel at least 45 mm (50).

### 5.3 Left-edge rail with swapped ranked fan

Construction (lines 125 to 163): rail centred on the board height, 12 fingers 9 tall on a 12 pitch from x 2.5, depths 14 and 9 alternating; vertical lanes x `35.0 - 2.8 i`, i 0 to 5. The TESSERA ranking runs with x and y swapped: arrival and finger coordinates are y values; the sensor side arrives from the right and crosses lanes farther right, the finger side leaves left. Each net is one polyline: tap, to its lane x, along the lane to its finger y, left into the finger.

Gates (lines 245 to 256): 12 channels; one row at pitch at least 11.5; finger gap at least 2.5 (12 - 9 = 3); depth alternates 14 and 9; rail order equals arrival order; lanes fit (computed 5 of 6 used); the wiring zone ends at least 1 mm before the keys (computed 22.5 mm before them).

### 5.4 Tape-width gate (first in the list)

`gate(W <= tape_w - 4.0, ...)` (lines 201 to 203). Raising the key count or rail pitch fails loudly instead of producing a board the roll cannot cut (README). Cutting (README): pull about 270 mm of tape, stick liner down on StandardGrip, fine point, vinyl, pressure up one step, line the outline up by eye with 2.8 mm of slop each side.

### 5.5 Faceplate and accents

`RAILZONE` here spans x 0 to the rail right edge plus 2.5 over the rail's y range; `VINYL` as the family; chevron inlays are keys buffered -2.4; slider faces inset 0.6 (lines 182 to 195). Graduations sit on the outer side of each end slider (lines 320 to 325).

### 5.6 Read model

As VERNIER for keys and straight sliders. Degrees, not notes: the pitch per degree is a firmware table (README).

### 5.7 Constructions the first pass left out

**Rail geometry along the long edge (`GEN` lines 125 to 163).** Rail y0 = 125 - 11 * 12 / 2 = 59, so the twelve finger centres run y 59 to 191 (computed), alongside the key slab (y 50 to 200). Fingers point right from x 2.5, 9 tall, 14 deep (even index) or 9 deep. Arrival is a y value: keys arrive at their own centre y (`50 + (k + 0.5) * 18.75`), slider A nets at their wedge's mid height, slider B nets at the outer margin y 4 or 246, which is why SL1 B is rail position 1 and SL2 B position 12 (st06). Each polyline is tap, to its lane x, along the lane in y to its finger, then left into the finger to `x0 + depth - 1`.

**Faceplate art (`GEN` lines 312 to 341).** Degree numerals 1 to 8 at cap 8.0, Plex Mono 700, on the slab centre line x 66 at each key's centre minus 3.4; `SL1` below the lower slider (`y0 - 6.2`) and `SL2` above the upper one (`y1 + 4.0`) at cap 2.4; nine 0.7 x 1.8 graduations on each slider's outer side across the read window `x0 + 6` to `x1 - 6`; `STAVE REV A . 8 DEGREES` at (66, 45.6) and the tagline at cap 1.9 at (66, 41.2), in the gap between the lower slider and the slab. Rail labels sit on the guide only, 7 mm right of each finger. The faceplate strokes every key slice and both slider faces with a 0.35 ink line. Brand: mark 11 mm at (41, 201.5), wordmark cap 4.4 from x 54, in the strip between the slab top (y 200) and the upper slider (y 214); `STAVE_BRAND=1` moves it into copper.

**Viewer readout (`SIM` lines 196 to 236).** Sliders read along x clamped to `x0 + 5` through `x1 - 5`, label "% along 50 mm"; the key readout names the scale degree and quotes `key_area` (the 859 mm2 proxy). The degree table itself is not modelled in the viewer; it lives in firmware per the README.

---

## 6. UX anatomy

KEYWAY family shell; only the Layer stack tab is reachable in the shipped file.

## 7. Known limits and failure lessons

1. Viewer `S.span` throw (`SIM` line 276), no tab bar (measured); the handoff legacy copy is the same file.
2. Docstring says two 84 mm sliders (`GEN` lines 15 to 16); the code makes 50 mm.
3. Viewer copy drift from SPLINE, TESSERA and FRET: "The rail: 18 contacts" (`SIM` line 99), "CAP1188 x3, 24 channels, 18 used" and "drop a slider and two blades" (lines 261 to 262), "The arc reports an angle" (line 232), "(single tile electrode)" in the key readout (st04).
4. One column means one octave under the hand; transposition happens in firmware.
5. Font and logo inputs absent from the bench folder.

## 8. Tests and harness

57 in-generator gates, 57 of 57 (computed), worst 1.200 mm at D1/L1_A.

## 9. Port map

| item | value |
|---|---|
| packages | `copper` (chevron slab, swapped-axis ranked fan, edge rail, escape-outside rule), `profile` (tape width 101.6 as a stock row), `circuit` (degree table) |
| feature kinds | `conductor`, `pad`, `window`, `lamination` |
| canon ids | `wedge-pair-slider` (proven, STAVE provenance, CANONS.md line 581); `capacitive-plate` (line 580; STAVE not in its provenance) |
| canon MISSING | chevron slab keys; material-width-fits-stock gate; wedge escape-outside-the-opposite-end rule; rail along a long edge with the swapped ranking |
| reference ids | `surfaces/stave-strip` (README only, not in INDEX) |
| milestone | M05 (57 gates, MILESTONES.md line 62) |
| lineage row | MISSING |
