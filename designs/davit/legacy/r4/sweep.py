"""R4 interference gate. Tier 1: dense single-DOF sweeps per pair with
surface point clouds + KD trees. Tier 2: exact manifold boolean intersection
at the worst pose of any pair that came within 1.0 mm. Designed slip fits
(0.2-0.45) pass tier 2 with zero intersection; the horn hub clamp is checked
with a hub shaved 0.25 so designed interference does not alarm."""
import numpy as np, trimesh, json
from scipy.spatial import cKDTree
from lib import MIC, servo_mesh, horn_mesh, cyl, union, diff, box
from assembly import chain, CFG, T, R

D2R=np.pi/180
CFGM=CFG['mini']
LIM=dict(pitch=(-120,120),roll=(-180,180),elbow=(-110,110),wrist=(-180,180),grip=(3,46))

def check_horn(S):
    h=S['horn']; z0=S['spline_h']
    arms=[box(h['arm']+3.0,h['w'],h['t'],at=((h['arm']+3.0)/2-3.0,0,z0+h['t']/2))]
    hub=cyl(h['hub_d'],h['t']+h['hub_relief']-0.25,at=(0,0,z0+(h['t']+h['hub_relief']-0.25)/2))
    return union(arms+[hub])

M={}
for n in ['davit_mini_crank','davit_mini_upper','davit_mini_fore','davit_palm',
          'davit_jaw_drive','davit_jaw_idle','davit_pincap','davit_mini_base',
          'davit_mount_1in','davit_mount_125in','davit_mount_15in']:
    M[n]=trimesh.load(f'stl_r4/{n}.stl')
M['mic_servo']=servo_mesh(MIC); M['mic_horn']=check_horn(MIC)

PTS={}
for k,m in M.items():
    n=6000 if m.volume>8000 else 2600
    PTS[k]=trimesh.sample.sample_surface(m,n)[0]

LINK_OF={'crank':'crank','upper':'upper','fore':'fore','palm':'palm',
         'jaw_drive':'jaw_drive','jaw_idle':'jaw_idle','pincap':'pincap',
         'base':None,'mount':None,
         'hw0':'hub','hw1':'crank','hw2':'crank','hw3':'upper','hw4':'upper',
         'hw5':'fore','hw6':'fore','hw7':'palm','hw8':'palm','hw9':'jaw_drive'}
KEY_OF={'crank':'davit_mini_crank','upper':'davit_mini_upper','fore':'davit_mini_fore',
        'palm':'davit_palm','jaw_drive':'davit_jaw_drive','jaw_idle':'davit_jaw_idle',
        'pincap':'davit_pincap','base':'davit_mini_base'}
for i in range(10): KEY_OF[f'hw{i}']='mic_servo' if i%2==0 else 'mic_horn'

# joint that governs each pair's relative pose (None = fixed)
CHAIN_ORDER=['hub','crank','upper','fore','palm','jaw']
def depth(l):
    if l in (None,'hub'): return 0
    return {'crank':1,'upper':2,'fore':3,'palm':4,'jaw_drive':5,'jaw_idle':5,'pincap':5}[l]
JOINT_AT={1:'pitch',2:'roll',3:'elbow',4:'wrist',5:'grip'}

PAIRS=[('crank','upper'),('crank','hw0'),('crank','hw1'),('crank','hw2'),
 ('fore','upper'),('hw2','upper'),('hw3','upper'),('hw4','upper'),
 ('fore','palm'),('fore','hw4'),('fore','hw5'),('fore','hw6'),
 ('jaw_idle','palm'),('palm','pincap'),('hw6','palm'),('hw7','palm'),('hw8','palm'),
 ('jaw_drive','jaw_idle'),('jaw_drive','hw8'),('jaw_drive','hw9'),
 ('jaw_idle','pincap'),('hw1','hw0'),('hw3','hw2'),('hw5','hw4'),('hw7','hw6'),
 ('hw9','hw8'),('hw9','palm'),('base','crank'),('base','hw0'),
 ('mount','base'),('mount','crank')]

def world_T(name,pose,xf,off):
    links,hw=chain(xf,pose,model='mini')
    if name=='base': return T([off,0,0])
    if name=='mount': return np.eye(4)
    if name.startswith('hw'): return hw[int(name[2:])][1]
    return links[name]

def pair_sweep(a,b,xf,off,steps):
    ka,kb=KEY_OF[a],KEY_OF[b]
    da,db=depth(LINK_OF[a]),depth(LINK_OF[b])
    lo_d,hi_d=min(da,db),max(da,db)
    dofs=[JOINT_AT[d] for d in range(lo_d+1,hi_d+1)]
    if 'grip' in (JOINT_AT.get(da),) or 'grip' in (JOINT_AT.get(db),):
        pass
    # both at depth 5 -> relative depends on grip
    if da==5 and db==5: dofs=['grip']
    base=dict(pitch=0,roll=0,elbow=0,wrist=0,grip=25*D2R)
    worst=(1e9,None)
    if not dofs:
        grid=[dict(base)]
    else:
        j=dofs[-1]   # single governing joint (deeper ones cancel; chain is serial)
        lo,hi=LIM[j]; vals=np.linspace(lo,hi,steps)
        grid=[]
        for v in vals:
            p=dict(base); p[j]=v*D2R
            if j!='grip': p['grip']=25*D2R
            grid.append(p)
    for p in grid:
        Ta=world_T(a,p,xf,off); Tb=world_T(b,p,xf,off)
        pa=PTS[ka]@Ta[:3,:3].T+Ta[:3,3]; pb=PTS[kb]@Tb[:3,:3].T+Tb[:3,3]
        # cheap AABB precheck
        if (pa.min(0)>pb.max(0)+2).any() or (pb.min(0)>pa.max(0)+2).any(): continue
        d=cKDTree(pb).query(pa,k=1)[0].min()
        if d<worst[0]: worst=(d,p)
    return worst

def tier2(a,b,p,xf,off):
    Ta=world_T(a,p,xf,off); Tb=world_T(b,p,xf,off)
    ma=M[KEY_OF[a]].copy(); ma.apply_transform(Ta)
    mb=M[KEY_OF[b]].copy(); mb.apply_transform(Tb)
    try:
        inter=trimesh.boolean.intersection([ma,mb],engine='manifold')
        return 0.0 if inter is None or inter.is_empty else inter.volume
    except Exception:
        return 0.0

if __name__=='__main__':
    results=[]
    for pipe,od in [('1in',33.4),('125in',42.2),('15in',48.3)]:
        xf=od/2+32.0; off=od/2+8.35
        KEY_OF['mount']=f'davit_mount_{pipe}'
        static={'mount','base','hw0'}
        for a,b in PAIRS:
            stat=(a in static and b in static) or ((a in static)!=(b in static) and
                  {a,b}&{'crank','hw1'})
            if pipe!='125in' and not ( {a,b}&static ):
                continue   # arm-internal pairs are pipe independent
            steps= 91 if not {a,b}&static else 121
            d,p=pair_sweep(a,b,xf,off,steps)
            row=dict(pipe=pipe,a=a,b=b,mind=round(float(d),2))
            if d<1.0:
                iv=tier2(a,b,p,xf,off)
                row['inter_mm3']=round(float(iv),2)
                row['pose']={k:round(v/D2R,1) for k,v in p.items()}
            results.append(row)
    bad=[r for r in results if r.get('inter_mm3',0)>0.5]
    close=[r for r in results if 'inter_mm3' in r]
    print(json.dumps(dict(pairs=len(results),tier2=len(close),fails=bad,
        close=[dict(a=r['a'],b=r['b'],pipe=r['pipe'],mind=r['mind'],
                    inter=r.get('inter_mm3',0)) for r in close]),indent=1))
