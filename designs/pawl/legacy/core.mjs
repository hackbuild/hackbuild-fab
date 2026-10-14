/* PAWL sim core. No rendering. Imported by test.mjs and inlined into pawl.html
   by build.mjs so the browser and the headless test run identical physics. */

export const MM = 0.001, G = 9.81;
export const AX = { ankRoll:14, ankPitch:56, knee:122, hipPitch:188, hipRoll:214 };
export const SEG = 66, XLEG = 23, SHOX = 42, SHOY = 306;
export const OFF = (AX.hipRoll - AX.hipPitch) + (AX.ankPitch - AX.ankRoll);  // 68

export const ACT = {
  r150:{ tau:0.186, wmax:120*Math.PI/180, Jr:1.6e-8*150*150 },
  r100:{ tau:0.132, wmax:180*Math.PI/180, Jr:1.6e-8*100*100 },
  r50 :{ tau:0.069, wmax:360*Math.PI/180, Jr:1.6e-8*50*50  },
};
export const FOOTSIZE = {len:64, wid:36};
export const AE = { gb:[12,14,13], worm:[9.5,10], can:[15,11], boss:[6,2], shaft:[3,10] };

/* mout = which way the physical output shaft points. X-axis joints exit
   OUTBOARD on both sides; Z-axis joints exit FORWARD on both sides (parts are
   mirrored in x, so +Z features stay +Z). The anatomical `axis` keeps the
   control sign convention; mout is for placing hardware. */
export function joints(side){ const s = side; return [
 {k:'hipRoll', par:'torso',chi:'hipY', at:[XLEG*s,AX.hipRoll ,0], axis:[0,0,s],
  act:'r150',lim:[-20,35],carrier:'torso',can:[0,1,0],mout:[0,0,1],along:0,
  hint:'+ = leg swings outward (abduction)'},
 {k:'hipPitch',par:'hipY', chi:'thigh',at:[XLEG*s,AX.hipPitch,0], axis:[-1,0,0],
  act:'r150',lim:[-30,80],carrier:'thigh',can:[0,-1,0],mout:[s,0,0],along:0,
  hint:'+ = thigh swings forward (flexion)'},
 {k:'knee',    par:'thigh',chi:'shank',at:[XLEG*s,AX.knee    ,0], axis:[1,0,0],
  act:'r150',lim:[0,120], carrier:'shank',can:[0,-1,0],mout:[s,0,0],along:0,
  hint:'+ = heel toward hip. hard stop at 0, no hyperextension'},
 {k:'ankPitch',par:'shank',chi:'ankP', at:[XLEG*s,AX.ankPitch,0], axis:[-1,0,0],
  act:'r150',lim:[-35,35],carrier:'shank',can:[0,0.927,0.375],mout:[s,0,0],along:0,
  hint:'+ = toe up (dorsiflexion)'},
 {k:'ankRoll', par:'ankP', chi:'foot', at:[XLEG*s,AX.ankRoll ,0], axis:[0,0,s],
  act:'r150',lim:[-25,25],carrier:'ankP', can:[0,1,0],mout:[0,0,1],along:-16,
  hint:'+ = sole edge tips outward'},
 {k:'shoPitch',par:'torso',chi:'shoY', at:[SHOX*s,SHOY,0],        axis:[-1,0,0],
  act:'r50', lim:[-80,120],carrier:'torso',can:[0,-1,0],mout:[s,0,0],along:0,
  hint:'+ = arm swings forward'},
 {k:'shoRoll', par:'shoY', chi:'arm',  at:[SHOX*s,SHOY-14,0],     axis:[0,0,s],
  act:'r50', lim:[-5,95], carrier:'arm',  can:[0,-1,0],mout:[0,0,1],along:0,
  hint:'+ = arm lifts away from the body'},
];}

export const LINK = {
 torso:{m:150.3,box:[86,153,40],org:[0,AX.hipRoll,0]},
 hipY :{m:2.8,  box:[27,38,29], org:[XLEG,AX.hipRoll,0]},
 thigh:{m:24.1, box:[30,90,28], org:[XLEG,AX.hipPitch,0]},
 shank:{m:33.0, box:[21,66,28], org:[XLEG,AX.knee,0]},
 ankP :{m:22.8, box:[30,48,30], org:[XLEG,AX.ankPitch,0]},
 foot :{m:8.2,  box:[38,20,70], org:[XLEG,AX.ankRoll,0]},
 shoY :{m:8,    box:[18,18,18], org:[SHOX,SHOY,0]},
 arm  :{m:24,   box:[16,96,16], org:[SHOX,SHOY,0]},
};
export const COM = {torso:[0,54,0],hipY:[0,-11,0],thigh:[0,-44,0],shank:[0,-43,0],
                    ankP:[0,-21,-4],foot:[0,-9,5],shoY:[0,-8,0],arm:[0,-66,0]};
export const DRIVEN = {hipY:'r150',thigh:'r150',shank:'r150',ankP:'r150',
                       foot:'r150',shoY:'r50',arm:'r50'};

export const qMul=(a,b)=>({w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z,x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
 y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w});
export const qCon=a=>({w:a.w,x:-a.x,y:-a.y,z:-a.z});
export const qRot=(q,v)=>{const t={x:2*(q.y*v.z-q.z*v.y),y:2*(q.z*v.x-q.x*v.z),z:2*(q.x*v.y-q.y*v.x)};
 return {x:v.x+q.w*t.x+q.y*t.z-q.z*t.y,y:v.y+q.w*t.y+q.z*t.x-q.x*t.z,z:v.z+q.w*t.z+q.x*t.y-q.y*t.x};};
export const cl=(v,a,b)=>v<a?a:v>b?b:v;

/* leg IK. px,py,pz = ankle-ROLL axis relative to the hip-ROLL axis.
   with the sole held level the 26 mm hip and 42 mm ankle offsets are collinear
   with the leg, so they subtract off and a plain 2R chain is left. */
export function legIK(side,px,py,pz){
 const hipRoll=Math.atan2(px*side,-py);
 const wy=-Math.hypot(px,py);
 const r=-(wy+OFF*MM);
 const a=SEG*MM,b=SEG*MM;
 const L=cl(Math.hypot(r,pz),0.25*(a+b),0.995*(a+b));
 const knee=Math.PI-Math.acos(cl((a*a+b*b-L*L)/(2*a*b),-1,1));
 const hipPitch=Math.atan2(pz,r)+Math.acos(cl((a*a+L*L-b*b)/(2*a*L),-1,1));
 return {hipRoll,hipPitch,knee,ankPitch:knee-hipPitch,ankRoll:-hipRoll};
}
/* maximum hip-roll-axis height above ground that the leg can actually reach.
   214 straight. anything above this and the IK clamps to a locked-knee
   singularity, which is what made the first build fall over. */
export const HIP_MAX = AX.ankRoll + OFF + 2*SEG;   // 214, legs dead straight
/* the leg is a symmetric 2R, so ankle pitch always equals hip pitch and the
   ankle stop is what really caps the crouch. at +/-35 deg the knee reaches 70
   and the hip can drop to 190 mm. going above ~212.5 puts the IK on the
   locked-knee singularity, which is what toppled the first build. */
export const STANCE_MAX = 0.2125;
export const STANCE_MIN = (AX.ankRoll + OFF + 2*SEG*Math.cos(35*Math.PI/180))*MM;

/* decode a quantised indexed mesh into a Float32Array of positions, in the
   LINK's own frame. parts.py emits everything at x=0 in world-zero coords, so
   subtract the link origin height and mirror x for the right leg.            */
export function meshVerts(M, key, side){
 const raw=(typeof atob==='function')?atob(M.p):Buffer.from(M.p,'base64').toString('binary');
 const n=M.nv, out=new Float32Array(n*3);
 const org=LINK[key].org;
 for(let i=0;i<n;i++){
  const o=i*6;
  const qx=(raw.charCodeAt(o)|(raw.charCodeAt(o+1)<<8));
  const qy=(raw.charCodeAt(o+2)|(raw.charCodeAt(o+3)<<8));
  const qz=(raw.charCodeAt(o+4)|(raw.charCodeAt(o+5)<<8));
  const x=M.lo[0]+qx/65534*M.span[0], y=M.lo[1]+qy/65534*M.span[1], z=M.lo[2]+qz/65534*M.span[2];
  out[i*3  ]=(side<0?-x:x)*MM;
  out[i*3+1]=(y-org[1])*MM;
  out[i*3+2]=z*MM;
 }
 return out;
}
export const MESH_FOR={hipY:'hip_yoke',thigh:'thigh',shank:'shank',ankP:'ankle_yoke',
                       foot:'foot',shoY:'shoulder_yoke',arm:'arm'};

export function makeWorld(RAPIER, opt={}){
 const world=new RAPIER.World({x:0,y:-G,z:0});
 world.timestep=opt.dt||1/480;
 const GRP={ground:(0x0001<<16)|0xFFFF,legL:(0x0002<<16)|0x0005,
            legR:(0x0004<<16)|0x0003,body:(0x0008<<16)|0x0001};
 const bodies={},J=[]; const SPAWN=0.004;
 const boxI=(m,x,y,z)=>({x:m*(y*y+z*z)/12,y:m*(x*x+z*z)/12,z:m*(x*x+y*y)/12});
 const gb=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-0.05,0));
 const groundCol=world.createCollider(RAPIER.ColliderDesc.cuboid(4,0.05,4)
   .setFriction(1.10).setRestitution(0).setCollisionGroups(GRP.ground),gb);

 function mk(name,key,side,grp){
  const L=LINK[key],m=L.m/1000;
  const [bx,by,bz]=L.box.map(v=>v*MM), com=COM[key].map(v=>v*MM);
  const I=boxI(m,bx,by,bz), Jr=DRIVEN[key]?ACT[DRIVEN[key]].Jr:0;
  const bd=RAPIER.RigidBodyDesc.dynamic()
    .setTranslation((key==='torso'?0:L.org[0]*side)*MM, L.org[1]*MM+SPAWN, L.org[2]*MM)
    .setLinearDamping(0.05).setAngularDamping(0.10)
    .setAdditionalMassProperties(m,{x:com[0],y:com[1],z:com[2]},
      {x:I.x+Jr,y:I.y+Jr,z:I.z+Jr},{x:0,y:0,z:0,w:1});
  const b=world.createRigidBody(bd); b.userData={key,name,side};
  const MSH=opt.meshes&&MESH_FOR[key]&&opt.meshes[MESH_FOR[key]];
  if(MSH && opt.hullCollide){
   const v=meshVerts(MSH,key,side);
   const cd=RAPIER.ColliderDesc.convexHull(v);
   if(cd){ cd.setDensity(0).setFriction(key==='foot'?1.10:0.4)
             .setRestitution(0).setCollisionGroups(grp);
           world.createCollider(cd,b); bodies[name]=b; return b; }
  }
  if(key==='foot'){
   world.createCollider(RAPIER.ColliderDesc.cuboid(FOOTSIZE.wid*MM/2,5*MM/2,FOOTSIZE.len*MM/2)
     .setTranslation(0,-11.5*MM,(FOOTSIZE.len/2-26)*MM).setDensity(0).setFriction(1.10)
     .setRestitution(0).setCollisionGroups(grp),b);
   world.createCollider(RAPIER.ColliderDesc.cuboid(13*MM,7*MM,11*MM)
     .setTranslation(0,-4*MM,0).setDensity(0).setFriction(0.4)
     .setCollisionGroups(grp),b);
  } else {
   world.createCollider(RAPIER.ColliderDesc.cuboid(bx/2,by/2,bz/2)
     .setTranslation(com[0],com[1],com[2]).setDensity(0).setFriction(0.4)
     .setRestitution(0).setCollisionGroups(grp),b);
  }
  bodies[name]=b; return b;
 }
 mk('torso','torso',1,GRP.body);
 for(const side of [1,-1]){
  const P=side>0?'L':'R',grp=side>0?GRP.legL:GRP.legR;
  for(const k of ['hipY','thigh','shank','ankP','foot']) mk(P+'.'+k,k,side,grp);
  for(const k of ['shoY','arm']) mk(P+'.'+k,k,side,GRP.body);
  for(const js of joints(side)){
   const pb=bodies[js.par==='torso'?'torso':P+'.'+js.par], cb=bodies[P+'.'+js.chi];
   const pt=pb.translation(),ct=cb.translation();
   const w={x:js.at[0]*MM,y:js.at[1]*MM+SPAWN,z:js.at[2]*MM};
   const jd=RAPIER.JointData.revolute({x:w.x-pt.x,y:w.y-pt.y,z:w.z-pt.z},
     {x:w.x-ct.x,y:w.y-ct.y,z:w.z-ct.z},{x:js.axis[0],y:js.axis[1],z:js.axis[2]});
   jd.limitsEnabled=true; jd.limits=[js.lim[0]*Math.PI/180,js.lim[1]*Math.PI/180];
   const jj=world.createImpulseJoint(jd,pb,cb,true);
   if(jj.setContactsEnabled) jj.setContactsEnabled(false);
   const a=ACT[js.act];
   J.push({id:P+'.'+js.k,side,k:js.k,hint:js.hint,parent:pb,child:cb,spec:js,
     axis:{x:js.axis[0],y:js.axis[1],z:js.axis[2]},act:a,
     lim:[js.lim[0]*Math.PI/180,js.lim[1]*Math.PI/180],
     Jeff:a.Jr+1.2e-5,cmd:0,ang:0,rate:0,tau:0,sat:0});
  }
 }
 return {world,bodies,J,groundCol,GRP,SPAWN};
}

export function defaults(){return{mode:'stand',hoist:false,paused:false,
 T:2.40,S:0.038,H:0.016,A:0.023,hgt:0.209,sf:0.40,dwell:2.2,imu:true,
 bw:25,ts:1.0,mu:1.10,phase:0,t:0,kp:1.6,kd:0.08,kr:1.6,kdr:0.08};}

const smooth=u=>u*u*(3-2*u);
export function swayAt(P,p){const s=Math.sin(2*Math.PI*(p-0.45)),k=P.dwell;
 return P.A*(k>0.02?Math.tanh(k*s)/Math.tanh(k):s);}
export function attitude(bodies){const q=bodies.torso.rotation(),w=bodies.torso.angvel();
 const f=qRot(q,{x:0,y:0,z:1}),u=qRot(q,{x:0,y:1,z:0});
 return {pitch:-Math.asin(cl(f.y,-1,1)),pitchRate:w.x,
         roll:Math.asin(cl(-u.x,-1,1)),rollRate:w.z};}
export function footTgt(P,lp){const sf=P.sf;
 if(lp<sf){const u=lp/sf;return{y:P.H*Math.sin(Math.PI*u),z:-P.S/2+P.S*smooth(u)};}
 const v=(lp-sf)/(1-sf);return{y:0,z:P.S/2-P.S*v};}

export function read(j){
 const qp=j.parent.rotation(),qc=j.child.rotation();
 let r=qMul(qCon(qp),qc); if(r.w<0) r={w:-r.w,x:-r.x,y:-r.y,z:-r.z};
 j.ang=2*Math.atan2(r.x*j.axis.x+r.y*j.axis.y+r.z*j.axis.z,r.w);
 const wp=j.parent.angvel(),wc=j.child.angvel();
 const aw=qRot(qp,j.axis); j.aw=aw;
 j.rate=(wc.x-wp.x)*aw.x+(wc.y-wp.y)*aw.y+(wc.z-wp.z)*aw.z;
}

export function targets(P,bodies,J,poseT){
 const o={};
 if(P.mode==='pose'){for(const j of J) o[j.id]=(poseT&&poseT[j.id])||0; return o;}
 // hgt is the HIP ROLL AXIS height above the ground. the IK wants the distance
 // down to the ankle roll axis, which sits AX.ankRoll above the sole.
 let hip=P.hgt;
 if(P.mode==='squat') hip-=0.016*(1-Math.cos(2*Math.PI*P.t/3.2));
 hip=cl(hip,STANCE_MIN,STANCE_MAX);   // clamp LAST, or the squat dives out of band
 const sway=(P.mode==='walk')?swayAt(P,P.phase):0;
 /* ANKLE STRATEGY. the previous build corrected by shifting the foot target
    sideways, but in double support the feet are planted and cannot move, so
    that only fights the ground and pumps energy in until it oscillates apart.
    a real biped biases ankle TORQUE instead. signs, derived not guessed:
      ankPitch + = dorsiflexion; with the sole planted that drives the body
        forward, so a forward lean needs a NEGATIVE bias, same on both legs.
      ankRoll  + = sole edge outward; with the sole planted that tips the body
        toward that leg's own side, so the correction is ANTI-symmetric and
        carries a `side` factor.                                            */
 let bp=0,br=0;
 if(P.imu&&!P.hoist){const A=attitude(bodies);
  bp=cl(-(P.kp*A.pitch+P.kd*A.pitchRate),-0.42,0.42);
  br=cl(  P.kr*A.roll +P.kdr*A.rollRate ,-0.42,0.42);}
 for(const side of [1,-1]){
  const pf=side>0?'L':'R';
  const ft=(P.mode==='walk')?footTgt(P,(P.phase+(side>0?0:0.5))%1):{y:0,z:0};
  const py=-(hip - AX.ankRoll*MM) + ft.y;
  const q=legIK(side,-sway,py,ft.z);
  const planted=(P.mode!=='walk')||((P.phase+(side>0?0:0.5))%1)>=P.sf;
  o[pf+'.hipRoll']=q.hipRoll; o[pf+'.hipPitch']=q.hipPitch; o[pf+'.knee']=q.knee;
  o[pf+'.ankPitch']=q.ankPitch+(planted?bp:0);
  o[pf+'.ankRoll'] =q.ankRoll +(planted?side*br:0);
  const other=(P.phase+(side>0?0.5:0))%1;
  o[pf+'.shoPitch']=(P.mode==='walk')?0.45*Math.sin(2*Math.PI*other):0;
  o[pf+'.shoRoll']=0.09;
 }
 return o;
}

export function control(P,bodies,J,dt,poseT){
 const tg=targets(P,bodies,J,poseT), wn=2*Math.PI*P.bw;
 for(const j of J){
  read(j);
  const want=cl(tg[j.id]??0,j.lim[0],j.lim[1]);
  const ms=j.act.wmax*dt;
  j.cmd+=cl(want-j.cmd,-ms,ms);
  const Kp=j.Jeff*wn*wn, Kd=2*1.15*wn*j.Jeff, tmax=j.act.tau*P.ts;
  const tau=cl(Kp*(j.cmd-j.ang)-Kd*j.rate,-tmax,tmax);
  j.tau=tau; j.sat=Math.abs(tau)/tmax;
  const i=tau*dt,a=j.aw;
  j.child .applyTorqueImpulse({x: a.x*i,y: a.y*i,z: a.z*i},true);
  j.parent.applyTorqueImpulse({x:-a.x*i,y:-a.y*i,z:-a.z*i},true);
 }
}
