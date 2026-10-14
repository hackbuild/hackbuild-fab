// Regression fixtures for the raster seed pinch healer (M-1-T09). The goldens are
// computed numbers from the scratch run kept in fixtures/ (run2.cjs, port.cjs, osc2.cjs).
// rng, stress, build and audit are pasted verbatim from those files so the draws match.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = fileURLToPath(new URL('.', import.meta.url));

// rastermesh.js is a plain script that sets RasterMesh on globalThis. It runs in this realm so
// its return objects compare equal under deepStrictEqual; the previous global is put back.
function load(path) {
  const prev = globalThis.RasterMesh;
  vm.runInThisContext(readFileSync(path, 'utf8'), { filename: path });
  const loaded = globalThis.RasterMesh;
  globalThis.RasterMesh = prev;
  return loaded;
}

let RM = load(here + '../rastermesh.js');

function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function stress(seed){
 const W=80,H=80,R=38,rim=4; const r=rng(seed);
 const V=RM.volume(W,H,0.125,0,0);
 const mk=(f)=>{const L=new Uint8Array(W*H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const dx=i+0.5-40,dy=j+0.5-40,d=Math.hypot(dx,dy);if(d>R)continue;L[j*W+i]=d>R-rim?3:f(i,j);}return L;};
 V.addSlab(mk(()=> r()<0.3?2:1),0,0.72);
 V.addSlab(mk(()=>1),0.72,2.88);
 V.addSlab(mk((i,j)=>((i+j)&1)?2:1),2.88,3.6);
 return V;}
function build(seed,W,H,K,nl,p){const r=rng(seed);const V=RM.volume(W,H,0.5,0,0);for(let k=0;k<K;k++){const L=new Uint8Array(W*H);for(let i=0;i<W*H;i++)L[i]=r()<p?0:1+Math.floor(r()*nl);V.addSlab(L,k,k+1);}return V;}
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

function auditAll(V) {
  const M = V.mesh();
  const slots = {};
  let badEdges = 0, nonManifoldVerts = 0;
  for (const s in M) { slots[s] = audit(M[s]); badEdges += slots[s].badEdges; nonManifoldVerts += slots[s].nonManifoldVerts; }
  return { slots, badEdges, nonManifoldVerts };
}

const near = (got, want, what) => assert.ok(Math.abs(got - want) <= 1e-3, `${what} volume ${got} mm3, expected ${want} mm3 within 1e-3`);

// The 60-pass seed healer as harvested; present on the build machine, absent on CI.
const SEED_HEALER = '/Users/obsidian/Projects/hackbuild/fab-knowledge/evidence/x/plan-to-refine/handoff/hbf/seed/mesh/rastermesh.js';
const seedSkip = existsSync(SEED_HEALER) ? false : 'seed healer source not on this machine: ' + SEED_HEALER;

function withSeedHealer(fn) {
  const port = RM;
  RM = load(SEED_HEALER);
  try { return fn(); } finally { RM = port; }
}

test('fixture A checkerboard-80', () => {
  const V = stress(1);
  assert.deepEqual(V.fixPinches(), { changed: 2137, converged: true, frozen: 0, illFormed: 0 });
  assert.equal(V.fixPinches().changed, 0);
  const a = auditAll(V);
  const want = { 1: [16310, 151.391], 2: [14844, 53.685], 3: [5402, 50.749] };
  assert.deepEqual(Object.keys(a.slots), ['1', '2', '3']);
  for (const s in want) {
    assert.equal(a.slots[s].tris, want[s][0], `slot ${s} tris`);
    near(a.slots[s].vol, want[s][1], `slot ${s}`);
    assert.equal(a.slots[s].badEdges, 0, `slot ${s} unpaired edges`);
    assert.equal(a.slots[s].nonManifoldVerts, 0, `slot ${s} non-manifold vertices`);
  }
});

test('fixture A seed healer gives the same cells and meshes', { skip: seedSkip }, () => {
  withSeedHealer(() => {
    const V = stress(1);
    assert.equal(V.fixPinches(), 2137);
    assert.equal(V.fixPinches(), 0);
    const a = auditAll(V);
    assert.deepEqual([a.slots[1].tris, a.slots[2].tris, a.slots[3].tris], [16310, 14844, 5402]);
    assert.equal(a.badEdges + a.nonManifoldVerts, 0);
  });
});

test('fixture B oscillation-6x6x2', () => {
  const V = build(2, 6, 6, 2, 3, 0.3);
  assert.deepEqual(V.fixPinches(), { changed: 32, converged: true, frozen: 4, illFormed: 0 });
  assert.equal(V.fixPinches().changed, 0);
  const a = auditAll(V);
  assert.equal(a.badEdges, 0, 'unpaired edges');
  assert.equal(a.nonManifoldVerts, 0, 'non-manifold vertices');
});

test('fixture B seed healer leaves a pinch', { skip: seedSkip }, () => {
  withSeedHealer(() => {
    const V = build(2, 6, 6, 2, 3, 0.3);
    V.fixPinches();
    assert.equal(auditAll(V).nonManifoldVerts, 1);
    assert.equal(V.fixPinches(), 180);
  });
});

test('fixture C frozen-8x8x3', () => {
  const V = build(1, 8, 8, 3, 3, 0.3);
  const first = V.fixPinches();
  assert.deepEqual(first, { changed: 127, converged: false, frozen: 14, illFormed: 2 });
  assert.equal(first.converged, false, 'non-convergence must be reported');
  assert.equal(auditAll(V).badEdges, 2, 'unpaired edges after the first call');
  assert.equal(V.fixPinches().converged, true, 'second call converges');
});
