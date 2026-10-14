"""DAVIT shared CAD library. Units mm. Z up in each part's authored frame.
House rules (per Moheeb's FDM standards): 45 deg self-supporting features,
vertical dims multiples of 0.2, walls multiples of 0.4, bore allowance
+0.20 vertical / +0.35 horizontal per side, booleans cut AFTER unions.
"""
import numpy as np, trimesh
from shapely.geometry import Polygon as shPoly
from trimesh.creation import box as _box, cylinder as _cyl

EPS = 0.01

def M(mesh):
    mesh.process(validate=True)
    return mesh

def box(sx, sy, sz, at=(0,0,0)):
    m = _box(extents=[sx,sy,sz]); m.apply_translation(at); return m

def cyl(d, h, at=(0,0,0), axis='z', seg=64):
    m = _cyl(radius=d/2.0, height=h, sections=seg)
    if axis=='x': m.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,1,0]))
    if axis=='y': m.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
    m.apply_translation(at); return m

def ngon(d_circum, h, n=10, at=(0,0,0), axis='z', rot=0.0):
    """n-gon prism, circumradius = d/2, axis-aligned."""
    ang = np.arange(n)/n*2*np.pi + rot
    pts = np.c_[np.cos(ang), np.sin(ang)]*d_circum/2.0
    m = trimesh.creation.extrude_polygon(shPoly(pts), height=h)
    m.apply_translation([0,0,-h/2])
    if axis=='x': m.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,1,0]))
    if axis=='y': m.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
    m.apply_translation(at); return m

def wedge45(sx, sy, sz, at=(0,0,0), flip=False):
    """Triangular prism: rect base sx*sy, apex ridge along y at +z (45 deg if sz=sx/2)."""
    s = -1 if flip else 1
    v = np.array([[-sx/2,-sy/2,0],[sx/2,-sy/2,0],[sx/2,sy/2,0],[-sx/2,sy/2,0],
                  [0,-sy/2,s*sz],[0,sy/2,s*sz]],float)
    f = np.array([[0,1,4],[1,2,5],[1,5,4],[2,3,5],[3,4,5],[3,0,4],[0,3,2],[0,2,1]])
    if flip: f = f[:,::-1]
    m = trimesh.Trimesh(vertices=v, faces=f); m.apply_translation(at); return M(m)

def gable_cut(sx, sy, z0, rise=None, at_xy=(0,0)):
    """Cutter add-on: 45deg gable roof void over a pocket ceiling at z0, ridge along y."""
    rise = rise if rise is not None else sx/2.0
    return wedge45(sx, sy, rise, at=(at_xy[0], at_xy[1], z0))

def tear(d, h, at=(0,0,0), axis='x', up=(0,0,1)):
    """Teardrop bore cutter: circle + 45 deg tangent roof toward `up`.
    Tangent points at r/sqrt2, apex at r*sqrt2. Axis x or y."""
    r=d/2.0; s=r/np.sqrt(2)
    ang=np.linspace(-np.pi*0.75, np.pi*0.75, 40)  # arc avoiding the roof gap
    pts=[(np.sin(a)*r, -np.cos(a)*r) for a in ang]
    pts=[(-s, s)]+[(0, r*np.sqrt(2))]+[(s, s)]+pts[::-1]
    m=trimesh.creation.extrude_polygon(shPoly(pts), height=h)
    m.apply_translation([0,0,-h/2])
    if tuple(up)==(0,0,-1):
        m.apply_transform(trimesh.transformations.rotation_matrix(np.pi,[1,0,0]))
    if axis=='x':
        m.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,1,0]))
    elif axis=='y':
        m.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
    m.apply_translation(at); return M(m)

def shield(d, h, at=(0,0,0), axis='x', arcseg=64):
    """Printable round journal profile for vertical printing: true semicircle
    on top (smooth round contact at every rotation angle), 45 deg V below
    (self supporting, vertex down). Max radius = d/2 everywhere."""
    r=d/2.0
    ang=np.linspace(0, np.pi, arcseg)          # equator to equator over the top
    arc=[(np.cos(a)*r, np.sin(a)*r) for a in ang]
    pts=arc+[(-r,0),(0,-r),(r,0)][1:2]         # V: (-r,0)->(0,-r)->(r,0)
    pts=arc+[(0,-r)]
    m=trimesh.creation.extrude_polygon(shPoly(pts), height=h)
    m.apply_translation([0,0,-h/2])
    if axis=='x':
        m.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,1,0]))
    elif axis=='y':
        m.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[1,0,0]))
    m.apply_translation(at); return M(m)

def union(ms):
    r = ms[0]
    for m in ms[1:]:
        r = trimesh.boolean.union([r,m], engine='manifold')
    return M(r)

def diff(a, cuts):
    """Union all cutters into one solid, then a single manifold difference.
    Sequential subtraction corrupted meshes when cutters shared an axis."""
    cs=[c for c in cuts if c is not None]
    if not cs: return M(a)
    cutter = cs[0] if len(cs)==1 else trimesh.boolean.union(cs, engine='manifold')
    r = trimesh.boolean.difference([a, cutter], engine='manifold')
    r.process(validate=True)
    return M(r)

def rotZ(m,a): m.apply_transform(trimesh.transformations.rotation_matrix(np.radians(a),[0,0,1])); return m
def rotX(m,a): m.apply_transform(trimesh.transformations.rotation_matrix(np.radians(a),[1,0,0])); return m
def rotY(m,a): m.apply_transform(trimesh.transformations.rotation_matrix(np.radians(a),[0,1,0])); return m

# ---------------------------------------------------------------- servo data
# Standard servo, MG996R / MG995 / S3003 class. Verified against published
# outline drawings; pockets carry +0.35/side horizontal, +0.2 vertical.
STD = dict(
    L=40.6, W=20.0, H_below=27.0,   # case length, width, bottom -> tab underside
    tab_t=2.6, H_above=8.4,          # tab thickness, tab top -> case top face
    tab_span=55.4,                   # overall length across both tabs
    hole_dx=49.66, hole_dy=10.0,     # mount hole grid (lengthwise c-c, widthwise c-c)
    shaft_off=10.4,                  # shaft axis offset from case center, along length
    spline_h=4.0, spline_d=5.9,      # spline above case top
    turret_d=14.0, turret_h=1.4,
    pilot=2.4, boss=7.2,             # pilot bore for the included tapping screws
    horn=dict(kind='cross', arm=19.0, w=8.6, t=2.2, hub_d=10.0, hub_relief=2.6,
              screw_clear=4.4, head_d=7.6, head_h=3.4),
    mass=55.0, stall48=9.4, stall60=11.0, speed60=0.14,  # kg.cm, s/60deg
)
# Micro servo, SG90 / MG90S class.
MIC = dict(
    L=22.8, W=12.4, H_below=16.0,
    tab_t=2.4, H_above=4.4,
    tab_span=32.4,
    hole_dx=28.0, hole_dy=0.0,       # single hole per tab, on centerline
    shaft_off=5.4,                   # shaft is 6.0 from the near end of a 22.8 case
    spline_h=3.2, spline_d=4.8,
    turret_d=11.8, turret_h=1.2,
    pilot=1.7, boss=5.2,
    horn=dict(kind='arm', arm=15.5, w=6.4, t=1.8, hub_d=7.4, hub_relief=2.2,
              screw_clear=2.8, head_d=5.2, head_h=2.6),
    mass=13.4, stall48=1.8, stall60=2.2, speed60=0.09,
)
CH = 0.35   # horizontal clearance per side
CV = 0.20   # vertical clearance

def std_pocket_LW(): return (STD['L']+2*CH, STD['W']+2*CH)      # 41.3 x 20.7
def mic_pocket_LW(): return (MIC['L']+2*CH, MIC['W']+2*CH)      # 23.5 x 13.1

# ---------------------------------------------------------------- stand-ins
def servo_mesh(S):
    """Stand-in servo mesh. ORIGIN = shaft axis where it crosses the CASE TOP
    FACE, +Z along the shaft (explicit, per the STANCHION origin lesson).
    Case center is therefore at (-shaft_off, 0, -(H_below+tab_t+H_above)/2)."""
    Ht = S['H_below']+S['tab_t']+S['H_above']
    body = box(S['L'], S['W'], Ht, at=(-S['shaft_off'],0,-Ht/2))
    tabz = -(S['H_above']+S['tab_t']/2)
    tabs = box(S['tab_span'], S['W'], S['tab_t'], at=(-S['shaft_off'],0,tabz))
    tur = cyl(S['turret_d'], S['turret_h'], at=(0,0,S['turret_h']/2))
    spl = cyl(S['spline_d'], S['spline_h'], at=(0,0,S['spline_h']/2))
    m = union([body,tabs,tur,spl])
    holes=[]
    for sx in (-1,1):
        if S['hole_dy']>0:
            for sy in (-1,1):
                holes.append(cyl(3.0, S['tab_t']+2, at=(-S['shaft_off']+sx*S['hole_dx']/2, sy*S['hole_dy']/2, tabz)))
        else:
            holes.append(cyl(2.2, S['tab_t']+2, at=(-S['shaft_off']+sx*S['hole_dx']/2, 0, tabz)))
    return diff(m, holes)

def horn_mesh(S):
    """Stand-in horn on the spline: plate + hub, origin at shaft axis, plate
    underside at z = spline_h (sits on top of the spline stack)."""
    h = S['horn']; z0 = S['spline_h']
    if h['kind']=='cross':
        arms = [box(2*h['arm'], h['w'], h['t'], at=(0,0,z0+h['t']/2)),
                box(h['w'], 2*h['arm'], h['t'], at=(0,0,z0+h['t']/2))]
    else:
        # single arm horn: hub tail to +arm only (keyed toward +X)
        arms = [box(h['arm']+3.0, h['w'], h['t'],
                    at=((h['arm']+3.0)/2-3.0,0,z0+h['t']/2))]
    hub = cyl(h['hub_d'], h['t']+h['hub_relief'], at=(0,0,z0+(h['t']+h['hub_relief'])/2))
    return union(arms+[hub])

def horn_recess_cut(S, face_z):
    """Cutter for a printed face at z=face_z (material below, horn above pressed
    down onto the face). Stack: keyed plate pocket (t+CV), hub relief
    (hub_relief-0.2 so the hub bottoms out and the horn screw clamps the part
    between its head and the hub), screw through-bore, head cbore from below.
    Caller must give the wall >= capture_total(S) below face_z."""
    h = S['horn']; t = h['t']+CV; rel = h['hub_relief']-0.2
    cuts=[]
    if h['kind']=='cross':
        cuts.append(box(2*h['arm']+2*CH, h['w']+2*CH, t, at=(0,0,face_z-t/2)))
        cuts.append(box(h['w']+2*CH, 2*h['arm']+2*CH, t, at=(0,0,face_z-t/2)))
    else:
        cuts.append(box(2*h['arm']+2*CH, h['w']+2*CH, t, at=(0,0,face_z-t/2)))
    cuts.append(cyl(h['hub_d']+2*CH, rel+t, at=(0,0,face_z-(rel+t)/2)))
    cuts.append(cyl(h['screw_clear'], 80, at=(0,0,face_z-40+t)))
    wall = capture_total(S)
    cb = h['head_h']-1.0  # sink most of the head, leave a 1.2+ seat rim
    cuts.append(cyl(h['head_d']+0.8, cb, at=(0,0,face_z-wall+cb/2)))
    return union(cuts)

def capture_total(S):
    """Total wall thickness consumed by a horn capture below the mating face."""
    h = S['horn']
    return round(h['t']+CV + (h['hub_relief']-0.2) + 1.2 + (h['head_h']-1.0), 1)

def volume_mass(mesh, density=1.24, fill=0.5):
    return mesh.volume/1000.0*density*fill  # grams at effective fill
