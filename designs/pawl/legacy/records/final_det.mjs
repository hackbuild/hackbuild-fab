import RAPIER from '@dimforge/rapier3d-deterministic-compat';
import * as C from './core.mjs';
await RAPIER.init();
function run(o={}){
  const {world,bodies,J}=C.makeWorld(RAPIER);
  const P=C.defaults(); Object.assign(P,o);
  const DT=world.timestep,N=Math.round((o.secs||20)/DT);
  let mt=0,fell=null,peak=0,pid='';
  for(let n=0;n<N;n++){
    if(P.mode==='walk') P.phase=(P.phase+DT/P.T)%1;
    P.t+=DT; C.control(P,bodies,J,DT);
    if(o.push&&Math.abs(n*DT-o.push.t)<DT/2) bodies.torso.applyImpulse({x:o.push.x||0,y:0,z:o.push.z||0},true);
    world.step();
    if(n*DT>0.6){const A=C.attitude(bodies),t=bodies.torso.translation();
     const ti=Math.max(Math.abs(A.pitch),Math.abs(A.roll))*180/Math.PI;
     mt=Math.max(mt,ti); for(const j of J) if(j.sat>peak){peak=j.sat;pid=j.id;}
     if(fell===null&&(ti>30||t.y<0.12)) fell=n*DT;}
  }
  const t=bodies.torso.translation();
  return {ok:fell===null,fell,tilt:mt,dz:t.z*1000,dx:t.x*1000,peak,pid,y:t.y*1000};
}
const s=r=>`${r.ok?'PASS':'FAIL @'+r.fell.toFixed(1)+'s'}  tilt ${r.tilt.toFixed(1)}deg  y${r.y.toFixed(0)}  `+
 `travel ${r.dz.toFixed(0)}mm  drift ${r.dx.toFixed(0)}mm  peak ${(r.peak*100).toFixed(0)}% ${r.pid}`;
let pass=0,tot=0; const T=(n,r)=>{tot++; if(r.ok)pass++; console.log(` ${n.padEnd(26)} ${s(r)}`);};
console.log('STAND');
T('60 s',           run({mode:'stand',secs:60}));
T('hgt 192 (deep)', run({mode:'stand',hgt:0.192,secs:20}));
T('hgt 212 (tall)', run({mode:'stand',hgt:0.212,secs:20}));
T('open loop (should fail)', run({mode:'stand',imu:false,secs:15}));
console.log('SQUAT');
T('30 s cycling',   run({mode:'squat',secs:30}));
console.log('PUSH at 3 s');
for(const [a,v] of [['z',0.06],['z',0.12],['x',0.06],['x',0.12]]) T(`${a} ${v} N.s`, run({mode:'stand',secs:12,push:{t:3,[a]:v}}));
console.log('WALK 25 s');
for(const [t2,S,A] of [[3.2,0.038,0.023],[2.8,0.038,0.023],[2.4,0.038,0.023],[2.0,0.038,0.023],
                       [2.8,0.020,0.023],[2.8,0.050,0.023],[2.8,0.038,0.018],[2.8,0.038,0.028]])
  T(`T${t2} S${(S*1000).toFixed(0)} sway${(A*1000).toFixed(0)}`, run({mode:'walk',T:t2,S,A,secs:25}));
console.log(`\n${pass}/${tot} pass (the open-loop case is expected to fail)`);
