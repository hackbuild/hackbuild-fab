"""Writes packages/sim/test/goldens/cotter-insert-oracle.json: what the COTTER
insertion proof (fab-knowledge:originals/cotter/files/cotter-src/tools/hook_fit.py,
lineage cotter.hook-fit/r5) says about the M02-T09 cases, run unedited.

The original is imported from the originals archive (tools/py/hbf_archives.py,
HBF_ORIGINALS), never changed. Its own `verify_all` runs first
with stdout captured; `design_full` and `search` are wrapped only to record
the seven (hole, board) pairs it passes, so the case list comes from the
oracle and is typed nowhere here. `heapq.heappop` inside the module is
wrapped to record each popped state (tilt step, x step, y step), which gives
the oracle's search path and its clearing pose. Two more cases follow:

  kit    hole and board of COTTER's first kit,
         layout.json state.board (lineage cotter.kit-layout/2026-09-21)
  sharp  hole 6.35, board 6.35, rod 5.40, Rb 6.0, sweep 52, the clip_poly
         defaults otherwise (M02-sim.md records, "TRAPPED, max tilt 12 deg")

No wall time is written, so a rerun reproduces the file byte for byte
(2.50 s wall for `npm run cotter:oracle -w packages/sim`, measured on an
Apple M1, 2026-10-07). Run from the repo root:
  uv run --project tools/py python packages/sim/scripts/cotter_insert_oracle.py"""
import contextlib, hashlib, heapq, io, json, platform, re, sys
from importlib.metadata import version
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/py"))
from hbf_archives import local_source  # noqa: E402

HOOK_FIT = "fab-knowledge:originals/cotter/files/cotter-src/tools/hook_fit.py"
KIT_SOURCE = "fab-knowledge:evidence/x/downloads/dl-pip-latest/cotter/unzipped/cotter-kit_today_2026-09-21/layout.json"
HOOK = Path(local_source(HOOK_FIT))
KIT = Path(local_source(KIT_SOURCE))
OUT = ROOT / "packages/sim/test/goldens/cotter-insert-oracle.json"

sys.path.insert(0, str(HOOK.parent))
import hook_fit as hf  # noqa: E402
from shapely import affinity  # noqa: E402

SHARP = dict(hole=6.35, tb=6.35, d_rod=5.40, Rb=6.0, sweep=52.0)


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


class Trace:
    """heapq stand-in for hook_fit: heappop records the state it returns."""

    def __init__(self):
        self.popped = []

    def heappush(self, pq, item):
        heapq.heappush(pq, item)

    def heappop(self, pq):
        item = heapq.heappop(pq)
        self.popped.append(list(item[2]))
        return item


def geometry(tb, hole, d_rod, kw):
    clip, info = hf.clip_poly(tb, hole, d_rod, **kw)
    board = hf.board(tb, hole).buffer(-0.01)
    return {
        "clip": {"area": clip.area, "bounds": list(clip.bounds), "top": info["top"], "tip": list(info["tip"])},
        "board": {"area": board.area, "bounds": list(board.bounds)},
    }


def run(tb, hole, d_rod, kw):
    trace = Trace()
    hf.heapq = trace
    ok, info, msg = hf.search(tb, hole, d_rod, **kw)
    hf.heapq = heapq
    m = re.search(r"after (\d+) poses", msg)
    tilt = re.search(r"max tilt (\d+)", msg)
    path = trace.popped
    return {
        "inserts": ok,
        "msg": msg,
        "poses": int(m.group(1)) if m else len(path),
        "maxTiltDeg": int(tilt.group(1)) if tilt else None,
        "clearing": path[-1] if ok else None,
        "path": path,
    }


# 1. verify_all as shipped, recording the pairs it hands to design_full.
pairs = []
design_full = hf.design_full


def recording_design_full(hole, tb, *a, **kw):
    pairs.append((hole, tb))
    return design_full(hole, tb, *a, **kw)


hf.design_full = recording_design_full
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    verify_ok = hf.verify_all()
hf.design_full = design_full

# 2. every case through design_full (or the sharp dims) and search, traced.
kit = json.loads(KIT.read_text())["state"]["board"]
cases = [{"id": f"verify-{i + 1}", "from": "hook_fit.py verify_all", "hole": h, "tb": tb} for i, (h, tb) in enumerate(pairs)]
cases.append({"id": "kit-2026-09-21", "from": "kit-2026-09-21 layout.json state.board (lineage cotter.kit-layout/2026-09-21)", "hole": kit["hole"], "tb": kit["tb"]})
rows = []
for c in cases:
    p = design_full(c["hole"], c["tb"])
    kw = dict(Rb=p["Rb"], sweep=p["sweep"], ext=p["ext"], gap=p["gap"])
    rows.append({**c, "dims": {"d": p["d"], **kw}, **geometry(c["tb"], c["hole"], p["d"], kw), **run(c["tb"], c["hole"], p["d"], kw)})
s = SHARP
kw = dict(Rb=s["Rb"], sweep=s["sweep"])
rows.append({
    "id": "sharp", "from": "M02-sim.md records: search() with a sharp bend", "hole": s["hole"], "tb": s["tb"],
    "dims": {"d": s["d_rod"], **kw}, **geometry(s["tb"], s["hole"], s["d_rod"], kw), **run(s["tb"], s["hole"], s["d_rod"], kw),
})

# 3. the predicate at every 20th popped state of the first case and its 11 neighbours,
# so a port can check rotation sign, origin and the inset board.
probe = rows[0]
clip, _ = hf.clip_poly(probe["tb"], probe["hole"], probe["dims"]["d"], Rb=probe["dims"]["Rb"], sweep=probe["dims"]["sweep"], ext=probe["dims"]["ext"], gap=probe["dims"]["gap"])
bp = hf.board(probe["tb"], probe["hole"]).buffer(-0.01)
MOVES = ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1), (1, 1, 0), (1, 0, 1), (1, 0, -1), (1, 1, 1), (1, 1, -1))
states = []
for k in range(0, len(probe["path"]), 20):
    t, i, j = probe["path"][k]
    states += [(t, i, j)] + [(t + a, i + b, j + c) for a, b, c in MOVES]
probes = []
for t, i, j in states:
    g = affinity.translate(affinity.rotate(clip, t * 1.0, origin=(0, 0)), i * 0.2, j * 0.2)
    probes.append({"state": [t, i, j], "intersects": bool(bp.intersects(g)), "minX": g.bounds[0]})

OUT.write_text(json.dumps({
    "note": "written by packages/sim/scripts/cotter_insert_oracle.py; never hand-edited",
    "source": {"file": HOOK_FIT, "sha256": sha(HOOK)},
    "kit": {"file": KIT_SOURCE, "sha256": sha(KIT)},
    "env": {"python": platform.python_version(), "shapely": version("shapely"), "machine": platform.machine(), "system": platform.system()},
    "verify": {"exit": 0 if verify_ok else 1, "stdout": buf.getvalue()},
    "cases": rows,
    "probes": {"case": probe["id"], "poses": probes},
}, indent=1) + "\n")
print(f"wrote {OUT.relative_to(ROOT)}: {len(rows)} cases, verify exit {0 if verify_ok else 1}")
