include <params.scad>
use <printed.scad>
LTAB_W=8; LTAB_X=-49;
module sXY(z0,t=T) { translate([0,0,z0]) linear_extrude(t) children(); }
color("#6b6459") sXY(LP_Z) translate([LTAB_X,LSV_Y-LTAB_W/2]) square([28,LTAB_W]);
color("#4a463c") translate([XI0-T,-42,60]) cube([T,44,34]);
color("#58a6ff") import("../out/print/latchpull_asm.stl");
