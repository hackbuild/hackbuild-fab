# The multi-filament 3MF dialect

This is `hackbuild-3mf`. Everything here is normative. It is the single piece
of this body of work with a real external audience, because nobody else has
solved programmatic clean multi-filament 3MF and everyone who tries hits the
same bugs.

## Why a dialect at all

Flash Studio is OrcaSlicer 2.3.2 under a BambuStudio-01.10.01.50 header. The
Creator 5 Pro is a 4-toolhead toolchanger, which is why the Bambu/Orca
model_settings dialect is the right flavour rather than plain 3MF materials.

## The Application tag

OrcaSlicer's `bbs_3mf.cpp` only sets `m_is_bbl_3mf` when the `Application`
metadata tag STARTS WITH "BambuStudio-" or "OrcaSlicer-". Otherwise it loads
geometry only and silently drops all colour assignment.

Write:
- `Application` = `BambuStudio-01.10.01.50`
- an OrcaSlicer tag
- `BambuStudio:3mfVersion`
- the production-extension p:UUIDs with these canonical suffixes: object
  `-61cb-`, sub-object `-81cb-`, component `-b206-`, build `2c7c17d8-`, item
  `-b1ec-`

## num_filaments comes from len(filament_colour)

The root cause of the single biggest class of failure. In
`PresetBundle.cpp load_config_file_config`, `num_filaments` is taken from the
LENGTH of `filament_colour`, and other per-filament vectors get indexed
WITHOUT length checks (`validate_presets` reads `filament_diameter`'s size).

Declaring 3 colours while the other ~126 per-filament keys stay at 1 entry
gets the config rejected or reset. The symptom is parts importing on the
right extruders while the filament list stays at one.

So: `Metadata/project_settings.config` writes EVERY per-filament key exactly
N times.

## The key template

The gold 127-key list was harvested from a real Flash Studio round trip: 99
copied verbatim, 28 computed per slot. It lives in COLLAR's part3.js as
`FILAMENT_TEMPLATE` and in COAMING's `filament_template.json`. A harvester
(`harvest_filament_keys.py`) rebuilds the template from any round-tripped
3MF. That harvester belongs in the extracted repo.

Rules on the key set:

- NO printer-scoped or process-scoped keys. Opening a file must not disturb
  the selected printer or process profile. `layer_height` and
  `initial_layer_print_height` in there is what crashed Flash Studio once.
- NO excluded keys (`compatible_printers`, `filament_extruder_variant`). [superseded by D-159: keep filament_map, filament_self_index, filament_extruder_variant]
- NO Bambu 2.x-only keys.
- Do NOT emit `extruder_variant_list`. The loader asserts on it.
- NO `paint_color` on triangles.
- Write `printer_settings_id` and `print_settings_id` as NAMES ONLY, never
  the settings behind them. Without them the slicer invents an external
  preset named after the file. Blank means do not touch the selection.
- Write `curr_bed_type` from the machine preset (`MachinePreset.slicer.bedType`,
  "Textured PEI Plate" on ffc5p). Without it Flash Studio opens the file on
  the cold plate (owner report 2026-10-05). [added by D-226: the ninth scalar
  key; the value follows the preset, not the gold]
- Correct tray ids.

Defaults: printer `Flashforge Creator 5 Pro 0.4 nozzle`, process
`0.24mm Standard @FF C5`, filament pattern `Generic {TYPE} @FF C5P`.

Besides the 127-key template, the writers emit nine scalar keys, 136 in all
(computed, M00-T08): `curr_bed_type`, `from`, `name`, `print_settings_id`,
`printer_model`, `printer_settings_id`, `printer_technology`,
`printer_variant`, `version` (SCALAR_KEYS in
packages/3mf/src/writer/settings.ts). `curr_bed_type` is the ninth, taken
from the machine preset `slicer.bedType` (ffc5p: Textured PEI Plate).
Without it Flash Studio opens the file on the cold plate (owner report
2026-10-05), and validate_3mf.py notes the missing key. It stays out of the
gold equality check: the gold save wrote High Temp Plate.

## Package contents

- `3D/3dmodel.model` with a components object per printed object
- `Metadata/model_settings.config` with per-part extruders
- `Metadata/project_settings.config` as above
- `Metadata/slice_info.config`
- `Metadata/filament_sequence.json`
- the plate block carries `filament_map_mode` ("Auto For Flush") and
  `filament_maps`, plus `model_instance` blocks
- the build item carries `auto_drop="1"`
- on round trip, Flash Studio moves meshes into
  `3D/Objects/<name>_2.model` with p:path components plus
  `3D/_rels/3dmodel.model.rels`. Reading that back is how the template was
  harvested.

### p:path on a root component, the empty-plate bug

A component in the root `3D/3dmodel.model` must NOT carry `p:path`.
`bbs_3mf.cpp` keys a component as (m_sub_model_path or path, objectid) but
keys the objects it reads as (m_sub_model_path, id); reading the root file
leaves m_sub_model_path empty, so a self-referential `p:path` never
resolves, `_generate_current_object_list` skips it silently, and the object
loads with NO VOLUMES. Flash Studio shows an empty plate with no error.
`p:path` belongs only on components whose sub-object lives in a separate
`3D/Objects/*.model`. Found on CASK, Sep 2026.

### Two more key facts, from CASK

- `overhang_fan_threshold` is a coEnums whose C++ default is the constant
  Overhang_threshold_bridge, but the config file wants the STRING "95%".
- the roughly twenty nullable retract and ironing overrides must be written
  as the string "nil".
- the filament keys and defaults can be harvested straight from OrcaSlicer
  v2.3.2 sources: `s_Preset_filament_options` in Preset.cpp plus the
  defaults in PrintConfig.cpp. That is the second route to the template
  besides a slicer round trip.

### Per-object overrides for conductor parts (M05-T20)

Process keys never go in `project_settings.config`; per object and per
part they go in `model_settings.config` as `<metadata key value/>` after
the extruder line, the place a slicer save keeps per-object settings. A
part whose body role is `conductor` or `flex-conductor` gets
`sparse_infill_density` `100%`, and every object holding one or sharing a
face with one gets `interlocking_beam` `0`: Orca's beams interleave two
filaments up to `interlocking_depth` cells (default 2, beam width 0.8 mm,
`PrintConfig.cpp` 4792 to 4870) and eat a conductor's cross section.
CHK-3MF-08 refuses a package where such an object has beams on, set per
object or inherited from the project. Whether Flash Studio applies the two
keys from `model_settings.config` is unverified until the owner opens an
export in it; the print card lists both for the person to confirm
(D-246).

lib3mf will report about 8 to 10 "Unknown Model Metadata" notices. Those are
the Bambu tags. Expected, and it belongs in the README.

## Geometry rules

These are what make a multi-filament file actually slice.

1. Every non-PETG (non-structure) insert is inset 1 MICRON by a TRUE EDGE
   NORMAL offset. A homothety about the centroid pushes spirals sideways into
   the wall.
2. Structure bands must cut EVERY feature alive in their overlap zone, or a
   13 micron shelf sits inside the trace above.
3. Holed bands overlap FULL bands, never the reverse.
4. Bed offsets travel as 3MF ITEM TRANSFORMS so vertices stay small.
5. Polygon vertices are snapped to the writer's 6-decimal grid BEFORE [superseded by D-054: dyadic 1/1024 mm grid]
   triangulation, so the sliver test is exact and node and Chromium agree.
6. Stroke joint circles 0.03 over the half width avoid pinch vertices.
7. Shells are never dropped after failed retries.
8. Two same-part shells must never share a vertex: lap by EZ or inset by 0.3
   to 0.6. Cross-part contacts must abut EXACTLY; an EZ overlap times any
   real area trips the overlap check.
9. A part may export as a STACK of solids, one per band, overlapping where
   they meet. Slicers union them, and this is what keeps 2D booleans out of
   the writer entirely.

### Headless slicing

The writer's key set is complete for the GUI, not for the headless CLI.
The GUI fills a project from the presets it names on load; the Flash
Studio CLI (Orca-Flashforge 2.3.2) run with a fresh `--datadir` does not,
and it exits on SIGSEGV (139) right after loading a project config without
`nozzle_diameter`, `printable_height` and `gcode_flavor` (measured
2026-10-07, found by key bisection against an owner save). The writer
still adds no printer- or process-scoped key (D-237): those three would let
a file override the owner's printer profile on open. A headless slice goes
through `tools/slice/slice.mjs`, whose `completeProject` flattens the
bundled machine, process and per-slot filament presets the project names
and lays every embedded key over them, as the GUI does. `--load-settings`
stays unused because the CLI ranks it above the 3MF. A slot whose preset
name is not bundled needs an explicit `--filament-map`, recorded in
`slice-run.json` as an inferred stand-in. Every run gets a new, empty
`--datadir`; the owner's profile is never touched. The GUI open of the
writer's 3MF stays the owner's step.

## The validator

`validate_3mf.py` must check:
- package structure
- edge manifoldness and vertex manifoldness
- lib3mf load with non-manifold count 0
- trimesh watertight per geometry
- per-filament vector lengths all equal N
- `--overlap`: zero overlap volume between colour parts
- parts sum exactly to the solid

Independent verification: re-export, unzip, parse every STL, and compare
per-part volumes and bounding boxes against the source kernel.

## The fallback that always works

Select all the per-colour STLs at once in the open dialog and answer yes to
"load as a single object with multiple parts", then assign filament per part.
Document this in every README.

## The one thing only he can do

The real slicer round trip. Open the example in Flash Studio, confirm the
filament list shows N entries and the printer dropdown shows the machine,
save, and send the file back so the harvester can rebuild the template. The
file must be opened as a PROJECT (File, Open), not imported.
