include <params.scad>
use <printed.scad>
color("#ff5c4d") import("../out/print/crank_row_asm.stl");
color("#8a6cff") translate([DRIVE_X-T/2,-40,-20]) cube([T,80,60]);
