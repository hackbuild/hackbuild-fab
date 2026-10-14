#!/usr/bin/env python3
"""
build_orca3mf_js.py: regenerate ../assets/orca3mf.js from orca3mf.template.js plus
materials.json and filament_template.json. Run it after re-harvesting the filament
template so the browser writer carries the same per-filament key set as the python one.

    python3 build_orca3mf_js.py
"""
import os, json

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "orca3mf.template.js"), encoding="utf-8").read()
mat = json.load(open(os.path.join(HERE, "materials.json"), encoding="utf-8"))
mat.pop("_note", None)
ft = json.load(open(os.path.join(HERE, "filament_template.json"), encoding="utf-8"))
ft = {"verbatim": ft["verbatim"], "computed": ft["computed"]}
out = src.replace("/*__MATERIALS__*/", json.dumps(mat)).replace("/*__FILAMENT_TEMPLATE__*/", json.dumps(ft))
dst = os.path.join(HERE, "..", "assets", "orca3mf.js")
open(dst, "w", encoding="utf-8").write(out)
print("wrote", os.path.normpath(dst), len(out), "bytes")
