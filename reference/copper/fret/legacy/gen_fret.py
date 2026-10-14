#!/usr/bin/env python3
"""
FRET rev A generator  -  hack.build

An isomorphic hex keyboard you can actually play, cut from copper, vinyl and
printed sticker paper. No Velostat, no components, 22 channels, all contacts in
one row.

  - 16 hexagonal keys in a Wicki-Hayden lattice: 4 interlocking columns of 4.
    Up a column is a whole tone, up-right is a fifth, down-right is a fourth.
    Every scale, chord and arpeggio is therefore ONE fixed hand shape that
    slides anywhere on the board, which is the entire point of an isomorphic
    layout: learn a shape once and it plays in all twelve keys.
  - 3 long sliders across the top: two straight at 78 and 56 mm, one arc at
    91 mm of sweep.
  - 22 contacts in a single row of edge fingers, alternating depth so clip
    jaws nest without the row becoming two rows.

The keys interlock into one honeycomb, so it reads as a single instrument
rather than a grid of unrelated pads. Straight vertical channels between the
key columns are the routing: every key taps out of its own left flank into the
channel beside it and drops to the rail, and the sliders reach the same
channels from above.
"""
import json, math, os, sys
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import translate, scale as aff_scale
import svgpath

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('FRET_OUT', HERE + '/out')
FONT_B = HERE + '/ibm-plex-mono-latin-700-normal.woff2'
FONT_R = HERE + '/ibm-plex-mono-latin-400-normal.woff2'
FONT_S = HERE + '/ibm-plex-mono-latin-600-normal.woff2'
LOGO = '/mnt/skills/user/board-forge/assets/hackbuild-logo.svg'
BRAND_COPPER = os.environ.get('FRET_BRAND', '0') != '0'

P = dict(
    name='FRET', rev='A',
    W=248.0, H=244.0, R=3.2, edge_keep=1.0, clr=0.90, tw=1.6,
    # TIGHT hex lattice: columns on 1.5s centres so the keys interlock into one
    # honeycomb. The grout between them is a zigzag ribbon, and that ribbon is the
    # routing: a straight channel would have to push the columns apart and the
    # honeycomb would fall back into separate strips.
    cols=5, rows=3, hex_s=21.0, hex_seam=6.0, hex_round=2.6,
    key_x0=64.0, key_y0=58.0, sub_gap=3.2, lchan=34.0,
    # note lattice (Wicki-Hayden): up a column +2, up-right +7, down-right +5
    base=48,                                  # C3
    # two long straight sliders stand vertically in the flanks, one long arc lies
    # across the top
    lin_x=((12.0, 32.0), (216.0, 236.0)), lin_y=(64.0, 186.0),
    lin_hmin=3.0, lin_gap=1.4, lin_off=6.0, lin_cor=(5.5, 242.5),
    arc_c=(124.0, 160.7), arc_r=(56.0, 68.0), arc_a=(38.0, 142.0),
    arc_hmin=2.2, arc_gap=1.4, arc_off=4.0, arc_esc=3.0,
    arc_run_y=189.0, arc_out=208.0,           # ARC_B drops in the gap right of the keys
    # single-row rail
    rail_n=21, rail_w=9.0, rail_pitch=11.0, rail_y0=2.5,
    rail_deep=16.0, rail_shallow=11.0, rail_r=1.2,
    lanes=tuple(54.0 - 3.0 * i for i in range(12)),
    vinyl_out=1.4, vinyl_rail_clr=3.0, accent_inset=2.6,
    mark_size=12.0, mark_x=8.0, mark_y=30.0, wm_cap=5.0, wm_x=22.0,
)
NETS = tuple('K%d' % i for i in range(1, 16)) + ('AR_A', 'AR_B', 'L1_A', 'L1_B', 'L2_A', 'L2_B')
LABEL = {}
NAMES = ('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B')
ACX, ACY = P['arc_c']
ly0, ly1 = P['lin_y']

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

def hexagon(cx, cy, s):
    """Flat-top hex: points left and right, flat top and bottom, so a column of
    them shares full edges and the whole field reads as one honeycomb."""
    return Polygon([(cx + s * math.cos(math.radians(60 * k)),
                     cy + s * math.sin(math.radians(60 * k))) for k in range(6)])

OUTLINE = rr(0, 0, P['W'], P['H'], P['R'])
INNER = OUTLINE.buffer(-P['edge_keep'])
RIM = OUTLINE.difference(OUTLINE.buffer(-0.15))

nets = {k: [] for k in NETS}
art, PADS, SLD, TERM, ARRIVE, ESC = [], {}, {}, {}, {}, {}
CHSUB = {}
def add(n, g): nets[n].append(g)

# ------------------------------------------------- honeycomb + zigzag ribbons
s_ = P['hex_s']
hex_w, hex_h = 2 * s_, math.sqrt(3) * s_
dxc = 1.5 * s_                                  # interlocking column pitch
ero = P['hex_seam'] / math.sin(math.radians(60))  # how far erosion pulls a hex vertex in x
COLX = [P['key_x0'] + c * dxc for c in range(P['cols'])]
def cy_of(c, r): return P['key_y0'] + hex_h / 2 + (r + (0.5 if c % 2 else 0)) * hex_h
KEYTOP = max(cy_of(c, P['rows'] - 1) for c in range(P['cols'])) + hex_h / 2
KEYBOT = min(cy_of(c, 0) for c in range(P['cols'])) - hex_h / 2

def ribbon(c):
    """Centreline of the grout between column c-1 and column c, as a polyline running
    top to bottom. It alternates between the facing hex vertices, so it is exactly the
    boundary both sides were eroded away from."""
    X = COLX[c]
    pts = []
    ys = sorted({cy_of(c, r) for r in range(P['rows'])} | {cy_of(c - 1, r) for r in range(P['rows'])},
                reverse=True)
    ys = [ys[0] + hex_h / 2] + ys + [ys[-1] - hex_h / 2]
    for y in ys:
        near_c = min(abs(y - cy_of(c, r)) for r in range(P['rows']))
        near_p = min(abs(y - cy_of(c - 1, r)) for r in range(P['rows']))
        pts.append((X - s_ if near_c <= near_p else X - dxc + s_, y))
    return pts

CHUSE = {c: [] for c in range(P['cols'])}
for c in range(P['cols']):
    X = COLX[c]
    for r in range(P['rows']):
        cy = cy_of(c, r)
        g = hexagon(X, cy, s_).buffer(-P['hex_seam'], join_style=1, resolution=16)
        g = g.buffer(-P['hex_round'], join_style=1, resolution=16).buffer(
            P['hex_round'], join_style=1, resolution=16)
        net = 'K%d' % (c * P['rows'] + r + 1)
        add(net, g)
        semi = P['base'] + (2 * r + (1 if c % 2 else 0)) + 6 * c
        LABEL[net] = '%s%d' % (NAMES[semi % 12], semi // 12 - 1)
        PADS[net] = dict(col=c, row=r, cx=X, cy=cy, semi=semi, note=LABEL[net])
        CHUSE[c].append((cy, net))

# sub-lanes: shifting the whole zigzag sideways keeps a constant perpendicular gap, and
# the TOP key takes the innermost shift so a lower key never crosses a higher key's lane
CHUSE[0].append((1e6, 'AR_A'))                  # enters above every key in that channel
SHIFT, RIB = {}, {}
for c in range(P['cols']):
    order_in = [n for _, n in sorted(CHUSE[c], key=lambda t: -t[0])]
    k = len(order_in)
    RIB[c] = ribbon(c) if c > 0 else None
    for i, net in enumerate(order_in):
        SHIFT[net] = P['sub_gap'] * (i + 0.5)      # innermost shift for the top key
for c in range(P['cols']):
    for _, net in CHUSE[c]:
        if net not in PADS: continue
        pd = PADS[net]
        tap = (pd['cx'] - s_ + ero + 1.6, pd['cy'])
        if c == 0:
            x = P['lchan'] + SHIFT[net]
            ESC[net] = [tap, (x, pd['cy'])]
            ARRIVE[net] = x
        else:
            path = [(px + SHIFT[net], py) for px, py in RIB[c]]
            below = [p for p in path if p[1] < pd['cy'] - 0.01]
            # enter the ribbon at this key's own height, then follow it down
            entry = None
            for j in range(len(path) - 1):
                (x1, y1), (x2, y2) = path[j], path[j + 1]
                if y1 >= pd['cy'] >= y2 and y1 != y2:
                    t = (y1 - pd['cy']) / (y1 - y2)
                    entry = (x1 + (x2 - x1) * t, pd['cy'])
                    break
            ESC[net] = [tap, entry] + below
            ARRIVE[net] = below[-1][0]

# ------------------------------------------------- sliders: flanks + top arc
for i, (lx0, lx1) in enumerate(P['lin_x']):
    tag = 'L%d' % (i + 1)
    wsum = (lx1 - lx0) - P['lin_gap']
    hmax = wsum - P['lin_hmin']
    yA0, yA1 = ly0, ly1 - P['lin_off']                  # A thick at the bottom
    yB0, yB1 = ly0 + P['lin_off'], ly1                  # B thick at the top
    gA = Polygon([(lx0, yA0), (lx0 + hmax, yA0), (lx0 + P['lin_hmin'], yA1), (lx0, yA1)])
    gB = Polygon([(lx1, yB1), (lx1 - hmax, yB1), (lx1 - P['lin_hmin'], yB0), (lx1, yB0)])
    add(tag + '_A', gA); add(tag + '_B', gB)
    SLD[tag] = dict(kind='linear', x=[lx0, lx1], y=[ly0, ly1], travel=round(ly1 - ly0, 1))
    LABEL[tag + '_A'] = 'SL%d A' % (i + 1); LABEL[tag + '_B'] = 'SL%d B' % (i + 1)
    xa = lx0 + hmax / 2
    ESC[tag + '_A'] = [(xa, ly0 + 1.6)]
    ARRIVE[tag + '_A'] = xa
    cor = P['lin_cor'][i]
    ESC[tag + '_B'] = [(lx1 - hmax / 2, ly1 - 1.6), (cor, ly1 - 1.6)]
    ARRIVE[tag + '_B'] = cor

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
LABEL['AR_A'], LABEL['AR_B'] = 'ARC A', 'ARC B'
pa = apol(r_in + hmax_a / 2, aa1 - P['arc_esc'])
pb = apol(r_out - hmax_a / 2, ab0 + P['arc_esc'])
# the arc sits above the keys, so its ends step out sideways along one clear row and
# then drop: A joins the leftmost key channel, B drops in the gap right of the keys
ESC['AR_A'] = [pa, (pa[0], P['arc_run_y']),
               (P['lchan'] + SHIFT['AR_A'], P['arc_run_y'])]
ARRIVE['AR_A'] = P['lchan'] + SHIFT['AR_A']
ESC['AR_B'] = [pb, (pb[0], P['arc_run_y']), (P['arc_out'], P['arc_run_y'])]
ARRIVE['AR_B'] = P['arc_out']

# ------------------------------------------------- rail + constraint-ranked fan
order = sorted(NETS, key=lambda k: ARRIVE[k])
x0 = P['W'] / 2 - (P['rail_n'] - 1) * P['rail_pitch'] / 2.0
TX = {k: x0 + i * P['rail_pitch'] for i, k in enumerate(order)}
SPAN = {k: (min(TX[k], ARRIVE[k]), max(TX[k], ARRIVE[k])) for k in order}
MARG = P['tw'] + P['clr']
def inside(lo, hi, x): return lo - MARG <= x <= hi + MARG
farther = {k: set() for k in order}
for p in order:
    for q in order:
        if p == q: continue
        lo, hi = SPAN[q]
        if inside(lo, hi, ARRIVE[p]): farther[p].add(q)
        if inside(lo, hi, TX[p]): farther[q].add(p)
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
    raise SystemExit('need %d fan lanes, have %d' % (need, len(P['lanes'])))
LANE = {k: P['lanes'][need - 1 - rank[k]] for k in order}
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
ELEC = {k: hexagon(pd['cx'], pd['cy'], s_ - P['hex_seam']) for k, pd in PADS.items()}
RAIL = unary_union([box(t['cx'] - P['rail_w'] / 2 - 1.0, t['y'] - 1.0,
                        t['cx'] + P['rail_w'] / 2 + 1.0, t['y'] + t['h'] + 1.0)
                    for t in TERM.values()])
RAILZONE = box(RAIL.bounds[0], 0, RAIL.bounds[2], RAIL.bounds[3] + P['vinyl_rail_clr'])
VINYL = outer_only(smooth(OUTLINE.buffer(-2.0).difference(RAILZONE), 0.8))
FACE = VINYL
ARCFACE = annulus(r_in + 0.6, r_out - 0.6, ab0 + 1.0, aa1 - 1.0)
LINFACE = [box(x[0] + 0.6, ly0 + 0.6, x[1] - 0.6, ly1 - 0.6) for x in P['lin_x']]
ACCENT = [hexagon(pd['cx'], pd['cy'], s_ - P['hex_seam'] - P['accent_inset'])
          for pd in PADS.values()]
ACCENT += [ARCFACE] + LINFACE

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
gate(min(g.area for g in ELEC.values()) > 450,
     'hex key plate %.0f mm2, %.0f x %.0f mm across'
     % (min(g.area for g in ELEC.values()), 2 * (P['hex_s'] - P['hex_seam'] / math.sin(
        math.radians(60))), math.sqrt(3) * (P['hex_s'] - P['hex_seam'])))
gate(len(PADS) == P['cols'] * P['rows'],
     '%d hex keys in %d interlocking columns of %d' % (len(PADS), P['cols'], P['rows']))

# the lattice must be isomorphic: same interval for the same physical move, everywhere
def semi(c, r): return P['base'] + (2 * r + (1 if c % 2 else 0)) + 6 * c
vert = {semi(c, r + 1) - semi(c, r) for c in range(P['cols']) for r in range(P['rows'] - 1)}
# the physical neighbour up and to the right is (c+1, r) from an even column and
# (c+1, r+1) from an odd one, because odd columns already sit half a hex higher
upright, dnright = set(), set()
for c in range(P['cols'] - 1):
    for r in range(P['rows']):
        ur = (c + 1, r if c % 2 == 0 else r + 1)
        dr = (c + 1, r - 1 if c % 2 == 0 else r)
        if 0 <= ur[1] < P['rows']: upright.add(semi(*ur) - semi(c, r))
        if 0 <= dr[1] < P['rows']: dnright.add(semi(*dr) - semi(c, r))
gate(vert == {2}, 'up a column is a whole tone everywhere (%s)' % sorted(vert))
gate(upright == {7}, 'up-right is a perfect fifth everywhere (%s)' % sorted(upright))
gate(dnright == {5}, 'down-right is a perfect fourth everywhere (%s)' % sorted(dnright))
allsemi = sorted(semi(c, r) for c in range(P['cols']) for r in range(P['rows']))
gate(len(set(allsemi)) == len(PADS), 'no duplicated notes (%d distinct)' % len(set(allsemi)))
gate(allsemi[-1] - allsemi[0] >= 24, 'range %d semitones, %s to %s'
     % (allsemi[-1] - allsemi[0], NAMES[allsemi[0] % 12], NAMES[allsemi[-1] % 12]))
maj = {0, 2, 4, 5, 7, 9, 11}
have = {(x - P['base']) % 12 for x in allsemi}
gate(len(maj & have) >= 6, 'covers %d of the 7 diatonic degrees of the home key' % len(maj & have))

for c in range(P['cols']):
    subs = sorted(SHIFT[n] for _, n in CHUSE[c])
    if len(subs) > 1:
        gate(min(subs[i + 1] - subs[i] for i in range(len(subs) - 1)) * math.sin(math.radians(60))
             >= MARG - 0.001,
             'channel %d carries %d traces, %.2f mm apart across the grout'
             % (c, len(subs), (subs[1] - subs[0]) * math.sin(math.radians(60))))
gate(all(len(CHUSE[c]) <= P['rows'] + 1 for c in range(P['cols'])),
     'no grout ribbon carries more than %d traces' % (P['rows'] + 1))
for tag in ('L1', 'L2'):
    lx0, lx1 = SLD[tag]['x']
    ra = []
    o0, o1 = ly0 + P['lin_off'] + 1.0, ly1 - P['lin_off'] - 1.0
    for i in range(41):
        y = o0 + i * (o1 - o0) / 40.0
        sl = box(lx0 - 1, y - 0.35, lx1 + 1, y + 0.35)
        a, b = NET[tag + '_A'].intersection(sl).area, NET[tag + '_B'].intersection(sl).area
        ra.append(a / (a + b) if a + b > 0 else 0)
    gate(all(ra[i] > ra[i + 1] - 1e-6 for i in range(len(ra) - 1)),
         'slider %s ratio monotone bottom to top' % tag)
    gate(0.10 < min(ra) and max(ra) < 0.90,
         'slider %s span %.3f to %.3f, off both rails' % (tag, max(ra), min(ra)))
    SLD[tag]['span'] = [round(max(ra), 3), round(min(ra), 3)]
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
gate(arc_sweep > 70, 'arc sweep %.0f mm' % arc_sweep)
gate(min(SLD[t]['travel'] for t in ('L1', 'L2')) >= 55,
     'straight sliders %.0f and %.0f mm' % (SLD['L1']['travel'], SLD['L2']['travel']))
SLIDGEO = unary_union([ARC_A, ARC_B] + [box(x[0], ly0, x[1], ly1) for x in P['lin_x']])
gate(SLIDGEO.distance(unary_union(list(ELEC.values()))) >= P['clr'],
     'sliders clear the honeycomb by %.2f mm' % SLIDGEO.distance(unary_union(list(ELEC.values()))))
gate(SLIDGEO.within(INNER), 'sliders inside the outline keepout')

ts = sorted(TERM.values(), key=lambda t: t['cx'])
gate(len(TERM) == 21, 'exactly 21 channels: two MPR121 on one bus, 21 of 24 used')
gate(min(ts[i + 1]['cx'] - ts[i]['cx'] for i in range(len(ts) - 1)) >= 10.5,
     'rail is ONE row on %.1f mm pitch' % P['rail_pitch'])
gate(P['rail_pitch'] - P['rail_w'] >= 2.0, 'rail finger gap %.1f mm' % (P['rail_pitch'] - P['rail_w']))
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
    gate(VINYL.buffer(-P['vinyl_out']).contains(g), 'vinyl overhangs key %s' % k)
gate(VINYL.buffer(-P['vinyl_out']).contains(unary_union([ARC_A, ARC_B])), 'vinyl overhangs the arc')
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
    'FRET rev A  copper: 16 hex keys, 3 sliders, 22 finger rail')
svg('02_vinyl_face.svg', [(unary_union([VINYL, RIM]), K, 1, None, 0)],
    'FRET rev A  vinyl faceplate, the dielectric you touch')
svg('04_vinyl_accents.svg', [(unary_union(ACCENT + [RIM]), K, 1, None, 0)],
    'FRET rev A  accent inlays, second colour vinyl (optional)')
svg('05_backer.svg', [(RIM, K, 1, None, 0)], 'FRET rev A  backer, 2 mm chipboard')

txf, txg = [], []
def T(t, cap, x, y, font=FONT_S, guide=False, anchor='c'):
    g, _ = svgpath.text_geom(t, font, cap, x, y, anchor=anchor)
    (txg if guide else txf).append(g)
for k, t in TERM.items():
    T(t['label'], 2.0, t['cx'], t['y'] + t['h'] + 1.6, guide=True)
for k, pd in PADS.items():
    T(pd['note'], 7.5, pd['cx'], pd['cy'] - 3.6, FONT_B)
T('ARC', 2.4, ACX, ly1 + 3.5, FONT_B)
for z in range(9):
    a = oa0 + z * (oa1 - oa0) / 8.0
    txf.append(LineString([apol(r_in + 0.4, a), apol(r_in + 2.6, a)]).buffer(0.35, cap_style=2))
for i, (lx0, lx1) in enumerate(P['lin_x']):
    T('SL%d' % (i + 1), 2.4, (lx0 + lx1) / 2, ly1 + 2.6, FONT_B)
    for z in range(9):                       # graduations march UP a vertical slider
        y = ly0 + P['lin_off'] + z * ((ly1 - P['lin_off']) - (ly0 + P['lin_off'])) / 8.0
        side = lx0 - 3.0 if i == 0 else lx1 + 1.2
        txf.append(box(side, y - 0.35, side + 1.8, y + 0.35))
T('FRET REV A  .  WICKI-HAYDEN  .  UP +2  UP-RIGHT +7  DOWN-RIGHT +5', 2.2, 126.0, 47.0)
T('make things. break things. repeat.', 2.0, 126.0, 42.0, FONT_R)

svg('00_guide_under.svg',
    [(unary_union(list(NET.values())), PK, .32, None, 0),
     (VINYL, None, 1, PK, -0.3),
     (BRAND_K, K, 1, None, 0), (BRAND_PK, PK, 1, None, 0),
     (unary_union(txf + txg), K, 1, None, 0)],
    'FRET rev A  placement guide (print then cut, goes under the copper)', bg=CR)
svg('03_faceplate_print.svg',
    [(FACE, CR, 1, None, 0),
     (unary_union(ACCENT), GLD, .22, None, 0),
     (unary_union(list(ELEC.values()) + [ARCFACE] + LINFACE), None, 1, K, 0.35),
     (BRAND_K.intersection(FACE), K, 1, None, 0), (BRAND_PK.intersection(FACE), PK, 1, None, 0),
     (unary_union(txf).intersection(FACE), K, 1, None, 0)],
    'FRET rev A  printed faceplate (print then cut, top layer)')

json.dump(dict(
    params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
    nets={k: poly_path(v) for k, v in NET.items()},
    outline=poly_path(OUTLINE), brand_copper=BRAND_COPPER,
    art_parts=dict(ink=poly_path(BRAND_K), pink=poly_path(BRAND_PK),
                   text=poly_path(unary_union(txf)), text_guide=poly_path(unary_union(txg))),
    vinyl=poly_path(VINYL), accents=poly_path(unary_union(ACCENT)),
    electrodes={k: poly_path(v) for k, v in ELEC.items()},
    slider_paths=dict(AR=poly_path(annulus(r_in, r_out, ab0, aa1)),
                      L1=poly_path(box(P['lin_x'][0][0], ly0, P['lin_x'][0][1], ly1)),
                      L2=poly_path(box(P['lin_x'][1][0], ly0, P['lin_x'][1][1], ly1))),
    columns=COLX, ribbons={str(c): RIB[c] for c in RIB if RIB[c]},
    pads=PADS, sliders=SLD, terminals=TERM, hub=[ACX, ACY],
    notes={k: pd['note'] for k, pd in PADS.items()},
    stats=dict(copper_area=round(COPPER.area, 1), channels=len(NETS),
               min_clearance=round(worst[0], 3),
               key_area=round(min(g.area for g in ELEC.values())),
               key_w=round(2 * (P['hex_s'] - P['hex_seam'] / math.sin(math.radians(60))), 1),
               key_h=round(math.sqrt(3) * (P['hex_s'] - P['hex_seam']), 1),
               arc_sweep_mm=round(arc_sweep), lin_travel_mm=SLD['L1']['travel'],
               lin2_travel_mm=SLD['L2']['travel'], lanes_used=len(set(LANE.values())),
               range_semis=allsemi[-1] - allsemi[0], vinyl_area=round(VINYL.area, 1),
               rail_pitch=P['rail_pitch'], rail_rows=1,
               tile_min=round(min(g.area for g in ELEC.values())),
               tile_max=round(max(g.area for g in ELEC.values()))),
    ), open(OUT + '/fret_geometry.json', 'w'), separators=(',', ':'))

print('\n'.join(notes))
print('\nGATES %d passed %d failed' % (len(notes), len(fails)))
print('%s rev %s   %.0f x %.0f mm   %d channels in ONE row   keys %.0f x %.0f mm   range %d semis   min clr %.2f'
      % (P['name'], P['rev'], P['W'], P['H'], len(NETS), hex_w, hex_h,
         allsemi[-1] - allsemi[0], worst[0]))
