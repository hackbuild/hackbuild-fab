"""Estimate print time from the geometry, not from a rule of thumb.

Volume divided by volumetric flow is the usual back of the envelope and it is
badly wrong for these parts, because a skeletonised lattice is nearly ALL
perimeter and perimeters run at half the speed of solid infill. So this splits it:
for every layer, walk the profile's boundary N times at wall speed, then fill
whatever area is left at infill speed.

Settings are the ones asked about: 0.24 layer, no brim, no raft, PETG, and
otherwise a stock-ish profile for a 0.4 nozzle.

It is an estimate. The slicer is the authority, and it will know about
acceleration limits, cooling holds and seam placement that this does not. Expect
it to land within about 15%.
"""
import math, os, sys
import shapely.geometry as sg
import shapely.ops as so
import skeleton as sk
import kin
from kin import P

LH   = 0.24     # layer height, as asked
LW   = 0.42     # line width for a 0.4 nozzle
WALLS = 3
V_OUTER, V_INNER, V_INFILL = 40.0, 55.0, 90.0    # mm/s, conservative PETG
OVERHEAD = 1.18                                   # travel, accel, z, seams

def part_time(area_mm2, boundary_mm, height_mm):
    layers = max(1, round(height_mm / LH))
    wall_len = boundary_mm * WALLS
    wall_area = min(area_mm2, wall_len * LW)
    fill_len = max(0.0, (area_mm2 - wall_area)) / LW
    t = (boundary_mm / V_OUTER
         + boundary_mm * (WALLS - 1) / V_INNER
         + fill_len / V_INFILL)
    return t * layers * OVERHEAD, layers

def profile(name, axes):
    p, out = sk.skeleton(name, axes or ())
    g = out if axes else p
    polys = g.geoms if g.geom_type == "MultiPolygon" else [g]
    area = sum(q.area for q in polys)
    bound = sum(q.exterior.length + sum(r.length for r in q.interiors) for q in polys)
    return area, bound

# EVERY frame part prints FLAT, which is what orient.py picked, so the layer
# count is the part's THICKNESS over the layer height, not its standing height.
# Using the standing height put the walls at 392 layers of full profile area and
# gave 274 hours for the frame, which should have been obviously wrong.
FULL = [("base", 1, P["T"]), ("wallx", 2, P["T"]), ("wally", 2, P["T"]),
        ("deck", 1, P["T"]), ("face", 1, 2*P["T"]), ("latch", 1, P["T"]),
        ("rail", 2, P["T"])]
AXES = {"base": ("rows","cols"), "deck": ("rows","cols"), "face": ("rows","cols"),
        "latch": ("rows","cols"), "wallx": ("vert",), "wally": ("vert",), "rail": ()}

def run(skel, label):
    # the MINIMAL face is one layer, not two: no upper cap-pocket layer
    heights = {"face": P["T"] if skel else 2*P["T"]}
    print(f"\n{label}")
    print(f"  {'part':8s} {'qty':>3s} {'cm2':>7s} {'layers':>7s} {'each':>8s} {'total':>8s}")
    tot = 0.0
    for name, qty, h in FULL:
        area, bound = profile(name, AXES[name] if skel else None)
        t, layers = part_time(area, bound, heights.get(name, h))
        tot += t * qty
        print(f"  {name:8s} {qty:3d} {area/100:7.1f} {layers:7d} "
              f"{t/3600:7.2f}h {t*qty/3600:7.2f}h")
    print(f"  {'':8s} {'':3s} {'':7s} {'':7s} {'':8s} {tot/3600:7.2f}h")
    return tot

if __name__ == "__main__":
    a = run(False, "FULL FRAME, 0.24 layer, PETG, no brim or raft")
    b = run(True,  "MINIMAL FRAME, same settings")
    print(f"\nfull {a/3600:.1f}h, minimal {b/3600:.1f}h, "
          f"{100*b/a:.0f}% of the time")
