"""DAVIT parts. Frames:
hub: pipe axis = Z, origin at hub center, S1 shoulder axes = +/-X at (y0,z0).
crank: S1 axis = X, x=0 at flange inboard face. Roll axis vertical at (BX,0).
upper: roll axis = Z, z=0 at cup rim top. Elbow axis = X at (y0, z=-88).
fore:  x shares upper's x origin (roll axis), elbow axis = X at (y0, z=0).
palm:  wrist axis = Z, z=0 at cup rim top. Grip shaft = +Y at (x0, z=-44).
jaws:  authored Z-up flat (print orientation), pivot axis = Z, finger +Y.
X-axis octagons use rot=0 (vertex at bottom -> 45 deg self-supporting).
"""
import numpy as np, trimesh, json, os
from shapely.geometry import Polygon as shPoly
from lib import *

OUT='stl'; os.makedirs(OUT, exist_ok=True)
PIPES={'1in':33.4,'1.25in':42.2,'1.5in':48.3}

BX=32.0; CAP_S=capture_total(STD); CAP_M=capture_total(MIC)
BOSS_D=45.6; CUP_ID=BOSS_D+0.7; CUP_OD=52.8
ELB_Z=-88.0; WRIST_X=-3.6; FORE_BZ=-96.0; GRIP_Z=-44.0; JAW_CC=16.0
def XF(od): return round(od/2+33.2,1)

def frustum(r0,r1,z0,z1,n=32):
    ang=np.linspace(0,2*np.pi,n,endpoint=False)
    v0=np.c_[np.cos(ang)*r0,np.sin(ang)*r0,np.full(n,z0)]
    v1=np.c_[np.cos(ang)*r1,np.sin(ang)*r1,np.full(n,z1)]
    v=np.vstack([v0,v1,[[0,0,z0]],[[0,0,z1]]]); f=[]
    for i in range(n):
        j=(i+1)%n
        f+=[[i,j,n+i],[j,n+j,n+i],[j,i,2*n],[n+i,n+j,2*n+1]]
    m=trimesh.Trimesh(vertices=v,faces=np.array(f)); m.fix_normals(); return M(m)

def micro_axial_cuts(ax,ay,z_face,open_dz=-4.0):
    """Micro servo shaft DOWN, shaft axis (ax,ay), shaft face z_face. Pocket +
    tab seat swept open BELOW (provably insertable), pilots drilled up."""
    L,W=mic_pocket_LW(); cx=ax+MIC['shaft_off']
    Ht=MIC['H_below']+MIC['tab_t']+MIC['H_above']; top=z_face+Ht
    cuts=[box(L,W,(top+CV)-(z_face+open_dz),at=(cx,ay,((top+CV)+(z_face+open_dz))/2))]
    seat=z_face+MIC['H_above']+MIC['tab_t']
    cuts.append(box(MIC['tab_span']+2*CH,W,seat-(z_face+open_dz),
                    at=(cx,ay,(seat+(z_face+open_dz))/2)))
    for s in (-1,1):
        cuts.append(cyl(MIC['pilot'],6.0,at=(cx+s*MIC['hole_dx']/2,ay,seat+3.0)))
    return cuts

def micro_horn_floor(ax,ay,face):
    """Cup floor slab whose top face (z=face) captures the micro horn pressed
    down from above by the roll or wrist servo. Slab below, cutter at face."""
    slab=cyl(CUP_OD,CAP_M,at=(ax,ay,face-CAP_M/2))
    cut=horn_recess_cut(MIC,face); cut.apply_translation([ax,ay,0])
    return slab,cut

# ============================================================ MOUNT + BASES
S1Z=10.4    # std S1 axis height in the base
# The mount is one universal piece per pipe size: a 170 degree saddle screwed
# to the PVC, with a flat bolt pad. Arm bases (std or mini) screw onto the pad
# with 4x #8 x 1/2 screws into printed pilots; two horizontal tongues register
# the base and carry shear so the screws only clamp. Shoulder axis offsets:
# std XF(od)=od/2+41.2 at local AX=44.85 from the pad face, mini
# XFM(od)=od/2+30.4 at AX=33.25. Both constant across pipe sizes, so one base
# per model fits every mount.
XF=lambda od: od/2+43.2
XFM=lambda od: od/2+32.0
PADW=29.0; PADH=42.0

def build_mount(od):
    """One piece on the pipe, both arms connect to it. Full ring collar with
    two opposed dovetail pads. Arm bases slide down onto the pads from above,
    land on the stop shelves, and lock with one #8 x 1/2 driven vertically
    from above into the pad pilot. PVC screws as before, 6 positions."""
    pr=od/2+CH
    solids=[cyl(2*(pr+4.2),46,seg=96)]
    for s in (1,-1):
        solids.append(box(12,29,46,at=(s*(pr+2),0,0)))
        for sy in (1,-1):
            solids.append(box(4.0,2.6,46,at=(s*(pr+6),sy*15.8,0)))
        for sy in (1,-1):
            solids.append(box(20,6,5,at=(s*(pr+4),sy*17.3,-24.5)))
    cuts=[]
    for s in (1,-1):
        cuts.append(cyl(3.4,10.0,axis='z',at=(s*(pr+2),0,18.5)))
    for ang,zh in [(-55,14),(-55,-14),(55,14),(55,-14),(90,0),(-90,0)]:
        h=tear(4.6,16.0,at=(pr+2.1,0,zh),axis='x'); rotZ(h,ang); cuts.append(h)
        cb=tear(9.2,4.6,at=(pr+4.3,0,zh),axis='x'); rotZ(cb,ang); cuts.append(cb)
    cuts.append(cyl(2*pr,56))
    return diff(union(solids),cuts)

def _foot():
    """C channel foot: slides down over the mount pad lips, lands on the
    shelf, locks with one vertical screw through the top tab."""
    solids=[box(6,28,44,at=(3,0,-1))]
    for sy in (1,-1):
        solids.append(box(12.75,2.4,43,at=(-0.375,sy*18.75,-0.5)))
        solids.append(box(2.4,4.9,43,at=(-5.55,sy*17.3,-0.5)))
        solids.append(box(2.4,6.4,43,at=(4.8,sy*16.95,-0.5)))
    solids.append(box(6,18,7.5,at=(3,0,24.6)))
    solids.append(box(14.5,18,5,at=(-0.25,0,25.85)))
    cuts=[cyl(4.6,14,axis='z',at=(-6,0,25))]
    return solids,cuts

def build_base():
    AX=46.85
    fs,fc=_foot()
    solids=fs+[box(27.85,27.2,64,at=(17.9,0,0)),
               ngon(66.4,30,n=8,at=(AX-11,0,S1Z),axis='x',rot=0)]
    cuts=list(fc)
    cuts.append(cyl(58.2,19.2,at=(AX-5.4,0,S1Z),axis='x',seg=96))
    g=wedge45(58.2,19.2,29.1)
    g.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,0,1]))
    g.apply_translation([AX-5.4,0,S1Z+20.0]); cuts.append(g)
    L,W=std_pocket_LW()
    casebot=AX-4.0-(STD['H_below']+STD['tab_t']+STD['H_above'])
    cuts.append(box(AX+28-(casebot-CH),W,L,
                at=(((AX+28)+(casebot-CH))/2,0,S1Z-STD['shaft_off'])))
    cuts.append(box(43.0,W,STD['tab_span']+2*CH,
                at=((AX+28+(AX-15.0))/2,0,S1Z-STD['shaft_off'])))
    gg=wedge45(W,AX+28-(casebot-CH),8.6)
    gg.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,0,1]))
    gg.apply_translation([((AX+28)+(casebot-CH))/2,0,S1Z-STD['shaft_off']+L/2])
    cuts.append(gg)
    for sz in (-1,1):
        for sy in (-1,1):
            cuts.append(cyl(STD['pilot']+0.2,9.0,axis='x',
                at=(AX-15.0-4.5,sy*STD['hole_dy']/2,
                    S1Z-STD['shaft_off']+sz*STD['hole_dx']/2)))
    cuts.append(box(14,26,8,at=(casebot+6,-16,S1Z-17)))
    for zc in (S1Z-STD['shaft_off']-27.0, S1Z-STD['shaft_off']+27.0):
        w=box(11,30,6.5,at=(16.0,0,zc))
        gw=wedge45(11,30,5.5); gw.apply_translation([16.0,0,zc+3.25])
        cuts.append(w); cuts.append(gw)
    return diff(union(solids),cuts)

def build_base_mini():
    AX=34.85
    fs,fc=_foot()
    solids=fs+[box(16.65,20.0,46,at=(12.3,0,0)),
               ngon(45.0,30,n=8,at=(AX-10.2,0,S1ZM),axis='x',rot=0)]
    cuts=list(fc)
    cuts.append(cyl(36.7,19.6,at=(AX-4.4,0,S1ZM),axis='x',seg=96))
    g=wedge45(36.7,19.6,18.4)
    g.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,0,1]))
    g.apply_translation([AX-4.4,0,S1ZM+12.6]); cuts.append(g)
    L,W=mic_pocket_LW()
    Ht=MIC['H_below']+MIC['tab_t']+MIC['H_above']
    casebot=AX-3.2-Ht
    cuts.append(box(AX+18.8-(casebot-CH),W,L,
                at=(((AX+18.8)+(casebot-CH))/2,0,0)))
    cuts.append(box(28.0,W,MIC['tab_span']+2*CH,
                at=((AX+18.8+(AX-14.2))/2,0,0)))
    gg=wedge45(W,AX+18.8-(casebot-CH),5.6)
    gg.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,0,1]))
    gg.apply_translation([((AX+18.8)+(casebot-CH))/2,0,L/2]); cuts.append(gg)
    for sz in (-1,1):
        cuts.append(cyl(MIC['pilot']+0.2,8.0,axis='x',
            at=(AX-14.2-4.0,0,sz*MIC['hole_dx']/2)))
    cuts.append(box(10,20,6,at=(casebot+5,-12,-12)))
    return diff(union(solids),cuts)

# ============================================================ CRANK
def build_crank():
    flange=shield(57.3,CAP_S,at=(CAP_S/2,0,0),axis='x')
    boss=cyl(BOSS_D,30,at=(BX,0,-45),seg=96)
    beam=box(46,24,8.8,at=(29,0,-30.4))
    RYm=lambda a: trimesh.transformations.rotation_matrix(a,[0,1,0])
    topbar=box(46,8.8,6.4,at=(29,0,-4.8))
    d1=box(31,8.8,7); d1.apply_transform(RYm(0.833)); d1.apply_translation([19,0,-19])
    d2=box(31,8.8,7); d2.apply_transform(RYm(-0.833)); d2.apply_translation([39,0,-19])
    endpost=box(6.4,8.8,26,at=(49,0,-17))
    plate=union([topbar,d1,d2,endpost])
    solids=[flange,boss,beam,plate]; cuts=[]
    hc=horn_recess_cut(STD,0.0)
    hc.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[0,1,0]))
    cuts.append(hc)
    cuts.append(cyl(9.5,90,axis='x',at=(53.6,0,0)))
    cuts+=micro_axial_cuts(BX,0,-60.0)
    cuts.append(box(7,7,22,at=(24,0,-32)))
    # lightening: two gabled windows through the web plate, one beam window,
    # four vertical bores through the boss bulk clear of pocket and pilots
    cuts.append(box(24,26,4.2,at=(31,0,-30.4)))
    ring=diff(cyl(48.0,3.7,axis='x',at=(CAP_S-1.84,0,0)),
              [cyl(16.0,5.0,axis='x',at=(CAP_S-1.84,0,0))])
    cuts.append(ring)
    for sx in (-1,1):
        for sy in (-1,1):
            cuts.append(cyl(8.0,34,at=(BX+sx*10,sy*11.5,-45)))
    return diff(union(solids),cuts)

# ============================================================ UPPER
def build_upper():
    cup=cyl(CUP_OD,20.0,at=(0,0,-10.0))
    fslab,fcut=micro_horn_floor(0,0,-13.2)
    fr=frustum(CUP_OD/2,17.0,-20.0,-29.4)
    tube=ngon(34.0,18.6,n=8,at=(0,0,-38.7),rot=np.pi/8)
    _twin=[box(40,9.0,10,at=(0,0,-38.7)),rotZ(box(40,9.0,10,at=(0,0,-38.7)),90)]
    block=union([box(21.2,27.2,60.0,at=(-10.6,0,-78.0)),
                 box(33.2,15.2,60.0,at=(-10.6,0,-78.0))]+
                [cyl(12.0,60.0,at=(cx,cy,-78.0),seg=48)
                 for cx in (-21.2,0.0) for cy in (-7.6,7.6)])
    pad=ngon(16.8,3.2,n=8,at=(-28.8,0,ELB_Z),axis='x',rot=0)
    solids=[cup,fslab,fr,tube,block,pad]
    cuts=[cyl(CUP_ID,13.4,at=(0,0,-6.5),seg=96),fcut] # cavity down to the floor face
    L,W=std_pocket_LW()
    casebot=14.0-(STD['H_below']+STD['tab_t']+STD['H_above'])
    ccz=ELB_Z+STD['shaft_off']
    cuts.append(box(40-(casebot-CH),W,L,at=((40+(casebot-CH))/2,0,ccz)))
    cuts.append(box(37.0,W,STD['tab_span']+2*CH,at=((40+3.0)/2,0,ccz)))
    gg=wedge45(W,40-(casebot-CH),8.6)
    gg.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,0,1]))
    gg.apply_translation([(40+(casebot-CH))/2,0,ccz+L/2]); cuts.append(gg)
    for sz in (-1,1):
        for sy in (-1,1):
            cuts.append(cyl(STD['pilot']+0.2,9.0,axis='x',
                at=(-1.5,sy*STD['hole_dy']/2,ccz+sz*STD['hole_dx']/2)))
    cuts.append(tear(9.1,5.6,at=(-27.6,0,ELB_Z),axis='x',up=(0,0,1)))
    cuts.append(box(8,10.4,6.2,at=(0,-21.5,-3.1)))    # rim wire notch
    cuts.append(box(6,4.0,44,at=(0,-15.7,-26)))       # tube wire groove
    cuts.append(box(6,6.4,8,at=(-18,-12.2,ELB_Z-8)))  # elbow wire window
    cuts.append(box(12,30,5,at=(-12,0,-103)))                  # base window
    gwb=wedge45(12,30,8); gwb.apply_translation([-12,0,-100.5]); cuts.append(gwb)
    cuts.append(cyl(24.0,17.0,at=(0,0,-40.5),seg=48))          # hollow tube
    cuts+=_twin
    cuts.append(frustum(12.0,0.6,-32.0,-20.6))                 # 45 cone roof
    return diff(union(solids),cuts)

# ============================================================ FORE
def build_fore():
    hp=ngon(46.0,CAP_S,n=8,at=(18.0+CAP_S/2,0,0),axis='x',rot=0)
    ip=ngon(46.0,4.8,n=8,at=(-33.2,0,0),axis='x',rot=0)
    stub=shield(8.2,5.6,at=(-28.0,0,0),axis='x',arcseg=32)
    bridge=box(60.4,22,6,at=(-3.8,0,-28.0))
    postH=box(8.4,22,8.4,at=(22.2,0,-24.4))
    postI=box(4.8,22,8.4,at=(-33.2,0,-24.4))
    tube=ngon(30.0,33.2,n=8,at=(WRIST_X,0,-41.6),rot=np.pi/8)
    _twin=[box(36,8.5,12,at=(WRIST_X,0,-40.0)),rotZ(box(36,8.5,12,at=(0,0,-40.0)),90)]
    _twin[1].apply_translation([WRIST_X,0,0])
    fr=frustum(15.0,BOSS_D/2,-58.2,-66.0); fr.apply_translation([WRIST_X,0,0])
    boss=cyl(BOSS_D,30,at=(WRIST_X,0,-81.0),seg=96)
    solids=[hp,ip,stub,bridge,postH,postI,tube,fr,boss]; cuts=[]
    hc=horn_recess_cut(STD,0.0)
    hc.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[0,1,0]))
    hc.apply_translation([18.0,0,0]); cuts.append(hc)
    cuts+=micro_axial_cuts(WRIST_X,0,FORE_BZ)
    cuts.append(box(6,14,6,at=(WRIST_X,-17,-69)))
    cuts.append(box(6,4.0,34,at=(WRIST_X,-13.9,-41.5)))
    cuts.append(cyl(20.0,27.0,at=(WRIST_X,0,-49.5),seg=48))    # hollow tube
    cuts+=_twin
    cuts.append(frustum(10.0,0.6,-36.0,-26.6))
    cuts[-1].apply_translation([WRIST_X,0,0])
    cuts.append(cyl(3.0,14.0,at=(WRIST_X,0,-68.0)))            # vent to pocket
    for sx in (-1,1):
        for sy in (-1,1):
            cuts.append(cyl(8.0,34,at=(WRIST_X+sx*10,sy*11.5,-81.0)))
    return diff(union(solids),cuts)

# ============================================================ PALM
def build_palm():
    cup=cyl(CUP_OD,20.0,at=(0,0,-10.0))
    fslab,fcut=micro_horn_floor(0,0,-13.2)
    fr=frustum(CUP_OD/2,14.0,-20.0,-32.4)
    slab=box(33.2,24,34,at=(-3.4,0,-41.0))
    pad=ngon(11.0,2.2,n=8,at=(-JAW_CC,13.1,GRIP_Z),axis='y',rot=np.pi/2)
    pin=ngon(4.8,9.0,n=8,at=(-JAW_CC,16.5,GRIP_Z),axis='y',rot=np.pi/2)
    solids=[cup,fslab,fr,slab,pad,pin]
    cuts=[cyl(CUP_ID,13.4,at=(0,0,-6.5),seg=96),fcut]
    cuts.append(box(7,16,20,at=(-13.5,0,-42)))
    L,W=mic_pocket_LW(); cz=GRIP_Z+MIC['shaft_off']
    cuts.append(box(W,27.6+CV,L,at=(0,(11.6-16)/2,cz)))
    cuts.append(box(W,20.6,MIC['tab_span']+2*CH,at=(0,(4.6-16)/2,cz)))
    for s in (-1,1):
        cuts.append(cyl(MIC['pilot']+0.2,6.0,axis='y',at=(0,4.6+3.0,cz+s*MIC['hole_dx']/2)))
    cuts.append(cyl(2.2,8.0,axis='y',at=(-JAW_CC,17.4,GRIP_Z)))
    cuts.append(cyl(13.5,6.0,axis='y',at=(0,11.0,GRIP_Z)))   # turret/spline pass-through
    return diff(union(solids),cuts)

# ============================================================ JAWS
def sector_teeth(thick,center,rp=8.0,n_full=12,count=5,w=1.7):
    out=[]
    for i in range(count):
        a=center+(i-(count-1)/2)*2*np.pi/n_full
        t=box(2.4,w,thick,at=(rp-0.2,0,thick/2))
        t.apply_transform(trimesh.transformations.rotation_matrix(a,[0,0,1]))
        out.append(t)
    return out

def jaw_body(thick,sector_center,fdx):
    """fdx: finger lateral offset (- for drive at x0, + for idle at -CC)."""
    inner=-1 if fdx<0 else 1     # which side faces the other jaw
    boss=cyl(13.2,thick,at=(0,0,thick/2))
    seg1=box(9,20,thick,at=(fdx*0.5,11,thick/2))
    seg2=box(6.4,28,thick,at=(fdx,29,thick/2))
    tip=box(6.4,10,thick,at=(fdx,42,thick/2))
    grips=[box(2.0,2.4,thick,at=(fdx+inner*3.2,gy,thick/2)) for gy in (35,40,45)]
    return [boss,seg1,seg2,tip]+sector_teeth(thick,sector_center)+grips

def build_jaw_drive():
    m=union(jaw_body(CAP_M,np.pi,-4.0))
    cut=horn_recess_cut(MIC,0.0)
    cut.apply_transform(trimesh.transformations.rotation_matrix(np.pi,[1,0,0]))
    return diff(m,[cut])

def build_jaw_idle():
    m=union(jaw_body(CAP_M,np.pi/12,4.0))
    return diff(m,[cyl(5.5,CAP_M+2,at=(0,0,CAP_M/2),seg=96)])

def build_cap():
    return union([cyl(8.6,2.2,at=(0,0,1.1)),cyl(2.35,6.4,at=(0,0,-3.2))])


# ============================================================ MINI (all 9g)
# DAVIT MINI: every joint is a micro servo. Palm, jaws, and pincap are shared
# with the standard build. Chain: crank at xf+11.2, S1 axis z +5.4, BX 26,
# crank drop -42, elbow -62, wrist dx -2.0, palm drop -60.
S1ZM=MIC['shaft_off']
BXM=26.0; ELB_ZM=-62.0; WXM=-2.0; FORE_BZM=-70.0

def build_crank_mini():
    flange=shield(36.0,6.8,at=(3.4,0,0),axis='x')
    boss=cyl(BOSS_D,26,at=(BXM,0,-39),seg=96)
    beam=box(34,22,7,at=(23,0,-24.5))
    RYm=lambda a: trimesh.transformations.rotation_matrix(a,[0,1,0])
    topbar=box(34,6.8,4.6,at=(23,0,-5.7))
    d1=box(22.5,6.8,6); d1.apply_transform(RYm(0.852)); d1.apply_translation([15,0,-16])
    d2=box(22.5,6.8,6); d2.apply_transform(RYm(-0.852)); d2.apply_translation([31,0,-16])
    endpost=box(5.4,6.8,22,at=(37.3,0,-15.5))
    plate=union([topbar,d1,d2,endpost])
    solids=[flange,boss,beam,plate]; cuts=[]
    hc=horn_recess_cut(MIC,0.0)
    hc.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[0,1,0]))
    cuts.append(hc)
    cuts.append(cyl(6.5,70,axis='x',at=(41.9,0,0)))
    cuts+=micro_axial_cuts(BXM,0,-52.0)
    cuts.append(box(7,7,18,at=(19,0,-26)))
    cuts.append(box(20,24,3.6,at=(24,0,-24.5)))
    for sx in (-1,1):
        for sy in (-1,1):
            cuts.append(cyl(7.0,30,at=(BXM+sx*9,sy*11.0,-39)))
    return diff(union(solids),cuts)

def build_upper_mini():
    cup=cyl(CUP_OD,20.0,at=(0,0,-10.0))
    fslab,fcut=micro_horn_floor(0,0,-13.2)
    fr=frustum(CUP_OD/2,15.0,-20.0,-28.0)
    tube=ngon(28.0,14.0,n=8,at=(0,0,-35.0),rot=np.pi/8)
    _twin=[box(34,8.0,6.5,at=(0,0,-34.5)),rotZ(box(34,8.0,6.5,at=(0,0,-34.5)),90)]
    block=union([box(16.4,20.0,38.0,at=(-7.2,0,-60.0)),
                 box(26.4,10.0,38.0,at=(-7.2,0,-60.0))]+
                [cyl(10.0,38.0,at=(cx,cy,-60.0),seg=48)
                 for cx in (-15.4,1.0) for cy in (-5.0,5.0)])
    pad=ngon(13.2,3.2,n=8,at=(-22.0,0,ELB_ZM),axis='x',rot=0)
    solids=[cup,fslab,fr,tube,block,pad]
    cuts=[cyl(CUP_ID,13.4,at=(0,0,-6.5),seg=96),fcut]
    L,W=mic_pocket_LW()
    Ht=MIC['H_below']+MIC['tab_t']+MIC['H_above']
    caseb=10.0-Ht
    ccz=ELB_ZM+MIC['shaft_off']
    cuts.append(box(26-(caseb-CH),W,L,at=((26+(caseb-CH))/2,0,ccz)))
    cuts.append(box(22.0,W,MIC['tab_span']+2*CH,at=((26+2.0)/2,0,ccz)))
    gg=wedge45(W,26-(caseb-CH),5.6)
    gg.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[0,0,1]))
    gg.apply_translation([((26)+(caseb-CH))/2,0,ccz+L/2]); cuts.append(gg)
    for sz in (-1,1):
        cuts.append(cyl(MIC['pilot']+0.2,7.0,axis='x',
            at=(3.2,0,ccz+sz*MIC['hole_dx']/2)))
    cuts.append(tear(6.9,5.0,at=(-21.1,0,ELB_ZM),axis='x',up=(0,0,1)))
    cuts.append(box(7,10,5.6,at=(0,-20.9,-2.8)))
    cuts.append(box(5,3.6,28,at=(0,-13.3,-22)))
    cuts.append(box(5,5.6,7,at=(-13,-8.8,ELB_ZM-6)))
    cuts.append(cyl(15.0,10.0,at=(0,0,-33.0),seg=48))
    cuts+=_twin
    cuts.append(frustum(7.5,0.6,-28.0,-21.1))
    return diff(union(solids),cuts)

def build_fore_mini():
    hp=ngon(32.0,6.8,n=8,at=(16.6,0,0),axis='x',rot=0)
    ip=ngon(32.0,4.0,n=8,at=(-26.4,0,0),axis='x',rot=0)
    stub=shield(6.0,4.6,at=(-22.1,0,0),axis='x',arcseg=32)
    bridge=box(41.8,18,5,at=(-5.5,0,-25.5))
    postH=box(6.8,18,11,at=(16.6,0,-20.5))
    postI=box(4.0,18,11,at=(-26.4,0,-20.5))
    tube=ngon(26.0,13.0,n=8,at=(WXM,0,-33.5),rot=np.pi/8)
    _twin=[box(32,7.5,6,at=(WXM,0,-33.5)),rotZ(box(32,7.5,6,at=(0,0,-33.5)),90)]
    _twin[1].apply_translation([WXM,0,0])
    fr=frustum(13.0,BOSS_D/2,-40.0,-46.0); fr.apply_translation([WXM,0,0])
    boss=cyl(BOSS_D,26,at=(WXM,0,-57.0),seg=96)
    solids=[hp,ip,stub,bridge,postH,postI,tube,fr,boss]; cuts=[]
    hc=horn_recess_cut(MIC,0.0)
    hc.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[0,1,0]))
    hc.apply_translation([13.2,0,0]); cuts.append(hc)
    cuts+=micro_axial_cuts(WXM,0,FORE_BZM)
    cuts.append(box(5,19,5,at=(WXM,-15.5,-58)))
    cuts.append(box(5,3.6,22,at=(WXM,-12.2,-31)))
    cuts.append(cyl(14.0,9.0,at=(WXM,0,-32.5),seg=48))
    cuts+=_twin
    cuts.append(frustum(7.0,0.6,-28.0,-21.6))
    cuts[-1].apply_translation([WXM,0,0])
    cuts.append(cyl(3.0,22.0,at=(WXM,0,-48.0)))
    for sx in (-1,1):
        for sy in (-1,1):
            cuts.append(cyl(7.0,30,at=(WXM+sx*9,sy*11.0,-57.0)))
    return diff(union(solids),cuts)

# ============================================================ run
if __name__=='__main__':
    parts={}
    parts['davit_crank']=build_crank()
    parts['davit_upper']=build_upper()
    parts['davit_fore']=build_fore()
    parts['davit_palm']=build_palm()
    parts['davit_jaw_drive']=build_jaw_drive()
    parts['davit_jaw_idle']=build_jaw_idle()
    parts['davit_pincap']=build_cap()
    for k,od in [('davit_mount_1in',33.4),('davit_mount_125in',42.2),('davit_mount_15in',48.3)]:
        parts[k]=build_mount(od)
    parts['davit_base']=build_base()
    parts['davit_mini_base']=build_base_mini()
    parts['davit_mini_crank']=build_crank_mini()
    parts['davit_mini_upper']=build_upper_mini()
    parts['davit_mini_fore']=build_fore_mini()
    rep={}
    for n,m in parts.items():
        rep[n]=dict(wt=bool(m.is_watertight),vol=round(m.volume/1000,1),
                    bb=[[round(v,1) for v in m.bounds[0]],[round(v,1) for v in m.bounds[1]]])
        m.export(f'{OUT}/{n}.stl')
    print(json.dumps(rep,indent=0))
