#!/usr/bin/env python3
"""
QUADRANT rev A generator  -  hack.build

VERNIER's radial sibling. Same materials (adhesive copper, vinyl, printed
sticker paper), same 12 capacitive channels, no Velostat and no components,
but the layout is a fan instead of a grid:

  - 6 button pads are annular SECTORS radiating from a hub at the bottom edge
  - 3 sliders are concentric ARC bands, each a wedge pair in polar space, so
    position is still A/(A+B) but it reads as a sweep of your thumb
  - all 12 contacts are a SINGLE ROW of edge fingers along the bottom, with
    alternating finger depth so clip jaws nest at two depths without the row
    turning into two rows

Why radial routes well: angular order maps monotonically to x order along the
bottom rail, so every net reaches its own finger with no crossing. Each arc's
A electrode escapes past the LEFT end of every smaller arc, its B electrode
past the RIGHT end, and both drop straight down through empty space.
"""
import json, math, os, sys
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import translate, scale as aff_scale
import svgpath

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('QUADRANT_OUT', HERE + '/out')
FONT_B = HERE + '/ibm-plex-mono-latin-700-normal.woff2'
FONT_R = HERE + '/ibm-plex-mono-latin-400-normal.woff2'
FONT_S = HERE + '/ibm-plex-mono-latin-600-normal.woff2'
LOGO = '/mnt/skills/user/board-forge/assets/hackbuild-logo.svg'
BRAND_COPPER = os.environ.get('QUADRANT_BRAND', '0') != '0'

P = dict(
    name='QUADRANT', rev='A',
    W=190.0, H=134.0, R=3.2, edge_keep=1.0, clr=0.90, tw=1.6,
    hub=(95.0, 34.0),
    # button fan: 6 annular sectors. the inner radius sets the hub void the fan
    # lanes run through, so it cannot be tight
    btn_r=(20.0, 42.0), btn_a=(18.0, 160.0), btn_gap_a=3.2, btn_round=1.6,
    # arc sliders: three concentric bands, inner radius per band
    arcs=(48.0, 64.0, 80.0), arc_w=12.0,
    arc_a_span=(18.0, 166.0), arc_b_span=(14.0, 162.0),
    sl_hmin=2.0, sl_gap=1.4,
    esc_a=165.0, esc_b=15.0,
    # single-row edge rail: alternating depth so clips nest
    rail_n=12, rail_w=9.0, rail_pitch=14.0, rail_y0=2.5,
    rail_deep=16.0, rail_shallow=11.0, rail_r=1.2,
    lanes=(37.0, 34.0, 31.0, 28.0, 25.0, 22.0),   # farthest from the rail first
    # overlays
    vinyl_out=1.6, vinyl_rail_clr=3.0, accent_inset=2.6,
    mark_size=13.0, mark_x=4.0, mark_y=106.0, wm_cap=5.2, wm_x=19.0,
)
NETS = ('B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'S1A', 'S1B', 'S2A', 'S2B', 'S3A', 'S3B')
LABEL = {'B%d' % i: 'BTN %d' % i for i in range(1, 7)}
LABEL.update({'S%d%s' % (i, s): 'SL%d %s' % (i, s) for i in (1, 2, 3) for s in 'AB'})
CX, CY = P['hub']

def rr(x0, y0, x1, y1, r):
    r = min(r, (x1 - x0) / 2 - .001, (y1 - y0) / 2 - .001)
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, join_style=1, resolution=16)

def wire(pts, w=None):
    return LineString(pts).buffer((w or P['tw']) / 2.0, cap_style=2, join_style=1, resolution=16)

def smooth(g, d=0.4):
    return g.buffer(d, join_style=1, resolution=16).buffer(-d, join_style=1, resolution=16)

def outer_only(g):
    gs = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    return unary_union([Polygon(p.exterior) for p in gs])

def pol(r, a):
    t = math.radians(a)
    return (CX + r * math.cos(t), CY + r * math.sin(t))

def annulus(r_in, r_out, a0, a1, n=None):
    """Annular sector. r_in and r_out may be callables of angle."""
    n = n or max(12, int(abs(a1 - a0) / 1.5))
    fi = r_in if callable(r_in) else (lambda a: r_in)
    fo = r_out if callable(r_out) else (lambda a: r_out)
    pts = [pol(fo(a0 + (a1 - a0) * i / n), a0 + (a1 - a0) * i / n) for i in range(n + 1)]
    pts += [pol(fi(a1 - (a1 - a0) * i / n), a1 - (a1 - a0) * i / n) for i in range(n + 1)]
    return Polygon(pts)

OUTLINE = rr(0, 0, P['W'], P['H'], P['R'])
INNER = OUTLINE.buffer(-P['edge_keep'])
RIM = OUTLINE.difference(OUTLINE.buffer(-0.15))

nets = {k: [] for k in NETS}
art, PADS, SLD, TERM = [], {}, {}, {}
ARRIVE, ESC = {}, {}
def add(n, g): nets[n].append(g)

# ------------------------------------------------- button fan, numbered left to right
a0, a1 = P['btn_a']
step = (a1 - a0 + P['btn_gap_a']) / 6.0
sec = step - P['btn_gap_a']
for i in range(6):
    lo = a0 + i * step
    hi = lo + sec
    net = 'B%d' % (6 - i)                       # angle counts up going left, labels go left to right
    g = annulus(P['btn_r'][0], P['btn_r'][1], lo, hi)
    g = g.buffer(-P['btn_round'], join_style=1, resolution=16).buffer(
        P['btn_round'], join_style=1, resolution=16)
    add(net, g)
    mid = (lo + hi) / 2
    px, py = pol(P['btn_r'][0] + 0.9, mid)
    PADS[net] = dict(a0=lo, a1=hi, r0=P['btn_r'][0], r1=P['btn_r'][1], mid=mid)
    ESC[net] = [(px, py)]
    ARRIVE[net] = px

# ------------------------------------------------- arc sliders
hmax = P['arc_w'] - P['sl_gap'] - P['sl_hmin']
for i, r_in in enumerate(P['arcs']):
    n = i + 1
    r_out = r_in + P['arc_w']
    aa0, aa1 = P['arc_a_span']; ab0, ab1 = P['arc_b_span']
    hA = lambda a, aa0=aa0, aa1=aa1: P['sl_hmin'] + (hmax - P['sl_hmin']) * (a - aa0) / (aa1 - aa0)
    hB = lambda a, ab0=ab0, ab1=ab1: hmax - (hmax - P['sl_hmin']) * (a - ab0) / (ab1 - ab0)
    A = annulus(r_in, lambda a, f=hA, ri=r_in: ri + f(a), aa0, aa1)
    B = annulus(lambda a, f=hB, ro=r_out: ro - f(a), r_out, ab0, ab1)
    add('S%dA' % n, A); add('S%dB' % n, B)
    pa = pol(r_in + hmax / 2, P['esc_a'])
    pb = pol(r_out - hmax / 2, P['esc_b'])
    ESC['S%dA' % n] = [pa]; ESC['S%dB' % n] = [pb]
    ARRIVE['S%dA' % n] = pa[0]; ARRIVE['S%dB' % n] = pb[0]
    SLD['S%d' % n] = dict(r_in=r_in, r_out=r_out, a=list(P['arc_a_span']), b=list(P['arc_b_span']))

# ------------------------------------------------- single-row rail + fan
order = sorted(NETS, key=lambda k: ARRIVE[k])
x0 = CX - (P['rail_n'] - 1) * P['rail_pitch'] / 2.0
TX = {k: x0 + i * P['rail_pitch'] for i, k in enumerate(order)}
travel = {k: abs(TX[k] - ARRIVE[k]) for k in order}
SPAN = {k: (min(TX[k], ARRIVE[k]), max(TX[k], ARRIVE[k])) for k in order}
# Lane assignment has TWO conditions, and only checking the first is how a
# vertical ends up shaving a horizontal on a nearer lane:
#   1. no two horizontals share a lane where their spans overlap
#   2. each vertical only crosses the lanes it actually passes through: the
#      SOURCE drop comes from above, so it crosses lanes FARTHER from the rail
#      than its own; the FINGER drop goes down, so it crosses lanes NEARER the
#      rail. Checking the wrong one of those two rejects perfectly good fans.
MARG = P['tw'] + P['clr']
def clears(lo, hi, x): return x < lo - MARG or x > hi + MARG
LANE, used = {}, {y: [] for y in P['lanes']}
NEARER = {y: i for i, y in enumerate(P['lanes'])}          # bigger index = nearer the rail
for net in sorted(order, key=lambda k: travel[k], reverse=True):
    lo, hi = SPAN[net]
    for y in P['lanes']:                                   # farthest lane first
        ok = all(hi < a - MARG or lo > b + MARG for a, b, _ in used[y])
        for yy in P['lanes']:
            for a, b, q in used[yy]:
                if NEARER[yy] > NEARER[y]:                 # q sits nearer the rail
                    ok &= clears(a, b, TX[net])             # net's finger drop passes q
                    ok &= clears(lo, hi, ARRIVE[q])        # q's source drop passes net
                elif NEARER[yy] < NEARER[y]:               # q sits farther from the rail
                    ok &= clears(a, b, ARRIVE[net])        # net's source drop passes q
                    ok &= clears(lo, hi, TX[q])            # q's finger drop passes net
        if ok:
            LANE[net] = y; used[y].append((lo, hi, net)); break
    else:
        raise SystemExit('no free fan lane for %s: add a lane' % net)
for i, net in enumerate(order):
    cx = TX[net]
    deep = i % 2 == 0
    h = P['rail_deep'] if deep else P['rail_shallow']
    y0r = P['rail_y0']
    lane = LANE[net]
    add(net, wire(ESC[net] + [(ARRIVE[net], lane), (cx, lane), (cx, y0r + h - 1.0)]))
    add(net, rr(cx - P['rail_w'] / 2, y0r, cx + P['rail_w'] / 2, y0r + h, P['rail_r']))
    TERM[net] = dict(cx=cx, y=y0r, h=h, deep=deep, net=net, idx=i, label=LABEL[net])

# ------------------------------------------------- brand art
lp = __import__('re').findall(r'<path transform="translate\((-?[\d.]+),(-?[\d.]+)\)"[^>]*d="([^"]+)"',
                              open(LOGO).read())
mk = [svgpath.path_geom(d, 1.0, float(tx), float(ty)) for tx, ty, d in lp]
mb = unary_union(mk).bounds
ms = P['mark_size'] / max(mb[2] - mb[0], mb[3] - mb[1])
MARK = [translate(aff_scale(translate(g, -mb[0], -mb[1]), ms, -ms, origin=(0, 0)),
                  P['mark_x'], P['mark_y'] + P['mark_size']) for g in mk]
wm1, _ = svgpath.text_geom('hack', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 7.8)
wm2, _ = svgpath.text_geom('.build', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 0.6)
BRAND_K = unary_union([MARK[0], wm1]); BRAND_PK = unary_union([MARK[1], wm2])
if BRAND_COPPER: art += MARK + [wm1, wm2]
ART = unary_union(art) if art else Polygon()

NET = {k: smooth(unary_union(v)) for k, v in nets.items()}
COPPER = unary_union(list(NET.values()) + ([ART] if not ART.is_empty else []))

# ------------------------------------------------- overlays
ELEC = {k: annulus(pd['r0'], pd['r1'], pd['a0'], pd['a1']) for k, pd in PADS.items()}
RAIL = unary_union([box(t['cx'] - P['rail_w'] / 2 - 1.0, t['y'] - 1.0,
                        t['cx'] + P['rail_w'] / 2 + 1.0, t['y'] + t['h'] + 1.0)
                    for t in TERM.values()])
RAILZONE = box(RAIL.bounds[0], 0, RAIL.bounds[2], RAIL.bounds[3] + P['vinyl_rail_clr'])
VINYL = outer_only(smooth(OUTLINE.buffer(-2.0).difference(RAILZONE), 0.8))
FACE = VINYL
ACCENT = []
for k, pd in PADS.items():
    g = annulus(pd['r0'] + P['accent_inset'], pd['r1'] - P['accent_inset'],
                pd['a0'] + 1.6, pd['a1'] - 1.6)
    ACCENT.append(g.buffer(-1.2, join_style=1, resolution=16).buffer(1.2, join_style=1, resolution=16))
ARCFACE = [annulus(r + 0.6, r + P['arc_w'] - 0.6, P['arc_b_span'][0] + 1.0, P['arc_a_span'][1] - 1.0)
           for r in P['arcs']]
ACCENT += ARCFACE

# ============================================================== GATES
fails, notes = [], []
def gate(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)

for k in NETS:
    n = 1 if NET[k].geom_type == 'Polygon' else len(NET[k].geoms)
    gate(n == 1, 'net %-4s single island (%d)' % (k, n))

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
    e = NET[k].buffer(-0.55)
    n1 = 0 if e.is_empty else (1 if e.geom_type == 'Polygon' else len(e.geoms))
    gate(n1 >= 1, 'net %-4s survives the 1.10 mm erode test (%d islands)' % (k, n1))
for k, pd in PADS.items():
    gate(NET[k].contains(annulus(pd['r0'] + 2.5, pd['r1'] - 2.5, pd['a0'] + 3.0, pd['a1'] - 3.0)),
         'sector %s is solid copper' % k)

for n in (1, 2, 3):
    A, B = NET['S%dA' % n], NET['S%dB' % n]
    r_in, r_out = SLD['S%d' % n]['r_in'], SLD['S%d' % n]['r_out']
    rat = []
    for i in range(41):
        oa0, oa1 = P['arc_a_span'][0] + 2.0, P['arc_b_span'][1] - 2.0
        a = oa0 + i * (oa1 - oa0) / 40.0
        sl = annulus(r_in - 1, r_out + 1, a - 0.5, a + 0.5)
        aa, bb = A.intersection(sl).area, B.intersection(sl).area
        rat.append(aa / (aa + bb) if aa + bb > 0 else 0)
    gate(all(rat[i] < rat[i + 1] + 1e-6 for i in range(len(rat) - 1)),
         'arc %d ratio monotone along the sweep' % n)
    gate(0.10 < min(rat) and max(rat) < 0.90,
         'arc %d span %.3f to %.3f, off both rails' % (n, min(rat), max(rat)))
    gate(min(A.area, B.area) > 200, 'arc %d both wedges carry real plate area' % n)
    SLD['S%d' % n]['span'] = [round(min(rat), 3), round(max(rat), 3)]
sweep = math.radians((P['arc_b_span'][1] - 2) - (P['arc_a_span'][0] + 2)) * (P['arcs'][0] + P['arc_w'] / 2)
gate(sweep > 100, 'inner arc sweep %.0f mm of travel' % sweep)

ts = sorted(TERM.values(), key=lambda t: t['cx'])
gate(len(ts) == 12 and len(NETS) == 12, 'exactly 12 channels, one MPR121 or 12 S3 touch pins')
gate(min(ts[i + 1]['cx'] - ts[i]['cx'] for i in range(11)) >= 13.5,
     'rail is ONE row on %.1f mm pitch' % P['rail_pitch'])
gate(P['rail_pitch'] - P['rail_w'] >= 4.0,
     'rail finger gap %.1f mm' % (P['rail_pitch'] - P['rail_w']))
gate(abs(P['rail_deep'] - P['rail_shallow']) >= 4.0,
     'alternating finger depth %.1f mm so adjacent clip bodies nest'
     % abs(P['rail_deep'] - P['rail_shallow']))
gate(all(t['deep'] != ts[i + 1]['deep'] for i, t in enumerate(ts[:-1])), 'depth alternates every finger')
gate(all(abs(TERM[k]['cx'] - x0 - i * P['rail_pitch']) < 1e-9 for i, k in enumerate(order)),
     'rail order follows arrival order (monotone fan, no crossings)')

live = COPPER.difference(RAILZONE.buffer(4.0))
unc = live.difference(VINYL.buffer(-0.001))
gate(unc.area < 0.5, 'vinyl covers all live copper outside the rail zone (%.2f mm2 bare)' % unc.area)
gate(VINYL.intersection(RAIL).area < 0.01, 'vinyl clears every rail finger')
for k, g in ELEC.items():
    gate(VINYL.buffer(-P['vinyl_out']).contains(g),
         'vinyl overhangs sector %s by %.1f mm' % (k, P['vinyl_out']))
gate(VINYL.geom_type == 'Polygon', 'vinyl faceplate is one connected piece')
gate(unary_union(ACCENT).within(VINYL.buffer(-1.0)), 'accent tiles clear the faceplate edge by 1 mm')
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
    'QUADRANT rev A  copper: 6 sector pads, 3 arc sliders, 12 finger rail')
svg('02_vinyl_face.svg', [(unary_union([VINYL, RIM]), K, 1, None, 0)],
    'QUADRANT rev A  vinyl faceplate, the dielectric you touch')
svg('04_vinyl_accents.svg', [(unary_union(ACCENT + [RIM]), K, 1, None, 0)],
    'QUADRANT rev A  accent tiles, second colour vinyl (optional)')
svg('05_backer.svg', [(RIM, K, 1, None, 0)], 'QUADRANT rev A  backer, 2 mm chipboard')

txf, txg = [], []
def T(t, cap, x, y, font=FONT_S, anchor='c', guide=False, rot=None):
    g, _ = svgpath.text_geom(t, font, cap, x, y, anchor=anchor)
    (txg if guide else txf).append(g)
for k, t in TERM.items():
    T(t['label'], 2.2, t['cx'], t['y'] + t['h'] + 1.6, guide=True)
for k, pd in PADS.items():
    x, y = pol((pd['r0'] + pd['r1']) / 2 - 4.0, pd['mid'])
    T(k[1], 7.0, x, y, FONT_B)
for i, r in enumerate(P['arcs']):
    x, y = pol(r + P['arc_w'] / 2 - 1.4, P['arc_a_span'][1] + 5.0)
    T('SL%d' % (i + 1), 2.6, x, y, FONT_B)
    for z in range(9):
        a = P['arc_a_span'][0] + 2.0 + z * ((P['arc_b_span'][1] - 2.0) - (P['arc_a_span'][0] + 2.0)) / 8.0
        p1, p2 = pol(r + 0.4, a), pol(r + 2.4, a)
        txf.append(LineString([p1, p2]).buffer(0.35, cap_style=2))
T('QUADRANT REV A', 2.2, 158.0, 126.0)
T('12 CHANNELS', 2.2, 158.0, 121.4)
T('6 SECTORS + 3 ARC SLIDERS . 12 CONTACTS IN ONE ROW', 2.2, 95.0, 33.4)
T('make things. break things. repeat.', 2.0, 95.0, 27.0, FONT_R)

svg('00_guide_under.svg',
    [(unary_union(list(NET.values())), PK, .32, None, 0),
     (VINYL, None, 1, PK, -0.3),
     (BRAND_K, K, 1, None, 0), (BRAND_PK, PK, 1, None, 0),
     (unary_union(txf + txg), K, 1, None, 0)],
    'QUADRANT rev A  placement guide (print then cut, goes under the copper)', bg=CR)
svg('03_faceplate_print.svg',
    [(FACE, CR, 1, None, 0),
     (unary_union(ACCENT), GLD, .22, None, 0),
     (unary_union(ARCFACE), None, 1, K, 0.35),
     (BRAND_K.intersection(FACE), K, 1, None, 0), (BRAND_PK.intersection(FACE), PK, 1, None, 0),
     (unary_union(txf).intersection(FACE), K, 1, None, 0)],
    'QUADRANT rev A  printed faceplate (print then cut, top layer)')

json.dump(dict(
    params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
    nets={k: poly_path(v) for k, v in NET.items()},
    outline=poly_path(OUTLINE), brand_copper=BRAND_COPPER,
    art_parts=dict(ink=poly_path(BRAND_K), pink=poly_path(BRAND_PK),
                   text=poly_path(unary_union(txf)), text_guide=poly_path(unary_union(txg))),
    vinyl=poly_path(VINYL), accents=poly_path(unary_union(ACCENT)),
    electrodes={k: poly_path(v) for k, v in ELEC.items()},
    arcs_path={('S%d' % n): poly_path(annulus(SLD['S%d' % n]['r_in'], SLD['S%d' % n]['r_out'],
                                              P['arc_b_span'][0], P['arc_a_span'][1]))
               for n in (1, 2, 3)},
    pads=PADS, sliders=SLD, terminals=TERM, hub=[CX, CY],
    stats=dict(copper_area=round(COPPER.area, 1), channels=len(NETS),
               min_clearance=round(worst[0], 3), sweep_mm=round(sweep, 0),
               span=SLD['S1']['span'], vinyl_area=round(VINYL.area, 1),
               rail_pitch=P['rail_pitch'], rail_rows=1)),
    open(OUT + '/quadrant_geometry.json', 'w'), separators=(',', ':'))

print('\n'.join(notes))
print('\nGATES %d passed %d failed' % (len(notes), len(fails)))
print('%s rev %s   %.0f x %.0f mm   %d channels in ONE row   %.0f mm2 copper   min clearance %.2f mm'
      % (P['name'], P['rev'], P['W'], P['H'], len(NETS), COPPER.area, worst[0]))
