"""Records the COFFER original's numbers, gate verdicts and outline point sets
(M06-T09 step 2, the originals rule) into test/legacy/coffer.json.

    uv run --project tools/py packages/archetypes/scripts/coffer-legacy.py

The original is imported in place from originals/coffer/files (hexcore.py
and gen_coffer.py, never edited) the way its drive harness
originals/coffer/drive/run_gates.py imports it: as a module, so the
misplaced __main__ block (coffer record 1.2) is skipped and usability() is
defined before gates() runs. gen_coffer reads hackbuild-logo.svg from the
working folder at import, so the script works from the files folder and
writes nothing there. Only build() and gates() run; emit() writes layer
files and is not called.
"""
import hashlib, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'test', 'legacy', 'coffer.json')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'tools', 'py'))
from hbf_archives import local_source  # noqa: E402

ORIG = local_source('fab-knowledge:originals/coffer/files')
COMMAND = 'uv run --project tools/py packages/archetypes/scripts/coffer-legacy.py'

# Importing the original in place must leave its folder as SHA256SUMS lists
# it, so no __pycache__ is written beside it.
sys.dont_write_bytecode = True
os.chdir(ORIG)
sys.path.insert(0, ORIG)
import shapely
import hexcore as H
import gen_coffer as G


def sha(name):
    return hashlib.sha256(open(os.path.join(ORIG, name), 'rb').read()).hexdigest()


def rings(g):
    """Every ring of a polygon or multipolygon, exterior first, closing vertex dropped."""
    out = []
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        out.append([list(c) for c in p.exterior.coords[:-1]])
        for h in p.interiors:
            out.append([list(c) for c in h.coords[:-1]])
    return out


def polys(g):
    return [{'area': p.area, 'rings': rings(p)} for p in (g.geoms if hasattr(g, 'geoms') else [g])]


P = dict(H.P)
P['tab_u'] = list(P['tab_u'])
P['pad_u'] = list(P['pad_u'])

outline = H.hexagon(r=P['corner_r'])
b = outline.bounds
edges = []
for e in range(6):
    pads = H.port_pads(e, ['p%d' % i for i in range(6)])
    edges.append({
        'e': e,
        'normalDeg': 30 + 60 * e,
        'pads': [{'u': pads['p%d' % i]['u'], 'xy': list(pads['p%d' % i]['xy']), 'rings': rings(pads['p%d' % i]['poly'])} for i in range(6)],
        'tabs': [{'u': u, 'rings': rings(t)} for u, t in zip(P['tab_u'], H.gnd_tabs(e))],
        'tabsSkipCentre': len(H.gnd_tabs(e, skip_centre=True)),
    })

tiles = {}
for k in G.TILES:
    t = G.build(k)
    g = G.gates(t)
    tiles[k] = {
        'name': t['name'],
        'gates': [{'ok': ok, 'label': lab, 'detail': det} for ok, lab, det in g.rows],
        'fail': g.fail,
        'usability': [{'net': n, 'area': a, 'inscribed': w} for n, a, w in t.get('usability', [])],
        'portOrder': [nm for nm, _ in sorted(t['pads'].items(), key=lambda kv: kv[1]['u'])],
        'netAreas': {nm: geo.area for nm, geo in sorted(t['nets'].items())},
        'blurb': t.get('blurb', ''),
        'sense': t.get('sense', {}),
    }

# D1's band law (gen_coffer.py lines 172 to 185): cum(a, k) and the raw band
# polygons before the buffer(-0.3).buffer(0.3) smoothing, at the generator's
# own 300 steps.
C, r_in, m, gap, W, a0, a1 = (0.0, 5.6), 9.0, 0.35, 1.05, 21.5, -62.5, 242.5
def cum(a, k):
    return sum((1.0 + m * math.cos(math.radians(a - 90 * j))) / 4.0 for j in range(k))
bands = []
for k in range(4):
    b0 = lambda a, k=k: r_in + W * cum(a, k) + (gap / 2 if k else 0)
    b1 = lambda a, k=k: r_in + W * cum(a, k + 1) - (gap / 2 if k < 3 else 0)
    raw = H.polar_band(C[0], C[1], a0, a1, b0, b1, 300)
    bands.append({'net': 'D%d' % (k + 1), 'raw': rings(raw), 'rawArea': raw.area, 'rStart': [b0(a0), b1(a0)]})

# The band widths the generator's own cum() gives at the angle the viewer's
# sense shot touches (coffer record 3, shots/c05: 131.2 deg).
widths = {'a': 131.2, 'w': [W * (cum(131.2, k + 1) - cum(131.2, k)) for k in range(4)]}

# K6 keys (gen_coffer.py lines 42 to 52): the six hexlets before union.
s, gk, cy = 10.7, 4.4, 5.6
d = math.sqrt(3) * s + gk
keys = []
for ang in (0, 60, 120, 180, 240, 300):
    cx, cyy = d * math.cos(math.radians(ang)), cy + d * math.sin(math.radians(ang))
    h = H.hexlet(cx, cyy, s, 1.2, flat=False)
    keys.append({'net': 'K%d' % (ang // 60 + 1), 'c': [cx, cyy], 'area': h.area, 'rings': rings(h)})

rec = {
    'command': COMMAND,
    'shapely': shapely.__version__,
    'python': sys.version.split()[0],
    'sources': {'coffer': {'hexcore.py': sha('hexcore.py'), 'gen_coffer.py': sha('gen_coffer.py')}},
    'P': P,
    'portEdge': H.PORT_EDGE,
    'apothem': H.apo(),
    'outline': {'width': b[2] - b[0], 'height': b[3] - b[1], 'area': outline.area, 'rings': rings(outline),
                'tapeGate': (b[3] - b[1]) <= P['tape_w'] - 4.0},
    'seam': {'pad': 2 * (P['pad_v'] - P['pad_h'] / 2), 'tab': 2 * P['tab_v']},
    'neighbourOffset': [list(H.neighbour_offset(e)) for e in range(6)],
    'edges': edges,
    'ring': {'port': polys(H.gnd_ring((H.PORT_EDGE,))), 'm1': polys(H.gnd_ring((2, 5)))},
    'tiles': tiles,
    'd1Bands': bands,
    'd1Widths': widths,
    'k6Keys': keys,
}
json.dump(rec, open(OUT, 'w'), indent=1, sort_keys=True)
print('wrote', os.path.relpath(OUT, os.getcwd()), sum(len(t['gates']) for t in tiles.values()), 'gates',
      sum(t['fail'] for t in tiles.values()), 'fail')
