include <params.scad>
use <ogee16.scad>
zRb = [STROKE,0,STROKE,0]; zCb = [0,STROKE,0,0]; lpv = 0; shp="hex";
module sXZ(yc,t=T) { translate([0,yc+t/2,0]) rotate([90,0,0]) linear_extrude(t) children(); }
module sYZ(xc,t=T) { translate([xc-t/2,0,0]) rotate([90,0,90]) linear_extrude(t) children(); }
module sXY(z0,t=T) { translate([0,0,z0]) linear_extrude(t) children(); }
function th(i,j) = atan2(zRb[i]-zCb[j], 2*C);
color("#3d4650") {
  sXY(BASE_Z) p_base();
  sYZ(XI0-T/2) p_wallx(); translate([XI1+T-XI0,0,0]) sYZ(XI0-T/2) p_wallx();
  sXZ(YI0-T/2) p_wally(); translate([0,YI1+T-YI0,0]) sXZ(YI0-T/2) p_wally();
  sYZ(RAIL_X0+T/2) p_rail(); translate([RAIL_X1-RAIL_X0,0,0]) sYZ(RAIL_X0+T/2) p_rail();
  sYZ(RSV_BRK) p_svbracket_row(); sXZ(CSV_BRK) p_svbracket_col();
  sXY(LSV_BRK_Z) p_latchbracket();
  sYZ(LRIB_X[0]) p_latchrib(); translate([LRIB_X[1]-LRIB_X[0],0,0]) sYZ(LRIB_X[0]) p_latchrib();
}
color("#49535e") sXY(DECK_Z) p_deck();
color("#8a6cff") for(i=[0:N-1]) translate([0,py(i),zRb[i]]) {
  sXY(RB_Z,TB) p_rowbar(); sYZ(DRIVE_X) p_rowdrive();
  sYZ(GUIDE_X[0]) p_rowguide(); }
color("#4ecdc4") for(j=[0:N-1]) translate([px(j),0,zCb[j]]) {
  sXY(CB_Z,TB) p_colbar(); sXZ(DRIVE_Y) p_coldrive();
  sXZ(GUIDE_Y[0]) p_colguide(); }
for(i=[0:N-1]) for(j=[0:N-1]) translate([px(j),py(i),0]) rotate(DIAG) {
  color("#8a6cff") translate([C,0,zRb[i]]) sXZ(YOFF) p_rowlug();
  color("#4ecdc4") translate([-C,0,zCb[j]]) sXZ(-YOFF) p_collug();
  color("#ffb454") translate([-C+C*cos(th(i,j)),0,ROD_Z+zCb[j]+C*sin(th(i,j))])
    rotate([0,-th(i,j),0]) sXZ(0) p_link();
  color("#e8eef5") translate([0,PIN_PLAY,CROWN_TOP]) sYZ(0) p_rod();
  color("#ffd166") translate([0,PIN_PLAY,FACE2_Z]) linear_extrude(T) p_cap(shp);
}
//color("#5d6a78") translate([-lpv*cos(DIAG), lpv*cos(DIAG),0]) sXY(LP_Z) p_latch();
//color("#6d7c8c") sXY(FACE_Z) p_face();
//color("#8ea3b8") sXY(FACE2_Z) p_face2(shp);
