#!/usr/bin/env python3
"""
SPLINE rev A generator  -  hack.build

QUADRANT's 18-channel sibling. Same materials (adhesive copper, vinyl, printed
sticker paper), no Velostat and no components, all contacts in ONE row.

  - 12 buttons, radial blade keys: thin annular sectors fanned around a hub,
    like the teeth of a splined shaft
  - 3 sliders, all small: one 60 degree ARC nested above the fan, and two
    42 mm STRAIGHT sliders flanking it
  - 18 contacts in a single row of edge fingers, alternating depth so clip
    jaws nest without the row becoming two rows

18 channels is two MPR121 breakouts on one I2C bus, 24 available and 18 used.
That is the price of this many buttons; QUADRANT's 12 was one chip.

Routing: angular order maps onto x order along the rail, so the fan of 18
escapes is monotone. Each blade drops straight out of its own inner edge
through the hub void. The arc slider sits outside the blades, so both of its
ends step radially OUT to a clear radius, run angularly past the end of the
fan, and only then drop: a short concentric detour instead of a jumper.
"""
import json, math, os, sys
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import translate, scale as aff_scale
import svgpath

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('SPLINE_OUT', HERE + '/out')
FONT_B = HERE + '/ibm-plex-mono-latin-700-normal.woff2'
FONT_R = HERE + '/ibm-plex-mono-latin-400-normal.woff2'
FONT_S = HERE + '/ibm-plex-mono-latin-600-normal.woff2'
LOGO = '/mnt/skills/user/board-forge/assets/hackbuild-logo.svg'
BRAND_COPPER = os.environ.get('SPLINE_BRAND', '0') != '0'

P = dict(
    name='SPLINE', rev='A',
    W=242.0, H=146.0, R=3.2, edge_keep=1.0, clr=0.90, tw=1.6,
    hub=(121.0, 62.0),
    # 12 radial blade keys
    key_n=12, key_r=(26.0, 60.0), key_a=(30.0, 150.0), key_gap_a=2.4,
    key_round=1.0, key_tap=(30.0, 24.0),  # radial stub: leave the blade, then drop from inside the void
    # small arc slider, nested outside the blades
    arc_r=(64.0, 76.0), arc_a=(60.0, 120.0), arc_detour=88.0, arc_exit=(28.0, 152.0),
    arc_hmin=2.4, arc_gap=1.4, arc_off=5.0,
    # two small straight sliders, vertical, flanking the fan
    lin_x=((10.0, 24.0), (218.0, 232.0)), lin_y=(66.0, 108.0),
    lin_hmin=2.4, lin_gap=1.4, lin_off=3.0, lin_cor=(6.0, 236.0),
    # single-row rail
    rail_n=18, rail_w=9.0, rail_pitch=13.0, rail_y0=2.5,
    rail_deep=16.0, rail_shallow=11.0, rail_r=1.2,
    lanes=(43.0, 40.0, 37.0, 34.0, 31.0, 28.0, 25.0, 22.0),
    vinyl_out=1.4, vinyl_rail_clr=3.0, accent_inset=1.6,
    mark_size=13.0, mark_x=6.0, mark_y=124.0, wm_cap=5.2, wm_x=21.0,
)
NETS = tuple('K%d' % i for i in range(1, 13)) + ('AR_A', 'AR_B', 'L1_A', 'L1_B', 'L2_A', 'L2_B')
LABEL = {'K%d' % i: 'KEY %d' % i for i in range(1, 13)}
LABEL.update(AR_A='ARC A', AR_B='ARC B', L1_A='SL1 A', L1_B='SL1 B', L2_A='SL2 A', L2_B='SL2 B')
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
    n = n or max(10, int(abs(a1 - a0) / 1.5))
    fi = r_in if callable(r_in) else (lambda a: r_in)
    fo = r_out if callable(r_out) else (lambda a: r_out)
    pts = [pol(fo(a0 + (a1 - a0) * i / n), a0 + (a1 - a0) * i / n) for i in range(n + 1)]
    pts += [pol(fi(a1 - (a1 - a0) * i / n), a1 - (a1 - a0) * i / n) for i in range(n + 1)]
    return Polygon(pts)

OUTLINE = rr(0, 0, P['W'], P['H'], P['R'])
INNER = OUTLINE.buffer(-P['edge_keep'])
RIM = OUTLINE.difference(OUTLINE.buffer(-0.15))

nets = {k: [] for k in NETS}
art, PADS, SLD, TERM, ARRIVE, ESC = [], {}, {}, {}, {}, {}
def add(n, g): nets[n].append(g)

# ------------------------------------------------- 12 radial blade keys
a0, a1 = P['key_a']
step = (a1 - a0) / P['key_n']
w = step - P['key_gap_a']
for i in range(P['key_n']):
    lo = a0 + i * step + P['key_gap_a'] / 2
    hi = lo + w
    net = 'K%d' % (P['key_n'] - i)            # angle grows leftward, labels read left to right
    g = annulus(P['key_r'][0], P['key_r'][1], lo, hi)
    g = g.buffer(-P['key_round'], join_style=1, resolution=16).buffer(
        P['key_round'], join_style=1, resolution=16)
    add(net, g)
    mid = (lo + hi) / 2
    stub = [pol(P['key_tap'][0], mid), pol(P['key_tap'][1], mid)]
    PADS[net] = dict(a0=lo, a1=hi, r0=P['key_r'][0], r1=P['key_r'][1], mid=mid)
    ESC[net] = stub
    ARRIVE[net] = stub[-1][0]

# ------------------------------------------------- small arc slider, with detour escapes
r_in, r_out = P['arc_r']
aa0, aa1 = P['arc_a'][0], P['arc_a'][1] + P['arc_off']      # A reaches past B on the left
ab0, ab1 = P['arc_a'][0] - P['arc_off'], P['arc_a'][1]      # B reaches past A on the right
hmax_a = (r_out - r_in) - P['arc_gap'] - P['arc_hmin']
fA = lambda a: P['arc_hmin'] + (hmax_a - P['arc_hmin']) * (a - aa0) / (aa1 - aa0)
fB = lambda a: hmax_a - (hmax_a - P['arc_hmin']) * (a - ab0) / (ab1 - ab0)
ARC_A = annulus(r_in, lambda a: r_in + fA(a), aa0, aa1)
ARC_B = annulus(lambda a: r_out - fB(a), r_out, ab0, ab1)
add('AR_A', ARC_A); add('AR_B', ARC_B)
SLD['AR'] = dict(kind='arc', r_in=r_in, r_out=r_out, a=[aa0, aa1], b=[ab0, ab1],
                 detour=P['arc_detour'], exit=list(P['arc_exit']))
for net, a_end, a_exit, rr_mid in (('AR_A', aa1 - 1.0, P['arc_exit'][1], r_in + hmax_a / 2),
                                   ('AR_B', ab0 + 1.0, P['arc_exit'][0], r_out - hmax_a / 2)):
    pts = [pol(rr_mid, a_end), pol(P['arc_detour'], a_end)]
    n = max(6, int(abs(a_exit - a_end) / 2))
    pts += [pol(P['arc_detour'], a_end + (a_exit - a_end) * j / n) for j in range(1, n + 1)]
    add(net, wire(pts))
    ESC[net] = [pts[-1]]
    ARRIVE[net] = pts[-1][0]

# ------------------------------------------------- two small straight sliders
ly0, ly1 = P['lin_y']
hmax_l = 0.0
for i, (lx0, lx1) in enumerate(P['lin_x']):
    tag = 'L%d' % (i + 1)
    wsum = (lx1 - lx0) - P['lin_gap']
    hmax_l = wsum - P['lin_hmin']
    yA0, yA1 = ly0, ly1 - P['lin_off']                      # A thick at the bottom
    yB0, yB1 = ly0 + P['lin_off'], ly1                      # B thick at the top
    gA = Polygon([(lx0, yA0), (lx0 + hmax_l, yA0), (lx0 + P['lin_hmin'], yA1), (lx0, yA1)])
    gB = Polygon([(lx1, yB1), (lx1 - hmax_l, yB1), (lx1 - P['lin_hmin'], yB0), (lx1, yB0)])
    add(tag + '_A', gA); add(tag + '_B', gB)
    SLD[tag] = dict(kind='linear', x=[lx0, lx1], y=[ly0, ly1], a=[yA0, yA1], b=[yB0, yB1])
    xa = lx0 + hmax_l / 2
    ESC[tag + '_A'] = [(xa, ly0 + 1.0)]
    ARRIVE[tag + '_A'] = xa
    xb = lx1 - hmax_l / 2
    cor = P['lin_cor'][i]
    ESC[tag + '_B'] = [(xb, ly1 - 1.2), (cor, ly1 - 1.2)]
    ARRIVE[tag + '_B'] = cor

# ------------------------------------------------- single-row rail + monotone fan
order = sorted(NETS, key=lambda k: ARRIVE[k])
x0 = CX - (P['rail_n'] - 1) * P['rail_pitch'] / 2.0
TX = {k: x0 + i * P['rail_pitch'] for i, k in enumerate(order)}
travel = {k: abs(TX[k] - ARRIVE[k]) for k in order}
SPAN = {k: (min(TX[k], ARRIVE[k]), max(TX[k], ARRIVE[k])) for k in order}
MARG = P['tw'] + P['clr']
def clears(lo, hi, x): return x < lo - MARG or x > hi + MARG
LANE, used = {}, {y: [] for y in P['lanes']}
NEARER = {y: i for i, y in enumerate(P['lanes'])}
for net in sorted(order, key=lambda k: travel[k], reverse=True):
    lo, hi = SPAN[net]
    for y in P['lanes']:
        ok = all(hi < a - MARG or lo > b + MARG for a, b, _ in used[y])
        for yy in P['lanes']:
            for a, b, q in used[yy]:
                if NEARER[yy] > NEARER[y]:
                    ok &= clears(a, b, TX[net]) and clears(lo, hi, ARRIVE[q])
                elif NEARER[yy] < NEARER[y]:
                    ok &= clears(a, b, ARRIVE[net]) and clears(lo, hi, TX[q])
        if ok:
            LANE[net] = y; used[y].append((lo, hi, net)); break
    else:
        raise SystemExit('no free fan lane for %s: add a lane' % net)
for i, net in enumerate(order):
    cx = TX[net]
    deep = i % 2 == 0
    h = P['rail_deep'] if deep else P['rail_shallow']
    add(net, wire(ESC[net] + [(ARRIVE[net], LANE[net]), (cx, LANE[net]),
                              (cx, P['rail_y0'] + h - 1.0)]))
    add(net, rr(cx - P['rail_w'] / 2, P['rail_y0'], cx + P['rail_w'] / 2,
                P['rail_y0'] + h, P['rail_r']))
    TERM[net] = dict(cx=cx, y=P['rail_y0'], h=h, deep=deep, net=net, idx=i, label=LABEL[net])

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
ARCFACE = annulus(r_in + 0.6, r_out - 0.6, ab0 + 1.0, aa1 - 1.0)
LINFACE = [box(x[0] + 0.6, ly0 + 0.6, x[1] - 0.6, ly1 - 0.6) for x in P['lin_x']]
ACCENT = [annulus(pd['r0'] + P['accent_inset'], pd['r1'] - P['accent_inset'],
                  pd['a0'] + 0.5, pd['a1'] - 0.5).buffer(-0.8, join_style=1).buffer(0.8, join_style=1)
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
    e = NET[k].buffer(-0.55)
    gate(not e.is_empty, 'net %-5s survives the 1.10 mm erode test' % k)
for k, pd in PADS.items():
    gate(NET[k].contains(annulus(pd['r0'] + 2.0, pd['r1'] - 2.0, pd['a0'] + 1.2, pd['a1'] - 1.2)),
         'blade %s is solid copper' % k)
gate(min(ELEC[k].area for k in ELEC) > 120,
     'smallest blade plate %.0f mm2 (a fingertip is about 100)' % min(ELEC[k].area for k in ELEC))

# arc slider
rat = []
oa0, oa1 = aa0 + 2.0, ab1 - 2.0
for i in range(41):
    a = oa0 + i * (oa1 - oa0) / 40.0
    sl = annulus(r_in - 1, r_out + 1, a - 0.5, a + 0.5)
    x, y = NET['AR_A'].intersection(sl).area, NET['AR_B'].intersection(sl).area
    rat.append(x / (x + y) if x + y > 0 else 0)
gate(all(rat[i] < rat[i + 1] + 1e-6 for i in range(len(rat) - 1)), 'arc ratio monotone along the sweep')
gate(0.10 < min(rat) and max(rat) < 0.90, 'arc span %.3f to %.3f, off both rails' % (min(rat), max(rat)))
SLD['AR']['span'] = [round(min(rat), 3), round(max(rat), 3)]
arc_sweep = math.radians(oa1 - oa0) * (r_in + r_out) / 2
gate(40 < arc_sweep < 100, 'arc sweep %.0f mm, small by design' % arc_sweep)

# straight sliders
for tag in ('L1', 'L2'):
    ra = []
    lx0, lx1 = SLD[tag]['x']
    for i in range(41):
        y = ly0 + 3.0 + i * ((ly1 - 3.0) - (ly0 + 3.0)) / 40.0
        sl = box(lx0 - 1, y - 0.35, lx1 + 1, y + 0.35)
        x, z = NET[tag + '_A'].intersection(sl).area, NET[tag + '_B'].intersection(sl).area
        ra.append(x / (x + z) if x + z > 0 else 0)
    gate(all(ra[i] > ra[i + 1] - 1e-6 for i in range(len(ra) - 1)),
         'slider %s ratio monotone bottom to top' % tag)
    gate(0.10 < min(ra) and max(ra) < 0.90,
         'slider %s span %.3f to %.3f, off both rails' % (tag, max(ra), min(ra)))
    SLD[tag]['span'] = [round(max(ra), 3), round(min(ra), 3)]
gate(30 < (ly1 - ly0) < 60, 'straight slider travel %.0f mm, small by design' % (ly1 - ly0))

ts = sorted(TERM.values(), key=lambda t: t['cx'])
gate(len(TERM) == 18 and len(NETS) == 18, 'exactly 18 channels: two MPR121 on one bus, 18 of 24 used')
gate(min(ts[i + 1]['cx'] - ts[i]['cx'] for i in range(len(ts) - 1)) >= 12.5,
     'rail is ONE row on %.1f mm pitch' % P['rail_pitch'])
gate(P['rail_pitch'] - P['rail_w'] >= 3.5, 'rail finger gap %.1f mm' % (P['rail_pitch'] - P['rail_w']))
gate(abs(P['rail_deep'] - P['rail_shallow']) >= 4.0,
     'alternating finger depth %.1f mm so adjacent clip bodies nest'
     % abs(P['rail_deep'] - P['rail_shallow']))
gate(all(t['deep'] != ts[i + 1]['deep'] for i, t in enumerate(ts[:-1])), 'depth alternates every finger')
gate(all(abs(TERM[k]['cx'] - x0 - i * P['rail_pitch']) < 1e-9 for i, k in enumerate(order)),
     'rail order follows arrival order (monotone fan)')
gate(len(set(LANE.values())) <= len(P['lanes']),
     'fan fits %d lanes for %d nets' % (len(set(LANE.values())), len(NETS)))

live = COPPER.difference(RAILZONE.buffer(4.0))
unc = live.difference(VINYL.buffer(-0.001))
gate(unc.area < 0.5, 'vinyl covers all live copper outside the rail zone (%.2f mm2 bare)' % unc.area)
gate(VINYL.intersection(RAIL).area < 0.01, 'vinyl clears every rail finger')
for k, g in ELEC.items():
    gate(VINYL.buffer(-P['vinyl_out']).contains(g), 'vinyl overhangs blade %s' % k)
gate(VINYL.buffer(-P['vinyl_out']).contains(unary_union([ARC_A, ARC_B])),
     'vinyl overhangs the arc slider')
gate(VINYL.buffer(-P['vinyl_out']).contains(unary_union(
     [box(x[0], ly0, x[1], ly1) for x in P['lin_x']])), 'vinyl overhangs both straight sliders')
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
    'SPLINE rev A  copper: 12 blade keys, 1 arc + 2 straight sliders, 18 finger rail')
svg('02_vinyl_face.svg', [(unary_union([VINYL, RIM]), K, 1, None, 0)],
    'SPLINE rev A  vinyl faceplate, the dielectric you touch')
svg('04_vinyl_accents.svg', [(unary_union(ACCENT + [RIM]), K, 1, None, 0)],
    'SPLINE rev A  accent tiles, second colour vinyl (optional)')
svg('05_backer.svg', [(RIM, K, 1, None, 0)], 'SPLINE rev A  backer, 2 mm chipboard')

txf, txg = [], []
def T(t, cap, x, y, font=FONT_S, guide=False, anchor='c'):
    g, _ = svgpath.text_geom(t, font, cap, x, y, anchor=anchor)
    (txg if guide else txf).append(g)
for k, t in TERM.items():
    T(t['label'], 2.0, t['cx'], t['y'] + t['h'] + 1.6, guide=True)
for k, pd in PADS.items():
    x, y = pol(pd['r1'] - 6.0, pd['mid'])
    T(k[1:], 4.2, x, y, FONT_B)
T('ARC', 2.4, *pol((r_in + r_out) / 2, aa1 + 4.0), font=FONT_B)
for z in range(9):
    a = oa0 + z * (oa1 - oa0) / 8.0
    txf.append(LineString([pol(r_in + 0.4, a), pol(r_in + 2.4, a)]).buffer(0.35, cap_style=2))
for i, (lx0, lx1) in enumerate(P['lin_x']):
    T('SL%d' % (i + 1), 2.4, (lx0 + lx1) / 2, ly1 + 2.4, FONT_B)
    for z in range(9):
        y = ly0 + 2.0 + z * ((ly1 - 2.0) - (ly0 + 2.0)) / 8.0
        txf.append(box(lx0 - 2.6, y - 0.35, lx0 - 0.8, y + 0.35))
T('SPLINE REV A . 18 CHANNELS', 2.2, 200.0, 136.0)
T('12 BLADE KEYS . 1 ARC + 2 SLIDERS', 2.2, 200.0, 131.4)
T('18 CONTACTS IN ONE ROW . NO VELOSTAT . NO COMPONENTS', 2.2, 121.0, 51.0)
T('make things. break things. repeat.', 2.0, 121.0, 46.0, FONT_R)

svg('00_guide_under.svg',
    [(unary_union(list(NET.values())), PK, .32, None, 0),
     (VINYL, None, 1, PK, -0.3),
     (BRAND_K, K, 1, None, 0), (BRAND_PK, PK, 1, None, 0),
     (unary_union(txf + txg), K, 1, None, 0)],
    'SPLINE rev A  placement guide (print then cut, goes under the copper)', bg=CR)
svg('03_faceplate_print.svg',
    [(FACE, CR, 1, None, 0),
     (unary_union(ACCENT), GLD, .22, None, 0),
     (unary_union([ARCFACE] + LINFACE), None, 1, K, 0.35),
     (BRAND_K.intersection(FACE), K, 1, None, 0), (BRAND_PK.intersection(FACE), PK, 1, None, 0),
     (unary_union(txf).intersection(FACE), K, 1, None, 0)],
    'SPLINE rev A  printed faceplate (print then cut, top layer)')

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
    pads=PADS, sliders=SLD, terminals=TERM, hub=[CX, CY],
    stats=dict(copper_area=round(COPPER.area, 1), channels=len(NETS),
               min_clearance=round(worst[0], 3), arc_sweep_mm=round(arc_sweep, 0),
               lin_travel_mm=round(ly1 - ly0, 0), lanes_used=len(set(LANE.values())),
               vinyl_area=round(VINYL.area, 1), rail_pitch=P['rail_pitch'], rail_rows=1,
               blade_area=round(min(ELEC[k].area for k in ELEC), 0)),
    ), open(OUT + '/spline_geometry.json', 'w'), separators=(',', ':'))

print('\n'.join(notes))
print('\nGATES %d passed %d failed' % (len(notes), len(fails)))
print('%s rev %s   %.0f x %.0f mm   %d channels in ONE row of %d   %.0f mm2 copper   min clr %.2f mm'
      % (P['name'], P['rev'], P['W'], P['H'], len(NETS), P['rail_n'], COPPER.area, worst[0]))
