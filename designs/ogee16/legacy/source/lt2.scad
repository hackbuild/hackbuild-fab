include <params.scad>
use <printed.scad>
module rect(x0,y0,x1,y1) { translate([x0,y0]) square([x1-x0, y1-y0]); }
color("#ff5c4d") import("../out/print/latchtower_asm.stl");
color("#58a6ff") import("../out/print/crank_latch_asm.stl");
color("#5d6a78") translate([0,0,LP_Z]) linear_extrude(T)
  difference(){ rect(-20,-32,34,10);
                translate([LSV_X,LSV_Y]) rect(LDRIVE_U0, LDRIVE_V-(T+FIT_SLIP)/2,
                                              LDRIVE_U1, LDRIVE_V+(T+FIT_SLIP)/2); }
color("#2f3540") translate([LSV_X, LSV_Y-SV_SHAFT_OFF, LSV_BRK_Z-SV_T_BRK0+SV_H/2])
  cube([SV_W, SV_L, SV_H], center=true);
