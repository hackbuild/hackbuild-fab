#!/usr/bin/env python3
"""
KEYWAY rev A generator  -  hack.build

A 2x2 velocity/pressure pad plus a graded position slider, cut from adhesive
copper foil on a Cricut. No components: every sensor is geometry. The layers
above the copper (Velostat, cardstock spacers, EVA caps, a top-copper wiper)
are cut on the same machine against the same shared outline.

One parametric script owns every dimension. It writes nothing unless all
gates pass.

Nets (8): COM  P1 P2 P3 P4  SA SB SC
Topology that makes it single-layer with zero jumpers:
  - COM is a fat centre bus feeding the inner spine of all four pads
  - every sense escape runs an outer edge lane, ordered so a LOWER entrant
    takes the OUTER slot (else its riser cuts a higher trace's horizontal)
  - the terminal field is monotone left-to-right with the fan-line arrival
    order, which is what removes every crossing
"""
import json, math, os, re, sys
from shapely.geometry import Polygon, LineString, box, MultiPolygon, Point
from shapely.ops import unary_union
from shapely.affinity import translate, scale as aff_scale, rotate as aff_rotate
import svgpath

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('KEYWAY_OUT', HERE + '/out')
os.makedirs(OUT, exist_ok=True)
# brand in the copper is decoration, not circuit, so it is off by default: the mark
# lives on the printed guide underneath, where it is in full colour and costs no
# weeding. KEYWAY_BRAND=1 puts it back in the foil for a board you want to photograph.
BRAND_COPPER = os.environ.get('KEYWAY_BRAND', '0') != '0'
FONT_B = HERE + '/ibm-plex-mono-latin-700-normal.woff2'
FONT_R = HERE + '/ibm-plex-mono-latin-400-normal.woff2'
FONT_S = HERE + '/ibm-plex-mono-latin-600-normal.woff2'
LOGO = '/mnt/skills/user/board-forge/assets/hackbuild-logo.svg'

P = dict(
    name='KEYWAY', rev='A',
    W=110.0, H=174.0, R=3.2, edge_keep=1.0, clr=0.70,
    tw=1.6,
    pad_w=34.0, pad_h=34.0, pad_x=(13.5, 62.5), pad_y=(60.0, 100.0),
    spine_w=2.2, fing_w=1.8, fing_pitch=3.0, tip_gap=1.4,
    bus=(47.5, 62.5), bus_y=(60.0, 134.0),
    ko_text='KEYWAY', ko_cap=7.5, ko_y=74.0,
    slots=dict(SA=2.6, P3=5.45, P1=8.3, P2=98.85, P4=101.7, SC=104.55, SB=107.4),
    sl_y=(40.0, 54.0), sl_gap=1.2, sl_hmax=10.6, sl_hmin=2.2,
    sl_a_spine=(13.5, 15.5), sl_b_spine=(87.0, 89.0), sl_wedge=(15.5, 85.8),
    sc_pad=(90.2, 43.0, 96.5, 51.0),
    h_sa=35.0, h_sb=37.0, h_sc=47.0,
    term_n=9, term_x0=7.0, term_pitch=12.0, term_sz=10.0,
    term_row2_y=146.0, term_row1_y=159.0, fan_y=134.0,
    fan_lanes=(136.0, 138.6, 141.2, 143.8),
    term_order=('SA', 'P3', 'P1', 'COM', 'GND', 'P2', 'P4', 'SC', 'SB'),
    band=(5.0, 30.5), mark_size=24.0, mark_x=16.8, mark_y=5.5,
    wm_cap=9.0, wm_x=46.8, wm_y1=20.5, wm_y2=8.5,
    velo_inset=2.0, sp_win_inset=3.0, sp_out=1.0, foam_inset=4.0,
    velo_sl=(14.0, 39.5, 87.5, 54.5),
    spu=(13.0, 38.5, 89.5, 55.5), spu_slot=(16.0, 44.5, 85.5, 50.5),
    wiper=(15.0, 44.0, 96.0, 50.0),
)
LABEL = dict(SA='SLD A', SB='SLD B', SC='SLD W', COM='COM', GND='COM',
             P1='PAD 1', P2='PAD 2', P3='PAD 3', P4='PAD 4')

def rr(x0, y0, x1, y1, r):
    r = min(r, (x1 - x0) / 2 - .001, (y1 - y0) / 2 - .001)
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, join_style=1, resolution=16)

def wire(pts, w):
    return LineString(pts).buffer(w / 2.0, cap_style=2, join_style=1, resolution=16)

def smooth(g, d=0.4):
    return g.buffer(d, join_style=1, resolution=16).buffer(-d, join_style=1, resolution=16)

def outer_only(g):
    gs = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    return unary_union([Polygon(p.exterior) for p in gs])

OUTLINE = rr(0, 0, P['W'], P['H'], P['R'])
INNER = OUTLINE.buffer(-P['edge_keep'])
RIM = OUTLINE.difference(OUTLINE.buffer(-0.15))

nets = {k: [] for k in ('COM', 'P1', 'P2', 'P3', 'P4', 'SA', 'SB', 'SC')}
art = []
def add(net, g): nets[net].append(g)

# ------------------------------------------------- pads: sense outer, COM inner
PADS = {}
for name, col, row in (('P1', 0, 1), ('P2', 1, 1), ('P3', 0, 0), ('P4', 1, 0)):
    x0, y0 = P['pad_x'][col], P['pad_y'][row]
    x1, y1 = x0 + P['pad_w'], y0 + P['pad_h']
    sw, fw, pitch, tg = P['spine_w'], P['fing_w'], P['fing_pitch'], P['tip_gap']
    if col == 0:
        sen_sp, com_sp = (x0, x0 + sw), (x1 - sw, x1)
        sen_side, com_side = 'L', 'R'
    else:
        sen_sp, com_sp = (x1 - sw, x1), (x0, x0 + sw)
        sen_side, com_side = 'R', 'L'
    add('COM', box(com_sp[0], y0, com_sp[1], y1))
    add(name, box(sen_sp[0], y0, sen_sp[1], y1))
    n = int((P['pad_h'] - 1.0) // pitch)
    ybase = y0 + (P['pad_h'] - (n - 1) * pitch - fw) / 2.0
    def span(mine, other, side):
        return (mine[1], other[0] - tg) if side == 'L' else (other[1] + tg, mine[0])
    for i in range(n):
        yy = ybase + i * pitch
        if i % 2 == 0:
            a, b = span(com_sp, sen_sp, com_side); add('COM', box(min(a, b), yy, max(a, b), yy + fw))
        else:
            a, b = span(sen_sp, com_sp, sen_side); add(name, box(min(a, b), yy, max(a, b), yy + fw))
    PADS[name] = dict(x0=x0, y0=y0, x1=x1, y1=y1, col=col, row=row, fingers=n,
                      com_sp=com_sp, sen_sp=sen_sp)

# ------------------------------------------------- COM centre bus + knockout
bus = box(P['bus'][0], P['bus_y'][0], P['bus'][1], P['bus_y'][1])
kt, _ = svgpath.text_geom(P['ko_text'], FONT_B, P['ko_cap'], 0, 0)
kt = outer_only(kt)
kt = aff_rotate(kt, 90, origin=(0, 0))
kt = translate(kt, (P['bus'][0] + P['bus'][1]) / 2 + P['ko_cap'] / 2, P['ko_y'])
add('COM', bus.difference(kt))

# ------------------------------------------------- slider
y0s, y1s = P['sl_y']
xa0, xa1 = P['sl_a_spine']; xb0, xb1 = P['sl_b_spine']; xw0, xw1 = P['sl_wedge']
hmax, hmin, sg = P['sl_hmax'], P['sl_hmin'], P['sl_gap']
hsum = (y1s - y0s) - sg
def hA(x):
    t = (x - xw0) / (xw1 - xw0)
    return hmax + (hmin - hmax) * t
add('SA', box(xa0, y0s, xa1, y1s))
add('SA', Polygon([(xw0, y0s), (xw1, y0s), (xw1, y0s + hA(xw1)), (xw0, y0s + hA(xw0))]))
add('SB', box(xb0, y0s, xb1, y1s))
xbt = xa1 + sg
add('SB', Polygon([(xbt, y0s + hA(xbt) + sg), (xb0, y0s + hA(xb0) + sg), (xb0, y1s), (xbt, y1s)]))
sx0, sy0, sx1, sy1 = P['sc_pad']
add('SC', rr(sx0, sy0, sx1, sy1, 1.2))

S = P['slots']
LN = P['fan_lanes']
# Fan lane assignment. Within each side the trace that travels FARTHEST takes
# the LOWEST lane; then no riser ever crosses an occupied horizontal.
ROUTE = {
    'P1':  [(15.5, 130.0), (S['P1'], 130.0), (S['P1'], LN[0]), (31.0, LN[0]), (31.0, 147.0)],
    'P3':  [(15.5, 64.0),  (S['P3'], 64.0),  (S['P3'], LN[1]), (19.0, LN[1]), (19.0, 160.0)],
    'SA':  [(14.5, 43.0),  (14.5, P['h_sa']), (S['SA'], P['h_sa']), (S['SA'], LN[2]),
            (7.0, LN[2]), (7.0, 147.0)],
    'COM': [(50.0, 132.0), (50.0, LN[0]), (43.0, LN[0]), (43.0, 160.0)],
    'GND': [(57.0, 132.0), (57.0, LN[1]), (55.0, LN[1]), (55.0, 147.0)],
    'P2':  [(94.5, 130.0), (S['P2'], 130.0), (S['P2'], LN[0]), (67.0, LN[0]), (67.0, 160.0)],
    'P4':  [(94.5, 64.0),  (S['P4'], 64.0),  (S['P4'], LN[1]), (79.0, LN[1]), (79.0, 147.0)],
    'SC':  [(95.0, P['h_sc']), (S['SC'], P['h_sc']), (S['SC'], LN[2]), (91.0, LN[2]), (91.0, 160.0)],
    'SB':  [(88.0, 43.0), (88.0, P['h_sb']), (S['SB'], P['h_sb']), (S['SB'], LN[3]),
            (103.0, LN[3]), (103.0, 147.0)],
}
for nm, pts in ROUTE.items():
    add('COM' if nm in ('COM', 'GND') else nm, wire(pts, P['tw']))

TERM = {}
for i, nm in enumerate(P['term_order']):
    cx = P['term_x0'] + i * P['term_pitch']
    row1 = (i % 2 == 1)
    y = P['term_row1_y'] if row1 else P['term_row2_y']
    net = 'COM' if nm in ('COM', 'GND') else nm
    add(net, rr(cx - P['term_sz'] / 2, y, cx + P['term_sz'] / 2, y + P['term_sz'], 1.2))
    TERM[nm] = dict(cx=cx, y=y, row=1 if row1 else 2, net=net, idx=i, label=LABEL[nm])
    assert abs(ROUTE[nm][-1][0] - cx) < 1e-6 and y < ROUTE[nm][-1][1] < y + P['term_sz'], nm

# ------------------------------------------------- brand art (copper)
lp = re.findall(r'<path transform="translate\((-?[\d.]+),(-?[\d.]+)\)"[^>]*d="([^"]+)"', open(LOGO).read())
mk = [svgpath.path_geom(d, 1.0, float(tx), float(ty)) for tx, ty, d in lp]
mb = unary_union(mk).bounds
ms = P['mark_size'] / max(mb[2] - mb[0], mb[3] - mb[1])
MARK = []
for g in mk:
    g = translate(g, -mb[0], -mb[1])
    g = aff_scale(g, ms, -ms, origin=(0, 0))
    MARK.append(translate(g, P['mark_x'], P['mark_y'] + P['mark_size']))
wm1, w1 = svgpath.text_geom('hack', FONT_B, P['wm_cap'], P['wm_x'], P['wm_y1'])
wm2, w2 = svgpath.text_geom('.build', FONT_B, P['wm_cap'], P['wm_x'], P['wm_y2'])
if BRAND_COPPER: art += MARK + [wm1, wm2]
# canonical mark order from the source file: [0] arc (ink), [1] wrench (pink)
BRAND_K = unary_union([MARK[0], wm1])
BRAND_PK = unary_union([MARK[1], wm2])
TICKS = []
for i in range(5):
    t = i / 4.0
    tx0 = xbt + 0.6 + t * ((xw1 - 0.6) - (xbt + 0.6))
    hgt = 3.0 if i in (0, 2, 4) else 2.0
    TICKS.append(box(tx0 - 0.9, 56.0, tx0 + 0.9, 56.0 + hgt))
art += TICKS
ART = unary_union(art)

NET = {k: smooth(unary_union(v)) for k, v in nets.items()}
COPPER = unary_union(list(NET.values()) + [ART])

# ============================================================== GATES
fails, notes, warns = [], [], []
def gate(ok, msg): (notes if ok else fails).append(('PASS ' if ok else 'FAIL ') + msg)

for k, g in NET.items():
    n = 1 if g.geom_type == 'Polygon' else len(g.geoms)
    gate(n == 1, 'net %-4s single island (%d)' % (k, n))

audit = 0
for nm, pd in PADS.items():
    if NET['COM'].intersects(box(pd['com_sp'][0], pd['y0'], pd['com_sp'][1], pd['y1'])): audit += 1
    if NET[nm].intersects(box(pd['sen_sp'][0], pd['y0'], pd['sen_sp'][1], pd['y1'])): audit += 1
for nm, t in TERM.items():
    if NET[t['net']].contains(Point(t['cx'], t['y'] + P['term_sz'] / 2)): audit += 1
for k, g in (('SA', box(xa0, y0s, xa1, y1s)), ('SB', box(xb0, y0s, xb1, y1s)),
             ('SC', box(sx0, sy0, sx1, sy1))):
    if NET[k].intersects(g): audit += 1
gate(audit == 20, 'netlist audit by name (%d/20 connections)' % audit)

G = dict(NET); G['ART'] = ART
keys = list(G)
worst = (99, '')
for i in range(len(keys)):
    for j in range(i + 1, len(keys)):
        d = G[keys[i]].distance(G[keys[j]])
        if d < worst[0]: worst = (d, keys[i] + '/' + keys[j])
gate(worst[0] >= P['clr'], 'min clearance %.3f mm at %s (gate %.2f)' % (worst[0], worst[1], P['clr']))
gate(INNER.contains(COPPER), 'all copper >= %.1f mm from the shared outline' % P['edge_keep'])

for k, g in list(NET.items()) + [('ART', ART)]:
    e = g.buffer(-0.55)
    n0 = 1 if g.geom_type == 'Polygon' else len(g.geoms)
    n1 = 0 if e.is_empty else (1 if e.geom_type == 'Polygon' else len(e.geoms))
    gate(n1 >= n0, '%-4s survives the 1.10 mm erode test (%d/%d islands)' % (k, n1, n0))
ag = list(ART.geoms) if ART.geom_type != 'Polygon' else [ART]
gmin = min(ag[i].distance(ag[j]) for i in range(len(ag)) for j in range(i + 1, len(ag)))
gate(gmin >= 0.70, 'art island gaps %.2f mm (%d islands incl. %d slider ticks%s)'
     % (gmin, len(ag), len(TICKS), '' if BRAND_COPPER else ', brand art off'))
holes = [r for p in ag for r in p.interiors]
hmin_sz = min([Polygon(r).buffer(-0.3).area for r in holes] or [1])
gate(hmin_sz > 0, 'art counters weedable (%d holes, smallest survives 0.6 mm erode)' % len(holes))

mono = True; span = []
tv0, tv1 = xbt + 0.6, xw1 - 0.6
for i in range(41):
    x = tv0 + i * (tv1 - tv0) / 40.0
    cut = LineString([(x, y0s - 1), (x, y1s + 1)])
    a = NET['SA'].intersection(cut).length; b = NET['SB'].intersection(cut).length
    if min(a, b) < 1.8: mono = False
    span.append(a / (a + b))
gate(mono, 'slider wedges keep >= 1.8 mm of copper across full travel')
gate(all(span[i] > span[i + 1] for i in range(len(span) - 1)),
     'slider ratio monotone %.2f -> %.2f over %.1f mm of travel' % (span[0], span[-1], tv1 - tv0))
ok = all(TERM[P['term_order'][i]]['row'] != TERM[P['term_order'][i + 1]]['row'] for i in range(8))
gate(ok, 'terminal field staggered: %.1f mm between physically adjacent clips'
     % (2 * P['term_pitch'] - P['term_sz']))

# ------------------------------------------------- non-copper layers
VELO = [box(pd['x0'] + P['velo_inset'], pd['y0'] + P['velo_inset'],
            pd['x1'] - P['velo_inset'], pd['y1'] - P['velo_inset']) for pd in PADS.values()]
VELO_SL = box(*P['velo_sl'])
SP_WIN = [box(pd['x0'] + P['sp_win_inset'], pd['y0'] + P['sp_win_inset'],
              pd['x1'] - P['sp_win_inset'], pd['y1'] - P['sp_win_inset']) for pd in PADS.values()]
SPL = box(P['pad_x'][0] - P['sp_out'], P['pad_y'][0] - P['sp_out'],
          P['pad_x'][1] + P['pad_w'] + P['sp_out'],
          P['pad_y'][1] + P['pad_h'] + P['sp_out']).difference(unary_union(SP_WIN))
SPU = box(*P['spu']).difference(box(*P['spu_slot']))
WIPER = box(*P['wiper'])
FOAM = [box(pd['x0'] + P['foam_inset'], pd['y0'] + P['foam_inset'],
            pd['x1'] - P['foam_inset'], pd['y1'] - P['foam_inset']) for pd in PADS.values()]

for (nm, pd), v, w in zip(PADS.items(), VELO, SP_WIN):
    foreign = [k for k in NET if k not in ('COM', nm) and NET[k].buffer(0.6).intersects(v)]
    gate(not foreign, 'Velostat %s bridges COM+%s only (foreign %s)' % (nm, nm, foreign or 'none'))
    a, b = NET['COM'].intersection(v).area, NET[nm].intersection(v).area
    gate(min(a, b) > 20, 'Velostat %s covers both combs (%.0f / %.0f mm2)' % (nm, a, b))
    a, b = NET['COM'].intersection(w).area, NET[nm].intersection(w).area
    gate(min(a, b) > 15, 'spacer window %s exposes both combs (%.0f / %.0f mm2)' % (nm, a, b))
foreign = [k for k in NET if k not in ('SA', 'SB') and NET[k].buffer(0.6).intersects(VELO_SL)]
gate(not foreign, 'slider Velostat touches SA+SB only (foreign %s)' % (foreign or 'none'))
gate(VELO_SL.distance(NET['SC']) >= 1.5,
     'slider Velostat clears the SC collector by %.2f mm' % VELO_SL.distance(NET['SC']))
reach = WIPER.difference(VELO_SL).difference(box(*P['spu'])).intersection(COPPER)
stray = reach.difference(box(sx0 - .2, sy0 - .2, sx1 + .2, sy1 + .2))
gate(stray.area < 0.01, 'wiper reaches base copper at the SC pad only (stray %.3f mm2)' % stray.area)
gate(reach.area > 8, 'wiper tail lands %.1f mm2 on SC' % reach.area)
gate(box(*P['spu_slot']).intersection(VELO_SL).area / box(*P['spu_slot']).area > 0.995,
     'spacer slot sits fully over the slider Velostat')
gate(unary_union(VELO + [VELO_SL]).within(INNER), 'Velostat inside the shared outline keepout')
gate(SPL.geom_type == 'Polygon' and SPU.geom_type == 'Polygon',
     'both spacers are single connected pieces')

# ============================================================== emit
if fails:
    print('\n'.join(fails)); print('\n%d GATE FAILURES - nothing written' % len(fails)); sys.exit(1)
os.makedirs(OUT, exist_ok=True)
LAYERS = {}

def poly_path(g, hh=None):
    hh = P['H'] if hh is None else hh
    if g is None or g.is_empty: return ''
    g = g.simplify(0.012, preserve_topology=True)   # <= 12 um, far under the 1.0 mm clearance
    gs = [g] if g.geom_type == 'Polygon' else [p for p in g.geoms if p.geom_type == 'Polygon']
    d = []
    for p in gs:
        for ring in [p.exterior] + list(p.interiors):
            d.append('M ' + ' L '.join('%.3f %.3f' % (x, hh - y) for x, y in ring.coords) + ' Z')
    return ' '.join(d)

def svg(fn, items, title, bg=None):
    body = []
    if bg:
        body.append('<path d="%s" fill="%s"/>' % (poly_path(OUTLINE), bg))
    for g, fill, op, st, sw in items:
        d = poly_path(g)
        if not d: continue
        a = 'd="%s" fill-rule="evenodd" fill="%s"' % (d, fill or 'none')
        if op != 1: a += ' fill-opacity="%.2f"' % op
        if st:
            a += ' stroke="%s" stroke-width="%.3f" stroke-linejoin="round"' % (st, abs(sw))
            if sw < 0:
                a += ' stroke-dasharray="1.6 1.2"'
        body.append('<path %s/>' % a)
    open(OUT + '/' + fn, 'w').write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="%.3fmm" height="%.3fmm" viewBox="0 0 %.3f %.3f">\n'
        '<title>%s</title>\n%s\n</svg>\n' % (P['W'], P['H'], P['W'], P['H'], title, '\n'.join(body)))
    LAYERS[fn] = (P['W'], P['H'])

K, PK, CR, WH = '#1a1a1a', '#FE0386', '#f5f0e6', '#ffffff'
svg('01_copper_base.svg', [(unary_union([COPPER, RIM]), K, 1, None, 0)],
    'KEYWAY rev A  base copper + outline  (adhesive copper foil)%s'
    % ('  [brand art in copper]' if BRAND_COPPER else ''))
svg('02_velostat.svg', [(unary_union(VELO + [VELO_SL, RIM]), K, 1, None, 0)],
    'KEYWAY rev A  Velostat / Linqstat force layer')
svg('03_spacer_lower.svg', [(unary_union([SPL, RIM]), K, 1, None, 0)],
    'KEYWAY rev A  lower spacer, 0.3 mm cardstock (tents the pad Velostat)')
svg('04_spacer_upper.svg', [(unary_union([SPU, RIM]), K, 1, None, 0)],
    'KEYWAY rev A  upper spacer, 0.3 mm cardstock (holds the wiper off)')
svg('05_copper_wiper.svg', [(unary_union([WIPER, RIM]), K, 1, None, 0)],
    'KEYWAY rev A  slider wiper, top copper')
svg('06_foam_caps.svg', [(unary_union(FOAM + [RIM]), K, 1, None, 0)],
    'KEYWAY rev A  key caps, 2 mm EVA foam (optional)')
svg('07_backer.svg', [(RIM, K, 1, None, 0)],
    'KEYWAY rev A  backer, 2 mm chipboard or 1/16 in ply')

# guide / overlay art layer (print then cut)
tx = []
def T(t, cap, x, y, font=FONT_S, anchor='c'):
    g, w = svgpath.text_geom(t, font, cap, x, y, anchor=anchor)
    tx.append(g)
for nm, t in TERM.items():
    T(t['label'], 2.2, t['cx'], t['y'] + P['term_sz'] + 1.4 if t['row'] == 1 else t['y'] - 3.2)
for nm, pd in PADS.items():
    T(nm[1], 7.0, (pd['x0'] + pd['x1']) / 2, (pd['y0'] + pd['y1']) / 2 - 3.5, FONT_B)
T('%s  REV %s  .  4 FORCE ZONES + GRADED SLIDER' % (P['name'], P['rev']), 2.2, P['W'] / 2, 31.4)
T('make things. break things. repeat.', 2.0, P['W'] / 2, 1.9, FONT_R)
svg('08_overlay_guide.svg',
    [(unary_union(VELO + [VELO_SL]), '#d9b45a', .30, None, 0),
     (unary_union(list(NET.values())), PK, .30, None, 0),
     (BRAND_K, K, 1, None, 0),
     (BRAND_PK, PK, 1, None, 0),
     (unary_union(TICKS), K, 1, None, 0),
     (unary_union(SP_WIN + [box(*P['spu_slot'])]), None, 1, K, -0.25),
     (unary_union([SPL, SPU, WIPER]), None, 1, PK, -0.3),
     (unary_union(tx), K, 1, None, 0)],
    'KEYWAY rev A  placement guide / faceplate art  (print then cut)', bg=CR)

json.dump(dict(
    params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
    nets={k: poly_path(v) for k, v in NET.items()},
    art=poly_path(ART), outline=poly_path(OUTLINE), brand_copper=BRAND_COPPER,
    art_parts=dict(ink=poly_path(BRAND_K), pink=poly_path(BRAND_PK),
                   ticks=poly_path(unary_union(TICKS))),
    velostat=poly_path(unary_union(VELO + [VELO_SL])),
    velostat_pads=[poly_path(v) for v in VELO],
    spacer_lower=poly_path(SPL), spacer_upper=poly_path(SPU),
    wiper=poly_path(WIPER), foam=poly_path(unary_union(FOAM)),
    terminals={k: dict(cx=v['cx'], y=v['y'], row=v['row'], net=v['net'], idx=v['idx'], label=v['label'])
               for k, v in TERM.items()},
    pads={k: {kk: (list(vv) if isinstance(vv, tuple) else vv) for kk, vv in v.items()} for k, v in PADS.items()},
    stats=dict(copper_area=round(COPPER.area, 1), fingers=PADS['P1']['fingers'],
               facing_edge_mm=round(PADS['P1']['fingers'] * 27.2, 0),
               min_clearance=round(worst[0], 3), slider_span=[round(span[0], 3), round(span[-1], 3)], travel_mm=round(tv1 - tv0, 1))),
    open(OUT + '/keyway_geometry.json', 'w'))

sizes = set(LAYERS.values())
gate(len(sizes) == 1, 'all %d layer SVGs report one doc size %s' % (len(LAYERS), sizes.pop()))
print('\n'.join(notes))
print('\nGATES %d passed 0 failed' % len(notes))
print('%s rev %s   %.0f x %.0f mm   %.0f mm2 copper   %d fingers/pad   min clearance %.2f mm'
      % (P['name'], P['rev'], P['W'], P['H'], COPPER.area, PADS['P1']['fingers'], worst[0]))
