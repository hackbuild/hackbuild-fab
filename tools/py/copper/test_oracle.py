"""KEYWAY family oracle (M05-T13 step 5): the seven generators rerun from the repo alone.

Run from the repo root:

    uv run --project tools/py tools/py/copper/test_oracle.py

or collect it with pytest. Each generator runs through run_legacy_gen.py in
its own process, into a temp dir. The oracle then holds the run to three
independent sources:

- EXPECTED below, the M05-T13 acceptance table (computed 2026-10-04 by the
  rerun of the shipped generators, Python 3.14.6, shapely 2.1.2, recorded
  in fab-knowledge/originals/<name>/files/rerun/run-2026-10-04.txt): gates
  passed and failed, min clearance, tightest pair and the clearance gate,
  all read from the run's own PASS and FAIL lines;
- the gate list of that rerun, committed as
  reference/copper/<name>/legacy/run-2026-10-04.txt: the same gates in the
  same order with the same verdicts, with numbers masked, since a GEOS
  build may move a printed figure in its last digit;
- the shipped reference/copper/<name>/legacy/<name>_geometry.json: params
  and stats equal exactly. Path strings are not compared (the rerun found
  vertex differences under 0.1 mm from a different GEOS build).

It also confirms that the legacy folders hold the same files with the same
bytes after the run as before it.
"""
import concurrent.futures
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
COPPER = os.path.join(ROOT, "reference", "copper")
RUNNER = os.path.join(HERE, "run_legacy_gen.py")

# name: (gates passed, failed, min clearance mm, tightest pair, gate mm)
EXPECTED = {
    "keyway": (45, 0, "1.000", "P3/SA", "0.70"),
    "vernier": (60, 0, "1.200", "B5/B6", "0.90"),
    "quadrant": (59, 0, "1.203", "B3/B4", "0.90"),
    "spline": (85, 0, "1.000", "L1_A/L1_B", "0.90"),
    "tessera": (85, 0, "1.100", "T1/T2", "0.90"),
    "fret": (95, 0, "1.000", "K10/K15", "0.90"),
    "stave": (57, 0, "1.200", "D1/L1_A", "0.90"),
}
RERUN = "run-2026-10-04.txt"
CLEARANCE = re.compile(r"^(PASS|FAIL) min clearance (\d+\.\d{3}) mm at (\S+) \(gate (\d+\.\d{2})\)$")
SUMMARY = re.compile(r"^GATES (\d+) passed (\d+) failed$")
NUMBER = re.compile(r"\d+(?:\.\d+)?")


def gate_lines(text):
    return [ln for ln in text.splitlines() if ln.startswith(("PASS ", "FAIL "))]


def masked(lines):
    return [NUMBER.sub("#", ln) for ln in lines]


def legacy_state(name):
    d = os.path.join(COPPER, name, "legacy")
    out = {}
    for fn in sorted(os.listdir(d)):
        with open(os.path.join(d, fn), "rb") as f:
            out[fn] = hashlib.sha256(f.read()).hexdigest()
    return out


def run_one(name):
    out = tempfile.mkdtemp(prefix="hbf-oracle-%s-" % name)
    p = subprocess.run([sys.executable, RUNNER, name, "--out", out],
                       capture_output=True, text=True, cwd=ROOT, timeout=600)
    return out, p


def check(name, out, proc):
    """Return (row, problems) for one generator run."""
    problems = []
    if proc.returncode != 0:
        problems.append("exit %d: %s" % (proc.returncode, proc.stderr.strip()[-400:]))
    lines = gate_lines(proc.stdout)
    passed = sum(1 for ln in lines if ln.startswith("PASS "))
    failed = sum(1 for ln in lines if ln.startswith("FAIL "))
    clr = [m.groups() for m in map(CLEARANCE.match, lines) if m]
    summary = [m.groups() for m in map(SUMMARY.match, proc.stdout.splitlines()) if m]
    row = (passed, failed) + (clr[0][1:] if len(clr) == 1 else ("?", "?", "?"))

    want = EXPECTED[name]
    if row != want:
        problems.append("gates %r, expected %r" % (row, want))
    if len(clr) != 1:
        problems.append("%d min clearance lines, expected 1" % len(clr))
    elif clr[0][0] != "PASS":
        problems.append("min clearance gate %s" % clr[0][0])
    if summary != [(str(passed), str(failed))]:
        problems.append("GATES summary %r does not match the %d PASS and %d FAIL lines" % (summary, passed, failed))

    with open(os.path.join(COPPER, name, "legacy", RERUN), encoding="utf-8") as f:
        rerun = gate_lines(f.read())
    if masked(lines) != masked(rerun):
        diff = [(a, b) for a, b in zip(masked(lines), masked(rerun)) if a != b][:3]
        problems.append("gate list differs from %s (%d against %d lines; first differences %r)"
                        % (RERUN, len(lines), len(rerun), diff))

    geo = "%s_geometry.json" % name
    with open(os.path.join(COPPER, name, "legacy", geo), encoding="utf-8") as f:
        shipped = json.load(f)
    path = os.path.join(out, geo)
    if not os.path.exists(path):
        problems.append("%s not written" % geo)
    else:
        with open(path, encoding="utf-8") as f:
            got = json.load(f)
        for key in ("params", "stats"):
            if got.get(key) != shipped.get(key):
                keys = sorted(k for k in set(got.get(key, {})) | set(shipped.get(key, {}))
                              if got.get(key, {}).get(k) != shipped.get(key, {}).get(k))
                problems.append("%s %s differ from the shipped file at %s" % (geo, key, keys))
    return row, problems


def run_all():
    before = {n: legacy_state(n) for n in EXPECTED}
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(EXPECTED)) as ex:
        runs = dict(zip(EXPECTED, ex.map(run_one, EXPECTED)))
    try:
        results = {n: check(n, *runs[n]) for n in EXPECTED}
    finally:
        for out, _ in runs.values():
            shutil.rmtree(out, ignore_errors=True)
    for n in EXPECTED:
        if legacy_state(n) != before[n]:
            results[n][1].append("reference/copper/%s/legacy changed during the run" % n)
    return results


def readme_problems(folder):
    """Each file in a vendored folder is a README row whose sha256 is the file's."""
    d = os.path.join(COPPER, folder)
    with open(os.path.join(d, "README.md"), encoding="utf-8") as f:
        rows = [ln for ln in f.read().splitlines() if ln.startswith("| `")]
    listed = {}
    for ln in rows:
        cells = [c.strip() for c in ln.strip("|").split("|")]
        listed[cells[0].strip("`")] = cells[2]
    problems = []
    for fn in sorted(os.listdir(d)):
        if fn == "README.md":
            continue
        with open(os.path.join(d, fn), "rb") as f:
            got = hashlib.sha256(f.read()).hexdigest()
        if listed.get(fn) != got:
            problems.append("%s/README.md lists %s as %s, file is %s" % (folder, fn, listed.get(fn), got))
    for fn in sorted(set(listed) - set(os.listdir(d))):
        problems.append("%s/README.md lists %s, which is not in the folder" % (folder, fn))
    return problems


def test_readme_sha256():
    problems = readme_problems("_inputs")
    for n in EXPECTED:
        problems += readme_problems(n + "/legacy")
    assert problems == []


_RESULTS = None


def _results():
    global _RESULTS
    if _RESULTS is None:
        _RESULTS = run_all()
    return _RESULTS


def test_keyway():
    assert _results()["keyway"][1] == []


def test_vernier():
    assert _results()["vernier"][1] == []


def test_quadrant():
    assert _results()["quadrant"][1] == []


def test_spline():
    assert _results()["spline"][1] == []


def test_tessera():
    assert _results()["tessera"][1] == []


def test_fret():
    assert _results()["fret"][1] == []


def test_stave():
    assert _results()["stave"][1] == []


def main():
    results = _results()
    print("board     passed failed  min clr  tightest pair  gate  params+stats")
    bad = 0
    for n, (row, problems) in results.items():
        geo_ok = not any("_geometry.json" in p for p in problems)
        print("%-9s %6s %6s  %7s  %-13s  %4s  %s" % ((n.upper(),) + tuple(str(x) for x in row)
                                                    + ("equal" if geo_ok else "DIFFER",)))
        for p in problems:
            print("  fail %s: %s" % (n, p))
        bad += bool(problems)
    print("oracle: %d of %d generators reproduce" % (len(results) - bad, len(results)))
    readmes = readme_problems("_inputs") + [p for n in EXPECTED for p in readme_problems(n + "/legacy")]
    for p in readmes:
        print("  fail readme: " + p)
    print("readme sha256: %s" % ("fail" if readmes else "every vendored file listed with its sha256"))
    return 1 if bad or readmes else 0


if __name__ == "__main__":
    sys.exit(main())
