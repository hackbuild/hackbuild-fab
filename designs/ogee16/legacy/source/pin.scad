include <params.scad>
use <printed.scad>
module sXZ(yc,t=T) { translate([0,yc+t/2,0]) rotate([90,0,0]) linear_extrude(t) children(); }
color("#ffb420") sXZ(0) p_link();
color("#FE0386") translate([C,0,0]) sXZ(YOFF) p_rowlug();
color("#5d6a78") translate([C,-2.4,ROD_Z]) rotate([-90,0,0]) a_pivot();
