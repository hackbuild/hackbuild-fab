"""Dump the lane inputs and assignments of the KEYWAY family's fans (M05-T14).

Run from the repo root:

    uv run --project tools/py tools/py/copper/dump_lanes.py > packages/copper/test/fixtures/lanes-legacy.json

QUADRANT and SPLINE assign fan lanes greedily (version 1); TESSERA, FRET
and STAVE rank a partial order (version 2; STAVE with x and y swapped,
its rail down the left edge). Each generator runs whole through
run_legacy_gen.py's pinned inputs, and its globals after the run give the
arrival coordinate, the terminal coordinate, the margin, the lane list
farthest first and the lane each net took. The TypeScript lane ranker
(packages/copper/src/vinyl/lanes.ts) is held to these numbers by
packages/copper/test/lanes.test.ts. Nothing is written to the legacy
folders.
"""
import json
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run_legacy_gen as r  # noqa: E402

BOARDS = (
    ("quadrant", "v1", "x"),
    ("spline", "v1", "x"),
    ("tessera", "v2", "x"),
    ("fret", "v2", "x"),
    ("stave", "v2", "y"),
)


def globals_after_run(name, brand=False):
    bad = r.check_pins(name)
    if bad:
        raise SystemExit("dump_lanes: refuse: " + "; ".join(bad))
    here = tempfile.mkdtemp(prefix="hbf-lanes-%s-" % name)
    out = tempfile.mkdtemp(prefix="hbf-lanes-out-")
    try:
        shutil.copyfile(os.path.join(r.legacy_dir(name), "svgpath.py"), os.path.join(here, "svgpath.py"))
        for w in r.WEIGHTS:
            fn = "ibm-plex-mono-latin-%s-normal.woff2" % w
            shutil.copyfile(os.path.join(r.INPUTS, fn), os.path.join(here, fn))
        src = r.patched_source(name, os.path.join(r.INPUTS, "hackbuild-logo.svg"))
        os.environ["%s_OUT" % name.upper()] = out
        os.environ["%s_BRAND" % name.upper()] = "1" if brand else "0"
        sys.path.insert(0, here)
        script = os.path.join(here, "gen_%s.py" % name)
        g = {"__name__": "__main__", "__file__": script, "__builtins__": __builtins__}
        stdout = sys.stdout
        sys.stdout = open(os.devnull, "w")
        try:
            exec(compile(src, script, "exec"), g)
        finally:
            sys.stdout.close()
            sys.stdout = stdout
            sys.path.remove(here)
            sys.modules.pop("svgpath", None)
        return g
    finally:
        shutil.rmtree(here, ignore_errors=True)
        shutil.rmtree(out, ignore_errors=True)


def main():
    boards = []
    for name, version, rail in BOARDS:
        g = globals_after_run(name)
        term = g["TY"] if rail == "y" else g["TX"]
        order = list(g["order"])
        lanes = list(g["P"]["lanes"])
        boards.append(dict(
            name=name, version=version, rail=rail,
            margin=g["MARG"], lanes=lanes,
            nets=[dict(net=k, arrive=g["ARRIVE"][k], terminal=term[k], lane=g["LANE"][k]) for k in order],
            lanes_used=len(set(g["LANE"].values())),
        ))
    json.dump(dict(
        note="Lane inputs and assignments of the KEYWAY family fans, dumped by tools/py/copper/dump_lanes.py from the pinned generators in reference/copper/<name>/legacy/ (computed, shapely 2.1.2). Do not edit.",
        boards=boards,
    ), sys.stdout, indent=1)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
