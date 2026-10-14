# Catalog rows

Bought parts with per-field provenance (D-102, D-103, M08-T03). This folder
holds committed rows only: tier verified or vendor, plus community rows whose
source file is committed beside them. Rows that come from an external lookup
(KiCad libraries through `tools/py/board/kicad_fetch.py`, distributor pages)
are written into `<workspace>/.hbf/cache/catalog/` with their provenance and
never into this folder. Rows at tier inferred live here only when a design
on record reads them and the inference is the point of the row (SG90, the
BLOCKS seat rows); the export gate refuses every one of them.

## Where a row lives

- `<kind>/<id>.json`, or `<kind>/<id>/row.json` when files sit beside it.
- Kind folders: `mcu`, `modules`, `actuators`, `displays`.
- `mcu-pins.json` is the M05 threshold table (D-076); MCU rows point at it by
  id and never copy a threshold.

## Row format

```json
{
  "id": "esp32c3-supermini",
  "name": "ESP32-C3 SuperMini",
  "kind": "module",
  "fields": {
    "pads": {
      "from": { "kind": "kicad", "mod": "supermini.kicad_mod", "sym": "supermini.kicad_sym", "count": 16 },
      "unit": "mm",
      "provenance": { "tier": "vendor", "method": "listing", "date": "2026-10-09", "source": "..." }
    },
    "dims.body": { "value": [22.52, 18], "unit": "mm", "provenance": { "...": "..." } }
  }
}
```

- Every field carries `value` (or `from`, parsed at load), `unit` and
  `provenance` (D-099: tier, method, date, source; machine and coupon on a
  measured row). Write `"unit": "unknown"` when the source states none.
- Field names and what they feed are fixed in `src/fields.ts`: `pads`,
  `envelope`, `mountHoles`, `keepouts`, `mout` and every `dims.<name>` are
  geometry; `pins` is connectivity; `vil`, `vih`, `pullup`, `strapping`,
  `bootActivity` and every `dyn.<name>` are read by checks only. An unknown
  name is refused at load.
- A row's tier is its weakest geometry or connectivity field. Check fields
  never lower it; their tier is reported inside the check that reads them.
- `conflicts` lists every bench value when the corpus disagrees, each with
  its source. Such a field stays inferred until a person measures it (D-104).
- `mesh` names an STL beside the row; the mesh kernel's winding test runs at
  load and an inverted mesh refuses the row.

## How a person adds a row

1. Find a drawing, a datasheet page or a library file. Cite it in `source`
   with the version, page or repo path and commit. A number from memory is a
   row at tier inferred, and the export gate refuses it.
2. Put each number on the field it shapes, with its own provenance.
3. Never raise a tier to make an export pass. A caliper reading enters as a
   coupon (PROFILE.md 11.1), never by editing a tier here.
