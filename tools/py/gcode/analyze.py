"""Virtual print, slicer half: read sliced G-code back as deposited roads and
compare them, layer by layer, with sections of the 3MF the slicer was given.

    uv run --project tools/py tools/py/gcode/analyze.py \\
        --gcode <plate_1.gcode> --3mf <file.3mf> [--model-json <x.model.json>] \\
        [--run-json <slice-run.json>] --out <dir>

Writes <dir>/slice.json, <dir>/report-slice.md and PNG layer maps under
<dir>/layers/. Every figure it prints is computed from the G-code and the
meshes (a simulated print); slicer footer figures are the slicer's own
estimate, also computed. Nothing here is measured from a printed part.

Model of a road: each extruding G1, G2 or G3 move is a capsule of the width
the slicer wrote in its last ;WIDTH: comment, at the layer's ;Z:, filling
the layer from ;Z: minus ;HEIGHT: to ;Z:. Arcs are cut into chords of at
most 0.005 mm sagitta. Model sections are cut at each layer's mid-height and
filled even-odd on the same grid. Grid pitch 0.05 mm.

The conductor tool is the extruder of the bodies model.json gives a net, and
the cap tool the extruder of the bodies its keys name as caps; nothing here
assumes a slot order. The 3MF is read through validate_3mf.open_package, so
the D-166 zip limits apply.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import struct
import sys
import zlib
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import validate_3mf as v3  # noqa: E402

RES = 0.05
"""Raster pitch, mm."""
ARC_SAGITTA = 0.005
"""Largest chord sagitta when an arc is cut into segments, mm."""
SLIVER_PX = 2
"""Opening radius, px, that removes bead-edge slivers before a missing area counts as a feature."""
MIN_FEATURE_MM2 = 0.02
"""Smallest missing or unsupported area reported as a feature, mm^2."""
EDGE_MM = 0.25
"""Margin inside a body edge, and around the model, where another tool's bead may lie, mm: a neighbour's perimeter overlaps a body edge by at most half a road (0.21 mm at 0.42)."""
TOWER_ROLES = ("Prime tower",)
"""Roles printed off the part on purpose; never counted as deposit in air."""

FOOTER_KEYS = {
    "filament used [mm]": "filament_mm",
    "filament used [cm3]": "filament_cm3",
    "filament used [g]": "filament_g",
    "total filament used [g]": "total_filament_g",
    "total filament change": "filament_changes",
    "total layers count": "layers",
    "estimated printing time (normal mode)": "time_normal",
    "estimated first layer printing time (normal mode)": "time_first_layer",
}
CONFIG_KEYS = (
    "enable_prime_tower", "prime_tower_width", "prime_volume", "wipe_tower_x", "wipe_tower_y",
    "layer_height", "initial_layer_print_height", "curr_bed_type", "printer_settings_id",
    "print_settings_id", "filament_settings_id", "filament_type", "nozzle_diameter",
    "line_width", "outer_wall_line_width", "inner_wall_line_width", "bridge_flow",
    "thick_bridges", "enable_support", "wall_loops", "nozzle_temperature",
)


# ---------------------------------------------------------------- G-code

@dataclass
class Layer:
    index: int
    z: float | None = None
    height: float | None = None
    line: int = 0
    # rows: tool, x0, y0, x1, y1, width, e, role id, G-code line number
    segs: list = field(default_factory=list)


@dataclass
class Parsed:
    layers: list[Layer]
    roles: list[str]
    tool_changes: list[dict]
    tool_commands: int
    footer: dict
    header: dict
    config: dict
    prelude_segments: int


def _num(s: str) -> float:
    return float(s)


def _sec(t: str) -> float | None:
    m = re.fullmatch(r"\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?\s*", t)
    if m is None or not any(m.groups()):
        return None
    d, h, mi, s = (int(g or 0) for g in m.groups())
    return float(((d * 24 + h) * 60 + mi) * 60 + s)


def _arc_points(x0, y0, x1, y1, i, j, cw):
    cx, cy = x0 + i, y0 + j
    r = math.hypot(i, j)
    a0 = math.atan2(y0 - cy, x0 - cx)
    a1 = math.atan2(y1 - cy, x1 - cx)
    if cw:
        sweep = a0 - a1
        if sweep <= 1e-12:
            sweep += 2 * math.pi
        sweep = -sweep
    else:
        sweep = a1 - a0
        if sweep <= 1e-12:
            sweep += 2 * math.pi
    if r <= 1e-9:
        return [(x1, y1)]
    step = 2 * math.acos(max(-1.0, min(1.0, 1 - ARC_SAGITTA / r))) if r > ARC_SAGITTA else math.pi / 4
    n = max(1, int(math.ceil(abs(sweep) / max(step, 1e-6))))
    pts = [(cx + r * math.cos(a0 + sweep * k / n), cy + r * math.sin(a0 + sweep * k / n)) for k in range(1, n)]
    pts.append((x1, y1))
    return pts


def parse_gcode(text: str) -> Parsed:
    layers: list[Layer] = []
    cur: Layer | None = None
    roles: list[str] = []
    role_id = -1
    tool: int | None = None
    width = 0.0
    x = y = z = 0.0
    e_abs = 0.0
    rel_e = True
    abs_xy = True
    tool_changes: list[dict] = []
    tool_commands = 0
    footer: dict = {}
    header: dict = {}
    config: dict = {}
    prelude = 0
    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        if line[0] == ";":
            if line == ";LAYER_CHANGE":
                cur = Layer(index=len(layers), line=lineno)
                layers.append(cur)
            elif line.startswith(";Z:"):
                if cur is not None and cur.z is None:
                    cur.z = _num(line[3:])
            elif line.startswith(";HEIGHT:"):
                if cur is not None and cur.height is None:
                    cur.height = _num(line[8:])
            elif line.startswith(";TYPE:"):
                name = line[6:]
                if name not in roles:
                    roles.append(name)
                role_id = roles.index(name)
            elif line.startswith(";WIDTH:"):
                width = _num(line[7:])
            elif line.startswith("; "):
                body = line[2:]
                m = re.match(r"total layer number:\s*(\d+)", body)
                if m:
                    header["total_layer_number"] = int(m.group(1))
                m = re.match(r"max_z_height:\s*([\d.]+)", body)
                if m:
                    header["max_z_height"] = float(m.group(1))
                m = re.match(r"generated by (.+?) on ", body)
                if m:
                    header["generator"] = m.group(1)
                if " = " in body:
                    k, v = body.split(" = ", 1)
                    k = k.strip()
                    if k in FOOTER_KEYS:
                        key = FOOTER_KEYS[k]
                        if key.startswith("time"):
                            footer[key] = v.strip()
                            footer[key + "_s"] = _sec(v)
                        elif key in ("filament_mm", "filament_cm3", "filament_g"):
                            footer[key] = [float(a) for a in v.split(",")]
                        else:
                            f = float(v)
                            footer[key] = int(f) if f.is_integer() and "." not in v else f
                    elif k in CONFIG_KEYS and k not in config:
                        config[k] = v.strip()
            continue
        code = line.split(";", 1)[0].strip()
        if not code:
            continue
        words = code.split()
        cmd = words[0].upper()
        if re.fullmatch(r"T\d+", cmd):
            new = int(cmd[1:])
            tool_commands += 1
            if tool is not None and new != tool:
                tool_changes.append({"line": lineno, "from": tool, "to": new, "layer": cur.index if cur else -1})
            tool = new
            continue
        if cmd == "G90":
            abs_xy = True
        elif cmd == "G91":
            abs_xy = False
        elif cmd == "M82":
            rel_e = False
        elif cmd == "M83":
            rel_e = True
        elif cmd == "G92":
            for w in words[1:]:
                if w[0] in "Ee":
                    e_abs = _num(w[1:])
        elif cmd in ("G0", "G1", "G2", "G3"):
            p = {w[0].upper(): _num(w[1:]) for w in words[1:] if len(w) > 1 and w[0].upper() in "XYZEIJF"}
            nx = (p["X"] if abs_xy else x + p["X"]) if "X" in p else x
            ny = (p["Y"] if abs_xy else y + p["Y"]) if "Y" in p else y
            nz = (p["Z"] if abs_xy else z + p["Z"]) if "Z" in p else z
            if "E" in p:
                if rel_e:
                    de = p["E"]
                else:
                    de = p["E"] - e_abs
                    e_abs = p["E"]
            else:
                de = 0.0
            if de > 0 and (nx != x or ny != y) and tool is not None:
                if cmd in ("G2", "G3") and ("I" in p or "J" in p):
                    pts = _arc_points(x, y, nx, ny, p.get("I", 0.0), p.get("J", 0.0), cmd == "G2")
                else:
                    pts = [(nx, ny)]
                if cur is None:
                    prelude += len(pts)
                else:
                    px, py = x, y
                    share = de / len(pts)
                    for qx, qy in pts:
                        cur.segs.append((tool, px, py, qx, qy, width, share, role_id, lineno))
                        px, py = qx, qy
            x, y, z = nx, ny, nz
    return Parsed(layers, roles, tool_changes, tool_commands, footer, header, config, prelude)


def layer_counts(parsed: Parsed) -> dict:
    """Per layer: z, height, and per tool the extruding G-code moves, the
    segments they cut into (arcs become chords), extrusion sum and role set."""
    out = []
    for L in parsed.layers:
        tools: dict = {}
        for t, *_rest in L.segs:
            tools.setdefault(t, {"segments": 0, "moves": set(), "e_mm": 0.0, "roles": set(), "widths": set()})
        for t, _x0, _y0, _x1, _y1, w, e, r, n in L.segs:
            d = tools[t]
            d["widths"].add(round(w, 4))
            d["segments"] += 1
            d["moves"].add(n)
            d["e_mm"] += e
            d["roles"].add(parsed.roles[r] if r >= 0 else "none")
        out.append({
            "index": L.index, "z": L.z, "height": L.height,
            "tools": {f"T{t}": {"moves": len(d["moves"]), "segments": d["segments"], "e_mm": round(d["e_mm"], 5), "roles": sorted(d["roles"]), "widths_mm": sorted(d["widths"])} for t, d in sorted(tools.items())},
        })
    return {"layers": out}


# ---------------------------------------------------------------- raster

@dataclass
class Grid:
    x0: float
    y0: float
    nx: int
    ny: int
    res: float = RES

    def xs(self, i0=0, i1=None):
        i1 = self.nx if i1 is None else i1
        return self.x0 + (np.arange(i0, i1) + 0.5) * self.res

    def ys(self, j0=0, j1=None):
        j1 = self.ny if j1 is None else j1
        return self.y0 + (np.arange(j0, j1) + 0.5) * self.res

    def index(self, x, y):
        return int(math.floor((y - self.y0) / self.res)), int(math.floor((x - self.x0) / self.res))


def raster_roads(grid: Grid, segs) -> np.ndarray:
    """Capsules of each segment's width; segs rows (x0, y0, x1, y1, w)."""
    m = np.zeros((grid.ny, grid.nx), dtype=bool)
    for x0, y0, x1, y1, w in segs:
        r = w / 2
        i0 = max(0, int(math.floor((min(x0, x1) - r - grid.x0) / grid.res)))
        i1 = min(grid.nx, int(math.ceil((max(x0, x1) + r - grid.x0) / grid.res)) + 1)
        j0 = max(0, int(math.floor((min(y0, y1) - r - grid.y0) / grid.res)))
        j1 = min(grid.ny, int(math.ceil((max(y0, y1) + r - grid.y0) / grid.res)) + 1)
        if i0 >= i1 or j0 >= j1:
            continue
        X = grid.xs(i0, i1)[None, :]
        Y = grid.ys(j0, j1)[:, None]
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy
        if L2 <= 0:
            d2 = (X - x0) ** 2 + (Y - y0) ** 2
        else:
            t = np.clip(((X - x0) * dx + (Y - y0) * dy) / L2, 0.0, 1.0)
            d2 = (X - (x0 + t * dx)) ** 2 + (Y - (y0 + t * dy)) ** 2
        m[j0:j1, i0:i1] |= d2 <= r * r
    return m


def section_segments(V: np.ndarray, F: np.ndarray, z: float) -> np.ndarray:
    """Segments where the plane z cuts the triangles, rows (x0, y0, x1, y1)."""
    tri = V[F]
    zs = tri[:, :, 2]
    # nudge a plane that lands on a vertex so every crossing is strict
    if np.any(np.abs(zs - z) < 1e-9):
        z = z + 1e-7
    hit = (zs.min(axis=1) < z) & (zs.max(axis=1) > z)
    tri = tri[hit]
    if len(tri) == 0:
        return np.zeros((0, 4))
    pts = []
    for a, b in ((0, 1), (1, 2), (2, 0)):
        pa, pb = tri[:, a], tri[:, b]
        za, zb = pa[:, 2], pb[:, 2]
        cross = (za - z) * (zb - z) < 0
        s = np.where(cross, (z - za) / np.where(zb - za == 0, 1, zb - za), np.nan)
        p = pa[:, :2] + s[:, None] * (pb[:, :2] - pa[:, :2])
        pts.append(p)
    P = np.stack(pts, axis=1)  # (k, 3, 2), exactly two finite rows each
    ok = ~np.isnan(P[:, :, 0])
    out = np.zeros((len(P), 4))
    for k in range(len(P)):
        q = P[k][ok[k]]
        if len(q) == 2:
            out[k] = (q[0, 0], q[0, 1], q[1, 0], q[1, 1])
    return out


def fill_even_odd(grid: Grid, segs: np.ndarray) -> np.ndarray:
    """Scanline even-odd fill of closed section loops at pixel centres."""
    m = np.zeros((grid.ny, grid.nx), dtype=bool)
    if len(segs) == 0:
        return m
    ys = grid.ys()
    x0, y0, x1, y1 = segs.T
    lo, hi = np.minimum(y0, y1), np.maximum(y0, y1)
    acc = np.zeros((grid.ny, grid.nx + 1), dtype=np.int32)
    j_lo = np.clip(np.ceil((lo - grid.y0) / grid.res - 0.5).astype(int), 0, grid.ny)
    j_hi = np.clip(np.ceil((hi - grid.y0) / grid.res - 0.5).astype(int), 0, grid.ny)
    for k in range(len(segs)):
        if j_hi[k] <= j_lo[k]:
            continue
        rows = np.arange(j_lo[k], j_hi[k])
        yc = ys[rows]
        t = (yc - y0[k]) / (y1[k] - y0[k])
        xc = x0[k] + t * (x1[k] - x0[k])
        col = np.clip(np.ceil((xc - grid.x0) / grid.res - 0.5).astype(int), 0, grid.nx)
        np.add.at(acc, (rows, col), 1)
    return (np.cumsum(acc, axis=1)[:, : grid.nx] % 2) == 1


# ---------------------------------------------------------------- 3MF

def load_3mf_parts(path: Path) -> list[dict]:
    """Every part of every build item, vertices in bed mm, with its name and
    extruder. Reads through validate_3mf (open_package, parse_model,
    transform_matrix), so the zip limits and the transform convention are the
    validator's."""
    z = v3.open_package(path)
    try:
        models = {v3.ROOT_MODEL: v3.parse_model(v3._parse_xml(z, v3.ROOT_MODEL))}
        root_el = v3._parse_xml(z, v3.ROOT_MODEL)
        names: dict = {}
        if v3.MODEL_SETTINGS in z.namelist():
            ms = v3._parse_xml(z, v3.MODEL_SETTINGS)
            for obj in ms.iterfind("object"):
                obj_ext = [m.get("value") for m in obj.iterfind("metadata") if m.get("key") == "extruder"]
                for part in obj.iterfind("part"):
                    md = {m.get("key"): m.get("value") for m in part.iterfind("metadata")}
                    ext = md.get("extruder") or (obj_ext[0] if obj_ext else "1")
                    names[int(part.get("id"))] = (md.get("name", part.get("id")), int(ext))

        def model_of(p):
            if not p:
                return models[v3.ROOT_MODEL]
            pn = v3._part_name(p)
            if pn not in models:
                models[pn] = v3.parse_model(v3._parse_xml(z, pn))
            return models[pn]

        parts = []
        for item in root_el.iterfind("m:build/m:item", v3.NS):
            T = v3.transform_matrix(item.get("transform"))
            oid = int(item.get("objectid"))
            rec = models[v3.ROOT_MODEL][oid]
            children = [(model_of(c["path"])[c["objectid"]], c["objectid"], v3.transform_matrix(c["transform"])) for c in rec["components"]] or [(rec, oid, np.eye(4))]
            for child, cid, C in children:
                if child["mesh"] is None:
                    continue
                V, F = child["mesh"]
                Vw = (np.c_[V, np.ones(len(V))] @ (T @ C).T)[:, :3]
                name, ext = names.get(cid, (f"object {cid}", 1))
                parts.append({"name": name, "extruder": ext, "V": Vw, "F": F})
        return parts
    finally:
        z.close()


# ---------------------------------------------------------------- PNG

def write_png(path: Path, rgb: np.ndarray) -> None:
    """RGB uint8 image, row 0 at the bottom (y up)."""
    img = np.ascontiguousarray(rgb[::-1])
    h, w, _ = img.shape
    raw = b"".join(b"\x00" + img[r].tobytes() for r in range(h))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))


TOOL_RGB = {0: (196, 186, 160), 1: (26, 26, 26), 2: (254, 3, 134), 3: (110, 110, 110)}
"""Slot preview colours from chase.ts, PETG darkened from #F4F1EA so it reads on white."""
MISSING_RGB = (0, 160, 255)
FOREIGN_RGB = (0, 190, 60)
UNSUPPORTED_RGB = (255, 196, 0)
OTHER_RGB = (150, 150, 200)


# ---------------------------------------------------------------- analysis

def _local(fn, mask, pad):
    """fn applied to the bounding box of the mask grown by pad px, zero
    elsewhere. Exact for an operation whose result lies within pad px of the
    mask (opening, erosion, a dilation of at most pad px); only faster."""
    rows = np.flatnonzero(mask.any(axis=1))
    out = np.zeros_like(mask)
    if rows.size == 0:
        return out
    cols = np.flatnonzero(mask.any(axis=0))
    sl = (slice(max(0, rows[0] - pad), min(mask.shape[0], rows[-1] + pad + 1)), slice(max(0, cols[0] - pad), min(mask.shape[1], cols[-1] + pad + 1)))
    out[sl] = fn(mask[sl])
    return out


def _open(mask, structure, radius):
    return _local(lambda m: ndimage.binary_opening(m, structure=structure), mask, 2 * radius + 1)


def _grow(mask, structure, iterations):
    return _local(lambda m: ndimage.binary_dilation(m, structure=structure, iterations=iterations), mask, iterations + 1)


def _shrink(mask, structure, iterations):
    return _local(lambda m: ndimage.binary_erosion(m, structure=structure, iterations=iterations), mask, 1)


def _components(mask, structure=None):
    lab, n = ndimage.label(mask, structure=structure)
    return lab, n


def _each(mask, structure=None):
    """Connected components as (slice, component mask inside the slice)."""
    lab, _n = ndimage.label(mask, structure=structure)
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is not None:
            yield sl, lab[sl] == k


def _infill_cells(dep, sparse):
    """The deposit plus the holes in it that sparse infill roads border."""
    if not sparse.any():
        return dep
    holes = ndimage.binary_fill_holes(dep) & ~dep
    if not holes.any():
        return dep
    lab, _n = ndimage.label(holes)
    touch = np.unique(lab[ndimage.binary_dilation(sparse, iterations=2) & holes])
    return dep | np.isin(lab, touch[touch > 0])


def _seg_in(grid, sl, comp, x0, y0, x1, y1):
    """True when the segment midpoint falls on the component."""
    i = int(math.floor(((x0 + x1) / 2 - grid.x0) / grid.res)) - sl[1].start
    j = int(math.floor(((y0 + y1) / 2 - grid.y0) / grid.res)) - sl[0].start
    return 0 <= j < comp.shape[0] and 0 <= i < comp.shape[1] and bool(comp[j, i])


def _centre(grid, sl, comp):
    ys, xs = np.nonzero(comp)
    return [_r(grid.x0 + (xs.mean() + sl[1].start + 0.5) * RES, 2), _r(grid.y0 + (ys.mean() + sl[0].start + 0.5) * RES, 2)]


def _width_mm(mask) -> float:
    """Largest inscribed width of a mask, mm (twice the deepest distance to its edge)."""
    if not mask.any():
        return 0.0
    rows = np.flatnonzero(mask.any(axis=1))
    cols = np.flatnonzero(mask.any(axis=0))
    m = mask[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    return float(2 * ndimage.distance_transform_edt(np.pad(m, 1)).max() * RES)


def _nearest_mm(a, b) -> float:
    """Least distance from a pixel of b to a pixel of a, px centre to centre, mm.
    Cut to the box holding both, which holds every nearest pair."""
    both = a | b
    rows = np.flatnonzero(both.any(axis=1))
    cols = np.flatnonzero(both.any(axis=0))
    sl = (slice(rows[0], rows[-1] + 1), slice(cols[0], cols[-1] + 1))
    return float(ndimage.distance_transform_edt(~a[sl])[b[sl]].min() * RES)


def _r(v, n=3):
    return None if v is None else round(float(v), n)


def net_of(name: str, nets: dict) -> str | None:
    if name in nets:
        return nets[name]
    return None


def conductive_tools(parts: list[dict], model: dict) -> tuple[int | None, int | None]:
    """The conductor tool (the extruder of every body model.json gives a net)
    and the cap tool (the extruder of every body its keys name as a cap), as
    G-code tool indices: slot n prints on T(n-1). None when the model names
    no such body; ValueError when the named bodies print on more than one tool."""
    def one(names, what):
        ts = sorted({p["extruder"] - 1 for p in parts if p["name"] in names})
        if len(ts) > 1:
            raise ValueError(f"the {what} bodies print on tools {ts}; the analyzer reads one {what} tool")
        return ts[0] if ts else None
    return one(set(model.get("nets", {})), "conductor"), one({k["cap"] for k in model.get("keys", []) if k.get("cap")}, "cap")


def analyze(gcode_path: Path, threemf: Path, model_json: Path | None, run_json: Path | None, out: Path, png: bool = True) -> dict:
    text = gcode_path.read_text(encoding="utf8", errors="replace")
    parsed = parse_gcode(text)
    parts = load_3mf_parts(threemf)
    model = json.loads(model_json.read_text()) if model_json and model_json.exists() else {"nets": {}, "keys": []}
    run = json.loads(run_json.read_text()) if run_json and run_json.exists() else None
    nets = model.get("nets", {})
    tool_of = lambda p: p["extruder"] - 1  # noqa: E731  slot n prints on T(n-1)

    allV = np.vstack([p["V"] for p in parts])
    lo = allV[:, :2].min(axis=0) - 2.0
    hi = allV[:, :2].max(axis=0) + 2.0
    grid = Grid(float(lo[0]), float(lo[1]), int(math.ceil((hi[0] - lo[0]) / RES)), int(math.ceil((hi[1] - lo[1]) / RES)))
    pad = max(parts, key=lambda p: np.ptp(p["V"][:, 0]) * np.ptp(p["V"][:, 1]))

    nL = len(parsed.layers)
    tools = sorted({s[0] for L in parsed.layers for s in L.segs})
    cpla_t, ctpu_t = conductive_tools(parts, model)
    vol = {t: np.zeros((nL, grid.ny, grid.nx), dtype=bool) for t in tools}
    # every road but the tower's, for deposit in air
    part_vol = np.zeros((nL, grid.ny, grid.nx), dtype=bool)
    bridge_vol = np.zeros((nL, grid.ny, grid.nx), dtype=bool)
    bridge_roles = {i for i, r in enumerate(parsed.roles) if "Bridge" in r}
    sparse_roles = {i for i, r in enumerate(parsed.roles) if r == "Sparse infill"}
    tower_roles = {i for i, r in enumerate(parsed.roles) if r in TOWER_ROLES}
    sparse_vol = {t: np.zeros((nL, grid.ny, grid.nx), dtype=bool) for t in tools}
    outside = {t: 0 for t in tools}
    gx1, gy1 = grid.x0 + grid.nx * RES, grid.y0 + grid.ny * RES
    for li, L in enumerate(parsed.layers):
        arr = L.segs
        for t in tools:
            rows = [(a, b, c, d, w) for (tt, a, b, c, d, w, _e, _r, _n) in arr if tt == t]
            # informational: segments with any part off the grid; raster_roads clips each one to the grid
            outside[t] += sum(1 for r in rows if min(r[0], r[2]) - r[4] / 2 < grid.x0 or max(r[0], r[2]) + r[4] / 2 > gx1 or min(r[1], r[3]) - r[4] / 2 < grid.y0 or max(r[1], r[3]) + r[4] / 2 > gy1)
            vol[t][li] = raster_roads(grid, rows)
        part_vol[li] = raster_roads(grid, [(a, b, c, d, w) for (_t, a, b, c, d, w, _e, r, _n) in arr if r not in tower_roles])
        br = [(a, b, c, d, w) for (tt, a, b, c, d, w, _e, r, _n) in arr if r in bridge_roles]
        if br:
            bridge_vol[li] = raster_roads(grid, br)
        for t in tools:
            sp = [(a, b, c, d, w) for (tt, a, b, c, d, w, _e, r, _n) in arr if tt == t and r in sparse_roles]
            if sp:
                sparse_vol[t][li] = raster_roads(grid, sp)

    # model sections at each layer's mid-height
    mids = [(L.z - (L.height or 0) / 2) if L.z is not None else None for L in parsed.layers]
    model_masks = []
    for li, zm in enumerate(mids):
        row = {}
        for p in parts:
            if zm is None or not (p["V"][:, 2].min() < zm < p["V"][:, 2].max()):
                continue
            row[p["name"]] = fill_even_odd(grid, section_segments(p["V"], p["F"], zm))
        model_masks.append(row)

    any_dep = np.zeros((nL, grid.ny, grid.nx), dtype=bool)
    for t in tools:
        any_dep |= vol[t]
    model_any = np.zeros((nL, grid.ny, grid.nx), dtype=bool)
    for li, row in enumerate(model_masks):
        for m in row.values():
            model_any[li] |= m
    # a hole in a tool's deposit counts as covered only when that tool's
    # sparse infill roads border it (an infill cell); a void inside solid
    # roads, as gap fill leaves in a column half, stays missing
    filled = {t: np.stack([_infill_cells(vol[t][li], sparse_vol[t][li]) for li in range(nL)]) for t in tools}
    cross = ndimage.generate_binary_structure(2, 1)
    disk = ndimage.iterate_structure(cross, SLIVER_PX)
    edge_px = int(round(EDGE_MM / RES))
    min_px = int(round(MIN_FEATURE_MM2 / (RES * RES)))
    px_mm2 = RES * RES

    # deposit in model air: any road but the tower's, farther than EDGE_MM from every body section
    air_rows = []
    for li in range(nL):
        near = _grow(model_any[li], cross, edge_px)
        air = part_vol[li] & ~near
        for sl, comp in _each(air):
            a = int(comp.sum())
            if a < min_px:
                continue
            by = sorted({f"T{u}" for u in tools if (vol[u][li][sl] & comp).any()})
            air_rows.append({"layer": li, "z": _r(parsed.layers[li].z), "deposited_by": by, "area_mm2": _r(a * px_mm2), "at": _centre(grid, sl, comp)})

    # (a) model features missing from the deposit
    missing_rows = []
    missing_vol = np.zeros((nL, grid.ny, grid.nx), dtype=bool)
    foreign_vol = np.zeros((nL, grid.ny, grid.nx), dtype=bool)
    foreign_rows = []
    body_summary: dict = {}
    for li, row in enumerate(model_masks):
        for p in parts:
            name = p["name"]
            if name not in row:
                continue
            mm = row[name]
            t = tool_of(p)
            dep = vol[t][li] if t in vol else np.zeros_like(mm)
            # a sparse infill cell closed by the tool's own roads counts as covered
            dep_filled = filled[t][li] if t in filled else dep
            area = int(mm.sum())
            cov_raw = int((mm & dep).sum())
            cov = int((mm & dep_filled).sum())
            s = body_summary.setdefault(name, {"tool": f"T{t}", "net": net_of(name, nets), "layers": 0, "model_mm2": 0.0, "covered_mm2": 0.0, "roads_mm2": 0.0, "dropped_features": 0, "missing_areas": 0, "largest_missing_mm2": 0.0, "largest_missing_layer": None})
            s["layers"] += 1
            s["model_mm2"] += area * px_mm2
            s["covered_mm2"] += cov * px_mm2
            s["roads_mm2"] += cov_raw * px_mm2
            other = np.zeros_like(mm)
            for u in tools:
                if u != t:
                    other |= vol[u][li]
            # another tool's roads inside this body. Replaced: the body's own tool
            # laid nothing there, so the slicer gave the region to the wrong
            # material. Two tools in one cell: both laid roads there, away from
            # the body edge and from a replaced region's edge, where no other
            # bead belongs. No opening on the second, so a 0.1 mm road the
            # slicer writes still counts.
            replaced = _open(mm & other & ~dep, disk, SLIVER_PX)
            inner = _shrink(mm, cross, edge_px)
            if replaced.any():
                inner &= ~_grow(replaced, cross, edge_px)
            shared = inner & other & dep
            foreign_vol[li] |= replaced | shared
            for kind, mask in (("replaced", replaced), ("two tools in one cell", shared)):
                for sl, comp in _each(mask):
                    a = int(comp.sum())
                    if a < min_px:
                        continue
                    by = sorted({f"T{u}" for u in tools if u != t and (vol[u][li][sl] & comp).any()})
                    cell = {}
                    for u in tools:
                        if u != t:
                            hits = [parsed.roles[r] for (tt, x0, y0, x1, y1, _w, _e, r, _n) in parsed.layers[li].segs if tt == u and r >= 0 and _seg_in(grid, sl, comp, x0, y0, x1, y1)]
                            for h in hits:
                                cell[f"T{u} {h}"] = cell.get(f"T{u} {h}", 0) + 1
                    s["foreign_mm2"] = s.get("foreign_mm2", 0.0) + a * px_mm2
                    foreign_rows.append({"layer": li, "z_mid": _r(mids[li]), "body": name, "tool": f"T{t}", "kind": kind, "deposited_by": by, "roles": cell, "area_mm2": _r(a * px_mm2), "width_mm": _r(_width_mm(comp)), "at": _centre(grid, sl, comp)})
            miss = _open(mm & ~dep_filled & ~other, disk, SLIVER_PX)
            missing_vol[li] |= miss
            for sl, feat in _each(mm):
                fa = int(feat.sum())
                fc = int((feat & dep_filled[sl]).sum())
                if fa >= min_px and fc / fa < 0.5:
                    s["dropped_features"] += 1
                    missing_rows.append({"layer": li, "z_mid": _r(mids[li]), "body": name, "tool": f"T{t}", "net": net_of(name, nets), "kind": "feature dropped", "area_mm2": _r(fa * px_mm2), "covered_frac": _r(fc / fa), "width_mm": _r(_width_mm(feat)), "at": _centre(grid, sl, feat)})
            for sl, comp in _each(miss):
                a = int(comp.sum())
                if a < min_px:
                    continue
                s["missing_areas"] += 1
                if a * px_mm2 > s["largest_missing_mm2"]:
                    s["largest_missing_mm2"] = a * px_mm2
                    s["largest_missing_layer"] = li
                missing_rows.append({"layer": li, "z_mid": _r(mids[li]), "body": name, "tool": f"T{t}", "net": net_of(name, nets), "kind": "area missing", "area_mm2": _r(a * px_mm2), "width_mm": _r(_width_mm(comp)), "at": _centre(grid, sl, comp)})
    for s in body_summary.values():
        s["coverage"] = _r(s["covered_mm2"] / s["model_mm2"]) if s["model_mm2"] else None
        s["road_coverage"] = _r(s["roads_mm2"] / s["model_mm2"]) if s["model_mm2"] else None
        for k in ("model_mm2", "covered_mm2", "roads_mm2", "largest_missing_mm2"):
            s[k] = _r(s[k], 2)

    # narrowest model conductor section per body against the narrowest road the slicer wrote
    widths = sorted({round(s[5], 4) for L in parsed.layers for s in L.segs if s[0] == cpla_t and s[5] > 0})
    conductor_width = []
    for p in parts:
        if tool_of(p) != cpla_t:
            continue
        ws = [_width_mm(model_masks[li][p["name"]]) for li in range(nL) if p["name"] in model_masks[li]]
        if ws:
            conductor_width.append({"body": p["name"], "net": net_of(p["name"], nets), "min_section_width_mm": _r(min(ws)), "max_section_width_mm": _r(max(ws))})

    # (b) unsupported regions and bridge spans per tool
    unsupported = []
    unsup_vol = np.zeros((nL, grid.ny, grid.nx), dtype=bool)
    for li in range(1, nL):
        # support: any road in the layer below, plus sparse infill cells the
        # roads close inside the model there; an air hole the model leaves
        # open (the cone top under the cap) stays unsupported
        enclosed = np.zeros((grid.ny, grid.nx), dtype=bool)
        for t in tools:
            enclosed |= filled[t][li - 1]
        below = any_dep[li - 1] | (enclosed & model_any[li - 1])
        dist = ndimage.distance_transform_edt(~below) * RES
        for t in tools:
            u = _open(vol[t][li] & ~below, disk, SLIVER_PX)
            unsup_vol[li] |= u
            for sl, comp in _each(u):
                a = int(comp.sum())
                if a < min_px:
                    continue
                over = {}
                for p in parts:
                    if tool_of(p) == t and p["name"] in model_masks[li]:
                        o = int((model_masks[li][p["name"]][sl] & comp).sum())
                        if o:
                            over[p["name"]] = o
                body = max(over, key=over.get) if over else None
                unsupported.append({
                    "layer": li, "z": _r(parsed.layers[li].z), "tool": f"T{t}", "body": body,
                    "area_mm2": _r(a * px_mm2), "span_mm": _r(2 * dist[sl][comp].max()),
                    "bridge_role_frac": _r((comp & bridge_vol[li][sl]).sum() / a),
                    "below_model": bool((model_any[li - 1][sl] & comp).any()),
                    "at": _centre(grid, sl, comp),
                })

    # nets of deposited cPLA by overlap with the model conductor bodies
    cpla_parts = [p for p in parts if tool_of(p) == cpla_t]
    net_masks = []
    for li in range(nL):
        nm = {}
        for p in cpla_parts:
            n = net_of(p["name"], nets)
            if n is None or p["name"] not in model_masks[li]:
                continue
            nm[n] = nm.get(n, np.zeros((grid.ny, grid.nx), dtype=bool)) | model_masks[li][p["name"]]
        net_masks.append(nm)

    # (c) column halves and in-layer net bridges
    eight = np.ones((3, 3), dtype=bool)
    layer_nets = []
    column_gaps = []
    keys = model.get("keys", [])
    for li in range(nL):
        dep = vol.get(cpla_t, np.zeros((nL, grid.ny, grid.nx), dtype=bool))[li]
        if not dep.any():
            continue
        lab, n = _components(dep, eight)
        bridges = []
        stray = 0
        comp_net = np.full(n + 1, "", dtype=object)
        for k in range(1, n + 1):
            comp = lab == k
            touched = sorted(nn for nn, m in net_masks[li].items() if (m & comp).any())
            if len(touched) > 1:
                bridges.append({"nets": touched, "area_mm2": _r(comp.sum() * px_mm2)})
            if not touched:
                stray += 1
            comp_net[k] = touched[0] if len(touched) == 1 else ("+".join(touched) if touched else "")
        layer_nets.append({"layer": li, "z": _r(parsed.layers[li].z), "components": n, "bridges": bridges, "stray_components": stray})
        for kd in keys:
            kn = f"K{kd['key']}"
            kcol = model_masks[li].get(kd["keyColumn"])
            gcol = model_masks[li].get(kd["gndColumn"])
            if kcol is None or gcol is None:
                continue
            win = _grow(kcol | gcol, None, int(1.0 / RES))
            kd_px = (dep & win) & np.isin(lab, [k for k in range(1, n + 1) if comp_net[k] == kn])
            gd_px = (dep & win) & np.isin(lab, [k for k in range(1, n + 1) if comp_net[k] == "GND"])
            # one deposited region holding both halves: the split is bridged, gap 0
            bridged = bool(((dep & win) & np.isin(lab, [k for k in range(1, n + 1) if {kn, "GND"} <= set(comp_net[k].split("+"))])).any())
            if bridged:
                gap = 0.0
            elif kd_px.any() and gd_px.any():
                d = _nearest_mm(kd_px, gd_px)
                gap = max(0.0, d - RES)
            else:
                gap = None
            model_gap = None
            if kcol.any() and gcol.any():
                model_gap = max(0.0, _nearest_mm(kcol, gcol) - RES)
            column_gaps.append({"layer": li, "z": _r(parsed.layers[li].z), "key": kd["key"], "deposited_gap_mm": _r(gap), "model_gap_mm": _r(model_gap), "bridged": bridged, "k_half_present": bool(kd_px.any()) or bridged, "gnd_half_present": bool(gd_px.any()) or bridged})

    # (d) 3D connectivity of deposited cPLA and cTPU
    st3 = np.zeros((3, 3, 3), dtype=bool)
    st3[1] = True
    st3[0, 1, 1] = st3[2, 1, 1] = True
    connectivity: dict = {"structure": "8-connected in a layer, face-connected between layers"}
    if cpla_t in vol:
        lab3, n3 = ndimage.label(vol[cpla_t], structure=st3)
        comps = []
        for k in range(1, n3 + 1):
            idx = np.nonzero(lab3 == k)
            touched = set()
            for li in np.unique(idx[0]):
                sel = idx[0] == li
                for nn, m in net_masks[li].items():
                    if m[idx[1][sel], idx[2][sel]].any():
                        touched.add(nn)
            comps.append({"id": k, "voxels": int(len(idx[0])), "layers": [int(idx[0].min()), int(idx[0].max())], "nets": sorted(touched)})
        connectivity["cpla_components"] = comps
        # a short: one deposited conductor component that reaches two nets, in a layer or across layers
        connectivity["shorts"] = [c for c in comps if len(c["nets"]) > 1]
        # lead: the trace pixel nearest the part's outside at the trace band
        pad_out = {}
        leads = []
        trace_names = {}
        for kd in keys:
            trace_names[f"K{kd['key']}"] = [kd["trace"]]
        gnd_traces = [p["name"] for p in cpla_parts if net_of(p["name"], nets) == "GND" and "col" not in p["name"]]
        if gnd_traces:
            trace_names["GND"] = gnd_traces
        for net, names in trace_names.items():
            best = None
            for li in range(nL):
                if pad["name"] not in model_masks[li]:
                    continue
                if li not in pad_out:
                    # distance to the outside of the whole part; the traces are cut out of the pad, so the pad mask alone has them at 0
                    pad_out[li] = ndimage.distance_transform_edt(ndimage.binary_fill_holes(model_any[li]))
                for nm in names:
                    m = model_masks[li].get(nm)
                    if m is None or not m.any():
                        continue
                    d = np.where(m, pad_out[li], np.inf)
                    j, i = np.unravel_index(np.argmin(d), d.shape)
                    cand = (d[j, i], li, j, i, nm)
                    if best is None or cand[0] < best[0] - 1e-9:
                        best = cand
            if best is None:
                continue
            _d, li, j, i, nm = best
            # take the deposited voxel nearest that lead point in the same layer
            dep = vol[cpla_t][li]
            if dep.any():
                dd = ndimage.distance_transform_edt(~dep, return_indices=True)[1]
                jj, ii = dd[0][j, i], dd[1][j, i]
                lead_lab = int(lab3[li, jj, ii])
                off = math.hypot(jj - j, ii - i) * RES
            else:
                lead_lab, off = 0, None
            tops = []
            for kd in keys:
                for side, cn in (("key", kd["keyColumn"]), ("gnd", kd["gndColumn"])):
                    if net_of(cn, nets) != net:
                        continue
                    ls = [l2 for l2 in range(nL) if cn in model_masks[l2] and (model_masks[l2][cn] & vol[cpla_t][l2]).any()]
                    if not ls:
                        tops.append({"column": cn, "reached": False, "top_layer": None})
                        continue
                    top = max(ls)
                    labs = np.unique(lab3[top][model_masks[top][cn] & vol[cpla_t][top]])
                    tops.append({"column": cn, "top_layer": int(top), "top_z": _r(parsed.layers[top].z), "reached": bool(lead_lab and lead_lab in labs)})
            leads.append({"net": net, "trace": nm, "lead_layer": int(li), "lead_at": [_r(grid.x0 + (i + 0.5) * RES, 2), _r(grid.y0 + (j + 0.5) * RES, 2)], "lead_to_deposit_mm": _r(off), "component": lead_lab, "column_tops": tops})
        connectivity["leads"] = leads
    if ctpu_t in vol:
        lab3c, n3c = ndimage.label(vol[ctpu_t], structure=st3)
        caps = []
        for p in parts:
            if tool_of(p) != ctpu_t:
                continue
            labs = set()
            for li in range(nL):
                if p["name"] in model_masks[li]:
                    labs |= set(np.unique(lab3c[li][model_masks[li][p["name"]]]).tolist()) - {0}
            touch = set()
            # nets the cap's deposit touches in its own layer or the layers next to it
            for li in range(nL):
                capm = np.isin(lab3c[li], list(labs)) if labs else np.zeros((grid.ny, grid.nx), dtype=bool)
                if not capm.any():
                    continue
                near = ndimage.binary_dilation(capm)
                for l2 in (li - 1, li, li + 1):
                    if 0 <= l2 < nL and cpla_t in vol:
                        hit = near & vol[cpla_t][l2]
                        for nn, m in net_masks[l2].items():
                            if (hit & ndimage.binary_dilation(m, iterations=int(0.5 / RES))).any():
                                touch.add(nn)
            caps.append({"cap": p["name"], "components": len(labs), "touches_nets": sorted(touch)})
        connectivity["ctpu_caps"] = caps
        connectivity["ctpu_components_total"] = int(n3c)

    # (e) as-printed contact gap
    gaps = []
    for kd in keys:
        foot = np.zeros((grid.ny, grid.nx), dtype=bool)
        for li in range(nL):
            for cn in (kd["keyColumn"], kd["gndColumn"]):
                if cn in model_masks[li]:
                    foot |= model_masks[li][cn]
        col_layers = [li for li in range(nL) if cpla_t in vol and (vol[cpla_t][li] & foot).any()]
        cap_layers = [li for li in range(nL) if ctpu_t in vol and (vol[ctpu_t][li] & foot).any()]
        col_top = parsed.layers[max(col_layers)].z if col_layers else None
        cap_under = None
        if cap_layers:
            L0 = parsed.layers[min(cap_layers)]
            cap_under = L0.z - L0.height
        capV = [p for p in parts if p["name"] == kd["cap"]]
        colV = [p for p in parts if p["name"] in (kd["keyColumn"], kd["gndColumn"])]
        model_gap = (capV[0]["V"][:, 2].min() - max(c["V"][:, 2].max() for c in colV)) if capV and colV else None
        printed = cap_under - col_top if col_top is not None and cap_under is not None else None
        # anything deposited over the column footprint between the column top and the cap obstructs the contact
        obstruction = None
        if col_layers and cap_layers:
            for li in range(max(col_layers) + 1, min(cap_layers)):
                over = part_vol[li] & foot
                if over.any():
                    obstruction = {"layer": li, "z": _r(parsed.layers[li].z), "tools": sorted({f"T{u}" for u in tools if (vol[u][li] & over).any()}), "area_mm2": _r(over.sum() * px_mm2)}
                    break
        declared = kd.get("gap")
        layer_h = parsed.layers[min(cap_layers)].height if cap_layers else None
        ok = None
        if printed is not None and declared is not None and layer_h is not None:
            ok = bool(printed >= declared - layer_h - 1e-9 and obstruction is None)
        gaps.append({
            "key": kd["key"], "column_top_z": _r(col_top), "cap_underside_z": _r(cap_under),
            "printed_gap_mm": _r(printed),
            "model_gap_mesh_mm": _r(model_gap), "declared_gap_mm": declared, "declared_col_top": kd.get("colTop"),
            "column_top_layer": max(col_layers) if col_layers else None, "cap_first_layer": min(cap_layers) if cap_layers else None,
            "obstruction": obstruction,
            "pass": ok, "pass_rule": "printed gap at least the declared gap less one layer height, and nothing deposited over the column footprint below the cap",
        })

    # (f) tool changes, tower, time, filament
    tower_role = [i for i, r in enumerate(parsed.roles) if r == "Prime tower"]
    tower_segments = sum(1 for L in parsed.layers for s in L.segs if s[7] in tower_role)
    tc_layers = sorted({c["layer"] for c in parsed.tool_changes})
    summary_f = {
        "tool_commands": parsed.tool_commands,
        "tool_changes": len(parsed.tool_changes),
        "tool_changes_by_pair": _pairs(parsed.tool_changes),
        "layers_with_changes": len(tc_layers),
        "prime_tower_segments": tower_segments,
        "prime_tower_enabled": parsed.config.get("enable_prime_tower"),
        "prime_tower_width": parsed.config.get("prime_tower_width"),
        "prime_volume": parsed.config.get("prime_volume"),
        "footer": parsed.footer,
        "segments_outside_grid": {f"T{t}": n for t, n in outside.items()},
    }

    out.mkdir(parents=True, exist_ok=True)
    layer_dir = out / "layers"
    images = []
    key_layers = _key_layers(parsed, gaps, keys, vol, cpla_t, ctpu_t, pad["extruder"] - 1)
    key_layers |= {x["layer"] for x in missing_rows + foreign_rows if x["area_mm2"] >= 1.0}
    if png:
        layer_dir.mkdir(exist_ok=True)
        for li in range(nL):
            rgb = _render(grid, li, vol, missing_vol, unsup_vol, foreign_vol, cpla_t, ctpu_t)
            f = layer_dir / f"layer-{li:02d}-z{parsed.layers[li].z:.2f}.png"
            write_png(f, rgb)
            images.append(str(f.relative_to(out)))
            if li in key_layers:
                for kd in keys:
                    cx = kd["x"] + (pad["V"][:, 0].min() + pad["V"][:, 0].max()) / 2
                    cy = (pad["V"][:, 1].min() + pad["V"][:, 1].max()) / 2
                    crop = _crop(grid, rgb, cx, cy, 7.0, 4)
                    g = layer_dir / f"key{kd['key']}-layer-{li:02d}-z{parsed.layers[li].z:.2f}.png"
                    write_png(g, crop)
                    images.append(str(g.relative_to(out)))

    result = {
        "qualifier": "computed: a simulated print read from slicer G-code; no figure here is measured from a part",
        "inputs": {"gcode": str(gcode_path), "3mf": str(threemf), "model_json": str(model_json) if model_json else None},
        "slice_run": run and {k: run.get(k) for k in ("command", "exitCode", "signal", "wallMs", "wallQualifier", "slicer", "status", "gcode", "input3mf", "completed3mf")},
        "grid": {"res_mm": RES, "x0": _r(grid.x0), "y0": _r(grid.y0), "nx": grid.nx, "ny": grid.ny},
        "header": parsed.header,
        "config": parsed.config,
        "layers": [{"index": L.index, "z": L.z, "height": L.height, "tools": sorted({f"T{s[0]}" for s in L.segs})} for L in parsed.layers],
        "tools": {"conductor": None if cpla_t is None else f"T{cpla_t}", "cap": None if ctpu_t is None else f"T{ctpu_t}"},
        "a_missing": {"bodies": body_summary, "features": missing_rows, "foreign": foreign_rows, "air": air_rows, "cpla_road_widths_mm": widths, "conductor_section_widths": conductor_width},
        "b_unsupported": unsupported,
        "c_nets": {"layers": layer_nets, "column_gaps": column_gaps},
        "d_connectivity": connectivity,
        "e_contact_gap": gaps,
        "f_toolchanges": summary_f,
        "key_layers": sorted(key_layers),
        "images": images,
    }
    (out / "slice.json").write_text(json.dumps(result, indent=1, default=_json_default) + "\n")
    (out / "report-slice.md").write_text(report_md(result))
    return result


def _json_default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, set):
        return sorted(o)
    raise TypeError(type(o))


def _pairs(changes):
    out: dict = {}
    for c in changes:
        k = f"T{c['from']}>T{c['to']}"
        out[k] = out.get(k, 0) + 1
    return dict(sorted(out.items()))


def _key_layers(parsed, gaps, keys, vol, cpla_t, ctpu_t, pad_t):
    sel = set()
    for kd in keys:
        tb = kd.get("traceBand")
        for li, L in enumerate(parsed.layers):
            mid = L.z - (L.height or 0) / 2
            if tb and tb[0] - 0.25 <= mid <= tb[1] + 0.25:
                sel.add(li)
    for g in gaps:
        for k in ("column_top_layer", "cap_first_layer"):
            v = g.get(k)
            if v is not None:
                sel |= {v - 1, v, v + 1}
    if ctpu_t in vol:
        sel |= {li for li in range(len(parsed.layers)) if vol[ctpu_t][li].any()}
    # the top of each flexible body that is neither conductor, cap nor pad (the cones)
    for t in vol:
        if t in (cpla_t, ctpu_t, pad_t):
            continue
        on = [li for li in range(len(parsed.layers)) if vol[t][li].any()]
        if on:
            sel |= {on[-1], on[-1] - 1}
    return {li for li in sel if 0 <= li < len(parsed.layers)}


def _render(grid, li, vol, missing_vol, unsup_vol, foreign_vol, cpla_t, ctpu_t):
    rgb = np.full((grid.ny, grid.nx, 3), 255, dtype=np.uint8)
    # the cap over the rest, the conductor over everything
    for t in [u for u in sorted(vol) if u not in (cpla_t, ctpu_t)] + [u for u in (ctpu_t, cpla_t) if u in vol]:
        rgb[vol[t][li]] = TOOL_RGB.get(t, OTHER_RGB)
    rgb[missing_vol[li]] = MISSING_RGB
    rgb[foreign_vol[li]] = FOREIGN_RGB
    rgb[unsup_vol[li]] = UNSUPPORTED_RGB
    return rgb


def _crop(grid, rgb, cx, cy, half, scale):
    j0, i0 = grid.index(cx - half, cy - half)
    j1, i1 = grid.index(cx + half, cy + half)
    j0, i0 = max(0, j0), max(0, i0)
    c = rgb[j0:j1, i0:i1]
    return np.repeat(np.repeat(c, scale, axis=0), scale, axis=1)


# ---------------------------------------------------------------- report

def report_md(r: dict) -> str:
    L = []
    w = L.append
    run = r.get("slice_run") or {}
    w("# Virtual print, slicer half: keys flex-pair preset two")
    w("")
    w("Every figure below is computed from the slicer's G-code and the 3MF meshes")
    w("(a simulated print), unless it says measured. Nothing was printed. Written by")
    w("`tools/py/gcode/analyze.py` from the run of `tools/slice/slice.mjs`.")
    w("")
    w("## Slice run")
    w("")
    if run:
        sl = run.get("slicer") or {}
        w(f"- slicer: Flash Studio {sl.get('appVersion')}, CLI Orca-Flashforge {sl.get('cliVersion')}")
        w(f"- exit code {run.get('exitCode')}, wall time {run.get('wallMs')} ms (measured)")
        g = run.get("gcode") or {}
        w(f"- G-code: {g.get('bytes')} bytes, sha256 {g.get('sha256')}")
        i3 = run.get("input3mf") or {}
        c3 = run.get("completed3mf") or {}
        w(f"- 3MF from the writer: {i3.get('bytes')} bytes, sha256 {i3.get('sha256')}")
        w(f"- completed 3MF sliced: {c3.get('bytes')} bytes, sha256 {c3.get('sha256')}; {c3.get('embeddedKeys')} embedded keys kept, {c3.get('filledFromPresets')} filled from bundled presets")
        if c3:
            w("- why completed: the writer's 3MF alone made Orca-Flashforge 2.3.2 exit on SIGSEGV (139) headless; nozzle_diameter, printable_height and gcode_flavor were the keys it lacked (measured 2026-10-07, see the header of tools/slice/slice.mjs)")
        for s in c3.get("substitutions") or []:
            w(f"- slot {s['slot']}: the 3MF names filament preset \"{s['named']}\", which Flash Studio does not bundle; sliced with \"{s['used']}\" (inferred stand-in)")
        w("- command:")
        w("")
        w("```")
        w(" ".join(f'"{a}"' if " " in str(a) else str(a) for a in run.get("command") or []))
        w("```")
    else:
        w("- slice run record: not given")
    w("")
    w("## Summary")
    w("")
    for g in r["e_contact_gap"]:
        verdict = {True: "pass", False: "fail", None: "not computed"}[g.get("pass")]
        ob = g.get("obstruction")
        obs = f"; {', '.join(ob['tools'])} deposited over the column footprint at layer {ob['layer']} (z {ob['z']}), {ob['area_mm2']} mm2" if ob else ""
        w(f"- key {g['key']}: printed contact gap {g['printed_gap_mm']} mm against {g['declared_gap_mm']} mm declared, {verdict}{obs} (computed)")
    fr = r["a_missing"]["foreign"]
    for x in fr:
        if x["area_mm2"] >= 1.0:
            w(f"- layer {x['layer']}: {x['area_mm2']} mm2 of {x['body']} printed by {', '.join(x['deposited_by'])}, {x['kind']} ({', '.join(sorted(x['roles']))}) (computed)")
    w(f"- regions of a body printed by another tool: {len(fr)}, {sum(1 for x in fr if x['kind'] == 'replaced')} replaced and {sum(1 for x in fr if x['kind'] != 'replaced')} with two tools in one cell (computed)")
    air = r["a_missing"]["air"]
    largest = f", largest {max(x['area_mm2'] for x in air)} mm2" if air else ""
    w(f"- deposits in model air, more than {EDGE_MM} mm from every body, prime tower left out: {len(air)}{largest} (computed)")
    bridges = sum(len(x["bridges"]) for x in r["c_nets"]["layers"])
    shorts = r["d_connectivity"].get("shorts", [])
    w(f"- deposited cPLA components joining two nets, in a layer or across layers: {len(shorts)}{'; ' + '; '.join(', '.join(c['nets']) + ' (layers ' + str(c['layers'][0]) + ' to ' + str(c['layers'][1]) + ')' for c in shorts) if shorts else ''} (computed)")
    w(f"- deposited cPLA regions touching two nets within one layer: {bridges} (computed)")
    leads = r["d_connectivity"].get("leads", [])
    ok = all(t["reached"] for ld in leads for t in ld["column_tops"])
    w(f"- every lead reaches its column tops through deposited cPLA: {'yes' if ok and leads else 'no'} (computed)")
    caps = [u for u in r["b_unsupported"] if u["body"] and "cap" in u["body"]]
    if caps:
        w(f"- cTPU cap first layer: widest unsupported span {max(u['span_mm'] for u in caps)} mm, bridge role share {max(u['bridge_role_frac'] for u in caps)} (computed)")
    drop = sum(1 for x in r["a_missing"]["features"] if x["kind"] == "feature dropped")
    w(f"- model features dropped by the slicer: {drop} (computed)")
    w("")
    f = r["f_toolchanges"]
    ft = f["footer"]
    w("## (f) Tool changes, tower, time, filament")
    w("")
    w(f"- layers: {len(r['layers'])} (G-code ;LAYER_CHANGE markers), header says {r['header'].get('total_layer_number')}, max z {r['header'].get('max_z_height')} mm")
    w(f"- T commands: {f['tool_commands']}; tool changes (T to a different tool): {f['tool_changes']}; slicer footer total filament change: {_fmt(ft.get('filament_changes'))}")
    w(f"- change pairs: {', '.join(f'{k} {v}' for k, v in f['tool_changes_by_pair'].items())}")
    w(f"- prime tower: enable_prime_tower {f['prime_tower_enabled']}, width {f['prime_tower_width']} mm, prime volume {f['prime_volume']} mm3, {f['prime_tower_segments']} tower road segments")
    w(f"- estimated print time (slicer, computed): {ft.get('time_normal')}; first layer {ft.get('time_first_layer')}")
    for i, (mm, g) in enumerate(zip(ft.get("filament_mm") or [], ft.get("filament_g") or [])):
        w(f"- slot {i + 1} (T{i}): {mm} mm, {g} g of filament (slicer, computed)")
    w(f"- total {_fmt(ft.get('total_filament_g'))} g (slicer, computed)")
    w("")
    w("## (e) As-printed contact gap")
    w("")
    w("| key | column top z | cap underside z | printed gap | mesh gap | declared gap |")
    w("|---|---|---|---|---|---|")
    for g in r["e_contact_gap"]:
        w(f"| {g['key']} | {g['column_top_z']} mm (layer {g['column_top_layer']}) | {g['cap_underside_z']} mm (layer {g['cap_first_layer']}) | {g['printed_gap_mm']} mm | {g['model_gap_mesh_mm']} mm | {g['declared_gap_mm']} mm |")
    w("")
    w("All computed. Column top is the top of the last layer with cPLA over the column")
    w("footprint; cap underside is the floor of the first layer with cTPU over it. A key")
    w("passes when the printed gap is at least the declared gap less one layer height and")
    w("nothing is deposited over the footprint between the two.")
    for g in r["e_contact_gap"]:
        ob = g.get("obstruction")
        if ob:
            w(f"- key {g['key']}: {', '.join(ob['tools'])} deposited over the column footprint at layer {ob['layer']} (z {ob['z']}), {ob['area_mm2']} mm2, inside the contact gap")
    w("")
    w("## (c) Column halves and net bridges")
    w("")
    gaps = r["c_nets"]["column_gaps"]
    for k in sorted({g["key"] for g in gaps}):
        rows = [g for g in gaps if g["key"] == k and g["deposited_gap_mm"] is not None]
        if rows:
            mn = min(rows, key=lambda g: g["deposited_gap_mm"])
            w(f"- key {k}: both halves deposited in {len(rows)} layers; minimum deposited gap {mn['deposited_gap_mm']} mm at layer {mn['layer']} (z {mn['z']}), model gap there {mn['model_gap_mm']} mm")
        for g in gaps:
            if g["key"] == k and g.get("bridged"):
                w(f"- key {k} layer {g['layer']} (z {g['z']}): one deposited region holds both halves, gap 0 mm")
        lone = [g for g in gaps if g["key"] == k and (g["k_half_present"] != g["gnd_half_present"])]
        for g in lone:
            w(f"- key {k} layer {g['layer']} (z {g['z']}): only the {'key' if g['k_half_present'] else 'GND'} half deposited")
    br = [x for x in r["c_nets"]["layers"] if x["bridges"]]
    if br:
        for x in br:
            for b in x["bridges"]:
                w(f"- layer {x['layer']} (z {x['z']}): one deposited cPLA region touches nets {', '.join(b['nets'])}, {b['area_mm2']} mm2")
    else:
        w("- no deposited cPLA region touches two nets in any layer")
    for c in (r["d_connectivity"].get("ctpu_caps") or []):
        w(f"- {c['cap']}: cTPU deposit in or next to it touches cPLA of nets {', '.join(c['touches_nets']) or 'none'}")
    w("")
    w("## (d) Conductive continuity")
    w("")
    d = r["d_connectivity"]
    w(f"- connectivity: {d['structure']}")
    for c in d.get("cpla_components", []):
        w(f"- cPLA component {c['id']}: {c['voxels']} voxels, layers {c['layers'][0]} to {c['layers'][1]}, nets {', '.join(c['nets']) or 'none'}")
    for ld in d.get("leads", []):
        tops = "; ".join(f"{t['column']} top layer {t['top_layer']} reached {'yes' if t['reached'] else 'no'}" for t in ld["column_tops"])
        w(f"- {ld['net']} lead at {ld['lead_at']} (layer {ld['lead_layer']}, {ld['trace']}, deposit {ld['lead_to_deposit_mm']} mm from the model lead): {tops}")
    for c in d.get("ctpu_caps", []):
        w(f"- {c['cap']}: {c['components']} connected cTPU component(s)")
    w("")
    w("## (a) Model features missing from the deposit")
    w("")
    w("Covered counts road footprint plus the holes the body's own sparse infill roads border;")
    w("road share counts the road footprint alone.")
    w("")
    w("| body | tool | net | layers | model mm2 | covered | road share | dropped features | missing areas | largest missing mm2 (layer) |")
    w("|---|---|---|---|---|---|---|---|---|---|")
    for name, s in r["a_missing"]["bodies"].items():
        w(f"| {name} | {s['tool']} | {s['net'] or ''} | {s['layers']} | {s['model_mm2']} | {s['coverage']} | {s['road_coverage']} | {s['dropped_features']} | {s['missing_areas']} | {s['largest_missing_mm2']} ({s['largest_missing_layer']}) |")
    w("")
    w(f"cPLA road widths the slicer wrote: {', '.join(str(x) for x in r['a_missing']['cpla_road_widths_mm'])} mm.")
    w("")
    w("| conductor body | net | narrowest section | widest section |")
    w("|---|---|---|---|")
    for c in r["a_missing"]["conductor_section_widths"]:
        w(f"| {c['body']} | {c['net'] or ''} | {c['min_section_width_mm']} mm | {c['max_section_width_mm']} mm |")
    w("")
    feats = r["a_missing"]["features"]
    drop = [x for x in feats if x["kind"] == "feature dropped"]
    big = sorted([x for x in feats if x["kind"] == "area missing"], key=lambda x: -x["area_mm2"])
    w(f"Features dropped (model region under half covered by its own tool): {len(drop)}.")
    for x in drop[:40]:
        w(f"- layer {x['layer']} z mid {x['z_mid']}: {x['body']} ({x['tool']}), {x['area_mm2']} mm2, {x['width_mm']} mm wide, {x['covered_frac']} covered, at {x['at']}")
    w("")
    w(f"Missing areas of at least {MIN_FEATURE_MM2} mm2 after a {SLIVER_PX * RES:.2f} mm opening: {len(big)}; largest:")
    for x in big[:25]:
        w(f"- layer {x['layer']} z mid {x['z_mid']}: {x['body']} ({x['tool']}), {x['area_mm2']} mm2, {x['width_mm']} mm wide, at {x['at']}")
    w("")
    fr = r["a_missing"]["foreign"]
    w(f"Regions of a body printed by another tool (at least {MIN_FEATURE_MM2} mm2 after the opening): {len(fr)}.")
    for x in sorted(fr, key=lambda x: (-x["area_mm2"], x["layer"]))[:30]:
        roles = ", ".join(f"{k} {v}" for k, v in sorted(x["roles"].items()))
        w(f"- layer {x['layer']} z mid {x['z_mid']}: {x['body']} ({x['tool']}) has {x['area_mm2']} mm2 of {', '.join(x['deposited_by'])} roads, {x['kind']}, {x['width_mm']} mm wide, at {x['at']}; road segments: {roles}")
    w("")
    air = r["a_missing"]["air"]
    w(f"Deposits in model air (any road but the prime tower's, more than {EDGE_MM} mm from every body section, at least {MIN_FEATURE_MM2} mm2): {len(air)}.")
    for x in sorted(air, key=lambda x: (-x["area_mm2"], x["layer"]))[:30]:
        w(f"- layer {x['layer']} z {x['z']}: {x['area_mm2']} mm2 of {', '.join(x['deposited_by'])} roads at {x['at']}")
    w("")
    w("## (b) Unsupported regions and bridge spans")
    w("")
    w("A deposit pixel is unsupported when no tool deposited under it in the layer below.")
    w("Span is twice the farthest distance from an unsupported pixel to support.")
    w("")
    w("Sparse infill cells (holes that sparse infill roads border) inside the model below count as support.")
    w("")
    w("By layer, tool and body (all regions of at least the reporting area):")
    w("")
    w("| layer | z | tool | body | regions | area mm2 | widest span mm | bridge role share |")
    w("|---|---|---|---|---|---|---|---|")
    agg: dict = {}
    for u in r["b_unsupported"]:
        k = (u["layer"], u["tool"], u["body"] or "")
        g = agg.setdefault(k, {"z": u["z"], "n": 0, "area": 0.0, "span": 0.0, "bridge": 0.0})
        g["n"] += 1
        g["area"] += u["area_mm2"]
        g["span"] = max(g["span"], u["span_mm"])
        g["bridge"] += u["bridge_role_frac"] * u["area_mm2"]
    for (li, t, body), g in sorted(agg.items()):
        w(f"| {li} | {g['z']} | {t} | {body} | {g['n']} | {g['area']:.3f} | {g['span']:.3f} | {g['bridge'] / g['area']:.3f} |")
    w("")
    w("Every region printed by T1, T2 or T3:")
    w("")
    w("| layer | z | tool | body | area mm2 | span mm | bridge role share | over model below | at |")
    w("|---|---|---|---|---|---|---|---|---|")
    for u in sorted(r["b_unsupported"], key=lambda u: (u["layer"], u["tool"])):
        if u["tool"] == "T0":
            continue
        w(f"| {u['layer']} | {u['z']} | {u['tool']} | {u['body'] or ''} | {u['area_mm2']} | {u['span_mm']} | {u['bridge_role_frac']} | {'yes' if u['below_model'] else 'no'} | {u['at']} |")
    w("")
    w("## Layer maps")
    w("")
    w("`layers/layer-NN-zZ.png`: every layer at 0.05 mm per pixel, y up. Tan PETG,")
    w("ink cPLA, pink TPU 95A, grey cTPU, blue model area missing from the deposit,")
    w("green model area printed by another tool, yellow unsupported deposit.")
    w("`layers/keyK-layer-NN-zZ.png`: 14 mm square around")
    w(f"key K at 4 px per pixel for the key layers {', '.join(str(x) for x in r['key_layers'])}.")
    w("")
    return "\n".join(L) + "\n"


def _fmt(v):
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--gcode", type=Path, required=True)
    ap.add_argument("--3mf", dest="threemf", type=Path, required=True)
    ap.add_argument("--model-json", type=Path)
    ap.add_argument("--run-json", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--no-png", action="store_true")
    a = ap.parse_args(argv)
    analyze(a.gcode, a.threemf, a.model_json, a.run_json, a.out, png=not a.no_png)
    print(f"wrote {a.out / 'slice.json'} and {a.out / 'report-slice.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
