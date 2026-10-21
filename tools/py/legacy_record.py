"""Shared harness for the M07-T01 Python record scripts.

The Python twin of tools/legacy/record.mjs: same record layout, same check
rules. A script computes a result from a legacy file, asserts the numbers
the M07 Records table states (D-153), and either writes the record
(--write) or compares the result with the committed record and exits 1 on
any difference.
"""
import hashlib, json, os, platform, subprocess, sys, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


INVENTORY = os.path.join(ROOT, "tools", "legacy", "inventory.json")
# Local path of an input read through legacy_file, to the repo path its record keys it by.
_KEYS = {}


def _private_rows():
    return {r["path"]: r for r in json.load(open(INVENTORY))["files"] if r.get("where") == "private"}


def legacy_file(rel):
    """A file under designs/<id>/legacy by its repo path: the checkout's copy
    when one is on disk, else the archive copy its tools/legacy/inventory.json
    row names (where private, R1-rails-public-11). finish() keys the input by
    rel either way, so a record written from the repo copy still checks."""
    here = os.path.join(ROOT, rel)
    if os.path.exists(here):
        path = here
    else:
        row = _private_rows().get(rel)
        if row is None or "originals" not in row:
            raise SystemExit(f"{rel}: not in this checkout and tools/legacy/inventory.json names no archive copy")
        from hbf_archives import local_source
        path = local_source(row["originals"])
        # A script that imports from the archive must leave no __pycache__ there.
        sys.dont_write_bytecode = True
    _KEYS[path] = rel
    return path


def legacy_dir(rel):
    """The folder holding the files of a legacy folder rel, found as legacy_file finds them."""
    here = os.path.join(ROOT, rel)
    if os.path.isdir(here):
        return here
    inside = sorted(p for p in _private_rows() if os.path.dirname(p) == rel)
    if not inside:
        raise SystemExit(f"{rel}: not in this checkout and tools/legacy/inventory.json holds no private row in it")
    return os.path.dirname(legacy_file(inside[0]))


def input_key(path):
    return _KEYS.get(path) or os.path.relpath(path, ROOT)


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def read_pinned(path, pinned):
    b = open(path, "rb").read()
    got = sha256_bytes(b)
    if got != pinned:
        raise SystemExit(f"{input_key(path)} sha256 {got}, pinned {pinned}")
    return b


def canonical(v):
    """Keys sorted, compact, the same text tools/legacy/record.mjs hashes for
    integers, strings, lists and objects. Floats are written by Python's repr,
    which JS may spell differently, so a record is checked by the language
    that wrote it."""
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


class Asserts:
    def __init__(self):
        self.failed = []

    def eq(self, name, got, want):
        if canonical(got) != canonical(want):
            self.failed.append(f"{name}: got {canonical(got)}, record {canonical(want)}")

    def near(self, name, got, want, tol):
        if not abs(got - want) <= tol:
            self.failed.append(f"{name}: got {got}, record {want} (tolerance {tol})")

    def ok(self, name, cond, detail=""):
        if not cond:
            self.failed.append(name + (f": {detail}" if detail else ""))


def diff(a, b, tol=1e-9, path="result", out=None):
    out = [] if out is None else out
    num = (int, float)
    if isinstance(a, num) and isinstance(b, num) and not isinstance(a, bool) and not isinstance(b, bool):
        if not abs(a - b) <= tol * max(1.0, abs(b)):
            out.append(f"{path}: {a} against record {b}")
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f"{path}: length {len(a)} against record {len(b)}")
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                diff(x, y, tol, f"{path}[{i}]", out)
    elif isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                out.append(f"{path}.{k}: missing, record has it")
            elif k not in b:
                out.append(f"{path}.{k}: not in the record")
            else:
                diff(a[k], b[k], tol, f"{path}.{k}", out)
    elif a != b:
        out.append(f"{path}: {a!r} against record {b!r}")
    return out


def machine():
    cpu = platform.processor() or platform.machine()
    if sys.platform == "darwin":
        try:
            cpu = subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True).stdout.strip() or cpu
        except OSError:
            pass
    return {"cpu": cpu, "os": f"{platform.system().lower()} {platform.release()} {platform.machine()}",
            "python": platform.python_version()}


def finish(spec, result, asserts, argv=None):
    """spec: record, out (repo relative), command, qualifier, inputs
    {absolute path: sha256}, optional tol and versions (extra pins such as
    the ezdxf version)."""
    argv = sys.argv if argv is None else argv
    write = "--write" in argv
    out = os.path.join(ROOT, spec["out"])
    problems = list(asserts.failed)
    if not write:
        if not os.path.exists(out):
            problems.append(f"{spec['out']} does not exist; run with --write once the asserts hold")
        else:
            rec = json.load(open(out))
            problems += diff(result, rec["result"], spec.get("tol", 1e-9))
            if rec.get("resultSha256") != sha256_bytes(canonical(rec["result"]).encode()):
                problems.append(f"{spec['out']} resultSha256 does not match its result")
            for path, pin in spec["inputs"].items():
                key = input_key(path)
                if rec.get("inputs", {}).get(key) != pin:
                    problems.append(f"input {key}: pinned {pin}, record {rec.get('inputs', {}).get(key)}")
            for k, v in spec.get("versions", {}).items():
                if rec.get("versions", {}).get(k) != v:
                    problems.append(f"{k} {v}, record {rec.get('versions', {}).get(k)}")
    if problems:
        for p in problems:
            sys.stderr.write(f"FAIL {p}\n")
        raise SystemExit(1)
    if write:
        rec = {
            "record": spec["record"],
            "card": spec.get("card", "M07-T01"),
            "date": datetime.date.today().isoformat(),
            "qualifier": spec["qualifier"],
            "command": spec["command"],
            "machine": machine(),
            "versions": spec.get("versions", {}),
            "inputs": {input_key(p): s for p, s in spec["inputs"].items()},
            "resultSha256": sha256_bytes(canonical(result).encode()),
            "result": result,
        }
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w") as f:
            f.write(json.dumps(rec, indent=1, ensure_ascii=False) + "\n")
        print(f"wrote {spec['out']}")
