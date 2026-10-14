"""Writes expected/fits.json from the bench's own fits.py (M01-T09).

The one writer of that golden. It imports fits.py from an unzipped
ogee16-source.zip and records each FITS row as fits.py computes it, so the
golden is independent of the TypeScript port it checks. The class id
follows D-100: the bench's PSLIDE is the profile's PSLIP, with the bench
name kept as legacyClass.

Run from the repo root:
  unzip -o -q <path>/ogee16-source.zip -d <tmp>
  uv run --project tools/py python reference/fit/ogee16-r16p/legacy/fits_golden.py <tmp>/source
"""
import json
import os
import sys

RENAMED = {"PSLIDE": "PSLIP"}


def main(source):
    sys.path.insert(0, source)
    os.chdir(source)
    import fits  # noqa: E402  the bench module, read in place

    rows = []
    for name, hole, shaft, cls in fits.FITS:
        lo, hi = fits.BAND[cls]
        drawn = hole - shaft
        rows.append({
            "name": name,
            "hole": hole,
            "shaft": shaft,
            "drawn": drawn,
            "class": RENAMED.get(cls, cls),
            "legacyClass": cls,
            "band": [lo, hi],
            "holeBand": [shaft + lo, shaft + hi],
            "real": drawn if cls in ("PSLIDE", "SNAP") else drawn - fits.LOSS,
            "verdict": "pass" if lo - 1e-9 <= drawn <= hi + 1e-9 else "fail",
        })
    out = {"model": "ogee16-fits-v1", "loss": fits.LOSS, "edgeTolerance": 1e-9, "rows": rows}
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "..", "expected", "fits.json"), "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")


if __name__ == "__main__":
    main(os.path.abspath(sys.argv[1]))
