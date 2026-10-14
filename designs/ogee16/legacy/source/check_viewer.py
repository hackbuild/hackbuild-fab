"""
Pull the kinematics out of the viewer's JS, run them in node, and compare every
number against kin.py. If the sim and the CAD ever disagree, it shows up here
rather than as a part floating in mid air.
"""
import json, os, re, subprocess
import kin
from kin import P, N, px, py

html = open(os.path.join(os.path.dirname(__file__), "..", "out", "ogee16.html")).read()
start = html.index("const DEG=Math.PI/180;")
end = html.index("// ---------------------------------------------------------------- state")
block = html[start:end]
assert "function pinState" in block and "function link3" in block

js = f"""
const P = {json.dumps({k: v for k, v in P.items() if isinstance(v, (int, float, list))})};
const N=P.N, PITCH=P.PITCH, T=P.T, C=P.C;
const px=j=>j*PITCH, py=i=>i*PITCH;
{block}
const out=[];
const S=P.STROKE;
const cases=[[[0,0,0,0],[0,0,0,0],0,0],
             [[S,0,0,0],[0,0,0,0],0,0],
             [[0,0,0,0],[S,0,0,0],0,0],
             [[S,0,0,0],[S,0,0,0],0,0],
             [[S,S,S,S],[S,S,S,S],0,0],
             [[0,0,0,0],[0,0,0,0],0,1],
             [[0,0,0,0],[0,0,0,0],P.LP_SLIDE,1],
             [[S*0.37,S,0,S*0.8],[0,S*0.55,S,S],0,0]];
for(const [zR,zC,lp,lat] of cases){{
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){{
    const rk=link3(i,j,zR,zC);
    const st=pinState(i,j,zR,zC,lp,lat);
    out.push([rk.th,rk.L,rk.ox,rk.oz,rk.cx,rk.cz,st.y,st.z,st.rise,st.cammed?1:0,
              crankPhi(zR[i]),lCrankPhi(lp)]);
  }}
}}
console.log(JSON.stringify(out));
"""
open("/tmp/_check.mjs", "w").write(js)
res = subprocess.run(["node", "/tmp/_check.mjs"], capture_output=True, text=True)
if res.returncode:
    print("NODE ERROR\n", res.stderr[-2000:]); raise SystemExit(1)
got = json.loads(res.stdout)

S = P["STROKE"]
cases = [([0,0,0,0],[0,0,0,0],0,0),
         ([S,0,0,0],[0,0,0,0],0,0),
         ([0,0,0,0],[S,0,0,0],0,0),
         ([S,0,0,0],[S,0,0,0],0,0),
         ([S]*4,[S]*4,0,0),
         ([0,0,0,0],[0,0,0,0],0,1),
         ([0,0,0,0],[0,0,0,0],P["LP_SLIDE"],1),
         ([S*0.37,S,0,S*0.8],[0,S*0.55,S,S],0,0)]
exp = []
for zR, zC, lp, lat in cases:
    for i in range(N):
        for j in range(N):
            rk = kin.rocker(i, j, zR, zC)
            st = kin.pin_state(i, j, zR, zC, lp, bool(lat))
            exp.append([rk["theta"], rk["L"], rk["origin"][0], rk["origin"][1],
                        rk["crown"][0], rk["crown"][1], st["y"], st["z"], st["rise"],
                        1 if st["cammed"] else 0, kin.crank_phi(zR[i]),
                        __import__("math").degrees(__import__("math").asin(
                            max(-1, min(1, __import__("math").sin(
                                __import__("math").radians(-P["LCRANK_SW"])) + lp / P["LCRANK_R"]))))])
names = ["theta","L","origin.x","origin.z","crown.x","crown.z","pin.y","pin.z",
         "rise","cammed","crank phi","latch phi"]
worst = [0.0] * len(names)
bad = 0
for a, b in zip(got, exp):
    for k in range(len(names)):
        d = abs(a[k] - b[k])
        worst[k] = max(worst[k], d)
        if d > 1e-6: bad += 1
print(f"{len(got)} placements compared, JS vs Python")
for n, w in zip(names, worst):
    print(f"   {n:12s} max delta {w:.3e}  {'OK' if w<1e-6 else 'MISMATCH'}")
print("MISMATCHES:", bad)
