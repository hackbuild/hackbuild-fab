# tang-small: the TANG R5 print set as sliced

`instruments/tang-small` holds seven slicer projects the owner saved while printing TANG R5 on 2026-08-16 and 08-17. No code lives here. This record says what was printed, in which material and with which slicer settings, and how each part maps back to the generator in `fab-knowledge:originals/tang-r5/`, so a builder knows what a real print of the design looked like.

Number rule: bounds and triangle counts are measured from the meshes in these files (script below); slicer settings are read from each file's `Metadata/project_settings.config` and `Metadata/model_settings.config`; dimensions quoted from the generator cite `fab-knowledge:originals/tang-r5/files/src/tang_r5_13_core.js`.

Folder: `fab-knowledge:originals/tang-small/`.

## 1. Identity and revision

| file | saved | bytes | sha256 (first 16) | objects |
|---|---|---|---|---|
| `face.3mf` | 2026-08-16 18:29 | 114931 | `3ff70c15d835031b` | face |
| `body.3mf` | 2026-08-16 18:47 | 138409 | `b6152634a238bbc8` | body |
| `neck.3mf` | 2026-08-16 18:50 | 48825 | `12c2013a82b19b1f` | neck0, neck1, neck2 |
| `body2.3mf` | 2026-08-16 19:18 | 159234 | `1d51ec46e4838120` | body plus the three neck segments |
| `pinkparts.3mf` | 2026-08-17 02:06 | 142465 | `c9fd0bfe66218525` | knobs x3, joiner x2, tip, square plug, round plug |
| `railcovers.3mf` | 2026-08-17 16:05 | 40539 | `14f50fb75b42996f` | rail_root x2, rail_mid x4, taillid |
| `facewithbuttons.3mf` | 2026-08-17 22:07 | 142533 | `cc9a0a1e17c51fa8` | face assembly plus `cbuttons` on extruder 2 |

Full hashes: `SHA256SUMS`. Copies: `fab-knowledge:originals/tang-small/files/*.3mf`. Source folder: `instruments/tang-small/`.

Canonical: the whole set, with `facewithbuttons.3mf` as the newest file and the only one that prints the conductive pads in place. It is good in the sense that matters here: it is what the owner actually sliced for the printer. There is no later TANG R5 print set; TANG R6 is a different design (`fab-knowledge:originals/tang-r6/`).

Why the name: the folder is named tang-small; the parts are TANG R5 at the 610 mm film (the generator's default), so "small" names this physical build, not a smaller parameter set. The handoff never described it (`fab-knowledge:sources/repos/other-projects.md` TANG note).

## 2. What it makes and for whom

The physical TANG R5: a 158 x 104 body, a face with a printed conductive pad set, a three-piece neck (216 per segment, measured; 648 in all including the 24 mm in the mortise, computed) and the magenta knobs, joiners, tip and plugs, printed on a FlashForge Creator 5 Pro. A builder uses it as the reference for how a generated design is split into single-material plates and sliced.

## 3. Shots

These are the slicer's own plate thumbnails (`Metadata/plate_1.png`, 512 x 512) extracted from each file.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/tang-small/shots/thumb-body.png` | the charcoal body, floor down: speaker seat ring with the cable channel cut, screw columns, side window, the mortise collar at the neck end |
| `fab-knowledge:originals/tang-small/shots/thumb-neck.png` | three neck segments on their sides, channel facing sideways, ribs notched for the wire lane, the root segment with its heel and film tail slot |
| `fab-knowledge:originals/tang-small/shots/thumb-face.png` | the face plate alone, top face down, in white PETG on extruder 2 |
| `fab-knowledge:originals/tang-small/shots/thumb-facewithbuttons.png` | the face with the conductive pad set: grille, pot holes, screw holes, lip, and the seven black loops of the `cbuttons` |
| `fab-knowledge:originals/tang-small/shots/thumb-pinkparts.png` | magenta PETG: three gear knobs, two joiners, the tip cap, the square and the knurled round plug |
| `fab-knowledge:originals/tang-small/shots/thumb-railcovers.png` | magenta rail caps (two root, four mid) and the tail lid, top face down |

## 4. Parts, materials and settings

### 4.1 Geometry measured from the meshes

| part | bounds (mm) | triangles | generator source |
|---|---|---|---|
| body | 104.0 x 158.0 x 23.6 | 12312 | body to `yTub1` 23.6, `tang_r5_13_core.js:14` to `15`, `:245` to `305` |
| face | 104.0 x 158.0 x 7.4 | 6512 | face 3.4 plus lip 4.0, `:55`, `:308` to `343` |
| neck0, neck1, neck2 | 216.0 x 18.0 x 35.0 each | 392, 532, 532 | 3 segments of `(624 + 24)/3`, `:561` to `563` |
| cbuttons | 52.6 x 63.0 x 9.6 | 2720 | cPLA pad set with legs and loops, `:742` to `781` |
| press (one of three) | 202.3 x 28.4 x 0.8 mesh, scaled in the slicer to about 49.3 x 6.9 x 3.5 | 24 | TPU presser per segment, `:726` to `738`; in `facewithbuttons` only, as a PETG block |
| knob (one of three) | 16.4 x 17.0 x 14.9 | 10268 | 10-tooth gear knob, `:443` to `525` |
| joiner | 44.0 x 30.0 x 14.5 | 308 | `N.joinL` 44, `:615` to `633` |
| tip | 32.0 x 35.0 x 18.0 | 92 | `:634` to `641` |
| square plug | 20.8 x 22.3 x 4.6 | 36 | `:788` to `800` |
| round plug | 19.8 x 19.8 x 5.2 | 888 | `:802` to `816` |
| rail_mid | 215.0 x 6.2 x 8.3 | 236 | segment length minus two 0.5 gaps, `:671` to `694` |
| rail_root | 188.6 x 6.2 x 8.3 | 236 | stops outside the body end wall, `:674` |
| taillid | 18.0 x 38.3 x 8.3 | 212 | `:697` to `709` |

Measured with a short Python pass over `3D/Objects/*.model` vertex lists (rerun: open each 3MF with `zipfile`, regex the `<vertex>` attributes, take max minus min).

### 4.2 Slicer settings per file

All files: Bambu Studio 01.10.01.50 project, printer `Flashforge Creator 5 Pro 0.4 nozzle`, 2 wall loops.

| file | process | layer | filaments (type, colour, preset) | infill | support | prime tower |
|---|---|---|---|---|---|---|
| body, body2, neck | `0.24mm Standard @FF C5` | 0.24 | PETG `#000000` `Generic PETG HF @System` | 10% | on | off |
| face | `0.24mm Standard @FF C5` | 0.24 | PETG black, white, `#FB02FF`; face on extruder 2 (white) | 15% | on | on |
| pinkparts | `0.24mm Standard @FF C5` | 0.24 | PETG `#FB02FF` `Generic PETG @FF C5P` | 10% | on | off |
| railcovers | `0.24mm Standard @FF C5` | 0.24 | PETG `#FB02FF` | 15% | off | on |
| facewithbuttons | `0.20mm Standard @FF C5` | 0.20 | PETG `#FFFFFF` `Flashforge PETG Pro @FF C5P` (extruder 1), PLA `#000000` `Generic PLA @FF C5P` (extruder 2, the conductive PLA) | 20%, with a per-object 100% override on `cbuttons` | off | off |

### 4.3 What the print changed against the generator

- Material: the generator's print notes say PLA (charcoal body, cream face, magenta parts) and TPU for presser and feet (`fab-knowledge:originals/tang-r5/files/unzipped/parts/MANIFEST.txt`). The owner printed PETG for every structural part.
- Supports: the generator says no supports for every part; the body, neck, face and pink plates were sliced with supports on (`tree(auto)`); only railcovers and facewithbuttons have them off.
- Walls and infill: the generator asks for 5 walls and 20 percent gyroid on the body and 5 walls on the neck segments (MANIFEST.txt lines 6 and 12); every project uses the 2 wall loops and 10 to 20 percent sparse infill of the stock process.
- Conductive pads printed in place: `facewithbuttons` puts the `cbuttons` (conductive PLA) and the face (white PETG) in one two-material job at 0.20 layers, matching the generator's note "0.2 layers, 100% infill" for the cPLA part (`tang_r5_13_core.js:778`), with the infill override set per object. The generator exported them as separate STLs; the slicer assembly co-locates them.
- `press_x3.stl` in `facewithbuttons`: the face Assembly object carries it as a second normal part on extruder 1 (white PETG Pro). Its mesh is one presser piece, 202.3 x 28.4 x 0.8 with 24 triangles (measured; `610/3 - 1.0` by `28.6 - 2 x 0.1` with the 0.4 crown band, from `P.film` and `P.press`, `tang_r5_13_core.js:726` to `738`), but the part matrix in `Metadata/model_settings.config` rotates it 90 deg and scales it by 0.2436 in x and y and 4.4226 in z, so the printed volume is a block of about 49.3 x 6.9 x 3.5 (computed from the matrix) sitting inside the face footprint. The owner reused the presser mesh as a white PETG block in the face job; its purpose is not stated in the file (unknown). No TPU presser and no feet appear in any of the seven projects.

## 5. Mechanisms

Every mechanism in this print set is built and recorded in `fab-knowledge:originals/tang-r5/RECORD.md`: body bands and mortise collar (4.2), face snap lip (4.3), force pad combs and scan read (4.4), conductive PLA pad set with elbow legs and loops (4.5), gear knob with flush set-screw tunnel (4.6), segmented neck with joiners (4.7), presser and clip-on rail caps (4.8), plugs (4.9).

## 6. UX anatomy

None; these are slicer files. The design's own UX is in the TANG R5 bench.

## 7. Tests and harness

None shipped. Physical outcome recorded in the generator's comments: the printed neck indent came out shallower than modelled, which is why the rail caps exist (`tang_r5_13_core.js:66` to `69`).

## 8. Port map

| item | value |
|---|---|
| packages | 3mf (Bambu and Orca project reading, per-object overrides), profile (`ffc5p` machine, PETG HF and PETG Pro presets), nest (single-material plates) |
| feature kinds | as in tang-r5 |
| canon ids | scan-six-pads, force-comb (through tang-r5) |
| canon MISSING | as tang-r5; plus a per-object infill override for a conductive part in a mixed job (no profile or 3MF rule names it) |
| reference ids | none of its own; it is evidence for sensors/scan-six-pads and sensors/force-comb |
| reference MISSING | a physical-print reference for TANG R5 |
| milestone | M00 (3MF corpus parse: the 25 owner 3MFs), M08 (TANG R5 wiring parity) |
| lineage row | MISSING |
