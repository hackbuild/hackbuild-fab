"""Tiny z-buffer flat-shade renderer -> PNG. No GL needed."""
import numpy as np, trimesh
from PIL import Image

def look(mesh_v, az, el, pad=1.12):
    c = (mesh_v.max(0)+mesh_v.min(0))/2
    v = mesh_v - c
    a, e = np.radians(az), np.radians(el)
    Rz = np.array([[np.cos(a),-np.sin(a),0],[np.sin(a),np.cos(a),0],[0,0,1]])
    Rx = np.array([[1,0,0],[0,np.cos(e),-np.sin(e)],[0,np.sin(e),np.cos(e)]])
    return v @ Rz.T @ Rx.T, c

def render(mesh, az=30, el=-65, W=880, H=760, color=(255,140,60)):
    v, _ = look(mesh.vertices, az, el)
    f = mesh.faces
    s = min(W,H)*0.86/ max(np.ptp(v[:,0]), np.ptp(v[:,1]), 1e-6)
    xy = v[:,:2]*s; xy[:,1]*=-1
    xy += [W/2, H/2]
    z = v[:,2]
    tri = xy[f]; tz = z[f]
    n3 = np.cross(v[f[:,1]]-v[f[:,0]], v[f[:,2]]-v[f[:,0]])
    nl = np.linalg.norm(n3,axis=1); nl[nl==0]=1
    n3 = n3/nl[:,None]
    lite = 0.28+0.72*np.clip(n3 @ np.array([0.35,0.45,0.82]),0,1)
    img = np.full((H,W,3), 24, np.uint8)
    zb = np.full((H,W), -1e9)
    order = np.argsort(tz.mean(1))
    base = np.array(color,float)
    for i in order:
        p = tri[i]; pz = tz[i]
        x0,y0 = np.floor(p.min(0)).astype(int); x1,y1 = np.ceil(p.max(0)).astype(int)
        x0=max(x0,0);y0=max(y0,0);x1=min(x1,W-1);y1=min(y1,H-1)
        if x1<x0 or y1<y0: continue
        xs,ys = np.meshgrid(np.arange(x0,x1+1), np.arange(y0,y1+1))
        d = (p[1,1]-p[2,1])*(p[0,0]-p[2,0])+(p[2,0]-p[1,0])*(p[0,1]-p[2,1])
        if abs(d)<1e-9: continue
        w0 = ((p[1,1]-p[2,1])*(xs-p[2,0])+(p[2,0]-p[1,0])*(ys-p[2,1]))/d
        w1 = ((p[2,1]-p[0,1])*(xs-p[2,0])+(p[0,0]-p[2,0])*(ys-p[2,1]))/d
        w2 = 1-w0-w1
        m = (w0>=-1e-6)&(w1>=-1e-6)&(w2>=-1e-6)
        if not m.any(): continue
        pzv = w0*pz[0]+w1*pz[1]+w2*pz[2]
        sub = zb[y0:y1+1, x0:x1+1]
        upd = m & (pzv > sub)
        sub[upd] = pzv[upd]
        col = np.clip(base*lite[i],0,255).astype(np.uint8)
        img[y0:y1+1, x0:x1+1][upd] = col
    return Image.fromarray(img)

def sheet(meshes_angles, path, W=880, H=760, cols=None, labels=None):
    ims=[render(m, az, el, W, H, color=c) for (m,az,el,c) in meshes_angles]
    n=len(ims); cols = cols or n
    rows = (n+cols-1)//cols
    S = Image.new('RGB',(W*cols, H*rows),(24,24,24))
    from PIL import ImageDraw
    for i,im in enumerate(ims):
        S.paste(im,((i%cols)*W,(i//cols)*H))
    if labels:
        d=ImageDraw.Draw(S)
        for i,t in enumerate(labels):
            d.text(((i%cols)*W+14,(i//cols)*H+10), t, fill=(240,240,240))
    S.save(path)
