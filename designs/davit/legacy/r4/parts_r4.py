"""DAVIT R4 : 9g-only rebuild. Repairs + skeletal lightening pass.
Joint frames, chain constants, mount and foot interfaces are IDENTICAL to R3
mini so the sim chain and all servo/horn placements carry over unchanged.

Changes vs R3 mini:
  jaws     teeth rooted 1.4 into the boss (R3 had 4 teeth attached by a
           tangent line = detached bodies). One-sided keyed horn recess
           restores the 180 deg tooth root.
  fore     yoke plates were joined to the posts by ~1 mm vertex slivers
           (42 mm2 total). Plates are now full side plates lapping the
           bridge over the whole plate thickness. Diamond windows.
  crank    flange hung on a 0.8 mm lap (54 mm2). Flange extended to 10.8
           so topbar + diagonal lap it at full section; head cbore bored
           through the extra band for the driver.
  bosses   4x D7 blind bores left 0.95 mm walls to the servo pocket.
           Replaced by 2-3 stadium through-voids with >=2.0 walls, self
           sized against the OD. Joint stays D45.6/52.8: the roll and
           wrist servo tab corners swing at r22.47, so the cup ID floor
           is 45.6. A smaller joint fails on hardware, not on plastic.
  upper    frustum was a 35 deg overhang (under the 45 rule) -> 45 deg.
           Block gets side, back, and bottom through-windows.
  floors   roll + wrist horn screws were undrivable (head cbore buried
           behind a D2.8 waist). D6.4 axial driver channel from the
           floor into the open servo pocket below.
  palm     sealed 2.24 cm3 fake window -> real open frame with cheek
           windows. Cup resized with the new joint.
  base     22 mm3 splinter under the journal bore removed; +y window.
"""
import numpy as np, trimesh, json, os
from shapely.geometry import Polygon as shPoly
from lib import *

OUT='stl_r4'; os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- constants
S1ZM=MIC['shaft_off']            # 5.4
BXM=26.0; ELB_ZM=-62.0; WXM=-2.0; FORE_BZM=-70.0
GRIP_Z=-44.0; JAW_CC=16.0
CAP_M=capture_total(MIC)         # 6.8

BOSS_M=45.6                      # lower bound is the roll/wrist servo tab
CUP_ID=BOSS_M+0.7                # corners swinging at r22.47: cup ID >= 45.6.
CUP_OD=CUP_ID+6.5                # The R3 joint size was load bearing after all.
XFM=lambda od: od/2+32.0

def frustum(r0,r1,z0,z1,n=48):
    ang=np.linspace(0,2*np.pi,n,endpoint=False)
    v0=np.c_[np.cos(ang)*r0,np.sin(ang)*r0,np.full(n,z0)]
    v1=np.c_[np.cos(ang)*r1,np.sin(ang)*r1,np.full(n,z1)]
    v=np.vstack([v0,v1,[[0,0,z0]],[[0,0,z1]]]); f=[]
    for i in range(n):
        j=(i+1)%n
        f+=[[i,j,n+i],[j,n+j,n+i],[j,i,2*n],[n+i,n+j,2*n+1]]
    m=trimesh.Trimesh(vertices=v,faces=np.array(f)); m.fix_normals(); return M(m)

def stadium(length,width,h,at=(0,0,0)):
    """Slot with round ends, axis z. length along x."""
    r=width/2.0; b=box(length-width,width,h)
    c1=cyl(width,h,at=((length-width)/2,0,0)); c2=cyl(width,h,at=(-(length-width)/2,0,0))
    m=union([b,c1,c2]); m.apply_translation(at); return m

def diamond(t,a,at=(0,0,0)):
    """Square a x a rotated 45 in the yz plane, thickness t along x.
    Cuts printable diamond windows (all edges 45)."""
    m=box(t,a,a); m=rotX(m,45.0); m.apply_translation(at); return m

def horn_recess_arm1(S,face_z):
    """One-sided keyed recess for single-arm micro horns: tail -3.5 .. +arm.
    Keys the horn orientation and keeps material on the other side
    (restores the drive jaw 180 deg tooth root)."""
    h=S['horn']; t=h['t']+CV; rel=h['hub_relief']-0.2
    L=h['arm']+3.0+2*CH
    cuts=[box(L,h['w']+2*CH,t,at=(L/2-3.0-CH,0,face_z-t/2))]
    cuts.append(cyl(h['hub_d']+2*CH,rel+t,at=(0,0,face_z-(rel+t)/2)))
    cuts.append(cyl(h['screw_clear'],80,at=(0,0,face_z-40+t)))
    wall=capture_total(S); cb=h['head_h']-1.0
    cuts.append(cyl(h['head_d']+0.8,cb,at=(0,0,face_z-wall+cb/2)))
    return union(cuts)

def micro_axial_cuts(ax,ay,z_face,open_dz=-4.0):
    L,W=mic_pocket_LW(); cx=ax+MIC['shaft_off']
    Ht=MIC['H_below']+MIC['tab_t']+MIC['H_above']; top=z_face+Ht
    cuts=[box(L,W,(top+CV)-(z_face+open_dz),at=(cx,ay,((top+CV)+(z_face+open_dz))/2))]
    seat=z_face+MIC['H_above']+MIC['tab_t']
    cuts.append(box(MIC['tab_span']+2*CH,W,seat-(z_face+open_dz),
                    at=(cx,ay,(seat+(z_face+open_dz))/2)))
    for s in (-1,1):
        cuts.append(cyl(MIC['pilot'],6.0,at=(cx+s*MIC['hole_dx']/2,ay,seat+3.0)))
    return cuts

def cup_and_floor(driver_to):
    """Cup ring + full floor, one-sided horn recess, D6.4 driver channel
    from the floor bottom down to z=driver_to (must reach an open pocket)."""
    cup=cyl(CUP_OD,20.0,at=(0,0,-10.0))
    cuts=[cyl(CUP_ID,13.4,at=(0,0,-6.5),seg=96),
          horn_recess_arm1(MIC,-13.2),
          cyl(6.4,-13.2-6.8-driver_to,at=(0,0,(-20.0+driver_to)/2))]
    for a in (45,135,225,315):                          # floor lightening slots
        sl=stadium(16.0,3.4,10,at=(19.6,0,-16.6))
        cuts.append(rotZ(sl,a))
    return [cup],cuts

def boss_with_voids(cx,cz_top,void_y,w=6.0,back_x=None,back_w=4.6,back_cap=None):
    """Journal boss h26, top at cz_top, axis at (cx,0). Two stadium
    through-voids at +-void_y plus an optional back-quadrant slot along y.
    Slot lengths self-size to keep a 2.0 wall to the OD; lateral walls to
    the pocket and tab channel are set by void_y / back_x at the call."""
    R=BOSS_M/2.0
    b=cyl(BOSS_M,26,at=(cx,0,cz_top-13.0),seg=96)
    c=np.sqrt((R-2.0-w/2)**2-void_y**2)
    voids=[stadium(2*c+w,w,30,at=(cx,s*void_y,cz_top-13.0)) for s in (1,-1)]
    if back_x is not None:
        d=abs(back_x-cx)
        cb=np.sqrt((R-2.0-back_w/2)**2-d**2)
        if back_cap is not None: cb=min(cb,back_cap)
        bs=stadium(2*cb+back_w,back_w,30)
        bs=rotZ(bs,90); bs.apply_translation([back_x,0,cz_top-13.0])
        voids.append(bs)
    return b,voids

# ============================================================ CRANK
def build_crank():
    flange=shield(36.0,10.8,at=(5.4,0,0),axis='x')     # was 6.8: real truss laps
    boss,voids=boss_with_voids(BXM,-26.0,11.75,back_x=10.5)
    beam=box(36,12,7.8,at=(24.9,0,-24.9))              # buried 2.8 into the drum
    # one gusset panel fills the whole bay: flange to drum, under the driver
    # channel, no separate topbar or endpost, no floating members. Two
    # triangular windows with a deliberate 5.5 diagonal brace between them.
    from shapely.geometry import box as shbox, LineString
    panel_poly=shbox(7.0,-24.9,41.5,-4.4)
    panel=trimesh.creation.extrude_polygon(panel_poly,6.8)
    panel.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
    panel.apply_translation([0,3.4,0]); panel=M(panel)
    inner=shbox(12.0,-19.9,36.5,-9.4)
    strip=LineString([(12.0,-19.9),(36.5,-9.4)]).buffer(2.75,cap_style=2)
    cuts=[]
    for wp in inner.difference(strip).geoms:
        w=trimesh.creation.extrude_polygon(wp,12.0)
        w.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
        w.apply_translation([0,6.0,0]); cuts.append(M(w))
    # end wedges: beam flows onto the drum shoulders instead of hovering
    wf=trimesh.creation.extrude_polygon(shPoly([(6.9,-21.0),(6.9,-26.4),(3.6,-26.4)]),12.0)
    wf.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
    wf.apply_translation([0,6.0,0]); wf=M(wf)
    wr=trimesh.creation.extrude_polygon(shPoly([(42.9,-21.0),(46.2,-26.4),(42.9,-26.4)]),12.0)
    wr.apply_transform(trimesh.transformations.rotation_matrix(np.pi/2,[1,0,0]))
    wr.apply_translation([0,6.0,0]); wr=M(wr)
    solids=[flange,boss,beam,panel,wf,wr]
    hc=horn_recess_arm1(MIC,0.0); rotZ(hc,180.0)       # arm keyed downward
    hc.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[0,1,0]))
    cuts.append(hc)
    cuts.append(cyl(6.0,4.8,axis='x',at=(8.9,0,0)))    # driver bore through the band
    cuts.append(cyl(6.5,70,axis='x',at=(41.9,0,0)))
    cuts+=micro_axial_cuts(BXM,0,-52.0)
    cuts.append(box(10,6,8,at=(BXM,-7.6,-35.0)))       # pocket-to-void wire notch
    # wires: pocket -> notch -> stadium void -> -y side window -> out
    cuts+=voids
    for sy in (1,-1):                                  # side windows into voids
        cuts.append(box(16,12,12,at=(BXM,sy*19.0,-35.0)))
    return diff(union(solids),cuts)

# ============================================================ UPPER
def build_upper():
    s,c=cup_and_floor(-45.0)                            # driver into elbow pocket
    fr=frustum(CUP_OD/2,13.2,-20.0,-33.2)               # 45.0 deg, was 35
    tube=ngon(26.4,12.4,n=8,at=(0,0,-35.9),rot=np.pi/8) # -29.7..-42.1
    block=union([box(16.4,20.0,38.0,at=(-7.2,0,-60.0)),
                 box(26.4,10.0,38.0,at=(-7.2,0,-60.0))]+
                [cyl(10.0,38.0,at=(cx,cy,-60.0),seg=48)
                 for cx in (-15.4,1.0) for cy in (-5.0,5.0)])
    pad=ngon(14.4,3.2,n=8,at=(-22.0,0,ELB_ZM),axis='x',rot=0)
    solids=s+[fr,tube,block,pad]
    cuts=list(c)
    cuts.append(frustum(10.2,0.6,-29.8,-20.2))          # 45 cone shell void
    for a in (45,135,225,315):
        d=diamond(22,7.4,at=(17.0,0,-25.8)); rotZ(d,a); cuts.append(d)
    cuts.append(cyl(15.0,9.4,at=(0,0,-33.9),seg=48))    # tube hollow
    _twin=[box(34,8.5,7,at=(0,0,-35.4)),rotZ(box(34,8.5,7,at=(0,0,-35.4)),90)]
    cuts+=_twin
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
    cuts.append(tear(7.9,5.0,at=(-21.1,0,ELB_ZM),axis='x',up=(0,0,1)))  # stub 7.0
    cuts.append(box(7,10,5.6,at=(0,-22.2,-2.8)))        # rim wire notch
    cuts.append(box(5,3.6,28,at=(0,-13.3,-22)))         # tube wire groove
    cuts.append(box(5,5.6,7,at=(-13,-8.8,ELB_ZM-6)))    # elbow wire window
    # skeletal block: side windows into the pocket, back + front windows below
    cuts.append(box(13,26,11,at=(-6.0,0,-50.9)))        # side windows (thru y)
    cuts.append(box(9,10,6.4,at=(-17,0,-47.0)))         # upper back window
    cuts.append(box(9,12,6.4,at=(-17,0,-73.6)))         # lower back window
    cuts.append(box(9,12,6.4,at=(2.4,0,-73.6)))         # lower front window
    return diff(union(solids),cuts)

# ============================================================ FORE
def build_fore():
    # full side plates: octagon head + skirt, lapping the bridge full-thickness
    hp=union([ngon(32.0,6.8,n=8,at=(16.6,0,0),axis='x',rot=0),
              box(4.8,26.4,26,at=(15.6,0,-13.0))])   # skirt steps to 4.8
    ip=union([ngon(32.0,4.8,n=8,at=(-26.8,0,0),axis='x',rot=0),
              box(4.8,26.4,26,at=(-26.8,0,-13.0))])
    stub=shield(7.0,4.6,at=(-22.1,0,0),axis='x',arcseg=32)   # was 6.0
    bridge=box(49.2,18,5,at=(-4.6,0,-25.5))
    tube=ngon(26.0,14.5,n=8,at=(WXM,0,-34.15),rot=np.pi/8)   # -26.9..-41.4
    fr=frustum(13.2,BOSS_M/2,-40.4,-46.0); fr.apply_translation([WXM,0,0])
    boss,voids=boss_with_voids(WXM,-44.0,12.0,back_x=-15.9)
    # yoke struts: root on the boss top, tip under each bridge wing, so the
    # bridge wings print supported (R3 left 353 mm2 of dead-air underside)
    RYm=lambda a: trimesh.transformations.rotation_matrix(a,[0,1,0])
    stL=box(5.0,9.0,19.0); stL.apply_transform(RYm(-0.30))
    stL.apply_translation([-24.4,0,-36.0])
    stR=box(5.0,9.0,19.0); stR.apply_transform(RYm(0.10))
    stR.apply_translation([16.2,0,-36.0])
    solids=[hp,ip,stub,bridge,tube,fr,boss,stL,stR]; cuts=[]
    hc=horn_recess_arm1(MIC,0.0); rotZ(hc,180.0)       # arm keyed downward
    hc.apply_transform(trimesh.transformations.rotation_matrix(-np.pi/2,[0,1,0]))
    hc.apply_translation([13.2,0,0]); cuts.append(hc)
    cuts.append(diamond(9,8.0,at=(15.6,0,-16.2)))            # hp window
    cuts.append(diamond(7,7.0,at=(-26.8,0,-16.0)))           # ip window
    cuts.append(box(6,8,7,at=(-19.8,0,-25.5)))               # bridge slot
    cuts+=micro_axial_cuts(WXM,0,FORE_BZM)
    cuts.append(box(5,20,5,at=(WXM,-16.5,-58)))              # boss wire window
    cuts.append(box(5,3.6,22,at=(WXM,-12.0,-31)))            # tube wire groove
    cuts.append(cyl(14.0,10.5,at=(WXM,0,-32.9),seg=48))      # tube hollow
    _twin=[box(32,7.5,7,at=(WXM,0,-34.4)),rotZ(box(32,7.5,7,at=(0,0,-34.4)),90)]
    _twin[1].apply_translation([WXM,0,0])
    cuts+=_twin
    fr2=frustum(7.0,0.6,-28.0,-21.6); fr2.apply_translation([WXM,0,0])
    cuts.append(fr2)                                          # 45 roof vent
    cuts.append(cyl(5.0,12.0,at=(WXM,0,-45.0)))               # pocket vent
    cuts+=voids
    for sy in (1,-1):                                  # side windows into voids
        cuts.append(box(14,12,12,at=(WXM,sy*19.0,-52.0)))
    return diff(union(solids),cuts)

# ============================================================ PALM
def build_palm():
    s,c=cup_and_floor(-30.0)                                  # driver into grip pocket
    fr=frustum(CUP_OD/2,11.8,-20.0,-34.6)                     # 45.0 deg
    cradle=box(18.7,26.0,27,at=(0,-0.2,-40.5))                # x +-9.35
    wing=box(13.4,2.8,18,at=(-14.7,10.6,-44.0))               # carries pad + pin
    pad=ngon(11.0,2.2,n=8,at=(-JAW_CC,13.1,GRIP_Z),axis='y',rot=np.pi/2)
    pin=ngon(4.8,9.0,n=8,at=(-JAW_CC,16.5,GRIP_Z),axis='y',rot=np.pi/2)
    solids=s+[fr,cradle,wing,pad,pin]
    cuts=list(c)
    cuts.append(frustum(9.0,0.6,-31.4,-23.0))                 # 45 cone shell void
    L,W=mic_pocket_LW(); cz=GRIP_Z+MIC['shaft_off']
    cuts.append(box(W,27.6,L,at=(0,(11.6-16)/2,cz)))
    cuts.append(box(W,23.2,MIC['tab_span']+2*CH,at=(0,-4.4,cz)))  # tabs top out at y 7.0
    for sgn in (-1,1):
        cuts.append(cyl(MIC['pilot']+0.2,6.0,axis='y',at=(0,10.2,cz+sgn*MIC['hole_dx']/2)))
    cuts.append(cyl(2.2,8.0,axis='y',at=(-JAW_CC,17.4,GRIP_Z)))
    cuts.append(cyl(13.5,6.0,axis='y',at=(0,11.0,GRIP_Z)))    # turret pass-through
    cuts.append(box(24,12,13,at=(0,-3.5,-40.5)))              # cheek windows (thru x)
    return diff(union(solids),cuts)

# ============================================================ JAWS
def sector_teeth(thick,center,rp=8.0,n_full=12,count=5,w=1.7):
    out=[]
    for i in range(count):
        a=center+(i-(count-1)/2)*2*np.pi/n_full
        t=box(3.8,w,thick,at=(7.1,0,thick/2))    # root buried 1.4 in the boss
        t.apply_transform(trimesh.transformations.rotation_matrix(a,[0,0,1]))
        out.append(t)
    return out

def jaw_body(thick,sector_center,fdx):
    inner=-1 if fdx<0 else 1
    boss=cyl(13.2,thick,at=(0,0,thick/2))
    seg1=box(9,20,thick,at=(fdx*0.5,11,thick/2))
    seg2=diff(box(6.4,28,thick,at=(fdx,29,thick/2)),
              [box(3.2,16,thick+2,at=(fdx,29,thick/2))])
    tip=box(6.4,10,thick,at=(fdx,42,thick/2))
    grips=[box(2.0,2.4,thick,at=(fdx+inner*3.2,gy,thick/2)) for gy in (35,40,45)]
    return [boss,seg1,seg2,tip]+sector_teeth(thick,sector_center)+grips

def build_jaw_drive():
    m=union(jaw_body(CAP_M,np.pi,-4.0))
    cut=horn_recess_arm1(MIC,0.0)
    cut.apply_transform(trimesh.transformations.rotation_matrix(np.pi,[1,0,0]))
    return diff(m,[cut])

def build_jaw_idle():
    m=union(jaw_body(CAP_M,np.pi/12,4.0))
    return diff(m,[cyl(5.5,CAP_M+2,at=(0,0,CAP_M/2),seg=96)])

def build_cap():
    return union([cyl(8.6,2.2,at=(0,0,1.1)),cyl(2.35,6.4,at=(0,0,-3.2))])

# ============================================================ BASE
def build_base():
    from parts import _foot
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
    cuts.append(box(10,20,6,at=(casebot+5, 12,-12)))    # mirror window +y
    cuts.append(box(10,4,4.6,at=(16.65,0,-14.2)))       # splinter relief
    return diff(union(solids),cuts)

def finalize(m,name=''):
    bodies=[b for b in m.split(only_watertight=False) if b.volume>1.0]
    assert len(bodies)==1, f'{name}: {len(bodies)} real bodies'
    b=bodies[0]; b.merge_vertices(); b.fix_normals()
    assert b.is_watertight, f'{name}: not watertight'
    return b

# ============================================================ run
if __name__=='__main__':
    from parts import build_mount
    parts={}
    parts['davit_mini_crank']=build_crank()
    parts['davit_mini_upper']=build_upper()
    parts['davit_mini_fore']=build_fore()
    parts['davit_palm']=build_palm()
    parts['davit_jaw_drive']=build_jaw_drive()
    parts['davit_jaw_idle']=build_jaw_idle()
    parts['davit_pincap']=build_cap()
    parts['davit_mini_base']=build_base()
    for k,od in [('davit_mount_1in',33.4),('davit_mount_125in',42.2),('davit_mount_15in',48.3)]:
        parts[k]=build_mount(od)
    rep={}
    for n,m in parts.items():
        m=finalize(m,n); parts[n]=m
        rep[n]=dict(vol=round(m.volume/1000,1),
                    bb=[[round(v,1) for v in m.bounds[0]],[round(v,1) for v in m.bounds[1]]])
        m.export(f'{OUT}/{n}.stl')
    print(json.dumps(rep))
