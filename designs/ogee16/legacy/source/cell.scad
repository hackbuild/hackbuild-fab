include <params.scad>
use <ogee16.scad>
zr = 0; zc = 0; shp="hex";
module sXZ(yc,t=T) { translate([0,yc+t/2,0]) rotate([90,0,0]) linear_extrude(t) children(); }
module sYZ(xc,t=T) { translate([xc-t/2,0,0]) rotate([90,0,90]) linear_extrude(t) children(); }
module sXY(z0,t=T) { translate([0,0,z0]) linear_extrude(t) children(); }
function th() = atan2(zr-zc, 2*C);
color("#8a6cff") translate([0,0,zr]) sXY(RB_Z,TB) p_rowbar();
color("#4ecdc4") translate([0,0,zc]) sXY(CB_Z,TB) p_colbar();
rotate(DIAG) {
  color("#8a6cff") translate([0,0,zr]) translate([C,0,0]) sXZ(YOFF) p_rowlug();
  color("#4ecdc4") translate([0,0,zc]) translate([-C,0,0]) sXZ(-YOFF) p_collug();
  color("#ffb454") translate([-C+C*cos(th()),0,ROD_Z+zc+C*sin(th())]) rotate([0,-th(),0]) sXZ(0) p_link();
  color("#ff2e88") { translate([C,YOFF-5.7,ROD_Z+zr]) rotate([-90,0,0]) cylinder(h=PIV_LEN,d=ROD_D);
                     translate([-C,-5.3,ROD_Z+zc]) rotate([-90,0,0]) cylinder(h=PIV_LEN,d=ROD_D); }
  color("#e8eef5") translate([0,PIN_PLAY,CROWN_TOP]) sYZ(0) p_rod();
  color("#ffd166") translate([0,PIN_PLAY,FACE2_Z]) linear_extrude(T) p_cap(shp);
}
color("#5d6a78") sXY(FACE_Z) difference(){ rect(-26,-26,26,26); rotate(DIAG) rect(-SLOT_X/2,-FACE_E,SLOT_X/2,FACE_E); }
color("#8ea3b8") sXY(FACE2_Z) difference(){ rect(-26,-26,26,26); cap_outline(shp, CAP_D+CAP_FIT); }
