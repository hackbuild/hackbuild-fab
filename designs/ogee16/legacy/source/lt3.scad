include <params.scad>
module rect(x0,y0,x1,y1) { translate([x0,y0]) square([x1-x0, y1-y0]); }
module sXZ(yc,t=T) { translate([0,yc+t/2,0]) rotate([90,0,0]) linear_extrude(t) children(); }
color("#49535e") translate([0,0,DECK_Z]) linear_extrude(T) rect(-30,-34,36,6);
color("#ff5c4d") import("../out/print/latchtower_asm.stl");
color("#58a6ff") import("../out/print/crank_latch_asm.stl");
color("#2f3540") translate([LSV_X-SV_SHAFT_OFF, LSV_Y, LSV_BRK_Z-SV_T_BRK0+SV_H/2])
  cube([SV_L, SV_W, SV_H], center=true);
color("#2f3540") translate([LSV_X-SV_SHAFT_OFF, LSV_Y, LSV_BRK_Z+2.75])
  cube([SV_TAB_SPAN, SV_W, SV_FLANGE_T], center=true);
color("#4a463c") sXZ(YI0-T/2) rect(-30, 0, 40, WALL_TOP);
