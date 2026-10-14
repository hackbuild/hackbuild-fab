#!/usr/bin/env python3
"""Can the clip actually go into the board? 2D configuration space search.
A round rod in a round hole reduces exactly to discs in the mid plane (the nearest point of
the bore to a sphere centred on the mid plane lies in that plane), so the side view is the
whole problem. Best first search from the seated pose until the hook is clear of the board."""
import math, sys, json, heapq, itertools
from shapely.geometry import LineString, Polygon, box, Point
from shapely.ops import unary_union
from shapely import affinity
from shapely.prepared import prep

PITCH=25.4
def hook_centreline(tb, gap, Rb, sweep_deg, ext, n=24):
    """straight run through the board, then an arc turning up, then a straight tail"""
    x0=-(tb+gap)
    pts=[(2.0,0.0),(x0,0.0)]
    cx,cy=x0,Rb                       # arc centre above the run end
    for k in range(1,n+1):
        a=math.radians(sweep_deg)*k/n
        pts.append((cx-Rb*math.sin(a), cy-Rb*math.cos(a)))
    a=math.radians(sweep_deg)
    tx,ty=-math.cos(a),math.sin(a)     # tangent at arc end
    ex=(pts[-1][0]+tx*ext, pts[-1][1]+ty*ext)
    pts.append(ex)
    return pts

def clip_poly(tb, hole, d_rod, gap=0.6, Rb=7.0, sweep=80.0, ext=3.0, stub_len=None, d_stub=None, spine_d=4.0):
    r=d_rod/2
    cl=hook_centreline(tb,gap,Rb,sweep,ext)
    rod=LineString(cl).buffer(r,resolution=16)
    sl=stub_len if stub_len else min(tb,5.0)
    rs=(d_stub or d_rod)/2
    stub=LineString([(2,-PITCH),(-(sl-rs),-PITCH)]).buffer(rs,resolution=16)
    spine=box(0.0,-PITCH-7,spine_d+2.8,r)
    g=unary_union([rod,stub,spine])
    tip=cl[-1]
    return g, dict(r=r,tip=tip,top=tip[1]+r,cl=cl,sl=sl)

def board(tb,hole,rows=(-3,3)):
    ys=[k*PITCH for k in range(rows[0],rows[1]+1)]
    edges=[-200]+sum([[y-hole/2,y+hole/2] for y in ys],[])+[200]
    return unary_union([box(-tb,edges[i],0,edges[i+1]) for i in range(0,len(edges),2)])

def search(tb,hole,d_rod,DT=1.0,DX=0.2,budget=250000,**kw):
    clip,info=clip_poly(tb,hole,d_rod,**kw)
    Bp=prep(board(tb,hole).buffer(-0.01))
    rot={}
    def pose(s):
        t,i,j=s
        if t not in rot: rot[t]=affinity.rotate(clip,t*DT,origin=(0,0))
        return affinity.translate(rot[t],i*DX,j*DX)
    start=(0,0,0)
    if Bp.intersects(pose(start)): return False,info,'seated pose collides'
    cnt=itertools.count()
    pq=[(0.0,next(cnt),start)]; seen={start}; n=0; best_t=0
    while pq:
        _,_,s=heapq.heappop(pq); n+=1
        g=pose(s)
        best_t=max(best_t,s[0]*DT)
        if g.bounds[0]>0.5: return True,info,f'clear after {n} poses, max tilt {best_t:.0f} deg'
        t,i,j=s
        for d in ((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1),(1,1,0),(1,0,1),(1,0,-1),(1,1,1),(1,1,-1)):
            ns=(t+d[0],i+d[1],j+d[2])
            if not(0<=ns[0]*DT<=100 and -12<=ns[1]*DX<=40 and -25<=ns[2]*DX<=25): continue
            if ns in seen: continue
            seen.add(ns)
            gg=pose(ns)
            if Bp.intersects(gg): continue
            heapq.heappush(pq,(-gg.bounds[0]-0.02*ns[0]*DT,next(cnt),ns))
        if n>budget: return False,info,f'budget, max tilt {best_t:.0f}'
    return False,info,f'trapped, max tilt {best_t:.0f} deg'

if __name__=='__main__' and (len(sys.argv)<2 or sys.argv[1]!='verify'):
    hole=float(sys.argv[1]) if len(sys.argv)>1 else 6.35
    for tb in (4.8,6.35):
        for d_rod,Rb,sweep,ext in itertools.product((5.4,5.7),(6.0,8.0),(70.0,85.0),(2.0,4.0)):
            okk,info,msg=search(tb,hole,d_rod,Rb=Rb,sweep=sweep,ext=ext)
            eng=info['top']-hole/2
            print(f'hole {hole} tb {tb:5.2f} rod {d_rod} Rb {Rb} sweep {sweep:.0f} ext {ext} | rises {eng:4.1f} above hole -> {"OK " if okk else "NO "} {msg}',flush=True)

def design(hole, tb, fit=0.95, margin=0.2):
    """closed form: rod diameter from the hole, smallest bend radius whose swept arc clears the bore"""
    d=round(hole-fit,2)
    Rb=d/2+1.0
    while True:
        outer=Rb+d/2; inner=Rb-d/2
        if inner>tb/2:
            h=outer-math.sqrt(inner*inner-(tb/2)**2)
            if h<=hole-margin: break
        Rb+=0.25
    return d,Rb

def design_full(hole, tb, fit=0.95, margin=0.35, rise=5.5, ext=2.0):
    d,Rb=design(hole,tb,fit,margin)
    s=20.0
    while s<88:
        a=math.radians(s)
        if Rb*(1-math.cos(a))+ext*math.sin(a)+d/2-hole/2>=rise: break
        s+=1.0
    return dict(d=d,Rb=Rb,sweep=s,ext=ext,gap=0.6)

def verify_all():
    ok_all=True
    for hole,tb in ((6.35,6.35),(6.35,4.8),(6.35,3.2),(6.0,6.35),(6.0,4.8),(7.1,6.35),(7.1,4.8)):
        p=design_full(hole,tb)
        okk,info,msg=search(tb,hole,p['d'],Rb=p['Rb'],sweep=p['sweep'],ext=p['ext'],gap=p['gap'])
        ok_all&=okk
        print(f'hole {hole:4.2f} board {tb:4.2f} | rod {p["d"]:4.2f} bend R {p["Rb"]:5.2f} sweep {p["sweep"]:2.0f} | rises {info["top"]-hole/2:4.1f} mm behind the hole | {"INSERTS" if okk else "TRAPPED"} ({msg})',flush=True)
    return ok_all
if __name__=='__main__' and len(sys.argv)>1 and sys.argv[1]=='verify':
    sys.exit(0 if verify_all() else 1)
