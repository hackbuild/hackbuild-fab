"""Inventory of the shipped DXF emitters (M07-T01 step 7).

For each file listed in <dir>/MANIFEST.json: the raw $ACADVER and
$INSUNITS read from the file text (ezdxf fills a missing $ACADVER with
AC1009 on read, so its header is never asked), the entity types, the
closed flag and the repeated first vertex of every POLYLINE and
LWPOLYLINE, and the ezdxf audit error and fix counts. Files are grouped
into one row per emitter, as the inventory table of
docs/plan/milestones/M07-motion-nest.md.

    uv run --project tools/py tools/py/dxf_inventory.py tools/corpus/dxf [--write]

Prints the rows as JSON and checks them against
packages/nest/records/dxf-inventory.json and the values of the inventory
table. Exit 1 on a file whose sha256 is not the MANIFEST pin, a moved
value, or a difference from the record (D-153).
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from legacy_record import Asserts, ROOT, finish, read_pinned  # noqa: E402


def pairs(text):
    lines = [l.strip() for l in text.replace("\r\n", "\n").split("\n")]
    return [(lines[i], lines[i + 1]) for i in range(0, len(lines) - 1, 2)]


def raw(text):
    """$ACADVER, $INSUNITS and the entity types from the raw group code
    pairs: header variables inside the HEADER section, entity records (code
    0) inside the ENTITIES section, VERTEX and SEQEND counted as written."""
    out = {"$ACADVER": None, "$INSUNITS": None}
    types, section, var = {}, None, None
    it = pairs(text)
    for k, (code, value) in enumerate(it):
        if code == "0" and value == "SECTION" and k + 1 < len(it):
            section = it[k + 1][1]
        elif code == "0" and value == "ENDSEC":
            section = None
        elif section == "HEADER" and code == "9":
            var = value
        elif section == "HEADER" and var in out and out[var] is None:
            out[var] = value
        elif section == "ENTITIES" and code == "0":
            types[value] = types.get(value, 0) + 1
    return out, types


def inspect(path):
    import ezdxf
    from ezdxf import recover
    h, raw_types = raw(open(path, "rb").read().decode("utf8", "replace"))
    try:
        doc = ezdxf.readfile(path)
        mode = "readfile"
    except Exception as e:  # noqa: BLE001, the mode is reported
        doc, _ = recover.readfile(path)
        mode = "recover:" + type(e).__name__
    auditor = doc.audit()
    closed, opened, repeated, unrepeated = 0, 0, 0, 0
    for e in doc.modelspace():
        t = e.dxftype()
        if t == "POLYLINE":
            pts = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]
            is_closed = e.is_closed
        elif t == "LWPOLYLINE":
            pts = [(p[0], p[1]) for p in e.get_points()]
            is_closed = e.closed
        else:
            continue
        closed += 1 if is_closed else 0
        opened += 0 if is_closed else 1
        if len(pts) > 1 and abs(pts[0][0] - pts[-1][0]) < 1e-9 and abs(pts[0][1] - pts[-1][1]) < 1e-9:
            repeated += 1
        else:
            unrepeated += 1
    return {"acadver": h["$ACADVER"], "insunits": h["$INSUNITS"], "types": raw_types, "read": mode,
            "closed": closed, "open": opened, "firstVertexRepeated": repeated, "firstVertexNotRepeated": unrepeated,
            "auditErrors": len(auditor.errors), "auditFixes": len(auditor.fixes)}


def word(yes, no):
    if yes + no == 0:
        return "n/a"
    return "yes" if no == 0 else "no" if yes == 0 else f"mixed ({yes} of {yes + no})"


def rows(manifest, base):
    groups = {}
    for f in manifest["files"]:
        path = os.path.join(base, f["path"])
        read_pinned(path, f["sha256"])
        groups.setdefault(f["emitter"], []).append((f["path"], inspect(path)))
    out = []
    for emitter, files in groups.items():
        types = {}
        for _, r in files:
            for t, n in r["types"].items():
                types[t] = types.get(t, 0) + n
        s = lambda k: sum(r[k] for _, r in files)
        out.append({
            "emitter": emitter,
            "files": [p for p, _ in files],
            "acadver": sorted({r["acadver"] or "absent" for _, r in files}),
            "insunits": sorted({r["insunits"] or "not set" for _, r in files}),
            "entities": dict(sorted(types.items())),
            "closed": s("closed"), "open": s("open"),
            "firstVertexRepeated": word(s("firstVertexRepeated"), s("firstVertexNotRepeated")),
            "auditErrors": s("auditErrors"), "auditFixes": s("auditFixes"),
            "read": sorted({r["read"] for _, r in files}),
            "perFile": {p: r for p, r in files},
        })
    return out


# The inventory table of M07-motion-nest.md, row for row (computed, ezdxf 1.4.4).
TABLE = {
    "SLUG sheetDXF": (["absent"], ["4"], ["POLYLINE", "SEQEND", "VERTEX"], "no"),
    "OGEE16 cutfiles.py (ezdxf new())": (["AC1027"], ["6"], ["LWPOLYLINE"], "yes"),
    # no HEADER section at all; ezdxf reports AC1009 on read
    "OGEE16 OpenSCAD export": (["absent"], ["not set"], ["LINE"], "n/a"),
    "OGEE build-it dxf()": (["AC1015"], ["4"], ["LWPOLYLINE"], "yes"),
    "COFFER": (["AC1024"], ["6"], ["LWPOLYLINE"], "yes"),
    "SHIM": (["AC1024"], ["4"], ["CIRCLE", "LINE", "LWPOLYLINE"], "yes"),
    "SPINDLE": (["AC1024"], ["6"], ["ARC", "CIRCLE", "LINE", "TEXT"], "n/a"),
    "TRUNNION (SPLICE backings)": (["absent"], ["4"], ["LINE", "TEXT"], "n/a"),
    "COTTER KIT.laserDXF": (["AC1024"], ["4"], ["LWPOLYLINE"], "no"),
}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    base = os.path.abspath(args[0] if args else os.path.join(ROOT, "tools", "corpus", "dxf"))
    mpath = os.path.join(base, "MANIFEST.json")
    manifest = json.load(open(mpath))
    import ezdxf
    result = {"rows": rows(manifest, base), "notRun": manifest.get("notRun", [])}
    a = Asserts()
    got = {r["emitter"]: r for r in result["rows"]}
    a.eq("emitters", sorted(got), sorted(TABLE))
    for emitter, (ver, units, ents, rep) in TABLE.items():
        r = got.get(emitter)
        if r is None:
            continue
        a.eq(f"{emitter} $ACADVER", r["acadver"], ver)
        a.eq(f"{emitter} $INSUNITS", r["insunits"], units)
        a.eq(f"{emitter} entities", sorted(r["entities"]), ents)
        a.eq(f"{emitter} first vertex repeated", r["firstVertexRepeated"], rep)
        a.eq(f"{emitter} ezdxf audit errors", r["auditErrors"], 0)
    if "OGEE16 OpenSCAD export" in got:
        a.eq("LINE in deck.dxf", got["OGEE16 OpenSCAD export"]["entities"].get("LINE"), 294)
    print(json.dumps([{k: v for k, v in r.items() if k != "perFile"} for r in result["rows"]], indent=1))
    finish({
        "record": "dxf-inventory",
        "out": "packages/nest/records/dxf-inventory.json",
        "command": "uv run --project tools/py tools/py/dxf_inventory.py tools/corpus/dxf",
        "qualifier": "computed: raw header text and ezdxf readfile and audit on the files of tools/corpus/dxf/MANIFEST.json",
        "inputs": {mpath: __import__("hashlib").sha256(open(mpath, "rb").read()).hexdigest()},
        "versions": {"ezdxf": ezdxf.__version__},
    }, result, a)


if __name__ == "__main__":
    main()
