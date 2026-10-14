"""Writes packages/motion/test/goldens/davit-chain.json: assembly.py chain()
(designs/davit/legacy, lineage row davit.assembly) for the four presets, each
model, pipe and arm. Run from the repo root:
  uv run --project tools/py python packages/motion/scripts/davit_chain_golden.py
The TypeScript chain is compared with this file in test/davit-chain.test.ts.
Each case carries its pose in degrees, so the test reads the presets from
this file and not from the code under test."""
import hashlib, json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
LEGACY = ROOT / "designs" / "davit" / "legacy"
sys.path.insert(0, str(LEGACY))
from assembly import chain  # noqa: E402

XF = {"std": {"1in": 59.9, "125in": 64.3, "15in": 67.35}, "mini": {"1in": 48.7, "125in": 53.1, "15in": 56.15}}
PRESETS = {"HANG": (0, 0, 0, 0, 35), "REACH": (55, 25, -70, 40, 30), "LIFT": (-35, 0, -95, 0, 6), "TUCK": (100, 0, -105, 90, 3)}
TIP = np.array([-8.0, 18.0, -90.0, 1.0])
d2r = np.pi / 180

cases = []
for model in ("std", "mini"):
    for pipe, xf in XF[model].items():
        for left in (False, True):
            for name, (p, r, e, w, g) in PRESETS.items():
                pose = dict(pitch=p * d2r, roll=r * d2r, elbow=e * d2r, wrist=w * d2r, grip=g * d2r)
                links, hw = chain(xf, pose, left=left, model=model)
                cases.append(dict(
                    model=model, pipe=pipe, side="L" if left else "R", preset=name, xf=xf,
                    pose=dict(pitch=p, roll=r, elbow=e, wrist=w, grip=g),
                    tip=(links["palm"] @ TIP)[:3].tolist(),
                    links={k: v.reshape(-1).tolist() for k, v in links.items()},
                    hw=[h[1].reshape(-1).tolist() for h in hw],
                ))
out = dict(source="designs/davit/legacy/assembly.py chain()", assemblySha256=hashlib.sha256((LEGACY / "assembly.py").read_bytes()).hexdigest(),
           numpy=np.__version__, cases=cases)
path = ROOT / "packages" / "motion" / "test" / "goldens" / "davit-chain.json"
path.write_text(json.dumps(out) + "\n")
print(f"wrote {path.relative_to(ROOT)} with {len(cases)} cases")
