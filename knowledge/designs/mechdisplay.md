# mechdisplay (OGEE R16-M as printed): how it is made

The owner's own sliced print jobs for the OGEE R16 pin display: fifteen 3MF projects in `3d/mechdisplay/`, saved 2026-08-17 to 2026-08-19 for a FlashForge Creator 5 Pro. They are the physical build of the R16-M minimal frame with knob drive: skeletonised black PETG frame plates, pink PETG bars, links and pivot pins, black rods, caps, shafts and knobs. There is no code here; the geometry is the OGEE16 bench's exports (`originals/ogee16/RECORD.md`), and what this folder adds is how the owner set each part up to print. This record says what is in each job and why the settings differ by role, so a builder can slice the next mechanism the same way.

Number rule for this file: settings are read from each 3MF's `Metadata/project_settings.config` and `Metadata/model_settings.config`; extents are computed from the vertex coordinates inside each 3MF by `files/extract_3mf_settings.py` (run 2026-10-05, output `files/3mf-settings-extracted-20261005.json`); OGEE16 numbers are cited from that record's sources.

Folder: `fab-knowledge:originals/mechdisplay/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | mechdisplay (folder name); the parts are OGEE R16-P and R16-M exports |
| slug | mechdisplay |
| canonical revision | the whole folder as of 2026-08-19 01:43 (newest file `buttons.3mf`); every job is a different part, so all fifteen are kept |
| copies here | `files/3mf/*.3mf` (fifteen files, byte copies), `files/previews/*.plate_1.png` (the slicer's own plate render pulled out of each 3MF) |
| saved by | header `X-BBL-Client-Version 01.10.01.50`, `OrcaSlicer-Version 2.3.2` (`Metadata/slice_info.config`); printer `Flashforge Creator 5 Pro 0.4 nozzle`, process `0.24mm Standard @FF C5`, `0.20mm Standard @FF C5` or `0.10mm Standard @FF C5` |
| source design | `originals/ogee16/files/src/source/printed.scad` part names (`rowbar_asm`, `colbar_asm`, `link`, `rod_asm`, `cap_asm`, `shaft_row_asm`, `shaft_col_asm`, `knob_asm`, `latchpull_asm`, `m_base_asm`, `m_deck_asm`, `m_face_asm`, `m_wall_*_asm`, `m_rail_asm`, `m_rail2_asm`, `m_latch_asm`, `pivot`) |

### 1.1 The fifteen jobs

| file | saved | sha256 (first 16) | objects | extents mm (computed) |
|---|---|---|---|---|
| `rowbar_asm.3mf` | 2026-08-17 11:46 | 35e3f813fdb0edec | rowbar_asm x4 | 162.0 x 17.5 x 51.0 |
| `colbar_asm.3mf` | 2026-08-17 11:57 | 9796a49867ef52f7 | colbar_asm x4 | 17.5 x 162.0 x 34.5 |
| `link.3mf` | 2026-08-17 15:18 | fe91b41fa0b4f606 | link x16 | 29.6 x 15.5 x 3.0 |
| `all pivots.3mf` | 2026-08-17 16:26 | 24901ec9086e04e9 | Assembly x41 | 6.0 x 6.0 x 11.3 |
| `m_base_asm.3mf` | 2026-08-18 00:04 | d63b176c2c099257 | m_base_asm x1 | 201.9 x 201.9 x 20.0 |
| `m_wall_xp_asm.3mf` | 2026-08-18 00:07 | 2a57e6802387c841 | m_wall_xp_asm, m_wall_yp_asm | 201.9 square plate area, 93.9 tall pieces |
| `m_deck_asm.3mf` | 2026-08-18 02:28 | 19db0702135dfa52 | m_deck_asm x1 | 201.9 x 201.9 x 3.0 |
| `m_wall_y_asm.3mf` | 2026-08-18 02:28 | 9a4cec7efb0f6ba8 | m_wall_xn_asm, m_wall_yn_asm | as above |
| `m_face_asm.3mf` | 2026-08-18 02:30 | fef85a56be0645aa | m_face_asm x1 | 201.9 x 201.9 x 3.0 |
| `railandlatch.3mf` | 2026-08-18 02:30 | 10417ca175635c4f | m_rail2_asm, m_rail_asm, m_latch_asm | 188.9 x 201.9 x 20.9 |
| `pivot.3mf` | 2026-08-18 11:17 | 25f5b6fcf3a331dd | pivot x41 | 6.0 x 6.0 x 11.18 |
| `ogee16-pivot-pin (1).3mf` | 2026-08-18 12:01 | effcec6753ddb3e4 | ogee16-pivot-pin x41 | 6.0 x 6.0 x 11.3 |
| `rods.3mf` | 2026-08-18 13:29 | d6edb7d03a66b1cd | rod_asm x16 | 3.0 x 11.24 x 48.0 per rod, laid flat |
| `threrest.3mf` | 2026-08-18 16:51 | 05b0767ab0f8c11f | cap_asm x16, shaft_row_asm x4, shaft_col_asm x4, knob_asm x8, latchpull_asm x1 | 55 x 55 x 11 largest |
| `buttons.3mf` | 2026-08-19 01:43 | a162e6a44f613bc3 | cap_asm x32 | 16.0 x 16.0 x 3.0 each |

Checks against the bench (computed): links 29.6 long match the R16 link length stated in `sources/benches/benches-mechanisms.md` (R16 row); the frame square 201.9 matches "rails spanning 201.85" in the R16-P frame checks; walls 93.9 tall match "walls 3.00 topping at 93.92"; the base is 20.0 tall, so this minimal base carries the restored column stop bosses (the MIN.md fix, `printed.scad:493` to `502`); `pivot.3mf` at 11.18 long equals the PINS.md overall length 11.18 (stated), while `all pivots` and `ogee16-pivot-pin (1)` are 11.30, a second pin revision. Measured on 2026-10-05 from the mesh vertices: `pivot.3mf` spans z -5.5875 to 5.5875 (11.175), the same as `originals/ogee16/files/exports/ogee16-pivot-pin.stl` (11.175); the other two span -5.65 to 5.65 (11.300). Neither matches the harvested `printed.scad`, whose `PIN_LEN = PIN_HEAD2_H + T + PRINT_GAP + T + PIN_LEDGE + PIN_BARB_L` (`printed.scad:400`) gives 11.275 with `PRINT_GAP = FIT_SLIDE/2` = 0.375, and `print/pivot.stl` in `ogee16-print-stl.zip` measures 11.275. Read through that formula with head, ledge and barb unchanged, 11.175 is a `PRINT_GAP` of 0.275 (`FIT_SLIDE` 0.55) and 11.300 a `PRINT_GAP` of 0.40 (`FIT_SLIDE` 0.80) (inferred); `fits.py:43` to `45` records that its table still reported 0.55 after `FIT_SLIDE` had been raised to 0.75, so the 11.175 job fits the pin from before that raise and the 11.300 jobs a looser trial after it. The owner printed both and left no note of which fitted.

The minimal frame differs from the R16-P frame in two deliberate ways, both stated in `originals/ogee16/files/notes/MIN.md` lines 73 to 82 and both visible in these jobs. The face is one layer: `m_face()` (`printed.scad:534`) is the skeletonised lower face only, 3.0 thick (computed from the `m_face_asm.3mf` mesh), with no upper cap-pocket layer, so the caps sit 3 mm proud at rest and still rise the same throw when set. There are no servo mounts: the bracket and latch tower slots are gone from base and deck, so this set is knob drive only, which matches the presence of `shaft_row_asm`, `shaft_col_asm`, `knob_asm` and `latchpull_asm` in `threrest.3mf` and the absence of every servo part.

### 1.2 Why the whole folder

Each file is one plate of one print job, and together they are the one physical OGEE16 that exists. Bill coverage against `build_plate.py` (knob drive, common set plus knobs, computed): 4 row bars, 4 column bars, 16 links, 16 rods, 16 caps (plus 32 more in `buttons.3mf`, spares or a second cap colour), 32 pivots needed and 41 per pin job (9 spares each), 4 + 4 shafts, 8 knobs, 1 latch pull, the minimal base, deck, face, four walls, two rails and the latch plate. Drive pins (9 in the bill) are not in any job here: MISSING from the printed set.

## 2. What it makes and for whom

A maker who wants the OGEE16 display on their own bed. The folder answers the questions the bench does not: which parts go together on a plate, which filament colour carries which role, and what layer height, infill and support each role needs. The settings are the owner's, chosen at the printer, and they encode the fit lessons of the bench.

## 3. Shots

The 3MFs ship their own slicer renders (`Metadata/plate_1.png`, 512 x 512). The shots are contact sheets of those renders with each job's settings, laid out in a scratch page and captured with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` at 1280 x 860 on 2026-10-05.

| file | what it shows |
|---|---|
| `shots/m01-minimal-frame-plates-black-petg.png` | base (with eight column stop bosses standing up), deck, face, the +X and +Y walls with their knob hubs, the -X and -Y walls, rails and latch plate: all skeleton lattices in black PETG at 0.24, 2 walls, 20 percent, no support |
| `shots/m02-mechanism-plates-bars-links-rods-caps-knobs.png` | four row bars lugs up and four column bars in pink PETG at 0.20 with tree support; sixteen links flat; sixteen rods laid on their sides; 32 caps; the knob drive plate with shafts, knobs, caps and the latch pull |
| `shots/m03-pivot-pin-plates-0p10-layer-100-infill.png` | the three pivot pin jobs: 41 pins head down, pink PETG, 100 percent infill, two at 0.10 layers and one at 0.24 |

## 4. Settings by role

Shared by every job: nozzle 0.4, two walls, first layer 0.25 (0.20 on the 0.10 jobs), PETG, single extruder, prime tower off except `all pivots`.

| role | jobs | layer | infill | support | colour | why (from the bench) |
|---|---|---|---|---|---|---|
| frame plates | `m_*`, `railandlatch` | 0.24 | 20 percent | off | black `#000000` | flat lattices print in their assembly pose; TIMES.md costs the minimal frame at 10.8 h and 276 g (stated) against 28.6 h for the full frame |
| bars | `rowbar_asm`, `colbar_asm` | 0.20 | 10 percent | tree (auto) | pink `#FB02FF` | bars print lugs up (row bar 1944 mm2 bed per `orient.py`, stated); the lug bores and semicircular tops overhang, hence tree support; finer layer for the 2.90 lug bores |
| links | `link` | 0.20 | 10 percent | tree | pink | link is the one part with a separate print pose: flat, 304 mm2 bed, 0 overhang (stated); bores need the finer layer |
| pivot pins | `pivot`, `ogee16-pivot-pin (1)`, `all pivots` | 0.10 (0.24 for `all pivots`) | 100 percent | off | pink | PINS.md: "give 3 or more perimeters or 100 percent infill so the shank is solid"; 0.10 layers resolve the 0.4 ledge and the 20 deg cone |
| rods | `rods` | 0.24 | 15 percent | off | black | rod alone prints at 434 mm2 bed, 3 mm tall, nothing overhanging (stated, `notes/PRINT.md`) |
| caps | `buttons`, part of `threrest` | 0.24 | 20 percent | off | black | 16 x 3 discs, PRESS fit on the rod tenon (0.15 drawn, `fits.py`) |
| drive | `threrest` | 0.24 | 20 percent | tree | black | shafts stand on their cranks, knobs flipped (stated, `orient.py` results in `printed.scad:553` to `609`) |

The colour split follows the bench's stage palette loosely: the moving mechanism (bars, links, pins) is pink and everything else black.

## 5. What a port reads

| need | source |
|---|---|
| per-role process overrides (pins 0.10 and 100 percent, bars 0.20 with tree support) | this record section 4; `files/3mf-settings-extracted-20261005.json` |
| plate grouping by part type | matches `build_plate.py` GROUPS (one part type per plate) except `threrest` (mixed knob drive set) and the wall pairs |
| geometry | `originals/ogee16/files/src/source/printed.scad` and the plate page |
| first-print fit evidence | MISSING: no notes on how these prints fitted; the 3MFs record intent, not outcome |

## 6. Tests and harness

None. `files/extract_3mf_settings.py` reads settings, object names and vertex bounds from every 3MF and writes the JSON; it is the only tool here.

## 7. Port map

| item | value |
|---|---|
| packages | `profile` (machine `ffc5p`, process rows per role), `3mf` (project settings and per-object metadata round trip), `nest` (plate grouping) |
| feature kinds | none new; the per-role process override is a `profile` concept with no kind |
| canon ids | `displacement-coincidence-latch` (through OGEE16); MISSING: a process-by-role table in the profile seed (pins at 0.10 and 100 percent infill, bars with tree support), flagged as a gap in `sources/repos/other-projects.md` line 589 |
| reference ids | `machines/ogee-cell` (through OGEE16); MISSING: a reference that carries these 3MFs as the golden physical set |
| milestones | M00 (3MF reader parity over owner 3MFs: "25 owner 3MFs parse", which counts these files), M07 (plates) |
| lineage row | MISSING |
