const fs=require('fs');
eval(fs.readFileSync('rastermesh.js','utf8'));const RM=globalThis.RasterMesh;
globalThis.TOGGLE={}; eval(fs.readFileSync('port.js','utf8'));
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function build(seed,W,H,K,nl,p){const r=rng(seed);const V=RM.volume(W,H,0.5,0,0);for(let k=0;k<K;k++){const L=new Uint8Array(W*H);for(let i=0;i<W*H;i++)L[i]=r()<p?0:1+Math.floor(r()*nl);V.addSlab(L,k,k+1);}return V;}
for(const [seed,dims] of [[2,[6,6,2,3,0.3]],[3,[6,6,2,3,0.3]],[1,[8,8,3,3,0.3]]]){const V=build(seed,...dims);console.log(seed,dims.join('x'),JSON.stringify(TOGGLE.fixPinches(V)),JSON.stringify(TOGGLE.fixPinches(V)));}
// how often stock fails vs port fails over 1000 seeds 6x6x2
let sf=0,pf=0,pfz=0;for(let seed=1;seed<=1000;seed++){const d=[6,6,2,3,0.3];let V=build(seed,...d);V.fixPinches();if(V.fixPinches()>0)sf++;V=build(seed,...d);const r=TOGGLE.fixPinches(V);if(!r.converged)pf++;if(r.frozen)pfz++;}
console.log('1000 seeds 6x6x2: stock nonconverged',sf,'port nonconverged',pf,'port with frozen',pfz);
