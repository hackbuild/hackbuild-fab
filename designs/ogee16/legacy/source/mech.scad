include <params.scad>
use <ogee16.scad>
zRb = [STROKE,0,STROKE,0]; zCb = [0,STROKE,0,0]; shp="hex";
module sXZ(yc,t=T) { translate([0,yc+t/2,0]) rotate([90,0,0]) linear_extrude(t) children(); }
module sYZ(xc,t=T) { translate([xc-t/2,0,0]) rotate([90,0,90]) linear_extrude(t) children(); }
module sXY(z0,t=T) { translate([0,0,z0]) linear_extrude(t) children(); }
function th(i,j) = atan2(zRb[i]-zCb[j], 2*C);
color("#49535e") sXY(DECK_Z) p_deck();
color("#8a6cff") for(i=[0:N-1]) translate([0,py(i),zRb[i]]) sXY(RB_Z,TB) p_rowbar();
color("#4ecdc4") for(j=[0:N-1]) translate([px(j),0,zCb[j]]) sXY(CB_Z,TB) p_colbar();
for(i=[0:N-1]) for(j=[0:N-1]) translate([px(j),py(i),0]) rotate(DIAG) {
  color("#8a6cff") translate([C,0,zRb[i]]) sXZ(YOFF) p_rowlug();
  color("#4ecdc4") translate([-C,0,zCb[j]]) sXZ(-YOFF) p_collug();
  color("#ffb454") translate([-C+C*cos(th(i,j)),0,ROD_Z+zCb[j]+C*sin(th(i,j))])
    rotate([0,-th(i,j),0]) sXZ(0) p_link();
  color("#ff2e88") {
    translate([C,YOFF-5.7,ROD_Z+zRb[i]]) rotate([-90,0,0]) cylinder(h=PIV_LEN,d=ROD_D);
    translate([-C,-5.3,ROD_Z+zCb[j]]) rotate([-90,0,0]) cylinder(h=PIV_LEN,d=ROD_D); }
  color("#e8eef5") translate([0,PIN_PLAY,CROWN_TOP]) sYZ(0) p_rod();
  color("#ffd166") translate([0,PIN_PLAY,FACE2_Z]) linear_extrude(T) p_cap(shp);
}
