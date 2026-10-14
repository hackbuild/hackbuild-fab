#!/usr/bin/env python3
"""
harvest_filament_template.py: build the per-slot filament template from a 3MF
the slicer itself saved, and report how it differs from the 97-key seed.

    uv run --project tools/py tools/py/harvest_filament_template.py [path.3mf] [--check]

Ported from harvest_filament_keys.py (D-159). The slicer's own save is the
record of which keys are per filament: every list-valued key in
Metadata/project_settings.config whose length equals the filament count N.
Per-extruder vectors have length E (the extruder count), so when N equals E
the two cannot be told apart and the harvest refuses with exit 2.

Writes, from the repo root:
  packages/3mf/data/filament_template.json  per-slot values, strings, keys sorted
  tools/corpus/3mf/template-diff.md          gold set against seed-97.json

--check regenerates both in memory and exits 1 if either differs from the
copy on disk, or if the diff counts move from the ones recorded in M-1-T08.
Stdlib only; the zip is opened through validate_3mf.open_package (D-166).
"""
import argparse
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate_3mf import InputError as PackageError, open_package  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GOLD = "tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf"
SEED = "tools/corpus/3mf/seed-97.json"
TEMPLATE_OUT = "packages/3mf/data/filament_template.json"
DIFF_OUT = "tools/corpus/3mf/template-diff.md"

# The seed's per_extruder_exclude drops these, yet the slicer writes them per
# filament (R50, D-159).
KEEP = ("filament_extruder_variant", "filament_map", "filament_self_index")

# The 3MF records the application and the printer preset, never the program
# that saved it. Flash Studio is the owner's record of the 2026-08-19 save.
SAVED_BY = "Flash Studio"

# Counts and key lists M-1-T08 fixes for the gold file; --check asserts them.
EXPECT = {
    "gold": 127,
    "seed": 97,
    "seedVerbatim": 68,
    "seedComputed": 29,
    "shared": 90,
    "missing": [
        "activate_air_filtration_during_print",
        "activate_air_filtration_on_completion",
        "adaptive_pressure_advance",
        "adaptive_pressure_advance_bridges",
        "adaptive_pressure_advance_model",
        "adaptive_pressure_advance_overhangs",
        "additional_fan_full_speed_layer",
        "close_additional_fan_first_x_layers",
        "filament_adaptive_volumetric_speed",
        "filament_adhesiveness_category",
        "filament_change_extrusion_role_gcode",
        "filament_change_length",
        "filament_colour_type",
        "filament_cooling_before_tower",
        "filament_extruder_variant",
        "filament_flush_temp",
        "filament_flush_volumetric_speed",
        "filament_ironing_flow",
        "filament_ironing_inset",
        "filament_ironing_spacing",
        "filament_ironing_speed",
        "filament_map",
        "filament_multi_colour",
        "filament_printable",
        "filament_self_index",
        "filament_tower_interface_pre_extrusion_dist",
        "filament_tower_interface_pre_extrusion_length",
        "filament_tower_interface_print_temp",
        "filament_tower_interface_purge_volume",
        "filament_tower_ironing_area",
        "first_x_layer_fan_speed",
        "internal_bridge_fan_speed",
        "ironing_fan_speed",
        "long_retractions_when_ec",
        "pellet_flow_coefficient",
        "retraction_distances_when_ec",
        "volumetric_speed_coefficients",
    ],
    "extra": [
        "filament_load_time",
        "filament_prime_volume",
        "filament_scarf_gap",
        "filament_scarf_height",
        "filament_scarf_length",
        "filament_scarf_seam_type",
        "filament_unload_time",
    ],
    "differing": 17,
}

SPOT = ("fan_max_speed", "pressure_advance", "overhang_fan_threshold",
        "filament_map", "filament_self_index", "filament_extruder_variant")


def fail(code, msg):
    print("harvest: " + msg, file=sys.stderr)
    sys.exit(code)


def as_str(v):
    return v if isinstance(v, str) else json.dumps(v)


def read_gold(path):
    try:
        # open_package refuses unsafe names, more than 4096 entries and more than 256 MB inflated (D-166).
        z = open_package(path)
    except PackageError as e:
        fail(2, "cannot open %s: %s" % (path, e))
    try:
        info = z.getinfo("Metadata/project_settings.config")
    except KeyError:
        fail(1, "no Metadata/project_settings.config in %s" % path)
    ps = json.loads(z.read(info).decode("utf-8"))
    model = z.read("3D/3dmodel.model").decode("utf-8")
    m = re.search(r'<metadata name="Application">([^<]*)</metadata>', model)
    app = m.group(1) if m else ""
    saved = "%04d-%02d-%02d" % info.date_time[:3]
    with open(path, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    return ps, app, saved, sha


def build(gold_path):
    ps, app, saved, sha = read_gold(gold_path)
    for k in ("filament_colour", "nozzle_diameter"):
        if not isinstance(ps.get(k), list):
            fail(1, "no %s vector in the config; not a slicer save" % k)
    n = len(ps["filament_colour"])
    e = len(ps["nozzle_diameter"])
    if n == e:
        fail(2, "filament count %d equals extruder count %d; per-filament and "
                "per-extruder vectors cannot be told apart (D-159). save the "
                "project with a different filament count" % (n, e))

    with open(os.path.join(ROOT, SEED), encoding="utf-8") as f:
        seed = json.load(f)
    seed_verbatim = sorted(seed["verbatim"])
    seed_computed = list(seed["computed"])
    exclude = [k for k in seed["per_extruder_exclude"] if k not in KEEP]

    per = {k: [as_str(x) for x in v] for k, v in ps.items()
           if isinstance(v, list) and len(v) == n and k not in exclude}
    keys = {k: per[k] for k in sorted(per)}

    absent = [k for k in seed_computed if k not in keys]
    if absent:
        fail(1, "computed keys absent from the gold file: " + ", ".join(absent))

    template = {
        "source": {
            "file": GOLD,
            "sha256": sha,
            "application": app,
            "printer": as_str(ps.get("printer_settings_id", "")),
            "savedBy": SAVED_BY,
            "saved": saved,
        },
        "filamentCount": n,
        "keys": keys,
        "computed": seed_computed,
        "perExtruderExclude": exclude,
    }
    template_text = json.dumps(template, indent=2, ensure_ascii=False) + "\n"

    seed_set = set(seed_verbatim) | set(seed_computed)
    gold_set = set(keys)
    shared = sorted(gold_set & seed_set)
    missing = sorted(gold_set - seed_set)
    extra = sorted(seed_set - gold_set)
    differing = [k for k in keys if len(set(keys[k])) > 1]

    stats = {
        "gold": len(gold_set),
        "seed": len(seed_set),
        "seedVerbatim": len(seed_verbatim),
        "seedComputed": len(seed_computed),
        "shared": len(shared),
        "missing": missing,
        "extra": extra,
        "differing": len(differing),
    }

    lines = [
        "# filament template diff",
        "",
        "Generated by `tools/py/harvest_filament_template.py`; never hand-edit.",
        "Gold: `%s`, sha256 %s, %s, %s, saved %s by %s." % (
            GOLD, sha, app, template["source"]["printer"], saved, SAVED_BY),
        "Seed: `%s`. Filaments in the gold file: %d (computed); extruders: %d (computed)." % (
            SEED, n, e),
        "",
        "gold per-filament keys: %d; seed keys: %d (%d verbatim plus %d computed); shared: %d" % (
            stats["gold"], stats["seed"], stats["seedVerbatim"], stats["seedComputed"],
            stats["shared"]),
        "",
        "## missing from the seed (%d)" % len(missing),
        "",
    ]
    lines += ["- " + k for k in missing]
    lines += ["", "## extra in the seed (%d)" % len(extra), ""]
    lines += ["- " + k for k in extra]
    lines += ["", "## kept from the seed's per_extruder_exclude (%d)" % len(KEEP), ""]
    lines += ["- " + k for k in KEEP]
    lines += ["", "## values that differ across the %d slots (%d)" % (n, len(differing)), ""]
    lines += ["- " + k for k in differing]
    lines += ["", "## spot values, per slot", ""]
    lines += ["- %s: %s" % (k, ", ".join(keys[k])) for k in SPOT if k in keys]
    lines.append("")
    diff_text = "\n".join(lines)
    return template_text, diff_text, stats


def main(argv):
    ap = argparse.ArgumentParser(description="harvest the per-slot filament template")
    ap.add_argument("path", nargs="?", default=os.path.join(ROOT, GOLD),
                    help="a 3MF the slicer saved (default: the gold file)")
    ap.add_argument("--check", action="store_true",
                    help="regenerate in memory and fail on drift from the files on disk")
    a = ap.parse_args(argv)

    template_text, diff_text, stats = build(a.path)
    outputs = ((TEMPLATE_OUT, template_text), (DIFF_OUT, diff_text))

    if a.check:
        problems = []
        for k, want in EXPECT.items():
            if stats[k] != want:
                got = stats[k]
                if isinstance(want, list):
                    problems.append("%s keys moved: added %s, dropped %s" % (
                        k, sorted(set(got) - set(want)), sorted(set(want) - set(got))))
                else:
                    problems.append("%s count %s, recorded %s" % (k, got, want))
        for rel, text in outputs:
            p = os.path.join(ROOT, rel)
            try:
                with open(p, encoding="utf-8") as f:
                    on_disk = f.read()
            except OSError:
                problems.append("%s missing; run the harvest without --check" % rel)
                continue
            if on_disk != text:
                problems.append("%s differs from a fresh harvest; run it without --check" % rel)
        if problems:
            for p in problems:
                print("harvest: " + p, file=sys.stderr)
            sys.exit(1)
        print("harvest: template and diff match; %d keys, %d missing, %d extra" % (
            stats["gold"], len(stats["missing"]), len(stats["extra"])))
        return

    for rel, text in outputs:
        p = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
        print("wrote " + rel)
    print("harvest: %d keys, %d missing, %d extra" % (
        stats["gold"], len(stats["missing"]), len(stats["extra"])))


if __name__ == "__main__":
    main(sys.argv[1:])
