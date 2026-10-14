"""Kinematic assembly for DAVIT. Right arm chain, left = RotZ(pi) premultiply.
Pose dict: pitch, roll, elbow, wrist, grip (radians, zero = hanging, grip=open rad).
"""
import numpy as np, trimesh
from lib import STD, MIC, servo_mesh, horn_mesh

def T(t): 
    m=np.eye(4); m[:3,3]=t; return m
def R(ax,a):
    return trimesh.transformations.rotation_matrix(a,ax)

CFG={
 'std': dict(dx=12.0, s1z=10.4, bx=32.0, cdz=-50.0, edz=-88.0, wdx=-3.6,
             pdz=-86.0, face=8.0, kinds=('STD','MIC','STD','MIC','MIC'),
             rface=-60.0, wface=-96.0, ehx=14.0),
 'mini':dict(dx=11.2, s1z=5.4, bx=26.0, cdz=-42.0, edz=-62.0, wdx=-2.0,
             pdz=-60.0, face=8.0, kinds=('MIC','MIC','MIC','MIC','MIC'),
             rface=-52.0, wface=-70.0, ehx=10.0),
}
def chain(xf, pose, left=False, model='std'):
    """Returns dict link_name -> 4x4 world transform, plus servo/horn placements
    [(kind, world_T, carrier_link)]."""
    cfg=CFG[model]
    base = R([0,0,1],np.pi) if left else np.eye(4)
    Tc = base @ T([xf+cfg['dx'],0,cfg['s1z']]) @ R([1,0,0], pose['pitch'])
    Tu = Tc @ T([cfg['bx'],0,cfg['cdz']]) @ R([0,0,1], pose['roll'])
    Tf = Tu @ T([0,0,cfg['edz']]) @ R([1,0,0], pose['elbow'])
    Tp = Tf @ T([cfg['wdx'],0,cfg['pdz']]) @ R([0,0,1], pose['wrist'])
    a = pose['grip']
    Tjd = Tp @ T([0,14.6,-44]) @ R([0,1,0],-a) @ R([1,0,0],-np.pi/2)
    Tji = Tp @ T([-16,14.6,-44]) @ R([0,1,0], a) @ R([1,0,0],-np.pi/2)
    Tcap = Tp @ T([-16,21.4,-44]) @ R([1,0,0],-np.pi/2)
    links = {'crank':Tc,'upper':Tu,'fore':Tf,'palm':Tp,
             'jaw_drive':Tjd,'jaw_idle':Tji,'pincap':Tcap}
    RY=R([0,1,0],np.pi/2); RX=R([1,0,0],np.pi); RXn=R([1,0,0],-np.pi/2)
    k=cfg['kinds']; lo=lambda s:'std' if s=='STD' else 'mic'
    hw=[(lo(k[0])+'_servo', base@T([xf+cfg['face'],0,cfg['s1z']])@RY@R([0,0,1],np.pi), 'hub'),
        (lo(k[0])+'_horn',  Tc@T([cfg['face']-cfg['dx'],0,0])@RY, 'crank'),
        ('mic_servo', Tc@T([cfg['bx'],0,cfg['rface']])@RX@R([0,0,1],np.pi), 'crank'),
        ('mic_horn',  Tu@T([0,0,-10])@RX, 'upper'),
        (lo(k[2])+'_servo', Tu@T([cfg['ehx'],0,cfg['edz']])@RY, 'upper'),
        (lo(k[2])+'_horn',  Tf@T([cfg['ehx'],0,0])@RY, 'fore'),
        ('mic_servo', Tf@T([cfg['wdx'],0,cfg['wface']])@RX@R([0,0,1],np.pi), 'fore'),
        ('mic_horn',  Tp@T([0,0,-10])@RX, 'palm'),
        ('mic_servo', Tp@T([0,11.4,-44])@RXn@R([0,0,1],np.pi/2), 'palm'),
        ('mic_horn',  Tjd@T([0,0,-3.2]), 'jaw_drive')]
    return links, hw

SERVO_PTS = [  # (kind, link, local case-center offset from servo origin) for mass
    ('STD','hub',      lambda xf:[xf+8,0,-19]),
    ('MIC','crank',    lambda xf:[32+5.4,0,-48.6]),
    ('STD','upper',    lambda xf:[14-19,0,-88+0]),   # case center ~19 below face
    ('MIC','fore',     lambda xf:[-3.6+5.4,0,-96+11.4]),
    ('MIC','palm',     lambda xf:[0,0,-38.6]),
]
