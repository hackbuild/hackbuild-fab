#!/usr/bin/env python3
"""
TESSERA rev A generator  -  hack.build

12 chunky irregular tile keys, three small sliders, 18 contacts in one row.
Copper, vinyl and printed sticker paper. No Velostat, no components.

The keys are Voronoi cells of a jittered seed grid, with one deliberate
deviation: the boundaries between COLUMNS are snapped to straight vertical
channels. Those channels are the routing. Every tile taps out of its own left
edge into the channel beside it and drops straight to the rail, so an
irregular tessellation stays trivially routable on a single layer.

Channel sub-lane order is the rule that keeps it crossing-free: inside a
channel, the TOP row's trace takes the leftmost sub-lane and the bottom row's
takes the rightmost. A trace entering lower down then only has to cross lanes
belonging to rows above it, which are all to its left.

The three sliders live in the band under the keypad, parked in the gaps
BETWEEN channels, so nothing has to cross anything.
"""
import json, math, os, random, sys
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import translate, scale as aff_scale
import svgpath

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('TESSERA_OUT', HERE + '/out')
FONT_B = HERE + '/ibm-plex-mono-latin-700-normal.woff2'
FONT_R = HERE + '/ibm-plex-mono-latin-400-normal.woff2'
FONT_S = HERE + '/ibm-plex-mono-latin-600-normal.woff2'
LOGO = '/mnt/skills/user/board-forge/assets/hackbuild-logo.svg'
BRAND_COPPER = os.environ.get('TESSERA_BRAND', '0') != '0'

P = dict(
    name='TESSERA', rev='A',
    W=242.0, H=176.0, R=3.2, edge_keep=1.0, clr=0.90, tw=1.6,
    seed=11, jitter=(6.0, 5.5),               # seed jitter in x, y
    cols=4, rows=3, field=(10.0, 76.0, 232.0, 170.0),
    chan_w=10.0, sub_gap=3.0, tile_seam=0.55, tile_round=1.6,
    # slider band, sitting in the gaps between channels
    slid_y=(51.0, 71.0),
    lin=((22.0, 61.0), (128.0, 167.0)),       # two small straight sliders
    lin_hmin=2.4, lin_gap=1.4, lin_off=5.0,
    arc_c=(205.5, 24.5), arc_r=(32.0, 44.0), arc_a=(60.0, 120.0),
    arc_hmin=2.2, arc_gap=1.4, arc_off=4.0, arc_esc=3.0,
    # single-row rail
    rail_n=18, rail_w=9.0, rail_pitch=13.0, rail_y0=2.5,
    rail_deep=16.0, rail_shallow=11.0, rail_r=1.2,
    lanes=tuple(46.0 - 3.0 * i for i in range(9)),    # farthest from the rail first
    vinyl_out=1.4, vinyl_rail_clr=3.0, accent_inset=2.4,
    mark_size=13.0, mark_x=74.0, mark_y=53.0, wm_cap=5.4, wm_x=89.0,
)
NETS = tuple('T%d' % i for i in range(1, 13)) + ('AR_A', 'AR_B', 'L1_A', 'L1_B', 'L2_A', 'L2_B')
LABEL = {'T%d' % i: 'TILE %d' % i for i in range(1, 13)}
LABEL.update(AR_A='ARC A', AR_B='ARC B', L1_A='SL1 A', L1_B='SL1 B', L2_A='SL2 A', L2_B='SL2 B')
FX0, FY0, FX1, FY1 = P['field']
ACX, ACY = P['arc_c']

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

def apol(r, a):
    t = math.radians(a)
    return (ACX + r * math.cos(t), ACY + r * math.sin(t))

def annulus(r_in, r_out, a0, a1, n=None):
    n = n or max(10, int(abs(a1 - a0) / 1.2))
    fi = r_in if callable(r_in) else (lambda a: r_in)
    fo = r_out if callable(r_out) else (lambda a: r_out)
    pts = [apol(fo(a0 + (a1 - a0) * i / n), a0 + (a1 - a0) * i / n) for i in range(n + 1)]
    pts += [apol(fi(a1 - (a1 - a0) * i / n), a1 - (a1 - a0) * i / n) for i in range(n + 1)]
    return Polygon(pts)

def halfplane(p, q, big=900.0):
    """Polygon of points closer to p than to q."""
    mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
    dx, dy = q[0] - p[0], q[1] - p[1]
    L = math.hypot(dx, dy)
    nx, ny = dx / L, dy / L            # outward normal, toward q
    tx, ty = -ny, nx                   # along the bisector
    return Polygon([(mx + tx * big, my + ty * big), (mx - tx * big, my - ty * big),
                    (mx - tx * big - nx * big, my - ty * big - ny * big),
                    (mx + tx * big - nx * big, my + ty * big - ny * big)])

OUTLINE = rr(0, 0, P['W'], P['H'], P['R'])
INNER = OUTLINE.buffer(-P['edge_keep'])
RIM = OUTLINE.difference(OUTLINE.buffer(-0.15))

nets = {k: [] for k in NETS}
art, PADS, SLD, TERM, ARRIVE, ESC = [], {}, {}, {}, {}, {}
def add(n, g): nets[n].append(g)

# ------------------------------------------------- channels and seeds
nch = P['cols'] + 1
cell_w = ((FX1 - FX0) - nch * P['chan_w']) / P['cols']
CHAN = [FX0 + i * (cell_w + P['chan_w']) + P['chan_w'] / 2 for i in range(nch)]
rng = random.Random(P['seed'])
jx, jy = P['jitter']
SEED = {}
for j in range(P['cols']):
    cx0 = CHAN[j] + P['chan_w'] / 2
    # stagger the coursing per column so the seams do not line up across channels,
    # which is what stops an irregular grid from reading as stacked planks
    off = ((FY1 - FY0) / P['rows']) * (0.34 if j % 2 else -0.34)
    for r in range(P['rows']):
        yc = FY0 + (FY1 - FY0) * (r + 0.5) / P['rows'] + off
        SEED[(j, r)] = (cx0 + cell_w / 2 + rng.uniform(-jx, jx), yc + rng.uniform(-jy, jy))

# ------------------------------------------------- tiles: Voronoi in y, channels in x
TILE = {}
for j in range(P['cols']):
    left = CHAN[j] + P['chan_w'] / 2
    right = CHAN[j + 1] - P['chan_w'] / 2
    for r in range(P['rows']):
        g = box(left, FY0, right, FY1)
        for key, q in SEED.items():
            if key != (j, r):
                g = g.intersection(halfplane(SEED[(j, r)], q))
        g = g.buffer(-P['tile_seam'], join_style=1, resolution=16)
        g = g.buffer(-P['tile_round'], join_style=1, resolution=16).buffer(
            P['tile_round'], join_style=1, resolution=16)
        net = 'T%d' % (j * P['rows'] + (P['rows'] - r))      # numbered bottom-up per column
        add(net, g)
        TILE[net] = g
        PADS[net] = dict(col=j, row=r, seed=list(SEED[(j, r)]),
                         bounds=[round(v, 2) for v in g.bounds])
        # tap out of the left edge, into the channel beside it. inside a channel the
        # TOP row takes the leftmost sub-lane, so a lower entrant only crosses lanes
        # that lie to its left.
        sub = CHAN[j] - (P['rows'] - 1) * P['sub_gap'] / 2 + (P['rows'] - 1 - r) * P['sub_gap']
        edge = g.intersection(box(left, FY0 - 1, left + 2.6, FY1 + 1))
        ty = edge.centroid.y
        ESC[net] = [(left + 1.4, ty), (sub, ty)]
        ARRIVE[net] = sub

# ------------------------------------------------- sliders, parked between channels
ly0, ly1 = P['slid_y']
for i, (lx0, lx1) in enumerate(P['lin']):
    tag = 'L%d' % (i + 1)
    hsum = (ly1 - ly0) - P['lin_gap']
    hmax = hsum - P['lin_hmin']
    xA0, xA1 = lx0, lx1 - P['lin_off']
    xB0, xB1 = lx0 + P['lin_off'], lx1
    gA = Polygon([(xA0, ly0), (xA1, ly0), (xA1, ly0 + P['lin_hmin']), (xA0, ly0 + hmax)])
    gB = Polygon([(xB1, ly1), (xB0, ly1), (xB0, ly1 - P['lin_hmin']), (xB1, ly1 - hmax)])
    add(tag + '_A', gA); add(tag + '_B', gB)
    SLD[tag] = dict(kind='linear', x=[lx0, lx1], y=[ly0, ly1])
    xa, xb = lx0 + 1.4, lx1 - 1.4
    ESC[tag + '_A'] = [(xa, ly0 + hmax / 2)]
    ESC[tag + '_B'] = [(xb, ly1 - hmax / 2)]
    ARRIVE[tag + '_A'], ARRIVE[tag + '_B'] = xa, xb

r_in, r_out = P['arc_r']
aa0, aa1 = P['arc_a'][0], P['arc_a'][1] + P['arc_off']
ab0, ab1 = P['arc_a'][0] - P['arc_off'], P['arc_a'][1]
hmax_a = (r_out - r_in) - P['arc_gap'] - P['arc_hmin']
fA = lambda a: P['arc_hmin'] + (hmax_a - P['arc_hmin']) * (a - aa0) / (aa1 - aa0)
fB = lambda a: hmax_a - (hmax_a - P['arc_hmin']) * (a - ab0) / (ab1 - ab0)
ARC_A = annulus(r_in, lambda a: r_in + fA(a), aa0, aa1)
ARC_B = annulus(lambda a: r_out - fB(a), r_out, ab0, ab1)
add('AR_A', ARC_A); add('AR_B', ARC_B)
SLD['AR'] = dict(kind='arc', c=[ACX, ACY], r_in=r_in, r_out=r_out, a=[aa0, aa1], b=[ab0, ab1])
for net, a_end, rmid in (('AR_A', aa1 - P['arc_esc'], r_in + hmax_a / 2),
                         ('AR_B', ab0 + P['arc_esc'], r_out - hmax_a / 2)):
    p = apol(rmid, a_end)
    ESC[net] = [p]
    ARRIVE[net] = p[0]

# ------------------------------------------------- rail + monotone fan
order = sorted(NETS, key=lambda k: ARRIVE[k])
x0 = P['W'] / 2 - (P['rail_n'] - 1) * P['rail_pitch'] / 2.0
TX = {k: x0 + i * P['rail_pitch'] for i, k in enumerate(order)}
travel = {k: abs(TX[k] - ARRIVE[k]) for k in order}
SPAN = {k: (min(TX[k], ARRIVE[k]), max(TX[k], ARRIVE[k])) for k in order}
MARG = P['tw'] + P['clr']
def inside(lo, hi, x): return lo - MARG <= x <= hi + MARG
# Lane order is a partial ORDER, not a sort key. Sorting by travel looked right and
# then deadlocked: a short-travel net whose source lands inside a long-travel net's
# horizontal has to sit FARTHER from the rail than it, which a travel sort cannot
# express. So build the constraints and rank them.
#   p's source drop crosses lanes FARTHER than p  -> if ARRIVE[p] hits span(q), p is farther than q
#   p's finger drop crosses lanes NEARER  than p  -> if TX[p]     hits span(q), p is nearer  than q
farther = {k: set() for k in order}
for p in order:
    for q in order:
        if p == q: continue
        lo, hi = SPAN[q]
        if inside(lo, hi, ARRIVE[p]): farther[p].add(q)
        if inside(lo, hi, TX[p]): farther[q].add(p)
rank = {k: 0 for k in order}
for _ in range(len(order) + 2):
    changed = False
    for p in order:
        want = max([rank[q] + 1 for q in farther[p]] or [0])
        if want > rank[p]: rank[p] = want; changed = True
    if not changed: break
else:
    raise SystemExit('lane constraints contain a cycle: rethink the escape topology')
need = max(rank.values()) + 1
if need > len(P['lanes']):
    raise SystemExit('need %d fan lanes, have %d' % (need, len(P['lanes'])))
# lanes[0] is the FARTHEST from the rail and rank grows with farther-ness, so the
# index has to count down, not up. Getting this backwards inverts every constraint
# the ranking just computed and the clearance gate catches it as a dead-on overlap.
LANE = {k: P['lanes'][need - 1 - rank[k]] for k in order}
used = {y: [(SPAN[k][0], SPAN[k][1], k) for k in order if LANE[k] == y] for y in P['lanes']}
for y, lst in used.items():                     # same lane implies disjoint horizontals
    for i in range(len(lst)):
        for j in range(i + 1, len(lst)):
            a, b, p = lst[i]; c, d, q = lst[j]
            if not (b < c - MARG or a > d + MARG):
                raise SystemExit('lane %.1f: %s and %s overlap' % (y, p, q))
for i, net in enumerate(order):
    cx = TX[net]
    deep = i % 2 == 0
    h = P['rail_deep'] if deep else P['rail_shallow']
    add(net, wire(ESC[net] + [(ARRIVE[net], LANE[net]), (cx, LANE[net]),
                              (cx, P['rail_y0'] + h - 1.0)]))
    add(net, rr(cx - P['rail_w'] / 2, P['rail_y0'], cx + P['rail_w'] / 2,
                P['rail_y0'] + h, P['rail_r']))
    TERM[net] = dict(cx=cx, y=P['rail_y0'], h=h, deep=deep, net=net, idx=i, label=LABEL[net])

# ------------------------------------------------- brand
lp = __import__('re').findall(r'<path transform="translate\((-?[\d.]+),(-?[\d.]+)\)"[^>]*d="([^"]+)"',
                              open(LOGO).read())
mk = [svgpath.path_geom(d, 1.0, float(tx), float(ty)) for tx, ty, d in lp]
mb = unary_union(mk).bounds
ms = P['mark_size'] / max(mb[2] - mb[0], mb[3] - mb[1])
MARK = [translate(aff_scale(translate(g, -mb[0], -mb[1]), ms, -ms, origin=(0, 0)),
                  P['mark_x'], P['mark_y'] + P['mark_size']) for g in mk]
wm1, _ = svgpath.text_geom('hack', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 7.0)
wm2, _ = svgpath.text_geom('.build', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 0.4)
BRAND_K = unary_union([MARK[0], wm1]); BRAND_PK = unary_union([MARK[1], wm2])
if BRAND_COPPER: art += MARK + [wm1, wm2]
ART = unary_union(art) if art else Polygon()

NET = {k: smooth(unary_union(v)) for k, v in nets.items()}
COPPER = unary_union(list(NET.values()) + ([ART] if not ART.is_empty else []))

# ------------------------------------------------- overlays
ELEC = dict(TILE)
RAIL = unary_union([box(t['cx'] - P['rail_w'] / 2 - 1.0, t['y'] - 1.0,
                        t['cx'] + P['rail_w'] / 2 + 1.0, t['y'] + t['h'] + 1.0)
                    for t in TERM.values()])
RAILZONE = box(RAIL.bounds[0], 0, RAIL.bounds[2], RAIL.bounds[3] + P['vinyl_rail_clr'])
VINYL = outer_only(smooth(OUTLINE.buffer(-2.0).difference(RAILZONE), 0.8))
FACE = VINYL
ARCFACE = annulus(r_in + 0.6, r_out - 0.6, ab0 + 1.0, aa1 - 1.0)
LINFACE = [box(x[0] + 0.6, ly0 + 0.6, x[1] - 0.6, ly1 - 0.6) for x in P['lin']]
ACCENT = [g.buffer(-P['accent_inset'], join_style=1, resolution=16) for g in TILE.values()]
ACCENT = [g for g in ACCENT if not g.is_empty] + [ARCFACE] + LINFACE

# ============================================================== GATES
fails, notes = [], []
def gate(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)

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

areas = {k: g.area for k, g in TILE.items()}
gate(min(areas.values()) > 400, 'smallest tile %.0f mm2, largest %.0f (a fingertip is about 100)'
     % (min(areas.values()), max(areas.values())))
gate(all(g.geom_type == 'Polygon' for g in TILE.values()), 'every tile is one connected piece')
gate(len(TILE) == P['cols'] * P['rows'] == 12, '12 tiles from %d columns x %d rows'
     % (P['cols'], P['rows']))
for j in range(nch):
    strip = box(CHAN[j] - P['chan_w'] / 2, FY0 - 1, CHAN[j] + P['chan_w'] / 2, FY1 + 1)
    gate(all(g.intersection(strip).area < 0.01 for g in TILE.values()),
         'channel %d at x=%.1f is clear of every tile' % (j, CHAN[j]))
for j in range(P['cols']):
    subs = sorted(ARRIVE['T%d' % (j * P['rows'] + k + 1)] for k in range(P['rows']))
    gate(min(subs[i + 1] - subs[i] for i in range(len(subs) - 1)) >= P['tw'] + P['clr'] - 0.001,
         'channel %d sub-lanes on %.1f mm centres' % (j, subs[1] - subs[0]))

for tag in ('L1', 'L2'):
    lx0, lx1 = SLD[tag]['x']
    ra = []
    for i in range(41):
        o0, o1 = lx0 + P['lin_off'] + 1.0, lx1 - P['lin_off'] - 1.0
        x = o0 + i * (o1 - o0) / 40.0
        sl = box(x - 0.35, ly0 - 1, x + 0.35, ly1 + 1)
        a, b = NET[tag + '_A'].intersection(sl).area, NET[tag + '_B'].intersection(sl).area
        ra.append(a / (a + b) if a + b > 0 else 0)
    gate(all(ra[i] > ra[i + 1] - 1e-6 for i in range(len(ra) - 1)),
         'slider %s ratio monotone left to right' % tag)
    gate(0.10 < min(ra) and max(ra) < 0.90,
         'slider %s span %.3f to %.3f, off both rails' % (tag, max(ra), min(ra)))
    SLD[tag]['span'] = [round(max(ra), 3), round(min(ra), 3)]
    SLD[tag]['travel'] = round(lx1 - lx0, 1)
rat = []
oa0, oa1 = aa0 + 2.0, ab1 - 2.0
for i in range(41):
    a = oa0 + i * (oa1 - oa0) / 40.0
    sl = annulus(r_in - 1, r_out + 1, a - 0.4, a + 0.4)
    x, y = NET['AR_A'].intersection(sl).area, NET['AR_B'].intersection(sl).area
    rat.append(x / (x + y) if x + y > 0 else 0)
gate(all(rat[i] < rat[i + 1] + 1e-6 for i in range(len(rat) - 1)), 'arc ratio monotone along the sweep')
gate(0.10 < min(rat) and max(rat) < 0.90, 'arc span %.3f to %.3f, off both rails' % (min(rat), max(rat)))
SLD['AR']['span'] = [round(min(rat), 3), round(max(rat), 3)]
arc_sweep = math.radians(oa1 - oa0) * (r_in + r_out) / 2
SLD['AR']['travel'] = round(arc_sweep, 1)
gate(25 < arc_sweep < 70, 'arc sweep %.0f mm, small by design' % arc_sweep)
gate(unary_union([ARC_A, ARC_B]).within(box(FX0, ly0 - 0.1, FX1, ly1 + 0.1)),
     'the arc stays inside the slider band')
gate(all(30 < SLD[t]['travel'] < 70 for t in ('L1', 'L2')),
     'straight sliders %.0f mm each, small by design' % SLD['L1']['travel'])
band = box(FX0 - 2, ly0 - 2, FX1 + 2, ly1 + 2)
gate(unary_union(list(TILE.values())).intersection(band).area < 0.01,
     'the slider band is clear of every tile')

ts = sorted(TERM.values(), key=lambda t: t['cx'])
gate(len(TERM) == 18, 'exactly 18 channels: two MPR121 on one bus, 18 of 24 used')
gate(min(ts[i + 1]['cx'] - ts[i]['cx'] for i in range(len(ts) - 1)) >= 12.5,
     'rail is ONE row on %.1f mm pitch' % P['rail_pitch'])
gate(P['rail_pitch'] - P['rail_w'] >= 3.5, 'rail finger gap %.1f mm' % (P['rail_pitch'] - P['rail_w']))
gate(all(t['deep'] != ts[i + 1]['deep'] for i, t in enumerate(ts[:-1])),
     'finger depth alternates %.0f / %.0f mm' % (P['rail_deep'], P['rail_shallow']))
gate(all(abs(TERM[k]['cx'] - x0 - i * P['rail_pitch']) < 1e-9 for i, k in enumerate(order)),
     'rail order follows arrival order (monotone fan)')
gate(need <= len(P['lanes']), 'fan needs %d lanes, %d available' % (need, len(P['lanes'])))

live = COPPER.difference(RAILZONE.buffer(4.0))
unc = live.difference(VINYL.buffer(-0.001))
gate(unc.area < 0.5, 'vinyl covers all live copper outside the rail zone (%.2f mm2 bare)' % unc.area)
gate(VINYL.intersection(RAIL).area < 0.01, 'vinyl clears every rail finger')
for k, g in ELEC.items():
    gate(VINYL.buffer(-P['vinyl_out']).contains(g), 'vinyl overhangs tile %s' % k)
gate(VINYL.buffer(-P['vinyl_out']).contains(unary_union([ARC_A, ARC_B])), 'vinyl overhangs the arc')
gate(VINYL.buffer(-P['vinyl_out']).contains(unary_union(
     [box(x[0], ly0, x[1], ly1) for x in P['lin']])), 'vinyl overhangs both straight sliders')
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
    'TESSERA rev A  copper: 12 tile keys, 1 arc + 2 straight sliders, 18 finger rail')
svg('02_vinyl_face.svg', [(unary_union([VINYL, RIM]), K, 1, None, 0)],
    'TESSERA rev A  vinyl faceplate, the dielectric you touch')
svg('04_vinyl_accents.svg', [(unary_union(ACCENT + [RIM]), K, 1, None, 0)],
    'TESSERA rev A  accent tiles, second colour vinyl (optional)')
svg('05_backer.svg', [(RIM, K, 1, None, 0)], 'TESSERA rev A  backer, 2 mm chipboard')

txf, txg = [], []
def T(t, cap, x, y, font=FONT_S, guide=False, anchor='c'):
    g, _ = svgpath.text_geom(t, font, cap, x, y, anchor=anchor)
    (txg if guide else txf).append(g)
for k, t in TERM.items():
    T(t['label'], 2.0, t['cx'], t['y'] + t['h'] + 1.6, guide=True)
for k, g in TILE.items():
    c = g.centroid
    T(k[1:], 9.0, c.x, c.y - 4.5, FONT_B)
T('ARC', 2.4, ACX, ly1 + 2.2, FONT_B)
for z in range(9):
    a = oa0 + z * (oa1 - oa0) / 8.0
    txf.append(LineString([apol(r_in + 0.4, a), apol(r_in + 2.6, a)]).buffer(0.35, cap_style=2))
for i, (lx0, lx1) in enumerate(P['lin']):
    T('SL%d' % (i + 1), 2.4, (lx0 + lx1) / 2, ly1 + 2.2, FONT_B)
    for z in range(9):
        x = lx0 + 2.0 + z * ((lx1 - 2.0) - (lx0 + 2.0)) / 8.0
        txf.append(box(x - 0.35, ly0 - 2.8, x + 0.35, ly0 - 1.0))
T('TESSERA REV A', 2.2, 95.0, 47.0)
T('make things. break things. repeat.', 2.0, 95.0, 42.4, FONT_R)

svg('00_guide_under.svg',
    [(unary_union(list(NET.values())), PK, .32, None, 0),
     (VINYL, None, 1, PK, -0.3),
     (BRAND_K, K, 1, None, 0), (BRAND_PK, PK, 1, None, 0),
     (unary_union(txf + txg), K, 1, None, 0)],
    'TESSERA rev A  placement guide (print then cut, goes under the copper)', bg=CR)
svg('03_faceplate_print.svg',
    [(FACE, CR, 1, None, 0),
     (unary_union(ACCENT), GLD, .22, None, 0),
     (unary_union(list(TILE.values()) + [ARCFACE] + LINFACE), None, 1, K, 0.35),
     (BRAND_K.intersection(FACE), K, 1, None, 0), (BRAND_PK.intersection(FACE), PK, 1, None, 0),
     (unary_union(txf).intersection(FACE), K, 1, None, 0)],
    'TESSERA rev A  printed faceplate (print then cut, top layer)')

json.dump(dict(
    params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
    nets={k: poly_path(v) for k, v in NET.items()},
    outline=poly_path(OUTLINE), brand_copper=BRAND_COPPER,
    art_parts=dict(ink=poly_path(BRAND_K), pink=poly_path(BRAND_PK),
                   text=poly_path(unary_union(txf)), text_guide=poly_path(unary_union(txg))),
    vinyl=poly_path(VINYL), accents=poly_path(unary_union(ACCENT)),
    electrodes={k: poly_path(v) for k, v in ELEC.items()},
    slider_paths=dict(AR=poly_path(annulus(r_in, r_out, ab0, aa1)),
                      L1=poly_path(box(P['lin'][0][0], ly0, P['lin'][0][1], ly1)),
                      L2=poly_path(box(P['lin'][1][0], ly0, P['lin'][1][1], ly1))),
    channels=CHAN, pads=PADS, sliders=SLD, terminals=TERM, hub=[ACX, ACY],
    stats=dict(copper_area=round(COPPER.area, 1), channels=len(NETS),
               min_clearance=round(worst[0], 3), tile_min=round(min(areas.values())),
               tile_max=round(max(areas.values())), arc_sweep_mm=round(arc_sweep),
               lin_travel_mm=SLD['L1']['travel'], lanes_used=len(set(LANE.values())),
               vinyl_area=round(VINYL.area, 1), rail_pitch=P['rail_pitch'], rail_rows=1,
               blade_area=round(min(areas.values()))),
    ), open(OUT + '/tessera_geometry.json', 'w'), separators=(',', ':'))

print('\n'.join(notes))
print('\nGATES %d passed %d failed' % (len(notes), len(fails)))
print('%s rev %s   %.0f x %.0f mm   %d channels in ONE row   tiles %.0f-%.0f mm2   min clr %.2f mm'
      % (P['name'], P['rev'], P['W'], P['H'], len(NETS),
         min(areas.values()), max(areas.values()), worst[0]))
