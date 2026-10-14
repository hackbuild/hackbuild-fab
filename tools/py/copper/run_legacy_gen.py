"""Run one KEYWAY family generator from the inputs shipped in the repo (M05-T13 step 3).

Run from the repo root:

    uv run --project tools/py tools/py/copper/run_legacy_gen.py <name> [--out DIR] [--brand]

<name> is one of keyway, vernier, quadrant, spline, tessera, fret, stave.

The seven generators in reference/copper/<name>/legacy/ are copied byte
identical from the cricut-midi-seven bench (lineage in each legacy
README.md). Each reads its three IBM Plex Mono woff2 files from
`HERE + '/ibm-plex-mono-latin-*.woff2'` and the owner's mark from the
literal `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg`, neither
of which the bench folder shipped. This runner:

1. checks the sha256 of the generator, svgpath.py and every input against
   the rows of the root lineage.json and refuses on a mismatch;
2. copies svgpath.py and the three woff2 from reference/copper/_inputs/
   into a temp dir, which stands in for HERE;
3. reads the generator source, replaces the logo literal with the shipped
   reference/copper/_inputs/hackbuild-logo.svg path in memory (exactly one
   occurrence, or it refuses), sets <NAME>_OUT to the output dir and
   <NAME>_BRAND to 0 or 1, and executes it as __main__ with __file__ in
   the temp dir.

The legacy files on disk are never written: no bytecode is cached and the
temp dir is removed. stdout is the generator's own (its PASS and FAIL gate
lines, the GATES summary and the board line); the exit code is the
generator's (1 when a gate fails, before anything is written).
"""
import argparse
import hashlib
import os
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
COPPER = os.path.join(ROOT, "reference", "copper")
INPUTS = os.path.join(COPPER, "_inputs")
LOGO_LITERAL = "/mnt/skills/user/board-forge/assets/hackbuild-logo.svg"
WEIGHTS = ("400", "600", "700")

NAMES = ("keyway", "vernier", "quadrant", "spline", "tessera", "fret", "stave")
INPUT_FILES = ("hackbuild-logo.svg",) + tuple("ibm-plex-mono-latin-%s-normal.woff2" % w for w in WEIGHTS)


def pins():
    """sha256 of every file this runner reads, from the root lineage.json (D-156).

    A file is pinned by the row that names it as dest, or by a fixes line
    that opens with its path (the logo shares its bytes with the brand.mark
    canonical row, whose dest is another file).
    """
    import json
    with open(os.path.join(ROOT, "lineage.json"), encoding="utf-8") as f:
        rows = json.load(f)
    out = {}
    for r in rows:
        if r["dest"]:
            out.setdefault(r["dest"], set()).add(r["sha256"])
        for fix in r["fixes"]:
            head = fix.split(":", 1)[0]
            if head.startswith("reference/copper/"):
                out.setdefault(head, set()).add(r["sha256"])
    return out


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def legacy_dir(name):
    return os.path.join(COPPER, name, "legacy")


def check_pins(name):
    """Return the list of pin mismatches for this generator and the shared inputs."""
    pinned = pins()
    rels = ["reference/copper/%s/legacy/gen_%s.py" % (name, name), "reference/copper/%s/legacy/svgpath.py" % name]
    rels += ["reference/copper/_inputs/" + fn for fn in INPUT_FILES]
    bad = []
    for rel in rels:
        path = os.path.join(ROOT, rel)
        got = sha256(path) if os.path.exists(path) else "missing"
        want = pinned.get(rel, set())
        if len(want) != 1:
            bad.append("%s has %d sha256 pins in lineage.json, expected 1" % (rel, len(want)))
        elif got not in want:
            bad.append("%s sha256 %s, lineage.json pins %s" % (rel, got, next(iter(want))))
    return bad


def patched_source(name, logo_path):
    """The generator source with the logo literal pointed at the shipped logo."""
    with open(os.path.join(legacy_dir(name), "gen_%s.py" % name), encoding="utf-8") as f:
        src = f.read()
    quoted = "'%s'" % LOGO_LITERAL
    n = src.count(quoted)
    if n != 1:
        raise SystemExit("run_legacy_gen: gen_%s.py holds the logo literal %d times, expected 1" % (name, n))
    return src.replace(quoted, repr(logo_path))


def run(name, out, brand=False):
    """Execute the generator in this process; return its exit code."""
    bad = check_pins(name)
    if bad:
        for b in bad:
            print("run_legacy_gen: refuse: " + b, file=sys.stderr)
        return 2
    here = tempfile.mkdtemp(prefix="hbf-%s-" % name)
    try:
        shutil.copyfile(os.path.join(legacy_dir(name), "svgpath.py"), os.path.join(here, "svgpath.py"))
        for w in WEIGHTS:
            fn = "ibm-plex-mono-latin-%s-normal.woff2" % w
            shutil.copyfile(os.path.join(INPUTS, fn), os.path.join(here, fn))
        src = patched_source(name, os.path.join(INPUTS, "hackbuild-logo.svg"))
        os.environ["%s_OUT" % name.upper()] = os.path.abspath(out)
        os.environ["%s_BRAND" % name.upper()] = "1" if brand else "0"
        sys.path.insert(0, here)
        script = os.path.join(here, "gen_%s.py" % name)
        code = compile(src, script, "exec")
        try:
            exec(code, {"__name__": "__main__", "__file__": script, "__builtins__": __builtins__})
        except SystemExit as e:
            return e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
        finally:
            sys.stdout.flush()
            sys.path.remove(here)
        return 0
    finally:
        shutil.rmtree(here, ignore_errors=True)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Run one KEYWAY family generator from the shipped inputs.")
    ap.add_argument("name", choices=NAMES)
    ap.add_argument("--out", help="output dir (default: a fresh temp dir, printed on stderr)")
    ap.add_argument("--brand", action="store_true", help="set <NAME>_BRAND=1 (brand art in the copper)")
    a = ap.parse_args(argv)
    out = a.out or tempfile.mkdtemp(prefix="hbf-%s-out-" % a.name)
    if not a.out:
        print("run_legacy_gen: out %s" % out, file=sys.stderr)
    return run(a.name, out, a.brand)


if __name__ == "__main__":
    sys.exit(main())
