include <params.scad>
module rect(x0,y0,x1,y1) { translate([x0,y0]) square([x1-x0, y1-y0]); }
color("#49535e") translate([0,0,DECK_Z]) linear_extrude(T) rect(80,95,150,150);
color("#ff5c4d") import("../out/print/latchtower_asm.stl");
color("#58a6ff") import("../out/print/crank_latch_asm.stl");
color("#2f3540") translate([LSV_X-SV_SHAFT_OFF, LSV_Y, LSV_BRK_Z-SV_T_BRK0+SV_H/2])
  cube([SV_L, SV_W, SV_H], center=true);
color("#2f3540") translate([LSV_X-SV_SHAFT_OFF, LSV_Y, LSV_BRK_Z+2.75])
  cube([SV_TAB_SPAN, SV_W, SV_FLANGE_T], center=true);
color("#ff5c4d") translate([RSV_BRK-T/2,-16,BASE_Z+T]) cube([T,148,DECK_Z+T-BASE_Z-T]);
color("#ff5c4d") translate([-26,CSV_BRK-T/2,BASE_Z+T]) cube([150,T,CSV_Z+18-BASE_Z-T]);
color("#2f3540") translate([RSV_CRK+SV_T_CRK0-SV_H/2, 105.4, RSV_Z])
  cube([SV_H, SV_L, SV_W], center=true);
color("#2f3540") translate([102+COL_BAR_X, CSV_CRK+SV_T_CRK0-SV_H/2, CSV_Z])
  cube([SV_L, SV_H, SV_W], center=true);
