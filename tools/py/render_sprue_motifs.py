"""Render SPRUE's built-in motifs to PNG for the M03-T11 vtracer corpus.

Imports motif_snare (sprue.py line 278) and motif_bolt (sprue.py line 312)
from the SPRUE generator itself, after checking its sha256 against the one
the M03 card records, so the shapes are the generator's own and never a copy.
Each motif is drawn black on white with the long side of its bounds at 640 px
less a 32 px margin per side, sampled at pixel centres with the even-odd rule
over every ring. Writes 8-bit RGB PNGs with the standard library only.

Usage: uv run --project tools/py tools/py/render_sprue_motifs.py OUT_DIR
"""

import hashlib
import importlib.util
import struct
import sys
import zlib
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hbf_archives import local_source  # noqa: E402

SPRUE_PY = Path(local_source("fab-work-directory:benches/sprue/outputs/sprue/sprue.py"))
SPRUE_SHA256 = "1c2f22a66394abff83774c9dbcac2c0c5766959cbc22564c362530b7b8c5da4b"
LONG_SIDE_PX = 640
MARGIN_PX = 32


def load_sprue():
    digest = hashlib.sha256(SPRUE_PY.read_bytes()).hexdigest()
    if digest != SPRUE_SHA256:
        raise SystemExit(f"{SPRUE_PY}: sha256 {digest}, card records {SPRUE_SHA256}")
    spec = importlib.util.spec_from_file_location("sprue_bench", SPRUE_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def rings_of(geom):
    polys = list(geom.geoms) if hasattr(geom, "geoms") else [geom]
    out = []
    for p in polys:
        if p.is_empty:
            continue
        out.append(np.asarray(p.exterior.coords))
        out.extend(np.asarray(r.coords) for r in p.interiors)
    return out


def rasterise(geom):
    x0, y0, x1, y1 = geom.bounds
    k = (LONG_SIDE_PX - 2 * MARGIN_PX) / max(x1 - x0, y1 - y0)
    w = int(round((x1 - x0) * k)) + 2 * MARGIN_PX
    h = int(round((y1 - y0) * k)) + 2 * MARGIN_PX
    edges = []
    for ring in rings_of(geom):
        # model y up, image row 0 at the top
        px = (ring[:, 0] - x0) * k + MARGIN_PX
        py = (y1 - ring[:, 1]) * k + MARGIN_PX
        edges.append(np.stack([px[:-1], py[:-1], px[1:], py[1:]], axis=1))
    e = np.concatenate(edges)
    ink = np.zeros((h, w), dtype=bool)
    xs = np.arange(w) + 0.5
    for row in range(h):
        yc = row + 0.5
        ya, yb = e[:, 1], e[:, 3]
        hit = (ya <= yc) != (yb <= yc)
        if not hit.any():
            continue
        s = e[hit]
        xc = s[:, 0] + (yc - s[:, 1]) * (s[:, 2] - s[:, 0]) / (s[:, 3] - s[:, 1])
        crossings = (xc[None, :] < xs[:, None]).sum(axis=1)
        ink[row] = (crossings & 1) == 1
    return ink


def write_png(path, ink):
    h, w = ink.shape
    rgb = np.where(ink[:, :, None], np.uint8(0), np.uint8(255)).repeat(3, axis=2).astype(np.uint8)
    raw = b"".join(b"\x00" + rgb[r].tobytes() for r in range(h))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    Path(path).write_bytes(png)


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: render_sprue_motifs.py OUT_DIR")
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    sprue = load_sprue()
    for name, fn in (("08-sprue-snare.png", sprue.motif_snare), ("09-sprue-bolt.png", sprue.motif_bolt)):
        ink = rasterise(fn())
        write_png(out / name, ink)
        print(f"{name} {ink.shape[1]} x {ink.shape[0]} px, {int(ink.sum())} ink px (computed)")


if __name__ == "__main__":
    main()
