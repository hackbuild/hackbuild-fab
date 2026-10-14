import * as THREE from "/home/claude/slug/node_modules/three/build/three.module.js";
const store={};
const mk=()=>({style:{},clientWidth:900,clientHeight:640,value:"",checked:true,
  innerHTML:"",textContent:"",appendChild(){},addEventListener(){},
  classList:{add(){},remove(){},contains(){return false}}});
globalThis.document={getElementById:id=>store[id]||=mk(), createElement:()=>mk()};
globalThis.addEventListener=()=>{}; globalThis.devicePixelRatio=1; globalThis.requestAnimationFrame=()=>{};
await import("/tmp/app.mjs");
const {groups,P,setExplode}=globalThis.__x;
setExplode(0);

// every mesh in the scene, with its world box
const boxes=[];
for(const [gn,g] of Object.entries(groups)){
  if(gn==="cap") continue;
  for(const m of g.children){
    m.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(m);
    boxes.push({gn,b});
  }
}
// find the mesh whose box best matches a target size, to identify appliques
function findBySize(w,d,h,tol=2){
  return boxes.find(o=>{
    const s=o.b.getSize(new THREE.Vector3());
    const dims=[s.x,s.y,s.z].sort((a,b)=>a-b);
    const want=[w,d,h].sort((a,b)=>a-b);
    return dims.every((v,i)=>Math.abs(v-want[i])<tol);
  });
}
let fails=0;
function covers(label, part, ax, az, x0,x1,z0,z1){
  if(!part){ console.log("  "+label.padEnd(30)+"NOT FOUND"); fails++; return; }
  const b=part.b;
  const gx0=ax==="x"?b.min.x:b.min.y, gx1=ax==="x"?b.max.x:b.max.y;
  const ok = gx0<=x0+0.6 && gx1>=x1-0.6 && b.min.z<=z0+0.6 && b.max.z>=z1-0.6;
  if(!ok) fails++;
  console.log("  "+label.padEnd(30)+
    `part ${gx0.toFixed(0)}..${gx1.toFixed(0)} / z ${b.min.z.toFixed(0)}..${b.max.z.toFixed(0)}`.padEnd(34)+
    `opening ${x0}..${x1} / z ${z0}..${z1}`.padEnd(30)+(ok?"covers":"MISPLACED"));
}
console.log("appliqué parts versus the openings they close");
const WI=P.XR-P.XL;
covers("window over hopper opening", findBySize(231,P.ta,135), "x",
       0, P.XL+24, P.XL+24+WI-48, P.z_funtop+22, P.z_top-40);
covers("door flap over delivery door", findBySize(P.door_w+22,P.ta,P.door_z1-P.door_z0+22), "x",
       0, -P.door_w/2, P.door_w/2, P.door_z0, P.door_z1);
covers("coin plate over panel window", findBySize(P.ca_plate[0],P.t,P.ca_plate[1]), "x",
       0, P.ca_pos[0]-30, P.ca_pos[0]+30, P.ca_pos[1]-56, P.ca_pos[1]+56);
covers("faceplate over its own bolts", findBySize(P.ca_face[0],8,P.ca_face[1]), "x",
       0, P.ca_pos[0]-P.ca_bolt[0]/2, P.ca_pos[0]+P.ca_bolt[0]/2,
       P.ca_pos[1]-P.ca_bolt[1]/2, P.ca_pos[1]+P.ca_bolt[1]/2);
covers("drawer face over rear hatch", findBySize(P.face[0],P.t,P.face[1]), "x",
       0, P.hatch_c[0]-P.hatch[0]/2, P.hatch_c[0]+P.hatch[0]/2,
       P.hatch_c[1]-P.hatch[1]/2, P.hatch_c[1]+P.hatch[1]/2);

{ // the reject cup has to sit under the faceplate and clear the delivery door
  const cup=boxes.filter(o=>o.gn==="coin"&&o.b.min.y>P.YF+P.t-0.1);
  if(cup.length){
    const b=cup.reduce((a,c)=>a.union(c.b), cup[0].b.clone());
    const faceBot=P.ca_pos[1]-P.ca_face[1]/2;
    console.log("\nreject cup  x "+b.min.x.toFixed(0)+".."+b.max.x.toFixed(0)+
      "  z "+b.min.z.toFixed(0)+".."+b.max.z.toFixed(0)+
      "   faceplate bottom z "+faceBot.toFixed(0)+
      (b.max.z<=faceBot?"  catches the drop":"  <-- FOULS THE FACEPLATE")+
      (b.max.x < -P.door_w/2 ?"  clears the door":"  <-- FOULS THE DOOR"));
    if(b.max.z>faceBot||b.max.x>=-P.door_w/2) fails++;
  }
}
console.log("\nevery part inside the machine envelope");
// the funnel head tabs are meant to stand 3 mm proud outside the walls
// the faceplate, its adapter and the reject cup all stand proud of the front panel
const EX={x0:P.XL-2*P.t-3, x1:P.XR+2*P.t+3, y0:P.YB-4*P.t, y1:P.YF+P.t+P.ret_d+2*P.t,
          z0:0, z1:P.z_top+P.t};
console.log("  funnel panels, to show the head tabs standing proud:");
for(const o of boxes) if(o.gn==="funnel")
  console.log("    x "+o.b.min.x.toFixed(0)+".."+o.b.max.x.toFixed(0)+
              "  y "+o.b.min.y.toFixed(0)+".."+o.b.max.y.toFixed(0)+
              "  z "+o.b.min.z.toFixed(0)+".."+o.b.max.z.toFixed(0));
console.log("  wall outer faces at x "+(P.XL-P.t)+" and "+(P.XR+P.t)+", y "+(P.YB-P.t)+" and "+(P.YF+P.t));
let out=0;
for(const o of boxes){
  if(o.b.min.x<EX.x0-0.6||o.b.max.x>EX.x1+0.6||o.b.min.y<EX.y0-0.6||o.b.max.y>EX.y1+0.6||
     o.b.min.z<EX.z0-0.6||o.b.max.z>EX.z1+0.6){
    out++; console.log("  stray in group "+o.gn+": "+
      o.b.min.toArray().map(v=>v.toFixed(0)).join(",")+" -> "+o.b.max.toArray().map(v=>v.toFixed(0)).join(","));
  }
}
console.log("  "+boxes.length+" parts checked, "+out+" outside the envelope");
console.log("\n"+(fails+out? (fails+out)+" PROBLEMS" : "all placements good"));
