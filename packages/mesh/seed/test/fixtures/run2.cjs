const fs=require('fs');
eval(fs.readFileSync('rastermesh.js','utf8'));
const RM=globalThis.RasterMesh;
globalThis.TOGGLE={}; eval(fs.readFileSync('port.js','utf8'));
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function stress(seed){
 const W=80,H=80,R=38,rim=4; const r=rng(seed);
 const V=RM.volume(W,H,0.125,0,0);
 const mk=(f)=>{const L=new Uint8Array(W*H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const dx=i+0.5-40,dy=j+0.5-40,d=Math.hypot(dx,dy);if(d>R)continue;L[j*W+i]=d>R-rim?3:f(i,j);}return L;};
 V.addSlab(mk(()=> r()<0.3?2:1),0,0.72);
 V.addSlab(mk(()=>1),0.72,2.88);
 V.addSlab(mk((i,j)=>((i+j)&1)?2:1),2.88,3.6);
 return V;}
function audit(m){const P=m.positions,I=m.indices;const E=new Map();let vol=0;
 // weld by position
 const key=i=>P[3*i]+','+P[3*i+1]+','+P[3*i+2];const id=new Map();const vid=i=>{const k=key(i);if(!id.has(k))id.set(k,id.size);return id.get(k)};
 const T=[];for(let t=0;t<I.length;t+=3){const a=vid(I[t]),b=vid(I[t+1]),c=vid(I[t+2]);T.push([a,b,c]);
  const p=j=>[P[3*I[t+j]],P[3*I[t+j]+1],P[3*I[t+j]+2]];const [A,B,C]=[p(0),p(1),p(2)];
  vol+=(A[0]*(B[1]*C[2]-B[2]*C[1])-A[1]*(B[0]*C[2]-B[2]*C[0])+A[2]*(B[0]*C[1]-B[1]*C[0]))/6;
  for(const [u,v] of [[a,b],[b,c],[c,a]]){const k=u+'>'+v;E.set(k,(E.get(k)||0)+1);}}
 let bad=0;for(const [k,n] of E){const [u,v]=k.split('>');if(n!==1||E.get(v+'>'+u)!==1)bad++;}
 // nonmanifold vertices: fan connectivity
 const inc=new Map();T.forEach((t,ti)=>t.forEach(v=>{if(!inc.has(v))inc.set(v,[]);inc.get(v).push(ti)}));
 let nmv=0;for(const [v,ts] of inc){const par=new Map(ts.map(x=>[x,x]));const f=x=>{while(par.get(x)!==x)x=par.get(x);return x};
  const byEdge=new Map();for(const ti of ts){for(const u of T[ti]){if(u===v)continue;if(!byEdge.has(u))byEdge.set(u,[]);byEdge.get(u).push(ti)}}
  for(const arr of byEdge.values())for(let q=1;q<arr.length;q++)par.set(f(arr[q]),f(arr[0]));
  const roots=new Set(ts.map(f));if(roots.size>1)nmv++;}
 return {tris:T.length,badEdges:bad,nonManifoldVerts:nmv,vol:+vol.toFixed(3)};}
for(const which of ['seed','toggle']){
 const V=stress(1); const t0=Date.now();
 const c1= which==='seed'?V.fixPinches():TOGGLE.fixPinches(V);
 const c2= which==='seed'?V.fixPinches():TOGGLE.fixPinches(V);
 const ms=Date.now()-t0; const M=V.mesh(); const out={};let tot=0;
 for(const s in M){out[s]=audit(M[s]);tot+=out[s].vol;}
 console.log(which,'changed',c1,'second',c2,'ms',ms,JSON.stringify(out),'sum',tot.toFixed(3));
}
