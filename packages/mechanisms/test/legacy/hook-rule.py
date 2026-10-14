"""Closed form run of COTTER hook_fit.py for the 7 pairs of verify_all (M01-T10).

hook_fit.py imports shapely at module level, so it cannot be imported for
the closed form alone. SRC below is `design` and `design_full` copied
verbatim from the canonical copy (lineage row cotter.hook-fit/r5, lines 81
to 100); the run refuses when that file is on this machine and SRC is no
longer in it byte for byte. The harness lines after SRC are not from
hook_fit.py: they print each pair and the bend clearance h at the Rb the
closed form returns, as one JSON object per line with full float repr, so
the TypeScript test compares exact values.

Run from the repo root:
  uv run --project tools/py python packages/mechanisms/test/legacy/hook-rule.py \
    > packages/mechanisms/test/legacy/hook-rule.py.stdout.txt
"""
import json
import math
import os

CANONICAL = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/cotter/files/cotter-src/tools/hook_fit.py"

SRC = '''def design(hole, tb, fit=0.95, margin=0.2):
    """closed form: rod diameter from the hole, smallest bend radius whose swept arc clears the bore"""
    d=round(hole-fit,2)
    Rb=d/2+1.0
    while True:
        outer=Rb+d/2; inner=Rb-d/2
        if inner>tb/2:
            h=outer-math.sqrt(inner*inner-(tb/2)**2)
            if h<=hole-margin: break
        Rb+=0.25
    return d,Rb

def design_full(hole, tb, fit=0.95, margin=0.35, rise=5.5, ext=2.0):
    d,Rb=design(hole,tb,fit,margin)
    s=20.0
    while s<88:
        a=math.radians(s)
        if Rb*(1-math.cos(a))+ext*math.sin(a)+d/2-hole/2>=rise: break
        s+=1.0
    return dict(d=d,Rb=Rb,sweep=s,ext=ext,gap=0.6)
'''

if os.path.exists(CANONICAL):
    with open(CANONICAL, encoding="utf-8") as f:
        if SRC not in f.read():
            raise SystemExit("hook_fit.py no longer holds design and design_full as copied here")

scope = {"math": math}
exec(SRC, scope)

# The pairs of hook_fit.py verify_all, in its order.
PAIRS = ((6.35, 6.35), (6.35, 4.8), (6.35, 3.2), (6.0, 6.35), (6.0, 4.8), (7.1, 6.35), (7.1, 4.8))

for hole, tb in PAIRS:
    p = scope["design_full"](hole, tb)
    outer, inner = p["Rb"] + p["d"] / 2, p["Rb"] - p["d"] / 2
    h = outer - math.sqrt(inner * inner - (tb / 2) ** 2)
    print(json.dumps({"hole": hole, "tb": tb, "d": p["d"], "Rb": p["Rb"], "h": h, "sweep": p["sweep"], "ext": p["ext"]}))
