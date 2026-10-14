"""Direct-emit board route (M08-T06, D-089): a gated Python generator builds
the board geometry with shapely, refuses to write when a gate fails, and
writes a fab set and a BoardRecord (record.json, recordHash stamped by the
Node adapter, packages/board/src/backends/direct.ts).

Ported from SPINDLE R1 pcb.py and SHUNT R1 gen_fab.py and textpoly.py
(lineage rows spindle.pcb/r1, shunt.fab/r1, shunt.textpoly/r1). Every
writer here takes the epoch from the caller (--epoch, SOURCE_DATE_EPOCH)
and never reads the clock.
"""
import json
import os

# HBF_REPO names the workspace when the library runs from a copy outside it (the reparse tests).
REPO = os.environ.get("HBF_REPO") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


def hbf_version():
    """Version of @hackbuild/core, the hbf binary named in TF.GenerationSoftware."""
    with open(os.path.join(REPO, "core", "package.json")) as f:
        return json.load(f)["version"]
