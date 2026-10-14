"""M00-T12: SPRUE geometry parity through the Python writer.

Every shipped plate (tools/corpus/3mf/sprue/) is read through its p:path sub-models and the four part
STLs are read as float32 soups, then each is re-emitted through orca3mf.py
with two PETG filaments on the ffc5p machine preset. Per part the read-back
volume agrees within 1e-3 mm3, the bounding box within 1e-6 mm and the
triangle count exactly (computed). SPRUE's own 24-key project_settings is
recorded, never matched (D-028). Rows land in tools/corpus/sprue/parity-py.json.
"""
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path

import numpy as np
import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools/py"))
import orca3mf  # noqa: E402

# The four plates and four part STLs are tracked repo copies of the SPRUE harvest
# (fab-work-directory/benches/sprue/outputs/sprue), byte-identical (cmp, 2026-10-05 and 2026-10-06).
PLATE_DIR = REPO / "tools/corpus/3mf/sprue"
PART_DIR = REPO / "tools/corpus/sprue/parts"
GOLD = REPO / "tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf"
REPORT = REPO / "tools/corpus/sprue/parity-py.json"
VALIDATOR = REPO / "tools/py/validate_3mf.py"
EPOCH = int(os.environ.get("SOURCE_DATE_EPOCH") or 1791072000)
VOLUME_TOL = 1e-3
BBOX_TOL = 1e-6
# sprue.py writes plate vertices at 5 decimals and the part STLs as float32: up to 5e-6 mm apart (computed).
STL_PLATE_BBOX_TOL = 1e-5
MACHINE, PRESET = "ffc5p", "ffc5p_20260819"
ROOT = "3D/3dmodel.model"

PLATES = sorted(PLATE_DIR.glob("*.3mf"))
STLS = sorted(PART_DIR.glob("*.stl"))

ATTR = re.compile(r'([\w:]+)="([^"]*)"')


def attrs(tag):
    return dict(ATTR.findall(tag))


def read_model(xml):
    out = {}
    for m in re.finditer(r"<object\b([^>]*)>(.*?)</object>", xml, re.S):
        oid = attrs(m.group(1))["id"]
        body = m.group(2)
        comps = [(a.get("p:path"), a["objectid"]) for a in (attrs(c) for c in re.findall(r"<component\b([^>]*)/>", body))]
        mesh = None
        if "<mesh>" in body:
            v = np.array([[float(a["x"]), float(a["y"]), float(a["z"])]
                          for a in (attrs(t) for t in re.findall(r"<vertex\b([^>]*)/>", body))], dtype=float).reshape(-1, 3)
            f = np.array([[int(a["v1"]), int(a["v2"]), int(a["v3"])]
                          for a in (attrs(t) for t in re.findall(r"<triangle\b([^>]*)/>", body))], dtype=np.int64).reshape(-1, 3)
            mesh = (v, f)
        out[oid] = {"mesh": mesh, "components": comps}
    return out


def read_model_settings(xml):
    out = {}
    for m in re.finditer(r'<object id="(\d+)">(.*?)</object>', xml, re.S):
        body = m.group(2)
        name = re.search(r'<metadata key="name" value="([^"]*)"/>', body).group(1)
        parts = {}
        for p in re.finditer(r'<part id="(\d+)"[^>]*>(.*?)</part>', body, re.S):
            pb = p.group(2)
            parts[p.group(1)] = (re.search(r'<metadata key="name" value="([^"]*)"/>', pb).group(1),
                                 int(re.search(r'<metadata key="extruder" value="(\d+)"/>', pb).group(1)))
        out[m.group(1)] = (name, parts)
    return out


def read_plate(data):
    """[{name, positions, parts: [{name, slot, verts, faces}]}], project_settings."""
    z = zipfile.ZipFile(io.BytesIO(data))
    models = {}

    def model(path):
        if path not in models:
            models[path] = read_model(z.read(path).decode("utf-8"))
        return models[path]

    root_xml = z.read(ROOT).decode("utf-8")
    root = model(ROOT)
    ms = read_model_settings(z.read("Metadata/model_settings.config").decode("utf-8"))
    settings = json.loads(z.read("Metadata/project_settings.config"))
    items = {}
    for tag in re.findall(r"<item\b([^>]*)/>", root_xml):
        a = attrs(tag)
        t = [float(x) for x in a.get("transform", "1 0 0 0 1 0 0 0 1 0 0 0").split()]
        assert t[:9] == [1, 0, 0, 0, 1, 0, 0, 0, 1], "SPRUE and the writer place instances by translation only"
        items.setdefault(a["objectid"], []).append(tuple(t[9:12]))
    objects = []
    for oid, positions in items.items():
        name, part_meta = ms[oid]
        parts = []
        for path, cid in root[oid]["components"]:
            target = model(ROOT if path is None else path.lstrip("/"))[cid]
            assert target["mesh"] is not None, "component %s#%s has no mesh" % (path, cid)
            pname, slot = part_meta[cid]
            v, f = target["mesh"]
            parts.append({"name": pname, "slot": slot, "verts": v, "faces": f})
        objects.append({"name": name, "positions": positions, "parts": parts})
    return objects, settings


def read_stl(path):
    """Binary STL welded on exact float32 equality in first-seen order."""
    data = path.read_bytes()
    n = int.from_bytes(data[80:84], "little")
    assert len(data) == 84 + 50 * n
    rec = np.frombuffer(data[84:], dtype=np.dtype([("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")]))
    soup = rec["v"].reshape(-1, 3).astype(float)
    _, first, inv = np.unique(soup, axis=0, return_index=True, return_inverse=True)
    order = np.argsort(first)
    rank = np.empty_like(order)
    rank[order] = np.arange(len(order))
    verts = soup[np.sort(first)]
    return verts, rank[inv.reshape(-1)].reshape(-1, 3)


def stats(v, f):
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    vol = float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)
    return {"tris": int(len(f)), "volume": vol, "lo": v.min(axis=0), "hi": v.max(axis=0)}


def delta(a, b):
    bbox = float(max(np.abs(a["lo"] - b["lo"]).max(), np.abs(a["hi"] - b["hi"]).max()))
    return {"volume": abs(a["volume"] - b["volume"]), "bbox": bbox, "tris": b["tris"] - a["tris"]}


def per_filament_keys(s):
    """Array values of the filament count; the gold also holds printer vectors, which this drops."""
    n = len(s["filament_colour"])
    return sorted(k for k, v in s.items() if isinstance(v, list) and len(v) == n)


def emit(title, build_hash, colours, objects):
    mp = orca3mf.machine_preset(MACHINE, PRESET)
    w = orca3mf.Orca3MF([{"color": c, "type": "PETG", "material": "petg"} for c in colours], preset=mp, title=title,
                        chase="sprue", build_hash=build_hash, nozzle_mm=mp["nozzle"], source_date_epoch=EPOCH)
    for o in objects:
        w.add(orca3mf.PrintObject(o["name"], [orca3mf.Part(p["name"], p["verts"], p["faces"], p["slot"]) for p in o["parts"]]),
              o["positions"])
    return w


def validate(path, mode):
    """validate_3mf.py --overlap; fails as "id[rule] triangles N: first", part address dropped."""
    r = subprocess.run([sys.executable, str(VALIDATOR), mode, "--overlap", "--json", str(path)],
                       cwd=REPO, capture_output=True, text=True)
    doc = json.loads(r.stdout)
    fails = sorted("%s[%s] triangles %s: %s" % (x["id"], x.get("extra", {}).get("rule", ""), x.get("extra", {}).get("triangles", ""),
                                                 x.get("extra", {}).get("first", ""))
                   for x in doc["results"] if x["verdict"] == "fail")
    return r.returncode, fails


def sha256(b):
    return hashlib.sha256(b).hexdigest()


@pytest.fixture(scope="module")
def gold_keys():
    s = json.loads(zipfile.ZipFile(GOLD).read("Metadata/project_settings.config"))
    template = json.loads((REPO / "packages/3mf/data/filament_template.json").read_text())["keys"]
    return [k for k in per_filament_keys(s) if k in template]


@pytest.fixture(scope="module")
def report():
    rep = {"card": "M00-T12", "writer": "tools/py/orca3mf.py (Python)", "machinePreset": "%s/%s" % (MACHINE, PRESET),
           "tolerances": {"volumeMm3": VOLUME_TOL, "bboxMm": BBOX_TOL, "triangles": "equal"},
           "qualifier": "computed; key counts counted from the files",
           "keySet": "SPRUE writes 21 per-filament keys plus version and two preset names, 24 in all; the writer writes "
                     "the 127 gold per-filament keys. Key-set parity with SPRUE is not a target (D-028).",
           "plates": [], "validator": [], "parts": []}
    yield rep
    # Written only from a full run: a host without the part STLs never rewrites the record.
    if rep["parts"] and STLS and len(rep["plates"]) == len(PLATES):
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(rep, indent=2) + "\n")


def part_row(source, obj, part, a, d):
    return {"source": source, "object": obj, "part": part["name"], "slot": part["slot"], "tris": a["tris"],
            "volumeMm3": round(a["volume"], 6), "dVolumeMm3": float("%.3e" % d["volume"]),
            "dBboxMm": float("%.3e" % d["bbox"]), "dTris": d["tris"]}


def check_parts(source, legacy, back, rows):
    assert [o["name"] for o in back] == [o["name"] for o in legacy]
    for lo, bo in zip(legacy, back):
        assert bo["positions"] == lo["positions"]
        assert [(p["name"], p["slot"]) for p in bo["parts"]] == [(p["name"], p["slot"]) for p in lo["parts"]]
        for lp, bp in zip(lo["parts"], bo["parts"]):
            a = stats(lp["verts"], lp["faces"])
            d = delta(a, stats(bp["verts"], bp["faces"]))
            rows.append(part_row(source, lo["name"], lp, a, d))
            assert d["volume"] <= VOLUME_TOL, "%s %s volume off by %g mm3" % (source, lp["name"], d["volume"])
            assert d["bbox"] <= BBOX_TOL, "%s %s bbox off by %g mm" % (source, lp["name"], d["bbox"])
            assert d["tris"] == 0, "%s %s triangle count moved by %d" % (source, lp["name"], d["tris"])


def test_harvest_counts():
    # 4 plates and 4 part STLs, counted 2026-10-04.
    assert len(PLATES) == 4
    assert len(STLS) == 4


@pytest.mark.parametrize("plate", PLATES, ids=[p.name for p in PLATES])
def test_plate(plate, gold_keys, report, tmp_path):
    data = plate.read_bytes()
    legacy, ls = read_plate(data)
    lkeys = per_filament_keys(ls)
    assert len(ls) == 24
    assert len(lkeys) == 21
    assert {len(ls[k]) for k in lkeys} == {2}
    assert sorted(set(ls) - set(lkeys)) == ["print_settings_id", "printer_settings_id", "version"]

    w = emit(plate.stem, sha256(data), ls["filament_colour"], legacy)
    out = tmp_path / plate.name
    w.write(out)
    back, bs = read_plate(out.read_bytes())
    check_parts("plates/" + plate.name, legacy, back, report["parts"])

    keys = per_filament_keys(bs)
    assert keys == gold_keys
    assert len(keys) == 127
    assert all(len(bs[k]) == 2 for k in keys)
    assert bs["filament_colour"] == [c.upper() for c in ls["filament_colour"]]
    assert bs["curr_bed_type"] == orca3mf.machine_preset(MACHINE, PRESET)["slicer"]["bedType"]

    # The re-emit carries the source geometry unchanged, so it passes the validator only where the source
    # does; sprue_picks_phx_backonly.3mf fails CHK-PRT-01 topology on its white part in its own --legacy run.
    status, fails = validate(out, "--export")
    _, src_fails = validate(plate, "--legacy")
    report["validator"].append({"artifact": plate.name, "status": status, "fails": fails, "sourceFails": src_fails})
    assert fails == src_fails
    if not src_fails:
        assert status == 0

    report["plates"].append({
        "plate": "plates/" + plate.name, "sha256": sha256(data), "objects": len(legacy),
        "instances": sum(len(o["positions"]) for o in legacy),
        "legacy": {"projectKeys": len(ls), "perFilamentKeys": len(lkeys), "listLength": 2,
                   "inGoldTemplate": len([k for k in lkeys if k in gold_keys])},
        "emitted": {"projectKeys": len(bs), "perFilamentKeys": len(keys), "listLength": 2,
                    "currBedType": bs["curr_bed_type"], "artifactHash": w.artifact_hash()},
    })


def test_part_stls(report, tmp_path):
    assert STLS, "the SPRUE part STLs are tracked in tools/corpus/sprue/parts"
    plate_part = {}
    for name in ("sprue_coins.3mf", "sprue_picks.3mf"):
        for o in read_plate((PLATE_DIR / name).read_bytes())[0]:
            for p in o["parts"]:
                plate_part[p["name"]] = p
    groups = {}
    for path in STLS:
        ref = plate_part[path.stem]
        v, f = read_stl(path)
        part = {"name": path.stem, "slot": ref["slot"], "verts": v, "faces": f}
        d = delta(stats(ref["verts"], ref["faces"]), stats(v, f))
        assert d["volume"] <= VOLUME_TOL and d["bbox"] <= STL_PLATE_BBOX_TOL and d["tris"] == 0, (path.name, d)
        groups.setdefault(re.sub(r"_(white|black)$", "", path.stem), []).append(part)
    objects = [{"name": n, "parts": sorted(ps, key=lambda p: p["slot"]), "positions": [(64 + 128 * i, 128, 0)]}
               for i, (n, ps) in enumerate(groups.items())]
    w = emit("sprue_parts", sha256("\n".join(p.name for p in STLS).encode()), ["#FFFFFF", "#000000"], objects)
    out = tmp_path / "sprue_parts.3mf"
    w.write(out)
    back, bs = read_plate(out.read_bytes())
    for o, bo in zip(objects, back):
        for p, bp in zip(o["parts"], bo["parts"]):
            a = stats(p["verts"], p["faces"])
            d = delta(a, stats(bp["verts"], bp["faces"]))
            report["parts"].append(part_row("parts/%s.stl" % p["name"], o["name"], p, a, d))
            assert d["volume"] <= VOLUME_TOL and d["bbox"] <= BBOX_TOL and d["tris"] == 0, (p["name"], d)
    assert len(per_filament_keys(bs)) == 127
    status, fails = validate(out, "--export")
    report["validator"].append({"artifact": out.name, "status": status, "fails": fails, "sourceFails": []})
    assert status == 0 and fails == []
