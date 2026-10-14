#!/usr/bin/env python3
"""kicad_fetch.py, discover and retrieve footprints, symbols, and 3D models
from parts libraries hosted on GitHub, without any API token.

Works entirely over git (blobless, sparse clones cached locally) plus
raw.githubusercontent.com, so it runs in restricted sandboxes where only
github.com and raw.githubusercontent.com are reachable, and everywhere else.

Registry notes (verified 2026-08):
- The KiCad official GitHub mirrors are FROZEN at 2020-10 (KiCad v5 era).
  Fine for classic packages (TO-92, headers, axial, SOIC, terminal blocks,
  common QFN/TSSOP); missing anything newer. Current official libraries
  live on GitLab (gitlab.com/kicad/libraries/...), reachable only in
  full-network environments.
- Vendor libraries on GitHub are CURRENT and include 3D models:
  espressif (ESP32 modules), sparkfun, seeed OPL, adafruit CAD (STEP/STL
  of nearly every Adafruit product, one folder per product ID).

Commands:
  kicad_fetch.py repos                      list known repos with notes
  kicad_fetch.py list <repo> [filter]       list files (recursive), optional
                                            case-insensitive substring filter
  kicad_fetch.py search <term>              filter across ALL repos
  kicad_fetch.py get <repo> <path> [dest]   fetch one file
  kicad_fetch.py pads <local.kicad_mod>     pad table from a footprint file
                                            (handles v5 "module" and v6+
                                            "footprint" formats)

The pad table is the ground truth for pin pitch and numbering; diff it
against the datasheet before trusting any fetched footprint.
"""
import os, sys, subprocess, re
try:
    from signal import signal, SIGPIPE, SIG_DFL
    signal(SIGPIPE, SIG_DFL)
except ImportError:
    pass

REPOS = {
    "kicad-footprints": ("https://github.com/KiCad/kicad-footprints.git",
        "official mirror, FROZEN 2020-10 (v5); classic packages only"),
    "kicad-packages3D": ("https://github.com/KiCad/kicad-packages3D.git",
        "official 3D mirror (.wrl + .step), FROZEN 2020-10; classic packages"),
    "kicad-symbols": ("https://github.com/KiCad/kicad-symbols.git",
        "official symbol mirror, FROZEN 2020-10, legacy .lib/.dcm format"),
    "espressif": ("https://github.com/espressif/kicad-libraries.git",
        "official Espressif KiCad libs, CURRENT; ESP32 modules, footprints, 3dmodels"),
    "sparkfun": ("https://github.com/sparkfun/SparkFun-KiCad-Libraries.git",
        "SparkFun KiCad libs, CURRENT; symbols, footprints, 3dmodels"),
    "seeed": ("https://github.com/Seeed-Studio/OPL_Kicad_Library.git",
        "Seeed OPL KiCad libs, CURRENT; XIAO and Wio modules included"),
    "adafruit-cad": ("https://github.com/adafruit/Adafruit_CAD_Parts.git",
        "Adafruit CAD, CURRENT; STEP/STL/F3D per product ID folder"),
    "digikey": ("https://github.com/Digi-Key/digikey-kicad-library.git",
        "Digi-Key KiCad lib, frozen ~2022; broad THT/SMD coverage"),
}

# BOARD_FORGE_CACHE names the clone folder; hbf points it at
# <workspace>/.hbf/cache/git (core/src/catalog-fetch.ts KICAD_CACHE_ENV).
CACHE = os.environ.get("BOARD_FORGE_CACHE") or os.path.join(os.path.expanduser("~"), ".cache", "board-forge")


def repo_dir(name):
    url, _ = REPOS[name]
    d = os.path.join(CACHE, name)
    if not os.path.isdir(os.path.join(d, ".git")):
        os.makedirs(CACHE, exist_ok=True)
        subprocess.run(["git", "clone", "--depth", "1", "--filter=blob:none",
                        "--sparse", "-q", url, d], check=True)
    return d


def listing(name, filt=None):
    d = repo_dir(name)
    out = subprocess.run(["git", "ls-tree", "-r", "--name-only", "HEAD"],
                         cwd=d, capture_output=True, text=True, check=True).stdout
    files = out.splitlines()
    if filt:
        f = filt.lower()
        files = [x for x in files if f in x.lower()]
    return files


def get(name, path, dest=None):
    d = repo_dir(name)
    dest = dest or os.path.basename(path)
    # git show on a blobless clone fetches the blob on demand from the remote
    with open(dest, "wb") as fh:
        subprocess.run(["git", "show", f"HEAD:{path}"], cwd=d, stdout=fh, check=True)
    return dest


def _sexp(txt):
    """Minimal s-expression reader: returns nested lists of str."""
    toks = re.findall(r'"(?:[^"\\]|\\.)*"|\(|\)|[^\s()]+', txt)
    def rd(i):
        out = []
        while i < len(toks):
            t = toks[i]
            if t == "(":
                sub, i = rd(i + 1)
                out.append(sub)
            elif t == ")":
                return out, i + 1
            else:
                out.append(t[1:-1] if t.startswith('"') else t)
                i += 1
        return out, i
    return rd(0)[0]


def pads(path):
    """Pad table for v5 (module ...) and v6+ (footprint ...) kicad_mod."""
    tree = _sexp(open(path, errors="replace").read())
    root = tree[0]
    kind = root[0]
    rows = []
    for node in root:
        if isinstance(node, list) and node and node[0] == "pad":
            num, ptype, shape = node[1], node[2], node[3]
            at = size = drill = layers = None
            for sub in node:
                if isinstance(sub, list):
                    if sub[0] == "at":
                        at = [float(sub[1]), float(sub[2])]
                    elif sub[0] == "size":
                        size = [float(sub[1]), float(sub[2])]
                    elif sub[0] == "drill":
                        vals = [x for x in sub[1:] if not isinstance(x, list)]
                        drill = ",".join(vals)
                    elif sub[0] == "layers":
                        layers = " ".join(x for x in sub[1:] if isinstance(x, str))
            rows.append((num, ptype, shape, at, size, drill, layers))
    print(f"{path}: format={kind}, {len(rows)} pads")
    for r in sorted(rows, key=lambda r: (len(str(r[0])), str(r[0]))):
        num, ptype, shape, at, size, drill, layers = r
        a = f"({at[0]:7.3f},{at[1]:7.3f})" if at else "?"
        s = f"{size[0]:.2f}x{size[1]:.2f}" if size else "?"
        d = f" drill {drill}" if drill else ""
        print(f"  pad {num:>4}  {ptype:9} {shape:9} at {a}  size {s}{d}  [{layers}]")
    return rows


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] == "repos":
        for k, (u, note) in REPOS.items():
            print(f"{k:18} {note}")
    elif args[0] == "list":
        for f in listing(args[1], args[2] if len(args) > 2 else None):
            print(f)
    elif args[0] == "search":
        term = args[1]
        for name in REPOS:
            try:
                hits = listing(name, term)
            except Exception as e:
                print(f"[{name}] error: {e}")
                continue
            for h in hits[:40]:
                print(f"{name}: {h}")
            if len(hits) > 40:
                print(f"{name}: ... {len(hits) - 40} more")
    elif args[0] == "get":
        dest = get(args[1], args[2], args[3] if len(args) > 3 else None)
        print(f"wrote {dest} ({os.path.getsize(dest)} bytes)")
    elif args[0] == "pads":
        pads(args[1])
    else:
        print(__doc__)
