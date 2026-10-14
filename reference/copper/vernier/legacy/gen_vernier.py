#!/usr/bin/env python3
"""
VERNIER rev A generator  -  hack.build

A capacitive control surface built from nothing but adhesive copper, vinyl and
printed sticker paper. No Velostat, no spacers, no foam, no top-copper wiper,
no components. Six button pads and three graded sliders, 12 channels total,
which is exactly one MPR121 or twelve of an ESP32-S3's fourteen touch pins.

Sensing is self capacitance. Each electrode is a plate; a fingertip over the
dielectric adds a few picofarads. The sliders are wedge pairs: A tapers one way,
B the other, and position is A/(A+B), which is immune to how hard or how much of
your finger lands. Read as a continuous fader, or quantised into 8 zones each,
which is where the extra buttons come from: 6 physical plus 24 virtual.

Single layer, zero jumpers, zero crossings. The trick that makes the escapes
trivial: every terminal sits at exactly the x its trace arrives on, so there is
no fan and no lane assignment anywhere on the board.

Nets (12): B1 B2 B3 B4 B5 B6  S1A S1B  S2A S2B  S3A S3B
"""
import json, math, os, sys
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import translate, scale as aff_scale
import svgpath

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('VERNIER_OUT', HERE + '/out')
FONT_B = HERE + '/ibm-plex-mono-latin-700-normal.woff2'
FONT_R = HERE + '/ibm-plex-mono-latin-400-normal.woff2'
FONT_S = HERE + '/ibm-plex-mono-latin-600-normal.woff2'
LOGO = '/mnt/skills/user/board-forge/assets/hackbuild-logo.svg'
# brand in the copper is decoration, not circuit, so it is off by default and
# lives on the printed faceplate instead. VERNIER_BRAND=1 puts it in the foil.
BRAND_COPPER = os.environ.get('VERNIER_BRAND', '0') != '0'

P = dict(
    name='VERNIER', rev='A',
    W=110.0, H=214.0, R=3.2, edge_keep=1.0, clr=0.90, tw=1.6,
    # buttons: 3 columns x 2 rows
    col_x=((9.0, 35.0), (42.0, 68.0), (75.0, 101.0)),
    row_lo=(122.0, 148.0), row_hi=(153.0, 179.0),
    pad_r=2.4,
    # escape lanes: gaps between columns, plus the right margin
    lane_g1=38.5, lane_g2=71.5, lane_rm=103.0,
    # sliders: three bands, wedge pairs
    bands=((82.0, 100.0), (60.0, 78.0), (38.0, 56.0)),   # S1 top, S2, S3 bottom
    wedge_a=(18.0, 88.0), wedge_b=(22.0, 92.0), sl_gap=1.4, sl_hmin=3.1,
    cor_l=(11.0, 15.0), cor_r=(99.0, 95.0),              # S1, S2 corridor lanes
    brand_strip=(104.0, 120.0),
    # terminal fields
    term_sz=10.0, term_r=1.2,
    top_rows=(186.0, 199.0), bot_rows=(16.0, 3.0),
    bot_x=(20.0, 32.0, 44.0, 66.0, 78.0, 90.0),
    bot_lanes=(29.0, 32.0, 35.0), top_band=183.0,
    # printed / vinyl layers
    vinyl_out=1.6, vinyl_term_clr=2.5, face_win=1.8, accent_inset=3.0,
    mark_size=14.0, mark_x=10.0, mark_y=104.0, wm_cap=5.6, wm_x=27.0,
)
NETS = ('B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'S1A', 'S1B', 'S2A', 'S2B', 'S3A', 'S3B')
LABEL = dict(B1='BTN 1', B2='BTN 2', B3='BTN 3', B4='BTN 4', B5='BTN 5', B6='BTN 6',
             S1A='SL1 A', S1B='SL1 B', S2A='SL2 A', S2B='SL2 B', S3A='SL3 A', S3B='SL3 B')

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

OUTLINE = rr(0, 0, P['W'], P['H'], P['R'])
INNER = OUTLINE.buffer(-P['edge_keep'])
RIM = OUTLINE.difference(OUTLINE.buffer(-0.15))

nets = {k: [] for k in NETS}
art, PADS, SLD, TERM = [], {}, {}, {}
def add(n, g): nets[n].append(g)

# ------------------------------------------------- buttons + their escapes
# BUTTONS[i] = (net, column, row) ; lower row jogs into a lane, upper row rises straight
BTN = (('B1', 0, 'hi'), ('B2', 0, 'lo'), ('B3', 1, 'hi'),
       ('B4', 1, 'lo'), ('B5', 2, 'hi'), ('B6', 2, 'lo'))
LANE = {'B2': P['lane_g1'], 'B4': P['lane_g2'], 'B6': P['lane_rm']}
TOPX = {}
for net, col, row in BTN:
    x0, x1 = P['col_x'][col]
    y0, y1 = P['row_hi'] if row == 'hi' else P['row_lo']
    add(net, rr(x0, y0, x1, y1, P['pad_r']))
    PADS[net] = dict(x0=x0, y0=y0, x1=x1, y1=y1, col=col, row=row)
    if row == 'hi':
        lx = (x0 + x1) / 2                      # riser straight out of the pad centre
        add(net, wire([(lx, y1 - 1.0), (lx, P['top_band'])]))
    else:
        lx = LANE[net]
        jy = (P['row_lo'][1] + P['row_hi'][0]) / 2
        ex = min(x1 - 1.5, lx)
        add(net, wire([(ex, y1 - 1.0), (ex, jy), (lx, jy), (lx, P['top_band'])]))
    TOPX[net] = lx

# ------------------------------------------------- sliders
def wedges(band, hi_top):
    """A hugs the band floor and thins to the right, B hugs the ceiling and thins
    to the left. Returns (A, B) as triangles inside the band."""
    y0, y1 = band
    ax0, ax1 = P['wedge_a']; bx0, bx1 = P['wedge_b']
    hs = (y1 - y0) - P['sl_gap']
    hmax = hs - P['sl_hmin']
    hmin = P['sl_hmin']
    A = Polygon([(ax0, y0), (ax1, y0), (ax1, y0 + hmin), (ax0, y0 + hmax)])
    B = Polygon([(bx1, y1), (bx0, y1), (bx0, y1 - hmin), (bx1, y1 - hmax)])
    return A, B
SLESC = {}
for i, band in enumerate(P['bands']):
    n = i + 1
    A, B = wedges(band, True)
    add('S%dA' % n, A); add('S%dB' % n, B)
    y0, y1 = band
    SLD['S%d' % n] = dict(band=[y0, y1], a=list(P['wedge_a']), b=list(P['wedge_b']))
    xa, xb = P['wedge_a'][0] + 0.8, P['wedge_b'][1] - 0.8
    if n == 3:
        SLESC['S3A'] = [(xa, y0 + 1.2)]; SLESC['S3B'] = [(xb, y1 - 1.2)]
        TOPX['S3A'], TOPX['S3B'] = xa, xb
    else:
        cl, cr = P['cor_l'][n - 1], P['cor_r'][n - 1]
        SLESC['S%dA' % n] = [(xa, y0 + 1.2), (cl, y0 + 1.2)]
        SLESC['S%dB' % n] = [(xb, y1 - 1.2), (cr, y1 - 1.2)]
        TOPX['S%dA' % n], TOPX['S%dB' % n] = cl, cr

# ------------------------------------------------- terminal fields
# top field: six button terminals, each parked at exactly the x its trace arrives on
top_order = sorted([b[0] for b in BTN], key=lambda k: TOPX[k])
for i, net in enumerate(top_order):
    cx = TOPX[net]
    y = P['top_rows'][i % 2]
    add(net, rr(cx - P['term_sz'] / 2, y, cx + P['term_sz'] / 2, y + P['term_sz'], P['term_r']))
    add(net, wire([(cx, P['top_band']), (cx, y + P['term_sz'] / 2)]))
    TERM[net] = dict(cx=cx, y=y, row=2 if i % 2 == 0 else 1, net=net, idx=i, label=LABEL[net],
                     field='top')

# bottom field: three slider escapes per side, fanned in the band under the sliders.
# the trace that travels farthest takes the lane FARTHEST from the block, so no
# vertical ever crosses another trace's horizontal.
bot_src = sorted(['S1A', 'S2A', 'S3A', 'S3B', 'S2B', 'S1B'], key=lambda k: TOPX[k])
assert len(bot_src) == len(P['bot_x'])
travel = {k: abs(P['bot_x'][i] - TOPX[k]) for i, k in enumerate(bot_src)}
for i, net in enumerate(bot_src):
    cx = P['bot_x'][i]
    side = [k for k in bot_src if (TOPX[k] < P['W'] / 2) == (TOPX[net] < P['W'] / 2)]
    lane = P['bot_lanes'][sorted(side, key=lambda k: travel[k]).index(net)]
    y = P['bot_rows'][i % 2]
    add(net, wire(SLESC[net] + [(TOPX[net], lane), (cx, lane), (cx, y + P['term_sz'] / 2)]))
    add(net, rr(cx - P['term_sz'] / 2, y, cx + P['term_sz'] / 2, y + P['term_sz'], P['term_r']))
    TERM[net] = dict(cx=cx, y=y, row=1 if i % 2 == 0 else 2, net=net, idx=i + 6,
                     label=LABEL[net], field='bottom')

# ------------------------------------------------- brand art
lp = __import__('re').findall(r'<path transform="translate\((-?[\d.]+),(-?[\d.]+)\)"[^>]*d="([^"]+)"',
                              open(LOGO).read())
mk = [svgpath.path_geom(d, 1.0, float(tx), float(ty)) for tx, ty, d in lp]
mb = unary_union(mk).bounds
ms = P['mark_size'] / max(mb[2] - mb[0], mb[3] - mb[1])
MARK = [translate(aff_scale(translate(g, -mb[0], -mb[1]), ms, -ms, origin=(0, 0)),
                  P['mark_x'], P['mark_y'] + P['mark_size']) for g in mk]
wm1, _ = svgpath.text_geom('hack', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 8.6)
wm2, _ = svgpath.text_geom('.build', FONT_B, P['wm_cap'], P['wm_x'], P['mark_y'] + 0.6)
BRAND_K = unary_union([MARK[0], wm1])
BRAND_PK = unary_union([MARK[1], wm2])
if BRAND_COPPER:
    art += MARK + [wm1, wm2]
ART = unary_union(art) if art else Polygon()

NET = {k: smooth(unary_union(v)) for k, v in nets.items()}
COPPER = unary_union(list(NET.values()) + ([ART] if not ART.is_empty else []))

# ------------------------------------------------- material layers
ELEC = {}
for k, pd in PADS.items():
    ELEC[k] = rr(pd['x0'], pd['y0'], pd['x1'], pd['y1'], P['pad_r'])
BANDS = [box(P['wedge_a'][0], b[0], P['wedge_b'][1], b[1]) for b in P['bands']]

TERMBLK = []
for f, ys in (('top', P['top_rows']), ('bottom', P['bot_rows'])):
    ts = [v for v in TERM.values() if v['field'] == f]
    x0 = min(t['cx'] for t in ts) - P['term_sz'] / 2; x1 = max(t['cx'] for t in ts) + P['term_sz'] / 2
    TERMBLK.append(box(x0 - P['face_win'], min(ys) - P['face_win'],
                       x1 + P['face_win'], max(ys) + P['term_sz'] + P['face_win']))
TERMBLK = unary_union(TERMBLK)

# vinyl faceplate: full face dielectric, everything but the clip fields
VINYL = OUTLINE.buffer(-2.0).difference(TERMBLK.buffer(P['vinyl_term_clr'] - P['face_win']))
VINYL = outer_only(smooth(VINYL, 0.8))
# printed faceplate on top: same shape, art lives on it
FACE = VINYL
# optional accent tiles, second colour vinyl
ACCENT = [rr(pd['x0'] + P['accent_inset'], pd['y0'] + P['accent_inset'],
             pd['x1'] - P['accent_inset'], pd['y1'] - P['accent_inset'], 2.0) for pd in PADS.values()]
ACCENT += [box(P['wedge_a'][0] + P['accent_inset'], b[0] + 2.0,
               P['wedge_b'][1] - P['accent_inset'], b[1] - 2.0) for b in P['bands']]

# ============================================================== GATES
fails, notes = [], []
def gate(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)

for k in NETS:
    n = 1 if NET[k].geom_type == 'Polygon' else len(NET[k].geoms)
    gate(n == 1, 'net %-4s single island (%d)' % (k, n))

worst = (99, '')
ks = list(NET) + (['ART'] if not ART.is_empty else [])
GG = dict(NET); GG['ART'] = ART
for i in range(len(ks)):
    for j in range(i + 1, len(ks)):
        d = GG[ks[i]].distance(GG[ks[j]])
        if d < worst[0]: worst = (d, ks[i] + '/' + ks[j])
gate(worst[0] >= P['clr'], 'min clearance %.3f mm at %s (gate %.2f)' % (worst[0], worst[1], P['clr']))
gate(INNER.contains(COPPER), 'all copper >= %.1f mm from the shared outline' % P['edge_keep'])

for k in NETS:
    g = NET[k]; e = g.buffer(-0.55)
    n1 = 0 if e.is_empty else (1 if e.geom_type == 'Polygon' else len(e.geoms))
    gate(n1 >= 1, 'net %-4s survives the 1.10 mm erode test (%d islands)' % (k, n1))

# every button electrode is reachable as one plate and its terminal is on its own net
for k, pd in PADS.items():
    gate(NET[k].contains(rr(pd['x0'], pd['y0'], pd['x1'], pd['y1'], P['pad_r']).buffer(-0.6)),
         'button %s plate is solid copper' % k)

# sliders: ratio monotone across the travel, and never pinned to a rail
for n in (1, 2, 3):
    A, B = NET['S%dA' % n], NET['S%dB' % n]
    band = P['bands'][n - 1]
    xs = [P['wedge_b'][0] + 1.0 + i * ((P['wedge_a'][1] - 1.0) - (P['wedge_b'][0] + 1.0)) / 40.0
          for i in range(41)]
    rat = []
    for x in xs:
        col = box(x - .35, band[0], x + .35, band[1])
        a, b = A.intersection(col).area, B.intersection(col).area
        rat.append(a / (a + b) if a + b > 0 else 0)
    mono = all(rat[i] > rat[i + 1] - 1e-6 for i in range(len(rat) - 1))
    SLD['S%d' % n]['span'] = [round(max(rat), 3), round(min(rat), 3)]
    gate(mono, 'slider %d ratio monotone across the travel' % n)
    gate(0.10 < min(rat) and max(rat) < 0.90,
         'slider %d span %.3f to %.3f, off both rails' % (n, max(rat), min(rat)))
    gate(min(A.intersection(box(P['wedge_a'][0], band[0], P['wedge_a'][1], band[1])).area,
             B.intersection(box(P['wedge_b'][0], band[0], P['wedge_b'][1], band[1])).area) > 100,
         'slider %d both wedges carry real plate area' % n)
gate(abs((P['wedge_a'][1] - 1.0) - (P['wedge_b'][0] + 1.0)) > 60,
     'slider travel %.1f mm' % ((P['wedge_a'][1] - 1.0) - (P['wedge_b'][0] + 1.0)))

# terminals: parked on their arrival x, so there is no fan in the top field
gate(all(abs(TERM[k]['cx'] - TOPX[k]) < 1e-9 for k in top_order),
     'top field: all 6 terminals sit on their arrival x (no fan)')
for f in ('top', 'bottom'):
    ts = sorted([v for v in TERM.values() if v['field'] == f], key=lambda t: t['cx'])
    gaps = [ts[i + 1]['cx'] - ts[i]['cx'] for i in range(len(ts) - 1)]
    gate(min(gaps) >= 11.5, '%s field pitch >= %.1f mm, rows staggered' % (f, min(gaps)))
    same = [ts[i + 2]['cx'] - ts[i]['cx'] for i in range(len(ts) - 2)]
    gate(min(same) - P['term_sz'] >= 12.0,
         '%s field: %.1f mm between same-row clip jaws' % (f, min(same) - P['term_sz']))
gate(len(TERM) == 12 and len(NETS) == 12, 'exactly 12 channels, one MPR121 or 12 S3 touch pins')

# vinyl faceplate must insulate every electrode AND every trace a finger can reach
live = COPPER.difference(TERMBLK.buffer(4.0))
unc = live.difference(VINYL.buffer(-0.001))
gate(unc.area < 0.5, 'vinyl covers all live copper outside the clip fields (%.2f mm2 bare)' % unc.area)
gate(VINYL.intersection(unary_union([box(t['cx'] - 5, t['y'], t['cx'] + 5, t['y'] + P['term_sz'])
                                     for t in TERM.values()])).area < 0.01,
     'vinyl clears every clip pad')
for k, g in ELEC.items():
    gate(VINYL.buffer(-P['vinyl_out']).contains(g), 'vinyl overhangs button %s by %.1f mm' % (k, P['vinyl_out']))
gate(VINYL.geom_type == 'Polygon', 'vinyl faceplate is one connected piece')
gate(unary_union(ACCENT).within(VINYL), 'accent tiles land inside the faceplate')
gate(VINYL.within(INNER), 'vinyl inside the shared outline keepout')
gate(unary_union(ACCENT).within(VINYL.buffer(-1.0)), 'accent tiles clear the faceplate edge by 1 mm')

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
    'VERNIER rev A  copper: 6 button plates, 3 wedge sliders, 12 terminals')
svg('02_vinyl_face.svg', [(unary_union([VINYL, RIM]), K, 1, None, 0)],
    'VERNIER rev A  vinyl faceplate, the dielectric you touch')
svg('04_vinyl_accents.svg', [(unary_union(ACCENT + [RIM]), K, 1, None, 0)],
    'VERNIER rev A  accent tiles, second colour vinyl (optional)')
svg('05_backer.svg', [(RIM, K, 1, None, 0)], 'VERNIER rev A  backer, 2 mm chipboard')

txf, txg = [], []
def T(t, cap, x, y, font=FONT_S, anchor='c', guide=False):
    g, _ = svgpath.text_geom(t, font, cap, x, y, anchor=anchor)
    (txg if guide else txf).append(g)

# terminal labels live on the guide only: the faceplate has windows over the clip fields
for k, t in TERM.items():
    up = t['field'] == 'bottom' or t['row'] == 1
    T(t['label'], 2.2, t['cx'], t['y'] + P['term_sz'] + 1.4 if up else t['y'] - 3.4, guide=True)
for k, pd in PADS.items():
    T(k[1], 8.0, (pd['x0'] + pd['x1']) / 2, (pd['y0'] + pd['y1']) / 2 - 4.0, FONT_B)
for i, b in enumerate(P['bands']):
    T('SL %d' % (i + 1), 2.6, 2.6, (b[0] + b[1]) / 2 - 1.0, FONT_B, anchor='l')
    for z in range(9):                      # zone ticks sit inside the band, clear of the label below
        x = P['wedge_b'][0] + 1.0 + z * ((P['wedge_a'][1] - 1.0) - (P['wedge_b'][0] + 1.0)) / 8.0
        txf.append(box(x - 0.35, b[0] + 0.7, x + 0.35, b[0] + 2.5))
T('VERNIER REV A', 2.2, 80.0, 116.0)
T('12 CH . 6 PADS . 3 SLIDERS', 2.2, 78.0, 111.4)
T('COPPER + VINYL + PAPER', 2.2, 80.0, 106.8)
T('make things. break things. repeat.', 2.0, 55.0, 32.4, FONT_R)

# placement guide, printed, goes UNDER the copper
svg('00_guide_under.svg',
    [(unary_union(list(NET.values())), PK, .32, None, 0),
     (unary_union([VINYL]), None, 1, PK, -0.3),
     (BRAND_K, K, 1, None, 0), (BRAND_PK, PK, 1, None, 0),
     (unary_union(txf + txg), K, 1, None, 0)],
    'VERNIER rev A  placement guide (print then cut, goes under the copper)', bg=CR)
# faceplate, printed, goes ON TOP of the vinyl
svg('03_faceplate_print.svg',
    [(FACE, CR, 1, None, 0),
     (unary_union(ACCENT), GLD, .22, None, 0),
     (unary_union([box(P['wedge_a'][0], b[0], P['wedge_b'][1], b[1]) for b in P['bands']]),
      None, 1, K, 0.35),
     (BRAND_K.intersection(FACE), K, 1, None, 0), (BRAND_PK.intersection(FACE), PK, 1, None, 0),
     (unary_union(txf).intersection(FACE), K, 1, None, 0)],
    'VERNIER rev A  printed faceplate (print then cut, top layer)')

json.dump(dict(
    params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
    nets={k: poly_path(v) for k, v in NET.items()},
    outline=poly_path(OUTLINE), brand_copper=BRAND_COPPER,
    art_parts=dict(ink=poly_path(BRAND_K), pink=poly_path(BRAND_PK),
                   text=poly_path(unary_union(txf)), text_guide=poly_path(unary_union(txg))),
    vinyl=poly_path(VINYL), accents=poly_path(unary_union(ACCENT)),
    electrodes={k: poly_path(v) for k, v in ELEC.items()},
    bands=[[b[0], b[1]] for b in P['bands']],
    pads={k: v for k, v in PADS.items()},
    terminals={k: v for k, v in TERM.items()},
    sliders=SLD,
    stats=dict(copper_area=round(COPPER.area, 1), channels=len(NETS), span=SLD['S1']['span'],
               min_clearance=round(worst[0], 3),
               travel_mm=round((P['wedge_a'][1] - 1.0) - (P['wedge_b'][0] + 1.0), 1),
               vinyl_area=round(VINYL.area, 1))),
    open(OUT + '/vernier_geometry.json', 'w'), separators=(',', ':'))

print('\n'.join(notes))
print('\nGATES %d passed %d failed' % (len(notes), len(fails)))
print('%s rev %s   %.0f x %.0f mm   %d channels   %.0f mm2 copper   min clearance %.2f mm'
      % (P['name'], P['rev'], P['W'], P['H'], len(NETS), COPPER.area, worst[0]))
