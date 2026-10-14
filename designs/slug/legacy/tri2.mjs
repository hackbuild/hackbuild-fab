import * as THREE from "/home/claude/slug/node_modules/three/build/three.module.js";
import fs from "fs";
const store={};
const mk=()=>({style:{},clientWidth:900,clientHeight:640,value:"0",checked:true,
  innerHTML:"",textContent:"",appendChild(){},addEventListener(){},
  classList:{add(){},remove(){},contains(){return false}}});
globalThis.document={getElementById:id=>store[id]||=mk(), createElement:()=>mk()};
globalThis.addEventListener=()=>{}; globalThis.devicePixelRatio=1; globalThis.requestAnimationFrame=()=>{};
await import("/tmp/app.mjs");
const {OUTLINES,groups}=globalThis.__x;

function shapeFrom(o){
  const s=new THREE.Shape(o.outer.map(([x,y])=>new THREE.Vector2(x,y)));
  for(const h of (o.holes||[])) s.holes.push(new THREE.Path(h.map(([x,y])=>new THREE.Vector2(x,y))));
  return s;
}
function loopArea(p){let a=0;for(let i=0;i<p.length;i++){const j=(i+1)%p.length;a+=p[i][0]*p[j][1]-p[j][0]*p[i][1];}return Math.abs(a)/2;}
function faceArea(g){
  const p=g.attributes.position, idx=g.index; let A=0;
  const n=idx?idx.count:p.count;
  for(let i=0;i<n;i+=3){
    const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;
    if(p.getZ(a)!==0||p.getZ(b)!==0||p.getZ(c)!==0) continue;
    A+=Math.abs((p.getX(b)-p.getX(a))*(p.getY(c)-p.getY(a))-(p.getX(c)-p.getX(a))*(p.getY(b)-p.getY(a)))/2;
  }
  return A;
}
let bad=0, n=0;
console.log("part               expected      triangulated   error");
for(const name of Object.keys(OUTLINES)){
  const s=OUTLINES[name];
  const want=loopArea(s[0])-s.slice(1).reduce((t,l)=>t+loopArea(l),0);
  const g=new THREE.ExtrudeGeometry(shapeFrom({outer:s[0],holes:s.slice(1)}),{depth:6,bevelEnabled:false});
  const got=faceArea(g); n++;
  const err=Math.abs(got-want)/Math.max(want,1);
  if(err>0.02){ bad++;
    console.log("  "+name.padEnd(17)+want.toFixed(0).padEnd(14)+got.toFixed(0).padEnd(15)+(err*100).toFixed(1)+"%  <-- NOT CUT RIGHT"); }
}
console.log(bad? bad+" of "+n+" parts triangulate wrong" : "all "+n+" parts triangulate to their exact cut area");
