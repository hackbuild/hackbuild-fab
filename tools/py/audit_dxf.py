#!/usr/bin/env python3
"""The DXF reload audit (M07-T06 step 4, D-138, CHK-SHT-03).

Ported from COTTER tools/audit_dxf.py (lineage cotter.audit-dxf/r5; copy
designs/cotter/legacy/audit_dxf.py) and fixed:

- the entity type is checked before any attribute: the original read
  e.closed on every entity and crashed with AttributeError on the POLYLINE
  files of SLUG before it printed a verdict;
- $ACADVER, $INSUNITS, $HANDSEED, layers and handles are read from the raw
  group codes: ezdxf fills a missing $ACADVER with AC1009 and gives every
  entity a handle on read, so asking ezdxf hides both faults;
- the closure rule is the belt and braces of knowledge/kernels/sheet-design.md:
  the closed flag and the first vertex repeated;
- the twin comparison reads the SVG's drawn content box from its path data
  (M, L, A and Z, the twin nest writes), all four edges, where COTTER took
  the SVG size less its 10 mm margin.

Rules, each named in a failure line and in tools/corpus/dxf/MANIFEST.json:
  acadver   $ACADVER is AC1024 in the file text
  insunits  $INSUNITS is 4 (millimetres)
  entities  every entity is LWPOLYLINE or CIRCLE
  layers    every entity is on ENGRAVE, SCORE, CUT_INNER, CUT or LIGHT
  closed    every polyline is flagged closed and repeats its first vertex
  handles   every entity has a handle, unique, below $HANDSEED
  audit     ezdxf reads the file and its auditor has no errors and no fixes
  extents   the drawing extents equal the SVG twin's content box within
            0.6 mm (COTTER rule); not run when the file has no twin

    uv run --project tools/py tools/py/audit_dxf.py <dir>
    uv run --project tools/py tools/py/audit_dxf.py <dir> --expect <MANIFEST.json>

Without --expect: exit 1 when any file fails any rule. With --expect: every
file in the directory must be listed, its sha256 must equal the pin, and the
rules it fails must equal its "chkSht03" list exactly; exit 1 otherwise.
One line per file either way (D-153).
"""
import glob, json, math, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dxf_inventory import pairs  # noqa: E402
from legacy_record import sha256_bytes  # noqa: E402

RULES = ["acadver", "insunits", "entities", "layers", "closed", "handles", "audit", "extents"]
LAYERS = {"ENGRAVE", "SCORE", "CUT_INNER", "CUT", "LIGHT"}
KINDS = {"LWPOLYLINE", "CIRCLE"}
TWIN_TOL = 0.6


def raw(text):
    """Header variables and the top-level entity records of the ENTITIES
    section, from the group code pairs as written."""
    head, ents, section, var, cur = {}, [], None, None, None
    it = pairs(text)
    for k, (code, value) in enumerate(it):
        if code == "0" and value == "SECTION" and k + 1 < len(it):
            section, cur = it[k + 1][1], None
            continue
        if code == "0" and value == "ENDSEC":
            section, cur = None, None
            continue
        if section == "HEADER":
            if code == "9":
                var = value
            elif var is not None and var not in head:
                head[var] = value
        elif section == "ENTITIES":
            if code == "0":
                cur = {"type": value, "handle": None, "layer": None}
                ents.append(cur)
            elif cur is not None and code == "5" and cur["handle"] is None:
                cur["handle"] = value
            elif cur is not None and code == "8" and cur["layer"] is None:
                cur["layer"] = value
    return head, ents


def path_box(d):
    """Bounding box of SVG path data written with absolute M, L, A and Z."""
    toks = re.findall(r"[MLAZ]|-?\d+(?:\.\d+)?(?:e-?\d+)?", d)
    xs, ys, i, cur, cmd = [], [], 0, None, None
    while i < len(toks):
        t = toks[i]
        if t in "MLAZ":
            cmd = t
            i += 1
            if t == "Z":
                continue
        if cmd in ("M", "L"):
            cur = (float(toks[i]), float(toks[i + 1]))
            xs.append(cur[0]); ys.append(cur[1]); i += 2
        elif cmd == "A":
            r, large, sweep = float(toks[i]), int(toks[i + 3]), int(toks[i + 4])
            end = (float(toks[i + 5]), float(toks[i + 6]))
            for x, y in arc_points(cur, end, r, large, sweep):
                xs.append(x); ys.append(y)
            cur = end
            i += 7
        else:
            raise ValueError(f"path command {cmd!r} not read by the audit")
    return min(xs), min(ys), max(xs), max(ys)


def arc_points(a, b, r, large, sweep):
    """End points and the axis extremes an SVG arc passes (SVG 1.1 F.6.5, no rotation)."""
    x1p, y1p = (a[0] - b[0]) / 2, (a[1] - b[1]) / 2
    lam = (x1p * x1p + y1p * y1p) / (r * r)
    if lam > 1:
        r *= math.sqrt(lam)
    num = max(0.0, r * r * r * r - r * r * (x1p * x1p + y1p * y1p))
    co = math.sqrt(num / (r * r * (x1p * x1p + y1p * y1p))) if x1p or y1p else 0.0
    if large == sweep:
        co = -co
    cxp, cyp = co * y1p, -co * x1p
    cx, cy = cxp + (a[0] + b[0]) / 2, cyp + (a[1] + b[1]) / 2
    t0 = math.atan2(a[1] - cy, a[0] - cx)
    t1 = math.atan2(b[1] - cy, b[0] - cx)
    d = t1 - t0
    if sweep and d < 0:
        d += 2 * math.pi
    if not sweep and d > 0:
        d -= 2 * math.pi
    out = [a, b]
    for k in range(-4, 5):
        t = k * math.pi / 2
        # angle t is passed when t0 + s*d = t + 2 pi m for s in [0, 1]
        for m in range(-2, 3):
            s = (t + 2 * math.pi * m - t0) / d if d else -1
            if 0 <= s <= 1:
                out.append((cx + r * math.cos(t), cy + r * math.sin(t)))
                break
    return out


def svg_box(text):
    """Content box of a twin in model coordinates: the box of every path, y
    flipped back when the root group carries no scale(1,-1)."""
    boxes = [path_box(d) for d in re.findall(r'<path[^>]*\sd="([^"]*)"', text)]
    if not boxes:
        return None
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    if "scale(1,-1)" not in text:
        m = re.search(r'viewBox="[-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+)"', text)
        h = float(m.group(1)) if m else 0.0
        y0, y1 = h - y1, h - y0
    return x0, y0, x1, y1


def twin_of(f):
    """COTTER's twin rule: <name>.svg beside the DXF, else in the folder above."""
    twin = f[:-4] + ".svg"
    if os.path.exists(twin):
        return twin
    up = os.path.join(os.path.dirname(os.path.dirname(f)), os.path.basename(f)[:-4] + ".svg")
    return up if os.path.exists(up) else None


def audit(f):
    """Failed rules with their detail, rules not run, and a summary."""
    import ezdxf
    from ezdxf import bbox, recover
    text = open(f, "rb").read().decode("utf8", "replace")
    head, ents = raw(text)
    fails, notrun = {}, {}
    ver = head.get("$ACADVER")
    if ver != "AC1024":
        fails["acadver"] = f"$ACADVER {ver or 'absent'}, legal AC1024"
    units = head.get("$INSUNITS")
    if units != "4":
        fails["insunits"] = f"$INSUNITS {units or 'absent'}, legal 4 (mm)"
    kinds = sorted({e["type"] for e in ents} - KINDS)
    if kinds:
        fails["entities"] = "entity types " + " ".join(kinds) + ", legal LWPOLYLINE CIRCLE"
    layers = sorted({e["layer"] or "absent" for e in ents} - LAYERS)
    if layers:
        fails["layers"] = "layers " + " ".join(layers) + ", legal " + " ".join(sorted(LAYERS))
    seed = head.get("$HANDSEED")
    hs = [e["handle"] for e in ents]
    if None in hs:
        fails["handles"] = f"{hs.count(None)} of {len(hs)} entities have no handle"
    elif seed is None:
        fails["handles"] = "no $HANDSEED"
    else:
        vals = [int(h, 16) for h in hs]
        if len(set(vals)) != len(vals):
            fails["handles"] = f"{len(vals) - len(set(vals))} repeated handles"
        elif vals and max(vals) >= int(seed, 16):
            fails["handles"] = f"handle {max(vals):X} at or above $HANDSEED {seed}"
    try:
        doc = ezdxf.readfile(f)
        how = "readfile"
    except Exception as e:  # noqa: BLE001, the reader's failure is the finding
        doc, _ = recover.readfile(f)
        how = "recover"
        fails["audit"] = f"ezdxf readfile raised {type(e).__name__}"
    aud = doc.audit()
    if aud.has_errors or aud.has_fixes:
        fails["audit"] = f"ezdxf audit {len(aud.errors)} errors, {len(aud.fixes)} fixes after {how}"
    msp = list(doc.modelspace())
    opened = 0
    for e in msp:
        t = e.dxftype()
        if t == "LWPOLYLINE":
            pts, closed = [(p[0], p[1]) for p in e.get_points()], e.closed
        elif t == "POLYLINE":
            pts, closed = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices], e.is_closed
        else:
            continue
        rep = len(pts) > 1 and abs(pts[0][0] - pts[-1][0]) < 1e-9 and abs(pts[0][1] - pts[-1][1]) < 1e-9
        if not (closed and rep):
            opened += 1
    if opened:
        fails["closed"] = f"{opened} polylines not flagged closed with the first vertex repeated"
    ext = bbox.extents(msp)
    box = (ext.extmin.x, ext.extmin.y, ext.extmax.x, ext.extmax.y) if ext.has_data else None
    twin = twin_of(f)
    if twin is None:
        notrun["extents"] = "no SVG twin beside the file"
    elif box is None:
        fails["extents"] = "the drawing has no extents"
    else:
        sb = svg_box(open(twin).read())
        if sb is None:
            fails["extents"] = f"twin {os.path.basename(twin)} draws no path"
        else:
            worst = max(abs(a - b) for a, b in zip(box, sb))
            if worst > TWIN_TOL:
                fails["extents"] = "extents %.3f %.3f %.3f %.3f against twin %.3f %.3f %.3f %.3f, worst %.3f, legal %.1f" % (*box, *sb, worst, TWIN_TOL)
    size = "%.1f x %.1f mm" % (box[2] - box[0], box[3] - box[1]) if box else "empty"
    return fails, notrun, f"{ver or 'no $ACADVER'} {len(ents)} entities {size}"


def main():
    args = [a for a in sys.argv[1:]]
    expect = None
    if "--expect" in args:
        k = args.index("--expect")
        expect = json.load(open(args[k + 1]))
        del args[k:k + 2]
    if len(args) != 1:
        raise SystemExit("usage: audit_dxf.py <dir> [--expect MANIFEST.json]")
    base = os.path.abspath(args[0])
    files = sorted(glob.glob(os.path.join(base, "**", "*.dxf"), recursive=True))
    if not files:
        raise SystemExit(f"no DXF under {args[0]}")
    listed = {e["path"]: e for e in (expect or {}).get("files", [])}
    bad = 0
    for f in files:
        rel = os.path.relpath(f, base)
        fails, notrun, summary = audit(f)
        got = [r for r in RULES if r in fails]
        detail = "; ".join(f"{r}: {fails[r]}" for r in got)
        nr = "; ".join(f"{r} not run: {why}" for r, why in notrun.items())
        if expect is None:
            ok = not got
            verdict = "ok" if ok else "PROBLEM: " + detail
        else:
            e = listed.get(rel)
            if e is None:
                ok, verdict = False, "UNLISTED: not in the manifest"
            elif sha256_bytes(open(f, "rb").read()) != e["sha256"]:
                ok, verdict = False, "PIN: sha256 differs from the manifest"
            else:
                want = e.get("chkSht03")
                ok = want is not None and got == [r for r in RULES if r in want]
                verdict = ("as listed, fails " + " ".join(got) if got else "as listed, passes") if ok else f"UNEXPECTED: listed {want}, failed {got}" + (f" ({detail})" if detail else "")
        print(f"{rel:60s} {summary}  {verdict}" + (f"  [{nr}]" if nr else ""))
        bad += 0 if ok else 1
    if expect is not None:
        missing = sorted(set(listed) - {os.path.relpath(f, base) for f in files})
        for m in missing:
            print(f"{m:60s} MISSING: listed in the manifest, not in {args[0]}")
        bad += len(missing)
    print("DXF failures:" if expect is None else "DXF files off their listed verdict:", bad)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
