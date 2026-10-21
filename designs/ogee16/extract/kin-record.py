"""OGEE R16 kinematics record (M07-T01 step 4).

Imports ../legacy/source/kin.py (which reads ../legacy/source/params.scad) and records:

- the values kin.py prints from its __main__ block (lines 168 to 190),
  as numbers instead of text;
- the 128 placement rows of check_viewer.py (8 cases over 16 cells, 12
  values each, lines 47 to 67, run here from that file's own text) as
  kin.py computes them, the golden M07-T10 ports against;
- the same 128 rows from the viewer's JS kinematics block (from
  `const DEG=Math.PI/180;` to the state banner of
  ../legacy/source/viewer_template.html, the block check_viewer.py lines 11 to 12
  cut from the baked out/ogee16.html, which the source zip does not hold;
  build_viewer.py only substitutes placeholders, so the block is the same
  text), run in node through check_viewer.py's own harness (lines 16 to
  40). check_viewer.py printed MISMATCHES and exited 0 whatever the count;
  this script exits 1 on any mismatch (D-153);
- setPixel and clear replayed with the viewer's apply() rule
  (viewer_template.html lines 416 to 421: latch when
  lug_bot >= LP_Z + T - 1e-6 while lp < 0.05; clear all when
  lp >= CAM + 0.05), driven as sweep() commits at full stroke (line 578);
- the CHK-MOT-05 latch identity on R16 numbers.

    uv run --project tools/py designs/ogee16/extract/kin-record.py [--write]

Writes packages/motion/records/ogee16-kin.json. Exit 1 when an input is
not the pinned copy, a printed value moved, the JS and Python disagree,
or the result differs from the committed record.
"""
import json, math, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SRC = os.path.join(ROOT, "designs", "ogee16", "legacy", "source")
sys.path.insert(0, os.path.join(ROOT, "tools", "py"))
sys.path.insert(0, SRC)

from legacy_record import Asserts, finish, read_pinned  # noqa: E402

PINS = {
    os.path.join(SRC, "kin.py"): "d2d5a3250c438666179a511d7e87f0c1da9630c1c672eb570382c22f822c1de2",
    os.path.join(SRC, "params.scad"): "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d",
    os.path.join(SRC, "check_viewer.py"): "07c0ec7d63ba5405927f2f42dfb1accc1a16a31c942ed354200e62257c49ad5c",
    os.path.join(SRC, "viewer_template.html"): "9d101e0c28bd7ae75e81dce60483ac62b085460fc945d43d074077ecf5706dd9",
}
for _p, _s in PINS.items():
    read_pinned(_p, _s)

import kin  # noqa: E402
from kin import P, N, px, py  # noqa: E402,F401

NAMES = ["theta", "L", "origin.x", "origin.z", "crown.x", "crown.z", "pin.y", "pin.z",
         "rise", "cammed", "crank phi", "latch phi"]


def lines_of(path, first, last):
    return "".join(open(path).readlines()[first - 1:last])


def printed():
    """kin.py __main__, lines 168 to 190, as numbers."""
    S, z0, full = kin.STROKE, [0.0] * N, [kin.STROKE] * N
    r_full = kin.rocker(0, 0, full, full)
    r_half = kin.rocker(0, 0, full, z0)
    st_half = kin.pin_state(0, 0, full, z0, 0, False)
    st_full = kin.pin_state(0, 0, full, full, 0, False)
    plate_top = kin.LP_Z + kin.T
    return {
        "cam": kin.CAM, "camAvailable": 2 * kin.PIN_PLAY, "camLift": kin.CAMLIFT,
        "fullSelectRise": r_full["crown_top"] - P["CROWN_TOP"], "stroke": S,
        "halfSelectRise": r_half["crown_top"] - P["CROWN_TOP"], "halfSelectSlotUse": r_half["slot_use"],
        "halfSelectCrownX": r_half["crown"][0] - px(0),
        "halfSelectLugTop": st_half["lug_bot"] + kin.LUG_TOT, "plateTop": plate_top,
        "halfSelectMargin": plate_top - (st_half["lug_bot"] + kin.LUG_TOT),
        "fullSelectLugBot": st_full["lug_bot"], "fullSelectOvershoot": st_full["lug_bot"] - plate_top,
        "restLugTop": kin.Z_LUG0 + kin.LUG_TOT, "plateBottom": kin.LP_Z,
        "latchMatrixRow0Col0": [[1 if kin.can_latch(i, j, [S, 0, 0, 0], [S, 0, 0, 0]) else 0
                                 for j in range(N)] for i in range(N)],
        "lugTot": kin.LUG_TOT,
    }


def check_viewer_rows():
    """check_viewer.py run from its own text, on the template's JS block."""
    cv = os.path.join(SRC, "check_viewer.py")
    html = open(os.path.join(SRC, "viewer_template.html")).read()
    ns = {"json": json, "kin": kin, "P": P, "N": N, "px": px, "py": py}
    exec(lines_of(cv, 11, 12), {**ns, "html": html}, ns)          # start, end markers
    ns["block"] = html[ns["start"]:ns["end"]]
    assert "function pinState" in ns["block"] and "function link3" in ns["block"]
    exec(lines_of(cv, 16, 40), ns, ns)                              # js = f"""..."""
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "check.mjs")
        open(path, "w").write(ns["js"])
        res = subprocess.run(["node", path], capture_output=True, text=True)
    if res.returncode:
        raise SystemExit("node error\n" + res.stderr[-2000:])
    got = json.loads(res.stdout)
    exec(lines_of(cv, 47, 67), ns, ns)                              # S, cases, exp
    exp = ns["exp"]
    worst = [0.0] * len(NAMES)
    bad = 0
    for a, b in zip(got, exp):
        for k in range(len(NAMES)):
            dlt = abs(a[k] - b[k])
            worst[k] = max(worst[k], dlt)
            if dlt > 1e-6:
                bad += 1
    return exp, len(got), worst, bad


class Viewer:
    """The viewer state and apply() latch rule, driven by sweep() commits."""

    def __init__(self):
        self.zR, self.zC, self.lp = [0.0] * N, [0.0] * N, 0.0
        self.latched = [[0] * N for _ in range(N)]

    def apply(self):
        if self.lp < 0.05:
            for i in range(N):
                for j in range(N):
                    st = kin.pin_state(i, j, self.zR, self.zC, self.lp, False)
                    if st["lug_bot"] >= P["LP_Z"] + kin.T - 1e-6:
                        self.latched[i][j] = 1
        if self.lp >= kin.CAM + 0.05:
            self.latched = [[0] * N for _ in range(N)]

    def drive(self, i, j):
        for f in (1.0, 0.0):                  # commit at the peak, then the sweep ends at rest
            self.zR, self.zC = [0.0] * N, [0.0] * N
            if i >= 0:
                self.zR[i] = P["STROKE"] * f
            if j >= 0:
                self.zC[j] = P["STROKE"] * f
            self.apply()

    def pull(self, lp):
        self.lp = lp
        self.apply()
        self.lp = 0.0
        self.apply()

    def count(self):
        return sum(map(sum, self.latched))


def programs():
    out = {}
    v = Viewer()
    checker = [(k >> 2, k & 3) for k in range(16) if ((k >> 2) + (k & 3)) % 2 == 0]
    for i, j in checker:
        v.drive(i, j)
    out["checker"] = {"latched": v.count(), "cells": [list(c) for c in checker],
                      "matrix": [row[:] for row in v.latched]}
    v.pull(P["LP_SLIDE"])
    out["clearAfterChecker"] = v.count()
    alone = []
    for i in range(N):
        w = Viewer(); w.drive(i, -1); alone.append(["row", i, w.count()])
    for j in range(N):
        w = Viewer(); w.drive(-1, j); alone.append(["col", j, w.count()])
    out["barAlone"] = alone
    v = Viewer()
    for k in range(16):
        v.drive(k >> 2, k & 3)
    out["all"] = v.count()
    v.lp = kin.CAM + 0.04
    v.apply()
    out["pullCamPlus004"] = {"lp": v.lp, "latched": v.count()}
    v.lp = kin.CAM + 0.05
    v.apply()
    out["pullCamPlus005"] = {"lp": v.lp, "latched": v.count()}
    return out


def main():
    a = Asserts()
    pr = printed()
    exp, n_js, worst, bad = check_viewer_rows()
    prog = programs()
    full, half = pr["fullSelectRise"], pr["halfSelectRise"]
    identity = {
        "marginPlusOvershoot": pr["halfSelectMargin"] + pr["fullSelectOvershoot"],
        "seededForm": pr["stroke"] / 2 - pr["camLift"] - pr["lugTot"],
        "generalForm": (full - half) - pr["camLift"] - pr["lugTot"],
    }
    result = {"printed": pr, "rows": {"names": NAMES, "kinPy": exp},
              "checkViewer": {"placements": n_js, "worstDelta": worst, "mismatches": bad},
              "programs": prog, "latchIdentity": identity}

    # The M07 Records table, 2026-10-04 (computed), to the printed 3 decimals.
    r3 = lambda x: round(x, 3)
    a.eq("CAM", r3(pr["cam"]), 0.925)
    a.eq("CAM available", r3(pr["camAvailable"]), 1.45)
    a.eq("cam lift", r3(pr["camLift"]), 0.776)
    a.eq("full select rise", r3(full), 9.0)
    a.eq("half select rise", r3(half), 4.249)
    a.eq("half select slot use", r3(pr["halfSelectSlotUse"]), 2.125)
    a.eq("half select margin", r3(pr["halfSelectMargin"]), 0.775)
    a.eq("full select overshoot", r3(pr["fullSelectOvershoot"]), 1.4)
    a.eq("latch matrix", pr["latchMatrixRow0Col0"], [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    a.eq("check_viewer placements", n_js, 128)
    a.eq("kin.py rows", len(exp), 128)
    a.eq("check_viewer mismatches", bad, 0)
    a.ok("check_viewer worst delta at most 1e-12", max(worst) <= 1e-12, f"{max(worst):.3e}")
    a.eq("checker latches", prog["checker"]["latched"], 8)
    a.eq("clear leaves", prog["clearAfterChecker"], 0)
    a.eq("each bar alone latches", [x[2] for x in prog["barAlone"]], [0] * 8)
    a.eq("all 16 latch", prog["all"], 16)
    a.eq("pull to CAM + 0.04", [r3(prog["pullCamPlus004"]["lp"]), prog["pullCamPlus004"]["latched"]], [0.965, 16])
    a.eq("pull to CAM + 0.05 releases", prog["pullCamPlus005"]["latched"], 0)
    a.eq("margin + overshoot", round(identity["marginPlusOvershoot"], 4), 2.1753)
    a.eq("seeded form", round(identity["seededForm"], 4), 1.9238)
    a.eq("general form", r3(identity["generalForm"]), 2.175)
    a.near("general form equals margin + overshoot", identity["generalForm"], identity["marginPlusOvershoot"], 1e-3)

    finish({
        "record": "ogee16-kin",
        "out": "packages/motion/records/ogee16-kin.json",
        "command": "uv run --project tools/py designs/ogee16/extract/kin-record.py",
        "qualifier": "computed: kin.py on params.scad; the viewer JS block run in node through check_viewer.py's harness; programs replayed with the viewer apply() rule",
        "inputs": PINS,
    }, result, a)
    print(f"CAM {pr['cam']:.3f}, cam lift {pr['camLift']:.3f}, full rise {full:.3f}, half rise {half:.3f}, "
          f"margin {pr['halfSelectMargin']:.3f}, overshoot {pr['fullSelectOvershoot']:.3f}; "
          f"{n_js} placements, {bad} mismatches, worst {max(worst):.1e}; checker {prog['checker']['latched']} of 16, "
          f"clear {prog['clearAfterChecker']}, all {prog['all']}")


if __name__ == "__main__":
    main()
