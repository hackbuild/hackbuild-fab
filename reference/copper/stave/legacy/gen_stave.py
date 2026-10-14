#!/usr/bin/env python3
"""
STAVE rev A generator  -  hack.build

A one-panel scale strip sized for a 4 inch copper tape roll: 96 mm wide, so it
cuts from a single pass of 101.6 mm tape with margin either side. Copper, vinyl
and printed sticker paper. No Velostat, no components, 12 channels, one MPR121.

  - 8 keys cut out of ONE slab by chevron seams, so they interlock and the stack
    reads as a single object rather than eight separate pads. Each key is about
    52 x 17 mm, which is a bigger target than anything in the family so far.
  - 8 keys is one octave of any scale. The board is not tied to a key or a mode:
    the faceplate is marked with scale DEGREES, and which pitches those degrees
    mean is a table in firmware. Change the table, change the scale.
  - 2 long straight sliders, 84 mm each, across the ends where there is width
    to spare.
  - 12 contacts in a single row down the LEFT EDGE. On a strip this narrow the
    long edge is the only edge a 12-finger row fits on.

Routing is the simplest in the family because the layout earns it: the keys are
one column, so every key taps straight out of its own left edge into a vertical
lane band and turns once. Nothing weaves.
"""
import json, math, os, sys
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import translate, scale as aff_scale
import svgpath

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('STAVE_OUT', HERE + '/out')
FONT_B = HERE + '/ibm-plex-mono-latin-700-normal.woff2'
FONT_R = HERE + '/ibm-plex-mono-latin-400-normal.woff2'
FONT_S = HERE + '/ibm-plex-mono-latin-600-normal.woff2'
LOGO = '/mnt/skills/user/board-forge/assets/hackbuild-logo.svg'
BRAND_COPPER = os.environ.get('STAVE_BRAND', '0') != '0'

P = dict(
    name='STAVE', rev='A',
    W=96.0, H=250.0, R=3.2, edge_keep=1.0, clr=0.90, tw=1.6,
    tape_w=101.6,
    # rail: one row of fingers down the left edge, pointing right
    rail_n=12, rail_h=9.0, rail_pitch=12.0, rail_x0=2.5,
    rail_deep=14.0, rail_shallow=9.0, rail_r=1.2,
    # lane band: vertical lanes, farthest from the rail first
    lanes=tuple(35.0 - 2.8 * i for i in range(6)),
    # the key slab, sliced by chevron seams
    keys=8, key_box=(40.0, 50.0, 92.0, 200.0), seam=1.6, chev=5.0, key_round=2.2,
    # two long straight sliders across the ends
    lin=((40.0, 8.0, 90.0, 36.0), (40.0, 214.0, 90.0, 242.0)),
    lin_hmin=3.0, lin_gap=1.4, lin_off=6.0, lin_outer=(4.0, 246.0),
    vinyl_out=1.4, vinyl_rail_clr=2.5, accent_inset=2.4,
    mark_size=11.0, mark_x=41.0, mark_y=201.5, wm_cap=4.4, wm_x=54.0,
)
NETS = tuple('D%d' % i for i in range(1, 9)) + ('L1_A', 'L1_B', 'L2_A', 'L2_B')
LABEL = {'D%d' % i: 'DEG %d' % i for i in range(1, 9)}
LABEL.update(L1_A='SL1 A', L1_B='SL1 B', L2_A='SL2 A', L2_B='SL2 B')
KX0, KY0, KX1, KY1 = P['key_box']

def rr(x0, y0, x1, y1, r):
    r = min(r, (x1 - x0) / 2 - .001, (y1 - y0) / 2 - .001)
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, join_style=1, resolution=16)

def wire(pts, w=None):
    return LineString(pts).buffer((w or P['tw']) / 2.0, cap_style=2, join_style=1, resolution=16)

def smooth(g, d=0.25):
    return g.buffer(d, join_style=1, resolution=16).buffer(-d, join_style=1, resolution=16)

def outer_only(g):
    gs = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    return unary_union([Polygon(p.exterior) for p in gs])

OUTLINE = rr(0, 0, P['W'], P['H'], P['R'])
INNER = OUTLINE.buffer(-P['edge_keep'])
RIM = OUTLINE.difference(OUTLINE.buffer(-0.15))

nets = {k: [] for k in NETS}
art, PADS, SLD, TERM, ARRIVE, ESC = [], {}, {}, {}, {}, {}
def add(n, g): nets[n].append(g)

# ------------------------------------------------- the slab, sliced into keys
pitch = (KY1 - KY0) / P['keys']
xm = (KX0 + KX1) / 2
def seam(k, n=25):
    """One chevron slice across the slab. Every seam is the same shape, so the keys
    nest and the whole stack still reads as one slab."""
    pts = []
    for i in range(n + 1):
        x = KX0 + (KX1 - KX0) * i / n
        off = -P['chev'] + 2 * P['chev'] * abs(x - xm) / ((KX1 - KX0) / 2)
        pts.append((x, KY0 + k * pitch + off))
    return pts
for k in range(P['keys']):
    lo, hi = seam(k), seam(k + 1)
    g = Polygon(lo + hi[::-1]).buffer(-P['seam'] / 2, join_style=1, resolution=16)
    g = g.buffer(-P['key_round'], join_style=1, resolution=16).buffer(
        P['key_round'], join_style=1, resolution=16)
    net = 'D%d' % (k + 1)
    add(net, g)
    cy = KY0 + (k + 0.5) * pitch
    PADS[net] = dict(deg=k + 1, cy=cy, area=round(g.area, 1))
    ESC[net] = [(KX0 + 2.0, cy)]
    ARRIVE[net] = cy

# ------------------------------------------------- two long sliders at the ends
for i, (lx0, ly0, lx1, ly1) in enumerate(P['lin']):
    tag = 'L%d' % (i + 1)
    hsum = (ly1 - ly0) - P['lin_gap']
    hmax = hsum - P['lin_hmin']
    gA = Polygon([(lx0, ly0), (lx1 - P['lin_off'], ly0),
                  (lx1 - P['lin_off'], ly0 + P['lin_hmin']), (lx0, ly0 + hmax)])
    gB = Polygon([(lx1, ly1), (lx0 + P['lin_off'], ly1),
                  (lx0 + P['lin_off'], ly1 - P['lin_hmin']), (lx1, ly1 - hmax)])
    add(tag + '_A', gA); add(tag + '_B', gB)
    SLD[tag] = dict(kind='linear', x=[lx0, lx1], y=[ly0, ly1], travel=round(lx1 - lx0, 1))
    # A is thick at the left end, B at the right end; each escapes from its own end
    ESC[tag + '_A'] = [(lx0 + 1.6, ly0 + hmax / 2)]
    ARRIVE[tag + '_A'] = ly0 + hmax / 2
    xb = lx1 - 3.0            # must be right of A's end (lx1 - lin_off), not left of it
    yo = P['lin_outer'][i]
    ESC[tag + '_B'] = [(lx1 - 1.6, ly1 - hmax / 2), (xb, ly1 - hmax / 2), (xb, yo)]
    ARRIVE[tag + '_B'] = yo

# ------------------------------------------------- rail down the left edge
order = sorted(NETS, key=lambda k: ARRIVE[k])
y0 = P['H'] / 2 - (P['rail_n'] - 1) * P['rail_pitch'] / 2.0
TY = {k: y0 + i * P['rail_pitch'] for i, k in enumerate(order)}
SPAN = {k: (min(TY[k], ARRIVE[k]), max(TY[k], ARRIVE[k])) for k in order}
MARG = P['tw'] + P['clr']
def inside(lo, hi, y): return lo - MARG <= y <= hi + MARG
# Same partial order as the other boards, with x and y swapped: the sensor-side run
# arrives from the RIGHT so it crosses lanes further right than its own, and the
# finger-side run leaves to the LEFT so it crosses lanes further left.
farther = {k: set() for k in order}
for p in order:
    for q in order:
        if p == q: continue
        lo, hi = SPAN[q]
        if inside(lo, hi, ARRIVE[p]): farther[p].add(q)
        if inside(lo, hi, TY[p]): farther[q].add(p)
rank = {k: 0 for k in order}
for _ in range(len(order) + 2):
    ch = False
    for p in order:
        want = max([rank[q] + 1 for q in farther[p]] or [0])
        if want > rank[p]: rank[p] = want; ch = True
    if not ch: break
else:
    raise SystemExit('lane constraints contain a cycle')
need = max(rank.values()) + 1
if need > len(P['lanes']):
    raise SystemExit('need %d lanes, have %d' % (need, len(P['lanes'])))
LANE = {k: P['lanes'][need - 1 - rank[k]] for k in order}
for i, net in enumerate(order):
    cy = TY[net]
    deep = i % 2 == 0
    d = P['rail_deep'] if deep else P['rail_shallow']
    add(net, wire(ESC[net] + [(LANE[net], ARRIVE[net]), (LANE[net], cy),
                              (P['rail_x0'] + d - 1.0, cy)]))
    add(net, rr(P['rail_x0'], cy - P['rail_h'] / 2, P['rail_x0'] + d,
                cy + P['rail_h'] / 2, P['rail_r']))
    TERM[net] = dict(cy=cy, x=P['rail_x0'], d=d, deep=deep, net=net, idx=i, label=LABEL[net])

# ------------------------------------------------- brand
lp = __import__('re').findall(r'<path transform="translate\((-?[\d.]+),(-?[\d.]+)\)"[^>]*d="([^"]+)"',
                              open(LOGO).read())
mk = [svgpath.path_geom(d, 1.0, float(tx), float(ty)) for tx, ty, d in lp]
mb = unary_union(mk).bounds
ms = P['mark_size'] / max(mb[2] - mb[0], mb[3] - mb[1])
MARK = [translate(aff_scale(translate(g, -mb[0], -mb[1]), ms, -ms, origin=(0, 0)),
                  P['mark_x'], P['mark_y'] + P['mark_size']) for g in mk]
wm1, _ = svgpath.text_geom('hack', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 6.2)
wm2, _ = svgpath.text_geom('.build', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 0.4)
BRAND_K = unary_union([MARK[0], wm1]); BRAND_PK = unary_union([MARK[1], wm2])
if BRAND_COPPER: art += MARK + [wm1, wm2]
ART = unary_union(art) if art else Polygon()

NET = {k: smooth(unary_union(v)) for k, v in nets.items()}
COPPER = unary_union(list(NET.values()) + ([ART] if not ART.is_empty else []))

# ------------------------------------------------- overlays
ELEC = {}
for k in range(P['keys']):
    lo, hi = seam(k), seam(k + 1)
    ELEC['D%d' % (k + 1)] = Polygon(lo + hi[::-1]).buffer(-P['seam'] / 2, join_style=1)
RAIL = unary_union([box(t['x'] - 1.0, t['cy'] - P['rail_h'] / 2 - 1.0,
                        t['x'] + t['d'] + 1.0, t['cy'] + P['rail_h'] / 2 + 1.0)
                    for t in TERM.values()])
RAILZONE = box(0, RAIL.bounds[1], RAIL.bounds[2] + P['vinyl_rail_clr'], RAIL.bounds[3])
VINYL = outer_only(smooth(OUTLINE.buffer(-2.0).difference(RAILZONE), 0.8))
FACE = VINYL
LINFACE = [box(x[0] + 0.6, x[1] + 0.6, x[2] - 0.6, x[3] - 0.6) for x in P['lin']]
ACCENT = [g.buffer(-P['accent_inset'], join_style=1, resolution=16) for g in ELEC.values()]
ACCENT = [g for g in ACCENT if not g.is_empty] + LINFACE

# ============================================================== GATES
fails, notes = [], []
def gate(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)

gate(P['W'] <= P['tape_w'] - 4.0,
     'board %.0f mm wide fits %.1f mm tape with %.1f mm each side'
     % (P['W'], P['tape_w'], (P['tape_w'] - P['W']) / 2))
for k in NETS:
    n = 1 if NET[k].geom_type == 'Polygon' else len(NET[k].geoms)
    gate(n == 1, 'net %-5s single island (%d)' % (k, n))
worst = (99, '')
GG = dict(NET)
if not ART.is_empty: GG['ART'] = ART
ks = list(GG)
for i in range(len(ks)):
    for j in range(i + 1, len(ks)):
        d = GG[ks[i]].distance(GG[ks[j]])
        if d < worst[0]: worst = (d, ks[i] + '/' + ks[j])
gate(worst[0] >= P['clr'], 'min clearance %.3f mm at %s (gate %.2f)' % (worst[0], worst[1], P['clr']))
gate(INNER.contains(COPPER), 'all copper >= %.1f mm from the shared outline' % P['edge_keep'])
for k in NETS:
    gate(not NET[k].buffer(-0.55).is_empty, 'net %-5s survives the 1.10 mm erode test' % k)
ka = [g.area for g in ELEC.values()]
gate(min(ka) > 600, 'key plate %.0f mm2, %.0f x %.0f mm' % (min(ka), KX1 - KX0, pitch - P['seam']))
gate(max(ka) - min(ka) < 5, 'all 8 keys the same size within %.1f mm2' % (max(ka) - min(ka)))
gate(len(ELEC) == 8, '8 keys, one octave of any scale')
kk = sorted(ELEC.items(), key=lambda t: t[1].centroid.y)
gate(min(kk[i][1].distance(kk[i + 1][1]) for i in range(len(kk) - 1)) >= P['clr'],
     'chevron seams hold %.2f mm between keys'
     % min(kk[i][1].distance(kk[i + 1][1]) for i in range(len(kk) - 1)))

for tag in ('L1', 'L2'):
    lx0, lx1 = SLD[tag]['x']; sy0, sy1 = SLD[tag]['y']
    ra = []
    o0, o1 = lx0 + P['lin_off'] + 1.0, lx1 - P['lin_off'] - 1.0
    for i in range(41):
        x = o0 + i * (o1 - o0) / 40.0
        sl = box(x - 0.35, sy0 - 1, x + 0.35, sy1 + 1)
        a, b = NET[tag + '_A'].intersection(sl).area, NET[tag + '_B'].intersection(sl).area
        ra.append(a / (a + b) if a + b > 0 else 0)
    gate(all(ra[i] > ra[i + 1] - 1e-6 for i in range(len(ra) - 1)),
         'slider %s ratio monotone left to right' % tag)
    gate(0.10 < min(ra) and max(ra) < 0.90,
         'slider %s span %.3f to %.3f, off both rails' % (tag, max(ra), min(ra)))
    SLD[tag]['span'] = [round(max(ra), 3), round(min(ra), 3)]
gate(min(SLD[t]['travel'] for t in ('L1', 'L2')) >= 45,
     'sliders %.0f mm of travel each' % SLD['L1']['travel'])

ts = sorted(TERM.values(), key=lambda t: t['cy'])
gate(len(TERM) == 12, 'exactly 12 channels, one MPR121 or 12 ESP32-S3 touch pins')
gate(min(ts[i + 1]['cy'] - ts[i]['cy'] for i in range(len(ts) - 1)) >= 11.5,
     'rail is ONE row on %.1f mm pitch down the left edge' % P['rail_pitch'])
gate(P['rail_pitch'] - P['rail_h'] >= 2.5, 'rail finger gap %.1f mm' % (P['rail_pitch'] - P['rail_h']))
gate(all(t['deep'] != ts[i + 1]['deep'] for i, t in enumerate(ts[:-1])),
     'finger depth alternates %.0f / %.0f mm' % (P['rail_deep'], P['rail_shallow']))
gate(all(abs(TERM[k]['cy'] - y0 - i * P['rail_pitch']) < 1e-9 for i, k in enumerate(order)),
     'rail order follows arrival order (monotone fan)')
gate(need <= len(P['lanes']), 'fan needs %d lanes, %d available' % (need, len(P['lanes'])))
gate(RAIL.bounds[2] + P['vinyl_rail_clr'] < KX0 - 1.0,
     'the wiring zone ends %.1f mm before the keys start' % (KX0 - RAIL.bounds[2]))

live = COPPER.difference(RAILZONE.buffer(4.0))
unc = live.difference(VINYL.buffer(-0.001))
gate(unc.area < 0.5, 'vinyl covers all live copper outside the rail zone (%.2f mm2 bare)' % unc.area)
gate(VINYL.intersection(RAIL).area < 0.01, 'vinyl clears every rail finger')
for k, g in ELEC.items():
    gate(VINYL.buffer(-P['vinyl_out']).contains(g), 'vinyl overhangs key %s' % k)
gate(VINYL.buffer(-P['vinyl_out']).contains(unary_union(
     [box(x[0], x[1], x[2], x[3]) for x in P['lin']])), 'vinyl overhangs both sliders')
gate(VINYL.geom_type == 'Polygon', 'vinyl faceplate is one connected piece')
gate(unary_union(ACCENT).within(VINYL.buffer(-1.0)), 'accent inlays clear the faceplate edge')
gate(VINYL.within(INNER), 'vinyl inside the shared outline keepout')

# ============================================================== emit
if fails:
    print('\n'.join(fails)); print('\n%d GATE FAILURES - nothing written' % len(fails)); sys.exit(1)
os.makedirs(OUT, exist_ok=True)
K, PK, CR, GLD = '#1a1a1a', '#FE0386', '#f5f0e6', '#d9b45a'

def poly_path(g):
    if g is None or g.is_empty: return ''
    g = g.simplify(0.012, preserve_topology=True)
    gs = [g] if g.geom_type == 'Polygon' else [p for p in g.geoms if p.geom_type == 'Polygon']
    d = []
    for p in gs:
        for ring in [p.exterior] + list(p.interiors):
            pts = list(ring.coords)
            d.append('M ' + ' L '.join('%.3f %.3f' % (x, P['H'] - y) for x, y in pts[:-1]) + ' Z')
    return ' '.join(d)

def svg(fn, items, title, bg=None):
    body = []
    if bg: body.append('<path d="%s" fill="%s"/>' % (poly_path(OUTLINE), bg))
    for g, fill, op, st, sw in items:
        d = poly_path(g)
        if not d: continue
        a = 'd="%s" fill-rule="evenodd" fill="%s"' % (d, fill or 'none')
        if op != 1: a += ' fill-opacity="%.2f"' % op
        if st:
            a += ' stroke="%s" stroke-width="%.3f" stroke-linejoin="round"' % (st, abs(sw))
            if sw < 0: a += ' stroke-dasharray="1.6 1.2"'
        body.append('<path %s/>' % a)
    open(OUT + '/' + fn, 'w').write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="%.1fmm" height="%.1fmm" '
        'viewBox="0 0 %.1f %.1f"><title>%s</title>%s</svg>'
        % (P['W'], P['H'], P['W'], P['H'], title, ''.join(body)))

svg('01_copper.svg', [(unary_union([COPPER, RIM]), K, 1, None, 0)],
    'STAVE rev A  copper: 8 chevron keys, 2 sliders, 12 finger rail (fits 4 in tape)')
svg('02_vinyl_face.svg', [(unary_union([VINYL, RIM]), K, 1, None, 0)],
    'STAVE rev A  vinyl faceplate, the dielectric you touch')
svg('04_vinyl_accents.svg', [(unary_union(ACCENT + [RIM]), K, 1, None, 0)],
    'STAVE rev A  accent inlays, second colour vinyl (optional)')
svg('05_backer.svg', [(RIM, K, 1, None, 0)], 'STAVE rev A  backer, 2 mm chipboard')

txf, txg = [], []
def T(t, cap, x, y, font=FONT_S, guide=False, anchor='c'):
    g, _ = svgpath.text_geom(t, font, cap, x, y, anchor=anchor)
    (txg if guide else txf).append(g)
for k, t in TERM.items():
    T(t['label'], 2.0, t['x'] + t['d'] + 7.0, t['cy'] - 0.9, guide=True)
for k, pd in PADS.items():
    T(str(pd['deg']), 8.0, xm, pd['cy'] - 3.4, FONT_B)
for i, (lx0, ly0s, lx1, ly1s) in enumerate(P['lin']):
    T('SL%d' % (i + 1), 2.4, (lx0 + lx1) / 2, ly1s + 4.0 if i else ly0s - 6.2, FONT_B)
    for z in range(9):        # graduations sit on the outer side of each end slider
        x = lx0 + P['lin_off'] + z * ((lx1 - P['lin_off']) - (lx0 + P['lin_off'])) / 8.0
        if i == 0: txf.append(box(x - 0.35, ly0s - 2.6, x + 0.35, ly0s - 0.8))
        else: txf.append(box(x - 0.35, ly1s + 0.8, x + 0.35, ly1s + 2.6))
T('STAVE REV A . 8 DEGREES', 2.0, 66.0, 45.6)
T('make things. break things. repeat.', 1.9, 66.0, 41.2, FONT_R)

svg('00_guide_under.svg',
    [(unary_union(list(NET.values())), PK, .32, None, 0),
     (VINYL, None, 1, PK, -0.3),
     (BRAND_K, K, 1, None, 0), (BRAND_PK, PK, 1, None, 0),
     (unary_union(txf + txg), K, 1, None, 0)],
    'STAVE rev A  placement guide (print then cut, goes under the copper)', bg=CR)
svg('03_faceplate_print.svg',
    [(FACE, CR, 1, None, 0),
     (unary_union(ACCENT), GLD, .22, None, 0),
     (unary_union(list(ELEC.values()) + LINFACE), None, 1, K, 0.35),
     (BRAND_K.intersection(FACE), K, 1, None, 0), (BRAND_PK.intersection(FACE), PK, 1, None, 0),
     (unary_union(txf).intersection(FACE), K, 1, None, 0)],
    'STAVE rev A  printed faceplate (print then cut, top layer)')

json.dump(dict(
    params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
    nets={k: poly_path(v) for k, v in NET.items()},
    outline=poly_path(OUTLINE), brand_copper=BRAND_COPPER,
    art_parts=dict(ink=poly_path(BRAND_K), pink=poly_path(BRAND_PK),
                   text=poly_path(unary_union(txf)), text_guide=poly_path(unary_union(txg))),
    vinyl=poly_path(VINYL), accents=poly_path(unary_union(ACCENT)),
    electrodes={k: poly_path(v) for k, v in ELEC.items()},
    slider_paths={('L%d' % (i + 1)): poly_path(box(x[0], x[1], x[2], x[3]))
                  for i, x in enumerate(P['lin'])},
    pads=PADS, sliders=SLD, terminals=TERM,
    stats=dict(copper_area=round(COPPER.area, 1), channels=len(NETS),
               min_clearance=round(worst[0], 3), key_area=round(min(ka)),
               key_w=round(KX1 - KX0, 1), key_h=round(pitch - P['seam'], 1),
               lin_travel_mm=SLD['L1']['travel'], lin2_travel_mm=SLD['L2']['travel'],
               lanes_used=len(set(LANE.values())), vinyl_area=round(VINYL.area, 1),
               rail_pitch=P['rail_pitch'], rail_rows=1, tape_margin=round((P['tape_w'] - P['W']) / 2, 1)),
    ), open(OUT + '/stave_geometry.json', 'w'), separators=(',', ':'))

print('\n'.join(notes))
print('\nGATES %d passed %d failed' % (len(notes), len(fails)))
print('%s rev %s   %.0f x %.0f mm   fits %.1f mm tape (%.1f mm spare each side)   %d channels   min clr %.2f'
      % (P['name'], P['rev'], P['W'], P['H'], P['tape_w'], (P['tape_w'] - P['W']) / 2,
         len(NETS), worst[0]))
