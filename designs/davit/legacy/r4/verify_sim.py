"""Verify data_r4.json against the runtime's collision semantics:
point-vs-point < touch(1.2) over all same-side body pairs, with per-pair
skip masks. Assert: presets + 400 random legal poses are clean, and
clearing the masks makes designed contacts appear (machinery works)."""
import numpy as np, json, base64
from scipy.spatial import cKDTree
from assembly import chain, T

D=json.load(open('data_r4.json'))
C=D['constm']; TOUCH=C['touch']; D2R=np.pi/180
def dec(rec):
    q=np.frombuffer(base64.b64decode(rec['p']),dtype=np.uint16).reshape(-1,3)
    lo=np.array(rec['lo']); hi=np.array(rec['hi'])
    return lo+q/65535.0*(hi-lo)
PTS={k:dec(v) for k,v in D['prox'].items()}

BODIES=[('mount',None),('base',None),('crank','crank'),('upper','upper'),
 ('fore','fore'),('palm','palm'),('jaw_drive','jaw_drive'),
 ('jaw_idle','jaw_idle'),('pincap','pincap')]+[('hw%d'%i,None) for i in range(10)]
SIMNAME={'hw%d'%i:('mic_servo#%d'%i if i%2==0 else 'mic_horn#%d'%i) for i in range(10)}
for k,_ in BODIES:
    if not k.startswith('hw'): SIMNAME[k]=k
PROXKEY={'crank':'mini_crank','upper':'mini_upper','fore':'mini_fore','palm':'palm',
 'jaw_drive':'jaw_drive','jaw_idle':'jaw_idle','pincap':'pincap','base':'mini_base'}
for i in range(10): PROXKEY['hw%d'%i]='mic_servo' if i%2==0 else 'mic_horn'

def masks_for(pipe):
    SK={}
    for pr in D['pairsMini']+D['hubPairsMini'][pipe]:
        key=(pr['a'],pr['b']) if pr['a']<pr['b'] else (pr['b'],pr['a'])
        flip=not (pr['a']<pr['b'])
        SK[key]=(set(pr['skipB'] if flip else pr['skipA']),
                 set(pr['skipA'] if flip else pr['skipB']))
    return SK

def bodies_at(pose,pipe):
    xf=C['XF'][pipe]; off=C['base_off'][pipe]
    links,hw=chain(xf,pose,model='mini')
    out=[]
    for name,_ in BODIES:
        if name=='mount': Tm=np.eye(4); pk='mount_'+pipe
        elif name=='base': Tm=T([off,0,0]); pk='mini_base'
        elif name.startswith('hw'): Tm=hw[int(name[2:])][1]; pk=PROXKEY[name]
        else: Tm=links[name]; pk=PROXKEY[name]
        out.append((SIMNAME[name],PTS[pk]@Tm[:3,:3].T+Tm[:3,3]))
    return out

def collide(pose,pipe,SK):
    B=bodies_at(pose,pipe); hits=[]
    for i in range(len(B)):
        for j in range(i+1,len(B)):
            (na,pa),(nb,pb)=B[i],B[j]
            if (pa.min(0)>pb.max(0)+TOUCH).any() or (pb.min(0)>pa.max(0)+TOUCH).any():
                continue
            key=(na,nb) if na<nb else (nb,na)
            mA,mB=SK.get(key,(set(),set()))
            if na>nb: mA,mB=mB,mA
            d,idx=cKDTree(pb).query(pa,k=1,distance_upper_bound=TOUCH)
            close=np.where(np.isfinite(d)&(d<TOUCH))[0]
            for ii in close:
                if ii in mA: continue
                if int(idx[ii]) in mB: continue
                hits.append((na,nb)); break
    return hits

PRESETS=[dict(pitch=0,roll=0,elbow=0,wrist=0,grip=35),
 dict(pitch=55,roll=25,elbow=-70,wrist=40,grip=30),
 dict(pitch=-35,roll=0,elbow=-95,wrist=0,grip=6),
 dict(pitch=100,roll=0,elbow=-105,wrist=90,grip=3)]
def rad(p): return {k:v*D2R for k,v in p.items()}

if __name__=='__main__':
    rng=np.random.default_rng(7)
    fails=[]
    for pipe in ('1in','125in','15in'):
        SK=masks_for(pipe)
        for p in PRESETS:
            h=collide(rad(p),pipe,SK)
            if h: fails.append((pipe,p,h))
        n=134 if pipe!='125in' else 140
        for _ in range(n):
            p={k:rng.uniform(*C['limits'][k]) for k in ('pitch','roll','elbow','wrist','grip')}
            h=collide(rad(p),pipe,SK)
            if h: fails.append((pipe,p,h))
    print('legal-pose fails:',len(fails))
    for f in fails[:8]: print(' ',f)
    # sanity: with masks removed, designed contacts must appear at zero pose
    h=collide(rad(PRESETS[0]),'125in',{})
    print('unmasked zero-pose contacts (expect >5):',len(h))
    assert not fails and len(h)>5
    print('VERIFY PASS')
