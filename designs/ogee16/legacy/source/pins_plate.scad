include <params.scad>
use <printed.scad>
// 32 pivot pins, heads down, 10mm off the bed edges, 6mm apart
GAP = 6; MG = 10; D = 6.0;
for(i=[0:7]) for(j=[0:3])
  translate([MG + D/2 + i*(D+GAP), MG + D/2 + j*(D+GAP), 0]) a_pivot();
