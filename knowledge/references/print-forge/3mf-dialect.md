# The Orca dialect multicolour 3MF

What Flash Studio (Flashforge Creator 5 Pro), OrcaSlicer and Bambu Studio need in a
project 3MF so that it opens with every part on the right filament and the filament
list fully populated. `scripts/orca3mf.py` and `assets/orca3mf.js` implement all of
this; read here when you need to change them or debug an import.

## Why plain 3MF is not enough

OrcaSlicer's importer (`bbs_3mf.cpp`) only treats a file as a project when the model
metadata `Application` starts with `BambuStudio-` or `OrcaSlicer-`. Otherwise it loads
geometry only: no per-part extruders, no project settings, no filament list. Flash
Studio is OrcaSlicer 2.3.2 under a `BambuStudio-01.10.01.50` header, so that is the
Application string to write.

The second trap is in `PresetBundle.cpp` (`load_config_file_config`): the filament
count comes from the LENGTH of `filament_colour` (with `filament_diameter` cross
checked in `validate_presets`), and the other per-filament vectors are then indexed
without length checks. Declaring three colours while the other ~126 per-filament keys
sit at one entry gets the config rejected or reset, and the filament list collapses to
one even though the parts import with the right extruder numbers. Every per-filament
key must be written N times.

## Package layout

```
[Content_Types].xml               rels, model, png defaults
_rels/.rels                       -> /3D/3dmodel.model (3dmodel rel type)
3D/3dmodel.model                  geometry + components + build
Metadata/model_settings.config    object/part names and extruders, plate, instances
Metadata/project_settings.config  JSON config: preset names + per filament vectors
Metadata/slice_info.config        header block the slicer writes back (harmless, keeps it quiet)
```

The slicer saves back with meshes moved to `3D/Objects/<name>_2.model`, referenced
by `p:path` on the components, plus `3D/_rels/3dmodel.model.rels`. We write a single
model file, so components must NOT carry `p:path`. A round-trip file may also carry
`Metadata/filament_sequence.json`, `Metadata/plate_1.png` and others; none are
required for import.

## 3D/3dmodel.model

```xml
<model unit="millimeter" xml:lang="en-US"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  xmlns:BambuStudio="http://schemas.bambulab.com/package/2021"
  xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06"
  requiredextensions="p">
 <metadata name="Application">BambuStudio-01.10.01.50</metadata>
 <metadata name="BambuStudio:3mfVersion">1</metadata>
 ... Copyright, CreationDate, Designer, Title etc (may be empty)
 <resources>
  <object id="1" p:UUID="00000001-81cb-4c03-9d28-80fed5dfa1dc" type="model"><mesh>...</mesh></object>
  <object id="2" p:UUID="00000002-81cb-4c03-9d28-80fed5dfa1dc" type="model"><mesh>...</mesh></object>
  <object id="3" p:UUID="00000003-61cb-4c03-9d28-80fed5dfa1dc" type="model">
   <components>
    <component objectid="1" p:UUID="00000001-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
    <component objectid="2" p:UUID="00000002-b206-40ff-9872-83e8017abed1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
   </components>
  </object>
 </resources>
 <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">
  <item objectid="3" p:UUID="00000001-b1ec-4553-aec9-835e5b724bb4" transform="1 0 0 0 1 0 0 0 1 128 128 0" printable="1"/>
 </build>
</model>
```

Rules:

- One MESH object per colour part; one COMPONENTS object per printed object that
  gathers the parts; build items reference the components object. Mesh objects must
  appear before the components object that references them.
- The p:UUID suffixes are fixed strings from bbs_3mf.cpp: object `-61cb-4c03-9d28-80fed5dfa1dc`,
  sub object (mesh) `-81cb-4c03-9d28-80fed5dfa1dc`, component `-b206-40ff-9872-83e8017abed1`,
  build `2c7c17d8-22b5-4d84-8835-1976022ea369`, build item `-b1ec-4553-aec9-835e5b724bb4`.
  Prefix is the id as 8 hex digits.
- `printable="1"` on items is a Bambu attribute; lib3mf reports it as "Invalid Attribute
  in namespace", once per item. Expected. Same for the Bambu metadata names, reported as
  "Unknown Model Metadata". `auto_drop="1"` also appears in round-trip files; optional.
- Coordinates: mm, bed at z = 0, part local; the item transform places the object on
  the plate. Multiple instances = multiple items referencing the same components object,
  each with its own item UUID and a matching `model_instance` and `assemble_item`.
- Triangles CCW from outside (positive signed volume). No vertex sharing between parts
  is needed; parts are separate meshes.

## Metadata/model_settings.config

```xml
<config>
  <object id="3">
    <metadata key="name" value="coin"/>
    <metadata key="extruder" value="1"/>
    <part id="1" subtype="normal_part">
      <metadata key="name" value="body"/>
      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
      <metadata key="source_file" value="coin.3mf"/>
      <metadata key="source_object_id" value="0"/>
      <metadata key="source_volume_id" value="0"/>
      <metadata key="source_offset_x" value="0"/> ... y, z
      <metadata key="extruder" value="1"/>
      <mesh_stat face_count="1656" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>
    </part>
    <part id="2" ...> <metadata key="extruder" value="3"/> ...</part>
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value=""/>
    <metadata key="locked" value="false"/>
    <metadata key="filament_map_mode" value="Auto For Flush"/>
    <metadata key="filament_maps" value="1 1 1"/>
    <model_instance>
      <metadata key="object_id" value="3"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="401"/>
    </model_instance>
  </plate>
  <assemble>
   <assemble_item object_id="3" instance_id="0" transform="1 0 0 0 1 0 0 0 1 128 128 0" offset="0 0 0" />
  </assemble>
</config>
```

`part id` = the mesh object id, `object id` = the components object id. The part
`extruder` is 1-based and is the whole point of the file. Every part must exist as a
mesh; every part must carry an extruder that is <= the declared filament count.

## Metadata/project_settings.config

A JSON object. Two groups of keys only:

1. Preset NAME keys, so the slicer does not invent an external preset named after the
   file: `printer_settings_id` ("Flashforge Creator 5 Pro 0.4 nozzle"),
   `print_settings_id` ("0.24mm Standard @FF C5"), `printer_model`
   ("Flashforge Creator 5 Pro"), `printer_variant` ("0.4"), `printer_technology`
   ("FFF"). Names only, never the settings behind them; an empty value = omit the key and
   the slicer keeps its current selection.
2. Per-filament vectors, every one exactly N long, every value a string:
   `filament_colour`, `filament_type`, `filament_settings_id` (preset name per slot,
   pattern `Generic {TYPE} @FF C5P`), `filament_diameter`, `filament_vendor`,
   `filament_ids` (Bambu tray ids: GFL99 PLA, GFG99 PETG, GFB99 ABS, GFB98 ASA, GFU99 TPU,
   GFC99 PC, GFN99 PA, GFS99 PVA), temperatures, fan speeds, density, cost, flow ratio,
   max volumetric speed, vitrification, retraction overrides ("nil" = inherit), scarf
   seam, ramming, cooling moves ... the full set lives in `scripts/filament_template.json`.

Never write printer scoped or process scoped keys (nozzle_diameter, extruder_offset,
retraction_length, layer_height, wall loops, printable_area ...): opening the project
would overwrite the selected machine and process profiles. Never write
`extruder_variant_list`: the loader asserts on it. Do not emit anything under
`different_settings_to_system`.

`filament_map_mode` "Auto For Flush" lets the slicer decide filament to extruder mapping
on a multi tool machine, so `filament_maps` can be all "1".

### Harvesting the gold key set

The template shipped here is reconstructed from OrcaSlicer 2.x filament options and is
marked as such. The authoritative list is whatever the target slicer writes back:

```
python3 scripts/harvest_filament_keys.py roundtrip.3mf        # from a file the slicer saved
python3 scripts/build_orca3mf_js.py                            # restamp assets/orca3mf.js
```

COLLAR harvested 127 keys (99 verbatim, 28 computed) from Moheeb's Flash Studio
round-trip of an earlier export; that list is baked into COLLAR's part3.js as
FILAMENT_TEMPLATE and COAMING's filament_template.json. If either is on hand, harvest
from its example 3MF rather than trusting the reconstruction.

### Opt out

`write_filaments=False` writes only `filament_colour`, `filament_type` and
`filament_settings_id`. Use it when the machine has tuned per-filament presets that a
Generic block would clobber. Parts still import on the right extruders.

## Metadata/slice_info.config

Header `X-BBL-Client-Type slicer` / `X-BBL-Client-Version 01.10.01.50`, one `<object
identify_id=.../>` per instance, one `<filament id=... tray_info_idx=... type=...
color=.../>` per slot. Cosmetic; matches what the slicer writes back so the file looks
native.

## Fallback when the filament list still imports as one

Select all per-colour STLs at once in the open dialog, answer yes to "load as a single
object with multiple parts", then set the filament per part. Every bench exports the STL
bundle for this reason; say so in the print card and README.

## Debugging an import

- Colours lost entirely: Application tag wrong, or a component carries `p:path`.
- Parts on the right extruders but the filament list stayed at one: a per-filament vector
  is not N long, or a value is not a string. `validate_3mf.py` flags both.
- Printer dropdown shows the file name: preset name keys missing.
- Slicer asserts or resets the config on open: `extruder_variant_list` or a printer scoped
  key sneaked in.
- Bed facing art reads backwards in the slicer's bottom view: correct, it is mirrored for
  the print; see print-reality.md.
