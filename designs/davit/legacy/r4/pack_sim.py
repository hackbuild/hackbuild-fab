"""Pack R4 geometry into the sim's DATA blob (mini only).
Schema matches the R3 runtime exactly:
  parts/hw records: {v,f,nv,nf,ft,lo,hi,vol,com} v=b64 u16 quantized, f=b64 u16/u32
  prox records:     {p,n,lo,hi,g} g=[cx,cy,cz,r,i0,i1] cluster spheres over
                    contiguous ranges of the cluster-sorted point array
  pairsMini:        [{a,b,skipA,skipB}] point-index whitelists calibrated by
                    sweeping each pair's governing joint through its legal
                    range at 1 deg and masking anything within 1.45 mm
                    (runtime threshold is 1.2)
  hubPairsMini:     {pipe:[{a:'base',b:'mount',skipA,skipB}]}
"""
import numpy as np, trimesh, json, base64
from scipy.spatial import cKDTree
from lib import MIC, servo_mesh, horn_mesh
from assembly import chain, T

D2R=np.pi/180
TOUCH=1.2; MARGIN=1.45
CONSTM={"XF":{"1in":48.7,"125in":53.1,"15in":56.15},"BX":26.0,"s1_z":5.4,"dx":11.2,
 "rface":-52.0,"wface":-70.0,"ehx":10.0,
 "base_off":{"1in":25.05,"125in":29.45,"15in":32.5},
 "kinds":["MIC","MIC","MIC","MIC","MIC"],
 "crank_dz":-42.0,"elb_dz":-62.0,"wrist_dx":-2.0,"palm_dz":-60.0,
 "jaw_y":14.6,"jaw_z":-44.0,"jaw_cc":16.0,"cap_y":21.4,
 "tip_local":[-8.0,18.0,-90.0],"touch":1.2,
 "limits":{"pitch":[-120,120],"roll":[-180,180],"elbow":[-110,110],
           "wrist":[-180,180],"grip":[3,46]},"density":1.24}
SERVO={"STD":{"stall48":9.4,"stall60":11.0,"mass":55.0,"shaft_off":10.4,"H":38.0},
       "MIC":{"stall48":1.8,"stall60":2.2,"mass":13.4,"shaft_off":5.4,
              "H":22.799999999999997}}

def b64(a): return base64.b64encode(a.tobytes()).decode()

def part_record(m):
    # face soup: per-face vertices so computeVertexNormals yields flat facets
    v=np.asarray(m.triangles,dtype=np.float64).reshape(-1,3)
    lo=v.min(0); hi=v.max(0); span=np.where(hi-lo<1e-9,1.0,hi-lo)
    q=np.round((v-lo)/span*65535).astype(np.uint16)
    f=np.arange(len(v),dtype=np.uint32).reshape(-1,3)
    ft='u16' if len(v)<65536 else 'u32'
    fb=f.astype(np.uint16 if ft=='u16' else np.uint32)
    return dict(v=b64(q),f=b64(fb),nv=int(len(v)),nf=int(len(f)),ft=ft,
                lo=[round(float(x),5) for x in lo],hi=[round(float(x),5) for x in hi],
                vol=round(float(m.volume),1),
                com=[round(float(x),4) for x in m.center_mass])

def prox_record(m,n_pts=850,cell=13.0):
    pts=trimesh.sample.sample_surface_even(m,n_pts)[0]
    if len(pts)<n_pts:
        extra=trimesh.sample.sample_surface(m,n_pts-len(pts))[0]
        pts=np.vstack([pts,extra])
    key=np.floor(pts/cell).astype(int)
    order=np.lexsort((key[:,2],key[:,1],key[:,0]))
    pts=pts[order]; key=key[order]
    g=[]; i0=0
    for i in range(1,len(pts)+1):
        if i==len(pts) or (key[i]!=key[i0]).any():
            c=pts[i0:i].mean(0); r=np.linalg.norm(pts[i0:i]-c,axis=1).max()+0.01
            g.append([round(float(c[0]),2),round(float(c[1]),2),round(float(c[2]),2),
                      round(float(r),2),float(i0),float(i)])
            i0=i
    lo=pts.min(0); hi=pts.max(0); span=np.where(hi-lo<1e-9,1.0,hi-lo)
    q=np.round((pts-lo)/span*65535).astype(np.uint16)
    return dict(p=b64(q),n=int(len(pts)),
                lo=[round(float(x),5) for x in lo],hi=[round(float(x),5) for x in hi],
                g=g), pts

def load_all():
    M={}
    for n in ['davit_mini_crank','davit_mini_upper','davit_mini_fore','davit_palm',
              'davit_jaw_drive','davit_jaw_idle','davit_pincap','davit_mini_base',
              'davit_mount_1in','davit_mount_125in','davit_mount_15in']:
        M[n]=trimesh.load(f'stl_r4/{n}.stl')
    M['mic_servo']=servo_mesh(MIC)
    M['mic_horn']=horn_mesh(MIC)          # real horn: hub clamp gets whitelisted
    return M

LINK_OF={'crank':'crank','upper':'upper','fore':'fore','palm':'palm',
 'jaw_drive':'jaw_drive','jaw_idle':'jaw_idle','pincap':'pincap'}
def depth(l):
    return {None:0,'hub':0,'crank':1,'upper':2,'fore':3,'palm':4,
            'jaw_drive':5,'jaw_idle':5,'pincap':5}[l]
JOINT_AT={1:'pitch',2:'roll',3:'elbow',4:'wrist',5:'grip'}
LIM=CONSTM['limits']

def body_T(name,pose,xf,off):
    links,hw=chain(xf,pose,model='mini')
    if name=='base': return T([off,0,0])
    if name=='mount': return np.eye(4)
    if name.startswith('hw'): return hw[int(name[2:])][1]
    return links[name]

def carrier(name):
    if name in ('base','mount'): return None
    if name.startswith('hw'):
        return [None,'crank','crank','upper','upper','fore','fore',
                'palm','palm','jaw_drive'][int(name[2:])]
    return name

PAIR_NAMES=[('crank','upper'),('crank','hw0'),('crank','hw1'),('crank','hw2'),
 ('fore','upper'),('hw2','upper'),('hw3','upper'),('hw4','upper'),
 ('fore','palm'),('fore','hw4'),('fore','hw5'),('fore','hw6'),
 ('jaw_idle','palm'),('palm','pincap'),('hw6','palm'),('hw7','palm'),('hw8','palm'),
 ('jaw_drive','jaw_idle'),('jaw_drive','hw8'),('jaw_drive','hw9'),
 ('jaw_idle','pincap'),('hw1','hw0'),('hw3','hw2'),('hw5','hw4'),('hw7','hw6'),
 ('hw9','hw8'),('hw9','palm'),('base','crank'),('base','hw0')]
SIMNAME={'hw%d'%i:('mic_servo#%d'%i if i%2==0 else 'mic_horn#%d'%i) for i in range(10)}
for k in ['crank','upper','fore','palm','jaw_drive','jaw_idle','pincap','base','mount']:
    SIMNAME[k]=k
PROXKEY={'crank':'mini_crank','upper':'mini_upper','fore':'mini_fore','palm':'palm',
 'jaw_drive':'jaw_drive','jaw_idle':'jaw_idle','pincap':'pincap','base':'mini_base'}
for i in range(10): PROXKEY['hw%d'%i]='mic_servo' if i%2==0 else 'mic_horn'
MESHKEY={'crank':'davit_mini_crank','upper':'davit_mini_upper','fore':'davit_mini_fore',
 'palm':'davit_palm','jaw_drive':'davit_jaw_drive','jaw_idle':'davit_jaw_idle',
 'pincap':'davit_pincap','base':'davit_mini_base'}
for i in range(10): MESHKEY['hw%d'%i]='mic_servo' if i%2==0 else 'mic_horn'

def calib_pair(a,b,PPTS,xf,off,mount=None):
    da,db=depth(carrier(a)),depth(carrier(b))
    dofs=[]
    if da!=db: dofs=[JOINT_AT[max(da,db)]]
    elif da==5: dofs=['grip']
    base=dict(pitch=0,roll=0,elbow=0,wrist=0,grip=25*D2R)
    if not dofs: grid=[base]
    else:
        j=dofs[0]; lo,hi=LIM[j]
        n=int(hi-lo)+1
        grid=[]
        for v in np.linspace(lo,hi,n):
            p=dict(base); p[j]=v*D2R; grid.append(p)
    ka,kb=PROXKEY[a],PROXKEY[b] if mount is None else mount
    if b=='mount': kb=mount
    mA=np.zeros(len(PPTS[ka]),bool); mB=np.zeros(len(PPTS[kb]),bool)
    for p in grid:
        Ta=body_T(a,p,xf,off); Tb=body_T(b,p,xf,off)
        pa=PPTS[ka]@Ta[:3,:3].T+Ta[:3,3]; pb=PPTS[kb]@Tb[:3,:3].T+Tb[:3,3]
        if (pa.min(0)>pb.max(0)+MARGIN).any() or (pb.min(0)>pa.max(0)+MARGIN).any():
            continue
        tb=cKDTree(pb); ta=cKDTree(pa)
        dA=tb.query(pa,k=1,distance_upper_bound=MARGIN)[0]
        dB=ta.query(pb,k=1,distance_upper_bound=MARGIN)[0]
        mA|=np.isfinite(dA)&(dA<MARGIN); mB|=np.isfinite(dB)&(dB<MARGIN)
    return mA,mB

if __name__=='__main__':
    M=load_all()
    parts={}; hw={}
    for k,m in M.items():
        (hw if k in ('mic_servo','mic_horn') else parts)[k if k.startswith('mic') else k]=part_record(m)
    prox={}; PPTS={}
    for name,key in [('davit_mini_crank','mini_crank'),('davit_mini_upper','mini_upper'),
        ('davit_mini_fore','mini_fore'),('davit_palm','palm'),
        ('davit_jaw_drive','jaw_drive'),('davit_jaw_idle','jaw_idle'),
        ('davit_pincap','pincap'),('davit_mini_base','mini_base'),
        ('davit_mount_1in','mount_1in'),('davit_mount_125in','mount_125in'),
        ('davit_mount_15in','mount_15in'),('mic_servo','mic_servo'),('mic_horn','mic_horn')]:
        n= 500 if key in ('pincap','jaw_drive','jaw_idle','mic_horn') else 850
        prox[key],PPTS[key]=prox_record(M[name],n_pts=n)
        print('prox',key,prox[key]['n'],'pts',len(prox[key]['g']),'clusters')
    xf=CONSTM['XF']['125in']; off=CONSTM['base_off']['125in']
    pairsMini=[]
    for a,b in PAIR_NAMES:
        mA,mB=calib_pair(a,b,PPTS,xf,off)
        pairsMini.append(dict(a=SIMNAME[a],b=SIMNAME[b],
            skipA=np.where(mA)[0].tolist(),skipB=np.where(mB)[0].tolist()))
        print('pair %s~%s masked %d/%d'%(SIMNAME[a],SIMNAME[b],int(mA.sum()),int(mB.sum())))
    hubPairsMini={}
    for pipe in ('1in','125in','15in'):
        xf=CONSTM['XF'][pipe]; off=CONSTM['base_off'][pipe]
        mk='mount_'+pipe
        mA,mB=calib_pair('base','mount',PPTS,xf,off,mount=mk)
        hubPairsMini[pipe]=[dict(a='base',b='mount',
            skipA=np.where(mA)[0].tolist(),skipB=np.where(mB)[0].tolist())]
        print('hub %s masked %d/%d'%(pipe,int(mA.sum()),int(mB.sum())))
    DATA=dict(parts=parts,hw=hw,prox=prox,pairsMini=pairsMini,
              hubPairsMini=hubPairsMini,servo=SERVO,const=CONSTM,constm=CONSTM)
    open('data_r4.json','w').write(json.dumps(DATA,separators=(',',':')))
    import os
    print('data_r4.json bytes:',os.path.getsize('data_r4.json'))
