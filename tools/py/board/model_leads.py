#!/usr/bin/env python3
"""model_leads.py, the lead positions and bounds of KiCad .wrl part models,
cached as JSON for CHK-BRD-19 (M08-T09 step 2).

    uv run --project tools/py tools/py/board/model_leads.py <dir of .wrl> --out <models.json>

wrl.py parses each model (scale 2.54, geometry before material, Z-up board
plane at 0) and clusters the vertices below the board plane into leads.
The cache keeps numbers only, no mesh: per model its bounds and its leads
in the footprint frame, (model x, minus model y), the frame a KiCad pad
table uses (SHUNT build_sim.py negates model z for the same reason), with
the sha256 of each source file. The models stay outside the repo (KiCad
library files go only under packages/catalog/data/kicad, M08-T01 step 5).
"""
import argparse
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import wrl  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description="cache .wrl lead positions for the lead landing check")
    ap.add_argument("models")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    out = {}
    for fn in sorted(os.listdir(a.models)):
        if not fn.endswith(".wrl"):
            continue
        path = os.path.join(a.models, fn)
        meshes = wrl.parse(path)
        lo, hi = wrl.bbox(meshes)
        leads = [[x, 0.0 if z == 0 else -z] for x, z in wrl.leads(meshes)]
        out[fn[:-4]] = {"bbox": [[round(v, 4) for v in lo], [round(v, 4) for v in hi]], "leads": leads,
                        "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest()}
        print(f"  {fn}: {len(leads)} leads")
    with open(a.out, "w", newline="\n") as f:
        json.dump({"about": "lead positions (footprint frame, mm) and bounds (Y-up, mm) of KiCad .wrl models, computed by tools/py/board/model_leads.py through wrl.py; numbers only",
                   "models": out}, f, indent=1, sort_keys=True)
        f.write("\n")


if __name__ == "__main__":
    main()
