const fs=require('fs');
eval(fs.readFileSync('rastermesh.js','utf8'));const RM=globalThis.RasterMesh;
globalThis.TOGGLE={}; eval(fs.readFileSync('part2e.js','utf8'));
const src=fs.readFileSync('run.cjs','utf8');const audit=eval('('+src.slice(src.indexOf('function audit'),src.indexOf('for(const which')).replace(/^function audit/,'function')+')');
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function build(seed,W,H,K,nl,p){const r=rng(seed);const V=RM.volume(W,H,0.5,0,0);for(let k=0;k<K;k++){const L=new Uint8Array(W*H);for(let i=0;i<W*H;i++)L[i]=r()<p?0:1+Math.floor(r()*nl);V.addSlab(L,k,k+1);}return V;}
function sum(V){const M=V.mesh();let be=0,nm=0;for(const s in M){const a=audit(M[s]);be+=a.badEdges;nm+=a.nonManifoldVerts;}return {badEdges:be,nmv:nm};}
for(const [seed,dims] of [[2,[6,6,2,3,0.3]],[1,[8,8,3,3,0.3]],[3,[6,6,2,3,0.3]]]){
 let V=build(seed,...dims);V.fixPinches();console.log(seed,dims.join('x'),'stock once',JSON.stringify(sum(V)));
 V=build(seed,...dims);const c=TOGGLE.fixPinches(V);console.log(seed,'toggle once',c,JSON.stringify(sum(V)));
 let n=0,k=0;do{n=TOGGLE.fixPinches(V);k++}while(n>0&&k<20);console.log(seed,'toggle repeated calls',k,JSON.stringify(sum(V)));
}
