// ---------------------------------------------------------------- kinematics
// Line for line the formulas in source/kin.py. Nothing places a part any other
// way, and every part with a rotational DOF has its mesh origin ON that axis.
const DEG=Math.PI/180;
const CAM=(P.PIN_W/2+P.LUG_P+P.PIN_PLAY)-P.SLOT_E;
const E_REST=-P.PIN_PLAY;
const ceil_v=u=>-(u-(T/2-P.PIN_PLAY))*Math.tan(P.RAMP_A*DEG);
function link3(i,j,zR,zC){
  const xa=px(j)-C, za=P.ROD_Z+zC[j];
  const xb=px(j)+C, zb=P.ROD_Z+zR[i];
  const dx=xb-xa, dz=zb-za, L=Math.hypot(dx,dz), th=Math.atan2(dz,dx);
  return {th,L,slot:L-2*C,
    ox:xa+C*Math.cos(th), oz:za+C*Math.sin(th),
    cx:xa+(C+P.CROWN_OFF)*Math.cos(th), cz:za+(C+P.CROWN_OFF)*Math.sin(th),
    ax:xa,az:za,bx:xb,bz:zb};
}
function pinState(i,j,zR,zC,lp,latched){
  const rk=link3(i,j,zR,zC);
  const crownTop=rk.cz+P.CROWN_R;
  const zFree=crownTop-ceil_v(E_REST+T/2);
  const riseFree=zFree-P.CROWN_TOP;
  const rise=latched?Math.max(riseFree,P.R_LATCH):riseFree;
  const lugBot=P.Z_LUG0+rise, lugTop=lugBot+P.LUG_TOT;
  const released=lp>=CAM+0.05;
  let cammed=(!released)&&(lugTop>P.LP_Z)&&(lugBot<P.LP_Z+T);
  if(latched&&rise>=P.R_LATCH-1e-9) cammed=false;
  const e=cammed?(E_REST+CAM):E_REST;
  const zOn=crownTop-ceil_v(e+T/2);
  const z=latched?Math.max(zOn,P.CROWN_TOP+P.R_LATCH):zOn;
  return {y:-e,z,e,cammed,rise:z-P.CROWN_TOP,lugBot:P.Z_LUG0+(z-P.CROWN_TOP),crownTop,rk};
}
const PHI_REST=180+P.CRANK_SW;
const crankPhi=rise=>{let s=Math.sin(PHI_REST*DEG)+rise/P.CRANK_R;
  s=Math.max(-1,Math.min(1,s)); return 180-Math.asin(s)/DEG;};
const LPHI_REST=-P.LCRANK_SW;
const lCrankPhi=sl=>{let s=Math.sin(LPHI_REST*DEG)+sl/P.LCRANK_R;
  s=Math.max(-1,Math.min(1,s)); return Math.asin(s)/DEG;};

